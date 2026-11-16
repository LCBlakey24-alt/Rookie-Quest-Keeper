import { requiresExternalAiConsent } from './rookAiConsent';

describe('external AI request consent coverage', () => {
  test.each([
    '/rook/chat',
    '/rook/chat?campaign_id=42',
    '/rook/form-fill',
    '/rook/draft',
    '/rook/generate',
    '/unseen-servant/generate',
    '/ai/generate',
    '/character-import/extract',
    '/homebrew/parse-docx',
    '/homebrew/parse-text',
    '/homebrew/complete-draft',
    '/campaigns/campaign-1/npcs/generate',
    '/campaigns/campaign-1/session-recaps',
  ])('asks before sending content to %s', url => {
    expect(requiresExternalAiConsent({ method: 'post', url })).toBe(true);
  });

  test.each(['/rook/draft/save', '/auth/register', '/campaigns', '/campaigns/camp-1/npcs'])(
    'does not gate ordinary non-AI save %s', url => {
      expect(requiresExternalAiConsent({ method: 'post', url })).toBe(false);
    },
  );

  test.each(['get', 'head', 'options'])('read-only %s requests never trigger an AI prompt', method => {
    expect(requiresExternalAiConsent({ method, url: '/rook/chat' })).toBe(false);
  });
});
