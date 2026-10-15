import math
from pathlib import Path

import numpy as np
import trimesh
from PIL import Image, ImageDraw

BED_X = 225.0
BED_Y = 225.0
MAX_Z = 280.0


def load_mesh(path: Path):
    mesh = trimesh.load(path, force="mesh", process=True)
    if mesh is None or mesh.is_empty or len(mesh.faces) < 4:
        raise ValueError("Model does not contain usable mesh geometry")
    return mesh


def normalized(mesh):
    out = mesh.copy()
    bounds = out.bounds
    out.apply_translation([
        -float((bounds[0][0] + bounds[1][0]) / 2),
        -float((bounds[0][1] + bounds[1][1]) / 2),
        -float(bounds[0][2]),
    ])
    return out


def rotate_z(mesh, degrees):
    out = mesh.copy()
    if degrees:
        out.apply_transform(
            trimesh.transformations.rotation_matrix(
                math.radians(degrees), [0, 0, 1]
            )
        )
    return normalized(out)


def basic_report(mesh):
    mesh = normalized(mesh)
    ext = [float(v) for v in mesh.extents]
    return {
        "dimensions_mm": [round(v, 2) for v in ext],
        "triangles": int(len(mesh.faces)),
        "vertices": int(len(mesh.vertices)),
        "watertight": bool(mesh.is_watertight),
        "connected_parts": int(mesh.body_count),
        "fits_neptune_3_pro": bool(
            ext[0] <= BED_X and ext[1] <= BED_Y and ext[2] <= MAX_Z
        ),
        "volume_cm3": (
            round(abs(float(mesh.volume)) / 1000.0, 2)
            if mesh.is_volume else None
        ),
    }


def _bulk_center(mesh):
    verts = np.asarray(mesh.vertices)
    if len(verts) == 0:
        return 0.0, 0.0
    h = float(mesh.extents[2])
    z = verts[:, 2]
    band = verts[(z >= h * 0.25) & (z <= h * 0.82)]
    if len(band) < max(20, len(verts) * 0.01):
        band = verts
    return float(np.median(band[:, 0])), float(np.median(band[:, 1]))


def _front_complexity(mesh, exit_h):
    centers = np.asarray(mesh.triangles_center)
    if len(centers) == 0:
        return 1.0
    d = float(mesh.extents[1])
    front_y = -d / 2.0
    strip = centers[
        (centers[:, 1] <= front_y + max(12.0, d * 0.16))
        & (centers[:, 2] <= exit_h * 1.4)
    ]
    return min(1.0, len(strip) / max(1.0, len(centers) * 0.08))


def _front_window_complexity(mesh, x_center, window_w, exit_h):
    centers = np.asarray(mesh.triangles_center)
    if len(centers) == 0:
        return 1.0
    d = float(mesh.extents[1])
    front_y = -d / 2.0
    strip = centers[
        (centers[:, 1] <= front_y + max(12.0, d * 0.18))
        & (centers[:, 2] <= exit_h * 1.5)
        & (centers[:, 0] >= x_center - window_w / 2.0)
        & (centers[:, 0] <= x_center + window_w / 2.0)
    ]
    expected = max(1.0, len(centers) * min(0.18, window_w / max(float(mesh.extents[0]), 1.0)) * 0.28)
    return min(1.0, len(strip) / expected)


def _finished_width(model_w, tray_w, tray_x):
    left = min(-model_w / 2.0, tray_x - tray_w / 2.0)
    right = max(model_w / 2.0, tray_x + tray_w / 2.0)
    return right - left


