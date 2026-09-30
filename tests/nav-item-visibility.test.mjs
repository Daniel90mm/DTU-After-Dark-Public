import assert from 'node:assert/strict';
import test from 'node:test';
import { extractFunctions } from './_harness.mjs';

// The Library and Settings nav items re-assert their visibility on every
// feature pass. Each write queues a mutation that wakes the page observer, so a
// second pass over an already-visible item must write nothing.
function makeEl({ hidden = false, children = [] } = {}) {
    const counter = { writes: 0 };
    const props = new Map();
    const attrs = new Map(hidden ? [['data-hidden', '1']] : []);
    const classes = new Set(hidden ? ['d2l-hidden'] : []);
    const el = {
        counter,
        style: {
            getPropertyValue: (k) => (props.get(k) || { v: '' }).v,
            getPropertyPriority: (k) => (props.get(k) || { p: '' }).p,
            setProperty: (k, v, p) => { counter.writes++; props.set(k, { v, p: p || '' }); }
        },
        hasAttribute: (k) => attrs.has(k),
        removeAttribute: (k) => { counter.writes++; attrs.delete(k); },
        classList: {
            contains: (c) => classes.has(c),
            remove: (c) => { counter.writes++; classes.delete(c); }
        },
        matches: () => false,
        querySelectorAll: () => children
    };
    return el;
}

for (const [file, fn] of [
    ['darkmode.library.js', 'applyLibraryNavItemVisibility'],
    ['darkmode.learn-nav.js', 'applyAfterDarkNavItemVisibility']
]) {
    test(`${fn}: unhides once, then writes nothing on later passes`, () => {
        const { api } = extractFunctions(file, ['setNavStyleIfChanged', fn]);
        const child = makeEl();
        const item = makeEl({ hidden: true, children: [child] });
        api[fn](item);
        assert.equal(item.hasAttribute('data-hidden'), false);
        assert.equal(item.classList.contains('d2l-hidden'), false);
        assert.equal(item.style.getPropertyValue('display'), 'block');
        assert.equal(item.style.getPropertyPriority('display'), 'important');
        const first = item.counter.writes + child.counter.writes;
        assert.ok(first > 0);
        for (let i = 0; i < 5; i++) api[fn](item);
        assert.equal(item.counter.writes + child.counter.writes, first);
    });
}
