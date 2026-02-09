import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, Plus, X, ChevronRight, ChevronLeft, RotateCcw, Trash2, Swords } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function CombatCreatorTab({ campaignId }) {
  const [players, setPlayers] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [combatants, setCombatants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  const fetchData = async () => {
    try {
      const [playersRes, npcsRes, scenariosRes] = await Promise.all([
        axios.get(`${API}/campaigns/${campaignId}/players`),
        axios.get(`${API}/campaigns/${campaignId}/npcs`),
        axios.get(`${API}/campaigns/${campaignId}/combat-scenarios`)
      ]);
      setPlayers(playersRes.data);
      setNpcs(npcsRes.data);
      setScenarios(scenariosRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addToCombat = (entity, type) => {
    const newCombatant = {
      id: `${type}-${entity.id}-${Date.now()}`,
      entityId: entity.id,
      name: entity.name,
      type: type,
      initiative: 0,
      hp: entity.hp || entity.max_hp || 10,
      maxHp: entity.max_hp || entity.hp || 10,
      ac: entity.ac || 10,
      conditions: []
    };
    setCombatants([...combatants, newCombatant]);
    toast.success(`Added ${entity.name}`);
  };

  const removeCombatant = (id) => {
    setCombatants(combatants.filter(c => c.id !== id));
  };

  const updateInitiative = (id, value) => {
    setCombatants(combatants.map(c => 
      c.id === id ? { ...c, initiative: parseInt(value) || 0 } : c
    ));
  };

  const saveScenario = async () => {
    if (!scenarioName.trim()) {
      toast.error('Please enter a scenario name');
      return;
    }
    if (combatants.length === 0) {
      toast.error('Add at least one combatant');
      return;
    }

    try {
      if (selectedScenario) {
        await axios.put(`${API}/campaigns/${campaignId}/combat-scenarios/${selectedScenario.id}`, {
          name: scenarioName,
          description: scenarioDescription,
          combatants: combatants
        });
        toast.success('Scenario updated!');
      } else {
        await axios.post(`${API}/campaigns/${campaignId}/combat-scenarios`, {
          name: scenarioName,
          description: scenarioDescription,
          combatants: combatants
        });
        toast.success('Scenario saved!');
      }
      fetchData();
      clearScenario();
    } catch (error) {
      toast.error('Failed to save scenario');
    }
  };

  const loadScenario = (scenario) => {
    setSelectedScenario(scenario);
    setScenarioName(scenario.name);
    setScenarioDescription(scenario.description);
    setCombatants(scenario.combatants);
    toast.success(`Loaded: ${scenario.name}`);
  };

  const deleteScenario = async (scenarioId) => {
    if (!window.confirm('Delete this combat scenario?')) return;
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/combat-scenarios/${scenarioId}`);
      toast.success('Scenario deleted');
      fetchData();
      if (selectedScenario?.id === scenarioId) {
        clearScenario();
      }
    } catch (error) {
      toast.error('Failed to delete scenario');
    }
  };

  const clearScenario = () => {
    setSelectedScenario(null);
    setScenarioName('');
    setScenarioDescription('');
    setCombatants([]);
  };

  const filteredEntities = () => {
    const search = searchTerm.toLowerCase();
    return {
      players: players.filter(p => p.name.toLowerCase().includes(search)),
      npcs: npcs.filter(n => n.name.toLowerCase().includes(search))
    };
  };

  if (loading) return <div className="loading-spinner"></div>;

  const { players: filteredPlayers, npcs: filteredNPCs } = filteredEntities();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
      {/* Saved Scenarios List */}
      <div>
        <h3 className="medieval-heading" style={{ fontSize: '20px', color: '#d4af37', marginBottom: '16px' }}>
          Saved Scenarios
        </h3>
        {scenarios.length === 0 ? (
          <Card className="parchment-dark" style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#8b7355' }}>No scenarios yet</p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {scenarios.map(scenario => (
              <Card
                key={scenario.id}
                data-testid={`scenario-${scenario.id}`}
                className="card"
                style={{
                  cursor: 'pointer',
                  background: selectedScenario?.id === scenario.id ? 'rgba(212, 175, 55, 0.2)' : 'rgba(45, 36, 22, 0.9)',
                  border: selectedScenario?.id === scenario.id ? '2px solid #d4af37' : '1px solid #5a4a2f'
                }}
                onClick={() => loadScenario(scenario)}
              >
                <CardContent style={{ padding: '12px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <h4 style={{ color: '#d4af37', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                      {scenario.name}
                    </h4>
                    {scenario.description && (
                      <p style={{ fontSize: '12px', color: '#8b7355', marginBottom: '8px' }}>
                        {scenario.description}
                      </p>
                    )}
                    <p style={{ fontSize: '11px', color: '#8b7355' }}>
                      {scenario.combatants.length} combatants
                    </p>
                  </div>
                  <Button
                    data-testid={`delete-scenario-${scenario.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteScenario(scenario.id);
                    }}
                    className="btn-danger"
                    style={{ width: '100%', padding: '6px', fontSize: '12px' }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Main Creator Area */}
      <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="medieval-heading" style={{ fontSize: '28px', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Swords size={28} />
            Combat Creator
          </h2>
          <p style={{ fontSize: '14px', color: '#8b7355', marginTop: '4px' }}>Pre-build combat encounters for quick deployment</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            data-testid="toggle-add-panel-btn"
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="btn-primary"
            style={{ display: 'flex', gap: '8px' }}
          >
            <Plus size={18} />
            {showAddPanel ? 'Hide' : 'Add Combatants'}
          </Button>
          {combatants.length > 0 && (
            <>
              <Button
                data-testid="clear-combatants-btn"
                onClick={clearScenario}
                className="btn-secondary"
              >
                <RotateCcw size={16} />
              </Button>
              <Button
                data-testid="save-scenario-btn"
                onClick={saveScenario}
                className="btn-primary"
                style={{ display: 'flex', gap: '8px' }}
              >
                <Save size={16} />
                Save Scenario
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Scenario Name & Description */}
      <Card className="parchment-dark" style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#d4af37', fontSize: '14px', fontWeight: '600' }}>
              Scenario Name *
            </label>
            <Input
              data-testid="scenario-name-input"
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="e.g., Goblin Ambush"
              className="input"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#d4af37', fontSize: '14px', fontWeight: '600' }}>
              Description
            </label>
            <Input
              data-testid="scenario-description-input"
              type="text"
              value={scenarioDescription}
              onChange={(e) => setScenarioDescription(e.target.value)}
              placeholder="Brief description of the encounter"
              className="input"
            />
          </div>
        </div>
      </Card>

      {/* Add Combatants Panel */}
      {showAddPanel && (
        <Card className="parchment-dark" style={{ marginBottom: '24px', padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8b7355' }} />
              <Input
                data-testid="combat-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search players, NPCs, monsters..."
                className="input"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
            {/* Players */}
            {filteredPlayers.length > 0 && (
              <div>
                <h3 className="gold-text" style={{ fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>Players</h3>
                {filteredPlayers.map(player => (
                  <div
                    key={player.id}
                    data-testid={`add-player-${player.id}`}
                    onClick={() => addToCombat(player, 'player')}
                    style={{
                      padding: '10px',
                      background: 'rgba(20, 16, 12, 0.6)',
                      border: '1px solid #5a4a2f',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)';
                      e.currentTarget.style.borderColor = '#d4af37';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(20, 16, 12, 0.6)';
                      e.currentTarget.style.borderColor = '#5a4a2f';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#e8dcc4', fontSize: '14px', fontWeight: '600' }}>{player.name}</span>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#8b7355' }}>
                        <span>HP: {player.hp}/{player.max_hp}</span>
                        <span>AC: {player.ac}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* NPCs */}
            {filteredNPCs.length > 0 && (
              <div>
                <h3 className="gold-text" style={{ fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>NPCs & Monsters</h3>
                {filteredNPCs.map(npc => (
                  <div
                    key={npc.id}
                    data-testid={`add-npc-${npc.id}`}
                    onClick={() => addToCombat(npc, 'npc')}
                    style={{
                      padding: '10px',
                      background: 'rgba(20, 16, 12, 0.6)',
                      border: '1px solid #5a4a2f',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)';
                      e.currentTarget.style.borderColor = '#d4af37';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(20, 16, 12, 0.6)';
                      e.currentTarget.style.borderColor = '#5a4a2f';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#e8dcc4', fontSize: '14px', fontWeight: '600' }}>{npc.name}</span>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#8b7355' }}>
                        <span>HP: {npc.hp}</span>
                        <span>AC: {npc.ac}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Initiative Order Display */}
      {combatants.length === 0 ? (
        <Card className="parchment-dark" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Swords size={64} style={{ color: '#5a4a2f', margin: '0 auto 24px' }} />
          <h3 className="medieval-heading" style={{ fontSize: '24px', color: '#d4af37', marginBottom: '12px' }}>
            No Active Combat
          </h3>
          <p style={{ color: '#8b7355', marginBottom: '24px' }}>
            Click "Add Combatants" to begin tracking initiative
          </p>
        </Card>
      ) : (
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          overflowX: 'auto', 
          paddingBottom: '20px',
          scrollbarWidth: 'thin'
        }}>
          {combatants.map((combatant, index) => (
            <Card
              key={combatant.id}
              data-testid={`combatant-card-${combatant.id}`}
              className="card"
              style={{
                minWidth: '280px',
                maxWidth: '280px',
                background: index === currentTurn ? 'rgba(212, 175, 55, 0.2)' : 'rgba(45, 36, 22, 0.9)',
                border: index === currentTurn ? '3px solid #d4af37' : '1px solid #5a4a2f',
                boxShadow: index === currentTurn ? '0 0 20px rgba(212, 175, 55, 0.4)' : '0 8px 32px rgba(0,0,0,0.4)',
                position: 'relative'
              }}
            >
              {index === currentTurn && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#d4af37',
                  color: '#1a1410',
                  padding: '4px 16px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  ACTIVE TURN
                </div>
              )}
              <CardHeader style={{ paddingBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <CardTitle className="medieval-heading" style={{ fontSize: '18px', color: '#d4af37', marginBottom: '4px' }}>
                      {combatant.name}
                    </CardTitle>
                    <span style={{
                      fontSize: '11px',
                      color: combatant.type === 'player' ? '#4ade80' : '#ef4444',
                      background: combatant.type === 'player' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      textTransform: 'uppercase',
                      fontWeight: '600'
                    }}>
                      {combatant.type}
                    </span>
                  </div>
                  <Button
                    data-testid={`remove-combatant-${combatant.id}`}
                    onClick={() => removeCombatant(combatant.id)}
                    className="btn-icon"
                    style={{ padding: '4px' }}
                  >
                    <X size={16} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#8b7355', marginBottom: '6px' }}>Initiative</label>
                  <Input
                    data-testid={`initiative-input-${combatant.id}`}
                    type="number"
                    value={combatant.initiative}
                    onChange={(e) => updateInitiative(combatant.id, e.target.value)}
                    className="input"
                    style={{ fontSize: '16px', fontWeight: '700', textAlign: 'center' }}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#8b7355', marginBottom: '6px' }}>
                    HP: {combatant.hp}/{combatant.maxHp}
                  </label>
                  <div className="hp-bar" style={{ marginBottom: '8px' }}>
                    <div 
                      className="hp-bar-fill" 
                      style={{ width: `${(combatant.hp / combatant.maxHp) * 100}%` }}
                    ></div>
                  </div>
                  <Input
                    data-testid={`hp-input-${combatant.id}`}
                    type="number"
                    value={combatant.hp}
                    onChange={(e) => updateHP(combatant.id, e.target.value)}
                    className="input"
                    min="0"
                    max={combatant.maxHp}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div className="stat-block" style={{ flex: 1 }}>
                    <div className="stat-label">AC</div>
                    <div className="stat-value" style={{ fontSize: '16px' }}>{combatant.ac}</div>
                  </div>
                  <div className="stat-block" style={{ flex: 1 }}>
                    <div className="stat-label">Order</div>
                    <div className="stat-value" style={{ fontSize: '16px' }}>#{index + 1}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default CombatTrackerTab;
