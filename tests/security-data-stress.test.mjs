// Security stress tests (DeepSeek handoff 2026-11-10); test_bug_* failed before that day's fixes.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { extractFunctions, loadModuleInternals, plain } from './_harness.mjs';

const HARNESS_URL = new URL('./_harness.mjs', import.meta.url).href;
const DEADLINES_CACHE_KEY = 'dtuDarkModeDeadlinesCacheV2';
const URL_PAUSE_KEY = 'dtuAfterDarkUrlPausePatterns';
const COURSE_DEADLINES_URL = 'https://student.dtu.dk/en/courses-and-teaching/course-registration/course-registration-deadlines';
const EXAM_DEADLINES_URL = 'https://student.dtu.dk/en/exam/exam-registration/-deadlines-for-exams';

function fakeElement(tagName = 'div') {
    return {
        tagName: String(tagName).toUpperCase(),
        attributes: {},
        children: [],
        firstChild: null,
        style: {},
        appendChild(child) {
            this.children.push(child);
            this.firstChild = this.children[0] || null;
            return child;
        },
        removeChild(child) {
            this.children = this.children.filter(item => item !== child);
            this.firstChild = this.children[0] || null;
            return child;
        },
        setAttribute(name, value) {
            this.attributes[name] = String(value);
        },
        getAttribute(name) {
            return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
        },
        removeAttribute(name) {
            delete this.attributes[name];
        },
        querySelector() {
            return null;
        },
        querySelectorAll() {
            return [];
        }
    };
}

function loadDeadlines(cacheText) {
    const store = new Map();
    if (cacheText !== undefined) store.set(DEADLINES_CACHE_KEY, cacheText);

    const courseAnchor = fakeElement('a');
    const examAnchor = fakeElement('a');
    courseAnchor.setAttribute('data-kind', 'course');
    examAnchor.setAttribute('data-kind', 'exam');

    const sources = fakeElement('div');
    sources.querySelectorAll = (selector) => selector === 'a' ? [courseAnchor, examAnchor] : [];

    const widget = fakeElement('div');
    widget.querySelector = (selector) => selector === '[data-dtu-deadlines-sources]' ? sources : null;

    const document = {
        body: fakeElement('body'),
        documentElement: fakeElement('html'),
        head: fakeElement('head'),
        addEventListener() {},
        createElement: fakeElement,
        getElementById() { return null; },
        querySelector() { return null; },
        querySelectorAll() { return []; }
    };
    const window = {
        addEventListener() {},
        location: { hostname: 'example.test', href: 'https://example.test/' }
    };
    const localStorage = {
        getItem(key) { return store.has(key) ? store.get(key) : null; },
        setItem(key, value) { store.set(key, String(value)); },
        removeItem(key) { store.delete(key); }
    };

    const { api } = loadModuleInternals('darkmode.deadlines.js', ['renderDeadlinesHomepageWidget'], {
        document,
        localStorage,
        window,
        DTUAfterDarkDeadlinesDeps: {
            isTopWindow: () => true,
            isDarkMode: () => false,
            markExt() {},
            sendRuntimeMessage() {}
        }
    });

    return { api, courseAnchor, examAnchor, widget };
}

function loadEvaluationBackground() {
    const fetchCalls = [];
    const chrome = {
        runtime: {},
        storage: {
            local: {
                get(key, callback) { callback({}); },
                set() {},
                remove() {}
            }
        }
    };
    const fetch = async (url, options) => {
        fetchCalls.push({ url: String(url), options });
        return { ok: false, status: 599, text: async () => '' };
    };
    const files = ['background.cache.js', 'background.shared.js', 'background.evaluation.js'];
    const { api } = loadModuleInternals(files, ['fetchCourseEvaluation'], { chrome, fetch });
    return { api, fetchCalls };
}

function measuredChild(source) {
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
        encoding: 'utf8',
        timeout: 1000,
        maxBuffer: 1024 * 1024
    });
    if (result.error) {
        assert.fail(`regex case did not finish within 1000 ms: ${result.error.code || result.error.message}`);
    }
    assert.equal(result.status, 0, result.stderr || `child exited with ${result.status}`);
    const output = result.stdout.trim().split('\n').pop();
    return JSON.parse(output).ms;
}

test('test_bug_deadline_cache_javascript_url_reaches_href', () => {
    // Invariant 3: localStorage values must be validated before they reach an href.
    // The right behavior is to discard a cached URL that is not https or the page's
    // own origin, and fall back to the fixed DTU deadline pages.
    const bad = 'javascript:alert(document.domain)';
    const cache = JSON.stringify({
        ok: true,
        fetchedAt: Date.now(),
        course: { ok: true, url: bad, groups: [] },
        exam: { ok: true, url: bad, groups: [] }
    });
    const { api, courseAnchor, examAnchor, widget } = loadDeadlines(cache);

    api.renderDeadlinesHomepageWidget(widget);

    assert.equal(courseAnchor.href, COURSE_DEADLINES_URL);
    assert.equal(examAnchor.href, EXAM_DEADLINES_URL);
});

