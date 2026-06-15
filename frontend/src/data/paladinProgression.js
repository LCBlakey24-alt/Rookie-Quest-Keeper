import { SPELL_SLOT_PROGRESSION } from './editionRules';
export const PALADIN_SUBCLASS_FEATURE_LEVELS = [3, 7, 15, 20];
export const PALADIN_ASI_LEVELS = [4, 8, 12, 16, 19];
export function normalisePaladinRulesEdition(edition = '2014') { return String(edition || '').includes('2024') ? '2024' : '2014'; }
export function getPaladinLayOnHandsPool(level = 1) { return Math.max(1, Number(level || 1)) * 5; }
export function getPaladinChannelDivinityUses(level = 1, edition = '2014', proficiencyBonus = 2) { const paladinLevel = Math.max(1, Number(level || 1)); if (paladinLevel < 3) return 0; return normalisePaladinRulesEdition(edition) === '2024' ? Math.max(2, Number(proficiencyBonus || 2)) : 1; }
export function getPaladinSpellSlots(level = 1) { return SPELL_SLOT_PROGRESSION.half[Math.max(1, Number(level || 1))] || SPELL_SLOT_PROGRESSION.half[1]; }
export function getPaladinHighestSpellLevel(level = 1) { const slots = getPaladinSpellSlots(level); const index = slots.map(Boolean).lastIndexOf(true); return index >= 0 ? index + 1 : 0; }
const asi = level => ({ level, key: `asi_${level}`, name: level === 19 ? 'Epic Boon / Ability Score Improvement' : 'Ability Score Improvement / Feat', type: 'choice', choiceType: level === 19 ? 'epic_boon_or_asi' : 'asi_or_feat' });
const PALADIN_FEATURES_2014 = [
  { level: 1, key: 'divine_sense', name: 'Divine Sense', type: 'action' }, { level: 1, key: 'lay_on_hands', name: 'Lay on Hands', type: 'resource' },
  { level: 2, key: 'fighting_style', name: 'Fighting Style', type: 'choice', choiceType: 'fighting_style' }, { level: 2, key: 'spellcasting', name: 'Spellcasting', type: 'spellcasting' }, { level: 2, key: 'divine_smite', name: 'Divine Smite', type: 'action_modifier' },
  { level: 3, key: 'divine_health', name: 'Divine Health', type: 'passive' }, { level: 3, key: 'sacred_oath', name: 'Sacred Oath', type: 'choice', choiceType: 'subclass' }, { level: 3, key: 'channel_divinity', name: 'Channel Divinity', type: 'resource' },
  { level: 5, key: 'extra_attack', name: 'Extra Attack', type: 'passive' }, { level: 6, key: 'aura_of_protection', name: 'Aura of Protection', type: 'aura' }, { level: 10, key: 'aura_of_courage', name: 'Aura of Courage', type: 'aura' },
  { level: 11, key: 'improved_divine_smite', name: 'Improved Divine Smite', type: 'passive' }, { level: 14, key: 'cleansing_touch', name: 'Cleansing Touch', type: 'action' }, { level: 18, key: 'aura_improvements', name: 'Aura Improvements', type: 'aura' }, ...PALADIN_ASI_LEVELS.map(asi),
].sort((a,b)=>a.level-b.level||a.name.localeCompare(b.name));
const PALADIN_FEATURES_2024 = [
  { level: 1, key: 'lay_on_hands', name: 'Lay on Hands', type: 'resource' }, { level: 1, key: 'spellcasting', name: 'Spellcasting', type: 'spellcasting' }, { level: 1, key: 'weapon_mastery_2', name: 'Weapon Mastery', type: 'choice', choiceType: 'weapon_mastery', choices: 2 },
  { level: 2, key: 'fighting_style', name: 'Fighting Style', type: 'choice', choiceType: 'fighting_style' }, { level: 2, key: 'divine_smite', name: 'Divine Smite', type: 'bonus_action' },
  { level: 3, key: 'channel_divinity', name: 'Channel Divinity', type: 'resource' }, { level: 3, key: 'paladin_subclass', name: 'Paladin Subclass', type: 'choice', choiceType: 'subclass' },
  { level: 5, key: 'extra_attack', name: 'Extra Attack', type: 'passive' }, { level: 5, key: 'faithful_steed', name: 'Faithful Steed', type: 'passive' }, { level: 6, key: 'aura_of_protection', name: 'Aura of Protection', type: 'aura' },
  { level: 9, key: 'abjure_foes', name: 'Abjure Foes', type: 'action' }, { level: 10, key: 'aura_of_courage', name: 'Aura of Courage', type: 'aura' }, { level: 11, key: 'radiant_strikes', name: 'Radiant Strikes', type: 'passive' },
  { level: 14, key: 'restoring_touch', name: 'Restoring Touch', type: 'action' }, { level: 18, key: 'aura_expansion', name: 'Aura Expansion', type: 'aura' }, { level: 20, key: 'epic_boon', name: 'Epic Boon', type: 'capstone' }, ...PALADIN_ASI_LEVELS.map(asi),
].sort((a,b)=>a.level-b.level||a.name.localeCompare(b.name));
export function getPaladinProgression(edition='2014') { return normalisePaladinRulesEdition(edition)==='2024'?PALADIN_FEATURES_2024:PALADIN_FEATURES_2014; }
export function getPaladinFeaturesForLevel(level=1, edition='2014') { return getPaladinProgression(edition).filter(f=>f.level===Math.max(1,Number(level||1))); }
export function getActivePaladinFeatures(level=1, edition='2014') { return getPaladinProgression(edition).filter(f=>f.level<=Math.max(1,Number(level||1))); }
export function getPaladinChoicesForLevel(level=1, edition='2014') { return getPaladinFeaturesForLevel(level, edition).filter(f=>f.type==='choice'); }
export function getNextPaladinFeatures(level=1, edition='2014') { return getPaladinProgression(edition).filter(f=>f.level>Math.max(1,Number(level||1))).slice(0,3); }
export function getPaladinProgressionSummary(level=1, edition='2014', proficiencyBonus=2) { const paladinLevel=Math.max(1,Number(level||1)); return { edition: normalisePaladinRulesEdition(edition), level: paladinLevel, layOnHandsPool: getPaladinLayOnHandsPool(paladinLevel), channelDivinityUses: getPaladinChannelDivinityUses(paladinLevel, edition, proficiencyBonus), spellSlots: getPaladinSpellSlots(paladinLevel), highestSpellLevel: getPaladinHighestSpellLevel(paladinLevel), currentLevelFeatures: getPaladinFeaturesForLevel(paladinLevel, edition), activeFeatures: getActivePaladinFeatures(paladinLevel, edition), choicesThisLevel: getPaladinChoicesForLevel(paladinLevel, edition), nextFeatures: getNextPaladinFeatures(paladinLevel, edition) }; }
