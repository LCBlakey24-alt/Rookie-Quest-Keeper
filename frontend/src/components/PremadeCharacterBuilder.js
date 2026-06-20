import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { buildCharacterCreationPayloadFromTemplate, buildRookSpellLoadoutsForTemplate, getCharacterCreationPayloadWarnings } from '@/data/characterCreationPayload';

const PREPARED_SPELLCASTERS = new Set(['Wizard', 'Cleric', 'Druid', 'Paladin']);
const PREMADE_SPELL_PLAN_OPTIONS = [
  { id: 'rook-balanced', label: 'Balanced' },
  { id: 'rook-healing', label: 'Healing' },
  { id: 'rook-power', label: 'Power' },
  { id: 'rook-support', label: 'Support' },
  { id: 'prepare-later', label: 'Prepare later' },
];

const ROLE_FILTERS = [
  { key: 'all', label: 'All roles' },
  { key: 'frontline', label: 'Frontline' },
  { key: 'ranged', label: 'Ranged' },
  { key: 'caster', label: 'Caster' },
  { key: 'support', label: 'Support' },
  { key: 'stealth', label: 'Stealth' },
  { key: 'face', label: 'Social' },
  { key: 'nature', label: 'Nature' },
];

const DIFFICULTY_FILTERS = ['All', 'Beginner', 'Balanced', 'Spellcaster'];

const velvet = {
  bg: '#120C08',
  card: '#2E1D13',
  text: '#F5E6C8',
  muted: '#CDBA98',
};

const inputStyle = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: 8,
  background: velvet.card,
  border: '1px solid rgba(192,138,61,0.34)',
  color: velvet.text,
  fontSize: 14,
  outline: 'none',
};

const labelStyle = {
  display: 'grid',
  gap: 6,
  fontSize: 11,
  color: velvet.muted,
  fontWeight: 900,
  letterSpacing: 0.7,
  textTransform: 'uppercase',
};

function getDifficulty(template) {
  const cls = template?.character_class;
  if (['Fighter', 'Barbarian', 'Rogue', 'Monk'].includes(cls)) return 'Beginner';
  if (['Wizard', 'Sorcerer', 'Warlock'].includes(cls)) return 'Spellcaster';
  return 'Balanced';
}

function getRoleLabel(template) {
  const tags = template?.playstyle_tags || [];
  if (tags.includes('healer')) return 'Healer';
  if (tags.includes('support')) return 'Support';
  if (tags.includes('frontline') || tags.includes('tank')) return 'Frontline';
  if (tags.includes('stealth') || tags.includes('scout')) return 'Stealth';
  if (tags.includes('caster')) return 'Caster';
  if (tags.includes('ranged')) return 'Ranged';
  if (tags.includes('face') || tags.includes('leader')) return 'Social';
  if (tags.includes('nature')) return 'Nature';
  return 'Adventurer';
}

function getIdentity(template) {
  if (!template) return '';
  const ancestry = template.subrace ? `${template.subrace} ${template.race}` : template.race;
  return [template.character_class, ancestry, template.background].filter(Boolean).join(' · ');
}

