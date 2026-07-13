import { useCallback, useEffect, useMemo, useState } from 'react';

import apiClient from '@/lib/apiClient';

const asArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [value];
};

const textOf = (value) => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return String(value || '');
  return [value.name || value.title, value.description || value.text || value.summary].filter(Boolean).join(' — ');
};

const asName = (value) => {
  if (typeof value === 'string') return value;
  return value?.name || value?.title || '';
};

const hitDieNumber = (value, fallback = 8) => {
  const match = String(value || '').match(/d?(6|8|10|12)/i);
  return match ? Number(match[1]) : Number(value || fallback) || fallback;
};

const toFeatureMap = (features = []) => {
  const out = {};
  asArray(features).forEach((feature) => {
    const level = Math.max(1, Math.min(20, Number(feature?.level || 1)));
    const label = textOf(feature);
    if (!label) return;
    out[level] = [...(out[level] || []), label];
  });
  return out;
};

const toSubraceMap = (subraces = []) => {
  if (!Array.isArray(subraces) && typeof subraces === 'object' && subraces) {
    return Object.fromEntries(Object.entries(subraces).map(([name, data]) => [name, {
      ...data,
      asi2014: data?.asi2014 || data?.ability_bonuses || data?.abilityBonuses || {},
      traits: asArray(data?.traits).map(textOf),
    }]));
  }

  return Object.fromEntries(asArray(subraces).map((subrace) => {
    const name = asName(subrace);
    return [name, {
      description: subrace?.description || '',
      speed: Number(subrace?.speed || 0) || undefined,
      asi2014: subrace?.asi2014 || subrace?.ability_bonuses || subrace?.abilityBonuses || {},
      traits: asArray(subrace?.traits).map(textOf),
    }];
  }).filter(([name]) => name));
};

export function normaliseRaceOption(option = {}) {
  return {
    description: option.description || '',
    size: option.size || 'Medium',
    speed: Number(option.speed || 30),
    asi2014: option.asi2014 || option.ability_bonuses || option.abilityBonuses || {},
    traits: asArray(option.traits).map(textOf),
    languages: asArray(option.languages).map(textOf),
    subraces: toSubraceMap(option.subraces),
    source: option.source_label || option.source || 'Uploaded',
    sourceScope: option.source_scope || 'personal',
    rulesetId: option.ruleset_id || option.rulesetId || '',
    isHomebrew: Boolean(option.is_homebrew ?? true),
  };
}

export function normaliseClassOption(option = {}) {
  const skillChoices = option.skill_choices || option.skillChoices || [];
  return {
    description: option.description || '',
    hitDie: hitDieNumber(option.hit_die || option.hitDie, 8),
    primaryAbility: option.primary_ability || option.primaryAbility || '',
    savingThrows: asArray(option.saving_throw_proficiencies || option.savingThrows),
    armorProficiencies: asArray(option.armor_proficiencies || option.armorProficiencies),
    weaponProficiencies: asArray(option.weapon_proficiencies || option.weaponProficiencies),
    toolProficiencies: asArray(option.tool_proficiencies || option.toolProficiencies),
    skillChoices,
    skillCount: Number(option.skill_count || option.skillCount || 0),
    startingEquipment: asArray(option.starting_equipment || option.startingEquipment),
    features: toFeatureMap(option.features),
    subclasses: [],
    spellcasting: option.spellcasting || null,
    source: option.source_label || option.source || 'Uploaded',
    sourceScope: option.source_scope || 'personal',
    rulesetId: option.ruleset_id || option.rulesetId || '',
    isHomebrew: Boolean(option.is_homebrew ?? true),
  };
}

export function normaliseBackgroundOption(option = {}) {
  return {
    description: option.description || '',
    skillProficiencies: asArray(option.skill_proficiencies || option.skillProficiencies),
    toolProficiencies: asArray(option.tool_proficiencies || option.toolProficiencies),
    languages: Number(option.languages || 0),
    equipment: asArray(option.equipment),
    featureName: option.feature_name || option.featureName || '',
    featureDescription: option.feature_description || option.featureDescription || '',
    originFeat2024: option.origin_feat_2024 || option.originFeat2024 || '',
    source: option.source_label || option.source || 'Uploaded',
    sourceScope: option.source_scope || 'personal',
    rulesetId: option.ruleset_id || option.rulesetId || '',
    isHomebrew: Boolean(option.is_homebrew ?? true),
  };
}

export function buildMergedCharacterRules(core = {}, options = {}) {
  const races = { ...(core.races || {}) };
  const classes = { ...(core.classes || {}) };
  const backgrounds = { ...(core.backgrounds || {}) };
  const feats = [...asArray(core.feats)];

  asArray(options.races).forEach((race) => {
    const name = asName(race);
    if (name) races[name] = { ...(races[name] || {}), ...normaliseRaceOption(race) };
  });

  asArray(options.classes).forEach((klass) => {
    const name = asName(klass);
    if (name) classes[name] = { ...(classes[name] || {}), ...normaliseClassOption(klass) };
  });

  asArray(options.subclasses).forEach((subclass) => {
    const parent = subclass.parent_class || subclass.parentClass;
    const name = asName(subclass);
    if (!parent || !name) return;
    if (!classes[parent]) classes[parent] = normaliseClassOption({ name: parent, source: 'Uploaded placeholder' });
    const current = asArray(classes[parent].subclasses).map(asName);
    if (!current.includes(name)) classes[parent] = { ...classes[parent], subclasses: [...current, name] };
  });

  asArray(options.backgrounds).forEach((background) => {
    const name = asName(background);
    if (name) backgrounds[name] = { ...(backgrounds[name] || {}), ...normaliseBackgroundOption(background) };
  });

  asArray(options.feats).forEach((feat) => {
    const name = asName(feat);
    if (!name || feats.some((existing) => asName(existing) === name)) return;
    feats.push({
      ...feat,
      name,
      source: feat.source_label || feat.source || 'Uploaded',
      sourceScope: feat.source_scope || 'personal',
      isHomebrew: Boolean(feat.is_homebrew ?? true),
    });
  });

  return { races, classes, backgrounds, feats };
}

export default function usePlayerRulesOptions({ edition, campaignId, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (edition) params.set('edition', edition);
    if (campaignId) params.set('campaign_id', campaignId);
    const suffix = params.toString();
    return `/player/rules/options${suffix ? `?${suffix}` : ''}`;
  }, [edition, campaignId]);

  const refresh = useCallback(async () => {
    if (!enabled) return null;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(query);
      setData(response.data || null);
      return response.data || null;
    } catch (nextError) {
      setError(nextError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled, query]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!enabled) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(query);
        if (!cancelled) setData(response.data || null);
      } catch (nextError) {
        if (!cancelled) setError(nextError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [enabled, query]);

  return {
    options: data || {},
    counts: data?.counts || {},
    hasCustomContent: Boolean(data?.has_custom_content),
    loading,
    error,
    refresh,
  };
}
