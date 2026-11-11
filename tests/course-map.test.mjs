import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readSource, loadDom } from './_harness.mjs';

function loadApi() {
    const sandbox = {};
    sandbox.globalThis = sandbox;
    loadDom(sandbox);
    vm.runInNewContext(readSource('darkmode.kurser-course-map.js'), sandbox);
    return sandbox.DTUAfterDarkCourseMap;
}

const api = loadApi();
const plain = (v) => JSON.parse(JSON.stringify(v));

test('a slash means any one course, a dot means both groups are needed', () => {
    const r = api.parseCoursePrerequisites('( 02002 / 02003 / 02100 ).( 01017 / 01019 ) , An introductory course in programming', []);
    assert.deepEqual(plain(r.groups), [['02002', '02003', '02100'], ['01017', '01019']]);
    assert.deepEqual(plain(r.mentioned), []);
});

test('the expression stops at the explanatory text, which may repeat a listed course', () => {
    const r = api.parseCoursePrerequisites('02105 / 02326 , The course builds on 02105 Algorithms and Data Structures I.', ['02105', '02326']);
    assert.deepEqual(plain(r.groups), [['02105', '02326']]);
    assert.deepEqual(plain(r.mentioned), []);
});

test('courses only named in the text are kept apart, filtered by the catalogue', () => {
    const known = new Set(['46W11']);
    const r = api.parseCoursePrerequisites('Wind turbine technology: We recommend course 46W11 prior. Budget 10000 DKK.', [], (c) => known.has(c));
    assert.deepEqual(plain(r.groups), []);
    assert.deepEqual(plain(r.mentioned), ['46W11']);
});

test('nested groups are rewritten as needed groups', () => {
    assert.deepEqual(plain(api.parseCoursePrerequisites('(01005/01006).02402', []).groups), [['01005', '01006'], ['02402']]);
    assert.deepEqual(plain(api.parseCoursePrerequisites('01001/(01002.01003)', []).groups), [['01001', '01002'], ['01001', '01003']]);
});

test('an unbalanced expression yields no groups, and its numbers count as mentioned', () => {
    const r = api.parseCoursePrerequisites('(02101/02102 , something', ['02101', '02102']);
    assert.deepEqual(plain(r.groups), []);
    assert.deepEqual(plain(r.mentioned), ['02101', '02102']);
});

const courses = {
    A: { n: 'Intro' },
    B: { n: 'Maths' },
    C: { n: 'Middle', g: [['A', 'B']] },
    D: { n: 'Target', g: [['C']], r: [['B']] },
    E: { n: 'After', g: [['D']] },
    F: { n: 'Later', g: [['E']] }
};

test('the follower index lists courses that list a course as a prerequisite', () => {
    const f = api.buildFollowerIndex(courses);
    assert.deepEqual(plain(f.D), ['E']);
    assert.deepEqual(plain(f.A), ['C']);
});

test('the map walks back and forward to the requested depth without repeating courses', () => {
    const map = plain(api.buildCourseMap(courses, api.buildFollowerIndex(courses), 'D', { back: 3, forward: 2 }));
    assert.equal(map.center, 'D');
    assert.deepEqual(map.back[0].blocks, [
        { owner: 'D', codes: ['B'], required: true },
        { owner: 'D', codes: ['C'], required: false }
    ]);
    assert.deepEqual(map.back[1].blocks, [{ owner: 'C', codes: ['A', 'B'], required: false }]);
    assert.equal(map.back.length, 2);
    assert.deepEqual(map.forward[0].nodes, [{ code: 'E', parents: ['D'] }]);
    assert.deepEqual(map.forward[1].nodes, [{ code: 'F', parents: ['E'] }]);
});

test('a live reading of the open page replaces the saved prerequisites of the centre only', () => {
    const map = plain(api.buildCourseMap(courses, api.buildFollowerIndex(courses), 'D', { back: 1, forward: 1 }, { g: [['A']] }));
    assert.deepEqual(map.back[0].blocks, [{ owner: 'D', codes: ['A'], required: false }]);
});

