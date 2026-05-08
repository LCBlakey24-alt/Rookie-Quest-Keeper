import React from 'react';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';

const theme = {
  bg: { primary: '#1F1F23', surface: '#27272B', elevated: '#323235' },
  text: { primary: '#FFFFFF', secondary: '#D1D5DB', muted: '#9CA3AF' },
  border: 'rgba(239, 68, 68, 0.35)',
  accent: { primary: '#EF4444', soft: 'rgba(239, 68, 68, 0.12)' },
  success: '#10B981'
};

export function BuilderShell({ children, title = 'Create Character', subtitle, actions }) {
  return (
    <div className="rq-builder-shell" style={{
      minHeight: '100vh',
      background: theme.bg.primary,
      padding: 24,
      color: theme.text.primary
    }}>
      <div className="rq-builder-container" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', color: theme.text.primary }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ margin: '6px 0 0', color: theme.text.secondary, lineHeight: 1.5 }}>
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function BuilderPanel({ children, compact = false }) {
  return (
    <section className="rq-builder-panel" style={{
      background: theme.bg.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: 12,
      padding: compact ? 18 : 28,
      boxShadow: 'none'
    }}>
      {children}
    </section>
  );
}

export function StepHeader({ icon: Icon, title, subtitle, meta }) {
  return (
    <div className="rq-builder-step-header" style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {Icon && <Icon size={24} color={theme.accent.primary} />}
        <h2 style={{ margin: 0, fontSize: 'clamp(1.25rem, 3vw, 1.8rem)', color: theme.text.primary }}>
          {title}
        </h2>
        {meta && (
          <span style={{
            padding: '4px 10px',
            border: `1px solid ${theme.border}`,
            borderRadius: 999,
            color: theme.text.secondary,
            fontSize: 12,
            background: theme.accent.soft
          }}>
            {meta}
          </span>
        )}
      </div>
      {subtitle && <p style={{ margin: '8px 0 0', color: theme.text.secondary, lineHeight: 1.55 }}>{subtitle}</p>}
    </div>
  );
}

export function OptionCard({
  title,
  subtitle,
  description,
  icon: Icon,
  selected = false,
  disabled = false,
  badge,
  onClick,
  children,
  testId
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`rq-builder-option-card${selected ? ' selected' : ''}`}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: 16,
        borderRadius: 12,
        background: selected ? theme.accent.soft : theme.bg.elevated,
        border: `1px solid ${selected ? theme.accent.primary : theme.border}`,
        color: theme.text.primary,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'border-color 0.15s ease, background 0.15s ease',
        minHeight: 96,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start'
      }}
    >
      {Icon && <Icon size={22} color={theme.accent.primary} style={{ flexShrink: 0, marginTop: 2 }} />}
      <span style={{ display: 'block', minWidth: 0 }}>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 16 }}>{title}</strong>
          {badge && (
            <span style={{
              fontSize: 11,
              color: theme.accent.primary,
              border: `1px solid ${theme.border}`,
              padding: '2px 8px',
              borderRadius: 999
            }}>
              {badge}
            </span>
          )}
        </span>
        {subtitle && <span style={{ display: 'block', marginTop: 4, color: theme.text.secondary, fontSize: 13 }}>{subtitle}</span>}
        {description && <span style={{ display: 'block', marginTop: 8, color: theme.text.muted, fontSize: 13, lineHeight: 1.45 }}>{description}</span>}
        {children && <span style={{ display: 'block', marginTop: 10 }}>{children}</span>}
      </span>
    </button>
  );
}

export function OptionGrid({ children, min = 220 }) {
  return (
    <div className="rq-builder-option-grid" style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
      gap: 12
    }}>
      {children}
    </div>
  );
}

export function DraftNotice({ visible = true }) {
  if (!visible) return null;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 12px',
      borderRadius: 10,
      background: theme.accent.soft,
      border: `1px solid ${theme.border}`,
      color: theme.text.secondary,
      fontSize: 13,
      marginBottom: 14
    }}>
      <Save size={16} color={theme.accent.primary} />
      Your draft saves automatically on this device.
    </div>
  );
}

export function BuilderNavFooter({
  canGoBack,
  canGoNext,
  isLastStep,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
  nextLabel = 'Next',
  submitLabel = 'Create Character'
}) {
  return (
    <div className="rq-builder-nav-footer" style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 22,
      flexWrap: 'wrap'
    }}>
      <button
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
        style={{
          padding: '12px 18px',
          background: 'transparent',
          border: `1px solid ${theme.border}`,
          color: theme.text.secondary,
          borderRadius: 10,
          cursor: canGoBack ? 'pointer' : 'not-allowed',
          opacity: canGoBack ? 1 : 0.45,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        <ChevronLeft size={16} /> Back
      </button>

      {isLastStep ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || !canGoNext}
          style={{
            padding: '12px 20px',
            background: theme.accent.primary,
            border: 'none',
            color: '#fff',
            borderRadius: 10,
            fontWeight: 700,
            cursor: isSubmitting || !canGoNext ? 'not-allowed' : 'pointer',
            opacity: isSubmitting || !canGoNext ? 0.6 : 1
          }}
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          style={{
            padding: '12px 20px',
            background: theme.accent.primary,
            border: 'none',
            color: '#fff',
            borderRadius: 10,
            fontWeight: 700,
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          {nextLabel} <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

export default {
  BuilderShell,
  BuilderPanel,
  StepHeader,
  OptionCard,
  OptionGrid,
  DraftNotice,
  BuilderNavFooter
};
