import React from 'react';
import { Smartphone, Tablet, LockKeyhole, Wifi, Cloud, AlertTriangle } from 'lucide-react';
import { isOfflineDesktop } from '@/preview/previewMode';
import PlayerInvitePanel from '@/components/gm/PlayerInvitePanel';

export default function PlayerCompanionSetup({ campaignId }) {
  const offline = isOfflineDesktop();
  return <section data-testid="gm-player-companion-setup" style={{ display:'grid',gap:14,padding:14,background:'var(--rq-bg-panel,#0b2233)',color:'var(--rq-text-primary,#f1e8d5)',border:'1px solid var(--rq-border-default,#a98548)' }}>
    <div style={{ display:'flex',gap:10,alignItems:'center',flexWrap:'wrap' }}>
      <Smartphone size={25}/><Tablet size={24}/>
      <div>
        <h2 style={{ margin:0,fontSize:20 }}>Player Phones & Tablets</h2>
        <p style={{ margin:'3px 0 0',fontSize:13 }}>Give each player access to their own character sheet. This is separate from the shared spectator TV link.</p>
      </div>
    </div>
    {offline ? <>
      <div role="status" style={{ display:'flex',gap:10,alignItems:'flex-start',padding:12,background:'rgba(214,168,79,.08)',border:'1px solid #7c6537' }}>
        <Wifi size={18}/><div><strong>Offline GM mode — character sync not yet connected</strong>
          <p style={{ fontSize:13,margin:'5px 0 0' }}>The Wi-Fi player screen currently shows maps and battles only. It cannot securely assign a character or update a player's phone. Your private campaign stays on this laptop.</p>
        </div>
      </div>
      <p style={{fontSize:13,margin:0}}>For phone and tablet characters, use the online Keeper player account and its campaign join code. We still need to link this offline campaign to the same online campaign before character changes can synchronize in both directions.</p>
      <p style={{fontSize:13,margin:0}}><LockKeyhole size={15} style={{display:'inline',verticalAlign:'middle'}}/> Never share the full GM campaign pack or the GM spectator control with a player.</p>
    </> : <>
      <p style={{fontSize:13,margin:0}}><Cloud size={16} style={{display:'inline',verticalAlign:'middle'}}/> Online campaign mode: use the join code below. Each player signs in to their own account, selects their own character and follows the GM approval flow.</p>
      <PlayerInvitePanel campaignId={campaignId}/>
    </>}
    <div style={{display:'grid',gap:5,padding:10,border:'1px solid #5d6672'}}>
      <strong style={{fontSize:13}}>Installing the player app on a phone</strong>
      <p style={{margin:0,fontSize:12}}>Android/Chrome: open the secure Keeper website, sign in and select <em>Install app</em> or <em>Add to Home screen</em> in the browser menu.</p>
      <p style={{margin:0,fontSize:12}}>iPhone/iPad/Safari: open the Keeper website, tap Share, then <em>Add to Home Screen</em>. Sign in as the player, not the GM.</p>
      {offline && <p style={{margin:0,fontSize:12,color:'#f4d397'}}><AlertTriangle size={14} style={{display:'inline',verticalAlign:'middle'}}/> Installing the player web app does not yet make this offline Windows copy sync with it.</p>}
    </div>
  </section>;
}
