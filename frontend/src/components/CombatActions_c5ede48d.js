
import React from "react";
import "../App.css";
import "../styles/designSystem.css";

export default function CombatActions({ character }) {

  if (!character) {
    return (
      <div className="rq-panel">
        <h2 className="rq-title">Combat Actions</h2>
        <p className="rq-muted">No character selected.</p>
      </div>
    );
  }

  const strMod = character.str_mod || 0;
  const dexMod = character.dex_mod || 0;

  return (
    <div className="rq-panel" style={{display:"grid", gap:"20px"}}>

      <h2 className="rq-title">Combat Actions</h2>

      <div className="rq-card">
        <h3>Standard Actions</h3>

        <ul className="rq-muted" style={{lineHeight:1.8}}>
          <li><strong>Attack</strong> – Make a weapon attack.</li>
          <li><strong>Unarmed Strike</strong> – +{strMod} to hit, 1 + STR damage.</li>
          <li><strong>Grapple</strong> – Athletics check vs target Athletics/Acrobatics.</li>
          <li><strong>Shove</strong> – Push target or knock prone.</li>
          <li><strong>Dash</strong> – Gain extra movement equal to speed.</li>
          <li><strong>Dodge</strong> – Attack rolls against you have disadvantage.</li>
          <li><strong>Help</strong> – Give ally advantage.</li>
          <li><strong>Hide</strong> – Dexterity (Stealth) check.</li>
          <li><strong>Ready</strong> – Prepare an action for a trigger.</li>
          <li><strong>Search</strong> – Perception or Investigation check.</li>
        </ul>
      </div>

      <div className="rq-card">
        <h3>Bonus Actions</h3>

        <ul className="rq-muted" style={{lineHeight:1.8}}>
          <li>Off-hand attack</li>
          <li>Class features</li>
          <li>Spellcasting (if allowed)</li>
        </ul>
      </div>

      <div className="rq-card">
        <h3>Reactions</h3>

        <ul className="rq-muted" style={{lineHeight:1.8}}>
          <li>Opportunity Attack</li>
          <li>Shield spell</li>
          <li>Class reactions</li>
        </ul>
      </div>

      <div className="rq-card">
        <h3>Movement</h3>

        <div className="rq-muted">
          Speed: <strong>{character.speed || 30} ft</strong>
        </div>
      </div>

    </div>
  );
}
