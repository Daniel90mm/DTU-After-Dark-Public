import assert from 'node:assert/strict';
import test from 'node:test';
import { loadModuleInternals, plain } from './_harness.mjs';

function loadBackground({ fetchImpl } = {}) {
    const listeners = [];
    const storage = new Map();
    const fetchCalls = [];
    const chrome = {
        storage: {
            local: {
                get(key, cb) { cb({ [key]: storage.get(key) }); },
                set(obj) { for (const [k, v] of Object.entries(obj)) storage.set(k, v); },
                remove() {}
            }
        },
        runtime: { onMessage: { addListener(fn) { listeners.push(fn); } } }
    };
    const fetch = async (url, opts) => {
        fetchCalls.push({ url: String(url), opts });
        if (fetchImpl) return fetchImpl(String(url), opts);
        return { ok: false, status: 404, text: async () => '' };
    };
    const { api } = loadModuleInternals('background.js', [
        'getCourseCodeVariants',
        'parseGradeDistribution',
        'isAllowedFinditUrl',
        'parseDmyDate',
        'extractExamTokens',
        'extractCourseCodes',
        'extractMonthTags',
        'parseStudentDeadlineLine',
        'parseStudentDeadlinesGroupsFromHtml',
        'parseExamCalendarHtmlWithoutDom',
        'parseEvaluationHtml',
        'stripHtmlTags',
        'roomMatchesItem',
        'pickBestRoomResult',
        'zeroPadRoom',
        'sanitizeLibraryTrendApiUrl',
        'parseIntLoose'
    ], { chrome, fetch });
    return { api, listeners, fetchCalls, storage };
}

const { api } = loadBackground();

function gradeTable(rows) {
    return '<table>' + rows.map(([label, count]) => `<tr><td>${label}</td><td>${count}</td></tr>`).join('') + '</table>';
}

test('course code variants cover both karakterer URL forms', () => {
    assert.deepEqual(plain(api.getCourseCodeVariants('02450')), ['02450', '02450-1']);
    assert.deepEqual(plain(api.getCourseCodeVariants('34721-1')), ['34721-1', '34721']);
    assert.deepEqual(plain(api.getCourseCodeVariants(' 01005 ')), ['01005', '01005-1']);
});

test('grade distribution: weighted average and pass rate on the 7-step scale', () => {
    const result = plain(api.parseGradeDistribution(gradeTable([
        ['12', 10], ['10', 20], ['7', 30], ['4', 20], ['02', 10], ['00', 5], ['-3', 5]
    ])));
    assert.equal(result.mode, 'graded');
    assert.equal(result.total, 100);
    assert.equal(result.average, (12 * 10 + 10 * 20 + 7 * 30 + 4 * 20 + 2 * 10 + 0 * 5 - 3 * 5) / 100);
    assert.equal(result.passRate, 90);
});

test('grade distribution: unicode minus and nbsp in the -3 row still count', () => {
    const result = plain(api.parseGradeDistribution(gradeTable([
        ['12', 4], ['−3', 4], ['7&nbsp;', 2]
    ])));
    assert.equal(result.counts['-3'], 4);
    assert.equal(result.counts['7'], 2);
    assert.equal(result.total, 10);
});

test('grade distribution: cohorts of three or fewer are suppressed', () => {
    assert.equal(api.parseGradeDistribution(gradeTable([['12', 2], ['7', 1]])), null);
    assert.equal(api.parseGradeDistribution(gradeTable([['Bestået', 2], ['Ikke bestået', 1]])), null);
});

test('grade distribution: pass/fail courses, Danish labels, no-shows excluded from rate', () => {
    const result = plain(api.parseGradeDistribution(gradeTable([
        ['Bestået', 30], ['Ikke bestået', 10], ['Ej mødt', 5]
    ])));
    assert.equal(result.mode, 'pass_fail');
    assert.equal(result.total, 45);
    assert.equal(result.passRate, 75);
    assert.deepEqual(result.passFailCounts, { passed: 30, failed: 10, noShow: 5 });
});

test('grade distribution: "not passed" is never read as a pass', () => {
    const result = plain(api.parseGradeDistribution(gradeTable([
        ['Passed', 8], ['Not passed', 4]
    ])));
    assert.deepEqual(result.passFailCounts, { passed: 8, failed: 4, noShow: 0 });
});

test('grade distribution: "no data" pages return null', () => {
    assert.equal(api.parseGradeDistribution(''), null);
    assert.equal(api.parseGradeDistribution('<p>No data</p>'), null);
    assert.equal(api.parseGradeDistribution('<p>Fordelingen vises ikke</p>' + gradeTable([['12', 50]])), null);
});

