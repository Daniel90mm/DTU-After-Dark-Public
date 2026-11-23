// Exam table and course page service for the DTU After Dark background worker.
(function() {
    'use strict';

    const fetchWithTimeLimit = DTUAfterDarkShared.fetchWithTimeLimit;
    const storageCacheGet = DTUAfterDarkCache.storageCacheGet;
    const storageCacheSet = DTUAfterDarkCache.storageCacheSet;

    // DTU's exam table: the page every course's "Date of examination" links to.
    const EXAM_TABLE_URL = 'https://student.dtu.dk/en/exam/exam-dates';
    const COURSE_CODE_RE = /^[0-9]{2}[0-9A-Z]{3}$/;

    async function fetchPage(url, credentials) {
        try {
            const res = await fetchWithTimeLimit(url, { cache: 'no-store', credentials, redirect: 'follow' });
            if (!res.ok) return { ok: false, error: 'http_' + res.status };
            return { ok: true, html: await res.text(), fetchedAt: Date.now() };
        } catch (e) {
            return { ok: false, error: 'fetch_failed' };
        }
    }

    // Raw HTML of one page, cached only when the fetch succeeded and, with
    // isUsable, when the page is the one asked for. Parsing it is the content
    // script's job (exam schedule core).
    async function fetchPageCached(prefix, id, ttlMs, url, credentials, isUsable) {
        const usable = isUsable || (() => true);
        const cached = await storageCacheGet(prefix, id, ttlMs);
        if (cached && usable(cached.html)) return cached;
        const result = await fetchPage(url, credentials);
        if (result.ok && !usable(result.html)) return { ok: false, error: 'unexpected_page' };
        if (result.ok) storageCacheSet(prefix, id, result);
        return result;
    }

    // DTU's exam table has a column headed "Grading deadline". A 200 answer
    // without it (maintenance, a consent or robot check) is not cached: it
    // would show as "no exams" for 12 hours.
    function isExamTablePage(html) {
        return typeof html === 'string' && /<table/i.test(html) && /grading deadline/i.test(html);
    }

    // kurser.dtu.dk answers with HTTP 200 and this short page when the login
    // session needs renewing: it loads ?forceLogin=true in a hidden frame,
    // then reloads. Cached as a good page, it hid the course for a day.
    function isKurserLoginStub(html) {
        return typeof html === 'string' && html.length < 2000 && /id="loginFrame"|forceLogin=true/.test(html);
    }

    // True when html is the kurser page for path: "CODE" or "YYYY-YYYY/CODE"
    // opens with an h2 "CODE Name" (all 1716 pages of the 19 Nov 2026 archive);
    // "CODE/info" has the course's own tab, a link to /course/CODE. Any other
    // 200 answer (maintenance, a sign-in page after a redirect) is not cached:
    // it would stand in for the course for a day.
    function isKurserCoursePage(html, path) {
        if (typeof html !== 'string') return false;
        const parts = String(path || '').split('/');
        const info = parts[parts.length - 1] === 'info';
        const code = info ? parts[parts.length - 2] : parts[parts.length - 1];
        if (!COURSE_CODE_RE.test(code || '')) return false;
        if (info) return new RegExp('<a href="/course/' + code + '">\\s*' + code + '\\s*</a>', 'i').test(html);
        return new RegExp('<h2[^>]*>\\s*' + code + '\\b').test(html);
    }

    // A kurser course page with the browser's cookies. On the login stub it
    // does what the stub does (renew the login), then asks once more.
    async function fetchCoursePageCached(prefix, ttlMs, path) {
        const id = path.replace('/', '_');
        const url = 'https://kurser.dtu.dk/course/' + path;
        const cached = await storageCacheGet(prefix, id, ttlMs);
        if (cached && isKurserCoursePage(cached.html, path)) return cached;
        let result = await fetchPage(url, 'include');
        if (result.ok && isKurserLoginStub(result.html)) {
            await fetchPage(url + '?forceLogin=true', 'include');
            result = await fetchPage(url, 'include');
            if (result.ok && isKurserLoginStub(result.html)) return { ok: false, error: 'login_required' };
        }
        if (result.ok && !isKurserCoursePage(result.html, path)) return { ok: false, error: 'unexpected_page' };
        if (result.ok) storageCacheSet(prefix, id, result);
        return result;
    }

    globalThis.DTUAfterDarkExam = {
        fetchPageCached,
        fetchCoursePageCached,
        isExamTablePage,
        isKurserCoursePage,
        EXAM_TABLE_URL,
        COURSE_CODE_RE
    };
})();
