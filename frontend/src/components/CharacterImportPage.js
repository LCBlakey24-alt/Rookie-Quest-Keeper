import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, FileText, RefreshCw, Save, UploadCloud, Wand2 } from 'lucide-react';

import apiClient from '@/lib/apiClient';

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const ABILITY_LABELS = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
};

const DEFAULT_IMPORT = {
  name: '',
  race: 'Human',
  subrace: '',
  character_class: 'Fighter',
  subclass: '',
  background: 'Custom',
  level: 1,
  edition: '2014',
  hit_die: 'd8',
  armor_class: 10,
  speed: 30,
  max_hit_points: 10,
  current_hit_points: 10,
  temporary_hit_points: 0,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  skills_text: '',
  saving_throws_text: '',
  languages_text: '',
  racial_traits_text: '',
  class_features_text: '',
  feats_text: '',
  equipment_text: '',
  spells_text: '',
  cantrips_text: '',
  backstory: '',
  source_file_name: '',
  source_warning: '',
};

const fieldAliases = {
  name: ['name', 'charactername', 'character'],
  race: ['race', 'species', 'ancestry'],
  subrace: ['subrace', 'subspecies', 'lineage'],
  character_class: ['class', 'characterclass', 'character_class'],
  subclass: ['subclass', 'archetype', 'patron', 'domain', 'path', 'college', 'circle'],
  background: ['background', 'origin'],
  level: ['level', 'lvl'],
  armor_class: ['ac', 'armorclass', 'armourclass'],
  speed: ['speed', 'movement'],
  max_hit_points: ['maxhp', 'hitpoints', 'hitpointmaximum', 'maximumhp', 'hpmax'],
  current_hit_points: ['currenthp', 'hp', 'currenthitpoints'],
  temporary_hit_points: ['temphp', 'temporaryhp', 'temporaryhitpoints'],
  skills_text: ['skills', 'skillproficiencies', 'skillprofs'],
  saving_throws_text: ['savingthrows', 'saves', 'savingthrowproficiencies'],
  languages_text: ['languages'],
  racial_traits_text: ['traits', 'racialtraits', 'speciestraits'],
  class_features_text: ['features', 'classfeatures'],
  feats_text: ['feats'],
  equipment_text: ['equipment', 'inventory', 'items'],
  spells_text: ['spells', 'spellsknown', 'spellsprepared'],
  cantrips_text: ['cantrips', 'cantripsknown'],
  backstory: ['backstory', 'notes', 'personality'],
};

const numberOr = (value, fallback) => {
  const found = Number.parseInt(String(value ?? '').replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(found) ? found : fallback;
};

const normaliseKey = (key) => String(key || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
const cleanText = (value) => Array.isArray(value) ? value.join('\n') : String(value ?? '').trim();

function toLookup(source = {}) {
  const lookup = {};
  Object.entries(source || {}).forEach(([key, value]) => {
    lookup[normaliseKey(key)] = value;
  });
  return lookup;
}

function firstValue(lookup, aliases, fallback = '') {
  for (const alias of aliases || []) {
    const key = normaliseKey(alias);
    if (lookup[key] !== undefined && lookup[key] !== null && lookup[key] !== '') return lookup[key];
  }
  return fallback;
}

function parseKeyValueText(text) {
  const out = {};
  String(text || '').split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([^:=\-]{2,45})\s*[:=\-]\s*(.+?)\s*$/);
    if (!match) return;
    out[normaliseKey(match[1])] = match[2].trim();
  });
  return out;
}

function parseJsonOrText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return parseKeyValueText(trimmed);
  }
}

function scoreFrom(source = {}, lookup = {}, ability) {
  const short = ABILITY_LABELS[ability].toLowerCase();
  const abilitySources = [
    source?.abilities,
    source?.ability_scores,
    source?.stats,
    source?.scores,
  ].filter(Boolean);

  for (const block of abilitySources) {
    const blockLookup = toLookup(block);
    const found = firstValue(blockLookup, [ability, short], undefined);
    if (found !== undefined) return numberOr(found, 10);
  }

  return numberOr(firstValue(lookup, [ability, short], 10), 10);
}

function listFrom(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => typeof item === 'string' ? item : item?.name || item?.title || '')
      .map((item) => String(item).trim())
      .filter(Boolean);
  }
  return String(value || '')
    .split(/\r?\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function featureEntries(value, source = 'import') {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return { name: item, description: `Imported ${source}.` };
      return {
        name: item?.name || item?.title || `Imported ${source}`,
        description: item?.description || item?.text || item?.summary || `Imported ${source}.`,
        level: item?.level,
        source,
      };
    }).filter((item) => item.name);
  }
  return listFrom(value).map((name) => ({ name, description: `Imported ${source}.`, source }));
}

