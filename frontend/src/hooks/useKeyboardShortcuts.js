import { useEffect, useCallback, useState } from 'react';

/**
 * Global keyboard shortcuts for ROOK
 *
 * Shortcuts:
 * - R: Toggle dice roller
 * - N: Quick note (when in campaign)
 * - /: Focus search
 * - Esc: Close modals
 * - ?: Show shortcuts help
 */
export function useKeyboardShortcuts({
  onToggleDice,
  onQuickNote,
  onFocusSearch,
  onShowHelp,
  onEscape,
  enabled = true
} = {}) {
  const [openModal, setOpenModal] = useState(false);

  const handleKeyDown = useCallback((event) => {
    const target = event.target;
    const isTyping = target.tagName === 'INPUT' ||
                     target.tagName === 'TEXTAREA' ||
                     target.isContentEditable;

    if (event.key === 'Escape') {
      onEscape?.();
      setOpenModal(false);
      return;
    }

    if (isTyping) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    switch (event.key.toLowerCase()) {
      case 'r':
        event.preventDefault();
        onToggleDice?.();
        break;
      case 'n':
        event.preventDefault();
        onQuickNote?.();
        break;
      case '/':
        event.preventDefault();
        onFocusSearch?.();
        break;
      case '?':
        event.preventDefault();
        if (onShowHelp) {
          onShowHelp();
        } else {
          setOpenModal(true);
        }
        break;
      default:
        break;
    }
  }, [onToggleDice, onQuickNote, onFocusSearch, onShowHelp, onEscape]);

  useEffect(() => {
    if (!enabled) return undefined;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  return {
    openModal,
    setOpenModal,
  };
}

export default useKeyboardShortcuts;
