import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.background import BackgroundTask

from design import router as design_router, design_health
from doctor import router as doctor_router

ROOT = Path(__file__).parent
app = FastAPI(title="Rookie Quest Slicer", version="0.4.0")
app.include_router(design_router)
app.include_router(doctor_router)
app.mount("/assets", StaticFiles(directory=ROOT / "static"), name="assets")

BED_X = 225
BED_Y = 225
MAX_Z = 280
NOZZLE = 0.4
FILAMENT = 1.75
MAX_UPLOAD = 75 * 1024 * 1024
SLICE_TIMEOUT = 240

PRESETS = {
    "normal": {"label":"Normal","description":"Everyday prints","layer":0.20,"walls":3,"infill":20,"perimeter_speed":45,"infill_speed":60,"travel_speed":180},
    "mini": {"label":"Detailed Miniature","description":"Small figures and fine detail","layer":0.12,"walls":3,"infill":15,"perimeter_speed":30,"infill_speed":40,"travel_speed":160},
    "terrain": {"label":"Terrain","description":"D&D tiles, walls and scenery","layer":0.24,"walls":3,"infill":12,"perimeter_speed":50,"infill_speed":65,"travel_speed":180},
    "strong": {"label":"Strong","description":"Practical parts and tougher pieces","layer":0.20,"walls":5,"infill":35,"perimeter_speed":40,"infill_speed":55,"travel_speed":170},
    "draft": {"label":"Fast Draft","description":"Quick fit and size tests","layer":0.28,"walls":2,"infill":12,"perimeter_speed":60,"infill_speed":80,"travel_speed":200},
}

SUPPORT_MODES = {
    "off": {
        "label":"Off",
        "description":"No supports.",
        "buildplate_only":False,
        "style":None,
    },
    "gentle_bed": {
        "label":"Gentle · Build Plate Only",
        "description":"Least aggressive contact. Supports begin on the bed and reach upward; useful for figures and delicate detail.",
        "buildplate_only":True,
        "style":"snug",
        "threshold":52,
        "contact":0.28,
        "xy":0.55,
        "interface_layers":2,
        "spacing":3.2,
    },
    "snug_bed": {
        "label":"Snug · Build Plate Only",
        "description":"Closer-fitting supports, but still only allowed to grow from the build plate.",
        "buildplate_only":True,
        "style":"snug",
        "threshold":45,
        "contact":0.23,
        "xy":0.45,
        "interface_layers":3,
        "spacing":2.5,
    },
    "snug_everywhere": {
        "label":"Snug · Everywhere",
        "description":"Can start on the model where necessary. Better coverage, but greater risk of marks on delicate surfaces.",
        "buildplate_only":False,
        "style":"snug",
        "threshold":45,
        "contact":0.23,
        "xy":0.45,
        "interface_layers":3,
        "spacing":2.5,
    },
    "grid_bed": {
        "label":"Strong Grid · Build Plate Only",
        "description":"More rigid support columns from the bed only. Good for large heavy overhangs.",
        "buildplate_only":True,
        "style":"grid",
        "threshold":45,
        "contact":0.25,
        "xy":0.5,
        "interface_layers":3,
        "spacing":2.2,
    },
    "grid_everywhere": {
        "label":"Strong Grid · Everywhere",
        "description":"Maximum conventional support coverage. Use when reliability matters more than easy removal.",
        "buildplate_only":False,
        "style":"grid",
        "threshold":40,
        "contact":0.22,
        "xy":0.4,
        "interface_layers":3,
        "spacing":2.0,
    },
}

START_GCODE = """; Rookie Quest Slicer - Neptune 3 Pro
G90 ; absolute positioning
M83 ; relative extrusion
G28 ; home all axes
G92 E0
G1 Z5 F3000
"""

END_GCODE = """; Rookie Quest Slicer - safe finish
M104 S0 ; hotend off
M140 S0 ; bed off
M106 S0 ; fan off
G91 ; relative positioning
G1 E-2 F1800
G1 Z10 F1200
G90 ; absolute positioning
G1 X10 Y210 F4000
M84 ; motors off
"""

def engine_path():
    return shutil.which("prusa-slicer") or shutil.which("slic3r")

def engine_version():
    engine = engine_path()
    if not engine:
        return None
    try:
        result = subprocess.run([engine, "--version"], capture_output=True, text=True, timeout=10, check=False)
        text = (result.stdout or result.stderr or "").strip()
        match = re.search(r"(\d+\.\d+(?:\.\d+)?)", text)
        return match.group(1) if match else text[:80]
    except Exception:
        return None

def parse_gcode_stats(text: str):
    def find(pattern):
        m = re.search(pattern, text, re.IGNORECASE)
        return m.group(1).strip() if m else None
    return {
        "time": find(r";\s*estimated printing time[^=]*=\s*([^\r\n]+)"),
        "filament_mm": find(r";\s*filament used \[mm\]\s*=\s*([0-9.]+)"),
        "filament_g": find(r";\s*filament used \[g\]\s*=\s*([0-9.]+)"),
    }

