import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/errorMessage';
import './AuthPage.css';

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

  const authCopy = {
    login: { title: 'Welcome back', subtitle: 'Sign in to open your dashboard, sheets, campaigns, and player tools.' },
    register: { title: 'Create account', subtitle: 'Make an account, then build your first character or join a campaign.' },
    forgot: { title: 'Reset password', subtitle: 'Enter your recovery email and we will send a reset link.' },
    reset: { title: 'New password', subtitle: 'Choose a new password for your account.' },
  };

  return (
    <div className="rqk-auth-page" style={pageStyle}>
      <div className="rqk-auth-content" style={contentStyle}>
        <button type="button" onClick={() => navigate('/')} className="rqk-auth-mark" style={logoWrapStyle} data-no-fill-animation="true" aria-label="Back to Rookie Quest Keeper home">
          <span aria-hidden="true">RQK</span>
        </button>

        <div className="rqk-auth-panel" style={panelStyle}>
          <div className="rqk-auth-heading" style={headingStyle}>
            <p style={eyebrowStyle}>Rookie Quest Keeper</p>
            <h1 style={titleStyle}>{authCopy[mode]?.title}</h1>
            <p style={subtitleStyle}>{authCopy[mode]?.subtitle}</p>
          </div>

          {mode === 'register' && (
            <div className="rqk-auth-note" style={nextStepNoteStyle}>
              <ShieldCheck size={15} />
              <span>After signup, start with <strong>Build Your First Character</strong>. Use a nickname instead of a real name.</span>
            </div>
          )}

          {mode === 'login' && (
            <div className="rqk-auth-note" style={accountChangeNoticeStyle}>
              <ShieldCheck size={15} />
              <span>Use your username or recovery email. New player? Tap <strong>Create an account</strong> below.</span>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="rqk-auth-form">
              <AuthInput
                icon={User}
                type="text"
                placeholder="Username or email"
                value={loginData.username}
                onChange={(value) => setLoginData({ ...loginData, username: value })}
                testId="login-username"
              />
              <AuthInput
                icon={Lock}
                type={showLoginPassword ? 'text' : 'password'}
                placeholder="Password"
                value={loginData.password}
                onChange={(value) => setLoginData({ ...loginData, password: value })}
                testId="login-password"
                rightAction={
                  <IconButton
                    label={showLoginPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowLoginPassword(prev => !prev)}
                    icon={showLoginPassword ? EyeOff : Eye}
                  />
                }
              />

              <button type="button" onClick={() => setMode('forgot')} className="rqk-auth-link-button" style={linkButtonStyle}>
                <span>Forgot password?</span>
              </button>

              <PrimaryButton type="submit" disabled={loading} testId="login-btn">
                {loading ? 'Opening dashboard...' : 'Open Dashboard'}
              </PrimaryButton>

              <AuthSwitch text="New here?" actionText="Create an account" onClick={() => setMode('register')} />
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="rqk-auth-form">
              <AuthInput
                icon={User}
                type="text"
                placeholder="Username"
                value={registerData.username}
                onChange={(value) => setRegisterData({ ...registerData, username: value })}
              />
              <p className="rqk-auth-small-note" style={kidSafeNoteStyle}><ShieldCheck size={14} /> Kid-friendly signup: no email needed. Use a nickname, not a real name.</p>
              <AuthInput
                icon={Mail}
                type="email"
                placeholder="Recovery email (optional)"
                value={registerData.email}
                onChange={(value) => setRegisterData({ ...registerData, email: value })}
              />
              <AuthInput
                icon={Lock}
                type={showRegisterPassword ? 'text' : 'password'}
                placeholder="Password"
                value={registerData.password}
                onChange={(value) => setRegisterData({ ...registerData, password: value })}
                rightAction={
                  <IconButton
                    label={showRegisterPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowRegisterPassword(prev => !prev)}
                    icon={showRegisterPassword ? EyeOff : Eye}
                  />
                }
              />
              <AuthInput
                icon={Lock}
                type={showRegisterPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={registerData.confirmPassword}
                onChange={(value) => setRegisterData({ ...registerData, confirmPassword: value })}
              />
              <p className="rqk-auth-small-note" style={kidSafeNoteStyle}><ShieldCheck size={14} /> Passwords need at least 8 characters. Recovery email helps if you forget it later.</p>

              <PrimaryButton type="submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </PrimaryButton>

              <AuthSwitch text="Already have an account?" actionText="Sign in" onClick={() => setMode('login')} />
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="rqk-auth-form">
              <AuthInput
                icon={Mail}
                type="email"
                placeholder="Email address"
                value={forgotEmail}
                onChange={setForgotEmail}
              />

              <PrimaryButton type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </PrimaryButton>

              <SecondaryButton type="button" onClick={() => setMode('login')}>
                <ArrowLeft size={16} /> <span>Back to login</span>
              </SecondaryButton>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="rqk-auth-form">
              <AuthInput
                icon={Lock}
                type={showResetPassword ? 'text' : 'password'}
                placeholder="New password"
                value={resetData.new_password}
                onChange={(value) => setResetData({ ...resetData, new_password: value })}
                rightAction={
                  <IconButton
                    label={showResetPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowResetPassword(prev => !prev)}
                    icon={showResetPassword ? EyeOff : Eye}
                  />
                }
              />
              <p className="rqk-auth-small-note" style={kidSafeNoteStyle}><ShieldCheck size={14} /> Use at least 8 characters.</p>

              <PrimaryButton type="submit" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </PrimaryButton>
            </form>
          )}
        </div>

        <p className="rqk-auth-footer" style={footerStyle}>© {new Date().getFullYear()} Rookie Quest Keeper</p>
      </div>
    </div>
  );
}

