// Course activity in the Lessons download: who keeps a name in a saved discussion, which
// quiz attempts and submission files are fetched, and where each file lands in the ZIP.
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readSource, plain } from './_harness.mjs';

const ORIGIN = 'https://learn.inside.dtu.dk';

function loadActivity(fetchImpl = async () => ({ ok: false, status: 404 })) {
    const calls = [];
    const sanitize = (name, fallback) => (String(name || '').trim() || fallback).replace(/[<>:"/\\|?*]/g, '_');
    const sandbox = {
        location: { origin: ORIGIN },
        URL, TextEncoder, Promise, setTimeout, clearTimeout, Set, Object, Array, String, Number, Date, Math, JSON, encodeURIComponent, decodeURIComponent,
        DTUAfterDarkLessonsBulkState: { runAbort: null },
        DTUAfterDarkLessonsBulkFetch: { lessonsBulkFetch: async (url, opts) => { const path = String(url).replace(ORIGIN, ''); calls.push(path); return fetchImpl(path, opts); } },
        DTUAfterDarkLessonsBulkZip: { sanitizeZipEntryName: sanitize, isTooLargeForZipEntry: () => false, getLessonsBulkZipBaseTitle: () => 'Example course' }
    };
    sandbox.globalThis = sandbox;
    vm.runInNewContext(readSource('darkmode.lessons-bulk.activity.js'), sandbox);
    return { api: sandbox.DTUAfterDarkLessonsBulkActivity, calls };
}

function json(body, status = 200) {
    return { ok: status < 400, status, headers: { get: () => null }, json: async () => body, text: async () => JSON.stringify(body) };
}

function bytes(text) {
    const b = new TextEncoder().encode(text);
    return { ok: true, status: 200, headers: { get: (k) => (k === 'content-length' ? String(b.length) : null) }, arrayBuffer: async () => b.buffer };
}

function page(html) {
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => html };
}

test('discussion: threaded oldest first, names kept, you and staff roles marked, anonymous stays anonymous', () => {
    const { api } = loadActivity();
    const roles = { 1: 'Student', 2: 'Teacher', 3: 'Student', 9: 'Student*' };
    const posts = [
        { PostId: 10, ThreadId: 10, ParentPostId: null, PostingUserId: 3, PostingUserDisplayName: 'Anna A', DatePosted: '2026-09-01T10:00:00Z', Subject: 'Q1', Message: { Html: '<p>q</p>' } },
        { PostId: 11, ThreadId: 10, ParentPostId: 10, PostingUserId: 2, PostingUserDisplayName: 'Prof P', DatePosted: '2026-09-01T12:00:00Z', Message: { Html: '<p>a</p>' } },
        { PostId: 12, ThreadId: 10, ParentPostId: 11, PostingUserId: 3, PostingUserDisplayName: 'Anna A', DatePosted: '2026-09-01T13:00:00Z', Message: { Html: '<p>thanks</p>' } },
        { PostId: 20, ThreadId: 20, ParentPostId: null, PostingUserId: 9, PostingUserDisplayName: 'Bo B', DatePosted: '2026-08-30T09:00:00Z', Subject: 'Q0', Message: { Html: '' } },
        { PostId: 21, ThreadId: 20, ParentPostId: 20, PostingUserId: 1, PostingUserDisplayName: 'Me M', DatePosted: '2026-08-30T10:00:00Z', Message: { Html: '' } },
        { PostId: 22, ThreadId: 20, ParentPostId: 20, PostingUserId: 3, PostingUserDisplayName: 'Anna A', DatePosted: '2026-08-30T11:00:00Z', Message: { Html: '' }, IsDeleted: true },
        { PostId: 30, ThreadId: 30, ParentPostId: null, PostingUserId: 5, PostingUserDisplayName: 'Hidden H', DatePosted: '2026-09-02T09:00:00Z', IsAnonymous: true, Message: { Html: '' } }
    ];
    const entries = plain(api.discussionEntries(posts, roles, '1'));
    assert.deepEqual(entries.map((e) => [e.id, e.depth, e.author, e.subject]), [
        [20, 0, 'Bo B', 'Q0'],
        [21, 1, 'Me M (you)', ''],
        [10, 0, 'Anna A', 'Q1'],
        [11, 1, 'Prof P (Teacher)', ''],
        [12, 2, 'Anna A', ''],
        [30, 0, 'Anonymous', '']
    ]);
    assert.ok(!JSON.stringify(entries).includes('Hidden'), 'an anonymous post shows its author');
});

test('discussion: with no class list nobody gets a role', () => {
    const { api } = loadActivity();
    const posts = [
        { PostId: 1, PostingUserId: 2, PostingUserDisplayName: 'Prof P', DatePosted: '2026-09-01', Message: { Html: '' } },
        { PostId: 2, ParentPostId: 1, PostingUserId: 1, PostingUserDisplayName: 'Me', DatePosted: '2026-09-02', Message: { Html: '' } }
    ];
    assert.deepEqual(plain(api.discussionEntries(posts, {}, '1')).map((e) => e.author), ['Prof P', 'Me (you)']);
});

test('quiz attempts: one review link per attempt, entities decoded', () => {
    const { api } = loadActivity();
    const html = '<a href="quiz_submissions_attempt.d2l?isprv=&amp;qi=5&amp;ai=100&amp;ou=7">Attempt 1</a>'
        + '<a onclick="x(\'quiz_submissions_attempt.d2l?isprv=&amp;qi=5&amp;ai=100&amp;ou=7\')">again</a>'
        + '<a href="quiz_submissions_attempt.d2l?isprv=&amp;qi=5&amp;ai=101&amp;ou=7">Attempt 2</a>';
    assert.deepEqual(plain(api.quizAttemptLinks(html)), [
        'quiz_submissions_attempt.d2l?isprv=&qi=5&ai=100&ou=7',
        'quiz_submissions_attempt.d2l?isprv=&qi=5&ai=101&ou=7'
    ]);
    assert.deepEqual(plain(api.quizAttemptLinks('<p>No attempts</p>')), []);
});

test('ZIP paths: links from a page reach its files, repeats are numbered', () => {
    const { api } = loadActivity();
    assert.equal(api.relLink('Announcements', 'Announcements/Attachments/week 1.pdf'), 'Attachments/week%201.pdf');
    assert.equal(api.relLink('Assignments/Lab 1', 'Assignments/Lab 1/Your submission/r.pdf'), 'Your%20submission/r.pdf');
    const name = api.makeNamer((s, f) => (String(s || '').trim() || f).replace(/[/\\]/g, '_'));
    assert.equal(name(['Assignments', 'A/B', 'r.pdf']), 'Assignments/A_B/r.pdf');
    assert.equal(name(['Assignments', 'A/B', 'r.pdf']), 'Assignments/A_B/r (1).pdf');
    assert.equal(name(['Quizzes', 'Quiz 1.html']), 'Quizzes/Quiz 1.html');
});

test('assignments: own and group submission files, feedback, history page when the API refuses', async () => {
    const api0 = '/d2l/api/le/1.100/77';
    const routes = {
        '/d2l/api/versions/': json([{ ProductCode: 'le', LatestVersion: '1.100' }, { ProductCode: 'lp', LatestVersion: '1.64' }]),
        '/d2l/api/lp/1.64/users/whoami': json({ Identifier: '555' }),
        [api0 + '/dropbox/folders/']: json([
            { Id: 1, Name: 'Lab 1', DueDate: '2026-10-01T10:00:00Z', Assessment: { ScoreDenominator: 10 } },
            { Id: 2, Name: 'Group report', GroupTypeId: 9 },
            { Id: 3, Name: 'Old lab' },
            { Id: 4, Name: 'Hidden', IsHidden: true }
        ]),
        [api0 + '/dropbox/folders/1/submissions/mysubmissions/']: json([{ Entity: { EntityId: 555, EntityType: 'User' }, Submissions: [{ Id: 40, SubmissionDate: '2026-09-30T10:00:00Z', Files: [{ FileId: 8, FileName: 'report.pdf' }] }], Feedback: { Score: 8, Feedback: null, Files: [] } }]),
        [api0 + '/dropbox/folders/1/submissions/40/files/8']: bytes('PDF'),
        [api0 + '/dropbox/folders/2/submissions/mysubmissions/']: json(null, 403),
        ['/d2l/api/lp/1.64/77/groupcategories/9/groups/']: json([{ GroupId: 31, Enrollments: [1, 2] }, { GroupId: 32, Enrollments: [555, 3] }]),
        ['/d2l/lms/dropbox/user/folders_history.d2l?db=2&grpid=32&isprv=0&bp=0&ou=77']: page('<a href="/d2l/common/viewFile.d2lfile/Database/Xy/group%20report.pdf?ou=77">x</a><a href="/d2l/dropbox/user/folderInlineFeedback/77/2/32/60/70">Open inline feedback</a>'),
        ['/d2l/common/viewFile.d2lfile/Database/Xy/group%20report.pdf?ou=77']: bytes('PDF'),
        [api0 + '/dropbox/folders/2/feedback/group/32']: json({ Score: 17, Feedback: null, Files: [] }),
        [api0 + '/dropbox/folders/2/entities/32/submissions/60/files/70/annotatedpdf']: json({ AnnotationData: JSON.stringify({ annotations: [] }), FileName: 'group report.pdf' }),
        [api0 + '/dropbox/folders/3/submissions/mysubmissions/']: json(null, 403),
        ['/d2l/lms/dropbox/user/folders_history.d2l?db=3&isprv=0&bp=0&ou=77']: page('<a href="/d2l/common/viewFile.d2lfile/Database/AbC/old%20lab.zip?ou=77">old lab.zip</a>'),
        ['/d2l/common/viewFile.d2lfile/Database/AbC/old%20lab.zip?ou=77']: bytes('ZIP'),
        [api0 + '/dropbox/folders/3/feedback/user/555']: json(null, 403)
    };
    const { api, calls } = loadActivity(async (url) => routes[url] || json(null, 404));
    const out = await api.collectCourseActivity('77', ['assignments'], () => {});
    const paths = plain(out.entries.map((e) => e.path));
    assert.deepEqual(paths, [
        'Assignments/Lab 1/Your submission/report.pdf',
        'Assignments/Lab 1/Assignment.html',
        'Assignments/Group report/Your submission/group report.pdf',
        'Assignments/Group report/Assignment.html',
        'Assignments/Old lab/Your submission/old lab.zip',
        'Assignments/Old lab/Assignment.html'
    ]);
    const lab = new TextDecoder().decode(out.entries[1].bytes);
    assert.ok(lab.includes('href="Your%20submission/report.pdf"'), lab);
    assert.ok(lab.includes('Score: 8 / 10'), lab);
    assert.ok(!calls.some((u) => u.includes('/folders/4/')), 'a hidden folder was read');
    assert.ok(calls.includes('/d2l/api/le/1.100/77/dropbox/folders/2/entities/32/submissions/60/files/70/annotatedpdf'), 'inline feedback not looked up');
    assert.ok(new TextDecoder().decode(out.entries[3].bytes).includes('Score: 17'), 'group feedback missing');
    assert.deepEqual(plain(out.notes), []);
    assert.equal(out.counts.assignments, 3);
});

test('quizzes: only attempts the submissions page lists are fetched, none when it lists none', async () => {
    const api0 = '/d2l/api/le/1.100/77';
    const routes = {
        '/d2l/api/versions/': json([{ ProductCode: 'le', LatestVersion: '1.100' }, { ProductCode: 'lp', LatestVersion: '1.64' }]),
        '/d2l/api/lp/1.64/users/whoami': json({ Identifier: '555' }),
        [api0 + '/quizzes/']: json({ Objects: [{ QuizId: 5, Name: 'Week 1' }, { QuizId: 6, Name: 'Week 2' }], Next: null }),
        ['/d2l/lms/quizzing/user/quiz_submissions.d2l?qi=5&ou=77']: page('<a href="quiz_submissions_attempt.d2l?qi=5&amp;ai=100&amp;ou=77">1</a>'),
        ['/d2l/lms/quizzing/user/quiz_submissions.d2l?qi=6&ou=77']: page('<p>No submissions</p>')
    };
    const { api, calls } = loadActivity(async (url) => routes[url] || page(''));
    // quizAttemptBody needs a DOM; the unit test stops at which pages are asked for.
    await api.collectCourseActivity('77', ['quizzes'], () => {}).catch(() => {});
    assert.deepEqual(calls.filter((u) => u.includes('quiz_submissions_attempt')), ['/d2l/lms/quizzing/user/quiz_submissions_attempt.d2l?qi=5&ai=100&ou=77']);
    assert.ok(!calls.some((u) => /questions|attempt\/|quiz_start|StartQuiz/i.test(u) && !u.includes('quiz_submissions_attempt')), 'a quiz was started or its questions asked for');
});

test('a quiz not taken saves its dates and limits, a hidden one nothing', async () => {
    const api0 = '/d2l/api/le/1.100/77';
    const routes = {
        '/d2l/api/versions/': json([{ ProductCode: 'le', LatestVersion: '1.100' }, { ProductCode: 'lp', LatestVersion: '1.64' }]),
        '/d2l/api/lp/1.64/users/whoami': json({ Identifier: '555' }),
        [api0 + '/quizzes/']: json({ Objects: [{ QuizId: 6, Name: 'Week 2', DueDate: '2026-12-01T10:00:00Z', SubmissionTimeLimit: { IsEnforced: true, TimeLimitValue: 30 }, AttemptsAllowed: { IsUnlimited: false, NumberOfAttemptsAllowed: 2 } }, { QuizId: 7, Name: 'Hidden', IsActive: false }], Next: null })
    };
    const { api, calls } = loadActivity(async (url) => routes[url] || page('<p>No submissions</p>'));
    const out = await api.collectCourseActivity('77', ['quizzes'], () => {});
    assert.deepEqual(plain(out.entries.map((e) => e.path)), ['Quizzes/Week 2.html']);
    const html = new TextDecoder().decode(out.entries[0].bytes);
    assert.match(html, /Not taken/);
    assert.match(html, /Time limit 30 minutes/);
    assert.match(html, /2 attempts allowed/);
    assert.ok(!calls.some((u) => u.includes('qi=7')), 'hidden quiz was read');
});

// A saved page is opened later from disk, so nothing in it may run: no handler,
// no srcdoc, no javascript: URL in any attribute (formaction and xlink:href too).
import { extractFunctions as extractScrub } from './_harness.mjs';

test('discussions: files attached to posts are saved and linked from the topic page', async () => {
    const api0 = '/d2l/api/le/1.100/77';
    const routes = {
        '/d2l/api/versions/': json([{ ProductCode: 'le', LatestVersion: '1.100' }, { ProductCode: 'lp', LatestVersion: '1.64' }]),
        '/d2l/api/lp/1.64/users/whoami': json({ Identifier: '555' }),
        [api0 + '/discussions/forums/']: json([{ ForumId: 1, Name: 'Q&A' }]),
        [api0 + '/classlist/']: json([]),
        [api0 + '/discussions/forums/1/topics/']: json([{ TopicId: 2, Name: 'Week 1' }]),
        [api0 + '/discussions/forums/1/topics/2/posts/']: json([{ PostId: 10, ParentPostId: null, PostingUserId: 3, PostingUserDisplayName: 'Anna A', DatePosted: '2026-09-01T10:00:00Z', Subject: 'Plot', Message: { Html: '' }, Attachments: [{ FileId: 7, FileName: 'plot.png', Size: 3 }] }]),
        [api0 + '/discussions/forums/1/topics/2/posts/10/attachments/7']: bytes('PNG')
    };
    const { api } = loadActivity(async (url) => routes[url] || json(null, 404));
    const out = await api.collectCourseActivity('77', ['discussions'], () => {});
    assert.deepEqual(plain(out.entries.map((e) => e.path)), ['Discussions/Attachments/plot.png', 'Discussions/Q&A - Week 1.html']);
    const pageText = new TextDecoder().decode(out.entries[1].bytes);
    assert.ok(pageText.includes('href="Attachments/plot.png"'), pageText);
    assert.ok(!pageText.includes('not saved'), pageText);
});

function rubricRoutes(scoreVisible) {
    const api0 = '/d2l/api/le/1.100/77';
    const rubric = {
        RubricId: 50, Name: 'Report rubric', Visibility: 0, IsScoreVisibleToAssessedUsers: scoreVisible,
        CriteriaGroups: [{ Name: 'Criteria', Levels: [{ Id: 1, Name: 'Weak', Points: 1 }, { Id: 2, Name: 'Strong', Points: 3 }],
            Criteria: [{ Id: 100, Name: 'Structure', Cells: [{ LevelId: 1, Points: 1, Description: { Text: 'Hard to follow', Html: '' }, Feedback: { Text: '', Html: '' } }, { LevelId: 2, Points: 3, Description: { Text: 'Clear sections', Html: '' }, Feedback: { Text: 'Default well done', Html: '' } }] }] }],
        OverallLevels: [{ Id: 9, Name: 'Pass', RangeStart: 2 }]
    };
    return {
        '/d2l/api/versions/': json([{ ProductCode: 'le', LatestVersion: '1.100' }, { ProductCode: 'lp', LatestVersion: '1.64' }]),
        '/d2l/api/lp/1.64/users/whoami': json({ Identifier: '555' }),
        [api0 + '/dropbox/folders/']: json([{ Id: 1, Name: 'Lab 1', Assessment: { ScoreDenominator: 10, Rubrics: [rubric] } }]),
        [api0 + '/dropbox/folders/1/submissions/mysubmissions/']: json([]),
        [api0 + '/assessment?assessmentType=Rubric&objectType=Dropbox&objectId=1&rubricId=50&userId=555']: json({
            RubricId: 50, OverallOutcome: { LevelId: 9, Score: 3, Feedback: { Text: '', Html: '' } },
            CriteriaOutcome: [{ CriterionId: 100, LevelId: 2, Score: 3, Feedback: { Text: 'Nice headings', Html: '' } }]
        })
    };
}

test('assignments: the rubric is saved with your level per criterion, and points only where the teacher shows them', async () => {
    for (const visible of [true, false]) {
        const routes = rubricRoutes(visible);
        const { api } = loadActivity(async (url) => routes[url] || json(null, 404));
        const out = await api.collectCourseActivity('77', ['assignments'], () => {});
        const html = new TextDecoder().decode(out.entries.find((e) => e.path === 'Assignments/Lab 1/Assignment.html').bytes);
        for (const text of ['Report rubric', 'Structure', 'Strong', 'Clear sections', 'Nice headings', 'Overall: Pass']) assert.ok(html.includes(text), text + ' missing: ' + html);
        assert.equal(/3 points/.test(html), visible, html);
    }
});

test('grades: your grade items, points, grade and comments on one page', async () => {
    const api0 = '/d2l/api/le/1.100/77';
    const routes = {
        '/d2l/api/versions/': json([{ ProductCode: 'le', LatestVersion: '1.100' }, { ProductCode: 'lp', LatestVersion: '1.64' }]),
        '/d2l/api/lp/1.64/users/whoami': json({ Identifier: '555' }),
        [api0 + '/grades/values/myGradeValues/']: json([
            { GradeObjectName: 'Assignment 1', GradeObjectTypeName: 'Numeric', PointsNumerator: 8, PointsDenominator: 10, DisplayedGrade: '80 %', Comments: { Text: 'Good work', Html: '' } },
            { GradeObjectName: 'Quiz', GradeObjectTypeName: 'Numeric', PointsNumerator: null, PointsDenominator: 5, DisplayedGrade: '', Comments: { Text: '', Html: '' } }
        ])
    };
    const { api } = loadActivity(async (url) => routes[url] || json(null, 404));
    const out = await api.collectCourseActivity('77', ['grades'], () => {});
    assert.deepEqual(plain(out.entries.map((e) => e.path)), ['Grades/Grades.html']);
    const html = new TextDecoder().decode(out.entries[0].bytes);
    for (const text of ['Assignment 1', '8 / 10', '80 %', 'Good work', 'Quiz']) assert.ok(html.includes(text), text + ' missing: ' + html);
    assert.equal(out.counts.grades, 2);
    assert.ok(api.KINDS.some((k) => k.key === 'grades'));
});

test('saved pages keep no handler, srcdoc or javascript: URL in any attribute', () => {
    const { api } = extractScrub('darkmode.lessons-bulk.activity.js', ['scrub'], { prelude: 'function absUrl(u) { return u; }' });
    const node = (attrs) => {
        const list = Object.entries(attrs).map(([name, value]) => ({ name, value }));
        return {
            get attributes() { return list.slice(); },
            removeAttribute(n) { const i = list.findIndex((a) => a.name === n); if (i >= 0) list.splice(i, 1); },
            setAttribute(n, v) { const a = list.find((x) => x.name === n); if (a) a.value = v; else list.push({ name: n, value: v }); },
            names() { return list.map((a) => a.name); }
        };
    };
    const nodes = [
        node({ formaction: 'javascript:alert(1)', type: 'submit' }),
        node({ 'xlink:href': ' JaVa\tScRiPt:alert(1)' }),
        node({ action: 'javascript:void 0' }),
        node({ srcdoc: '<script>x()</script>', title: 'frame' }),
        node({ onclick: 'x()', href: 'https://learn.inside.dtu.dk/d2l/home' })
    ];
    api.scrub({ ownerDocument: {}, querySelectorAll: (sel) => (sel === '*' ? nodes : []) });
    assert.deepEqual(nodes.map((n) => n.names()), [['type'], [], [], ['title'], ['href']]);
});
