import React, { useCallback, useState } from 'react';
import { Copy, Dices, RefreshCw, Save, Shield, Sword, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { generateCombatReadyNpc, NPC_COMBAT_PRESETS, npcToClipboardText } from '@/lib/npcStatBlockFactory';

const RACES = ['Human','Elf','Dwarf','Halfling','Gnome','Tiefling','Half-Orc','Half-Elf','Dragonborn'];

export default function QuickNpcGenerator({ theme, campaignId }) {
  const [npc, setNpc] = useState(null);
  const [presetId, setPresetId] = useState('guard');
  const [race, setRace] = useState('');
  const [saving, setSaving] = useState(false);

  const generate = useCallback(() => {
    setNpc(generateCombatReadyNpc({ presetId, race }));
  }, [presetId, race]);

  const copyToClipboard = () => {
    if (!npc) return;
    navigator.clipboard.writeText(npcToClipboardText(npc));
    toast.success('Combat-ready NPC copied to clipboard');
  };

  const saveNpc = async () => {
    if (!npc || !campaignId) {
      toast.error('Generate an NPC inside a campaign first');
      return;
    }
    setSaving(true);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/npcs`, npc);
      setNpc(response.data);
      toast.success(`${response.data.name || npc.name} saved as combat-ready NPC`, { description: 'Stats, skills, attacks, abilities, HP and AC were saved.' });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save NPC');
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { fontSize: '10px', fontWeight: 900, color: theme.text?.muted || 'rgba(255,255,255,0.58)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 };
  const inputStyle = { minHeight: 36, width: '100%', background: '#242424', border: `1px solid ${theme.border || 'rgba(255,255,255,0.16)'}`, color: theme.text?.primary || '#fff', padding: '0 10px', borderRadius: 0 };
  const panelStyle = { background: theme.bg?.card || '#3a3a3a', border: `1px solid ${theme.border || 'rgba(255,255,255,0.16)'}`, borderLeft: `6px solid ${theme.accent?.gm || '#d00000'}`, padding: 14, display: 'grid', gap: 12 };
  const valueStyle = { fontSize: 13, color: theme.text?.secondary || 'rgba(255,255,255,0.74)', lineHeight: 1.45 };

  return (
    <div data-testid="quick-npc-generator" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <label><div style={labelStyle}>Combat role</div><select value={presetId} onChange={(event) => setPresetId(event.target.value)} style={inputStyle}>{NPC_COMBAT_PRESETS.map(preset => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label>
        <label><div style={labelStyle}>Race / ancestry</div><select value={race} onChange={(event) => setRace(event.target.value)} style={inputStyle}><option value="">Random</option>{RACES.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button data-testid="generate-npc-btn" onClick={generate} style={mainButtonStyle(theme)}>{npc ? <RefreshCw size={14} /> : <UserPlus size={14} />} {npc ? 'Regenerate combat NPC' : 'Generate combat NPC'}</button>
        {npc && <button data-testid="copy-npc-btn" onClick={copyToClipboard} style={secondaryButtonStyle(theme)}><Copy size={14} /> Copy stat block</button>}
        {npc && <button data-testid="save-combat-npc-btn" onClick={saveNpc} disabled={saving} style={mainButtonStyle(theme)}><Save size={14} /> {saving ? 'Saving…' : 'Save NPC'}</button>}
      </div>

      {npc && (
        <article data-testid="npc-card" style={panelStyle}>
          <header style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 950, color: theme.text?.primary || '#fff' }}>{npc.name}</div>
              <div style={{ fontSize: 12, color: theme.accent?.gm || '#d00000', fontWeight: 900 }}>{npc.race} {npc.role} · Level {npc.level}</div>
            </div>
            <Dices size={18} color={theme.text?.muted || '#aaa'} />
          </header>

          <div style={statStripStyle}>
            <Stat icon={Shield} label="AC" value={npc.ac} />
            <Stat icon={Dices} label="HP" value={npc.hp} />
            <Stat icon={Sword} label="PB" value={`+${npc.proficiency_bonus}`} />
            <Stat icon={Dices} label="Speed" value={npc.speed} />
          </div>

          <AbilityGrid stats={npc.stats} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <section><div style={labelStyle}>Skills</div><div style={valueStyle}>{(npc.skills || []).join(', ') || 'None'}</div></section>
            <section><div style={labelStyle}>Saving throws</div><div style={valueStyle}>{(npc.saving_throws || []).join(', ') || 'None'}</div></section>
          </div>

          <section><div style={labelStyle}>Attacks</div><div style={{ display: 'grid', gap: 6 }}>{(npc.attacks || []).map((attack, index) => <div key={`${attack.name}-${index}`} style={rowStyle}><strong>{attack.name}</strong><span>{attack.bonus ? `${attack.bonus} · ` : ''}{attack.damage || attack.notes}{attack.damage && attack.notes ? ` · ${attack.notes}` : ''}</span></div>)}</div></section>
          <section><div style={labelStyle}>Abilities</div><div style={{ display: 'grid', gap: 6 }}>{(npc.abilities || []).map((ability, index) => <div key={`${ability.name}-${index}`} style={rowStyle}><strong>{ability.name}</strong><span>{ability.description}</span></div>)}</div></section>
          {npc.spells && <section><div style={labelStyle}>Spells</div><div style={valueStyle}>DC {npc.spells.spell_save_dc}, attack +{npc.spells.spell_attack_bonus}. {(npc.spells.cantrips || []).join(', ')}. {(npc.spells.known_spells || []).join(', ')}</div></section>}
          <section><div style={labelStyle}>GM notes</div><div style={valueStyle}>{npc.description} {npc.backstory}</div></section>
        </article>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return <div style={statBoxStyle}><Icon size={14} /><strong>{value}</strong><span>{label}</span></div>;
}

function AbilityGrid({ stats = {} }) {
  const abilities = [['STR', stats.strength], ['DEX', stats.dexterity], ['CON', stats.constitution], ['INT', stats.intelligence], ['WIS', stats.wisdom], ['CHA', stats.charisma]];
  return <div style={abilityGridStyle}>{abilities.map(([label, value]) => <div key={label} style={abilityStyle}><span>{label}</span><strong>{value}</strong><small>{Math.floor(((Number(value) || 10) - 10) / 2) >= 0 ? '+' : ''}{Math.floor(((Number(value) || 10) - 10) / 2)}</small></div>)}</div>;
}

const mainButtonStyle = (theme) => ({ minHeight: 38, border: 0, background: theme.accent?.gm || '#d00000', color: '#fff', padding: '0 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 950, cursor: 'pointer', borderRadius: 0 });
const secondaryButtonStyle = (theme) => ({ minHeight: 38, border: 0, background: theme.bg?.card || '#3a3a3a', color: theme.text?.primary || '#fff', padding: '0 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 900, cursor: 'pointer', borderRadius: 0 });
const statStripStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 };
const statBoxStyle = { display: 'grid', gap: 3, alignItems: 'center', justifyItems: 'center', background: '#242424', border: '1px solid rgba(255,255,255,0.16)', color: '#fff', padding: 9, minHeight: 72 };
const abilityGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(58px, 1fr))', gap: 6 };
const abilityStyle = { display: 'grid', gap: 2, textAlign: 'center', background: '#242424', border: '1px solid rgba(255,255,255,0.16)', padding: 7, color: '#fff' };
const rowStyle = { display: 'grid', gap: 2, background: '#242424', borderLeft: '5px solid #d00000', padding: 8, color: '#fff', fontSize: 12 };
