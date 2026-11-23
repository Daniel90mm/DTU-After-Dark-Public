import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { extractFunctions, plain, loadDom, readSource } from './_harness.mjs';

const ROOT = new URL('../', import.meta.url);

class FakeElement {
    constructor(tagName) {
        this.tagName = String(tagName).toUpperCase();
        this.children = [];
        this.parentNode = null;
        this.className = '';
        this.id = '';
        this.textContent = '';
        this.attributes = {};
        this.listeners = {};
        this.style = { cssText: '' };
    }

    appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
        return child;
    }

    removeChild(child) {
        this.children = this.children.filter(item => item !== child);
        child.parentNode = null;
        return child;
    }

    remove() {
        if (this.parentNode) this.parentNode.removeChild(this);
    }

    get firstChild() { return this.children[0] || null; }

    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    addEventListener(type, listener) { this.listeners[type] = listener; }

    querySelector(selector) {
        return findElement(this, element => element.className.split(/\s+/).includes(selector.replace(/^\./, '')));
    }
}

class FakeDocument {
    constructor() {
        this.hidden = false;
        this.readyState = 'loading';
        this.documentElement = new FakeElement('html');
        this.head = new FakeElement('head');
        this.body = new FakeElement('body');
        this.documentElement.appendChild(this.head);
        this.documentElement.appendChild(this.body);
    }

    addEventListener() {}
    removeEventListener() {}
    createElement(tagName) { return new FakeElement(tagName); }
    getElementById(id) {
        return this.head.children.find(child => child.id === id) || null;
    }
    querySelector(selector) { return this.documentElement.querySelector(selector); }
    querySelectorAll() { return []; }
}

function findElement(root, predicate) {
    for (const child of root.children) {
        if (predicate(child)) return child;
        const nested = findElement(child, predicate);
        if (nested) return nested;
    }
    return null;
}

function loadLibraryTestApi() {
    const fileUrl = new URL('darkmode.library.js', ROOT);
    let source = fs.readFileSync(fileUrl, 'utf8');
    source = source.replace(
        /\}\)\(\);\s*$/,
        'globalThis.__libraryModalTestApi = { ensureLibraryFallbackStyles, showLibraryPanel, hideLibraryPanel };})();'
    );

    const document = new FakeDocument();
    const intervalDelays = [];
    const window = { addEventListener() {}, location: { hostname: 'learn.inside.dtu.dk' } };
    const sandbox = {
        clearInterval,
        clearTimeout,
        console,
        document,
        globalThis: null,
        setInterval(_callback, delay) {
            intervalDelays.push(delay);
            return 1;
        },
        setTimeout,
        window
    };
    sandbox.globalThis = sandbox;
    loadDom(sandbox);
    vm.runInNewContext(source, sandbox, { filename: fileUrl.pathname });
    sandbox.DTUAfterDarkLibraryDeps = {
        getLibraryUiState() { return {}; },
        setLibraryUiState() {},
        ensureLibraryRuntimeStyles() {},
        markExt(element) { element.setAttribute('data-dtu-ext', '1'); },
        extractLibraryCurrentSnapshot() { return { hasCurrent: false }; },
        formatLibraryOccupancyCount(value) { return String(value); },
        selectRecentLibraryNews(news) { return Array.isArray(news) ? news : []; }
    };
    return { ...sandbox.__libraryModalTestApi, document, intervalDelays };
}

test('library fallback backdrop blurs without adding a dark wash', () => {
    const api = loadLibraryTestApi();

    api.ensureLibraryFallbackStyles();

    const css = api.document.getElementById('dtu-library-fallback-style')?.textContent || '';
    const overlayRule = css.match(/\.dtu-library-modal-overlay\{[^}]+\}/)?.[0] || '';
    assert.match(overlayRule, /background:transparent!important/);
    assert.match(overlayRule, /background-color:transparent!important/);
    assert.match(overlayRule, /backdrop-filter:blur\(4px\)!important/);
    assert.doesNotMatch(overlayRule, /background:rgba\(/);
});

test('library modal overlay protects its transparent blur from page-level background rules', () => {
    const api = loadLibraryTestApi();

    api.showLibraryPanel(null);

    const overlay = api.document.querySelector('.dtu-library-modal-overlay');
    assert.match(overlay?.style.cssText || '', /background:transparent !important/);
    assert.match(overlay?.style.cssText || '', /background-color:transparent !important/);
    assert.match(overlay?.style.cssText || '', /backdrop-filter:blur\(4px\) !important/);
});

test('library modal limits automatic occupancy refreshes to once every five minutes', () => {
    const api = loadLibraryTestApi();

    api.showLibraryPanel(null);

    assert.deepEqual(api.intervalDelays, [5 * 60 * 1000]);
});

