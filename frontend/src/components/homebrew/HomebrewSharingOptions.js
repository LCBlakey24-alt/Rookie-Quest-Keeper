import React, { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';
import './HomebrewSharingOptions.css';

export const CONTENT_SOURCES = [
  { id: 'original', label: 'My own creation', hint: 'You wrote it.' },
  { id: 'free_licence', label: 'Free to share', hint: 'SRD or other openly licensed text.' },
  { id: 'published_book', label: 'From a book I own', hint: 'Kept to you and your table.' },
];

const SHARE_OPTIONS = [
  { id: 'private', label: 'Just me' },
  { id: 'campaign', label: 'My campaign' },
  { id: 'public', label: 'Anyone' },
];

/**
 * Where a homebrew entry comes from and who may use it. Content copied from
 * a published book can only be private or shared with one of your own
 * campaigns: players there can use it while they play, but nobody can copy
 * or publish it.
 */
export default function HomebrewSharingOptions({ source, onSourceChange, visibility, onVisibilityChange, campaignId, onCampaignChange }) {
  const [campaigns, setCampaigns] = useState([]);
  const fromBook = source === 'published_book';

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => apiClient.get('/campaigns'))
      .then((response) => {
        if (cancelled) return;
        const list = Array.isArray(response?.data) ? response.data : (response?.data?.campaigns || []);
        setCampaigns(list.filter((campaign) => campaign?.id));
      })
      .catch(() => { if (!cancelled) setCampaigns([]); });
    return () => { cancelled = true; };
  }, []);

  // A book's text can never be public: step it back to private if needed.
  useEffect(() => {
    if (fromBook && (visibility === 'public' || visibility === 'shared_copy')) onVisibilityChange('private');
  }, [fromBook, visibility, onVisibilityChange]);

  const options = visibility === 'shared_copy'
    ? [...SHARE_OPTIONS, { id: 'shared_copy', label: 'Shared copy (older setting)' }]
    : SHARE_OPTIONS;

  return (
    <section className="hb-share" aria-label="Sharing" data-testid="hb-sharing">
      <fieldset>
        <legend>Where is this from?</legend>
        <div className="hb-share__choices">
          {CONTENT_SOURCES.map((option) => (
            <label key={option.id} className={`hb-share__choice${source === option.id ? ' is-selected' : ''}`}>
              <input type="radio" name="hb-content-source" value={option.id} checked={source === option.id} onChange={() => onSourceChange(option.id)} data-testid={`hb-source-${option.id}`} />
              <strong>{option.label}</strong>
              <small>{option.hint}</small>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Who can use it?</legend>
        <div className="hb-share__choices">
          {options.map((option) => {
            const blocked = fromBook && (option.id === 'public' || option.id === 'shared_copy');
            return (
              <label key={option.id} className={`hb-share__choice${visibility === option.id ? ' is-selected' : ''}${blocked ? ' is-blocked' : ''}`}>
                <input type="radio" name="hb-visibility" value={option.id} checked={visibility === option.id} disabled={blocked}
                  onChange={() => onVisibilityChange(option.id)} data-testid={`hb-visibility-${option.id}`} />
                <strong>{option.label}</strong>
                {blocked && <small>Not for book content</small>}
              </label>
            );
          })}
        </div>
      </fieldset>

      {visibility === 'campaign' && (
        <label className="hb-share__campaign">
          <span>Campaign</span>
          <select value={campaignId} onChange={(event) => onCampaignChange(event.target.value)} data-testid="hb-campaign">
            <option value="">Choose a campaign you run…</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name || 'Untitled campaign'}</option>)}
            {campaignId && !campaigns.some((campaign) => campaign.id === campaignId) && <option value={campaignId}>Saved campaign</option>}
          </select>
        </label>
      )}

      <p className="hb-share__note" role="note">
        {fromBook
          ? 'Book content stays with you and your campaign. Your players can use it for characters in that campaign, but they cannot copy, export or publish it.'
          : visibility === 'campaign'
            ? 'Players in that campaign can use this when they build or level up characters for it.'
            : visibility === 'public'
              ? 'Anyone may use this. Only share content you wrote or that is free to share.'
              : 'Only you can see and use this.'}
      </p>
    </section>
  );
}
