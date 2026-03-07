import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Sparkles, Users, Skull, Shield, Swords, Loader, Save, Plus, 
  RefreshCw, Zap, AlertTriangle, CheckCircle, Coins
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DIFFICULTY_LEVELS = [
  { id: 'easy', label: 'Easy', color: '#22c55e', description: 'Low risk, good for new players or warm-up' },
  { id: 'medium', label: 'Medium', color: '#eab308', description: 'Moderate challenge, resource drain' },
  { id: 'hard', label: 'Hard', color: '#f97316', description: 'Dangerous, may need tactics and teamwork' },
  { id: 'deadly', label: 'Deadly', color: '#ef4444', description: 'High mortality risk, retreat may be wise' },
];

const ENCOUNTER_TYPES = [
  { id: 'combat', label: 'Combat', icon: Swords },
  { id: 'ambush', label: 'Ambush', icon: AlertTriangle },
  { id: 'boss', label: 'Boss Fight', icon: Skull },
  { id: 'horde', label: 'Horde', icon: Users },
];

const ENVIRONMENTS = [
  'Forest', 'Cave', 'Dungeon', 'Castle', 'Swamp', 'Mountain', 
  'Desert', 'Urban', 'Ruins', 'Underdark', 'Coastal', 'Arctic'
];

function EncounterGeneratorTab({ campaignId }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Generator settings
  const [partyLevel, setPartyLevel] = useState(1);
  const [partySize, setPartySize] = useState(4);
  const [difficulty, setDifficulty] = useState('medium');
  const [encounterType, setEncounterType] = useState('combat');
  const [environment, setEnvironment] = useState('Dungeon');
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Generated encounter
  const [generatedEncounter, setGeneratedEncounter] = useState(null);

  useEffect(() => {
    fetchPlayers();
  }, [campaignId]);

  const fetchPlayers = async () => {
    try {
      const res = await axios.get(`${API}/campaigns/${campaignId}/players`);
      setPlayers(res.data);
      
      // Auto-calculate party stats
      if (res.data.length > 0) {
        setPartySize(res.data.length);
        const avgLevel = Math.round(res.data.reduce((sum, p) => sum + (p.level || 1), 0) / res.data.length);
        setPartyLevel(avgLevel);
      }
    } catch (error) {
      toast.error('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const generateEncounter = async () => {
    setGenerating(true);
    
    const prompt = `Generate a ${difficulty} difficulty ${encounterType} encounter for a fantasy TTRPG party of ${partySize} level ${partyLevel} adventurers in a ${environment} setting.
${customPrompt ? `Additional context: ${customPrompt}` : ''}

Please provide a JSON response with this exact structure:
{
  "name": "Encounter name",
  "description": "2-3 sentence description of the encounter setup and narrative",
  "enemies": [
    {
      "name": "Monster name",
      "count": 1,
      "hp": 30,
      "ac": 14,
      "cr": "1",
      "special_abilities": "Brief note on key abilities",
      "loot": [
        {"name": "Item name", "quantity": 1, "value": "10 gp", "item_type": "misc", "is_magical": false}
      ]
    }
  ],
  "tactics": "How the enemies will fight",
  "terrain_features": ["List of", "terrain features"],
  "estimated_xp": 500,
  "difficulty_rating": "${difficulty}"
}`;

    try {
      const res = await axios.post(`${API}/ai/generate`, {
        prompt: prompt,
        generation_type: 'encounter'
      });
      
      // Parse the AI response
      let encounter;
      try {
        // Try to extract JSON from the response
        const jsonMatch = res.data.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          encounter = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch (parseError) {
        // Fallback to a default structure if parsing fails
        encounter = {
          name: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ${environment} Encounter`,
          description: res.data.content.substring(0, 200),
          enemies: [
            { name: 'Goblin', count: partySize, hp: 7, ac: 15, cr: '1/4', loot: [] }
          ],
          tactics: 'Standard combat tactics',
          terrain_features: ['Difficult terrain', 'Cover available'],
          estimated_xp: partyLevel * partySize * 50,
          difficulty_rating: difficulty
        };
      }
      
      setGeneratedEncounter(encounter);
      toast.success('Encounter generated!');
    } catch (error) {
      toast.error('Failed to generate encounter');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const saveAsScenario = async () => {
    if (!generatedEncounter) return;
    setSaving(true);
    
    try {
      // Convert generated enemies to combatant format
      const combatants = [];
      const tokens = [];
      let tokenX = 200;
      
      generatedEncounter.enemies.forEach((enemy, enemyIdx) => {
        for (let i = 0; i < enemy.count; i++) {
          const id = `enemy-${enemyIdx}-${i}-${Date.now()}`;
          combatants.push({
            id,
            name: enemy.count > 1 ? `${enemy.name} ${i + 1}` : enemy.name,
            type: 'npc',
            hp: enemy.hp,
            maxHp: enemy.hp,
            ac: enemy.ac,
            initiative: 0,
            conditions: [],
            tokenColor: '#ef4444',
            tokenSize: 40,
            loot: enemy.loot || []
          });
          
          tokens.push({
            id,
            name: enemy.count > 1 ? `${enemy.name} ${i + 1}` : enemy.name,
            color: '#ef4444',
            size: 40,
            x: tokenX,
            y: 200 + Math.floor(i / 4) * 50,
            isEnemy: true
          });
          tokenX += 50;
        }
      });
      
      const scenarioData = {
        name: generatedEncounter.name,
        description: generatedEncounter.description,
        combatants,
        tokens,
        show_grid: true,
        grid_size: 40
      };
      
      await axios.post(`${API}/campaigns/${campaignId}/combat-scenarios`, scenarioData);
      toast.success('Saved to Combat Creator!');
    } catch (error) {
      toast.error('Failed to save encounter');
    } finally {
      setSaving(false);
    }
  };

  const getDifficultyIcon = (diff) => {
    switch (diff) {
      case 'easy': return CheckCircle;
      case 'medium': return Zap;
      case 'hard': return AlertTriangle;
      case 'deadly': return Skull;
      default: return Zap;
    }
  };

  if (loading) return <div className="loading-spinner" />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Sparkles size={28} style={{ color: '#eab308' }} />
        <div>
          <h2 style={{ fontSize: '22px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '800' }}>
            Random Encounter Generator
          </h2>
          <p style={{ fontSize: '13px', color: '#67e8f9' }}>
            AI-powered balanced encounters based on your party
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left Column - Settings */}
        <div>
          {/* Party Info */}
          <div className="glow-panel" style={{ marginBottom: '16px', background: 'rgba(74, 125, 255, 0.1)', borderColor: '#4a7dff' }}>
            <h3 style={{ fontSize: '14px', color: '#4a7dff', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} /> Party Configuration
            </h3>
            {players.length > 0 && (
              <p style={{ fontSize: '11px', color: '#67e8f9', marginBottom: '12px' }}>
                Auto-detected: {players.length} players, avg level {Math.round(players.reduce((s, p) => s + (p.level || 1), 0) / players.length)}
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#67e8f9', marginBottom: '4px', fontWeight: '600' }}>Party Size</label>
                <Input
                  type="number"
                  value={partySize}
                  onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                  min="1"
                  max="10"
                  className="input-glow"
                  style={{ textAlign: 'center', fontWeight: '700' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#67e8f9', marginBottom: '4px', fontWeight: '600' }}>Average Level</label>
                <Input
                  type="number"
                  value={partyLevel}
                  onChange={(e) => setPartyLevel(parseInt(e.target.value) || 1)}
                  min="1"
                  max="20"
                  className="input-glow"
                  style={{ textAlign: 'center', fontWeight: '700' }}
                />
              </div>
            </div>
          </div>

          {/* Difficulty */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#67e8f9', marginBottom: '8px', fontWeight: '700' }}>Difficulty</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {DIFFICULTY_LEVELS.map(diff => {
                const DiffIcon = getDifficultyIcon(diff.id);
                return (
                  <button
                    key={diff.id}
                    onClick={() => setDifficulty(diff.id)}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '10px',
                      border: `2px solid ${difficulty === diff.id ? diff.color : '#1e40af'}`,
                      background: difficulty === diff.id ? `${diff.color}20` : 'rgba(10, 10, 40, 0.5)',
                      color: difficulty === diff.id ? diff.color : '#94a3b8',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <DiffIcon size={18} />
                    {diff.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Encounter Type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#67e8f9', marginBottom: '8px', fontWeight: '700' }}>Encounter Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {ENCOUNTER_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setEncounterType(type.id)}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '10px',
                    border: `2px solid ${encounterType === type.id ? '#22c55e' : '#1e40af'}`,
                    background: encounterType === type.id ? 'rgba(34, 197, 94, 0.15)' : 'rgba(10, 10, 40, 0.5)',
                    color: encounterType === type.id ? '#22c55e' : '#94a3b8',
                    fontWeight: '700',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <type.icon size={18} />
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Environment */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#67e8f9', marginBottom: '8px', fontWeight: '700' }}>Environment</label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="input-glow"
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}
            >
              {ENVIRONMENTS.map(env => (
                <option key={env} value={env}>{env}</option>
              ))}
            </select>
          </div>

          {/* Custom Prompt */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#67e8f9', marginBottom: '8px', fontWeight: '700' }}>Additional Details (Optional)</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="textarea-glow"
              style={{ minHeight: '80px', fontSize: '13px' }}
              placeholder="E.g., 'The party just recovered from a fight' or 'Include undead creatures' or 'Make it a puzzle encounter'"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateEncounter}
            disabled={generating}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              background: 'linear-gradient(180deg, #eab308 0%, #ca8a04 100%)',
              color: '#000',
              boxShadow: '0 0 30px rgba(234, 179, 8, 0.4)'
            }}
          >
            {generating ? (
              <><Loader size={20} className="animate-spin" /> Generating...</>
            ) : (
              <><Sparkles size={20} /> Generate Encounter</>
            )}
          </Button>
        </div>

        {/* Right Column - Generated Encounter */}
        <div>
          {!generatedEncounter ? (
            <div className="glow-panel" style={{ padding: '60px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Swords size={64} style={{ color: '#1e40af', marginBottom: '20px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '700', marginBottom: '8px' }}>
                No Encounter Generated
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', maxWidth: '300px' }}>
                Configure your settings and click "Generate Encounter" to create a balanced combat scenario
              </p>
            </div>
          ) : (
            <div className="glow-panel" style={{ borderColor: DIFFICULTY_LEVELS.find(d => d.id === generatedEncounter.difficulty_rating)?.color || '#eab308' }}>
              {/* Encounter Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '800', marginBottom: '6px' }}>
                    {generatedEncounter.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '700',
                      background: `${DIFFICULTY_LEVELS.find(d => d.id === generatedEncounter.difficulty_rating)?.color || '#eab308'}30`,
                      color: DIFFICULTY_LEVELS.find(d => d.id === generatedEncounter.difficulty_rating)?.color || '#eab308',
                      border: `1px solid ${DIFFICULTY_LEVELS.find(d => d.id === generatedEncounter.difficulty_rating)?.color || '#eab308'}`
                    }}>
                      {generatedEncounter.difficulty_rating?.toUpperCase() || 'MEDIUM'}
                    </span>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: 'rgba(34, 197, 94, 0.2)',
                      color: '#22c55e'
                    }}>
                      ~{generatedEncounter.estimated_xp || 0} XP
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button onClick={generateEncounter} disabled={generating} className="btn-outline" style={{ display: 'flex', gap: '6px', padding: '8px 12px' }}>
                    <RefreshCw size={14} /> Regenerate
                  </Button>
                  <Button onClick={saveAsScenario} disabled={saving} className="btn-primary" style={{ display: 'flex', gap: '6px', padding: '8px 12px' }}>
                    {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />} Save to Combat
                  </Button>
                </div>
              </div>

              {/* Description */}
              <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px', background: 'rgba(10, 10, 40, 0.5)', padding: '14px', borderRadius: '10px', border: '1px solid #1e40af' }}>
                {generatedEncounter.description}
              </p>

              {/* Enemies */}
              <h4 style={{ fontSize: '14px', color: '#ef4444', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Skull size={16} /> Enemies
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {generatedEncounter.enemies?.map((enemy, idx) => (
                  <div key={idx} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '2px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px', color: '#ffffff', fontWeight: '700' }}>{enemy.name}</span>
                        {enemy.count > 1 && (
                          <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>
                            x{enemy.count}
                          </span>
                        )}
                      </div>
                      <span style={{ color: '#67e8f9', fontSize: '12px', fontWeight: '600' }}>CR {enemy.cr}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Shield size={14} style={{ color: '#4a7dff' }} />
                        <span style={{ color: '#fff', fontSize: '13px', fontWeight: '700' }}>AC {enemy.ac}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: '700' }}>HP {enemy.hp}</span>
                      </div>
                    </div>
                    {enemy.special_abilities && (
                      <p style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>{enemy.special_abilities}</p>
                    )}
                    {enemy.loot?.length > 0 && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <span style={{ fontSize: '11px', color: '#eab308', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Coins size={12} /> Loot: {enemy.loot.map(l => `${l.name}${l.quantity > 1 ? ` x${l.quantity}` : ''}`).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Tactics */}
              {generatedEncounter.tactics && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '13px', color: '#a855f7', fontWeight: '700', marginBottom: '8px' }}>Tactics</h4>
                  <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.5' }}>{generatedEncounter.tactics}</p>
                </div>
              )}

              {/* Terrain */}
              {generatedEncounter.terrain_features?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '13px', color: '#22c55e', fontWeight: '700', marginBottom: '8px' }}>Terrain Features</h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {generatedEncounter.terrain_features.map((feature, idx) => (
                      <span key={idx} style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', color: '#22c55e' }}>
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EncounterGeneratorTab;