def check_pin(pin: str):
    required = os.getenv("APP_PIN", "").strip()
    if required and pin.strip() != required:
        raise HTTPException(401, "Incorrect Rookie Quest Slicer PIN")

async def save_upload(upload: UploadFile, target: Path):
    size = 0
    with target.open("wb") as f:
        while True:
            data = await upload.read(1024 * 1024)
            if not data:
                break
            size += len(data)
            if size > MAX_UPLOAD:
                raise HTTPException(413, "Maximum upload size is 75 MB")
            f.write(data)
    if size < 100:
        raise HTTPException(400, "That model file appears to be empty")

def support_args(mode_name: str):
    if mode_name not in SUPPORT_MODES:
        raise HTTPException(400, "Unknown support mode")
    mode = SUPPORT_MODES[mode_name]
    if mode_name == "off":
        return []
    args = [
        "--support-material",
        "--support-material-auto",
        "--support-material-style", mode["style"],
        "--support-material-threshold", str(mode["threshold"]),
        "--support-material-contact-distance", str(mode["contact"]),
        "--support-material-xy-spacing", str(mode["xy"]),
        "--support-material-interface-layers", str(mode["interface_layers"]),
        "--support-material-spacing", str(mode["spacing"]),
        "--support-material-pattern", "rectilinear",
    ]
    if mode["buildplate_only"]:
        args.append("--support-material-buildplate-only")
    return args

@app.get("/", response_class=HTMLResponse)
def home():
    return (ROOT / "templates" / "index.html").read_text(encoding="utf-8")

@app.get("/manifest.webmanifest")
def manifest():
    return FileResponse(ROOT / "static" / "manifest.webmanifest", media_type="application/manifest+json")

@app.get("/sw.js")
def service_worker():
    return FileResponse(ROOT / "static" / "sw.js", media_type="application/javascript")

@app.get("/icon.svg")
def icon():
    return FileResponse(ROOT / "static" / "icon.svg", media_type="image/svg+xml")

@app.get("/health")
def health():
    engine = engine_path()
    cad = design_health()
    return {
        "status": "ok" if engine and cad["installed"] else "degraded",
        "engine_installed": bool(engine),
        "engine": Path(engine).name if engine else None,
        "engine_version": engine_version(),
        "design_engine_installed": cad["installed"],
        "design_engine": cad["name"],
        "printer": "Elegoo Neptune 3 Pro",
        "build_volume_mm": [BED_X, BED_Y, MAX_Z],
        "version": app.version,
    }

@app.get("/api/support-capabilities")
def support_capabilities():
    engine = engine_path()
    if not engine:
        return {"engine":None,"version":None,"supported":{}}
    try:
        result = subprocess.run([engine, "--help"], capture_output=True, text=True, timeout=15, check=False)
        help_text = (result.stdout or "") + "\n" + (result.stderr or "")
    except Exception:
        help_text = ""
    names = [
        "support-material",
        "support-material-auto",
        "support-material-style",
        "support-material-buildplate-only",
        "support-material-threshold",
        "support-material-contact-distance",
        "support-material-xy-spacing",
        "support-material-interface-layers",
        "support-material-spacing",
    ]
    return {
        "engine":Path(engine).name,
        "version":engine_version(),
        "supported":{name:(("--"+name) in help_text) for name in names},
        "modes":list(SUPPORT_MODES.keys()),
    }

def support_parser_selftest():
    engine = engine_path()
    if not engine:
        return {"snug_bed":False,"grid_bed":False,"details":"engine missing"}
    tests = {
        "snug_bed":[
            "--support-material","--support-material-auto",
            "--support-material-style","snug",
            "--support-material-buildplate-only","--help"
        ],
        "grid_bed":[
            "--support-material","--support-material-auto",
            "--support-material-style","grid",
            "--support-material-buildplate-only","--help"
        ],
    }
    out = {}
    for name,args in tests.items():
        try:
            r = subprocess.run([engine,*args], capture_output=True, text=True, timeout=15, check=False)
            out[name] = (r.returncode == 0)
            if r.returncode != 0:
                out[name+"_error"] = (r.stderr or r.stdout or "")[-300:]
        except Exception as exc:
            out[name] = False
            out[name+"_error"] = type(exc).__name__
    return out

@app.on_event("startup")
def log_startup_capabilities():
    print("RQS_SUPPORT_SELFTEST", support_parser_selftest(), flush=True)

