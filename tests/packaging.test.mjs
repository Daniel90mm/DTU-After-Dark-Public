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

function backgroundSourceFiles() {
    return buildSourceFiles().filter((f) => /^background(\..+)?\.js$/.test(f));
}

function backgroundSource() {
    return backgroundSourceFiles().map(readSource).join('\n');
}

test('both manifests ship the same content scripts in the same order', () => {
    assert.deepEqual(chrome.content_scripts, firefox.content_scripts);
});

test('the page-world shadow hook runs on both D2L hosts before their first group', () => {
    const hook = 'darkmode.shadow-hook.page.js';
    const hosts = ['*://learn.inside.dtu.dk/*', '*://s.brightspace.com/*'];
    for (const [name, manifest] of [['manifest.json', firefox], ['manifest_chrome.json', chrome]]) {
        const groups = manifest.content_scripts;
        const hookGroups = groups.filter((cs) => (cs.js || []).includes(hook));
        assert.equal(hookGroups.length, 2, `${name} should have one hook group per D2L host`);
        for (const host of hosts) {
            const entry = hookGroups.find((cs) => cs.matches.length === 1 && cs.matches[0] === host);
            assert.ok(entry, `${name} is missing the ${host} hook group`);
            assert.deepEqual(entry.js, [hook]);
            assert.equal(entry.run_at, 'document_start');
            assert.equal(entry.all_frames, true);
            assert.equal(entry.world, 'MAIN');
            const firstExisting = groups.find((cs) => cs !== entry && cs.matches.includes(host));
            assert.equal(groups.indexOf(entry) + 1, groups.indexOf(firstExisting),
                `${name} ${host} hook must run directly before the host's first group`);
        }
    }
});

test('features turned on at install are real feature flags', () => {
    const block = readSource('background.js').match(/const SOCIAL_ON_AT_INSTALL = \{([\s\S]*?)\};/);
    assert.ok(block, 'SOCIAL_ON_AT_INSTALL found in background.js');
    const keys = [...block[1].matchAll(/(\w+)\s*:/g)].map((m) => m[1]);
    assert.ok(keys.length > 0);
    const flags = readSource('darkmode.feature-flags.js');
    for (const key of keys) {
        const constant = flags.match(new RegExp("const (\\w+) = '" + key + "';"));
        assert.ok(constant, key + ' is not a key in darkmode.feature-flags.js');
        assert.match(flags, new RegExp('\\[' + constant[1] + '\\]:'), key + ' has no default in FEATURE_FLAG_DEFAULTS');
    }
});

