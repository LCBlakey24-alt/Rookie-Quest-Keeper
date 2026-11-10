/**
 * The rotary HP dial under a finger: synthetic character, saves controlled.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

import HexHpDial from './HexHpDial';

// jsdom has no PointerEvent; React reads pointerId and client coordinates.
class TestPointerEvent extends MouseEvent {
  constructor(type, init = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}

const HERO = { max_hit_points: 35, current_hit_points: 30, temporary_hit_points: 0 };
// jsdom rounds pointer coordinates to whole pixels; a big dial keeps that
// rounding far below a degree, as a real finger on a real screen would be.
const CENTRE = 1000;
const RADIUS = 900;

beforeAll(() => { window.PointerEvent = TestPointerEvent; });

function renderDial(onConfirm = jest.fn().mockResolvedValue(true), character = HERO) {
  const onCancel = jest.fn();
  const view = render(<HexHpDial character={character} onConfirm={onConfirm} onCancel={onCancel} />);
  const svg = view.container.querySelector('svg');
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 2000, height: 2000, right: 2000, bottom: 2000 });
  svg.setPointerCapture = () => {};
  svg.releasePointerCapture = () => {};
  return { svg, onConfirm, onCancel };
}

const at = (degrees) => {
  const radians = (degrees * Math.PI) / 180;
  return { clientX: CENTRE + RADIUS * Math.cos(radians), clientY: CENTRE + RADIUS * Math.sin(radians) };
};

/** Drag along the rim from one angle to another, in small steps. */
function turn(svg, from, to, { release = true } = {}) {
  const region = svg.querySelector('[data-region="hp"] polygon');
  fireEvent.pointerDown(region, { pointerId: 1, button: 0, ...at(from) });
  const step = from < to ? 6 : -6;
  for (let angle = from + step; step > 0 ? angle <= to : angle >= to; angle += step) {
    fireEvent.pointerMove(svg, { pointerId: 1, ...at(angle) });
  }
  fireEvent.pointerMove(svg, { pointerId: 1, ...at(to) });
  if (release) fireEvent.pointerUp(svg, { pointerId: 1, ...at(to) });
}

const centreText = () => screen.getByTestId('hex-hp-confirm').textContent;
const rotation = () => Number(screen.getByTestId('hex-hp-rotor').getAttribute('data-rotation'));

describe('direction and sensitivity', () => {
  test('clockwise adds: a 180 degree turn is +5', () => {
    const { svg } = renderDial();
    turn(svg, -90, 95);
    expect(centreText()).toContain('+5');
    expect(screen.getByTestId('hex-hp-slider')).toHaveAttribute('aria-valuenow', '5');
  });

  test('anticlockwise subtracts: a 180 degree turn the other way is -5', () => {
    const { svg } = renderDial();
    turn(svg, -90, -275);
    expect(screen.getByTestId('hex-hp-slider')).toHaveAttribute('aria-valuenow', '-5');
  });

  test('the dial follows the finger smoothly, it does not snap to steps', () => {
    const { svg } = renderDial();
    turn(svg, -90, -90 + 50, { release: false });
    expect(rotation()).toBe(50); // not 36 or 72
    expect(screen.getByTestId('hex-hp-slider')).toHaveAttribute('aria-valuenow', '1');
  });

  test('a long turn keeps counting past a full revolution', () => {
    const { svg } = renderDial();
    turn(svg, -90, -90 + 720 + 108 + 10);
    expect(screen.getByTestId('hex-hp-slider')).toHaveAttribute('aria-valuenow', '23');
  });

  test('turning back through zero changes sign', () => {
    const { svg } = renderDial();
    turn(svg, -90, 18, { release: false }); // +3
    fireEvent.pointerMove(svg, { pointerId: 1, ...at(-90) });
    fireEvent.pointerMove(svg, { pointerId: 1, ...at(-160) });
    fireEvent.pointerUp(svg, { pointerId: 1, ...at(-160) });
    expect(screen.getByTestId('hex-hp-slider')).toHaveAttribute('aria-valuenow', '-1');
  });

  test('labels hide while turning and the centre stays put', () => {
    const { svg } = renderDial();
    turn(svg, -90, 0, { release: false });
    expect(svg).toHaveClass('is-rotating');
    expect(screen.getByTestId('hex-hp-confirm').closest('[data-testid="hex-hp-rotor"]')).toBeNull();
    fireEvent.pointerUp(svg, { pointerId: 1, ...at(0) });
    expect(svg).not.toHaveClass('is-rotating');
  });
});

