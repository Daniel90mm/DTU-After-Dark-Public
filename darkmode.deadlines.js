(function () {
    'use strict';

    var DEADLINES_CACHE_KEY = 'dtuDarkModeDeadlinesCacheV2';
    // DTU publishes these dates years ahead and edits them rarely, so elapsed time is a
    // poor refetch trigger. The real signal is the data horizon; this is only a safety
    // net for amendments to already-published dates.
    // Checked once a day: two small pages, so a date DTU amends shows up by the next day.
    var DEADLINES_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
    // A failing source must not be retried on every render.
    var DEADLINES_AUTO_RETRY_MS = 1000 * 60 * 10;
    var DEADLINES_HORIZON_REFRESH_MS = 1000 * 60 * 60 * 24 * 120;
    var DEADLINES_EXPANDED_KEY = 'dtuDarkModeDeadlinesExpanded';
    var DEADLINES_TIMELINE_STYLE_ID = 'dtu-after-dark-deadlines-timeline-style';
    var ATOMIC_SEARCH_HIDDEN_ATTR = 'data-dtu-atomic-search-hidden';
    var ATOMIC_SEARCH_HIDDEN_STYLE_ATTR = 'data-dtu-atomic-search-prev-style';
    var ATOMIC_SEARCH_NAV_HIDDEN_ATTR = 'data-dtu-atomic-search-nav-hidden';
    var ATOMIC_SEARCH_NAV_HIDDEN_STYLE_ATTR = 'data-dtu-atomic-search-nav-prev-style';
    var DTU_HOMEPAGE_COL3_STYLE_ID = 'dtu-after-dark-homepage-col3-wide';

    var _deadlinesFetchInProgress = false;
    var _deadlinesLastResponse = null;
    var _deadlinesLastRequestAt = 0;
    var _deadlinesLastAutoRequestAt = 0;
    var _deadlinesLastRefreshFailed = false;
    var _courseSearchVisibilityTimer = null;
    var _courseSearchVisibilityAttempts = 0;
    var _deadlinesWidgetTimer = null;
    var _deadlinesWidgetAttempts = 0;

    function getDeps() {
        try { return globalThis.DTUAfterDarkDeadlinesDeps || null; } catch (e0) { return null; }
    }

    function isTopWindow() {
        var deps = getDeps();
        return !!(deps && typeof deps.isTopWindow === 'function' && deps.isTopWindow());
    }

    function isDarkMode() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDarkMode === 'function' && deps.isDarkMode());
    }

    function isDeadlinesEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDeadlinesEnabled === 'function' && deps.isDeadlinesEnabled());
    }

    function isSearchWidgetEnabled() {
        var deps = getDeps();
        if (!deps || typeof deps.isSearchWidgetEnabled !== 'function') return true;
        return !!deps.isSearchWidgetEnabled();
    }

    function isDTULearnHomepage() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDTULearnHomepage === 'function' && deps.isDTULearnHomepage());
    }

    function markExt(el) {
        var deps = getDeps();
        if (el && deps && typeof deps.markExt === 'function') deps.markExt(el);
        return el;
    }

    function normalizeWhitespace(text) {
        var deps = getDeps();
        if (deps && typeof deps.normalizeWhitespace === 'function') {
            return deps.normalizeWhitespace(text);
        }
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function normalizeDeadlinePeriodText(text) {
        var decoded = String(text || '');
        for (var pass = 0; pass < 3; pass++) {
            var next = decoded
                .replace(/&amp;/gi, '&')
                .replace(/&nbsp;/gi, ' ')
                .replace(/&ndash;/gi, '–')
                .replace(/&mdash;/gi, '—');
            if (next === decoded) break;
            decoded = next;
        }
        return normalizeWhitespace(decoded);
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

    function formatIsoDateForDisplay(iso) {
        var deps = getDeps();
        if (deps && typeof deps.formatIsoDateForDisplay === 'function') {
            return deps.formatIsoDateForDisplay(iso);
        }
        return String(iso || '');
    }

    function startOfTodayUtcTs() {
        var deps = getDeps();
        if (deps && typeof deps.startOfTodayUtcTs === 'function') {
            return deps.startOfTodayUtcTs();
        }
        // The local calendar date, as darkmode.js uses: DTU deadlines are Danish dates.
        var now = new Date();
        return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    }

    function diffDaysUtc(fromTs, toTs) {
        var deps = getDeps();
        if (deps && typeof deps.diffDaysUtc === 'function') {
            return deps.diffDaysUtc(fromTs, toTs);
        }
        return Math.round((toTs - fromTs) / 86400000);
    }

    function getDeadlineNextTs(item, todayTs) {
        if (!item) return null;
        var start = typeof item.startTs === 'number' ? item.startTs : null;
        var end = typeof item.endTs === 'number' ? item.endTs : null;
        if (start == null) return null;
        if (end != null) {
            if (todayTs < start) return start;
            if (todayTs <= end) return end;
            return end;
        }
        return start;
    }

    function getDeadlineState(item, todayTs) {
        if (!item) return 'unknown';
        var start = typeof item.startTs === 'number' ? item.startTs : null;
        var end = typeof item.endTs === 'number' ? item.endTs : null;
        if (start == null) return 'unknown';
        if (end != null) {
            if (todayTs < start) return 'upcoming';
            if (todayTs <= end) return 'active';
            return 'past';
        }
        if (todayTs <= start) return 'upcoming';
        return 'past';
    }

    function formatDeadlineRange(item) {
        if (!item) return '';
        var start = item.startIso ? formatIsoDateForDisplay(item.startIso) : '';
        if (item.endIso) return start + ' - ' + formatIsoDateForDisplay(item.endIso);
        return start;
    }

    function formatDeadlineRangeCompact(item) {
        if (!item) return '';
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var sm = String(item.startIso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        var em = String(item.endIso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!sm) return formatDeadlineRange(item);

        var sd = parseInt(sm[3], 10);
        var smon = months[parseInt(sm[2], 10) - 1] || sm[2];

        if (!em) {
            return sd + ' ' + smon + ' ' + sm[1];
        }

        var ed = parseInt(em[3], 10);
        var emon = months[parseInt(em[2], 10) - 1] || em[2];

        if (sm[1] === em[1]) {
            return sd + ' ' + smon + ' - ' + ed + ' ' + emon + ' ' + em[1];
        }

        return sd + ' ' + smon + ' ' + sm[1] + ' - ' + ed + ' ' + emon + ' ' + em[1];
    }

    function buildUpcomingDeadlineRows(groups, todayTs, limit) {
        var out = [];
        (groups || []).forEach(function (group) {
            var period = normalizeDeadlinePeriodText(group && group.heading || '');
            (group && Array.isArray(group.items) ? group.items : []).forEach(function (item) {
                if (!item || typeof item.startTs !== 'number') return;
                var state = getDeadlineState(item, todayTs);
                var nextTs = getDeadlineNextTs(item, todayTs);
                if (state === 'past' || nextTs == null || nextTs < todayTs) return;
                out.push({
                    period: period,
                    label: String(item.label || '').trim(),
                    startIso: item.startIso,
                    startTs: item.startTs,
                    endIso: item.endIso,
                    endTs: item.endTs,
                    state: state,
                    nextTs: nextTs
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
        sendRuntimeMessage({ type: 'dtu-student-deadlines', forceRefresh: !!forceRefresh }, function (response) {
            _deadlinesFetchInProgress = false;
            if (response && response.ok) {
                _deadlinesLastResponse = response;
                _deadlinesLastRefreshFailed = false;
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
        if (_courseSearchVisibilityTimer) return;

        _courseSearchVisibilityAttempts = 0;
        _courseSearchVisibilityTimer = setInterval(function () {
            _courseSearchVisibilityAttempts++;
            var found = { nav: false, widget: false };
            try { found = enforceCourseSearchVisibility() || found; } catch (e0) { }
            var done = found.nav && (!isDTULearnHomepage() || found.widget);
            if ((done && _courseSearchVisibilityAttempts >= 10) || _courseSearchVisibilityAttempts >= 60) {
                clearInterval(_courseSearchVisibilityTimer);
                _courseSearchVisibilityTimer = null;
            }
        }, 400);
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

    function buildTopDeadlines(resp, todayTs, limit) {
        var out = [];
        var courseUrl = (resp && resp.course && resp.course.url)
            ? resp.course.url
            : 'https://student.dtu.dk/en/courses-and-teaching/course-registration/course-registration-deadlines';
        var examUrl = (resp && resp.exam && resp.exam.url)
            ? resp.exam.url
            : 'https://student.dtu.dk/en/exam/exam-registration/-deadlines-for-exams';

        var courseRows = buildUpcomingDeadlineRows((resp && resp.course && resp.course.groups) || [], todayTs, 60);
        var examRows = buildUpcomingDeadlineRows((resp && resp.exam && resp.exam.groups) || [], todayTs, 60);
        courseRows.forEach(function (row) {
            row.kind = 'course';
            row.sourceUrl = courseUrl;
            out.push(row);
        });
        examRows.forEach(function (row) {
            row.kind = 'exam';
            row.sourceUrl = examUrl;
            out.push(row);
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

    function formatDeadlineHintDate(iso) {
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return String(iso || '');
        var day = parseInt(match[3], 10);
        var month = months[parseInt(match[2], 10) - 1] || match[2];
        return day + ' ' + month;
    }

    // Wording taken from DTU's own course-registration deadlines page, so the widget
    // explains a period the same way the source does.
    var DEADLINE_ACTION_EXPLAINERS = {
        'Supplementary registration': 'It will be possible to register for courses with vacant seats.'
    };

    function formatDeadlineTsShort(ts) {
        if (typeof ts !== 'number' || !isFinite(ts)) return '';
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var date = new Date(ts);
        return date.getUTCDate() + ' ' + months[date.getUTCMonth()] + ' ' + date.getUTCFullYear();
    }

    function deadlineActionName(label) {
        var lower = String(label || '').toLowerCase();
        if (/(withdrawal|withdraw|deregister|de-?register)/.test(lower)) return 'Withdrawal';
        if (/supplementary/.test(lower)) return 'Supplementary registration';
        if (/registration/.test(lower)) return 'Registration';
        if (/grading/.test(lower)) return 'Grading';
        return 'Action';
    }

    function deadlineOneLineHint(row) {
        if (!row) return '';
        var action = deadlineActionName(row.label);
        var start = formatDeadlineHintDate(row.startIso);
        var end = formatDeadlineHintDate(row.endIso);

        if (end) {
            if (row.state === 'upcoming') {
                return action + ' opens ' + start + '; deadline ' + end + '.';
            }
            return action + ' deadline: ' + end + '.';
        }
        if (start) return action + ' deadline: ' + start + '.';
        return '';
    }

    function getDeadlinePeriodLabels(row) {
        if (!row) return [];
        var source = Array.isArray(row.periods) && row.periods.length
            ? row.periods
            : (row.period ? [row.period] : []);
        var seen = Object.create(null);
        var labels = [];
        source.forEach(function (value) {
            var label = normalizeDeadlinePeriodText(value);
            if (!label || seen[label]) return;
            seen[label] = true;
            labels.push(label);
        });
        return labels;
    }

    function formatDeadlineChip(row, todayTs) {
        var nextTs = getDeadlineNextTs(row, todayTs);
        var days = (nextTs == null) ? null : diffDaysUtc(todayTs, nextTs);
        var active = row && row.state === 'active';
        var opens = !!(row && !active && row.endTs != null && todayTs < row.startTs);

        var text = '';
        if (days === 0) {
            text = active ? 'Ends today' : (opens ? 'Opens today' : 'Due today');
        } else if (days != null) {
            text = active ? (days + 'd left') : (opens ? ('Opens in ' + days + 'd') : ('Due in ' + days + 'd'));
        }

        var color = active
            ? (isDarkMode() ? '#66bb6a' : '#2e7d32')
            : (days != null && days <= 7
                ? (isDarkMode() ? '#ffa726' : '#e65100')
                : (isDarkMode() ? '#66b3ff' : '#1565c0'));

        return { text: text, color: color, days: days };
    }

    var DEADLINE_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Six calendar months from the start of the current one. That reaches the next
    // registration round for the following teaching period while keeping each month
    // wide enough for its marks to carry readable labels.
    function buildDeadlineTimelineAxis(todayTs) {
        var todayDate = new Date(todayTs);
        var year = todayDate.getUTCFullYear();
        var month = todayDate.getUTCMonth();
        var startTs = Date.UTC(year, month, 1);
        var endTs = Date.UTC(year, month + 6, 1);
        var spanTs = endTs - startTs;

        function percentFor(ts) {
            return Math.max(0, Math.min(100, ((Number(ts) - startTs) / spanTs) * 100));
        }

        var ticks = [];
        for (var i = 0; i < 6; i++) {
            var tickTs = Date.UTC(year, month + i, 1);
            var tickDate = new Date(tickTs);
            var label = DEADLINE_MONTH_NAMES[tickDate.getUTCMonth()];
            // The year only where it turns, so the axis never reads as the wrong January.
            if (tickDate.getUTCMonth() === 0) label += ' ' + tickDate.getUTCFullYear();
            ticks.push({ ts: tickTs, label: label, percent: percentFor(tickTs) });
        }

        var normalizedTodayTs = Date.UTC(year, month, todayDate.getUTCDate());
        return {
            startTs: startTs,
            endTs: endTs,
            todayTs: normalizedTodayTs,
            todayPercent: percentFor(normalizedTodayTs),
            ticks: ticks,
            percentFor: percentFor
        };
    }

    function getDeadlineRowStartTs(row) {
        return row && row.startTs != null && isFinite(row.startTs) ? Number(row.startTs) : Number(row && row.nextTs);
    }

    function getDeadlineRowEndTs(row) {
        return row && row.endTs != null && isFinite(row.endTs) ? Number(row.endTs) : getDeadlineRowStartTs(row);
    }

    function selectDeadlineTimelineRows(rows, todayTs) {
        var axis = buildDeadlineTimelineAxis(todayTs);
        return (Array.isArray(rows) ? rows : []).filter(function (row) {
            if (!row) return false;
            var rowStartTs = getDeadlineRowStartTs(row);
            var rowEndTs = getDeadlineRowEndTs(row);
            return isFinite(rowStartTs) && isFinite(rowEndTs)
                && rowEndTs >= axis.startTs
                && rowStartTs <= axis.endTs;
        });
    }

    function deadlineMonthIndex(name) {
        var key = String(name || '').slice(0, 3).toLowerCase();
        var index = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(key);
        if (index >= 0) return index;
        if (key === 'maj') return 4;
        if (key === 'okt') return 9;
        return -1;
    }

    // A DTU heading names the period and, after the colon, when it runs:
    // "Fall 2026 (13-weeks period): 31 August - 4 December" or
    // "Ordinary winter exam 2026: 6 December - 22 December".
    function parseDeadlinePeriodHeading(text) {
        var heading = normalizeDeadlinePeriodText(text);
        var colon = heading.indexOf(':');
        var namePart = colon >= 0 ? heading.slice(0, colon) : heading;
        var rangePart = colon >= 0 ? heading.slice(colon + 1) : '';
        var name = normalizeWhitespace(namePart.replace(/\([^)]*\)/g, ' ')).replace(/^ordinary\s+/i, '');
        if (name) name = name.charAt(0).toUpperCase() + name.slice(1);

        var result = { name: name, startTs: null, endTs: null };
        var yearMatch = namePart.match(/\b(20\d{2})\b/);
        var rangeMatch = rangePart.match(/(\d{1,2})\.?\s*([A-Za-z\u00e6\u00f8\u00e5]+)\s*[-\u2013\u2014]\s*(\d{1,2})\.?\s*([A-Za-z\u00e6\u00f8\u00e5]+)/);
        if (!yearMatch || !rangeMatch) return result;
        var startMonth = deadlineMonthIndex(rangeMatch[2]);
        var endMonth = deadlineMonthIndex(rangeMatch[4]);
        if (startMonth < 0 || endMonth < 0) return result;
        var year = parseInt(yearMatch[1], 10);
        result.startTs = Date.UTC(year, startMonth, parseInt(rangeMatch[1], 10));
        result.endTs = Date.UTC(endMonth < startMonth ? year + 1 : year, endMonth, parseInt(rangeMatch[3], 10));
        return result;
    }

    function formatDeadlineDayMonth(ts, todayTs) {
        var date = new Date(ts);
        var text = date.getUTCDate() + ' ' + DEADLINE_MONTH_NAMES[date.getUTCMonth()];
        if (todayTs != null && new Date(todayTs).getUTCFullYear() !== date.getUTCFullYear()) {
            text += ' ' + date.getUTCFullYear();
        }
        return text;
    }

    function formatDeadlineSpan(startTs, endTs) {
        var start = new Date(startTs);
        var end = new Date(endTs);
        var sameMonth = start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth();
        return (sameMonth ? String(start.getUTCDate()) : formatDeadlineDayMonth(startTs))
            + ' to ' + formatDeadlineDayMonth(endTs);
    }

    // One timeline row per period a deadline belongs to: the teaching period being
    // registered for, or the exam period. A window DTU lists under several periods
    // (the three summer courses share one registration round) appears in each row.
    function buildDeadlinePeriodGroups(rows) {
        var groups = [];
        var byKey = Object.create(null);
        (Array.isArray(rows) ? rows : []).forEach(function (row) {
            if (!row) return;
            var kind = row.kind === 'exam' ? 'exam' : 'course';
            var periods = getDeadlinePeriodLabels(row);
            if (!periods.length) periods = [''];
            periods.forEach(function (periodText) {
                var key = kind + '|' + periodText;
                var group = byKey[key];
                if (!group) {
                    var parsed = parseDeadlinePeriodHeading(periodText);
                    group = {
                        key: key,
                        kind: kind,
                        name: parsed.name || (kind === 'exam' ? 'Exams' : 'Courses'),
                        startTs: parsed.startTs,
                        endTs: parsed.endTs,
                        rows: []
                    };
                    byKey[key] = group;
                    groups.push(group);
                }
                if (group.rows.indexOf(row) === -1) group.rows.push(row);
            });
        });
        groups.forEach(function (group) {
            group.rows.sort(function (a, b) {
                return getDeadlineRowStartTs(a) - getDeadlineRowStartTs(b) || a.nextTs - b.nextTs;
            });
            group.nextRow = group.rows.reduce(function (best, row) {
                return (!best || row.nextTs < best.nextTs) ? row : best;
            }, null);
            group.sortTs = group.startTs != null ? group.startTs : group.nextRow.nextTs;
        });
        groups.sort(function (a, b) { return a.sortTs - b.sortTs; });
        return groups;
    }

    function describeDeadlinePeriod(group) {
        if (!group || group.startTs == null || group.endTs == null) return '';
        return (group.kind === 'exam' ? 'Exam period ' : 'Teaching ') + formatDeadlineSpan(group.startTs, group.endTs);
    }

    function deadlineMarkName(row) {
        var action = deadlineActionName(row && row.label);
        if (action === 'Supplementary registration') return 'Supplementary';
        if (action === 'Action') return String(row && row.label || '').trim();
        return action;
    }

    // Labels run on two lines: above the upper bars and below the lower marks. Their pixel
    // width is unknown while the rows are built, so it is estimated against a narrow track.
    // A label that would collide is left off; its mark still names it in the tooltip.
    var DEADLINE_LABEL_PERCENT_PER_CHAR = (6 / 620) * 100;

    function layoutDeadlinePeriodMarks(group, axis) {
        var marks = group.rows.map(function (row) {
            var startTs = getDeadlineRowStartTs(row);
            var endTs = getDeadlineRowEndTs(row);
            var isRange = endTs > startTs;
            var name = deadlineMarkName(row);
            var startPercent = axis.percentFor(startTs);
            return {
                row: row,
                type: isRange ? 'range' : 'date',
                startPercent: startPercent,
                endPercent: isRange ? Math.min(100, Math.max(startPercent + 0.8, axis.percentFor(endTs))) : startPercent,
                continuesBefore: isRange && startTs < axis.startTs,
                continuesAfter: isRange && endTs > axis.endTs,
                soft: deadlineActionName(row.label) === 'Supplementary registration',
                label: isRange ? name : (name + ' ' + formatDeadlineDayMonth(startTs)),
                lane: 1
            };
        });

        var upperEnd = -Infinity;
        marks.filter(function (mark) { return mark.type === 'range'; })
            .sort(function (a, b) { return a.startPercent - b.startPercent || a.endPercent - b.endPercent; })
            .forEach(function (mark) {
                if (mark.startPercent > upperEnd + 0.6) {
                    mark.lane = 0;
                    upperEnd = mark.endPercent;
                }
            });

        var occupied = [[], []];
        marks.slice().sort(function (a, b) { return a.startPercent - b.startPercent; }).forEach(function (mark) {
            var width = mark.label.length * DEADLINE_LABEL_PERCENT_PER_CHAR;
            var anchorEnd = mark.type === 'range' ? mark.endPercent : mark.startPercent;
            var from = mark.startPercent;
            mark.labelAlignEnd = from + width > 100;
            if (mark.labelAlignEnd) from = anchorEnd - width;
            var to = from + width;
            var clash = occupied[mark.lane].some(function (span) {
                return from < span[1] + 1 && to > span[0] - 1;
            });
            mark.showLabel = !clash && from >= 0 && !!mark.label;
            mark.labelPercent = mark.labelAlignEnd ? anchorEnd : mark.startPercent;
            if (mark.showLabel) occupied[mark.lane].push([from, to]);
        });
        return marks;
    }

    function formatDeadlinePeriodStatus(row, todayTs) {
        var nextTs = getDeadlineNextTs(row, todayTs);
        if (nextTs == null) return { text: '', date: '', urgent: false };
        var days = diffDaysUtc(todayTs, nextTs);
        var active = !!(row && row.state === 'active');
        var isRange = row.endTs != null && row.endTs > row.startTs;
        var verb = active ? 'Closes' : ((isRange && todayTs < row.startTs) ? 'Opens' : 'Due');
        var when = days <= 0 ? 'today' : (days === 1 ? 'tomorrow' : ('in ' + days + ' days'));
        return {
            text: verb + ' ' + when,
            date: formatDeadlineDayMonth(nextTs, todayTs),
            urgent: active || days <= 7
        };
    }

    function deadlineTimelineTooltipContent(row) {
        var periods = getDeadlinePeriodLabels(row).map(function (period) {
            return String(period || '')
                .split(':')[0]
                .replace(/\b(\d+)-weeks\b/gi, '$1-week')
                .trim();
        }).filter(Boolean);
        var action = deadlineActionName(row && row.label);
        return {
            title: String(row && row.label || '').trim(),
            description: DEADLINE_ACTION_EXPLAINERS[action] || '',
            period: periods.join(' / '),
            date: formatDeadlineRangeCompact(row)
        };
    }

    function joinDeadlineTooltipParts(parts) {
        var normalized = (Array.isArray(parts) ? parts : []).map(function (part) {
            return String(part || '').trim().replace(/[.\s]+$/g, '');
        }).filter(Boolean);
        return normalized.length ? (normalized.join('. ') + '.') : '';
    }

    function deadlineTimelineAccessibleLabel(row) {
        var content = deadlineTimelineTooltipContent(row);
        return joinDeadlineTooltipParts([content.title, content.description, content.period, content.date]);
    }

    function createDeadlinesHomeRow(row, todayTs) {
        var chipInfo = formatDeadlineChip(row, todayTs);
        var active = row && row.state === 'active';

        var card = document.createElement('div');
        markExt(card);
        card.style.cssText = 'display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px; padding: 10px 0; min-width: 0;';

        var center = document.createElement('div');
        markExt(center);
        center.style.cssText = 'display: flex; flex-direction: column; gap: 2px; padding: 0 10px; min-width: 0;';

        var title = document.createElement('div');
        markExt(title);
        title.textContent = row.label || '';
        title.title = row.label || '';
        title.style.cssText = 'font-size: 13px; font-weight: 600; line-height: 18px; color: '
            + (isDarkMode() ? '#e0e0e0' : '#1f2937') + ';';

        var range = formatDeadlineRangeCompact(row);
        var dates = document.createElement('div');
        markExt(dates);
        dates.textContent = range || '';
        dates.title = range || '';
        dates.style.cssText = 'font-size: 11px; color: ' + (isDarkMode() ? '#b0b0b0' : '#4b5563') + '; '
            + 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        if (!range) dates.style.display = 'none';

        var hintText = deadlineOneLineHint(row) || '';
        var hint = document.createElement('div');
        markExt(hint);
        hint.textContent = hintText || '';
        hint.title = hintText || '';
        hint.style.cssText = 'font-size: 11px; line-height: 15px; color: ' + (isDarkMode() ? '#a8a8a8' : '#6b7280') + '; margin-top: 1px;';
        if (!hintText) hint.style.display = 'none';

        center.appendChild(title);
        center.appendChild(dates);
        center.appendChild(hint);

        getDeadlinePeriodLabels(row).forEach(function (periodText) {
            var period = document.createElement('div');
            markExt(period);
            period.textContent = periodText;
            period.title = periodText;
            period.style.cssText = 'font-size: 10px; color: ' + (isDarkMode() ? '#a8a8a8' : '#6b7280') + '; margin-top: 1px;';
            center.appendChild(period);
        });

        var badge = document.createElement('div');
        markExt(badge);
        var chipText = chipInfo.text || '';
        badge.textContent = chipText;

        var chipBg = active
            ? (isDarkMode() ? 'rgba(102,187,106,0.15)' : 'rgba(46,125,50,0.1)')
            : (chipInfo.days != null && chipInfo.days <= 7
                ? (isDarkMode() ? 'rgba(255,167,38,0.15)' : 'rgba(230,81,0,0.1)')
                : (isDarkMode() ? 'rgba(102,179,255,0.15)' : 'rgba(21,101,192,0.1)'));
        badge.style.cssText = 'align-self: start; padding: 2px 8px; border-radius: 6px; font-size: 11px; '
            + 'font-weight: 700; white-space: nowrap; background: ' + chipBg + '; color: ' + chipInfo.color + ';';
        badge.style.setProperty('color', chipInfo.color, 'important');
        if (!chipText) badge.style.display = 'none';

        card.appendChild(center);
        card.appendChild(badge);

        return card;
    }

    function ensureDeadlinesTimelineStyles() {
        if (!document || !document.head || document.getElementById(DEADLINES_TIMELINE_STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = DEADLINES_TIMELINE_STYLE_ID;
        style.textContent = [
            '/* Hallmark - pre-emit critique: P5 H5 E4 S5 R5 V5 */',
            '/* Hallmark - component: deadline timeline by period - theme: DTU After Dark',
            ' * One row per teaching or exam period, marks labelled in place, accent only for what is open or due within 7 days.',
            ' * states: passive visualization; marks are focusable and show their tooltip on hover and focus',
            ' */',
            '.dtu-deadline-timeline{--deadline-accent:var(--dtu-ad-accent-mark-light,var(--dtu-ad-accent-deep-text,#990000));--deadline-grid:rgba(31,41,55,.14);--deadline-rule:rgba(26,26,26,.06);--deadline-band:rgba(26,26,26,.04);--deadline-text:#1a1a1a;--deadline-muted:#686868;--deadline-surface:#fff;display:block;min-width:0;padding:2px 0 0;container-type:inline-size;font-variant-numeric:tabular-nums;}',
            '.dtu-deadline-timeline[data-theme="dark"]{--deadline-accent:var(--dtu-ad-accent-mark-dark,var(--dtu-ad-accent-soft,#ff6b6b));--deadline-grid:rgba(255,255,255,.11);--deadline-rule:rgba(255,255,255,.07);--deadline-band:rgba(255,255,255,.05);--deadline-text:#f0eee8;--deadline-muted:#aaa9a5;--deadline-surface:#2d2d2d;}',
            '.dtu-deadline-timeline-axis,.dtu-deadline-period{display:grid;grid-template-columns:minmax(140px,200px) minmax(0,1fr) minmax(110px,150px);column-gap:24px;min-width:0;}',
            '.dtu-deadline-timeline-axis{align-items:end;}',
            '.dtu-deadline-timeline-key{padding:0 0 5px;font-size:11px;line-height:14px;color:var(--deadline-muted);}',
            '.dtu-deadline-timeline-track{position:relative;min-width:0;}',
            '.dtu-deadline-timeline-axis .dtu-deadline-timeline-track{height:36px;}',
            '.dtu-deadline-timeline-tick-label{position:absolute;bottom:5px;padding-left:5px;font-size:11px;line-height:14px;color:var(--deadline-muted);white-space:nowrap;}',
            '.dtu-deadline-timeline-today-label{position:absolute;top:0;transform:translateX(-50%);font-size:11px;font-weight:700;line-height:14px;color:var(--deadline-accent);white-space:nowrap;}',
            '.dtu-deadline-timeline-today-label.align-start{transform:none;}',
            '.dtu-deadline-timeline-today-label.align-end{transform:translateX(-100%);}',
            '.dtu-deadline-period{align-items:center;border-top:1px solid var(--deadline-grid);}',
            '.dtu-deadline-period-label{min-width:0;padding:12px 0;}',
            '.dtu-deadline-period-name{font-size:14px;line-height:18px;color:var(--deadline-text);overflow-wrap:anywhere;}',
            '.dtu-deadline-period-sub{margin-top:3px;font-size:12px;line-height:15px;color:var(--deadline-muted);}',
            '.dtu-deadline-period .dtu-deadline-timeline-track{align-self:stretch;height:72px;}',
            '.dtu-deadline-timeline-tick{position:absolute;top:0;bottom:0;width:1px;background:var(--deadline-rule);pointer-events:none;}',
            '.dtu-deadline-period-band{position:absolute;top:0;bottom:0;background:var(--deadline-band);pointer-events:none;}',
            '.dtu-deadline-timeline-today{position:absolute;top:0;bottom:-1px;z-index:4;width:2px;margin-left:-1px;background:var(--deadline-accent);pointer-events:none;}',
            // Every mark is drawn in the accent at full strength. --dtu-ad-accent-mark-* is the accent,
            // or the preset's own shade for this surface, at 4.5:1 or better (see darkmode.js), so
            // pale presets like DTU Grey and dark ones like Navy both stay visible and keep their hue.
            // Supplementary windows are told apart by an outline rather than by fading the colour.
            '.dtu-deadline-timeline-bar{position:absolute;height:6px;min-width:4px;border-radius:3px;background:var(--deadline-accent);cursor:help;}',
            '.dtu-deadline-timeline-bar.is-lane-0{top:24px;}',
            '.dtu-deadline-timeline-bar.is-lane-1{top:40px;}',
            '.dtu-deadline-timeline-bar.is-active{height:8px;margin-top:-1px;border-radius:4px;}',
            '.dtu-deadline-timeline-bar.is-clipped-start{border-top-left-radius:0;border-bottom-left-radius:0;background:linear-gradient(90deg,transparent 0,var(--deadline-accent) 12px);}',
            '.dtu-deadline-timeline-bar.is-clipped-end{border-top-right-radius:0;border-bottom-right-radius:0;background:linear-gradient(270deg,transparent 0,var(--deadline-accent) 12px);}',
            '.dtu-deadline-timeline-bar.is-clipped-start.is-clipped-end{background:linear-gradient(90deg,transparent 0,var(--deadline-accent) 12px,var(--deadline-accent) calc(100% - 12px),transparent 100%);}',
            '.dtu-deadline-timeline-bar.is-soft{background:transparent;box-shadow:inset 0 0 0 1.5px var(--deadline-accent);}',
            '.dtu-deadline-timeline-bar.is-soft.is-clipped-start{box-shadow:inset 0 1.5px 0 var(--deadline-accent),inset 0 -1.5px 0 var(--deadline-accent),inset -1.5px 0 0 var(--deadline-accent);}',
            '.dtu-deadline-timeline-bar.is-soft.is-clipped-end{box-shadow:inset 0 1.5px 0 var(--deadline-accent),inset 0 -1.5px 0 var(--deadline-accent),inset 1.5px 0 0 var(--deadline-accent);}',
            '.dtu-deadline-timeline-bar.is-soft.is-clipped-start.is-clipped-end{box-shadow:inset 0 1.5px 0 var(--deadline-accent),inset 0 -1.5px 0 var(--deadline-accent);}',
            '.dtu-deadline-timeline-date-mark{position:absolute;top:33px;width:3px;height:14px;margin-left:-1px;border-radius:1px;background:var(--deadline-accent);cursor:help;}',
            '.dtu-deadline-timeline-bar::after,.dtu-deadline-timeline-date-mark::after{content:"";position:absolute;background:transparent;}',
            '.dtu-deadline-timeline-bar::after{inset:-9px -6px;}',
            '.dtu-deadline-timeline-date-mark::after{inset:-5px -10px;}',
            '.dtu-deadline-mark-label{position:absolute;font-size:11px;line-height:14px;color:var(--deadline-muted);white-space:nowrap;pointer-events:none;}',
            '.dtu-deadline-mark-label.is-above{top:5px;}',
            '.dtu-deadline-mark-label.is-below{top:52px;}',
            '.dtu-deadline-mark-label.align-end{transform:translateX(-100%);}',
            '.dtu-deadline-mark-label.is-accent{font-weight:700;color:var(--deadline-accent);}',
            '.dtu-deadline-timeline-bar:focus-visible,.dtu-deadline-timeline-date-mark:focus-visible{outline:2px solid var(--deadline-text);outline-offset:3px;}',
            '.dtu-deadline-timeline-bar:hover,.dtu-deadline-timeline-bar:focus,.dtu-deadline-timeline-date-mark:hover,.dtu-deadline-timeline-date-mark:focus{z-index:30;}',
            '.dtu-deadline-mark-tooltip{display:none;position:absolute;left:50%;bottom:calc(100% + 7px);z-index:40;width:max-content;max-width:min(280px,50vw);padding:8px 10px;border:1px solid var(--deadline-grid);border-radius:3px;background:var(--deadline-surface);color:var(--deadline-text);box-shadow:0 4px 14px rgba(0,0,0,.22);font-size:11px;font-weight:400;line-height:15px;text-align:left;white-space:normal;pointer-events:auto;transform:translateX(-50%);}',
            '.dtu-deadline-mark-tooltip-title{display:block;font-size:12px;font-weight:700;line-height:16px;color:var(--deadline-text);}',
            '.dtu-deadline-mark-tooltip-description{display:block;margin-top:3px;color:var(--deadline-text);}',
            '.dtu-deadline-mark-tooltip-item{display:block;margin-top:6px;padding-top:5px;border-top:1px solid var(--deadline-grid);}',
            '.dtu-deadline-mark-tooltip-item-title{display:block;font-weight:700;color:var(--deadline-text);}',
            '.dtu-deadline-mark-tooltip-period{display:block;margin-top:3px;color:var(--deadline-muted);}',
            '.dtu-deadline-mark-tooltip-date{display:block;margin-top:1px;color:var(--deadline-text);}',
            '.dtu-deadline-timeline-bar:hover>.dtu-deadline-mark-tooltip,.dtu-deadline-timeline-bar:focus>.dtu-deadline-mark-tooltip,.dtu-deadline-timeline-date-mark:hover>.dtu-deadline-mark-tooltip,.dtu-deadline-timeline-date-mark:focus>.dtu-deadline-mark-tooltip{display:block;}',
            '.tooltip-align-start>.dtu-deadline-mark-tooltip{left:0;transform:none;}',
            '.tooltip-align-end>.dtu-deadline-mark-tooltip{right:0;left:auto;transform:none;}',
            '.dtu-deadline-timeline-status{padding:12px 0;text-align:right;min-width:0;}',
            '.dtu-deadline-timeline-status-text{font-size:13px;line-height:17px;color:var(--deadline-text);white-space:nowrap;}',
            '.dtu-deadline-timeline-status-text.is-accent{font-weight:700;color:var(--deadline-accent);}',
            '.dtu-deadline-timeline-date{margin-top:2px;font-size:12px;line-height:15px;color:var(--deadline-muted);}',
            '.dtu-deadline-mobile-list{display:none;}',
            '.dtu-deadline-period-mobile{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:12px;padding:10px 0;border-top:1px solid var(--deadline-grid);}',
            '.dtu-deadline-period-mobile .dtu-deadline-timeline-status{padding:0;}',
            '.dtu-deadline-period-detail{margin-top:4px;font-size:12px;line-height:16px;color:var(--deadline-text);}',
            '.dtu-deadline-a11y-list{display:block;position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0;}',
            '@container(max-width:760px){.dtu-deadline-timeline-desktop{display:none;}.dtu-deadline-mobile-list{display:block;}}',
            '@media(max-width:780px){.dtu-deadline-timeline-desktop{display:none;}.dtu-deadline-mobile-list{display:block;}}',
            '.dtu-deadlines-home-widget [data-dtu-ext] a:focus-visible,.dtu-deadlines-home-widget button[data-dtu-ext]:focus-visible,.dtu-deadlines-home-widget a[data-dtu-ext]:focus-visible{outline:2px solid currentColor !important;outline-offset:2px !important;}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function createTimelinePositionedElement(className, percent) {
        var element = document.createElement('div');
        markExt(element);
        element.className = className;
        element.style.left = Math.max(0, Math.min(100, Number(percent || 0))) + '%';
        return element;
    }

    function attachDeadlineMarkTooltip(mark, detail, percent) {
        var normalizedPercent = Number(percent || 0);
        var accessibleDetail = typeof detail === 'string'
            ? detail
            : (detail.items
                ? joinDeadlineTooltipParts([detail.title].concat(detail.items.map(function (item) {
                    return joinDeadlineTooltipParts([item.title, item.description, item.period, item.date]);
                })))
                : joinDeadlineTooltipParts([detail.title, detail.description, detail.period, detail.date]));
        if (normalizedPercent < 18) mark.className += ' tooltip-align-start';
        if (normalizedPercent > 82) mark.className += ' tooltip-align-end';
        mark.setAttribute('role', 'img');
        mark.setAttribute('tabindex', '0');
        mark.setAttribute('aria-label', accessibleDetail);
        var tooltip = document.createElement('span');
        markExt(tooltip);
        tooltip.className = 'dtu-deadline-mark-tooltip';
        tooltip.setAttribute('role', 'tooltip');
        if (typeof detail === 'string') {
            tooltip.textContent = detail;
        } else {
            function appendTooltipLine(parent, className, text) {
                if (!text) return;
                var line = document.createElement('span');
                markExt(line);
                line.className = className;
                line.textContent = text;
                parent.appendChild(line);
            }
            appendTooltipLine(tooltip, 'dtu-deadline-mark-tooltip-title', detail.title);
            (detail.items || [detail]).forEach(function (item) {
                var parent = tooltip;
                if (detail.items) {
                    parent = document.createElement('span');
                    markExt(parent);
                    parent.className = 'dtu-deadline-mark-tooltip-item';
                    tooltip.appendChild(parent);
                    appendTooltipLine(parent, 'dtu-deadline-mark-tooltip-item-title', item.title);
                }
                [
                    ['dtu-deadline-mark-tooltip-description', item.description],
                    ['dtu-deadline-mark-tooltip-period', item.period],
                    ['dtu-deadline-mark-tooltip-date', item.date]
                ].forEach(function (definition) {
                    if (!definition[1]) return;
                    appendTooltipLine(parent, definition[0], definition[1]);
                });
            });
        }
        mark.appendChild(tooltip);
    }

    function createDeadlineTimelineElement(tagName, className, text) {
        var element = document.createElement(tagName);
        markExt(element);
        if (className) element.className = className;
        if (text != null) element.textContent = text;
        return element;
    }

    function createDeadlineStatusElement(group, todayTs) {
        var info = formatDeadlinePeriodStatus(group.nextRow, todayTs);
        var status = createDeadlineTimelineElement('div', 'dtu-deadline-timeline-status');
        status.appendChild(createDeadlineTimelineElement('div',
            'dtu-deadline-timeline-status-text' + (info.urgent ? ' is-accent' : ''), info.text));
        status.appendChild(createDeadlineTimelineElement('div', 'dtu-deadline-timeline-date', info.date));
        return status;
    }

    function createDeadlinePeriodLabel(group) {
        var label = createDeadlineTimelineElement('div', 'dtu-deadline-period-label');
        label.appendChild(createDeadlineTimelineElement('div', 'dtu-deadline-period-name', group.name));
        var sub = describeDeadlinePeriod(group);
        if (sub) label.appendChild(createDeadlineTimelineElement('div', 'dtu-deadline-period-sub', sub));
        return label;
    }

    function createDeadlinePeriodRow(group, axis, todayTs) {
        var row = createDeadlineTimelineElement('div', 'dtu-deadline-period');
        var track = createDeadlineTimelineElement('div', 'dtu-deadline-timeline-track');
        track.setAttribute('aria-label', group.name + ', ' + group.rows.length
            + (group.rows.length === 1 ? ' deadline' : ' deadlines'));

        axis.ticks.slice(1).forEach(function (tick) {
            track.appendChild(createTimelinePositionedElement('dtu-deadline-timeline-tick', tick.percent));
        });
        if (group.startTs != null && group.endTs != null
            && group.endTs >= axis.startTs && group.startTs <= axis.endTs) {
            var bandStart = axis.percentFor(group.startTs);
            var band = createTimelinePositionedElement('dtu-deadline-period-band', bandStart);
            // The period's last day is inclusive, so the band runs to the end of that day.
            band.style.width = Math.max(0, axis.percentFor(group.endTs + 86400000) - bandStart) + '%';
            track.appendChild(band);
        }

        layoutDeadlinePeriodMarks(group, axis).forEach(function (mark) {
            var status = formatDeadlinePeriodStatus(mark.row, todayTs);
            var element;
            if (mark.type === 'range') {
                element = createTimelinePositionedElement('dtu-deadline-timeline-bar is-lane-' + mark.lane, mark.startPercent);
                element.style.width = Math.max(0.8, mark.endPercent - mark.startPercent) + '%';
                if (mark.row.state === 'active') element.className += ' is-active';
                else if (mark.soft) element.className += ' is-soft';
                if (mark.continuesBefore) element.className += ' is-clipped-start';
                if (mark.continuesAfter) element.className += ' is-clipped-end';
                if (mark.continuesBefore || mark.continuesAfter) {
                    element.style.webkitMaskImage = 'none';
                    element.style.maskImage = 'none';
                }
            } else {
                element = createTimelinePositionedElement('dtu-deadline-timeline-date-mark', mark.startPercent);
                if (status.urgent) element.className += ' is-soon';
            }
            attachDeadlineMarkTooltip(element, deadlineTimelineTooltipContent(mark.row), mark.startPercent);
            track.appendChild(element);

            if (!mark.showLabel) return;
            var text = createTimelinePositionedElement('dtu-deadline-mark-label ' + (mark.lane === 0 ? 'is-above' : 'is-below'), mark.labelPercent);
            if (mark.labelAlignEnd) text.className += ' align-end';
            if (mark.row.state === 'active' || (mark.type === 'date' && status.urgent)) text.className += ' is-accent';
            text.setAttribute('aria-hidden', 'true');
            text.textContent = mark.label;
            track.appendChild(text);
        });

        track.appendChild(createTimelinePositionedElement('dtu-deadline-timeline-today', axis.todayPercent));
        row.appendChild(createDeadlinePeriodLabel(group));
        row.appendChild(track);
        row.appendChild(createDeadlineStatusElement(group, todayTs));
        return row;
    }

    // Narrow widths drop the chart and list each period's dates as text.
    function createDeadlinePeriodMobileRow(group, todayTs) {
        var row = createDeadlineTimelineElement('div', 'dtu-deadline-period-mobile');
        var label = createDeadlinePeriodLabel(group);
        label.className = '';
        label.style.minWidth = '0';
        var detail = group.rows.map(function (entry) {
            var startTs = getDeadlineRowStartTs(entry);
            var endTs = getDeadlineRowEndTs(entry);
            return deadlineMarkName(entry) + ' ' + (endTs > startTs ? formatDeadlineSpan(startTs, endTs) : formatDeadlineDayMonth(startTs));
        }).join(', ');
        label.appendChild(createDeadlineTimelineElement('div', 'dtu-deadline-period-detail', detail));
        row.appendChild(label);
        row.appendChild(createDeadlineStatusElement(group, todayTs));
        return row;
    }

    function createDeadlinesTimeline(rows, todayTs) {
        var axis = buildDeadlineTimelineAxis(todayTs);
        var visibleRows = selectDeadlineTimelineRows(rows, todayTs);
        var groups = buildDeadlinePeriodGroups(visibleRows);
        var root = createDeadlineTimelineElement('div', 'dtu-deadline-timeline');
        root.setAttribute('data-theme', isDarkMode() ? 'dark' : 'light');
        root.setAttribute('role', 'group');
        root.setAttribute('aria-label', 'Course and exam deadlines by period, '
            + axis.ticks[0].label + ' to ' + axis.ticks[axis.ticks.length - 1].label);

        var desktop = createDeadlineTimelineElement('div', 'dtu-deadline-timeline-desktop');
        var axisRow = createDeadlineTimelineElement('div', 'dtu-deadline-timeline-axis');
        axisRow.appendChild(createDeadlineTimelineElement('div', 'dtu-deadline-timeline-key', 'Shaded: teaching or exam period'));
        var axisTrack = createDeadlineTimelineElement('div', 'dtu-deadline-timeline-track');
        axisTrack.setAttribute('aria-hidden', 'true');
        axis.ticks.forEach(function (tick) {
            var tickLabel = createTimelinePositionedElement('dtu-deadline-timeline-tick-label', tick.percent);
            tickLabel.textContent = tick.label;
            axisTrack.appendChild(tickLabel);
        });
        var todayLabel = createTimelinePositionedElement('dtu-deadline-timeline-today-label', axis.todayPercent);
        if (axis.todayPercent < 4) todayLabel.className += ' align-start';
        if (axis.todayPercent > 96) todayLabel.className += ' align-end';
        todayLabel.textContent = 'Today';
        axisTrack.appendChild(todayLabel);
        axisRow.appendChild(axisTrack);
        axisRow.appendChild(createDeadlineTimelineElement('div'));
        desktop.appendChild(axisRow);

        var mobile = createDeadlineTimelineElement('div', 'dtu-deadline-mobile-list');
        groups.forEach(function (group) {
            desktop.appendChild(createDeadlinePeriodRow(group, axis, todayTs));
            mobile.appendChild(createDeadlinePeriodMobileRow(group, todayTs));
        });

        var accessibleList = createDeadlineTimelineElement('ul', 'dtu-deadline-a11y-list');
        accessibleList.setAttribute('aria-label', 'All upcoming course and exam deadlines');
        visibleRows.forEach(function (row) {
            accessibleList.appendChild(createDeadlineTimelineElement('li', null, deadlineTimelineAccessibleLabel(row)));
        });
        root.appendChild(desktop);
        root.appendChild(mobile);
        root.appendChild(accessibleList);
        return root;
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
        if (!(runningOut || stale) || _deadlinesFetchInProgress) return;
        if (_deadlinesLastAutoRequestAt && (now - _deadlinesLastAutoRequestAt) < DEADLINES_AUTO_RETRY_MS) return;
        _deadlinesLastAutoRequestAt = now;
        requestStudentDeadlines(false, function () { renderDeadlinesHomepageWidget(widget); });
    }

    function renderDeadlinesHomepageWidget(widget) {
        if (!widget) return;
        ensureDeadlinesTimelineStyles();

        var summary = widget.querySelector('[data-dtu-deadlines-summary]');
        var next = widget.querySelector('[data-dtu-deadlines-next]');
        var more = widget.querySelector('[data-dtu-deadlines-more]');
        var footer = widget.querySelector('[data-dtu-deadlines-footer]');
        var meta = widget.querySelector('[data-dtu-deadlines-meta]');
        var chevronBtn = widget.querySelector('[data-dtu-deadlines-chevron]');
        var sources = widget.querySelector('[data-dtu-deadlines-sources]');
        var content = widget.querySelector('[data-dtu-deadlines-content]');

        if (!_deadlinesLastResponse) {
            try {
                var raw = localStorage.getItem(DEADLINES_CACHE_KEY);
                if (raw) {
                    var parsed = JSON.parse(raw);
                    if (parsed && parsed.ok) _deadlinesLastResponse = parsed;
                }
            } catch (e) {
            }
        }

        var resp = _deadlinesLastResponse;
        var todayTs = startOfTodayUtcTs();
        var expandedWanted = localStorage.getItem(DEADLINES_EXPANDED_KEY) !== 'false';
        var dark = isDarkMode();
        var previous = widget._dtuDeadlinesRenderState;
        if (previous && previous.response === resp && previous.todayTs === todayTs
            && previous.expanded === expandedWanted && previous.dark === dark
            && previous.failed === _deadlinesLastRefreshFailed) {
            scheduleDailyDeadlinesCheck(widget, resp, todayTs);
            return;
        }
        // Keep the timeline's focused marks alive across unrelated page mutations.
        widget._dtuDeadlinesRenderState = {
            response: resp, todayTs: todayTs, expanded: expandedWanted,
            dark: dark, failed: _deadlinesLastRefreshFailed
        };

        function clear(el) {
            if (!el) return;
            while (el.firstChild) el.removeChild(el.firstChild);
        }
        clear(next);
        clear(more);

        if (chevronBtn) {
            chevronBtn.setAttribute('icon', expandedWanted ? 'tier1:chevron-up' : 'tier1:chevron-down');
            chevronBtn.setAttribute('expanded', expandedWanted ? 'true' : 'false');
            chevronBtn.setAttribute('text', expandedWanted ? 'Show fewer deadlines' : 'Show more deadlines');
            chevronBtn.setAttribute('aria-expanded', expandedWanted ? 'true' : 'false');
            chevronBtn.style.display = '';
        }
        setDeadlinesWidgetExpandedState(widget, expandedWanted);
        if (more) more.style.display = 'none';
        if (footer) footer.style.display = 'flex';

        if (!resp || !resp.ok) {
            if (summary) summary.textContent = '...';
            var loading = document.createElement('div');
            markExt(loading);
            loading.textContent = _deadlinesLastRefreshFailed
                ? 'Deadlines unavailable. Retrying automatically.'
                : 'Loading deadlines...';
            loading.style.cssText = 'font-size: 13px; color: ' + (isDarkMode() ? '#b0b0b0' : '#6b7280') + ';';
            if (next) next.appendChild(loading);

            scheduleDailyDeadlinesCheck(widget, resp, todayTs);
            return;
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
                meta.style.color = isDarkMode() ? '#ffa726' : '#e65100';
            }
        }

        if (sources) {
            var courseUrl = (resp.course && resp.course.url) ? resp.course.url : 'https://student.dtu.dk/en/courses-and-teaching/course-registration/course-registration-deadlines';
            var examUrl = (resp.exam && resp.exam.url) ? resp.exam.url : 'https://student.dtu.dk/en/exam/exam-registration/-deadlines-for-exams';
            sources.querySelectorAll('a').forEach(function (anchor) {
                if (anchor.getAttribute('data-kind') === 'course') anchor.href = courseUrl;
                if (anchor.getAttribute('data-kind') === 'exam') anchor.href = examUrl;
            });
        }


        var rows = selectDeadlineTimelineRows(buildTopDeadlines(resp, todayTs, Infinity), todayTs);
        if (!rows.length) {
            if (summary) summary.textContent = 'None';
            var empty = document.createElement('div');
            markExt(empty);
            var horizonTs = getDeadlineDataHorizonTs(resp);
            var exhausted = horizonTs != null && todayTs > horizonTs;
            empty.textContent = exhausted
                ? ('Published deadlines stop at ' + formatDeadlineTsShort(horizonTs) + '. Newer dates load automatically once DTU publishes them.')
                : ('No course or exam deadlines up to ' + formatDeadlineTsShort(buildDeadlineTimelineAxis(todayTs).endTs) + '.');
            empty.style.cssText = 'font-size: 13px; color: ' + (isDarkMode() ? '#b0b0b0' : '#6b7280') + '; font-style: italic;';
            if (next) next.appendChild(empty);
            scheduleDailyDeadlinesCheck(widget, resp, todayTs);
            return;
        }

        var nextRow = rows[0];
        var days = diffDaysUtc(todayTs, nextRow.nextTs);
        if (summary) {
            summary.textContent = (days === 0) ? 'Today' : (days + 'd');
        }

        if (chevronBtn) {
            chevronBtn.style.display = '';
            chevronBtn.setAttribute('icon', expandedWanted ? 'tier1:chevron-up' : 'tier1:chevron-down');
            chevronBtn.setAttribute('expanded', expandedWanted ? 'true' : 'false');
            chevronBtn.setAttribute('text', expandedWanted ? 'Collapse deadlines' : 'Expand deadlines');
            chevronBtn.setAttribute('aria-expanded', expandedWanted ? 'true' : 'false');
        }
        if (more) more.style.display = 'none';

        if (next) {
            next.appendChild(createDeadlinesTimeline(rows, todayTs));
            // A source that has run past its published horizon contributes no lanes at all,
            // so without this its absence reads as "nothing is due" rather than "no data".
            buildDeadlineHorizonNotices(resp, todayTs).forEach(function (text) {
                var notice = document.createElement('div');
                markExt(notice);
                notice.textContent = text;
                notice.style.cssText = 'margin-top: 8px; font-size: 10px; line-height: 14px; color: '
                    + (isDarkMode() ? '#ffa726' : '#e65100') + ';';
                next.appendChild(notice);
            });
        }


        scheduleDailyDeadlinesCheck(widget, resp, todayTs);
    }

    function ensureDTULearnHomepageCol3Wide(enabled) {
        var existing = document.querySelector('#' + DTU_HOMEPAGE_COL3_STYLE_ID);
        if (existing) existing.remove();
        if (!enabled) return;
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
    function createDeadlineSourceLink(text, kind) {
        var link = document.createElement('a');
        markExt(link);
        link.textContent = text;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('data-kind', kind);
        var resting = isDarkMode() ? '#a3a3a3' : '#6b7280';
        var raised = isDarkMode() ? '#e0e0e0' : '#374151';
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

    function insertDeadlinesHomepageWidget() {
        if (!isTopWindow()) return;
        enforceCourseSearchVisibility();
        if (!isDTULearnHomepage() || !isDeadlinesEnabled()) {
            var existing = document.querySelector('.dtu-deadlines-home-widget');
            if (existing) existing.remove();
            if (isDTULearnHomepage()) setAtomicSearchWidgetHidden(!isSearchWidgetEnabled());
            ensureDTULearnHomepageCol3Wide(false);
            return;
        }

        var atomicWidget = getAtomicSearchWidgetRoot();
        var fullWidthColumn = getHomepageDeadlinesColumn();
        if (!fullWidthColumn) {
            scheduleDeadlinesHomepageWidgetEnsure();
            return;
        }

        ensureDTULearnHomepageCol3Wide(false);
        if (atomicWidget) enforceCourseSearchVisibility();

        var widget = document.querySelector('.dtu-deadlines-home-widget');
        if (!widget) {
            widget = document.createElement('div');
            widget.className = 'd2l-widget d2l-tile d2l-widget-padding-full dtu-deadlines-home-widget';
            widget.setAttribute('data-dtu-deadlines-mode', 'legacy');
            widget.setAttribute('role', 'region');
            markExt(widget);

            var titleId = 'dtu-deadlines-home-title';
            widget.setAttribute('aria-labelledby', titleId);

            var header = document.createElement('div');
            header.className = 'd2l-widget-header';
            markExt(header);
            header.style.cssText = 'padding: 2px 7px 2px !important;';
            header.style.setProperty('background', isDarkMode() ? '#2d2d2d' : '#ffffff', 'important');
            header.style.setProperty('background-color', isDarkMode() ? '#2d2d2d' : '#ffffff', 'important');
            header.style.setProperty('color', isDarkMode() ? '#e0e0e0' : '#333', 'important');

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

            var badge = document.createElement('span');
            markExt(badge);
            badge.setAttribute('data-dtu-deadlines-summary', '1');
            badge.style.display = 'none';

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
            headerWrap.appendChild(badge);
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

            var more = document.createElement('div');
            markExt(more);
            more.setAttribute('data-dtu-deadlines-more', '1');
            more.style.display = 'none';

            var footer = document.createElement('div');
            markExt(footer);
            footer.setAttribute('data-dtu-deadlines-footer', '1');
            footer.style.cssText = 'display: none; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 16px; margin-top: 8px; padding-top: 8px; '
                + 'border-top: 1px solid ' + (isDarkMode() ? '#333' : '#e5e7eb') + ';';

            var footerLeft = document.createElement('div');
            markExt(footerLeft);
            footerLeft.style.cssText = 'display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; min-width: 0;';

            var meta = document.createElement('div');
            markExt(meta);
            meta.setAttribute('data-dtu-deadlines-meta', '1');
            meta.style.cssText = 'font-size: 10px; color: ' + (isDarkMode() ? '#a3a3a3' : '#6b7280') + ';';

            var disclaimer = document.createElement('div');
            markExt(disclaimer);
            disclaimer.textContent = 'Please double-check dates on the official DTU student pages.';
            disclaimer.style.cssText = 'font-size: 10px; font-style: italic; line-height: 14px; color: '
                + (isDarkMode() ? '#a3a3a3' : '#6b7280') + ';';

            footerLeft.appendChild(disclaimer);
            footerLeft.appendChild(meta);

            var sources = document.createElement('div');
            markExt(sources);
            sources.setAttribute('data-dtu-deadlines-sources', '1');
            sources.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 10px;';

            var sourcesLabel = document.createElement('span');
            markExt(sourcesLabel);
            sourcesLabel.textContent = 'Sources:';
            sourcesLabel.style.cssText = 'color: ' + (isDarkMode() ? '#a3a3a3' : '#6b7280') + ';';

            var courseA = createDeadlineSourceLink('Course', 'course');

            var sep = document.createElement('span');
            markExt(sep);
            sep.textContent = '/';
            sep.style.cssText = 'color: ' + (isDarkMode() ? '#a3a3a3' : '#6b7280') + ';';

            var examA = createDeadlineSourceLink('Exam', 'exam');

            sources.appendChild(sourcesLabel);
            sources.appendChild(courseA);
            sources.appendChild(sep);
            sources.appendChild(examA);

            footer.appendChild(footerLeft);
            footer.appendChild(sources);

            padding.appendChild(next);
            padding.appendChild(more);
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
        if (_deadlinesWidgetTimer) return;

        _deadlinesWidgetAttempts = 0;
        _deadlinesWidgetTimer = setInterval(function () {
            _deadlinesWidgetAttempts++;
            try { insertDeadlinesHomepageWidget(); } catch (e0) { }
            var done = !!document.querySelector('.dtu-deadlines-home-widget') || !isDTULearnHomepage() || !isDeadlinesEnabled();
            if ((done && _deadlinesWidgetAttempts >= 10) || _deadlinesWidgetAttempts >= 60) {
                clearInterval(_deadlinesWidgetTimer);
                _deadlinesWidgetTimer = null;
            }
        }, 400);
    }

    function createAdminToggleListItem(id, labelText, checked, onChange) {
        var li = document.createElement('li');
        li.style.cssText = isDarkMode()
            ? 'display: flex; align-items: center; gap: 8px; padding: 4px 0; background-color: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; padding: 4px 0;';

        var label = document.createElement('label');
        label.style.cssText = isDarkMode()
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
