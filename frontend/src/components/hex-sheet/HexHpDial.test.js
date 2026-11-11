/**
 * The rotary HP dial under a finger: synthetic character, saves controlled.
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

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
    expect(screen.getByTestId('hex-hp-slider')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.queryByTestId('hex-hp-ring')).toBeNull();
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
  test('tapping the lower half chooses Temp HP, and the change goes to that pool', async () => {
    const { svg, onConfirm } = renderDial();
    fireEvent.click(screen.getByTestId('hex-hp-target-temp'));
    expect(screen.getByTestId('hex-hp-target-temp')).toHaveAttribute('aria-checked', 'true');
    expect(centreText()).toContain('0');
    turn(svg, -90, 25);
    await act(async () => { fireEvent.click(screen.getByTestId('hex-hp-confirm')); });
    expect(onConfirm).toHaveBeenCalledWith('temp', 3, expect.objectContaining({ updates: { temporary_hit_points: 3, temp_hp: 3 } }));
  });
});

describe('without turning', () => {
  test('the − and + buttons step by one and the dial turns to match', () => {
    renderDial();
    fireEvent.click(screen.getByTestId('hex-hp-plus'));
    fireEvent.click(screen.getByTestId('hex-hp-plus'));
    fireEvent.click(screen.getByTestId('hex-hp-plus'));
    fireEvent.click(screen.getByTestId('hex-hp-minus'));
    expect(screen.getByTestId('hex-hp-slider')).toHaveAttribute('aria-valuenow', '2');
    expect(rotation()).toBe(72);
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

describe('two halves and the round dial', () => {
  test('nothing is chosen at first: the centre asks for a half and there is no dial yet', () => {
    renderDial();
    expect(centreText()).toContain('Tap a half');
    expect(screen.queryByTestId('hex-hp-ring')).toBeNull();
    expect(screen.getByTestId('hex-hp-target-hp')).toHaveTextContent('30 / 35');
    expect(screen.getByTestId('hex-hp-target-temp')).toHaveTextContent('0');
  });

  test('confirming before choosing a half explains what to do and saves nothing', async () => {
    const { onConfirm } = renderDial();
    await act(async () => { fireEvent.click(screen.getByTestId('hex-hp-confirm')); });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByTestId('hex-hp-status')).toHaveTextContent('Tap Hit Points or Temp HP first');
  });

  test('tapping the top half drops in the round dial with 0 in the centre', () => {
    renderDial();
    fireEvent.click(screen.getByTestId('hex-hp-target-hp'));
    expect(screen.getByTestId('hex-hp-ring')).toBeInTheDocument();
    expect(centreText()).toMatch(/^0/);
    expect(rotation()).toBe(0);
  });

  test('turning without tapping first chooses the half the turn started on', () => {
    const { svg } = renderDial();
    const temp = svg.querySelector('[data-region="temp"] polygon');
    fireEvent.pointerDown(temp, { pointerId: 4, button: 0, ...at(90) });
    for (let angle = 96; angle <= 180; angle += 6) fireEvent.pointerMove(svg, { pointerId: 4, ...at(angle) });
    fireEvent.pointerUp(svg, { pointerId: 4, ...at(180) });
    expect(screen.getByTestId('hex-hp-target-temp')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('hex-hp-slider')).toHaveAttribute('aria-valuenow', '2');
  });

  test('switching halves starts again from 0', () => {
    renderDial();
    fireEvent.click(screen.getByTestId('hex-hp-plus'));
    fireEvent.click(screen.getByTestId('hex-hp-target-temp'));
    expect(screen.getByTestId('hex-hp-slider')).toHaveAttribute('aria-valuenow', '0');
  });

  test('the halves deal in one after the other', () => {
    renderDial();
    expect(screen.getByTestId('hex-hp-target-hp').style.animationDelay).toBe('0ms');
    expect(screen.getByTestId('hex-hp-target-temp').style.animationDelay).toBe('60ms');
  });

  test('the click sound can be switched off and the choice is remembered', () => {
    window.localStorage.removeItem('rqk.hexSheet.dialSound');
    renderDial();
    const sound = screen.getByTestId('hex-hp-sound');
    expect(sound).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(sound);
    expect(sound).toHaveAttribute('aria-pressed', 'false');
    cleanup();
    renderDial();
    expect(screen.getByTestId('hex-hp-sound')).toHaveAttribute('aria-pressed', 'false');
    window.localStorage.removeItem('rqk.hexSheet.dialSound');
  });
});
