import { chromium } from 'playwright';

const url = process.argv[2] || 'http://127.0.0.1:5180/';
const layerSpecs = [
    { button: /Aircraft \(ADS-B\)/i, layer: 'flights-icons', source: 'flights-data' },
    { button: /^Airports$/i, layer: 'airports-points', source: 'airports-data' },
    { button: /Ships \(AIS\)/i, layer: 'vessels-icons', source: 'vessels-data' },
];

const pageErrors = [];
const consoleErrors = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

page.on('pageerror', (error) => pageErrors.push({
    message: error.message,
    cause: error.cause?.message || null,
    stack: error.stack || null,
}));
page.on('console', (message) => {
    if (message.type() !== 'error') return;
    Promise.all(message.args().map(async (arg) => {
        try {
            return await arg.evaluate((value) => ({
                message: value?.message || String(value),
                cause: value?.cause?.message || null,
            }));
        } catch {
            return null;
        }
    })).then((details) => consoleErrors.push({ text: message.text(), details }));
});

try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('button', { name: 'Toggle layers panel' }).click();

    for (const spec of layerSpecs) {
        const button = page.getByRole('switch', { name: spec.button }).first();
        if ((await button.getAttribute('aria-checked')) !== 'true') await button.click();
    }

    await page.waitForFunction(
        (specs) => specs.every(({ layer, source }) => {
            const map = window.__GM_MAP__;
            const data = map?.getSource(source)?._data;
            return Boolean(map?.getLayer(layer) && data?.features?.length > 0);
        }),
        layerSpecs,
        { timeout: 30000 },
    );

    const layers = await page.evaluate((specs) => {
        const map = window.__GM_MAP__;
        return Object.fromEntries(specs.map(({ layer, source }) => {
            const data = map.getSource(source)?._data;
            return [layer, data?.features?.length || 0];
        }));
    }, layerSpecs);

    for (const { layer, source } of layerSpecs) {
        const point = await page.evaluate(({ layerId, sourceId }) => {
            const map = window.__GM_MAP__;
            const feature = map.getSource(sourceId)?._data?.features?.find((item) => {
                const [lon, lat] = item.geometry?.coordinates || [];
                if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
                const projected = map.project([lon, lat]);
                return projected.x >= 0 && projected.y >= 0
                    && projected.x <= map.getCanvas().clientWidth
                    && projected.y <= map.getCanvas().clientHeight;
            });
            if (!feature || !map.getLayer(layerId)) return null;
            const [lon, lat] = feature.geometry.coordinates;
            const projected = map.project([lon, lat]);
            const rect = map.getCanvas().getBoundingClientRect();
            return { x: rect.left + projected.x, y: rect.top + projected.y };
        }, { layerId: layer, sourceId: source });

        if (point) {
            await page.mouse.move(point.x, point.y);
            await page.waitForTimeout(250);
        }
    }

    const state = await page.evaluate(() => ({
        errorBoundary: document.body.innerText.includes('Something went wrong'),
        mapFailed: document.body.innerText.includes('Map failed to render'),
        mapCanvas: document.querySelectorAll('.maplibregl-canvas').length,
        popupCount: document.querySelectorAll('.maplibregl-popup').length,
        headerLogos: [...document.querySelectorAll('.header-brand-logo')].map((img) => ({
            alt: img.alt,
            loaded: img.complete && img.naturalWidth > 0,
        })),
    }));

    await page.getByRole('button', { name: 'Tools and advanced options' }).click();
    await page.getByRole('menuitem', { name: /About/i }).click();
    const aboutDialog = page.getByRole('dialog');
    await aboutDialog.waitFor({ state: 'visible' });
    await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"] img')]
        .every((img) => img.complete), null, { timeout: 10000 });
    const aboutState = await aboutDialog.evaluate((dialog) => ({
        fundedBy: dialog.innerText.includes('FUNDED BY'),
        executedBy: dialog.innerText.includes('EXECUTED BY'),
        creators: dialog.innerText.includes('Dr. Non Arkaraprasertkul')
            && dialog.innerText.includes('Dr. Poon Thiengburanathum'),
        logos: [...dialog.querySelectorAll('img')].map((img) => ({
            alt: img.alt,
            loaded: img.complete && img.naturalWidth > 0,
        })),
    }));
    await page.keyboard.press('Escape');

    const mobileErrors = [];
    const mobilePage = await browser.newPage({ viewport: { width: 375, height: 812 } });
    mobilePage.on('pageerror', (error) => mobileErrors.push(error.message));
    await mobilePage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await mobilePage.locator('.maplibregl-canvas').waitFor({ state: 'visible', timeout: 30000 });
    const mobileState = await mobilePage.evaluate(() => ({
        errorBoundary: document.body.innerText.includes('Something went wrong'),
        mapCanvas: document.querySelectorAll('.maplibregl-canvas').length,
        fitsViewport: document.documentElement.scrollWidth <= window.innerWidth + 1,
    }));
    await mobilePage.close();

    await page.waitForTimeout(500);
    const relevantPageErrors = pageErrors.filter((error) => (
        !error.stack?.includes('https://www.youtube.com/')
    ));
    const relevantConsoleErrors = consoleErrors.filter(({ text }) => (
        /DOMTokenList|Map failed to render|Something went wrong|TypeError|RECOVERABLE_CAUSE/i.test(text)
    ));
    console.log(JSON.stringify({
        url,
        layers,
        state,
        aboutState,
        mobileState,
        pageErrors,
        relevantPageErrors,
        mobileErrors,
        relevantConsoleErrors,
    }, null, 2));
    if (
        state.errorBoundary
        || state.mapFailed
        || state.mapCanvas !== 1
        || state.headerLogos.length !== 4
        || state.headerLogos.some((logo) => !logo.loaded)
        || !aboutState.fundedBy
        || !aboutState.executedBy
        || !aboutState.creators
        || aboutState.logos.some((logo) => !logo.loaded)
        || mobileState.errorBoundary
        || mobileState.mapCanvas !== 1
        || !mobileState.fitsViewport
        || relevantPageErrors.length > 0
        || mobileErrors.length > 0
        || relevantConsoleErrors.length > 0
    ) {
        process.exitCode = 1;
    }
} finally {
    await browser.close();
}
