import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { 
  Users, Plus, Edit2, Trash2, Save, X, Link2, Heart, Swords, 
  Briefcase, Crown, Users2, HelpCircle, ZoomIn, ZoomOut,
  Search, Filter, Eye, EyeOff, Wand2, Shield, Loader, ChevronDown,
  ChevronUp, Scroll, Sparkles, Copy
} from 'lucide-react';

const RELATIONSHIP_TYPES = {
  ally: { label: 'Ally', color: '#22C55E', icon: Users2 },
  enemy: { label: 'Enemy', color: '#EF4444', icon: Swords },
  family: { label: 'Family', color: '#EC4899', icon: Heart },
  business: { label: 'Business', color: '#F59E0B', icon: Briefcase },
  political: { label: 'Political', color: '#D4A017', icon: Crown },
  romantic: { label: 'Romantic', color: '#FF6B9D', icon: Heart },
  rival: { label: 'Rival', color: '#F97316', icon: Swords },
  unknown: { label: 'Unknown', color: '#6B7280', icon: HelpCircle }
};

const SRD_CLASSES = ['Barbarian','Bard','Cleric','Druid','Fighter','Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard','Commoner'];
const SRD_RACES = ['Human','Elf','Half-Elf','Dwarf','Halfling','Gnome','Half-Orc','Tiefling','Dragonborn'];
const ABILITY_NAMES = ['strength','dexterity','constitution','intelligence','wisdom','charisma'];
const ABILITY_SHORT = { strength:'STR', dexterity:'DEX', constitution:'CON', intelligence:'INT', wisdom:'WIS', charisma:'CHA' };
const ALL_SKILLS = [
  'acrobatics','animal handling','arcana','athletics','deception','history',
  'insight','intimidation','investigation','medicine','nature','perception',
  'performance','persuasion','religion','sleight of hand','stealth','survival'
];

function calcMod(score) {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

// ── NPC Node on the graph canvas ──
const NPCNode = ({ npc, position, isSelected, isConnecting, onSelect, onDrag, theme }) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    onDrag(npc.id, { x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }, [isDragging, npc.id, onDrag]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const classLabel = [npc.race, npc.class_name].filter(Boolean).join(' ');

  return (
    <div
      data-testid={`npc-node-${npc.id}`}
      onClick={(e) => { e.stopPropagation(); onSelect(npc.id); }}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute', left: position.x, top: position.y, width: '150px', padding: '10px',
        background: isSelected ? theme.accent.subtle : theme.bg.card,
        border: `2px solid ${isSelected ? theme.accent.primary : (isConnecting ? '#22C55E' : theme.border)}`,
        borderRadius: '12px', cursor: isDragging ? 'grabbing' : 'grab', zIndex: isSelected ? 100 : 10,
        transition: isDragging ? 'none' : 'border-color 0.2s, background 0.2s',
        boxShadow: isSelected ? `0 0 20px ${theme.accent.primary}40` : '0 4px 12px rgba(0,0,0,0.3)'
      }}
    >
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: theme.bg.elevated, margin: '0 auto 6px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${npc.color || theme.accent.primary}`, fontSize: '18px', color: theme.text.primary }}>
        {npc.name?.charAt(0)?.toUpperCase() || '?'}
      </div>
      <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '600', fontSize: '13px', color: theme.text.primary,
        textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {npc.name}
      </div>
      {classLabel && <div style={{ fontSize: '10px', color: theme.text.muted, textAlign: 'center', marginTop: '2px' }}>{classLabel} {npc.level > 1 ? `Lv${npc.level}` : ''}</div>}
      {(npc.role || npc.occupation) && <div style={{ fontSize: '10px', color: theme.accent.primary, textAlign: 'center', marginTop: '1px' }}>{npc.role || npc.occupation}</div>}
      {/* Mini stat bar */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '6px', fontSize: '10px' }}>
        <span style={{ color: '#EF4444' }}>HP {npc.hp || '?'}</span>
        <span style={{ color: '#60A5FA' }}>AC {npc.ac || '?'}</span>
      </div>
    </div>
  );
};

// ── Connection line SVG ──
const ConnectionLine = ({ from, to, relationship, isSelected, onClick, theme }) => {
  const relType = RELATIONSHIP_TYPES[relationship.type] || RELATIONSHIP_TYPES.unknown;
  const x1 = from.x + 75, y1 = from.y + 55, x2 = to.x + 75, y2 = to.y + 55;
  const midX = (x1+x2)/2, midY = (y1+y2)/2;
  const angle = Math.atan2(y2-y1, x2-x1);
  return (
    <g onClick={(e) => { e.stopPropagation(); onClick(); }} style={{ cursor: 'pointer' }}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={relType.color} strokeWidth={isSelected?4:2}
        strokeDasharray={relationship.type==='unknown'?'5,5':'none'} opacity={isSelected?1:0.6} />
      <polygon points="0,-5 10,0 0,5" fill={relType.color}
        transform={`translate(${x2-Math.cos(angle)*15}, ${y2-Math.sin(angle)*15}) rotate(${angle*180/Math.PI})`} opacity={isSelected?1:0.6} />
      <rect x={midX-30} y={midY-10} width="60" height="20" rx="4" fill={theme.bg.card} stroke={relType.color} strokeWidth="1" />
      <text x={midX} y={midY+4} textAnchor="middle" fontSize="10" fill={relType.color} fontFamily="'Outfit', sans-serif" fontWeight="500">{relType.label}</text>
    </g>
  );
};

