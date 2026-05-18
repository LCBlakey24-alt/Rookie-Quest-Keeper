import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

export default function AdminSiteControlTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    announcement_enabled: false,
    announcement_text: '',
    maintenance_mode: false,
  });
  const [overview, setOverview] = useState({
    users_count: 0,
    campaigns_count: 0,
    characters_count: 0,
    reviews_count: 0,
    approved_reviews_count: 0,
  });

  const load = async () => {
    try {
      setLoading(true);
      const [settingsRes, overviewRes] = await Promise.all([
        apiClient.get('/admin/site-settings'),
        apiClient.get('/admin/overview'),
      ]);
      setSettings(prev => ({ ...prev, ...(settingsRes.data || {}) }));
      setOverview(prev => ({ ...prev, ...(overviewRes.data || {}) }));
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load site controls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      setSaving(true);
      await apiClient.put('/admin/site-settings', {
        announcement_enabled: settings.announcement_enabled,
        announcement_text: settings.announcement_text,
        maintenance_mode: settings.maintenance_mode,
      });
      toast.success('Site settings updated');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to save site settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ color: '#9CA3AF' }}>Loading site controls...</div>;

  return (
    <div style={{ background: '#27272B', border: '1px solid rgba(239, 68, 68, 0.35)', padding: 'clamp(12px, 3.5vw, 24px)' }}>
      <h2 style={{ color: '#EF4444', marginTop: 0 }}>Site Control</h2>
      <p style={{ color: '#9CA3AF' }}>Global admin controls and health overview.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 16 }}>
        <Metric label="Users" value={overview.users_count || 0} />
        <Metric label="Campaigns" value={overview.campaigns_count || 0} />
        <Metric label="Characters" value={overview.characters_count || 0} />
        <Metric label="Reviews" value={overview.reviews_count || 0} />
        <Metric label="Approved" value={overview.approved_reviews_count || 0} />
      </div>

      <label style={{ display: 'block', color: '#FFFFFF', marginBottom: 10 }}>
        <input type="checkbox" checked={!!settings.announcement_enabled} onChange={e => setSettings(s => ({ ...s, announcement_enabled: e.target.checked }))} /> Enable announcement banner
      </label>
      <textarea
        value={settings.announcement_text || ''}
        onChange={e => setSettings(s => ({ ...s, announcement_text: e.target.value }))}
        maxLength={240}
        placeholder="Announcement text (max 240 chars)"
        style={{ width: '100%', minHeight: 90, marginBottom: 12, background: '#1F1F23', color: '#FFFFFF', border: '1px solid rgba(239, 68, 68, 0.35)', padding: 10 }}
      />
      <label style={{ display: 'block', color: '#FFFFFF', marginBottom: 16 }}>
        <input type="checkbox" checked={!!settings.maintenance_mode} onChange={e => setSettings(s => ({ ...s, maintenance_mode: e.target.checked }))} /> Maintenance mode
      </label>

      <button type="button" onClick={save} disabled={saving} style={{ padding: '10px 16px', background: '#EF4444', color: '#FFFFFF', border: 'none', fontWeight: 800 }}>
        {saving ? 'Saving...' : 'Save Site Settings'}
      </button>
    </div>
  );
}

function Metric({ label, value }) {
  return <div style={{ background: '#1F1F23', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 10, textAlign: 'center', color: '#FFFFFF' }}><div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div><div style={{ fontSize: 11, color: '#9CA3AF' }}>{label}</div></div>;
}
