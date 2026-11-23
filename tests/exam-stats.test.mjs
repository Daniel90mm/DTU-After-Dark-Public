import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readSource, loadDom } from './_harness.mjs';
import { readExamPage, listedTerms, termsSince } from '../scripts/crawl-exam-stats.mjs';

function loadApi() {
    const sandbox = {};
    sandbox.globalThis = sandbox;
    loadDom(sandbox);
    vm.runInNewContext(readSource('darkmode.dom.js'), sandbox);
    vm.runInNewContext(readSource('darkmode.kurser-exam-stats.js'), sandbox);
    return sandbox.DTUAfterDarkKurserExamStats;
}

const api = loadApi();
const plain = (v) => JSON.parse(JSON.stringify(v));

// 01017 as read from karakterer.dtu.dk on 2026-11-11 (winter course, small summer re-exams).
const DISCRETE_MATH = {
    S26: [31, 30, 28, 4.4], W25: [229, 215, 160, 4.2], S25: [17, 16, 14, 5.6], W24: [203, 203, 152, 4.2],
    S24: [19, 19, 17, 3.8], W23: [211, 210, 157, 4.7], S23: [2, 2, null, null], W22: [319, 304, 290, 6.8]
};

test('the crawler reads the four numbers and the listed terms from a grade page', () => {
    const html = '<h2>Karakterfordeling</h2><div>02110 Algoritmer og datastrukturer 2, Vinter 2025</div>'
        + '<table><tr><td>Antal tilmeldte</td><td>168</td></tr><tr><td>Fremmødte</td><td>152</td></tr>'
        + '<tr><td>Antal bestået</td><td>114 (67 % af de tilmeldte)</td></tr><tr><td>Eksamensgennemsnit</td><td>5,2 (Efter 7-trinsskalaen)</td></tr></table>'
        + '<a href="/Histogram/1/02110/Summer-2026">s26</a><a href="/Histogram/1/02110/Summer-2025">s25</a>';
    assert.deepEqual(readExamPage(html, '02110'), [168, 152, 114, 5.2]);
    assert.deepEqual(listedTerms(html, '02110'), ['Summer-2026', 'Summer-2025']);
    const hidden = '<div>01005 Matematik 1, Vinter 2025</div> Antal tilmeldte 1 Fremmødte 1 Fordelingen vises ikke';
    assert.deepEqual(readExamPage(hidden, '01005'), [1, 1, null, null]);
    assert.equal(readExamPage('<p>File or directory not found.</p>', '02110'), null);
});

test('terms run newest first and leave out exams not held yet', () => {
    assert.deepEqual(termsSince(2025, new Date(2026, 10, 11)), ['Summer-2026', 'Winter-2025', 'Summer-2025']);
    assert.deepEqual(termsSince(2026, new Date(2026, 11, 20)), ['Winter-2026', 'Summer-2026']);
});

test('the grade widget asks karakterer only for terms the shipped data does not rule out', () => {
    const data = { courses: { '01017': DISCRETE_MATH, '10031': { S26: [58, 50, 50, 8.9], S24: [62, 51, 51, 8.7] } }, missing: ['02988'] };
    const nov2026 = new Date(2026, 10, 19);
    const feb2027 = new Date(2027, 1, 1);
    // Known course: terms newer than the data first, then its own terms. Before, 14 terms times 2 code spellings.
    // In November the December exam is not over, so Winter-2026 is not asked for until January.
    assert.deepEqual(plain(api.gradeStatsSemesters(data, '01017', nov2026)),
        ['Summer-2026', 'Winter-2025', 'Summer-2025', 'Winter-2024', 'Summer-2024', 'Winter-2023', 'Summer-2023', 'Winter-2022']);
    assert.deepEqual(plain(api.gradeStatsSemesters(data, '10031', nov2026)), ['Summer-2026', 'Summer-2024']);
    assert.deepEqual(plain(api.gradeStatsSemesters(data, '10031', feb2027)), ['Winter-2026', 'Summer-2026', 'Summer-2024']);
    // No results since the data's first year: only terms published after the data was built.
    assert.deepEqual(plain(api.gradeStatsSemesters(data, '02988', feb2027)), ['Winter-2026']);
    // Nothing newer yet: the newest term in the data, so the answer is still one request.
    assert.deepEqual(plain(api.gradeStatsSemesters(data, '02988', nov2026)), ['Summer-2026']);
    // Not in the data (a new course): null, so the widget keeps its full walk.
    assert.equal(api.gradeStatsSemesters(data, '99999', nov2026), null);
    assert.equal(api.gradeStatsSemesters(null, '01017', nov2026), null);
});

