import React from 'react';
import { AUTH_TOKEN_KEY, AUTH_USERNAME_KEY } from '@/lib/auth';
import apiClient from '@/lib/apiClient';

function createErrorReference(error) {
  const raw = `${error?.message || 'unknown'}-${Date.now()}-${Math.random()}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return `RQK-${Math.abs(hash).toString(36).toUpperCase().slice(0, 8)}`;
}

function truncate(value = '', maxLength = 1900) {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n\n[Report truncated]` : text;
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorReference: '',
      reportStatus: 'idle',
      reportMessage: '',
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error, errorReference: createErrorReference(error) };
  }

  componentDidCatch(error, errorInfo) {
    this.setState(prev => ({ errorInfo, errorReference: prev.errorReference || createErrorReference(error) }));
    // Keep this visible in browser dev tools without depending on any logging service.
    // eslint-disable-next-line no-console
    console.error('Rookie Quest Keeper render error:', error, errorInfo);
  }

  handleSendReport = async () => {
    const { error, errorInfo, errorReference } = this.state;
    const message = error?.message || 'Unknown render error';
    const username = localStorage.getItem(AUTH_USERNAME_KEY) || localStorage.getItem('username') || 'Unknown';
    const pagePath = `${window.location.pathname}${window.location.search}`;
    const reportText = [
      `Error code: ${errorReference}`,
      `Message: ${message}`,
      `Page: ${window.location.href}`,
      `User: ${username}`,
      `Browser: ${navigator.userAgent}`,
      'Component stack:',
      errorInfo?.componentStack || 'No component stack available.',
      'JavaScript stack:',
      error?.stack || 'No JavaScript stack available.',
    ].join('\n\n');

    this.setState({ reportStatus: 'sending', reportMessage: '' });
    try {
      await apiClient.post('/feedback', {
        category: 'bug',
        area: 'app-error-boundary',
        title: `App error ${errorReference}`,
        message: truncate(reportText),
        page_path: pagePath.slice(0, 240),
        priority: 'urgent',
      });
      this.setState({ reportStatus: 'sent', reportMessage: 'Report sent to admin.' });
    } catch (sendError) {
      this.setState({
        reportStatus: 'failed',
        reportMessage: sendError?.response?.data?.detail || 'Could not send report. Please copy the error code and send it to admin.',
      });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null }, () => {
      window.location.assign('/home');
    });
  };

  handleLogout = () => {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USERNAME_KEY);
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
    } catch {
      // Ignore storage failures and still attempt to move the user to login.
    }
    window.location.assign('/auth');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message || 'Unknown render error';
    const isSending = this.state.reportStatus === 'sending';
    const isSent = this.state.reportStatus === 'sent';

    return (
      <main style={styles.shell} data-testid="app-error-boundary">
        <section style={styles.card}>
          <div style={styles.badge}>Recovery Mode</div>
          <h1 style={styles.title}>Something went wrong</h1>
          <p style={styles.copy}>
            The app hit a screen error instead of showing the page. Use one of the buttons below to recover. This prevents the blank-screen problem while we track the exact page causing it.
          </p>

          <div style={styles.referenceBox}>
            <strong style={styles.referenceLabel}>Error code</strong>
            <code style={styles.referenceText}>{this.state.errorReference}</code>
          </div>

          <div style={styles.errorBox}>
            <strong style={styles.errorLabel}>Error</strong>
            <code style={styles.errorText}>{message}</code>
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={this.handleSendReport} disabled={isSending || isSent} style={styles.reportButton}>
              {isSent ? 'Report sent' : isSending ? 'Sending...' : 'Send report to admin'}
            </button>
            <button type="button" onClick={this.handleReload} style={styles.primaryButton}>Reload page</button>
            <button type="button" onClick={this.handleHome} style={styles.secondaryButton}>Go Home</button>
            <button type="button" onClick={this.handleLogout} style={styles.dangerButton}>Log out</button>
          </div>

          {this.state.reportMessage && <p style={this.state.reportStatus === 'sent' ? styles.successText : styles.warningText}>{this.state.reportMessage}</p>}

          <details style={styles.details}>
            <summary style={styles.summary}>Technical details</summary>
            <pre style={styles.stack}>{this.state.errorInfo?.componentStack || 'No component stack available.'}</pre>
          </details>
        </section>
      </main>
    );
  }
}

