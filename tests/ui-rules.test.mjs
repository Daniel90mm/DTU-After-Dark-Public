import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const ROOT = new URL('../', import.meta.url);

// Daniel's permanent rule (2026-09-30): no coloured stripe on one edge of a card, row,
// popup, toast or list item. The only exception he kept is the bus widget's separator
// from the DTU Learn menu links.
const ALLOWED = [/\.dtu-bus-departures\{/];
const STRIPE = /border-(?:left|right)(?:-color)?\s*:\s*(?:\d+(?:\.\d+)?px\s+solid\s+)?(?:var\(--dtu-(?:ad|am)-accent|rgba\(var\(--dtu-ad-accent)/;
// An inset shadow offset only horizontally paints a stripe on one side (e.g. 'inset 4px 0 0 <colour>').
const SHADOW_STRIPE = /inset\s+-?[1-9]\d*px\s+0(?:px)?\s+0(?:px)?\s/;

test('no accent stripe on one edge of any extension UI', () => {
    const files = fs.readdirSync(ROOT).filter(name => /^darkmode.*\.(?:js|css)$/.test(name));
    const offenders = [];
    for (const name of files) {
        const lines = fs.readFileSync(new URL(name, ROOT), 'utf8').split('\n');
        lines.forEach((line, index) => {
            if (SHADOW_STRIPE.test(line)) {
                offenders.push(name + ':' + (index + 1) + ': ' + line.trim().slice(0, 120));
                return;
            }
            if (!STRIPE.test(line)) return;
            // A border on both sides of the same element (an all-round frame) is not a stripe.
            let start = index; while (start > 0 && !lines[start].includes('{')) start--;
            let end = index; while (end < lines.length - 1 && !lines[end].includes('}')) end++;
            const block = lines.slice(start, end + 1).join('\n');
            if (/border-left[^;]*accent/.test(block) && /border-right[^;]*accent/.test(block)) return;
            if (ALLOWED.some(pattern => pattern.test(line) || pattern.test(lines[index - 1] || '') || pattern.test(lines[index - 2] || '') || pattern.test(lines[index - 3] || ''))) return;
            offenders.push(name + ':' + (index + 1) + ': ' + line.trim().slice(0, 120));
        });
    }
    assert.deepEqual(offenders, [], 'use a full 1px border, a background tint or text instead (CLAUDE.md UI Rules)');
});

// A thin absolutely positioned pseudo-element pinned to one side is the same stripe drawn
// another way (the Library event dates had one, 3px wide, until 2026-11-07).
test('no thin pseudo-element stripe pinned to one edge', () => {
    const files = fs.readdirSync(ROOT).filter(name => /^darkmode.*\.(?:js|css)$/.test(name));
    const offenders = [];
    for (const name of files) {
        const source = fs.readFileSync(new URL(name, ROOT), 'utf8');
        for (const match of source.matchAll(/([^{}\n]*::(?:before|after))\s*\{([^}]*)\}/g)) {
            const body = match[2];
            if (!/position\s*:\s*absolute/.test(body)) continue;
            if (!/(?:^|[;{\s])(?:left|right)\s*:\s*0(?:px)?\b/.test(body)) continue;
            if (!/(?:^|[;{\s])width\s*:\s*[1-6]px/.test(body)) continue;
            if (!/background/.test(body)) continue;
            offenders.push(name + ': ' + match[1].trim().slice(0, 100));
        }
    }
    assert.deepEqual(offenders, [], 'use a full 1px border, a background tint or text instead (CLAUDE.md UI Rules)');
});

// The same stripe set from script: style.setProperty('border-left', '3px solid ' + accent).
// A one-side border is allowed only with its opposite side set too (a frame), or 'none'.
test('no one-edge coloured border set from script', () => {
    const files = fs.readdirSync(ROOT).filter(name => /^darkmode.*\.js$/.test(name));
    const offenders = [];
    for (const name of files) {
        const lines = fs.readFileSync(new URL(name, ROOT), 'utf8').split('\n');
        lines.forEach((line, index) => {
            const m = line.match(/setProperty\(\s*'border-(left|right)'\s*,\s*([^,)]+)/);
            if (!m || /^'none'$/.test(m[2].trim())) return;
            const other = m[1] === 'left' ? 'right' : 'left';
            const near = lines.slice(Math.max(0, index - 2), index + 3).join('\n');
            if (new RegExp(`setProperty\\(\\s*'border-${other}'`).test(near)) return;
            offenders.push(name + ':' + (index + 1) + ': ' + line.trim().slice(0, 120));
        });
    }
    assert.deepEqual(offenders, [], 'use a full 1px border, a background tint or text instead (CLAUDE.md UI Rules)');
});

// Global rule: no arrows in UI text (write "to", "then", or nothing).
test('no arrow characters in extension UI text', () => {
    const files = fs.readdirSync(ROOT).filter(name => /^darkmode.*\.(?:js|css)$/.test(name));
    const offenders = [];
    for (const name of files) {
        fs.readFileSync(new URL(name, ROOT), 'utf8').split('\n').forEach((line, index) => {
            if (/^\s*(?:\/\/|\*|\/\*)/.test(line)) return;
            if (/\\u219[0-4]|\\u21d2|[←-↔⇒]/i.test(line)) offenders.push(name + ':' + (index + 1) + ': ' + line.trim().slice(0, 120));
        });
    }
    assert.deepEqual(offenders, []);
});

test('reduce-motion stops extension transitions and animations in both modes', () => {
    const src = fs.readFileSync(new URL('../darkmode.js', import.meta.url), 'utf8');
    const start = src.indexOf('function injectAccentOverrides');
    const block = src.slice(start, src.indexOf('appendChild(style)', start));
    const media = block.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n            \}/);
    assert.ok(media, 'the always-on style has a reduce-motion block');
    assert.match(media[1], /\[data-dtu-ext\]/);
    assert.match(media[1], /transition-duration: 0\.01ms !important/);
    assert.match(media[1], /animation-duration: 0\.01ms !important/);
});

test('a missing DTU page element is warned once, only if still missing 5 s later', async () => {
    const vm = await import('node:vm');
    const src = fs.readFileSync(new URL('../darkmode.js', import.meta.url), 'utf8');
    const block = src.match(/    var _warnedMissingAnchors = \{\};[\s\S]*?\n    \};\n/)[0];
    const timers = [];
    const warned = [];
    const ctx = vm.createContext({ globalThis: {}, setTimeout: (fn, ms) => timers.push([fn, ms]), console: { warn: (m) => warned.push(m) } });
    ctx.globalThis = ctx;
    vm.runInContext(block, ctx);
    const warn = ctx.DTUAfterDarkWarnMissingAnchor;
    let missing = true;
    warn('Course map', 'row', () => missing);
    warn('Course map', 'row', () => missing);
    warn('GPA', 'table', () => false);
    assert.equal(timers.length, 2, 'one check per feature and element');
    assert.ok(timers.every(([, ms]) => ms === 5000));
    timers.forEach(([fn]) => fn());
    assert.equal(warned.length, 1);
    assert.match(warned[0], /Course map: page element not found \(row\)/);
});
