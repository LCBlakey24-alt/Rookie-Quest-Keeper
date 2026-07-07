import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import FullCharacterCreatorV2 from '@/components/FullCharacterCreatorV2';
import { BACKGROUNDS, CLASSES, RACES } from '@/data/characterRules5e';
import usePlayerRulesOptions, { buildMergedCharacterRules } from '@/hooks/usePlayerRulesOptions';
import './FullCharacterCreatorV2.css';
import './FullCharacterCreatorFlow.css';

function useCampaignIdFromQuery() {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search).get('campaign_id') || '', [location.search]);
}

function applyMergedRules(merged) {
  Object.entries(merged.races || {}).forEach(([name, data]) => {
    RACES[name] = { ...(RACES[name] || {}), ...data };
  });

  Object.entries(merged.classes || {}).forEach(([name, data]) => {
    CLASSES[name] = { ...(CLASSES[name] || {}), ...data };
  });

  Object.entries(merged.backgrounds || {}).forEach(([name, data]) => {
    BACKGROUNDS[name] = { ...(BACKGROUNDS[name] || {}), ...data };
  });
}

export default function CharacterRulesBridge(props) {
  const campaignId = useCampaignIdFromQuery();
  const { options, loading, error, hasCustomContent, counts } = usePlayerRulesOptions({ campaignId });

  const mergedRules = useMemo(() => buildMergedCharacterRules({
    races: RACES,
    classes: CLASSES,
    backgrounds: BACKGROUNDS,
  }, options), [options]);

  applyMergedRules(mergedRules);

  const visibleUploadedCount = ['races', 'classes', 'subclasses', 'backgrounds']
    .reduce((sum, key) => sum + Number(counts?.[key] || 0), 0);

  if (loading) {
    return (
      <main className="full-creator-page">
        <div className="full-creator-loading">Loading your character options…</div>
      </main>
    );
  }

  return (
    <>
      {hasCustomContent && (
        <section className="full-creator-progress-card" aria-label="Uploaded character options loaded">
          <div className="full-creator-progress-heading">
            <span>Uploaded options active</span>
            <strong>{visibleUploadedCount} builder option{visibleUploadedCount === 1 ? '' : 's'} loaded</strong>
          </div>
          <p>Your saved races, classes, subclasses, and backgrounds are merged into this builder. Pick them from the normal dropdowns.</p>
        </section>
      )}
      {error && (
        <section className="full-creator-progress-card" aria-label="Uploaded character options unavailable">
          <div className="full-creator-progress-heading">
            <span>Core rules loaded</span>
            <strong>Uploads unavailable</strong>
          </div>
          <p>The builder could not load uploaded options, so it has fallen back to the bundled core rules for now.</p>
        </section>
      )}
      <FullCharacterCreatorV2 {...props} />
    </>
  );
}
