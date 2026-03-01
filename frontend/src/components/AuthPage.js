import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginData.username || !loginData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, loginData);
      toast.success('Welcome back, Dungeon Master!');
      onLogin(response.data.token, response.data.username);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerData.username || !registerData.password) {
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
      toast.success('Account created! Welcome, Dungeon Master!');
      onLogin(response.data.token, response.data.username);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(180deg, #030014 0%, #0a0a2e 50%, #030014 100%)',
    }}>
      {/* Left Side - Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px'
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Form Panel */}
          <div className="glow-panel" style={{ padding: '40px 32px' }}>
            {isLogin ? (
              /* Login Form */
              <form onSubmit={handleLogin} data-testid="login-form">
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '10px', 
                    color: '#ffffff', 
                    fontSize: '15px', 
                    fontWeight: '700',
                    fontFamily: 'Montserrat, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    Username
                  </label>
                  <Input
                    data-testid="login-username-input"
                    type="text"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    placeholder="Enter your username"
                    className="input-glow"
                    disabled={loading}
                    style={{
                      background: 'rgba(10, 10, 40, 0.8)',
                      border: '2px solid #1e40af',
                      borderRadius: '12px',
                      color: '#ffffff',
                      padding: '14px 18px',
                      fontSize: '15px'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '10px', 
                    color: '#ffffff', 
                    fontSize: '15px', 
                    fontWeight: '700',
                    fontFamily: 'Montserrat, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    Password
                  </label>
                  <Input
                    data-testid="login-password-input"
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    placeholder="Enter your password"
                    className="input-glow"
                    disabled={loading}
                    style={{
                      background: 'rgba(10, 10, 40, 0.8)',
                      border: '2px solid #1e40af',
                      borderRadius: '12px',
                      color: '#ffffff',
                      padding: '14px 18px',
                      fontSize: '15px'
                    }}
                  />
                </div>
                <Button 
                  data-testid="login-submit-btn"
                  type="submit" 
                  className="btn-primary" 
                  style={{ 
                    width: '100%', 
                    marginBottom: '16px',
                    padding: '16px 32px',
                    fontSize: '16px'
                  }}
                  disabled={loading}
                >
                  {loading ? 'Entering...' : 'Log In'}
                </Button>
                <Button 
                  data-testid="switch-to-register-btn"
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className="btn-secondary" 
                  style={{ 
                    width: '100%',
                    padding: '16px 32px',
                    fontSize: '16px'
                  }}
                  disabled={loading}
                >
                  Create Account
                </Button>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={handleRegister} data-testid="register-form">
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '10px', 
                    color: '#ffffff', 
                    fontSize: '15px', 
                    fontWeight: '700',
                    fontFamily: 'Montserrat, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    Username
                  </label>
                  <Input
                    data-testid="register-username-input"
                    type="text"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    placeholder="Choose a username"
                    className="input-glow"
                    disabled={loading}
                    style={{
                      background: 'rgba(10, 10, 40, 0.8)',
                      border: '2px solid #1e40af',
                      borderRadius: '12px',
                      color: '#ffffff',
                      padding: '14px 18px',
                      fontSize: '15px'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '10px', 
                    color: '#ffffff', 
                    fontSize: '15px', 
                    fontWeight: '700',
                    fontFamily: 'Montserrat, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    Password
                  </label>
                  <Input
                    data-testid="register-password-input"
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    placeholder="Create a password (min 6 characters)"
                    className="input-glow"
                    disabled={loading}
                    style={{
                      background: 'rgba(10, 10, 40, 0.8)',
                      border: '2px solid #1e40af',
                      borderRadius: '12px',
                      color: '#ffffff',
                      padding: '14px 18px',
                      fontSize: '15px'
                    }}
                  />
                </div>
                <Button 
                  data-testid="register-submit-btn"
                  type="submit" 
                  className="btn-primary" 
                  style={{ 
                    width: '100%', 
                    marginBottom: '16px',
                    padding: '16px 32px',
                    fontSize: '16px'
                  }}
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
                <Button 
                  data-testid="switch-to-login-btn"
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className="btn-secondary" 
                  style={{ 
                    width: '100%',
                    padding: '16px 32px',
                    fontSize: '16px'
                  }}
                  disabled={loading}
                >
                  Back to Login
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        background: 'transparent'
      }}>
        {/* Rookie Quest Logo - Made bigger */}
        <img 
          src="/rookie-quest-logo.png" 
          alt="Rookie Quest" 
          style={{ 
            maxWidth: '500px', 
            width: '100%',
            marginBottom: '32px',
            filter: 'drop-shadow(0 0 40px rgba(255, 255, 255, 0.4))'
          }} 
        />
        
        {/* TTRPG Companion Logo - Made bigger */}
        <img 
          src="/ttrpg-companion-logo.png" 
          alt="TTRPG Companion" 
          style={{ 
            maxWidth: '450px', 
            width: '100%',
            filter: 'drop-shadow(0 0 25px rgba(74, 125, 255, 0.5))'
          }} 
        />
      </div>

      {/* Mobile Layout - Show logos above form */}
      <style>{`
        @media (max-width: 900px) {
          .auth-container > div:first-child {
            order: 2;
          }
          .auth-container > div:last-child {
            order: 1;
            padding: 40px 20px 20px;
          }
        }
      `}</style>
    </div>
  );
}

export default AuthPage;
