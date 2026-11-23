import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { loadModuleInternals, loadModulesInternals, makeLocalStorage, makeLocation, readSource } from './_harness.mjs';

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

function load({ api = 'browser', local = {}, ext = {}, darkModeEnabled = true, top = true, deviceDark } = {}) {
    const storage = makeStorage(api, ext);
    const reloads = [];
    const listeners = [];
    const storageNs = { local: storage.area, onChanged: { addListener: (fn) => listeners.push(fn) } };
    const globals = {
        localStorage: makeLocalStorage(local),
        location: { reload: () => reloads.push(1) },
        DTUAfterDarkUrlPause: { isTopWindow: top }
    };
    if (deviceDark !== undefined) globals.matchMedia = () => ({ matches: deviceDark });
    if (api === 'browser') globals.browser = { storage: storageNs };
    else globals.chrome = { storage: storageNs, runtime: {} };
    const { api: fns } = loadModulesInternals(['darkmode.storage.js', 'darkmode.theme-state.js'], [
        'deviceThemeQuery',
        'isFollowingDeviceTheme',
        'isDarkModeEnabled',
        'getExtensionStorageArea',
        'saveDarkModePreference',
        'saveDarkModeFollowDevice',
        'applyStoredDarkModeValue',
        'subscribeDarkModeStorageChanges'
    ], globals);
    return { fns, storage, reloads, listeners, localStorage: globals.localStorage, enabled: darkModeEnabled };
}

test('storage key matches darkmode.theme-state.js', () => {
    assert.match(readSource('darkmode.theme-state.js'), new RegExp(`DARK_MODE_KEY\\s*=\\s*'${KEY}'`));
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
        assert.equal(t.storage.area.data['dtuDarkModeFollowDevice'], false, 'manual choice ends Auto');
    });
}

test('save resolves even when there is no extension storage', async () => {
    const { api: fns } = loadModulesInternals(['darkmode.storage.js', 'darkmode.theme-state.js'], [
        'saveDarkModePreference'
    ], {
        localStorage: makeLocalStorage(),
        DTUAfterDarkUrlPause: { isTopWindow: true }
    });
    await fns.saveDarkModePreference(true);
});

test('startup sync: a different stored boolean updates localStorage and reloads the top window', () => {
    const t = load({ darkModeEnabled: true });
    t.fns.applyStoredDarkModeValue(false, undefined, t.enabled);
    assert.equal(t.localStorage.getItem(KEY), 'false');
    assert.equal(t.reloads.length, 1);
});

test('startup sync: same value or missing value does nothing', () => {
    const t = load({ darkModeEnabled: true });
    t.fns.applyStoredDarkModeValue(true, undefined, t.enabled);
    t.fns.applyStoredDarkModeValue(undefined, undefined, t.enabled);
    assert.equal(t.reloads.length, 0);
});

test('startup sync: iframes update localStorage but never reload', () => {
    const t = load({ darkModeEnabled: true, top: false });
    t.fns.applyStoredDarkModeValue(false, undefined, t.enabled);
    assert.equal(t.localStorage.getItem(KEY), 'false');
    assert.equal(t.reloads.length, 0);
});

test('startup sync: a non-boolean stored value is ignored (no reload loop)', () => {
    for (const bad of ['false', 'true', 0, 1, null, {}]) {
        const t = load({ darkModeEnabled: false, local: { [KEY]: 'false' } });
        t.fns.applyStoredDarkModeValue(bad, undefined, t.enabled);
        assert.equal(t.reloads.length, 0, `reloaded for ${JSON.stringify(bad)}`);
        assert.equal(t.localStorage.getItem(KEY), 'false', `overwrote localStorage for ${JSON.stringify(bad)}`);
    }
});

