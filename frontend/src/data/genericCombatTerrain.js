/**
 * One public terrain catalogue shared by Encounter Builder, GM canvas and
 * Player Display. Textures are self-contained deterministic SVG tiles (no
 * image hotlinks, copyright ambiguity, runtime random redraw or separate
 * player-only assets). Each 160px tile covers 4 x 4 five-foot squares.
 */
export const GENERIC_COMBAT_TERRAINS = Object.freeze([
  { id: 'stone', label: 'Stone slabs', color: '#525965' },
  { id: 'cobblestone', label: 'Cobblestones', color: '#686a70' },
  { id: 'grass', label: 'Grass', color: '#466b45' },
  { id: 'dirt', label: 'Dirt', color: '#705740' },
  { id: 'sand', label: 'Sand', color: '#b59b6b' },
  { id: 'wood', label: 'Wooden planks', color: '#715038' },
  { id: 'water', label: 'Water', color: '#285b70' },
  { id: 'snow', label: 'Snow', color: '#c7d7df' },
  { id: 'mud', label: 'Mud', color: '#57483a' },
  { id: 'lava', label: 'Volcanic lava', color: '#302d34' },
]);

const KNOWN = new Map(GENERIC_COMBAT_TERRAINS.map(item => [item.id, item]));
const SVG_SIZE = 160;
const imageCache = new Map();

export function normaliseCombatTerrain(value) {
  const id = String(value || '').trim().toLowerCase();
  return KNOWN.has(id) ? id : 'stone';
}

/** Valid MapCanvas data, with separate row arrays so edits cannot alias. */
export function createGenericCombatMap(value = 'stone', width = 30, height = 20) {
  const terrain = normaliseCombatTerrain(value);
  const cols = Math.max(1, Math.min(100, Math.floor(Number(width) || 30)));
  const rows = Math.max(1, Math.min(100, Math.floor(Number(height) || 20)));
  return {
    id: 'generic-' + terrain,
    name: 'Generic ' + KNOWN.get(terrain).label,
    width: cols,
    height: rows,
    terrain: Array.from({ length: rows }, () => Array(cols).fill(terrain)),
    walls: [], doors: [], objects: [], tokens: [], generated: true,
  };
}

// Seeded xorshift: identical texture at every refresh and on every screen.
function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
const n = v => Math.round(v * 10) / 10;
const rect = (x, y, w, h, fill, stroke = 'none', rx = 0, extra = '') =>
  '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '" rx="' + rx + '" fill="' + fill + '" stroke="' + stroke + '" ' + extra + '/>';
const circle = (x, y, radius, fill, extra = '') =>
  '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="' + n(radius) + '" fill="' + fill + '" ' + extra + '/>';
const path = (d, stroke, width = 1, extra = '') =>
  '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + width + '" stroke-linecap="round" ' + extra + '/>';
const palette = {
  stone: ['#515966', '#626a75', '#4a515e'],
  cobblestone: ['#6d7075', '#777a7c', '#555d65'],
  grass: ['#376540', '#476f45', '#54754d'],
  dirt: ['#674e39', '#765c42', '#806246'],
  sand: ['#bca472', '#a99060', '#c4af80'],
  wood: ['#79533b', '#674630', '#895f45'],
  water: ['#28586f', '#326e82', '#205167'],
  snow: ['#d0dee4', '#bfced7', '#e0e8eb'],
  mud: ['#574638', '#67503c', '#493b32'],
  lava: ['#343039', '#3c3337', '#292b31'],
};

