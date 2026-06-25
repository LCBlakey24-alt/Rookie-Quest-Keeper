import React from 'react';

const DEFAULT_OPTIONS = {
  subclass: ['Choose later in full edit', 'Rook-suggested story fit', 'Manual choice noted'],
  'asi-or-feat': ['ASI: boost primary ability', 'ASI: primary + Constitution', 'Feat: choose in full edit', 'Rook-suggested feat'],
  'spell-swap': ['No swap for now', 'Swap a rarely used spell', 'Rook review needed'],
  'spell-known': ['Rook-balanced spell picks', 'Choose spells in full edit', 'Manual picks noted'],
  'spell-preparation': ['Rook-balanced prepared list', 'Prepare in full edit', 'Manual prepared list noted'],
  invocation: ['Rook-suggested invocation', 'Choose in full edit', 'Manual invocation noted'],
  'fighting-style': ['Rook-suggested style', 'Choose in full edit', 'Manual style noted'],
  expertise: ['Rook-suggested expertise', 'Choose in full edit', 'Manual expertise noted'],
  metamagic: ['Rook-suggested metamagic', 'Choose in full edit', 'Manual metamagic noted'],
  'magical-secrets': ['Rook-suggested spells', 'Choose in full edit', 'Manual spells noted'],
};

export function buildCatchUpLevelProgression(plan, selections = {}) {
  return (plan?.choices || []).reduce((progression, choice) => {
    const selected = selections[choice.id] || {};
    progression[String(choice.level)] = progression[String(choice.level)] || { choices: [] };
    progression[String(choice.level)].choices.push({
      id: choice.id,
      type: choice.type,
      title: choice.title,
      required: choice.required,
      status: selected.status || (choice.required ? 'needs-review' : 'optional'),
      selection: selected.selection || '',
      note: selected.note || '',
      rook_prompt: choice.rook || '',
    });
    return progression;
  }, {});
}

export default function BasicCatchUpChoicesPanel({
  plan,
  selections,
  onSelectionChange,
  velvet,
  pillStyle,
}) {
  if (!plan) return null;

  const setChoice = (choiceId, patch) => {
    onSelectionChange?.({
      ...selections,
      [choiceId]: {
        ...(selections?.[choiceId] || {}),
        ...patch,
      },
    });
  };

  const choices = plan.choices || [];
  const completedCount = choices.filter(choice => selections?.[choice.id]?.status === 'done').length;

  return (
    <section style={{ marginTop: 14, padding: 12, borderRadius: 10, border: '1px solid rgba(224, 177, 92, 0.24)', background: 'rgba(46, 29, 19, 0.48)' }} data-testid="basic-catch-up-choices-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', marginBottom: 10 }}>
        <div>
          <h3 style={{ margin: 0, color: velvet.text, fontSize: 15 }}>Catch-up choices</h3>
          <p style={{ margin: '5px 0 0', color: velvet.muted, fontSize: 12, lineHeight: 1.4 }}>
            Mark what is decided now. Anything left as review will be saved onto the sheet for the full editor or level-up flow.
          </p>
        </div>
        <span style={pillStyle}>{completedCount}/{choices.length} decided</span>
      </div>

      {choices.length === 0 ? (
        <p style={{ margin: 0, color: velvet.muted, fontSize: 12 }}>No catch-up choices for this class and level.</p>
      ) : (
        <div style={{ display: 'grid', gap: 9 }}>
          {choices.map(choice => {
            const selected = selections?.[choice.id] || {};
            const options = DEFAULT_OPTIONS[choice.type] || ['Rook review needed', 'Choose in full edit', 'Manual choice noted'];
            return (
              <article key={choice.id} style={{ display: 'grid', gap: 7, paddingTop: 9, borderTop: '1px solid rgba(192,138,61,0.14)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                  <div>
                    <strong style={{ color: velvet.text, fontSize: 12 }}>Lv {choice.level}: {choice.title}</strong>
                    <p style={{ margin: '2px 0 0', color: velvet.muted, fontSize: 11, lineHeight: 1.35 }}>{choice.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChoice(choice.id, { status: selected.status === 'done' ? 'needs-review' : 'done' })}
                    style={{
                      border: `1px solid ${selected.status === 'done' ? 'rgba(122,155,102,0.55)' : 'rgba(192,138,61,0.28)'}`,
                      background: selected.status === 'done' ? 'rgba(122,155,102,0.16)' : 'rgba(46,29,19,0.72)',
                      color: velvet.text,
                      borderRadius: 999,
                      padding: '5px 8px',
                      fontSize: 10,
                      fontWeight: 900,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {selected.status === 'done' ? '✓ Decided' : choice.required ? 'Needs review' : 'Optional'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 180px) minmax(0, 1fr)', gap: 8 }}>
                  <select
                    value={selected.selection || ''}
                    onChange={(event) => setChoice(choice.id, { selection: event.target.value })}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: 8, background: velvet.card, border: '1px solid rgba(192, 138, 61, 0.34)', color: velvet.text, fontSize: 12 }}
                  >
                    <option value="">Choose approach...</option>
                    {options.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                  <input
                    value={selected.note || ''}
                    onChange={(event) => setChoice(choice.id, { note: event.target.value })}
                    placeholder="Optional note for this choice..."
                    style={{ width: '100%', padding: '9px 10px', borderRadius: 8, background: velvet.card, border: '1px solid rgba(192, 138, 61, 0.34)', color: velvet.text, fontSize: 12 }}
                  />
                </div>

                {choice.rook && <p style={{ margin: 0, color: velvet.softText, fontSize: 11, lineHeight: 1.35 }}>Rook: {choice.rook}</p>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
