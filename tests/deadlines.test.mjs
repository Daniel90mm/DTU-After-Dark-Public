import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this.style = {
            cssText: '',
            display: '',
            setProperty(name, value) { this[name] = value; }
        };
        this.textContent = '';
        this.title = '';
        this.className = '';
        this.attributes = {};
        this.attributeWrites = 0;
        this.parentNode = null;
        this.parentElement = null;
    }

    appendChild(child) {
        if (child.parentNode) {
            child.parentNode.children = child.parentNode.children.filter(item => item !== child);
        }
        this.children.push(child);
        child.parentNode = this;
        child.parentElement = this;
        return child;
    }

    insertBefore(child, before) {
        if (child.parentNode) {
            child.parentNode.children = child.parentNode.children.filter(item => item !== child);
        }
        const index = this.children.indexOf(before);
        this.children.splice(index < 0 ? this.children.length : index, 0, child);
        child.parentNode = this;
        child.parentElement = this;
        return child;
    }

    removeChild(child) {
        this.children = this.children.filter(item => item !== child);
        child.parentNode = null;
        child.parentElement = null;
        return child;
    }

    get firstChild() {
        return this.children[0] || null;
    }

    get nextSibling() {
        if (!this.parentElement) return null;
        const index = this.parentElement.children.indexOf(this);
        return index >= 0 ? (this.parentElement.children[index + 1] || null) : null;
    }

    setAttribute(name, value) {
        this.attributeWrites++;
        this.attributes[name] = String(value);
    }

    getAttribute(name) {
        return this.attributes[name] ?? null;
    }
}

function loadDeadlineUi({ dark = false, messages = null, storage = null, today = null, reply = null, clock = null } = {}) {
    const fileUrl = new URL('darkmode.deadlines.js', ROOT);
    let source = fs.readFileSync(fileUrl, 'utf8');
    source = source.replace(
        /\}\)\(\);\s*$/,
        `globalThis.__deadlineTestApi = {
            renderDeadlinesHomepageWidget,
            buildTopDeadlines,
            buildUpcomingDeadlineRows,
            createDeadlinesHomeRow,
            createDeadlinesTimeline,
            buildDeadlineTimelineAxis,
            selectDeadlineTimelineRows,
            parseDeadlinePeriodHeading,
            buildDeadlinePeriodGroups,
            layoutDeadlinePeriodMarks,
            formatDeadlinePeriodStatus,
            placeDeadlinesHomepageWidget,
            setDeadlinesWidgetExpandedState,
            formatDeadlineChip,
            getDeadlineState,
            scheduleDailyDeadlinesCheck
        };})();`
    );

    const document = {
        addEventListener() {},
        createElement(tagName) { return new FakeElement(tagName); }
    };
    const sandbox = {
        console,
        Date: clock ? class extends Date { static now() { return clock.now; } } : Date,
        document,
        globalThis: null,
        localStorage: storage || { getItem() { return null; }, setItem() {} },
        setInterval,
        clearInterval,
        setTimeout,
        clearTimeout,
        window: {
            addEventListener() {},
            location: { hostname: 'test.invalid' }
        }
    };
    sandbox.DTUAfterDarkDeadlinesDeps = {
        isDarkMode() { return dark; },
        isTopWindow() { return true; },
        sendRuntimeMessage(message, cb) { if (messages) messages.push(message); if (reply) cb(typeof reply === 'function' ? reply() : reply); }
    };
    if (today) sandbox.DTUAfterDarkDeadlinesDeps.startOfTodayUtcTs = () => today.value;
    sandbox.globalThis = sandbox;
    vm.runInNewContext(source, sandbox, { filename: fileUrl.pathname });
    return sandbox.__deadlineTestApi;
}

function loadBackgroundParser() {
    const fileUrl = new URL('background.js', ROOT);
    let source = fs.readFileSync(fileUrl, 'utf8');
    source = source.replace(
        /\}\)\(\);\s*$/,
        'globalThis.__deadlineParserTestApi = { parseStudentDeadlinesGroupsFromHtml };})();'
    );

    const storage = {
        get(key, callback) { callback({}); },
        remove() {},
        set() {}
    };
    const sandbox = {
        chrome: {
            runtime: { onMessage: { addListener() {} } },
            storage: { local: storage }
        },
        console,
        Date,
        fetch,
        globalThis: null,
        URL
    };
    sandbox.globalThis = sandbox;
    vm.runInNewContext(source, sandbox, { filename: fileUrl.pathname });
    return sandbox.__deadlineParserTestApi;
}

function utc(date) {
    return Date.parse(date + 'T00:00:00Z');
}

function deadlineItem({ label, start, end = null }) {
    return {
        label,
        startIso: start,
        startTs: utc(start),
        endIso: end,
        endTs: end ? utc(end) : null
    };
}

