import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Compass,
  Dices,
  Download,
  Hammer,
  Layers,
  Mail,
  Map,
  Package,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { BRAND_DESTINATIONS, openBrandDestination } from '@/config/brandDestinations';
import '@/styles/rookieQuestBrand.css';
import '@/styles/rookieQuestKeeperFirst.css';
import '@/styles/rookieQuestParentPolish.css';
import '@/styles/rookieQuestBusinessHome.css';
import '@/styles/rookieQuestVisualFamily.css';

const PRODUCT_FAMILY = [
  {
    number: '01',
    key: 'keeper',
    icon: Shield,
    verb: 'Run',
    name: 'Keeper',
    status: 'Available now',
    short: 'Your campaign, kept together.',
    description: 'Characters, campaigns, preparation and live-table tools in one connected workspace.',
    action: 'Explore Keeper',
  },
  {
    number: '02',
    key: 'forge',
    icon: Hammer,
    verb: 'Build',
    name: 'Forge',
    status: 'In development',
    short: 'Build worlds. Fuel adventures.',
    description: 'Affordable modular 3D-printable terrain designed to grow from a first room into a whole battlefield.',
    action: 'Meet Forge',
  },
  {
    number: '03',
    key: 'worlds',
    icon: BookOpen,
    verb: 'Explore',
    name: 'World',
    status: 'Planned',
    short: 'Your next campaign starts here.',
    description: 'Campaign settings, modules and adventures built to give GMs more stories to put straight on the table.',
    action: 'Meet World',
  },
  {
    number: '04',
    key: 'game',
    icon: Dices,
    verb: 'Play',
    name: 'Rookie Quest RPG',
    status: 'Future',
    short: 'A new kind of legend.',
    description: 'Our own tabletop roleplaying system, designed after the rest of the ecosystem has earned its lessons.',
    action: 'See the plan',
  },
];

const KEEPER_FEATURES = [
  'Create and manage characters',
  'Build campaigns and organise prep',
  'Run live sessions and combat',
  'Keep GM and player tools connected',
];

const FORGE_FEATURES = [
  { icon: Package, title: '3D print friendly', text: 'Bold, practical shapes designed around real home printers.' },
  { icon: Layers, title: 'Modular by design', text: 'Frames, tiles, walls and elevation pieces designed to work together.' },
  { icon: Hammer, title: 'Built for adventure', text: 'A reusable terrain system rather than a one-and-done encounter.' },
  { icon: Sparkles, title: 'Affordable on purpose', text: 'Fairly priced digital packs with unlimited personal printing.' },
];

const BRAND_PRINCIPLES = [
  {
    icon: Compass,
    title: 'Start at the table',
    text: 'We build around the things players and GMs actually need while creating, preparing and playing.',
  },
  {
    icon: Users,
    title: 'Make the hobby easier to enter',
    text: 'Good tabletop tools should feel welcoming, understandable and fairly priced — not locked behind a huge first purchase.',
  },
  {
    icon: Sparkles,
    title: 'Release things when they earn it',
    text: 'One finished product is worth more than four impressive promises. Keeper is live; Forge follows when the physical system is ready.',
  },
];

function BrandMark({ compact = false }) {
  return (
    <span className={`rq-brand-compass${compact ? ' rq-brand-compass-compact' : ''}`} aria-hidden="true">
      <Compass size={compact ? 22 : 34} strokeWidth={1.6} />
    </span>
  );
}

function ForgeMark() {
  return (
    <span className="rq-forge-mark" aria-hidden="true">
      <i className="rq-forge-mark-top" />
      <i className="rq-forge-mark-mid" />
      <i className="rq-forge-mark-leg" />
    </span>
  );
}

