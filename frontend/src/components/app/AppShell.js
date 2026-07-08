import { useEffect, useState } from 'react';
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

  return (
    <div className="rqk-app-shell">
      <aside className="rqk-app-rail" aria-label="App navigation">
        <Link to="/home" className="rqk-app-rail-brand" aria-label="Rookie Quest Keeper dashboard">
          <span className="rqk-app-rail-brand-mark" aria-hidden="true">RQK</span>
          <span className="rqk-app-rail-brand-copy">
            <strong>Rookie Quest</strong>
            <small>Keeper Hub</small>
          </span>
        </Link>

        <nav className="rqk-app-rail-nav" aria-label="Main app sections">
          <p className="rqk-app-rail-section-label">Workspace</p>
          {mainNavItems.map((item) => (
            <RailLink key={item.label} item={item} pathname={location.pathname} />
          ))}
        </nav>

        <div className="rqk-app-rail-bottom">
          <p className="rqk-app-rail-section-label">Support</p>
          <button type="button" className="rqk-app-rail-link rqk-app-rail-feedback" onClick={openFeedback}>
            <MessageSquare size={20} aria-hidden="true" />
            <span>Feedback</span>
          </button>

          {isAdmin && <RailLink item={adminNavItem} pathname={location.pathname} />}
        </div>
      </aside>

      <div className="rqk-app-shell-content">
        {children}
      </div>
    </div>
  );
}
