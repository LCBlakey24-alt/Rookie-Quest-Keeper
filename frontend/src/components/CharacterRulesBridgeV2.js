import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import FullCharacterCreatorV2 from '@/components/FullCharacterCreatorV2';
import StartingLevelClassSpecificChoices from '@/components/StartingLevelClassSpecificChoices';
import { AsiChoiceRow, SpellChoiceSection, WarlockChoiceSection } from '@/components/StartingLevelDetailedChoices';
import { BACKGROUNDS, CLASSES, RACES, getProficiencyBonus } from '@/data/characterRules5e';
import { FEATS } from '@/data/levelUpData';
import {
  SPELLCASTING_CLASSES,
  SPELL_DATABASE,
  getCanonicalSpellcastingClass,
  getSpellSlotsForCaster,
} from '@/data/spellDatabase';
import { buildInitialClassResources } from '@/data/classResourceRules';
import {
  resolveDraftClassName,
  resolvePayloadClassName,
  resolvePayloadSubclassName,
  resolveRulesEdition,
  resolveSubclassName,
} from '@/data/characterDraftResolvers';
import {
  applyClassSpecificChoicesToPayload,
  buildClassSpecificChoicePlan,
  normaliseClassSpecificSelection,
} from '@/data/classSpecificChoiceEngine';
import { getFeatsForRuleset } from '@/data/rules/feats/featRegistry';
import {
  applyStartingLevelChoicesToPayload,
  buildStartingLevelChoicePlan,
  defaultAsiSelection,
  getFeatOptions,
  pruneStartingLevelDetailSelections,
} from '@/data/startingLevelChoiceEngine';
import apiClient from '@/lib/apiClient';
import usePlayerRulesOptions, { buildMergedCharacterRules } from '@/hooks/usePlayerRulesOptions';
import './FullCharacterCreatorV2.css';
import './FullCharacterCreatorFlow.css';

const DRAFT_KEY = 'rqk.full_character_creator_v2.safe';
const LEVEL_KEY = 'rqk.full_character_creator_v2.starting_level';
const SUBCLASS_KEY = 'rqk.full_character_creator_v2.starting_subclass';
const CHOICES_KEY = 'rqk.full_character_creator_v2.level_choices';
const DETAIL_CHOICES_KEY = 'rqk.full_character_creator_v2.detail_choices';
const LEVELS = Array.from({ length: 20 }, (_, index) => index + 1);
const SUBCLASS_LEVEL_2014 = { Barbarian: 3, Bard: 3, Cleric: 1, Druid: 2, Fighter: 3, Monk: 3, Paladin: 3, Ranger: 3, Rogue: 3, Sorcerer: 1, Warlock: 1, Wizard: 2 };
const ABILITY_KEYS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

const arr = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const many = (value) => Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
const splitList = (value) => {
  if (Array.isArray(value)) return value.flatMap(splitList).filter(Boolean);
  if (typeof value === 'string') return value.split(/[,;/|]+|\band\b/gi).map(item => item.trim()).filter(Boolean);
  return value ? [value] : [];
};
const displayName = (value) => typeof value === 'string' ? value : value?.name || value?.title || String(value || '');
const clampLevel = (value) => Math.max(1, Math.min(20, Number.parseInt(value, 10) || 1));
const mod = (score = 10) => Math.floor(((Number(score) || 10) - 10) / 2);
const normaliseKey = (value = '') => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hitDieNumber = (value, fallback = 8) => {
  const match = String(value || '').match(/d?(6|8|10|12)/i);
  return match ? Number(match[1]) : Number(value || fallback) || fallback;
};

function useCampaignIdFromQuery() {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search).get('campaign_id') || '', [location.search]);
}

function readJson(key, fallback = {}) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || 'null') || fallback;
  } catch {
    return fallback;
  }
}

function readBuilderDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function draftAbilityScore(draft = {}, ability) {
  const raw = draft?.[ability] ?? draft?.abilityScores?.[ability] ?? draft?.abilities?.[ability] ?? draft?.scores?.[ability];
  const value = typeof raw === 'object' && raw !== null ? raw.score : raw;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 10;
}

function draftAbilitySnapshot(draft = {}) {
  return Object.fromEntries(ABILITY_KEYS.map((ability) => [ability, draftAbilityScore(draft, ability)]));
}

function draftAbilitySignature(draft = {}) {
  return ABILITY_KEYS.map((ability) => draftAbilityScore(draft, ability)).join('|');
}

