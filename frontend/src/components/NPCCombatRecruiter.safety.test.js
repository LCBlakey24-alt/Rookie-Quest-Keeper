import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NPCCombatRecruiter from './NPCCombatRecruiter';
import apiClient from '@/lib/apiClient';
jest.mock('@/lib/apiClient',()=>({get:jest.fn()}));

test('recruiter excludes story-only records and preserves known actions on the combat copy', async () => {
  apiClient.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/npcs') ? [
    {id:'story',name:'Story infant',combat_ready:false,hp:10,ac:10},
    {id:'guard',name:'Synthetic Guard',hp:18,ac:14,actions:[{name:'Spear'}],stats:{strength:14}},
  ] : []}));
  const onAddNPC=jest.fn();
  render(<NPCCombatRecruiter campaignId="fixture" onAddNPC={onAddNPC} />);
  fireEvent.click(screen.getByRole('button',{name:/Add NPCs\/Creatures to Combat/}));
  await waitFor(()=>expect(screen.getByText('Synthetic Guard')).toBeVisible());
  expect(screen.queryByText('Story infant')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Add Ally/}));
  expect(onAddNPC).toHaveBeenCalledWith(expect.objectContaining({hp:18,ac:14,actions:[{name:'Spear'}],stats:{strength:14}}));
});
