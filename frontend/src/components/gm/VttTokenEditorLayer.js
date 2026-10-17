import React, { useRef, useState } from 'react';
import { snapTokenPoint } from '@/lib/vttEncounterPresets';

export default function VttTokenEditorLayer({
  tokens = [], onTokenMove, onTokenVisibilityChange,
  snap = false, columns = 24, imageWidth = 0, imageHeight = 0,
}) {
  const layer = useRef(null);
  const [drag, setDrag] = useState(null);

  const point = event => {
    const rect = layer.current?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return null;
    return snapTokenPoint(100 * (event.clientX - rect.left) / rect.width,
      100 * (event.clientY - rect.top) / rect.height, columns, imageWidth, imageHeight, snap);
  };

  const endDrag = event => {
    if (!drag) return;
    event.stopPropagation();
    const next = point(event) || { x: drag.x, y: drag.y };
    onTokenMove?.(drag.id, next);
    setDrag(null);
  };

  return (
    <div ref={layer} data-testid="gm-token-placement-layer" aria-label="GM-only draggable monster tokens"
      style={{ position:'absolute',inset:0,zIndex:9,pointerEvents:'none' }}>
      {tokens.map((token, index) => {
        const id=String(token.id||token.name||index);
        const place = drag?.id===id ? drag : token;
        const x=Number(place.x) || 50, y=Number(place.y) || 50;
        const visible=token.visible===true;
        return (
          <button key={id} type="button" title={`${token.name || 'Creature'} — ${visible ? 'revealed to player list' : 'not revealed'} · drag to move; double click to change visibility`}
            aria-label={`Move ${token.name || id} (GM only)`}
            onPointerDown={e=>{
              if(e.button!==0)return;
              e.stopPropagation();
              e.currentTarget.setPointerCapture?.(e.pointerId);
              setDrag({id,x,y});
            }}
            onPointerMove={e=>{
              if(drag?.id!==id)return;
              e.stopPropagation();
              const p=point(e);if(p)setDrag({id,...p});
            }}
            onPointerUp={endDrag}
            onPointerCancel={e=>{e.stopPropagation();setDrag(null)}}
            onDoubleClick={e=>{e.stopPropagation();onTokenVisibilityChange?.(id)}}
            onClick={e=>e.stopPropagation()}
            onKeyDown={e=>{
              if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
              e.preventDefault();e.stopPropagation();
              const step=snap?100/Math.max(4,columns):1;
              const x1=x+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0);
              const y1=y+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0);
              onTokenMove?.(id,snapTokenPoint(x1,y1,columns,imageWidth,imageHeight,snap));
            }}
            style={{position:'absolute',left:x+'%',top:y+'%',transform:'translate(-50%,-50%)',width:38,height:38,borderRadius:'50%',border:visible?'2px solid #f9ca70':'2px dashed #a8a4ad',boxShadow:'0 3px 15px #000',background:visible?'#183b56':'#302a44',color:'#fff3d5',display:'grid',placeItems:'center',fontSize:12,fontWeight:900,cursor:'grab',touchAction:'none',pointerEvents:'auto',opacity:visible?1:.74}}>
            {token.image_url ? <img src={token.image_url} alt="" draggable={false} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/> : String(token.name||'?').slice(0,2).toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
