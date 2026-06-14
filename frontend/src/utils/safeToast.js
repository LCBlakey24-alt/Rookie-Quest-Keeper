import { toast } from 'sonner';

let installed = false;
const originalToast = {
  error: toast.error,
  success: toast.success,
  info: toast.info,
  warning: toast.warning,
  message: toast.message,
};

export function normalizeToastMessage(value, fallback = 'Something went wrong') {
  if (value == null) return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Error) return value.message || fallback;

  if (Array.isArray(value)) {
    const parts = value.map(item => normalizeToastMessage(item, '')).filter(Boolean);
    return parts.join('\n') || fallback;
  }

  if (typeof value === 'object') {
    if (typeof value.detail === 'string') return value.detail;
    if (value.detail) return normalizeToastMessage(value.detail, fallback);
    if (typeof value.msg === 'string') return value.msg;
    if (typeof value.message === 'string') return value.message;
    if (typeof value.error === 'string') return value.error;

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function wrapToastMethod(method, fallback) {
  return (message, options) => method(normalizeToastMessage(message, fallback), options);
}

export function installSafeToasts() {
  if (installed) return;
  installed = true;

  toast.error = wrapToastMethod(originalToast.error, 'Something went wrong');
  toast.success = wrapToastMethod(originalToast.success, 'Done');
  toast.info = wrapToastMethod(originalToast.info, 'Info');
  toast.warning = wrapToastMethod(originalToast.warning, 'Warning');
  toast.message = wrapToastMethod(originalToast.message, 'Message');
}
