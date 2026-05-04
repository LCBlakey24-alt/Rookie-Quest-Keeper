import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Sword, Shield, BookOpen, Star, ChevronDown, ChevronUp, Sparkles, Trophy, Target, Scroll } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const theme = {
  accent: '#4DD0E1', pink: '#EC4899', gold: '#F59E0B', green: '#22C55E',
  purple: '#8B5CF6', red: '#EF4444', blue: '#3B82F6',
  text: '#fff', muted: '#64748b', bg: 'rgba(15, 10, 30, 0.85)',
  border: 'rgba(77, 208, 225, 0.15)',
};

// Stat card component
const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
  <div style={{
    padding: '14px', borderRadius: '12px',
    background: `${color}08`, border: `1px solid ${color}25`,
    textAlign: 'center', minWidth: '100px', flex: 1,
  }}>
    <Icon size={18} color={color} style={{ marginBottom: '6px' }} />
    <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: '10px', color: theme.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    {subtext && <div style={{ fontSize: '10px', color: `${color}90`, marginTop: '2px' }}>{subtext}</div>}
  </div>
);

// Timeline event
const TimelineEvent = ({ event, index, isLast }) => {
  const iconMap = {
    level_up: { icon: TrendingUp, color: theme.gold },
    spell_learned: { icon: BookOpen, color: theme.purple },
    item_gained: { icon: Sword, color: theme.pink },
    combat: { icon: Target, color: theme.red },
    quest: { icon: Star, color: theme.green },
    milestone: { icon: Trophy, color: theme.gold },
    default: { icon: Scroll, color: theme.accent },
  };
  const { icon: Icon, color } = iconMap[event.type] || iconMap.default;

  return (
    <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
      {/* Timeline line */}
      {!isLast && (
        <div style={{
          position: 'absolute', left: '15px', top: '32px', bottom: '-8px',
          width: '2px', background: `linear-gradient(180deg, ${color}40, transparent)`,
        }} />
      )}
      {/* Icon bubble */}
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%',
        background: `${color}15`, border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={14} color={color} />
      </div>
      {/* Content */}
      <div style={{ flex: 1, paddingBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: theme.text }}>{event.title}</div>
        {event.description && (
          <div style={{ fontSize: '11px', color: theme.muted, marginTop: '2px' }}>{event.description}</div>
        )}
        <div style={{ fontSize: '10px', color: `${color}80`, marginTop: '4px' }}>
          {event.date ? new Date(event.date).toLocaleDateString() : `Session ${event.session || '?'}`}
        </div>
      </div>
    </div>
  );
};

