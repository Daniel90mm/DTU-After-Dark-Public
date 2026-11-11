// Background worker for cross-origin data fetches (DTU After Dark)
if (typeof importScripts === 'function' && typeof DTUAfterDarkBackground === 'undefined') {
    importScripts(
        'background.cache.js',
        'background.shared.js',
        'background.grades.js',
        'background.findit.js',
        'background.deadlines.js',
        'background.exam.js',
        'background.evaluation.js',
        'background.mazemap.js',
        'background.library.js'
    );
}
globalThis.DTUAfterDarkBackground = true;

(function() {
    'use strict';

    const runtime = DTUAfterDarkCache.runtime;
    const serveCached = DTUAfterDarkCache.serveCached;
    const GRADE_STATS_CACHE_TTL_MS = DTUAfterDarkCache.GRADE_STATS_CACHE_TTL_MS;
    const COURSE_EVAL_CACHE_TTL_MS = DTUAfterDarkCache.COURSE_EVAL_CACHE_TTL_MS;
    const FINDIT_AVAIL_CACHE_TTL_MS = DTUAfterDarkCache.FINDIT_AVAIL_CACHE_TTL_MS;
    const EXAM_TABLE_CACHE_TTL_MS = DTUAfterDarkCache.EXAM_TABLE_CACHE_TTL_MS;
    const COURSE_PAGE_CACHE_TTL_MS = DTUAfterDarkCache.COURSE_PAGE_CACHE_TTL_MS;
    const LIB_CACHE_TTL_MS = DTUAfterDarkCache.LIB_CACHE_TTL_MS;
    const LIB_CROWD_CACHE_TTL_MS = DTUAfterDarkCache.LIB_CROWD_CACHE_TTL_MS;
    const CACHE_PREFIX_GRADE = DTUAfterDarkCache.CACHE_PREFIX_GRADE;
    const CACHE_PREFIX_EVAL = DTUAfterDarkCache.CACHE_PREFIX_EVAL;
    const CACHE_PREFIX_WORKLOAD = DTUAfterDarkCache.CACHE_PREFIX_WORKLOAD;
    const COURSE_WORKLOAD_CACHE_TTL_MS = DTUAfterDarkCache.COURSE_WORKLOAD_CACHE_TTL_MS;
    const CACHE_PREFIX_FINDIT = DTUAfterDarkCache.CACHE_PREFIX_FINDIT;
    const CACHE_PREFIX_EXAM_TABLE = DTUAfterDarkCache.CACHE_PREFIX_EXAM_TABLE;
    const CACHE_PREFIX_COURSE_PAGE = DTUAfterDarkCache.CACHE_PREFIX_COURSE_PAGE;
    const CACHE_PREFIX_LIB_EVENTS = DTUAfterDarkCache.CACHE_PREFIX_LIB_EVENTS;
    const CACHE_PREFIX_LIB_NEWS = DTUAfterDarkCache.CACHE_PREFIX_LIB_NEWS;
    const CACHE_PREFIX_LIB_CROWD = DTUAfterDarkCache.CACHE_PREFIX_LIB_CROWD;
    const fetchLatestIterations = DTUAfterDarkGrades.fetchLatestIterations;
    const fetchFinditAvailability = DTUAfterDarkFindit.fetchFinditAvailability;
    const fetchStudentDeadlines = DTUAfterDarkDeadlines.fetchStudentDeadlines;
    const fetchPageCached = DTUAfterDarkExam.fetchPageCached;
    const fetchCoursePageCached = DTUAfterDarkExam.fetchCoursePageCached;
    const EXAM_TABLE_URL = DTUAfterDarkExam.EXAM_TABLE_URL;
    const COURSE_CODE_RE = DTUAfterDarkExam.COURSE_CODE_RE;
    const fetchCourseEvaluation = DTUAfterDarkEvaluation.fetchCourseEvaluation;
    const resolveMazemapPoi = DTUAfterDarkMazemap.resolveMazemapPoi;
    const fetchLibraryEvents = DTUAfterDarkLibrary.fetchLibraryEvents;
    const fetchLibraryNews = DTUAfterDarkLibrary.fetchLibraryNews;
    const parseIntLoose = DTUAfterDarkLibrary.parseIntLoose;
    const sanitizeLibraryTrendApiUrl = DTUAfterDarkLibrary.sanitizeLibraryTrendApiUrl;
    const fetchLibraryCrowding = DTUAfterDarkLibrary.fetchLibraryCrowding;

    // A new install starts with the Social tools that store no classmate names switched on
    // (keys from darkmode.feature-flags.js). Shared Course History stays opt-in.
    // Updates leave every saved choice alone.
    const SOCIAL_ON_AT_INSTALL = {
        dtuAfterDarkFeatureParticipantIntel: true,
        dtuAfterDarkFeatureParticipantIntelDemographics: true,
        dtuAfterDarkFeatureParticipantIntelRetention: true
    };
    if (runtime && runtime.runtime && runtime.runtime.onInstalled && runtime.storage && runtime.storage.local) {
        runtime.runtime.onInstalled.addListener((details) => {
            if (!details || details.reason !== 'install') return;
            Promise.resolve(runtime.storage.local.set(SOCIAL_ON_AT_INSTALL))
                .catch((e) => console.warn('DTU After Dark: could not set install defaults', e));
        });
    }

    if (runtime && runtime.runtime && runtime.runtime.onMessage) {
        // Allowed origins: only accept messages from our own content scripts
        const ALLOWED_SENDER_HOSTS = [
            'learn.inside.dtu.dk',
            's.brightspace.com',
            'sts.ait.dtu.dk',
            'evaluering.dtu.dk',
            'studieplan.dtu.dk',
            'kurser.dtu.dk',
            'karakterer.dtu.dk',
            'sites.dtu.dk',
            'campusnet.dtu.dk'
        ];

        function isAllowedSender(sender) {
            // Messages from the extension itself (popup, background, etc.) are always OK
            if (!sender || !sender.url) return true;
            try {
                const url = new URL(sender.url);
                // Extension pages (moz-extension://, chrome-extension://)
                if (url.protocol === 'moz-extension:' || url.protocol === 'chrome-extension:') return true;
                // Content scripts on allowed DTU domains
                if (url.protocol === 'https:' && ALLOWED_SENDER_HOSTS.includes(url.hostname)) return true;
            } catch (e) { /* invalid URL, reject */ }
            return false;
        }

        runtime.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (!message || !message.type) return;
            if (!isAllowedSender(sender)) return;

            if (message.type === 'dtu-grade-stats') {
                const courseCode = String(message.courseCode || '').trim();
                if (!/^[A-Za-z0-9-]+$/.test(courseCode)) {
                    sendResponse({ ok: false, error: 'invalid_course' });
                    return;
                }
                const cacheId = courseCode.toUpperCase();
                serveCached({
                    prefix: CACHE_PREFIX_GRADE,
                    id: cacheId,
                    ttlMs: GRADE_STATS_CACHE_TTL_MS,
                    // Entries cached before mainIndex existed picked the newest
                    // sitting, re-exams included; refetch those.
                    cachedIsUsable: cached => typeof cached.mainIndex === 'number' || cached.error === 'no_data',
                    // Cache "no exams yet" too: a new course otherwise costs
                    // two dozen 404s on every visit to its page.
                    cacheResult: result => !!(result && (result.ok || result.error === 'no_data')),
                    load: () => fetchLatestIterations(courseCode, message.semesters, 4),
                    sendResponse,
                    errorResponse: { ok: false, error: 'fetch_failed' }
                });
                return true;
            }

            if (message.type === 'dtu-findit-availability') {
                const url = String(message.url || '').trim();
                // The whole URL is the key: folding characters to "_" or cutting
                // it short let two different searches share one answer.
                const finditCacheId = url;
                serveCached({
                    prefix: CACHE_PREFIX_FINDIT,
                    id: finditCacheId,
                    ttlMs: FINDIT_AVAIL_CACHE_TTL_MS,
                    markCached: false,
                    load: () => fetchFinditAvailability(url),
                    sendResponse,
                    errorResponse: { ok: false, error: 'fetch_failed', onlineAccess: false }
                });
                return true;
            }

            if (message.type === 'dtu-student-deadlines') {
                const forceRefresh = !!message.forceRefresh;
                fetchStudentDeadlines(forceRefresh)
                    .then(sendResponse)
                    .catch(() => sendResponse({ ok: false, error: 'fetch_failed' }));
                return true;
            }

            if (message.type === 'dtu-exam-table') {
                fetchPageCached(CACHE_PREFIX_EXAM_TABLE, 'en', EXAM_TABLE_CACHE_TTL_MS, EXAM_TABLE_URL, 'omit').then(sendResponse);
                return true;
            }

            if (message.type === 'dtu-course-page') {
                const code = String(message.code || '');
                if (!COURSE_CODE_RE.test(code)) {
                    sendResponse({ ok: false, error: 'invalid_course' });
                    return;
                }
                // Optional catalogue year ("2027-2028"): DTU serves each year's
                // description at /course/YYYY-YYYY/CODE.
                const volume = message.volume == null ? '' : message.volume;
                const years = /^(\d{4})-(\d{4})$/.exec(typeof volume === 'string' ? volume : '');
                if (volume !== '' && !(years && +years[2] === +years[1] + 1)) {
                    sendResponse({ ok: false, error: 'invalid_volume' });
                    return;
                }
                const path = (volume ? volume + '/' : '') + code;
                fetchCoursePageCached(CACHE_PREFIX_COURSE_PAGE, COURSE_PAGE_CACHE_TTL_MS, path).then(sendResponse);
                return true;
            }

            if (message.type === 'dtu-course-workload') {
                const code = String(message.code || '');
                if (!COURSE_CODE_RE.test(code)) {
                    sendResponse({ ok: false, error: 'invalid_course' });
                    return;
                }
                serveCached({
                    prefix: CACHE_PREFIX_WORKLOAD,
                    id: code,
                    ttlMs: COURSE_WORKLOAD_CACHE_TTL_MS,
                    load: () => DTUAfterDarkEvaluation.fetchCourseWorkload(code,
                        path => fetchCoursePageCached(CACHE_PREFIX_COURSE_PAGE, COURSE_PAGE_CACHE_TTL_MS, path)),
                    sendResponse,
                    errorResponse: { ok: false, error: 'fetch_failed' }
                });
                return true;
            }

            if (message.type === 'dtu-course-evaluation') {
                const evalUrl = String(message.url || '').trim();
                // Cache by eval URL path (strip protocol/host for shorter key)
                const evalCacheId = evalUrl.replace(/^https?:\/\/[^/]+/, '').replace(/[^a-zA-Z0-9]/g, '_');
                serveCached({
                    prefix: CACHE_PREFIX_EVAL,
                    id: evalCacheId,
                    ttlMs: COURSE_EVAL_CACHE_TTL_MS,
                    load: () => fetchCourseEvaluation(evalUrl),
                    sendResponse,
                    errorResponse: { ok: false, error: 'fetch_failed' }
                });
                return true;
            }

            if (message.type === 'dtu-mazemap-resolve') {
                const building = String(message.building || '').trim();
                const room = String(message.room || '').trim();
                resolveMazemapPoi(building, room)
                    .then(sendResponse)
                    .catch(e => sendResponse({ ok: false, error: 'fetch_error', message: String(e && e.message || e) }));
                return true;
            }

            if (message.type === 'dtu-library-events') {
                const cacheId = 'lyngby';
                serveCached({
                    prefix: CACHE_PREFIX_LIB_EVENTS,
                    id: cacheId,
                    ttlMs: LIB_CACHE_TTL_MS,
                    forceRefresh: !!message.forceRefresh,
                    load: fetchLibraryEvents,
                    sendResponse,
                    errorResponse: { ok: false, error: 'fetch_error' }
                });
                return true;
            }

            if (message.type === 'dtu-library-news') {
                const cacheId = 'main';
                serveCached({
                    prefix: CACHE_PREFIX_LIB_NEWS,
                    id: cacheId,
                    ttlMs: LIB_CACHE_TTL_MS,
                    forceRefresh: !!message.forceRefresh,
                    load: fetchLibraryNews,
                    sendResponse,
                    errorResponse: { ok: false, error: 'fetch_error' }
                });
                return true;
            }

            if (message.type === 'dtu-library-live-stats') {
                const apiUrl = sanitizeLibraryTrendApiUrl(message.apiUrl);
                const lookback = parseIntLoose(message.lookbackDays) || 28;
                if (!apiUrl) {
                    sendResponse({ ok: false, error: 'not_configured' });
                    return;
                }
                const cacheId = (apiUrl + '|lb=' + String(Math.max(3, Math.min(365, lookback))))
                    .replace(/[^a-zA-Z0-9]/g, '_')
                    .slice(0, 180);
                serveCached({
                    prefix: CACHE_PREFIX_LIB_CROWD,
                    id: () => cacheId,
                    ttlMs: LIB_CROWD_CACHE_TTL_MS,
                    forceRefresh: !!message.forceRefresh,
                    load: () => fetchLibraryCrowding(apiUrl, lookback),
                    sendResponse,
                    errorResponse: { ok: false, error: 'fetch_error' }
                });
                return true;
            }

            return;
        });
    }
})();
