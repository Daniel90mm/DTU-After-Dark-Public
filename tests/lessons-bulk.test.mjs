import assert from 'node:assert/strict';
import test from 'node:test';
import zlib from 'node:zlib';
import { extractFunctions, loadModulesInternals, makeLocation, plain } from './_harness.mjs';

// A non-Learn host keeps the module's page-load init from running.
const location = makeLocation('https://learn.inside.dtu.dk/d2l/le/lessons/123');
const { api } = loadModulesInternals(['darkmode.lessons-bulk.zip.js', 'darkmode.lessons-bulk.tree.js', 'darkmode.lessons-bulk.fetch.js', 'darkmode.lessons-bulk.pdf-ink.js', 'darkmode.lessons-bulk.activity.js', 'darkmode.lessons-bulk.video.js', 'darkmode.lessons-bulk.js'], [
    'toAbsoluteSamePageUrl',
    'decodeEscapedUrlText',
    'isLikelyDownloadUrl',
    'isStrictFileDownloadUrl',
    'getFilenameFromContentDisposition',
    'getFilenameFromUrl',
    'hasFilenameExtension',
    'isGenericDownloadFileName',
    'getExtensionFromUrlPath',
    'getExtensionFromContentType',
    'resolveDownloadFileName',
    'sanitizeZipEntryName',
    'crc32Bytes',
    'buildStoreOnlyZipBlob',
    'buildLessonsTocIndex',
    'classifyTopicFromTocIndex',
    'shouldStartNewZipPart',
    'isTooLargeForZipEntry',
    'getZipPartFileName'
], { location: { ...location, hostname: 'not-learn.test' } });

// The URL checks compare against the page host, so give them the real one.
const learnModule = loadModulesInternals(['darkmode.lessons-bulk.zip.js', 'darkmode.lessons-bulk.tree.js', 'darkmode.lessons-bulk.fetch.js', 'darkmode.lessons-bulk.pdf-ink.js', 'darkmode.lessons-bulk.activity.js', 'darkmode.lessons-bulk.video.js', 'darkmode.lessons-bulk.js'], [
    'isLikelyDownloadUrl',
    'isStrictFileDownloadUrl',
    'classifyTopicFromTocIndex'
], {
    location,
    document: { querySelectorAll: () => [], getElementById: () => null, addEventListener() {} }
});
const learn = learnModule.api;
const learnToc = learnModule.api;

const LEARN = 'https://learn.inside.dtu.dk';

test('relative URLs resolve; javascript: and mailto: are dropped', () => {
    assert.equal(api.toAbsoluteSamePageUrl('/content/enforced/1/a.pdf', LEARN + '/d2l/x'), LEARN + '/content/enforced/1/a.pdf');
    assert.equal(api.toAbsoluteSamePageUrl('javascript:alert(1)', LEARN), '');
    assert.equal(api.toAbsoluteSamePageUrl('  MAILTO:a@b.dk', LEARN), '');
    assert.equal(api.toAbsoluteSamePageUrl('', LEARN), '');
});

test('escaped URLs from inline JSON and HTML attributes decode', () => {
    assert.equal(api.decodeEscapedUrlText('"https:\\/\\/learn.inside.dtu.dk\\/a.pdf?x=1&amp;y=2",'),
        'https://learn.inside.dtu.dk/a.pdf?x=1&y=2');
    assert.equal(api.decodeEscapedUrlText('https\\u003a\\u002f\\u002fa.dk\\u002fb'), 'https://a.dk/b');
});

test('only same-host course files count as downloads', () => {
    const yes = [
        LEARN + '/content/enforced/296283-XX/slides',
        LEARN + '/files/week1.pdf',
        LEARN + '/x/notebook.ipynb?v=2',
        LEARN + '/x/lab.m'
    ];
    const no = [
        'https://evil.example/content/enforced/a.pdf',
        LEARN + '/d2l/le/lessons/123/topics/4',
        LEARN + '/d2l/error/404.pdf',
        LEARN + '/lib/bsi/icon.svg',
        LEARN + '/app/bundle.js',
        LEARN + '/some/page',
        'ftp://learn.inside.dtu.dk/a.pdf'
    ];
    for (const url of yes) assert.equal(learn.isStrictFileDownloadUrl(url), true, url);
    for (const url of no) assert.equal(learn.isStrictFileDownloadUrl(url), false, url);
});

