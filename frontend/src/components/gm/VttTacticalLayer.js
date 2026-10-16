import React, { useId } from 'react';
import { gridRows, normaliseTactical, rulerFeet } from '@/lib/vttTacticalOverlay';

// A transparent overlay aligned to the FITTED map only. No clicks or GM controls
// travel to the player screen; its public data contains geometry alone.
export default function VttTacticalLayer({ tactical, width, height, editor = false, layer = 'grid' }) {
  const settings = normaliseTactical(tactical);
  const rows = gridRows(settings.columns, width, height);
  const drawGrid = layer === 'grid' && settings.grid;
  const drawRuler = layer === 'ruler' && settings.ruler && (editor || settings.showRuler);
  const id = useId().replace(/:/g, '_');
  if (!drawGrid && !drawRuler) return null;
  const feet = drawRuler ? rulerFeet(settings, width, height) : null;
  return (
    <svg data-testid={drawGrid ? 'vtt-grid-layer' : 'vtt-ruler-layer'} viewBox="0 0 100 100"
      preserveAspectRatio="none" aria-hidden="true"
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: drawGrid ? 2 : 6, overflow: 'visible' }}>
      {drawGrid && <>
        {Array.from({ length: settings.columns - 1 }, (_, i) =>
          <line key={`v${i}`} x1={(i + 1) * 100 / settings.columns} y1="0" x2={(i + 1) * 100 / settings.columns} y2="100" stroke="rgba(250,230,178,.46)" strokeWidth=".13" />
        )}
        {Array.from({ length: rows - 1 }, (_, i) =>
          <line key={`h${i}`} x1="0" y1={(i + 1) * 100 / rows} x2="100" y2={(i + 1) * 100 / rows} stroke="rgba(250,230,178,.46)" strokeWidth=".13" />
        )}
      </>}
      {drawRuler && <>
        <line x1={settings.ruler.start.x} y1={settings.ruler.start.y} x2={settings.ruler.end.x} y2={settings.ruler.end.y} stroke="#131313" strokeWidth="1.3" strokeLinecap="round"/>
        <line x1={settings.ruler.start.x} y1={settings.ruler.start.y} x2={settings.ruler.end.x} y2={settings.ruler.end.y} stroke="#ffdc85" strokeWidth=".65" strokeDasharray="1.6 .8" strokeLinecap="round" />
        <circle cx={settings.ruler.start.x} cy={settings.ruler.start.y} r=".95" fill="#ffd173" stroke="#121212" strokeWidth=".4" />
        <circle cx={settings.ruler.end.x} cy={settings.ruler.end.y} r=".95" fill="#ffd173" stroke="#121212" strokeWidth=".4" />
        <g transform={`translate(${Math.min(87,Math.max(10,(settings.ruler.start.x+settings.ruler.end.x)/2))},${Math.min(96,Math.max(8,(settings.ruler.start.y+settings.ruler.end.y)/2))})`}>
          <rect x="-9" y="-5.5" width="18" height="8.5" rx="1.5" fill="#0a1b2f" stroke="#f0c46d" strokeWidth=".35" />
          <text x="0" y=".3" fill="#ffecbd" textAnchor="middle" fontSize="3.8" fontWeight="bold">{`~${feet} ft`}</text>
        </g>
      </>}
    </svg>
  );
}
