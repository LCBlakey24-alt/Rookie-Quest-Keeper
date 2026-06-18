import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import BuilderChoicePanel from './BuilderChoicePanel';

const options = {
  Fighter: { name: 'Fighter' },
  Sorcerer: { name: 'Sorcerer' },
};

describe('BuilderChoicePanel', () => {
  test('renders choices and handles clicks', () => {
    const onValueChange = jest.fn();
    render(<BuilderChoicePanel options={options} onValueChange={onValueChange} />);

    expect(screen.getByText('Fighter')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('builder-choice-Fighter'));
    expect(onValueChange).toHaveBeenCalledWith('Fighter');
  });

  test('shows detail picker for selected choice', () => {
    render(<BuilderChoicePanel options={options} value="Fighter" />);

    expect(screen.getByTestId('class-subclass-picker')).toBeInTheDocument();
  });
});
