jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('../styles/characterCreationModePicker.css', () => ({}), { virtual: true });

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CharacterCreationModePicker from './CharacterCreationModePicker';

describe('CharacterCreationModePicker', () => {
  test('renders the three public creation routes', () => {
    const html = renderToStaticMarkup(<CharacterCreationModePicker />);

    expect(html).toContain('Full Creator');
    expect(html).toContain('Basic Creator');
    expect(html).toContain('Rook Character Matchmaker');
    expect(html).not.toContain('Kids Mode');
    expect(html).not.toContain('Premade Characters');
  });
});
