import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import "../App.css";
import "../styles/designSystem.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PlayerDashboard({ username, onLogout }) {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/characters`);
      setCharacters(response.data || []);
    } catch (error) {
      console.error("Failed to fetch characters:", error);
      toast.error("Failed to load characters");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCharacter = (character) => {
    navigate(`/characters/${character.id}`);
  };

  const handleCreateCharacter = () => {
    navigate("/characters/new");
  };

  if (loading) {
    return (
      <div className="rq-panel" style={{ textAlign: "center", padding: "40px" }}>
        <div className="rq-muted">Loading characters...</div>
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
          <h1 className="rq-title">Player Dashboard</h1>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 className="rq-title" style={{ margin: 0 }}>My Characters</h2>
              <p className="rq-muted" style={{ marginTop: "6px" }}>
                Manage your characters and jump back into your campaigns.
              </p>
            </div>

            <button className="rq-button-primary" onClick={handleCreateCharacter}>
              Create Character
            </button>
          </div>

          {characters.length === 0 ? (
            <div className="rq-card" style={{ textAlign: "center", padding: "30px" }}>
              <h3>No Characters Yet</h3>
              <p className="rq-muted">
                Create your first character to begin your Rookie Quest adventure.
              </p>
              <button className="rq-button-secondary" onClick={handleCreateCharacter}>
                New Character
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))",
                gap: "16px"
              }}
            >
              {characters.map((character) => (
                <div
                  key={character.id || character.name}
                  className="rq-card"
                  style={{ display: "grid", gap: "12px" }}
                >
                  {character.portrait_url && (
                    <img
                      src={character.portrait_url}
                      alt="portrait"
                      style={{
                        width: "100%",
                        height: "140px",
                        objectFit: "cover",
                        borderRadius: "10px"
                      }}
                    />
                  )}

                  <div>
                    <h3 style={{ margin: 0 }}>{character.name}</h3>
                    <div className="rq-muted" style={{ marginTop: "4px" }}>
                      {character.race} {character.character_class} • Level {character.level || 1}
                    </div>
                  </div>

                  <button
                    className="rq-button-secondary"
                    onClick={() => handleOpenCharacter(character)}
                  >
                    Open Character
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