def recommend_dice_tower(
    mesh,
    dice_mm=22.0,
    tray_depth=70.0,
    front_rotation=None,
    tray_x_mm=None,
    chute_style="zigzag",
):
    dice_mm = float(dice_mm)
    tray_depth = float(tray_depth)
    chute_style = (chute_style or "zigzag").strip().lower()
    if chute_style not in {"straight", "zigzag", "spiral"}:
        raise ValueError("Unknown chute style")

    if chute_style == "spiral":
        tube_d = max(34.0, dice_mm * 1.55)
        helix_r = max(6.0, dice_mm * 0.42)
        channel = 2.0 * (tube_d / 2.0 + helix_r) + 10.0
        min_height = max(118.0, dice_mm * 4.8)
    elif chute_style == "straight":
        tube_d = max(34.0, dice_mm * 1.55)
        helix_r = 0.0
        channel = max(40.0, dice_mm * 1.9)
        min_height = max(86.0, dice_mm + 58.0)
    else:
        tube_d = max(34.0, dice_mm * 1.55)
        helix_r = 0.0
        channel = max(44.0, dice_mm * 2.3)
        min_height = max(125.0, dice_mm + 102.0)

    outer = channel + 6.0
    exit_h = max(30.0, dice_mm + 10.0)
    rotations = [0, 90, 180, 270] if front_rotation is None else [int(front_rotation) % 360]
    candidates = []

    for rotation in rotations:
        m = rotate_z(mesh, rotation)
        w, d, h = [float(v) for v in m.extents]
        tray_w = min(w + 10.0, max(channel + 24.0, 82.0))
        total_d = d + tray_depth + 3.0

        clearance_x = w - outer - 8.0
        clearance_y = d - outer - 8.0
        tall_enough = h >= min_height
        physically_possible = clearance_x >= 0 and clearance_y >= 0 and tall_enough

        cx, cy = _bulk_center(m)
        max_x = max(0.0, w / 2.0 - channel / 2.0 - 5.0)
        max_y = max(0.0, d / 2.0 - channel / 2.0 - 5.0)

        if tray_x_mm is None:
            tray_span = max(0.0, min(w / 2.0, (BED_X - tray_w) / 2.0, 60.0))
            probe = [-tray_span, -tray_span / 2.0, 0.0, tray_span / 2.0, tray_span]
            scored_trays = []
            for tx in probe:
                local_complexity = _front_window_complexity(m, tx, tray_w * 0.72, exit_h)
                scored_trays.append((
                    local_complexity * 10.0 + abs(tx - cx) * 0.035,
                    tx,
                    local_complexity,
                ))
            scored_trays.sort(key=lambda item: item[0])
            tray_x = float(scored_trays[0][1])
            local_complexity = float(scored_trays[0][2])
        else:
            tray_x = float(tray_x_mm)
            local_complexity = _front_window_complexity(m, tray_x, tray_w * 0.72, exit_h)

        desired_chute_x = tray_x * 0.68 + cx * 0.32
        transition_run = max(28.0, min(55.0, d * 0.34))
        max_side_shift = transition_run * math.tan(math.radians(32.0))
        desired_chute_x = max(tray_x - max_side_shift, min(tray_x + max_side_shift, desired_chute_x))
        chute_x = max(-max_x, min(max_x, desired_chute_x))
        chute_y = max(-max_y, min(max_y, cy))

        lateral_shift = tray_x - chute_x
        path_angle = math.degrees(math.atan2(abs(lateral_shift), transition_run))
        path_ok = path_angle <= 34.0

        finished_w = _finished_width(w, tray_w, tray_x)
        fit = finished_w <= BED_X and total_d <= BED_Y and h <= MAX_Z
        tray_overlap = not (
            tray_x + tray_w / 2.0 < -w / 2.0 - 4.0
            or tray_x - tray_w / 2.0 > w / 2.0 + 4.0
        )
        physically_possible = physically_possible and tray_overlap and path_ok

        complexity = _front_complexity(m, exit_h)
        margin = min(clearance_x, clearance_y)
        score = 0.0
        score += 80.0 if fit else -80.0
        score += 60.0 if physically_possible else -120.0
        score += min(45.0, max(-30.0, margin * 0.7))
        score += min(35.0, h * 0.16)
        score += (1.0 - complexity) * 12.0
        score += (1.0 - local_complexity) * 24.0
        score -= path_angle * 0.45
        score -= abs(chute_y) * 0.08
        if chute_style == "spiral":
            score -= max(0.0, min_height - h) * 0.6

        candidates.append({
            "rotation_z": rotation,
            "chute_style": chute_style,
            "dimensions_mm": [round(w, 2), round(d, 2), round(h, 2)],
            "minimum_height_mm": round(min_height, 1),
            "channel_mm": round(channel, 2),
            "tube_diameter_mm": round(tube_d, 2),
            "helix_radius_mm": round(helix_r, 2),
            "chute_x_mm": round(chute_x, 2),
            "chute_y_mm": round(chute_y, 2),
            "tray_x_mm": round(tray_x, 2),
            "tray_width_mm": round(tray_w, 2),
            "tray_depth_mm": round(tray_depth, 2),
            "finished_footprint_mm": [round(finished_w, 2), round(total_d, 2)],
            "fits_printer": fit,
            "physically_possible": physically_possible,
            "front_complexity": round(complexity, 3),
            "tray_region_complexity": round(local_complexity, 3),
            "transition_angle_deg": round(path_angle, 1),
            "transition_shift_mm": round(lateral_shift, 2),
            "clearance_margin_mm": round(margin, 2),
            "score": round(score, 2),
        })

    candidates.sort(key=lambda item: item["score"], reverse=True)
    best = candidates[0]
    confidence = "high"
    if not best["physically_possible"] or not best["fits_printer"]:
        confidence = "low"
    elif len(candidates) > 1 and (best["score"] - candidates[1]["score"]) < 8:
        confidence = "medium"

    style_labels = {
        "straight": "Straight Drop",
        "zigzag": "Zig-Zag Platforms",
        "spiral": "Spiral / Spring",
    }
    reasons = [f"{style_labels[chute_style]} geometry was used for clearance and height checks"]
    if tray_x_mm is None:
        reasons.append("tray position was scanned across the front and placed in a lower-complexity exit region")
    else:
        reasons.append("tray position was kept where requested and the chute was recalculated around it")
    if best["fits_printer"]:
        reasons.append("finished tower and offset tray fit the Neptune 3 Pro build area")
    else:
        reasons.append("the proposed finished tower or offset tray does not fit the build area")
    if best["physically_possible"]:
        reasons.append("the selected chute style fits the current width, depth, height and transition limits")
    elif best["dimensions_mm"][2] < best["minimum_height_mm"]:
        reasons.append(
            f"{style_labels[chute_style]} needs about {best['minimum_height_mm']:.0f} mm of height; this orientation has {best['dimensions_mm'][2]:.0f} mm"
        )
    else:
        reasons.append("the selected chute style is too wide for the available internal envelope or creates an unsafe exit transition")
    if abs(best["transition_shift_mm"]) > 2:
        reasons.append(
            f"lower path shifts {abs(best['transition_shift_mm']):.1f} mm sideways at about {best['transition_angle_deg']:.1f}° to meet the tray"
        )

    return {
        "recommendation": best,
        "confidence": confidence,
        "reasons": reasons,
        "alternatives": candidates[1:4],
        "method": "style-aware tray-first geometry heuristic",
        "warning": "This is a geometric clearance check. Use Virtual Dice Drop and rotate the transparent preview before printing.",
    }



