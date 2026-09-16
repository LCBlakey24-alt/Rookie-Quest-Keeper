import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  ChevronDown,
  Compass,
  Cuboid,
  Hammer,
  Layers3,
  PackageOpen,
  Printer,
  Ruler,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { FORGE_PACKS, FORGE_STANDARD, PRINTER_PROFILES, packFitsPrinter } from '@/data/forgeCatalog';
import '@/styles/rookieQuestBrand.css';
import '@/styles/rookieQuestForge.css';

function BrandMark() {
  return (
    <span className="rq-brand-compass rq-brand-compass-compact" aria-hidden="true">
      <Compass size={22} strokeWidth={1.6} />
    </span>
  );
}

export default function ForgePage() {
  const navigate = useNavigate();
  const [printerId, setPrinterId] = useState('all');

  const selectedPrinter = useMemo(
    () => PRINTER_PROFILES.find((printer) => printer.id === printerId) || PRINTER_PROFILES[0],
    [printerId]
  );

  const visiblePacks = useMemo(
    () => FORGE_PACKS.filter((pack) => packFitsPrinter(pack, selectedPrinter)),
    [selectedPrinter]
  );

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Rookie Quest Forge | Build';
    return () => { document.title = previousTitle; };
  }, []);

  const scrollToCatalog = () => {
    document.getElementById('forge-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="rq-brand-page rq-forge-page">
      <nav className="rq-brand-nav" aria-label="Rookie Quest navigation">
        <button className="rq-brand-lockup" type="button" onClick={() => navigate('/')} aria-label="Rookie Quest home">
          <BrandMark />
          <span className="rq-brand-lockup-name">Rookie Quest</span>
        </button>

        <div className="rq-brand-nav-links">
          <button type="button" onClick={() => navigate('/keeper')}>Keeper</button>
          <button type="button" aria-current="page">Forge</button>
          <button type="button" onClick={() => navigate('/worlds')}>Worlds</button>
          <button type="button" onClick={() => navigate('/game')}>Game</button>
        </div>

        <div className="rq-brand-nav-actions">
          <button className="rq-brand-nav-signin" type="button" onClick={() => navigate('/auth')}>Sign in</button>
          <button className="rq-brand-nav-cta" type="button" onClick={() => navigate('/keeper')}>
            Open Keeper <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </nav>

      <main className="rq-forge-main">
        <button className="rq-brand-back rq-forge-back" type="button" onClick={() => navigate('/')}>
          <ArrowLeft size={16} aria-hidden="true" /> Rookie Quest
        </button>

        <section className="rq-forge-hero">
          <div className="rq-forge-hero-mark" aria-hidden="true"><Hammer size={34} strokeWidth={1.55} /></div>
          <p className="rq-forge-overline">Rookie Quest Forge</p>
          <h1>Build once.<br /><span>Rebuild forever.</span></h1>
          <p className="rq-forge-lede">
            A modular 3D-printable terrain system built around reusable frames, swappable surfaces and vertical play — so a printed collection grows with your table instead of becoming a box of one-use scenery.
          </p>
          <div className="rq-forge-hero-actions">
            <button className="rq-brand-button rq-forge-primary" type="button" onClick={scrollToCatalog}>
              Explore the first packs <ArrowRight size={17} aria-hidden="true" />
            </button>
            <span className="rq-forge-prototype-note"><Wrench size={15} aria-hidden="true" /> Prototype standard v0.1</span>
          </div>
        </section>

        <section className="rq-forge-principles" aria-label="Forge design principles">
          <article>
            <Layers3 size={23} aria-hidden="true" />
            <h2>One base language</h2>
            <p>Frames, floors, walls and elevation are designed around the same connection standard.</p>
          </article>
          <article>
            <Boxes size={23} aria-hidden="true" />
            <h2>Designed to stack</h2>
            <p>Storage is part of the design: frames nest neatly instead of becoming awkward loose boards.</p>
          </article>
          <article>
            <Cuboid size={23} aria-hidden="true" />
            <h2>Built upward too</h2>
            <p>5 ft, 10 ft and 15 ft elevation pieces let the grid become ledges, balconies and multi-level rooms.</p>
          </article>
        </section>

        <section className="rq-forge-standard" aria-labelledby="forge-standard-title">
          <div className="rq-forge-section-copy">
            <p className="rq-forge-kicker">The Forge standard</p>
            <h2 id="forge-standard-title">The connector is part of the system, not an afterthought.</h2>
            <p>
              The working connector sits at the base of the frame like a shallow speed bump. One frame presents the ridge, the next receives it, keeping joined sections aligned without putting a bulky clip through the middle of the board.
            </p>
          </div>
          <dl className="rq-forge-spec-list">
            <div><dt>Grid</dt><dd>{FORGE_STANDARD.gridLabel}</dd></div>
            <div><dt>Joining edge</dt><dd>{FORGE_STANDARD.connectorRule}</dd></div>
            <div><dt>Storage</dt><dd>{FORGE_STANDARD.stacking}</dd></div>
            <div><dt>Elevation</dt><dd>{FORGE_STANDARD.elevation}</dd></div>
          </dl>
          <p className="rq-forge-calibration"><Ruler size={16} aria-hidden="true" /> Final tolerances and exact millimetre dimensions remain prototype values until the calibration prints are signed off.</p>
        </section>

        <section className="rq-forge-starter" aria-labelledby="forge-starter-title">
          <div className="rq-forge-starter-heading">
            <div>
              <p className="rq-forge-kicker">Product 001</p>
              <h2 id="forge-starter-title">Forge Starter Set</h2>
            </div>
            <span>Prototype</span>
          </div>
          <p className="rq-forge-starter-intro">
            The first pack is deliberately not huge. It is the smallest useful collection that proves the system can make a real encounter, stack away afterwards, and accept future packs without replacing the base collection.
          </p>
          <div className="rq-forge-starter-grid">
            {FORGE_PACKS[0].contents.map((item) => (
              <div key={item}><Check size={16} aria-hidden="true" /><span>{item}</span></div>
            ))}
          </div>
          <div className="rq-forge-starter-footer">
            <span><Printer size={16} aria-hidden="true" /> Largest planned Starter Set part: {FORGE_PACKS[0].maxPartX} × {FORGE_PACKS[0].maxPartY} mm</span>
            <span><Sparkles size={16} aria-hidden="true" /> {FORGE_PACKS[0].nozzle}</span>
          </div>
        </section>

        <section id="forge-catalog" className="rq-forge-catalog" aria-labelledby="forge-catalog-title">
          <div className="rq-forge-catalog-head">
            <div>
              <p className="rq-forge-kicker">Print what fits</p>
              <h2 id="forge-catalog-title">Forge catalogue</h2>
              <p>The catalogue is being built around printer compatibility from the start, so people can hide packs whose largest supplied part will not fit their machine.</p>
            </div>

            <label className="rq-forge-printer-filter">
              <span><Printer size={17} aria-hidden="true" /> My printer</span>
              <div>
                <select value={printerId} onChange={(event) => setPrinterId(event.target.value)}>
                  {PRINTER_PROFILES.map((printer) => (
                    <option key={printer.id} value={printer.id}>{printer.name}</option>
                  ))}
                </select>
                <ChevronDown size={17} aria-hidden="true" />
              </div>
              <small>{selectedPrinter.notes}</small>
            </label>
          </div>

          <div className="rq-forge-filter-summary" aria-live="polite">
            {selectedPrinter.id === 'all' ? (
              <span>Showing all {FORGE_PACKS.length} planned Forge packs.</span>
            ) : (
              <span>Showing {visiblePacks.length} of {FORGE_PACKS.length} packs that fit a {selectedPrinter.bedX} × {selectedPrinter.bedY} mm bed.</span>
            )}
          </div>

          <div className="rq-forge-pack-grid">
            {FORGE_PACKS.map((pack) => {
              const fits = packFitsPrinter(pack, selectedPrinter);
              if (!fits) return null;
              return (
                <article key={pack.id} className={`rq-forge-pack${pack.featured ? ' rq-forge-pack-featured' : ''}`}>
                  <div className="rq-forge-pack-topline">
                    <span>{pack.eyebrow}</span>
                    <em>{pack.status}</em>
                  </div>
                  <h3>{pack.name}</h3>
                  <p>{pack.description}</p>
                  <div className="rq-forge-pack-tags">
                    {pack.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  <div className="rq-forge-pack-meta">
                    <span><Ruler size={14} aria-hidden="true" /> max {pack.maxPartX} × {pack.maxPartY} mm</span>
                    <span><Printer size={14} aria-hidden="true" /> {pack.nozzle}</span>
                  </div>
                  <button type="button" disabled aria-disabled="true">
                    {pack.status === 'Prototype' ? 'Prototype in progress' : 'Planned pack'}
                  </button>
                </article>
              );
            })}
          </div>

          {visiblePacks.length < FORGE_PACKS.length && (
            <div className="rq-forge-hidden-note">
              <X size={16} aria-hidden="true" />
              <span>{FORGE_PACKS.length - visiblePacks.length} pack{FORGE_PACKS.length - visiblePacks.length === 1 ? '' : 's'} hidden because the largest supplied part exceeds this printer profile. Split-file variants can be added later where they make sense.</span>
            </div>
          )}
        </section>

        <section className="rq-forge-library-preview">
          <PackageOpen size={28} aria-hidden="true" />
          <div>
            <p className="rq-forge-kicker">Where this is heading</p>
            <h2>A proper printable library, not a folder dump.</h2>
            <p>
              When Forge files are ready to sell, each owned pack should live in a personal library with printer filtering, version updates, print notes and clear file groupings. The shop and the download library will use the same compatibility data already powering this page.
            </p>
          </div>
        </section>
      </main>

      <footer className="rq-forge-footer">
        <button type="button" onClick={() => navigate('/')}><BrandMark /> <span>Rookie Quest</span></button>
        <p>Play. Run. Explore. Build.</p>
      </footer>
    </div>
  );
}
