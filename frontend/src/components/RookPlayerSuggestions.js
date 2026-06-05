import React, { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { CLASS_FEATURES } from '@/data/classFeatures';

const mod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);

const ABILITY_TIPS = [
  { ability: 'strength',     threshold:  3, type: 'roleplay', emoji: '💪', title: 'Brute Strength', tip: (s) => `STR ${s} — you can shove, grapple, and intimidate with your body. Offer to break down doors, carry the injured, or threaten with a flex. Use Athletics instead of weapons to solve problems your way.` },
  { ability: 'dexterity',    threshold:  3, type: 'combat',   emoji: '🐾', title: 'Nimble Fighter',  tip: (s) => `DEX ${s} — Stealth and Acrobatics are your friends. Ask your GM to scout ahead, slip through gaps, or Tumble through enemy spaces to reach the squishy targets at the back.` },
  { ability: 'intelligence', threshold:  3, type: 'roleplay', emoji: '🔍', title: 'Sharp Mind',      tip: (s) => `INT ${s} — Investigation, History, and Arcana are exceptional. Ask to examine suspicious objects or ancient texts; you notice things others walk past.` },
  { ability: 'wisdom',       threshold:  3, type: 'roleplay', emoji: '👁️', title: 'Keen Senses',     tip: (s) => `WIS ${s} — your Perception and Insight checks are excellent. Ask the GM for a Perception check in unfamiliar rooms. Make Insight checks when NPCs seem to be hiding something.` },
  { ability: 'charisma',     threshold:  3, type: 'roleplay', emoji: '🗣️', title: 'Silver Tongue',   tip: (s) => `CHA ${s} — you're the natural face of the party. Take the lead in negotiations. Try Persuasion before combat breaks out, or use Deception to bluff past a guard. Your words are a weapon.` },
  { ability: 'constitution', threshold:  3, type: 'combat',   emoji: '🛡️', title: 'Iron Will',       tip: (s) => `CON ${s} — Concentration spells are safer on you (high DC threshold). You can also hold your breath, resist poisons, and survive environments that would knock others out.` },

  // Low ability score roleplay hooks
  { ability: 'intelligence', threshold: -2, type: 'roleplay', emoji: '🤔', title: 'Blissful Confusion', tip: (s) => `INT ${s} — lean into it! Misremember facts, ask "obvious" questions, or be genuinely surprised by revelations. The lovably confused party member can be the most memorable one at the table.` },
  { ability: 'charisma',     threshold: -2, type: 'roleplay', emoji: '😬', title: 'Brutally Honest',    tip: (s) => `CHA ${s} — your character says what everyone is thinking. Blunt, no filter, possibly rude. Play it for laughs or grim comedy; just don't rely on Persuasion checks.` },
];

const HP_TIPS = [
  { maxFraction: 0.25, type: 'survival', emoji: '❤️‍🔥', title: 'Critical HP', tip: (hp, max) => `You're at ${hp}/${max} HP — that's critical. Try to disengage, use a healing item, or ask your healer. Fighting on at this HP means one bad hit could drop you.` },
  { maxFraction: 0.50, type: 'survival', emoji: '💛', title: 'Low HP', tip: (hp, max) => `${hp}/${max} HP — below half. Consider playing defensively: use cover, stay back, or use the Help action to support allies instead of charging in.` },
];

const COMMON_SYNERGIES = {
  rogue: [
    { level: 2, type: 'combat', emoji: '⚔️', title: 'Cunning Action Chain', tip: 'Use Cunning Action to Dash or Disengage as a Bonus Action, then use your Action to make your attack with Sneak Attack. You can engage → deal massive damage → escape in one turn.' },
  ],
  barbarian: [
    { level: 2, type: 'combat', emoji: '⚔️', title: 'Reckless + Advantage Chain', tip: 'Reckless Attack gives YOU advantage — but enemies get advantage on YOU too. Pair this with a Reaction like Uncanny Dodge (when you gain it) or position near a Paladin who can Aura of Protection your saves.' },
  ],
  fighter: [
    { level: 2, type: 'combat', emoji: '⚔️', title: 'Action Surge', tip: 'Action Surge gives you a full extra Action once per short rest. Save it for a round where you need to drop a target — attack twice on your action + twice more on Action Surge is devastating.' },
    { level: 5, type: 'combat', emoji: '⚔️', title: 'Extra Attack', tip: 'You now get 2 attacks per Attack action. With Action Surge you can fire 4 attacks in one turn. Prioritize two-handed or versatile weapons to maximise each hit.' },
  ],
  wizard: [
    { level: 1, type: 'combat', emoji: '🔮', title: 'Concentration Stacking', tip: "You can only concentrate on one spell at a time — pick your big battlefield control spell (Web, Hold Person, Hypnotic Pattern) and layer other non-concentration spells on top. Plan before you cast." },
  ],
  paladin: [
    { level: 2, type: 'combat', emoji: '✨', title: 'Divine Smite Burst', tip: "Divine Smite triggers after a hit and spends a spell slot to add radiant damage. Save slots for moments when you KNOW the hit connects — critical hits double the smite dice." },
  ],
  bard: [
    { level: 1, type: 'roleplay', emoji: '🎵', title: 'Bardic Inspiration Timing', tip: "Give Bardic Inspiration BEFORE a skill check or attack, not after. The target can choose to add it — it doesn't expire immediately — so save it for the moment that really counts." },
  ],
};

