// darkmode.js used to own the shadow-root cache; batch 9 moved it to darkmode.dom.js and left
// darkmode.js reading the old counter, which threw on every DTU Learn page (2026-11-11).
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readSource } from './_harness.mjs';

test('the dark engine reads the shadow-root generation from darkmode.dom.js', () => {
    const ctx = { window: {}, document: {} };
    ctx.globalThis = ctx;
    vm.runInNewContext(readSource('darkmode.dom.js'), ctx);
    const dom = ctx.DTUAfterDarkDom;
    const before = dom.deepRootsGeneration();
    dom.invalidateDeepRoots();
    assert.equal(dom.deepRootsGeneration(), before + 1);
});

test('darkmode.js keeps no reference to the moved cache state', () => {
    assert.doesNotMatch(readSource('darkmode.js'), /_deepRoots|DEEP_ROOTS_TTL_MS/);
});
