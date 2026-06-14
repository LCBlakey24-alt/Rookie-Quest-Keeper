import React from 'react';
import { render, screen } from '@testing-library/react';
import FighterSummarySection from './FighterSummarySection';

describe('FighterSummarySection character shapes', () => {
  test('renders when Fighter level is stored in classLevels', () => {
    render(<FighterSummarySection character={{
      character_class: 'Wizard',
      level: 17,
      classLevels: { Fighter: 3 },
      subclass: 'Champion',
      rules_edition: '2014',
    }} />);

    expect(screen.getByText('Champion Features')).toBeInTheDocument();
    expect(screen.getByText('19–20')).toBeInTheDocument();
  });

  test('renders when Fighter level is stored in a class entry list', () => {
    render(<FighterSummarySection character={{
      character_class: 'Wizard',
      level: 17,
      classes: [
        { name: 'Wizard', level: 14 },
        { name: 'Fighter', level: 3 },
      ],
      subclass: 'Champion',
      rules_edition: '2014',
    }} />);

    expect(screen.getByText('Champion Features')).toBeInTheDocument();
    expect(screen.getByText('19–20')).toBeInTheDocument();
  });
});
