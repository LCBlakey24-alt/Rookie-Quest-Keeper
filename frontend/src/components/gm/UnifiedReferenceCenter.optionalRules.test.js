import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import UnifiedReferenceCenter from './UnifiedReferenceCenter';

jest.mock('@/lib/apiClient', () => ({
  get: jest.fn(), put: jest.fn(),
}));
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  apiClient.get.mockImplementation(url => Promise.resolve({
    data: url.includes('/campaign-b/') ? { chaos: 8, fate: 2, history: [] } : { chaos: 3, fate: 1, history: [] },
  }));
  apiClient.put.mockImplementation((_url, data) => Promise.resolve({ data }));
});

test('the reference catalogue defaults to weapons without fetching optional tokens', () => {
  render(<UnifiedReferenceCenter campaignId="campaign-a" />);
  expect(screen.getByRole('button', { name: 'Weapons' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Optional Rules' })).toBeInTheDocument();
  expect(screen.queryByTestId('chaos-fate-tracker')).not.toBeInTheDocument();
  expect(apiClient.get).not.toHaveBeenCalled();
  expect(apiClient.put).not.toHaveBeenCalled();
});

test('the optional tab reads the existing campaign ledger and never awards on opening', async () => {
  render(<UnifiedReferenceCenter campaignId="campaign-a" />);
  fireEvent.click(screen.getByRole('button', { name: 'Optional Rules' }));
  expect(screen.getByTestId('reference-optional-rules')).toHaveTextContent('optional campaign house rule');
  await waitFor(() => expect(screen.getByTestId('chaos-count')).toHaveTextContent('3'));
  expect(screen.getByTestId('fate-count')).toHaveTextContent('1');
  expect(apiClient.get).toHaveBeenCalledWith('/campaigns/campaign-a/chaos-fate');
  expect(apiClient.put).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '+ Award Chaos' }));
  await waitFor(() => expect(apiClient.put).toHaveBeenCalledTimes(1));
  expect(apiClient.put.mock.calls[0][0]).toBe('/campaigns/campaign-a/chaos-fate');
  expect(apiClient.put.mock.calls[0][1]).toEqual(expect.objectContaining({ chaos: 4, fate: 1 }));
});

test('optional token management is not offered outside a GM campaign context', () => {
  render(<UnifiedReferenceCenter />);
  expect(screen.queryByRole('button', { name: 'Optional Rules' })).not.toBeInTheDocument();
  expect(screen.queryByTestId('chaos-fate-tracker')).not.toBeInTheDocument();
});

test('campaign switches remount the optional ledger for the new campaign', async () => {
  const view = render(<UnifiedReferenceCenter campaignId="campaign-a" />);
  fireEvent.click(screen.getByRole('button', { name: 'Optional Rules' }));
  await waitFor(() => expect(screen.getByTestId('chaos-count')).toHaveTextContent('3'));
  view.rerender(<UnifiedReferenceCenter campaignId="campaign-b" />);
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/campaigns/campaign-b/chaos-fate'));
  await waitFor(() => expect(screen.getByTestId('chaos-count')).toHaveTextContent('8'));
  expect(screen.getByTestId('fate-count')).toHaveTextContent('2');
});

test('Live Play header has no permanent Chaos & Fate utility and the reference gets campaignId', () => {
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(path.resolve(__dirname, './LiveSessionGridPage.js'), 'utf8');
  expect(source).not.toContain('aria-label="Chaos and Fate tracker"');
  expect(source).toContain('<UnifiedReferenceCenter campaignId={campaignId}');
});
