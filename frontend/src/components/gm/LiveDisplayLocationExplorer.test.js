import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import LiveDisplayLocationExplorer, { buildDisplayLocationTree, isPlayerVisibleShopItem, relatedNpcs } from './LiveDisplayLocationExplorer';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn() } }));

const world = { continents: [{
  id: 'continent-a', name: 'Tiacarta',
  regions: [{
    id: 'region-a', name: 'Northreach',
    settlements: [{
      id: 'town-a', name: 'Ironhaven', settlement_type: 'town',
      description: 'A busy market town', notes: 'GM SECRET: the dragon sleeps',
      places: [{
        id: 'smith-a', name: 'The Iron Anvil', place_type: 'blacksmith',
        description: 'A friendly smithy', owner: 'Mara the Smith',
        notes: 'GM SECRET: cursed sword',
        shop_inventory: [
          { name: 'Longsword', price: '15 gp', quantity: 2 },
          { name: 'Shield', price: '10 gp' },
          { name: 'Secret Blade', price: '999 gp', hidden: true },
          { name: 'Trap Key', price: '20 gp', gm_only: true },
          { name: 'Secret Potion', price: '500 gp', visibility: 'private' },
          { name: 'GM-Only Scroll', price: '1 gp', show_to_players: false },
        ],
      }],
    }],
  }],
}] };

beforeEach(() => {
  jest.clearAllMocks();
  apiClient.get.mockImplementation(url => Promise.resolve({
    data: url.endsWith('/world') ? world : [],
  }));
});

test('keeps identically named World Builder and Locations records distinct', () => {
  const tree = buildDisplayLocationTree(world, [{ id: 'saved-a', name: 'Ironhaven' }]);
  expect(tree.map(node => node.name)).toEqual(['World Builder', 'Saved Locations']);
  expect(tree[0].children[0].children[0].children[0].name).toBe('Ironhaven');
  expect(tree[1].children[0].key).toBe('saved-location:saved-a');
});

test('navigates from world to settlement and shop, revealing only explicitly selected public content', async () => {
  const onRevealScene = jest.fn();
  const onRevealImage = jest.fn();
  const onRevealNpcs = jest.fn();
  const onRevealShop = jest.fn();

  render(<LiveDisplayLocationExplorer
    campaignId="campaign-a"
    maps={[{ id: 'world-map', name: 'World Map', image_url: '/world.png' }]}
    npcs={[{ id: 'mara', name: 'Mara the Smith', public_description: 'Friendly owner', private_notes: 'GM secret' }]}
    onRevealScene={onRevealScene}
    onRevealImage={onRevealImage}
    onRevealNpcs={onRevealNpcs}
    onRevealShop={onRevealShop}
  />);

  const worldFolder = await screen.findByRole('button', { name: /World Builder/i });
  fireEvent.click(screen.getByRole('button', { name: /World Map/i }));
  expect(onRevealImage).toHaveBeenCalledWith('/world.png', 'World Map');

  fireEvent.click(worldFolder);
  fireEvent.click(screen.getByRole('button', { name: /Tiacarta/i }));
  fireEvent.click(screen.getByRole('button', { name: /Northreach/i }));
  fireEvent.click(screen.getByRole('button', { name: /Ironhaven/i }));
  fireEvent.click(screen.getByRole('button', { name: /The Iron Anvil/i }));
  expect(screen.getByTestId('location-shop-catalog')).toHaveTextContent('Longsword');
  expect(screen.getByTestId('location-shop-catalog')).toHaveTextContent('15 gp');
  expect(screen.getByTestId('location-shop-catalog')).toHaveTextContent('Stock: 2');
  fireEvent.click(screen.getByRole('button', { name: /Reveal Shop Stock/i }));
  expect(onRevealShop).toHaveBeenCalledWith(expect.objectContaining({
    name: 'The Iron Anvil',
    items: [
      { name: 'Longsword', price: '15 gp', quantity: 2 },
      { name: 'Shield', price: '10 gp' },
    ],
  }));
  expect(JSON.stringify(onRevealShop.mock.calls)).not.toMatch(/GM SECRET|cursed sword|Secret Blade|Trap Key|Secret Potion|GM-Only Scroll/i);
  expect(screen.getByTestId('location-linked-npcs')).toHaveTextContent('Mara the Smith');

  fireEvent.click(screen.getByRole('button', { name: 'Reveal Location' }));
  expect(onRevealScene).toHaveBeenCalledWith({
    name: 'The Iron Anvil', type: 'blacksmith', description: 'A friendly smithy',
  });
  expect(JSON.stringify(onRevealScene.mock.calls)).not.toMatch(/GM SECRET|cursed sword/i);
  fireEvent.click(screen.getByRole('button', { name: 'Reveal NPC' }));
  expect(onRevealNpcs).toHaveBeenCalledWith([expect.objectContaining({ id: 'mara' })]);
  fireEvent.click(screen.getByRole('button', { name: 'Back one location' }));
  expect(screen.getByRole('heading', { name: 'Ironhaven' })).toBeInTheDocument();
});

