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

from geometry_ai import recommend_dice_tower
from ai_tower import convert_ai_solid_to_tower

router = APIRouter(prefix="/design", tags=["design"])
MAX_UPLOAD = 125 * 1024 * 1024
BED_X = 225
BED_Y = 225
MAX_Z = 280
DESIGN_TIMEOUT = 300

def openscad_path():
    return shutil.which("openscad")

def design_health():
    cad = openscad_path()
    return {"installed": bool(cad), "name": Path(cad).name if cad else None}

def dice_tower_path_selftest():
    cad = openscad_path()
    if not cad:
        return {"ok": False, "error": "openscad missing"}
    work = Path(tempfile.mkdtemp(prefix="rqs_tower_path_test_"))
    script = work / "path_test.scad"
    output = work / "path_test.stl"
    try:
        script.write_text(r'''$fn=24;
channel_w=50; channel_d=50; model_h=130; exit_h=32;
chute_x=-5; chute_y=0; tray_x=18; y_front=-40;
tray_w=82; tray_d=60; tray_wall=3; tray_lip=12;
module transition_void() {
  hull() {
    translate([chute_x,chute_y-channel_d/2+3,exit_h/2+1]) cube([channel_w,8,exit_h+4],center=true);
    translate([tray_x,y_front-5,exit_h/2+1]) cube([channel_w,8,exit_h+4],center=true);
  }
}
module carved_body() {
  difference() {
    translate([0,0,model_h/2]) cube([90,80,model_h],center=true);
    translate([chute_x,chute_y,(model_h+exit_h)/2]) cube([channel_w,channel_d,model_h-exit_h+8],center=true);
    transition_void();
  }
}
module wedge_left(z0) {
  translate([chute_x,chute_y,z0]) rotate([90,0,0]) linear_extrude(height=channel_d-6,center=true)
    polygon(points=[[-channel_w/2-4,0],[-channel_w/2-4,24],[0,0]]);
}
module wedge_right(z0) {
  translate([chute_x,chute_y,z0]) rotate([90,0,0]) linear_extrude(height=channel_d-6,center=true)
    polygon(points=[[channel_w/2+4,0],[channel_w/2+4,24],[0,0]]);
}
module exit_floor() {
  hull() {
    translate([chute_x,chute_y-channel_d/2+4,5]) cube([channel_w-6,10,5],center=true);
    translate([tray_x,y_front-7,2.5]) cube([channel_w-6,10,5],center=true);
  }
}
module tray() {
  y0=y_front-tray_d/2+3;
  union() {
    translate([tray_x,y0,1.5]) cube([tray_w,tray_d+6,3],center=true);
    translate([tray_x-(tray_w/2-tray_wall/2),y0,tray_lip/2]) cube([tray_wall,tray_d+6,tray_lip],center=true);
    translate([tray_x+(tray_w/2-tray_wall/2),y0,tray_lip/2]) cube([tray_wall,tray_d+6,tray_lip],center=true);
    translate([tray_x,y_front-tray_d+tray_wall/2+3,tray_lip/2]) cube([tray_w,tray_wall,tray_lip],center=true);
  }
}
union() {
  carved_body();
  wedge_left(82);
  wedge_right(46);
  exit_floor();
  tray();
}
''', encoding="utf-8")
        result = subprocess.run(
            [cad, "-q", "-o", str(output), str(script)],
            cwd=work,
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )
        if result.returncode != 0 or not output.exists() or output.stat().st_size < 100:
            return {"ok": False, "error": (result.stderr or result.stdout or "OpenSCAD failed")[-400:]}
        mesh = trimesh.load(output, force="mesh", process=True)
        extents = [round(float(v), 1) for v in mesh.extents]
        zigzag_ok = not mesh.is_empty

        spiral_script = work / "spiral_test.scad"
        spiral_output = work / "spiral_test.stl"
        spiral_script.write_text(
            r'''$fn=14;
turns=1.6;
helix_r=10;
tube_r=17;
bottom=44;
drop=84;
twist=360*turns;
slices=30;
difference() {
  translate([0,0,75]) cube([90,90,150],center=true);
  translate([0,0,bottom])
    linear_extrude(height=drop,twist=twist,slices=slices,convexity=10)
      rotate(-90)
        translate([helix_r,0])
          circle(r=tube_r,$fn=14);
}
''',
            encoding="utf-8",
        )
        spiral_result = subprocess.run(
            [cad, "-q", "-o", str(spiral_output), str(spiral_script)],
            cwd=work,
            capture_output=True,
            text=True,
            timeout=25,
            check=False,
        )
        spiral_ok = (
            spiral_result.returncode == 0
            and spiral_output.exists()
            and spiral_output.stat().st_size > 100
        )
        spiral_faces = 0
        if spiral_ok:
            spiral_mesh = trimesh.load(spiral_output, force="mesh", process=True)
            spiral_ok = not spiral_mesh.is_empty
            spiral_faces = int(len(spiral_mesh.faces))

        return {
            "ok": bool(zigzag_ok and spiral_ok),
            "faces": int(len(mesh.faces)),
            "dimensions_mm": extents,
            "spiral_ok": bool(spiral_ok),
            "spiral_faces": spiral_faces,
        }
    except Exception as exc:
        return {"ok": False, "error": type(exc).__name__}
    finally:
        shutil.rmtree(work, ignore_errors=True)


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
                raise HTTPException(413, "Maximum upload size is 125 MB")
            f.write(data)
    if size < 100:
        raise HTTPException(400, "That model file appears to be empty")

