import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Castle,
  ChevronRight,
  Compass,
  Crown,
  MapPinned,
  NotebookPen,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react';
import { BrandMainLogo, BrandMiniLogo } from '@/components/ui/BrandLogo';
import '@/styles/landingProductionTrust.css';
import '@/styles/keeperProductSite.css';

const BUTTON_FILL_DELAY_MS = 320;
const LANDING_META_DESCRIPTION = 'Rookie Quest Keeper keeps characters, campaigns, session prep, notes, and live table tools together in one refined tabletop workspace.';

const pillars = [
  {
    icon: Users,
    label: 'Characters',
    text: 'Bring your party to life and keep their stories close.',
  },
  {
    icon: BookOpen,
    label: 'Campaigns',
    text: 'Plan rich worlds and unforgettable adventures.',
  },
  {
    icon: CalendarDays,
    label: 'Sessions',
    text: 'Stay organised from prep to play.',
  },
  {
    icon: Swords,
    label: 'Live play',
    text: 'Keep the table moving when the dice start rolling.',
  },
];

const featureCards = [
  {
    icon: Compass,
    title: 'Rich campaign tools',
    text: 'Keep locations, NPCs, quests, maps, notes, and campaign context connected in one place.',
  },
  {
    icon: NotebookPen,
    title: 'Flexible note taking',
    text: 'Capture session notes, plot ideas, handouts, prep, and table reminders without losing the thread.',
  },
  {
    icon: Users,
    title: 'Built for the whole table',
    text: 'Players get clear character tools while GMs keep the wider campaign organised behind the screen.',
  },
  {
    icon: Sparkles,
    title: 'Less admin, more adventure',
    text: 'Put the useful information close to the moment you need it so the game keeps moving.',
  },
];

const workflow = [
  {
    number: '1',
    title: 'Plan',
    text: 'Build your world, characters, and campaign details.',
  },
  {
    number: '2',
    title: 'Organise',
    text: 'Keep notes, NPCs, locations, sessions, and quests together.',
  },
  {
    number: '3',
    title: 'Play',
    text: 'Open the right tools quickly while everyone is at the table.',
  },
  {
    number: '4',
    title: 'Grow',
    text: 'Carry decisions, notes, and story progress into the next session.',
  },
];

const faqItems = [
  {
    question: 'What is Rookie Quest Keeper?',
    answer: 'Rookie Quest Keeper is a tabletop campaign companion for organising characters, campaigns, session prep, notes, live play, and GM tools in one connected workspace.',
  },
  {
    question: 'Is it for both players and GMs?',
    answer: 'Yes. Players get character-focused tools and readable sheets, while GMs get campaign prep, notes, locations, NPCs, encounters, handouts, and live-session support.',
  },
  {
    question: 'Can I use it for 5e-style campaigns?',
    answer: 'Yes. Keeper currently focuses on 5e-style play while keeping campaign organisation and table tools useful beyond a single rulebook.',
  },
  {
    question: 'Can I use it on my phone or tablet?',
    answer: 'Yes. Mobile and tablet are treated as first-class play surfaces so Keeper remains practical at the table.',
  },
  {
    question: 'Does Keeper replace my books or table rulings?',
    answer: 'No. Keeper is an organisation and play companion. Your group still decides which books, rulings, homebrew, and table agreements you use.',
  },
];

const previewStats = [
  ['8', 'Sessions'],
  ['6', 'Characters'],
  ['12', 'NPCs'],
  ['4', 'Locations'],
];

