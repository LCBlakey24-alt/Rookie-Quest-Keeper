import { getClassResourceRules } from './classResourceRules';
import { resourceActionCards, resourceValue } from './actionEconomyCards';

const resourcesFor = (character) => getClassResourceRules(character).map((rule) => resourceValue(character, rule));

const channelCards = (character, spendResource = jest.fn()) => resourceActionCards(
  character,
  resourcesFor(character),
  { spendResource },
).action.filter((card) => card.title.includes('Channel Divinity'));

describe('Channel Divinity action cards', () => {
  test('2014 Cleric / Paladin multiclass keeps one shared Channel Divinity action', () => {
    const character = {
      character_class: 'Cleric',
      level: 9,
      rules_edition: '2014',
      class_levels: { Cleric: 6, Paladin: 3 },
      resources: {
        channel_divinity: { label: 'Channel Divinity', current: 1, remaining: 1, max: 2, restore: 'short-rest' },
      },
    };

    expect(channelCards(character).map((card) => card.title)).toEqual(['Channel Divinity']);
  });

  test('2024 Cleric / Paladin multiclass exposes both scoped Channel Divinity pools', () => {
    const spendResource = jest.fn();
    const character = {
      character_class: 'Cleric',
      level: 9,
      rules_edition: '2024',
      class_levels: { Cleric: 6, Paladin: 3 },
      resources: {
        cleric_channel_divinity: {
          label: 'Cleric Channel Divinity', current: 2, remaining: 2, max: 3, restore: 'long-rest', short_rest_restore: 1,
        },
        paladin_channel_divinity: {
          label: 'Paladin Channel Divinity', current: 1, remaining: 1, max: 2, restore: 'long-rest', short_rest_restore: 1,
        },
      },
    };

    const cards = channelCards(character, spendResource);

    expect(cards.map((card) => card.title)).toEqual([
      'Cleric Channel Divinity',
      'Paladin Channel Divinity',
    ]);
    expect(cards[0].description).toContain('2/3');
    expect(cards[1].description).toContain('1/2');

    cards[0].onClick();
    cards[1].onClick();

    expect(spendResource).toHaveBeenNthCalledWith(1, 'cleric_channel_divinity', 'Cleric Channel Divinity');
    expect(spendResource).toHaveBeenNthCalledWith(2, 'paladin_channel_divinity', 'Paladin Channel Divinity');
  });

  test('single-class 2024 Cleric still uses the normal Channel Divinity action', () => {
    const character = {
      character_class: 'Cleric',
      level: 6,
      rules_edition: '2024',
      resources: {
        channel_divinity: { label: 'Channel Divinity', current: 3, remaining: 3, max: 3, restore: 'long-rest', short_rest_restore: 1 },
      },
    };

    expect(channelCards(character).map((card) => card.title)).toEqual(['Channel Divinity']);
  });
});