// HP visualization bar
const HPBar = ({ current, max, label }) => {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const barColor = pct > 50 ? theme.green : pct > 25 ? theme.gold : theme.red;
  return (
    <div style={{ flex: 1, minWidth: '120px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '10px', color: theme.muted, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '10px', color: barColor, fontWeight: 700 }}>{current}/{max}</span>
      </div>
      <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: '4px',
          background: `linear-gradient(90deg, ${barColor}, ${barColor}CC)`,
          boxShadow: `0 0 10px ${barColor}40`,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
};

export default function PlayerProgressionDashboard({ character, characterId }) {
  const [journalEntries, setJournalEntries] = useState([]);
  const [showFullTimeline, setShowFullTimeline] = useState(false);

  useEffect(() => {
    if (characterId) {
      axios.get(`${API}/player/journal`, { params: { character_id: characterId } })
        .then(res => setJournalEntries(Array.isArray(res.data) ? res.data : res.data?.entries || []))
        .catch(() => {});
    }
  }, [characterId]);

  if (!character) return null;

  const level = character.level || 1;
  const className = character.character_class || 'Adventurer';
  const race = character.race || 'Unknown';
  const ac = character.armor_class || 10;
  const spellCount = (character.spells_known?.length || 0) + (character.cantrips_known?.length || 0);
  const itemCount = character.inventory?.length || 0;
  const gold = character.currency?.gp || character.gold || 0;

  // Build timeline from character data
  const timeline = useMemo(() => {
    const events = [];

    // Character creation
    events.push({
      type: 'milestone', title: `${character.name} was born`,
      description: `${race} ${className} begins their adventure`,
      date: character.created_at, session: 0,
    });

    // Level milestones
    for (let i = 2; i <= level; i++) {
      events.push({
        type: 'level_up', title: `Reached Level ${i}`,
        description: i === 3 ? 'Chose subclass specialization' : i % 4 === 0 ? 'Ability Score Improvement' : `${className} Level ${i}`,
        session: i,
      });
    }

    // Spells learned (from character data)
    (character.spells_known || []).forEach((spell, i) => {
      events.push({
        type: 'spell_learned',
        title: `Learned ${spell.name || spell}`,
        description: spell.school ? `${spell.school} spell` : 'New spell mastered',
        session: Math.max(1, Math.ceil((i + 1) / 2)),
      });
    });

    // Items from inventory
    (character.inventory || []).filter(i => i.is_magic || i.rarity !== 'Common').forEach(item => {
      events.push({
        type: 'item_gained',
        title: `Found ${item.name}`,
        description: item.rarity ? `${item.rarity} item` : 'Notable equipment',
        session: Math.floor(Math.random() * level) + 1,
      });
    });

    // Journal combat entries
    journalEntries.filter(e => e.type === 'combat').forEach(entry => {
      events.push({
        type: 'combat', title: entry.title,
        description: entry.content?.substring(0, 80) || '',
        date: entry.created_at, session: entry.session_number,
      });
    });

    // Sort by session/date
    events.sort((a, b) => (a.session || 0) - (b.session || 0));
    return events;
  }, [character, journalEntries, level, className, race]);

  const visibleTimeline = showFullTimeline ? timeline : timeline.slice(-6);

  // XP to next level approximation
  const xpThresholds = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
  const currentXP = character.experience_points || xpThresholds[level - 1] || 0;
  const nextLevelXP = xpThresholds[level] || currentXP + 1000;
  const xpProgress = ((currentXP - (xpThresholds[level - 1] || 0)) / (nextLevelXP - (xpThresholds[level - 1] || 0))) * 100;

  const cardStyle = {
    background: theme.bg, border: `1px solid ${theme.border}`,
    borderRadius: '14px', padding: '16px',
  };

  return (
    <div data-testid="progression-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Character Header */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: `linear-gradient(135deg, ${theme.accent}30, ${theme.pink}30)`,
          border: `3px solid ${theme.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', fontWeight: 800, color: theme.accent,
          fontFamily: "'Cinzel', serif",
        }}>
          {level}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: theme.text, fontFamily: "'Cinzel', serif" }}>
            {character.name}
          </div>
          <div style={{ fontSize: '13px', color: theme.muted }}>
            Level {level} {race} {className}
            {character.subclass && ` - ${character.subclass}`}
          </div>
          {/* XP Progress */}
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ fontSize: '9px', color: theme.muted }}>XP Progress</span>
              <span style={{ fontSize: '9px', color: theme.accent }}>{currentXP.toLocaleString()} / {nextLevelXP.toLocaleString()}</span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, xpProgress)}%`, height: '100%', borderRadius: '3px',
                background: `linear-gradient(90deg, ${theme.accent}, ${theme.pink})`,
                boxShadow: `0 0 10px ${theme.accent}40`,
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <StatCard icon={Shield} label="AC" value={ac} color={theme.blue} />
        <StatCard icon={BookOpen} label="Spells" value={spellCount} color={theme.purple} />
        <StatCard icon={Sword} label="Items" value={itemCount} color={theme.pink} />
        <StatCard icon={Star} label="Gold" value={gold} color={theme.gold} />
      </div>

      {/* Rest Resources */}
      <div style={{ ...cardStyle }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: '10px' }}>
          Rest Resources
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <HPBar
            current={character.hit_dice_remaining || level}
            max={level}
            label="Hit Dice"
          />
        </div>
      </div>

      {/* Adventure Timeline */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
            Adventure Timeline ({timeline.length} events)
          </div>
          {timeline.length > 6 && (
            <button
              onClick={() => setShowFullTimeline(!showFullTimeline)}
              data-testid="toggle-timeline"
              style={{
                background: 'none', border: `1px solid ${theme.border}`,
                borderRadius: '4px', padding: '3px 8px', cursor: 'pointer',
                color: theme.accent, fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              {showFullTimeline ? 'Show Less' : 'Show All'}
              {showFullTimeline ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>

        {/* Timeline */}
        <div style={{ maxHeight: showFullTimeline ? 'none' : '400px', overflow: 'hidden' }}>
          {visibleTimeline.map((event, i) => (
            <TimelineEvent key={i} event={event} index={i} isLast={i === visibleTimeline.length - 1} />
          ))}
        </div>

        {visibleTimeline.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: theme.muted, fontSize: '13px' }}>
            Your adventure begins here. Journal entries, level ups, and discoveries will appear in this timeline.
          </div>
        )}
      </div>

      {/* Achievement Badges */}
      <div style={cardStyle}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: '10px' }}>
          Achievements
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {level >= 1 && <Badge label="Adventurer" desc="Character created" color={theme.accent} icon={Star} />}
          {level >= 3 && <Badge label="Specialization" desc="Chose subclass" color={theme.purple} icon={Sparkles} />}
          {level >= 5 && <Badge label="Veteran" desc="Reached Level 5" color={theme.gold} icon={Trophy} />}
          {spellCount >= 5 && <Badge label="Arcanist" desc="5+ spells learned" color={theme.blue} icon={BookOpen} />}
          {itemCount >= 10 && <Badge label="Collector" desc="10+ items found" color={theme.pink} icon={Sword} />}
          {gold >= 100 && <Badge label="Wealthy" desc="100+ gold" color={theme.gold} icon={Star} />}
          {journalEntries.length >= 5 && <Badge label="Chronicler" desc="5+ journal entries" color={theme.green} icon={Scroll} />}
        </div>
      </div>
    </div>
  );
}

// Achievement badge
const Badge = ({ label, desc, color, icon: Icon }) => (
  <div
    data-testid={`badge-${label.toLowerCase()}`}
    style={{
      padding: '8px 12px', borderRadius: '10px',
      background: `${color}10`, border: `1px solid ${color}30`,
      display: 'flex', alignItems: 'center', gap: '8px',
    }}
    title={desc}
  >
    <div style={{
      width: '28px', height: '28px', borderRadius: '50%',
      background: `${color}20`, border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={14} color={color} />
    </div>
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, color }}>{label}</div>
      <div style={{ fontSize: '9px', color: theme.muted }}>{desc}</div>
    </div>
  </div>
);
