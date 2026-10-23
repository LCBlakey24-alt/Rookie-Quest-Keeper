import React, { useId } from 'react';
import { ChevronDown, Compass } from 'lucide-react';
import { allTabs, tabGroups } from './campaignDashboardTabs';

/**
 * Compact, one-control access to every GM tool on a phone.
 * Full grouped navigation remains on wider screens; this is a presentation
 * alternative using the same campaign-scoped tab IDs and routing callback.
 */
export default function CampaignMobileNavigator({ activeTab, onOpenTab }) {
  const selectId = useId();
  const active = allTabs.find(tab => tab.id === activeTab) || allTabs[0];

  return (
    <div className="rqk-campaign-mobile-navigator" data-testid="campaign-mobile-navigator">
      <div className="rqk-campaign-mobile-navigator__context">
        <Compass size={18} strokeWidth={1.8} aria-hidden="true" />
        <div>
          <span>GM workspace</span>
          <strong>{active.label}</strong>
        </div>
      </div>
      <div className="rqk-campaign-mobile-navigator__control">
        <label htmlFor={selectId}>Jump to a tool</label>
        <div className="rqk-campaign-mobile-navigator__select-wrap">
          <select
            id={selectId}
            aria-label="Jump to campaign workspace"
            data-testid="campaign-mobile-workspace-select"
            value={active.id}
            onChange={event => onOpenTab(event.target.value)}
          >
            {tabGroups.map(group => (
              <optgroup key={group.id} label={group.label}>
                {group.tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
              </optgroup>
            ))}
          </select>
          <ChevronDown size={17} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
