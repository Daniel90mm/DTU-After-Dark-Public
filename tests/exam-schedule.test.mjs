import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readSource, loadDom } from './_harness.mjs';

function loadCore() {
    const sandbox = {};
    sandbox.globalThis = sandbox;
    loadDom(sandbox);
    vm.runInNewContext(readSource('darkmode.studyplan-exam-schedule-core.js'), sandbox);
    return sandbox.DTUAfterDarkExamScheduleCore;
}

const core = loadCore();
const plain = (v) => JSON.parse(JSON.stringify(v));
const examHtml = readSource('tests/fixtures/exam-dates-2026-11-07.html');
const pages = JSON.parse(readSource('tests/fixtures/kurser-exam-fields.json'));
const sections = core.parseExamTable(examHtml).sections;
const section = (kind, year) => sections.find((s) => s.kind === kind && s.year === year);

test('exam table sections and rows', () => {
    const winter = section('winter', 2026);
    assert.ok(winter, 'winter 2026 section');
    assert.deepEqual(plain(winter.rows.find((r) => r.date === '2026-12-10')), { date: '2026-12-10', text: 'E2-B', grading: '2027-01-18' });
    assert.equal(winter.rows.find((r) => r.date === '2026-12-06').text, '01001, 01003, 01025, 01034, 01035, 01037');
    const summer = section('summer', 2027);
    assert.deepEqual(plain(summer.rows[0]), { date: '2027-05-13', text: 'F1-A and E1-A', grading: '2027-06-10' });
    assert.ok(section('august', 2026));
    assert.throws(() => core.parseExamTable('<p>nothing</p>'), /exam_table_unreadable/);
});

test('course exam fields in English and Danish', () => {
    const en = core.parseCourseExamFields(pages['02110']);
    assert.equal(en.examText, 'E2B');
    assert.equal(en.name, 'Algorithms and Data Structures 2');
    assert.match(en.durationText, /Written exam/);
    assert.match(core.parseCourseExamFields(pages['02002']).examText, /Special day/);
    const da = core.parseCourseExamFields(pages['02110-da']);
    assert.equal(da.examText, 'E2B');
    assert.match(da.durationText, /Skriftlig/);
});

test('login stub has no fields', () => {
    assert.equal(core.parseCourseExamFields(pages.stub), null);
});

test('planner period headers', () => {
    assert.deepEqual(plain(core.parsePlannerPeriod('13 weeks spring 2027')), { key: '2027-spring', season: 'F', year: 2027 });
    assert.equal(core.parsePlannerPeriod('13 weeks autumn 2026').key, '2026-autumn');
    assert.equal(core.parsePlannerPeriod('13 uger efterår 2026').key, '2026-autumn');
    assert.equal(core.parsePlannerPeriod('13 uger forår 2027').season, 'F');
    assert.deepEqual(plain(core.parsePlannerPeriod('January 2027')), { key: '2027-january', season: 'J', year: 2027 });
    assert.deepEqual(plain(core.parsePlannerPeriod('June/July/August 2027')), { key: '2027-summer', season: 'S', year: 2027 });
    assert.equal(core.parsePlannerPeriod('Juni/Juli/August 2027').key, '2027-summer');
    assert.equal(core.parsePlannerPeriod('Januar 2028').key, '2028-january');
    assert.equal(core.parsePlannerPeriod('Year of study 2026'), null);
});

test('a planner period finds its own exam section', () => {
    assert.match(core.findExamSection(sections, core.parsePlannerPeriod('13 weeks autumn 2026')).title, /^Winter exam December 2026 \S January 2027$/);
    assert.equal(core.findExamSection(sections, core.parsePlannerPeriod('13 weeks spring 2027')).kind, 'summer');
    assert.equal(core.findExamSection(sections, core.parsePlannerPeriod('13 weeks spring 2031')), null);
});

const autumn = core.parsePlannerPeriod('13 weeks autumn 2026');
const spring = core.parsePlannerPeriod('13 weeks spring 2027');
const winterSection = core.findExamSection(sections, autumn);
const summerSection = core.findExamSection(sections, spring);
const fields = (code) => core.parseCourseExamFields(pages[code]);
const written = (examText, name = 'Some course') => ({ examText, assessmentText: 'Written examination', durationText: 'Written exam: 4 hours', name, volume: '2026-2027' });
const resolve = (code, f, section, period) => plain(core.resolveCourseExam(code, f, section, period));

