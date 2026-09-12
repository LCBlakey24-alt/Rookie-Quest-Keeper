import React, { useMemo, useState } from "react";
import { Search, Swords, Shield, Sparkles, Package, Info } from "lucide-react";
import {
  SIMPLE_MELEE_WEAPONS, SIMPLE_RANGED_WEAPONS,
  MARTIAL_MELEE_WEAPONS, MARTIAL_RANGED_WEAPONS,
  ALL_WEAPONS, FINESSE_WEAPONS, THROWN_WEAPONS,
  TWO_HANDED_WEAPONS, LIGHT_WEAPONS,
  LIGHT_ARMOR, MEDIUM_ARMOR, HEAVY_ARMOR, SHIELDS,
  ADVENTURING_GEAR, WEAPON_PROPERTIES
} from "../../data/srdEquipment";

const theme = {
  gold: 'var(--rq-secondary)',
  bg: { surface: 'var(--rq-bg-panel)', elevated: 'var(--rq-bg-elevated)', primary: 'var(--rq-bg-main)' },
  text: { primary: 'var(--rq-text-primary)', secondary: 'var(--rq-text-primary)', muted: 'var(--rq-text-primary)' },
  border: 'var(--rq-border-default)'
};

const tabBtn = (active) => ({
  padding: "8px 14px",
  background: active ? "rgba(212,160,23,0.20)" : "transparent",
  border: active ? `2px solid ${theme.gold}` : `1px solid ${theme.border}`,
  borderRadius: 8, color: active ? theme.gold : theme.text.secondary,
  cursor: "pointer", fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
  display: "inline-flex", alignItems: "center", gap: 6
});

const filterChip = (active) => ({
  padding: "4px 10px",
  background: active ? "rgba(212,160,23,0.15)" : "transparent",
  border: `1px solid ${active ? theme.gold : theme.border}`,
  borderRadius: 12, color: active ? theme.gold : theme.text.muted,
  cursor: "pointer", fontSize: 11, fontWeight: 600
});

const thStyle = {
  textAlign: "left", padding: "8px 10px",
  borderBottom: `1px solid ${theme.border}`,
  fontSize: 10, letterSpacing: 1, color: theme.text.muted, fontWeight: 700
};
const tdStyle = {
  padding: "8px 10px",
  borderBottom: `1px solid rgba(212,160,23,0.08)`,
  fontSize: 12, color: theme.text.primary
};

