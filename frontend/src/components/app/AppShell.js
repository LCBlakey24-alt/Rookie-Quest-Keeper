import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Home, ShieldCheck, Settings, UploadCloud, UsersRound, Wand2 } from 'lucide-react';
import { BrandMiniLogo } from '@/components/ui/BrandLogo';
import apiClient from '@/lib/apiClient';
import '@/styles/appShellRail.css';

const mainNavItems = [
  { label: 'Home', to: '/home', icon: Home, matches: ['/home'] },
  { label: 'My Characters', to: '/characters', icon: UsersRound, matches: ['/characters'] },
  { label: 'My Campaigns', to: '/campaigns', icon: BookOpen, matches: ['/campaigns', '/campaign'] },
  { label: 'Homebrew', to: '/homebrew', icon: Wand2, matches: ['/homebrew'] },
  { label: 'Upload', to: '/uploads', icon: UploadCloud, matches: ['/uploads'] },
  { label: 'Settings', to: '/account', icon: Settings, matches: ['/account'] },
];

const adminNavItem = { label: 'Admin', to: '/admin', icon: ShieldCheck, matches: ['/admin'] };

function isActive(pathname, item) {
  return item.matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));
}

function RailLink({ item, pathname }) {
  const Icon = item.icon;
  const active = isActive(pathname, item);

  return (
    <Link
      to={item.to}
      className={active ? 'rqk-app-rail-link is-active' : 'rqk-app-rail-link'}
      aria-label={item.label}
      title={item.label}
    >
      <Icon size={20} aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}

export default function AppShell({ children }) {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    apiClient.get('/admin/check')
      .then((response) => {
        if (active) setIsAdmin(Boolean(response.data?.is_admin));
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const navItems = useMemo(
    () => isAdmin ? [...mainNavItems, adminNavItem] : mainNavItems,
    [isAdmin],
  );

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
          {navItems.map((item) => (
            <RailLink key={item.label} item={item} pathname={location.pathname} />
          ))}
        </nav>
      </aside>

      <div className="rqk-app-shell-content">
        {children}
      </div>
    </div>
  );
}
