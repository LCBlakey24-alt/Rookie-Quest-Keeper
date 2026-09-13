import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import StartingLevelClassSpecificChoices from './StartingLevelClassSpecificChoices';
import { SpellChoiceSection, WarlockChoiceSection } from './StartingLevelDetailedChoices';
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

  test('options beyond the maximum stay focusable but cannot be selected', () => {
    const onChange = jest.fn();
    const plan = buildClassSpecificChoicePlan({ className: 'Sorcerer', level: 3 });

    render(
      <StartingLevelClassSpecificChoices
        plan={plan}
        selection={{ metamagic: ['Quickened Spell', 'Subtle Spell'] }}
        onChange={onChange}
      />,
    );

    const capped = screen.getByRole('button', { name: /Twinned Spell Limit reached/i });
    expect(capped).toHaveAttribute('aria-disabled', 'true');
    expect(capped).not.toBeDisabled();
    fireEvent.click(capped);
    expect(onChange).not.toHaveBeenCalled();

    const selected = screen.getByRole('button', { name: /Quickened Spell Selected/i });
    expect(selected).not.toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(selected);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      metamagic: ['Subtle Spell'],
    }));
  });

  test('long class choice lists can be searched', () => {
    const plan = buildClassSpecificChoicePlan({ className: 'Fighter', level: 3, subclassName: 'Battle Master' });

    render(
      <StartingLevelClassSpecificChoices
        plan={plan}
        selection={{}}
        onChange={jest.fn()}
      />,
    );

    const search = screen.getByRole('searchbox', { name: /Search battle master maneuvers/i });
    fireEvent.change(search, { target: { value: 'Riposte' } });

    expect(screen.getByRole('button', { name: /Riposte Choose/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Trip Attack Choose/i })).not.toBeInTheDocument();
  });

  test('legacy spell class choices no longer render a duplicate chooser', () => {
    const { container } = render(
      <SpellChoiceSection
        plan={{
          hasKnownSpellPicker: false,
          hasPreparedSpellPicker: false,
          cantripTarget: 0,
          classChoicePlan: { hasChoices: true },
        }}
        selection={{}}
        onChange={jest.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  test('non-Battle-Master fighters do not get maneuver choices', () => {
    const plan = buildClassSpecificChoicePlan({ className: 'Fighter', level: 3, subclassName: 'Champion' });

    render(
      <StartingLevelClassSpecificChoices
        plan={plan}
        selection={{}}
        onChange={jest.fn()}
      />,
    );

    expect(screen.queryByText('Battle Master maneuvers')).not.toBeInTheDocument();
  });

  test('Pact Boon cards keep the same saved boon name as the old selector', () => {
    const onChange = jest.fn();
    const plan = {
      invocationsRequired: false,
      pactBoonRequired: true,
      invocationCount: 0,
      invocationOptions: [],
      pactBoonOptions: [
        { key: 'blade', name: 'Pact of the Blade', summary: 'Weapon-focused pact option.' },
        { key: 'chain', name: 'Pact of the Chain', summary: 'Companion-focused pact option.' },
      ],
    };

    render(<WarlockChoiceSection plan={plan} selection={{}} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Pact of the Blade.*Weapon-focused pact option.*Choose/i }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      pactBoon: 'Pact of the Blade',
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
