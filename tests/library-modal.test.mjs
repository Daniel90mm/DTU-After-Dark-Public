import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);

class FakeElement {
    constructor(tagName) {
        this.tagName = String(tagName).toUpperCase();
        this.children = [];
        this.parentNode = null;
        this.className = '';
        this.id = '';
        this.textContent = '';
        this.attributes = {};
        this.listeners = {};
        this.style = { cssText: '' };
    }

    appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
        return child;
    }

    removeChild(child) {
        this.children = this.children.filter(item => item !== child);
        child.parentNode = null;
        return child;
    }

    remove() {
        if (this.parentNode) this.parentNode.removeChild(this);
    }

    get firstChild() { return this.children[0] || null; }

    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    addEventListener(type, listener) { this.listeners[type] = listener; }

    querySelector(selector) {
        return findElement(this, element => element.className.split(/\s+/).includes(selector.replace(/^\./, '')));
    }
}

class FakeDocument {
    constructor() {
        this.hidden = false;
        this.readyState = 'loading';
        this.documentElement = new FakeElement('html');
        this.head = new FakeElement('head');
        this.body = new FakeElement('body');
        this.documentElement.appendChild(this.head);
        this.documentElement.appendChild(this.body);
    }

    addEventListener() {}
    removeEventListener() {}
    createElement(tagName) { return new FakeElement(tagName); }
    getElementById(id) {
        return this.head.children.find(child => child.id === id) || null;
    }
    querySelector(selector) { return this.documentElement.querySelector(selector); }
    querySelectorAll() { return []; }
}

function findElement(root, predicate) {
    for (const child of root.children) {
        if (predicate(child)) return child;
        const nested = findElement(child, predicate);
        if (nested) return nested;
    }
    return null;
}

function loadLibraryTestApi() {
    const fileUrl = new URL('darkmode.library.js', ROOT);
    let source = fs.readFileSync(fileUrl, 'utf8');
    source = source.replace(
        /\}\)\(\);\s*$/,
        'globalThis.__libraryModalTestApi = { ensureLibraryFallbackStyles, showLibraryPanel };})();'
    );

    const document = new FakeDocument();
    const intervalDelays = [];
    const window = { addEventListener() {}, location: { hostname: 'learn.inside.dtu.dk' } };
    const sandbox = {
        clearInterval,
        clearTimeout,
        console,
        document,
        globalThis: null,
        setInterval(_callback, delay) {
            intervalDelays.push(delay);
            return 1;
        },
        setTimeout,
        window
    };
    sandbox.globalThis = sandbox;
    vm.runInNewContext(source, sandbox, { filename: fileUrl.pathname });
    sandbox.DTUAfterDarkLibraryDeps = {
        getLibraryUiState() { return {}; },
        setLibraryUiState() {},
        ensureLibraryRuntimeStyles() {},
        markExt(element) { element.setAttribute('data-dtu-ext', '1'); }
    };
    return { ...sandbox.__libraryModalTestApi, document, intervalDelays };
}

test('library fallback backdrop blurs without adding a dark wash', () => {
    const api = loadLibraryTestApi();

    api.ensureLibraryFallbackStyles();

    const css = api.document.getElementById('dtu-library-fallback-style')?.textContent || '';
    const overlayRule = css.match(/\.dtu-library-modal-overlay\{[^}]+\}/)?.[0] || '';
    assert.match(overlayRule, /background:transparent!important/);
    assert.match(overlayRule, /background-color:transparent!important/);
    assert.match(overlayRule, /backdrop-filter:blur\(4px\)!important/);
    assert.doesNotMatch(overlayRule, /background:rgba\(/);
});

test('library modal overlay protects its transparent blur from page-level background rules', () => {
    const api = loadLibraryTestApi();

    api.showLibraryPanel(null);

    const overlay = api.document.querySelector('.dtu-library-modal-overlay');
    assert.match(overlay?.style.cssText || '', /background:transparent !important/);
    assert.match(overlay?.style.cssText || '', /background-color:transparent !important/);
    assert.match(overlay?.style.cssText || '', /backdrop-filter:blur\(4px\) !important/);
});

test('library modal limits automatic occupancy refreshes to once every five minutes', () => {
    const api = loadLibraryTestApi();

    api.showLibraryPanel(null);

    assert.deepEqual(api.intervalDelays, [5 * 60 * 1000]);
});
