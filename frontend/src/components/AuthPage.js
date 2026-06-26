import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowLeft, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/errorMessage';
import { RookLogo } from '@/components/ui/RookIcon';

export default function AuthPage({ onLogin = () => {} }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialToken = searchParams.get('token');
  const queryMode = searchParams.get('mode');
  const initialMode = initialToken ? 'reset' : queryMode === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState(initialMode);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', password: '', email: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetData, setResetData] = useState({ token: initialToken || '', new_password: '' });
  const [loading, setLoading] = useState(false);

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
      onLogin(response.data.token, response.data.username);
      navigate('/home', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerData.username || !registerData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = { username: registerData.username.trim(), password: registerData.password };
      if (registerData.email.trim()) payload.email = registerData.email.trim();
      const response = await apiClient.post('/auth/register', payload);
      toast.success('Account created! Welcome to Rookie Quest Keeper!');
      onLogin(response.data.token, response.data.username);
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
    login: { title: 'Welcome Back', subtitle: 'Sign in to open your dashboard, sheets, campaigns, and player tools.' },
    register: { title: 'Create Account', subtitle: 'Make an account, then build your first character or join a campaign.' },
    forgot: { title: 'Reset Password', subtitle: 'Enter your recovery email and we will send a reset link.' },
    reset: { title: 'New Password', subtitle: 'Choose a new password for your account.' },
  };

  return (
    <div style={pageStyle}>
      <div style={backgroundStyle} />

      <div style={contentStyle}>
        <button type="button" onClick={() => navigate('/')} style={logoWrapStyle} aria-label="Back to Rookie Quest Keeper home">
          <RookLogo height={56} />
        </button>

        <div style={panelStyle}>
          <div style={headingStyle}>
            <h1 style={titleStyle}>{authCopy[mode]?.title}</h1>
            <p style={subtitleStyle}>{authCopy[mode]?.subtitle}</p>
          </div>

          {mode === 'register' && (
            <div style={nextStepNoteStyle}>
              <ShieldCheck size={15} />
              <span>After signup, start with <strong>Build Your First Character</strong>.</span>
            </div>
          )}

          {mode === 'login' && (
            <div style={accountChangeNoticeStyle}>
              <ShieldCheck size={15} />
              <span>Use your username or email. New player? Tap <strong>Create an account</strong> below.</span>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin}>
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
                type="password"
                placeholder="Password"
                value={loginData.password}
                onChange={(value) => setLoginData({ ...loginData, password: value })}
                testId="login-password"
              />

              <button type="button" onClick={() => setMode('forgot')} style={linkButtonStyle}>
                Forgot password?
              </button>

              <PrimaryButton type="submit" disabled={loading} testId="login-btn">
                {loading ? 'Opening dashboard...' : 'Open Dashboard'}
              </PrimaryButton>

              <AuthSwitch text="New here?" actionText="Create an account" onClick={() => setMode('register')} />
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister}>
              <AuthInput
                icon={User}
                type="text"
                placeholder="Username"
                value={registerData.username}
                onChange={(value) => setRegisterData({ ...registerData, username: value })}
              />
              <p style={kidSafeNoteStyle}><ShieldCheck size={14} /> Kid-friendly signup: no email needed. Use a nickname, not a real name.</p>
              <AuthInput
                icon={Mail}
                type="email"
                placeholder="Recovery email (optional)"
                value={registerData.email}
                onChange={(value) => setRegisterData({ ...registerData, email: value })}
              />
              <AuthInput
                icon={Lock}
                type="password"
                placeholder="Password"
                value={registerData.password}
                onChange={(value) => setRegisterData({ ...registerData, password: value })}
              />

              <PrimaryButton type="submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </PrimaryButton>

              <AuthSwitch text="Already have an account?" actionText="Sign in" onClick={() => setMode('login')} />
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword}>
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
                <ArrowLeft size={16} /> Back to login
              </SecondaryButton>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetPassword}>
              <AuthInput
                icon={Lock}
                type="password"
                placeholder="New password"
                value={resetData.new_password}
                onChange={(value) => setResetData({ ...resetData, new_password: value })}
              />

              <PrimaryButton type="submit" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </PrimaryButton>
            </form>
          )}
        </div>

        <p style={footerStyle}>© 2026 Rookie Quest Keeper</p>
      </div>
    </div>
  );
}

function AuthInput({ icon: Icon, type, placeholder, value, onChange, testId }) {
  return (
    <div style={inputWrapStyle}>
      <Icon size={18} style={inputIconStyle} />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        style={inputStyle}
      />
    </div>
  );
}

