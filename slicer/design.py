import math
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import trimesh
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

router = APIRouter(prefix="/design", tags=["design"])
MAX_UPLOAD = 75 * 1024 * 1024
BED_X = 225
BED_Y = 225
MAX_Z = 280
DESIGN_TIMEOUT = 300

def openscad_path():
    return shutil.which("openscad")

def design_health():
    cad = openscad_path()
    return {"installed": bool(cad), "name": Path(cad).name if cad else None}

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

@router.post("/dice-tower")
async def build_dice_tower(
    model: UploadFile = File(...),
    scale_percent: int = Form(100),
    rotation_z: int = Form(0),
    dice_mm: float = Form(22.0),
    tray_depth: float = Form(70.0),
    access_pin: str = Form(""),
):
    check_pin(access_pin)
    cad = openscad_path()
    if not cad:
        raise HTTPException(503, "Dice Tower design engine is not installed")
    name = Path(model.filename or "").name
    if Path(name).suffix.lower() != ".stl":
        raise HTTPException(400, "Dice Tower Builder v1 currently needs an STL file")
    if not 50 <= scale_percent <= 250:
        raise HTTPException(400, "Scale must be between 50% and 250%")
    if rotation_z not in {0, 90, 180, 270}:
        raise HTTPException(400, "Front rotation must be 0°, 90°, 180° or 270°")
    if not 16 <= dice_mm <= 30:
        raise HTTPException(400, "Dice size must be between 16 mm and 30 mm")
    if not 50 <= tray_depth <= 100:
        raise HTTPException(400, "Tray depth must be between 50 mm and 100 mm")

    work = Path(tempfile.mkdtemp(prefix="rqs_tower_"))
    source = work / "source.stl"
    normalized = work / "normalized.stl"
    script = work / "tower.scad"
    output = work / "dice_tower.stl"
    try:
        await save_upload(model, source)
        mesh = trimesh.load(source, force="mesh", process=True)
        if mesh.is_empty or len(mesh.vertices) < 4 or len(mesh.faces) < 4:
            raise HTTPException(422, "That STL could not be read as a usable 3D mesh")
        mesh.apply_scale(scale_percent / 100.0)
        if rotation_z:
            matrix = trimesh.transformations.rotation_matrix(math.radians(rotation_z), [0, 0, 1])
            mesh.apply_transform(matrix)
        bounds = mesh.bounds
        mesh.apply_translation([
            -float((bounds[0][0] + bounds[1][0]) / 2),
            -float((bounds[0][1] + bounds[1][1]) / 2),
            -float(bounds[0][2]),
        ])
        mesh.export(normalized)
        w, d, h = [float(v) for v in mesh.extents]

        channel_w = max(44.0, dice_mm * 2.3)
        channel_d = channel_w
        outer_w = channel_w + 6.0
        outer_d = channel_d + 6.0
        exit_h = max(30.0, dice_mm + 10.0)
        min_w = outer_w + 8.0
        min_d = outer_d + 8.0
        min_h = max(95.0, exit_h + 55.0)
        if w < min_w or d < min_d or h < min_h:
            factor = max(min_w / max(w, 0.1), min_d / max(d, 0.1), min_h / max(h, 0.1))
            suggested = min(250, int(math.ceil(scale_percent * factor / 5.0) * 5))
            raise HTTPException(422, f"This model is too small for a reliable dice chute at {scale_percent}%. Try about {suggested}% scale, or use a larger/wider model.")

        tray_w = w + 10.0
        output_depth = d + tray_depth + 3.0
        if tray_w > BED_X or output_depth > BED_Y or h > MAX_Z:
            raise HTTPException(422, f"The converted tower would be about {tray_w:.0f} × {output_depth:.0f} × {h:.0f} mm, so it would not fit the Neptune 3 Pro bed. Reduce scale/tray depth or rotate the model.")

        y_front = -d / 2.0
        foundation_w = min(w, outer_w + 20.0)
        foundation_d = min(d, outer_d + 20.0)
        positions = []
        z = h - 42.0
        while z > exit_h + 38.0 and len(positions) < 4:
            positions.append(z)
            z -= 42.0
        if len(positions) < 2:
            raise HTTPException(422, "This model is not tall enough to make a useful multi-baffle dice tower")
        baffles = "\n".join(
            f"wedge_left({zv:.3f});" if i % 2 == 0 else f"wedge_right({zv:.3f});"
            for i, zv in enumerate(positions)
        )

        scad = f'''$fn=48;
model_w={w:.4f}; model_d={d:.4f}; model_h={h:.4f};
channel_w={channel_w:.4f}; channel_d={channel_d:.4f}; outer_w={outer_w:.4f}; outer_d={outer_d:.4f};
exit_h={exit_h:.4f}; tray_d={tray_depth:.4f}; tray_w={tray_w:.4f}; tray_wall=3; tray_lip=12;
y_front={y_front:.4f}; foundation_w={foundation_w:.4f}; foundation_d={foundation_d:.4f};
module carved_body() {{
  difference() {{
    union() {{
      import("normalized.stl", convexity=10);
      translate([0,0,model_h/2]) cube([outer_w,outer_d,model_h],center=true);
      translate([0,0,1]) cube([foundation_w,foundation_d,2],center=true);
    }}
    translate([0,0,(model_h+exit_h)/2]) cube([channel_w,channel_d,model_h-exit_h+8],center=true);
    translate([0,(y_front-channel_d/2)/2,exit_h/2+1]) cube([channel_w,channel_d/2-y_front+10,exit_h+4],center=true);
  }}
}}
module wedge_left(z0) {{
  translate([0,0,z0]) rotate([90,0,0]) linear_extrude(height=channel_d-6,center=true)
    polygon(points=[[-channel_w/2-4,0],[-channel_w/2-4,24],[0,0]]);
}}
module wedge_right(z0) {{
  translate([0,0,z0]) rotate([90,0,0]) linear_extrude(height=channel_d-6,center=true)
    polygon(points=[[channel_w/2+4,0],[channel_w/2+4,24],[0,0]]);
}}
module exit_floor() {{
  rotate([0,90,0]) linear_extrude(height=channel_w-6,center=true)
    polygon(points=[[0,channel_d/2],[-18,channel_d/2],[-6,y_front-5],[0,y_front-5]]);
}}
module tray() {{
  y0=y_front-tray_d/2+3;
  union() {{
    translate([0,y0,1.5]) cube([tray_w,tray_d+6,3],center=true);
    translate([-(tray_w/2-tray_wall/2),y0,tray_lip/2]) cube([tray_wall,tray_d+6,tray_lip],center=true);
    translate([(tray_w/2-tray_wall/2),y0,tray_lip/2]) cube([tray_wall,tray_d+6,tray_lip],center=true);
    translate([0,y_front-tray_d+tray_wall/2+3,tray_lip/2]) cube([tray_w,tray_wall,tray_lip],center=true);
  }}
}}
union() {{
  carved_body();
  {baffles}
  exit_floor();
  tray();
}}
'''
        script.write_text(scad, encoding="utf-8")
        result = subprocess.run([cad, "-q", "-o", str(output), str(script)], cwd=work, capture_output=True, text=True, timeout=DESIGN_TIMEOUT, check=False)
        if result.returncode != 0 or not output.exists() or output.stat().st_size < 100:
            detail = (result.stderr or result.stdout or "Unknown OpenSCAD error").strip()[-1200:]
            raise HTTPException(422, f"Dice tower conversion failed: {detail}")
        check = trimesh.load(output, force="mesh", process=True)
        if check.is_empty:
            raise HTTPException(422, "Dice tower conversion produced an empty mesh")
        out_extents = [float(v) for v in check.extents]
        headers = {
            "X-RQ-Dimensions": ",".join(f"{v:.1f}" for v in out_extents),
            "X-RQ-Baffles": str(len(positions)),
            "X-RQ-Watertight": "yes" if check.is_watertight else "no",
        }
        filename = f"{Path(name).stem}_Dice_Tower.stl"
        return FileResponse(output, filename=filename, media_type="model/stl", headers=headers, background=BackgroundTask(lambda: shutil.rmtree(work, ignore_errors=True)))
    except subprocess.TimeoutExpired:
        shutil.rmtree(work, ignore_errors=True)
        raise HTTPException(504, "Dice tower generation timed out")
    except HTTPException:
        shutil.rmtree(work, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(work, ignore_errors=True)
        raise HTTPException(500, f"Unexpected design error: {type(exc).__name__}") from exc
