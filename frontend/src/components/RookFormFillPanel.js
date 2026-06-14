import React, { useMemo, useState } from 'react';
import { Check, Loader, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const MAX_PROMPT_LENGTH = 2000;

const panelStyle = {
  border: '1px solid var(--rq-accent-border, rgba(193,18,31,0.35))',
  borderRadius: 'var(--rq-radius-sm, 4px)',
  background: 'var(--rq-bg-panel, #242424)',
  padding: 12,
};

const inputStyle = {
  width: '100%',
  minHeight: 64,
  resize: 'vertical',
  border: '1px solid var(--rq-border-default, #3A3A3A)',
  borderRadius: 'var(--rq-radius-sm, 4px)',
  background: 'var(--rq-bg-input, #1F1F1F)',
  color: 'var(--rq-text-primary, #FFFFFF)',
  padding: 10,
  fontSize: 13,
};

const buttonStyle = (disabled, subtle = false) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  borderRadius: 'var(--rq-radius-sm, 4px)',
  border: subtle ? '1px solid var(--rq-accent-border, rgba(193,18,31,0.35))' : '1px solid var(--rq-accent-primary, #C1121F)',
  background: disabled
    ? 'var(--rq-bg-elevated, #323232)'
    : subtle ? 'var(--rq-accent-soft, rgba(193,18,31,0.12))' : 'var(--rq-accent-primary, #C1121F)',
  color: subtle ? 'var(--rq-accent-hover, #D62839)' : 'var(--rq-text-primary, #FFFFFF)',
  padding: '8px 10px',
  fontWeight: 800,
  fontSize: 12,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.65 : 1,
});

function coerceValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value, null, 2);
  return value ?? '';
}

export default function RookFormFillPanel({
  title = 'Ask Rook to fill these boxes',
  helperText = 'Describe what you want, review the suggestions, then import only the fields you want.',
  section,
  campaignId = '',
  fields = [],
  currentValues = {},
  onApply,
  placeholder = 'Example: Make this a suspicious dockside informant with a clue for tonight...',
}) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [suggestions, setSuggestions] = useState({});

  const fieldMap = useMemo(() => Object.fromEntries(fields.map(field => [field.name, field])), [fields]);
  const suggestionEntries = Object.entries(suggestions).filter(([key]) => fieldMap[key]);

  const askRook = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      toast.error('Tell Rook what you want help creating first');
      return;
    }
    if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
      toast.error(`Keep the request under ${MAX_PROMPT_LENGTH} characters so Rook can respond reliably.`);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/rook/form-fill', {
        section,
        prompt: trimmedPrompt,
        campaign_id: campaignId,
        fields,
        current_values: currentValues,
      });
      setSuggestions(res.data?.suggestions || {});
      setSummary(res.data?.summary || 'Rook drafted importable suggestions.');
      if (Object.keys(res.data?.suggestions || {}).length === 0) {
        toast.info('Rook responded, but did not find importable field changes. Try a more specific prompt.');
      } else {
        toast.success('Rook drafted field suggestions');
      }
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Rook could not draft suggestions right now');
    } finally {
      setLoading(false);
    }
  };

  const applyFields = (patch) => {
    if (!patch || Object.keys(patch).length === 0) return;
    onApply?.(patch);
    toast.success('Imported Rook suggestion');
  };

  return (
    <section style={panelStyle} data-testid="rook-form-fill-panel">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <Sparkles size={15} color="var(--rq-accent-hover, #D62839)" />
        <strong style={{ color: 'var(--rq-text-primary, #FFFFFF)', fontSize: 13 }}>{title}</strong>
      </div>
      <p style={{ margin: '0 0 10px', color: 'var(--rq-text-secondary, #D6D6D6)', fontSize: 12, lineHeight: 1.45 }}>{helperText}</p>
      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder={placeholder}
        style={inputStyle}
        maxLength={MAX_PROMPT_LENGTH + 250}
        data-testid="rook-form-fill-prompt"
      />
      <div style={{ marginTop: 4, color: 'var(--rq-text-muted, #A8A8A8)', fontSize: 11 }}>
        {prompt.trim().length}/{MAX_PROMPT_LENGTH} suggested characters
      </div>
      <button type="button" onClick={askRook} disabled={loading || !prompt.trim()} style={{ ...buttonStyle(loading || !prompt.trim()), marginTop: 8 }} data-testid="rook-form-fill-generate">
        {loading ? <Loader size={14} className="animate-spin" /> : <Wand2 size={14} />}
        {loading ? 'Rook is drafting…' : 'Draft importable fields'}
      </button>

      {suggestionEntries.length > 0 && (
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          {summary && <p style={{ margin: 0, color: 'var(--rq-text-secondary, #D6D6D6)', fontSize: 12 }}>{summary}</p>}
          {suggestionEntries.map(([key, value]) => (
            <div key={key} style={{ border: '1px solid var(--rq-border-default, #3A3A3A)', borderRadius: 4, padding: 8, background: 'var(--rq-bg-elevated, #323232)' }}>
              <div style={{ color: 'var(--rq-accent-hover, #D62839)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
                {fieldMap[key]?.label || key}
              </div>
              <div style={{ color: 'var(--rq-text-primary, #FFFFFF)', whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.45, marginBottom: 8 }}>{coerceValue(value)}</div>
              <button type="button" onClick={() => applyFields({ [key]: value })} style={buttonStyle(false, true)}>
                <Check size={13} /> Import this field
              </button>
            </div>
          ))}
          <button type="button" onClick={() => applyFields(suggestions)} style={buttonStyle(false)} data-testid="rook-form-fill-apply-all">
            <Check size={14} /> Import all suggested fields
          </button>
        </div>
      )}
    </section>
  );
}
