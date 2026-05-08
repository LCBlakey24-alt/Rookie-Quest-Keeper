import React from 'react';

const mod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
const fmt = (value) => (value >= 0 ? `+${value}` : `${value}`);

function CombatActionCard({ title, description, type = 'Action', onClick }) {
  return (
    <button type="button" className="clean-sheet-action-card" onClick={onClick}>
      <span className="clean-sheet-action-type">{type}</span>
      <strong>{title}</strong>
      <span>{description}</span>
    </button>
  );
}

function ActionSection({ title, children }) {
  return (
    <section className="clean-sheet-panel clean-sheet-wide">
      <h2>{title}</h2>
      <div className="clean-sheet-action-grid">
        {children}
      </div>
    </section>
  );
}

export default function CleanCombatTab({ character, ac, speed, proficiencyBonus, onRoll }) {
  const strengthMod = mod(character?.strength);
  const dexterityMod = mod(character?.dexterity);
  const bestAttackMod = proficiencyBonus + Math.max(strengthMod, dexterityMod);
  const className = character?.character_class || 'Adventurer';

  return (
    <div className="clean-sheet-combat-wrap">
      <div className="clean-sheet-grid">
        <ActionSection title="Actions">
          <CombatActionCard title="Attack" type="Action" description={`Make a weapon attack. Roll d20 ${fmt(bestAttackMod)} to hit.`} onClick={() => onRoll('Attack', bestAttackMod)} />
          <CombatActionCard title="Dash" type="Action" description="Gain extra movement equal to your speed this turn." />
          <CombatActionCard title="Disengage" type="Action" description="Your movement does not provoke opportunity attacks this turn." />
          <CombatActionCard title="Dodge" type="Action" description="Attack rolls against you have disadvantage until your next turn." />
          <CombatActionCard title="Help" type="Action" description="Give an ally advantage on a relevant check or attack." />
          <CombatActionCard title="Ready" type="Action" description="Prepare an action to trigger later this round." />
        </ActionSection>

        <ActionSection title="Bonus Actions">
          <CombatActionCard title="Off-hand Attack" type="Bonus" description="Use when dual-wielding after taking the Attack action." onClick={() => onRoll('Off-hand Attack', bestAttackMod)} />
          {className === 'Rogue' && <CombatActionCard title="Cunning Action" type="Bonus" description="Dash, Disengage, or Hide as a bonus action." />}
          {className === 'Monk' && <CombatActionCard title="Martial Arts" type="Bonus" description="Make one unarmed strike after attacking with a monk weapon or unarmed strike." onClick={() => onRoll('Martial Arts', bestAttackMod)} />}
          {className === 'Barbarian' && <CombatActionCard title="Rage" type="Bonus" description="Enter a rage if you have uses remaining." />}
          {className === 'Fighter' && <CombatActionCard title="Second Wind" type="Bonus" description="Regain hit points once per rest if available." />}
          <CombatActionCard title="Use Class Feature" type="Bonus" description="Use any bonus action feature granted by class, race, feat, or spell." />
        </ActionSection>

        <ActionSection title="Reactions">
          <CombatActionCard title="Opportunity Attack" type="Reaction" description="Attack a creature that leaves your reach." onClick={() => onRoll('Opportunity Attack', bestAttackMod)} />
          <CombatActionCard title="Readied Action" type="Reaction" description="Use your reaction to trigger a previously readied action." />
          <CombatActionCard title="Use Reaction Feature" type="Reaction" description="Use a reaction from a class feature, race, feat, spell, or item." />
        </ActionSection>

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
