import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PlayerDashboardTabs({ tabs, activeTab, setActiveTab, children }) {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="player-dashboard-board player-dashboard-tab-shell">
      <TabsList className="player-dashboard-tab-list" aria-label="Player dashboard tabs">
        {tabs.map(({ id, testId, label, icon: Icon }) => (
          <TabsTrigger key={id} value={id} data-testid={testId}
            className={activeTab === id ? 'player-dashboard-tab player-dashboard-tab-active' : 'player-dashboard-tab'}>
            <Icon size={16} /> {label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map(tab => <TabsContent key={tab.id} value={tab.id} className="player-dashboard-tab-content">
        {activeTab === tab.id ? children : null}
      </TabsContent>)}
    </Tabs>
  );
}
