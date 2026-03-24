import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const GlassCard = ({
    title,
    icon,
    accentColor,
    statusLabel,
    onRefresh,
    isRefreshing,
    collapsible = false,
    defaultCollapsed = false,
    className = '',
    children
}) => {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);

    return (
        <div className={`glass-card ${className}`} style={accentColor ? { '--card-accent': accentColor } : undefined}>
            <div
                className="glass-card-header"
                onClick={collapsible ? () => setCollapsed(v => !v) : undefined}
                style={collapsible ? { cursor: 'pointer' } : undefined}
            >
                <span className="glass-card-title">
                    {icon && <span className="glass-card-icon">{icon}</span>}
                    {title}
                </span>
                <div className="glass-card-actions">
                    {statusLabel && (
                        <span className={`glass-pill ${statusLabel === 'LIVE' ? 'glass-pill-live' : 'glass-pill-muted'}`}>
                            {statusLabel}
                        </span>
                    )}
                    {collapsible && (
                        <ChevronDown
                            size={14}
                            style={{
                                transition: 'transform 0.3s ease',
                                transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                opacity: 0.4
                            }}
                        />
                    )}
                </div>
            </div>
            <div
                className="glass-card-body"
                style={{
                    maxHeight: collapsed ? '0px' : '2000px',
                    opacity: collapsed ? 0 : 1,
                    overflow: 'hidden',
                    transition: 'max-height 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease'
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default GlassCard;
