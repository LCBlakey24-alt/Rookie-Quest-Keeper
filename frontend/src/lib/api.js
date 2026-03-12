const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

export const BACKEND_URL = trimTrailingSlash(
  process.env.REACT_APP_BACKEND_URL || window.location.origin
);

export const API_BASE = `${BACKEND_URL}/api`;
