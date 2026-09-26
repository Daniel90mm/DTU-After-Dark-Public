import assert from 'node:assert/strict';
import test from 'node:test';
import { extractFunctions, makeLocalStorage, makeLocation, plain } from './_harness.mjs';

const KEY = 'dtuAfterDarkUrlPausePatterns';

function loadPause(href, patterns = []) {
    return extractFunctions('darkmode.js', [
        'getCurrentUrlWithoutHash',
        'normalizeUrlPausePattern',
        'isPauseProtectedUrl',
        'isPauseProtectedPattern',
        'getUrlPausePatterns',
        'wildcardPatternToRegExp',
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

test('the storage key used by the test matches darkmode.js', async () => {
    const { readSource } = await import('./_harness.mjs');
    assert.match(readSource('darkmode.js'), new RegExp(`URL_PAUSE_PATTERNS_KEY\\s*=\\s*'${KEY}'`));
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
    const api = extractFunctions('darkmode.js', ['normalizeUrlPausePattern', 'getUrlPausePatterns'], {
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
