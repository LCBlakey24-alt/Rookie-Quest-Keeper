import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { cellsAcross, gridTile, hasGrid, normaliseGrid, sizeForCellsAcross } from './mapGrid';
import MapGridOverlay from './MapGridOverlay';
import MapGridControls from './MapGridControls';

describe('map grid settings', () => {
  it('defaults to no grid and clamps saved values into range', () => {
    expect(normaliseGrid(undefined)).toEqual({ type: 'none', size: 5, offset_x: 0, offset_y: 0, colour: 'light', opacity: 0.45 });
    expect(normaliseGrid({ type: 'triangle', size: 900, offset_x: -4, colour: 'pink', opacity: 7 }))
      .toEqual({ type: 'none', size: 50, offset_x: 0, offset_y: 0, colour: 'light', opacity: 1 });
    expect(hasGrid({ type: 'square' })).toBe(true);
    expect(hasGrid({ type: 'none' })).toBe(false);
  });

  it('converts between cells across and cell size, including interlocking flat hexes', () => {
    expect(cellsAcross({ type: 'square', size: 5 })).toBe(20);
    expect(sizeForCellsAcross('square', 20)).toBe(5);
    expect(cellsAcross({ type: 'hex_flat', size: sizeForCellsAcross('hex_flat', 24) })).toBe(24);
    expect(cellsAcross({ type: 'hex_pointy', size: sizeForCellsAcross('hex_pointy', 12) })).toBe(12);
  });

  it('builds repeating tiles of the right shape', () => {
    expect(gridTile({ type: 'none' })).toBeNull();
    const square = gridTile({ type: 'square', size: 4, offset_x: 50, offset_y: 25 });
    expect(square).toMatchObject({ width: 4, height: 4, dx: 2, dy: 1 });
    const pointy = gridTile({ type: 'hex_pointy', size: 4 });
    expect(pointy.width).toBe(4);
    expect(pointy.height).toBeCloseTo(3 * (4 / Math.sqrt(3)));
    const flat = gridTile({ type: 'hex_flat', size: 4 });
    expect(flat.width).toBe(6);
    expect(flat.height).toBeCloseTo(Math.sqrt(3) * 2);
    expect((flat.path.match(/M/g) || []).length).toBe(6);
  });
});

describe('MapGridOverlay', () => {
  it('draws nothing without a grid or before the image size is known', () => {
    const { container, rerender } = render(<MapGridOverlay grid={{ type: 'none' }} aspect={0.5} />);
    expect(container.querySelector('svg')).toBeNull();
    rerender(<MapGridOverlay grid={{ type: 'square' }} aspect={0} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('covers the image with the chosen grid', () => {
    render(<MapGridOverlay grid={{ type: 'hex_flat', colour: 'dark' }} aspect={0.75} />);
    const svg = screen.getByTestId('map-grid-overlay');
    expect(svg).toHaveAttribute('data-grid-type', 'hex_flat');
    expect(svg).toHaveAttribute('viewBox', '0 0 100 75');
    expect(svg.querySelector('path')).toHaveAttribute('stroke', '#0b0614');
  });
});

describe('MapGridControls', () => {
  it('picks a grid type, sets cells across, nudges and saves', () => {
    const onChange = jest.fn();
    const onSave = jest.fn();
    const { rerender } = render(<MapGridControls grid={{ type: 'none' }} onChange={onChange} onSave={onSave} />);
    expect(screen.queryByTestId('map-grid-across')).toBeNull();
    fireEvent.click(screen.getByTestId('map-grid-type-square'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'square' }));

    rerender(<MapGridControls grid={{ type: 'square', size: 5 }} onChange={onChange} onSave={onSave} />);
    fireEvent.change(screen.getByTestId('map-grid-across'), { target: { value: '25' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ size: 4 }));
    fireEvent.click(screen.getByRole('button', { name: 'Move grid left' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ offset_x: 98 }));
    fireEvent.click(screen.getByRole('button', { name: 'Bigger cells' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ size: 5.05 }));

    fireEvent.click(screen.getByTestId('map-grid-save'));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ type: 'square', size: 5 }));
  });
});
