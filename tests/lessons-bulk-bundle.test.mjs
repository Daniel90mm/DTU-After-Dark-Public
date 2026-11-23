// Bundled ZIP download: no file lost, replaced or swapped for a login page.
// Helpers and the first three tests came from handoff run dtu-stress-lessons (2026-11-10).
import assert from 'node:assert/strict';
import test from 'node:test';
import { loadModuleInternals, makeLocation, extractFunctions } from './_harness.mjs';

const LEARN = 'https://learn.inside.dtu.dk';
const LOCATION = makeLocation(LEARN + '/d2l/le/lessons/123');
function response({ ok = true, status = 200, url = '', contentType = '', contentDisposition = '', body = '' } = {}) {
    const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : new Uint8Array(body);
    return {
        ok,
        status,
        url,
        headers: {
            get(name) {
                const key = String(name).toLowerCase();
                if (key === 'content-type') return contentType;
                if (key === 'content-disposition') return contentDisposition;
                if (key === 'content-length') return String(bytes.length);
                return null;
            }
        },
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        text: async () => new TextDecoder().decode(bytes),
        json: async () => JSON.parse(new TextDecoder().decode(bytes))
    };
}

function loadZipOnly(fetchImpl) {
    const saved = [];
    const calls = [];
    let aborted = false;
    class CapturingURL extends URL {
        static createObjectURL(blob) {
            saved.push(blob);
            return 'blob:stress-' + saved.length;
        }
        static revokeObjectURL() {}
    }
    const deps = {
        isStrictFileDownloadUrl: (url) => String(url).startsWith(LEARN + '/content/enforced/'),
        lessonsBulkFetch: async (url, opts) => {
            calls.push(String(url));
            return fetchImpl(String(url), opts);
        },
        setLessonsBulkStatus() {},
        isLessonsBulkRunAborted: () => aborted,
        throwIfLessonsBulkAborted() {
            if (aborted) {
                const error = new Error('Bulk download cancelled');
                error.name = 'AbortError';
                throw error;
            }
        }
    };
    const documentStub = {
        title: 'Example course - DTU Learn',
        createElement() {
            return { style: {}, setAttribute() {}, click() {}, remove() {}, appendChild() {} };
        },
        body: { appendChild() {} },
        head: { appendChild() {} },
        documentElement: { appendChild() {} }
    };
    const { api } = loadModuleInternals('darkmode.lessons-bulk.zip.js', [
        'sanitizeZipEntryName',
        'buildStoreOnlyZipBlob',
        'downloadSingleBundledZipFromUrls',
        'resolveDownloadFileName',
        'crc32Bytes'
    ], {
        location: LOCATION,
        document: documentStub,
        URL: CapturingURL,
        DTUAfterDarkLessonsBulkZipDeps: deps
    });
    return { api, saved, calls, setAborted(value) { aborted = value; } };
}

async function savedZipBuffer(saved, index = 0) {
    return Buffer.from(await saved[index].arrayBuffer());
}

function readZipEntries(buf) {
    let eocd = buf.length - 22;
    while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
    assert.ok(eocd >= 0, 'EOCD record not found');
    const count = buf.readUInt16LE(eocd + 10);
    let ptr = buf.readUInt32LE(eocd + 16);
    const entries = [];
    for (let i = 0; i < count; i++) {
        assert.equal(buf.readUInt32LE(ptr), 0x02014b50, 'central header signature');
        const flags = buf.readUInt16LE(ptr + 8);
        const crc = buf.readUInt32LE(ptr + 16);
        const size = buf.readUInt32LE(ptr + 24);
        const nameLen = buf.readUInt16LE(ptr + 28);
        const extraLen = buf.readUInt16LE(ptr + 30);
        const commentLen = buf.readUInt16LE(ptr + 32);
        const localOffset = buf.readUInt32LE(ptr + 42);
        const name = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);
        assert.equal(buf.readUInt32LE(localOffset), 0x04034b50, 'local header signature');
        const localNameLen = buf.readUInt16LE(localOffset + 26);
        const localExtraLen = buf.readUInt16LE(localOffset + 28);
        const dataStart = localOffset + 30 + localNameLen + localExtraLen;
        entries.push({
            name,
            flags,
            crc,
            size,
            data: buf.subarray(dataStart, dataStart + size)
        });
        ptr += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
}

test('a duplicate name is renumbered until it is unused, never onto an existing name', async () => {
    /**
     * Invariant 2: no file may be replaced. Renaming a duplicate must keep
     * generating suffixes until the name is unused. Two files named a.txt and
     * one already named a (1).txt must all get distinct entries.
     */
    const files = {
        [LEARN + '/content/enforced/1/a.txt']: { name: 'a.txt', body: 'first' },
        [LEARN + '/content/enforced/2/a.txt']: { name: 'a.txt', body: 'second' },
        [LEARN + '/content/enforced/3/a (1).txt']: { name: 'a (1).txt', body: 'third' }
    };
    const env = loadZipOnly(async (url) => {
        const file = files[url];
        return response({
            url,
            contentType: 'text/plain',
            contentDisposition: 'attachment; filename="' + file.name + '"',
            body: file.body
        });
    });

    const result = await env.api.downloadSingleBundledZipFromUrls(null, Object.keys(files));
    assert.equal(result.ok, true);
    const names = readZipEntries(await savedZipBuffer(env.saved)).map((entry) => entry.name);
    assert.equal(new Set(names).size, names.length, 'duplicate entry names in the ZIP: ' + names.join(', '));
});

