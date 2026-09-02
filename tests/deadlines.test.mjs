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

    get firstChild() {
        return this.children[0] || null;
    }

    get nextSibling() {
        if (!this.parentElement) return null;
        const index = this.parentElement.children.indexOf(this);
        return index >= 0 ? (this.parentElement.children[index + 1] || null) : null;
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }

    getAttribute(name) {
        return this.attributes[name] ?? null;
    }
}

function loadDeadlineUi({ dark = false } = {}) {
    const fileUrl = new URL('darkmode.deadlines.js', ROOT);
    let source = fs.readFileSync(fileUrl, 'utf8');
    source = source.replace(
        /\}\)\(\);\s*$/,
        `globalThis.__deadlineTestApi = {
            buildTopDeadlines,
            buildUpcomingDeadlineRows,
            createDeadlinesHomeRow,
            createDeadlinesTimeline,
            buildDeadlineTimelineModel,
            buildDeadlineTimelinePhaseWindow: typeof buildDeadlineTimelinePhaseWindow === 'function' ? buildDeadlineTimelinePhaseWindow : undefined,
            selectDeadlineTimelinePhaseWindow: typeof selectDeadlineTimelinePhaseWindow === 'function' ? selectDeadlineTimelinePhaseWindow : undefined,
            buildDeadlineTimelineLanes,
            layoutDeadlineTimelineLaneItems: typeof layoutDeadlineTimelineLaneItems === 'function' ? layoutDeadlineTimelineLaneItems : undefined,
            buildDeadlineTimelineLaneGeometry: typeof buildDeadlineTimelineLaneGeometry === 'function' ? buildDeadlineTimelineLaneGeometry : undefined,
            placeDeadlinesHomepageWidget,
            setDeadlinesWidgetExpandedState,
            formatDeadlineChip,
            getDeadlineState
        };})();`
    );

    const document = {
        addEventListener() {},
        createElement(tagName) { return new FakeElement(tagName); }
    };
    const sandbox = {
        console,
        Date,
        document,
        globalThis: null,
        localStorage: { getItem() { return null; }, setItem() {} },
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
        isDarkMode() { return dark; }
    };
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

