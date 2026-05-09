import React from 'react';
import { Check, Image as ImageIcon, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const colors = {
  bg: '#1F1F23',
  panel: '#27272B',
  border: 'rgba(239,68,68,0.42)',
  red: '#EF4444',
  redSoft: 'rgba(239,68,68,0.14)',
  text: '#FFFFFF',
  muted: '#D1D5DB',
};

export default function AIImageGeneratorPanel({
  title,
  subtitle,
  selectedImage,
  onSelectImage,
  onClearImage,
  disabled = false,
  uploadLabel = 'Upload image',
}) {
  const inputId = React.useId?.() || `image-upload-${Math.random().toString(36).slice(2)}`;

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 4 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => onSelectImage?.(reader.result, { source: 'upload', name: file.name });
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <section style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <h4 style={{ margin: 0, color: colors.text, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
            {title || 'Image'}
          </h4>
          <p style={{ margin: '4px 0 0', color: colors.muted, fontSize: 11, lineHeight: 1.45 }}>
            {subtitle || 'AI image generation is disabled for now to keep site costs controlled. Upload an image instead.'}
          </p>
        </div>
        <label htmlFor={inputId} style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
          <Button type="button" disabled={disabled} style={buttonStyle} asChild={false}>
            <Upload size={15} /> {uploadLabel}
          </Button>
          <input id={inputId} type="file" accept="image/*" onChange={handleUpload} disabled={disabled} style={{ display: 'none' }} />
        </label>
      </div>

      {selectedImage ? (
        <div style={selectedStyle}>
          <img src={selectedImage} alt="Selected upload" style={selectedImageStyle} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: colors.text, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={14} color={colors.red} /> Selected Image
            </div>
            <div style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>This uploaded image will be saved with the record.</div>
          </div>
          {onClearImage && (
            <button type="button" onClick={onClearImage} aria-label="Clear selected image" style={iconButtonStyle}>
              <X size={15} />
            </button>
          )}
        </div>
      ) : (
        <div style={emptyStateStyle}>
          <ImageIcon size={20} />
          <span>No image selected</span>
        </div>
      )}
    </section>
  );
}

const panelStyle = { background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 0, padding: 14 };
const buttonStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 0, border: `1px solid ${colors.red}`, background: 'transparent', color: colors.text, fontSize: 12, fontWeight: 800, padding: '9px 12px', whiteSpace: 'nowrap' };
const selectedStyle = { display: 'flex', alignItems: 'center', gap: 10, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 0, padding: 8 };
const selectedImageStyle = { width: 58, height: 58, objectFit: 'cover', borderRadius: 0, border: `1px solid ${colors.red}`, flexShrink: 0 };
const iconButtonStyle = { width: 30, height: 30, border: `1px solid ${colors.border}`, borderRadius: 0, background: 'transparent', color: colors.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const emptyStateStyle = { border: `1px dashed ${colors.border}`, borderRadius: 0, color: colors.muted, fontSize: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 8, background: colors.bg };