test('a crowded forward column is capped with a count of the rest', () => {
    const many = { X: { n: 'Hub' } };
    for (let i = 0; i < 14; i++) many['Y' + String(i).padStart(2, '0')] = { n: 'y', g: [['X']] };
    const map = plain(api.buildCourseMap(many, api.buildFollowerIndex(many), 'X', { back: 1, forward: 1 }));
    assert.equal(map.forward[0].nodes.length, 10);
    assert.equal(map.forward[0].more, 4);
});

test('prerequisite cycles end instead of looping', () => {
    const loop = { P: { n: 'p', g: [['Q']] }, Q: { n: 'q', g: [['P']] } };
    const map = plain(api.buildCourseMap(loop, api.buildFollowerIndex(loop), 'P', { back: 4, forward: 3 }));
    assert.equal(map.back.length, 1);
    assert.equal(map.forward.length, 1);
});

test('every course a field names is a prerequisite; prose-only ones are recommended, never required', () => {
    const entry = plain(api.entryFromFields(
        { text: '12102 Environmental Processes, 12104 Environmental Modelling 12237 Chemicals in the Environment and 12320 Hydrology', links: [] },
        { text: '02105 , builds on 01017', links: [] }));
    assert.deepEqual(entry, { g: [['12102'], ['01017'], ['12104'], ['12237'], ['12320']], r: [['02105']] });
    assert.equal(entry.m, undefined);
    const map = plain(api.buildCourseMap({ M: { n: 'm', g: [['A'], ['B']] } }, {}, 'M', { back: 1, forward: 0 }));
    assert.deepEqual(map.back[0].blocks.map((b) => b.mentioned), [undefined, undefined]);
});

test('a course never points to itself further back', () => {
    const pair = { X: { n: 'x', g: [['X'], ['Y']] }, Y: { n: 'y', g: [['X'], ['Y']] } };
    const map = plain(api.buildCourseMap(pair, api.buildFollowerIndex(pair), 'X', { back: 3, forward: 1 }));
    assert.deepEqual(map.back.map((col) => col.blocks), [[{ owner: 'X', codes: ['Y'], required: false }]]);
    const deeper = { S: { n: 's', g: [['T']] }, T: { n: 't', g: [['T', 'U']] }, U: { n: 'u' } };
    const map2 = plain(api.buildCourseMap(deeper, api.buildFollowerIndex(deeper), 'S', { back: 3, forward: 1 }));
    assert.deepEqual(map2.back[1].blocks, [{ owner: 'T', codes: ['U'], required: false }]);
});

test('a course both required and recommended is drawn once, as required', () => {
    const dup = { P: { n: 'p', g: [['Q']], r: [['Q']] }, Q: { n: 'q' } };
    assert.deepEqual(plain(api.buildCourseMap(dup, {}, 'P', { back: 1, forward: 0 }).back[0].blocks), [{ owner: 'P', codes: ['Q'], required: true }]);
    const mixed = { P: { n: 'p', g: [['A', 'B', 'C']], r: [['C', 'D']] } };
    assert.equal(api.buildCourseMap(mixed, {}, 'P', { back: 1, forward: 0 }).back[0].blocks.length, 2, 'different groups both stay');
});

test('"at least 3 courses from the list" is kept, not read as one of', () => {
    const text = '10750 / 23564 / 26620 / 28737 , A student must have completed at least 3 courses from the list of prerequisites.';
    assert.equal(api.parseCoursePrerequisites(text, []).atLeast, 3);
    assert.equal(api.parseCoursePrerequisites('10303 / 10317 , or equivalent courses (at least one).', []).atLeast, null);
    const list = { L: { n: 'l', r: [['A', 'B', 'C', 'D']], ra: 3 } };
    assert.deepEqual(plain(api.buildCourseMap(list, {}, 'L', { back: 1, forward: 0 }).back[0].blocks), [{ owner: 'L', codes: ['A', 'B', 'C', 'D'], required: true, atLeast: 3 }]);
});

test('an expression too large to rewrite gives no group, its courses count as named outside it', () => {
    const r = api.parseCoursePrerequisites('(01001.01002)/(01003.01004)/(01005.01006)/(01007.01008)', []);
    assert.deepEqual(plain(r.groups), []);
    assert.deepEqual(plain(r.mentioned), ['01001', '01002', '01003', '01004', '01005', '01006', '01007', '01008']);
});

