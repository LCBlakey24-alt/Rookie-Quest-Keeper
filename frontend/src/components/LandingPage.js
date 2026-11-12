import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { BrandMainLogo, BrandMiniLogo } from '@/components/ui/BrandLogo';
import GuildChoiceWheel from '@/components/guild-motif/GuildChoiceWheel';
import '@/styles/landingProductionTrust.css';
import '@/styles/keeperProductSite.css';
import '@/styles/guildTokens.css';
import '@/styles/landingGuild.css';

const LANDING_META_DESCRIPTION = 'Rookie Quest Keeper keeps characters, campaigns, session prep, notes, and live table tools together in one refined tabletop workspace.';

/*
 * The parts of Keeper a visitor can explore on the wheel. `next` is where a
 * new account lands after signing up from that section.
 */
export const LANDING_SECTIONS = [
  {
    id: 'characters',
    label: 'Characters',
    title: 'My Characters',
    text: 'Build a hero in one guided creator, then play from a sheet made for the table.',
    points: [
      'Choose race and class on the wheel, then roll or buy ability scores',
      'The sheet tracks hit points, spells, equipment and conditions',
      'Level up when your GM says so, with every choice explained',
    ],
    next: '/characters/new',
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    title: 'My Campaigns',
    text: 'Your campaign library: the people, places and quests your table keeps coming back to.',
    points: [
      'NPCs, locations, quests, maps and handouts linked together',
      'Invite your players and share what they should see',
      'Run several quests at once without losing the thread',
    ],
    next: '/campaigns',
  },
  {
    id: 'live-play',
    label: 'Live Play',
    title: 'Live Play',
    text: 'The GM screen for session night. Look things up fast and make quick updates without leaving the table.',
    points: [
      'Find an NPC, place or rule in seconds',
      'Start an encounter from the ones you prepared',
      'Combat hands you back to Live Play when it ends',
    ],
    next: '/campaigns',
  },
  {
    id: 'homebrew',
    label: 'Homebrew',
    title: 'Homebrew',
    text: 'Make your own spells, items, monsters and subclasses, and use them in your games.',
    points: [
      'Draft, review, then save into your library',
      'Keep it private or share it with your table',
      'Use it in the character creator and on the sheet',
    ],
    next: '/homebrew',
  },
  {
    id: 'community',
    label: 'Community',
    title: 'Community Creations',
    text: 'Browse what other players and GMs have shared, and add the best of it to your own library.',
    points: [
      'Search by type: spells, items, monsters and more',
      'Copy a creation into your homebrew to adapt it',
      'Share your own when it is ready',
    ],
    next: '/community',
  },
  {
    id: 'rook',
    label: 'Rook',
    title: 'Rook, your table helper',
    text: 'Ask Rook for a name, a ruling or a next step. Rook suggests; you decide what becomes part of your campaign.',
    points: [
      'Short, table-ready answers during play',
      'Drafts you review before anything is saved',
      'Never changes your campaign on its own',
    ],
    next: '/home',
  },
];

const VIEW_KEY = 'rqk.landing.view';

function loadView() {
  try { return window.localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'wheel'; } catch { return 'wheel'; }
}

