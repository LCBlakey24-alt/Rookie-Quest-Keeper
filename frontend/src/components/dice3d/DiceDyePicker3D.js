import React, { useEffect, useRef, useState } from 'react';

import { DICE_DYES } from './diceDyes';
import { createDiceDyeGallery } from './diceDyeGallery';

function DyeButtons({ selectedId, onSelect, fallback = false }) {
  return (
    <div className={fallback ? 'rq-floating-dice__swatches' : 'rq-dye-gallery__buttons'}>
      {DICE_DYES.map((dye) => (
        <button
          key={dye.id}
          type="button"
          className={fallback ? 'rq-floating-dice__swatch' : 'rq-dye-gallery__option'}
          data-rq-colour-swatch="true"
          data-testid={`dice-dye-${dye.id}`}
          aria-pressed={selectedId === dye.id}
          aria-label={dye.name}
          title={dye.name}
          style={{ '--swatch-body': dye.body, '--swatch-ink': dye.ink }}
          onClick={() => onSelect(dye.id)}
        >
          {fallback ? <span aria-hidden="true">20</span> : <span>{dye.name}</span>}
        </button>
      ))}
    </div>
  );
}

export function DiceDyePickerFallback({ selectedId, onSelect }) {
  return <DyeButtons selectedId={selectedId} onSelect={onSelect} fallback />;
}

export default function DiceDyePicker3D({ selectedId, onSelect }) {
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const galleryRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return undefined;

    let gallery;
    try {
      gallery = createDiceDyeGallery({ canvas, dyes: DICE_DYES });
    } catch {
      setFailed(true);
      return undefined;
    }
    galleryRef.current = gallery;

    const resize = () => {
      const { width, height } = frame.getBoundingClientRect();
      gallery.resize(width, height);
    };
    resize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observer?.observe(frame);
    window.addEventListener('resize', resize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      gallery.dispose();
      galleryRef.current = null;
    };
  }, []);

  useEffect(() => {
    galleryRef.current?.select(selectedId);
  }, [selectedId]);

  if (failed) return <DiceDyePickerFallback selectedId={selectedId} onSelect={onSelect} />;

  return (
    <div className="rq-dye-gallery" ref={frameRef} data-testid="dice-dye-gallery-3d">
      <canvas ref={canvasRef} className="rq-dye-gallery__canvas" aria-hidden="true" />
      <DyeButtons selectedId={selectedId} onSelect={onSelect} />
    </div>
  );
}

