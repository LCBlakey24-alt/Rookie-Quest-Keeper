
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { KeeperAnnouncementCarousel, UrgentKeeperNotices, isUrgentKeeperUpdate } from './HomeUpdates';

const updates = [
  { id: 'alert', label: 'Service Alert', title: 'Maintenance warning', text: 'Example downtime' },
  { id: 'one', label: 'News', title: 'Welcome to Keeper', text: 'First announcement', is_pinned: true },
  { id: 'two', label: 'Update', title: 'New updates', text: 'Second announcement' },
];
test('recognises urgent messages only from an explicit flag or service label', () => {
  expect(isUrgentKeeperUpdate(updates[0])).toBe(true);
  expect(isUrgentKeeperUpdate({ is_urgent: true })).toBe(true);
  expect(isUrgentKeeperUpdate(updates[1])).toBe(false);
  expect(isUrgentKeeperUpdate({ label: 'New feature' })).toBe(false);
});
test('urgent notices stay separate from manually navigated slides', () => {
  render(<><UrgentKeeperNotices items={updates}/><KeeperAnnouncementCarousel items={updates} loading={false} error="" onRefresh={jest.fn()}/></>);
  expect(screen.getByText('Maintenance warning')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Welcome to Keeper' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next announcement' }));
  expect(screen.getByRole('heading', { name: 'New updates' })).toBeInTheDocument();
  expect(screen.getByText('Maintenance warning')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Previous announcement' }));
  expect(screen.getByRole('heading', { name: 'Welcome to Keeper' })).toBeInTheDocument();
});
test('empty updates produce genuine empty state instead of fictional news', () => {
  render(<KeeperAnnouncementCarousel items={[]} loading={false} error="" onRefresh={jest.fn()}/>);
  expect(screen.getByText(/No announcements yet/)).toBeInTheDocument();
});
