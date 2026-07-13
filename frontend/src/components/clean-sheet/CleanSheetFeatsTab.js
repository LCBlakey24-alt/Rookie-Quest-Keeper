import React from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';

import { toArray } from './cleanSheetUtils';

function normaliseFeat(feat) {
  if (!feat) return { name: 'Unknown feat', description: '' };
  if (typeof feat === 'string') return { name: feat, description: '' };
  return {
    name: feat.name || feat.title || feat.label || 'Feat',
    description: feat.description || feat.desc || feat.summary || feat.text || '',
    source: feat.source || feat.type || feat.category || '',
    level: feat.level || feat.gained_at_level || '',
  };
}

export default function CleanSheetFeatsTab({ character }) {
  const feats = toArray(character?.feats);
  const rulesText = String(character?.rules_edition || character?.edition || character?.ruleset_id || '');
  const is2024 = rulesText.includes('2024');
  const needsAttention = is2024 && !feats.length;

  return (
    <div className="clean-sheet-grid clean-sheet-feats-tab">
      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-panel-heading">
          <div>
            <h2>Feats</h2>
            <p>Chosen feats, origin feats, and optional table feats live here.</p>
          </div>
          <span>{feats.length} feat{feats.length === 1 ? '' : 's'}</span>
        </div>
      </section>

      {needsAttention && (
        <section className="clean-sheet-panel clean-sheet-wide clean-sheet-attention-section">
          <h2>Feats Need Attention</h2>
          <div className="clean-sheet-snapshot-warning clean-sheet-detail-warning">
            <AlertTriangle size={15} />
            <span>No 2024 origin feat is saved yet. Add one if your table is using origin feats.</span>
          </div>
        </section>
      )}

      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-panel-heading">
          <div>
            <h2>Selected Feats</h2>
            <p>Effects may still need manual review until every feat has full automation.</p>
          </div>
          <Sparkles size={18} />
        </div>
        {feats.length ? (
          <div className="clean-sheet-feature-grid">
            {feats.map((feat, index) => {
              const item = normaliseFeat(feat);
              return (
                <article key={`${item.name}-${index}`} className="clean-sheet-feature-card">
                  <div className="clean-sheet-feature-topline">
                    <span>{item.source || 'Feat'}</span>
                    {item.level && <em>Level {item.level}</em>}
                  </div>
                  <strong>{item.name}</strong>
                  {item.description ? <p>{item.description}</p> : <p>Feat saved on this character. Check exact effects with your table until this feat is fully automated.</p>}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="clean-sheet-muted">No feats found yet.</p>
        )}
      </section>
    </div>
  );
}
