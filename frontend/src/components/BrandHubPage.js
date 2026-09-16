import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Compass,
  Dices,
  Hammer,
  Shield,
} from 'lucide-react';
import '@/styles/rookieQuestBrand.css';

const ROADMAP = [
  {
    number: '01',
    key: 'keeper',
    icon: Shield,
    verb: 'Run',
    name: 'Keeper',
    status: 'Now',
    description: 'The first Rookie Quest product: characters, campaigns, prep and live table tools in one connected workspace.',
  },
  {
    number: '02',
    key: 'forge',
    icon: Hammer,
    verb: 'Build',
    name: 'Forge',
    status: 'Next',
    description: 'Our modular printable terrain system. It stays in development until the tiles, connectors and core range are properly tested.',
  },
  {
    number: '03',
    key: 'worlds',
    icon: BookOpen,
    verb: 'Explore',
    name: 'Worlds',
    status: 'Later',
    description: 'Original campaign settings, adventures and lore that can eventually connect back into Keeper and Forge.',
  },
  {
    number: '04',
    key: 'game',
    icon: Dices,
    verb: 'Play',
    name: 'Rookie Quest RPG',
    status: 'Future',
    description: 'Our own tabletop roleplaying system, built only after the rest of the ecosystem has taught us what the game should actually be.',
  },
];

const KEEPER_FEATURES = [
  'Create and manage characters',
  'Build campaigns and organise prep',
  'Run live sessions and combat',
  'Keep GM and player tools connected',
];

function BrandMark({ compact = false }) {
  return (
    <span className={`rq-brand-compass${compact ? ' rq-brand-compass-compact' : ''}`} aria-hidden="true">
      <Compass size={compact ? 22 : 34} strokeWidth={1.6} />
    </span>
  );
}

