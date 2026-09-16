import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Compass,
  Dices,
  Hammer,
  Shield,
  Sparkles,
} from 'lucide-react';
import { BRAND_DESTINATIONS, openBrandDestination } from '@/config/brandDestinations';
import '@/styles/rookieQuestBrand.css';
import '@/styles/rookieQuestKeeperFirst.css';

const ROADMAP = [
  {
    number: '01',
    key: 'keeper',
    icon: Shield,
    verb: 'Run',
    name: 'Keeper',
    status: 'Live now',
    description: 'Characters, campaigns, prep and live table tools in one connected workspace.',
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
    description: 'Original campaign settings, adventures and lore designed to connect naturally with the rest of Rookie Quest.',
  },
  {
    number: '04',
    key: 'game',
    icon: Dices,
    verb: 'Play',
    name: 'Rookie Quest RPG',
    status: 'Future',
    description: 'Our own tabletop roleplaying system, built only after the rest of the ecosystem has taught us what the game should be.',
  },
];

const KEEPER_FEATURES = [
  'Create and manage characters',
  'Build campaigns and organise prep',
  'Run live sessions and combat',
  'Keep GM and player tools connected',
];

const BRAND_PRINCIPLES = [
  {
    icon: Compass,
    title: 'Built from the table outward',
    text: 'Rookie Quest starts with the problems and ideas that actually come up while playing, running and preparing games.',
  },
  {
    icon: Shield,
    title: 'Useful on its own',
    text: 'Keeper, Forge, Worlds and the RPG should each make sense independently. The connection between them is a bonus, not a requirement.',
  },
  {
    icon: Sparkles,
    title: 'Released when it earns it',
    text: 'We would rather finish one thing properly than advertise four half-built products. Keeper comes first; the rest follows when ready.',
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
  const aboutRef = useRef(null);
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
      'Rookie Quest is a growing tabletop brand. Start with Rookie Quest Keeper today, with Forge, Worlds and an original tabletop RPG planned for the future.'
    );

    if (createdMeta) document.head.appendChild(activeMetaDescription);

    return () => {
      document.title = previousTitle;
      if (createdMeta) activeMetaDescription.remove();
      else if (previousDescription !== null) activeMetaDescription.setAttribute('content', previousDescription);
    };
  }, []);

  const scrollTo = (ref) => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    ref.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const openProduct = (key) => openBrandDestination(navigate, key);

  return (
    <div className="rq-brand-page rq-brand-page-keeper-first">
      <a className="rq-brand-skip" href="#rq-brand-main">Skip to content</a>

      <nav className="rq-brand-nav" aria-label="Rookie Quest navigation">
        <button className="rq-brand-lockup" type="button" onClick={() => navigate('/')} aria-label="Rookie Quest home">
          <BrandMark compact />
          <span className="rq-brand-lockup-name">Rookie Quest</span>
        </button>

        <div className="rq-brand-nav-links" aria-label="Rookie Quest navigation links">
          <button type="button" onClick={() => openProduct('keeper')}>Keeper</button>
          <button type="button" onClick={() => scrollTo(aboutRef)}>About</button>
          <button type="button" onClick={() => scrollTo(roadmapRef)}>Roadmap</button>
        </div>

        <div className="rq-brand-nav-actions">
          <button className="rq-brand-nav-signin" type="button" onClick={() => navigate('/auth')}>Sign in</button>
          <button className="rq-brand-nav-cta" type="button" onClick={() => openProduct('keeper')}>
            Open Keeper <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </nav>

      <main id="rq-brand-main">
        <section className="rq-brand-hero rq-brand-hero-keeper-first" aria-labelledby="rq-brand-title">
          <div className="rq-brand-hero-mark"><BrandMark /></div>
          <p className="rq-brand-overline">A growing tabletop brand, built one piece at a time.</p>
          <h1 id="rq-brand-title">Rookie Quest</h1>
          <p className="rq-brand-tagline">Every legend starts somewhere.</p>
          <p className="rq-brand-intro">
            Rookie Quest is our home for tabletop tools, terrain, worlds and games. We are starting with one thing and doing it properly: Rookie Quest Keeper.
          </p>

          <div className="rq-brand-hero-actions">
            <button className="rq-brand-button rq-brand-button-primary rq-brand-button-keeper" type="button" onClick={() => openProduct('keeper')}>
              Explore Rookie Quest Keeper <ArrowRight size={17} aria-hidden="true" />
            </button>
            <button className="rq-brand-button rq-brand-button-secondary" type="button" onClick={() => scrollTo(roadmapRef)}>
              See what comes next
            </button>
          </div>

          <div className="rq-brand-hero-status" aria-label="Current Rookie Quest status">
            <span><i className="is-live" aria-hidden="true" /> Keeper is live</span>
            <span><i aria-hidden="true" /> Forge is next</span>
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
              A connected place to organise characters, campaigns, preparation and the live table — built to keep the useful parts together without getting in the way of the game.
            </p>
            <div className="rq-keeper-actions">
              <button className="rq-brand-button rq-brand-button-primary rq-brand-button-keeper" type="button" onClick={() => openProduct('keeper')}>
                Visit Keeper <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button className="rq-brand-button rq-brand-button-secondary" type="button" onClick={() => navigate('/auth')}>
                Sign in
              </button>
            </div>
          </div>

          <div className="rq-keeper-feature-panel" aria-label="Rookie Quest Keeper highlights">
            <div className="rq-keeper-panel-heading">
              <p>Built around the whole session</p>
              <span>Live</span>
            </div>
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

        <section className="rq-brand-about" ref={aboutRef} id="about" aria-labelledby="rq-about-title">
          <div className="rq-brand-section-heading rq-brand-about-heading">
            <p className="rq-brand-kicker">Why Rookie Quest exists</p>
            <h2 id="rq-about-title">One brand. No rush.</h2>
            <p>
              The goal is not to make everything at once. It is to build a family of tabletop products that feel related, stay useful on their own, and eventually work brilliantly together.
            </p>
          </div>

          <div className="rq-brand-principles">
            {BRAND_PRINCIPLES.map((principle) => {
              const Icon = principle.icon;
              return (
                <article key={principle.title}>
                  <span><Icon size={22} strokeWidth={1.7} aria-hidden="true" /></span>
                  <h3>{principle.title}</h3>
                  <p>{principle.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rq-brand-roadmap" ref={roadmapRef} id="roadmap" aria-labelledby="rq-roadmap-title">
          <div className="rq-brand-section-heading rq-brand-roadmap-heading">
            <p className="rq-brand-kicker">The plan ahead</p>
            <h2 id="rq-roadmap-title">Build in the right order.</h2>
            <p>
              Each product gets its own identity and, when it is ready, its own proper home. The main Rookie Quest site stays the front door connecting them all.
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
                  <button
                    type="button"
                    className={`rq-brand-roadmap-link${active ? ' is-live' : ''}`}
                    onClick={() => openProduct(item.key)}
                    aria-label={`${active ? 'Explore' : 'View plans for'} Rookie Quest ${item.name}`}
                  >
                    {active ? 'Explore Keeper' : 'View plans'} <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rq-brand-next-step" aria-labelledby="rq-next-title">
          <div>
            <p className="rq-brand-kicker">Start where we are</p>
            <h2 id="rq-next-title">Keeper first. Everything else can wait.</h2>
            <p>
              The best way to understand where Rookie Quest is going is to use the part that already exists. Keeper is the foundation we are polishing before anything else gets promoted to a finished product.
            </p>
          </div>
          <div className="rq-brand-next-actions">
            <button className="rq-brand-button rq-brand-button-primary rq-brand-button-keeper" type="button" onClick={() => openProduct('keeper')}>
              Explore Keeper <ArrowRight size={17} aria-hidden="true" />
            </button>
            <button className="rq-brand-button rq-brand-button-secondary" type="button" onClick={() => navigate('/auth')}>
              Sign in
            </button>
          </div>
        </section>
      </main>

      <footer className="rq-brand-footer rq-brand-footer-expanded">
        <div className="rq-brand-footer-brand">
          <div><BrandMark compact /><span>Rookie Quest</span></div>
          <p>Every legend starts somewhere.</p>
        </div>

        <div className="rq-brand-footer-products" aria-label="Rookie Quest products">
          {Object.values(BRAND_DESTINATIONS).map((destination) => (
            <button key={destination.key} type="button" onClick={() => openProduct(destination.key)}>
              <span>{destination.label}</span>
              <small>{destination.status === 'live' ? 'Live' : 'Planned'}</small>
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
