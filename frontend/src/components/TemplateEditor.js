import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { Copy, Eye, EyeOff, Trash2, RefreshCw } from 'lucide-react';

/**
 * Admin-only template editor.
 * Lists ALL templates (including inactive), lets admin toggle `active`,
 * clone to a homebrew copy, or delete non-core templates.
 */
export default function TemplateEditor() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all | 2014 | 2024 | inactive

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/character-templates');
      setTemplates(res.data.templates || []);
    } catch (err) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = async (id, payload) => {
    try {
      const res = await apiClient.patch(`/admin/character-templates/${id}`, payload);
      setTemplates(ts => ts.map(t => t.id === id ? res.data : t));
      toast.success('Template updated');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    }
  };

  const clone = async (id) => {
    try {
      const res = await apiClient.post(`/admin/character-templates/${id}/clone`, {});
      setTemplates(ts => [...ts, res.data]);
      toast.success(`Cloned as "${res.data.name}"`);
    } catch (err) {
      toast.error('Clone failed');
    }
  };

  const del = async (id, name, source) => {
    if (source === 'core') {
      toast.error('Cannot delete core templates — toggle active instead');
      return;
    }
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/admin/character-templates/${id}`);
      setTemplates(ts => ts.filter(t => t.id !== id));
      toast.success('Deleted');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const filtered = templates.filter(t => {
    if (filter === '2014') return t.ruleset_id === 'dnd5e_2014' && t.active !== false;
    if (filter === '2024') return t.ruleset_id === 'dnd5e_2024' && t.active !== false;
    if (filter === 'inactive') return t.active === false;
    return true;
  });

  return (
    <div data-testid="admin-template-editor">
      {/* Filter + refresh */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {['all', '2014', '2024', 'inactive'].map(f => (
          <button
            key={f}
            data-testid={`template-filter-${f}`}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              background: filter === f ? 'rgba(212, 160, 23, 0.20)' : 'transparent',
              border: `1px solid ${filter === f ? '#D4A017' : 'rgba(212, 160, 23, 0.30)'}`,
              color: filter === f ? '#D4A017' : '#94A3B8',
              cursor: 'pointer', letterSpacing: 0.5, textTransform: 'uppercase',
            }}
          >
            {f === 'all' ? `All (${templates.length})` : f}
          </button>
        ))}
        <button onClick={load} disabled={loading}
          data-testid="template-refresh-btn"
          style={{
            marginLeft: 'auto', padding: '6px 12px', borderRadius: 6, fontSize: 11,
            background: 'transparent', border: '1px solid rgba(212, 160, 23, 0.30)',
            color: '#D4A017', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: '#0F2440',
        border: '1px solid rgba(212, 160, 23, 0.35)',
        borderRadius: 8, overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr 1fr 0.6fr 0.6fr 0.8fr 2fr',
          gap: 12, padding: '12px 16px',
          background: 'rgba(212, 160, 23, 0.08)',
          borderBottom: '1px solid rgba(212, 160, 23, 0.20)',
          fontSize: 10, fontWeight: 800, color: '#D4A017', letterSpacing: 1, textTransform: 'uppercase',
        }}>
          <div>Name</div>
          <div>Class / Race</div>
          <div>Source</div>
          <div>Ver.</div>
          <div>Active</div>
          <div>Edition</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: 12 }}>
            {loading ? 'Loading…' : 'No templates match this filter.'}
          </div>
        ) : filtered.map(t => (
          <div key={t.id} data-testid={`template-row-${t.id}`} style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 1fr 1fr 0.6fr 0.6fr 0.8fr 2fr',
            gap: 12, padding: '10px 16px', alignItems: 'center',
            borderBottom: '1px solid rgba(212, 160, 23, 0.10)',
            opacity: t.active === false ? 0.55 : 1,
          }}>
            <div>
              <div style={{ fontSize: 13, color: '#F8FAFC', fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace' }}>{t.id}</div>
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>{t.character_class} · {t.race}</div>
            <div>
              <span style={{
                fontSize: 9, padding: '2px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: 0.5,
                background: t.source === 'core' ? 'rgba(212, 160, 23, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                color: t.source === 'core' ? '#D4A017' : '#3B82F6',
                border: `1px solid ${t.source === 'core' ? 'rgba(212, 160, 23, 0.30)' : 'rgba(59, 130, 246, 0.30)'}`,
                textTransform: 'uppercase',
              }}>
                {t.source || 'core'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>v{t.version || 1}</div>
            <button
              data-testid={`toggle-active-${t.id}`}
              onClick={() => patch(t.id, { active: t.active === false })}
              title={t.active === false ? 'Inactive — click to show' : 'Active — click to hide'}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: t.active === false ? '#64748B' : '#10B981',
                display: 'flex', alignItems: 'center',
              }}>
              {t.active === false ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>
              {(t.ruleset_id || '').replace('dnd5e_', '')}
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button
                data-testid={`clone-${t.id}`}
                onClick={() => clone(t.id)}
                title="Clone as homebrew"
                style={{
                  padding: '4px 10px', fontSize: 10, borderRadius: 4,
                  background: 'rgba(212, 160, 23, 0.10)',
                  border: '1px solid rgba(212, 160, 23, 0.30)',
                  color: '#D4A017', cursor: 'pointer', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                <Copy size={10} /> CLONE
              </button>
              <button
                data-testid={`delete-${t.id}`}
                onClick={() => del(t.id, t.name, t.source)}
                disabled={t.source === 'core'}
                title={t.source === 'core' ? 'Cannot delete core templates' : 'Delete'}
                style={{
                  padding: '4px 10px', fontSize: 10, borderRadius: 4,
                  background: 'transparent',
                  border: `1px solid ${t.source === 'core' ? 'rgba(100, 116, 139, 0.30)' : 'rgba(239, 68, 68, 0.35)'}`,
                  color: t.source === 'core' ? '#64748B' : '#EF4444',
                  cursor: t.source === 'core' ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                <Trash2 size={10} /> DEL
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
