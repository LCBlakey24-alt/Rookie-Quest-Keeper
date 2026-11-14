import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
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
};

function SheetLocationProbe() {
  const location = useLocation();
  return <p data-testid="sheet-return-path">{location.state?.playerReturnTo || 'missing'}</p>;
}

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

  test('opens a sheet with a return link back to My Characters', async () => {
    render(
      <MemoryRouter initialEntries={['/characters']}>
        <Routes>
          <Route path="/characters" element={<MyCharactersPage />} />
          <Route path="/characters/:characterId" element={<SheetLocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('link', { name: /Open Sheet/i }));
    expect(screen.getByTestId('sheet-return-path')).toHaveTextContent('/characters');
  });

  test('duplicates the full sheet without copying its identity or campaign link', async () => {
    const fullCharacter = {
      ...character,
      user_id: 'owner',
      campaign_id: 'campaign-1',
      campaign_name: 'Campaign',
      class_levels: { Warlock: 5, Fighter: 4 },
      classes: [{ name: 'Warlock', level: 5 }, { name: 'Fighter', level: 4, subclass: 'Champion' }],
      spellbook: [{ name: 'Shield' }],
      resources: { custom: { current: 1, maximum: 3 } },
      homebrew_actions: [{ name: 'Custom attack' }],
      current_hit_points: 0,
      max_hit_points: 50,
      speed: 0,
      conditions: ['Unconscious'],
      has_inspiration: true,
      concentration: 'Hex',
      death_saves_failures: 2,
    };
    apiClient.get.mockImplementation((url) => Promise.resolve({ data: url === '/characters/char-1' ? fullCharacter : [character] }));
    apiClient.post.mockResolvedValue({ data: {} });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Duplicate Javen Crow' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    const [url, payload] = apiClient.post.mock.calls[0];
    expect(url).toBe('/characters');
    expect(payload).toMatchObject({
      name: 'Copy of Javen Crow',
      class_levels: fullCharacter.class_levels,
      classes: fullCharacter.classes,
      spellbook: fullCharacter.spellbook,
      resources: fullCharacter.resources,
      homebrew_actions: fullCharacter.homebrew_actions,
      current_hit_points: 0,
      speed: 0,
      conditions: [],
      has_inspiration: false,
      concentration: '',
      death_saves_failures: 0,
    });
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('user_id');
    expect(payload).not.toHaveProperty('campaign_id');
    expect(payload).not.toHaveProperty('campaign_name');
    expect(payload).not.toHaveProperty('updated_at');
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