test('test_bug_deadline_cache_wrong_types_stop_the_widget', () => {
    // Invariant 3: cached storage values must be shape-checked before rendering.
    // A string where a group array belongs should be discarded, not thrown into
    // the middle of the deadline timeline.
    const cache = JSON.stringify({
        ok: true,
        fetchedAt: Date.now(),
        course: { ok: true, url: COURSE_DEADLINES_URL, groups: 'not-an-array' },
        exam: { ok: true, url: EXAM_DEADLINES_URL, groups: [] }
    });
    const { api, widget } = loadDeadlines(cache);

    assert.doesNotThrow(() => api.renderDeadlinesHomepageWidget(widget));
});

test('test_bug_studyplan_period_regex_catastrophic_backtracking', () => {
    // Invariant 4: a page header of a few kilobytes must not make a regex run for
    // seconds. This 5 KB header is rejected in linear time by a safe parser.
    const source = `
        import { loadModuleInternals } from ${JSON.stringify(HARNESS_URL)};
        const { api } = loadModuleInternals('darkmode.studyplan-exam-schedule-core.js', ['parsePlannerPeriod']);
        const input = 'june '.repeat(1000) + '!';
        const started = performance.now();
        api.parsePlannerPeriod(input);
        process.stdout.write(JSON.stringify({ ms: performance.now() - started }));
    `;
    const ms = measuredChild(source);
    assert.ok(ms < 200, `parsePlannerPeriod took ${ms.toFixed(0)} ms on a 5 KB header`);
});

test('test_bug_url_pause_wildcard_regex_catastrophic_backtracking', () => {
    // Invariant 4: stored wildcard patterns must not turn a 5 KB page URL into a
    // multi-second regex. Matching several wildcards should stay under 200 ms.
    const source = `
        import { loadModuleInternals } from ${JSON.stringify(HARNESS_URL)};
        const key = ${JSON.stringify(URL_PAUSE_KEY)};
        const localStorage = {
            getItem(name) { return name === key ? JSON.stringify(['*a*a*a*b']) : null; }
        };
        const location = new URL('https://learn.inside.dtu.dk/');
        const { api } = loadModuleInternals('darkmode.url-pause.js', ['getMatchingUrlPausePatterns'], {
            location,
            localStorage
        });
        const url = 'https://learn.inside.dtu.dk/' + 'a'.repeat(5000);
        const started = performance.now();
        api.getMatchingUrlPausePatterns(url);
        process.stdout.write(JSON.stringify({ ms: performance.now() - started }));
    `;
    const ms = measuredChild(source);
    assert.ok(ms < 200, `getMatchingUrlPausePatterns took ${ms.toFixed(0)} ms on a 5 KB URL`);
});

test('test_bug_course_evaluation_fetch_accepts_http', async () => {
    // Invariant 1: a URL used by fetch must be https, or same-origin. The broker
    // currently checks only the hostname, so an http URL from a course page is
    // fetched instead of being rejected before the request.
    const { api, fetchCalls } = loadEvaluationBackground();

    const result = await api.fetchCourseEvaluation('http://evaluering.dtu.dk/kursus/01017/1');

    assert.equal(fetchCalls.length, 0);
    assert.equal(result.ok, false);
});

test('test_holds_deadline_cache_with_invalid_json_is_ignored', () => {
    const { api, widget } = loadDeadlines('{not valid json');
    assert.doesNotThrow(() => api.renderDeadlinesHomepageWidget(widget));
});

test('test_holds_url_pause_patterns_with_invalid_json_are_ignored', () => {
    const { api } = extractFunctions('darkmode.url-pause.js', ['getUrlPausePatterns'], {
        prelude: `var URL_PAUSE_PATTERNS_KEY = ${JSON.stringify(URL_PAUSE_KEY)};`,
        globals: {
            localStorage: { getItem: () => '{not valid json' }
        }
    });
    assert.deepEqual(plain(api.getUrlPausePatterns()), []);
});

test('test_holds_course_evaluation_fetch_rejects_foreign_host', async () => {
    const { api, fetchCalls } = loadEvaluationBackground();

    const result = await api.fetchCourseEvaluation('https://evaluering.dtu.dk.example.test/kursus/01017/1');

    assert.equal(fetchCalls.length, 0);
    assert.equal(result.ok, false);
    assert.equal(result.error, 'invalid_host');
});
