import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  LoaderCircle,
  RefreshCw,
  Save,
  UploadCloud,
  Wand2,
} from 'lucide-react';

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
  race: '',
  subrace: '',
  character_class: '',
  subclass: '',
  background: '',
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

const EMPTY_SCAN = {
  status: 'idle',
  confidence: null,
  warnings: [],
  needsReview: [],
  message: '',
};

const fieldAliases = {
  name: ['name', 'charactername', 'character_name', 'character'],
  race: ['race', 'species', 'ancestry'],
  subrace: ['subrace', 'subspecies', 'lineage'],
  character_class: ['class', 'characterclass', 'character_class'],
  subclass: ['subclass', 'archetype', 'patron', 'domain', 'path', 'college', 'circle'],
  background: ['background', 'origin'],
  level: ['level', 'lvl'],
  armor_class: ['ac', 'armorclass', 'armor_class', 'armourclass'],
  speed: ['speed', 'movement'],
  max_hit_points: ['maxhp', 'max_hp', 'hitpoints', 'hitpointmaximum', 'maximumhp', 'hpmax'],
  current_hit_points: ['currenthp', 'current_hp', 'hp', 'currenthitpoints'],
  temporary_hit_points: ['temphp', 'temp_hp', 'temporaryhp', 'temporaryhitpoints'],
  skills_text: ['skills', 'skills_text', 'skillproficiencies', 'skillprofs'],
  saving_throws_text: ['savingthrows', 'saving_throws', 'saving_throws_text', 'saves', 'savingthrowproficiencies'],
  languages_text: ['languages', 'languages_text'],
  racial_traits_text: ['traits', 'racialtraits', 'racial_traits', 'racial_traits_text', 'speciestraits'],
  class_features_text: ['features', 'classfeatures', 'class_features', 'class_features_text'],
  feats_text: ['feats', 'feats_text'],
  equipment_text: ['equipment', 'inventory', 'items', 'equipment_text'],
  spells_text: ['spells', 'spellsknown', 'spellsprepared', 'spells_text'],
  cantrips_text: ['cantrips', 'cantripsknown', 'cantrips_text'],
  backstory: ['backstory', 'notes', 'personality'],
};

const numberOr = (value, fallback) => {
  const found = Number.parseInt(String(value ?? '').replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(found) ? found : fallback;
};

const normaliseKey = (key) => String(key || '').toLowerCase().replace(/[^a-z0-9_]/g, '');

function listFrom(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        return item?.name || item?.title || item?.label || item?.description || '';
      })
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (value && typeof value === 'object') {
    return Object.values(value)
      .map((item) => typeof item === 'string' ? item : item?.name || item?.title || '')
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return String(value || '')
    .split(/\r?\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanText(value) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return listFrom(value).join('\n');
  return String(value ?? '').trim();
}

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

function unwrapCharacterSource(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
  const candidates = [source.character, source.data, source.character_data, source.characterData];
  return candidates.find((item) => item && typeof item === 'object' && !Array.isArray(item)) || source;
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
    return unwrapCharacterSource(parsed);
  } catch {
    return parseKeyValueText(trimmed);
  }
}

