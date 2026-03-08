import React from 'react';
import { X } from 'lucide-react';

const theme = {
  accent: '#C54B2C',
  bg: { dark: '#1A1A1A', card: '#262626', panel: '#1F1F1F' },
  text: { white: '#FFFFFF', secondary: '#B0B0B0', muted: '#707070' },
  border: 'rgba(255, 255, 255, 0.15)'
};

const shortcuts = [
  { key: 'R', action: 'Toggle Dice Roller', category: 'Tools' },
  { key: 'N', action: 'Quick Note', category: 'Tools' },
  { key: '/', action: 'Focus Search', category: 'Navigation' },
  { key: '?', action: 'Show This Help', category: 'Help' },
  { key: 'Esc', action: 'Close Modal / Cancel', category: 'Navigation' },
];

export function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: theme.bg.panel,
          border: `1px solid ${theme.border}`,
          padding: '24px',
          maxWidth: '400px',
          width: '90%'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ 
            color: theme.text.white, 
            fontSize: '18px', 
            fontWeight: '400',
            fontFamily: "Eros Book, sans-serif"
          }}>
            Keyboard Shortcuts
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.text.muted,
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {shortcuts.map((shortcut, index) => (
            <div 
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                background: theme.bg.card,
                border: `1px solid ${theme.border}`
              }}
            >
              <span style={{ color: theme.text.secondary, fontSize: '14px' }}>
                {shortcut.action}
              </span>
              <kbd style={{
                background: theme.bg.dark,
                border: `1px solid ${theme.border}`,
                padding: '4px 10px',
                fontSize: '13px',
                fontFamily: 'monospace',
                color: theme.accent,
                fontWeight: '400',
                minWidth: '36px',
                textAlign: 'center'
              }}>
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <p style={{ 
          marginTop: '16px', 
          fontSize: '12px', 
          color: theme.text.muted,
          textAlign: 'center'
        }}>
          Press <kbd style={{ 
            background: theme.bg.dark, 
            padding: '2px 6px', 
            border: `1px solid ${theme.border}`,
            color: theme.accent
          }}>?</kbd> anytime to show this help
        </p>
      </div>
    </div>
  );
}

// Small indicator that shows in corner
export function ShortcutsHint({ onClick }) {
  return (
    <button
      onClick={onClick}
      title="Keyboard Shortcuts (?)"
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        background: theme.bg.card,
        border: `1px solid ${theme.border}`,
        color: theme.text.muted,
        padding: '8px 12px',
        fontSize: '12px',
        cursor: 'pointer',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        opacity: 0.7,
        transition: 'opacity 0.2s'
      }}
      onMouseEnter={e => e.target.style.opacity = 1}
      onMouseLeave={e => e.target.style.opacity = 0.7}
    >
      <kbd style={{ 
        background: theme.bg.dark, 
        padding: '2px 6px',
        color: theme.accent,
        fontFamily: 'monospace'
      }}>?</kbd>
      <span>Shortcuts</span>
    </button>
  );
}

export default KeyboardShortcutsModal;