test('Content-Disposition filenames: RFC 5987 form wins and is decoded', () => {
    assert.equal(api.getFilenameFromContentDisposition(`attachment; filename="plain.pdf"; filename*=UTF-8''%C3%98velse%201.pdf`), 'Øvelse 1.pdf');
    assert.equal(api.getFilenameFromContentDisposition('attachment; filename="Week 1.pdf"'), 'Week 1.pdf');
    assert.equal(api.getFilenameFromContentDisposition('inline'), '');
    assert.equal(api.getFilenameFromContentDisposition(`attachment; filename*=UTF-8''bad%E0`), 'bad%E0');
});

test('URL filenames and extensions', () => {
    assert.equal(api.getFilenameFromUrl(LEARN + '/c/e/Lecture%201.pdf?a=1'), 'Lecture 1.pdf');
    assert.equal(api.getFilenameFromUrl(LEARN + '/c/e/folder/'), 'downloaded-file');
    assert.equal(api.getExtensionFromUrlPath(LEARN + '/a/B.PDF'), '.pdf');
    assert.equal(api.getExtensionFromUrlPath(LEARN + '/a/noext'), '');
    assert.equal(api.hasFilenameExtension('x.docx'), true);
    assert.equal(api.hasFilenameExtension('README'), false);
    // A version number is not an extension, so "Lecture 5.1" still gets ".pdf" appended.
    assert.equal(api.hasFilenameExtension('Lecture 5.1'), false);
    assert.equal(api.hasFilenameExtension('notes.7z'), true);
});

test('generic names are recognised so a better hint can replace them', () => {
    for (const name of ['', 'download', 'download.pdf', 'file-3', 'downloaded-file', 'FILE']) {
        assert.equal(api.isGenericDownloadFileName(name), true, name);
    }
    assert.equal(api.isGenericDownloadFileName('Lecture 3.pdf'), false);
});

test('content types map to extensions, including C/C++ source variants', () => {
    assert.equal(api.getExtensionFromContentType('application/pdf; charset=binary'), '.pdf');
    assert.equal(api.getExtensionFromContentType('application/vnd.openxmlformats-officedocument.presentationml.presentation'), '.pptx');
    assert.equal(api.getExtensionFromContentType('text/x-c++src'), '.cpp');
    assert.equal(api.getExtensionFromContentType('text/x-c'), '.c');
    assert.equal(api.getExtensionFromContentType('application/octet-stream'), '');
});

test('resolved names fall back sensibly and gain an extension', () => {
    assert.equal(api.resolveDownloadFileName(LEARN + '/c/e/slides', '', 'application/pdf', 0), 'downloaded-file.pdf');
    assert.equal(api.resolveDownloadFileName(LEARN + '/c/e/x', 'attachment; filename="Notes"', 'text/plain', 4), 'Notes.txt');
});

test('zip entry names cannot escape the archive or break file systems', () => {
    assert.equal(api.sanitizeZipEntryName('../../etc/passwd', 'f'), '_.._etc_passwd');
    assert.equal(api.sanitizeZipEntryName('a:b*c?"d<e>f|g', 'f'), 'a_b_c__d_e_f_g');
    assert.equal(api.sanitizeZipEntryName('...hidden...', 'f'), 'hidden');
    assert.equal(api.sanitizeZipEntryName('   ', 'fallback'), 'fallback');
    assert.equal(api.sanitizeZipEntryName('x'.repeat(300), 'f').length, 180);
    assert.doesNotMatch(api.sanitizeZipEntryName('a\u0000b\u001fc', 'f'), /[\u0000-\u001f]/);
});

