import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Backpack,
  BookOpen,
  ChevronRight,
  Crown,
  HeartPulse,
  Library,
  ListChecks,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Swords,
  Users
} from 'lucide-react';
import { BrandMainLogo, BrandMiniLogo } from '@/components/ui/BrandLogo';
import '@/styles/landingProductionTrust.css';

const BUTTON_FILL_DELAY_MS = 560;
const LANDING_META_DESCRIPTION = 'Build 5e-style characters, use cleaner live play sheets, and keep campaign prep, GM notes, handouts, maps, and table tools together in Rookie Quest Keeper.';

const featureGroups = [
  {
    icon: Users,
    eyebrow: 'Player Mode',
    title: 'A sheet built for play',
    text: 'Stats, HP, actions, spells, inventory, notes, rests, and level-ups stay separated into clear table-ready sections.',
  },
  {
    icon: Swords,
    eyebrow: 'Table Mode',
    title: 'Less hunting, more rolling',
    text: 'Quick combat tools and action-first layout choices help players find useful options while the game is moving.',
  },
  {
    icon: Crown,
    eyebrow: 'GM Mode',
    title: 'Prep and run in one hub',
    text: 'Campaign notes, handouts, maps, NPCs, rewards, uploads, live-session tools, and table context can live together.',
  },
];

const proofPoints = [
  'Mobile-first sheets',
  'Actions-first play',
  'GM-ready campaigns',
  'Built for rookies and regulars',
];

const previewItems = [
  {
    icon: HeartPulse,
    label: 'Player sheet',
    value: 'HP, AC, conditions, rests, and turn choices',
  },
  {
    icon: BookOpen,
    label: 'Character tools',
    value: 'Full creator, guided choices, spells, gear, and notes',
  },
  {
    icon: Crown,
    label: 'GM workspace',
    value: 'Campaign prep, NPCs, maps, secrets, uploads, and handouts',
  },
  {
    icon: MessageSquare,
    label: 'Live table flow',
    value: 'Player display, quick references, session notes, and feedback',
  },
];

const readyNow = [
  'Create characters through Full Creator, Basic Creator, or Rook Character Matchmaker.',
  'Open a mobile-friendly sheet with stats, HP, actions, spells, inventory, notes, and features.',
  'Create campaign spaces for players, notes, maps, NPCs, gods, encounters, handouts, and uploads.',
  'Use live-session tools for combat flow, party status, dice, handouts, references, and table display.',
];

const playBenefits = [
  {
    icon: ListChecks,
    title: 'Clear turn choices',
    text: 'Players can see actions, bonus actions, reactions, resources, and key combat options without digging through the whole sheet.',
  },
  {
    icon: HeartPulse,
    title: 'Fast table checks',
    text: 'HP, temp HP, AC, speed, rests, conditions, passives, and quick rolls stay close to the moments players actually need them.',
  },
  {
    icon: Sparkles,
    title: 'Cleaner progression',
    text: 'Level-up choices and character growth can sit beside the sheet instead of being buried in notes, screenshots, or old chats.',
  },
  {
    icon: Library,
    title: 'Less app-hopping',
    text: 'Player and GM tools are being shaped into one ecosystem, so the table spends less time switching tabs and more time playing.',
  },
];

const workflowSteps = [
  {
    number: '01',
    title: 'Build',
    text: 'Start with guided character creation and keep decisions connected to the finished sheet.',
  },
  {
    number: '02',
    title: 'Play',
    text: 'Use a sheet organised around what the player needs during the session, not just a wall of stored numbers.',
  },
  {
    number: '03',
    title: 'Run',
    text: 'Give GMs a campaign workspace for prep, notes, maps, NPCs, handouts, rewards, and table-facing tools.',
  },
  {
    number: '04',
    title: 'Grow',
    text: 'Let feedback, homebrew, uploads, and live play needs shape the table hub as the campaign gets deeper.',
  },
];

