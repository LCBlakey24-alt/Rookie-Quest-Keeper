import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isDetailRoute, isTaskRoute } from '@/components/app/detailRoutes';
import { ArrowLeft, BookOpen, Dices, Home, MessageSquare, MoreHorizontal, ShieldCheck, Settings, Sparkles, UploadCloud, UsersRound, Wand2, X } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { AUTH_USERNAME_KEY } from '@/lib/auth';
import { BrandMainLogo, BrandMiniLogo } from '@/components/ui/BrandLogo';
import { useDeviceLayout } from '@/layouts/deviceLayout';
import '@/styles/appShellRail.css';
import '@/styles/railFeedbackButtons.css';
import '@/styles/homeDashboardExperience.css';
import '@/styles/homeHubMobileNavPolish.css';
import '@/styles/adminFeedbackExperience.css';
import '@/styles/appShellExperiencePolish.css';
import '@/styles/keeperSimplifiedNavigation.css';
import '@/layouts/desktop/appShell.css';
import '@/layouts/tablet/appShell.css';
import '@/layouts/mobile/appShell.css';
import { isLocalPreview } from '@/preview/previewMode';
import PreviewWorkspaceControls from '@/preview/PreviewWorkspaceControls';
import LevelUpGrantWatcher from '@/components/level-up-grant/LevelUpGrantWatcher';
import '@/preview/previewWorkspace.css';
// Last on purpose: the phone navigation's single source of truth.
import '@/styles/mobileNavigation.css';
import '@/styles/appShellTaskRoutes.css';

const ADMIN_CACHE_TTL_MS = 5 * 60 * 1000;
let adminCheckInFlight = null;

function adminCacheKey() {
  if (typeof window === 'undefined') return '';
  const username = localStorage.getItem(AUTH_USERNAME_KEY) || 'unknown';
  return `rqk.admin-check:${username}`;
}

function readCachedAdminStatus() {
  if (typeof window === 'undefined') return null;
  try {
    const key = adminCacheKey();
    if (!key) return null;
    const cached = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (!cached || typeof cached.isAdmin !== 'boolean' || !Number.isFinite(cached.checkedAt)) return null;
    if (Date.now() - cached.checkedAt > ADMIN_CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return cached.isAdmin;
  } catch {
    return null;
  }
}

function storeAdminStatus(isAdmin) {
  if (typeof window === 'undefined') return;
  try {
    const key = adminCacheKey();
    if (key) sessionStorage.setItem(key, JSON.stringify({ isAdmin: Boolean(isAdmin), checkedAt: Date.now() }));
  } catch {}
}

async function loadAdminStatus() {
  const cached = readCachedAdminStatus();
  if (cached !== null) return cached;
  if (adminCheckInFlight) return adminCheckInFlight;

  adminCheckInFlight = apiClient.get('/admin/check')
    .then((response) => {
      const isAdmin = Boolean(response.data?.is_admin);
      storeAdminStatus(isAdmin);
      return isAdmin;
    })
    .finally(() => {
      adminCheckInFlight = null;
    });

  return adminCheckInFlight;
}

const mainNavItems = [
  { label: 'Home', to: '/home', icon: Home, matches: ['/home'], mobilePrimary: true },
  { label: 'Characters', to: '/characters', icon: UsersRound, matches: ['/characters'], mobilePrimary: true },
  { label: 'Campaigns', to: '/campaigns', icon: BookOpen, matches: ['/campaigns', '/campaign', '/player/campaign'], mobilePrimary: true },
  { label: 'Homebrew', to: '/homebrew', icon: Wand2, matches: ['/homebrew'], mobilePrimary: true },
  { label: 'Community Creations', mobileLabel: 'Community', to: '/community', icon: Sparkles, matches: ['/community'], mobilePrimary: true },
];
// Legacy upload and account routes remain accessible without appearing as
// primary destinations; imports belong inside their relevant sections.
const utilityNavItems = [
  { label: 'Account settings', to: '/account', icon: Settings, matches: ['/account'], mobilePrimary: false },
  { label: 'Legacy uploads', to: '/uploads', icon: UploadCloud, matches: ['/uploads'], mobilePrimary: false },
];

const adminNavItem = { label: 'Admin', to: '/admin', icon: ShieldCheck, matches: ['/admin'], mobilePrimary: false };

function isActive(pathname, item) {
  return item.matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));
}