test('a slot code on the course page finds its row', () => {
    const r = resolve('02110', fields('02110'), winterSection, autumn);
    assert.equal(r.status, 'suggested');
    assert.equal(r.date, '2026-12-10');
    assert.equal(r.evidence, 'E2-B');
    assert.equal(r.format, 'written');
    assert.equal(r.range, false);
});

test('a course named in the table uses that row', () => {
    const r = resolve('02002', fields('02002'), winterSection, autumn);
    assert.equal(r.date, '2026-12-21');
    assert.equal(r.evidence, 'named: 02002');
    const physics = resolve('10060', fields('10060'), winterSection, autumn);
    assert.equal(physics.date, '2026-12-22');
    assert.equal(physics.evidence, 'named: 10060');
});

test('several slot codes are narrowed by season', () => {
    const r = resolve('34034', fields('34034'), winterSection, autumn);
    assert.equal(r.date, '2026-12-07');
    assert.equal(r.evidence, 'E1-A');
});

test('spring uses F codes and ignores the E re-exam codes in summer rows', () => {
    const r = resolve('02105', fields('02105'), summerSection, spring);
    assert.equal(r.status, 'suggested');
    assert.equal(r.date, '2027-05-20');
    assert.equal(r.evidence, 'F2-B');
    const autumnCourse = resolve('02110', fields('02110'), summerSection, spring);
    assert.equal(autumnCourse.status, 'unconfirmed');
    assert.equal(autumnCourse.date, null);
});

test('re-exam mentions never count as the course being named', () => {
    assert.equal(resolve('01002', written('Special day'), summerSection, spring).date, '2027-05-14');
    const reExamOnly = resolve('01001', fields('01001'), summerSection, spring);
    assert.equal(reExamOnly.status, 'unconfirmed');
    const danish = { rows: [{ date: '2027-06-24', text: '02402 (reeksamen)' }] };
    assert.equal(resolve('02402', written('Special day'), danish, spring).status, 'unconfirmed');
    const english = { rows: [{ date: '2027-05-22', text: '01002 (re-exam)' }] };
    assert.equal(resolve('01002', written('Special day'), english, spring).status, 'unconfirmed');
});

test('a course listed on two dates is not confirmed', () => {
    const twice = { rows: [{ date: '2027-05-20', text: '02323, 02402' }, { date: '2027-05-26', text: '02323' }] };
    const r = resolve('02323', written('F4A'), twice, spring);
    assert.equal(r.status, 'unconfirmed');
    assert.equal(r.reason, 'listed on two dates');
    assert.equal(r.date, null);
});

test('a re-exam note after a list of courses loses to the row that names the course plainly', () => {
    // DTU's table: "02323, 02402 (reeksamen)" on 24 June is the re-exam of both.
    const r = resolve('02323', written('F4A'), summerSection, spring);
    assert.equal(r.status, 'suggested');
    assert.equal(r.date, '2027-05-26');
});

test('an impossible calendar date is not a date', () => {
    const doc = '<h2>Summer 2027</h2><table><tr><td>Date</td><td>Date of exam</td><td>Grading deadline</td></tr><tr><td>29/2 2027</td><td>34034</td><td></td></tr><tr><td>29/2 2028</td><td>34035</td><td></td></tr></table>';
    const rows = plain(core.parseExamTable(doc).sections[0].rows);
    assert.deepEqual(rows.map((row) => row.date), ['2028-02-29']);
});

test('missing page or unpublished period is not confirmed', () => {
    assert.deepEqual(resolve('02110', null, winterSection, autumn), { status: 'unconfirmed', format: null, date: null, range: false, evidence: null, reason: 'course page for 2026/2027 could not be read' });
    const r = resolve('02110', fields('02110'), null, core.parsePlannerPeriod('13 weeks autumn 2031'));
    assert.equal(r.status, 'unconfirmed');
    assert.equal(r.reason, 'DTU has not published exam dates for this period yet');
});

