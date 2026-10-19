import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            seenRecoverKey: props.recoverKey ?? 0,
        };
        this.recoverAttempted = false;
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    static getDerivedStateFromProps(props, state) {
        if (props.recoverKey != null && props.recoverKey !== state.seenRecoverKey) {
            return {
                hasError: false,
                error: null,
                errorInfo: null,
                seenRecoverKey: props.recoverKey,
            };
        }
        return null;
    }

    componentDidCatch(error, errorInfo) {
        const label = this.props.label || 'App';
        console.error(`ErrorBoundary [${label}] caught:`, error?.message || error, error, errorInfo);
        this.setState({ errorInfo });

        if (typeof this.props.onRecover === 'function' && !this.recoverAttempted) {
            this.recoverAttempted = true;
            this.props.onRecover(error, errorInfo);
        }
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
                        borderRadius: '0',
                        color: '#6b665e',
                        fontSize: 'var(--type-body)',
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
                                border: '1px solid var(--line-2)',
                                color: '#f7f5ef',
                                padding: '4px 12px',
                                borderRadius: '0',
                                cursor: 'pointer',
                                fontSize: 'var(--type-micro)',
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
                <div style={{ color: '#a72144', padding: '20px', background: '#050E20', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                    <h2 style={{ fontSize: 'var(--type-display)' }}>Something went wrong.</h2>
                    <button
                        onClick={this.handleRetry}
                        style={{
                            background: 'var(--line-2)',
                            border: '1px solid var(--ink-3)',
                            color: '#f7f5ef',
                            padding: '8px 24px',
                            borderRadius: '0',
                            cursor: 'pointer',
                            fontSize: 'var(--type-body)'
                        }}
                    >
                        Retry
                    </button>
                    <details style={{ whiteSpace: 'pre-wrap', color: '#6b665e', fontSize: 'var(--type-body)', maxWidth: '600px' }}>
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