test('CRC-32 matches zlib', () => {
    for (const text of ['', 'a', 'The quick brown fox', 'æøå'.repeat(50)]) {
        const bytes = new TextEncoder().encode(text);
        assert.equal(api.crc32Bytes(bytes), zlib.crc32(bytes), text);
    }
});

test('the store-only zip is structurally valid and round-trips its files', async () => {
    const files = [
        { name: 'Week 1/Øvelse.txt', bytes: new TextEncoder().encode('hello'), date: new Date(2026, 8, 26, 14, 30, 10) },
        { name: 'empty.bin', bytes: new Uint8Array(0) },
        { name: 'b.bin', bytes: Uint8Array.from({ length: 1000 }, (_, i) => i % 256) }
    ];
    const blob = api.buildStoreOnlyZipBlob(files);
    assert.equal(blob.type, 'application/zip');
    const buf = Buffer.from(await blob.arrayBuffer());

    const eocd = buf.length - 22;
    assert.equal(buf.readUInt32LE(eocd), 0x06054b50);
    assert.equal(buf.readUInt16LE(eocd + 10), files.length);
    let ptr = buf.readUInt32LE(eocd + 16);
    assert.equal(ptr + buf.readUInt32LE(eocd + 12), eocd, 'central directory ends at EOCD');

    for (const file of files) {
        assert.equal(buf.readUInt32LE(ptr), 0x02014b50);
        assert.equal(buf.readUInt16LE(ptr + 8) & 0x0800, 0x0800, 'UTF-8 name flag');
        const nameLen = buf.readUInt16LE(ptr + 28);
        const localOffset = buf.readUInt32LE(ptr + 42);
        assert.equal(buf.toString('utf8', ptr + 46, ptr + 46 + nameLen), file.name);

        assert.equal(buf.readUInt32LE(localOffset), 0x04034b50);
        const size = buf.readUInt32LE(localOffset + 18);
        const localNameLen = buf.readUInt16LE(localOffset + 26);
        const dataStart = localOffset + 30 + localNameLen;
        const data = buf.subarray(dataStart, dataStart + size);
        assert.deepEqual(new Uint8Array(data), file.bytes);
        assert.equal(buf.readUInt32LE(localOffset + 14), zlib.crc32(data));
        ptr += 46 + nameLen;
    }

    const dosTime = buf.readUInt16LE(10);
    const dosDate = buf.readUInt16LE(12);
    assert.deepEqual([dosDate >> 9, (dosDate >> 5) & 15, dosDate & 31], [2026 - 1980, 9, 26]);
    assert.deepEqual([dosTime >> 11, (dosTime >> 5) & 63, (dosTime & 31) * 2], [14, 30, 10]);
});

// Shape of GET /d2l/api/le/<v>/<ou>/content/toc (trimmed to the fields used).
const TOC = {
    Modules: [{
        ModuleId: 10, Title: 'Week 1', Topics: [
            { TopicId: 1250101, TypeIdentifier: 'File', Url: '/content/enforced/326408-X/Week 1 slides.pdf', Title: 'Slides' },
            { TopicId: 1250102, TypeIdentifier: 'Link', Url: 'https://doi.org/10.1/abc', Title: 'Paper' },
            { TopicId: 1250103, TypeIdentifier: 'Link', Url: '/d2l/common/dialogs/quickLink/quickLink.d2l?ou=1', Title: 'Submit' }
        ],
        Modules: [{
            ModuleId: 11, Title: 'Sub', Topics: [
                { TopicId: 1250104, TypeIdentifier: 'File', Url: '/content/enforced/326408-X/page.html', Title: 'Web page' },
                { TopicId: 1250105, TypeIdentifier: 'File', Url: '/d2l/lor/viewer/x', Title: 'Odd file' }
            ], Modules: []
        }]
    }]
};

test('the course TOC indexes every topic, nested modules included', () => {
    const index = api.buildLessonsTocIndex(TOC);
    assert.equal(index.size, 5);
    assert.equal(index.get('1250104').type, 'File');
    assert.equal(api.buildLessonsTocIndex(null).size, 0);
    assert.equal(api.buildLessonsTocIndex({ Modules: 'nope' }).size, 0);
});

