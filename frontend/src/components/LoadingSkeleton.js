import React from 'react';

function LoadingSkeleton({ type = 'card', count = 3 }) {
  const renderCardSkeleton = () => (
    <div className="skeleton-card" style={{
      background: 'rgba(30, 41, 59, 0.4)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '16px',
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
    }}>
      <div className="skeleton-title" style={{
        height: '24px',
        background: 'rgba(71, 85, 105, 0.5)',
        borderRadius: '8px',
        marginBottom: '16px',
        width: '60%'
      }} />
      <div className="skeleton-text" style={{
        height: '16px',
        background: 'rgba(71, 85, 105, 0.3)',
        borderRadius: '8px',
        marginBottom: '12px',
        width: '100%'
      }} />
      <div className="skeleton-text" style={{
        height: '16px',
        background: 'rgba(71, 85, 105, 0.3)',
        borderRadius: '8px',
        marginBottom: '12px',
        width: '80%'
      }} />
      <div className="skeleton-text" style={{
        height: '16px',
        background: 'rgba(71, 85, 105, 0.3)',
        borderRadius: '8px',
        width: '40%'
      }} />
    </div>
  );

  const renderTableSkeleton = () => (
    <div className="skeleton-table" style={{
      background: 'rgba(30, 41, 59, 0.4)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '16px'
    }}>
      {[...Array(count)].map((_, idx) => (
        <div key={idx} style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '16px',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          animationDelay: `${idx * 0.1}s`
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'rgba(71, 85, 105, 0.5)',
            borderRadius: '50%'
          }} />
          <div style={{ flex: 1 }}>
            <div style={{
              height: '20px',
              background: 'rgba(71, 85, 105, 0.5)',
              borderRadius: '8px',
              marginBottom: '8px',
              width: '40%'
            }} />
            <div style={{
              height: '16px',
              background: 'rgba(71, 85, 105, 0.3)',
              borderRadius: '8px',
              width: '80%'
            }} />
          </div>
          <div style={{
            width: '100px',
            height: '40px',
            background: 'rgba(71, 85, 105, 0.3)',
            borderRadius: '8px'
          }} />
        </div>
      ))}
    </div>
  );

  const renderListSkeleton = () => (
    <div className="skeleton-list">
      {[...Array(count)].map((_, idx) => (
        <div key={idx} style={{
          background: 'rgba(30, 41, 59, 0.4)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          animationDelay: `${idx * 0.1}s`
        }}>
          <div style={{
            height: '18px',
            background: 'rgba(71, 85, 105, 0.5)',
            borderRadius: '8px',
            marginBottom: '8px',
            width: '50%'
          }} />
          <div style={{
            height: '14px',
            background: 'rgba(71, 85, 105, 0.3)',
            borderRadius: '8px',
            width: '90%'
          }} />
        </div>
      ))}
    </div>
  );

  return (
    <>
      {type === 'card' && renderCardSkeleton()}
      {type === 'table' && renderTableSkeleton()}
      {type === 'list' && renderListSkeleton()}
      
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
}

export default LoadingSkeleton;
