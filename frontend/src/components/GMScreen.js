import React, { useEffect, useMemo, useState } from "react";
import "../App.css";
import "../styles/designSystem.css";

function GMScreen() {
  const [activeTab, setActiveTab] = useState("overview");
  const [sessionNotes, setSessionNotes] = useState("");
  const [partyStatus, setPartyStatus] = useState([
    { name: "Javen Krow", hp: "12/12", ac: 12, status: "Ready" },
    { name: "Thalia Emberheart", hp: "40/40", ac: 16, status: "Ready" },
    { name: "Kael Ironfist", hp: "27/27", ac: 18, status: "Ready" }
  ]);

  useEffect(() => {
    document.title = "GM Screen | Rookie Quest";
  }, []);

  const tabs = useMemo(
    () => [
      { id: "overview", label: "Overview" },
      { id: "party", label: "Party" },
      { id: "encounters", label: "Encounters" },
      { id: "notes", label: "Session Notes" },
      { id: "tools", label: "Quick Tools" }
    ],
    []
  );

  const tabButtonStyle = (isActive) => ({
    padding: "12px 18px",
    borderRadius: "10px",
    border: isActive
      ? "1px solid rgba(231,185,76,0.45)"
      : "1px solid rgba(255,255,255,0.08)",
    background: isActive
      ? "linear-gradient(135deg, rgba(123,47,247,0.18), rgba(249,115,22,0.12))"
      : "var(--rq-bg-panel-soft)",
    color: isActive ? "var(--rq-gold-soft)" : "var(--rq-text-main)",
    cursor: "pointer",
    fontWeight: 600,
    transition: "all 0.2s ease"
  });

  return (
    <div style={{ padding: "32px" }}>
      <div
        className="rq-panel"
        style={{
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap"
        }}
      >
        <div>
          <h1 className="rq-title" style={{ margin: 0, fontSize: "40px" }}>
            GM Screen
          </h1>
          <p className="rq-muted" style={{ marginTop: "8px", marginBottom: 0 }}>
            Your live session command center for tracking the party, encounters,
            notes, and quick-reference tools.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button className="rq-button-primary">Start Session</button>
          <button className="rq-button-secondary">Add Encounter</button>
          <button className="rq-button-secondary">Open Notes</button>
        </div>
      </div>

      <div
        className="rq-panel"
        style={{
          marginBottom: "24px",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap"
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={tabButtonStyle(activeTab === tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "24px"
          }}
        >
          <div className="rq-panel">
            <h2 className="rq-title" style={{ fontSize: "24px", marginTop: 0 }}>
              Session Overview
            </h2>
            <p className="rq-muted">
              Keep your campaign moving with a clear summary of the current
              session, active plot threads, and what the party is doing now.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "16px",
                marginTop: "24px"
              }}
            >
              <div className="rq-card">
                <h3 style={{ marginTop: 0 }}>Current Scene</h3>
                <p className="rq-muted">The party explores the Cursed Heights.</p>
              </div>

              <div className="rq-card">
                <h3 style={{ marginTop: 0 }}>Active Threat</h3>
                <p className="rq-muted">Unknown enemy movement in the ruins.</p>
              </div>

              <div className="rq-card">
                <h3 style={{ marginTop: 0 }}>Quest Focus</h3>
                <p className="rq-muted">Recover the lost heirloom before dawn.</p>
              </div>
            </div>
          </div>

          <div className="rq-panel">
            <h2 className="rq-title" style={{ fontSize: "24px", marginTop: 0 }}>
              Quick Reference
            </h2>

            <div style={{ display: "grid", gap: "12px", marginTop: "20px" }}>
              <div className="rq-card">
                <strong>Party Level</strong>
                <div className="rq-muted" style={{ marginTop: "6px" }}>
                  Average level 2–3
                </div>
              </div>

              <div className="rq-card">
                <strong>Session Mood</strong>
                <div className="rq-muted" style={{ marginTop: "6px" }}>
                  Exploration / mystery / rising danger
                </div>
              </div>

              <div className="rq-card">
                <strong>Recommended Focus</strong>
                <div className="rq-muted" style={{ marginTop: "6px" }}>
                  Investigation, NPC clues, and pacing.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "party" && (
        <div className="rq-panel">
          <h2 className="rq-title" style={{ fontSize: "24px", marginTop: 0 }}>
            Party Status
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "18px",
              marginTop: "20px"
            }}
          >
            {partyStatus.map((member) => (
              <div key={member.name} className="rq-card">
                <h3 style={{ marginTop: 0 }}>{member.name}</h3>
                <div className="rq-muted" style={{ marginBottom: "8px" }}>
                  HP: {member.hp}
                </div>
                <div className="rq-muted" style={{ marginBottom: "8px" }}>
                  AC: {member.ac}
                </div>
                <div className="rq-muted">Status: {member.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "encounters" && (
        <div className="rq-panel">
          <h2 className="rq-title" style={{ fontSize: "24px", marginTop: 0 }}>
            Encounter Control
          </h2>
          <p className="rq-muted">
            Prepare active threats, track encounter flow, and launch combat
            quickly when the session escalates.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "18px",
              marginTop: "20px"
            }}
          >
            <div className="rq-card">
              <h3 style={{ marginTop: 0 }}>Goblin Ambush</h3>
              <p className="rq-muted">
                Light skirmish encounter for forest roads and ambush scenes.
              </p>
              <button className="rq-button-secondary">Open Encounter</button>
            </div>

            <div className="rq-card">
              <h3 style={{ marginTop: 0 }}>Ruined Shrine Guardian</h3>
              <p className="rq-muted">
                Medium encounter with environmental storytelling potential.
              </p>
              <button className="rq-button-secondary">Open Encounter</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "notes" && (
        <div className="rq-panel">
          <h2 className="rq-title" style={{ fontSize: "24px", marginTop: 0 }}>
            Session Notes
          </h2>
          <textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="Write live notes, NPC discoveries, combat reminders, or future hooks..."
            style={{
              width: "100%",
              minHeight: "260px",
              marginTop: "16px",
              background: "var(--rq-bg-panel-soft)",
              color: "var(--rq-text-main)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              padding: "16px",
              fontFamily: "Inter, sans-serif",
              fontSize: "15px",
              resize: "vertical"
            }}
          />
        </div>
      )}

      {activeTab === "tools" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "18px"
          }}
        >
          <div className="rq-card">
            <h3 style={{ marginTop: 0 }}>Dice Roller</h3>
            <p className="rq-muted">
              Quick access rolling tools for checks, damage, and random events.
            </p>
          </div>

          <div className="rq-card">
            <h3 style={{ marginTop: 0 }}>NPC Prompt</h3>
            <p className="rq-muted">
              Generate a tavern keeper, guard captain, merchant, or suspicious stranger.
            </p>
          </div>

          <div className="rq-card">
            <h3 style={{ marginTop: 0 }}>Travel Notes</h3>
            <p className="rq-muted">
              Track weather, travel pace, supplies, and changing world events.
            </p>
          </div>

          <div className="rq-card">
            <h3 style={{ marginTop: 0 }}>Rules Snapshot</h3>
            <p className="rq-muted">
              Keep essential references close without leaving the session flow.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default GMScreen;
