import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowLeft } from 'lucide-react';
import apiClient from '@/lib/apiClient';

export default function AuthPage({ onLogin }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialToken = searchParams.get('token');
  const initialMode = initialToken ? 'reset' : 'login';

  const [mode, setMode] = useState(initialMode);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', username: '', password: '' });
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
    if (!loginData.email || !loginData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', loginData);
      toast.success('Welcome back!');
      onLogin(response.data.token, response.data.username);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerData.email || !registerData.username || !registerData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/register', registerData);
      toast.success('Account created! Welcome to ROOK!');
      onLogin(response.data.token, response.data.username);
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
    login: { title: 'Welcome Back', subtitle: 'Sign in to continue your adventure' },
    register: { title: 'Begin Your Quest', subtitle: 'Create your account to get started' },
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
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={titleStyle}>{authCopy[mode]?.title}</h1>
            <p style={subtitleStyle}>{authCopy[mode]?.subtitle}</p>
          </div>

          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <AuthInput
                icon={Mail}
                type="email"
                placeholder="Email address"
                value={loginData.email}
                onChange={(value) => setLoginData({ ...loginData, email: value })}
                testId="login-email"
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
                placeholder="Username"
                value={registerData.username}
                onChange={(value) => setRegisterData({ ...registerData, username: value })}
              />
              <AuthInput
                icon={Mail}
                type="email"
                placeholder="Email address"
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
          e.currentTarget.style.borderColor = 'var(--rq-accent-hover, #D62839)';
          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(193,18,31,0.18)';
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

const pageStyle = { minHeight: '100vh', position: 'relative', overflow: 'hidden', background: 'var(--rq-bg-main, #1A1A1A)' };
const backgroundStyle = { position: 'fixed', inset: 0, background: 'var(--rq-bg-main, #1A1A1A)', zIndex: 0 };
const backgroundGlowStyle = { position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 20% 20%, rgba(193,18,31,0.14) 0%, transparent 46%), radial-gradient(ellipse at 82% 78%, rgba(255,255,255,0.05) 0%, transparent 42%)', zIndex: 1 };
const contentStyle = { position: 'relative', zIndex: 2, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' };
const logoWrapStyle = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', cursor: 'pointer' };
const logoStyle = { height: '50px', width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(193,18,31,0.45))' };
const logoTextStyle = { fontFamily: "'Cinzel', serif", fontSize: '32px', fontWeight: 800, color: 'var(--rq-text-primary, #FFFFFF)', letterSpacing: '0.06em' };
const panelStyle = { width: '100%', maxWidth: '420px', background: 'rgba(36,36,36,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid var(--rq-accent-border, rgba(193,18,31,0.35))', borderRadius: 'var(--rq-radius-md, 6px)', padding: '40px', boxShadow: 'var(--rq-shadow-heavy, 0 10px 28px rgba(0,0,0,0.32))' };
const titleStyle = { fontFamily: "'Cinzel', serif", fontSize: '1.75rem', color: 'var(--rq-text-primary, #FFFFFF)', margin: '0 0 8px 0', fontWeight: 800 };
const subtitleStyle = { color: 'var(--rq-text-muted, #A0A0A0)', fontSize: '14px', margin: 0 };
const inputWrapperStyle = { position: 'relative', marginBottom: '16px' };
const inputStyle = { width: '100%', padding: '14px 16px 14px 48px', background: 'var(--rq-bg-input, #1F1F1F)', border: '1px solid var(--rq-border-default, #3A3A3A)', borderRadius: 'var(--rq-radius-sm, 4px)', color: 'var(--rq-text-primary, #FFFFFF)', fontSize: '15px', outline: 'none', transition: 'all 0.15s ease' };
const iconStyle = { position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--rq-accent-primary, #C1121F)' };
const linkButtonStyle = { background: 'none', border: 'none', color: 'var(--rq-accent-hover, #D62839)', fontSize: '13px', cursor: 'pointer', marginBottom: '24px', padding: 0, fontWeight: 800 };
const primaryButtonStyle = { width: '100%', padding: '14px', background: 'var(--rq-accent-primary, #C1121F)', border: '1px solid var(--rq-accent-primary, #C1121F)', borderRadius: 'var(--rq-radius-sm, 4px)', color: 'var(--rq-text-primary, #FFFFFF)', fontSize: '16px', fontWeight: 800, transition: 'all 0.15s ease', boxShadow: '0 4px 16px rgba(193,18,31,0.24)' };
const secondaryButtonStyle = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'transparent', border: '1px solid var(--rq-border-default, #3A3A3A)', borderRadius: 'var(--rq-radius-sm, 4px)', color: 'var(--rq-text-secondary, #D6D6D6)', fontSize: '14px', fontWeight: 800, cursor: 'pointer' };
const switchWrapStyle = { textAlign: 'center', marginTop: '24px', color: 'var(--rq-text-muted, #A0A0A0)', fontSize: '14px' };
const switchButtonStyle = { background: 'none', border: 'none', color: 'var(--rq-accent-hover, #D62839)', fontWeight: 800, cursor: 'pointer', padding: 0 };
const footerStyle = { marginTop: '32px', color: 'var(--rq-text-disabled, #6F6F6F)', fontSize: '13px' };
