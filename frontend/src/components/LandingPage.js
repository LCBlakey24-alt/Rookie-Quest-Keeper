import React from 'react';
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

const featureGroups = [
  {
    icon: Users,
    title: 'For players',
    items: ['Clear character sheets', 'Quick HP and actions', 'Spells, inventory, notes, and level-ups'],
  },
  {
    icon: Swords,
    title: 'For the table',
    items: ['Find what you can do on your turn', 'Less scrolling during combat', 'Built around real session flow'],
  },
  {
    icon: Crown,
    title: 'For game masters',
    items: ['Campaign spaces', 'Notes, prep, homebrew, and feedback', 'One place for table tools to grow'],
  },
];

const playBenefits = [
  {
    icon: ListChecks,
    title: 'Know what you can do',
    text: 'Actions, bonus actions, reactions, HP, conditions, resources, and key combat choices are organised around the player turn.',
  },
  {
    icon: HeartPulse,
    title: 'Built for phones at the table',
    text: 'Compact tabs and quick status tools mean players do not have to scroll forever to find HP, AC, speed, skills, or actions.',
  },
  {
    icon: BookOpen,
    title: 'Spells without the mess',
    text: 'Keep spell management separate from spell use, so known and prepared spells can be organised without burying combat choices.',
  },
  {
    icon: Sparkles,
    title: 'Level-up support',
    text: 'Level-up choices, character progress, and saved decisions can live beside the sheet instead of being lost in notes or old messages.',
  },
];

const playerList = [
  'See ability scores, saving throws, and skills in one focused Stats tab.',
  'Use an Actions tab for combat choices instead of hunting through the whole sheet.',
  'Track HP, temp HP, AC, speed, conditions, rests, and dice rolls quickly.',
  'Manage spells, inventory, features, and notes without mixing everything together.',
];

const gmList = [
  'Keep campaigns, prep, notes, homebrew, and table tools in one workspace.',
  'Support newer players without needing to explain the same rules every round.',
  'Use feedback/admin tools to shape what the app needs next.',
  'Build towards a shared table hub instead of separate sheets, files, and chats.',
];

const playerSide = [
  'A play-focused character sheet that keeps stats, actions, spells, inventory, features, and notes separated into clear sections.',
  'Quick access to HP, temp HP, AC, speed, conditions, rests, dice rolls, actions, bonus actions, and reactions.',
  'Spell and inventory management that helps players organise what they know, what they have prepared, and what they are carrying.',
  'A structure that helps newer players understand their options without forcing experienced players through a childish interface.',
];

const gmSide = [
  'Campaign spaces for prep, notes, homebrew, table tools, feedback, and future live-session control.',
  'A GM direction built around sending items, equipment, rewards, and secrets to players without stopping the game.',
  'Location and world tools planned around tracking places, distance between locations, travel notes, and campaign movement.',
  'Homebrew support for custom items, equipment, rules, and campaign-specific content that can link into player sheets.',
];

const tableFlowRoadmap = [
  {
    title: 'Send items in a few clicks',
    text: 'The goal is for GMs to create or choose an item and send it straight to a player sheet without leaving the flow of the session.',
  },
  {
    title: 'Secrets shared cleanly',
    text: 'Private clues, whispers, hidden notes, and player-specific information can become screen-ready moments instead of side messages.',
  },
  {
    title: 'Homebrew that spreads through the table',
    text: 'Custom rulesets, items, equipment, and campaign content should be able to link across the campaign so every connected sheet can use it.',
  },
  {
    title: 'Campaign movement and locations',
    text: 'The GM side is being shaped toward location tracking, distances, travel context, and world information that can support session prep.',
  },
];

const differencePoints = [
  'Not just a database for character stats — it is designed around using the sheet during play.',
  'Beginner-friendly without feeling childish; useful for rookies, regular players, and GMs.',
  'Mobile-first layout choices, because most players check sheets on phones at the table.',
  'Player and GM tools are being built into the same ecosystem, so the whole table can benefit.',
  'Feedback is built in, meaning the site can grow around actual table problems rather than guesswork.',
];

