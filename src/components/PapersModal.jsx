import React from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { X } from 'lucide-react';
import {
    ORIGIN_ESSAY, FOUR_SYSTEMS, AEROSOL_NOTE, JAXA_NOTE, CO2_NOTE,
    CREATORS, RESEARCH_BASIS, ARCHITECTURE, LONGITUDINAL_NOTE,
} from '../data/originEssay';

const H2 = ({ children }) => (
    <h2 style={{
        fontSize: '14px', fontWeight: 800, margin: '32px 0 12px',
        textTransform: 'uppercase', letterSpacing: '0.04em',
        borderBottom: '2px solid #111', paddingBottom: '6px',
    }}>
        {children}
    </h2>
);

const H3 = ({ children }) => (
    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '16px 0 6px' }}>{children}</h3>
);

const PapersModal = ({ isOpen, onClose, systemId = 'asia' }) => {
    useEscapeKey(isOpen, onClose);
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 10000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.85)',
                pointerEvents: 'auto',
                padding: '16px',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '100%', maxWidth: '720px', maxHeight: '90vh',
                    background: '#e0e0e0',
                    color: '#111',
                    border: '4px solid #111',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: '4px solid #111',
                    background: '#d4d4d4',
                    gap: '12px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{
                            width: '32px', height: '32px', background: '#111', color: '#e0e0e0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '14px', flexShrink: 0,
                        }}>
                            A
                        </div>
                        <span style={{
                            fontSize: '14px', fontWeight: 700, letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                        }}>
                            About
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#111', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            fontSize: '14px', fontWeight: 700, textTransform: 'uppercase',
                            minHeight: '44px',
                        }}
                    >
                        Close <X size={20} strokeWidth={3} />
                    </button>
                </div>

                <div style={{
                    flex: 1, overflowY: 'auto', padding: '24px 20px 32px',
                    fontSize: '14px', lineHeight: 1.6, color: '#222',
                }}>
                    {ORIGIN_ESSAY.map((paragraph) => (
                        <p key={paragraph.slice(0, 40)} style={{ margin: '0 0 16px' }}>
                            {paragraph}
                        </p>
                    ))}

                    <H2>Who built it</H2>
                    {CREATORS.map((person) => (
                        <div key={person.name} style={{ marginBottom: '16px' }}>
                            <div style={{ fontWeight: 700 }}>{person.name}</div>
                            <div style={{ fontSize: '13px', fontStyle: 'italic', margin: '2px 0 6px' }}>{person.role}</div>
                            <div>{person.detail}</div>
                        </div>
                    ))}

                    <H2>The research behind it</H2>
                    {RESEARCH_BASIS.map((s) => (
                        <div key={s.heading} style={{ marginBottom: '14px' }}>
                            <H3>{s.heading}</H3>
                            <p style={{ margin: 0 }}>{s.body}</p>
                        </div>
                    ))}

                    <H2>Architecture</H2>
                    {ARCHITECTURE.map((s) => (
                        <div key={s.heading} style={{ marginBottom: '14px' }}>
                            <H3>{s.heading}</H3>
                            <p style={{ margin: 0 }}>{s.body}</p>
                        </div>
                    ))}
                    <div style={{
                        border: '2px solid #111', padding: '12px', marginTop: '14px', background: '#d4d4d4',
                    }}>
                        <H3>On keeping a history</H3>
                        <p style={{ margin: 0 }}>{LONGITUDINAL_NOTE}</p>
                    </div>

                    <H2>The four</H2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {FOUR_SYSTEMS.map((system) => {
                            const here = system.id === systemId;
                            return (
                                <li
                                    key={system.id}
                                    style={{
                                        marginBottom: '12px',
                                        padding: '10px 12px',
                                        border: here ? '2px solid #111' : '1px solid #111',
                                        background: here ? '#fff' : 'transparent',
                                    }}
                                >
                                    <div style={{ fontWeight: 700, fontSize: '14px' }}>
                                        {system.name}
                                        {here ? ' — this screen' : ''}
                                    </div>
                                    <div style={{ marginTop: '4px' }}>{system.role}</div>
                                    {!here && (
                                        <a
                                            href={system.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ color: '#111', fontSize: '11px', display: 'inline-block', marginTop: '6px', minHeight: '44px', lineHeight: '44px' }}
                                        >
                                            {system.url.replace('https://', '')}
                                        </a>
                                    )}
                                </li>
                            );
                        })}
                    </ul>

                    <H2>What the map actually pulls</H2>
                    <p style={{ margin: '0 0 12px' }}>{AEROSOL_NOTE}</p>
                    <p style={{ margin: '0 0 12px' }}>{CO2_NOTE}</p>
                    <p style={{ margin: 0 }}>{JAXA_NOTE}</p>
                </div>
            </div>
        </div>
    );
};

export default PapersModal;