test('FindIt fetches are locked to the https catalog page', () => {
    assert.equal(api.isAllowedFinditUrl('https://findit.dtu.dk/en/catalog?q=isbn:123'), true);
    assert.equal(api.isAllowedFinditUrl('https://findit.dtu.dk/catalog'), true);
    for (const bad of [
        'http://findit.dtu.dk/en/catalog?q=x',
        'https://findit.dtu.dk.evil.com/en/catalog',
        'https://evil.com/?https://findit.dtu.dk/en/catalog',
        'https://findit.dtu.dk/en/catalog/123/admin',
        'https://user@evil.com/en/catalog',
        'javascript:alert(1)',
        '',
        null,
        42
    ]) {
        assert.equal(api.isAllowedFinditUrl(bad), false, String(bad));
    }
});

test('day-month-year dates parse and reject impossible dates', () => {
    assert.deepEqual(plain(api.parseDmyDate('3/12 2026')), { ts: Date.UTC(2026, 11, 3), iso: '2026-12-03' });
    assert.equal(api.parseDmyDate('03.01.2027').iso, '2027-01-03');
    assert.equal(api.parseDmyDate('3-1-2027').iso, '2027-01-03');
    assert.equal(api.parseDmyDate('31/2 2026'), null);
    assert.equal(api.parseDmyDate('1/13 2026'), null);
    assert.equal(api.parseDmyDate('no date'), null);
});

test('exam tokens, course codes and month tags extract without duplicates', () => {
    assert.deepEqual(plain(api.extractExamTokens('E3A, e3-a, F5B and F2')), ['E3-A', 'F5-B', 'F2']);
    assert.deepEqual(plain(api.extractCourseCodes('02450, 01005 and 02450 again; 123456 is not one')), ['02450', '01005']);
    assert.deepEqual(plain(api.extractMonthTags('Vintereksamen december, reeksamen')), ['december', 'winter_period', 'reexam']);
});

test('student deadline lines split label from start and end dates', () => {
    assert.deepEqual(plain(api.parseStudentDeadlineLine('Course registration**: 1/11 2026 - 15/11 2026')), {
        label: 'Course registration',
        startIso: '2026-11-01',
        startTs: Date.UTC(2026, 10, 1),
        endIso: '2026-11-15',
        endTs: Date.UTC(2026, 10, 15),
        raw: 'Course registration**: 1/11 2026 - 15/11 2026'
    });
    assert.equal(api.parseStudentDeadlineLine('No dates here: soon'), null);
});

test('student deadline page groups items under their h2 heading', () => {
    const html = `
        <h2>Autumn 2026</h2><ul><li>Registration: 1/5 2026 &ndash; 15/5 2026</li><li>Nothing</li></ul>
        <h2>&nbsp;</h2>
        <h2>Spring 2027</h2><ul><li>Registration: 1/11&nbsp;2026</li></ul>
        <h2>Empty</h2><p>none</p>`;
    const groups = plain(api.parseStudentDeadlinesGroupsFromHtml(html));
    assert.deepEqual(groups.map((g) => [g.heading, g.items.map((i) => i.startIso)]), [
        ['Autumn 2026', ['2026-05-01']],
        ['Spring 2027', ['2026-11-01']]
    ]);
    assert.equal(groups[0].items[0].endIso, '2026-05-15');
});

test('exam calendar HTML parses into sorted, de-duplicated entries', () => {
    const html = `
        <h2>Winter exam 2026</h2>
        <table>
          <tr><th>Date</th><th>Exam</th></tr>
          <tr><td>14/12 2026</td><td>E1A, E1B</td></tr>
          <tr><td>11/12 2026</td><td>F2A</td></tr>
          <tr><td>11/12 2026</td><td>F2A</td></tr>
          <tr><td>not a date</td><td>E3A</td></tr>
        </table>`;
    const result = plain(api.parseExamCalendarHtmlWithoutDom(html, 'https://example'));
    assert.equal(result.ok, true);
    assert.deepEqual(result.periodTitles, ['Winter exam 2026']);
    assert.deepEqual(result.entries.map((e) => [e.dateIso, e.tokens]), [
        ['2026-12-11', ['F2-A']],
        ['2026-12-14', ['E1-A', 'E1-B']]
    ]);
});

test('exam calendar: tables without a header or exam heading are ignored', () => {
    const html = '<table><tr><td>14/12 2026</td><td>E1A</td></tr></table>';
    assert.equal(api.parseExamCalendarHtmlWithoutDom(html, 'x'), null);
});

