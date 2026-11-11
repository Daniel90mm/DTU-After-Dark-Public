// Hostile tests for the kurser.dtu.dk Course map (DeepSeek handoff 2026-11-10).
// test_bug_* failed before the fixes of that day; old 4-digit codes left out on purpose
// (the catalogue has none, so no lookup could confirm one).
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadModuleInternals, plain, readSource, ROOT, loadDom } from './_harness.mjs';

function loadApi() {
    const sandbox = {};
    sandbox.globalThis = sandbox;
    loadDom(sandbox);
    vm.runInNewContext(readSource('darkmode.kurser-course-map.js'), sandbox);
    return sandbox.DTUAfterDarkCourseMap;
}

const api = loadApi();
const crawler = await import(new URL('../scripts/crawl-course-prerequisites.mjs', import.meta.url));
const BUILD_SCRIPT = fileURLToPath(new URL('scripts/build-course-map-data.mjs', ROOT));

const entry = (text, isKnown) => plain(api.entryFromFields({ text, links: [] }, null, isKnown));

function buildCrawl(crawl) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'course-map-stress-'));
    try {
        const input = path.join(dir, 'crawl.json');
        const output = path.join(dir, 'out.json');
        fs.writeFileSync(input, JSON.stringify(crawl));
        execFileSync(process.execPath, [BUILD_SCRIPT, input, output], { stdio: 'pipe' });
        return JSON.parse(fs.readFileSync(output, 'utf8'));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

const crawlPage = (code, name, rows) => `<h2>${code} ${name}</h2><table>${rows
    .map(([label, value]) => `<tr><td><label>${label}</label></td><td>${value}</td></tr>`)
    .join('')}</table>`;

function liveEntryForLabel(labelText, valueText) {
    const value = {
        textContent: valueText,
        cloneNode() { return { textContent: valueText, querySelectorAll() { return []; } }; },
        querySelectorAll() { return []; }
    };
    const td = { nextElementSibling: value, parentElement: {} };
    const label = { textContent: labelText, parentElement: td };
    const document = { querySelectorAll(selector) { return selector === 'td > label' ? [label] : []; } };
    const { api: internals } = loadModuleInternals('darkmode.kurser-course-map.js', ['readLiveCenterEntry'], { document });
    return plain(internals.readLiveCenterEntry(() => true));
}

// ===== Bugs =====

test('test_bug_range_at_the_start_of_a_prerequisite_field_is_split_into_two_groups', () => {
    // Invariant 1: a range is one group of the catalogue courses in it.
    // Invariant 2 includes unicode dashes. Right behaviour: 01001-01004 is a
    // single recommended one-of group, not 01001 plus a second group.
    const known = new Set(['01001', '01002', '01003', '01004']);
    const isKnown = (code) => known.has(code);
    for (const dash of ['-', '\u2013', '\u2014']) {
        assert.deepEqual(
            entry(`01001${dash}01004`, isKnown),
            { g: [['01001', '01002', '01003', '01004']] },
            `range written with ${JSON.stringify(dash)} at the start of the field`
        );
    }
});

test('test_bug_one_of_the_following_comma_list_is_read_as_all', () => {
    // Invariant 1: "one of the following" means any one course satisfies the
    // requirement. Right behaviour: one group of all three, not three groups
    // that together demand every course.
    assert.deepEqual(
        entry('One of the following courses: 01001, 01002, 01003'),
        { g: [['01001', '01002', '01003']] }
    );
});

test('test_bug_at_least_n_of_a_prose_list_is_read_as_all', () => {
    // Invariant 1: "at least N of" keeps the count on one group. Right
    // behaviour: one group of four courses with ga 3, not four required groups.
    assert.deepEqual(
        entry('A student must have completed at least 3 of the following courses: 01001, 01002, 01003, 01004'),
        { g: [['01001', '01002', '01003', '01004']], ga: 3 }
    );
});

test('test_bug_crawler_ignores_danish_prerequisite_labels', () => {
    // Invariant 4: Danish and English pages give the same result. Right
    // behaviour: the Danish page yields the same academic and mandatory fields
    // as the English page instead of null.
    const english = crawler.readCourse('34041', crawlPage('34041', 'Waveguide optics', [
        ['Academic prerequisites', '<a href="/course/10036">10036</a>'],
        ['Mandatory prerequisites', '10102']
    ]));
    const danish = crawler.readCourse('34041', crawlPage('34041', 'Waveguide optics', [
        ['Faglige forudsætninger', '<a href="/course/10036">10036</a>'],
        ['Obligatoriske forudsætninger', '10102']
    ]));
    assert.deepEqual(plain(danish.academic), plain(english.academic));
    assert.deepEqual(plain(danish.mandatory), plain(english.mandatory));
});

test('test_bug_live_reader_ignores_older_catalogue_prerequisite_labels', () => {
    // Invariant 4: an older course keeps the prerequisites from the catalogue
    // year that last listed it. Right behaviour: the live page reader knows the
    // older label ("Recommended Academic prerequisites"), just as the crawler
    // does, instead of returning an empty live entry that replaces the shipped
    // prerequisites with nothing on an older-year course page.
    const current = liveEntryForLabel('Academic prerequisites', '10036 / 10102');
    const older = liveEntryForLabel('Recommended Academic prerequisites', '10036 / 10102');
    assert.deepEqual(older, current);
    assert.deepEqual(older, { g: [['10036', '10102']] });
});

test('test_bug_build_accepts_crawl_entries_with_missing_fields', () => {
    // Invariant 6: the build script refuses a crawl with missing fields rather
    // than writing partial data. Right behaviour: throw, because a real crawl
    // always writes academic/mandatory (null when empty) and a name.
    const finishedAt = '2026-11-07T12:00:00Z';
    for (const bad of [
        { 90001: { name: 'No prerequisite fields' } },
        { 90001: { academic: null, mandatory: null } }
    ]) {
        assert.throws(
            () => buildCrawl({ finishedAt, courses: bad }),
            `build accepted an incomplete crawl entry: ${JSON.stringify(bad)}`
        );
    }
});

test('test_bug_build_keeps_a_lowercase_crawl_key_the_parser_cannot_look_up', () => {
    // Invariant 6: the data file round-trips into what the parser expects. The
    // parser emits uppercase codes, so a lowercase crawl key must be normalised
    // to uppercase or refused; writing "0100x" silently hides the course.
    let data;
    try {
        data = buildCrawl({
            finishedAt: '2026-11-07T12:00:00Z',
            courses: { '0100x': { name: 'Lowercase', academic: null, mandatory: null } }
        });
    } catch (err) {
        return;
    }
    assert.ok(data.courses['0100X'], 'the parser can only look up uppercase course codes');
    assert.equal(data.courses['0100x'], undefined, 'no lowercase duplicate key');
});

test('test_bug_overlapping_required_and_recommended_groups_repeat_a_course', () => {
    // Existing invariant: a course both required and recommended is drawn once,
    // as required. Right behaviour: Q appears only in the required block, while
    // R stays recommended, instead of Q appearing again in [Q, R].
    const courses = { P: { n: 'p', g: [['Q', 'R']], r: [['Q']] }, Q: { n: 'q' }, R: { n: 'r' } };
    const blocks = plain(api.buildCourseMap(courses, {}, 'P', { back: 1, forward: 0 }).back[0].blocks);
    const qBlocks = blocks.filter((block) => block.codes.includes('Q'));
    assert.equal(qBlocks.length, 1, `Q was drawn in ${qBlocks.length} blocks`);
    assert.equal(qBlocks[0].required, true);
    assert.deepEqual(blocks.filter((block) => !block.required).map((block) => block.codes), [['R']]);
});

// ===== Things that held up =====

test('test_holds_cycles_self_references_and_deep_chains_terminate', () => {
    const cycle = {};
    for (let i = 0; i < 10; i++) cycle[`C${i}`] = { n: 'c', g: [[`C${(i + 1) % 10}`]] };
    const started = Date.now();
    const map = plain(api.buildCourseMap(cycle, api.buildFollowerIndex(cycle), 'C0', { back: 20, forward: 20 }));
    assert.ok(Date.now() - started < 1000);
    assert.equal(map.back.length, 9);
    assert.equal(map.forward.length, 9);
    const self = { S: { n: 's', g: [['S'], ['T']] }, T: { n: 't' } };
    assert.deepEqual(
        plain(api.buildCourseMap(self, api.buildFollowerIndex(self), 'S', { back: 5, forward: 5 }).back[0].blocks),
        [{ owner: 'S', codes: ['T'], required: false }]
    );
});

test('test_holds_fifty_prerequisites_are_capped_not_looped', () => {
    const courses = { H: { n: 'h', g: [Array.from({ length: 50 }, (_, i) => `P${String(i).padStart(2, '0')}`)] } };
    for (let i = 0; i < 50; i++) courses[`P${String(i).padStart(2, '0')}`] = { n: 'p' };
    const started = Date.now();
    const map = plain(api.buildCourseMap(courses, api.buildFollowerIndex(courses), 'H', { back: 4, forward: 3 }));
    assert.ok(Date.now() - started < 1000);
    assert.equal(map.back[0].blocks[0].codes.length, 10);
    assert.equal(map.back[0].more, 40);
});

test('test_holds_years_ects_and_phone_numbers_are_not_course_codes', () => {
    const r = plain(api.parseCoursePrerequisites(
        'The course runs in 2024, is 5 ECTS, phone 4525 1234, room 306 R0.15. None. Ingen.', []
    ));
    assert.deepEqual(r, { groups: [], mentioned: [], atLeast: null });
    assert.deepEqual(plain(api.parseCoursePrerequisites('', [])), { groups: [], mentioned: [], atLeast: null });
    assert.deepEqual(plain(api.parseCoursePrerequisites('4250X', [])).groups, [['4250X']]);
});

test('test_holds_nested_and_or_and_oversized_expressions_do_not_throw', () => {
    assert.deepEqual(
        plain(api.parseCoursePrerequisites('01001/(01002.01003)', []).groups),
        [['01001', '01002'], ['01001', '01003']]
    );
    const huge = '(01001.01002)/(01003.01004)/(01005.01006)/(01007.01008)';
    assert.deepEqual(plain(api.parseCoursePrerequisites(huge, [])).groups, []);
});

test('test_holds_catalogue_names_render_as_text_not_markup', () => {
    const makeElement = (tag) => ({
        tagName: String(tag).toUpperCase(),
        className: '',
        textContent: '',
        title: '',
        type: '',
        children: [],
        attrs: {},
        setAttribute(key, value) { this.attrs[key] = String(value); },
        getAttribute(key) { return this.attrs[key]; },
        appendChild(child) { this.children.push(child); return child; }
    });
    const document = {
        createElement: makeElement,
        createElementNS: (_ns, tag) => makeElement(tag)
    };
    const { api: internals } = loadModuleInternals('darkmode.kurser-course-map.js', ['makeNode', 'catalogueStatus'], { document });
    const markup = '<img src=x onerror="alert(1)">';
    const node = internals.makeNode({ courses: { X: { n: markup } } }, 'X', false);
    const nameSpan = node.children[1];
    assert.equal(nameSpan.textContent, markup);
    assert.equal(nameSpan.children.length, 0);
    assert.equal(internals.catalogueStatus({ courses: { O: { n: 'o', y: '2023/2024' } }, olderFrom: '2002/2003' }, 'O'), 'last listed 2023/2024');
    assert.equal(internals.catalogueStatus({ courses: {}, olderFrom: '2002/2003' }, 'MISSING'), 'not in any catalogue since 2002/2003');
});
