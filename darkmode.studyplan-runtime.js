(function () {
    'use strict';

    var STUDYPLAN_EXAM_CLUSTER_PUBLIC_ENABLED = false;

    function getDeps() {
        try { return globalThis.DTUAfterDarkStudyplanRuntimeDeps || null; } catch (e0) { return null; }
    }

    function isTopWindow() {
        var deps = getDeps();
        return !!(deps && typeof deps.isTopWindow === 'function' && deps.isTopWindow());
    }

    function isDarkMode() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDarkMode === 'function' && deps.isDarkMode());
    }

    function markExt(el) {
        var deps = getDeps();
        if (el && deps && typeof deps.markExt === 'function') deps.markExt(el);
        return el;
    }

    function sendRuntimeMessage(msg, cb) {
        var deps = getDeps();
        if (deps && typeof deps.sendRuntimeMessage === 'function') return deps.sendRuntimeMessage(msg, cb);
        if (cb) cb(null);
    }

    function isStudyplanExamClusterEnabled() {
        if (!STUDYPLAN_EXAM_CLUSTER_PUBLIC_ENABLED) return false;
        var deps = getDeps();
        var key = deps && deps.featureStudyplanExamClusterKey;
        if (!deps || !key || typeof deps.isFeatureFlagEnabled !== 'function') return true;
        return !!deps.isFeatureFlagEnabled(key);
    }

    function getStudyplanExamsUi() {
        try { return globalThis.DTUAfterDarkStudyplanExamsUi || null; } catch (e0) { return null; }
    }

