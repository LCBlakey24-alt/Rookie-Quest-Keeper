import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BrainCircuit, CheckCircle2, ShieldCheck, SlidersHorizontal, XCircle } from 'lucide-react';
import {
  getRookAiConsent,
  grantRookAiConsent,
  revokeRookAiConsent,
} from '@/privacy/rookAiConsent';
import '@/styles/privacyDataSettings.css';

const ANALYTICS_KEY = 'rqk.analyticsConsent';

function analyticsConsent() {
  try { return localStorage.getItem(ANALYTICS_KEY) || ''; } catch { return ''; }
}

function setAnalyticsConsent(value) {
  try {
    if (value) localStorage.setItem(ANALYTICS_KEY, value);
    else localStorage.removeItem(ANALYTICS_KEY);
  } catch {}
  try { window.dispatchEvent(new CustomEvent('rqk:analytics-consent-changed')); } catch {}
}

export default function PrivacyDataSettings() {
  const [mountNode, setMountNode] = useState(null);
  const [rookAllowed, setRookAllowed] = useState(() => getRookAiConsent() === 'granted');
  const [analyticsAllowed, setAnalyticsAllowed] = useState(() => analyticsConsent() === 'granted');

  useEffect(() => {
    let cancelled = false;
    const findTarget = () => {
      if (cancelled || window.location.pathname !== '/account') {
        setMountNode(null);
        return;
      }
      const target = document.querySelector('.account-settings-container');
      if (target) setMountNode(target);
    };

    findTarget();
    const timer = window.setInterval(findTarget, 400);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      setRookAllowed(getRookAiConsent() === 'granted');
      setAnalyticsAllowed(analyticsConsent() === 'granted');
    };
    window.addEventListener('rqk:rook-ai-consent-changed', refresh);
    window.addEventListener('rqk:analytics-consent-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('rqk:rook-ai-consent-changed', refresh);
      window.removeEventListener('rqk:analytics-consent-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (!mountNode) return null;

  return createPortal(
    <section className="rqk-privacy-settings" aria-label="Privacy and data">
      <header className="rqk-privacy-settings__heading">
        <ShieldCheck size={20} />
        <span><strong>Privacy & Data</strong><small>Control external AI and optional analytics on this device.</small></span>
      </header>

      <div className="rqk-privacy-settings__rows">
        <article>
          <span className="rqk-privacy-settings__icon"><BrainCircuit size={18} /></span>
          <span className="rqk-privacy-settings__copy">
            <strong>Rook AI</strong>
            <small>When you ask Rook to generate something, your request and relevant saved campaign context are sent to OpenAI to create the response. Passwords are not included.</small>
          </span>
          <span className="rqk-privacy-settings__status" data-on={rookAllowed ? 'true' : 'false'}>
            {rookAllowed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {rookAllowed ? 'Allowed' : 'Ask first'}
          </span>
          <button
            type="button"
            className="rqk-privacy-settings__button"
            onClick={() => {
              if (rookAllowed) {
                revokeRookAiConsent();
                setRookAllowed(false);
              } else {
                grantRookAiConsent();
                setRookAllowed(true);
              }
            }}
          >
            {rookAllowed ? 'Revoke Rook AI consent' : 'Allow Rook AI'}
          </button>
        </article>

        <article>
          <span className="rqk-privacy-settings__icon"><SlidersHorizontal size={18} /></span>
          <span className="rqk-privacy-settings__copy">
            <strong>Usage analytics</strong>
            <small>Optional product analytics help measure how Rookie is used. They are off by default. Session recording is disabled on the public production app.</small>
          </span>
          <span className="rqk-privacy-settings__status" data-on={analyticsAllowed ? 'true' : 'false'}>
            {analyticsAllowed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {analyticsAllowed ? 'Allowed' : 'Off'}
          </span>
          <button
            type="button"
            className="rqk-privacy-settings__button"
            onClick={() => {
              if (analyticsAllowed) {
                setAnalyticsConsent('');
                setAnalyticsAllowed(false);
              } else if (window.confirm('Allow optional usage analytics on this device? This sends product-usage events to PostHog.')) {
                setAnalyticsConsent('granted');
                setAnalyticsAllowed(true);
                window.location.reload();
              }
            }}
          >
            {analyticsAllowed ? 'Turn analytics off' : 'Allow analytics'}
          </button>
        </article>
      </div>

      <p className="rqk-privacy-settings__note">
        These controls are stored on this device. Account deletion remains available below in the Danger Zone.
      </p>
    </section>,
    mountNode
  );
}