function sameJson(left, right) {
  return JSON.stringify(left || {}) === JSON.stringify(right || {});
}

function applyMergedRules(merged) {
  Object.entries(merged.races || {}).forEach(([name, data]) => {
    RACES[name] = { ...(RACES[name] || {}), ...data };
  });
  Object.entries(merged.classes || {}).forEach(([name, data]) => {
    CLASSES[name] = { ...(CLASSES[name] || {}), ...data };
  });
  Object.entries(merged.backgrounds || {}).forEach(([name, data]) => {
    BACKGROUNDS[name] = { ...(BACKGROUNDS[name] || {}), ...data };
  });
}

function textFromBenefits(feat = {}) {
  if (feat.description) return feat.description;
  return arr(feat.benefits).map((benefit) => typeof benefit === 'string' ? benefit : [benefit.name, benefit.description || benefit.rules_text].filter(Boolean).join(': ')).filter(Boolean).join(' ');
}

function normaliseRulesets(item = {}) {
  const explicit = splitList(item.rulesets || item.editions);
  if (explicit.length) return explicit.map(String);
  if (item.edition || item.ruleset || item.rules_edition) return [String(item.edition || item.ruleset || item.rules_edition).includes('2024') ? '2024' : '2014'];
  return ['2014', '2024'];
}

export function normaliseFeatCategory(feat = {}) {
  const haystack = [
    feat.category,
    feat.feat_category,
    feat.featCategory,
    feat.type,
    feat.feat_type,
    feat.group,
    feat.prerequisite,
    feat.prereq,
    feat.requirements,
    splitList(feat.tags).join(' '),
  ].filter(Boolean).join(' ').toLowerCase();

  if (feat.epic || feat.is_epic || /\bepic\b|\blevel\s*19\b|\b19th[-\s]?level\b/.test(haystack)) return 'epic';
  if (feat.origin || feat.is_origin || /\borigin\b|\bbackground\b|\blevel\s*1\b|\b1st[-\s]?level\b|\bstarter\b/.test(haystack)) return 'origin';
  return 'general';
}

function installUploadedFeats(feats = []) {
  const seen = new Set(FEATS.map((feat) => normaliseKey(feat.name)));
  arr(feats).forEach((feat) => {
    const name = displayName(feat);
    const key = normaliseKey(name);
    if (!name || seen.has(key)) return;
    seen.add(key);
    FEATS.push({
      ...feat,
      name,
      description: textFromBenefits(feat) || 'Homebrew feat saved from the Homebrew Workshop.',
      prereq: feat.prereq || feat.prerequisite || null,
      editions: normaliseRulesets(feat),
      category: normaliseFeatCategory(feat),
      source: feat.source_label || feat.source || 'Homebrew Workshop',
      homebrew: true,
    });
  });
}

export function normaliseSpellClasses(spell = {}) {
  const rawClasses = splitList(
    spell.classes ||
    spell.class_list ||
    spell.classList ||
    spell.class_names ||
    spell.classNames ||
    spell.available_classes ||
    spell.availableClasses ||
    spell.class ||
    spell.spell_class,
  );
  const classes = rawClasses
    .map((name) => getCanonicalSpellcastingClass(name))
    .filter((name) => name && SPELLCASTING_CLASSES[name]);
  return classes.length ? Array.from(new Set(classes)) : Object.keys(SPELLCASTING_CLASSES);
}

export function spellEntryFromHomebrew(spell = {}) {
  const damage = spell.damage && typeof spell.damage === 'object' ? spell.damage.dice : spell.damage;
  const damageType = spell.damage && typeof spell.damage === 'object' ? spell.damage.type : spell.damageType || spell.damage_type;
  return {
    ...spell,
    name: displayName(spell),
    level: Number(spell.level ?? spell.spell_level ?? 0),
    school: spell.school || '',
    classes: normaliseSpellClasses(spell),
    description: spell.description || spell.rules_text || '',
    damage,
    damageType,
    source: spell.source_label || spell.source || 'Homebrew Workshop',
    homebrew: true,
  };
}

