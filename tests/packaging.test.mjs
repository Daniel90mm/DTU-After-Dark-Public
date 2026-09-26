import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { ROOT, readSource } from './_harness.mjs';

const firefox = JSON.parse(readSource('manifest.json'));
const chrome = JSON.parse(readSource('manifest_chrome.json'));
const gitignore = readSource('.gitignore');
const buildScript = readSource('scripts/build.mjs');

const exists = (file) => fs.existsSync(new URL(file, ROOT));
const hostOf = (pattern) => pattern.replace(/^\*:\/\/|^https:\/\//, '').replace(/\/.*$/, '');

function contentScriptFiles(manifest) {
    return [...new Set(manifest.content_scripts.flatMap((cs) => cs.js || []))];
}

function buildSourceFiles() {
    const block = buildScript.match(/const sourceFiles = \[([\s\S]*?)\];/);
    assert.ok(block, 'sourceFiles list found in scripts/build.mjs');
    return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

test('both manifests ship the same content scripts in the same order', () => {
    assert.deepEqual(chrome.content_scripts, firefox.content_scripts);
});

test('both manifests grant the same host permissions', () => {
    const ffHosts = firefox.permissions.filter((p) => p.includes('://')).sort();
    assert.deepEqual([...chrome.host_permissions].sort(), ffHosts);
    assert.deepEqual(chrome.permissions, ['storage']);
});

test('web-accessible resources match between manifests and exist', () => {
    const chromeResources = chrome.web_accessible_resources.flatMap((entry) => entry.resources);
    assert.deepEqual(chromeResources, firefox.web_accessible_resources);
    for (const file of chromeResources) assert.ok(exists(file), file);
    const contentHosts = new Set(firefox.content_scripts.flatMap((cs) => cs.matches));
    assert.deepEqual(new Set(chrome.web_accessible_resources[0].matches), contentHosts);
});

test('every file a manifest names exists on disk', () => {
    for (const manifest of [firefox, chrome]) {
        for (const file of contentScriptFiles(manifest)) assert.ok(exists(file), file);
        for (const file of Object.values(manifest.icons)) assert.ok(exists(file), file);
    }
    assert.ok(exists(chrome.background.service_worker));
    for (const file of firefox.background.scripts) assert.ok(exists(file), file);
});

test('the build copies every shipped script and the stylesheet', () => {
    const built = new Set(buildSourceFiles());
    for (const file of [...contentScriptFiles(firefox), 'background.js', 'darkmode.css']) {
        assert.ok(built.has(file), `${file} missing from scripts/build.mjs sourceFiles`);
    }
    for (const file of built) assert.ok(exists(file), `build lists missing file ${file}`);
});

test('every root darkmode.*.js module is loaded by some content script', () => {
    const loaded = new Set(contentScriptFiles(firefox));
    const modules = fs.readdirSync(ROOT).filter((f) => /^darkmode(\..+)?\.js$/.test(f));
    for (const file of modules) assert.ok(loaded.has(file), `${file} is never injected`);
});

test('every shipped file is whitelisted for the public repo', () => {
    const shipped = new Set([...buildSourceFiles(), 'manifest.json', 'manifest_chrome.json']);
    for (const file of shipped) {
        assert.ok(gitignore.includes(`!/${file}\n`), `${file} not whitelisted in .gitignore`);
    }
});

test('config.js loads before darkmode.js wherever both are injected', () => {
    for (const cs of firefox.content_scripts) {
        const js = cs.js || [];
        if (js.includes('darkmode.js')) {
            assert.ok(js.indexOf('config.js') > -1 && js.indexOf('config.js') < js.indexOf('darkmode.js'), cs.matches.join(','));
            assert.ok(js.indexOf('darkmode.js') < js.indexOf('darkmode.dark-engine.js'), 'engine after bootstrap');
        }
    }
});

test('the background message allowlist covers every content-script host', () => {
    const bg = readSource('background.js');
    const block = bg.match(/ALLOWED_SENDER_HOSTS = \[([\s\S]*?)\]/);
    assert.ok(block);
    const allowed = new Set([...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
    const contentHosts = new Set(firefox.content_scripts.flatMap((cs) => cs.matches.map(hostOf)));
    // eksamensplan only gets dark mode, which never messages the background.
    const darkOnly = new Set(['eksamensplan.dtu.dk']);
    for (const host of contentHosts) {
        if (darkOnly.has(host)) continue;
        assert.ok(allowed.has(host), `${host} injects scripts but its messages would be dropped`);
    }
    for (const host of allowed) assert.ok(contentHosts.has(host), `${host} allowed but never injected`);
});

test('background fetch targets are covered by host permissions', () => {
    const bg = readSource('background.js');
    const permitted = new Set(firefox.permissions.filter((p) => p.includes('://')).map(hostOf));
    const fetched = new Set([...bg.matchAll(/['`]https:\/\/([a-z0-9.-]+)\//gi)].map((m) => m[1].toLowerCase()));
    assert.ok(fetched.size > 3);
    for (const host of fetched) assert.ok(permitted.has(host), `background fetches ${host} without a host permission`);
});

test('every shipped script compiles', () => {
    for (const file of [...buildSourceFiles().filter((f) => f.endsWith('.js'))]) {
        assert.doesNotThrow(() => new vm.Script(readSource(file), { filename: file }), file);
    }
});

test('config.js tracks only safe defaults', () => {
    const config = readSource('config.js');
    assert.doesNotMatch(config, /(api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{8,}/i);
    assert.ok(!exists('config.local.js') || !gitignore.includes('!/config.local.js'), 'config.local.js must stay untracked');
});
