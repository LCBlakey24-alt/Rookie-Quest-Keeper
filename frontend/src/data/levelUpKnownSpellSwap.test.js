/**
 * 2014 Bard/Ranger/Sorcerer/Warlock keep a known-spell list and may replace one
 * spell each time they gain a level (PHB Spellcasting / Pact Magic: "you can
 * choose one of the spells you know and replace it with another spell").
 *
 * The level-up wizard offered nothing: its swap section was gated on
 * spellChoiceMode === 'prepared', which is only true for 2024 classes, and the
 * rule helper only ever allowed 2024. Mirrors known_spell_change_rule in
 * backend/data/class_progression.py.
 */
import fs from 'fs';
import path from 'path';
import {
  getLevelUpKnownReplacementRule,
  getLevelUpPreparedReplacementRule,
  knownSpellsForClass,
} from './levelUpSpellChangeRules';

const KNOWN_SWAP_CLASSES = ['Bard', 'Ranger', 'Sorcerer', 'Warlock'];

describe('getLevelUpKnownReplacementRule', () => {
  test('the four 2014 known casters may swap one spell', () => {
    KNOWN_SWAP_CLASSES.forEach((className) => {
      const rule = getLevelUpKnownReplacementRule({ className, edition: '2014' });
      expect(rule).toEqual({ cadence: 'level-up', maxReplacements: 1, allowed: true });
    });
  });

  test('classes without a known list get no allowance', () => {
    ['Wizard', 'Cleric', 'Druid', 'Paladin', 'Fighter', ''].forEach((className) => {
      expect(getLevelUpKnownReplacementRule({ className, edition: '2014' }).allowed).toBe(false);
    });
  });

  test('2024 is handled by the prepared rule instead, never both', () => {
    KNOWN_SWAP_CLASSES.forEach((className) => {
      const known = getLevelUpKnownReplacementRule({ className, edition: '2024' });
      const prepared = getLevelUpPreparedReplacementRule({ className, edition: '2024' });
      expect(known.allowed).toBe(false);
      // Ranger swaps on a long rest in 2024, the other three on level-up --
      // either way the known rule must stay out of it.
      expect(known.allowed && prepared.allowed).toBe(false);
    });
  });

  test('2014 prepared casters are not given a known-spell swap', () => {
    ['Cleric', 'Druid', 'Paladin'].forEach((className) => {
      expect(getLevelUpKnownReplacementRule({ className, edition: '2014' }).allowed).toBe(false);
    });
  });

  test('a server-supplied rule overrides the local table', () => {
    const preflight = { progression_reference: { known_spell_change: { cadence: 'level-up', max_replacements: 2 } } };
    expect(getLevelUpKnownReplacementRule({ className: 'Warlock', edition: '2014', preflight })).toEqual({
      cadence: 'level-up',
      maxReplacements: 2,
      allowed: true,
    });
  });

  test('a server rule with no allowance closes the swap', () => {
    const preflight = { progression_reference: { known_spell_change: { cadence: 'manual', max_replacements: 0 } } };
    expect(getLevelUpKnownReplacementRule({ className: 'Warlock', edition: '2014', preflight }).allowed).toBe(false);
  });

  test('a null max_replacements is treated as none, not as unlimited', () => {
    const preflight = { progression_reference: { known_spell_change: { cadence: 'level-up', max_replacements: null } } };
    expect(getLevelUpKnownReplacementRule({ className: 'Warlock', edition: '2014', preflight }).allowed).toBe(false);
  });

  test('an unknown edition string is treated as 2014', () => {
    expect(getLevelUpKnownReplacementRule({ className: 'Warlock', edition: '' }).allowed).toBe(true);
  });
});

describe('knownSpellsForClass', () => {
  const character = {
    spells_known: [
      { name: 'Hex', sourceClass: 'Warlock' },
      { name: 'Cure Wounds', sourceClass: 'Cleric' },
      { name: 'Armor of Agathys' },
    ],
  };

  test('it returns this class spells plus untagged legacy ones', () => {
    expect(knownSpellsForClass(character, 'Warlock').map((s) => s.name)).toEqual(['Hex', 'Armor of Agathys']);
  });

  test('it excludes another class spells in a multiclass list', () => {
    expect(knownSpellsForClass(character, 'Warlock').map((s) => s.name)).not.toContain('Cure Wounds');
  });

  test('it tolerates a character with no spells', () => {
    expect(knownSpellsForClass({}, 'Warlock')).toEqual([]);
    expect(knownSpellsForClass(undefined, 'Warlock')).toEqual([]);
  });
});

describe('the level-up wizard offers the swap to known casters', () => {
  const WIZARD = fs.readFileSync(path.join(__dirname, '..', 'components', 'LevelUpWizard.js'), 'utf8');

  test('the swap section is no longer gated on prepared mode alone', () => {
    expect(WIZARD).toContain('const canReplaceSpell = canReplacePrepared || canReplaceKnown');
  });

  test('the known path requires the known rule and a non-empty list', () => {
    expect(WIZARD).toContain("spellChoiceMode === 'known'");
    expect(WIZARD).toContain('knownReplacementRule.allowed');
    expect(WIZARD).toContain('knownReplaceableSpells.length > 0');
  });

  test('the picker lists the spells belonging to the active scope', () => {
    expect(WIZARD).toContain('replaceableSpells.map');
  });

  test('the wording follows the scope rather than always saying prepared', () => {
    expect(WIZARD).toContain('Optional {replacementScope}-spell replacement');
    expect(WIZARD).not.toContain('Optional prepared-spell replacement');
  });

  test('a multiclass level-up still offers no swap', () => {
    expect(WIZARD).toContain('const canReplaceKnown = !isMulticlass');
  });
});
