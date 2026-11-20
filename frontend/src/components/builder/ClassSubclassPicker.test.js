import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ClassSubclassPicker from './ClassSubclassPicker';

describe('ClassSubclassPicker', () => {
  test('renders package-backed subclass options: the SRD subclass, not paid-book ones', () => {
    render(<ClassSubclassPicker className="Sorcerer" edition="2024" label="Sorcerous Origin" />);

    expect(screen.getByTestId('class-subclass-picker')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Draconic Bloodline' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Wild Magic' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Clockwork Soul' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Divine Soul' })).not.toBeInTheDocument();
  });

  test('keeps a character\'s existing edition-specific Sorcerer subclass available', () => {
    render(<ClassSubclassPicker className="Sorcerer" edition="2014" label="Sorcerous Origin" selectedSubclass="Divine Soul" />);

    expect(screen.getByRole('option', { name: 'Divine Soul' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Draconic Bloodline' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Clockwork Soul' })).not.toBeInTheDocument();
  });

  test('calls the subclass change handler', () => {
    const onSubclassChange = jest.fn();
    render(<ClassSubclassPicker className="Fighter" edition="2014" selectedSubclass="" onSubclassChange={onSubclassChange} />);

    fireEvent.change(screen.getByTestId('subclass-select'), { target: { value: 'Champion' } });

    expect(onSubclassChange).toHaveBeenCalledWith('Champion');
  });

  test('renders required state copy', () => {
    render(<ClassSubclassPicker className="Warlock" edition="2014" label="Otherworldly Patron" required requiredText="(REQUIRED at Level 1)" />);

    expect(screen.getByText('(REQUIRED at Level 1)')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '-- Choose a Otherworldly Patron --' })).toBeInTheDocument();
  });

  test('renders optional state copy for level 3 subclass classes', () => {
    render(<ClassSubclassPicker className="Fighter" edition="2014" optionalText="(optional now — typically chosen at level 3)" />);

    expect(screen.getByText('(optional now — typically chosen at level 3)')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Select later' })).toBeInTheDocument();
  });

  test('shows stale subclass warning', () => {
    render(<ClassSubclassPicker className="Sorcerer" edition="2024" selectedSubclass="Divine Soul" />);

    expect(screen.getByTestId('stale-subclass-warning')).toHaveTextContent('not available');
  });

  test('does not render when there are no subclass options', () => {
    const { container } = render(<ClassSubclassPicker className="" />);

    expect(container).toBeEmptyDOMElement();
  });
});
