import os
import secrets
from urllib.parse import parse_qs

import httpx
from mcp.server import MCPServer
from mcp.server.mcpserver import Image
from mcp.server.transport_security import TransportSecuritySettings
from starlette.requests import Request
from starlette.responses import JSONResponse
from connector_auth import validate_token

CORE_URL = os.getenv("CORE_URL", "https://rookie-quest-slicer.onrender.com").rstrip("/")
CORE_PIN = os.getenv("CORE_PIN", "")
MCP_TOKEN = os.getenv("MCP_TOKEN", "")
MCP_SIGNING_SECRET = os.getenv("MCP_SIGNING_SECRET", "")
PUBLIC_MCP_URL = os.getenv("PUBLIC_MCP_URL", "https://rookie-quest-slicer-ai.onrender.com/mcp")

mcp = MCPServer(
    "Rookie Quest Slicer",
    instructions=(
        "Tools for inspecting, repairing, modifying and slicing 3D-print models for the "
        "Elegoo Neptune 3 Pro. Always inspect a model before slicing it. Never claim a "
        "physical print has been tested unless the user confirms it. Generated G-code "
        "should be previewed before the first physical print of a new profile."
    ),
)


def _require_core_pin():
    if not CORE_PIN:
        raise RuntimeError("CORE_PIN is not configured on the AI bridge")


async def _get_asset(asset_id: str) -> dict:
    _require_core_pin()
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.get(
            f"{CORE_URL}/ai/assets/{asset_id}",
            params={"access_pin": CORE_PIN},
        )
        r.raise_for_status()
        return r.json()


async def _download_asset(asset_id: str) -> tuple[bytes, str]:
    info = await _get_asset(asset_id)
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.get(f"{CORE_URL}/ai/assets/{asset_id}/download")
        r.raise_for_status()
        return r.content, info["filename"]


async def _register_output(data: bytes, filename: str) -> dict:
    _require_core_pin()
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            f"{CORE_URL}/ai/assets",
            data={"access_pin": CORE_PIN},
            files={"model": (filename, data, "application/octet-stream")},
        )
        r.raise_for_status()
        return r.json()


def _http_error(exc: Exception) -> str:
    if isinstance(exc, httpx.HTTPStatusError):
        try:
            body = exc.response.json()
            detail = body.get("detail") or body
        except Exception:
            detail = exc.response.text[-800:]
        return f"Rookie Quest Slicer returned HTTP {exc.response.status_code}: {detail}"
    return f"{type(exc).__name__}: {exc}"


@mcp.tool()
async def get_upload_instructions() -> dict:
    """Explain how a user gets a temporary Rookie Quest model asset ID for AI tools."""
    return {
        "upload_page": f"{CORE_URL}/?tab=ai",
        "steps": [
            "Open the Rookie Quest Slicer upload page.",
            "Upload the STL/3MF/OBJ/PLY model in AI Link.",
            "Copy the temporary asset ID.",
            "Give that asset ID to this AI and ask it to inspect, modify or slice the model.",
        ],
        "asset_lifetime_hours": 4,
        "why": "Large 3D files are transferred once through the slicer instead of being embedded in MCP tool JSON.",
    }


@mcp.tool()
async def inspect_model(asset_id: str) -> dict:
    """Inspect a temporary model asset: dimensions, mesh health, parts and printer fit."""
    try:
        info = await _get_asset(asset_id)
        return {
            "asset_id": asset_id,
            "filename": info["filename"],
            "report": info.get("report"),
            "preview_url": f"{CORE_URL}/ai/assets/{asset_id}/preview.svg",
            "expires_at": info.get("expires_at"),
        }
    except Exception as exc:
        return {"error": _http_error(exc), "asset_id": asset_id}


@mcp.tool()
async def get_model_views(asset_id: str) -> Image:
    """Return front, side and top orthographic views as image content for the AI to inspect visually."""
    try:
        await _get_asset(asset_id)
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.get(f"{CORE_URL}/ai/assets/{asset_id}/preview.png")
            r.raise_for_status()
        return Image(data=r.content, format="png")
    except Exception as exc:
        # Image-returning tools cannot return our normal structured error without
        # changing their protocol shape, so raise a readable tool error.
        raise RuntimeError(_http_error(exc)) from exc


