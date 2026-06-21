import React, { useState, useEffect, useRef } from "react";
import apiClient from '@/lib/apiClient';
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Upload, Sparkles, FileText, Save, Trash2,
  Loader2, BookOpen, Sword, Shield, Wand2, Gem, AlertTriangle, RefreshCw
} from "lucide-react";


const theme = {
  gold: "var(--rq-accent-primary, #C08A3D)",
  goldSoft: "var(--rq-accent-soft, rgba(192, 138, 61, 0.14))",
  bg: {
    primary: "var(--rq-bg-main, #120C08)",
    surface: "var(--rq-bg-panel, #21150E)",
    elevated: "var(--rq-bg-panel-alt, #2E1D13)"
  },
  text: {
    primary: "var(--rq-text-primary, #F5E6C8)",
    secondary: "var(--rq-text-secondary, #E6D2AA)",
    muted: "var(--rq-text-muted, #CDBA98)",
    inverse: "var(--rq-text-inverse, #120C08)",
    warn: "var(--rq-warning, #D99A3D)"
  },
  border: "var(--rq-border-default, rgba(192, 138, 61, 0.22))"
};

const TYPES = [
  { key: "race", label: "RACE / SPECIES", icon: Shield },
  { key: "class", label: "CLASS", icon: Sword },
  { key: "subclass", label: "SUBCLASS", icon: BookOpen },
  { key: "background", label: "BACKGROUND", icon: FileText },
  { key: "magic_item", label: "MAGIC ITEM", icon: Gem },
];

const inputStyle = {
  width: "100%", padding: "10px 12px",
  background: theme.bg.primary, color: theme.text.primary,
  border: `1px solid ${theme.border}`, borderRadius: 8,
  fontSize: 13, outline: "none"
};
const labelStyle = {
  display: "block", fontSize: 11, color: theme.text.muted,
  letterSpacing: 0.5, fontWeight: 700, marginBottom: 4, textTransform: "uppercase"
};

function FieldRow({ label, value, onChange, missing, multiline }) {
  const Tag = multiline ? "textarea" : "input";
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ ...labelStyle, color: missing ? theme.text.warn : theme.text.muted }}>
        {label}{missing && " · MISSING — please fill"}
      </label>
      <Tag
        type="text"
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        style={{
          ...inputStyle,
          minHeight: multiline ? 80 : undefined,
          resize: multiline ? "vertical" : undefined,
          border: missing
            ? `2px solid ${theme.text.warn}`
            : `1px solid ${theme.border}`
        }}
      />
    </div>
  );
}

