import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { loadModuleInternals, makeLocation, readSource } from './_harness.mjs';

const HOOK = 'darkmode.shadow-hook.page.js';
const ENGINE_FILES = ['darkmode.dark-engine.page-cases.js', 'darkmode.dark-engine.styles.js', 'darkmode.dark-engine.js'];

function loadPageHook() {
    const calls = [];
    const dispatched = [];

    class FakeElement { }
    class FakeCustomEvent {
        constructor(type, init) {
            this.type = type;
            this.bubbles = !!(init && init.bubbles);
            this.composed = !!(init && init.composed);
        }
    }

    const original = function attachShadow(init) {
        calls.push(init);
        if (original.failure) throw original.failure;
        return { id: `root-${calls.length}`, init };
    };
    FakeElement.prototype.attachShadow = original;
    FakeElement.prototype.dispatchEvent = function dispatchEvent(event) {
        dispatched.push({ target: this, event });
        if (this.dispatchFailure) throw this.dispatchFailure;
        return true;
    };

    const context = vm.createContext({ Element: FakeElement, CustomEvent: FakeCustomEvent });
    const run = () => vm.runInContext(readSource(HOOK), context, { filename: HOOK });
    run();
    return { FakeElement, original, calls, dispatched, run };
}

test('the page hook returns the original root and reports one composed event', () => {
    const { FakeElement, calls, dispatched } = loadPageHook();
    const host = new FakeElement();
    const init = { mode: 'open' };
    const root = host.attachShadow(init);

    assert.equal(host.attachShadow.length, 1);
    assert.equal(host.attachShadow.name, 'attachShadow');
    assert.equal(calls.length, 1);
    assert.deepEqual(plain(root.init), init);
    assert.equal(dispatched.length, 1);
    assert.equal(dispatched[0].target, host);
    assert.equal(dispatched[0].event.type, 'dtu-after-dark-shadow-attached');
    assert.equal(dispatched[0].event.bubbles, true);
    assert.equal(dispatched[0].event.composed, true);
});

test('the page hook rethrows the original attachShadow error unchanged', () => {
    const { FakeElement, original, dispatched } = loadPageHook();
    const host = new FakeElement();
    const failure = new Error('native attach failed');
    original.failure = failure;

    assert.throws(() => host.attachShadow({ mode: 'open' }), (error) => error === failure);
    assert.equal(dispatched.length, 0);
});

test('the page hook swallows a throwing dispatchEvent and still returns the root', () => {
    const { FakeElement } = loadPageHook();
    const host = new FakeElement();
    host.dispatchFailure = new Error('page listener failed');

    const root = host.attachShadow({ mode: 'open' });
    assert.ok(root);
    assert.equal(root.id, 'root-1');
});

test('loading the page hook twice wraps attachShadow once', () => {
    const { FakeElement, run, dispatched } = loadPageHook();
    run();
    const host = new FakeElement();
    host.attachShadow({ mode: 'open' });

    assert.equal(dispatched.length, 1);
    const flag = Object.getOwnPropertyDescriptor(FakeElement.prototype, '__dtuAfterDarkShadowHookInstalled');
    assert.ok(flag);
    assert.equal(flag.enumerable, false);
});

function styleStub() {
    const values = new Map();
    return {
        setProperty(name, value, priority) { values.set(name, { value, priority: priority || '' }); },
        getPropertyValue(name) { return values.has(name) ? values.get(name).value : ''; },
        removeProperty(name) { values.delete(name); }
    };
}

function makeHost(tagName, shadowRoot = null) {
    return {
        nodeType: 1,
        tagName: String(tagName).toUpperCase(),
        id: '',
        className: '',
        style: styleStub(),
        classList: { contains: () => false },
        isConnected: true,
        parentElement: null,
        parentNode: null,
        shadowRoot,
        hasAttribute: () => false,
        getAttribute: () => null,
        setAttribute() { },
        removeAttribute() { }
    };
}

function makeShadowRoot(host) {
    const children = [];
    return {
        nodeType: 11,
        host,
        children,
        getElementById(id) {
            return children.find((child) => child.id === id) || null;
        },
        appendChild(child) {
            children.push(child);
            return child;
        },
        querySelectorAll() { return []; }
    };
}

function makeDocument() {
    const listeners = new Map();
    const doc = {
        readyState: 'loading',
        documentElement: { style: styleStub() },
        body: null,
        addEventListener(type, listener) {
            const list = listeners.get(type) || [];
            list.push(listener);
            listeners.set(type, list);
        },
        createElement(tagName) {
            return { tagName: tagName.toUpperCase(), id: '', textContent: '', style: styleStub() };
        },
        createTreeWalker() { return { nextNode: () => null }; },
        querySelectorAll() { return []; },
        querySelector() { return null; },
        getElementById() { return null; }
    };
    doc.body = makeHost('body');
    doc.body.ownerDocument = doc;
    doc.documentElement.ownerDocument = doc;
    return { doc, listeners };
}

