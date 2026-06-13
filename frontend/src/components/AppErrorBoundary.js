import React from 'react';
import { AUTH_TOKEN_KEY, AUTH_USERNAME_KEY } from '@/lib/auth';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Keep this visible in browser dev tools without depending on any logging service.
    // eslint-disable-next-line no-console
    console.error('Rookie Quest Keeper render error:', error, errorInfo);
  }

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

    return (
      <main style={styles.shell} data-testid="app-error-boundary">
        <section style={styles.card}>
          <div style={styles.badge}>Recovery Mode</div>
          <h1 style={styles.title}>Something went wrong</h1>
          <p style={styles.copy}>
            The app hit a screen error instead of showing the page. Use one of the buttons below to recover. This prevents the blank-screen problem while we track the exact page causing it.
          </p>

          <div style={styles.errorBox}>
            <strong style={styles.errorLabel}>Error</strong>
            <code style={styles.errorText}>{message}</code>
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={this.handleReload} style={styles.primaryButton}>Reload page</button>
            <button type="button" onClick={this.handleHome} style={styles.secondaryButton}>Go Home</button>
            <button type="button" onClick={this.handleLogout} style={styles.dangerButton}>Log out</button>
          </div>

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
    background: 'var(--rq-bg-main, #080B1A)',
    color: 'var(--rq-text-primary, #FFFFFF)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(14px, 4vw, 32px)',
  },
  card: {
    width: 'min(100%, 640px)',
    background: 'var(--rq-bg-panel, #12172A)',
    border: '1px solid var(--rq-accent-border, rgba(124,58,237,0.32))',
    borderRadius: 12,
    padding: 'clamp(18px, 5vw, 30px)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  },
  badge: {
    display: 'inline-flex',
    color: '#C084FC',
    background: 'rgba(192,132,252,0.12)',
    border: '1px solid rgba(192,132,252,0.28)',
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
    color: '#FFFFFF',
  },
  copy: {
    color: '#CBD5E1',
    lineHeight: 1.6,
    margin: '0 0 18px',
    fontSize: 15,
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
    color: '#FFFFFF',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  actions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: 10,
    marginBottom: 16,
  },
  primaryButton: {
    minHeight: 46,
    border: 'none',
    borderRadius: 8,
    background: 'var(--rq-accent-primary, #7C3AED)',
    color: '#FFFFFF',
    fontWeight: 900,
    cursor: 'pointer',
  },
  secondaryButton: {
    minHeight: 46,
    border: '1px solid var(--rq-border-default, rgba(191,219,254,0.14))',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.05)',
    color: '#FFFFFF',
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
  details: {
    color: '#CBD5E1',
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
    color: '#CBD5E1',
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    padding: 10,
    fontSize: 11,
  },
};

export default AppErrorBoundary;
