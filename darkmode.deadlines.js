(function () {
    'use strict';

    var DEADLINES_CACHE_KEY = 'dtuDarkModeDeadlinesCacheV1';
    var DEADLINES_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
    var DEADLINES_EXPANDED_KEY = 'dtuDarkModeDeadlinesExpanded';
    var ATOMIC_SEARCH_HIDDEN_ATTR = 'data-dtu-atomic-search-hidden';
    var ATOMIC_SEARCH_HIDDEN_STYLE_ATTR = 'data-dtu-atomic-search-prev-style';
    var ATOMIC_SEARCH_NAV_HIDDEN_ATTR = 'data-dtu-atomic-search-nav-hidden';
    var ATOMIC_SEARCH_NAV_HIDDEN_STYLE_ATTR = 'data-dtu-atomic-search-nav-prev-style';
    var DTU_HOMEPAGE_COL3_STYLE_ID = 'dtu-after-dark-homepage-col3-wide';

    var _deadlinesFetchInProgress = false;
    var _deadlinesLastResponse = null;
    var _deadlinesLastRequestAt = 0;
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
            var period = String(group && group.heading || '');
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
                try {
                    localStorage.setItem(DEADLINES_CACHE_KEY, JSON.stringify(response));
                } catch (e) {
                }
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
        return deduped.slice(0, (typeof limit === 'number' && limit > 0) ? limit : 3);
    }

    function deadlineOneLineHint(kind, label) {
        var lower = String(label || '').toLowerCase();
        var exam = kind === 'exam';
        var course = kind === 'course';

        if (/(withdrawal|withdraw|deregister|de-?register)/.test(lower)) {
            return exam ? 'Withdraw from the exam before this deadline.' : 'Withdraw from courses before this deadline.';
        }
        if (/supplementary/.test(lower)) {
            return course ? 'Register for courses with vacant seats.' : 'Late changes may be possible in this period.';
        }
        if (/registration/.test(lower)) {
            return exam ? 'Register for the exam before this deadline.' : 'Register for courses before this deadline.';
        }
        if (/grading/.test(lower)) {
            return 'Grades should be published by this deadline.';
        }
        return exam ? 'Check exam registration/withdrawal rules.' : 'Check course registration rules.';
    }

    function formatDeadlineChip(row, todayTs) {
        var nextTs = getDeadlineNextTs(row, todayTs);
        var days = (nextTs == null) ? null : diffDaysUtc(todayTs, nextTs);
        var active = row && row.state === 'active';

        var text = '';
        if (days === 0) {
            text = active ? 'Ends today' : 'Today';
        } else if (days != null) {
            text = active ? (days + 'd left') : ('In ' + days + 'd');
        }

        var color = active
            ? (isDarkMode() ? '#66bb6a' : '#2e7d32')
            : (days != null && days <= 7
                ? (isDarkMode() ? '#ffa726' : '#e65100')
                : (isDarkMode() ? '#66b3ff' : '#1565c0'));

        return { text: text, color: color, days: days };
    }

    function createDeadlinesHomeRow(row, todayTs, includePeriod) {
        var chipInfo = formatDeadlineChip(row, todayTs);
        var active = row && row.state === 'active';

        var borderColor = active
            ? (isDarkMode() ? '#66bb6a' : '#2e7d32')
            : (isDarkMode() ? '#66b3ff' : '#1565c0');

        var card = document.createElement('div');
        markExt(card);
        card.style.cssText = 'display: grid; grid-template-columns: 4px 1fr auto; gap: 0; padding: 10px 0; min-width: 0;';

        var strip = document.createElement('div');
        markExt(strip);
        strip.style.cssText = 'border-radius: 2px; background: ' + borderColor + ';';

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
        dates.style.cssText = 'font-size: 11px; color: ' + (isDarkMode() ? '#8a8a8a' : '#9ca3af') + '; '
            + 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        if (!range) dates.style.display = 'none';

        var rawHint = deadlineOneLineHint(row.kind, row.label) || '';
        var hintText = rawHint.replace(/\.\s*$/, '').trim();
        var hint = document.createElement('div');
        markExt(hint);
        hint.textContent = hintText || '';
        hint.title = hintText || '';
        hint.style.cssText = 'font-size: 11px; line-height: 15px; color: ' + (isDarkMode() ? '#707070' : '#b0b0b0') + '; margin-top: 1px;';
        if (!hintText) hint.style.display = 'none';

        center.appendChild(title);
        center.appendChild(dates);
        center.appendChild(hint);

        if (includePeriod && row.period) {
            var period = document.createElement('div');
            markExt(period);
            period.textContent = row.period;
            period.style.cssText = 'font-size: 10px; color: ' + (isDarkMode() ? '#707070' : '#b0b0b0') + '; margin-top: 1px;';
            center.appendChild(period);
        }

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

        card.appendChild(strip);
        card.appendChild(center);
        card.appendChild(badge);

        return card;
    }

    function renderDeadlinesHomepageWidget(widget) {
        if (!widget) return;

        var summary = widget.querySelector('[data-dtu-deadlines-summary]');
        var next = widget.querySelector('[data-dtu-deadlines-next]');
        var more = widget.querySelector('[data-dtu-deadlines-more]');
        var footer = widget.querySelector('[data-dtu-deadlines-footer]');
        var meta = widget.querySelector('[data-dtu-deadlines-meta]');
        var chevronBtn = widget.querySelector('[data-dtu-deadlines-chevron]');
        var refreshBtn = widget.querySelector('[data-dtu-deadlines-refresh]');
        var sources = widget.querySelector('[data-dtu-deadlines-sources]');

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

        var expandedWanted = localStorage.getItem(DEADLINES_EXPANDED_KEY) === 'true';
        if (chevronBtn) {
            chevronBtn.setAttribute('icon', expandedWanted ? 'tier1:chevron-up' : 'tier1:chevron-down');
            chevronBtn.setAttribute('expanded', expandedWanted ? 'true' : 'false');
            chevronBtn.setAttribute('text', expandedWanted ? 'Show fewer deadlines' : 'Show more deadlines');
            chevronBtn.setAttribute('aria-expanded', expandedWanted ? 'true' : 'false');
            chevronBtn.style.display = '';
        }
        if (more) more.style.display = expandedWanted ? 'block' : 'none';
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

        var rows = buildTopDeadlines(resp, todayTs, 3);
        if (!rows.length) {
            if (summary) summary.textContent = 'None';
            var empty = document.createElement('div');
            markExt(empty);
            empty.textContent = 'No upcoming deadlines found.';
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

        var compactCount = 1;
        try {
            if (rows.length > 1) {
                for (var i = 1; i < rows.length; i++) {
                    var otherDays = diffDaysUtc(todayTs, rows[i].nextTs);
                    if (otherDays === days) compactCount++;
                    else break;
                }
            }
        } catch (eCompact) {
            compactCount = 1;
        }

        var hasMore = rows.length > compactCount;
        var expanded = expandedWanted && hasMore;
        if (chevronBtn) {
            chevronBtn.style.display = hasMore ? '' : 'none';
            chevronBtn.setAttribute('icon', expanded ? 'tier1:chevron-up' : 'tier1:chevron-down');
            chevronBtn.setAttribute('expanded', expanded ? 'true' : 'false');
            chevronBtn.setAttribute('text', expanded ? 'Show fewer deadlines' : 'Show more deadlines');
            chevronBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        }
        if (more) more.style.display = expanded ? 'block' : 'none';

        if (next) {
            for (var nextIndex = 0; nextIndex < compactCount; nextIndex++) {
                next.appendChild(createDeadlinesHomeRow(rows[nextIndex], todayTs, false));
            }
        }

        if (expanded && more) {
            for (var moreIndex = compactCount; moreIndex < rows.length; moreIndex++) {
                more.appendChild(createDeadlinesHomeRow(rows[moreIndex], todayTs, false));
            }
        }

        if (meta) {
            var fetchedAtDate = resp.fetchedAt ? new Date(resp.fetchedAt) : null;
            meta.textContent = fetchedAtDate
                ? fetchedAtDate.toLocaleString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
                : 'unknown';
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
        var stale = !fetchedAt || (now - fetchedAt) > DEADLINES_CACHE_TTL_MS;
        if (stale && !_deadlinesFetchInProgress) {
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
        var studyAnnouncementsWidget = findHomepageWidgetByHeading(/study announcements/i);
        if (studyAnnouncementsWidget && studyAnnouncementsWidget.parentElement) {
            return studyAnnouncementsWidget.parentElement;
        }

        var namedSidebar = document.querySelector('.homepage-col-3');
        if (namedSidebar) return namedSidebar;

        var deadlinesWidget = document.querySelector('.dtu-deadlines-home-widget');
        if (deadlinesWidget && deadlinesWidget.parentElement) return deadlinesWidget.parentElement;

        return null;
    }

    function placeDeadlinesHomepageWidget(widget, col3) {
        if (!widget || !col3) return;
        if (widget.parentNode !== col3 || col3.firstChild !== widget) {
            if (col3.firstChild) col3.insertBefore(widget, col3.firstChild);
            else col3.appendChild(widget);
        }
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
        var col3 = getHomepageDeadlinesColumn();
        if (!col3) {
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

            var expandedInit = localStorage.getItem(DEADLINES_EXPANDED_KEY) === 'true';
            var chevronBtn = document.createElement('d2l-button-icon');
            markExt(chevronBtn);
            chevronBtn.setAttribute('data-dtu-deadlines-chevron', '1');
            chevronBtn.setAttribute('type', 'button');
            chevronBtn.setAttribute('animation-type', 'opacity-transform');
            chevronBtn.setAttribute('text-hidden', '');
            chevronBtn.setAttribute('aria-label', 'Toggle upcoming deadlines');
            chevronBtn.setAttribute('icon', expandedInit ? 'tier1:chevron-up' : 'tier1:chevron-down');
            chevronBtn.setAttribute('expanded', expandedInit ? 'true' : 'false');
            chevronBtn.setAttribute('text', expandedInit ? 'Show fewer deadlines' : 'Show more deadlines');
            chevronBtn.addEventListener('click', function () {
                var nextState = localStorage.getItem(DEADLINES_EXPANDED_KEY) !== 'true';
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
            sources.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 10px;';

            var courseA = document.createElement('a');
            courseA.textContent = 'Course';
            courseA.target = '_blank';
            courseA.rel = 'noopener noreferrer';
            courseA.setAttribute('data-kind', 'course');
            courseA.style.cssText = 'color: ' + (isDarkMode() ? '#888' : '#9ca3af') + ' !important; text-decoration: none;';
            courseA.addEventListener('mouseenter', function () { courseA.style.textDecoration = 'underline'; });
            courseA.addEventListener('mouseleave', function () { courseA.style.textDecoration = 'none'; });

            var sep = document.createElement('span');
            markExt(sep);
            sep.textContent = '\u00b7';
            sep.style.cssText = 'color: ' + (isDarkMode() ? '#555' : '#d1d5db') + ';';

            var examA = document.createElement('a');
            examA.textContent = 'Exam';
            examA.target = '_blank';
            examA.rel = 'noopener noreferrer';
            examA.setAttribute('data-kind', 'exam');
            examA.style.cssText = 'color: ' + (isDarkMode() ? '#888' : '#9ca3af') + ' !important; text-decoration: none;';
            examA.addEventListener('mouseenter', function () { examA.style.textDecoration = 'underline'; });
            examA.addEventListener('mouseleave', function () { examA.style.textDecoration = 'none'; });

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

        placeDeadlinesHomepageWidget(widget, col3);
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
