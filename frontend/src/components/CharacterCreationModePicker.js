import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Baby,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  HelpCircle,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';

const modes = [
  {
    key: 'full',
    title: 'Full Creation',
    eyebrow: 'Detailed builder',
    icon: Wand2,
    route: '/characters/new/full',
    time: '12–20 mins',
    badge: 'Full control',
    decision: 'Use the workshop path when you want to control every major character choice.',
    description: 'Step through class, species, background, ability scores, skills, spells, gear, personality, and final review with the most detail.',
    usefulFor: 'Players who know the rules or want a fully custom sheet.',
    includes: ['Step-by-step choices', 'Spells and gear', 'Final review'],
  },
  {
    key: 'basic',
    title: 'Basic Build',
    eyebrow: 'Guided builder',
    icon: Zap,
    route: '/characters/new/basic',
    time: '5–8 mins',
    badge: 'Guided sheet',
    decision: 'Choose the main ideas while ROOK fills the starter sheet around them.',
    description: 'Pick name, edition, level, class, species, background, defence loadout, and class skills. ROOK fills HP, AC, traits, languages, and starter details.',
    usefulFor: 'Players who want a proper character quickly without every advanced choice.',
    includes: ['Core choices', 'HP and AC preview', 'Editable after creation'],
  },
  {
    key: 'premade',
    title: 'Premade Characters',
    eyebrow: 'Instant characters',
    icon: Users,
    route: '/characters/new/premade',
    time: '1–3 mins',
    badge: 'Pick a hero',
    decision: 'Choose a ready-made hero card and start quickly.',
    description: 'Browse prebuilt characters by class, role, and difficulty, then rename or lightly customise before saving to your table.',
    usefulFor: 'One-shots, guest players, clubs, schools, and quick table entry.',
    includes: ['Hero cards', 'Role tags', 'Fast save'],
  },
  {
    key: 'kids',
    title: 'Kids Mode',
    eyebrow: 'Simple hero builder',
    icon: Baby,
    route: '/characters/new/kids',
    time: '2–4 mins',
    badge: 'Big choices',
    decision: 'Build a hero with simpler words, bigger choices, and fewer rules on screen.',
    description: 'Choose hero style, look, background, strengths, and gear using friendly labels while the real sheet is created in the background.',
    usefulFor: 'Younger players, family tables, school clubs, and brand-new roleplay.',
    includes: ['Plain-English choices', 'Big buttons', 'Low rules pressure'],
  },
];

const quickGuide = [
  { label: 'Full Creation', value: 'Detailed workshop', copy: 'Full step-by-step control for custom characters.' },
  { label: 'Basic Build', value: 'Guided setup', copy: 'Main choices with ROOK filling the starter sheet.' },
  { label: 'Premades', value: 'Instant hero', copy: 'Pick a ready character and play quickly.' },
  { label: 'Kids Mode', value: 'Simple hero', copy: 'Big friendly choices with fewer rules showing.' },
];

export default function CharacterCreationModePicker() {
  const navigate = useNavigate();

  return (
    <main className="character-mode-page">
      <style>{pageCss}</style>
      <div className="character-mode-shell">
        <button onClick={() => navigate('/home')} data-testid="mode-picker-back" className="character-mode-back">
          <ChevronLeft size={17} /> Dashboard
        </button>

        <section className="character-mode-hero">
          <div className="character-mode-hero-copy">
            <div className="character-mode-kicker"><Sparkles size={16} /> New Character</div>
            <h1>Choose the builder that fits your table.</h1>
            <p>Every route creates a saved character sheet. The difference is how much detail, speed, and rules language you want during creation.</p>
          </div>

          <aside className="character-mode-tip" data-testid="mode-picker-help-card">
            <div className="character-mode-tip-icon"><HelpCircle size={20} /></div>
            <div>
              <h2>Four clear routes</h2>
              <p>Full Creation is the detailed workshop. Basic Build is guided. Premades are instant hero cards. Kids Mode keeps the language simple.</p>
            </div>
          </aside>
        </section>

        <section className="character-mode-guide" data-testid="mode-picker-quick-guide" aria-label="Character creation mode guide">
          {quickGuide.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.copy}</p>
            </div>
          ))}
        </section>

        <section className="character-mode-grid" aria-label="Character creation modes">
          {modes.map((mode) => <ModeCard key={mode.key} mode={mode} onChoose={() => navigate(mode.route)} />)}
        </section>

        <section className="character-mode-flow" data-testid="mode-picker-flow">
          <Info icon={SlidersHorizontal} title="Different layouts, same sheet" text="Each builder can feel different while still creating the same kind of saved character record." />
          <Info icon={ShieldCheck} title="Playable outputs" text="Every route should leave the player with HP, AC, skills, equipment, features, and edit access." />
          <Info icon={Clock} title="Edit later" text="Choose the route that suits the session now, then polish the details from the character sheet later." />
        </section>

        <section className="character-mode-summary" data-testid="mode-picker-summary">
          <div><ShieldCheck size={18} /><span>All modes create a usable saved character sheet.</span></div>
          <div><Crown size={18} /><span>Each mode has its own purpose, not just fewer fields.</span></div>
          <div><Clock size={18} /><span>Need speed? Premade and Basic are the quickest routes.</span></div>
        </section>
      </div>
    </main>
  );
}

