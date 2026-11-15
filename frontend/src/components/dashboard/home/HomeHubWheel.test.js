import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import HomeHubWheel from './HomeHubWheel';

const places = [
  { id: 'characters', label: 'Characters', value: 4, to: '/characters', ariaLabel: 'Characters: 4' },
  { id: 'campaigns', label: 'Campaigns', value: 2, to: '/campaigns', ariaLabel: 'Campaigns: 2' },
  { id: 'homebrew', label: 'Homebrew', value: 0, to: '/homebrew', ariaLabel: 'Homebrew: 0' },
  { id: 'shared', label: 'Shared', value: 0, to: '/shared', ariaLabel: 'Shared: 0' },
  { id: 'community', label: 'Community', value: '→', to: '/community', ariaLabel: 'Community' },
  { id: 'new', label: 'New Character', value: '+', to: '/new', ariaLabel: 'New Character' },
];

function setup() {
  render(<MemoryRouter initialEntries={['/home']}><Routes>
    <Route path="/home" element={<HomeHubWheel places={places} />} />
    <Route path="/characters" element={<p>Characters page</p>} />
  </Routes></MemoryRouter>);
  const svg = screen.getByTestId('hex-wheel');
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 });
  return { svg, ring: svg.querySelector('.hex-wheel__view') };
}

class TestPointerEvent extends MouseEvent {
  constructor(type, init = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; }
}

describe('Home hub wheel', () => {
  const RealPointerEvent = window.PointerEvent;
  beforeAll(() => { window.PointerEvent = TestPointerEvent; });
  afterAll(() => { window.PointerEvent = RealPointerEvent; });

  test('scroll and arrow keys turn the ring while labels and numbers stay attached', () => {
    const { svg, ring } = setup();
    const wedge = screen.getByRole('button', { name: 'Characters: 4' });
    expect(wedge.querySelector('textPath')).toHaveTextContent('CHARACTERS');
    expect(wedge.querySelector('textPath').getAttribute('href')).toMatch(/^#hex-label-/);
    expect(wedge.querySelector('.hex-wheel__value')).toHaveAttribute('transform', expect.stringContaining('rotate(330'));
    fireEvent.wheel(wedge, { deltaY: 100, cancelable: true });
    expect(ring.style.transform).toBe('rotate(30deg)');
    expect(ring).toContainElement(wedge.querySelector('textPath'));
    expect(ring).toContainElement(wedge.querySelector('.hex-wheel__value'));
    fireEvent.keyDown(wedge, { key: 'ArrowRight' });
    expect(ring.style.transform).toBe('rotate(90deg)');
    // Scrolling outside a segment continues to belong to the page.
    expect(fireEvent.wheel(svg, { deltaY: 100, cancelable: true })).toBe(true);
    expect(ring.style.transform).toBe('rotate(90deg)');
  });

  test('dragging turns without navigating, but a subsequent tap opens the destination', () => {
    jest.useFakeTimers();
    const { ring } = setup();
    const wedge = screen.getByRole('button', { name: 'Characters: 4' });
    fireEvent.pointerDown(wedge, { pointerId: 1, button: 0, clientX: 100, clientY: 20 });
    fireEvent.pointerMove(wedge, { pointerId: 1, clientX: 140, clientY: 30 });
    fireEvent.pointerUp(wedge, { pointerId: 1, clientX: 140, clientY: 30 });
    fireEvent.click(wedge);
    expect(screen.queryByText('Characters page')).not.toBeInTheDocument();
    expect(ring.style.transform).not.toBe('rotate(0deg)');
    jest.runOnlyPendingTimers();
    fireEvent.click(wedge);
    expect(screen.getByText('Characters page')).toBeInTheDocument();
    jest.useRealTimers();
  });

  test('small trackpad movements accumulate and browser zoom is not intercepted', () => {
    const { ring } = setup();
    const wedge = screen.getByRole('button', { name: 'Characters: 4' });
    for (let index = 0; index < 9; index += 1) fireEvent.wheel(wedge, { deltaY: 8, cancelable: true });
    expect(ring.style.transform).toBe('rotate(0deg)');
    fireEvent.wheel(wedge, { deltaY: 8, cancelable: true });
    expect(ring.style.transform).toBe('rotate(30deg)');
    expect(fireEvent.wheel(wedge, { deltaY: 100, ctrlKey: true, cancelable: true })).toBe(true);
    expect(ring.style.transform).toBe('rotate(30deg)');
  });

  test('cancelling a drag settles the wheel without opening a page', () => {
    const { ring } = setup();
    const wedge = screen.getByRole('button', { name: 'Characters: 4' });
    fireEvent.pointerDown(wedge, { pointerId: 1, button: 0, clientX: 100, clientY: 20 });
    fireEvent.pointerMove(wedge, { pointerId: 1, clientX: 140, clientY: 30 });
    fireEvent.pointerCancel(wedge, { pointerId: 1 });
    expect(ring.style.transform).toBe('rotate(30deg)');
    expect(screen.queryByText('Characters page')).not.toBeInTheDocument();
  });

  test('the centre still opens the dice roller', () => {
    setup();
    const handler = jest.fn();
    window.addEventListener('rq-dice-open', handler);
    fireEvent.click(screen.getByRole('button', { name: 'Open the dice roller' }));
    window.removeEventListener('rq-dice-open', handler);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