test('shows preserved data and an honest warning after refresh errors', async () => {
  let offline = false;
  apiClient.get.mockImplementation(url => offline
    ? Promise.reject(new Error('offline'))
    : Promise.resolve({ data: url.endsWith('/world') ? world : [] }));
  render(<LiveDisplayLocationExplorer campaignId="campaign-a" />);
  expect(await screen.findByRole('button', { name: /World Builder/i })).toBeInTheDocument();
  offline = true;
  fireEvent.click(screen.getByRole('button', { name: /Refresh Locations/i }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Previously loaded locations have been kept'));
  expect(screen.getByRole('button', { name: /World Builder/i })).toBeInTheDocument();
});


test('legacy visibility flags are checked before projecting shop stock', () => {
  expect(isPlayerVisibleShopItem({ name: 'Potion', price: '10 gp' })).toBe(true);
  for (const flag of [
    { hidden: true }, { is_hidden: 'true' }, { gm_only: true },
    { secret: true }, { private: true }, { visible: false },
    { is_visible: 'false' }, { player_visible: false },
    { show_to_players: false }, { visibility: 'GM-ONLY' },
    { visibility: 'private' },
  ]) {
    expect(isPlayerVisibleShopItem({ name: 'Hidden item', price: '99 gp', ...flag })).toBe(false);
  }
});


test('duplicate settlement names never let a foreign or name-only NPC appear in the wrong town', () => {
  const twinWorld = { continents: [{
    id: 'continent-twin', name: 'Continent', regions: [{
      id: 'region-twin', name: 'Region', settlements: [
        { id: 'town-a', name: 'Twinbrook', settlement_type: 'town' },
        { id: 'town-b', name: 'Twinbrook', settlement_type: 'town' },
      ],
    }],
  }] };
  const tree = buildDisplayLocationTree(twinWorld, [{ id: 'town-c', name: 'Twinbrook' }]);
  const region = tree[0].children[0].children[0];
  const townA = region.children[0];
  const townB = region.children[1];
  const candidates = [
    { id: 'npc-a', name: 'Guard A', settlement_id: 'town-a', location: 'Twinbrook' },
    { id: 'npc-b', name: 'Guard B', settlement_id: 'town-b', location: 'Twinbrook' },
    { id: 'npc-c', name: 'Old Guard', location: 'Twinbrook' },
    { id: 'npc-d', name: 'Guard with invalid ID', settlement_id: 'unknown', location: 'Twinbrook' },
  ];
  expect(relatedNpcs(townA, candidates, { tree }).map(npc => npc.id)).toEqual(['npc-a']);
  expect(relatedNpcs(townB, candidates, { tree }).map(npc => npc.id)).toEqual(['npc-b']);
  expect(relatedNpcs(tree[1].children[0], candidates, { tree })).toEqual([]);
});

test('legacy free-text NPC locations match only when the location name is unique', () => {
  const tree = buildDisplayLocationTree({
    continents: [{ id: 'c', name: 'Continent', regions: [
      { id: 'r', name: 'Region', settlements: [{ id: 'unique-town', name: 'Silverford' }] },
    ] }],
  });
  const selected = tree[0].children[0].children[0].children[0];
  expect(relatedNpcs(selected, [
    { id: 'legacy', name: 'Mapmaker', location: 'Silverford' },
    { id: 'explicit-different', name: 'Wrong Mapmaker', settlement_id: 'other-town', location: 'Silverford' },
  ], { tree }).map(npc => npc.id)).toEqual(['legacy']);
});

test('a shop owner linked to the actual parent town is included, but a foreign owner is excluded', () => {
  const tree = buildDisplayLocationTree({
    continents: [{ id: 'c', name: 'Continent', regions: [
      { id: 'r', name: 'Region', settlements: [{
        id: 'town-a', name: 'Twinbrook',
        places: [{ id: 'smith-a', name: 'The Iron Anvil', place_type: 'blacksmith', owner: 'Mara the Smith' }],
      }],
      },
    ] }],
  });
  const root = tree[0];
  const continent = root.children[0];
  const region = continent.children[0];
  const town = region.children[0];
  const shop = town.children[0];
  const crumbs = [root, continent, region, town, shop];
  expect(relatedNpcs(shop, [
    { id: 'owner', name: 'Mara the Smith', settlement_id: 'town-a' },
  ], { tree, crumbs }).map(npc => npc.id)).toEqual(['owner']);
  expect(relatedNpcs(shop, [
    { id: 'foreign-owner', name: 'Mara the Smith', settlement_id: 'town-b' },
  ], { tree, crumbs })).toEqual([]);
  expect(relatedNpcs(shop, [
    { id: 'foreign-place', name: 'Mara the Smith', place_id: 'other-smith', settlement_id: 'town-a' },
  ], { tree, crumbs })).toEqual([]);
});

test('ambiguous owner names do not guess which NPC manages a shop', () => {
  const tree = buildDisplayLocationTree({}, [{
    id: 'location-a', name: 'Market Row',
    places_of_interest: [{ id: 'shop-a', name: 'Herbalist', owner: 'Mara' }],
  }]);
  const shop = tree[0].children[0].children[0];
  expect(relatedNpcs(shop, [
    { id: 'mara-1', name: 'Mara' }, { id: 'mara-2', name: 'Mara' },
  ], { tree })).toEqual([]);
});