const playerSide = [
  'Use focused tabs for stats, actions, spells, inventory, features, and notes.',
  'Track HP, temp HP, AC, speed, conditions, rests, dice rolls, actions, bonus actions, and reactions quickly.',
  'Manage spells and inventory without mixing preparation, combat choices, and notes together.',
  'Help newer players understand their options without making experienced players feel boxed in.',
];

const gmSide = [
  'Keep prep, session notes, handouts, maps, NPCs, gods, encounters, uploads, and table tools together.',
  'Run campaigns around a clearer Intake → Plan → Prep Tonight → Run Session → Record Changes flow.',
  'Track places, maps, factions, campaign movement, rewards, and story consequences from the same workspace.',
  'Build toward private clues, player-specific secrets, homebrew, and table content that can move cleanly between screens.',
];

const finalStrip = [
  { icon: BookOpen, label: 'Readable sheets' },
  { icon: Backpack, label: 'Organised gear' },
  { icon: ShieldCheck, label: 'Table-safe flow' },
];

const startingPaths = [
  {
    icon: Users,
    eyebrow: 'New player',
    title: 'Build a first character',
    text: 'Start with the guided creator, then land on a sheet that explains what matters during play.',
    actionLabel: 'Start Building',
    action: 'register',
  },
  {
    icon: Swords,
    eyebrow: 'At the table',
    title: 'Find the next action quickly',
    text: 'Use clear sections for actions, bonus actions, reactions, spells, HP, rests, inventory, and notes.',
    actionLabel: 'See Ready Tools',
    action: 'ready',
  },
  {
    icon: Crown,
    eyebrow: 'Game master',
    title: 'Prep without losing the thread',
    text: 'Keep session planning, maps, NPCs, handouts, rewards, uploads, and campaign notes close together.',
    actionLabel: 'View GM Flow',
    action: 'flow',
  },
];

const productStatus = [
  {
    label: 'Character building',
    status: 'Ready to start',
    detail: 'Multiple creator routes help brand-new players and experienced players get to a usable sheet quickly.',
  },
  {
    label: 'Live play sheet',
    status: 'Table focused',
    detail: 'The sheet is being shaped around fast HP, actions, spells, rests, inventory, and notes during real sessions.',
  },
  {
    label: 'GM workspace',
    status: 'Campaign ready',
    detail: 'Prep, NPCs, maps, handouts, uploads, and session flow tools are being brought into one GM-side hub.',
  },
];

const productPrinciples = [
  {
    icon: ShieldCheck,
    title: 'Honest by default',
    text: 'The page avoids pretending to be an official rules source and explains what the app is actually for: organisation, play support, and table flow.',
  },
  {
    icon: HeartPulse,
    title: 'Useful during pressure',
    text: 'The product story keeps returning to the same table problem: when play is moving, players need the right action fast.',
  },
  {
    icon: Crown,
    title: 'GM control without clutter',
    text: 'Campaign prep, live notes, handouts, maps, rewards, NPCs, and uploads are framed as one workspace, not scattered admin pages.',
  },
  {
    icon: Sparkles,
    title: 'Premium, not noisy',
    text: 'The landing page keeps the dark square-card theme, strong red accents, and clean hierarchy instead of chasing generic fantasy decoration.',
  },
];

const tableUpgrades = [
  {
    label: 'Player turns',
    messy: '“What can I actually do right now?” gets buried in a full character sheet.',
    clean: 'Actions, bonus actions, reactions, spells, HP, rests, and notes are grouped around live play.',
  },
  {
    label: 'GM prep',
    messy: 'Session notes, maps, NPCs, rewards, and secrets drift across documents, chats, and folders.',
    clean: 'Campaign prep is framed as one workspace with table-facing tools ready when the session starts.',
  },
  {
    label: 'Campaign growth',
    messy: 'Level-ups, homebrew, inventory changes, and story consequences become hard to track over time.',
    clean: 'Character growth and campaign changes have a clearer place to live as the adventure gets deeper.',
  },
];