describe('confirming', () => {
  test('letting go saves nothing; the centre confirms', async () => {
    const { svg, onConfirm } = renderDial();
    turn(svg, -90, -275);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(rotation()).toBe(-185); // stays where it was let go
    await act(async () => { fireEvent.click(screen.getByTestId('hex-hp-confirm')); });
    expect(onConfirm).toHaveBeenCalledWith('hp', -5, expect.objectContaining({ updates: { current_hit_points: 25, temporary_hit_points: 0, temp_hp: 0 } }));
  });

  test('after the server accepts, the dial turns home and says saved', async () => {
    const { svg } = renderDial();
    turn(svg, -90, 95);
    await act(async () => { fireEvent.click(screen.getByTestId('hex-hp-confirm')); });
    expect(rotation()).toBe(0);
    expect(svg).toHaveClass('is-returning');
    expect(screen.getByTestId('hex-hp-status')).toHaveTextContent('Saved');
  });

  test('a failed save keeps the proposal and says it was not saved', async () => {
    const { svg } = renderDial(jest.fn().mockResolvedValue(false));
    turn(svg, -90, 95);
    await act(async () => { fireEvent.click(screen.getByTestId('hex-hp-confirm')); });
    expect(screen.getByTestId('hex-hp-status')).toHaveTextContent('Not saved');
    expect(screen.getByTestId('hex-hp-slider')).toHaveAttribute('aria-valuenow', '5');
    expect(screen.getByTestId('hex-hp-status')).not.toHaveTextContent(/^Saved$/);
  });

  test('confirming twice while saving sends one save', async () => {
    let finish;
    const onConfirm = jest.fn(() => new Promise((resolve) => { finish = resolve; }));
    const { svg } = renderDial(onConfirm);
    turn(svg, -90, 95);
    fireEvent.click(screen.getByTestId('hex-hp-confirm'));
    fireEvent.click(screen.getByTestId('hex-hp-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await act(async () => { finish(true); });
  });

  test('cancel restores the dial without saving', () => {
    const { svg, onConfirm, onCancel } = renderDial();
    turn(svg, -90, 95);
    fireEvent.click(screen.getByTestId('hex-hp-cancel'));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
    expect(rotation()).toBe(0);
  });

  test('healing at full health is refused with a reason', async () => {
    const { svg, onConfirm } = renderDial(undefined, { ...HERO, current_hit_points: 35 });
    turn(svg, -90, 0);
    await act(async () => { fireEvent.click(screen.getByTestId('hex-hp-confirm')); });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByTestId('hex-hp-status')).toHaveTextContent('maximum');
  });
});

describe('temporary HP', () => {
  test('tapping the lower part chooses Temp HP, and the change goes to that pool', async () => {
    const { svg, onConfirm } = renderDial();
    const temp = svg.querySelector('[data-region="temp"] polygon');
    fireEvent.pointerDown(temp, { pointerId: 2, button: 0, ...at(90) });
    fireEvent.pointerUp(svg, { pointerId: 2, ...at(90) });
    expect(screen.getByTestId('hex-hp-target-temp')).toHaveAttribute('aria-checked', 'true');
    turn(svg, -90, 25);
    await act(async () => { fireEvent.click(screen.getByTestId('hex-hp-confirm')); });
    expect(onConfirm).toHaveBeenCalledWith('temp', 3, expect.objectContaining({ updates: { temporary_hit_points: 3, temp_hp: 3 } }));
  });
});

describe('without turning', () => {
  test('the side wedges step by one', () => {
    const { svg } = renderDial();
    const plus = svg.querySelector('[data-region="plus"] polygon');
    fireEvent.pointerDown(plus, { pointerId: 3, button: 0, ...at(0) });
    fireEvent.pointerUp(svg, { pointerId: 3, ...at(0) });
    fireEvent.pointerDown(plus, { pointerId: 3, button: 0, ...at(0) });
    fireEvent.pointerUp(svg, { pointerId: 3, ...at(0) });
    expect(screen.getByTestId('hex-hp-slider')).toHaveAttribute('aria-valuenow', '2');
    expect(rotation()).toBe(72); // the dial turns to match
  });

  test('the keyboard can adjust, confirm and cancel', async () => {
    const { onConfirm, onCancel } = renderDial();
    const slider = screen.getByTestId('hex-hp-slider');
    fireEvent.keyDown(slider, { key: 'PageDown' });
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider).toHaveAttribute('aria-valuenow', '-6');
    expect(slider).toHaveAttribute('aria-valuetext', '-6 hit points');
    await act(async () => { fireEvent.keyDown(slider, { key: 'Enter' }); });
    expect(onConfirm).toHaveBeenCalledWith('hp', -6, expect.anything());
    fireEvent.keyDown(slider, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });
});
