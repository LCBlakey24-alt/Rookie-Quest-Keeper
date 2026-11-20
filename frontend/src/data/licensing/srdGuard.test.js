/**
 * Guard: nothing outside the SRD can quietly become a built-in option.
 *
 * Every built-in spell and subclass must either be named in SRD 5.1 / 5.2.1
 * (srdNames.json, taken from the official documents) or be on the policy's
 * list of paid-book names, which pickers never offer. Adding a new built-in
 * name that is in neither list fails this test: check it against the SRD
 * first, or add it as homebrew instead.
 */
import srdNames from './srdNames.json';
import { NON_SRD_BUILTIN_SPELLS, isNonSrdBuiltInSubclass } from './builtInContentPolicy';
import { SPELL_DATABASE } from '../spellDatabase';
import { CLASSES } from '../characterRules5e';

const key = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const srdSpells = new Set(srdNames.spells.map(key));
const srdSubclasses = new Set(srdNames.subclasses.map(key));
const hiddenSpells = new Set(NON_SRD_BUILTIN_SPELLS.map(key));

describe('built-in content stays within the SRD', () => {
  test('every built-in spell is SRD or on the hidden paid-book list', () => {
    const unknown = Object.values(SPELL_DATABASE).flat()
      .map((spell) => spell.name)
      .filter((name) => !srdSpells.has(key(name)) && !hiddenSpells.has(key(name)));
    expect(unknown).toEqual([]);
  });

  test('no hidden spell is actually in the SRD', () => {
    expect(NON_SRD_BUILTIN_SPELLS.filter((name) => srdSpells.has(key(name)))).toEqual([]);
  });

  test('every built-in subclass is SRD, the custom slot, or on the hidden paid-book list', () => {
    const unknown = Object.values(CLASSES).flatMap((info) => info.subclasses || [])
      .map((option) => (typeof option === 'object' ? option.name || option.label : option))
      .filter((name) => !/custom/i.test(name))
      .filter((name) => !srdSubclasses.has(key(name)) && !isNonSrdBuiltInSubclass(name));
    expect(unknown).toEqual([]);
  });
});
