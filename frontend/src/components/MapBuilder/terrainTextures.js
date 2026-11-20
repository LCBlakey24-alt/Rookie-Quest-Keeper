/**
 * Painted textures for battle map terrain: grass with blades and the odd
 * flower, stone slabs with mortar, cobbles, wooden planks with grain,
 * rippling water and so on, instead of flat colour squares.
 *
 * Each terrain is one square tile drawn once with a seeded random generator
 * (so it never shimmers between redraws) and cached. Features that cross the
 * tile's edge are drawn again on the other side, so the tile repeats
 * seamlessly: a field of grass squares reads as one field.
 */

export const TILE_SIZE = 160; // pixels, about four squares at the default zoom

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (random, list) => list[Math.floor(random() * list.length) % list.length];

/** Draw `paint(x, y)` at a point and again wherever it would cross an edge. */
function wrapped(x, y, reach, paint, size = TILE_SIZE) {
  for (const dx of [-size, 0, size]) {
    for (const dy of [-size, 0, size]) {
      const px = x + dx;
      const py = y + dy;
      if (px > -reach && px < size + reach && py > -reach && py < size + reach) paint(px, py);
    }
  }
}

function blotches(ctx, random, colours, count, minR, maxR, alpha) {
  for (let i = 0; i < count; i += 1) {
    const r = minR + random() * (maxR - minR);
    const colour = pick(random, colours);
    const squash = 0.6 + random() * 0.4;
    const turn = random() * Math.PI;
    wrapped(random() * TILE_SIZE, random() * TILE_SIZE, r, (x, y) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * squash, turn, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.globalAlpha = 1;
}

function speckles(ctx, random, colours, count, size = 1.6, alpha = 0.55) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i += 1) {
    ctx.fillStyle = pick(random, colours);
    ctx.fillRect(random() * TILE_SIZE, random() * TILE_SIZE, size, size);
  }
  ctx.globalAlpha = 1;
}

