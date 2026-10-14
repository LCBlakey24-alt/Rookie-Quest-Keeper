import json
import os
import re
import shutil
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, Response

from geometry_ai import load_mesh, basic_report, recommend_dice_tower, svg_preview

router = APIRouter(prefix="/ai", tags=["ai-bridge"])
ASSET_DIR = Path("/tmp/rqs_ai_assets")
ASSET_DIR.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD = 75 * 1024 * 1024
TTL_SECONDS = 4 * 60 * 60


def check_pin(pin: str):
    required = os.getenv("APP_PIN", "").strip()
    if required and pin.strip() != required:
        raise HTTPException(401, "Incorrect Rookie Quest Slicer PIN")


def clean_old_assets():
    cutoff = time.time() - TTL_SECONDS
    for p in ASSET_DIR.glob("*"):
        try:
            if p.stat().st_mtime < cutoff:
                if p.is_dir():
                    shutil.rmtree(p, ignore_errors=True)
                else:
                    p.unlink(missing_ok=True)
        except Exception:
            pass


def asset_path(asset_id: str):
    if not re.fullmatch(r"[a-f0-9]{24}", asset_id or ""):
        raise HTTPException(404, "Unknown AI asset")
    p = ASSET_DIR / asset_id
    if not p.is_dir():
        raise HTTPException(404, "AI asset expired or not found")
    meta_path = p / "meta.json"
    if not meta_path.exists():
        raise HTTPException(404, "AI asset metadata missing")
    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    except Exception:
        raise HTTPException(404, "AI asset metadata is unreadable")
    source = p / meta["stored_name"]
    if not source.exists():
        raise HTTPException(404, "AI asset file missing")
    return p, meta, source


@router.post("/assets")
async def upload_ai_asset(
    model: UploadFile = File(...),
    access_pin: str = Form(""),
):
    check_pin(access_pin)
    clean_old_assets()
    name = Path(model.filename or "").name
    suffix = Path(name).suffix.lower()
    if suffix not in {".stl", ".3mf", ".obj", ".ply", ".gcode", ".zip"}:
        raise HTTPException(400, "AI Bridge accepts STL, 3MF, OBJ, PLY, G-code or ZIP")

    asset_id = uuid.uuid4().hex[:24]
    folder = ASSET_DIR / asset_id
    folder.mkdir(parents=True, exist_ok=False)
    stored_name = f"model{suffix}"
    target = folder / stored_name
    total = 0
    try:
        with target.open("wb") as f:
            while True:
                chunk = await model.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_UPLOAD:
                    raise HTTPException(413, "Maximum upload size is 75 MB")
                f.write(chunk)
        if total < 100:
            raise HTTPException(400, "That model file appears to be empty")

        meta = {
            "asset_id": asset_id,
            "filename": name,
            "stored_name": stored_name,
            "size_bytes": total,
            "created_at": int(time.time()),
            "expires_at": int(time.time()) + TTL_SECONDS,
        }
        (folder / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

        report = None
        if suffix in {".stl", ".obj", ".ply"}:
            try:
                report = basic_report(load_mesh(target))
            except Exception:
                report = None

        base = os.getenv("PUBLIC_BASE_URL", "https://rookie-quest-slicer.onrender.com").rstrip("/")
        return {
            **meta,
            "expires_in_hours": 4,
            "report": report,
            "preview_url": f"{base}/ai/assets/{asset_id}/preview.svg" if report else None,
            "download_url": f"{base}/ai/assets/{asset_id}/download",
            "ai_instruction": f"Use Rookie Quest Slicer asset {asset_id}. Inspect it before changing or slicing it.",
        }
    except HTTPException:
        shutil.rmtree(folder, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(folder, ignore_errors=True)
        raise HTTPException(500, f"AI upload failed: {type(exc).__name__}") from exc


@router.get("/assets/{asset_id}")
def get_ai_asset(asset_id: str, access_pin: str = ""):
    check_pin(access_pin)
    _, meta, source = asset_path(asset_id)
    report = None
    if source.suffix.lower() in {".stl", ".obj", ".ply"}:
        try:
            report = basic_report(load_mesh(source))
        except Exception:
            pass
    return {**meta, "report": report}


@router.get("/assets/{asset_id}/download")
def download_ai_asset(asset_id: str):
    _, meta, source = asset_path(asset_id)
    return FileResponse(source, filename=meta["filename"], media_type="application/octet-stream")


@router.get("/assets/{asset_id}/preview.svg")
def preview_ai_asset(asset_id: str):
    folder, _, source = asset_path(asset_id)
    if source.suffix.lower() not in {".stl", ".obj", ".ply"}:
        raise HTTPException(400, "Preview generation currently requires STL, OBJ or PLY")
    cache = folder / "preview.svg"
    if not cache.exists():
        try:
            cache.write_text(svg_preview(load_mesh(source)), encoding="utf-8")
        except Exception as exc:
            raise HTTPException(422, f"Could not build preview: {type(exc).__name__}") from exc
    return Response(cache.read_text(encoding="utf-8"), media_type="image/svg+xml")


@router.post("/assets/{asset_id}/dice-suggest")
def suggest_ai_dice_tower(
    asset_id: str,
    dice_mm: float = Form(22.0),
    tray_depth: float = Form(70.0),
    front_rotation: str = Form("auto"),
    access_pin: str = Form(""),
):
    check_pin(access_pin)
    _, meta, source = asset_path(asset_id)
    if source.suffix.lower() != ".stl":
        raise HTTPException(400, "Dice Tower recommendations currently require STL")
    if not 16 <= dice_mm <= 30:
        raise HTTPException(400, "Dice size must be between 16 mm and 30 mm")
    if not 50 <= tray_depth <= 100:
        raise HTTPException(400, "Tray depth must be between 50 mm and 100 mm")

    rotation = None
    if front_rotation != "auto":
        try:
            rotation = int(front_rotation)
        except Exception:
            raise HTTPException(400, "Front rotation must be auto, 0, 90, 180 or 270")
        if rotation not in {0, 90, 180, 270}:
            raise HTTPException(400, "Front rotation must be auto, 0, 90, 180 or 270")

    try:
        suggestion = recommend_dice_tower(
            load_mesh(source),
            dice_mm=dice_mm,
            tray_depth=tray_depth,
            front_rotation=rotation,
        )
    except Exception as exc:
        raise HTTPException(422, f"Could not analyse this model: {type(exc).__name__}") from exc
    return {"asset_id": asset_id, "filename": meta["filename"], **suggestion}
