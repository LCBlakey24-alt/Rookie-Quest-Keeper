const sectionCopy = {
  Characters: 'Open a sheet to play, level up, check resources, or continue building a character.',
  Campaigns: 'Open a joined campaign for your party, shared world information, initiative, notes, handouts and timeline.',
  Notes: 'Keep your own campaign notes together without mixing them into the GM’s campaign records.',
  Received: 'Everything your GM has shared with you appears here, including handouts you have not opened yet.',
};

function descriptionFor(activeLabel = '') {
  if (activeLabel.startsWith('Received')) return sectionCopy.Received;
  return sectionCopy[activeLabel] || 'Your player space keeps characters, campaigns, notes and shared handouts together.';
}

export default function PlayerDashboardContext({ activeLabel, summaryCards }) {
  return (
    <section className="player-desktop-context player-dashboard-board player-dashboard-context">
      <div className="player-dashboard-context-copy">
        <p className="player-dashboard-eyebrow">Player Space</p>
        <h2>{activeLabel}</h2>
        <p>{descriptionFor(activeLabel)}</p>
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