const PAINTERS = {
  grass(ctx, random) {
    ctx.fillStyle = '#3d7a2c';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    blotches(ctx, random, ['#2f6524', '#4c9036', '#356f27'], 26, 10, 26, 0.35);
    ctx.lineCap = 'round';
    for (let i = 0; i < 520; i += 1) {
      const length = 3 + random() * 5;
      const lean = (random() - 0.5) * 3;
      const colour = pick(random, ['#5aa83a', '#2c6020', '#78c04f', '#4a9632', '#3b7d2a']);
      wrapped(random() * TILE_SIZE, random() * TILE_SIZE, 8, (x, y) => {
        ctx.strokeStyle = colour;
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + lean, y - length);
        ctx.stroke();
      });
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 7; i += 1) {
      const colour = pick(random, ['#f4e36b', '#ffffff', '#e8a0d8']);
      wrapped(random() * TILE_SIZE, random() * TILE_SIZE, 3, (x, y) => {
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  },

  stone(ctx, random) {
    ctx.fillStyle = '#3a3b42';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    const rows = 4;
    const height = TILE_SIZE / rows;
    for (let row = 0; row < rows; row += 1) {
      const offset = row % 2 ? height * 0.6 : 0;
      for (let x = -offset; x < TILE_SIZE; x += height * 1.2) {
        const shade = 88 + Math.floor(random() * 22);
        ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 10})`;
        const w = height * 1.2 - 3;
        const y = row * height + 1.5;
        wrapped(x + 1.5, y, w, (px, py) => ctx.fillRect(px, py, w, height - 3));
      }
    }
    blotches(ctx, random, ['#6f717b', '#4e5059'], 30, 4, 12, 0.18);
    speckles(ctx, random, ['#9a9ca6', '#2c2d33'], 260, 1.4, 0.45);
  },

  cobblestone(ctx, random) {
    ctx.fillStyle = '#34353b';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    const step = TILE_SIZE / 8;
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const cx = col * step + step / 2 + (row % 2 ? step / 2 : 0) + (random() - 0.5) * 3;
        const cy = row * step + step / 2 + (random() - 0.5) * 3;
        const rx = step * (0.38 + random() * 0.08);
        const ry = step * (0.34 + random() * 0.08);
        const shade = 92 + Math.floor(random() * 30);
        const turn = random() * Math.PI;
        wrapped(cx, cy, step, (x, y) => {
          ctx.fillStyle = `rgb(${shade}, ${shade - 2}, ${shade + 4})`;
          ctx.beginPath();
          ctx.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.13)';
          ctx.beginPath();
          ctx.ellipse(x - rx * 0.25, y - ry * 0.3, rx * 0.5, ry * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }
  },

  wood(ctx, random) {
    const plank = TILE_SIZE / 8;
    for (let row = 0; row < 8; row += 1) {
      const y = row * plank;
      const tone = pick(random, ['#8a5a2b', '#7d4f24', '#946233', '#835528']);
      ctx.fillStyle = tone;
      ctx.fillRect(0, y, TILE_SIZE, plank);
      ctx.strokeStyle = 'rgba(60, 32, 12, 0.35)';
      ctx.lineWidth = 0.8;
      for (let g = 0; g < 4; g += 1) {
        const gy = y + 2 + random() * (plank - 4);
        ctx.beginPath();
        ctx.moveTo(0, gy);
        for (let x = 0; x <= TILE_SIZE; x += 16) ctx.lineTo(x, gy + Math.sin(x / 13 + g) * 0.8);
        ctx.stroke();
      }
      // Plank ends, staggered.
      const end = (row * 53) % TILE_SIZE;
      ctx.fillStyle = 'rgba(40, 20, 6, 0.75)';
      ctx.fillRect(end, y, 1.5, plank);
      if (random() < 0.5) {
        ctx.fillStyle = 'rgba(70, 38, 14, 0.7)';
        ctx.beginPath();
        ctx.ellipse(random() * TILE_SIZE, y + plank / 2, 2.6, 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(40, 20, 6, 0.85)';
      ctx.fillRect(0, y + plank - 1.2, TILE_SIZE, 1.2);
    }
  },

  water(ctx, random) {
    ctx.fillStyle = '#1f5d8c';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    blotches(ctx, random, ['#1a4f78', '#2a74a8'], 20, 14, 30, 0.35);
    ctx.lineCap = 'round';
    for (let i = 0; i < 26; i += 1) {
      const length = 10 + random() * 18;
      wrapped(random() * TILE_SIZE, random() * TILE_SIZE, length + 4, (x, y) => {
        ctx.strokeStyle = 'rgba(190, 228, 255, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + length / 2, y - 3, x + length, y);
        ctx.stroke();
      });
    }
    speckles(ctx, random, ['#d8f1ff'], 30, 1.4, 0.6);
  },

  sand(ctx, random) {
    ctx.fillStyle = '#d6b479';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    blotches(ctx, random, ['#c9a466', '#e2c48f'], 24, 10, 24, 0.35);
    ctx.strokeStyle = 'rgba(160, 120, 60, 0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i += 1) {
      const y = random() * TILE_SIZE;
      ctx.beginPath();
      for (let x = 0; x <= TILE_SIZE; x += 8) ctx.lineTo(x, y + Math.sin(x / 11 + i) * 2);
      ctx.stroke();
    }
    speckles(ctx, random, ['#9c7a45', '#f3e2bd'], 420, 1.2, 0.5);
  },

  dirt(ctx, random) {
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    blotches(ctx, random, ['#664a2e', '#8b6a47', '#5c4228'], 34, 6, 18, 0.4);
    for (let i = 0; i < 26; i += 1) {
      const shade = pick(random, ['#9b8a74', '#5a5048', '#b0a08a']);
      const [rx, ry, turn] = [2 + random() * 2, 1.5 + random() * 1.5, random() * Math.PI];
      wrapped(random() * TILE_SIZE, random() * TILE_SIZE, 4, (x, y) => {
        ctx.fillStyle = shade;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    speckles(ctx, random, ['#3f2c1a', '#a2825c'], 300, 1.3, 0.45);
  },

  mud(ctx, random) {
    ctx.fillStyle = '#4a3a2b';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    blotches(ctx, random, ['#3b2d21', '#58463a'], 26, 8, 20, 0.45);
    for (let i = 0; i < 8; i += 1) {
      const rx = 6 + random() * 12;
      wrapped(random() * TILE_SIZE, random() * TILE_SIZE, rx + 2, (x, y) => {
        ctx.fillStyle = 'rgba(95, 78, 62, 0.85)';
        ctx.beginPath();
        ctx.ellipse(x, y, rx, rx * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(210, 190, 160, 0.18)';
        ctx.beginPath();
        ctx.ellipse(x - rx * 0.3, y - rx * 0.15, rx * 0.4, rx * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  },

  snow(ctx, random) {
    ctx.fillStyle = '#e8edf3';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    blotches(ctx, random, ['#cfd8e4', '#f7f9fc', '#d9e2ee'], 30, 10, 26, 0.5);
    speckles(ctx, random, ['#ffffff'], 140, 1.6, 0.9);
    speckles(ctx, random, ['#aebccd'], 90, 1.2, 0.5);
  },

  lava(ctx, random) {
    ctx.fillStyle = '#2a0d07';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    blotches(ctx, random, ['#3d130a', '#1c0804'], 22, 10, 24, 0.6);
    ctx.lineCap = 'round';
    for (let i = 0; i < 18; i += 1) {
      const points = [[random() * TILE_SIZE, random() * TILE_SIZE]];
      for (let s = 0; s < 4; s += 1) {
        const [lx, ly] = points[points.length - 1];
        points.push([lx + (random() - 0.5) * 26, ly + (random() - 0.5) * 26]);
      }
      const glow = pick(random, ['#ff6a1a', '#ffb347', '#ff3d0f']);
      const width = 1.5 + random() * 2;
      const [sx, sy] = points[0];
      wrapped(sx, sy, 60, (x, y) => {
        ctx.strokeStyle = glow;
        ctx.lineWidth = width;
        ctx.shadowColor = glow;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        points.forEach(([px, py], index) => {
          const method = index ? 'lineTo' : 'moveTo';
          ctx[method](px - sx + x, py - sy + y);
        });
        ctx.stroke();
      });
    }
    ctx.shadowBlur = 0;
  },

  void(ctx) {
    const gradient = ctx.createRadialGradient(TILE_SIZE / 2, TILE_SIZE / 2, 4, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE * 0.7);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(1, '#0d0b14');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  },
};

export const TEXTURED_TERRAIN = Object.keys(PAINTERS);

const cache = new Map();

/**
 * The texture tile for a terrain, or null (no texture for 'empty', or no
 * canvas available, e.g. in tests). `makeCanvas` is injectable for tests.
 */
export function terrainTile(type, makeCanvas = () => (typeof document !== 'undefined' ? document.createElement('canvas') : null)) {
  if (!PAINTERS[type]) return null;
  if (cache.has(type)) return cache.get(type);
  const canvas = makeCanvas();
  const ctx = canvas?.getContext?.('2d');
  if (!ctx) return null;
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  // A fixed seed per terrain: the same field looks the same every redraw.
  const seed = [...type].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
  PAINTERS[type](ctx, seeded(seed));
  cache.set(type, canvas);
  return canvas;
}

/** A repeating pattern for a terrain on `ctx`, scaled to the grid, or null. */
export function terrainPattern(ctx, type, gridSize = 40, patterns = new Map()) {
  if (patterns.has(type)) return patterns.get(type);
  const tile = terrainTile(type);
  let pattern = null;
  if (tile && typeof ctx.createPattern === 'function') {
    pattern = ctx.createPattern(tile, 'repeat');
    if (pattern && typeof pattern.setTransform === 'function' && typeof DOMMatrix !== 'undefined') {
      pattern.setTransform(new DOMMatrix().scale(gridSize / 40));
    }
  }
  patterns.set(type, pattern);
  return pattern;
}

const swatches = new Map();

/** A CSS background for a terrain swatch (the texture), or the fallback colour. */
export function terrainSwatch(type, fallback) {
  if (swatches.has(type)) return swatches.get(type);
  let background = fallback;
  try {
    const tile = terrainTile(type);
    const url = tile?.toDataURL?.('image/png');
    if (url && url.startsWith('data:image/png')) background = `${fallback} url(${url}) center / 64px 64px`;
  } catch (error) {
    background = fallback;
  }
  swatches.set(type, background);
  return background;
}
