import React from 'react';

/**
 * TronBackground - Adds animated light cycle trails and grid effects
 * 
 * Props:
 * - variant: 'blue' | 'red' | 'both' | 'landing'
 * - intensity: 'subtle' | 'medium' | 'intense' (default: 'subtle')
 * - showGrid: boolean (default: true)
 * - showScanline: boolean (default: false)
 */
function TronBackground({ 
  variant = 'both', 
  intensity = 'subtle',
  showGrid = true,
  showScanline = false 
}) {
  // Calculate number of trails based on intensity
  const trailCount = {
    subtle: { blue: 2, red: 2 },
    medium: { blue: 3, red: 3 },
    intense: { blue: 4, red: 4 }
  }[intensity];

  // Trail positions (percentage from top)
  const bluePositions = [15, 35, 55, 75, 90];
  const redPositions = [20, 40, 60, 80, 95];

  const showBlue = variant === 'blue' || variant === 'both' || variant === 'landing';
  const showRed = variant === 'red' || variant === 'both' || variant === 'landing';

  return (
    <div 
      className="tron-effects-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden'
      }}
    >
      {/* Grid Overlay */}
      {showGrid && (
        <div 
          className={`tron-grid ${variant === 'blue' ? 'tron-grid-blue' : variant === 'red' ? 'tron-grid-red' : ''}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        />
      )}

      {/* Blue Light Trails */}
      {showBlue && (
        <>
          {bluePositions.slice(0, trailCount.blue).map((pos, i) => (
            <div
              key={`blue-${i}`}
              className={`light-trail light-trail-blue${i > 0 ? `-${i + 1}` : ''}`}
              style={{
                top: `${pos}%`,
                left: 0,
                width: `${100 + i * 30}px`,
                animationDelay: `${i * 2.5}s`
              }}
            />
          ))}
          {/* Diagonal trail for more dynamism */}
          {intensity !== 'subtle' && (
            <div
              className="light-trail light-trail-blue-3"
              style={{
                top: '60%',
                left: 0,
                width: '200px'
              }}
            />
          )}
        </>
      )}

      {/* Red Light Trails */}
      {showRed && (
        <>
          {redPositions.slice(0, trailCount.red).map((pos, i) => (
            <div
              key={`red-${i}`}
              className={`light-trail light-trail-red${i > 0 ? `-${i + 1}` : ''}`}
              style={{
                top: `${pos}%`,
                right: 0,
                width: `${100 + i * 30}px`,
                animationDelay: `${i * 2}s`
              }}
            />
          ))}
          {/* Diagonal trail for more dynamism */}
          {intensity !== 'subtle' && (
            <div
              className="light-trail light-trail-red-3"
              style={{
                top: '40%',
                right: 0,
                width: '200px'
              }}
            />
          )}
        </>
      )}

      {/* Scanline Effect */}
      {showScanline && (
        <div className="scanline" />
      )}

      {/* Horizon Glow */}
      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '200px',
          background: variant === 'blue' 
            ? 'linear-gradient(to top, rgba(6, 182, 212, 0.05) 0%, transparent 100%)'
            : variant === 'red'
            ? 'linear-gradient(to top, rgba(225, 29, 72, 0.05) 0%, transparent 100%)'
            : 'linear-gradient(to top, rgba(139, 92, 246, 0.03) 0%, transparent 100%)',
          pointerEvents: 'none'
        }}
      />

      {/* Corner Accents */}
      {variant === 'landing' && (
        <>
          {/* Top left blue accent */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '300px',
            height: '300px',
            background: 'radial-gradient(ellipse at top left, rgba(6, 182, 212, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          {/* Top right red accent */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '300px',
            height: '300px',
            background: 'radial-gradient(ellipse at top right, rgba(225, 29, 72, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
        </>
      )}
    </div>
  );
}

export default TronBackground;
