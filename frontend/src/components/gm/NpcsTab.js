import React from 'react';
import { UserCircle, Shuffle, UserPlus, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NPCQuickReference from '@/components/NPCQuickReference';
import QuickNpcGenerator from './QuickNpcGenerator';

export default function NpcsTab({ theme, campaignId, nameRace, setNameRace, nameGender, setNameGender, generatedName, generateRandomName, saveNameAsNPC, savingNPC, savedNames }) {
  return (
    <div>
      <h2 style={{ fontSize: '22px', color: theme.text.primary, fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <UserCircle size={24} style={{ color: theme.accent.orange }} /> NPCs & Name Generator
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Left: Saved NPCs */}
        <div style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', color: theme.accent.gm, fontWeight: '600', marginBottom: '16px' }}>Saved NPCs</h3>
          <NPCQuickReference campaignId={campaignId} />
        </div>
        
        {/* Right: Name Generator */}
        <div>
          <div style={{ background: theme.bg.card, border: `1px solid ${theme.accent.orange}`, borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', color: theme.accent.orange, fontWeight: '600', marginBottom: '20px' }}>Generate NPC Name</h3>
            
            {/* Race Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.text.secondary, fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Race</label>
              <select value={nameRace} onChange={(e) => setNameRace(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', background: 'rgba(15, 10, 30, 0.6)', border: `1px solid ${theme.border}`, borderRadius: '10px', color: theme.text.primary, fontSize: '15px', cursor: 'pointer' }}>
                <option value="human">Human</option>
                <option value="elf">Elf</option>
                <option value="dwarf">Dwarf</option>
                <option value="halfling">Halfling</option>
                <option value="orc">Orc / Half-Orc</option>
                <option value="tiefling">Tiefling</option>
              </select>
            </div>
            
            {/* Gender Selection */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: theme.text.secondary, fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Gender</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['any', 'male', 'female'].map(g => (
                  <button key={g} onClick={() => setNameGender(g)}
                    style={{ flex: 1, padding: '12px', background: nameGender === g ? 'rgba(249, 115, 22, 0.2)' : 'rgba(15, 10, 30, 0.5)', border: `1px solid ${nameGender === g ? theme.accent.orange : theme.border}`, borderRadius: '8px', color: nameGender === g ? theme.accent.orange : theme.text.secondary, fontSize: '14px', fontWeight: '500', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s' }}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            
            <Button onClick={generateRandomName} className="btn-primary" data-testid="generate-name-btn"
              style={{ width: '100%', padding: '16px', fontSize: '16px', background: theme.gradient, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <Shuffle size={20} /> Generate Name
            </Button>
          </div>
          
          {/* Generated Name Display */}
          {generatedName && (
            <div style={{ background: 'rgba(212, 160, 23, 0.1)', border: `1px solid ${theme.accent.primary}`, borderRadius: '12px', padding: '24px', textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ color: theme.text.secondary, fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Generated Name</p>
              <h3 style={{ fontSize: '28px', color: theme.text.primary, fontWeight: '600', marginBottom: '8px', background: theme.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {generatedName.fullName}
              </h3>
              <p style={{ color: theme.accent.secondary, fontSize: '15px', marginBottom: '20px' }}>
                {generatedName.gender} {generatedName.race.charAt(0).toUpperCase() + generatedName.race.slice(1)}
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button onClick={generateRandomName} className="btn-secondary" style={{ flex: 1, borderRadius: '10px', padding: '12px', fontSize: '14px' }}>
                  <Shuffle size={16} style={{ marginRight: '6px' }} /> Reroll
                </Button>
                <Button onClick={saveNameAsNPC} disabled={savingNPC} className="btn-primary" data-testid="save-as-npc-btn"
                  style={{ flex: 1, borderRadius: '10px', padding: '12px', fontSize: '14px', background: `linear-gradient(135deg, ${theme.accent.gm} 0%, #D97706 100%)` }}>
                  {savingNPC ? <Loader className="animate-spin" size={16} /> : <><UserPlus size={16} style={{ marginRight: '6px' }} /> Save as NPC</>}
                </Button>
              </div>
            </div>
          )}
          
          {/* Saved Names This Session */}
          {savedNames.length > 0 && (
            <div style={{ background: theme.bg.card, border: `1px solid ${theme.accent.primary}`, borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '14px', color: theme.accent.gm, fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={16} /> Saved This Session ({savedNames.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                {savedNames.map((name, index) => (
                  <div key={index} style={{ padding: '10px 14px', background: theme.accent.gmSubtle, border: `1px solid ${theme.accent.gm}`, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ color: theme.text.primary, fontWeight: '500', fontSize: '14px' }}>{name.fullName}</span>
                      <span style={{ color: theme.text.secondary, fontSize: '12px', marginLeft: '8px' }}>{name.race.charAt(0).toUpperCase() + name.race.slice(1)}</span>
                    </div>
                    <span style={{ background: theme.accent.gm, color: '#000', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>SAVED</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick NPC Generator */}
      <div style={{ marginTop: '20px', background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', color: theme.accent.gm, fontWeight: '600', marginBottom: '16px' }}>Quick NPC Generator</h3>
        <QuickNpcGenerator theme={theme} />
      </div>
    </div>
  );
}
