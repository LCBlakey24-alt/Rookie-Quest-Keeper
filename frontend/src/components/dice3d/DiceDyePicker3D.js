import React, { useEffect, useMemo, useRef, useState } from 'react';

import { DICE_DYES } from './diceDyes';
import { createDiceDyeGallery } from './diceDyeGallery';

function DyeButtons({ selectedId, onSelect, fallback = false }) {
  const selectedIndex = Math.max(0, DICE_DYES.findIndex((dye) => dye.id === selectedId));
  return (
    <div className={fallback ? 'rq-floating-dice__swatches' : 'rq-dye-gallery__buttons'}>
      {DICE_DYES.map((dye, index) => (
        <button
          key={dye.id}
          type="button"
          className={fallback ? 'rq-floating-dice__swatch' : 'rq-dye-gallery__option'}
          data-rq-colour-swatch="true"
          data-testid={`dice-dye-${dye.id}`}
          aria-pressed={selectedId === dye.id}
          aria-label={dye.name}
          title={dye.name}
          style={{
            '--swatch-body': dye.body,
            '--swatch-ink': dye.ink,
            '--dye-angle': `${(index - selectedIndex) * (360 / DICE_DYES.length)}deg`,
          }}
          onClick={() => onSelect(dye.id)}
        >
          {fallback ? <span aria-hidden="true">20</span> : <span aria-hidden="true">20</span>}
        </button>
      ))}
    </div>
  );
}

export function DiceDyePickerFallback({ selectedId, onSelect }) {
  return <DyeButtons selectedId={selectedId} onSelect={onSelect} fallback />;
}

export default function DiceDyePicker3D({ selectedId, onSelect, onConfirm }) {
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const galleryRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const pointerStartRef = useRef(null);
  const selectedIndex = useMemo(
    () => Math.max(0, DICE_DYES.findIndex((dye) => dye.id === selectedId)),
    [selectedId],
  );
  const step = (direction) => {
    const index = (selectedIndex + direction + DICE_DYES.length) % DICE_DYES.length;
    onSelect(DICE_DYES[index].id);
  };

  const handleWheel = (event) => {
    if (Math.abs(event.deltaY) < 4 && Math.abs(event.deltaX) < 4) return;
    event.preventDefault();
    step((event.deltaY || event.deltaX) > 0 ? 1 : -1);
  };

  const handlePointerDown = (event) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const distance = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    if (Math.abs(distance) >= 24) step(distance < 0 ? 1 : -1);
  };

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
    gallery.select(selectedId);

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
    <div
      className="rq-dye-gallery"
      ref={frameRef}
      data-testid="dice-dye-gallery-3d"
      tabIndex="0"
      aria-label="Turn the 3D dice style wheel"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { pointerStartRef.current = null; }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          step(1);
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          step(-1);
        }
      }}
    >
      <canvas ref={canvasRef} className="rq-dye-gallery__canvas" aria-hidden="true" />
      <DyeButtons selectedId={selectedId} onSelect={onSelect} />
      <button type="button" className="rq-dye-gallery__name" data-testid="dice-dye-confirm" onClick={onConfirm}>
        <span>CHOOSE STYLE</span>
        <strong>{DICE_DYES.find((dye) => dye.id === selectedId)?.name || 'Dice style'}</strong>
      </button>
    </div>
  );
}

