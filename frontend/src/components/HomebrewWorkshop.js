import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { AlertTriangle, ArrowLeft, BookOpen, Bot, Brain, FileText, Gem, Loader2, RefreshCw, Save, Shield, Skull, Sparkles, Sword, Trash2, Upload, UserCircle, Wand2 } from 'lucide-react';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "Germania One", Georgia, serif)';
const rq = { bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000', text: '#ffffff', soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)', warn: '#d99222' };

const TYPES = [
  { key: 'monster', label: 'Monster / Creature', icon: Skull, help: 'Build full stat blocks and let Rook fill missing attacks, traits, saves, senses, and combat role.' },
  { key: 'npc', label: 'NPC Maker', icon: UserCircle, help: 'Create NPCs with personality, secrets, hooks, factions, voice, and optional combat role.' },
  { key: 'custom_rule', label: 'Custom Rules', icon: Brain, help: 'Create exploding dice rules, chaos tokens, custom skills, futuristic checks, magic rules, and table rules.' },
  { key: 'magic_item', label: 'Magic Item', icon: Gem, help: 'Create magic items, cursed items, equipment, attunement items, and rewards.' },
  { key: 'race', label: 'Race / Species', icon: Shield, help: 'Create species traits, speed, size, languages, and bonuses.' },
  { key: 'class', label: 'Class', icon: Sword, help: 'Create class chassis, hit dice, proficiencies, and level features.' },
  { key: 'subclass', label: 'Subclass', icon: BookOpen, help: 'Create subclass features tied to a parent class.' },
  { key: 'background', label: 'Background', icon: FileText, help: 'Create skills, equipment, languages, and feature text.' },
];

const EMPTY_DRAFTS = {
  monster: { name: '', creature_type: '', size: 'Medium', alignment: '', challenge_rating: '', armor_class: '', hit_points: '', speed: '30 ft.', abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, traits: [], actions: [], bonus_actions: [], reactions: [], legendary_actions: [], lair_actions: [], role: '', description: '' },
  npc: { name: '', ancestry: '', role: '', faction: '', location: '', appearance: '', personality: '', voice: '', mannerisms: [], ideal: '', bond: '', flaw: '', secret: '', wants: '', fears: '', quest_hooks: [], combat_role: 'noncombatant', stat_hint: '', description: '' },
  custom_rule: { name: '', category: 'other', summary: '', enabled_by_default: true, rule_text: '', trigger: '', resolution: '', examples: [], settings: {}, player_visible: true, gm_notes: '' },
  magic_item: { name: '', type: 'Wondrous Item', rarity: '', requires_attunement: false, description: '', effects: [] },
  race: { name: '', description: '', size: 'Medium', speed: 30, ability_bonuses: {}, traits: [], languages: [] },
  class: { name: '', description: '', hit_die: 'd8', primary_ability: '', saving_throw_proficiencies: [], armor_proficiencies: [], weapon_proficiencies: [], features: [] },
  subclass: { name: '', parent_class: '', description: '', subclass_level: 3, features: [] },
  background: { name: '', description: '', skill_proficiencies: [], tool_proficiencies: [], languages: 0, equipment: [], feature_name: '', feature_description: '' },
};

const CATEGORIES = ['exploding_dice', 'chaos_tokens', 'custom_skill', 'resting', 'combat', 'magic', 'futuristic', 'other'];
const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

function asArray(value) { return Array.isArray(value) ? value : []; }
function toLines(value) { return asArray(value).map(item => typeof item === 'string' ? item : item?.name ? `${item.name} :: ${item.description || ''}` : JSON.stringify(item)).join('\n'); }
function fromLines(value) { return String(value || '').split('\n').map(line => line.trim()).filter(Boolean); }
function namedFromLines(value) { return fromLines(value).map(line => { const [name, ...rest] = line.split('::'); return { name: name.trim(), description: rest.join('::').trim() }; }); }
function safeJson(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
function typeMeta(type) { return TYPES.find(item => item.key === type) || TYPES[0]; }
function emptyDraft(type) { return JSON.parse(JSON.stringify(EMPTY_DRAFTS[type] || {})); }
function formatType(type) { return typeMeta(type).label; }

function findMissing(type, draft) {
  const checks = {
    monster: ['name', 'armor_class', 'hit_points', 'challenge_rating', 'actions'],
    npc: ['name', 'role', 'personality', 'secret'],
    custom_rule: ['name', 'category', 'summary', 'rule_text'],
    magic_item: ['name', 'rarity'],
    race: ['name', 'size', 'speed'],
    class: ['name', 'hit_die', 'features'],
    subclass: ['name', 'parent_class', 'features'],
    background: ['name', 'skill_proficiencies'],
  }[type] || ['name'];
  return checks.filter(key => {
    const value = draft?.[key];
    return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0);
  });
}

function FieldRow({ label, value, onChange, missing, multiline = false, placeholder = '', type = 'text' }) {
  const Tag = multiline ? 'textarea' : 'input';
  return <label style={fieldStyle}><span style={{ color: missing ? rq.warn : rq.muted }}>{label}{missing ? ' · missing' : ''}</span><Tag type={type} value={value ?? ''} onChange={event => onChange(event.target.value)} placeholder={placeholder} style={{ ...inputStyle, minHeight: multiline ? 86 : 38, resize: multiline ? 'vertical' : undefined, border: missing ? `2px solid ${rq.warn}` : `1px solid ${rq.line}` }} /></label>;
}

function SelectRow({ label, value, onChange, options }) {
  return <label style={fieldStyle}><span>{label}</span><select value={value || ''} onChange={event => onChange(event.target.value)} style={inputStyle}>{options.map(option => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function CheckRow({ label, checked, onChange }) {
  return <label style={checkRowStyle}><input type="checkbox" checked={Boolean(checked)} onChange={event => onChange(event.target.checked)} /> {label}</label>;
}

function DraftEditor({ contentType, draft, missing, onChange }) {
  const upd = (key, value) => onChange({ ...draft, [key]: value });
  const miss = (key) => missing.includes(key);

  if (contentType === 'monster') {
    return <div style={formStackStyle}>
      <FormGrid>
        <FieldRow label="Name" value={draft.name} onChange={v => upd('name', v)} missing={miss('name')} placeholder="Ashen Grave Troll" />
        <FieldRow label="Creature Type" value={draft.creature_type} onChange={v => upd('creature_type', v)} placeholder="undead, fiend, construct..." />
        <FieldRow label="Size" value={draft.size} onChange={v => upd('size', v)} />
        <FieldRow label="Alignment" value={draft.alignment} onChange={v => upd('alignment', v)} />
        <FieldRow label="Challenge Rating" value={draft.challenge_rating} onChange={v => upd('challenge_rating', v)} missing={miss('challenge_rating')} placeholder="3, 7, 12..." />
        <FieldRow label="Armour Class" value={draft.armor_class} onChange={v => upd('armor_class', Number(v) || v)} missing={miss('armor_class')} />
        <FieldRow label="Hit Points" value={draft.hit_points} onChange={v => upd('hit_points', Number(v) || v)} missing={miss('hit_points')} />
        <FieldRow label="Speed" value={draft.speed} onChange={v => upd('speed', v)} />
        <FieldRow label="Combat Role" value={draft.role} onChange={v => upd('role', v)} placeholder="brute, controller, boss..." />
      </FormGrid>
      <FieldRow label="Description / Theme" value={draft.description} onChange={v => upd('description', v)} multiline placeholder="What is it, where does it fit, what makes it scary?" />
      <JsonField label="Abilities JSON" value={draft.abilities || {}} onChange={v => upd('abilities', v)} placeholder='{"str":16,"dex":12,"con":18,"int":7,"wis":10,"cha":8}' />
      <FieldRow label="Traits (one per line: Name :: description)" value={toLines(draft.traits)} onChange={v => upd('traits', namedFromLines(v))} multiline />
      <FieldRow label="Actions (one per line: Name :: attack/damage/effect)" value={toLines(draft.actions)} onChange={v => upd('actions', namedFromLines(v))} multiline missing={miss('actions')} />
      <FieldRow label="Bonus Actions" value={toLines(draft.bonus_actions)} onChange={v => upd('bonus_actions', namedFromLines(v))} multiline />
      <FieldRow label="Reactions" value={toLines(draft.reactions)} onChange={v => upd('reactions', namedFromLines(v))} multiline />
      <FieldRow label="Legendary Actions" value={toLines(draft.legendary_actions)} onChange={v => upd('legendary_actions', namedFromLines(v))} multiline />
      <FieldRow label="Lair Actions" value={toLines(draft.lair_actions)} onChange={v => upd('lair_actions', namedFromLines(v))} multiline />
    </div>;
  }

  if (contentType === 'npc') {
    return <div style={formStackStyle}>
      <FormGrid>
        <FieldRow label="Name" value={draft.name} onChange={v => upd('name', v)} missing={miss('name')} />
        <FieldRow label="Ancestry" value={draft.ancestry} onChange={v => upd('ancestry', v)} />
        <FieldRow label="Role" value={draft.role} onChange={v => upd('role', v)} missing={miss('role')} placeholder="captain, patron, traitor..." />
        <FieldRow label="Faction" value={draft.faction} onChange={v => upd('faction', v)} />
        <FieldRow label="Location" value={draft.location} onChange={v => upd('location', v)} />
        <FieldRow label="Combat Role" value={draft.combat_role} onChange={v => upd('combat_role', v)} />
        <FieldRow label="Stat Hint" value={draft.stat_hint} onChange={v => upd('stat_hint', v)} placeholder="mage, bandit captain, custom..." />
      </FormGrid>
      <FieldRow label="Appearance" value={draft.appearance} onChange={v => upd('appearance', v)} multiline />
      <FieldRow label="Personality" value={draft.personality} onChange={v => upd('personality', v)} multiline missing={miss('personality')} />
      <FieldRow label="Voice" value={draft.voice} onChange={v => upd('voice', v)} />
      <FieldRow label="Mannerisms (one per line)" value={toLines(draft.mannerisms)} onChange={v => upd('mannerisms', fromLines(v))} multiline />
      <FormGrid>
        <FieldRow label="Ideal" value={draft.ideal} onChange={v => upd('ideal', v)} />
        <FieldRow label="Bond" value={draft.bond} onChange={v => upd('bond', v)} />
        <FieldRow label="Flaw" value={draft.flaw} onChange={v => upd('flaw', v)} />
      </FormGrid>
      <FieldRow label="Secret" value={draft.secret} onChange={v => upd('secret', v)} multiline missing={miss('secret')} />
      <FormGrid>
        <FieldRow label="Wants" value={draft.wants} onChange={v => upd('wants', v)} />
        <FieldRow label="Fears" value={draft.fears} onChange={v => upd('fears', v)} />
      </FormGrid>
      <FieldRow label="Quest Hooks (one per line)" value={toLines(draft.quest_hooks)} onChange={v => upd('quest_hooks', fromLines(v))} multiline />
      <FieldRow label="Description" value={draft.description} onChange={v => upd('description', v)} multiline />
    </div>;
  }

  if (contentType === 'custom_rule') {
    return <div style={formStackStyle}>
      <FormGrid>
        <FieldRow label="Rule Name" value={draft.name} onChange={v => upd('name', v)} missing={miss('name')} placeholder="Exploding d6s, Chaos Tokens, Tech Check..." />
        <SelectRow label="Category" value={draft.category || 'other'} onChange={v => upd('category', v)} options={CATEGORIES} />
      </FormGrid>
      <FieldRow label="Summary" value={draft.summary} onChange={v => upd('summary', v)} missing={miss('summary')} />
      <FieldRow label="Rule Text" value={draft.rule_text} onChange={v => upd('rule_text', v)} multiline missing={miss('rule_text')} />
      <FormGrid>
        <FieldRow label="Trigger" value={draft.trigger} onChange={v => upd('trigger', v)} placeholder="When does this happen?" />
        <FieldRow label="Resolution" value={draft.resolution} onChange={v => upd('resolution', v)} placeholder="What does the table do next?" />
      </FormGrid>
      <FieldRow label="Examples (one per line)" value={toLines(draft.examples)} onChange={v => upd('examples', fromLines(v))} multiline />
      <JsonField label="Settings JSON" value={draft.settings || {}} onChange={v => upd('settings', v)} placeholder='{"dice":["d6","d8"],"skills":[{"name":"Tech","ability":"intelligence"}]}' />
      <div style={tipStyle}>Custom skills example: add <strong>Tech</strong> using intelligence, or <strong>Pilot</strong> using dexterity. Exploding dice example: choose which dice explode in settings.</div>
      <CheckRow label="Enabled by default" checked={draft.enabled_by_default} onChange={v => upd('enabled_by_default', v)} />
      <CheckRow label="Visible to players" checked={draft.player_visible} onChange={v => upd('player_visible', v)} />
      <FieldRow label="GM Notes" value={draft.gm_notes} onChange={v => upd('gm_notes', v)} multiline />
    </div>;
  }

  if (contentType === 'magic_item') {
    return <div style={formStackStyle}>
      <FormGrid>
        <FieldRow label="Name" value={draft.name} onChange={v => upd('name', v)} missing={miss('name')} />
        <FieldRow label="Type" value={draft.type} onChange={v => upd('type', v)} />
        <FieldRow label="Rarity" value={draft.rarity} onChange={v => upd('rarity', v)} missing={miss('rarity')} />
      </FormGrid>
      <CheckRow label="Requires attunement" checked={draft.requires_attunement} onChange={v => upd('requires_attunement', v)} />
      <FieldRow label="Description" value={draft.description} onChange={v => upd('description', v)} multiline />
      <FieldRow label="Effects (one per line)" value={toLines(draft.effects)} onChange={v => upd('effects', fromLines(v))} multiline />
    </div>;
  }

  if (contentType === 'race') {
    return <div style={formStackStyle}>
      <FormGrid><FieldRow label="Name" value={draft.name} onChange={v => upd('name', v)} missing={miss('name')} /><FieldRow label="Size" value={draft.size} onChange={v => upd('size', v)} missing={miss('size')} /><FieldRow label="Speed" value={draft.speed} onChange={v => upd('speed', Number(v) || 30)} missing={miss('speed')} /></FormGrid>
      <FieldRow label="Description" value={draft.description} onChange={v => upd('description', v)} multiline />
      <JsonField label="Ability Bonuses JSON" value={draft.ability_bonuses || {}} onChange={v => upd('ability_bonuses', v)} />
      <FieldRow label="Traits (one per line: Name :: description)" value={toLines(draft.traits)} onChange={v => upd('traits', namedFromLines(v))} multiline />
      <FieldRow label="Languages (one per line)" value={toLines(draft.languages)} onChange={v => upd('languages', fromLines(v))} multiline />
    </div>;
  }

  if (contentType === 'class' || contentType === 'subclass') {
    return <div style={formStackStyle}>
      <FormGrid>
        <FieldRow label="Name" value={draft.name} onChange={v => upd('name', v)} missing={miss('name')} />
        {contentType === 'class' ? <FieldRow label="Hit Die" value={draft.hit_die} onChange={v => upd('hit_die', v)} missing={miss('hit_die')} /> : <FieldRow label="Parent Class" value={draft.parent_class} onChange={v => upd('parent_class', v)} missing={miss('parent_class')} />}
        {contentType === 'subclass' && <FieldRow label="Subclass Level" value={draft.subclass_level || 3} onChange={v => upd('subclass_level', Number(v) || 3)} />}
        {contentType === 'class' && <FieldRow label="Primary Ability" value={draft.primary_ability} onChange={v => upd('primary_ability', v)} />}
      </FormGrid>
      <FieldRow label="Description" value={draft.description} onChange={v => upd('description', v)} multiline />
      {contentType === 'class' && <><FieldRow label="Saving Throws" value={toLines(draft.saving_throw_proficiencies)} onChange={v => upd('saving_throw_proficiencies', fromLines(v))} multiline /><FieldRow label="Armour Proficiencies" value={toLines(draft.armor_proficiencies)} onChange={v => upd('armor_proficiencies', fromLines(v))} multiline /><FieldRow label="Weapon Proficiencies" value={toLines(draft.weapon_proficiencies)} onChange={v => upd('weapon_proficiencies', fromLines(v))} multiline /></>}
      <FieldRow label="Features (one per line: Level - Name :: description)" value={toLines(draft.features)} onChange={v => upd('features', namedFromLines(v))} multiline missing={miss('features')} />
    </div>;
  }

  if (contentType === 'background') {
    return <div style={formStackStyle}>
      <FieldRow label="Name" value={draft.name} onChange={v => upd('name', v)} missing={miss('name')} />
      <FieldRow label="Description" value={draft.description} onChange={v => upd('description', v)} multiline />
      <FieldRow label="Skill Proficiencies" value={toLines(draft.skill_proficiencies)} onChange={v => upd('skill_proficiencies', fromLines(v))} multiline missing={miss('skill_proficiencies')} />
      <FieldRow label="Tool Proficiencies" value={toLines(draft.tool_proficiencies)} onChange={v => upd('tool_proficiencies', fromLines(v))} multiline />
      <FieldRow label="Equipment" value={toLines(draft.equipment)} onChange={v => upd('equipment', fromLines(v))} multiline />
      <FieldRow label="Feature Name" value={draft.feature_name} onChange={v => upd('feature_name', v)} />
      <FieldRow label="Feature Description" value={draft.feature_description} onChange={v => upd('feature_description', v)} multiline />
    </div>;
  }

  return null;
}

function JsonField({ label, value, onChange, placeholder = '{}' }) {
  const [text, setText] = useState(JSON.stringify(value || {}, null, 2));
  useEffect(() => { setText(JSON.stringify(value || {}, null, 2)); }, [value]);
  return <label style={fieldStyle}><span>{label}</span><textarea value={text} onChange={event => { setText(event.target.value); onChange(safeJson(event.target.value, value || {})); }} placeholder={placeholder} style={{ ...inputStyle, minHeight: 100, resize: 'vertical', fontFamily: 'monospace' }} /></label>;
}

function FormGrid({ children }) { return <div style={formGridStyle}>{children}</div>; }

export default function HomebrewWorkshop() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [type, setType] = useState('monster');
  const [edition, setEdition] = useState('2014');
  const [pasteText, setPasteText] = useState('');
  const [draft, setDraft] = useState(emptyDraft('monster'));
  const [missing, setMissing] = useState(findMissing('monster', emptyDraft('monster')));
  const [library, setLibrary] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentMeta = typeMeta(type);
  const items = library[type] || [];
  const localMissing = useMemo(() => findMissing(type, draft), [type, draft]);
  const shownMissing = missing.length ? missing : localMissing;

  const fetchLibrary = async () => {
    try {
      const { data } = await apiClient.get('/homebrew');
      setLibrary(data?.homebrew || {});
    } catch {
      setLibrary({});
    }
  };

  useEffect(() => { fetchLibrary(); }, []);

  const reset = (nextType = type) => {
    const empty = emptyDraft(nextType);
    setDraft(empty);
    setMissing(findMissing(nextType, empty));
    setEditingId(null);
    setPasteText('');
  };

  const switchType = (nextType) => {
    setType(nextType);
    reset(nextType);
  };

  const applyDraftResponse = (data, successText) => {
    const nextDraft = data?.draft || emptyDraft(type);
    const nextMissing = data?.missing_fields || findMissing(type, nextDraft);
    setDraft(nextDraft);
    setMissing(nextMissing);
    setEditingId(null);
    if (nextMissing.length) toast.warning(`${successText} ${nextMissing.length} field${nextMissing.length === 1 ? '' : 's'} still need attention.`);
    else toast.success(successText);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(docx|txt|md)$/i.test(file.name)) {
      toast.error('Please upload a .docx, .txt, or .md file');
      event.target.value = '';
      return;
    }
    setParsing(true);
    try {
      const form = new FormData();
      form.append('content_type', type);
      form.append('file', file);
      form.append('edition', edition);
      const { data } = await apiClient.post('/homebrew/parse-docx', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      applyDraftResponse(data, 'Rook parsed your file.');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not parse file');
    } finally {
      setParsing(false);
      event.target.value = '';
    }
  };

  const handleParseText = async () => {
    if (!pasteText.trim()) {
      toast.error('Paste some source text first');
      return;
    }
    setParsing(true);
    try {
      const { data } = await apiClient.post('/homebrew/parse-text', { content_type: type, edition, text: pasteText });
      applyDraftResponse(data, 'Rook parsed your text.');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not parse text');
    } finally {
      setParsing(false);
    }
  };

  const handleCompleteDraft = async () => {
    setCompleting(true);
    try {
      const { data } = await apiClient.post('/homebrew/complete-draft', { content_type: type, edition, draft, context: pasteText });
      applyDraftResponse(data, 'Rook filled the draft gaps.');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Rook could not complete the draft');
    } finally {
      setCompleting(false);
    }
  };

  const handleSave = async () => {
    if (!draft.name?.trim()) {
      toast.error('Name is required before saving');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/homebrew/save', { content_type: type, edition, data: draft, homebrew_id: editingId || undefined });
      toast.success(editingId ? 'Homebrew updated' : 'Saved to your library');
      reset(type);
      fetchLibrary();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setDraft({ ...item });
    setMissing(findMissing(type, item));
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete homebrew "${item.name}"?`)) return;
    try {
      await apiClient.delete(`/homebrew/${type}/${item.id}`);
      toast.success('Deleted');
      fetchLibrary();
      if (editingId === item.id) reset(type);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Delete failed');
    }
  };

  return <main style={pageStyle} data-testid="homebrew-workshop">
    <section style={wrapStyle}>
      <header style={headerStyle}>
        <button type="button" onClick={() => navigate('/home')} style={secondaryButtonStyle} data-testid="hb-back-btn"><ArrowLeft size={15} /> Back</button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={eyebrowStyle}>Rook-assisted creation</p>
          <h1 style={titleStyle}><Sparkles size={28} /> Homebrew Workshop</h1>
          <p style={subtitleStyle}>Build monsters, NPCs, items, classes, species, backgrounds, and custom rules. Fill what you know, then ask Rook to complete the missing pieces.</p>
        </div>
        <select value={edition} onChange={event => setEdition(event.target.value)} style={selectButtonStyle} data-testid="hb-edition"><option value="2014">2014 Rules</option><option value="2024">2024 Rules</option></select>
      </header>

      <section style={typeGridStyle}>{TYPES.map(item => {
        const Icon = item.icon;
        const active = type === item.key;
        return <button key={item.key} type="button" onClick={() => switchType(item.key)} style={typeCardStyle(active)} data-testid={`hb-type-${item.key}`}><Icon size={18} /><strong>{item.label}</strong><span>{item.help}</span></button>;
      })}</section>

      <section style={builderGridStyle}>
        <aside style={panelStyle}>
          <h2 style={sectionTitleStyle}><Wand2 size={17} /> Source / Rook input</h2>
          <p style={helpStyle}>Upload a file, paste rough notes, or type directly into the draft. Rook can then parse or complete the missing parts.</p>
          <label htmlFor="hb-file-input" style={uploadStyle} data-testid="hb-upload-label">{parsing ? <Loader2 size={17} className="rq-spin" /> : <Upload size={17} />} {parsing ? 'Rook is reading…' : 'Upload .docx, .txt, or .md'}<input id="hb-file-input" ref={fileInputRef} type="file" accept=".docx,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFile} disabled={parsing} data-testid="hb-file-input" style={{ display: 'none' }} /></label>
          <textarea value={pasteText} onChange={event => setPasteText(event.target.value)} placeholder={`Paste ${formatType(type).toLowerCase()} notes, theme, mechanics, or half-written ideas here...`} style={{ ...inputStyle, minHeight: 165, resize: 'vertical' }} data-testid="hb-paste-text" />
          <div style={actionRowStyle}>
            <button type="button" onClick={handleParseText} disabled={parsing || !pasteText.trim()} style={primaryButtonStyle} data-testid="hb-parse-text-btn">{parsing ? <Loader2 size={15} className="rq-spin" /> : <Bot size={15} />} Parse with Rook</button>
            <button type="button" onClick={handleCompleteDraft} disabled={completing} style={secondaryButtonStyle} data-testid="hb-complete-draft-btn">{completing ? <Loader2 size={15} className="rq-spin" /> : <Sparkles size={15} />} Ask Rook to Fill Gaps</button>
          </div>
          <div style={tipStyle}><strong>Good workflow:</strong> fill the name, theme, and two or three key ideas first. Rook will use those choices to complete missing stat blocks, secrets, rule text, or settings.</div>
        </aside>

        <section style={panelStyle}>
          <div style={draftHeaderStyle}>
            <div><h2 style={sectionTitleStyle}>{editingId ? 'Editing' : 'Draft'} · {currentMeta.label}</h2><p style={helpStyle}>{currentMeta.help}</p></div>
            {shownMissing.length > 0 && <span style={missingPillStyle}><AlertTriangle size={14} /> {shownMissing.length} missing</span>}
          </div>
          <DraftEditor contentType={type} draft={draft} missing={shownMissing} onChange={setDraft} />
          <div style={footerActionsStyle}>
            <button type="button" onClick={() => reset(type)} style={secondaryButtonStyle}><RefreshCw size={15} /> Clear</button>
            <button type="button" onClick={handleCompleteDraft} disabled={completing} style={secondaryButtonStyle}><Sparkles size={15} /> Fill Missing</button>
            <button type="button" onClick={handleSave} disabled={saving || !draft.name} style={primaryButtonStyle} data-testid="hb-save-btn">{saving ? <Loader2 size={15} className="rq-spin" /> : <Save size={15} />} {editingId ? 'Update' : 'Save to Library'}</button>
          </div>
        </section>
      </section>

      <section style={libraryStyle}>
        <div style={libraryHeaderStyle}><h2 style={sectionTitleStyle}>My {currentMeta.label} Library <span style={countStyle}>({items.length})</span></h2><span style={helpStyle}>Saved homebrew is stored in your personal Homebrew Workshop library.</span></div>
        {items.length === 0 ? <p style={emptyStyle}>No saved {currentMeta.label.toLowerCase()} yet.</p> : <div style={libraryGridStyle}>{items.map(item => <LibraryCard key={item.id} item={item} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />)}</div>}
      </section>
    </section>
  </main>;
}

function LibraryCard({ item, onEdit, onDelete }) {
  return <article style={libraryCardStyle}><div><strong>{item.name || 'Untitled'}</strong><p>{item.summary || item.description || item.role || item.creature_type || item.category || 'No description yet.'}</p></div><div style={cardActionsStyle}><button type="button" onClick={onEdit} style={smallButtonStyle}>Edit</button><button type="button" onClick={onDelete} style={smallButtonStyle}><Trash2 size={13} /> Delete</button></div></article>;
}

const pageStyle = { minHeight: '100dvh', background: rq.bg, color: rq.text, fontFamily: fontStack, padding: 'clamp(12px, 2vw, 24px)' };
const wrapStyle = { maxWidth: 1240, margin: '0 auto', display: 'grid', gap: 14 };
const headerStyle = { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: rq.panel, border: `1px solid ${rq.line}`, padding: 14 };
const eyebrowStyle = { margin: '0 0 4px', color: rq.red, fontSize: 11, fontWeight: 950, letterSpacing: '0.12em', textTransform: 'uppercase' };
const titleStyle = { margin: 0, color: rq.text, fontFamily: titleFont, fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 0.92, display: 'flex', alignItems: 'center', gap: 10 };
const subtitleStyle = { margin: '8px 0 0', color: rq.soft, lineHeight: 1.45, maxWidth: 850 };
const typeGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 };
const typeCardStyle = (active) => ({ display: 'grid', gap: 6, minHeight: 104, textAlign: 'left', background: active ? rq.red : rq.card, color: rq.text, border: `1px solid ${active ? rq.red : rq.line}`, padding: 12, cursor: 'pointer', fontFamily: fontStack });
const builderGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(min(360px, 100%), 0.82fr) minmax(min(420px, 100%), 1.18fr)', gap: 12 };
const panelStyle = { background: rq.panel, border: `1px solid ${rq.line}`, padding: 14, minWidth: 0 };
const sectionTitleStyle = { margin: 0, color: rq.text, fontSize: 16, fontWeight: 950, display: 'flex', gap: 8, alignItems: 'center' };
const helpStyle = { margin: '6px 0 0', color: rq.muted, fontSize: 12, lineHeight: 1.45 };
const uploadStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 58, marginTop: 12, marginBottom: 10, background: rq.card, border: `1px dashed ${rq.line}`, color: rq.text, fontWeight: 900, cursor: 'pointer' };
const inputStyle = { width: '100%', background: rq.bg, color: rq.text, border: `1px solid ${rq.line}`, padding: '9px 10px', outline: 'none', borderRadius: 0, fontFamily: fontStack, colorScheme: 'dark' };
const fieldStyle = { display: 'grid', gap: 5, color: rq.muted, fontSize: 11, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase' };
const formStackStyle = { display: 'grid', gap: 11 };
const formGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 };
const checkRowStyle = { display: 'flex', alignItems: 'center', gap: 8, color: rq.soft, fontWeight: 850, minHeight: 34 };
const actionRowStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 };
const primaryButtonStyle = { minHeight: 38, border: 0, background: rq.red, color: rq.text, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 38, border: 0, background: rq.card, color: rq.text, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const selectButtonStyle = { ...inputStyle, width: 130, minHeight: 38, cursor: 'pointer' };
const tipStyle = { marginTop: 10, background: rq.bg, border: `1px solid ${rq.line}`, borderLeft: `5px solid ${rq.red}`, padding: 10, color: rq.soft, fontSize: 12, lineHeight: 1.45 };
const draftHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap' };
const missingPillStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, background: rq.bg, border: `1px solid ${rq.warn}`, color: rq.warn, padding: '5px 8px', fontSize: 11, fontWeight: 900 };
const footerActionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: 14, borderTop: `1px solid ${rq.line}`, paddingTop: 12 };
const libraryStyle = { background: rq.panel, border: `1px solid ${rq.line}`, padding: 14 };
const libraryHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 };
const countStyle = { color: rq.muted, fontSize: 12 };
const emptyStyle = { margin: 0, color: rq.muted, background: rq.bg, border: `1px dashed ${rq.line}`, padding: 16 };
const libraryGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 };
const libraryCardStyle = { display: 'grid', gap: 10, background: rq.card, border: `1px solid ${rq.line}`, padding: 11, color: rq.text };
const cardActionsStyle = { display: 'flex', gap: 6, justifyContent: 'flex-end' };
const smallButtonStyle = { minHeight: 30, border: `1px solid ${rq.line}`, background: rq.bg, color: rq.text, padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 850, cursor: 'pointer' };
