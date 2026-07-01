import React, { useMemo, useState } from 'react';
import { Bot, BookOpen, HelpCircle, Lightbulb, Sparkles, Swords, Theater } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const mod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
const asArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value).split(/[;,]/).map(item => item.trim()).filter(Boolean);
};

const roundBasics = [
  { title: 'Action', text: 'Your main thing this turn: attack, cast many spells, Dash, Dodge, Disengage, Help, Hide, Ready, Search, Use an Object, or a feature that says it uses an action.' },
  { title: 'Bonus Action', text: 'A smaller extra option. You only get one if a spell, class feature, item, or rule specifically says it uses a bonus action.' },
  { title: 'Movement', text: 'You can move up to your speed during your turn. You can split movement before and after your action.' },
  { title: 'Reaction', text: 'Something you can do outside your turn when a trigger happens, like an opportunity attack, Shield, Counterspell, or a readied action.' },
];

const commonTerms = [
  { title: 'Advantage', text: 'Roll two d20s and use the higher result.' },
  { title: 'Disadvantage', text: 'Roll two d20s and use the lower result.' },
  { title: 'AC', text: 'Armor Class. Attacks usually need to meet or beat this number to hit.' },
  { title: 'DC', text: 'Difficulty Class. Your roll usually needs to meet or beat this number to succeed.' },
  { title: 'Saving Throw', text: 'A defensive roll to resist danger, spells, traps, poison, fear, explosions, and other effects.' },
  { title: 'Concentration', text: 'Some spells need focus. Taking damage may force a Constitution save to keep the spell going.' },
  { title: 'Proficiency', text: 'A bonus added to things your character is trained in, such as skills, attacks, saves, tools, or weapons.' },
  { title: 'Opportunity Attack', text: 'A reaction attack you can usually make when a creature leaves your reach without Disengaging.' },
];

function buildTips(character) {
  const maxHp = Number(character?.max_hit_points || character?.max_hp || 10);
  const currentHp = Number(character?.current_hit_points || character?.hp || maxHp);
  const className = character?.character_class || character?.class_name || character?.class || 'adventurer';
  const level = Number(character?.level || 1);
  const scores = {
    Strength: Number(character?.strength || 10),
    Dexterity: Number(character?.dexterity || 10),
    Constitution: Number(character?.constitution || 10),
    Intelligence: Number(character?.intelligence || 10),
    Wisdom: Number(character?.wisdom || 10),
    Charisma: Number(character?.charisma || 10),
  };
  const [bestAbility, bestScore] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0] || ['Ability', 10];
  const skills = asArray(character?.skill_proficiencies || character?.skills || character?.proficiencies?.skills);
  const conditions = asArray(character?.conditions);
  const tips = [];

  if (currentHp <= maxHp * 0.25) {
    tips.push({ title: 'Critical HP', tag: 'Survive', text: `${currentHp}/${maxHp} HP. Pull back, use cover, heal, Dodge, or ask an ally to protect you before another hit lands.` });
  } else if (currentHp <= maxHp * 0.5) {
    tips.push({ title: 'Low HP', tag: 'Careful', text: `${currentHp}/${maxHp} HP. Consider ranged support, cover, Help, Dodge, or Disengage instead of trading hits.` });
  }

  tips.push({ title: `${bestAbility} lead`, tag: `Mod ${mod(bestScore) >= 0 ? '+' : ''}${mod(bestScore)}`, text: `Your standout stat is ${bestAbility}. When you describe a plan, frame it around that strength so the GM has a clear roll to call for.` });
  tips.push({ title: 'Use your whole turn', tag: 'Action economy', text: 'Before ending your turn, check Action, Bonus Action, Movement, Reaction, and whether Help, Dodge, Ready, or Hide would help the party.' });
  tips.push({ title: `${className} level ${level}`, tag: 'Table role', text: `Think about what your ${className} does better than the rest of the party this round, then set up that moment clearly.` });

  skills.slice(0, 3).forEach(skill => {
    tips.push({ title: `${skill} spotlight`, tag: 'Skill', text: `You are trained in ${skill}. Volunteer it when scouting, negotiating, investigating, recalling lore, or setting up another player's idea.` });
  });

  conditions.slice(0, 2).forEach(condition => {
    tips.push({ title: `${condition} active`, tag: 'Condition', text: `You currently have ${condition}. Ask what it changes and what action, save, spell, or ally can remove it.` });
  });

  return tips.slice(0, 8);
}