test('an empty file is kept as an empty entry', async () => {
    /**
     * Invariant 2: a zero-byte file is still a file and must not be silently
     * lost. The right behaviour is an empty entry in the ZIP, not a failed
     * download.
     */
    const env = loadZipOnly(async (url) => response({
        url,
        contentType: 'application/octet-stream',
        contentDisposition: 'attachment; filename="empty.bin"',
        body: new Uint8Array(0)
    }));

    const result = await env.api.downloadSingleBundledZipFromUrls(
        null,
        [LEARN + '/content/enforced/1/empty.bin']
    );
    assert.equal(result.ok, true, 'an empty file must not fail the bundle');
    const entries = readZipEntries(await savedZipBuffer(env.saved));
    assert.equal(entries.length, 1, 'the zero-byte file is missing from the ZIP');
    assert.equal(entries[0].name, 'empty.bin');
    assert.equal(entries[0].size, 0);
    assert.equal(entries[0].crc, 0);
});

test('a login page returned for a PDF is a failure, never saved as the PDF', async () => {
    /**
     * Invariant 2: content that is not the requested file must not replace it.
     * A 200 text/html sign-in page for a PDF must be reported as a failed
     * download, not stored under the PDF name.
     */
    const loginHtml = '<html><body>Please sign in to continue</body></html>';
    const env = loadZipOnly(async (url) => response({
        url,
        contentType: 'text/html; charset=utf-8',
        contentDisposition: 'attachment; filename="Lecture 1.pdf"',
        body: loginHtml
    }));

    const result = await env.api.downloadSingleBundledZipFromUrls(
        null,
        [LEARN + '/content/enforced/1/Lecture%201.pdf']
    );
    assert.equal(result.ok, false, 'login HTML must not become the downloaded PDF');
    assert.equal(env.saved.length, 0, 'no ZIP may be saved with login HTML in place of the file');
});

test('a file that fails is returned by name, and the status names it', async () => {
    const good = LEARN + '/content/enforced/1/good.txt';
    const missing = LEARN + '/content/enforced/1/Week%202%20slides.pdf';
    const env = loadZipOnly(async (url) => (url === good
        ? response({ url, contentType: 'text/plain', contentDisposition: 'attachment; filename="good.txt"', body: 'hello' })
        : response({ ok: false, status: 403, url })));
    const result = await env.api.downloadSingleBundledZipFromUrls(null, [good, missing]);
    assert.equal(result.ok, true);
    assert.deepEqual([...result.failedNames], ['Week 2 slides.pdf']);

    const { api } = extractFunctions('darkmode.lessons-bulk.js', ['describeLessonsBundleResult']);
    const text = api.describeLessonsBundleResult({ ok: true, parts: 1, fileCount: 1, failByReason: { http: 1 }, failedNames: ['Week 2 slides.pdf'] });
    assert.match(text, /^Started 1 bundled ZIP download \(1 file\)\./);
    assert.match(text, /1 file could not be downloaded: Week 2 slides\.pdf\./);
    const many = api.describeLessonsBundleResult({ ok: true, parts: 1, fileCount: 3, failByReason: { http: 7 },
        failedNames: ['a.pdf', 'b.pdf', 'c.pdf', 'd.pdf', 'e.pdf', 'f.pdf', 'g.pdf'] });
    assert.match(many, /7 files could not be downloaded: a\.pdf, b\.pdf, c\.pdf, d\.pdf, e\.pdf and 2 more\./);
    assert.match(api.describeLessonsBundleResult({ ok: true, parts: 1, fileCount: 2, failByReason: {}, failedNames: [] }), /^Started 1 bundled ZIP download \(2 files\)\.$/);
});

test('course activity entries go into the ZIP first, in their folders, with no file URLs', async () => {
    const env = loadZipOnly(async (url) => response({ url, contentType: 'text/plain', contentDisposition: 'attachment; filename="notes.txt"', body: 'notes' }));
    const extra = [
        { path: 'Announcements/Announcements.html', bytes: new TextEncoder().encode('<p>a</p>') },
        { path: 'Assignments/Lab 1/Your submission/report.pdf', bytes: new Uint8Array([1, 2, 3]) }
    ];
    const onlyActivity = await env.api.downloadSingleBundledZipFromUrls(null, [], extra);
    assert.equal(onlyActivity.ok, true);
    assert.equal(onlyActivity.fileCount, 2);
    assert.deepEqual(readZipEntries(await savedZipBuffer(env.saved, 0)).map((e) => e.name), extra.map((e) => e.path));

    const both = await env.api.downloadSingleBundledZipFromUrls(null, [LEARN + '/content/enforced/1/notes.txt'], extra);
    assert.equal(both.fileCount, 3);
    assert.deepEqual(readZipEntries(await savedZipBuffer(env.saved, 1)).map((e) => e.name), [extra[0].path, extra[1].path, 'notes.txt']);
});
