import math
import os
import struct
import tempfile
from pathlib import Path

import numpy as np
import trimesh


CHUNK_TRIANGLES = 50_000
BINARY_TRIANGLE = np.dtype([
    ("normal", "<f4", (3,)),
    ("verts", "<f4", (3, 3)),
    ("attr", "<u2"),
])


def binary_stl_info(path: Path):
    size = path.stat().st_size
    if size < 84:
        raise ValueError("STL is too small")
    with path.open("rb") as f:
        f.seek(80)
        count = struct.unpack("<I", f.read(4))[0]
    if size != 84 + count * 50:
        raise ValueError("AI Rescue currently requires a binary STL")
    mn = np.full(3, np.inf, dtype=np.float64)
    mx = np.full(3, -np.inf, dtype=np.float64)
    for block in _binary_chunks(path, count):
        verts = block["verts"].reshape(-1, 3)
        mn = np.minimum(mn, verts.min(axis=0))
        mx = np.maximum(mx, verts.max(axis=0))
    return {
        "triangles": int(count),
        "bounds_min": mn,
        "bounds_max": mx,
        "extents": mx - mn,
        "size_bytes": int(size),
    }


def _binary_chunks(path: Path, count=None):
    with path.open("rb") as f:
        f.seek(80)
        total = struct.unpack("<I", f.read(4))[0]
        if count is not None and total != count:
            raise ValueError("STL triangle count changed while reading")
        left = total
        while left:
            amount = min(CHUNK_TRIANGLES, left)
            buf = f.read(amount * 50)
            if len(buf) != amount * 50:
                raise ValueError("STL ended unexpectedly")
            yield np.frombuffer(buf, dtype=BINARY_TRIANGLE, count=amount)
            left -= amount


def _stream_solid_grid(path: Path, target_height_mm: float, voxel_mm: float = 1.0):
    # Lazy imports keep ordinary slicer startup memory low.
    from scipy import ndimage

    info = binary_stl_info(path)
    mn = info["bounds_min"]
    ext = info["extents"]
    if ext[2] <= 1e-7:
        raise ValueError("Model has no usable height")

    # Leave a little height budget for the one-voxel shell-closing operation.
    raster_height = max(80.0, float(target_height_mm) - 2.0 * voxel_mm)
    scale = raster_height / float(ext[2])
    world_ext = ext * scale
    dims_xyz = np.ceil(world_ext / voxel_mm).astype(np.int32) + 7

    # Guard against accidental gigantic voxel jobs.
    if np.any(dims_xyz > 330):
        raise ValueError(
            f"AI Rescue would need a {int(dims_xyz[0])}×{int(dims_xyz[1])}×{int(dims_xyz[2])} voxel grid. "
            "Reduce target height or rotate the model."
        )

    # Array order is Z,Y,X.
    surface = np.zeros(
        (int(dims_xyz[2]), int(dims_xyz[1]), int(dims_xyz[0])),
        dtype=np.bool_,
    )

    def mark(points):
        q = np.rint((points - mn) * scale / voxel_mm).astype(np.int32) + 3
        q = np.clip(q, [0, 0, 0], dims_xyz - 1)
        surface[q[:, 2], q[:, 1], q[:, 0]] = True

    for block in _binary_chunks(path, info["triangles"]):
        verts = block["verts"].astype(np.float32)
        # High-poly AI exports have tiny triangles. Vertices, centroids and edge
        # midpoints paint a continuous shell without loading the entire mesh.
        mark(verts.reshape(-1, 3))
        mark(verts.mean(axis=1))
        mark((verts[:, 0] + verts[:, 1]) * 0.5)
        mark((verts[:, 1] + verts[:, 2]) * 0.5)
        mark((verts[:, 2] + verts[:, 0]) * 0.5)

    structure = ndimage.generate_binary_structure(3, 1)
    solid = ndimage.binary_closing(surface, structure=structure, iterations=1)
    solid = ndimage.binary_dilation(solid, structure=structure, iterations=1)
    solid = ndimage.binary_fill_holes(solid)

    meta = {
        "source_triangles": info["triangles"],
        "source_dimensions": [round(float(v), 4) for v in ext],
        "source_scale_factor": round(float(scale), 4),
        "voxel_mm": float(voxel_mm),
        "grid_xyz": [int(v) for v in dims_xyz],
    }
    return solid, meta