test('an expression too large to rewrite inside a larger one gives no group and does not throw', () => {
    const r = api.parseCoursePrerequisites('((01000.01010)/(01001.01011)/(01002.01012)/(01003.01013)).01099', []);
    assert.deepEqual(plain(r.groups), []);
    assert.equal(r.mentioned.length, 9);
});

test('a mandatory "at least 3 from the list" makes the academic list a required at-least group', () => {
    const academic = { text: '38101 / 38102 / 38103 / 38108 , Prerequisites from DTU X-Tech', links: [] };
    const mandatory = { text: 'A student must have completed at least 3 courses from the list of prerequisites.', links: [] };
    assert.deepEqual(plain(api.entryFromFields(academic, mandatory)), { r: [['38101', '38102', '38103', '38108']], ra: 3 });
    assert.deepEqual(plain(api.entryFromFields(academic, null)), { g: [['38101', '38102', '38103', '38108']] });
    assert.deepEqual(plain(api.entryFromFields({ text: '02105 , builds on 01017', links: [] }, { text: '02105', links: [] })), { g: [['02105'], ['01017']], r: [['02105']] });
});

test('courses not in the catalogue can be hidden, and the map counts them', () => {
    const cat = { Z: { n: 'z', r: [['GONE']], g: [['A', 'OLD'], ['OLD2']] }, A: { n: 'a', g: [['OLD']] } };
    const shown = plain(api.buildCourseMap(cat, {}, 'Z', { back: 2, forward: 0 }));
    assert.deepEqual(shown.back[0].blocks.map((b) => b.codes), [['GONE'], ['A', 'OLD'], ['OLD2']]);
    assert.equal(shown.hidden, 0);
    const hidden = plain(api.buildCourseMap(cat, {}, 'Z', { back: 2, forward: 0 }, null, { hideMissing: true }));
    assert.deepEqual(hidden.back[0].blocks, [{ owner: 'Z', codes: ['A'], required: false }]);
    assert.equal(hidden.back.length, 1, 'A only lists a missing course, so no second column');
    assert.equal(hidden.hidden, 3, 'GONE, OLD and OLD2, each counted once');
});

test('commas and the words and, or, og, eller join course numbers like dots and slashes', () => {
    const groups = (text) => plain(api.parseCoursePrerequisites(text, []));
    assert.deepEqual(groups('12102, 12227 and a course on general chemistry'), { groups: [['12102'], ['12227']], mentioned: [], atLeast: null });
    assert.deepEqual(groups('02101 og 02102').groups, [['02101'], ['02102']]);
    assert.deepEqual(groups('02101, 02102 or 02103').groups, [['02101', '02102', '02103']]);
    assert.deepEqual(groups('02101 eller 02102, or equivalent').groups, [['02101', '02102']]);
    assert.deepEqual(groups('01001, 01002').groups, [['01001'], ['01002']]);
    assert.deepEqual(groups('(02002/02003).(01017/01019) , An introductory course').groups, [['02002', '02003'], ['01017', '01019']]);
    assert.deepEqual(groups('02105 and similar courses, 02106').groups, [['02105']]);
});

test('courses not in the catalogue are hidden until the student shows them', () => {
    const stored = {};
    const sandbox = { localStorage: { getItem: (k) => (k in stored ? stored[k] : null), setItem: (k, v) => { stored[k] = v; } } };
    sandbox.globalThis = sandbox;
    loadDom(sandbox);
    vm.runInNewContext(readSource('darkmode.kurser-course-map.js'), sandbox);
    const map = sandbox.DTUAfterDarkCourseMap;
    assert.equal(map.readHideMissing(), true);
    map.saveHideMissing(false);
    assert.equal(map.readHideMissing(), false);
    map.saveHideMissing(true);
    assert.equal(map.readHideMissing(), true);
});

