(function () {
    'use strict';

    var GPA_SIM_STORAGE_KEY = 'gpaSimEntries';
    var GPA_EXCLUDED_ACTUAL_STORAGE_KEY = 'gpaExcludedActualRows';
    var DANISH_GRADES = [12, 10, 7, 4, 2, 0, -3];

    function getDeps() {
        try { return globalThis.DTUAfterDarkCampusnetGpaDeps || null; } catch (e0) { return null; }
    }

    function isTopWindow() {
        var deps = getDeps();
        return !!(deps && typeof deps.isTopWindow === 'function' && deps.isTopWindow());
    }

    function isFeatureEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isFeatureEnabled === 'function' && deps.isFeatureEnabled());
    }

    function isDarkMode() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDarkMode === 'function' && deps.isDarkMode());
    }

    function setSuppressHeavyWork(value) {
        var deps = getDeps();
        if (deps && typeof deps.setSuppressHeavyWork === 'function') {
            deps.setSuppressHeavyWork(!!value);
        }
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

    function getCampusnetActualGradeTitleText(cell) {
        if (!cell) return '';
        try {
            var clone = cell.cloneNode(true);
            clone.querySelectorAll('.gpa-actual-toggle-btn').forEach(function (btn) {
                btn.remove();
            });
            return normalizeCampusnetGradeCellText(clone.textContent);
        } catch (e) {
            return normalizeCampusnetGradeCellText(cell.textContent);
        }
    }

    function getCampusnetActualGradeCodeText(cell) {
        if (!cell) return '';
        try {
            var clone = cell.cloneNode(true);
            clone.querySelectorAll('.gpa-actual-toggle-btn').forEach(function (btn) {
                btn.remove();
            });
            return normalizeCampusnetGradeCellText(clone.textContent);
        } catch (e) {
            return normalizeCampusnetGradeCellText(cell.textContent);
        }
    }

    function isCampusnetActualGradeDataRow(row) {
        if (!row || row.classList.contains('gradesListHeader')) return false;
        if (row.classList.contains('gpa-row')
            || row.classList.contains('gpa-projected-row')
            || row.classList.contains('gpa-sim-row')
            || row.classList.contains('gpa-sim-add-row')
            || row.classList.contains('gpa-sim-disclaimer-row')) {
            return false;
        }
        return true;
    }

    function parseCampusnetActualGradeRow(row) {
        if (!isCampusnetActualGradeDataRow(row)) return null;
        var cells = row.querySelectorAll('td');
        if (cells.length < 4) return null;

        var code = getCampusnetActualGradeCodeText(cells[0]);
        var title = getCampusnetActualGradeTitleText(cells[1]);
        var gradeSpan = cells[2].querySelector('span');
        var gradeText = normalizeCampusnetGradeCellText(gradeSpan ? gradeSpan.textContent : cells[2].textContent);
        var numericMatch = gradeText.match(/^(-?\d+)/);
        var numericGrade = numericMatch ? parseInt(numericMatch[1], 10) : null;
        var ects = parseFloat(normalizeCampusnetGradeCellText(cells[3].textContent).replace(',', '.'));
        var term = normalizeCampusnetGradeCellText(cells[4] ? cells[4].textContent : '');
        var safeEcts = (!isNaN(ects) && ects > 0) ? ects : 0;
        var baseSignature = [code, title, gradeText, safeEcts, term].join('|').toLowerCase();

        return {
            row: row,
            cells: cells,
            code: code,
            title: title,
            gradeText: gradeText,
            numericGrade: numericGrade,
            ects: safeEcts,
            term: term,
            baseSignature: baseSignature,
            signature: baseSignature,
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
            entry.occurrenceIndex = occurrence;
            entry.signature = entry.baseSignature + '|occ:' + occurrence;
            entries.push(entry);
        });
        return entries;
    }

    function readCampusnetExcludedActualGradeSignatures() {
        try {
            var raw = localStorage.getItem(GPA_EXCLUDED_ACTUAL_STORAGE_KEY);
            if (!raw) return [];
            var parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.filter(function (item) {
                return typeof item === 'string' && item.trim();
            });
        } catch (e) {
            return [];
        }
    }

    function writeCampusnetExcludedActualGradeSignatures(signatures) {
        var unique = [];
        var seen = new Set();
        (Array.isArray(signatures) ? signatures : []).forEach(function (item) {
            if (typeof item !== 'string' || !item.trim()) return;
            if (seen.has(item)) return;
            seen.add(item);
            unique.push(item);
        });
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

        return {
            totalWeighted: totalWeighted,
            totalECTS: totalECTS,
            gpa: totalECTS > 0 ? Number((totalWeighted / totalECTS).toFixed(2)) : null
        };
    }

    function getCampusnetActualGradeSummary(table) {
        var entries = getCampusnetActualGradeEntries(table);
        var excludedSet = new Set(readCampusnetExcludedActualGradeSignatures());
        var excludedCount = 0;

        entries.forEach(function (entry) {
            entry.excluded = excludedSet.has(entry.signature);
            if (entry.excluded) {
                excludedCount++;
                return;
            }
        });

        var weightedGpa = calculateCampusnetWeightedGpa(entries.filter(function (entry) {
            return !entry.excluded;
        }));

        return {
            entries: entries,
            excludedSet: excludedSet,
            totalWeighted: weightedGpa.totalWeighted,
            totalECTS: weightedGpa.totalECTS,
            gpa: weightedGpa.gpa,
            excludedCount: excludedCount
        };
    }

    function clearCampusnetActualGradeExclusionUi(table) {
        var scope = table || getCampusnetGradesTable();
        if (!scope) return;
        scope.querySelectorAll('.gpa-actual-toggle-btn').forEach(function (btn) {
            btn.remove();
        });
        scope.querySelectorAll('.gpa-actual-excluded').forEach(function (row) {
            row.classList.remove('gpa-actual-excluded');
            row.removeAttribute('data-gpa-actual-excluded');
        });
        scope.querySelectorAll('[data-gpa-actual-inline-muted="1"]').forEach(function (el) {
            if (!el || !el.style) return;
            el.removeAttribute('data-gpa-actual-inline-muted');
            el.style.removeProperty('background');
            el.style.removeProperty('background-color');
            el.style.removeProperty('color');
            el.style.removeProperty('text-decoration');
        });
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
        setCampusnetGpaStyle(btn, 'background', 'transparent', 'important');
        setCampusnetGpaStyle(btn, 'background-color', 'transparent', 'important');
        setCampusnetGpaStyle(btn, 'color', fg, 'important');
        setCampusnetGpaStyle(btn, 'border', '0', 'important');
        setCampusnetGpaStyle(btn, 'border-radius', '0', 'important');
        setCampusnetGpaStyle(btn, 'box-shadow', 'none', 'important');
        setCampusnetGpaStyle(btn, 'appearance', 'none', 'important');
        setCampusnetGpaStyle(btn, '-webkit-appearance', 'none', 'important');
        // Padding lifts the click target from 24x13 to at least 24px tall.
        setCampusnetGpaStyle(btn, 'padding', '5px 6px', 'important');
        setCampusnetGpaStyle(btn, 'min-height', '24px', 'important');
        setCampusnetGpaStyle(btn, 'display', 'inline-flex', 'important');
        setCampusnetGpaStyle(btn, 'align-items', 'center', 'important');
        setCampusnetGpaStyle(btn, 'justify-content', 'center', 'important');
        setCampusnetGpaStyle(btn, 'float', 'right', 'important');
        setCampusnetGpaStyle(btn, 'clear', 'none', 'important');
        setCampusnetGpaStyle(btn, 'margin-top', '0', 'important');
        setCampusnetGpaStyle(btn, 'margin-left', '0', 'important');
        setCampusnetGpaStyle(btn, 'margin-right', '6px', 'important');
        setCampusnetGpaStyle(btn, 'line-height', '1.2', 'important');
        setCampusnetGpaStyle(btn, 'white-space', 'nowrap', 'important');
        setCampusnetGpaStyle(btn, 'vertical-align', 'middle', 'important');
    }

    function applyCampusnetActualGradeExcludedRowInlineStyles(entry, excluded) {
        if (!entry || !entry.row || !entry.row.querySelectorAll) return;

        if (!excluded) entry.row.querySelectorAll('[data-gpa-actual-inline-muted="1"]').forEach(function (el) {
            if (!el || !el.style) return;
            el.removeAttribute('data-gpa-actual-inline-muted');
            el.style.removeProperty('background');
            el.style.removeProperty('background-color');
            el.style.removeProperty('color');
            el.style.removeProperty('text-decoration');
        });

        if (!excluded) {
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
            setCampusnetGpaStyle(cell, 'background', rowBg, 'important');
            setCampusnetGpaStyle(cell, 'background-color', rowBg, 'important');
            setCampusnetGpaStyle(cell, 'color', mutedText, 'important');
            setCampusnetGpaStyle(cell, 'text-decoration', 'line-through', 'important');
        });

        entry.row.querySelectorAll('td span, td a').forEach(function (el) {
            if (!el || !el.style) return;
            if (el.closest && el.closest('.gpa-actual-toggle-btn')) return;
            setCampusnetGpaAttribute(el, 'data-gpa-actual-inline-muted', '1');
            setCampusnetGpaStyle(el, 'color', mutedText, 'important');
            setCampusnetGpaStyle(el, 'text-decoration', 'line-through', 'important');
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
            setCampusnetGpaStyle(cell, 'width', '220px', 'important');
            setCampusnetGpaStyle(cell, 'min-width', '220px', 'important');
            setCampusnetGpaStyle(cell, 'white-space', 'nowrap', 'important');
        });
        // Fixed layout takes column widths from the header row, so hiding a grade (which
        // adds "1 ignored" under Date) or adding a planned grade (inputs under Grade
        // and ECTS) can no longer push the right-hand columns sideways.
        var header = scope.querySelector && scope.querySelector('tr.gradesListHeader');
        if (!header || !header.children || header.children.length !== CAMPUSNET_GRADE_COLUMN_WIDTHS.length) return;
        setCampusnetGpaAttribute(scope, 'data-gpa-fixed-columns', '1');
        setCampusnetGpaStyle(scope, 'table-layout', 'fixed', 'important');
        setCampusnetGpaStyle(scope, 'width', '100%', 'important');
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
                    var signatures = new Set(readCampusnetExcludedActualGradeSignatures());
                    if (signatures.has(signature)) signatures.delete(signature);
                    else signatures.add(signature);
                    writeCampusnetExcludedActualGradeSignatures(Array.from(signatures));
                    refreshCampusnetGpaDerivedOutputs();
                    syncCampusnetActualGradeExclusionControls();
                });
                codeCell.appendChild(btn);
            }

            setCampusnetGpaAttribute(btn, 'data-gpa-signature', entry.signature);
            applyCampusnetActualGradeExclusionState(entry, btn, summary.excludedSet.has(entry.signature));
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
            return;
        }
        var table = getCampusnetGradesTable();
        syncCampusnetActualGradeExclusionControls();
        if (!table || table.querySelector('.gpa-row')) return;

        var summary = getCampusnetActualGradeSummary(table);
        if (summary.totalECTS === 0 && summary.excludedCount === 0) return;

        var headerRow = table.querySelector('tr.gradesListHeader');
        if (!headerRow) return;

        var gpaRow = document.createElement('tr');
        gpaRow.className = 'gpa-row';
        gpaRow.setAttribute('data-dtu-ext', '1');

        var tdLabel = document.createElement('td');
        tdLabel.setAttribute('data-dtu-ext', '1');
        tdLabel.colSpan = 2;
        tdLabel.style.cssText = 'text-align: left; font-weight: bold; padding: 8px 0;';
        tdLabel.style.setProperty('padding-left', '5px', 'important');
        tdLabel.style.setProperty('padding-right', '0', 'important');
        tdLabel.textContent = 'Weighted GPA';

        var tdGrade = document.createElement('td');
        tdGrade.setAttribute('data-dtu-ext', '1');
        tdGrade.style.cssText = 'text-align: right; padding-right: 5px; font-weight: bold; white-space: nowrap;';
        tdGrade.textContent = summary.gpa !== null ? summary.gpa.toFixed(2) : '—';

        var tdECTS = document.createElement('td');
        tdECTS.setAttribute('data-dtu-ext', '1');
        tdECTS.style.cssText = 'text-align: right; padding-right: 5px; font-weight: bold;';
        tdECTS.textContent = summary.totalECTS;

        var tdDate = document.createElement('td');
        tdDate.setAttribute('data-dtu-ext', '1');
        tdDate.style.cssText = 'text-align: right; padding-right: 5px; font-size: 11px;';
        tdDate.style.setProperty('color', isDarkMode() ? '#9aa1aa' : '#6b7280', 'important');
        if (summary.excludedCount > 0) {
            tdDate.textContent = summary.excludedCount + ' ignored';
        }

        gpaRow.appendChild(tdLabel);
        gpaRow.appendChild(tdGrade);
        gpaRow.appendChild(tdECTS);
        gpaRow.appendChild(tdDate);

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
            disclaimerRow = document.createElement('tr');
            disclaimerRow.className = 'gpa-sim-disclaimer-row';
            disclaimerRow.setAttribute('data-dtu-ext', '1');

            var td = document.createElement('td');
            td.colSpan = 5;
            td.setAttribute('data-dtu-ext', '1');
            td.style.cssText = 'text-align:right;padding:4px 6px 2px;font-size:10px;';
            td.style.setProperty('color', isDarkMode() ? '#9aa1aa' : '#6b7280', 'important');
            td.textContent = 'Projected GPA is an estimate. Always verify official grades/GPA in DTU systems.';
            disclaimerRow.appendChild(td);
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
                ects: parseFloat(ectsInput.value) || 5
            });
        });
        localStorage.setItem(GPA_SIM_STORAGE_KEY, JSON.stringify(entries));
    }

    function updateProjectedGPA() {
        var table = getCampusnetGradesTable();
        if (!table) return;

        var actualSummary = getCampusnetActualGradeSummary(table);
        var actualWeighted = actualSummary.totalWeighted;
        var actualECTS = actualSummary.totalECTS;

        var simWeighted = 0;
        var simECTS = 0;
        var simRows = table.querySelectorAll('.gpa-sim-row');
        simRows.forEach(function (row) {
            var cells = row.querySelectorAll('td');
            if (cells.length < 4) return;
            var gradeSelect = cells[2].querySelector('select');
            var ectsInput = cells[3].querySelector('input');
            if (!gradeSelect || !ectsInput) return;
            var grade = parseInt(gradeSelect.value, 10);
            var ects = parseFloat(ectsInput.value);
            if (isNaN(ects) || ects <= 0) return;
            simWeighted += grade * ects;
            simECTS += ects;
        });

        var existingProjected = table.querySelector('.gpa-projected-row');
        if (existingProjected) existingProjected.remove();

        syncGpaSimulatorDisclaimer(table);
        if (simECTS === 0) return;

        var currentGPA = actualECTS > 0 ? actualWeighted / actualECTS : 0;
        var projectedGPA = (actualECTS + simECTS) > 0
            ? (actualWeighted + simWeighted) / (actualECTS + simECTS) : 0;
        var delta = projectedGPA - currentGPA;
        var projectedNeutralTextColor = isDarkMode() ? '#e0e0e0' : '#1f2937';
        var projectedRowBg = isDarkMode() ? 'rgba(var(--dtu-ad-accent-rgb), 0.12)' : 'rgba(var(--dtu-ad-accent-rgb), 0.08)';
        var positiveDeltaColor = isDarkMode() ? '#66bb6a' : '#2e7d32';
        var negativeDeltaColor = isDarkMode() ? '#ef5350' : '#c62828';

        var projRow = document.createElement('tr');
        projRow.className = 'gpa-projected-row';
        projRow.setAttribute('data-dtu-ext', '1');
        projRow.style.setProperty('background', projectedRowBg, 'important');
        projRow.style.setProperty('background-color', projectedRowBg, 'important');
        projRow.style.setProperty('border-top', '1px dashed rgba(var(--dtu-ad-accent-rgb), 0.7)', 'important');

        var tdLabel = document.createElement('td');
        tdLabel.setAttribute('data-dtu-ext', '1');
        tdLabel.colSpan = 2;
        tdLabel.style.cssText = 'text-align: left; font-weight: bold; padding: 8px 0;';
        tdLabel.style.setProperty('padding-left', '5px', 'important');
        tdLabel.style.setProperty('padding-right', '0', 'important');
        tdLabel.style.setProperty('background', projectedRowBg, 'important');
        tdLabel.style.setProperty('background-color', projectedRowBg, 'important');
        tdLabel.style.setProperty('color', projectedNeutralTextColor, 'important');
        tdLabel.textContent = 'Projected GPA';

        var tdGrade = document.createElement('td');
        tdGrade.setAttribute('data-dtu-ext', '1');
        tdGrade.style.cssText = 'text-align: right; padding-right: 5px; font-weight: bold; white-space: nowrap;';
        tdGrade.style.setProperty('background', projectedRowBg, 'important');
        tdGrade.style.setProperty('background-color', projectedRowBg, 'important');
        tdGrade.style.setProperty('color', projectedNeutralTextColor, 'important');
        tdGrade.textContent = projectedGPA.toFixed(2);

        var tdECTS = document.createElement('td');
        tdECTS.setAttribute('data-dtu-ext', '1');
        tdECTS.style.cssText = 'text-align: right; padding-right: 5px; font-weight: bold;';
        tdECTS.style.setProperty('background', projectedRowBg, 'important');
        tdECTS.style.setProperty('background-color', projectedRowBg, 'important');
        tdECTS.style.setProperty('color', projectedNeutralTextColor, 'important');
        tdECTS.textContent = actualECTS + simECTS;

        var tdDelta = document.createElement('td');
        tdDelta.setAttribute('data-dtu-ext', '1');
        tdDelta.style.cssText = 'text-align: right; padding-right: 5px; font-weight: bold; font-size: 12px;';
        tdDelta.style.setProperty('background', projectedRowBg, 'important');
        tdDelta.style.setProperty('background-color', projectedRowBg, 'important');
        if (delta > 0) {
            tdDelta.style.setProperty('color', positiveDeltaColor, 'important');
            tdDelta.textContent = '+' + delta.toFixed(2);
        } else if (delta < 0) {
            tdDelta.style.setProperty('color', negativeDeltaColor, 'important');
            tdDelta.textContent = delta.toFixed(2);
        } else {
            tdDelta.style.setProperty('color', projectedNeutralTextColor, 'important');
            tdDelta.textContent = actualSummary.excludedCount > 0
                ? (actualSummary.excludedCount + ' ignored')
                : '0.00';
        }

        projRow.appendChild(tdLabel);
        projRow.appendChild(tdGrade);
        projRow.appendChild(tdECTS);
        projRow.appendChild(tdDelta);

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

        var tdCode = document.createElement('td');
        tdCode.setAttribute('data-dtu-ext', '1');
        var codeInput = document.createElement('input');
        codeInput.type = 'text';
        codeInput.className = 'gpa-sim-input';
        codeInput.setAttribute('data-dtu-ext', '1');
        codeInput.placeholder = 'Course num';
        codeInput.value = entry.code || '';
        codeInput.style.cssText = 'width: 96px;';
        codeInput.addEventListener('input', function () { saveSimEntries(); });
        tdCode.appendChild(codeInput);

        var tdName = document.createElement('td');
        tdName.setAttribute('data-dtu-ext', '1');
        var nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'gpa-sim-input';
        nameInput.setAttribute('data-dtu-ext', '1');
        nameInput.placeholder = 'Course name';
        nameInput.value = entry.name || '';
        nameInput.style.cssText = 'width: 100%;';
        nameInput.addEventListener('input', function () { saveSimEntries(); });
        tdName.appendChild(nameInput);

        var tdGrade = document.createElement('td');
        tdGrade.setAttribute('data-dtu-ext', '1');
        tdGrade.style.cssText = 'text-align: right; padding-right: 5px;';
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

        var tdECTS = document.createElement('td');
        tdECTS.setAttribute('data-dtu-ext', '1');
        tdECTS.style.cssText = 'text-align: right; padding-right: 8px;';
        var ectsInput = document.createElement('input');
        ectsInput.type = 'number';
        ectsInput.className = 'gpa-sim-input';
        ectsInput.setAttribute('data-dtu-ext', '1');
        ectsInput.min = '1';
        ectsInput.max = '60';
        ectsInput.value = entry.ects || 5;
        ectsInput.style.cssText = 'width: 67px; max-width: 100%; text-align: left; padding-left: 10px; padding-right: 22px; box-sizing: border-box;';
        ectsInput.addEventListener('input', function () { saveSimEntries(); updateProjectedGPA(); });
        tdECTS.appendChild(ectsInput);

        var tdAction = document.createElement('td');
        tdAction.setAttribute('data-dtu-ext', '1');
        tdAction.style.cssText = 'text-align: right; width: 56px;';
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
            document.querySelectorAll('.gpa-sim-row, .gpa-sim-add-row, .gpa-sim-add-btn, .gpa-projected-row, .gpa-sim-disclaimer-row').forEach(function (el) {
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
        var table = getCampusnetGradesTable();
        if (!table || table.querySelector('.gpa-sim-add-row')) return;

        var headerRow = table.querySelector('tr.gradesListHeader');
        if (!headerRow) return;

        var savedEntries = [];
        try {
            var stored = localStorage.getItem(GPA_SIM_STORAGE_KEY);
            if (stored) savedEntries = JSON.parse(stored);
        } catch (e) { }
        if (!Array.isArray(savedEntries)) savedEntries = [];
        savedEntries = savedEntries.filter(function (entry) {
            return entry && typeof entry === 'object' && !Array.isArray(entry)
                && DANISH_GRADES.indexOf(entry.grade) >= 0
                && Number.isFinite(entry.ects) && entry.ects > 0;
        });

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
        [
            ['display', 'inline-flex'], ['align-items', 'center'], ['gap', '6px'],
            ['height', '30px'], ['margin', '0 0 0 16px'], ['padding', '0 12px'],
            ['border', '1px solid ' + restingBorder], ['border-radius', '4px'],
            ['background', 'transparent'], ['background-color', 'transparent'],
            ['color', dark ? '#e0e0e0' : '#1a1a1a'], ['font-size', '13px'], ['font-weight', '400'],
            ['line-height', '1'], ['vertical-align', 'middle'], ['cursor', 'pointer'], ['box-shadow', 'none']
        ].forEach(function (pair) { addBtn.style.setProperty(pair[0], pair[1], 'important'); });
        plus.style.setProperty('font-size', '16px', 'important');
        plus.style.setProperty('line-height', '1', 'important');
        plus.style.setProperty('color', accentMark, 'important');
        ['mouseenter', 'focus'].forEach(function (type) {
            addBtn.addEventListener(type, function () { addBtn.style.setProperty('border-color', accentMark, 'important'); });
        });
        ['mouseleave', 'blur'].forEach(function (type) {
            addBtn.addEventListener(type, function () { addBtn.style.setProperty('border-color', restingBorder, 'important'); });
        });
        addBtn.addEventListener('click', function (e) {
            e.preventDefault();
            setSuppressHeavyWork(true);
            var newEntry = { code: '', name: '', grade: 7, ects: 5 };
            var newRow = createSimRow(newEntry);
            var lastSimRow = table.querySelector('.gpa-sim-row:last-of-type');
            if (lastSimRow) lastSimRow.after(newRow);
            else addRow.after(newRow);
            saveSimEntries();
            updateProjectedGPA();
            setSuppressHeavyWork(false);
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
            var addTd = document.createElement('td');
            addTd.setAttribute('data-dtu-ext', '1');
            addTd.colSpan = 5;
            addTd.style.cssText = 'text-align: left; padding: 6px 0;';
            addBtn.style.setProperty('margin', '0', 'important');
            addTd.appendChild(addBtn);
            addRow.appendChild(addTd);
        }

        headerRow.after(addRow);

        var insertAfter = addRow;
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

    if (isCampusnetGradesPage()) {
        insertGPARow();
        insertGPASimulator();
        syncCampusnetActualGradeExclusionControls();
    }
})();
