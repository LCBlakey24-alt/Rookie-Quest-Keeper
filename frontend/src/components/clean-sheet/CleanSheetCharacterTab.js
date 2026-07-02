import React, { useMemo } from 'react';
import { AlertTriangle, BadgeInfo, Gauge, Shield, Sparkles, UserCircle } from 'lucide-react';

import { deriveCharacterSnapshot } from '@/data/deriveCharacterSnapshot';
import { fmt } from './cleanSheetUtils';

function display(value, fallback = 'Not set') {
  return value === undefined || value === null || value === '' ? fallback : value;
}

export default function CleanSheetCharacterTab({ character, ac, speed, proficiencyBonus }) {
  const snapshot = useMemo(() => deriveCharacterSnapshot(character), [character]);
  const warnings = snapshot.warnings || [];
  const identity = snapshot.identity || {};
  const resources = snapshot.resources || [];
  const features = snapshot.features || [];

  return (
    <div className="clean-sheet-grid clean-sheet-character-tab">
      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section clean-sheet-character-identity-section">
        <div className="clean-sheet-section-heading-row">
          <h2>Character</h2>
          <span>{identity.edition || '2014'} rules</span>
        </div>

        <div className="clean-sheet-skills-summary clean-sheet-character-summary-grid">
          <div><span>Name</span><strong>{display(character?.name, 'Unnamed')}</strong></div>
          <div><span>Class</span><strong>{display(identity.primaryClass || character?.character_class, 'Class')}</strong></div>
          <div><span>Subclass</span><strong>{display(character?.subclass, 'None')}</strong></div>
          <div><span>Level</span><strong>{display(identity.level || character?.level || 1)}</strong></div>
          <div><span>Race/Species</span><strong>{display(snapshot.race?.name || character?.race || character?.species)}</strong></div>
          <div><span>Background</span><strong>{display(character?.background)}</strong></div>
        </div>
      </section>

      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section">
        <h2>Sheet Snapshot</h2>
        <div className="clean-sheet-core-stat-grid">
          <div className="clean-sheet-core-stat-card"><Shield size={15} /><span>AC</span><strong>{display(ac ?? character?.armor_class ?? 10)}</strong></div>
          <div className="clean-sheet-core-stat-card"><Gauge size={15} /><span>Speed</span><strong>{display(snapshot.race?.speed || speed || character?.speed || 30)}ft</strong></div>
          <div className="clean-sheet-core-stat-card"><BadgeInfo size={15} /><span>Prof</span><strong>{fmt(snapshot.proficiencyBonus || proficiencyBonus || 2)}</strong></div>
          <div className="clean-sheet-core-stat-card"><Sparkles size={15} /><span>Features</span><strong>{features.length}</strong></div>
          <div className="clean-sheet-core-stat-card"><UserCircle size={15} /><span>Resources</span><strong>{resources.length}</strong></div>
          <div className="clean-sheet-core-stat-card"><AlertTriangle size={15} /><span>Warnings</span><strong>{warnings.length}</strong></div>
        </div>
      </section>

      {resources.length > 0 && (
        <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section">
          <h2>Class Resources</h2>
          <div className="clean-sheet-readiness-grid">
            {resources.map(resource => (
              <div key={resource.key || resource.label}>
                <span>{resource.label}</span>
                <strong>{resource.current ?? resource.max ?? 0}/{resource.max ?? resource.current ?? 0}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {warnings.length > 0 && (
        <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section">
          <h2>Readiness Warnings</h2>
          {warnings.slice(0, 3).map(warning => (
            <div key={warning} className="clean-sheet-snapshot-warning">
              <AlertTriangle size={15} />
              <span>{warning}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
