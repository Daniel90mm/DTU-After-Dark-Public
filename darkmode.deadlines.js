(function () {
    'use strict';

    var DEADLINES_CACHE_KEY = 'dtuDarkModeDeadlinesCacheV2';
    // DTU publishes these dates years ahead and edits them rarely, so elapsed time is a
    // poor refetch trigger. The real signal is the data horizon; this is only a safety
    // net for amendments to already-published dates.
    var DEADLINES_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
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
        var now = new Date();
        return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
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
            if (!source) return;
            if (!source.ok || !(source.groups && source.groups.length)) problems.push(entry[0]);
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

    function getDeadlineLaneExplainers(rows) {
        var seen = Object.create(null);
        var out = [];
        (Array.isArray(rows) ? rows : []).forEach(function (row) {
            var action = deadlineActionName(row && row.label);
            var text = DEADLINE_ACTION_EXPLAINERS[action];
            if (!text || seen[action]) return;
            seen[action] = true;
            out.push({ title: action, text: text });
        });
        return out;
    }

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

    function buildDeadlineTimelinePhaseWindow(todayTs) {
        var todayDate = new Date(todayTs);
        var year = todayDate.getUTCFullYear();
        var month = todayDate.getUTCMonth();
        var phases;

        if (month === 0) {
            phases = [
                { label: 'January', startTs: Date.UTC(year, 0, 1), endExclusiveTs: Date.UTC(year, 1, 1) },
                { label: 'Spring', startTs: Date.UTC(year, 1, 1), endExclusiveTs: Date.UTC(year, 5, 1) }
            ];
        } else if (month <= 4) {
            phases = [
                { label: 'Spring', startTs: Date.UTC(year, 1, 1), endExclusiveTs: Date.UTC(year, 5, 1) },
                { label: 'Summer University', startTs: Date.UTC(year, 5, 1), endExclusiveTs: Date.UTC(year, 8, 1) }
            ];
        } else if (month <= 7) {
            phases = [
                { label: 'Summer University', startTs: Date.UTC(year, 5, 1), endExclusiveTs: Date.UTC(year, 8, 1) },
                { label: 'Fall', startTs: Date.UTC(year, 8, 1), endExclusiveTs: Date.UTC(year + 1, 0, 1) }
            ];
        } else {
            phases = [
                { label: 'Fall', startTs: Date.UTC(year, 8, 1), endExclusiveTs: Date.UTC(year + 1, 0, 1) },
                { label: 'January', startTs: Date.UTC(year + 1, 0, 1), endExclusiveTs: Date.UTC(year + 1, 1, 1) }
            ];
        }

        return {
            startTs: phases[0].startTs,
            endExclusiveTs: phases[1].endExclusiveTs,
            phases: phases
        };
    }

    function selectDeadlineTimelinePhaseWindow(rows, todayTs) {
        var todayDate = new Date(todayTs);
        var normalizedTodayTs = Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), todayDate.getUTCDate());
        var window = buildDeadlineTimelinePhaseWindow(normalizedTodayTs);

        return (Array.isArray(rows) ? rows : []).filter(function (row) {
            if (!row) return false;
            var rowStartTs = row.startTs != null && isFinite(row.startTs) ? Number(row.startTs) : Number(row.nextTs);
            var rowEndTs = row.endTs != null && isFinite(row.endTs) ? Number(row.endTs) : rowStartTs;
            return isFinite(rowStartTs) && isFinite(rowEndTs)
                && rowEndTs >= window.startTs
                && rowStartTs < window.endExclusiveTs;
        });
    }

    function buildDeadlineTimelineModel(rows, todayTs) {
        var dayMs = 86400000;
        var paddingMs = 3 * dayMs;
        var todayDate = new Date(todayTs);
        var normalizedTodayTs = Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), todayDate.getUTCDate());
        var window = buildDeadlineTimelinePhaseWindow(normalizedTodayTs);
        var sourceRows = selectDeadlineTimelinePhaseWindow(rows, normalizedTodayTs);
        // Anchor the left edge to the content rather than to the phase start. An August
        // "today" inside Summer University would otherwise spend a third of the track
        // on an empty June/July and squeeze every real mark into the right-hand side.
        var earliestRowTs = null;
        sourceRows.forEach(function (row) {
            var rowTs = row.startTs != null && isFinite(row.startTs) ? Number(row.startTs) : Number(row.nextTs);
            if (!isFinite(rowTs)) return;
            if (earliestRowTs == null || rowTs < earliestRowTs) earliestRowTs = rowTs;
        });
        var leadInTs = normalizedTodayTs - (14 * dayMs);
        var contentStartTs = earliestRowTs == null ? leadInTs : Math.min(leadInTs, earliestRowTs);
        var startTs = Math.max(window.startTs, contentStartTs) - paddingMs;
        var endTs = window.endExclusiveTs;
        var spanTs = Math.max(dayMs, endTs - startTs);

        function percentFor(ts) {
            return ((Number(ts) - startTs) / spanTs) * 100;
        }

        var ticks = [];
        var startDate = new Date(startTs);
        // Start from the month containing the (possibly clamped) left edge so the
        // leading partial month still gets a label instead of an unnamed gap.
        var tickDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
        while (tickDate.getTime() < endTs) {
            var tickTs = tickDate.getTime();
            var tickAtEdge = tickTs < startTs;
            ticks.push({
                ts: tickTs,
                label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][tickDate.getUTCMonth()],
                percent: tickAtEdge ? 0 : percentFor(tickTs),
                edge: tickAtEdge
            });
            tickDate = new Date(Date.UTC(tickDate.getUTCFullYear(), tickDate.getUTCMonth() + 1, 1));
        }
        // A leading partial month narrower than ~5% is just the 3-day padding sliver;
        // labelling it would name a month the track barely shows.
        if (ticks.length && ticks[0].edge && (ticks.length > 1 ? ticks[1].percent : 100) < 5) {
            ticks.shift();
        }

        var items = sourceRows.map(function (row) {
            var itemStartTs = row.startTs != null && isFinite(row.startTs) ? Number(row.startTs) : Number(row.nextTs);
            var itemEndTs = row.endTs != null && isFinite(row.endTs) ? Number(row.endTs) : itemStartTs;
            var isRange = isFinite(itemStartTs) && isFinite(itemEndTs) && itemEndTs > itemStartTs;
            return {
                row: row,
                type: isRange ? 'range' : 'milestone',
                startTs: itemStartTs,
                endTs: itemEndTs,
                startPercent: Math.max(0, Math.min(100, percentFor(itemStartTs))),
                endPercent: Math.max(0, Math.min(100, percentFor(itemEndTs))),
                // The track's left edge can fall inside a range (a window opened in the
                // previous teaching period). The bar then clamps to 0% and would read as
                // though it started at the edge, so flag it for a fade-out left cap.
                continuesBefore: isRange && itemStartTs < startTs
            };
        });

        // Dates where two or more marks converge - a registration window closing on the
        // same day withdrawal falls due, say. Nothing else on the chart relates lanes to
        // each other, so these get a quiet full-height guide.
        var boundaryCounts = Object.create(null);
        items.forEach(function (item) {
            var stamps = item.type === 'range' ? [item.startTs, item.endTs] : [item.startTs];
            stamps.forEach(function (ts) {
                if (!isFinite(ts)) return;
                boundaryCounts[ts] = (boundaryCounts[ts] || 0) + 1;
            });
        });
        var sharedDates = Object.keys(boundaryCounts).filter(function (key) {
            var ts = Number(key);
            // A shared date that lands on a month boundary still needs the guide: the
            // faint month rule says "October", not "two deadlines converge here".
            return boundaryCounts[key] >= 2
                && ts > startTs && ts < endTs
                && ts !== normalizedTodayTs;
        }).map(function (key) {
            return { ts: Number(key), count: boundaryCounts[key], percent: percentFor(Number(key)) };
        });

        return {
            startTs: startTs,
            endTs: endTs,
            todayTs: normalizedTodayTs,
            todayPercent: percentFor(normalizedTodayTs),
            ticks: ticks,
            phases: window.phases.map(function (phase, index) {
                return {
                    label: phase.label,
                    current: index === 0,
                    startPercent: percentFor(phase.startTs),
                    endPercent: percentFor(phase.endExclusiveTs)
                };
            }),
            items: items,
            sharedDates: sharedDates
        };
    }

    function buildDeadlineTimelineLanes(rows) {
        var definitions = [
            { key: 'course-registration', label: 'Course registration', kind: 'course', withdrawal: false },
            { key: 'course-withdrawal', label: 'Course withdrawal', kind: 'course', withdrawal: true },
            { key: 'exam-registration', label: 'Exam registration', kind: 'exam', withdrawal: false },
            { key: 'exam-withdrawal', label: 'Exam withdrawal', kind: 'exam', withdrawal: true }
        ];
        var lanes = definitions.map(function (definition) {
            return { key: definition.key, label: definition.label, rows: [] };
        });
        (Array.isArray(rows) ? rows : []).forEach(function (row) {
            var isWithdrawal = deadlineActionName(row && row.label) === 'Withdrawal';
            var rowKind = row && row.kind === 'exam' ? 'exam' : 'course';
            for (var i = 0; i < definitions.length; i++) {
                if (definitions[i].kind === rowKind && definitions[i].withdrawal === isWithdrawal) {
                    lanes[i].rows.push(row);
                    break;
                }
            }
        });
        return lanes.filter(function (lane) { return lane.rows.length > 0; });
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

    function sortDeadlineLaneRows(rows) {
        return (Array.isArray(rows) ? rows.slice() : []).sort(function (a, b) { return a.nextTs - b.nextTs; });
    }

    function layoutDeadlineTimelineLaneItems(items, maxSlots) {
        var slotCount = Math.max(1, Number(maxSlots) || 4);
        var gap = 0.6;
        var slotEnds = [];
        for (var slotIndex = 0; slotIndex < slotCount; slotIndex++) slotEnds.push(-Infinity);
        var normal = [];
        var overflow = [];
        var sorted = (Array.isArray(items) ? items.slice() : []).sort(function (a, b) {
            return a.startPercent - b.startPercent || a.endPercent - b.endPercent;
        });

        sorted.forEach(function (item) {
            var visualStart = Number(item.startPercent || 0);
            var visualEnd = Math.max(visualStart + 1.2, Number(item.endPercent || visualStart));
            var freeSlot = -1;
            for (var i = 0; i < slotEnds.length; i++) {
                if (visualStart > slotEnds[i] + gap) {
                    freeSlot = i;
                    break;
                }
            }
            if (freeSlot >= 0) {
                slotEnds[freeSlot] = visualEnd;
                normal.push({ aggregate: false, slot: freeSlot, items: [item], startPercent: visualStart, endPercent: visualEnd });
                return;
            }

            var cluster = overflow.length ? overflow[overflow.length - 1] : null;
            if (!cluster || visualStart > cluster.endPercent + gap) {
                cluster = { aggregate: true, slot: slotCount, items: [], startPercent: visualStart, endPercent: visualEnd };
                overflow.push(cluster);
            }
            cluster.items.push(item);
            cluster.endPercent = Math.max(cluster.endPercent, visualEnd);
        });

        return normal.concat(overflow).sort(function (a, b) {
            return a.startPercent - b.startPercent || a.slot - b.slot;
        });
    }

    function buildDeadlineTimelineLaneGeometry(positionedItems) {
        var items = Array.isArray(positionedItems) ? positionedItems : [];
        var highestSlot = items.reduce(function (highest, item) {
            return Math.max(highest, Number(item && item.slot) || 0);
        }, 0);
        var trackCount = highestSlot + 1;
        var height = Math.max(44, 23 + ((trackCount - 1) * 11));
        // Offsets from the track's vertical centre, not absolute tops: the track stretches
        // to whatever height the row ends up at (a three-line status column makes it taller
        // than `height`), so the marks have to stay centred on a height we don't know here.
        var firstOffset = -(((trackCount - 1) * 11) / 2);
        var offsets = [];
        for (var slot = 0; slot < trackCount; slot++) {
            offsets.push(firstOffset + (slot * 11));
        }
        return { trackCount: trackCount, height: height, offsets: offsets };
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
            '/* Hallmark — pre-emit critique: P5 H5 E4 S5 R5 V4 */',
            '/* Hallmark — component: deadline timeline — genre: atmospheric — theme: DTU After Dark',
            ' * states: passive visualization; existing D2L controls retain their interaction states',
            ' * contrast: pass (40–41); mobile: pass (34,49,50–57)',
            ' */',
            '.dtu-deadline-timeline{--deadline-mark:#1565c0;--deadline-status:#1565c0;--deadline-active:#2e7d32;--deadline-today:#a00000;--deadline-grid:rgba(31,41,55,.14);--deadline-month-guide:rgba(31,41,55,.09);--deadline-text:#1f2937;--deadline-muted:#586273;--deadline-surface:#fff;display:block;min-width:0;padding:2px 0 0;container-type:inline-size;}',
            '.dtu-deadline-timeline[data-theme="dark"]{--deadline-mark:#66b3ff;--deadline-status:#66b3ff;--deadline-active:#66bb6a;--deadline-today:#ff6b6b;--deadline-grid:rgba(255,255,255,.11);--deadline-month-guide:rgba(255,255,255,.075);--deadline-text:#e0e0e0;--deadline-muted:#a8adb5;--deadline-surface:#2d2d2d;}',
            '.dtu-deadline-timeline-axis,.dtu-deadline-timeline-lane{display:grid;grid-template-columns:minmax(145px,.42fr) minmax(440px,2.2fr) minmax(130px,.48fr);column-gap:18px;min-width:0;}',
            '.dtu-deadline-timeline-axis{align-items:end;min-height:52px;border-bottom:1px solid var(--deadline-grid);}',
            '.dtu-deadline-timeline-axis-title{align-self:start;padding:1px 0 0;font-size:10px;font-weight:600;color:var(--deadline-muted);}',
            '.dtu-deadline-timeline-legend{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:0 0 7px;color:var(--deadline-muted);font-size:9px;font-weight:600;line-height:12px;white-space:nowrap;}',
            '.dtu-deadline-timeline-legend-item{display:inline-flex;align-items:center;gap:4px;}',
            '.dtu-deadline-timeline-legend-swatch{display:inline-block;width:12px;height:3px;background:var(--deadline-mark);}',
            '.dtu-deadline-timeline-legend-swatch.is-active{background:var(--deadline-active);}',
            '.dtu-deadline-timeline-legend-swatch.is-date{width:4px;height:11px;border-radius:1px;}',
            '.dtu-deadline-timeline-track{position:relative;min-width:0;}',
            '.dtu-deadline-timeline-axis .dtu-deadline-timeline-track{height:51px;}',
            '.dtu-deadline-timeline-phase{position:absolute;top:0;height:15px;overflow:hidden;color:var(--deadline-muted);font-size:9px;font-weight:600;line-height:13px;text-align:left;white-space:nowrap;box-sizing:border-box;pointer-events:none;padding-left:5px;}',
            '.dtu-deadline-timeline-phase.is-current{border-right:1px dotted var(--deadline-month-guide);color:var(--deadline-text);font-weight:700;}',
            '.dtu-deadline-timeline-tick{position:absolute;top:0;bottom:0;width:1px;background:var(--deadline-month-guide);pointer-events:none;}',
            '.dtu-deadline-timeline-keydate{position:absolute;top:0;bottom:0;z-index:1;width:1px;background:repeating-linear-gradient(180deg,var(--deadline-grid) 0 3px,transparent 3px 7px);pointer-events:none;}',
            '.dtu-deadline-timeline-axis .dtu-deadline-timeline-keydate{top:30px;}',
            '.dtu-deadline-timeline-axis .dtu-deadline-timeline-tick{top:30px;}',
            '.dtu-deadline-timeline-tick-label{position:absolute;top:34px;transform:translateX(-50%);font-size:10px;line-height:14px;color:var(--deadline-muted);white-space:nowrap;}',
            '.dtu-deadline-timeline-tick-label.align-start{transform:none;}',
            '.dtu-deadline-timeline-today{position:absolute;top:0;bottom:0;z-index:4;width:2px;background:var(--deadline-today);pointer-events:none;}',
            '.dtu-deadline-timeline-axis .dtu-deadline-timeline-today{top:30px;bottom:-1px;}',
            '.dtu-deadline-timeline-today-label{position:absolute;top:16px;z-index:5;transform:translateX(calc(-100% - 5px));font-size:10px;font-weight:800;line-height:14px;color:var(--deadline-today);white-space:nowrap;}',
            '.dtu-deadline-timeline-today-label.align-start{transform:translateX(5px);}',
            '.dtu-deadline-timeline-lane{align-items:center;min-height:44px;border-bottom:1px solid var(--deadline-grid);}',
            '.dtu-deadline-timeline-lane:last-child{border-bottom:0;}',
            '.dtu-deadline-timeline-label{min-width:0;padding:8px 0;}',
            '.dtu-deadline-timeline-name{font-size:12px;font-weight:650;line-height:16px;color:var(--deadline-text);overflow-wrap:anywhere;}',
            '.dtu-deadline-timeline-explained{position:relative;display:inline-block;cursor:help;text-decoration:underline dotted var(--deadline-muted);text-underline-offset:3px;}',
            '.dtu-deadline-timeline-explained:focus-visible{outline:2px solid var(--deadline-text);outline-offset:3px;}',
            '.dtu-deadline-timeline-explained:hover>.dtu-deadline-mark-tooltip,.dtu-deadline-timeline-explained:focus>.dtu-deadline-mark-tooltip{display:block;}',
            '.dtu-deadline-timeline-explained>.dtu-deadline-mark-tooltip .dtu-deadline-mark-tooltip-period{margin-top:3px;font-weight:500;}',
            '.dtu-deadline-timeline-period{margin-top:2px;font-size:10px;line-height:13px;color:var(--deadline-muted);overflow-wrap:anywhere;}',
            '.dtu-deadline-timeline-lane .dtu-deadline-timeline-track{align-self:stretch;min-height:44px;}',
            '.dtu-deadline-timeline-lane .dtu-deadline-timeline-today,.dtu-deadline-timeline-lane .dtu-deadline-timeline-tick,.dtu-deadline-timeline-lane .dtu-deadline-timeline-keydate{bottom:-1px;}',
            '.dtu-deadline-timeline-bar{position:absolute;height:6px;min-width:4px;border-radius:1px;background:var(--deadline-mark);cursor:help;transform:translateY(-50%);}',
            '.dtu-deadline-timeline-bar.is-active{background:var(--deadline-active);}',
            '.dtu-deadline-timeline-bar.is-clipped-start{background:linear-gradient(90deg,transparent 0,var(--deadline-mark) 9px);}',
            '.dtu-deadline-timeline-bar.is-active.is-clipped-start{background:linear-gradient(90deg,transparent 0,var(--deadline-active) 9px);}',
            '.dtu-deadline-timeline-date-mark{position:absolute;width:4px;height:15px;border-radius:1px;box-shadow:0 0 0 1px var(--deadline-surface);background:var(--deadline-mark);cursor:help;transform:translate(-50%,-50%);}',
            '.dtu-deadline-timeline-aggregate{position:absolute;min-width:18px;height:15px;padding:0 4px;transform:translate(-50%,-50%);border:1px solid var(--deadline-mark);border-radius:1px;background:var(--deadline-surface);color:var(--deadline-status);font-size:9px;font-weight:700;line-height:13px;text-align:center;cursor:help;box-sizing:border-box;}',
            '.dtu-deadline-timeline-bar::after,.dtu-deadline-timeline-date-mark::after,.dtu-deadline-timeline-aggregate::after{content:"";position:absolute;background:transparent;}',
            '.dtu-deadline-timeline-bar::after{inset:-9px -10px;}',
            '.dtu-deadline-timeline-date-mark::after{inset:-5px -11px;}',
            '.dtu-deadline-timeline-aggregate::after{inset:-5px -3px;}',
            '.dtu-deadline-timeline-aggregate.is-active{border-color:var(--deadline-active);color:var(--deadline-active);}',
            '.dtu-deadline-timeline-aggregate.is-mixed{border-color:var(--deadline-muted);background:linear-gradient(90deg,var(--deadline-active) 0 50%,var(--deadline-mark) 50% 100%);color:var(--deadline-surface);}',
            '.dtu-deadline-timeline-bar:focus-visible,.dtu-deadline-timeline-date-mark:focus-visible,.dtu-deadline-timeline-aggregate:focus-visible{outline:2px solid var(--deadline-text);outline-offset:3px;}',
            '.dtu-deadline-timeline-bar:hover,.dtu-deadline-timeline-bar:focus,.dtu-deadline-timeline-date-mark:hover,.dtu-deadline-timeline-date-mark:focus,.dtu-deadline-timeline-aggregate:hover,.dtu-deadline-timeline-aggregate:focus{z-index:30;}',
            '.dtu-deadline-mark-tooltip{display:none;position:absolute;left:50%;bottom:calc(100% + 7px);z-index:40;width:max-content;max-width:min(280px,50vw);padding:8px 10px;border:1px solid var(--deadline-grid);border-radius:3px;background:var(--deadline-surface);color:var(--deadline-text);box-shadow:0 4px 14px rgba(0,0,0,.22);font-size:10px;font-weight:500;line-height:14px;text-align:left;white-space:normal;pointer-events:auto;transform:translateX(-50%);}',
            '.dtu-deadline-mark-tooltip-title{display:block;font-size:11px;font-weight:700;line-height:15px;color:var(--deadline-text);}',
            '.dtu-deadline-mark-tooltip-description{display:block;margin-top:3px;color:var(--deadline-text);}',
            '.dtu-deadline-mark-tooltip-item{display:block;margin-top:6px;padding-top:5px;border-top:1px solid var(--deadline-grid);}',
            '.dtu-deadline-mark-tooltip-item-title{display:block;font-weight:700;color:var(--deadline-text);}',
            '.dtu-deadline-mark-tooltip-period{display:block;margin-top:3px;color:var(--deadline-muted);}',
            '.dtu-deadline-mark-tooltip-date{display:block;margin-top:1px;color:var(--deadline-text);font-variant-numeric:tabular-nums;}',
            '.dtu-deadline-timeline-bar:hover>.dtu-deadline-mark-tooltip,.dtu-deadline-timeline-bar:focus>.dtu-deadline-mark-tooltip,.dtu-deadline-timeline-date-mark:hover>.dtu-deadline-mark-tooltip,.dtu-deadline-timeline-date-mark:focus>.dtu-deadline-mark-tooltip,.dtu-deadline-timeline-aggregate:hover>.dtu-deadline-mark-tooltip,.dtu-deadline-timeline-aggregate:focus>.dtu-deadline-mark-tooltip{display:block;}',
            '.tooltip-align-start>.dtu-deadline-mark-tooltip{left:0;transform:none;}',
            '.tooltip-align-end>.dtu-deadline-mark-tooltip{right:0;left:auto;transform:none;}',
            '.dtu-deadline-timeline-status{padding:8px 0;text-align:right;min-width:0;}',
            '.dtu-deadline-timeline-status-text{font-size:11px;font-weight:700;line-height:15px;color:var(--deadline-status);}',
            '.dtu-deadline-timeline-status-text.is-active{color:var(--deadline-active);}',
            '.dtu-deadline-timeline-date{margin-top:2px;font-size:10px;line-height:13px;color:var(--deadline-muted);}',
            '.dtu-deadline-mobile-list{display:none;}',
            '.dtu-deadline-mobile-window{display:none;color:var(--deadline-text);font-size:11px;font-weight:700;line-height:15px;}',
            '.dtu-deadline-mobile-legend{display:none;}',
            '.dtu-deadline-mobile-lane{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;min-height:48px;padding:7px 0;border-bottom:1px solid var(--deadline-grid);}',
            '.dtu-deadline-mobile-lane:last-child{border-bottom:0;}',
            '.dtu-deadline-mobile-name{font-size:12px;font-weight:650;line-height:16px;color:var(--deadline-text);}',
            '.dtu-deadline-mobile-detail{margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;line-height:13px;color:var(--deadline-muted);}',
            '.dtu-deadline-mobile-status{text-align:right;white-space:nowrap;}',
            '.dtu-deadline-a11y-list{display:block;position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0;}',
            '@container(max-width:800px){.dtu-deadline-timeline-desktop{display:none;}.dtu-deadline-mobile-window{display:block;padding:4px 0 0;}.dtu-deadline-mobile-legend{display:flex;padding:2px 0 6px;justify-content:flex-start;}.dtu-deadline-mobile-list{display:block;}}',
            '@media(max-width:820px){.dtu-deadline-timeline-desktop{display:none;}.dtu-deadline-mobile-window{display:block;padding:4px 0 0;}.dtu-deadline-mobile-legend{display:flex;padding:2px 0 6px;justify-content:flex-start;}.dtu-deadline-mobile-list{display:block;}}'
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

    function appendDeadlineTimelineGuides(track, model, includeLabels) {
        if (includeLabels) {
            model.phases.forEach(function (phase) {
                // The left edge is content-anchored, so the current phase can start off-track.
                var phaseStart = Math.max(0, Math.min(100, Number(phase.startPercent) || 0));
                var phaseEnd = Math.max(0, Math.min(100, Number(phase.endPercent) || 0));
                if (phaseEnd - phaseStart <= 0) return;
                var phaseElement = createTimelinePositionedElement('dtu-deadline-timeline-phase' + (phase.current ? ' is-current' : ''), phaseStart);
                phaseElement.style.width = (phaseEnd - phaseStart) + '%';
                phaseElement.textContent = phase.label;
                track.appendChild(phaseElement);
            });
        }
        (model.sharedDates || []).forEach(function (shared) {
            track.appendChild(createTimelinePositionedElement('dtu-deadline-timeline-keydate', shared.percent));
        });
        model.ticks.forEach(function (tick) {
            // An edge tick sits on the track border; its rule would double the border.
            if (!tick.edge) track.appendChild(createTimelinePositionedElement('dtu-deadline-timeline-tick', tick.percent));
            if (includeLabels) {
                var tickLabel = createTimelinePositionedElement('dtu-deadline-timeline-tick-label' + (tick.edge ? ' align-start' : ''), tick.percent);
                tickLabel.textContent = tick.label;
                track.appendChild(tickLabel);
            }
        });
        track.appendChild(createTimelinePositionedElement('dtu-deadline-timeline-today', model.todayPercent));
        if (includeLabels) {
            var todayLabel = createTimelinePositionedElement('dtu-deadline-timeline-today-label', model.todayPercent);
            var todayDate = new Date(model.todayTs);
            var todayMonth = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][todayDate.getUTCMonth()];
            todayLabel.textContent = 'Today, ' + todayDate.getUTCDate() + ' ' + todayMonth;
            if (model.todayPercent < 12) todayLabel.className += ' align-start';
            track.appendChild(todayLabel);
        }
    }

    function createDeadlineTimelineLegend(extraClassName) {
        var legend = document.createElement('div');
        markExt(legend);
        legend.className = 'dtu-deadline-timeline-legend' + (extraClassName ? (' ' + extraClassName) : '');
        legend.setAttribute('aria-label', 'Green marks are open now. Blue marks are upcoming. Narrow upright marks are single dates rather than periods.');

        [['is-active', 'Open now'], ['', 'Upcoming'], ['is-date', 'Single date']].forEach(function (definition) {
            var item = document.createElement('span');
            markExt(item);
            item.className = 'dtu-deadline-timeline-legend-item';
            var swatch = document.createElement('span');
            markExt(swatch);
            swatch.className = 'dtu-deadline-timeline-legend-swatch' + (definition[0] ? (' ' + definition[0]) : '');
            swatch.setAttribute('aria-hidden', 'true');
            var text = document.createElement('span');
            markExt(text);
            text.textContent = definition[1];
            item.appendChild(swatch);
            item.appendChild(text);
            legend.appendChild(item);
        });
        return legend;
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

    var _deadlineExplainerSeq = 0;

    // Wraps the lane's name in a hoverable/focusable span carrying the period explainer,
    // reusing the mark-tooltip shell so both surfaces look and behave the same.
    function appendDeadlineLaneName(container, laneLabel, explainers) {
        if (!explainers || !explainers.length) {
            container.textContent = laneLabel;
            return;
        }

        var trigger = document.createElement('span');
        markExt(trigger);
        trigger.className = 'dtu-deadline-timeline-explained tooltip-align-start';
        trigger.setAttribute('tabindex', '0');
        trigger.textContent = laneLabel;

        var tooltip = document.createElement('span');
        markExt(tooltip);
        tooltip.className = 'dtu-deadline-mark-tooltip';
        tooltip.setAttribute('role', 'tooltip');
        _deadlineExplainerSeq++;
        tooltip.id = 'dtu-deadline-explainer-' + _deadlineExplainerSeq;

        explainers.forEach(function (explainer) {
            var title = document.createElement('span');
            markExt(title);
            title.className = 'dtu-deadline-mark-tooltip-title';
            title.textContent = explainer.title;
            var body = document.createElement('span');
            markExt(body);
            body.className = 'dtu-deadline-mark-tooltip-period';
            body.textContent = explainer.text;
            tooltip.appendChild(title);
            tooltip.appendChild(body);
        });

        trigger.setAttribute('aria-describedby', tooltip.id);
        trigger.appendChild(tooltip);
        container.appendChild(trigger);
    }

    function createDeadlineLaneMobileRow(lane, todayTs) {
        var laneRows = sortDeadlineLaneRows(lane.rows);
        var nextRow = laneRows[0];
        var chipInfo = formatDeadlineChip(nextRow, todayTs);
        var row = document.createElement('div');
        markExt(row);
        row.className = 'dtu-deadline-mobile-lane';

        var copy = document.createElement('div');
        markExt(copy);
        copy.style.minWidth = '0';
        var name = document.createElement('div');
        markExt(name);
        name.className = 'dtu-deadline-mobile-name';
        appendDeadlineLaneName(name, lane.label, getDeadlineLaneExplainers(lane.rows));
        var detail = document.createElement('div');
        markExt(detail);
        detail.className = 'dtu-deadline-mobile-detail';
        detail.textContent = nextRow.label || '';
        detail.title = detail.textContent;
        copy.appendChild(name);
        copy.appendChild(detail);

        var status = document.createElement('div');
        markExt(status);
        status.className = 'dtu-deadline-mobile-status';
        var statusText = document.createElement('div');
        markExt(statusText);
        statusText.className = 'dtu-deadline-timeline-status-text' + (nextRow.state === 'active' ? ' is-active' : '');
        statusText.textContent = chipInfo.text || '';
        var date = document.createElement('div');
        markExt(date);
        date.className = 'dtu-deadline-timeline-date';
        date.textContent = formatDeadlineRangeCompact(nextRow) || '';
        status.appendChild(statusText);
        status.appendChild(date);
        row.appendChild(copy);
        row.appendChild(status);
        return row;
    }

    function createDeadlinesTimeline(rows, todayTs) {
        var visibleRows = selectDeadlineTimelinePhaseWindow(rows, todayTs);
        var model = buildDeadlineTimelineModel(visibleRows, todayTs);
        var phaseNames = model.phases.map(function (phase) { return phase.label; });
        var root = document.createElement('div');
        markExt(root);
        root.className = 'dtu-deadline-timeline';
        root.setAttribute('data-theme', isDarkMode() ? 'dark' : 'light');
        root.setAttribute('role', 'group');
        root.setAttribute('aria-label', 'Timeline of course and exam deadlines for ' + phaseNames.join(' and '));

        var desktop = document.createElement('div');
        markExt(desktop);
        desktop.className = 'dtu-deadline-timeline-desktop';

        var axis = document.createElement('div');
        markExt(axis);
        axis.className = 'dtu-deadline-timeline-axis';
        var axisTitle = document.createElement('div');
        markExt(axisTitle);
        axisTitle.className = 'dtu-deadline-timeline-axis-title';
        axisTitle.textContent = 'Academic periods';
        var axisTrack = document.createElement('div');
        markExt(axisTrack);
        axisTrack.className = 'dtu-deadline-timeline-track';
        appendDeadlineTimelineGuides(axisTrack, model, true);
        var axisEnd = document.createElement('div');
        markExt(axisEnd);
        axisEnd.appendChild(createDeadlineTimelineLegend());
        axis.appendChild(axisTitle);
        axis.appendChild(axisTrack);
        axis.appendChild(axisEnd);
        desktop.appendChild(axis);

        buildDeadlineTimelineLanes(visibleRows).forEach(function (lane) {
            var laneElement = document.createElement('div');
            markExt(laneElement);
            laneElement.className = 'dtu-deadline-timeline-lane';

            var label = document.createElement('div');
            markExt(label);
            label.className = 'dtu-deadline-timeline-label';
            var name = document.createElement('div');
            markExt(name);
            name.className = 'dtu-deadline-timeline-name';
            appendDeadlineLaneName(name, lane.label, getDeadlineLaneExplainers(lane.rows));
            label.appendChild(name);

            var track = document.createElement('div');
            markExt(track);
            track.className = 'dtu-deadline-timeline-track';
            track.setAttribute('aria-label', lane.label + ', ' + lane.rows.length + (lane.rows.length === 1 ? ' deadline' : ' deadlines'));
            appendDeadlineTimelineGuides(track, model, false);

            var laneItems = model.items.filter(function (item) { return lane.rows.indexOf(item.row) >= 0; });
            var positionedItems = layoutDeadlineTimelineLaneItems(laneItems, 4);
            var geometry = buildDeadlineTimelineLaneGeometry(positionedItems);
            laneElement.style.minHeight = geometry.height + 'px';
            // Stretch rather than fix, so the Today rule and month guides inside the track
            // run the full height of the row and join up across lane boundaries.
            track.style.minHeight = geometry.height + 'px';
            positionedItems.forEach(function (positioned) {
                var top = 'calc(50% + ' + geometry.offsets[positioned.slot] + 'px)';
                if (positioned.aggregate) {
                    var aggregate = createTimelinePositionedElement('dtu-deadline-timeline-aggregate', positioned.startPercent);
                    var aggregateItems = positioned.items.map(function (entry) {
                        return deadlineTimelineTooltipContent(entry.row);
                    });
                    var activeCount = positioned.items.filter(function (entry) {
                        return entry.row && entry.row.state === 'active';
                    }).length;
                    var aggregateState = activeCount === positioned.items.length
                        ? 'open now'
                        : (activeCount > 0 ? 'open now and upcoming' : 'upcoming');
                    if (activeCount === positioned.items.length) aggregate.className += ' is-active';
                    if (activeCount > 0 && activeCount < positioned.items.length) aggregate.className += ' is-mixed';
                    aggregate.style.top = top;
                    aggregate.textContent = '+' + positioned.items.length;
                    attachDeadlineMarkTooltip(
                        aggregate,
                        {
                            title: positioned.items.length + ' overlapping ' + aggregateState + ' deadlines',
                            items: aggregateItems
                        },
                        positioned.startPercent
                    );
                    track.appendChild(aggregate);
                    return;
                }

                var item = positioned.items[0];
                var row = item.row;
                var mark;
                if (item.type === 'range') {
                    mark = createTimelinePositionedElement('dtu-deadline-timeline-bar', item.startPercent);
                    mark.style.width = Math.max(0.7, item.endPercent - item.startPercent) + '%';
                    if (row.state === 'active') mark.className += ' is-active';
                    if (item.continuesBefore) {
                        mark.className += ' is-clipped-start';
                        mark.style.webkitMaskImage = 'none';
                        mark.style.maskImage = 'none';
                    }
                } else {
                    mark = createTimelinePositionedElement('dtu-deadline-timeline-date-mark', item.startPercent);
                }
                mark.style.top = top;
                var tooltipContent = deadlineTimelineTooltipContent(row);
                attachDeadlineMarkTooltip(mark, tooltipContent, item.startPercent);
                track.appendChild(mark);
            });

            var laneRows = sortDeadlineLaneRows(lane.rows);
            var nextRow = laneRows[0];
            var chipInfo = formatDeadlineChip(nextRow, todayTs);
            var status = document.createElement('div');
            markExt(status);
            status.className = 'dtu-deadline-timeline-status';
            var statusText = document.createElement('div');
            markExt(statusText);
            statusText.className = 'dtu-deadline-timeline-status-text' + (nextRow.state === 'active' ? ' is-active' : '');
            statusText.textContent = chipInfo.text || '';
            var date = document.createElement('div');
            markExt(date);
            date.className = 'dtu-deadline-timeline-date';
            date.textContent = formatDeadlineRangeCompact(nextRow) || '';
            status.appendChild(statusText);
            status.appendChild(date);
            laneElement.appendChild(label);
            laneElement.appendChild(track);
            laneElement.appendChild(status);
            desktop.appendChild(laneElement);
        });

        var mobile = document.createElement('div');
        markExt(mobile);
        mobile.className = 'dtu-deadline-mobile-list';
        buildDeadlineTimelineLanes(visibleRows).forEach(function (lane) {
            mobile.appendChild(createDeadlineLaneMobileRow(lane, todayTs));
        });
        var accessibleList = document.createElement('ul');
        markExt(accessibleList);
        accessibleList.className = 'dtu-deadline-a11y-list';
        accessibleList.setAttribute('aria-label', 'All upcoming course and exam deadlines');
        visibleRows.forEach(function (row) {
            var item = document.createElement('li');
            markExt(item);
            item.textContent = deadlineTimelineAccessibleLabel(row);
            accessibleList.appendChild(item);
        });
        root.appendChild(desktop);
        var mobileWindow = document.createElement('div');
        markExt(mobileWindow);
        mobileWindow.className = 'dtu-deadline-mobile-window';
        mobileWindow.textContent = phaseNames.join(' + ');
        root.appendChild(mobileWindow);
        root.appendChild(createDeadlineTimelineLegend('dtu-deadline-mobile-legend'));
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

    function renderDeadlinesHomepageWidget(widget) {
        if (!widget) return;
        ensureDeadlinesTimelineStyles();

        var summary = widget.querySelector('[data-dtu-deadlines-summary]');
        var next = widget.querySelector('[data-dtu-deadlines-next]');
        var more = widget.querySelector('[data-dtu-deadlines-more]');
        var footer = widget.querySelector('[data-dtu-deadlines-footer]');
        var meta = widget.querySelector('[data-dtu-deadlines-meta]');
        var chevronBtn = widget.querySelector('[data-dtu-deadlines-chevron]');
        var refreshBtn = widget.querySelector('[data-dtu-deadlines-refresh]');
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

        function clear(el) {
            if (!el) return;
            while (el.firstChild) el.removeChild(el.firstChild);
        }
        clear(next);
        clear(more);

        var expandedWanted = localStorage.getItem(DEADLINES_EXPANDED_KEY) !== 'false';
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
            loading.textContent = 'Loading deadlines...';
            loading.style.cssText = 'font-size: 13px; color: ' + (isDarkMode() ? '#b0b0b0' : '#6b7280') + ';';
            if (next) next.appendChild(loading);

            if (!_deadlinesFetchInProgress) {
                requestStudentDeadlines(false, function () { renderDeadlinesHomepageWidget(widget); });
            }

            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.style.opacity = '0.7';
            }
            return;
        }

        var phaseWindow = buildDeadlineTimelinePhaseWindow(todayTs);
        var rows = selectDeadlineTimelinePhaseWindow(buildTopDeadlines(resp, todayTs, Infinity), todayTs);
        if (!rows.length) {
            if (summary) summary.textContent = 'None';
            var empty = document.createElement('div');
            markExt(empty);
            var horizonTs = getDeadlineDataHorizonTs(resp);
            var exhausted = horizonTs != null && todayTs > horizonTs;
            empty.textContent = exhausted
                ? ('Cached deadlines stop at ' + formatDeadlineTsShort(horizonTs) + '. Refresh to load newer dates.')
                : ('No deadlines found for ' + phaseWindow.phases.map(function (phase) { return phase.label; }).join(' or ') + '.');
            empty.style.cssText = 'font-size: 13px; color: ' + (isDarkMode() ? '#b0b0b0' : '#6b7280') + '; font-style: italic;';
            if (next) next.appendChild(empty);
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.style.opacity = '1';
            }
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

        var now = Date.now();
        var fetchedAt = (resp && typeof resp.fetchedAt === 'number') ? resp.fetchedAt : 0;
        var horizonTs = getDeadlineDataHorizonTs(resp);
        // Running out of published dates is the reason that actually matters; age is the
        // long-stop for a date DTU has since amended.
        var runningOut = horizonTs == null || (horizonTs - todayTs) < DEADLINES_HORIZON_REFRESH_MS;
        var stale = !fetchedAt || (now - fetchedAt) > DEADLINES_CACHE_TTL_MS;
        if ((runningOut || stale) && !_deadlinesFetchInProgress) {
            requestStudentDeadlines(false, function () { renderDeadlinesHomepageWidget(widget); });
        }

        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.style.opacity = '1';
        }
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
        var resting = isDarkMode() ? '#888' : '#9ca3af';
        var raised = isDarkMode() ? '#c8c8c8' : '#4b5563';
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
            footer.style.cssText = 'display: none; align-items: center; justify-content: space-between; gap: 6px; margin-top: 8px; padding-top: 8px; '
                + 'border-top: 1px solid ' + (isDarkMode() ? '#333' : '#e5e7eb') + ';';

            var footerLeft = document.createElement('div');
            markExt(footerLeft);
            footerLeft.style.cssText = 'display: flex; align-items: center; gap: 6px;';

            var meta = document.createElement('div');
            markExt(meta);
            meta.setAttribute('data-dtu-deadlines-meta', '1');
            meta.style.cssText = 'font-size: 10px; color: ' + (isDarkMode() ? '#666' : '#9ca3af') + ';';

            var refreshBtn = document.createElement('button');
            refreshBtn.type = 'button';
            markExt(refreshBtn);
            refreshBtn.setAttribute('data-dtu-deadlines-refresh', '1');
            refreshBtn.setAttribute('aria-label', 'Refresh deadlines');
            refreshBtn.setAttribute('title', 'Refresh deadlines');
            refreshBtn.textContent = '\u21bb';
            refreshBtn.style.cssText = 'border: none; background: transparent; cursor: pointer; font-size: 14px; line-height: 1; padding: 2px; border-radius: 4px; color: '
                + (isDarkMode() ? '#888' : '#9ca3af') + ';';
            refreshBtn.style.setProperty('background', 'transparent', 'important');
            refreshBtn.style.setProperty('color', isDarkMode() ? '#888' : '#9ca3af', 'important');
            refreshBtn.style.setProperty('border', 'none', 'important');
            refreshBtn.addEventListener('mouseenter', function () {
                refreshBtn.style.setProperty('color', isDarkMode() ? '#ccc' : '#555', 'important');
            });
            refreshBtn.addEventListener('mouseleave', function () {
                refreshBtn.style.setProperty('color', isDarkMode() ? '#888' : '#9ca3af', 'important');
            });
            refreshBtn.addEventListener('click', function () {
                refreshBtn.disabled = true;
                refreshBtn.style.opacity = '0.5';
                requestStudentDeadlines(true, function () { renderDeadlinesHomepageWidget(widget); });
            });

            footerLeft.appendChild(meta);
            footerLeft.appendChild(refreshBtn);

            var sources = document.createElement('div');
            markExt(sources);
            sources.setAttribute('data-dtu-deadlines-sources', '1');
            sources.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 10px;';

            var sourcesLabel = document.createElement('span');
            markExt(sourcesLabel);
            sourcesLabel.textContent = 'Sources:';
            sourcesLabel.style.cssText = 'color: ' + (isDarkMode() ? '#666' : '#9ca3af') + ';';

            var courseA = createDeadlineSourceLink('Course', 'course');

            var sep = document.createElement('span');
            markExt(sep);
            sep.textContent = '/';
            sep.style.cssText = 'color: ' + (isDarkMode() ? '#555' : '#d1d5db') + ';';

            var examA = createDeadlineSourceLink('Exam', 'exam');

            sources.appendChild(sourcesLabel);
            sources.appendChild(courseA);
            sources.appendChild(sep);
            sources.appendChild(examA);

            footer.appendChild(footerLeft);
            footer.appendChild(sources);

            var disclaimer = document.createElement('div');
            markExt(disclaimer);
            disclaimer.textContent = 'Please double-check dates on the official DTU student pages.';
            disclaimer.style.cssText = 'font-size: 10px; font-style: italic; line-height: 14px; color: '
                + (isDarkMode() ? '#555' : '#b0b0b0') + '; margin-top: 6px;';

            padding.appendChild(next);
            padding.appendChild(more);
            padding.appendChild(footer);
            padding.appendChild(disclaimer);
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