test('formats: oral is a range, assignments only and teacher-agreed have no date', () => {
    const oral = resolve('34034', fields('34034'), winterSection, autumn);
    assert.equal(oral.format, 'oral');
    assert.equal(oral.range, true);
    const reports = resolve('99999', { examText: '', assessmentText: 'Evaluation of exercises/reports', durationText: '', name: 'Project course', volume: '2026-2027' }, winterSection, autumn);
    assert.equal(reports.status, 'no-exam');
    assert.equal(reports.date, null);
    for (const name of ['Special course in Algorithms', 'Bachelor project', 'Master thesis', 'Specialkursus', 'Bachelorprojekt', 'Kandidatspeciale']) {
        const r = resolve('99998', { examText: '', assessmentText: 'Oral examination', durationText: '', name }, winterSection, autumn);
        assert.equal(r.status, 'teacher', name);
        assert.equal(r.date, null, name);
    }
    const unread = resolve('02110', { examText: 'E2B', assessmentText: 'See course website', durationText: '', name: 'X', volume: '2026-2027' }, winterSection, autumn);
    assert.equal(unread.status, 'suggested');
    assert.equal(unread.format, 'unknown');
});

test('student entries: yours, changed when DTU moved, dropped when the course left', () => {
    const resolved = {
        '02110': plain(core.resolveCourseExam('02110', fields('02110'), winterSection, autumn)),
        '02002': plain(core.resolveCourseExam('02002', fields('02002'), winterSection, autumn)),
        '34034': plain(core.resolveCourseExam('34034', fields('34034'), winterSection, autumn))
    };
    const stored = {
        '02110': { format: 'hand-in', date: '2026-12-12', endDate: null, basis: { date: '2026-12-10', evidence: 'E2-B' } },
        '02002': { format: 'written', date: '2026-12-20', endDate: null, basis: { date: '2026-12-20', evidence: 'named: 02002' } },
        '01005': { format: 'written', date: '2026-12-15', endDate: null, basis: null }
    };
    const rows = plain(core.mergeStudentEntries(resolved, stored));
    const row = (code) => rows.find((r) => r.code === code);
    assert.equal(row('02110').status, 'yours');
    assert.equal(row('02110').format, 'hand-in');
    assert.equal(row('02110').date, '2026-12-12');
    assert.equal(row('02002').status, 'changed');
    assert.equal(row('02002').dtuDate, '2026-12-21');
    assert.equal(row('02002').date, '2026-12-20');
    assert.equal(row('34034').status, 'suggested');
    assert.equal(row('01005'), undefined);
    assert.ok(stored['01005'], 'storage is left alone');
    assert.deepEqual(rows.map((r) => r.code), ['34034', '02110', '02002']);
});

test('a course page states its catalogue year', () => {
    assert.equal(fields('34034').volume, '2026-2027');
    assert.equal(fields('34034-no-year').volume, null);
    assert.equal(core.academicYearOf(autumn), '2026-2027');
    assert.equal(core.academicYearOf(spring), '2026-2027');
    assert.equal(core.academicYearOf(core.parsePlannerPeriod('13 weeks autumn 2027')), '2027-2028');
});

test('a slot code is only trusted from the course page of the period\'s own year', () => {
    const autumn27 = core.parsePlannerPeriod('13 weeks autumn 2027');
    const winter27 = core.findExamSection(sections, autumn27);
    assert.ok(winter27, 'DTU has published winter 2027');
    const r = resolve('34034', fields('34034'), winter27, autumn27);
    assert.equal(r.status, 'unconfirmed');
    assert.equal(r.date, null);
    assert.equal(r.reason, 'the course page describes 2026/2027, not 2027/2028');
    const noYear = resolve('34034', fields('34034-no-year'), winterSection, autumn);
    assert.equal(noYear.status, 'unconfirmed');
    assert.equal(noYear.reason, 'the course page does not say which year it describes');
    assert.equal(resolve('34034', fields('34034'), winterSection, autumn).status, 'suggested');
});

test('a saved entry stays yours when today\'s check could not be made', () => {
    const stored = { '02110': { format: 'written', date: '2026-12-10', endDate: null, basis: { date: '2026-12-10', evidence: 'E2-B' } } };
    const unreadable = { '02110': plain(core.resolveCourseExam('02110', null, winterSection, autumn)) };
    assert.equal(plain(core.mergeStudentEntries(unreadable, stored))[0].status, 'yours');
    const teacher = { '02110': { status: 'teacher', format: null, date: null, range: false, evidence: null, reason: null } };
    assert.equal(plain(core.mergeStudentEntries(teacher, stored))[0].status, 'changed');
});