test('TOC classification: files resolve directly, links are never files', () => {
    const index = api.buildLessonsTocIndex(TOC);
    const topic = (id) => LEARN + '/d2l/le/lessons/326408/topics/' + id;
    assert.deepEqual(learnClassify(index, topic(1250101)), { links: [LEARN + '/content/enforced/326408-X/Week%201%20slides.pdf'], notFile: false });
    assert.deepEqual(learnClassify(index, topic(1250102)), { links: [], notFile: true });
    assert.deepEqual(learnClassify(index, topic(1250103)), { links: [], notFile: true });
    // Course-authored HTML pages are bundled as themselves, as the API path always did.
    assert.deepEqual(learnClassify(index, topic(1250104)), { links: [LEARN + '/content/enforced/326408-X/page.html'], notFile: false });
});

test('TOC classification falls back for anything it cannot answer', () => {
    const index = api.buildLessonsTocIndex(TOC);
    const topic = (id) => LEARN + '/d2l/le/lessons/326408/topics/' + id;
    assert.equal(learnClassify(index, topic(1250105)), null, 'non-enforced file URLs use the old path');
    assert.equal(learnClassify(index, topic(1259999)), null, 'unknown topic');
    assert.equal(learnClassify(index, LEARN + '/d2l/le/lessons/326408/units/10'), null, 'units are not topics');
    assert.equal(learnClassify(null, topic(1250101)), null, 'no index loaded');
});

function learnClassify(index, url) {
    const r = learnToc.classifyTopicFromTocIndex(index, url);
    return r === null ? null : JSON.parse(JSON.stringify(r));
}

test('zip parts: a new part starts only when the next file would overflow a non-empty part', () => {
    const limits = { maxBytes: 100, maxEntries: 3 };
    assert.equal(api.shouldStartNewZipPart(0, 0, 500, limits), false, 'an oversized file still gets a part of its own');
    assert.equal(api.shouldStartNewZipPart(60, 1, 40, limits), false, 'exactly at the limit fits');
    assert.equal(api.shouldStartNewZipPart(60, 1, 41, limits), true);
    assert.equal(api.shouldStartNewZipPart(10, 3, 1, limits), true, 'entry cap');
    assert.equal(api.shouldStartNewZipPart(10, 2, 1, limits), false);
});

test('zip parts: default limits keep every part far below the 4 GiB ZIP32 ceiling', () => {
    assert.equal(api.shouldStartNewZipPart(1.9e9, 100, 0.2e9), true);
    assert.equal(api.shouldStartNewZipPart(1.0e9, 100, 0.2e9), false);
    assert.equal(api.shouldStartNewZipPart(1, 65000, 1), true, 'entry count stays under 65535');
});

test('files ZIP32 cannot hold are refused up front', () => {
    assert.equal(api.isTooLargeForZipEntry(2 ** 32), true);
    assert.equal(api.isTooLargeForZipEntry(2 ** 32 - 1), true, 'no room left for the headers');
    assert.equal(api.isTooLargeForZipEntry(3.5e9), false);
    assert.equal(api.isTooLargeForZipEntry(0), false);
    assert.equal(api.isTooLargeForZipEntry(NaN), false, 'unknown size is not refused');
});

test('zip part names: plain when there is one part, numbered once split', () => {
    assert.equal(api.getZipPartFileName('Course - Course Content - 20260926', 1, false), 'Course - Course Content - 20260926.zip');
    assert.equal(api.getZipPartFileName('Course - Course Content - 20260926', 1, true), 'Course - Course Content - 20260926 - part 1.zip');
    assert.equal(api.getZipPartFileName('Course', 12, true), 'Course - part 12.zip');
    assert.equal(api.getZipPartFileName('', 2, true), 'DTU-Learn-Bulk-Download - part 2.zip');
    assert.doesNotMatch(api.getZipPartFileName('a/b:c', 1, false), /[/:]/);
});

