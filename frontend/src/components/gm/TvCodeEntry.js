import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TvCodeEntry.css';

const ALLOWED = /[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]/g;

/** Open on the TV: type the GM's eight-letter TV code. No account needed. */
export default function TvCodeEntry() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const clean = code.toUpperCase().replace(ALLOWED, '').slice(0, 8);
  const go = (event) => {
    event.preventDefault();
    if (clean.length === 8) navigate(`/tv/${clean}`);
  };
  return (
    <main className="rq-tv-entry" data-testid="tv-code-entry">
      <form onSubmit={go} className="rq-tv-entry__card">
        <h1>Rookie Quest Keeper</h1>
        <p>Show the player display on this screen. Enter the TV code from your GM.</p>
        <label htmlFor="rq-tv-code">TV code</label>
        <input id="rq-tv-code" value={clean} onChange={(event) => setCode(event.target.value)} autoComplete="off"
          autoCapitalize="characters" spellCheck={false} maxLength={8} placeholder="ABCD2345" autoFocus />
        <button type="submit" disabled={clean.length !== 8}>Show display</button>
      </form>
    </main>
  );
}
