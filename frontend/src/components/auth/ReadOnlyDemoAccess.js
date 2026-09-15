import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { AUTH_USERNAME_KEY, setAuthToken } from '@/lib/auth';
import { getSignInDestination } from '@/components/auth/SignInRedirect';
import { getErrorMessage } from '@/lib/errorMessage';
import '../AuthDemoAccess.css';

const GOOGLE_CLIENT_ID = String(process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
const GOOGLE_SCRIPT_ID = 'rqk-google-identity-services';

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);

  return new Promise((resolve, reject) => {
    let script = document.getElementById(GOOGLE_SCRIPT_ID);

    const handleLoad = () => {
      if (window.google?.accounts?.id) resolve(window.google);
      else reject(new Error('Google Identity Services did not initialise'));
    };
    const handleError = () => reject(new Error('Could not load Google Identity Services'));

    if (!script) {
      script = document.createElement('script');
      script.id = GOOGLE_SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
  });
}

export default function ReadOnlyDemoAccess() {
  const buttonRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const destination = useMemo(
    () => getSignInDestination(location.state?.from),
    [location.state?.from],
  );

  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingCredential, setPendingCredential] = useState('');
  const [rookieName, setRookieName] = useState('');
  const [googleReady, setGoogleReady] = useState(false);

  const completeGoogleLogin = useCallback((data) => {
    if (!data?.token || !data?.username) throw new Error('Google sign-in returned an incomplete session');

    localStorage.setItem(AUTH_USERNAME_KEY, data.username);
    setAuthToken(data.token);
    toast.success('Signed in with Google');
    navigate(destination.to, { replace: true, state: destination.state });
  }, [destination, navigate]);

  const exchangeGoogleCredential = useCallback(async (credential, username = '') => {
    if (!credential) return;

    setGoogleLoading(true);
    try {
      const payload = { credential };
      if (username.trim()) payload.username = username.trim();

      const response = await apiClient.post('/auth/google', payload);
      if (response.data?.requires_username) {
        setPendingCredential(credential);
        setRookieName(response.data.suggested_username || '');
        return;
      }

      completeGoogleLogin(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Google sign-in failed'));
    } finally {
      setGoogleLoading(false);
    }
  }, [completeGoogleLogin]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;

    let active = true;
    loadGoogleIdentityScript()
      .then((google) => {
        if (!active || !buttonRef.current) return;

        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: ({ credential }) => exchangeGoogleCredential(credential),
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        buttonRef.current.innerHTML = '';
        google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: 320,
        });
        setGoogleReady(true);
      })
      .catch(() => {
        if (active) setGoogleReady(false);
      });

    return () => {
      active = false;
      try { window.google?.accounts?.id?.cancel(); } catch {}
    };
  }, [exchangeGoogleCredential]);

  const finishGoogleSignup = async (event) => {
    event.preventDefault();
    const username = rookieName.trim();

    if (!username) {
      toast.error('Choose a Rookie name to finish your account');
      return;
    }

    await exchangeGoogleCredential(pendingCredential, username);
  };

  return (
    <>
      {GOOGLE_CLIENT_ID && (
        <section className="rqk-google-access" aria-label="Sign in with Google">
          <div className="rqk-google-access__copy">
            <span className="rqk-google-access__eyebrow">Fast sign in</span>
            <strong>Continue with Google</strong>
            <p>Use your Google account, then keep the same Rookie Quest characters, campaigns, and table tools.</p>
          </div>

          {!pendingCredential ? (
            <>
              <div
                ref={buttonRef}
                className="rqk-google-access__official-button"
                aria-busy={googleLoading ? 'true' : undefined}
              />
              {!googleReady && (
                <p className="rqk-google-access__status" role="status">
                  Preparing secure Google sign in…
                </p>
              )}
            </>
          ) : (
            <form className="rqk-google-access__nickname" onSubmit={finishGoogleSignup}>
              <label htmlFor="google-rookie-name">
                <span>Choose your Rookie name</span>
                <small>This is what your table sees. You only need to choose it once.</small>
              </label>
              <input
                id="google-rookie-name"
                type="text"
                value={rookieName}
                onChange={(event) => setRookieName(event.target.value)}
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z0-9_-]+"
                autoComplete="username"
                disabled={googleLoading}
                required
              />
              <button type="submit" disabled={googleLoading}>
                {googleLoading ? 'Finishing account…' : 'Finish Google sign in'}
              </button>
            </form>
          )}

          <div className="rqk-google-access__divider" aria-hidden="true">
            <span>or use your Rookie Quest password</span>
          </div>
        </section>
      )}

      <section className="rqk-demo-access" aria-label="Read-only demo account">
        <div className="rqk-demo-access__copy">
          <span className="rqk-demo-access__eyebrow">No account needed</span>
          <strong>Explore the demo first</strong>
          <p>
            Open sample characters, campaigns, player tools, and GM pages without signing in.
            Demo Mode is read-only, so nothing can be saved, edited, or deleted.
          </p>
        </div>
        <a className="rqk-demo-access__button" href="/home?demo=1" data-testid="demo-access-btn">
          <Sparkles size={16} aria-hidden="true" />
          <span>Explore read-only demo</span>
        </a>
      </section>
    </>
  );
}
