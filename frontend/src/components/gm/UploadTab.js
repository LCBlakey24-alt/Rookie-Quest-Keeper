import React, { useState, useRef } from 'react';
import {
  Upload, FileText, Music, Map, Users, Folder,
  Check, AlertCircle, X
} from 'lucide-react';

const rq = {
  bg: 'var(--rq-bg-main, #1A1A1A)',
  panel: 'var(--rq-bg-panel, #242424)',
  elevated: 'var(--rq-bg-elevated, #323232)',
  border: 'var(--rq-accent-border, rgba(193,18,31,0.35))',
  borderDefault: 'var(--rq-border-default, #3A3A3A)',
  accent: 'var(--rq-accent-primary, #C1121F)',
  accentHover: 'var(--rq-accent-hover, #D62839)',
  accentSoft: 'var(--rq-accent-soft, rgba(193,18,31,0.12))',
  text: 'var(--rq-text-primary, #FFFFFF)',
  textSecondary: 'var(--rq-text-secondary, #D6D6D6)',
  muted: 'var(--rq-text-muted, #A0A0A0)',
  success: 'var(--rq-success, #2E8B57)',
  danger: 'var(--rq-danger, #C1121F)',
  radius: 'var(--rq-radius-md, 6px)',
  radiusSm: 'var(--rq-radius-sm, 4px)',
};

const UPLOAD_TYPES = [
  {
    id: 'map',
    title: 'Campaign Maps',
    icon: Map,
    accept: 'image/*',
    description: 'Upload world maps, dungeon maps, city layouts',
    color: rq.accent
  },
  {
    id: 'character',
    title: 'Character Portraits',
    icon: Users,
    accept: 'image/*',
    description: 'Upload NPC portraits and player character art',
    color: rq.accentHover
  },
  {
    id: 'document',
    title: 'Documents & PDFs',
    icon: FileText,
    accept: '.pdf,.doc,.docx,.txt,.md',
    description: 'Upload rules notes, lore documents, and handouts',
    color: rq.textSecondary
  },
  {
    id: 'audio',
    title: 'Audio & Music',
    icon: Music,
    accept: 'audio/*',
    description: 'Upload background music, sound effects, and ambience',
    color: rq.textSecondary
  },
  {
    id: 'misc',
    title: 'Other Files',
    icon: Folder,
    accept: '*',
    description: 'Upload any other campaign assets',
    color: rq.muted
  }
];