test('the map has content when a course lists or is listed by another, catalogue or not', () => {
    const cat = { S: { n: 's', g: [['GONE']] }, T: { n: 't' }, U: { n: 'u', g: [['T']] }, V: { n: 'v' } };
    const f = api.buildFollowerIndex(cat);
    assert.equal(api.courseMapHasContent(cat, f, 'S'), true, 'a prerequisite not in the catalogue still counts');
    assert.equal(api.courseMapHasContent(cat, f, 'T'), true, 'courses that build on it count');
    assert.equal(api.courseMapHasContent(cat, f, 'V'), false);
    assert.equal(api.courseMapHasContent(cat, f, 'V', { g: [['T']] }), true, 'the live reading of the page wins');
    assert.equal(api.courseMapHasContent(cat, f, 'NEW'), false, 'a course missing from the data');
});

const crawler = await import('../scripts/crawl-course-prerequisites.mjs');
const page = (code, name, rows) => `<h2>${code} ${name}</h2><table>${rows.map(([label, value]) => `<tr><td><label>${label}</label></td><td>${value}</td></tr>`).join('')}</table>`;

test('the crawler reads every catalogue year\'s name for the prerequisite field', () => {
    for (const label of ['Academic prerequisites', 'Recommended Academic prerequisites', 'Recommended prerequisites']) {
        const c = crawler.readCourse('34041', page('34041', 'Waveguide optics', [['Danish title', 'Bølgeleder'], [label, '<a href="/course/10036">10036</a>'], ['Mandatory prerequisites', '10102']]));
        assert.equal(c.name, 'Waveguide optics');
        assert.deepEqual(plain(c.academic), { text: '10036', links: ['10036'] }, label);
        assert.equal(c.mandatory.text, '10102');
    }
    assert.equal(crawler.readCourse('10303', '<p>error</p>'), null);
    assert.equal(crawler.readCourse('10370', page('103701', 'Another course', [['Danish title', 'Andet']])), null);
});

test('older catalogue years run back from the year before the current one to 2016-2017', () => {
    assert.equal(crawler.catalogueStartYear('2026-11-07T10:00:00Z'), 2026);
    assert.equal(crawler.catalogueStartYear('2027-01-20T10:00:00Z'), 2026);
    assert.deepEqual(crawler.olderVolumes(2019), ['2018-2019', '2017-2018', '2016-2017']);
});

test('codes a course lists, in links or text, that no saved course covers', () => {
    const courses = { A: { academic: { text: '01001 / 0100X, see 02105', links: ['01001'] }, mandatory: { text: '34041', links: [] } }, '01001': {} };
    assert.deepEqual(crawler.unknownReferencedCodes(courses, ['0100X']), ['02105', '34041']);
});

test('a course\'s year list gives the years that code was listed, newest first', () => {
    const list = ['2002-2003', '2004-2005', '2003-2004']
        .map((y) => `<a href="/course/${y}/10370" style="font-weight: bold;">${y.replace('-', '/')}</a>`)
        .join('') + '<a href="/course/2005-2006/10371">other code</a><a href="/search">Course search</a>';
    assert.deepEqual(crawler.listedVolumes(list, '10370'), ['2004-2005', '2003-2004', '2002-2003']);
    assert.deepEqual(crawler.listedVolumes('<p>no years</p>', '10370'), []);
});

test('the data file keeps older courses with the last year they were listed', async () => {
    const { execFileSync } = await import('node:child_process');
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-'));
    const crawl = {
        finishedAt: '2026-11-07T12:00:00Z',
        courses: { 90001: { name: 'New', academic: { text: '90002', links: ['90002'] }, mandatory: null } },
        older: { 90002: { name: 'Old', volume: '2023-2024', academic: { text: '90001', links: ['90001'] }, mandatory: null } },
        olderMissing: ['GONE1'],
        olderFrom: '2016-2017'
    };
    fs.writeFileSync(path.join(dir, 'crawl.json'), JSON.stringify(crawl));
    execFileSync(process.execPath, ['scripts/build-course-map-data.mjs', path.join(dir, 'crawl.json'), path.join(dir, 'out.json')]);
    const data = JSON.parse(fs.readFileSync(path.join(dir, 'out.json'), 'utf8'));
    fs.rmSync(dir, { recursive: true });
    assert.deepEqual(data.courses['90001'], { n: 'New', g: [['90002']] });
    assert.deepEqual(data.courses['90002'], { n: 'Old', y: '2023/2024', g: [['90001']] });
    assert.equal(data.olderFrom, '2016/2017');
});

