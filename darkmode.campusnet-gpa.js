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
            countsForGpa: numericGrade !== null && safeEcts > 0,
            countsForPassedEcts: ((numericGrade !== null && numericGrade >= 2) || /^BE\b/i.test(gradeText)) && safeEcts > 0
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

    function getCampusnetActualGradeSummary(table) {
        var entries = getCampusnetActualGradeEntries(table);
        var excludedSet = new Set(readCampusnetExcludedActualGradeSignatures());
        var totalWeighted = 0;
        var totalECTS = 0;
        var passedECTS = 0;
        var excludedCount = 0;
        var excludedECTS = 0;

        entries.forEach(function (entry) {
            entry.excluded = excludedSet.has(entry.signature);
            if (entry.excluded) {
                excludedCount++;
                if (entry.ects > 0) excludedECTS += entry.ects;
                return;
            }
            if (entry.countsForGpa) {
                totalWeighted += entry.numericGrade * entry.ects;
                totalECTS += entry.ects;
            }
            if (entry.countsForPassedEcts) {
                passedECTS += entry.ects;
            }
        });

        return {
            entries: entries,
            excludedSet: excludedSet,
            totalWeighted: totalWeighted,
            totalECTS: totalECTS,
            passedECTS: passedECTS,
            excludedCount: excludedCount,
            excludedECTS: excludedECTS
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

    function applyCampusnetActualGradeToggleButtonState(btn, excluded) {
        if (!btn || !btn.style) return;
        btn.classList.toggle('is-excluded', !!excluded);
        btn.setAttribute('aria-pressed', excluded ? 'true' : 'false');
        btn.textContent = excluded ? 'Back' : 'Hide';
        btn.title = excluded
            ? 'Include this course again in GPA and ECTS calculations'
            : 'Ignore this course in GPA and ECTS calculations';
        var fg = isDarkMode()
            ? (excluded ? 'rgba(var(--dtu-ad-accent-rgb), 0.56)' : 'rgba(var(--dtu-ad-accent-rgb), 0.74)')
            : (excluded ? 'rgba(var(--dtu-ad-accent-deep-rgb), 0.68)' : 'rgba(var(--dtu-ad-accent-deep-rgb), 0.92)');
        btn.style.setProperty('background', 'transparent', 'important');
        btn.style.setProperty('background-color', 'transparent', 'important');
        btn.style.setProperty('background-image', 'none', 'important');
        btn.style.setProperty('color', fg, 'important');
        btn.style.setProperty('border', '0', 'important');
        btn.style.setProperty('border-radius', '0', 'important');
        btn.style.setProperty('box-shadow', 'none', 'important');
        btn.style.setProperty('outline', '0', 'important');
        btn.style.setProperty('appearance', 'none', 'important');
        btn.style.setProperty('-webkit-appearance', 'none', 'important');
        btn.style.setProperty('padding', '0', 'important');
        btn.style.setProperty('display', 'inline-flex', 'important');
        btn.style.setProperty('align-items', 'center', 'important');
        btn.style.setProperty('justify-content', 'center', 'important');
        btn.style.setProperty('float', 'right', 'important');
        btn.style.setProperty('clear', 'none', 'important');
        btn.style.setProperty('margin-top', '0', 'important');
        btn.style.setProperty('margin-left', '0', 'important');
        btn.style.setProperty('margin-right', '12px', 'important');
        btn.style.setProperty('line-height', '1.2', 'important');
        btn.style.setProperty('white-space', 'nowrap', 'important');
        btn.style.setProperty('vertical-align', 'middle', 'important');
    }

    function applyCampusnetActualGradeExcludedRowInlineStyles(entry, excluded) {
        if (!entry || !entry.row || !entry.row.querySelectorAll) return;

        entry.row.querySelectorAll('[data-gpa-actual-inline-muted="1"]').forEach(function (el) {
            if (!el || !el.style) return;
            el.removeAttribute('data-gpa-actual-inline-muted');
            el.style.removeProperty('background');
            el.style.removeProperty('background-color');
            el.style.removeProperty('color');
            el.style.removeProperty('text-decoration');
        });

        if (!excluded) return;

        var rowBg = isDarkMode() ? '#1f1f1f' : '#f3f4f6';
        var mutedText = isDarkMode() ? '#a8afb8' : '#6b7280';

        entry.row.querySelectorAll('td').forEach(function (cell) {
            if (!cell || !cell.style) return;
            cell.setAttribute('data-gpa-actual-inline-muted', '1');
            cell.style.setProperty('background', rowBg, 'important');
            cell.style.setProperty('background-color', rowBg, 'important');
            cell.style.setProperty('color', mutedText, 'important');
            cell.style.setProperty('text-decoration', 'line-through', 'important');
        });

        entry.row.querySelectorAll('td span, td a').forEach(function (el) {
            if (!el || !el.style) return;
            if (el.closest && el.closest('.gpa-actual-toggle-btn')) return;
            el.setAttribute('data-gpa-actual-inline-muted', '1');
            el.style.setProperty('color', mutedText, 'important');
            el.style.setProperty('text-decoration', 'line-through', 'important');
        });
    }

    function applyCampusnetActualGradeColumnLayout(table) {
        var scope = table || getCampusnetGradesTable();
        if (!scope) return;
        scope.querySelectorAll('tr.gradesListHeader td:first-child, tr.context_direct td:first-child, tr.context_alternating td:first-child').forEach(function (cell) {
            if (!cell || !cell.style) return;
            cell.style.setProperty('width', '220px', 'important');
            cell.style.setProperty('min-width', '220px', 'important');
            cell.style.setProperty('white-space', 'nowrap', 'important');
        });
    }

    function applyCampusnetActualGradeExclusionState(entry, btn, excluded) {
        if (!entry || !entry.row) return;
        entry.row.classList.toggle('gpa-actual-excluded', !!excluded);
        if (excluded) entry.row.setAttribute('data-gpa-actual-excluded', '1');
        else entry.row.removeAttribute('data-gpa-actual-excluded');
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
        var progress = document.querySelector('.ects-progress-container');
        if (progress) progress.remove();
        insertGPARow();
        insertECTSProgressBar();
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

            btn.setAttribute('data-gpa-signature', entry.signature);
            applyCampusnetActualGradeExclusionState(entry, btn, summary.excludedSet.has(entry.signature));
        });
    }

    function insertGPARow() {
        if (!isTopWindow()) return;
        if (!isFeatureEnabled()) {
            var disabledTable = getCampusnetGradesTable();
            if (disabledTable) {
                clearCampusnetActualGradeExclusionUi(disabledTable);
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

        var gpa = summary.totalECTS > 0 ? (summary.totalWeighted / summary.totalECTS) : 0;
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
        tdGrade.textContent = summary.totalECTS > 0 ? gpa.toFixed(2) : '—';

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

    function insertECTSProgressBar() {
        if (!isTopWindow()) return;
        if (!isFeatureEnabled()) {
            var disabled = document.querySelector('.ects-progress-container');
            if (disabled) disabled.remove();
            return;
        }
        var table = getCampusnetGradesTable();
        if (!table) return;

        var existing = document.querySelector('.ects-progress-container');
        if (existing) {
            var accentFill = isDarkMode() ? 'var(--dtu-ad-accent)' : 'var(--dtu-ad-accent-deep)';
            var barFill = existing.querySelector('.ects-bar-fill');
            if (barFill && barFill.style) {
                barFill.style.setProperty('background', accentFill, 'important');
                barFill.style.setProperty('background-color', accentFill, 'important');
                barFill.style.setProperty('background-image', 'none', 'important');
                barFill.removeAttribute('data-bar-color');
            }
            return;
        }

        var summary = getCampusnetActualGradeSummary(table);
        var passedECTS = summary.passedECTS;
        if (passedECTS === 0) return;

        var inMasters = passedECTS > 180;
        var target = inMasters ? 300 : 180;
        var pct = Math.min((passedECTS / target) * 100, 100);
        var mscECTS = inMasters ? passedECTS - 180 : 0;
        var targetLabel = inMasters
            ? 'BSc done · MSc ' + mscECTS + ' / 120 ECTS'
            : 'BSc (' + passedECTS + ' / 180 ECTS)';

        var container = document.createElement('div');
        container.className = 'ects-progress-container';
        container.setAttribute('data-dtu-ext', '1');
        container.style.cssText = isDarkMode()
            ? 'margin: 12px 0 16px 0; padding: 10px 12px; background: #2d2d2d; border-radius: 6px;'
            : 'margin: 12px 0 16px 0; padding: 10px 12px; background: #ffffff; border-radius: 6px; border: 1px solid #ddd;';

        var label = document.createElement('div');
        label.setAttribute('data-dtu-ext', '1');
        label.style.cssText = isDarkMode()
            ? 'display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; color: #e0e0e0;'
            : 'display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; color: #333;';

        var labelLeft = document.createElement('span');
        labelLeft.setAttribute('data-dtu-ext', '1');
        labelLeft.style.fontWeight = 'bold';
        labelLeft.textContent = passedECTS + ' ECTS earned';

        var labelRight = document.createElement('span');
        labelRight.setAttribute('data-dtu-ext', '1');
        labelRight.style.color = isDarkMode() ? '#b0b0b0' : '#666';
        labelRight.textContent = targetLabel;

        label.appendChild(labelLeft);
        label.appendChild(labelRight);

        var barBg = document.createElement('div');
        barBg.className = 'ects-bar-bg';
        barBg.setAttribute('data-dtu-ext', '1');
        barBg.style.cssText = 'width: 100%; height: 18px; border-radius: 9px; overflow: hidden; position: relative;';
        barBg.style.setProperty('background', isDarkMode() ? '#1a1a1a' : '#e0e0e0', 'important');
        barBg.style.setProperty('background-color', isDarkMode() ? '#1a1a1a' : '#e0e0e0', 'important');

        var barFill = document.createElement('div');
        barFill.className = 'ects-bar-fill';
        barFill.setAttribute('data-dtu-ext', '1');
        var barColor = isDarkMode() ? 'var(--dtu-ad-accent)' : 'var(--dtu-ad-accent-deep)';
        barFill.style.cssText = 'height: 100%; border-radius: 9px; transition: width 0.3s; width: ' + pct + '%;';
        barFill.style.setProperty('background', barColor, 'important');
        barFill.style.setProperty('background-color', barColor, 'important');

        var pctLabel = document.createElement('div');
        pctLabel.className = 'ects-bar-pct';
        pctLabel.setAttribute('data-dtu-ext', '1');
        pctLabel.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.5);';
        pctLabel.style.setProperty('color', '#ffffff', 'important');
        pctLabel.style.setProperty('background', 'transparent', 'important');
        pctLabel.textContent = Math.round(pct) + '%';

        barBg.appendChild(barFill);
        barBg.appendChild(pctLabel);
        container.appendChild(label);
        container.appendChild(barBg);

        table.parentNode.insertBefore(container, table);
    }

    function syncGpaSimulatorDisclaimer(table) {
        if (!table) return;
        var addRow = table.querySelector('.gpa-sim-add-row');
        if (!addRow) return;

        var disclaimerRow = table.querySelector('.gpa-sim-disclaimer-row');
        if (!disclaimerRow) {
            disclaimerRow = document.createElement('tr');
            disclaimerRow.className = 'gpa-sim-disclaimer-row';
            disclaimerRow.setAttribute('data-dtu-ext', '1');

            var td = document.createElement('td');
            td.colSpan = 5;
            td.setAttribute('data-dtu-ext', '1');
            td.style.cssText = 'text-align:right;padding:4px 6px 2px;font-size:10px;';
            td.style.setProperty('color', isDarkMode() ? '#9aa1aa' : '#6b7280', 'important');
            td.textContent = 'Hypothetical GPA is an estimate. Always verify official grades/GPA in DTU systems.';
            disclaimerRow.appendChild(td);
        }

        var simRows = table.querySelectorAll('.gpa-sim-row');
        var anchor = simRows.length ? simRows[simRows.length - 1] : addRow;
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
    }

    function createSimRow(entry) {
        var tr = document.createElement('tr');
        tr.className = 'gpa-sim-row';
        tr.setAttribute('data-dtu-ext', '1');
        tr.style.setProperty('border-left', '2px solid rgba(var(--dtu-ad-accent-rgb), 0.55)', 'important');

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
        ectsInput.style.cssText = 'width: 67px; text-align: left; padding-left: 10px; padding-right: 22px; box-sizing: border-box;';
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
            document.querySelectorAll('.gpa-sim-row, .gpa-sim-add-row, .gpa-projected-row, .gpa-sim-disclaimer-row').forEach(function (el) {
                el.remove();
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

        var addRow = document.createElement('tr');
        addRow.className = 'gpa-sim-add-row';
        addRow.setAttribute('data-dtu-ext', '1');
        var addTd = document.createElement('td');
        addTd.setAttribute('data-dtu-ext', '1');
        addTd.colSpan = 5;
        addTd.style.cssText = 'text-align: left; padding: 6px 0;';
        var addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'gpa-sim-add-btn';
        addBtn.setAttribute('data-dtu-ext', '1');
        addBtn.textContent = '+ Add hypothetical grade';
        addBtn.style.setProperty('background', 'rgba(var(--dtu-ad-accent-rgb), 0.12)', 'important');
        addBtn.style.setProperty('background-color', 'rgba(var(--dtu-ad-accent-rgb), 0.12)', 'important');
        addBtn.style.setProperty('color', isDarkMode() ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)', 'important');
        addBtn.style.setProperty('border-color', 'rgba(var(--dtu-ad-accent-rgb), 0.55)', 'important');
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
        });
        addBtn.addEventListener('mouseenter', function () {
            addBtn.style.setProperty('background-color', 'rgba(var(--dtu-ad-accent-rgb), 0.2)', 'important');
            addBtn.style.setProperty('background', 'rgba(var(--dtu-ad-accent-rgb), 0.2)', 'important');
            addBtn.style.setProperty('border-color', 'rgba(var(--dtu-ad-accent-rgb), 0.8)', 'important');
            addBtn.style.setProperty('color', '#ffffff', 'important');
        });
        addBtn.addEventListener('mouseleave', function () {
            addBtn.style.setProperty('background', 'rgba(var(--dtu-ad-accent-rgb), 0.12)', 'important');
            addBtn.style.setProperty('background-color', 'rgba(var(--dtu-ad-accent-rgb), 0.12)', 'important');
            addBtn.style.setProperty('color', isDarkMode() ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)', 'important');
            addBtn.style.setProperty('border-color', 'rgba(var(--dtu-ad-accent-rgb), 0.55)', 'important');
        });
        addTd.appendChild(addBtn);
        addRow.appendChild(addTd);

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
            insertECTSProgressBar: insertECTSProgressBar,
            insertGPASimulator: insertGPASimulator,
            syncCampusnetActualGradeExclusionControls: syncCampusnetActualGradeExclusionControls
        };
    } catch (eExpose) { }

    if (isCampusnetGradesPage()) {
        insertGPARow();
        insertECTSProgressBar();
        insertGPASimulator();
        syncCampusnetActualGradeExclusionControls();
    }
})();
