import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowLeft, ShieldCheck, Eye, EyeOff, BookOpen, Sparkles } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/errorMessage';
import './AuthPage.css';

const AUTH_COPY = {
  login: {
    eyebrow: 'Player gateway',
    title: 'Welcome back, adventurer',
    subtitle: 'Open your dashboard, character sheets, campaigns, and tabletop tools from one polished command post.',
    notice: (
      <>
        Sign in with your username or recovery email. New player? Create an account and keep it nickname-first.
      </>
    ),
  },
  register: {
    eyebrow: 'Begin the quest',
    title: 'Create your keeper account',
    subtitle: 'Save characters, prep campaigns, and build a cleaner first-session experience for every rookie at the table.',
    notice: (
      <>
        Kid-friendly signup: use a nickname instead of a real name. Recovery email is optional, but handy if you forget your password.
      </>
    ),
  },
  forgot: {
    eyebrow: 'Account recovery',
    title: 'Reset your password',
    subtitle: 'Enter your recovery email and we will send a reset link so you can get back to the table.',
    notice: (
      <>
        Only the recovery email linked to your account can receive a password reset.
      </>
    ),
  },
  reset: {
    eyebrow: 'Secure the vault',
    title: 'Choose a new password',
    subtitle: 'Set a fresh password with at least 8 characters, then sign back in to continue your adventure.',
    notice: (
      <>
        Pick something memorable, but not obvious. Passwords need at least 8 characters.
      </>
    ),
  },
};

const FEATURE_CARDS = [
  {
    icon: ShieldCheck,
    title: 'Kid-aware by design',
    text: 'Nickname-first accounts and optional recovery email keep signup lightweight.',
  },
  {
    icon: BookOpen,
    title: 'Campaign-ready',
    text: 'Jump from login into sheets, campaigns, uploads, and GM tools without clutter.',
  },
  {
    icon: Sparkles,
    title: 'Built for the table',
    text: 'A focused, theme-matched gateway that feels like the rest of Rookie Quest Keeper.',
  },
];

const TRUST_BADGES = ['Secure session', 'Mobile friendly', 'Rookie-safe signup'];

function getPasswordChecks(password) {
  return [
    { label: '8+ characters', passed: password.length >= 8 },
    { label: 'Includes a letter', passed: /[a-z]/i.test(password) },
    { label: 'Includes a number', passed: /\d/.test(password) },
  ];
}

function getPasswordStrength(checks, password) {
  const score = checks.filter(check => check.passed).length;

  if (!password) return { score: 0, tone: 'empty', label: 'Add a password' };
  if (score <= 1) return { score, tone: 'low', label: 'Needs work' };
  if (score === 2) return { score, tone: 'medium', label: 'Nearly there' };
  return { score, tone: 'high', label: 'Table-ready' };
}