const styles = {
  shell: {
    minHeight: '100dvh',
    background: 'var(--rq-bg-main, #120C08)',
    color: 'var(--rq-text-primary, #F5E6C8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(14px, 4vw, 32px)',
  },
  card: {
    width: 'min(100%, 640px)',
    background: 'var(--rq-bg-panel, #21150E)',
    border: '1px solid var(--rq-accent-border, rgba(192,138,61,0.32))',
    borderRadius: 12,
    padding: 'clamp(18px, 5vw, 30px)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  },
  badge: {
    display: 'inline-flex',
    color: 'var(--rq-accent-hover, #E0B15C)',
    background: 'rgba(192,138,61,0.12)',
    border: '1px solid rgba(192,138,61,0.28)',
    borderRadius: 999,
    padding: '5px 10px',
    fontSize: 12,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  title: {
    margin: '0 0 10px',
    fontSize: 'clamp(24px, 7vw, 34px)',
    fontWeight: 900,
    color: 'var(--rq-text-primary, #F5E6C8)',
  },
  copy: {
    color: 'var(--rq-text-secondary, #E6D2AA)',
    lineHeight: 1.6,
    margin: '0 0 18px',
    fontSize: 15,
  },
  referenceBox: {
    background: 'rgba(192,138,61,0.12)',
    border: '1px solid rgba(192,138,61,0.28)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    overflowX: 'auto',
  },
  referenceLabel: {
    display: 'block',
    color: 'var(--rq-accent-hover, #E0B15C)',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  referenceText: {
    color: 'var(--rq-text-primary, #F5E6C8)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontWeight: 900,
  },
  errorBox: {
    background: 'rgba(0,0,0,0.24)',
    border: '1px solid rgba(239,68,68,0.28)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    overflowX: 'auto',
  },
  errorLabel: {
    display: 'block',
    color: '#FCA5A5',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  errorText: {
    color: 'var(--rq-text-primary, #F5E6C8)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  actions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: 10,
    marginBottom: 16,
  },
  reportButton: {
    minHeight: 46,
    border: '1px solid rgba(192,138,61,0.35)',
    borderRadius: 8,
    background: 'rgba(192,138,61,0.18)',
    color: 'var(--rq-text-primary, #F5E6C8)',
    fontWeight: 900,
    cursor: 'pointer',
  },
  primaryButton: {
    minHeight: 46,
    border: 'none',
    borderRadius: 8,
    background: 'var(--rq-accent-primary, #C08A3D)',
    color: 'var(--rq-text-inverse, #120C08)',
    fontWeight: 900,
    cursor: 'pointer',
  },
  secondaryButton: {
    minHeight: 46,
    border: '1px solid var(--rq-border-default, rgba(192,138,61,0.14))',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--rq-text-primary, #F5E6C8)',
    fontWeight: 900,
    cursor: 'pointer',
  },
  dangerButton: {
    minHeight: 46,
    border: '1px solid rgba(239,68,68,0.35)',
    borderRadius: 8,
    background: 'rgba(239,68,68,0.12)',
    color: '#FCA5A5',
    fontWeight: 900,
    cursor: 'pointer',
  },
  successText: {
    color: '#86EFAC',
    fontWeight: 800,
    margin: '-4px 0 14px',
  },
  warningText: {
    color: '#FCA5A5',
    fontWeight: 800,
    margin: '-4px 0 14px',
  },
  details: {
    color: 'var(--rq-text-secondary, #E6D2AA)',
    fontSize: 13,
  },
  summary: {
    cursor: 'pointer',
    fontWeight: 900,
  },
  stack: {
    marginTop: 10,
    maxHeight: '32dvh',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    color: 'var(--rq-text-secondary, #E6D2AA)',
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    padding: 10,
    fontSize: 11,
  },
};

export default AppErrorBoundary;
