import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { extractFunctions, plain, readSource, loadDom } from './_harness.mjs';

const SRC = readSource('darkmode.bus.js');
const BUS_CONFIG_KEY = 'dtuDarkModeBusConfig';
const BUS_ENABLED_KEY = 'dtuDarkModeBusEnabled';

class FakeElement {
    constructor(tagName) {
        this.tagName = String(tagName).toUpperCase();
        this.id = '';
        this.children = [];
        this.parentNode = null;
        this.className = '';
        this.textContent = '';
        this.attributes = {};
        this.listeners = {};
        this.style = {
            cssText: '',
            setProperty(name, value) { this[name] = String(value); },
            getPropertyValue(name) { return this[name] ?? ''; },
            getPropertyPriority() { return ''; }
        };
    }

    get parentElement() {
        return this.parentNode;
    }

    get firstChild() {
        return this.children[0] || null;
    }

    appendChild(child) {
        if (child.parentNode) child.parentNode.removeChild(child);
        this.children.push(child);
        child.parentNode = this;
        return child;
    }

    removeChild(child) {
        this.children = this.children.filter((item) => item !== child);
        child.parentNode = null;
        return child;
    }

    remove() {
        if (this.parentNode) this.parentNode.removeChild(this);
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }

    getAttribute(name) {
        return this.attributes[name] ?? null;
    }

    removeAttribute(name) {
        delete this.attributes[name];
    }

    addEventListener(type, listener) {
        this.listeners[type] = listener;
    }

    querySelector(selector) {
        return findElement(this, (element) => {
            if (selector.startsWith('.')) return element.className.split(/\s+/).includes(selector.slice(1));
            if (selector.startsWith('#')) return element.id === selector.slice(1);
            return false;
        });
    }
}

class FakeDocument {
    constructor() {
        this.hidden = false;
        this.documentElement = new FakeElement('html');
        this.body = new FakeElement('body');
        this.documentElement.appendChild(this.body);
    }

    addEventListener() {}
    createElement(tagName) { return new FakeElement(tagName); }
    querySelector(selector) { return this.documentElement.querySelector(selector); }
    querySelectorAll() { return []; }
    getElementById(id) { return this.documentElement.querySelector('#' + id); }
}

function findElement(root, predicate) {
    for (const child of root.children) {
        if (predicate(child)) return child;
        const nested = findElement(child, predicate);
        if (nested) return nested;
    }
    return null;
}

function makeStorage(initial = {}) {
    const values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
    return {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); },
        clear() { values.clear(); },
        values
    };
}

