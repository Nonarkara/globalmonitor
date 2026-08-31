import React, { useState, useRef, useEffect } from 'react';
import { Radio, Volume2, VolumeX, Play, Square, Signal, Compass, RadioTower } from 'lucide-react';
import { CRISIS_RADIO_STATIONS, getStationForTheater } from '../services/crisisRadio.js';

/**
 * Crisis Radio Intelligence Tuner — Braun T1000CD Aesthetic
 * Real-time local broadcast audio monitoring in conflict flashpoints.
 */
const CrisisRadioPanel = ({ viewMode = 'middleeast' }) => {
    const [selectedStation, setSelectedStation] = useState(() => getStationForTheater(viewMode));
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(0.7);
    const [streamError, setStreamError] = useState(false);
    const audioRef = useRef(null);

    // Sync station when theater switches
    useEffect(() => {
        const defaultStation = getStationForTheater(viewMode);
        if (defaultStation && defaultStation.id !== selectedStation.id) {
            setSelectedStation(defaultStation);
            setIsPlaying(false);
            setStreamError(false);
        }
    }, [viewMode]);

    useEffect(() => {
        if (!audioRef.current) return;
        audioRef.current.volume = isMuted ? 0 : volume;
    }, [volume, isMuted]);

    const handleTogglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            setStreamError(false);
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(() => {
                    setStreamError(true);
                    setIsPlaying(false);
                });
        }
    };

    const handleSelectStation = (station) => {
        setSelectedStation(station);
        setStreamError(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = station.streamUrl;
            audioRef.current.load();
            if (isPlaying) {
                audioRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch(() => {
                        setStreamError(true);
                        setIsPlaying(false);
                    });
            }
        }
    };

    return (
        <div className="bottom-card" style={{ padding: '12px 14px', background: 'rgba(12, 16, 26, 0.88)', backdropFilter: 'blur(20px)' }}>
            <audio
                ref={audioRef}
                src={selectedStation.streamUrl}
                preload="none"
                onError={() => {
                    setStreamError(true);
                    setIsPlaying(false);
                }}
            />

            {/* Header */}
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '8px', marginBottom: '10px',
                borderBottom: '1px solid var(--line-2)',
                borderLeft: '3px solid #eab308',
                paddingLeft: '8px'
            }}>
                <div>
                    <div style={{
                        fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1.2px',
                        textTransform: 'uppercase', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <Radio size={14} style={{ color: '#eab308' }} />
                        Crisis Radio Monitor · Braun T-1000
                    </div>
                    <div style={{ fontSize: '0.52rem', color: 'var(--ink-3)', marginTop: '2px' }}>
                        Local Shortwave &amp; News Broadcasts · Open Audio Stream
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                        fontSize: '0.48rem', fontWeight: 700, letterSpacing: '0.8px',
                        color: isPlaying ? '#22c55e' : '#eab308', padding: '2px 8px',
                        background: isPlaying ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                        borderRadius: '4px', border: `1px solid ${isPlaying ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`
                    }}>
                        {isPlaying ? 'STREAMING LIVE' : 'TUNER STANDBY'}
                    </span>
                </div>
            </div>

            {/* Tuner Display */}
            <div style={{
                background: 'rgba(0,0,0,0.4)', padding: '8px 10px',
                borderRadius: '6px', border: '1px solid var(--line-2)', marginBottom: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RadioTower size={12} style={{ color: '#eab308' }} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                            {selectedStation.name}
                        </span>
                    </div>
                    <span style={{
                        fontSize: '0.55rem', fontWeight: 700, color: '#eab308',
                        fontFamily: 'var(--font-mono)', letterSpacing: '0.5px'
                    }}>
                        {selectedStation.freq}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.5rem', color: 'var(--ink-3)' }}>
                    <span>Location: {selectedStation.city} ({selectedStation.country})</span>
                    <span>Lang: {selectedStation.language}</span>
                </div>

                {/* Simulated Audio Signal Visualizer */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px', marginTop: '6px' }}>
                    {Array.from({ length: 32 }).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                flex: 1,
                                height: isPlaying ? `${Math.max(20, Math.sin((i + Date.now() / 200) * 0.5) * 50 + 50)}%` : '15%',
                                background: isPlaying ? '#eab308' : 'rgba(255,255,255,0.1)',
                                borderRadius: '1px',
                                transition: 'height 0.1s ease'
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Controls Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <button
                    type="button"
                    onClick={handleTogglePlay}
                    style={{
                        background: isPlaying ? '#ef4444' : '#eab308',
                        color: isPlaying ? '#fff' : '#000',
                        border: 'none', borderRadius: '4px',
                        padding: '5px 12px', fontSize: '0.55rem', fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                    }}
                >
                    {isPlaying ? <Square size={10} /> : <Play size={10} />}
                    {isPlaying ? 'STOP BROADCAST' : 'TUNE IN'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={() => setIsMuted(!isMuted)}
                        style={{
                            background: 'transparent', border: 'none',
                            color: 'var(--ink-2)', cursor: 'pointer'
                        }}
                    >
                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        style={{ width: '60px', height: '4px', accentColor: '#eab308' }}
                    />
                </div>
            </div>

            {/* Station Preset Switcher */}
            <div style={{ fontSize: '0.48rem', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Crisis Broadcaster Dial Presets:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                {CRISIS_RADIO_STATIONS.map((station) => {
                    const isCurrent = station.id === selectedStation.id;
                    return (
                        <button
                            key={station.id}
                            type="button"
                            onClick={() => handleSelectStation(station)}
                            style={{
                                padding: '3px 6px',
                                background: isCurrent ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${isCurrent ? '#eab308' : 'var(--line)'}`,
                                borderRadius: '3px',
                                color: isCurrent ? '#eab308' : 'var(--ink-2)',
                                fontSize: '0.48rem',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90px' }}>
                                {station.name}
                            </span>
                            <span style={{ fontSize: '0.42rem', color: 'var(--ink-3)' }}>{station.city.split('/')[0]}</span>
                        </button>
                    );
                })}
            </div>

            {streamError && (
                <div style={{ fontSize: '0.48rem', color: '#ef4444', marginTop: '6px', textAlign: 'center' }}>
                    Broadcaster stream momentarily unreachable or blocked by CORS. Try another station.
                </div>
            )}
        </div>
    );
};

export default CrisisRadioPanel;
