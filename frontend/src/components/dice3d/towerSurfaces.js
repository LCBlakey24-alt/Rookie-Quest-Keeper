/**
 * Hand-made surfaces for the dice towers: wood grain, stone blocks, hammered
 * iron, veined marble, engraved gold and patterned lacquer.
 *
 * Each surface is painted once onto a small canvas (a colour picture and a
 * matching height picture for the bumps), so a tower reads as something
 * crafted rather than as flat-coloured boxes. Nothing is downloaded and
 * nothing here is physics: these are only materials.
 *
 * Where a canvas is unavailable (tests, a locked-down browser) a surface
 * falls back to its plain colour, so a tower always builds.
 */

import {
  CanvasTexture,
  Color,
  MeshPhysicalMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';

export const SURFACE_KINDS = ['wood', 'stone', 'iron', 'marble', 'gold', 'lacquer', 'shingle'];

/** One texture tile covers this many world units; boxes tile to match. */
export const SURFACE_TILE = 4;
const SIZE = 256;

/** A small repeatable random source, so a design looks the same every time. */
export function surfaceRandom(seed = 1) {
  let state = (seed * 2654435761) >>> 0 || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5; state >>>= 0;
    return state / 4294967296;
  };
}

function canvasPair() {
  if (typeof document === 'undefined') return null;
  const make = () => {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    let ctx = null;
    try { ctx = canvas.getContext('2d'); } catch (error) { ctx = null; }
    return ctx ? { canvas, ctx } : null;
  };
  const colour = make();
  const height = colour && make();
  return colour && height ? { colour, height } : null;
}