function WeaponTable({ rows }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: 16 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>NAME</th>
            <th style={thStyle}>COST</th>
            <th style={thStyle}>DAMAGE</th>
            <th style={thStyle}>WEIGHT</th>
            <th style={thStyle}>PROPERTIES</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td style={{ ...tdStyle, textAlign: "center", color: theme.text.muted, fontStyle: "italic" }} colSpan={5}>No matches</td></tr>
          ) : rows.map((w, i) => (
            <tr key={`${w.name}-${i}`} data-testid={`weapon-row-${w.name}`}>
              <td style={{ ...tdStyle, fontWeight: 700 }}>{w.name}</td>
              <td style={tdStyle}>{w.cost} gp</td>
              <td style={tdStyle}>{w.damage}</td>
              <td style={tdStyle}>{w.weight} lb</td>
              <td style={{ ...tdStyle, color: theme.text.secondary }}>
                {w.properties.length === 0 ? "—" : w.properties.join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ArmorTable({ rows }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: 16 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>NAME</th>
            <th style={thStyle}>COST</th>
            <th style={thStyle}>AC</th>
            <th style={thStyle}>STR</th>
            <th style={thStyle}>STEALTH</th>
            <th style={thStyle}>WEIGHT</th>
            <th style={thStyle}>DON</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td style={{ ...tdStyle, textAlign: "center", color: theme.text.muted, fontStyle: "italic" }} colSpan={7}>No matches</td></tr>
          ) : rows.map((a, i) => (
            <tr key={`${a.name}-${i}`} data-testid={`armor-row-${a.name}`}>
              <td style={{ ...tdStyle, fontWeight: 700 }}>{a.name}</td>
              <td style={tdStyle}>{a.cost} gp</td>
              <td style={tdStyle}>{a.ac}</td>
              <td style={tdStyle}>{a.strReq || "—"}</td>
              <td style={{ ...tdStyle, color: a.stealth === "Disadvantage" ? "#EF4444" : theme.text.secondary }}>
                {a.stealth}
              </td>
              <td style={tdStyle}>{a.weight} lb</td>
              <td style={{ ...tdStyle, color: theme.text.secondary }}>{a.donTime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GearTable({ rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>ITEM</th>
            <th style={thStyle}>COST</th>
            <th style={thStyle}>WEIGHT</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td style={{ ...tdStyle, textAlign: "center", color: theme.text.muted, fontStyle: "italic" }} colSpan={3}>No matches</td></tr>
          ) : rows.map((g, i) => (
            <tr key={`${g.name}-${i}`} data-testid={`gear-row-${g.name}`}>
              <td style={{ ...tdStyle, fontWeight: 700 }}>{g.name}</td>
              <td style={tdStyle}>{g.cost} gp</td>
              <td style={tdStyle}>{g.weight} lb</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EquipmentReferenceTab() {
  const [section, setSection] = useState("weapons"); // weapons | armor | gear | properties
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | simple | martial | finesse | thrown | two-handed | light

  const filteredWeapons = useMemo(() => {
    let rows = ALL_WEAPONS;
    if (filter === "simple") rows = rows.filter(w => w.category.startsWith("Simple"));
    else if (filter === "martial") rows = rows.filter(w => w.category.startsWith("Martial"));
    else if (filter === "finesse") rows = FINESSE_WEAPONS;
    else if (filter === "thrown") rows = THROWN_WEAPONS;
    else if (filter === "two-handed") rows = TWO_HANDED_WEAPONS;
    else if (filter === "light") rows = LIGHT_WEAPONS;
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(w =>
        w.name.toLowerCase().includes(q) ||
        w.damage.toLowerCase().includes(q) ||
        w.properties.some(p => p.toLowerCase().includes(q))
      );
    }
    return rows;
  }, [filter, query]);

  const filteredGear = useMemo(() => {
    if (!query.trim()) return ADVENTURING_GEAR;
    const q = query.toLowerCase();
    return ADVENTURING_GEAR.filter(g => g.name.toLowerCase().includes(q));
  }, [query]);

  const filteredArmor = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pick = (rows) => q ? rows.filter(a => a.name.toLowerCase().includes(q)) : rows;
    return {
      light: pick(LIGHT_ARMOR),
      medium: pick(MEDIUM_ARMOR),
      heavy: pick(HEAVY_ARMOR),
      shields: pick(SHIELDS)
    };
  }, [query]);

  return (
    <div data-testid="equipment-reference-tab" style={{ padding: "20px 24px", color: theme.text.primary }}>
      {/* Section tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setSection("weapons")} style={tabBtn(section === "weapons")} data-testid="eq-section-weapons">
          <Swords size={13} /> WEAPONS
        </button>
        <button type="button" onClick={() => setSection("armor")} style={tabBtn(section === "armor")} data-testid="eq-section-armor">
          <Shield size={13} /> ARMOR & SHIELDS
        </button>
        <button type="button" onClick={() => setSection("gear")} style={tabBtn(section === "gear")} data-testid="eq-section-gear">
          <Package size={13} /> ADVENTURING GEAR
        </button>
        <button type="button" onClick={() => setSection("properties")} style={tabBtn(section === "properties")} data-testid="eq-section-properties">
          <Info size={13} /> PROPERTIES
        </button>
      </div>

      {/* Search */}
      {section !== "properties" && (
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search size={14} color={theme.text.muted} style={{ position: "absolute", top: 12, left: 12 }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search ${section}…`}
            data-testid="eq-search-input"
            style={{
              width: "100%", padding: "10px 14px 10px 34px",
              background: theme.bg.primary, color: theme.text.primary,
              border: `1px solid ${theme.border}`, borderRadius: 8,
              fontSize: 13, outline: "none"
            }}
          />
        </div>
      )}

      {/* Weapon filter chips */}
      {section === "weapons" && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {[
            { k: "all", label: "All" },
            { k: "simple", label: "Simple" },
            { k: "martial", label: "Martial" },
            { k: "finesse", label: "Finesse" },
            { k: "thrown", label: "Thrown" },
            { k: "two-handed", label: "Two-Handed" },
            { k: "light", label: "Light" },
          ].map(f => (
            <button
              key={f.k}
              type="button"
              onClick={() => setFilter(f.k)}
              data-testid={`eq-filter-${f.k}`}
              style={filterChip(filter === f.k)}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {section === "weapons" && (
        <div>
          {filter === "all" ? (
            <>
              <h3 style={{ color: theme.gold, fontSize: 13, letterSpacing: 1, margin: "12px 0 8px" }}>SIMPLE MELEE</h3>
              <WeaponTable rows={query ? filteredWeapons.filter(w => w.category === "Simple Melee") : SIMPLE_MELEE_WEAPONS.map(w => ({ ...w, category: "Simple Melee" }))} />
              <h3 style={{ color: theme.gold, fontSize: 13, letterSpacing: 1, margin: "12px 0 8px" }}>SIMPLE RANGED</h3>
              <WeaponTable rows={query ? filteredWeapons.filter(w => w.category === "Simple Ranged") : SIMPLE_RANGED_WEAPONS.map(w => ({ ...w, category: "Simple Ranged" }))} />
              <h3 style={{ color: theme.gold, fontSize: 13, letterSpacing: 1, margin: "12px 0 8px" }}>MARTIAL MELEE</h3>
              <WeaponTable rows={query ? filteredWeapons.filter(w => w.category === "Martial Melee") : MARTIAL_MELEE_WEAPONS.map(w => ({ ...w, category: "Martial Melee" }))} />
              <h3 style={{ color: theme.gold, fontSize: 13, letterSpacing: 1, margin: "12px 0 8px" }}>MARTIAL RANGED</h3>
              <WeaponTable rows={query ? filteredWeapons.filter(w => w.category === "Martial Ranged") : MARTIAL_RANGED_WEAPONS.map(w => ({ ...w, category: "Martial Ranged" }))} />
            </>
          ) : (
            <WeaponTable rows={filteredWeapons} />
          )}
        </div>
      )}

      {section === "armor" && (
        <div>
          <h3 style={{ color: theme.gold, fontSize: 13, letterSpacing: 1, margin: "12px 0 8px" }}>LIGHT ARMOR</h3>
          <ArmorTable rows={filteredArmor.light} />
          <h3 style={{ color: theme.gold, fontSize: 13, letterSpacing: 1, margin: "12px 0 8px" }}>MEDIUM ARMOR</h3>
          <ArmorTable rows={filteredArmor.medium} />
          <h3 style={{ color: theme.gold, fontSize: 13, letterSpacing: 1, margin: "12px 0 8px" }}>HEAVY ARMOR</h3>
          <ArmorTable rows={filteredArmor.heavy} />
          <h3 style={{ color: theme.gold, fontSize: 13, letterSpacing: 1, margin: "12px 0 8px" }}>SHIELDS</h3>
          <ArmorTable rows={filteredArmor.shields} />
        </div>
      )}

      {section === "gear" && <GearTable rows={filteredGear} />}

      {section === "properties" && (
        <div style={{ display: "grid", gap: 10 }}>
          {WEAPON_PROPERTIES.map(p => (
            <div key={p.name} data-testid={`property-${p.name}`} style={{
              padding: 12, borderRadius: 8,
              background: theme.bg.elevated,
              border: `1px solid ${theme.border}`
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: theme.gold, marginBottom: 4, letterSpacing: 0.5 }}>
                {p.name.toUpperCase()}
              </div>
              <div style={{ fontSize: 12, color: theme.text.secondary, lineHeight: 1.5 }}>
                {p.description}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 10, color: theme.text.muted, fontStyle: "italic", textAlign: "center" }}>
        <Sparkles size={10} style={{ display: "inline", marginRight: 4 }} />
        SRD 5.1 content · Open Game License / Creative Commons
      </div>
    </div>
  );
}