const recentActivity = [
  'Session 4 notes updated',
  'New NPC: Ser Valen',
  'Greyne Keep map added',
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [transitionTarget, setTransitionTarget] = useState(null);
  const navigationTimeoutRef = useRef(null);
  const featuresRef = useRef(null);
  const playersRef = useRef(null);
  const gmsRef = useRef(null);
  const faqRef = useRef(null);

  const navigateWithFill = useCallback((target, nextPage) => {
    if (navigationTimeoutRef.current) return;
    setTransitionTarget(target);
    navigationTimeoutRef.current = window.setTimeout(() => {
      navigate(target, nextPage ? { state: { from: { pathname: nextPage } } } : undefined);
    }, BUTTON_FILL_DELAY_MS);
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

  useEffect(() => () => {
    if (navigationTimeoutRef.current) window.clearTimeout(navigationTimeoutRef.current);
  }, []);

  const scrollTo = useCallback((ref) => {
    const target = ref.current;
    if (!target) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }, []);

  const isTransitioning = Boolean(transitionTarget);
  const buttonClass = (base, target) => `${base}${transitionTarget === target ? ' is-transitioning' : ''}`;
  const goLogin = () => navigateWithFill('/auth');
  const goRegister = () => navigateWithFill('/auth?mode=register');
  const goBuild = () => navigateWithFill('/auth?mode=register', '/characters/new');

  return (
    <div data-testid="landing-page" className="landing-page landing-page-clean landing-page-final keeper-product-site">
      <a className="landing-skip-link" href="#landing-main">Skip to landing content</a>

      <nav className="landing-final-nav" aria-label="Rookie Quest Keeper navigation">
        <button
          type="button"
          className="landing-nav-brand"
          onClick={() => navigate('/')}
          aria-label="Rookie Quest Keeper home"
        >
          <BrandMiniLogo size={42} alt="" />
          <span>
            <BrandMainLogo width={168} alt="Rookie Quest Keeper" />
          </span>
        </button>

        <div className="landing-nav-links" aria-label="Landing page sections">
          <button type="button" onClick={() => scrollTo(featuresRef)}>Features</button>
          <button type="button" onClick={() => scrollTo(playersRef)}>For Players</button>
          <button type="button" onClick={() => scrollTo(gmsRef)}>For GMs</button>
          <button type="button" onClick={() => scrollTo(faqRef)}>FAQ</button>
        </div>

        <div className="landing-nav-actions">
          <button
            data-testid="landing-signin-btn"
            type="button"
            className={buttonClass('landing-button landing-button-ghost', '/auth')}
            onClick={goLogin}
            disabled={isTransitioning}
            aria-busy={transitionTarget === '/auth'}
          >
            Sign in
          </button>
          <button
            data-testid="landing-getstarted-btn"
            type="button"
            className={buttonClass('landing-button landing-button-primary', '/auth?mode=register')}
            onClick={goRegister}
            disabled={isTransitioning}
            aria-busy={transitionTarget === '/auth?mode=register'}
          >
            Open Keeper <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </nav>

      <main id="landing-main" className="landing-final-main">
        <section className="landing-final-hero" aria-labelledby="landing-hero-title">
          <div className="landing-hero-copy">
            <p className="landing-kicker">A refined campaign companion</p>
            <div className="landing-final-logo-wrap" aria-hidden="true">
              <BrandMainLogo width={420} />
            </div>
            <h1 id="landing-hero-title">Your campaign.<br />Kept together.</h1>
            <p className="landing-final-intro">
              Plan, organise, and play unforgettable adventures. Keep your characters, campaigns,
              notes, session prep, and live-table tools in one beautifully focused place.
            </p>

            <div className="landing-hero-actions" aria-label="Landing page actions">
              <button
                data-testid="landing-cta-btn"
                type="button"
                className={buttonClass('landing-button landing-button-primary landing-button-large', '/auth?mode=register')}
                onClick={goBuild}
                disabled={isTransitioning}
                aria-busy={transitionTarget === '/auth?mode=register'}
              >
                Open Keeper <ArrowRight size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="landing-button landing-button-ghost landing-button-large"
                onClick={() => scrollTo(featuresRef)}
              >
                Explore features
              </button>
            </div>

            <div className="landing-hero-trust" aria-label="Rookie Quest Keeper qualities">
              <span><ShieldCheck size={15} aria-hidden="true" /> Organised</span>
              <span><Compass size={15} aria-hidden="true" /> Trustworthy</span>
              <span><BookOpen size={15} aria-hidden="true" /> Refined</span>
              <span><Users size={15} aria-hidden="true" /> Table-ready</span>
            </div>
          </div>

          <aside className="landing-product-stage" aria-label="Rookie Quest Keeper campaign workspace preview">
            <div className="landing-stage-ornament landing-stage-ornament--top" aria-hidden="true"><Compass size={24} /></div>
            <div className="landing-app-preview">
              <div className="landing-app-preview__bar">
                <div className="landing-app-preview__brand">
                  <BrandMiniLogo size={28} alt="" />
                  <span><strong>Keeper</strong><small>Guild Ledger</small></span>
                </div>
                <span className="landing-app-preview__status">Campaign workspace</span>
              </div>

              <div className="landing-app-preview__body">
                <div className="landing-app-preview__rail">
                  {['Dashboard', 'Campaigns', 'Sessions', 'Characters', 'Locations', 'NPCs', 'Notes'].map((item, index) => (
                    <span key={item} className={index === 0 ? 'is-active' : ''}>{item}</span>
                  ))}
                </div>

                <div className="landing-app-preview__main">
                  <div className="landing-app-preview__heading">
                    <div>
                      <small>Campaign overview</small>
                      <h2>The Ashen Crown</h2>
                      <p>Political intrigue, hidden truths, and a party about to change the realm.</p>
                    </div>
                    <span>In progress</span>
                  </div>

                  <div className="landing-app-preview__tabs">
                    <strong>Overview</strong><span>Sessions</span><span>Characters</span><span>Locations</span>
                  </div>

                  <div className="landing-app-preview__stats">
                    {previewStats.map(([value, label]) => (
                      <div key={label}><strong>{value}</strong><span>{label}</span></div>
                    ))}
                  </div>

                  <div className="landing-app-preview__grid">
                    <section>
                      <small>Next session</small>
                      <strong>The Council Convenes</strong>
                      <p>Saturday · 4:00 PM</p>
                      <button type="button" tabIndex="-1">View session</button>
                    </section>
                    <section>
                      <small>Recent activity</small>
                      {recentActivity.map(item => <p key={item}>{item}</p>)}
                    </section>
                  </div>
                </div>
              </div>
            </div>
            <div className="landing-stage-dice" aria-hidden="true">
              <span>20</span><span>12</span><span>8</span>
            </div>
          </aside>
        </section>

        <section className="landing-pillar-strip" aria-label="Rookie Quest Keeper focus areas">
          {pillars.map(({ icon: Icon, label, text }) => (
            <article key={label}>
              <Icon size={24} aria-hidden="true" />
              <div><strong>{label}</strong><span>{text}</span></div>
            </article>
          ))}
        </section>

        <section ref={featuresRef} id="features" className="landing-showcase-section" aria-labelledby="landing-features-title">
          <div className="landing-showcase-heading">
            <p className="landing-kicker">Features</p>
            <h2 id="landing-features-title">Everything you need to run and play.</h2>
            <p>A campaign companion built to keep your world, your notes, and your players in harmony without burying the table in admin.</p>
          </div>

          <div className="landing-feature-card-grid">
            {featureCards.map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <span className="landing-feature-card-icon"><Icon size={24} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{text}</p>
                <button type="button" onClick={() => scrollTo(playersRef)}>Learn more <ChevronRight size={15} aria-hidden="true" /></button>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-audience-showcase" aria-label="Rookie Quest Keeper for players and game masters">
          <article ref={playersRef} id="for-players" className="landing-audience-panel landing-audience-panel--player">
            <div className="landing-audience-copy">
              <p className="landing-kicker">For players</p>
              <h2>Keep your story close.</h2>
              <p>Track your character, notes, inventory, quests, and campaign context without losing sight of what matters during play.</p>
              <button type="button" className="landing-button landing-button-ghost" onClick={goRegister}>Learn more for players <ArrowRight size={15} aria-hidden="true" /></button>
            </div>

            <div className="landing-character-folio" aria-hidden="true">
              <div className="landing-character-folio__portrait"><Users size={42} /></div>
              <div>
                <small>Character folio</small>
                <strong>Thalion</strong>
                <span>Half-Elf Ranger · Level 5</span>
              </div>
              <ul>
                <li><ScrollText size={15} /> Background</li>
                <li><BookOpen size={15} /> Inventory</li>
                <li><Users size={15} /> Allies</li>
                <li><Compass size={15} /> Quests</li>
              </ul>
            </div>
          </article>

          <article ref={gmsRef} id="for-gms" className="landing-audience-panel landing-audience-panel--gm">
            <div className="landing-audience-copy">
              <p className="landing-kicker">For GMs</p>
              <h2>Plan deeper.<br />Run smoother.</h2>
              <p>Organise the world behind the screen, prepare the next session, and keep everything useful close when the party goes off-script.</p>
              <button type="button" className="landing-button landing-button-ghost" onClick={goRegister}>Learn more for GMs <ArrowRight size={15} aria-hidden="true" /></button>
            </div>

            <div className="landing-ledger-stack" aria-hidden="true">
              {['Campaigns', 'NPCs', 'Locations', 'Session notes'].map((label, index) => (
                <div key={label} style={{ '--book-offset': `${index * 7}px` }}>
                  <BookOpen size={17} /><span>{label}</span>
                </div>
              ))}
              <span className="landing-ledger-stack__seal"><BrandMiniLogo size={42} alt="" /></span>
            </div>
          </article>
        </section>

        <section className="landing-workflow-section" aria-labelledby="landing-workflow-title">
          <div>
            <p className="landing-kicker">How it works</p>
            <h2 id="landing-workflow-title">From idea to adventure.</h2>
            <p>A simple flow that keeps the campaign moving from the first spark to the next unforgettable session.</p>
          </div>

          <ol>
            {workflow.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <div><strong>{step.title}</strong><p>{step.text}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section ref={faqRef} id="faq" className="landing-faq-panel landing-faq-layout" aria-labelledby="landing-faq-title">
          <div className="landing-faq-intro">
            <p className="landing-kicker">Frequently asked questions</p>
            <h2 id="landing-faq-title">Got questions?</h2>
            <p>Everything you need to know before opening Rookie Quest Keeper.</p>
            <Compass size={88} aria-hidden="true" />
          </div>

          <div className="landing-faq-list">
            {faqItems.map((item, index) => (
              <details key={item.question} className="landing-faq-item" open={index === 0 ? true : undefined}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-final-cta landing-final-cta--reference" aria-label="Open Rookie Quest Keeper">
          <div className="landing-final-cta__mark" aria-hidden="true"><Castle size={44} /></div>
          <div>
            <p className="landing-kicker">Your next adventure starts here</p>
            <h2>Open Keeper.</h2>
            <p>Plan, organise, and play unforgettable campaigns with one connected place for the whole table.</p>
          </div>
          <button
            type="button"
            className={buttonClass('landing-button landing-button-primary landing-button-large', '/auth?mode=register')}
            onClick={goRegister}
            disabled={isTransitioning}
          >
            Open Keeper <ArrowRight size={17} aria-hidden="true" />
          </button>
        </section>
      </main>

      <footer className="landing-final-footer landing-product-footer">
        <div className="landing-footer-brand">
          <BrandMiniLogo size={40} />
          <div>
            <strong>Rookie Quest Keeper</strong>
            <p>Guild Ledger · Plan. Organise. Play.</p>
          </div>
        </div>
        <div className="landing-footer-actions" aria-label="Footer navigation">
          <button type="button" onClick={() => scrollTo(featuresRef)}>Features</button>
          <button type="button" onClick={() => scrollTo(playersRef)}>For Players</button>
          <button type="button" onClick={() => scrollTo(gmsRef)}>For GMs</button>
          <button type="button" onClick={() => scrollTo(faqRef)}>FAQ</button>
        </div>
        <p className="landing-footer-note">© {new Date().getFullYear()} Rookie Quest Keeper. Independent tabletop campaign companion.</p>
      </footer>
    </div>
  );
}
