import { DISPLAY_WINDOW_NAME, hasExtendedScreen, openDisplayWindow, withPresent } from './openDisplayWindow';

const fakeWindow = ({ extended = false, screens = null, popup = {} } = {}) => {
  const opened = [];
  const current = { label: 'Laptop', isInternal: true };
  return {
    opened,
    screen: { isExtended: extended, availWidth: 1920, availHeight: 1080 },
    open: jest.fn((url, name, features) => { opened.push({ url, name, features }); return popup; }),
    getScreenDetails: screens ? jest.fn(async () => ({ currentScreen: current, screens: [current, ...screens] })) : undefined,
  };
};

test('adds the present flag to the display URL', () => {
  expect(withPresent('/campaign/c/player-display?target=standing-tv')).toBe('/campaign/c/player-display?target=standing-tv&present=1');
  expect(withPresent('/tv/ABCD2345')).toBe('/tv/ABCD2345?present=1');
});

test('one screen: opens a reusable named window, not moved', async () => {
  const win = fakeWindow();
  const result = await openDisplayWindow('/campaign/c/player-display', win);
  expect(result).toEqual({ opened: true, placed: false, screenLabel: '' });
  expect(win.opened[0].name).toBe(DISPLAY_WINDOW_NAME);
  expect(hasExtendedScreen(win)).toBe(false);
});

test('extended screen: moves the window onto the TV and fills it', async () => {
  const popup = { focus: jest.fn(), moveTo: jest.fn(), resizeTo: jest.fn() };
  const tv = { label: 'Living room TV', isInternal: false, availLeft: 1920, availTop: 0, availWidth: 3840, availHeight: 2160 };
  const win = fakeWindow({ extended: true, screens: [tv], popup });
  const result = await openDisplayWindow('/campaign/c/player-display', win);
  expect(result).toEqual({ opened: true, placed: true, screenLabel: 'Living room TV' });
  expect(popup.moveTo).toHaveBeenCalledWith(1920, 0);
  expect(popup.resizeTo).toHaveBeenCalledWith(3840, 2160);
});

test('a blocked pop-up is reported', async () => {
  const win = fakeWindow({ popup: null });
  expect((await openDisplayWindow('/x', win)).opened).toBe(false);
});