test('gaps between consecutive exams', () => {
    const at = (code, date, status = 'suggested') => ({ code, status, date });
    assert.deepEqual(plain(core.computeExamGaps([at('a', '2026-12-10'), at('b', '2026-12-11')])), [{ fromCode: 'a', toCode: 'b', days: 1, mark: 'one-day' }]);
    assert.deepEqual(plain(core.computeExamGaps([at('a', '2026-12-10'), at('b', '2026-12-10', 'yours')])), [{ fromCode: 'a', toCode: 'b', days: 0, mark: 'same-day' }]);
    assert.deepEqual(plain(core.computeExamGaps([at('b', '2026-12-14'), { code: 'c', status: 'teacher', date: null }, at('a', '2026-12-10')])), [{ fromCode: 'a', toCode: 'b', days: 4, mark: null }]);
});

test('a gap counts from the last day of a dated range', () => {
    const at = (code, date, endDate = null) => ({ code, status: 'yours', date, endDate });
    assert.deepEqual(plain(core.computeExamGaps([at('a', '2026-12-07', '2026-12-09'), at('b', '2026-12-10')])), [{ fromCode: 'a', toCode: 'b', days: 1, mark: 'one-day' }]);
    // b starts inside a's range: same day, and c is measured from a's end, not b's start.
    assert.deepEqual(plain(core.computeExamGaps([at('a', '2026-12-07', '2026-12-11'), at('b', '2026-12-08'), at('c', '2026-12-14')])), [
        { fromCode: 'a', toCode: 'b', days: 0, mark: 'same-day' },
        { fromCode: 'a', toCode: 'c', days: 3, mark: null }
    ]);
});

function loadUi(send) {
    const sandbox = { Promise, setTimeout, clearTimeout };
    sandbox.globalThis = sandbox;
    sandbox.DTUAfterDarkExamScheduleCore = core;
    sandbox.DTUAfterDarkExamScheduleDeps = { sendRuntimeMessage: send };
    loadDom(sandbox);
    vm.runInNewContext(readSource('darkmode.studyplan-exam-schedule.js'), sandbox);
    return sandbox.DTUAfterDarkExamSchedule;
}

test('opening the panel asks for the exam table again, button checks reuse it', async () => {
    let calls = 0;
    const ui = loadUi((msg, reply) => { calls++; reply({ ok: true, html: examHtml, fetchedAt: calls }); });
    await ui.loadExamTable(false);
    await ui.loadExamTable(false);
    assert.equal(calls, 1);
    const fresh = await ui.loadExamTable(true);
    assert.equal(calls, 2);
    assert.equal(fresh.fetchedAt, 2);
    assert.equal((await ui.loadExamTable(false)).fetchedAt, 2);
});

test('the panel carries the disclaimer word for word', () => {
    const ui = readSource('darkmode.studyplan-exam-schedule.js');
    assert.ok(ui.includes("These exam dates are read from DTU's exam table on "));
    assert.ok(ui.includes("They are not your official schedule: DTU can move an exam "));
    assert.ok(ui.includes("Do not rely on this list alone. "));
    assert.ok(ui.includes("Check every date on DTU's exam page and with your teacher. DTU After Dark is not made by DTU. "));
    assert.ok(ui.includes("'https://student.dtu.dk/en/exam/exam-dates'"));
    assert.ok(ui.includes("'dtuAfterDarkExamScheduleV1'"));
});

test('the schedule covers the current and next 13-week periods and the 3-week periods up to them', () => {
    const periods = ['13 weeks autumn 2026', '13 weeks spring 2027', '13 weeks autumn 2027', '13 weeks spring 2028', 'January 2027',
        'June/July/August 2027', 'January 2028', 'June/July/August 2028']
        .map((h) => core.parsePlannerPeriod(h));
    const keys = (today) => plain(core.selectSchedulePeriods(periods, sections, today));
    assert.deepEqual(keys('2026-11-07'), ['2026-autumn', '2027-january', '2027-spring', '2027-summer']);
    assert.deepEqual(keys('2027-02-01'), ['2027-spring', '2027-summer', '2027-autumn', '2028-january']);
    assert.deepEqual(keys('2027-08-25'), ['2027-autumn', '2028-january', '2028-spring', '2028-summer']);
    assert.deepEqual(keys('2026-11-07').filter((k) => /autumn|spring/.test(k)).length, 2);
    assert.deepEqual(plain(core.selectSchedulePeriods(periods, [], '2026-11-07')), []);
});

