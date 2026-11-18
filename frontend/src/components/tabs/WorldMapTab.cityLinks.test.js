import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import WorldMapTab, { linkedLocalMap } from './WorldMapTab';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const balderinMap = { id: 'balderin-map', name: 'Balderin', map_type: 'city', location_id: 'loc-b', image_data: 'data:image/png;base64,city', pins: [{ id: 'p1', name: 'The Gilded Anchor', x: 40, y: 60 }] };
const world = {
  id: 'world-1', name: 'Tia-Karta', image_data: 'data:image/png;base64,world',
  pins: [
    { id: 'pin-b', name: 'Balderin', pin_type: 'city', x: 30, y: 40, linked_local_map_id: 'balderin-map' },
    { id: 'pin-f', name: 'Old Fort', pin_type: 'landmark', x: 70, y: 20 },
  ],
};

beforeEach(() => {
  apiClient.get.mockImplementation((url) => {
    if (url.endsWith('/world-maps')) return Promise.resolve({ data: [world] });
    if (url.endsWith('/local-maps')) return Promise.resolve({ data: [balderinMap] });
    if (url.endsWith('/locations')) return Promise.resolve({ data: [{ id: 'loc-b', name: 'Balderin' }] });
    return Promise.resolve({ data: [] });
  });
  window.matchMedia = jest.fn(() => ({ matches: false, addListener() {}, removeListener() {} }));
});

test('finds the town map a pin links, ignoring missing ones', () => {
  expect(linkedLocalMap(world.pins[0], [balderinMap])).toBe(balderinMap);
  expect(linkedLocalMap(world.pins[1], [balderinMap])).toBeNull();
  expect(linkedLocalMap({ linked_local_map_id: 'deleted' }, [balderinMap])).toBeNull();
});

test('clicking a linked pin zooms in and opens its city map; Back returns to the world', async () => {
  jest.useFakeTimers();
  try {
    render(<WorldMapTab campaignId="c1" />);
    const pin = await screen.findByRole('button', { name: 'Open the Balderin map' });
    expect(screen.getByRole('button', { name: 'Edit pin Old Fort' })).toBeInTheDocument();

    fireEvent.click(pin);
    expect(screen.getByTestId('world-map-canvas').style.transform).toBe('scale(4)');
    act(() => { jest.advanceTimersByTime(700); });

    expect(screen.getByTestId('city-map-view')).toBeInTheDocument();
    expect(screen.getByText('The Gilded Anchor')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('city-map-back'));
    expect(screen.queryByTestId('city-map-view')).toBeNull();
    expect(screen.getByTestId('world-map-canvas').style.transform).toBe('none');
  } finally {
    jest.useRealTimers();
  }
});

test('linking a saved city map in the pin editor fills its name, type and location', async () => {
  render(<WorldMapTab campaignId="c1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit pin Old Fort' }));
  const nameField = screen.getByDisplayValue('Old Fort');
  fireEvent.change(nameField, { target: { value: '' } });
  fireEvent.change(screen.getByTestId('pin-linked-local-map'), { target: { value: 'balderin-map' } });
  await waitFor(() => expect(nameField).toHaveValue('Balderin'));

  apiClient.put.mockResolvedValue({ data: {} });
  fireEvent.click(screen.getByRole('button', { name: /Save Pin/ }));
  await waitFor(() => expect(apiClient.put).toHaveBeenCalled());
  expect(apiClient.put.mock.calls[0][1]).toMatchObject({ name: 'Balderin', pin_type: 'city', linked_local_map_id: 'balderin-map', linked_location_id: 'loc-b' });
});