function AuthInput({ icon: Icon, type, placeholder, value, onChange, testId, rightAction }) {
  return (
    <div className="rqk-auth-input" style={inputWrapStyle}>
      <Icon size={18} className="rqk-auth-input-icon" style={inputIconStyle} />
      <input
        className="rqk-auth-field"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        style={inputStyle}
      />
      {rightAction}
    </div>
  );
}

function IconButton({ icon: Icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="rqk-auth-icon-button" style={iconButtonStyle}>
      <Icon size={17} />
    </button>
  );
}

function PrimaryButton({ children, disabled, type = 'button', testId }) {
  return <button type={type} disabled={disabled} data-testid={testId} className="rqk-auth-primary" style={primaryButtonStyle}><span>{children}</span></button>;
}

function SecondaryButton({ children, onClick, type = 'button' }) {
  return <button type={type} onClick={onClick} className="rqk-auth-secondary" style={secondaryButtonStyle}>{children}</button>;
}

function AuthSwitch({ text, actionText, onClick }) {
  return (
    <div className="rqk-auth-switch" style={switchStyle}>
      <span>{text}</span>
      <button type="button" onClick={onClick} className="rqk-auth-switch-button" style={switchButtonStyle}><span>{actionText}</span></button>
    </div>
  );
}

const pageStyle = {
  minHeight: '100dvh',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '18px 14px 24px',
  background: 'linear-gradient(180deg, #07040d 0%, #10051d 100%)',
  position: 'relative',
  overflowX: 'hidden',
  overflowY: 'auto',
  color: 'var(--rq-text, #ffffff)',
};

const contentStyle = {
  position: 'relative',
  zIndex: 1,
  width: 'min(100%, 410px)',
  display: 'grid',
  gap: 12,
  justifyItems: 'center',
};

const logoWrapStyle = {
  cursor: 'pointer',
  width: 38,
  height: 38,
  display: 'inline-grid',
  placeItems: 'center',
  border: '1px solid transparent',
  borderRadius: 8,
  background: 'linear-gradient(#12051c, #12051c) padding-box, linear-gradient(135deg, #7357ff, #d84df1, #ff4f81, #ff9542) border-box',
  padding: 0,
  margin: '0 0 2px',
  color: '#ffffff',
};

const panelStyle = {
  width: '100%',
  padding: 16,
  borderRadius: 12,
  background: 'linear-gradient(#190728, #190728) padding-box, linear-gradient(135deg, #7357ff, #d84df1, #ff4f81, #ff9542) border-box',
  border: '1px solid transparent',
  boxShadow: 'none',
};