function generateSuggestions(character) {
  const suggestions = [];
  const level = Number(character?.level || 1);
  const maxHp = Number(character?.max_hit_points || character?.max_hp || 10);
  const currentHp = Number(character?.current_hit_points || character?.hp || maxHp);
  const hpFraction = maxHp > 0 ? currentHp / maxHp : 1;

  // HP warnings
  for (const tip of HP_TIPS) {
    if (hpFraction <= tip.maxFraction) {
      suggestions.push({ id: `hp-${tip.maxFraction}`, ...tip, text: tip.tip(currentHp, maxHp) });
      break;
    }
  }

  // Ability score tips (highest ability with mod >= threshold)
  const scores = {
    strength: character?.strength || 10,
    dexterity: character?.dexterity || 10,
    constitution: character?.constitution || 10,
    intelligence: character?.intelligence || 10,
    wisdom: character?.wisdom || 10,
    charisma: character?.charisma || 10,
  };

  for (const tipDef of ABILITY_TIPS) {
    const score = scores[tipDef.ability] || 10;
    const modifier = mod(score);
    if (modifier >= tipDef.threshold) {
      suggestions.push({ id: `ability-${tipDef.ability}`, emoji: tipDef.emoji, title: tipDef.title, type: tipDef.type, text: tipDef.tip(score) });
      if (suggestions.length >= 4) break; // cap to avoid flooding
    }
  }

  // Class features reminder: find highest-impact feature at current level
  const className = (character?.character_class || '').toLowerCase().replace(/[\s\-]/g, '');
  const classData = CLASS_FEATURES[className];
  if (classData) {
    const activeFeatures = (classData.features || [])
      .filter(f => f.level <= level && ['action', 'bonus_action', 'reaction'].includes(f.type));
    if (activeFeatures.length > 0) {
      const feature = activeFeatures[activeFeatures.length - 1];
      suggestions.push({
        id: `feature-${feature.name}`,
        emoji: '⚔️',
        title: `Remember: ${feature.name}`,
        type: 'combat',
        text: `${feature.description}${feature.uses ? ` (${feature.uses})` : ''}`,
      });
    }
  }

  // Class synergy tips
  const synergies = COMMON_SYNERGIES[className] || [];
  for (const syn of synergies) {
    if (level >= syn.level) {
      suggestions.push({ id: `synergy-${syn.title}`, emoji: syn.emoji, title: syn.title, type: syn.type, text: syn.tip });
    }
  }

  // Conditions check
  const conditions = character?.conditions || [];
  if (conditions.length > 0) {
    const cond = conditions[0];
    suggestions.push({
      id: `condition-${cond}`,
      emoji: '⚠️',
      title: `Active: ${cond}`,
      type: 'survival',
      text: `You have the ${cond} condition. Ask your GM or healer what removes it — some conditions end on your next turn, others need a specific spell or action.`,
    });
  }

  return suggestions.slice(0, 6);
}

const TYPE_COLOR = {
  combat: '#C1121F',
  roleplay: '#4a7dff',
  survival: '#F59E0B',
};

