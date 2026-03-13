import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import "../App.css";
import "../styles/designSystem.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
        <span className="rq-muted">Party: {campaign.party?.length || campaign.partySize || 0}</span>
        <span className="rq-muted">Sessions: {campaign.session_count || campaign.sessions || 0}</span>
      </div>

      <div>
        <button className="rq-button-primary" onClick={() => onOpen?.(campaign)}>
          Open Campaign
        </button>
      </div>
    </div>
  );
}

function CreateCampaignModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await axios.post(`${API}/campaigns`, {
        name: name.trim(),
        description: description.trim()
      });
      toast.success("Campaign created successfully!");
      onCreated?.(response.data);
      setName("");
      setDescription("");
      onClose();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="rq-panel"
        style={{ width: "100%", maxWidth: "480px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="rq-title">Create Campaign</h2>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
          <input
            type="text"
            placeholder="Campaign Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "var(--rq-bg-panel-soft)",
              color: "var(--rq-text-main)",
            }}
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "var(--rq-bg-panel-soft)",
              color: "var(--rq-text-main)",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="rq-button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Campaign"}
            </button>
            <button className="rq-button-secondary" type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CampaignList({ username, onLogout }) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/campaigns`);
      setCampaigns(response.data || []);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCampaign = (campaign) => {
    navigate(`/campaign/${campaign.id}`);
  };

  const handleCampaignCreated = (newCampaign) => {
    setCampaigns((prev) => [...prev, newCampaign]);
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const name = campaign?.name?.toLowerCase?.() || "";
      const description = campaign?.description?.toLowerCase?.() || "";
      const term = search.toLowerCase();
      return name.includes(term) || description.includes(term);
    });
  }, [campaigns, search]);

  if (loading) {
    return (
      <div className="rq-panel" style={{ textAlign: "center", padding: "40px" }}>
        <div className="rq-muted">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: `linear-gradient(180deg, rgba(15, 10, 30, 0.9) 0%, rgba(15, 10, 30, 0.95) 100%), url('https://static.prod-images.emergentagent.com/jobs/b9fc55bd-0a80-4d15-9934-a7087e3445c8/images/9be68b2095230a13a9d52ed25ea5ba93da54c6f47b915d5cd89f4c7b8992a6d3.png')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      padding: "20px" 
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h1 className="rq-title">Campaigns</h1>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="rq-button-secondary" onClick={() => navigate("/home")}>
              Back to Home
            </button>
            {onLogout && (
              <button className="rq-button-secondary" onClick={onLogout}>
                Logout
              </button>
            )}
          </div>
        </div>

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
                My Campaigns
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

              <button className="rq-button-primary" onClick={() => setShowCreateModal(true)}>
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
              <button className="rq-button-secondary" onClick={() => setShowCreateModal(true)}>
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
                  onOpen={handleOpenCampaign}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateCampaignModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCampaignCreated}
      />
    </div>
  );
}
