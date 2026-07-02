import React from 'react';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import './CleanSheetTabs.minimal.css';
import './CleanSheetTabsRail.css';
import './CleanSheetTabsAppShell.css';
import './CleanLevelUpWizardPolish.css';

export default function CleanSheetTabs({ tabs, activeTab, onSelectTab, onBack }) {
  const handleBack = () => {
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
        aria-label="Back to dashboard"
        title="Back"
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
            className={selected ? 'active' : ''}
            aria-label={tab.label}
            title={tab.label}
            type="button"
          >
            <Icon size={17} /> <span>{tab.label}</span>
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
