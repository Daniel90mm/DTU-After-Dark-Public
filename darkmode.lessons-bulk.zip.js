(function () {
    'use strict';
    var markExt = globalThis.DTUAfterDarkDom.markExt;
    var isTopWindow = globalThis.DTUAfterDarkDom.isTopWindow;
    var normalizeWhitespace = globalThis.DTUAfterDarkDom.normalizeWhitespace;

    // Shared core helpers. This file loads first and owns the one mutable state
    // object that the other lessons-bulk files reach through globalThis.
    function getDeps() {
        try { return globalThis.DTUAfterDarkLessonsBulkDeps || null; } catch (e0) { return null; }
    }


    function isFeatureFlagEnabled(key) {
        var deps = getDeps();
        return !!(deps && typeof deps.isFeatureFlagEnabled === 'function' && deps.isFeatureFlagEnabled(key));
    }

    function isDarkModeEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDarkModeEnabled === 'function' && deps.isDarkModeEnabled());
    }

    function deepQueryAll(selector, root) {
        var deps = getDeps();
        if (deps && typeof deps.deepQueryAll === 'function') {
            return deps.deepQueryAll(selector, root);
        }
        return [];
    }



    function isLessonsBulkDebugEnabled() {
        try {
            return localStorage.getItem('dtu_after_dark_bulk_debug') === '1';
        } catch (e0) {
            return false;
        }
    }

    function logLessonsBulkDebug(eventName, payload) {
        if (!isLessonsBulkDebugEnabled()) return;
        try {
            console.log('[DTU After Dark][LessonsBulk]', eventName, payload || {});
        } catch (e0) { }
    }

    var _lessonsBulkState = {
        uiState: {
            sections: [],
            selectedKeys: new Set(),
            sig: '',
            running: false,
            lastRefreshAt: 0,
            activeDoc: null,
            lastLegacyExpandAt: 0
        },
        urlNameHints: new Map(),
        legacyApiSectionsCache: {
            orgUnitId: '',
            sections: [],
            loading: false,
            promise: null,
            ts: 0,
            lastAttemptTs: 0,
            source: ''
        },
        legacyModuleStructureCache: new Map(),
        legacyBackgroundResolveState: {
            orgUnitId: '',
            running: false,
            token: 0,
            resolvedKeys: new Set()
        },
        lessonsTopicApiVersion: '',
        lessonsTocIndex: { orgUnitId: '', index: null },
        runAbort: null,
        zipPartsSaved: 0
    };
    try { globalThis.DTUAfterDarkLessonsBulkState = _lessonsBulkState; } catch (eState) { }

    var _lessonsBulkUrlNameHints = _lessonsBulkState.urlNameHints;

    // Glue for the fetch and run-loop functions that live in later files.
    function getLessonsBulkZipDeps() {
        var d = globalThis.DTUAfterDarkLessonsBulkZipDeps;
        if (!d) throw new Error('DTU After Dark: darkmode.lessons-bulk.js has not set DTUAfterDarkLessonsBulkZipDeps');
        return d;
    }
    function isStrictFileDownloadUrl(url) {
        return getLessonsBulkZipDeps().isStrictFileDownloadUrl(url);
    }
    function lessonsBulkFetch(url, opts) {
        return getLessonsBulkZipDeps().lessonsBulkFetch(url, opts);
    }
    function setLessonsBulkStatus(rootEl, text, tone) {
        getLessonsBulkZipDeps().setLessonsBulkStatus(rootEl, text, tone);
    }
    function isLessonsBulkRunAborted() {
        return getLessonsBulkZipDeps().isLessonsBulkRunAborted();
    }
    function throwIfLessonsBulkAborted() {
        getLessonsBulkZipDeps().throwIfLessonsBulkAborted();
    }

    var LESSONS_BULK_FETCH_CONCURRENCY = 4;

    // The ZIP writer is ZIP32 (no ZIP64): sizes, offsets and the entry count are
    // 32/16-bit, so one archive must stay well under 4 GiB and 65535 entries or
    // it comes out corrupt. Courses are therefore split into parts, and each
    // part is saved and released as soon as it is full, which also caps memory
    // at about one part instead of the whole course.
    var LESSONS_BULK_ZIP_PART_MAX_BYTES = 2e9;
    var LESSONS_BULK_ZIP_PART_MAX_ENTRIES = 65000;

    function getFilenameFromContentDisposition(contentDisposition) {
        if (!contentDisposition) return '';
        var cd = String(contentDisposition);
        var mStar = cd.match(/filename\*\s*=\s*([^;]+)/i);
        if (mStar && mStar[1]) {
            var raw = mStar[1].trim().replace(/^UTF-8''/i, '').replace(/^"(.*)"$/, '$1');
            try { return decodeURIComponent(raw); } catch (e0) { return raw; }
        }
        var m = cd.match(/filename\s*=\s*([^;]+)/i);
        if (m && m[1]) {
            return m[1].trim().replace(/^"(.*)"$/, '$1');
        }
        return '';
    }

    function getFilenameFromUrl(url) {
        if (!url) return 'downloaded-file';
        try {
            var u = new URL(url, window.location.href);
            var path = (u.pathname || '').split('/');
            var last = path.length ? path[path.length - 1] : '';
            if (last && /\.[a-z0-9]{2,8}$/i.test(last)) return decodeURIComponent(last);
        } catch (e0) { }
        return 'downloaded-file';
    }

    function hasFilenameExtension(name) {
        return /\.[a-z0-9]{1,12}$/i.test(String(name || ''));
    }

    function isGenericDownloadFileName(name) {
        var n = String(name || '').trim().toLowerCase();
        if (!n) return true;
        n = n.replace(/\.[a-z0-9]{1,12}$/i, '');
        return n === 'downloaded-file' || n === 'download' || n === 'file' || /^file-\d+$/.test(n);
    }

    function getExtensionFromUrlPath(url) {
        if (!url) return '';
        try {
            var u = new URL(url, window.location.href);
            var last = ((u.pathname || '').split('/').pop() || '').toLowerCase();
            var m = last.match(/\.([a-z0-9]{1,12})$/i);
            if (!m || !m[1]) return '';
            return '.' + m[1].toLowerCase();
        } catch (e0) {
            return '';
        }
    }

    function getExtensionFromContentType(contentType) {
        var ct = String(contentType || '').toLowerCase().split(';')[0].trim();
        if (!ct) return '';
        var map = {
            'application/pdf': '.pdf',
            'text/plain': '.txt',
            'text/markdown': '.md',
            'text/csv': '.csv',
            'application/json': '.json',
            'application/xml': '.xml',
            'text/xml': '.xml',
            'application/zip': '.zip',
            'application/x-zip-compressed': '.zip',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
            'application/vnd.ms-powerpoint': '.ppt',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
            'application/vnd.ms-excel': '.xls',
            'image/png': '.png',
            'image/jpeg': '.jpg',
            'image/gif': '.gif',
            'video/mp4': '.mp4',
            'video/webm': '.webm',
            'text/x-c': '.c',
            'text/x-csrc': '.c',
            'application/x-csrc': '.c',
            'text/x-chdr': '.h',
            'text/x-c++src': '.cpp',
            'text/x-c++hdr': '.hpp',
            'text/x-java-source': '.java',
            'text/x-python': '.py'
        };
        if (map[ct]) return map[ct];
        if (/c\+\+/.test(ct) && /source/.test(ct)) return '.cpp';
        if (/c\+\+/.test(ct) && /header|hdr/.test(ct)) return '.hpp';
        if (/x-csrc|c-source|x-c$/i.test(ct)) return '.c';
        if (/x-chdr|c-header|header/i.test(ct)) return '.h';
        return '';
    }

    function resolveDownloadFileName(url, contentDisposition, contentType, index, altUrl) {
        var srcUrl = url || '';
        var fileName = getFilenameFromContentDisposition(contentDisposition || '');
        if (!fileName) fileName = getFilenameFromUrl(srcUrl);
        var hint = _lessonsBulkUrlNameHints.get(srcUrl) || '';
        if (!hint && altUrl) hint = _lessonsBulkUrlNameHints.get(String(altUrl)) || '';
        if (!hint) {
            try {
                var su = new URL(srcUrl, window.location.href);
                hint = _lessonsBulkUrlNameHints.get(su.origin + su.pathname) || '';
            } catch (e0) { }
        }
        if (!hint && altUrl) {
            try {
                var au = new URL(altUrl, window.location.href);
                hint = _lessonsBulkUrlNameHints.get(au.origin + au.pathname) || '';
            } catch (e1) { }
        }
        if ((!fileName || isGenericDownloadFileName(fileName)) && hint) {
            fileName = hint;
        }
        if (!fileName) fileName = 'file-' + String((index || 0) + 1);
        if (!hasFilenameExtension(fileName)) {
            var ext = getExtensionFromUrlPath(srcUrl) || getExtensionFromContentType(contentType || '');
            if (ext) fileName += ext;
        }
        return sanitizeZipEntryName(fileName, 'file-' + String((index || 0) + 1));
    }

    function sanitizeZipEntryName(name, fallback) {
        var v = normalizeWhitespace(String(name || '').trim());
        if (!v) v = fallback || 'file';
        v = v.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
        v = v.replace(/\s+/g, ' ');
        v = v.replace(/^\.+/, '').replace(/\.+$/, '');
        if (!v) v = fallback || 'file';
        return v.slice(0, 180);
    }

    function getLessonsBulkZipCrcTable() {
        if (window.__DTU_AD_ZIP_CRC_TABLE__) return window.__DTU_AD_ZIP_CRC_TABLE__;
        var table = new Uint32Array(256);
        for (var n = 0; n < 256; n++) {
            var c = n;
            for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            table[n] = c >>> 0;
        }
        window.__DTU_AD_ZIP_CRC_TABLE__ = table;
        return table;
    }

    function crc32Bytes(bytes) {
        var table = getLessonsBulkZipCrcTable();
        var c = 0xFFFFFFFF;
        for (var i = 0; i < bytes.length; i++) {
            c = table[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
        }
        return (c ^ 0xFFFFFFFF) >>> 0;
    }

    function zipDosDateTime(dateObj) {
        var d = dateObj instanceof Date ? dateObj : new Date();
        var year = Math.max(1980, Math.min(2107, d.getFullYear()));
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var hour = d.getHours();
        var minute = d.getMinutes();
        var second = Math.floor(d.getSeconds() / 2);
        var dosTime = ((hour & 0x1F) << 11) | ((minute & 0x3F) << 5) | (second & 0x1F);
        var dosDate = (((year - 1980) & 0x7F) << 9) | ((month & 0x0F) << 5) | (day & 0x1F);
        return { time: dosTime >>> 0, date: dosDate >>> 0 };
    }

    function pushU16LE(out, v) {
        out.push(v & 0xFF, (v >>> 8) & 0xFF);
    }

    function pushU32LE(out, v) {
        out.push(v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF);
    }

    function buildStoreOnlyZipBlob(entries) {
        var encoder = new TextEncoder();
        var chunks = [];
        var central = [];
        var offset = 0;

        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            var nameBytes = encoder.encode(e.name);
            var data = e.bytes instanceof Uint8Array ? e.bytes : new Uint8Array(e.bytes || []);
            var crc = crc32Bytes(data);
            var dt = zipDosDateTime(e.date);

            var local = [];
            pushU32LE(local, 0x04034b50);
            pushU16LE(local, 20);
            pushU16LE(local, 0x0800);
            pushU16LE(local, 0);
            pushU16LE(local, dt.time);
            pushU16LE(local, dt.date);
            pushU32LE(local, crc);
            pushU32LE(local, data.length);
            pushU32LE(local, data.length);
            pushU16LE(local, nameBytes.length);
            pushU16LE(local, 0);
            chunks.push(new Uint8Array(local));
            chunks.push(nameBytes);
            chunks.push(data);

            var centralHdr = [];
            pushU32LE(centralHdr, 0x02014b50);
            pushU16LE(centralHdr, 20);
            pushU16LE(centralHdr, 20);
            pushU16LE(centralHdr, 0x0800);
            pushU16LE(centralHdr, 0);
            pushU16LE(centralHdr, dt.time);
            pushU16LE(centralHdr, dt.date);
            pushU32LE(centralHdr, crc);
            pushU32LE(centralHdr, data.length);
            pushU32LE(centralHdr, data.length);
            pushU16LE(centralHdr, nameBytes.length);
            pushU16LE(centralHdr, 0);
            pushU16LE(centralHdr, 0);
            pushU16LE(centralHdr, 0);
            pushU16LE(centralHdr, 0);
            pushU32LE(centralHdr, 0);
            pushU32LE(centralHdr, offset);
            central.push(new Uint8Array(centralHdr));
            central.push(nameBytes);

            offset += local.length + nameBytes.length + data.length;
        }

        var centralSize = 0;
        for (var c = 0; c < central.length; c++) centralSize += central[c].length;
        var centralOffset = offset;

        for (var j = 0; j < central.length; j++) chunks.push(central[j]);

        var eocd = [];
        pushU32LE(eocd, 0x06054b50);
        pushU16LE(eocd, 0);
        pushU16LE(eocd, 0);
        pushU16LE(eocd, entries.length);
        pushU16LE(eocd, entries.length);
        pushU32LE(eocd, centralSize);
        pushU32LE(eocd, centralOffset);
        pushU16LE(eocd, 0);
        chunks.push(new Uint8Array(eocd));

        return new Blob(chunks, { type: 'application/zip' });
    }

    async function fetchFileForBundle(url, index) {
        try {
            if (!isStrictFileDownloadUrl(url)) return { ok: false, reason: 'invalid-url' };
            var resp = await lessonsBulkFetch(url, { credentials: 'include', cache: 'no-store' });
            if (!resp || !resp.ok) {
                return { ok: false, reason: 'http', status: resp ? resp.status : 'no_response', finalUrl: resp && resp.url ? resp.url : '' };
            }
            var declared = resp.headers && resp.headers.get ? Number(resp.headers.get('content-length')) : NaN;
            if (isTooLargeForZipEntry(declared)) {
                try { if (resp.body) resp.body.cancel(); } catch (eBig) { }
                return { ok: false, reason: 'too-large', size: declared };
            }
            var ab = await resp.arrayBuffer();
            var bytes = new Uint8Array(ab || new ArrayBuffer(0));
            if (isTooLargeForZipEntry(bytes.length)) return { ok: false, reason: 'too-large', size: bytes.length };

            var finalUrl = (resp && resp.url) ? resp.url : url;
            var cd = resp && resp.headers && resp.headers.get ? resp.headers.get('content-disposition') : '';
            var ct = resp && resp.headers && resp.headers.get ? resp.headers.get('content-type') : '';
            var fileName = resolveDownloadFileName(url || finalUrl, cd, ct, index, finalUrl);
            // An expired session answers a file URL with the sign-in page (200,
            // text/html). Saved under the file's name it would look like a broken
            // PDF; only a file that is itself .html/.htm may be HTML.
            if (/^\s*text\/html\b/i.test(String(ct || '')) && !/\.html?$/i.test(String(fileName || ''))) {
                return { ok: false, reason: 'not-the-file', status: resp.status, finalUrl: finalUrl };
            }
            logLessonsBulkDebug('bundle_file_name', {
                index: index,
                url: url,
                finalUrl: finalUrl,
                contentType: ct,
                fileName: fileName
            });
            return { ok: true, name: fileName, bytes: bytes, url: url };
        } catch (e0) {
            return { ok: false, reason: 'fetch', error: String(e0 && e0.message ? e0.message : e0) };
        }
    }

    function getLessonsBulkZipBaseTitle() {
        var title = '';
        try { title = normalizeWhitespace(document.title || ''); } catch (e0) { title = ''; }
        if (!title) return 'DTU Learn Course Content';

        var parts = title.split(/\s+-\s+/).map(function (p) { return normalizeWhitespace(p || ''); }).filter(Boolean);
        if (parts.length <= 1) {
            return title.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim() || 'DTU Learn Course Content';
        }

        var best = parts[0];
        var bestScore = -9999;
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i] || '';
            var score = 0;
            if (/\b\d{5}\b/.test(p)) score += 5;
            if (/\b(spring|autumn|fall|summer|winter|f\d{2}|e\d{2})\b/i.test(p)) score += 3;
            if (/\s/.test(p)) score += 1;
            if (/_/.test(p)) score -= 3;
            if (/\.(pdf|docx?|pptx?|xlsx?|zip)\b/i.test(p)) score -= 4;
            if (/^(book|old exam sets|course handbook|lecture slides|exercises and assignments)$/i.test(p)) score -= 4;
            if (score > bestScore) {
                bestScore = score;
                best = p;
            }
        }

        best = best.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
        return best || 'DTU Learn Course Content';
    }

    function getLessonsBulkZipNameBase() {
        var title = getLessonsBulkZipBaseTitle();
        var d = new Date();
        function pad(n) { return String(n).padStart(2, '0'); }
        var stamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
        return (title + ' - Course Content - ' + stamp).slice(0, 120);
    }

    function getLessonsBulkZipPartLimits() {
        var maxBytes = LESSONS_BULK_ZIP_PART_MAX_BYTES;
        // Debug-only override (MB) so the split can be exercised on small courses.
        try {
            var mb = Number(localStorage.getItem('dtu_after_dark_bulk_zip_part_mb'));
            if (isFinite(mb) && mb > 0) maxBytes = Math.min(maxBytes, mb * 1e6);
        } catch (e0) { }
        return { maxBytes: maxBytes, maxEntries: LESSONS_BULK_ZIP_PART_MAX_ENTRIES };
    }

    function shouldStartNewZipPart(partBytes, partEntries, nextSize, limits) {
        var lim = limits || { maxBytes: LESSONS_BULK_ZIP_PART_MAX_BYTES, maxEntries: LESSONS_BULK_ZIP_PART_MAX_ENTRIES };
        if (!partEntries) return false;
        if (partEntries >= lim.maxEntries) return true;
        return partBytes + nextSize > lim.maxBytes;
    }

    function isTooLargeForZipEntry(size) {
        var n = Number(size);
        // Leave room for this entry's own headers inside the 32-bit fields.
        return isFinite(n) && n > 0xFFFFFFFF - 0x10000;
    }

    function getZipPartFileName(baseName, partNumber, isSplit) {
        var base = sanitizeZipEntryName(baseName, 'DTU-Learn-Bulk-Download');
        return base + (isSplit ? ' - part ' + partNumber : '') + '.zip';
    }

    function saveZipBlob(entries, zipName) {
        var zipBlob = buildStoreOnlyZipBlob(entries);
        var blobUrl = URL.createObjectURL(zipBlob);
        var a = document.createElement('a');
        markExt(a);
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = zipName;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            try { a.remove(); } catch (e0) { }
            try { URL.revokeObjectURL(blobUrl); } catch (e1) { }
        }, 2500);
    }

    async function downloadSingleBundledZipFromUrls(rootEl, urls) {
        var list = Array.from(new Set((urls || []).filter(function (u) { return isStrictFileDownloadUrl(u); })));
        if (!list.length) return { ok: false, reason: 'no-files' };

        var limits = getLessonsBulkZipPartLimits();
        var baseName = getLessonsBulkZipNameBase();
        var failByReason = {};
        var usedNames = new Set();
        var failedNames = [];
        var partEntries = [];
        var partBytes = 0;
        var zipNames = [];
        var fileCount = 0;
        _lessonsBulkState.zipPartsSaved = 0;

        function savePart(isFinal) {
            var isSplit = !isFinal || zipNames.length > 0;
            var zipName = getZipPartFileName(baseName, zipNames.length + 1, isSplit);
            saveZipBlob(partEntries, zipName);
            logLessonsBulkDebug('bundle_part_saved', { zipName: zipName, entries: partEntries.length, bytes: partBytes });
            zipNames.push(zipName);
            _lessonsBulkState.zipPartsSaved = zipNames.length;
            partEntries = [];
            partBytes = 0;
        }

        function addToPart(r, i) {
            if (!r || !r.ok) {
                var reason = (r && r.reason) ? r.reason : 'unknown';
                failByReason[reason] = (failByReason[reason] || 0) + 1;
                failedNames.push(getFilenameFromUrl(list[i]) || ('file ' + String(i + 1)));
                logLessonsBulkDebug('bundle_fetch_fail', { url: list[i], result: r || null });
                return;
            }
            var entryName = sanitizeZipEntryName(r.name, 'file-' + String(i + 1));
            // Number a repeated name until the result is unused: "a (1).txt" may
            // itself be a real file name further down the list.
            var finalName = entryName;
            var dot = entryName.lastIndexOf('.');
            for (var n = 1; usedNames.has(finalName.toLowerCase()); n++) {
                finalName = dot > 0
                    ? entryName.slice(0, dot) + ' (' + n + ')' + entryName.slice(dot)
                    : entryName + ' (' + n + ')';
            }
            usedNames.add(finalName.toLowerCase());
            if (shouldStartNewZipPart(partBytes, partEntries.length, r.bytes.length, limits)) savePart(false);
            partEntries.push({ name: finalName, bytes: r.bytes, date: new Date() });
            partBytes += r.bytes.length;
            fileCount++;
        }

        // Fetch a few files at once, but add them to parts strictly in list
        // order so entry order and duplicate-name numbering match a one-by-one
        // run. A result is dropped from `fetched` as soon as it is placed.
        var fetched = new Array(list.length);
        var nextFetch = 0;
        var nextPlace = 0;
        var fetchedCount = 0;
        function placeReady() {
            while (nextPlace < list.length && fetched[nextPlace] !== undefined) {
                if (isLessonsBulkRunAborted()) return;
                addToPart(fetched[nextPlace], nextPlace);
                fetched[nextPlace] = null;
                nextPlace++;
            }
        }
        async function bundleWorker() {
            while (nextFetch < list.length && !isLessonsBulkRunAborted()) {
                var idx = nextFetch++;
                fetched[idx] = await fetchFileForBundle(list[idx], idx);
                fetchedCount++;
                setLessonsBulkStatus(rootEl, 'Bundling file ' + fetchedCount + ' / ' + list.length
                    + (zipNames.length ? ' (' + zipNames.length + ' part' + (zipNames.length === 1 ? '' : 's') + ' saved)' : '') + '...', 'work');
                placeReady();
            }
        }
        var bundleWorkers = [];
        for (var w = 0; w < Math.min(LESSONS_BULK_FETCH_CONCURRENCY, list.length); w++) bundleWorkers.push(bundleWorker());
        await Promise.all(bundleWorkers);
        placeReady();

        throwIfLessonsBulkAborted();
        if (partEntries.length) savePart(true);
        if (!zipNames.length) return { ok: false, reason: 'fetch-failed', failByReason: failByReason, failedNames: failedNames };
        return { ok: true, fileCount: fileCount, parts: zipNames.length, failByReason: failByReason, failedNames: failedNames, zipName: zipNames[0], zipNames: zipNames };
    }

    try {
        globalThis.DTUAfterDarkLessonsBulkCore = {
            getDeps: getDeps,
            isTopWindow: isTopWindow,
            isFeatureFlagEnabled: isFeatureFlagEnabled,
            isDarkModeEnabled: isDarkModeEnabled,
            deepQueryAll: deepQueryAll,
            normalizeWhitespace: normalizeWhitespace,
            markExt: markExt,
            isLessonsBulkDebugEnabled: isLessonsBulkDebugEnabled,
            logLessonsBulkDebug: logLessonsBulkDebug
        };
        globalThis.DTUAfterDarkLessonsBulkZip = {
            getFilenameFromContentDisposition: getFilenameFromContentDisposition,
            getFilenameFromUrl: getFilenameFromUrl,
            hasFilenameExtension: hasFilenameExtension,
            isGenericDownloadFileName: isGenericDownloadFileName,
            getExtensionFromUrlPath: getExtensionFromUrlPath,
            getExtensionFromContentType: getExtensionFromContentType,
            resolveDownloadFileName: resolveDownloadFileName,
            sanitizeZipEntryName: sanitizeZipEntryName,
            getLessonsBulkZipCrcTable: getLessonsBulkZipCrcTable,
            crc32Bytes: crc32Bytes,
            zipDosDateTime: zipDosDateTime,
            pushU16LE: pushU16LE,
            pushU32LE: pushU32LE,
            buildStoreOnlyZipBlob: buildStoreOnlyZipBlob,
            fetchFileForBundle: fetchFileForBundle,
            getLessonsBulkZipBaseTitle: getLessonsBulkZipBaseTitle,
            getLessonsBulkZipNameBase: getLessonsBulkZipNameBase,
            getLessonsBulkZipPartLimits: getLessonsBulkZipPartLimits,
            shouldStartNewZipPart: shouldStartNewZipPart,
            isTooLargeForZipEntry: isTooLargeForZipEntry,
            getZipPartFileName: getZipPartFileName,
            saveZipBlob: saveZipBlob,
            downloadSingleBundledZipFromUrls: downloadSingleBundledZipFromUrls
        };
    } catch (eExpose) { }
})();
