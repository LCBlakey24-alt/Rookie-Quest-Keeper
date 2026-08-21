import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronRight, Circle, FileText, Gift, Map, MapPin, Pin, Search, SkipForward, Swords, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { persistLivePlayHandoff } from '@/lib/livePlayHandoffs';

const rq = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000', text: '#fff',
  soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)',
};
const OPEN = new Set(['draft', 'available', 'active']);
const safeArray = value => Array.isArray(value) ? value : [];
const EMPTY_RESOURCES = { encounters: [], npcs: [], locations: [], maps: [], handouts: [], rewards: [] };

const LINK_TYPES = [
  { key: 'linked_encounter_ids', resource: 'encounters', label: 'Encounters', icon: Swords, tool: 'combat', name: item => item.name },
  { key: 'linked_npc_ids', resource: 'npcs', label: 'NPCs', icon: UserCircle, tool: 'npcs', name: item => item.name },
  { key: 'linked_location_ids', resource: 'locations', label: 'Locations', icon: MapPin, tool: 'maps', name: item => item.name },
  { key: 'linked_map_ids', resource: 'maps', label: 'Maps', icon: Map, tool: 'maps', name: item => item.name },
  { key: 'linked_handout_ids', resource: 'handouts', label: 'Handouts', icon: FileText, tool: 'handouts', name: item => item.title || item.name },
  { key: 'linked_reward_ids', resource: 'rewards', label: 'Loot', icon: Gift, tool: 'loot', name: item => item.name },
];

function progress(quest) {
  const items = safeArray(quest.objectives);
  const completed = items.filter(item => item.status === 'completed').length;
  const skipped = items.filter(item => item.status === 'skipped').length;
  return { total: items.length, completed, skipped, resolved: completed + skipped };
}

function statusRank(status) {
  if (status === 'active') return 0;
  if (status === 'available') return 1;
  return 2;
}