function ProductScene({ productKey }) {
  if (productKey === 'keeper') {
    return (
      <div className="rq-product-scene rq-product-scene-keeper" aria-hidden="true">
        <div className="rq-scene-window">
          <div className="rq-scene-window-bar"><i /><i /><i /></div>
          <div className="rq-scene-keeper-layout">
            <span className="rq-scene-keeper-rail" />
            <div className="rq-scene-keeper-main">
              <span className="rq-scene-title-line" />
              <div className="rq-scene-stat-row"><i /><i /><i /></div>
              <span className="rq-scene-wide-line" />
              <span className="rq-scene-mid-line" />
            </div>
          </div>
        </div>
        <span className="rq-scene-caption">Campaign workspace</span>
      </div>
    );
  }

  if (productKey === 'forge') {
    return (
      <div className="rq-product-scene rq-product-scene-forge" aria-hidden="true">
        <div className="rq-scene-forge-grid">
          <span /><span /><span /><span /><span /><span /><span /><span /><span />
        </div>
        <div className="rq-scene-forge-wall"><i /><i /><i /></div>
        <div className="rq-scene-forge-stamp"><ForgeMark /></div>
        <span className="rq-scene-caption">Modular terrain system</span>
      </div>
    );
  }

  if (productKey === 'worlds') {
    return (
      <div className="rq-product-scene rq-product-scene-world" aria-hidden="true">
        <div className="rq-scene-book">
          <div className="rq-scene-page rq-scene-page-left">
            <Map size={42} strokeWidth={1.15} />
            <i className="rq-scene-route" />
            <span className="rq-scene-map-dot one" />
            <span className="rq-scene-map-dot two" />
            <span className="rq-scene-map-dot three" />
          </div>
          <div className="rq-scene-page rq-scene-page-right">
            <Compass size={40} strokeWidth={1.05} />
            <span /><span /><span />
          </div>
        </div>
        <span className="rq-scene-caption">Settings · modules · adventures</span>
      </div>
    );
  }

  return (
    <div className="rq-product-scene rq-product-scene-game" aria-hidden="true">
      <div className="rq-scene-rulebook">
        <span className="rq-scene-rulebook-mark">RQ</span>
        <strong>Core Rules</strong>
        <i />
      </div>
      <div className="rq-scene-dice"><Dices size={54} strokeWidth={1.2} /></div>
      <span className="rq-scene-caption">Future original RPG</span>
    </div>
  );
}

