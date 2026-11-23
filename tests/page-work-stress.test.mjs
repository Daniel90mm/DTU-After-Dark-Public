// Stress tests for page-load and runtime work (DeepSeek handoff 2026-11-10).
// test_bug_* failed before that day's fixes. Left out on purpose: the 15 s shadow sweep
// (safety net for shadow roots that fire no mutation); shadow hosts get one style check per pass.
// The test_holds_* cases cover attacks that did not expose a bug.

import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { extractFunctions, loadModuleInternals, makeLocation, readSource } from './_harness.mjs';

const NODE_FILTER = {
    SHOW_ELEMENT: 1,
    SHOW_TEXT: 4,
    FILTER_ACCEPT: 1,
    FILTER_REJECT: 2
};

function styleStub() {
    const values = new Map();
    return {
        setProperty(name, value, priority) { values.set(name, { value, priority: priority || '' }); },
        getPropertyValue(name) { return values.has(name) ? values.get(name).value : ''; },
        getPropertyPriority(name) { return values.has(name) ? values.get(name).priority : ''; },
        removeProperty(name) { values.delete(name); },
        cssText: ''
    };
}

function simpleSelectorMatches(element, selector) {
    const sel = String(selector || '').trim();
    if (!sel || sel === '*') return true;
    const attrs = [];
    const withoutAttrs = sel.replace(/\[([^\]]+)\]/g, (all, body) => {
        const eq = body.indexOf('=');
        if (eq === -1) attrs.push({ name: body.trim(), value: null });
        else attrs.push({ name: body.slice(0, eq).trim(), value: body.slice(eq + 1).replace(/^['"]|['"]$/g, '') });
        return '';
    }).trim();
    for (const attr of attrs) {
        const actual = element.getAttribute ? element.getAttribute(attr.name) : null;
        if (actual === null) return false;
        if (attr.value !== null && String(actual) !== attr.value) return false;
    }
    if (!withoutAttrs) return true;
    if (withoutAttrs.startsWith('.')) {
        const cls = withoutAttrs.slice(1);
        const names = String(element.className || '').split(/\s+/);
        return names.includes(cls);
    }
    return String(element.tagName || '').toLowerCase() === withoutAttrs.toLowerCase();
}

class FakeElement {
    constructor(tagName) {
        this.nodeType = 1;
        this.tagName = String(tagName || 'div').toUpperCase();
        this.attributes = Object.create(null);
        this.children = [];
        this.parentNode = null;
        this.parentElement = null;
        this.style = styleStub();
        this.classList = { contains: (name) => String(this.className || '').split(/\s+/).includes(name) };
        this.isConnected = true;
        this.className = '';
        this.id = '';
        this.textContent = '';
        this.shadowRoot = null;
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; }
    hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name); }
    removeAttribute(name) { delete this.attributes[name]; }
    appendChild(child) {
        child.parentNode = this;
        child.parentElement = this;
        this.children.push(child);
        return child;
    }
    insertBefore(child, before) {
        child.parentNode = this;
        child.parentElement = this;
        const at = this.children.indexOf(before);
        if (at === -1) this.children.push(child);
        else this.children.splice(at, 0, child);
        return child;
    }
    removeChild(child) {
        const at = this.children.indexOf(child);
        if (at !== -1) this.children.splice(at, 1);
        return child;
    }
    replaceChild(next, old) {
        const at = this.children.indexOf(old);
        if (at !== -1) {
            this.children[at] = next;
            next.parentNode = this;
            next.parentElement = this;
        }
    }
    closest(selector) {
        const parts = String(selector || '').split(',').map((s) => s.trim()).filter(Boolean);
        let node = this;
        while (node) {
            if (parts.some((part) => simpleSelectorMatches(node, part))) return node;
            node = node.parentElement || node.parentNode;
        }
        return null;
    }
    matches(selector) {
        return String(selector || '').split(',').some((part) => simpleSelectorMatches(this, part.trim()));
    }
    querySelectorAll(selector) {
        const parts = String(selector || '').split(',').map((s) => s.trim()).filter(Boolean);
        const found = [];
        const walk = (node) => {
            for (const child of node.children || []) {
                if (child.nodeType === 1 && parts.some((part) => simpleSelectorMatches(child, part))) found.push(child);
                if (child.children) walk(child);
            }
        };
        walk(this);
        return found;
    }
    querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
    }
    getRootNode() { return this; }
}

