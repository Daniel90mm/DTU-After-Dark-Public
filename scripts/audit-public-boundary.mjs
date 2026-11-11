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
    /\b[A-Za-z0-9_]*(?:api[_-]?key|api[_-]?token|secret[_-]?key|private[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|password|passwd)\s*[:=]\s*["'`][^"'`\r\n]{8,}["'`]/i,
    /\bREJSEPLANEN_(?:API_KEY|ACCESS_ID)\s*[:=]\s*["'`][^"'`\r\n]+["'`]/i,
    /[?&](?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)=[^&\s"']{8,}/i
];

// Private network names and addresses: tailnet, internal TLDs (URL context only, so a
// file name like config.local.js is fine), RFC 1918 and the 100.64/10 range Tailscale uses.
const privateHostPatterns = [
    /:\/\/(?:[a-z0-9-]+\.)+(?:ts\.net|internal|lan|local|home\.arpa)(?![a-z0-9-])/i,
    /(?<![\d.])(?:10\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3})\.\d{1,3}(?![\d.])/
];

const violations = tracked.filter((file) =>
    forbiddenExact.has(file)
    || forbiddenPrefixes.some((prefix) => file.startsWith(prefix))
    || forbiddenPatterns.some((pattern) => pattern.test(file))
);

function readTrackedText(file) {
    try {
        if (statSync(file).size > 10 * 1024 * 1024) return null;
        const buffer = readFileSync(file);
        return buffer.includes(0) ? null : buffer.toString('utf8');
    } catch {
        return null;
    }
}

const contentViolations = [];
const hostViolations = [];
for (const file of tracked) {
    const content = readTrackedText(file);
    if (content === null) continue;
    if (credentialPatterns.some((pattern) => pattern.test(content))) contentViolations.push(file);
    if (privateHostPatterns.some((pattern) => pattern.test(content))) hostViolations.push(file);
}

if (violations.length || contentViolations.length || hostViolations.length) {
    console.error('Public-boundary audit failed. Local-only files are tracked:');
    for (const file of violations) console.error(`- ${file}`);
    if (contentViolations.length) {
        console.error('Tracked files contain credential-like content (values withheld):');
        for (const file of contentViolations) console.error(`- ${file}`);
    }
    if (hostViolations.length) {
        console.error('Tracked files name a private host or address (values withheld):');
        for (const file of hostViolations) console.error(`- ${file}`);
    }
    process.exitCode = 1;
} else {
    console.log(`Public-boundary audit passed (${tracked.length} tracked files checked).`);
}
