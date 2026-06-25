import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Castle, Crown, Map, ScrollText, Shield, Sparkles, Users } from 'lucide-react';
import { toast } from 'sonner';

import { TIA_KARTA_PROTOTYPE, loadTiaKartaGmNotes, saveTiaKartaGmNotes } from '@/data/tiaKartaPrototype';
import './TiaKartaGmPrototype.css';

const sections = [
  ['overview', 'Overview', Crown],
  ['gods', 'Gods', Sparkles],
  ['places', 'Places', Map],
  ['factions', 'Factions', Users],
  ['hooks', 'Hooks', ScrollText],
  ['rebuild', 'Rebuild', Castle],
  ['notes', 'GM Notes', BookOpen],
];

function CardList({ items, render }) {
  return <div className="tia-gm-card-grid">{items.map((item, index) => render(item, index))}</div>;
}

export default function TiaKartaGmPrototype() {
  const [active, setActive] = useState('overview');
  const [notes, setNotes] = useState(() => loadTiaKartaGmNotes());
  const [draft, setDraft] = useState(notes.sessionNotes || '');

  const saveNotes = () => {
    const next = saveTiaKartaGmNotes({ ...notes, sessionNotes: draft });
    setNotes(next);
    toast.success('Tia-Karta GM notes saved locally');
  };

  return (
    <div className="tia-gm-prototype">
      <aside className="tia-gm-rail" aria-label="Tia-Karta GM sections">
        {sections.map(([id, label, Icon]) => (
          <button key={id} type="button" className={active === id ? 'active' : ''} onClick={() => setActive(id)} aria-label={label}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </aside>

      <main className="tia-gm-main">
        <header className="tia-gm-header">
          <div>
            <span>Local GM Prototype</span>
            <h1>{TIA_KARTA_PROTOTYPE.campaign.name}</h1>
            <p>{TIA_KARTA_PROTOTYPE.campaign.tagline}</p>
          </div>
          <div className="tia-gm-header-actions">
            <Link to="/prototype-mobile"><Shield size={16} /> Class Tests</Link>
          </div>
        </header>

        {active === 'overview' && (
          <section className="tia-gm-section">
            <h2>Campaign command notes</h2>
            <p>{TIA_KARTA_PROTOTYPE.campaign.system}</p>
            <CardList items={TIA_KARTA_PROTOTYPE.cosmology} render={(item) => (
              <article key={item.name} className="tia-gm-card">
                <span>{item.role}</span>
                <h3>{item.name}</h3>
                <p>{item.notes}</p>
              </article>
            )} />
          </section>
        )}

        {active === 'gods' && (
          <section className="tia-gm-section">
            <h2>Gods and forgotten powers</h2>
            <CardList items={TIA_KARTA_PROTOTYPE.gods} render={(god) => (
              <article key={god.name} className="tia-gm-card">
                <span>{god.domains}</span>
                <h3>{god.name}</h3>
                <p><strong>Symbol:</strong> {god.symbol}</p>
              </article>
            )} />
          </section>
        )}

        {active === 'places' && (
          <section className="tia-gm-section">
            <h2>Continents and locations</h2>
            <CardList items={[...TIA_KARTA_PROTOTYPE.continents, ...TIA_KARTA_PROTOTYPE.locations]} render={(place) => (
              <article key={place.name} className="tia-gm-card">
                <span>{place.region || place.type}</span>
                <h3>{place.name}</h3>
                <p>{place.notes}</p>
              </article>
            )} />
          </section>
        )}

        {active === 'factions' && (
          <section className="tia-gm-section">
            <h2>Factions and pressure points</h2>
            <CardList items={TIA_KARTA_PROTOTYPE.factions} render={(faction) => (
              <article key={faction.name} className="tia-gm-card">
                <span>{faction.stance}</span>
                <h3>{faction.name}</h3>
                <p>{faction.notes}</p>
              </article>
            )} />
          </section>
        )}

        {active === 'hooks' && (
          <section className="tia-gm-section">
            <h2>Campaign hooks</h2>
            <div className="tia-gm-list">
              {TIA_KARTA_PROTOTYPE.campaignHooks.map((hook, index) => <div key={hook}><strong>{index + 1}</strong><p>{hook}</p></div>)}
            </div>
          </section>
        )}

        {active === 'rebuild' && (
          <section className="tia-gm-section">
            <h2>Balderin rebuild levers</h2>
            <CardList items={TIA_KARTA_PROTOTYPE.rebuildOptions} render={(option) => (
              <article key={option.tier} className="tia-gm-card">
                <span>Project choice</span>
                <h3>{option.tier}</h3>
                <p>{option.effect}</p>
              </article>
            )} />
          </section>
        )}

        {active === 'notes' && (
          <section className="tia-gm-section tia-gm-section--notes">
            <h2>Local GM notes</h2>
            <textarea value={draft} onChange={event => setDraft(event.target.value)} rows={12} placeholder="Write session prep, NPC secrets, vault changes, rebuild consequences..." />
            <button type="button" onClick={saveNotes}>Save local GM notes</button>
          </section>
        )}
      </main>
    </div>
  );
}
