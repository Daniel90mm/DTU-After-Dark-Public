// Student deadline service for the DTU After Dark background worker.
(function() {
    'use strict';

    const normalizeSpace = DTUAfterDarkShared.normalizeSpace;
    const stripHtmlTags = DTUAfterDarkShared.stripHtmlTags;

    // Deadlines are published years ahead; the content script decides when newer data is
    // actually needed. This is a long-stop, not a polling interval.
    const STUDENT_DEADLINES_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // one check a day
    const STUDENT_DEADLINES_RETRY_AFTER_FAILURE_MS = 1000 * 60 * 10; // back off a failing source
    const STUDENT_COURSE_REG_DEADLINES_URL = 'https://student.dtu.dk/en/courses-and-teaching/course-registration/course-registration-deadlines';
    const STUDENT_EXAM_REG_DEADLINES_URL = 'https://student.dtu.dk/en/exam/exam-registration/-deadlines-for-exams';
    const _studentDeadlinesCache = { course: null, exam: null };

    function parseDmyDate(rawText) {
        const text = normalizeSpace(rawText);
        if (!text) return null;
        const m = text.match(/(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-\s]\s*(\d{4})/);
        if (!m) return null;
        const day = parseInt(m[1], 10);
        const month = parseInt(m[2], 10);
        const year = parseInt(m[3], 10);
        if (!day || !month || !year || month < 1 || month > 12 || day < 1 || day > 31) return null;
        const ts = Date.UTC(year, month - 1, day);
        const d = new Date(ts);
        if (d.getUTCFullYear() !== year || (d.getUTCMonth() + 1) !== month || d.getUTCDate() !== day) return null;
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { ts, iso };
    }

    function extractDmyDates(text) {
        const out = [];
        const seen = Object.create(null);
        const regex = /(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-\s]\s*(\d{4})/g;
        let m;
        while ((m = regex.exec(text || '')) !== null) {
            const dateText = `${m[1]}/${m[2]} ${m[3]}`;
            const parsed = parseDmyDate(dateText);
            if (!parsed || !parsed.iso || seen[parsed.iso]) continue;
            seen[parsed.iso] = true;
            out.push(parsed);
        }
        return out;
    }

    function parseStudentDeadlineLine(text) {
        const raw = normalizeSpace(text);
        if (!raw) return null;

        const idx = raw.indexOf(':');
        let label = '';
        let datePart = raw;
        if (idx >= 0) {
            label = normalizeSpace(raw.slice(0, idx)).replace(/\*+$/g, '').trim();
            datePart = normalizeSpace(raw.slice(idx + 1)).replace(/^:+\s*/, '');
        }

        const dates = extractDmyDates(datePart);
        if (!dates.length) return null;

        const start = dates[0];
        const end = dates.length > 1 ? dates[1] : null;
        return {
            label: label || raw,
            startIso: start.iso,
            startTs: start.ts,
            endIso: end ? end.iso : null,
            endTs: end ? end.ts : null,
            raw
        };
    }

    function parseStudentDeadlinesGroupsFromHtml(html) {
        if (!html) return [];
        const groups = [];
        const headings = [];
        const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
        let m;
        while ((m = h2Regex.exec(html)) !== null) {
            const headingText = normalizeSpace(stripHtmlTags(m[1]));
            if (!headingText || /^\u00a0+$/.test(headingText)) continue;
            headings.push({ text: headingText, start: m.index, end: h2Regex.lastIndex });
        }
        if (!headings.length) return groups;

        for (let i = 0; i < headings.length; i++) {
            const segStart = headings[i].end;
            const segEnd = (i + 1 < headings.length) ? headings[i + 1].start : html.length;
            const seg = html.slice(segStart, segEnd);

            const items = [];
            const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
            let li;
            while ((li = liRegex.exec(seg)) !== null) {
                const liText = normalizeSpace(stripHtmlTags(li[1]));
                const parsed = parseStudentDeadlineLine(liText);
                if (parsed) items.push(parsed);
            }

            if (!items.length) continue;
            groups.push({
                heading: headings[i].text,
                items
            });
        }

        return groups;
    }

    async function fetchStudentDeadlines(forceRefresh) {
        async function fetchOne(url) {
            try {
                const res = await fetch(url, { cache: 'no-store', credentials: 'omit', redirect: 'follow' });
                if (!res || !res.ok) return { ok: false, url, status: res ? res.status : 0, error: 'http' };
                const html = await res.text();
                if (!html || html.length < 200) return { ok: false, url, status: res.status, error: 'empty_html' };
                const groups = parseStudentDeadlinesGroupsFromHtml(html);
                if (!groups || !groups.length) return { ok: false, url, status: res.status, error: 'parse_empty' };
                return { ok: true, url, status: res.status, groups };
            } catch (e) {
                return { ok: false, url, status: 0, error: 'fetch_error', message: String(e && e.message || e) };
            }
        }

        // Each source is cached on its own. Caching them as one record meant a single
        // failed fetch was stored alongside the other source's good data and the whole
        // response still reported ok, so the failed source's deadlines silently vanished
        // for a day.
        async function resolveSource(key, url) {
            const now = Date.now();
            const entry = _studentDeadlinesCache[key];
            const fresh = entry && (now - entry.fetchedAt) < STUDENT_DEADLINES_CACHE_TTL_MS;
            const backingOff = entry && entry.lastFailureAt
                && (now - entry.lastFailureAt) < STUDENT_DEADLINES_RETRY_AFTER_FAILURE_MS;
            if (!forceRefresh && entry && (fresh || backingOff)) {
                return { result: entry.result, fetchedAt: entry.fetchedAt, cached: true };
            }

            const result = await fetchOne(url);
            if (result.ok) {
                const fetchedAt = Date.now();
                _studentDeadlinesCache[key] = { fetchedAt, result, lastFailureAt: 0 };
                return { result, fetchedAt, cached: false };
            }

            // A failed refetch must never discard data we already hold.
            if (entry) {
                entry.lastFailureAt = Date.now();
                return { result: entry.result, fetchedAt: entry.fetchedAt, cached: true, refreshError: result.error };
            }
            return { result, fetchedAt: Date.now(), cached: false };
        }

        const course = await resolveSource('course', STUDENT_COURSE_REG_DEADLINES_URL);
        const exam = await resolveSource('exam', STUDENT_EXAM_REG_DEADLINES_URL);

        return {
            ok: !!(course.result.ok || exam.result.ok),
            // The older of the two, so the reported time never overstates freshness.
            fetchedAt: Math.min(course.fetchedAt, exam.fetchedAt),
            cached: course.cached && exam.cached,
            course: course.result,
            exam: exam.result,
            debug: {
                course: { cached: course.cached, fetchedAt: course.fetchedAt, refreshError: course.refreshError || null },
                exam: { cached: exam.cached, fetchedAt: exam.fetchedAt, refreshError: exam.refreshError || null }
            }
        };
    }
    globalThis.DTUAfterDarkDeadlines = {
        fetchStudentDeadlines
    };
})();
