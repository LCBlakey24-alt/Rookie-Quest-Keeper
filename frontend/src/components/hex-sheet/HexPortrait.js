import React, { useState } from 'react';

/**
 * A pointed-top hexagonal portrait. The image is cropped by the frame and
 * keeps its proportions (object-fit: cover); a thin orange rim is the
 * frame itself. Without artwork, or if the image fails to load, the
 * character's initials stand in.
 */
export default function HexPortrait({ url, name, onOpen, size = 'small' }) {
  const [failed, setFailed] = useState(false);
  const initials = String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('') || '?';
  const showImage = url && !failed;
  const content = (
    <span className="hex-portrait__frame">
      <span className="hex-portrait__inner">
        {showImage
          ? <img src={url} alt="" onError={() => setFailed(true)} />
          : <span className="hex-portrait__initials" aria-hidden="true">{initials}</span>}
      </span>
    </span>
  );
  if (!onOpen) return <span className={`hex-portrait hex-portrait--${size}`}>{content}</span>;
  return (
    <button type="button" className={`hex-portrait hex-portrait--${size}`} onClick={onOpen} aria-label={`Open ${name || 'character'} portrait`} data-testid="hex-portrait">
      {content}
    </button>
  );
}
