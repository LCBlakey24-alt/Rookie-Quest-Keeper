import React from 'react';
import { Check, Heart, Shield, Sparkles, User, Zap } from 'lucide-react';
import { ABILITIES } from '../../lib/characterRules';
import { EDITIONS } from '../../data/characterRules5e';
import PortraitGenerator from '../builder/PortraitGenerator';
import { builderTheme as theme, detailHeaderStyle, traitChipStyle } from './builderTheme';
import { PreviewStat, StepHeader } from './BuilderPrimitives';

const formatAbility = (a) => a.slice(0, 3).toUpperCase();
const formatModifier = (m) => (m >= 0 ? `+${m}` : `${m}`);

export default function BuilderReviewSummary({
  alignment,
  alignments,
  asiBonus,
  background,
  backgroundSkills,
  backstory,
  classData,
  className,
  derivedAc,
  derivedHp,
  dexMod,
  edition,
  flaw,
  ideal,
  inputStyle,
  labelStyle,
  name,
  panelStyle,
  personalityTrait,
  portrait,
  race,
  raceData,
  selectedSkills,
  setAlignment,
  setBackstory,
  setBond,
  setFlaw,
  setIdeal,
  setName,
  setPersonalityTrait,
  setPortrait,
  stats,
  subclass,
  subrace,
  bond
}) {
  return (
    <div>
      <StepHeader icon={Check} title="Review & Name" subtitle="Final touches before your hero is born" color={theme.sunset.gold} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
        <div>
          <label style={labelStyle}>Character Name *</label>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Enter name..." style={inputStyle} data-testid="character-name-input"
          />
        </div>
        <div>
          <label style={labelStyle}>Alignment</label>
          <select value={alignment} onChange={e => setAlignment(e.target.value)} style={inputStyle} data-testid="alignment-select">
            {alignments.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <PortraitGenerator
          character={{
            race, subrace, className, subclass, background, alignment,
            description: backstory
          }}
          portrait={portrait}
          onChange={setPortrait}
        />
      </div>

      <div style={{ ...panelStyle, padding: '16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Sparkles size={14} color="#EF4444" />
          <div style={{ fontSize: 12, fontWeight: 800, color: '#EF4444', letterSpacing: 1 }}>
            PERSONALITY & ROLEPLAY
          </div>
          <span style={{ fontSize: 10, color: theme.text.muted, fontStyle: 'italic' }}>
            optional — but richer AI + GM story hooks
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Personality Trait</label>
            <textarea
              value={personalityTrait} onChange={e => setPersonalityTrait(e.target.value)}
              placeholder="e.g. I speak in riddles, I'm suspicious of strangers..."
              style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
              data-testid="personality-trait-input"
            />
          </div>
          <div>
            <label style={labelStyle}>Ideal</label>
            <textarea
              value={ideal} onChange={e => setIdeal(e.target.value)}
              placeholder="e.g. Knowledge must be shared freely, Chaos is the only truth..."
              style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
              data-testid="ideal-input"
            />
          </div>
          <div>
            <label style={labelStyle}>Bond</label>
            <textarea
              value={bond} onChange={e => setBond(e.target.value)}
              placeholder="e.g. My sister was taken by slavers — I will find her..."
              style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
              data-testid="bond-input"
            />
          </div>
          <div>
            <label style={labelStyle}>Flaw / Fear</label>
            <textarea
              value={flaw} onChange={e => setFlaw(e.target.value)}
              placeholder="e.g. I'm afraid of deep water, I trust too easily..."
              style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
              data-testid="flaw-input"
            />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>Backstory (1-2 paragraphs)</label>
          <textarea
            value={backstory} onChange={e => setBackstory(e.target.value)}
            placeholder="Where did your hero come from? What drives them?"
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            data-testid="backstory-input"
          />
        </div>
      </div>

      <div style={{ ...panelStyle, padding: '20px', background: 'rgba(31, 31, 35, 0.7)' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
          {portrait ? (
            <img src={portrait} alt="" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${theme.sunset.purple}` }}
              onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: theme.bg.surface, border: `1px solid ${theme.sunset.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={28} color="#fff" />
            </div>
          )}
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{name || 'Unnamed Hero'}</div>
            <div style={{ color: theme.text.secondary, fontSize: '14px' }}>
              {race}{subrace && ` (${subrace})`} • {className}{subclass && ` (${subclass})`} • {background}
            </div>
            <div style={{ color: theme.text.muted, fontSize: '12px' }}>{alignment} • Level 1 • {EDITIONS[edition]?.name}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '14px' }}>
          {ABILITIES.map(a => {
            const final = Number(stats[a]) + (asiBonus[a] || 0);
            const mod = Math.floor((final - 10) / 2);
            return (
              <div key={a} style={{ textAlign: 'center', padding: '10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)' }}>
                <div style={{ fontSize: '10px', color: theme.text.muted, fontWeight: 600 }}>{formatAbility(a)}</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{final}</div>
                <div style={{ fontSize: '12px', color: theme.sunset.gold, fontWeight: 600 }}>{formatModifier(mod)}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '14px' }}>
          <PreviewStat icon={Heart} label="HP" value={derivedHp} color="#EF4444" />
          <PreviewStat icon={Shield} label="AC" value={derivedAc} color={theme.sunset.purple} />
          <PreviewStat icon={Zap} label="Init" value={formatModifier(dexMod)} color={theme.sunset.pink} />
          <PreviewStat icon={User} label="Speed" value={`${raceData?.speed || 30}ft`} color={theme.sunset.gold} />
        </div>

        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '12px' }}>
          <div style={detailHeaderStyle}>Skill Proficiencies</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
            {Array.from(new Set([...backgroundSkills, ...selectedSkills])).map(s => (
              <span key={s} style={traitChipStyle}><Check size={11} /> {s}</span>
            ))}
            {[...backgroundSkills, ...selectedSkills].length === 0 && <span style={{ color: theme.text.muted, fontSize: '12px' }}>None</span>}
          </div>
          <div style={detailHeaderStyle}>Saving Throws</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {(classData?.savingThrows || []).map(s => <span key={s} style={traitChipStyle}><Shield size={11} /> {s.charAt(0).toUpperCase() + s.slice(1)}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
