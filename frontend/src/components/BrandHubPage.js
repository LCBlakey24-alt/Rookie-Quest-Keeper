import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Compass,
  Dices,
  Hammer,
  Shield,
  Sparkles,
} from 'lucide-react';
import '@/styles/rookieQuestBrand.css';

const PRODUCTS = [
  {
    key: 'keeper',
    icon: Shield,
    verb: 'Run',
    name: 'Rookie Quest Keeper',
    status: 'Available now',
    description: 'The campaign and character hub for players and GMs — built to keep prep, play and table tools together.',
    path: '/keeper',
  },
  {
    key: 'forge',
    icon: Hammer,
    verb: 'Build',
    name: 'Rookie Quest Forge',
    status: 'In development',
    description: 'A modular 3D-printable terrain system: floors, walls, elevation, scenery and encounter-ready printable packs.',
    path: '/forge',
  },
  {
    key: 'worlds',
    icon: Compass,
    verb: 'Explore',
    name: 'Rookie Quest Worlds',
    status: 'In development',
    description: 'Original settings, adventures, locations and lore designed to plug naturally into the wider Rookie Quest ecosystem.',
    path: '/worlds',
  },
  {
    key: 'game',
    icon: Dices,
    verb: 'Play',
    name: 'The Rookie Quest Game',
    status: 'Future release',
    description: 'Our eventual original tabletop roleplaying system — its final name and rules will grow from the way real tables actually play.',
    path: '/game',
  },
];

