// AGENT-QUESTION (security-hardening audit A2, 2026-07-05): This panel has no
// import anywhere in src/ — not in App.jsx, Sidebar.jsx, or LazyPanels.jsx's
// string-keyed lazy map. It appears dead, but is left in place rather than
// deleted: it is a self-contained live-webcam panel that may be intended for
// re-wiring. Delete if confirmed abandoned; otherwise wire it into LazyPanels.
import React, { useState } from 'react';
import { ExternalLink, PlayCircle, Radio, Webcam } from 'lucide-react';

const LIVE_FEEDS = [
    {
        id: 'petchaburi',
        label: 'Petchaburi Road Cam',
        kind: 'Bangkok street cam',
        embedUrl: 'https://www.webcamtaxi.com/en/thailand/bangkok/petchaburi-road-traffic-cam.html',
        openUrl: 'https://www.webcamtaxi.com/en/thailand/bangkok/petchaburi-road-traffic-cam.html',
        note: 'A live Bangkok traffic view. More playful, but third-party and less predictable than Thai PBS.',
        badge: '3rd-party',
        icon: Webcam
    }
];

const LiveMediaPanel = () => {
    const [activeFeedId, setActiveFeedId] = useState(LIVE_FEEDS[0].id);
    const [embedFailed, setEmbedFailed] = useState(false);
    const activeFeed = LIVE_FEEDS.find((feed) => feed.id === activeFeedId) || LIVE_FEEDS[0];
    const ActiveIcon = activeFeed.icon;

    const handleFeedChange = (feedId) => {
        setActiveFeedId(feedId);
        setEmbedFailed(false);
    };

    return (
        <section className="grid-panel live-media-panel">
            <div className="panel-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PlayCircle size={14} /> LIVE WINDOW
                </span>
                <span className="live-pill">LIVE</span>
            </div>

            <div className="live-media-tabs">
                {LIVE_FEEDS.map((feed) => (
                    <button
                        key={feed.id}
                        type="button"
                        className={`live-media-tab ${feed.id === activeFeed.id ? 'active' : ''}`}
                        onClick={() => handleFeedChange(feed.id)}
                    >
                        {feed.label}
                    </button>
                ))}
            </div>

            <div className="live-media-body">
                <div className="live-media-preview">
                    {!embedFailed ? (
                        <iframe
                            key={activeFeed.id}
                            src={activeFeed.embedUrl}
                            title={activeFeed.label}
                            loading="lazy"
                            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                            referrerPolicy="strict-origin-when-cross-origin"
                            onError={() => setEmbedFailed(true)}
                        />
                    ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', padding: '16px' }}>
                            <Webcam size={28} style={{ opacity: 0.4 }} />
                            <span>Embed blocked by source</span>
                        </div>
                    )}
                    <div className="live-media-fallback">
                        <span>{embedFailed ? 'This source blocks embedding. Open directly:' : 'If the preview is blocked, open the live feed directly.'}</span>
                        <a href={activeFeed.openUrl} target="_blank" rel="noopener noreferrer">
                            Open Live <ExternalLink size={12} />
                        </a>
                    </div>
                </div>

                <div className="live-media-meta">
                    <div className="live-media-heading">
                        <span className="live-media-badge">{activeFeed.badge}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ActiveIcon size={14} />
                            {activeFeed.kind}
                        </span>
                    </div>
                    <div className="live-media-title">{activeFeed.label}</div>
                    <div className="live-media-note">{activeFeed.note}</div>
                </div>
            </div>
        </section>
    );
};

export default LiveMediaPanel;