// Exercise cancellation against a pending metadata request. No course material
// is fetched: scanned topics are explicitly non-file topics.
async function runnerFixture({ legacy = false, extra = {} } = {}) {
    const { extractFunctions } = await import('./_harness.mjs');
    const pending = [], legacyPending = [];
    const statuses = [];
    let enabled = true, lessonsPage = true;
    const { api } = extractFunctions('darkmode.lessons-bulk.js', [
        'runLessonsBulkDownload', 'cancelLessonsBulkRun', 'resetLessonsBulkState',
        'throwIfLessonsBulkAborted', 'isLessonsBulkRunAborted', 'getLessonsBulkStateRefs',
        'describeLessonsBulkEmptyResult'
    ], {
        prelude: `let _lessonsBulkState = {
                uiState: { sections: [], running: false },
                urlNameHints: new Map(),
                legacyApiSectionsCache: { orgUnitId: '', sections: [], loading: false, promise: null, ts: 0, lastAttemptTs: 0, source: '' },
                legacyModuleStructureCache: new Map(),
                runAbort: null,
                zipPartsSaved: 0
            };
            let _lessonsBulkUiState = _lessonsBulkState.uiState;
            let _lessonsBulkUrlNameHints = _lessonsBulkState.urlNameHints;
            let _lessonsLegacyApiSectionsCache = _lessonsBulkState.legacyApiSectionsCache;
            let _lessonsLegacyModuleStructureCache = _lessonsBulkState.legacyModuleStructureCache;
            const LESSONS_BULK_SCAN_CONCURRENCY = 4;`,
        globals: {
            AbortController, document: {},
            isLessonsBulkDownloadEnabled: () => enabled,
            isDTULearnLessonsPage: () => lessonsPage,
            isLegacyLessonsTreeDocument: () => legacy,
            maybeStartLegacyApiSectionsHydration() {}, refreshLessonsBulkDownloadUi() {},
            legacySectionHasOnlyUnitUrls: s => !!s.key,
            resolveLegacySectionUnitUrlsViaHiddenFrame: () => new Promise(resolve => legacyPending.push(resolve)),
            applyResolvedUrlsToLegacySections() {},
            buildLegacySectionsViaHiddenFrame: async () => [],
            parseLegacySectionObjectId: s => String(s && s.objectId || ''),
            sanitizeLessonsSectionUnitUrls: a => a,
            logLessonsBulkDebug() {},
            setLessonsBulkControlsDisabled() {},
            updateLessonsBulkRunButton() {},
            setLessonsBulkStatus: (root, text) => statuses.push(text),
            getCurrentLessonsOrgUnitId: () => '123',
            parseLessonsTopicIds: () => null,
            loadLessonsTocIndex: () => new Promise(resolve => pending.push(resolve)),
            fetchLessonsUnitDownloadResult: async () => ({ links: [], notFile: true }),
            getTopicLabelHintFromTopicUrl: () => '',
            collectTopicFileUrlsInCurrentPage: async () => [],
            downloadSingleBundledZipFromUrls: async () => ({ ok: false }),
            lessonsBulkDelay: async () => {},
            isStrictFileDownloadUrl: () => false,
            ...extra
        }
    });
    const root = { isConnected: true, ownerDocument: {}, querySelectorAll: (sel) => (/data-activity-key/.test(sel) ? [] : [{ checked: true, getAttribute: () => 'section' }]) };
    const seed = () => { api.getLessonsBulkStateRefs().uiState.sections = [{key:'section',unitUrls:['https://learn.inside.dtu.dk/d2l/le/lessons/123/topics/456']}]; };
    seed();
    return { api, root, seed, pending, legacyPending, statuses, enable(v) { enabled = v; }, page(v) { lessonsPage = v; } };
}
test('turning download off and back on cannot overlap a still-cancelling run', async () => {
    const f = await runnerFixture();
    const first = f.api.runLessonsBulkDownload(f.root);
    assert.equal(f.pending.length, 1);
    f.api.resetLessonsBulkState();
    f.seed();
    const second = f.api.runLessonsBulkDownload(f.root);
    const callsBeforeSettlement = f.pending.length;
    f.pending.forEach(resolve => resolve());
    await Promise.all([first, second]);
    assert.equal(callsBeforeSettlement, 1, 'the previous abort controller must remain active until its run settles');
    assert.ok(f.statuses.some(s => /Cancelled/.test(s)));
    const third = f.api.runLessonsBulkDownload(f.root);
    assert.equal(f.pending.length, 2, 'a fresh run may start after cancellation finishes');
    f.pending[1]();
    await third;
});
test('a run that saved files ends with DTU\'s do-not-forward rule; a run that saved nothing does not', async () => {
    const FORWARD_NOTE = 'For your own study: do not forward.';
    const extra = {
        _lessonsBulkActivity: { FORWARD_NOTE, collectCourseActivity: async () => ({ entries: [], notes: [], failed: [] }) },
        _lessonsBulkVideo: { isVideoUrl: () => false },
        loadLessonsTocIndex: async () => null,
        fetchLessonsUnitDownloadResult: async () => ({ links: ['https://learn.inside.dtu.dk/content/enforced/123/notes.pdf'] }),
        isStrictFileDownloadUrl: () => true,
        describeLessonsBundleResult: () => 'Saved 1 file.'
    };
    const ok = await runnerFixture({ extra: { ...extra, downloadSingleBundledZipFromUrls: async () => ({ ok: true, failedNames: [] }) } });
    await ok.api.runLessonsBulkDownload(ok.root);
    assert.match(ok.statuses.at(-1), /Saved 1 file\. For your own study: do not forward\./);
    const bad = await runnerFixture({ extra: { ...extra, downloadSingleBundledZipFromUrls: async () => ({ ok: false }) } });
    await bad.api.runLessonsBulkDownload(bad.root);
    assert.doesNotMatch(bad.statuses.at(-1), /forward/);
});

