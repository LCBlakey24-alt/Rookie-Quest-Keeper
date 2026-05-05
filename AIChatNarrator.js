import React from 'react';

/**
 * Placeholder for the AI Combat Narrator.
 * This component will display flavor text descriptions of combat events.
 */
const AIChatNarrator = ({ theme, lastCombatEvent }) => {
  // In a real implementation, lastCombatEvent would trigger an AI call
  // to generate a narrative description.
  const narrative = lastCombatEvent 
    ? `AI Narrator: ${lastCombatEvent.description || "A dramatic turn of events unfolds!"}`
    : "AI Narrator: Awaiting combat events...";

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: theme.bg.panel,
      border: `1px solid ${theme.accent}`,
      borderRadius: '8px',
      padding: '10px 20px',
      color: theme.text.primary,
      fontSize: '14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      zIndex: 1000,
      maxWidth: '600px',
      textAlign: 'center'
    }}>
      {narrative}
    </div>
  );
};

export default AIChatNarrator;