def _occupied_geometry(solid):
    zz, yy, xx = np.nonzero(solid)
    if len(xx) < 100:
        raise ValueError("Prepared model is empty")
    xmin, xmax = int(xx.min()), int(xx.max())
    ymin, ymax = int(yy.min()), int(yy.max())
    zmin, zmax = int(zz.min()), int(zz.max())
    h = zmax - zmin + 1

    band = (
        (zz >= zmin + int(h * 0.25))
        & (zz <= zmin + int(h * 0.82))
    )
    if not np.any(band):
        band = np.ones_like(zz, dtype=bool)

    cx = float(np.median(xx[band]))
    cy = float(np.median(yy[band]))
    mid_y_min = float(np.percentile(yy[band], 2))
    front_extension = mid_y_min - ymin

    return {
        "zz": zz,
        "yy": yy,
        "xx": xx,
        "xmin": xmin,
        "xmax": xmax,
        "ymin": ymin,
        "ymax": ymax,
        "zmin": zmin,
        "zmax": zmax,
        "width": xmax - xmin + 1,
        "depth": ymax - ymin + 1,
        "height": h,
        "cx": cx,
        "cy": cy,
        "front_extension": float(front_extension),
        "existing_tray": bool(front_extension >= 25.0),
    }


def _adaptive_channel(geom, dice_mm, voxel_mm=1.0):
    dice_mm = float(dice_mm)
    # This was calibrated against a real Meshy-style gothic tower. The older
    # square 2.3×dice shaft was unnecessarily destructive on narrow façades.
    target_w = max(36.0, dice_mm * 1.90)
    target_d = max(34.0, dice_mm * 1.65)

    # Conservative available envelope from overall mid-height body dimensions.
    safe_w = max(0.0, geom["width"] * voxel_mm - 12.0)
    safe_d = max(0.0, geom["depth"] * voxel_mm - 12.0)

    if safe_w < dice_mm * 1.5 or safe_d < dice_mm * 1.45:
        raise ValueError("Model is too narrow for a safe dice passage at this dice size")

    channel_w = min(target_w, safe_w)
    channel_d = min(target_d, safe_d)
    return float(channel_w), float(channel_d)


def _add_wedge(solid, zbase, chx, chy, halfw, halfd, zmin, left=True):
    baffle_depth = max(4, halfd - 2)
    z0 = zmin + int(round(zbase))
    span = max(1, halfw + 2)

    if left:
        xs = range(chx - halfw - 2, chx + 1)
        for x in xs:
            if x < 0 or x >= solid.shape[2]:
                continue
            frac = (chx - x) / span
            top = z0 + int(round(19 * frac))
            solid[
                max(zmin, z0 - 2):min(solid.shape[0], top + 1),
                max(0, chy - baffle_depth):min(solid.shape[1], chy + baffle_depth + 1),
                x:x + 1,
            ] = True
    else:
        xs = range(chx, chx + halfw + 3)
        for x in xs:
            if x < 0 or x >= solid.shape[2]:
                continue
            frac = (x - chx) / span
            top = z0 + int(round(19 * frac))
            solid[
                max(zmin, z0 - 2):min(solid.shape[0], top + 1),
                max(0, chy - baffle_depth):min(solid.shape[1], chy + baffle_depth + 1),
                x:x + 1,
            ] = True


