import math
import os
import shutil
import tempfile
from pathlib import Path

import trimesh
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

router = APIRouter(prefix="/doctor", tags=["doctor"])
MAX_UPLOAD = 75 * 1024 * 1024
BED = (225.0, 225.0, 280.0)

def check_pin(pin: str):
    required = os.getenv("APP_PIN", "").strip()
    if required and pin.strip() != required:
        raise HTTPException(401, "Incorrect Rookie Quest Slicer PIN")

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

def load_mesh(path: Path):
    try:
        loaded = trimesh.load(path, force="mesh", process=False)
    except Exception as exc:
        raise HTTPException(422, f"Could not read this model: {type(exc).__name__}") from exc
    if loaded is None or loaded.is_empty or len(loaded.vertices) < 4 or len(loaded.faces) < 4:
        raise HTTPException(422, "That file does not contain a usable mesh")
    return loaded

def mesh_report(mesh):
    ext = [float(x) for x in mesh.extents]
    bounds = mesh.bounds
    body_count = int(mesh.body_count)
    current_fit = ext[0] <= BED[0] and ext[1] <= BED[1] and ext[2] <= BED[2]
    xy_swapped_fit = ext[1] <= BED[0] and ext[0] <= BED[1] and ext[2] <= BED[2]
    fit = current_fit or xy_swapped_fit
    issues = []
    if not mesh.is_watertight:
        issues.append({"level":"warn","title":"Open / non-watertight mesh","detail":"The model has holes, open edges or overlapping geometry. It may still slice, but repair is recommended."})
    if body_count > 1:
        issues.append({"level":"warn","title":f"{body_count} disconnected pieces","detail":"The STL contains separate mesh bodies. That can be intentional, but tiny floating pieces may print badly."})
    if not fit:
        issues.append({"level":"bad","title":"Too large for Neptune 3 Pro","detail":f"Current size is {ext[0]:.1f} × {ext[1]:.1f} × {ext[2]:.1f} mm."})
    if float(bounds[0][2]) < -0.05:
        issues.append({"level":"warn","title":"Geometry below Z=0","detail":"Part of the model sits below the virtual bed. The slicer may crop it."})
    if len(mesh.faces) > 1_500_000:
        issues.append({"level":"warn","title":"Very dense mesh","detail":"This model has over 1.5 million triangles and may be slow to preview or slice on a phone workflow."})
    if not issues:
        issues.append({"level":"good","title":"No obvious mesh problems","detail":"The basic geometry checks passed."})

    repairable = not mesh.is_watertight or body_count > 1
    return {
        "dimensions_mm":[round(v,2) for v in ext],
        "triangles":int(len(mesh.faces)),
        "vertices":int(len(mesh.vertices)),
        "watertight":bool(mesh.is_watertight),
        "connected_parts":body_count,
        "fits_printer":fit,
        "fits_if_rotated_xy":bool((not current_fit) and xy_swapped_fit),
        "volume_cm3":round(abs(float(mesh.volume))/1000.0,2) if mesh.is_volume else None,
        "repair_recommended":repairable,
        "issues":issues,
    }

@router.post("/inspect")
async def inspect_model(model: UploadFile = File(...), access_pin: str = Form("")):
    check_pin(access_pin)
    name = Path(model.filename or "").name
    suffix = Path(name).suffix.lower()
    if suffix not in {".stl", ".obj", ".ply"}:
        raise HTTPException(400, "Model Doctor currently supports STL, OBJ and PLY")
    work = Path(tempfile.mkdtemp(prefix="rqs_doctor_"))
    source = work / f"source{suffix}"
    try:
        await save_upload(model, source)
        mesh = load_mesh(source)
        return mesh_report(mesh)
    finally:
        shutil.rmtree(work, ignore_errors=True)

@router.post("/repair")
async def repair_model(model: UploadFile = File(...), access_pin: str = Form("")):
    check_pin(access_pin)
    name = Path(model.filename or "").name
    suffix = Path(name).suffix.lower()
    if suffix not in {".stl", ".obj", ".ply"}:
        raise HTTPException(400, "Automatic repair currently supports STL, OBJ and PLY")
    work = Path(tempfile.mkdtemp(prefix="rqs_repair_"))
    source = work / f"source{suffix}"
    output = work / "repaired.stl"
    try:
        await save_upload(model, source)
        mesh = load_mesh(source)
        original_faces = int(len(mesh.faces))
        mesh = mesh.copy()
        mesh.process(validate=True)
        try:
            trimesh.repair.fix_normals(mesh, multibody=True)
        except Exception:
            pass
        try:
            trimesh.repair.fill_holes(mesh)
        except Exception:
            pass
        try:
            mesh.remove_unreferenced_vertices()
        except Exception:
            pass
        if mesh.is_empty or len(mesh.faces) < 4:
            raise HTTPException(422, "Automatic repair removed too much geometry, so the original was left unchanged")
        mesh.export(output)
        report = mesh_report(mesh)
        headers = {
            "X-RQ-Watertight":"yes" if report["watertight"] else "no",
            "X-RQ-Parts":str(report["connected_parts"]),
            "X-RQ-Faces-Before":str(original_faces),
            "X-RQ-Faces-After":str(len(mesh.faces)),
        }
        filename = f"{Path(name).stem}_Repaired.stl"
        return FileResponse(output, filename=filename, media_type="model/stl", headers=headers, background=BackgroundTask(lambda: shutil.rmtree(work, ignore_errors=True)))
    except HTTPException:
        shutil.rmtree(work, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(work, ignore_errors=True)
        raise HTTPException(500, f"Repair failed: {type(exc).__name__}") from exc