function installUploadedSpells(spells = []) {
  arr(spells).forEach((rawSpell) => {
    const spell = spellEntryFromHomebrew(rawSpell);
    const name = spell.name;
    if (!name) return;
    const level = Math.max(0, Math.min(9, Number(spell.level || 0)));
    const bucketKey = level === 0 ? 'cantrips' : level;
    const bucket = SPELL_DATABASE[bucketKey] || [];
    const duplicate = bucket.some((existing) => normaliseKey(existing.name) === normaliseKey(name));
    if (duplicate) return;
    SPELL_DATABASE[bucketKey] = [...bucket, { ...spell, level }];
  });
}

function installUploadedBuilderRules(options = {}) {
  installUploadedFeats(options.feats);
  installUploadedSpells(options.spells);
}

function featureText(feature) {
  if (typeof feature === 'string') return feature;
  if (!feature || typeof feature !== 'object') return String(feature || '');
  return feature.name || feature.title || feature.description || '';
}

function featureDescription(feature, fallback) {
  if (feature && typeof feature === 'object') return feature.description || feature.text || feature.summary || fallback;
  return fallback;
}

function classFeaturesUpTo(className, classData, level, existingFeatures = []) {
  const seen = new Set();
  const out = [];
  arr(existingFeatures).forEach((feature) => {
    const name = displayName(feature);
    if (!name || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    out.push(typeof feature === 'object' ? feature : { name, description: `${className} feature.` });
  });
  for (let current = 1; current <= level; current += 1) {
    arr(classData?.features?.[current]).forEach((feature) => {
      const name = featureText(feature);
      if (!name || name === '---' || seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());
      out.push({ name, description: featureDescription(feature, `${className} feature gained at level ${current}.`) });
    });
  }
  return out;
}

function collectFeatureMechanics(feature = {}, source = '') {
  if (!feature || typeof feature !== 'object') return emptyMechanics();
  return {
    resources: many(feature.resources || feature.resource).map(item => ({ ...item, source })),
    actions: many(feature.actions || feature.sheet_actions || feature.sheetActions).map(item => ({ ...item, source })),
    passive_effects: many(feature.passive_effects || feature.passiveEffects || feature.effects).map(item => ({ ...item, source })),
    scaling: many(feature.scaling).map(item => ({ ...item, source })),
    upgrades: many(feature.upgrades).map(item => ({ ...item, source })),
    automation_notes: many(feature.automation_notes || feature.automationNotes).map(note => ({ note: String(note), source })),
    refs: [],
  };
}

function emptyMechanics() {
  return { resources: [], actions: [], passive_effects: [], scaling: [], upgrades: [], automation_notes: [], refs: [] };
}

function mergeMechanics(...parts) {
  return parts.reduce((out, part = {}) => ({
    resources: [...out.resources, ...arr(part.resources)],
    actions: [...out.actions, ...arr(part.actions)],
    passive_effects: [...out.passive_effects, ...arr(part.passive_effects)],
    scaling: [...out.scaling, ...arr(part.scaling)],
    upgrades: [...out.upgrades, ...arr(part.upgrades)],
    automation_notes: [...out.automation_notes, ...arr(part.automation_notes)],
    refs: [...out.refs, ...arr(part.refs)],
  }), emptyMechanics());
}

function collectItemMechanics(item = {}, level = 20, type = 'homebrew') {
  if (!item || typeof item !== 'object') return emptyMechanics();
  const name = displayName(item);
  const source = item.source_label || item.source || name || 'Homebrew';
  const own = {
    resources: many(item.resources || item.resource).map(resource => ({ ...resource, source, source_type: type, content_id: item.id })),
    actions: many(item.actions || item.sheet_actions || item.sheetActions).map(action => ({ ...action, source, source_type: type, content_id: item.id })),
    passive_effects: many(item.passive_effects || item.passiveEffects || item.effects).map(effect => ({ ...effect, source, source_type: type, content_id: item.id })),
    scaling: many(item.scaling).map(entry => ({ ...entry, source, source_type: type, content_id: item.id })),
    upgrades: many(item.upgrades).map(entry => ({ ...entry, source, source_type: type, content_id: item.id })),
    automation_notes: many(item.automation_notes || item.automationNotes).map(note => ({ note: String(note), source, source_type: type, content_id: item.id })),
    refs: name ? [{ id: item.id, type, name, source }] : [],
  };
  const featureMechanics = arr(item.features)
    .filter(feature => Number(feature?.level || 1) <= level)
    .map(feature => collectFeatureMechanics(feature, source));
  return mergeMechanics(own, ...featureMechanics);
}

function namesFromEntries(...groups) {
  const names = new Set();
  groups.flatMap(group => arr(group)).forEach(item => {
    const name = displayName(item);
    if (name) names.add(normaliseKey(name));
  });
  return names;
}

function collectSelectedHomebrewMechanics({ options, enhanced, className, subclassName, level }) {
  const selectedFeatNames = namesFromEntries(enhanced.feats);
  const selectedSpellNames = namesFromEntries(
    enhanced.cantrips_known,
    enhanced.cantrips,
    enhanced.spells_known,
    enhanced.known_spells,
    enhanced.spells_prepared,
    enhanced.prepared_spells,
    enhanced.spellbook,
  );

  const classMechanics = arr(options?.classes)
    .filter(item => normaliseKey(displayName(item)) === normaliseKey(className))
    .map(item => collectItemMechanics(item, level, 'class'));
  const subclassMechanics = arr(options?.subclasses)
    .filter(item => normaliseKey(item.parent_class || item.parentClass) === normaliseKey(className))
    .filter(item => normaliseKey(displayName(item)) === normaliseKey(subclassName))
    .map(item => collectItemMechanics(item, level, 'subclass'));
  const featMechanics = arr(options?.feats)
    .filter(item => selectedFeatNames.has(normaliseKey(displayName(item))))
    .map(item => collectItemMechanics(item, level, 'feat'));
  const spellMechanics = arr(options?.spells)
    .filter(item => selectedSpellNames.has(normaliseKey(displayName(item))))
    .map(item => collectItemMechanics(item, level, 'spell'));

  return mergeMechanics(...classMechanics, ...subclassMechanics, ...featMechanics, ...spellMechanics);
}

function uploadedSubclassFeaturesUpTo(options, className, subclassName, level) {
  if (!subclassName) return [];
  return arr(options?.subclasses).flatMap((subclass) => {
    const parent = subclass.parent_class || subclass.parentClass;
    const name = displayName(subclass);
    if (normaliseKey(parent) !== normaliseKey(className) || normaliseKey(name) !== normaliseKey(subclassName)) return [];
    return arr(subclass.features).filter((feature) => Number(feature?.level || 1) <= level).map((feature) => ({
      ...feature,
      name: featureText(feature),
      description: featureDescription(feature, `${subclassName} feature gained at level ${feature?.level || 'this level'}.`),
      source: subclass.source_label || subclass.source || 'Uploaded subclass',
      homebrew: true,
      homebrewContentId: subclass.id,
    })).filter((feature) => feature.name);
  });
}

function subclassUnlockLevel(className, edition, classData) {
  if (edition === '2024') return 3;
  return Number(classData?.subclassLevel || classData?.subclass_level || SUBCLASS_LEVEL_2014[className] || 3);
}

function averageHitPoints(level, hitDie, constitutionScore) {
  const con = mod(constitutionScore);
  const first = Math.max(1, hitDie + con);
  const later = Math.max(1, Math.floor(hitDie / 2) + 1 + con);
  return first + Math.max(0, level - 1) * later;
}

function withStartingLevel(payload, { targetLevel, selectedSubclass, options, levelChoiceSelections, featOptions, detailSelections }) {
  if (!payload || typeof payload !== 'object') return payload;
  const className = resolvePayloadClassName(payload, CLASSES);
  const classData = CLASSES[className] || {};
  const classSubclasses = arr(classData.subclasses).map(displayName).filter(Boolean);
  const level = clampLevel(targetLevel || payload.level || 1);
  const hitDie = hitDieNumber(classData.hitDie || payload.hit_die || payload.hit_dice, 8);
  const subclassSource = selectedSubclass !== undefined ? { subclass: selectedSubclass } : payload;
  const subclassName = resolvePayloadSubclassName(subclassSource, classSubclasses, '');
  const classFeatures = classFeaturesUpTo(className, classData, level, payload.class_features);
  const subclassFeatures = uploadedSubclassFeaturesUpTo(options, className, subclassName, level);
  const features = [...classFeatures];
  const seen = new Set(features.map((feature) => displayName(feature).toLowerCase()));
  subclassFeatures.forEach((feature) => {
    const key = displayName(feature).toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    features.push(feature);
  });

  let enhanced = {
    ...payload,
    character_class: className,
    level,
    subclass: subclassName,
    proficiency_bonus: getProficiencyBonus(level),
    hit_dice: `${level}d${hitDie}`,
    hit_dice_remaining: level,
    class_features: features,
  };

  enhanced = applyStartingLevelChoicesToPayload(enhanced, levelChoiceSelections, featOptions, detailSelections);
  enhanced = applyClassSpecificChoicesToPayload(enhanced, detailSelections?.classSpecific, detailSelections?.classSpecificPlan);
  const mechanics = collectSelectedHomebrewMechanics({ options, enhanced, className, subclassName, level });
  enhanced.homebrew_resources = mechanics.resources;
  enhanced.homebrew_actions = mechanics.actions;
  enhanced.passive_effects = [...arr(enhanced.passive_effects), ...mechanics.passive_effects];
  enhanced.homebrew_scaling = mechanics.scaling;
  enhanced.homebrew_upgrades = mechanics.upgrades;
  enhanced.homebrew_automation_notes = mechanics.automation_notes;
  enhanced.homebrew_content_refs = mechanics.refs;
  enhanced.max_hit_points = averageHitPoints(level, hitDie, enhanced.constitution);
  enhanced.current_hit_points = averageHitPoints(level, hitDie, enhanced.constitution);

  const spellcasting = SPELLCASTING_CLASSES[className];
  if (spellcasting) {
    const slots = getSpellSlotsForCaster(spellcasting, level);
    enhanced.spell_slots = slots;
    enhanced.spell_slots_remaining = slots;
  }
  enhanced.resources = buildInitialClassResources(enhanced);
  return enhanced;
}

export default function CharacterRulesBridgeV2(props) {
  const campaignId = useCampaignIdFromQuery();
  const { options, loading, error, hasCustomContent, counts } = usePlayerRulesOptions({ campaignId });
  installUploadedBuilderRules(options || {});
  const [builderDraft, setBuilderDraft] = useState(readBuilderDraft);
  const [targetLevel, setTargetLevel] = useState(() => clampLevel(sessionStorage.getItem(LEVEL_KEY) || 1));
  const [selectedSubclass, setSelectedSubclass] = useState(() => sessionStorage.getItem(SUBCLASS_KEY) || '');
  const [levelChoiceSelections, setLevelChoiceSelections] = useState(() => readJson(CHOICES_KEY, {}));
  const [detailSelections, setDetailSelections] = useState(() => readJson(DETAIL_CHOICES_KEY, { spells: {}, warlock: {}, classSpecific: {} }));

  const mergedRules = useMemo(() => buildMergedCharacterRules({ races: RACES, classes: CLASSES, backgrounds: BACKGROUNDS }, options), [options]);
  applyMergedRules(mergedRules);

  useEffect(() => {
    const sync = () => setBuilderDraft(readBuilderDraft());
    sync();
    const interval = window.setInterval(sync, 600);
    window.addEventListener('focus', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => { sessionStorage.setItem(LEVEL_KEY, String(targetLevel)); }, [targetLevel]);
  useEffect(() => {
    if (selectedSubclass) sessionStorage.setItem(SUBCLASS_KEY, selectedSubclass);
    else sessionStorage.removeItem(SUBCLASS_KEY);
  }, [selectedSubclass]);
  useEffect(() => { sessionStorage.setItem(CHOICES_KEY, JSON.stringify(levelChoiceSelections || {})); }, [levelChoiceSelections]);
  useEffect(() => { sessionStorage.setItem(DETAIL_CHOICES_KEY, JSON.stringify(detailSelections || {})); }, [detailSelections]);

  const currentClassName = resolveDraftClassName(builderDraft, CLASSES);
  const currentEdition = resolveRulesEdition(builderDraft);
  const currentClassData = CLASSES[currentClassName] || {};
  const subclasses = arr(currentClassData.subclasses).map(displayName).filter(Boolean);
  const subclassSignature = subclasses.join('|');
  const subclassLevel = subclassUnlockLevel(currentClassName, currentEdition, currentClassData);
  const needsSubclass = targetLevel >= subclassLevel && subclasses.length > 0;
  const currentSelectedSubclass = needsSubclass ? resolveSubclassName(selectedSubclass, subclasses, subclasses[0] || '') : '';
  const abilitySignature = draftAbilitySignature(builderDraft);
  const choicePlan = useMemo(() => buildStartingLevelChoicePlan({
    className: currentClassName,
    startingLevel: targetLevel,
    edition: currentEdition,
    abilities: draftAbilitySnapshot(builderDraft),
  }), [currentClassName, currentEdition, targetLevel, abilitySignature, options?.spells?.length]);
  const classSpecificPlan = useMemo(() => buildClassSpecificChoicePlan({
    className: currentClassName,
    level: targetLevel,
    subclassName: currentSelectedSubclass,
  }), [currentClassName, targetLevel, currentSelectedSubclass]);
  const registryFeats = useMemo(() => getFeatsForRuleset({ edition: currentEdition }), [currentEdition, options?.feats?.length]);
  const featOptions = useMemo(() => getFeatOptions({ edition: currentEdition, level: targetLevel, registryFeats, uploadedFeats: options?.feats }), [currentEdition, targetLevel, registryFeats, options]);
  const asiChoiceSignature = choicePlan.asiChoices.map((choice) => choice.id).join('|');
  const spellChoiceSignature = [
    currentClassName,
    targetLevel,
    abilitySignature,
    choicePlan.spellPlan.cantripTarget,
    choicePlan.spellPlan.knownTarget,
    choicePlan.spellPlan.preparedTarget,
    choicePlan.spellPlan.maxSpellLevel,
    arr(choicePlan.spellPlan.arcanumLevels).join(','),
  ].join('|');
  const warlockChoiceSignature = choicePlan.warlockPlan
    ? [targetLevel, currentEdition, choicePlan.warlockPlan.pactBoonRequired ? 'pact' : 'no-pact', choicePlan.warlockPlan.invocationCount || 0].join('|')
    : 'no-warlock';
  const classSpecificChoiceSignature = [
    currentClassName,
    targetLevel,
    currentSelectedSubclass,
    classSpecificPlan.fightingStyleTarget,
    classSpecificPlan.expertiseTarget,
    classSpecificPlan.metamagicTarget,
    classSpecificPlan.maneuverTarget,
  ].join('|');

  useEffect(() => {
    if (!needsSubclass) {
      if (selectedSubclass) setSelectedSubclass('');
      return;
    }
    if (selectedSubclass !== currentSelectedSubclass) setSelectedSubclass(currentSelectedSubclass);
  }, [needsSubclass, selectedSubclass, currentSelectedSubclass, subclassSignature]);

  useEffect(() => {
    const validIds = new Set(choicePlan.asiChoices.map((choice) => choice.id));
    setLevelChoiceSelections((prev) => Object.fromEntries(Object.entries(prev || {}).filter(([key]) => validIds.has(key))));
  }, [asiChoiceSignature]);

  useEffect(() => {
    setDetailSelections((prev) => {
      const pruned = pruneStartingLevelDetailSelections(prev, { spellPlan: choicePlan.spellPlan, warlockPlan: choicePlan.warlockPlan });
      if (sameJson(prev?.spells, pruned.spells) && sameJson(prev?.warlock, pruned.warlock)) return prev;
      return { ...prev, spells: pruned.spells, warlock: pruned.warlock };
    });
  }, [spellChoiceSignature, warlockChoiceSignature, choicePlan.spellPlan, choicePlan.warlockPlan]);

  useEffect(() => {
    setDetailSelections((prev) => {
      const current = prev?.classSpecific || {};
      const normalised = normaliseClassSpecificSelection(current, classSpecificPlan);
      return sameJson(current, normalised) ? prev : { ...prev, classSpecific: normalised };
    });
  }, [classSpecificChoiceSignature, classSpecificPlan]);

  const updateLevelChoice = useCallback((choiceId, selection) => {
    setLevelChoiceSelections((prev) => ({ ...prev, [choiceId]: defaultAsiSelection(selection) }));
  }, []);

  const updateDetailSelection = useCallback((key, selection) => {
    setDetailSelections((prev) => ({ ...prev, [key]: selection }));
  }, []);

  const updateClassSpecificSelection = useCallback((selection) => {
    const normalised = normaliseClassSpecificSelection(selection, classSpecificPlan);
    setDetailSelections((prev) => ({ ...prev, classSpecific: normalised }));
  }, [classSpecificPlan]);

  const enhancedDetailSelections = useMemo(() => ({
    ...detailSelections,
    spellPlan: choicePlan.spellPlan,
    warlockPlan: choicePlan.warlockPlan,
    classSpecificPlan,
  }), [detailSelections, choicePlan.spellPlan, choicePlan.warlockPlan, classSpecificPlan]);

  const enhancePayload = useCallback((payload) => withStartingLevel(payload, {
    targetLevel,
    selectedSubclass: needsSubclass ? currentSelectedSubclass : '',
    options,
    levelChoiceSelections,
    featOptions,
    detailSelections: enhancedDetailSelections,
  }), [targetLevel, needsSubclass, currentSelectedSubclass, options, levelChoiceSelections, featOptions, enhancedDetailSelections]);

  useEffect(() => {
    const originalPost = apiClient.post.bind(apiClient);
    const originalPatch = apiClient.patch.bind(apiClient);
    apiClient.post = (url, data, ...rest) => originalPost(url, url === '/characters' ? enhancePayload(data) : data, ...rest);
    apiClient.patch = (url, data, ...rest) => originalPatch(url, /^\/characters\/[^/]+$/.test(String(url || '')) ? enhancePayload(data) : data, ...rest);
    return () => {
      apiClient.post = originalPost;
      apiClient.patch = originalPatch;
    };
  }, [enhancePayload]);

  const visibleUploadedCount = ['races', 'classes', 'subclasses', 'backgrounds', 'feats', 'spells'].reduce((sum, key) => sum + Number(counts?.[key] || 0), 0);

  if (loading) {
    return <main className="full-creator-page"><div className="full-creator-loading">Loading your character options…</div></main>;
  }

  return (
    <>
      <section className="full-creator-progress-card" aria-label="Starting level controls">
        <div className="full-creator-progress-heading">
          <span>Starting level supervisor</span>
          <strong>Level {targetLevel}</strong>
        </div>
        <p>Build normally below. When you save, this pass upgrades the saved sheet with level, HP, hit dice, proficiency, spell slots, class features, ASIs, feats, known spells, Pact Boon, invocations, class-specific choices, and homebrew resource trackers.</p>
        <div className="full-creator-form-grid">
          <label>
            <span>Starting level</span>
            <select value={targetLevel} onChange={(event) => setTargetLevel(clampLevel(event.target.value))}>
              {LEVELS.map((level) => <option key={level} value={level}>Level {level}</option>)}
            </select>
          </label>
          {needsSubclass && (
            <label>
              <span>{currentEdition === '2024' ? 'Subclass at level 3' : `Subclass at level ${subclassLevel}`}</span>
              <select value={currentSelectedSubclass} onChange={(event) => setSelectedSubclass(event.target.value)}>
                {subclasses.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
          )}
        </div>

        {choicePlan.asiChoices.length > 0 && <div className="full-creator-auto-box"><strong>ASI / feat choices</strong><span>These choices are applied to the saved sheet immediately, including saved Homebrew Workshop feats.</span></div>}
        {choicePlan.asiChoices.map((choice) => (
          <AsiChoiceRow key={choice.id} choice={choice} selection={levelChoiceSelections[choice.id]} featOptions={featOptions} onChange={(selection) => updateLevelChoice(choice.id, selection)} />
        ))}

        <SpellChoiceSection plan={choicePlan.spellPlan} selection={detailSelections.spells} onChange={(selection) => updateDetailSelection('spells', selection)} />
        <WarlockChoiceSection plan={choicePlan.warlockPlan} selection={detailSelections.warlock} onChange={(selection) => updateDetailSelection('warlock', selection)} />
        <StartingLevelClassSpecificChoices plan={classSpecificPlan} selection={detailSelections.classSpecific} onChange={updateClassSpecificSelection} />

        {choicePlan.manualHooks.length > 0 && (
          <div className="full-creator-auto-box"><strong>Still needs detailed pass</strong><span>{choicePlan.manualHooks.map((choice) => choice.label).join(' • ')}</span></div>
        )}
      </section>

      {hasCustomContent && (
        <section className="full-creator-progress-card" aria-label="Uploaded character options loaded">
          <div className="full-creator-progress-heading">
            <span>Uploaded options active</span>
            <strong>{visibleUploadedCount} builder option{visibleUploadedCount === 1 ? '' : 's'} loaded</strong>
          </div>
          <p>Your saved races, classes, subclasses, backgrounds, feats, and spells are merged into this builder. Pick them from the normal dropdowns and starting-level choices.</p>
        </section>
      )}
      {error && (
        <section className="full-creator-progress-card" aria-label="Uploaded character options unavailable">
          <div className="full-creator-progress-heading"><span>Core rules loaded</span><strong>Uploads unavailable</strong></div>
          <p>The builder could not load uploaded options, so it has fallen back to the bundled core rules for now.</p>
        </section>
      )}
      <FullCharacterCreatorV2 {...props} />
    </>
  );
}
