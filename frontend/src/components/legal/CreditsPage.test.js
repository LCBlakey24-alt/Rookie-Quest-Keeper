import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

import CreditsPage, { SRD_51_NOTICE, SRD_52_NOTICE } from './CreditsPage';

test('the credits page carries both SRD attribution notices and the unofficial-product notice', () => {
  render(<MemoryRouter><CreditsPage /></MemoryRouter>);
  expect(screen.getByTestId('srd-51-notice')).toHaveTextContent('System Reference Document 5.1');
  expect(screen.getByTestId('srd-52-notice')).toHaveTextContent('System Reference Document 5.2');
  expect(SRD_51_NOTICE).toContain('creativecommons.org/licenses/by/4.0');
  expect(SRD_52_NOTICE).toContain('creativecommons.org/licenses/by/4.0');
  expect(screen.getByTestId('unofficial-notice')).toHaveTextContent(/not affiliated with/);
});
