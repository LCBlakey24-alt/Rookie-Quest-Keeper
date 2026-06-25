import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowLeft, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/errorMessage';

export default function AuthPage({ onLogin }) {
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
    login: { title: 'Welcome Back', subtitle: 'Sign in to open your dashboard, character sheets, campaigns, and player tools.' },
    register: { title: 'Create Your Account', subtitle: 'Make an account, then build your first character or join a campaign from the dashboard.' },
    forgot: { title: 'Reset Password', subtitle: 'Enter your recovery email and we will send a reset link.' },
    reset: { title: 'New Password', subtitle: 'Choose a new password for your account.' },
  };

  return (
    <div style={pageStyle}>
      <div style={backgroundStyle} />
      <div style={backgroundGlowStyle} />

      <div style={contentStyle}>
        <div onClick={() => navigate('/')} style={logoWrapStyle}>
          <img src="/images/logo-main.png" alt="Rookie Quest Keeper" style={logoStyle} />
        </div>

        <div style={panelStyle}>
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <h1 style={titleStyle}>{authCopy[mode]?.title}</h1>
            <p style={subtitleStyle}>{authCopy[mode]?.subtitle}</p>
          </div>

          {(mode === 'login' || mode === 'register') && (
            <div style={nextStepNoteStyle}>
              <ShieldCheck size={16} />
              <span>After signing in, start with <strong>Build Your First Character</strong>, then join a campaign when your GM shares a code.</span>
            </div>
          )}

          {mode === 'login' && (
            <div style={accountChangeNoticeStyle}>
              <ShieldCheck size={16} />
              <span>Existing player? Use your username or the same email you used before. New player? Tap <strong>Sign up</strong> below to create an account.</span>
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
                Forgot password? Only works if a recovery email was added.
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
                placeholder="Username (letters, numbers, _ or -)"
                value={registerData.username}
                onChange={(value) => setRegisterData({ ...registerData, username: value })}
              />
              <p style={kidSafeNoteStyle}><ShieldCheck size={15} /> Kid-friendly signup: no email needed. Use a nickname, not a real name. Add a parent/adult email only if you want password recovery.</p>
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
                {loading ? 'Creating account...' : 'Create Account & Continue'}
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

              <PrimaryButton type="submit" disabled={loading} style={{ marginBottom: '16px' }}>
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
      <Icon size={20} style={inputIconStyle} />
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

const pageStyle = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#120C08', position: 'relative', overflow: 'hidden' };
const backgroundStyle = { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(90deg, rgba(245,230,200,0.025) 1px, transparent 1px), linear-gradient(180deg, rgba(245,230,200,0.02) 1px, transparent 1px)', backgroundSize: '72px 72px', pointerEvents: 'none' };
const backgroundGlowStyle = { position: 'absolute', width: 520, height: 520, borderRadius: '50%', background: 'rgba(192,138,61,0.16)', filter: 'blur(96px)', top: '-180px', right: '-120px', pointerEvents: 'none' };
const contentStyle = { position: 'relative', zIndex: 1, width: 'min(100%, 460px)', display: 'grid', gap: '18px', justifyItems: 'center' };
const logoWrapStyle = { cursor: 'pointer', display: 'inline-flex', justifyContent: 'center' };
const logoStyle = { width: 260, maxWidth: '80vw', height: 'auto', filter: 'drop-shadow(0 0 18px rgba(192,138,61,0.32))' };
const panelStyle = { width: '100%', padding: '24px', borderRadius: 18, background: 'rgba(33,21,14,0.94)', border: '1px solid rgba(192,138,61,0.28)', boxShadow: '0 20px 60px rgba(0,0,0,0.45)' };
const titleStyle = { margin: 0, color: '#F5E6C8', fontSize: 32, fontWeight: 950, lineHeight: 1.05 };
const subtitleStyle = { margin: '8px 0 0', color: '#E6D2AA', fontSize: 14, lineHeight: 1.5 };
const inputWrapStyle = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '0 12px', minHeight: 48, borderRadius: 12, border: '1px solid rgba(192,138,61,0.24)', background: 'rgba(18,12,8,0.55)' };
const inputIconStyle = { color: '#C08A3D', flexShrink: 0 };
const inputStyle = { width: '100%', border: 0, outline: 'none', background: 'transparent', color: '#F5E6C8', fontSize: 15 };
const primaryButtonStyle = { width: '100%', minHeight: 48, borderRadius: 12, border: '1px solid rgba(224,177,92,0.72)', background: '#C08A3D', color: '#120C08', fontWeight: 950, fontSize: 15, cursor: 'pointer', marginTop: 6 };
const secondaryButtonStyle = { width: '100%', minHeight: 46, borderRadius: 12, border: '1px solid rgba(192,138,61,0.28)', background: 'rgba(46,29,19,0.82)', color: '#F5E6C8', fontWeight: 850, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
const linkButtonStyle = { border: 0, background: 'transparent', color: '#CDBA98', cursor: 'pointer', fontSize: 12, margin: '0 0 10px', padding: 0, textAlign: 'left' };
const switchStyle = { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16, color: '#CDBA98', fontSize: 14 };
const switchButtonStyle = { border: 0, background: 'transparent', color: '#E0B15C', cursor: 'pointer', fontWeight: 900, padding: 0 };
const footerStyle = { margin: 0, color: '#CDBA98', fontSize: 12 };
const nextStepNoteStyle = { display: 'flex', gap: 8, alignItems: 'flex-start', padding: 10, borderRadius: 12, background: 'rgba(122,155,102,0.1)', border: '1px solid rgba(122,155,102,0.26)', color: '#E6D2AA', fontSize: 12, lineHeight: 1.45, marginBottom: 12 };
const accountChangeNoticeStyle = { display: 'flex', gap: 8, alignItems: 'flex-start', padding: 10, borderRadius: 12, background: 'rgba(192,138,61,0.1)', border: '1px solid rgba(192,138,61,0.26)', color: '#E6D2AA', fontSize: 12, lineHeight: 1.45, marginBottom: 12 };
const kidSafeNoteStyle = { display: 'flex', gap: 8, alignItems: 'flex-start', color: '#CDBA98', fontSize: 12, lineHeight: 1.4, margin: '-4px 0 12px' };
