import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Sparkles, Loader, Clock, MapPin, User, AlertCircle, Calendar } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const rq = {
  bg: 'var(--rq-bg-main, #1A1A1A)',
  panel: 'var(--rq-bg-panel, #242424)',
  input: 'var(--rq-bg-input, #1F1F1F)',
  border: 'var(--rq-accent-border, rgba(193,18,31,0.35))',
  borderDefault: 'var(--rq-border-default, #3A3A3A)',
  accent: 'var(--rq-accent-primary, #C1121F)',
  accentHover: 'var(--rq-accent-hover, #D62839)',
  accentSoft: 'var(--rq-accent-soft, rgba(193,18,31,0.12))',
  text: 'var(--rq-text-primary, #FFFFFF)',
  textSecondary: 'var(--rq-text-secondary, #D6D6D6)',
  muted: 'var(--rq-text-muted, #A0A0A0)',
  success: 'var(--rq-success, #2E8B57)',
  radius: 'var(--rq-radius-md, 6px)',
  radiusSm: 'var(--rq-radius-sm, 4px)',
};

function SmartNoteParser({ campaignId, noteText, onUpdateApplied }) {
  const [parsing, setParsing] = useState(false);
  const [parseResults, setParseResults] = useState(null);
  const [applyingUpdates, setApplyingUpdates] = useState(new Set());

  const handleParse = async () => {
    if (!noteText || noteText.trim().length < 10) {
      toast.error('Note too short to parse', {
        description: 'Please write at least 10 characters'
      });
      return;
    }

    setParsing(true);
    setParseResults(null);

    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/notes/parse`, {
        note_text: noteText,
        campaign_id: campaignId
      });

      setParseResults(response.data);

      const entityCount = response.data.entities_mentioned?.length || 0;
      const timeCount = response.data.time_changes?.length || 0;

      toast.success('Rook finished parsing notes', {
        description: `Found ${entityCount} people/places and ${timeCount} time changes`
      });
    } catch (error) {
      toast.error('Rook could not parse notes', {
        description: error?.response?.data?.detail || 'Please try again'
      });
    } finally {
      setParsing(false);
    }
  };

  const handleUpdateEntity = async (entity) => {
    setApplyingUpdates(prev => new Set(prev).add(entity.name));

    try {
      if (entity.existing_id) {
        if (entity.entity_type === 'npc') {
          const existing = await apiClient.get(`/campaigns/${campaignId}/npcs/${entity.existing_id}`);
          const currentNotes = existing.data.notes || '';
          const updatedNotes = currentNotes
            ? `${currentNotes}\n\n[Session Update]: ${entity.suggested_notes}`
            : entity.suggested_notes;

          await apiClient.put(`/campaigns/${campaignId}/npcs/${entity.existing_id}`, { notes: updatedNotes });
        } else if (entity.entity_type === 'location') {
          const existing = await apiClient.get(`/campaigns/${campaignId}/locations/${entity.existing_id}`);
          const currentNotes = existing.data.notes || '';
          const updatedNotes = currentNotes
            ? `${currentNotes}\n\n[Session Update]: ${entity.suggested_notes}`
            : entity.suggested_notes;

          await apiClient.put(`/campaigns/${campaignId}/locations/${entity.existing_id}`, { notes: updatedNotes });
        }

        toast.success(`Updated ${entity.name}`, {
          description: 'Notes appended successfully'
        });
      } else {
        if (entity.entity_type === 'npc') {
          await apiClient.post(`/campaigns/${campaignId}/npcs`, {
            name: entity.name,
            description: entity.suggested_notes,
            notes: '',
            location: entity.suggested_location || '',
            hp: 10,
            ac: 10
          });

          toast.success(`Created new person: ${entity.name}`, {
            description: 'Added to your campaign'
          });
        } else if (entity.entity_type === 'location') {
          await apiClient.post(`/campaigns/${campaignId}/locations`, {
            name: entity.name,
            location_type: 'Settlement',
            description: entity.suggested_notes,
            notes: ''
          });

          toast.success(`Created new location: ${entity.name}`, {
            description: 'Added to your campaign'
          });
        }
      }

      setApplyingUpdates(prev => {
        const next = new Set(prev);
        next.delete(entity.name);
        return next;
      });

      if (onUpdateApplied) onUpdateApplied();
    } catch (error) {
      toast.error(`Failed to update ${entity.name}`, {
        description: error?.response?.data?.detail || 'Please try again'
      });
      setApplyingUpdates(prev => {
        const next = new Set(prev);
        next.delete(entity.name);
        return next;
      });
    }
  };

  const handleUpdateCalendar = async () => {
    if (!parseResults?.new_calendar_date) return;

    setApplyingUpdates(prev => new Set(prev).add('calendar'));

    try {
      await apiClient.put(`/campaigns/${campaignId}/calendar`, {
        current_date: parseResults.new_calendar_date
      });

      toast.success('Calendar updated!', {
        description: 'Time advanced based on session notes'
      });

      setApplyingUpdates(prev => {
        const next = new Set(prev);
        next.delete('calendar');
        return next;
      });

      if (onUpdateApplied) onUpdateApplied();
    } catch (error) {
      toast.error('Failed to update calendar', {
        description: error?.response?.data?.detail || 'Please try again'
      });
      setApplyingUpdates(prev => {
        const next = new Set(prev);
        next.delete('calendar');
        return next;
      });
    }
  };

  const handleApplyAll = async () => {
    if (!parseResults) return;

    for (const entity of parseResults.entities_mentioned || []) {
      await handleUpdateEntity(entity);
    }

    if (parseResults.calendar_update_suggested && parseResults.new_calendar_date) {
      await handleUpdateCalendar();
    }

    toast.success('All updates applied!', {
      description: 'Your campaign has been updated'
    });
  };

  return (
    <div>
      <Card className="glow-card" style={cardStyle}>
        <CardHeader>
          <CardTitle className="medieval-heading" style={titleStyle}>
            <Sparkles size={20} />
            Rook Note Parser
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p style={introStyle}>
            Ask Rook to analyse your session notes and suggest text updates for people, places, and campaign time.
          </p>

          <Button onClick={handleParse} disabled={parsing || !noteText || noteText.trim().length < 10} className="btn-primary" style={parseButtonStyle}>
            {parsing ? (
              <>
                <Loader className="spin" size={18} />
                Rook is parsing notes...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Ask Rook to Parse Notes
              </>
            )}
          </Button>

          {parseResults && (
            <div style={{ marginTop: '24px' }}>
              {parseResults.entities_mentioned && parseResults.entities_mentioned.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={sectionHeaderStyle}>
                    <h4 style={sectionTitleStyle}>People & Places Found ({parseResults.entities_mentioned.length})</h4>
                    <Button onClick={handleApplyAll} className="btn-secondary" style={smallButtonStyle}>Apply All</Button>
                  </div>

                  <div style={stackStyle}>
                    {parseResults.entities_mentioned.map((entity, idx) => {
                      const existing = !!entity.existing_id;
                      const Icon = entity.entity_type === 'npc' ? User : MapPin;
                      return (
                        <div key={idx} style={resultCardStyle(existing)}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={entityHeaderStyle}>
                                <Icon size={16} color={existing ? rq.success : rq.accent} />
                                <span style={entityNameStyle}>{entity.name}</span>
                                <span style={badgeStyle(existing)}>
                                  {existing ? 'Existing' : 'New'} {entity.entity_type.toUpperCase()}
                                </span>
                              </div>
                              <p style={suggestedNotesStyle}>{entity.suggested_notes}</p>
                              {entity.suggested_location && <p style={locationHintStyle}>📍 {entity.suggested_location}</p>}
                            </div>
                            <Button onClick={() => handleUpdateEntity(entity)} disabled={applyingUpdates.has(entity.name)} className="btn-primary" style={smallButtonStyle}>
                              {applyingUpdates.has(entity.name) ? <Loader className="spin" size={14} /> : existing ? 'Update' : 'Create'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {parseResults.time_changes && parseResults.time_changes.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ ...sectionTitleStyle, marginBottom: '12px' }}>Time Changes ({parseResults.time_changes.length})</h4>

                  <div style={stackStyle}>
                    {parseResults.time_changes.map((timeChange, idx) => (
                      <div key={idx} style={timeCardStyle}>
                        <Clock size={18} color={rq.accent} />
                        <div style={{ flex: 1 }}>
                          <p style={timeDescriptionStyle}>{timeChange.description}</p>
                          <p style={timeMetaStyle}>Type: {timeChange.type} | Amount: {timeChange.amount} {timeChange.type === 'days' ? 'days' : 'hours'}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {parseResults.calendar_update_suggested && (
                    <div style={calendarUpdateStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Calendar size={18} color={rq.accent} />
                        <div>
                          <p style={calendarTitleStyle}>Update Campaign Calendar</p>
                          <p style={calendarSubtitleStyle}>Advance time based on session events</p>
                        </div>
                      </div>
                      <Button onClick={handleUpdateCalendar} disabled={applyingUpdates.has('calendar')} className="btn-primary" style={smallButtonStyle}>
                        {applyingUpdates.has('calendar') ? <Loader className="spin" size={14} /> : 'Update Calendar'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {(!parseResults.entities_mentioned || parseResults.entities_mentioned.length === 0) &&
               (!parseResults.time_changes || parseResults.time_changes.length === 0) && (
                <div style={emptyStateStyle}>
                  <AlertCircle size={32} color={rq.muted} style={{ marginBottom: '12px' }} />
                  <p>No people, places, or time changes were detected in these notes.</p>
                  <p style={{ fontSize: '13px', marginTop: '8px' }}>Try mentioning a character, location, or time passing.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const cardStyle = { marginBottom: '20px', background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius };
const titleStyle = { display: 'flex', alignItems: 'center', gap: '8px', color: rq.accent, fontWeight: 900 };
const introStyle = { color: rq.textSecondary, fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' };
const parseButtonStyle = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: rq.radiusSm, fontWeight: 900 };
const sectionHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' };
const sectionTitleStyle = { color: rq.text, fontSize: '16px', fontWeight: 900, margin: 0 };
const smallButtonStyle = { fontSize: '13px', padding: '6px 12px', borderRadius: rq.radiusSm };
const stackStyle = { display: 'flex', flexDirection: 'column', gap: '12px' };
const resultCardStyle = (existing) => ({ padding: '12px', background: rq.input, border: `1px solid ${existing ? rq.success : rq.border}`, borderRadius: rq.radiusSm });
const entityHeaderStyle = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' };
const entityNameStyle = { color: rq.text, fontWeight: 900, fontSize: '14px' };
const badgeStyle = (existing) => ({ fontSize: '11px', color: existing ? rq.success : rq.accentHover, padding: '2px 6px', background: existing ? 'rgba(46,139,87,0.12)' : rq.accentSoft, borderRadius: rq.radiusSm, fontWeight: 900 });
const suggestedNotesStyle = { color: rq.textSecondary, fontSize: '13px', marginBottom: '6px', lineHeight: 1.5 };
const locationHintStyle = { color: rq.muted, fontSize: '12px', fontStyle: 'italic' };
const timeCardStyle = { padding: '12px', background: rq.input, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, display: 'flex', alignItems: 'center', gap: '12px' };
const timeDescriptionStyle = { color: rq.text, fontSize: '14px', fontWeight: 800, margin: 0 };
const timeMetaStyle = { color: rq.muted, fontSize: '12px', margin: '4px 0 0' };
const calendarUpdateStyle = { marginTop: '12px', padding: '12px', background: rq.accentSoft, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' };
const calendarTitleStyle = { color: rq.text, fontSize: '14px', fontWeight: 900, margin: 0 };
const calendarSubtitleStyle = { color: rq.muted, fontSize: '12px', margin: '4px 0 0' };
const emptyStateStyle = { padding: '20px', textAlign: 'center', color: rq.muted };

export default SmartNoteParser;
