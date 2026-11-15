import React from 'react';
import { render } from '@testing-library/react';

import { DICE_DYES } from './diceDyes';
import { createDiceDyeGallery } from './diceDyeGallery';
import DiceTypePreview3D from './DiceTypePreview3D';

jest.mock('./diceDyeGallery', () => ({ createDiceDyeGallery: jest.fn() }));

describe('selected 3D die type preview', () => {
  let preview;

  beforeEach(() => {
    preview = { resize: jest.fn(), select: jest.fn(), dispose: jest.fn() };
    createDiceDyeGallery.mockReturnValue(preview);
  });

  test('renders the selected geometry in the selected dye', () => {
    render(<DiceTypePreview3D sides={6} dyeId="moss" />);
    expect(createDiceDyeGallery).toHaveBeenCalledWith(expect.objectContaining({
      dyes: [DICE_DYES.find((dye) => dye.id === 'moss')],
      sides: 6,
      layout: 'single',
    }));
    expect(preview.select).toHaveBeenCalledWith('moss');
  });

  test('rebuilds the physical mesh when the die type changes', () => {
    const view = render(<DiceTypePreview3D sides={4} dyeId="amber" />);
    view.rerender(<DiceTypePreview3D sides={12} dyeId="amber" />);
    expect(preview.dispose).toHaveBeenCalledTimes(1);
    expect(createDiceDyeGallery).toHaveBeenLastCalledWith(expect.objectContaining({ sides: 12 }));
  });
});