function scoreFrom(source = {}, lookup = {}, ability) {
  const short = ABILITY_LABELS[ability].toLowerCase();
  const abilitySources = [source?.abilities, source?.ability_scores, source?.stats, source?.scores].filter(Boolean);

  for (const block of abilitySources) {
    const blockLookup = toLookup(block);
    const found = firstValue(blockLookup, [ability, short], undefined);
    if (found !== undefined) return numberOr(found, 10);
  }

  return numberOr(firstValue(lookup, [ability, short], 10), 10);
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

function deriveImport(inputSource, sourceFileName = '') {
  const source = unwrapCharacterSource(inputSource);
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
  const edition = String(firstValue(lookup, ['edition', 'rulesedition', 'rules_edition', 'ruleset'], next.edition));
  next.edition = edition.includes('2024') ? '2024' : '2014';
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
    ? `Imported from player upload: ${character.source_file_name}.${character.source_warning ? ` ${character.source_warning}` : ''}`
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

function ScanSummary({ scan }) {
  if (scan.status === 'idle') return null;

  if (scan.status === 'scanning') {
    return (
      <div style={styles.scanPanel} role="status" aria-live="polite">
        <LoaderCircle size={18} color="#7CCBFF" />
        <div>
          <strong style={styles.sectionTitle}>Reading your character sheet…</strong>
          <p style={styles.bodyCopy}>Rook is extracting the details. Nothing is saved until you review the result and press save.</p>
        </div>
      </div>
    );
  }

  if (scan.status === 'error') {
    return (
      <div style={styles.scanPanel} role="alert">
        <AlertTriangle size={18} color="#FF2DAA" />
        <div>
          <strong style={styles.sectionTitle}>Automatic scan did not finish</strong>
          <p style={styles.bodyCopy}>{scan.message || 'You can still fill the character in manually below.'}</p>
        </div>
      </div>
    );
  }

  const confidence = scan.confidence === null ? null : Math.round(scan.confidence * 100);
  return (
    <div style={styles.scanPanel} role="status" aria-live="polite">
      <CheckCircle2 size={18} color="#7CCBFF" />
      <div style={{ minWidth: 0 }}>
        <strong style={styles.sectionTitle}>Sheet scanned — now give it a quick review</strong>
        <p style={styles.bodyCopy}>
          {confidence === null ? 'Extraction complete.' : `Overall read confidence: ${confidence}%.`} Check anything highlighted below before saving.
        </p>
        {scan.warnings.length > 0 && (
          <div style={styles.warningList}>
            {scan.warnings.map((warning, index) => <span key={`${warning}-${index}`}>• {warning}</span>)}
          </div>
        )}
        {scan.needsReview.length > 0 && (
          <div style={styles.reviewRow}>
            <span style={styles.reviewLabel}>Double-check:</span>
            {scan.needsReview.map((field) => (
              <span key={field} style={styles.reviewPill}>{String(field).replaceAll('_', ' ')}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CharacterImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [rawText, setRawText] = useState('');
  const [character, setCharacter] = useState(DEFAULT_IMPORT);
  const [saving, setSaving] = useState(false);
  const [scan, setScan] = useState(EMPTY_SCAN);

  const payloadPreview = useMemo(() => buildPayload(character), [character]);
  const canSave = Boolean(character.name.trim() && character.race.trim() && character.character_class.trim());

  const update = (field, value) => setCharacter((prev) => ({ ...prev, [field]: value }));

  const applyRawText = (text, sourceFileName = '') => {
    const parsed = parseJsonOrText(text);
    const derived = deriveImport(parsed, sourceFileName);
    setCharacter((prev) => ({ ...prev, ...derived }));
    setScan(EMPTY_SCAN);
    toast.success('Character details pulled into the importer');
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const canReadAsText = lowerName.endsWith('.json') || lowerName.endsWith('.txt') || lowerName.endsWith('.md') || file.type.startsWith('text/');

    if (canReadAsText) {
      const text = await file.text();
      setRawText(text);
      applyRawText(text, file.name);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const canScan = lowerName.endsWith('.pdf')
      || /\.(png|jpe?g|webp)$/.test(lowerName)
      || file.type === 'application/pdf'
      || file.type.startsWith('image/');

    if (!canScan) {
      toast.error('Upload a PDF, image, JSON, TXT, or MD character sheet.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setCharacter((prev) => ({ ...prev, source_file_name: file.name, source_warning: '' }));
    setScan({ ...EMPTY_SCAN, status: 'scanning' });

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/character-import/extract', formData);
      const result = response.data || {};
      const derived = deriveImport(result.character || {}, file.name);
      const warnings = Array.isArray(result.warnings) ? result.warnings.filter(Boolean) : [];
      const needsReview = Array.isArray(result.needs_review) ? result.needs_review.filter(Boolean) : [];
      const confidence = Number.isFinite(Number(result.confidence)) ? Number(result.confidence) : null;
      const sourceWarning = [
        ...warnings,
        needsReview.length ? `Fields marked for review: ${needsReview.join(', ')}.` : '',
      ].filter(Boolean).join(' ');

      setCharacter({ ...derived, source_warning: sourceWarning });
      setScan({
        status: 'complete',
        confidence,
        warnings,
        needsReview,
        message: '',
      });
      toast.success('Character sheet scanned — review the details before saving');
    } catch (error) {
      const consentCancelled = error?.code === 'RQK_AI_CONSENT_CANCELLED';
      const detail = error?.formattedDetail || error?.response?.data?.detail || error?.message;
      setScan({
        ...EMPTY_SCAN,
        status: 'error',
        message: consentCancelled
          ? 'Automatic scanning was cancelled. The manual importer is still available below.'
          : detail || 'The sheet could not be scanned automatically. You can still enter it manually below.',
      });
      if (consentCancelled) toast.info('Automatic sheet scanning cancelled');
      else toast.error(detail || 'Could not scan that character sheet');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const reset = () => {
    setRawText('');
    setCharacter(DEFAULT_IMPORT);
    setScan(EMPTY_SCAN);
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
      toast.success('Character saved to your digital library');
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
          <h1 style={styles.title}>Turn an existing sheet into a digital character</h1>
          <p style={styles.subtitle}>Upload a PDF or photo and Rook will read the sheet into Rookie Quest Keeper. You review the result first, then save it as a normal editable character.</p>
        </div>
      </header>

      <section style={styles.notice}>
        <Wand2 size={19} color="#7CCBFF" />
        <div>
          <strong style={styles.sectionTitle}>Upload → scan → review → save</strong>
          <p style={styles.bodyCopy}>Nothing from the scan is saved automatically. Homebrew names and unusual character options are kept as written wherever possible.</p>
        </div>
      </section>

      <section style={styles.gridTwo}>
        <article style={styles.card}>
          <div style={styles.cardHeader}>
            <UploadCloud size={22} color="#7CCBFF" />
            <div>
              <h2 style={styles.sectionTitle}>Upload a character sheet</h2>
              <p style={styles.bodyCopy}>PDF, PNG, JPG, and WEBP sheets are scanned automatically. JSON, TXT, and MD files are read directly.</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt,.md,.pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
            onChange={handleFile}
            disabled={scan.status === 'scanning'}
            aria-busy={scan.status === 'scanning'}
            style={{ ...styles.fileInput, opacity: scan.status === 'scanning' ? 0.65 : 1 }}
          />
          {character.source_file_name && (
            <p style={styles.fileNote}><FileText size={14} color="#7CCBFF" /> Source: {character.source_file_name}</p>
          )}
          <ScanSummary scan={scan} />
        </article>

        <article style={styles.card}>
          <div style={styles.cardHeader}>
            <FileText size={22} color="#7CCBFF" />
            <div>
              <h2 style={styles.sectionTitle}>Paste character data instead</h2>
              <p style={styles.bodyCopy}>Useful for exports or notes. JSON works best, or use lines such as <em>Name: Javen</em>, <em>Class: Warlock</em>, <em>STR: 11</em>.</p>
            </div>
          </div>
          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder="Paste sheet text or JSON here..."
            style={{ ...styles.input, minHeight: 120, resize: 'vertical' }}
          />
          <div style={styles.rowActions}>
            <button type="button" onClick={() => applyRawText(rawText)} style={styles.primaryButton}>Use pasted text</button>
            <button type="button" onClick={reset} style={styles.secondaryButton}><RefreshCw size={15} color="#7CCBFF" /> Reset</button>
          </div>
        </article>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Core character</h2>
        <p style={{ ...styles.bodyCopy, marginBottom: 10 }}>These are the three fields required to save. If Rook was unsure about anything, correct it here.</p>
        <div style={styles.formGrid}>
          <TextField label="Character name" value={character.name} onChange={(value) => update('name', value)} placeholder="Name" />
          <TextField label="Race / Species" value={character.race} onChange={(value) => update('race', value)} placeholder="Race or species" />
          <TextField label="Subrace / Lineage" value={character.subrace} onChange={(value) => update('subrace', value)} />
          <TextField label="Class" value={character.character_class} onChange={(value) => update('character_class', value)} placeholder="Class or multiclass breakdown" />
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
        <h2 style={styles.sectionTitle}>Features, equipment, spells, and notes</h2>
        <div style={styles.gridTwo}>
          <TextField label="Skills" value={character.skills_text} onChange={(value) => update('skills_text', value)} multiline placeholder="Athletics, Perception..." />
          <TextField label="Saving throws" value={character.saving_throws_text} onChange={(value) => update('saving_throws_text', value)} multiline placeholder="Strength, Constitution..." />
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
          <strong style={styles.sectionTitle}>{canSave ? 'Ready to become a digital character' : 'Needs name, race/species, and class'}</strong>
          <p style={styles.bodyCopy}>Preview: {payloadPreview.name || 'Unnamed'} • {payloadPreview.race} • {payloadPreview.character_class} • Level {payloadPreview.level}</p>
        </div>
        <button
          type="button"
          onClick={saveCharacter}
          disabled={saving || !canSave || scan.status === 'scanning'}
          style={{ ...styles.primaryButton, opacity: saving || !canSave || scan.status === 'scanning' ? 0.55 : 1 }}
        >
          <Save size={16} color="#7CCBFF" /> {saving ? 'Saving…' : 'Save Reviewed Character'}
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
    maxWidth: 850,
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
  scanPanel: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
    marginTop: 9,
    padding: 10,
    borderRadius: 5,
    border: '1px solid rgba(124,203,255,.28)',
    background: '#081B2A',
    color: '#FFFFFF',
  },
  warningList: {
    display: 'grid',
    gap: 3,
    marginTop: 7,
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 1.4,
  },
  reviewRow: {
    display: 'flex',
    gap: 5,
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 8,
  },
  reviewLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 900,
  },
  reviewPill: {
    border: '1px solid #FF2DAA',
    borderRadius: 999,
    padding: '3px 7px',
    color: '#FFFFFF',
    background: '#102B40',
    fontSize: 10,
    fontWeight: 850,
    textTransform: 'capitalize',
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
