import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowLeft, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/apiClient';

export default function AuthPage({ onLogin }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialToken = searchParams.get('token');
  const initialMode = initialToken ? 'reset' : 'login';

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
    }
  }, [initialToken]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginData.username || !loginData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', loginData);
      toast.success('Welcome back!');
      onLogin(response.data.token, response.data.username);
      navigate('/home', { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Login failed');
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
      toast.success('Account created! Welcome to ROOK!');
      onLogin(response.data.token, response.data.username);
      navigate('/home', { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Registration failed');
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
      toast.error(error?.response?.data?.detail || 'Failed to send reset email');
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
      toast.error(error?.response?.data?.detail || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const authCopy = {
    login: { title: 'Welcome Back', subtitle: 'Sign in with your username. Existing accounts can still use their email here.' },
    register: { title: 'Begin Your Quest', subtitle: 'Create a safe username and password. Email is optional for recovery only.' },
    forgot: { title: 'Reset Password', subtitle: 'Enter your email to receive a reset link' },
    reset: { title: 'New Password', subtitle: 'Choose a new password for your account' },
  };

  return (
    <div style={pageStyle}>
      <div style={backgroundStyle} />
      <div style={backgroundGlowStyle} />

      <div style={contentStyle}>
        <div onClick={() => navigate('/')} style={logoWrapStyle}>
          <img src="/images/logo-mini.png" alt="ROOK" style={logoStyle} />
          <span style={logoTextStyle}>ROOK</span>
        </div>

        <div style={panelStyle}>
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <h1 style={titleStyle}>{authCopy[mode]?.title}</h1>
            <p style={subtitleStyle}>{authCopy[mode]?.subtitle}</p>
          </div>

          {mode === 'login' && (
            <div style={accountChangeNoticeStyle}>
              <ShieldCheck size={16} />
              <span>Account update: new players can sign up without email. If you already used email before, type that same email here and your campaigns/characters will still load.</span>
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
                {loading ? 'Signing in...' : 'Sign In'}
              </PrimaryButton>

              <AuthSwitch text="Don't have an account?" actionText="Sign up" onClick={() => setMode('register')} />
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
    <div style={inputWrapperStyle}>
      <Icon size={18} style={iconStyle} />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        style={inputStyle}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#A78BFA';
          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(124,58,237,0.22)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--rq-border-default, #3A3A3A)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}

function PrimaryButton({ children, type = 'button', disabled, testId, style = {} }) {
  return (
    <button type={type} disabled={disabled} data-testid={testId} style={{ ...primaryButtonStyle, opacity: disabled ? 0.7 : 1, cursor: disabled ? 'not-allowed' : 'pointer', ...style }}>
      {children}
    </button>
  );
}

function SecondaryButton({ children, type = 'button', onClick }) {
  return (
    <button type={type} onClick={onClick} style={secondaryButtonStyle}>
      {children}
    </button>
  );
}

function AuthSwitch({ text, actionText, onClick }) {
  return (
    <div style={switchWrapStyle}>
      {text}{' '}
      <button type="button" onClick={onClick} style={switchButtonStyle}>
        {actionText}
      </button>
    </div>
  );
}

const pageStyle = { minHeight: '100dvh', position: 'relative', overflowX: 'hidden', overflowY: 'auto', background: '#07111F', WebkitOverflowScrolling: 'touch' };
const backgroundStyle = { position: 'fixed', inset: 0, background: 'linear-gradient(135deg, #07111F 0%, #0F172A 48%, #111827 100%)', zIndex: 0, pointerEvents: 'none' };
const backgroundGlowStyle = { position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 22% 18%, rgba(124,58,237,0.20) 0%, transparent 42%), radial-gradient(ellipse at 80% 78%, rgba(14,165,233,0.14) 0%, transparent 38%)', zIndex: 1, pointerEvents: 'none' };
const contentStyle = { position: 'relative', zIndex: 2, minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: 'max(18px, env(safe-area-inset-top)) 18px max(28px, env(safe-area-inset-bottom))' };
const logoWrapStyle = { display: 'flex', alignItems: 'center', gap: '10px', margin: '12px 0 20px', cursor: 'pointer', flexShrink: 0 };
const logoStyle = { height: '42px', width: 'auto', filter: 'drop-shadow(0 2px 10px rgba(124,58,237,0.45))' };
const logoTextStyle = { fontFamily: "'Inter', system-ui, sans-serif", fontSize: '24px', fontWeight: 900, color: 'var(--rq-text-primary, #FFFFFF)', letterSpacing: '0.08em' };
const panelStyle = { width: '100%', maxWidth: '390px', background: 'rgba(15,23,42,0.94)', border: '1px solid rgba(124,58,237,0.30)', borderRadius: '18px', padding: 'clamp(18px, 5vw, 26px)', boxShadow: '0 18px 54px rgba(0,0,0,0.38)' };
const titleStyle = { fontFamily: "'Inter', system-ui, sans-serif", fontSize: '1.55rem', color: 'var(--rq-text-primary, #FFFFFF)', margin: '0 0 6px 0', fontWeight: 900 };
const subtitleStyle = { color: 'var(--rq-text-muted, #A0A0A0)', fontSize: '14px', margin: 0 };
const kidSafeNoteStyle = { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--rq-text-muted, #A8A8A8)', fontSize: '13px', lineHeight: 1.45, margin: '-4px 0 14px' };
const accountChangeNoticeStyle = { display: 'flex', alignItems: 'flex-start', gap: '9px', color: 'var(--rq-text-secondary, #D6D6D6)', fontSize: '13px', lineHeight: 1.45, background: 'rgba(46,139,87,0.12)', border: '1px solid rgba(46,139,87,0.35)', padding: '10px 12px', marginBottom: '18px' };
const inputWrapperStyle = { position: 'relative', marginBottom: '16px' };
const inputStyle = { width: '100%', padding: '14px 16px 14px 48px', background: 'var(--rq-bg-input, #1F1F1F)', border: '1px solid var(--rq-border-default, #3A3A3A)', borderRadius: 'var(--rq-radius-sm, 4px)', color: 'var(--rq-text-primary, #FFFFFF)', fontSize: '16px', outline: 'none', transition: 'all 0.15s ease' };
const iconStyle = { position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--rq-accent-primary, #C1121F)' };
const linkButtonStyle = { background: 'none', border: 'none', color: 'var(--rq-accent-hover, #D62839)', fontSize: '13px', cursor: 'pointer', marginBottom: '24px', padding: 0, fontWeight: 800 };
const primaryButtonStyle = { width: '100%', minHeight: 46, padding: '14px', background: 'var(--rq-accent-primary, #C1121F)', border: '1px solid var(--rq-accent-primary, #C1121F)', borderRadius: 'var(--rq-radius-sm, 4px)', color: 'var(--rq-text-primary, #FFFFFF)', fontSize: '16px', fontWeight: 800, transition: 'all 0.15s ease', boxShadow: '0 4px 16px rgba(193,18,31,0.24)' };
const secondaryButtonStyle = { width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'transparent', border: '1px solid var(--rq-border-default, #3A3A3A)', borderRadius: 'var(--rq-radius-sm, 4px)', color: 'var(--rq-text-secondary, #D6D6D6)', fontSize: '14px', fontWeight: 800, cursor: 'pointer' };
const switchWrapStyle = { textAlign: 'center', marginTop: '24px', color: 'var(--rq-text-muted, #A0A0A0)', fontSize: '14px' };
const switchButtonStyle = { background: 'none', border: 'none', color: '#A78BFA', fontWeight: 800, cursor: 'pointer', padding: 0 };
const footerStyle = { marginTop: '24px', color: 'var(--rq-text-disabled, #6F6F6F)', fontSize: '13px', paddingBottom: 8 };