const faqItems = [
  {
    question: 'Is Rookie Quest Keeper official 5e content?',
    answer: 'No. Rookie Quest Keeper is an independent tabletop companion for 5e-style campaigns. It is designed to organise play, characters, and GM prep without presenting itself as an official rules source.',
  },
  {
    question: 'Where should a brand-new player start?',
    answer: 'Start by creating an account and building a first character. The goal is to get players to a readable sheet quickly, then reveal deeper tools as they become useful.',
  },
  {
    question: 'Can experienced players still use it?',
    answer: 'Yes. The layout is being built to keep fast table information close at hand while still supporting spells, features, inventory, notes, and progression for more detailed characters.',
  },
  {
    question: 'What is GM Mode for?',
    answer: 'GM Mode is for campaign prep and session control: notes, NPCs, maps, handouts, uploads, rewards, encounters, live table flow, and the things that help a session stay moving.',
  },
  {
    question: 'Does it replace books or table judgement?',
    answer: 'No. It is a play aid and organisation hub. Groups should still use their own rules, books, rulings, homebrew, and table agreements.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [transitionTarget, setTransitionTarget] = useState(null);
  const navigationTimeoutRef = useRef(null);
  const readySectionRef = useRef(null);
  const flowSectionRef = useRef(null);
  const audienceSectionRef = useRef(null);
  const faqSectionRef = useRef(null);

  const navigateWithFill = useCallback((target) => {
    if (navigationTimeoutRef.current) return;
    setTransitionTarget(target);
    navigationTimeoutRef.current = window.setTimeout(() => {
      navigate(target);
    }, BUTTON_FILL_DELAY_MS);
  }, [navigate]);

  useEffect(() => {
    const previousTitle = document.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    const previousDescription = metaDescription?.getAttribute('content') ?? null;
    const createdMeta = !metaDescription;
    const activeMetaDescription = metaDescription ?? document.createElement('meta');

    document.title = 'Rookie Quest Keeper | 5e Character Sheets & GM Tools';
    activeMetaDescription.setAttribute('name', 'description');
    activeMetaDescription.setAttribute('content', LANDING_META_DESCRIPTION);

    if (createdMeta) {
      document.head.appendChild(activeMetaDescription);
    }

    return () => {
      document.title = previousTitle;
      if (createdMeta) {
        activeMetaDescription.remove();
        return;
      }

      if (previousDescription !== null) {
        activeMetaDescription.setAttribute('content', previousDescription);
      }
    };
  }, []);

  useEffect(() => () => {
    if (navigationTimeoutRef.current) {
      window.clearTimeout(navigationTimeoutRef.current);
    }
  }, []);

  const scrollToSection = useCallback((sectionRef) => {
    const target = sectionRef.current;
    if (!target) return;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  }, []);

  const buttonClass = (baseClass, target) => `${baseClass}${transitionTarget === target ? ' is-transitioning' : ''}`;
  const isTransitioning = Boolean(transitionTarget);
  const goLogin = () => navigateWithFill('/auth');
  const goRegister = () => navigateWithFill('/auth?mode=register');
  const handleStartingPath = (action) => {
    if (action === 'register') {
      goRegister();
      return;
    }

    if (action === 'flow') {
      scrollToSection(flowSectionRef);
      return;
    }

    scrollToSection(readySectionRef);
  };

  return (
    <div data-testid="landing-page" className="landing-page landing-page-clean landing-page-final">
      <a className="landing-skip-link" href="#landing-main">Skip to landing content</a>

      <nav className="landing-final-nav" aria-label="Rookie Quest Keeper navigation">
        <button type="button" className="landing-logo-button" onClick={() => navigate('/')} aria-label="Rookie Quest Keeper home">
          <BrandMiniLogo size={46} />
        </button>

        <div className="landing-nav-links" aria-label="Landing page sections">
          <button type="button" className="landing-anchor-button" onClick={() => scrollToSection(readySectionRef)}>Ready now</button>
          <button type="button" className="landing-anchor-button" onClick={() => scrollToSection(flowSectionRef)}>Table flow</button>
          <button type="button" className="landing-anchor-button" onClick={() => scrollToSection(audienceSectionRef)}>Players &amp; GMs</button>
          <button type="button" className="landing-anchor-button" onClick={() => scrollToSection(faqSectionRef)}>FAQ</button>
        </div>

        <div className="landing-nav-actions">
          <button data-testid="landing-signin-btn" type="button" className={buttonClass('landing-button landing-button-ghost', '/auth')} onClick={goLogin} disabled={isTransitioning} aria-busy={transitionTarget === '/auth'}>
            <span>Sign In</span>
          </button>
          <button data-testid="landing-getstarted-btn" type="button" className={buttonClass('landing-button landing-button-primary', '/auth?mode=register')} onClick={goRegister} disabled={isTransitioning} aria-busy={transitionTarget === '/auth?mode=register'}>
            <span>Create Account</span>
          </button>
        </div>
      </nav>

      <main id="landing-main" className="landing-final-main">
        <section className="landing-final-hero" aria-labelledby="landing-hero-title">
          <div className="landing-hero-copy">
            <div className="landing-final-logo-wrap" aria-hidden="true">
              <BrandMainLogo height={132} />
            </div>

            <p className="landing-kicker">Player Mode • GM Mode • Live table support</p>
            <h1 id="landing-hero-title">Bring the whole 5e table into one clean quest hub.</h1>
            <p className="landing-final-intro">
              Rookie Quest Keeper keeps character creation, play sheets, turn actions, spells, inventory, level-ups, GM prep, handouts, maps, homebrew, and live-session tools in one tidy tabletop workspace.
            </p>

            <div className="landing-hero-actions" aria-label="Landing page actions">
              <button data-testid="landing-cta-btn" type="button" className={buttonClass('landing-button landing-button-primary landing-button-large', '/auth?mode=register')} onClick={goRegister} disabled={isTransitioning} aria-busy={transitionTarget === '/auth?mode=register'}>
                <span>Build Your First Character</span> <ChevronRight size={18} aria-hidden="true" />
              </button>
              <button type="button" className="landing-button landing-button-ghost landing-button-large" onClick={() => scrollToSection(readySectionRef)} disabled={isTransitioning}>
                <span>See What Is Ready</span>
              </button>
            </div>

            <div className="landing-proof-strip" aria-label="Rookie Quest Keeper focus areas">
              {proofPoints.map(point => <span key={point}>{point}</span>)}
            </div>
          </div>

          <aside className="landing-preview-panel" aria-label="Rookie Quest Keeper product preview">
            <div className="landing-preview-topbar">
              <div className="landing-preview-dots" aria-hidden="true"><span /><span /><span /></div>
              <strong>Rookie Quest Keeper</strong>
              <span>Table hub</span>
            </div>
            <div className="landing-preview-body">
              <div className="landing-preview-spotlight">
                <span>Table command centre</span>
                <h2>Build. Play. Run.</h2>
                <p>Create a character, keep the sheet readable at the table, and give GMs a workspace that grows with the campaign.</p>
              </div>
              <div className="landing-preview-list">
                {previewItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="landing-preview-row">
                      <Icon size={20} aria-hidden="true" />
                      <div>
                        <strong>{item.label}</strong>
                        <span>{item.value}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </section>

        <section className="landing-final-features" aria-label="Rookie Quest Keeper overview">
          {featureGroups.map((group) => {
            const Icon = group.icon;
            return (
              <article key={group.title} className="landing-final-feature">
                <Icon size={24} aria-hidden="true" />
                <p className="landing-card-eyebrow">{group.eyebrow}</p>
                <h2>{group.title}</h2>
                <p>{group.text}</p>
              </article>
            );
          })}
        </section>

        <section className="landing-start-paths" aria-labelledby="landing-start-title">
          <div className="landing-section-heading">
            <p className="landing-kicker">Choose your path</p>
            <h2 id="landing-start-title">A clear first step for every kind of table member.</h2>
            <p>New players, regular players, and GMs should all understand where to go without reading the whole page first.</p>
          </div>
          <div className="landing-start-grid">
            {startingPaths.map((path) => {
              const Icon = path.icon;
              return (
                <article key={path.title} className="landing-start-card">
                  <Icon size={24} aria-hidden="true" />
                  <p className="landing-card-eyebrow">{path.eyebrow}</p>
                  <h3>{path.title}</h3>
                  <p>{path.text}</p>
                  <button type="button" className="landing-card-action" onClick={() => handleStartingPath(path.action)} disabled={isTransitioning}>
                    <span>{path.actionLabel}</span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="landing-principles-panel" aria-labelledby="landing-principles-title">
          <div className="landing-section-heading landing-principles-heading">
            <p className="landing-kicker">Why it feels different</p>
            <h2 id="landing-principles-title">Designed like a table tool, not just another character database.</h2>
            <p>The landing page should sell the actual product promise: less digging, clearer choices, honest scope, and a workspace that still feels like Rookie Quest Keeper.</p>
          </div>
          <div className="landing-principles-grid">
            {productPrinciples.map((principle) => {
              const Icon = principle.icon;
              return (
                <article key={principle.title} className="landing-principle-card">
                  <Icon size={24} aria-hidden="true" />
                  <h3>{principle.title}</h3>
                  <p>{principle.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="landing-table-shift-panel" aria-labelledby="landing-table-shift-title">
          <div className="landing-section-heading landing-table-shift-heading">
            <p className="landing-kicker">From table chaos to table flow</p>
            <h2 id="landing-table-shift-title">The clearest pitch is the before-and-after.</h2>
            <p>Rookie Quest Keeper should feel valuable before someone even signs up: it takes common tabletop friction and gives it a cleaner home.</p>
          </div>
          <div className="landing-table-shift-list">
            {tableUpgrades.map((item) => (
              <article key={item.label} className="landing-table-shift-row">
                <span className="landing-table-shift-label">{item.label}</span>
                <div>
                  <p>Messy table</p>
                  <h3>{item.messy}</h3>
                </div>
                <ChevronRight size={22} aria-hidden="true" />
                <div>
                  <p>Rookie Quest Keeper</p>
                  <h3>{item.clean}</h3>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="ready-now" ref={readySectionRef} className="landing-marketing-block landing-marketing-split" aria-label="What you can do today">
          <div>
            <p className="landing-kicker">Ready now</p>
            <h2>Start with a character, then grow into a full table workspace.</h2>
            <p>It is built around the moment players ask, “What can I do now?” and the moment GMs need to keep the session moving.</p>
          </div>
          <ul className="landing-check-list">
            {readyNow.map(item => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section className="landing-benefit-grid" aria-label="Built for actual play">
          {playBenefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article key={benefit.title} className="landing-benefit-card">
                <Icon size={24} aria-hidden="true" />
                <h2>{benefit.title}</h2>
                <p>{benefit.text}</p>
              </article>
            );
          })}
        </section>

        <section id="table-flow" ref={flowSectionRef} className="landing-roadmap" aria-label="How Rookie Quest Keeper supports the table">
          <div className="landing-roadmap-heading">
            <p className="landing-kicker">Table flow</p>
            <h2>From first build to live session, every screen should have a job.</h2>
            <p>Every part of Rookie Quest Keeper is shaped around practical table moments: build characters, understand turns, run sessions, record changes, and keep campaigns organised.</p>
          </div>
          <div className="landing-roadmap-grid">
            {workflowSteps.map(point => (
              <article key={point.title}>
                <span>{point.number}</span>
                <h3>{point.title}</h3>
                <p>{point.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="players-and-gms" ref={audienceSectionRef} className="landing-two-columns landing-audience-columns" aria-label="Player and game master benefits">
          <article>
            <p className="landing-kicker">Player side</p>
            <h2><Users size={22} aria-hidden="true" /> Players get clarity</h2>
            <ul>
              {playerSide.map(item => <li key={item}>{item}</li>)}
            </ul>
          </article>
          <article>
            <p className="landing-kicker">GM side</p>
            <h2><Crown size={22} aria-hidden="true" /> GMs keep control</h2>
            <ul>
              {gmSide.map(item => <li key={item}>{item}</li>)}
            </ul>
          </article>
        </section>

        <section className="landing-final-strip" aria-label="Design approach">
          {finalStrip.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label}>
                <Icon size={22} aria-hidden="true" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </section>

        <section className="landing-status-panel" aria-labelledby="landing-status-title">
          <div className="landing-section-heading landing-status-heading">
            <p className="landing-kicker">Current focus</p>
            <h2 id="landing-status-title">Built around the screens the table actually needs.</h2>
            <p>The landing page now sets honest expectations: start with character tools, use the sheet during play, and grow into GM support as the campaign gets bigger.</p>
          </div>
          <div className="landing-status-grid">
            {productStatus.map((item) => (
              <article key={item.label} className="landing-status-card">
                <span>{item.status}</span>
                <h3>{item.label}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" ref={faqSectionRef} className="landing-faq-panel" aria-labelledby="landing-faq-title">
          <div className="landing-section-heading landing-faq-heading">
            <p className="landing-kicker">Quick answers</p>
            <h2 id="landing-faq-title">The important stuff before you create an account.</h2>
            <p>Clear expectations help the app feel safer, more honest, and more professional for first-time visitors.</p>
          </div>
          <div className="landing-faq-list">
            {faqItems.map((item) => (
              <details key={item.question} className="landing-faq-item">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-final-cta" aria-label="Start using Rookie Quest Keeper">
          <ShieldCheck size={30} aria-hidden="true" />
          <p className="landing-kicker">Start simple</p>
          <h2>Build the character first. Bring the whole table in when you are ready.</h2>
          <p>Create an account, open the sheet, and start shaping the campaign workspace around real table problems.</p>
          <div className="landing-hero-actions">
            <button type="button" className={buttonClass('landing-button landing-button-primary landing-button-large', '/auth?mode=register')} onClick={goRegister} disabled={isTransitioning} aria-busy={transitionTarget === '/auth?mode=register'}>
              <span>Create Your Account</span> <ChevronRight size={18} aria-hidden="true" />
            </button>
            <button type="button" className={buttonClass('landing-button landing-button-ghost landing-button-large', '/auth')} onClick={goLogin} disabled={isTransitioning} aria-busy={transitionTarget === '/auth'}>
              <span>I already have an account</span>
            </button>
          </div>
        </section>
      </main>

      <footer className="landing-final-footer landing-product-footer">
        <div className="landing-footer-brand">
          <BrandMiniLogo size={40} />
          <div>
            <strong>Rookie Quest Keeper</strong>
            <p>Independent tabletop companion for 5e-style campaigns, character sheets, live play, and GM prep.</p>
          </div>
        </div>
        <div className="landing-footer-actions" aria-label="Footer navigation">
          <button type="button" onClick={() => scrollToSection(readySectionRef)}>Ready now</button>
          <button type="button" onClick={() => scrollToSection(flowSectionRef)}>Table flow</button>
          <button type="button" onClick={() => scrollToSection(faqSectionRef)}>FAQ</button>
          <button type="button" onClick={goRegister}>Create account</button>
        </div>
        <p className="landing-footer-note">&copy; {new Date().getFullYear()} Rookie Quest Keeper. Built for home tables, new players, and campaign runners.</p>
      </footer>
    </div>
  );
}
