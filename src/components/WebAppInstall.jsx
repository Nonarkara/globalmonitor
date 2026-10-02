import { useEffect, useRef, useState } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import '../styles/globewatch-brand.css';

export default function WebAppInstall({ open, onClose }) {
    const [installPrompt, setInstallPrompt] = useState(null);
    const [installed, setInstalled] = useState(false);
    const dialogRef = useRef(null);
    useEscapeKey(open, onClose);

    useEffect(() => {
        const ready = (event) => { event.preventDefault(); setInstallPrompt(event); };
        const done = () => { setInstalled(true); setInstallPrompt(null); };
        window.addEventListener('beforeinstallprompt', ready);
        window.addEventListener('appinstalled', done);
        return () => {
            window.removeEventListener('beforeinstallprompt', ready);
            window.removeEventListener('appinstalled', done);
        };
    }, []);

    useEffect(() => {
        if (!open) return undefined;
        const previous = document.activeElement;
        const dialog = dialogRef.current;
        dialog?.querySelector('button')?.focus();
        const trap = (event) => {
            if (event.key !== 'Tab') return;
            const targets = [...dialog.querySelectorAll('button, a[href]')];
            const first = targets[0];
            const last = targets.at(-1);
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault(); first.focus();
            }
        };
        dialog?.addEventListener('keydown', trap);
        return () => { dialog?.removeEventListener('keydown', trap); previous?.focus?.(); };
    }, [open]);

    const install = async () => {
        if (!installPrompt) return;
        await installPrompt.prompt();
        await installPrompt.userChoice;
        setInstallPrompt(null);
    };

    if (!open) return null;
    return (
        <div className="gw-install-overlay" onClick={onClose}>
            <section ref={dialogRef} className="gw-install-dialog" role="dialog" aria-modal="true" aria-labelledby="gw-install-title" onClick={(event) => event.stopPropagation()}>
                <button className="gw-install-close" onClick={onClose} aria-label="Close web-app installation">Close</button>
                <img className="gw-install-icon" src={`${import.meta.env.BASE_URL}brand/icon-192.png`} width="72" height="72" alt="GlobeWatch app icon" />
                <h2 id="gw-install-title">GlobeWatch on your home screen</h2>
                <p>Available on Android and iPhone as a web app. Free to install; no app-store download.</p>
                {installed && <p role="status">GlobeWatch is installed.</p>}
                {installPrompt && <button className="gw-install-action" onClick={install}>Install GlobeWatch</button>}
                <h3>Android</h3>
                <p>Open this site in Chrome. Open the browser menu, choose “Add to Home screen”, then “Install”. The wording may vary by browser.</p>
                <h3>iPhone</h3>
                <p>Open this site in Safari. Tap Share, then “Add to Home Screen”. Keep “Open as Web App” on if shown, then tap “Add”.</p>
                <p className="gw-install-note">Live feeds need an internet connection. Previously loaded pages and data may remain available offline; cached data is marked stale.</p>
                <div className="gw-install-help">
                    <a href="https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en" target="_blank" rel="noopener noreferrer">Android help</a>
                    <a href="https://support.apple.com/guide/iphone/iphea86e5236/ios" target="_blank" rel="noopener noreferrer">iPhone help</a>
                </div>
            </section>
        </div>
    );
}
