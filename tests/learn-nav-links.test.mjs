import assert from 'node:assert/strict';
import test from 'node:test';
import { loadModuleInternals, makeLocation, readSource } from './_harness.mjs';

// A tiny element tree that supports exactly the selectors learn-nav uses on the
// Student Resources dropdown, and counts every structural change.
function makeDom(nativeTexts) {
    const stats = { moves: 0, opened: [] };
    function el(tag, attrs = {}) {
        const a = new Map(Object.entries(attrs));
        const listeners = {};
        const node = {
            tagName: tag.toUpperCase(),
            children: [],
            parentNode: null,
            textContent: attrs.text || '',
            getAttribute: (k) => (a.has(k) ? a.get(k) : null),
            setAttribute: (k, v) => a.set(k, String(v)),
            removeAttribute: (k) => a.delete(k),
            hasAttribute: (k) => a.has(k),
            addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
            dispatch: (type) => (listeners[type] || []).forEach((fn) => fn({ type })),
            listenerCount: (type) => (listeners[type] || []).length,
            appendChild(child) { detach(child); child.parentNode = node; node.children.push(child); stats.moves++; return child; },
            insertBefore(child, ref) { detach(child); child.parentNode = node; node.children.splice(node.children.indexOf(ref), 0, child); stats.moves++; return child; },
            remove() { if (node.parentNode) { detach(node); stats.moves++; } },
            querySelector(sel) { return node.querySelectorAll(sel)[0] || null; },
            querySelectorAll(sel) { return all(node).filter((n) => matches(n, sel)); }
        };
        return node;
    }
    function detach(n) { if (n.parentNode) { n.parentNode.children = n.parentNode.children.filter((c) => c !== n); n.parentNode = null; } }
    function all(root) { return root.children.flatMap((c) => [c, ...all(c)]); }
    function matches(n, sel) {
        return sel.split(',').map((s) => s.trim()).some((s) => {
            const ext = /^\[data-dtu-afterdark-nav-link(?:="([^"]+)")?\]$/.exec(s);
            if (ext) return n.hasAttribute('data-dtu-afterdark-nav-link') && (!ext[1] || n.getAttribute('data-dtu-afterdark-nav-link') === ext[1]);
            const tagAttr = /^([a-z0-9-]+)\[(\w+)\]$/.exec(s);
            if (tagAttr) return n.tagName === tagAttr[1].toUpperCase() && n.hasAttribute(tagAttr[2]);
            if (s === '.d2l-navigation-s-group-text') return n.tagName === 'SPAN';
            if (s === 'd2l-dropdown-menu d2l-menu' || s === 'd2l-menu') return n.tagName === 'D2L-MENU';
            return /^[a-z0-9-]+$/.test(s) && n.tagName === s.toUpperCase();
        });
    }

    const dropdown = el('d2l-dropdown');
    const title = dropdown.appendChild(el('span', { text: 'Student Resources' }));
    title.textContent = 'Student Resources';
    const menu = dropdown.appendChild(el('d2l-menu', { label: 'Student Resources' }));
    nativeTexts.forEach((t, i) => {
        const attrs = { text: t };
        if (i === 0) attrs.first = 'true';
        if (i === nativeTexts.length - 1) attrs.last = 'true';
        menu.appendChild(el('d2l-menu-item', attrs));
    });
    stats.moves = 0;
    const document = {
        readyState: 'complete',
        hidden: false,
        addEventListener() {},
        createElement: (tag) => el(tag)
    };
    return { dropdown, menu, document, stats, texts: () => menu.children.map((c) => c.getAttribute('text')) };
}

const NATIVE = ['Academic Year', 'Course Evaluation', 'Exam Dates', 'Final Grades', 'Software', 'Student Guidance', 'Student Email'];

function load({ enabled = true } = {}) {
    const dom = makeDom(NATIVE);
    const opened = [];
    const deps = {
        isTopWindow: () => true,
        isFeatureFlagEnabled: () => enabled,
        featureLearnNavResourceLinksKey: 'k',
        normalizeWhitespace: (t) => String(t || '').replace(/\s+/g, ' ').trim(),
        markExt: () => {},
        deepQueryAll: (sel) => {
            if (sel === '.d2l-navigation-s-item d2l-dropdown') return [dom.dropdown];
            return dom.menu.querySelectorAll(sel);
        }
    };
    const location = makeLocation('https://learn.inside.dtu.dk/d2l/home');
    const windowObj = { location, addEventListener() {}, open: (url) => opened.push(url) };
    const { api } = loadModuleInternals('darkmode.learn-nav.js', [
        'insertDTULearnNavResourceLinks', 'removeDTULearnNavResourceLinks'
    ], { document: dom.document, window: windowObj, location, DTUAfterDarkLearnNavDeps: deps });
    return { api, dom, opened };
}

test('adds CampusNet and Panopto and lists the five main links first', () => {
    const { api, dom } = load();
    api.insertDTULearnNavResourceLinks();
    assert.deepEqual(dom.texts(), [
        'CampusNet', 'Final Grades', 'Panopto', 'Student Email', 'Course Evaluation',
        'Academic Year', 'Exam Dates', 'Software', 'Student Guidance'
    ]);
    assert.equal(dom.menu.children[0].getAttribute('first'), 'true');
    assert.equal(dom.menu.children.at(-1).getAttribute('last'), 'true');
    assert.equal(dom.menu.children.filter((c) => c.hasAttribute('first')).length, 1);
});

test('running again on an ordered menu changes nothing (no observer churn)', () => {
    const { api, dom } = load();
    api.insertDTULearnNavResourceLinks();
    dom.stats.moves = 0;
    for (let i = 0; i < 5; i++) api.insertDTULearnNavResourceLinks();
    assert.equal(dom.stats.moves, 0);
});

test('each added link opens once per D2L select event, in a new tab', () => {
    const { api, dom, opened } = load();
    api.insertDTULearnNavResourceLinks();
    const panopto = dom.menu.children.find((c) => c.getAttribute('data-dtu-afterdark-nav-link') === 'panopto');
    assert.equal(panopto.listenerCount('click'), 0);
    assert.equal(panopto.listenerCount('keydown'), 0);
    panopto.dispatch('d2l-menu-item-select');
    assert.deepEqual(opened, ['https://panopto.dtu.dk/Panopto/Pages/Home.aspx']);
});

test('turning it off removes the links and restores D2L\'s own order', () => {
    const { api, dom } = load();
    api.insertDTULearnNavResourceLinks();
    api.removeDTULearnNavResourceLinks();
    assert.deepEqual(dom.texts(), NATIVE);
    assert.equal(dom.menu.children[0].getAttribute('first'), 'true');
    assert.equal(dom.menu.children.at(-1).getAttribute('last'), 'true');
    dom.stats.moves = 0;
    api.removeDTULearnNavResourceLinks();
    assert.equal(dom.stats.moves, 0, 'nothing to do the second time');
});

test('does nothing while the feature is off', () => {
    const { api, dom } = load({ enabled: false });
    api.insertDTULearnNavResourceLinks();
    assert.deepEqual(dom.texts(), NATIVE);
});

test('Settings mentions the reordering', () => {
    assert.match(readSource('darkmode.settings.js'), /Navigation Quick Links', desc: 'Adds Panopto and CampusNet to Student Resources, listed first/);
});
