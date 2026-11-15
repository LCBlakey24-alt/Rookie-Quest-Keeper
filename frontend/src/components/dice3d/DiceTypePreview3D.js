import React, { useEffect, useRef, useState } from 'react';

import { DICE_DYES } from './diceDyes';
import { createDiceDyeGallery } from './diceDyeGallery';

export default function DiceTypePreview3D({ sides, dyeId }) {
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const dye = DICE_DYES.find((candidate) => candidate.id === dyeId) || DICE_DYES[0];
    if (!frame || !canvas || !dye) return undefined;

    let preview;
    try {
      preview = createDiceDyeGallery({ canvas, dyes: [dye], sides, layout: 'single' });
      preview.select(dye.id);
    } catch {
      setFailed(true);
      return undefined;
    }

    const resize = () => {
      const { width, height } = frame.getBoundingClientRect();
      preview.resize(width, height);
    };
    resize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observer?.observe(frame);
    window.addEventListener('resize', resize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      preview.dispose();
    };
  }, [dyeId, sides]);

  return (
    <div className="rq-die-type-preview" ref={frameRef} aria-hidden="true">
      {!failed && <canvas ref={canvasRef} />}
      {failed && <span>d{sides}</span>}
    </div>
  );
}
