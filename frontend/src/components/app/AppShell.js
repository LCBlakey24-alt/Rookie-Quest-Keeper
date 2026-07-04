import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Home, MessageSquare, ShieldCheck, Settings, UploadCloud, UsersRound, Wand2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import '@/styles/appShellRail.css';
import '@/styles/railFeedbackButtons.css';

const mainNavItems = [
  { label: 'Dashboard', to: '/home', icon: Home, matches: ['/home'] },
  { label: 'My Characters', to: '/characters', icon: UsersRound, matches: ['/characters'] },
  { label: 'My Campaigns', to: '/campaigns', icon: BookOpen, matches: ['/campaigns', '/campaign'] },
  { label: 'My Homebrew', to: '/homebrew', icon: Wand2, matches: ['/homebrew'] },
  { label: 'My Uploads', to: '/uploads', icon: UploadCloud, matches: ['/uploads'] },
];

const adminNavItem = { label: 'Admin', to: '/admin', icon: ShieldCheck, matches: ['/admin'] };
const settingsNavItem = { label: 'Settings', to: '/account', icon: Settings, matches: ['/account'] };

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

function openFeedback() {
  window.dispatchEvent(new Event('rook-feedback-open'));
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
    () => isAdmin ? [...mainNavItems, adminNavItem, settingsNavItem] : [...mainNavItems, settingsNavItem],
    [isAdmin],
  );

  return (
    <div className="rqk-app-shell">
      <aside className="rqk-app-rail" aria-label="App navigation">
        <nav className="rqk-app-rail-nav" aria-label="Main app sections">
          {navItems.map((item) => (
            <RailLink key={item.label} item={item} pathname={location.pathname} />
          ))}
        </nav>

        <button type="button" className="rqk-app-rail-link rqk-app-rail-feedback" onClick={openFeedback}>
          <MessageSquare size={20} aria-hidden="true" />
          <span>Feedback</span>
        </button>
      </aside>

      <div className="rqk-app-shell-content">
        {children}
      </div>
    </div>
  );
}
