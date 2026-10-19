/**
 * MapLibre v6 resolves its Web Worker at runtime:
 *
 *   new URL('./maplibre-gl-worker.mjs', import.meta.url)
 *
 * Once the library is bundled, `import.meta.url` is the chunk URL, so that
 * expression points at /assets/maplibre-gl-worker.mjs — a path no build
 * emits. The worker 404s, every GeoJSON source stays unloaded, and the
 * map's `load` event never fires. The map still paints the basemap, which
 * is why the failure reads as "the data layers are missing" rather than as
 * an error.
 *
 * `?worker&url` asks Vite to compile maplibre-gl-worker.mjs — together with
 * the shared module it imports — into a real worker chunk and hand back its
 * URL. `setWorkerUrl()` points MapLibre at that chunk.
 *
 * This must be imported before a Map is constructed.
 */
import { setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(maplibreWorkerUrl);

export default maplibreWorkerUrl;
