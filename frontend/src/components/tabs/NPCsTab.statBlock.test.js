import React from 'react';
import { render, screen } from '@testing-library/react';
import NPCsTab from './NPCsTab';
import apiClient from '@/lib/apiClient';

jest.mock('@/lib/apiClient', () => ({get:jest.fn()}));
jest.mock('@/components/RookFormFillPanel', () => () => null);

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