describe('Variable-cost resource action cards', () => {
  test('Sorcery Point actions ask for an amount instead of silently spending one point', () => {
    const spendResource = jest.fn();
    const character = {
      character_class: 'Sorcerer',
      level: 5,
      class_levels: { Sorcerer: 5 },
      resources: {
        sorcery_points: {
          label: 'Sorcery Points',
          current: 4,
          remaining: 4,
          max: 5,
          restore: 'long-rest',
        },
      },
    };

    const cards = resourceActionCards(character, resourcesFor(character), { spendResource }).bonus;
    const metamagic = cards.find(card => card.title === 'Metamagic');
    const conversion = cards.find(card => card.title === 'Convert Sorcery Points');

    expect(metamagic).toMatchObject({
      variableCost: true,
      resourceKey: 'sorcery_points',
      current: 4,
      max: 5,
    });
    expect(conversion.variableCost).toBe(true);
    expect(metamagic.onClick).toBeUndefined();

    metamagic.onSpend(3);
    conversion.onSpend(2);

    expect(spendResource).toHaveBeenNthCalledWith(1, 'sorcery_points', 'Metamagic', 3);
    expect(spendResource).toHaveBeenNthCalledWith(2, 'sorcery_points', 'Convert Sorcery Points', 2);
  });

  test('Lay on Hands can spend the chosen number of healing-pool points', () => {
    const spendResource = jest.fn();
    const character = {
      character_class: 'Paladin',
      level: 4,
      class_levels: { Paladin: 4 },
      resources: {
        lay_on_hands: {
          label: 'Lay on Hands',
          current: 13,
          remaining: 13,
          max: 20,
          restore: 'long-rest',
        },
      },
    };

    const layOnHands = resourceActionCards(character, resourcesFor(character), { spendResource }).action
      .find(card => card.title === 'Lay on Hands');

    expect(layOnHands).toMatchObject({
      variableCost: true,
      resourceKey: 'lay_on_hands',
      current: 13,
      max: 20,
    });

    layOnHands.onSpend(7);
    expect(spendResource).toHaveBeenCalledWith('lay_on_hands', 'Lay on Hands', 7);
  });

  test('fixed-cost resource actions keep their one-tap spend behavior', () => {
    const spendResource = jest.fn();
    const character = {
      character_class: 'Monk',
      level: 5,
      class_levels: { Monk: 5 },
      resources: {
        ki: {
          label: 'Ki',
          current: 3,
          remaining: 3,
          max: 5,
          restore: 'short-rest',
        },
      },
    };

    const flurry = resourceActionCards(character, resourcesFor(character), { spendResource }).bonus
      .find(card => card.title === 'Flurry of Blows');

    expect(flurry.variableCost).toBeUndefined();
    flurry.onClick();
    expect(spendResource).toHaveBeenCalledWith('ki', 'Flurry of Blows');
  });

  test('variable spend requests are clamped to the remaining resource', () => {
    const spendResource = jest.fn();
    const character = {
      character_class: 'Paladin',
      level: 2,
      class_levels: { Paladin: 2 },
      resources: {
        lay_on_hands: {
          label: 'Lay on Hands',
          current: 3,
          remaining: 3,
          max: 10,
          restore: 'long-rest',
        },
      },
    };

    const layOnHands = resourceActionCards(character, resourcesFor(character), { spendResource }).action
      .find(card => card.title === 'Lay on Hands');

    layOnHands.onSpend(99);
    expect(spendResource).toHaveBeenNthCalledWith(1, 'lay_on_hands', 'Lay on Hands', 3);

    layOnHands.onSpend(1.5);
    expect(spendResource).toHaveBeenNthCalledWith(2, 'lay_on_hands', 'Lay on Hands', 1);
  });
});


describe('Resource action unlock timing', () => {
  test.each([
    ['Monk', 1, ['Flurry of Blows', 'Patient Defense', 'Step of the Wind']],
    ['Druid', 1, ['Wild Shape']],
    ['Sorcerer', 1, ['Metamagic', 'Convert Sorcery Points']],
  ])('%s level %i does not show actions for a resource it has not unlocked', (className, level, forbiddenTitles) => {
    const character = {
      character_class: className,
      level,
      class_levels: { [className]: level },
      resources: {},
    };
    const cards = resourceActionCards(character, resourcesFor(character));
    const titles = [...cards.action, ...cards.bonus, ...cards.reaction].map(card => card.title);

    forbiddenTitles.forEach(title => expect(titles).not.toContain(title));
  });

  test('Monk level 2 exposes Ki-backed actions once the resource exists', () => {
    const character = {
      character_class: 'Monk',
      level: 2,
      class_levels: { Monk: 2 },
      resources: {},
    };
    const cards = resourceActionCards(character, resourcesFor(character));

    expect(cards.bonus.map(card => card.title)).toEqual(expect.arrayContaining([
      'Flurry of Blows',
      'Patient Defense',
      'Step of the Wind',
    ]));
  });
});


