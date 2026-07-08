import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Bot,
  Brain,
  Download,
  FileText,
  Gem,
  Loader2,
  RefreshCw,
  Save,
  ScrollText,
  Shield,
  Skull,
  Sparkles,
  Sword,
  Trash2,
  Upload,
  UserCircle,
  Wand2,
  Zap,
} from 'lucide-react';
import ImageUploadPanel from '@/components/ImageUploadPanel';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "Germania One", Georgia, serif)';
const rq = { bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000', text: '#ffffff', soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)', warn: '#d99222' };

const TYPES = [
  { key: 'subclass', label: 'Subclass', icon: BookOpen, help: 'Create subclass features tied to a parent class, including resources, actions, and scaling.' },
  { key: 'class', label: 'Class', icon: Sword, help: 'Create class chassis, hit dice, proficiencies, level features, and custom trackers.' },
  { key: 'feat', label: 'Feat', icon: Zap, help: 'Create feats with prerequisites, benefits, ASIs, passive effects, and sheet actions.' },
  { key: 'spell', label: 'Spell', icon: ScrollText, help: 'Create spells with level, school, components, damage, scaling, and class lists.' },
  { key: 'race', label: 'Race / Species', icon: Shield, help: 'Create species traits, speed, size, languages, bonuses, and sheet passives.' },
  { key: 'background', label: 'Background', icon: FileText, help: 'Create skills, tools, equipment, languages, and feature text.' },
  { key: 'magic_item', label: 'Magic Item', icon: Gem, help: 'Create magic items, cursed items, equipment, attunement items, charges, and rewards.' },
  { key: 'monster', label: 'Monster / Creature', icon: Skull, help: 'Build full stat blocks and let Rook fill missing attacks, traits, saves, senses, and combat role.' },
  { key: 'npc', label: 'NPC Maker', icon: UserCircle, help: 'Create NPCs with personality, secrets, hooks, factions, voice, and optional combat role.' },
  { key: 'custom_rule', label: 'Custom Rules', icon: Brain, help: 'Create exploding dice rules, chaos tokens, custom skills, futuristic checks, magic rules, and table rules.' },
];

const ADVANCED = { resources: [], actions: [], passive_effects: [], scaling: [], upgrades: [], automation_notes: '' };

const EMPTY_DRAFTS = {
  monster: { name: '', image_url: '', creature_type: '', size: 'Medium', alignment: '', challenge_rating: '', armor_class: '', hit_points: '', speed: '30 ft.', abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, traits: [], actions: [], bonus_actions: [], reactions: [], legendary_actions: [], lair_actions: [], role: '', description: '', ...ADVANCED },
  npc: { name: '', image_url: '', ancestry: '', role: '', faction: '', location: '', appearance: '', personality: '', voice: '', mannerisms: [], ideal: '', bond: '', flaw: '', secret: '', wants: '', fears: '', quest_hooks: [], combat_role: 'noncombatant', stat_hint: '', description: '', ...ADVANCED },
  custom_rule: { name: '', image_url: '', category: 'other', summary: '', enabled_by_default: true, rule_text: '', trigger: '', resolution: '', examples: [], settings: {}, player_visible: true, gm_notes: '', ...ADVANCED },
  magic_item: { name: '', image_url: '', type: 'Wondrous Item', rarity: '', requires_attunement: false, attunement_requirement: '', description: '', effects: [], charges: {}, ...ADVANCED },
  race: { name: '', image_url: '', description: '', size: 'Medium', speed: 30, ability_bonuses: {}, traits: [], languages: [], subraces: [], ...ADVANCED },
  class: { name: '', image_url: '', description: '', hit_die: 'd8', primary_ability: '', saving_throw_proficiencies: [], armor_proficiencies: [], weapon_proficiencies: [], tool_proficiencies: [], skill_choices: {}, equipment: [], subclass_unlock_levels: [], features: [], ...ADVANCED },
  subclass: { name: '', image_url: '', parent_class: '', description: '', subclass_level: 3, features: [], ...ADVANCED },
  feat: { name: '', image_url: '', description: '', prerequisite: '', repeatable: false, ability_score_increase: {}, benefits: [], ...ADVANCED },
  spell: { name: '', image_url: '', description: '', level: 0, school: '', casting_time: '', range: '', components: '', duration: '', ritual: false, concentration: false, classes: [], damage: {}, higher_level: '', effects: [], ...ADVANCED },
  background: { name: '', image_url: '', description: '', skill_proficiencies: [], tool_proficiencies: [], languages: 0, equipment: [], feature_name: '', feature_description: '', suggested_characteristics: {}, ...ADVANCED },
};

const CATEGORIES = ['exploding_dice', 'chaos_tokens', 'custom_skill', 'resting', 'combat', 'magic', 'futuristic', 'other'];
const SCHOOLS = ['', 'Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];

function asArray(value) { return Array.isArray(value) ? value : []; }
function toLines(value) { return asArray(value).map(item => typeof item === 'string' ? item : item?.level ? `${item.level} - ${item.name || item.title || 'Feature'} :: ${item.description || item.rules_text || ''}` : item?.name ? `${item.name} :: ${item.description || item.rules_text || ''}` : JSON.stringify(item)).join('\n'); }
function fromLines(value) { return String(value || '').split('\n').map(line => line.trim()).filter(Boolean); }
function namedFromLines(value) {
  return fromLines(value).map(line => {
    const levelMatch = line.match(/^(\d+)\s*[-:]\s*(.*?)\s*::\s*(.*)$/);
    if (levelMatch) return { level: Number(levelMatch[1]), name: levelMatch[2].trim(), description: levelMatch[3].trim() };
    const [name, ...rest] = line.split('::');
    return { name: name.trim(), description: rest.join('::').trim() };
  });
}
function safeJson(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
function typeMeta(type) { return TYPES.find(item => item.key === type) || TYPES[0]; }
function emptyDraft(type) { return JSON.parse(JSON.stringify(EMPTY_DRAFTS[type] || {})); }
function normaliseDraft(type, value = {}) { return { ...emptyDraft(type), ...(value || {}), image_url: value?.image_url || value?.image || value?.portrait_url || value?.avatar_url || '' }; }
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
    feat: ['name', 'description', 'benefits'],
    spell: ['name', 'level', 'school', 'casting_time'],
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
  return <label style={fieldStyle}><span>{label}</span><select value={value || ''} onChange={event => onChange(event.target.value)} style={inputStyle}>{options.map(option => <option key={option} value={option}>{option || 'Choose…'}</option>)}</select></label>;
}

function CheckRow({ label, checked, onChange }) {
  return <label style={checkRowStyle}><input type="checkbox" checked={Boolean(checked)} onChange={event => onChange(event.target.checked)} /> {label}</label>;
}

function ArtworkField({ contentType, draft, onChange }) {
  const meta = typeMeta(contentType);
  return <ImageUploadPanel title={`${meta.label} Artwork`} subtitle="Optional. Upload art, a token, symbol, item card, subclass crest, species image, spell card, or visual reference to save with this homebrew." uploadLabel="Upload artwork" selectedImage={draft.image_url || ''} onSelectImage={(src) => onChange({ ...draft, image_url: src })} onClearImage={() => onChange({ ...draft, image_url: '' })} />;
}

function AdvancedMechanics({ draft, onChange }) {
  const upd = (key, value) => onChange({ ...draft, [key]: value });
  return <section style={advancedStyle}>
    <div style={advancedHeaderStyle}><Zap size={15} /> Sheet automation</div>
    <p style={helpStyle}>Use these when something should appear on a character sheet, spend charges, scale by level, or change a stat/passive.</p>
    <JsonField label="Resources JSON" value={draft.resources || []} onChange={v => upd('resources', v)} placeholder='[{"name":"Scarab Charges","formula":"warlock level","regain":"long rest","visible_on_sheet":true}]' />
    <JsonField label="Actions / Spending JSON" value={draft.actions || []} onChange={v => upd('actions', v)} placeholder='[{"name":"Spend Scarab Charge","action_type":"bonus action","resource_cost":{"Scarab Charges":1}}]' />
    <JsonField label="Passive Sheet Effects JSON" value={draft.passive_effects || []} onChange={v => upd('passive_effects', v)} placeholder='[{"name":"+1 Strength","target":"strength","mode":"bonus","value":1}]' />
    <JsonField label="Scaling JSON" value={draft.scaling || []} onChange={v => upd('scaling', v)} placeholder='[{"level":5,"description":"Damage increases to 2d6"}]' />
    <JsonField label="Upgrades JSON" value={draft.upgrades || []} onChange={v => upd('upgrades', v)} placeholder='[{"level":10,"name":"Improved Pact","description":"..."}]' />
    <FieldRow label="Automation Notes" value={draft.automation_notes || ''} onChange={v => upd('automation_notes', v)} multiline placeholder="Example: Add Scarab Charges to the resource tracker, max equals Warlock level, GM can adjust Greed Tokens." />
  </section>;
}

function DraftEditor({ contentType, draft, missing, onChange }) {
  const upd = (key, value) => onChange({ ...draft, [key]: value });
  const miss = (key) => missing.includes(key);
  const art = <ArtworkField contentType={contentType} draft={draft} onChange={onChange} />;
  const advanced = <AdvancedMechanics draft={draft} onChange={onChange} />;

  if (contentType === 'monster') {
    return <div style={formStackStyle}>{art}
      <FormGrid>
        <FieldRow label="Name" value={draft.name} onChange={v => upd('name', v)} missing={miss('name')} placeholder="Ashen Grave Troll" />
        <FieldRow label="Creature Type" value={draft.creature_type} onChange={v => upd('creature_type', v)} placeholder="undead, fiend, construct..." />
        <FieldRow label="Size" value={draft.size} onChange={v => upd('size', v)} />
        <FieldRow label="Alignment" value={draft.alignment} onChange={v => upd('alignment', v)} />
        <FieldRow label="Challenge Rating" value={draft.challenge_rating} onChange={v => upd('challenge_rating', v)} missing={miss('challenge_rating')} placeholder="3, 7, 12..." />
        <FieldRow label="Armour Class" value={draft.armor_class} onChange={v => upd('armor_class', Number(v) || v)} missing={miss('armor_class')} />
        <FieldRow label="Hit Points" value={draft.hit_points} onChange={v => upd('hit_points', Number(v) || v)} missing={miss('hit_points')} />
        <FieldRow label="Speed" value={draft.speed} onChange={v => upd('speed', v)} />
      </FormGrid>
      <FieldRow label="Description / Theme" value={draft.description} onChange={v => upd('description', v)} multiline />
      <JsonField label="Abilities JSON" value={draft.abilities || {}} onChange={v => upd('abilities', v)} />
      <FieldRow label="Traits" value={toLines(draft.traits)} onChange={v => upd('traits', namedFromLines(v))} multiline />
      <FieldRow label="Actions" value={toLines(draft.actions)} onChange={v => upd('actions', namedFromLines(v))} multiline missing={miss('actions')} />
      <FieldRow label="Bonus Actions" value={toLines(draft.bonus_actions)} onChange={v => upd('bonus_actions', namedFromLines(v))} multiline />
      <FieldRow label="Reactions" value={toLines(draft.reactions)} onChange={v => upd('reactions', namedFromLines(v))} multiline />
      <FieldRow label="Legendary Actions" value={toLines(draft.legendary_actions)} onChange={v => upd('legendary_actions', namedFromLines(v))} multiline />
    </div>;
  }

  if (contentType === 'npc') {
    return <div style={formStackStyle}>{art}
      <FormGrid>
        <FieldRow label="Name" value={draft.name} onChange={v => upd('name', v)} missing={miss('name')} />
        <FieldRow label="Ancestry" value={draft.ancestry} onChange={v => upd('ancestry', v)} />
        <FieldRow label="Role" value={draft.role} onChange={v => upd('role', v)} missing={miss('role')} />
        <FieldRow label="Faction" value={draft.faction} onChange={v => upd('faction', v)} />
        <FieldRow label="Location" value={draft.location} onChange={v => upd('location', v)} />
      </FormGrid>
      <FieldRow label="Appearance" value={draft.appearance} onChange={v => upd('appearance', v)} multiline />
      <FieldRow label="Personality" value={draft.personality} onChange={v => upd('personality', v)} multiline missing={miss('personality')} />
      <FieldRow label="Voice" value={draft.voice} onChange={v => upd('voice', v)} />
      <FieldRow label="Mannerisms" value={toLines(draft.mannerisms)} onChange={v => upd('mannerisms', fromLines(v))} multiline />
      <FieldRow label="Secret" value={draft.secret} onChange={v => upd('secret', v)} multiline missing={miss('secret')} />
      <FieldRow label="Quest Hooks" value={toLines(draft.quest_hooks)} onChange={v => upd('quest_hooks', fromLines(v))} multiline />
    </div>;
  }

  if (contentType === 'custom_rule') {
    return <div style={formStackStyle}>{art}
      <FormGrid><FieldRow label="Rule Name" value={draft.name} onChange={v => upd('name', v)} missing={miss('name')} /><SelectRow label="Category" value={draft.category || 'other'} onChange={v => upd('category', v)} options={CATEGORIES} /></FormGrid>
      <FieldRow label="Summary" value={draft.summary} onChange={v => upd('summary', v)} missing={miss('summary')} />
      <FieldRow label="Rule Text" value={draft.rule_text} onChange={v => upd('rule_text', v)} multiline missing={miss('rule_text')} />
      <FormGrid><FieldRow label="Trigger" value={draft.trigger} onChange={v => upd('trigger', v)} /><FieldRow label="Resolution" value={draft.resolution} onChange={v => upd('resolution', v)} /></FormGrid>
      <FieldRow label="Examples" value={toLines(draft.examples)} onChange={v => upd('examples', fromLines(v))} multiline />
      <JsonField label="Settings JSON" value={draft.settings || {}} onChange={v => upd('settings', v)} />
      <CheckRow label="Enabled by default" checked={draft.enabled_by_default} onChange={v => upd('enabled_by_default', v)} />
      <CheckRow label="Visible to players" checked={draft.player_visible} onChange={v => upd('player_visible', v)} />
      <FieldRow label="GM Notes" value={draft.gm_notes} onChange={v => upd('gm_notes', v)} multiline />
      {advanced}
    </div>;
  }

  if (contentType === 'magic_item') {
    return <div style={formStackStyle}>{art}
      <FormGrid><FieldRow label="Name" value={draft.name} onChange={v => upd('name', v)} missing={miss('name')} /><FieldRow label="Type" value={draft.type} onChange={v => upd('type', v)} /><FieldRow label="Rarity" value={draft.rarity} onChange={v => upd('rarity', v)} missing={miss('rarity')} /></FormGrid>
      <CheckRow label="Requires attunement" checked={draft.requires_attunement} onChange={v => upd('requires_attunement', v)} />
      <FieldRow label="Attunement Requirement" value={draft.attunement_requirement} onChange={v => upd('attunement_requirement', v)} />
      <FieldRow label="Description" value={draft.description} onChange={v => upd('description', v)} multiline />
      <FieldRow label="Effects" value={toLines(draft.effects)} onChange={v => upd('effects', fromLines(v))} multiline />
      <JsonField label="Charges JSON" value={draft.charges || {}} onChange={v => upd('charges', v)} />
      {advanced}
    </div>;
  }

  if (contentType === 'race') {
    return <div style={formStackStyle}>{art}
      <FormGrid><FieldRow label="Name" value={draft.name} onChange={v => upd('name', v)} missing={miss('name')} /><FieldRow label="Size" value={draft.size} onChange={v => upd('size', v)} missing={miss('size')} /><FieldRow label="Speed" value={draft.speed} onChange={v => upd('speed', Number(v) || 30)} missing={miss('speed')} /></FormGrid>
      <FieldRow label="Description" value={draft.description} onChange={v => upd('description', v)} multiline />
      <JsonField label="Ability Bonuses JSON" value={draft.ability_bonuses || {}} onChange={v => upd('ability_bonuses', v)} />
      <FieldRow label="Traits" value={toLines(draft.traits)} onChange={v => upd('traits', namedFromLines(v))} multiline />
      <FieldRow label="Languages" value={toLines(draft.languages)} onChange={v => upd('languages', fromLines(v))} multiline />
      {advanced}
    </div>;
  }

  if (contentType === 'class' || contentType === 'subclass') {
    return <div style={formStackStyle}>{art}
      <FormGrid>
        <FieldRow label="Name" value={draft.name} onChange={v => upd('name', v)} missing={miss('name')} />
        {contentType === 'class' ? <FieldRow label="Hit Die" value={draft.hit_die} onChange={v => upd('hit_die', v)} missing={miss('hit_die')} /> : <FieldRow label="Parent Class" value={draft.parent_class} onChange={v => upd('parent_class', v)} missing={miss('parent_class')} />}
        {contentType === 'subclass' && <FieldRow label="Subclass Level" value={draft.subclass_level || 3} onChange={v => upd('subclass_level', Number(v) || 3)} />}
        {contentType === 'class' && <FieldRow label="Primary Ability" value={draft.primary_ability} onChange={v => upd('primary_ability', v)} />}
      </FormGrid>
      <FieldRow label="Description" value={draft.description} onChange={v => upd('description', v)} multiline />
      {contentType === 'class' && <><FieldRow label="Saving Throws" value={toLines(draft.saving_throw_proficiencies)} onChange={v => upd('saving_throw_proficiencies', fromLines(v))} multiline /><FieldRow label="Armour Proficiencies" value={toLines(draft.armor_proficiencies)} onChange={v => upd('armor_proficiencies', fromLines(v))} multiline /><FieldRow label="Weapon Proficiencies" value={toLines(draft.weapon_proficiencies)} onChange={v => upd('weapon_proficiencies', fromLines(v))} multiline /><FieldRow label="Tool Proficiencies" value={toLines(draft.tool_proficiencies)} onChange={v => upd('tool_proficiencies', fromLines(v))} multiline /></>}
      <FieldRow label="Features (Level - Name :: description)" value={toLines(draft.features)} onChange={v => upd('features', namedFromLines(v))} multiline missing={miss('features')} />
      {advanced}
    </div>;
  }

  if (contentType === 'feat') {
    return <div style={formStackStyle}>{art}
      <FormGrid><FieldRow label="Name" value={draft.name} onChange={v => upd('name', v)} missing={miss('name')} /><FieldRow label="Prerequisite" value={draft.prerequisite} onChange={v => upd('prerequisite', v)} /><CheckRow label="Repeatable" checked={draft.repeatable} onChange={v => upd('repeatable', v)} /></FormGrid>
      <FieldRow label="Description" value={draft.description} onChange={v => upd('description', v)} multiline missing={miss('description')} />
      <FieldRow label="Benefits" value={toLines(draft.benefits)} onChange={v => upd('benefits', namedFromLines(v))} multiline missing={miss('benefits')} />
      <JsonField label="Ability Score Increase JSON" value={draft.ability_score_increase || {}} onChange={v => upd('ability_score_increase', v)} placeholder='{"choose":1,"from":["strength","dexterity"],"amount":1}' />
      {advanced}
    </div>;
  }

  if (contentType === 'spell') {
    return <div style={formStackStyle}>{art}
      <FormGrid><FieldRow label="Name" value={draft.name} onChange={v => upd('name', v)} missing={miss('name')} /><FieldRow label="Level" value={draft.level} onChange={v => upd('level', Number(v) || 0)} missing={miss('level')} /><SelectRow label="School" value={draft.school} onChange={v => upd('school', v)} options={SCHOOLS} /></FormGrid>
      <FormGrid><FieldRow label="Casting Time" value={draft.casting_time} onChange={v => upd('casting_time', v)} missing={miss('casting_time')} /><FieldRow label="Range" value={draft.range} onChange={v => upd('range', v)} /><FieldRow label="Duration" value={draft.duration} onChange={v => upd('duration', v)} /></FormGrid>
      <FieldRow label="Components" value={Array.isArray(draft.components) ? draft.components.join(', ') : draft.components} onChange={v => upd('components', v)} />
      <FormGrid><CheckRow label="Ritual" checked={draft.ritual} onChange={v => upd('ritual', v)} /><CheckRow label="Concentration" checked={draft.concentration} onChange={v => upd('concentration', v)} /></FormGrid>
      <FieldRow label="Classes" value={toLines(draft.classes)} onChange={v => upd('classes', fromLines(v))} multiline />
      <FieldRow label="Description" value={draft.description} onChange={v => upd('description', v)} multiline />
      <JsonField label="Damage JSON" value={draft.damage || {}} onChange={v => upd('damage', v)} placeholder='{"dice":"2d6","type":"fire"}' />
      <FieldRow label="Higher Level" value={draft.higher_level} onChange={v => upd('higher_level', v)} multiline />
      <FieldRow label="Effects" value={toLines(draft.effects)} onChange={v => upd('effects', fromLines(v))} multiline />
      {advanced}
    </div>;
  }

  if (contentType === 'background') {
    return <div style={formStackStyle}>{art}
      <FieldRow label="Name" value={draft.name} onChange={v => upd('name', v)} missing={miss('name')} />
      <FieldRow label="Description" value={draft.description} onChange={v => upd('description', v)} multiline />
      <FieldRow label="Skill Proficiencies" value={toLines(draft.skill_proficiencies)} onChange={v => upd('skill_proficiencies', fromLines(v))} multiline missing={miss('skill_proficiencies')} />
      <FieldRow label="Tool Proficiencies" value={toLines(draft.tool_proficiencies)} onChange={v => upd('tool_proficiencies', fromLines(v))} multiline />
      <FieldRow label="Equipment" value={toLines(draft.equipment)} onChange={v => upd('equipment', fromLines(v))} multiline />
      <FieldRow label="Feature Name" value={draft.feature_name} onChange={v => upd('feature_name', v)} />
      <FieldRow label="Feature Description" value={draft.feature_description} onChange={v => upd('feature_description', v)} multiline />
      {advanced}
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
  const [type, setType] = useState('subclass');
  const [edition, setEdition] = useState('2014');
  const [visibility, setVisibility] = useState('private');
  const [campaignId, setCampaignId] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [draft, setDraft] = useState(emptyDraft('subclass'));
  const [missing, setMissing] = useState(findMissing('subclass', emptyDraft('subclass')));
  const [library, setLibrary] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

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
    const incomingType = data?.content_type || type;
    const incomingDraft = normaliseDraft(incomingType, data?.draft || emptyDraft(incomingType));
    const nextDraft = { ...incomingDraft, image_url: incomingDraft.image_url || draft.image_url || '' };
    const nextMissing = data?.missing_fields || findMissing(incomingType, nextDraft);
    if (incomingType !== type) setType(incomingType);
    setDraft(nextDraft);
    setMissing(nextMissing);
    setEditingId(null);
    if (nextMissing.length) toast.warning(`${successText} ${nextMissing.length} field${nextMissing.length === 1 ? '' : 's'} still need attention.`);
    else toast.success(successText);
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const response = await apiClient.get(`/homebrew/template/${type}?edition=${edition}`, { responseType: 'blob' });
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'text/markdown' });
      const href = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = `rook-homebrew-${type}-${edition}.md`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(href);
      toast.success('Template downloaded');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not download template');
    } finally {
      setDownloading(false);
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(docx|txt|md|markdown)$/i.test(file.name)) {
      toast.error('Please upload a .docx, .txt, .md, or .markdown file');
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
    } catch (error) { toast.error(error?.response?.data?.detail || 'Could not parse text'); } finally { setParsing(false); }
  };

  const handleCompleteDraft = async () => {
    setCompleting(true);
    try {
      const { data } = await apiClient.post('/homebrew/complete-draft', { content_type: type, edition, draft, context: pasteText });
      applyDraftResponse(data, 'Rook filled the draft gaps.');
    } catch (error) { toast.error(error?.response?.data?.detail || 'Rook could not complete the draft'); } finally { setCompleting(false); }
  };

  const handleSave = async () => {
    if (!draft.name?.trim()) {
      toast.error('Name is required before saving');
      return;
    }
    if (visibility === 'campaign' && !campaignId.trim()) {
      toast.error('Campaign visibility needs a campaign ID');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/homebrew/save', { content_type: type, edition, visibility, campaign_id: campaignId || undefined, data: draft, homebrew_id: editingId || undefined });
      toast.success(editingId ? 'Homebrew updated' : 'Saved to your library');
      reset(type);
      fetchLibrary();
    } catch (error) { toast.error(error?.response?.data?.detail || 'Save failed'); } finally { setSaving(false); }
  };

  const handleEdit = (item) => {
    const next = normaliseDraft(type, item);
    setDraft(next);
    setMissing(findMissing(type, next));
    setEditingId(item.id);
    setVisibility(item.visibility || 'private');
    setCampaignId(item.campaign_id || item.campaignId || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete homebrew "${item.name}"?`)) return;
    try {
      await apiClient.delete(`/homebrew/${type}/${item.id}`);
      toast.success('Deleted');
      fetchLibrary();
      if (editingId === item.id) reset(type);
    } catch (error) { toast.error(error?.response?.data?.detail || 'Delete failed'); }
  };

  return <main style={pageStyle} data-testid="homebrew-workshop">
    <section style={wrapStyle}>
      <header style={headerStyle}>
        <button type="button" onClick={() => navigate('/home')} style={secondaryButtonStyle} data-testid="hb-back-btn"><ArrowLeft size={15} /> Back</button>
        <div style={{ minWidth: 0, flex: 1 }}><p style={eyebrowStyle}>Rook-assisted creation</p><h1 style={titleStyle}><Sparkles size={28} /> Homebrew Workshop</h1><p style={subtitleStyle}>Download a fillable template, write your class, feat, subclass, species, spell, item, monster, NPC, or custom rule, then upload it back. Rook parses it into structured fields that can flow into builders and sheets.</p></div>
        <select value={edition} onChange={event => setEdition(event.target.value)} style={selectButtonStyle} data-testid="hb-edition"><option value="2014">2014 Rules</option><option value="2024">2024 Rules</option></select>
      </header>

      <section style={typeGridStyle}>{TYPES.map(item => { const Icon = item.icon; const active = type === item.key; return <button key={item.key} type="button" onClick={() => switchType(item.key)} style={typeCardStyle(active)} data-testid={`hb-type-${item.key}`}><Icon size={18} /><strong>{item.label}</strong><span>{item.help}</span></button>; })}</section>

      <section style={builderGridStyle}>
        <aside style={panelStyle}>
          <h2 style={sectionTitleStyle}><Wand2 size={17} /> Source / Rook input</h2>
          <p style={helpStyle}>Start with a template, upload a file, paste rough notes, or type directly into the draft. Rook can parse or complete the missing parts. Artwork is added inside the draft panel.</p>
          <button type="button" onClick={handleDownloadTemplate} disabled={downloading} style={downloadButtonStyle} data-testid="hb-download-template-btn">{downloading ? <Loader2 size={16} className="rq-spin" /> : <Download size={16} />} Download {currentMeta.label} template</button>
          <label htmlFor="hb-file-input" style={uploadStyle} data-testid="hb-upload-label">{parsing ? <Loader2 size={17} className="rq-spin" /> : <Upload size={17} />} {parsing ? 'Rook is reading…' : 'Upload .docx, .txt, .md, or .markdown'}<input id="hb-file-input" ref={fileInputRef} type="file" accept=".docx,.txt,.md,.markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFile} disabled={parsing} data-testid="hb-file-input" style={{ display: 'none' }} /></label>
          <textarea value={pasteText} onChange={event => setPasteText(event.target.value)} placeholder={`Paste ${formatType(type).toLowerCase()} notes, theme, mechanics, or half-written ideas here...`} style={{ ...inputStyle, minHeight: 165, resize: 'vertical' }} data-testid="hb-paste-text" />
          <div style={actionRowStyle}><button type="button" onClick={handleParseText} disabled={parsing || !pasteText.trim()} style={primaryButtonStyle} data-testid="hb-parse-text-btn">{parsing ? <Loader2 size={15} className="rq-spin" /> : <Bot size={15} />} Parse with Rook</button><button type="button" onClick={handleCompleteDraft} disabled={completing} style={secondaryButtonStyle} data-testid="hb-complete-draft-btn">{completing ? <Loader2 size={15} className="rq-spin" /> : <Sparkles size={15} />} Ask Rook to Fill Gaps</button></div>
          <div style={tipStyle}><strong>Power tip:</strong> write formulas like “Scarab Charges = Warlock level” or “Greed Tokens = proficiency bonus, GM adjustable”. Rook will try to preserve those as sheet resources.</div>
        </aside>

        <section style={panelStyle}>
          <div style={draftHeaderStyle}><div><h2 style={sectionTitleStyle}>{editingId ? 'Editing' : 'Draft'} · {currentMeta.label}</h2><p style={helpStyle}>{currentMeta.help}</p></div>{shownMissing.length > 0 && <span style={missingPillStyle}><AlertTriangle size={14} /> {shownMissing.length} missing</span>}</div>
          <DraftEditor contentType={type} draft={draft} missing={shownMissing} onChange={setDraft} />
          <section style={saveOptionsStyle}>
            <SelectRow label="Visibility" value={visibility} onChange={setVisibility} options={['private', 'campaign', 'shared_copy', 'public']} />
            {visibility === 'campaign' && <FieldRow label="Campaign ID" value={campaignId} onChange={setCampaignId} placeholder="Paste the campaign ID to share with that campaign" />}
          </section>
          <div style={footerActionsStyle}><button type="button" onClick={() => reset(type)} style={secondaryButtonStyle}><RefreshCw size={15} /> Clear</button><button type="button" onClick={handleCompleteDraft} disabled={completing} style={secondaryButtonStyle}><Sparkles size={15} /> Fill Missing</button><button type="button" onClick={handleSave} disabled={saving || !draft.name} style={primaryButtonStyle} data-testid="hb-save-btn">{saving ? <Loader2 size={15} className="rq-spin" /> : <Save size={15} />} {editingId ? 'Update' : 'Save to Library'}</button></div>
        </section>
      </section>

      <section style={libraryStyle}>
        <div style={libraryHeaderStyle}><h2 style={sectionTitleStyle}>My {currentMeta.label} Library <span style={countStyle}>({items.length})</span></h2><span style={helpStyle}>Saved homebrew is stored in your Homebrew Workshop library and can be loaded by builder integrations.</span></div>
        {items.length === 0 ? <p style={emptyStyle}>No saved {currentMeta.label.toLowerCase()} yet.</p> : <div style={libraryGridStyle}>{items.map(item => <LibraryCard key={item.id} item={item} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />)}</div>}
      </section>
    </section>
  </main>;
}

function LibraryCard({ item, onEdit, onDelete }) {
  const img = item.image_url || item.image || item.portrait_url || item.avatar_url || '';
  return <article style={libraryCardStyle}>{img && <img src={img} alt="" style={libraryImageStyle} />}<div><strong>{item.name || 'Untitled'}</strong><p>{item.summary || item.description || item.role || item.creature_type || item.category || item.school || item.prerequisite || 'No description yet.'}</p><small>{item.visibility || 'private'} · {item.edition || '2014'}</small></div><div style={cardActionsStyle}><button type="button" onClick={onEdit} style={smallButtonStyle}>Edit</button><button type="button" onClick={onDelete} style={smallButtonStyle}><Trash2 size={13} /> Delete</button></div></article>;
}

const pageStyle = { minHeight: '100dvh', background: rq.bg, color: rq.text, fontFamily: fontStack, padding: 'clamp(12px, 2vw, 24px)' };
const wrapStyle = { maxWidth: 1240, margin: '0 auto', display: 'grid', gap: 14 };
const headerStyle = { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: rq.panel, border: `1px solid ${rq.line}`, padding: 14 };
const eyebrowStyle = { margin: '0 0 4px', color: rq.red, fontSize: 11, fontWeight: 950, letterSpacing: '0.12em', textTransform: 'uppercase' };
const titleStyle = { margin: 0, color: rq.text, fontFamily: titleFont, fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 0.92, display: 'flex', alignItems: 'center', gap: 10 };
const subtitleStyle = { margin: '8px 0 0', color: rq.soft, lineHeight: 1.45, maxWidth: 900 };
const typeGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 };
const typeCardStyle = (active) => ({ display: 'grid', gap: 6, minHeight: 104, textAlign: 'left', background: active ? rq.red : rq.card, color: rq.text, border: `1px solid ${active ? rq.red : rq.line}`, padding: 12, cursor: 'pointer', fontFamily: fontStack });
const builderGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(min(360px, 100%), 0.82fr) minmax(min(420px, 100%), 1.18fr)', gap: 12 };
const panelStyle = { background: rq.panel, border: `1px solid ${rq.line}`, padding: 14, minWidth: 0 };
const sectionTitleStyle = { margin: 0, color: rq.text, fontSize: 16, fontWeight: 950, display: 'flex', gap: 8, alignItems: 'center' };
const helpStyle = { margin: '6px 0 0', color: rq.muted, fontSize: 12, lineHeight: 1.45 };
const uploadStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 58, marginTop: 10, marginBottom: 10, background: rq.card, border: `1px dashed ${rq.line}`, color: rq.text, fontWeight: 900, cursor: 'pointer' };
const inputStyle = { width: '100%', background: rq.bg, color: rq.text, border: `1px solid ${rq.line}`, padding: '9px 10px', outline: 'none', borderRadius: 0, fontFamily: fontStack, colorScheme: 'dark' };
const fieldStyle = { display: 'grid', gap: 5, color: rq.muted, fontSize: 11, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase' };
const formStackStyle = { display: 'grid', gap: 11 };
const formGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 };
const checkRowStyle = { display: 'flex', alignItems: 'center', gap: 8, color: rq.soft, fontWeight: 850, minHeight: 34 };
const actionRowStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 };
const primaryButtonStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 38, border: `1px solid ${rq.red}`, background: rq.red, color: rq.text, padding: '0 12px', fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 38, border: `1px solid ${rq.line}`, background: rq.card, color: rq.text, padding: '0 12px', fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const downloadButtonStyle = { ...secondaryButtonStyle, width: '100%', marginTop: 12 };
const selectButtonStyle = { ...secondaryButtonStyle, minWidth: 132 };
const tipStyle = { marginTop: 10, color: rq.soft, background: rq.bg, border: `1px solid ${rq.line}`, padding: 10, fontSize: 12, lineHeight: 1.45 };
const advancedStyle = { display: 'grid', gap: 10, padding: 12, background: rq.bg, border: `1px solid ${rq.line}` };
const advancedHeaderStyle = { display: 'flex', alignItems: 'center', gap: 8, color: rq.text, fontWeight: 950 };
const draftHeaderStyle = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 };
const missingPillStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, color: rq.warn, border: `1px solid ${rq.warn}`, padding: '5px 8px', fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap' };
const saveOptionsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${rq.line}` };
const footerActionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${rq.line}` };
const libraryStyle = { background: rq.panel, border: `1px solid ${rq.line}`, padding: 14 };
const libraryHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 };
const countStyle = { color: rq.muted, fontSize: 12 };
const emptyStyle = { color: rq.muted, margin: 0 };
const libraryGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 };
const libraryCardStyle = { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, background: rq.card, border: `1px solid ${rq.line}`, padding: 10, minWidth: 0 };
const libraryImageStyle = { width: 74, height: 74, objectFit: 'cover', border: `1px solid ${rq.line}` };
const cardActionsStyle = { gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' };
const smallButtonStyle = { ...secondaryButtonStyle, minHeight: 30, padding: '0 9px', fontSize: 12 };
