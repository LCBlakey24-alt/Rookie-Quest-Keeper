import React from 'react';
import { render, screen } from '@testing-library/react';
import NPCsTab from './NPCsTab';
import apiClient from '@/lib/apiClient';

jest.mock('@/lib/apiClient', () => ({get:jest.fn()}));
jest.mock('@/components/RookFormFillPanel', () => () => null);

test('offline NPC library leaves the full width for saved records and explains unavailable ROOK', async () => {
  window.rookieDesktop={offline:true};
  try {
    apiClient.get.mockResolvedValue({data:[{id:'fixture',name:'Saved offline NPC',description:'Local reference'}]});
    render(<NPCsTab campaignId="fixture" />);
    expect(await screen.findByText('Local reference')).toBeVisible();
    expect(screen.queryByTestId('summon-npc-btn')).not.toBeInTheDocument();
    expect(screen.getByText(/ROOK generation needs the online service/)).toBeInTheDocument();
  } finally { delete window.rookieDesktop; }
});

test('NPC library exposes saved story and combat information without a second disclosure', async () => {
  const npcs = [
    {id:'story',name:'Example Councillor',role:'First councillor',description:'Saved campaign description.',combat_ready:false},
    {id:'guard',name:'Example Guard',role:'Watch officer',hp:19,ac:13,attacks:[{name:'Example Strike',bonus:'+3',damage:'1d6+1 bludgeoning'}]},
  ];
  const before = JSON.stringify(npcs);
  apiClient.get.mockResolvedValue({data:npcs});
  render(<NPCsTab campaignId="fixture-campaign" />);
  expect(await screen.findByText('Saved campaign description.')).toBeVisible();
  expect(screen.getByText('First councillor')).toBeVisible();
  expect(screen.getByText('Example Strike')).toBeVisible();
  expect(screen.getByRole('button',{name:'Edit Example Councillor'})).toBeVisible();
  expect(screen.getByRole('button',{name:'Delete Example Guard'})).toBeVisible();
  expect(screen.getByTestId('npc-combat-card-story').tagName).toBe('DIV');
  expect(screen.queryByText(/Combat card · HP/)).not.toBeInTheDocument();
  expect(JSON.stringify(npcs)).toBe(before);
});