test('closing the library panel gives the page its scrolling back, whatever the shared state keeps', () => {
    const api = loadLibraryTestApi();
    api.document.documentElement.style.overflow = '';
    api.document.body.style.overflow = 'auto';

    api.showLibraryPanel(null);
    assert.equal(api.document.documentElement.style.overflow, 'hidden');
    assert.equal(api.document.body.style.overflow, 'hidden');

    // Opening again while open must not save "hidden" as the page's own value.
    api.showLibraryPanel(null);
    api.hideLibraryPanel();
    assert.equal(api.document.documentElement.style.overflow, '');
    assert.equal(api.document.body.style.overflow, 'auto');
});

const { api: newsApi } = extractFunctions('darkmode.library-data.js', ['selectRecentLibraryNews'], {
    prelude: 'var LIBRARY_NEWS_MAX_AGE_MS = 92 * 86400000;'
});
const NEWS_NOW = Date.UTC(2026, 10, 7);

// The ten items DTU's newslist returned on 7 Nov 2026, as the background formats them.
const NEWS = ['November 04, 2026', 'November 02, 2026', 'September 21, 2026', 'August 31, 2026',
    'August 25, 2026', 'August 24, 2026', 'May 26, 2026', 'May 21, 2026', 'May 11, 2026', 'May 08, 2026']
    .map((date, i) => ({ title: 'News ' + i, date }));

test('library news shows only the last three months', () => {
    const shown = plain(newsApi.selectRecentLibraryNews(NEWS, NEWS_NOW)).map(item => item.date);
    assert.deepEqual(shown, ['November 04, 2026', 'November 02, 2026', 'September 21, 2026', 'August 31, 2026',
        'August 25, 2026', 'August 24, 2026']);
});

test('the newest item stays when nothing is recent, and undated items are kept', () => {
    const old = NEWS.slice(6);
    assert.deepEqual(plain(newsApi.selectRecentLibraryNews(old, NEWS_NOW)).map(item => item.date), ['May 26, 2026']);
    assert.equal(newsApi.selectRecentLibraryNews([{ title: 'Undated', date: '' }], NEWS_NOW).length, 1);
    assert.equal(newsApi.selectRecentLibraryNews(null, NEWS_NOW).length, 0);
});

// The library's hours are Danish. Run in a browser far from Denmark (UTC+14),
// event times, the minute of day and the date key must not move.
test('library times are Danish hours whatever the browser time zone', () => {
    const before = process.env.TZ;
    process.env.TZ = 'Pacific/Kiritimati';
    try {
        const { api: tz } = extractFunctions('darkmode.library-data.js', [
            'copenhagenMinuteOfDay', 'toLibraryDateKey', 'parseLibraryMinuteOfDay',
            'isLibraryEventAtDtuLibrary', 'parseLibraryTimeRangeFromText', 'buildLibraryEventIntervals'
        ], {
            globals: { window: {}, document: {} },
            prelude: readSource('darkmode.dom.js') + '\nvar dom = globalThis.DTUAfterDarkDom;'
        });
        assert.equal(new Date(Date.UTC(2026, 10, 26, 9, 0)).getHours(), 23, 'the sandbox runs at UTC+14');
        assert.equal(tz.toLibraryDateKey(Date.UTC(2026, 10, 22, 22, 30)), '2026-11-22');
        assert.equal(tz.parseLibraryMinuteOfDay('2026-11-26T07:30:00Z'), 8 * 60 + 30);
        assert.equal(tz.parseLibraryMinuteOfDay('10:15'), 10 * 60 + 15);
        // DTU Library's feed on 22 Nov 2026: "26. Nov 08:30 - 12:30", sent as UTC.
        const model = { nowTs: Date.UTC(2026, 10, 26, 9, 0), startHour: 8, endHour: 22 };
        const events = { ok: true, events: [
            { title: 'Workshop', location: 'DTU Library, Lyngby', startIso: '2026-11-26T07:30:00Z', endIso: '2026-11-26T11:30:00Z' },
            { title: 'Talk', location: 'DTU Library', startIso: '2026-11-26T16:00:00Z', endIso: '', formattedDate: '26. Nov 17:00 - 20:00' },
            { title: 'Tomorrow', location: 'DTU Library', startIso: '2026-11-27T10:30:00Z', endIso: '2026-11-27T12:30:00Z' }
        ] };
        assert.deepEqual(plain(tz.buildLibraryEventIntervals(events, model)).map(e => [e.title, e.startMinute, e.endMinute]), [
            ['Workshop', 510, 750],
            ['Talk', 1020, 1200]
        ]);
    } finally {
        if (before === undefined) delete process.env.TZ; else process.env.TZ = before;
    }
});

