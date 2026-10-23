import React, { useEffect, useId, useRef, useState } from 'react';
import { Network, Sparkles, Users } from 'lucide-react';
import NPCsTab from './NPCsTab';
import NPCRelationshipWeb from '../NPCRelationshipWeb';
import QuickNpcGenerator from '../gm/QuickNpcGenerator';
import './NPCsConsolidatedTab.css';

const theme = {
  bg: 'var(--rq-bg-main)',
  panel: 'var(--rq-bg-panel)',
  card: 'var(--rq-card)',
  text: 'var(--rq-text-primary)',
  soft: 'var(--rq-text-secondary)',
  primary: 'var(--rq-accent-primary)',
  blue: 'var(--rq-secondary)',
  border: 'var(--rq-border-default)',
};

const SUB_TABS = [
  {
    id: 'list',
    label: 'NPC Library',
    description: 'People, stat blocks & lore',
    icon: Users,
  },
  {
    id: 'generate',
    label: 'Create NPC',
    description: 'Build your next character',
    icon: Sparkles,
  },
  {
    id: 'web',
    label: 'Relationships',
    description: 'Allies, families & secrets',
    icon: Network,
  },
];

/**
 * The NPC hub has one visible workspace at a time. Each tab reuses the same
 * campaign ID; changing campaigns resets the selection rather than showing
 * a tool or edit form from the previous campaign.
 */
export default function NPCsConsolidatedTab({ campaignId }) {
  const [activeSubTab, setActiveSubTab] = useState('list');
  const instanceId = useId();
  const tabsRef = useRef([]);

  useEffect(() => {
    setActiveSubTab('list');
  }, [campaignId]);

  const selectTab = (index, focus = false) => {
    const tab = SUB_TABS[index];
    if (!tab) return;
    setActiveSubTab(tab.id);
    if (focus) tabsRef.current[index]?.focus();
  };

  const onTabKeyDown = (event, index) => {
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % SUB_TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index + SUB_TABS.length - 1) % SUB_TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = SUB_TABS.length - 1;
    else return;
    event.preventDefault();
    selectTab(nextIndex, true);
  };

  const selected = SUB_TABS.find(tab => tab.id === activeSubTab) || SUB_TABS[0];

  return (
    <section className="rqk-npc-hub" data-testid="npcs-consolidated-tab">
      <header className="rqk-npc-hub__header">
        <div className="rqk-npc-hub__heading">
          <p className="rqk-npc-hub__eyebrow">Guild Ledger / People & stories</p>
          <h2>NPC Workspace</h2>
          <p>Every character, connection and secret for this campaign, in one place.</p>
        </div>
        <span className="rqk-npc-hub__privacy"><span aria-hidden="true" /> GM workspace</span>
      </header>

      <div role="tablist" aria-label="NPC workspace tools" className="rqk-npc-hub__tabs">
        {SUB_TABS.map((tab, index) => {
          const Icon = tab.icon;
          const active = tab.id === selected.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              ref={element => { tabsRef.current[index] = element; }}
              id={instanceId + '-' + tab.id + '-tab'}
              aria-controls={instanceId + '-npc-panel'}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              data-testid={'npcs-subtab-' + tab.id}
              className={'rqk-npc-hub__tab' + (active ? ' is-active' : '')}
              onClick={() => selectTab(index)}
              onKeyDown={event => onTabKeyDown(event, index)}
            >
              <span className="rqk-npc-hub__tab-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.8} /></span>
              <span className="rqk-npc-hub__tab-copy">
                <strong>{tab.label}</strong>
                <small>{tab.description}</small>
              </span>
              <span className="rqk-npc-hub__tab-indicator" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={instanceId + '-npc-panel'}
        aria-labelledby={instanceId + '-' + selected.id + '-tab'}
        tabIndex={0}
        className="rqk-npc-hub__panel"
        data-testid="npcs-active-subtab-panel"
      >
        {activeSubTab === 'list' && <NPCsTab campaignId={campaignId} />}
        {activeSubTab === 'generate' && <QuickNpcGenerator campaignId={campaignId} theme={theme} />}
        {activeSubTab === 'web' && <NPCRelationshipWeb campaignId={campaignId} />}
      </div>
    </section>
  );
}
