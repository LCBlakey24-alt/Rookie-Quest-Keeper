import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import TvLinkCard from './TvLinkCard';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

beforeEach(() => { jest.clearAllMocks(); window.confirm = jest.fn(() => true); });

test('makes a TV link, shows the code, resets and turns it off', async () => {
  apiClient.get.mockResolvedValue({ data: { code: null } });
  apiClient.post.mockResolvedValueOnce({ data: { code: 'ABCD2345' } }).mockResolvedValueOnce({ data: { code: 'WXYZ6789' } });
  apiClient.delete.mockResolvedValue({ data: { code: null } });
  render(<TvLinkCard campaignId="c1" />);

  fireEvent.click(await screen.findByTestId('tv-link-make'));
  expect(await screen.findByTestId('tv-link-code')).toHaveTextContent('ABCD2345');
  expect(apiClient.post).toHaveBeenCalledWith('/campaigns/c1/tv-link');
  expect(screen.getByText(`${window.location.origin}/tv`)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /New code/ }));
  await waitFor(() => expect(screen.getByTestId('tv-link-code')).toHaveTextContent('WXYZ6789'));

  fireEvent.click(screen.getByRole('button', { name: /Turn off/ }));
  await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/campaigns/c1/tv-link'));
  expect(await screen.findByTestId('tv-link-make')).toBeInTheDocument();
});
