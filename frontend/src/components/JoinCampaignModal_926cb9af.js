import React, { useState } from "react";
import "../App.css";
import "../styles/designSystem.css";

export default function JoinCampaignModal({
  isOpen,
  onClose,
  onJoinCampaign,
}) {
  const [inviteCode, setInviteCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!inviteCode.trim()) {
      setError("Enter an invite code.");
      return;
    }

    if (!playerName.trim()) {
      setError("Enter your player name.");
      return;
    }

    setError("");
    if (onJoinCampaign) {
      onJoinCampaign({
        inviteCode: inviteCode.trim(),
        playerName: playerName.trim(),
      });
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4, 8, 18, 0.72)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
    >
      <div
        className="rq-panel"
        style={{
          width: "100%",
          maxWidth: "520px",
          border: "1px solid rgba(231,185,76,0.22)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div>
            <h2 className="rq-title" style={{ margin: 0 }}>
              Join Campaign
            </h2>
            <p className="rq-muted" style={{ marginTop: "8px", marginBottom: 0 }}>
              Enter your invite code to join an existing Rookie Quest campaign.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rq-button-secondary"
            style={{ minWidth: "unset", padding: "8px 12px" }}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
          <div>
            <label
              className="rq-muted"
              style={{ display: "block", marginBottom: "8px" }}
            >
              Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter campaign invite code"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "var(--rq-bg-panel-soft)",
                color: "var(--rq-text-main)",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              className="rq-muted"
              style={{ display: "block", marginBottom: "8px" }}
            >
              Player Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your player name"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "var(--rq-bg-panel-soft)",
                color: "var(--rq-text-main)",
                outline: "none",
              }}
            />
          </div>

          {error ? (
            <div
              style={{
                color: "#ff8e8e",
                background: "rgba(231,76,60,0.12)",
                border: "1px solid rgba(231,76,60,0.22)",
                borderRadius: "10px",
                padding: "10px 12px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "8px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="rq-button-secondary"
            >
              Cancel
            </button>

            <button type="submit" className="rq-button-primary">
              Join Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
