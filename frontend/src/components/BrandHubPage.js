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

const PRODUCTS = [
  {
    key: 'keeper',
    icon: Shield,
    verb: 'Run',
    name: 'Keeper',
    status: 'Available now',
    description: 'Characters, campaigns, prep and live table tools in one connected workspace.',
    path: '/keeper',
  },
  {
    key: 'forge',
    icon: Hammer,
    verb: 'Build',
    name: 'Forge',
    status: 'In development',
    description: 'Modular printable terrain built to be reused, expanded and stored without the headache.',
    path: '/forge',
  },
  {
    key: 'worlds',
    icon: BookOpen,
    verb: 'Explore',
    name: 'Worlds',
    status: 'In development',
    description: 'Original settings, adventures and lore designed to give your table somewhere new to go.',
    path: '/worlds',
  },
  {
    key: 'game',
    icon: Dices,
    verb: 'Play',
    name: 'The Game',
    status: 'Future release',
    description: 'A future original tabletop RPG shaped by the way people actually build, run and play.',
    path: '/game',
  },
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
  const productsRef = useRef(null);

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
      'Rookie Quest brings tabletop campaign tools, original worlds, modular printable terrain and a future original RPG together in one connected ecosystem.'
    );

    if (createdMeta) document.head.appendChild(activeMetaDescription);

    return () => {
      document.title = previousTitle;
      if (createdMeta) activeMetaDescription.remove();
      else if (previousDescription !== null) activeMetaDescription.setAttribute('content', previousDescription);
    };
  }, []);

  const scrollToProducts = () => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    productsRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className="rq-brand-page">
      <a className="rq-brand-skip" href="#rq-brand-main">Skip to content</a>

      <nav className="rq-brand-nav" aria-label="Rookie Quest navigation">
        <button className="rq-brand-lockup" type="button" onClick={() => navigate('/')} aria-label="Rookie Quest home">
          <BrandMark compact />
          <span className="rq-brand-lockup-name">Rookie Quest</span>
        </button>

        <div className="rq-brand-nav-links" aria-label="Rookie Quest products">
          <button type="button" onClick={() => navigate('/keeper')}>Keeper</button>
          <button type="button" onClick={() => navigate('/forge')}>Forge</button>
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

      <main id="rq-brand-main">
        <section className="rq-brand-hero" aria-labelledby="rq-brand-title">
          <div className="rq-brand-hero-mark"><BrandMark /></div>
          <p className="rq-brand-overline">Tabletop stories. One connected home.</p>
          <h1 id="rq-brand-title">Rookie Quest</h1>
          <p className="rq-brand-tagline">Every legend starts somewhere.</p>
          <p className="rq-brand-intro">
            Tools to run the table. Terrain to build it. Worlds to explore. And, one day, a game system of our own.
          </p>

          <div className="rq-brand-hero-actions">
            <button className="rq-brand-button rq-brand-button-primary" type="button" onClick={scrollToProducts}>
              Explore Rookie Quest <ArrowRight size={17} aria-hidden="true" />
            </button>
            <button className="rq-brand-button rq-brand-button-secondary" type="button" onClick={() => navigate('/keeper')}>
              Open Keeper
            </button>
          </div>

          <div className="rq-brand-mantra" aria-label="Rookie Quest pillars">
            <span className="rq-brand-mantra-game">Play</span>
            <i aria-hidden="true" />
            <span className="rq-brand-mantra-keeper">Run</span>
            <i aria-hidden="true" />
            <span className="rq-brand-mantra-worlds">Explore</span>
            <i aria-hidden="true" />
            <span className="rq-brand-mantra-forge">Build</span>
          </div>
        </section>

        <section className="rq-brand-products" ref={productsRef} aria-labelledby="rq-products-title">
          <div className="rq-brand-section-heading">
            <p className="rq-brand-kicker">The Rookie Quest family</p>
            <h2 id="rq-products-title">Four paths. One table.</h2>
          </div>

          <div className="rq-brand-product-grid">
            {PRODUCTS.map((product) => {
              const Icon = product.icon;
              return (
                <button
                  key={product.key}
                  type="button"
                  className={`rq-brand-product-card rq-brand-product-${product.key}`}
                  onClick={() => navigate(product.path)}
                  aria-label={`Explore Rookie Quest ${product.name}`}
                >
                  <span className="rq-brand-card-topline">
                    <span className="rq-brand-product-icon"><Icon size={24} strokeWidth={1.7} aria-hidden="true" /></span>
                    <span className="rq-brand-product-status">{product.status}</span>
                  </span>
                  <span className="rq-brand-product-wordmark">
                    <small>Rookie Quest</small>
                    <strong>{product.name}</strong>
                  </span>
                  <span className="rq-brand-product-verb">{product.verb}</span>
                  <span className="rq-brand-product-description">{product.description}</span>
                  <span className="rq-brand-card-link">Explore <ArrowRight size={16} aria-hidden="true" /></span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rq-brand-connection" aria-labelledby="rq-connection-title">
          <p className="rq-brand-kicker">Built to connect</p>
          <h2 id="rq-connection-title">Your table. Your world. Your quest.</h2>
          <p>
            The long-term goal is simple: discover something in Worlds, run it in Keeper, build it with Forge,
            and play it with the system that suits your table — including ours when it is ready.
          </p>
        </section>

        <section className="rq-brand-start" aria-label="Start with Rookie Quest Keeper">
          <div>
            <p className="rq-brand-kicker">Available now</p>
            <h2>Start with Keeper.</h2>
            <p>The first live piece of Rookie Quest is already built for characters, campaigns and the table itself.</p>
          </div>
          <button className="rq-brand-button rq-brand-button-primary" type="button" onClick={() => navigate('/keeper')}>
            Explore Keeper <ArrowRight size={17} aria-hidden="true" />
          </button>
        </section>
      </main>

      <footer className="rq-brand-footer">
        <div><BrandMark compact /><span>Rookie Quest</span></div>
        <p>Play · Run · Explore · Build</p>
      </footer>
    </div>
  );
}
