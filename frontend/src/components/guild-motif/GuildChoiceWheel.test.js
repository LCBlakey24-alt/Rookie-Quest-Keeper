import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import GuildChoiceWheel from './GuildChoiceWheel';
import { playDialTick } from '@/components/hex-sheet/dialSound';

jest.mock('@/components/hex-sheet/dialSound', () => ({ playDialTick: jest.fn() }));

const OPTIONS = ['Barbarian', 'Bard', 'Cleric', 'Druid'].map((label) => ({ id: label, label }));

function setup(value = 'Barbarian') {
  const onChange = jest.fn();
  const view = render(<GuildChoiceWheel options={OPTIONS} value={value} onChange={onChange} label="Class" caption="CLASS" />);
  return { onChange, ...view };
}

test('it lists every option, marks the selected one and names it in the centre', () => {
  setup('Cleric');
  expect(screen.getAllByRole('radio')).toHaveLength(4);
  expect(screen.getByRole('radio', { name: 'Cleric' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByTestId('guild-choice-wheel-status')).toHaveTextContent('Cleric selected');
});

test('arrow keys step round the wheel and wrap', () => {
  const { onChange } = setup('Barbarian');
  const wheel = screen.getByRole('radiogroup');
  fireEvent.keyDown(wheel, { key: 'ArrowRight' });
  expect(onChange).toHaveBeenLastCalledWith('Bard');
  fireEvent.keyDown(wheel, { key: 'ArrowLeft' });
  expect(onChange).toHaveBeenLastCalledWith('Druid');
  fireEvent.keyDown(wheel, { key: 'End' });
  expect(onChange).toHaveBeenLastCalledWith('Druid');
});

test('tapping a segment selects it', () => {
  const { onChange } = setup('Barbarian');
  const segment = screen.getByRole('radio', { name: 'Druid' });
  fireEvent.pointerDown(segment, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
  fireEvent.pointerUp(segment, { pointerId: 1, clientX: 10, clientY: 10 });
  expect(onChange).toHaveBeenCalledWith('Druid');
});

test('tapping the option already selected changes nothing', () => {
  const { onChange } = setup('Bard');
  const segment = screen.getByRole('radio', { name: 'Bard' });
  fireEvent.pointerDown(segment, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
  fireEvent.pointerUp(segment, { pointerId: 1, clientX: 10, clientY: 10 });
  expect(onChange).not.toHaveBeenCalled();
});

test('the wheel follows a selection made elsewhere', () => {
  const { rerender, onChange } = setup('Barbarian');
  rerender(<GuildChoiceWheel options={OPTIONS} value="Druid" onChange={onChange} label="Class" />);
  expect(screen.getByRole('radio', { name: 'Druid' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByTestId('guild-choice-wheel-status')).toHaveTextContent('Druid selected');
});

test('numeric wheels click only when the user turns to a different option', () => {
  playDialTick.mockClear();
  const options = ['8', '9', '10'].map((value) => ({ id: value, label: value }));
  const onChange = jest.fn();
  const { rerender } = render(<GuildChoiceWheel options={options} value="8" onChange={onChange} label="Strength" tickOnTurn />);
  expect(playDialTick).not.toHaveBeenCalled();
  rerender(<GuildChoiceWheel options={options} value="9" onChange={onChange} label="Strength" tickOnTurn />);
  expect(playDialTick).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
  expect(onChange).toHaveBeenCalledWith('10');
  expect(playDialTick).toHaveBeenCalledTimes(1);
});

test('choice wheels do not gain sounds unless explicitly opted in', () => {
  playDialTick.mockClear();
  setup();
  fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
  expect(playDialTick).not.toHaveBeenCalled();
});

describe('the centre hexagon as Confirm', () => {
  test('confirms the selected option, by tap or by Enter on the wheel', () => {
    const onConfirm = jest.fn();
    render(<GuildChoiceWheel options={OPTIONS} value="Cleric" onChange={jest.fn()} onConfirm={onConfirm} label="Class" caption="CLASS" />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Cleric' }));
    expect(onConfirm).toHaveBeenLastCalledWith('Cleric');
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  test('without onConfirm there is no Confirm button', () => {
    setup('Cleric');
    expect(screen.queryByTestId('guild-choice-wheel-confirm')).toBeNull();
  });
});

// jsdom has no PointerEvent; React reads pointerId and client coordinates.
class TestPointerEvent extends MouseEvent {
  constructor(type, init = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}




describe('turning the wheel by hand', () => {
  const RealPointerEvent = window.PointerEvent;
  beforeAll(() => { window.PointerEvent = TestPointerEvent; });
  afterAll(() => { window.PointerEvent = RealPointerEvent; });
  // The wheel's centre is at (100, 100); points on a circle round it.
  const at = (degrees) => {
    const radians = ((degrees - 90) * Math.PI) / 180;
    return { clientX: 100 + 80 * Math.cos(radians), clientY: 100 + 80 * Math.sin(radians) };
  };
  let clock = 0;
  beforeEach(() => {
    clock = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => clock);
  });
  afterEach(() => jest.restoreAllMocks());

  function wheelSvg() {
    const svg = screen.getByRole('radiogroup');
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 });
    return svg;
  }

  test('a short deliberate turn moves on to the next option instead of springing back', () => {
    const { onChange } = setup('Barbarian');
    wheelSvg();
    const segment = screen.getByRole('radio', { name: 'Barbarian' });
    fireEvent.pointerDown(segment, { pointerId: 1, button: 0, ...at(0) });
    clock = 1000;
    fireEvent.pointerMove(segment, { pointerId: 1, ...at(30) }); // a third of a wedge, then held still
    clock = 1500;
    fireEvent.pointerUp(segment, { pointerId: 1, ...at(30) });
    expect(onChange).toHaveBeenCalledWith('Druid');
  });

  test('a flick carries on past where the finger let go', () => {
    const { onChange } = setup('Barbarian');
    wheelSvg();
    const segment = screen.getByRole('radio', { name: 'Barbarian' });
    fireEvent.pointerDown(segment, { pointerId: 1, button: 0, ...at(0) });
    clock = 10;
    fireEvent.pointerMove(segment, { pointerId: 1, ...at(10) });
    clock = 40;
    fireEvent.pointerMove(segment, { pointerId: 1, ...at(30) });
    fireEvent.pointerUp(segment, { pointerId: 1, ...at(30) });
    // 30 degrees of drag, flicked: it glides on to the option two places round.
    expect(onChange).toHaveBeenCalledWith('Cleric');
  });

  test('a drag that starts off the ring does not turn the wheel', () => {
    const { onChange } = setup('Barbarian');
    const svg = wheelSvg();
    const ring = svg.querySelector('.guild-wheel__ring');
    const before = ring.style.transform;
    fireEvent.pointerDown(svg, { pointerId: 1, button: 0, ...at(0) });
    clock = 1000;
    fireEvent.pointerMove(svg, { pointerId: 1, ...at(90) });
    fireEvent.pointerUp(svg, { pointerId: 1, ...at(90) });
    expect(ring.style.transform).toBe(before);
    expect(onChange).not.toHaveBeenCalled();
  });
});