const shade = (ctx, alpha, dark = true) => { ctx.fillStyle = dark ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`; };

/* Each painter fills the colour canvas (over the base colour already laid
   down) and the height canvas (mid grey = flat, lighter = raised). */
const PAINTERS = {
  wood({ colour, height }, random) {
    // Planks running up the tower, each with its own tone, grain and a knot or two.
    const planks = 4;
    const w = SIZE / planks;
    for (let p = 0; p < planks; p += 1) {
      shade(colour.ctx, random() * 0.16, random() > 0.5);
      colour.ctx.fillRect(p * w, 0, w, SIZE);
      for (let g = 0; g < 26; g += 1) {
        const x = p * w + random() * w;
        const sway = (random() - 0.5) * 5;
        const alpha = 0.05 + random() * 0.13;
        [colour.ctx, height.ctx].forEach((ctx) => {
          ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
          ctx.lineWidth = 0.6 + random() * 1.2;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.bezierCurveTo(x + sway, SIZE * 0.33, x - sway, SIZE * 0.66, x, SIZE);
          ctx.stroke();
        });
      }
      if (random() > 0.45) {
        const kx = p * w + w * (0.25 + random() * 0.5);
        const ky = random() * SIZE;
        for (let ring = 5; ring > 0; ring -= 1) {
          colour.ctx.strokeStyle = `rgba(0,0,0,${0.1 + (5 - ring) * 0.05})`;
          colour.ctx.lineWidth = 1;
          colour.ctx.beginPath();
          colour.ctx.ellipse(kx, ky, ring * 1.6, ring * 3, 0, 0, Math.PI * 2);
          colour.ctx.stroke();
        }
      }
      // The seam between planks: dark and sunk.
      shade(colour.ctx, 0.5);
      colour.ctx.fillRect(p * w, 0, 1.5, SIZE);
      height.ctx.fillStyle = 'rgba(0,0,0,0.85)';
      height.ctx.fillRect(p * w, 0, 2.5, SIZE);
    }
  },

  stone({ colour, height }, random) {
    // Coursed blocks with sunk mortar, each block its own tone and pitted.
    const rows = 4;
    const rowH = SIZE / rows;
    height.ctx.fillStyle = 'rgb(40,40,40)';
    height.ctx.fillRect(0, 0, SIZE, SIZE);
    shade(colour.ctx, 0.55);
    colour.ctx.fillRect(0, 0, SIZE, SIZE);
    for (let r = 0; r < rows; r += 1) {
      const blocks = 2;
      const blockW = SIZE / blocks;
      const offset = (r % 2) * (blockW / 2);
      for (let b = -1; b <= blocks; b += 1) {
        const x = b * blockW + offset + 2;
        const y = r * rowH + 2;
        const tone = random();
        colour.ctx.fillStyle = colour.base;
        colour.ctx.fillRect(x, y, blockW - 4, rowH - 4);
        shade(colour.ctx, tone * 0.22, tone > 0.5);
        colour.ctx.fillRect(x, y, blockW - 4, rowH - 4);
        const lift = 150 + Math.floor(random() * 50);
        height.ctx.fillStyle = `rgb(${lift},${lift},${lift})`;
        height.ctx.fillRect(x, y, blockW - 4, rowH - 4);
      }
    }
    for (let i = 0; i < 900; i += 1) {
      const x = random() * SIZE;
      const y = random() * SIZE;
      const dark = random() > 0.4;
      shade(colour.ctx, 0.05 + random() * 0.12, dark);
      colour.ctx.fillRect(x, y, 1 + random() * 2, 1 + random() * 2);
      if (dark) { height.ctx.fillStyle = 'rgba(0,0,0,0.25)'; height.ctx.fillRect(x, y, 2, 2); }
    }
  },

  iron({ colour, height }, random) {
    // Hammered plate: overlapping dents, scratches and patches of rust.
    for (let i = 0; i < 160; i += 1) {
      const x = random() * SIZE;
      const y = random() * SIZE;
      const r = 6 + random() * 14;
      const lit = random() > 0.5;
      [colour.ctx, height.ctx].forEach((ctx, index) => {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        const alpha = index === 0 ? 0.1 : 0.3;
        gradient.addColorStop(0, lit ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      });
    }
    for (let i = 0; i < 9; i += 1) {
      const x = random() * SIZE;
      const y = random() * SIZE;
      const r = 14 + random() * 26;
      const gradient = colour.ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, 'rgba(150,72,28,0.34)');
      gradient.addColorStop(1, 'rgba(150,72,28,0)');
      colour.ctx.fillStyle = gradient;
      colour.ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 40; i += 1) {
      colour.ctx.strokeStyle = `rgba(255,255,255,${0.04 + random() * 0.08})`;
      colour.ctx.lineWidth = 0.6;
      const x = random() * SIZE;
      const y = random() * SIZE;
      colour.ctx.beginPath();
      colour.ctx.moveTo(x, y);
      colour.ctx.lineTo(x + (random() - 0.5) * 60, y + (random() - 0.5) * 18);
      colour.ctx.stroke();
    }
  },

  marble({ colour, height }, random) {
    // Soft clouding, then a few long wandering veins.
    for (let i = 0; i < 40; i += 1) {
      const x = random() * SIZE;
      const y = random() * SIZE;
      const r = 20 + random() * 50;
      const gradient = colour.ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, random() > 0.5 ? 'rgba(255,255,255,0.14)' : 'rgba(90,80,70,0.08)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      colour.ctx.fillStyle = gradient;
      colour.ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let v = 0; v < 7; v += 1) {
      let x = random() * SIZE;
      let y = -10;
      const drift = (random() - 0.5) * 1.4;
      colour.ctx.strokeStyle = `rgba(96,82,70,${0.2 + random() * 0.3})`;
      colour.ctx.lineWidth = 0.6 + random() * 1.4;
      colour.ctx.beginPath();
      colour.ctx.moveTo(x, y);
      while (y < SIZE + 10) {
        x += (random() - 0.5) * 16 + drift * 6;
        y += 6 + random() * 10;
        colour.ctx.lineTo(x, y);
      }
      colour.ctx.stroke();
    }
    height.ctx.fillStyle = 'rgba(255,255,255,0.03)';
    height.ctx.fillRect(0, 0, SIZE, SIZE);
  },

  gold({ colour, height }, random) {
    // Brushed metal with an engraved diamond lattice and a boss at each crossing.
    for (let i = 0; i < 220; i += 1) {
      const y = random() * SIZE;
      shade(colour.ctx, 0.03 + random() * 0.06, random() > 0.5);
      colour.ctx.fillRect(0, y, SIZE, 0.6 + random());
    }
    const step = SIZE / 4;
    [colour.ctx, height.ctx].forEach((ctx, index) => {
      ctx.strokeStyle = index === 0 ? 'rgba(60,34,0,0.42)' : 'rgba(0,0,0,0.7)';
      ctx.lineWidth = index === 0 ? 1.4 : 2.4;
      for (let k = -4; k <= 8; k += 1) {
        ctx.beginPath(); ctx.moveTo(k * step, 0); ctx.lineTo(k * step + SIZE, SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(k * step, 0); ctx.lineTo(k * step - SIZE, SIZE); ctx.stroke();
      }
    });
    for (let ix = 0; ix <= 4; ix += 1) {
      for (let iy = 0; iy <= 4; iy += 1) {
        const x = ix * step;
        const y = iy * step;
        const gradient = height.ctx.createRadialGradient(x, y, 0, x, y, 7);
        gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        height.ctx.fillStyle = gradient;
        height.ctx.fillRect(x - 7, y - 7, 14, 14);
        colour.ctx.fillStyle = 'rgba(255,240,190,0.5)';
        colour.ctx.beginPath(); colour.ctx.arc(x, y, 2.6, 0, Math.PI * 2); colour.ctx.fill();
      }
    }
  },

  lacquer({ colour, height }, random) {
    // Deep lacquer with an inlaid honeycomb and a scatter of bright flecks.
    const r = SIZE / 8;
    const rowH = r * Math.sqrt(3);
    [colour.ctx, height.ctx].forEach((ctx, index) => {
      ctx.strokeStyle = index === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.55)';
      ctx.lineWidth = index === 0 ? 1 : 1.8;
      for (let row = -1; row < 7; row += 1) {
        for (let col = -1; col < 7; col += 1) {
          const cx = col * r * 3 + (row % 2 ? r * 1.5 : 0);
          const cy = row * rowH * 0.5;
          ctx.beginPath();
          for (let k = 0; k <= 6; k += 1) {
            const a = (Math.PI / 3) * k;
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }
    });
    for (let i = 0; i < 110; i += 1) {
      colour.ctx.fillStyle = `rgba(255,255,255,${0.1 + random() * 0.4})`;
      colour.ctx.fillRect(random() * SIZE, random() * SIZE, 1, 1);
    }
  },

  shingle({ colour, height }, random) {
    // Overlapping rounded roof tiles in staggered rows.
    const rows = 6;
    const rowH = SIZE / rows;
    const tileW = SIZE / 6;
    for (let row = 0; row < rows; row += 1) {
      for (let col = -1; col < 7; col += 1) {
        const x = col * tileW + (row % 2 ? tileW / 2 : 0);
        const y = row * rowH;
        const tone = random();
        [colour.ctx, height.ctx].forEach((ctx, index) => {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + tileW, y);
          ctx.lineTo(x + tileW, y + rowH * 0.55);
          ctx.quadraticCurveTo(x + tileW / 2, y + rowH * 1.25, x, y + rowH * 0.55);
          ctx.closePath();
          if (index === 0) {
            ctx.fillStyle = colour.base;
            ctx.fill();
            shade(ctx, tone * 0.26, tone > 0.5);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          } else {
            const lift = 120 + Math.floor((1 - row / rows) * 30 + tone * 60);
            ctx.fillStyle = `rgb(${lift},${lift},${lift})`;
            ctx.fill();
            ctx.strokeStyle = 'rgb(20,20,20)';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        });
      }
    }
  },
};

/** How strongly each surface's bumps show, and how it takes the light. */
const FINISH = {
  wood: { bumpScale: 0.9, roughness: 0.62, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.5 },
  stone: { bumpScale: 1.6, roughness: 0.92, metalness: 0, clearcoat: 0 },
  iron: { bumpScale: 1.1, roughness: 0.58, metalness: 0.85, clearcoat: 0.1 },
  marble: { bumpScale: 0.1, roughness: 0.22, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.15 },
  gold: { bumpScale: 0.8, roughness: 0.3, metalness: 0.95, clearcoat: 0.3 },
  lacquer: { bumpScale: 0.35, roughness: 0.3, metalness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.2 },
  shingle: { bumpScale: 1.8, roughness: 0.8, metalness: 0, clearcoat: 0 },
};

function paint(kind, colourHex, seed) {
  const pair = canvasPair();
  if (!pair || !PAINTERS[kind]) return null;
  const base = `#${new Color(colourHex).getHexString()}`;
  pair.colour.base = base;
  pair.colour.ctx.fillStyle = base;
  pair.colour.ctx.fillRect(0, 0, SIZE, SIZE);
  pair.height.ctx.fillStyle = 'rgb(128,128,128)';
  pair.height.ctx.fillRect(0, 0, SIZE, SIZE);
  PAINTERS[kind](pair, surfaceRandom(seed));
  const map = new CanvasTexture(pair.colour.canvas);
  map.colorSpace = SRGBColorSpace;
  const bumpMap = new CanvasTexture(pair.height.canvas);
  [map, bumpMap].forEach((texture) => {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.anisotropy = 4;
  });
  return { map, bumpMap };
}

