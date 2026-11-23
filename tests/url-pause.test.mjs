import assert from 'node:assert/strict';
import test from 'node:test';
import { extractFunctions, loadModuleInternals, makeLocalStorage, makeLocation, plain } from './_harness.mjs';

const KEY = 'dtuAfterDarkUrlPausePatterns';

function loadPause(href, patterns = []) {
    return extractFunctions('darkmode.url-pause.js', [
        'getCurrentUrlWithoutHash',
        'normalizeUrlPausePattern',
        'isPauseProtectedUrl',
        'isPauseProtectedPattern',
        'getUrlPausePatterns',
        'wildcardPatternToRegExp',
        'wildcardMatches',
        'getMatchingUrlPausePatterns',
        'buildSuggestedPausePatternsForCurrentUrl'
    ], {
        prelude: `var URL_PAUSE_PATTERNS_KEY = ${JSON.stringify(KEY)};`,
        globals: {
            location: makeLocation(href),
            localStorage: makeLocalStorage({ [KEY]: JSON.stringify(patterns) })
        }
    }).api;
}

test('the storage key used by the test matches darkmode.url-pause.js', async () => {
    const { readSource } = await import('./_harness.mjs');
    assert.match(readSource('darkmode.url-pause.js'), new RegExp(`URL_PAUSE_PATTERNS_KEY\\s*=\\s*'${KEY}'`));
});

test('patterns normalise: whitespace, leading slash, hash', () => {
    const api = loadPause('https://learn.inside.dtu.dk/d2l/lms/news/main.d2l?ou=1');
    assert.equal(api.normalizeUrlPausePattern(' /d2l/lms/* '), 'https://learn.inside.dtu.dk/d2l/lms/*');
    assert.equal(api.normalizeUrlPausePattern('https://a.dk/x #frag'), 'https://a.dk/x');
    assert.equal(api.normalizeUrlPausePattern(''), '');
});

test('wildcard patterns match whole URLs, case-insensitively, with regex chars escaped', () => {
    const api = loadPause('https://learn.inside.dtu.dk/');
    const re = api.wildcardPatternToRegExp('https://learn.inside.dtu.dk/d2l/lms/*?ou=123*');
    assert.equal(re.test('https://learn.inside.dtu.dk/d2l/lms/news/main.d2l?ou=123'), true);
    assert.equal(re.test('https://LEARN.inside.dtu.dk/d2l/lms/x?ou=1234'), true);
    assert.equal(re.test('https://learn.inside.dtu.dk/d2l/lms/x?ou=999'), false);
    assert.equal(re.test('https://learnXinside.dtu.dk/d2l/lms/x?ou=123'), false, 'dots are literal');
});

test('stored patterns pause matching pages, de-duplicated', () => {
    const url = 'https://learn.inside.dtu.dk/d2l/lms/news/main.d2l?ou=123';
    const api = loadPause(url, ['/d2l/lms/*', ' /d2l/lms/* ', 'https://other.dk/*']);
    assert.deepEqual(plain(api.getUrlPausePatterns()), ['https://learn.inside.dtu.dk/d2l/lms/*', 'https://other.dk/*']);
    assert.deepEqual(plain(api.getMatchingUrlPausePatterns()), ['https://learn.inside.dtu.dk/d2l/lms/*']);
});

test('the Learn homepage can never be paused, even by a catch-all pattern', () => {
    const api = loadPause('https://learn.inside.dtu.dk/d2l/home', ['*']);
    assert.deepEqual(plain(api.getMatchingUrlPausePatterns()), []);
    assert.equal(api.isPauseProtectedPattern('https://learn.inside.dtu.dk/d2l/home'), true);
    assert.equal(api.isPauseProtectedPattern('https://learn.inside.dtu.dk/d2l/home/12345'), false);
});

test('corrupt stored patterns are ignored, not thrown', () => {
    const api = extractFunctions('darkmode.url-pause.js', ['normalizeUrlPausePattern', 'getUrlPausePatterns'], {
        prelude: `var URL_PAUSE_PATTERNS_KEY = ${JSON.stringify(KEY)};`,
        globals: { location: makeLocation('https://learn.inside.dtu.dk/'), localStorage: makeLocalStorage({ [KEY]: '{not json' }) }
    }).api;
    assert.deepEqual(plain(api.getUrlPausePatterns()), []);
});

test('suggestions for a course tool page offer tool-wide and course-wide patterns', () => {
    const api = loadPause('https://learn.inside.dtu.dk/d2l/lms/dropbox/user/folders_list.d2l?ou=5555');
    const suggestions = plain(api.buildSuggestedPausePatternsForCurrentUrl());
    assert.deepEqual(suggestions, [
        'https://learn.inside.dtu.dk/d2l/lms/dropbox/user/folders_list.d2l?ou=5555',
        'https://learn.inside.dtu.dk/d2l/lms/dropbox/*',
        'https://learn.inside.dtu.dk/d2l/*?ou=5555*',
        'https://learn.inside.dtu.dk/d2l/lms/dropbox/user/folders_list.d2l?ou=5555*',
        'https://learn.inside.dtu.dk/d2l/home/5555*'
    ]);
});

