import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Database, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import dataSources from '../data/dataSources.json';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { fetchBackendJson } from '../services/backendClient';
import { resolveSourceHealth } from '../services/sourceHealth';

const SourceHealthModal = ({ isOpen, onClose, theater = 'middleeast' }) => {
    const [healthData, setHealthData] = useState(null);
    const dialogRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return undefined;
        const previous = document.activeElement;
        const dialog = dialogRef.current;
        dialog?.querySelector('button')?.focus();
        const trap = event => {
            if (event.key !== 'Tab') return;
            const controls = [...dialog.querySelectorAll('button, a[href]')];
            const first = controls[0], last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        };
        dialog?.addEventListener('keydown', trap);
        return () => { dialog?.removeEventListener('keydown', trap); previous?.focus?.(); };
    }, [isOpen]);

    const fetchHealth = useCallback(() => {
        fetchBackendJson('/api/health', { theater })
            .then(setHealthData)
            .catch(() => setHealthData(null));
    }, [theater]);

    useEffect(() => {
        if (isOpen) fetchHealth();
    }, [isOpen, fetchHealth]);

    useEscapeKey(isOpen, onClose);

    if (!isOpen) return null;

    const getStatus = (sourceId) => resolveSourceHealth(sourceId, healthData, theater);

    const reliabilityColor = (score) => {
        if (score >= 9) return 'var(--green)';
        if (score >= 7) return 'var(--ink-2)';
        return 'var(--red)';
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(25,23,18,0.45)', backdropFilter: 'none'
        }} onClick={onClose}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="source-health-title" style={{
                width: '720px', maxWidth: '95vw', maxHeight: '85vh',
                background: 'var(--panel)',
                backdropFilter: 'none',
                borderRadius: 0,
                border: '1px solid var(--line-2)',
                overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', borderBottom: '1px solid var(--line)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Database size={16} style={{ color: 'var(--ink)' }} />
                        <span id="source-health-title" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1.5px', color: 'var(--ink)', textTransform: 'uppercase' }}>
                            Data Provenance & Source Health
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.5rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                            {dataSources.length} sources · Backend: {healthData ? 'CONNECTED' : 'UNREACHABLE'}
                        </span>
                        <button onClick={onClose} aria-label="Close source health modal" style={{
                            background: '#f2f0ea', border: '1px solid var(--line)',
                            borderRadius: 0, padding: '6px 12px', color: 'var(--ink-2)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            fontSize: '0.6rem', fontFamily: 'inherit', minHeight: '44px', minWidth: '44px'
                        }}>
                            <X size={14} /> Close
                        </button>
                    </div>
                </div>

                {/* Source list */}
                <div style={{ overflowY: 'auto', padding: '12px 20px' }}>
                    <p style={{ fontSize: '.65rem', color: 'var(--ink-2)', lineHeight: 1.5 }}>
                        {theater} · Evidence from this edge cache only, not global provider uptime.
                        {' '}Editorial scores describe source class; they are not measured accuracy or validation of today’s data.
                    </p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.5rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--line-2)' }}>
                                {['Source', 'Type', 'Editorial score', 'Update Freq', 'Cache TTL', 'Cache evidence', 'Methodology'].map(h => (
                                    <th key={h} style={{
                                        padding: '6px 8px', textAlign: 'left',
                                        color: 'var(--ink-3)', fontWeight: 600,
                                        letterSpacing: '0.8px', textTransform: 'uppercase',
                                        fontSize: '0.5rem'
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
                                            <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.5rem' }}>
                                                {src.name}
                                            </div>
                                            <div style={{ color: 'var(--ink-3)', fontSize: '0.5rem' }}>
                                                {src.fullName}
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 8px', color: 'var(--ink-2)' }}>
                                            {src.type}
                                        </td>
                                        <td style={{ padding: '8px 8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <div style={{
                                                    width: '24px', height: '4px', background: '#f2f0ea',
                                                    borderRadius: 0, overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${src.reliability * 10}%`, height: '100%',
                                                        background: reliabilityColor(src.reliability), borderRadius: 0
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
                                                    <CheckCircle size={10} style={{ color: 'var(--green)' }} />
                                                ) : health.status === 'sample' ? (
                                                    <AlertCircle size={10} style={{ color: 'var(--ink-2)' }} />
                                                ) : health.status === 'error' ? (
                                                    <AlertCircle size={10} style={{ color: 'var(--red)' }} />
                                                ) : (
                                                    <Clock size={10} style={{ color: 'var(--ink-3)' }} />
                                                )}
                                                <span style={{
                                                    color: health.color, fontWeight: 600,
                                                    fontSize: '0.5rem', textTransform: 'uppercase'
                                                }}>
                                                    {health.status}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '.55rem', color: 'var(--ink-3)', marginTop: 3, overflowWrap: 'anywhere' }}>
                                                {health.source || 'No cache evidence for this source'}
                                                {health.observedAt && <div>Observed/fetched: {health.observedAt}</div>}
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
                        fontSize: '0.5rem', color: 'var(--ink-3)'
                    }}>
                        <span>Editorial rubric: 9-10 Government/Scientific · 7-8 OSINT · &lt;7 Variable. Not an empirical accuracy score.</span>
                        <span>All data is cached server-side with stale fallback. Client caches via localStorage.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SourceHealthModal;
