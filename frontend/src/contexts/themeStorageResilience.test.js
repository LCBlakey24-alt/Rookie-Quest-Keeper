/**
 * ThemeProvider used to write the theme to localStorage and read it back on
 * mount. That round-trip could not work and was not wanted:
 *
 *   - the persist effect is declared first, so on mount it wrote the default
 *     over the stored value before the restore effect could read it;
 *   - App.js sets the theme from the route on every navigation, so it would be
 *     overwritten immediately afterwards anyway;
 *   - restoring would be wrong -- a stored 'gm' theme would flash GM styling
 *     on the landing page before the route corrected it.
 *
 * It also crashed: localStorage throws rather than returning null in Safari
 * private browsing and with site data blocked, and an uncaught throw in a
 * provider effect unmounts the whole app, so the page rendered blank.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { THEMES, ThemeProvider, useTheme } from './ThemeContext';

function ThemeProbe() {
  const { theme, isGMMode, isPlayerMode } = useTheme();
  return <span data-testid="theme">{`${theme}|${isGMMode}|${isPlayerMode}`}</span>;
}

const withStorage = (impl, run) => {
  const original = window.localStorage;
  Object.defineProperty(window, 'localStorage', { value: impl, configurable: true, writable: true });
  try {
    run();
  } finally {
    Object.defineProperty(window, 'localStorage', { value: original, configurable: true, writable: true });
  }
};

const throwingStorage = {
  getItem: () => { throw new DOMException('denied', 'SecurityError'); },
  setItem: () => { throw new DOMException('denied', 'SecurityError'); },
  removeItem: () => { throw new DOMException('denied', 'SecurityError'); },
};

describe('ThemeProvider does not depend on browser storage', () => {
  test('the app renders when every storage call throws', () => {
    withStorage(throwingStorage, () => {
      render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
      expect(screen.getByTestId('theme')).toHaveTextContent(`${THEMES.LANDING}|false|false`);
    });
  });

  test('it never touches storage at all', () => {
    const calls = [];
    withStorage(
      {
        getItem: (k) => { calls.push(`get:${k}`); return null; },
        setItem: (k) => { calls.push(`set:${k}`); },
        removeItem: (k) => { calls.push(`remove:${k}`); },
      },
      () => {
        render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
        expect(calls).toEqual([]);
      },
    );
  });

  test('a stored theme cannot leak into the landing page', () => {
    // The route is the source of truth; a leftover 'gm' value must be ignored.
    withStorage(
      { getItem: () => THEMES.GM, setItem: () => {}, removeItem: () => {} },
      () => {
        render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
        expect(screen.getByTestId('theme')).toHaveTextContent(`${THEMES.LANDING}|false|false`);
      },
    );
  });
});

describe('the theme still drives the document attribute', () => {
  afterEach(() => document.documentElement.removeAttribute('data-theme'));

  test('landing leaves the root defaults in place', () => {
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  test('a non-landing theme sets data-theme', () => {
    function SetGM() {
      const { setTheme, theme } = useTheme();
      React.useEffect(() => { setTheme(THEMES.GM); }, [setTheme]);
      return <span data-testid="theme">{theme}</span>;
    }
    render(<ThemeProvider><SetGM /></ThemeProvider>);
    expect(document.documentElement.getAttribute('data-theme')).toBe(THEMES.GM);
  });
});
