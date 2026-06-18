import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ClassSubclassPicker from './ClassSubclassPicker';

describe('ClassSubclassPicker', () => {
  test('renders package-backed subclass options', () => {
    render(<ClassSubclassPicker className="Sorcerer" edition="2024" label="Sorcerous Origin" />);

    expect(screen.getByTestId('class-subclass-picker')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Wild Magic' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Clockwork Soul' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Divine Soul' })).not.toBeInTheDocument();
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

  test('shows stale subclass warning', () => {
    render(<ClassSubclassPicker className="Sorcerer" edition="2024" selectedSubclass="Divine Soul" />);

    expect(screen.getByTestId('stale-subclass-warning')).toHaveTextContent('not available');
  });

  test('does not render when there are no subclass options', () => {
    const { container } = render(<ClassSubclassPicker className="" />);

    expect(container).toBeEmptyDOMElement();
  });
});
