import { useCallback, useEffect, useRef } from 'react';
import '@/styles/motionReveal.css';

const REVEAL_CLASS = 'rqk-reveal';
const REVEALED_CLASS = 'is-revealed';
const ARMED_ATTRIBUTE = 'data-rqk-reveal';

const prefersReducedMotion = () => {
  try {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    // Some embedded webviews throw on matchMedia with an unsupported query.
    return false;
  }
};

const supportsObserver = () => typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function';

const revealNow = (elements) => {
  elements.forEach((element) => element.classList.add(REVEALED_CLASS));
};

/**
 * Reveal elements as they scroll into view.
 *
 * Returns a ref to put on the container. Every descendant carrying
 * `.rqk-reveal` is revealed once, in document order, with a stagger.
 *
 * The container is only marked armed -- which is what lets the stylesheet hide
 * anything at all -- when this hook is actually going to reveal things. So if
 * JavaScript never runs, the query is unsupported, or the observer is missing,
 * the content is simply visible rather than stuck at opacity 0.
 *
 * @param {object} [options]
 * @param {number} [options.stagger] ms between successive items in one batch
 * @param {string} [options.rootMargin] observer rootMargin
 * @param {number} [options.threshold] observer threshold
 */
export default function useRevealOnScroll({
  stagger = 70,
  rootMargin = '0px 0px -10% 0px',
  threshold = 0.12,
} = {}) {
  const containerRef = useRef(null);

  const collect = useCallback((container) => (
    Array.from(container.querySelectorAll(`.${REVEAL_CLASS}`))
  ), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const targets = collect(container);
    if (!targets.length) return undefined;

    // Reduced motion, or no observer to work with: show everything at once and
    // never arm the hidden state.
    if (prefersReducedMotion() || !supportsObserver()) {
      revealNow(targets);
      return undefined;
    }

    container.setAttribute(ARMED_ATTRIBUTE, 'armed');

    const observer = new IntersectionObserver((entries, instance) => {
      // Order the batch by document position so a stagger reads top-to-bottom
      // regardless of the order the observer reports entries in.
      const arriving = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => (
          a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
        ));

      arriving.forEach((entry, index) => {
        const element = entry.target;
        element.style.setProperty('--rqk-reveal-delay', `${index * stagger}ms`);
        element.classList.add(REVEALED_CLASS);
        // Revealing is one-way, so stop watching it.
        instance.unobserve(element);
      });
    }, { rootMargin, threshold });

    targets.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
      // Leave the content visible if this unmounts mid-animation, and drop the
      // armed flag so a remount cannot briefly hide already-painted content.
      container.removeAttribute(ARMED_ATTRIBUTE);
      revealNow(collect(container));
    };
  }, [collect, rootMargin, stagger, threshold]);

  return containerRef;
}

export { REVEAL_CLASS, REVEALED_CLASS, ARMED_ATTRIBUTE };
