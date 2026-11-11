import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import GuildChoiceWheel from './GuildChoiceWheel';

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
