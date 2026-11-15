import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { createDiceDyeGallery } from './diceDyeGallery';
import DiceDyePicker3D from './DiceDyePicker3D';

jest.mock('./diceDyeGallery', () => ({
  createDiceDyeGallery: jest.fn(),
}));

describe('physical 3D dice dye picker', () => {
  let gallery;

  beforeEach(() => {
    gallery = {
      resize: jest.fn(),
      select: jest.fn(),
      dispose: jest.fn(),
    };
    createDiceDyeGallery.mockReturnValue(gallery);
  });

  test('uses one shared 3D gallery and accessible buttons for every material', () => {
    const onSelect = jest.fn();
    render(<DiceDyePicker3D selectedId="glow" onSelect={onSelect} />);

    expect(createDiceDyeGallery).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('dice-dye-gallery-3d').querySelectorAll('canvas')).toHaveLength(1);
    expect(screen.getByTestId('dice-dye-glow')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('dice-dye-garnet')).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByTestId('dice-dye-garnet'));
    expect(onSelect).toHaveBeenCalledWith('garnet');
  });

  test('updates the selected physical die without creating another WebGL context', () => {
    const view = render(<DiceDyePicker3D selectedId="glow" onSelect={() => {}} />);
    view.rerender(<DiceDyePicker3D selectedId="moss" onSelect={() => {}} />);

    expect(createDiceDyeGallery).toHaveBeenCalledTimes(1);
    expect(gallery.select).toHaveBeenLastCalledWith('moss');
  });

  test('falls back to readable material buttons if WebGL cannot start', () => {
    createDiceDyeGallery.mockImplementation(() => { throw new Error('No WebGL'); });
    render(<DiceDyePicker3D selectedId="amber" onSelect={() => {}} />);

    expect(screen.queryByTestId('dice-dye-gallery-3d')).not.toBeInTheDocument();
    expect(screen.getByTestId('dice-dye-amber')).toHaveTextContent('20');
  });

  test('releases the shared GPU context on unmount', () => {
    const view = render(<DiceDyePicker3D selectedId="glow" onSelect={() => {}} />);
    view.unmount();
    expect(gallery.dispose).toHaveBeenCalledTimes(1);
  });
});

