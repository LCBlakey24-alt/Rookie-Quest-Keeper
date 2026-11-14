import React from 'react';
import { render, screen } from '@testing-library/react';
import { createDiceTray } from '@/components/dice3d/diceTrayScene';
import { getDye } from '@/components/dice3d/diceDyes';
import DiceTray3DOverlay from './DiceTray3DOverlay';

jest.mock('@/components/dice3d/diceTrayScene', () => {
  const actual = jest.requireActual('@/components/dice3d/diceTrayScene');
  return { __esModule: true, ...actual, createDiceTray: jest.fn() };
});

const baseProps = {
  rollId: 'roll-a',
  dyeId: 'moss',
  total: 12,
  label: '1d20',
  rolls: [{ id: 'd20', sides: 20, result: 12 }],
  rollDetail: 'd20: 12',
  formulaText: '12 = 12',
  isRevealed: false,
  isCrit: false,
  isFumble: false,
  onRevealNow: () => {},
  onClose: () => {},
};

describe('3D dice dye materials and fresh throws', () => {
  let contextMock;
  beforeEach(() => {
    // jsdom has no GPU: supply WebGL availability and stub the physics
    // adapter, then assert the actual palette supplied to the 3D scene.
    contextMock = jest.spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => ({}));
    createDiceTray.mockImplementation(() => ({
      resize: () => {},
      roll: () => true,
      dispose: () => {},
    }));
  });

  afterEach(() => {
    contextMock.mockRestore();
  });

  test('the physical scene uses the selected dye, not only the swatch', () => {
    render(<DiceTray3DOverlay {...baseProps} />);
    expect(createDiceTray).toHaveBeenCalledTimes(1);
    const palette = createDiceTray.mock.calls[0][0].palette;
    expect(palette.body).toBe(getDye('moss').body);
    expect(palette.ink).toBe(getDye('moss').ink);
  });

  test('does not recolour a running throw but uses a new colour for the next throw', () => {
    const view = render(<DiceTray3DOverlay {...baseProps} />);
    const afterFirst = createDiceTray.mock.calls.length;
    view.rerender(<DiceTray3DOverlay {...baseProps} dyeId="garnet" rolls={[{ id: 'd20', sides: 20, result: 12 }]} />);
    expect(createDiceTray).toHaveBeenCalledTimes(afterFirst);

    view.rerender(<DiceTray3DOverlay {...baseProps} rollId="roll-b" dyeId="garnet" />);
    expect(createDiceTray).toHaveBeenCalledTimes(afterFirst + 1);
    const nextPalette = createDiceTray.mock.calls[afterFirst][0].palette;
    expect(nextPalette.body).toBe(getDye('garnet').body);
    expect(nextPalette.ink).toBe(getDye('garnet').ink);
  });

  test('does not apply critical styling until the result is revealed', () => {
    const view = render(<DiceTray3DOverlay {...baseProps} isCrit />);
    const panel = screen.getByTestId('dice-tray-overlay').querySelector('.rq-dice-tray__panel');
    expect(panel).not.toHaveClass('is-crit');

    view.rerender(<DiceTray3DOverlay {...baseProps} isCrit isRevealed />);
    expect(panel).toHaveClass('is-crit');
    expect(panel).toHaveClass('is-revealed');
  });
});
