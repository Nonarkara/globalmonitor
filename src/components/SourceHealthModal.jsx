import React, { useState, useEffect, useCallback } from 'react';
import { X, Database, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import dataSources from '../data/dataSources.json';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useDialogFocus } from '../hooks/useDialogFocus';

const API_BASE = import.meta.env.DEV ? 'http://localhost:4000' : '';

const SourceHealthModal = ({ isOpen, onClose }) => {
    const [healthData, setHealthData] = useState(null);
    const dialogRef = useDialogFocus(isOpen);

    const fetchHealth = useCallback(() => {
        fetch(`${API_BASE}/api/health`)
            .then(r => r.json())
            .then(setHealthData)
            .catch(() => setHealthData(null));
    }, []);

    useEffect(() => {
        if (isOpen) fetchHealth();
    }, [isOpen, fetchHealth]);

    useEscapeKey(isOpen, onClose);

    if (!isOpen) return null;

    const getStatus = (sourceId) => {
        if (!healthData) return { status: 'unknown', color: '#6b665e' };
        // Try to match health data keys to source IDs
        const health = healthData.loaderHealth;
        if (!health) return { status: 'unknown', color: '#6b665e' };
        const key = Object.keys(health).find(k => k.toLowerCase().includes(sourceId));
        if (!key) return { status: 'no-data', color: '#6b665e' };
        const entry = health[key];
        // A loader that served demo/fallback content made no observation: it is
        // not healthy and must never render green. cache.mjs records status
        // 'demo' plus the payload source for exactly this case.
        if (entry.status === 'demo') return { status: 'demo', color: '#f59e0b', message: entry.source, lastCheck: entry.checkedAt };
        if (entry.ok) return { status: 'healthy', color: '#1a7444', lastCheck: entry.checkedAt };
        return { status: 'error', color: '#a72144', message: entry.message, lastCheck: entry.checkedAt };
    };

    const reliabilityColor = (score) => {
        if (score >= 9) return '#1a7444';
        if (score >= 7) return '#f59e0b';
        return '#a72144';
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'none'
        }} onClick={onClose}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Data Provenance and Source Health" style={{
                width: '720px', maxWidth: '95vw', maxHeight: '85vh',
                background: 'rgba(14, 18, 28, 0.95)',
                backdropFilter: 'none',
                borderRadius: '0',
                border: '1px solid var(--line-2)',
                overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', borderBottom: '1px solid var(--line)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Database size={16} style={{ color: '#006eb8' }} />
                        <span style={{ fontSize: 'var(--type-body)', fontWeight: 600, letterSpacing: '1.5px', color: 'var(--ink)', textTransform: 'uppercase' }}>
                            Data Provenance & Source Health
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: 'var(--type-micro)', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                            {dataSources.length} sources · Backend: {healthData ? 'CONNECTED' : 'UNREACHABLE'}
                        </span>
                        <button onClick={onClose} aria-label="Close source health modal" style={{
                            background: 'var(--line)', border: '1px solid var(--line-2)',
                            borderRadius: '0', padding: '6px 12px', color: 'var(--ink-2)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            fontSize: 'var(--type-micro)', fontFamily: 'inherit', minHeight: '32px'
                        }}>
                            <X size={14} /> Close
                        </button>
                    </div>
                </div>

                {/* Source list */}
                <div style={{ overflowY: 'auto', padding: '12px 20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--type-micro)' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--line-2)' }}>
                                {['Source', 'Type', 'Reliability', 'Update Freq', 'Cache TTL', 'Status', 'Methodology'].map(h => (
                                    <th key={h} style={{
                                        padding: '6px 8px', textAlign: 'left',
                                        color: 'var(--ink-3)', fontWeight: 600,
                                        letterSpacing: '0.8px', textTransform: 'uppercase',
                                        fontSize: 'var(--type-micro)'
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {dataSources.map(src => {
                                const health = getStatus(src.id);
                                return (
                                    <tr key={src.id} style={{ borderBottom: '1px solid var(--line)' }}>
                                        <td style={{ padding: '8px 8px' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 'var(--type-micro)' }}>
                                                {src.name}
                                            </div>
                                            <div style={{ color: 'var(--ink-3)', fontSize: 'var(--type-micro)' }}>
                                                {src.fullName}
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 8px', color: 'var(--ink-2)' }}>
                                            {src.type}
                                        </td>
                                        <td style={{ padding: '8px 8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <div style={{
                                                    width: '24px', height: '4px', background: 'var(--line)',
                                                    borderRadius: '0', overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${src.reliability * 10}%`, height: '100%',
                                                        background: reliabilityColor(src.reliability), borderRadius: '0'
                                                    }} />
                                                </div>
                                                <span style={{
                                                    color: reliabilityColor(src.reliability),
                                                    fontFamily: 'var(--font-mono)', fontWeight: 700
                                                }}>
                                                    {src.reliability}/10
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 8px', color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                                            {src.updateFrequency}
                                        </td>
                                        <td style={{ padding: '8px 8px', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                                            {src.cacheTTL}
                                        </td>
                                        <td style={{ padding: '8px 8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {health.status === 'healthy' ? (
                                                    <CheckCircle size={10} style={{ color: '#1a7444' }} />
                                                ) : health.status === 'demo' ? (
                                                    <AlertCircle size={10} style={{ color: '#f59e0b' }} />
                                                ) : health.status === 'error' ? (
                                                    <AlertCircle size={10} style={{ color: '#a72144' }} />
                                                ) : (
                                                    <Clock size={10} style={{ color: '#6b665e' }} />
                                                )}
                                                <span style={{
                                                    color: health.color, fontWeight: 600,
                                                    fontSize: 'var(--type-micro)', textTransform: 'uppercase'
                                                }}>
                                                    {health.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{
                                            padding: '8px 8px', color: 'var(--ink-3)',
                                            maxWidth: '200px', lineHeight: 1.3
                                        }}>
                                            {src.methodology}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Legend */}
                    <div style={{
                        display: 'flex', gap: '16px', marginTop: '14px', padding: '8px 0',
                        borderTop: '1px solid var(--line)',
                        fontSize: 'var(--type-micro)', color: 'var(--ink-3)'
                    }}>
                        <span>Reliability: <strong style={{ color: '#1a7444' }}>9-10</strong> Government/Scientific · <strong style={{ color: '#f59e0b' }}>7-8</strong> Vetted OSINT · <strong style={{ color: '#a72144' }}>&lt;7</strong> Variable</span>
                        <span>All data is cached server-side with stale fallback. Client caches via localStorage.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SourceHealthModal;
