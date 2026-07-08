import React, { useEffect, useMemo, useState } from 'react';
import { Archive, ClipboardList, FlaskConical, Megaphone, MessageSquare, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const rq = {
  panel: 'var(--rq-bg-panel, #242424)',
  card: 'var(--rq-bg-panel-alt, #1F1F1F)',
  input: 'var(--rq-bg-input, #1F1F1F)',
  border: 'var(--rq-accent-border, rgba(193,18,31,0.35))',
  borderDefault: 'var(--rq-border-default, #3A3A3A)',
  accent: 'var(--rq-accent-primary, #C1121F)',
  accentHover: 'var(--rq-accent-hover, #D62839)',
  accentSoft: 'var(--rq-accent-soft, rgba(193,18,31,0.12))',
  text: 'var(--rq-text-primary, #FFFFFF)',
  textSecondary: 'var(--rq-text-secondary, #D6D6D6)',
  muted: 'var(--rq-text-muted, #A0A0A0)',
  radius: 'var(--rq-radius-md, 14px)',
  radiusSm: 'var(--rq-radius-sm, 8px)',
};

function isTestingNote(item) {
  const title = String(item?.title || '').toLowerCase();
  return item?.category === 'testing' || ['testing', 'mobile-testing'].includes(item?.area) || title.includes('[test]');
}

export default function AdminMissionBrief({ onOpenTab }) {
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [audit, setAudit] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [feedbackRes, updatesRes, auditRes] = await Promise.all([
        apiClient.get('/admin/feedback', { params: { status_filter: 'new' } }).catch(() => ({ data: [] })),
        apiClient.get('/admin/site-updates', { params: { include_archived: true } }).catch(() => ({ data: [] })),
        apiClient.get('/admin/audit-log', { params: { limit: 5 } }).catch(() => ({ data: [] })),
      ]);
      setFeedback(Array.isArray(feedbackRes.data) ? feedbackRes.data : []);
      setUpdates(Array.isArray(updatesRes.data) ? updatesRes.data : []);
      setAudit(Array.isArray(auditRes.data) ? auditRes.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateCounts = useMemo(() => ({
    published: updates.filter(update => update.is_published && !update.is_archived).length,
    drafts: updates.filter(update => !update.is_published && !update.is_archived).length,
    archived: updates.filter(update => update.is_archived).length,
  }), [updates]);

  const testingNotes = feedback.filter(isTestingNote);
  const userFeedback = feedback.filter(item => !isTestingNote(item));
  const topFeedback = userFeedback.slice(0, 3);
  const topTesting = testingNotes.slice(0, 3);
  const draftUpdates = updates.filter(update => !update.is_published && !update.is_archived).slice(0, 3);
  const hasAttention = userFeedback.length > 0 || testingNotes.length > 0 || updateCounts.drafts > 0 || updateCounts.archived > 0;

  return (
    <section style={wrapStyle} aria-label="Admin mission brief" data-testid="admin-mission-brief">
      <div style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>Mission brief</p>
          <h2 style={titleStyle}><Sparkles size={20} /> What needs your attention?</h2>
          <p style={subtitleStyle}>Fresh feedback, testing notes, draft updates, archive clean-up, and recent admin actions in one quick scan.</p>
        </div>
        <button type="button" onClick={load} style={buttonStyle}><RefreshCw size={14} /> Refresh brief</button>
      </div>

      {loading ? (
        <div style={emptyStyle}>Loading mission brief...</div>
      ) : (
        <div style={gridStyle}>
          <article style={cardStyle}>
            <div style={cardHeaderStyle}>
              <span style={cardTitleStyle}><MessageSquare size={16} /> Feedback queue</span>
              <strong style={countStyle}>{userFeedback.length}</strong>
            </div>
            {topFeedback.length === 0 ? (
              <p style={quietStyle}>No new user feedback waiting. Suspiciously peaceful.</p>
            ) : (
              <div style={listStyle}>
                {topFeedback.map(item => <BriefLine key={item.id} label={item.title || 'Untitled feedback'} meta={item.username || item.area || 'New feedback'} />)}
              </div>
            )}
            <button type="button" onClick={() => onOpenTab?.('feedback')} style={miniButtonStyle}>Open feedback</button>
          </article>

          <article style={cardStyle}>
            <div style={cardHeaderStyle}>
              <span style={cardTitleStyle}><FlaskConical size={16} /> Testing queue</span>
              <strong style={countStyle}>{testingNotes.length}</strong>
            </div>
            {topTesting.length === 0 ? (
              <p style={quietStyle}>No new testing notes waiting. That is probably either excellent or cursed.</p>
            ) : (
              <div style={listStyle}>
                {topTesting.map(item => <BriefLine key={item.id} label={item.title || 'Untitled test note'} meta={item.area || item.priority || 'Testing note'} />)}
              </div>
            )}
            <button type="button" onClick={() => onOpenTab?.('testing')} style={miniButtonStyle}>Open testing</button>
          </article>

          <article style={cardStyle}>
            <div style={cardHeaderStyle}>
              <span style={cardTitleStyle}><Megaphone size={16} /> Update health</span>
              <strong style={countStyle}>{updateCounts.published}</strong>
            </div>
            <div style={pillGridStyle}>
              <MiniMetric icon={Megaphone} label="Published" value={updateCounts.published} />
              <MiniMetric icon={ClipboardList} label="Drafts" value={updateCounts.drafts} hot={updateCounts.drafts > 0} />
              <MiniMetric icon={Archive} label="Archived" value={updateCounts.archived} />
            </div>
            {draftUpdates.length > 0 ? <div style={listStyle}>{draftUpdates.map(update => <BriefLine key={update.id} label={update.title} meta="Draft update" />)}</div> : null}
            <button type="button" onClick={() => onOpenTab?.('updates')} style={miniButtonStyle}>Open updates</button>
          </article>

          <article style={cardStyle}>
            <div style={cardHeaderStyle}>
              <span style={cardTitleStyle}><ShieldCheck size={16} /> Recent activity</span>
              <strong style={countStyle}>{audit.length}</strong>
            </div>
            {audit.length === 0 ? (
              <p style={quietStyle}>No audit entries yet. Once Admin actions happen, they’ll show here.</p>
            ) : (
              <div style={listStyle}>
                {audit.map(entry => <BriefLine key={entry.id} label={entry.action || 'Admin action'} meta={formatDate(entry.created_at)} />)}
              </div>
            )}
            <button type="button" onClick={() => onOpenTab?.('audit')} style={miniButtonStyle}>Open audit log</button>
          </article>
        </div>
      )}

      {!loading && !hasAttention ? <p style={goodNewsStyle}>Everything important looks tidy right now. Dangerous. Enjoy it while it lasts.</p> : null}
    </section>
  );
}

function BriefLine({ label, meta }) {
  return (
    <div style={lineStyle}>
      <span style={lineLabelStyle}>{label}</span>
      <span style={lineMetaStyle}>{meta}</span>
    </div>
  );
}

function MiniMetric({ icon: Icon, label, value, hot = false }) {
  return (
    <div style={{ ...miniMetricStyle, borderColor: hot ? rq.accent : rq.borderDefault, background: hot ? rq.accentSoft : rq.input }}>
      <Icon size={14} color={rq.accentHover} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDate(value) {
  if (!value) return 'No date';
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

const wrapStyle = { background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius, padding: 'clamp(14px, 3vw, 20px)', display: 'grid', gap: 14 };
const headerStyle = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' };
const eyebrowStyle = { color: rq.accentHover, fontSize: 11, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' };
const titleStyle = { color: rq.text, fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 950, display: 'flex', alignItems: 'center', gap: 8, margin: 0 };
const subtitleStyle = { color: rq.muted, fontSize: 13, lineHeight: 1.5, margin: '6px 0 0' };
const buttonStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.text, padding: '9px 12px', borderRadius: rq.radiusSm, fontWeight: 900, cursor: 'pointer' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))', gap: 12 };
const cardStyle = { background: rq.card, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: 14, display: 'grid', gap: 10, alignContent: 'start' };
const cardHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 };
const cardTitleStyle = { color: rq.text, display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 950 };
const countStyle = { color: rq.text, background: rq.input, border: `1px solid ${rq.borderDefault}`, borderRadius: 999, minWidth: 34, textAlign: 'center', padding: '4px 9px' };
const listStyle = { display: 'grid', gap: 8 };
const lineStyle = { background: rq.input, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: 10, display: 'grid', gap: 3 };
const lineLabelStyle = { color: rq.textSecondary, fontSize: 13, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const lineMetaStyle = { color: rq.muted, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const quietStyle = { color: rq.muted, fontSize: 13, lineHeight: 1.45, margin: 0 };
const emptyStyle = { color: rq.muted, textAlign: 'center', padding: 24, background: rq.input, border: `1px dashed ${rq.borderDefault}`, borderRadius: rq.radiusSm };
const miniButtonStyle = { justifySelf: 'start', background: rq.accentSoft, color: rq.text, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, padding: '8px 10px', fontWeight: 900, cursor: 'pointer' };
const pillGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))', gap: 8 };
const miniMetricStyle = { color: rq.textSecondary, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: 9, display: 'grid', gap: 4, fontSize: 11, textAlign: 'center' };
const goodNewsStyle = { color: rq.muted, margin: 0, fontSize: 12, textAlign: 'center' };