test('disabled content download does not request metadata or files', async () => {
    const f = await runnerFixture();
    f.enable(false);
    await f.api.runLessonsBulkDownload(f.root);
    assert.equal(f.pending.length, 0);
});

test('late Lessons TOC mounting is placed on page changes and stops when mounted', async () => {
    const { extractFunctions, readSource } = await import('./_harness.mjs');
    let passes = 0, enabled = true, placement = null;
    const { api, context } = extractFunctions('darkmode.lessons-bulk.js', ['runLessonsBulkDownloadChecks', ...(readSource('darkmode.lessons-bulk.js').includes('function scheduleLessonsBulkBootstrap(') ? ['scheduleLessonsBulkBootstrap'] : [])], {
        prelude: 'let _lessonsBulkUiInserted = false, _lessonsBulkBootstrapWatch = null;',
        globals: {
            window: { location: { hostname: 'learn.inside.dtu.dk' } },
            isTopWindow: () => true, isLessonsBulkDownloadEnabled: () => enabled, isDTULearnLessonsPage: () => true,
            insertLessonsBulkDownloadControl: () => { passes++; if (passes === 4) context.evalInserted(); },
            removeLessonsBulkDownloadControl() {},
            schedulePlacement(options) {
                placement = options;
                return { active: () => true, trigger() {}, stop() {} };
            }
        }
    });
    // Set the same insertion flag the production mount path sets.
    const vm = await import('node:vm');
    context.evalInserted = () => vm.runInContext('_lessonsBulkUiInserted = true', context);
    api.runLessonsBulkDownloadChecks();
    assert.equal(passes, 1);
    assert.ok(placement);
    for (let i = 0; i < 3; i++) placement.run();
    assert.equal(passes, 4);
    assert.equal(placement.run(), true, 'the placement pass reports done as soon as the control mounts');
    vm.runInContext('_lessonsBulkUiInserted = false', context);
    api.runLessonsBulkDownloadChecks();
    enabled = false;
    assert.equal(placement.run(), true, 'switching the setting off stops the bootstrap');
});

