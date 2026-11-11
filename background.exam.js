// Exam table and course page service for the DTU After Dark background worker.
(function() {
    'use strict';

    const storageCacheGet = DTUAfterDarkCache.storageCacheGet;
    const storageCacheSet = DTUAfterDarkCache.storageCacheSet;

    // DTU's exam table: the page every course's "Date of examination" links to.
    const EXAM_TABLE_URL = 'https://student.dtu.dk/en/exam/exam-dates';
    const COURSE_CODE_RE = /^[0-9]{2}[0-9A-Z]{3}$/;

    async function fetchPage(url, credentials) {
        try {
            const res = await fetch(url, { cache: 'no-store', credentials, redirect: 'follow' });
            if (!res.ok) return { ok: false, error: 'http_' + res.status };
            return { ok: true, html: await res.text(), fetchedAt: Date.now() };
        } catch (e) {
            return { ok: false, error: 'fetch_failed' };
        }
    }

    // Raw HTML of one page, cached only when the fetch succeeded. Parsing and
    // judging the page is the content script's job (exam schedule core).
    async function fetchPageCached(prefix, id, ttlMs, url, credentials) {
        const cached = await storageCacheGet(prefix, id, ttlMs);
        if (cached) return cached;
        const result = await fetchPage(url, credentials);
        if (result.ok) storageCacheSet(prefix, id, result);
        return result;
    }

    // kurser.dtu.dk answers with HTTP 200 and this short page when the login
    // session needs renewing: it loads ?forceLogin=true in a hidden frame,
    // then reloads. Cached as a good page, it hid the course for a day.
    function isKurserLoginStub(html) {
        return typeof html === 'string' && html.length < 2000 && /id="loginFrame"|forceLogin=true/.test(html);
    }

    // A kurser course page with the browser's cookies. On the login stub it
    // does what the stub does (renew the login), then asks once more.
    async function fetchCoursePageCached(prefix, ttlMs, path) {
        const id = path.replace('/', '_');
        const url = 'https://kurser.dtu.dk/course/' + path;
        const cached = await storageCacheGet(prefix, id, ttlMs);
        if (cached && !isKurserLoginStub(cached.html)) return cached;
        let result = await fetchPage(url, 'include');
        if (result.ok && isKurserLoginStub(result.html)) {
            await fetchPage(url + '?forceLogin=true', 'include');
            result = await fetchPage(url, 'include');
            if (result.ok && isKurserLoginStub(result.html)) return { ok: false, error: 'login_required' };
        }
        if (result.ok) storageCacheSet(prefix, id, result);
        return result;
    }

    globalThis.DTUAfterDarkExam = {
        fetchPageCached,
        fetchCoursePageCached,
        EXAM_TABLE_URL,
        COURSE_CODE_RE
    };
})();
