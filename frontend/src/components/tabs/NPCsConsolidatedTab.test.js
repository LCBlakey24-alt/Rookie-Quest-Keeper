import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import NPCsConsolidatedTab from './NPCsConsolidatedTab';

jest.mock('./NPCsTab', () => function MockNpcLibrary({ campaignId }) {
  const React = require('react');
  return React.createElement('div', { 'data-testid': 'mock-npc-library' }, campaignId);
});
jest.mock('../gm/QuickNpcGenerator', () => function MockNpcGenerator({ campaignId }) {
  const React = require('react');
  return React.createElement('div', { 'data-testid': 'mock-npc-generator' }, campaignId);
});
jest.mock('../NPCRelationshipWeb', () => function MockNpcWeb({ campaignId }) {
  const React = require('react');
  return React.createElement('div', { 'data-testid': 'mock-npc-web' }, campaignId);
});

describe('Guild Ledger NPC workspace', () => {
  test('starts in the full NPC library with three accessible named tools', () => {
    render(<NPCsConsolidatedTab campaignId="eldritch-heralds" />);
    const tablist = screen.getByRole('tablist', { name: 'NPC workspace tools' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', tabs[0].id);
    expect(screen.getByTestId('mock-npc-library')).toHaveTextContent('eldritch-heralds');
    expect(screen.queryByTestId('mock-npc-web')).not.toBeInTheDocument();
  });

  test('keyboard arrows, Home and End switch tools and keep focus visible', () => {
    render(<NPCsConsolidatedTab campaignId="wednesday" />);
    const tabs = screen.getAllByRole('tab');
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveFocus();
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('mock-npc-generator')).toHaveTextContent('wednesday');
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(tabs[2]).toHaveFocus();
    expect(screen.getByTestId('mock-npc-web')).toHaveTextContent('wednesday');
    fireEvent.keyDown(tabs[2], { key: 'Home' });
    expect(tabs[0]).toHaveFocus();
    expect(screen.getByTestId('mock-npc-library')).toHaveTextContent('wednesday');
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(tabs[2]).toHaveFocus();
  });

  test('changing from one campaign to another returns to the NPC library', () => {
    const view = render(<NPCsConsolidatedTab campaignId="eldritch-heralds" />);
    fireEvent.click(screen.getByTestId('npcs-subtab-web'));
    expect(screen.getByTestId('mock-npc-web')).toHaveTextContent('eldritch-heralds');
    view.rerender(<NPCsConsolidatedTab campaignId="spilsby-wednesday" />);
    expect(screen.getByTestId('mock-npc-library')).toHaveTextContent('spilsby-wednesday');
    expect(screen.queryByTestId('mock-npc-web')).not.toBeInTheDocument();
  });

  test('the mobile navigation uses a responsive grid rather than an oversized scrolling strip', () => {
    const fs = require('fs');
    const path = require('path');
    const css = fs.readFileSync(path.join(__dirname, 'NPCsConsolidatedTab.css'), 'utf8');
    expect(css).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(css).toContain('@media (max-width: 640px)');
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(css).toContain('min-height: 68px');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).not.toMatch(/#FF2DAA|rgba\(255,\s*45,\s*170/i);
  });
});