class FakeText {
    constructor(value, parentElement, onRead) {
        this.nodeType = 3;
        this._value = value;
        this.parentElement = parentElement;
        this.parentNode = parentElement;
        this._onRead = onRead || (() => {});
    }
    get nodeValue() { this._onRead(); return this._value; }
    get textContent() { this._onRead(); return this._value; }
}

function walkerOver(root, show, filter, onVisit) {
    const nodes = [];
    const walk = (node) => {
        for (const child of node.children || []) {
            if ((show & NODE_FILTER.SHOW_ELEMENT) && child.nodeType === 1) nodes.push(child);
            if ((show & NODE_FILTER.SHOW_TEXT) && child.nodeType === 3) nodes.push(child);
            walk(child);
        }
    };
    walk(root);
    let at = 0;
    return {
        nextNode() {
            while (at < nodes.length) {
                const node = nodes[at++];
                if (onVisit) onVisit(node);
                if (filter) {
                    const verdict = filter.acceptNode(node);
                    if (verdict === NODE_FILTER.FILTER_REJECT) continue;
                }
                return node;
            }
            return null;
        }
    };
}

function makeDocument() {
    const doc = new FakeElement('html');
    doc.body = new FakeElement('body');
    doc.head = new FakeElement('head');
    doc.documentElement = doc;
    doc.addEventListener = () => {};
    doc.createElement = (tag) => new FakeElement(tag);
    doc.createTextNode = (text) => new FakeText(text, null);
    doc.createDocumentFragment = () => new FakeElement('fragment');
    doc.createTreeWalker = (root, show, filter) => walkerOver(root, show, filter);
    doc.querySelector = () => null;
    doc.getElementById = () => null;
    return doc;
}

function makeClock() {
    let nextId = 1;
    const timeouts = new Map();
    const intervals = new Map();
    return {
        setTimeout(fn, ms) { const id = nextId++; timeouts.set(id, { fn, ms }); return id; },
        clearTimeout(id) { timeouts.delete(id); },
        setInterval(fn, ms) { const id = nextId++; intervals.set(id, { fn, ms }); return id; },
        clearInterval(id) { intervals.delete(id); },
        runTimeouts() {
            const pending = Array.from(timeouts.values());
            timeouts.clear();
            pending.forEach((timer) => timer.fn());
        },
        get timeoutCount() { return timeouts.size; },
        get intervalCount() { return intervals.size; }
    };
}

function textbookDeps(overrides = {}) {
    return {
        isTopWindow: () => true,
        isDTULearnCoursePage: () => true,
        isFeatureFlagEnabled: () => true,
        featureTextbookLinksKey: 'dtuAfterDarkFeatureKurserTextbookLinker',
        isDarkModeEnabled: () => false,
        normalizeISBN: (raw) => String(raw || '').replace(/[\s-]/g, '').replace(/x$/i, 'X'),
        isValidISBN13: (digits) => /^\d{13}$/.test(String(digits || '')),
        isValidISBN10: () => false,
        isNotesOnlyLiterature: () => false,
        ...overrides
    };
}

const TEXTBOOK_FILES = ['darkmode.textbooks.core.js', 'darkmode.textbooks.kurser.js', 'darkmode.textbooks.js'];

function loadBookFinder(globals, deps) {
    return loadModuleInternals(TEXTBOOK_FILES, ['insertBookFinderLinks'], {
        ...globals,
        NodeFilter: NODE_FILTER,
        DTUAfterDarkTextbooksDeps: deps,
        window: { location: makeLocation('https://learn.inside.dtu.dk/d2l/le/content/1/viewContent/1/View') }
    });
}