export default function BrandHubPage() {
  const navigate = useNavigate();
  const roadmapRef = useRef(null);

  useEffect(() => {
    const previousTitle = document.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    const previousDescription = metaDescription?.getAttribute('content') ?? null;
    const createdMeta = !metaDescription;
    const activeMetaDescription = metaDescription ?? document.createElement('meta');

    document.title = 'Rookie Quest | Every Legend Starts Somewhere';
    activeMetaDescription.setAttribute('name', 'description');
    activeMetaDescription.setAttribute(
      'content',
      'Rookie Quest is a growing tabletop brand. Start with Rookie Quest Keeper, our connected campaign and table-management toolkit, with Forge, Worlds and an original RPG planned for the future.'
    );

    if (createdMeta) document.head.appendChild(activeMetaDescription);

    return () => {
      document.title = previousTitle;
      if (createdMeta) activeMetaDescription.remove();
      else if (previousDescription !== null) activeMetaDescription.setAttribute('content', previousDescription);
    };
  }, []);

  const scrollToRoadmap = () => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    roadmapRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className="rq-brand-page rq-brand-page-keeper-first">
      <a className="rq-brand-skip" href="#rq-brand-main">Skip to content</a>

      <nav className="rq-brand-nav" aria-label="Rookie Quest navigation">
        <button className="rq-brand-lockup" type="button" onClick={() => navigate('/')} aria-label="Rookie Quest home">
          <BrandMark compact />
          <span className="rq-brand-lockup-name">Rookie Quest</span>
        </button>

        <div className="rq-brand-nav-links" aria-label="Rookie Quest navigation links">
          <button type="button" onClick={() => navigate('/keeper')}>Keeper</button>
          <button type="button" onClick={scrollToRoadmap}>Roadmap</button>
        </div>

        <div className="rq-brand-nav-actions">
          <button className="rq-brand-nav-signin" type="button" onClick={() => navigate('/auth')}>Sign in</button>
          <button className="rq-brand-nav-cta" type="button" onClick={() => navigate('/keeper')}>
            Open Keeper <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </nav>

      <main id="rq-brand-main">
        <section className="rq-brand-hero rq-brand-hero-keeper-first" aria-labelledby="rq-brand-title">
          <div className="rq-brand-hero-mark"><BrandMark /></div>
          <p className="rq-brand-overline">A home for the tabletop ideas we want to build properly.</p>
          <h1 id="rq-brand-title">Rookie Quest</h1>
          <p className="rq-brand-tagline">Every legend starts somewhere.</p>
          <p className="rq-brand-intro">
            Rookie Quest is being built one product at a time. We are starting with Keeper — making it useful, polished and dependable before we move on to the next big thing.
          </p>

          <div className="rq-brand-hero-actions">
            <button className="rq-brand-button rq-brand-button-primary rq-brand-button-keeper" type="button" onClick={() => navigate('/keeper')}>
              Explore Rookie Quest Keeper <ArrowRight size={17} aria-hidden="true" />
            </button>
            <button className="rq-brand-button rq-brand-button-secondary" type="button" onClick={scrollToRoadmap}>
              See the plan ahead
            </button>
          </div>
        </section>

        <section className="rq-keeper-spotlight" aria-labelledby="rq-keeper-title">
          <div className="rq-keeper-spotlight-copy">
            <p className="rq-brand-kicker">Product 01 · Available now</p>
            <div className="rq-keeper-wordmark">
              <span className="rq-keeper-wordmark-icon"><Shield size={28} strokeWidth={1.7} aria-hidden="true" /></span>
              <div>
                <small>Rookie Quest</small>
                <h2 id="rq-keeper-title">Keeper</h2>
              </div>
            </div>
            <p className="rq-keeper-lead">
              The first part of Rookie Quest is the one we finish first: a clean, connected place to organise characters, campaigns and the table itself.
            </p>
            <div className="rq-keeper-actions">
              <button className="rq-brand-button rq-brand-button-primary rq-brand-button-keeper" type="button" onClick={() => navigate('/keeper')}>
                Visit Keeper <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button className="rq-brand-button rq-brand-button-secondary" type="button" onClick={() => navigate('/auth')}>
                Sign in
              </button>
            </div>
          </div>

          <div className="rq-keeper-feature-panel" aria-label="Rookie Quest Keeper highlights">
            <p>Built around the whole session</p>
            <div className="rq-keeper-feature-list">
              {KEEPER_FEATURES.map((feature, index) => (
                <div key={feature}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{feature}</strong>
                </div>
              ))}
            </div>
            <p className="rq-keeper-feature-note">Keeper gets the attention now. The rest of Rookie Quest follows when it is ready.</p>
          </div>
        </section>

        <section className="rq-brand-roadmap" ref={roadmapRef} id="roadmap" aria-labelledby="rq-roadmap-title">
          <div className="rq-brand-section-heading rq-brand-roadmap-heading">
            <p className="rq-brand-kicker">The plan ahead</p>
            <h2 id="rq-roadmap-title">One thing at a time.</h2>
            <p>
              The order matters. We finish and polish each part before the next one becomes a real public product.
            </p>
          </div>

          <div className="rq-brand-roadmap-list">
            {ROADMAP.map((item) => {
              const Icon = item.icon;
              const active = item.key === 'keeper';
              return (
                <article key={item.key} className={`rq-brand-roadmap-item rq-brand-roadmap-${item.key}${active ? ' is-active' : ''}`}>
                  <div className="rq-brand-roadmap-number">{item.number}</div>
                  <div className="rq-brand-roadmap-icon"><Icon size={23} strokeWidth={1.7} aria-hidden="true" /></div>
                  <div className="rq-brand-roadmap-copy">
                    <div className="rq-brand-roadmap-titleline">
                      <div>
                        <small>Rookie Quest</small>
                        <h3>{item.name}</h3>
                      </div>
                      <span>{item.status}</span>
                    </div>
                    <p>{item.description}</p>
                    <strong>{item.verb}</strong>
                  </div>
                  {active && (
                    <button type="button" className="rq-brand-roadmap-link" onClick={() => navigate('/keeper')}>
                      Explore Keeper <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="rq-brand-connection rq-brand-connection-keeper-first" aria-labelledby="rq-connection-title">
          <p className="rq-brand-kicker">The long-term idea</p>
          <h2 id="rq-connection-title">One brand. A connected table.</h2>
          <p>
            Keeper comes first. Later, Forge can help build the table, Worlds can give it somewhere to go, and our own RPG can give it another way to play. None of those needs to be rushed for the idea to work.
          </p>
        </section>
      </main>

      <footer className="rq-brand-footer">
        <div><BrandMark compact /><span>Rookie Quest</span></div>
        <p>Keeper first · The rest when it is ready</p>
      </footer>
    </div>
  );
}
