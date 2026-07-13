import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Clipboard, Copy, Monitor, Play, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createDisplayState, publishCampaignDisplayState } from '@/lib/liveDisplayBus';
import tiaKartaSecondScreenPresets from '@/data/tiaKartaSecondScreenPresets';

const rq = {
  panel: 'var(--rq-bg-panel, #120821)',
  card: 'var(--rq-bg-elevated, rgba(49,31,76,0.92))',
  card2: 'rgba(9,5,22,0.72)',
  line: 'var(--rq-accent-border, rgba(255,160,116,0.34))',
  accent: 'var(--rq-accent-primary, #ff4fd8)',
  text: 'var(--rq-text-primary, #fff6ea)',
  soft: 'var(--rq-text-secondary, rgba(255,246,234,0.76))',
  muted: 'var(--rq-text-muted, rgba(255,246,234,0.56))',
  warn: '#fbbf24',
  good: '#34d399',
};

const RUN_STEPS = [
  {
    id: 'return-balderin',
    title: 'Return to Balderin Palace',
    tag: 'Opening scene',
    presetId: 'return-balderin',
    player: 'Princess Marithra is alive. The road back to Balderin now feels like the start of a claim.',
    gm: 'Open with travel tension, Marithra’s fragile state, Edwin/Corvin fallout, Vaelis changed by Akara, and Azrael carrying Corova’s responsibility.',
    checks: ['Use this beat to settle the table and remind them why Balderin matters.', 'Keep Akara and Corova visible through whispers, feathers, scarab marks, and uneasy dreams.'],
  },
  {
    id: 'palace-gate-bandits',
    title: 'Bandits at the Palace Gate',
    tag: 'Encounter beat',
    presetId: 'palace-gate-bandits',
    player: 'The ruined palace should be empty, but armed strangers are guarding the front.',
    gm: 'They were paid to keep people out. They are hired muscle, not true believers. Let the party overhear enough to know someone wants Balderin sealed.',
    checks: ['Perception DC 13: they are being paid to guard the entrance.', 'Perception DC 16: orders are to rough people up and kill persistent intruders.', 'Persuasion/Intimidation DC 15: clue toward middleman or contract mark.'],
  },
  {
    id: 'queens-chair',
    title: 'The Queen’s Chair',
    tag: 'Clue object',
    presetId: 'queens-chair',
    player: 'An ornate royal chair sits outside the palace, dragged from somewhere important.',
    gm: 'The chair is out of place. Let them notice drag marks and hidden craftwork before the compartment is found.',
    checks: ['Investigation DC 13: drag scratches show it was moved from inside.', 'Investigation DC 15: hidden compartment.', 'History DC 12: royal furniture from the old throne room.'],
  },
  {
    id: 'queens-chair-riddle',
    title: 'Queen’s Chair Riddle',
    tag: 'Player handout',
    presetId: 'queens-chair-riddle',
    player: 'I have no tongue, yet keep every voice. I have no crown, yet counsel every king. I do not march, yet wars are won through me. Find me where silence teaches the dead to speak.',
    gm: 'Answer: Library. Give them the riddle on the second screen and let them chew on it. Avoid over-helping unless pace stalls.',
    checks: ['Answer: Library.', 'Nudge options: old records, silence, dead voices, counsel every king.'],
  },
  {
    id: 'library-puzzle',
    title: 'Library Puzzle',
    tag: 'Puzzle beat',
    presetId: 'library-puzzle',
    player: 'Before the crown can rise, the city must remember: first the land, then the names, then the promise.',
    gm: 'Order is Map → Council → Oath. Optional fourth object: Crown last. Failure should warn, not punish.',
    checks: ['Three-object answer: Map → Council → Oath.', 'Four-object answer: Map → Council → Oath → Crown.', 'Failure: teal/royal light, dust burst, “Balderin remembers.”'],
  },
  {
    id: 'war-room-reveal',
    title: 'Hidden War Room',
    tag: 'Major reveal',
    presetId: 'war-room-reveal',
    player: 'Behind the library wall lies a room of maps, letters, council names, and unfinished plans.',
    gm: 'This is where the campaign pivots. Marithra needs former council members and proof before the Court of Crowns.',
    checks: ['Reveal legal argument: Balderin cannot be declared dead while the heir lives.', 'Reveal mission: find former council members.', 'Seed Neremore or another faction as opposition.'],
  },
  {
    id: 'lucian-grey-awakens',
    title: 'Lucian Grey Awakens',
    tag: 'NPC reveal',
    presetId: 'lucian-grey-awakens',
    player: 'Stone cracks. Dust falls. Lucian Grey inhales and asks if the princess lives.',
    gm: 'Player-facing: loyal adviser and survivor. GM-only: secretly a vampire with world-conquering ambition. Do not reveal the vampire truth yet.',
    checks: ['Full name restores him to life.', 'First lie: royal protection magic kept him preserved.', 'Immediate hook: he wants the council found.'],
  },
  {
    id: 'find-council',
    title: 'Find the Former Council',
    tag: 'New objective',
    presetId: 'find-council',
    player: 'Balderin cannot stand on bloodline alone. Marithra needs witnesses, councillors, records, and proof.',
    gm: 'End with direction. This becomes the backbone of the next arc and sets up the Court of Crowns.',
    checks: ['Council types: loyalist, coward, bought vote, broken witness, dead seat, traitor.', 'Next GM build: council tracker with locations and vote status.'],
  },
  {
    id: 'cliffhanger-vote',
    title: 'Do Not Trust the Vote',
    tag: 'Cliffhanger',
    presetId: 'cliffhanger-vote',
    player: 'The War Room wakes. Somewhere beneath the palace, something answers the sound of his name.',
    gm: 'End on Lucian’s warning or kneel. “Do not trust the vote” points straight at Court of Crowns without explaining too much.',
    checks: ['Option A: “Find the council.”', 'Option B: “Do not trust the vote.”', 'Option C: Lucian sees Marithra and kneels.'],
  },
];

