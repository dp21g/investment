import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#dc2626' }}>
          <h1>💥 Something went wrong.</h1>
          <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
            <h3 style={{ marginTop: 0 }}>Error:</h3>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
            <h3>Component Stack:</h3>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: '#666' }}>
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
