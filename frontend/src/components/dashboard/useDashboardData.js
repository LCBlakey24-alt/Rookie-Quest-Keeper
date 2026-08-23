import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import apiClient from '@/lib/apiClient';
import {
  describeHomeDashboardFailures,
  fetchHomeDashboardSections,
} from './homeDashboardData';

const DEFAULT_SITE_SETTINGS = {
  campaign_creation_enabled: true,
  character_creation_enabled: true,
  uploads_enabled: true,
  reviews_enabled: true,
  feedback_enabled: true,
  rook_text_enabled: true,
  beta_tools_enabled: true,
};

function safeRecords(value) {
  if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object');
  if (Array.isArray(value?.characters)) return safeRecords(value.characters);
  if (Array.isArray(value?.campaigns)) return safeRecords(value.campaigns);
  if (Array.isArray(value?.items)) return safeRecords(value.items);
  return [];
}

export default function useDashboardData() {
  const [characters, setCharacters] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [homebrewItems, setHomebrewItems] = useState([]);
  const [adminOverview, setAdminOverview] = useState({});
  const [siteSettings, setSiteSettings] = useState(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dashboardWarning, setDashboardWarning] = useState('');

  const loadDashboard = useCallback(async ({ notifyFailure = true } = {}) => {
    try {
      setRefreshing(true);
      const result = await fetchHomeDashboardSections(apiClient);

      if (result.characters !== null) setCharacters(result.characters);
      if (result.campaigns !== null) setCampaigns(result.campaigns);
      if (result.homebrewItems !== null) setHomebrewItems(result.homebrewItems);
      if (result.adminOverview !== null) setAdminOverview(result.adminOverview);
      if (typeof result.isAdmin === 'boolean') setIsAdmin(result.isAdmin);
      if (result.siteSettings !== null) {
        setSiteSettings((previous) => ({ ...previous, ...result.siteSettings }));
      }

      if (result.ok) {
        setDashboardWarning('');
      } else {
        const description = describeHomeDashboardFailures(result.failures);
        setDashboardWarning(description);
        if (notifyFailure) {
          toast.warning('Some dashboard data could not be refreshed', { description });
        }
      }

      return result;
    } catch (error) {
      const description = error?.formattedDetail
        || error?.response?.data?.detail
        || 'Could not refresh the dashboard. Showing last known data where available.';
      setDashboardWarning(description);
      if (notifyFailure) toast.error('Dashboard could not be refreshed', { description });
      return { ok: false, failures: ['dashboard'] };
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

  const recentCharacters = useMemo(() => safeRecords(characters)
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 4), [characters]);

  const recentCampaigns = useMemo(() => safeRecords(campaigns)
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 4), [campaigns]);

  const recentHomebrew = useMemo(() => safeRecords(homebrewItems)
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 4), [homebrewItems]);

  return {
    characters,
    campaigns,
    homebrewItems,
    adminOverview,
    siteSettings,
    loading,
    slowLoad,
    refreshing,
    isAdmin,
    recentCharacters,
    recentCampaigns,
    recentHomebrew,
    dashboardWarning,
    loadDashboard,
  };
}
