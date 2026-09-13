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
