import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MapBuilder from './MapBuilder';

jest.mock('./MapCanvas', () => {
  const React = require('react');
  return {
    __esModule: true,
    DEFAULT_MAP_WIDTH: 30,
    DEFAULT_MAP_HEIGHT: 20,
    GRID_SIZE: 40,
    TERRAIN_TYPES: { stone: { name: 'Stone' } },
    default: ({ zoom, onZoomChange }) => (
      <button type="button" data-testid="canvas-wheel" onClick={() => onZoomChange(zoom + 0.25)}>
        Wheel zoom {zoom}
      </button>
    ),
  };
});
jest.mock('./MapToolbar', () => () => null);
jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: {} }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

test('existing Map Builder forwards wheel zoom to its header and controlled canvas', () => {
  render(<MapBuilder campaignId="synthetic-campaign" onClose={jest.fn()} />);
  expect(screen.getByText(/Zoom: 100%/i)).toBeInTheDocument();
  fireEvent.click(screen.getByTestId('canvas-wheel'));
  expect(screen.getByText(/Zoom: 125%/i)).toBeInTheDocument();
  expect(screen.getByTestId('canvas-wheel')).toHaveTextContent('Wheel zoom 1.25');
});
