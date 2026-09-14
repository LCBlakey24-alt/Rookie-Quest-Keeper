import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { playerSheetReturnFromLocation } from '@/components/player/playerSheetNavigation';
import './CleanSheetTabs.minimal.css';
import './CleanSheetTabsRail.css';
import './CleanSheetTabsAppShell.css';
import './CleanSheetMobileRail.css';
import './CleanLevelUpWizardPolish.css';
import './CleanSheetTabAttention.css';
import './CleanSheetFinalHammer.css';

function backCopy(returnTo) {
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

  const openFeedback = () => {
    window.dispatchEvent(new Event('rook-feedback-open'));
  };

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
