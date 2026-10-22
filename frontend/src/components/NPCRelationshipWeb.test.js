import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import NPCRelationshipWeb, { focusedRelationshipLayout, isDuplicateRelationship, relatedNpcIds } from './NPCRelationshipWeb';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));
jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const npcs = [
  { id: 'godfrey', name: 'Godfrey Barfoot' },
  { id: 'mara', name: 'Mara Barfoot' },
  { id: 'pippa', name: 'Pippa Barfoot' },
];

function respondWith(npcList = npcs, links = []) {
  apiClient.get.mockImplementation(url => {
    if (url.endsWith('/npcs')) return Promise.resolve({ data: npcList });
    if (url.endsWith('/npc-relationships')) return Promise.resolve({ data: links });
    return Promise.reject(new Error('Unexpected path: ' + url));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  respondWith();
});

test('shows actual saved family connections and keeps campaign API scopes', async () => {
  respondWith(npcs, [{
    id: 'mother-son', source_id: 'godfrey', target_id: 'mara',
    relationship_type: 'family', description: 'Mara is Godfrey’s mother.',
  }]);
  render(<NPCRelationshipWeb campaignId="wednesday" />);
  const list = await screen.findByTestId('npc-relationship-list');
  expect(within(list).getByText('Mara is Godfrey’s mother.')).toBeInTheDocument();
  expect(apiClient.get).toHaveBeenCalledWith('/campaigns/wednesday/npcs');
  expect(apiClient.get).toHaveBeenCalledWith('/campaigns/wednesday/npc-relationships');
  expect(screen.getByText('1 saved links')).toBeInTheDocument();
});

test('saves a connection only if the server confirms it', async () => {
  apiClient.post.mockResolvedValue({ data: {
    id: 'new-link', source_id: 'godfrey', target_id: 'pippa',
    relationship_type: 'family', description: 'Brother and sister',
  }});
  render(<NPCRelationshipWeb campaignId="wednesday" />);
  await screen.findByText('0 saved links');
  fireEvent.change(screen.getByTestId('relationship-source'), { target: { value: 'godfrey' } });
  fireEvent.change(screen.getByTestId('relationship-target'), { target: { value: 'pippa' } });
  fireEvent.change(screen.getByTestId('relationship-description'), { target: { value: 'Brother and sister' } });
  fireEvent.click(screen.getByRole('button', { name: /save relationship/i }));
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(
    '/campaigns/wednesday/npc-relationships',
    expect.objectContaining({ source_id: 'godfrey', target_id: 'pippa' })
  ));
  expect(await screen.findByText('1 saved links')).toBeInTheDocument();
  expect(screen.getByText('Brother and sister')).toBeInTheDocument();
});

test('a rejected save never pretends that the relationship was added locally', async () => {
  apiClient.post.mockRejectedValue(new Error('Server unavailable'));
  render(<NPCRelationshipWeb campaignId="friday" />);
  await screen.findByText('0 saved links');
  fireEvent.change(screen.getByTestId('relationship-source'), { target: { value: 'mara' } });
  fireEvent.change(screen.getByTestId('relationship-target'), { target: { value: 'godfrey' } });
  fireEvent.click(screen.getByRole('button', { name: /save relationship/i }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('NOT saved')));
  expect(screen.getByText('0 saved links')).toBeInTheDocument();
  expect(screen.queryByTestId('npc-relationship-list')).not.toBeInTheDocument();
});

test('delete error preserves the relationship instead of silently hiding it', async () => {
  window.confirm = jest.fn(() => true);
  apiClient.delete.mockRejectedValue(new Error('Server unavailable'));
  respondWith(npcs, [{
    id: 'link-1', source_id: 'godfrey', target_id: 'mara',
    relationship_type: 'family', description: 'Mother and son',
  }]);
  render(<NPCRelationshipWeb campaignId="wednesday" />);
  const list = await screen.findByTestId('npc-relationship-list');
  fireEvent.click(within(list).getByRole('button', { name: /remove relationship between/i }));
  await waitFor(() => expect(apiClient.delete).toHaveBeenCalled());
  expect(screen.getByText('1 saved links')).toBeInTheDocument();
});

test('loading error is distinct from an empty campaign and can retry', async () => {
  apiClient.get.mockRejectedValueOnce(new Error('offline'));
  render(<NPCRelationshipWeb campaignId="wednesday" />);
  expect(await screen.findByTestId('npc-relationships-load-error')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /retry loading/i }));
  expect(await screen.findByText('0 saved links')).toBeInTheDocument();
});

test('network helper prevents duplicated reverse-direction links', () => {
  const links = [{ source_id: 'godfrey', target_id: 'mara' }];
  expect(isDuplicateRelationship(links, 'mara', 'godfrey')).toBe(true);
  expect(isDuplicateRelationship(links, 'godfrey', 'pippa')).toBe(false);
  expect(relatedNpcIds(links, 'mara')).toEqual(['godfrey']);
});

test('relationship network supports specific family and secret types and filters them', async () => {
  respondWith(npcs, [
    { id: 'family-1', source_id: 'mara', target_id: 'godfrey',
      relationship_type: 'parent', description: 'Mara is Godfrey’s mother.' },
    { id: 'secret-1', source_id: 'godfrey', target_id: 'pippa',
      relationship_type: 'secret_ally', description: 'Secret pact.' },
  ]);
  render(<NPCRelationshipWeb campaignId="wednesday" />);
  const list = await screen.findByTestId('npc-relationship-list');
  expect(within(list).getByText('Parent / child')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'Filter relationship type' }),
    { target: { value: 'secret_ally' } });
  expect(within(list).getByText('Secret allies')).toBeInTheDocument();
  expect(within(list).queryByText('Parent / child')).not.toBeInTheDocument();
  fireEvent.click(within(list).getByRole('button', { name: 'Godfrey Barfoot' }));
  expect(screen.getByTestId('selected-npc-relationships')).toHaveTextContent('Mara is Godfrey’s mother.');
});

