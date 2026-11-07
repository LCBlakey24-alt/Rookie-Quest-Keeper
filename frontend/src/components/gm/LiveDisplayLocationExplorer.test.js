import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import LiveDisplayLocationExplorer, { buildDisplayLocationTree } from './LiveDisplayLocationExplorer';

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
    items: expect.arrayContaining([expect.objectContaining({ name: 'Longsword', price: '15 gp', quantity: 2 })]),
  }));
  expect(JSON.stringify(onRevealShop.mock.calls)).not.toMatch(/GM SECRET|cursed sword/i);
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