test('course evaluation HTML yields stats, Likert averages and workload', () => {
    const option = (label, count) => `<div class="RowWrapper"><div class="FinalEvaluation_Result_OptionColumn">${label}</div><div class="Answer_Result_Background"><span>${count}</span></div></div>`;
    const question = (num, text, options) => `<div class="ResultCourseModelWrapper"><div class="QuestionPositionColumn">${num}</div><div class="FinalEvaluation_QuestionText">${text}</div>${options}<div class="CourseSchemaResultFooter"><span>10</span></div></div>`;
    const html = `<h2>Resultater : 02450 Intro to ML E25</h2>
        <div id="CourseResultsPublicContainer"><table>
          <tr><td>120</td><td>could answer</td></tr>
          <tr><td>30</td><td>answered</td></tr>
          <tr><td>2</td><td>excluded</td></tr>
        </table></div></div>
        <div id="PercentageResult"><span>25,0 %</span></div>
        ${question('1.1', 'I learned a lot', option('Helt enig', 6) + option('Enig', 4))}
        ${question('2.1', 'Workload', option('Meget mindre', 1))}
        ${question('3.1', 'Comments', option('x', 1))}
        ${'<!-- padding -->'.repeat(10)}`;
    const result = plain(api.parseEvaluationHtml(html));
    assert.equal(result.title, '02450 Intro to ML E25');
    assert.equal(result.period, 'E25');
    assert.deepEqual([result.eligible, result.respondents, result.excluded], [120, 30, 2]);
    assert.equal(result.responseRate, 25);
    assert.equal(result.questions.length, 1, 'qualitative 3.x questions are skipped');
    assert.equal(result.questions[0].number, '1.1');
    assert.deepEqual(result.questions[0].options, [{ label: 'Helt enig', count: 6 }, { label: 'Enig', count: 4 }]);
    assert.equal(result.workload.number, '2.1');
});

test('course evaluation: short or question-less pages return null', () => {
    assert.equal(api.parseEvaluationHtml('<p>tiny</p>'), null);
    assert.equal(api.parseEvaluationHtml('<h2>Resultater: X</h2>' + ' '.repeat(300)), null);
});

test('stripHtmlTags decodes entities once they are nested', () => {
    assert.equal(api.stripHtmlTags('<b>A&amp;amp;B</b>&nbsp;&ndash;<br>C &#39;x&#x27;'), "A&B – C 'x'");
});

test('MazeMap result picking matches building and zero-padded room, highest score wins', () => {
    const results = [
        { poiId: 1, dispBldNames: ['306'], poiNames: ['031'], score: 1 },
        { poiId: 2, dispBldNames: ['306'], poiNames: ['31'], score: 5 },
        { poiId: 3, dispBldNames: ['308'], poiNames: ['031'], score: 9 },
        { poiId: 'nope', dispBldNames: ['306'], poiNames: ['031'], score: 99 }
    ];
    assert.equal(api.pickBestRoomResult(results, '306', '031').poiId, 2);
    assert.equal(api.pickBestRoomResult(results, '306', '999'), null);
    assert.equal(api.roomMatchesItem({ title: '<b>AUD 1</b>' }, 'aud 1'), true);
    assert.equal(api.zeroPadRoom('31', 3), '031');
    assert.equal(api.zeroPadRoom('A1', 3), 'A1');
});

test('library trend URL must be https; loose ints ignore separators', () => {
    assert.equal(api.sanitizeLibraryTrendApiUrl('https://api.example/x'), 'https://api.example/x');
    assert.equal(api.sanitizeLibraryTrendApiUrl('http://api.example/x'), '');
    assert.equal(api.sanitizeLibraryTrendApiUrl('not a url'), '');
    assert.equal(api.parseIntLoose('1.234 people'), 1234);
    assert.equal(api.parseIntLoose('none'), null);
});

test('message router ignores senders outside the DTU allowlist', async () => {
    const bg = loadBackground();
    const [listener] = bg.listeners;
    assert.ok(listener, 'onMessage listener registered');

    const replies = [];
    for (const url of ['https://evil.example/page', 'http://learn.inside.dtu.dk/d2l/home', 'https://learn.inside.dtu.dk.evil.example/']) {
        const handled = listener({ type: 'dtu-grade-stats', courseCode: '02450' }, { url }, (r) => replies.push(r));
        assert.equal(handled, undefined, url);
    }
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(replies, []);
    assert.deepEqual(bg.fetchCalls, []);
});

test('message router rejects malformed course codes before fetching', () => {
    const bg = loadBackground();
    const [listener] = bg.listeners;
    const replies = [];
    listener({ type: 'dtu-grade-stats', courseCode: '../../etc' }, { url: 'https://kurser.dtu.dk/course/02450' }, (r) => replies.push(plain(r)));
    assert.deepEqual(replies, [{ ok: false, error: 'invalid_course' }]);
    assert.deepEqual(bg.fetchCalls, []);
});

test('message router fetches grades without cookies for allowed senders', async () => {
    const html = gradeTable([['12', 5], ['7', 5]]);
    const bg = loadBackground({
        fetchImpl: async () => ({ ok: true, status: 200, text: async () => html })
    });
    const [listener] = bg.listeners;
    const reply = await new Promise((resolve) => {
        const keepOpen = listener(
            { type: 'dtu-grade-stats', courseCode: '02450', semesters: ['Winter-2025'] },
            { url: 'https://kurser.dtu.dk/course/02450' },
            resolve
        );
        assert.equal(keepOpen, true, 'async reply keeps the channel open');
    });
    assert.equal(reply.ok, true);
    assert.equal(reply.data.total, 10);
    assert.equal(bg.fetchCalls[0].url, 'https://karakterer.dtu.dk/Histogram/1/02450/Winter-2025');
    assert.equal(bg.fetchCalls[0].opts.credentials, 'omit');
});
