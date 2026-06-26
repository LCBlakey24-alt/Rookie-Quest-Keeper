import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Loader, Wand2, Check, Church, Search, X, Shield } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';

const fontStack = 'var(--rq-body-font, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const rq = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', input: '#242424',
  line: 'rgba(255,255,255,0.16)', lineStrong: 'rgba(255,255,255,0.22)',
  accent: '#d00000', text: '#ffffff', muted: 'rgba(255,255,255,0.62)', soft: 'rgba(255,255,255,0.74)'
};

const emptyForm = { name: '', domain: '', description: '', symbol: '', alignment: '', notes: '' };

function GodsTab({ campaignId }) {
  const [powers, setPowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPower, setEditingPower] = useState(null);
  const [deletingPower, setDeletingPower] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(emptyForm);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);

  useEffect(() => { fetchPowers(); }, [campaignId]);

  const fetchPowers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/campaigns/${campaignId}/gods`);
      setPowers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load powers and factions');
    } finally {
      setLoading(false);
    }
  };

  const filteredPowers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const sorted = [...powers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (!query) return sorted;
    return sorted.filter(power => [power.name, power.domain, power.description, power.symbol, power.alignment, power.notes]
      .some(value => String(value || '').toLowerCase().includes(query)));
  }, [powers, searchTerm]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingPower(null);
    setShowDialog(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    const payload = {
      name: formData.name.trim(),
      domain: formData.domain.trim(),
      description: formData.description.trim(),
      symbol: formData.symbol.trim(),
      alignment: formData.alignment.trim(),
      notes: formData.notes.trim(),
    };
    try {
      if (editingPower) {
        await apiClient.put(`/campaigns/${campaignId}/gods/${editingPower.id}`, payload);
        toast.success('Power updated');
      } else {
        await apiClient.post(`/campaigns/${campaignId}/gods`, payload);
        toast.success('Power added');
      }
      await fetchPowers();
      resetForm();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save power');
    }
  };

  const handleEdit = (power) => {
    setEditingPower(power);
    setFormData({
      name: power.name || '',
      domain: power.domain || '',
      description: power.description || '',
      symbol: power.symbol || '',
      alignment: power.alignment || '',
      notes: power.notes || '',
    });
    setShowDialog(true);
  };

  const handleDelete = async (powerId) => {
    if (deletingPower !== powerId) {
      setDeletingPower(powerId);
      setTimeout(() => setDeletingPower(null), 5000);
      return;
    }
    try {
      const power = powers.find(item => item.id === powerId);
      await apiClient.delete(`/campaigns/${campaignId}/gods/${powerId}`);
      toast.success(`${power?.name || 'Power'} removed`);
      setDeletingPower(null);
      await fetchPowers();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to delete power');
      setDeletingPower(null);
    }
  };

  const handleRookGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Describe the power or faction you want Rook to create');
      return;
    }
    setAiGenerating(true);
    setLastGenerated(null);
    try {
      const response = await apiClient.post('/rook/generate', { prompt: aiPrompt, entity_type: 'god', campaign_id: campaignId });
      if (response.data?.success) {
        toast.success(`${response.data.entity_name} added`);
        setLastGenerated(response.data);
        setAiPrompt('');
        await fetchPowers();
      }
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Rook could not create this entry');
    } finally {
      setAiGenerating(false);
    }
  };

  if (loading) {
    return <section style={pageStyle}><h2 style={titleStyle}>Powers & Factions</h2><LoadingSkeleton type="table" count={5} /></section>;
  }

  return (
    <section style={pageStyle}>
      <header style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>World Bible</p>
          <h2 style={titleStyle}>Powers & Factions</h2>
          <p style={subtitleStyle}>A generic tracker for gods, patrons, guilds, governments, noble houses, orders, movements, and other groups with influence.</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
          <DialogTrigger asChild><Button data-testid="add-god-btn" style={primaryButtonStyle}><Plus size={18} /> Add Power</Button></DialogTrigger>
          <PowerDialog editingPower={editingPower} formData={formData} setFormData={setFormData} onSubmit={handleSubmit} onCancel={resetForm} />
        </Dialog>
      </header>

      <section style={ruleStyle}>
        <p style={ruleLabelStyle}>Import rule</p>
        <p style={ruleTextStyle}>Use this for influence groups and higher powers. Specific people go in NPCs & Figures. Physical places go in Locations. Past events go in Chronicle.</p>
      </section>

      <section style={statsStyle}>
        <Stat label="Entries" value={powers.length} />
        <Stat label="Filtered" value={filteredPowers.length} />
        <Stat label="Tool" value="Generic" />
      </section>

      <div style={layoutStyle}>
        <main style={{ minWidth: 0 }}>
          <div style={searchWrapStyle}>
            <Search size={18} style={searchIconStyle} />
            <Input placeholder="Search names, influence, symbols, stance, notes..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} style={searchInputStyle} />
          </div>

          {powers.length === 0 ? (
            <EmptyState icon={Church} title="No powers or factions yet" description="Add a god, faction, organisation, house, government, patron, order, or other influence group." actionLabel="Create First Entry" onAction={() => setShowDialog(true)} color={rq.accent} />
          ) : filteredPowers.length === 0 ? (
            <section style={emptyCardStyle}><p style={mutedTextStyle}>No entries found for that search.</p><Button onClick={() => setSearchTerm('')} style={secondaryButtonStyle}>Clear search</Button></section>
          ) : (
            <div style={cardsStyle}>{filteredPowers.map(power => <PowerCard key={power.id} power={power} isNew={lastGenerated?.entity_id === power.id} deletingPower={deletingPower} onEdit={() => handleEdit(power)} onDelete={() => handleDelete(power.id)} onCancelDelete={() => setDeletingPower(null)} />)}</div>
          )}
        </main>
        <RookPanel aiPrompt={aiPrompt} setAiPrompt={setAiPrompt} aiGenerating={aiGenerating} lastGenerated={lastGenerated} onGenerate={handleRookGenerate} />
      </div>
      <style>{`@keyframes rq-power-pulse { 0% { box-shadow: 0 0 0 2px rgba(208,0,0,0.45); } 100% { box-shadow: none; } }`}</style>
    </section>
  );
}

function Stat({ label, value }) { return <div style={statStyle}><strong style={statValueStyle}>{value}</strong><span style={statLabelStyle}>{label}</span></div>; }

function PowerDialog({ editingPower, formData, setFormData, onSubmit, onCancel }) {
  return (
    <DialogContent className="modal" style={dialogStyle}>
      <DialogHeader><DialogTitle style={dialogTitleStyle}>{editingPower ? 'Edit Power' : 'Add Power'}</DialogTitle></DialogHeader>
      <form onSubmit={onSubmit} style={formStyle}>
        <div style={twoColumnStyle}>
          <TextField label="Name" testId="god-name-input" value={formData.name} onChange={(value) => setFormData({ ...formData, name: value })} required />
          <TextField label="Influence / domain" testId="god-domain-input" value={formData.domain} onChange={(value) => setFormData({ ...formData, domain: value })} placeholder="Storms, trade, secrets, city politics..." />
        </div>
        <TextAreaField label="Description" testId="god-description-input" value={formData.description} onChange={(value) => setFormData({ ...formData, description: value })} minHeight={110} placeholder="What is this power, faction, or institution?" />
        <div style={twoColumnStyle}>
          <TextField label="Symbol / emblem" testId="god-symbol-input" value={formData.symbol} onChange={(value) => setFormData({ ...formData, symbol: value })} placeholder="Mask, crown, sigil, sunburst..." />
          <TextField label="Stance / alignment" testId="god-alignment-input" value={formData.alignment} onChange={(value) => setFormData({ ...formData, alignment: value })} placeholder="Friendly, hostile, neutral, lawful good..." />
        </div>
        <TextAreaField label="GM notes" testId="god-notes-input" value={formData.notes} onChange={(value) => setFormData({ ...formData, notes: value })} placeholder="Secrets, influence, members, worship, politics, hooks." />
        <FormActions onCancel={onCancel} submitText={editingPower ? 'Update Power' : 'Add Power'} />
      </form>
    </DialogContent>
  );
}

function TextField({ label, testId, value, onChange, placeholder, required = false }) {
  return <label style={fieldStyle}><span style={labelStyle}>{label}</span><Input data-testid={testId} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} style={inputStyle} /></label>;
}

function TextAreaField({ label, testId, value, onChange, placeholder, minHeight = 90 }) {
  return <label style={fieldStyle}><span style={labelStyle}>{label}</span><textarea data-testid={testId} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={{ ...textareaStyle, minHeight }} /></label>;
}

function FormActions({ onCancel, submitText }) {
  return <div style={formActionsStyle}><Button type="button" onClick={onCancel} style={secondaryButtonStyle}>Cancel</Button><Button type="submit" style={primaryButtonStyle}>{submitText}</Button></div>;
}

function PowerCard({ power, isNew, deletingPower, onEdit, onDelete, onCancelDelete }) {
  return (
    <article data-testid={`god-card-${power.id}`} style={{ ...cardStyle, animation: isNew ? 'rq-power-pulse 1.6s ease-out' : 'none' }}>
      <header style={cardHeaderStyle}>
        <div style={iconTileStyle}><Shield size={22} /></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={cardTitleStyle}>{power.name}</h3>
          {power.domain && <p style={cardMetaStyle}>{power.domain}</p>}
        </div>
        <div style={cardActionsStyle}>
          <Button data-testid={`edit-god-btn-${power.id}`} onClick={onEdit} style={iconButtonStyle}><Edit size={14} /></Button>
          {deletingPower === power.id ? <div style={deleteConfirmStyle}><span style={deleteTextStyle}>Delete?</span><Button data-testid={`confirm-delete-god-${power.id}`} onClick={onDelete} style={dangerMiniStyle}><Check size={12} /></Button><Button onClick={onCancelDelete} style={iconButtonStyle}><X size={12} /></Button></div> : <Button data-testid={`delete-god-btn-${power.id}`} onClick={onDelete} style={dangerIconStyle}><Trash2 size={14} /></Button>}
        </div>
      </header>
      {power.description && <p style={descriptionStyle}>{power.description}</p>}
      <div style={infoGridStyle}>
        {power.symbol && <InfoBox title="Symbol / Emblem" value={power.symbol} />}
        {power.alignment && <InfoBox title="Stance / Alignment" value={power.alignment} />}
        {power.notes && <InfoBox title="GM Notes" value={power.notes} muted />}
      </div>
    </article>
  );
}

function InfoBox({ title, value, muted = false }) { return <div style={infoBoxStyle}><strong style={infoTitleStyle}>{title}</strong><p style={{ ...infoValueStyle, color: muted ? rq.muted : rq.soft }}>{value}</p></div>; }

function RookPanel({ aiPrompt, setAiPrompt, aiGenerating, lastGenerated, onGenerate }) {
  return (
    <aside style={rookPanelStyle}>
      <div style={rookHeaderStyle}><Wand2 size={20} /><div><h3 style={sideTitleStyle}>Rook power helper</h3><p style={sideTextStyle}>Draft a power, deity, faction, order, or institution, then edit it into shape.</p></div></div>
      <label style={fieldStyle}><span style={labelStyle}>Prompt</span><textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="A secretive order that protects forbidden knowledge..." style={{ ...textareaStyle, minHeight: 120 }} /></label>
      <Button onClick={onGenerate} disabled={aiGenerating} style={primaryButtonStyle}>{aiGenerating ? <><Loader size={16} className="spin" /> Creating...</> : <><Wand2 size={16} /> Ask Rook</>}</Button>
      {lastGenerated && <div style={generatedBoxStyle}><p style={ruleLabelStyle}>Last created</p><p style={sideTextStyle}>{lastGenerated.entity_name || 'New entry added'}</p></div>}
    </aside>
  );
}

const pageStyle = { display: 'grid', gap: 16, fontFamily: fontStack };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', background: rq.card, border: `1px solid ${rq.line}`, padding: 16 };
const eyebrowStyle = { margin: '0 0 5px', color: rq.muted, fontSize: 11, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const titleStyle = { margin: 0, color: rq.text, fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 950, letterSpacing: '-0.04em', lineHeight: 1.02 };
const subtitleStyle = { margin: '7px 0 0', color: rq.soft, fontSize: 14, lineHeight: 1.45, maxWidth: 830 };
const primaryButtonStyle = { minHeight: 42, border: 0, borderRadius: 0, background: rq.accent, color: rq.text, padding: '0 14px', fontWeight: 950, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 42, border: 0, borderRadius: 0, background: rq.card, color: rq.text, padding: '0 14px', fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: fontStack };
const ruleStyle = { background: rq.panel, borderLeft: `6px solid ${rq.accent}`, padding: 14, display: 'grid', gap: 4 };
const ruleLabelStyle = { margin: 0, color: rq.text, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 950 };
const ruleTextStyle = { margin: 0, color: rq.soft, lineHeight: 1.45, fontSize: 14 };
const statsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', borderTop: `1px solid ${rq.line}`, borderBottom: `1px solid ${rq.line}` };
const statStyle = { minHeight: 68, padding: '12px 14px', display: 'grid', alignContent: 'center', gap: 3, borderRight: `1px solid ${rq.line}` };
const statValueStyle = { color: rq.text, fontSize: 24, fontWeight: 950 };
const statLabelStyle = { color: rq.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 900 };
const layoutStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 340px)', gap: 16, alignItems: 'start' };
const searchWrapStyle = { position: 'relative', minWidth: 0, marginBottom: 14 };
const searchIconStyle = { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: rq.muted, zIndex: 1 };
function inputBaseStyle() { return { width: '100%', minHeight: 44, border: `1px solid ${rq.lineStrong}`, borderRadius: 0, background: rq.input, color: rq.text, padding: '0 11px', fontFamily: fontStack, fontSize: 14, outline: 'none', colorScheme: 'dark' }; }
const inputStyle = inputBaseStyle();
const searchInputStyle = { ...inputBaseStyle(), paddingLeft: 40 };
const textareaStyle = { width: '100%', border: `1px solid ${rq.lineStrong}`, borderRadius: 0, background: rq.input, color: rq.text, padding: 12, fontFamily: fontStack, fontSize: 14, outline: 'none', resize: 'vertical', lineHeight: 1.45, colorScheme: 'dark' };
const fieldStyle = { display: 'grid', gap: 6 };
const labelStyle = { color: rq.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const dialogStyle = { maxWidth: 680, background: rq.bg, backgroundColor: rq.bg, border: `1px solid ${rq.lineStrong}`, borderRadius: 0, color: rq.text, boxShadow: 'none', fontFamily: fontStack };
const dialogTitleStyle = { color: rq.text, fontSize: 26, fontWeight: 950, letterSpacing: '-0.03em', fontFamily: fontStack };
const formStyle = { display: 'grid', gap: 12, marginTop: 16 };
const twoColumnStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 };
const formActionsStyle = { display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: `1px solid ${rq.line}`, paddingTop: 12, marginTop: 4 };
const cardsStyle = { display: 'grid', gap: 14 };
const emptyCardStyle = { background: rq.card, border: `1px solid ${rq.line}`, padding: 18, display: 'grid', gap: 12, justifyItems: 'start' };
const mutedTextStyle = { margin: 0, color: rq.soft };
const cardStyle = { background: rq.card, border: `1px solid ${rq.line}`, color: rq.text };
const cardHeaderStyle = { display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, borderBottom: `1px solid ${rq.line}` };
const iconTileStyle = { width: 42, height: 42, display: 'grid', placeItems: 'center', background: rq.bg, color: rq.text, borderLeft: `5px solid ${rq.accent}`, flex: '0 0 auto' };
const cardTitleStyle = { margin: 0, color: rq.text, fontSize: 21, fontWeight: 950, letterSpacing: '-0.02em' };
const cardMetaStyle = { margin: '4px 0 0', color: rq.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 900 };
const cardActionsStyle = { display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' };
const iconButtonStyle = { minWidth: 34, minHeight: 34, border: 0, borderRadius: 0, background: rq.panel, color: rq.text, padding: 0, display: 'grid', placeItems: 'center' };
const dangerIconStyle = { ...iconButtonStyle, background: 'rgba(208,0,0,0.28)' };
const dangerMiniStyle = { ...iconButtonStyle, background: rq.accent };
const deleteConfirmStyle = { display: 'flex', alignItems: 'center', gap: 6, background: rq.panel, padding: 4 };
const deleteTextStyle = { color: rq.text, fontSize: 11, fontWeight: 900 };
const descriptionStyle = { margin: 0, padding: 14, color: rq.soft, lineHeight: 1.5, borderBottom: `1px solid ${rq.line}` };
const infoGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 0 };
const infoBoxStyle = { padding: 14, borderBottom: `1px solid ${rq.line}`, borderRight: `1px solid ${rq.line}` };
const infoTitleStyle = { display: 'block', color: rq.text, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 950, marginBottom: 6 };
const infoValueStyle = { margin: 0, lineHeight: 1.45, whiteSpace: 'pre-wrap' };
const rookPanelStyle = { position: 'sticky', top: 80, display: 'grid', gap: 12, background: rq.card, border: `1px solid ${rq.line}`, padding: 14 };
const rookHeaderStyle = { display: 'flex', gap: 10, alignItems: 'flex-start', color: rq.text };
const sideTitleStyle = { margin: 0, color: rq.text, fontSize: 18, fontWeight: 950 };
const sideTextStyle = { margin: '4px 0 0', color: rq.soft, lineHeight: 1.4, fontSize: 13 };
const generatedBoxStyle = { background: rq.panel, borderLeft: `5px solid ${rq.accent}`, padding: 10 };

export default GodsTab;
