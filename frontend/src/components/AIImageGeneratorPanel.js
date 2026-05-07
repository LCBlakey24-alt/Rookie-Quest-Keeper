import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Check, Image as ImageIcon, Loader, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

const colors = {
  bg: '#1F1F23',
  panel: '#27272B',
  elevated: '#323235',
  border: 'rgba(239,68,68,0.42)',
  red: '#EF4444',
  redSoft: 'rgba(239,68,68,0.14)',
  text: '#FFFFFF',
  muted: '#D1D5DB',
};

function toImageSrc(image) {
  if (!image) return '';
  if (image.image_url) return image.image_url;
  if (image.src) return image.src;
  if (image.image_base64) {
    return `data:${image.mime_type || 'image/png'};base64,${image.image_base64}`;
  }
  return '';
}

export default function AIImageGeneratorPanel({
  title,
  subtitle,
  buttonLabel = 'Generate 3 Images',
  payload,
  selectedImage,
  onSelectImage,
  onClearImage,
  disabled = false,
}) {
  const [images, setImages] = useState([]);
  const [generating, setGenerating] = useState(false);

  const normalizedImages = useMemo(() => {
    return images.map((image, index) => ({
      ...image,
      src: toImageSrc(image),
      label: image.style ? image.style.replace(/_/g, ' ') : `Option ${index + 1}`,
    }));
  }, [images]);

  const generateImages = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/ai/image/batch`, payload);
      const nextImages = (res.data?.images || []).map(image => ({
        ...image,
        src: toImageSrc(image),
      }));
      setImages(nextImages);
      if (!nextImages.some(image => image.src)) {
        toast.error('No images came back from the generator');
        return;
      }
      toast.success('Generated three image options');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate images');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <h4 style={{ margin: 0, color: colors.text, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
            {title}
          </h4>
          {subtitle && (
            <p style={{ margin: '4px 0 0', color: colors.muted, fontSize: 11, lineHeight: 1.45 }}>
              {subtitle}
            </p>
          )}
        </div>
        <Button
          type="button"
          onClick={generateImages}
          disabled={disabled || generating}
          style={buttonStyle}
        >
          {generating ? <Loader size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {buttonLabel}
        </Button>
      </div>

      {selectedImage && (
        <div style={selectedStyle}>
          <img src={selectedImage} alt="Selected AI option" style={selectedImageStyle} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: colors.text, fontSize: 12, fontWeight: 800 }}>Selected Image</div>
            <div style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>This image will be saved with the record.</div>
          </div>
          {onClearImage && (
            <button type="button" onClick={onClearImage} aria-label="Clear selected image" style={iconButtonStyle}>
              <X size={15} />
            </button>
          )}
        </div>
      )}

      {normalizedImages.length > 0 ? (
        <div style={gridStyle}>
          {normalizedImages.map((image, index) => {
            const isSelected = image.src && image.src === selectedImage;
            return (
              <button
                type="button"
                key={`${image.style || 'option'}-${index}`}
                onClick={() => image.src && onSelectImage?.(image.src, image)}
                disabled={!image.src}
                style={{
                  ...optionStyle,
                  borderColor: isSelected ? colors.red : colors.border,
                  background: isSelected ? colors.redSoft : colors.bg,
                  cursor: image.src ? 'pointer' : 'not-allowed',
                }}
              >
                {image.src ? (
                  <img src={image.src} alt={`${title} ${image.label}`} style={optionImageStyle} />
                ) : (
                  <div style={emptyImageStyle}>
                    <ImageIcon size={24} />
                    <span>{image.error || 'No image'}</span>
                  </div>
                )}
                <span style={optionLabelStyle}>
                  {isSelected && <Check size={13} />}
                  {image.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={emptyStateStyle}>
          <ImageIcon size={20} />
          <span>No image options yet</span>
        </div>
      )}
    </section>
  );
}

const panelStyle = {
  background: colors.panel,
  border: `1px solid ${colors.border}`,
  borderRadius: 0,
  padding: 14,
};

const buttonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  borderRadius: 0,
  border: `1px solid ${colors.red}`,
  background: colors.red,
  color: colors.text,
  fontSize: 12,
  fontWeight: 800,
  padding: '9px 12px',
  whiteSpace: 'nowrap',
};

const selectedStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 0,
  padding: 8,
  marginBottom: 12,
};

const selectedImageStyle = {
  width: 58,
  height: 58,
  objectFit: 'cover',
  borderRadius: 0,
  border: `1px solid ${colors.red}`,
  flexShrink: 0,
};

const iconButtonStyle = {
  width: 30,
  height: 30,
  border: `1px solid ${colors.border}`,
  borderRadius: 0,
  background: 'transparent',
  color: colors.text,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: 10,
};

const optionStyle = {
  border: `1px solid ${colors.border}`,
  borderRadius: 0,
  padding: 0,
  overflow: 'hidden',
  color: colors.text,
  textAlign: 'left',
};

const optionImageStyle = {
  width: '100%',
  aspectRatio: '1 / 1',
  objectFit: 'cover',
  display: 'block',
  background: colors.bg,
};

const emptyImageStyle = {
  width: '100%',
  aspectRatio: '1 / 1',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  color: colors.muted,
  background: colors.bg,
  fontSize: 11,
};

const optionLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 9px',
  color: colors.text,
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'capitalize',
};

const emptyStateStyle = {
  border: `1px dashed ${colors.border}`,
  borderRadius: 0,
  color: colors.muted,
  fontSize: 12,
  padding: 14,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: colors.bg,
};
