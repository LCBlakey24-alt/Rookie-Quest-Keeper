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

router = APIRouter(prefix="/edit", tags=["editor"])
MAX_UPLOAD = 75 * 1024 * 1024
BED_X, BED_Y, MAX_Z = 225.0, 225.0, 280.0
EDIT_TIMEOUT = 300

def check_pin(pin: str):
    required = os.getenv("APP_PIN", "").strip()
    if required and pin.strip() != required:
        raise HTTPException(401, "Incorrect Rookie Quest Slicer PIN")

def openscad_path():
    return shutil.which("openscad")

async def save_upload(upload: UploadFile, target: Path):
    total = 0
    with target.open("wb") as f:
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_UPLOAD:
                raise HTTPException(413, "Maximum upload size is 75 MB")
            f.write(chunk)
    if total < 100:
        raise HTTPException(400, "That model file appears to be empty")

def load_stl(path: Path):
    try:
        mesh = trimesh.load(path, force="mesh", process=True)
    except Exception as exc:
        raise HTTPException(422, f"Could not read this STL: {type(exc).__name__}") from exc
    if mesh is None or mesh.is_empty or len(mesh.faces) < 4:
        raise HTTPException(422, "That STL does not contain usable mesh geometry")
    return mesh

def rotation_matrix(rx: float, ry: float, rz: float):
    matrix = trimesh.transformations.identity_matrix()
    for angle, axis in ((rx, [1,0,0]), (ry,[0,1,0]), (rz,[0,0,1])):
        if angle:
            matrix = trimesh.transformations.concatenate_matrices(
                trimesh.transformations.rotation_matrix(math.radians(angle), axis),
                matrix,
            )
    return matrix

def normalize_to_bed(mesh):
    bounds = mesh.bounds
    center_x = float((bounds[0][0] + bounds[1][0]) / 2)
    center_y = float((bounds[0][1] + bounds[1][1]) / 2)
    bottom = float(bounds[0][2])
    mesh.apply_translation([-center_x, -center_y, -bottom])

def apply_transform(mesh, scale_percent, rx, ry, rz, mirror_x):
    mesh = mesh.copy()
    mesh.apply_scale(scale_percent / 100.0)
    if mirror_x:
        mirror = trimesh.transformations.scale_matrix(-1, [0,0,0], [1,0,0])
        mesh.apply_transform(mirror)
        try:
            mesh.invert()
        except Exception:
            pass
    mesh.apply_transform(rotation_matrix(rx, ry, rz))
    normalize_to_bed(mesh)
    return mesh

def dims(mesh):
    return [float(v) for v in mesh.extents]

def fits(ext):
    return ext[0] <= BED_X and ext[1] <= BED_Y and ext[2] <= MAX_Z

@router.post("/orientation")
async def recommend_orientation(
    model: UploadFile = File(...),
    access_pin: str = Form(""),
):
    check_pin(access_pin)
    name = Path(model.filename or "").name
    if Path(name).suffix.lower() != ".stl":
        raise HTTPException(400, "Visual Editor v1 currently uses STL files")
    work = Path(tempfile.mkdtemp(prefix="rqs_orient_"))
    source = work / "source.stl"
    try:
        await save_upload(model, source)
        original = load_stl(source)
        candidates = [
            (0,0,0),(90,0,0),(-90,0,0),(0,90,0),(0,-90,0),(180,0,0)
        ]
        scored = []
        for rx,ry,rz in candidates:
            test = original.copy()
            test.apply_transform(rotation_matrix(rx,ry,rz))
            ext = dims(test)
            fit = fits(ext)
            # Prefer orientations that fit, then low height, then smaller bed footprint.
            score = (0 if fit else 1, ext[2], ext[0]*ext[1])
            scored.append((score, rx, ry, rz, ext, fit))
        scored.sort(key=lambda x:x[0])
        best = scored[0]
        return {
            "rotation_x":best[1],
            "rotation_y":best[2],
            "rotation_z":best[3],
            "dimensions_mm":[round(v,2) for v in best[4]],
            "fits_printer":best[5],
            "note":"Auto Fit checks six 90-degree face orientations and prefers a low-height orientation that fits the Neptune 3 Pro. It does not replace a support preview."
        }
    finally:
        shutil.rmtree(work, ignore_errors=True)

