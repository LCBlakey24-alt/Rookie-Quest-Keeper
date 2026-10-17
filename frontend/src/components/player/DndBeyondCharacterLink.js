import React, { useEffect, useState } from 'react';
import { ExternalLink, Link2, Save, Trash2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { isOfflineDesktop } from '@/preview/previewMode';

export function normaliseDndBeyondLink(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !['dndbeyond.com', 'www.dndbeyond.com'].includes(url.hostname.toLowerCase()) || url.username || url.password || url.port) return null;
    const match = url.pathname.match(/^\/(?:characters|profile\/[^/]+\/characters)\/([1-9]\d{0,19})\/?$/i);
    if (!match) return null;
    return `https://www.dndbeyond.com/characters/${match[1]}`;
  } catch {
    return null;
  }
}

export default function DndBeyondCharacterLink({ characterId, characterName }) {
  const [input, setInput] = useState('');
  const [linked, setLinked] = useState('');
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(false);
  const [message, setMessage] = useState('');
  const [failedLoad, setFailedLoad] = useState(false);

  useEffect(() => {
    if (!characterId || isOfflineDesktop()) return undefined;
    let cancelled = false;
    setInput('');
    setLinked('');
    setMessage('');
    setFailedLoad(false);
    apiClient.get(`/characters/${encodeURIComponent(characterId)}/dndbeyond-link`)
      .then(response => {
        if (cancelled) return;
        const url = normaliseDndBeyondLink(response.data?.url);
        setInput(url || '');
        setLinked(url || '');
      }).catch(() => {
        if (!cancelled) setFailedLoad(true);
      });
    return () => { cancelled = true; };
  }, [characterId]);

  const save = async (event) => {
    event.preventDefault();
    if (isOfflineDesktop()) {
      setMessage('This offline Windows copy is not connected to hosted player character accounts yet.');
      return;
    }
    const url = normaliseDndBeyondLink(input);
    if (!url) {
      setMessage('Please paste the HTTPS Share link from a specific D&D Beyond character.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await apiClient.put(`/characters/${encodeURIComponent(characterId)}/dndbeyond-link`, { url });
      const saved = normaliseDndBeyondLink(response.data?.url);
      if (!saved) throw new Error('Keeper did not confirm the linked character.');
      setInput(saved);
      setLinked(saved);
      setMessage('Link saved to your Keeper character. Automatic stat syncing is not available.');
      setFailedLoad(false);
    } catch(error) {
      setMessage(error?.formattedDetail || error?.response?.data?.detail || 'Could not save your character link.');
    } finally {
      setBusy(false);
    }
  };
  const unlink = async () => {
    if (!linked || isOfflineDesktop()) return;
    setBusy(true);
    try {
      await apiClient.delete(`/characters/${encodeURIComponent(characterId)}/dndbeyond-link`);
      setInput('');
      setLinked('');
      setMessage('D&D Beyond link removed. Your Keeper character remains unchanged.');
    } catch { setMessage('Could not remove the link. Try again.'); }
    finally { setBusy(false); }
  };

  return (
    <div data-testid="player-dndbeyond-link" style={{ marginTop:8, maxWidth:460, width:'100%' }}>
      <button type="button" aria-expanded={opened} onClick={() => setOpened(v=>!v)}
        style={{ display:'inline-flex',alignItems:'center',gap:6,background:'transparent',border:'1px solid #9b865c',borderRadius:5,color:'inherit',padding:'6px 9px',minHeight:36,cursor:'pointer' }}>
        <Link2 size={15}/>{linked ? 'D&D Beyond link saved' : 'Link D&D Beyond sheet'}
      </button>
      {opened && isOfflineDesktop() && <p role="status" style={{ fontSize:12, margin:'7px 0' }}>Player linking is available on the hosted Keeper player account. This standalone offline edition does not yet sync to player phones.</p>}
      {opened && <form onSubmit={save} style={{ display:'grid',gap:8,marginTop:9,padding:10,border:'1px solid #7a704f',borderRadius:6,background:'rgba(4,16,26,.35)' }}>
        <label htmlFor={`ddb-link-${characterId}`} style={{ display:'grid',gap:6,fontSize:13 }}>
          D&D Beyond character share URL for {characterName || 'this character'}
          <input id={`ddb-link-${characterId}`} type="url" inputMode="url"
            placeholder="https://www.dndbeyond.com/characters/12345678"
            value={input} onChange={event=>setInput(event.target.value)} required
            style={{ maxWidth:'100%',width:'100%',minWidth:0,boxSizing:'border-box',fontSize:14,padding:'10px 8px',borderRadius:5,color:'#e9edf4',background:'#112b3f',border:'1px solid #a7a6a1' }} />
        </label>
        <div style={{ display:'flex',gap:8,flexWrap:'wrap',alignItems:'center' }}>
          <button type="submit" disabled={busy || isOfflineDesktop()} style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'7px 10px',cursor:'pointer' }}><Save size={14}/>{busy ? 'Saving…' : 'Save character link'}</button>
          {linked && <a href={linked} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex',gap:5,alignItems:'center',color:'#eed08d' }}>Open D&D Beyond <ExternalLink size={14}/></a>}
          {linked && <button type="button" onClick={unlink} disabled={busy} aria-label="Unlink D&D Beyond character" style={{ display:'inline-flex',gap:5,alignItems:'center',padding:'7px',cursor:'pointer' }}><Trash2 size={14}/> Unlink</button>}
        </div>
        {message && <p role="status" style={{ margin:0,fontSize:12 }}>{message}</p>}
        {failedLoad && <p role="status" style={{ margin:0,fontSize:12 }}>Unable to load your saved link right now. Saving will retry.</p>}
        <p style={{fontSize:12,margin:0,lineHeight:1.5}}>
          This saves the character's source link only — it does <strong>not</strong> import or update stats automatically.
          D&D Beyond has no supported public character-sync API. To bring sheet details into Keeper, use the PDF/image
          importer and review them before saving. Never share D&D Beyond login details.
        </p>
        <a href="/characters/import" style={{fontSize:13,color:'#eed08d'}}>Import a PDF or image of a character sheet</a>
      </form>}
    </div>
  );
}
