jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('@/lib/apiClient', () => ({ get: jest.fn(), post: jest.fn() }), { virtual: true });
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() } }), { virtual: true });
jest.mock('@/data/characterCreationPayload', () => ({
  buildCharacterCreationPayloadFromTemplate: jest.fn(() => ({})),
  getCharacterCreationPayloadWarnings: jest.fn(() => []),
}), { virtual: true });

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PremadeCharacterBuilder from './PremadeCharacterBuilder';

describe('PremadeCharacterBuilder', () => {
  test('starts with Rook matching disabled until the user describes a hero', () => {
    const html = renderToStaticMarkup(<PremadeCharacterBuilder />);

    expect(html).toContain('Pick a hero, name them, and start playing.');
    expect(html).toContain('Loading premade heroes');
    expect(html).toContain('data-testid="premade-match-btn"');
    expect(html).toContain('disabled=""');
  });
});