const { api: crowdApi } = extractFunctions('darkmode.library-data.js', [
    'buildLibraryHourBars',
    'selectLibraryWeekdayView',
    'buildLibraryWeekdaySummaryLine',
    'buildLibraryCrowdingInsightLine',
    'buildLibraryCrowdingConfidenceLine',
    'formatLibraryWeekdayObservations',
    'normalizeLibraryWeekdayKey',
    'parseLibraryIntLoose'
], { prelude: "var LIBRARY_WEEK_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];" });
const { api: trendApi } = extractFunctions('darkmode.library-trend.js', ['getLibraryChartMaxValue'], {
    prelude: "var LIBRARY_WEEK_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];"
});

// Saturday 7 Nov 2026 at 10:30: 41 in the library, Saturday average at 10:00 is 27.
function saturdayModel(overrides = {}) {
    return Object.assign({
        snapshot: { hasCurrent: true, visitors: 41 },
        startHour: 8,
        endHour: 22,
        nowMinute: 630,
        weekdayName: 'saturday',
        isWithinDisplayHours: true,
        todaySamples: [{ minute: 480, visitors: 5 }, { minute: 510, visitors: 7 }, { minute: 600, visitors: 23 }, { minute: 630, visitors: 41 }],
        typicalRows: [{ hour: 8, avg: 4.4 }, { hour: 10, avg: 27 }, { hour: 14, avg: 60 }],
        typicalNow: 27,
        hasWeekdaySpecificHistory: true,
        weekdayObservationCount: 4,
        daysCollected: 28,
        occupancyRatio: 41 / 800
    }, overrides);
}

test('hour bars: one per opening hour, today averaged per hour, live count in the current hour', () => {
    const bars = plain(crowdApi.buildLibraryHourBars(saturdayModel()));
    assert.equal(bars.length, 14);
    assert.deepEqual(bars[0], { hour: 8, usual: 4, today: 6, isNow: false });
    assert.deepEqual(bars[1], { hour: 9, usual: null, today: null, isNow: false });
    assert.deepEqual(bars[2], { hour: 10, usual: 27, today: 41, isNow: true });
    assert.deepEqual(bars[6], { hour: 14, usual: 60, today: null, isNow: false });
});

test('hour bars after hours show only the usual counts', () => {
    const bars = plain(crowdApi.buildLibraryHourBars(saturdayModel({ isWithinDisplayHours: false, nowMinute: 1400 })));
    assert.ok(bars.every(b => b.today === null && b.isNow === false));
    assert.equal(bars[2].usual, 27);
});

test('busier or quieter is said only against this weekday, never the all-days average', () => {
    assert.equal(crowdApi.buildLibraryCrowdingInsightLine(saturdayModel()), 'About usual for this hour.');
    assert.equal(crowdApi.buildLibraryCrowdingInsightLine(saturdayModel({ snapshot: { hasCurrent: true, visitors: 60 } })),
        'Busier than usual for this hour.');
    assert.equal(crowdApi.buildLibraryCrowdingInsightLine(saturdayModel({ hasWeekdaySpecificHistory: false, typicalNow: 182 })),
        '');
});

test('the source line names the real weekday count, or says the usual is all days', () => {
    assert.equal(crowdApi.buildLibraryCrowdingConfidenceLine(saturdayModel()), 'Usual: average of the last 4 Saturdays.');
    assert.equal(crowdApi.buildLibraryCrowdingConfidenceLine(saturdayModel({ hasWeekdaySpecificHistory: false, weekdayObservationCount: null })),
        'Usual: all days averaged, 28 days of data.');
});

test('picking another weekday shows that day\'s usual bars and nothing from today', () => {
    const model = saturdayModel({
        weekdayMap: { saturday: [{ hour: 10, avg: 27 }], tuesday: [{ hour: 10, avg: 210 }, { hour: 15, avg: 331.6 }] },
        weekdayDays: { saturday: 5, tuesday: 4 }
    });
    assert.equal(crowdApi.selectLibraryWeekdayView(model, 'saturday'), model);
    const tue = crowdApi.selectLibraryWeekdayView(model, 'tuesday');
    const bars = plain(crowdApi.buildLibraryHourBars(tue));
    assert.ok(bars.every(b => b.today === null && b.isNow === false));
    assert.equal(bars[7].usual, 332);
    assert.equal(crowdApi.buildLibraryWeekdaySummaryLine(tue), 'Usual Tuesdays: busiest 15:00, about 332 people.');
    assert.equal(crowdApi.buildLibraryCrowdingConfidenceLine(tue), 'Usual: average of the last 4 Tuesdays.');
    assert.equal(crowdApi.buildLibraryCrowdingConfidenceLine(Object.assign({}, tue, { teachingWeeksOnly: true })),
        'Usual: average of 4 Tuesdays in DTU teaching weeks, holidays and exams left out.');
    // Saturday's chart uses the busiest weekday's scale.
    assert.equal(trendApi.getLibraryChartMaxValue(model, crowdApi.buildLibraryHourBars(model)), 331.6);
});

