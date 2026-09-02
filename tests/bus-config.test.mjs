import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
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
}

function findElement(root, predicate) {
    for (const child of root.children) {
        if (predicate(child)) return child;
        const nested = findElement(child, predicate);
        if (nested) return nested;
    }
    return null;
}

function loadBusConfigApi(initialStorage = {}) {
    const fileUrl = new URL('darkmode.bus.js', ROOT);
    let source = fs.readFileSync(fileUrl, 'utf8');
    source = source.replace(
        /\}\)\(\);\s*$/,
        'globalThis.__busConfigTestApi = { getBusConfig, showBusConfigModal };})();'
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
        location: { hostname: 'test.invalid', pathname: '/' }
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
        setInterval,
        clearInterval,
        setTimeout,
        clearTimeout,
        URL,
        window
    };
    sandbox.globalThis = sandbox;
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
        ['150S', '300S', '40E']
    );
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