test('3-week periods find their exam section', () => {
    const jan = core.parsePlannerPeriod('January 2027');
    const sum = core.parsePlannerPeriod('June/July/August 2027');
    assert.match(core.findExamSection(sections, jan).title, /^Winter exam December 2026/);
    assert.equal(core.findExamSection(sections, sum, 6).kind, 'summer');
    assert.equal(core.findExamSection(sections, sum, 8).kind, 'august');
    assert.equal(core.findExamSection(sections, sum, 7), null);
    assert.equal(core.findExamSection(sections, sum), null);
    assert.equal(core.threeWeekMonth(' Juni '), 6);
    assert.equal(core.threeWeekMonth('E1A'), null);
});

test('3-week courses get the last day of their 3 weeks from DTU\'s table', () => {
    const jan = core.parsePlannerPeriod('January 2027');
    const sum = core.parsePlannerPeriod('June/July/August 2027');
    const f = (examText, assessmentText, extra) => Object.assign({ examText, assessmentText, durationText: '', name: 'Some course', volume: '2026-2027' }, extra || {});
    const lastDay = f('The last day of the 3-weeks teaching', 'Oral examination and experiments');
    const r = (code, fields, period, month) => plain(core.resolveThreeWeekExam(code, fields, sections, period, month));
    assert.equal(r('10851', lastDay, jan, 1).date, '2027-01-22');
    assert.equal(r('10851', lastDay, jan, 1).status, 'suggested');
    assert.equal(r('38404', f('The last day of the 3-weeks teaching', 'Written examination'), sum, 8).date, '2027-08-20');
    const june = r('34539', f('The last day of the 3-weeks teaching', 'Written examination'), sum, 6);
    assert.equal(june.date, '2027-06-24', 'the June row also lists re-exams of 02323 and 02402; the 3-week line is its own');
    assert.equal(r('34539', f('Decide with teacher', 'Oral examination'), sum, 6).status, 'teacher');
    assert.equal(r('34539', f('Decide with teacher', 'Evaluation of experiments and reports'), sum, 6).status, 'no-exam');
    assert.match(r('30000', lastDay, sum, 7).reason, /no exam day for July/);
    assert.match(r('30000', lastDay, sum, null).reason, /which 3-week period/);
    assert.equal(r('01037', f('Special day: see the timetable', 'Written examination'), sum, 8).date, '2027-08-20', 'named in the August row');
    assert.match(r('10851', f('The last day of the 3-weeks teaching', 'Oral', { volume: '2025-2026' }), jan, 1).reason, /describes 2025\/2026/);
    assert.match(r('10851', f('January', 'Oral examination'), jan, 1).reason, /does not give the exam day/);
    assert.equal(r('10851', null, jan, 1).status, 'unconfirmed');
});

test('the calendar export writes one all-day event per dated exam', () => {
    const ics = core.buildExamCalendar([
        { uid: '34034-2026-autumn@dtu-after-dark', date: '2026-12-07', summary: 'Exam 34034 Lasers, photonics; oral', description: 'Line one\nline two' },
        { uid: '34051-2027-spring@dtu-after-dark', date: '2027-05-13', endDate: '2027-05-14', summary: 'Exam 34051', description: '' },
        { uid: 'x@dtu-after-dark', date: '2026-12-31', summary: 'New year', description: '' },
        { uid: 'none@dtu-after-dark', date: null, summary: 'No date', description: '' }
    ], '20261110T120000Z');
    assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
    assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
    assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3);
    assert.ok(ics.includes('DTSTART;VALUE=DATE:20261207\r\nDTEND;VALUE=DATE:20261208\r\n'));
    assert.ok(ics.includes('DTSTART;VALUE=DATE:20270513\r\nDTEND;VALUE=DATE:20270515\r\n'));
    assert.ok(ics.includes('DTEND;VALUE=DATE:20270101\r\n'));
    assert.ok(ics.includes('SUMMARY:Exam 34034 Lasers\\, photonics\\; oral\r\n'));
    assert.ok(ics.includes('DESCRIPTION:Line one\\nline two\r\n'));
    assert.ok(!ics.includes('No date'));
});

test('calendar text escapes semicolons and commas, the UID too', () => {
    const ics = core.buildExamCalendar([{ uid: 'custom:A;B,2026-autumn@dtu-after-dark', date: '2026-12-07', summary: 'Exam 34034; oral', description: 'One; two' }], '20261110T120000Z');
    assert.ok(ics.includes('SUMMARY:Exam 34034\\; oral\r\n'), ics);
    assert.ok(ics.includes('DESCRIPTION:One\\; two\r\n'), ics);
    assert.ok(ics.includes('UID:custom:A\\;B\\,2026-autumn@dtu-after-dark\r\n'), ics);
});

