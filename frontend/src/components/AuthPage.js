import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, Mail, Lock, User, ArrowLeft } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function AuthPage({ onLogin }) {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot', 'reset'
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', username: '', password: '', referral_code: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetData, setResetData] = useState({ token: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [referralFromUrl, setReferralFromUrl] = useState(null);

  useEffect(() => {
    // Check for referral code in URL
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralFromUrl(refCode);
      setRegisterData(prev => ({ ...prev, referral_code: refCode }));
      setMode('register');
      toast.info('Referral code applied! Create an account to get started.');
    }
    
    // Check for reset token in URL
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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'linear-gradient(180deg, #030014 0%, #0a0a2e 50%, #030014 100%)'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: '1200px',
        gap: '40px'
      }}>
        {/* Rookie Quest Company Logo */}
        <img 
          src="/rookie-quest-logo.png" 
          alt="Rookie Quest" 
          style={{ 
            maxWidth: '200px', 
            width: '100%',
            filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.3))'
          }} 
        />

        {/* Rookie Quest Keeper Logo */}
        <img 
          src="/rookie-quest-keeper-logo.png" 
          alt="Rookie Quest Keeper" 
          style={{ 
            maxWidth: '450px', 
            width: '100%',
            filter: 'drop-shadow(0 0 30px rgba(20, 184, 166, 0.5))'
          }} 
        />

        {/* Auth Card */}
        <div className="glow-panel" style={{
          maxWidth: '420px',
          width: '100%',
          padding: '32px'
        }}>
          {/* Login Form */}
          {mode === 'login' && (
            <>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '800',
                color: '#ffffff',
                textAlign: 'center',
                marginBottom: '8px',
                fontFamily: 'Montserrat, sans-serif'
              }}>
                Welcome Back
              </h2>
              <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
                Sign in to continue your adventure
              </p>

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    <Mail size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    data-testid="login-email"
                  />
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    <Lock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    data-testid="login-password"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#14b8a6',
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
                  className="btn-primary"
                  data-testid="login-btn"
                  style={{ width: '100%', marginBottom: '12px' }}
                >
                  {loading ? 'Signing in...' : 'LOG IN'}
                </Button>

                <Button
                  type="button"
                  onClick={() => setMode('register')}
                  className="btn-secondary"
                  style={{ width: '100%' }}
                >
                  CREATE ACCOUNT
                </Button>
              </form>
            </>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '800',
                color: '#ffffff',
                textAlign: 'center',
                marginBottom: '8px',
                fontFamily: 'Montserrat, sans-serif'
              }}>
                Create Account
              </h2>
              <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
                Start your GM journey today
              </p>

              <form onSubmit={handleRegister}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    <Mail size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    data-testid="register-email"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    <User size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Display Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Choose a display name"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    data-testid="register-username"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    <Lock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Create a password (min. 6 characters)"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    data-testid="register-password"
                  />
                </div>

                {referralFromUrl && (
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '8px',
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
                  className="btn-primary"
                  data-testid="register-btn"
                  style={{ width: '100%', marginBottom: '12px' }}
                >
                  {loading ? 'Creating account...' : 'CREATE ACCOUNT'}
                </Button>

                <Button
                  type="button"
                  onClick={() => setMode('login')}
                  className="btn-outline"
                  style={{ width: '100%' }}
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
              <h2 style={{
                fontSize: '24px',
                fontWeight: '800',
                color: '#ffffff',
                textAlign: 'center',
                marginBottom: '8px',
                fontFamily: 'Montserrat, sans-serif'
              }}>
                Forgot Password?
              </h2>
              <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
                Enter your email and we'll send you a reset link
              </p>

              <form onSubmit={handleForgotPassword}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    <Mail size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    data-testid="forgot-email"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  data-testid="forgot-btn"
                  style={{ width: '100%', marginBottom: '12px' }}
                >
                  {loading ? 'Sending...' : 'SEND RESET LINK'}
                </Button>

                <Button
                  type="button"
                  onClick={() => setMode('login')}
                  className="btn-outline"
                  style={{ width: '100%' }}
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
              <h2 style={{
                fontSize: '24px',
                fontWeight: '800',
                color: '#ffffff',
                textAlign: 'center',
                marginBottom: '8px',
                fontFamily: 'Montserrat, sans-serif'
              }}>
                Reset Password
              </h2>
              <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
                Enter your new password
              </p>

              <form onSubmit={handleResetPassword}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    <Lock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    New Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    value={resetData.new_password}
                    onChange={(e) => setResetData({ ...resetData, new_password: e.target.value })}
                    data-testid="reset-password"
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    <Lock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={resetData.confirm_password}
                    onChange={(e) => setResetData({ ...resetData, confirm_password: e.target.value })}
                    data-testid="reset-confirm"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  data-testid="reset-btn"
                  style={{ width: '100%', marginBottom: '12px' }}
                >
                  {loading ? 'Resetting...' : 'RESET PASSWORD'}
                </Button>

                <Button
                  type="button"
                  onClick={() => setMode('login')}
                  className="btn-outline"
                  style={{ width: '100%' }}
                >
                  <ArrowLeft size={16} style={{ marginRight: '8px' }} />
                  Back to Login
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p style={{ color: '#64748b', fontSize: '12px', textAlign: 'center' }}>
          A product of Rookie Quest
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
