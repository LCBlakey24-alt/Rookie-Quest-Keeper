import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { CloudRain, Loader, MapPin, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AIImageGeneratorPanel from '@/components/AIImageGeneratorPanel';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

const DEFAULT_ENVIRONMENT = {
  weather: 'clear',
  lighting: 'daylight',
  mood: 'neutral',
  location: '',
  notes: '',
  background_image: '',
  background_prompt: '',
};

const WEATHER_OPTIONS = [
  { id: 'clear', label: 'Clear' },
  { id: 'rain', label: 'Rain' },
  { id: 'storm', label: 'Storm' },
  { id: 'fog', label: 'Fog' },
  { id: 'snow', label: 'Snow' },
  { id: 'ash', label: 'Ash' },
];

const LIGHTING_OPTIONS = [
  { id: 'daylight', label: 'Daylight' },
  { id: 'dusk', label: 'Dusk' },
  { id: 'night', label: 'Night' },
  { id: 'dark_gloomy', label: 'Dark Gloomy' },
  { id: 'torchlit', label: 'Torchlit' },
];

const MOOD_OPTIONS = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'ominous', label: 'Ominous' },
  { id: 'mysterious', label: 'Mysterious' },
  { id: 'hostile', label: 'Hostile' },
  { id: 'heroic', label: 'Heroic' },
];

const colors = {
  bg: '#1F1F23',
  panel: '#27272B',
  elevated: '#323235',
  red: '#EF4444',
  redSoft: 'rgba(239,68,68,0.14)',
  border: 'rgba(239,68,68,0.42)',
  text: '#FFFFFF',
  muted: '#D1D5DB',
};

export default function EnvironmentControl({ campaignId, campaign, onEnvironmentChange }) {
  const [draft, setDraft] = useState(DEFAULT_ENVIRONMENT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({ ...DEFAULT_ENVIRONMENT, ...(campaign?.campaign_environment || {}) });
  }, [campaign?.campaign_environment]);

  const updateDraft = (key, value) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const saveEnvironment = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/campaigns/${campaignId}/environment`, draft);
      setDraft({ ...DEFAULT_ENVIRONMENT, ...res.data });
      onEnvironmentChange?.(res.data);
      toast.success('Environment saved');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save environment');
    } finally {
      setSaving(false);
    }
  };

  const optionLabel = (options, id) => options.find(option => option.id === id)?.label || id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 22, color: colors.text, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CloudRain size={24} style={{ color: colors.red }} /> Environment
        </h2>
        <Button onClick={saveEnvironment} disabled={saving} style={primaryButtonStyle}>
          {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
          Save
        </Button>
      </div>

      <section style={panelStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <ControlGroup label="Weather" options={WEATHER_OPTIONS} value={draft.weather} onChange={value => updateDraft('weather', value)} />
          <ControlGroup label="Light" options={LIGHTING_OPTIONS} value={draft.lighting} onChange={value => updateDraft('lighting', value)} />
          <ControlGroup label="Mood" options={MOOD_OPTIONS} value={draft.mood} onChange={value => updateDraft('mood', value)} />
          <div>
            <label style={labelStyle}>Location</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: colors.red }} />
              <input
                value={draft.location}
                onChange={event => updateDraft('location', event.target.value)}
                placeholder="Ruined keep, forest road, city docks..."
                style={{ ...inputStyle, paddingLeft: 30 }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={draft.notes}
            onChange={event => updateDraft('notes', event.target.value)}
            rows={3}
            placeholder="Cold wind, flooded streets, red moon, distant bells..."
            style={{ ...inputStyle, resize: 'vertical', minHeight: 82 }}
          />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <section style={panelStyle}>
          <div style={{ color: colors.red, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 10 }}>
            Player Backdrop
          </div>
          <div style={previewStyle}>
            {draft.background_image ? (
              <>
                <img src={draft.background_image} alt="Current environment" style={previewImageStyle} />
                <button
                  type="button"
                  onClick={() => setDraft(prev => ({ ...prev, background_image: '', background_prompt: '' }))}
                  aria-label="Clear environment image"
                  style={clearButtonStyle}
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <div style={{ color: colors.muted, fontSize: 12 }}>No backdrop selected</div>
            )}
          </div>
          <div style={summaryGridStyle}>
            <Summary label="Weather" value={optionLabel(WEATHER_OPTIONS, draft.weather)} />
            <Summary label="Light" value={optionLabel(LIGHTING_OPTIONS, draft.lighting)} />
            <Summary label="Mood" value={optionLabel(MOOD_OPTIONS, draft.mood)} />
            <Summary label="Location" value={draft.location || 'Unspecified'} />
          </div>
        </section>

        <AIImageGeneratorPanel
          title="AI Environment Images"
          subtitle="Wide scene backgrounds for the live table."
          buttonLabel="Generate 3 Backgrounds"
          selectedImage={draft.background_image}
          onSelectImage={(src, image) => setDraft(prev => ({
            ...prev,
            background_image: src,
            background_prompt: image?.prompt || prev.background_prompt,
          }))}
          onClearImage={() => setDraft(prev => ({ ...prev, background_image: '', background_prompt: '' }))}
          payload={{
            subject_type: 'environment',
            weather: optionLabel(WEATHER_OPTIONS, draft.weather),
            lighting: optionLabel(LIGHTING_OPTIONS, draft.lighting),
            mood: optionLabel(MOOD_OPTIONS, draft.mood),
            location: draft.location,
            notes: draft.notes,
            campaign_name: campaign?.name || '',
            campaign_notes: campaign?.world_setting_notes || campaign?.description || '',
          }}
        />
      </div>
    </div>
  );
}

function ControlGroup({ label, options, value, onChange }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(option => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              style={{
                border: `1px solid ${active ? colors.red : colors.border}`,
                borderRadius: 0,
                background: active ? colors.redSoft : colors.bg,
                color: active ? colors.text : colors.muted,
                padding: '8px 10px',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div style={{ border: `1px solid ${colors.border}`, background: colors.bg, padding: 9 }}>
      <div style={{ color: colors.red, fontSize: 10, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{ color: colors.text, fontSize: 12, lineHeight: 1.35 }}>{value}</div>
    </div>
  );
}

const panelStyle = {
  background: colors.panel,
  border: `1px solid ${colors.border}`,
  borderRadius: 0,
  padding: 14,
};

const primaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: `1px solid ${colors.red}`,
  borderRadius: 0,
  background: colors.red,
  color: colors.text,
  padding: '9px 14px',
  fontSize: 12,
  fontWeight: 800,
};

const labelStyle = {
  display: 'block',
  color: colors.red,
  fontSize: 11,
  textTransform: 'uppercase',
  marginBottom: 6,
  fontWeight: 800,
};

const inputStyle = {
  width: '100%',
  border: `1px solid ${colors.border}`,
  borderRadius: 0,
  background: colors.bg,
  color: colors.text,
  outline: 'none',
  padding: '10px 11px',
  fontSize: 12,
};

const previewStyle = {
  position: 'relative',
  aspectRatio: '16 / 9',
  border: `1px solid ${colors.border}`,
  background: colors.bg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  marginBottom: 12,
};

const previewImageStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};

const clearButtonStyle = {
  position: 'absolute',
  top: 8,
  right: 8,
  width: 32,
  height: 32,
  border: `1px solid ${colors.border}`,
  borderRadius: 0,
  background: 'rgba(31,31,35,0.86)',
  color: colors.text,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const summaryGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
};