function PrimaryButton({ children, disabled, type = 'button', testId }) {
  return <button type={type} disabled={disabled} data-testid={testId} style={primaryButtonStyle}>{children}</button>;
}

function SecondaryButton({ children, onClick, type = 'button' }) {
  return <button type={type} onClick={onClick} style={secondaryButtonStyle}>{children}</button>;
}

function AuthSwitch({ text, actionText, onClick }) {
  return (
    <div style={switchStyle}>
      <span>{text}</span>
      <button type="button" onClick={onClick} style={switchButtonStyle}>{actionText}</button>
    </div>
  );
}

const pageStyle = {
  minHeight: '100dvh',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '12px 16px 24px',
  background: '#070814',
  position: 'relative',
  overflowX: 'hidden',
  overflowY: 'auto',
};
const backgroundStyle = { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(90deg, rgba(245,230,200,0.018) 1px, transparent 1px), linear-gradient(180deg, rgba(245,230,200,0.014) 1px, transparent 1px)', backgroundSize: '72px 72px', pointerEvents: 'none' };
const contentStyle = { position: 'relative', zIndex: 1, width: 'min(100%, 430px)', display: 'grid', gap: '12px', justifyItems: 'center' };
const logoWrapStyle = { cursor: 'pointer', display: 'inline-flex', justifyContent: 'center', border: 0, background: 'transparent', padding: 0, margin: 0, color: '#F6EAD2' };
const panelStyle = { width: '100%', padding: '14px 0 0', borderRadius: 0, background: 'transparent', border: 0, borderTop: '1px solid rgba(216,173,79,0.16)', boxShadow: 'none' };
const headingStyle = { textAlign: 'center', marginBottom: '12px' };
const titleStyle = { margin: 0, color: '#F5E6C8', fontSize: 28, fontWeight: 950, lineHeight: 1.05 };
const subtitleStyle = { margin: '6px 0 0', color: '#E6D2AA', fontSize: 13, lineHeight: 1.4 };
const inputWrapStyle = { display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9, padding: '0 10px', minHeight: 44, borderRadius: 0, border: '1px solid rgba(216,173,79,0.22)', background: '#0b0d1e' };
const inputIconStyle = { color: '#C08A3D', flexShrink: 0 };
const inputStyle = { width: '100%', border: 0, outline: 'none', background: 'transparent', color: '#F5E6C8', fontSize: 15 };
const primaryButtonStyle = { width: '100%', minHeight: 44, borderRadius: 0, border: '1px solid rgba(224,177,92,0.72)', background: '#C08A3D', color: '#070814', fontWeight: 950, fontSize: 15, cursor: 'pointer', marginTop: 4, boxShadow: 'none' };
const secondaryButtonStyle = { width: '100%', minHeight: 42, marginTop: 8, borderRadius: 0, border: '1px solid rgba(216,173,79,0.28)', background: 'transparent', color: '#F5E6C8', fontWeight: 850, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: 'none' };
const linkButtonStyle = { border: 0, background: 'transparent', color: '#E0B15C', cursor: 'pointer', fontSize: 12, margin: '0 0 8px', padding: 0, textAlign: 'left' };
const switchStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 12, color: '#CDBA98', fontSize: 14 };
const switchButtonStyle = { border: '1px solid rgba(216,173,79,0.24)', background: 'transparent', color: '#F5E6C8', cursor: 'pointer', fontWeight: 900, padding: '8px 10px', borderRadius: 0 };
const footerStyle = { margin: 0, color: '#CDBA98', fontSize: 12 };
const nextStepNoteStyle = { display: 'flex', gap: 8, alignItems: 'flex-start', padding: '9px 0', borderRadius: 0, background: 'transparent', border: 0, borderTop: '1px solid rgba(122,155,102,0.28)', color: '#E6D2AA', fontSize: 12, lineHeight: 1.35, marginBottom: 9 };
const accountChangeNoticeStyle = { display: 'flex', gap: 8, alignItems: 'flex-start', padding: '9px 0', borderRadius: 0, background: 'transparent', border: 0, borderTop: '1px solid rgba(216,173,79,0.18)', color: '#E6D2AA', fontSize: 12, lineHeight: 1.35, marginBottom: 9 };
const kidSafeNoteStyle = { display: 'flex', gap: 7, alignItems: 'flex-start', color: '#CDBA98', fontSize: 12, lineHeight: 1.3, margin: '-2px 0 9px' };