test('calendar lines fold at 75 octets, counting Danish letters as two', () => {
    const ics = core.buildExamCalendar([{ uid: 'u', date: '2026-12-07', summary: 'Æ'.repeat(60), description: '' }], '20261110T120000Z');
    for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, line);
    assert.equal(ics.split('\r\n').filter((l) => l.startsWith('SUMMARY') || l.startsWith(' ')).join('').replace(/^SUMMARY:/, '').replace(/ /g, ''), 'Æ'.repeat(60));
});

test('a saved entry equal to DTU\'s date shows as DTU\'s date', () => {
    const resolved = { '34034': plain(core.resolveCourseExam('34034', fields('34034'), winterSection, autumn)) };
    const r = resolved['34034'];
    const same = { '34034': { format: r.format, date: r.date, endDate: null, basis: { date: r.date, evidence: r.evidence } } };
    assert.equal(plain(core.mergeStudentEntries(resolved, same))[0].status, 'suggested');
    const ranged = { '34034': { format: r.format, date: r.date, endDate: '2026-12-09', basis: { date: r.date, evidence: r.evidence } } };
    assert.equal(plain(core.mergeStudentEntries(resolved, ranged))[0].status, 'yours');
});

test('basket courses are placed in the next period of each season that has not started', () => {
    const shown = ['13 weeks autumn 2026', 'January 2027', '13 weeks spring 2027', 'June/July/August 2027'].map((h) => core.parsePlannerPeriod(h));
    const keys = (seasons, today) => plain(core.basketPeriods(seasons, shown, today)).map((p) => p.key);
    assert.deepEqual(keys(['F', 'E'], '2026-11-10'), ['2027-spring', '2027-autumn']);
    assert.deepEqual(keys(['J'], '2026-11-10'), ['2027-january']);
    assert.deepEqual(keys(['S', 'S'], '2026-11-10'), ['2027-summer']);
    assert.deepEqual(keys(['E'], '2026-05-01'), ['2026-autumn']);
    assert.deepEqual(keys(['X'], '2026-11-10'), []);
    assert.equal(core.periodLabel({ season: 'E', year: 2027 }), '13 weeks autumn 2027');
    assert.equal(core.periodLabel({ season: 'S', year: 2027 }), 'June/July/August 2027');
});

test('nearby exams: same day, one day apart, ranges count every day', () => {
    const planned = [
        { code: 'A', date: '2026-12-07' },
        { code: 'B', date: '2026-12-08' },
        { code: 'C', date: '2026-12-10', endDate: '2026-12-12' },
        { code: 'D', date: '2026-12-20' },
        { code: 'E', date: null }
    ];
    assert.deepEqual(plain(core.nearbyExams({ code: 'X', date: '2026-12-08' }, planned)), [{ code: 'B', days: 0 }, { code: 'A', days: 1 }]);
    assert.deepEqual(plain(core.nearbyExams({ code: 'X', date: '2026-12-13' }, planned)), [{ code: 'C', days: 1 }]);
    assert.deepEqual(plain(core.nearbyExams({ code: 'X', date: '2026-12-11' }, planned)), [{ code: 'C', days: 0 }]);
    assert.deepEqual(plain(core.nearbyExams({ code: 'B', date: '2026-12-08' }, planned)), [{ code: 'A', days: 1 }]);
    assert.deepEqual(plain(core.nearbyExams({ code: 'X', date: null }, planned)), []);
});

test('periods after the covered ones are listed for the student\'s own dates', () => {
    const periods = ['13 weeks autumn 2026', 'January 2027', '13 weeks spring 2027', 'June/July/August 2027', '13 weeks autumn 2027',
        'January 2028', '13 weeks spring 2028', '13 weeks autumn 2028']
        .map((h) => core.parsePlannerPeriod(h));
    const covered = plain(core.selectSchedulePeriods(periods, sections, '2026-11-07'));
    assert.deepEqual(plain(core.laterPlannerPeriods(periods, covered, '2026-11-07')),
        ['2027-autumn', '2028-january', '2028-spring', '2028-autumn']);
    // Nothing covered: only periods that have not started.
    assert.deepEqual(plain(core.laterPlannerPeriods(periods, [], '2027-03-01')),
        ['2027-summer', '2027-autumn', '2028-january', '2028-spring', '2028-autumn']);
});