test('storage change listener reloads only on a real boolean change in local storage', () => {
    const t = load({ darkModeEnabled: true });
    t.fns.subscribeDarkModeStorageChanges(t.enabled);
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
    const bridge = readSource('darkmode.settings.bridge.js');
    assert.match(settings, /saveDarkModePreference\(opt\[0\] === 'dark'\);[\s\S]{0,120}Promise\.resolve\(saved\)\.then\(function \(\) \{ location\.reload/);
    assert.match(bridge, /function saveDarkModePreference\(enabled\) \{\s*return callDep/);
    const shell = readSource('darkmode.learn-shell.js');
    assert.match(shell, /saveDarkModePreference\(!isDarkModeEnabled\(\)\)\)\.then\(/);
});

test('startup sync: an unset extension value means the default, so a stale "false" on one site is corrected once', () => {
    const stale = load({ darkModeEnabled: false, local: { [KEY]: 'false' } });
    stale.fns.applyStoredDarkModeValue(undefined, undefined, stale.enabled);
    assert.equal(stale.localStorage.getItem(KEY), 'true');
    assert.equal(stale.reloads.length, 1);

    // After that reload the site reads "true" and stays put.
    const settled = load({ darkModeEnabled: true, local: { [KEY]: 'true' } });
    settled.fns.applyStoredDarkModeValue(undefined, undefined, settled.enabled);
    assert.equal(settled.reloads.length, 0);
});

const FOLLOW = 'dtuDarkModeFollowDevice';

test('Auto: the device wins over the stored manual value; off means manual', () => {
    assert.equal(load({ local: { [FOLLOW]: 'true', [KEY]: 'true' }, deviceDark: false }).fns.isDarkModeEnabled(), false);
    assert.equal(load({ local: { [FOLLOW]: 'true', [KEY]: 'false' }, deviceDark: true }).fns.isDarkModeEnabled(), true);
    assert.equal(load({ local: { [KEY]: 'true' }, deviceDark: false }).fns.isDarkModeEnabled(), true);
});

test('match device theme: startup sync caches the shared flag and reloads when the device disagrees', () => {
    const t = load({ darkModeEnabled: true, deviceDark: false });
    t.fns.applyStoredDarkModeValue(true, true, t.enabled);
    assert.equal(t.localStorage.getItem(FOLLOW), 'true');
    assert.equal(t.reloads.length, 1);
    const u = load({ darkModeEnabled: true, local: { [FOLLOW]: 'true' }, deviceDark: true });
    u.fns.applyStoredDarkModeValue(false, undefined, u.enabled);
    assert.equal(u.localStorage.getItem(FOLLOW), null, 'unset follow means off');
    assert.equal(u.reloads.length, 1, 'manual false now applies');
});

test('match device theme: save writes localStorage and extension storage', async () => {
    const t = load();
    const p = t.fns.saveDarkModeFollowDevice(true);
    assert.equal(t.localStorage.getItem(FOLLOW), 'true');
    t.storage.flush();
    await p;
    assert.equal(t.storage.area.data[FOLLOW], true);
});

test('a light table cell in course text gets dark text on the cell itself, not only its children', () => {
    // The general light-text rule in htmlBlockStyles has a class, two type
    // :not()s and three [style] :not()s; the marker rule for the cell must
    // carry the same list plus the marker so it wins the cascade (checked in
    // Chromium and Firefox with .dtu-dev/probe-authored-light-cell.mjs).
    const css = readSource('darkmode.dark-engine.styles.js').match(/const htmlBlockStyles = `([\s\S]*?)`;/)[1];
    const general = 'div.d2l-html-block-rendered *:not(a):not(a *):not([style^="color"]):not([style*="; color"]):not([style*=";color"])';
    const marker = 'div.d2l-html-block-rendered [data-dtu-authored-light-bg]:not(a):not(a *):not([style^="color"]):not([style*="; color"]):not([style*=";color"])';
    assert.ok(css.includes(general), 'the general light-text rule is still there');
    const rule = css.slice(css.indexOf(marker));
    assert.ok(css.includes(marker), 'the marker rule repeats the :not() list');
    assert.match(rule.slice(0, rule.indexOf('}')), /color:\s*#202122\s*!important/);
});

// Length and SHA-256 of every constant evaluated from darkmode.dark-engine.js
// before the split. The values are snapshots, so the CSS text cannot change by
// accident while the constants move between files.
const MOVED_STYLE_SNAPSHOT = {
    DARK_BG: [7, 'df78330bb3c5a96c6efbecdadc8874beb97a05b1697d1d34171c1be8898f914c'],
    DARK_TEXT: [7, '065230c87e27d62bc4a9705a2bc1dad5319fc9ad1b9a0f4d6efc449549392991'],
    DARK_BORDER: [7, 'a26e56380d6ef77775d9dbc4fdaf48744d01a4e8eafa8a04a3b05099b880a484'],
    shadowDOMStyles: [6347, '2fd6f6d5477c0dde9a690fe370bc8b71cbbcf6762c52e5375aaecd82d88617e5'],
    buttonIconShadowStyles: [9908, '2910a59226b5e6f431d8328473ee6f2d0d9873b498785ce878b61ee53fc68ef6'],
    iframeStyles: [5727, '46a632c7ea6efab7d60555e26bfe752b2e5001748121eed390875054db0e5193'],
    iconShadowStyles: [160, '03bc1764d433e05eeec228bf617d7a4c8e4accc2169ff4975a2cbae511f59222'],
    enrollmentCardShadowStyles: [1016, 'e826a75df7fc0e31f6c9e464561420553d2089f5467e0ae572617b7e087b18ac'],
    myCoursesEnrollmentCardShadowStyles: [2234, 'e14703e340ec16bebaba2c4ec043adac56e1b6c313f77dd4a0ac73b95d7a3aac'],
    cardShadowStyles: [1525, 'f355409c45993faebe1460d673797a6654c28461583e0bdfc8cfa3aa2af283c9'],
    breadcrumbShadowStyles: [489, 'c8c24ebc334187069f89da6b6b59c23cae3862b266b001c506694f6a7ec0ab93'],
    expandCollapseStyles: [320, '53ae0a430935a292ecbc25095b40fa43ddfecc5c279d00ab410c95b90ef8db9c'],
    lessonsTocExpandCollapseStyles: [177, '5338a8192555f9958c97114a4fd522c5caad589f5eeaabb3f9a4ef7d116f83af'],
    htmlEditorShadowStyles: [1094, '87170865d3adcd971d4b9ee27931701377d9f6bdf3e1cf76124634bb944e7ad1'],
    menuStyles: [2618, '7e1d1f0ac4d6fc8381dd1e63c5b549dd45c3fa466f6f13cf1417b118b4497271'],
    buttonSubtleStyles: [1786, 'f492b81159d72663461c18d81d94139c2ccc58116ef982dfb00f573fb1b326e7'],
    listItemNavStyles: [5599, '084bf111ed63790b55cfa3b67008ef45325a7b0035ce58594a9c7dc04791803e'],
    w2dListStyles: [1363, 'b3795293fe945a7be61ea43c613304ffcce2585cbec5ffec8e2e359809bfd146'],
    htmlBlockStyles: [3595, 'f3e3edf8095580b5da8ae4099d7182bb35814eaad1f1bd514643350b93d7a980']
};

test('the moved dark engine styles keep their pre-split bytes', () => {
    const source = readSource('darkmode.dark-engine.styles.js');
    assert.doesNotMatch(source, /DTUAfterDarkDarkEngineDeps/, 'the styles module never reads paused-page deps');
    const { context } = loadModuleInternals('darkmode.dark-engine.styles.js', [], {});
    const styles = context.DTUAfterDarkDarkEngineStyles;
    assert.ok(styles, 'the styles module sets its namespace');
    assert.deepEqual(Object.keys(styles), Object.keys(MOVED_STYLE_SNAPSHOT));
    for (const [name, [length, sha256]] of Object.entries(MOVED_STYLE_SNAPSHOT)) {
        const value = styles[name];
        assert.equal(typeof value, 'string', `${name} is a string`);
        assert.equal(value.length, length, `${name} length`);
        assert.equal(createHash('sha256').update(value, 'utf8').digest('hex'), sha256, `${name} bytes`);
    }
});

test('every manifest group loads the styles immediately before the engine', () => {
    for (const manifestFile of ['manifest.json', 'manifest_chrome.json']) {
        const manifest = JSON.parse(readSource(manifestFile));
        for (const group of manifest.content_scripts) {
            const js = group.js || [];
            const at = js.indexOf('darkmode.dark-engine.js');
            if (at < 0) continue;
            assert.equal(js[at - 2], 'darkmode.dark-engine.page-cases.js', manifestFile);
            assert.equal(js[at - 1], 'darkmode.dark-engine.styles.js', manifestFile);
        }
    }
});

test('the lighter dark style leaves the red header to forceDtuRedBackgroundDark2, so the observer cannot loop', () => {
    // It used to paint .dturedbackground grey and the observer then painted it red: each
    // write was a new style change, so a red header added after load froze the tab (2026-11-22).
    const writes = [];
    const handed = [];
    const el = {
        tagName: 'DIV',
        id: '',
        style: { setProperty: (prop, value) => writes.push(prop + ': ' + value), getPropertyValue: () => '', getPropertyPriority: () => '' },
        matches: (selector) => String(selector).split(',').some((part) => part.trim() === '.dturedbackground'),
        closest: () => null,
        hasAttribute: () => false,
        getAttribute: () => ''
    };
    const { api } = loadModuleInternals(['darkmode.dark-engine.page-cases.js', 'darkmode.dark-engine.styles.js', 'darkmode.dark-engine.js'], ['applyLighterDarkStyle'], {
        document: { querySelectorAll: () => [], documentElement: {} },
        window: { location: makeLocation('https://campusnet.dtu.dk/cnnet/Grades/Grades.aspx') },
        MutationObserver: class { observe() {} },
        customElements: { get: () => ({}), whenDefined: () => Promise.resolve() },
        setTimeout: () => 0,
        clearTimeout: () => {},
        DTUAfterDarkDarkEngineDeps: { isDarkModeEnabled: () => false, forceDtuRedBackgroundDark2: (node) => handed.push(node) }
    });
    api.applyLighterDarkStyle(el);
    assert.deepEqual(writes, []);
    assert.deepEqual(handed, [el]);
});
