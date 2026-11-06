import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Dices, FileText, Mail, Map, Swords, UserCircle, Users } from 'lucide-react';
import LiveEncounterLauncher from './LiveEncounterLauncher';
import { nextPreparedEncounterId } from './encounterSelection';
import LiveToolRail, { LiveToolMenuButton } from './LiveToolRail';
import {
  allLiveToolIds,
  categoryForTool,
  findLiveTool,
  initialExpandedCategories,
  liveToolLabel,
} from './liveToolRegistry';
import { currentCombatAccount, readCombatCheckpoint } from '@/components/combat/combatCheckpoint';
import { useDeviceLayout } from '@/layouts/deviceLayout';
import './LiveSessionGridMode.css';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const rq = {
  bg: 'var(--rq-bg-main)', panel: 'var(--rq-bg-panel)', card: 'var(--rq-card)', hover: 'var(--rq-card-hover)',
  pink: 'var(--rq-accent-primary)', blue: 'var(--rq-secondary)', red: 'var(--rq-accent-primary)',
  text: 'var(--rq-text-primary)', soft: 'var(--rq-text-primary)', muted: 'var(--rq-text-primary)', line: 'var(--rq-border-default)',
};

export const LIVE_GRID_DEFAULTS = ['overview', 'story', 'combat', 'notes'];
const LIVE_TOOL_IDS = new Set(allLiveToolIds());

function readStoredTool(storageKey, fallback = 'overview') {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (LIVE_TOOL_IDS.has(parsed.activeTool)) return parsed.activeTool;
  } catch { /* ignore */ }
  return fallback;
}

function readRecentTools(recentKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(recentKey) || '[]');
    return Array.isArray(saved) ? saved.filter(id => LIVE_TOOL_IDS.has(id)).slice(0, 4) : [];
  } catch { return []; }
}

function readExpandedCategories(categoryKey, activeTool) {
  let remembered = [];
  try { remembered = JSON.parse(localStorage.getItem(categoryKey) || '[]'); } catch { /* ignore */ }
  return initialExpandedCategories(activeTool, remembered);
}

function initialToolForCampaign(campaignId, storageKey, fallback = 'overview') {
  try {
    if (localStorage.getItem(`gm.questEncounter.${campaignId}`)) return 'combat';
  } catch { /* ignore */ }
  return readStoredTool(storageKey, fallback);
}

