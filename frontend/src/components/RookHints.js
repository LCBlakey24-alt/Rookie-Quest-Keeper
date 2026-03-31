import React, { useState, useEffect, useMemo } from 'react';
import { Lightbulb, X, ChevronRight, Sparkles } from 'lucide-react';

const ROOK_HINTS = {
  combat: [
    { trigger: (c) => c?.conditions?.length > 0, text: "You have active conditions! Check the Effects bar to see how they affect your rolls." },
    { trigger: (c) => (c?.current_hit_points || 0) < (c?.max_hit_points || 1) * 0.3, text: "Your HP is low! Consider using Second Wind, a healing potion, or taking a short rest." },
    { trigger: (c) => c?.exhaustion_level > 0, text: `Exhaustion level ${c => c?.exhaustion_level}! Long rest reduces it by 1. At level 6, you die.` },
    { trigger: (c) => c?.death_saves_failures > 0, text: "Death save failures don't reset until you're stabilized or healed!" },
  ],
  class_specific: {
    Fighter: [
      { level: 1, text: "As a Fighter, you can use Second Wind to heal 1d10+level HP once per short rest." },
      { level: 2, text: "Action Surge lets you take an extra action on your turn! Once per short rest." },
      { level: 5, text: "Extra Attack: You can attack twice when you take the Attack action." },
      { level: 9, text: "Indomitable: Reroll a failed saving throw! Once per long rest." },
    ],
    Barbarian: [
      { level: 1, text: "Rage gives you bonus damage and resistance to physical damage. Use it wisely!" },
      { level: 2, text: "Reckless Attack: Gain advantage on attacks, but enemies get advantage on you!" },
      { level: 5, text: "Extra Attack: Two attacks per Attack action while raging = devastating damage." },
      { level: 11, text: "Relentless Rage: Keep fighting even at 0 HP (DC 10 CON save, increases by 5)." },
    ],
    Rogue: [
      { level: 1, text: "Sneak Attack triggers when you have advantage OR an ally is within 5ft of your target." },
      { level: 2, text: "Cunning Action: Dash, Disengage, or Hide as a bonus action every turn!" },
      { level: 5, text: "Uncanny Dodge: Use your reaction to halve damage from an attack you can see." },
      { level: 7, text: "Evasion: DEX saves for half damage? You take ZERO damage on success." },
    ],
    Wizard: [
      { level: 1, text: "Your spellbook is your power. You can copy new spells from scrolls and other spellbooks!" },
      { level: 2, text: "Arcane Recovery: Once per day during a short rest, recover spell slots up to half your level." },
      { level: 5, text: "3rd-level spells unlocked! Fireball and Counterspell are game-changers." },
      { level: 18, text: "Spell Mastery: Cast a 1st and 2nd level spell at will without using spell slots." },
    ],
    Cleric: [
      { level: 1, text: "You prepare spells from the FULL cleric list each long rest. Flexibility is your strength!" },
      { level: 2, text: "Channel Divinity recharges on a short rest. Don't forget to use it!" },
      { level: 5, text: "Destroy Undead: Your Turn Undead now instantly destroys low CR undead." },
    ],
    Paladin: [
      { level: 1, text: "Lay on Hands: You have a pool of 5xLevel HP to heal with. Use it tactically!" },
      { level: 2, text: "Divine Smite: Spend a spell slot on a hit to deal extra 2d8+ radiant damage. Devastating!" },
      { level: 6, text: "Aura of Protection: You and allies within 10ft add your CHA to saving throws!" },
    ],
    Bard: [
      { level: 1, text: "Bardic Inspiration: Give allies a bonus die for their rolls! Short rest to recharge." },
      { level: 2, text: "Jack of All Trades: Half proficiency on all ability checks you're not proficient in." },
      { level: 3, text: "Your subclass defines your style - Lore for versatility, Valor for combat." },
    ],
    Ranger: [
      { level: 1, text: "Hunter's Mark is your bread and butter - extra 1d6 on every hit against the target!" },
      { level: 5, text: "Extra Attack: Two weapon attacks per turn makes Rangers deadly in combat." },
    ],
    Monk: [
      { level: 1, text: "Martial Arts: Use DEX for unarmed strikes and bonus action unarmed after attacking." },
      { level: 2, text: "Ki Points fuel Flurry of Blows, Patient Defense, and Step of the Wind. Short rest recharges." },
      { level: 5, text: "Stunning Strike: Spend 1 ki on a hit to potentially stun the target!" },
    ],
    Druid: [
      { level: 1, text: "You prepare spells from the full druid list each day. Adapt to any situation!" },
      { level: 2, text: "Wild Shape is incredibly versatile - use it for scouting, combat, or utility!" },
    ],
    Sorcerer: [
      { level: 1, text: "Sorcery Points are your unique resource. Convert spell slots or power Metamagic." },
      { level: 3, text: "Metamagic lets you twin spells, quicken them, or make them subtle. Incredibly powerful!" },
    ],
    Warlock: [
      { level: 1, text: "Pact Magic slots recharge on a SHORT rest. Use them liberally!" },
      { level: 2, text: "Eldritch Invocations customize your warlock. Agonizing Blast is almost mandatory." },
    ],
  },
  general: [
    { text: "Remember: you can use your reaction for opportunity attacks when enemies leave your reach!" },
    { text: "Bonus actions and reactions are separate from your main action. Plan your turn carefully!" },
    { text: "Advantage and disadvantage cancel each other out, no matter how many sources." },
    { text: "You can delay certain actions - readying an action uses your reaction to trigger later." },
    { text: "Short rests are 1 hour - great for hit dice healing and recharging class features." },
    { text: "Helping an ally gives them advantage. Great when you can't do much else!" },
  ],
};

export default function RookHints({ character, theme, activeTab }) {
  const [dismissed, setDismissed] = useState(new Set());
  const [currentHint, setCurrentHint] = useState(0);

  const hints = useMemo(() => {
    const results = [];
    const cls = character?.character_class;
    const level = character?.level || 1;

    // Combat hints (when conditions/HP issues)
    if (activeTab === 'combat') {
      ROOK_HINTS.combat.forEach(h => {
        try { if (h.trigger(character)) results.push(typeof h.text === 'function' ? h.text(character) : h.text); } catch {}
      });
    }

    // Class-specific hints
    if (cls && ROOK_HINTS.class_specific[cls]) {
      ROOK_HINTS.class_specific[cls]
        .filter(h => h.level <= level)
        .forEach(h => results.push(h.text));
    }

    // General hints (always)
    ROOK_HINTS.general.forEach(h => results.push(h.text));

    return results.filter(h => !dismissed.has(h));
  }, [character, activeTab, dismissed]);

  useEffect(() => {
    if (hints.length > 0) {
      const interval = setInterval(() => setCurrentHint(prev => (prev + 1) % hints.length), 12000);
      return () => clearInterval(interval);
    }
  }, [hints.length]);

  if (hints.length === 0) return null;

  const hint = hints[currentHint % hints.length];

  return (
    <div data-testid="rook-hints" style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 12px', borderRadius: '8px',
      background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
      fontSize: '11px', color: theme.text.secondary, lineHeight: 1.5,
    }}>
      <Sparkles size={14} color="#F59E0B" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        <strong style={{ color: '#F59E0B', marginRight: '4px' }}>ROOK:</strong>
        {hint}
      </span>
      <button onClick={() => { setDismissed(prev => new Set([...prev, hint])); setCurrentHint(c => c + 1); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text.muted, padding: '2px', flexShrink: 0 }}>
        <ChevronRight size={12} />
      </button>
    </div>
  );
}
