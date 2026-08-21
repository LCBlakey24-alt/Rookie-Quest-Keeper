import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LiveQuestRunnerV2 from './LiveQuestRunnerV2';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  },
}));

const emptyResourceResponse = { data: [] };

function successfulResourceGet(url) {
  if (url.endsWith('/quests')) return Promise.resolve({ data: [{
    id: 'quest-1',
    title: 'Find the Missing Children',
    summary: 'Follow the trail.',
    status: 'active',
    objectives: [{ id: 'objective-1', title: 'Enter the cave', status: 'upcoming', linked_encounter_id: 'enc-1' }],
    linked_encounter_ids: ['enc-1'],
  }] });
  if (url.endsWith('/combat-scenarios')) return Promise.resolve({ data: [{ id: 'enc-1', name: 'Cave Ritual' }] });
  return Promise.resolve(emptyResourceResponse);
}

describe('LiveQuestRunnerV2 reliability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('does not present a failed quest request as an empty quest list', async () => {
    apiClient.get.mockImplementation(url => {
      if (url.endsWith('/quests')) return Promise.reject(new Error('offline'));
      return Promise.resolve(emptyResourceResponse);
    });

    render(<LiveQuestRunnerV2 campaignId="campaign-1" />);

    expect(await screen.findByTestId('live-quest-load-warning')).toHaveTextContent('could not load the quest list');
    expect(screen.queryByText('No open quests.')).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Could not load live quests');
  });

  test('warns when linked resource libraries only partly load while keeping quests usable', async () => {
    apiClient.get.mockImplementation(url => {
      if (url.endsWith('/quests')) return successfulResourceGet(url);
      if (url.endsWith('/combat-scenarios')) return Promise.reject(new Error('encounters unavailable'));
      return Promise.resolve(emptyResourceResponse);
    });

    render(<LiveQuestRunnerV2 campaignId="campaign-1" />);

    expect(await screen.findByText('Find the Missing Children')).toBeInTheDocument();
    expect(screen.getByTestId('live-quest-resource-warning')).toHaveTextContent('encounters');
  });

  test('does not open Combat when the linked encounter handoff cannot be stored', async () => {
    apiClient.get.mockImplementation(successfulResourceGet);
    const openCombat = jest.fn();
    const storageSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage full');
    });

    try {
      render(
        <>
          <button type="button" data-testid="live-tool-combat" onClick={openCombat}>Combat tool</button>
          <LiveQuestRunnerV2 campaignId="campaign-1" />
        </>
      );

      const questTitle = await screen.findByText('Find the Missing Children');
      fireEvent.click(questTitle);
      fireEvent.click(await screen.findByTitle('Run linked encounter'));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not prepare the linked encounter. Stay on this quest and try again.'));
      expect(openCombat).not.toHaveBeenCalled();
    } finally {
      storageSpy.mockRestore();
    }
  });
});
