export default function PlayerDashboardTabs({ tabs, activeTab, setActiveTab, children }) {
  return (
    <section className="player-dashboard-board player-dashboard-tab-shell">
      <div className="player-dashboard-tab-list" role="tablist" aria-label="Player dashboard tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              data-testid={tab.testId}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.id)}
              className={selected ? 'player-dashboard-tab player-dashboard-tab-active' : 'player-dashboard-tab'}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="player-dashboard-tab-content">
        {children}
      </div>
    </section>
  );
}
