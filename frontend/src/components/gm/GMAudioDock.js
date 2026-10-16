import React, { useEffect, useMemo, useState } from 'react';
import { Headphones, Pause, Play, Square, Volume2 } from 'lucide-react';
import { getAudioState, listCampaignAudio, playAudio, pauseAudio, stopAudio, setAudioVolume, subscribeAudio } from '@/lib/gmAudioLibrary';

export default function GMAudioDock({ campaignId }) {
  const [state, setState] = useState(getAudioState);
  const [tracks, setTracks] = useState(() => listCampaignAudio(campaignId));
  useEffect(() => {
    const sync = () => { setState(getAudioState()); setTracks(listCampaignAudio(campaignId)); };
    sync(); return subscribeAudio(sync);
  }, [campaignId]);
  const selected = useMemo(() => tracks.find(item => item.id === state.trackId), [state.trackId, tracks]);
  const playSelected = async trackId => {
    const track = tracks.find(item => item.id === trackId);
    if (!track) return;
    try { await playAudio(campaignId, track); }
    catch (error) { window.alert(error.message || 'Audio playback failed'); }
  };
  const style = { color: '#efe7d3', background: '#0a2233', border: '1px solid #987748', borderRadius: 5, padding: '7px 8px', fontSize: 12 };
  return (
    <div data-testid="gm-quick-audio-dock" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', border: '1px solid rgba(201,160,88,.4)', borderRadius: 7, padding: 7, background: '#0a1a2b', color: '#e7dabb' }}>
      <Headphones size={17} aria-label="GM audio" />
      <select aria-label="Quick GM music track" value={selected?.id || ''} style={{ ...style, maxWidth: 190, minWidth: 120 }} onChange={e => void playSelected(e.target.value)}>
        <option value="">Choose music or voice…</option>
        {tracks.map(track => <option key={track.id} value={track.id}>{track.name}</option>)}
      </select>
      {state.status === 'playing' ? <button type="button" style={style} onClick={pauseAudio} aria-label="Pause GM audio"><Pause size={15}/></button>
        : <button type="button" style={style} disabled={!state.trackId} onClick={() => selected && void playSelected(selected.id)} aria-label="Resume GM audio"><Play size={15}/></button>}
      <button type="button" style={style} disabled={!state.trackId} onClick={stopAudio} aria-label="Stop GM audio"><Square size={14}/></button>
      <Volume2 size={14}/>
      <input aria-label="Quick GM music volume" type="range" min="0" max="1" step=".05" value={state.volume} onChange={e => setAudioVolume(e.target.value)} style={{ width: 74 }} />
    </div>
  );
}