@mcp.tool()
async def recommend_print_settings(
    asset_id: str,
    goal: str = "balanced",
    material: str = "PLA+",
) -> dict:
    """Recommend a conservative Neptune 3 Pro profile after inspecting model geometry."""
    try:
        info = await _get_asset(asset_id)
        report = info.get("report") or {}
        dims = report.get("dimensions_mm") or [0, 0, 0]
        largest = max(dims) if dims else 0
        goal_key = goal.strip().lower()

        if goal_key in {"detail", "mini", "miniature", "quality"}:
            preset, nozzle = "mini", 0.2
        elif goal_key in {"fast", "draft", "prototype"}:
            preset, nozzle = ("terrain", 0.6) if largest >= 70 else ("draft", 0.4)
        elif goal_key in {"strong", "functional", "durable"}:
            preset, nozzle = "strong", 0.6 if largest >= 50 else 0.4
        elif largest >= 120:
            preset, nozzle = "terrain", 0.6
        else:
            preset, nozzle = "normal", 0.4

        support = "gentle_bed"
        reasons = [
            f"model envelope is approximately {dims[0]:.1f} × {dims[1]:.1f} × {dims[2]:.1f} mm" if len(dims) == 3 else "model dimensions were inspected",
            f"goal interpreted as {goal_key or 'balanced'}",
            "bed-only support is the safer default until overhang/toolpath preview is available to the AI",
        ]
        if not report.get("watertight", True):
            reasons.append("mesh is not watertight, so repair before slicing is recommended")
        if not report.get("fits_neptune_3_pro", True):
            reasons.append("model does not currently fit the Neptune 3 Pro and should be rotated, scaled or split first")

        return {
            "asset_id": asset_id,
            "material": material,
            "recommended": {
                "preset": preset,
                "nozzle_mm": nozzle,
                "support_mode": support,
                "nozzle_temp_c": 215,
                "bed_temp_c": 60,
            },
            "reasons": reasons,
            "important": "The selected nozzle must physically match the nozzle fitted to the printer.",
        }
    except Exception as exc:
        return {"error": _http_error(exc), "asset_id": asset_id}


@mcp.tool()
async def recommend_dice_tower(
    asset_id: str,
    scale_percent: int = 100,
    dice_mm: float = 22.0,
    tray_depth_mm: float = 70.0,
    tray_front: str = "auto",
    tray_x_mm: float | None = None,
) -> dict:
    """Calculate a suggested tray-facing side and chute position from STL geometry."""
    try:
        _require_core_pin()
        async with httpx.AsyncClient(timeout=180) as client:
            r = await client.post(
                f"{CORE_URL}/ai/assets/{asset_id}/dice-suggest",
                data={
                    "scale_percent": scale_percent,
                    "dice_mm": dice_mm,
                    "tray_depth": tray_depth_mm,
                    "front_rotation": tray_front,
                    "tray_x_mm": "auto" if tray_x_mm is None else tray_x_mm,
                    "access_pin": CORE_PIN,
                },
            )
            r.raise_for_status()
            return r.json()
    except Exception as exc:
        return {"error": _http_error(exc), "asset_id": asset_id}


