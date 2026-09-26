import assert from 'node:assert/strict';
import test from 'node:test';
import { readSource } from './_harness.mjs';

const css = readSource('darkmode.css');
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');

function rules() {
    // Flat walk: returns [selector, body] for every innermost block.
    const out = [];
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(stripped)) !== null) out.push([m[1].trim(), m[2]]);
    return out;
}

test('comments close and braces balance', () => {
    assert.equal((css.match(/\/\*/g) || []).length, (css.match(/\*\//g) || []).length);
    let depth = 0;
    for (const ch of stripped) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
        assert.ok(depth >= 0, 'closing brace without an opener');
    }
    assert.equal(depth, 0);
});

test('hex colours have a valid length', () => {
    const bad = [...stripped.matchAll(/#([0-9a-f]+)\b(?![-\w])/gi)]
        .map((m) => m[1])
        .filter((hex) => ![3, 4, 6, 8].includes(hex.length));
    assert.deepEqual(bad, []);
});

test('declarations are well formed', () => {
    const problems = [];
    for (const [selector, body] of rules()) {
        if (/^@/.test(selector)) continue;
        for (const decl of body.split(';').map((d) => d.trim()).filter(Boolean)) {
            if (!/^(--|-)?[a-z][a-z0-9-]*\s*:/i.test(decl)) problems.push(`${selector} -> ${decl}`);
            if (/!\s+important|!importnat|!imporant/i.test(decl)) problems.push(`${selector} -> ${decl}`);
            if (/:\s*!important/i.test(decl)) problems.push(`${selector} -> empty value`);
        }
    }
    assert.deepEqual(problems, []);
});

test('no rule has an empty selector or a dangling comma', () => {
    for (const [selector] of rules()) {
        assert.ok(selector.length > 0);
        assert.doesNotMatch(selector, /,\s*$|^\s*,|,\s*,/, selector);
    }
});

test('the dark palette stays on its documented tokens', () => {
    // dark 1, dark 2, text, border, hover -- the five colours docs promise.
    for (const token of ['#1a1a1a', '#2d2d2d', '#e0e0e0', '#404040', '#3d3d3d']) {
        assert.ok(css.includes(token), token);
    }
});

test('session-expired login link and Lessons error banner stay dark', () => {
    assert.match(css, /a\.d2l-link\[href\*="sessionExpired=1"\][^{]*\{\s*background-color:\s*#1a1a1a !important;/);
    assert.match(css, /#root-wrapper \.server-error \{[^}]*background-color:\s*#2d2d2d !important;/);
});