@router.post("/build")
async def build_edit(
    model: UploadFile = File(...),
    scale_percent: int = Form(100),
    rotation_x: float = Form(0),
    rotation_y: float = Form(0),
    rotation_z: float = Form(0),
    mirror_x: str = Form("off"),
    base_type: str = Form("none"),
    base_width: float = Form(35),
    base_depth: float = Form(35),
    base_thickness: float = Form(3),
    name_text: str = Form(""),
    name_size: float = Form(5),
    name_height: float = Form(0.8),
    access_pin: str = Form(""),
):
    check_pin(access_pin)
    cad = openscad_path()
    if not cad:
        raise HTTPException(503, "Visual Editor design engine is not installed")
    name = Path(model.filename or "").name
    if Path(name).suffix.lower() != ".stl":
        raise HTTPException(400, "Visual Editor v1 currently uses STL files")
    if not 20 <= scale_percent <= 300:
        raise HTTPException(400, "Scale must be between 20% and 300%")
    for val in (rotation_x, rotation_y, rotation_z):
        if not -360 <= val <= 360:
            raise HTTPException(400, "Rotation must be between -360° and 360°")
    if mirror_x not in {"off","on"}:
        raise HTTPException(400, "Mirror setting is invalid")
    if base_type not in {"none","round","square","hex"}:
        raise HTTPException(400, "Unknown base type")
    if not 10 <= base_width <= 180 or not 10 <= base_depth <= 180:
        raise HTTPException(400, "Base dimensions must be between 10 mm and 180 mm")
    if not 1 <= base_thickness <= 10:
        raise HTTPException(400, "Base thickness must be between 1 mm and 10 mm")
    name_text = (name_text or "").strip()[:28]
    if name_text and base_type == "none":
        raise HTTPException(400, "Add a base before adding a nameplate")
    if not 2 <= name_size <= 16 or not 0.4 <= name_height <= 3:
        raise HTTPException(400, "Nameplate size or height is outside the allowed range")

    work = Path(tempfile.mkdtemp(prefix="rqs_edit_"))
    source = work / "source.stl"
    transformed = work / "transformed.stl"
    script = work / "edited.scad"
    output = work / "edited.stl"
    try:
        await save_upload(model, source)
        mesh = load_stl(source)
        mesh = apply_transform(
            mesh, scale_percent, rotation_x, rotation_y, rotation_z, mirror_x == "on"
        )
        ext = dims(mesh)
        if ext[0] > BED_X or ext[1] > BED_Y or ext[2] > MAX_Z:
            raise HTTPException(
                422,
                f"Transformed model is {ext[0]:.1f} × {ext[1]:.1f} × {ext[2]:.1f} mm and does not fit the Neptune 3 Pro."
            )

        lift = base_thickness if base_type != "none" else 0.0
        if lift:
            mesh.apply_translation([0,0,lift])
        mesh.export(transformed)

        safe_text = name_text.replace("\\", "\\\\").replace('"','\\"')
        if base_type == "round":
            base_code = f'cylinder(h={base_thickness:.4f}, d={base_width:.4f}, $fn=96);'
        elif base_type == "hex":
            base_code = f'cylinder(h={base_thickness:.4f}, d={base_width:.4f}, $fn=6);'
        elif base_type == "square":
            base_code = f'translate([0,0,{base_thickness/2:.4f}]) cube([{base_width:.4f},{base_depth:.4f},{base_thickness:.4f}], center=true);'
        else:
            base_code = ""

        # A shallow front plaque is attached to the base. Raised lettering is horizontal
        # so it prints without needing supports.
        plaque_code = ""
        if name_text:
            plaque_w = min(max(base_width * 0.72, len(name_text) * name_size * 0.62 + 8), 160)
            plaque_d = max(10.0, name_size + 5)
            plaque_y = -(base_depth / 2.0 + plaque_d / 2.0 - 1.5)
            plaque_code = f'''
            translate([0,{plaque_y:.4f},{base_thickness/2:.4f}])
                cube([{plaque_w:.4f},{plaque_d:.4f},{base_thickness:.4f}], center=true);
            translate([0,{plaque_y:.4f},{base_thickness:.4f}])
                linear_extrude(height={name_height:.4f})
                    text("{safe_text}", size={name_size:.4f}, halign="center", valign="center", font="DejaVu Sans:style=Bold");
            '''

        scad = f'''$fn=96;
union() {{
  import("transformed.stl", convexity=10);
  {base_code}
  {plaque_code}
}}
'''
        script.write_text(scad, encoding="utf-8")
        result = subprocess.run(
            [cad, "-q", "-o", str(output), str(script)],
            cwd=work, capture_output=True, text=True, timeout=EDIT_TIMEOUT, check=False
        )
        if result.returncode != 0 or not output.exists() or output.stat().st_size < 100:
            detail = (result.stderr or result.stdout or "Unknown editor error").strip()[-1400:]
            raise HTTPException(422, f"Editor could not build this STL: {detail}")

        result_mesh = load_stl(output)
        out_ext = dims(result_mesh)
        if not fits(out_ext):
            raise HTTPException(
                422,
                f"Edited result is {out_ext[0]:.1f} × {out_ext[1]:.1f} × {out_ext[2]:.1f} mm and is too large for the Neptune 3 Pro."
            )
        headers = {
            "X-RQ-Dimensions": ",".join(f"{v:.1f}" for v in out_ext),
            "X-RQ-Watertight": "yes" if result_mesh.is_watertight else "no",
            "X-RQ-Base": base_type,
        }
        filename = f"{Path(name).stem}_Edited.stl"
        return FileResponse(
            output, filename=filename, media_type="model/stl", headers=headers,
            background=BackgroundTask(lambda: shutil.rmtree(work, ignore_errors=True))
        )
    except subprocess.TimeoutExpired:
        shutil.rmtree(work, ignore_errors=True)
        raise HTTPException(504, "Visual Editor timed out")
    except HTTPException:
        shutil.rmtree(work, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(work, ignore_errors=True)
        raise HTTPException(500, f"Unexpected editor error: {type(exc).__name__}") from exc
