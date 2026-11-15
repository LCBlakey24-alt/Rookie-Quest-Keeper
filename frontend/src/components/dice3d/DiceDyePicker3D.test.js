import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { createDiceDyeGallery } from './diceDyeGallery';
import { DICE_DYES } from './diceDyes';
import DiceDyePicker3D from './DiceDyePicker3D';

jest.mock('./diceDyeGallery', () => ({
  createDiceDyeGallery: jest.fn(),
}));

// jsdom does not expose PointerEvent consistently across CI Node versions.
// Dispatch a bubbling pointer event with explicit coordinates so the same
// drag threshold used by a phone is actually exercised rather than NaN.
function dispatchPointer(element, name, { pointerId, clientX, clientY }) {
  const event = new Event(name, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    clientX: { value: clientX },
    clientY: { value: clientY },
  });
  fireEvent(element, event);
}

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
    const onConfirm = jest.fn();
    render(<DiceDyePicker3D selectedId="glow" onSelect={onSelect} onConfirm={onConfirm} />);

    expect(createDiceDyeGallery).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('dice-dye-gallery-3d').querySelectorAll('canvas')).toHaveLength(1);
    expect(screen.getByTestId('dice-dye-glow')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('dice-dye-garnet')).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByTestId('dice-dye-garnet'));
    expect(onSelect).toHaveBeenCalledWith('garnet');
    fireEvent.click(screen.getByTestId('dice-dye-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('updates the selected physical die without creating another WebGL context', () => {
    const view = render(<DiceDyePicker3D selectedId="glow" onSelect={() => {}} />);
    view.rerender(<DiceDyePicker3D selectedId="moss" onSelect={() => {}} />);

    expect(createDiceDyeGallery).toHaveBeenCalledTimes(1);
    expect(gallery.select).toHaveBeenLastCalledWith('moss');
  });

  test('turns the style wheel with keyboard arrows', () => {
    const onSelect = jest.fn();
    render(<DiceDyePicker3D selectedId="amber" onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByTestId('dice-dye-gallery-3d'), { key: 'ArrowRight' });
    const amberIndex = DICE_DYES.findIndex((dye) => dye.id === 'amber');
    expect(onSelect).toHaveBeenCalledWith(DICE_DYES[(amberIndex + 1) % DICE_DYES.length].id);
  });

  test('falls back to readable material buttons if WebGL cannot start', () => {
    createDiceDyeGallery.mockImplementation(() => { throw new Error('No WebGL'); });
    render(<DiceDyePicker3D selectedId="amber" onSelect={() => {}} />);

    expect(screen.queryByTestId('dice-dye-gallery-3d')).not.toBeInTheDocument();
    expect(screen.getByTestId('dice-dye-amber')).toHaveTextContent('20');
  });


  test('a mobile tap on the centre confirm button is not stolen by pointer capture', () => {
    const onConfirm = jest.fn();
    const view = render(<DiceDyePicker3D selectedId="amber" onSelect={() => {}} onConfirm={onConfirm} />);
    const galleryElement = screen.getByTestId('dice-dye-gallery-3d');
    galleryElement.setPointerCapture = jest.fn();
    const confirm = screen.getByTestId('dice-dye-confirm');
    dispatchPointer(confirm, 'pointerdown', { pointerId: 1, clientX: 120, clientY: 120 });
    dispatchPointer(confirm, 'pointerup', { pointerId: 1, clientX: 120, clientY: 120 });
    fireEvent.click(confirm);
    expect(galleryElement.setPointerCapture).not.toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  test('tapping a material does not capture its pointer or skip to the next step', () => {
    const onSelect = jest.fn();
    const onConfirm = jest.fn();
    render(<DiceDyePicker3D selectedId="amber" onSelect={onSelect} onConfirm={onConfirm} />);
    const galleryElement = screen.getByTestId('dice-dye-gallery-3d');
    galleryElement.setPointerCapture = jest.fn();
    const dye = screen.getByTestId('dice-dye-moss');
    dispatchPointer(dye, 'pointerdown', { pointerId: 2, clientX: 50, clientY: 50 });
    dispatchPointer(dye, 'pointerup', { pointerId: 2, clientX: 50, clientY: 50 });
    fireEvent.click(dye);
    expect(galleryElement.setPointerCapture).not.toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('moss');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('a swipe started on a die turns the wheel but does not also tap that die', () => {
    const onSelect = jest.fn();
    const onConfirm = jest.fn();
    render(<DiceDyePicker3D selectedId="amber" onSelect={onSelect} onConfirm={onConfirm} />);
    const dye = screen.getByTestId('dice-dye-moss');
    dispatchPointer(dye, 'pointerdown', { pointerId: 3, clientX: 140, clientY: 130 });
    dispatchPointer(dye, 'pointerup', { pointerId: 3, clientX: 90, clientY: 130 });
    fireEvent.click(dye);
    const index = DICE_DYES.findIndex((entry) => entry.id === 'amber');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(DICE_DYES[(index + 1) % DICE_DYES.length].id);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('the fallback still lets users continue when WebGL is unavailable', () => {
    createDiceDyeGallery.mockImplementation(() => { throw new Error('No WebGL'); });
    const onConfirm = jest.fn();
    render(<DiceDyePicker3D selectedId="amber" onSelect={() => {}} onConfirm={onConfirm} />);
    expect(screen.getByTestId('dice-dye-amber')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dice-dye-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('releases the shared GPU context on unmount', () => {
    const view = render(<DiceDyePicker3D selectedId="glow" onSelect={() => {}} />);
    view.unmount();
    expect(gallery.dispose).toHaveBeenCalledTimes(1);
  });
});

