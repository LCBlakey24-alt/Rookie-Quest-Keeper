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

const BUTTON_FILL_DELAY_MS = 560;

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

export default function LandingPage() {
  const navigate = useNavigate();
  const [transitionTarget, setTransitionTarget] = useState(null);
  const navigationTimeoutRef = useRef(null);
  const readySectionRef = useRef(null);
  const flowSectionRef = useRef(null);
  const audienceSectionRef = useRef(null);

  const navigateWithFill = useCallback((target) => {
    if (navigationTimeoutRef.current) return;
    setTransitionTarget(target);
    navigationTimeoutRef.current = window.setTimeout(() => {
      navigate(target);
    }, BUTTON_FILL_DELAY_MS);
  }, [navigate]);

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

  return (
    <div data-testid="landing-page" className="landing-page landing-page-clean landing-page-final">
      <nav className="landing-final-nav" aria-label="Rookie Quest Keeper navigation">
        <button type="button" className="landing-logo-button" onClick={() => navigate('/')} aria-label="Rookie Quest Keeper home">
          <BrandMiniLogo size={46} />
        </button>

        <div className="landing-nav-links" aria-label="Landing page sections">
          <button type="button" className="landing-anchor-button" onClick={() => scrollToSection(readySectionRef)}>Ready now</button>
          <button type="button" className="landing-anchor-button" onClick={() => scrollToSection(flowSectionRef)}>Table flow</button>
          <button type="button" className="landing-anchor-button" onClick={() => scrollToSection(audienceSectionRef)}>Players &amp; GMs</button>
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

      <main className="landing-final-main">
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

      <footer className="landing-final-footer">
        <BrandMiniLogo size={36} />
        <p>&copy; {new Date().getFullYear()} Rookie Quest Keeper</p>
      </footer>
    </div>
  );
}
