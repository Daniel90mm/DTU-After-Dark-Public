import assert from 'node:assert/strict';
import test from 'node:test';
import { extractFunctions, makeLocalStorage, readSource } from './_harness.mjs';

const KEY = 'dtuDarkModeEnabled';

// A fake extension storage area. `api` picks the promise (Firefox) or
// callback (Chrome) flavour; `pending` holds writes until `flush()`.
function makeStorage(api, initial = {}) {
    const data = { ...initial };
    const pending = [];
    const area = {
        data,
        get(keys, cb) {
            const out = {};
            [].concat(keys).forEach((k) => { if (k in data) out[k] = data[k]; });
            if (api === 'browser') return Promise.resolve(out);
            cb(out);
        },
        set(obj, cb) {
            let done;
            const p = new Promise((resolve) => { done = resolve; });
            pending.push(() => { Object.assign(data, obj); done(); if (cb) cb(); });
            if (api === 'browser') return p;
        }
    };
    return { area, flush: () => { while (pending.length) pending.shift()(); } };
}

function load({ api = 'browser', local = {}, ext = {}, darkModeEnabled = true, top = true } = {}) {
    const storage = makeStorage(api, ext);
    const reloads = [];
    const listeners = [];
    const storageNs = { local: storage.area, onChanged: { addListener: (fn) => listeners.push(fn) } };
    const globals = {
        localStorage: makeLocalStorage(local),
        location: { reload: () => reloads.push(1) }
    };
    if (api === 'browser') globals.browser = { storage: storageNs };
    else globals.chrome = { storage: storageNs, runtime: {} };
    const { api: fns, context } = extractFunctions('darkmode.js', [
        'isDarkModeEnabled',
        'getExtensionStorageArea',
        'saveDarkModePreference',
        'applyStoredDarkModeValue',
        'subscribeDarkModeStorageChanges'
    ], {
        prelude: `var DARK_MODE_KEY = ${JSON.stringify(KEY)};
            var darkModeEnabled = ${darkModeEnabled};
            var IS_TOP_WINDOW = ${top};`,
        globals
    });
    context.window.top = top ? context.window : {};
    return { fns, storage, reloads, listeners, localStorage: globals.localStorage };
}

test('storage key matches darkmode.js', () => {
    assert.match(readSource('darkmode.js'), new RegExp(`DARK_MODE_KEY\\s*=\\s*'${KEY}'`));
});

test('dark mode defaults on, and follows the stored string', () => {
    assert.equal(load().fns.isDarkModeEnabled(), true);
    assert.equal(load({ local: { [KEY]: 'false' } }).fns.isDarkModeEnabled(), false);
    assert.equal(load({ local: { [KEY]: 'true' } }).fns.isDarkModeEnabled(), true);
});

for (const api of ['browser', 'chrome']) {
    test(`save writes localStorage and ${api} extension storage, and resolves after the write`, async () => {
        const t = load({ api });
        let resolved = false;
        const p = t.fns.saveDarkModePreference(false);
        assert.equal(t.localStorage.getItem(KEY), 'false');
        assert.ok(p && typeof p.then === 'function', 'save returns a promise');
        p.then(() => { resolved = true; });
        await Promise.resolve();
        assert.equal(resolved, false, 'must not resolve before the storage write lands');
        t.storage.flush();
        await p;
        assert.equal(t.storage.area.data[KEY], false);
    });
}

test('save resolves even when there is no extension storage', async () => {
    const { api: fns } = extractFunctions('darkmode.js', [
        'getExtensionStorageArea', 'saveDarkModePreference'
    ], {
        prelude: `var DARK_MODE_KEY = ${JSON.stringify(KEY)};`,
        globals: { localStorage: makeLocalStorage() }
    });
    await fns.saveDarkModePreference(true);
});

test('startup sync: a different stored boolean updates localStorage and reloads the top window', () => {
    const t = load({ darkModeEnabled: true });
    t.fns.applyStoredDarkModeValue(false);
    assert.equal(t.localStorage.getItem(KEY), 'false');
    assert.equal(t.reloads.length, 1);
});

test('startup sync: same value or missing value does nothing', () => {
    const t = load({ darkModeEnabled: true });
    t.fns.applyStoredDarkModeValue(true);
    t.fns.applyStoredDarkModeValue(undefined);
    assert.equal(t.reloads.length, 0);
});

test('startup sync: iframes update localStorage but never reload', () => {
    const t = load({ darkModeEnabled: true, top: false });
    t.fns.applyStoredDarkModeValue(false);
    assert.equal(t.localStorage.getItem(KEY), 'false');
    assert.equal(t.reloads.length, 0);
});

test('startup sync: a non-boolean stored value is ignored (no reload loop)', () => {
    for (const bad of ['false', 'true', 0, 1, null, {}]) {
        const t = load({ darkModeEnabled: false, local: { [KEY]: 'false' } });
        t.fns.applyStoredDarkModeValue(bad);
        assert.equal(t.reloads.length, 0, `reloaded for ${JSON.stringify(bad)}`);
        assert.equal(t.localStorage.getItem(KEY), 'false', `overwrote localStorage for ${JSON.stringify(bad)}`);
    }
});

test('storage change listener reloads only on a real boolean change in local storage', () => {
    const t = load({ darkModeEnabled: true });
    t.fns.subscribeDarkModeStorageChanges();
    const [fn] = t.listeners;
    fn({ [KEY]: { newValue: true } }, 'local');
    fn({ [KEY]: { newValue: 'false' } }, 'local');
    fn({ [KEY]: { newValue: false } }, 'sync');
    fn({ other: { newValue: false } }, 'local');
    assert.equal(t.reloads.length, 0);
    fn({ [KEY]: { newValue: false } }, 'local');
    assert.equal(t.reloads.length, 1);
});

test('both Dark Mode toggles reload only after the save resolves', () => {
    const settings = readSource('darkmode.settings.js');
    assert.match(settings, /'dark-mode-toggle':[\s\S]{0,300}saveDarkModePreference\(checked\)\)\.then\(/);
    assert.match(settings, /function saveDarkModePreference\(enabled\) \{\s*return callDep/);
    const shell = readSource('darkmode.learn-shell.js');
    assert.match(shell, /saveDarkModePreference\(!isDarkModeEnabled\(\)\)\)\.then\(/);
});

test('startup sync: an unset extension value means the default, so a stale "false" on one site is corrected once', () => {
    const stale = load({ darkModeEnabled: false, local: { [KEY]: 'false' } });
    stale.fns.applyStoredDarkModeValue(undefined);
    assert.equal(stale.localStorage.getItem(KEY), 'true');
    assert.equal(stale.reloads.length, 1);

    // After that reload the site reads "true" and stays put.
    const settled = load({ darkModeEnabled: true, local: { [KEY]: 'true' } });
    settled.fns.applyStoredDarkModeValue(undefined);
    assert.equal(settled.reloads.length, 0);
});
