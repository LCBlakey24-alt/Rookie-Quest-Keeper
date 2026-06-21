import React from 'react';
import { Button } from '@/components/ui/button';

function EmptyState({ icon: Icon, title, description, actionLabel, onAction, color = 'var(--rq-accent-primary, #C08A3D)' }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      textAlign: 'center',
      minHeight: '400px'
    }}>
      {Icon && (
        <div style={{
          marginBottom: '24px',
          opacity: 0.6
        }}>
          <Icon size={64} color={color} strokeWidth={1.5} />
        </div>
      )}
      
      <h3 style={{
        fontSize: '24px',
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: '400',
        color: 'var(--rq-text-primary, #F5E6C8)',
        marginBottom: '12px'
      }}>
        {title}
      </h3>
      
      <p style={{
        fontSize: '16px',
        color: 'var(--rq-text-muted, #CDBA98)',
        maxWidth: '400px',
        marginBottom: '32px',
        lineHeight: '1.6'
      }}>
        {description}
      </p>
      
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          className="btn-primary"
          style={{
            padding: '12px 32px',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
