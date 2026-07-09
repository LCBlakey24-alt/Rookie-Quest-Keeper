import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Home, MessageSquare, MoreHorizontal, ShieldCheck, Settings, Sparkles, UploadCloud, UsersRound, Wand2, X } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import '@/styles/appShellRail.css';
import '@/styles/railFeedbackButtons.css';
import '@/styles/homeDashboardExperience.css';
import '@/styles/homebrewWorkshopExperience.css';
import '@/styles/homeHubMobileNavPolish.css';
import '@/styles/adminFeedbackExperience.css';
import '@/styles/accountSettingsExperience.css';

const mainNavItems = [
  { label: 'Dashboard', to: '/home', icon: Home, matches: ['/home'], mobilePrimary: true },
  { label: 'My Characters', to: '/characters', icon: UsersRound, matches: ['/characters'], mobilePrimary: true },
  { label: 'My Campaigns', to: '/campaigns', icon: BookOpen, matches: ['/campaigns', '/campaign'], mobilePrimary: true },
  { label: 'My Homebrew', to: '/homebrew', icon: Wand2, matches: ['/homebrew'], mobilePrimary: true },
  { label: 'My Uploads', to: '/uploads', icon: UploadCloud, matches: ['/uploads'], mobilePrimary: false },
  { label: 'Settings', to: '/account', icon: Settings, matches: ['/account'], mobilePrimary: false },
];

const adminNavItem = { label: 'Admin', to: '/admin', icon: ShieldCheck, matches: ['/admin'], mobilePrimary: false };

function isActive(pathname, item) {
  return item.matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));
}

function RailLink({ item, pathname, className = '', onClick }) {
  const Icon = item.icon;
  const active = isActive(pathname, item);
  const classes = [
    'rqk-app-rail-link',
    active ? 'is-active' : '',
    item.mobilePrimary === false ? 'rqk-app-rail-link--mobile-secondary' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Link
      to={item.to}
      className={classes}
      aria-label={item.label}
      title={item.label}
      onClick={onClick}
    >
      <Icon size={20} aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}

function openFeedback() {
  window.dispatchEvent(new Event('rook-feedback-open'));
}

function openRook() {
  window.dispatchEvent(new Event('rook-assistant-open'));
}

function MobileMorePanel({ items, pathname, onClose, onFeedback, onRook }) {
  return (
    <div id="rqk-app-mobile-more-panel" className="rqk-app-mobile-more-panel" role="menu" aria-label="More app tools">
      <div className="rqk-app-mobile-more-heading">
        <div>
          <strong>More tools</strong>
          <span>Rook, uploads, settings, feedback, and owner tools.</span>
        </div>
        <button type="button" className="rqk-app-mobile-more-close" onClick={onClose} aria-label="Close more tools">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="rqk-app-mobile-more-grid">
        {items.map((item) => {
          const Icon = item.icon;
          if (item.kind === 'rook') {
            return (
              <button key={item.label} type="button" className="rqk-app-mobile-more-item rqk-app-mobile-more-item--rook" onClick={onRook} role="menuitem">
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          }

          if (item.kind === 'feedback') {
            return (
              <button key={item.label} type="button" className="rqk-app-mobile-more-item" onClick={onFeedback} role="menuitem">
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          }

          const active = isActive(pathname, item);
          return (
            <Link key={item.label} to={item.to} className={active ? 'rqk-app-mobile-more-item is-active' : 'rqk-app-mobile-more-item'} onClick={onClose} role="menuitem">
              <Icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function AppShell({ children }) {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

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

  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMoreOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsMoreOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMoreOpen]);

  const mobileMoreItems = useMemo(() => {
    const tools = [
      { label: 'Ask Rook', icon: Sparkles, kind: 'rook' },
      ...mainNavItems.filter((item) => item.mobilePrimary === false),
      { label: 'Feedback', icon: MessageSquare, kind: 'feedback' },
    ];

    if (isAdmin) tools.push(adminNavItem);
    return tools;
  }, [isAdmin]);

  const handleRook = () => {
    setIsMoreOpen(false);
    openRook();
  };

  const handleFeedback = () => {
    setIsMoreOpen(false);
    openFeedback();
  };

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
          <button type="button" className="rqk-app-rail-link rqk-app-rail-rook rqk-app-rail-support-link" onClick={openRook}>
            <Sparkles size={20} aria-hidden="true" />
            <span>Ask Rook</span>
          </button>
          <button type="button" className="rqk-app-rail-link rqk-app-rail-feedback rqk-app-rail-support-link" onClick={openFeedback}>
            <MessageSquare size={20} aria-hidden="true" />
            <span>Feedback</span>
          </button>

          {isAdmin && <RailLink item={adminNavItem} pathname={location.pathname} className="rqk-app-rail-support-link" />}

          <button
            type="button"
            className={isMoreOpen ? 'rqk-app-rail-link rqk-app-mobile-more-trigger is-active' : 'rqk-app-rail-link rqk-app-mobile-more-trigger'}
            onClick={() => setIsMoreOpen((value) => !value)}
            aria-label="Open more tools"
            aria-expanded={isMoreOpen}
            aria-controls="rqk-app-mobile-more-panel"
          >
            <MoreHorizontal size={20} aria-hidden="true" />
            <span>More</span>
          </button>
        </div>

        {isMoreOpen && (
          <MobileMorePanel
            items={mobileMoreItems}
            pathname={location.pathname}
            onClose={() => setIsMoreOpen(false)}
            onRook={handleRook}
            onFeedback={handleFeedback}
          />
        )}
      </aside>

      <div className="rqk-app-shell-content">
        {children}
      </div>
    </div>
  );
}
