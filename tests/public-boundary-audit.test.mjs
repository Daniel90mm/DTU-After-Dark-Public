import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const auditScript = path.join(projectRoot, 'scripts', 'audit-public-boundary.mjs');

function createTrackedRepo(files) {
    const directory = mkdtempSync(path.join(tmpdir(), 'dtu-public-boundary-'));
    execFileSync('git', ['init', '--quiet'], { cwd: directory });
    for (const [name, content] of Object.entries(files)) {
        const target = path.join(directory, name);
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, content);
    }
    execFileSync('git', ['add', '.'], { cwd: directory });
    return directory;
}

function runAudit(directory) {
    return spawnSync(process.execPath, [auditScript], {
        cwd: directory,
        encoding: 'utf8'
    });
}

test('public boundary accepts an empty public runtime configuration', (t) => {
    const directory = createTrackedRepo({
        'config.js': "const CONFIG = { REJSEPLANEN_API_KEY: '' };\n",
        'README.md': 'Public source tree.\n'
    });
    t.after(() => rmSync(directory, { recursive: true, force: true }));

    const result = runAudit(directory);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Public-boundary audit passed/);
});

test('public boundary rejects archives and machine-specific developer tools', (t) => {
    const directory = createTrackedRepo({
        'release.zip': 'not actually an archive',
        'scripts/instrument-function-hits.mjs': 'export {};\n'
    });
    t.after(() => rmSync(directory, { recursive: true, force: true }));

    const result = runAudit(directory);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /release\.zip/);
    assert.match(result.stderr, /scripts\/instrument-function-hits\.mjs/);
});

test('public boundary rejects a non-empty credential without echoing its value', (t) => {
    const credential = 'sensitive-' + 'value-'.repeat(5);
    const assignment = 'REJSEPLANEN_' + 'API_KEY: ' + JSON.stringify(credential);
    const directory = createTrackedRepo({ 'config.js': `const CONFIG = { ${assignment} };\n` });
    t.after(() => rmSync(directory, { recursive: true, force: true }));

    const result = runAudit(directory);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /credential-like content/);
    assert.doesNotMatch(result.stderr, new RegExp(credential));
});
