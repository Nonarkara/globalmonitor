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
        console.error("ErrorBoundary caught an error", error, errorInfo);
        this.setState({ errorInfo });
        // Persist the most recent crash so it survives a Retry/reload and can be
        // read back off the device when a crash can't be reproduced locally.
        try {
            window.localStorage.setItem('gm:last-error', JSON.stringify({
                at: new Date().toISOString(),
                label: this.props.label || (this.props.inline ? 'inline' : 'page'),
                message: String(error?.message || error),
                stack: String(error?.stack || '').split('\n').slice(0, 8).join('\n'),
                componentStack: String(errorInfo?.componentStack || '').split('\n').slice(0, 8).join('\n'),
            }));
        } catch { /* storage unavailable */ }
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
                        background: 'var(--panel)',
                        border: '1px solid var(--red)',
                        borderRadius: 0,
                        color: 'var(--ink-2)',
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
                                background: 'var(--panel)',
                                border: '1px solid var(--line-2)',
                                color: 'var(--ink)',
                                padding: '4px 12px',
                                borderRadius: 0,
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
                <div style={{ color: 'var(--red)', padding: '20px', background: 'var(--paper)', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                    <h2 style={{ fontSize: '1.5rem' }}>Something went wrong.</h2>
                    <button
                        onClick={this.handleRetry}
                        style={{
                            background: 'var(--panel)',
                            border: '1px solid var(--line-2)',
                            color: 'var(--ink)',
                            padding: '8px 24px',
                            borderRadius: 0,
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        Retry
                    </button>
                    <div style={{ whiteSpace: 'pre-wrap', color: 'var(--ink)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', maxWidth: '760px', textAlign: 'left', background: 'var(--panel)', border: '1px solid var(--line-2)', padding: '12px 14px', lineHeight: 1.5, overflow: 'auto', maxHeight: '40vh' }}>
                        <strong style={{ color: 'var(--red)' }}>{this.state.error && this.state.error.toString()}</strong>
                        {'\n\n'}
                        {this.state.error && this.state.error.stack}
                        {this.state.errorInfo && '\n— component tree —' + this.state.errorInfo.componentStack}
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
