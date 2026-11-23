// Study Planner exam schedule: the date and format editor for one exam row.
// Loaded by darkmode.studyplan-exam-schedule.js before it draws the panel.
(function () {
    'use strict';

    var DOM = globalThis.DTUAfterDarkDom;
    if (!DOM || typeof DOM.el !== 'function' || typeof DOM.makeButton !== 'function') {
        throw new Error('darkmode.studyplan-exam-schedule.editor.js requires darkmode.dom.js loaded first');
    }
    var el = DOM.el;
    var makeButton = DOM.makeButton;

    function option(select, value, text) {
        var o = el('option', null, text);
        o.value = value;
        select.appendChild(o);
    }

    // Day, month and year as three lists, in Danish order, so the date never
    // depends on the browser's locale. value() is an ISO date, '' when left
    // empty, 'incomplete' when only some are picked, 'invalid' for a day that
    // does not exist (31 November).
    function dateField(iso, label, years, months) {
        var parts = iso ? iso.split('-') : ['', '', ''];
        var box = el('span', 'dtu-es-datefield dtu-es-field');
        var day = el('select', 'dtu-es-d');
        var month = el('select', 'dtu-es-m');
        var year = el('select', 'dtu-es-y');
        day.setAttribute('aria-label', label + ', day');
        month.setAttribute('aria-label', label + ', month');
        year.setAttribute('aria-label', label + ', year');
        option(day, '', 'Day');
        for (var d = 1; d <= 31; d++) option(day, String(d), String(d));
        option(month, '', 'Month');
        months.forEach(function (name, i) { option(month, String(i + 1), name); });
        option(year, '', 'Year');
        years.forEach(function (y) { option(year, String(y), String(y)); });
        day.value = parts[2] ? String(+parts[2]) : '';
        month.value = parts[1] ? String(+parts[1]) : '';
        year.value = parts[0] || '';
        box.appendChild(day);
        box.appendChild(month);
        box.appendChild(year);
        return {
            node: box,
            focus: function () { day.focus(); },
            value: function () {
                if (!day.value && !month.value && !year.value) return '';
                if (!day.value || !month.value || !year.value) return 'incomplete';
                var dt = new Date(Date.UTC(+year.value, +month.value - 1, +day.value));
                if (dt.getUTCDate() !== +day.value) return 'invalid';
                return year.value + '-' + String(month.value).padStart(2, '0') + '-' + String(day.value).padStart(2, '0');
            }
        };
    }

    function editorYears(row) {
        var now = new Date().getFullYear();
        var years = [now, now + 1, now + 2];
        // The period's own year and the next, so a project in a far period can be dated.
        var py = parseInt(String(row.periodKey || ''), 10);
        if (py) [py, py + 1].forEach(function (y) { if (years.indexOf(y) < 0) years.push(y); });
        [row.date, row.endDate, row.dtuDate].forEach(function (iso) {
            var y = iso ? +iso.slice(0, 4) : 0;
            if (y && years.indexOf(y) < 0) years.push(y);
        });
        return years.sort();
    }

    // One date by default; "Several days" adds a last day for an exam that
    // runs over more than one day, such as a big oral exam.
    function renderEditor(state, row, helpers) {
        if (!helpers
            || typeof helpers.courseTitle !== 'function'
            || typeof helpers.isCustom !== 'function'
            || typeof helpers.saveEntry !== 'function'
            || typeof helpers.basisOf !== 'function'
            || typeof helpers.periodEntries !== 'function'
            || typeof helpers.renderRows !== 'function'
            || !Array.isArray(helpers.EDIT_FORMATS)
            || !helpers.FORMAT_LABELS
            || !Array.isArray(helpers.MONTH_LONG)) {
            throw new Error('darkmode.studyplan-exam-schedule.editor.js requires the helpers from darkmode.studyplan-exam-schedule.js');
        }
        var courseTitle = helpers.courseTitle;
        var isCustom = helpers.isCustom;
        var saveEntry = helpers.saveEntry;
        var basisOf = helpers.basisOf;
        var periodEntries = helpers.periodEntries;
        var renderRows = helpers.renderRows;
        var FORMAT_LABELS = helpers.FORMAT_LABELS;
        var EDIT_FORMATS = helpers.EDIT_FORMATS;
        var MONTH_LONG = helpers.MONTH_LONG;
        var box = el('div', 'dtu-es-edit');
        var years = editorYears(row);
        box.appendChild(el('span', 'dtu-es-flabel', 'Format'));
        var format = el('select', 'dtu-es-format dtu-es-field');
        format.setAttribute('aria-label', 'Exam format for ' + courseTitle(state, row));
        EDIT_FORMATS.forEach(function (f) { option(format, f, FORMAT_LABELS[f]); });
        format.value = EDIT_FORMATS.indexOf(row.format) >= 0 ? row.format : isCustom(row.code) ? 'hand-in' : 'written';
        box.appendChild(format);

        var dateLabel = el('span', 'dtu-es-flabel', 'Date');
        box.appendChild(dateLabel);
        var start = dateField(row.date, 'Exam date for ' + courseTitle(state, row), years, MONTH_LONG);
        box.appendChild(start.node);
        var severalLabel = el('label', 'dtu-es-several');
        var several = el('input');
        several.type = 'checkbox';
        several.checked = !!row.endDate;
        severalLabel.appendChild(several);
        severalLabel.appendChild(document.createTextNode('Several days'));
        box.appendChild(severalLabel);
        var endLabel = el('span', 'dtu-es-flabel', 'Last day');
        box.appendChild(endLabel);
        var end = dateField(row.endDate, 'Last exam day for ' + courseTitle(state, row), years, MONTH_LONG);
        box.appendChild(end.node);
        var err = el('div', 'dtu-es-err');
        err.hidden = true;

        function sync() {
            var none = format.value === 'none';
            dateLabel.hidden = none;
            start.node.hidden = none;
            severalLabel.hidden = none;
            endLabel.hidden = none || !several.checked;
            end.node.hidden = endLabel.hidden;
        }
        format.addEventListener('change', sync);
        several.addEventListener('change', function () { sync(); if (several.checked) end.focus(); });
        sync();

        var buttons = el('div', 'dtu-es-edit-buttons');
        var save = makeButton('Save', function () {
            var f = format.value;
            var a = f === 'none' ? '' : start.value();
            var b = f === 'none' || !several.checked ? '' : end.value();
            var problem = [a, b].filter(function (v) { return v === 'incomplete' || v === 'invalid'; })[0];
            if (problem) {
                err.textContent = problem === 'invalid' ? 'That day does not exist in that month.' : 'Pick a day, a month and a year, or leave all three empty.';
                err.hidden = false;
                return;
            }
            if (!a && b) { a = b; b = ''; }
            if (a && b && b < a) { var t = a; a = b; b = t; }
            if (a === b) b = '';
            saveEntry(state, row.periodKey, row.code, { format: f, date: a || null, endDate: b || null, basis: basisOf(row) });
        });
        save.classList.add('dtu-es-save');
        buttons.appendChild(save);
        buttons.appendChild(makeButton('Cancel', function () { state.editing = null; state.open = row.id; renderRows(state); }));
        if (Object.prototype.hasOwnProperty.call(periodEntries(state, row.periodKey), row.code) && row.status === 'yours') {
            var reset = makeButton(row.dtuDate ? 'Use DTU\'s date' : 'Clear', function () { saveEntry(state, row.periodKey, row.code, null); });
            reset.classList.add('dtu-es-reset');
            buttons.appendChild(reset);
        }
        box.appendChild(buttons);
        box.appendChild(err);
        if (isCustom(row.code)) box.appendChild(el('div', 'dtu-es-note', 'Saved under this course\'s name. Renaming it in the planner starts it again with no date.'));
        return box;
    }

    globalThis.DTUAfterDarkExamScheduleEditor = {
        renderEditor: renderEditor
    };
})();
