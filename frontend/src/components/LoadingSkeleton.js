import React from 'react';

function SkeletonLine({ className = '' }) {
  return <span className={`rq-loading-skeleton__line ${className}`} aria-hidden="true" />;
}

function LoadingSkeleton({ type = 'card', count = 3 }) {
  const items = Array.from({ length: count });

  const renderCardSkeleton = () => (
    <div className="rq-loading-skeleton rq-loading-skeleton--card">
      <SkeletonLine className="rq-loading-skeleton__line--title" />
      <SkeletonLine />
      <SkeletonLine className="rq-loading-skeleton__line--medium" />
      <SkeletonLine className="rq-loading-skeleton__line--short" />
    </div>
  );

  const renderTableSkeleton = () => (
    <div className="rq-loading-skeleton rq-loading-skeleton--table">
      {items.map((_, idx) => (
        <div className="rq-loading-skeleton__row" key={idx} style={{ '--rq-skeleton-delay': `${idx * 0.08}s` }}>
          <span className="rq-loading-skeleton__avatar" aria-hidden="true" />
          <div className="rq-loading-skeleton__row-copy">
            <SkeletonLine className="rq-loading-skeleton__line--row-title" />
            <SkeletonLine className="rq-loading-skeleton__line--medium" />
          </div>
          <SkeletonLine className="rq-loading-skeleton__line--button" />
        </div>
      ))}
    </div>
  );

  const renderListSkeleton = () => (
    <div className="rq-loading-skeleton-list">
      {items.map((_, idx) => (
        <div className="rq-loading-skeleton rq-loading-skeleton--list-item" key={idx} style={{ '--rq-skeleton-delay': `${idx * 0.08}s` }}>
          <SkeletonLine className="rq-loading-skeleton__line--list-title" />
          <SkeletonLine className="rq-loading-skeleton__line--medium" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="rq-loading-skeleton-wrap" role="status" aria-live="polite" aria-label="Loading content">
      {type === 'card' && renderCardSkeleton()}
      {type === 'table' && renderTableSkeleton()}
      {type === 'list' && renderListSkeleton()}

      <style>{`
        .rq-loading-skeleton-wrap {
          width: 100%;
          color: var(--rq-text, #f5e6c8);
        }

        .rq-loading-skeleton {
          position: relative;
          overflow: hidden;
          border: 1px solid transparent;
          border-left: 5px solid var(--rq-primary, #c08a3d);
          border-radius: var(--rq-radius, 12px);
          background:
            linear-gradient(145deg, rgba(33, 21, 14, 0.92), rgba(58, 38, 25, 0.82)) padding-box,
            var(--rq-sunset-gradient, linear-gradient(135deg, #a45a32, #c08a3d, #e0b15c)) border-box;
          box-shadow: 0 16px 44px rgba(0, 0, 0, 0.22), 0 0 28px rgba(192, 138, 61, 0.08);
          animation: rqSkeletonBreathe 2.2s ease-in-out infinite;
          animation-delay: var(--rq-skeleton-delay, 0s);
        }

        .rq-loading-skeleton::after {
          content: '';
          position: absolute;
          inset: 0;
          transform: translateX(-120%);
          background: linear-gradient(90deg, transparent, rgba(255, 248, 239, 0.08), transparent);
          animation: rqSkeletonSheen 2.4s ease-in-out infinite;
          animation-delay: var(--rq-skeleton-delay, 0s);
          pointer-events: none;
        }

        .rq-loading-skeleton--card,
        .rq-loading-skeleton--table {
          padding: clamp(18px, 3vw, 24px);
          margin-bottom: 16px;
        }

        .rq-loading-skeleton-list {
          display: grid;
          gap: 12px;
        }

        .rq-loading-skeleton--list-item {
          padding: 16px;
        }

        .rq-loading-skeleton__row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 0;
          border-top: 1px solid var(--rq-line, rgba(255, 248, 239, 0.14));
          animation: rqSkeletonBreathe 2.2s ease-in-out infinite;
          animation-delay: var(--rq-skeleton-delay, 0s);
        }

        .rq-loading-skeleton__row:first-child {
          border-top: 0;
          padding-top: 0;
        }

        .rq-loading-skeleton__row:last-child {
          padding-bottom: 0;
        }

        .rq-loading-skeleton__row-copy {
          flex: 1 1 auto;
          min-width: 0;
          display: grid;
          gap: 8px;
        }

        .rq-loading-skeleton__avatar,
        .rq-loading-skeleton__line {
          display: block;
          background: linear-gradient(90deg, rgba(255, 248, 239, 0.10), rgba(224, 177, 92, 0.18), rgba(255, 248, 239, 0.10));
          border: 1px solid rgba(255, 248, 239, 0.08);
          box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.16);
        }

        .rq-loading-skeleton__avatar {
          width: 54px;
          height: 54px;
          flex: 0 0 54px;
          border-radius: 18px;
        }

        .rq-loading-skeleton__line {
          height: 14px;
          width: 100%;
          border-radius: 999px;
          margin-bottom: 12px;
        }

        .rq-loading-skeleton__line:last-child {
          margin-bottom: 0;
        }

        .rq-loading-skeleton__line--title {
          height: 24px;
          width: min(62%, 320px);
          margin-bottom: 18px;
        }

        .rq-loading-skeleton__line--row-title {
          height: 18px;
          width: min(46%, 260px);
          margin-bottom: 0;
        }

        .rq-loading-skeleton__line--list-title {
          height: 18px;
          width: min(54%, 280px);
        }

        .rq-loading-skeleton__line--medium {
          width: 78%;
        }

        .rq-loading-skeleton__line--short {
          width: 42%;
        }

        .rq-loading-skeleton__line--button {
          width: 104px;
          height: 38px;
          margin-bottom: 0;
          flex: 0 0 104px;
          border-radius: 12px;
        }

        @keyframes rqSkeletonBreathe {
          0%, 100% { opacity: 0.92; }
          50% { opacity: 0.66; }
        }

        @keyframes rqSkeletonSheen {
          0%, 35% { transform: translateX(-120%); }
          70%, 100% { transform: translateX(120%); }
        }

        @media (max-width: 620px) {
          .rq-loading-skeleton--card,
          .rq-loading-skeleton--table,
          .rq-loading-skeleton--list-item {
            padding: 14px;
          }

          .rq-loading-skeleton__row {
            gap: 10px;
          }

          .rq-loading-skeleton__avatar {
            width: 44px;
            height: 44px;
            flex-basis: 44px;
            border-radius: 14px;
          }

          .rq-loading-skeleton__line--button {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .rq-loading-skeleton,
          .rq-loading-skeleton::after,
          .rq-loading-skeleton__row {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default LoadingSkeleton;
