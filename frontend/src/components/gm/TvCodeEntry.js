import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TvCodeEntry.css';

const ALLOWED = /[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]/g;

/** Open on the TV: type the GM's eight-letter TV code. No account needed. */
export default function TvCodeEntry() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [layout, setLayout] = useState('standing-tv');
  const clean = code.toUpperCase().replace(ALLOWED, '').slice(0, 8);
  const go = (event) => {
    event.preventDefault();
    if (clean.length === 8) navigate(`/tv/${clean}${layout === 'virtual-table' ? '?target=virtual-table' : ''}`);
  };
  return (
    <main className="rq-tv-entry" data-testid="tv-code-entry">
      <form onSubmit={go} className="rq-tv-entry__card">
        <h1>Rookie Quest Keeper</h1>
        <p>Show the player display on this screen. Enter the TV code from your GM.</p>
        <label htmlFor="rq-tv-code">TV code</label>
        <input id="rq-tv-code" value={clean} onChange={(event) => setCode(event.target.value)} autoComplete="off"
          autoCapitalize="characters" spellCheck={false} maxLength={8} placeholder="ABCD2345" autoFocus />
        <fieldset className="rq-tv-entry__layout">
          <legend>This screen is a…</legend>
          {[['standing-tv', 'Standing TV', 'On a wall or stand, seen across the room'], ['virtual-table', 'Flat table TV', 'Lying flat under the minis, map first']].map(([id, label, hint]) => (
            <label key={id} className={layout === id ? 'is-selected' : ''}>
              <input type="radio" name="rq-tv-layout" value={id} checked={layout === id} onChange={() => setLayout(id)} data-testid={`tv-layout-${id}`} />
              <strong>{label}</strong><small>{hint}</small>
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={clean.length !== 8}>Show display</button>
      </form>
    </main>
  );
}