def svg_preview(mesh, width=960, height=340):
    mesh = normalized(mesh)
    verts = np.asarray(mesh.vertices)
    if len(verts) > 4500:
        step = max(1, len(verts) // 4500)
        verts = verts[::step]

    views = [
        ("FRONT", verts[:, [0, 2]]),
        ("SIDE", verts[:, [1, 2]]),
        ("TOP", verts[:, [0, 1]]),
    ]
    panel_w = width / 3.0
    pieces = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<rect width="100%" height="100%" fill="#0e121a"/>',
    ]
    for idx, (label, pts) in enumerate(views):
        x0 = idx * panel_w
        pad = 28.0
        px = pts[:, 0]
        py = pts[:, 1]
        minx, maxx = float(px.min()), float(px.max())
        miny, maxy = float(py.min()), float(py.max())
        sx = (panel_w - 2 * pad) / max(1e-6, maxx - minx)
        sy = (height - 2 * pad - 24) / max(1e-6, maxy - miny)
        scale = min(sx, sy)
        cx = (minx + maxx) / 2.0
        cy = (miny + maxy) / 2.0
        for x, y in pts:
            xx = x0 + panel_w / 2 + (float(x) - cx) * scale
            yy = height / 2 - (float(y) - cy) * scale + 8
            pieces.append(
                f'<circle cx="{xx:.1f}" cy="{yy:.1f}" r="0.75" fill="#d9e0e9" opacity="0.55"/>'
            )
        pieces.append(
            f'<text x="{x0 + 14:.1f}" y="22" fill="#e1ad58" font-family="sans-serif" font-size="13" font-weight="700">{label}</text>'
        )
        if idx < 2:
            pieces.append(
                f'<line x1="{x0+panel_w:.1f}" y1="12" x2="{x0+panel_w:.1f}" y2="{height-12}" stroke="#273247"/>'
            )
    pieces.append("</svg>")
    return "".join(pieces)


