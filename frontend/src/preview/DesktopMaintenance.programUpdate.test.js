import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DesktopMaintenance from './DesktopMaintenance';
import { DESKTOP_STORAGE_KEY } from './previewMode';

describe('offline portable program update controls', () => {
  const originalDesktop = window.rookieDesktop;
  const originalConfirm = window.confirm;
  const checksum = 'f'.repeat(64);
  let desktop;

  beforeEach(() => {
    localStorage.setItem(DESKTOP_STORAGE_KEY, '{"version":1,"campaigns":[]}');
    window.confirm = jest.fn(() => true);
    desktop = {
      offline: true,
      getUpdateStatus: jest.fn().mockResolvedValue({
        state: 'portable', installed_version: '0.3.10',
        message: 'Choose a verified program update.',
      }),
      onUpdateStatus: jest.fn(() => () => {}),
      listBackups: jest.fn().mockResolvedValue([]),
      selectProgramUpdate: jest.fn().mockResolvedValue({
        canceled: false, file_name: 'Rookie Quest Keeper Portable 0.3.11.exe',
        version: '0.3.11', sha256: checksum, size_bytes: 110000000, authenticated: true, parts: 2,
      }),
      installProgramUpdate: jest.fn().mockResolvedValue({ started: true }),
    };
    Object.defineProperty(window, 'rookieDesktop', { configurable: true, value: desktop });
  });

  afterEach(() => {
    localStorage.removeItem(DESKTOP_STORAGE_KEY);
    Object.defineProperty(window, 'rookieDesktop', { configurable: true, value: originalDesktop });
    window.confirm = originalConfirm;
  });

  test('keeps full-program updates distinct from campaign imports and backups', async () => {
    render(<DesktopMaintenance />);
    fireEvent.click(screen.getByRole('button', { name: /Updates & backups/i }));
    expect(await screen.findByTestId('portable-program-update')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Select program update file/i }));
    expect(await screen.findByText('Rookie Quest Keeper Portable 0.3.11.exe')).toBeInTheDocument();
    expect(desktop.installProgramUpdate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Install Program Update' }));
    await waitFor(() => expect(desktop.installProgramUpdate).toHaveBeenCalledWith(
      '{"version":1,"campaigns":[]}',
    ));
    expect(screen.getByText('Campaign backups')).toBeInTheDocument();
  });
});
