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
        'auditoriumNumberFromRoom',
        'pickAuditoriumResult',
        'resolveMazemapPoi',
        'sanitizeLibraryTrendApiUrl',
        'parseIntLoose',
        'parseGradePeriodLinks',
        'pickMainGradeIteration',
        'fetchLatestIterations'
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
    assert.equal(result.total, 40, 'total counts students who sat the exam, not no-shows');
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

test('grade distribution: entity-encoded Danish labels parse without a DOMParser', () => {
    // Real karakterer pages write "Bestået" and "Ej mødt" as numeric entities.
    const result = plain(api.parseGradeDistribution(gradeTable([
        ['Best&#229;et', 346], ['Ikke best&#229;et', 8], ['Ej m&#248;dt', 21]
    ])));
    assert.equal(result.mode, 'pass_fail');
    assert.deepEqual(result.passFailCounts, { passed: 346, failed: 8, noShow: 21 });
});

test('grade distribution: summary rows like "Antal bestået" are not result rows', () => {
    const result = plain(api.parseGradeDistribution(gradeTable([
        ['Antal tilmeldte', 44], ['Antal best&#229;et', 22],
        ['12', 0], ['10', 2], ['7', 9], ['4', 7], ['02', 4], ['00', 20], ['-3', 1]
    ])));
    assert.equal(result.mode, 'graded');
    assert.equal(result.registered, 44);
    assert.equal(result.total, 43);
    assert.deepEqual(result.passFailCounts, { passed: 0, failed: 0, noShow: 0 });
});

test('grade distribution: "Ikke bestået" rows in a graded exam count as fails', () => {
    // 01001 Winter 2023: 853 graded, none below 02, plus 124 listed as not passed.
    const result = plain(api.parseGradeDistribution(gradeTable([
        ['12', 162], ['10', 231], ['7', 308], ['4', 125], ['02', 27], ['00', 0], ['-3', 0],
        ['Best&#229;et', 0], ['Ikke best&#229;et', 124]
    ])));
    assert.equal(result.mode, 'graded');
    assert.equal(result.total, 977);
    assert.equal(result.failedTotal, 124);
    assert.ok(Math.abs(result.passRate - 853 / 977 * 100) < 1e-9);
    assert.equal(result.average, (12 * 162 + 10 * 231 + 7 * 308 + 4 * 125 + 2 * 27) / 853, 'average over graded students only');
});

test('grade distribution: a pass/fail exam with a few graded students stays pass/fail', () => {
    // 02476 Winter 2024: 346 passed, 8 failed, one student graded 12.
    const result = plain(api.parseGradeDistribution(gradeTable([
        ['12', 1], ['10', 0], ['7', 0], ['4', 0], ['02', 0], ['00', 0], ['-3', 0],
        ['Best&#229;et', 346], ['Ikke best&#229;et', 8], ['Ej m&#248;dt', 21]
    ])));
    assert.equal(result.mode, 'pass_fail');
    assert.equal(result.average, null);
    assert.equal(result.total, 355);
    assert.equal(result.passedTotal, 347);
    assert.equal(result.failedTotal, 8);
});

test('grade period links: only this course, deduplicated, normalised', () => {
    const html = '<a href="http://karakterer.dtu.dk/Histogram/1/34034/Summer-2026">s26</a>'
        + '<a href="http://karakterer.dtu.dk/Histogram/1/34034/winter-2025">v25</a>'
        + '<a href="https://sites.dtu.dkhttp://karakterer.dtu.dk:80/Histogram/1/34034/Summer-2026">x</a>'
        + '<a href="http://karakterer.dtu.dk/Histogram/1/02402/Winter-2024">other course</a>';
    assert.deepEqual(plain(api.parseGradePeriodLinks(html, '34034')), ['Summer-2026', 'Winter-2025']);
});

test('main exam: a small newer sitting does not replace the big exam', () => {
    const its = [
        { semester: 'Summer-2026', data: { registered: 105, total: 97 } },
        { semester: 'Winter-2025', data: { registered: 1080, total: 1030 } },
        { semester: 'Summer-2025', data: { registered: 93, total: 83 } }
    ];
    assert.equal(api.pickMainGradeIteration(its), 1);
    assert.deepEqual(its.map((it) => it.small), [true, false, true]);
    // Courses taught in both semesters keep the newest exam.
    const both = [
        { semester: 'Summer-2026', data: { registered: 690 } },
        { semester: 'Winter-2025', data: { registered: 573 } }
    ];
    assert.equal(api.pickMainGradeIteration(both), 0);
});

function gradePage(semester, periods, rows) {
    const links = periods.map((p) => `<a href="http://karakterer.dtu.dk/Histogram/1/01001/${p}">${p}</a>`).join('');
    return `<h2>01001 ${semester}</h2>${links}` + gradeTable(rows);
}

test('grade history: discovers periods from the page links and picks the main exam', async () => {
    const all = ['Summer-2026', 'Winter-2025', 'Summer-2025', 'Winter-2024'];
    const pages = {
        'Summer-2026': [['Antal tilmeldte', 105], ['12', 10], ['7', 50], ['00', 37]],
        'Winter-2025': [['Antal tilmeldte', 1080], ['12', 500], ['7', 400], ['00', 130]],
        'Summer-2025': [['Antal tilmeldte', 3]],
        'Winter-2024': [['Antal tilmeldte', 1102], ['12', 400], ['7', 500], ['00', 133]]
    };
    const bg = loadBackground({
        fetchImpl: async (url) => {
            const sem = url.split('/').pop();
            if (!url.includes('/01001/') || !pages[sem]) return { ok: false, status: 404, text: async () => '' };
            const rows = sem === 'Summer-2025' ? [] : pages[sem];
            const body = sem === 'Summer-2025' ? '<p>Fordelingen vises ikke</p>' : '';
            return { ok: true, status: 200, text: async () => body + gradePage(sem, all.filter((p) => p !== sem), rows) };
        }
    });
    const result = plain(await bg.api.fetchLatestIterations('01001', ['Winter-2026', 'Summer-2026', 'Winter-2025', 'Summer-2025', 'Winter-2024'], 4));
    assert.equal(result.ok, true);
    assert.deepEqual(result.iterations.map((it) => it.semester), ['Summer-2026', 'Winter-2025', 'Winter-2024']);
    assert.equal(result.mainIndex, 1);
    assert.equal(result.semester, 'Winter-2025');
    assert.equal(result.data.registered, 1080);
    // One 404 for Winter-2026, then the newest page, then one parallel batch.
    assert.equal(bg.fetchCalls.length, 5);
});

test('grade history: a course with no exams yet reports no_data', async () => {
    const bg = loadBackground();
    const result = plain(await bg.api.fetchLatestIterations('99999', ['Winter-2025', 'Summer-2025'], 4));
    assert.deepEqual(result, { ok: false, error: 'no_data' });
});

test('evaluation period: three-week courses titled with a month', () => {
    const html = '<h2>Resultater : 02476 Machine Learning Operations Jan 26</h2>'
        + '<div class="ResultCourseModelWrapper"><div class="QuestionPositionColumn">1.1</div>'
        + '<div class="FinalEvaluation_QuestionText">q</div>'
        + '<div class="RowWrapper"><div class="FinalEvaluation_Result_OptionColumn">Enig</div><div class="Answer_Result_Background"><span>5</span></div></div>'
        + '</div>' + ' '.repeat(200);
    assert.equal(api.parseEvaluationHtml(html).period, 'Jan 26');
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

// Shapes copied from api.mazemap.com equery responses for building 116 (2026-09-30).
const MM_116_81 = [
    { poiId: 290659, dispPoiNames: ['AUDITORIUM <em>81</em>/020'], dispBldNames: ['116'], identifier: 'Bygning 116-73336', score: 9 },
    { poiId: 1001706764, dispPoiNames: ['AUDITORIUM 82/027'], dispBldNames: ['116'], identifier: 'Bygning 116-73339', score: 8 },
    { poiId: 1001706766, dispPoiNames: ['AUDITORIUM 83/026'], dispBldNames: ['116'], identifier: 'Bygning 116-73340', score: 7 }
];

test('MazeMap auditorium notation: A081, A83 and 081 map to "AUDITORIUM n"', () => {
    assert.equal(api.auditoriumNumberFromRoom('A081'), '81');
    assert.equal(api.auditoriumNumberFromRoom('a83'), '83');
    assert.equal(api.auditoriumNumberFromRoom('081'), '81');
    assert.equal(api.auditoriumNumberFromRoom('0.15.A'), '');
    assert.equal(api.pickAuditoriumResult(MM_116_81, '116', '81').poiId, 290659);
    assert.equal(api.pickAuditoriumResult(MM_116_81, '116', '8'), null, 'no prefix match: 8 is not 81');
    assert.equal(api.pickAuditoriumResult(MM_116_81, '306', '81'), null, 'wrong building');
});

test('MazeMap resolver tries exact room names first, then the auditorium name', async () => {
    const queries = [];
    const bg = loadBackground({
        fetchImpl: async (url) => {
            const q = decodeURIComponent(/[?&]q=([^&]+)/.exec(url)[1]);
            queries.push(q);
            const result = q === '116-81' ? MM_116_81 : [];
            return { ok: true, status: 200, json: async () => ({ result }) };
        }
    });
    const res = await bg.api.resolveMazemapPoi('116', 'A081');
    assert.equal(res.ok, true);
    assert.equal(res.poiId, 290659);
    assert.equal(res.kind, 'room');
    assert.deepEqual(queries, ['116-A081', '116.A081', '116-81']);
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

test('message router caches "no exams yet" so new courses are not refetched', async () => {
    const bg = loadBackground();
    const [listener] = bg.listeners;
    const ask = () => new Promise((resolve) => listener(
        { type: 'dtu-grade-stats', courseCode: '99999', semesters: ['Winter-2025', 'Summer-2025'] },
        { url: 'https://kurser.dtu.dk/course/99999' },
        resolve
    ));
    assert.deepEqual(plain(await ask()), { ok: false, error: 'no_data' });
    const fetchesAfterFirst = bg.fetchCalls.length;
    assert.ok(fetchesAfterFirst > 0);
    const second = plain(await ask());
    assert.equal(second.error, 'no_data');
    assert.equal(bg.fetchCalls.length, fetchesAfterFirst, 'second visit is served from the cache');
});

test('grade HTTP failures are not cached as a course with no exams',async()=>{
 for(const status of [403,429,503]){
  const bg=loadBackground({fetchImpl:async()=>({ok:false,status,text:async()=>''})});const [listener]=bg.listeners;
  const ask=()=>new Promise(resolve=>listener({type:'dtu-grade-stats',courseCode:'34032',semesters:['Winter-2025']},{url:'https://kurser.dtu.dk/course/34032'},resolve));
  assert.deepEqual(plain(await ask()),{ok:false,error:'fetch_failed'});
  const calls=bg.fetchCalls.length;await ask();assert.ok(bg.fetchCalls.length>calls,'transient failure must not become a cached no_data result');
 }
});
test('grade network exceptions propagate as fetch failure',async()=>{
 const bg=loadBackground({fetchImpl:async()=>{throw new Error('offline');}});
 await assert.rejects(bg.api.fetchLatestIterations('34032',['Winter-2025'],4),/offline/);
});
