import React from 'react';
import { render, screen } from '@testing-library/react';
import FighterSummarySection from './FighterSummarySection';

describe('FighterSummarySection direct Fighter level fields', () => {
  test('renders when Fighter level is stored as fighter_level', () => {
    render(<FighterSummarySection character={{
      character_class: 'Wizard',
      level: 17,
      fighter_level: 3,
      subclass: 'Champion',
      rules_edition: '2014',
    }} />);

    expect(screen.getByText('Champion Features')).toBeInTheDocument();
    expect(screen.getByText('19–20')).toBeInTheDocument();
  });

  test('renders when Fighter level is stored as fighterLevel', () => {
    render(<FighterSummarySection character={{
      character_class: 'Wizard',
      level: 17,
      fighterLevel: 3,
      subclass: 'Champion',
      rules_edition: '2014',
    }} />);

    expect(screen.getByText('Champion Features')).toBeInTheDocument();
    expect(screen.getByText('19–20')).toBeInTheDocument();
  });
});