/**
 * The materials for one tower. material(kind, colour) returns the same
 * material for the same request, so a tower of forty boxes still uses a
 * handful of materials and textures; dispose() frees every one.
 */
export function createSurfaceLibrary() {
  const made = new Map();
  const textures = [];

  function material(kind, colour, overrides = {}) {
    const key = `${kind}|${colour}|${JSON.stringify(overrides)}`;
    if (made.has(key)) return made.get(key);
    const finish = FINISH[kind] || { roughness: 0.5, metalness: 0.1 };
    const { bumpScale = 0, ...physical } = finish;
    const painted = paint(kind, colour, key.length + kind.charCodeAt(0));
    if (painted) textures.push(painted.map, painted.bumpMap);
    const result = new MeshPhysicalMaterial({
      // With a painted map the colour lives in the picture; without one the plain colour stands in.
      color: painted ? 0xffffff : colour,
      ...physical,
      ...(painted ? { map: painted.map, bumpMap: painted.bumpMap, bumpScale } : {}),
      ...overrides,
    });
    made.set(key, result);
    return result;
  }

  return {
    material,
    dispose() {
      textures.forEach((texture) => texture.dispose());
      made.forEach((item) => item.dispose());
      made.clear();
    },
  };
}

/**
 * Re-map a box's texture coordinates so a surface tiles at the same size on
 * every face, however long or thin the box (a 14-unit wall no longer
 * stretches one plank picture from floor to top).
 */
export function tileBoxUVs(geometry, width, height, depth, tile = SURFACE_TILE) {
  const uv = geometry.attributes?.uv;
  if (!uv || uv.count !== 24) return geometry;
  // BoxGeometry's faces, four corners each: +x, -x, +y, -y, +z, -z.
  const faces = [[depth, height], [depth, height], [width, depth], [width, depth], [width, height], [width, height]];
  faces.forEach(([across, up], face) => {
    for (let corner = 0; corner < 4; corner += 1) {
      const index = face * 4 + corner;
      uv.setXY(index, uv.getX(index) * (across / tile), uv.getY(index) * (up / tile));
    }
  });
  uv.needsUpdate = true;
  return geometry;
}

/** Tile a round or turned piece: `around` and `along` are its sizes in world units. */
export function tileRoundUVs(geometry, around, along, tile = SURFACE_TILE) {
  const uv = geometry.attributes?.uv;
  if (!uv) return geometry;
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, uv.getX(index) * (around / tile), uv.getY(index) * (along / tile));
  }
  uv.needsUpdate = true;
  return geometry;
}