@mcp.tool()
async def build_dice_tower(
    asset_id: str,
    dice_mm: float = 22.0,
    tray_depth_mm: float = 70.0,
    tray_front: str = "auto",
    scale_percent: int = 100,
    smart_place_chute: bool = True,
    tray_x_mm: float | None = None,
) -> dict:
    """Build a dice-tower STL from an uploaded STL and return a new temporary asset/download link."""
    try:
        source, filename = await _download_asset(asset_id)
        if not filename.lower().endswith(".stl"):
            return {"error": "Dice Tower Builder currently requires an STL asset."}

        rotation = 0
        chute_x = 0.0
        chute_y = 0.0
        tray_x = 0.0 if tray_x_mm is None else float(tray_x_mm)
        suggestion = None
        if smart_place_chute:
            suggestion = await recommend_dice_tower(asset_id, scale_percent, dice_mm, tray_depth_mm, tray_front, tray_x_mm)
            if "error" in suggestion:
                return suggestion
            rec = suggestion["recommendation"]
            rotation = int(rec["rotation_z"])
            chute_x = float(rec["chute_x_mm"])
            chute_y = float(rec["chute_y_mm"])
            tray_x = float(rec["tray_x_mm"])
        elif tray_front != "auto":
            rotation = int(tray_front)

        _require_core_pin()
        async with httpx.AsyncClient(timeout=360) as client:
            r = await client.post(
                f"{CORE_URL}/design/dice-tower",
                data={
                    "scale_percent": scale_percent,
                    "rotation_z": rotation,
                    "dice_mm": dice_mm,
                    "tray_depth": tray_depth_mm,
                    "tray_x_mm": tray_x,
                    "chute_x_mm": chute_x,
                    "chute_y_mm": chute_y,
                    "access_pin": CORE_PIN,
                },
                files={"model": (filename, source, "model/stl")},
            )
            r.raise_for_status()
            out_name = filename.rsplit(".", 1)[0] + "_Dice_Tower.stl"
            output = await _register_output(r.content, out_name)

        return {
            "source_asset_id": asset_id,
            "output_asset_id": output["asset_id"],
            "download_url": output["download_url"],
            "preview_url": output.get("preview_url"),
            "dimensions": r.headers.get("X-RQ-Dimensions"),
            "baffles": r.headers.get("X-RQ-Baffles"),
            "chute_x_mm": r.headers.get("X-RQ-Chute-X"),
            "chute_y_mm": r.headers.get("X-RQ-Chute-Y"),
            "tray_x_mm": r.headers.get("X-RQ-Tray-X"),
            "tray_width_mm": r.headers.get("X-RQ-Tray-Width"),
            "transition_angle_deg": r.headers.get("X-RQ-Transition-Angle"),
            "smart_suggestion": suggestion,
            "warning": "Rotate and inspect the generated STL before its first physical print.",
        }
    except Exception as exc:
        return {"error": _http_error(exc), "asset_id": asset_id}


@mcp.tool()
async def slice_model(
    asset_id: str,
    preset: str = "normal",
    nozzle_mm: float = 0.4,
    support_mode: str = "gentle_bed",
    nozzle_temp_c: int = 215,
    bed_temp_c: int = 60,
) -> dict:
    """Slice a temporary STL/3MF asset for the Elegoo Neptune 3 Pro and return downloadable G-code."""
    try:
        source, filename = await _download_asset(asset_id)
        _require_core_pin()
        async with httpx.AsyncClient(timeout=420) as client:
            r = await client.post(
                f"{CORE_URL}/slice",
                data={
                    "preset": preset,
                    "nozzle_diameter": nozzle_mm,
                    "supports": support_mode,
                    "nozzle_temp": nozzle_temp_c,
                    "bed_temp": bed_temp_c,
                    "access_pin": CORE_PIN,
                },
                files={"model": (filename, source, "application/octet-stream")},
            )
            r.raise_for_status()

        out_name = filename.rsplit(".", 1)[0] + f"_{nozzle_mm}mm_N3Pro.gcode"
        output = await _register_output(r.content, out_name)
        return {
            "source_asset_id": asset_id,
            "gcode_asset_id": output["asset_id"],
            "download_url": output["download_url"],
            "preset": preset,
            "nozzle_mm": r.headers.get("X-RQ-Nozzle-MM") or str(nozzle_mm),
            "layer_mm": r.headers.get("X-RQ-Layer-MM"),
            "support_mode": r.headers.get("X-RQ-Support-Mode") or support_mode,
            "estimated_print_time": r.headers.get("X-RQ-Print-Time"),
            "filament_g": r.headers.get("X-RQ-Filament-G"),
            "warning": "Preview this G-code before the first physical print of a new profile/model combination.",
        }
    except Exception as exc:
        return {"error": _http_error(exc), "asset_id": asset_id}


