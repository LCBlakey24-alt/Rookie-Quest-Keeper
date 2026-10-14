import math
import os
import shutil
import tempfile
from pathlib import Path

import numpy as np
import trimesh
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

router = APIRouter(prefix="/doctor", tags=["doctor"])
MAX_UPLOAD = 125 * 1024 * 1024
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
                raise HTTPException(413, "Maximum upload size is 125 MB")
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

def support_analysis(mesh):
    """Heuristic support analysis in the model's current orientation."""
    try:
        if mesh.is_empty or len(mesh.faces) < 4:
            return {"recommended_mode":"off","confidence":"low","reasons":["mesh is empty"]}

        normals = mesh.face_normals
        centers = mesh.triangles_center
        areas = mesh.area_faces
        min_z = float(mesh.bounds[0][2])
        total_area = max(float(areas.sum()), 1e-6)

        # Ignore the bottom-most skin because it is assumed to sit on the bed.
        above_bed = centers[:, 2] > min_z + 0.8
        moderate = (normals[:, 2] < -0.28) & above_bed
        severe = (normals[:, 2] < -0.66) & above_bed

        overhang_area = float(areas[moderate].sum())
        severe_area = float(areas[severe].sum())
        overhang_pct = overhang_area / total_area * 100.0
        severe_pct = severe_area / total_area * 100.0

        blocked_area = 0.0
        max_height = 0.0
        if moderate.any():
            max_height = float((centers[moderate, 2] - min_z).max())

            # Approximate whether a vertical bed-only support column can reach a
            # downward-facing patch without first encountering model geometry.
            # A 3 mm XY grid keeps this fast enough for phone-uploaded meshes.
            cell = 3.0
            all_cells = {}
            for idx, p in enumerate(centers):
                key = (int(math.floor(float(p[0]) / cell)), int(math.floor(float(p[1]) / cell)))
                z = float(p[2])
                current = all_cells.get(key)
                if current is None or z < current:
                    all_cells[key] = z

            for idx in list(map(int, np.nonzero(moderate)[0])):
                p = centers[idx]
                key = (int(math.floor(float(p[0]) / cell)), int(math.floor(float(p[1]) / cell)))
                lower_z = all_cells.get(key, min_z)
                if lower_z < float(p[2]) - 3.0 and lower_z > min_z + 1.2:
                    blocked_area += float(areas[idx])

        blocked_pct = (blocked_area / overhang_area * 100.0) if overhang_area > 1e-6 else 0.0

        if overhang_pct < 1.2 and severe_pct < 0.35:
            mode = "off"
            confidence = "high"
        elif blocked_pct < 10 and overhang_pct < 8:
            mode = "gentle_bed"
            confidence = "high"
        elif blocked_pct < 18 and overhang_pct < 18:
            mode = "snug_bed"
            confidence = "medium"
        elif blocked_pct >= 18 and overhang_pct < 22:
            mode = "snug_everywhere"
            confidence = "medium"
        elif blocked_pct < 22:
            mode = "grid_bed"
            confidence = "medium"
        else:
            mode = "grid_everywhere"
            confidence = "medium"

        labels = {
            "off":"Off",
            "gentle_bed":"Gentle · Build Plate Only",
            "snug_bed":"Snug · Build Plate Only",
            "snug_everywhere":"Snug · Everywhere",
            "grid_bed":"Strong Grid · Build Plate Only",
            "grid_everywhere":"Strong Grid · Everywhere",
        }
        reasons = []
        if mode == "off":
            reasons.append("very little downward-facing overhang area was detected")
        else:
            reasons.append(f"about {overhang_pct:.1f}% of surface area is downward-facing enough to merit checking")
            if severe_pct > 0.5:
                reasons.append(f"about {severe_pct:.1f}% is a steeper underside")
            if blocked_pct >= 18:
                reasons.append(f"about {blocked_pct:.0f}% of overhang area appears blocked from a straight bed-only column")
            else:
                reasons.append("most detected overhangs appear reachable from the build plate")
            if max_height > 80:
                reasons.append(f"some overhangs are high on the model (up to roughly {max_height:.0f} mm above the base)")

        return {
            "recommended_mode": mode,
            "recommended_label": labels[mode],
            "confidence": confidence,
            "overhang_area_pct": round(overhang_pct, 2),
            "severe_overhang_pct": round(severe_pct, 2),
            "blocked_overhang_pct": round(blocked_pct, 1),
            "max_overhang_height_mm": round(max_height, 1),
            "reasons": reasons,
            "note": "This is a geometry heuristic in the model's current orientation. Rotate the model and re-check if you change orientation.",
        }
    except Exception as exc:
        return {
            "recommended_mode":"gentle_bed",
            "recommended_label":"Gentle · Build Plate Only",
            "confidence":"low",
            "overhang_area_pct":None,
            "severe_overhang_pct":None,
            "blocked_overhang_pct":None,
            "max_overhang_height_mm":None,
            "reasons":[f"support analysis fell back safely ({type(exc).__name__})"],
            "note":"Fallback recommendation only.",
        }


def support_advisor_selftest():
    try:
        stem = trimesh.creation.box(extents=[20, 20, 40])
        stem.apply_translation([0, 0, 20])
        cap = trimesh.creation.box(extents=[60, 60, 8])
        cap.apply_translation([0, 0, 44])
        model = trimesh.util.concatenate([stem, cap])
        advice = support_analysis(model)
        return {
            "ok": advice.get("recommended_mode") != "off" and (advice.get("overhang_area_pct") or 0) > 1,
            "mode": advice.get("recommended_mode"),
            "overhang_area_pct": advice.get("overhang_area_pct"),
            "blocked_overhang_pct": advice.get("blocked_overhang_pct"),
        }
    except Exception as exc:
        return {"ok":False,"error":type(exc).__name__}


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
        "support_advice":support_analysis(mesh),
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
