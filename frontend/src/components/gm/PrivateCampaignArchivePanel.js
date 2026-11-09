import React, { useEffect, useState } from 'react';
import { Archive, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import apiClient from '@/lib/apiClient';

/**
 * Authenticated, owner-only recovery view for legacy personal GM content.
 * The private notes live in the database, NEVER in public frontend assets.
 * They are presented as inert text: no dynamic JS evaluation or blind import.
 */
export default function PrivateCampaignArchivePanel({ campaignId }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [selectedSha, setSelectedSha] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFiles([]);
    setSelectedFile(null);
    setSelectedSha('');
    setMessage('');
    if (!open || !campaignId) return undefined;
    setBusy(true);
    apiClient.get(`/campaigns/${encodeURIComponent(campaignId)}/private-source-archive`)
      .then(response => {
        if (!cancelled) setFiles(Array.isArray(response.data?.files) ? response.data.files : []);
      })
      .catch(() => { if (!cancelled) setMessage('Private archive could not be loaded. Please try again online.'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [campaignId, open]);

  const openFile = async file => {
    if (!file?.source_blob_sha || !campaignId) return;
    setSelectedFile(null);
    setSelectedSha(file.source_blob_sha);
    setMessage('');
    setBusy(true);
    try {
      const response = await apiClient.get(
        `/campaigns/${encodeURIComponent(campaignId)}/private-source-archive/${encodeURIComponent(file.source_blob_sha)}`,
      );
      setSelectedFile(response.data || null);
    } catch {
      setMessage('Unable to open this private file. Check your account and connection.');
    } finally {
      setBusy(false);
    }
  };

  const copyFile = async () => {
    if (!selectedFile?.source_text) return;
    try {
      await navigator.clipboard.writeText(selectedFile.source_text);
      setMessage('Source text copied privately to your clipboard.');
    } catch {
      setMessage('Clipboard is unavailable on this device. Select and copy the text below instead.');
    }
  };

  return (
    <section className="rq-private-archive" data-testid="private-campaign-archive"
      style={{ padding: 14, marginBlock: 12, background: 'var(--rq-bg-elevated, #2b2b2b)',
        border: '1px solid var(--rq-border-default, #3A3A3A)', borderRadius: 10 }}>
      <button type="button" onClick={() => setOpen(previous => !previous)}
        aria-expanded={open}
        style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'inherit', background: 'transparent',
          border: 0, cursor: 'pointer', fontWeight: 750 }}>
        <Archive size={16} aria-hidden="true" />
        Personal GM source archive
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div style={{ paddingTop: 12 }}>
          <p style={{ fontSize: 13, opacity: 0.85 }}>
            Your older campaign packs are saved privately to your account. These are backup source
            files, not automatic campaign imports. Your existing saved campaigns are unchanged.
          </p>
          {busy && <p role="status">Opening private archive…</p>}
          {message && <p role="status">{message}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBlock: 10 }}>
            {files.map(file => (
              <button key={file.source_blob_sha} type="button" onClick={() => openFile(file)}
                aria-pressed={selectedSha === file.source_blob_sha}
                style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #777',
                  background: selectedSha === file.source_blob_sha ? '#2d3e63' : 'transparent', color: 'inherit' }}>
                {String(file.path || 'Archived file').split('/').at(-1)}
              </button>
            ))}
          </div>
          {!busy && files.length === 0 && !message && <p>No archived source files for this account.</p>}
          {selectedFile && (
            <div>
              <p style={{ overflowWrap: 'anywhere' }}><strong>Private backup:</strong> {selectedFile.path}</p>
              <button type="button" onClick={copyFile}>
                <Copy size={14} style={{ verticalAlign: 'middle' }} /> Copy private source
              </button>
              <textarea readOnly value={String(selectedFile.source_text || '')}
                aria-label="Private archived source"
                rows={12} style={{ display: 'block', width: '100%', marginTop: 8, fontFamily: 'monospace',
                  background: 'var(--rq-bg-panel, #202020)', color: 'inherit' }} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
