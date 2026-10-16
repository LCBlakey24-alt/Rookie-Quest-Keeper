'use strict';

// Read-only player display on the GM laptop's trusted local network.
// No Atlas, Vercel, authentication server or cloud connection is involved.
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const PORT = 0; // An available port; never collide with another installed app.
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
const MODES = new Set(['blank', 'title', 'image', 'npc-grid', 'combat', 'table-result', 'battle-start']);
const text = (value, max = 240) => String(value == null ? '' : value).slice(0, max);
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

function localIpv4() {
  const addresses = Object.values(os.networkInterfaces()).flat().filter(
    (entry) => entry && entry.family === 'IPv4' && !entry.internal
  ).map((entry) => entry.address);
  return addresses.find((ip) => /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(ip))
    || addresses[0] || '127.0.0.1';
}

function attachmentPath(src, userDataDir) {
  try {
    // URL() normalises dot segments, so reject traversal before parsing.
    const raw = String(src || '');
    if (/(?:%2e|%2f|%5c)/i.test(raw) || /(?:^|\/)\.\.(?:\/|$)/.test(raw) || raw.includes('\\')) return null;
    const url = new URL(raw);
    if (url.protocol !== 'rqk-attachment:') return null;
    if (!/^[a-zA-Z0-9._-]{1,120}$/.test(url.hostname) || url.hostname === '.' || url.hostname === '..') return null;
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (!rel || rel.includes('\0') || !MIME[path.extname(rel).toLowerCase()]) return null;
    const folder = path.resolve(userDataDir, 'campaign-packs', url.hostname);
    const file = path.resolve(folder, rel);
    const relative = path.relative(folder, file);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
    return file;
  } catch {
    return null;
  }
}

function createLanDisplayServer({ userDataDir } = {}) {
  const accessKey = crypto.randomBytes(24).toString('hex');
  let server;
  let info;
  let published = { mode: 'blank', payload: { title: 'Waiting for the GM' } };
  let revision = 0;

  function imageUrl(value) {
    const src = text(value, 18 * 1024 * 1024).trim();
    if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-zA-Z0-9+/=\s]+$/i.test(src)) return src;
    if (/^https?:\/\//i.test(src)) return src.slice(0, 4000);
    if (attachmentPath(src, userDataDir)) {
      return '/attachment?key=' + accessKey + '&src=' + encodeURIComponent(src);
    }
    return '';
  }

  function projectDisplayState(state) {
    const mode = MODES.has(state?.mode) ? state.mode : 'blank';
    const source = state?.payload && typeof state.payload === 'object' ? state.payload : {};
    const payload = {
      title: text(source.title),
      subtitle: text(source.subtitle, 500),
      caption: text(source.caption, 500),
      eyebrow: text(source.eyebrow, 80),
      display_target: source.display_target === 'virtual-table' ? 'virtual-table' : 'standing-tv',
    };
    if (mode === 'image') payload.image_url = imageUrl(source.image_url || source.map_url || source.image_data);
    if (mode === 'npc-grid') {
      payload.npcs = (Array.isArray(source.npcs) ? source.npcs : []).slice(0, 48).map((npc) => ({
        name: text(npc?.name, 100),
        subtitle: text(npc?.subtitle, 140),
        description: text(npc?.description, 240),
        image_url: imageUrl(npc?.image_url || npc?.portrait_url || npc?.image_data),
      }));
    }
    if (mode === 'combat') {
      payload.map_url = imageUrl(source.map_url || source.image_url || source.image_data);
      payload.round = Math.max(1, number(source.round) || 1);
      payload.tokens = (Array.isArray(source.tokens) ? source.tokens : [])
        .filter((token) => token && token.hidden !== true).slice(0, 40)
        .map((token) => ({
          name: text(token.name, 100),
          subtitle: text(token.subtitle, 100),
          image_url: imageUrl(token.image_url),
          x: number(token.x),
          y: number(token.y),
        }));
    }
    if (mode === 'table-result') {
      payload.die = text(source.die, 20);
      payload.roll = text(source.roll, 20);
      payload.result = text(source.result, 500);
    }
    if (source.banner && typeof source.banner === 'object') {
      payload.banner = {
        eyebrow: text(source.banner.eyebrow, 60),
        text: text(source.banner.text || source.banner.title, 240),
      };
    }
    return { mode, payload };
  }

  function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
    res.writeHead(status, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; img-src 'self' data: https: http:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'",
    });
    res.end(body);
  }

  function handle(request, res) {
    if (request.method !== 'GET') return send(res, 405, 'Read-only');
    let url;
    try { url = new URL(request.url, 'http://localhost'); } catch { return send(res, 400, 'Invalid URL'); }
    if (url.searchParams.get('key') !== accessKey) return send(res, 403, 'Invalid display link');
    if (url.pathname === '/version') {
      return send(res, 200, String(revision));
    }
    if (url.pathname === '/state') {
      return send(res, 200, JSON.stringify(published), 'application/json; charset=utf-8');
    }
    if (url.pathname === '/attachment') {
      const file = attachmentPath(url.searchParams.get('src') || '', userDataDir);
      if (!file) return send(res, 404, 'Not found');
      try {
        const stat = fs.statSync(file);
        if (!stat.isFile() || stat.size > 30 * 1024 * 1024) return send(res, 404, 'Not found');
        res.writeHead(200, {
          'Content-Type': MIME[path.extname(file).toLowerCase()],
          'Content-Length': stat.size,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        });
        fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
      } catch { send(res, 404, 'Not found'); }
      return;
    }
    if (url.pathname !== '/') return send(res, 404, 'Not found');
    return send(res, 200, viewerHtml(), 'text/html; charset=utf-8');
  }

  return {
    async start() {
      if (info) return info;
      if (server) return null;
      server = http.createServer(handle);
      try {
        await new Promise((resolve, reject) => {
          server.once('error', reject);
          server.listen(PORT, '0.0.0.0', resolve);
        });
      } catch (error) {
        server.close();
        server = null;
        throw error;
      }
      info = { url: 'http://' + localIpv4() + ':' + server.address().port + '/?key=' + accessKey };
      return info;
    },
    getInfo: () => info,
    publish: (state) => {
      published = projectDisplayState(state);
      revision += 1;
      return { accepted: true, mode: published.mode };
    },
    close: () => { if (server) server.close(); server = null; info = null; },
    projectDisplayState, // Exported here for precise no-leak unit tests.
  };
}