function jsonResponse(body, status = 200) {
    return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function loadBusModule({ storage = makeStorage(), fetchImpl, runtime = {}, homepage = true } = {}) {
    const fileUrl = new URL('../darkmode.bus.js', import.meta.url);
    const apiUrl = new URL('../darkmode.bus.api.js', import.meta.url);
    const presetsUrl = new URL('../darkmode.bus.presets.js', import.meta.url);
    const addLineUrl = new URL('../darkmode.bus.setup.addline.js', import.meta.url);
    const setupUrl = new URL('../darkmode.bus.setup.js', import.meta.url);
    let source = fs.readFileSync(fileUrl, 'utf8');
    const tail = /\}\)\(\);\s*$/;
    if (!tail.test(source)) throw new Error('darkmode.bus.js does not end with an IIFE close');

    const exposed = `
globalThis.__busStressApi = {
    getBusConfig,
    saveBusConfig,
    buildBusWidgetModel,
    insertBusDisplay,
    updateBusDepartures,
    fetchBusDepartures,
    fetchBusWidgetDepartures,
    getSmartPollInterval,
    stopBusPolling,
    tryAcquireBusFetchLease,
    setState(patch) {
        if ('lastBusFetch' in patch) _lastBusFetch = patch.lastBusFetch;
        if ('cachedDepartures' in patch) _cachedDepartures = patch.cachedDepartures;
        if ('busHasResult' in patch) _busHasResult = patch.busHasResult;
        if ('busLastFetchFailed' in patch) _busLastFetchFailed = patch.busLastFetchFailed;
        if ('busConsecutiveErrors' in patch) _busConsecutiveErrors = patch.busConsecutiveErrors;
        if ('busBackoffUntil' in patch) _busBackoffUntil = patch.busBackoffUntil;
    }
};
`;
    source = source.replace(tail, exposed + '})();');

    const document = new FakeDocument();
    const window = {
        addEventListener() {},
        location: homepage
            ? { hostname: 'learn.inside.dtu.dk', pathname: '/d2l/home' }
            : { hostname: 'test.invalid', pathname: '/' }
    };
    window.top = window;

    const sandbox = {
        AbortController,
        CONFIG: runtime,
        console,
        Date,
        document,
        fetch: fetchImpl || (async () => jsonResponse({ ok: false }, 500)),
        globalThis: null,
        localStorage: storage,
        Math,
        requestAnimationFrame(callback) { callback(); },
        setInterval: () => 0,
        clearInterval() {},
        setTimeout: () => 0,
        clearTimeout() {},
        URL,
        window
    };
    sandbox.globalThis = sandbox;
    loadDom(sandbox);
    vm.runInNewContext(fs.readFileSync(presetsUrl, 'utf8'), sandbox, { filename: presetsUrl.pathname });
    vm.runInNewContext(fs.readFileSync(addLineUrl, 'utf8'), sandbox, { filename: addLineUrl.pathname });
    vm.runInNewContext(fs.readFileSync(setupUrl, 'utf8'), sandbox, { filename: setupUrl.pathname });
    vm.runInNewContext(fs.readFileSync(apiUrl, 'utf8'), sandbox, { filename: apiUrl.pathname });
    vm.runInNewContext(source, sandbox, { filename: fileUrl.pathname });
    sandbox.DTUAfterDarkBusDeps = {
        getUiState() { return {}; },
        setUiState() {},
        isTopWindow() { return true; },
        isDarkModeEnabled() { return true; },
        markExt(element) { element.setAttribute('data-dtu-ext', '1'); }
    };
    return { api: sandbox.__busStressApi, document, storage };
}

function fixedDate(nowTs) {
    return class extends Date {
        constructor(...args) {
            if (args.length) super(...args);
            else super(nowTs);
        }
        static now() { return nowTs; }
    };
}

function withTimeZone(timeZone, run) {
    const previous = process.env.TZ;
    process.env.TZ = timeZone;
    try {
        return run();
    } finally {
        if (previous === undefined) delete process.env.TZ;
        else process.env.TZ = previous;
    }
}

const modelApi = extractFunctions('darkmode.bus.js', [
    'busMinutesNow',
    'formatBusClock',
    'buildBusWidgetModel'
]).api;

const NOW = Date.parse('2026-09-30T17:00:00Z');
const at = (minutes) => NOW + minutes * 60000;

// Invariant 1: times must be correct across Europe/Copenhagen DST changes.
// Right behavior: the next 02:30 on the fall-back night is the CET occurrence.
test('test_bug_dst_fall_back_departure_is_dropped', () => {
    withTimeZone('Europe/Copenhagen', () => {
        const nowTs = Date.parse('2026-10-25T01:15:00Z');
        const timeApi = extractFunctions('darkmode.bus.js', ['copenhagenTimestamp', 'departureTimestamp', 'minutesUntilDeparture'], {
            globals: { Date: fixedDate(nowTs) }
        }).api;

        const departure = { line: '150S', direction: 'Norreport St.', time: '02:30:00', date: '2026-10-25' };

        assert.equal(
            timeApi.departureTimestamp(departure),
            Date.parse('2026-10-25T01:30:00Z'),
            'the next 02:30 on the fall-back night is CET (UTC+1), not the first CEST 02:30'
        );
        assert.equal(timeApi.minutesUntilDeparture(departure), 15);
    });
});

