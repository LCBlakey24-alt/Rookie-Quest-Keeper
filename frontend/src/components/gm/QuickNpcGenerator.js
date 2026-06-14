import React, { useState, useCallback } from 'react';
import { UserPlus, Dices, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const FIRST_NAMES = [
  'Aldric','Brenna','Cedric','Daria','Elara','Finn','Gwen','Haldor','Isolde','Jareth',
  'Keira','Lyric','Maren','Nolan','Orla','Pavel','Quinn','Rhea','Soren','Thea',
  'Ulric','Vera','Wren','Xara','Yoren','Zara','Ashwin','Belka','Corrin','Drina',
  'Egan','Faye','Gareth','Hestia','Ivan','Jorik','Kalara','Leif','Miriel','Nyx',
];

const SURNAMES = [
  'Blackwood','Ironforge','Silverleaf','Stormwind','Darkholme','Brightwater','Thornwall',
  'Ashburn','Frostweave','Shadowmere','Goldcrest','Ravenscar','Stonehearth','Windrunner',
  'Embervale','Nightwhisper','Deepforge','Starbloom','Greycloak','Redmane',
];

const RACES = ['Human','Elf','Dwarf','Halfling','Gnome','Tiefling','Half-Orc','Half-Elf','Dragonborn'];

const OCCUPATIONS = [
  'Innkeeper','Blacksmith','Merchant','Scholar','Guard Captain','Herbalist','Priest','Beggar',
  'Noble','Sailor','Farmer','Bard','Thief','Bounty Hunter','Alchemist','Scribe','Stable Hand',
  'Tavern Wench','Fisher','Miner','Woodcutter','Healer','Fortune Teller','Spy','Wanderer',
];

const PERSONALITY = [
  'nervous and fidgety','bold and brash','quiet and observant','warm and welcoming',
  'suspicious of strangers','eager to gossip','deeply religious','world-weary',
  'overly cheerful','hiding a dark secret','fiercely loyal','desperately greedy',
  'painfully honest','chronic liar','gentle and soft-spoken','loud and boisterous',
  'paranoid and jumpy','erudite and condescending','absent-minded','flirtatious',
];

const QUIRKS = [
  'speaks in the third person','constantly adjusts their hat','has a prominent scar across their nose',
  'hums an unrecognizable tune','collects unusual stones','refers to everyone as "friend"',
  'has a pet rat on their shoulder','smells faintly of cinnamon','always carries a locked box',
  'taps their fingers when thinking','speaks in riddles','has heterochromia (different colored eyes)',
  'limps slightly on the left side','chews on a piece of straw','wears mismatched boots',
  'laughs at inappropriate moments','constantly whittles a small figure','has an unusual accent',
  'keeps glancing over their shoulder','wears far too many rings',
];

const MOTIVATIONS = [
  'seeking revenge for a murdered family member','trying to pay off a massive debt',
  'searching for a lost sibling','protecting a dangerous secret','wants to retire but can\'t',
  'gathering information for a patron','hoping to find a cure for a loved one\'s illness',
  'trying to start a new life far from home','obsessed with collecting rare items',
  'working undercover for a local lord','saving money to open their own shop',
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function generateNpc() {
  return {
    name: `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`,
    race: pick(RACES),
    occupation: pick(OCCUPATIONS),
    personality: pick(PERSONALITY),
    quirk: pick(QUIRKS),
    motivation: pick(MOTIVATIONS),
    voice_note: pick(['Deep and gravelly','High-pitched and nasally','Smooth and melodic','Rough and scratchy','Soft whisper','Booming baritone','Slight stutter','Foreign accent']),
  };
}

export default function QuickNpcGenerator({ theme }) {
  const [npc, setNpc] = useState(null);

  const generate = useCallback(() => {
    setNpc(generateNpc());
  }, []);

  const copyToClipboard = () => {
    if (!npc) return;
    const text = `${npc.name} (${npc.race} ${npc.occupation})\nPersonality: ${npc.personality}\nQuirk: ${npc.quirk}\nMotivation: ${npc.motivation}\nVoice: ${npc.voice_note}`;
    navigator.clipboard.writeText(text);
    toast.success('NPC copied to clipboard!');
  };

  const labelStyle = { fontSize: '9px', fontWeight: 700, color: theme.text.muted, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '2px' };
  const valueStyle = { fontSize: '13px', color: theme.text.secondary, lineHeight: 1.5 };

  return (
    <div data-testid="quick-npc-generator" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button data-testid="generate-npc-btn" onClick={generate}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            background: npc ? 'rgba(139,92,246,0.12)' : (theme.gradient || 'linear-gradient(135deg, #D4A017, #F59E0B)'),
            color: npc ? '#A78BFA' : '#fff',
            border: npc ? '1px solid rgba(139,92,246,0.3)' : 'none',
          }}>
          {npc ? <RefreshCw size={14} /> : <UserPlus size={14} />}
          {npc ? 'Regenerate' : 'Generate Quick NPC'}
        </button>
        {npc && (
          <button data-testid="copy-npc-btn" onClick={copyToClipboard}
            style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${theme.border}`, color: theme.text.muted, cursor: 'pointer' }}>
            <Copy size={14} />
          </button>
        )}
      </div>

      {npc && (
        <div data-testid="npc-card" style={{
          background: theme.bg.card || 'rgba(255,255,255,0.03)',
          border: `1px solid ${theme.border}`,
          borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: theme.text.primary }}>{npc.name}</div>
              <div style={{ fontSize: '12px', color: theme.accent?.gm || theme.accent?.primary, fontWeight: 600 }}>{npc.race} {npc.occupation}</div>
            </div>
            <Dices size={16} color={theme.text.muted} style={{ opacity: 0.3 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
            <div>
              <div style={labelStyle}>Personality</div>
              <div style={valueStyle}>{npc.personality}</div>
            </div>
            <div>
              <div style={labelStyle}>Voice</div>
              <div style={valueStyle}>{npc.voice_note}</div>
            </div>
          </div>

          <div>
            <div style={labelStyle}>Quirk</div>
            <div style={valueStyle}>{npc.quirk}</div>
          </div>

          <div>
            <div style={labelStyle}>Motivation</div>
            <div style={{ ...valueStyle, fontStyle: 'italic', color: theme.accent?.gm || '#F59E0B' }}>{npc.motivation}</div>
          </div>
        </div>
      )}
    </div>
  );
}
