import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, RotateCcw, Undo2 } from 'lucide-react';
import FogMask from '@/components/gm/FogMask';
import { addFogReveal, normaliseFog } from '@/lib/fogOfWar';
import { containedImageBounds } from '@/components/gm/playerDisplayGeometry';

export default function FogOfWarEditor({ mapUrl, fog, onChange }) {
  const frame = useRef(null);
  const image = useRef(null);
  const [size, setSize] = useState(null);
  const [radius, setRadius] = useState(12);
  const value = normaliseFog(fog);
  const refresh = useCallback(() => {
    const element = frame.current;
    const picture = image.current;
    setSize(element && picture ? containedImageBounds(element.clientWidth, element.clientHeight, picture.naturalWidth, picture.naturalHeight) : null);
  }, []);
  useEffect(() => {
    refresh();
    const element = frame.current;
    if (!element) return undefined;
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(refresh);
      observer.observe(element);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', refresh);
    return () => window.removeEventListener('resize', refresh);
  }, [refresh, mapUrl]);

  const revealAt = (event) => {
    if (!mapUrl || !value.enabled || !size || !frame.current) return;
    const box = frame.current.getBoundingClientRect();
    const x = 100 * (event.clientX - box.left - size.left) / size.width;
    const y = 100 * (event.clientY - box.top - size.top) / size.height;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    onChange(addFogReveal(value, x, y, radius));
  };

  const button = { minHeight: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#eee5cf', background: '#172c3f', border: '1px solid #a88a52', borderRadius: 5, padding: '5px 10px', cursor: 'pointer' };
  return (
    <section data-testid="gm-fog-editor" style={{ display: 'grid', gap: 9, padding: 12, background: '#0b2131', color: '#eee5cf', border: '1px solid #80683e' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div><strong>Fog of War</strong><p style={{ margin: '3px 0 0', fontSize: 12, color: '#c7bdab' }}>Cover the player map, then click rooms to reveal them. Only the GM can edit the fog.</p></div>
        <button type="button" style={button} disabled={!mapUrl} onClick={() => onChange({ ...value, enabled: !value.enabled })}>
          {value.enabled ? <EyeOff size={15} /> : <Eye size={15} />}{value.enabled ? 'Turn fog off' : 'Cover map'}
        </button>
      </div>
      {mapUrl ? (
        <>
          <div ref={frame} data-testid="gm-fog-preview" onClick={revealAt} role={value.enabled ? 'button' : 'img'} tabIndex={value.enabled ? 0 : -1}
            aria-label={value.enabled ? 'Click the map to reveal an area' : 'Map preview with fog disabled'}
            style={{ height: 'clamp(190px, 33vh, 420px)', position: 'relative', display: 'grid', placeItems: 'center', overflow: 'hidden', background: '#02090e', border: '1px solid #5e583c', cursor: value.enabled ? 'crosshair' : 'default' }}>
            <img ref={image} src={mapUrl} alt="Fog editor map" onLoad={refresh} onError={() => setSize(null)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            {size && <div style={{ position: 'absolute', left: size.left, top: size.top, width: size.width, height: size.height, pointerEvents: 'none' }}><FogMask fog={value} editor /></div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 9 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12 }}>Reveal size
              <select aria-label="Fog reveal radius" value={radius} onChange={event => setRadius(Number(event.target.value))} style={{ color: '#eee5cf', background: '#102538', padding: 6 }}>
                <option value={6}>Small</option><option value={12}>Medium</option><option value={22}>Large</option>
              </select>
            </label>
            <button type="button" style={button} disabled={!value.reveals.length} onClick={() => onChange({ ...value, reveals: value.reveals.slice(0, -1) })}><Undo2 size={14} /> Undo reveal</button>
            <button type="button" style={button} disabled={!value.reveals.length} onClick={() => onChange({ enabled: true, reveals: [] })}><RotateCcw size={14} /> Reset to covered</button>
            <span style={{ fontSize: 12, color: '#b7c9d5' }}>{value.enabled ? `${value.reveals.length} revealed area(s)` : 'All areas visible'} · Automatically saved per map</span>
          </div>
        </>
      ) : <p style={{ fontSize: 12, margin: 0 }}>Choose or upload a saved map above to prepare its fog.</p>}
    </section>
  );
}