// Invariant 1: Rejseplanen wall times are Europe/Copenhagen times.
// Right behavior: parse them with the Copenhagen offset, not the host offset.
test('test_bug_departure_times_use_host_timezone_instead_of_copenhagen', () => {
    withTimeZone('UTC', () => {
        const nowTs = Date.parse('2026-09-30T14:55:00Z');
        const timeApi = extractFunctions('darkmode.bus.js', [
            'copenhagenTimestamp',
            'minutesUntilDeparture',
            'getDelayMinutes',
            'formatDepartureTime',
            'departureTimestamp',
            'mapBusDepartureForDisplay'
        ], { globals: { Date: fixedDate(nowTs) } }).api;

        const mapped = timeApi.mapBusDepartureForDisplay({
            line: '150S',
            direction: 'Norreport St.',
            time: '17:00:00',
            date: '2026-09-30'
        });

        assert.equal(mapped.at, Date.parse('2026-09-30T15:00:00Z'), 'Rejseplanen times are Europe/Copenhagen times');
        assert.equal(mapped.minutes, 5);
    });
});

// Invariant 2: only chosen lines and directions may be shown.
// Right behavior: a returned 40 line must not match or appear for a configured 40E.
test('test_bug_unconfigured_prefix_line_reaches_the_widget', async () => {
    const storage = makeStorage({
        [BUS_ENABLED_KEY]: 'true',
        [BUS_CONFIG_KEY]: JSON.stringify({
            campuses: ['lyngby'],
            stopIds: ['6015'],
            lines: [{ line: '40E', directions: ['*'] }]
        })
    });
    let calls = 0;
    const { api } = loadBusModule({
        storage,
        runtime: { LIVE_TRANSIT_API_BASE: 'https://proxy.invalid' },
        fetchImpl: async () => {
            calls++;
            return jsonResponse({
                ok: true,
                data: {
                    departures: [
                        { line: '40', direction: 'Skodsborg St.', time: '17:05:00', date: '2099-12-01' },
                        { line: '40E', direction: 'Skodsborg St.', time: '17:06:00', date: '2099-12-01' }
                    ]
                }
            });
        }
    });

    const departures = await api.fetchBusDepartures();
    const rows = plain(api.buildBusWidgetModel(departures, api.getBusConfig(), Date.now()));

    assert.equal(calls, 1);
    assert.deepEqual(rows.map((row) => row.line), ['40E']);
});

// Invariant 2: only chosen directions may be shown.
// Right behavior: no strict match means an empty widget, not the opposite direction.
test('test_bug_direction_filter_is_dropped_on_empty_strict_result', async () => {
    const storage = makeStorage({
        [BUS_ENABLED_KEY]: 'true',
        [BUS_CONFIG_KEY]: JSON.stringify({
            campuses: ['lyngby'],
            stopIds: ['6015'],
            lines: [{ line: '150S', directions: ['Nørreport St.'] }]
        })
    });
    let calls = 0;
    const { api } = loadBusModule({
        storage,
        runtime: { LIVE_TRANSIT_API_BASE: 'https://proxy.invalid' },
        fetchImpl: async () => {
            calls++;
            if (calls === 1) return jsonResponse({ ok: true, data: { departures: [] } });
            return jsonResponse({
                ok: true,
                data: {
                    departures: [
                        { line: '150S', direction: 'Kokkedal St.', time: '17:05:00', date: '2099-12-01' }
                    ]
                }
            });
        }
    });

    const departures = await api.fetchBusDepartures();

    assert.deepEqual(
        plain(departures).map((departure) => departure.direction),
        [],
        'a Nørreport St. direction filter must not fall back to showing Kokkedal St.'
    );
});

// Invariant 5: an old or corrupt config with no usable lines is migrated or reset.
// Right behavior: restore the selected campus defaults instead of silently storing no lines.
test('test_bug_missing_or_invalid_lines_is_treated_as_empty_config', () => {
    for (const config of [
        { campuses: ['lyngby'], stopIds: ['6015'] },
        { campuses: ['lyngby'], stopIds: ['6015'], lines: 'not-an-array' }
    ]) {
        const storage = makeStorage({ [BUS_CONFIG_KEY]: JSON.stringify(config) });
        const { api } = loadBusModule({ storage });
        const saved = api.getBusConfig();

        assert.deepEqual(
            Array.from(saved.lines, (line) => line.line),
            ['150S', 'L', '40E'],
            'an old or corrupt config without a usable lines list must be reset to campus defaults'
        );
    }
});

