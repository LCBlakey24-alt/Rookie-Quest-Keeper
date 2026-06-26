import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, Library, MessageSquare, ShieldCheck, Swords, Users } from 'lucide-react';
import { BrandMainLogo, BrandMiniLogo } from '@/components/ui/BrandLogo';

const featureGroups = [
  {
    icon: Users,
    title: 'Players',
    items: ['Character sheets', 'HP and actions', 'Spells and inventory'],
  },
  {
    icon: Swords,
    title: 'At the table',
    items: ['Fast mobile tabs', 'Rolls and conditions', 'Level-up support'],
  },
  {
    icon: Library,
    title: 'Game Masters',
    items: ['Campaign spaces', 'Notes and prep', 'Homebrew tools'],
  },
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
            <BrandMainLogo height={170} />
          </div>

          <p className="landing-kicker">Simple tools for players and game masters</p>
          <h1>Build. Play. Keep the table moving.</h1>
          <p className="landing-final-intro">
            Rookie Quest Keeper keeps character sheets, campaign tools, notes, actions, spells, inventory, and level-up choices in one clean workspace.
          </p>

          <div className="landing-hero-actions">
            <button data-testid="landing-cta-btn" type="button" className="landing-button landing-button-primary landing-button-large" onClick={goRegister}>
              Build Your First Character <ChevronRight size={18} />
            </button>
            <button type="button" className="landing-button landing-button-ghost landing-button-large" onClick={goLogin}>
              I already have an account
            </button>
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

        <section className="landing-final-strip" aria-label="Design approach">
          <div>
            <BookOpen size={22} />
            <span>Mobile-first sheets</span>
          </div>
          <div>
            <ShieldCheck size={22} />
            <span>Clean GM spaces</span>
          </div>
          <div>
            <MessageSquare size={22} />
            <span>Feedback built in</span>
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
