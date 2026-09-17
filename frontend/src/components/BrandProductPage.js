import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Compass,
  Dices,
  Hammer,
} from 'lucide-react';
import WorldsLandingPage from '@/components/WorldsLandingPage';
import TiaKartaWorldPage from '@/components/TiaKartaWorldPage';
import { openBrandDestination } from '@/config/brandDestinations';
import '@/styles/rookieQuestBrand.css';

const PRODUCT_DATA = {
  forge: {
    key: 'forge',
    icon: Hammer,
    name: 'Forge',
    verb: 'Build',
    status: 'Roadmap · Next after Keeper',
    title: 'Designed first. Published later.',
    intro: 'Forge is an active Rookie Quest development project, but it is not a finished public product yet. The modular tiles, connectors, elevation system and starter range need to be completed and physically tested before this becomes a real Forge website or catalogue.',
  },
  worlds: {
    key: 'worlds',
    icon: BookOpen,
    name: 'Worlds',
    verb: 'Explore',
    status: 'Roadmap · Later',
    title: 'A future home for our settings and adventures.',
    intro: 'Worlds is part of the long-term Rookie Quest plan. We will build its public experience after Keeper is polished and Forge has earned its own finished product release.',
  },
  game: {
    key: 'game',
    icon: Dices,
    name: 'Rookie Quest RPG',
    verb: 'Play',
    status: 'Roadmap · Future',
    title: 'The game comes when the game is ready.',
    intro: 'Our own tabletop roleplaying system is a future goal, not something we need to rush into a website today. Keeper comes first, followed by Forge and Worlds, so the eventual RPG can grow from things we have actually built and used.',
  },
};

const TIA_KARTA_SHORTCUT_STYLE = {
  position: 'fixed',
  right: '18px',
  bottom: '18px',
  zIndex: 80,
  minHeight: '46px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '0 15px',
  border: '1px solid rgba(240, 215, 165, 0.62)',
  borderRadius: '2px',
  background: 'linear-gradient(180deg, #e4c48f, #bd9259)',
  color: '#07131d',
  boxShadow: '0 14px 38px rgba(0,0,0,.34)',
  cursor: 'pointer',
  fontSize: '10px',
  fontWeight: 950,
  letterSpacing: '.09em',
  textTransform: 'uppercase',
};

function BrandMark() {
  return (
    <span className="rq-brand-compass rq-brand-compass-compact" aria-hidden="true">
      <Compass size={22} strokeWidth={1.6} />
    </span>
  );
}

function RoadmapProductPage({ product }) {
  const navigate = useNavigate();
  const data = PRODUCT_DATA[product] || PRODUCT_DATA.game;
  const Icon = data.icon;
  const openProduct = (key) => openBrandDestination(navigate, key);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `Rookie Quest ${data.name} | Roadmap`;
    return () => { document.title = previousTitle; };
  }, [data.name]);

  const returnToRoadmap = () => {
    navigate('/');
    window.setTimeout(() => {
      document.getElementById('roadmap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  return (
    <div className={`rq-brand-page rq-brand-product-page rq-brand-product-page-${data.key}`}>
      <nav className="rq-brand-nav" aria-label="Rookie Quest navigation">
        <button className="rq-brand-lockup" type="button" onClick={() => navigate('/')} aria-label="Rookie Quest home">
          <BrandMark />
          <span className="rq-brand-lockup-name">Rookie Quest</span>
        </button>

        <div className="rq-brand-nav-links">
          <button type="button" onClick={() => openProduct('keeper')}>Keeper</button>
          <button type="button" onClick={returnToRoadmap}>Roadmap</button>
        </div>

        <div className="rq-brand-nav-actions">
          <button className="rq-brand-nav-signin" type="button" onClick={() => navigate('/auth')}>Sign in</button>
          <button className="rq-brand-nav-cta" type="button" onClick={() => openProduct('keeper')}>
            Open Keeper <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </nav>

      <main className="rq-brand-product-main">
        <button className="rq-brand-back" type="button" onClick={returnToRoadmap}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to the roadmap
        </button>

        <section className="rq-brand-product-hero">
          <div className="rq-brand-product-hero-icon"><Icon size={32} strokeWidth={1.6} aria-hidden="true" /></div>
          <p className="rq-brand-product-overline">Rookie Quest roadmap</p>
          <h1>{data.name}</h1>
          <div className="rq-brand-product-meta">
            <span>{data.verb}</span>
            <i aria-hidden="true" />
            <span>{data.status}</span>
          </div>
          <h2>{data.title}</h2>
          <p className="rq-brand-product-page-intro">{data.intro}</p>
        </section>

        <section className="rq-brand-product-note">
          <p>For now, Rookie Quest development is focused on making Keeper the strongest first product it can be.</p>
          <div>
            <button className="rq-brand-button rq-brand-button-secondary" type="button" onClick={returnToRoadmap}>
              See the Rookie Quest roadmap
            </button>
            <button className="rq-brand-button rq-brand-button-primary" type="button" onClick={() => openProduct('keeper')}>
              Explore Keeper <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function BrandProductPage({ product }) {
  const location = useLocation();
  const navigate = useNavigate();

  if (product === 'worlds') {
    const setting = new URLSearchParams(location.search).get('setting');
    if (setting === 'tia-karta') return <TiaKartaWorldPage />;

    return (
      <>
        <WorldsLandingPage />
        <button
          type="button"
          style={TIA_KARTA_SHORTCUT_STYLE}
          onClick={() => navigate('/worlds?setting=tia-karta')}
          aria-label="Open the Tia-Karta setting prototype"
        >
          Tia-Karta prototype <ArrowRight size={15} aria-hidden="true" />
        </button>
      </>
    );
  }

  return <RoadmapProductPage product={product} />;
}