function SectionCard({ section, index, onStart, headingLevel = 'h2' }) {
  const Heading = headingLevel;
  return (
    <article className="landing-section-card" data-testid={`landing-section-${section.id}`}>
      <span className="landing-section-card__count">{index + 1} of {LANDING_SECTIONS.length}</span>
      <Heading>{section.title}</Heading>
      <p>{section.text}</p>
      <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>
      <button type="button" className="landing-button landing-button-ghost landing-section-card__start" onClick={() => onStart(section)}>
        Start with {section.label} <ArrowRight size={16} aria-hidden="true" />
      </button>
    </article>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState(LANDING_SECTIONS[0].id);
  const [view, setView] = useState(loadView);
  const activeIndex = Math.max(0, LANDING_SECTIONS.findIndex((section) => section.id === activeId));
  const active = LANDING_SECTIONS[activeIndex];

  // Never delay routing for an animation.
  const navigateWithFill = useCallback((target, nextPage) => {
    navigate(target, nextPage ? { state: { from: { pathname: nextPage } } } : undefined);
  }, [navigate]);

  useEffect(() => {
    const previousTitle = document.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    const previousDescription = metaDescription?.getAttribute('content') ?? null;
    const createdMeta = !metaDescription;
    const activeMetaDescription = metaDescription ?? document.createElement('meta');

    document.title = 'Rookie Quest Keeper | Your campaign, kept together';
    activeMetaDescription.setAttribute('name', 'description');
    activeMetaDescription.setAttribute('content', LANDING_META_DESCRIPTION);

    if (createdMeta) document.head.appendChild(activeMetaDescription);

    return () => {
      document.title = previousTitle;
      if (createdMeta) {
        activeMetaDescription.remove();
      } else if (previousDescription !== null) {
        activeMetaDescription.setAttribute('content', previousDescription);
      }
    };
  }, []);

  const goLogin = () => navigateWithFill('/auth');
  const goRegister = () => navigateWithFill('/auth?mode=register');
  const startWith = (section) => navigateWithFill('/auth?mode=register', section.next);
  const turn = (step) => setActiveId(LANDING_SECTIONS[(activeIndex + step + LANDING_SECTIONS.length) % LANDING_SECTIONS.length].id);
  const toggleView = () => setView((current) => {
    const next = current === 'list' ? 'wheel' : 'list';
    try { window.localStorage.setItem(VIEW_KEY, next); } catch { /* not stored */ }
    return next;
  });

  return (
    <div data-testid="landing-page" className="landing-page landing-page-clean landing-page-final keeper-product-site">
      <a className="landing-skip-link" href="#landing-main">Skip to landing content</a>

      <nav className="landing-final-nav" aria-label="Rookie Quest Keeper navigation">
        <button type="button" className="landing-nav-brand" onClick={() => navigate('/')} aria-label="Rookie Quest Keeper home">
          <BrandMiniLogo size={42} alt="" />
          <span><BrandMainLogo width={168} alt="Rookie Quest Keeper" /></span>
        </button>
        <div className="landing-nav-actions">
          <button data-testid="landing-signin-btn" type="button" className="landing-button landing-button-ghost" onClick={goLogin}>
            Sign in
          </button>
          <button data-testid="landing-getstarted-btn" type="button" className="landing-button landing-button-primary" onClick={goRegister}>
            Open Keeper <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </nav>

      <main id="landing-main" className="landing-final-main">
        <section className="landing-final-hero" aria-labelledby="landing-hero-title">
          <div className="landing-hero-copy">
            <p className="landing-kicker">Your tabletop companion</p>
            <h1 id="landing-hero-title">Your campaign.<br />Kept together.</h1>
            <p className="landing-final-intro">
              Characters, campaigns and live-table tools in one place. Turn the wheel to see what each part of Keeper does.
            </p>
            <div className="landing-hero-actions" aria-label="Landing page actions">
              <button data-testid="landing-cta-btn" type="button" className="landing-button landing-button-primary landing-button-large" onClick={goRegister}>
                Open Keeper <ArrowRight size={18} aria-hidden="true" />
              </button>
              <button type="button" className="landing-button landing-button-ghost landing-button-large" onClick={goLogin}>
                Sign in
              </button>
            </div>
          </div>

          <div className="landing-explore" aria-labelledby="landing-explore-title">
            <div className="landing-explore__head">
              <h2 id="landing-explore-title" className="landing-explore__title">Explore Keeper</h2>
              <button type="button" className="landing-button landing-button-ghost landing-explore__toggle" onClick={toggleView} aria-pressed={view === 'list'} data-testid="landing-view-toggle">
                <List size={16} aria-hidden="true" /> {view === 'list' ? 'Show as wheel' : 'Show as list'}
              </button>
            </div>

            {view === 'wheel' ? (
              <>
                <div className="landing-explore__wheel-row">
                  <button type="button" className="landing-explore__arrow" onClick={() => turn(-1)} aria-label="Turn to the previous section" data-testid="landing-wheel-prev">
                    <ChevronLeft size={24} aria-hidden="true" />
                  </button>
                  <GuildChoiceWheel
                    label="Parts of Keeper"
                    caption="EXPLORE"
                    options={LANDING_SECTIONS.map((section) => ({ id: section.id, label: section.label, short: section.label.toUpperCase() }))}
                    value={activeId}
                    onChange={setActiveId}
                    onConfirm={() => startWith(active)}
                    confirmLabel="OPEN"
                    confirmAria={`Open ${active.title} in Keeper`}
                  />
                  <button type="button" className="landing-explore__arrow" onClick={() => turn(1)} aria-label="Turn to the next section" data-testid="landing-wheel-next">
                    <ChevronRight size={24} aria-hidden="true" />
                  </button>
                </div>
                <p className="landing-explore__hint"><span className="landing-explore__hint--touch">Turn the wheel with your finger, or tap a wedge.</span><span className="landing-explore__hint--pointer">Drag the wheel round, tap a wedge, or use the arrows.</span></p>
                <div aria-live="polite">
                  <SectionCard section={active} index={activeIndex} onStart={startWith} headingLevel="h3" />
                </div>
                <div className="landing-explore__dots" aria-hidden="true">
                  {LANDING_SECTIONS.map((section) => <span key={section.id} className={section.id === activeId ? 'is-on' : ''} />)}
                </div>
              </>
            ) : (
              <div className="landing-explore__list" data-testid="landing-section-list">
                {LANDING_SECTIONS.map((section, index) => (
                  <SectionCard key={section.id} section={section} index={index} onStart={startWith} headingLevel="h3" />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="landing-final-footer landing-product-footer">
        <div className="landing-footer-brand">
          <BrandMiniLogo size={40} />
          <div>
            <strong>Rookie Quest Keeper</strong>
            <p>Plan. Organise. Play.</p>
          </div>
        </div>
        <p className="landing-footer-note">© {new Date().getFullYear()} Rookie Quest Keeper. Independent tabletop campaign companion.</p>
      </footer>
    </div>
  );
}