export default function PremadeCharacterBuilder() {
  const navigate = useNavigate();
  const [edition, setEdition] = useState('2014');
  const [rulesetId, setRulesetId] = useState('dnd5e_2014');
  const [templates, setTemplates] = useState([]);
  const [description, setDescription] = useState('');
  const [match, setMatch] = useState(null);
  const [name, setName] = useState('');
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [creatingTemplateId, setCreatingTemplateId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [classFilter, setClassFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const next = edition === '2024' ? 'dnd5e_2024' : 'dnd5e_2014';
    setRulesetId(next);
    setMatch(null);
  }, [edition]);

  useEffect(() => {
    const load = async () => {
      const res = await apiClient.get(`/character-templates`, { params: { ruleset_id: rulesetId } });
      const nextTemplates = res.data?.templates || [];
      setTemplates(nextTemplates);
      setSelectedTemplate(current => {
        if (current && nextTemplates.some(template => template.id === current.id)) return current;
        return nextTemplates[0] || null;
      });
    };
    load().catch(() => toast.error('Failed to load templates'));
  }, [rulesetId]);

  const classOptions = useMemo(() => ['All', ...Array.from(new Set(templates.map(t => t.character_class).filter(Boolean))).sort()], [templates]);

  const filteredTemplates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return templates.filter(template => {
      const tags = template.playstyle_tags || [];
      const haystack = [
        template.name,
        template.pitch,
        template.character_class,
        template.race,
        template.subrace,
        template.background,
        ...tags,
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesSearch = !term || haystack.includes(term);
      const matchesClass = classFilter === 'All' || template.character_class === classFilter;
      const matchesRole = roleFilter === 'all' || tags.includes(roleFilter);
      const matchesDifficulty = difficultyFilter === 'All' || getDifficulty(template) === difficultyFilter;

      return matchesSearch && matchesClass && matchesRole && matchesDifficulty;
    });
  }, [templates, searchTerm, classFilter, roleFilter, difficultyFilter]);

  const selectedIsSuggested = match?.best_match?.id && selectedTemplate?.id === match.best_match.id;

  const runMatch = async () => {
    if (!description.trim()) return toast.error('Describe the sort of hero you want first');

    setLoadingMatch(true);
    try {
      const res = await apiClient.post(`/character-templates/ai-match`, { ruleset_id: rulesetId, description });
      setMatch(res.data);
      const suggested = res.data?.best_match;
      if (suggested) {
        setSelectedTemplate(templates.find(template => template.id === suggested.id) || suggested);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to suggest a hero');
    } finally {
      setLoadingMatch(false);
    }
  };

  const createFromTemplate = async (template) => {
    if (!template) return toast.error('Choose a hero first');
    if (!name.trim()) return toast.error('Enter character name first');
    setCreatingTemplateId(template.id);
    try {
      // Fetch full template details (with stats, skills, spells, etc.)
      const { data: full } = await apiClient.get(`/character-templates/${template.id}`);
      const spellLoadoutId = spellPlans[template.id] || 'rook-balanced';
      const payload = buildCharacterCreationPayloadFromTemplate(full, { name, edition, rulesetId, spellLoadoutId });
      const warnings = getCharacterCreationPayloadWarnings(payload);
      if (warnings.length) {
        toast.warning(`Created with ${warnings.length} sheet detail${warnings.length === 1 ? '' : 's'} to review.`);
      }
      const res = await apiClient.post(`/characters`, payload);
      toast.success('Premade character created');
      navigate(`/characters/${res.data?.character_id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create character from template');
    } finally {
      setCreatingTemplateId('');
    }
  };

  return (
    <main className="premade-page">
      <style>{pageCss}</style>
      <div className="premade-shell">
        <button onClick={() => navigate('/characters/new')} className="premade-back" data-testid="premade-back">← Back to Modes</button>

        <section className="premade-hero">
          <div>
            <div className="premade-kicker">Instant characters</div>
            <h1>Pick a ready hero and start playing.</h1>
            <p>Browse premade hero cards by class, role, and complexity. Rename the hero, save a copy, and edit the full sheet later.</p>
          </div>
          <div className="premade-help-card">
            <strong>How this route works</strong>
            <span>Choose a card, enter a character name, then create the sheet. The original template stays unchanged.</span>
          </div>
        </section>

        <section className="premade-toolbar" aria-label="Premade character setup">
          <label style={labelStyle}>Character Name
            <input placeholder="Enter name..." value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} data-testid="premade-name" />
          </label>
          <label style={labelStyle}>Edition
            <select value={edition} onChange={e => setEdition(e.target.value)} style={inputStyle} data-testid="premade-edition">
              <option value="2014">2014 Rules</option>
              <option value="2024">2024 Rules</option>
            </select>
          </label>
          <label style={labelStyle}>Search heroes
            <input placeholder="Name, class, role, background..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={inputStyle} data-testid="premade-search" />
          </label>
        </section>

        <section className="premade-suggest" aria-label="ROOK hero suggestion">
          <label style={labelStyle}>Describe the sort of hero you want
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Example: I want a sneaky character who talks their way out of trouble."
              style={{ ...inputStyle, minHeight: 78, resize: 'vertical' }}
              data-testid="premade-description"
            />
          </label>
          <button onClick={runMatch} disabled={loadingMatch} data-testid="premade-match-btn" className="premade-primary premade-suggest-button">
            {loadingMatch ? 'Suggesting…' : 'Suggest a Hero'}
          </button>
          {match?.best_match && (
            <div className="premade-suggestion" data-testid="premade-suggestion">
              <span>Suggested Hero</span>
              <strong>{match.best_match.name} · {match.best_match.character_class}</strong>
              {match.rationale && <p>{match.rationale}</p>}
            </div>
          )}
        </section>

        <section className="premade-filters" aria-label="Premade character filters">
          <div className="premade-filter-group">
            <span>Class</span>
            <select value={classFilter} onChange={e => setClassFilter(e.target.value)} data-testid="premade-class-filter">
              {classOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="premade-filter-group">
            <span>Difficulty</span>
            <select value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)} data-testid="premade-difficulty-filter">
              {DIFFICULTY_FILTERS.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="premade-role-pills" data-testid="premade-role-filter">
            {ROLE_FILTERS.map(role => (
              <button
                key={role.key}
                type="button"
                onClick={() => setRoleFilter(role.key)}
                className={roleFilter === role.key ? 'active' : ''}
              >
                {role.label}
              </button>
            ))}
          </div>
        </section>

        <div className="premade-layout">
          <section className="premade-gallery" aria-label="Premade hero cards">
            <div className="premade-section-title">
              <h2>Hero cards</h2>
              <span>{filteredTemplates.length} shown</span>
            </div>

            {templates.length === 0 && <div className="premade-empty">Loading templates…</div>}
            {templates.length > 0 && filteredTemplates.length === 0 && (
              <div className="premade-empty">No heroes match those filters yet. Try another role, class, or search term.</div>
            )}

            <div className="premade-card-grid">
              {filteredTemplates.map(template => (
                <HeroCard
                  key={template.id}
                  template={template}
                  selected={selectedTemplate?.id === template.id}
                  suggested={match?.best_match?.id === template.id}
                  busy={Boolean(creatingTemplateId)}
                  onSelect={() => setSelectedTemplate(template)}
                  onCreate={() => createFromTemplate(template)}
                  creating={creatingTemplateId === template.id}
                />
              ))}
            </div>
          </section>

          <aside className="premade-preview" data-testid="premade-selected-preview">
            <div className="premade-section-title">
              <h2>Selected hero</h2>
              {selectedIsSuggested && <span>Suggested</span>}
            </div>

            {selectedTemplate ? (
              <>
                <div className="premade-preview-card">
                  <div className="premade-avatar">{selectedTemplate.name?.slice(0, 1) || '?'}</div>
                  <div>
                    <h3>{selectedTemplate.name}</h3>
                    <p>{getIdentity(selectedTemplate)}</p>
                  </div>
                </div>

                <p className="premade-preview-pitch">{selectedTemplate.pitch}</p>

                <div className="premade-preview-stats">
                  <PreviewStat label="Role" value={getRoleLabel(selectedTemplate)} />
                  <PreviewStat label="Complexity" value={getDifficulty(selectedTemplate)} />
                  <PreviewStat label="Rules" value={edition} />
                  <PreviewStat label="Level" value="1" />
                </div>

                <div className="premade-tags">
                  {(selectedTemplate.playstyle_tags || []).slice(0, 8).map(tag => <span key={tag}>{tag}</span>)}
                </div>

                <button
                  className="premade-primary premade-create-selected"
                  disabled={Boolean(creatingTemplateId)}
                  onClick={() => createFromTemplate(selectedTemplate)}
                  data-testid="use-selected-template"
                >
                  {creatingTemplateId === selectedTemplate.id ? 'Creating…' : 'Create This Hero'}
                </button>
                <span className="premade-edit-note">You can edit the full character sheet after creation.</span>
              </>
            ) : (
              <div className="premade-empty">Choose a hero card to preview it here.</div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function HeroCard({ template, selected, suggested, busy, creating, onSelect, onCreate }) {
  return (
    <article className={`premade-card ${selected ? 'selected' : ''}`} data-testid={`template-${template.id}`}>
      <button type="button" onClick={onSelect} className="premade-card-main">
        <div className="premade-card-topline">
          <span>{getDifficulty(template)}</span>
          {suggested && <em>Suggested</em>}
        </div>
        <div className="premade-card-header">
          <div className="premade-avatar small">{template.name?.slice(0, 1) || '?'}</div>
          <div>
            <h3>{template.name}</h3>
            <p>{getIdentity(template)}</p>
          </div>
        </div>
        <p className="premade-card-pitch">{template.pitch}</p>
        <div className="premade-card-meta">
          <span>{getRoleLabel(template)}</span>
          <span>{template.alignment || 'Neutral'}</span>
        </div>
        <div className="premade-tags compact">
          {(template.playstyle_tags || []).slice(0, 4).map(tag => <span key={tag}>{tag}</span>)}
        </div>
      </button>
      <button
        disabled={busy}
        onClick={onCreate}
        data-testid={`use-template-${template.id}`}
        className="premade-card-create"
      >
        {creating ? 'Creating…' : 'Use Hero'}
      </button>
    </article>
  );
}

function PreviewStat({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const pageCss = `
.premade-page{min-height:100vh;overflow-y:auto;background:radial-gradient(circle at top left,rgba(224,177,92,.14),transparent 32%),radial-gradient(circle at top right,rgba(164,90,50,.18),transparent 34%),linear-gradient(180deg,#120C08,#21150E);color:#F5E6C8;padding:20px;font-family:var(--font-sans)}
.premade-shell{width:min(1180px,100%);margin:0 auto}.premade-back{background:rgba(46,29,19,.78);border:1px solid rgba(192,138,61,.24);color:#CDBA98;cursor:pointer;font-size:12px;font-weight:900;letter-spacing:.7px;text-transform:uppercase;padding:8px 10px;border-radius:8px;margin-bottom:12px}.premade-back:hover{border-color:rgba(224,177,92,.58);color:#F5E6C8;background:rgba(192,138,61,.12)}.premade-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,340px);gap:12px;align-items:stretch;margin-bottom:12px}.premade-hero>div,.premade-help-card,.premade-toolbar,.premade-suggest,.premade-filters,.premade-gallery,.premade-preview{background:rgba(33,21,14,.95);border:1px solid rgba(192,138,61,.22);border-radius:12px;box-shadow:0 22px 56px rgba(0,0,0,.48)}.premade-hero>div:first-child{padding:18px}.premade-kicker{color:#E0B15C;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin-bottom:9px}.premade-hero h1{margin:0;color:#F5E6C8;font-size:clamp(28px,4vw,42px);line-height:1;font-weight:900;letter-spacing:-1.4px}.premade-hero p{margin:9px 0 0;color:#CDBA98;line-height:1.5;font-size:14px;max-width:740px}.premade-help-card{display:grid;gap:6px;padding:15px;background:linear-gradient(135deg,rgba(192,138,61,.12),rgba(164,90,50,.15));border-color:rgba(224,177,92,.3)}.premade-help-card strong{font-size:15px}.premade-help-card span{color:#CDBA98;font-size:13px;line-height:1.45}.premade-toolbar{display:grid;grid-template-columns:1.2fr 160px 1fr;gap:12px;padding:14px;margin-bottom:12px}.premade-suggest{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(220px,320px);gap:12px;align-items:end;padding:14px;margin-bottom:12px}.premade-primary{background:linear-gradient(135deg,#C08A3D,#A45A32);border:1px solid rgba(224,177,92,.72);border-radius:8px;color:#120C08;cursor:pointer;font-weight:900;text-transform:uppercase;letter-spacing:.7px;box-shadow:0 14px 32px rgba(192,138,61,.24)}.premade-primary:disabled{cursor:not-allowed;opacity:.58;box-shadow:none}.premade-suggest-button{padding:12px 16px;height:42px}.premade-suggestion{border:1px solid rgba(224,177,92,.28);background:rgba(46,29,19,.78);border-radius:10px;padding:10px}.premade-suggestion span,.premade-section-title span{display:inline-flex;color:#F5E6C8;border:1px solid rgba(192,138,61,.46);background:linear-gradient(135deg,rgba(192,138,61,.22),rgba(164,90,50,.24));border-radius:999px;padding:3px 7px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.7px}.premade-suggestion strong{display:block;margin-top:6px;color:#F5E6C8;font-size:14px}.premade-suggestion p{margin:5px 0 0;color:#CDBA98;font-size:12px;line-height:1.4}.premade-filters{display:grid;grid-template-columns:170px 170px minmax(0,1fr);gap:10px;align-items:center;padding:12px;margin-bottom:12px}.premade-filter-group{display:grid;gap:5px}.premade-filter-group span{color:#CDBA98;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.8px}.premade-filter-group select{background:#2E1D13;border:1px solid rgba(192,138,61,.34);color:#F5E6C8;border-radius:8px;padding:9px 10px}.premade-role-pills{display:flex;flex-wrap:wrap;gap:7px}.premade-role-pills button{background:#2E1D13;border:1px solid rgba(192,138,61,.2);color:#CDBA98;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:900;cursor:pointer}.premade-role-pills button.active,.premade-role-pills button:hover{border-color:rgba(224,177,92,.72);color:#F5E6C8;background:linear-gradient(135deg,rgba(192,138,61,.22),rgba(164,90,50,.24))}.premade-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(290px,360px);gap:12px;align-items:start}.premade-gallery,.premade-preview{padding:14px}.premade-section-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.premade-section-title h2{margin:0;color:#F5E6C8;font-size:18px}.premade-empty{color:#CDBA98;padding:18px;border:1px dashed rgba(192,138,61,.24);border-radius:10px;background:rgba(46,29,19,.45);font-size:13px;line-height:1.45}.premade-card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:11px}.premade-card{background:#2E1D13;border:1px solid rgba(192,138,61,.2);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;transition:transform 160ms ease,border-color 160ms ease,box-shadow 160ms ease}.premade-card:hover,.premade-card.selected{transform:translateY(-2px);border-color:rgba(224,177,92,.7);box-shadow:0 18px 42px rgba(192,138,61,.16)}.premade-card-main{appearance:none;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer;padding:13px;display:grid;gap:9px;flex:1}.premade-card-topline,.premade-card-meta{display:flex;align-items:center;justify-content:space-between;gap:8px}.premade-card-topline>span,.premade-card-meta span{color:#CDBA98;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.7px}.premade-card-topline em{font-style:normal;color:#F5E6C8;border:1px solid rgba(192,138,61,.46);background:rgba(192,138,61,.16);border-radius:999px;padding:3px 7px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.7px}.premade-card-header,.premade-preview-card{display:flex;align-items:center;gap:10px}.premade-avatar{width:52px;height:52px;border-radius:13px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(224,177,92,.36);background:linear-gradient(135deg,rgba(192,138,61,.3),rgba(164,90,50,.32));color:#F5E6C8;font-size:24px;font-weight:900}.premade-avatar.small{width:40px;height:40px;border-radius:10px;font-size:18px;flex:0 0 auto}.premade-card h3,.premade-preview h3{margin:0;color:#F5E6C8;font-size:16px;font-weight:900}.premade-card-header p,.premade-preview-card p{margin:4px 0 0;color:#CDBA98;font-size:11px;line-height:1.35}.premade-card-pitch,.premade-preview-pitch{margin:0;color:#E6D2AA;font-size:12px;line-height:1.45}.premade-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}.premade-tags span{border:1px solid rgba(192,138,61,.22);background:rgba(192,138,61,.08);color:#E6D2AA;border-radius:999px;padding:4px 7px;font-size:10px;font-weight:800}.premade-tags.compact span{font-size:9px}.premade-card-create{border:0;border-top:1px solid rgba(192,138,61,.18);background:linear-gradient(135deg,rgba(192,138,61,.24),rgba(164,90,50,.26));color:#F5E6C8;padding:10px 12px;font-size:11px;font-weight:900;letter-spacing:.7px;text-transform:uppercase;cursor:pointer}.premade-card-create:disabled{opacity:.55;cursor:not-allowed}.premade-preview{position:sticky;top:14px}.premade-preview-card{background:linear-gradient(135deg,rgba(192,138,61,.12),rgba(164,90,50,.14));border:1px solid rgba(224,177,92,.24);border-radius:12px;padding:12px;margin-bottom:11px}.premade-preview-pitch{margin-bottom:12px}.premade-preview-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px}.premade-preview-stats div{border:1px solid rgba(192,138,61,.22);background:rgba(46,29,19,.7);border-radius:9px;padding:9px}.premade-preview-stats span{display:block;color:#CDBA98;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.7px}.premade-preview-stats strong{display:block;color:#F5E6C8;font-size:14px;margin-top:3px}.premade-create-selected{width:100%;padding:12px;margin-top:12px}.premade-edit-note{display:block;color:#CDBA98;font-size:11px;text-align:center;margin-top:8px}
@media(max-width:980px){.premade-hero,.premade-layout,.premade-suggest{grid-template-columns:1fr}.premade-preview{position:static}.premade-toolbar,.premade-filters{grid-template-columns:1fr}}@media(max-width:620px){.premade-page{padding:14px}.premade-card-grid{grid-template-columns:1fr}}
`;
