import React, { useState, useCallback, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { fetchEscalation } from '../services/escalation';
import { useLiveResource } from '../hooks/useLiveResource';

const ALERT_BAND_HEIGHT = '34px';

const AlertBanner = () => {
    const [dismissed, setDismissed] = useState(false);
    const fetcher = useCallback(() => fetchEscalation(), []);
    const { data, error } = useLiveResource(fetcher, {
        cacheKey: 'escalation-alert',
        intervalMs: 5 * 60 * 1000,
        isUsable: (d) => typeof d?.score === 'number'
    });

    const visible = !dismissed && Boolean(data) && !error && data.score >= 50;

    useEffect(() => {
        document.documentElement.style.setProperty(
            '--mf-alert-h',
            visible ? ALERT_BAND_HEIGHT : '0px'
        );
        return () => {
            document.documentElement.style.setProperty('--mf-alert-h', '0px');
        };
    }, [visible]);

    if (!visible) return null;

    const { score, components } = data;

    const isCritical = score >= 70;
    const bgColor = isCritical
        ? 'rgba(239, 68, 68, 0.15)'
        : 'rgba(245, 158, 11, 0.12)';
    const borderColor = isCritical
        ? 'rgba(239, 68, 68, 0.4)'
        : 'rgba(245, 158, 11, 0.3)';
    const textColor = isCritical ? '#ef4444' : '#f59e0b';

    // Find dominant contributing factor
    const factors = [];
    if (components) {
        if (components.firms > 10) factors.push('thermal anomalies');
        if (components.news > 10) factors.push('intelligence signals');
        if (components.market > 10) factors.push('market volatility');
        if (components.strikes > 10) factors.push('strike activity');
    }

    return (
        <div style={{
            position: 'fixed',
            top: 'var(--classification-band)',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: bgColor,
            backdropFilter: 'blur(20px)',
            borderBottom: `1px solid ${borderColor}`,
            padding: '6px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            animation: isCritical ? 'alert-pulse 3s ease-in-out infinite' : 'none'
        }}>
            <AlertTriangle size={14} style={{ color: textColor, flexShrink: 0 }} />
            <span style={{
                fontSize: '0.6rem',
                fontWeight: 600,
                letterSpacing: '1.5px',
                color: textColor,
                textTransform: 'uppercase'
            }}>
                {isCritical ? 'CRITICAL ESCALATION' : 'ELEVATED THREAT'} — SCORE {score}/100
            </span>
            {factors.length > 0 && (
                <span style={{
                    fontSize: '0.5rem',
                    color: 'var(--ink-3)',
                    letterSpacing: '0.3px'
                }}>
                    Driven by {factors.join(', ')}
                </span>
            )}
            <button
                onClick={() => setDismissed(true)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ink-3)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    marginLeft: 'auto'
                }}
            >
                <X size={14} />
            </button>
        </div>
    );
};

export default AlertBanner;