export function genericCombatTerrainSvg(value = 'stone') {
  const id = normaliseCombatTerrain(value);
  const random = rng((id.split('').reduce((v, char) => (Math.imul(v, 31) + char.charCodeAt(0)) | 0, 1793)) >>> 0);
  const colors = palette[id];
  let art = rect(0, 0, SVG_SIZE, SVG_SIZE, colors[0]);
  const speckle = (count, shade, minR, maxR, alpha) => {
    for (let k = 0; k < count; k += 1) {
      const x = random() * SVG_SIZE, y = random() * SVG_SIZE;
      art += circle(x, y, minR + random() * (maxR - minR), shade,
        'opacity="' + alpha + '"');
    }
  };

  if (id === 'stone' || id === 'cobblestone') {
    art += rect(0, 0, 160, 160, '#343b45');
    const size = id === 'stone' ? 40 : 32;
    const rows = Math.ceil(160 / size);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < Math.ceil(160 / size) + 1; col += 1) {
        const x = col * size + (id === 'cobblestone' && row % 2 ? -size / 3 : 0);
        const y = row * size;
        if (x > 160 || x + size < 0) continue;
        const inset = id === 'stone' ? 2 : 2.8;
        const tone = colors[(row * 3 + col) % 3];
        art += rect(x + inset, y + inset, size - inset * 2, size - inset * 2, tone, '#404650', id === 'stone' ? 1 : 9);
        art += path('M ' + n(x+6) + ' ' + n(y+8) + ' q ' + n(size/4) + ' -3 ' + n(size/2) + ' 0',
          '#c0c4c5', 1.1, 'opacity=".13"');
        if ((row + col) % 3 === 0) {
          art += path('M ' + n(x+10) + ' ' + n(y+size/2) + ' l 7 3 l 3 7',
            '#303743', .8, 'opacity=".42"');
        }
      }
    }
    speckle(110, '#dbdde0', .3, 1, '.19');
    speckle(75, '#151923', .4, 1.5, '.22');
  } else if (id === 'wood') {
    for (let row = 0; row < 4; row += 1) {
      const y = row * 40;
      art += rect(0, y+2, 160, 36, colors[row%3], '#412b21', 0, 'stroke-width="2"');
      for (let k = 0; k < 6; k += 1) {
        const yy = y + 6 + k*5 + random()*3;
        art += path('M 0 ' + n(yy) + ' Q 55 ' + n(yy + (random()-.5)*8) + ' 90 ' + n(yy) + ' T 160 ' + n(yy + (random()-.5)*5),
          k%2 ? '#a67953' : '#34271f', .9, 'opacity=".3"');
      }
      const seam = row%2 ? 110 : 46;
      art += path('M ' + seam + ' ' + (y+2) + ' V ' + (y+38), '#3a2921', 2, 'opacity=".7"');
      for (const x of [6, seam-7, seam+7, 152]) for (const yy of [y+8,y+32])
        art += circle(x, yy, 1.2, '#312924');
    }
  } else if (id === 'grass') {
    speckle(170, '#203e2c', 1.5, 5, '.15');
    speckle(140, '#99a976', .4, 2.1, '.22');
    for (let k = 0; k < 160; k += 1) {
      const x=random()*160,y=random()*160,length=2+random()*7;
      art += path('M '+n(x)+' '+n(y)+' q -2 -'+n(length*.55)+' 0 -'+n(length), k%3?'#8eaa68':'#243e29', .75, 'opacity=".55"');
    }
  } else if (id === 'dirt' || id === 'sand' || id === 'mud') {
    speckle(180, id === 'sand' ? '#f3e1a9' : '#231d1a', .4, 2.8, id === 'sand' ? '.38' : '.23');
    speckle(80, id === 'sand' ? '#745939' : '#d2aa78', .4, 1.7, '.25');
    for(let k=0;k<9;k+=1){
      const y = random()*160, bend = random()*15-7;
      art += path('M 0 '+n(y)+' Q 75 '+n(y+bend)+' 160 '+n(y+(random()-.5)*7),
        id==='sand'?'#f6e2af':id==='mud'?'#241e19':'#3c2b20', id==='sand'?1.7:1.2, 'opacity="'+(id==='sand'?'.24':'.23')+'"');
    }
    if (id === 'mud') {
      for(let k=0;k<9;k+=1) {
        const x=random()*160,y=random()*160,w=10+random()*27;
        art += '<ellipse cx="'+n(x)+'" cy="'+n(y)+'" rx="'+n(w)+'" ry="'+n(w*.36)+'" fill="#2c302f" opacity=".45"/>';
        art += path('M '+n(x-w*.45)+' '+n(y)+' q '+n(w*.35)+' -3 '+n(w*.75)+' 0','#9ba59c',.7,'opacity=".28"');
      }
    }
    if (id === 'dirt') for(let k=0;k<22;k+=1) {
      const x=random()*160,y=random()*160;
      art += circle(x,y,1.6+random()*3.2,'#9b896c','opacity=".4"');
    }
  } else if (id === 'water') {
    for (let k=0;k<26;k+=1) {
      const y=k*6.8, shift=random()*26;
      art += path('M '+n(shift-30)+' '+n(y)+' q 16 -4 34 0 t 35 0 t 35 0 t 35 0',
        k%3===0?'#97c7c7':'#163c56',k%3===0?1.3:1.1,'opacity="'+(k%3===0?'.39':'.4')+'"');
    }
    speckle(65, '#a5d6d7', .5, 2, '.12');
  } else if (id === 'snow') {
    speckle(220, '#ffffff', .5, 2, '.28');
    speckle(110, '#7c9cae', .3, 1.4, '.23');
    for(let k=0;k<15;k+=1) {
      const y=random()*160;
      art += path('M 0 '+n(y)+' Q 80 '+n(y+(random()-.5)*8)+' 160 '+n(y),
        '#f7ffff',1.1,'opacity=".24"');
    }
  } else if (id === 'lava') {
    speckle(180, '#4e4041', 1, 4, '.38');
    for(let k=0;k<5;k+=1) {
      const y=16+k*32, offset=random()*22;
      const d='M '+n(-6+offset)+' '+n(y)+' l 30 '+n(9+random()*9)+' l 28 -9 l 26 13 l 34 -13 l 38 12';
      art += path(d,'#652d23',9,'opacity=".84"');
      art += path(d,'#df4c20',3.1,'opacity=".77"');
      art += path(d,'#f3aa42',1,'opacity=".72"');
    }
    speckle(60, '#d3632d', .4, 1.7, '.5');
  }

  // Clip within the repeated tile. Grid is drawn separately on both screens.
  return '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">'
    + art + '</svg>';
}

export function getGenericCombatTerrainImage(value = 'stone') {
  const id = normaliseCombatTerrain(value);
  if (!imageCache.has(id)) imageCache.set(id, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(genericCombatTerrainSvg(id)));
  return imageCache.get(id);
}

export function genericCombatBackdropStyle(value = 'stone') {
  return {
    backgroundColor: KNOWN.get(normaliseCombatTerrain(value)).color,
    // GM and Player Display both use the same 4x4-square texture tile.
    backgroundImage: [
      'linear-gradient(to right, rgba(5,15,20,.25) 1px, transparent 1px)',
      'linear-gradient(to bottom, rgba(5,15,20,.25) 1px, transparent 1px)',
      'url("' + getGenericCombatTerrainImage(value) + '")',
    ].join(', '),
    backgroundSize: '3.333333% 5%, 3.333333% 5%, 13.333333% 20%',
    backgroundPosition: '0 0',
  };
}