export default function UploadTab({ theme }) {
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});
  const [recentUploads, setRecentUploads] = useState([]);
  const fileInputRefs = useRef({});

  const ui = {
    panel: theme?.bg?.card || rq.panel,
    elevated: theme?.bg?.elevated || rq.elevated,
    border: theme?.border || rq.border,
    accent: theme?.accent?.primary || rq.accent,
    text: theme?.text?.primary || rq.text,
    textSecondary: theme?.text?.secondary || rq.textSecondary,
    muted: theme?.text?.muted || rq.muted,
  };

  const handleFileSelect = async (type, files) => {
    if (!files || files.length === 0) return;

    const uploadType = UPLOAD_TYPES.find(t => t.id === type);
    if (!uploadType) return;

    for (const file of files) {
      const uploadId = `${type}-${Date.now()}-${file.name}`;

      setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));
      setUploadErrors(prev => ({ ...prev, [uploadId]: null }));

      try {
        // Placeholder client-side upload simulation until persistent asset storage is connected.
        await simulateUpload(uploadId);

        setRecentUploads(prev => [{
          id: uploadId,
          name: file.name,
          type,
          size: formatFileSize(file.size),
          uploadedAt: new Date().toISOString(),
          status: 'success'
        }, ...prev.slice(0, 9)]);

        setUploadProgress(prev => ({ ...prev, [uploadId]: 100 }));

        setTimeout(() => {
          setUploadProgress(prev => {
            const next = { ...prev };
            delete next[uploadId];
            return next;
          });
        }, 2000);
      } catch (error) {
        setUploadErrors(prev => ({ ...prev, [uploadId]: error.message || 'Upload failed' }));
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[uploadId];
          return next;
        });
      }
    }
  };

  const simulateUpload = (uploadId) => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          resolve();
        }
        setUploadProgress(prev => ({ ...prev, [uploadId]: Math.min(progress, 99) }));
      }, 200);
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const clearError = (uploadId) => {
    setUploadErrors(prev => {
      const next = { ...prev };
      delete next[uploadId];
      return next;
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Upload size={24} style={{ color: ui.accent }} />
        <div>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", color: ui.text, margin: 0, fontWeight: 900 }}>
            Campaign Uploads
          </h3>
          <p style={{ color: ui.muted, fontSize: 12, margin: '4px 0 0' }}>
            Stage maps, documents, handouts, portraits, audio, and other campaign files for your GM prep.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {UPLOAD_TYPES.map(type => {
          const IconComponent = type.icon;
          const activeUploads = Object.entries(uploadProgress).filter(([key]) => key.startsWith(type.id));

          return (
            <div key={type.id} style={{ padding: '20px', background: ui.panel, borderRadius: rq.radius, border: `1px solid ${ui.border}`, transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: rq.radiusSm, background: rq.accentSoft, border: `1px solid ${rq.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconComponent size={24} style={{ color: type.color }} />
                </div>
                <div>
                  <h4 style={{ fontFamily: "'Outfit', sans-serif", color: ui.text, margin: 0, fontSize: '16px', fontWeight: 900 }}>
                    {type.title}
                  </h4>
                  <p style={{ color: ui.muted, fontSize: '13px', margin: '4px 0 0 0' }}>
                    {type.description}
                  </p>
                </div>
              </div>

              {activeUploads.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  {activeUploads.map(([uploadId, progress]) => (
                    <div key={uploadId} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: ui.textSecondary }}>Uploading...</span>
                        <span style={{ fontSize: '12px', color: type.color }}>{Math.round(progress)}%</span>
                      </div>
                      <div style={{ height: '4px', background: ui.elevated, borderRadius: 0, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: type.color, borderRadius: 0, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={el => fileInputRefs.current[type.id] = el}
                type="file"
                accept={type.accept}
                multiple
                onChange={(e) => handleFileSelect(type.id, e.target.files)}
                style={{ display: 'none' }}
              />
              <button onClick={() => fileInputRefs.current[type.id]?.click()} style={{ width: '100%', padding: '12px', background: rq.accentSoft, border: `1px dashed ${rq.border}`, borderRadius: rq.radiusSm, color: ui.text, cursor: 'pointer', fontSize: '13px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
                <Upload size={16} />
                Upload File
              </button>
            </div>
          );
        })}
      </div>

      {Object.entries(uploadErrors).filter(([_, err]) => err).length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ color: rq.danger, fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900 }}>
            <AlertCircle size={16} /> Upload Errors
          </h4>
          {Object.entries(uploadErrors).filter(([_, err]) => err).map(([uploadId, error]) => (
            <div key={uploadId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: rq.accentSoft, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, marginBottom: '8px' }}>
              <span style={{ color: rq.danger, fontSize: '13px' }}>{error}</span>
              <button onClick={() => clearError(uploadId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: rq.danger, padding: '4px' }}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <h4 style={{ fontFamily: "'Outfit', sans-serif", color: ui.text, fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900 }}>
          <Check size={16} style={{ color: rq.success }} /> Recent Uploads
        </h4>

        {recentUploads.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: ui.muted, background: ui.panel, borderRadius: rq.radius, border: `1px solid ${ui.border}` }}>
            <Folder size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ margin: '0 0 6px', color: ui.text, fontWeight: 900 }}>No files staged yet</p>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              Choose an upload type above to start collecting campaign material. Persistent asset storage is still being connected, so this list shows files staged during this session.
            </p>
          </div>
        ) : (
          <div style={{ background: ui.panel, borderRadius: rq.radius, border: `1px solid ${ui.border}`, overflow: 'hidden' }}>
            {recentUploads.map((upload, index) => {
              const uploadType = UPLOAD_TYPES.find(t => t.id === upload.type);
              const IconComponent = uploadType?.icon || Folder;

              return (
                <div key={upload.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: index < recentUploads.length - 1 ? `1px solid ${ui.border}` : 'none' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: rq.radiusSm, background: rq.accentSoft, border: `1px solid ${rq.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconComponent size={18} style={{ color: uploadType?.color || rq.muted }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: ui.text, fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {upload.name}
                    </div>
                    <div style={{ fontSize: '12px', color: ui.muted }}>
                      {upload.size} • {new Date(upload.uploadedAt).toLocaleTimeString()}
                    </div>
                  </div>

                  <Check size={16} style={{ color: rq.success }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
