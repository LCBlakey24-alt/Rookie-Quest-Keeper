import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import AuthPage from '@/components/AuthPage';
import CampaignList from '@/components/CampaignList';
import CampaignDashboard from '@/components/CampaignDashboard';
import DMScreen from '@/components/GMScreen';
import CombatPage from '@/components/CombatPage';
import PricingPage from '@/components/PricingPage';
import AdminPage from '@/components/AdminPage';
import FloatingDiceRoller from '@/components/FloatingDiceRoller';
import LandingPage from '@/components/LandingPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Setup axios interceptor for auth
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('dm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('dm_token');
    const savedUsername = localStorage.getItem('dm_username');
    
    if (token && savedUsername) {
      try {
        await axios.get(`${API}/auth/me`);
        setIsAuthenticated(true);
        setUsername(savedUsername);
      } catch (error) {
        localStorage.removeItem('dm_token');
        localStorage.removeItem('dm_username');
      }
    }
    setLoading(false);
  };

  const handleLogin = (token, username) => {
    localStorage.setItem('dm_token', token);
    localStorage.setItem('dm_username', username);
    setIsAuthenticated(true);
    setUsername(username);
  };

  const handleLogout = () => {
    localStorage.removeItem('dm_token');
    localStorage.removeItem('dm_username');
    setIsAuthenticated(false);
    setUsername('');
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route 
            path="/auth" 
            element={
              isAuthenticated ? 
                <Navigate to="/campaigns" replace /> : 
                <AuthPage onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/campaigns" 
            element={
              isAuthenticated ? 
                <CampaignList username={username} onLogout={handleLogout} /> : 
                <Navigate to="/auth" replace />
            } 
          />
          <Route 
            path="/campaign/:campaignId" 
            element={
              isAuthenticated ? 
                <CampaignDashboard username={username} onLogout={handleLogout} /> : 
                <Navigate to="/auth" replace />
            } 
          />
          <Route 
            path="/dm-screen/:campaignId" 
            element={
              isAuthenticated ? 
                <DMScreen username={username} /> : 
                <Navigate to="/auth" replace />
            } 
          />
          <Route 
            path="/campaign/:campaignId/combat" 
            element={
              isAuthenticated ? 
                <CombatPage /> : 
                <Navigate to="/auth" replace />
            } 
          />
          <Route 
            path="/pricing" 
            element={
              isAuthenticated ? 
                <PricingPage username={username} onLogout={handleLogout} /> : 
                <Navigate to="/auth" replace />
            } 
          />
          <Route 
            path="/subscription/success" 
            element={<Navigate to="/pricing" replace />} 
          />
          <Route 
            path="/subscription/cancel" 
            element={<Navigate to="/pricing" replace />} 
          />
          <Route 
            path="/admin" 
            element={
              isAuthenticated ? 
                <AdminPage username={username} /> : 
                <Navigate to="/auth" replace />
            } 
          />
          <Route 
            path="/" 
            element={
              isAuthenticated ? 
                <Navigate to="/campaigns" replace /> : 
                <LandingPage />
            } 
          />
        </Routes>
        {/* Floating Dice Roller - Available on all pages when logged in */}
        {isAuthenticated && <FloatingDiceRoller />}
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;