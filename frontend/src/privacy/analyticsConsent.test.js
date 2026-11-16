import { ANALYTICS_KEY, getAnalyticsConsent, setAnalyticsConsent } from './analyticsConsent';

describe('Global privacy: optional analytics', () => {
  beforeEach(() => {
    localStorage.clear();
    window.posthog = {
      stopSessionRecording: jest.fn(),
      opt_out_capturing: jest.fn(),
      reset: jest.fn(),
    };
  });
  afterEach(() => { delete window.posthog; });

  test('tracking is off by default', () => {
    expect(getAnalyticsConsent()).toBe('');
  });

  test('revocation stops an already-running analytics SDK immediately', () => {
    localStorage.setItem(ANALYTICS_KEY, 'granted');
    const observer = jest.fn();
    window.addEventListener('rqk:analytics-consent-changed', observer);
    setAnalyticsConsent('');
    expect(window.posthog.stopSessionRecording).toHaveBeenCalledTimes(1);
    expect(window.posthog.opt_out_capturing).toHaveBeenCalledTimes(1);
    expect(window.posthog.reset).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(ANALYTICS_KEY)).toBeNull();
    expect(observer).toHaveBeenCalled();
    window.removeEventListener('rqk:analytics-consent-changed', observer);
  });

  test('granting permission stores only the affirmative choice', () => {
    setAnalyticsConsent('granted');
    expect(getAnalyticsConsent()).toBe('granted');
    expect(window.posthog.opt_out_capturing).not.toHaveBeenCalled();
  });

  test('revocation remains safe when the PostHog SDK is not installed', () => {
    delete window.posthog;
    expect(() => setAnalyticsConsent('')).not.toThrow();
    expect(getAnalyticsConsent()).toBe('');
  });
});
