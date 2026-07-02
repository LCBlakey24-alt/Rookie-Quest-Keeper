import {
  CREATOR_CASTER_CLASSES,
  auditCreatorSpellSelection,
  buildCreatorSpellSelectionReport,
  getCreatorSpellPools,
  getCreatorSpellRequirements,
  spellMatchesCreatorSearch,
} from './creatorSpellSelectionAudit';

describe('creator spell selection audit', () => {
  test.each(CREATOR_CASTER_CLASSES)('%s has creator spell requirements and available pools', (className) => {
    const requirements = getCreatorSpellRequirements(className);
    const pools = getCreatorSpellPools(className);

    expect(requirements.cantrips + requirements.spells).toBeGreaterThan(0);
    if (requirements.cantrips > 0) expect(pools.cantrips.length).toBeGreaterThan(0);
    if (requirements.spells > 0) expect(pools.levelOneSpells.length).toBeGreaterThan(0);
  });

  test('creator spell search matches names, schools, descriptions, damage and healing text', () => {
    expect(spellMatchesCreatorSearch({ name: 'Cure Wounds', school: 'Evocation', healing: '1d8+mod' }, 'healing')).toBe(true);
    expect(spellMatchesCreatorSearch({ name: 'Magic Missile', school: 'Evocation', damage: '3d4+3' }, 'damage')).toBe(true);
    expect(spellMatchesCreatorSearch({ name: 'Detect Magic', school: 'Divination', description: 'Sense magic nearby' }, 'divination')).toBe(true);
    expect(spellMatchesCreatorSearch({ name: 'Shield', school: 'Abjuration' }, 'fire')).toBe(false);
  });

  test('creator spell audit passes for the supported level-one caster classes', () => {
    const report = buildCreatorSpellSelectionReport(auditCreatorSpellSelection());

    expect(report.failed).toBe(0);
    expect(report.text).toContain('No creator spell picker problems found.');
  });

  test('creator spell report points to classes with missing spell pools', () => {
    const report = buildCreatorSpellSelectionReport([
      {
        className: 'Wizard',
        requirements: { cantrips: 3, spells: 6, type: 'spellbook' },
        pools: { cantrips: [], levelOneSpells: [], total: 0 },
        problems: ['Wizard: creator asks for cantrips but no cantrips are available.'],
      },
    ]);

    expect(report.failed).toBe(1);
    expect(report.text).toContain('Wizard');
    expect(report.text).toContain('no cantrips are available');
  });
});
