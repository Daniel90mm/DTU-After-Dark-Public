import assert from 'node:assert/strict';
import test from 'node:test';
import { extractFunctions, makeLocalStorage, plain, readSource } from './_harness.mjs';

const SRC = readSource('darkmode.bus.js');
const NOW = new Date('2026-09-30T17:00:00').getTime();

const ui = extractFunctions('darkmode.bus.js', ['busMinutesNow', 'formatBusClock', 'buildBusWidgetModel']).api;
const rt = extractFunctions('darkmode.bus.js', [
    'minutesUntilDeparture', 'isDelayed', 'getDelayMinutes', 'formatDepartureTime', 'formatDelayTag',
    'departureTimestamp', 'mapBusDepartureForDisplay'
], { globals: { Date: class extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } } } }).api;

const at = (hhmm) => new Date('2026-09-30T' + hhmm + ':00').getTime();

test('departures keep their real time and delay, so the widget can count down', () => {
    const d = plain(rt.mapBusDepartureForDisplay({ line: '150S', direction: 'Nørreport St.', time: '17:05:00', date: '2026-09-30', rtTime: '17:08:00', rtDate: '2026-09-30' }));
    assert.equal(d.at, at('17:08'));
    assert.equal(d.delay, 3);
    assert.equal(d.minutes, 8);
});

test('the widget recomputes minutes at render time and drops buses that left', () => {
    const deps = [
        { line: '150S', direction: 'A', at: at('17:04'), delay: 0 },
        { line: '150S', direction: 'B', at: at('16:58'), delay: 0 },
        { line: '150S', direction: 'C', at: at('17:00'), delay: 2 }
    ];
    const rows = plain(ui.buildBusWidgetModel(deps, { lines: [{ line: '150S' }] }, NOW));
    assert.deepEqual(rows.map((r) => [r.direction, r.when, r.delay]), [['C', 'Now', 2], ['A', '4 min', 0]]);
    const later = plain(ui.buildBusWidgetModel(deps, { lines: [{ line: '150S' }] }, NOW + 3 * 60000));
    assert.deepEqual(later.map((r) => r.when), ['1 min']);
});

test('late buses read "delayed N min", never "+N late"', () => {
    assert.match(SRC, /'delayed ' \+ r\.delay \+ ' min'/);
    assert.doesNotMatch(SRC, /' late' : ''/);
});

test('several lines: one row each (their next bus), every picked line shown, at most three', () => {
    const deps = [
        { line: '40E', direction: 'Skodsborg St.', at: at('17:08'), delay: 3 },
        { line: '40E', direction: 'Høje Taastrup St.', at: at('17:02'), delay: 0 }
    ];
    const rows = plain(ui.buildBusWidgetModel(deps, { lines: [{ line: '150S' }, { line: '300S' }, { line: '40E' }] }, NOW));
    assert.deepEqual(rows.map((r) => [r.line, r.none, r.when || '']), [['150S', true, ''], ['300S', true, ''], ['40E', false, '2 min']]);
    assert.equal(rows[2].title, '40E to Høje Taastrup St.: 2 min\n40E to Skodsborg St.: 8 min, delayed 3 min');
    assert.equal(rows[0].title, '150S: no departures in the next hour');
});

test('one line: its next three buses, soonest first, badge shown once; over an hour shows the clock', () => {
    const deps = ['17:50', '17:10', '18:30', '17:20', '17:30'].map((t, i) => ({ line: '300S', direction: 'D' + i, at: at(t), delay: 0 }));
    const rows = plain(ui.buildBusWidgetModel(deps, { lines: [{ line: '300S' }] }, NOW));
    assert.deepEqual(rows.map((r) => [r.when, r.repeat]), [['10 min', false], ['20 min', true], ['30 min', true]]);
    const far = plain(ui.buildBusWidgetModel([{ line: '300S', direction: 'X', at: at('18:30'), delay: 0 }], null, NOW));
    assert.equal(far[0].when, '18:30');
});

test('cached departures from before this change (no timestamp) still render', () => {
    const rows = plain(ui.buildBusWidgetModel([{ line: '150S', direction: 'A', minutes: 5, time: '5 min' }], null, NOW));
    assert.equal(rows[0].when, '5 min');
});