export default function RookPlayerSuggestions({ character }) {
  const [open, setOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const suggestions = useMemo(() => generateSuggestions(character), [character]);

  const maxHp = Number(character?.max_hit_points || character?.max_hp || 10);
  const currentHp = Number(character?.current_hit_points || character?.hp || maxHp);
  const isLowHp = currentHp <= maxHp * 0.5;
  const hasCombat = suggestions.some(s => s.type === 'combat');
  const glowColor = isLowHp ? '#F59E0B' : hasCombat ? '#C1121F' : '#4a7dff';

  const askRook = useCallback(async () => {
    if (aiLoading || !character) return;
    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const prompt = [
        `Character: ${character.name}, ${character.character_class || 'unknown class'} level ${character.level || 1}`,
        `HP: ${currentHp}/${maxHp}`,
        `Conditions: ${(character.conditions || []).join(', ') || 'none'}`,
        `Top ability: ${Object.entries({ STR: character?.strength, DEX: character?.dexterity, CON: character?.constitution, INT: character?.intelligence, WIS: character?.wisdom, CHA: character?.charisma }).sort((a, b) => b[1] - a[1])[0]?.[0]}`,
        `Give ONE short, practical, interesting suggestion for this character right now. Keep it under 3 sentences. Focus on something surprising or non-obvious they might not have thought of.`,
      ].join('\n');
      const res = await apiClient.post('/ai/generate', { prompt, context_type: 'player_tip', character_name: character.name });
      setAiSuggestion(res.data?.response || res.data?.text || res.data?.content || null);
    } catch {
      toast.error('Rook could not generate a suggestion right now');
    } finally {
      setAiLoading(false);
    }
  }, [character, aiLoading, currentHp, maxHp]);

  if (!character) return null;

  return (
    <>
      {/* Floating Rook button */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Ask Rook for suggestions"
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '16px',
          zIndex: 200,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: `2px solid ${glowColor}`,
          background: `radial-gradient(circle at 40% 40%, rgba(10,10,40,0.95), rgba(10,10,40,0.8))`,
          boxShadow: open
            ? `0 0 0 4px ${glowColor}40, 0 0 20px ${glowColor}80`
            : `0 0 0 2px ${glowColor}30, 0 0 12px ${glowColor}50`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          animation: suggestions.length > 0 && !open ? 'rookPulse 2.5s ease-in-out infinite' : 'none',
          transition: 'box-shadow 0.3s, transform 0.2s',
          transform: open ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        ♜
        {suggestions.length > 0 && !open && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            background: glowColor, color: '#fff',
            width: '16px', height: '16px', borderRadius: '50%',
            fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {suggestions.length}
          </span>
        )}
      </button>

      {/* Suggestions panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '140px',
            right: '16px',
            zIndex: 199,
            width: 'min(340px, calc(100vw - 32px))',
            maxHeight: '60vh',
            overflowY: 'auto',
            background: 'rgba(8,8,30,0.97)',
            border: '1px solid rgba(74,125,255,0.3)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>♜</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Rook Suggestions</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Tips for {character.name}</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' }}
            >✕</button>
          </div>

          {/* Suggestions */}
          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {suggestions.map(s => (
              <div
                key={s.id}
                style={{
                  padding: '10px 12px',
                  background: `${TYPE_COLOR[s.type] || '#4a7dff'}0d`,
                  border: `1px solid ${TYPE_COLOR[s.type] || '#4a7dff'}30`,
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px' }}>{s.emoji}</span>
                  <strong style={{ fontSize: '11px', color: TYPE_COLOR[s.type] || '#4a7dff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.title}</strong>
                </div>
                <p style={{ fontSize: '11px', color: '#cbd5e1', margin: 0, lineHeight: '1.5' }}>{s.text}</p>
              </div>
            ))}

            {/* AI suggestion block */}
            {aiSuggestion && (
              <div style={{ padding: '10px 12px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px' }}>✨</span>
                  <strong style={{ fontSize: '11px', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rook says</strong>
                </div>
                <p style={{ fontSize: '11px', color: '#cbd5e1', margin: 0, lineHeight: '1.5' }}>{aiSuggestion}</p>
              </div>
            )}

            {/* Ask Rook button */}
            <button
              type="button"
              onClick={askRook}
              disabled={aiLoading}
              style={{
                width: '100%', padding: '8px', borderRadius: '8px',
                background: aiLoading ? 'rgba(100,116,139,0.2)' : 'rgba(168,85,247,0.15)',
                border: `1px solid ${aiLoading ? '#475569' : 'rgba(168,85,247,0.4)'}`,
                color: aiLoading ? '#64748b' : '#a855f7',
                fontSize: '12px', fontWeight: 600, cursor: aiLoading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              {aiLoading ? '♜ Rook is thinking…' : '✨ Ask Rook for a personalised tip'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes rookPulse {
          0%, 100% { box-shadow: 0 0 0 2px ${glowColor}30, 0 0 12px ${glowColor}50; }
          50% { box-shadow: 0 0 0 6px ${glowColor}20, 0 0 24px ${glowColor}80; }
        }
      `}</style>
    </>
  );
}
