import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        const label = this.props.label || 'App';
        console.error(`ErrorBoundary [${label}] caught:`, error?.message || error, error, errorInfo);
        this.setState({ errorInfo });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            // Component-level (inline) fallback — small, non-destructive
            if (this.props.inline) {
                return (
                    <div style={{
                        padding: '12px 16px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '10px',
                        color: '#94a3b8',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        pointerEvents: 'auto'
                    }}>
                        <span>{this.props.label || 'Panel'} failed to render</span>
                        <button
                            onClick={this.handleRetry}
                            style={{
                                background: 'var(--line-2)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: '#f8fafc',
                                padding: '4px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                                fontWeight: 600
                            }}
                        >
                            Retry
                        </button>
                    </div>
                );
            }

            // Full-page fallback
            return (
                <div style={{ color: '#ef4444', padding: '20px', background: '#050E20', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                    <h2 style={{ fontSize: '1.5rem' }}>Something went wrong.</h2>
                    <button
                        onClick={this.handleRetry}
                        style={{
                            background: 'var(--line-2)',
                            border: '1px solid var(--ink-3)',
                            color: '#f8fafc',
                            padding: '8px 24px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        Retry
                    </button>
                    <details style={{ whiteSpace: 'pre-wrap', color: '#94a3b8', fontSize: '0.8rem', maxWidth: '600px' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
