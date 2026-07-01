import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Home, Settings, UploadCloud, UsersRound, Wand2 } from 'lucide-react';
import { BrandMiniLogo } from '@/components/ui/BrandLogo';
import '@/styles/appShellRail.css';

const navItems = [
  { label: 'Home', to: '/home', icon: Home, matches: ['/home'] },
  { label: 'Characters', to: '/player', icon: UsersRound, matches: ['/player', '/characters'] },
  { label: 'Campaigns', to: '/home', icon: BookOpen, matches: ['/campaign'] },
  { label: 'Homebrew', to: '/homebrew', icon: Wand2, matches: ['/homebrew'] },
  { label: 'Upload', to: '/uploads', icon: UploadCloud, matches: ['/uploads'] },
  { label: 'Settings', to: '/account', icon: Settings, matches: ['/account'] },
];

function isActive(pathname, item) {
  return item.matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));
}

export default function AppShell({ children }) {
  const location = useLocation();

  return (
    <div className="rqk-app-shell">
      <aside className="rqk-app-rail" aria-label="App navigation">
        <Link to="/home" className="rqk-app-rail-brand" aria-label="Rookie Quest Keeper home">
          <span className="rqk-app-rail-logo">
            <BrandMiniLogo size={36} />
          </span>
          <span className="rqk-app-rail-brand-text">Rookie Quest Keeper</span>
        </Link>

        <nav className="rqk-app-rail-nav" aria-label="Main app sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(location.pathname, item);

            return (
              <Link
                key={item.label}
                to={item.to}
                className={active ? 'rqk-app-rail-link is-active' : 'rqk-app-rail-link'}
                aria-label={item.label}
                title={item.label}
              >
                <Icon size={20} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="rqk-app-shell-content">
        {children}
      </div>
    </div>
  );
}
