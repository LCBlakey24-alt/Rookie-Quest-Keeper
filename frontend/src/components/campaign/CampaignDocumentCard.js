import React, { useState } from 'react';
import { Check, Copy, Download, FileText, UploadCloud } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import CampaignWorkbookImportDialog from '@/components/campaign/CampaignWorkbookImportDialog';
import './CampaignDocumentCard.css';

/** The prompt a GM pastes into ChatGPT, Claude or another assistant with the template. */
export const CAMPAIGN_DOCUMENT_AI_PROMPT = [
  "I'm a Game Master. Fill in the attached Rookie Quest Keeper campaign workbook using only the campaign notes I give you.",
  'Keep every Heading 1 section title and every left-hand label exactly as they are, and write only in the right-hand column.',
  'For each extra person, place, loot item, handout or quest, copy the whole section (its Heading 1 and its full table) and fill the copy.',
  "Leave a field blank if my notes don't say it. Don't invent names, game statistics or history.",
  'In quests, write the quest giver, people, places, rewards and handouts using exactly the same names as elsewhere in the document.',
  'Give me back the filled .docx file. Here are my notes:',
].join(' ');

/**
 * Creation mode's way in to the campaign document: download the Word
 * template, fill it (or have an AI fill it), upload it, preview, import.
 * Imports add records and link quests; they never replace what is there.
 */
export default function CampaignDocumentCard({ campaignId, campaignName, prominent = false, onImported }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await apiClient.get('/campaign-workbook/template', { responseType: 'blob', timeout: 60000 });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'Rookie_Quest_Keeper_Campaign_Workbook.docx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (failure) {
      setError('Could not download the template. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(CAMPAIGN_DOCUMENT_AI_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch (failure) {
      setError('Copy was blocked by the browser. Select the prompt text below and copy it.');
    }
  };

  return (
    <section
      className={`rq-campaign-doc${prominent ? ' is-prominent' : ''}`}
      aria-labelledby="rq-campaign-doc-title"
      data-testid="campaign-document-card"
    >
      <div className="rq-campaign-doc__copy">
        <p className="rq-campaign-doc__eyebrow"><FileText size={14} aria-hidden="true" /> Campaign document</p>
        <h2 id="rq-campaign-doc-title">{prominent ? 'Bring your whole campaign in at once' : 'Add to your campaign from a document'}</h2>
        <p>
          Fill one Word document yourself, or give it to an AI assistant with your notes. Upload it and Rookie puts every
          person, place, quest, loot item, handout, story arc and calendar date in the right place, and links quests to them.
          You see a preview first, and nothing already in the campaign is replaced.
        </p>
      </div>
      <div className="rq-campaign-doc__actions">
        <button type="button" className="campaign-button" onClick={download} disabled={busy} data-testid="campaign-document-download">
          <Download size={15} aria-hidden="true" /> {busy ? 'Downloading…' : 'Download template'}
        </button>
        <button type="button" className="campaign-button" onClick={copyPrompt} data-testid="campaign-document-copy-prompt">
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {copied ? 'Prompt copied' : 'Copy AI prompt'}
        </button>
        <button type="button" className="campaign-button campaign-button-primary" onClick={() => setOpen(true)} data-testid="campaign-document-upload">
          <UploadCloud size={15} aria-hidden="true" /> Upload filled document
        </button>
      </div>
      <details className="rq-campaign-doc__prompt">
        <summary>See the AI prompt</summary>
        <p>{CAMPAIGN_DOCUMENT_AI_PROMPT}</p>
      </details>
      {error && <p className="rq-campaign-doc__error" role="alert">{error}</p>}
      {open && (
        <CampaignWorkbookImportDialog
          campaignId={campaignId}
          campaignName={campaignName}
          onClose={() => setOpen(false)}
          onImported={(outcome) => { setOpen(false); onImported?.(outcome); }}
        />
      )}
    </section>
  );
}
