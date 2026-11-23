// Persistent storage cache and TTL helpers for the DTU After Dark background worker.
(function() {
    'use strict';

    const runtime = (typeof browser !== 'undefined') ? browser : chrome;

    // --- Persistent storage cache helpers (browser.storage.local) ---
    const EXAM_TABLE_CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
    const COURSE_PAGE_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

    const GRADE_STATS_CACHE_TTL_MS  = 1000 * 60 * 60 * 24;   // 24 hours
    const COURSE_EVAL_CACHE_TTL_MS  = 1000 * 60 * 60 * 24;   // 24 hours
    const FINDIT_AVAIL_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

    const CACHE_PREFIX_GRADE  = 'cache_grade_';
    const CACHE_PREFIX_EVAL   = 'cache_eval_';
    const CACHE_PREFIX_WORKLOAD = 'cache_workload_';
    // Evaluations are published twice a year.
    const COURSE_WORKLOAD_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
    const CACHE_PREFIX_FINDIT = 'cache_findit_';
    const CACHE_PREFIX_EXAM_TABLE = 'cache_exam_table_';
    const CACHE_PREFIX_COURSE_PAGE = 'cache_course_page_';
    const CACHE_PREFIX_LIB_EVENTS = 'cache_lib_events_';
    const CACHE_PREFIX_LIB_NEWS   = 'cache_lib_news_';
    const CACHE_PREFIX_LIB_CROWD  = 'cache_lib_crowd_';
    const LIB_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
    const LIB_CROWD_CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

    function storageGet(key) {
        return new Promise(resolve => {
            try {
                runtime.storage.local.get(key, items => {
                    resolve(items && items[key] ? items[key] : null);
                });
            } catch (e) { resolve(null); }
        });
    }
    // Every cache prefix and how long its entries stay good. Entries past it
    // are only ever skipped on read, so pruneCache deletes them.
    const CACHE_TTLS = [
        [CACHE_PREFIX_GRADE, GRADE_STATS_CACHE_TTL_MS],
        [CACHE_PREFIX_EVAL, COURSE_EVAL_CACHE_TTL_MS],
        [CACHE_PREFIX_WORKLOAD, COURSE_WORKLOAD_CACHE_TTL_MS],
        [CACHE_PREFIX_FINDIT, FINDIT_AVAIL_CACHE_TTL_MS],
        [CACHE_PREFIX_EXAM_TABLE, EXAM_TABLE_CACHE_TTL_MS],
        [CACHE_PREFIX_COURSE_PAGE, COURSE_PAGE_CACHE_TTL_MS],
        [CACHE_PREFIX_LIB_EVENTS, LIB_CACHE_TTL_MS],
        [CACHE_PREFIX_LIB_NEWS, LIB_CACHE_TTL_MS],
        [CACHE_PREFIX_LIB_CROWD, LIB_CROWD_CACHE_TTL_MS]
    ];

    function cacheTtlFor(key) {
        const hit = CACHE_TTLS.find(([prefix]) => key.indexOf(prefix) === 0);
        return hit ? hit[1] : null;
    }

    // Deletes cache entries: the expired ones, or with all set every one
    // (they are only copies of DTU pages). Settings are never touched.
    // Chrome gives storage.local 10 MB, shared with the settings, so a cache
    // that only grows ends in failed writes, the dark mode toggle's included.
    function pruneCache(all) {
        return new Promise(resolve => {
            try {
                runtime.storage.local.get(null, items => {
                    const now = Date.now();
                    const stale = Object.keys(items || {}).filter(key => {
                        const ttl = cacheTtlFor(key);
                        if (ttl === null) return false;
                        const entry = items[key];
                        return all || !entry || !entry.ts || (now - entry.ts) > ttl;
                    });
                    if (stale.length) storageRemove(stale);
                    resolve(stale.length);
                });
            } catch (e) { resolve(0); }
        });
    }

    function storageWrite(obj) {
        try {
            return Promise.resolve(runtime.storage.local.set(obj));
        } catch (e) { return Promise.reject(e); }
    }

    // A cache write that fails (storage full) clears the whole cache and
    // tries once more; a second failure is logged, not hidden.
    function storageSet(key, value) {
        const obj = {};
        obj[key] = value;
        return storageWrite(obj)
            .catch(() => pruneCache(true).then(() => storageWrite(obj)))
            .catch(e => console.warn('DTU After Dark: cache write failed for ' + key, e));
    }
    function storageRemove(keys) {
        try {
            runtime.storage.local.remove(keys);
        } catch (e) { /* best-effort */ }
    }
    function storageCacheGet(prefix, id, ttlMs) {
        const key = prefix + id;
        return storageGet(key).then(entry => {
            if (!entry || !entry.ts || (Date.now() - entry.ts) > ttlMs) return null;
            return entry.data;
        });
    }
    function storageCacheSet(prefix, id, data) {
        const key = prefix + id;
        storageSet(key, { ts: Date.now(), data });
    }

    // One cache-get, optional refresh, fetch, cache-set and error-response flow
    // for the message router. Services differ through the explicit options:
    // cachedIsUsable, cacheResult, markCached, forceRefresh, computed id and
    // the error response shape.
    function serveCached(options) {
        const id = (typeof options.id === 'function') ? options.id() : options.id;
        const cachedIsUsable = options.cachedIsUsable || (cached => !!cached);
        const cacheResult = options.cacheResult || (result => !!(result && result.ok));
        const markCached = options.markCached !== false;
        const errorResponse = options.errorResponse || { ok: false, error: 'fetch_failed' };

        return storageCacheGet(options.prefix, id, options.ttlMs).then(cached => {
            if (cached && !options.forceRefresh && cachedIsUsable(cached)) {
                if (markCached) cached.cached = true;
                options.sendResponse(cached);
                return;
            }
            return Promise.resolve()
                .then(options.load)
                .then(result => {
                    if (cacheResult(result)) storageCacheSet(options.prefix, id, result);
                    options.sendResponse(result);
                })
                .catch(() => options.sendResponse(
                    (typeof errorResponse === 'function') ? errorResponse() : errorResponse
                ));
        });
    }

    if (runtime.runtime) {
        if (runtime.runtime.onStartup) runtime.runtime.onStartup.addListener(() => pruneCache(false));
        if (runtime.runtime.onInstalled) runtime.runtime.onInstalled.addListener(() => pruneCache(false));
    }

    storageRemove([
        'worker_usage_install_id_v1',
        'worker_usage_last_day_v1',
        'dtuAfterDarkFeatureKurserRoomFinder',
        'dtuAfterDarkFeatureStudyplanExamCluster',
        'dtuAfterDarkFeatureKurserScheduleAnnotation',
        'dtuAfterDarkFeatureKurserMyLineBadges',
        'cache_myline_me'
    ]);
    // Shared namespace for the split background scripts.
    globalThis.DTUAfterDarkCache = {
        runtime,
        storageGet,
        storageSet,
        storageRemove,
        pruneCache,
        storageCacheGet,
        storageCacheSet,
        serveCached,
        GRADE_STATS_CACHE_TTL_MS,
        COURSE_EVAL_CACHE_TTL_MS,
        FINDIT_AVAIL_CACHE_TTL_MS,
        EXAM_TABLE_CACHE_TTL_MS,
        COURSE_PAGE_CACHE_TTL_MS,
        LIB_CACHE_TTL_MS,
        LIB_CROWD_CACHE_TTL_MS,
        CACHE_PREFIX_GRADE,
        CACHE_PREFIX_EVAL,
        CACHE_PREFIX_WORKLOAD,
        COURSE_WORKLOAD_CACHE_TTL_MS,
        CACHE_PREFIX_FINDIT,
        CACHE_PREFIX_EXAM_TABLE,
        CACHE_PREFIX_COURSE_PAGE,
        CACHE_PREFIX_LIB_EVENTS,
        CACHE_PREFIX_LIB_NEWS,
        CACHE_PREFIX_LIB_CROWD
    };
})();
