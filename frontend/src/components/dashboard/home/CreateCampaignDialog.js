import {
  buildCampaignFeel,
  campaignTypes,
  joinSettingOptions,
  rulesSystemOptions,
  tonePresets,
  toneSliders,
  visibilityOptions,
} from './unifiedDashboardUtils';

export default function CreateCampaignDialog({
  form,
  creating,
  onChange,
  onSubmit,
  onClose,
}) {
  const campaignFeel = buildCampaignFeel(form);

  const applyPreset = (presetId) => {
    const preset = tonePresets[presetId];
    if (!preset) return;
    onChange('tone_preset', presetId);
    onChange('tone_sliders', { ...preset.values });
  };

  const updateSlider = (sliderId, value) => {
    const nextValue = Number(value);
    onChange('tone_preset', 'custom');
    onChange('tone_sliders', {
      ...(form.tone_sliders || tonePresets.custom.values),
      [sliderId]: Number.isFinite(nextValue) ? nextValue : 5,
    });
  };

  return (
    <div className="dashboard-modal-overlay dashboard-campaign-setup-overlay" role="presentation">
      <section
        className="dashboard-modal-panel dashboard-campaign-setup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-campaign-title"
      >
        <div className="dashboard-modal-header">
          <div>
            <p className="dashboard-eyebrow">Campaign launch setup</p>
            <h2 id="create-campaign-title">Create Campaign</h2>
            <p className="dashboard-muted">Set the useful basics first. Once this is saved, you’ll go straight into the full GM builder.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="dashboard-close-button"
            aria-label="Close create campaign"
          >
            <span>×</span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="dashboard-form dashboard-campaign-setup-form">
          <section className="dashboard-form-section">
            <div className="dashboard-section-heading dashboard-form-section-heading">
              <p className="dashboard-eyebrow">Basic info</p>
              <h3>Campaign Identity</h3>
            </div>

            <CampaignField
              label="Campaign name"
              value={form.name}
              onChange={(value) => onChange('name', value)}
              placeholder="Tia Karta"
              required
            />

            <div className="dashboard-form-split dashboard-form-split--tablet">
              <CampaignSelect
                label="Rules / system"
                value={form.rules_edition}
                onChange={(value) => onChange('rules_edition', value)}
                options={rulesSystemOptions}
              />
              <CampaignField
                label="World or setting name"
                value={form.world_name}
                onChange={(value) => onChange('world_name', value)}
                placeholder="Optional"
              />
            </div>

            <div className="dashboard-form-split dashboard-form-split--tablet">
              <CampaignSelect
                label="Campaign type"
                value={form.campaign_type}
                onChange={(value) => onChange('campaign_type', value)}
                options={campaignTypes}
              />
              <CampaignSelect
                label="Join setting"
                value={form.join_mode}
                onChange={(value) => onChange('join_mode', value)}
                options={joinSettingOptions}
              />
            </div>

            <label className="dashboard-field">
              <span>Campaign description / GM notes</span>
              <textarea
                value={form.description}
                onChange={(event) => onChange('description', event.target.value)}
                placeholder="Optional private notes about the campaign premise, rules, or table idea."
              />
            </label>
          </section>

          <section className="dashboard-form-section dashboard-tone-section">
            <div className="dashboard-section-heading dashboard-form-section-heading">
              <p className="dashboard-eyebrow">Private Rook context</p>
              <h3>Campaign Feel</h3>
              <p className="dashboard-muted">Choose a preset, then adjust the sliders. If you move a slider, the preset becomes Custom.</p>
            </div>

            <div className="dashboard-tone-presets" aria-label="Campaign feel presets">
              {Object.entries(tonePresets).map(([id, preset]) => (
                <button
                  key={id}
                  type="button"
                  className={form.tone_preset === id ? 'dashboard-tone-preset is-active' : 'dashboard-tone-preset'}
                  onClick={() => applyPreset(id)}
                  disabled={creating}
                >
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>

            <div className="dashboard-tone-sliders">
              {toneSliders.map((slider) => {
                const value = Number(form.tone_sliders?.[slider.id] ?? 5);
                return (
                  <label key={slider.id} className="dashboard-tone-slider">
                    <span className="dashboard-tone-slider-labels">
                      <em>{slider.left}</em>
                      <strong>{value}/10</strong>
                      <em>{slider.right}</em>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={value}
                      onChange={(event) => updateSlider(slider.id, event.target.value)}
                    />
                  </label>
                );
              })}
            </div>

            <div className="dashboard-generated-feel" aria-live="polite">
              <p className="dashboard-eyebrow">Generated private feel</p>
              <p>{campaignFeel}</p>
            </div>
          </section>

          <section className="dashboard-form-section">
            <div className="dashboard-section-heading dashboard-form-section-heading">
              <p className="dashboard-eyebrow">Table details</p>
              <h3>Starter Details</h3>
            </div>

            <div className="dashboard-form-split dashboard-form-split--tablet dashboard-form-three">
              <CampaignNumberField
                label="Starting level"
                value={form.starting_level}
                min="1"
                max="20"
                onChange={(value) => onChange('starting_level', value)}
              />
              <CampaignNumberField
                label="Party size"
                value={form.party_size}
                min="1"
                max="12"
                onChange={(value) => onChange('party_size', value)}
              />
              <CampaignSelect
                label="Visibility"
                value={form.visibility}
                onChange={(value) => onChange('visibility', value)}
                options={visibilityOptions}
              />
            </div>
          </section>

          <div className="dashboard-setup-preview">
            <p className="dashboard-eyebrow">What happens next</p>
            <p className="dashboard-muted">
              The campaign is created with a join code straight away, your chosen join setting is saved, and this private campaign feel is saved for Rook context.
            </p>
          </div>

          <div className="dashboard-modal-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="unified-dashboard-button"
            >
              <span>Cancel</span>
            </button>

            <button type="submit" disabled={creating} className="dashboard-primary-button dashboard-create-campaign-submit">
              <span>{creating ? 'Creating...' : 'Create Campaign & Open Builder'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CampaignField({ label, value, onChange, placeholder, required = false }) {
  return (
    <label className="dashboard-field">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function CampaignNumberField({ label, value, onChange, min, max }) {
  return (
    <label className="dashboard-field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function CampaignSelect({ label, value, onChange, options }) {
  return (
    <label className="dashboard-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {Object.entries(options).map(([id, labelText]) => (
          <option key={id} value={id}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}
