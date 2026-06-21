        import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  buildCharacterCreationPayloadFromTemplate,
  getCharacterCreationPayloadWarnings,
} from '@/data/characterCreationPayload';

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
  panel: '#21150E',
  card: '#2E1D13',
  raised: '#3A2619',
  input: '#1A100B',
  text: '#F5E6C8',
  soft: '#E6D2AA',
  muted: '#CDBA98',
  gold: '#C08A3D',
  goldHover: '#E0B15C',
  copper: '#A45A32',
  success: '#7A9B66',
};

const inputStyle = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: 8,
  background: velvet.input,
  border: '1px solid rgba(192, 138, 61, 0.34)',
  color: velvet.text,
  fontSize: 14,
  outline: 'none',
};

const labelStyle = {
  display: 'grid',
  gap: 7,
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

function Pill({ children, tone = 'neutral' }) {
  return <span className={`premade-pill premade-pill-${tone}`}>{children}</span>;
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
  const [spellPlans, setSpellPlans] = useState({});

  useEffect(() => {
    const next = edition === '2024' ? 'dnd5e_2024' : 'dnd5e_2014';
    setRulesetId(next);
    setMatch(null);
  }, [edition]);

  useEffect(() => {
    const load = async () => {
      const res = await apiClient.get('/character-templates', { params: { ruleset_id: rulesetId } });
      const nextTemplates = res.data?.templates || [];
      setTemplates(nextTemplates);
      setSelectedTemplate(current => {
        if (current && nextTemplates.some(template => template.id === current.id)) return current;
        return nextTemplates[0] || null;
      });
    };

    load().catch(() => toast.error('Failed to load premade heroes'));
  }, [rulesetId]);

  const classOptions = useMemo(
    () => ['All', ...Array.from(new Set(templates.map(t => t.character_class).filter(Boolean))).sort()],
    [templates]
  );

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
  const selectedIsPreparedCaster = selectedTemplate && PREPARED_SPELLCASTERS.has(selectedTemplate.character_class);

  const updateSpellPlan = (templateId, spellLoadoutId) => {
    setSpellPlans(current => ({
      ...current,
      [templateId]: spellLoadoutId,
    }));
  };

  const runMatch = async () => {
    if (!description.trim()) {
      toast.error('Describe the sort of hero you want first');
      return;
    }

    setLoadingMatch(true);

    try {
      const res = await apiClient.post('/character-templates/ai-match', {
        ruleset_id: rulesetId,
        description,
      });

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
    if (!template) {
      toast.error('Choose a hero first');
      return;
    }

    if (!name.trim()) {
      toast.error('Enter a character name first');
      return;
    }

    setCreatingTemplateId(template.id);

    try {
      const { data: full } = await apiClient.get(`/character-templates/${template.id}`);
      const spellLoadoutId = spellPlans[template.id] || 'rook-balanced';
      const payload = buildCharacterCreationPayloadFromTemplate(full, {
        name,
        edition,
        rulesetId,
        spellLoadoutId,
      });

      const warnings = getCharacterCreationPayloadWarnings(payload);

      if (warnings.length) {
        toast.warning(`Created with ${warnings.length} sheet detail${warnings.length === 1 ? '' : 's'} to review.`);
      }

      const res = await apiClient.post('/characters', payload);
      toast.success('Premade hero created');
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
        <button
          onClick={() => navigate('/characters/new')}
          className="premade-back"
          data-testid="premade-back"
          type="button"
        >
          ← Back to creation routes
        </button>

        <section className="premade-hero">
          <div className="premade-hero-copy">
            <div className="premade-kicker">Ready-made heroes</div>
            <h1>Pick a hero, name them, and start playing.</h1>
            <p>
              Premade characters are the fastest route into the game. Choose a ready hero,
              make a copy, then edit the full sheet later when you want more control.
            </p>

            <div className="premade-steps" aria-label="Premade character steps">
              <span><strong>1</strong> Choose a style</span>
              <span><strong>2</strong> Pick a hero</span>
              <span><strong>3</strong> Create the sheet</span>
            </div>
          </div>

          <aside className="premade-help-card">
            <strong>Good for new players</strong>
            <span>
              These heroes are built to be playable straight away. Rook can suggest one,
              but you can still choose any hero yourself.
            </span>
          </aside>
        </section>

        <section className="premade-toolbar" aria-label="Premade character setup">
          <label style={labelStyle}>
            Character Name
            <input
              placeholder="Enter your hero’s name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              data-testid="premade-name"
            />
          </label>

          <label style={labelStyle}>
            Edition
            <select
              value={edition}
              onChange={e => setEdition(e.target.value)}
              style={inputStyle}
              data-testid="premade-edition"
            >
              <option value="2014">2014 Rules</option>
              <option value="2024">2024 Rules</option>
            </select>
          </label>

          <label style={labelStyle}>
            Search heroes
            <input
              placeholder="Name, class, role, background..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={inputStyle}
              data-testid="premade-search"
            />
          </label>
        </section>

        <section className="premade-suggest" aria-label="Rook hero suggestion">
          <label style={labelStyle}>
            Ask Rook for a suggestion
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Example: I want a sneaky character who can talk their way out of trouble."
              style={{ ...inputStyle, minHeight: 82, resize: 'vertical' }}
              data-testid="premade-description"
            />
          </label>

          <button
            onClick={runMatch}
            disabled={loadingMatch}
            data-testid="premade-match-btn"
            className="premade-primary premade-suggest-button"
            type="button"
          >
            {loadingMatch ? 'Suggesting…' : 'Suggest a Hero'}
          </button>

          {match?.best_match ? (
            <div className="premade-suggestion" data-testid="premade-suggestion">
              <span>Suggested hero</span>
              <strong>{match.best_match.name} · {match.best_match.character_class}</strong>
              {match.rationale && <p>{match.rationale}</p>}
            </div>
          ) : (
            <div className="premade-suggestion premade-suggestion-empty">
              <span>Optional</span>
              <strong>Use Rook when you are unsure</strong>
              <p>Describe the vibe you want and Rook will point you toward a matching hero.</p>
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
              <div>
                <h2>Hero cards</h2>
                <p>Choose a ready-made hero template. You will create your own copy.</p>
              </div>
              <span>{filteredTemplates.length} shown</span>
            </div>

            {templates.length === 0 && <div className="premade-empty">Loading premade heroes…</div>}

            {templates.length > 0 && filteredTemplates.length === 0 && (
              <div className="premade-empty">
                No heroes match those filters yet. Try another role, class, difficulty, or search term.
              </div>
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
              <div>
                <h2>Selected hero</h2>
                <p>Preview the template before creating your copy.</p>
              </div>
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

                {selectedIsPreparedCaster && (
                  <label className="premade-spell-plan" style={labelStyle}>
                    Rook spell loadout
                    <select
                      value={spellPlans[selectedTemplate.id] || 'rook-balanced'}
                      onChange={(event) => updateSpellPlan(selectedTemplate.id, event.target.value)}
                      style={inputStyle}
                      data-testid="premade-spell-plan"
                    >
                      {PREMADE_SPELL_PLAN_OPTIONS.map(option => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="premade-tags">
                  {(selectedTemplate.playstyle_tags || []).slice(0, 8).map(tag => <span key={tag}>{tag}</span>)}
                </div>

                <button
                  className="premade-primary premade-create-selected"
                  disabled={Boolean(creatingTemplateId)}
                  onClick={() => createFromTemplate(selectedTemplate)}
                  data-testid="use-selected-template"
                  type="button"
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
          <Pill>{getRoleLabel(template)}</Pill>
          <Pill tone="soft">{template.alignment || 'Neutral'}</Pill>
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
        type="button"
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
.premade-page {
  min-height: 100vh;
  overflow-y: auto;
  background:
    radial-gradient(circle at top left, rgba(224, 177, 92, 0.14), transparent 32%),
    radial-gradient(circle at top right, rgba(164, 90, 50, 0.18), transparent 34%),
    linear-gradient(180deg, #120C08, #21150E);
  color: #F5E6C8;
  padding: 20px;
  font-family: var(--rq-font-sans, var(--font-sans));
}

.premade-shell {
  width: min(1180px, 100%);
  margin: 0 auto;
}

.premade-back {
  background: rgba(46, 29, 19, 0.78);
  border: 1px solid rgba(192, 138, 61, 0.24);
  color: #CDBA98;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  padding: 8px 10px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.premade-back:hover {
  border-color: rgba(224, 177, 92, 0.58);
  color: #F5E6C8;
  background: rgba(192, 138, 61, 0.12);
}

.premade-hero {
display: grid;
grid-template-columns: minmax(0, 1fr) minmax(250px, 340px);
gap: 12px;
align-items: stretch;
margin-bottom: 12px;
}

.premade-hero-copy,
.premade-help-card,
.premade-toolbar,
.premade-suggest,
.premade-filters,
.premade-gallery,
.premade-preview {
background: rgba(33, 21, 14, 0.95);
border: 1px solid rgba(192, 138, 61, 0.22);
border-radius: 12px;
box-shadow: 0 22px 56px rgba(0, 0, 0, 0.48);
}

.premade-hero-copy {
padding: 20px;
}

.premade-kicker {
color: #E0B15C;
font-size: 12px;
font-weight: 900;
text-transform: uppercase;
letter-spacing: 1px;
margin-bottom: 9px;
}

.premade-hero h1 {
margin: 0;
color: #F5E6C8;
font-size: clamp(30px, 4vw, 46px);
line-height: 1;
font-weight: 900;
letter-spacing: -1.2px;
}

.premade-hero p {
margin: 10px 0 0;
color: #CDBA98;
line-height: 1.55;
font-size: 14px;
max-width: 760px;
}

.premade-steps {
display: flex;
flex-wrap: wrap;
gap: 8px;
margin-top: 16px;
}

.premade-steps span {
display: inline-flex;
align-items: center;
gap: 7px;
min-height: 32px;
padding: 0 10px;
border-radius: 999px;
color: #E6D2AA;
background: rgba(192, 138, 61, 0.09);
border: 1px solid rgba(192, 138, 61, 0.25);
font-size: 12px;
font-weight: 800;
}

.premade-steps strong {
display: inline-flex;
align-items: center;
justify-content: center;
width: 19px;
height: 19px;
border-radius: 999px;
color: #120C08;
background: #C08A3D;
font-size: 11px;
font-weight: 900;
}

.premade-help-card {
display: grid;
gap: 7px;
padding: 16px;
background: linear-gradient(135deg, rgba(192, 138, 61, 0.12), rgba(164, 90, 50, 0.15));
border-color: rgba(224, 177, 92, 0.3);
}

.premade-help-card strong {
font-size: 16px;
}

.premade-help-card span {
color: #CDBA98;
font-size: 13px;
line-height: 1.45;
}

.premade-toolbar {
display: grid;
grid-template-columns: 1.2fr 160px 1fr;
gap: 12px;
padding: 14px;
margin-bottom: 12px;
}

.premade-suggest {
display: grid;
grid-template-columns: minmax(0, 1fr) auto minmax(220px, 320px);
gap: 12px;
align-items: end;
padding: 14px;
margin-bottom: 12px;
}

.premade-primary {
background: linear-gradient(135deg, #C08A3D, #A45A32);
border: 1px solid rgba(224, 177, 92, 0.72);
border-radius: 8px;
color: #120C08;
cursor: pointer;
font-weight: 900;
text-transform: uppercase;
letter-spacing: 0.7px;
box-shadow: 0 14px 32px rgba(192, 138, 61, 0.24);
}

.premade-primary:disabled {
cursor: not-allowed;
opacity: 0.58;
box-shadow: none;
}

.premade-suggest-button {
padding: 12px 16px;
height: 42px;
}

.premade-suggestion {
border: 1px solid rgba(224, 177, 92, 0.28);
background: rgba(46, 29, 19, 0.78);
border-radius: 10px;
padding: 10px;
}

.premade-suggestion-empty {
opacity: 0.9;
}

.premade-suggestion span,
.premade-section-title > span {
display: inline-flex;
color: #F5E6C8;
border: 1px solid rgba(192, 138, 61, 0.46);
background: linear-gradient(135deg, rgba(192, 138, 61, 0.22), rgba(164, 90, 50, 0.24));
border-radius: 999px;
padding: 3px 7px;
font-size: 10px;
font-weight: 900;
text-transform: uppercase;
letter-spacing: 0.7px;
}

.premade-suggestion strong {
display: block;
margin-top: 6px;
color: #F5E6C8;
font-size: 14px;
}

.premade-suggestion p {
margin: 5px 0 0;
color: #CDBA98;
font-size: 12px;
line-height: 1.4;
}

.premade-filters {
display: grid;
grid-template-columns: 170px 170px minmax(0, 1fr);
gap: 10px;
align-items: center;
padding: 12px;
margin-bottom: 12px;
}

.premade-filter-group {
display: grid;
gap: 5px;
}

.premade-filter-group span {
color: #CDBA98;
font-size: 10px;
font-weight: 900;
text-transform: uppercase;
letter-spacing: 0.8px;
}

.premade-filter-group select {
background: #1A100B;
border: 1px solid rgba(192, 138, 61, 0.34);
color: #F5E6C8;
border-radius: 8px;
padding: 9px 10px;
}

.premade-role-pills {
display: flex;
flex-wrap: wrap;
gap: 7px;
}

.premade-role-pills button {
background: #2E1D13;
border: 1px solid rgba(192, 138, 61, 0.2);
color: #CDBA98;
border-radius: 999px;
padding: 7px 10px;
font-size: 11px;
font-weight: 900;
cursor: pointer;
}

.premade-role-pills button.active,
.premade-role-pills button:hover {
border-color: rgba(224, 177, 92, 0.72);
color: #F5E6C8;
background: linear-gradient(135deg, rgba(192, 138, 61, 0.22), rgba(164, 90, 50, 0.24));
}

.premade-layout {
display: grid;
grid-template-columns: minmax(0, 1fr) minmax(290px, 360px);
gap: 12px;
align-items: start;
}

.premade-gallery,
.premade-preview {
padding: 14px;
}

.premade-section-title {
display: flex;
align-items: flex-start;
justify-content: space-between;
gap: 10px;
margin-bottom: 12px;
}

.premade-section-title h2 {
margin: 0;
color: #F5E6C8;
font-size: 19px;
}

.premade-section-title p {
margin: 4px 0 0;
color: #CDBA98;
font-size: 12px;
line-height: 1.4;
}

.premade-empty {
color: #CDBA98;
padding: 18px;
border: 1px dashed rgba(192, 138, 61, 0.24);
border-radius: 10px;
background: rgba(46, 29, 19, 0.45);
font-size: 13px;
line-height: 1.45;
}

.premade-card-grid {
display: grid;
grid-template-columns: repeat(auto-fill, minmax(235px, 1fr));
gap: 11px;
}

.premade-card {
background: #2E1D13;
border: 1px solid rgba(192, 138, 61, 0.2);
border-radius: 12px;
display: flex;
flex-direction: column;
overflow: hidden;
transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.premade-card:hover,
.premade-card.selected {
transform: translateY(-2px);
border-color: rgba(224, 177, 92, 0.7);
box-shadow: 0 18px 42px rgba(192, 138, 61, 0.16);
}

.premade-card-main {
appearance: none;
border: 0;
background: transparent;
color: inherit;
text-align: left;
cursor: pointer;
padding: 13px;
display: grid;
gap: 9px;
flex: 1;
}

.premade-card-topline,
.premade-card-meta {
display: flex;
align-items: center;
justify-content: space-between;
gap: 8px;
}

.premade-card-topline > span {
color: #CDBA98;
font-size: 10px;
font-weight: 900;
text-transform: uppercase;
letter-spacing: 0.7px;
}

.premade-card-topline em {
font-style: normal;
color: #F5E6C8;
border: 1px solid rgba(192, 138, 61, 0.46);
background: rgba(192, 138, 61, 0.16);
border-radius: 999px;
padding: 3px 7px;
font-size: 10px;
font-weight: 900;
text-transform: uppercase;
letter-spacing: 0.7px;
}

.premade-card-header,
.premade-preview-card {
display: flex;
align-items: center;
gap: 10px;
}

.premade-avatar {
width: 52px;
height: 52px;
border-radius: 13px;
display: flex;
align-items: center;
justify-content: center;
border: 1px solid rgba(224, 177, 92, 0.36);
background: linear-gradient(135deg, rgba(192, 138, 61, 0.3), rgba(164, 90, 50, 0.32));
color: #F5E6C8;
font-size: 24px;
font-weight: 900;
}

.premade-avatar.small {
width: 40px;
height: 40px;
border-radius: 10px;
font-size: 18px;
flex: 0 0 auto;
}

.premade-card h3,
.premade-preview h3 {
margin: 0;
color: #F5E6C8;
font-size: 16px;
font-weight: 900;
}

.premade-card-header p,
.premade-preview-card p {
margin: 4px 0 0;
color: #CDBA98;
font-size: 11px;
line-height: 1.35;
}

.premade-card-pitch,
.premade-preview-pitch {
margin: 0;
color: #E6D2AA;
font-size: 12px;
line-height: 1.45;
}

.premade-pill {
color: #E6D2AA;
border: 1px solid rgba(192, 138, 61, 0.22);
background: rgba(192, 138, 61, 0.08);
border-radius: 999px;
padding: 4px 7px;
font-size: 10px;
font-weight: 800;
}

.premade-pill-soft {
color: #CDBA98;
background: rgba(245, 230, 200, 0.05);
}

.premade-tags {
display: flex;
flex-wrap: wrap;
gap: 6px;
margin-top: 4px;
}

.premade-tags span {
border: 1px solid rgba(192, 138, 61, 0.22);
background: rgba(192, 138, 61, 0.08);
color: #E6D2AA;
border-radius: 999px;
padding: 4px 7px;
font-size: 10px;
font-weight: 800;
}

.premade-tags.compact span {
font-size: 9px;
}

.premade-card-create {
border: 0;
border-top: 1px solid rgba(192, 138, 61, 0.18);
background: linear-gradient(135deg, rgba(192, 138, 61, 0.24), rgba(164, 90, 50, 0.26));
color: #F5E6C8;
padding: 10px 12px;
font-size: 11px;
font-weight: 900;
letter-spacing: 0.7px;
text-transform: uppercase;
cursor: pointer;
}

.premade-card-create:disabled {
opacity: 0.55;
cursor: not-allowed;
}

.premade-preview {
position: sticky;
top: 14px;
}

.premade-preview-card {
background: linear-gradient(135deg, rgba(192, 138, 61, 0.12), rgba(164, 90, 50, 0.14));
border: 1px solid rgba(224, 177, 92, 0.24);
border-radius: 12px;
padding: 12px;
margin-bottom: 11px;
}

.premade-preview-pitch {
margin-bottom: 12px;
}

.premade-preview-stats {
display: grid;
grid-template-columns: repeat(2, minmax(0, 1fr));
gap: 8px;
margin-bottom: 10px;
}

.premade-preview-stats div {
border: 1px solid rgba(192, 138, 61, 0.22);
background: rgba(46, 29, 19, 0.7);
border-radius: 9px;
padding: 9px;
}

.premade-preview-stats span {
display: block;
color: #CDBA98;
font-size: 10px;
font-weight: 900;
text-transform: uppercase;
letter-spacing: 0.7px;
}

.premade-preview-stats strong {
display: block;
color: #F5E6C8;
font-size: 14px;
margin-top: 3px;
}

.premade-spell-plan {
margin: 0 0 10px;
}

.premade-create-selected {
width: 100%;
padding: 12px;
margin-top: 12px;
}

.premade-edit-note {
display: block;
color: #CDBA98;
font-size: 11px;
text-align: center;
margin-top: 8px;
}

@media (max-width: 980px) {
.premade-hero,
.premade-layout,
.premade-suggest {
grid-template-columns: 1fr;
}

.premade-toolbar,
.premade-filters {
grid-template-columns: 1fr;
}

.premade-preview {
position: static;
}
}

@media (max-width: 560px) {
.premade-page {
padding: 14px;
}

.premade-hero h1 {
font-size: 32px;
}

.premade-card-grid {
grid-template-columns: 1fr;
}

.premade-steps {
display: grid;
}
}
`;