def _add_new_tray(solid, geom, channel_w, tray_depth_mm, tray_x_mm, voxel_mm):
    from scipy import ndimage

    pad_front = int(round((tray_depth_mm + 8) / voxel_mm))
    solid = np.pad(solid, ((0, 0), (pad_front, 2), (2, 2)), constant_values=False)

    # Shift geometry indices after padding.
    geom = _occupied_geometry(solid)
    cx = int(round((geom["xmin"] + geom["xmax"]) / 2 + tray_x_mm / voxel_mm))
    # After padding, geom["ymin"] is the original model's front shifted inward.
    y_back = geom["ymin"] + 2
    y_front = max(2, y_back - int(round(tray_depth_mm / voxel_mm)))
    tray_w = max(channel_w + 24.0, 82.0)
    halfw = int(round(tray_w / (2 * voxel_mm)))
    zmin = geom["zmin"]
    wall_h = int(round(12 / voxel_mm))
    wall_t = max(2, int(round(3 / voxel_mm)))

    x0 = max(1, cx - halfw)
    x1 = min(solid.shape[2] - 1, cx + halfw + 1)
    # Floor
    solid[zmin:zmin + wall_t, y_front:y_back + 2, x0:x1] = True
    # Side walls
    solid[zmin:zmin + wall_h, y_front:y_back + 2, x0:x0 + wall_t] = True
    solid[zmin:zmin + wall_h, y_front:y_back + 2, x1 - wall_t:x1] = True
    # Front lip
    solid[zmin:zmin + wall_h, y_front:y_front + wall_t, x0:x1] = True

    return solid, _occupied_geometry(solid)


