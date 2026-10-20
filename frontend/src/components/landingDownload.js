// Only an explicitly configured, reviewed Windows release can appear on
// the public website. Never fall back to an old/unsigned GitHub "latest" link.
export function publicWindowsInstallerUrl(candidate) {
  if (typeof candidate !== 'string' || !candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' || url.hostname !== 'github.com'
        || url.username || url.password || url.port || url.search || url.hash) return null;
    const match = /^\/LCBlakey24-alt\/Rookie-Quest-Keeper\/releases\/download\/desktop-v(\d+)\.(\d+)\.(\d+)\/[^/]+\.exe$/i.exec(url.pathname);
    if (!match) return null;
    const [major, minor] = match.slice(1, 3).map(Number);
    if (major < 1 && minor < 5) return null; // No legacy unsigned 0.4.x links.
    return url.href;
  } catch {
    return null;
  }
}
