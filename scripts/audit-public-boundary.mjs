#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);

const forbiddenExact = new Set([
    'AGENTS.md',
    'CLAUDE.md',
    'PRIVATE_changes.md',
    'AGENT_NOTES.md',
    'config.local.js',
    'secrets.json'
]);

const forbiddenPrefixes = [
    '.claude/',
    '.dtu-dev/',
    'data/',
    'dist/',
    'dtu_recon_output/',
    'infra/',
    'memory/',
    'node_modules/'
];

const forbiddenPatterns = [
    /(?:^|\/)\.env(?:\.|$)/,
    /(?:^|\/)worker-deps-[^/]+\.json$/,
    /(?:^|\/)[^/]+\.log$/
];

const violations = tracked.filter((file) =>
    forbiddenExact.has(file)
    || forbiddenPrefixes.some((prefix) => file.startsWith(prefix))
    || forbiddenPatterns.some((pattern) => pattern.test(file))
);

if (violations.length) {
    console.error('Public-boundary audit failed. Local-only files are tracked:');
    for (const file of violations) console.error(`- ${file}`);
    process.exitCode = 1;
} else {
    console.log(`Public-boundary audit passed (${tracked.length} tracked files checked).`);
}