function spellEntries(value, fallbackLevel = 1) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return { name: item, level: fallbackLevel };
      return {
        ...item,
        name: item?.name || item?.title || 'Imported spell',
        level: Number(item?.level ?? fallbackLevel),
      };
    }).filter((item) => item.name);
  }
  return listFrom(value).map((name) => ({ name, level: fallbackLevel }));
}

function deriveImport(source, sourceFileName = '') {
  const lookup = toLookup(source);
  const next = { ...DEFAULT_IMPORT, source_file_name: sourceFileName };

  Object.entries(fieldAliases).forEach(([field, aliases]) => {
    const found = firstValue(lookup, aliases, undefined);
    if (found !== undefined) next[field] = cleanText(found);
  });

  ABILITIES.forEach((ability) => {
    next[ability] = scoreFrom(source, lookup, ability);
  });

  next.level = Math.max(1, Math.min(30, numberOr(next.level, 1)));
  next.edition = String(firstValue(lookup, ['edition', 'rulesedition', 'rules_edition', 'ruleset'], next.edition)).includes('2024') ? '2024' : '2014';
  next.armor_class = numberOr(next.armor_class, 10);
  next.speed = numberOr(next.speed, 30);
  next.max_hit_points = Math.max(1, numberOr(next.max_hit_points, 10));
  next.current_hit_points = Math.max(0, numberOr(next.current_hit_points, next.max_hit_points));
  next.temporary_hit_points = Math.max(0, numberOr(next.temporary_hit_points, 0));

  const hitDie = firstValue(lookup, ['hitdie', 'hitdice', 'hit_die'], next.hit_die);
  const hitDieMatch = String(hitDie || '').match(/d(6|8|10|12)/i);
  next.hit_die = hitDieMatch ? `d${hitDieMatch[1]}` : next.hit_die;

  return next;
}

function buildPayload(character) {
  const level = Math.max(1, Math.min(30, numberOr(character.level, 1)));
  const hitDie = String(character.hit_die || 'd8').replace(/^d?/i, 'd');
  const inventory = listFrom(character.equipment_text).map((name) => ({ name, equipped: false, source: 'import' }));
  const sourceNote = character.source_file_name
    ? `\n\nImported from player upload: ${character.source_file_name}. ${character.source_warning || ''}`.trim()
    : '';

  return {
    name: character.name.trim(),
    creation_mode: 'imported',
    race: character.race.trim() || 'Custom',
    subrace: character.subrace.trim(),
    character_class: character.character_class.trim() || 'Custom Class',
    subclass: character.subclass.trim(),
    background: character.background.trim() || 'Custom',
    edition: character.edition === '2024' ? '2024' : '2014',
    rules_edition: character.edition === '2024' ? '2024' : '2014',
    ruleset_id: character.edition === '2024' ? 'dnd5e_2024' : 'dnd5e_2014',
    level,
    strength: numberOr(character.strength, 10),
    dexterity: numberOr(character.dexterity, 10),
    constitution: numberOr(character.constitution, 10),
    intelligence: numberOr(character.intelligence, 10),
    wisdom: numberOr(character.wisdom, 10),
    charisma: numberOr(character.charisma, 10),
    armor_class: numberOr(character.armor_class, 10),
    speed: numberOr(character.speed, 30),
    max_hit_points: Math.max(1, numberOr(character.max_hit_points, 10)),
    current_hit_points: Math.max(0, numberOr(character.current_hit_points, character.max_hit_points || 10)),
    temporary_hit_points: Math.max(0, numberOr(character.temporary_hit_points, 0)),
    temp_hp: Math.max(0, numberOr(character.temporary_hit_points, 0)),
    hit_dice: `${level}${hitDie}`,
    hit_dice_remaining: level,
    skill_proficiencies: listFrom(character.skills_text),
    saving_throw_proficiencies: listFrom(character.saving_throws_text),
    languages: listFrom(character.languages_text),
    racial_traits: featureEntries(character.racial_traits_text, 'race/species trait'),
    class_features: featureEntries(character.class_features_text, 'class feature'),
    feats: featureEntries(character.feats_text, 'feat'),
    spells_known: spellEntries(character.spells_text, 1),
    spells_prepared: spellEntries(character.spells_text, 1),
    cantrips_known: spellEntries(character.cantrips_text, 0),
    starting_equipment: listFrom(character.equipment_text),
    equipment: inventory,
    inventory,
    equipped: {},
    currency: { copper: 0, silver: 0, electrum: 0, gold: 0, platinum: 0 },
    gold: 0,
    backstory: [character.backstory, sourceNote].filter(Boolean).join('\n\n'),
    notes: sourceNote,
  };
}

