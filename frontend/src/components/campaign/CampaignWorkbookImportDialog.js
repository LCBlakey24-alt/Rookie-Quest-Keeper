import React, { useEffect, useRef, useState } from 'react';
import { Download, FileText, UploadCloud, X } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import './CampaignWorkbookImportDialog.css';

const MAX_FILE_BYTES = 2 * 1024 * 1024;

function formData(file, campaignId) {
  const data = new FormData();
  data.append('file', file);
  data.append('campaign_id', campaignId || '');
  return data;
}

function readError(error, fallback) {
  const detail = error?.formattedDetail || error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg || String(item)).join('; ');
  return error?.message || fallback;
}

export default function CampaignWorkbookImportDialog({
  campaigns = [],
  onClose,
  onImported,
}) {
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const version = useRef(0);
  const fileInput = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  const invalidatePreview = () => {
    version.current += 1;
    setPreview(null);
    setResult(null);
    setError('');
  };

  const selectFile = (nextFile) => {
    invalidatePreview();
    if (!nextFile) {
      setFile(null);
      return;
    }
    if (!nextFile.name.toLowerCase().endsWith('.docx') || nextFile.size > MAX_FILE_BYTES || !nextFile.size) {
      setFile(null);
      setError('Choose a Microsoft Word .docx workbook smaller than 2 MB.');
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    setFile(nextFile);
  };

  const downloadTemplate = async () => {
    setBusy('downloading');
    setError('');
    try {
      const response = await apiClient.get('/campaign-workbook/template', {
        responseType: 'blob',
        timeout: 60000,
      });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'Rookie_Quest_Keeper_Campaign_Workbook.docx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (failure) {
      setError(readError(failure, 'Could not download the Word workbook.'));
    } finally {
      setBusy('');
    }
  };

  const previewImport = async () => {
    if (!file) {
      setError('Choose a completed Word workbook first.');
      return;
    }
    const checkVersion = ++version.current;
    setBusy('previewing');
    setPreview(null);
    setResult(null);
    setError('');
    try {
      const response = await apiClient.post(
        '/campaign-workbook/preview',
        formData(file, selectedCampaignId),
        { timeout: 60000 },
      );
      if (version.current === checkVersion) setPreview(response.data);
    } catch (failure) {
      if (version.current === checkVersion) setError(readError(failure, 'Could not preview workbook.'));
    } finally {
      if (version.current === checkVersion) setBusy('');
    }
  };

  const confirmImport = async () => {
    if (!file || !preview || busy) return;
    const checkVersion = version.current;
    setBusy('importing');
    setError('');
    try {
      const response = await apiClient.post(
        '/campaign-workbook/import',
        formData(file, selectedCampaignId),
        { timeout: 120000 },
      );
      if (version.current !== checkVersion) return;
      setResult(response.data);
      await onImported?.(response.data);
    } catch (failure) {
      if (version.current === checkVersion) setError(readError(failure, 'Could not import workbook.'));
    } finally {
      if (version.current === checkVersion) setBusy('');
    }
  };

  const working = Boolean(busy);
  return (
    <div className="rqk-workbook-backdrop">
      <section role="dialog" aria-modal="true" aria-labelledby="rqk-workbook-title" className="rqk-workbook-dialog">
        <header className="rqk-workbook-head">
          <div>
            <p className="rqk-workbook-eyebrow">Campaign tools</p>
            <h2 id="rqk-workbook-title">Import a Word campaign</h2>
            <p>Build a campaign in Word, with ChatGPT, or both. Preview everything before adding it.</p>
          </div>
          <button type="button" className="rqk-workbook-close" aria-label="Close Word campaign import" disabled={working} onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="rqk-workbook-steps">
          <section>
            <h3>1. Prepare your workbook</h3>
            <p>Download the template. Fill its right-hand table cells or ask ChatGPT to do that using your campaign notes. Keep the section headings and field labels unchanged.</p>
            <button type="button" className="rqk-workbook-secondary" disabled={working} onClick={downloadTemplate}>
              <Download size={16} /> {busy === 'downloading' ? 'Downloading…' : 'Download Word template'}
            </button>
          </section>

          <section>
            <h3>2. Choose where it goes</h3>
            <label htmlFor="rqk-workbook-target">Import destination</label>
            <select
              id="rqk-workbook-target"
              value={selectedCampaignId}
              disabled={working}
              onChange={(event) => { setSelectedCampaignId(event.target.value); invalidatePreview(); }}
            >
              <option value="">Create a new campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>Add to: {campaign.name || 'Untitled campaign'}</option>
              ))}
            </select>
            <p className="rqk-workbook-hint">Existing campaigns are never replaced. Matching record names will be skipped, and existing calendar settings are kept.</p>
            <label htmlFor="rqk-workbook-file">Completed .docx workbook</label>
            <input
              id="rqk-workbook-file"
              ref={fileInput}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={working}
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
            {file && <p className="rqk-workbook-file"><FileText size={15} /> {file.name}</p>}
          </section>

          <section>
            <h3>3. Review and import</h3>
            <button type="button" className="rqk-workbook-secondary" disabled={!file || working} onClick={previewImport}>
              {busy === 'previewing' ? 'Reading workbook…' : 'Preview contents'}
            </button>
            {preview && (
              <div className="rqk-workbook-preview" aria-live="polite">
                <strong>{preview.total_records} sections found</strong>
                <span>Destination: {preview.target === 'new' ? 'New campaign' : 'Existing campaign'}</span>
                {Object.entries(preview.counts || {}).map(([section, count]) => (
                  <span key={section}>{section}: {count}</span>
                ))}
                {(preview.warnings || []).map((warning, i) => (
                  <p key={i} className="rqk-workbook-warning">{warning}</p>
                ))}
                <p className="rqk-workbook-hint">This preview validates your workbook, but the importer will check existing names again during saving.</p>
                <button type="button" className="rqk-workbook-primary" disabled={working} onClick={confirmImport}>
                  <UploadCloud size={16} /> {busy === 'importing' ? 'Importing…' : 'Confirm import'}
                </button>
              </div>
            )}
            {result && <p role="status" className="rqk-workbook-success">Import completed. The campaign has been updated.</p>}
          </section>
        </div>

        {error && <p className="rqk-workbook-error" role="alert">{error}</p>}
        <footer className="rqk-workbook-foot">Import only what you intend to save. NPCs and quests stay GM-private unless explicitly revealed later.</footer>
      </section>
    </div>
  );
}
