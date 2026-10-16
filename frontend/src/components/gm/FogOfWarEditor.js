import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, RotateCcw, Undo2 } from 'lucide-react';
import FogMask from '@/components/gm/FogMask';
import VttTacticalLayer from '@/components/gm/VttTacticalLayer';
import VttTokenEditorLayer from '@/components/gm/VttTokenEditorLayer';
import { addFogReveal, normaliseFog } from '@/lib/fogOfWar';
import { gridRows, normaliseTactical, rulerFeet } from '@/lib/vttTacticalOverlay';
import { containedImageBounds } from '@/components/gm/playerDisplayGeometry';

export default function FogOfWarEditor({ mapUrl, fog, onChange, tactical, onTacticalChange, tokens = [], onTokenMove, onTokenVisibilityChange, snap = false, onSnapChange }) {
  const frame = useRef(null);
  const image = useRef(null);
  const [size, setSize] = useState(null);
  const [radius, setRadius] = useState(12);
  const [tool, setTool] = useState('reveal');
  const [measureStart, setMeasureStart] = useState(null);
  const value = normaliseFog(fog);
  const options = normaliseTactical(tactical);
  const imageWidth = image.current?.naturalWidth || 0;
  const imageHeight = image.current?.naturalHeight || 0;
  const measuredFeet = rulerFeet(options, imageWidth, imageHeight);

  const refresh = useCallback(() => {
    const element = frame.current, picture = image.current;
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

  useEffect(() => { setMeasureStart(null); }, [mapUrl]);

  const onMapClick = (event) => {
    if (!mapUrl || !size || !frame.current) return;
    const box = frame.current.getBoundingClientRect();
    const x = 100 * (event.clientX - box.left - size.left) / size.width;
    const y = 100 * (event.clientY - box.top - size.top) / size.height;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    if (tool === 'ruler') {
      if (!measureStart) {
        setMeasureStart({ x, y });
        onTacticalChange({ ...options, ruler: null, showRuler: false });
      } else {
        onTacticalChange({ ...options, ruler: { start: measureStart, end: { x, y } }, showRuler: false });
        setMeasureStart(null);
      }
    } else if (value.enabled) {
      onChange(addFogReveal(value, x, y, radius));
    }
  };

  const button = { minHeight: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#eee5cf', background: '#172c3f', border: '1px solid #a88a52', borderRadius: 5, padding: '5px 10px', cursor: 'pointer' };
  const activeButton = { ...button, background: '#72572a', borderColor: '#f0cd80' };
  return (
    <section data-testid="gm-fog-editor" style={{ display: 'grid', gap: 9, padding: 12, background: '#0b2131', color: '#eee5cf', border: '1px solid #80683e' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div><strong>Battle Map: Fog, Grid & Ruler</strong><p style={{ margin: '3px 0 0', fontSize: 12, color: '#c7bdab' }}>Reveal hidden rooms or measure distances. Only the GM can edit the map.</p></div>
        <button type="button" style={button} disabled={!mapUrl} onClick={() => onChange({ ...value, enabled: !value.enabled })}>
          {value.enabled ? <EyeOff size={15} /> : <Eye size={15} />}{value.enabled ? 'Turn fog off' : 'Cover map'}
        </button>
      </div>
      {mapUrl ? <>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button type="button" style={tool === 'reveal' ? activeButton : button} aria-pressed={tool === 'reveal'} onClick={() => { setTool('reveal'); setMeasureStart(null); }}>Reveal fog</button>
          <button type="button" style={tool === 'ruler' ? activeButton : button} aria-pressed={tool === 'ruler'} onClick={() => { setTool('ruler'); setMeasureStart(null); }}>Distance ruler</button>
          <button type="button" style={options.grid ? activeButton : button} aria-pressed={options.grid} onClick={() => onTacticalChange({ ...options, grid: !options.grid })}>{options.grid ? 'Hide grid' : 'Show grid'}</button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>Squares across
            <input type="number" min="4" max="60" step="1" aria-label="Map grid columns" value={options.columns}
              onChange={e => onTacticalChange({ ...options, columns: Number(e.target.value) })}
              style={{ width: 62, minHeight: 32, padding: 5, background: '#102538', color: '#eee5cf', border: '1px solid #a88a52' }}/>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}><input type="checkbox" aria-label="Snap tokens to grid" checked={snap} onChange={e=>onSnapChange?.(e.target.checked)} /> Snap tokens to grid</label>
          <span style={{ fontSize: 11, color: '#b7c9d5', alignSelf: 'center' }}>5 ft per square · Drag creatures below to move · Double-click to toggle reveal</span>
        </div>
        <div ref={frame} data-testid="gm-fog-preview" onClick={onMapClick} role="img"
          aria-label={tool === 'ruler' ? 'Map: click a start and end point to measure distance' : 'Map: click to reveal fog-covered areas'}
          style={{ height: 'clamp(190px, 33vh, 420px)', position: 'relative', display: 'grid', placeItems: 'center', overflow: 'hidden', background: '#02090e', border: '1px solid #5e583c', cursor: tool === 'ruler' || value.enabled ? 'crosshair' : 'default' }}>
          <img ref={image} src={mapUrl} alt="Battle map preview" onLoad={refresh} onError={() => setSize(null)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          {size && <div style={{ position: 'absolute', left: size.left, top: size.top, width: size.width, height: size.height, pointerEvents: 'none' }}>
            <VttTacticalLayer tactical={options} width={imageWidth} height={imageHeight} layer="grid" editor />
            <FogMask fog={value} editor />
            <VttTacticalLayer tactical={options} width={imageWidth} height={imageHeight} layer="ruler" editor />
            <VttTokenEditorLayer tokens={tokens} onTokenMove={onTokenMove} onTokenVisibilityChange={onTokenVisibilityChange} snap={snap} columns={options.columns} imageWidth={imageWidth} imageHeight={imageHeight} />
            {measureStart && <span style={{ position: 'absolute', left: measureStart.x+'%', top: measureStart.y+'%', width: 9, height: 9, background: '#f5d182', borderRadius: '50%', border: '2px solid #0a121a', transform: 'translate(-50%,-50%)' }} />}
          </div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          {tool === 'reveal' ? <>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12 }}>Reveal size
              <select aria-label="Fog reveal radius" value={radius} onChange={event => setRadius(Number(event.target.value))} style={{ color: '#eee5cf', background: '#102538', padding: 6 }}>
                <option value={6}>Small</option><option value={12}>Medium</option><option value={22}>Large</option>
              </select>
            </label>
            <button type="button" style={button} disabled={!value.reveals.length} onClick={() => onChange({ ...value, reveals: value.reveals.slice(0, -1) })}><Undo2 size={14} /> Undo reveal</button>
            <button type="button" style={button} disabled={!value.reveals.length} onClick={() => onChange({ enabled: true, reveals: [] })}><RotateCcw size={14} /> Reset to covered</button>
          </> : <>
            <span style={{ fontSize: 12 }}>{measureStart ? 'Now click the end point' : 'Click two points to measure'}</span>
            <strong style={{ fontSize: 13 }}>{measuredFeet == null ? 'No distance yet' : `About ${measuredFeet} ft`}</strong>
            <button type="button" style={button} disabled={!options.ruler} onClick={() => onTacticalChange({ ...options, showRuler: !options.showRuler })}>{options.showRuler ? 'Hide ruler from players' : 'Show ruler to players'}</button>
            <button type="button" style={button} disabled={!options.ruler && !measureStart} onClick={() => { setMeasureStart(null); onTacticalChange({ ...options, ruler: null, showRuler: false }); }}>Clear ruler</button>
          </>}
        </div>
        <p style={{ color: '#b7c9d5', fontSize: 12, margin: 0 }}>
          {value.enabled ? `${value.reveals.length} fog reveal(s)` : 'Fog off'} · Grid {options.grid ? 'on' : 'off'} ({options.columns} × {gridRows(options.columns,imageWidth,imageHeight)} squares) · Automatically saved for each map
        </p>
      </> : <p style={{ fontSize: 12, margin: 0 }}>Choose or upload a saved map above to prepare its fog, grid and ruler.</p>}
    </section>
  );
}
