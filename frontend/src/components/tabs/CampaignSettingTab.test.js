import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import CampaignSettingTab from './CampaignSettingTab';

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
    error: jest.fn(),
  },
}));

const settingResponse = {
  data: {
    content: [
      '# World Overview',
      '',
      '## Public Overview',
      'Baldering is being rebuilt.',
      '',
      '## Current Situation',
      'The council is forming.',
      '',
      '## Tone & Themes',
      'Hope after ruin.',
      '',
      '## GM Truths & Secrets',
      'A hidden threat remains.',
      '',
      '## Import Parking',
      'Sort the old palace notes.',
    ].join('\n'),
  },
};

const worldResponse = {
  data: {
    world_setting: 'high_fantasy',
    world_setting_notes: 'Stored AI context',
    available_settings: [
      { id: 'high_fantasy', name: 'High fantasy' },
      { id: 'gothic_horror', name: 'Gothic horror' },
    ],
  },
};

describe('CampaignSettingTab reliability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('blocks editing and saving when the initial world-note load fails', async () => {
    apiClient.get.mockRejectedValue(new Error('offline'));

    render(<CampaignSettingTab campaignId="campaign-1" />);

    expect(await screen.findByTestId('campaign-setting-warning')).toHaveTextContent(
      'Some world notes could not be loaded. Retry before editing or saving.'
    );
    expect(screen.getByTestId('campaign-setting-save')).toBeDisabled();
    expect(screen.getByLabelText('Public Overview')).toBeDisabled();
    expect(screen.getByLabelText('World tone')).toBeDisabled();
  });

  test('keeps last-known-good notes visible when a later reload fails', async () => {
    apiClient.get
      .mockResolvedValueOnce(settingResponse)
      .mockResolvedValueOnce(worldResponse)
      .mockRejectedValueOnce(new Error('setting offline'))
      .mockRejectedValueOnce(new Error('world offline'));

    render(<CampaignSettingTab campaignId="campaign-1" />);

    const overview = await screen.findByLabelText('Public Overview');
    expect(overview).toHaveValue('Baldering is being rebuilt.');
    expect(screen.getByLabelText('World tone')).toHaveValue('high_fantasy');
    expect(screen.getByTestId('campaign-setting-save')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('campaign-setting-reload'));

    await waitFor(() => {
      expect(screen.getByTestId('campaign-setting-warning')).toHaveTextContent(
        'Some world notes could not refresh. Showing the last loaded data for anything that failed.'
      );
    });

    expect(screen.getByLabelText('Public Overview')).toHaveValue('Baldering is being rebuilt.');
    expect(screen.getByLabelText('World tone')).toHaveValue('high_fantasy');
    expect(screen.getByTestId('campaign-setting-save')).not.toBeDisabled();
    expect(toast.error).toHaveBeenCalledWith(
      'Some world notes could not refresh. Showing the last loaded data for anything that failed.'
    );
  });

  test('allows a partial load to be read without allowing it to overwrite the missing source', async () => {
    apiClient.get
      .mockResolvedValueOnce(settingResponse)
      .mockRejectedValueOnce(new Error('world offline'));

    render(<CampaignSettingTab campaignId="campaign-1" />);

    expect(await screen.findByTestId('campaign-setting-warning')).toHaveTextContent(
      'Some world notes could not be loaded. Retry before editing or saving.'
    );
    expect(screen.getByLabelText('Public Overview')).toHaveValue('Baldering is being rebuilt.');
    expect(screen.getByLabelText('Public Overview')).not.toBeDisabled();
    expect(screen.getByLabelText('World tone')).toBeDisabled();
    expect(screen.getByTestId('campaign-setting-save')).toBeDisabled();
  });
});