test('every line badge colour carries white text at 4.5:1 or better', () => {
    const block = /const LINE_COLORS = \{([\s\S]*?)\};/.exec(SRC)[1];
    const lum = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
    for (const [, line, hex] of block.matchAll(/'([^']+)': '(#[0-9a-f]{6})'/gi)) {
        assert.ok(1.05 / (lum(hex) + 0.05) >= 4.5, `${line} ${hex}`);
    }
});

test('reaching the monthly limit pauses fetching but leaves your Bus setting on', () => {
    const local = makeLocalStorage({ dtuDarkModeBusEnabled: 'true' });
    const { api } = extractFunctions('darkmode.bus.js', ['setApiQuotaExhausted'], {
        prelude: "var _apiQuotaExhausted = false; var API_QUOTA_KEY = 'dtuDarkModeBusQuotaExhausted'; var BUS_ENABLED_KEY = 'dtuDarkModeBusEnabled';",
        globals: { localStorage: local }
    });
    api.setApiQuotaExhausted();
    assert.equal(local.getItem('dtuDarkModeBusEnabled'), 'true');
    assert.ok(local.getItem('dtuDarkModeBusQuotaExhausted'));
    assert.doesNotMatch(SRC, /Bus departures have been turned off/);
});

test('only HTTP 429 counts as a spent quota; 403 gets normal backoff', () => {
    assert.doesNotMatch(SRC, /status === 429 \|\| resp\.status === 403/);
    assert.equal((SRC.match(/if \(resp\.status === 429\) \{/g) || []).length, 2);
});

test('the setup prompt uses the extension theme and is marked as extension UI', () => {
    const fn = /function showBusSetupPrompt\(\) \{[\s\S]*?\n    \}\n/.exec(SRC)[0];
    assert.doesNotMatch(fn, /linear-gradient|#1a1a2e|\\uD83D/);
    assert.doesNotMatch(SRC, /\.dtu-bus-setup-prompt\{[^}]*border-left/, 'no accent stripe on the prompt (Daniel, 2026-09-30)');
    assert.match(fn, /markExt\(prompt\)/);
    assert.match(fn, /'Escape'/);
    assert.match(SRC, /'\.d2l-navigation-s-main-wrapper \.dtu-bus-departures \.dtu-bus-badge/, 'badge rule must outrank darkmode.css nav wrapper *');
    assert.match(SRC, /prefers-reduced-motion: reduce\)\{\.dtu-bus-setup-prompt/);
});

test('polling uses real departure times; if every cached bus has left it refetches soon', () => {
    const load = (deps) => extractFunctions('darkmode.bus.js', ['getSmartPollInterval'], {
        prelude: `var _cachedDepartures = ${JSON.stringify(deps)};`
    }).api.getSmartPollInterval();
    const now = Date.now();
    assert.equal(load([]), 60000);
    assert.equal(load([{ at: now - 120000 }, { at: now - 60000 }]), 15000);
    assert.equal(load([{ at: now + 5 * 60000 }]), 60000);
    assert.equal(load([{ at: now + 40 * 60000 }]), 120000);
});

test('a shared cache whose buses have all left is not used', () => {
    const now = Date.now();
    const make = (deps) => {
        const local = makeLocalStorage({ k: JSON.stringify({ ts: now - 60000, departures: deps, configSig: 's' }) });
        return extractFunctions('darkmode.bus.js', ['getBusSharedCache', 'consumeBusSharedCache'], {
            prelude: "var BUS_SHARED_CACHE_KEY = 'k'; var BUS_SHARED_CACHE_MAX_AGE_MS = 180000; var _lastBusFetch = 0; var _cachedDepartures = []; var _busConsecutiveErrors = 0; var _busBackoffUntil = 0;",
            globals: { localStorage: local }
        }).api.consumeBusSharedCache(180000, 's');
    };
    assert.equal(make([{ at: now - 5 * 60000 }]), false);
    assert.equal(make([{ at: now + 5 * 60000 }]), true);
});

test('an aborted fetch does not fall back to one request per stop; leaving releases the lease', () => {
    assert.match(SRC, /widgetResult\.reason === 'aborted'\) return null;/);
    assert.match(SRC, /if \(fetched === null\) \{\s*_lastBusFetch = 0;/);
    assert.match(SRC, /addEventListener\('pagehide', function \(\) \{\s*abortInFlightBusRequests\(\);\s*releaseBusFetchLease\(\);/);
});

function loadWidgetFetch({ fireTimeout }) {
    let controller = null;
    const fetch = (url, opts) => new Promise((resolve, reject) => {
        const fail = () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        if (opts.signal.aborted) return fail();
        opts.signal.addEventListener('abort', fail);
    });
    const { api } = extractFunctions('darkmode.bus.js', ['fetchBusWidgetDepartures'], {
        globals: {
            isApiQuotaExhausted: () => false, LIVE_TRANSIT_API_BASE: 'https://proxy.invalid', consumeBusApiRequestBudget: () => true,
            registerBusFetchController: (c) => { controller = c; }, unregisterBusFetchController() {},
            BUS_FETCH_TIMEOUT_MS: 8000, DEPS_PER_LINE: 3, AbortController, fetch,
            setTimeout: (fn) => { if (fireTimeout) queueMicrotask(fn); return 1; }, clearTimeout() {},
            setApiQuotaExhausted() {}, showQuotaExhaustedMessage() {}, mapBusDepartureForDisplay: (d) => d
        }
    });
    return { api, abort: () => controller.abort() };
}
const cfg = { stopIds: ['1'], lines: [{ line: '150S', directions: ['*'] }] };

test('a slow proxy counts as a failed fetch, not as leaving the tab', async () => {
    const { api } = loadWidgetFetch({ fireTimeout: true });
    assert.equal((await api.fetchBusWidgetDepartures(cfg)).reason, 'timeout');
});

test('leaving the tab mid-fetch is still reported as an abort', async () => {
    const { api, abort } = loadWidgetFetch({ fireTimeout: false });
    const pending = api.fetchBusWidgetDepartures(cfg);
    abort();
    assert.equal((await pending).reason, 'aborted');
});

test('the widget says Loading only before the first result and names a failed fetch', () => {
    assert.match(SRC, /!state\.busHasResult \? 'Loading bus times'/);
    assert.match(SRC, /state\.busLastFetchFailed \? 'Bus times unavailable, retrying' : 'No upcoming buses'/);
    assert.match(SRC, /_busLastFetchFailed && !fetched\.length\) \{[\s\S]{0,200}_busHasResult = true;/);
    assert.doesNotMatch(SRC, /\(state\.busFetchInProgress \|\| !state\.lastBusFetch\) \? 'Loading bus times'/);
});

function fakeElement() {
    const style = new Map();
    return {
        children: [], attributes: {}, className: '', textContent: '',
        style: { setProperty: (k, v) => style.set(k, v), getPropertyValue: (k) => style.get(k) ?? '' },
        setAttribute(k, v) { this.attributes[k] = String(v); },
        appendChild(c) { this.children.push(c); return c; }
    };
}
const badges = extractFunctions('darkmode.bus.js', ['splitBusLine', 'createBusLineBadge'], {
    prelude: "var BUS_TYPE_COLORS = { S: '#1d62b3', E: '#1e7a3c', A: '#c21f32' };",
    globals: { document: { createElement: fakeElement }, markExt() {} }
}).api;

test('bus badges are split tags: number on a chip, type letter in Movia\'s colour', () => {
    const s = badges.createBusLineBadge('150S');
    assert.deepEqual(s.children.map((c) => [c.className, c.textContent]), [['dtu-bus-badge-num', '150'], ['dtu-bus-badge-type', 'S']]);
    assert.equal(s.children[1].style.getPropertyValue('--bus-type-color'), '#1d62b3');
    assert.equal(badges.createBusLineBadge('40E').children[1].style.getPropertyValue('--bus-type-color'), '#1e7a3c');
    const numbered = badges.createBusLineBadge('193');
    assert.equal(numbered.children.length, 1, 'numbered lines have no type block');
    assert.equal(numbered.attributes['data-dtu-bus-line-badge'], '193');
});

test('widget badges share one width so a shorter number leaves no gap after its letter', () => {
    assert.match(SRC, /\.dtu-bus-badge\{justify-self:stretch;display:inline-flex/);
    assert.match(SRC, /\.dtu-bus-badge-num\{flex:1 1 auto;text-align:center/);
});

test('line colours follow Movia bus types: every S line blue, every E line green', () => {
    const block = /const LINE_COLORS = \{([\s\S]*?)\};/.exec(SRC)[1];
    for (const [, line, hex] of block.matchAll(/'([^']+)': '(#[0-9a-f]{6})'/gi)) {
        if (line.endsWith('S')) assert.equal(hex, '#1d62b3', line);
        if (line.endsWith('E')) assert.equal(hex, '#1e7a3c', line);
    }
});
