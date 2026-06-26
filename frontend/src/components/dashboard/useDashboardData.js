import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import apiClient from '@/lib/apiClient';
import { defaultSiteSettings } from './dashboardConfig';

function getSmallScreen() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 900px)').matches;
}

function safeRecords(value) {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
}

export default function useDashboardData() {
  const [characters, setCharacters] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [siteSettings, setSiteSettings] = useState(defaultSiteSettings);
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [smallScreen, setSmallScreen] = useState(getSmallScreen);
  const [mobileTab, setMobileTab] = useState('player');

  const loadDashboard = useCallback(async () => {
    try {
      setRefreshing(true);
      const [charsRes, campsRes, adminRes, settingsRes] = await Promise.all([
        apiClient.get('/characters').catch(() => ({ data: [] })),
        apiClient.get('/campaigns').catch(() => ({ data: [] })),
        apiClient.get('/admin/check').catch(() => ({ data: { is_admin: false } })),
        apiClient.get('/site-settings').catch(() => ({ data: {} })),
      ]);
      setCharacters(safeRecords(charsRes.data));
      setCampaigns(safeRecords(campsRes.data));
      setIsAdmin(!!adminRes.data?.is_admin);
      setSiteSettings(prev => ({ ...prev, ...(settingsRes.data || {}) }));
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    if (!loading) {
      setSlowLoad(false);
      return undefined;
    }
    const timeoutId = window.setTimeout(() => setSlowLoad(true), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [loading]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const onChange = () => setSmallScreen(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const recentCharacters = useMemo(() => safeRecords(characters)
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 4), [characters]);

  const recentCampaigns = useMemo(() => safeRecords(campaigns)
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 4), [campaigns]);

  return {
    characters,
    campaigns,
    siteSettings,
    loading,
    slowLoad,
    refreshing,
    isAdmin,
    smallScreen,
    mobileTab,
    setMobileTab,
    recentCharacters,
    recentCampaigns,
    loadDashboard,
  };
}
