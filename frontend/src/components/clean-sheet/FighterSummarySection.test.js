import React from 'react';
import { render, screen } from '@testing-library/react';
import FighterSummarySection from './FighterSummarySection';

describe('FighterSummarySection', () => {
  test('does not render for non-Fighter characters', () => {
    const { container } = render(<FighterSummarySection character={{ character_class: 'Wizard', level: 8 }} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders Champion summary for Fighter characters', () => {
    render(<FighterSummarySection character={{ character_class: 'Fighter', subclass: 'Champion', level: 15, rules_edition: '2014' }} />);

    expect(screen.getByText('Champion Features')).toBeInTheDocument();
    expect(screen.getByText('18–20')).toBeInTheDocument();
  });

  test('renders unsupported notice for recorded non-public Fighter subclasses', () => {
    render(<FighterSummarySection character={{ character_class: 'Fighter', subclass: 'Battle Master', level: 17, class_levels: { fighter: 7 }, rules_edition: '2014' }} />);

    expect(screen.getByText('Fighter Subclass Support')).toBeInTheDocument();
    expect(screen.getByText('Battle Master')).toBeInTheDocument();
    expect(screen.getByText(/detailed sheet automation is still being wired/i)).toBeInTheDocument();
  });
});