function smartRoomGlobals(document, clock, enabled) {
    return {
        document,
        NodeFilter: NODE_FILTER,
        window: { location: makeLocation('https://learn.inside.dtu.dk/d2l/home') },
        setTimeout: clock.setTimeout,
        clearTimeout: clock.clearTimeout,
        DTUAfterDarkSmartRoomLinkerDeps: {
            isFeatureFlagEnabled: () => enabled.value,
            isTopWindow: () => true,
            featureSmartRoomLinkerKey: 'dtuAfterDarkFeatureSmartRoomLinker'
        }
    };
}

test('test_bug_book_finder_rescans_text_that_produced_no_book', () => {
    // Invariant 4: ISBN text scans run once per node. A line with no ISBN is
    // still rescanned in full on the next Book Finder pass, so a quiet course
    // page pays a fresh document-wide text walk on every mutation-driven scan.
    let reads = 0;
    const doc = makeDocument();
    const contentArea = new FakeElement('div');
    const block = new FakeElement('p');
    block.parentNode = contentArea;
    block.parentElement = contentArea;
    block.textContent = 'No textbook is mentioned on this line 12345';
    contentArea.querySelectorAll = (selector) => (String(selector).includes('p, li, div') ? [block] : []);
    doc.querySelector = (selector) => (selector === '.d2l-page-main' ? contentArea : null);
    // One node across passes, as on a real page (the worker's version made a new node per walk).
    const text = new FakeText('No textbook is mentioned on this line 12345', block, () => { reads++; });
    doc.createTreeWalker = () => {
        let done = false;
        return { nextNode() { if (done) return null; done = true; return text; } };
    };

    const { api } = loadBookFinder({ document: doc }, textbookDeps());
    api.insertBookFinderLinks();
    const afterFirst = reads;
    api.insertBookFinderLinks();
    const secondPassReads = reads - afterFirst;

    assert.equal(secondPassReads, 0,
        `expected an already-scanned text node to be skipped, but the second pass read ${secondPassReads} text node(s)`);
});

test('test_bug_smart_room_scan_rescans_every_text_node', () => {
    // Invariant 4: room-code text scans run once per node. The scanner keeps a
    // WeakSet for shadow roots but none for text nodes, so each scheduled scan
    // walks and re-reads the same text again.
    let reads = 0;
    const doc = makeDocument();
    const root = new FakeElement('div');
    const paragraph = new FakeElement('p');
    root.appendChild(paragraph);
    paragraph.appendChild(new FakeText('Deadline 12.10.2026 at 23:59', paragraph, () => { reads++; }));
    doc.body.appendChild(root);
    doc.createTreeWalker = (walkerRoot, show, filter) => walkerOver(walkerRoot, show, filter);

    const clock = makeClock();
    const enabled = { value: true };
    const { api } = loadModuleInternals('darkmode.smart-room-linker.js', ['runSmartRoomLinkerScan'],
        smartRoomGlobals(doc, clock, enabled));

    api.runSmartRoomLinkerScan(root);
    const afterFirst = reads;
    api.runSmartRoomLinkerScan(root);
    const secondPassReads = reads - afterFirst;

    assert.equal(secondPassReads, 0,
        `expected an already-scanned text node to be skipped, but the second scan read ${secondPassReads} text node(s)`);
});