test('older courses are not later courses, and hiding treats them as not in the catalogue', () => {
    const cat = { NEW01: { n: 'new', g: [['OLD01']] }, OLD01: { n: 'old', y: '2023/2024', g: [['NEW01']] } };
    const f = api.buildFollowerIndex(cat);
    assert.equal(f.NEW01, undefined, 'OLD01 is not drawn as building on NEW01');
    assert.deepEqual(plain(f.OLD01), ['NEW01']);
    assert.equal(api.buildCourseMap(cat, f, 'NEW01', { back: 1, forward: 0 }, null, { hideMissing: true }).hidden, 1);
});

test('an expanded column shows all its courses, the others keep the cap', () => {
    const many = { X: { n: 'Hub', g: [Array.from({ length: 14 }, (_, i) => 'P' + String(i).padStart(2, '0'))] } };
    for (let i = 0; i < 14; i++) many['Y' + String(i).padStart(2, '0')] = { n: 'y', g: [['X']] };
    const f = api.buildFollowerIndex(many);
    const capped = api.buildCourseMap(many, f, 'X', { back: 1, forward: 1 });
    assert.equal(capped.back[0].more, 4);
    assert.equal(capped.forward[0].more, 4);
    const open = api.buildCourseMap(many, f, 'X', { back: 1, forward: 1 }, null, { expand: { forward: [0] } });
    assert.equal(open.forward[0].nodes.length, 14);
    assert.equal(open.forward[0].more, 0);
    assert.equal(open.back[0].more, 4, 'the back column stays capped');
    const back = api.buildCourseMap(many, f, 'X', { back: 1, forward: 1 }, null, { expand: { back: [0] } });
    assert.equal(back.back[0].blocks[0].codes.length, 14);
});

test('course numbers in prose joined by or are one recommended group', () => {
    const entry = (text) => plain(api.entryFromFields({ text, links: [] }, null));
    assert.deepEqual(entry('Courses 26400 or 26471, or corresponding knowledge'), { g: [['26400', '26471']] });
    assert.deepEqual(entry('Knowledge from 02105 or 02106'), { g: [['02105', '02106']] });
    assert.deepEqual(entry('Knowledge of 01005, 01006 or 01020 and 02402'), { g: [['01005', '01006', '01020'], ['02402']] });
    assert.deepEqual(entry('Knowledge of 01005, 01006 and 02402'), { g: [['01005'], ['01006'], ['02402']] });
    assert.deepEqual(plain(api.entryFromFields(null, { text: 'Course 26400 or 26471', links: [] })), { g: [['26400', '26471']] });
});

test('a course range in prose is one recommended group of the known courses in it', () => {
    const known = new Set(['01001', '01002', '01003', '01004', '02002', '02003']);
    const entry = plain(api.entryFromFields(
        { text: 'Mathematics 1a and 1b (01001-01004) Computer programming (02002-02003) or equivalent', links: [] }, null,
        (c) => known.has(c)));
    assert.deepEqual(entry, { g: [['01001', '01002', '01003', '01004'], ['02002', '02003']] });
    known.delete('01003');
    assert.deepEqual(plain(api.entryFromFields({ text: 'see 01001-01004', links: [] }, null, (c) => known.has(c))).g, [['01001', '01002', '01004']]);
});

test('bracketed alternatives and the same alternatives written twice are one group', () => {
    const entry = (text) => plain(api.entryFromFields({ text, links: [] }, null));
    assert.deepEqual(entry('34840 (or 34844 )/ 22001 / 34850 / 34860'), { g: [['22001', '34840', '34844', '34850', '34860']] });
    assert.deepEqual(entry('41046 / 41015 / 41659 41020 , material science like 41046/41015/41650, project as for example 41020 or bachelor project'),
        { g: [['41015', '41046', '41650', '41659'], ['41020']] });
});
