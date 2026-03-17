import React, { useState, useEffect } from 'react';
import { Sparkles, Wand2, Check, User, MapPin, Scroll } from 'lucide-react';

/**
 * Animated ROOK Demo Component
 * Shows a looping animation of ROOK AI generating content
 */
export const RookDemo = () => {
  const [stage, setStage] = useState(0);
  const [typedText, setTypedText] = useState('');
  
  const stages = [
    { type: 'idle', duration: 1500 },
    { type: 'typing', text: 'A mysterious elven merchant with a hidden past...', duration: 2500 },
    { type: 'generating', duration: 2000 },
    { type: 'result', duration: 3000 },
    { type: 'fadeOut', duration: 500 }
  ];

  const npcResult = {
    name: 'Sylvaris Moonwhisper',
    race: 'Elf',
    occupation: 'Traveling Merchant',
    trait: 'Speaks in riddles, carries a mysterious locket'
  };

  useEffect(() => {
    const currentStage = stages[stage];
    
    if (currentStage.type === 'typing') {
      let charIndex = 0;
      const typeInterval = setInterval(() => {
        if (charIndex <= currentStage.text.length) {
          setTypedText(currentStage.text.slice(0, charIndex));
          charIndex++;
        } else {
          clearInterval(typeInterval);
        }
      }, 50);
      
      const timeout = setTimeout(() => {
        setStage((prev) => (prev + 1) % stages.length);
      }, currentStage.duration);
      
      return () => {
        clearInterval(typeInterval);
        clearTimeout(timeout);
      };
    } else {
      const timeout = setTimeout(() => {
        if (stage === stages.length - 1) {
          setTypedText('');
        }
        setStage((prev) => (prev + 1) % stages.length);
      }, currentStage.duration);
      
      return () => clearTimeout(timeout);
    }
  }, [stage]);

  const currentStage = stages[stage];

  return (
    <div style={{
      width: '100%',
      maxWidth: '500px',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: '16px',
      border: '1px solid rgba(34, 211, 238, 0.2)',
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: 'rgba(225, 29, 72, 0.1)',
        borderBottom: '1px solid rgba(225, 29, 72, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <Sparkles size={28} color="#C54B2C" />
        <div>
          <div style={{ 
            color: '#C54B2C', 
            fontWeight: '400', 
            fontSize: '16px',
            fontFamily: "'Montserrat', sans-serif"
          }}>
            ROOK
          </div>
          <div style={{ color: '#808080', fontSize: '11px' }}>AI Assistant</div>
        </div>
        <div style={{ 
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          background: currentStage.type === 'generating' 
            ? 'rgba(34, 211, 238, 0.2)' 
            : 'rgba(34, 211, 238, 0.1)',
          borderRadius: '12px',
          fontSize: '11px',
          color: '#22D3EE'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: currentStage.type === 'generating' ? '#22D3EE' : '#10B981',
            animation: currentStage.type === 'generating' ? 'pulse 1s infinite' : 'none'
          }} />
          {currentStage.type === 'generating' ? 'Generating...' : 'Ready'}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ padding: '20px', minHeight: '200px' }}>
        {/* Input Area */}
        <div style={{
          background: '#0f172a',
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '16px',
          border: '1px solid #334155'
        }}>
          <div style={{ 
            color: '#64748b', 
            fontSize: '11px', 
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Describe your NPC
          </div>
          <div style={{
            color: typedText ? '#e2e8f0' : '#475569',
            fontSize: '14px',
            minHeight: '20px',
            fontFamily: 'inherit'
          }}>
            {typedText || 'Type a description...'}
            {currentStage.type === 'typing' && (
              <span style={{
                display: 'inline-block',
                width: '2px',
                height: '16px',
                background: '#22D3EE',
                marginLeft: '2px',
                animation: 'blink 0.8s infinite'
              }} />
            )}
          </div>
        </div>

        {/* Generate Button */}
        <button style={{
          width: '100%',
          padding: '12px',
          background: currentStage.type === 'generating'
            ? 'linear-gradient(135deg, #0891b2 0%, #0284c7 100%)'
            : 'linear-gradient(135deg, #22D3EE 0%, #F2A541 100%)',
          border: 'none',
          borderRadius: '10px',
          color: '#ffffff',
          fontWeight: '400',
          fontSize: '14px',
          fontFamily: "'Montserrat', sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: 'pointer',
          transition: 'all 0.3s',
          boxShadow: currentStage.type === 'generating' 
            ? '0 0 30px rgba(34, 211, 238, 0.5)' 
            : '0 4px 20px rgba(34, 211, 238, 0.3)'
        }}>
          {currentStage.type === 'generating' ? (
            <>
              <Sparkles size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Summoning NPC...
            </>
          ) : (
            <>
              <Wand2 size={18} />
              Generate with ROOK
            </>
          )}
        </button>

        {/* Result Card */}
        {(currentStage.type === 'result' || currentStage.type === 'fadeOut') && (
          <div style={{
            marginTop: '16px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(34, 211, 238, 0.1) 100%)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            opacity: currentStage.type === 'fadeOut' ? 0 : 1,
            transform: currentStage.type === 'fadeOut' ? 'translateY(10px)' : 'translateY(0)',
            transition: 'all 0.5s ease'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '12px',
              color: '#10B981',
              fontSize: '12px',
              fontWeight: '400'
            }}>
              <Check size={16} />
              NPC Created Successfully!
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(225, 29, 72, 0.15)',
                border: '1px solid #C54B2C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <User size={24} color="#C54B2C" />
              </div>
              <div>
                <div style={{ color: '#ffffff', fontWeight: '400', fontSize: '16px' }}>
                  {npcResult.name}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                  {npcResult.race} • {npcResult.occupation}
                </div>
                <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', fontStyle: 'italic' }}>
                  "{npcResult.trait}"
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RookDemo;
