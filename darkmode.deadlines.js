(function () {
    'use strict';
    var markExt = globalThis.DTUAfterDarkDom.markExt;
    var isTopWindow = globalThis.DTUAfterDarkDom.isTopWindow;
    var normalizeWhitespace = globalThis.DTUAfterDarkDom.normalizeWhitespace;
    var schedulePlacement = globalThis.DTUAfterDarkDom.schedulePlacement;
    var copenhagenDateIso = globalThis.DTUAfterDarkDom.copenhagenDateIso;
    if (typeof schedulePlacement !== 'function' || typeof copenhagenDateIso !== 'function') {
        throw new Error('darkmode.deadlines.js requires DTUAfterDarkDom.schedulePlacement and copenhagenDateIso');
    }
    function skeletonApi() {
        var skel = globalThis.DTUAfterDarkSkeleton;
        if (!skel) throw new Error('DTUAfterDarkSkeleton missing: load darkmode.skeleton.js before darkmode.deadlines.js');
        return skel;
    }

    // The timeline's outline while the first deadlines load: a month axis, then
    // two period rows with the name on the left and offset bars for its dates,
    // about as tall as the real timeline so nothing below jumps when it arrives.
    function deadlinesSkeleton() {
        var skel = skeletonApi();
        var box = skel.block('Loading deadlines', [], markExt);
        box.style.cssText = 'gap:0;padding:6px 0 10px';
        function div(css) {
            var d = document.createElement('div');
            markExt(d);
            d.setAttribute('aria-hidden', 'true');
            d.style.cssText = css;
            return d;
        }
        var axis = div('display:flex;justify-content:space-around;padding:0 0 18px 200px');
        for (var m = 0; m < 5; m++) axis.appendChild(skel.bar('30px', '10px', null, markExt));
        box.appendChild(axis);
        [[[6, 12, 18, 8], [40, 12, 26, 8], [36, 54, 20, 4]], [[24, 12, 34, 8], [66, 12, 30, 8], [58, 54, 34, 4]]].forEach(function (marks) {
            var row = div('display:grid;grid-template-columns:200px minmax(0,1fr);align-items:center;min-height:110px;border-top:1px solid rgba(128,128,128,.14)');
            var name = div('display:flex;flex-direction:column;gap:8px');
            name.appendChild(skel.bar('112px', '15px', null, markExt));
            name.appendChild(skel.bar('150px', '11px', null, markExt));
            row.appendChild(name);
            var lane = div('position:relative;height:70px');
            marks.forEach(function (k) {
                var b = skel.bar(k[2] + '%', k[3] + 'px', null, markExt);
                b.style.position = 'absolute';
                b.style.left = k[0] + '%';
                b.style.top = k[1] + 'px';
                lane.appendChild(b);
            });
            row.appendChild(lane);
            box.appendChild(row);
        });
        return box;
    }

    var deadlineData = getDeadlineData();
    var deadlineTimeline = getDeadlineTimeline();

    var DEADLINES_CACHE_KEY = 'dtuDarkModeDeadlinesCacheV2';
    // DTU publishes these dates years ahead and edits them rarely, so elapsed time is a
    // poor refetch trigger. The real signal is the data horizon; this is only a safety
    // net for amendments to already-published dates.
    // Checked once a day: two small pages, so a date DTU amends shows up by the next day.
    var DEADLINES_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
    // A failing source must not be retried on every render, nor on every page: the
    // time a DTU page last failed is kept in localStorage, as the background's own
    // pause ends with its worker.
    var DEADLINES_AUTO_RETRY_MS = 1000 * 60 * 10;
    var DEADLINES_FAILED_AT_KEY = 'dtuDarkModeDeadlinesFailedAt';
    var DEADLINES_HORIZON_REFRESH_MS = 1000 * 60 * 60 * 24 * 120;
    var DEADLINES_EXPANDED_KEY = 'dtuDarkModeDeadlinesExpanded';
    var ATOMIC_SEARCH_HIDDEN_ATTR = 'data-dtu-atomic-search-hidden';
    var ATOMIC_SEARCH_HIDDEN_STYLE_ATTR = 'data-dtu-atomic-search-prev-style';
    var ATOMIC_SEARCH_NAV_HIDDEN_ATTR = 'data-dtu-atomic-search-nav-hidden';
    var ATOMIC_SEARCH_NAV_HIDDEN_STYLE_ATTR = 'data-dtu-atomic-search-nav-prev-style';
    var _deadlinesFetchInProgress = false;
    var _deadlinesLastResponse = null;
    var _deadlinesLastRequestAt = 0;
    var _deadlinesLastAutoRequestAt = 0;
    var _deadlinesLastRefreshFailed = false;
    var _exchangeAskedThisPage = false;
    // The stored answer may predate a permission grant, so it is not trusted until this page asks.
    var _exchangeAnsweredThisPage = false;
    var _courseSearchVisibilityWatch = null;
    var _deadlinesWidgetWatch = null;

    function getDeps() {
        try { return globalThis.DTUAfterDarkDeadlinesDeps || null; } catch (e0) { return null; }
    }

    function getDeadlineData() {
        var data = globalThis.DTUAfterDarkDeadlinesData;
        var required = [
            'normalizeDeadlinePeriodText',
            'getDeadlinePeriodLabels',
            'getDeadlineRowStartTs',
            'getDeadlineRowEndTs',
            'buildDeadlinePeriodGroups',
            'selectDeadlinePeriodGroups'
        ];
        if (!data || !Array.isArray(data.MONTH_NAMES)
            || required.some(function (name) { return typeof data[name] !== 'function'; })) {
            throw new Error('darkmode.deadlines.js requires darkmode.deadlines.data.js loaded first');
        }
        return data;
    }

    function getDeadlineTimeline() {
        var timeline = globalThis.DTUAfterDarkDeadlinesTimeline;
        var required = [
            'getDeadlineWindow',
            'buildDeadlineTimelineAxis',
            'selectDeadlineTimelineRows',
            'formatDeadlineDayMonth',
            'ensureDeadlinesTimelineStyles',
            'createDeadlinesTimeline'
        ];
        if (!timeline || required.some(function (name) { return typeof timeline[name] !== 'function'; })) {
            throw new Error('darkmode.deadlines.js requires darkmode.deadlines.timeline.js loaded first');
        }
        return timeline;
    }


    function isDarkMode() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDarkMode === 'function' && deps.isDarkMode());
    }

    // Off by default: needs the optional beyondborders.dtu.dk permission (Settings).
    var EXCHANGE_ENABLED_KEY = 'dtuDarkModeExchangeDeadlineEnabled';
    function isExchangeEnabled() {
        try { return localStorage.getItem(EXCHANGE_ENABLED_KEY) === 'true'; } catch (e) { return false; }
    }

    function isDeadlinesEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDeadlinesEnabled === 'function' && deps.isDeadlinesEnabled());
    }

    function isSearchWidgetEnabled() {
        var deps = getDeps();
        if (!deps || typeof deps.isSearchWidgetEnabled !== 'function') return false;
        return !!deps.isSearchWidgetEnabled();
    }

    function isDTULearnHomepage() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDTULearnHomepage === 'function' && deps.isDTULearnHomepage());
    }



    function deepQueryAll(selector, root) {
        var deps = getDeps();
        if (deps && typeof deps.deepQueryAll === 'function') {
            return deps.deepQueryAll(selector, root);
        }
        var out = [];
        var seenRoots = new WeakSet();

        function visit(node) {
            if (!node || seenRoots.has(node)) return;
            seenRoots.add(node);
            try {
                if (node.querySelectorAll) {
                    Array.prototype.forEach.call(node.querySelectorAll(selector), function (match) {
                        out.push(match);
                    });
                    Array.prototype.forEach.call(node.querySelectorAll('*'), function (el) {
                        if (el && el.shadowRoot) visit(el.shadowRoot);
                    });
                }
            } catch (e0) { }
        }

        visit(root || document);
        return out;
    }

    function sendRuntimeMessage(message, cb) {
        var deps = getDeps();
        if (deps && typeof deps.sendRuntimeMessage === 'function') {
            deps.sendRuntimeMessage(message, cb);
            return;
        }
        if (cb) cb(null);
    }

    function getAdminToolsPlaceholder() {
        var deps = getDeps();
        if (deps && typeof deps.getAdminToolsPlaceholder === 'function') {
            return deps.getAdminToolsPlaceholder();
        }
        return null;
    }

    function getAfterDarkAdminToolsList() {
        var deps = getDeps();
        if (deps && typeof deps.getAfterDarkAdminToolsList === 'function') {
            return deps.getAfterDarkAdminToolsList();
        }
        var placeholder = getAdminToolsPlaceholder();
        if (!placeholder) return null;
        var columns = placeholder.querySelectorAll('.d2l-admin-tools-column');
        var targetList = null;
        columns.forEach(function (col) {
            var h2 = col.querySelector('h2');
            if (h2 && normalizeWhitespace(h2.textContent) === 'DTU After Dark') {
                targetList = col.querySelector('ul.d2l-list');
            }
        });
        return targetList;
    }

    function startOfTodayUtcTs() {
        var deps = getDeps();
        if (deps && typeof deps.startOfTodayUtcTs === 'function') {
            return deps.startOfTodayUtcTs();
        }
        // Today in Denmark: DTU deadlines are Danish dates, whatever the browser's time zone.
        var p = copenhagenDateIso().split('-');
        return Date.UTC(+p[0], +p[1] - 1, +p[2]);
    }

    function buildUpcomingDeadlineRows(groups, todayTs, limit) {
        var out = [];
        (groups || []).forEach(function (group) {
            var period = deadlineData.normalizeDeadlinePeriodText(group && group.heading || '');
            (group && Array.isArray(group.items) ? group.items : []).forEach(function (item) {
                if (!item || typeof item.startTs !== 'number') return;
                var info = deadlineTimeline.getDeadlineWindow(item, todayTs);
                if (!info || info.state === 'past' || info.nextTs < todayTs) return;
                out.push({
                    period: period,
                    label: String(item.label || '').trim(),
                    startIso: item.startIso,
                    startTs: item.startTs,
                    endIso: item.endIso,
                    endTs: item.endTs,
                    state: info.state,
                    nextTs: info.nextTs
                });
            });
        });
        out.sort(function (a, b) { return a.nextTs - b.nextTs; });
        return out.slice(0, (typeof limit === 'number' && limit > 0) ? limit : 8);
    }

    function mergeDuplicateDeadlineRows(rows) {
        var merged = [];
        var byKey = Object.create(null);

        (rows || []).forEach(function (row) {
            if (!row) return;
            var key = [
                String(row.kind || ''),
                String(row.label || '').trim().toLowerCase(),
                String(row.startIso || ''),
                String(row.endIso || '')
            ].join('|');

            if (!byKey[key]) {
                var copy = Object.assign({}, row);
                copy.periods = row.period ? [String(row.period)] : [];
                byKey[key] = copy;
                merged.push(copy);
                return;
            }

            var existing = byKey[key];
            if (row.period) {
                var periodText = String(row.period);
                if (!existing.periods) existing.periods = [];
                if (existing.periods.indexOf(periodText) === -1) existing.periods.push(periodText);
            }
        });

        return merged;
    }

    // DTU publishes registration deadlines years ahead (currently into 2029), so a cached
    // snapshot does not run out of rows for a long time. What actually matters is the
    // horizon of the data we hold, not how long ago we fetched it.
    // background.js caches a response when EITHER source parsed, so a snapshot can hold
    // course deadlines and no exam deadlines while still reporting ok. That half-failure
    // is otherwise invisible: the missing source simply contributes no lanes.
    function getDeadlineSourceProblems(resp) {
        var problems = [];
        [['Course', resp && resp.course], ['Exam', resp && resp.exam]].forEach(function (entry) {
            var source = entry[1];
            if (!source || !source.ok || !(source.groups && source.groups.length)) problems.push(entry[0]);
        });
        return problems;
    }

    function getDeadlineSourceHorizonTs(source) {
        var horizon = null;
        ((source && source.groups) || []).forEach(function (group) {
            ((group && group.items) || []).forEach(function (item) {
                if (!item) return;
                [item.startTs, item.endTs].forEach(function (ts) {
                    if (typeof ts !== 'number' || !isFinite(ts)) return;
                    if (horizon == null || ts > horizon) horizon = ts;
                });
            });
        });
        return horizon;
    }

    // The two sources do not reach equally far ahead: course registration is published
    // into 2029 while exam registration stops in 2028. Tracking them separately means a
    // source that has run dry is reported instead of being masked by the other one.
    function getDeadlineSourceHorizons(resp) {
        return {
            course: getDeadlineSourceHorizonTs(resp && resp.course),
            exam: getDeadlineSourceHorizonTs(resp && resp.exam)
        };
    }

    function getDeadlineDataHorizonTs(resp) {
        var horizons = getDeadlineSourceHorizons(resp);
        var values = [horizons.course, horizons.exam].filter(function (ts) { return ts != null; });
        return values.length ? Math.max.apply(Math, values) : null;
    }

    function buildDeadlineHorizonNotices(resp, todayTs) {
        var horizons = getDeadlineSourceHorizons(resp);
        return [
            { label: 'Course', ts: horizons.course },
            { label: 'Exam', ts: horizons.exam }
        ].filter(function (entry) {
            return entry.ts != null && todayTs > entry.ts;
        }).map(function (entry) {
            return entry.label + ' deadlines are published only to ' + formatDeadlineTsShort(entry.ts) + '.';
        });
    }

    function requestStudentDeadlines(forceRefresh, cb) {
        if (!isTopWindow()) return;
        if (_deadlinesFetchInProgress) return;

        var now = Date.now();
        if (!forceRefresh && _deadlinesLastRequestAt && (now - _deadlinesLastRequestAt) < 1500) return;
        _deadlinesLastRequestAt = now;

        _deadlinesFetchInProgress = true;
        sendRuntimeMessage({ type: 'dtu-student-deadlines', forceRefresh: !!forceRefresh, exchange: isExchangeEnabled() }, function (response) {
            _deadlinesFetchInProgress = false;
            var pageFailed = !isUsableDeadlinesResponse(response)
                || (response.course && response.course.ok === false) || (response.exam && response.exam.ok === false);
            try {
                if (pageFailed) localStorage.setItem(DEADLINES_FAILED_AT_KEY, String(Date.now()));
                else localStorage.removeItem(DEADLINES_FAILED_AT_KEY);
            } catch (e0) { }
            if (isUsableDeadlinesResponse(response)) {
                response = keepHeldSources(response, _deadlinesLastResponse || readStoredDeadlines());
                _deadlinesLastResponse = response;
                _deadlinesLastRefreshFailed = false;
                if (response.exchange) _exchangeAnsweredThisPage = true;
                try {
                    localStorage.setItem(DEADLINES_CACHE_KEY, JSON.stringify(response));
                } catch (e) {
                }
            } else {
                // Keep showing the last good snapshot, but stop pretending the refresh worked.
                _deadlinesLastRefreshFailed = true;
            }
            if (cb) cb(response);
        });
    }

    function getAtomicSearchWidgetRoot() {
        var atomic = document.querySelector('#atomic-jolt-search-widget') || document.querySelector('atomic-search-widget');
        if (!atomic) {
            var hits = deepQueryAll('#atomic-jolt-search-widget, atomic-search-widget', document);
            atomic = hits && hits.length ? hits[0] : null;
        }
        if (!atomic) return null;
        return atomic.closest('.d2l-widget') || null;
    }

    function setAtomicSearchWidgetHidden(hidden) {
        var widget = getAtomicSearchWidgetRoot();
        if (!widget) return;

        if (hidden) {
            if (widget.getAttribute(ATOMIC_SEARCH_HIDDEN_ATTR) === '1') return;
            widget.setAttribute(ATOMIC_SEARCH_HIDDEN_ATTR, '1');
            widget.setAttribute(ATOMIC_SEARCH_HIDDEN_STYLE_ATTR, widget.getAttribute('style') || '');
            widget.style.setProperty('display', 'none', 'important');
            return;
        }

        if (widget.getAttribute(ATOMIC_SEARCH_HIDDEN_ATTR) !== '1') return;
        var prev = widget.getAttribute(ATOMIC_SEARCH_HIDDEN_STYLE_ATTR) || '';
        widget.removeAttribute(ATOMIC_SEARCH_HIDDEN_ATTR);
        widget.removeAttribute(ATOMIC_SEARCH_HIDDEN_STYLE_ATTR);
        if (prev) widget.setAttribute('style', prev);
        else widget.removeAttribute('style');
    }

    function getAtomicSearchNavItem() {
        var links = [];
        try {
            links = deepQueryAll('.d2l-navigation-s-item a.d2l-navigation-s-link, a.d2l-navigation-s-link', document);
        } catch (e0) {
            links = [];
        }

        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            if (!link) continue;
            var href = '';
            var text = '';
            try { href = String(link.getAttribute('href') || ''); } catch (e1) { href = ''; }
            try { text = normalizeWhitespace(link.textContent || ''); } catch (e2) { text = ''; }

            if (!/atomic search/i.test(text) && !/rcode=dtu-644730/i.test(href) && !/framedName=Atomic\+Search/i.test(href)) {
                continue;
            }

            return (link.closest && link.closest('.d2l-navigation-s-item')) || link;
        }

        return null;
    }

    function enforceCourseSearchVisibility() {
        var hidden = !isSearchWidgetEnabled();
        setAtomicSearchNavItemHidden(hidden);
        if (isDTULearnHomepage()) {
            setAtomicSearchWidgetHidden(hidden);
        }
        return {
            nav: !!getAtomicSearchNavItem(),
            widget: !!getAtomicSearchWidgetRoot()
        };
    }

    function scheduleCourseSearchVisibilityEnforce() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (_courseSearchVisibilityWatch && _courseSearchVisibilityWatch.active()) {
            _courseSearchVisibilityWatch.trigger();
            return;
        }
        _courseSearchVisibilityWatch = schedulePlacement({
            capMs: 30000,
            run: function () {
                var found = enforceCourseSearchVisibility();
                // The Atomic Search nav item exists only on the homepage. On course
                // and Lessons pages there is nothing for this pass to wait for.
                return !isDTULearnHomepage() || (found.nav && found.widget);
            }
        });
    }

    function setAtomicSearchNavItemHidden(hidden) {
        var item = getAtomicSearchNavItem();
        if (!item) return;

        if (hidden) {
            if (item.getAttribute(ATOMIC_SEARCH_NAV_HIDDEN_ATTR) === '1') return;
            item.setAttribute(ATOMIC_SEARCH_NAV_HIDDEN_ATTR, '1');
            item.setAttribute(ATOMIC_SEARCH_NAV_HIDDEN_STYLE_ATTR, item.getAttribute('style') || '');
            item.style.setProperty('display', 'none', 'important');
            item.setAttribute('aria-hidden', 'true');
            return;
        }

        if (item.getAttribute(ATOMIC_SEARCH_NAV_HIDDEN_ATTR) !== '1') return;
        var prev = item.getAttribute(ATOMIC_SEARCH_NAV_HIDDEN_STYLE_ATTR) || '';
        item.removeAttribute(ATOMIC_SEARCH_NAV_HIDDEN_ATTR);
        item.removeAttribute(ATOMIC_SEARCH_NAV_HIDDEN_STYLE_ATTR);
        item.removeAttribute('aria-hidden');
        if (prev) item.setAttribute('style', prev);
        else item.removeAttribute('style');
    }

    var COURSE_DEADLINES_URL = 'https://student.dtu.dk/en/courses-and-teaching/course-registration/course-registration-deadlines';
    var EXAM_DEADLINES_URL = 'https://student.dtu.dk/en/exam/exam-registration/-deadlines-for-exams';
    var EXCHANGE_DEADLINES_URL = 'https://beyondborders.dtu.dk/Pages/searchUni.aspx';

    // A source link from the response or the stored cache: only an https page on
    // student.dtu.dk, else DTU's fixed page.
    function deadlineSourceUrl(source, fallback) {
        try {
            var u = new URL(String(source && source.url || ''));
            if (u.protocol === 'https:' && (u.hostname === 'student.dtu.dk' || u.hostname === 'beyondborders.dtu.dk')) return u.href;
        } catch (e0) { }
        return fallback;
    }

    // A stored response is used only in the shape the widget reads.
    function readStoredDeadlines() {
        try {
            var parsed = JSON.parse(localStorage.getItem(DEADLINES_CACHE_KEY) || 'null');
            return isUsableDeadlinesResponse(parsed) ? parsed : null;
        } catch (e) {
            return null;
        }
    }

    // A source that failed this time keeps the copy already held for it, and the
    // answer then counts as old as that copy. The background keeps the last good
    // copy only while its worker lives (Chrome stops it after about 30 s idle), so
    // a failed source can arrive empty; saved as it came, it replaced the good
    // copy and its deadlines were gone for a day.
    function keepHeldSources(resp, held) {
        if (!held || !isUsableDeadlinesResponse(held)) return resp;
        var out = Object.assign({}, resp);
        var kept = false;
        ['course', 'exam', 'exchange'].forEach(function (k) {
            var now = resp[k];
            var before = held[k];
            if (!now || now.ok !== false || !before || !before.ok) return;
            out[k] = before;
            kept = true;
        });
        if (kept && typeof held.fetchedAt === 'number') {
            out.fetchedAt = typeof resp.fetchedAt === 'number' ? Math.min(resp.fetchedAt, held.fetchedAt) : held.fetchedAt;
        }
        return out;
    }

    function readLastFailedAt() {
        try { return Number(localStorage.getItem(DEADLINES_FAILED_AT_KEY)) || 0; } catch (e) { return 0; }
    }

    function isUsableDeadlinesResponse(resp) {
        if (!resp || typeof resp !== 'object' || !resp.ok) return false;
        return ['course', 'exam'].every(function (k) {
            var src = resp[k];
            if (src == null) return true;
            return typeof src === 'object' && (src.groups == null || Array.isArray(src.groups));
        });
    }

    function buildTopDeadlines(resp, todayTs, limit) {
        var out = [];
        var definitions = [['course', COURSE_DEADLINES_URL], ['exam', EXAM_DEADLINES_URL]];
        if (isExchangeEnabled()) definitions.push(['exchange', EXCHANGE_DEADLINES_URL]);
        definitions.forEach(function (definition) {
            var kind = definition[0];
            var source = resp && resp[kind];
            var rows = buildUpcomingDeadlineRows((source && source.groups) || [], todayTs, 60);
            var sourceUrl = deadlineSourceUrl(source, definition[1]);
            rows.forEach(function (row) {
                row.kind = kind;
                row.sourceUrl = sourceUrl;
                out.push(row);
            });
        });

        var deduped = mergeDuplicateDeadlineRows(out);
        deduped.sort(function (a, b) { return a.nextTs - b.nextTs; });
        var rowLimit = (typeof limit === 'number' && limit > 0) ? limit : 3;
        if (deduped.length <= rowLimit) return deduped;

        var end = rowLimit;
        var cutoffTs = deduped[rowLimit - 1].nextTs;
        while (end < deduped.length && deduped[end].nextTs === cutoffTs) end++;
        return deduped.slice(0, end);
    }

    function formatDeadlineTsShort(ts) {
        if (typeof ts !== 'number' || !isFinite(ts)) return '';
        return deadlineTimeline.formatDeadlineDayMonth(ts, null, true);
    }
    function setDeadlinesWidgetExpandedState(widget, expanded) {
        if (!widget || !widget.querySelector) return;
        var header = widget.querySelector('.d2l-widget-header');
        var headerWrap = widget.querySelector('.d2l-homepage-header-wrapper');
        var title = widget.querySelector('#dtu-deadlines-home-title');
        var chevronBtn = widget.querySelector('[data-dtu-deadlines-chevron]');
        var content = widget.querySelector('[data-dtu-deadlines-content]');

        widget.setAttribute('data-dtu-deadlines-expanded', expanded ? 'true' : 'false');
        widget.style.paddingTop = '10px';
        widget.style.paddingBottom = expanded ? '' : '10px';
        if (content) content.style.display = expanded ? '' : 'none';
        if (header) header.style.setProperty('padding', '2px 7px', 'important');
        if (headerWrap) {
            headerWrap.style.justifyContent = 'flex-start';
            headerWrap.style.gap = '8px';
            headerWrap.style.minHeight = '';
            headerWrap.style.height = '';
        }
        if (title) {
            title.style.flex = '0 1 auto';
            title.style.minWidth = '0px';
            title.style.lineHeight = '';
        }
        if (chevronBtn) chevronBtn.style.height = '';
    }

    // Fetches DTU's pages again when the held copy is a day old, or when the dates it
    // holds are about to run out. At most one automatic request per 10 minutes, so a
    // source that keeps failing is not retried on every render.
    function scheduleDailyDeadlinesCheck(widget, resp, todayTs) {
        var now = Date.now();
        var fetchedAt = (resp && typeof resp.fetchedAt === 'number') ? resp.fetchedAt : 0;
        var horizonTs = getDeadlineDataHorizonTs(resp);
        var runningOut = horizonTs == null || (horizonTs - todayTs) < DEADLINES_HORIZON_REFRESH_MS;
        var stale = !fetchedAt || (now - fetchedAt) > DEADLINES_CACHE_TTL_MS;
        var exchangeMissing = isExchangeEnabled() && !(resp && resp.exchange && resp.exchange.ok);
        // A DTU page that failed with nothing held for it: ask again after the pause.
        var sourceMissing = !!(resp && ((resp.course && resp.course.ok === false) || (resp.exam && resp.exam.ok === false)));
        if (!(runningOut || stale || exchangeMissing || sourceMissing) || _deadlinesFetchInProgress) return;
        // Exchange never asked for yet (just switched on): ask now, not after the retry pause.
        var exchangeNeverAsked = isExchangeEnabled() && !(resp && resp.exchange) && !_exchangeAskedThisPage;
        if (!exchangeNeverAsked && _deadlinesLastAutoRequestAt && (now - _deadlinesLastAutoRequestAt) < DEADLINES_AUTO_RETRY_MS) return;
        var lastFailedAt = readLastFailedAt();
        if (!exchangeNeverAsked && lastFailedAt && (now - lastFailedAt) < DEADLINES_AUTO_RETRY_MS) return;
        if (exchangeNeverAsked) _exchangeAskedThisPage = true;
        _deadlinesLastAutoRequestAt = now;
        requestStudentDeadlines(false, function () { renderDeadlinesHomepageWidget(widget); });
    }

    function renderDeadlinesHomepageWidget(widget) {
        if (!widget) return;
        deadlineTimeline.ensureDeadlinesTimelineStyles();

        var next = widget.querySelector('[data-dtu-deadlines-next]');
        var footer = widget.querySelector('[data-dtu-deadlines-footer]');
        var meta = widget.querySelector('[data-dtu-deadlines-meta]');
        var chevronBtn = widget.querySelector('[data-dtu-deadlines-chevron]');
        var sources = widget.querySelector('[data-dtu-deadlines-sources]');

        if (!_deadlinesLastResponse) _deadlinesLastResponse = readStoredDeadlines();

        var resp = _deadlinesLastResponse;
        var todayTs = startOfTodayUtcTs();
        var expandedWanted = localStorage.getItem(DEADLINES_EXPANDED_KEY) !== 'false';
        var dark = isDarkMode();
        var mutedColor = dark ? '#b0b0b0' : '#6b7280';
        var warningColor = dark ? '#ffa726' : '#e65100';
        var previous = widget._dtuDeadlinesRenderState;
        if (previous && previous.response === resp && previous.todayTs === todayTs
            && previous.expanded === expandedWanted && previous.dark === dark
            && previous.failed === _deadlinesLastRefreshFailed
            && previous.exchange === isExchangeEnabled()) {
            scheduleDailyDeadlinesCheck(widget, resp, todayTs);
            return;
        }
        // Keep the timeline's focused marks alive across unrelated page mutations.
        widget._dtuDeadlinesRenderState = {
            response: resp, todayTs: todayTs, expanded: expandedWanted,
            dark: dark, failed: _deadlinesLastRefreshFailed, exchange: isExchangeEnabled()
        };

        function clear(el) {
            if (!el) return;
            while (el.firstChild) el.removeChild(el.firstChild);
        }
        clear(next);

        if (chevronBtn) {
            chevronBtn.setAttribute('icon', expandedWanted ? 'tier1:chevron-up' : 'tier1:chevron-down');
            chevronBtn.setAttribute('expanded', expandedWanted ? 'true' : 'false');
            chevronBtn.setAttribute('text', expandedWanted ? 'Show fewer deadlines' : 'Show more deadlines');
            chevronBtn.setAttribute('aria-expanded', expandedWanted ? 'true' : 'false');
            chevronBtn.style.display = '';
        }
        setDeadlinesWidgetExpandedState(widget, expandedWanted);
        if (footer) footer.style.display = 'flex';
        var calendarBtn = widget.querySelector('[data-dtu-deadlines-calendar]');
        if (calendarBtn) calendarBtn.style.display = (resp && resp.ok) ? '' : 'none';

        if (!resp || !resp.ok) {
            var loading;
            if (_deadlinesLastRefreshFailed) {
                loading = document.createElement('div');
                markExt(loading);
                loading.textContent = 'Deadlines unavailable. Retrying automatically.';
                loading.style.cssText = 'font-size: 13px; color: ' + mutedColor + ';';
            } else {
                loading = deadlinesSkeleton();
                widget._dtuDeadlinesSkeleton = true;
            }
            if (next) next.appendChild(loading);

            scheduleDailyDeadlinesCheck(widget, resp, todayTs);
            return;
        }

        if (widget._dtuDeadlinesSkeleton && next) {
            widget._dtuDeadlinesSkeleton = false;
            skeletonApi().reveal(next, markExt);
        }

        if (meta) {
            // DTU publishes these dates years ahead, so "last fetched" is noise while the
            // snapshot is healthy. It only earns its place when it explains something.
            var sourceProblems = getDeadlineSourceProblems(resp);
            if (!_deadlinesLastRefreshFailed && !sourceProblems.length) {
                meta.textContent = '';
                meta.style.display = 'none';
            } else {
                var fetchedAtDate = resp.fetchedAt ? new Date(resp.fetchedAt) : null;
                // The year matters: without it an August snapshot read in February looks current.
                var fetchedAtText = fetchedAtDate
                    ? fetchedAtDate.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
                    : 'unknown';
                var reason = _deadlinesLastRefreshFailed
                    ? 'Refresh failed'
                    : (sourceProblems.join(' and ') + ' deadlines missing');
                meta.textContent = reason + ', showing ' + fetchedAtText;
                meta.style.display = '';
                meta.style.color = warningColor;
            }
        }

        if (sources) {
            var courseUrl = deadlineSourceUrl(resp.course, COURSE_DEADLINES_URL);
            var examUrl = deadlineSourceUrl(resp.exam, EXAM_DEADLINES_URL);
            sources.querySelectorAll('a').forEach(function (anchor) {
                if (anchor.getAttribute('data-kind') === 'course') anchor.href = courseUrl;
                if (anchor.getAttribute('data-kind') === 'exam') anchor.href = examUrl;
            });
            syncExchangeSourceLink(sources, resp, dark);
        }


        var rows = deadlineTimeline.selectDeadlineTimelineRows(buildTopDeadlines(resp, todayTs, Infinity), todayTs);
        if (!rows.length) {
            var empty = document.createElement('div');
            markExt(empty);
            var horizonTs = getDeadlineDataHorizonTs(resp);
            var exhausted = horizonTs != null && todayTs > horizonTs;
            empty.textContent = exhausted
                ? ('Published deadlines stop at ' + formatDeadlineTsShort(horizonTs) + '. Newer dates load automatically once DTU publishes them.')
                : ('No course or exam deadlines up to ' + formatDeadlineTsShort(deadlineTimeline.buildDeadlineTimelineAxis(todayTs).endTs) + '.');
            empty.style.cssText = 'font-size: 13px; color: ' + mutedColor + '; font-style: italic;';
            if (next) next.appendChild(empty);
            if (next) appendExchangeNotice(next, resp, mutedColor, warningColor, rows, todayTs);
            scheduleDailyDeadlinesCheck(widget, resp, todayTs);
            return;
        }

        if (chevronBtn) {
            chevronBtn.style.display = '';
            chevronBtn.setAttribute('icon', expandedWanted ? 'tier1:chevron-up' : 'tier1:chevron-down');
            chevronBtn.setAttribute('expanded', expandedWanted ? 'true' : 'false');
            chevronBtn.setAttribute('text', expandedWanted ? 'Collapse deadlines' : 'Expand deadlines');
            chevronBtn.setAttribute('aria-expanded', expandedWanted ? 'true' : 'false');
        }

        if (next) {
            next.appendChild(deadlineTimeline.createDeadlinesTimeline(rows, todayTs, dark, next.clientWidth));
            // A source that has run past its published horizon contributes no lanes at all,
            // so without this its absence reads as "nothing is due" rather than "no data".
            buildDeadlineHorizonNotices(resp, todayTs).forEach(function (text) {
                var notice = document.createElement('div');
                markExt(notice);
                notice.textContent = text;
                notice.style.cssText = 'margin-top: 8px; font-size: 10px; line-height: 14px; color: '
                    + warningColor + ';';
                next.appendChild(notice);
            });
            appendExchangeNotice(next, resp, mutedColor, warningColor, rows, todayTs);
        }


        scheduleDailyDeadlinesCheck(widget, resp, todayTs);
    }

    // Beyond Borders publishes one application deadline at a time: once it has passed,
    // the lane is gone until the next one is listed.
    function nextExchangeDeadlineText(source, todayTs) {
        var best = null;
        ((source && source.groups) || []).forEach(function (group) {
            (group.items || []).forEach(function (item) {
                var ts = item && item.startTs;
                if (typeof ts === 'number' && ts >= todayTs && (!best || ts < best.ts)) best = { ts: ts, heading: group.heading || '' };
            });
        });
        if (!best) return 'Beyond Borders lists no upcoming exchange deadline.';
        return 'Next exchange deadline: ' + formatDeadlineTsShort(best.ts) + (best.heading ? ' (' + best.heading + ')' : '') + '.';
    }

    // Says why the exchange lane is missing: no permission yet (with the button that
    // opens the permission page), Beyond Borders did not answer, or no deadline falls
    // in the timeline window.
    function appendExchangeNotice(container, resp, mutedColor, warningColor, shownRows, todayTs) {
        if (!isExchangeEnabled()) return;
        var source = resp && resp.exchange;
        var shown = (shownRows || []).some(function (row) { return row && row.kind === 'exchange'; });
        if (source && source.ok && shown) return;
        var notice = document.createElement('div');
        markExt(notice);
        notice.setAttribute('data-dtu-exchange-notice', '');
        notice.style.cssText = 'margin-top: 8px; font-size: 12px; line-height: 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px;';
        if (source && source.ok) {
            notice.textContent = nextExchangeDeadlineText(source, todayTs);
            notice.style.color = mutedColor;
        } else if (!source || !_exchangeAnsweredThisPage) {
            notice.textContent = 'Loading the exchange deadline...';
            notice.style.color = mutedColor;
        } else if (source.error === 'no_permission') {
            notice.style.color = mutedColor;
            var why = document.createElement('span');
            markExt(why);
            why.textContent = 'The exchange deadline needs access to beyondborders.dtu.dk.';
            notice.appendChild(why);
            var allow = document.createElement('button');
            markExt(allow);
            allow.type = 'button';
            allow.textContent = 'Allow access';
            allow.style.cssText = 'font: inherit; font-size: 12px; padding: 2px 10px; border-radius: 4px; cursor: pointer;'
                + ' border: 1px solid currentColor; background: transparent; color: inherit;';
            allow.addEventListener('click', function () {
                sendRuntimeMessage({ type: 'dtu-open-exchange-permission' }, function () { });
            });
            notice.appendChild(allow);
        } else {
            notice.textContent = 'Exchange deadline unavailable: Beyond Borders did not answer. Retrying automatically.';
            notice.style.color = warningColor;
        }
        container.appendChild(notice);
    }

    // The link and its separator are kept on the footer element, so a render with
    // the toggle off touches nothing it did not add.
    function syncExchangeSourceLink(sources, resp, dark) {
        var parts = sources._dtuExchangeLink;
        if (!isExchangeEnabled()) {
            if (parts) {
                parts.sep.remove();
                parts.link.remove();
                sources._dtuExchangeLink = null;
            }
            return;
        }
        if (!parts) {
            var sep = document.createElement('span');
            markExt(sep);
            sep.textContent = '/';
            sep.style.cssText = 'color: ' + (dark ? '#b0b0b0' : '#6b7280') + ';';
            parts = { sep: sep, link: createDeadlineSourceLink('Exchange', 'exchange', dark) };
            sources.appendChild(parts.sep);
            sources.appendChild(parts.link);
            sources._dtuExchangeLink = parts;
        }
        parts.link.href = deadlineSourceUrl(resp && resp.exchange, EXCHANGE_DEADLINES_URL);
    }

    function findHomepageWidgetByHeading(pattern) {
        var widgets = [];
        try { widgets = document.querySelectorAll('.d2l-widget, .d2l-tile'); } catch (e0) { widgets = []; }
        for (var i = 0; i < widgets.length; i++) {
            var widget = widgets[i];
            if (!widget || !widget.querySelector) continue;
            var heading = null;
            try { heading = widget.querySelector('.d2l-widget-header h2, .d2l-widget-header h3, h2.d2l-heading, h3.d2l-heading'); } catch (e1) { heading = null; }
            var text = '';
            try { text = normalizeWhitespace(heading ? heading.textContent : ''); } catch (e2) { text = ''; }
            if (!text || !pattern.test(text)) continue;
            return widget;
        }
        return null;
    }

    function getHomepageDeadlinesColumn() {
        var studentInformationWidget = findHomepageWidgetByHeading(/^student information$/i);
        if (studentInformationWidget && studentInformationWidget.parentElement) {
            return studentInformationWidget.parentElement;
        }

        var fullWidthColumn = document.querySelector('.homepage-container > .homepage-col-12');
        if (fullWidthColumn) return fullWidthColumn;

        var deadlinesWidget = document.querySelector('.dtu-deadlines-home-widget');
        if (deadlinesWidget && deadlinesWidget.parentElement) return deadlinesWidget.parentElement;

        return null;
    }

    function placeDeadlinesHomepageWidget(widget, fullWidthColumn, afterWidget) {
        if (!widget || !fullWidthColumn) return;
        if (afterWidget && afterWidget.parentElement === fullWidthColumn) {
            var targetNext = afterWidget.nextSibling;
            if (targetNext === widget) return;
            if (targetNext) fullWidthColumn.insertBefore(widget, targetNext);
            else fullWidthColumn.appendChild(widget);
        } else if (widget.parentNode !== fullWidthColumn || fullWidthColumn.firstChild !== widget) {
            if (fullWidthColumn.firstChild) fullWidthColumn.insertBefore(widget, fullWidthColumn.firstChild);
            else fullWidthColumn.appendChild(widget);
        }
    }

    // Underlined at rest. Without it these read as a disabled filter pair rather than
    // the two source links they are.
    function createDeadlineSourceLink(text, kind, dark) {
        var link = document.createElement('a');
        markExt(link);
        link.textContent = text;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('data-kind', kind);
        var resting = dark ? '#a3a3a3' : '#6b7280';
        var raised = dark ? '#e0e0e0' : '#374151';
        link.style.cssText = 'color: ' + resting + ' !important; text-decoration: underline !important;'
            + ' text-underline-offset: 2px; text-decoration-thickness: 1px;';
        function setColor(value) { link.style.setProperty('color', value, 'important'); }
        ['mouseenter', 'focus'].forEach(function (type) {
            link.addEventListener(type, function () { setColor(raised); });
        });
        ['mouseleave', 'blur'].forEach(function (type) {
            link.addEventListener(type, function () { setColor(resting); });
        });
        return link;
    }

    // "Add to calendar": the deadlines of the next 12 months as an .ics file, made in the browser.
    function downloadDeadlinesCalendar() {
        var resp = _deadlinesLastResponse;
        if (!resp || !resp.ok) return;
        var ics = globalThis.DTUAfterDarkIcs;
        if (!ics) throw new Error('darkmode.deadlines.js needs darkmode.ics.js for Add to calendar');
        var todayTs = startOfTodayUtcTs();
        var fromIso = new Date(todayTs).toISOString().slice(0, 10);
        var untilIso = new Date(todayTs + 365 * 86400000).toISOString().slice(0, 10);
        var events = deadlineData.buildDeadlineCalendarEvents(buildTopDeadlines(resp, todayTs, Infinity), fromIso, untilIso);
        if (!events.length) return;
        ics.downloadCalendar(ics.buildCalendar(events, ics.stampNow(), 'DTU deadlines'), 'dtu-deadlines.ics');
    }

    function createDeadlinesCalendarButton(dark) {
        var btn = document.createElement('button');
        markExt(btn);
        btn.type = 'button';
        btn.textContent = 'Add to calendar';
        btn.setAttribute('data-dtu-deadlines-calendar', '1');
        btn.title = 'Download the deadlines of the next 12 months as a calendar file (.ics)';
        var resting = dark ? '#a3a3a3' : '#6b7280';
        var raised = dark ? '#e0e0e0' : '#374151';
        btn.style.cssText = 'font: inherit; font-size: 10px; padding: 0; margin: 0 10px 0 0; border: 0; background: transparent !important;'
            + ' cursor: pointer; color: ' + resting + ' !important; text-decoration: underline; text-underline-offset: 2px; text-decoration-thickness: 1px;';
        function setColor(value) { btn.style.setProperty('color', value, 'important'); }
        ['mouseenter', 'focus'].forEach(function (type) {
            btn.addEventListener(type, function () { setColor(raised); });
        });
        ['mouseleave', 'blur'].forEach(function (type) {
            btn.addEventListener(type, function () { setColor(resting); });
        });
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            downloadDeadlinesCalendar();
        });
        return btn;
    }

    function insertDeadlinesHomepageWidget() {
        if (!isTopWindow()) return;
        enforceCourseSearchVisibility();
        if (!isDTULearnHomepage() || !isDeadlinesEnabled()) {
            var existing = document.querySelector('.dtu-deadlines-home-widget');
            if (existing) existing.remove();
            if (isDTULearnHomepage()) setAtomicSearchWidgetHidden(!isSearchWidgetEnabled());
            return;
        }

        var atomicWidget = getAtomicSearchWidgetRoot();
        var fullWidthColumn = getHomepageDeadlinesColumn();
        if (!fullWidthColumn) {
            scheduleDeadlinesHomepageWidgetEnsure();
            return;
        }

        if (atomicWidget) enforceCourseSearchVisibility();

        var widget = document.querySelector('.dtu-deadlines-home-widget');
        if (!widget) {
            var dark = isDarkMode();
            var muted = dark ? '#a3a3a3' : '#6b7280';
            widget = document.createElement('div');
            widget.className = 'd2l-widget d2l-tile d2l-widget-padding-full dtu-deadlines-home-widget';
            widget.setAttribute('role', 'region');
            markExt(widget);

            var titleId = 'dtu-deadlines-home-title';
            widget.setAttribute('aria-labelledby', titleId);

            var header = document.createElement('div');
            header.className = 'd2l-widget-header';
            markExt(header);
            header.style.cssText = 'padding: 2px 7px 2px !important;';
            header.style.setProperty('background', dark ? '#2d2d2d' : '#ffffff', 'important');
            header.style.setProperty('background-color', dark ? '#2d2d2d' : '#ffffff', 'important');
            header.style.setProperty('color', dark ? '#e0e0e0' : '#333', 'important');

            var headerWrap = document.createElement('div');
            headerWrap.className = 'd2l-homepage-header-wrapper';
            markExt(headerWrap);
            headerWrap.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 10px;';

            var h2 = document.createElement('h2');
            h2.className = 'd2l-heading vui-heading-4';
            h2.id = titleId;
            markExt(h2);
            h2.textContent = 'Deadlines';
            h2.style.cssText = 'margin: 0; flex: 1 1 auto; min-width: 140px; white-space: nowrap; overflow: visible; text-overflow: clip; max-width: none;';
            h2.style.setProperty('overflow', 'visible', 'important');
            h2.style.setProperty('text-overflow', 'clip', 'important');
            h2.style.setProperty('white-space', 'nowrap', 'important');
            h2.style.setProperty('max-width', 'none', 'important');

            var expandedInit = localStorage.getItem(DEADLINES_EXPANDED_KEY) !== 'false';
            var chevronBtn = document.createElement('d2l-button-icon');
            markExt(chevronBtn);
            chevronBtn.setAttribute('data-dtu-deadlines-chevron', '1');
            chevronBtn.setAttribute('type', 'button');
            chevronBtn.setAttribute('animation-type', 'opacity-transform');
            chevronBtn.setAttribute('text-hidden', '');
            chevronBtn.setAttribute('aria-label', 'Toggle upcoming deadlines');
            chevronBtn.setAttribute('aria-controls', 'dtu-deadlines-home-content');
            chevronBtn.setAttribute('icon', expandedInit ? 'tier1:chevron-up' : 'tier1:chevron-down');
            chevronBtn.setAttribute('expanded', expandedInit ? 'true' : 'false');
            chevronBtn.setAttribute('text', expandedInit ? 'Collapse deadlines' : 'Expand deadlines');
            chevronBtn.addEventListener('click', function () {
                var nextState = localStorage.getItem(DEADLINES_EXPANDED_KEY) === 'false';
                localStorage.setItem(DEADLINES_EXPANDED_KEY, nextState ? 'true' : 'false');
                renderDeadlinesHomepageWidget(widget);
            });

            headerWrap.appendChild(h2);
            chevronBtn.style.cssText = 'flex: 0 0 auto;';
            headerWrap.appendChild(chevronBtn);
            header.appendChild(headerWrap);

            var clear = document.createElement('div');
            clear.className = 'd2l-clear';
            header.appendChild(clear);

            var content = document.createElement('div');
            content.className = 'd2l-widget-content';
            content.id = 'dtu-deadlines-home-content';
            content.setAttribute('data-dtu-deadlines-content', '1');
            markExt(content);

            var padding = document.createElement('div');
            padding.className = 'd2l-widget-content-padding';
            markExt(padding);
            padding.style.cssText = 'padding: 0 7px 6px !important;';

            var next = document.createElement('div');
            markExt(next);
            next.setAttribute('data-dtu-deadlines-next', '1');

            var footer = document.createElement('div');
            markExt(footer);
            footer.setAttribute('data-dtu-deadlines-footer', '1');
            footer.style.cssText = 'display: none; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 16px; margin-top: 8px; padding-top: 8px; '
                + 'border-top: 1px solid ' + (dark ? '#333' : '#e5e7eb') + ';';

            var footerLeft = document.createElement('div');
            markExt(footerLeft);
            footerLeft.style.cssText = 'display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; min-width: 0;';

            var meta = document.createElement('div');
            markExt(meta);
            meta.setAttribute('data-dtu-deadlines-meta', '1');
            meta.style.cssText = 'font-size: 10px; color: ' + muted + ';';

            var disclaimer = document.createElement('div');
            markExt(disclaimer);
            disclaimer.textContent = 'Please double-check dates on the official DTU student pages.';
            disclaimer.style.cssText = 'font-size: 10px; font-style: italic; line-height: 14px; color: ' + muted + ';';

            footerLeft.appendChild(disclaimer);
            footerLeft.appendChild(meta);

            var sources = document.createElement('div');
            markExt(sources);
            sources.setAttribute('data-dtu-deadlines-sources', '1');
            sources.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 10px;';

            var sourcesLabel = document.createElement('span');
            markExt(sourcesLabel);
            sourcesLabel.textContent = 'Sources:';
            sourcesLabel.style.cssText = 'color: ' + muted + ';';

            var courseA = createDeadlineSourceLink('Course', 'course', dark);

            var sep = document.createElement('span');
            markExt(sep);
            sep.textContent = '/';
            sep.style.cssText = 'color: ' + muted + ';';

            var examA = createDeadlineSourceLink('Exam', 'exam', dark);

            sources.appendChild(createDeadlinesCalendarButton(dark));
            sources.appendChild(sourcesLabel);
            sources.appendChild(courseA);
            sources.appendChild(sep);
            sources.appendChild(examA);

            footer.appendChild(footerLeft);
            footer.appendChild(sources);

            padding.appendChild(next);
            padding.appendChild(footer);
            content.appendChild(padding);

            widget.appendChild(header);
            widget.appendChild(content);
        }

        var studentInformationWidget = findHomepageWidgetByHeading(/^student information$/i);
        placeDeadlinesHomepageWidget(widget, fullWidthColumn, studentInformationWidget);
        renderDeadlinesHomepageWidget(widget);
    }

    function scheduleDeadlinesHomepageWidgetEnsure() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (_deadlinesWidgetWatch && _deadlinesWidgetWatch.active()) {
            _deadlinesWidgetWatch.trigger();
            return;
        }
        _deadlinesWidgetWatch = schedulePlacement({
            capMs: 30000,
            run: function () {
                insertDeadlinesHomepageWidget();
                return !!document.querySelector('.dtu-deadlines-home-widget')
                    || !isDTULearnHomepage()
                    || !isDeadlinesEnabled();
            }
        });
    }

    function createAdminToggleListItem(id, labelText, checked, onChange) {
        var dark = isDarkMode();
        var li = document.createElement('li');
        li.style.cssText = dark
            ? 'display: flex; align-items: center; gap: 8px; padding: 4px 0; background-color: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; padding: 4px 0;';

        var label = document.createElement('label');
        label.style.cssText = dark
            ? 'display: flex; align-items: center; gap: 8px; cursor: pointer; color: #e0e0e0; font-size: 14px; '
                + 'background-color: #2d2d2d !important; background: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;';

        var toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.id = id;
        toggle.checked = !!checked;
        toggle.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: var(--dtu-ad-accent);';
        toggle.addEventListener('change', onChange);

        label.appendChild(toggle);
        label.appendChild(document.createTextNode(labelText));
        li.appendChild(label);
        return li;
    }

    function insertDeadlinesToggle() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        var placeholder = getAdminToolsPlaceholder();
        if (!placeholder) return;
        if (placeholder.querySelector && placeholder.querySelector('#deadlines-toggle')) return;

        var targetList = getAfterDarkAdminToolsList();
        if (!targetList) return;

        var item = createAdminToggleListItem('deadlines-toggle', 'Deadlines Widget', isDeadlinesEnabled(), function (event) {
            var nextChecked = !!(event && event.target && event.target.checked);
            localStorage.setItem('dtuDarkModeDeadlinesEnabled', nextChecked.toString());
            insertDeadlinesHomepageWidget();
            scheduleDeadlinesHomepageWidgetEnsure();
        });
        targetList.appendChild(item);
    }

    function insertSearchWidgetToggle() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        var placeholder = getAdminToolsPlaceholder();
        if (!placeholder) return;
        if (placeholder.querySelector && placeholder.querySelector('#search-widget-toggle')) return;

        var targetList = getAfterDarkAdminToolsList();
        if (!targetList) return;

        var item = createAdminToggleListItem('search-widget-toggle', 'Search Courses Widget', isSearchWidgetEnabled(), function (event) {
            var nextChecked = !!(event && event.target && event.target.checked);
            localStorage.setItem('dtuDarkModeSearchWidgetEnabled', nextChecked.toString());
            insertDeadlinesHomepageWidget();
        });
        targetList.appendChild(item);
    }

    try {
        globalThis.DTUAfterDarkDeadlinesUi = {
            insertDeadlinesHomepageWidget: insertDeadlinesHomepageWidget,
            insertDeadlinesToggle: insertDeadlinesToggle,
            insertSearchWidgetToggle: insertSearchWidgetToggle
        };
    } catch (eExpose) { }

    if (window.location.hostname === 'learn.inside.dtu.dk') {
        enforceCourseSearchVisibility();
        scheduleCourseSearchVisibilityEnforce();
        insertDeadlinesHomepageWidget();
        scheduleDeadlinesHomepageWidgetEnsure();
        insertDeadlinesToggle();
        insertSearchWidgetToggle();
    }
    window.addEventListener('load', scheduleCourseSearchVisibilityEnforce);
    window.addEventListener('load', scheduleDeadlinesHomepageWidgetEnsure);
    window.addEventListener('pageshow', function () {
        setTimeout(function () { try { enforceCourseSearchVisibility(); scheduleCourseSearchVisibilityEnforce(); } catch (e0) { } }, 80);
        setTimeout(function () { try { insertDeadlinesHomepageWidget(); scheduleDeadlinesHomepageWidgetEnsure(); } catch (e1) { } }, 120);
    });
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) return;
        setTimeout(function () { try { enforceCourseSearchVisibility(); scheduleCourseSearchVisibilityEnforce(); } catch (e0) { } }, 100);
        setTimeout(function () { try { insertDeadlinesHomepageWidget(); scheduleDeadlinesHomepageWidgetEnsure(); } catch (e1) { } }, 140);
    });
})();
