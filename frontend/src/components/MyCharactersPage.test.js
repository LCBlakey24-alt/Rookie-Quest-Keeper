import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import MyCharactersPage from './MyCharactersPage';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/characters']}>
      <MyCharactersPage />
    </MemoryRouter>
  );
}

const character = {
  id: 'char-1',
  name: 'Javen Crow',
  level: 9,
  race: 'Human',
  character_class: 'Warlock',
  subclass: 'Pact of the Blade',
  ruleset_id: 'dnd5e_2014',
  updated_at: '2026-08-24T12:00:00Z',
  homebrew_spellcasting: {
    Warlock: {
      class_name: 'Warlock',
      ability: 'charisma',
      type: 'known',
      progression: 'pact',
      start_level: 1,
    },
  },
};

describe('MyCharactersPage simplified library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.get.mockResolvedValue({ data: [character] });
  });

  test('keeps the page focused on the character list and core actions', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Javen Crow' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Characters' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Import/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Sheet/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duplicate Javen Crow' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Javen Crow' })).toBeInTheDocument();
  });

  test('preserves the custom spellcasting snapshot when duplicating a character', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: [character] })
      .mockResolvedValueOnce({ data: character })
      .mockResolvedValue({ data: [character] });
    apiClient.post.mockResolvedValue({ data: { success: true } });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Duplicate Javen Crow' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    expect(apiClient.post).toHaveBeenCalledWith('/characters', expect.objectContaining({
      name: 'Copy of Javen Crow',
      homebrew_spellcasting: character.homebrew_spellcasting,
    }));
  });

  test('does not render the retired stats dashboard or status toolbar', async () => {
    renderPage();

    await screen.findByRole('heading', { name: 'Javen Crow' });

    expect(screen.queryByText('Highest level')).not.toBeInTheDocument();
    expect(screen.queryByText('Latest update')).not.toBeInTheDocument();
    expect(screen.queryByText('Saved heroes')).not.toBeInTheDocument();
    expect(screen.queryByText(/Open the sheet for play/i)).not.toBeInTheDocument();
  });
});
