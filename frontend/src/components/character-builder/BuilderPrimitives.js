import React from 'react';
import { Eye, Info } from 'lucide-react';
import { builderTheme as theme } from './builderTheme';

export function StepHeader({ icon: Icon, title, subtitle, color }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontSize: '1.4rem', margin: 0, color, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Icon size={20} /> {title}
      </h2>
      <p style={{ color: theme.text.muted, fontSize: '13px', margin: '4px 0 0 0' }}>{subtitle}</p>
    </div>
  );
}

export function SelectCard({ active, onClick, color, title, subtitle, footer, ...rest }) {
  return (
    <button
      type="button" onClick={onClick} {...rest}
      style={{
        textAlign: 'left', padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
        background: active ? theme.bg.elevated : theme.bg.surface,
        border: active ? `2px solid ${theme.sunset.gold}` : `1px solid ${theme.border}`,
        boxShadow: 'none',
        color: theme.text.primary, transition: 'all 0.2s ease',
        outline: 'none'
      }}>
      <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '2px' }}>{title}</div>
      <div style={{ fontSize: '12px', color: theme.text.secondary, lineHeight: 1.4 }}>{subtitle}</div>
      {footer}
    </button>
  );
}

export function DetailPanel({ title, color, children }) {
  return (
    <div style={{
      marginTop: '16px', padding: '14px 16px', borderRadius: '12px',
      background: 'rgba(31, 31, 35, 0.65)', border: `1px solid ${theme.border}`,
      borderLeft: `3px solid ${color}`
    }}>
      <div style={{ fontSize: '0.95rem', color, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Eye size={14} /> {title}
      </div>
      {children}
    </div>
  );
}

export function InfoBanner({ children }) {
  return (
    <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: theme.text.secondary, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Info size={14} color={theme.sunset.pink} />
      {children}
    </div>
  );
}

export function Pill({ icon, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', fontSize: '10px', color: theme.text.secondary, fontWeight: 500 }}>
      <span>{icon}</span>{children}
    </span>
  );
}

export function PreviewStat({ icon: Icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: `1px solid ${color}30` }}>
      <Icon size={14} color={color} />
      <div style={{ fontSize: '11px', color: theme.text.muted, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '15px', color, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
