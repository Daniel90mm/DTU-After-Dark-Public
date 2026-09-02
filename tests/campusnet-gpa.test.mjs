import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);

class FakeStyle {
    constructor() {
        this.cssText = '';
        this.properties = new Map();
    }

    setProperty(name, value, priority = '') {
        this.properties.set(name, { value: String(value), priority });
    }

    getPropertyValue(name) {
        return this.properties.get(name)?.value || '';
    }

    getPropertyPriority(name) {
        return this.properties.get(name)?.priority || '';
    }

    removeProperty(name) {
        this.properties.delete(name);
    }
}

class FakeElement {
    constructor(tagName) {
        this.tagName = String(tagName).toLowerCase();
        this.children = [];
        this.parentNode = null;
        this.parentElement = null;
        this.attributes = {};
        this.className = '';
        this.id = '';
        this.style = new FakeStyle();
        this.textContent = '';
    }

    get classList() {
        const element = this;
        return {
            contains(name) { return element.className.split(/\s+/).filter(Boolean).includes(name); },
            toggle(name, force) {
                const classes = new Set(element.className.split(/\s+/).filter(Boolean));
                const enabled = force === undefined ? !classes.has(name) : !!force;
                if (enabled) classes.add(name);
                else classes.delete(name);
                element.className = Array.from(classes).join(' ');
            },
            remove(name) {
                element.className = element.className.split(/\s+/).filter(item => item && item !== name).join(' ');
            }
        };
    }

    appendChild(child) {
        if (child.parentNode) child.remove();
        this.children.push(child);
        child.parentNode = this;
        child.parentElement = this;
        return child;
    }

    insertBefore(child, before) {
        if (child.parentNode) child.remove();
        const index = this.children.indexOf(before);
        this.children.splice(index < 0 ? this.children.length : index, 0, child);
        child.parentNode = this;
        child.parentElement = this;
        return child;
    }

    remove() {
        if (!this.parentNode) return;
        this.parentNode.children = this.parentNode.children.filter(child => child !== this);
        this.parentNode = null;
        this.parentElement = null;
    }

    after(child) {
        if (!this.parentNode) return;
        const index = this.parentNode.children.indexOf(this);
        this.parentNode.insertBefore(child, this.parentNode.children[index + 1] || null);
    }

    setAttribute(name, value) {
        const stringValue = String(value);
        this.attributes[name] = stringValue;
        if (name === 'id') this.id = stringValue;
        if (name === 'class') this.className = stringValue;
    }

    getAttribute(name) {
        if (name === 'id') return this.id || null;
        if (name === 'class') return this.className || null;
        return this.attributes[name] ?? null;
    }

    removeAttribute(name) {
        delete this.attributes[name];
    }

    matches(selector) {
        const match = String(selector).match(/^([a-z0-9-]+)?(?:\.([a-z0-9_-]+))?$/i);
        if (!match) return false;
        const [, tagName, className] = match;
        return (!tagName || this.tagName === tagName.toLowerCase())
            && (!className || this.classList.contains(className));
    }

    querySelectorAll(selector) {
        const found = [];
        function visit(node) {
            for (const child of node.children) {
                if (child.matches(selector)) found.push(child);
                visit(child);
            }
        }
        visit(this);
        return found;
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
    }

    cloneNode(deep) {
        const clone = new FakeElement(this.tagName);
        clone.className = this.className;
        clone.id = this.id;
        clone.attributes = { ...this.attributes };
        clone.textContent = this.textContent;
        if (deep) this.children.forEach(child => clone.appendChild(child.cloneNode(true)));
        return clone;
    }
}

class FakeDocument {
    constructor() {
        this.documentElement = new FakeElement('html');
        this.head = new FakeElement('head');
        this.body = new FakeElement('body');
        this.documentElement.appendChild(this.head);
        this.documentElement.appendChild(this.body);
    }

    createElement(tagName) { return new FakeElement(tagName); }
    querySelector(selector) {
        if (this.documentElement.matches(selector)) return this.documentElement;
        return this.documentElement.querySelector(selector);
    }
    querySelectorAll(selector) { return this.documentElement.querySelectorAll(selector); }
    getElementById(id) {
        let found = null;
        function visit(element) {
            if (found) return;
            if (element.id === id) {
                found = element;
                return;
            }
            element.children.forEach(visit);
        }
        visit(this.documentElement);
        return found;
    }
}