export default function BrandHubPage() {
  const navigate = useNavigate();
  const ecosystemRef = useRef(null);

  useEffect(() => {
    const previousTitle = document.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    const previousDescription = metaDescription?.getAttribute('content') ?? null;
    const createdMeta = !metaDescription;
    const activeMetaDescription = metaDescription ?? document.createElement('meta');

    document.title = 'Rookie Quest | Play. Run. Explore. Build.';
    activeMetaDescription.setAttribute('name', 'description');
    activeMetaDescription.setAttribute(
      'content',
      'Rookie Quest brings tabletop campaign tools, original worlds, modular printable terrain and a future original RPG system together under one brand.'
    );

    if (createdMeta) document.head.appendChild(activeMetaDescription);

    return () => {
      document.title = previousTitle;
      if (createdMeta) activeMetaDescription.remove();
      else if (previousDescription !== null) activeMetaDescription.setAttribute('content', previousDescription);
    };
  }, []);

  const scrollToEcosystem = () => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    ecosystemRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className="rq-brand-page">
      <a className="rq-brand-skip" href="#rq-brand-main">Skip to content</a>

      <nav className="rq-brand-nav" aria-label="Rookie Quest navigation">
        <button className="rq-brand-lockup" type="button" onClick={() => navigate('/')} aria-label="Rookie Quest home">
          <span className="rq-brand-mark" aria-hidden="true">RQ</span>
          <span className="rq-brand-lockup-text">
            <strong>Rookie Quest</strong>
            <small>Every legend starts somewhere.</small>
          </span>
        </button>

        <div className="rq-brand-nav-links">
          <button type="button" onClick={() => navigate('/keeper')}>Keeper</button>
          <button type="button" onClick={() => navigate('/forge')}>Forge</button>
          <button type="button" onClick={() => navigate('/worlds')}>Worlds</button>
          <button type="button" onClick={() => navigate('/game')}>The Game</button>
        </div>

        <button className="rq-brand-nav-cta" type="button" onClick={() => navigate('/keeper')}>
          Open Keeper <ArrowRight size={17} aria-hidden="true" />
        </button>
      </nav>

      <main id="rq-brand-main">
        <section className="rq-brand-hero">
          <div className="rq-brand-hero-copy">
            <p className="rq-brand-eyebrow"><Sparkles size={16} aria-hidden="true" /> A tabletop ecosystem built from the table outward</p>
            <h1>Every legend starts <span>somewhere.</span></h1>
            <p className="rq-brand-hero-intro">
              Rookie Quest is one home for the things that make tabletop games brilliant: the tools to run them, the worlds to explore,
              the terrain to build, and eventually a game system of our own.
            </p>
            <div className="rq-brand-hero-actions">
              <button className="rq-brand-button rq-brand-button-primary" type="button" onClick={scrollToEcosystem}>
                Explore Rookie Quest <ArrowRight size={18} aria-hidden="true" />
              </button>
              <button className="rq-brand-button rq-brand-button-secondary" type="button" onClick={() => navigate('/keeper')}>
                Open Rookie Quest Keeper
              </button>
            </div>
            <div className="rq-brand-mantra" aria-label="Rookie Quest pillars">
              <span>Play.</span><span>Run.</span><span>Explore.</span><span>Build.</span>
            </div>
          </div>

          <div className="rq-brand-hero-emblem" aria-hidden="true">
            <div className="rq-brand-emblem-core">RQ</div>
            <div className="rq-brand-emblem-item rq-brand-emblem-item-keeper"><Shield size={26} /></div>
            <div className="rq-brand-emblem-item rq-brand-emblem-item-forge"><Hammer size={26} /></div>
            <div className="rq-brand-emblem-item rq-brand-emblem-item-worlds"><BookOpen size={26} /></div>
            <div className="rq-brand-emblem-item rq-brand-emblem-item-game"><Dices size={26} /></div>
          </div>
        </section>

        <section className="rq-brand-definition">
          <div>
            <p className="rq-brand-section-kicker">What “rookie” means to us</p>
            <h2>Being new is where the adventure begins — not where it ends.</h2>
          </div>
          <p>
            Your first character. Your first campaign. Your first painted mini. Your first world built from scratch. Rookie Quest is meant
            to make the starting point welcoming without putting a ceiling on where experienced players and GMs can take it.
          </p>
        </section>

        <section className="rq-brand-ecosystem" ref={ecosystemRef} aria-labelledby="ecosystem-title">
          <div className="rq-brand-section-heading">
            <p className="rq-brand-section-kicker">The Rookie Quest family</p>
            <h2 id="ecosystem-title">Four parts. One table.</h2>
            <p>Keeper is already the first working part. The others can grow around it without becoming disconnected side projects.</p>
          </div>

          <div className="rq-brand-product-grid">
            {PRODUCTS.map((product) => {
              const Icon = product.icon;
              return (
                <article key={product.key} className={`rq-brand-product rq-brand-product-${product.key}`}>
                  <div className="rq-brand-product-topline">
                    <span className="rq-brand-product-icon"><Icon size={25} aria-hidden="true" /></span>
                    <span className="rq-brand-product-status">{product.status}</span>
                  </div>
                  <p className="rq-brand-product-verb">{product.verb}</p>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <button type="button" onClick={() => navigate(product.path)}>
                    {product.key === 'keeper' ? 'Explore Keeper' : `Explore ${product.name.replace('Rookie Quest ', '')}`}
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rq-brand-connected">
          <div className="rq-brand-connected-icon"><Boxes size={30} aria-hidden="true" /></div>
          <div>
            <p className="rq-brand-section-kicker">Built to connect</p>
            <h2>The long-term idea is bigger than four separate products.</h2>
            <p>
              Discover an adventure in Worlds. Run it through Keeper. Build its encounters with Forge. Play with the system your table loves —
              and, one day, with the Rookie Quest game itself. The pieces should make each other better.
            </p>
          </div>
        </section>

        <section className="rq-brand-final-cta">
          <p className="rq-brand-section-kicker">The first quest is already underway</p>
          <h2>Start with Keeper.</h2>
          <p>Rookie Quest Keeper is the first live part of the ecosystem, built for character play, campaign prep and running the table.</p>
          <button className="rq-brand-button rq-brand-button-primary" type="button" onClick={() => navigate('/keeper')}>
            Explore Rookie Quest Keeper <ArrowRight size={18} aria-hidden="true" />
          </button>
        </section>
      </main>

      <footer className="rq-brand-footer">
        <div className="rq-brand-footer-name"><span className="rq-brand-mark rq-brand-mark-small">RQ</span> Rookie Quest</div>
        <p>Play. Run. Explore. Build.</p>
      </footer>
    </div>
  );
}
