import React from 'react';
import { render, screen } from '@testing-library/react';
import FighterSubclassSummaryPanel from './FighterSubclassSummaryPanel';

describe('FighterSubclassSummaryPanel', () => {
  test('does not render without subclass summary data', () => {
    const { container } = render(<FighterSubclassSummaryPanel summary={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders Champion critical range', () => {
    render(<FighterSubclassSummaryPanel summary={{ edition: '2014', isChampion: true, criticalRange: { label: '18–20' }, subclassFeatures: [] }} />);
    expect(screen.getByText('Champion Features')).toBeInTheDocument();
    expect(screen.getByText('18–20')).toBeInTheDocument();
  });

  test('renders unsupported subclass notice', () => {
    render(<FighterSubclassSummaryPanel summary={{ edition: '2014', isUnsupportedSubclass: true, unsupportedSubclassLabel: 'Samurai', subclassFeatures: [] }} />);
    expect(screen.getByText('Fighter Subclass Support')).toBeInTheDocument();
    expect(screen.getByText('Samurai')).toBeInTheDocument();
    expect(screen.getByText(/detailed sheet automation is still being wired/i)).toBeInTheDocument();
  });

});
