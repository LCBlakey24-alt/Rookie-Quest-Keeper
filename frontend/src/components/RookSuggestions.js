import React, { useState, useEffect } from 'react';
import { Sparkles, X, ChevronRight, Lightbulb } from 'lucide-react';

// ROOK AI Suggestions - "Did you know?" popups based on character build
const ROOK_SUGGESTIONS = {
  // Class-based suggestions
  barbarian: [
    {
      id: 'rage-reminder',
      trigger: 'combat_start',
      title: "Don't Forget Your Rage!",
      message: "As a Barbarian, you can enter a Rage as a bonus action. While raging, you deal extra damage and resist physical damage!",
      tip: "Rage gives +2 damage at level 1, scaling up at higher levels."
    },
    {
      id: 'reckless-attack',
      trigger: 'attack',
      title: "Reckless Attack Option",
      message: "You can attack recklessly to gain advantage on all melee attacks this turn. But enemies also get advantage against you!",
      tip: "Great for when you need to hit hard and can take a beating."
    },
    {
      id: 'danger-sense',
      trigger: 'dex_save',
      title: "Danger Sense Active!",
      message: "At level 2+, you have advantage on Dexterity saves against effects you can see, like traps and spells.",
      minLevel: 2
    }
  ],
  fighter: [
    {
      id: 'second-wind',
      trigger: 'low_hp',
      title: "Use Second Wind!",
      message: "You can use a bonus action to regain 1d10 + your Fighter level in hit points. This recharges on a short rest!",
      tip: "Don't wait too long - it's free healing!"
    },
    {
      id: 'action-surge',
      trigger: 'combat',
      title: "Action Surge Available",
      message: "At level 2+, you can take an additional action on your turn. This is a huge burst of damage or utility!",
      minLevel: 2,
      tip: "Perfect for nova rounds or clutch moments."
    },
    {
      id: 'extra-attack',
      trigger: 'attack',
      title: "Extra Attack!",
      message: "At level 5+, you attack twice when you take the Attack action. At 11th, three times. At 20th, four times!",
      minLevel: 5
    }
  ],
  rogue: [
    {
      id: 'sneak-attack',
      trigger: 'attack',
      title: "Sneak Attack Opportunity!",
      message: "If you have advantage OR an ally is within 5 feet of your target, you can add Sneak Attack damage!",
      tip: "This is your bread and butter - look for ways to trigger it every turn."
    },
    {
      id: 'cunning-action',
      trigger: 'turn_start',
      title: "Cunning Action Reminder",
      message: "At level 2+, you can Dash, Disengage, or Hide as a bonus action every turn!",
      minLevel: 2,
      tip: "Hide to gain advantage for Sneak Attack next turn."
    },
    {
      id: 'uncanny-dodge',
      trigger: 'hit',
      title: "Use Uncanny Dodge?",
      message: "At level 5+, when hit by an attack you can see, use your reaction to halve the damage!",
      minLevel: 5
    }
  ],
  wizard: [
    {
      id: 'arcane-recovery',
      trigger: 'short_rest',
      title: "Arcane Recovery!",
      message: "Once per day during a short rest, you can recover spell slots equal to half your Wizard level (rounded up).",
      tip: "Great for getting back that Fireball slot!"
    },
    {
      id: 'ritual-casting',
      trigger: 'out_of_combat',
      title: "Ritual Spells Available",
      message: "You can cast ritual spells without expending spell slots if you have them in your spellbook. Takes 10 extra minutes.",
      tip: "Detect Magic, Identify, Find Familiar - all great rituals!"
    },
    {
      id: 'spell-slots',
      trigger: 'low_slots',
      title: "Running Low on Spells?",
      message: "Consider using cantrips for damage and saving slots for control or emergency spells.",
      tip: "Fire Bolt scales with level and never runs out!"
    }
  ],
  cleric: [
    {
      id: 'channel-divinity',
      trigger: 'combat',
      title: "Channel Divinity Ready!",
      message: "At level 2+, you can use Channel Divinity once per short rest. Turn Undead is always available!",
      minLevel: 2,
      tip: "Your domain gives additional Channel Divinity options."
    },
    {
      id: 'healing-word',
      trigger: 'ally_down',
      title: "Quick Heal Available!",
      message: "Healing Word is a bonus action with 60ft range - perfect for getting allies back up from 0 HP!",
      tip: "Even 1 HP gets them back in the fight."
    },
    {
      id: 'prepared-spells',
      trigger: 'long_rest',
      title: "Prepare Your Spells!",
      message: "After a long rest, you can change which spells you have prepared. Adapt to the challenges ahead!",
      tip: "Wisdom mod + Cleric level = total prepared spells."
    }
  ],
  bard: [
    {
      id: 'bardic-inspiration',
      trigger: 'ally_roll',
      title: "Give Bardic Inspiration!",
      message: "Use a bonus action to give an ally a Bardic Inspiration die they can add to an attack, save, or check!",
      tip: "At level 5+, these recharge on short rest!"
    },
    {
      id: 'jack-of-all-trades',
      trigger: 'ability_check',
      title: "Jack of All Trades!",
      message: "At level 2+, add half your proficiency (rounded down) to any ability check you're not proficient in.",
      minLevel: 2
    },
    {
      id: 'song-of-rest',
      trigger: 'short_rest',
      title: "Song of Rest!",
      message: "At level 2+, allies who spend Hit Dice during a short rest heal an extra 1d6 HP from your performance!",
      minLevel: 2
    }
  ],
  // General suggestions for all characters
  general: [
    {
      id: 'help-action',
      trigger: 'ally_roll',
      title: "Help Action Available",
      message: "You can use your action to Help an ally, giving them advantage on their next ability check or attack roll!",
      tip: "Great when you can't reach enemies or need support role."
    },
    {
      id: 'dodge-action',
      trigger: 'surrounded',
      title: "Consider Dodging!",
      message: "The Dodge action gives all attackers disadvantage against you until your next turn.",
      tip: "Perfect when you need to survive a round."
    },
    {
      id: 'ready-action',
      trigger: 'waiting',
      title: "Ready an Action?",
      message: "You can Ready an action to trigger when a specific condition occurs. Uses your reaction.",
      tip: "Ready a spell or attack for when the enemy appears!"
    },
    {
      id: 'death-saves',
      trigger: 'ally_zero_hp',
      title: "Stabilize or Heal!",
      message: "An ally at 0 HP makes death saves. A Medicine check (DC 10) or any healing stabilizes them!",
      tip: "Spare the Dying is a cantrip that auto-stabilizes."
    }
  ]
};

