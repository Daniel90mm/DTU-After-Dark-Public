(function () {
    'use strict';
    var isTopWindow = globalThis.DTUAfterDarkDom.isTopWindow;

    var GPA_SIM_STORAGE_KEY = 'gpaSimEntries';
    var GPA_EXCLUDED_ACTUAL_STORAGE_KEY = 'gpaExcludedActualRows';
    // The grade rows seen on the last visit, so a grade that arrived since gets a "New" mark once.
    var GRADES_SEEN_STORAGE_KEY = 'dtuCampusnetGradesSeenV1';
    var NEW_GRADES_MAX = 8;
    var _newGradeKeys = null;
    var DANISH_GRADES = [12, 10, 7, 4, 2, 0, -3];

    function getDeps() {
        var deps = globalThis.DTUAfterDarkCampusnetGpaDeps;
        if (!deps) throw new Error('CampusNet GPA dependencies are missing');
        return deps;
    }

    function getDep(name) {
        var dep = getDeps()[name];
        if (typeof dep !== 'function') throw new Error('CampusNet GPA dependency ' + name + ' is missing');
        return dep;
    }

    function isFeatureEnabled() {
        return !!getDep('isFeatureEnabled')();
    }

    function isDarkMode() {
        return !!getDep('isDarkMode')();
    }

    function setSuppressHeavyWork(value) {
        getDep('setSuppressHeavyWork')(!!value);
    }

    function isCampusnetGradesPage() {
        return window.location.hostname === 'campusnet.dtu.dk'
            && /\/cnnet\/Grades\//i.test(window.location.pathname);
    }

    function getCampusnetGradesTable() {
        return document.querySelector('table.gradesList');
    }

    function normalizeCampusnetGradeCellText(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function getCampusnetActualGradeCellText(cell) {
        if (!cell) return '';
        try {
            var clone = cell.cloneNode(true);
            clone.querySelectorAll('.gpa-actual-toggle-btn, .gpa-new-grade').forEach(function (btn) {
                btn.remove();
            });
            return normalizeCampusnetGradeCellText(clone.textContent);
        } catch (e) {
            return normalizeCampusnetGradeCellText(cell.textContent);
        }
    }

    function parseCampusnetActualGradeRow(row) {
        if (!row || row.classList.contains('gradesListHeader')
            || row.classList.contains('gpa-row')
            || row.classList.contains('gpa-projected-row')
            || row.classList.contains('gpa-sim-row')
            || row.classList.contains('gpa-sim-add-row')
            || row.classList.contains('gpa-sim-disclaimer-row')) return null;
        var cells = row.querySelectorAll('td');
        if (cells.length < 4) return null;

        var code = getCampusnetActualGradeCellText(cells[0]);
        var title = getCampusnetActualGradeCellText(cells[1]);
        var gradeSpan = cells[2].querySelector('span');
        var gradeText = normalizeCampusnetGradeCellText(gradeSpan ? gradeSpan.textContent : cells[2].textContent);
        var numericMatch = gradeText.replace(/^[\u2212\u2013]/, '-').match(/^(-?\d+)/);
        var numericGrade = numericMatch ? parseInt(numericMatch[1], 10) : null;
        var ects = parseFloat(normalizeCampusnetGradeCellText(cells[3].textContent).replace(',', '.'));
        var term = normalizeCampusnetGradeCellText(cells[4] ? cells[4].textContent : '');
        var safeEcts = (!isNaN(ects) && ects > 0) ? ects : 0;
        var baseSignature = [code, title, gradeText, safeEcts, term].join('|').toLowerCase();

        return {
            row: row,
            cells: cells,
            numericGrade: numericGrade,
            ects: safeEcts,
            baseSignature: baseSignature,
            countsForGpa: numericGrade !== null && safeEcts > 0
        };
    }

    function getCampusnetActualGradeEntries(table) {
        var scope = table || getCampusnetGradesTable();
        if (!scope) return [];
        var rows = scope.querySelectorAll('tr');
        var entries = [];
        var seen = new Map();
        rows.forEach(function (row) {
            var entry = parseCampusnetActualGradeRow(row);
            if (!entry) return;
            var occurrence = (seen.get(entry.baseSignature) || 0) + 1;
            seen.set(entry.baseSignature, occurrence);
            entry.signature = entry.baseSignature + '|occ:' + occurrence;
            entries.push(entry);
        });
        return entries;
    }

    // null means the saved list exists but could not be read: the GPA must not then
    // silently count the courses the student ignored. No saved list is [].
    function readCampusnetExcludedActualGradeSignatures() {
        try {
            var raw = localStorage.getItem(GPA_EXCLUDED_ACTUAL_STORAGE_KEY);
            if (!raw) return [];
            var parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return null;
            return parsed.filter(function (item) {
                return typeof item === 'string' && item.trim();
            });
        } catch (e) {
            return null;
        }
    }

    function writeCampusnetExcludedActualGradeSignatures(signatures) {
        var unique = Array.from(new Set(
            (Array.isArray(signatures) ? signatures : []).filter(function (item) {
                return typeof item === 'string' && item.trim();
            })));
        localStorage.setItem(GPA_EXCLUDED_ACTUAL_STORAGE_KEY, JSON.stringify(unique));
    }

    function calculateCampusnetWeightedGpa(entries) {
        var totalWeighted = 0;
        var totalECTS = 0;

        (Array.isArray(entries) ? entries : []).forEach(function (entry) {
            if (!entry || !entry.countsForGpa || !Number.isFinite(entry.numericGrade)
                || !Number.isFinite(entry.ects) || entry.ects <= 0) return;
            totalWeighted += entry.numericGrade * entry.ects;
            totalECTS += entry.ects;
        });

        var average = totalECTS > 0 ? totalWeighted / totalECTS : null;
        return {
            totalWeighted: totalWeighted,
            totalECTS: totalECTS,
            average: average,
            gpa: average === null ? null : Number(average.toFixed(2))
        };
    }

    function getCampusnetActualGradeSummary(table) {
        var entries = getCampusnetActualGradeEntries(table);
        var excludedList = readCampusnetExcludedActualGradeSignatures();
        var excludedSet = new Set(excludedList || []);
        var excludedCount = 0;

        entries.forEach(function (entry) {
            entry.excluded = excludedSet.has(entry.signature);
            if (entry.excluded) excludedCount++;
        });

        var weightedGpa = calculateCampusnetWeightedGpa(entries.filter(function (entry) {
            return !entry.excluded;
        }));

        return {
            entries: entries,
            totalWeighted: weightedGpa.totalWeighted,
            totalECTS: weightedGpa.totalECTS,
            averageGpa: weightedGpa.average,
            gpa: excludedList ? weightedGpa.gpa : null,
            exclusionsUnreadable: !excludedList,
            excludedCount: excludedCount
        };
    }

    function clearCampusnetActualGradeExclusionUi(table) {
        var scope = table || getCampusnetGradesTable();
        if (!scope) return;
        scope.querySelectorAll('.gpa-actual-toggle-btn, .gpa-new-grade').forEach(function (btn) {
            btn.remove();
        });
        scope.querySelectorAll('.gpa-actual-excluded').forEach(function (row) {
            row.classList.remove('gpa-actual-excluded');
            row.removeAttribute('data-gpa-actual-excluded');
        });
        scope.querySelectorAll('[data-gpa-actual-inline-muted="1"]')
            .forEach(clearCampusnetGpaMutedInlineStyles);
    }

    function setCampusnetGpaAttribute(el, name, value) {
        if (el.getAttribute(name) !== value) el.setAttribute(name, value);
    }

    var _campusnetGpaStyleState = new WeakMap();

    function setCampusnetGpaStyle(el, name, value, priority) {
        var expectedPriority = priority || '';
        var current = el.style.getPropertyValue(name);
        var currentPriority = el.style.getPropertyPriority(name);
        var saved = _campusnetGpaStyleState.get(el);
        var previous = saved && saved[name];
        // CSSOM canonicalizes values such as hex colors and zero-width borders.
        // Compare with the value read back after the last write, while detecting
        // styles overwritten by another renderer.
        if (previous && previous.value === value && previous.priority === expectedPriority
            && previous.actual === current && currentPriority === expectedPriority) return;
        if (current !== value || currentPriority !== expectedPriority) {
            el.style.setProperty(name, value, expectedPriority);
        }
        if (!saved) { saved = {}; _campusnetGpaStyleState.set(el, saved); }
        saved[name] = { value: value, priority: expectedPriority, actual: el.style.getPropertyValue(name) };
    }

    function setCampusnetGpaStyles(el, styles, priority) {
        styles.forEach(function (pair) {
            setCampusnetGpaStyle(el, pair[0], pair[1], priority);
        });
    }

    function clearCampusnetGpaMutedInlineStyles(el) {
        if (!el || !el.style) return;
        el.removeAttribute('data-gpa-actual-inline-muted');
        ['background', 'background-color', 'color', 'text-decoration'].forEach(function (name) {
            el.style.removeProperty(name);
        });
    }

    function createCampusnetGpaCell(cssText, text) {
        var cell = document.createElement('td');
        cell.setAttribute('data-dtu-ext', '1');
        if (cssText) cell.style.cssText = cssText;
        cell.textContent = text;
        return cell;
    }

    function createCampusnetGpaCells(labelText, gradeText, ectsText, noteText, noteCss) {
        var label = createCampusnetGpaCell('text-align: left; font-weight: bold; padding: 8px 0;', labelText);
        label.colSpan = 2;
        label.style.setProperty('padding-left', '5px', 'important');
        label.style.setProperty('padding-right', '0', 'important');
        return {
            label: label,
            grade: createCampusnetGpaCell(
                'text-align: right; padding-right: 5px; font-weight: bold; white-space: nowrap;', gradeText),
            ects: createCampusnetGpaCell(
                'text-align: right; padding-right: 5px; font-weight: bold;', ectsText),
            note: createCampusnetGpaCell(
                noteCss || 'text-align: right; padding-right: 5px; font-size: 11px;', noteText)
        };
    }

    function createCampusnetGpaMessageRow(className, text, cssText, color) {
        var row = document.createElement('tr');
        row.className = className;
        row.setAttribute('data-dtu-ext', '1');
        var cell = createCampusnetGpaCell(cssText, text);
        cell.colSpan = 5;
        cell.style.setProperty('color', color, 'important');
        row.appendChild(cell);
        return row;
    }

    function applyCampusnetActualGradeToggleButtonState(btn, excluded) {
        if (!btn || !btn.style) return;
        if (btn.classList.contains('is-excluded') !== !!excluded) btn.classList.toggle('is-excluded', !!excluded);
        setCampusnetGpaAttribute(btn, 'aria-pressed', excluded ? 'true' : 'false');
        var text = excluded ? 'Back' : 'Hide';
        if (btn.textContent !== text) btn.textContent = text;
        var title = excluded
            ? 'Include this course again in GPA and ECTS calculations'
            : 'Ignore this course in GPA and ECTS calculations';
        if (btn.title !== title) btn.title = title;
        setCampusnetGpaAttribute(btn, 'aria-label', excluded ? 'Include this course in GPA again' : 'Exclude this course from GPA');
        // The base accent at reduced opacity was ~1.3:1 on the dark rows;
        // the soft accent is the dark-surface text accent used elsewhere.
        var fg = isDarkMode()
            ? (excluded ? '#c9ced6' : 'var(--dtu-ad-accent-soft)')
            : (excluded ? 'rgba(var(--dtu-ad-accent-deep-rgb), 0.78)' : 'rgba(var(--dtu-ad-accent-deep-rgb), 0.92)');
        // Padding lifts the click target from 24x13 to at least 24px tall.
        setCampusnetGpaStyles(btn, [
            ['background', 'transparent'], ['background-color', 'transparent'], ['color', fg],
            ['border', '0'], ['border-radius', '0'], ['box-shadow', 'none'],
            ['appearance', 'none'], ['-webkit-appearance', 'none'],
            ['padding', '5px 6px'], ['min-height', '24px'], ['display', 'inline-flex'],
            ['align-items', 'center'], ['justify-content', 'center'], ['float', 'right'],
            ['clear', 'none'], ['margin-top', '0'], ['margin-left', '0'], ['margin-right', '6px'],
            ['line-height', '1.2'], ['white-space', 'nowrap'], ['vertical-align', 'middle']
        ], 'important');
    }

    function applyCampusnetActualGradeExcludedRowInlineStyles(entry, excluded) {
        if (!entry || !entry.row || !entry.row.querySelectorAll) return;

        if (!excluded) {
            entry.row.querySelectorAll('[data-gpa-actual-inline-muted="1"]')
                .forEach(clearCampusnetGpaMutedInlineStyles);
            var courseNumberCell = entry.cells && entry.cells[0];
            if (courseNumberCell && courseNumberCell.querySelectorAll) {
                // Course numbers link to their grade distribution, so they read as links
                // in the accent kept at 4.5:1 on this surface. KU codes have no link.
                var linkColor = isDarkMode()
                    ? 'var(--dtu-ad-accent-mark-dark, #ff6b6b)'
                    : 'var(--dtu-ad-accent-mark-light, #990000)';
                courseNumberCell.querySelectorAll('a').forEach(function (link) {
                    if (!link || !link.style) return;
                    setCampusnetGpaStyle(link, 'color', linkColor, 'important');
                    setCampusnetGpaStyle(link, 'text-decoration', 'underline', 'important');
                });
            }
            return;
        }

        var rowBg = isDarkMode() ? '#1f1f1f' : '#f3f4f6';
        var mutedText = isDarkMode() ? '#a8afb8' : '#6b7280';

        entry.row.querySelectorAll('td').forEach(function (cell) {
            if (!cell || !cell.style) return;
            setCampusnetGpaAttribute(cell, 'data-gpa-actual-inline-muted', '1');
            setCampusnetGpaStyles(cell, [
                ['background', rowBg], ['background-color', rowBg],
                ['color', mutedText], ['text-decoration', 'line-through']
            ], 'important');
        });

        entry.row.querySelectorAll('td span, td a').forEach(function (el) {
            if (!el || !el.style) return;
            if (el.closest && el.closest('.gpa-actual-toggle-btn')) return;
            setCampusnetGpaAttribute(el, 'data-gpa-actual-inline-muted', '1');
            setCampusnetGpaStyles(el, [['color', mutedText], ['text-decoration', 'line-through']], 'important');
        });
    }

    // Grade, ECTS and Date widths, wide enough for the planned-grade inputs and the
    // "N ignored" note. The Title column takes the rest.
    var CAMPUSNET_GRADE_COLUMN_WIDTHS = ['220px', null, '96px', '84px', '100px'];

    function applyCampusnetActualGradeColumnLayout(table) {
        var scope = table || getCampusnetGradesTable();
        if (!scope) return;
        scope.querySelectorAll('tr.gradesListHeader td:first-child, tr.context_direct td:first-child, tr.context_alternating td:first-child').forEach(function (cell) {
            if (!cell || !cell.style) return;
            setCampusnetGpaStyles(cell,
                [['width', '220px'], ['min-width', '220px'], ['white-space', 'nowrap']], 'important');
        });
        // Fixed layout takes column widths from the header row, so hiding a grade (which
        // adds "1 ignored" under Date) or adding a planned grade (inputs under Grade
        // and ECTS) can no longer push the right-hand columns sideways.
        var header = scope.querySelector && scope.querySelector('tr.gradesListHeader');
        if (!header || !header.children || header.children.length !== CAMPUSNET_GRADE_COLUMN_WIDTHS.length) return;
        setCampusnetGpaAttribute(scope, 'data-gpa-fixed-columns', '1');
        setCampusnetGpaStyles(scope, [['table-layout', 'fixed'], ['width', '100%']], 'important');
        CAMPUSNET_GRADE_COLUMN_WIDTHS.forEach(function (width, index) {
            var cell = header.children[index];
            if (!width || !cell || !cell.style) return;
            setCampusnetGpaStyle(cell, 'width', width, 'important');
        });
    }

    function clearCampusnetActualGradeColumnLayout(table) {
        var scope = table || getCampusnetGradesTable();
        if (!scope || !scope.getAttribute || scope.getAttribute('data-gpa-fixed-columns') !== '1') return;
        scope.removeAttribute('data-gpa-fixed-columns');
        scope.style.removeProperty('table-layout');
        scope.style.removeProperty('width');
        var header = scope.querySelector('tr.gradesListHeader');
        var cells = header ? Array.prototype.slice.call(header.children) : [];
        cells = cells.concat(Array.prototype.slice.call(
            scope.querySelectorAll('tr.context_direct td:first-child, tr.context_alternating td:first-child')));
        cells.forEach(function (cell) {
            if (!cell || !cell.style) return;
            cell.style.removeProperty('width');
            cell.style.removeProperty('min-width');
            cell.style.removeProperty('white-space');
        });
    }

    function applyCampusnetActualGradeExclusionState(entry, btn, excluded) {
        if (!entry || !entry.row) return;
        if (entry.row.classList.contains('gpa-actual-excluded') !== !!excluded) entry.row.classList.toggle('gpa-actual-excluded', !!excluded);
        if (excluded) setCampusnetGpaAttribute(entry.row, 'data-gpa-actual-excluded', '1');
        else if (entry.row.getAttribute('data-gpa-actual-excluded') !== null) entry.row.removeAttribute('data-gpa-actual-excluded');
        applyCampusnetActualGradeExcludedRowInlineStyles(entry, excluded);
        applyCampusnetActualGradeToggleButtonState(btn, excluded);
    }

    function refreshCampusnetGpaDerivedOutputs() {
        var table = getCampusnetGradesTable();
        if (!table) return;
        var gpaRow = table.querySelector('.gpa-row');
        if (gpaRow) gpaRow.remove();
        var projectedRow = table.querySelector('.gpa-projected-row');
        if (projectedRow) projectedRow.remove();
        insertGPARow();
        updateProjectedGPA();
    }

    // Language-proof key for a grade row: course code, grade and ECTS, never the title or term,
    // which CampusNet writes in Danish or English.
    function campusnetGradeSeenKeys(entries) {
        var seen = Object.create(null);
        return entries.map(function (entry) {
            var code = getCampusnetActualGradeCellText(entry.cells[0]).toLowerCase();
            var grade = normalizeCampusnetGradeCellText(entry.cells[2] ? entry.cells[2].textContent : '').toLowerCase();
            if (/^(ikke bestået|not passed|ib)$/.test(grade)) grade = 'fail';
            else if (/^(bestået|passed|be)$/.test(grade)) grade = 'pass';
            else if (/^(ikke godkendt|not approved)$/.test(grade)) grade = 'not-approved';
            else if (/^(godkendt|approved)$/.test(grade)) grade = 'approved';
            var base = code + '|' + grade + '|' + entry.ects;
            seen[base] = (seen[base] || 0) + 1;
            return base + '|' + seen[base];
        });
    }

    // Marks rows that were not on the page last visit with a small "New", once: the rows are
    // saved as seen on the same visit. The first visit only saves. More than NEW_GRADES_MAX new
    // rows, or every row new, means CampusNet changed how it writes rows, not that grades arrived.
    function markNewCampusnetGrades(entries) {
        if (document.readyState === 'loading' || !entries.length) return;
        var keys = campusnetGradeSeenKeys(entries);
        if (_newGradeKeys === null) {
            _newGradeKeys = new Set();
            var stored = null;
            try { stored = JSON.parse(localStorage.getItem(GRADES_SEEN_STORAGE_KEY) || 'null'); } catch (eRead) { stored = null; }
            if (Array.isArray(stored)) {
                var old = new Set(stored);
                var fresh = keys.filter(function (k) { return !old.has(k); });
                if (fresh.length && fresh.length <= NEW_GRADES_MAX && fresh.length < keys.length) {
                    fresh.forEach(function (k) { _newGradeKeys.add(k); });
                } else if (fresh.length) {
                    console.warn('[DTU After Dark] ' + fresh.length + ' of ' + keys.length + ' grade rows look new; no New marks shown');
                }
            }
            try { localStorage.setItem(GRADES_SEEN_STORAGE_KEY, JSON.stringify(keys)); } catch (eWrite) { }
        }
        var color = isDarkMode() ? 'var(--dtu-ad-accent-mark-dark, #ff6b6b)' : 'var(--dtu-ad-accent-mark-light, #990000)';
        entries.forEach(function (entry, i) {
            var titleCell = entry.cells[1];
            if (!titleCell || !_newGradeKeys.has(keys[i]) || titleCell.querySelector('.gpa-new-grade')) return;
            var chip = document.createElement('span');
            chip.className = 'gpa-new-grade';
            chip.setAttribute('data-dtu-ext', '1');
            chip.textContent = 'New';
            chip.title = 'Not on this page when you last opened it';
            [['margin-left', '6px'], ['padding', '0 5px'], ['border', '1px solid ' + color], ['border-radius', '3px'],
                ['color', color], ['background', 'transparent'], ['font-size', '10px'], ['font-weight', '600'],
                ['line-height', '15px'], ['vertical-align', '1px'], ['white-space', 'nowrap']].forEach(function (p) {
                chip.style.setProperty(p[0], p[1], 'important');
            });
            titleCell.appendChild(chip);
        });
    }

    function syncCampusnetActualGradeExclusionControls() {
        if (!isTopWindow()) return;
        if (!isCampusnetGradesPage()) return;
        var table = getCampusnetGradesTable();
        if (!table) return;

        if (!isFeatureEnabled()) {
            clearCampusnetActualGradeExclusionUi(table);
            return;
        }

        applyCampusnetActualGradeColumnLayout(table);
        var summary = getCampusnetActualGradeSummary(table);
        summary.entries.forEach(function (entry) {
            if (!entry || !entry.cells || entry.cells.length < 2) return;
            var codeCell = entry.cells[0];
            if (!codeCell) return;

            var btn = codeCell.querySelector('.gpa-actual-toggle-btn');
            if (!btn) {
                btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'gpa-actual-toggle-btn';
                btn.setAttribute('data-dtu-ext', '1');
                btn.addEventListener('click', function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    var signature = btn.getAttribute('data-gpa-signature') || '';
                    if (!signature) return;
                    var signatures = new Set(readCampusnetExcludedActualGradeSignatures() || []);
                    if (signatures.has(signature)) signatures.delete(signature);
                    else signatures.add(signature);
                    writeCampusnetExcludedActualGradeSignatures(Array.from(signatures));
                    refreshCampusnetGpaDerivedOutputs();
                    syncCampusnetActualGradeExclusionControls();
                });
                codeCell.appendChild(btn);
            }

            setCampusnetGpaAttribute(btn, 'data-gpa-signature', entry.signature);
            applyCampusnetActualGradeExclusionState(entry, btn, entry.excluded);
        });
        markNewCampusnetGrades(summary.entries.filter(function (entry) { return entry && entry.cells && entry.cells.length >= 4; }));
    }

    // ===== Grades past DTU's grading deadline =====
    // The Study Planner exam schedule saves the student's exams with DTU's grading deadline
    // (dtuExamGradingWatchV1, extension storage). Here, an exam whose deadline has passed
    // and that has no grade row for its term is listed under the table.
    var GRADING_WATCH_KEY = 'dtuExamGradingWatchV1';
    var _gradingWatchPending = false;
    var _gradingWatchReadAt = 0;

    function isoDayNumber(iso) {
        var p = String(iso).split('-');
        return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000);
    }

    // CampusNet's term for an exam day: "v25" for the winter exams (December 2025 and the
    // January after), "s26" for summer (May to August 2026). Null when the day fits neither.
    function campusnetTermForExam(iso) {
        var year = +String(iso).slice(0, 4);
        var month = +String(iso).slice(5, 7);
        var yy = function (y) { return String(y % 100).padStart(2, '0'); };
        if (month === 12) return 'v' + yy(year);
        if (month === 1 || month === 2) return 'v' + yy(year - 1);
        if (month >= 5 && month <= 8) return 's' + yy(year);
        return null;
    }

    // grades: [{code, term}] from the page. An exam counts as graded when a row has its
    // course code and its term (any term when the exam day maps to none).
    function findMissingGrades(watch, grades, todayIso) {
        return (Array.isArray(watch) ? watch : []).filter(function (e) {
            if (!e || !e.code || !e.grading || !(e.grading < todayIso)) return false;
            var term = campusnetTermForExam(e.exam);
            return !grades.some(function (g) {
                return g.code.toLowerCase() === String(e.code).toLowerCase() && (!term || g.term.toLowerCase() === term);
            });
        }).map(function (e) {
            return { code: e.code, name: e.name || '', exam: e.exam, grading: e.grading, daysAgo: isoDayNumber(todayIso) - isoDayNumber(e.grading) };
        });
    }

    function formatGradingDay(iso) {
        var p = String(iso).split('-');
        try {
            return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
        } catch (e0) { return iso; }
    }

    function removeGradingWatchNote() {
        document.querySelectorAll('.gpa-grading-watch').forEach(function (n) { n.remove(); });
    }

    function renderGradingWatchNote(table, missing) {
        removeGradingWatchNote();
        if (!missing.length) return;
        var dark = isDarkMode();
        var box = document.createElement('div');
        box.className = 'gpa-grading-watch';
        box.setAttribute('data-dtu-ext', '1');
        [['margin', '12px 0 0'], ['padding', '8px 10px'], ['border', '1px solid ' + (dark ? '#3a3f47' : '#d1d5db')],
            ['border-radius', '4px'], ['font-size', '12px'], ['line-height', '1.5'], ['background', 'transparent'],
            ['color', dark ? '#e0e0e0' : '#1f2937'], ['max-width', table.offsetWidth ? table.offsetWidth + 'px' : 'none']].forEach(function (p) {
            box.style.setProperty(p[0], p[1], 'important');
        });
        var title = document.createElement('div');
        title.textContent = missing.length === 1 ? 'Grade not on this page yet' : 'Grades not on this page yet';
        title.style.setProperty('font-weight', '600', 'important');
        box.appendChild(title);
        missing.forEach(function (m) {
            var line = document.createElement('div');
            line.textContent = m.code + (m.name ? ' ' + m.name : '') + ': exam ' + formatGradingDay(m.exam)
                + ', DTU\'s grading deadline ' + formatGradingDay(m.grading)
                + ' (' + m.daysAgo + (m.daysAgo === 1 ? ' day' : ' days') + ' ago)';
            box.appendChild(line);
        });
        var foot = document.createElement('div');
        foot.textContent = 'Exams from your Study Planner exam schedule; deadlines from DTU\'s exam table.';
        foot.style.setProperty('color', dark ? '#9aa1aa' : '#6b7280', 'important');
        box.appendChild(foot);
        table.parentNode.insertBefore(box, table.nextSibling);
    }

    function syncGradingWatchNote(table) {
        // insertGPARow runs on every page mutation: read storage at most every 3 s.
        if (_gradingWatchPending || Date.now() - _gradingWatchReadAt < 3000) return;
        _gradingWatchReadAt = Date.now();
        var storage = globalThis.DTUAfterDarkStorage;
        if (!storage || typeof storage.storageLocalGet !== 'function') return;
        _gradingWatchPending = true;
        var defaults = {};
        defaults[GRADING_WATCH_KEY] = [];
        storage.storageLocalGet(defaults, function (result) {
            _gradingWatchPending = false;
            if (!table.isConnected || !isFeatureEnabled()) return;
            var grades = getCampusnetActualGradeEntries(table).map(function (entry) {
                return {
                    code: getCampusnetActualGradeCellText(entry.cells[0]),
                    term: normalizeCampusnetGradeCellText(entry.cells[4] ? entry.cells[4].textContent : '')
                };
            });
            var missing = findMissingGrades(result && result[GRADING_WATCH_KEY], grades, globalThis.DTUAfterDarkDom.copenhagenDateIso());
            var key = JSON.stringify(missing);
            var existing = document.querySelector('.gpa-grading-watch');
            if (existing && existing.getAttribute('data-gpa-grading-key') === key) return;
            renderGradingWatchNote(table, missing);
            var box = document.querySelector('.gpa-grading-watch');
            if (box) box.setAttribute('data-gpa-grading-key', key);
        });
    }

    function insertGPARow() {
        if (!isTopWindow()) return;
        if (!isFeatureEnabled()) {
            var disabledTable = getCampusnetGradesTable();
            if (disabledTable) {
                clearCampusnetActualGradeExclusionUi(disabledTable);
                clearCampusnetActualGradeColumnLayout(disabledTable);
                var existing = disabledTable.querySelector('.gpa-row');
                if (existing) existing.remove();
                var projected = disabledTable.querySelector('.gpa-projected-row');
                if (projected) projected.remove();
            }
            removeGradingWatchNote();
            return;
        }
        // The extension starts while CampusNet still parses the grades table; a
        // GPA drawn then counts only the rows so far and is never redrawn.
        if (document.readyState === 'loading') return;
        var table = getCampusnetGradesTable();
        syncCampusnetActualGradeExclusionControls();
        if (!table) globalThis.DTUAfterDarkWarnMissingAnchor && globalThis.DTUAfterDarkWarnMissingAnchor('CampusNet GPA', 'table.gradesList', function () { return !getCampusnetGradesTable(); });
        if (table) syncGradingWatchNote(table);
        if (!table || table.querySelector('.gpa-row')) return;

        var summary = getCampusnetActualGradeSummary(table);
        if (summary.totalECTS === 0 && summary.excludedCount === 0 && !summary.exclusionsUnreadable) return;

        var headerRow = table.querySelector('tr.gradesListHeader');
        if (!headerRow) {
            globalThis.DTUAfterDarkWarnMissingAnchor && globalThis.DTUAfterDarkWarnMissingAnchor('CampusNet GPA', 'tr.gradesListHeader', function () { return !document.querySelector('table.gradesList tr.gradesListHeader'); });
            return;
        }

        var gpaRow = document.createElement('tr');
        gpaRow.className = 'gpa-row';
        gpaRow.setAttribute('data-dtu-ext', '1');

        var cells = createCampusnetGpaCells(
            'Weighted GPA',
            summary.gpa !== null ? summary.gpa.toFixed(2) : '',
            summary.totalECTS,
            '');
        var tdDate = cells.note;
        tdDate.style.setProperty('color', isDarkMode() ? '#9aa1aa' : '#6b7280', 'important');
        if (summary.exclusionsUnreadable) {
            tdDate.textContent = 'Ignored courses could not be read';
            tdDate.title = 'Use a course\'s ignore button to start a new list.';
        } else if (summary.excludedCount > 0) {
            tdDate.textContent = summary.excludedCount + ' ignored';
        }

        gpaRow.appendChild(cells.label);
        if (summary.exclusionsUnreadable) {
            // No GPA to show: the note takes the grade, ECTS and note columns.
            tdDate.colSpan = 3;
            tdDate.style.setProperty('white-space', 'nowrap');
            gpaRow.appendChild(tdDate);
        } else {
            gpaRow.appendChild(cells.grade);
            gpaRow.appendChild(cells.ects);
            gpaRow.appendChild(tdDate);
        }

        var lastRow = table.querySelector('tr:last-child');
        if (lastRow) lastRow.after(gpaRow);
        else table.appendChild(gpaRow);
    }

    // The estimate note belongs to Projected GPA, so it only shows while planned grades
    // exist and sits under the totals rather than at the top of the table.
    function syncGpaSimulatorDisclaimer(table) {
        if (!table) return;
        var disclaimerRow = table.querySelector('.gpa-sim-disclaimer-row');
        var simRows = table.querySelectorAll('.gpa-sim-row');
        if (!simRows.length) {
            if (disclaimerRow) disclaimerRow.remove();
            return;
        }
        if (!disclaimerRow) {
            disclaimerRow = createCampusnetGpaMessageRow(
                'gpa-sim-disclaimer-row',
                'Projected GPA is an estimate. Always verify official grades/GPA in DTU systems.',
                'text-align:right;padding:4px 6px 2px;font-size:10px;',
                isDarkMode() ? '#9aa1aa' : '#6b7280');
        }

        var anchor = table.querySelector('.gpa-projected-row') || table.querySelector('.gpa-row') || simRows[simRows.length - 1];
        if (anchor && anchor.parentNode && disclaimerRow.previousElementSibling !== anchor) {
            anchor.after(disclaimerRow);
        }
    }

    function saveSimEntries() {
        var rows = document.querySelectorAll('.gpa-sim-row');
        var entries = [];
        rows.forEach(function (row) {
            var cells = row.querySelectorAll('td');
            if (cells.length < 5) return;
            var codeInput = cells[0].querySelector('input');
            var nameInput = cells[1].querySelector('input');
            var gradeSelect = cells[2].querySelector('select');
            var ectsInput = cells[3].querySelector('input');
            if (!gradeSelect || !ectsInput) return;
            entries.push({
                code: codeInput ? codeInput.value : '',
                name: nameInput ? nameInput.value : '',
                grade: parseInt(gradeSelect.value, 10),
                // An emptied field stays empty: saving 5 would invent credits the student never chose.
                ects: parseFloat(ectsInput.value) > 0 ? parseFloat(ectsInput.value) : null
            });
        });
        localStorage.setItem(GPA_SIM_STORAGE_KEY, JSON.stringify(entries));
    }

    function getCampusnetSimGradeEntries(table) {
        var entries = [];
        table.querySelectorAll('.gpa-sim-row').forEach(function (row) {
            var cells = row.querySelectorAll('td');
            if (cells.length < 4) return;
            var gradeSelect = cells[2].querySelector('select');
            var ectsInput = cells[3].querySelector('input');
            if (!gradeSelect || !ectsInput) return;
            var grade = parseInt(gradeSelect.value, 10);
            var ects = parseFloat(ectsInput.value);
            if (isNaN(ects) || ects <= 0) return;
            entries.push({ numericGrade: grade, ects: ects, countsForGpa: true });
        });
        return entries;
    }

    // A saved plan that cannot be read is reported, not quietly dropped: the next
    // save overwrites it, so the student should know it was there.
    function readCampusnetSimEntries() {
        var saved = [];
        var unreadable = false;
        try {
            var stored = localStorage.getItem(GPA_SIM_STORAGE_KEY);
            if (stored) saved = JSON.parse(stored);
        } catch (e) {
            unreadable = true;
        }
        if (!Array.isArray(saved)) {
            saved = [];
            unreadable = true;
        }
        var entries = saved.filter(function (entry) {
            return entry && typeof entry === 'object' && !Array.isArray(entry)
                && DANISH_GRADES.indexOf(entry.grade) >= 0
                && (entry.ects === null || (Number.isFinite(entry.ects) && entry.ects > 0));
        });
        return { entries: entries, unreadable: unreadable, lostCount: saved.length - entries.length };
    }

    function updateProjectedGPA() {
        var table = getCampusnetGradesTable();
        if (!table) return;

        var actualSummary = getCampusnetActualGradeSummary(table);
        var simEntries = getCampusnetSimGradeEntries(table);
        var simECTS = calculateCampusnetWeightedGpa(simEntries).totalECTS;

        var existingProjected = table.querySelector('.gpa-projected-row');
        if (existingProjected) existingProjected.remove();

        syncGpaSimulatorDisclaimer(table);
        if (simECTS === 0) return;
        // Same totals as the GPA row: without a readable ignore list there is no honest projection.
        if (actualSummary.exclusionsUnreadable) return;

        var projectedGpa = calculateCampusnetWeightedGpa(
            actualSummary.entries.filter(function (entry) { return !entry.excluded; }).concat(simEntries));
        var currentGPA = actualSummary.averageGpa || 0;
        var projectedGPA = projectedGpa.average || 0;
        var delta = projectedGPA - currentGPA;
        var projectedNeutralTextColor = isDarkMode() ? '#e0e0e0' : '#1f2937';
        var projectedRowBg = isDarkMode() ? 'rgba(var(--dtu-ad-accent-rgb), 0.12)' : 'rgba(var(--dtu-ad-accent-rgb), 0.08)';
        var positiveDeltaColor = isDarkMode() ? '#66bb6a' : '#2e7d32';
        var negativeDeltaColor = isDarkMode() ? '#ef5350' : '#c62828';

        var projRow = document.createElement('tr');
        projRow.className = 'gpa-projected-row';
        projRow.setAttribute('data-dtu-ext', '1');
        setCampusnetGpaStyles(projRow, [
            ['background', projectedRowBg], ['background-color', projectedRowBg],
            ['border-top', '1px dashed rgba(var(--dtu-ad-accent-rgb), 0.7)']
        ], 'important');
        var projectedCellStyles = [
            ['background', projectedRowBg], ['background-color', projectedRowBg],
            ['color', projectedNeutralTextColor]
        ];

        var deltaText;
        var deltaColor;
        if (delta > 0) {
            deltaColor = positiveDeltaColor;
            deltaText = '+' + delta.toFixed(2);
        } else if (delta < 0) {
            deltaColor = negativeDeltaColor;
            deltaText = delta.toFixed(2);
        } else {
            deltaColor = projectedNeutralTextColor;
            deltaText = actualSummary.excludedCount > 0
                ? (actualSummary.excludedCount + ' ignored')
                : '0.00';
        }

        var cells = createCampusnetGpaCells(
            'Projected GPA',
            projectedGPA.toFixed(2),
            projectedGpa.totalECTS,
            deltaText,
            'text-align: right; padding-right: 5px; font-weight: bold; font-size: 12px;');
        [cells.label, cells.grade, cells.ects].forEach(function (cell) {
            setCampusnetGpaStyles(cell, projectedCellStyles, 'important');
        });
        setCampusnetGpaStyles(cells.note, projectedCellStyles.slice(0, 2), 'important');
        cells.note.style.setProperty('color', deltaColor, 'important');

        projRow.appendChild(cells.label);
        projRow.appendChild(cells.grade);
        projRow.appendChild(cells.ects);
        projRow.appendChild(cells.note);

        var gpaRow = table.querySelector('.gpa-row');
        if (gpaRow) gpaRow.after(projRow);
        else {
            var lastRow = table.querySelector('tr:last-child');
            if (lastRow) lastRow.after(projRow);
        }
        syncGpaSimulatorDisclaimer(table);
    }

    function createSimRow(entry) {
        var tr = document.createElement('tr');
        tr.className = 'gpa-sim-row';
        tr.setAttribute('data-dtu-ext', '1');

        var tdCode = createCampusnetGpaCell('', '');
        var codeInput = document.createElement('input');
        codeInput.type = 'text';
        codeInput.className = 'gpa-sim-input';
        codeInput.setAttribute('data-dtu-ext', '1');
        codeInput.placeholder = 'Course num';
        codeInput.value = entry.code || '';
        codeInput.style.cssText = 'width: 96px;';
        codeInput.addEventListener('input', function () { saveSimEntries(); });
        tdCode.appendChild(codeInput);

        var tdName = createCampusnetGpaCell('', '');
        var nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'gpa-sim-input';
        nameInput.setAttribute('data-dtu-ext', '1');
        nameInput.placeholder = 'Course name';
        nameInput.value = entry.name || '';
        nameInput.style.cssText = 'width: 100%;';
        nameInput.addEventListener('input', function () { saveSimEntries(); });
        tdName.appendChild(nameInput);

        var tdGrade = createCampusnetGpaCell('text-align: right; padding-right: 5px;', '');
        var gradeSelect = document.createElement('select');
        gradeSelect.className = 'gpa-sim-select';
        gradeSelect.setAttribute('data-dtu-ext', '1');
        gradeSelect.style.cssText = 'width: 72px; max-width: 100%;';
        DANISH_GRADES.forEach(function (g) {
            var option = document.createElement('option');
            option.setAttribute('data-dtu-ext', '1');
            option.value = g.toString();
            option.textContent = g === 2 ? '02' : g === 0 ? '00' : g.toString();
            if (g === entry.grade) option.selected = true;
            gradeSelect.appendChild(option);
        });
        gradeSelect.addEventListener('change', function () { saveSimEntries(); updateProjectedGPA(); });
        tdGrade.appendChild(gradeSelect);

        var tdECTS = createCampusnetGpaCell('text-align: right; padding-right: 8px;', '');
        var ectsInput = document.createElement('input');
        ectsInput.type = 'number';
        ectsInput.className = 'gpa-sim-input';
        ectsInput.setAttribute('data-dtu-ext', '1');
        ectsInput.min = '1';
        ectsInput.max = '60';
        ectsInput.value = entry.ects == null ? '' : entry.ects;
        ectsInput.style.cssText = 'width: 67px; max-width: 100%; text-align: left; padding-left: 10px; padding-right: 22px; box-sizing: border-box;';
        ectsInput.addEventListener('input', function () { saveSimEntries(); updateProjectedGPA(); });
        tdECTS.appendChild(ectsInput);

        var tdAction = createCampusnetGpaCell('text-align: right; width: 56px;', '');
        tdAction.style.setProperty('padding-left', '8px', 'important');
        tdAction.style.setProperty('padding-right', '14px', 'important');
        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'gpa-sim-delete-btn';
        delBtn.setAttribute('data-dtu-ext', '1');
        delBtn.textContent = '×';
        delBtn.title = 'Remove';
        delBtn.style.cssText = 'width: 40px; transform: translateX(5px);';
        delBtn.addEventListener('click', function () {
            tr.remove();
            saveSimEntries();
            updateProjectedGPA();
        });
        tdAction.appendChild(delBtn);

        tr.appendChild(tdCode);
        tr.appendChild(tdName);
        tr.appendChild(tdGrade);
        tr.appendChild(tdECTS);
        tr.appendChild(tdAction);

        return tr;
    }

    function insertGPASimulator() {
        if (!isTopWindow()) return;
        if (!isFeatureEnabled()) {
            document.querySelectorAll('.gpa-sim-row, .gpa-sim-add-row, .gpa-sim-add-btn, .gpa-projected-row, .gpa-sim-disclaimer-row, .gpa-sim-unread-row').forEach(function (el) {
                el.remove();
            });
            document.querySelectorAll('[data-gpa-controls-flex="1"]').forEach(function (el) {
                el.removeAttribute('data-gpa-controls-flex');
                el.style.removeProperty('display');
                el.style.removeProperty('align-items');
                el.style.removeProperty('flex-wrap');
            });
            return;
        }
        if (document.readyState === 'loading') return;
        var table = getCampusnetGradesTable();
        if (!table || table.querySelector('.gpa-sim-add-row')) return;

        var headerRow = table.querySelector('tr.gradesListHeader');
        if (!headerRow) return;

        var saved = readCampusnetSimEntries();
        var savedEntries = saved.entries;
        var savedUnreadable = saved.unreadable;
        var lostCount = saved.lostCount;

        // The row stays as the anchor planned rows are inserted after (right under the
        // header). The button itself sits with the page's own controls, next to "Only
        // show passed courses", as a small outlined control (design C, 2026-09-30).
        var addRow = document.createElement('tr');
        addRow.className = 'gpa-sim-add-row';
        addRow.setAttribute('data-dtu-ext', '1');
        var addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'gpa-sim-add-btn';
        addBtn.setAttribute('data-dtu-ext', '1');
        var plus = document.createElement('span');
        plus.className = 'gpa-sim-add-plus';
        plus.setAttribute('data-dtu-ext', '1');
        plus.setAttribute('aria-hidden', 'true');
        plus.textContent = '+';
        addBtn.appendChild(plus);
        var label = document.createElement('span');
        label.setAttribute('data-dtu-ext', '1');
        label.textContent = 'Add planned grade';
        addBtn.appendChild(label);
        var dark = isDarkMode();
        var restingBorder = dark ? '#505050' : '#b8b8b8';
        var accentMark = dark ? 'var(--dtu-ad-accent-mark-dark, #ff6b6b)' : 'var(--dtu-ad-accent-mark-light, #990000)';
        setCampusnetGpaStyles(addBtn, [
            ['display', 'inline-flex'], ['align-items', 'center'], ['gap', '6px'],
            ['height', '30px'], ['margin', '0 0 0 16px'], ['padding', '0 12px'],
            ['border', '1px solid ' + restingBorder], ['border-radius', '4px'],
            ['background', 'transparent'], ['background-color', 'transparent'],
            ['color', dark ? '#e0e0e0' : '#1a1a1a'], ['font-size', '13px'], ['font-weight', '400'],
            ['line-height', '1'], ['vertical-align', 'middle'], ['cursor', 'pointer'], ['box-shadow', 'none']
        ], 'important');
        setCampusnetGpaStyles(plus, [
            ['font-size', '16px'],
            ['line-height', '1'],
            ['color', accentMark]
        ], 'important');
        ['mouseenter', 'focus'].forEach(function (type) {
            addBtn.addEventListener(type, function () { addBtn.style.setProperty('border-color', accentMark, 'important'); });
        });
        ['mouseleave', 'blur'].forEach(function (type) {
            addBtn.addEventListener(type, function () { addBtn.style.setProperty('border-color', restingBorder, 'important'); });
        });
        addBtn.addEventListener('click', function (e) {
            e.preventDefault();
            // Always switched back on: left off, the page observer ignores every later change
            // and new CampusNet content stays light until reload.
            setSuppressHeavyWork(true);
            var newRow;
            try {
                var unreadRow = table.querySelector('.gpa-sim-unread-row');
                if (unreadRow) unreadRow.remove();
                var newEntry = { code: '', name: '', grade: 7, ects: 5 };
                newRow = createSimRow(newEntry);
                // :last-of-type matches by tag, not class, so take the last row of the list.
                var simRows = table.querySelectorAll('.gpa-sim-row');
                var lastSimRow = simRows.length ? simRows[simRows.length - 1] : null;
                if (lastSimRow) lastSimRow.after(newRow);
                else addRow.after(newRow);
                saveSimEntries();
                updateProjectedGPA();
            } finally {
                setSuppressHeavyWork(false);
            }
            var firstInput = newRow.querySelector('input');
            if (firstInput && firstInput.focus) firstInput.focus();
        });

        var controlsHost = document.querySelector('.educationPassedOnly');
        if (controlsHost) {
            addRow.style.setProperty('display', 'none', 'important');
            // The label is a floated line of text and the button is 30px tall; centring
            // the line keeps label, checkbox and button on one axis.
            controlsHost.setAttribute('data-gpa-controls-flex', '1');
            controlsHost.style.setProperty('display', 'flex', 'important');
            controlsHost.style.setProperty('align-items', 'center', 'important');
            controlsHost.style.setProperty('flex-wrap', 'wrap', 'important');
            controlsHost.appendChild(addBtn);
        } else {
            // CampusNet changed its controls: keep the button in its own row instead.
            var addTd = createCampusnetGpaCell('text-align: left; padding: 6px 0;', '');
            addTd.colSpan = 5;
            addBtn.style.setProperty('margin', '0', 'important');
            addTd.appendChild(addBtn);
            addRow.appendChild(addTd);
        }

        headerRow.after(addRow);

        var insertAfter = addRow;
        if (savedUnreadable || lostCount > 0) {
            var unreadRow = createCampusnetGpaMessageRow(
                'gpa-sim-unread-row',
                savedUnreadable
                    ? 'Saved planned grades could not be read.'
                    : lostCount + ' saved planned grade' + (lostCount === 1 ? '' : 's') + ' could not be read.',
                'text-align:left;padding:4px 6px;font-size:12px;',
                isDarkMode() ? '#e0e0e0' : '#1f2937');
            insertAfter.after(unreadRow);
            insertAfter = unreadRow;
        }
        savedEntries.forEach(function (entry) {
            var simRow = createSimRow(entry);
            insertAfter.after(simRow);
            insertAfter = simRow;
        });
        syncGpaSimulatorDisclaimer(table);

        if (savedEntries.length > 0) {
            updateProjectedGPA();
        }
    }

    try {
        globalThis.DTUAfterDarkCampusnetGpa = {
            insertGPARow: insertGPARow,
            insertGPASimulator: insertGPASimulator,
            syncCampusnetActualGradeExclusionControls: syncCampusnetActualGradeExclusionControls
        };
    } catch (eExpose) { }

    function startCampusnetGradesPage() {
        // darkmode.js stops before it sets the deps on a paused URL: the extension is off there by choice.
        if (!globalThis.DTUAfterDarkCampusnetGpaDeps) return;
        insertGPARow();
        insertGPASimulator();
        syncCampusnetActualGradeExclusionControls();
    }

    if (isCampusnetGradesPage()) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startCampusnetGradesPage);
        else startCampusnetGradesPage();
    }
})();
