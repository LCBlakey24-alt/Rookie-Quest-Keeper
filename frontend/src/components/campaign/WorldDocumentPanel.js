import React, { useMemo, useRef, useState } from 'react';
import { Download, FileUp, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import apiClient from '@/lib/apiClient';
import HexLoader from '@/components/guild-motif/HexLoader';
import './WorldDocumentPanel.css';

const SECTIONS = [
  { key: 'locations', label: 'Places', nameKey: 'name', detail: (item) => [item.location_type, item.description].filter(Boolean).join(' · ') },
  { key: 'npcs', label: 'People', nameKey: 'name', detail: (item) => [item.role, item.race, item.location && `at ${item.location}`].filter(Boolean).join(' · ') },
  { key: 'factions', label: 'Factions', nameKey: 'name', detail: (item) => [item.goal, item.leader && `led by ${item.leader}`].filter(Boolean).join(' · ') },
  { key: 'quests', label: 'Quests', nameKey: 'title', detail: (item) => [item.hook || item.summary, item.objectives?.length ? `${item.objectives.length} objective${item.objectives.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ') },
];

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function initialSelection(drafts) {
  const selection = { overview: Boolean(drafts.overview) && !drafts.overview_exists, lore: Boolean(drafts.lore) && !drafts.lore_exists };
  SECTIONS.forEach(({ key }) => {
    (drafts[key] || []).forEach((item, index) => { selection[`${key}:${index}`] = !item.exists; });
  });
  return selection;
}

/**
 * The campaign world document: download a Word template, fill it in by hand
 * or with an AI assistant, upload it, and Rook reads it into drafts. Nothing
 * is added until the GM ticks what to keep and saves; anything already in the
 * campaign starts unticked and is skipped on save, so uploading twice is safe.
 */
export default function WorldDocumentPanel({ campaignId, onSaved, blockedReason = '' }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState('');
  const [drafts, setDrafts] = useState(null);
  const [selection, setSelection] = useState({});

  const chosenCount = useMemo(() => Object.values(selection).filter(Boolean).length, [selection]);
  const total = drafts ? SECTIONS.reduce((sum, { key }) => sum + (drafts[key]?.length || 0), 0) + (drafts.overview ? 1 : 0) + (drafts.lore ? 1 : 0) : 0;

  const download = async () => {
    setBusy('download');
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/world-document/template`, { responseType: 'blob' });
      saveBlob(response.data, 'world-document.docx');
    } catch {
      toast.error('Could not download the world document.');
    } finally {
      setBusy('');
    }
  };

  const read = async (file) => {
    if (!file) return;
    if (!/\.docx$/i.test(file.name)) {
      toast.error('Upload the world document as a Word file (.docx).');
      return;
    }
    setBusy('read');
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await apiClient.post(`/campaigns/${campaignId}/world-document/read`, form);
      const data = response.data || {};
      setDrafts(data);
      setSelection(initialSelection(data));
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Rook could not read that document.');
    } finally {
      setBusy('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const save = async () => {
    if (!drafts || blockedReason) return;
    const payload = { overview: selection.overview ? drafts.overview : '', lore: selection.lore ? drafts.lore : '' };
    SECTIONS.forEach(({ key }) => {
      payload[key] = (drafts[key] || []).filter((_, index) => selection[`${key}:${index}`]);
    });
    setBusy('save');
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/world-document/save`, payload);
      const { created = {}, skipped = {} } = response.data || {};
      const added = [
        created.locations && `${created.locations} place${created.locations === 1 ? '' : 's'}`,
        created.npcs && `${created.npcs} ${created.npcs === 1 ? 'person' : 'people'}`,
        created.quests && `${created.quests} quest${created.quests === 1 ? '' : 's'}`,
        created.world_text && `${created.world_text} world note${created.world_text === 1 ? '' : 's'}`,
      ].filter(Boolean);
      const skippedCount = Object.values(skipped).reduce((sum, value) => sum + (Number(value) || 0), 0);
      toast.success(added.length ? `Added ${added.join(', ')}` : 'Nothing new to add', {
        description: skippedCount ? `${skippedCount} already in your campaign and left as they were.` : undefined,
      });
      setDrafts(null);
      setSelection({});
      onSaved?.();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not add these to the campaign.');
    } finally {
      setBusy('');
    }
  };

  const toggle = (key) => setSelection((previous) => ({ ...previous, [key]: !previous[key] }));

  return (
    <section className="rq-world-doc" aria-label="World document" data-testid="world-document-panel">
      <div className="rq-world-doc__intro">
        <h2><Sparkles size={16} aria-hidden="true" /> World document</h2>
        <p>
          Write up your world in Word, by hand or with ChatGPT or Claude (the document includes a prompt), then upload it.
          Rook reads it into places, people, factions and quests for you to check. Nothing is added until you choose.
        </p>
        <div className="rq-world-doc__actions">
          <button type="button" className="rq-world-doc__button" onClick={download} disabled={Boolean(busy)} data-testid="world-document-download">
            <Download size={15} aria-hidden="true" /> Download template
          </button>
          <button type="button" className="rq-world-doc__button rq-world-doc__button--primary" onClick={() => inputRef.current?.click()} disabled={Boolean(busy)} data-testid="world-document-upload">
            <FileUp size={15} aria-hidden="true" /> Upload filled document
          </button>
          <input ref={inputRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={(event) => read(event.target.files?.[0])} data-testid="world-document-file" />
        </div>
      </div>

      {busy === 'read' && <HexLoader size="sm" label="Rook is reading your document…" />}

      {drafts && (
        <div className="rq-world-doc__review" data-testid="world-document-review">
          <p className="rq-world-doc__summary">
            {total ? `Rook found ${total} item${total === 1 ? '' : 's'}. Untick anything you don't want; anything already in your campaign is left as it is.` : 'Rook found nothing to add. Check the document kept its section headings.'}
          </p>
          {['overview', 'lore'].map((key) => drafts[key] ? (
            <label key={key} className="rq-world-doc__item">
              <input type="checkbox" checked={Boolean(selection[key])} onChange={() => toggle(key)} data-testid={`world-document-pick-${key}`} />
              <span>
                <strong>{key === 'overview' ? 'World overview' : 'Lore & history'}</strong>
                <small>{drafts[`${key}_exists`] ? 'Already in your World Setting' : `Added to Unsorted Notes · ${drafts[key].slice(0, 120)}${drafts[key].length > 120 ? '…' : ''}`}</small>
              </span>
            </label>
          ) : null)}
          {SECTIONS.map(({ key, label, nameKey, detail }) => (drafts[key]?.length ? (
            <fieldset key={key} className="rq-world-doc__group">
              <legend>{label} ({drafts[key].length})</legend>
              {drafts[key].map((item, index) => (
                <label key={`${key}-${index}`} className={`rq-world-doc__item${item.exists ? ' is-existing' : ''}`}>
                  <input type="checkbox" checked={Boolean(selection[`${key}:${index}`])} onChange={() => toggle(`${key}:${index}`)} disabled={Boolean(item.exists)} data-testid={`world-document-pick-${key}-${index}`} />
                  <span>
                    <strong>{item[nameKey]}</strong>
                    <small>{item.exists ? 'Already in your campaign' : (detail(item) || (key === 'factions' ? 'Added to Unsorted Notes' : 'No details'))}</small>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null))}
          {blockedReason && <p className="rq-world-doc__blocked" role="status" data-testid="world-document-blocked">{blockedReason}</p>}
          <div className="rq-world-doc__actions">
            <button type="button" className="rq-world-doc__button" onClick={() => { setDrafts(null); setSelection({}); }} disabled={busy === 'save'}>Cancel</button>
            <button type="button" className="rq-world-doc__button rq-world-doc__button--primary" onClick={save} disabled={busy === 'save' || chosenCount === 0 || Boolean(blockedReason)} data-testid="world-document-save">
              {busy === 'save' ? 'Adding…' : `Add ${chosenCount} to campaign`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
