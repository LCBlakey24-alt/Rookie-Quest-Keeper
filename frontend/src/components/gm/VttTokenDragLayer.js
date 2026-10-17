import React, { useRef, useState } from 'react';
import { snapTokenPercent } from '@/lib/vttTokenGeometry';
import { gridRows } from '@/lib/vttTacticalOverlay';

// GM-only. The audience window gets normalised, read-only creature coordinates.
export default function VttTokenDragLayer({ tokens = [], onTokenMove, snap = false, columns = 24, imageWidth, imageHeight }) {
  const area = useRef(null);
  const active = useRef(null);
  const [preview, setPreview] = useState({});
  const rows = gridRows(columns, imageWidth, imageHeight);

  const position = (event) => {
    const rect = area.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return null;
    return snapTokenPercent((event.clientX - rect.left) * 100 / rect.width,
      (event.clientY - rect.top) * 100 / rect.height, columns, rows, snap);
  };
  const begin = (event, token) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    active.current = { id: String(token.id || token.name), pointerId: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const move = (event) => {
    if (!active.current || active.current.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const point = position(event);
    if (point) setPreview(previous => ({ ...previous, [active.current.id]: point }));
  };
  const end = (event, cancelled = false) => {
    const item = active.current;
    if (!item || item.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const point = !cancelled ? position(event) : null;
    active.current = null;
    setPreview(previous => {
      const next = { ...previous };
      delete next[item.id];
      return next;
    });
    if (point && onTokenMove) onTokenMove(item.id, point.x, point.y);
  };

  return (
    <div ref={area} data-testid="gm-draggable-tokens" style={{ position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none' }}>
      {tokens.slice(0, 40).map((token, index) => {
        const id = String(token.id || token.name || index);
        const mapped = preview[id] || (Number(token.x) || Number(token.y)
          ? { x: Number(token.x), y: Number(token.y) }
          : { x: 9 + (index % 11) * 7.2, y: 12 + Math.floor(index / 11) * 8 });
        return <button type="button" key={id} title={`Drag ${token.name || 'creature'} to reposition`}
          aria-label={`Drag ${token.name || 'creature'} on the GM map`}
          onPointerDown={event => begin(event, token)}
          onPointerMove={move}
          onPointerUp={event => end(event)}
          onPointerCancel={event => end(event, true)}
          onClick={event => event.stopPropagation()}
          style={{
            position: 'absolute', left: mapped.x+'%', top: mapped.y+'%', transform: 'translate(-50%,-50%)',
            width: 36, height: 36, borderRadius: '50%', padding: 2, overflow: 'hidden',
            background: '#0e2944', color: '#ffefcb', border: '2px solid #f5d184',
            fontSize: 14, fontWeight: 850, cursor: 'grab', touchAction: 'none', pointerEvents: 'auto',
            display: 'grid', placeItems: 'center', userSelect: 'none', boxShadow: '0 1px 6px #000',
          }}>
          {token.image_url ? <img src={token.image_url} alt="" draggable="false" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', pointerEvents: 'none' }} />
            : String(token.name || '?').slice(0, 1).toUpperCase()}
        </button>;
      })}
    </div>
  );
}
