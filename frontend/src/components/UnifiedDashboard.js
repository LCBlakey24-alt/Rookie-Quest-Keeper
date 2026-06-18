import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Home, LogOut, RefreshCw, Settings, Shield } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import LatestUpdatesPanel from '@/components/LatestUpdatesPanel';
import { DesktopDashboard, HeaderButton, MobileDashboardTabs } from '@/components/dashboard/DashboardActionCards';
import { CLASS_OPTIONS, GENRE_OPTIONS, defaultCampaignForm, defaultSiteSettings, theme } from '@/components/dashboard/dashboardConfig';
import {
  classGridStyle,
  classPillStyle,
  compactFormGridStyle,
  eyebrowStyle,
  fieldLabelStyle,
  fieldStyle,
  headerActionsStyle,
  headerStyle,
  loadingPanelStyle,
  modalActionsStyle,
  modalBackdropStyle,
  modalStyle,
  modalTitleStyle,
  noticeStyle,
  pageStyle,
  subtitleStyle,
  titleStyle,
  toggleCardStyle,
  toggleGridStyle,
} from '@/components/dashboard/dashboardStyles';

function getSmallScreen() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 900px)').matches;
}

export default function UnifiedDashboard({ username, onLogout }) {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [siteSettings, setSiteSettings] = useState(defaultSiteSettings);
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState(defaultCampaignForm);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [smallScreen, setSmallScreen] = useState(getSmallScreen);
  const [mobileTab, setMobileTab] = useState('player');

  useEffect(() => { loadDashboard(); }, []);

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

  const loadDashboard = async () => {
    try {
      setRefreshing(true);
      const [charsRes, campsRes, adminRes, settingsRes] = await Promise.all([
        apiClient.get('/characters').catch(() => ({ data: [] })),
        apiClient.get('/campaigns').catch(() => ({ data: [] })),
        apiClient.get('/admin/check').catch(() => ({ data: { is_admin: false } })),
        apiClient.get('/site-settings').catch(() => ({ data: {} })),
      ]);
      setCharacters(Array.isArray(charsRes.data) ? charsRes.data : []);
      setCampaigns(Array.isArray(campsRes.data) ? campsRes.data : []);
      setIsAdmin(!!adminRes.data?.is_admin);
      setSiteSettings(prev => ({ ...prev, ...(settingsRes.data || {}) }));
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const recentCharacters = useMemo(() => [...characters]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 4), [characters]);

  const recentCampaigns = useMemo(() => [...campaigns]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 4), [campaigns]);

  const createCharacter = () => {
    if (siteSettings.character_creation_enabled === false) return toast.error('Character creation is currently disabled');
    navigate('/characters/new');
  };

  const openCampaignCreate = () => {
    if (siteSettings.campaign_creation_enabled === false) return toast.error('Campaign creation is currently disabled');
    setShowCreateCampaignModal(true);
  };

  const updateCampaignForm = (field, value) => setCampaignForm(prev => ({ ...prev, [field]: value }));

  const toggleCampaignClass = (className) => {
    setCampaignForm(prev => {
      const current = new Set(prev.available_classes || []);
      if (current.has(className)) current.delete(className);
      else current.add(className);
      return { ...prev, available_classes: Array.from(current) };
    });
  };

  const handleCreateCampaign = async (event) => {
    event.preventDefault();
    if (!campaignForm.name.trim()) return toast.error('Campaign name is required');
    try {
      setCreatingCampaign(true);
      const payload = {
        ...campaignForm,
        name: campaignForm.name.trim(),
        description: campaignForm.description.trim(),
        world_name: campaignForm.world_name.trim(),
        system: campaignForm.rules_edition === '2024' ? '5e 2024 Compatible' : '5e 2014 Compatible',
        max_character_level: campaignForm.allow_epic_levels ? Number(campaignForm.max_character_level) || 20 : 20,
      };
      const response = await apiClient.post('/campaigns', payload);
      toast.success('Campaign created');
      setShowCreateCampaignModal(false);
      setCampaignForm(defaultCampaignForm);
      navigate(`/campaign/${response.data.id}`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to create campaign');
    } finally {
      setCreatingCampaign(false);
    }
  };

  if (loading) return (
    <main style={{ ...pageStyle, display: 'grid', placeItems: 'center' }}>
      <section style={loadingPanelStyle}>
        <img src="/images/logo-mini.png" alt="ROOK loading" style={{ width: 58, height: 58, objectFit: 'contain' }} />
        <div className="loading-spinner" />
        <h1 style={{ color: theme.text, margin: '8px 0 4px', fontSize: 22 }}>Loading your command dashboard…</h1>
        <p style={{ color: theme.textSecondary, margin: 0, lineHeight: 1.5 }}>
          {slowLoad ? 'This is taking longer than expected. The app will stop waiting if the server does not respond, then you can retry from here.' : 'Checking your characters, campaigns, and account settings.'}
        </p>
      </section>
    </main>
  );

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <img src="/images/logo-mini.png" alt="ROOK" style={{ width: 42, height: 42, objectFit: 'contain', flex: '0 0 auto' }} />
          <div style={{ minWidth: 0 }}>
            <p style={eyebrowStyle}>Rookie Quest Keeper</p>
            <h1 style={titleStyle}>Command Dashboard</h1>
            <p style={subtitleStyle}>Welcome back, <strong style={{ color: theme.text }}>{username}</strong>. Choose where you want to work.</p>
          </div>
        </div>
        <div style={headerActionsStyle}>
          {isAdmin && <HeaderButton icon={Shield} label="Admin" onClick={() => navigate('/admin')} />}
          <HeaderButton icon={RefreshCw} label={refreshing ? 'Refreshing...' : 'Refresh'} onClick={loadDashboard} disabled={refreshing} />
          <HeaderButton icon={Settings} label="Account" onClick={() => navigate('/account')} />
          <HeaderButton icon={LogOut} label="Logout" onClick={onLogout} />
        </div>
      </header>

      <LatestUpdatesPanel limit={3} />

      {smallScreen ? (
        <MobileDashboardTabs
          tab={mobileTab}
          setTab={setMobileTab}
          characters={characters}
          campaigns={campaigns}
          recentCharacters={recentCharacters}
          recentCampaigns={recentCampaigns}
          siteSettings={siteSettings}
          isAdmin={isAdmin}
          navigate={navigate}
          createCharacter={createCharacter}
          openCampaignCreate={openCampaignCreate}
        />
      ) : (
        <DesktopDashboard
          characters={characters}
          campaigns={campaigns}
          recentCharacters={recentCharacters}
          recentCampaigns={recentCampaigns}
          siteSettings={siteSettings}
          isAdmin={isAdmin}
          navigate={navigate}
          createCharacter={createCharacter}
          openCampaignCreate={openCampaignCreate}
        />
      )}

      <section style={noticeStyle}>
        <Home size={17} color={theme.accentHover} />
        <div><strong style={{ color: theme.text }}>Cleaner flow:</strong>{' '}<span style={{ color: theme.textSecondary }}>Use this page as the launcher. Player work lives in Player Dashboard, GM prep lives inside each campaign, and live sessions launch from Campaign Prep.</span></div>
      </section>

      {showCreateCampaignModal && (
        <div style={modalBackdropStyle} onClick={() => setShowCreateCampaignModal(false)}>
          <form style={modalStyle} onClick={e => e.stopPropagation()} onSubmit={handleCreateCampaign}>
            <h2 style={modalTitleStyle}>Create Campaign</h2>
            <p style={subtitleStyle}>Set the table rules now so players joining with your code build characters that fit this campaign.</p>
            <div style={compactFormGridStyle}>
              <label style={fieldLabelStyle}>Campaign name<input value={campaignForm.name} onChange={e => updateCampaignForm('name', e.target.value)} autoFocus placeholder="e.g. The Ashen Crown" style={fieldStyle} /></label>
              <label style={fieldLabelStyle}>World name<input value={campaignForm.world_name} onChange={e => updateCampaignForm('world_name', e.target.value)} placeholder="e.g. Veyr" style={fieldStyle} /></label>
              <label style={fieldLabelStyle}>Genre<select value={campaignForm.world_genre} onChange={e => updateCampaignForm('world_genre', e.target.value)} style={fieldStyle}>{GENRE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label style={fieldLabelStyle}>Rules edition<select value={campaignForm.rules_edition} onChange={e => updateCampaignForm('rules_edition', e.target.value)} style={fieldStyle}><option value="2024">2024 rules</option><option value="2014">2014 rules</option></select></label>
            </div>
            <label style={fieldLabelStyle}>Description<textarea value={campaignForm.description} onChange={e => updateCampaignForm('description', e.target.value)} placeholder="Optional short campaign pitch" style={{ ...fieldStyle, minHeight: 74, resize: 'vertical' }} /></label>
            <div style={toggleGridStyle}>
              <label style={toggleCardStyle}><input type="checkbox" checked={campaignForm.allow_exploding_dice} onChange={e => updateCampaignForm('allow_exploding_dice', e.target.checked)} /><span><strong>Exploding dice</strong><small>Non-d20 max rolls roll again and add.</small></span></label>
              <label style={toggleCardStyle}><input type="checkbox" checked={campaignForm.allow_epic_levels} onChange={e => updateCampaignForm('allow_epic_levels', e.target.checked)} /><span><strong>Beyond level 20</strong><small>Allow epic multiclass progression.</small></span></label>
              <label style={{ ...fieldLabelStyle, marginTop: 0 }}>Max level<input type="number" min="1" max="60" disabled={!campaignForm.allow_epic_levels} value={campaignForm.max_character_level} onChange={e => updateCampaignForm('max_character_level', e.target.value)} style={fieldStyle} /></label>
            </div>
            <div style={fieldLabelStyle}>Allowed classes <span style={{ color: theme.textSecondary, fontWeight: 600 }}>Leave all unticked to allow every class.</span>
              <div style={classGridStyle}>{CLASS_OPTIONS.map(className => <label key={className} style={classPillStyle(campaignForm.available_classes.includes(className))}><input type="checkbox" checked={campaignForm.available_classes.includes(className)} onChange={() => toggleCampaignClass(className)} />{className}</label>)}</div>
            </div>
            <div style={modalActionsStyle}>
              <Button type="button" onClick={() => setShowCreateCampaignModal(false)} className="btn-outline">Cancel</Button>
              <Button type="submit" disabled={creatingCampaign} className="btn-primary">{creatingCampaign ? 'Creating...' : 'Create Campaign'}</Button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
