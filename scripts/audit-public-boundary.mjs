#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);

const forbiddenExact = new Set([
    'AGENTS.md',
    'CLAUDE.md',
    'PRIVATE_changes.md',
    'AGENT_NOTES.md',
    'config.local.js',
    'secrets.json',
    'scripts/instrument-function-hits.mjs',
    'scripts/make-chrome-webstore-screenshots.ps1'
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
    /(?:^|\/)[^/]+\.log$/,
    /\.(?:zip|7z|rar|tar|tgz|tar\.gz)$/i
];

const credentialPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
    /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
    /\bAIza[0-9A-Za-z_-]{30,}\b/,
    /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/,
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
    /https?:\/\/[^\s/:@]+:[^\s/@]+@/,
    /\bBearer\s+[A-Za-z0-9._~-]{16,}\b/i,
    /\b[A-Za-z0-9_]*(?:api[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|password|passwd)\s*[:=]\s*["'`][^"'`\r\n]{8,}["'`]/i,
    /\bREJSEPLANEN_(?:API_KEY|ACCESS_ID)\s*[:=]\s*["'`][^"'`\r\n]+["'`]/i,
    /[?&](?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)=[^&\s"']{8,}/i
];

const violations = tracked.filter((file) =>
    forbiddenExact.has(file)
    || forbiddenPrefixes.some((prefix) => file.startsWith(prefix))
    || forbiddenPatterns.some((pattern) => pattern.test(file))
);

const contentViolations = tracked.filter((file) => {
    try {
        if (statSync(file).size > 10 * 1024 * 1024) return false;
        const buffer = readFileSync(file);
        if (buffer.includes(0)) return false;
        const content = buffer.toString('utf8');
        return credentialPatterns.some((pattern) => pattern.test(content));
    } catch {
        return false;
    }
});

if (violations.length || contentViolations.length) {
    console.error('Public-boundary audit failed. Local-only files are tracked:');
    for (const file of violations) console.error(`- ${file}`);
    if (contentViolations.length) {
        console.error('Tracked files contain credential-like content (values withheld):');
        for (const file of contentViolations) console.error(`- ${file}`);
    }
    process.exitCode = 1;
} else {
    console.log(`Public-boundary audit passed (${tracked.length} tracked files checked).`);
}
