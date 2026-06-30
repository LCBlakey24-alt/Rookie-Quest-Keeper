import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RouteLoadingScreen from './RouteLoadingScreen';

describe('RouteLoadingScreen', () => {
  test('renders shared opening copy', () => {
    const html = renderToStaticMarkup(<RouteLoadingScreen />);

    expect(html).toContain('Opening Rookie Quest Keeper');
    expect(html).toContain('loading-screen');
  });
});