test('timeline ranges share one date scale so overlapping windows align', () => {
    const api = loadDeadlineUi();
    const rows = api.buildTopDeadlines(responseWith({
        course: [{
            heading: 'Fall 2026',
            items: [deadlineItem({
                label: 'Supplementary registration period',
                start: '2026-05-15',
                end: '2026-10-01'
            })]
        }],
        exam: [{
            heading: 'Ordinary winter exam 2026',
            items: [
                deadlineItem({ label: 'Registration period', start: '2026-10-15', end: '2026-11-01' }),
                deadlineItem({ label: 'Period for withdrawal from exams', start: '2026-10-15', end: '2026-11-15' })
            ]
        }]
    }), utc('2026-08-27'), 3);

    const model = api.buildDeadlineTimelineModel(rows, utc('2026-08-27'));
    const courseRegistration = model.items[0];
    const examRegistration = model.items[1];
    const examWithdrawal = model.items[2];

    assert.equal(model.todayTs, utc('2026-08-27'));
    assert.ok(model.startTs < model.todayTs, 'today should sit inside the plotted range');
    assert.ok(model.endTs > utc('2026-11-15'), 'the final deadline should not touch the chart edge');
    assert.equal(courseRegistration.type, 'range');
    assert.equal(courseRegistration.continuesBefore, true);
    assert.ok(courseRegistration.startPercent < model.todayPercent);
    assert.ok(courseRegistration.endPercent > model.todayPercent);
    assert.equal(examRegistration.startPercent, examWithdrawal.startPercent);
    assert.ok(examRegistration.endPercent < examWithdrawal.endPercent);
    assert.deepEqual(Array.from(model.ticks, tick => tick.label), [
        'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]);
});

test('academic deadline windows rotate through the current and next teaching periods', () => {
    const api = loadDeadlineUi();
    assert.equal(typeof api.buildDeadlineTimelinePhaseWindow, 'function');
    const cases = [
        ['2026-01-15', ['January', 'Spring'], '2026-01-01', '2026-06-01'],
        ['2026-03-15', ['Spring', 'Summer University'], '2026-02-01', '2026-09-01'],
        ['2026-07-15', ['Summer University', 'Fall'], '2026-06-01', '2027-01-01'],
        ['2026-10-15', ['Fall', 'January'], '2026-09-01', '2027-02-01']
    ];

    for (const [today, labels, start, end] of cases) {
        const window = api.buildDeadlineTimelinePhaseWindow(utc(today));
        assert.deepEqual(Array.from(window.phases, phase => phase.label), labels);
        assert.equal(window.startTs, utc(start));
        assert.equal(window.endExclusiveTs, utc(end));
    }
});

test('the deadline timeline keeps only dates intersecting the current and next teaching periods', () => {
    const api = loadDeadlineUi();
    const todayTs = utc('2026-08-28');
    const rows = [
        {
            label: 'Already open',
            startTs: utc('2026-08-23'),
            endTs: utc('2026-10-01'),
            nextTs: utc('2026-10-01')
        },
        {
            label: 'Fall deadline',
            startTs: utc('2026-12-31'),
            endTs: utc('2026-12-31'),
            nextTs: utc('2026-12-31')
        },
        {
            label: 'January deadline',
            startTs: utc('2027-01-01'),
            endTs: utc('2027-01-01'),
            nextTs: utc('2027-01-01')
        }
    ];

    const visible = api.selectDeadlineTimelinePhaseWindow(rows, todayTs);

    assert.deepEqual(Array.from(visible, row => row.label), ['Already open', 'Fall deadline']);
});

test('the deadline timeline uses a content-led scale across Summer University and Fall', () => {
    const api = loadDeadlineUi();
    const todayTs = utc('2026-08-28');
    const rows = [{
        label: 'Autumn registration',
        startTs: utc('2026-10-15'),
        endTs: utc('2026-11-01'),
        nextTs: utc('2026-10-15')
    }];

    const model = api.buildDeadlineTimelineModel(rows, todayTs);

    assert.equal(model.startTs, utc('2026-08-11'));
    assert.equal(model.endTs, utc('2027-01-01'));
    assert.deepEqual(Array.from(model.phases, phase => phase.label), ['Summer University', 'Fall']);
    assert.deepEqual(Array.from(model.ticks, tick => tick.label), [
        'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]);
});

test('dates beyond the next teaching period are absent from the rendered and accessible timeline', () => {
    const api = loadDeadlineUi();
    const rows = [
        {
            kind: 'course',
            label: 'Visible registration',
            startTs: utc('2026-12-31'),
            endTs: utc('2026-12-31'),
            nextTs: utc('2026-12-31'),
            state: 'upcoming'
        },
        {
            kind: 'course',
            label: 'Hidden registration',
            startTs: utc('2027-01-01'),
            endTs: utc('2027-01-01'),
            nextTs: utc('2027-01-01'),
            state: 'upcoming'
        }
    ];

    const timeline = api.createDeadlinesTimeline(rows, utc('2026-08-28'));
    const text = flattenText(timeline);
    const accessibleList = timeline.children.find(element => element.className === 'dtu-deadline-a11y-list');

    assert.ok(text.includes('Visible registration'));
    assert.ok(!text.includes('Hidden registration'));
    assert.equal(accessibleList.children.length, 1);
});

test('a single deadline marker aligns exactly with a range ending on the same day', () => {
    const api = loadDeadlineUi();
    const rows = api.buildTopDeadlines(responseWith({
        course: [{
            heading: 'Fall 2026',
            items: [
                deadlineItem({ label: 'Supplementary registration period', start: '2026-08-23', end: '2026-10-01' }),
                deadlineItem({ label: 'Deadline for withdrawal from courses', start: '2026-10-01' })
            ]
        }]
    }), utc('2026-08-27'), 3);

    const model = api.buildDeadlineTimelineModel(rows, utc('2026-08-27'));
    const registration = model.items[0];
    const withdrawal = model.items[1];

    assert.equal(withdrawal.type, 'milestone');
    assert.equal(withdrawal.startPercent, withdrawal.endPercent);
    assert.equal(withdrawal.startPercent, registration.endPercent);
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

test('visible deadlines share four bounded semantic timeline lanes', () => {
    const api = loadDeadlineUi();
    const rows = [
        { kind: 'course', label: 'Supplementary registration period', nextTs: utc('2026-10-01') },
        { kind: 'course', label: 'Deadline for withdrawal from courses', nextTs: utc('2026-10-01') },
        { kind: 'exam', label: 'Registration period', nextTs: utc('2026-11-01') },
        { kind: 'exam', label: 'Period for withdrawal from exams', nextTs: utc('2026-11-15') },
        { kind: 'course', label: 'Registration period', nextTs: utc('2027-01-01') },
        { kind: 'exam', label: 'Registration period', nextTs: utc('2027-02-01') },
        { kind: 'course', label: 'Registration period', nextTs: utc('2027-03-01') },
        { kind: 'exam', label: 'Period for withdrawal from exams', nextTs: utc('2027-04-01') },
        { kind: 'course', label: 'Deadline for withdrawal from courses', nextTs: utc('2027-05-01') }
    ];

    const lanes = api.buildDeadlineTimelineLanes(rows);
    assert.deepEqual(Array.from(lanes, lane => lane.label), [
        'Course registration',
        'Course withdrawal',
        'Exam registration',
        'Exam withdrawal'
    ]);
    assert.equal(lanes.reduce((total, lane) => total + lane.rows.length, 0), rows.length);

    const deregistration = api.buildDeadlineTimelineLanes([
        { kind: 'exam', label: 'Deadline to de-register', nextTs: utc('2027-06-01') }
    ]);
    assert.equal(deregistration[0].label, 'Exam withdrawal');

    const timeline = api.createDeadlinesTimeline(rows, utc('2026-08-27'));
    const renderedClasses = timeline.children.flatMap(function collect(element) {
        return [element.className, ...element.children.flatMap(collect)];
    });
    assert.equal(renderedClasses.filter(name => name === 'dtu-deadline-timeline-lane').length, 4);
    assert.equal(renderedClasses.filter(name => /dtu-deadline-timeline-(?:bar|date-mark)/.test(name)).length, 4);
    const mobileList = timeline.children.find(element => element.className === 'dtu-deadline-mobile-list');
    assert.equal(mobileList.children.length, 4);
    assert.ok(mobileList.children.every(element => element.className === 'dtu-deadline-mobile-lane'));
    const accessibleList = timeline.children.find(element => element.className === 'dtu-deadline-a11y-list');
    assert.equal(accessibleList.children.length, 4);
});

test('more than four colliding deadlines use a bounded accessible aggregate mark', () => {
    const api = loadDeadlineUi();
    const items = Array.from({ length: 6 }, (_, index) => ({
        row: { label: `Registration ${index + 1}` },
        type: 'range',
        startPercent: 20,
        endPercent: 40
    }));

    const laidOut = api.layoutDeadlineTimelineLaneItems(items, 4);
    assert.equal(laidOut.length, 5);
    assert.equal(laidOut.filter(item => item.aggregate).length, 1);
    assert.equal(laidOut.find(item => item.aggregate).items.length, 2);

    const collisionRows = Array.from({ length: 6 }, (_, index) => ({
        kind: 'course',
        label: `Registration ${index + 1}`,
        period: `Term ${index + 1}`,
        startIso: '2026-10-01',
        startTs: utc('2026-10-01'),
        endIso: '2026-10-15',
        endTs: utc('2026-10-15'),
        nextTs: utc('2026-10-01'),
        state: 'upcoming'
    }));
    const timeline = api.createDeadlinesTimeline(collisionRows, utc('2026-08-27'));
    const aggregate = (function findAggregate(element) {
        if (/\bdtu-deadline-timeline-aggregate\b/.test(element.className)) return element;
        for (const child of element.children) {
            const match = findAggregate(child);
            if (match) return match;
        }
        return null;
    })(timeline);
    assert.ok(aggregate);
    const aggregateTooltip = aggregate.children.find(child => child.className === 'dtu-deadline-mark-tooltip');
    assert.equal(aggregateTooltip.children[0].className, 'dtu-deadline-mark-tooltip-title');
    assert.equal(aggregateTooltip.children[0].textContent, '2 overlapping upcoming deadlines');
    const aggregateItems = aggregateTooltip.children.filter(child => child.className === 'dtu-deadline-mark-tooltip-item');
    assert.equal(aggregateItems.length, 2);
    assert.deepEqual(
        Array.from(aggregateItems[0].children, child => [child.className, child.textContent]),
        [
            ['dtu-deadline-mark-tooltip-item-title', 'Registration 5'],
            ['dtu-deadline-mark-tooltip-period', 'Term 5'],
            ['dtu-deadline-mark-tooltip-date', '1 Oct - 15 Oct 2026']
        ]
    );
    assert.match(aggregate.getAttribute('aria-label'), /2 overlapping upcoming deadlines/i);
    assert.match(aggregate.getAttribute('aria-label'), /Registration 5\. Term 5\. 1 Oct - 15 Oct 2026\./i);

    const activeTimeline = api.createDeadlinesTimeline(
        collisionRows.map(row => ({ ...row, state: 'active' })),
        utc('2026-08-27')
    );
    const activeAggregate = (function findAggregate(element) {
        if (/\bdtu-deadline-timeline-aggregate\b/.test(element.className)) return element;
        for (const child of element.children) {
            const match = findAggregate(child);
            if (match) return match;
        }
        return null;
    })(activeTimeline);
    assert.match(activeAggregate.className, /\bis-active\b/);
    assert.match(activeAggregate.getAttribute('aria-label'), /open now/i);

    const mixedTimeline = api.createDeadlinesTimeline(
        collisionRows.map((row, index) => ({ ...row, state: index === 5 ? 'upcoming' : 'active' })),
        utc('2026-08-27')
    );
    const mixedAggregate = (function findAggregate(element) {
        if (/\bdtu-deadline-timeline-aggregate\b/.test(element.className)) return element;
        for (const child of element.children) {
            const match = findAggregate(child);
            if (match) return match;
        }
        return null;
    })(mixedTimeline);
    assert.match(mixedAggregate.className, /\bis-mixed\b/);
    assert.match(mixedAggregate.getAttribute('aria-label'), /open now and upcoming/i);
});

test('timeline lanes center only the vertical slots their overlaps require', () => {
    const api = loadDeadlineUi();
    assert.equal(typeof api.buildDeadlineTimelineLaneGeometry, 'function');

    const oneTrack = api.buildDeadlineTimelineLaneGeometry([
        { slot: 0 },
        { slot: 0 },
        { slot: 0 }
    ]);
    assert.deepEqual({
        trackCount: oneTrack.trackCount,
        height: oneTrack.height,
        offsets: Array.from(oneTrack.offsets)
    }, {
        trackCount: 1,
        height: 44,
        offsets: [0]
    });

    const fourTracks = api.buildDeadlineTimelineLaneGeometry([
        { slot: 0 },
        { slot: 1 },
        { slot: 2 },
        { slot: 3 }
    ]);
    assert.deepEqual({
        trackCount: fourTracks.trackCount,
        height: fourTracks.height,
        offsets: Array.from(fourTracks.offsets)
    }, {
        trackCount: 4,
        height: 56,
        offsets: [-16.5, -5.5, 5.5, 16.5]
    });
});

test('non-overlapping exam withdrawal dates share a compact centered track', () => {
    const api = loadDeadlineUi();
    const rows = [
        { kind: 'exam', label: 'Exam withdrawal A', startTs: utc('2026-09-01'), endTs: utc('2026-09-20'), nextTs: utc('2026-09-01'), state: 'upcoming' },
        { kind: 'exam', label: 'Exam withdrawal B', startTs: utc('2026-10-15'), endTs: utc('2026-11-15'), nextTs: utc('2026-10-15'), state: 'upcoming' },
        { kind: 'exam', label: 'Exam withdrawal C', startTs: utc('2026-12-20'), endTs: utc('2026-12-20'), nextTs: utc('2026-12-20'), state: 'upcoming' }
    ];
    const timeline = api.createDeadlinesTimeline(rows, utc('2026-08-28'));
    const lane = (function findLane(element) {
        if (element.className === 'dtu-deadline-timeline-lane' && flattenText(element).includes('Exam withdrawal')) return element;
        for (const child of element.children) {
            const match = findLane(child);
            if (match) return match;
        }
        return null;
    })(timeline);
    const track = lane.children.find(child => child.className === 'dtu-deadline-timeline-track');
    const marks = track.children.filter(child => /dtu-deadline-timeline-(?:bar|date-mark)/.test(child.className));

    assert.equal(lane.style.minHeight, '44px');
    assert.equal(track.style.minHeight, '44px');
    assert.deepEqual(marks.map(mark => mark.style.top), [
        'calc(50% + 0px)',
        'calc(50% + 0px)',
        'calc(50% + 0px)'
    ]);
    assert.ok(marks.filter(mark => /dtu-deadline-timeline-bar/.test(mark.className)).every(mark =>
        !mark.children.some(child => child.className === 'dtu-deadline-timeline-endpoint')
    ));
});

test('the timeline renders a quiet roadmap axis with solid ranges and deadline ticks', () => {
    const api = loadDeadlineUi();
    const rows = api.buildTopDeadlines(responseWith({
        course: [{
            heading: 'Fall 2026',
            items: [
                deadlineItem({ label: 'Supplementary registration period', start: '2026-08-23', end: '2026-10-01' }),
                deadlineItem({ label: 'Deadline for withdrawal from courses', start: '2026-10-01' })
            ]
        }],
        exam: [{
            heading: 'Ordinary winter exam 2026',
            items: [deadlineItem({ label: 'Registration period', start: '2026-10-15', end: '2026-11-01' })]
        }]
    }), utc('2026-08-27'), 3);

    const timeline = api.createDeadlinesTimeline(rows, utc('2026-08-27'));
    const text = flattenText(timeline);
    const renderedClasses = timeline.children.flatMap(function collect(element) {
        return [element.className, ...element.children.flatMap(collect)];
    });

    assert.ok(text.includes('Today, 27 Aug'));
    assert.ok(text.includes('Summer University'));
    assert.ok(text.includes('Fall'));
    assert.ok(text.includes('Open now'));
    assert.ok(text.includes('Upcoming'));
    assert.ok(text.includes('Sep'));
    assert.ok(text.includes('Oct'));
    assert.ok(text.includes('Nov'));
    assert.ok(text.includes('23 Aug - 1 Oct 2026'));
    assert.ok(text.includes('1 Oct 2026'));
    assert.ok(renderedClasses.some(name => /\bdtu-deadline-timeline-bar\b/.test(name)));
    assert.ok(renderedClasses.some(name => /\bdtu-deadline-timeline-date-mark\b/.test(name)));
    assert.ok(!renderedClasses.some(name => /\bdtu-deadline-timeline-milestone\b/.test(name)));
    assert.ok(!renderedClasses.some(name => /\bdtu-deadline-timeline-endpoint\b/.test(name)));
    assert.ok(!renderedClasses.some(name => /\bdtu-deadline-timeline-baseline\b/.test(name)));
    assert.match(timeline.getAttribute('aria-label'), /Summer University and Fall/i);
    assert.doesNotMatch(text.join(' '), /\b\d+ dates?\b/i);
    const registrationBar = (function findByClass(element) {
        if (/dtu-deadline-timeline-bar/.test(element.className)) return element;
        for (const child of element.children) {
            const match = findByClass(child);
            if (match) return match;
        }
        return null;
    })(timeline);
    assert.equal(
        registrationBar.getAttribute('aria-label'),
        'Supplementary registration period. It will be possible to register for courses with vacant seats. Fall 2026. 23 Aug - 1 Oct 2026.'
    );
    assert.doesNotMatch(registrationBar.className, /continues-before/);
    assert.match(registrationBar.getAttribute('aria-label'), /23 Aug - 1 Oct 2026/);
    const tooltip = registrationBar.children.find(child => child.className === 'dtu-deadline-mark-tooltip');
    assert.deepEqual(
        Array.from(tooltip.children, child => [child.className, child.textContent]),
        [
            ['dtu-deadline-mark-tooltip-title', 'Supplementary registration period'],
            ['dtu-deadline-mark-tooltip-description', 'It will be possible to register for courses with vacant seats.'],
            ['dtu-deadline-mark-tooltip-period', 'Fall 2026'],
            ['dtu-deadline-mark-tooltip-date', '23 Aug - 1 Oct 2026']
        ]
    );
});