// Get relevant suggestions for a character
function getSuggestionsForCharacter(characterClass, level, trigger) {
  const suggestions = [];
  
  // Get class-specific suggestions
  const classLower = (characterClass || '').toLowerCase();
  const classSuggestions = ROOK_SUGGESTIONS[classLower] || [];
  
  classSuggestions.forEach(s => {
    if (s.trigger === trigger && (!s.minLevel || level >= s.minLevel)) {
      suggestions.push(s);
    }
  });
  
  // Get general suggestions
  ROOK_SUGGESTIONS.general.forEach(s => {
    if (s.trigger === trigger) {
      suggestions.push(s);
    }
  });
  
  return suggestions;
}

// Random tip selector
function getRandomTip(characterClass, level) {
  const classLower = (characterClass || '').toLowerCase();
  const allSuggestions = [
    ...(ROOK_SUGGESTIONS[classLower] || []),
    ...ROOK_SUGGESTIONS.general
  ].filter(s => !s.minLevel || level >= s.minLevel);
  
  if (allSuggestions.length === 0) return null;
  return allSuggestions[Math.floor(Math.random() * allSuggestions.length)];
}

// ROOK Suggestion Popup Component
function RookSuggestionPopup({ 
  suggestion, 
  onDismiss, 
  position = 'bottom-right',
  autoHide = true,
  autoHideDelay = 10000 
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Entrance animation
    const animTimer = setTimeout(() => setIsAnimating(false), 300);
    
    // Auto hide
    let hideTimer;
    if (autoHide) {
      hideTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300);
      }, autoHideDelay);
    }
    
    return () => {
      clearTimeout(animTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [autoHide, autoHideDelay, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  if (!suggestion) return null;

  const positionStyles = {
    'bottom-right': { bottom: '24px', right: '24px' },
    'bottom-left': { bottom: '24px', left: '24px' },
    'top-right': { top: '80px', right: '24px' },
    'top-left': { top: '80px', left: '24px' }
  };

  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 1000,
        maxWidth: '380px',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15, 36, 64, 0.96) 0%, rgba(10, 22, 40, 0.96) 100%)',
          backdropFilter: 'blur(16px)',
          border: '2px solid rgba(212, 160, 23, 0.35)',
          borderRadius: '10px',
          padding: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), 0 0 30px rgba(212, 160, 23, 0.12)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #D4A017 0%, #F5C542 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Lightbulb size={20} color="#0A1628" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              marginBottom: '4px'
            }}>
              <span style={{ 
                color: '#D4A017',
                fontSize: '10px', 
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                ROOK Says
              </span>
              <Sparkles size={12} color="#D4A017" />
            </div>
            <h4 style={{ 
              color: '#fff', 
              fontSize: '15px', 
              fontWeight: '800',
              fontFamily: "'Montserrat', sans-serif",
              margin: 0
            }}>
              {suggestion.title}
            </h4>
          </div>
          <button
            data-testid="rook-dismiss-btn"
            onClick={handleDismiss}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Message */}
        <p style={{ 
          color: '#e2e8f0', 
          fontSize: '13px', 
          lineHeight: '1.5',
          margin: '0 0 12px 0'
        }}>
          {suggestion.message}
        </p>

        {/* Tip */}
        {suggestion.tip && (
          <div style={{
            background: 'rgba(212, 160, 23, 0.12)',
            borderRadius: '8px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <ChevronRight size={14} color="#D4A017" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span style={{ color: '#F5C542', fontSize: '12px', lineHeight: '1.4' }}>
              {suggestion.tip}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ROOK Suggestion Manager - tracks shown suggestions and timing
function useRookSuggestions(characterClass, level) {
  const [currentSuggestion, setCurrentSuggestion] = useState(null);
  const [shownSuggestions, setShownSuggestions] = useState(new Set());
  const [lastShownTime, setLastShownTime] = useState(0);

  const showSuggestion = (trigger) => {
    const now = Date.now();
    // Don't show more than one suggestion every 30 seconds
    if (now - lastShownTime < 30000) return;

    const suggestions = getSuggestionsForCharacter(characterClass, level, trigger)
      .filter(s => !shownSuggestions.has(s.id));

    if (suggestions.length > 0) {
      const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
      setCurrentSuggestion(suggestion);
      setShownSuggestions(prev => new Set([...prev, suggestion.id]));
      setLastShownTime(now);
    }
  };

  const showRandomTip = () => {
    const now = Date.now();
    if (now - lastShownTime < 60000) return; // 1 minute between random tips

    const tip = getRandomTip(characterClass, level);
    if (tip && !shownSuggestions.has(tip.id)) {
      setCurrentSuggestion(tip);
      setShownSuggestions(prev => new Set([...prev, tip.id]));
      setLastShownTime(now);
    }
  };

  const dismissSuggestion = () => {
    setCurrentSuggestion(null);
  };

  const resetSuggestions = () => {
    setShownSuggestions(new Set());
  };

  return {
    currentSuggestion,
    showSuggestion,
    showRandomTip,
    dismissSuggestion,
    resetSuggestions
  };
}

export { 
  RookSuggestionPopup, 
  useRookSuggestions, 
  getSuggestionsForCharacter, 
  getRandomTip,
  ROOK_SUGGESTIONS 
};
export default RookSuggestionPopup;