async function settleLegacyPreflight(f, runs) {
    f.legacyPending.forEach(resolve => resolve(['https://learn.inside.dtu.dk/d2l/le/lessons/123/topics/456']));
    for (let i = 0; i < 8; i++) await Promise.resolve();
    f.pending.forEach(resolve => resolve());
    await Promise.all(runs);
}
for (const action of ['disable', 'cancel', 'leave']) {
    test(`legacy download preflight cannot request metadata after ${action}`, async () => {
        const f = await runnerFixture({ legacy: true }); const run = f.api.runLessonsBulkDownload(f.root);
        assert.equal(f.legacyPending.length, 1);
        if (action === 'disable') { f.enable(false); f.api.resetLessonsBulkState(); }
        if (action === 'cancel') f.api.cancelLessonsBulkRun();
        if (action === 'leave') { f.page(false); f.root.isConnected = false; }
        await settleLegacyPreflight(f, [run]);
        assert.equal(f.pending.length, 0);
    });
}
test('duplicate download clicks cannot overlap legacy preflight', async () => {
    const f = await runnerFixture({ legacy: true });
    const first = f.api.runLessonsBulkDownload(f.root), second = f.api.runLessonsBulkDownload(f.root);
    const count = f.legacyPending.length;
    await settleLegacyPreflight(f, [first, second]);
    assert.equal(count, 1); assert.equal(f.pending.length, 1);
});

test('a lesson page that could not be fetched is reported as unread, not as empty', async () => {
    const topic = LEARN + '/d2l/le/lessons/123/topics/456';
    const load = (fetch) => loadModulesInternals(['darkmode.lessons-bulk.zip.js', 'darkmode.lessons-bulk.tree.js', 'darkmode.lessons-bulk.fetch.js', 'darkmode.lessons-bulk.pdf-ink.js', 'darkmode.lessons-bulk.activity.js', 'darkmode.lessons-bulk.video.js', 'darkmode.lessons-bulk.js'],
        ['fetchLessonsUnitDownloadResult', 'describeLessonsBulkEmptyResult'],
        { location: { ...location, hostname: 'not-learn.test' }, fetch }).api;

    const offline = load(async () => { throw new Error('network down'); });
    assert.equal((await offline.fetchLessonsUnitDownloadResult(topic)).unread, true);
    const denied = load(async () => ({ ok: false, status: 403, url: topic, text: async () => '' }));
    assert.equal((await denied.fetchLessonsUnitDownloadResult(topic)).unread, true);
    const empty = load(async (url) => ({ ok: true, status: 200, url: String(url), text: async () => '<p>No files</p>', json: async () => ({}) }));
    const read = await empty.fetchLessonsUnitDownloadResult(topic);
    assert.equal(read.unread, false);
    assert.equal(read.links.length, 0);

    assert.equal(empty.describeLessonsBulkEmptyResult([{ links: [] }, { links: [] }]),
        'No downloadable files found in selected sections.');
    assert.equal(empty.describeLessonsBulkEmptyResult([{ links: [], unread: true }, { links: [] }, { links: [], unread: true }]),
        'Could not read 2 of 3 lesson pages. Try again.');
});

