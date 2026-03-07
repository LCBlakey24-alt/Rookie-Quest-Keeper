import React from 'react';

/**
 * TronBackground - Adds animated laser light trails and grid effects
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
  // Calculate number of trails based on intensity - MORE LASERS!
  const trailCount = {
    subtle: { blue: 3, red: 3 },
    medium: { blue: 5, red: 5 },
    intense: { blue: 7, red: 7 }
  }[intensity];

  // More trail positions for laser effect
  const bluePositions = [8, 18, 28, 42, 58, 72, 88];
  const redPositions = [12, 25, 38, 52, 65, 78, 92];

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

      {/* Blue Light Trails - FAST LASERS */}
      {showBlue && (
        <>
          {bluePositions.slice(0, trailCount.blue).map((pos, i) => {
            const trailClass = i % 3 === 0 ? 'light-trail-blue' : i % 3 === 1 ? 'light-trail-blue-2' : 'light-trail-blue-3';
            return (
              <div
                key={`blue-${i}`}
                className={`light-trail ${trailClass}`}
                style={{
                  top: `${pos}%`,
                  left: 0,
                  width: `${120 + (i % 3) * 40}px`,
                  animationDelay: `${i * 0.3}s`
                }}
              />
            );
          })}
        </>
      )}

      {/* Red Light Trails - FAST LASERS */}
      {showRed && (
        <>
          {redPositions.slice(0, trailCount.red).map((pos, i) => {
            const trailClass = i % 3 === 0 ? 'light-trail-red' : i % 3 === 1 ? 'light-trail-red-2' : 'light-trail-red-3';
            return (
              <div
                key={`red-${i}`}
                className={`light-trail ${trailClass}`}
                style={{
                  top: `${pos}%`,
                  right: 0,
                  width: `${120 + (i % 3) * 40}px`,
                  animationDelay: `${i * 0.35}s`
                }}
              />
            );
          })}
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
          height: '150px',
          background: variant === 'blue' 
            ? 'linear-gradient(to top, rgba(6, 182, 212, 0.08) 0%, transparent 100%)'
            : variant === 'red'
            ? 'linear-gradient(to top, rgba(225, 29, 72, 0.08) 0%, transparent 100%)'
            : 'linear-gradient(to top, rgba(139, 92, 246, 0.05) 0%, transparent 100%)',
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
            width: '400px',
            height: '400px',
            background: 'radial-gradient(ellipse at top left, rgba(6, 182, 212, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          {/* Top right red accent */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '400px',
            height: '400px',
            background: 'radial-gradient(ellipse at top right, rgba(225, 29, 72, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
        </>
      )}
    </div>
  );
}

export default TronBackground;
