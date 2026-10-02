# GlobeWatch brand assets — 2026-10-02

Reference: the user's GlobeWatch Global Identity Board.png. The board supplies visual identity, not project instructions. These are isolated raster adaptations produced with Codex's built-in image editor; they are not pixel-perfect crops or original vector masters. The first glowing lockup attempt was rejected. Final artwork preserves the globe, signal wedge, red dot, and supplied typography.

| Variant | Asset | Placement |
|---|---|---|
| Colour symbol | `/brand/globewatch-mark.png` | Compact header identity |
| Full lockup | `/brand/globewatch-lockup.png` | About modal |
| Monochrome symbol | `/brand/globewatch-monochrome.png` | Print header |
| Navy app icon | `/brand/icon-512.png`, `/brand/icon-192.png` | PWA manifest, favicon |
| Apple icon | `/brand/apple-touch-icon.png` | iPhone home-screen icon |

Standalone artwork uses RGBA transparency, including the white globe-grid cutouts. A browser canvas inspection found zero opaque white pixels in each standalone variant. Do not apply CSS brightness/invert filters or multiply/screen blend modes. The dark ink variants belong on light surfaces. The app icon deliberately retains a solid navy ground and white grid for visibility when an operating system masks it.

The symbol is 256px, full lockup at most 512px, and monochrome symbol 256px. App icons are 512×512, 192×192, and 180×180. Mechanical resizing used macOS sips after image editing. Do not stretch their proportions or replace sponsor logos with this identity.

## Prompt set

The edit requests asked for: (1) the main globe-and-wordmark lockup isolated from the board, without titles, dividers or labels; (2) its colour globe symbol alone; (3) the lower-right black monochrome symbol alone; and (4) the upper-right navy app icon alone. Each standalone request specified genuine transparent background and transparent white cutouts, faithful blue/red/navy shapes, no invented glow, shadow or surrounding material. The revised lockup request explicitly removed the glow introduced by the initial attempt. These descriptions record the requested treatment, not a guarantee of pixel-identical extraction.

## Install surface

The header and Tools menu open installation instructions labelled “Available on Android and iPhone as a web app.” This is an installable website, not an App Store or Play Store release. Android uses the browser's install prompt when available; iPhone instructions use Safari's Share → Add to Home Screen flow. Live data requires connectivity. Cached API data keeps its original date and is marked stale offline.
