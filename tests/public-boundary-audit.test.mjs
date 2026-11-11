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

// Fixture hosts and tokens are assembled at runtime so this tracked file never holds one whole.
const dot = '.';
test('public boundary rejects private hostnames and addresses', (t) => {
    const bad = {
        'tailnet.js': `fetch("https://box${dot}tail1234${dot}ts${dot}net/x");\n`,
        'internal.js': `const u = "http://build${dot}corp${dot}internal/health";\n`,
        'lan.md': `See http://nas${dot}lan:8080 for logs.\n`,
        'cgnat.sh': `ssh user@${[100, 73, 106, 62].join(dot)}\n`,
        'rfc1918.json': `{"host": "${[192, 168, 1, 20].join(dot)}"}\n`,
        'ten.js': `const h = '${[10, 0, 4, 7].join(dot)}';\n`
    };
    const directory = createTrackedRepo(bad);
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const result = runAudit(directory);
    assert.equal(result.status, 1);
    for (const file of Object.keys(bad)) assert.match(result.stderr, new RegExp(file.replace('.', '\\.')));
});

test('public boundary accepts public DTU hosts, config.local.js mentions and version numbers', (t) => {
    const directory = createTrackedRepo({
        'ok.js': "fetch('https://learn.inside.dtu.dk/d2l/api');\n// overrides go in config.local.js\nconst v = '10.0.4';\n",
        'README.md': 'Version 1.10.0 works in Firefox 128.0.3.\n'
    });
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const result = runAudit(directory);
    assert.equal(result.status, 0, result.stderr);
});

test('public boundary rejects a bare API token or secret key assignment', (t) => {
    const value = ['not', 'for', 'public', 'a'.repeat(24)].join('-');
    const directory = createTrackedRepo({
        'a.js': 'const ' + ['API', 'TOKEN'].join('_') + ' = ' + JSON.stringify(value) + ';\n',
        'b.js': 'const ' + ['secret', 'Key'].join('') + ' = ' + JSON.stringify(value) + ';\n'
    });
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const result = runAudit(directory);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /a\.js/);
    assert.match(result.stderr, /b\.js/);
    assert.doesNotMatch(result.stderr, new RegExp(value));
});
