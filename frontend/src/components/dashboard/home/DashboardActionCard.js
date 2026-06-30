export default function DashboardActionCard({ title, text, meta, onClick }) {
  return <button type="button" onClick={onClick} className="unified-dashboard-action-card"><span className="dashboard-card-accent" /><span className="dashboard-action-text"><strong>{title}</strong><span>{text}</span><em>{meta}</em></span><span className="dashboard-arrow" aria-hidden="true">›</span></button>;
}