export default function BrandHubPage() {
  const navigate = useNavigate();
  const productsRef = useRef(null);
  const forgeRef = useRef(null);
  const aboutRef = useRef(null);
  const roadmapRef = useRef(null);

  useEffect(() => {
    const previousTitle = document.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    const previousDescription = metaDescription?.getAttribute('content') ?? null;
    const createdMeta = !metaDescription;
    const activeMetaDescription = metaDescription ?? document.createElement('meta');

    document.title = 'Rookie Quest | Tools, Terrain & Adventures for the Table';
    activeMetaDescription.setAttribute('name', 'description');
    activeMetaDescription.setAttribute(
      'content',
      'Rookie Quest creates tabletop tools, affordable printable terrain, campaign settings, modules, adventures and future games. Start with Rookie Quest Keeper today.'
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
    <div className="rq-brand-page rq-brand-page-keeper-first rq-business-home rq-visual-home">
      <a className="rq-brand-skip" href="#rq-brand-main">Skip to content</a>

      <nav className="rq-brand-nav rq-business-nav rq-main-brand-nav" aria-label="Rookie Quest navigation">
        <button className="rq-brand-lockup" type="button" onClick={() => navigate('/')} aria-label="Rookie Quest home">
          <BrandMark compact />
          <span className="rq-brand-lockup-copy">
            <span className="rq-brand-lockup-name">Rookie Quest</span>
            <small>Every legend starts somewhere.</small>
          </span>
        </button>

        <div className="rq-brand-nav-links" aria-label="Rookie Quest navigation links">
          <button type="button" onClick={() => scrollTo(productsRef)}>Products</button>
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
        <section className="rq-business-hero rq-visual-hero" aria-labelledby="rq-brand-title">
          <div className="rq-business-hero-copy">
            <div className="rq-business-eyebrow"><BrandMark compact /><span>Tabletop ideas built to be used, not just admired</span></div>
            <p className="rq-business-mantra" aria-label="Play, Run, Explore, Build">Play <i /> Run <i /> Explore <i /> Build</p>
            <h1 id="rq-brand-title">Rookie Quest</h1>
            <p className="rq-brand-tagline">Every legend starts somewhere.</p>
            <p className="rq-brand-intro">
              Digital campaign tools, printable terrain, ready-to-run settings and adventures — all growing under one tabletop brand.
            </p>
            <div className="rq-brand-hero-actions rq-business-hero-actions">
              <button className="rq-brand-button rq-brand-button-primary" type="button" onClick={() => scrollTo(productsRef)}>
                Explore the family <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button className="rq-brand-button rq-brand-button-secondary" type="button" onClick={() => scrollTo(aboutRef)}>
                Why Rookie Quest?
              </button>
            </div>
            <div className="rq-business-proof" aria-label="Rookie Quest principles">
              <span>Built for players &amp; GMs</span>
              <span>Digital &amp; printable products</span>
              <span>Affordable by design</span>
            </div>
          </div>

          <div className="rq-business-hero-showcase rq-visual-hero-showcase" aria-label="Rookie Quest product family preview">
            <div className="rq-business-showcase-glow" />
            <div className="rq-business-showcase-heading">
              <span>The Rookie Quest family</span>
              <strong>Four directions. One table.</strong>
            </div>
            <div className="rq-visual-family-stack">
              {PRODUCT_FAMILY.map((product) => {
                const Icon = product.icon;
                return (
                  <button key={product.key} type="button" className={`rq-visual-family-strip is-${product.key}`} onClick={() => product.key === 'forge' ? scrollTo(forgeRef) : openProduct(product.key)}>
                    <span className="rq-visual-family-icon"><Icon size={18} strokeWidth={1.7} aria-hidden="true" /></span>
                    <div>
                      <small>{product.verb}</small>
                      <strong>{product.name}</strong>
                    </div>
                    <em>{product.status}</em>
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            <p>Keeper is live. Forge is next. World and our own RPG follow when they are ready.</p>
          </div>
        </section>

        <section ref={productsRef} id="products" className="rq-business-products rq-visual-products" aria-labelledby="rq-products-title">
          <div className="rq-business-section-heading">
            <p className="rq-brand-kicker">The Rookie Quest family</p>
            <h2 id="rq-products-title">One table. Four directions.</h2>
            <p>Each product has its own job and visual identity, but everything still feels unmistakably Rookie Quest.</p>
          </div>

          <div className="rq-business-product-grid rq-visual-product-grid">
            {PRODUCT_FAMILY.map((product) => {
              const Icon = product.icon;
              return (
                <article key={product.key} className={`rq-business-product-card rq-visual-product-card is-${product.key}`}>
                  <ProductScene productKey={product.key} />
                  <div className="rq-visual-product-content">
                    <div className="rq-business-product-topline">
                      <span>{product.number}</span>
                      <small>{product.status}</small>
                    </div>
                    <div className="rq-business-product-icon"><Icon size={26} strokeWidth={1.6} aria-hidden="true" /></div>
                    <p className="rq-business-product-parent">Rookie Quest</p>
                    <h3>{product.name}</h3>
                    <strong>{product.short}</strong>
                    <p>{product.description}</p>
                    <button type="button" onClick={() => product.key === 'forge' ? scrollTo(forgeRef) : openProduct(product.key)}>
                      {product.action} <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rq-keeper-spotlight rq-business-keeper" aria-labelledby="rq-keeper-title">
          <div className="rq-keeper-spotlight-copy">
            <p className="rq-brand-kicker">Product 01 · Available now</p>
            <div className="rq-keeper-wordmark">
              <span className="rq-keeper-wordmark-icon"><Shield size={28} strokeWidth={1.7} aria-hidden="true" /></span>
              <div>
                <small>Rookie Quest</small>
                <h2 id="rq-keeper-title">Keeper</h2>
              </div>
            </div>
            <p className="rq-keeper-lead">Your campaign, kept together. Keeper connects character sheets, campaign prep and live-session tools without trying to replace the people around the table.</p>
            <div className="rq-keeper-actions">
              <button className="rq-brand-button rq-brand-button-primary rq-brand-button-keeper" type="button" onClick={() => openProduct('keeper')}>
                Explore Keeper <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button className="rq-brand-button rq-brand-button-secondary" type="button" onClick={() => navigate('/auth?mode=register')}>Create account</button>
            </div>
          </div>

          <div className="rq-keeper-feature-panel" aria-label="Rookie Quest Keeper highlights">
            <div className="rq-keeper-panel-heading"><p>Built around the whole session</p><span>Live</span></div>
            <div className="rq-keeper-feature-list">
              {KEEPER_FEATURES.map((feature, index) => (
                <div key={feature}><span>{String(index + 1).padStart(2, '0')}</span><strong>{feature}</strong></div>
              ))}
            </div>
            <p className="rq-keeper-feature-note">The first finished piece of Rookie Quest — and the place we keep polishing while Forge takes shape.</p>
          </div>
        </section>

        <section ref={forgeRef} id="forge" className="rq-business-forge" aria-labelledby="rq-forge-title">
          <div className="rq-business-forge-copy">
            <p className="rq-forge-overline">Product 02 · In development</p>
            <div className="rq-forge-lockup">
              <ForgeMark />
              <div>
                <small>Rookie Quest</small>
                <h2 id="rq-forge-title">Forge</h2>
              </div>
            </div>
            <p className="rq-forge-tagline">Build worlds. Fuel adventures.</p>
            <p className="rq-forge-lead">A modular terrain system made for home 3D printers, reusable encounters and affordable expansion. Buy a file once, then print as much as your own table needs.</p>
            <div className="rq-forge-actions">
              <button type="button" className="rq-forge-button" onClick={() => openProduct('forge')}>See the Forge plan <ArrowRight size={16} aria-hidden="true" /></button>
              <span>Starter Set and free sample pack coming after physical testing.</span>
            </div>
          </div>

          <div className="rq-business-forge-board" aria-label="Rookie Quest Forge design principles">
            <div className="rq-forge-stamp">
              <ForgeMark />
              <strong>Rookie Quest Forge</strong>
              <span>Maker's mark</span>
            </div>
            <div className="rq-forge-feature-grid">
              {FORGE_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title}>
                    <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                    <h3>{feature.title}</h3>
                    <p>{feature.text}</p>
                  </article>
                );
              })}
            </div>
            <div className="rq-forge-edge-mark"><ForgeMark /><span>ROOKIE QUEST FORGE</span></div>
          </div>
        </section>

        <section ref={aboutRef} id="about" className="rq-brand-about rq-business-about" aria-labelledby="rq-about-title">
          <div className="rq-business-section-heading">
            <p className="rq-brand-kicker">Why Rookie Quest exists</p>
            <h2 id="rq-about-title">More adventures. Less friction.</h2>
            <p>Rookie Quest is for people who love making stories together. We want the tools around the hobby to be easier to understand, easier to use and easier to afford.</p>
          </div>
          <div className="rq-brand-principles">
            {BRAND_PRINCIPLES.map((principle) => {
              const Icon = principle.icon;
              return (
                <article key={principle.title}><span><Icon size={22} strokeWidth={1.7} aria-hidden="true" /></span><h3>{principle.title}</h3><p>{principle.text}</p></article>
              );
            })}
          </div>
        </section>

        <section className="rq-business-free" aria-labelledby="rq-free-title">
          <div className="rq-business-free-icon"><Download size={30} strokeWidth={1.6} aria-hidden="true" /></div>
          <div>
            <p className="rq-brand-kicker">Free resources</p>
            <h2 id="rq-free-title">Try Rookie Quest before you buy anything.</h2>
            <p>Forge will launch with a free sample pack so people can test the system on their own printer before paying for terrain. World can grow a library of free one-shots and previews alongside the paid catalogue.</p>
          </div>
          <button type="button" className="rq-brand-button rq-brand-button-secondary" onClick={() => scrollTo(forgeRef)}>See what is coming</button>
        </section>

        <section ref={roadmapRef} id="roadmap" className="rq-brand-roadmap rq-business-roadmap" aria-labelledby="rq-roadmap-title">
          <div className="rq-business-section-heading">
            <p className="rq-brand-kicker">The plan ahead</p>
            <h2 id="rq-roadmap-title">Build the business in the right order.</h2>
            <p>Keeper proves the software. Forge becomes the first focused digital product line. World follows with campaign settings, modules and adventures. The original RPG comes only when the rest has taught us enough to make it worth playing.</p>
          </div>
          <div className="rq-business-roadmap-rail">
            {PRODUCT_FAMILY.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.key} type="button" className={`is-${item.key}`} onClick={() => openProduct(item.key)}>
                  <span>{item.number}</span>
                  <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
                  <div><small>{item.status}</small><strong>{item.name}</strong><em>{item.verb}</em></div>
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>

        <section className="rq-business-join" aria-labelledby="rq-join-title">
          <Mail size={26} strokeWidth={1.6} aria-hidden="true" />
          <div><p className="rq-brand-kicker">Follow the quest</p><h2 id="rq-join-title">The next release should be worth hearing about.</h2><p>Email updates will come with the first commercial launch so people can hear about free samples, new releases and major Rookie Quest updates without needing to chase social feeds.</p></div>
          <span className="rq-business-coming">Mailing list coming before launch</span>
        </section>
      </main>

      <footer className="rq-brand-footer rq-brand-footer-expanded rq-business-footer">
        <div className="rq-brand-footer-brand">
          <div><BrandMark compact /><span>Rookie Quest</span></div>
          <p>Every legend starts somewhere.</p>
          <small>Play · Run · Explore · Build</small>
        </div>
        <div className="rq-brand-footer-products" aria-label="Rookie Quest products">
          {Object.values(BRAND_DESTINATIONS).map((destination) => (
            <button key={destination.key} type="button" onClick={() => openProduct(destination.key)}>
              <span>{destination.label}</span>
              <small>{destination.status === 'live' ? 'Available now' : 'Planned'}</small>
            </button>
          ))}
        </div>
        <p className="rq-business-footer-note">Rookie Quest is being built one useful product at a time. Shop, licensing and customer downloads arrive when the first paid product is ready.</p>
      </footer>
    </div>
  );
}