function Info({ icon: Icon, title, text }) {
  return (
    <div>
      <Icon size={18} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function ModeCard({ mode, onChoose }) {
  const Icon = mode.icon;
  return (
    <button type="button" data-testid={`mode-${mode.key}`} onClick={onChoose} className="character-mode-card">
      <div className="character-mode-card-topline"><span>{mode.eyebrow}</span><em>{mode.badge}</em></div>
      <div className="character-mode-card-header">
        <div className="character-mode-icon-box"><Icon size={22} /></div>
        <div><h2>{mode.title}</h2><div className="character-mode-time"><Clock size={13} /> {mode.time}</div></div>
      </div>
      <div className="character-mode-decision">{mode.decision}</div>
      <p className="character-mode-description">{mode.description}</p>
      <div className="character-mode-best-for"><strong>Useful for:</strong> {mode.usefulFor}</div>
      <ul className="character-mode-includes">{mode.includes.map((item) => <li key={item}>{item}</li>)}</ul>
      <div className="character-mode-choose"><span>Choose this mode</span><ChevronRight size={18} /></div>
    </button>
  );
}

const pageCss = `
.character-mode-page{--rq-bg:#120C08;--rq-surface:#21150E;--rq-card:#2E1D13;--rq-raised:#3A2619;--rq-gold:#C08A3D;--rq-gold-hover:#E0B15C;--rq-copper:#A45A32;--rq-text:#F5E6C8;--rq-muted:#CDBA98;--rq-border:rgba(192,138,61,.22);min-height:100dvh;overflow-y:auto;background:radial-gradient(circle at top left,rgba(224,177,92,.14),transparent 32%),radial-gradient(circle at top right,rgba(164,90,50,.18),transparent 34%),linear-gradient(180deg,var(--rq-bg),var(--rq-surface));color:var(--rq-text);font-family:var(--font-sans);padding:clamp(12px,2vh,20px) 18px clamp(18px,3vh,28px)}
.character-mode-shell{width:min(1240px,100%);margin:0 auto}.character-mode-back{display:inline-flex;align-items:center;gap:7px;background:rgba(46,29,19,.78);border:1px solid var(--rq-border);color:var(--rq-muted);cursor:pointer;font-size:13px;font-weight:800;margin-bottom:10px;padding:7px 10px;border-radius:8px;text-transform:uppercase;letter-spacing:.6px}.character-mode-back:hover{border-color:rgba(224,177,92,.58);color:var(--rq-text);background:rgba(192,138,61,.12)}
.character-mode-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,340px);gap:12px;align-items:stretch;margin-bottom:12px}.character-mode-hero-copy,.character-mode-tip,.character-mode-summary,.character-mode-guide{background:rgba(33,21,14,.95);border:1px solid var(--rq-border);box-shadow:0 22px 56px rgba(0,0,0,.48);border-radius:10px}.character-mode-hero-copy{padding:clamp(14px,2vh,18px) 18px}.character-mode-kicker{display:inline-flex;align-items:center;gap:8px;color:var(--rq-gold-hover);font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}.character-mode-hero h1{margin:0;color:var(--rq-text);font-size:clamp(26px,3.6vw,40px);line-height:1;font-weight:900;letter-spacing:-1.4px}.character-mode-hero p{color:var(--rq-muted);margin:9px 0 0;max-width:760px;font-size:13px;line-height:1.45}
.character-mode-tip{background:linear-gradient(135deg,rgba(192,138,61,.12),rgba(164,90,50,.15));border-color:rgba(224,177,92,.3);padding:14px;display:flex;gap:14px;align-items:flex-start}.character-mode-tip-icon{width:38px;height:38px;border:1px solid rgba(192,138,61,.46);color:var(--rq-gold-hover);display:flex;align-items:center;justify-content:center;flex:0 0 auto}.character-mode-tip h2{margin:0 0 6px;font-size:16px;font-weight:900;color:var(--rq-text)}.character-mode-tip p{margin:0;color:var(--rq-muted);font-size:12px;line-height:1.45}
.character-mode-guide{margin-bottom:12px;padding:10px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.character-mode-guide div{border:1px solid rgba(192,138,61,.24);background:rgba(46,29,19,.72);border-radius:9px;padding:10px 11px}.character-mode-guide span{display:block;color:var(--rq-muted);font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}.character-mode-guide strong{display:block;color:var(--rq-gold-hover);font-size:14px;font-weight:900}.character-mode-guide p{margin:4px 0 0;color:var(--rq-muted);font-size:11px;line-height:1.35}
.character-mode-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.character-mode-card{appearance:none;-webkit-appearance:none;border:1px solid var(--rq-border);background:var(--rq-card);color:var(--rq-text);border-radius:10px;padding:13px;text-align:left;cursor:pointer;min-height:285px;display:flex;flex-direction:column;gap:9px;transition:transform 160ms ease,border-color 160ms ease,background 160ms ease,box-shadow 160ms ease;box-shadow:0 20px 52px rgba(0,0,0,.36)}.character-mode-card:hover{transform:translateY(-3px);border-color:rgba(224,177,92,.7);background:var(--rq-raised);box-shadow:0 22px 52px rgba(192,138,61,.16)}
.character-mode-card-topline,.character-mode-card-header,.character-mode-choose,.character-mode-summary div{display:flex;align-items:center}.character-mode-card-topline,.character-mode-choose{justify-content:space-between;gap:8px}.character-mode-card-topline span{color:var(--rq-muted);font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.9px}.character-mode-card-topline em{color:var(--rq-text);border:1px solid rgba(192,138,61,.3);background:rgba(192,138,61,.1);padding:4px 7px;border-radius:999px;font-style:normal;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.6px}.character-mode-card-header{gap:12px}.character-mode-icon-box{width:40px;height:40px;border:1px solid rgba(224,177,92,.34);color:var(--rq-gold-hover);display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:linear-gradient(135deg,rgba(192,138,61,.24),rgba(164,90,50,.25))}.character-mode-card h2{margin:0;color:var(--rq-text);font-size:17px;font-weight:900;letter-spacing:-.4px}.character-mode-time{margin-top:3px;display:inline-flex;align-items:center;gap:5px;color:var(--rq-muted);font-size:12px;font-weight:800}.character-mode-decision{border:1px solid rgba(192,138,61,.34);background:linear-gradient(135deg,rgba(192,138,61,.12),rgba(164,90,50,.14));color:var(--rq-text);padding:7px 9px;border-radius:8px;font-size:11px;line-height:1.35;font-weight:900}.character-mode-description,.character-mode-best-for,.character-mode-includes{color:var(--rq-muted);font-size:11px;line-height:1.4}.character-mode-description{margin:0;font-size:12px}.character-mode-best-for{border:1px solid rgba(192,138,61,.18);background:rgba(0,0,0,.14);padding:8px 9px}.character-mode-includes{margin:0;padding-left:16px}.character-mode-choose{margin-top:auto;border-top:1px solid rgba(192,138,61,.18);padding-top:9px;color:var(--rq-gold-hover);font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.8px}
.character-mode-flow{margin-top:10px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.character-mode-flow div{background:rgba(33,21,14,.82);border:1px solid rgba(164,90,50,.28);border-radius:10px;padding:10px 11px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:3px 9px;align-items:start}.character-mode-flow svg{color:var(--rq-gold-hover);grid-row:span 2;margin-top:2px}.character-mode-flow strong{color:var(--rq-text);font-size:12px;letter-spacing:.03em;text-transform:uppercase}.character-mode-flow span{color:var(--rq-muted);font-size:11px;line-height:1.35}.character-mode-summary{margin-top:10px;padding:10px 12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.character-mode-summary div{gap:9px;color:var(--rq-muted);font-size:12px;font-weight:800;line-height:1.35}.character-mode-summary svg{color:var(--rq-gold-hover);flex:0 0 auto}
@media(max-height:760px) and (min-width:900px){.character-mode-tip{display:none}.character-mode-hero{grid-template-columns:1fr}.character-mode-summary{display:none}}@media(max-width:1100px){.character-mode-grid,.character-mode-guide{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:820px){.character-mode-hero,.character-mode-flow,.character-mode-guide{grid-template-columns:1fr}}@media(max-width:560px){.character-mode-grid{grid-template-columns:1fr}}
`;
