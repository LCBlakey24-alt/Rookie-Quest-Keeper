import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { createDiceDyeGallery } from './diceDyeGallery';
import { DICE_DYES } from './diceDyes';
import DiceDyePicker3D from './DiceDyePicker3D';

jest.mock('./diceDyeGallery', () => ({
  createDiceDyeGallery: jest.fn(),
}));

class TestPointerEvent extends MouseEvent {
  constructor(type, init = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}

describe('Home-style 3D dice material wheel', () => {
  let gallery;
  let png;
  const RealPointerEvent = window.PointerEvent;

  beforeAll(() => { window.PointerEvent = TestPointerEvent; });
  afterAll(() => { window.PointerEvent = RealPointerEvent; });

  beforeEach(() => {
    jest.useFakeTimers();
    createDiceDyeGallery.mockClear();
    gallery = { resize: jest.fn(), select: jest.fn(), dispose: jest.fn() };
    createDiceDyeGallery.mockReturnValue(gallery);
    png = jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockImplementation(() => 'data:image/png;base64,bW9jaw==');
  });
  afterEach(() => {
    png.mockRestore();
    jest.useRealTimers();
  });

  test('draws every material as a 3D image in a single rotating hex wheel', () => {
    render(<DiceDyePicker3D selectedId="glow" onSelect={() => {}} onConfirm={() => {}} />);
    const wheel = screen.getByTestId('dice-dye-gallery-3d');
    expect(wheel.querySelectorAll('[data-wheel-index]')).toHaveLength(DICE_DYES.length);
    expect(wheel.querySelectorAll('.guild-wheel__die-image')).toHaveLength(DICE_DYES.length);
    expect(screen.getByTestId('dice-dye-glow')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('dice-dye-garnet')).toHaveAttribute('aria-checked', 'false');
    // The real wheel must be usable before any expensive GPU allocation.
    expect(createDiceDyeGallery).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(110); });
    expect(createDiceDyeGallery).toHaveBeenCalledTimes(1);
    expect(gallery.select).toHaveBeenCalledTimes(DICE_DYES.length);
    expect(gallery.dispose).toHaveBeenCalledTimes(1);
    expect(gallery.resize).toHaveBeenCalledWith(136, 136);
  });

  test('tapping a wedge selects its material but only the centre confirms', () => {
    const onSelect = jest.fn();
    const onConfirm = jest.fn();
    render(<DiceDyePicker3D selectedId="amber" onSelect={onSelect} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByTestId('dice-dye-moss'));
    expect(onSelect).toHaveBeenCalledWith('moss');
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('dice-dye-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('arrow keys rotate the selection as on other Keeper wheels', () => {
    const onSelect = jest.fn();
    render(<DiceDyePicker3D selectedId="amber" onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
    const index = DICE_DYES.findIndex(dye => dye.id === 'amber');
    expect(onSelect).toHaveBeenCalledWith(DICE_DYES[(index + 1) % DICE_DYES.length].id);
  });

  test('drag rotates continuously while the finger moves, not one jump on release', () => {
    const onSelect = jest.fn();
    render(<DiceDyePicker3D selectedId="glow" onSelect={onSelect} />);
    const svg = screen.getByRole('radiogroup');
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 });
    const ring = svg.querySelector('.guild-wheel__ring');
    const before = ring.style.transform;
    const wedge = screen.getByTestId('dice-dye-glow');
    fireEvent.pointerDown(wedge, { pointerId: 1, button: 0, clientX: 100, clientY: 20 });
    fireEvent.pointerMove(wedge, { pointerId: 1, clientX: 135, clientY: 28 });
    expect(ring.style.transform).not.toBe(before);
    fireEvent.pointerMove(wedge, { pointerId: 1, clientX: 145, clientY: 46 });
    expect(ring.style.transform).not.toBe(before);
    fireEvent.pointerUp(wedge, { pointerId: 1, clientX: 145, clientY: 46 });
  });

  test('trackpad scroll advances by an angular fraction before settling', () => {
    jest.useFakeTimers();
    render(<DiceDyePicker3D selectedId="glow" onSelect={() => {}} />);
    const svg = screen.getByRole('radiogroup');
    const ring = svg.querySelector('.guild-wheel__ring');
    const before = ring.style.transform;
    const wedge = screen.getByTestId('dice-dye-glow');
    fireEvent(wedge, new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 }));
    expect(ring.style.transform).not.toBe(before);
    // 24px of scroll should not instantly snap an entire 40-degree wedge.
    expect(ring.style.transform).toContain('5.28deg');
    act(() => { jest.advanceTimersByTime(160); });
  });

  test('WebGL failure preserves the wheel and a usable centre confirmation', () => {
    createDiceDyeGallery.mockImplementation(() => { throw new Error('No WebGL'); });
    const onConfirm = jest.fn();
    render(<DiceDyePicker3D selectedId="amber" onSelect={() => {}} onConfirm={onConfirm} />);
    expect(screen.getByTestId('dice-dye-gallery-3d')).toBeInTheDocument();
    expect(screen.getByTestId('dice-dye-amber')).toBeInTheDocument();
    expect(screen.getByTestId('dice-dye-gallery-3d').querySelectorAll('.guild-wheel__die-image')).toHaveLength(DICE_DYES.length);
    fireEvent.click(screen.getByTestId('dice-dye-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('3D thumbnails use one temporary GPU context only after the opening paint', () => {
    const view = render(<DiceDyePicker3D selectedId="amber" onSelect={() => {}} />);
    expect(createDiceDyeGallery).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(110); });
    expect(createDiceDyeGallery).toHaveBeenCalledTimes(1);
    expect(gallery.dispose).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(gallery.dispose).toHaveBeenCalledTimes(1);
  });

  test('closing the wheel before the deferred preview prevents a stale GPU allocation', () => {
    const view = render(<DiceDyePicker3D selectedId="amber" onSelect={() => {}} />);
    expect(screen.getByTestId('dice-dye-amber')).toBeInTheDocument();
    view.unmount();
    act(() => { jest.advanceTimersByTime(200); });
    expect(createDiceDyeGallery).not.toHaveBeenCalled();
  });

  test('fast touchscreen flicks cannot send the die ring spinning several full turns', () => {
    const onSelect = jest.fn();
    render(<DiceDyePicker3D selectedId="glow" onSelect={onSelect} />);
    const svg = screen.getByRole('radiogroup');
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 });
    let time = 0;
    const now = jest.spyOn(performance, 'now').mockImplementation(() => time);
    try {
      const wedge = screen.getByTestId('dice-dye-glow');
      fireEvent.pointerDown(wedge, { pointerId: 1, button: 0, clientX: 100, clientY: 20 });
      time = 2;
      fireEvent.pointerMove(wedge, { pointerId: 1, clientX: 125, clientY: 25 });
      time = 3;
      fireEvent.pointerUp(wedge, { pointerId: 1, clientX: 125, clientY: 25 });
      const ring = svg.querySelector('.guild-wheel__ring');
      const match = ring.style.transform.match(/rotate\\((-?[\\d.]+)deg\\)/);
      expect(match).toBeTruthy();
      expect(Math.abs(Number(match[1]))).toBeLessThanOrEqual(120);
    } finally {
      now.mockRestore();
    }
  });
});
