import assert from 'node:assert/strict';
import test from 'node:test';
import { loadModuleInternals, makeLocalStorage, makeLocation, plain, readSource } from './_harness.mjs';

function load(stored = null) {
    const local = makeLocalStorage(stored ? { dtuAfterDarkContentShortcutOverridesV1: JSON.stringify(stored) } : {});
    const location = makeLocation('https://learn.inside.dtu.dk/d2l/home');
    const { api } = loadModuleInternals('darkmode.content-shortcut.js', [
        'normalizeContentShortcutTarget', 'sanitizeContentShortcutOverridesMap', 'normalizeContentShortcutCourseId',
        'applyContentShortcutTargetToButton', 'getCourseNameFromCard', 'setContentShortcutOverride'
    ], {
        localStorage: local,
        location,
        document: { body: null },
        DTUAfterDarkContentShortcutDeps: { isTopWindow: () => false, isContentShortcutEnabled: () => false }
    });
    return api;
}

function makeBtn() {
    const attrs = new Map();
    let writes = 0;
    return {
        getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
        setAttribute: (k, v) => { writes++; attrs.set(k, String(v)); },
        writes: () => writes
    };
}

test('custom targets must stay on DTU Learn', () => {
    const api = load();
    assert.equal(api.normalizeContentShortcutTarget('/d2l/le/lessons/1'), '/d2l/le/lessons/1');
    assert.equal(api.normalizeContentShortcutTarget('d2l/le/content/1/Home'), '/d2l/le/content/1/Home');
    assert.equal(api.normalizeContentShortcutTarget('https://learn.inside.dtu.dk/d2l/home/9?x=1#y'), '/d2l/home/9?x=1#y');
    for (const bad of ['//evil.com/x', '/\\evil.com', '\\\\evil.com', 'https://evil.com/d2l/', 'javascript:alert(1)', 'data:text/html,hi']) {
        assert.equal(api.normalizeContentShortcutTarget(bad), null, bad);
    }
    assert.equal(api.normalizeContentShortcutTarget(''), '');
});

test('stored overrides with bad keys or off-site targets are dropped', () => {
    const api = load();
    assert.deepEqual(plain(api.sanitizeContentShortcutOverridesMap({
        '326408': '/d2l/le/content/326408/Home',
        'https://learn.inside.dtu.dk/d2l/home/111': '/d2l/le/lessons/111',
        'nope': '/d2l/x',
        '222': '/\\evil.com'
    })), { 326408: '/d2l/le/content/326408/Home', 111: '/d2l/le/lessons/111' });
});

test('course ids come from ids or Learn URLs', () => {
    const api = load();
    assert.equal(api.normalizeContentShortcutCourseId('326408'), '326408');
    assert.equal(api.normalizeContentShortcutCourseId('https://learn.inside.dtu.dk/d2l/le/lessons/326408/units/1'), '326408');
    assert.equal(api.normalizeContentShortcutCourseId('hello'), '');
});

test('the button names its course and says when a custom link is used', () => {
    const api = load({ 326408: '/d2l/le/content/326408/Home' });
    const btn = makeBtn();
    assert.equal(api.applyContentShortcutTargetToButton(btn, '326408', '/d2l/le/lessons/326408', '12106 Quantitative methods'), true);
    assert.equal(btn.getAttribute('href'), '/d2l/le/content/326408/Home');
    assert.equal(btn.getAttribute('aria-label'), 'Go to Content: 12106 Quantitative methods (custom link)');
    assert.doesNotMatch(btn.getAttribute('title'), /\|/);
    const plainBtn = makeBtn();
    api.applyContentShortcutTargetToButton(plainBtn, '999', '/d2l/le/lessons/999', '');
    assert.equal(plainBtn.getAttribute('aria-label'), 'Go to Content');
    assert.equal(plainBtn.getAttribute('href'), '/d2l/le/lessons/999');
});

test('re-applying an unchanged button writes nothing', () => {
    const api = load();
    const btn = makeBtn();
    api.applyContentShortcutTargetToButton(btn, '1', '/d2l/le/lessons/1', 'A');
    const n = btn.writes();
    for (let i = 0; i < 5; i++) api.applyContentShortcutTargetToButton(btn, '1', '/d2l/le/lessons/1', 'A');
    assert.equal(btn.writes(), n);
});

test('course names: organisation-name element first, then the card text', () => {
    const api = load();
    const shadow = { querySelector: () => ({ textContent: ' 12106 Quantitative methods (Polytechnical Foundation), ' }) };
    assert.equal(api.getCourseNameFromCard(shadow, null), '12106 Quantitative methods (Polytechnical Foundation)');
    const card = { getAttribute: () => '01005 Advanced Engineering Mathematics 1, Fall 2026, DTU_e26_01005, Ends July 1, 2031' };
    assert.equal(api.getCourseNameFromCard({ querySelector: () => null }, card), '01005 Advanced Engineering Mathematics 1');
});

test('an off-site custom link is refused when saving', () => {
    const api = load();
    assert.equal(api.setContentShortcutOverride('5', '/\\evil.com'), false);
    assert.equal(api.setContentShortcutOverride('5', '/d2l/le/lessons/5/units/2'), true);
});

test('Enter in the edit fields saves', () => {
    assert.match(readSource('darkmode.content-shortcut.js'), /if \(e\.key !== 'Enter'\) return;\s*e\.preventDefault\(\);\s*saveBtn\.click\(\);/);
});

test('Escape is heard on the document, so it still closes after a save re-render', () => {
    const src = readSource('darkmode.content-shortcut.js');
    assert.match(src, /document\.addEventListener\('keydown', onModalKeydown, true\);/);
    assert.match(src, /document\.removeEventListener\('keydown', onModalKeydown, true\);/);
    assert.doesNotMatch(src, /overlay\.addEventListener\('keydown'/);
    assert.match(src, /if \(!editorState && overlay\.isConnected && !overlay\.contains\(document\.activeElement\)\)/);
});
