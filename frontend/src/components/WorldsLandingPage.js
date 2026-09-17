import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Castle,
  Compass,
  Globe2,
  Hammer,
  Layers,
  Map,
  Mountain,
  ScrollText,
  Sparkles,
  Users,
} from 'lucide-react';
import { openBrandDestination } from '@/config/brandDestinations';
import '@/styles/rookieQuestWorlds.css';

const DISCOVERY_CARDS = [
  {
    icon: Globe2,
    eyebrow: 'Complete settings',
    title: 'Worlds',
    copy: 'Explore full campaign settings with regions, history, factions, cultures, mysteries and room to make them your own.',
  },
  {
    icon: ScrollText,
    eyebrow: 'Ready to run',
    title: 'Adventures',
    copy: 'From one-night stories to longer campaigns, built to give GMs a strong starting point without locking down every choice.',
  },
  {
    icon: Castle,
    eyebrow: 'Drop-in locations',
    title: 'Places',
    copy: 'Cities, villages, ruins, dungeons and landmarks designed to work inside a Rookie Quest setting or your own homebrew world.',
  },
  {
    icon: Users,
    eyebrow: 'Stories need people',
    title: 'People & Creatures',
    copy: 'NPCs, factions, villains, allies and creatures with enough detail to feel alive at the table without becoming homework.',
  },
  {
    icon: Map,
    eyebrow: 'Useful at the table',
    title: 'Maps & Tools',
    copy: 'Regional maps, encounter aids, rumours, quest prompts and practical GM tools that make a setting easier to actually run.',
  },
];

