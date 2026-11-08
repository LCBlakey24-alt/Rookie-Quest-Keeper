import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import MapCanvas from './MapCanvas';

const map = { width: 0, height: 0, terrain: [], walls: [], doors: [], objects: [] };

test('battle zoom toolbar prop controls the canvas while scroll wheel updates the toolbar', () => {
  const ctx = {
    fillRect: jest.fn(), save: jest.fn(), translate: jest.fn(),
    scale: jest.fn(), restore: jest.fn(),
  };
  const spy = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
  try {
    const onZoomChange = jest.fn();
    const props = { mapData: map, showGrid: false, gridSize: 40, tool: 'select', zoom: 1, onZoomChange };
    const { container, rerender } = render(<MapCanvas {...props} />);
    expect(ctx.scale).toHaveBeenCalledWith(1, 1);
    fireEvent.wheel(container.querySelector('canvas'), { deltaY: -80 });
    expect(onZoomChange).toHaveBeenCalledWith(1.1);
    rerender(<MapCanvas {...props} zoom={1.1} />);
    expect(ctx.scale).toHaveBeenCalledWith(1.1, 1.1);
  } finally {
    spy.mockRestore();
  }
});