@mcp.tool()
async def repair_model(asset_id: str) -> dict:
    """Run conservative mesh repair and return a repaired STL as a new temporary asset."""
    try:
        source, filename = await _download_asset(asset_id)
        _require_core_pin()
        async with httpx.AsyncClient(timeout=300) as client:
            r = await client.post(
                f"{CORE_URL}/doctor/repair",
                data={"access_pin": CORE_PIN},
                files={"model": (filename, source, "application/octet-stream")},
            )
            r.raise_for_status()
        out_name = filename.rsplit(".", 1)[0] + "_Repaired.stl"
        output = await _register_output(r.content, out_name)
        return {
            "source_asset_id": asset_id,
            "output_asset_id": output["asset_id"],
            "download_url": output["download_url"],
            "preview_url": output.get("preview_url"),
            "watertight": r.headers.get("X-RQ-Watertight"),
            "parts": r.headers.get("X-RQ-Parts"),
        }
    except Exception as exc:
        return {"error": _http_error(exc), "asset_id": asset_id}


@mcp.tool()
async def split_model(
    asset_id: str,
    axis: str = "x",
    split_percent: float = 50.0,
) -> dict:
    """Split an STL into two flat-cut parts and return a ZIP asset."""
    try:
        source, filename = await _download_asset(asset_id)
        if not filename.lower().endswith(".stl"):
            return {"error": "Model Splitter currently requires an STL asset."}
        _require_core_pin()
        async with httpx.AsyncClient(timeout=360) as client:
            r = await client.post(
                f"{CORE_URL}/edit/split",
                data={
                    "axis": axis,
                    "split_percent": split_percent,
                    "access_pin": CORE_PIN,
                },
                files={"model": (filename, source, "model/stl")},
            )
            r.raise_for_status()
        out_name = filename.rsplit(".", 1)[0] + "_Split_Parts.zip"
        output = await _register_output(r.content, out_name)
        return {
            "source_asset_id": asset_id,
            "zip_asset_id": output["asset_id"],
            "download_url": output["download_url"],
            "part_a_mm": r.headers.get("X-RQ-Part-A"),
            "part_b_mm": r.headers.get("X-RQ-Part-B"),
            "both_fit": r.headers.get("X-RQ-Both-Fit"),
            "note": "Splitter v1 uses a flat cut and does not automatically add alignment pegs.",
        }
    except Exception as exc:
        return {"error": _http_error(exc), "asset_id": asset_id}


@mcp.custom_route("/health", methods=["GET"])
async def health(request: Request):
    return JSONResponse({
        "status": "ok",
        "service": "Rookie Quest Slicer AI",
        "protocol": "MCP Streamable HTTP",
        "core_url": CORE_URL,
        "tools": [
            "get_upload_instructions",
            "inspect_model",
            "get_model_views",
            "recommend_print_settings",
            "recommend_dice_tower",
            "build_dice_tower",
            "slice_model",
            "repair_model",
            "split_model",
        ],
    })


security = TransportSecuritySettings(
    enable_dns_rebinding_protection=True,
    allowed_hosts=[
        os.getenv("MCP_ALLOWED_HOST", "rookie-quest-slicer-ai.onrender.com"),
        os.getenv("MCP_ALLOWED_HOST", "rookie-quest-slicer-ai.onrender.com") + ":*",
        "localhost:*",
        "127.0.0.1:*",
    ],
    allowed_origins=[
        "https://claude.ai",
        "https://chatgpt.com",
        "https://chat.openai.com",
    ],
)

_mcp_app = mcp.streamable_http_app(
    json_response=True,
    stateless_http=True,
    transport_security=security,
)


def _authorized_token(token: str) -> bool:
    if MCP_TOKEN and secrets.compare_digest(token, MCP_TOKEN):
        return True
    valid, _ = validate_token(MCP_SIGNING_SECRET, token)
    return valid


class TokenAuthApp:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and MCP_TOKEN and scope.get("path") != "/health":
            headers = {k.lower(): v for k, v in scope.get("headers", [])}
            auth = headers.get(b"authorization", b"").decode("utf-8", "ignore")
            query = parse_qs(scope.get("query_string", b"").decode("utf-8", "ignore"))
            supplied = ""
            if auth.lower().startswith("bearer "):
                supplied = auth[7:].strip()
            elif query.get("token"):
                supplied = query["token"][0]
            if not _authorized_token(supplied):
                body = b'{"error":"Unauthorized Rookie Quest Slicer AI connector"}'
                await send({
                    "type": "http.response.start",
                    "status": 401,
                    "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())],
                })
                await send({"type": "http.response.body", "body": body})
                return
        await self.inner(scope, receive, send)


app = TokenAuthApp(_mcp_app)
