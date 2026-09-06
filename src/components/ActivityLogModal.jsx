import React, { useState, useSyncExternalStore } from 'react';
import { X, FileText, Download, Trash2 } from 'lucide-react';
import { getActivityLog, subscribeActivityLog, clearActivityLog, LOG_TYPES } from '../services/activityLog';
import { useEscapeKey } from '../hooks/useEscapeKey';

const TYPE_COLORS = {
    [LOG_TYPES.DATA_FETCH]: '#6f6c63',
    [LOG_TYPES.ERROR]: '#a23a26',
    [LOG_TYPES.USER_ACTION]: '#1f6e43',
    [LOG_TYPES.SYSTEM]: '#a9a59a'
};

const TYPE_LABELS = {
    [LOG_TYPES.DATA_FETCH]: 'DATA',
    [LOG_TYPES.ERROR]: 'ERROR',
    [LOG_TYPES.USER_ACTION]: 'ACTION',
    [LOG_TYPES.SYSTEM]: 'SYSTEM'
};

const ActivityLogModal = ({ isOpen, onClose }) => {
    const entries = useSyncExternalStore(subscribeActivityLog, getActivityLog, getActivityLog);
    const [filter, setFilter] = useState('all');

    useEscapeKey(isOpen, onClose);

    if (!isOpen) return null;

    const filtered = filter === 'all'
        ? entries
        : entries.filter(e => e.type === filter);

    const exportLog = () => {
        const text = filtered.map(e =>
            `[${e.timestamp}] [${TYPE_LABELS[e.type] || e.type}] ${e.message}${e.details ? ' | ' + JSON.stringify(e.details) : ''}`
        ).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-activity-${new Date().toISOString().slice(0, 10)}.log`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatTime = (iso) => {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(25,23,18,0.45)'
        }} onClick={onClose}>
            <div style={{
                width: '640px', maxWidth: '95vw', maxHeight: '80vh',
                background: 'var(--panel)',
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
                        <FileText size={16} style={{ color: 'var(--ink)' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1.5px', color: 'var(--ink)', textTransform: 'uppercase' }}>
                            Session Activity Log
                        </span>
                        <span style={{ fontSize: '0.5rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                            {entries.length} entries
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={exportLog} style={{
                            background: '#f2f0ea', border: '1px solid var(--line)',
                            borderRadius: 0, padding: '4px 8px', color: 'var(--ink-2)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            fontSize: '0.5rem', fontFamily: 'inherit'
                        }}>
                            <Download size={10} /> Export
                        </button>
                        <button onClick={clearActivityLog} style={{
                            background: '#f2f0ea', border: '1px solid var(--line-2)',
                            borderRadius: 0, padding: '4px 8px', color: 'var(--red)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            fontSize: '0.5rem', fontFamily: 'inherit'
                        }}>
                            <Trash2 size={10} /> Clear
                        </button>
                        <button onClick={onClose} style={{
                            background: '#f2f0ea', border: '1px solid var(--line)',
                            borderRadius: 0, padding: '6px 12px', color: 'var(--ink-2)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            fontSize: '0.6rem', fontFamily: 'inherit', minHeight: '32px'
                        }}>
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Filter tabs */}
                <div style={{
                    display: 'flex', gap: '4px', padding: '8px 20px',
                    borderBottom: '1px solid var(--line)'
                }}>
                    {['all', LOG_TYPES.DATA_FETCH, LOG_TYPES.ERROR, LOG_TYPES.USER_ACTION, LOG_TYPES.SYSTEM].map(f => (
                        <button key={f} onClick={() => setFilter(f)} style={{
                            padding: '3px 8px', borderRadius: 0, fontSize: '0.5rem',
                            fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase',
                            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                            background: filter === f ? '#f2f0ea' : 'transparent',
                            border: filter === f ? '1px solid var(--line-2)' : '1px solid var(--line)',
                            color: filter === f ? 'var(--ink)' : 'var(--ink-3)'
                        }}>
                            {f === 'all' ? `All (${entries.length})` : `${TYPE_LABELS[f] || f} (${entries.filter(e => e.type === f).length})`}
                        </button>
                    ))}
                </div>

                {/* Log entries */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '8px 20px' }}>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ink-3)', fontSize: '0.5rem' }}>
                            No activity logged yet
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {filtered.slice(0, 100).map(entry => (
                                <div key={entry.id} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                                    padding: '4px 0',
                                    borderBottom: '1px solid var(--line)'
                                }}>
                                    <span style={{
                                        fontSize: '0.5rem', color: 'var(--ink-3)',
                                        fontFamily: 'var(--font-mono)', width: '55px', flexShrink: 0,
                                        marginTop: '1px'
                                    }}>
                                        {formatTime(entry.timestamp)}
                                    </span>
                                    <span style={{
                                        fontSize: '0.5rem', fontWeight: 700,
                                        color: TYPE_COLORS[entry.type] || '#a9a59a',
                                        padding: '1px 4px', borderRadius: 0,
                                        background: '#f2f0ea',
                                        letterSpacing: '0.5px', flexShrink: 0, marginTop: '1px'
                                    }}>
                                        {TYPE_LABELS[entry.type] || entry.type}
                                    </span>
                                    <span style={{ fontSize: '0.5rem', color: 'var(--ink-2)', lineHeight: 1.3 }}>
                                        {entry.message}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityLogModal;