// Invariant 3: missing fields must give a clear state, never NaN output.
// Right behavior: use the stored clock or minutes text when the cache has no timestamp.
test('test_bug_legacy_departure_without_timestamp_renders_nan_clock', () => {
    const rows = plain(modelApi.buildBusWidgetModel(
        [{ line: '150S', direction: 'A', minutes: 90, time: '18:30' }],
        { lines: [{ line: '150S' }] },
        NOW
    ));

    assert.doesNotMatch(rows[0].when, /NaN/, 'a cached departure without a timestamp must not render NaN:NaN');
    assert.doesNotMatch(rows[0].title, /NaN/);
});

// Invariant 2/3: the same departure must not be rendered as several buses.
// Right behavior: duplicate line, direction and time entries collapse to one row.
test('test_bug_duplicate_api_departures_are_shown_repeatedly', () => {
    const departure = { line: '150S', direction: 'A', at: at(5), delay: 0 };
    const rows = plain(modelApi.buildBusWidgetModel(
        [departure, { ...departure }],
        { lines: [{ line: '150S' }] },
        NOW
    ));

    assert.equal(
        rows.filter((row) => !row.none).length,
        1,
        'the same line, direction and time is one departure, not two rows'
    );
});

// Invariant 3: a stale list must not be presented as live after a failed refresh.
// Right behavior: keep the rows but mark the last successful fetch as stale.
test('test_bug_failed_refresh_marks_stale_cached_list_as_live', async () => {
    const now = Date.now();
    const storage = makeStorage({
        [BUS_ENABLED_KEY]: 'true',
        [BUS_CONFIG_KEY]: JSON.stringify({
            campuses: ['lyngby'],
            stopIds: ['6015'],
            lines: [{ line: '150S', directions: ['*'] }]
        })
    });
    const { api, document } = loadBusModule({
        storage,
        runtime: { LIVE_TRANSIT_API_BASE: 'https://proxy.invalid' },
        fetchImpl: async () => { throw new Error('network down'); }
    });
    const nav = new FakeElement('div');
    nav.className = 'd2l-navigation-s-main-wrapper';
    document.body.appendChild(nav);

    api.setState({
        lastBusFetch: now - 10 * 60000,
        cachedDepartures: [{ line: '150S', direction: 'A', at: now + 30 * 60000, delay: 0, minutes: 30 }],
        busHasResult: true,
        busLastFetchFailed: false
    });

    await api.updateBusDepartures();

    const container = nav.querySelector('.dtu-bus-departures');
    assert.ok(container, 'the widget should still be mounted');
    assert.equal(
        container.getAttribute('data-stale'),
        '1',
        'a failed refresh must not restart the freshness clock on a ten-minute-old list'
    );
});

// Invariant 4: requests are bounded and errors enter backoff.
// Right behavior: one failed widget request must not immediately retry every stop.
test('test_bug_widget_network_error_fans_out_to_every_stop', async () => {
    const storage = makeStorage({
        [BUS_ENABLED_KEY]: 'true',
        [BUS_CONFIG_KEY]: JSON.stringify({
            campuses: ['lyngby'],
            stopIds: ['6015', '6026', '474'],
            lines: [{ line: '150S', directions: ['*'] }]
        })
    });
    let calls = 0;
    const { api } = loadBusModule({
        storage,
        runtime: { LIVE_TRANSIT_API_BASE: 'https://proxy.invalid' },
        fetchImpl: async () => {
            calls++;
            throw new Error('proxy unavailable');
        }
    });

    await api.fetchBusDepartures();

    assert.equal(
        calls,
        1,
        'one failed widget request must enter backoff instead of retrying once per stop'
    );
});

