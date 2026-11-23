// The shared loading placeholder (darkmode.skeleton.js): words for screen readers,
// bars only for the eye, and lines shaped by the caller.
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readSource } from './_harness.mjs';

class Node {
    constructor(tag) { this.tagName = tag; this.children = []; this.attrs = {}; this.style = {}; this.className = ''; this.textContent = ''; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    appendChild(c) { this.children.push(c); return c; }
}

function load() {
    const head = new Node('head');
    const document = { head, createElement: (t) => new Node(t), getElementById: (id) => head.children.find((n) => n.id === id) || null };
    const sandbox = { document };
    sandbox.globalThis = sandbox;
    vm.runInNewContext(readSource('darkmode.skeleton.js'), sandbox);
    return { skel: sandbox.DTUAfterDarkSkeleton, head };
}

test('a skeleton block names what loads and hides its bars from screen readers', () => {
    const { skel, head } = load();
    const marked = [];
    const box = skel.block('Loading deadlines', [
        [['132px', '15px'], ['', '8px', 'dtu-skel-grow']],
        { className: 'dtu-skel-end', bars: [['20px', '40px']] },
        [['30px', '34px'], [['72%', '13px'], ['48%', '11px']]]
    ], (n) => marked.push(n));
    assert.equal(box.attrs.role, 'status');
    assert.equal(box.children[0].className, 'dtu-skel-sr');
    assert.equal(box.children[0].textContent, 'Loading deadlines');
    const [plain, chart, nested] = box.children.slice(1);
    for (const line of [plain, chart, nested]) assert.equal(line.attrs['aria-hidden'], 'true');
    assert.equal(plain.children[1].className, 'dtu-skel dtu-skel-grow');
    assert.deepEqual([plain.children[0].style.width, plain.children[0].style.height], ['132px', '15px']);
    assert.equal(chart.className, 'dtu-skel-line dtu-skel-end');
    assert.equal(nested.children[1].className, 'dtu-skel-line dtu-skel-stack dtu-skel-grow', 'a list of bars becomes a stacked column');
    assert.deepEqual(nested.children[1].children.map((b) => b.style.width), ['72%', '48%']);
    assert.ok(marked.includes(box) && marked.length > 8, 'every node is marked as the extension\'s own');
    assert.equal(head.children.filter((n) => n.id === 'dtu-skeleton-style').length, 1, 'styles added once');
    skel.block('again', [], null);
    assert.equal(head.children.length, 1);
});
