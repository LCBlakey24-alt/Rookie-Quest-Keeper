import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import VerifiedAdminRoute from './VerifiedAdminRoute';

jest.mock('@/lib/apiClient', () => ({ get: jest.fn() }));

function openAdmin() {
  return render(<MemoryRouter initialEntries={['/admin']}><Routes>
    <Route path="/home" element={<h1>Home</h1>} />
    <Route path="/admin" element={<VerifiedAdminRoute><h1>Admin tools</h1></VerifiedAdminRoute>} />
  </Routes></MemoryRouter>);
}

test('non-admin accounts cannot open Admin directly by URL', async () => {
  apiClient.get.mockResolvedValueOnce({ data: { is_admin: false } });
  openAdmin();
  expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Admin tools' })).not.toBeInTheDocument();
  expect(apiClient.get).toHaveBeenCalledWith('/admin/check');
});

test('admin rights must be verified on the server', async () => {
  apiClient.get.mockResolvedValueOnce({ data: { is_admin: true } });
  openAdmin();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Admin tools' })).toBeInTheDocument());
});

test('backend errors fail closed instead of showing Admin', async () => {
  apiClient.get.mockRejectedValueOnce(new Error('service unavailable'));
  openAdmin();
  expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Admin tools' })).not.toBeInTheDocument();
});