// Invariant 4: several Learn tabs must not fetch at the same time.
// Right behavior: the shared lease is acquired by exactly one tab.
test('test_bug_shared_fetch_lease_allows_two_tabs_to_fetch', () => {
    const shared = makeStorage();
    let firstTabWon = false;
    let interleave = null;
    const originalGetItem = shared.getItem.bind(shared);
    shared.getItem = (key) => {
        const value = originalGetItem(key);
        if (interleave) {
            const run = interleave;
            interleave = null;
            run();
        }
        return value;
    };

    const firstTab = loadBusModule({ storage: shared });
    const secondTab = loadBusModule({ storage: shared });
    interleave = () => { firstTabWon = firstTab.api.tryAcquireBusFetchLease(); };

    const secondTabWon = secondTab.api.tryAcquireBusFetchLease();

    assert.equal(
        Number(firstTabWon) + Number(secondTabWon),
        1,
        'the lease is a compare-and-set; two tabs must not both decide they own it'
    );
});

test('test_holds_spring_forward_departure_uses_post_transition_offset', () => {
    withTimeZone('Europe/Copenhagen', () => {
        const nowTs = Date.parse('2026-03-29T00:55:00Z');
        const timeApi = extractFunctions('darkmode.bus.js', ['copenhagenTimestamp', 'departureTimestamp', 'minutesUntilDeparture'], {
            globals: { Date: fixedDate(nowTs) }
        }).api;

        const departure = { line: '150S', direction: 'A', time: '03:30:00', date: '2026-03-29' };

        assert.equal(timeApi.departureTimestamp(departure), Date.parse('2026-03-29T01:30:00Z'));
        assert.equal(timeApi.minutesUntilDeparture(departure), 35);
    });
});

test('test_holds_midnight_and_new_year_countdowns', () => {
    withTimeZone('Europe/Copenhagen', () => {
        const nowTs = Date.parse('2026-12-31T22:55:00Z');
        const timeApi = extractFunctions('darkmode.bus.js', ['copenhagenTimestamp', 'minutesUntilDeparture'], {
            globals: { Date: fixedDate(nowTs) }
        }).api;

        assert.equal(timeApi.minutesUntilDeparture({ time: '23:58:00', date: '2026-12-31' }), 3);
        assert.equal(timeApi.minutesUntilDeparture({ time: '00:02:00', date: '2027-01-01' }), 7);
        assert.equal(timeApi.minutesUntilDeparture({ time: '23:58:00', date: '2026-12-30' }) < 0, true);
    });
});

test('test_holds_unsorted_500_departures_show_soonest_three', () => {
    const departures = Array.from({ length: 500 }, (_, index) => ({
        line: '150S',
        direction: 'D' + index,
        at: at(index + 1),
        delay: 0
    }));
    for (let index = departures.length - 1; index > 0; index--) {
        const swap = (index * 37) % (index + 1);
        [departures[index], departures[swap]] = [departures[swap], departures[index]];
    }

    const rows = plain(modelApi.buildBusWidgetModel(departures, { lines: [{ line: '150S' }] }, NOW));

    assert.deepEqual(rows.map((row) => row.when), ['1 min', '2 min', '3 min']);
});

test('test_holds_empty_api_data_gives_none_rows_without_nan', () => {
    const rows = plain(modelApi.buildBusWidgetModel([], {
        lines: [{ line: '150S' }, { line: '40E' }]
    }, NOW));

    assert.deepEqual(rows.map((row) => [row.line, row.none]), [['150S', true], ['40E', true]]);
    assert.doesNotMatch(JSON.stringify(rows), /NaN/);
});

test('test_holds_api_text_is_rendered_as_text', () => {
    const badges = extractFunctions('darkmode.bus.js', ['splitBusLine', 'createBusLineBadge'], {
        prelude: "var BUS_TYPE_COLORS = { S: '#1d62b3', E: '#1e7a3c', A: '#c21f32' };",
        globals: { document: new FakeDocument(), markExt() {} }
    }).api;
    const markup = '<img src=x onerror=alert(1)>';
    const badge = badges.createBusLineBadge(markup);

    assert.equal(badge.children[0].textContent, markup);
    assert.doesNotMatch(SRC, /innerHTML|insertAdjacentHTML|outerHTML/);
});