export default function LiveSessionGridMode({ campaignId, renderTool, onOpenSingleTab, onRollDice, onResumeCombat, refreshKey = 0, scenarios = [], players = [] }) {
  const storageKey = `gm.liveMode.focus.${campaignId || 'default'}`;
  const recentKey = `gm.liveMode.recent.${campaignId || 'default'}`;
  const categoryKey = `gm.liveMode.categories.${campaignId || 'default'}`;
  const initialTool = initialToolForCampaign(campaignId, storageKey);
  const [stateCampaignId, setStateCampaignId] = useState(campaignId);
  const [activeTool, setActiveTool] = useState(initialTool);
  const [recentTools, setRecentTools] = useState(() => readRecentTools(recentKey));
  const [expandedCategories, setExpandedCategories] = useState(() => (
    readExpandedCategories(categoryKey, initialTool)
  ));
  const [toolFilter, setToolFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authScopeVersion, setAuthScopeVersion] = useState(0);
  const [encounterRequest, setEncounterRequest] = useState({
    campaignId: '', id: '', reopenLast: false, nonce: 0,
  });

  // React can retain this component while the route changes campaigns. Load
  // the new campaign's own navigation state before any persistence effect is
  // allowed to write, so campaign A never seeds campaign B's preferences.
  useEffect(() => {
    if (stateCampaignId === campaignId) return;
    const nextTool = initialToolForCampaign(campaignId, storageKey, activeTool);
    setActiveTool(nextTool);
    setRecentTools(readRecentTools(recentKey));
    setExpandedCategories(readExpandedCategories(categoryKey, nextTool));
    setToolFilter('');
    setDrawerOpen(false);
    setEncounterRequest(previous => ({
      campaignId: '', id: '', reopenLast: false, nonce: previous.nonce + 1,
    }));
    setStateCampaignId(campaignId);
  }, [activeTool, campaignId, categoryKey, recentKey, stateCampaignId, storageKey]);

  useEffect(() => {
    if (stateCampaignId !== campaignId) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ activeTool })); } catch { /* ignore */ }
  }, [activeTool, campaignId, stateCampaignId, storageKey]);

  useEffect(() => {
    if (stateCampaignId !== campaignId) return;
    try { localStorage.setItem(recentKey, JSON.stringify(recentTools)); } catch { /* ignore */ }
  }, [campaignId, recentKey, recentTools, stateCampaignId]);

  useEffect(() => {
    const refreshAccountScope = () => setAuthScopeVersion(version => version + 1);
    window.addEventListener('rqk:auth-scope-changed', refreshAccountScope);
    window.addEventListener('storage', refreshAccountScope);
    return () => {
      window.removeEventListener('rqk:auth-scope-changed', refreshAccountScope);
      window.removeEventListener('storage', refreshAccountScope);
    };
  }, []);

  // What the GM asked to open, handed over explicitly rather than left for
  // Encounter Review to guess at again. Held here, not in the tool, because
  // the tool body is keyed on activeTool and remounts on every switch.
  useEffect(() => {
    if (stateCampaignId !== campaignId) return;
    try { localStorage.setItem(categoryKey, JSON.stringify(expandedCategories)); } catch { /* ignore */ }
  }, [campaignId, categoryKey, expandedCategories, stateCampaignId]);

  // The account-owned checkpoint reader is the single authority. A corrupt,
  // cross-campaign, legacy-unverified, or other account's fight must never be
  // advertised as resumable from this menu.
  const unfinishedCombat = useMemo(() => {
    const accountId = currentCombatAccount();
    return readCombatCheckpoint(campaignId, undefined, { accountId }).status === 'ok';
  }, [authScopeVersion, campaignId, refreshKey]);

  const toggleCategory = categoryId => setExpandedCategories(previous => (
    previous.includes(categoryId)
      ? previous.filter(id => id !== categoryId)
      : [...previous, categoryId]
  ));

  const selectTool = (toolId, options = {}) => {
    setActiveTool(toolId);
    if (toolId !== 'overview') {
      setRecentTools(prev => [toolId, ...prev.filter(id => id !== toolId)].slice(0, 4));
    }
    // Keep the group holding the chosen tool open, so the active item is
    // visible in the rail rather than hidden inside a collapsed heading.
    const category = categoryForTool(toolId);
    if (category) {
      setExpandedCategories(previous => (
        previous.includes(category.id) ? previous : [...previous, category.id]
      ));
    }
    if (toolId === 'combat') {
      // The nonce lets Review tell "asked again for the same encounter" from
      // "nothing new was asked", without the request becoming sticky.
      setEncounterRequest(previous => ({
        campaignId,
        id: String(options.encounterId || ''),
        reopenLast: Boolean(options.reopenLast),
        nonce: previous.nonce + 1,
      }));
    }
    onOpenSingleTab?.(toolId);
  };

  const device = useDeviceLayout();
  const variant = device === 'mobile' ? 'phone' : device === 'tablet' ? 'tablet' : 'desktop';
  const isPhone = variant === 'phone';
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);

  const rail = (
    <LiveToolRail
      activeTool={activeTool}
      onSelect={selectTool}
      expanded={expandedCategories}
      onToggleCategory={toggleCategory}
      filter={toolFilter}
      onFilterChange={setToolFilter}
      canResumeCombat={unfinishedCombat}
      onResumeCombat={() => onResumeCombat?.()}
      variant={variant}
      onRequestClose={closeDrawer}
    />
  );

  return (
    <div
      data-testid="live-session-grid"
      className={`rqk-live-grid rqk-live-grid--${variant}`}
      data-rq-live-variant={variant}
      style={shellStyle}
    >
      {isPhone ? (
        <div className="rqk-live-grid__phone-bar">
          <LiveToolMenuButton onOpen={openDrawer} activeTool={activeTool} open={drawerOpen} />
        </div>
      ) : rail}

      {isPhone && drawerOpen && (
        <>
          <button
            type="button"
            className="rqk-tool-rail__scrim"
            aria-label="Close tools menu"
            data-testid="live-tool-rail-scrim"
            onClick={closeDrawer}
          />
          {rail}
        </>
      )}

      <main className="rqk-live-grid__main" style={mainStyle} key={`${refreshKey}-${activeTool}`}>
        {activeTool !== 'overview' && (
          <header className="rqk-live-grid__tool-header" style={toolHeaderStyle}>
            <div style={toolTitleStyle}><strong>{liveToolLabel(activeTool)}</strong></div>
            <span className="rqk-live-grid__live-pill" style={livePillStyle}>Live Play</span>
          </header>
        )}
        <section className="rqk-live-grid__tool-body" style={toolBodyStyle}>
          {activeTool === 'overview' ? (
            <RunScreen campaignId={campaignId} recentTools={recentTools} onSelect={selectTool} scenarios={scenarios} players={players} />
          ) : activeTool === 'combat' ? (
            <LiveEncounterLauncher
              campaignId={campaignId}
              requestedEncounterId={encounterRequest.campaignId === campaignId ? encounterRequest.id : ''}
              requestedEncounterCampaignId={encounterRequest.campaignId}
              reopenLastEncounter={encounterRequest.campaignId === campaignId && encounterRequest.reopenLast}
              encounterRequestNonce={encounterRequest.nonce}
            />
          ) : activeTool === 'quick-dice' ? (
            <QuickDicePanel onRollDice={onRollDice} />
          ) : (
            renderTool?.(activeTool, {
               compact: false,
               // Explicit handoff: a hidden/closed phone drawer has no DOM button
               // that an unrelated tool can safely click to open an encounter.
               openEncounterReview: (encounterId = '') => selectTool('combat', { encounterId }),
             }) || <EmptyTool title={liveToolLabel(activeTool)} />
          )}
        </section>
      </main>
    </div>
  );
}