function loadEngine() {
    const { doc, listeners } = makeDocument();
    const timers = new Map();
    const cleared = [];
    const microtasks = [];
    let nextTimer = 1;
    let dark = false;
    let legacy = false;
    let invalidations = 0;

    const loaded = loadModuleInternals(ENGINE_FILES, [
        'handleShadowAttachedEvent',
        'registerShadowAttachedListener',
        'handleShadowHostCandidate'
    ], {
        document: doc,
        window: { location: makeLocation('https://learn.inside.dtu.dk/d2l/home') },
        NodeFilter: { SHOW_ELEMENT: 1 },
        MutationObserver: class { observe() { } },
        customElements: { get: () => ({}), whenDefined: () => Promise.resolve() },
        setTimeout(fn) {
            const id = nextTimer++;
            timers.set(id, fn);
            return id;
        },
        clearTimeout(id) {
            timers.delete(id);
            cleared.push(id);
        },
        queueMicrotask(fn) { microtasks.push(fn); },
        DTUAfterDarkDarkEngineDeps: {
            isDarkModeEnabled: () => dark,
            isLegacyHeavyPage: () => legacy,
            invalidateDeepRoots: () => { invalidations++; },
            forceDTULearnAccentInRoot: () => { },
            seedSmartRoomLinkerShadowRoot: () => { }
        }
    });

    return {
        api: loaded.api,
        doc,
        listeners,
        timers,
        cleared,
        microtasks,
        invalidations: () => invalidations,
        setDark: (value) => { dark = value; },
        setLegacy: (value) => { legacy = value; }
    };
}

function dispatchShadowAttached(harness, host) {
    const list = harness.listeners.get('dtu-after-dark-shadow-attached');
    assert.ok(list && list.length, 'engine listener is registered');
    list.forEach((listener) => listener({ composedPath: () => [host] }));
}

function runMicrotasks(harness) {
    const pending = harness.microtasks.splice(0);
    pending.forEach((fn) => fn());
}

test('a created D2L shadow root is styled at once, with no retry timer', () => {
    const harness = loadEngine();
    harness.setDark(true);
    harness.api.registerShadowAttachedListener();

    const host = makeHost('d2l-button');
    harness.api.handleShadowHostCandidate(host);
    assert.equal(harness.timers.size, 0, 'no per-element retry timer before the hook event');

    const shadowRoot = makeShadowRoot(host);
    host.shadowRoot = shadowRoot;
    dispatchShadowAttached(harness, host);
    assert.equal(harness.microtasks.length, 1);
    runMicrotasks(harness);

    assert.equal(shadowRoot.children.length, 1, 'injectStylesIntoShadowRoot ran once');
    assert.match(shadowRoot.children[0].id, /^dark-mode-shadow-styles/);
    assert.equal(harness.timers.size, 0);
    assert.equal(harness.invalidations(), 1);
});

test('a host inside an excluded container gets no injection', () => {
    const harness = loadEngine();
    harness.setDark(true);
    harness.api.registerShadowAttachedListener();

    const host = makeHost('d2l-button');
    const excluded = makeHost('div');
    excluded.id = 'viewer';
    host.parentElement = excluded;
    const shadowRoot = makeShadowRoot(host);
    host.shadowRoot = shadowRoot;

    dispatchShadowAttached(harness, host);
    runMicrotasks(harness);
    assert.equal(shadowRoot.children.length, 0);
    assert.equal(harness.invalidations(), 0);
});

test('a host inside the shadow root of an excluded host gets no injection (course banner)', () => {
    const harness = loadEngine();
    harness.setDark(true);
    harness.api.registerShadowAttachedListener();

    const banner = makeHost('d2l-image-banner-overlay');
    banner.classList = { contains: (c) => c === 'd2l-image-banner-overlay' };
    const bannerRoot = makeShadowRoot(banner);
    banner.shadowRoot = bannerRoot;
    banner.getRootNode = () => ({ nodeType: 9 });

    const host = makeHost('d2l-button');
    host.getRootNode = () => bannerRoot;
    const shadowRoot = makeShadowRoot(host);
    host.shadowRoot = shadowRoot;

    dispatchShadowAttached(harness, host);
    runMicrotasks(harness);
    assert.equal(shadowRoot.children.length, 0);
    assert.equal(harness.invalidations(), 0);
});

test('a disconnected host gets no injection', () => {
    const harness = loadEngine();
    harness.setDark(true);
    harness.api.registerShadowAttachedListener();

    const host = makeHost('d2l-button');
    host.isConnected = false;
    const shadowRoot = makeShadowRoot(host);
    host.shadowRoot = shadowRoot;

    dispatchShadowAttached(harness, host);
    runMicrotasks(harness);
    assert.equal(shadowRoot.children.length, 0);
    assert.equal(harness.invalidations(), 0);
});

test('dark mode off gets no injection', () => {
    const harness = loadEngine();
    harness.setDark(false);
    harness.api.registerShadowAttachedListener();

    const host = makeHost('d2l-button');
    const shadowRoot = makeShadowRoot(host);
    host.shadowRoot = shadowRoot;

    dispatchShadowAttached(harness, host);
    runMicrotasks(harness);
    assert.equal(shadowRoot.children.length, 0);
    assert.equal(harness.invalidations(), 0);
});

function plain(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