test('test_bug_smart_room_scheduler_drops_the_second_pending_root', () => {
    // Invariant 1/4: work must follow what changed. The smart-room scheduler
    // keeps only the first pending root, so a second changed subtree queued
    // before the timer fires is never scanned.
    const doc = makeDocument();
    const first = new FakeElement('div');
    first.id = 'first-root';
    const second = new FakeElement('div');
    second.id = 'second-root';
    doc.body.appendChild(first);
    doc.body.appendChild(second);
    const walkerRoots = [];
    doc.createTreeWalker = (root, show, filter) => {
        walkerRoots.push(root);
        return walkerOver(root, show, filter);
    };

    const clock = makeClock();
    const enabled = { value: true };
    const { api } = loadModuleInternals('darkmode.smart-room-linker.js', ['scheduleSmartRoomLinkerScan'],
        smartRoomGlobals(doc, clock, enabled));

    api.scheduleSmartRoomLinkerScan(first, 10);
    api.scheduleSmartRoomLinkerScan(second, 10);
    assert.equal(clock.timeoutCount, 1, 'the two requests should still share one timer');
    clock.runTimeouts();

    const covered = walkerRoots.some((root) => root === second || root === doc.body || root === doc.documentElement);
    assert.equal(covered, true,
        `second queued root was dropped; scans ran over ${walkerRoots.map((root) => root.id || root.tagName).join(', ') || 'nothing'}`);
});

test('test_bug_queued_html_block_probe_still_runs_after_feature_off', () => {
    // Invariant 5: a feature that is off must not scan or write. Turning Smart
    // Room Linker off does not cancel an already queued HTML block probe, and
    // its timer callback never rechecks the flag.
    const doc = makeDocument();
    let blockQueries = 0;
    doc.querySelectorAll = (selector) => {
        if (selector === 'd2l-html-block') blockQueries++;
        return [];
    };
    const clock = makeClock();
    const enabled = { value: true };
    const { api } = loadModuleInternals('darkmode.smart-room-linker.js', ['scheduleSmartRoomLinkerHtmlBlockProbe'],
        smartRoomGlobals(doc, clock, enabled));

    api.scheduleSmartRoomLinkerHtmlBlockProbe(10);
    enabled.value = false;
    clock.runTimeouts();

    assert.equal(blockQueries, 0,
        `feature was off but the queued probe still ran ${blockQueries} document-wide d2l-html-block scan(s)`);
});

test('test_bug_shadow_host_processed_twice_each_dark_pass', () => {
    // Invariant 4: a shadow-root sweep must run once per node and skip nodes
    // already processed. runDarkModeChecks calls processElement and then
    // sweepForLateShadowRoots over the same node, and neither remembers hosts.
    let dark = false;
    let styleLookups = 0;
    const doc = makeDocument();
    const host = new FakeElement('d2l-card');
    const shadowRoot = new FakeElement('shadow-root');
    shadowRoot.nodeType = 11;
    shadowRoot.host = host;
    shadowRoot.getElementById = (id) => {
        styleLookups++;
        return shadowRoot.children.find((child) => child.id === id) || null;
    };
    host.shadowRoot = shadowRoot;

    class FakeMutationObserver {
        observe() {}
        disconnect() {}
    }

    const { api } = loadModuleInternals(['darkmode.dark-engine.page-cases.js', 'darkmode.dark-engine.styles.js', 'darkmode.dark-engine.js'], ['runDarkModeChecks'], {
        document: doc,
        window: { location: makeLocation('https://learn.inside.dtu.dk/d2l/home') },
        NodeFilter: NODE_FILTER,
        MutationObserver: FakeMutationObserver,
        customElements: { get: () => ({}), whenDefined: () => Promise.resolve() },
        setTimeout: () => 0,
        clearTimeout: () => {},
        DTUAfterDarkDarkEngineDeps: {
            isDarkModeEnabled: () => dark,
            isLegacyHeavyPage: () => false,
            replaceLogoImage: () => {},
            styleQuizSubmissionHistogram: () => {},
            forceDTULearnAccentInRoot: () => {},
            seedSmartRoomLinkerShadowRoot: () => {},
            scheduleSmartRoomLinkerScan: () => {},
            insertContentButtons: () => {}
        }
    });

    dark = true;
    api.runDarkModeChecks(host);
    const firstPassLookups = styleLookups;
    api.runDarkModeChecks(host);
    const twoPassLookups = styleLookups;

    // One style check per pass: the check is kept on purpose, it re-adds styles the page dropped.
    assert.deepEqual([firstPassLookups, twoPassLookups], [1, 2],
        `one unchanged shadow host was styled ${firstPassLookups} time(s) in one pass and ${twoPassLookups} times over two passes`);
});

