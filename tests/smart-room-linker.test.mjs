import assert from 'node:assert/strict';
import test from 'node:test';
import { loadModuleInternals, makeLocation, plain } from './_harness.mjs';

const { api } = loadModuleInternals('darkmode.smart-room-linker.js', [
    'parseBuildingRoomFromTextOrQuery',
    'getSmartRoomMatches',
    'buildMazemapSharePoiUrl',
    'buildMazemapSearchUrl',
    'isSmartRoomLinkerAllowedOnHost'
], { location: makeLocation('https://learn.inside.dtu.dk/d2l/home') });

function rooms(text) {
    return plain(api.getSmartRoomMatches(text)).map((m) => `${m.building}/${m.room}`);
}

test('parses the common DTU room notations', () => {
    const cases = [
        ['306-127', { building: '306', room: '127' }],
        ['B306-127', { building: '306', room: '127' }],
        ['Bygning 116, lokale 81', { building: '116', room: '81' }],
        ['Building 308 Auditorium 12', { building: '308', room: '12' }],
        ['B. 101A / aud. 44', { building: '101A', room: '44' }],
        ['341.021', { building: '341', room: '021' }],
        ['Building 303A', { building: '303A', room: '' }]
    ];
    for (const [input, expected] of cases) {
        assert.deepEqual(plain(api.parseBuildingRoomFromTextOrQuery(input)), expected, input);
    }
});

test('uppercases building and room letters', () => {
    assert.deepEqual(plain(api.parseBuildingRoomFromTextOrQuery('b358-060a')), { building: '358', room: '060A' });
});

test('does not mistake file sizes or decimals for rooms', () => {
    assert.equal(api.parseBuildingRoomFromTextOrQuery('slides 101.5 MB'), null);
    assert.equal(api.parseBuildingRoomFromTextOrQuery('archive 250-500 KB'), null);
    assert.equal(api.parseBuildingRoomFromTextOrQuery('grade 123.45'), null);
    assert.equal(api.parseBuildingRoomFromTextOrQuery(''), null);
    assert.equal(api.parseBuildingRoomFromTextOrQuery(null), null);
    assert.equal(api.parseBuildingRoomFromTextOrQuery('no rooms here'), null);
});

test('finds every room in a sentence, in order, without overlaps', () => {
    assert.deepEqual(rooms('Lecture in 306-127, exercises in Building 341 room 21'), ['306/127', '341/21']);
});

test('expands a comma-separated room list under one building', () => {
    assert.deepEqual(rooms('Groups meet in B306/031, 033, 035'), ['306/031', '306/033', '306/035']);
});

test('links the room token alone for the slash notation', () => {
    const [match] = plain(api.getSmartRoomMatches('Exam: B. 101/44'));
    assert.equal(match.text, '44');
    assert.equal('Exam: B. 101/44'.slice(match.start, match.end), '44');
});

test('ignores text with no room-shaped content', () => {
    assert.deepEqual(rooms('Deadline 12.10.2026 at 23:59'), []);
    assert.deepEqual(rooms('File is 101.5 MB'), []);
    assert.deepEqual(rooms('Download 250-500 KB'), []);
    assert.deepEqual(rooms('Course 02450 starts soon'), []);
    assert.deepEqual(rooms(''), []);
});

test('MazeMap URLs encode their input and pin the Lyngby campus', () => {
    assert.equal(api.buildMazemapSharePoiUrl(1234), 'https://use.mazemap.com/#v=1&campusid=89&sharepoitype=poi&sharepoi=1234');
    assert.equal(api.buildMazemapSearchUrl(' 306-127 & more '), 'https://use.mazemap.com/#v=1&campusid=89&search=306-127%20%26%20more');
});

test('the linker is disabled inside the Brightspace CDN frame', () => {
    assert.equal(api.isSmartRoomLinkerAllowedOnHost(), true);
    const cdn = loadModuleInternals('darkmode.smart-room-linker.js', ['isSmartRoomLinkerAllowedOnHost'], {
        location: makeLocation('https://s.brightspace.com/lib/x.html')
    });
    assert.equal(cdn.api.isSmartRoomLinkerAllowedOnHost(), false);
});

test('link text is the room itself: no trailing space, next word not swallowed', () => {
    const m = plain(api.getSmartRoomMatches('We will be using auditorium B116-A081 and B116-A83 for the lecture.'));
    assert.deepEqual(m.map((x) => x.text), ['B116-A081', 'B116-A83']);
    const text = 'Meet in B116-A081 and then 306-031.';
    for (const x of plain(api.getSmartRoomMatches(text))) assert.equal(text.slice(x.start, x.end), x.text);
    assert.deepEqual(rooms('B116-A081 a room'), ['116/A081']);
});

function linkerIn(href) {
    const deps = {
        isFeatureFlagEnabled: () => true,
        isTopWindow: () => true,
        isDTULearnLegacyHeavyCourseToolPage: () => /\/d2l\/lms\/(dropbox|classlist|group|news)\//.test(new URL(href).pathname)
    };
    return loadModuleInternals('darkmode.smart-room-linker.js', ['shouldRunSmartRoomLinkerInThisWindow'], {
        location: makeLocation(href), DTUAfterDarkSmartRoomLinkerDeps: deps
    }).api.shouldRunSmartRoomLinkerInThisWindow();
}

test('runs on announcements, but not on class lists, groups or assignment folders', () => {
    assert.equal(linkerIn('https://learn.inside.dtu.dk/d2l/lms/news/main.d2l?ou=296283'), true);
    assert.equal(linkerIn('https://learn.inside.dtu.dk/d2l/lms/classlist/classlist.d2l?ou=1'), false);
    assert.equal(linkerIn('https://learn.inside.dtu.dk/d2l/lms/dropbox/user/folders_list.d2l?ou=1'), false);
    assert.equal(linkerIn('https://learn.inside.dtu.dk/d2l/home/296283'), true);
});

test('text inside another control is left alone', () => {
    const { api: a } = loadModuleInternals('darkmode.smart-room-linker.js', ['isSmartRoomLinkerSkippableElement'], {
        location: makeLocation('https://learn.inside.dtu.dk/d2l/home')
    });
    const el = (tag, closestHit) => ({ nodeType: 1, tagName: tag, isContentEditable: false, closest: (sel) => (closestHit && sel.includes(closestHit) ? {} : null) });
    assert.equal(a.isSmartRoomLinkerSkippableElement(el('P', null)), false);
    assert.equal(a.isSmartRoomLinkerSkippableElement(el('SPAN', '[role="button"]')), true);
    assert.equal(a.isSmartRoomLinkerSkippableElement(el('SPAN', 'label')), true);
    assert.equal(a.isSmartRoomLinkerSkippableElement(el('SPAN', '[onclick]')), true);
    assert.equal(a.isSmartRoomLinkerSkippableElement({ ...el('P', null), isContentEditable: true }), true);
});

test('ISBN references stay intact for Textbook Links and are never room links', () => {
    assert.deepEqual(rooms('ISBN 978-0-262-03561-3'), []);
    assert.deepEqual(rooms('978-0-262-03561-3'), []);
    assert.deepEqual(rooms('ISBN-10: 0-8044-2957-X'), []);
    assert.deepEqual(rooms('ISBN 978-0-262-03561-3. Lecture in 306-127.'), ['306/127']);
});
