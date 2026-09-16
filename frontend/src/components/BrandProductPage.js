import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Boxes,
  Compass,
  Dices,
  Hammer,
  Layers3,
  Map,
  PackageOpen,
  ScrollText,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import '@/styles/rookieQuestBrand.css';

const PRODUCT_DATA = {
  forge: {
    key: 'forge',
    icon: Hammer,
    name: 'Forge',
    verb: 'Build',
    status: 'In development',
    title: 'Build the battlefield.',
    intro: 'Modular 3D-printable terrain designed to be reused, expanded, stored and rebuilt around whatever encounter comes next.',
    detail: 'Forge is being designed as a system rather than a pile of one-off scenery: stackable frames, interchangeable tiles, walls, doors, stairs, elevation, pillars, railings and themed encounter packs that all understand the same base language.',
    highlights: [
      { icon: Layers3, title: 'One modular standard', text: 'Floors, walls, doors and elevation are designed to work together rather than becoming isolated print projects.' },
      { icon: Boxes, title: 'Made to store', text: 'Frames and pieces are being developed around stacking, repeat use and practical storage as much as table presence.' },
      { icon: PackageOpen, title: 'Encounter-ready packs', text: 'Future sets can bundle exactly what a ruin, cave, street, dungeon or published adventure needs.' },
    ],
    footer: 'Forge will become the home for downloadable Rookie Quest terrain files and complete printable encounter packs.',
  },
  worlds: {
    key: 'worlds',
    icon: BookOpen,
    name: 'Worlds',
    verb: 'Explore',
    status: 'In development',
    title: 'Explore somewhere new.',
    intro: 'Original campaign settings, adventures and lore built to give a table a strong starting point without deciding the story for it.',
    detail: 'Worlds can grow from full campaign settings down to cities, factions, adventures, creatures and individual encounter locations — all with room to connect back into Keeper and Forge when that adds something useful.',
    highlights: [
      { icon: Map, title: 'Places worth exploring', text: 'Distinct locations, conflicts and cultures with enough open space for a GM to make the setting their own.' },
      { icon: ScrollText, title: 'Adventures that connect', text: 'Published material can eventually feed useful NPCs, locations, quests and notes straight into Keeper.' },
      { icon: Sparkles, title: 'One source, many formats', text: 'Lore, campaign tools and matching terrain can all point back to the same world instead of living in separate silos.' },
    ],
    footer: 'Worlds stays broad on purpose so individual settings can build their own identities without changing the Rookie Quest structure.',
  },
  game: {
    key: 'game',
    icon: Dices,
    name: 'The Game',
    verb: 'Play',
    status: 'Future release',
    title: 'Play your own legend.',
    intro: 'A future original tabletop roleplaying game shaped by what we learn from building tools, running campaigns and watching what actually helps at the table.',
    detail: 'We are deliberately not pretending the rules are finished before they exist. The game gets to earn its final name, identity and mechanics through playtesting, iteration and the wider Rookie Quest ecosystem.',
    highlights: [
      { icon: Users, title: 'Welcoming, not shallow', text: 'Easy to start should still leave experienced players with choices, mastery and room to build something personal.' },
      { icon: Shield, title: 'Built for sessions', text: 'Rules should support momentum at the table instead of constantly sending players away to search for what they can do.' },
      { icon: Compass, title: 'Native to Rookie Quest', text: 'When it is ready, Keeper, Worlds and Forge should understand the game from day one rather than bolting support on afterwards.' },
    ],
    footer: 'For now, the original game remains a future project while Keeper, Forge and Worlds give us real things to learn from today.',
  },
};

function BrandMark() {
  return (
    <span className="rq-brand-compass rq-brand-compass-compact" aria-hidden="true">
      <Compass size={22} strokeWidth={1.6} />
    </span>
  );
}

export default function BrandProductPage({ product }) {
  const navigate = useNavigate();
  const data = PRODUCT_DATA[product] || PRODUCT_DATA.game;
  const Icon = data.icon;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `Rookie Quest ${data.name} | ${data.verb}`;
    return () => { document.title = previousTitle; };
  }, [data.name, data.verb]);

  return (
    <div className={`rq-brand-page rq-brand-product-page rq-brand-product-page-${data.key}`}>
      <nav className="rq-brand-nav" aria-label="Rookie Quest navigation">
        <button className="rq-brand-lockup" type="button" onClick={() => navigate('/')} aria-label="Rookie Quest home">
          <BrandMark />
          <span className="rq-brand-lockup-name">Rookie Quest</span>
        </button>

        <div className="rq-brand-nav-links">
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

      <main className="rq-brand-product-main">
        <button className="rq-brand-back" type="button" onClick={() => navigate('/')}>
          <ArrowLeft size={16} aria-hidden="true" /> Rookie Quest
        </button>

        <section className="rq-brand-product-hero">
          <div className="rq-brand-product-hero-icon"><Icon size={32} strokeWidth={1.6} aria-hidden="true" /></div>
          <p className="rq-brand-product-overline">Rookie Quest</p>
          <h1>{data.name}</h1>
          <div className="rq-brand-product-meta">
            <span>{data.verb}</span>
            <i aria-hidden="true" />
            <span>{data.status}</span>
          </div>
          <h2>{data.title}</h2>
          <p className="rq-brand-product-page-intro">{data.intro}</p>
          <p className="rq-brand-product-page-detail">{data.detail}</p>
        </section>

        <section className="rq-brand-highlight-grid" aria-label={`${data.name} goals`}>
          {data.highlights.map((item) => {
            const ItemIcon = item.icon;
            return (
              <article key={item.title}>
                <ItemIcon size={23} strokeWidth={1.7} aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </section>

        <section className="rq-brand-product-note">
          <p>{data.footer}</p>
          <div>
            <button className="rq-brand-button rq-brand-button-secondary" type="button" onClick={() => navigate('/')}>
              Back to Rookie Quest
            </button>
            <button className="rq-brand-button rq-brand-button-primary" type="button" onClick={() => navigate('/keeper')}>
              See what is live now <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
