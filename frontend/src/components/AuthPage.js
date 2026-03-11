import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import TronBackground from '@/components/TronBackground';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Aether & Iron Theme
const theme = {
  bg: {
    primary: '#0B0F19',
    surface: '#111827',
    surfaceHover: '#1F2937'
  },
  gm: {
    primary: '#F59E0B',
    secondary: '#D97706',
    glow: 'rgba(245, 158, 11, 0.4)'
  },
  player: {
    primary: '#06B6D4',
    secondary: '#0891B2',
    glow: 'rgba(6, 182, 212, 0.4)'
  },
  text: {
    primary: '#F9FAFB',
    secondary: '#9CA3AF',
    muted: '#6B7280'
  },
  border: '#374151'
};

// Ember Particles Component
const EmberParticles = () => (
  <div className="ember-particles">
    {[...Array(15)].map((_, i) => (
      <div 
        key={i} 
        className={`ember ${i % 3 === 0 ? 'large' : i % 2 === 0 ? 'medium' : 'small'}`}
      />
    ))}
  </div>
);

function AuthPage({ onLogin }) {
  const [searchParams] = useSearchParams();
  
  // Check for reset token immediately on component mount
  const initialToken = searchParams.get('token');
  const initialMode = initialToken ? 'reset' : 'login';
  
  const [mode, setMode] = useState(initialMode);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', username: '', password: '', referral_code: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetData, setResetData] = useState({ token: initialToken || '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [referralFromUrl, setReferralFromUrl] = useState(null);

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralFromUrl(refCode);
      setRegisterData(prev => ({ ...prev, referral_code: refCode }));
      setMode('register');
      toast.info('Referral code applied! Create an account to get started.');
    }
    
    const resetToken = searchParams.get('token');
    if (resetToken) {
      setResetData(prev => ({ ...prev, token: resetToken }));
      setMode('reset');
    }
  }, [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, loginData);
      toast.success('Welcome back, Game Master!');
      onLogin(response.data.token, response.data.username);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerData.email || !registerData.username || !registerData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (registerData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, registerData);
      if (referralFromUrl) {
        toast.success('Account created! Your friend will receive 1 free month of premium!');
      } else {
        toast.success('Account created! Welcome, Game Master!');
      }
      onLogin(response.data.token, response.data.username);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
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
      await axios.post(`${API}/auth/forgot-password`, { email: forgotEmail });
      toast.success('If an account exists with this email, a reset link has been sent!');
      setMode('login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetData.new_password || !resetData.confirm_password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (resetData.new_password !== resetData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    if (resetData.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        token: resetData.token,
        new_password: resetData.new_password
      });
      toast.success('Password reset successfully! You can now log in.');
      setMode('login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: theme.bg.surface,
    border: `1px solid ${theme.border}`,
    color: theme.text.primary,
    padding: '14px 16px',
    width: '100%',
    fontSize: '15px',
    borderRadius: '8px'
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: theme.bg.primary,
      fontFamily: "'Crimson Text', Georgia, serif",
      position: 'relative'
    }}>
      {/* Ember Background Effect */}
      <div className="ember-bg" />
      
      {/* Floating Ember Particles */}
      <EmberParticles />
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: '420px',
        gap: '40px',
        position: 'relative',
        zIndex: 2
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '600',
            color: theme.gm.primary,
            letterSpacing: '0.1em',
            margin: '0 0 8px',
            fontFamily: "'Cinzel', Georgia, serif"
          }}>
            ROOKIE QUEST
          </h1>
          <h2 style={{
            fontSize: '40px',
            fontWeight: '600',
            color: theme.text.primary,
            letterSpacing: '0.15em',
            margin: 0,
            fontFamily: "'Cinzel', Georgia, serif"
          }}>
            KEEPER
          </h2>
          <div style={{
            width: '60px',
            height: '3px',
            background: `linear-gradient(90deg, ${theme.gm.primary}, ${theme.player.primary})`,
            margin: '16px auto 0'
          }} />
        </div>

        {/* Auth Card */}
        <div 
          style={{
            background: theme.bg.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            position: 'relative',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Login Form */}
          {mode === 'login' && (
            <>
              <h3 style={{
                fontSize: '22px',
                fontWeight: '600',
                color: theme.text.primary,
                textAlign: 'center',
                marginBottom: '8px',
                fontFamily: "'Cinzel', Georgia, serif"
              }}>
                Welcome Back
              </h3>
              <p style={{ color: theme.text.muted, textAlign: 'center', marginBottom: '24px', fontSize: '15px' }}>
                Sign in to continue your adventure
              </p>

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: theme.text.secondary, fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                    <Mail size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    data-testid="login-email"
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <label style={{ color: theme.text.secondary, fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                    <Lock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    data-testid="login-password"
                    style={inputStyle}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.gm.primary,
                    fontSize: '13px',
                    cursor: 'pointer',
                    marginBottom: '20px',
                    display: 'block'
                  }}
                >
                  Forgot password?
                </button>

                <Button
                  type="submit"
                  disabled={loading}
                  data-testid="login-btn"
                  style={{ 
                    width: '100%', 
                    marginBottom: '12px',
                    background: `linear-gradient(135deg, ${theme.gm.primary}, ${theme.gm.secondary})`,
                    border: 'none',
                    color: '#0B0F19',
                    padding: '14px',
                    fontWeight: '500',
                    borderRadius: '8px',
                    boxShadow: `0 4px 15px ${theme.gm.glow}`
                  }}
                >
                  {loading ? 'Signing in...' : 'LOG IN'}
                </Button>

                <Button
                  type="button"
                  onClick={() => setMode('register')}
                  style={{ 
                    width: '100%',
                    background: theme.bg.surfaceHover,
                    border: `1px solid ${theme.border}`,
                    color: theme.text.secondary,
                    padding: '14px',
                    borderRadius: '8px'
                  }}
                >
                  CREATE ACCOUNT
                </Button>
              </form>
            </>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '400',
                color: theme.text.primary,
                textAlign: 'center',
                marginBottom: '8px'
              }}>
                Create Account
              </h3>
              <p style={{ color: theme.text.muted, textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
                Start your GM journey today
              </p>

              <form onSubmit={handleRegister}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: theme.text.muted, fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    <Mail size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    data-testid="register-email"
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: theme.text.muted, fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    <User size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Display Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Choose a display name"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    data-testid="register-username"
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: theme.text.muted, fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    <Lock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Create a password (min. 6 characters)"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    data-testid="register-password"
                    style={inputStyle}
                  />
                </div>

                {referralFromUrl && (
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    padding: '10px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Gift size={16} color="#22c55e" />
                    <span style={{ color: '#22c55e', fontSize: '13px' }}>
                      Referral code applied: {referralFromUrl}
                    </span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  data-testid="register-btn"
                  style={{ 
                    width: '100%', 
                    marginBottom: '12px',
                    background: theme.gm.primary,
                    border: 'none',
                    color: theme.text.primary,
                    padding: '12px',
                    fontWeight: '400'
                  }}
                >
                  {loading ? 'Creating account...' : 'CREATE ACCOUNT'}
                </Button>

                <Button
                  type="button"
                  onClick={() => setMode('login')}
                  style={{ 
                    width: '100%',
                    background: 'transparent',
                    border: `1px solid ${theme.border}`,
                    color: theme.text.secondary,
                    padding: '12px'
                  }}
                >
                  <ArrowLeft size={16} style={{ marginRight: '8px' }} />
                  Back to Login
                </Button>
              </form>
            </>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgot' && (
            <>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '400',
                color: theme.text.primary,
                textAlign: 'center',
                marginBottom: '8px'
              }}>
                Forgot Password?
              </h3>
              <p style={{ color: theme.text.muted, textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
                Enter your email and we'll send you a reset link
              </p>

              <form onSubmit={handleForgotPassword}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ color: theme.text.muted, fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    <Mail size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    data-testid="forgot-email"
                    style={inputStyle}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  data-testid="forgot-btn"
                  style={{ 
                    width: '100%', 
                    marginBottom: '12px',
                    background: theme.gm.primary,
                    border: 'none',
                    color: theme.text.primary,
                    padding: '12px',
                    fontWeight: '400'
                  }}
                >
                  {loading ? 'Sending...' : 'SEND RESET LINK'}
                </Button>

                <Button
                  type="button"
                  onClick={() => setMode('login')}
                  style={{ 
                    width: '100%',
                    background: 'transparent',
                    border: `1px solid ${theme.border}`,
                    color: theme.text.secondary,
                    padding: '12px'
                  }}
                >
                  <ArrowLeft size={16} style={{ marginRight: '8px' }} />
                  Back to Login
                </Button>
              </form>
            </>
          )}

          {/* Reset Password Form */}
          {mode === 'reset' && (
            <>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '400',
                color: theme.text.primary,
                textAlign: 'center',
                marginBottom: '8px'
              }}>
                Reset Password
              </h3>
              <p style={{ color: theme.text.muted, textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
                Enter your new password
              </p>

              <form onSubmit={handleResetPassword}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: theme.text.muted, fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    <Lock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    New Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    value={resetData.new_password}
                    onChange={(e) => setResetData({ ...resetData, new_password: e.target.value })}
                    data-testid="reset-password"
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ color: theme.text.muted, fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    <Lock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={resetData.confirm_password}
                    onChange={(e) => setResetData({ ...resetData, confirm_password: e.target.value })}
                    data-testid="reset-confirm"
                    style={inputStyle}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  data-testid="reset-btn"
                  style={{ 
                    width: '100%', 
                    marginBottom: '12px',
                    background: theme.gm.primary,
                    border: 'none',
                    color: theme.text.primary,
                    padding: '12px',
                    fontWeight: '400'
                  }}
                >
                  {loading ? 'Resetting...' : 'RESET PASSWORD'}
                </Button>

                <Button
                  type="button"
                  onClick={() => setMode('login')}
                  style={{ 
                    width: '100%',
                    background: 'transparent',
                    border: `1px solid ${theme.border}`,
                    color: theme.text.secondary,
                    padding: '12px'
                  }}
                >
                  <ArrowLeft size={16} style={{ marginRight: '8px' }} />
                  Back to Login
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p style={{ color: theme.text.muted, fontSize: '12px', textAlign: 'center' }}>
          A product of Rookie Quest
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