@router.post("/ai-dice-tower")
async def build_ai_dice_tower(
    model: UploadFile = File(...),
    dice_mm: float = Form(22.0),
    target_height_mm: float = Form(160.0),
    tray_depth: float = Form(70.0),
    tray_mode: str = Form("auto"),
    rotation_z: int = Form(0),
    chute_style: str = Form("zigzag"),
    access_pin: str = Form(""),
):
    check_pin(access_pin)
    name = Path(model.filename or "").name
    if Path(name).suffix.lower() != ".stl":
        raise HTTPException(400, "AI / Meshy Rescue currently needs an STL file")
    if not 16 <= dice_mm <= 30:
        raise HTTPException(400, "Dice size must be between 16 mm and 30 mm")
    if not 125 <= target_height_mm <= 220:
        raise HTTPException(400, "Target height must be between 125 mm and 220 mm")
    if not 50 <= tray_depth <= 100:
        raise HTTPException(400, "Tray depth must be between 50 mm and 100 mm")
    if tray_mode not in {"auto","reuse","add"}:
        raise HTTPException(400, "Tray mode must be auto, reuse or add")
    if rotation_z not in {0,90,180,270}:
        raise HTTPException(400, "Front rotation must be 0°, 90°, 180° or 270°")
    chute_style = (chute_style or "zigzag").strip().lower()
    if chute_style not in {"straight","zigzag","spiral"}:
        raise HTTPException(400, "Chute style must be straight, zigzag or spiral")

    work = Path(tempfile.mkdtemp(prefix="rqs_ai_tower_"))
    source = work / "source.stl"
    output = work / "ai_dice_tower.stl"
    try:
        await save_upload(model, source)
        try:
            meta = convert_ai_solid_to_tower(
                source,
                output,
                dice_mm=dice_mm,
                target_height_mm=target_height_mm,
                tray_depth_mm=tray_depth,
                tray_mode=tray_mode,
                rotation_z=rotation_z,
                chute_style=chute_style,
            )
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc

        if not output.exists() or output.stat().st_size < 100:
            raise HTTPException(422, "AI Rescue produced no usable STL")

        headers = {
            "X-RQ-AI-Prep": "yes",
            "X-RQ-Source-Triangles": str(meta.get("source_triangles","")),
            "X-RQ-Dimensions": ",".join(str(v) for v in meta.get("output_dimensions",[])),
            "X-RQ-Watertight": "yes" if meta.get("watertight") else "no",
            "X-RQ-Parts": str(meta.get("connected_parts","")),
            "X-RQ-Tray-Mode": str(meta.get("tray_mode_used","")),
            "X-RQ-Existing-Tray": "yes" if meta.get("existing_tray_detected") else "no",
            "X-RQ-Channel": f'{meta.get("channel_width_mm","")}x{meta.get("channel_depth_mm","")}',
            "X-RQ-Baffles": str(meta.get("baffles","")),
            "X-RQ-Prep-Scale": str(meta.get("source_scale_factor","")),
            "X-RQ-Chute-Style": str(meta.get("chute_style",chute_style)),
            "X-RQ-Spiral-Turns": str(meta.get("spiral_turns",0)),
        }
        filename = f"{Path(name).stem}_AI_Rescued_Dice_Tower.stl"
        return FileResponse(
            output,
            filename=filename,
            media_type="model/stl",
            headers=headers,
            background=BackgroundTask(lambda: shutil.rmtree(work, ignore_errors=True)),
        )
    except HTTPException:
        shutil.rmtree(work, ignore_errors=True)
        raise
    except MemoryError as exc:
        shutil.rmtree(work, ignore_errors=True)
        raise HTTPException(507, "AI Rescue ran out of memory. Try a smaller target height.") from exc
    except Exception as exc:
        shutil.rmtree(work, ignore_errors=True)
        raise HTTPException(500, f"AI Rescue failed: {type(exc).__name__}") from exc