function responseWith({ course = [], exam = [] }) {
    return {
        course: { groups: course, url: 'https://student.dtu.dk/course' },
        exam: { groups: exam, url: 'https://student.dtu.dk/exam' }
    };
}

function flattenText(element) {
    return [element.textContent, ...element.children.flatMap(flattenText)].filter(Boolean);
}

function findElementByText(element, text) {
    if (element.textContent === text) return element;
    for (const child of element.children) {
        const found = findElementByText(child, text);
        if (found) return found;
    }
    return null;
}

function contrastRatio(foregroundHex, backgroundHex) {
    function luminance(hex) {
        const channels = hex.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16) / 255);
        const linear = channels.map(value => value <= 0.04045
            ? value / 12.92
            : Math.pow((value + 0.055) / 1.055, 2.4));
        return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
    }
    const lighter = Math.max(luminance(foregroundHex), luminance(backgroundHex));
    const darker = Math.min(luminance(foregroundHex), luminance(backgroundHex));
    return (lighter + 0.05) / (darker + 0.05);
}

test('folding the deadlines widget compacts its shell and restores expanded spacing', () => {
    const api = loadDeadlineUi();
    const header = new FakeElement('div');
    const headerWrap = new FakeElement('div');
    const title = new FakeElement('h2');
    const chevron = new FakeElement('d2l-button-icon');
    const content = new FakeElement('div');
    const elements = new Map([
        ['.d2l-widget-header', header],
        ['.d2l-homepage-header-wrapper', headerWrap],
        ['#dtu-deadlines-home-title', title],
        ['[data-dtu-deadlines-chevron]', chevron],
        ['[data-dtu-deadlines-content]', content]
    ]);
    const widget = new FakeElement('section');
    widget.querySelector = selector => elements.get(selector) || null;

    api.setDeadlinesWidgetExpandedState(widget, false);

    assert.equal(widget.getAttribute('data-dtu-deadlines-expanded'), 'false');
    assert.equal(widget.style.paddingTop, '10px');
    assert.equal(widget.style.paddingBottom, '10px');
    assert.equal(content.style.display, 'none');
    assert.equal(header.style.padding, '2px 7px');
    assert.equal(headerWrap.style.justifyContent, 'flex-start');
    assert.equal(headerWrap.style.gap, '8px');
    assert.equal(headerWrap.style.minHeight, '');
    assert.equal(headerWrap.style.height, '');
    assert.equal(title.style.flex, '0 1 auto');
    assert.equal(title.style.minWidth, '0px');
    assert.equal(title.style.lineHeight, '');
    assert.equal(chevron.style.height, '');

    api.setDeadlinesWidgetExpandedState(widget, true);

    assert.equal(widget.getAttribute('data-dtu-deadlines-expanded'), 'true');
    assert.equal(widget.style.paddingTop, '10px');
    assert.equal(widget.style.paddingBottom, '');
    assert.equal(content.style.display, '');
    assert.equal(header.style.padding, '2px 7px');
    assert.equal(headerWrap.style.justifyContent, 'flex-start');
    assert.equal(headerWrap.style.gap, '8px');
    assert.equal(headerWrap.style.minHeight, '');
    assert.equal(headerWrap.style.height, '');
    assert.equal(title.style.flex, '0 1 auto');
    assert.equal(title.style.minWidth, '0px');
    assert.equal(title.style.lineHeight, '');
    assert.equal(chevron.style.height, '');
});

test('a clipped active deadline range does not mask its tooltip', () => {
    const api = loadDeadlineUi();
    const rows = api.buildTopDeadlines(responseWith({
        course: [{
            heading: 'Fall 2026',
            items: [deadlineItem({ label: 'Supplementary registration period', start: '2026-06-01', end: '2026-10-01' })]
        }]
    }), utc('2026-09-02'), 3);
    const timeline = api.createDeadlinesTimeline(rows, utc('2026-09-02'));
    const registrationBar = (function findByClass(element) {
        if (/\bdtu-deadline-timeline-bar\b/.test(element.className)) return element;
        for (const child of element.children) {
            const match = findByClass(child);
            if (match) return match;
        }
        return null;
    })(timeline);

    assert.match(registrationBar.className, /\bis-clipped-start\b/);
    assert.equal(registrationBar.style.maskImage, 'none');
    assert.equal(registrationBar.style.webkitMaskImage, 'none');
});

