import React, { useEffect, useMemo, useRef } from 'react';
import {
  GENERIC_COMBAT_TERRAINS,
  getGenericCombatTerrainImage,
} from '@/data/genericCombatTerrain';

const SIZE = 20; // Pixels per cell in the backing canvas, CSS scales the map.
const TERRAINS = new Set(GENERIC_COMBAT_TERRAINS.map(item => item.id));
const COLOURS = Object.fromEntries(GENERIC_COMBAT_TERRAINS.map(item => [item.id, item.color]));
COLOURS.empty = '#1a1b2c';
COLOURS.void = '#080b11';

function safeTerrain(value) {
  return typeof value === 'string' && (TERRAINS.has(value) || value === 'empty' || value === 'void')
    ? value : 'empty';
}

/** Public floor only. Walls, doors, objects, fog and GM notes are never sent. */
export default function PublicTerrainGridCanvas({ terrainGrid = [], columns = 30, rows = 20, style }) {
  const canvasRef = useRef(null);
  const cols = Math.max(1, Math.min(100, Math.floor(Number(columns) || 30)));
  const rowCount = Math.max(1, Math.min(100, Math.floor(Number(rows) || 20)));
  const signature = useMemo(() => JSON.stringify(terrainGrid), [terrainGrid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let ctx;
    try { ctx = canvas.getContext('2d'); } catch { return undefined; }
    if (!ctx) return undefined;
    canvas.width = cols * SIZE;
    canvas.height = rowCount * SIZE;

    let cancelled = false;
    const rowsData = Array.isArray(terrainGrid) ? terrainGrid : [];
    const referenced = new Set();
    for (let y = 0; y < Math.min(rowCount, rowsData.length); y += 1) {
      const row = Array.isArray(rowsData[y]) ? rowsData[y] : [];
      for (let x = 0; x < Math.min(cols, row.length); x += 1) {
        const value = safeTerrain(row[x]);
        if (TERRAINS.has(value)) referenced.add(value);
      }
    }
    const images = {};

    function draw() {
      if (cancelled) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const patterns = {};
      for (const [id, image] of Object.entries(images)) {
        const pattern = ctx.createPattern(image, 'repeat');
        if (pattern && typeof pattern.setTransform === 'function' && typeof DOMMatrix !== 'undefined') {
          pattern.setTransform(new DOMMatrix().scale(SIZE / 40));
        }
        patterns[id] = pattern;
      }
      for (let y = 0; y < rowCount; y += 1) {
        const row = Array.isArray(rowsData[y]) ? rowsData[y] : [];
        for (let x = 0; x < cols; x += 1) {
          const id = safeTerrain(row[x]);
          ctx.fillStyle = patterns[id] || COLOURS[id];
          ctx.fillRect(x * SIZE, y * SIZE, SIZE, SIZE);
        }
      }
      ctx.strokeStyle = 'rgba(5,15,20,.25)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= cols; x += 1) {
        ctx.beginPath();
        ctx.moveTo(x * SIZE, 0);
        ctx.lineTo(x * SIZE, rowCount * SIZE);
        ctx.stroke();
      }
      for (let y = 0; y <= rowCount; y += 1) {
        ctx.beginPath();
        ctx.moveTo(0, y * SIZE);
        ctx.lineTo(cols * SIZE, y * SIZE);
        ctx.stroke();
      }
    }

    draw(); // A safe flat-colour fallback while local SVG artwork decodes.
    referenced.forEach(id => {
      const image = new window.Image();
      image.onload = () => { if (!cancelled) { images[id] = image; draw(); } };
      image.onerror = () => { if (!cancelled) draw(); };
      image.src = getGenericCombatTerrainImage(id);
    });
    return () => { cancelled = true; };
  }, [cols, rowCount, signature]); // Stable across combat token moves when floor IDs are unchanged.

  return <canvas ref={canvasRef} data-testid="public-terrain-grid"
    aria-label="Battlefield terrain map" role="img"
    style={{ display: 'block', pointerEvents: 'none', width: '100%', height: '100%', ...style }} />;
}
