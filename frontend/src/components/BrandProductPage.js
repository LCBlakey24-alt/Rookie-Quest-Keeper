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
    eyebrow: 'Rookie Quest Forge',
    status: 'In development',
    title: 'Build the battlefield.',
    intro: 'A modular 3D-printable terrain system designed to make physical encounters quicker to build, easier to store and flexible enough to reuse.',
    detail: 'The goal is not a pile of one-off scenery. Forge is being designed as a connected system of stackable frames, interchangeable tiles, walls, doors, stairs, elevation pieces, pillars, railings and themed encounter packs.',
    highlights: [
      { icon: Layers3, title: 'Modular by design', text: 'Mix floors, walls, doors, stairs and elevation instead of printing a whole new board for every encounter.' },
      { icon: Boxes, title: 'Stackable storage', text: 'Frames and pieces are being developed with storage and repeat use in mind, not just how they look on the table.' },
      { icon: PackageOpen, title: 'Printable packs', text: 'Future themed sets can bundle exactly the pieces needed for ruins, caves, streets, dungeons and complete encounters.' },
    ],
    footer: 'Forge will eventually become the home for downloadable Rookie Quest terrain files and encounter-ready print packs.',
  },
  worlds: {
    key: 'worlds',
    icon: Compass,
    eyebrow: 'Rookie Quest Worlds',
    status: 'In development',
    title: 'Explore somewhere new.',
    intro: 'Original campaign settings, adventures and lore built to give GMs a strong starting point without taking ownership of the story away from the table.',
    detail: 'Worlds can grow from full campaign settings down to individual cities, factions, adventures, creatures and encounter locations — with digital links back into Keeper and printable links into Forge.',
    highlights: [
      { icon: Map, title: 'Settings with room to breathe', text: 'Strong identities, locations and conflicts, while leaving enough space for a GM to make the world their own.' },
      { icon: ScrollText, title: 'Adventures that connect', text: 'Campaign and adventure material can eventually import useful NPCs, locations, quests and notes directly into Keeper.' },
      { icon: Sparkles, title: 'One world, many formats', text: 'Lore, adventures, digital campaign tools and matching terrain can all point back to the same source material.' },
    ],
    footer: 'Worlds is deliberately broad now so individual settings can have their own names and identities later without changing the Rookie Quest structure.',
  },
  game: {
    key: 'game',
    icon: Dices,
    eyebrow: 'The Rookie Quest Game',
    status: 'Future release',
    title: 'Play your own legend.',
    intro: 'A future original tabletop roleplaying system designed from the lessons we learn building tools, running campaigns and watching what actually helps people at the table.',
    detail: 'We are not locking in a final name or pretending the rules are finished before they exist. The system gets to earn its identity through playtesting, iteration and the wider Rookie Quest ecosystem.',
    highlights: [
      { icon: Users, title: 'Welcoming, not shallow', text: 'Easy to start should not mean there is nothing to master. New players and experienced tables should both have room to grow.' },
      { icon: Shield, title: 'Built for actual sessions', text: 'Rules should support the pace of play instead of forcing players to constantly stop and search for what they can do.' },
      { icon: BookOpen, title: 'Native to the ecosystem', text: 'When the system is ready, Keeper, Worlds and Forge should understand it from day one rather than bolting support on afterwards.' },
    ],
    footer: 'For now, Keeper remains system-friendly and the original game stays a future project rather than blocking the useful things we can build today.',
  },
};

export default function BrandProductPage({ product }) {
  const navigate = useNavigate();
  const data = PRODUCT_DATA[product] || PRODUCT_DATA.game;
  const Icon = data.icon;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${data.eyebrow} | Rookie Quest`;
    return () => { document.title = previousTitle; };
  }, [data.eyebrow]);

  return (
    <div className={`rq-brand-page rq-brand-product-page rq-brand-product-page-${data.key}`}>
      <nav className="rq-brand-nav" aria-label="Rookie Quest navigation">
        <button className="rq-brand-lockup" type="button" onClick={() => navigate('/')} aria-label="Rookie Quest home">
          <span className="rq-brand-mark" aria-hidden="true">RQ</span>
          <span className="rq-brand-lockup-text"><strong>Rookie Quest</strong><small>Every legend starts somewhere.</small></span>
        </button>
        <div className="rq-brand-nav-links">
          <button type="button" onClick={() => navigate('/keeper')}>Keeper</button>
          <button type="button" onClick={() => navigate('/forge')}>Forge</button>
          <button type="button" onClick={() => navigate('/worlds')}>Worlds</button>
          <button type="button" onClick={() => navigate('/game')}>The Game</button>
        </div>
        <button className="rq-brand-nav-cta" type="button" onClick={() => navigate('/keeper')}>Open Keeper <ArrowRight size={17} /></button>
      </nav>

      <main className="rq-brand-product-main">
        <button className="rq-brand-back" type="button" onClick={() => navigate('/')}><ArrowLeft size={17} /> Back to Rookie Quest</button>

        <section className="rq-brand-product-hero">
          <div className="rq-brand-product-hero-icon"><Icon size={38} aria-hidden="true" /></div>
          <p className="rq-brand-section-kicker">{data.eyebrow}</p>
          <span className="rq-brand-product-page-status">{data.status}</span>
          <h1>{data.title}</h1>
          <p className="rq-brand-product-page-intro">{data.intro}</p>
          <p className="rq-brand-product-page-detail">{data.detail}</p>
        </section>

        <section className="rq-brand-highlight-grid" aria-label={`${data.eyebrow} goals`}>
          {data.highlights.map((item) => {
            const ItemIcon = item.icon;
            return (
              <article key={item.title}>
                <ItemIcon size={24} aria-hidden="true" />
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </article>
            );
          })}
        </section>

        <section className="rq-brand-product-note">
          <p>{data.footer}</p>
          <div>
            <button className="rq-brand-button rq-brand-button-secondary" type="button" onClick={() => navigate('/')}>Explore the whole brand</button>
            <button className="rq-brand-button rq-brand-button-primary" type="button" onClick={() => navigate('/keeper')}>See what is live now <ArrowRight size={18} /></button>
          </div>
        </section>
      </main>
    </div>
  );
}
