import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { loadDom } from './_harness.mjs';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const BUS_CONFIG_KEY = 'dtuDarkModeBusConfig';

class FakeElement {
    constructor(tagName) {
        this.tagName = String(tagName).toUpperCase();
        this.children = [];
        this.parentNode = null;
        this.className = '';
        this.textContent = '';
        this.attributes = {};
        this.listeners = {};
        this.style = {
            cssText: '',
            setProperty(name, value) { this[name] = String(value); }
        };
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

    get firstChild() {
        return this.children[0] || null;
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }

    getAttribute(name) {
        return this.attributes[name] ?? null;
    }

    removeAttribute(name) {
        delete this.attributes[name];
    }

    addEventListener(type, listener) {
        this.listeners[type] = listener;
    }

    querySelector(selector) {
        return findElement(this, element => {
            if (selector.startsWith('.')) return element.className.split(/\s+/).includes(selector.slice(1));
            if (selector.startsWith('#')) return element.id === selector.slice(1);
            return false;
        });
    }
}

class FakeDocument {
    constructor() {
        this.hidden = false;
        this.documentElement = new FakeElement('html');
        this.body = new FakeElement('body');
        this.documentElement.appendChild(this.body);
    }

    addEventListener() {}
    createElement(tagName) { return new FakeElement(tagName); }
    querySelector(selector) { return this.documentElement.querySelector(selector); }
    querySelectorAll() { return []; }
    getElementById(id) { return this.documentElement.querySelector('#' + id); }
}

function findElement(root, predicate) {
    for (const child of root.children) {
        if (predicate(child)) return child;
        const nested = findElement(child, predicate);
        if (nested) return nested;
    }
    return null;
}

function loadBusConfigApi(initialStorage = {}, { homepage = false } = {}) {
    const fileUrl = new URL('darkmode.bus.js', ROOT);
    let source = fs.readFileSync(fileUrl, 'utf8');
    source = source.replace(
        /\}\)\(\);\s*$/,
        'globalThis.__busConfigTestApi = { getBusConfig, showBusConfigModal, insertBusDisplay };})();'
    );

    const values = new Map(Object.entries(initialStorage));
    const localStorage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
    const document = new FakeDocument();
    const window = {
        addEventListener() {},
        location: homepage ? { hostname: 'learn.inside.dtu.dk', pathname: '/d2l/home' }
            : { hostname: 'test.invalid', pathname: '/' }
    };
    window.top = window;

    const sandbox = {
        AbortController,
        CONFIG: {},
        console,
        Date,
        document,
        fetch,
        globalThis: null,
        localStorage,
        Math,
        requestAnimationFrame(callback) { callback(); },
        // The widget's 30 s re-render timer would keep the test process alive.
        setInterval: homepage ? () => 0 : setInterval,
        clearInterval,
        setTimeout,
        clearTimeout,
        URL,
        window
    };
    sandbox.globalThis = sandbox;
    loadDom(sandbox);
    vm.runInNewContext(source, sandbox, { filename: fileUrl.pathname });
    sandbox.DTUAfterDarkBusDeps = {
        getUiState() { return {}; },
        setUiState() {},
        isTopWindow() { return true; },
        isDarkModeEnabled() { return true; },
        markExt(element) { element.setAttribute('data-dtu-ext', '1'); }
    };
    return { ...sandbox.__busConfigTestApi, document };
}

test('an explicitly saved empty bus-line list remains empty when read back', () => {
    const api = loadBusConfigApi({
        [BUS_CONFIG_KEY]: JSON.stringify({
            campuses: ['lyngby'],
            stopIds: ['6015'],
            lines: []
        })
    });

    assert.deepEqual(Array.from(api.getBusConfig().lines), []);
});

test('a missing bus configuration still receives the first-run defaults', () => {
    const api = loadBusConfigApi();

    assert.deepEqual(
        Array.from(api.getBusConfig().lines, line => line.line),
        ['150S', 'L', '40E']
    );
});

