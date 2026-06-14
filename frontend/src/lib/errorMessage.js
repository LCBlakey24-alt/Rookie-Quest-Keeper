export function getErrorMessage(error, fallback = 'Something went wrong') {
  const detail = error?.response?.data?.detail ?? error?.response?.data?.message ?? error?.message ?? error;
  return stringifyErrorDetail(detail, fallback);
}

export function stringifyErrorDetail(detail, fallback = 'Something went wrong') {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (typeof detail === 'number' || typeof detail === 'boolean') return String(detail);

  if (Array.isArray(detail)) {
    const messages = detail.map(item => stringifyErrorDetail(item, '')).filter(Boolean);
    return messages.length ? messages.join('; ') : fallback;
  }

  if (typeof detail === 'object') {
    if (typeof detail.msg === 'string') return detail.msg;
    if (typeof detail.message === 'string') return detail.message;
    if (typeof detail.detail === 'string') return detail.detail;
    if (Array.isArray(detail.detail)) return stringifyErrorDetail(detail.detail, fallback);

    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }

  return fallback;
}
