import React, { useEffect, useMemo, useState } from 'react';

import GuildChoiceWheel from '@/components/guild-motif/GuildChoiceWheel';
import { DICE_DYES } from './diceDyes';
import { createDiceDyeGallery } from './diceDyeGallery';

// Keep the wheel usable on devices without WebGL. The normal preview is a
// captured image of the real 3D die, rendered using ONE temporary GPU context.
function fallbackDieImage(dye) {
  const artwork = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <polygon points="50,4 91,26 91,74 50,96 9,74 9,26" fill="${dye.edge}" stroke="${dye.edge}" stroke-width="3"/>
    <polygon points="50,12 82,29 82,69 50,89 18,69 18,29" fill="${dye.body}"/>
    <path d="M50 12 L50 89 M18 29 L82 69 M82 29 L18 69" fill="none" stroke="${dye.edge}" stroke-width="3" opacity=".65"/>
    <text x="50" y="55" text-anchor="middle" fill="${dye.ink}" font-family="Arial,sans-serif" font-size="28" font-weight="bold">20</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(artwork)}`;
}
const FALLBACK_IMAGES = Object.fromEntries(DICE_DYES.map(dye => [dye.id, fallbackDieImage(dye)]));

export default function DiceDyePicker3D({ selectedId, onSelect, onConfirm }) {
  const [previews, setPreviews] = useState(FALLBACK_IMAGES);
  const options = useMemo(() => DICE_DYES.map((dye) => ({
    id: dye.id,
    label: dye.name,
    short: dye.name.split(' ')[0],
    testId: `dice-dye-${dye.id}`,
    image: previews[dye.id],
  })), [previews]);

  useEffect(() => {
    let cancelled = false;
    let gallery;
    let idleId;
    let fallbackTimer;
    // Always paint the lightweight, interactive wheel FIRST. Creating nine
    // atlas textures and reading WebGL pixels synchronously during mount can
    // stall touch handling or lose the renderer on Android/PWA devices.
    const capturePreviews = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        // One short-lived GPU context for the entire set; never nine.
        gallery = createDiceDyeGallery({
          canvas, dyes: DICE_DYES, sides: 20, layout: 'single', snapshot: true,
        });
        gallery.resize(136, 136);
        const images = {};
        DICE_DYES.forEach((dye) => {
          gallery.select(dye.id);
          const data = canvas.toDataURL('image/png');
          images[dye.id] = data && data.startsWith('data:image/png') ? data : FALLBACK_IMAGES[dye.id];
        });
        if (!cancelled) setPreviews(images);
      } catch {
        // SVG dice remain selectable, even if WebGL context creation fails.
      } finally {
        gallery?.dispose();
        gallery = null;
      }
    };
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(capturePreviews, { timeout: 1800 });
    } else {
      // Defer until after the opening paint when requestIdleCallback is absent.
      fallbackTimer = window.setTimeout(capturePreviews, 100);
    }
    return () => {
      cancelled = true;
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      gallery?.dispose();
    };
  }, []);

  return (
    <div className="rq-dice-style-wheel" data-testid="dice-dye-gallery-3d">
      <GuildChoiceWheel
        options={options}
        value={selectedId}
        onChange={onSelect}
        onConfirm={onConfirm}
        label="Choose the 3D dice material"
        caption="DICE STYLE"
        confirmLabel="CHOOSE"
        confirmAria="Choose dice style"
        confirmTestId="dice-dye-confirm"
        maxFlickVelocity={0.22}
      />
    </div>
  );
}
