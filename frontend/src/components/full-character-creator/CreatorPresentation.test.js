import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Sparkles } from 'lucide-react';

import { Choice, Chip, LanguagePicker, ReadinessPanel, ReviewItem, Title } from './CreatorPresentation';

describe('creator presentation primitives', () => {
  test('keeps selected choice semantics and reference-vs-interactive grouping', () => {
    const onClick = jest.fn();
    const { container } = render(
      <>
        <Choice title="Skills" interactive>
          <Chip active onClick={onClick}>Athletics</Chip>
        </Choice>
        <Choice title="Traits preview"><span>Darkvision</span></Choice>
      </>,
    );

    expect(container.querySelector('.full-creator-choice-block.is-interactive')).toBeInTheDocument();
    expect(container.querySelector('.full-creator-choice-block.is-reference')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Athletics' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Athletics' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('renders section, language, review and readiness presentation without owning rules', () => {
    render(
      <>
        <Title icon={Sparkles} title="Character setup" text="Start here." />
        <LanguagePicker
          title="Race languages"
          count={1}
          selected={['Elvish']}
          unavailable={['Dwarvish']}
          onToggle={jest.fn()}
        />
        <ReviewItem label="Speed" value="30 ft" />
        <ReadinessPanel report={{ priority: [], later: [], complete: ['Name is ready.'] }} />
      </>,
    );

    expect(screen.getByRole('heading', { name: 'Character setup' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Elvish' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('30 ft')).toBeInTheDocument();
    expect(screen.getByText('Ready to create')).toBeInTheDocument();
    expect(screen.getByText('Name is ready.')).toBeInTheDocument();
  });
});