const { api: chartApi } = extractFunctions('darkmode.library-trend.js', ['layoutLibraryEventLanes', 'buildLibraryChartSeries']);

test('events that do not overlap share the first row; overlapping events get their own row', () => {
    const ev = (startMinute, endMinute, title) => ({ startMinute, endMinute, title });
    const out = plain(chartApi.layoutLibraryEventLanes([
        ev(14 * 60, 15 * 60, 'Talk'),
        ev(11 * 60, 16 * 60, 'Bazaar'),
        ev(9 * 60, 10 * 60, 'Breakfast'),
        ev(12 * 60, 13 * 60, 'Lunch talk'),
        ev(16 * 60, 17 * 60, 'After party')
    ], 3));
    const laneOf = title => out.placed.find(p => p.interval.title === title).lane;
    assert.equal(laneOf('Breakfast'), 0);
    assert.equal(laneOf('Bazaar'), 0);
    assert.equal(laneOf('After party'), 0); // starts when Bazaar ends: no overlap
    assert.equal(laneOf('Lunch talk'), 1);
    assert.equal(laneOf('Talk'), 1);
    assert.equal(out.laneCount, 2);
    assert.equal(out.hiddenCount, 0);
});

test('events beyond the row limit are counted, not drawn', () => {
    const same = [1, 2, 3, 4].map(n => ({ startMinute: 600, endMinute: 660, title: 'E' + n }));
    const out = plain(chartApi.layoutLibraryEventLanes(same, 3));
    assert.equal(out.laneCount, 3);
    assert.equal(out.placed.length, 3);
    assert.equal(out.hiddenCount, 1);
    assert.deepEqual(plain(chartApi.layoutLibraryEventLanes(null, 3)), { placed: [], laneCount: 0, hiddenCount: 0 });
});

test('chart points sit mid-hour, the live point sits at the current minute, gaps split the line', () => {
    const bars = [
        { hour: 8, usual: 40, today: 20, isNow: false },
        { hour: 9, usual: null, today: 100, isNow: false },
        { hour: 10, usual: 270, today: 198, isNow: true },
        { hour: 11, usual: 350, today: null, isNow: false }
    ];
    const s = plain(chartApi.buildLibraryChartSeries(bars, 10 * 60 + 46));
    assert.deepEqual(s.today, [[
        { minute: 510, value: 20, isNow: false },
        { minute: 570, value: 100, isNow: false },
        { minute: 646, value: 198, isNow: true }
    ]]);
    assert.deepEqual(s.usual, [[{ minute: 510, value: 40, isNow: false }], [
        { minute: 630, value: 270, isNow: false },
        { minute: 690, value: 350, isNow: false }
    ]]);
});

test('a library feed item links only to an https URL; script, data and http links stay inert', async () => {
    const { loadModuleInternals } = await import('./_harness.mjs');
    const document = new FakeDocument();
    const window = { location: { hostname: 'learn.inside.dtu.dk', href: 'https://learn.inside.dtu.dk/' }, addEventListener() {} };
    const { api } = loadModuleInternals('darkmode.library.js', ['renderLibraryFeedItems'], { document, window });
    const body = document.createElement('div');
    api.renderLibraryFeedItems({ body, container: body, refreshBtn: null, itemEls: [] }, {
        ok: true,
        events: [
            { url: 'javascript:alert(1)', title: 'a', day: '1', month: 'Jan', excerpt: '' },
            { url: 'data:text/html,x', title: 'b', day: '2', month: 'Jan', excerpt: '' },
            { url: 'http://www.bibliotek.dtu.dk/x', title: 'c', day: '3', month: 'Jan', excerpt: '' },
            { url: 'https://www.bibliotek.dtu.dk/en/event', title: 'd', day: '4', month: 'Jan', excerpt: '' }
        ]
    }, 'events');
    assert.equal(body.children.length, 4, 'every item still shows');
    assert.deepEqual(body.children.map(row => row.href || ''), ['', '', '', 'https://www.bibliotek.dtu.dk/en/event']);
});