// ── Stat Block Panel ──
function StatBlockPanel({ npc, theme, onEdit, onClose }) {
  const [showSpells, setShowSpells] = useState(false);
  const stats = npc.stats || {};
  return (
    <div data-testid="npc-stat-block" style={{ position: 'absolute', right: '20px', top: '60px', width: '340px', maxHeight: 'calc(100vh - 280px)',
      overflowY: 'auto', padding: '20px', background: theme.bg.panel, backdropFilter: 'blur(16px)',
      border: `1px solid ${theme.accent.primary}`, borderRadius: '12px', zIndex: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h4 style={{ fontFamily: "'Cinzel', serif", color: theme.text.primary, margin: 0, fontSize: '18px' }}>{npc.name}</h4>
          <div style={{ fontSize: '12px', color: theme.accent.primary, marginTop: '2px' }}>
            {[npc.race, npc.class_name, npc.level > 1 ? `Level ${npc.level}` : ''].filter(Boolean).join(' ')}
            {npc.alignment && <span style={{ color: theme.text.muted }}> ({npc.alignment})</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={onEdit} data-testid="edit-npc-btn" style={{ background: theme.accent.subtle, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '6px', cursor: 'pointer', color: theme.accent.primary }}><Edit2 size={14} /></button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.text.muted, cursor: 'pointer' }}><X size={16} /></button>
        </div>
      </div>

      {/* Combat Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '12px' }}>
        {[{ l:'HP', v:`${npc.hp}/${npc.max_hp||npc.hp}`, c:'#EF4444' }, { l:'AC', v:npc.ac, c:'#60A5FA' },
          { l:'SPD', v:npc.speed||'30ft', c:'#22C55E' }, { l:'PROF', v:`+${npc.proficiency_bonus||2}`, c:'#F59E0B' }].map(s => (
          <div key={s.l} style={{ textAlign: 'center', background: `${s.c}15`, border: `1px solid ${s.c}40`, borderRadius: '6px', padding: '6px' }}>
            <div style={{ fontSize: '10px', color: s.c, fontWeight: '600' }}>{s.l}</div>
            <div style={{ fontSize: '14px', color: theme.text.primary, fontWeight: '600' }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Ability Scores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', marginBottom: '12px' }}>
        {ABILITY_NAMES.map(a => (
          <div key={a} style={{ textAlign: 'center', background: 'rgba(15,10,30,0.5)', borderRadius: '6px', padding: '4px' }}>
            <div style={{ fontSize: '10px', color: theme.text.muted }}>{ABILITY_SHORT[a]}</div>
            <div style={{ fontSize: '14px', color: theme.text.primary, fontWeight: '600' }}>{stats[a] || 10}</div>
            <div style={{ fontSize: '10px', color: (stats[a]||10)>=10?theme.accent.primary:'#EF4444' }}>{calcMod(stats[a]||10)}</div>
          </div>
        ))}
      </div>

      {/* Saving Throws */}
      {npc.saving_throws?.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', color: theme.text.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Saving Throws</div>
          <div style={{ fontSize: '12px', color: theme.text.secondary, display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {npc.saving_throws.map(s => <span key={s} style={{ background: theme.accent.subtle, padding: '2px 6px', borderRadius: '4px', textTransform: 'capitalize' }}>{s}</span>)}
          </div>
        </div>
      )}

      {/* Skills */}
      {npc.skills?.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', color: theme.text.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Skills</div>
          <div style={{ fontSize: '12px', color: theme.text.secondary, display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {npc.skills.map(s => <span key={s} style={{ background: theme.accent.subtle, padding: '2px 6px', borderRadius: '4px', textTransform: 'capitalize' }}>{s}</span>)}
          </div>
        </div>
      )}

      {/* Attacks */}
      {npc.attacks?.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', color: theme.text.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Attacks</div>
          {npc.attacks.map((a, i) => (
            <div key={i} style={{ fontSize: '12px', padding: '6px 8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', marginBottom: '4px' }}>
              <span style={{ color: theme.text.primary, fontWeight: '600' }}>{a.name}</span>
              <span style={{ color: '#EF4444', marginLeft: '8px' }}>{a.bonus} to hit</span>
              <span style={{ color: theme.text.secondary, marginLeft: '8px' }}>{a.damage}</span>
              {a.notes && <div style={{ color: theme.text.muted, fontSize: '11px', marginTop: '2px' }}>{a.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Abilities */}
      {npc.abilities?.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', color: theme.text.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Abilities & Features</div>
          {npc.abilities.map((a, i) => (
            <div key={i} style={{ fontSize: '12px', padding: '6px 8px', background: theme.accent.subtle, borderRadius: '6px', marginBottom: '4px' }}>
              <span style={{ color: theme.accent.primary, fontWeight: '600' }}>{a.name}</span>
              <div style={{ color: theme.text.secondary, marginTop: '2px' }}>{a.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Spells */}
      {npc.spells && (
        <div style={{ marginBottom: '10px' }}>
          <button onClick={() => setShowSpells(!showSpells)} style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
            background: 'none', border: 'none', color: theme.accent.primary, cursor: 'pointer', fontSize: '11px', textTransform: 'uppercase', padding: 0, marginBottom: '4px' }}>
            <Scroll size={12} /> Spellcasting {showSpells ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
          </button>
          {showSpells && (
            <div style={{ fontSize: '12px', padding: '8px', background: 'rgba(138,43,226,0.08)', border: '1px solid rgba(138,43,226,0.2)', borderRadius: '6px' }}>
              <div style={{ color: theme.text.secondary, marginBottom: '4px' }}>
                {npc.spells.casting_ability} | DC {npc.spells.spell_save_dc} | +{npc.spells.spell_attack_bonus} to hit
              </div>
              {npc.spells.cantrips?.length > 0 && <div style={{ marginBottom: '4px' }}><span style={{ color: theme.text.muted }}>Cantrips: </span><span style={{ color: theme.text.primary }}>{npc.spells.cantrips.join(', ')}</span></div>}
              {npc.spells.known_spells?.length > 0 && <div><span style={{ color: theme.text.muted }}>Spells ({npc.spells.slot_count} x Lv{npc.spells.slot_level}): </span><span style={{ color: theme.text.primary }}>{npc.spells.known_spells.join(', ')}</span></div>}
            </div>
          )}
        </div>
      )}

      {/* Roleplay Info */}
      {(npc.personality || npc.appearance || npc.backstory) && (
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '10px', marginTop: '10px' }}>
          {npc.appearance && <div style={{ fontSize: '12px', marginBottom: '6px' }}><span style={{ color: theme.text.muted }}>Appearance: </span><span style={{ color: theme.text.secondary }}>{npc.appearance}</span></div>}
          {npc.personality && <div style={{ fontSize: '12px', marginBottom: '6px' }}><span style={{ color: theme.text.muted }}>Personality: </span><span style={{ color: theme.text.secondary }}>{npc.personality}</span></div>}
          {npc.backstory && <div style={{ fontSize: '12px' }}><span style={{ color: theme.text.muted }}>Backstory: </span><span style={{ color: theme.text.secondary }}>{npc.backstory}</span></div>}
        </div>
      )}

      {npc.notes && (
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '8px', marginTop: '8px' }}>
          <div style={{ fontSize: '11px', color: theme.text.muted, textTransform: 'uppercase', marginBottom: '2px' }}>GM Notes</div>
          <div style={{ fontSize: '12px', color: theme.text.secondary }}>{npc.notes}</div>
        </div>
      )}
    </div>
  );
}

// ── Edit NPC Modal ──
function EditNPCModal({ npc, theme, onSave, onClose, isNew }) {
  const [form, setForm] = useState(() => ({
    name: '', race: 'Human', class_name: 'Fighter', level: 1, alignment: 'True Neutral',
    appearance: '', personality: '', backstory: '', role: '', description: '',
    hp: 10, max_hp: 10, ac: 10, speed: '30 ft.', proficiency_bonus: 2,
    stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
    saving_throws: [], skills: [], attacks: [], abilities: [], spells: null,
    location: '', notes: '', color: '#D4A017',
    ...npc
  }));
  const [section, setSection] = useState('basic');
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
  const setStat = (stat, val) => setForm(f => ({ ...f, stats: { ...f.stats, [stat]: parseInt(val) || 10 } }));

  const toggleArrayItem = (field, item) => {
    setForm(f => {
      const arr = f[field] || [];
      return { ...f, [field]: arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item] };
    });
  };

  const addAttack = () => set('attacks', [...(form.attacks||[]), { name: '', bonus: '', damage: '', notes: '' }]);
  const updateAttack = (i, field, val) => { const a = [...form.attacks]; a[i] = { ...a[i], [field]: val }; set('attacks', a); };
  const removeAttack = (i) => set('attacks', form.attacks.filter((_, idx) => idx !== i));

  const addAbility = () => set('abilities', [...(form.abilities||[]), { name: '', description: '' }]);
  const updateAbility = (i, field, val) => { const a = [...form.abilities]; a[i] = { ...a[i], [field]: val }; set('abilities', a); };
  const removeAbility = (i) => set('abilities', form.abilities.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const inputStyle = { width: '100%', padding: '8px 10px', background: theme.bg.elevated, border: `1px solid ${theme.border}`,
    borderRadius: '6px', color: theme.text.primary, fontSize: '13px' };
  const labelStyle = { fontSize: '11px', color: theme.text.muted, textTransform: 'uppercase', marginBottom: '4px', display: 'block' };

  const sections = [
    { id: 'basic', label: 'Basic' }, { id: 'stats', label: 'Stats' },
    { id: 'combat', label: 'Combat' }, { id: 'abilities', label: 'Abilities' },
    { id: 'spells', label: 'Spells' }, { id: 'rp', label: 'Roleplay' }
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}
      onClick={onClose}>
      <div data-testid="edit-npc-modal" onClick={e => e.stopPropagation()} style={{ width: '640px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '16px' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: "'Cinzel', serif", color: theme.text.primary, margin: 0, fontSize: '18px' }}>{isNew ? 'Create NPC' : 'Edit NPC'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.text.muted, cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Section Tabs */}
        <div style={{ display: 'flex', gap: '2px', padding: '8px 20px', borderBottom: `1px solid ${theme.border}`, flexWrap: 'wrap' }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600',
              background: section === s.id ? theme.gradient : 'transparent', color: section === s.id ? '#fff' : theme.text.secondary,
              border: section === s.id ? 'none' : `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer' }}>{s.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {section === 'basic' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Name *</label><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="NPC Name" style={inputStyle} /></div>
              <div><label style={labelStyle}>Race</label>
                <select value={form.race} onChange={e => set('race', e.target.value)} style={inputStyle}>
                  {SRD_RACES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Class</label>
                <select value={form.class_name} onChange={e => set('class_name', e.target.value)} style={inputStyle}>
                  {SRD_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Level</label><input type="number" min="1" max="20" value={form.level} onChange={e => set('level', parseInt(e.target.value)||1)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Alignment</label><input value={form.alignment} onChange={e => set('alignment', e.target.value)} placeholder="True Neutral" style={inputStyle} /></div>
              <div><label style={labelStyle}>Role</label><input value={form.role} onChange={e => set('role', e.target.value)} placeholder="Ally, Enemy, Merchant..." style={inputStyle} /></div>
              <div><label style={labelStyle}>Location</label><input value={form.location} onChange={e => set('location', e.target.value)} style={inputStyle} /></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Color</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['#D4A017','#4DD0E1','#22C55E','#F59E0B','#EF4444','#EC4899','#60A5FA','#F97316'].map(c => (
                    <button key={c} onClick={() => set('color', c)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c,
                      border: form.color === c ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'stats' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                {ABILITY_NAMES.map(a => (
                  <div key={a} style={{ textAlign: 'center' }}>
                    <label style={labelStyle}>{ABILITY_SHORT[a]}</label>
                    <input type="number" min="1" max="30" value={form.stats?.[a]||10} onChange={e => setStat(a, e.target.value)}
                      style={{ ...inputStyle, textAlign: 'center', fontSize: '18px', fontWeight: '600' }} />
                    <div style={{ fontSize: '12px', color: theme.accent.primary, marginTop: '2px' }}>{calcMod(form.stats?.[a]||10)}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div><label style={labelStyle}>Speed</label><input value={form.speed} onChange={e => set('speed', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Proficiency Bonus</label><input type="number" min="2" max="6" value={form.proficiency_bonus} onChange={e => set('proficiency_bonus', parseInt(e.target.value)||2)} style={inputStyle} /></div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Saving Throw Proficiencies</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {ABILITY_NAMES.map(a => (
                    <button key={a} onClick={() => toggleArrayItem('saving_throws', a)} style={{ padding: '4px 10px', fontSize: '12px',
                      background: form.saving_throws?.includes(a) ? theme.accent.subtle : theme.bg.elevated,
                      border: `1px solid ${form.saving_throws?.includes(a) ? theme.accent.primary : theme.border}`,
                      color: form.saving_throws?.includes(a) ? theme.accent.primary : theme.text.secondary,
                      borderRadius: '4px', cursor: 'pointer', textTransform: 'capitalize' }}>{a}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Skill Proficiencies</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {ALL_SKILLS.map(s => (
                    <button key={s} onClick={() => toggleArrayItem('skills', s)} style={{ padding: '3px 8px', fontSize: '11px',
                      background: form.skills?.includes(s) ? theme.accent.subtle : theme.bg.elevated,
                      border: `1px solid ${form.skills?.includes(s) ? theme.accent.primary : theme.border}`,
                      color: form.skills?.includes(s) ? theme.accent.primary : theme.text.secondary,
                      borderRadius: '4px', cursor: 'pointer', textTransform: 'capitalize' }}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'combat' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div><label style={labelStyle}>HP</label><input type="number" min="1" value={form.hp} onChange={e => { const v=parseInt(e.target.value)||1; set('hp',v); set('max_hp',v); }} style={inputStyle} /></div>
                <div><label style={labelStyle}>Max HP</label><input type="number" min="1" value={form.max_hp} onChange={e => set('max_hp', parseInt(e.target.value)||1)} style={inputStyle} /></div>
                <div><label style={labelStyle}>AC</label><input type="number" min="1" value={form.ac} onChange={e => set('ac', parseInt(e.target.value)||10)} style={inputStyle} /></div>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ ...labelStyle, margin: 0 }}>Attacks</label>
                <button onClick={addAttack} style={{ padding: '4px 10px', fontSize: '12px', background: theme.accent.subtle, border: `1px solid ${theme.accent.primary}`,
                  borderRadius: '6px', color: theme.accent.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={12} /> Add</button>
              </div>
              {(form.attacks||[]).map((atk, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr auto', gap: '6px', marginBottom: '8px', alignItems: 'end' }}>
                  <div><label style={labelStyle}>Name</label><input value={atk.name} onChange={e => updateAttack(i,'name',e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Bonus</label><input value={atk.bonus} onChange={e => updateAttack(i,'bonus',e.target.value)} placeholder="+5" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Damage</label><input value={atk.damage} onChange={e => updateAttack(i,'damage',e.target.value)} placeholder="1d8+3" style={inputStyle} /></div>
                  <button onClick={() => removeAttack(i)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', paddingBottom: '8px' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}

          {section === 'abilities' && (
            <div>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ ...labelStyle, margin: 0 }}>Features & Abilities</label>
                <button onClick={addAbility} style={{ padding: '4px 10px', fontSize: '12px', background: theme.accent.subtle, border: `1px solid ${theme.accent.primary}`,
                  borderRadius: '6px', color: theme.accent.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={12} /> Add</button>
              </div>
              {(form.abilities||[]).map((ab, i) => (
                <div key={i} style={{ marginBottom: '10px', padding: '10px', background: theme.bg.elevated, borderRadius: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                    <input value={ab.name} onChange={e => updateAbility(i,'name',e.target.value)} placeholder="Feature name" style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={() => removeAbility(i)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                  </div>
                  <textarea value={ab.description} onChange={e => updateAbility(i,'description',e.target.value)} placeholder="Description..."
                    style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' }} />
                </div>
              ))}
            </div>
          )}

          {section === 'spells' && (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: theme.text.primary, fontSize: '13px' }}>
                  <input type="checkbox" checked={!!form.spells} onChange={e => set('spells', e.target.checked ? { casting_ability: 'Intelligence', spell_save_dc: 13, spell_attack_bonus: 5, cantrips: [], slot_level: 1, slot_count: 2, known_spells: [] } : null)} />
                  This NPC is a spellcaster
                </label>
              </div>
              {form.spells && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div><label style={labelStyle}>Casting Ability</label>
                      <select value={form.spells.casting_ability} onChange={e => set('spells', { ...form.spells, casting_ability: e.target.value })} style={inputStyle}>
                        {['Intelligence','Wisdom','Charisma'].map(a => <option key={a}>{a}</option>)}
                      </select>
                    </div>
                    <div><label style={labelStyle}>Spell Save DC</label><input type="number" value={form.spells.spell_save_dc} onChange={e => set('spells', { ...form.spells, spell_save_dc: parseInt(e.target.value)||0 })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Spell Attack +</label><input type="number" value={form.spells.spell_attack_bonus} onChange={e => set('spells', { ...form.spells, spell_attack_bonus: parseInt(e.target.value)||0 })} style={inputStyle} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div><label style={labelStyle}>Max Slot Level</label><input type="number" min="1" max="9" value={form.spells.slot_level} onChange={e => set('spells', { ...form.spells, slot_level: parseInt(e.target.value)||1 })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Slots Per Level</label><input type="number" min="1" value={form.spells.slot_count} onChange={e => set('spells', { ...form.spells, slot_count: parseInt(e.target.value)||1 })} style={inputStyle} /></div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={labelStyle}>Cantrips (comma separated)</label>
                    <input value={(form.spells.cantrips||[]).join(', ')} onChange={e => set('spells', { ...form.spells, cantrips: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} placeholder="Fire Bolt, Mage Hand" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Known Spells (comma separated)</label>
                    <textarea value={(form.spells.known_spells||[]).join(', ')} onChange={e => set('spells', { ...form.spells, known_spells: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })}
                      placeholder="Shield, Misty Step, Fireball..." style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {section === 'rp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={labelStyle}>Appearance</label><textarea value={form.appearance} onChange={e => set('appearance', e.target.value)} style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' }} /></div>
              <div><label style={labelStyle}>Personality</label><textarea value={form.personality} onChange={e => set('personality', e.target.value)} style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' }} /></div>
              <div><label style={labelStyle}>Backstory</label><textarea value={form.backstory} onChange={e => set('backstory', e.target.value)} style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' }} /></div>
              <div><label style={labelStyle}>Description</label><textarea value={form.description} onChange={e => set('description', e.target.value)} style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' }} /></div>
              <div><label style={labelStyle}>GM Notes</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' }} /></div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${theme.border}`, display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: theme.bg.elevated, border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text.secondary, cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
          <button data-testid="save-npc-btn" onClick={handleSave} disabled={saving} style={{ padding: '10px 20px', background: theme.gradient, border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600', opacity: saving ? 0.6 : 1 }}>
            {saving ? <Loader size={16} className="animate-spin" /> : <>{isNew ? 'Create' : 'Save'} NPC</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AI Generate NPC Modal ──
function GenerateNPCModal({ theme, onGenerate, onClose }) {
  const [prompt, setPrompt] = useState('');
  const [race, setRace] = useState('');
  const [className, setClassName] = useState('');
  const [level, setLevel] = useState(5);
  const [role, setRole] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try { await onGenerate({ prompt, race, class_name: className, level, role }); } finally { setGenerating(false); }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', background: theme.bg.elevated, border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text.primary, fontSize: '13px' };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}
      onClick={onClose}>
      <div data-testid="generate-npc-modal" onClick={e => e.stopPropagation()} style={{ width: '480px', padding: '24px', background: theme.bg.card, border: `1px solid ${theme.accent.primary}`, borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Sparkles size={22} style={{ color: theme.accent.primary }} />
          <h3 style={{ fontFamily: "'Cinzel', serif", color: theme.text.primary, margin: 0 }}>AI Generate NPC</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '11px', color: theme.text.muted, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Describe the NPC (optional)</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="A mysterious elven merchant who deals in forbidden magical artifacts..." style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: theme.text.muted, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Race</label>
              <select value={race} onChange={e => setRace(e.target.value)} style={inputStyle}>
                <option value="">Any Race</option>
                {SRD_RACES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: theme.text.muted, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Class</label>
              <select value={className} onChange={e => setClassName(e.target.value)} style={inputStyle}>
                <option value="">Any Class</option>
                {SRD_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: theme.text.muted, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Level</label>
              <input type="number" min="1" max="20" value={level} onChange={e => setLevel(parseInt(e.target.value)||1)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: theme.text.muted, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Role</label>
              <input value={role} onChange={e => setRole(e.target.value)} placeholder="Ally, Enemy, Quest Giver..." style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: theme.bg.elevated, border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text.secondary, cursor: 'pointer' }}>Cancel</button>
          <button data-testid="ai-generate-btn" onClick={handleGenerate} disabled={generating} style={{ padding: '10px 20px', background: theme.gradient, border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', opacity: generating ? 0.7 : 1 }}>
            {generating ? <><Loader size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate NPC</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──
export default function NPCRelationshipMap({ theme, campaignId }) {
  const [npcs, setNpcs] = useState([]);
  const [positions, setPositions] = useState({});
  const [connections, setConnections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [newConnType, setNewConnType] = useState('ally');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showConnections, setShowConnections] = useState(true);
  const [showEditModal, setShowEditModal] = useState(null); // null | 'new' | npc object
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Load NPCs from backend
  const fetchNPCs = useCallback(async () => {
    try {
      const res = await apiClient.get(`/campaigns/${campaignId}/npcs`);
      setNpcs(res.data);
      // Load positions from localStorage
      const savedPos = localStorage.getItem(`npc-map-pos-${campaignId}`);
      const savedConns = localStorage.getItem(`npc-map-conn-${campaignId}`);
      if (savedPos) setPositions(JSON.parse(savedPos));
      else {
        const initPos = {};
        res.data.forEach((npc, i) => { initPos[npc.id] = { x: 80 + (i % 5) * 190, y: 80 + Math.floor(i / 5) * 160 }; });
        setPositions(initPos);
      }
      if (savedConns) setConnections(JSON.parse(savedConns));
    } catch (err) {
      toast.error('Failed to load NPCs');
    } finally { setLoading(false); }
  }, [campaignId]);

  useEffect(() => { fetchNPCs(); }, [fetchNPCs]);

  // Persist positions + connections
  const saveLayout = useCallback((pos, conns) => {
    localStorage.setItem(`npc-map-pos-${campaignId}`, JSON.stringify(pos));
    localStorage.setItem(`npc-map-conn-${campaignId}`, JSON.stringify(conns));
  }, [campaignId]);

  // Create NPC
  const handleCreateNPC = async (formData) => {
    const res = await apiClient.post(`/campaigns/${campaignId}/npcs`, formData);
    const newNpc = res.data;
    setNpcs(prev => [...prev, newNpc]);
    const newPos = { ...positions, [newNpc.id]: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 } };
    setPositions(newPos);
    saveLayout(newPos, connections);
    setShowEditModal(null);
    toast.success(`${newNpc.name} created!`);
  };

  // Update NPC
  const handleUpdateNPC = async (formData) => {
    const res = await apiClient.put(`/campaigns/${campaignId}/npcs/${formData.id}`, formData);
    setNpcs(prev => prev.map(n => n.id === formData.id ? res.data : n));
    setShowEditModal(null);
    toast.success(`${res.data.name} updated!`);
  };

  // Delete NPC
  const handleDeleteNPC = async (npcId) => {
    if (!window.confirm('Delete this NPC?')) return;
    await apiClient.delete(`/campaigns/${campaignId}/npcs/${npcId}`);
    setNpcs(prev => prev.filter(n => n.id !== npcId));
    const newConns = connections.filter(c => c.from !== npcId && c.to !== npcId);
    const newPos = { ...positions }; delete newPos[npcId];
    setPositions(newPos);
    setConnections(newConns);
    saveLayout(newPos, newConns);
    setSelectedNode(null);
    toast.success('NPC deleted');
  };

  // AI Generate NPC
  const handleGenerateNPC = async (params) => {
    const res = await apiClient.post(`/campaigns/${campaignId}/npcs/generate`, params);
    const newNpc = res.data;
    setNpcs(prev => [...prev, newNpc]);
    const newPos = { ...positions, [newNpc.id]: { x: 200 + Math.random() * 300, y: 150 + Math.random() * 200 } };
    setPositions(newPos);
    saveLayout(newPos, connections);
    setShowGenerateModal(false);
    toast.success(`${newNpc.name} generated with full stat block!`);
  };

  // Node drag
  const updateNodePos = (id, pos) => setPositions(prev => ({ ...prev, [id]: pos }));
  const onDragEnd = () => saveLayout(positions, connections);

  // Connection management
  const startConnection = (npcId) => { setConnectingFrom(npcId); };
  const completeConnection = (targetId) => {
    if (!connectingFrom || connectingFrom === targetId) { setConnectingFrom(null); return; }
    const exists = connections.some(c => (c.from===connectingFrom && c.to===targetId) || (c.from===targetId && c.to===connectingFrom));
    if (exists) { setConnectingFrom(null); return; }
    const newConn = { id: `conn-${Date.now()}`, from: connectingFrom, to: targetId, type: newConnType };
    const updated = [...connections, newConn];
    setConnections(updated);
    saveLayout(positions, updated);
    setConnectingFrom(null);
    setNewConnType('ally');
  };
  const deleteConnection = (connId) => {
    const updated = connections.filter(c => c.id !== connId);
    setConnections(updated);
    saveLayout(positions, updated);
    setSelectedConnection(null);
  };

  // Pan handling
  const handleCanvasMouseDown = (e) => { if (e.button === 1 || (e.button === 0 && e.altKey)) { isPanning.current = true; panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; } };
  const handleCanvasMouseMove = (e) => { if (isPanning.current) setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y }); };
  const handleCanvasMouseUp = () => { if (isPanning.current) { isPanning.current = false; onDragEnd(); } };

  const filteredNPCs = npcs.filter(n => !searchQuery || n.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredConns = connections.filter(c => filterType === 'all' || c.type === filterType);
  const selectedNPC = selectedNode ? npcs.find(n => n.id === selectedNode) : null;

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: theme.text.muted }}><Loader size={24} className="animate-spin" /></div>;

  return (
    <div data-testid="npc-relationship-map" style={{ padding: '20px', height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0, flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link2 size={22} style={{ color: theme.accent.primary }} />
          <h3 style={{ fontFamily: "'Cinzel', serif", color: theme.text.primary, margin: 0, fontSize: '20px' }}>NPC Network</h3>
          <span style={{ fontSize: '12px', color: theme.text.muted, background: theme.bg.elevated, padding: '3px 8px', borderRadius: '4px' }}>
            {npcs.length} NPCs
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button data-testid="generate-npc-button" onClick={() => setShowGenerateModal(true)} style={{ padding: '8px 14px', background: 'linear-gradient(135deg, #D4A017, #D4A017)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} /> AI Generate
          </button>
          <button data-testid="add-npc-button" onClick={() => setShowEditModal('new')} style={{ padding: '8px 14px', background: theme.gradient, border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} /> Add NPC
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '180px', maxWidth: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: theme.text.muted }} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search NPCs..."
            style={{ width: '100%', padding: '7px 10px 7px 32px', background: theme.bg.elevated, border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text.primary, fontSize: '13px' }} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '7px 10px', background: theme.bg.elevated, border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text.primary, fontSize: '13px' }}>
          <option value="all">All Relationships</option>
          {Object.entries(RELATIONSHIP_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => setShowConnections(!showConnections)} style={{ padding: '7px 10px', background: showConnections ? theme.accent.subtle : theme.bg.elevated,
          border: `1px solid ${showConnections ? theme.accent.primary : theme.border}`, borderRadius: '8px', color: showConnections ? theme.accent.primary : theme.text.muted,
          cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {showConnections ? <Eye size={14} /> : <EyeOff size={14} />} Lines
        </button>
        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
          <button onClick={() => setZoom(Math.max(0.4, zoom - 0.1))} style={{ padding: '7px', background: theme.bg.elevated, border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.text.secondary, cursor: 'pointer' }}><ZoomOut size={14} /></button>
          <span style={{ padding: '7px 10px', background: theme.bg.elevated, borderRadius: '6px', color: theme.text.primary, fontSize: '12px', minWidth: '50px', textAlign: 'center' }}>{Math.round(zoom*100)}%</span>
          <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} style={{ padding: '7px', background: theme.bg.elevated, border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.text.secondary, cursor: 'pointer' }}><ZoomIn size={14} /></button>
        </div>
      </div>

      {/* Canvas */}
      <div onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp}
        onClick={() => { setSelectedNode(null); setSelectedConnection(null); }}
        style={{ flex: 1, background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
          {showConnections && (
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '4000px', height: '3000px', pointerEvents: 'none' }}>
              <g style={{ pointerEvents: 'all' }}>
                {filteredConns.map(conn => {
                  const fromPos = positions[conn.from];
                  const toPos = positions[conn.to];
                  if (!fromPos || !toPos) return null;
                  return <ConnectionLine key={conn.id} from={fromPos} to={toPos} relationship={conn} isSelected={selectedConnection===conn.id}
                    onClick={() => setSelectedConnection(conn.id)} theme={theme} />;
                })}
              </g>
            </svg>
          )}
          {filteredNPCs.map(npc => (
            <NPCNode key={npc.id} npc={npc} position={positions[npc.id] || { x: 100, y: 100 }}
              isSelected={selectedNode === npc.id} isConnecting={connectingFrom === npc.id}
              onSelect={id => { if (connectingFrom) { completeConnection(id); } else { setSelectedNode(id); } }}
              onDrag={updateNodePos} theme={theme} />
          ))}
        </div>

        {/* Empty state */}
        {npcs.length === 0 && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: theme.text.muted }}>
            <Users size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ marginBottom: '12px' }}>No NPCs yet</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => setShowGenerateModal(true)} style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #D4A017, #D4A017)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} /> AI Generate
              </button>
              <button onClick={() => setShowEditModal('new')} style={{ padding: '10px 18px', background: theme.gradient, border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>
                <Plus size={16} /> Manual Create
              </button>
            </div>
          </div>
        )}

        {/* Connecting indicator */}
        {connectingFrom && (
          <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', padding: '8px 16px', background: '#22C55E', borderRadius: '8px', color: '#fff', fontWeight: '600', fontSize: '13px', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Click another NPC to connect
            <button onClick={() => setConnectingFrom(null)} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', padding: '2px 6px' }}><X size={12} /></button>
          </div>
        )}

        {/* Connection type picker when connecting */}
        {connectingFrom && (
          <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px', background: theme.bg.panel, padding: '6px', borderRadius: '8px', zIndex: 1000, border: `1px solid ${theme.border}` }}>
            {Object.entries(RELATIONSHIP_TYPES).map(([k, v]) => (
              <button key={k} onClick={() => setNewConnType(k)} style={{ padding: '4px 10px', fontSize: '11px', background: newConnType === k ? `${v.color}30` : 'transparent',
                border: `1px solid ${newConnType === k ? v.color : 'transparent'}`, borderRadius: '4px', color: v.color, cursor: 'pointer' }}>{v.label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Stat Block Panel (right side) */}
      {selectedNPC && !showEditModal && (
        <StatBlockPanel npc={selectedNPC} theme={theme}
          onEdit={() => setShowEditModal(selectedNPC)}
          onClose={() => setSelectedNode(null)} />
      )}

      {/* Selected NPC action buttons (bottom left) */}
      {selectedNPC && !showEditModal && (
        <div style={{ position: 'absolute', bottom: '40px', left: '260px', display: 'flex', gap: '6px', zIndex: 999 }}>
          <button onClick={() => startConnection(selectedNPC.id)} style={{ padding: '8px 14px', background: '#22C55E20', border: '1px solid #22C55E50', borderRadius: '8px', color: '#22C55E', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Link2 size={14} /> Connect
          </button>
          <button onClick={() => setShowEditModal(selectedNPC)} style={{ padding: '8px 14px', background: theme.accent.subtle, border: `1px solid ${theme.accent.primary}50`, borderRadius: '8px', color: theme.accent.primary, cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Edit2 size={14} /> Edit
          </button>
          <button onClick={() => handleDeleteNPC(selectedNPC.id)} style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#EF4444', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}

      {/* Delete connection */}
      {selectedConnection && (
        <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', zIndex: 999 }}>
          <button onClick={() => deleteConnection(selectedConnection)} style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#EF4444', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trash2 size={14} /> Delete Connection
          </button>
        </div>
      )}

      {/* Modals */}
      {showEditModal === 'new' && <EditNPCModal npc={{}} theme={theme} onSave={handleCreateNPC} onClose={() => setShowEditModal(null)} isNew />}
      {showEditModal && showEditModal !== 'new' && <EditNPCModal npc={showEditModal} theme={theme} onSave={handleUpdateNPC} onClose={() => setShowEditModal(null)} isNew={false} />}
      {showGenerateModal && <GenerateNPCModal theme={theme} onGenerate={handleGenerateNPC} onClose={() => setShowGenerateModal(false)} />}
    </div>
  );
}
