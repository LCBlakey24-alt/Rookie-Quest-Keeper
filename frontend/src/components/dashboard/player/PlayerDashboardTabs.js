import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import './PlayerDashboardTabs.css';

export const PLAYER_DASHBOARD_TAB_KEY = 'rqk.player.dashboard-tab';

function readRememberedTab() {
  try {
    return sessionStorage.getItem(PLAYER_DASHBOARD_TAB_KEY) || '';
  } catch {
    return '';
  }
}

function rememberTab(tabId) {
  try {
    if (tabId) sessionStorage.setItem(PLAYER_DASHBOARD_TAB_KEY, tabId);
  } catch {
    // Navigation still works when session storage is unavailable.
  }
}

export function resolveRememberedPlayerTab(tabs, activeTab) {
  const validIds = new Set((tabs || []).map(tab => tab.id));
  const remembered = readRememberedTab();
  return validIds.has(remembered) ? remembered : activeTab;
}

export default function PlayerDashboardTabs({ tabs, activeTab, setActiveTab, children }) {
  useEffect(() => {
    const remembered = resolveRememberedPlayerTab(tabs, activeTab);
    if (remembered !== activeTab) setActiveTab(remembered);
  }, [activeTab, setActiveTab, tabs]);

  const changeTab = (nextTab) => {
    rememberTab(nextTab);
    setActiveTab(nextTab);
  };

  return (
    <Tabs value={activeTab} onValueChange={changeTab} className="player-dashboard-board player-dashboard-tab-shell">
      <TabsList className="player-dashboard-tab-list" aria-label="Player dashboard tabs">
        {tabs.map(({ id, testId, label, badge, icon: Icon }) => (
          <TabsTrigger key={id} value={id} data-testid={testId}
            className={activeTab === id ? 'player-dashboard-tab player-dashboard-tab-active' : 'player-dashboard-tab'}>
            <Icon size={16} />
            <span className="player-dashboard-tab-label">{label}</span>
            {badge > 0 && (
              <span className="player-dashboard-tab-badge" aria-label={`${badge} unread`}>
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map(tab => <TabsContent key={tab.id} value={tab.id} className="player-dashboard-tab-content">
        {activeTab === tab.id ? children : null}
      </TabsContent>)}
    </Tabs>
  );
}