test('test_bug_book_finder_bar_retriggers_the_unified_observer', () => {
    // Invariant 2: the extension's own DOM writes must not schedule more work.
    // Book Finder bars are inserted unmarked, so the unified observer treats a
    // freshly inserted bar as a page change and queues a full feature pass.
    const doc = makeDocument();
    const contentArea = new FakeElement('div');
    const block = new FakeElement('p');
    block.parentNode = contentArea;
    block.parentElement = contentArea;
    block.textContent = 'Goodfellow, Deep Learning, ISBN 978-0-262-03561-3';
    contentArea.querySelectorAll = (selector) => (String(selector).includes('p, li, div') ? [block] : []);
    doc.querySelector = (selector) => (selector === '.d2l-page-main' ? contentArea : null);
    doc.createTreeWalker = () => {
        const text = new FakeText(block.textContent, block);
        let done = false;
        return { nextNode() { if (done) return null; done = true; return text; } };
    };

    const { api } = loadBookFinder({ document: doc }, textbookDeps());
    api.insertBookFinderLinks();
    const bar = contentArea.children.find((child) => child.hasAttribute('data-book-finder-bar'));
    assert.ok(bar, 'Book Finder should have inserted its bar');

    const { api: darkmode, context } = extractFunctions('darkmode.js', ['enqueueMutationRoot'], {
        prelude: `
            var _pendingMutationRoots = [];
            var _pendingMutationRootSet = new Set();
            var _mutationQueueOverflow = false;
            const MAX_PENDING_MUTATION_ROOTS = 220;
            globalThis.__pendingCount = function () { return _pendingMutationRoots.length; };
        `,
        globals: {}
    });
    darkmode.enqueueMutationRoot(bar);

    assert.equal(context.__pendingCount(), 0,
        `the extension's own bar was queued as page work (${context.__pendingCount()} root(s)); it should be marked or ignored`);
});

test('test_holds_marked_extension_nodes_are_not_enqueued', () => {
    // Invariant 2 holds for nodes the extension marks with data-dtu-ext.
    const { api, context } = extractFunctions('darkmode.js', ['enqueueMutationRoot'], {
        prelude: `
            var _pendingMutationRoots = [];
            var _pendingMutationRootSet = new Set();
            var _mutationQueueOverflow = false;
            const MAX_PENDING_MUTATION_ROOTS = 220;
            globalThis.__pendingCount = function () { return _pendingMutationRoots.length; };
        `,
        globals: {}
    });
    const node = new FakeElement('div');
    node.setAttribute('data-dtu-ext', '1');
    api.enqueueMutationRoot(node);
    assert.equal(context.__pendingCount(), 0);
});

test('test_holds_mutation_enqueue_dedupes_the_same_root', () => {
    // Invariant 1 holds for repeated mutations of the same node: one entry.
    const { api, context } = extractFunctions('darkmode.js', ['enqueueMutationRoot'], {
        prelude: `
            var _pendingMutationRoots = [];
            var _pendingMutationRootSet = new Set();
            var _mutationQueueOverflow = false;
            const MAX_PENDING_MUTATION_ROOTS = 220;
            globalThis.__pendingCount = function () { return _pendingMutationRoots.length; };
        `,
        globals: {}
    });
    const node = new FakeElement('div');
    api.enqueueMutationRoot(node);
    api.enqueueMutationRoot(node);
    assert.equal(context.__pendingCount(), 1);
});

test('test_holds_smart_room_schedule_costs_nothing_when_feature_is_off', () => {
    // Invariant 5 holds at schedule time: the flag is checked before a timer.
    const doc = makeDocument();
    const clock = makeClock();
    const enabled = { value: false };
    const { api } = loadModuleInternals('darkmode.smart-room-linker.js', ['scheduleSmartRoomLinkerScan'],
        smartRoomGlobals(doc, clock, enabled));
    api.scheduleSmartRoomLinkerScan(new FakeElement('div'), 10);
    assert.equal(clock.timeoutCount, 0);
});

