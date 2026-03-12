import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Sparkles, Loader, Check, X, Clock, MapPin, User, AlertCircle, Calendar } from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

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
      const response = await axios.post(`${API}/campaigns/${campaignId}/notes/parse`, {
        note_text: noteText,
        campaign_id: campaignId
      });

      setParseResults(response.data);
      
      const entityCount = response.data.entities_mentioned?.length || 0;
      const timeCount = response.data.time_changes?.length || 0;
      
      toast.success('Smart parsing complete!', {
        description: `Found ${entityCount} entities and ${timeCount} time changes`
      });
    } catch (error) {
      toast.error('Failed to parse notes', {
        description: error.response?.data?.detail || 'Please try again'
      });
    } finally {
      setParsing(false);
    }
  };

  const handleUpdateEntity = async (entity) => {
    setApplyingUpdates(prev => new Set(prev).add(entity.name));

    try {
      if (entity.existing_id) {
        // Update existing entity
        if (entity.entity_type === 'npc') {
          const existing = await axios.get(`${API}/campaigns/${campaignId}/npcs/${entity.existing_id}`);
          const currentNotes = existing.data.notes || '';
          const updatedNotes = currentNotes 
            ? `${currentNotes}\n\n[Session Update]: ${entity.suggested_notes}`
            : entity.suggested_notes;

          await axios.put(`${API}/campaigns/${campaignId}/npcs/${entity.existing_id}`, {
            notes: updatedNotes
          });
          
          toast.success(`Updated ${entity.name}`, {
            description: 'Notes appended successfully'
          });
        } else if (entity.entity_type === 'location') {
          const existing = await axios.get(`${API}/campaigns/${campaignId}/locations/${entity.existing_id}`);
          const currentNotes = existing.data.notes || '';
          const updatedNotes = currentNotes 
            ? `${currentNotes}\n\n[Session Update]: ${entity.suggested_notes}`
            : entity.suggested_notes;

          await axios.put(`${API}/campaigns/${campaignId}/locations/${entity.existing_id}`, {
            notes: updatedNotes
          });
          
          toast.success(`Updated ${entity.name}`, {
            description: 'Notes appended successfully'
          });
        }
      } else {
        // Create new entity
        if (entity.entity_type === 'npc') {
          await axios.post(`${API}/campaigns/${campaignId}/npcs`, {
            name: entity.name,
            description: entity.suggested_notes,
            notes: '',
            location: entity.suggested_location || '',
            hp: 10,
            ac: 10
          });
          
          toast.success(`Created new NPC: ${entity.name}`, {
            description: 'Added to your campaign'
          });
        } else if (entity.entity_type === 'location') {
          await axios.post(`${API}/campaigns/${campaignId}/locations`, {
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

      // Remove from pending updates
      setApplyingUpdates(prev => {
        const next = new Set(prev);
        next.delete(entity.name);
        return next;
      });

      if (onUpdateApplied) onUpdateApplied();
    } catch (error) {
      toast.error(`Failed to update ${entity.name}`, {
        description: error.response?.data?.detail || 'Please try again'
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
      await axios.put(`${API}/campaigns/${campaignId}/calendar`, {
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
        description: error.response?.data?.detail || 'Please try again'
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

    // Apply all entity updates
    for (const entity of parseResults.entities_mentioned || []) {
      await handleUpdateEntity(entity);
    }

    // Apply calendar update
    if (parseResults.calendar_update_suggested && parseResults.new_calendar_date) {
      await handleUpdateCalendar();
    }

    toast.success('All updates applied!', {
      description: 'Your campaign has been updated'
    });
  };

  return (
    <div>
      <Card className="glow-card" style={{ marginBottom: '20px' }}>
        <CardHeader>
          <CardTitle className="medieval-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7' }}>
            <Sparkles size={20} />
            Smart Note Parser
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
            Let AI analyze your session notes and automatically extract NPCs, locations, and time changes.
          </p>

          <Button
            onClick={handleParse}
            disabled={parsing || !noteText || noteText.trim().length < 10}
            className="btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {parsing ? (
              <>
                <Loader className="spin" size={18} />
                Analyzing Notes...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Parse Session Notes
              </>
            )}
          </Button>

          {/* Parse Results */}
          {parseResults && (
            <div style={{ marginTop: '24px' }}>
              {/* Entities Found */}
              {parseResults.entities_mentioned && parseResults.entities_mentioned.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '400' }}>
                      Entities Found ({parseResults.entities_mentioned.length})
                    </h4>
                    <Button
                      onClick={handleApplyAll}
                      className="btn-secondary"
                      style={{ fontSize: '13px', padding: '6px 12px' }}
                    >
                      Apply All
                    </Button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {parseResults.entities_mentioned.map((entity, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '12px',
                          background: 'rgba(30, 41, 59, 0.5)',
                          border: `2px solid ${entity.existing_id ? '#22c55e' : '#4a7dff'}`,
                          borderRadius: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              {entity.entity_type === 'npc' ? (
                                <User size={16} color={entity.existing_id ? '#22c55e' : '#4a7dff'} />
                              ) : (
                                <MapPin size={16} color={entity.existing_id ? '#22c55e' : '#4a7dff'} />
                              )}
                              <span style={{ color: '#ffffff', fontWeight: '400', fontSize: '14px' }}>
                                {entity.name}
                              </span>
                              <span style={{ 
                                fontSize: '11px', 
                                color: entity.existing_id ? '#22c55e' : '#4a7dff',
                                padding: '2px 6px',
                                background: entity.existing_id ? 'rgba(34, 197, 94, 0.1)' : 'rgba(74, 125, 255, 0.1)',
                                borderRadius: '4px'
                              }}>
                                {entity.existing_id ? 'Existing' : 'New'} {entity.entity_type.toUpperCase()}
                              </span>
                            </div>
                            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>
                              {entity.suggested_notes}
                            </p>
                            {entity.suggested_location && (
                              <p style={{ color: '#67e8f9', fontSize: '12px', fontStyle: 'italic' }}>
                                📍 {entity.suggested_location}
                              </p>
                            )}
                          </div>
                          <Button
                            onClick={() => handleUpdateEntity(entity)}
                            disabled={applyingUpdates.has(entity.name)}
                            className="btn-primary"
                            style={{ marginLeft: '12px', fontSize: '13px', padding: '6px 12px' }}
                          >
                            {applyingUpdates.has(entity.name) ? (
                              <Loader className="spin" size={14} />
                            ) : (
                              entity.existing_id ? 'Update' : 'Create'
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Changes */}
              {parseResults.time_changes && parseResults.time_changes.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '400', marginBottom: '12px' }}>
                    Time Changes ({parseResults.time_changes.length})
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {parseResults.time_changes.map((timeChange, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '12px',
                          background: 'rgba(168, 85, 247, 0.1)',
                          border: '2px solid #a855f7',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <Clock size={18} color="#a855f7" />
                        <div style={{ flex: 1 }}>
                          <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '400' }}>
                            {timeChange.description}
                          </p>
                          <p style={{ color: '#94a3b8', fontSize: '12px' }}>
                            Type: {timeChange.type} | Amount: {timeChange.amount} {timeChange.type === 'days' ? 'days' : 'hours'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {parseResults.calendar_update_suggested && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '2px solid #22c55e',
                      borderRadius: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Calendar size={18} color="#22c55e" />
                        <div>
                          <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '400' }}>
                            Update Campaign Calendar
                          </p>
                          <p style={{ color: '#94a3b8', fontSize: '12px' }}>
                            Advance time based on session events
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleUpdateCalendar}
                        disabled={applyingUpdates.has('calendar')}
                        className="btn-primary"
                        style={{ fontSize: '13px', padding: '6px 12px' }}
                      >
                        {applyingUpdates.has('calendar') ? (
                          <Loader className="spin" size={14} />
                        ) : (
                          'Update Calendar'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* No results found */}
              {(!parseResults.entities_mentioned || parseResults.entities_mentioned.length === 0) &&
               (!parseResults.time_changes || parseResults.time_changes.length === 0) && (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#94a3b8'
                }}>
                  <AlertCircle size={32} color="#94a3b8" style={{ marginBottom: '12px' }} />
                  <p>No entities or time changes detected in these notes.</p>
                  <p style={{ fontSize: '13px', marginTop: '8px' }}>
                    Try mentioning NPCs, locations, or time passing (e.g., "took a long rest").
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SmartNoteParser;
