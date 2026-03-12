import React from "react";
import { Link } from "react-router-dom";
import "../App.css";
import "../styles/designSystem.css";

function FeatureCard({ title, description }) {
  return (
    <div
      className="rq-card"
      style={{
        minHeight: "170px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <h3 style={{ marginTop: 0, marginBottom: "10px" }}>{title}</h3>
        <p className="rq-muted" style={{ margin: 0, lineHeight: 1.6 }}>
          {description}
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--rq-bg-main)" }}>
      <section
        className="rq-hero"
        style={{
          padding: "90px 24px 70px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "8px 14px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              marginBottom: "24px",
              color: "#fff",
              fontSize: "13px",
              letterSpacing: "0.04em",
            }}
          >
            Rookie Quest Keeper
          </div>

          <h1
            style={{
              fontSize: "clamp(38px, 6vw, 68px)",
              margin: "0 0 20px",
              color: "#fff",
              fontFamily: "'Cinzel', serif",
              lineHeight: 1.05,
            }}
          >
            Build better adventures.
            <br />
            Run smoother sessions.
          </h1>

          <p
            style={{
              maxWidth: "820px",
              margin: "0 auto 34px",
              color: "rgba(255,255,255,0.9)",
              fontSize: "18px",
              lineHeight: 1.7,
            }}
          >
            Rookie Quest Keeper is your tabletop RPG companion for character creation,
            campaign tracking, combat flow, notes, loot, and AI-assisted worldbuilding —
            all inside one clean fantasy control panel.
          </p>

          <div
            style={{
              display: "flex",
              gap: "14px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link to="/dashboard" style={{ textDecoration: "none" }}>
              <button className="rq-button-primary" style={{ minWidth: "180px" }}>
                Enter App
              </button>
            </Link>

            <Link to="/login" style={{ textDecoration: "none" }}>
              <button className="rq-button-secondary" style={{ minWidth: "180px" }}>
                Log In
              </button>
            </Link>
          </div>
        </div>
      </section>

      <section style={{ padding: "56px 24px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "34px" }}>
            <h2 className="rq-title" style={{ marginBottom: "10px" }}>
              One hub for players and game masters
            </h2>
            <p className="rq-muted" style={{ maxWidth: "760px", margin: "0 auto", lineHeight: 1.7 }}>
              Keep your sessions organized without losing the fantasy feel. The layout stays practical,
              the information stays readable, and the tools stay close at hand during live play.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "18px",
            }}
          >
            <FeatureCard
              title="Character Management"
              description="Create characters, review stats, track features, manage portraits, and keep sheets ready during play."
            />
            <FeatureCard
              title="Combat Tools"
              description="Track initiative, hit points, conditions, rounds, and key combat resources with faster live-session handling."
            />
            <FeatureCard
              title="Campaign Control"
              description="Manage notes, story hooks, party activity, encounters, loot, and world details from a single dashboard."
            />
            <FeatureCard
              title="AI Assistance"
              description="Generate NPCs, prompts, inspiration, and session support when you need a quick creative push."
            />
          </div>
        </div>
      </section>

      <section style={{ padding: "10px 24px 56px" }}>
        <div
          className="rq-panel"
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: "22px",
          }}
        >
          <div>
            <h2 className="rq-title" style={{ marginTop: 0 }}>
              Meet ROOK
            </h2>
            <p className="rq-muted" style={{ lineHeight: 1.7 }}>
              ROOK helps with the heavy lifting behind the screen — generating ideas,
              helping organize information, and giving you quick support when you need to
              keep the session moving.
            </p>
            <p className="rq-muted" style={{ lineHeight: 1.7 }}>
              Use it to build encounters, flesh out NPCs, summarize sessions, and speed up
              worldbuilding without losing control of your campaign.
            </p>
          </div>

          <div
            className="rq-card"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3 style={{ marginTop: 0 }}>Start your next session prepared</h3>
              <p className="rq-muted" style={{ lineHeight: 1.7 }}>
                Keep your tools, party info, and campaign data in one place so the table
                spends less time waiting and more time playing.
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "18px" }}>
              <Link to="/signup" style={{ textDecoration: "none" }}>
                <button className="rq-button-primary">Create Account</button>
              </Link>
              <Link to="/pricing" style={{ textDecoration: "none" }}>
                <button className="rq-button-secondary">View Pricing</button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