test('suggestions never include the protected homepage', () => {
    const api = loadPause('https://learn.inside.dtu.dk/d2l/home');
    assert.deepEqual(plain(api.buildSuggestedPausePatternsForCurrentUrl()), ['https://learn.inside.dtu.dk/d2l/home*']);
});

test('wildcard matching agrees with the regular expression form on ordinary patterns', () => {
    const api = loadPause('https://learn.inside.dtu.dk/');
    const url = 'https://learn.inside.dtu.dk/d2l/lms/news/main.d2l?ou=12345&x=1';
    for (const p of ['https://learn.inside.dtu.dk/d2l/lms/*?ou=123*', '*news*', 'HTTPS://LEARN*', '*?ou=999*', 'https://learn.inside.dtu.dk/', '*', '*x=1', '*x=2']) {
        assert.equal(api.wildcardMatches(p, url), api.wildcardPatternToRegExp(p).test(url), p);
    }
});

// One browser: extension storage shared by every site, localStorage per site.
function makeShared(initial) {
    const items = new Map(initial === undefined ? [] : [[KEY, initial]]);
    const writes = [];
    return {
        items,
        writes,
        storageLocalGet(defaults, cb) { cb(Object.assign({}, defaults, Object.fromEntries(items))); },
        storageLocalSet(obj) { writes.push(obj); for (const [k, v] of Object.entries(obj)) items.set(k, v); return Promise.resolve(); }
    };
}

function loadSite(href, { shared, local, topHref } = {}) {
    const reloads = [];
    const location = Object.assign(makeLocation(href), { reload: () => reloads.push(href) });
    const win = { location };
    win.top = topHref ? { location: makeLocation(topHref) } : win;
    const { api } = loadModuleInternals('darkmode.url-pause.js', ['initUrlPause', 'saveUrlPausePatterns', 'getUrlPausePatterns'], {
        window: win,
        location,
        document: { readyState: 'loading', addEventListener() {} },
        localStorage: local || makeLocalStorage(),
        DTUAfterDarkStorage: shared
    });
    return { api, reloads };
}

test('a rule saved on DTU Learn pauses the kurser page it names', async () => {
    const shared = makeShared();
    const learn = loadSite('https://learn.inside.dtu.dk/d2l/home', { shared });
    learn.api.initUrlPause();
    await learn.api.saveUrlPausePatterns(['https://kurser.dtu.dk/course/*']);
    const kurserLocal = makeLocalStorage();
    const first = loadSite('https://kurser.dtu.dk/course/01001', { shared, local: kurserLocal });
    assert.deepEqual(plain(first.api.initUrlPause()), [], 'the first load has only the old local copy');
    assert.equal(first.reloads.length, 1, 'and reloads once into the paused state');
    const second = loadSite('https://kurser.dtu.dk/course/01001', { shared, local: kurserLocal });
    assert.deepEqual(plain(second.api.initUrlPause()), ['https://kurser.dtu.dk/course/*']);
    assert.equal(second.reloads.length, 0);
});

test("a site's rules from before sharing join the shared list once", () => {
    const shared = makeShared(['https://kurser.dtu.dk/x']);
    const local = makeLocalStorage({ [KEY]: JSON.stringify(['/d2l/le/content/1/*']) });
    const learn = loadSite('https://learn.inside.dtu.dk/d2l/home', { shared, local });
    learn.api.initUrlPause();
    assert.deepEqual(plain(shared.items.get(KEY)), ['https://kurser.dtu.dk/x', 'https://learn.inside.dtu.dk/d2l/le/content/1/*']);
    assert.equal(learn.reloads.length, 0);
    // Later, a rule removed on another site is gone here too.
    shared.items.set(KEY, []);
    loadSite('https://learn.inside.dtu.dk/d2l/home', { shared, local }).api.initUrlPause();
    assert.deepEqual(plain(JSON.parse(local.getItem(KEY))), []);
});

test('a frame on the same site follows the paused page around it', () => {
    const shared = makeShared(['https://learn.inside.dtu.dk/d2l/le/content/1/viewContent/*']);
    const local = makeLocalStorage({ [KEY]: JSON.stringify(['https://learn.inside.dtu.dk/d2l/le/content/1/viewContent/*']), dtuAfterDarkUrlPauseSharedV1: '1' });
    const frame = loadSite('https://learn.inside.dtu.dk/content/enforced/1/file.html', { shared, local, topHref: 'https://learn.inside.dtu.dk/d2l/le/content/1/viewContent/2/View' });
    assert.equal(frame.api.initUrlPause().length, 1);
    assert.equal(frame.reloads.length, 0, 'frames never reload the page');
});

test('saving waits for the shared write, so a reload after it keeps the rule', async () => {
    let finish;
    const shared = makeShared();
    shared.storageLocalSet = (obj) => new Promise((resolve) => { finish = () => { shared.items.set(KEY, obj[KEY]); resolve(); }; });
    const site = loadSite('https://kurser.dtu.dk/course/01001', { shared });
    let done = false;
    site.api.saveUrlPausePatterns(['https://kurser.dtu.dk/*']).then(() => { done = true; });
    await Promise.resolve();
    assert.equal(done, false);
    finish();
    await Promise.resolve();
    assert.equal(done, true);
});
