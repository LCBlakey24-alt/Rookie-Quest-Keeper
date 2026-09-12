import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import StartingLevelClassSpecificChoices from './StartingLevelClassSpecificChoices';
import { WarlockChoiceSection } from './StartingLevelDetailedChoices';
import { buildClassSpecificChoicePlan } from '@/data/classSpecificChoiceEngine';

describe('starting level choice cards', () => {
  test('class choices add a selected option and report the capped selection', () => {
    const onChange = jest.fn();
    const plan = buildClassSpecificChoicePlan({ className: 'Sorcerer', level: 3 });

    render(
      <StartingLevelClassSpecificChoices
        plan={plan}
        selection={{}}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Quickened Spell Choose/i }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      metamagic: ['Quickened Spell'],
    }));
  });

  test('options beyond the maximum are disabled but selected options can still be removed', () => {
    const onChange = jest.fn();
    const plan = buildClassSpecificChoicePlan({ className: 'Sorcerer', level: 3 });

    render(
      <StartingLevelClassSpecificChoices
        plan={plan}
        selection={{ metamagic: ['Quickened Spell', 'Subtle Spell'] }}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('button', { name: /Twinned Spell Limit reached/i })).toBeDisabled();
    const selected = screen.getByRole('button', { name: /Quickened Spell Selected/i });
    expect(selected).not.toBeDisabled();

    fireEvent.click(selected);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      metamagic: ['Subtle Spell'],
    }));
  });

  test('warlock invocations use the same capped card interaction', () => {
    const onChange = jest.fn();
    const plan = {
      invocationsRequired: true,
      pactBoonRequired: false,
      invocationCount: 1,
      invocationOptions: ['Agonizing Blast', 'Repelling Blast'],
    };

    render(<WarlockChoiceSection plan={plan} selection={{}} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Agonizing Blast Choose/i }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      invocations: ['Agonizing Blast'],
    }));
  });
});
