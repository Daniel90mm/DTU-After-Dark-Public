import assert from 'node:assert/strict';
import test from 'node:test';
import { loadModuleInternals, makeLocalStorage, makeLocation, readSource } from './_harness.mjs';

// Just enough DOM for insertMojanglesText: one header container, with the image
// as its child once inserted. Every style/attribute write is counted.
function makeDom() {
    const writes = { style: 0, attr: 0, animate: 0 };
    function makeStyle() {
        const data = {};
        return new Proxy(data, {
            set(target, key, value) { writes.style++; target[key] = String(value); return true; },
            get(target, key) {
                if (key === 'animationName') {
                    const a = target.animation || '';
                    return a === 'none' ? 'none' : (a.split(' ')[0] || '');
                }
                return key in target ? target[key] : '';
            }
        });
    }
    function makeEl(tag) {
        const attrs = new Map();
        const el = {
            tagName: tag.toUpperCase(),
            style: makeStyle(),
            children: [],
            parent: null,
            className: '',
            alt: 'unset',
            getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
            setAttribute: (k, v) => { writes.attr++; attrs.set(k, String(v)); },
            appendChild(child) { child.parent = el; el.children.push(child); return child; },
            remove() { if (el.parent) el.parent.children = el.parent.children.filter((c) => c !== el); el.parent = null; },
            querySelector(sel) {
                if (sel === '.mojangles-text-img') return el.children.find((c) => c.className === 'mojangles-text-img') || null;
                return null;
            },
            querySelectorAll: () => [],
            getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, width: 0, height: 0 }),
            animate() { writes.animate++; return { cancel() {} }; }
        };
        return el;
    }
    const container = makeEl('div');
    const imgs = () => container.children.filter((c) => c.className === 'mojangles-text-img');
    const document = {
        head: makeEl('head'),
        documentElement: makeEl('html'),
        getElementById: () => null,
        createElement: makeEl,
        querySelectorAll(sel) {
            if (sel === '.d2l-labs-navigation-header-container') return [container];
            if (sel === '.mojangles-text-img') return imgs();
            return [];
        }
    };
    return { document, container, imgs, writes };
}

function load({ path = '/d2l/home', enabled = null, reduceMotion = false } = {}) {
    const dom = makeDom();
    const local = makeLocalStorage(enabled === null ? {} : { mojanglesTextEnabled: String(enabled) });
    const deps = {
        isTopWindow: () => true,
        isDarkModeEnabled: () => true,
        getExtensionUrl: (p) => `moz-extension://abc/${p}`,
        markExt: () => {},
        deepQueryAll: (sel) => dom.document.querySelectorAll(sel)
    };
    const { api } = loadModuleInternals('darkmode.learn-shell.js', [
        'insertMojanglesText', 'isMojanglesEnabled', 'isMojanglesTargetPage'
    ], {
        document: dom.document,
        localStorage: local,
        location: makeLocation(`https://learn.inside.dtu.dk${path}`),
        matchMedia: (q) => ({ matches: reduceMotion && /reduce/.test(q) }),
        DTUAfterDarkLearnShellDeps: deps
    });
    return { api, dom, local };
}

test('shows only on the Learn homepage, course homes and Lessons', () => {
    assert.equal(load({ path: '/d2l/home' }).api.isMojanglesTargetPage(), true);
    assert.equal(load({ path: '/d2l/home/296283' }).api.isMojanglesTargetPage(), true);
    assert.equal(load({ path: '/d2l/le/lessons/296283/units/1' }).api.isMojanglesTargetPage(), true);
    assert.equal(load({ path: '/d2l/lms/news/main.d2l' }).api.isMojanglesTargetPage(), false);
});

test('defaults on; follows the stored flag', () => {
    assert.equal(load().api.isMojanglesEnabled(), true);
    assert.equal(load({ enabled: false }).api.isMojanglesEnabled(), false);
});

test('inserts one decorative image that screen readers skip', () => {
    const { api, dom } = load();
    api.insertMojanglesText();
    const [img] = dom.imgs();
    assert.equal(dom.imgs().length, 1);
    assert.equal(img.alt, '');
    assert.equal(img.getAttribute('aria-hidden'), 'true');
    assert.equal(img.getAttribute('src'), 'moz-extension://abc/images/mojangles_text.png');
    assert.match(img.style.cssText, /rotate\(-20deg\)/);
});

test('a repeat run with nothing changed writes nothing (no observer feedback loop)', () => {
    const { api, dom } = load();
    api.insertMojanglesText();
    const after1 = { ...dom.writes };
    for (let i = 0; i < 5; i++) api.insertMojanglesText();
    assert.deepEqual(dom.writes, after1);
    assert.equal(dom.imgs().length, 1);
});

test('the homepage pulse starts once, and not at all with reduced motion', () => {
    const a = load();
    a.api.insertMojanglesText();
    a.api.insertMojanglesText();
    assert.equal(a.dom.writes.animate, 1);
    const b = load({ reduceMotion: true });
    b.api.insertMojanglesText();
    assert.equal(b.dom.writes.animate, 0);
    const c = load({ path: '/d2l/home/296283' });
    c.api.insertMojanglesText();
    assert.equal(c.dom.writes.animate, 0, 'course homes never pulse');
});

test('turning it off removes the image, and turning it back on restores it', () => {
    const { api, dom, local } = load();
    api.insertMojanglesText();
    local.setItem('mojanglesTextEnabled', 'false');
    api.insertMojanglesText();
    assert.equal(dom.imgs().length, 0);
    local.setItem('mojanglesTextEnabled', 'true');
    api.insertMojanglesText();
    assert.equal(dom.imgs().length, 1);
    assert.match(dom.imgs()[0].style.cssText, /display:block/);
});

test('Settings describes what the feature actually does', () => {
    const settings = readSource('darkmode.settings.js');
    assert.match(settings, /tid: 'mojangles-toggle', title: 'Mojangles Splash'/);
    assert.doesNotMatch(settings, /Minecraft font for headers/);
    assert.doesNotMatch(readSource('darkmode.learn-shell.js'), /insertMojanglesToggle/);
});