test('the legacy module tree reads topics and child modules from the structure API', async () => {
    const structure = { Modules: [{ Id: 50009, Title: 'Week 2' }], Topics: [{ TopicId: 40041, Title: 'Slides' }] };
    const { api } = loadModulesInternals(['darkmode.lessons-bulk.zip.js', 'darkmode.lessons-bulk.tree.js', 'darkmode.lessons-bulk.fetch.js', 'darkmode.lessons-bulk.pdf-ink.js', 'darkmode.lessons-bulk.activity.js', 'darkmode.lessons-bulk.video.js', 'darkmode.lessons-bulk.js'],
        ['buildLegacyModuleTreeViaApi'],
        {
            location: { ...location, hostname: 'not-learn.test' },
            fetch: async (url) => ({ ok: true, json: async () => (/\/modules\/50005\//.test(String(url)) ? structure : {}) })
        });
    const tree = await api.buildLegacyModuleTreeViaApi('123', '50005', 'Week 1', 0, new Set());
    assert.equal(tree.id, '50005');
    assert.deepEqual(Array.from(tree.topicIds), ['40041']);
    assert.deepEqual(Array.from(tree.children, (c) => c.id), ['50009']);
});

test('the hidden-frame scanner moves to the next URL on an empty tree read, then resolves and removes its frame', async () => {
    const treeDoc = { querySelector: (sel) => (/navigation-item/.test(sel) ? {} : null), querySelectorAll: () => [] };
    let removed = 0;
    const iframe = {
        style: {}, setAttribute() {}, remove() { removed++; },
        set src(url) { this._src = url; this.contentDocument = treeDoc; setTimeout(() => this.onload(), 0); },
        get src() { return this._src; }
    };
    const hostDoc = { createElement: () => iframe, body: { appendChild() {} } };
    const { api } = extractFunctions('darkmode.lessons-bulk.tree.js', ['findLegacyTreeDocFromRoot', 'scanLegacyTreeInHiddenFrame'], {
        globals: { markExt() {}, lessonsBulkDelay: async () => {}, setTimeout, clearTimeout }
    });
    const reads = [];
    let logged = null;
    const out = await api.scanLegacyTreeInHiddenFrame(hostDoc, ['https://a/1', 'https://a/2'], 5000, async (doc, url) => {
        reads.push(url);
        return url.endsWith('2') ? ['unit'] : [];
    }, (list, url, attempts) => { logged = [list.length, url, attempts]; });
    assert.deepEqual(plain(out), ['unit']);
    assert.deepEqual(reads, ['https://a/1', 'https://a/2']);
    assert.deepEqual(logged, [1, 'https://a/2', 2]);
    assert.equal(removed, 1);

    const failed = await api.scanLegacyTreeInHiddenFrame(hostDoc, ['https://a/1'], 5000, async () => { throw new Error('x'); });
    assert.deepEqual(plain(failed), [], 'a failing read on the last URL gives an empty list, not a rejection');
});

test('a legacy section load for the previous course cannot fill or end the next course\'s load', async () => {
    const cache = { orgUnitId: '', sections: [], loading: false, promise: null, ts: 0, lastAttemptTs: 0, source: '', runId: 0 };
    let ou = 'A';
    const pending = [];
    const { api } = extractFunctions('darkmode.lessons-bulk.tree.js', ['maybeStartLegacyApiSectionsHydration'], {
        prelude: 'var _lessonsLegacyApiSectionsCache = globalThis.cacheObj; var _lessonsBulkUiState = { activeDoc: null };',
        globals: {
            cacheObj: cache,
            document: {},
            getLessonsRuntimeDocument: (d) => d,
            isLegacyLessonsTreeDocument: () => true,
            getCurrentLessonsOrgUnitId: () => ou,
            normalizeLessonsBulkSections: (s) => s || [],
            shouldAttemptLegacyHiddenSectionBuild: () => false,
            buildLegacySectionsViaHiddenFrame: async () => [],
            buildLegacyApiSectionsDeep: () => new Promise((resolve) => pending.push(resolve)),
            isLegacyQualityBetter: () => false,
            logLessonsBulkDebug() {},
            refreshLessonsBulkDownloadUi() {}
        }
    });
    const settle = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
    api.maybeStartLegacyApiSectionsHydration({}, null);
    await settle();
    ou = 'B';
    api.maybeStartLegacyApiSectionsHydration({}, null);
    await settle();
    assert.equal(pending.length, 2);
    pending[0]([{ key: 'from-A' }]);
    await settle();
    assert.equal(cache.orgUnitId, 'B');
    assert.deepEqual(plain(cache.sections), []);
    assert.equal(cache.loading, true, 'B is still loading');
    pending[1]([{ key: 'from-B' }]);
    await settle();
    assert.deepEqual(plain(cache.sections), [{ key: 'from-B' }]);
    assert.equal(cache.loading, false);
});
