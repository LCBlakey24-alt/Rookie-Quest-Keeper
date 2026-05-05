import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Mobile Character Sheet Layout Component
 * Provides D&D Beyond-style horizontal pagination for mobile views
 */
export default function MobileCharacterSheetLayout({ 
  children, 
  pages = [], 
  theme,
  onPageChange 
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const handlePrevPage = () => {
    if (currentPage > 0) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
    }
  };

  const handleNextPage = () => {
    if (currentPage < pages.length - 1) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
    }
  };

  const handleDotClick = (index) => {
    setCurrentPage(index);
    onPageChange?.(index);
  };

  // Swipe handling for touch devices
  const handleTouchStart = (e) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchEnd = (e) => {
    setTouchEnd(e.changedTouches[0].clientX);
    if (!touchStart || !e.changedTouches[0].clientX) return;
    
    const distance = touchStart - e.changedTouches[0].clientX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) handleNextPage();
    if (isRightSwipe) handlePrevPage();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') handlePrevPage();
      if (e.key === 'ArrowRight') handleNextPage();
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, pages.length]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Pages Container */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
          width: '100%',
        }}
      >
        {/* Sliding pages */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            transform: `translateX(-${currentPage * 100}%)`,
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {pages.map((page, index) => (
            <div
              key={index}
              style={{
                flex: '0 0 100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                overflow: 'auto',
                padding: '0 0 80px 0', // Space for nav
                scrollBehavior: 'smooth',
              }}
            >
              {page}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="mobile-page-nav" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        background: theme?.bg?.primary || 'rgba(10, 22, 40, 0.95)',
        borderTop: `1px solid ${theme?.border || 'rgba(212, 160, 23, 0.2)'}`,
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
      }}>
        {/* Previous Button */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 0}
          className="mobile-nav-arrow"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: currentPage === 0 ? 'rgba(212, 160, 23, 0.05)' : 'rgba(212, 160, 23, 0.1)',
            border: `1px solid ${theme?.border || 'rgba(212, 160, 23, 0.3)'}`,
            color: currentPage === 0 ? 'rgba(212, 160, 23, 0.4)' : theme?.accent?.primary || 'rgba(212, 160, 23, 0.8)',
            cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            opacity: currentPage === 0 ? 0.5 : 1,
          }}
          aria-label="Previous page"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Page Dots */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {pages.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className="mobile-nav-dot"
              style={{
                width: currentPage === index ? '10px' : '8px',
                height: currentPage === index ? '10px' : '8px',
                borderRadius: '50%',
                background: currentPage === index ? (theme?.accent?.highlight || '#F5C542') : 'rgba(212, 160, 23, 0.3)',
                border: `1px solid ${theme?.border || 'rgba(212, 160, 23, 0.5)'}`,
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: currentPage === index ? `0 0 8px ${theme?.accent?.highlight || 'rgba(212, 160, 23, 0.6)'}` : 'none',
              }}
              aria-label={`Go to page ${index + 1}`}
              aria-current={currentPage === index ? 'page' : undefined}
            />
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={handleNextPage}
          disabled={currentPage === pages.length - 1}
          className="mobile-nav-arrow"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: currentPage === pages.length - 1 ? 'rgba(212, 160, 23, 0.05)' : 'rgba(212, 160, 23, 0.1)',
            border: `1px solid ${theme?.border || 'rgba(212, 160, 23, 0.3)'}`,
            color: currentPage === pages.length - 1 ? 'rgba(212, 160, 23, 0.4)' : theme?.accent?.primary || 'rgba(212, 160, 23, 0.8)',
            cursor: currentPage === pages.length - 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            opacity: currentPage === pages.length - 1 ? 0.5 : 1,
          }}
          aria-label="Next page"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Page Indicator Text */}
      <div style={{
        textAlign: 'center',
        fontSize: '12px',
        color: theme?.text?.muted || '#64748B',
        padding: '4px 0',
        borderTop: `1px solid ${theme?.border || 'rgba(212, 160, 23, 0.1)'}`,
      }}>
        Page {currentPage + 1} of {pages.length}
      </div>
    </div>
  );
}
