import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Heart } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function PlayersTab({ campaignId }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    character_class: '',
    level: 1,
    hp: 10,
    max_hp: 10,
    ac: 10,
    stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
    notes: ''
  });

  useEffect(() => {
    fetchPlayers();
  }, [campaignId]);

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/players`);
      setPlayers(response.data);
    } catch (error) {
      toast.error('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlayer) {
        await axios.put(`${API}/campaigns/${campaignId}/players/${editingPlayer.id}`, formData);
        toast.success('Player updated!');
      } else {
        await axios.post(`${API}/campaigns/${campaignId}/players`, formData);
        toast.success('Player added!');
      }
      fetchPlayers();
      resetForm();
    } catch (error) {
      toast.error('Failed to save player');
    }
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      character_class: player.character_class,
      level: player.level,
      hp: player.hp,
      max_hp: player.max_hp,
      ac: player.ac,
      stats: player.stats,
      notes: player.notes
    });
    setShowDialog(true);
  };

  const handleDelete = async (playerId) => {
    if (!window.confirm('Delete this player?')) return;
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/players/${playerId}`);
      toast.success('Player deleted');
      fetchPlayers();
    } catch (error) {
      toast.error('Failed to delete player');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      character_class: '',
      level: 1,
      hp: 10,
      max_hp: 10,
      ac: 10,
      stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
      notes: ''
    });
    setEditingPlayer(null);
    setShowDialog(false);
  };

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="medieval-heading" style={{ fontSize: '28px', color: '#d4af37' }}>Players</h2>
        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-player-btn" className="btn-primary" style={{ display: 'flex', gap: '8px' }}>
              <Plus size={18} />
              Add Player
            </Button>
          </DialogTrigger>
          <DialogContent className="modal" style={{ maxWidth: '700px' }}>
            <DialogHeader>
              <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#d4af37' }}>
                {editingPlayer ? 'Edit Player' : 'Add Player'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Name</label>
                  <Input
                    data-testid="player-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Class</label>
                  <Input
                    data-testid="player-class-input"
                    value={formData.character_class}
                    onChange={(e) => setFormData({ ...formData, character_class: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Level</label>
                  <Input
                    data-testid="player-level-input"
                    type="number"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>HP</label>
                  <Input
                    data-testid="player-hp-input"
                    type="number"
                    value={formData.hp}
                    onChange={(e) => setFormData({ ...formData, hp: parseInt(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Max HP</label>
                  <Input
                    data-testid="player-maxhp-input"
                    type="number"
                    value={formData.max_hp}
                    onChange={(e) => setFormData({ ...formData, max_hp: parseInt(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>AC</label>
                  <Input
                    data-testid="player-ac-input"
                    type="number"
                    value={formData.ac}
                    onChange={(e) => setFormData({ ...formData, ac: parseInt(e.target.value) })}
                    className="input"
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '12px', fontSize: '14px' }}>Stats</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map(stat => (
                    <div key={stat}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#8b7355', textTransform: 'capitalize' }}>{stat.slice(0, 3).toUpperCase()}</label>
                      <Input
                        data-testid={`player-stat-${stat}-input`}
                        type="number"
                        value={formData.stats[stat]}
                        onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, [stat]: parseInt(e.target.value) } })}
                        className="input"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Notes</label>
                <textarea
                  data-testid="player-notes-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="textarea"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button type="button" className="btn-secondary" onClick={resetForm}>Cancel</Button>
                <Button data-testid="player-submit-btn" type="submit" className="btn-primary">{editingPlayer ? 'Update' : 'Add'} Player</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {players.length === 0 ? (
        <Card className="parchment-dark" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#8b7355' }}>No players added yet. Add your first player!</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {players.map(player => (
            <Card key={player.id} data-testid={`player-card-${player.id}`} className="card">
              <CardHeader>
                <CardTitle className="medieval-heading" style={{ fontSize: '20px', color: '#d4af37', marginBottom: '4px' }}>
                  {player.name}
                </CardTitle>
                <p style={{ fontSize: '14px', color: '#8b7355' }}>
                  {player.character_class} • Level {player.level}
                </p>
              </CardHeader>
              <CardContent>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#8b7355' }}>HP</span>
                    <span className="gold-text" style={{ fontSize: '14px', fontWeight: '600' }}>{player.hp}/{player.max_hp}</span>
                  </div>
                  <div className="hp-bar">
                    <div className="hp-bar-fill" style={{ width: `${(player.hp / player.max_hp) * 100}%` }}></div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <div className="stat-block" style={{ flex: 1 }}>
                    <div className="stat-label">AC</div>
                    <div className="stat-value">{player.ac}</div>
                  </div>
                  <div className="stat-block" style={{ flex: 1 }}>
                    <div className="stat-label">STR</div>
                    <div className="stat-value">{player.stats.strength}</div>
                  </div>
                  <div className="stat-block" style={{ flex: 1 }}>
                    <div className="stat-label">DEX</div>
                    <div className="stat-value">{player.stats.dexterity}</div>
                  </div>
                </div>
                {player.notes && (
                  <p style={{ fontSize: '12px', color: '#8b7355', marginBottom: '12px', fontStyle: 'italic' }}>{player.notes}</p>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button data-testid={`edit-player-btn-${player.id}`} onClick={() => handleEdit(player)} className="btn-secondary" style={{ flex: 1 }}>
                    <Edit size={14} />
                  </Button>
                  <Button data-testid={`delete-player-btn-${player.id}`} onClick={() => handleDelete(player.id)} className="btn-danger">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default PlayersTab;