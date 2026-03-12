
import React, { useState } from "react";
import "../App.css";
import "../styles/designSystem.css";

export default function CharacterSheetFull({ character }) {

  const [deathSaves, setDeathSaves] = useState({
    success: 0,
    fail: 0
  });

  const toggleSuccess = () => {
    setDeathSaves(prev => ({
      ...prev,
      success: Math.min(prev.success + 1, 3)
    }));
  };

  const toggleFail = () => {
    setDeathSaves(prev => ({
      ...prev,
      fail: Math.min(prev.fail + 1, 3)
    }));
  };

  if (!character) {
    return (
      <div className="rq-panel">
        <h2 className="rq-title">No Character Loaded</h2>
        <p className="rq-muted">Select or create a character to view the sheet.</p>
      </div>
    );
  }

  return (
    <div className="rq-panel" style={{display:"grid", gap:"20px"}}>

      <div style={{display:"flex", gap:"20px", alignItems:"center"}}>
        {character.portrait && (
          <img
            src={character.portrait}
            alt="portrait"
            style={{
              width:"110px",
              height:"110px",
              objectFit:"cover",
              borderRadius:"12px",
              border:"2px solid var(--rq-gold)"
            }}
          />
        )}

        <div>
          <h2 className="rq-title">{character.name}</h2>
          <div className="rq-muted">
            {character.race} {character.class} • Level {character.level}
          </div>
        </div>
      </div>

      <div className="rq-card">
        <h3>Core Stats</h3>

        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(6,1fr)",
          gap:"10px"
        }}>

          {Object.entries(character.abilities || {}).map(([key,val]) => (
            <div key={key} className="rq-stat">
              <div className="rq-muted">{key.toUpperCase()}</div>
              <div style={{fontSize:"22px", fontWeight:"bold"}}>{val}</div>
            </div>
          ))}

        </div>
      </div>

      <div className="rq-card">
        <h3>Combat</h3>

        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(3,1fr)",
          gap:"16px"
        }}>

          <div>
            <div className="rq-muted">HP</div>
            <div style={{fontSize:"24px", fontWeight:"bold"}}>
              {character.hp}/{character.max_hp}
            </div>
          </div>

          <div>
            <div className="rq-muted">Armor Class</div>
            <div style={{fontSize:"24px", fontWeight:"bold"}}>
              {character.ac}
            </div>
          </div>

          <div>
            <div className="rq-muted">Speed</div>
            <div style={{fontSize:"24px", fontWeight:"bold"}}>
              {character.speed}
            </div>
          </div>

        </div>
      </div>

      <div className="rq-card">
        <h3>Death Saves</h3>

        <div style={{display:"flex", gap:"20px"}}>

          <div>
            <div className="rq-muted">Success</div>
            <button className="rq-button-secondary" onClick={toggleSuccess}>
              {deathSaves.success} / 3
            </button>
          </div>

          <div>
            <div className="rq-muted">Failure</div>
            <button className="rq-button-secondary" onClick={toggleFail}>
              {deathSaves.fail} / 3
            </button>
          </div>

        </div>
      </div>

      <div className="rq-card">
        <h3>Actions</h3>

        <div className="rq-muted">
          Unarmed Strike: +{character.str_mod || 0} to hit • 1 + STR damage
        </div>

      </div>

    </div>
  );
}
