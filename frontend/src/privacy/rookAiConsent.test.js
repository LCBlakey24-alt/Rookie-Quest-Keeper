import { requiresExternalAiConsent } from './rookAiConsent';

describe('UK privacy: external AI calls require informed permission', () => {
  test.each([
    '/rook/chat',
    '/rook/chat?campaign_id=42',
    '/rook/form-fill',
    '/rook/draft',
    '/rook/generate',
    '/unseen-servant/generate',
    '/ai/generate',
    '/ai/session-recap',
    '/character-import/extract',
  ])('requires consent before posting to %s', (url) => {
    expect(requiresExternalAiConsent({ method: 'post', url })).toBe(true);
  });

  test.each([
    '/rook/draft/save',
    '/auth/register',
    '/campaigns',
    '/campaigns/42/npcs',
    '/auth/me',
  ])('does not prompt for ordinary save/request to %s', (url) => {
    expect(requiresExternalAiConsent({ method: 'post', url })).toBe(false);
  });

  test('read-only requests never prompt for AI permission', () => {
    expect(requiresExternalAiConsent({ method: 'get', url: '/rook/chat' })).toBe(false);
  });
});