test('editing a saved relationship updates its existing ID without delete or duplicate POST', async () => {
  respondWith(npcs, [{
    id: 'link-1', source_id: 'godfrey', target_id: 'mara',
    relationship_type: 'family', description: 'Family history',
  }]);
  apiClient.put.mockResolvedValue({ data: {
    id: 'link-1', source_id: 'mara', target_id: 'godfrey',
    relationship_type: 'parent', description: 'Mara is Godfrey’s mother.',
  } });
  render(<NPCRelationshipWeb campaignId="wednesday" />);
  const list = await screen.findByTestId('npc-relationship-list');
  fireEvent.click(within(list).getByRole('button', { name: /edit relationship between/i }));
  expect(screen.getByTestId('relationship-source')).toHaveValue('godfrey');
  fireEvent.change(screen.getByTestId('relationship-source'), { target: { value: 'mara' } });
  fireEvent.change(screen.getByTestId('relationship-target'), { target: { value: 'godfrey' } });
  fireEvent.change(screen.getByTestId('relationship-type'), { target: { value: 'parent' } });
  fireEvent.change(screen.getByTestId('relationship-description'),
    { target: { value: 'Mara is Godfrey’s mother.' } });
  fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
  await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith(
    '/campaigns/wednesday/npc-relationships/link-1',
    { source_id: 'mara', target_id: 'godfrey', relationship_type: 'parent',
      description: 'Mara is Godfrey’s mother.' }
  ));
  expect(await within(list).findByText('Parent / child')).toBeInTheDocument();
  expect(within(list).getByText('Mara is Godfrey’s mother.')).toBeInTheDocument();
  expect(apiClient.post).not.toHaveBeenCalled();
  expect(apiClient.delete).not.toHaveBeenCalled();
});

test('a failed relationship edit leaves saved connection unchanged', async () => {
  respondWith(npcs, [{
    id: 'link-1', source_id: 'godfrey', target_id: 'mara',
    relationship_type: 'family', description: 'Old history',
  }]);
  apiClient.put.mockRejectedValue(new Error('Network offline'));
  render(<NPCRelationshipWeb campaignId="friday" />);
  const list = await screen.findByTestId('npc-relationship-list');
  fireEvent.click(within(list).getByRole('button', { name: /edit relationship between/i }));
  fireEvent.change(screen.getByTestId('relationship-description'), { target: { value: 'New history' } });
  fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(within(list).getByText('Old history')).toBeInTheDocument();
  expect(within(list).queryByText('New history')).not.toBeInTheDocument();
  expect(apiClient.delete).not.toHaveBeenCalled();
});

test('a focused graph contains the NPC and direct connections only', () => {
  const nodes = [{ id: 'godfrey', name: 'Godfrey' }, { id: 'mara', name: 'Mara' },
    { id: 'pippa', name: 'Pippa' }, { id: 'unrelated', name: 'Other' }];
  const links = [{ id: 'a', source_id: 'godfrey', target_id: 'mara' },
    { id: 'b', source_id: 'pippa', target_id: 'godfrey' }];
  const layout = focusedRelationshipLayout(nodes, links, 'godfrey');
  expect(layout.ids).toEqual(expect.arrayContaining(['godfrey', 'mara', 'pippa']));
  expect(layout.ids).not.toContain('unrelated');
  expect(layout.positions.godfrey).toEqual({ x: 195, y: 70 });
  expect(layout.height).toBeGreaterThanOrEqual(310);
});

test('phone map offers a readable focus selector, links and a full-network switch', async () => {
  respondWith(npcs, [{
    id: 'link-1', source_id: 'godfrey', target_id: 'mara',
    relationship_type: 'parent', description: 'Mara is Godfrey’s mother.',
  }]);
  render(<NPCRelationshipWeb campaignId="wednesday" />);
  await screen.findByText('1 saved links');
  const map = screen.getByRole('region', { name: 'Visual NPC relationship map' });
  expect(within(map).getByRole('button', { name: 'Focused view' })).toHaveAttribute('aria-pressed', 'true');
  expect(within(map).getByLabelText(/Relationship network focused on/)).toBeInTheDocument();
  expect(within(map).getByLabelText('Focus relationship map on NPC')).toHaveValue('godfrey');
  fireEvent.click(within(map).getByRole('button', { name: 'Whole network' }));
  expect(within(map).getByLabelText('Complete campaign NPC network')).toBeInTheDocument();
  fireEvent.change(within(map).getByLabelText('Focus relationship map on NPC'), { target: { value: 'mara' } });
  expect(within(map).getByLabelText('Relationship network focused on Mara Barfoot')).toBeInTheDocument();
});

test('mobile relationship diagram is no longer hidden by responsive CSS', () => {
  const fs = require('fs');
  const path = require('path');
  const css = fs.readFileSync(path.join(__dirname, 'NPCRelationshipWeb.css'), 'utf8');
  expect(css).not.toContain('.rqk-rel-graph-panel { display: none; }');
  expect(css).toContain('.rqk-rel-graph-scroller--focus svg');
});
