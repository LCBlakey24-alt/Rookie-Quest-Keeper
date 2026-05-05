import React from 'react';
import { UserCheck, X } from 'lucide-react';

/**
 * Global banner displayed when an admin is impersonating another user.
 */
const ImpersonationBanner = ({ theme, impersonatedUser, onStopImpersonating }) => {
  if (!impersonatedUser) return null;

  return (
    <div
      data-testid="impersonation-banner"
      style={{
        background: '#D4A017', // Gold accent for high visibility
        color: '#0A1628', // Dark text on gold
        padding: '10px 20px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        zIndex: 2000, // Ensure it's above almost everything
        position: 'sticky',
        top: 0,
        width: '100%'
      }}
    >
      <UserCheck size={18} color="#0A1628" />
      <span>IMPERSONATING: {impersonatedUser.toUpperCase()}</span>
      <button
        onClick={onStopImpersonating}
        data-testid="stop-impersonating-btn"
        style={{ background: 'none', border: 'none', color: '#0A1628', cursor: 'pointer', marginLeft: '15px', display: 'flex', alignItems: 'center' }}
      >
        <X size={16} /> Stop
      </button>
    </div>
  );
};

export default ImpersonationBanner;