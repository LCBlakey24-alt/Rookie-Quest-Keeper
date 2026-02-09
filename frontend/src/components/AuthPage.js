import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sword, Shield } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function AuthPage({ onLogin }) {
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
    <div className="auth-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a1628 0%, #0d1d33 100%)',
      padding: '20px'
    }}>
      <div className="auth-content" style={{ maxWidth: '450px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
            <Sword size={40} style={{ color: '#ff1f8f' }} />
            <h1 className="medieval-heading" style={{ fontSize: '42px', color: '#ffffff', margin: 0 }}>
              DM Screen
            </h1>
            <Shield size={40} style={{ color: '#ff1f8f' }} />
          </div>
          <p style={{ color: '#bae6fd', fontSize: '16px' }}>Your Ultimate Dungeon Master Tool</p>
        </div>

        <Card className="parchment-dark" style={{ border: '2px solid #ff1f8f' }}>
          <CardContent style={{ padding: '24px' }}>
            <Tabs defaultValue="login">
              <TabsList style={{ width: '100%', background: 'rgba(10,22,40,0.8)', marginBottom: '24px' }}>
                <TabsTrigger data-testid="login-tab" value="login" style={{ flex: 1 }}>Login</TabsTrigger>
                <TabsTrigger data-testid="register-tab" value="register" style={{ flex: 1 }}>Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} data-testid="login-form">
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>
                      Username
                    </label>
                    <Input
                      data-testid="login-username-input"
                      type="text"
                      value={loginData.username}
                      onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      placeholder="Enter your username"
                      className="input"
                      disabled={loading}
                    />
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>
                      Password
                    </label>
                    <Input
                      data-testid="login-password-input"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      placeholder="Enter your password"
                      className="input"
                      disabled={loading}
                    />
                  </div>
                  <Button 
                    data-testid="login-submit-btn"
                    type="submit" 
                    className="btn-primary" 
                    style={{ width: '100%' }}
                    disabled={loading}
                  >
                    {loading ? 'Entering...' : 'Enter the Realm'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} data-testid="register-form">
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>
                      Username
                    </label>
                    <Input
                      data-testid="register-username-input"
                      type="text"
                      value={registerData.username}
                      onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                      placeholder="Choose a username"
                      className="input"
                      disabled={loading}
                    />
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>
                      Password
                    </label>
                    <Input
                      data-testid="register-password-input"
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      placeholder="Create a password (min 6 characters)"
                      className="input"
                      disabled={loading}
                    />
                  </div>
                  <Button 
                    data-testid="register-submit-btn"
                    type="submit" 
                    className="btn-primary" 
                    style={{ width: '100%' }}
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Begin Your Journey'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div style={{ marginTop: '24px', textAlign: 'center', color: '#bae6fd', fontSize: '14px' }}>
          <p>Track initiatives, manage players, build worlds, and more!</p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;