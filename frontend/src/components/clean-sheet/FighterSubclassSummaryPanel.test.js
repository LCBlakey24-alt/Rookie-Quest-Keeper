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

  test('renders Battle Master resource summary', () => {
    render(<FighterSubclassSummaryPanel summary={{ edition: '2014', isBattleMaster: true, battleMaster: { superiorityDice: 6, superiorityDie: 10, maneuverCount: 9 }, subclassFeatures: [] }} />);
    expect(screen.getByText('Battle Master Features')).toBeInTheDocument();
    expect(screen.getByText('d10')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  test('renders Samurai subclass summary', () => {
    render(<FighterSubclassSummaryPanel summary={{ edition: '2014', isSamurai: true, samurai: { fightingSpiritUses: 3 }, subclassFeatures: [{ level: 3, key: 'fighting_spirit', name: 'Fighting Spirit', description: 'Focused turn.' }] }} />);
    expect(screen.getByText('Samurai Features')).toBeInTheDocument();
    expect(screen.getByText('Fighting Spirit')).toBeInTheDocument();
    expect(screen.getByText('Active subclass features')).toBeInTheDocument();
  });

  test('renders unsupported subclass notice', () => {
    render(<FighterSubclassSummaryPanel summary={{ edition: '2014', isUnsupportedSubclass: true, unsupportedSubclassLabel: 'Samurai', subclassFeatures: [] }} />);
    expect(screen.getByText('Fighter Subclass Support')).toBeInTheDocument();
    expect(screen.getByText('Samurai')).toBeInTheDocument();
    expect(screen.getByText(/detailed sheet automation is still being wired/i)).toBeInTheDocument();
  });

  test('renders magic subclass spell slots', () => {
    render(<FighterSubclassSummaryPanel summary={{ edition: '2024', isMagicSubclass: true, magicSubclass: { spellSlots: [4, 3, 3, 0] }, subclassFeatures: [] }} />);
    expect(screen.getByText('Magic Fighter Features')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getAllByText('3')).toHaveLength(2);
  });
});
