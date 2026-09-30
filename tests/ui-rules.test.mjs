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
