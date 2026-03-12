import React, { useMemo, useState } from "react";
import "../App.css";
import "../styles/designSystem.css";

function CampaignCard({ campaign, onOpen }) {
  return (
    <div
      className="rq-card"
      style={{
        display: "grid",
        gap: "12px",
        minHeight: "200px",
      }}
    >
      <div>
        <h3 style={{ margin: 0 }}>{campaign.name}</h3>
        <p className="rq-muted" style={{ marginTop: "8px", lineHeight: 1.6 }}>
          {campaign.description || "No campaign description yet."}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span className="rq-muted">Party: {campaign.partySize || 0}</span>
        <span className="rq-muted">Sessions: {campaign.sessions || 0}</span>
      </div>

      <div>
        <button className="rq-button-primary" onClick={() => onOpen?.(campaign)}>
          Open Campaign
        </button>
      </div>
    </div>
  );
}

export default function CampaignList({
  campaigns = [],
  onOpenCampaign,
  onCreateCampaign,
}) {
  const [search, setSearch] = useState("");

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const name = campaign?.name?.toLowerCase?.() || "";
      const description = campaign?.description?.toLowerCase?.() || "";
      const term = search.toLowerCase();
      return name.includes(term) || description.includes(term);
    });
  }, [campaigns, search]);

  return (
    <div className="rq-panel" style={{ display: "grid", gap: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 className="rq-title" style={{ margin: 0 }}>
            Campaigns
          </h2>
          <p className="rq-muted" style={{ marginTop: "8px", marginBottom: 0 }}>
            Browse and manage your active adventures.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            style={{
              minWidth: "220px",
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "var(--rq-bg-panel-soft)",
              color: "var(--rq-text-main)",
            }}
          />

          <button className="rq-button-primary" onClick={() => onCreateCampaign?.()}>
            Create Campaign
          </button>
        </div>
      </div>

      {filteredCampaigns.length === 0 ? (
        <div
          className="rq-card"
          style={{
            textAlign: "center",
            padding: "30px",
          }}
        >
          <h3 style={{ marginTop: 0 }}>No campaigns found</h3>
          <p className="rq-muted" style={{ marginBottom: "18px" }}>
            Create a new campaign or adjust your search.
          </p>
          <button className="rq-button-secondary" onClick={() => onCreateCampaign?.()}>
            New Campaign
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
          }}
        >
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id || campaign.name}
              campaign={campaign}
              onOpen={onOpenCampaign}
            />
          ))}
        </div>
      )}
    </div>
  );
}
