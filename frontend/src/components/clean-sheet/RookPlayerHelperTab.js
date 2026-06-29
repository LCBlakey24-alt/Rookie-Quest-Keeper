import React, { useMemo, useState } from 'react';
import { Bot, Lightbulb, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const mod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
const asArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value).split(/[;,]/).map(item => item.trim()).filter(Boolean);
};

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
    <section className="clean-sheet-panel clean-sheet-rook-tab" aria-label="Rook helper">
      <div className="clean-sheet-rook-hero">
        <div className="clean-sheet-rook-mark"><Bot size={24} /></div>
        <div>
          <p>Rook Helper</p>
          <h2>Suggestions for {character.name}</h2>
          <span>Player tips, reminders, and quick tactical nudges without covering the sheet.</span>
        </div>
      </div>

      <div className="clean-sheet-rook-actions">
        <button type="button" onClick={askRook} disabled={aiLoading}>
          <Sparkles size={16} /> {aiLoading ? 'Rook is thinking…' : 'Ask Rook for a tip'}
        </button>
      </div>

      {aiSuggestion && (
        <article className="clean-sheet-rook-ai-card">
          <strong>Rook says</strong>
          <p>{aiSuggestion}</p>
        </article>
      )}

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
    </section>
  );
}
