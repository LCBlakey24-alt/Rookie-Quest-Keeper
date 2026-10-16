import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, Upload, Play, Pause, Square, Trash2, Repeat, Volume2, Music2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAudioState, subscribeAudio, listCampaignAudio, importAudioFiles, removeAudioTrack, playAudio, pauseAudio, stopAudio, setAudioVolume, setAudioLoop } from '@/lib/gmAudioLibrary';

const controlStyle = {
  border: '1px solid #8f7448', borderRadius: 5, padding: '8px 10px', minHeight: 36,
  background: '#142a3a', color: '#f5e5be', display: 'inline-flex', gap: 6,
  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

export default function Soundboard({ campaignId }) {
  const [tracks, setTracks] = useState(() => listCampaignAudio(campaignId));
  const [state, setState] = useState(getAudioState);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);
  useEffect(() => {
    const sync = () => { setState(getAudioState()); setTracks(listCampaignAudio(campaignId)); };
    sync();
    return subscribeAudio(sync);
  }, [campaignId]);

  const selected = useMemo(() => tracks.find(item => item.id === state.trackId), [tracks, state.trackId]);
  const addFiles = async files => {
    if (!files?.length) return;
    setLoading(true);
    try {
      const imported = await importAudioFiles(campaignId, files);
      setTracks(listCampaignAudio(campaignId));
      toast.success(`${imported.length} MP3 file${imported.length === 1 ? '' : 's'} added to your GM audio library`);
    } catch (e) { toast.error(e?.message || 'Could not save MP3'); }
    finally { setLoading(false); }
  };
  const start = async track => {
    try { await playAudio(campaignId, track); }
    catch (e) { toast.error(e?.message || 'Unable to play this MP3'); }
  };
  const remove = async track => {
    try { await removeAudioTrack(campaignId, track.id); setTracks(listCampaignAudio(campaignId)); }
    catch { toast.error('Could not remove MP3'); }
  };

  return (
    <section data-testid="gm-audio-library" style={{ background: '#0b2233', color: '#f2e7d2', padding: 14, border: '1px solid #846a3e', borderRadius: 8, display: 'grid', gap: 14, minWidth: 0 }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Headphones size={24} color="#deb66c"/>
          <div><h2 style={{ margin: 0, fontSize: 19 }}>GM Music & Audio</h2><p style={{ margin: '3px 0 0', fontSize: 12, color: '#afc5cb' }}>Play MP3 music, ambience or NPC voice recordings. Offline on the GM laptop.</p></div>
        </div>
        <button type="button" style={controlStyle} disabled={loading} onClick={() => fileRef.current?.click()}><Upload size={15}/> {loading ? 'Saving…' : 'Upload MP3'}</button>
        <input ref={fileRef} type="file" accept=".mp3,audio/mpeg" multiple aria-label="Choose MP3 files" style={{ display: 'none' }}
          onChange={event => { void addFiles(event.target.files); event.target.value = ''; }} />
      </header>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, border: '1px solid #4c5d64', background: '#081b2a', padding: 10, borderRadius: 6 }}>
        <Music2 size={17}/><strong style={{ flex: '1 1 180px', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected?.name || (state.trackId ? 'Audio on another campaign' : 'Nothing playing')}</strong>
        {state.status === 'playing' ? <button type="button" style={controlStyle} onClick={pauseAudio}><Pause size={14}/> Pause</button> : <button type="button" style={controlStyle} disabled={!state.trackId} onClick={() => selected && void start(selected)}><Play size={14}/> Resume</button>}
        <button type="button" style={controlStyle} disabled={!state.trackId} onClick={stopAudio}><Square size={13}/> Stop</button>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12 }}><Volume2 size={15}/> Volume
          <input aria-label="GM audio volume" type="range" min="0" max="1" step="0.05" value={state.volume} onChange={e => setAudioVolume(e.target.value)} />
        </label>
        <button type="button" style={{ ...controlStyle, background: state.loop ? '#6e552f' : '#142a3a' }} aria-pressed={state.loop} onClick={() => setAudioLoop(!state.loop)}><Repeat size={14}/> Loop {state.loop ? 'on' : 'off'}</button>
      </div>
      {state.error && <p role="alert" style={{ color: '#fbce9b' }}>{state.error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px,100%), 1fr))', gap: 7, maxHeight: 360, overflowY: 'auto' }}>
        {tracks.map(track => <article key={track.id} style={{ display: 'flex', gap: 9, alignItems: 'center', padding: 8, background: state.trackId === track.id ? '#24405a' : '#122c3d', border: '1px solid #405061', borderRadius: 5 }}>
          <button type="button" style={controlStyle} aria-label={`Play ${track.name}`} onClick={() => state.trackId === track.id && state.status === 'playing' ? pauseAudio() : void start(track)}>
            {state.trackId === track.id && state.status === 'playing' ? <Pause size={16}/> : <Play size={16}/>}
          </button>
          <span style={{ minWidth: 0, flex: 1, display: 'grid', gap: 2 }}><strong style={{ fontSize: 12, overflowWrap: 'anywhere' }}>{track.name}</strong><small style={{ color: '#b4bfc7' }}>{track.source === 'campaign' ? 'Eldritch Heralds recording' : 'Uploaded MP3'}</small></span>
          {track.source !== 'campaign' && <button type="button" style={controlStyle} aria-label={`Remove ${track.name}`} onClick={() => void remove(track)}><Trash2 size={14}/></button>}
        </article>)}
        {tracks.length === 0 && <p style={{ margin: 0, padding: 14, color: '#c1ccd0' }}>No MP3s yet. Use Upload MP3. Tracks stay available after restarting Keeper; existing campaign recordings are listed automatically.</p>}
      </div>
      <p style={{ margin: 0, fontSize: 12, color: '#b2c0c8' }}>Playback comes from this GM laptop's speakers or chosen sound output. It does not transmit sound to the Wi-Fi player screen. Files up to 25 MB each are supported.</p>
    </section>
  );
}
