import assert from 'node:assert/strict';
import test from 'node:test';
import zlib from 'node:zlib';
import { loadModuleInternals, makeLocation } from './_harness.mjs';

// A non-Learn host keeps the module's page-load init from running.
const location = makeLocation('https://learn.inside.dtu.dk/d2l/le/lessons/123');
const { api } = loadModuleInternals('darkmode.lessons-bulk.js', [
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
const learnModule = loadModuleInternals('darkmode.lessons-bulk.js', [
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