test('a course assessed on reports with a day in the exam period reads as coursework, not an unread format', () => {
    const fields = {
        examText: 'August', name: 'Innovation in Engineering', volume: '2026-2027', durationText: '',
        assessmentText: 'Evaluation of exercises/reports The team presentation on the final day(exam day) is mandatory.'
    };
    const table = { rows: [{ text: '38404', date: '2027-08-20' }] };
    const out = core.resolveCourseExam('38404', fields, table, { key: '2027-spring', season: 'F', year: 2027 });
    assert.deepEqual(plain(out), { status: 'suggested', format: 'hand-in', date: '2027-08-20', range: false, evidence: 'named: 38404', reason: null });
    const oral = core.resolveCourseExam('38404', { ...fields, assessmentText: 'Oral examination and reports' }, table, { key: '2027-spring', season: 'F', year: 2027 });
    assert.equal(oral.format, 'oral');
});

test('a kurser course page gets one exam per period its catalogue year places it in', () => {
    const exams = (key, today = '2026-11-11') => plain(core.coursePageExams(key.slice(0, 5), core.parseCourseExamFields(pages[key]), sections, today))
        .map((e) => [e.label, e.result.status, e.result.date]);
    assert.deepEqual(exams('02110'), [['Autumn 2026', 'suggested', '2026-12-10']]);
    assert.deepEqual(exams('02110-da'), [['Autumn 2026', 'suggested', '2026-12-10']]);
    assert.deepEqual(exams('34034'), [['Autumn 2026', 'suggested', '2026-12-07'], ['Spring 2027', 'suggested', '2027-05-13']]);
    assert.deepEqual(exams('01001'), [['Autumn 2026', 'suggested', '2026-12-06']]);
    assert.deepEqual(exams('02105'), [['Spring 2027', 'suggested', '2027-05-20']]);
    // An exam section that is over is left out: the page shows next year's dates only once the catalogue moves on.
    assert.deepEqual(exams('02110', '2027-02-01'), []);
    // No page year (login stub, older layout): nothing to place.
    assert.deepEqual(plain(core.coursePageExams('34034', core.parseCourseExamFields(pages['34034-no-year']), sections, '2026-11-11')), []);
    assert.deepEqual(plain(core.coursePageExams('02110', null, sections, '2026-11-11')), []);
});

test('Danish schedule words and 3-week months place a course page', () => {
    const fields = (scheduleText, examText) => ({ examText, scheduleText, assessmentText: 'Skriftlig prøve', durationText: '', name: 'X', volume: '2026-2027' });
    const da = plain(core.coursePageExams('99999', fields('Efterår', 'Eksamen i E3A'), sections, '2026-11-11'));
    assert.deepEqual(da.map((e) => e.label), ['Autumn 2026']);
    const june = plain(core.coursePageExams('99999', fields('Juni', 'Sidste dag i 3-ugers perioden'), sections, '2026-11-11'));
    assert.deepEqual(june.map((e) => [e.label, e.result.status]), [['June 2027', 'suggested']]);
    const july = plain(core.coursePageExams('99999', fields('July', 'Last day of the 3-week period'), sections, '2026-11-11'));
    assert.deepEqual(july.map((e) => [e.label, e.result.status]), [['July 2027', 'unconfirmed']]);
    // Only the placement line counts: 01035's Schedule mentions its August twin course in prose.
    const prose = plain(core.coursePageExams('01035', fields('Autumn E2B (Thurs 8-12); In the August version (course 01037) the full curriculum is covered', 'Special day'), sections, '2026-11-11'));
    assert.deepEqual(prose.map((e) => e.label), ['Autumn 2026']);
});

test('outcome text is shared by the planner and the course page', () => {
    assert.equal(core.outcomeText({ status: 'suggested', evidence: 'E2-B', range: false }), 'slot E2-B in DTU\'s exam table');
    assert.equal(core.outcomeText({ status: 'suggested', evidence: 'named: 02002', range: true }), 'named in DTU\'s exam table. Oral exams may run over several days.');
    assert.equal(core.outcomeText({ status: 'unconfirmed', reason: 'listed on two dates' }), 'Not confirmed: listed on two dates');
    assert.equal(core.outcomeText({ status: 'no-exam' }), 'Assessed on coursework, per the course page');
});
