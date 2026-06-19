import React from 'react';

import { Button } from '@/components/ui/button';
import { CLASS_OPTIONS, GENRE_OPTIONS, theme } from './dashboardConfig';
import {
  classGridStyle,
  classPillStyle,
  compactFormGridStyle,
  fieldLabelStyle,
  fieldStyle,
  modalActionsStyle,
  modalBackdropStyle,
  modalStyle,
  modalTitleStyle,
  subtitleStyle,
  toggleCardStyle,
  toggleGridStyle,
} from './dashboardStyles';

export default function CreateCampaignModal({
  campaignForm,
  creatingCampaign,
  onCancel,
  onSubmit,
  updateCampaignForm,
  toggleCampaignClass,
}) {
  return (
    <div style={modalBackdropStyle} onClick={onCancel}>
      <form style={modalStyle} onClick={event => event.stopPropagation()} onSubmit={onSubmit}>
        <h2 style={modalTitleStyle}>Create Campaign</h2>
        <p style={subtitleStyle}>Set the table rules now so players joining with your code build characters that fit this campaign.</p>

        <div style={compactFormGridStyle}>
          <label style={fieldLabelStyle}>
            Campaign name
            <input value={campaignForm.name} onChange={event => updateCampaignForm('name', event.target.value)} autoFocus placeholder="e.g. The Ashen Crown" style={fieldStyle} />
          </label>
          <label style={fieldLabelStyle}>
            World name
            <input value={campaignForm.world_name} onChange={event => updateCampaignForm('world_name', event.target.value)} placeholder="e.g. Veyr" style={fieldStyle} />
          </label>
          <label style={fieldLabelStyle}>
            Genre
            <select value={campaignForm.world_genre} onChange={event => updateCampaignForm('world_genre', event.target.value)} style={fieldStyle}>
              {GENRE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label style={fieldLabelStyle}>
            Rules edition
            <select value={campaignForm.rules_edition} onChange={event => updateCampaignForm('rules_edition', event.target.value)} style={fieldStyle}>
              <option value="2024">2024 rules</option>
              <option value="2014">2014 rules</option>
            </select>
          </label>
        </div>

        <label style={fieldLabelStyle}>
          Description
          <textarea value={campaignForm.description} onChange={event => updateCampaignForm('description', event.target.value)} placeholder="Optional short campaign pitch" style={{ ...fieldStyle, minHeight: 74, resize: 'vertical' }} />
        </label>

        <div style={toggleGridStyle}>
          <label style={toggleCardStyle}>
            <input type="checkbox" checked={campaignForm.allow_exploding_dice} onChange={event => updateCampaignForm('allow_exploding_dice', event.target.checked)} />
            <span><strong>Exploding dice</strong><small>Non-d20 max rolls roll again and add.</small></span>
          </label>
          <label style={toggleCardStyle}>
            <input type="checkbox" checked={campaignForm.allow_epic_levels} onChange={event => updateCampaignForm('allow_epic_levels', event.target.checked)} />
            <span><strong>Beyond level 20</strong><small>Allow epic multiclass progression.</small></span>
          </label>
          <label style={{ ...fieldLabelStyle, marginTop: 0 }}>
            Max level
            <input type="number" min="1" max="60" disabled={!campaignForm.allow_epic_levels} value={campaignForm.max_character_level} onChange={event => updateCampaignForm('max_character_level', event.target.value)} style={fieldStyle} />
          </label>
        </div>

        <div style={fieldLabelStyle}>
          Allowed classes <span style={{ color: theme.textSecondary, fontWeight: 600 }}>Leave all unticked to allow every class.</span>
          <div style={classGridStyle}>
            {CLASS_OPTIONS.map(className => (
              <label key={className} style={classPillStyle(campaignForm.available_classes.includes(className))}>
                <input type="checkbox" checked={campaignForm.available_classes.includes(className)} onChange={() => toggleCampaignClass(className)} />
                {className}
              </label>
            ))}
          </div>
        </div>

        <div style={modalActionsStyle}>
          <Button type="button" onClick={onCancel} className="btn-outline">Cancel</Button>
          <Button type="submit" disabled={creatingCampaign} className="btn-primary">{creatingCampaign ? 'Creating...' : 'Create Campaign'}</Button>
        </div>
      </form>
    </div>
  );
}
