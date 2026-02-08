import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 40,
          color: '#ff3131',
          background: '#1a1a2e',
          fontFamily: 'Consolas, monospace',
          fontSize: 14,
          height: '100vh',
          overflow: 'auto',
        }}>
          <h1 style={{ color: '#ff3131' }}>trenches.exe has crashed</h1>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#e0e0e0', marginTop: 20 }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#808090', marginTop: 10, fontSize: 11 }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: '8px 24px', fontSize: 14, cursor: 'pointer' }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