// Easy rollback: remove this block plus the scheduler call in runTopWindowFeatureChecks(...).
    var _studyplanExamClusterTimer = null;
    var _studyplanExamClusterRequestInFlight = false;
    var _studyplanExamClusterLastSig = '';
    var _studyplanExamClusterLastRenderedSig = '';
    var _studyplanExamClusterLastCalendar = null;
    var _studyplanExamChoiceEditorOpen = false;
    var STUDYPLAN_EXAM_CHOICE_KEY = 'dtuAfterDarkStudyplanExamChoicesV1';
    var STUDYPLAN_EXAM_TIMELINE_OVERRIDES_KEY = 'dtuAfterDarkStudyplanExamTimelineOverridesV1';

    function normalizeExamClusterText(text) {
        return (text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function getStoredStudyplanExamChoices() {
        try {
            var raw = localStorage.getItem(STUDYPLAN_EXAM_CHOICE_KEY);
            if (!raw) return {};
            var parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            return {};
        }
    }

    function saveStoredStudyplanExamChoices(choices) {
        try {
            localStorage.setItem(STUDYPLAN_EXAM_CHOICE_KEY, JSON.stringify(choices && typeof choices === 'object' ? choices : {}));
        } catch (e) { }
    }

    function buildStudyplanExamChoiceCourseKey(course) {
        if (!course) return '';
        return [
            String(course.code || '').toUpperCase(),
            normalizeExamClusterText(course.placementText || ''),
            normalizeExamClusterText(course.periodText || ''),
            Array.isArray(course.tokens) ? course.tokens.join(',') : '',
            Array.isArray(course.placementMonthTags) ? course.placementMonthTags.join(',') : ''
        ].join('|');
    }

    function buildStudyplanExamChoiceOptionKey(candidate) {
        var entry = candidate && candidate.entry ? candidate.entry : candidate;
        if (!entry) return '';
        return [
            entry.dateIso || '',
            normalizeExamClusterText(entry.text || ''),
            Array.isArray(candidate && candidate.matchedTokens) ? candidate.matchedTokens.slice().sort().join(',') : ''
        ].join('|');
    }

    function setStoredStudyplanExamChoice(courseKey, optionKey) {
        if (!courseKey) return;
        var choices = getStoredStudyplanExamChoices();
        if (!optionKey) {
            delete choices[courseKey];
        } else {
            choices[courseKey] = optionKey;
        }
        saveStoredStudyplanExamChoices(choices);
    }

    function getStoredStudyplanExamTimelineOverrides() {
        try {
            var raw = localStorage.getItem(STUDYPLAN_EXAM_TIMELINE_OVERRIDES_KEY);
            if (!raw) return { edits: {}, deleted: {}, custom: [] };
            var parsed = JSON.parse(raw);
            var edits = parsed && parsed.edits && typeof parsed.edits === 'object' ? parsed.edits : {};
            var deleted = parsed && parsed.deleted && typeof parsed.deleted === 'object' ? parsed.deleted : {};
            var custom = parsed && Array.isArray(parsed.custom) ? parsed.custom : [];
            return { edits: edits, deleted: deleted, custom: custom };
        } catch (e) {
            return { edits: {}, deleted: {}, custom: [] };
        }
    }

    function saveStoredStudyplanExamTimelineOverrides(overrides) {
        var clean = overrides && typeof overrides === 'object' ? overrides : {};
        try {
            localStorage.setItem(STUDYPLAN_EXAM_TIMELINE_OVERRIDES_KEY, JSON.stringify({
                edits: clean.edits && typeof clean.edits === 'object' ? clean.edits : {},
                deleted: clean.deleted && typeof clean.deleted === 'object' ? clean.deleted : {},
                custom: Array.isArray(clean.custom) ? clean.custom : []
            }));
        } catch (e) { }
    }

    function buildStudyplanExamTimelineBaseKey(item) {
        if (!item) return '';
        return [
            String(item.code || '').toUpperCase(),
            item.dateIso || '',
            normalizeExamClusterText(item.examText || ''),
            normalizeExamClusterText(item.periodText || ''),
            normalizeExamClusterText(item.name || '')
        ].join('|');
    }

    function buildStudyplanExamTimelineCustomId() {
        return 'custom_' + String(Date.now()) + '_' + String(Math.floor(Math.random() * 100000));
    }

    function getExpectedStudyplanExamTags(course) {
        var tags = [];
        function add(tag) {
            if (tag && tags.indexOf(tag) === -1) tags.push(tag);
        }
        if (!course) return tags;

        var kind = String(course.periodKind || '').toLowerCase();
        var text = normalizeExamClusterText(course.periodText || '').toLowerCase();
        var monthTags = Array.isArray(course.monthTags) ? course.monthTags : [];

        if (monthTags.indexOf('reexam') !== -1 || /\bre-?exam\b|\breeksamen\b/.test(text)) add('reexam');
        if (kind === 'spring_13w' || kind === 'summer_exam' || kind === 'summer_jja') add('summer_period');
        if (kind === 'autumn_13w' || kind === 'winter_exam') add('winter_period');
        if (/\bspring\b|\bfor\u00e5r\b/.test(text)) add('summer_period');
        if (/\bautumn\b|\bfall\b|\befter\u00e5r\b/.test(text)) add('winter_period');
        if (/\bsummer\b|\bsommer\b/.test(text)) add('summer_period');
        if (/\bwinter\b|\bvinter\b/.test(text)) add('winter_period');

        return tags;
    }

    function shouldPromptForStudyplanExamChoice(course) {
        if (!course) return false;
        var placement = normalizeExamClusterText(course.placementText || '');
        var tokens = Array.isArray(course.tokens) ? course.tokens.filter(Boolean) : [];
        var explicitMonths = extractStudyplanExplicitMonthTags(placement);
        if (!placement) return true;
        if (explicitMonths.length) return false;
        if (/^\s*[FE]\s*$/i.test(placement)) return true;
        if (tokens.some(function (token) { return /^[EF]\d$/.test(token); })) return true;
        if (!tokens.length) return true;
        if (tokens.length > 1) return true;
        return false;
    }

    function normalizeExamSlotToken(rawToken) {
        var raw = normalizeExamClusterText(rawToken).toUpperCase().replace(/\s+/g, '');
        if (!raw) return '';
        var compact = raw.replace('-', '');
        if (/^[EF]\d[AB]$/.test(compact)) return compact.slice(0, 2) + '-' + compact.slice(2);
        if (/^[EF]\d$/.test(compact)) return compact;
        return '';
    }

    function formatIsoDateForDisplay(iso) {
        var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return iso || '';
        return m[3] + '/' + m[2] + ' ' + m[1];
    }

    function formatStudyplanExamEditDate(iso) {
        var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return '';
        return m[3] + '/' + m[2] + '/' + m[1];
    }

    function parseStudyplanExamEditDate(text) {
        var value = normalizeExamClusterText(text);
        if (!value) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        var m = value.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})$/);
        if (!m) return '';
        var day = parseInt(m[1], 10);
        var month = parseInt(m[2], 10);
        var year = parseInt(m[3], 10);
        if (!day || !month || !year || month < 1 || month > 12 || day < 1 || day > 31) return '';
        var iso = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        var ts = parseIsoToUtcTs(iso);
        if (ts === null) return '';
        var d = new Date(ts);
        if (d.getUTCFullYear() !== year || d.getUTCMonth() !== (month - 1) || d.getUTCDate() !== day) return '';
        return iso;
    }

    function parseIsoToUtcTs(iso) {
        var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return null;
        var y = parseInt(m[1], 10);
        var mo = parseInt(m[2], 10);
        var d = parseInt(m[3], 10);
        if (!y || !mo || !d) return null;
        return Date.UTC(y, mo - 1, d);
    }

    function startOfTodayUtcTs() {
        var now = new Date();
        return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    }

    function diffDaysUtc(fromTs, toTs) {
        var dayMs = 24 * 60 * 60 * 1000;
        return Math.round((toTs - fromTs) / dayMs);
    }

    function getTableCellColspan(cell) {
        if (!cell) return 1;
        var span = parseInt(cell.getAttribute('colspan') || '1', 10);
        return (isNaN(span) || span < 1) ? 1 : span;
    }

    function getRowCellTextByVisualIndex(row, visualIndex) {
        if (!row || typeof visualIndex !== 'number' || visualIndex < 0) return '';
        var cells = row.querySelectorAll('th, td');
        var col = 0;
        for (var i = 0; i < cells.length; i++) {
            var span = getTableCellColspan(cells[i]);
            if (visualIndex >= col && visualIndex < (col + span)) {
                return normalizeExamClusterText(cells[i].innerText || cells[i].textContent || '');
            }
            col += span;
        }
        return '';
    }

    function getStudyplanExamTableColumnIndexes(tableEl) {
        var out = { placement: -1, result: -1 };
        if (!tableEl) return out;

        var headerRow = null;
        var rows = tableEl.querySelectorAll('tr');
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].querySelector('th')) {
                headerRow = rows[i];
                break;
            }
        }
        if (!headerRow) return out;

        var col = 0;
        var cells = headerRow.querySelectorAll('th, td');
        cells.forEach(function (cell) {
            var txt = normalizeExamClusterText(cell.textContent || '').toLowerCase();
            if (out.placement === -1 && /\b(placering|placement)\b/.test(txt)) out.placement = col;
            if (out.result === -1 && /\b(resultat|result)\b/.test(txt)) out.result = col;
            col += getTableCellColspan(cell);
        });
        return out;
    }

    function getStudyplanTablePeriodText(tableEl) {
        if (!tableEl) return '';
        var cached = tableEl.getAttribute('data-dtu-exam-period-text');
        if (cached) return cached;

        var period = '';
        var rows = tableEl.querySelectorAll('tr');
        for (var i = 0; i < rows.length && i < 4; i++) {
            var firstCell = rows[i].querySelector('th, td');
            if (!firstCell) continue;
            var txt = normalizeExamClusterText(firstCell.textContent || '');
            if (!txt) continue;
            if (/(week|weeks|uger|spring|for\u00e5r|autumn|efter\u00e5r|summer|sommer|winter|vinter|eksamen|exam|januar|january|februar|february|juni|june|juli|july|august|december|may|maj)/i.test(txt)) {
                period = txt;
                break;
            }
        }

        tableEl.setAttribute('data-dtu-exam-period-text', period);
        return period;
    }

    function parseStudyplanPlacementTokens(text) {
        var out = [];
        var seen = Object.create(null);
        var regex = /\b([EF]\d(?:\s*-\s*[AB]|[AB])?)\b/gi;
        var m;
        while ((m = regex.exec(text || '')) !== null) {
            var token = normalizeExamSlotToken(m[1]);
            if (!token || seen[token]) continue;
            seen[token] = true;
            out.push(token);
        }
        return out;
    }

    function parseStudyplanMonthTags(text) {
        var lower = normalizeExamClusterText(text).toLowerCase();
        var tags = [];
        function add(tag) {
            if (tags.indexOf(tag) === -1) tags.push(tag);
        }
        if (!lower) return tags;
        if (/\bjanuary\b|\bjanuar\b/.test(lower)) add('january');
        if (/\bfebruary\b|\bfebruar\b/.test(lower)) add('february');
        if (/\bmay\b|\bmaj\b/.test(lower)) add('may');
        if (/\bjune\b|\bjuni\b/.test(lower)) add('june');
        if (/\bjuly\b|\bjuli\b/.test(lower)) add('july');
        if (/\baugust\b/.test(lower)) add('august');
        if (/\bdecember\b/.test(lower)) add('december');
        if (/\bwinter\b|\bvinter/.test(lower)) add('winter_period');
        if (/\bsummer\b|\bsommer/.test(lower)) add('summer_period');
        if (/\bre-?exam\b|\breeksamen\b/.test(lower)) add('reexam');
        return tags;
    }

    function studyplanMonthTagToNumber(tag) {
        if (tag === 'january') return 1;
        if (tag === 'february') return 2;
        if (tag === 'may') return 5;
        if (tag === 'june') return 6;
        if (tag === 'july') return 7;
        if (tag === 'august') return 8;
        if (tag === 'december') return 12;
        return null;
    }

    function extractStudyplanExplicitMonthTags(text) {
        return parseStudyplanMonthTags(text).filter(function (tag) {
            return studyplanMonthTagToNumber(tag) !== null;
        });
    }

    function inferStudyplanPeriodInfo(periodText) {
        var text = normalizeExamClusterText(periodText);
        if (!text) return null;

        var lower = text.toLowerCase();
        var years = [];
        var yearSeen = Object.create(null);
        var yearRegex = /\b(20\d{2})\b/g;
        var yearMatch;
        while ((yearMatch = yearRegex.exec(lower)) !== null) {
            var y = parseInt(yearMatch[1], 10);
            if (!isNaN(y) && !yearSeen[y]) {
                yearSeen[y] = true;
                years.push(y);
            }
        }

        var nowYear = new Date().getFullYear();
        var baseYear = years.length ? years[years.length - 1] : nowYear;
        var startYear = baseYear;
        var endYear = baseYear;
        var startMonth = null;
        var endMonth = null;
        var kind = 'unknown';

        var has13Weeks = /13\s*[- ]?(?:weeks?|uger)/.test(lower);
        var hasSpring = /(?:\bspring\b|\bfor\u00e5r\b)/.test(lower);
        var hasAutumn = /(?:\bautumn\b|\bfall\b|\befter\u00e5r\b)/.test(lower);
        var hasSummerExam = /(?:\bsummer\s+exam\b|\bsommereksamen\b)/.test(lower);
        var hasWinterExam = /(?:\bwinter\s+exam\b|\bvintereksamen\b)/.test(lower);
        var hasJune = /(?:\bjune\b|\bjuni\b)/.test(lower);
        var hasJuly = /(?:\bjuly\b|\bjuli\b)/.test(lower);
        var hasAugust = /\baugust\b/.test(lower);

        if (has13Weeks && hasSpring) {
            kind = 'spring_13w';
            startMonth = 2;
            endMonth = 5;
        } else if (has13Weeks && hasAutumn) {
            kind = 'autumn_13w';
            startMonth = 8;
            endMonth = 12;
        } else if (hasJune && hasJuly && hasAugust) {
            kind = 'summer_jja';
            startMonth = 6;
            endMonth = 8;
        } else if (hasSummerExam) {
            kind = 'summer_exam';
            startMonth = 5;
            endMonth = 6;
        } else if (hasWinterExam) {
            kind = 'winter_exam';
            startMonth = 12;
            endMonth = 1;
            if (years.length >= 2) {
                startYear = years[0];
                endYear = years[1];
            } else {
                endYear = startYear + 1;
            }
        } else {
            var monthTags = extractStudyplanExplicitMonthTags(text);
            if (monthTags.length) {
                var monthNums = monthTags
                    .map(studyplanMonthTagToNumber)
                    .filter(function (n) { return typeof n === 'number' && isFinite(n); })
                    .sort(function (a, b) { return a - b; });
                if (monthNums.length) {
                    kind = 'month_range';
                    startMonth = monthNums[0];
                    endMonth = monthNums[monthNums.length - 1];
                }
            }
        }

        if (startMonth === null || endMonth === null) {
            return {
                text: text,
                kind: kind,
                startTs: null,
                endTs: null
            };
        }

        var startTs = Date.UTC(startYear, startMonth - 1, 1);
        var endTs = Date.UTC(endYear, endMonth, 0);

        // Handle ranges that cross year boundaries (example: Dec -> Jan).
        if (endTs < startTs && startYear === endYear) {
            endYear = startYear + 1;
            endTs = Date.UTC(endYear, endMonth, 0);
        }

        return {
            text: text,
            kind: kind,
            startTs: startTs,
            endTs: endTs
        };
    }

    function isStudyplanPeriodCurrentOrFuture(periodInfo, todayTs) {
        if (!periodInfo || typeof periodInfo.endTs !== 'number' || !isFinite(periodInfo.endTs)) return true;
        return periodInfo.endTs >= todayTs;
    }

    function isStudyplanPeriodCurrent(periodInfo, todayTs) {
        if (!periodInfo || typeof periodInfo.startTs !== 'number' || typeof periodInfo.endTs !== 'number') return false;
        return periodInfo.startTs <= todayTs && periodInfo.endTs >= todayTs;
    }

    function isLikelyCompletedStudyplanResult(resultText) {
        var txt = normalizeExamClusterText(resultText);
        if (!txt) return false;
        if (/^[-–—]$/.test(txt)) return false;
        if (/^(12|10|7|4|02|00|-3)\b/.test(txt)) return true;
        if (/^(BE(?:\s*\(.*\))?|best[a\u00e5]et|passed?)$/i.test(txt)) return true;
        if (/\b(ikke\s+best[a\u00e5]et|not\s+passed|failed)\b/i.test(txt)) return true;
        if (/[✓✔]/.test(txt)) return true;
        return false;
    }

    function extractStudyplanCourseName(anchor, code, row) {
        var text = '';
        if (anchor && anchor.closest) {
            var anchorCell = anchor.closest('td, th');
            if (anchorCell) {
                text = normalizeExamClusterText(anchorCell.innerText || anchorCell.textContent || '');
            }
        }
        if (!text && row) {
            var cells = row.querySelectorAll('td, th');
            for (var i = 0; i < cells.length; i++) {
                var cellText = normalizeExamClusterText(cells[i].innerText || cells[i].textContent || '');
                if (!cellText) continue;
                if (new RegExp('\\b' + String(code || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(cellText)) {
                    text = cellText;
                    break;
                }
            }
        }
        if (!text && row) {
            text = normalizeExamClusterText(row.innerText || row.textContent || '');
        }
        if (!text) return '';
        var esc = String(code || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        text = text.replace(new RegExp('\\b' + esc + '\\b', 'i'), '').trim();
        text = text.replace(/\b([EF]\d(?:-?[AB])?|january|february|may|june|july|august|december)\b/ig, '').trim();
        text = text.replace(/\b(placement|status|ects)\b/ig, '').trim();
        text = text.replace(/\s{2,}/g, ' ').trim();
        return text.slice(0, 120);
    }

    function findStudyplanCourseInRow(row) {
        if (!row) return null;

        var anchors = row.querySelectorAll('a');
        for (var i = 0; i < anchors.length; i++) {
            var txt = normalizeExamClusterText(anchors[i].textContent || '');
            var m = txt.match(/\b([A-Za-z]{2}\d{3}|\d{5})\b/);
            if (m && m[1]) {
                return {
                    code: m[1].toUpperCase(),
                    anchor: anchors[i]
                };
            }
        }

        var rowText = normalizeExamClusterText(row.textContent || '');
        var rowMatch = rowText.match(/\b([A-Za-z]{2}\d{3}|\d{5})\b/);
        if (rowMatch && rowMatch[1]) {
            return {
                code: rowMatch[1].toUpperCase(),
                anchor: null
            };
        }
        return null;
    }
    function parseStudyplanSemesterNumber(text) {
        var m = normalizeExamClusterText(text).match(/\b(\d{1,2})\.\s*(semester|term)\b/i);
        if (!m || !m[1]) return null;
        var n = parseInt(m[1], 10);
        return isNaN(n) ? null : n;
    }

    function findStudyplanSemesterNumberForTable(table) {
        if (!table) return null;
        var cached = table.getAttribute('data-dtu-semester-num');
        if (cached !== null) {
            // '' means previously scanned and not found; any other string is the number.
            var cachedNum = parseInt(cached, 10);
            return isNaN(cachedNum) ? null : cachedNum;
        }

        var found = null;
        var scope = table;
        for (var up = 0; scope && up < 6 && found === null; up++) {
            var prev = scope.previousElementSibling;
            var hops = 0;
            while (prev && hops < 16) {
                var txt = normalizeExamClusterText(prev.textContent || '');
                if (txt && txt.length <= 180) {
                    var num = parseStudyplanSemesterNumber(txt);
                    if (num !== null) {
                        found = num;
                        break;
                    }
                }
                prev = prev.previousElementSibling;
                hops++;
            }
            scope = scope.parentElement;
        }

        table.setAttribute('data-dtu-semester-num', found === null ? '' : String(found));
        return found;
    }

    // Parse "1 September 2025 - 31 August 2026" date ranges from "Year of study" headers.
    function parseStudyplanYearDateRange(text) {
        var norm = normalizeExamClusterText(text);
        var monthValues = {
            january:0, february:1, march:2, april:3, may:4, june:5,
            july:6, august:7, september:8, october:9, november:10, december:11,
            januar:0, februar:1, marts:2, maj:4, juni:5, juli:6, oktober:9
        };
        var m = norm.match(/(\d{1,2})\s+([a-z]+)\s+(20\d{2})\s*[-\u2013]\s*(\d{1,2})\s+([a-z]+)\s+(20\d{2})/i);
        if (!m) return null;
        var sm = monthValues[m[2].toLowerCase()];
        var em = monthValues[m[5].toLowerCase()];
        if (sm === undefined || em === undefined) return null;
        var startTs = Date.UTC(parseInt(m[3], 10), sm, parseInt(m[1], 10));
        var endTs = Date.UTC(parseInt(m[6], 10), em, parseInt(m[4], 10) + 1); // +1: exclusive end
        if (isNaN(startTs) || isNaN(endTs) || endTs <= startTs) return null;
        return { startTs: startTs, endTs: endTs };
    }

    // Walk up the DOM from a table to find its "Year of study" section header date range.
    // Cached on the element to avoid repeated DOM walks.
    function findStudyplanYearDateRangeForTable(table) {
        if (!table) return null;
        var cached = table.getAttribute('data-dtu-year-range');
        if (cached !== null) {
            if (!cached) return null;
            try { return JSON.parse(cached); } catch (e) { return null; }
        }
        var found = null;
        var scope = table;
        for (var up = 0; scope && up < 10 && !found; up++) {
            var prev = scope.previousElementSibling;
            var hops = 0;
            while (prev && hops < 24 && !found) {
                var txt = normalizeExamClusterText(prev.textContent || '');
                if (txt && txt.length <= 300 && /(year of study|studie.r)/i.test(txt)) {
                    found = parseStudyplanYearDateRange(txt);
                    if (!found) {
                        // Try headings inside the element
                        var heads = prev.querySelectorAll('h1,h2,h3,h4,h5,h6,b,strong');
                        for (var hi = 0; hi < heads.length && !found; hi++) {
                            found = parseStudyplanYearDateRange(normalizeExamClusterText(heads[hi].textContent || ''));
                        }
                    }
                }
                prev = prev.previousElementSibling;
                hops++;
            }
            scope = scope.parentElement;
        }
        table.setAttribute('data-dtu-year-range', found ? JSON.stringify(found) : '');
        return found;
    }

    function getStudyplanRowPeriodText(row, fallback) {
        if (!row) return fallback || '';
        var probe = row;
        var hops = 0;
        while (probe && hops < 10) {
            var firstCell = probe.querySelector('th, td');
            if (firstCell) {
                var txt = normalizeExamClusterText(firstCell.textContent || '');
                if (txt && txt.length <= 120
                    && /(week|weeks|uger|exam|eksamen|januar|january|februar|february|maj|may|juni|june|juli|july|august|december|spring|for\u00e5r|autumn|efter\u00e5r|summer|sommer|winter|vinter)/i.test(txt)) {
                    return txt;
                }
            }
            probe = probe.previousElementSibling;
            hops++;
        }
        return fallback || '';
    }

    function collectStudyplanUpcomingExamCourses() {
        if (!isTopWindow()) return [];
        if (window.location.hostname !== 'studieplan.dtu.dk') return [];

        var todayTs = startOfTodayUtcTs();
        var candidateTables = [];
        document.querySelectorAll('table').forEach(function (table) {
            var idx = getStudyplanExamTableColumnIndexes(table);
            if (idx.placement < 0) return;

            var semesterNum = findStudyplanSemesterNumberForTable(table);
            var tablePeriodText = getStudyplanTablePeriodText(table);
            var hasCandidate = false;

            table.querySelectorAll('tr').forEach(function (row) {
                if (hasCandidate) return;
                var courseInfo = findStudyplanCourseInRow(row);
                if (!courseInfo || !courseInfo.code) return;
                var placementText = getRowCellTextByVisualIndex(row, idx.placement);
                var resultText = getRowCellTextByVisualIndex(row, idx.result);

                if (isLikelyCompletedStudyplanResult(resultText)) return;
                var rowPeriodText = getStudyplanRowPeriodText(row, tablePeriodText);
                var rowPeriodInfo = inferStudyplanPeriodInfo(rowPeriodText);
                if (!isStudyplanPeriodCurrentOrFuture(rowPeriodInfo, todayTs)) return;
                var tokens = parseStudyplanPlacementTokens(placementText);
                if (!tokens.length) {
                    tokens = parseStudyplanPlacementTokens(normalizeExamClusterText((placementText ? (placementText + ' ') : '') + rowPeriodText));
                }
                var placementMonthTags = extractStudyplanExplicitMonthTags(placementText);
                var rowPeriodMonthTags = extractStudyplanExplicitMonthTags(rowPeriodText);
                if (!placementMonthTags.length && !tokens.length && rowPeriodMonthTags.length) {
                    placementMonthTags = rowPeriodMonthTags.slice();
                }
                var monthTags = placementMonthTags.length ? placementMonthTags : parseStudyplanMonthTags(rowPeriodText);
                if (tokens.length || monthTags.length) {
                    hasCandidate = true;
                } else if (rowPeriodInfo && (typeof rowPeriodInfo.startTs === 'number' || typeof rowPeriodInfo.endTs === 'number')) {
                    // Keep current/future period rows even when placement text is missing.
                    hasCandidate = true;
                }
            });

            if (hasCandidate) {
                candidateTables.push({
                    table: table,
                    semesterNum: semesterNum
                });
            }
        });

        if (!candidateTables.length) return [];

        // Primary filter: narrow to the "Year of study" section that contains today.
        // The page shows explicit date ranges like "1 September 2025 - 31 August 2026" in
        // section headers. This anchors us to the student's current academic year and prevents
        // future semesters (years 4-8 of an 8-year plan) from being selected.
        var currentYearCandidates = candidateTables.filter(function (c) {
            var yr = findStudyplanYearDateRangeForTable(c.table);
            return yr && todayTs >= yr.startTs && todayTs < yr.endTs;
        });
        if (currentYearCandidates.length) {
            candidateTables = currentYearCandidates;
        }

        // Secondary filter: pick the EARLIEST (lowest-numbered) term within the (now narrowed)
        // candidate list. Within the current academic year the earliest term is the student's
        // current active term. This is also the safe fallback if the year-header parse above fails.
        var minSemester = null;
        candidateTables.forEach(function (c) {
            if (typeof c.semesterNum === 'number' && isFinite(c.semesterNum)) {
                if (minSemester === null || c.semesterNum < minSemester) minSemester = c.semesterNum;
            }
        });

        var selectedTables;
        if (minSemester === null) {
            selectedTables = [candidateTables[0].table];
        } else {
            selectedTables = candidateTables
                .filter(function (c) { return c.semesterNum === minSemester; })
                .map(function (c) { return c.table; });
        }

        var out = [];
        var seen = Object.create(null);

        selectedTables.forEach(function (table) {
            var idx = getStudyplanExamTableColumnIndexes(table);
            var tablePeriodText = getStudyplanTablePeriodText(table);
            var semesterNum = findStudyplanSemesterNumberForTable(table);

            table.querySelectorAll('tr').forEach(function (row) {
                var courseInfo = findStudyplanCourseInRow(row);
                if (!courseInfo || !courseInfo.code) return;
                var code = courseInfo.code;
                var anchor = courseInfo.anchor;
                var placementText = getRowCellTextByVisualIndex(row, idx.placement);
                var resultText = getRowCellTextByVisualIndex(row, idx.result);

                if (isLikelyCompletedStudyplanResult(resultText)) return;
                var rowPeriodText = getStudyplanRowPeriodText(row, tablePeriodText);
                var rowPeriodInfo = inferStudyplanPeriodInfo(rowPeriodText);
                if (!isStudyplanPeriodCurrentOrFuture(rowPeriodInfo, todayTs)) return;
                var tokens = parseStudyplanPlacementTokens(placementText);
                if (!tokens.length) {
                    tokens = parseStudyplanPlacementTokens(normalizeExamClusterText((placementText ? (placementText + ' ') : '') + rowPeriodText));
                }
                var placementMonthTags = extractStudyplanExplicitMonthTags(placementText);
                var rowPeriodMonthTags = extractStudyplanExplicitMonthTags(rowPeriodText);
                if (!placementMonthTags.length && !tokens.length && rowPeriodMonthTags.length) {
                    placementMonthTags = rowPeriodMonthTags.slice();
                }
                var monthTags = placementMonthTags.length ? placementMonthTags : parseStudyplanMonthTags(rowPeriodText);
                if (!tokens.length && !monthTags.length) {
                    if (!rowPeriodInfo || (typeof rowPeriodInfo.startTs !== 'number' && typeof rowPeriodInfo.endTs !== 'number')) {
                        return;
                    }
                }

                var key = code + '|' + tokens.join(',') + '|' + monthTags.join(',');
                if (seen[key]) return;
                seen[key] = true;

                out.push({
                    code: code,
                    name: extractStudyplanCourseName(anchor, code, row),
                    placementText: placementText,
                    periodText: rowPeriodText,
                    tokens: tokens,
                    monthTags: monthTags,
                    placementMonthTags: placementMonthTags,
                    semesterNumber: semesterNum,
                    periodKind: rowPeriodInfo ? rowPeriodInfo.kind : '',
                    periodIsCurrent: isStudyplanPeriodCurrent(rowPeriodInfo, todayTs),
                    periodStartTs: rowPeriodInfo && typeof rowPeriodInfo.startTs === 'number' ? rowPeriodInfo.startTs : null,
                    periodEndTs: rowPeriodInfo && typeof rowPeriodInfo.endTs === 'number' ? rowPeriodInfo.endTs : null
                });
            });
        });

        var currentRows = out.filter(function (c) { return !!c.periodIsCurrent; });
        var anchorTs = null;
        if (currentRows.length) {
            currentRows.forEach(function (c) {
                if (typeof c.periodStartTs === 'number') {
                    if (anchorTs === null || c.periodStartTs < anchorTs) anchorTs = c.periodStartTs;
                }
            });
            if (anchorTs === null) anchorTs = todayTs;
        } else {
            out.forEach(function (c) {
                if (typeof c.periodStartTs === 'number' && c.periodStartTs >= todayTs) {
                    if (anchorTs === null || c.periodStartTs < anchorTs) anchorTs = c.periodStartTs;
                } else if (typeof c.periodEndTs === 'number' && c.periodEndTs >= todayTs) {
                    if (anchorTs === null || todayTs < anchorTs) anchorTs = todayTs;
                }
            });
        }

        if (anchorTs === null) return out;

        var fromAnchor = out.filter(function (c) {
            if (typeof c.periodStartTs === 'number' && typeof c.periodEndTs === 'number') {
                return c.periodEndTs >= anchorTs;
            }
            if (typeof c.periodStartTs === 'number') return c.periodStartTs >= anchorTs;
            if (typeof c.periodEndTs === 'number') return c.periodEndTs >= anchorTs;
            return true;
        });

        return fromAnchor.length ? fromAnchor : out;
    }

    function buildStudyplanExamCourseSig(courses) {
        if (!Array.isArray(courses) || !courses.length) return 'none';
        var storedChoices = getStoredStudyplanExamChoices();
        return courses.map(function (c) {
            var courseKey = buildStudyplanExamChoiceCourseKey(c);
            return [
                c.code,
                c.tokens.join(','),
                c.monthTags.join(','),
                (Array.isArray(c.placementMonthTags) ? c.placementMonthTags.join(',') : ''),
                c.placementText,
                c.periodText,
                c.semesterNumber || '',
                storedChoices[courseKey] || ''
            ].join('|');
        }).join('||');
    }

    function arrayIntersects(a, b) {
        if (!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length) return false;
        var set = Object.create(null);
        a.forEach(function (v) { set[v] = true; });
        for (var i = 0; i < b.length; i++) {
            if (set[b[i]]) return true;
        }
        return false;
    }

    function studyplanCourseTokenMatchesExamToken(courseToken, examToken) {
        var course = normalizeExamSlotToken(courseToken);
        var exam = normalizeExamSlotToken(examToken);
        if (!course || !exam) return false;
        if (course === exam) return true;
        return /^[EF]\d$/.test(course) && exam.indexOf(course + '-') === 0;
    }

    function isSafeAutoExamCandidate(course, candidate) {
        if (!course || !candidate || !candidate.entry) return false;
        if (candidate.reason === 'course') return true;
        if (candidate.reason !== 'slot') return false;
        var courseTokens = Array.isArray(course.tokens) ? course.tokens : [];
        var entryTokens = Array.isArray(candidate.entry.tokens) ? candidate.entry.tokens : [];
        return courseTokens.some(function (token) {
            var normalized = normalizeExamSlotToken(token);
            return /^[EF]\d-[AB]$/.test(normalized) && entryTokens.indexOf(normalized) !== -1;
        });
    }

    function getExamEntryDateTs(entry) {
        if (entry && typeof entry.dateTs === 'number' && isFinite(entry.dateTs)) return entry.dateTs;
        if (entry && entry.dateIso) return parseIsoToUtcTs(entry.dateIso);
        return null;
    }

    function normalizeExamCalendarEntry(entry) {
        if (!entry) return null;
        var ts = getExamEntryDateTs(entry);
        if (ts === null) return null;
        return {
            dateTs: ts,
            dateIso: entry.dateIso || '',
            dateLabel: entry.dateLabel || '',
            period: normalizeExamClusterText(entry.period || ''),
            text: normalizeExamClusterText(entry.text || ''),
            codes: Array.isArray(entry.codes) ? entry.codes.map(function (c) { return String(c || '').toUpperCase(); }) : [],
            tokens: Array.isArray(entry.tokens) ? entry.tokens.map(function (t) { return normalizeExamSlotToken(t); }).filter(Boolean) : [],
            tags: Array.isArray(entry.tags) ? entry.tags.map(function (t) { return String(t || '').toLowerCase(); }) : []
        };
    }
    function sortExamClusterCandidates(a, b) {
        if (a.score !== b.score) return b.score - a.score;
        if (a.upcoming !== b.upcoming) return a.upcoming ? -1 : 1;
        if (a.upcoming && b.upcoming) return a.entry.dateTs - b.entry.dateTs;
        return b.entry.dateTs - a.entry.dateTs;
    }

    function getExamCandidatesForCourse(course, entries, todayTs) {
        if (!course || !Array.isArray(entries) || !entries.length) return [];

        function getIsoMonth(iso) {
            var mm = String(iso || '').match(/^\d{4}-(\d{2})-\d{2}$/);
            if (!mm || !mm[1]) return null;
            var n = parseInt(mm[1], 10);
            return isNaN(n) ? null : n;
        }

        var placementMonthTags = Array.isArray(course.placementMonthTags) ? course.placementMonthTags : [];
        var expectedExamTags = getExpectedStudyplanExamTags(course);
        var exactSingleSlotPlacement = !shouldPromptForStudyplanExamChoice(course)
            && Array.isArray(course.tokens)
            && course.tokens.length === 1
            && /^[EF]\d-[AB]$/.test(course.tokens[0]);
        var strictCandidates = [];
        var fallbackCandidates = [];

        entries.forEach(function (entry) {
            if (!entry) return;

            var score = 0;
            var reason = '';
            var entryTextTags = parseStudyplanMonthTags(entry.text || '');
            var textMonthMatch = placementMonthTags.length && arrayIntersects(placementMonthTags, entryTextTags);
            var periodMonthMatch = placementMonthTags.length && arrayIntersects(placementMonthTags, entry.tags);
            var isoMonth = getIsoMonth(entry.dateIso);
            var dateMonthMatch = false;
            if (placementMonthTags.length && isoMonth !== null) {
                for (var i = 0; i < placementMonthTags.length; i++) {
                    var num = studyplanMonthTagToNumber(placementMonthTags[i]);
                    if (num !== null && num === isoMonth) {
                        dateMonthMatch = true;
                        break;
                    }
                }
            }
            var placementMonthMatch = textMonthMatch || periodMonthMatch || dateMonthMatch;
            var periodTagMatch = arrayIntersects(course.monthTags, entry.tags);
            var isReplacementExam = /\breplacement\s+exam\b|\berstatningseksamen\b/i.test(entry.text || '');
            var expectedTagMatch = expectedExamTags.length && arrayIntersects(expectedExamTags, entry.tags);
            var matchedTokens = (Array.isArray(course.tokens) ? course.tokens : []).filter(function (token, idx, arr) {
                return token && arr.indexOf(token) === idx && Array.isArray(entry.tokens) && entry.tokens.some(function (entryToken) {
                    return studyplanCourseTokenMatchesExamToken(token, entryToken);
                });
            });
            var tokenMatch = matchedTokens.length > 0;
            var codeMatch = entry.codes.indexOf(course.code) !== -1;

            if (codeMatch) {
                score = 360;
                reason = 'course';
            } else if (tokenMatch) {
                score = 260;
                reason = 'slot';
            } else if (textMonthMatch) {
                score = 225;
                reason = 'month_exact';
                if (/\b3-?weeks?\s+course\b|\b3-?ugers?\s+kursus\b/i.test(entry.text || '')) {
                    score += 20;
                }
                if (isReplacementExam && course.monthTags.indexOf('reexam') === -1) {
                    score -= 25;
                }
            } else if (periodTagMatch) {
                score = placementMonthTags.length ? 70 : 120;
                reason = 'period';
                if (isReplacementExam && course.monthTags.indexOf('reexam') === -1) {
                    score -= 20;
                }
            }
            if (tokenMatch && expectedTagMatch) score += 45;
            if (!tokenMatch && expectedTagMatch) score += 20;
            if (expectedExamTags.length && !expectedTagMatch) {
                if (tokenMatch) score -= 35;
                else score -= 20;
            }
            if (exactSingleSlotPlacement && tokenMatch) score += 60;
            if (exactSingleSlotPlacement && codeMatch && !tokenMatch) score -= 80;
            if (isReplacementExam && course.monthTags.indexOf('reexam') === -1) score -= 40;
            if (!score || score < 1) return;

            var candidate = {
                score: score,
                reason: reason,
                entry: entry,
                upcoming: entry.dateTs >= todayTs,
                placementMonthMatch: !!placementMonthMatch,
                matchedTokens: matchedTokens
            };

            if (placementMonthTags.length) {
                if (placementMonthMatch) strictCandidates.push(candidate);
                else fallbackCandidates.push(candidate);
            } else {
                strictCandidates.push(candidate);
            }
        });

        var candidates = [];
        if (placementMonthTags.length) {
            if (!strictCandidates.length) return [];
            candidates = strictCandidates.slice();
        } else {
            candidates = strictCandidates.length ? strictCandidates.slice() : fallbackCandidates.slice();
        }

        if (!candidates.length) return [];
        candidates.sort(sortExamClusterCandidates);
        return candidates;
    }

    function dedupeExamChoiceOptions(candidates) {
        var byKey = Object.create(null);
        (candidates || []).forEach(function (candidate) {
            if (!candidate || !candidate.entry) return;
            var key = buildStudyplanExamChoiceOptionKey(candidate);
            if (!key) return;
            if (!byKey[key] || sortExamClusterCandidates(candidate, byKey[key]) < 0) {
                byKey[key] = candidate;
            }
        });
        return Object.keys(byKey).map(function (key) {
            var candidate = byKey[key];
            candidate.choiceKey = key;
            return candidate;
        }).sort(function (a, b) {
            if (a.entry.dateTs !== b.entry.dateTs) return a.entry.dateTs - b.entry.dateTs;
            return sortExamClusterCandidates(a, b);
        });
    }

    function resolveExamTimelineChoiceForCourse(course, entries, todayTs, storedChoices) {
        var candidates = getExamCandidatesForCourse(course, entries, todayTs);
        if (!candidates.length) {
            return {
                mapped: [],
                choicePrompt: null
            };
        }

        var concreteCandidates = candidates.filter(function (candidate) {
            return candidate.reason === 'slot' || candidate.reason === 'course';
        });
        var slotCandidates = concreteCandidates.filter(function (candidate) {
            return candidate.reason === 'slot' && Array.isArray(candidate.matchedTokens) && candidate.matchedTokens.length > 0;
        });
        var preferredCandidates = slotCandidates.length ? slotCandidates : (concreteCandidates.length ? concreteCandidates : candidates);
        var choiceOptions = dedupeExamChoiceOptions(preferredCandidates);
        var hasSafeAutoCandidate = choiceOptions.some(function (candidate) {
            return isSafeAutoExamCandidate(course, candidate);
        });
        var needsChoice = choiceOptions.length > 0 && !hasSafeAutoCandidate;

        if (!needsChoice) {
            var safeAutoCandidate = null;
            for (var safeIdx = 0; safeIdx < choiceOptions.length; safeIdx++) {
                if (isSafeAutoExamCandidate(course, choiceOptions[safeIdx])) {
                    safeAutoCandidate = choiceOptions[safeIdx];
                    break;
                }
            }
            if (!safeAutoCandidate) {
                for (var candIdx = 0; candIdx < candidates.length; candIdx++) {
                    if (isSafeAutoExamCandidate(course, candidates[candIdx])) {
                        safeAutoCandidate = candidates[candIdx];
                        break;
                    }
                }
            }
            return {
                mapped: safeAutoCandidate ? [safeAutoCandidate] : [],
                choicePrompt: null
            };
        }

        var courseKey = buildStudyplanExamChoiceCourseKey(course);
        var selectedChoiceKey = storedChoices && storedChoices[courseKey] ? String(storedChoices[courseKey]) : '';
        var selectedOption = null;
        for (var i = 0; i < choiceOptions.length; i++) {
            if (choiceOptions[i].choiceKey === selectedChoiceKey) {
                selectedOption = choiceOptions[i];
                break;
            }
        }

        return {
            mapped: selectedOption ? [selectedOption] : [],
            choicePrompt: {
                courseKey: courseKey,
                code: course.code,
                name: course.name,
                placementText: course.placementText,
                options: choiceOptions,
                selectedChoiceKey: selectedOption ? selectedOption.choiceKey : '',
                required: !selectedOption
            }
        };
    }

    function resolveStudyplanExamTimelineData(courses, rawEntries) {


        var todayTs = startOfTodayUtcTs();
        var entries = (rawEntries || []).map(normalizeExamCalendarEntry).filter(Boolean);
        var storedChoices = getStoredStudyplanExamChoices();
        var baseMapped = [];
        var choicePrompts = [];
        var allChoicePrompts = [];

        courses.forEach(function (course) {
            var resolution = resolveExamTimelineChoiceForCourse(course, entries, todayTs, storedChoices);
            if (resolution.choicePrompt) {
                allChoicePrompts.push(resolution.choicePrompt);
                if (resolution.choicePrompt.required) choicePrompts.push(resolution.choicePrompt);
            }

            (resolution.mapped || []).forEach(function (match) {
                if (!match || !match.entry) return;
                var dayDelta = diffDaysUtc(todayTs, match.entry.dateTs);
                baseMapped.push({
                    code: course.code,
                    name: course.name,
                    placementText: course.placementText,
                    periodText: course.periodText,
                    matchReason: match.reason,
                    matchedTokens: Array.isArray(match.matchedTokens) ? match.matchedTokens.slice() : [],
                    dateTs: match.entry.dateTs,
                    dateIso: match.entry.dateIso,
                    dateLabel: match.entry.dateLabel || formatIsoDateForDisplay(match.entry.dateIso),
                    examPeriod: match.entry.period,
                    examText: match.entry.text,
                    examChoiceCount: resolution.choicePrompt && Array.isArray(resolution.choicePrompt.options) ? resolution.choicePrompt.options.length : 1,
                    examChoiceKey: resolution.choicePrompt ? resolution.choicePrompt.selectedChoiceKey : '',
                    baseKey: '',
                    daysUntil: dayDelta
                });
            });
        });

        baseMapped.forEach(function (item) {
            item.baseKey = buildStudyplanExamTimelineBaseKey(item);
        });
        var mapped = applyStudyplanExamTimelineOverrides(baseMapped, todayTs);
        return {
            mapped: mapped,
            baseMapped: baseMapped,
            choicePrompts: choicePrompts,
            allChoicePrompts: allChoicePrompts
        };
    }

    function applyStudyplanExamTimelineOverrides(baseMapped, todayTs) {
        var overrides = getStoredStudyplanExamTimelineOverrides();
        var out = [];

        (baseMapped || []).forEach(function (item) {
            if (!item) return;
            var baseKey = item.baseKey || buildStudyplanExamTimelineBaseKey(item);
            if (overrides.deleted && overrides.deleted[baseKey]) return;

            var edit = overrides.edits && overrides.edits[baseKey] ? overrides.edits[baseKey] : null;
            var next = Object.assign({}, item);
            next.baseKey = baseKey;
            next.isCustom = false;

            if (edit && typeof edit === 'object') {
                if (edit.code) next.code = String(edit.code).trim().toUpperCase();
                if (edit.name !== undefined) next.name = String(edit.name).trim();
                if (edit.dateIso) {
                    var overrideTs = parseIsoToUtcTs(edit.dateIso);
                    if (overrideTs !== null) {
                        next.dateIso = edit.dateIso;
                        next.dateTs = overrideTs;
                        next.dateLabel = formatIsoDateForDisplay(edit.dateIso);
                    }
                }
            }

            if (next.dateTs >= todayTs) {
                next.daysUntil = diffDaysUtc(todayTs, next.dateTs);
                out.push(next);
            }
        });

        (overrides.custom || []).forEach(function (entry) {
            if (!entry || !entry.dateIso) return;
            var ts = parseIsoToUtcTs(entry.dateIso);
            if (ts === null || ts < todayTs) return;
            var code = String(entry.code || '').trim().toUpperCase();
            var name = String(entry.name || '').trim();
            out.push({
                code: code || 'CUSTOM',
                name: name || 'Custom exam',
                placementText: '',
                periodText: '',
                matchReason: 'manual',
                matchedTokens: [],
                dateTs: ts,
                dateIso: entry.dateIso,
                dateLabel: formatIsoDateForDisplay(entry.dateIso),
                examPeriod: 'Manual',
                examText: 'Manual entry',
                examChoiceCount: 1,
                examChoiceKey: '',
                baseKey: String(entry.id || ''),
                isCustom: true,
                customId: String(entry.id || ''),
                daysUntil: diffDaysUtc(todayTs, ts)
            });
        });

        out.sort(function (a, b) {
            return a.dateTs - b.dateTs;
        });
        for (var i = 1; i < out.length; i++) {
            out[i].gapFromPrev = diffDaysUtc(out[i - 1].dateTs, out[i].dateTs);
        }
        if (out.length) out[0].gapFromPrev = null;
        return out;
    }

    function buildExamClusterWarnings(mapped) {
        var warnings = [];
        if (!Array.isArray(mapped) || mapped.length < 2) return warnings;

        var byDate = Object.create(null);
        mapped.forEach(function (item) {
            if (!item || !item.dateIso) return;
            if (!byDate[item.dateIso]) byDate[item.dateIso] = [];
            byDate[item.dateIso].push(item);
        });

        Object.keys(byDate).forEach(function (iso) {
            var items = byDate[iso];
            if (items.length >= 2) {
                warnings.push({
                    level: 'critical',
                    text: items.length + ' exams on ' + formatIsoDateForDisplay(iso)
                });
            }
        });

        for (var i = 1; i < mapped.length; i++) {
            var gap = mapped[i].gapFromPrev;
            if (typeof gap !== 'number') continue;
            if (gap === 1) {
                warnings.push({
                    level: 'high',
                    text: '1 day between ' + mapped[i - 1].code + ' and ' + mapped[i].code
                });
            }
        }

        var denseAdded = false;
        for (var start = 0; start < mapped.length && !denseAdded; start++) {
            for (var end = start + 2; end < mapped.length; end++) {
                var span = diffDaysUtc(mapped[start].dateTs, mapped[end].dateTs);
                if (span <= 4) {
                    warnings.push({
                        level: 'medium',
                        text: (end - start + 1) + ' exams within ' + (span + 1) + ' days'
                    });
                    denseAdded = true;
                    break;
                }
            }
        }

        return warnings;
    }

    function summarizeExamClusterWarnings(warnings) {
        var out = {
            level: null,
            sameDay: 0,
            oneDay: 0,
            dense: null
        };
        if (!Array.isArray(warnings) || !warnings.length) return out;

        warnings.forEach(function (w) {
            if (!w || !w.text) return;
            if (w.level === 'critical') out.level = 'critical';
            else if (!out.level && w.level === 'high') out.level = 'high';
            else if (!out.level && w.level === 'medium') out.level = 'medium';

            if (/exams on/i.test(w.text)) out.sameDay++;
            if (/1 day between/i.test(w.text)) out.oneDay++;
            if (!out.dense && /within\s+\d+\s+days/i.test(w.text)) out.dense = w.text;
        });

        return out;
    }

    function clearNodeChildren(node) {
        if (!node) return;
        while (node.firstChild) node.removeChild(node.firstChild);
    }

    function ensureStudyplanExamClusterContainer() {
        var container = document.querySelector('[data-dtu-exam-cluster]');
        if (!container) {
            var dark = isDarkMode();
            container = document.createElement('div');
            markExt(container);
            container.setAttribute('data-dtu-exam-cluster', '1');
            container.style.cssText = dark
                ? 'margin: 12px 0 14px 0; padding: 16px 18px 14px; border-radius: 10px; width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden; '
                + 'background-color: #2d2d2d; border: 1px solid rgba(255,255,255,0.08); color: #e6e6e6; font-family: inherit;'
                : 'margin: 12px 0 14px 0; padding: 16px 18px 14px; border-radius: 10px; width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden; '
                + 'background-color: #ffffff; border: 1px solid rgba(148,163,184,0.28); color: #1f2937; font-family: inherit;';

            var title = document.createElement('div');
            markExt(title);
            title.setAttribute('data-dtu-exam-cluster-title', '1');
            title.style.cssText = 'display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;flex-wrap:wrap;';
            var titleText = document.createElement('span');
            markExt(titleText);
            titleText.setAttribute('data-dtu-exam-cluster-title-text', '1');
            titleText.textContent = 'Exam Schedule & Gaps';
            titleText.style.cssText = 'font-weight:800;font-size:16px;line-height:1.15;min-width:0;flex:1 1 auto;letter-spacing:-0.01em;';
            title.appendChild(titleText);

            var titleMeta = document.createElement('div');
            markExt(titleMeta);
            titleMeta.setAttribute('data-dtu-exam-cluster-title-meta', '1');
            titleMeta.style.cssText = 'display:flex;align-items:center;gap:10px;margin-left:auto;flex:0 0 auto;flex-wrap:wrap;justify-content:flex-end;';
            title.appendChild(titleMeta);
            container.appendChild(title);

            var body = document.createElement('div');
            markExt(body);
            body.setAttribute('data-dtu-exam-cluster-body', '1');
            body.style.cssText = 'font-size:12px;line-height:1.45;display:flex;flex-direction:column;gap:10px;';
            container.appendChild(body);
        }

        var preferredParent = null;
        var preferredBefore = null;
        var fixedPanel = document.querySelector('.col-md-6 .fixed.scrollLocked');
        if (fixedPanel) {
            preferredParent = fixedPanel;
            preferredBefore = fixedPanel.querySelector('div[style*="margin-top:10px"]');
        }

        if (!preferredParent) {
            var anchor = document.querySelector('.box');
            if (anchor && anchor.parentNode) {
                preferredParent = anchor.parentNode;
                preferredBefore = anchor;
            }
        }

        if (preferredParent) {
            var needsMove = container.parentNode !== preferredParent;
            if (needsMove) {
                preferredParent.insertBefore(container, preferredBefore || null);
            }
        } else if (!container.parentNode && document.body) {
            document.body.insertBefore(container, document.body.firstChild);
        }

        return container;
    }

    function renderExamClusterStatus(body, text, isWarn) {
        clearNodeChildren(body);
        var el = document.createElement('div');
        markExt(el);
        el.textContent = text;
        var statusColor = isWarn
            ? (isDarkMode() ? 'var(--dtu-ad-status-warning)' : 'var(--dtu-ad-status-warning-strong)')
            : 'var(--dtu-ad-status-info)';
        el.style.cssText = 'font-size: 12px; color: ' + statusColor + ';';
        body.appendChild(el);
        body.setAttribute('data-dtu-exam-cluster-state', isWarn ? 'warn' : 'info');
    }

    function formatExamClusterShortDate(ts) {
        var d = new Date(ts);
        var weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var wd = weekdays[d.getUTCDay()];
        var mon = months[d.getUTCMonth()];
        var day = d.getUTCDate();
        return wd + ', ' + mon + ' ' + day;
    }

    function getStudyplanExamsApi() {
        return globalThis.DTUAfterDarkStudyplanExamsUi || null;
    }

    globalThis.DTUAfterDarkStudyplanExamsDeps = {
        isTopWindow: isTopWindow,
        isDarkMode: isDarkMode,
        markExt: markExt,
        formatExamClusterShortDate: formatExamClusterShortDate,
        buildStudyplanExamChoiceOptionKey: buildStudyplanExamChoiceOptionKey,
        setStoredStudyplanExamChoice: setStoredStudyplanExamChoice,
        getStoredStudyplanExamTimelineOverrides: getStoredStudyplanExamTimelineOverrides,
        saveStoredStudyplanExamTimelineOverrides: saveStoredStudyplanExamTimelineOverrides,
        formatStudyplanExamEditDate: formatStudyplanExamEditDate,
        parseStudyplanExamEditDate: parseStudyplanExamEditDate,
        parseIsoToUtcTs: parseIsoToUtcTs,
        buildStudyplanExamTimelineBaseKey: buildStudyplanExamTimelineBaseKey,
        buildStudyplanExamTimelineCustomId: buildStudyplanExamTimelineCustomId,
        buildExamClusterWarnings: buildExamClusterWarnings,
        summarizeExamClusterWarnings: summarizeExamClusterWarnings,
        clearNodeChildren: clearNodeChildren,
        ensureStudyplanExamClusterContainer: ensureStudyplanExamClusterContainer,
        renderExamClusterStatus: renderExamClusterStatus,
        requestRender: function () { insertStudyplanExamCluster(); },
        getState: function () {
            return {
                choiceEditorOpen: !!_studyplanExamChoiceEditorOpen,
                lastRenderedSig: _studyplanExamClusterLastRenderedSig
            };
        },
        setState: function (patch) {
            if (!patch || typeof patch !== 'object') return;
            if (Object.prototype.hasOwnProperty.call(patch, 'choiceEditorOpen')) {
                _studyplanExamChoiceEditorOpen = !!patch.choiceEditorOpen;
            }
            if (Object.prototype.hasOwnProperty.call(patch, 'lastRenderedSig')) {
                _studyplanExamClusterLastRenderedSig = String(patch.lastRenderedSig || '');
            }
        }
    };

    function removeStudyplanExamEditorModal() {
        var api = getStudyplanExamsApi();
        if (api && typeof api.removeStudyplanExamEditorModal === 'function') {
            return api.removeStudyplanExamEditorModal();
        }
        var existing = document.querySelector('.dtu-studyplan-exam-editor-modal');
        if (existing) existing.remove();
    }

    function renderStudyplanExamCluster(courses, mapped, baseMapped, response, errorText, choicePrompts, allChoicePrompts) {
        var api = getStudyplanExamsApi();
        if (!api || typeof api.renderStudyplanExamCluster !== 'function') return false;
        api.renderStudyplanExamCluster(courses, mapped, baseMapped, response, errorText, choicePrompts, allChoicePrompts);
        return true;
    }

    function injectGradeCountdowns(mapped) {
        var api = getStudyplanExamsApi();
        if (!api || typeof api.injectGradeCountdowns !== 'function') return;
        return api.injectGradeCountdowns(mapped);
    }

    function insertStudyplanExamCluster() {
        if (!isTopWindow()) return;
        if (!isStudyplanExamClusterEnabled()) {
            var existing = document.querySelector('[data-dtu-exam-cluster]');
            if (existing) existing.remove();
            removeStudyplanExamEditorModal();
            _studyplanExamChoiceEditorOpen = false;
            _studyplanExamClusterLastRenderedSig = '';
            _studyplanExamClusterLastCalendar = null;
            return;
        }
        if (window.location.hostname !== 'studieplan.dtu.dk') {
            removeStudyplanExamEditorModal();
            _studyplanExamChoiceEditorOpen = false;
            return;
        }

        var courses = collectStudyplanUpcomingExamCourses();
        var courseSig = buildStudyplanExamCourseSig(courses);

        if (!courses.length) {
            if (_studyplanExamClusterLastRenderedSig !== 'none') {
                if (renderStudyplanExamCluster(courses, [], [], null, null, [], [])) {
                    _studyplanExamClusterLastRenderedSig = 'none';
                }
            }
            return;
        }

        if (_studyplanExamClusterRequestInFlight) {
            _studyplanExamClusterLastSig = courseSig;
            return;
        }

        if (courseSig === _studyplanExamClusterLastRenderedSig
            && _studyplanExamClusterLastCalendar
            && Array.isArray(_studyplanExamClusterLastCalendar.entries)
            && _studyplanExamClusterLastCalendar.entries.length) {
            return;
        }

        _studyplanExamClusterRequestInFlight = true;
        _studyplanExamClusterLastSig = courseSig;
        var requestedSig = courseSig;

        var container = ensureStudyplanExamClusterContainer();
        var body = container.querySelector('[data-dtu-exam-cluster-body]');
        if (body && !body.firstChild) renderExamClusterStatus(body, 'Loading exam calendar...', false);

        sendRuntimeMessage({ type: 'dtu-exam-calendar' }, function (response) {
            _studyplanExamClusterRequestInFlight = false;

            if (requestedSig !== _studyplanExamClusterLastSig) {
                scheduleStudyplanExamCluster(120);
                return;
            }

            if (!response || !response.ok || !Array.isArray(response.entries)) {
                _studyplanExamClusterLastCalendar = null;
                var errText = 'Exam calendar unavailable right now.';
                if (response && response.debug && Array.isArray(response.debug.attempts) && response.debug.attempts.length) {
                    var firstAttempt = response.debug.attempts[0];
                    if (firstAttempt && firstAttempt.step) errText += ' (' + firstAttempt.step + ')';
                }
                if (renderStudyplanExamCluster(courses, [], [], response, errText, [], [])) {
                    _studyplanExamClusterLastRenderedSig = requestedSig;
                } else {
                    _studyplanExamClusterLastRenderedSig = '';
                    scheduleStudyplanExamCluster(350);
                }
                return;
            }

            _studyplanExamClusterLastCalendar = response;
            var timelineData = resolveStudyplanExamTimelineData(courses, response.entries);
            var mapped = timelineData && Array.isArray(timelineData.mapped) ? timelineData.mapped : [];
            var baseMapped = timelineData && Array.isArray(timelineData.baseMapped) ? timelineData.baseMapped : [];
            var choicePrompts = timelineData && Array.isArray(timelineData.choicePrompts) ? timelineData.choicePrompts : [];
            var allChoicePrompts = timelineData && Array.isArray(timelineData.allChoicePrompts) ? timelineData.allChoicePrompts : [];
            if (renderStudyplanExamCluster(courses, mapped, baseMapped, response, null, choicePrompts, allChoicePrompts)) {
                _studyplanExamClusterLastRenderedSig = requestedSig;
                injectGradeCountdowns(mapped);
            } else {
                _studyplanExamClusterLastRenderedSig = '';
                scheduleStudyplanExamCluster(350);
            }
        });
    }

    function scheduleStudyplanExamCluster(delayMs) {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'studieplan.dtu.dk') return;
        if (!isStudyplanExamClusterEnabled()) return;
        if (_studyplanExamClusterTimer) return;
        _studyplanExamClusterTimer = setTimeout(function () {
            _studyplanExamClusterTimer = null;
            insertStudyplanExamCluster();
        }, delayMs || 800);
    }

    function bootstrapStudyplanExamCluster() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'studieplan.dtu.dk') return;
        scheduleStudyplanExamCluster(450);
        window.addEventListener('load', function () {
            _studyplanExamClusterLastRenderedSig = '';
            scheduleStudyplanExamCluster(300);
        }, { once: true });
        window.addEventListener('pageshow', function () {
            _studyplanExamClusterLastRenderedSig = '';
            scheduleStudyplanExamCluster(180);
        });
    }

    try {
        globalThis.DTUAfterDarkStudyplanRuntime = {
            normalizeExamClusterText: normalizeExamClusterText,
            getStoredStudyplanExamChoices: getStoredStudyplanExamChoices,
            saveStoredStudyplanExamChoices: saveStoredStudyplanExamChoices,
            buildStudyplanExamChoiceCourseKey: buildStudyplanExamChoiceCourseKey,
            buildStudyplanExamChoiceOptionKey: buildStudyplanExamChoiceOptionKey,
            setStoredStudyplanExamChoice: setStoredStudyplanExamChoice,
            getStoredStudyplanExamTimelineOverrides: getStoredStudyplanExamTimelineOverrides,
            saveStoredStudyplanExamTimelineOverrides: saveStoredStudyplanExamTimelineOverrides,
            buildStudyplanExamTimelineBaseKey: buildStudyplanExamTimelineBaseKey,
            buildStudyplanExamTimelineCustomId: buildStudyplanExamTimelineCustomId,
            formatIsoDateForDisplay: formatIsoDateForDisplay,
            formatStudyplanExamEditDate: formatStudyplanExamEditDate,
            parseStudyplanExamEditDate: parseStudyplanExamEditDate,
            parseIsoToUtcTs: parseIsoToUtcTs,
            startOfTodayUtcTs: startOfTodayUtcTs,
            diffDaysUtc: diffDaysUtc,
            buildExamClusterWarnings: buildExamClusterWarnings,
            summarizeExamClusterWarnings: summarizeExamClusterWarnings,
            clearNodeChildren: clearNodeChildren,
            ensureStudyplanExamClusterContainer: ensureStudyplanExamClusterContainer,
            renderExamClusterStatus: renderExamClusterStatus,
            formatExamClusterShortDate: formatExamClusterShortDate,
            removeStudyplanExamEditorModal: removeStudyplanExamEditorModal,
            insertStudyplanExamCluster: insertStudyplanExamCluster,
            scheduleStudyplanExamCluster: scheduleStudyplanExamCluster,
            getState: function () {
                return {
                    choiceEditorOpen: !!_studyplanExamChoiceEditorOpen,
                    lastRenderedSig: _studyplanExamClusterLastRenderedSig
                };
            },
            setState: function (patch) {
                if (!patch || typeof patch !== 'object') return;
                if (Object.prototype.hasOwnProperty.call(patch, 'choiceEditorOpen')) {
                    _studyplanExamChoiceEditorOpen = !!patch.choiceEditorOpen;
                }
                if (Object.prototype.hasOwnProperty.call(patch, 'lastRenderedSig')) {
                    _studyplanExamClusterLastRenderedSig = String(patch.lastRenderedSig || '');
                }
            }
        };
    } catch (eExport) { }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrapStudyplanExamCluster, { once: true });
    } else {
        bootstrapStudyplanExamCluster();
    }
})();
