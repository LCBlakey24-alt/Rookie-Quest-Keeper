import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, BookOpen, LayoutDashboard, Menu, MessageSquare, Swords } from 'lucide-react';
import { playerSheetReturnFromLocation } from '@/components/player/playerSheetNavigation';
import { useDeviceLayout } from '@/layouts/deviceLayout';
import './CompactCommandMobile.css';
import './CleanSheetTabs.minimal.css';
import './CleanSheetTabsRail.css';
import './CleanSheetTabsAppShell.css';
import './CleanLevelUpWizardPolish.css';
import './CleanSheetTabAttention.css';
import './CleanSheetFinalHammer.css';

function backCopy(returnTo) {
  if (returnTo === '/characters') return 'Back to characters';
  if (returnTo.startsWith('/player/campaign/')) return 'Back to campaign';
  if (returnTo.startsWith('/mobile/')) return 'Back to mobile campaign';
  if (returnTo === '/mobile') return 'Back to mobile player home';
  if (returnTo === '/player') return 'Back to player home';
  return 'Back to dashboard';
}

export default function CleanSheetTabs({ tabs, activeTab, onSelectTab, onBack }) {
  const location = useLocation();
  const navigate = useNavigate();
  const playerReturnTo = playerSheetReturnFromLocation(location);
  const backLabel = backCopy(playerReturnTo);
  const isPhone = useDeviceLayout() === 'mobile';
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef(null);
  const moreTabs = [
    { id: 'full-stats', label: 'Full Stats', icon: Activity },
    ...tabs.filter(tab => !['stats', 'combat', 'spells'].includes(tab.id)),
  ];
  const moreSelected = !['stats', 'combat', 'spells'].includes(activeTab);

  const handleBack = () => {
    if (playerReturnTo) {
      navigate(playerReturnTo);
      return;
    }
    if (onBack) {
      onBack();
      return;
    }
    window.location.assign('/home');
  };

  useEffect(() => {
    if (!moreOpen) return undefined;
    const handleEscape = event => {
      if (event.key === 'Escape') {
        setMoreOpen(false);
        moreButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [moreOpen]);

  useEffect(() => { setMoreOpen(false); }, [activeTab, isPhone]);

  const selectMobileTab = tab => {
    setMoreOpen(false);
    onSelectTab(tab);
  };

  const openFeedback = () => {
    window.dispatchEvent(new Event('rook-feedback-open'));
  };

  if (isPhone) {
    const primaryTabs = [
      { id: 'stats', label: 'Overview', icon: LayoutDashboard },
      { id: 'combat', label: 'Combat', icon: Swords },
      { id: 'spells', label: 'Spells', icon: BookOpen },
    ];

    return (
      <>
        {moreOpen && (
          <>
            <button className="rqk-cc-menu-scrim" type="button" aria-label="Close character sections" onClick={() => setMoreOpen(false)} />
            <div className="rqk-cc-more-panel" role="menu" aria-label="More character sections">
              <div className="rqk-cc-more-heading"><strong>Character sections</strong><span>Full sheet and tools</span></div>
              <button type="button" role="menuitem" onClick={handleBack}><ArrowLeft size={17} aria-hidden="true" /> {backLabel}</button>
              {moreTabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    type="button"
                    role="menuitem"
                    key={tab.id}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                    onClick={() => selectMobileTab(tab)}
                  >
                    <Icon size={17} aria-hidden="true" />
                    {tab.label}{tab.needsAttention ? ' • Needs attention' : ''}
                  </button>
                );
              })}
              <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); openFeedback(); }}><MessageSquare size={17} aria-hidden="true" /> Send feedback</button>
            </div>
          </>
        )}
        <nav className="rqk-cc-dock" aria-label="Mobile character sections">
          {primaryTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'is-active' : ''}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                onClick={() => selectMobileTab(tab)}
              ><Icon size={19} aria-hidden="true" /><span>{tab.label}</span></button>
            );
          })}
          <button
            ref={moreButtonRef}
            type="button"
            className={moreSelected || moreOpen ? 'is-active' : ''}
            aria-label="More character sections"
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            aria-current={moreSelected ? 'page' : undefined}
            onClick={() => setMoreOpen(open => !open)}
          ><Menu size={19} aria-hidden="true" /><span>More</span></button>
        </nav>
      </>
    );
  }

  return (
    <nav className="clean-sheet-tabs" aria-label="Character sheet sections">
      <button
        type="button"
        className="clean-sheet-rail-back"
        onClick={handleBack}
        aria-label={backLabel}
        title={backLabel}
      >
        <ArrowLeft size={18} />
        <span>Back</span>
      </button>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab)}
            className={`${selected ? 'active' : ''} ${tab.needsAttention ? 'needs-attention' : ''}`.trim()}
            aria-label={tab.needsAttention ? `${tab.label} needs attention` : tab.label}
            aria-current={selected ? 'page' : undefined}
            title={tab.needsAttention ? `${tab.label} needs attention` : tab.label}
            type="button"
          >
            <Icon size={17} />
            <span>{tab.label}</span>
            {tab.needsAttention && <em className="clean-sheet-tab-warning" aria-hidden="true" />}
          </button>
        );
      })}
      <button
        type="button"
        className="clean-sheet-rail-feedback"
        onClick={openFeedback}
        aria-label="Send feedback"
        title="Feedback"
      >
        <MessageSquare size={17} />
        <span>Feedback</span>
      </button>
    </nav>
  );
}
