import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PlayerSuggestionBox from './PlayerSuggestionBox';
import apiClient from '@/lib/apiClient';

jest.mock('@/lib/apiClient', () => ({
  post: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('PlayerSuggestionBox', () => {
  beforeEach(() => {
    apiClient.post.mockReset();
    apiClient.post.mockResolvedValue({ data: { id: 'suggestion-1' } });
    window.history.pushState({}, '', '/player');
  });

  test('submits a class request into the existing admin feedback queue', async () => {
    render(<PlayerSuggestionBox />);

    fireEvent.click(screen.getByRole('button', { name: /Suggest something/i }));
    fireEvent.change(screen.getByLabelText(/What kind of suggestion/i), { target: { value: 'class' } });
    fireEvent.change(screen.getByLabelText(/Short title/i), { target: { value: 'Add Artificer support' } });
    fireEvent.change(screen.getByLabelText(/What would you like us to add or improve/i), {
      target: { value: 'Please add the Artificer class and its subclass choices to character creation.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send suggestion/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/feedback', {
      category: 'feature',
      area: 'rules-content',
      title: 'Add Artificer support',
      message: 'Please add the Artificer class and its subclass choices to character creation.',
      page_path: '/player',
      priority: 'low',
    }));
  });

  test('keeps incomplete suggestions local instead of posting them', () => {
    render(<PlayerSuggestionBox />);

    fireEvent.click(screen.getByRole('button', { name: /Suggest something/i }));
    fireEvent.change(screen.getByLabelText(/Short title/i), { target: { value: 'Hi' } });
    fireEvent.change(screen.getByLabelText(/What would you like us to add or improve/i), { target: { value: 'Too short' } });
    fireEvent.click(screen.getByRole('button', { name: /Send suggestion/i }));

    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