function viewerHtml() {
  return String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rookie Quest Keeper · Player Display</title>
<style>
:root{color-scheme:dark;font-family:system-ui,Segoe UI,sans-serif;background:#071522;color:#efe6d5}
*{box-sizing:border-box}body{margin:0;height:100dvh;overflow:hidden}
#frame{height:100dvh;display:grid;grid-template-rows:auto minmax(0,1fr);padding:clamp(4px,1vw,12px);gap:6px}
header{display:flex;justify-content:space-between;align-items:center;gap:12px;color:#c9a96b;text-transform:uppercase;font-weight:800;font-size:clamp(10px,1.3vw,15px);border-bottom:1px solid #6b5a3b;padding:6px 10px}
header span{font-size:11px;color:#b9b6ad;text-transform:none}#stage{min-width:0;min-height:0;position:relative;overflow:hidden;display:grid}
.scene{min-height:0;height:100%;width:100%;display:grid;place-items:center;text-align:center;gap:10px;align-content:center;padding:clamp(10px,3vw,32px)}
h1{font-size:clamp(25px,5vw,68px);margin:0;line-height:1.05;color:#f3e9d5}p{margin:0;color:#b6bbbf}.eyebrow{text-transform:uppercase;letter-spacing:.2em;color:#c9a96b;font-size:clamp(11px,1.4vw,17px)}
.map{width:100%;height:100%;min-height:0;display:grid;grid-template-rows:minmax(0,1fr) auto;gap:4px}
.picture{height:100%;min-height:0;min-width:0;background:#000;position:relative;display:grid;place-items:center;overflow:hidden}
.picture img{max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain}
.token-layer{position:absolute;pointer-events:none;z-index:2;inset:0}.map-token{position:absolute;transform:translate(-50%,-50%);display:grid;place-items:center;min-width:32px;min-height:32px;border:2px solid #d6a84f;border-radius:50%;background:#0b1b2be8;color:#f2e4c4;font-weight:900;font-size:11px;box-shadow:0 6px 20px #000c;max-width:100px;text-align:center;padding:3px}.map-token img{width:30px;height:30px;object-fit:cover;border-radius:50%}
.caption{text-align:center;font-size:clamp(13px,2vw,22px);padding:2px 8px;color:#efe6d5}
.grid{width:100%;height:100%;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);gap:8px;padding:6px}
.cards{display:grid;min-height:0;grid-template-columns:repeat(auto-fit,minmax(min(22vw,170px),1fr));grid-auto-rows:minmax(0,1fr);gap:clamp(5px,1vw,14px);overflow:hidden}
.card{min-height:0;overflow:hidden;background:#112a40;border:1px solid #5c583e;display:grid;grid-template-rows:minmax(0,1fr) auto}
.card img{width:100%;height:100%;min-height:0;object-fit:contain;background:#050c15}
.initial{display:grid;place-items:center;font-size:clamp(30px,8vw,90px);color:#d1b97f;min-height:0}
.card .details{padding:clamp(5px,1vw,10px);text-align:center}.card strong{font-size:clamp(13px,1.7vw,23px);display:block}.card small{color:#aeb9c7}
.badge{position:absolute;top:8px;left:8px;background:#112a40e8;border:1px solid #c9a96b;padding:6px 10px;color:#efe6d5}
#banner{display:none;position:absolute;bottom:2%;left:10%;width:80%;text-align:center;background:#12263deb;border:1px solid #c9a96b;padding:12px;font-size:clamp(16px,2.5vw,32px)}
#banner:not(:empty){display:block}.token-list{position:absolute;bottom:8px;left:6px;right:6px;display:flex;flex-wrap:wrap;justify-content:center;gap:5px}
.token-list span{background:#071522db;border:1px solid #a68d58;padding:5px 8px}
</style></head><body><div id="frame"><header><strong>Rookie Quest Keeper</strong><span>Live tabletop · Player safe</span></header><main id="stage"></main></div><div id="banner"></div>
<script>
(function(){
'use strict';
var stage=document.getElementById('stage'),banner=document.getElementById('banner');
var key=new URL(location.href).searchParams.get('key')||'',last='';
function el(tag,className,txt){var node=document.createElement(tag);if(className)node.className=className;if(txt!==undefined)node.textContent=String(txt);return node}
function image(src,alt){var node=el('img');node.alt=alt||'';node.src=src;node.onerror=function(){node.replaceWith(el('p','', 'Image could not load — check map or portrait file'))};return node}
function scene(p,mode){var div=el('section','scene');div.appendChild(el('p','eyebrow',p.eyebrow||(mode==='battle-start'?'Combat':'Scene')));div.appendChild(el('h1','',p.title||(mode==='battle-start'?'BATTLE STARTING':'Waiting for the GM')));if(p.subtitle)div.appendChild(el('p','',p.subtitle));return div}
function map(p,combat){var outer=el('section','map');var box=el('div','picture');var src=combat?p.map_url:p.image_url;var img=src?image(src,p.title):null;if(img)box.appendChild(img);else box.appendChild(el('p','','No map image selected'));outer.appendChild(box);
if(combat){box.appendChild(el('div','badge',String(p.title||'Combat')+' · Round '+String(p.round||1)));var layer=el('div','token-layer'),strip=el('div','token-list');(p.tokens||[]).forEach(function(t){var x=Number(t.x)||0,y=Number(t.y)||0;if(x||y){var token=el('div','map-token');token.title=t.name||'Token';token.style.left=Math.max(2,Math.min(98,x))+'%';token.style.top=Math.max(2,Math.min(98,y))+'%';if(t.image_url)token.appendChild(image(t.image_url,t.name));else token.textContent=(t.name||'?').slice(0,8);layer.appendChild(token)}else strip.appendChild(el('span','',t.name))});box.appendChild(layer);box.appendChild(strip);
var fit=function(){if(!img||!img.naturalWidth)return;var w=box.clientWidth,h=box.clientHeight,s=Math.min(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*s,ih=img.naturalHeight*s;layer.style.left=(w-iw)/2+'px';layer.style.top=(h-ih)/2+'px';layer.style.width=iw+'px';layer.style.height=ih+'px';layer.style.right='auto';layer.style.bottom='auto'};if(img){img.addEventListener('load',fit);window.onresize=fit}}
if(p.title||p.caption)outer.appendChild(el('div','caption',p.title||p.caption));return outer}
function npcs(p){var outer=el('section','grid');outer.appendChild(el('h1','',p.title||'People in the scene'));var cards=el('div','cards');(p.npcs||[]).forEach(function(n){var card=el('article','card');card.appendChild(n.image_url?image(n.image_url,n.name):el('div','initial',(n.name||'?').slice(0,1).toUpperCase()));var info=el('div','details');info.appendChild(el('strong','',n.name||'Unknown figure'));if(n.subtitle)info.appendChild(el('small','',n.subtitle));card.appendChild(info);cards.appendChild(card)});if(!(p.npcs||[]).length)cards.appendChild(el('p','','No NPCs selected'));outer.appendChild(cards);return outer}
function draw(state){var p=state.payload||{},mode=state.mode||'blank';stage.replaceChildren();if(mode==='image'||mode==='combat')stage.appendChild(map(p,mode==='combat'));else if(mode==='npc-grid')stage.appendChild(npcs(p));else if(mode==='table-result'){var s=scene(p,mode);s.appendChild(el('h1','',String(p.die||'d20')+' → '+String(p.roll||'?')));s.appendChild(el('p','',p.result||''));stage.appendChild(s)}else stage.appendChild(scene(p,mode));banner.textContent=p.banner&&p.banner.text||''}
async function poll(){try{var ping=await fetch('/version?key='+encodeURIComponent(key),{cache:'no-store'});if(!ping.ok)throw Error('Not connected');var version=await ping.text();if(version===last)return;var res=await fetch('/state?key='+encodeURIComponent(key),{cache:'no-store'});if(!res.ok)throw Error('Not connected');draw(await res.json());last=version}catch(e){if(!last)stage.replaceChildren(scene({title:'Waiting for laptop',subtitle:'Check the Wi-Fi connection and keep Keeper open'},'blank'))}}
poll();setInterval(poll,850);document.addEventListener('keydown',function(e){if(e.key==='f'||e.key==='F'){document.documentElement.requestFullscreen().catch(function(){})}});
})();
</script></body></html>`;
}

module.exports = { createLanDisplayServer, attachmentPath, localIpv4 };