function sectionLabel(pathname) {
  const item = [...mainNavItems, ...utilityNavItems, adminNavItem].find((candidate) => isActive(pathname, candidate));
  return item?.label || 'Workspace';
}

function RailLink({ item, pathname, className = '', onClick, compact = false }) {
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
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {/* The phone tab bar's current-tab line; hidden on every other layout. */}
      <i className="rqk-app-rail-indicator" aria-hidden="true" />
      <Icon size={20} aria-hidden="true" />
      <span>{compact && item.mobileLabel ? item.mobileLabel : item.label}</span>
    </Link>
  );
}

function openFeedback() {
  window.dispatchEvent(new Event('rook-feedback-open'));
}

function openRook() {
  window.dispatchEvent(new Event('rook-assistant-open'));
}

function openDice() {
  window.dispatchEvent(new Event('rq-dice-open'));
}

function MobileMorePanel({ items, pathname, onClose, onFeedback, onRook, onDice }) {
  const panelRef = useRef(null);
  // Opening the panel moves focus into it, so keyboard and screen-reader
  // users land on the first tool rather than behind the sheet.
  useEffect(() => {
    panelRef.current?.querySelector('.rqk-app-mobile-more-item')?.focus();
  }, []);

  return (
    <>
    {/* Tapping anywhere outside the panel closes it. A plain element, not a
      * button: keyboard users close with Escape or the close button, and the
      * app-wide button theme would otherwise paint it solid. */}
    <div className="rqk-app-mobile-more-backdrop" aria-hidden="true" onClick={onClose} data-testid="mobile-more-backdrop" />
    <div ref={panelRef} id="rqk-app-mobile-more-panel" className="rqk-app-mobile-more-panel" role="menu" aria-label="More app tools">
      <div className="rqk-app-mobile-more-heading">
        <div>
          <strong>More tools</strong>
          <span>Extra pages and tools for your workspace.</span>
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

          if (item.kind === 'dice') {
            return (
              <button key={item.label} type="button" className="rqk-app-mobile-more-item" onClick={onDice} role="menuitem">
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
            <Link
              key={item.label}
              to={item.to}
              className={active ? 'rqk-app-mobile-more-item is-active' : 'rqk-app-mobile-more-item'}
              onClick={onClose}
              role="menuitem"
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
    </>
  );
}

export default function AppShell({ children }) {
  const location = useLocation();
  const deviceLayout = useDeviceLayout();
  const isMobile = deviceLayout === 'mobile';
  const [isAdmin, setIsAdmin] = useState(() => readCachedAdminStatus() ?? false);
  const availableNavItems = isAdmin ? [...mainNavItems, adminNavItem] : mainNavItems;
  const visibleNavItems = isMobile
    ? availableNavItems.filter((item) => item.mobilePrimary)
    : availableNavItems;
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    let active = true;

    loadAdminStatus()
      .then((nextIsAdmin) => {
        if (active) setIsAdmin(nextIsAdmin);
      })
      .catch(() => {
        // A temporary account-service problem should not create repeated retry
        // traffic or disturb the rest of the workspace. The next shell mount
        // can try again because failures are deliberately not cached.
        if (active) setIsAdmin(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname, deviceLayout]);

  useEffect(() => {
    if (!isMoreOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsMoreOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMoreOpen]);

  const mobileMoreItems = useMemo(() => {
    return [
      { label: 'Ask Rook', icon: Sparkles, kind: 'rook' },
      { label: 'Dice roller', icon: Dices, kind: 'dice' },
      ...utilityNavItems,
      ...availableNavItems.filter((item) => item.mobilePrimary === false),
      { label: 'Feedback', icon: MessageSquare, kind: 'feedback' },
    ];
  }, [availableNavItems]);
  const mobileMoreCurrentSection = mobileMoreItems.find((item) => item.to && isActive(location.pathname, item));

  const handleRook = () => {
    setIsMoreOpen(false);
    openRook();
  };

  const handleDice = () => {
    setIsMoreOpen(false);
    openDice();
  };

  const handleFeedback = () => {
    setIsMoreOpen(false);
    openFeedback();
  };

  // A task in progress (creator, import, edit): no phone tab bar, back arrow instead.
  const taskRoute = isTaskRoute(location.pathname);

  return (
    <div
      className="rqk-app-shell"
      data-rq-layout-shell="app"
      data-rq-device={deviceLayout}
      data-rq-focus={isDetailRoute(location.pathname) ? 'detail' : undefined}
      data-rq-task={taskRoute ? 'true' : undefined}
    >
      <aside className="rqk-app-rail" aria-label="App navigation">
        {!isMobile && <Link to="/home" className="rqk-app-rail-brand" aria-label="Rookie Quest Keeper dashboard">
          <span className="rqk-app-rail-brand-mark" aria-hidden="true">
            <BrandMiniLogo size={36} alt="" />
          </span>
          <span className="rqk-app-rail-brand-copy">
            <BrandMainLogo width={112} alt="" />
            <small>Keeper Hub</small>
          </span>
        </Link>}

        <nav className="rqk-app-rail-nav" aria-label="Main app sections">
          {!isMobile && <p className="rqk-app-rail-section-label">Workspace</p>}
          {visibleNavItems.map((item) => (
            <RailLink key={item.label} item={item} pathname={location.pathname} compact={isMobile} />
          ))}
        </nav>

        <div className="rqk-app-rail-bottom">
          {!isMobile && <>
            <p className="rqk-app-rail-section-label">Support</p>
            <button
              type="button"
              className="rqk-app-rail-link rqk-app-rail-dice rqk-app-rail-support-link"
              onClick={openDice}
              aria-label="Open dice roller"
              title="Open dice roller"
            >
              <Dices size={20} aria-hidden="true" />
              <span>Dice roller</span>
            </button>
            <button type="button" className="rqk-app-rail-link rqk-app-rail-rook rqk-app-rail-support-link" onClick={openRook} aria-label="Ask Rook" title="Ask Rook">
              <Sparkles size={20} aria-hidden="true" />
              <span>Ask Rook</span>
            </button>
            <button type="button" className="rqk-app-rail-link rqk-app-rail-feedback rqk-app-rail-support-link" onClick={openFeedback} aria-label="Feedback" title="Feedback">
              <MessageSquare size={20} aria-hidden="true" />
              <span>Feedback</span>
            </button>

          </>}


        </div>

        {isMobile && isMoreOpen && (
          <MobileMorePanel
            items={mobileMoreItems}
            pathname={location.pathname}
            onClose={() => setIsMoreOpen(false)}
            onRook={handleRook}
            onDice={handleDice}
            onFeedback={handleFeedback}
          />
        )}
      </aside>

      <div className="rqk-app-workspace">
        <header className="rqk-app-topbar" aria-label="Workspace controls">
          {isLocalPreview() ? <PreviewWorkspaceControls /> : <div className="rqk-app-topbar-title">
            {isMobile && (taskRoute ? (
              <Link to="/home" className="rqk-app-topbar-back" aria-label="Back to home dashboard" data-testid="topbar-back-home">
                <ArrowLeft size={22} aria-hidden="true" />
              </Link>
            ) : (
              <Link to="/home" className="rqk-app-topbar-brand" aria-label="Rookie Quest Keeper home">
                <BrandMiniLogo size={28} alt="" />
              </Link>
            ))}
            <span>Rookie Quest Keeper</span>
            <strong>{sectionLabel(location.pathname)}</strong>
          </div>}
          {!isMobile && <Link to="/account" aria-label="Account settings" title="Account settings" className="rqk-app-topbar-settings" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44, color: "#cddce8" }}><Settings size={20} aria-hidden="true" /></Link>}
          {isMobile && !taskRoute && (
            <button type="button" className="rqk-app-topbar-tools-toggle"
              aria-label={mobileMoreCurrentSection ? `Open more tools, current section ${mobileMoreCurrentSection.label}` : "Open more tools"} aria-expanded={isMoreOpen}
              aria-controls="rqk-app-mobile-more-panel"
              onClick={() => setIsMoreOpen((open) => !open)}>
              <MoreHorizontal size={20} aria-hidden="true" />
            </button>
          )}
        </header>

        <div className="rqk-app-shell-content">
          {children}
        </div>
      </div>
      {/* GM-granted level ups: plays "Levelled up!" once per grant. */}
      <LevelUpGrantWatcher />
    </div>
  );
}