@app.get("/api/profiles")
def profiles():
    return {
        "printer": {"name":"Elegoo Neptune 3 Pro","build_volume_mm":[BED_X,BED_Y,MAX_Z],"nozzle_mm":NOZZLE,"filament_mm":FILAMENT},
        "presets": PRESETS,
        "supports": {k:{"label":v["label"],"description":v["description"],"buildplate_only":v["buildplate_only"],"style":v["style"]} for k,v in SUPPORT_MODES.items()},
        "defaults": {"nozzle_temp":215,"bed_temp":60,"retraction_mm":0.8,"support_mode":"gentle_bed"},
        "design_tools": ["dice_tower","model_doctor"],
        "organic_supports":{"available":False,"note":"True organic/tree mode needs the newer slicing engine; conventional bed-only and snug modes are available now."},
    }

@app.post("/slice")
async def slice_model(
    model: UploadFile = File(...),
    preset: str = Form("normal"),
    nozzle_temp: int = Form(215),
    bed_temp: int = Form(60),
    supports: str = Form("gentle_bed"),
    access_pin: str = Form(""),
):
    check_pin(access_pin)
    if preset not in PRESETS:
        raise HTTPException(400, "Unknown print preset")
    if supports not in SUPPORT_MODES:
        raise HTTPException(400, "Unknown support mode")
    if not 190 <= nozzle_temp <= 235:
        raise HTTPException(400, "For this PLA+ profile, nozzle temperature must be 190–235°C")
    if not 45 <= bed_temp <= 70:
        raise HTTPException(400, "For this PLA+ profile, bed temperature must be 45–70°C")

    name = Path(model.filename or "").name
    suffix = Path(name).suffix.lower()
    if suffix not in {".stl", ".3mf"}:
        raise HTTPException(400, "Upload an STL or 3MF model")
    engine = engine_path()
    if not engine:
        raise HTTPException(503, "Slicing engine is not installed on this server")

    work = Path(tempfile.mkdtemp(prefix="rqs_slice_"))
    source = work / f"model{suffix}"
    output = work / "print.gcode"
    try:
        await save_upload(model, source)
        p = PRESETS[preset]
        cmd = [
            engine, "--export-gcode", "--output", str(output),
            "--gcode-flavor", "marlin2",
            "--bed-shape", f"0x0,{BED_X}x0,{BED_X}x{BED_Y},0x{BED_Y}",
            "--max-print-height", str(MAX_Z), "--print-center", f"{BED_X / 2},{BED_Y / 2}",
            "--nozzle-diameter", str(NOZZLE), "--filament-diameter", str(FILAMENT),
            "--layer-height", str(p["layer"]), "--first-layer-height", "0.20",
            "--perimeters", str(p["walls"]), "--fill-density", f'{p["infill"]}%',
            "--perimeter-speed", str(p["perimeter_speed"]), "--infill-speed", str(p["infill_speed"]),
            "--travel-speed", str(p["travel_speed"]), "--first-layer-speed", "20",
            "--temperature", str(nozzle_temp), "--first-layer-temperature", str(nozzle_temp),
            "--bed-temperature", str(bed_temp), "--first-layer-bed-temperature", str(bed_temp),
            "--retract-length", "0.8", "--retract-speed", "35",
            "--start-gcode", START_GCODE, "--end-gcode", END_GCODE,
        ]
        cmd.extend(support_args(supports))
        cmd.append(str(source))
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=SLICE_TIMEOUT, check=False, env={**os.environ, "LC_ALL":"C.UTF-8"})
        if result.returncode != 0 or not output.exists() or output.stat().st_size == 0:
            detail = (result.stderr or result.stdout or "Unknown slicing error").strip()[-1600:]
            raise HTTPException(422, f"Slicing failed: {detail}")
        body = output.read_text(encoding="utf-8", errors="replace")
        header = (
            "; ROOKIE QUEST SLICER v0.4.0\n; Printer: Elegoo Neptune 3 Pro\n"
            f"; Preset: {preset}\n; Supports: {supports}\n; Source: {name}\n"
            "; TEST PROFILE - review toolpath before first print\n"
        )
        output.write_text(header + body, encoding="utf-8")
        stats = parse_gcode_stats(body)
        headers = {
            "X-RQ-Print-Time": stats["time"] or "unknown",
            "X-RQ-Filament-MM": stats["filament_mm"] or "unknown",
            "X-RQ-Filament-G": stats["filament_g"] or "unknown",
            "X-RQ-Support-Mode": supports,
        }
        filename = f"{Path(name).stem}_{preset}_{supports}_N3Pro.gcode"
        return FileResponse(output, filename=filename, media_type="application/octet-stream", headers=headers, background=BackgroundTask(lambda: shutil.rmtree(work, ignore_errors=True)))
    except subprocess.TimeoutExpired:
        shutil.rmtree(work, ignore_errors=True)
        raise HTTPException(504, "Slicing timed out")
    except HTTPException:
        shutil.rmtree(work, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(work, ignore_errors=True)
        raise HTTPException(500, f"Unexpected slicing error: {type(exc).__name__}") from exc

@app.exception_handler(413)
async def too_large(_, exc):
    return JSONResponse(status_code=413, content={"detail":getattr(exc,"detail","File too large")})