@router.post("/dice-tower-suggest")
async def suggest_dice_tower(
    model: UploadFile = File(...),
    scale_percent: int = Form(100),
    dice_mm: float = Form(22.0),
    tray_depth: float = Form(70.0),
    front_rotation: str = Form("auto"),
    tray_x_mm: str = Form("auto"),
    chute_style: str = Form("zigzag"),
    access_pin: str = Form(""),
):
    check_pin(access_pin)
    name = Path(model.filename or "").name
    if Path(name).suffix.lower() != ".stl":
        raise HTTPException(400, "Smart Dice Tower currently needs an STL file")
    if not 16 <= dice_mm <= 30:
        raise HTTPException(400, "Dice size must be between 16 mm and 30 mm")
    if not 50 <= tray_depth <= 100:
        raise HTTPException(400, "Tray depth must be between 50 mm and 100 mm")
    if not 50 <= scale_percent <= 250:
        raise HTTPException(400, "Scale must be between 50% and 250%")
    chute_style = (chute_style or "zigzag").strip().lower()
    if chute_style not in {"straight","zigzag","spiral"}:
        raise HTTPException(400, "Chute style must be straight, zigzag or spiral")

    rotation = None
    if front_rotation != "auto":
        try:
            rotation = int(front_rotation)
        except Exception:
            raise HTTPException(400, "Front rotation must be auto, 0, 90, 180 or 270")
        if rotation not in {0,90,180,270}:
            raise HTTPException(400, "Front rotation must be auto, 0, 90, 180 or 270")

    locked_tray_x = None
    if tray_x_mm != "auto":
        try:
            locked_tray_x = float(tray_x_mm)
        except Exception:
            raise HTTPException(400, "Tray position must be auto or a number in mm")
        if not -80 <= locked_tray_x <= 80:
            raise HTTPException(400, "Tray position must stay within ±80 mm")

    work = Path(tempfile.mkdtemp(prefix="rqs_tower_suggest_"))
    source = work / "source.stl"
    try:
        await save_upload(model, source)
        mesh = trimesh.load(source, force="mesh", process=True)
        if mesh.is_empty:
            raise HTTPException(422, "That STL could not be analysed")
        mesh.apply_scale(scale_percent / 100.0)
        return recommend_dice_tower(
            mesh,
            dice_mm=dice_mm,
            tray_depth=tray_depth,
            front_rotation=rotation,
            tray_x_mm=locked_tray_x,
            chute_style=chute_style,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(422, f"Smart suggestion failed: {type(exc).__name__}") from exc
    finally:
        shutil.rmtree(work, ignore_errors=True)

@router.post("/dice-tower")
async def build_dice_tower(
    model: UploadFile = File(...),
    scale_percent: int = Form(100),
    rotation_z: int = Form(0),
    dice_mm: float = Form(22.0),
    tray_depth: float = Form(70.0),
    tray_x_mm: float = Form(0.0),
    chute_x_mm: float = Form(0.0),
    chute_y_mm: float = Form(0.0),
    chute_style: str = Form("zigzag"),
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
    if not -80 <= tray_x_mm <= 80:
        raise HTTPException(400, "Tray position must stay within ±80 mm")
    chute_style = (chute_style or "zigzag").strip().lower()
    if chute_style not in {"straight","zigzag","spiral"}:
        raise HTTPException(400, "Chute style must be straight, zigzag or spiral")

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

        exit_h = max(30.0, dice_mm + 10.0)
        tube_d = max(34.0, dice_mm * 1.55)
        helix_radius = 0.0
        spiral_turns = 0.0
        spiral_segments = 0

        if chute_style == "straight":
            channel_w = max(40.0, dice_mm * 1.9)
            channel_d = channel_w
            min_h = max(86.0, dice_mm + 58.0)
        elif chute_style == "spiral":
            helix_radius = max(6.0, dice_mm * 0.42)
            channel_w = 2.0 * (tube_d / 2.0 + helix_radius) + 10.0
            channel_d = channel_w
            min_h = max(118.0, dice_mm * 4.8)
        else:
            channel_w = max(44.0, dice_mm * 2.3)
            channel_d = channel_w
            min_h = max(125.0, dice_mm + 102.0)

        outer_w = channel_w + 6.0
        outer_d = channel_d + 6.0
        max_x = max(0.0, w / 2.0 - channel_w / 2.0 - 5.0)
        max_y = max(0.0, d / 2.0 - channel_d / 2.0 - 5.0)
        if abs(chute_x_mm) > max_x + 0.01 or abs(chute_y_mm) > max_y + 0.01:
            raise HTTPException(
                422,
                f"Requested chute offset ({chute_x_mm:.1f}, {chute_y_mm:.1f}) mm would push the {chute_style} chute outside the model envelope. Maximum safe offset here is about ±{max_x:.1f} X and ±{max_y:.1f} Y."
            )

        min_w = outer_w + 8.0
        min_d = outer_d + 8.0
        if w < min_w or d < min_d or h < min_h:
            factor = max(min_w / max(w, 0.1), min_d / max(d, 0.1), min_h / max(h, 0.1))
            suggested = min(250, int(math.ceil(scale_percent * factor / 5.0) * 5))
            raise HTTPException(
                422,
                f"This model is too small for the {chute_style} chute at {scale_percent}%. Try about {suggested}% scale, choose a simpler chute style, or use a larger/wider model."
            )

        tray_w = min(w + 10.0, max(channel_w + 24.0, 82.0))
        output_depth = d + tray_depth + 3.0
        finished_left = min(-w / 2.0, tray_x_mm - tray_w / 2.0)
        finished_right = max(w / 2.0, tray_x_mm + tray_w / 2.0)
        output_width = finished_right - finished_left
        tray_overlap = not (
            tray_x_mm + tray_w / 2.0 < -w / 2.0 - 4.0
            or tray_x_mm - tray_w / 2.0 > w / 2.0 + 4.0
        )
        transition_run = max(28.0, min(55.0, d * 0.34))
        transition_shift = tray_x_mm - chute_x_mm
        transition_angle = math.degrees(math.atan2(abs(transition_shift), transition_run))
        if not tray_overlap:
            raise HTTPException(422, "The tray is too far sideways to connect safely to the model.")
        if transition_angle > 34.0:
            raise HTTPException(
                422,
                f"The tray-to-chute path would turn about {transition_angle:.1f}°, which is too sharp. Move the tray closer to the chute or use Smart Calculate."
            )
        if output_width > BED_X or output_depth > BED_Y or h > MAX_Z:
            raise HTTPException(
                422,
                f"The converted tower would be about {output_width:.0f} × {output_depth:.0f} × {h:.0f} mm, so it would not fit the Neptune 3 Pro bed."
            )

        y_front = -d / 2.0
        foundation_w = min(w, outer_w + 20.0)
        foundation_d = min(d, outer_d + 20.0)

        positions = []
        baffles = ""
        spiral_void_calls = ""
        spiral_preview_points = 0

        if chute_style == "zigzag":
            low = exit_h + 30.0
            high = h - 30.0
            if high <= low + 12.0:
                raise HTTPException(422, "This model is not tall enough for two useful zig-zag platforms")
            count = max(2, min(4, 1 + int((high - low) // 34.0)))
            if count == 1:
                positions = [high]
            else:
                positions = [
                    high - i * (high - low) / (count - 1)
                    for i in range(count)
                ]
            baffles = "\n".join(
                f"wedge_left({zv:.3f});" if i % 2 == 0 else f"wedge_right({zv:.3f});"
                for i, zv in enumerate(positions)
            )

        elif chute_style == "spiral":
            tube_r = tube_d / 2.0
            spiral_top = h - tube_r - 6.0
            spiral_bottom = exit_h + tube_r + 8.0
            spiral_drop = spiral_top - spiral_bottom
            min_pitch = tube_d + 6.0
            spiral_turns = min(3.0, spiral_drop / min_pitch)
            if spiral_turns < 1.25:
                raise HTTPException(
                    422,
                    "This model is too short for a useful spiral chute. Choose Zig-Zag or Straight, or make the tower taller."
                )

            # The helical void is a single twisted extrusion rather than dozens
            # of sphere-to-sphere hulls. It is dramatically cheaper for CGAL.
            spiral_start_deg = -90.0
            spiral_twist_deg = 360.0 * spiral_turns
            spiral_slices = max(28, int(math.ceil(spiral_turns * 18.0)))
            spiral_end_deg = spiral_start_deg + spiral_twist_deg

            bottom_angle = math.radians(spiral_start_deg)
            top_angle = math.radians(spiral_end_deg)
            spiral_bottom_x = chute_x_mm + helix_radius * math.cos(bottom_angle)
            spiral_bottom_y = chute_y_mm + helix_radius * math.sin(bottom_angle)
            spiral_top_x = chute_x_mm + helix_radius * math.cos(top_angle)
            spiral_top_y = chute_y_mm + helix_radius * math.sin(top_angle)
            spiral_exit_z = max(tube_r + 2.0, exit_h / 2.0)
            spiral_preview_points = spiral_slices + 1

        common_modules = f'''$fn=36;
model_w={w:.4f}; model_d={d:.4f}; model_h={h:.4f};
channel_w={channel_w:.4f}; channel_d={channel_d:.4f}; outer_w={outer_w:.4f}; outer_d={outer_d:.4f};
exit_h={exit_h:.4f}; tray_d={tray_depth:.4f}; tray_w={tray_w:.4f}; tray_wall=3; tray_lip=12;
y_front={y_front:.4f}; foundation_w={foundation_w:.4f}; foundation_d={foundation_d:.4f};
chute_x={chute_x_mm:.4f}; chute_y={chute_y_mm:.4f}; tray_x={tray_x_mm:.4f};
tube_r={tube_d/2.0:.4f};
spiral_bottom={locals().get("spiral_bottom", 0.0):.4f};
spiral_drop={locals().get("spiral_drop", 0.0):.4f};
spiral_start_deg={locals().get("spiral_start_deg", 0.0):.4f};
spiral_twist_deg={locals().get("spiral_twist_deg", 0.0):.4f};
spiral_slices={locals().get("spiral_slices", 1)};
helix_radius={helix_radius:.4f};
spiral_bottom_x={locals().get("spiral_bottom_x", chute_x_mm):.4f};
spiral_bottom_y={locals().get("spiral_bottom_y", chute_y_mm):.4f};
spiral_top_x={locals().get("spiral_top_x", chute_x_mm):.4f};
spiral_top_y={locals().get("spiral_top_y", chute_y_mm):.4f};
spiral_top_z={locals().get("spiral_top", h):.4f};
spiral_exit_z={locals().get("spiral_exit_z", exit_h/2.0):.4f};
module transition_void() {{
  hull() {{
    translate([chute_x,chute_y-channel_d/2+3,exit_h/2+1]) cube([min(channel_w,50),8,exit_h+4],center=true);
    translate([tray_x,y_front-5,exit_h/2+1]) cube([min(channel_w,50),8,exit_h+4],center=true);
  }}
}}
module capsule(p1,p2,r) {{
  hull() {{
    translate(p1) sphere(r=r,$fn=20);
    translate(p2) sphere(r=r,$fn=20);
  }}
}}
module wedge_left(z0) {{
  translate([chute_x,chute_y,z0]) rotate([90,0,0]) linear_extrude(height=channel_d-6,center=true)
    polygon(points=[[-channel_w/2-4,0],[-channel_w/2-4,24],[0,0]]);
}}
module wedge_right(z0) {{
  translate([chute_x,chute_y,z0]) rotate([90,0,0]) linear_extrude(height=channel_d-6,center=true)
    polygon(points=[[channel_w/2+4,0],[channel_w/2+4,24],[0,0]]);
}}
module exit_floor() {{
  hull() {{
    translate([chute_x,chute_y-channel_d/2+4,5]) cube([min(channel_w-6,46),10,5],center=true);
    translate([tray_x,y_front-7,2.5]) cube([min(channel_w-6,46),10,5],center=true);
  }}
}}
module tray() {{
  y0=y_front-tray_d/2+3;
  union() {{
    translate([tray_x,y0,1.5]) cube([tray_w,tray_d+6,3],center=true);
    translate([tray_x-(tray_w/2-tray_wall/2),y0,tray_lip/2]) cube([tray_wall,tray_d+6,tray_lip],center=true);
    translate([tray_x+(tray_w/2-tray_wall/2),y0,tray_lip/2]) cube([tray_wall,tray_d+6,tray_lip],center=true);
    translate([tray_x,y_front-tray_d+tray_wall/2+3,tray_lip/2]) cube([tray_w,tray_wall,tray_lip],center=true);
  }}
}}
'''

        if chute_style == "spiral":
            scad = common_modules + f'''
module spiral_core() {{
  translate([chute_x,chute_y,spiral_bottom])
    linear_extrude(
      height=spiral_drop,
      twist=spiral_twist_deg,
      slices=spiral_slices,
      convexity=10
    )
      rotate(spiral_start_deg)
        translate([helix_radius,0])
          circle(r=tube_r,$fn=16);
}}
module spiral_void() {{
  union() {{
    spiral_core();
    capsule(
      [chute_x,chute_y,model_h+2],
      [spiral_top_x,spiral_top_y,spiral_top_z],
      tube_r
    );
    capsule(
      [spiral_bottom_x,spiral_bottom_y,spiral_bottom],
      [tray_x,y_front-5,spiral_exit_z],
      tube_r
    );
  }}
}}
module carved_body() {{
  difference() {{
    import("normalized.stl", convexity=10);
    spiral_void();
  }}
}}
union() {{
  carved_body();
  tray();
}}
'''
        else:
            scad = common_modules + f'''
module carved_body() {{
  difference() {{
    union() {{
      import("normalized.stl", convexity=10);
      translate([chute_x,chute_y,model_h/2]) cube([outer_w,outer_d,model_h],center=true);
      translate([chute_x,chute_y,1]) cube([foundation_w,foundation_d,2],center=true);
    }}
    translate([chute_x,chute_y,(model_h+exit_h)/2]) cube([channel_w,channel_d,model_h-exit_h+8],center=true);
    transition_void();
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
            "X-RQ-Chute-X": f"{chute_x_mm:.1f}",
            "X-RQ-Chute-Y": f"{chute_y_mm:.1f}",
            "X-RQ-Tray-X": f"{tray_x_mm:.1f}",
            "X-RQ-Tray-Width": f"{tray_w:.1f}",
            "X-RQ-Transition-Angle": f"{transition_angle:.1f}",
            "X-RQ-Chute-Style": chute_style,
            "X-RQ-Spiral-Turns": f"{spiral_turns:.2f}" if chute_style == "spiral" else "0",
            "X-RQ-Path-Points": str(spiral_preview_points) if chute_style == "spiral" else str(len(positions) + 2),
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
