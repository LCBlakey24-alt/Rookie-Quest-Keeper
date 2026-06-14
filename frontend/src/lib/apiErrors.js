export function formatApiErrorDetail(detail, fallback = 'Something went wrong') {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => formatApiErrorDetail(item, ''))
      .filter(Boolean);
    return messages.length ? messages.join(' · ') : fallback;
  }

  if (typeof detail === 'object') {
    const location = Array.isArray(detail.loc) ? detail.loc.filter(part => part !== 'body').join('.') : '';
    const message = detail.msg || detail.message || detail.detail;
    if (message) return location ? `${location}: ${message}` : String(message);

    try {
      return JSON.stringify(detail);
    } catch (jsonError) {
      return fallback;
    }
  }

  return String(detail);
}