export default function LandingPage() {
  const navigate = useNavigate();
  const goLogin = () => navigate('/auth');
  const goRegister = () => navigate('/auth?mode=register');

  return (
    <div data-testid="landing-page" className="landing-page landing-page-clean landing-page-final">
      <nav className="landing-final-nav" aria-label="Rookie Quest Keeper navigation">
        <button type="button" className="landing-logo-button" onClick={() => navigate('/')} aria-label="Rookie Quest Keeper home">
          <BrandMiniLogo size={46} />
        </button>
        <div className="landing-nav-actions">
          <button data-testid="landing-signin-btn" type="button" className="landing-button landing-button-ghost" onClick={goLogin}>
            Sign In
          </button>
          <button data-testid="landing-getstarted-btn" type="button" className="landing-button landing-button-primary" onClick={goRegister}>
            Create Account
          </button>
        </div>
      </nav>

      <main className="landing-final-main">
        <section className="landing-final-hero">
          <div className="landing-final-logo-wrap">
            <BrandMainLogo height={150} />
          </div>

          <p className="landing-kicker">Character sheets • Campaign tools • Table support</p>
          <h1>Character sheets that help players actually play.</h1>
          <p className="landing-final-intro">
            Rookie Quest Keeper brings player sheets, turn actions, spells, inventory, level-up choices, GM prep, homebrew, and feedback tools into one clean table workspace.
          </p>

          <div className="landing-hero-actions">
            <button data-testid="landing-cta-btn" type="button" className="landing-button landing-button-primary landing-button-large" onClick={goRegister}>
              Build Your First Character <ChevronRight size={18} />
            </button>
            <button type="button" className="landing-button landing-button-ghost landing-button-large" onClick={goLogin}>
              I already have an account
            </button>
          </div>

          <div className="landing-proof-strip" aria-label="Rookie Quest Keeper focus areas">
            <span>Mobile-first sheets</span>
            <span>Actions-first play</span>
            <span>GM-ready campaigns</span>
          </div>
        </section>

        <section className="landing-final-features" aria-label="Rookie Quest Keeper overview">
          {featureGroups.map((group) => {
            const Icon = group.icon;
            return (
              <article key={group.title} className="landing-final-feature">
                <h2><Icon size={22} /> {group.title}</h2>
                <ul>
                  {group.items.map(item => <li key={item}>{item}</li>)}
                </ul>
              </article>
            );
          })}
        </section>

        <section className="landing-marketing-block landing-marketing-split" aria-label="Why Rookie Quest Keeper exists">
          <div>
            <p className="landing-kicker">The problem</p>
            <h2>Most digital sheets store information. That is not enough at the table.</h2>
          </div>
          <div>
            <p>
              Players do not just need a list of numbers. They need to know what they can do, where their important choices are, what changed after a rest, which spells are ready, and how to level up without derailing the session.
            </p>
            <p>
              Rookie Quest Keeper is being shaped around those real table moments: “What can I do?”, “Where is that feature?”, “How much HP do I have?”, and “What do I need next?”
            </p>
          </div>
        </section>

        <section className="landing-benefit-grid" aria-label="Built for actual play">
          {playBenefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article key={benefit.title} className="landing-benefit-card">
                <Icon size={24} />
                <h2>{benefit.title}</h2>
                <p>{benefit.text}</p>
              </article>
            );
          })}
        </section>

        <section className="landing-two-columns landing-audience-columns" aria-label="Player and game master benefits">
          <article>
            <p className="landing-kicker">Player side</p>
            <h2><Users size={22} /> Players get clarity</h2>
            <ul>
              {playerSide.map(item => <li key={item}>{item}</li>)}
            </ul>
          </article>
          <article>
            <p className="landing-kicker">GM side</p>
            <h2><Crown size={22} /> GMs keep control</h2>
            <ul>
              {gmSide.map(item => <li key={item}>{item}</li>)}
            </ul>
          </article>
        </section>

        <section className="landing-roadmap" aria-label="Live table flow roadmap">
          <div className="landing-roadmap-heading">
            <p className="landing-kicker">Built toward live table flow</p>
            <h2>The GM should not have to stop the game to hand something to a player.</h2>
            <p>
              Rookie Quest Keeper is being built toward a connected table experience where items, secrets, homebrew, rules, and campaign information can move between GM and player screens smoothly.
            </p>
          </div>
          <div className="landing-roadmap-grid">
            {tableFlowRoadmap.map(point => (
              <article key={point.title}>
                <h3>{point.title}</h3>
                <p>{point.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-two-columns" aria-label="Current player and game master benefits">
          <article>
            <h2><Users size={22} /> What players use it for</h2>
            <ul>
              {playerList.map(item => <li key={item}>{item}</li>)}
            </ul>
          </article>
          <article>
            <h2><Crown size={22} /> What GMs use it for</h2>
            <ul>
              {gmList.map(item => <li key={item}>{item}</li>)}
            </ul>
          </article>
        </section>

        <section className="landing-marketing-block" aria-label="What makes Rookie Quest Keeper different">
          <p className="landing-kicker">Why it is different</p>
          <h2>Designed around table flow, not spreadsheet energy.</h2>
          <div className="landing-difference-list">
            {differencePoints.map(point => <p key={point}>{point}</p>)}
          </div>
        </section>

        <section className="landing-final-strip" aria-label="Design approach">
          <div>
            <BookOpen size={22} />
            <span>Mobile-first sheets</span>
          </div>
          <div>
            <Backpack size={22} />
            <span>Inventory and spells</span>
          </div>
          <div>
            <MessageSquare size={22} />
            <span>Feedback built in</span>
          </div>
        </section>

        <section className="landing-final-cta" aria-label="Start using Rookie Quest Keeper">
          <ShieldCheck size={28} />
          <h2>Start simple. Build deeper when your table needs it.</h2>
          <p>Create a character, open the sheet, and start shaping the tools around how your group actually plays.</p>
          <button type="button" className="landing-button landing-button-primary landing-button-large" onClick={goRegister}>
            Create Your Account <ChevronRight size={18} />
          </button>
        </section>
      </main>

      <footer className="landing-final-footer">
        <BrandMiniLogo size={36} />
        <p>&copy; {new Date().getFullYear()} Rookie Quest Keeper</p>
      </footer>
    </div>
  );
}
