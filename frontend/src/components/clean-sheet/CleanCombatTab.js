import React from 'react';

const mod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
const fmt = (value) => (value >= 0 ? `+${value}` : `${value}`);

function CombatActionCard({ title, description, onClick }) {
  return (
    <button type="button" className="clean-sheet-action-card" onClick={onClick}>
      <strong>{title}</strong>
      <span>{description}</span>
    </button>
  );
}

export default function CleanCombatTab({ character, ac, speed, proficiencyBonus, onRoll }) {
  const strengthMod = mod(character?.strength);
  const dexterityMod = mod(character?.dexterity);
  const constitutionMod = mod(character?.constitution);
  const bestAttackMod = proficiencyBonus + Math.max(strengthMod, dexterityMod);

  return (
    <div className="clean-sheet-combat-wrap">
      <div className="clean-sheet-grid">
        <section className="clean-sheet-panel clean-sheet-wide">
          <h2>Core Actions</h2>
          <div className="clean-sheet-action-grid">
            <CombatActionCard title="Attack" description={`Roll d20 ${fmt(bestAttackMod)} to hit`} onClick={() => onRoll('Attack', bestAttackMod)} />
            <CombatActionCard title="Initiative" description={`Roll d20 ${fmt(dexterityMod)}`} onClick={() => onRoll('Initiative', dexterityMod)} />
            <CombatActionCard title="Strength Check" description={`Roll d20 ${fmt(strengthMod)}`} onClick={() => onRoll('Strength Check', strengthMod)} />
            <CombatActionCard title="Dexterity Check" description={`Roll d20 ${fmt(dexterityMod)}`} onClick={() => onRoll('Dexterity Check', dexterityMod)} />
            <CombatActionCard title="Constitution Check" description={`Roll d20 ${fmt(constitutionMod)}`} onClick={() => onRoll('Constitution Check', constitutionMod)} />
          </div>
        </section>

        <section className="clean-sheet-panel clean-sheet-wide">
          <h2>Combat Summary</h2>
          <div className="clean-sheet-combat-summary">
            <div><span>Armor Class</span><strong>{ac}</strong></div>
            <div><span>Speed</span><strong>{speed}ft</strong></div>
            <div><span>Proficiency</span><strong>{fmt(proficiencyBonus)}</strong></div>
            <div><span>Best Attack</span><strong>{fmt(bestAttackMod)}</strong></div>
          </div>
        </section>
      </div>
    </div>
  );
}
