import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function stampWorker(source, html) {
    const script = html.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"/)?.[1];
    if (!script || !source.includes('__APP_ENTRY__')) throw new Error('Cannot identify release entry for service worker');
    const styles = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)]
        .map(match => match[1]).filter(href => href.startsWith('/') && href.includes('/assets/'));
    // Include CSS so a CSS-only release also advances already-open tabs.
    const base = script.slice(0, script.indexOf('/assets/') + 1);
    return source.replace('__APP_ENTRY__', [script, ...styles].sort().join('|')).replace('__APP_BASE__', base);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const [source, html] = await Promise.all([
        fs.readFile(path.join(root, 'public/sw.js'), 'utf8'),
        fs.readFile(path.join(root, 'dist/index.html'), 'utf8'),
    ]);
    await fs.writeFile(path.join(root, 'dist/sw.js'), stampWorker(source, html));
    console.log('Service worker stamped with the built app entry');
}