def convert_ai_solid_to_tower(
    source: Path,
    output: Path,
    dice_mm=22.0,
    target_height_mm=160.0,
    tray_depth_mm=70.0,
    tray_mode="auto",
    rotation_z=0,
):
    from scipy import ndimage
    from skimage import measure

    if not 16 <= float(dice_mm) <= 30:
        raise ValueError("Dice size must be between 16 and 30 mm")
    if not 125 <= float(target_height_mm) <= 220:
        raise ValueError("Target tower height must be between 125 and 220 mm")
    if tray_mode not in {"auto", "reuse", "add"}:
        raise ValueError("Tray mode must be auto, reuse or add")
    if int(rotation_z) not in {0, 90, 180, 270}:
        raise ValueError("Rotation must be 0, 90, 180 or 270 degrees")

    solid, meta = _stream_solid_grid(source, target_height_mm, voxel_mm=1.0)

    # Rotate in the XY plane after repair.
    k = (int(rotation_z) // 90) % 4
    if k:
        solid = np.rot90(solid, k=k, axes=(1, 2)).copy()

    geom = _occupied_geometry(solid)
    channel_w, channel_d = _adaptive_channel(geom, dice_mm, 1.0)
    existing_detected = bool(geom["existing_tray"])
    reuse = existing_detected if tray_mode == "auto" else tray_mode == "reuse"

    if not reuse:
        solid, geom = _add_new_tray(
            solid, geom, channel_w, float(tray_depth_mm), 0.0, 1.0
        )

    # Recompute bulk after any padding.
    geom = _occupied_geometry(solid)
    xmin, xmax = geom["xmin"], geom["xmax"]
    ymin, ymax = geom["ymin"], geom["ymax"]
    zmin, zmax = geom["zmin"], geom["zmax"]

    halfw = int(round(channel_w / 2.0))
    halfd = int(round(channel_d / 2.0))
    chx = int(round(geom["cx"]))
    chy = int(round(geom["cy"]))
    chx = max(xmin + halfw + 5, min(xmax - halfw - 5, chx))
    chy = max(ymin + halfd + 5, min(ymax - halfd - 5, chy))

    exit_h = max(30.0, float(dice_mm) + 10.0)
    z_exit = zmin + int(round(exit_h))

    # Main vertical shaft.
    solid[
        z_exit:min(solid.shape[0], zmax + 2),
        max(0, chy - halfd):min(solid.shape[1], chy + halfd + 1),
        max(0, chx - halfw):min(solid.shape[2], chx + halfw + 1),
    ] = False

    # Transition to the model/front tray. Keep x centred for auto mode.
    start_y = chy - halfd + 3
    end_y = (
        max(1, ymin - 1)
        if reuse
        else min(ymax - 2, ymin + int(round(float(tray_depth_mm))) - 3)
    )
    target_x = int(round((xmin + xmax) / 2))
    steps = max(2, abs(start_y - end_y) + 1)
    floor_hw = max(2, halfw - 3)

    for t in np.linspace(0.0, 1.0, steps):
        y = int(round(start_y + (end_y - start_y) * t))
        x = int(round(chx + (target_x - chx) * t))
        y0, y1 = max(0, y - 2), min(solid.shape[1], y + 3)
        x0, x1 = max(0, x - halfw), min(solid.shape[2], x + halfw + 1)
        solid[zmin:z_exit + 1, y0:y1, x0:x1] = False

    # Rebuild a shallow support-free floor through the exit.
    for t in np.linspace(0.0, 1.0, steps):
        y = int(round(start_y + (end_y - start_y) * t))
        x = int(round(chx + (target_x - chx) * t))
        top = int(round(zmin + 5 - (2.5 * t)))
        y0, y1 = max(0, y - 2), min(solid.shape[1], y + 3)
        x0, x1 = max(0, x - floor_hw), min(solid.shape[2], x + floor_hw + 1)
        solid[zmin:top + 1, y0:y1, x0:x1] = True

    # Baffles: require two, add more only on taller models.
    usable_h = zmax - zmin + 1
    positions = []
    z = usable_h - 48
    while z > exit_h + 38 and len(positions) < 4:
        positions.append(float(z))
        z -= 36
    if len(positions) < 2:
        raise ValueError("Prepared model is not tall enough for two useful baffles")

    for i, zpos in enumerate(positions):
        _add_wedge(solid, zpos, chx, chy, halfw, halfd, zmin, left=(i % 2 == 0))

    # Remove tiny disconnected voxel islands before meshing.
    structure = ndimage.generate_binary_structure(3, 1)
    labels, count = ndimage.label(solid, structure=structure)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    largest = int(np.argmax(sizes))
    removed_components = max(0, int(count) - 1)
    solid = labels == largest

    # Pad so marching cubes always sees an outside boundary.
    solid = np.pad(solid, 2, constant_values=False)
    verts, faces, _, _ = measure.marching_cubes(
        solid.astype(np.uint8),
        level=0.5,
        spacing=(1.0, 1.0, 1.0),
    )
    # marching_cubes returns Z,Y,X.
    verts_xyz = verts[:, [2, 1, 0]]
    mesh = trimesh.Trimesh(vertices=verts_xyz, faces=faces, process=True)

    # Make the requested height exact after shell closing/dilation.
    mesh.apply_scale(float(target_height_mm) / float(mesh.extents[2]))
    bounds = mesh.bounds
    mesh.apply_translation([
        -float((bounds[0][0] + bounds[1][0]) / 2),
        -float((bounds[0][1] + bounds[1][1]) / 2),
        -float(bounds[0][2]),
    ])
    mesh.export(output)

    meta.update({
        "output_dimensions": [round(float(v), 2) for v in mesh.extents],
        "output_faces": int(len(mesh.faces)),
        "watertight": bool(mesh.is_watertight),
        "connected_parts": int(mesh.body_count),
        "existing_tray_detected": existing_detected,
        "tray_mode_used": "reuse" if reuse else "add",
        "front_extension_mm": round(float(geom["front_extension"]), 1),
        "channel_width_mm": round(channel_w, 1),
        "channel_depth_mm": round(channel_d, 1),
        "baffles": int(len(positions)),
        "removed_voxel_components": removed_components,
    })
    return meta


def ai_tower_selftest():
    # Test the voxel carving/marching-cubes half without a giant fixture file.
    try:
        from scipy import ndimage
        from skimage import measure

        solid = np.zeros((145, 90, 90), dtype=np.bool_)
        solid[2:143, 5:85, 5:85] = True
        # Hollow a representative shaft.
        solid[35:145, 27:63, 24:66] = False
        _add_wedge(solid, 104, 45, 45, 21, 18, 2, left=True)
        _add_wedge(solid, 68, 45, 45, 21, 18, 2, left=False)
        labels, n = ndimage.label(solid)
        sizes = np.bincount(labels.ravel())
        sizes[0] = 0
        solid = labels == int(np.argmax(sizes))
        verts, faces, _, _ = measure.marching_cubes(
            np.pad(solid, 2).astype(np.uint8), level=0.5
        )
        mesh = trimesh.Trimesh(
            vertices=verts[:, [2, 1, 0]], faces=faces, process=True
        )
        return {
            "ok": bool(mesh.is_watertight and len(mesh.faces) > 1000),
            "faces": int(len(mesh.faces)),
            "watertight": bool(mesh.is_watertight),
        }
    except Exception as exc:
        return {"ok": False, "error": type(exc).__name__}