const headingStyle = { textAlign: 'center', marginBottom: 14 };
const eyebrowStyle = { margin: '0 0 6px', color: 'rgba(255,255,255,0.78)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.13em', fontWeight: 950 };
const titleStyle = { margin: 0, color: '#ffffff', fontFamily: "var(--rq-heading-font, 'Cinzel'), Georgia, serif", fontSize: 34, fontWeight: 950, lineHeight: 1.02, letterSpacing: '0.01em' };
const subtitleStyle = { margin: '8px auto 0', maxWidth: 360, color: 'rgba(255,255,255,0.82)', fontSize: 15, lineHeight: 1.38 };

const inputWrapStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  marginBottom: 9,
  padding: '0 9px',
  minHeight: 48,
  borderRadius: 10,
  border: '1px solid transparent',
  background: 'linear-gradient(#12051c, #12051c) padding-box, linear-gradient(135deg, rgba(115,87,255,0.92), rgba(216,77,241,0.9), rgba(255,79,129,0.86), rgba(255,149,66,0.78)) border-box',
};

const inputIconStyle = { color: '#ff4fdd', flexShrink: 0 };
const inputStyle = { width: '100%', minWidth: 0, border: 0, outline: 'none', background: 'transparent', color: '#ffffff', fontSize: 15 };
const iconButtonStyle = { border: '1px solid transparent', background: 'linear-gradient(#12051c, #12051c) padding-box, linear-gradient(135deg, #7357ff, #d84df1, #ff4f81, #ff9542) border-box', borderRadius: 8, color: '#ffffff', cursor: 'pointer', minHeight: 34, width: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };

const primaryButtonStyle = {
  width: '100%',
  minHeight: 46,
  borderRadius: 10,
  border: 0,
  background: 'linear-gradient(135deg, #7357ff 0%, #d84df1 36%, #ff4f81 66%, #ff9542 100%)',
  color: '#ffffff',
  fontWeight: 950,
  fontSize: 15,
  cursor: 'pointer',
  marginTop: 6,
  boxShadow: 'none',
};

const secondaryButtonStyle = {
  width: '100%',
  minHeight: 42,
  marginTop: 8,
  borderRadius: 10,
  border: '1px solid transparent',
  background: 'linear-gradient(#12051c, #12051c) padding-box, linear-gradient(135deg, #7357ff, #d84df1, #ff4f81, #ff9542) border-box',
  color: '#ffffff',
  fontWeight: 850,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  boxShadow: 'none',
};

const linkButtonStyle = {
  border: '1px solid transparent',
  background: 'linear-gradient(#12051c, #12051c) padding-box, linear-gradient(135deg, #7357ff, #d84df1, #ff4f81, #ff9542) border-box',
  color: '#ffffff',
  cursor: 'pointer',
  fontSize: 12,
  margin: '0 0 8px',
  padding: '8px 10px',
  borderRadius: 9,
  textAlign: 'left',
  fontWeight: 900,
};

const switchStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 13, color: 'rgba(255,255,255,0.82)', fontSize: 14 };
const switchButtonStyle = { border: '1px solid transparent', background: 'linear-gradient(#12051c, #12051c) padding-box, linear-gradient(135deg, #7357ff, #d84df1, #ff4f81, #ff9542) border-box', color: '#ffffff', cursor: 'pointer', fontWeight: 900, padding: '8px 10px', borderRadius: 9 };
const footerStyle = { margin: 0, color: 'rgba(255,255,255,0.72)', fontSize: 12 };

const nextStepNoteStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'flex-start',
  padding: '10px 11px',
  borderRadius: 10,
  background: 'rgba(18, 5, 28, 0.82)',
  border: '1px solid rgba(216,77,241,0.24)',
  color: 'rgba(255,255,255,0.82)',
  fontSize: 12,
  lineHeight: 1.35,
  marginBottom: 10,
};

const accountChangeNoticeStyle = {
  ...nextStepNoteStyle,
  color: 'rgba(255,255,255,0.82)',
};

const kidSafeNoteStyle = {
  display: 'flex',
  gap: 7,
  alignItems: 'flex-start',
  color: 'rgba(255,255,255,0.76)',
  fontSize: 12,
  lineHeight: 1.3,
  margin: '-2px 0 9px',
};
