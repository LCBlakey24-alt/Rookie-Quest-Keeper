import React from 'react';
import { normaliseTactical, safePoint } from '@/lib/vttTacticalOverlay';

const fxCss = `
@keyframes rqkRainFall { from { top:-25%;opacity:0 } 12%{opacity:.52} to{top:110%;opacity:0} }
@keyframes rqkEmbersRise {from {top:110%;transform:translateX(-15px);opacity:0} 16%{opacity:.95} to{top:-10%;transform:translateX(28px);opacity:0}}
@keyframes rqkHeatMove {0%{transform:translateY(0);opacity:.15}50%{transform:translateY(-10%);opacity:.48}100%{transform:translateY(-20%);opacity:.12}}
@keyframes rqkSnowFall {from{top:-10%;transform:translateX(-10px);opacity:0}20%{opacity:.75}to{top:110%;transform:translateX(20px);opacity:0}}
@keyframes rqkMapPing {0%{transform:translate(-50%,-50%) scale(.2);opacity:1}75%{opacity:.75}100%{transform:translate(-50%,-50%) scale(4.2);opacity:0}}
@media(prefers-reduced-motion:reduce){.rqk-map-particle,.rqk-map-heat,.rqk-map-ping{animation:none!important;opacity:.22!important}}
`;

function PartyPin({ marker }) {
  const p=safePoint(marker);
  if (!p) return null;
  return <div aria-label="Party location on world map" data-testid="world-party-marker"
    style={{ position:'absolute', zIndex:7, pointerEvents:'none', left:p.x+'%', top:p.y+'%', transform:'translate(-50%,-100%)', color:'#fff', textAlign:'center', filter:'drop-shadow(0 3px 6px #000)' }}>
    <div style={{ background:'#0b3049',color:'#ffe6aa',border:'2px solid #f1c375',borderRadius:'14px 14px 14px 0', transform:'rotate(-45deg)',width:30,height:30,display:'grid',placeItems:'center' }}>
      <span style={{ transform:'rotate(45deg)',fontSize:19 }}>⚑</span>
    </div>
    <span style={{ display:'block',padding:'2px 6px',fontSize:12,fontWeight:900,whiteSpace:'nowrap',borderRadius:4,background:'#071522ee' }}>The Party</span>
  </div>;
}

export default function MapLiveEffects({ tactical, ping, editor = false }) {
  const t=normaliseTactical(tactical);
  const effect=t.effect;
  const particles=effect==='rain'?26:effect==='embers'?20:effect==='snow'?27:0;
  const showPing=safePoint(ping) && Number.isFinite(Number(ping?.at)) && Date.now()-Number(ping.at)<4500;
  return <>
    <style>{fxCss}</style>
    {t.mapKind==='world' && <PartyPin marker={t.partyMarker} />}
    {effect === 'heat' && <div aria-hidden="true" className="rqk-map-heat" data-testid="map-effect-heat"
      style={{ position:'absolute',inset:0,zIndex:8,pointerEvents:'none',overflow:'hidden',opacity:.3,
        background:'repeating-linear-gradient(175deg,transparent 0%,rgba(255,199,96,.18) 4%,transparent 8%,rgba(255,245,195,.14) 15%,transparent 23%)',
        animation:'rqkHeatMove 4s ease-in-out infinite alternate' }} />}
    {particles>0 && <div aria-hidden="true" data-testid={`map-effect-${effect}`}
      style={{ position:'absolute',inset:0,zIndex:8,pointerEvents:'none',overflow:'hidden' }}>
      {Array.from({length:particles},(_,i)=><span key={i} className="rqk-map-particle" style={{
        position:'absolute',left:((i*43+11)%100)+'%',
        top:effect==='embers'?'95%':'-25%',borderRadius:effect==='rain'?1:'50%',
        width:effect==='rain'?1.5:effect==='embers'?3:4,height:effect==='rain'?'13%':effect==='embers'?3:4,
        opacity:0,background:effect==='rain'?'linear-gradient(transparent,#cbe7ff8a)':effect==='embers'?'#ffc36c':'#eaf9ff',
        boxShadow:effect==='embers'?'0 0 8px 2px #f57b31b5':'none',
        animation:`${effect==='rain'?'rqkRainFall':effect==='embers'?'rqkEmbersRise':'rqkSnowFall'} ${(effect==='rain'?1.5:effect==='embers'?4.6:8)+(i%7)*.29}s linear ${(i%9)*-.7}s infinite`
      }}/>)}
    </div>}
    {showPing && <div key={ping.at} aria-label={editor?'GM map ping':'GM ping location'} data-testid="map-ping"
      style={{ position:'absolute',left:ping.x+'%',top:ping.y+'%',zIndex:12,pointerEvents:'none' }}>
      <span className="rqk-map-ping" style={{ position:'absolute',width:27,height:27,borderRadius:'50%',border:'3px solid #ffd66d',boxShadow:'0 0 15px #f1b24f',transform:'translate(-50%,-50%)',animation:'rqkMapPing 2.8s ease-out forwards' }} />
      <span style={{position:'absolute',transform:'translate(-50%,-50%)',width:9,height:9,borderRadius:'50%',background:'#ffe8a1',boxShadow:'0 0 10px #ffc257'}}/>
    </div>}
  </>;
}