describe('Rogue action-economy cards', () => {
  test('primary Rogue gets one Cunning Action card at level 2+', () => {
    const character = {
      character_class: 'Rogue',
      level: 3,
      class_levels: { Rogue: 3 },
      resources: {},
    };
    const cards = resourceActionCards(character, resourcesFor(character));
    expect(cards.bonus.filter(card => card.title === 'Cunning Action')).toHaveLength(1);
  });

  test('secondary Rogue multiclass gets Cunning Action from Rogue class level', () => {
    const character = {
      character_class: 'Wizard',
      level: 10,
      class_levels: { Wizard: 8, Rogue: 2 },
      resources: {},
    };
    const cards = resourceActionCards(character, resourcesFor(character));
    expect(cards.other.map(card => card.title)).toContain('Sneak Attack');
    expect(cards.bonus.map(card => card.title)).toContain('Cunning Action');
  });

  test('a character with no Rogue levels does not inherit Rogue actions from total level', () => {
    const character = {
      character_class: 'Wizard',
      level: 10,
      class_levels: { Wizard: 10 },
      resources: {},
    };
    const cards = resourceActionCards(character, resourcesFor(character));
    expect(cards.other.map(card => card.title)).not.toContain('Sneak Attack');
    expect(cards.bonus.map(card => card.title)).not.toContain('Cunning Action');
  });
});


describe('Action-cost classification', () => {
  test('2014 Lay on Hands is an Action', () => {
    const character = {
      character_class: 'Paladin',
      level: 2,
      rules_edition: '2014',
      class_levels: { Paladin: 2 },
      resources: { lay_on_hands: { label: 'Lay on Hands', current: 10, max: 10 } },
    };
    const cards = resourceActionCards(character, resourcesFor(character));
    expect(cards.action.map(card => card.title)).toContain('Lay on Hands');
    expect(cards.bonus.map(card => card.title)).not.toContain('Lay on Hands');
  });

  test('2024 Lay on Hands is a Bonus Action', () => {
    const character = {
      character_class: 'Paladin',
      level: 2,
      rules_edition: '2024',
      class_levels: { Paladin: 2 },
      resources: { lay_on_hands: { label: 'Lay on Hands', current: 10, max: 10 } },
    };
    const cards = resourceActionCards(character, resourcesFor(character));
    expect(cards.bonus.map(card => card.title)).toContain('Lay on Hands');
    expect(cards.action.map(card => card.title)).not.toContain('Lay on Hands');
  });

  test('Indomitable is a triggered feature rather than a Reaction', () => {
    const character = {
      character_class: 'Fighter',
      level: 9,
      class_levels: { Fighter: 9 },
      resources: { indomitable: { label: 'Indomitable', current: 1, max: 1 } },
    };
    const cards = resourceActionCards(character, resourcesFor(character));
    expect(cards.other.map(card => card.title)).toContain('Indomitable');
    expect(cards.reaction.map(card => card.title)).not.toContain('Indomitable');
  });

  test('Sneak Attack is a triggered feature rather than a separate Action', () => {
    const character = {
      character_class: 'Rogue',
      level: 3,
      class_levels: { Rogue: 3 },
      resources: {},
    };
    const cards = resourceActionCards(character, resourcesFor(character));
    expect(cards.other.map(card => card.title)).toContain('Sneak Attack');
    expect(cards.action.map(card => card.title)).not.toContain('Sneak Attack');
  });

  test('Arcane Recovery is a Short Rest feature and no longer spends from a combat Action card', () => {
    const character = {
      character_class: 'Wizard',
      level: 4,
      class_levels: { Wizard: 4 },
      resources: {
        arcane_recovery: { label: 'Arcane Recovery', current: 1, max: 1 },
      },
    };
    const cards = resourceActionCards(character, resourcesFor(character));
    const recovery = cards.other.find(card => card.title === 'Arcane Recovery');
    expect(recovery).toBeTruthy();
    expect(recovery.onClick).toBeUndefined();
    expect(recovery.description).toContain('Short Rest');
    expect(cards.action.map(card => card.title)).not.toContain('Arcane Recovery');
  });
});