function HelperSection({ icon: Icon, title, children }) {
  return (
    <section className="clean-sheet-panel clean-sheet-wide clean-sheet-rook-guide-section">
      <div className="clean-sheet-section-heading-row">
        <h2><Icon size={18} /> {title}</h2>
      </div>
      {children}
    </section>
  );
}

function GuideGrid({ items }) {
  return (
    <div className="clean-sheet-rook-grid clean-sheet-rook-guide-grid">
      {items.map((item) => (
        <article key={item.title} className="clean-sheet-rook-card">
          <div>
            <HelpCircle size={15} />
            <strong>{item.title}</strong>
          </div>
          <p>{item.text}</p>
        </article>
      ))}
    </div>
  );
}

export default function RookPlayerHelperTab({ character }) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const tips = useMemo(() => buildTips(character), [character]);

  const askRook = async () => {
    if (aiLoading || !character) return;
    setAiLoading(true);
    setAiSuggestion('');
    try {
      const prompt = [
        `Character: ${character.name}, ${character.character_class || 'unknown class'} level ${character.level || 1}`,
        `HP: ${character.current_hit_points || character.hp || character.max_hit_points || character.max_hp}/${character.max_hit_points || character.max_hp || 10}`,
        `Conditions: ${asArray(character.conditions).join(', ') || 'none'}`,
        `Skills: ${asArray(character.skill_proficiencies || character.skills || character.proficiencies?.skills).join(', ') || 'unknown'}`,
        'Give one short, practical player tip for the current turn or scene. Keep it under 3 sentences.'
      ].join('\n');

      const response = await apiClient.post('/rook/chat', {
        message: prompt,
        campaign_id: character?.campaign_id || '',
        context: 'You are ROOK, a text-only player-side TTRPG helper. Give concise actionable play tips. Never suggest AI images or artwork.'
      });
      setAiSuggestion(response.data?.response || 'Rook could not find a specific tip, but checking your action economy is always a good start.');
    } catch {
      toast.error('Rook could not generate a suggestion right now');
    } finally {
      setAiLoading(false);
    }
  };

  if (!character) return null;

  return (
    <div className="clean-sheet-grid clean-sheet-rook-helper-tab" aria-label="Rook helper">
      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-rook-tab">
        <div className="clean-sheet-rook-hero">
          <div className="clean-sheet-rook-mark"><Bot size={24} /></div>
          <div>
            <p>Rook Helper</p>
            <h2>Help for playing {character.name}</h2>
            <span>Player guidance, rules reminders, combat suggestions, and roleplay prompts live here.</span>
          </div>
        </div>

        <div className="clean-sheet-rook-actions">
          <button type="button" onClick={askRook} disabled={aiLoading}>
            <Sparkles size={16} /> {aiLoading ? 'Rook is thinking…' : 'Ask Rook what I could do'}
          </button>
        </div>

        {aiSuggestion && (
          <article className="clean-sheet-rook-ai-card">
            <strong>Rook says</strong>
            <p>{aiSuggestion}</p>
          </article>
        )}
      </section>

      <HelperSection icon={Swords} title="How combat rounds work">
        <GuideGrid items={roundBasics} />
      </HelperSection>

      <HelperSection icon={BookOpen} title="Common table terms">
        <GuideGrid items={commonTerms} />
      </HelperSection>

      <HelperSection icon={Theater} title="Character prompts">
        <div className="clean-sheet-rook-grid">
          {tips.map((tip) => (
            <article key={`${tip.title}-${tip.tag}`} className="clean-sheet-rook-card">
              <div>
                <Lightbulb size={15} />
                <strong>{tip.title}</strong>
                <span>{tip.tag}</span>
              </div>
              <p>{tip.text}</p>
            </article>
          ))}
        </div>
      </HelperSection>
    </div>
  );
}
