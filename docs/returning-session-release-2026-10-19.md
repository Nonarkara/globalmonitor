# Returning-session failure, 19 October 2026

The actual affected in-app browser was 366×802. Its header measured232.789px; .app-container had no data-shell. It was still executing index-zgE3ZD1n.js with index-B_-wegMC.css while the server had the compact release. Fresh sessions were not representative of that open tab. The previous release verification missed this case.

Reloading that same tab produced data-shell=compact, a56px header, a44px ticker and a642px map (80% of the viewport). No map, instrument or earned dataset was removed to obtain that result.

## Prevention

- Build post-processing stamps both hashed module and stylesheet paths into sw.js. A CSS-only release changes the worker too.
- A client reports the asset fingerprint it is actually executing. Activation claims clients, then checks that fingerprint. A legacy or mismatched client is navigated to the current app; a matching client stays put.
- Navigation is initiated, not awaited inside activate.waitUntil: the navigation fetch may itself wait for activation, so awaiting it there creates a circular wait.
- Visible clients recheck on foreground, reconnection and a five-minute interval. Registration bypasses the HTTP cache for update checks.
- CI and the deployment job run the real returning-session browser test, not just a fresh context with service workers blocked.

## Evidence

Three unit tests cover build/CSS fingerprints, foreground/online checks, and current-versus-legacy clients. The real Chrome regression starts with a cache-first legacy worker and a233px header; claiming a newer worker without migration leaves it233px; enabling migration advances the same tab to56px without manual reload or cache clearing. Main-frame navigation events count initial load plus exactly one migration, then remain stable on an unchanged update check. The existing offline API tests still apply: timestamps and sample/stale classification must survive offline fallback.

This guard refreshes an out-of-date read-only dashboard tab on release. It does not certify external feed freshness or change the previously recorded data limitations.