export default function AuthPage({ onLogin = () => {} }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialToken = searchParams.get('token');
  const queryMode = searchParams.get('mode');
  const initialMode = initialToken ? 'reset' : queryMode === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState(initialMode);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', password: '', confirmPassword: '', email: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetData, setResetData] = useState({ token: initialToken || '', new_password: '' });
  const [loading, setLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    if (initialToken) {
      setMode('reset');
      setResetData(prev => ({ ...prev, token: initialToken }));
      return;
    }

    if (queryMode === 'register') {
      setMode('register');
    } else if (queryMode === 'login' || !queryMode) {
      setMode('login');
    }
  }, [initialToken, queryMode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const identifier = loginData.username.trim();
    const password = loginData.password;

    if (!identifier || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    const payload = { username: identifier, password };
    if (identifier.includes('@')) payload.email = identifier;

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', payload);
      toast.success('Welcome back!');
      onLogin(response.data.token, response.data.username || identifier);
      navigate('/home', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!registerData.username || !registerData.password || !registerData.confirmPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (registerData.password.length < 8) {
      toast.error('Password needs at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const payload = { username: registerData.username.trim(), password: registerData.password };
      if (registerData.email.trim()) payload.email = registerData.email.trim();

      const response = await apiClient.post('/auth/register', payload);
      toast.success('Account created! Welcome to Rookie Quest Keeper!');
      onLogin(response.data.token, response.data.username || payload.username);
      navigate('/home', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!forgotEmail) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: forgotEmail });
      toast.success('Password reset email sent!');
      setMode('login');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to send reset email'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!resetData.token || !resetData.new_password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (resetData.new_password.length < 8) {
      toast.error('Password needs at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', resetData);
      toast.success('Password reset successful!');
      setMode('login');
      navigate('/auth');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Password reset failed'));
    } finally {
      setLoading(false);
    }
  };

  const copy = AUTH_COPY[mode] || AUTH_COPY.login;
  const showCredentialToggle = mode === 'login' || mode === 'register';
  const registerPasswordChecks = getPasswordChecks(registerData.password);
  const registerPasswordStrength = getPasswordStrength(registerPasswordChecks, registerData.password);
  const resetPasswordChecks = getPasswordChecks(resetData.new_password);
  const resetPasswordStrength = getPasswordStrength(resetPasswordChecks, resetData.new_password);
  const confirmStatus = getConfirmPasswordStatus(registerData.password, registerData.confirmPassword);

  return (
    <main className={`rqk-auth-page rqk-auth-page--${mode}`} data-testid="auth-page">
      <div className="rqk-auth-ambient" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="rqk-auth-shell">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rqk-auth-brand"
          data-no-fill-animation="true"
          aria-label="Back to Rookie Quest Keeper home"
        >
          <span className="rqk-auth-brand__sigil" aria-hidden="true">RQK</span>
          <span className="rqk-auth-brand__text">
            <strong>Rookie Quest Keeper</strong>
            <small>Character tools • Campaign prep</small>
          </span>
        </button>

        <div className="rqk-auth-layout">
          <aside className="rqk-auth-hero" aria-label="Rookie Quest Keeper account benefits">
            <p className="rqk-auth-kicker">Character-first campaign tools</p>
            <h2>Keep the table moving before the first initiative roll.</h2>
            <p>
              A cleaner gateway for players, young adventurers, and GMs who want sheets,
              campaign prep, uploads, and table tools to feel organised from the start.
            </p>

            <div className="rqk-auth-feature-grid">
              {FEATURE_CARDS.map(({ icon: Icon, title, text }) => (
                <div className="rqk-auth-feature-card" key={title}>
                  <span className="rqk-auth-feature-icon" aria-hidden="true"><Icon size={18} /></span>
                  <span>
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </span>
                </div>
              ))}
            </div>

            <div className="rqk-auth-preview-card" aria-hidden="true">
              <div>
                <span className="rqk-auth-preview-dot" />
                <strong>Next stop</strong>
              </div>
              <p>Dashboard → Characters → Campaign tools</p>
            </div>
          </aside>

          <section className="rqk-auth-card" aria-labelledby="rqk-auth-title">
            <div className="rqk-auth-heading">
              <p>{copy.eyebrow}</p>
              <h1 id="rqk-auth-title">{copy.title}</h1>
              <span>{copy.subtitle}</span>
            </div>

            {showCredentialToggle && (
              <div className="rqk-auth-mode-toggle" role="tablist" aria-label="Choose sign in or create account">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  className={mode === 'login' ? 'is-active' : ''}
                  onClick={() => setMode('login')}
                  disabled={loading}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  className={mode === 'register' ? 'is-active' : ''}
                  onClick={() => setMode('register')}
                  disabled={loading}
                >
                  Create account
                </button>
              </div>
            )}

            <AuthNotice>{copy.notice}</AuthNotice>

            {mode === 'login' && (
              <form onSubmit={handleLogin} className="rqk-auth-form">
                <AuthInput
                  id="login-identifier"
                  icon={User}
                  label="Username or email"
                  type="text"
                  placeholder="Username or recovery email"
                  value={loginData.username}
                  onChange={(value) => setLoginData({ ...loginData, username: value })}
                  autoComplete="username"
                  testId="login-username"
                />

                <AuthInput
                  id="login-password"
                  icon={Lock}
                  label="Password"
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={(value) => setLoginData({ ...loginData, password: value })}
                  autoComplete="current-password"
                  testId="login-password"
                  rightAction={
                    <IconButton
                      label={showLoginPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowLoginPassword(prev => !prev)}
                      icon={showLoginPassword ? EyeOff : Eye}
                    />
                  }
                />

                <div className="rqk-auth-form-options">
                  <button type="button" onClick={() => setMode('forgot')} className="rqk-auth-link-button">
                    Forgot password?
                  </button>
                </div>

                <PrimaryButton type="submit" disabled={loading} loading={loading} testId="login-btn">
                  {loading ? 'Opening dashboard...' : 'Open dashboard'}
                </PrimaryButton>

                <AuthSwitch text="New here?" actionText="Create an account" onClick={() => setMode('register')} disabled={loading} />
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleRegister} className="rqk-auth-form">
                <AuthInput
                  id="register-username"
                  icon={User}
                  label="Username"
                  type="text"
                  placeholder="Choose a nickname"
                  value={registerData.username}
                  onChange={(value) => setRegisterData({ ...registerData, username: value })}
                  autoComplete="username"
                  hint="Use a table name or nickname rather than a real name."
                />

                <AuthInput
                  id="register-email"
                  icon={Mail}
                  label="Recovery email"
                  type="email"
                  placeholder="Optional recovery email"
                  value={registerData.email}
                  onChange={(value) => setRegisterData({ ...registerData, email: value })}
                  autoComplete="email"
                  hint="Optional, but useful if you need a password reset later."
                />

                <AuthInput
                  id="register-password"
                  icon={Lock}
                  label="Password"
                  type={showRegisterPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={registerData.password}
                  onChange={(value) => setRegisterData({ ...registerData, password: value })}
                  autoComplete="new-password"
                  rightAction={
                    <IconButton
                      label={showRegisterPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowRegisterPassword(prev => !prev)}
                      icon={showRegisterPassword ? EyeOff : Eye}
                    />
                  }
                />

                <PasswordReadiness checks={registerPasswordChecks} strength={registerPasswordStrength} />

                <AuthInput
                  id="register-confirm-password"
                  icon={Lock}
                  label="Confirm password"
                  type={showRegisterPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={registerData.confirmPassword}
                  onChange={(value) => setRegisterData({ ...registerData, confirmPassword: value })}
                  autoComplete="new-password"
                />

                <PasswordMatchNotice status={confirmStatus} />

                <PrimaryButton type="submit" disabled={loading} loading={loading}>
                  {loading ? 'Creating account...' : 'Create account'}
                </PrimaryButton>

                <AuthSwitch text="Already have an account?" actionText="Sign in" onClick={() => setMode('login')} disabled={loading} />
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="rqk-auth-form">
                <AuthInput
                  id="forgot-email"
                  icon={Mail}
                  label="Recovery email"
                  type="email"
                  placeholder="Enter your recovery email"
                  value={forgotEmail}
                  onChange={setForgotEmail}
                  autoComplete="email"
                />

                <PrimaryButton type="submit" disabled={loading} loading={loading}>
                  {loading ? 'Sending link...' : 'Send reset link'}
                </PrimaryButton>

                <SecondaryButton type="button" onClick={() => setMode('login')} disabled={loading}>
                  <ArrowLeft size={16} /> <span>Back to login</span>
                </SecondaryButton>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="rqk-auth-form">
                <AuthInput
                  id="reset-password"
                  icon={Lock}
                  label="New password"
                  type={showResetPassword ? 'text' : 'password'}
                  placeholder="Enter a new password"
                  value={resetData.new_password}
                  onChange={(value) => setResetData({ ...resetData, new_password: value })}
                  autoComplete="new-password"
                  rightAction={
                    <IconButton
                      label={showResetPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowResetPassword(prev => !prev)}
                      icon={showResetPassword ? EyeOff : Eye}
                    />
                  }
                />

                <PasswordReadiness checks={resetPasswordChecks} strength={resetPasswordStrength} />

                <PrimaryButton type="submit" disabled={loading} loading={loading}>
                  {loading ? 'Resetting password...' : 'Reset password'}
                </PrimaryButton>
              </form>
            )}

            <TrustBadges />
          </section>
        </div>

        <p className="rqk-auth-footer">© {new Date().getFullYear()} Rookie Quest Keeper</p>
      </div>
    </main>
  );
}

function AuthNotice({ children }) {
  return (
    <div className="rqk-auth-note">
      <ShieldCheck size={16} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function AuthInput({ id, icon: Icon, label, type, placeholder, value, onChange, autoComplete, hint, testId, rightAction }) {
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="rqk-auth-input-group">
      <label htmlFor={id}>{label}</label>
      <div className="rqk-auth-input-shell">
        <Icon size={18} className="rqk-auth-input-icon" aria-hidden="true" />
        <input
          id={id}
          className="rqk-auth-field"
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-describedby={hintId}
          data-testid={testId}
        />
        {rightAction}
      </div>
      {hint && <p id={hintId} className="rqk-auth-field-hint">{hint}</p>}
    </div>
  );
}

function IconButton({ icon: Icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="rqk-auth-icon-button">
      <Icon size={17} />
    </button>
  );
}

function PrimaryButton({ children, disabled, loading, type = 'button', testId }) {
  return (
    <button type={type} disabled={disabled} data-testid={testId} className="rqk-auth-primary" aria-busy={loading ? 'true' : undefined}>
      {loading && <span className="rqk-auth-button-spinner" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

function SecondaryButton({ children, onClick, disabled, type = 'button' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="rqk-auth-secondary">
      {children}
    </button>
  );
}

function AuthSwitch({ text, actionText, onClick, disabled }) {
  return (
    <div className="rqk-auth-switch">
      <span>{text}</span>
      <button type="button" onClick={onClick} disabled={disabled} className="rqk-auth-switch-button">
        {actionText}
      </button>
    </div>
  );
}

function PasswordReadiness({ checks, strength }) {
  const filledSegments = Math.max(1, strength.score);

  return (
    <div className={`rqk-auth-password-readiness is-${strength.tone}`} aria-live="polite">
      <div className="rqk-auth-password-readiness__top">
        <span>Password strength</span>
        <strong>{strength.label}</strong>
      </div>
      <div className="rqk-auth-strength-meter" aria-hidden="true">
        {[0, 1, 2].map(index => (
          <span key={index} className={index < filledSegments && strength.tone !== 'empty' ? 'is-filled' : ''} />
        ))}
      </div>
      <ul>
        {checks.map(check => (
          <li key={check.label} className={check.passed ? 'is-passed' : ''}>
            <span aria-hidden="true" />
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function getConfirmPasswordStatus(password, confirmPassword) {
  if (!confirmPassword) return { tone: 'empty', message: 'Confirm your password to catch typos before creating the account.' };
  if (password === confirmPassword) return { tone: 'good', message: 'Passwords match.' };
  return { tone: 'bad', message: 'Passwords do not match yet.' };
}

function PasswordMatchNotice({ status }) {
  return (
    <p className={`rqk-auth-match-notice is-${status.tone}`} aria-live="polite">
      <span aria-hidden="true" />
      {status.message}
    </p>
  );
}

function TrustBadges() {
  return (
    <div className="rqk-auth-trust-row" aria-label="Account safeguards">
      {TRUST_BADGES.map(badge => (
        <span key={badge}>{badge}</span>
      ))}
    </div>
  );
}
