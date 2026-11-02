/**
 * The reveal layer hides content and then shows it. The thing that must never
 * happen is content getting stuck hidden, so these tests are mostly about the
 * failure paths: no observer, reduced motion, unmount mid-animation.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import useRevealOnScroll, { ARMED_ATTRIBUTE, REVEALED_CLASS } from './useRevealOnScroll';

function Page({ options } = {}) {
  const ref = useRevealOnScroll(options);
  return (
    <div ref={ref} data-testid="page">
      <section className="rqk-reveal" data-testid="first">first</section>
      <section className="rqk-reveal" data-testid="second">second</section>
      <section data-testid="plain">not animated</section>
    </div>
  );
}

const originalObserver = window.IntersectionObserver;
const originalMatchMedia = window.matchMedia;

let instances = [];

function installObserver() {
  instances = [];
  window.IntersectionObserver = class {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.observed = new Set();
      this.disconnected = false;
      instances.push(this);
    }

    observe(el) { this.observed.add(el); }

    unobserve(el) { this.observed.delete(el); }

    disconnect() { this.disconnected = true; this.observed.clear(); }

    // Test helper: report entries to the hook.
    fire(entries) { act(() => { this.callback(entries, this); }); }
  };
}

const setReducedMotion = (reduce) => {
  window.matchMedia = (query) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  });
};

beforeEach(() => {
  installObserver();
  setReducedMotion(false);
});

afterEach(() => {
  window.IntersectionObserver = originalObserver;
  window.matchMedia = originalMatchMedia;
});

describe('content can never be stuck hidden', () => {
  test('without IntersectionObserver nothing is armed and everything is revealed', () => {
    delete window.IntersectionObserver;
    render(<Page />);

    expect(screen.getByTestId('page')).not.toHaveAttribute(ARMED_ATTRIBUTE);
    expect(screen.getByTestId('first')).toHaveClass(REVEALED_CLASS);
    expect(screen.getByTestId('second')).toHaveClass(REVEALED_CLASS);
  });

  test('under reduced motion nothing is armed and everything is revealed', () => {
    setReducedMotion(true);
    render(<Page />);

    expect(screen.getByTestId('page')).not.toHaveAttribute(ARMED_ATTRIBUTE);
    expect(screen.getByTestId('first')).toHaveClass(REVEALED_CLASS);
    expect(instances).toHaveLength(0);
  });

  test('a matchMedia that throws is treated as motion allowed, not as a crash', () => {
    window.matchMedia = () => { throw new TypeError('unsupported query'); };
    expect(() => render(<Page />)).not.toThrow();
    expect(screen.getByTestId('page')).toHaveAttribute(ARMED_ATTRIBUTE, 'armed');
  });

  test('unmounting mid-animation leaves the content visible and disarms', () => {
    const { unmount } = render(<Page />);
    const page = screen.getByTestId('page');
    const first = screen.getByTestId('first');
    expect(page).toHaveAttribute(ARMED_ATTRIBUTE, 'armed');

    unmount();

    expect(page).not.toHaveAttribute(ARMED_ATTRIBUTE);
    expect(first).toHaveClass(REVEALED_CLASS);
    expect(instances[0].disconnected).toBe(true);
  });

  test('a container with no reveal targets is never armed', () => {
    function Bare() {
      const ref = useRevealOnScroll();
      return <div ref={ref} data-testid="bare"><p>plain</p></div>;
    }
    render(<Bare />);
    expect(screen.getByTestId('bare')).not.toHaveAttribute(ARMED_ATTRIBUTE);
  });
});

describe('revealing on intersection', () => {
  test('only intersecting elements are revealed', () => {
    render(<Page />);
    const first = screen.getByTestId('first');
    const second = screen.getByTestId('second');

    instances[0].fire([
      { target: first, isIntersecting: true },
      { target: second, isIntersecting: false },
    ]);

    expect(first).toHaveClass(REVEALED_CLASS);
    expect(second).not.toHaveClass(REVEALED_CLASS);
  });

  test('a revealed element is unobserved, so it is revealed once only', () => {
    render(<Page />);
    const first = screen.getByTestId('first');

    expect(instances[0].observed.has(first)).toBe(true);
    instances[0].fire([{ target: first, isIntersecting: true }]);
    expect(instances[0].observed.has(first)).toBe(false);
  });

  test('a batch is staggered in document order', () => {
    render(<Page />);
    const first = screen.getByTestId('first');
    const second = screen.getByTestId('second');

    // Report them out of order; the stagger must still read top-to-bottom.
    instances[0].fire([
      { target: second, isIntersecting: true },
      { target: first, isIntersecting: true },
    ]);

    expect(first.style.getPropertyValue('--rqk-reveal-delay')).toBe('0ms');
    expect(second.style.getPropertyValue('--rqk-reveal-delay')).toBe('70ms');
  });

  test('the stagger is configurable', () => {
    render(<Page options={{ stagger: 200 }} />);
    const first = screen.getByTestId('first');
    const second = screen.getByTestId('second');

    instances[0].fire([
      { target: first, isIntersecting: true },
      { target: second, isIntersecting: true },
    ]);

    expect(second.style.getPropertyValue('--rqk-reveal-delay')).toBe('200ms');
  });

  test('elements without the reveal class are never touched', () => {
    render(<Page />);
    const plain = screen.getByTestId('plain');
    expect(instances[0].observed.has(plain)).toBe(false);
    expect(plain).not.toHaveClass(REVEALED_CLASS);
  });
});
