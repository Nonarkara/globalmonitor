import React, { useState, useSyncExternalStore } from 'react';
import { X, FileText, Download, Trash2 } from 'lucide-react';
import { getActivityLog, subscribeActivityLog, clearActivityLog, LOG_TYPES } from '../services/activityLog';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useDialogFocus } from '../hooks/useDialogFocus';

const TYPE_COLORS = {
    [LOG_TYPES.DATA_FETCH]: '#006eb8',
    [LOG_TYPES.ERROR]: '#a72144',
    [LOG_TYPES.USER_ACTION]: '#1a7444',
    [LOG_TYPES.SYSTEM]: '#6b665e'
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
    const dialogRef = useDialogFocus(isOpen);

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
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const formatTime = (iso) => {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'none'
        }} onClick={onClose}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Session Activity Log" style={{
                width: '640px', maxWidth: '95vw', maxHeight: '80vh',
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
                        <FileText size={16} style={{ color: '#f59e0b' }} />
                        <span style={{ fontSize: 'var(--type-body)', fontWeight: 600, letterSpacing: '1.5px', color: 'var(--ink)', textTransform: 'uppercase' }}>
                            Session Activity Log
                        </span>
                        <span style={{ fontSize: 'var(--type-micro)', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                            {entries.length} entries
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button aria-label="Export session log" onClick={exportLog} style={{
                            background: 'var(--line)', border: '1px solid var(--line-2)',
                            borderRadius: '0', padding: '4px 8px', color: 'var(--ink-2)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            fontSize: 'var(--type-micro)', fontFamily: 'inherit'
                        }}>
                            <Download size={10} /> Export
                        </button>
                        <button onClick={clearActivityLog} style={{
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                            borderRadius: '0', padding: '4px 8px', color: 'rgba(239,68,68,0.6)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            fontSize: 'var(--type-micro)', fontFamily: 'inherit'
                        }}>
                            <Trash2 size={10} /> Clear
                        </button>
                        <button aria-label="Close session log" onClick={onClose} style={{
                            background: 'var(--line)', border: '1px solid var(--line-2)',
                            borderRadius: '0', padding: '6px 12px', color: 'var(--ink-2)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            fontSize: 'var(--type-micro)', fontFamily: 'inherit', minHeight: '32px'
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
                            padding: '3px 8px', borderRadius: '0', fontSize: 'var(--type-micro)',
                            fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase',
                            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                            background: filter === f ? 'var(--line-2)' : 'var(--line)',
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
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ink-3)', fontSize: 'var(--type-micro)' }}>
                            No activity logged yet
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {filtered.slice(0, 100).map(entry => (
                                <div key={entry.id} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                                    padding: '4px 0',
                                    borderBottom: '1px solid var(--surface-hover)'
                                }}>
                                    <span style={{
                                        fontSize: 'var(--type-micro)', color: 'var(--ink-3)',
                                        fontFamily: 'var(--font-mono)', width: '55px', flexShrink: 0,
                                        marginTop: '1px'
                                    }}>
                                        {formatTime(entry.timestamp)}
                                    </span>
                                    <span style={{
                                        fontSize: 'var(--type-micro)', fontWeight: 700,
                                        color: TYPE_COLORS[entry.type] || '#6b665e',
                                        padding: '1px 4px', borderRadius: '0',
                                        background: `${TYPE_COLORS[entry.type] || '#6b665e'}15`,
                                        letterSpacing: '0.5px', flexShrink: 0, marginTop: '1px'
                                    }}>
                                        {TYPE_LABELS[entry.type] || entry.type}
                                    </span>
                                    <span style={{ fontSize: 'var(--type-micro)', color: 'var(--ink-2)', lineHeight: 1.3 }}>
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