function failureList(labels = []) {
  if (!labels.length) return '';
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

export default function LiveQuestRunnerV2({ campaignId }) {
  const storageKey = `gm.liveQuestFocus.${campaignId}`;
  const [quests, setQuests] = useState([]);
  const [resources, setResources] = useState(EMPTY_RESOURCES);
  const [loading, setLoading] = useState(true);
  const [questLoadFailed, setQuestLoadFailed] = useState(false);
  const [resourceWarning, setResourceWarning] = useState('');
  const [search, setSearch] = useState('');
  const [showResolved, setShowResolved] = useState({});
  const [expandedId, setExpandedId] = useState(() => {
    try { return localStorage.getItem(storageKey) || ''; } catch { return ''; }
  });

  useEffect(() => {
    if (!campaignId) return undefined;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setQuestLoadFailed(false);
      setResourceWarning('');
      try {
        const results = await Promise.allSettled([
          apiClient.get(`/campaigns/${campaignId}/quests`),
          apiClient.get(`/campaigns/${campaignId}/combat-scenarios`),
          apiClient.get(`/campaigns/${campaignId}/npcs`),
          apiClient.get(`/campaigns/${campaignId}/locations`),
          apiClient.get(`/campaigns/${campaignId}/maps`),
          apiClient.get(`/campaigns/${campaignId}/handouts`),
          apiClient.get(`/campaigns/${campaignId}/inventory`),
        ]);
        if (cancelled) return;

        const [questResult, encounterResult, npcResult, locationResult, mapResult, handoutResult, rewardResult] = results;
        if (questResult.status === 'fulfilled') {
          setQuests(safeArray(questResult.value?.data));
          setQuestLoadFailed(false);
        } else {
          setQuestLoadFailed(true);
          toast.error(questResult.reason?.response?.data?.detail || 'Could not load live quests');
        }

        const nextResources = {};
        const failedResources = [];
        const resourceResults = [
          ['encounters', 'encounters', encounterResult],
          ['npcs', 'NPCs', npcResult],
          ['locations', 'locations', locationResult],
          ['maps', 'maps', mapResult],
          ['handouts', 'handouts', handoutResult],
          ['rewards', 'loot', rewardResult],
        ];
        resourceResults.forEach(([key, label, result]) => {
          if (result.status === 'fulfilled') nextResources[key] = safeArray(result.value?.data);
          else failedResources.push(label);
        });
        setResources(prev => ({ ...prev, ...nextResources }));
        setResourceWarning(failedResources.length
          ? `Some linked quest data could not load: ${failureList(failedResources)}. Missing linked buttons may reappear after reconnecting.`
          : '');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setQuests([]);
    setResources(EMPTY_RESOURCES);
    setSearch('');
    setShowResolved({});
    load();
    return () => { cancelled = true; };
  }, [campaignId]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quests
      .filter(quest => OPEN.has(quest.status) && (!term || [quest.title, quest.summary, quest.hook].some(value => String(value || '').toLowerCase().includes(term))))
      .sort((a, b) => {
        if (a.id === expandedId && b.id !== expandedId) return -1;
        if (b.id === expandedId && a.id !== expandedId) return 1;
        if (Boolean(a.is_pinned) !== Boolean(b.is_pinned)) return a.is_pinned ? -1 : 1;
        const statusDifference = statusRank(a.status) - statusRank(b.status);
        if (statusDifference) return statusDifference;
        return String(a.title || '').localeCompare(String(b.title || ''));
      });
  }, [expandedId, quests, search]);

  const toggleQuest = questId => {
    const next = expandedId === questId ? '' : questId;
    setExpandedId(next);
    try { if (next) localStorage.setItem(storageKey, next); else localStorage.removeItem(storageKey); } catch { /* ignore */ }
  };

  const updateQuest = async (questId, patch) => {
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/quests/${questId}`, patch);
      setQuests(prev => prev.map(item => item.id === questId ? response.data : item));
      return response.data;
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update quest');
      return null;
    }
  };

  const setObjective = async (questId, objectiveId, status) => {
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/quests/${questId}/objectives/${objectiveId}`, { status });
      setQuests(prev => prev.map(item => item.id === questId ? response.data : item));
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update objective');
    }
  };

  const openTool = (type, itemId) => {
    if (type.key === 'linked_encounter_ids') {
      const stored = persistLivePlayHandoff(localStorage, `gm.questEncounter.${campaignId}`, itemId);
      if (!stored) {
        toast.error('Could not prepare the linked encounter. Stay on this quest and try again.');
        return false;
      }
    }
    const button = typeof document !== 'undefined' ? document.querySelector(`[data-testid="live-tool-${type.tool}"]`) : null;
    if (!button?.click) {
      toast.error(`Could not open ${type.label}.`);
      return false;
    }
    button.click();
    return true;
  };

  const completeQuest = async quest => {
    if (!window.confirm(`Mark “${quest.title}” complete?`)) return;
    const updated = await updateQuest(quest.id, { status: 'completed' });
    if (!updated) return;
    setExpandedId('');
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    toast.success(`${quest.title} completed`);
  };

  if (loading) return <div style={emptyStyle}>Loading quests…</div>;

  return (
    <div data-testid="live-quest-runner" style={shellStyle}>
      <label style={searchStyle}><Search size={14} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a quest" style={searchInputStyle} /></label>

      {questLoadFailed && (
        <div data-testid="live-quest-load-warning" role="status" style={warningStyle}><AlertTriangle size={14} /> Rookie could not load the quest list. Do not assume the campaign has no open quests.</div>
      )}
      {resourceWarning && (
        <div data-testid="live-quest-resource-warning" role="status" style={warningStyle}><AlertTriangle size={14} /> {resourceWarning}</div>
      )}

      {!visible.length && !questLoadFailed && <div style={emptyStyle}>No open quests.</div>}

      {visible.map(quest => {
        const p = progress(quest);
        const open = expandedId === quest.id;
        const objectives = safeArray(quest.objectives);
        const unresolved = objectives.filter(item => item.status !== 'completed' && item.status !== 'skipped');
        const resolved = objectives.filter(item => item.status === 'completed' || item.status === 'skipped');
        const showingResolved = Boolean(showResolved[quest.id]) || unresolved.length === 0;
        const shownObjectives = showingResolved ? objectives : unresolved;
        return (
          <article key={quest.id} style={questStyle}>
            <button type="button" onClick={() => toggleQuest(quest.id)} style={questHeaderStyle}>
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span style={{ minWidth: 0, display: 'grid', gap: 2, textAlign: 'left' }}>
                <strong style={questTitleStyle}>{quest.title}</strong>
                <span style={questMetaStyle}>{unresolved.length} left · {p.completed}/{p.total} complete · {quest.status}</span>
              </span>
              {quest.is_pinned && <Pin size={14} style={{ color: rq.red }} />}
            </button>

            {open && (
              <div style={questBodyStyle}>
                {quest.summary && <div style={summaryStyle}>{quest.summary}</div>}

                <section style={sectionStyle}>
                  <div style={sectionHeaderStyle}><strong>Objectives</strong><span>{unresolved.length} remaining</span></div>
                  <div style={objectiveListStyle}>
                    {shownObjectives.map(objective => (
                      <div key={objective.id} style={objectiveStyle(objective.status)}>
                        <button type="button" onClick={() => setObjective(quest.id, objective.id, objective.status === 'completed' ? 'upcoming' : 'completed')} style={checkButtonStyle} title={objective.status === 'completed' ? 'Mark unresolved' : 'Complete'}>
                          {objective.status === 'completed' ? <Check size={16} /> : objective.status === 'skipped' ? <SkipForward size={16} /> : <Circle size={16} />}
                        </button>
                        <span style={objectiveTextStyle(objective.status)}>{objective.title}</span>
                        {objective.linked_encounter_id ? (
                          <button type="button" onClick={() => openTool(LINK_TYPES[0], objective.linked_encounter_id)} style={runObjectiveStyle} title="Run linked encounter"><Swords size={13} /></button>
                        ) : (
                          <button type="button" onClick={() => setObjective(quest.id, objective.id, objective.status === 'skipped' ? 'upcoming' : 'skipped')} style={skipButtonStyle} title="Skip"><SkipForward size={13} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  {resolved.length > 0 && unresolved.length > 0 && (
                    <button type="button" onClick={() => setShowResolved(prev => ({ ...prev, [quest.id]: !prev[quest.id] }))} style={resolvedToggleStyle}>
                      {showingResolved ? 'Hide completed / skipped' : `Show ${resolved.length} completed / skipped`}
                    </button>
                  )}
                </section>

                <LiveLinks quest={quest} resources={resources} onOpen={openTool} />

                <div style={footerStyle}>
                  <button type="button" onClick={() => completeQuest(quest)} style={completeButtonStyle}><Check size={14} /> Mark Quest Complete</button>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function LiveLinks({ quest, resources, onOpen }) {
  const groups = LINK_TYPES.map(type => {
    const ids = safeArray(quest[type.key]);
    const items = ids.map(id => safeArray(resources[type.resource]).find(item => item.id === id)).filter(Boolean);
    return { type, items };
  }).filter(group => group.items.length > 0);

  if (!groups.length) return null;
  return (
    <section style={sectionStyle}>
      <div style={sectionHeaderStyle}><strong>Linked</strong><span>Tap to open</span></div>
      <div style={linksStyle}>
        {groups.flatMap(({ type, items }) => items.map(item => {
          const Icon = type.icon;
          return (
            <button key={`${type.key}-${item.id}`} type="button" onClick={() => onOpen(type, item.id)} style={linkButtonStyle(type.key === 'linked_encounter_ids')}>
              <Icon size={14} /><span>{type.name(item) || type.label}</span>{type.key === 'linked_encounter_ids' && <strong>Run</strong>}
            </button>
          );
        }))}
      </div>
    </section>
  );
}

const shellStyle = { display: 'grid', gap: 6, color: rq.text };
const searchStyle = { minHeight: 36, display: 'flex', alignItems: 'center', gap: 7, background: rq.bg, border: `1px solid ${rq.line}`, padding: '0 9px' };
const searchInputStyle = { flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', color: rq.text };
const emptyStyle = { minHeight: 90, display: 'grid', placeItems: 'center', background: rq.panel, border: `1px dashed ${rq.line}`, color: rq.muted, fontSize: 11 };
const warningStyle = { minHeight: 38, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.45)', color: rq.soft, padding: 8, fontSize: 10, lineHeight: 1.4 };
const questStyle = { background: rq.panel, border: `1px solid ${rq.line}` };
const questHeaderStyle = { width: '100%', minHeight: 52, border: 0, background: rq.card, color: rq.text, padding: '8px 10px', display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr) auto', alignItems: 'center', gap: 6, cursor: 'pointer' };
const questTitleStyle = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 };
const questMetaStyle = { color: rq.muted, fontSize: 9, textTransform: 'capitalize' };
const questBodyStyle = { display: 'grid', gap: 7, padding: 7 };
const summaryStyle = { background: rq.bg, borderLeft: `4px solid ${rq.red}`, padding: 8, color: rq.soft, fontSize: 11, lineHeight: 1.35 };
const sectionStyle = { display: 'grid', gap: 5, background: rq.panel, border: `1px solid ${rq.line}`, padding: 7 };
const sectionHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, color: rq.muted, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.07em' };
const objectiveListStyle = { display: 'grid', gap: 4 };
const objectiveStyle = status => ({ minHeight: 39, display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr) 30px', alignItems: 'center', gap: 3, background: rq.bg, border: `1px solid ${rq.line}`, opacity: status === 'skipped' ? 0.62 : 1 });
const checkButtonStyle = { width: 34, height: 34, border: 0, background: 'transparent', color: rq.text, display: 'grid', placeItems: 'center', cursor: 'pointer' };
const objectiveTextStyle = status => ({ color: status === 'completed' ? rq.muted : rq.text, textDecoration: status === 'completed' ? 'line-through' : 'none', fontSize: 11, lineHeight: 1.25 });
const skipButtonStyle = { width: 30, height: 30, border: 0, background: 'transparent', color: rq.muted, display: 'grid', placeItems: 'center', cursor: 'pointer' };
const runObjectiveStyle = { width: 30, height: 30, border: `1px solid ${rq.red}`, background: 'rgba(208,0,0,0.14)', color: rq.text, display: 'grid', placeItems: 'center', cursor: 'pointer' };
const resolvedToggleStyle = { minHeight: 30, border: `1px solid ${rq.line}`, background: rq.bg, color: rq.muted, padding: '0 8px', cursor: 'pointer', fontSize: 9, fontWeight: 900, justifySelf: 'start' };
const linksStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 4 };
const linkButtonStyle = encounter => ({ minHeight: 36, border: `1px solid ${encounter ? rq.red : rq.line}`, background: encounter ? 'rgba(208,0,0,0.14)' : rq.bg, color: rq.text, padding: '0 7px', display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr) auto', alignItems: 'center', gap: 4, cursor: 'pointer', textAlign: 'left', fontSize: 10, overflow: 'hidden' });
const footerStyle = { display: 'flex', justifyContent: 'flex-end' };
const completeButtonStyle = { minHeight: 34, border: 0, background: rq.red, color: '#fff', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 10, fontWeight: 950 };
