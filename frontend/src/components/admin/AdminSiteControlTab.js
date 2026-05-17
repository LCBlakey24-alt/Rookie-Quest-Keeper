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

  if (loading) return <div style={{ color: '#94A3B8' }}>Loading site controls...</div>;

  return (
    <div style={{ background: '#14304F', border: '1px solid rgba(212, 160, 23, 0.35)', padding: 24 }}>
      <h2 style={{ color: '#D4A017', marginTop: 0 }}>Site Control</h2>
      <p style={{ color: '#94A3B8' }}>Global admin controls and health overview.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(120px, 1fr))', gap: 8, marginBottom: 16 }}>
        <Metric label="Users" value={overview.users_count || 0} />
        <Metric label="Campaigns" value={overview.campaigns_count || 0} />
        <Metric label="Characters" value={overview.characters_count || 0} />
        <Metric label="Reviews" value={overview.reviews_count || 0} />
        <Metric label="Approved" value={overview.approved_reviews_count || 0} />
      </div>

      <label style={{ display: 'block', color: '#F8FAFC', marginBottom: 10 }}>
        <input type="checkbox" checked={!!settings.announcement_enabled} onChange={e => setSettings(s => ({ ...s, announcement_enabled: e.target.checked }))} /> Enable announcement banner
      </label>
      <textarea
        value={settings.announcement_text || ''}
        onChange={e => setSettings(s => ({ ...s, announcement_text: e.target.value }))}
        maxLength={240}
        placeholder="Announcement text (max 240 chars)"
        style={{ width: '100%', minHeight: 90, marginBottom: 12, background: '#0A1628', color: '#F8FAFC', border: '1px solid rgba(212, 160, 23, 0.35)', padding: 10 }}
      />
      <label style={{ display: 'block', color: '#F8FAFC', marginBottom: 16 }}>
        <input type="checkbox" checked={!!settings.maintenance_mode} onChange={e => setSettings(s => ({ ...s, maintenance_mode: e.target.checked }))} /> Maintenance mode
      </label>

      <button type="button" onClick={save} disabled={saving} style={{ padding: '10px 16px', background: '#D4A017', color: '#0B0F19', border: 'none', fontWeight: 800 }}>
        {saving ? 'Saving...' : 'Save Site Settings'}
      </button>
    </div>
  );
}

function Metric({ label, value }) {
  return <div style={{ background: '#0A1628', border: '1px solid rgba(212, 160, 23, 0.2)', padding: 10, textAlign: 'center', color: '#F8FAFC' }}><div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div><div style={{ fontSize: 11, color: '#94A3B8' }}>{label}</div></div>;
}