function TextField({ label, value, onChange, type = 'text', multiline = false, placeholder = '' }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <label style={styles.field}>
      <span>{label}</span>
      <Tag
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{ ...styles.input, minHeight: multiline ? 84 : 40, resize: multiline ? 'vertical' : undefined }}
      />
    </label>
  );
}

function NumberField({ label, value, onChange }) {
  return <TextField label={label} value={value} type="number" onChange={(next) => onChange(numberOr(next, 0))} />;
}

export default function CharacterImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [rawText, setRawText] = useState('');
  const [character, setCharacter] = useState(DEFAULT_IMPORT);
  const [saving, setSaving] = useState(false);

  const payloadPreview = useMemo(() => buildPayload(character), [character]);
  const canSave = Boolean(character.name.trim() && character.race.trim() && character.character_class.trim());

  const update = (field, value) => setCharacter((prev) => ({ ...prev, [field]: value }));

  const applyRawText = (text, sourceFileName = '') => {
    const parsed = parseJsonOrText(text);
    const derived = deriveImport(parsed, sourceFileName);
    setCharacter((prev) => ({ ...prev, ...derived }));
    toast.success('Character details pulled into the importer');
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const canReadAsText = lowerName.endsWith('.json') || lowerName.endsWith('.txt') || lowerName.endsWith('.md') || file.type.startsWith('text/');

    if (!canReadAsText) {
      setCharacter((prev) => ({
        ...prev,
        source_file_name: file.name,
        source_warning: 'PDF/image parsing is not automated yet; core fields were entered manually from the upload screen.',
      }));
      toast.info('PDF/image received. Fill the core fields manually, then save the character.');
      return;
    }

    const text = await file.text();
    setRawText(text);
    applyRawText(text, file.name);
  };

  const reset = () => {
    setRawText('');
    setCharacter(DEFAULT_IMPORT);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveCharacter = async () => {
    if (!canSave || saving) {
      toast.error('Name, race/species, and class are required before saving.');
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.post('/characters', payloadPreview);
      const id = response.data?.character_id || response.data?.character?.id || response.data?.id;
      toast.success('Imported character saved');
      navigate(id ? `/characters/${id}` : '/characters');
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not save imported character');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <button type="button" onClick={() => navigate('/characters')} style={styles.ghostButton}>
          <ArrowLeft size={16} color="#7CCBFF" /> Characters
        </button>
        <div>
          <p style={styles.eyebrow}>Player tools</p>
          <h1 style={styles.title}>Import or free-build a character</h1>
          <p style={styles.subtitle}>Bring in an existing sheet, paste text/JSON, or manually enter a homebrew character without being boxed into the standard builder.</p>
        </div>
      </header>

      <section style={styles.notice}>
        <Wand2 size={19} color="#7CCBFF" />
        <div>
          <strong style={styles.sectionTitle}>Homebrew-friendly path</strong>
          <p style={styles.bodyCopy}>Race/species, class, subclass, feats, traits, spells, equipment, and features are saved as written. This is the safer route for custom classes and uploaded sheets while the guided builder catches up.</p>
        </div>
      </section>

      <section style={styles.gridTwo}>
        <article style={styles.card}>
          <div style={styles.cardHeader}>
            <UploadCloud size={22} color="#7CCBFF" />
            <div>
              <h2 style={styles.sectionTitle}>Upload a sheet file</h2>
              <p style={styles.bodyCopy}>JSON, TXT, and MD can be read automatically. PDF/images can be received as the source file and filled manually for now.</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt,.md,.pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFile}
            style={styles.fileInput}
          />
          {character.source_file_name && <p style={styles.fileNote}><FileText size={14} color="#7CCBFF" /> Source: {character.source_file_name}</p>}
        </article>

        <article style={styles.card}>
          <div style={styles.cardHeader}>
            <FileText size={22} color="#7CCBFF" />
            <div>
              <h2 style={styles.sectionTitle}>Paste sheet text</h2>
              <p style={styles.bodyCopy}>Works best with JSON or lines like <em>Name: Javen</em>, <em>Class: Warlock</em>, <em>STR: 11</em>.</p>
            </div>
          </div>
          <textarea value={rawText} onChange={(event) => setRawText(event.target.value)} placeholder="Paste sheet text or JSON here..." style={{ ...styles.input, minHeight: 120, resize: 'vertical' }} />
          <div style={styles.rowActions}>
            <button type="button" onClick={() => applyRawText(rawText)} style={styles.primaryButton}>Use pasted text</button>
            <button type="button" onClick={reset} style={styles.secondaryButton}><RefreshCw size={15} color="#7CCBFF" /> Reset</button>
          </div>
        </article>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Core character</h2>
        <div style={styles.formGrid}>
          <TextField label="Character name" value={character.name} onChange={(value) => update('name', value)} placeholder="Name" />
          <TextField label="Race / Species" value={character.race} onChange={(value) => update('race', value)} />
          <TextField label="Subrace / Lineage" value={character.subrace} onChange={(value) => update('subrace', value)} />
          <TextField label="Class" value={character.character_class} onChange={(value) => update('character_class', value)} />
          <TextField label="Subclass" value={character.subclass} onChange={(value) => update('subclass', value)} />
          <TextField label="Background" value={character.background} onChange={(value) => update('background', value)} />
          <NumberField label="Level" value={character.level} onChange={(value) => update('level', Math.max(1, Math.min(30, value)))} />
          <label style={styles.field}>
            <span>Rules edition</span>
            <select value={character.edition} onChange={(event) => update('edition', event.target.value)} style={styles.input}>
              <option value="2014">2014</option>
              <option value="2024">2024</option>
            </select>
          </label>
          <label style={styles.field}>
            <span>Hit die</span>
            <select value={character.hit_die} onChange={(event) => update('hit_die', event.target.value)} style={styles.input}>
              <option value="d6">d6</option>
              <option value="d8">d8</option>
              <option value="d10">d10</option>
              <option value="d12">d12</option>
            </select>
          </label>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Stats and combat basics</h2>
        <div style={styles.abilityGrid}>
          {ABILITIES.map((ability) => (
            <NumberField key={ability} label={ABILITY_LABELS[ability]} value={character[ability]} onChange={(value) => update(ability, value)} />
          ))}
        </div>
        <div style={styles.formGrid}>
          <NumberField label="Armour Class" value={character.armor_class} onChange={(value) => update('armor_class', value)} />
          <NumberField label="Speed" value={character.speed} onChange={(value) => update('speed', value)} />
          <NumberField label="Max HP" value={character.max_hit_points} onChange={(value) => update('max_hit_points', Math.max(1, value))} />
          <NumberField label="Current HP" value={character.current_hit_points} onChange={(value) => update('current_hit_points', Math.max(0, value))} />
          <NumberField label="Temp HP" value={character.temporary_hit_points} onChange={(value) => update('temporary_hit_points', Math.max(0, value))} />
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Homebrew, features, and play data</h2>
        <div style={styles.gridTwo}>
          <TextField label="Skills" value={character.skills_text} onChange={(value) => update('skills_text', value)} multiline placeholder="Athletics, Perception..." />
          <TextField label="Saving throws" value={character.saving_throws_text} onChange={(value) => update('saving_throws_text', value)} multiline placeholder="strength, constitution..." />
          <TextField label="Languages" value={character.languages_text} onChange={(value) => update('languages_text', value)} multiline />
          <TextField label="Race/species traits" value={character.racial_traits_text} onChange={(value) => update('racial_traits_text', value)} multiline />
          <TextField label="Class/subclass features" value={character.class_features_text} onChange={(value) => update('class_features_text', value)} multiline />
          <TextField label="Feats" value={character.feats_text} onChange={(value) => update('feats_text', value)} multiline />
          <TextField label="Equipment / inventory" value={character.equipment_text} onChange={(value) => update('equipment_text', value)} multiline />
          <TextField label="Cantrips" value={character.cantrips_text} onChange={(value) => update('cantrips_text', value)} multiline />
          <TextField label="Spells" value={character.spells_text} onChange={(value) => update('spells_text', value)} multiline />
          <TextField label="Backstory / notes" value={character.backstory} onChange={(value) => update('backstory', value)} multiline />
        </div>
      </section>

      <section style={styles.footerCard}>
        <div>
          <strong style={styles.sectionTitle}>{canSave ? 'Ready to save' : 'Needs name, race/species, and class'}</strong>
          <p style={styles.bodyCopy}>Preview: {payloadPreview.name || 'Unnamed'} • {payloadPreview.race} • {payloadPreview.character_class} • Level {payloadPreview.level}</p>
        </div>
        <button type="button" onClick={saveCharacter} disabled={saving || !canSave} style={{ ...styles.primaryButton, opacity: saving || !canSave ? 0.55 : 1 }}>
          <Save size={16} color="#7CCBFF" /> {saving ? 'Saving…' : 'Save Imported Character'}
        </button>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    boxSizing: 'border-box',
    padding: 'clamp(10px, 2.5vw, 24px)',
    background: '#071522',
    color: '#FFFFFF',
    fontFamily: 'var(--rq-body-font, Manrope, Inter, system-ui, sans-serif)',
  },
  header: {
    display: 'grid',
    gap: 10,
    maxWidth: 1180,
    margin: '0 auto 10px',
    padding: 'clamp(10px, 2vw, 14px)',
    background: '#0C2234',
    border: '1px solid rgba(255,45,170,.18)',
    borderRadius: 7,
  },
  eyebrow: {
    margin: 0,
    color: '#FFFFFF',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    fontSize: 10,
    fontWeight: 900,
  },
  title: {
    margin: '2px 0 5px',
    fontSize: 'clamp(1.75rem, 4vw, 2.45rem)',
    lineHeight: 1.02,
    fontFamily: 'inherit',
    fontWeight: 900,
    letterSpacing: '-0.025em',
    color: '#FFFFFF',
  },
  subtitle: {
    margin: 0,
    maxWidth: 820,
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 1.45,
  },
  gridTwo: {
    width: 'min(1180px, 100%)',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
    gap: 8,
  },
  card: {
    width: 'min(1180px, 100%)',
    boxSizing: 'border-box',
    margin: '0 auto 8px',
    background: '#102B40',
    border: '1px solid rgba(255,45,170,.18)',
    borderRadius: 7,
    padding: 'clamp(10px, 2vw, 13px)',
    boxShadow: 'none',
  },
  notice: {
    width: 'min(1180px, 100%)',
    boxSizing: 'border-box',
    display: 'flex',
    gap: 9,
    alignItems: 'flex-start',
    margin: '0 auto 8px',
    background: 'rgba(124,203,255,.08)',
    border: '1px solid rgba(255,45,170,.18)',
    borderRadius: 7,
    padding: 11,
  },
  cardHeader: {
    display: 'flex',
    gap: 9,
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sectionTitle: {
    display: 'block',
    margin: '0 0 5px',
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 1.2,
    fontWeight: 900,
    fontFamily: 'inherit',
  },
  bodyCopy: {
    margin: 0,
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 1.45,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
    gap: 8,
  },
  abilityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))',
    gap: 7,
    marginBottom: 8,
  },
  field: {
    display: 'grid',
    gap: 4,
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 1.2,
    fontWeight: 850,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: 5,
    border: '1px solid rgba(255,45,170,.18)',
    background: '#081B2A',
    color: '#FFFFFF',
    padding: '8px 9px',
    font: 'inherit',
    outline: 'none',
    boxShadow: 'none',
  },
  fileInput: {
    width: '100%',
    boxSizing: 'border-box',
    padding: 9,
    borderRadius: 5,
    border: '1px dashed rgba(255,45,170,.32)',
    background: '#081B2A',
    color: '#FFFFFF',
  },
  fileNote: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    margin: '8px 0 0',
    color: '#FFFFFF',
    fontSize: 11,
  },
  rowActions: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  primaryButton: {
    minHeight: 40,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    border: '1px solid #FF2DAA',
    borderRadius: 5,
    padding: '0 11px',
    background: '#102B40',
    color: '#FFFFFF',
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: 'none',
  },
  secondaryButton: {
    minHeight: 40,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    border: '1px solid rgba(255,45,170,.18)',
    borderRadius: 5,
    padding: '0 11px',
    background: '#102B40',
    color: '#FFFFFF',
    fontWeight: 850,
    cursor: 'pointer',
    boxShadow: 'none',
  },
  ghostButton: {
    justifySelf: 'start',
    minHeight: 38,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    border: '1px solid rgba(255,45,170,.18)',
    borderRadius: 5,
    padding: '0 10px',
    background: '#102B40',
    color: '#FFFFFF',
    fontWeight: 850,
    cursor: 'pointer',
    boxShadow: 'none',
  },
  footerCard: {
    position: 'sticky',
    bottom: 8,
    width: 'min(1180px, 100%)',
    boxSizing: 'border-box',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
    background: '#0C2234',
    border: '1px solid rgba(255,45,170,.28)',
    borderRadius: 7,
    padding: 10,
    boxShadow: 'none',
  },
};