// Deadline period data: heading parsing, period grouping, and row accessors.
// Loaded by darkmode.deadlines.js before it draws the timeline.
(function () {
    'use strict';
    var normalizeWhitespace = globalThis.DTUAfterDarkDom && globalThis.DTUAfterDarkDom.normalizeWhitespace;
    if (typeof normalizeWhitespace !== 'function') {
        throw new Error('darkmode.deadlines.data.js requires darkmode.dom.js loaded first');
    }

    var DEADLINE_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    function normalizeDeadlinePeriodText(text) {
        var decoded = String(text || '');
        for (var pass = 0; pass < 3; pass++) {
            var next = decoded
                .replace(/&amp;/gi, '&')
                .replace(/&nbsp;/gi, ' ')
                .replace(/&ndash;/gi, '\u2013')
                .replace(/&mdash;/gi, '\u2014');
            if (next === decoded) break;
            decoded = next;
        }
        return normalizeWhitespace(decoded);
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

    function getDeadlineRowStartTs(row) {
        return row && row.startTs != null && isFinite(row.startTs) ? Number(row.startTs) : Number(row && row.nextTs);
    }

    function getDeadlineRowEndTs(row) {
        return row && row.endTs != null && isFinite(row.endTs) ? Number(row.endTs) : getDeadlineRowStartTs(row);
    }

    function deadlineMonthIndex(name) {
        var key = String(name || '').slice(0, 3).toLowerCase();
        var title = key.charAt(0).toUpperCase() + key.slice(1);
        var index = DEADLINE_MONTH_NAMES.indexOf(title);
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

    // One timeline row per period a deadline belongs to: the teaching period being
    // registered for, or the exam period. A window DTU lists under several periods
    // (the three summer courses share one registration round) appears in each row.
    function buildDeadlinePeriodGroups(rows) {
        var groups = [];
        var byKey = Object.create(null);
        (Array.isArray(rows) ? rows : []).forEach(function (row) {
            if (!row) return;
            var kind = (row.kind === 'exam' || row.kind === 'exchange') ? row.kind : 'course';
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
                        name: parsed.name || ({ exam: 'Exams', exchange: 'Exchange' }[kind] || 'Courses'),
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

    // A period earns a row only when its next deadline is close enough to act on. DTU
    // opens June, July and August registration on the same day months ahead, which
    // otherwise filled the widget with rows holding a single mark at the far edge.
    // The soonest period always stays, so the widget is never empty while dates exist.
    var DEADLINE_PERIOD_LOOKAHEAD_DAYS = 60;

    function selectDeadlinePeriodGroups(groups, todayTs) {
        var list = Array.isArray(groups) ? groups : [];
        var limitTs = todayTs + DEADLINE_PERIOD_LOOKAHEAD_DAYS * 86400000;
        var near = list.filter(function (group) {
            return group.nextRow && group.nextRow.nextTs <= limitTs;
        });
        if (near.length || !list.length) return near;
        var soonest = list.reduce(function (best, group) {
            return (!best || group.nextRow.nextTs < best.nextRow.nextTs) ? group : best;
        }, null);
        return [soonest];
    }


    // Calendar events for the deadlines the widget knows, dated fromIso to untilIso (ISO days).
    // A window gives two one-day events, "opens" and "closes", so a two-week registration
    // period does not fill the calendar; a single date gives one. Each UID is stable, so
    // importing the file again updates the events instead of adding copies.
    function buildDeadlineCalendarEvents(rows, fromIso, untilIso) {
        var events = [];
        (rows || []).forEach(function (row) {
            if (!row || !row.startIso) return;
            var names = getDeadlinePeriodLabels(row).map(function (label) {
                var parsed = parseDeadlinePeriodHeading(label);
                return (parsed && parsed.name) || label;
            });
            var prefix = names.length
                ? names.join(', ') + (row.kind === 'course' ? ' courses' : '') + ': '
                : (row.kind === 'exchange' ? 'Exchange: ' : '');
            var label = normalizeWhitespace(String(row.label || 'Deadline'));
            var endIso = row.endIso && row.endIso !== row.startIso ? row.endIso : null;
            // The file is a copy: say when it was made and how to update it, since DTU sometimes
            // moves a date it has already published.
            var description = 'From DTU\'s deadlines page: ' + (row.sourceUrl || '') + '\n'
                + 'Copied on ' + fromIso + '. DTU sometimes moves a published date: the deadlines widget on DTU Learn shows the current one, '
                + 'and downloading the calendar file again updates these events. DTU After Dark is unofficial.';
            function add(date, part) {
                if (!date || date < fromIso || date > untilIso) return;
                var uid = ['deadline', row.kind || '', label, row.startIso, endIso || '', part].join(' ')
                    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                events.push({ uid: uid + '@dtu-after-dark', date: date, summary: prefix + label + (part ? ' ' + part : ''), description: description });
            }
            if (endIso) {
                add(row.startIso, 'opens');
                add(endIso, 'closes');
            } else {
                add(row.startIso, '');
            }
        });
        events.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
        return events;
    }

    globalThis.DTUAfterDarkDeadlinesData = {
        buildDeadlineCalendarEvents: buildDeadlineCalendarEvents,
        MONTH_NAMES: DEADLINE_MONTH_NAMES,
        normalizeDeadlinePeriodText: normalizeDeadlinePeriodText,
        getDeadlinePeriodLabels: getDeadlinePeriodLabels,
        getDeadlineRowStartTs: getDeadlineRowStartTs,
        getDeadlineRowEndTs: getDeadlineRowEndTs,
        parseDeadlinePeriodHeading: parseDeadlinePeriodHeading,
        buildDeadlinePeriodGroups: buildDeadlinePeriodGroups,
        selectDeadlinePeriodGroups: selectDeadlinePeriodGroups
    };
})();