test('deadlines are checked again once the held copy is a day old', () => {
    const messages = [];
    const api = loadDeadlineUi({ messages });
    const today = utc('2026-09-30');
    const course = [{ heading: 'Fall 2029', items: [deadlineItem({ label: 'Registration period', start: '2029-07-08', end: '2029-08-05' })] }];
    const fresh = Object.assign(responseWith({ course }), { ok: true, fetchedAt: Date.now() - 2 * 3600000 });
    api.scheduleDailyDeadlinesCheck({}, fresh, today);
    assert.equal(messages.length, 0, 'a copy fetched 2 hours ago is kept');

    const dayOld = Object.assign(responseWith({ course }), { ok: true, fetchedAt: Date.now() - 25 * 3600000 });
    api.scheduleDailyDeadlinesCheck({}, dayOld, today);
    assert.equal(messages.length, 1, 'a copy older than a day is refetched');
    assert.equal(messages[0].type, 'dtu-student-deadlines');
    assert.equal(messages[0].forceRefresh, false);
});

test('the deadlines widget has no manual refresh button', () => {
    const source = fs.readFileSync(new URL('darkmode.deadlines.js', ROOT), 'utf8');
    assert.doesNotMatch(source, /data-dtu-deadlines-refresh/);
});

function colorFromStyle(element) {
    return element.style.cssText.match(/color:\s*(#[0-9a-f]{6})/i)?.[1] || '';
}

test('future registration windows say when they open and name the actual closing deadline', () => {
    const api = loadDeadlineUi();
    const item = deadlineItem({
        label: 'Registration period',
        start: '2026-10-15',
        end: '2026-11-01'
    });
    const [row] = api.buildUpcomingDeadlineRows([
        { heading: 'Ordinary winter exam 2026: 6 December &amp;ndash; 22 December', items: [item] }
    ], utc('2026-08-27'), 8);

    const chip = api.formatDeadlineChip(row, utc('2026-08-27'));
    const cardText = flattenText(api.createDeadlinesHomeRow({ ...row, kind: 'exam' }, utc('2026-08-27')));

    assert.equal(chip.text, 'Opens in 49d');
    assert.ok(cardText.includes('Registration opens 15 Oct; deadline 1 Nov.'));
    assert.ok(cardText.includes('Ordinary winter exam 2026: 6 December – 22 December'));
});

test('an active registration window counts down to and names its closing deadline', () => {
    const api = loadDeadlineUi();
    const item = deadlineItem({
        label: 'Registration period',
        start: '2026-10-15',
        end: '2026-11-01'
    });

    const activeRows = api.buildUpcomingDeadlineRows([
        { heading: 'Ordinary winter exam 2026', items: [item] }
    ], utc('2026-10-15'), 8);
    assert.equal(api.formatDeadlineChip(activeRows[0], utc('2026-10-15')).text, '17d left');
    const activeCardText = flattenText(api.createDeadlinesHomeRow(
        { ...activeRows[0], kind: 'exam' },
        utc('2026-10-15')
    ));
    assert.ok(activeCardText.includes('Registration deadline: 1 Nov.'));

    const finalDayRows = api.buildUpcomingDeadlineRows([
        { heading: 'Ordinary winter exam 2026', items: [item] }
    ], utc('2026-11-01'), 8);
    assert.equal(api.formatDeadlineChip(finalDayRows[0], utc('2026-11-01')).text, 'Ends today');

    const pastRows = api.buildUpcomingDeadlineRows([
        { heading: 'Ordinary winter exam 2026', items: [item] }
    ], utc('2026-11-02'), 8);
    assert.equal(pastRows.length, 0);
});

test('the row limit includes every deadline tied at the cutoff', () => {
    const api = loadDeadlineUi();
    const resp = responseWith({
        course: [{
            heading: 'Fall 2026',
            items: [
                deadlineItem({ label: 'Supplementary registration period', start: '2026-08-23', end: '2026-10-01' }),
                deadlineItem({ label: 'Deadline for withdrawal from courses', start: '2026-10-01' }),
                deadlineItem({ label: 'January registration', start: '2026-11-15', end: '2026-12-01' })
            ]
        }],
        exam: [{
            heading: 'Ordinary winter exam 2026',
            items: [
                deadlineItem({ label: 'Registration period', start: '2026-10-15', end: '2026-11-01' }),
                deadlineItem({ label: 'Period for withdrawal from exams', start: '2026-10-15', end: '2026-11-15' })
            ]
        }]
    });

    const rows = api.buildTopDeadlines(resp, utc('2026-08-27'), 3);

    assert.equal(rows.length, 4);
    assert.deepEqual(Array.from(rows, row => String(row.label)), [
        'Supplementary registration period',
        'Deadline for withdrawal from courses',
        'Registration period',
        'Period for withdrawal from exams'
    ]);
    assert.equal(rows[0].state, 'active');
    assert.equal(rows[0].nextTs, utc('2026-10-01'));
    assert.equal(api.formatDeadlineChip(rows[0], utc('2026-08-27')).text, '35d left');
    assert.ok(flattenText(api.createDeadlinesHomeRow(rows[0], utc('2026-08-27')))
        .includes('Supplementary registration deadline: 1 Oct.'));
    assert.equal(rows[1].nextTs, utc('2026-10-01'));
    assert.equal(api.formatDeadlineChip(rows[1], utc('2026-08-27')).text, 'Due in 35d');
    assert.ok(flattenText(api.createDeadlinesHomeRow(rows[1], utc('2026-08-27')))
        .includes('Withdrawal deadline: 1 Oct.'));
    assert.equal(api.formatDeadlineChip(rows[2], utc('2026-08-27')).text, 'Opens in 49d');
    assert.equal(api.formatDeadlineChip(rows[3], utc('2026-08-27')).text, 'Opens in 49d');
});

test('a merged deadline renders every DTU period that shares it', () => {
    const api = loadDeadlineUi();
    const sharedItem = deadlineItem({
        label: 'Registration period',
        start: '2027-05-01',
        end: '2027-05-15'
    });
    const resp = responseWith({
        course: [
            { heading: 'June 2027: 4 June - 24 June', items: [sharedItem] },
            { heading: 'July 2027: 5 July - 23 July', items: [sharedItem] }
        ]
    });

    const [row] = api.buildTopDeadlines(resp, utc('2027-04-01'), 3);
    const cardText = flattenText(api.createDeadlinesHomeRow(row, utc('2027-04-01')));

    assert.ok(cardText.includes('June 2027: 4 June - 24 June'));
    assert.ok(cardText.includes('July 2027: 5 July - 23 July'));
});

test('deadline dates, explanations, and period context meet text contrast in both modes', () => {
    const item = deadlineItem({
        label: 'Registration period',
        start: '2026-10-15',
        end: '2026-11-01'
    });

    for (const mode of [
        { dark: true, background: '#2d2d2d' },
        { dark: false, background: '#ffffff' }
    ]) {
        const api = loadDeadlineUi({ dark: mode.dark });
        const [row] = api.buildUpcomingDeadlineRows([
            { heading: 'Ordinary winter exam 2026', items: [item] }
        ], utc('2026-08-27'), 8);
        const card = api.createDeadlinesHomeRow({ ...row, kind: 'exam' }, utc('2026-08-27'));

        for (const text of [
            '15 Oct - 1 Nov 2026',
            'Registration opens 15 Oct; deadline 1 Nov.',
            'Ordinary winter exam 2026'
        ]) {
            const element = findElementByText(card, text);
            assert.ok(element, `expected metadata element: ${text}`);
            assert.ok(
                contrastRatio(colorFromStyle(element), mode.background) >= 4.5,
                `${text} should meet 4.5:1 contrast in ${mode.dark ? 'dark' : 'light'} mode`
            );
        }
    }
});

test('DTU period headings decode the nested en dash used by the live exam response', () => {
    const api = loadBackgroundParser();
    const html = `
        <h2>Ordinary winter exam 2026: 6 December &amp;amp;ndash; 22 December</h2>
        <ul><li>Registration period:: 15/10 2026 &amp;amp;ndash; 1/11 2026</li></ul>
    `;

    const groups = api.parseStudentDeadlinesGroupsFromHtml(html);

    assert.equal(groups[0].heading, 'Ordinary winter exam 2026: 6 December – 22 December');
    assert.equal(groups[0].items[0].startIso, '2026-10-15');
    assert.equal(groups[0].items[0].endIso, '2026-11-01');
});

test('the homepage widget shares the full-width Student Information column', () => {
    const api = loadDeadlineUi();
    const oldSidebar = new FakeElement('aside');
    const fullWidthColumn = new FakeElement('main');
    const studentInformation = new FakeElement('section');
    const followingWidget = new FakeElement('section');
    const widget = new FakeElement('section');

    oldSidebar.appendChild(widget);
    fullWidthColumn.appendChild(studentInformation);
    fullWidthColumn.appendChild(followingWidget);

    api.placeDeadlinesHomepageWidget(widget, fullWidthColumn, studentInformation);
    api.placeDeadlinesHomepageWidget(widget, fullWidthColumn, studentInformation);

    assert.deepEqual(fullWidthColumn.children, [studentInformation, widget, followingWidget]);
    assert.equal(widget.parentElement, fullWidthColumn);
    assert.equal(oldSidebar.children.length, 0);
});

// Removing the render guard would replace the focused timeline and rewrite its
// controls on every unrelated page mutation. Count actual writes and node identity.
function renderFixture(response, options = {}) {
    const stored = new Map(response ? [['dtuDarkModeDeadlinesCacheV2', JSON.stringify(response)]] : []);
    const storage = { getItem: k => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v) };
    const widget = new FakeElement('section');
    const parts = new Map(['summary', 'next', 'more', 'footer', 'meta', 'chevron', 'sources', 'content'].map(k =>
        ['[data-dtu-deadlines-' + k + ']', new FakeElement(k === 'chevron' ? 'd2l-button-icon' : 'div')]));
    widget.querySelector = k => parts.get(k) || null;
    parts.get('[data-dtu-deadlines-sources]').querySelectorAll = () => [];
    const api = loadDeadlineUi({ ...options, storage });
    return { api, widget, storage, next: parts.get('[data-dtu-deadlines-next]'),
        meta: parts.get('[data-dtu-deadlines-meta]'), chevron: parts.get('[data-dtu-deadlines-chevron]') };
}
function goodRenderResponse() {
    const groups = [{ heading: 'Fall 2026', items: [deadlineItem({ label: 'Registration period', start: '2026-08-23', end: '2026-10-01' }), deadlineItem({ label: 'Registration period', start: '2029-07-08', end: '2029-08-05' })] }];
    const response = responseWith({ course: groups, exam: groups });
    response.course.ok = response.exam.ok = true;
    return { ...response, ok: true, fetchedAt: Date.now() };
}
test('idle renders preserve timeline nodes and do not rewrite controls', () => {
    const f = renderFixture(goodRenderResponse(), { today: { value: utc('2026-09-30') } });
    f.api.renderDeadlinesHomepageWidget(f.widget);
    const timeline = f.next.firstChild;
    f.widget.attributeWrites = f.chevron.attributeWrites = 0;
    for (let i = 0; i < 10; i++) f.api.renderDeadlinesHomepageWidget(f.widget);
    assert.equal(f.next.firstChild, timeline, 'the same timeline retains keyboard focus');
    assert.equal(f.chevron.attributeWrites + f.widget.attributeWrites, 0);
});
test('render cache still handles collapsing and the next calendar day', () => {
    const today = { value: utc('2026-09-30') };
    const f = renderFixture(goodRenderResponse(), { today });
    f.api.renderDeadlinesHomepageWidget(f.widget);
    f.storage.setItem('dtuDarkModeDeadlinesExpanded', 'false');
    f.api.renderDeadlinesHomepageWidget(f.widget);
    assert.equal(f.widget.getAttribute('data-dtu-deadlines-expanded'), 'false');
    assert.equal(f.chevron.getAttribute('aria-expanded'), 'false');
    const old = f.next.firstChild;
    today.value = utc('2026-10-01');
    f.api.renderDeadlinesHomepageWidget(f.widget);
    assert.notEqual(f.next.firstChild, old);
    assert.ok(flattenText(f.next).join(' ').includes('1 Oct'));
});
test('failed initial fetch is throttled across repeated observer renders', () => {
    const messages = [];
    const clock = { now: Date.now() };
    const f = renderFixture(null, { messages, reply: { ok: false }, clock });
    f.api.renderDeadlinesHomepageWidget(f.widget);
    const loading = f.next.firstChild;
    for (let i = 0; i < 100; i++) {
        clock.now += 2000;
        f.api.renderDeadlinesHomepageWidget(f.widget);
    }
    assert.equal(f.next.firstChild, loading, 'failure must not replace loading content on each tick');
    assert.match(loading.textContent, /unavailable/i);
    assert.equal(messages.length, 1);
    clock.now += 600000;
    f.api.renderDeadlinesHomepageWidget(f.widget);
    assert.equal(messages.length, 2, 'retry resumes after the backoff');
});
test('a completely missing source is named alongside the usable timeline', () => {
    const response = goodRenderResponse();
    delete response.exam;
    const f = renderFixture(response, { today: { value: utc('2026-09-30') } });
    f.api.renderDeadlinesHomepageWidget(f.widget);
    assert.match(f.meta.textContent, /Exam deadlines missing/);
});

test('unchanged renders still refresh a stale snapshot and preserve it after failure', () => {
    const response = goodRenderResponse();
    const clock = { now: response.fetchedAt };
    const messages = [];
    let reply = { ok: false };
    const f = renderFixture(response, { clock, messages, reply: () => reply, today: { value: utc('2026-09-30') } });
    f.api.renderDeadlinesHomepageWidget(f.widget);
    assert.equal(messages.length, 0);
    clock.now += 25 * 3600000;
    f.api.renderDeadlinesHomepageWidget(f.widget);
    assert.equal(messages.length, 1);
    assert.match(f.meta.textContent, /Refresh failed/);
    assert.ok(flattenText(f.next).join(' ').includes('1 Oct'));
    reply = { ...goodRenderResponse(), fetchedAt: clock.now + 600000 };
    clock.now += 600000;
    f.api.renderDeadlinesHomepageWidget(f.widget);
    assert.equal(messages.length, 2);
    assert.equal(f.meta.style.display, 'none');
});
test('missing-source status remains visible when the selected period has no dates', () => {
    const response = goodRenderResponse();
    delete response.exam;
    response.course.groups = [{ heading: 'Fall 2029', items: [deadlineItem({ label: 'Registration period', start: '2029-07-08', end: '2029-08-05' })] }];
    const f = renderFixture(response, { today: { value: utc('2026-09-30') } });
    f.api.renderDeadlinesHomepageWidget(f.widget);
    assert.match(f.meta.textContent, /Exam deadlines missing/);
    assert.match(flattenText(f.next).join(' '), /No course or exam deadlines up to 1 Mar 2027/);
});

// DTU's published dates as they stood on 30 Sep 2026.
const TODAY_SEP_30 = utc('2026-09-30');
function dtuFallResponse() {
    return responseWith({
        course: [
            { heading: 'Fall 2026 (13-weeks period): 31 August - 4 December', items: [
                deadlineItem({ label: 'Registration period', start: '2026-07-08', end: '2026-08-05' }),
                deadlineItem({ label: 'Supplementary registration period', start: '2026-08-23', end: '2026-10-01' }),
                deadlineItem({ label: 'Deadline for withdrawal from courses', start: '2026-10-01' })
            ] },
            { heading: 'January 2027 (3-weeks period): 4 January - 22 January', items: [
                deadlineItem({ label: 'Registration period', start: '2026-11-15', end: '2026-12-01' }),
                deadlineItem({ label: 'Supplementary registration period', start: '2026-12-13', end: '2027-01-05' }),
                deadlineItem({ label: 'Deadline for withdrawal from courses', start: '2027-01-08' })
            ] },
            { heading: 'Spring 2027 (13-weeks period): 1 February - 12 May', items: [
                deadlineItem({ label: 'Registration period', start: '2026-12-05', end: '2027-01-05' }),
                deadlineItem({ label: 'Supplementary registration period', start: '2027-01-20', end: '2027-03-01' }),
                deadlineItem({ label: 'Deadline for withdrawal from courses', start: '2027-03-01' })
            ] },
            { heading: 'June 2027 (3-weeks period): 4 June - 24 June', items: [
                deadlineItem({ label: 'Registration period', start: '2027-05-01', end: '2027-05-15' })
            ] }
        ],
        exam: [
            { heading: 'Ordinary winter exam 2026: 6 December &amp;ndash; 22 December', items: [
                deadlineItem({ label: 'Registration period', start: '2026-10-15', end: '2026-11-01' }),
                deadlineItem({ label: 'Period for withdrawal from exams', start: '2026-10-15', end: '2026-11-15' })
            ] },
            { heading: 'Ordinary summer exam and reexam 2027: 13 May - 2 June', items: [
                deadlineItem({ label: 'Registration period', start: '2027-04-01', end: '2027-04-15' })
            ] }
        ]
    });
}
function fallGroups(api) {
    const rows = api.selectDeadlineTimelineRows(api.buildTopDeadlines(dtuFallResponse(), TODAY_SEP_30, Infinity), TODAY_SEP_30);
    return { rows, groups: api.buildDeadlinePeriodGroups(rows) };
}
function findAll(element, pattern) {
    const own = pattern.test(element.className || '') ? [element] : [];
    return own.concat(element.children.flatMap(child => findAll(child, pattern)));
}

test('the timeline axis spans six months from the current one and names the year where it turns', () => {
    const api = loadDeadlineUi();
    const axis = api.buildDeadlineTimelineAxis(TODAY_SEP_30);
    assert.equal(axis.startTs, utc('2026-09-01'));
    assert.equal(axis.endTs, utc('2027-03-01'));
    assert.deepEqual(Array.from(axis.ticks, tick => tick.label), ['Sep', 'Oct', 'Nov', 'Dec', 'Jan 2027', 'Feb']);
    assert.equal(axis.ticks[0].percent, 0);
    assert.ok(axis.todayPercent > 15 && axis.todayPercent < 17);
});

test('a DTU period heading gives the row name and when the period runs', () => {
    const api = loadDeadlineUi();
    const fall = api.parseDeadlinePeriodHeading('Fall 2026 (13-weeks period): 31 August - 4 December');
    assert.deepEqual({ ...fall }, { name: 'Fall 2026', startTs: utc('2026-08-31'), endTs: utc('2026-12-04') });
    const winter = api.parseDeadlinePeriodHeading('Ordinary winter exam 2026: 6 December &amp;ndash; 22 December');
    assert.deepEqual({ ...winter }, { name: 'Winter exam 2026', startTs: utc('2026-12-06'), endTs: utc('2026-12-22') });
    const bare = api.parseDeadlinePeriodHeading('Fall 2026');
    assert.deepEqual({ ...bare }, { name: 'Fall 2026', startTs: null, endTs: null });
});

test('deadlines are grouped into one row per period in the order the periods run', () => {
    const api = loadDeadlineUi();
    const { rows, groups } = fallGroups(api);
    assert.deepEqual(Array.from(groups, group => group.name), ['Fall 2026', 'Winter exam 2026', 'January 2027', 'Spring 2027']);
    assert.equal(rows.length, 10, 'past windows and dates after 1 Mar 2027 are left out');
    assert.deepEqual(Array.from(groups[2].rows, row => String(row.label)), [
        'Registration period', 'Supplementary registration period', 'Deadline for withdrawal from courses'
    ]);
});

test('each period row says what happens next and highlights only what is open or close', () => {
    const api = loadDeadlineUi();
    const { groups } = fallGroups(api);
    const statuses = Array.from(groups, group => ({ ...api.formatDeadlinePeriodStatus(group.nextRow, TODAY_SEP_30) }));
    assert.deepEqual(statuses, [
        { text: 'Closes tomorrow', date: '1 Oct', urgent: true },
        { text: 'Opens in 15 days', date: '15 Oct', urgent: false },
        { text: 'Opens in 46 days', date: '15 Nov', urgent: false },
        { text: 'Opens in 66 days', date: '5 Dec', urgent: false }
    ]);
    const januaryWithdrawal = groups[2].rows[2];
    assert.deepEqual({ ...api.formatDeadlinePeriodStatus(januaryWithdrawal, TODAY_SEP_30) },
        { text: 'Due in 100 days', date: '8 Jan 2027', urgent: false });
});

test('overlapping windows stack on two lanes and a same-day date lines up with a window end', () => {
    const api = loadDeadlineUi();
    const { groups } = fallGroups(api);
    const axis = api.buildDeadlineTimelineAxis(TODAY_SEP_30);
    const winter = api.layoutDeadlinePeriodMarks(groups[1], axis);
    assert.deepEqual(Array.from(winter, mark => [mark.label, mark.lane, mark.showLabel]), [
        ['Registration', 0, true],
        ['Withdrawal', 1, true]
    ]);
    const [supplementary, withdrawal] = api.layoutDeadlinePeriodMarks(groups[0], axis);
    assert.equal(supplementary.continuesBefore, true);
    assert.equal(withdrawal.type, 'date');
    assert.equal(withdrawal.label, 'Withdrawal 1 Oct');
    assert.equal(withdrawal.startPercent, supplementary.endPercent);
});

test('a label that would collide is dropped while its mark keeps the tooltip', () => {
    const api = loadDeadlineUi();
    const rows = ['2026-11-02', '2026-11-03'].map(day => ({
        kind: 'course', label: 'Deadline for withdrawal from courses', period: 'Fall 2026',
        startIso: day, startTs: utc(day), endIso: null, endTs: null, nextTs: utc(day), state: 'upcoming'
    }));
    const axis = api.buildDeadlineTimelineAxis(TODAY_SEP_30);
    const marks = api.layoutDeadlinePeriodMarks(api.buildDeadlinePeriodGroups(rows)[0], axis);
    assert.deepEqual(Array.from(marks, mark => mark.showLabel), [true, false]);
    const timeline = api.createDeadlinesTimeline(rows, TODAY_SEP_30);
    const dates = findAll(timeline, /\bdtu-deadline-timeline-date-mark\b/);
    assert.equal(dates.length, 2);
    assert.ok(dates.every(mark => /Deadline for withdrawal from courses/.test(mark.getAttribute('aria-label'))));
    assert.equal(findAll(timeline, /\bdtu-deadline-mark-label\b/).length, 1);
});

test('a window running past the six months fades out at the right edge', () => {
    const api = loadDeadlineUi();
    const rows = api.buildTopDeadlines(responseWith({
        course: [{ heading: 'Spring 2027', items: [deadlineItem({ label: 'Supplementary registration period', start: '2027-01-20', end: '2027-03-10' })] }]
    }), TODAY_SEP_30, 3);
    const [bar] = findAll(api.createDeadlinesTimeline(rows, TODAY_SEP_30), /\bdtu-deadline-timeline-bar\b/);
    assert.match(bar.className, /\bis-clipped-end\b/);
    assert.match(bar.className, /\bis-soft\b/);
    assert.doesNotMatch(bar.className, /\bis-clipped-start\b/);
});

test('dates after the six months are absent from the rendered and accessible timeline', () => {
    const api = loadDeadlineUi();
    const rows = ['2027-03-01', '2027-03-02'].map((day, index) => ({
        kind: 'course', label: index ? 'Hidden deadline' : 'Visible deadline', period: 'Spring 2027',
        startTs: utc(day), endTs: null, nextTs: utc(day), state: 'upcoming'
    }));
    const timeline = api.createDeadlinesTimeline(rows, TODAY_SEP_30);
    const text = flattenText(timeline).join(' ');
    assert.match(text, /Visible deadline/);
    assert.doesNotMatch(text, /Hidden deadline/);
    assert.equal(timeline.children.find(element => element.className === 'dtu-deadline-a11y-list').children.length, 1);
});

test('the timeline renders labelled period rows with no legend, and a text list for narrow widths', () => {
    const api = loadDeadlineUi({ dark: true });
    const { rows } = fallGroups(api);
    const timeline = api.createDeadlinesTimeline(rows, TODAY_SEP_30);
    const text = flattenText(timeline);
    for (const expected of ['Fall 2026', 'Teaching 31 Aug to 4 Dec', 'Winter exam 2026', 'Exam period 6 to 22 Dec',
        'Today', 'Jan 2027', 'Supplementary', 'Withdrawal 1 Oct', 'Closes tomorrow', 'Shaded: teaching or exam period']) {
        assert.ok(text.includes(expected), 'expected ' + expected);
    }
    for (const gone of ['Open now', 'Upcoming', 'Single date', 'Academic periods']) {
        assert.ok(!text.includes(gone), 'legend text should be gone: ' + gone);
    }
    assert.equal(timeline.getAttribute('data-theme'), 'dark');
    assert.equal(findAll(timeline, /^dtu-deadline-period$/).length, 4);
    const activeBar = findAll(timeline, /\bdtu-deadline-timeline-bar\b/)[0];
    assert.match(activeBar.className, /\bis-active\b/);
    assert.match(activeBar.className, /\bis-clipped-start\b/);
    assert.equal(activeBar.style.maskImage, 'none');
    assert.match(findAll(timeline, /\bdtu-deadline-timeline-status-text\b/)[0].className, /\bis-accent\b/);

    const mobile = timeline.children.find(element => element.className === 'dtu-deadline-mobile-list');
    assert.equal(mobile.children.length, 4);
    assert.ok(flattenText(mobile.children[2]).includes('Registration 15 Nov to 1 Dec, Supplementary 13 Dec to 5 Jan, Withdrawal 8 Jan'));
    assert.equal(timeline.children.find(element => element.className === 'dtu-deadline-a11y-list').children.length, rows.length);
});

test('a timeline mark names the deadline, the explainer, its period and dates', () => {
    const api = loadDeadlineUi();
    const rows = api.buildTopDeadlines(responseWith({
        course: [{ heading: 'Fall 2026', items: [deadlineItem({ label: 'Supplementary registration period', start: '2026-08-23', end: '2026-10-01' })] }]
    }), utc('2026-08-27'), 3);
    const [bar] = findAll(api.createDeadlinesTimeline(rows, utc('2026-08-27')), /\bdtu-deadline-timeline-bar\b/);
    assert.equal(bar.getAttribute('aria-label'),
        'Supplementary registration period. It will be possible to register for courses with vacant seats. Fall 2026. 23 Aug - 1 Oct 2026.');
    const tooltip = bar.children.find(child => child.className === 'dtu-deadline-mark-tooltip');
    assert.deepEqual(Array.from(tooltip.children, child => [child.className, child.textContent]), [
        ['dtu-deadline-mark-tooltip-title', 'Supplementary registration period'],
        ['dtu-deadline-mark-tooltip-description', 'It will be possible to register for courses with vacant seats.'],
        ['dtu-deadline-mark-tooltip-period', 'Fall 2026'],
        ['dtu-deadline-mark-tooltip-date', '23 Aug - 1 Oct 2026']
    ]);
});

test('timeline marks use the contrast-checked accent in both modes, not a fixed grey', () => {
    const source = fs.readFileSync(new URL('darkmode.deadlines.js', ROOT), 'utf8');
    const rules = source.match(/'\.dtu-deadline-timeline(?:\[data-theme="dark"\])?\{--deadline-accent:[^;]+;/g);
    assert.equal(rules.length, 2);
    assert.ok(rules[0].includes('--deadline-accent:var(--dtu-ad-accent-mark-light,'), rules[0]);
    assert.ok(rules[1].includes('--deadline-accent:var(--dtu-ad-accent-mark-dark,'), rules[1]);
    assert.doesNotMatch(source, /--deadline-bar(?:-soft)?:/);
    assert.match(source, /'\.dtu-deadline-timeline-bar\{[^']*background:var\(--deadline-accent\)/);
    assert.match(source, /'\.dtu-deadline-timeline-date-mark\{[^']*background:var\(--deadline-accent\)/);
});
