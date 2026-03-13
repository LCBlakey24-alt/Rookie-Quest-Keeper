import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowLeft, Sparkles } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AuthPage({ onLogin }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const initialToken = searchParams.get('token');
  const initialMode = initialToken ? 'reset' : 'login';
  
  const [mode, setMode] = useState(initialMode);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', username: '', password: '', referral_code: '' });
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
      const response = await axios.post(`${API}/auth/login`, loginData);
      toast.success('Welcome back!');
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
      toast.error('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, registerData);
      toast.success('Account created! Welcome to ROOK!');
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
      toast.success('Password reset email sent!');
      setMode('login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send reset email');
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
      await axios.post(`${API}/auth/reset-password`, resetData);
      toast.success('Password reset successful!');
      setMode('login');
      navigate('/auth');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px 14px 48px',
    background: 'rgba(15, 10, 30, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '12px',
    color: '#F8FAFC',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.3s ease'
  };

  const inputWrapperStyle = {
    position: 'relative',
    marginBottom: '16px'
  };

  const iconStyle = {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#8B5CF6'
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Fantasy Sunset Background */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url('https://static.prod-images.emergentagent.com/jobs/b9fc55bd-0a80-4d15-9934-a7087e3445c8/images/9be68b2095230a13a9d52ed25ea5ba93da54c6f47b915d5cd89f4c7b8992a6d3.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(4px)',
          transform: 'scale(1.1)',
          zIndex: 0
        }}
      />
      
      {/* Overlay */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, rgba(15, 10, 30, 0.5) 0%, rgba(15, 10, 30, 0.7) 100%)',
          zIndex: 1
        }}
      />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px'
      }}>
        {/* Logo */}
        <div 
          onClick={() => navigate('/')}
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '32px',
            fontWeight: '700',
            marginBottom: '40px',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          ROOK
        </div>

        {/* Glass Panel */}
        <div style={{
          width: '100%',
          maxWidth: '420px',
          background: 'rgba(15, 10, 30, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 60px rgba(139, 92, 246, 0.15)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '1.75rem',
              color: '#F8FAFC',
              marginBottom: '8px'
            }}>
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Begin Your Quest'}
              {mode === 'forgot' && 'Reset Password'}
              {mode === 'reset' && 'New Password'}
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '14px' }}>
              {mode === 'login' && 'Sign in to continue your adventure'}
              {mode === 'register' && 'Create your account to get started'}
              {mode === 'forgot' && "Enter your email to receive a reset link"}
              {mode === 'reset' && 'Choose a new password for your account'}
            </p>
          </div>

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <div style={inputWrapperStyle}>
                <Mail size={18} style={iconStyle} />
                <input
                  type="email"
                  placeholder="Email address"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  data-testid="login-email"
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(236, 72, 153, 0.6)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)'}
                />
              </div>
              
              <div style={inputWrapperStyle}>
                <Lock size={18} style={iconStyle} />
                <input
                  type="password"
                  placeholder="Password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  data-testid="login-password"
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(236, 72, 153, 0.6)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)'}
                />
              </div>

              <button
                type="button"
                onClick={() => setMode('forgot')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8B5CF6',
                  fontSize: '13px',
                  cursor: 'pointer',
                  marginBottom: '24px',
                  padding: 0
                }}
              >
                Forgot password?
              </button>

              <button
                type="submit"
                disabled={loading}
                data-testid="login-btn"
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 20px rgba(236, 72, 153, 0.3)'
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <div style={{
                textAlign: 'center',
                marginTop: '24px',
                color: '#94A3B8',
                fontSize: '14px'
              }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#EC4899',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Sign up
                </button>
              </div>
            </form>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister}>
              <div style={inputWrapperStyle}>
                <User size={18} style={iconStyle} />
                <input
                  type="text"
                  placeholder="Username"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(236, 72, 153, 0.6)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)'}
                />
              </div>
              
              <div style={inputWrapperStyle}>
                <Mail size={18} style={iconStyle} />
                <input
                  type="email"
                  placeholder="Email address"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(236, 72, 153, 0.6)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)'}
                />
              </div>
              
              <div style={inputWrapperStyle}>
                <Lock size={18} style={iconStyle} />
                <input
                  type="password"
                  placeholder="Password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(236, 72, 153, 0.6)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)'}
                />
              </div>

              <div style={inputWrapperStyle}>
                <Sparkles size={18} style={iconStyle} />
                <input
                  type="text"
                  placeholder="Referral code (optional)"
                  value={registerData.referral_code}
                  onChange={(e) => setRegisterData({ ...registerData, referral_code: e.target.value })}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(236, 72, 153, 0.6)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)'}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #F59E0B 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 20px rgba(236, 72, 153, 0.3)'
                }}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>

              <div style={{
                textAlign: 'center',
                marginTop: '24px',
                color: '#94A3B8',
                fontSize: '14px'
              }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#EC4899',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Sign in
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword}>
              <div style={inputWrapperStyle}>
                <Mail size={18} style={iconStyle} />
                <input
                  type="email"
                  placeholder="Email address"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(236, 72, 153, 0.6)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)'}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  marginBottom: '16px'
                }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'transparent',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '12px',
                  color: '#94A3B8',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={16} /> Back to login
              </button>
            </form>
          )}

          {/* Reset Password Form */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword}>
              <div style={inputWrapperStyle}>
                <Lock size={18} style={iconStyle} />
                <input
                  type="password"
                  placeholder="New password"
                  value={resetData.new_password}
                  onChange={(e) => setResetData({ ...resetData, new_password: e.target.value })}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(236, 72, 153, 0.6)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)'}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p style={{
          marginTop: '32px',
          color: '#64748B',
          fontSize: '13px'
        }}>
          © 2026 Rookie Quest Keeper
        </p>
      </div>
    </div>
  );
}