function WorldsMark({ compact = false }) {
  return (
    <span className={`rq-worlds-mark${compact ? ' rq-worlds-mark-compact' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 120 120" role="img" focusable="false">
        <circle cx="60" cy="48" r="34" className="rq-worlds-mark-ring" />
        <path d="M60 10 68 38 96 48 68 57 60 86 52 57 24 48 52 38Z" className="rq-worlds-mark-star" />
        <path d="M60 22 64 43 82 48 64 53 60 74 56 53 38 48 56 43Z" className="rq-worlds-mark-star-inner" />
        <path d="M19 84c14-6 27-4 41 6 14-10 27-12 41-6v20c-14-5-27-3-41 7-14-10-27-12-41-7Z" className="rq-worlds-mark-book" />
        <path d="M60 90v21" className="rq-worlds-mark-line" />
        <path d="M26 84 40 69l10 10 10-15 12 15 8-9 15 15" className="rq-worlds-mark-mountains" />
      </svg>
    </span>
  );
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function WorldsLandingPage() {
  const navigate = useNavigate();
  const openProduct = (key) => openBrandDestination(navigate, key);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Rookie Quest Worlds | Explore New Realms';
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <div className="rq-worlds-page">
      <div className="rq-worlds-map-texture" aria-hidden="true" />

      <nav className="rq-worlds-nav" aria-label="Rookie Quest Worlds navigation">
        <button className="rq-worlds-brand" type="button" onClick={() => navigate('/')} aria-label="Rookie Quest home">
          <WorldsMark compact />
          <span>
            <strong>Rookie Quest</strong>
            <small>Worlds</small>
          </span>
        </button>

        <div className="rq-worlds-nav-links">
          <button type="button" onClick={() => scrollToSection('discover')}>Discover</button>
          <button type="button" onClick={() => scrollToSection('tia-karta')}>Tia-Karta</button>
          <button type="button" onClick={() => scrollToSection('ecosystem')}>Connected play</button>
        </div>

        <div className="rq-worlds-nav-actions">
          <button className="rq-worlds-nav-ghost" type="button" onClick={() => navigate('/')}>
            <ArrowLeft size={15} aria-hidden="true" /> Rookie Quest
          </button>
          <button className="rq-worlds-nav-primary" type="button" onClick={() => openProduct('keeper')}>
            Open Keeper <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </nav>

      <main>
        <section className="rq-worlds-hero">
          <div className="rq-worlds-hero-copy">
            <div className="rq-worlds-status"><Sparkles size={14} aria-hidden="true" /> In development · Worlds preview</div>
            <p className="rq-worlds-kicker">Maps. Stories. Peoples. Places. Beyond.</p>
            <div className="rq-worlds-title-lockup">
              <WorldsMark />
              <div>
                <span>Rookie Quest</span>
                <h1>Worlds</h1>
              </div>
            </div>
            <h2>Explore new realms.<br />Tell greater stories.</h2>
            <p className="rq-worlds-hero-intro">
              A future home for campaign settings, adventures, locations, characters, creatures and maps made to be picked up, remixed and played.
            </p>
            <div className="rq-worlds-hero-actions">
              <button className="rq-worlds-button rq-worlds-button-primary" type="button" onClick={() => scrollToSection('discover')}>
                Explore the vision <Compass size={17} aria-hidden="true" />
              </button>
              <button className="rq-worlds-button rq-worlds-button-secondary" type="button" onClick={() => scrollToSection('tia-karta')}>
                Preview Tia-Karta <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
            <p className="rq-worlds-roadmap-note">Worlds is being designed now, but it is not being presented as a finished shop or released product yet.</p>
          </div>

          <div className="rq-worlds-hero-atlas" aria-hidden="true">
            <div className="rq-worlds-atlas-frame">
              <div className="rq-worlds-atlas-compass"><Compass size={56} strokeWidth={1} /></div>
              <div className="rq-worlds-atlas-land rq-worlds-atlas-land-one" />
              <div className="rq-worlds-atlas-land rq-worlds-atlas-land-two" />
              <div className="rq-worlds-atlas-route" />
              <div className="rq-worlds-atlas-pin rq-worlds-atlas-pin-one"><Mountain size={19} /></div>
              <div className="rq-worlds-atlas-pin rq-worlds-atlas-pin-two"><Castle size={18} /></div>
              <div className="rq-worlds-atlas-label rq-worlds-atlas-label-one">THE SILVER REACHES</div>
              <div className="rq-worlds-atlas-label rq-worlds-atlas-label-two">TIA-KARTA</div>
            </div>
            <div className="rq-worlds-atlas-caption">
              <BookOpen size={18} aria-hidden="true" />
              <span>Made to feel like opening an atlas, not browsing a catalogue.</span>
            </div>
          </div>
        </section>

        <section className="rq-worlds-manifesto" aria-label="Rookie Quest Worlds principles">
          <span><BookOpen size={20} /> <strong>Lore for adventure</strong><small>Rich settings. Useful detail.</small></span>
          <span><Mountain size={20} /> <strong>Worlds to explore</strong><small>Far places. Bold discoveries.</small></span>
          <span><ScrollText size={20} /> <strong>Built for storytelling</strong><small>Play. Create. Belong.</small></span>
          <span><Compass size={20} /> <strong>Made to be used</strong><small>Maps, settings and table tools.</small></span>
        </section>

        <section className="rq-worlds-section rq-worlds-discover" id="discover">
          <div className="rq-worlds-section-heading">
            <p>Choose your way in</p>
            <h2>One world can become a hundred different campaigns.</h2>
            <span>Worlds is being structured so you can buy into a whole setting later, or simply take the pieces that are useful for your own table.</span>
          </div>

          <div className="rq-worlds-discovery-grid">
            {DISCOVERY_CARDS.map(({ icon: Icon, eyebrow, title, copy }) => (
              <article className="rq-worlds-discovery-card" key={title}>
                <div className="rq-worlds-discovery-icon"><Icon size={25} strokeWidth={1.5} aria-hidden="true" /></div>
                <p>{eyebrow}</p>
                <h3>{title}</h3>
                <span>{copy}</span>
                <div className="rq-worlds-card-status">Planned collection</div>
              </article>
            ))}
          </div>
        </section>

        <section className="rq-worlds-tia" id="tia-karta">
          <div className="rq-worlds-tia-map" aria-hidden="true">
            <div className="rq-worlds-tia-map-ring" />
            <div className="rq-worlds-tia-continent rq-worlds-tia-continent-a" />
            <div className="rq-worlds-tia-continent rq-worlds-tia-continent-b" />
            <div className="rq-worlds-tia-continent rq-worlds-tia-continent-c" />
            <span className="rq-worlds-tia-map-label">TIA-KARTA</span>
          </div>

          <div className="rq-worlds-tia-copy">
            <p className="rq-worlds-kicker">Featured world · Prototype</p>
            <h2>Tia-Karta</h2>
            <h3>The first setting we can use to prove what Rookie Quest Worlds should become.</h3>
            <p>
              Instead of filling this page with fake products, Tia-Karta will be our working example: a real world we can shape into regions, places, people, adventures and practical GM material while the Worlds format is developed.
            </p>

            <div className="rq-worlds-tia-chapters">
              <span><strong>01</strong> World & regions</span>
              <span><strong>02</strong> Cities & places</span>
              <span><strong>03</strong> People & factions</span>
              <span><strong>04</strong> Adventures & hooks</span>
              <span><strong>05</strong> Maps & play tools</span>
            </div>

            <button className="rq-worlds-button rq-worlds-button-secondary" type="button" onClick={() => scrollToSection('ecosystem')}>
              See how Worlds connects <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="rq-worlds-section rq-worlds-ecosystem" id="ecosystem">
          <div className="rq-worlds-section-heading rq-worlds-section-heading-centered">
            <p>One Rookie Quest ecosystem</p>
            <h2>Discover it. Build it. Run it.</h2>
            <span>Worlds gets much more useful when the same adventure can connect to the tools and terrain around it.</span>
          </div>

          <div className="rq-worlds-ecosystem-flow">
            <article>
              <div className="rq-worlds-ecosystem-number">01</div>
              <BookOpen size={30} strokeWidth={1.4} aria-hidden="true" />
              <p>Rookie Quest Worlds</p>
              <h3>Discover the story</h3>
              <span>Settings, adventures, maps, places and people.</span>
              <small>This page · In development</small>
            </article>
            <div className="rq-worlds-flow-arrow"><ArrowRight size={20} /></div>
            <article>
              <div className="rq-worlds-ecosystem-number">02</div>
              <Hammer size={30} strokeWidth={1.4} aria-hidden="true" />
              <p>Rookie Quest Forge</p>
              <h3>Build the table</h3>
              <span>Modular printable terrain that can support matching encounters and locations.</span>
              <button type="button" onClick={() => openProduct('forge')}>View Forge roadmap <ArrowRight size={14} /></button>
            </article>
            <div className="rq-worlds-flow-arrow"><ArrowRight size={20} /></div>
            <article>
              <div className="rq-worlds-ecosystem-number">03</div>
              <Layers size={30} strokeWidth={1.4} aria-hidden="true" />
              <p>Rookie Quest Keeper</p>
              <h3>Run the campaign</h3>
              <span>Bring campaign material into the software that helps you manage play.</span>
              <button type="button" onClick={() => openProduct('keeper')}>Explore Keeper <ArrowRight size={14} /></button>
            </article>
          </div>
        </section>

        <section className="rq-worlds-closing">
          <WorldsMark />
          <p>Rookie Quest Worlds</p>
          <h2>Small marks. Bigger journeys.</h2>
          <span>This is the start of the Worlds identity and website — not the finished destination.</span>
          <div>
            <button className="rq-worlds-button rq-worlds-button-secondary" type="button" onClick={() => navigate('/')}>
              <ArrowLeft size={17} aria-hidden="true" /> Back to Rookie Quest
            </button>
            <button className="rq-worlds-button rq-worlds-button-primary" type="button" onClick={() => scrollToSection('tia-karta')}>
              Return to Tia-Karta <Compass size={17} aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>

      <footer className="rq-worlds-footer">
        <span>Rookie Quest Worlds · Explore new realms. Tell greater stories.</span>
        <span>Worlds preview · Not yet a released product</span>
      </footer>
    </div>
  );
}