test('a saved setup with the discontinued 300S reads back without it', () => {
    const api = loadBusConfigApi({
        [BUS_CONFIG_KEY]: JSON.stringify({
            campuses: ['lyngby'],
            stopIds: ['6015'],
            lines: [{ line: '150S', directions: ['*'] }, { line: '300S', directions: ['*'] }, { line: '40E', directions: ['*'] }]
        })
    });

    assert.deepEqual(Array.from(api.getBusConfig().lines, line => line.line), ['150S', '40E']);
});

test('bus-modal structural dividers remain extension-owned transparent surfaces', () => {
    const addView = loadBusConfigApi({
        [BUS_CONFIG_KEY]: JSON.stringify({
            campuses: ['lyngby', 'ballerup', 'riso'],
            stopIds: ['6015', '2175', '9183'],
            lines: []
        })
    });
    addView.showBusConfigModal();
    const contextDivider = findElement(
        addView.document.body,
        element => element.tagName === 'DIV' && element.style.cssText.includes('border-bottom')
    );

    const manageView = loadBusConfigApi({
        [BUS_CONFIG_KEY]: JSON.stringify({
            campuses: ['lyngby'],
            stopIds: ['6015'],
            lines: [
                { line: '150S', directions: ['*'] },
                { line: '15E', directions: ['Nørreport St.'] }
            ]
        })
    });
    manageView.showBusConfigModal();
    const configuredLineDivider = findElement(
        manageView.document.body,
        element => element.tagName === 'DIV' && element.style.cssText.includes('border-top')
    );

    assert.equal(contextDivider?.getAttribute('data-dtu-ext'), '1');
    assert.equal(configuredLineDivider?.getAttribute('data-dtu-ext'), '1');
});

test('unreadable saved bus settings say so instead of showing the default stops', () => {
    for (const raw of ['{', '"text"']) {
        const api = loadBusConfigApi({ [BUS_CONFIG_KEY]: raw, dtuDarkModeBusEnabled: 'true' }, { homepage: true });
        const nav = new FakeElement('div');
        nav.className = 'd2l-navigation-s-main-wrapper';
        api.document.body.appendChild(nav);
        api.insertBusDisplay();
        const status = nav.querySelector('.dtu-bus-status');
        assert.equal(status && status.textContent, 'Bus settings could not be read');
    }
    const api = loadBusConfigApi({ dtuDarkModeBusEnabled: 'true' }, { homepage: true });
    const nav = new FakeElement('div');
    nav.className = 'd2l-navigation-s-main-wrapper';
    api.document.body.appendChild(nav);
    api.insertBusDisplay();
    assert.equal(nav.querySelector('.dtu-bus-status').textContent, 'Loading bus times', 'no saved settings is a first visit');
});

test('bus setup is a named modal dialog that Escape closes, and each remove button names its line', () => {
    const view = loadBusConfigApi({
        [BUS_CONFIG_KEY]: JSON.stringify({ campuses: ['lyngby'], stopIds: ['6015'], lines: [{ line: '150S', directions: ['*'] }] })
    });
    const keyListeners = [];
    view.document.addEventListener = (type, fn) => { if (type === 'keydown') keyListeners.push(fn); };
    view.document.removeEventListener = (type, fn) => {
        const i = keyListeners.indexOf(fn);
        if (i >= 0) keyListeners.splice(i, 1);
    };
    view.showBusConfigModal();
    const dialog = findElement(view.document.body, el => el.getAttribute('role') === 'dialog');
    assert.ok(dialog, 'the setup box has role dialog');
    assert.equal(dialog.getAttribute('aria-modal'), 'true');
    const titleId = dialog.getAttribute('aria-labelledby');
    assert.ok(titleId && findElement(dialog, el => el.tagName === 'H2' && el.id === titleId), 'labelled by its heading');
    const remove = findElement(dialog, el => el.tagName === 'BUTTON' && el.textContent === '×');
    assert.equal(remove.getAttribute('aria-label'), 'Remove line 150S');

    assert.equal(keyListeners.length, 1, 'one key handler while open');
    const overlay = dialog.parentNode;
    keyListeners[0]({ key: 'Escape', preventDefault() {} });
    assert.equal(overlay.style.opacity, '0', 'Escape closes the dialog');
    assert.equal(keyListeners.length, 0, 'the key handler is removed on close');
});
