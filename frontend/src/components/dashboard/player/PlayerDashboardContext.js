export default function PlayerDashboardContext({ activeLabel, summaryCards }) {
  return (
    <section className="player-desktop-context player-dashboard-board player-dashboard-context">
      <div className="player-dashboard-context-copy">
        <p className="player-dashboard-eyebrow">Current Player Space</p>
        <h2>{activeLabel}</h2>
        <p>
          Desktop gives players a quick command centre for sheets, linked campaigns, notes, and GM handouts without squeezing everything into a phone layout.
        </p>
      </div>

      <div className="player-dashboard-summary-grid">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.label} className="player-dashboard-summary-card">
              <Icon size={18} className="player-dashboard-summary-icon" />
              <div className="player-dashboard-summary-copy">
                <p>{card.label}</p>
                <strong>{card.value}</strong>
                <span>{card.detail}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