function FeatureList({ features = [], onChange }) {
  const update = (i, patch) => {
    const next = [...features];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () => onChange([...features, { level: 1, name: "", description: "" }]);
  const remove = (i) => onChange(features.filter((_, idx) => idx !== i));

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>Features (level → name → description)</label>
      {features.length === 0 && (
        <div style={{ fontSize: 12, color: theme.text.muted, fontStyle: "italic", marginBottom: 8 }}>
          No features yet — add one or let the AI fill them in from a .docx upload.
        </div>
      )}
      {features.map((f, i) => (
        <div key={i} style={{
          display: "grid", gridTemplateColumns: "60px 1fr 30px", gap: 8, marginBottom: 8,
          padding: 8, borderRadius: 8, background: "rgba(255,255,255,0.04)",
          border: `1px solid ${theme.border}`
        }}>
          <input
            type="number" min={1} max={20}
            value={f.level || 1}
            onChange={e => update(i, { level: parseInt(e.target.value, 10) || 1 })}
            style={{ ...inputStyle, padding: "6px", fontSize: 13, textAlign: "center" }}
          />
          <div>
            <input
              type="text" placeholder="Feature name"
              value={f.name || ""}
              onChange={e => update(i, { name: e.target.value })}
              style={{ ...inputStyle, padding: "6px 8px", marginBottom: 4 }}
            />
            <textarea
              placeholder="Description"
              value={f.description || ""}
              onChange={e => update(i, { description: e.target.value })}
              style={{ ...inputStyle, padding: "6px 8px", minHeight: 50, resize: "vertical", fontSize: 12 }}
            />
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            style={{
              background: "transparent", border: `1px solid ${theme.border}`,
              color: theme.text.muted, borderRadius: 6, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        style={{
          padding: "6px 12px", background: theme.goldSoft,
          border: `1px solid ${theme.border}`, borderRadius: 6,
          color: theme.gold, cursor: "pointer", fontSize: 12, fontWeight: 700
        }}>
        + Add feature row
      </button>
    </div>
  );
}

/** Build the right form for the active type. */
function DraftEditor({ contentType, draft, missing, onChange }) {
  const upd = (key, value) => onChange({ ...draft, [key]: value });
  const isMissing = (key) => missing.includes(key);

  if (contentType === "race") {
    return (
      <div>
        <FieldRow label="Name" value={draft.name} onChange={v => upd("name", v)} missing={isMissing("name")} />
        <FieldRow label="Description" value={draft.description} onChange={v => upd("description", v)} multiline />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FieldRow label="Size" value={draft.size} onChange={v => upd("size", v)} missing={isMissing("size")} />
          <FieldRow label="Speed (ft)" value={draft.speed} onChange={v => upd("speed", parseInt(v, 10) || 30)} missing={isMissing("speed")} />
        </div>
        <FieldRow label="Ability bonuses (JSON, e.g. {strength:1, dexterity:2})" value={JSON.stringify(draft.ability_bonuses || {})} onChange={v => { try { upd("ability_bonuses", JSON.parse(v)); } catch { /* keep as is */ } }} />
        <FeatureList features={draft.traits || []} onChange={v => upd("traits", v)} />
      </div>
    );
  }

  if (contentType === "class") {
    return (
      <div>
        <FieldRow label="Name" value={draft.name} onChange={v => upd("name", v)} missing={isMissing("name")} />
        <FieldRow label="Description" value={draft.description} onChange={v => upd("description", v)} multiline />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FieldRow label="Hit die" value={draft.hit_die} onChange={v => upd("hit_die", v)} missing={isMissing("hit_die")} />
          <FieldRow label="Primary ability" value={draft.primary_ability} onChange={v => upd("primary_ability", v)} />
        </div>
        <FieldRow label="Saving throws (comma-separated)" value={(draft.saving_throw_proficiencies || []).join(", ")} onChange={v => upd("saving_throw_proficiencies", v.split(",").map(s => s.trim()).filter(Boolean))} />
        <FieldRow label="Armor proficiencies (comma-separated)" value={(draft.armor_proficiencies || []).join(", ")} onChange={v => upd("armor_proficiencies", v.split(",").map(s => s.trim()).filter(Boolean))} />
        <FieldRow label="Weapon proficiencies (comma-separated)" value={(draft.weapon_proficiencies || []).join(", ")} onChange={v => upd("weapon_proficiencies", v.split(",").map(s => s.trim()).filter(Boolean))} />
        <FeatureList features={draft.features || []} onChange={v => upd("features", v)} />
      </div>
    );
  }

  if (contentType === "subclass") {
    return (
      <div>
        <FieldRow label="Name" value={draft.name} onChange={v => upd("name", v)} missing={isMissing("name")} />
        <FieldRow label="Parent class" value={draft.parent_class} onChange={v => upd("parent_class", v)} missing={isMissing("parent_class")} />
        <FieldRow label="Description" value={draft.description} onChange={v => upd("description", v)} multiline />
        <FieldRow label="Subclass unlocks at level" value={draft.subclass_level || 3} onChange={v => upd("subclass_level", parseInt(v, 10) || 3)} />
        <FeatureList features={draft.features || []} onChange={v => upd("features", v)} />
      </div>
    );
  }

  if (contentType === "background") {
    return (
      <div>
        <FieldRow label="Name" value={draft.name} onChange={v => upd("name", v)} missing={isMissing("name")} />
        <FieldRow label="Description" value={draft.description} onChange={v => upd("description", v)} multiline />
        <FieldRow label="Skill proficiencies (comma-separated)" value={(draft.skill_proficiencies || []).join(", ")} onChange={v => upd("skill_proficiencies", v.split(",").map(s => s.trim()).filter(Boolean))} missing={isMissing("skill_proficiencies")} />
        <FieldRow label="Tool proficiencies (comma-separated)" value={(draft.tool_proficiencies || []).join(", ")} onChange={v => upd("tool_proficiencies", v.split(",").map(s => s.trim()).filter(Boolean))} />
        <FieldRow label="Bonus languages (number)" value={draft.languages || 0} onChange={v => upd("languages", parseInt(v, 10) || 0)} />
        <FieldRow label="Equipment (comma-separated)" value={(draft.equipment || []).join(", ")} onChange={v => upd("equipment", v.split(",").map(s => s.trim()).filter(Boolean))} />
        <FieldRow label="Feature name" value={draft.feature_name} onChange={v => upd("feature_name", v)} />
        <FieldRow label="Feature description" value={draft.feature_description} onChange={v => upd("feature_description", v)} multiline />
      </div>
    );
  }

  if (contentType === "magic_item") {
    return (
      <div>
        <FieldRow label="Name" value={draft.name} onChange={v => upd("name", v)} missing={isMissing("name")} />
        <FieldRow label="Type (Wondrous / Weapon / etc)" value={draft.type} onChange={v => upd("type", v)} />
        <FieldRow label="Rarity" value={draft.rarity} onChange={v => upd("rarity", v)} missing={isMissing("rarity")} />
        <div>
          <label style={labelStyle}>Requires attunement</label>
          <input
            type="checkbox"
            checked={!!draft.requires_attunement}
            onChange={e => upd("requires_attunement", e.target.checked)}
            data-testid="hb-attunement-toggle"
          />
        </div>
        <FieldRow label="Description" value={draft.description} onChange={v => upd("description", v)} multiline />
        <FieldRow label="Effects (one per line)" value={(draft.effects || []).join("\n")} onChange={v => upd("effects", v.split("\n").map(s => s.trim()).filter(Boolean))} multiline />
      </div>
    );
  }

  return null;
}

export default function HomebrewWorkshop() {
  const navigate = useNavigate();
  const [type, setType] = useState("race");
  const [edition, setEdition] = useState("2014");
  const [pasteText, setPasteText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({});
  const [missing, setMissing] = useState([]);
  const [library, setLibrary] = useState({});
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  const fetchLibrary = async () => {
    try {
      const { data } = await apiClient.get(`/homebrew`);
      setLibrary(data?.homebrew || {});
    } catch (err) {

    }
  };

  useEffect(() => { fetchLibrary(); }, []);

  const reset = () => {
    setDraft({});
    setMissing([]);
    setEditingId(null);
    setPasteText("");
  };

  const onTypeChange = (k) => {
    setType(k);
    reset();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(docx|txt|md)$/i.test(file.name)) {
      toast.error("Please upload a .docx, .txt, or .md file");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      e.target.value = "";
      return;
    }
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("content_type", type);
      fd.append("file", file);
      fd.append("edition", edition);
      const { data } = await apiClient.post(`/homebrew/parse-docx`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setDraft(data.draft || {});
      setMissing(data.missing_fields || []);
      setEditingId(null);
      const missCount = (data.missing_fields || []).length;
      if (missCount > 0) {
        toast.warning(`AI parsed your file — ${missCount} required field${missCount === 1 ? "" : "s"} need your attention.`);
      } else {
        toast.success("AI parsed your file — review and save.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not parse file");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  };

  const handleParseText = async () => {
    if (!pasteText.trim()) {
      toast.error("Paste some text first");
      return;
    }
    setParsing(true);
    try {
      const { data } = await apiClient.post(`/homebrew/parse-text`, {
        content_type: type,
        edition,
        text: pasteText
      });
      setDraft(data.draft || {});
      setMissing(data.missing_fields || []);
      setEditingId(null);
      const missCount = (data.missing_fields || []).length;
      if (missCount > 0) {
        toast.warning(`AI parsed your text — ${missCount} required field${missCount === 1 ? "" : "s"} need attention.`);
      } else {
        toast.success("AI parsed — review and save.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not parse text");
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!draft.name || !draft.name.trim()) {
      toast.error("Name is required before saving");
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/homebrew/save`, {
        content_type: type,
        edition,
        data: draft,
        homebrew_id: editingId || undefined
      });
      toast.success(editingId ? "Homebrew updated" : "Saved to your library");
      reset();
      fetchLibrary();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setDraft({ ...item });
    setMissing([]);
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete homebrew "${item.name}"?`)) return;
    try {
      await apiClient.delete(`/homebrew/${type}/${item.id}`);
      toast.success("Deleted");
      fetchLibrary();
      if (editingId === item.id) reset();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Delete failed");
    }
  };

  const items = library[type] || [];

  return (
    <div style={{
      minHeight: "100vh", background: theme.bg.primary, color: theme.text.primary,
      padding: 24
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate("/home")}
            data-testid="hb-back-btn"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "transparent", border: `1px solid ${theme.border}`,
              color: theme.text.secondary, padding: "8px 14px", borderRadius: 8,
              cursor: "pointer", fontSize: 13, fontWeight: 600
            }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: theme.gold, letterSpacing: 1, display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={22} /> HOMEBREW WORKSHOP
          </h1>
          <select
            value={edition}
            onChange={e => setEdition(e.target.value)}
            data-testid="hb-edition"
            style={{ ...inputStyle, width: 130, cursor: "pointer" }}>
            <option value="2014">2014 Rules</option>
            <option value="2024">2024 Rules</option>
          </select>
        </div>

        {/* Type tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {TYPES.map(t => {
            const Icon = t.icon;
            const active = type === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onTypeChange(t.key)}
                data-testid={`hb-type-${t.key}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 16px",
                  background: active ? theme.goldSoft : "var(--rq-bg-muted, rgba(192, 138, 61, 0.08))",
                  border: active ? `2px solid ${theme.gold}` : `1px solid ${theme.border}`,
                  borderRadius: 10, color: active ? theme.gold : theme.text.secondary,
                  cursor: "pointer", fontSize: 12, fontWeight: 800, letterSpacing: 1
                }}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* LEFT — input */}
          <div style={{
            background: theme.bg.elevated, padding: 20,
            border: `1px solid ${theme.border}`, borderRadius: 12
          }}>
            <h2 style={{ margin: "0 0 16px", color: theme.gold, fontSize: 14, letterSpacing: 1, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              <Wand2 size={14} /> AI ASSISTANT — extract from text or .docx
            </h2>

            <label
              htmlFor="hb-file-input"
              data-testid="hb-upload-label"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "16px",
                background: "var(--rq-bg-muted, rgba(192, 138, 61, 0.08))",
                border: `2px dashed ${theme.border}`, borderRadius: 10,
                color: theme.text.secondary, cursor: parsing ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 700, marginBottom: 12,
                opacity: parsing ? 0.6 : 1
              }}>
              {parsing ? <Loader2 size={16} className="rq-spin" /> : <Upload size={16} />}
              {parsing ? "AI is reading the document…" : "Upload .docx, .txt, or .md (max 5MB)"}
              <input
                id="hb-file-input"
                ref={fileInputRef}
                type="file"
                accept=".docx,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFile}
                disabled={parsing}
                data-testid="hb-file-input"
                style={{ display: "none" }}
              />
            </label>

            <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 8 }}>
              — or paste source text below —
            </div>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder={`Paste ${type === "magic_item" ? "magic item description" : type} description here…`}
              data-testid="hb-paste-text"
              style={{
                ...inputStyle, minHeight: 120, resize: "vertical", marginBottom: 8
              }}
            />
            <button
              type="button"
              onClick={handleParseText}
              disabled={parsing || !pasteText.trim()}
              data-testid="hb-parse-text-btn"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 16px",
                background: (parsing || !pasteText.trim()) ? "var(--rq-bg-muted, rgba(192, 138, 61, 0.08))" : theme.goldSoft,
                border: `1px solid ${theme.gold}`, borderRadius: 10,
                color: theme.gold, cursor: (parsing || !pasteText.trim()) ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 800
              }}>
              {parsing ? <Loader2 size={14} className="rq-spin" /> : <Sparkles size={14} />}
              {parsing ? "Parsing…" : "Parse text with AI"}
            </button>
          </div>

          {/* RIGHT — draft editor */}
          <div style={{
            background: theme.bg.elevated, padding: 20,
            border: `1px solid ${theme.border}`, borderRadius: 12
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ margin: 0, color: theme.gold, fontSize: 14, letterSpacing: 1, fontWeight: 800 }}>
                {editingId ? "EDITING" : "DRAFT"}
              </h2>
              {missing.length > 0 && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: 6,
                  background: "rgba(245,158,11,0.10)", color: theme.text.warn,
                  fontSize: 11, fontWeight: 700, border: `1px solid rgba(245,158,11,0.4)`
                }}>
                  <AlertTriangle size={12} /> {missing.length} field{missing.length === 1 ? "" : "s"} missing
                </div>
              )}
            </div>

            <div data-testid="hb-draft-editor">
              <DraftEditor
                contentType={type}
                draft={draft}
                missing={missing}
                onChange={setDraft}
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !draft.name}
                data-testid="hb-save-btn"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 18px",
                  background: saving || !draft.name ? theme.goldSoft : theme.gold,
                  border: "none", borderRadius: 10,
                  color: saving || !draft.name ? theme.text.muted : theme.text.inverse,
                  cursor: saving || !draft.name ? "not-allowed" : "pointer",
                  fontSize: 13, fontWeight: 800, letterSpacing: 0.5
                }}>
                {saving ? <Loader2 size={14} className="rq-spin" /> : <Save size={14} />}
                {editingId ? "Update" : "Save to library"}
              </button>
              <button
                type="button"
                onClick={reset}
                data-testid="hb-reset-btn"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 14px",
                  background: "transparent", border: `1px solid ${theme.border}`,
                  color: theme.text.secondary, borderRadius: 10,
                  cursor: "pointer", fontSize: 12, fontWeight: 700
                }}>
                <RefreshCw size={12} /> Clear
              </button>
            </div>
          </div>
        </div>

        {/* Library list */}
        <div style={{
          marginTop: 24,
          background: theme.bg.surface, padding: 20,
          border: `1px solid ${theme.border}`, borderRadius: 12
        }}>
          <h2 style={{ margin: "0 0 14px", color: theme.gold, fontSize: 14, letterSpacing: 1, fontWeight: 800 }}>
            MY {(TYPES.find(t => t.key === type)?.label || type).toUpperCase()} LIBRARY
            <span style={{ marginLeft: 10, color: theme.text.muted, fontSize: 11, fontWeight: 600 }}>
              ({items.length})
            </span>
          </h2>
          {items.length === 0 ? (
            <div style={{ fontSize: 13, color: theme.text.muted, fontStyle: "italic" }}>
              No homebrew {type}s saved yet. Upload a doc or paste text above to get started.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {items.map(item => (
                <div
                  key={item.id}
                  data-testid={`hb-item-${item.id}`}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 14px", borderRadius: 10,
                    background: theme.bg.elevated,
                    border: `1px solid ${theme.border}`
                  }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: theme.text.primary }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: theme.text.muted }}>
                      {item.edition} · {item.description?.slice(0, 80) || "(no description)"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" onClick={() => handleEdit(item)} data-testid={`hb-edit-${item.id}`}
                      style={{ padding: "6px 10px", background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 6, color: theme.gold, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                      EDIT
                    </button>
                    <button type="button" onClick={() => handleDelete(item)} data-testid={`hb-delete-${item.id}`}
                      style={{ padding: "6px 10px", background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 6, color: theme.text.muted, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes rqSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .rq-spin { animation: rqSpin 0.9s linear infinite; }
      `}</style>
    </div>
  );
}
