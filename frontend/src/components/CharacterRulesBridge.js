import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import FullCharacterCreatorV2 from '@/components/FullCharacterCreatorV2';
import { BACKGROUNDS, CLASSES, RACES, getProficiencyBonus } from '@/data/characterRules5e';
import { SPELLCASTING_CLASSES, getSpellSlotsForCaster } from '@/data/spellDatabase';
import { buildInitialClassResources } from '@/data/classResourceRules';
import apiClient from '@/lib/apiClient';
import usePlayerRulesOptions, { buildMergedCharacterRules } from '@/hooks/usePlayerRulesOptions';
import './FullCharacterCreatorV2.css';
import './FullCharacterCreatorFlow.css';

const DRAFT_KEY = 'rqk.full_character_creator_v2.safe';
const LEVEL_KEY = 'rqk.full_character_creator_v2.starting_level';
const SUBCLASS_KEY = 'rqk.full_character_creator_v2.starting_subclass';
const LEVELS = Array.from({ length: 20 }, (_, index) => index + 1);
const SUBCLASS_LEVEL_2014 = { Barbarian: 3, Bard: 3, Cleric: 1, Druid: 2, Fighter: 3, Monk: 3, Paladin: 3, Ranger: 3, Rogue: 3, Sorcerer: 1, Warlock: 1, Wizard: 2 };

const arr = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const displayName = (value) => typeof value === 'string' ? value : value?.name || value?.title || String(value || '');
const clampLevel = (value) => Math.max(1, Math.min(20, Number.parseInt(value, 10) || 1));
const mod = (score = 10) => Math.floor(((Number(score) || 10) - 10) / 2);
const hitDieNumber = (value, fallback = 8) => {
  const match = String(value || '').match(/d?(6|8|10|12)/i);
  return match ? Number(match[1]) : Number(value || fallback) || fallback;
};

function useCampaignIdFromQuery() {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search).get('campaign_id') || '', [location.search]);
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

function readBuilderDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {};
  } catch {
    return {};
  }
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

