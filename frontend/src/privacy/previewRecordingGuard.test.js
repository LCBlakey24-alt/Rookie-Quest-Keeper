import fs from 'fs';
import path from 'path';

describe('unconsented session recording is not injected at app startup', () => {
  test('the public shell contains no rrweb or remote recorder script on any host', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../../public/index.html'), 'utf8');
    expect(html).not.toMatch(/rrweb|rrweb-recorder|cloudfront\\.net\\/rrweb-recorder/i);
    expect(html).not.toContain('unpkg.com/rrweb');
    // Removing recording must not remove the opt-in analytics gating.
    expect(html).toContain("rqk.analyticsConsent");
    expect(html).toContain("consent !== 'granted'");
    expect(html).toContain('<div id="root"></div>');
  });
});