const SCREENSHOT_GRADES = [
    ['02451', 'Introduction to machine learning', '7 (C)', 5],
    ['34127', 'Experimental optics and photonics', '12 (A)', 5],
    ['42621', 'Science, Technology and Society', 'BE (P)', 5],
    ['B34', 'Detection of the oxygenation of blood', '10 (B)', 20],
    ['02112', 'Embedded systems programming', '12 (A)', 5],
    ['22051', 'Signals and linear systems', '10 (B)', 5],
    ['22062', 'Introduction to medical data science', '10 (B)', 5],
    ['34021', 'Introduction to optics and photonics', '10 (B)', 5],
    ['34721', 'Linear control design 1', '7 (C)', 5],
    ['02402', 'Statistics', '10 (B)', 5],
    ['22050', 'Continuous time signals', '7 (C)', 5],
    ['22476', 'Electromagnetism', '7 (C)', 10],
    ['27020', 'Interdisciplinary bioengineering', '7 (C)', 5],
    ['KU006', 'Clinical Practice in Hospitals', 'BE (P)', 5],
    ['10060', 'Physics', '4 (D)', 10],
    ['22437', 'Rapid prototyping AC', '4 (D)', 10],
    ['KU011', 'Cell and tissue biology', '7 (C)', 10],
    ['01002', 'Mathematics 1b', '7 (C)', 10],
    ['22439', 'Rapid prototyping digital', '4 (D)', 5],
    ['26022', 'Chemistry', '4 (D)', 5],
    ['KU003', 'Human Diseases', '7 (C)', 10],
    ['01001', 'Mathematics 1a', '4 (D)', 10],
    ['02002', 'Computer programming', '02 (E)', 5],
    ['22438', 'Rapid prototyping analogue', '7 (C)', 5],
    ['KU002', 'Human biology', '10 (B)', 10]
];

function appendCell(document, row, text, childTag = null) {
    const cell = document.createElement('td');
    if (childTag) {
        const child = document.createElement(childTag);
        child.textContent = String(text);
        cell.appendChild(child);
    } else {
        cell.textContent = String(text);
    }
    row.appendChild(cell);
}

function buildGradesFixture(document) {
    const wrapper = document.createElement('section');
    const table = document.createElement('table');
    table.className = 'gradesList';
    const header = document.createElement('tr');
    header.className = 'gradesListHeader';
    ['Number', 'Title', 'Grade', 'ECTS', 'Date'].forEach(text => appendCell(document, header, text));
    table.appendChild(header);
    SCREENSHOT_GRADES.forEach(([code, title, grade, ects], index) => {
        const row = document.createElement('tr');
        row.className = index % 2 ? 'context_alternating' : 'context_direct';
        appendCell(document, row, code);
        appendCell(document, row, title);
        appendCell(document, row, grade, 'span');
        appendCell(document, row, ects);
        appendCell(document, row, 's26');
        table.appendChild(row);
    });
    wrapper.appendChild(table);
    document.body.appendChild(wrapper);
    return table;
}

function loadCampusnetGpaApi({ document = new FakeDocument(), dark = false } = {}) {
    const fileUrl = new URL('darkmode.campusnet-gpa.js', ROOT);
    let source = fs.readFileSync(fileUrl, 'utf8');
    source = source.replace(
        /\}\)\(\);\s*$/,
        `globalThis.__campusnetGpaTestApi = {
            calculateCampusnetWeightedGpa: typeof calculateCampusnetWeightedGpa === 'function'
                ? calculateCampusnetWeightedGpa : undefined,
            getCampusnetActualGradeSummary: typeof getCampusnetActualGradeSummary === 'function'
                ? getCampusnetActualGradeSummary : undefined,
            applyCampusnetActualGradeExcludedRowInlineStyles:
                typeof applyCampusnetActualGradeExcludedRowInlineStyles === 'function'
                    ? applyCampusnetActualGradeExcludedRowInlineStyles : undefined,
            publicApi: globalThis.DTUAfterDarkCampusnetGpa
        };})();`
    );

    const sandbox = {
        console,
        document,
        globalThis: null,
        localStorage: { getItem() { return null; }, setItem() {} },
        window: { location: { hostname: 'test.invalid', pathname: '/' } }
    };
    sandbox.DTUAfterDarkCampusnetGpaDeps = {
        isTopWindow() { return true; },
        isFeatureEnabled() { return true; },
        isDarkMode() { return dark; },
        setSuppressHeavyWork() {}
    };
    sandbox.globalThis = sandbox;
    vm.runInNewContext(source, sandbox, { filename: fileURLToPath(fileUrl) });
    return sandbox.__campusnetGpaTestApi;
}

function loadCampusnetHostShellTestApi() {
    const fileUrl = new URL('darkmode.host-shells.js', ROOT);
    let source = fs.readFileSync(fileUrl, 'utf8');
    source = source.replace(
        /\}\)\(\);\s*$/,
        `globalThis.__campusnetHostShellTestApi = {
            neutralizeCampusnetGradeCourseNumbers:
                typeof neutralizeCampusnetGradeCourseNumbers === 'function'
                    ? neutralizeCampusnetGradeCourseNumbers : undefined
        };})();`
    );

    const sandbox = {
        console,
        document: new FakeDocument(),
        globalThis: null,
        window: { location: { hostname: 'campusnet.dtu.dk', pathname: '/cnnet/Grades/' } }
    };
    sandbox.globalThis = sandbox;
    vm.runInNewContext(source, sandbox, { filename: fileURLToPath(fileUrl) });
    return sandbox.__campusnetHostShellTestApi;
}

