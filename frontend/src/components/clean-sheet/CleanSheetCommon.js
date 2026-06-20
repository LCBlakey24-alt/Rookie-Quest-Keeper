import React from 'react';

export function StatCard({ icon: Icon, label, value, sub, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`clean-sheet-stat-card ${onClick ? 'clean-sheet-clickable' : ''}`}>
      {Icon && <Icon size={18} />}
      <div className="clean-sheet-stat-value">{value}</div>
      <div className="clean-sheet-stat-label">{label}</div>
      {sub && <div className="clean-sheet-stat-sub">{sub}</div>}
    </Tag>
  );
}

export function DeathSaveTrack({ label, type, count, onToggle }) {
  return (
    <div className="clean-sheet-death-track">
      <span>{label}</span>
      <div>
        {[0, 1, 2].map(index => (
          <button
            key={index}
            type="button"
            className={index < count ? 'marked' : ''}
            onClick={() => onToggle(type, index)}
            aria-label={`${label} ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