def png_preview(mesh, width=1200, height=420):
    """Render lightweight orthographic front/side/top views for AI vision."""
    mesh = normalized(mesh)
    verts = np.asarray(mesh.vertices)
    if len(verts) > 9000:
        step = max(1, len(verts) // 9000)
        verts = verts[::step]

    img = Image.new("RGB", (width, height), (14, 18, 26))
    draw = ImageDraw.Draw(img)
    views = [
        ("FRONT", verts[:, [0, 2]], verts[:, 1]),
        ("SIDE", verts[:, [1, 2]], verts[:, 0]),
        ("TOP", verts[:, [0, 1]], verts[:, 2]),
    ]
    panel_w = width / 3.0
    pad = 38.0
    for idx, (label, pts, depth) in enumerate(views):
        x0 = idx * panel_w
        px, py = pts[:, 0], pts[:, 1]
        minx, maxx = float(px.min()), float(px.max())
        miny, maxy = float(py.min()), float(py.max())
        sx = (panel_w - 2 * pad) / max(1e-6, maxx - minx)
        sy = (height - 2 * pad - 28) / max(1e-6, maxy - miny)
        scale = min(sx, sy)
        cx = (minx + maxx) / 2.0
        cy = (miny + maxy) / 2.0
        dmin, dmax = float(depth.min()), float(depth.max())
        denom = max(1e-6, dmax - dmin)

        # Draw far points first and near points brighter to give some depth cue.
        order = np.argsort(depth)
        for k in order:
            x, y = pts[k]
            t = (float(depth[k]) - dmin) / denom
            val = int(125 + 110 * t)
            xx = x0 + panel_w / 2 + (float(x) - cx) * scale
            yy = height / 2 - (float(y) - cy) * scale + 10
            r = 1 if len(verts) > 3500 else 2
            draw.ellipse((xx-r, yy-r, xx+r, yy+r), fill=(val, val, min(255, val + 12)))

        # Gold bounding rectangle and heading.
        bx0 = x0 + panel_w / 2 + (minx - cx) * scale
        bx1 = x0 + panel_w / 2 + (maxx - cx) * scale
        by0 = height / 2 - (maxy - cy) * scale + 10
        by1 = height / 2 - (miny - cy) * scale + 10
        draw.rectangle((bx0, by0, bx1, by1), outline=(225, 173, 88), width=2)
        draw.text((x0 + 16, 12), label, fill=(225, 173, 88))
        if idx < 2:
            draw.line((x0 + panel_w, 14, x0 + panel_w, height - 14), fill=(39, 50, 71), width=2)

    return img


def geometry_selftest():
    try:
        mesh = trimesh.creation.box(extents=[82, 78, 145])
        mesh.apply_translation([0, 0, 72.5])
        rec = recommend_dice_tower(mesh, dice_mm=22, tray_depth=60)
        locked = recommend_dice_tower(mesh, dice_mm=22, tray_depth=60, front_rotation=0, tray_x_mm=18)
        img = png_preview(mesh, width=600, height=240)
        ok = (
            rec.get("recommendation", {}).get("physically_possible") is True
            and locked.get("recommendation", {}).get("tray_x_mm") == 18.0
            and locked.get("recommendation", {}).get("transition_angle_deg", 99) <= 34.0
            and img.size == (600, 240)
        )
        return {
            "ok": bool(ok),
            "confidence": rec.get("confidence"),
            "rotation_z": rec.get("recommendation", {}).get("rotation_z"),
            "chute_x_mm": rec.get("recommendation", {}).get("chute_x_mm"),
            "auto_tray_x_mm": rec.get("recommendation", {}).get("tray_x_mm"),
            "locked_tray_x_mm": locked.get("recommendation", {}).get("tray_x_mm"),
            "png_size": list(img.size),
        }
    except Exception as exc:
        return {"ok": False, "error": type(exc).__name__}