test('the CampusNet table parser gives 7.32 GPA while excluding pass/fail courses', () => {
    const document = new FakeDocument();
    const table = buildGradesFixture(document);
    const api = loadCampusnetGpaApi({ document });

    const result = api.getCampusnetActualGradeSummary?.(table);

    assert.deepEqual(
        result && {
            totalWeighted: result.totalWeighted,
            totalECTS: result.totalECTS,
            gpa: result.gpa
        },
        { totalWeighted: 1245, totalECTS: 170, gpa: 7.32 }
    );
});

test('the CampusNet GPA public API exposes no speculative degree-progress renderer', () => {
    const api = loadCampusnetGpaApi();

    assert.equal(api.publicApi?.insertECTSProgressBar, undefined);
});

test('CampusNet grade course numbers stay neutral after extension-owned styles are refreshed', () => {
    const api = loadCampusnetHostShellTestApi();
    const link = new FakeElement('a');
    link.setAttribute('data-dtu-accent-link', '1');
    link.style.setProperty('color', '#e65b5b', 'important');
    const firstCell = new FakeElement('td');
    firstCell.style.setProperty('color', '#e65b5b', 'important');
    firstCell.appendChild(link);
    const toggleButton = new FakeElement('button');
    toggleButton.className = 'gpa-actual-toggle-btn';
    toggleButton.style.setProperty('color', '#e65b5b', 'important');
    firstCell.appendChild(toggleButton);
    const headerLink = new FakeElement('a');
    headerLink.style.setProperty('color', '#e65b5b', 'important');
    const excludedLink = new FakeElement('a');
    excludedLink.style.setProperty('color', '#a8afb8', 'important');
    const excludedCell = new FakeElement('td');
    excludedCell.style.setProperty('color', '#a8afb8', 'important');
    excludedCell.appendChild(excludedLink);
    const row = {
        classList: { contains() { return false; } },
        querySelector(selector) {
            return selector === 'td:first-child' ? firstCell : null;
        }
    };
    const excludedRow = {
        classList: { contains(name) { return name === 'gpa-actual-excluded'; } },
        querySelector(selector) {
            return selector === 'td:first-child' ? excludedCell : null;
        }
    };
    const table = {
        querySelectorAll(selector) {
            if (selector === 'tr.context_direct, tr.context_alternating') return [row, excludedRow];
            if (selector === 'tr.gradesListHeader td a') return [headerLink];
            return [];
        }
    };

    api.neutralizeCampusnetGradeCourseNumbers?.(table);

    assert.equal(link.style.getPropertyValue('color'), 'inherit');
    assert.equal(link.style.getPropertyPriority('color'), 'important');
    assert.equal(firstCell.style.getPropertyValue('color'), '');
    assert.equal(link.getAttribute('data-dtu-accent-link'), null);
    assert.equal(excludedCell.style.getPropertyValue('color'), '#a8afb8');
    assert.equal(excludedLink.style.getPropertyValue('color'), 'inherit');
    assert.equal(toggleButton.style.getPropertyValue('color'), '#e65b5b');
    assert.equal(headerLink.style.getPropertyValue('color'), '#e65b5b');
});

for (const dark of [true, false]) {
    test(`restoring a hidden CampusNet grade immediately restores its neutral course number in ${dark ? 'dark' : 'light'} mode`, () => {
        const api = loadCampusnetGpaApi({ dark });
        const link = new FakeElement('a');
        link.style.setProperty('color', 'inherit', 'important');
        const firstCell = new FakeElement('td');
        firstCell.appendChild(link);
        const row = {
            querySelectorAll(selector) {
                if (selector === 'td') return [firstCell];
                if (selector === 'td span, td a') return [link];
                if (selector === '[data-gpa-actual-inline-muted="1"]') {
                    return [firstCell, link].filter(element =>
                        element.getAttribute('data-gpa-actual-inline-muted') === '1');
                }
                return [];
            }
        };
        const entry = { row, cells: [firstCell] };

        api.applyCampusnetActualGradeExcludedRowInlineStyles(entry, true);
        assert.equal(link.style.getPropertyValue('color'), dark ? '#a8afb8' : '#6b7280');

        api.applyCampusnetActualGradeExcludedRowInlineStyles(entry, false);

        assert.equal(link.style.getPropertyValue('color'), 'inherit');
        assert.equal(link.style.getPropertyPriority('color'), 'important');
    });
}
