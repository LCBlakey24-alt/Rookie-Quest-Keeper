/**
 * One short line about a subclass, for choosing one at level up. The server
 * sends subclass names only ("Abjurer"); the local rules data already holds
 * a plain summary under a related name ("School of Abjuration").
 */
import { CLASS_FEATURES } from '@/data/classFeatures';
import { BARD_SUBCLASSES } from '@/data/bardSubclasses';
import { CLERIC_SUBCLASSES } from '@/data/clericSubclasses';
import { DRUID_SUBCLASSES } from '@/data/druidSubclasses';
import { MONK_SUBCLASSES } from '@/data/monkSubclasses';
import { RANGER_SUBCLASSES } from '@/data/rangerSubclasses';
import { SORCERER_SUBCLASSES } from '@/data/sorcererSubclasses';
import { WARLOCK_SUBCLASSES } from '@/data/warlockSubclasses';
import { WIZARD_SUBCLASSES } from '@/data/wizardSubclasses';

const LISTS = {
  bard: BARD_SUBCLASSES, cleric: CLERIC_SUBCLASSES, druid: DRUID_SUBCLASSES, monk: MONK_SUBCLASSES,
  ranger: RANGER_SUBCLASSES, sorcerer: SORCERER_SUBCLASSES, warlock: WARLOCK_SUBCLASSES, wizard: WIZARD_SUBCLASSES,
};

const FILLER = /\b(school|college|circle|path|oath|way|domain|of|the|archetype|patron|tradition|origin|conclave|order)\b/g;
const PLACEHOLDER = /^subclass option/i;

// The distinctive word: "School of Abjuration" -> "abjuration", "Abjurer" -> "abjurer".
function stem(name = '') {
  return String(name).toLowerCase().replace(FILLER, ' ').replace(/[^a-z ]/g, ' ').trim().split(/\s+/)[0] || '';
}

function sharedPrefix(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return i;
}

function candidates(className) {
  const key = String(className || '').toLowerCase();
  const fromFeatures = Object.entries(CLASS_FEATURES[key]?.subclasses || {})
    .map(([id, sub]) => ({ name: sub?.name || id, text: sub?.description }));
  const fromList = (Array.isArray(LISTS[key]) ? LISTS[key] : [])
    .map(sub => ({ name: sub.label || sub.value || sub.name, text: sub.summary || sub.description }));
  return [...fromList, ...fromFeatures].filter(c => c.name && c.text && !PLACEHOLDER.test(c.text));
}

/** A short plain summary for `name`, or '' if none is known. */
export function subclassBlurb(className, name) {
  const target = stem(name);
  if (!target) return '';
  let best = null;
  candidates(className).forEach((c) => {
    const s = stem(c.name);
    const score = s === target ? 99 : sharedPrefix(s, target);
    if (score >= 3 && (!best || score > best.score)) best = { score, text: c.text };
  });
  return best ? best.text : '';
}
