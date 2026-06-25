import React from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, Home, ListChecks, Map, Shield, Smartphone, Users } from 'lucide-react';

import './PrototypeHub.css';

export default function PrototypeHub() {
  return (
    <main className="prototype-hub">
      <section className="prototype-hub-hero">
        <span><FlaskConical size={18} /> Frontend-only testing</span>
        <h1>Prototype Lab</h1>
        <p>
          Test Rookie Quest Keeper features without waiting for backend saves. This area uses local browser storage,
          so it will not affect real users, real characters, or live campaign data.
        </p>
      </section>

      <section className="prototype-hub-grid" aria-label="Prototype test areas">
        <Link to="/prototype-mobile" className="prototype-hub-card">
          <Smartphone size={28} />
          <span>Mobile Class Lab</span>
          <strong>Test all 12 classes</strong>
          <p>HP, temp HP, Hit Dice, rests, class resources, spell slots, conditions, inventory, and notes.</p>
        </Link>

        <Link to="/prototype-progressions" className="prototype-hub-card">
          <ListChecks size={28} />
          <span>Progression Lab</span>
          <strong>Check every level</strong>
          <p>Compare class features, proficiency, hit dice, ASI levels, resources, and spell slots from levels 1–20.</p>
        </Link>

        <Link to="/prototype-gm" className="prototype-hub-card">
          <Map size={28} />
          <span>Tia-Karta GM Lab</span>
          <strong>Test GM-side world data</strong>
          <p>Gods, locations, factions, hooks, rebuild options, cosmology, and local GM notes.</p>
        </Link>

        <Link to="/home" className="prototype-hub-card prototype-hub-card--live">
          <Home size={28} />
          <span>Live app</span>
          <strong>Return to normal site</strong>
          <p>Go back to the backend-connected dashboard used by real accounts and real campaign data.</p>
        </Link>
      </section>

      <section className="prototype-hub-note">
        <Shield size={20} />
        <div>
          <h2>Safe testing mode</h2>
          <p>
            Prototype pages are hidden testing routes. They do not disable the backend and they do not change the live site
            for people already using Rookie Quest Keeper.
          </p>
        </div>
      </section>

      <section className="prototype-hub-note">
        <Users size={20} />
        <div>
          <h2>Best testing flow</h2>
          <p>
            Use the Mobile Class Lab first to find class inconsistencies, then use the Progression Lab to compare level-by-level rules,
            then use the Tia-Karta GM Lab to test campaign and GM tools.
          </p>
        </div>
      </section>
    </main>
  );
}