function storageKey(campaignId) { return `rqk.tiaKarta.fridayRunner.${campaignId || 'campaign'}`; }
function findPreset(id) { return tiaKartaSecondScreenPresets.find(item => item.id === id); }

export default function TiaKartaFridaySessionRunner({ campaignId }) {
  const [openStep, setOpenStep] = useState(RUN_STEPS[0].id);
  const [done, setDone] = useState({});

  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(storageKey(campaignId)) || '{}')); } catch { setDone({}); }
  }, [campaignId]);

  useEffect(() => {
    try { localStorage.setItem(storageKey(campaignId), JSON.stringify(done)); } catch { /* ignore */ }
  }, [campaignId, done]);

  const doneCount = useMemo(() => RUN_STEPS.filter(step => done[step.id]).length, [done]);
  const nextStep = RUN_STEPS.find(step => !done[step.id]) || RUN_STEPS[RUN_STEPS.length - 1];

  const toggleDone = (id) => setDone(prev => ({ ...prev, [id]: !prev[id] }));
  const resetRunner = () => setDone({});

  const sendStep = async (step) => {
    const preset = findPreset(step.presetId);
    const payload = preset ? { eyebrow: preset.eyebrow, title: preset.title, subtitle: preset.subtitle } : { eyebrow: step.tag, title: step.title, subtitle: step.player };
    await publishCampaignDisplayState(campaignId, createDisplayState('title', { display_target: 'standing-tv', ...payload }));
    toast.success('Sent to second screen', { description: step.title });
  };

  const copyStep = async (step) => {
    const text = [step.title, step.tag, '', `Player-facing:\n${step.player}`, '', `GM notes:\n${step.gm}`, '', `Checks / beats:\n- ${step.checks.join('\n- ')}`].join('\n');
    try { await navigator.clipboard.writeText(text); toast.success(`${step.title} copied`); } catch { toast.info('Copy failed on this device.'); }
  };

  return (
    <section style={panelStyle} data-testid="tia-karta-friday-session-runner">
      <header style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}><Sparkles size={13} /> Friday Session Runner</p>
          <h3 style={titleStyle}>Return to Balderin Palace</h3>
          <p style={helperStyle}>A compact run sheet for the table: scene order, GM notes, DCs, player-safe reveal text, and second-screen buttons.</p>
        </div>
        <div style={progressStyle}>
          <strong>{doneCount}/{RUN_STEPS.length}</strong>
          <span>Next: {nextStep.title}</span>
        </div>
      </header>

      <div style={topActionsStyle}>
        <button type="button" onClick={() => sendStep(nextStep)} style={primaryButtonStyle}><Play size={14} /> Send Next Reveal</button>
        <button type="button" onClick={() => setOpenStep(nextStep.id)} style={secondaryButtonStyle}><Clipboard size={14} /> Open Next</button>
        <button type="button" onClick={resetRunner} style={secondaryButtonStyle}><RotateCcw size={14} /> Reset Done</button>
      </div>

      <div style={gridStyle}>
        {RUN_STEPS.map((step, index) => {
          const isOpen = openStep === step.id;
          const isDone = Boolean(done[step.id]);
          return (
            <article key={step.id} className="tia-runner-card" data-open={isOpen ? 'true' : 'false'} style={cardStyle(isDone)}>
              <button type="button" onClick={() => setOpenStep(isOpen ? '' : step.id)} style={toggleStyle} aria-expanded={isOpen ? 'true' : 'false'}>
                <span style={numberStyle(isDone)}>{isDone ? <CheckCircle2 size={15} /> : index + 1}</span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <strong style={cardTitleStyle}>{step.title}</strong>
                  <span style={tagStyle}>{step.tag}</span>
                </span>
                {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>

              {isOpen && (
                <div style={detailsStyle}>
                  <p style={playerStyle}><strong>Player-facing:</strong> {step.player}</p>
                  <p style={gmStyle}><strong>GM-only:</strong> {step.gm}</p>
                  <div style={checksStyle}>
                    <strong>Checks / beats</strong>
                    <ul>{step.checks.map(check => <li key={check}>{check}</li>)}</ul>
                  </div>
                  <div style={actionsStyle}>
                    <button type="button" onClick={() => sendStep(step)} style={primaryButtonStyle}><Monitor size={14} /> Second Screen</button>
                    <button type="button" onClick={() => copyStep(step)} style={secondaryButtonStyle}><Copy size={14} /> Copy</button>
                    <button type="button" onClick={() => toggleDone(step.id)} style={doneButtonStyle(isDone)}><CheckCircle2 size={14} /> {isDone ? 'Done' : 'Mark Done'}</button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

const panelStyle = { display: 'grid', gap: 12, padding: 14, marginBottom: 16, background: rq.panel, border: `1px solid ${rq.line}`, color: rq.text, borderRadius: 18 };
const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' };
const eyebrowStyle = { margin: '0 0 6px', color: rq.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 };
const titleStyle = { margin: 0, color: rq.text, fontSize: 'clamp(22px, 4vw, 34px)', lineHeight: 1.05, fontWeight: 950 };
const helperStyle = { margin: '7px 0 0', color: rq.soft, fontSize: 13, lineHeight: 1.45, maxWidth: 860 };
const progressStyle = { minWidth: 190, display: 'grid', gap: 3, background: rq.card2, border: `1px solid ${rq.line}`, padding: 10, color: rq.soft, fontSize: 12 };
const topActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 };
const cardStyle = (done) => ({ display: 'grid', gap: 0, background: done ? 'rgba(52,211,153,0.12)' : rq.card, border: `1px solid ${done ? 'rgba(52,211,153,0.42)' : rq.line}`, borderRadius: 16, overflow: 'hidden', minWidth: 0 });
const toggleStyle = { minHeight: 76, width: '100%', border: 0, background: 'transparent', color: rq.text, display: 'flex', alignItems: 'center', gap: 10, padding: 12, textAlign: 'left', cursor: 'pointer' };
const numberStyle = (done) => ({ width: 34, height: 34, flex: '0 0 auto', display: 'grid', placeItems: 'center', border: `1px solid ${done ? 'rgba(52,211,153,0.5)' : rq.line}`, background: done ? 'rgba(52,211,153,0.16)' : rq.card2, color: done ? rq.good : rq.text, fontWeight: 950 });
const cardTitleStyle = { display: 'block', color: rq.text, fontSize: 14, fontWeight: 950, lineHeight: 1.2 };
const tagStyle = { display: 'block', marginTop: 3, color: rq.muted, fontSize: 10, fontWeight: 950, letterSpacing: '0.08em', textTransform: 'uppercase' };
const detailsStyle = { display: 'grid', gap: 9, padding: '0 12px 12px', borderTop: `1px solid ${rq.line}` };
const playerStyle = { margin: 0, color: rq.soft, fontSize: 13, lineHeight: 1.45 };
const gmStyle = { margin: 0, color: '#fde68a', fontSize: 13, lineHeight: 1.45 };
const checksStyle = { display: 'grid', gap: 4, color: rq.soft, fontSize: 12, lineHeight: 1.45 };
const actionsStyle = { display: 'flex', gap: 7, flexWrap: 'wrap' };
const primaryButtonStyle = { minHeight: 34, border: 0, background: 'linear-gradient(135deg, #ff4fd8, #ff8a3d)', color: '#190717', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 950, cursor: 'pointer' };
const secondaryButtonStyle = { minHeight: 34, border: `1px solid ${rq.line}`, background: rq.card2, color: rq.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer' };
const doneButtonStyle = (done) => ({ minHeight: 34, border: `1px solid ${done ? 'rgba(52,211,153,0.54)' : rq.line}`, background: done ? 'rgba(52,211,153,0.16)' : rq.card2, color: done ? rq.good : rq.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer' });
