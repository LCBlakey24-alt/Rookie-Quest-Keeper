import React, { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';

/**
 * Global Omni-Search / Quick Switcher (CMD+K / CTRL+K)
 * Allows quick navigation and search across the application.
 */
const QuickSwitcher = ({ theme, onSearch, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]); // Dummy results

  const handleKeyDown = useCallback((event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      setIsOpen(prev => !prev);
      setQuery(''); // Clear query on open
    } else if (event.key === 'Escape' && isOpen) {
      setIsOpen(false);
      if (onClose) onClose();
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Dummy search logic - replace with actual search across spells, items, features, NPCs, etc.
  useEffect(() => {
    if (query.length > 1) {
      setResults([
        { type: 'Spell', name: 'Fireball', link: '/spells/fireball' },
        { type: 'Feature', name: 'Action Surge', link: '/character/features/action-surge' },
        { type: 'NPC', name: 'Marla the Innkeeper', link: '/gm/npcs/marla' },
      ].filter(item => item.name.toLowerCase().includes(query.toLowerCase())));
    } else {
      setResults([]);
    }
  }, [query]);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9998, display: 'flex', justifyContent: 'center', paddingTop: '10vh' }}>
      <div style={{ background: theme.bg.panel, borderRadius: '12px', width: '90%', maxWidth: '600px', boxShadow: '0 10px 40px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', borderBottom: `1px solid ${theme.border}` }}>
          <Search size={20} color={theme.text.muted} style={{ marginRight: '10px' }} />
          <input type="text" placeholder="Search spells, items, features, NPCs... (Ctrl+K)" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus style={{ flexGrow: 1, background: 'none', border: 'none', color: theme.text.primary, fontSize: '16px', outline: 'none' }} />
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: theme.text.muted, cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '10px 0' }}>
          {results.length === 0 && query.length > 1 && <p style={{ color: theme.text.muted, textAlign: 'center', padding: '20px' }}>No results found.</p>}
          {results.map((item, index) => (
            <div key={index} style={{ padding: '12px 20px', borderBottom: `1px solid ${theme.border}44`, cursor: 'pointer', '&:hover': { background: 'rgba(255,255,255,0.05)' } }}>
              <span style={{ color: theme.accent, fontSize: '11px', textTransform: 'uppercase', marginRight: '10px' }}>{item.type}</span>
              <span style={{ color: theme.text.primary, fontSize: '14px' }}>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickSwitcher;