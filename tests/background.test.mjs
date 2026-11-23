import assert from 'node:assert/strict';
import test from 'node:test';
import { loadModuleInternals, plain, readSource } from './_harness.mjs';

const BACKGROUND_FILES = JSON.parse(readSource('manifest.json')).background.scripts;

function loadBackground({ fetchImpl, setImpl } = {}) {
    const listeners = [];
    const startup = [];
    const storage = new Map();
    const fetchCalls = [];
    const chrome = {
        storage: {
            local: {
                get(key, cb) { cb(key === null ? Object.fromEntries(storage) : { [key]: storage.get(key) }); },
                set(obj) {
                    if (setImpl) return setImpl(obj, storage);
                    for (const [k, v] of Object.entries(obj)) storage.set(k, v);
                },
                remove(keys) { for (const k of [].concat(keys)) storage.delete(k); }
            }
        },
        runtime: {
            onMessage: { addListener(fn) { listeners.push(fn); } },
            onStartup: { addListener(fn) { startup.push(fn); } },
            id: 'after-dark@test'
        }
    };
    const fetch = async (url, opts) => {
        fetchCalls.push({ url: String(url), opts });
        if (fetchImpl) return fetchImpl(String(url), opts);
        return { ok: false, status: 404, text: async () => '' };
    };
    const { api } = loadModuleInternals(BACKGROUND_FILES, [
        'getCourseCodeVariants',
        'parseGradeDistribution',
        'isAllowedFinditUrl',
        'parseDmyDate',
        'parseStudentDeadlineLine',
        'parseStudentDeadlinesGroupsFromHtml',
        'parseEvaluationHtml',
        'latestEvaluationUrl',
        'fetchCourseWorkload',
        'stripHtmlTags',
        'roomMatchesItem',
        'pickBestRoomResult',
        'zeroPadRoom',
        'auditoriumNumberFromRoom',
        'pickAuditoriumResult',
        'resolveMazemapPoi',
        'sanitizeLibraryTrendApiUrl',
        'normalizeLibraryCrowdingPayload',
        'parseIntLoose',
        'parseGradePeriodLinks',
        'pickMainGradeIteration',
        'fetchLatestIterations'
    ], { chrome, fetch });
    return { api, listeners, fetchCalls, storage, startup };
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

function askFindit(bg, url) {
    return new Promise((resolve) => {
        bg.listeners[0]({ type: 'dtu-findit-availability', url }, { url: 'https://kurser.dtu.dk/course/02450' }, resolve);
    });
}

test('FindIt: "No online access" is not read as online access', async () => {
    for (const html of [
        '<section>No online access is available for this title.</section>',
        '<p>Ingen online adgang</p>',
        '<p>Not available online</p>'
    ]) {
        const bg = loadBackground({ fetchImpl: async () => ({ ok: true, status: 200, text: async () => html }) });
        const reply = await askFindit(bg, 'https://findit.dtu.dk/en/catalog?q=isbn:9780306406157');
        assert.equal(reply.ok, true, html);
        assert.equal(reply.onlineAccess, false, html);
    }
    const bg = loadBackground({ fetchImpl: async () => ({ ok: true, status: 200, text: async () => '<a>Online access</a>' }) });
    assert.equal((await askFindit(bg, 'https://findit.dtu.dk/en/catalog?q=isbn:1')).onlineAccess, true);
});

test('FindIt: the "I am not a robot" page is unknown, not "no", and is not cached', async () => {
    const verifyPage = '<title>Verification - DTU Findit</title><p>Please verify</p><p>I am not a robot</p>';
    const bg = loadBackground({
        fetchImpl: async () => ({ ok: true, status: 200, url: 'https://findit.dtu.dk/verify?locale=en', text: async () => verifyPage })
    });
    const url = 'https://findit.dtu.dk/en/catalog?q=isbn:9780262033848';
    const reply = await askFindit(bg, url);
    assert.equal(reply.ok, false);
    assert.equal(reply.error, 'verification_required');
    await askFindit(bg, url);
    assert.equal(bg.fetchCalls.length, 2, 'a verify page is asked again next time');
});

test('FindIt: different searches never share a cache entry', async () => {
    const bg = loadBackground({
        fetchImpl: async (url) => ({ ok: true, status: 200, text: async () => (url.includes('a-b') ? 'Online access' : 'nothing') })
    });
    assert.equal((await askFindit(bg, 'https://findit.dtu.dk/en/catalog?q=a-b')).onlineAccess, true);
    assert.equal((await askFindit(bg, 'https://findit.dtu.dk/en/catalog?q=a_b')).onlineAccess, false);
    assert.equal(bg.fetchCalls.length, 2);
});

test('grade stats: a semester that is not Winter-YYYY or Summer-YYYY never reaches the URL', async () => {
    const bg = loadBackground();
    await new Promise((resolve) => {
        bg.listeners[0](
            { type: 'dtu-grade-stats', courseCode: '01001', semesters: ['Summer-2025/../../evil', 'Winter-2025'] },
            { url: 'https://kurser.dtu.dk/course/01001' },
            resolve
        );
    });
    for (const call of bg.fetchCalls) {
        assert.match(new URL(call.url).pathname, /^\/Histogram\/1\/01001(-1)?\/(Winter|Summer)-\d{4}$/, call.url);
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
    const later = plain(api.parseEvaluationHtml(html.replace(question('3.1', 'Comments', option('x', 1)), question('2.2', 'Other', option('Meget mere', 9)))));
    assert.equal(later.workload.number, '2.1', 'a later 2.x question does not replace the workload question');
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
    // Hour 0 (midnight) and an empty library are real values, not missing ones.
    assert.equal(api.parseIntLoose(0), 0);
    assert.equal(api.parseIntLoose('0'), 0);
    assert.equal(api.parseIntLoose(null), null);
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

test('library trends: per-weekday hours and day counts reach the panel, all-days kept as fallback', () => {
    const row = (hour, avgNow) => ({ hour, avgNow, minNow: 0, maxNow: 99, samples: 12 });
    const out = plain(api.normalizeLibraryCrowdingPayload({
        ok: true,
        trends: {
            hourly: [row(10, 182)],
            weekdayHourly: { saturday: [row(10, 27)], monday: [] },
            weekdayDays: { saturday: 4, monday: 4 },
            totalSamples: 9999
        }
    }));
    assert.deepEqual(Object.keys(out.historical.weekday_averages).sort(), ['generic', 'saturday']);
    assert.equal(out.historical.weekday_averages.saturday[0].avg_visitors, 27);
    assert.equal(out.historical.weekday_averages.generic[0].avg_visitors, 182);
    assert.deepEqual(out.historical.weekday_days, { saturday: 4, monday: 4 });
    assert.equal(out.historical.days_collected, 8);
});

test('library trends from an older worker still give the all-days average', () => {
    const out = plain(api.normalizeLibraryCrowdingPayload({
        ok: true,
        trends: { hourly: [{ hour: 9, avgNow: 93, samples: 60 }], totalSamples: 960 }
    }));
    assert.deepEqual(Object.keys(out.historical.weekday_averages), ['generic']);
    assert.equal(out.historical.weekday_days, undefined);
    assert.equal(out.historical.days_collected, null);
});

function sendMessage(listeners, message) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve('no_response'), 500);
        const done = (value) => { clearTimeout(timer); resolve(value); };
        const sender = { url: 'https://studieplan.dtu.dk/plan' };
        for (const fn of listeners) fn(message, sender, done);
    });
}

test('exam schedule: one canonical exam table URL, no guessing list', () => {
    const source = readSource('background.exam.js');
    assert.equal(source.split('https://student.dtu.dk/en/exam/exam-dates').length - 1, 1);
    assert.equal(source.includes('EXAM_CALENDAR_URLS'), false);
    assert.equal(source.includes('dtu-exam-calendar'), false);
});

test('exam schedule: course page requests reject anything but a course number', async () => {
    const bg = loadBackground();
    for (const code of ['../x', '0211', '02110/../a', '', null]) {
        assert.deepEqual(plain(await sendMessage(bg.listeners, { type: 'dtu-course-page', code })), { ok: false, error: 'invalid_course' }, String(code));
    }
    assert.equal(bg.fetchCalls.length, 0);
});

// The opening of a kurser course page and of its Information tab, as served.
const coursePage = (code) => '<html><h2 style="font-family:verdana; font-size:18px;">\r\n' + code + ' Some course</h2>Date of examination</html>';
const courseInfoPage = (code) => '<ul class="nav nav-tabs"><li role="presentation"><a href="/course/' + code + '">' + code + '</a></li><li class="active"><a href="#">Information</a></li></ul>';

// The shape of DTU's exam table page: a table whose header names the grading deadline.
const EXAM_TABLE_PAGE = '<html><h2>Winter exams 2026</h2><table><tr><th>Date</th><th>Date of exam</th><th>Grading deadline</th></tr></table></html>';

test('exam schedule: table and course page are fetched once, then cached', async () => {
    const bg = loadBackground({ fetchImpl: async (url) => ({ ok: true, status: 200, text: async () => (url.includes('exam-dates') ? EXAM_TABLE_PAGE : coursePage('02110')) }) });
    const table = plain(await sendMessage(bg.listeners, { type: 'dtu-exam-table' }));
    assert.equal(table.ok, true);
    assert.equal(table.html, EXAM_TABLE_PAGE);
    assert.equal(typeof table.fetchedAt, 'number');
    await sendMessage(bg.listeners, { type: 'dtu-exam-table' });
    const page = plain(await sendMessage(bg.listeners, { type: 'dtu-course-page', code: '02110' }));
    assert.equal(page.ok, true);
    await sendMessage(bg.listeners, { type: 'dtu-course-page', code: '02110' });
    assert.deepEqual(bg.fetchCalls.map((c) => c.url), ['https://student.dtu.dk/en/exam/exam-dates', 'https://kurser.dtu.dk/course/02110']);
    assert.equal(bg.fetchCalls[1].opts.credentials, 'include');
});

test('exam schedule: a course page can be asked for a catalogue year', async () => {
    const bg = loadBackground({ fetchImpl: async () => ({ ok: true, status: 200, text: async () => coursePage('02110') }) });
    assert.equal(plain(await sendMessage(bg.listeners, { type: 'dtu-course-page', code: '02110', volume: '2027-2028' })).ok, true);
    await sendMessage(bg.listeners, { type: 'dtu-course-page', code: '02110' });
    assert.deepEqual(bg.fetchCalls.map((c) => c.url), ['https://kurser.dtu.dk/course/2027-2028/02110', 'https://kurser.dtu.dk/course/02110']);
    for (const volume of ['2027', '2027-2029', '../x', 7]) {
        assert.deepEqual(plain(await sendMessage(bg.listeners, { type: 'dtu-course-page', code: '02110', volume })), { ok: false, error: 'invalid_volume' }, String(volume));
    }
    assert.equal(bg.fetchCalls.length, 2);
});

// kurser.dtu.dk's answer when the login session needs renewing (HTTP 200).
const KURSER_LOGIN_STUB = '<!DOCTYPE html><html><head><title>kurser.dtu.dk</title></head><body><script> setTimeout(function() { window.location.reload(); }, 500); </script><iframe style="display:none" id="loginFrame" src="?forceLogin=true"></iframe></body></html>';

test('exam schedule: a kurser login stub renews the login, asks again, and is never cached', async () => {
    let first = true;
    const bg = loadBackground({
        fetchImpl: async (url) => {
            if (url.includes('forceLogin')) return { ok: true, status: 200, text: async () => '<html>signed in</html>' };
            const html = first ? KURSER_LOGIN_STUB : coursePage('12106');
            first = false;
            return { ok: true, status: 200, text: async () => html };
        }
    });
    const page = plain(await sendMessage(bg.listeners, { type: 'dtu-course-page', code: '12106', volume: '2026-2027' }));
    assert.equal(page.html, coursePage('12106'));
    assert.deepEqual(bg.fetchCalls.map((c) => c.url), [
        'https://kurser.dtu.dk/course/2026-2027/12106',
        'https://kurser.dtu.dk/course/2026-2027/12106?forceLogin=true',
        'https://kurser.dtu.dk/course/2026-2027/12106'
    ]);
    await sendMessage(bg.listeners, { type: 'dtu-course-page', code: '12106', volume: '2026-2027' });
    assert.equal(bg.fetchCalls.length, 3, 'the real page is cached');
});

test('exam schedule: a login stub that stays is reported, not cached, and a cached stub is not served', async () => {
    const bg = loadBackground({ fetchImpl: async () => ({ ok: true, status: 200, text: async () => KURSER_LOGIN_STUB }) });
    assert.deepEqual(plain(await sendMessage(bg.listeners, { type: 'dtu-course-page', code: '12106' })), { ok: false, error: 'login_required' });
    await sendMessage(bg.listeners, { type: 'dtu-course-page', code: '12106' });
    assert.equal(bg.fetchCalls.length, 6);
    // A stub cached by an earlier version is fetched again, not returned.
    const planted = loadBackground({ fetchImpl: async () => ({ ok: true, status: 200, text: async () => coursePage('12106') }) });
    for (const key of ['cache_course_page_12106']) planted.storage.set(key, { ts: Date.now(), data: { ok: true, html: KURSER_LOGIN_STUB, fetchedAt: Date.now() } });
    assert.equal(plain(await sendMessage(planted.listeners, { type: 'dtu-course-page', code: '12106' })).html, coursePage('12106'));
    assert.equal(planted.fetchCalls.length, 1);
});

test('exam schedule: a 200 page that is not the exam table is reported and not cached', async () => {
    const bg = loadBackground({ fetchImpl: async () => ({ ok: true, status: 200, text: async () => '<html><h1>Down for maintenance</h1></html>' }) });
    assert.deepEqual(plain(await sendMessage(bg.listeners, { type: 'dtu-exam-table' })), { ok: false, error: 'unexpected_page' });
    await sendMessage(bg.listeners, { type: 'dtu-exam-table' });
    assert.equal(bg.fetchCalls.length, 2, 'asked again, not served from cache');
    assert.equal([...bg.storage.keys()].some((k) => k.startsWith('cache_exam_table_')), false);
    // A wrong page cached by an earlier version is fetched again, not returned.
    const planted = loadBackground({ fetchImpl: async () => ({ ok: true, status: 200, text: async () => EXAM_TABLE_PAGE }) });
    planted.storage.set('cache_exam_table_en', { ts: Date.now(), data: { ok: true, html: '<html>maintenance</html>', fetchedAt: Date.now() } });
    assert.equal(plain(await sendMessage(planted.listeners, { type: 'dtu-exam-table' })).html, EXAM_TABLE_PAGE);
    assert.equal(planted.fetchCalls.length, 1);
});

test('exam schedule: a 200 page that is not the course asked for is reported and not cached', async () => {
    for (const html of ['<html><h1>Down for maintenance</h1></html>', coursePage('02110')]) {
        const bg = loadBackground({ fetchImpl: async () => ({ ok: true, status: 200, text: async () => html }) });
        assert.deepEqual(plain(await sendMessage(bg.listeners, { type: 'dtu-course-page', code: '12106' })), { ok: false, error: 'unexpected_page' });
        await sendMessage(bg.listeners, { type: 'dtu-course-page', code: '12106' });
        assert.equal(bg.fetchCalls.length, 2, 'asked again, not served from cache');
        assert.equal([...bg.storage.keys()].some((k) => k.startsWith('cache_course_page_')), false);
    }
    // A wrong page cached by an earlier version is fetched again, not returned.
    const planted = loadBackground({ fetchImpl: async () => ({ ok: true, status: 200, text: async () => coursePage('12106') }) });
    planted.storage.set('cache_course_page_12106', { ts: Date.now(), data: { ok: true, html: '<html>maintenance</html>', fetchedAt: Date.now() } });
    assert.equal(plain(await sendMessage(planted.listeners, { type: 'dtu-course-page', code: '12106' })).html, coursePage('12106'));
    assert.equal(planted.fetchCalls.length, 1);
});

test('exam schedule: a course page, a catalogue year page and an Information tab count as the course', () => {
    const { api: exam } = loadModuleInternals(BACKGROUND_FILES, ['isKurserCoursePage'], { chrome: { storage: { local: { get() {}, set() {}, remove() {} } }, runtime: {} } });
    assert.equal(exam.isKurserCoursePage(coursePage('41B02'), '41B02'), true);
    assert.equal(exam.isKurserCoursePage(coursePage('01001'), '2026-2027/01001'), true);
    assert.equal(exam.isKurserCoursePage(courseInfoPage('01001'), '01001/info'), true);
    assert.equal(exam.isKurserCoursePage(coursePage('01001'), '01001/info'), false);
    assert.equal(exam.isKurserCoursePage(coursePage('010012'), '01001'), false);
    assert.equal(exam.isKurserCoursePage(courseInfoPage('02110'), '01001/info'), false);
});

test('exam schedule: the real exam table page counts as one', () => {
    const { api: exam } = loadModuleInternals(BACKGROUND_FILES, ['isExamTablePage'], { chrome: { storage: { local: { get() {}, set() {}, remove() {} } }, runtime: {} } });
    assert.equal(exam.isExamTablePage(readSource('tests/fixtures/exam-dates-2026-11-07.html')), true);
});

test('cache: expired entries are deleted at browser start, fresh ones and settings stay', async () => {
    const bg = loadBackground();
    const now = Date.now();
    bg.storage.set('cache_course_page_02110', { ts: now - 25 * 3600000, data: { ok: true } });
    bg.storage.set('cache_lib_crowd_x', { ts: now - 6 * 60000, data: {} });
    bg.storage.set('cache_grade_02110', { ts: now - 3600000, data: {} });
    bg.storage.set('cache_eval_broken', { data: {} });
    bg.storage.set('dtuDarkModeEnabled', false);
    assert.equal(bg.startup.length, 1, 'one startup listener');
    bg.startup[0]();
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual([...bg.storage.keys()].sort(), ['cache_grade_02110', 'dtuDarkModeEnabled']);
});

test('cache: a write into full storage clears the cache and writes once more', async () => {
    let calls = 0;
    const bg = loadBackground({
        fetchImpl: async () => ({ ok: true, status: 200, text: async () => EXAM_TABLE_PAGE }),
        setImpl(obj, storage) {
            calls++;
            if ([...storage.keys()].some((k) => k.startsWith('cache_'))) return Promise.reject(new Error('QUOTA_BYTES quota exceeded'));
            for (const [k, v] of Object.entries(obj)) storage.set(k, v);
            return Promise.resolve();
        }
    });
    bg.storage.set('cache_course_page_02110', { ts: Date.now(), data: { ok: true, html: 'x' } });
    bg.storage.set('dtuDarkModeEnabled', true);
    assert.equal(plain(await sendMessage(bg.listeners, { type: 'dtu-exam-table' })).ok, true);
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(calls, 2);
    assert.deepEqual([...bg.storage.keys()].sort(), ['cache_exam_table_en', 'dtuDarkModeEnabled']);
});

test('messages: no sender URL, or another extension, get no answer', async () => {
    const bg = loadBackground();
    const ask = (sender) => new Promise((resolve) => {
        const timer = setTimeout(() => resolve('no_response'), 200);
        bg.listeners[0]({ type: 'dtu-course-page', code: 'bad' }, sender, (v) => { clearTimeout(timer); resolve(v); });
    });
    assert.equal(await ask({}), 'no_response');
    assert.equal(await ask(undefined), 'no_response');
    assert.equal(await ask({ id: 'other@ext', url: 'https://kurser.dtu.dk/course/02110' }), 'no_response');
    assert.deepEqual(plain(await ask({ id: 'after-dark@test', url: 'https://kurser.dtu.dk/course/02110' })), { ok: false, error: 'invalid_course' });
    assert.deepEqual(plain(await ask({ url: 'moz-extension://x/exchange-permission.html' })), { ok: false, error: 'invalid_course' });
});

test('course codes in lower case reach the same page and cache entry as in capitals', async () => {
    const bg = loadBackground({ fetchImpl: async () => ({ ok: true, status: 200, text: async () => coursePage('34K01') }) });
    assert.equal(plain(await sendMessage(bg.listeners, { type: 'dtu-course-page', code: '34k01' })).ok, true);
    assert.equal(plain(await sendMessage(bg.listeners, { type: 'dtu-course-page', code: '34K01' })).ok, true);
    assert.deepEqual(bg.fetchCalls.map((c) => c.url), ['https://kurser.dtu.dk/course/34K01']);
});

test('evaluation cache: URLs that differ only in punctuation are cached apart', async () => {
    const html = '<h2>Resultater : 02476 Machine Learning Operations Jan 26</h2>'
        + '<div class="ResultCourseModelWrapper"><div class="QuestionPositionColumn">1.1</div>'
        + '<div class="FinalEvaluation_QuestionText">q</div>'
        + '<div class="RowWrapper"><div class="FinalEvaluation_Result_OptionColumn">Enig</div><div class="Answer_Result_Background"><span>5</span></div></div>'
        + '</div>' + ' '.repeat(200);
    const bg = loadBackground({ fetchImpl: async (url) => ({ ok: true, status: 200, url, text: async () => html }) });
    const ask = (url) => sendMessage(bg.listeners, { type: 'dtu-course-evaluation', url });
    assert.equal(plain(await ask('https://evaluering.dtu.dk/kursus/02476/a-b')).ok, true);
    assert.equal(plain(await ask('https://evaluering.dtu.dk/kursus/02476/a_b')).cached, undefined, 'not served from the a-b entry');
    assert.equal(plain(await ask('https://evaluering.dtu.dk/kursus/02476/a-b')).cached, true, 'its own entry is used');
    assert.equal(bg.fetchCalls.length, 2);
});

test('exam schedule: failed fetches are reported and not cached', async () => {
    const bg = loadBackground({ fetchImpl: async () => ({ ok: false, status: 503, text: async () => '' }) });
    assert.deepEqual(plain(await sendMessage(bg.listeners, { type: 'dtu-exam-table' })), { ok: false, error: 'http_503' });
    await sendMessage(bg.listeners, { type: 'dtu-exam-table' });
    assert.equal(bg.fetchCalls.length, 2);
});

test('grade distribution: a page with no result rows and no DTU marker is unreadable, not "no data"', () => {
    assert.deepEqual(plain(api.parseGradeDistribution('<h2>01001</h2><div class="new-layout">12: 40</div>')), { unreadable: true });
    // A registered count with no result rows is DTU hiding a small exam.
    assert.equal(api.parseGradeDistribution(gradeTable([['Antal tilmeldte', 3]])), null);
});

test('grade history: pages that exist but cannot be parsed report parse_failed', async () => {
    const bg = loadBackground({
        fetchImpl: async (url) => url.endsWith('/Winter-2025')
            ? { ok: true, status: 200, text: async () => '<h2>01001 Winter-2025</h2><div>redesigned</div>' }
            : { ok: false, status: 404, text: async () => '' }
    });
    const result = plain(await bg.api.fetchLatestIterations('01001', ['Winter-2025', 'Summer-2025'], 4));
    assert.deepEqual(result, { ok: false, error: 'parse_failed' });
});

test('the workload lookup picks the newest evaluation of the same course from the info page', async () => {
    const info = '<a href="https://evaluering.dtu.dk/kursus/34034/318732">E24</a>'
        + '<a href="//evaluering.dtu.dk/kursus/34034/347314">E25</a>'
        + '<a href="https://evaluering.dtu.dk/kursus/34032/999999">another course</a>';
    assert.equal(api.latestEvaluationUrl(info, '34034'), 'https://evaluering.dtu.dk/kursus/34034/347314');
    assert.equal(api.latestEvaluationUrl('<p>No evaluations</p>', '34034'), null);
    assert.deepEqual({ ...await api.fetchCourseWorkload('34034', async () => ({ ok: true, html: '<p>none</p>' })) }, { ok: true, none: true });
    assert.deepEqual({ ...await api.fetchCourseWorkload('34034', async () => ({ ok: false, error: 'login_required' })) }, { ok: false, error: 'info_failed' });
});

// A DTU server that never answers must end in an error reply, not leave a widget
// on its loading bars forever: every background request goes through the time limit.
test('background: every request goes through fetchWithTimeLimit', () => {
    const bare = [];
    for (const f of BACKGROUND_FILES) {
        if (f === 'background.shared.js') continue;
        readSource(f).split('\n').forEach((line, i) => {
            if (/(^|[^\w.])fetch\(/.test(line) && !/^\s*\/\//.test(line)) bare.push(f + ':' + (i + 1));
        });
    }
    assert.deepEqual(bare, []);
});

test('fetchWithTimeLimit: a request that never answers fails with TimeoutError', async () => {
    let seenSignal = null;
    const fetch = (url, init) => new Promise((resolve, reject) => {
        seenSignal = init.signal;
        init.signal.addEventListener('abort', () => reject(init.signal.reason));
    });
    const { api } = loadModuleInternals('background.shared.js', ['fetchWithTimeLimit'], { fetch });
    const started = Date.now();
    await assert.rejects(api.fetchWithTimeLimit('https://example.invalid/', { method: 'POST' }, 30), { name: 'TimeoutError' });
    assert.ok(seenSignal, 'a signal is passed to fetch');
    assert.ok(Date.now() - started < 2000);
});