function uploadedSubclassFeaturesUpTo(options, className, subclassName, level) {
  if (!subclassName) return [];
  return arr(options?.subclasses).flatMap((subclass) => {
    const parent = subclass.parent_class || subclass.parentClass;
    const name = displayName(subclass);
    if (parent !== className || name !== subclassName) return [];
    return arr(subclass.features).filter((feature) => Number(feature?.level || 1) <= level).map((feature) => ({
      name: featureText(feature),
      description: featureDescription(feature, `${subclassName} feature gained at level ${feature?.level || 'this level'}.`),
      source: subclass.source_label || subclass.source || 'Uploaded subclass',
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

function withStartingLevel(payload, { targetLevel, selectedSubclass, options }) {
  if (!payload || typeof payload !== 'object') return payload;
  const className = payload.character_class;
  const classData = CLASSES[className] || {};
  const level = clampLevel(targetLevel || payload.level || 1);
  const hitDie = hitDieNumber(classData.hitDie || payload.hit_die || payload.hit_dice, 8);
  const subclassName = selectedSubclass || payload.subclass || '';

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

  const enhanced = {
    ...payload,
    level,
    subclass: subclassName,
    proficiency_bonus: getProficiencyBonus(level),
    hit_dice: `${level}d${hitDie}`,
    hit_dice_remaining: level,
    max_hit_points: averageHitPoints(level, hitDie, payload.constitution),
    current_hit_points: averageHitPoints(level, hitDie, payload.constitution),
    class_features: features,
  };

  const spellcasting = SPELLCASTING_CLASSES[className];
  if (spellcasting) {
    const slots = getSpellSlotsForCaster(spellcasting, level);
    enhanced.spell_slots = slots;
    enhanced.spell_slots_remaining = slots;
  }

  enhanced.resources = buildInitialClassResources(enhanced);
  return enhanced;
}

export default function CharacterRulesBridge(props) {
  const campaignId = useCampaignIdFromQuery();
  const { options, loading, error, hasCustomContent, counts } = usePlayerRulesOptions({ campaignId });
  const [builderDraft, setBuilderDraft] = useState(readBuilderDraft);
  const [targetLevel, setTargetLevel] = useState(() => clampLevel(sessionStorage.getItem(LEVEL_KEY) || 1));
  const [selectedSubclass, setSelectedSubclass] = useState(() => sessionStorage.getItem(SUBCLASS_KEY) || '');

  const mergedRules = useMemo(() => buildMergedCharacterRules({
    races: RACES,
    classes: CLASSES,
    backgrounds: BACKGROUNDS,
  }, options), [options]);

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

  useEffect(() => {
    sessionStorage.setItem(LEVEL_KEY, String(targetLevel));
  }, [targetLevel]);

  useEffect(() => {
    if (selectedSubclass) sessionStorage.setItem(SUBCLASS_KEY, selectedSubclass);
    else sessionStorage.removeItem(SUBCLASS_KEY);
  }, [selectedSubclass]);

  const currentClassName = builderDraft.characterClass || 'Fighter';
  const currentEdition = builderDraft.edition || '2014';
  const currentClassData = CLASSES[currentClassName] || {};
  const subclasses = arr(currentClassData.subclasses).map(displayName).filter(Boolean);
  const subclassLevel = subclassUnlockLevel(currentClassName, currentEdition, currentClassData);
  const needsSubclass = targetLevel >= subclassLevel && subclasses.length > 0;

  useEffect(() => {
    if (!needsSubclass) return;
    if (!selectedSubclass || !subclasses.includes(selectedSubclass)) {
      setSelectedSubclass(subclasses[0] || '');
    }
  }, [needsSubclass, selectedSubclass, subclasses.join('|')]);

  const enhancePayload = useCallback((payload) => withStartingLevel(payload, {
    targetLevel,
    selectedSubclass: needsSubclass ? selectedSubclass : payload?.subclass,
    options,
  }), [targetLevel, needsSubclass, selectedSubclass, options]);

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

  const visibleUploadedCount = ['races', 'classes', 'subclasses', 'backgrounds']
    .reduce((sum, key) => sum + Number(counts?.[key] || 0), 0);

  if (loading) {
    return (
      <main className="full-creator-page">
        <div className="full-creator-loading">Loading your character options…</div>
      </main>
    );
  }

  return (
    <>
      <section className="full-creator-progress-card" aria-label="Starting level controls">
        <div className="full-creator-progress-heading">
          <span>Starting level supervisor</span>
          <strong>Level {targetLevel}</strong>
        </div>
        <p>Build normally below. When you save, this pass upgrades the saved sheet to your chosen level with scaled HP, hit dice, proficiency bonus, spell slots, and available class features.</p>
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
              <select value={selectedSubclass} onChange={(event) => setSelectedSubclass(event.target.value)}>
                {subclasses.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
          )}
        </div>
        {targetLevel > 1 && <small>Higher-level spell choices and ASI/feat picks still need the dedicated level-up pass after this foundation.</small>}
      </section>

      {hasCustomContent && (
        <section className="full-creator-progress-card" aria-label="Uploaded character options loaded">
          <div className="full-creator-progress-heading">
            <span>Uploaded options active</span>
            <strong>{visibleUploadedCount} builder option{visibleUploadedCount === 1 ? '' : 's'} loaded</strong>
          </div>
          <p>Your saved races, classes, subclasses, and backgrounds are merged into this builder. Pick them from the normal dropdowns.</p>
        </section>
      )}
      {error && (
        <section className="full-creator-progress-card" aria-label="Uploaded character options unavailable">
          <div className="full-creator-progress-heading">
            <span>Core rules loaded</span>
            <strong>Uploads unavailable</strong>
          </div>
          <p>The builder could not load uploaded options, so it has fallen back to the bundled core rules for now.</p>
        </section>
      )}
      <FullCharacterCreatorV2 {...props} />
    </>
  );
}