test('test_holds_book_finder_does_not_walk_text_when_disabled', () => {
    // Invariant 5 holds for the main scan path: disabling the feature removes
    // bars without starting a text walk.
    let walkerCalls = 0;
    const doc = makeDocument();
    doc.querySelectorAll = () => [];
    doc.createTreeWalker = () => { walkerCalls++; return { nextNode: () => null }; };
    const { api } = loadBookFinder({ document: doc }, textbookDeps({ isFeatureFlagEnabled: () => false }));
    api.insertBookFinderLinks();
    assert.equal(walkerCalls, 0);
});

test('test_bug_light_cell_detection_interleaves_layout_reads_and_writes', () => {
    // Invariant 6: layout reads are not interleaved with writes over many
    // elements. markAuthoredLightTableCells reads getComputedStyle(cell), writes
    // a data attribute on that cell, then reads the next cell. The attribute
    // changes CSS selectors, so every write invalidates the next read.
    const doc = makeDocument();
    const root = new FakeElement('div');
    root.ownerDocument = doc;
    const cells = [new FakeElement('td'), new FakeElement('td'), new FakeElement('td')];
    const sequence = [];
    doc.defaultView = {
        getComputedStyle: () => {
            sequence.push('read');
            return { backgroundColor: 'rgb(255, 255, 255)' };
        }
    };
    root.querySelectorAll = (selector) => (selector === 'td, th' ? cells : []);
    cells.forEach((cell) => {
        const setAttribute = cell.setAttribute.bind(cell);
        cell.setAttribute = (name, value) => { sequence.push('write'); setAttribute(name, value); };
        cell.ownerDocument = doc;
    });

    const { api } = loadModuleInternals(['darkmode.dark-engine.page-cases.js', 'darkmode.dark-engine.styles.js', 'darkmode.dark-engine.js'], ['markAuthoredLightTableCells'], {
        document: doc,
        window: { location: makeLocation('https://learn.inside.dtu.dk/d2l/home') },
        NodeFilter: NODE_FILTER,
        MutationObserver: class { observe() {} },
        customElements: { get: () => ({}), whenDefined: () => Promise.resolve() },
        setTimeout: () => 0,
        clearTimeout: () => {},
        DTUAfterDarkDarkEngineDeps: { isDarkModeEnabled: () => false }
    });
    api.markAuthoredLightTableCells(root, 'td, th');

    const firstWrite = sequence.indexOf('write');
    const readsAfterWrite = sequence.slice(firstWrite).filter((step) => step === 'read').length;
    assert.equal(readsAfterWrite, 0,
        `layout reads and writes were interleaved: ${sequence.join(', ')}`);
});

test('test_holds_book_finder_marks_isbn_blocks_before_the_next_scan', () => {
    // Invariant 4 partially holds for successful hits: the block carrying an
    // ISBN is marked so the next pass skips its text.
    let reads = 0;
    const doc = makeDocument();
    const contentArea = new FakeElement('div');
    const block = new FakeElement('p');
    block.parentNode = contentArea;
    block.parentElement = contentArea;
    block.textContent = 'Goodfellow, Deep Learning, ISBN 978-0-262-03561-3';
    contentArea.querySelectorAll = (selector) => (String(selector).includes('p, li, div') ? [block] : []);
    doc.querySelector = (selector) => (selector === '.d2l-page-main' ? contentArea : null);
    doc.createTreeWalker = () => {
        const text = new FakeText(block.textContent, block, () => { reads++; });
        let done = false;
        return { nextNode() { if (done) return null; done = true; return text; } };
    };

    const { api } = loadBookFinder({ document: doc }, textbookDeps());
    api.insertBookFinderLinks();
    assert.equal(block.getAttribute('data-book-finder-injected'), 'true');
    const afterFirst = reads;
    api.insertBookFinderLinks();
    assert.equal(reads - afterFirst, 0);
});