function RunScreen({ campaignId, recentTools, onSelect, scenarios = [], players = [] }) {
  const prepared = (Array.isArray(scenarios) ? scenarios : [])
    .filter(scenario => scenario.live_ready && !scenario.played && !scenario.legacy)
    .sort((a, b) => (a.planned_encounter_order ?? Infinity) - (b.planned_encounter_order ?? Infinity));
  // The same ranking Encounter Review uses. This was prepared[0], which took
  // no account of live_default, played, legacy or planned order, so Run could
  // name one encounter while Review opened another.
  const nextEncounterId = nextPreparedEncounterId(prepared);
  const nextEncounter = prepared.find(item => item.id === nextEncounterId) || null;
  const partyCount = Array.isArray(players) ? players.length : 0;
  const core = [
    { id: 'story', label: 'Quests', icon: BookOpen, detail: 'Open, tick off, continue' },
    { id: 'combat', label: 'Encounters', icon: Swords, detail: 'Run prepared combat' },
    { id: 'npcs', label: 'NPCs', icon: UserCircle, detail: 'Find people fast' },
    { id: 'notes', label: 'Quick Notes', icon: FileText, detail: 'Record what changed' },
  ];
  const recent = recentTools.map(findLiveTool).filter(Boolean);
  const continueItems = [];
  try {
    if (localStorage.getItem(`gm.liveQuestFocus.${campaignId}`)) {
      continueItems.push({ id: 'story', label: 'Continue focused quest', icon: BookOpen });
    }
    if (localStorage.getItem(`gm.lastEncounter.${campaignId}`)) {
      // Deliberately separate from "Review & run". Reopening the fight just
      // played is a real thing a GM wants; having it happen by itself is not.
      continueItems.push({
        id: 'combat',
        label: 'Reopen last encounter',
        icon: Swords,
        testId: 'run-reopen-last-encounter',
        options: { reopenLast: true },
      });
    }
  } catch { /* ignore */ }

  return (
    <div className="rqk-live-grid__run" style={runScreenStyle}>
      <header style={runHeaderStyle}>
        <p style={eyebrowStyle}>Live Play</p>
        <h2 style={runTitleStyle}>Your session, under control.</h2>
      </header>

      <section className="rqk-live-grid__session-brief" aria-label="Session at a glance">
        <div className="rqk-live-grid__brief-copy">
          <p className="rqk-live-grid__brief-eyebrow">Next at the table</p>
          <h3>{nextEncounter ? nextEncounter.name.replace(/\s*\(TONIGHT[^)]*\)/i, '').trim() : 'Ready when your players are'}</h3>
          <p>{nextEncounter
            ? 'Your saved combatants, enemy actions and encounter notes are in the encounter review.'
            : 'Open encounters to choose a prepared battle, or build one as the story unfolds.'}</p>
          <div className="rqk-live-grid__brief-stats">
            <span><Users size={14} /> {partyCount} {partyCount === 1 ? 'character' : 'characters'}</span>
            <span><Swords size={14} /> {prepared.length} {prepared.length === 1 ? 'prepared battle' : 'prepared battles'}</span>
          </div>
        </div>
        <button
          className="rqk-live-grid__brief-action"
          type="button"
          onClick={() => onSelect('combat', { encounterId: nextEncounterId })}
          data-testid="run-review-encounter"
        >
          <Swords size={18} /> {nextEncounter ? 'Review & run encounter' : 'Open encounters'} <ArrowRight size={16} />
        </button>
      </section>

      {continueItems.length > 0 && (
        <section className="rqk-live-grid__continue" style={continueStyle}>
          <p style={sectionLabelStyle}>Continue</p>
          <div style={continueRowStyle}>
            {continueItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onSelect(item.id, item.options || {})}
                  data-testid={item.testId}
                  style={continueButtonStyle}
                >
                  <Icon size={15} /> {item.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="rqk-live-grid__core-grid" style={coreGridStyle}>
        {core.map(item => {
          const Icon = item.icon;
          return <button key={item.id} type="button" onClick={() => onSelect(item.id)} className="rqk-live-grid__core-card" style={coreCardStyle}><Icon size={21} /><strong>{item.label}</strong><span>{item.detail}</span></button>;
        })}
      </section>

      {recent.length > 0 && (
        <section style={recentStyle}>
          <p style={sectionLabelStyle}>Recent</p>
          <div style={recentRowStyle}>{recent.map(tool => { const Icon = tool.icon; return <button key={tool.id} type="button" onClick={() => onSelect(tool.id)} style={recentButtonStyle}><Icon size={14} /> {tool.label}</button>; })}</div>
        </section>
      )}

      <section className="rqk-live-grid__quick-strip" style={quickStripStyle}>
        <button type="button" onClick={() => onSelect('quick-dice')} style={quickButtonStyle}><Dices size={15} /> Dice</button>
        <button type="button" onClick={() => onSelect('maps')} style={quickButtonStyle}><Map size={15} /> Maps</button>
        <button type="button" onClick={() => onSelect('handouts')} style={quickButtonStyle}><Mail size={15} /> Handouts</button>
        <button type="button" onClick={() => onSelect('reference-hub')} style={quickButtonStyle}><BookOpen size={15} /> Rules</button>
      </section>
    </div>
  );
}


function QuickDicePanel({ onRollDice }) {
  return (
    <div style={dicePanelStyle}>
      <h3 style={{ margin: 0, color: rq.text }}>Quick Dice</h3>
      <div className="rqk-live-grid__dice-grid" style={diceGridStyle}>
        {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(die => <button key={die} type="button" onClick={() => onRollDice?.(`1${die}`, die.toUpperCase())} style={diceButtonStyle}>{die.toUpperCase()}</button>)}
      </div>
    </div>
  );
}

function EmptyTool({ title }) {
  return <div style={emptyStyle}><strong>{title}</strong><span>This tool is available from Live Play.</span></div>;
}

const shellStyle = { display: 'grid', gap: 8, minWidth: 0, fontFamily: fontStack };
const mainStyle = { minWidth: 0, background: rq.panel, border: `1px solid ${rq.line}` };
const toolHeaderStyle = { minHeight: 48, padding: '0 11px', borderBottom: `1px solid ${rq.line}`, background: rq.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 };
const toolTitleStyle = { display: 'flex', alignItems: 'center', gap: 7, color: rq.text, fontSize: 15 };
const livePillStyle = { padding: '4px 7px', background: rq.bg, color: rq.muted, border: `1px solid ${rq.line}`, fontSize: 9, fontWeight: 950, letterSpacing: '0.08em', textTransform: 'uppercase' };
const toolBodyStyle = { padding: 8, minWidth: 0 };
const runScreenStyle = { display: 'grid', gap: 10 };
const runHeaderStyle = { padding: '10px 4px 3px' };
const eyebrowStyle = { margin: 0, color: rq.muted, fontSize: 10, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const runTitleStyle = { margin: '2px 0 0', color: rq.text, fontSize: 'clamp(24px, 4vw, 38px)', lineHeight: 1, fontWeight: 950 };
const continueStyle = { display: 'grid', gap: 5, padding: 8, background: rq.bg, border: `1px solid ${rq.line}`, borderLeft: `1px solid ${rq.pink}` };
const continueRowStyle = { display: 'flex', gap: 5, flexWrap: 'wrap' };
const continueButtonStyle = { minHeight: 34, border: `1px solid ${rq.pink}`, background: rq.card, color: rq.text, padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: fontStack, fontSize: 11, fontWeight: 950 };
const coreGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 7 };
const coreCardStyle = { minHeight: 104, border: `1px solid ${rq.line}`, borderLeft: `1px solid ${rq.pink}`, background: rq.card, color: rq.text, padding: 12, display: 'grid', justifyItems: 'start', alignContent: 'center', gap: 5, textAlign: 'left', cursor: 'pointer', fontFamily: fontStack };
const recentStyle = { display: 'grid', gap: 6, paddingTop: 2 };
const sectionLabelStyle = { margin: 0, color: rq.muted, fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.09em' };
const recentRowStyle = { display: 'flex', gap: 5, flexWrap: 'wrap' };
const recentButtonStyle = { minHeight: 31, border: `1px solid ${rq.line}`, background: rq.bg, color: rq.soft, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontFamily: fontStack, fontSize: 11, fontWeight: 850 };
const quickStripStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 5 };
const quickButtonStyle = { minWidth: 0, minHeight: 36, border: `1px solid ${rq.line}`, background: rq.bg, color: rq.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontWeight: 900, fontFamily: fontStack, fontSize: 11 };
const dicePanelStyle = { display: 'grid', gap: 10, padding: 6 };
const diceGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(72px, 1fr))', gap: 7 };
const diceButtonStyle = { minHeight: 52, border: `1px solid ${rq.line}`, background: rq.card, color: rq.text, cursor: 'pointer', fontSize: 14, fontWeight: 950 };
const emptyStyle = { minHeight: 150, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 5, color: rq.muted, textAlign: 'center' };
