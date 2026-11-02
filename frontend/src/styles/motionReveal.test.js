/**
 * The stylesheet is half of the "content can never be stuck hidden"
 * guarantee, so the guards are asserted directly rather than trusted.
 */
import fs from 'fs';
import path from 'path';

const CSS = fs.readFileSync(path.join(__dirname, 'motionReveal.css'), 'utf8');
const LANDING = fs.readFileSync(path.join(__dirname, '..', 'components', 'LandingPage.js'), 'utf8');

const blockAfter = (marker) => {
  const at = CSS.indexOf(marker);
  if (at < 0) return '';
  return CSS.slice(at, CSS.indexOf('\n}', at) + 2);
};

describe('the hidden state is opt-in', () => {
  test('nothing is hidden unless JavaScript has armed the container', () => {
    // Every rule that sets opacity: 0 must be scoped to the armed attribute,
    // otherwise a JS failure leaves the page blank.
    const hidingRules = CSS.split('}').filter((rule) => /opacity:\s*0\s*;/.test(rule));
    expect(hidingRules.length).toBeGreaterThan(0);
    hidingRules.forEach((rule) => {
      expect(rule).toContain("[data-rqk-reveal='armed']");
    });
  });

  test('the bare reveal class only carries the transition, never the hidden state', () => {
    const bare = blockAfter('\n.rqk-reveal {');
    expect(bare).toContain('transition:');
    expect(bare).not.toMatch(/opacity:\s*0/);
  });
});

describe('reduced motion wins', () => {
  const reduced = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: reduce)'));

  test('it forces every target visible, armed or not', () => {
    expect(reduced).toContain('opacity: 1 !important');
    expect(reduced).toContain('transform: none !important');
    expect(reduced).toContain('transition: none !important');
  });

  test('it overrides the armed hidden state specifically', () => {
    expect(reduced).toContain("[data-rqk-reveal='armed'] .rqk-reveal");
  });
});

describe('motion stays within the design system', () => {
  test('it animates only opacity and transform, so it stays off the main thread', () => {
    const animated = CSS.match(/transition:[^;]+;/g).join(' ');
    expect(animated).toContain('opacity');
    expect(animated).toContain('transform');
    expect(animated).not.toMatch(/\b(width|height|top|left|margin|box-shadow|filter)\b/);
  });

  test('the motion is restrained: a short rise, no scale, blur or glow', () => {
    expect(CSS).toMatch(/--rqk-reveal-distance:\s*12px/);
    expect(CSS).not.toMatch(/scale\(/);
    expect(CSS).not.toMatch(/blur\(/);
    expect(CSS).not.toMatch(/box-shadow/);
  });

  test('will-change is released once an element has been revealed', () => {
    expect(blockAfter('\n.rqk-reveal.is-revealed {')).toContain('will-change: auto');
  });

  test('printing does not depend on a scroll position', () => {
    const print = CSS.slice(CSS.indexOf('@media print'));
    expect(print).toContain('opacity: 1 !important');
  });
});

describe('the landing page reveals the right things', () => {
  test('it attaches the container ref', () => {
    expect(LANDING).toContain("import useRevealOnScroll from '@/hooks/useRevealOnScroll'");
    expect(LANDING).toContain('ref={revealRef}');
  });

  test('the hero is not animated, so the first thing a visitor sees is immediate', () => {
    const hero = LANDING.slice(
      LANDING.indexOf('landing-final-hero'),
      LANDING.indexOf('landing-pillar-strip'),
    );
    expect(hero).not.toContain('rqk-reveal');
  });

  test('the below-the-fold sections are animated', () => {
    ['landing-showcase-section rqk-reveal',
     'landing-audience-panel--player rqk-reveal',
     'landing-audience-panel--gm rqk-reveal',
     'landing-workflow-section rqk-reveal',
     'landing-faq-panel landing-faq-layout rqk-reveal',
     'landing-final-cta--reference rqk-reveal'].forEach((marker) => {
      expect(LANDING).toContain(marker);
    });
  });

  test('dense repeated items use the subtle variant', () => {
    // Cards and list rows should settle, not restage the whole block.
    expect(LANDING.match(/rqk-reveal rqk-reveal--subtle/g)).toHaveLength(3);
  });
});