test('test_holds_setup_save_round_trips_exactly', () => {
    const { api } = loadBusModule({ storage: makeStorage() });
    const chosen = {
        campuses: ['lyngby'],
        stopIds: ['6015'],
        lines: [
            { line: '150S', directions: ['Nørreport St.'] },
            { line: '40E', directions: [] }
        ]
    };

    api.saveBusConfig(chosen);

    assert.deepEqual(plain(api.getBusConfig()), chosen);
});

test('test_holds_overlapping_updates_do_not_double_fetch', async () => {
    const storage = makeStorage({
        [BUS_ENABLED_KEY]: 'true',
        [BUS_CONFIG_KEY]: JSON.stringify({
            campuses: ['lyngby'],
            stopIds: ['6015'],
            lines: [{ line: '150S', directions: ['*'] }]
        })
    });
    let calls = 0;
    let releaseFetch;
    const { api } = loadBusModule({
        storage,
        runtime: { LIVE_TRANSIT_API_BASE: 'https://proxy.invalid' },
        fetchImpl: () => {
            calls++;
            return new Promise((resolve) => { releaseFetch = resolve; });
        }
    });
    api.setState({ lastBusFetch: 0 });

    const first = api.updateBusDepartures();
    await Promise.resolve();
    const second = api.updateBusDepartures();
    releaseFetch(jsonResponse({ ok: true, data: { departures: [] } }));
    await Promise.all([first, second]);

    assert.equal(calls, 1, 'the second update must join the in-flight refresh, not start another request');
});

test('test_holds_no_fetch_when_widget_is_off_or_tab_is_hidden', async () => {
    const config = JSON.stringify({
        campuses: ['lyngby'],
        stopIds: ['6015'],
        lines: [{ line: '150S', directions: ['*'] }]
    });
    let calls = 0;
    const fetchImpl = async () => { calls++; return jsonResponse({ ok: true, data: { departures: [] } }); };

    const off = loadBusModule({
        storage: makeStorage({ [BUS_ENABLED_KEY]: 'false', [BUS_CONFIG_KEY]: config }),
        runtime: { LIVE_TRANSIT_API_BASE: 'https://proxy.invalid' },
        fetchImpl
    });
    await off.api.updateBusDepartures();

    const hidden = loadBusModule({
        storage: makeStorage({ [BUS_ENABLED_KEY]: 'true', [BUS_CONFIG_KEY]: config }),
        runtime: { LIVE_TRANSIT_API_BASE: 'https://proxy.invalid' },
        fetchImpl
    });
    hidden.document.hidden = true;
    await hidden.api.updateBusDepartures();

    assert.equal(calls, 0);
});

test('test_holds_html_error_and_rate_limit_give_states', async () => {
    const config = {
        campuses: ['lyngby'],
        stopIds: ['6015'],
        lines: [{ line: '150S', directions: ['*'] }]
    };
    const html = loadBusModule({
        runtime: { LIVE_TRANSIT_API_BASE: 'https://proxy.invalid' },
        fetchImpl: async () => ({
            ok: true,
            status: 200,
            json: async () => { throw new SyntaxError('not json'); }
        })
    });
    assert.deepEqual(plain(await html.api.fetchBusWidgetDepartures(config)), {
        departures: [], ok: false, reason: 'network'
    });

    const limited = loadBusModule({
        storage: makeStorage(),
        runtime: { LIVE_TRANSIT_API_BASE: 'https://proxy.invalid' },
        fetchImpl: async () => jsonResponse({}, 429)
    });
    assert.deepEqual(plain(await limited.api.fetchBusWidgetDepartures(config)), {
        departures: [], ok: false, reason: 'quota'
    });
    assert.equal(limited.storage.getItem('dtuDarkModeBusQuotaExhausted') !== null, true);
});