// A copied key goes stale when the flag is renamed, and its switch stops working.
test('feature flag keys are spelled out only in darkmode.feature-flags.js', () => {
    // Retired flags: named only to delete them from storage.
    const retired = new Set(['dtuAfterDarkFeatureKurserRoomFinder', 'dtuAfterDarkFeatureStudyplanExamCluster',
        'dtuAfterDarkFeatureKurserScheduleAnnotation', 'dtuAfterDarkFeatureKurserMyLineBadges',
        'dtuAfterDarkFeatureParticipantIntelSemesterTwins', 'dtuAfterDarkFeatureBookFinder']);
    // background.js: SOCIAL_ON_AT_INSTALL, checked against the flags above.
    const skip = new Set(['darkmode.feature-flags.js', 'background.js']);
    for (const file of buildSourceFiles().filter((f) => f.endsWith('.js') && !skip.has(f))) {
        for (const m of readSource(file).matchAll(/['"](dtuAfterDarkFeature\w+)['"]/g)) {
            assert.ok(retired.has(m[1]), file + ' spells out ' + m[1] + '; read it from DTUAfterDarkFeatureFlags');
        }
    }
});

test('an unknown feature flag reads as off', () => {
    const errors = [];
    const sandbox = { console: { error: (msg) => errors.push(msg), warn() {} }, setTimeout: () => 0 };
    sandbox.globalThis = sandbox;
    vm.runInNewContext(readSource('darkmode.feature-flags.js'), sandbox);
    const flags = sandbox.DTUAfterDarkFeatureFlags;
    assert.equal(flags.isFeatureFlagEnabled('dtuAfterDarkFeatureNoSuchThing'), false);
    assert.equal(errors.length, 1);
    assert.equal(flags.isFeatureFlagEnabled(flags.FEATURE_SMART_ROOM_LINKER_KEY), true);
});

// The bus keeps its daily call count, fetch lease and shared cache in the page's
// localStorage, which is per site. On a second site the limit would count twice.
test('the bus runs on DTU Learn only', () => {
    for (const manifest of [firefox, chrome]) {
        for (const group of manifest.content_scripts) {
            if (!(group.js || []).some((f) => /^darkmode\.bus[.a-z]*\.js$/.test(f))) continue;
            assert.deepEqual(group.matches, ['*://learn.inside.dtu.dk/*'], 'bus scripts in a group for ' + group.matches.join(', '));
        }
    }
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
    // Resource matches are origins (path /*); a content-script group may narrow the path.
    const contentHosts = new Set(firefox.content_scripts.flatMap((cs) => cs.matches.map((m) => m.replace(/^(\*:\/\/[^/]+)\/.*$/, '$1/*'))));
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
    for (const file of [...contentScriptFiles(firefox), ...firefox.background.scripts, 'darkmode.css']) {
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

test('darkmode.dom.js loads before every module that reads DTUAfterDarkDom', () => {
    // A top-frame-only group may rely on an earlier all-frames group for the same host and run_at,
    // because the browser injects groups in manifest order into one content-script world.
    const groups = firefox.content_scripts;
    groups.forEach((cs, gi) => {
        const js = cs.js || [];
        js.forEach((file, fi) => {
            if (file === 'darkmode.dom.js' || !readSource(file).includes('DTUAfterDarkDom.')) return;
            const sameGroup = js.indexOf('darkmode.dom.js');
            if (sameGroup > -1 && sameGroup < fi) return;
            const earlier = groups.slice(0, gi).some((prev) => (prev.js || []).includes('darkmode.dom.js')
                && (prev.run_at || '') === (cs.run_at || '')
                && cs.matches.every((m) => prev.matches.some((p) => p.endsWith('/*') && m.startsWith(p.slice(0, -1)))));
            assert.ok(earlier, `${file} in group ${gi} (${cs.matches.join(',')}) has no darkmode.dom.js before it`);
        });
    });
});

test('darkmode.skeleton.js loads before every module that draws skeletons', () => {
    for (const cs of firefox.content_scripts) {
        const js = cs.js || [];
        const users = fs.readdirSync(ROOT).filter((f) => /^darkmode(\..+)?\.js$/.test(f) && f !== 'darkmode.skeleton.js'
            && readSource(f).includes('DTUAfterDarkSkeleton'));
        assert.ok(users.length >= 6, users.join(', '));
        for (const user of users) {
            if (!js.includes(user)) continue;
            const at = js.indexOf('darkmode.skeleton.js');
            assert.ok(at > -1 && at < js.indexOf(user), user + ' on ' + cs.matches.join(','));
        }
    }
});

test('the background message allowlist covers every content-script host', () => {
    const bg = readSource('background.js');
    const block = bg.match(/ALLOWED_SENDER_HOSTS = \[([\s\S]*?)\]/);
    assert.ok(block);
    const allowed = new Set([...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
    const contentHosts = new Set(firefox.content_scripts.flatMap((cs) => cs.matches.map(hostOf)));
    // No exemptions: every all-frames group loads the room linker, which messages the background.
    for (const host of contentHosts) {
        assert.ok(allowed.has(host), `${host} injects scripts but its messages would be dropped`);
    }
    for (const host of allowed) assert.ok(contentHosts.has(host), `${host} allowed but never injected`);
});

test('background fetch targets are covered by host permissions', () => {
    const bg = backgroundSource();
    // Optional hosts count: their fetches run only after permissions.contains() says granted.
    const permitted = new Set([...firefox.permissions, ...(firefox.optional_permissions || [])].filter((p) => p.includes('://')).map(hostOf));
    const fetched = new Set([...bg.matchAll(/['`]https:\/\/([a-z0-9.-]+)\//gi)].map((m) => m[1].toLowerCase()));
    assert.ok(fetched.size > 3);
    for (const host of fetched) assert.ok(permitted.has(host), `background fetches ${host} without a host permission`);
});

test('the optional exchange permission is declared the same way in both manifests', () => {
    assert.deepEqual(firefox.optional_permissions, ['https://beyondborders.dtu.dk/*']);
    assert.deepEqual(chrome.optional_host_permissions, ['https://beyondborders.dtu.dk/*']);
    assert.ok(!(firefox.permissions || []).some((p) => p.includes('beyondborders')), 'must stay optional: a required host disables the extension on update');
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

test('the Windows build scripts copy every file the manifests load', () => {
    const needed = [...contentScriptFiles(firefox), ...firefox.background.scripts, ...firefox.web_accessible_resources.filter((f) => !f.startsWith('images/'))];
    for (const script of ['scripts/build-chrome.ps1', 'scripts/build-firefox.ps1']) {
        const text = readSource(script);
        const missing = needed.filter((f) => !text.includes(`'${f}'`));
        assert.deepEqual(missing, [], `${script} misses ${missing.join(', ')}`);
    }
});

test('the Lessons bulk download files load only on DTU Learn course-content pages', () => {
    const lessons = ['darkmode.lessons-bulk.zip.js', 'darkmode.lessons-bulk.tree.js', 'darkmode.lessons-bulk.fetch.js', 'darkmode.lessons-bulk.pdf-ink.js', 'darkmode.lessons-bulk.activity.js', 'darkmode.lessons-bulk.video.js', 'darkmode.lessons-bulk.js'];
    for (const manifest of [firefox, chrome]) {
        const groups = manifest.content_scripts.filter((cs) => lessons.some((f) => (cs.js || []).includes(f)));
        assert.equal(groups.length, 1);
        assert.deepEqual(groups[0].matches, ['*://learn.inside.dtu.dk/d2l/le/*']);
        assert.deepEqual(groups[0].js, lessons, 'zip, tree, fetch, activity, then the UI');
    }
});
