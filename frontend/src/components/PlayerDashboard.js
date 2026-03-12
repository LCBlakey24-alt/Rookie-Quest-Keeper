import React, { useEffect, useState } from "react";
import "../App.css";
import "../styles/designSystem.css";

function PlayerDashboard() {

  const [characters, setCharacters] = useState([]);

  useEffect(() => {
    // placeholder until backend loads characters
    setCharacters([]);
  }, []);

  return (

    <div style={{ padding: "40px" }}>

      {/* PAGE TITLE */}

      <h1 className="rq-title" style={{ marginBottom: "30px" }}>
        Player Dashboard
      </h1>

      {/* ACTION BUTTONS */}

      <div style={{ display: "flex", gap: "12px", marginBottom: "30px" }}>

        <button className="rq-button-primary">
          Create Character
        </button>

        <button className="rq-button-secondary">
          Join Campaign
        </button>

        <button className="rq-button-secondary">
          Add Note
        </button>

      </div>

      {/* CHARACTER SECTION */}

      <h2 style={{ marginBottom: "20px" }}>My Characters</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "20px"
        }}
      >

        {characters.length === 0 && (

          <div className="rq-card">

            <h3>No characters yet</h3>

            <p className="rq-muted">
              Create your first adventurer to begin your journey.
            </p>

            <button
              className="rq-button-primary"
              style={{ marginTop: "12px" }}
            >
              Create Character
            </button>

          </div>

        )}

      </div>

    </div>

  );

}

export default PlayerDashboard;
