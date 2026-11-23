// Study Planner exam schedule: one "Exam schedule" button in the planner's tab
// row opens a dialog that shows one exam period at a time: a sentence saying
// how many exams and when, a strip of days, and one line per planned course
// with its exam date, read from DTU's exam table, and its workload rating.
// Basket courses for the period follow, marked when they land on a planned exam. A date is only ever
// suggested when DTU's table gives it; the student can set their own format
// and date for any course. Parsing and resolution live in
// darkmode.studyplan-exam-schedule-core.js.
(function () {
    'use strict';
    var DOM = globalThis.DTUAfterDarkDom;
    var markExt = DOM.markExt;
    var el = DOM.el;
    var ensureStyles = DOM.ensureStyles;
    var makeButton = DOM.makeButton;
    var formatReadDate = DOM.formatReadDate;

    var STORAGE_KEY = 'dtuAfterDarkExamScheduleV1';
    // Read by CampusNet Grades (darkmode.campusnet-gpa.js) to name exams past DTU's grading deadline with no grade yet.
    var GRADING_WATCH_KEY = 'dtuExamGradingWatchV1';
    var _lastGradingWatch = null;
    var EXAM_TABLE_URL = 'https://student.dtu.dk/en/exam/exam-dates';
    var STYLE_ID = 'dtu-exam-schedule-style';
    var CODE_RE = /^[0-9]{2}[0-9A-Z]{3}$/;
    var CUSTOM_PREFIX = 'custom:';
    var normalizeWhitespace = DOM.normalizeWhitespace;
    var FORMAT_LABELS = { written: 'Written', oral: 'Oral', 'hand-in': 'Hand-in', none: 'No exam', unknown: 'Format not read' };
    var EDIT_FORMATS = ['written', 'oral', 'hand-in', 'none'];

    function getDeps() {
        try { return globalThis.DTUAfterDarkExamScheduleDeps || null; } catch (e0) { return null; }
    }

    function dep(name) {
        return DOM.dep(getDeps(), name);
    }

    function skeleton() {
        var skel = globalThis.DTUAfterDarkSkeleton;
        if (!skel) throw new Error('DTUAfterDarkSkeleton missing: load darkmode.skeleton.js before darkmode.studyplan-exam-schedule.js');
        return skel;
    }

    function getCore() {
        try { return globalThis.DTUAfterDarkExamScheduleCore || null; } catch (e0) { return null; }
    }

    function getStyles() {
        var styles = globalThis.DTUAfterDarkExamScheduleStyles;
        if (!styles || typeof styles.applyTheme !== 'function' || typeof styles.CSS !== 'string') {
            throw new Error('darkmode.studyplan-exam-schedule.js requires darkmode.studyplan-exam-schedule.styles.js loaded first');
        }
        return styles;
    }

    function getEditor() {
        var editor = globalThis.DTUAfterDarkExamScheduleEditor;
        if (!editor || typeof editor.renderEditor !== 'function') {
            throw new Error('darkmode.studyplan-exam-schedule.js requires darkmode.studyplan-exam-schedule.editor.js loaded first');
        }
        return editor;
    }

    var scheduleStyles = getStyles();
    var scheduleEditor = getEditor();


    function sendMessage(msg) {
        return new Promise(function (resolve) {
            var send = dep('sendRuntimeMessage');
            if (!send) { resolve(null); return; }
            try { send(msg, function (res) { resolve(res || null); }); } catch (e0) { resolve(null); }
        });
    }

    function readStore() {
        return new Promise(function (resolve) {
            var get = dep('storageLocalGet');
            if (!get) { resolve({}); return; }
            var defaults = {};
            defaults[STORAGE_KEY] = {};
            get(defaults, function (result) {
                var value = result && result[STORAGE_KEY];
                resolve(value && typeof value === 'object' ? value : {});
            });
        });
    }

    function writeStore(store) {
        var set = dep('storageLocalSet');
        if (!set) return;
        var items = {};
        items[STORAGE_KEY] = store;
        set(items);
    }

    // ===== Data =====

    var _tablePromise = null;

    // DTU's exam table, parsed. Button checks on every observer tick reuse the
    // last result, a failure included. Opening the panel (fresh) asks the
    // background again, which serves its own 12-hour cache, so a tab left open
    // for days does not show a table older than that.
    function loadExamTable(fresh) {
        if (_tablePromise && !fresh) return _tablePromise;
        var promise = sendMessage({ type: 'dtu-exam-table' }).then(function (res) {
            if (!res || !res.ok) throw new Error('fetch_failed');
            var parsed = getCore().parseExamTable(res.html);
            return { sections: parsed.sections, fetchedAt: res.fetchedAt };
        });
        promise.catch(function () { promise.failed = true; });
        _tablePromise = promise;
        return promise;
    }

    function loadCourseFields(code, volume) {
        return sendMessage({ type: 'dtu-course-page', code: code, volume: volume }).then(function (res) {
            if (!res || !res.ok) return null;
            return getCore().parseCourseExamFields(res.html);
        });
    }

    // Today in Denmark: DTU's exam dates are Danish dates.
    function todayIso() {
        return DOM.copenhagenDateIso();
    }

    // ===== Planner DOM =====

    function headerCell(table) {
        return table.querySelector('tr th');
    }

    function periodHeaderText(th) {
        // The header cell's own text, without our button.
        var text = '';
        Array.prototype.forEach.call(th.childNodes, function (n) {
            if (n.nodeType === 3) text += n.nodeValue;
        });
        return text.replace(/\s+/g, ' ').trim();
    }

    function plannerPeriodTables() {
        var core = getCore();
        var out = [];
        Array.prototype.forEach.call(document.querySelectorAll('table'), function (table) {
            var th = headerCell(table);
            if (!th) return;
            var label = periodHeaderText(th);
            var period = core.parsePlannerPeriod(label);
            if (period) out.push({ table: table, th: th, label: label, period: period });
        });
        return out;
    }

    function plannedCourses(table) {
        var seen = {};
        var out = [];
        Array.prototype.forEach.call(table.querySelectorAll('a.coursecode'), function (a) {
            var code = String(a.textContent || '').trim().toUpperCase();
            if (!CODE_RE.test(code) || seen[code]) return;
            seen[code] = true;
            var nameEl = a.nextElementSibling;
            // A 3-week course's Placement cell says its month ("June").
            var month = null;
            var tr = a.closest('tr');
            if (tr) Array.prototype.forEach.call(tr.children, function (td) { month = month || getCore().threeWeekMonth(td.textContent); });
            out.push({ code: code, name: nameEl ? String(nameEl.textContent || '').replace(/\s+/g, ' ').trim() : '', month: month });
        });
        // A course the student made in the planner (a thesis, an exchange
        // semester): a type box and a name, no course code. Its own date only.
        Array.prototype.forEach.call(table.querySelectorAll('tr'), function (tr) {
            if (!tr.querySelector('.typebox') || tr.querySelector('a.coursecode') || tr.children.length < 2) return;
            var name = normalizeWhitespace(tr.children[1].textContent);
            if (!name) return;
            // Saved under its name (the planner shows no id for it); a second
            // course of the same name in the period gets its own key.
            var id = CUSTOM_PREFIX + name;
            for (var n = 2; seen[id]; n++) id = CUSTOM_PREFIX + name + '#' + n;
            seen[id] = true;
            var ects = tr.children[4] ? normalizeWhitespace(tr.children[4].textContent) : '';
            out.push({ code: id, name: name, custom: true, ects: /^\d+(?:[.,]\d+)?$/.test(ects) ? ects : '' });
        });
        return out;
    }

    function isCustom(code) {
        return String(code).indexOf(CUSTOM_PREFIX) === 0;
    }

    // The planner's course basket: code, title, the slot text ("E3A, F4A") and
    // the seasons it can be placed in, from its drop-zone classes.
    var BASKET_ZONES = { targetZoneAutumn13: 'E', targetZoneSpring13: 'F', targetZoneAutumn3: 'J', targetZoneSpring3: 'S' };

    function basketCourses() {
        var box = document.querySelector('[data-bind*="basketReceiveItem"]');
        if (!box) return null;
        var seen = {};
        var out = [];
        Array.prototype.forEach.call(box.querySelectorAll('.drag-item'), function (item) {
            var a = item.querySelector('a.coursecode');
            var code = a ? String(a.textContent || '').trim().toUpperCase() : '';
            if (!CODE_RE.test(code) || seen[code]) return;
            seen[code] = true;
            var nameEl = a.nextElementSibling;
            var slotEl = item.querySelector('[data-bind*="unifiedClassSchedule"]');
            var seasons = [];
            Object.keys(BASKET_ZONES).forEach(function (cls) { if (item.classList.contains(cls)) seasons.push(BASKET_ZONES[cls]); });
            out.push({
                code: code,
                name: nameEl ? String(nameEl.textContent || '').replace(/\s+/g, ' ').trim() : '',
                slot: slotEl ? String(slotEl.textContent || '').replace(/\s+/g, ' ').trim() : '',
                seasons: seasons
            });
        });
        return out;
    }

    // ===== Formatting =====

    function formatDay(iso) {
        if (!iso) return '';
        var p = iso.split('-');
        var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
        try { return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); } catch (e0) { return iso; }
    }

    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    function isoParts(iso) {
        var p = iso.split('-');
        var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
        return { day: d.getUTCDate(), month: MONTHS[d.getUTCMonth()], weekday: WEEKDAYS[d.getUTCDay()] };
    }
    // "Mon 7 Dec", "7 to 9 Dec", or a word when there is no day to show.
    function whenText(row) {
        if (row.status === 'no-exam' || row.format === 'none') return 'No exam';
        if (row.status === 'teacher') return 'No fixed date';
        if (!row.date) return 'No date';
        var a = isoParts(row.date);
        if (!row.endDate || row.status === 'suggested') return a.weekday + ' ' + a.day + ' ' + a.month;
        var b = isoParts(row.endDate);
        return a.day + (a.month === b.month ? '' : ' ' + a.month) + ' to ' + b.day + ' ' + b.month;
    }

    // The few words at the end of a row; the full source is in the opened row.
    function kindText(row) {
        var format = row.format === 'written' || row.format === 'oral' || row.format === 'hand-in' ? FORMAT_LABELS[row.format] : '';
        if (row.status === 'suggested') return row.format === 'hand-in' ? 'Coursework' : (format || 'Format not read');
        if (row.status === 'yours') return format ? format + ', set by you' : 'Set by you';
        if (row.status === 'changed') return 'DTU changed this';
        if (row.status === 'custom') return 'Your own course';
        if (row.status === 'unconfirmed') return 'Not confirmed';
        if (row.status === 'no-exam') return 'Coursework';
        if (row.status === 'teacher') return 'Agree with teacher';
        return '';
    }

    function detailText(row) {
        var info = getCore().gradingForRow(row, _state && _state.sections);
        var grading = info ? getCore().gradingText(info.grading, todayIso(), formatDay, info.day) + '.' : '';
        if (info && row.status === 'suggested' && row.range) grading += ' A later exam day has a later deadline: set your day to see it.';
        return mainDetailText(row) + (grading ? ' ' + grading : '');
    }

    function mainDetailText(row) {
        if (row.status === 'suggested') {
            if (row.format === 'hand-in') return 'Assessed on coursework (exercises, reports or a project), per the course page. The day is ' + getCore().evidenceText(row.evidence) + '.';
            return sourceLine(row).replace(' from this day', '') + '.' + (row.range ? ' This is the first day: oral exams may run over several days.' : row.pageDays ? ' ' + getCore().severalDaysNote(row) : '');
        }
        if (row.status === 'yours') return sourceLine(row) + '.';
        return sourceText(row).replace(/\.$/, '') + '.';
    }

    function sourceLine(row) {
        var format = row.format === 'written' || row.format === 'oral' || row.format === 'hand-in' ? FORMAT_LABELS[row.format] : '';
        if (row.status === 'suggested') {
            return (format ? format + (row.range ? ' from this day' : '') + ', ' : '') + getCore().evidenceText(row.evidence);
        }
        if (row.status === 'yours') {
            return (format ? format + ', set by you' : 'Set by you') + (row.endDate ? ', ' + formatDay(row.date) + ' to ' + formatDay(row.endDate) : '');
        }
        return sourceText(row);
    }

    function sourceText(row) {
        if (row.status === 'yours') return 'Yours';
        if (row.status === 'changed') {
            var mine = row.date ? formatDay(row.date) : 'no date';
            return row.dtuDate
                ? 'DTU\'s table now says ' + formatDay(row.dtuDate) + '; you have ' + mine
                : 'DTU\'s table no longer gives a date (' + (row.reason || 'not confirmed') + '); you have ' + mine;
        }
        if (row.status === 'custom') return 'Your own course' + (row.ects ? ', ' + row.ects + ' ECTS' : '') + '. Add a date when you know it.';
        return getCore().outcomeText(row);
    }

    // ===== Panel =====

    var _state = null;

    function closePanel() {
        if (!_state) return;
        if (_state.pop && _state.pop.parentNode) _state.pop.parentNode.removeChild(_state.pop);
        if (_state.backdrop && _state.backdrop.parentNode) _state.backdrop.parentNode.removeChild(_state.backdrop);
        document.removeEventListener('keydown', _state.onKey, true);
        var button = _state.button;
        _state = null;
        if (button) {
            button.setAttribute('aria-expanded', 'false');
            if (button.isConnected) try { button.focus({ preventScroll: true }); } catch (e0) { }
        }
    }

    // The panel's outline (headline, day strip, then exam rows: date, course,
    // workload, form) while DTU's table and the course pages are read;
    // renderRows fades the real rows in.
    function showSkeleton(state, label, rows) {
        var body = state.body;
        while (body.firstChild) body.removeChild(body.firstChild);
        var row = [['84px', '12px'], ['', '12px', 'dtu-skel-grow'], ['64px', '9px'], ['48px', '12px']];
        var lines = [[['240px', '22px']], [['', '14px', 'dtu-skel-grow']]];
        for (var i = 0; i < Math.max(3, Math.min(rows || 0, 6)); i++) lines.push(row);
        var box = skeleton().block(label, lines, markExt);
        box.style.cssText = 'gap:26px;padding:16px 0';
        body.appendChild(box);
        state.skeleton = true;
    }

    function showMessage(state, text, withLink) {
        var list = state.body;
        while (list.firstChild) list.removeChild(list.firstChild);
        while (state.tabs.firstChild) state.tabs.removeChild(state.tabs.firstChild);
        var p = el('div', 'dtu-es-empty', text);
        if (withLink) {
            p.appendChild(document.createTextNode(' '));
            var a = el('a', null, 'Open DTU\'s exam page');
            a.href = EXAM_TABLE_URL;
            a.target = '_blank';
            a.rel = 'noopener';
            p.appendChild(a);
        }
        list.appendChild(p);
    }

    function periodEntries(state, key) {
        var all = state.store[key];
        return all && typeof all === 'object' ? all : {};
    }

    function saveEntry(state, key, code, entry) {
        var entries = Object.assign({}, periodEntries(state, key));
        if (entry) entries[code] = entry; else delete entries[code];
        state.store = Object.assign({}, state.store);
        if (Object.keys(entries).length) state.store[key] = entries; else delete state.store[key];
        writeStore(state.store);
        state.editing = null;
        renderRows(state);
    }

    function basisOf(row) {
        return row.dtuDate ? { date: row.dtuDate, evidence: row.evidence } : null;
    }

    var MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // ===== Workload =====

    // The latest course evaluation's workload question, read by the background
    // and filled into the row when it arrives; the rows never wait for it.
    function fillWorkload(cell, data) {
        while (cell.firstChild) cell.removeChild(cell.firstChild);
        cell.removeAttribute('title');
        // Still being read: the shared pulsing placeholder, the size of the rating.
        if (data === null) {
            cell.appendChild(skeleton().bar('64px', '9px', null, markExt));
            return;
        }
        if (!data) return;
        var bars = el('i');
        for (var n = 1; n <= 5; n++) bars.appendChild(el('u', n <= Math.round(data.average) ? 'on' : null));
        cell.appendChild(bars);
        cell.appendChild(document.createTextNode(data.average.toFixed(1)));
        cell.title = 'Students compared the time they spent with what the ECTS points call for: 1 is much less, 3 the same, 5 much more. '
            + 'Average ' + data.average.toFixed(1) + ' from ' + data.responses + (data.responses === 1 ? ' answer' : ' answers') + ' in the latest course evaluation.';
    }

    function workloadCell(state, code) {
        var cell = el('div', 'dtu-es-load');
        if (isCustom(code)) return cell;
        (state.loadCells[code] = state.loadCells[code] || []).push(cell);
        // null while the rating is being read, false when the course has none.
        var known = Object.prototype.hasOwnProperty.call(state.workload, code);
        if (!known) state.workload[code] = null;
        fillWorkload(cell, state.workload[code]);
        if (known) return cell;
        sendMessage({ type: 'dtu-course-workload', code: code }).then(function (res) {
            var rated = res && res.ok && res.average > 0 && res.responses > 0;
            state.workload[code] = rated ? { average: res.average, responses: res.responses } : false;
            if (_state !== state) return;
            (state.loadCells[code] || []).forEach(function (c) {
                fillWorkload(c, state.workload[code]);
                if (rated) skeleton().reveal(c, markExt);
            });
        });
        return cell;
    }

    // ===== Rows =====

    function coursePageLink(code) {
        var a = el('a', null, 'Course page');
        a.href = 'https://kurser.dtu.dk/course/' + code;
        a.target = '_blank';
        a.rel = 'noopener';
        return a;
    }

    function rowShell(state, id, className, when, name, code, loadCode, kind, kindNear) {
        var open = state.open === id || state.editing === id;
        var node = el('div', 'dtu-es-row ' + className + (open ? ' open' : ''));
        node.tabIndex = 0;
        node.setAttribute('role', 'button');
        node.setAttribute('aria-expanded', open ? 'true' : 'false');
        node.appendChild(el('div', 'dtu-es-when', when));
        var course = el('div', 'dtu-es-course', name);
        if (code) course.appendChild(el('span', 'dtu-es-code', code));
        node.appendChild(course);
        node.appendChild(workloadCell(state, loadCode));
        node.appendChild(el('div', 'dtu-es-kind' + (kindNear ? ' near' : ''), kind));
        function toggle() {
            if (state.editing === id) return;
            state.open = state.open === id ? null : id;
            renderRows(state);
        }
        node.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('.dtu-es-edit, .dtu-es-detail, button, a')) return;
            toggle();
        });
        node.addEventListener('keydown', function (e) {
            if (e.target !== node || (e.key !== 'Enter' && e.key !== ' ')) return;
            e.preventDefault();
            toggle();
        });
        return node;
    }

    // A planned course. A click opens where its date comes from and the button
    // that changes it; a date DTU has changed is always open, with its choice.
    function renderRow(state, row) {
        var key = row.periodKey;
        var custom = isCustom(row.code);
        var quiet = row.status === 'unconfirmed' || row.status === 'no-exam' || row.status === 'teacher' || !row.date;
        var node = rowShell(state, row.id, row.status + (quiet ? ' quiet' : ''), whenText(row),
            custom ? state.names[row.code] : (state.names[row.code] || row.code), custom ? '' : row.code, row.code, kindText(row), false);
        node.setAttribute('aria-label', 'Exam for ' + courseTitle(state, row) + ', ' + whenText(row) + '. Open to change the date or format.');
        if (state.editing === row.id) {
            node.appendChild(scheduleEditor.renderEditor(state, row, EDITOR_HELPERS));
            return node;
        }
        if (state.open !== row.id && row.status !== 'changed') return node;
        node.classList.add('open');
        var detail = el('div', 'dtu-es-detail', detailText(row));
        var actions = el('div', 'dtu-es-detail-actions');
        if (row.status === 'changed') {
            actions.appendChild(makeButton(row.dtuDate ? 'Use DTU\'s date' : 'Remove mine', function () { saveEntry(state, key, row.code, null); }));
            actions.appendChild(makeButton('Keep mine', function () {
                saveEntry(state, key, row.code, Object.assign({}, periodEntries(state, key)[row.code], { basis: basisOf(row) }));
            }));
        }
        var change = makeButton(row.date || row.status === 'no-exam' || row.format === 'none' ? 'Change date or format' : 'Add a date', function () {
            state.editing = row.id;
            renderRows(state);
        });
        change.classList.add('dtu-es-change');
        actions.appendChild(change);
        if (!custom) actions.appendChild(coursePageLink(row.code));
        detail.appendChild(actions);
        node.appendChild(detail);
        return node;
    }

    // A basket course in a period it can be placed in: read only, with a note
    // when it lands on or next to a planned exam.
    function renderBasketRow(state, entry, planned, withPeriod) {
        var row = entry.exam.row;
        var id = 'basket|' + entry.item.code + '|' + entry.exam.key;
        var near = getCore().nearbyExams({ code: entry.item.code, date: row.date, endDate: null }, planned);
        var node = rowShell(state, id, 'basket' + (row.date ? '' : ' quiet'), whenText(row), entry.item.name || entry.item.code,
            entry.item.code + (withPeriod ? ', ' + entry.exam.label : ''), entry.item.code, near.length ? nearText(near) : kindText(row), !!near.length);
        node.setAttribute('aria-label', 'Basket course ' + entry.item.code + ' ' + entry.item.name + ', ' + whenText(row));
        if (state.open !== id) return node;
        var detail = el('div', 'dtu-es-detail', 'In your course basket, not in your plan. ' + detailText(row));
        var actions = el('div', 'dtu-es-detail-actions');
        actions.appendChild(coursePageLink(entry.item.code));
        detail.appendChild(actions);
        node.appendChild(detail);
        return node;
    }

    // One group per period, in time order; the days between exams are counted
    // across all of them, so a January exam shows how soon it follows December.
    function currentGroups(state) {
        var core = getCore();
        return state.groups.filter(function (g) { return g.courses.length; }).map(function (g) {
            var rows = core.mergeStudentEntries(state.resolved[g.key] || {}, periodEntries(state, g.key));
            rows.forEach(function (r) { r.periodKey = g.key; r.id = g.key + '|' + r.code; r.ects = state.ects[r.code] || ''; });
            return { key: g.key, label: g.label, rows: rows, later: !!g.later };
        });
    }

    // "34034 Lasers and photonic systems", or a custom course's own name.
    function courseTitle(state, row) {
        if (isCustom(row.code)) return state.names[row.code] || '';
        return row.code + (state.names[row.code] ? ' ' + state.names[row.code] : '');
    }

    var CALENDAR_STATUSES = { suggested: true, yours: true, changed: true };

    function calendarRows(group) {
        return group.rows.filter(function (r) { return r.date && CALENDAR_STATUSES[r.status] && r.format !== 'none'; });
    }

    // Events for the ticked periods only.
    function calendarEvents(state) {
        var events = [];
        currentGroups(state).forEach(function (g) {
            if (!state.exportKeys[g.key]) return;
            calendarRows(g).forEach(function (r) {
                var format = FORMAT_LABELS[r.format] && r.format !== 'unknown' ? ' (' + FORMAT_LABELS[r.format].toLowerCase() + ')' : '';
                events.push({
                    uid: r.code + '-' + r.periodKey + '@dtu-after-dark',
                    date: r.date,
                    endDate: r.endDate,
                    summary: 'Exam ' + courseTitle(state, r) + format,
                    description: sourceLine(r) + '. ' + g.label + '.\n'
                        + 'Not your official schedule. Check the date on DTU\'s exam dates page: ' + EXAM_TABLE_URL
                });
            });
        });
        return events;
    }

    function downloadCalendar(state) {
        var events = calendarEvents(state);
        if (!events.length) return;
        var ics = globalThis.DTUAfterDarkIcs;
        ics.downloadCalendar(getCore().buildExamCalendar(events, ics.stampNow()), 'dtu-exams.ics');
    }

    // "Add to calendar" opens one tick box per period with dated exams. The
    // period on screen is ticked each time it opens; the rest are the student's choice.
    function renderExportPicker(state) {
        var groups = currentGroups(state);
        var dated = groups.filter(function (g) { return calendarRows(g).length; });
        state.exportBtn.disabled = !dated.length;
        state.exportBtn.textContent = dated.length ? 'Add to calendar' : 'No dated exam to add';
        if (!dated.length) state.exportOpen = false;
        state.exportBtn.setAttribute('aria-expanded', state.exportOpen ? 'true' : 'false');
        state.exportBox.hidden = !state.exportOpen;
        var box = state.exportList;
        while (box.firstChild) box.removeChild(box.firstChild);
        if (!state.exportOpen) return;
        dated.forEach(function (g) {
            var n = calendarRows(g).length;
            var label = el('label', 'dtu-es-pick');
            var input = el('input');
            input.type = 'checkbox';
            input.checked = !!state.exportKeys[g.key];
            input.addEventListener('change', function () {
                state.exportKeys[g.key] = input.checked;
                updateExportGo(state);
            });
            label.appendChild(input);
            label.appendChild(el('span', null, g.label));
            label.appendChild(el('i', null, n + (n === 1 ? ' exam' : ' exams')));
            box.appendChild(label);
        });
        updateExportGo(state);
    }

    function updateExportGo(state) {
        var n = calendarEvents(state).length;
        state.exportGo.disabled = !n;
        state.exportGo.textContent = n ? 'Add ' + n + (n === 1 ? ' exam' : ' exams') + ' to calendar (.ics)' : 'Tick a period to add';
    }

    function toggleExportPicker(state) {
        state.exportOpen = !state.exportOpen;
        if (state.exportOpen) {
            state.exportKeys = {};
            (state.shownKeys || []).forEach(function (key) { state.exportKeys[key] = true; });
        }
        renderExportPicker(state);
    }

    // Every basket course in every period it can be placed in.
    function basketEntries(state) {
        var out = [];
        (state.basket || []).forEach(function (item) {
            (item.exams || []).forEach(function (exam) { out.push({ item: item, exam: exam }); });
        });
        return out;
    }

    // One tab per period DTU's table covers; the periods after it, and basket
    // courses that land outside the tabs, share a last "Later" tab.
    function scheduleTabs(state, groups) {
        var tabs = groups.filter(function (g) { return !g.later; }).map(function (g) { return { key: g.key, label: g.label, groups: [g] }; });
        var own = {};
        tabs.forEach(function (t) { own[t.key] = true; });
        var entries = basketEntries(state);
        tabs.forEach(function (t) { t.basket = entries.filter(function (x) { return x.exam.key === t.key; }); });
        var later = groups.filter(function (g) { return g.later; });
        var stray = entries.filter(function (x) { return !own[x.exam.key]; });
        var unplaced = (state.basket || []).filter(function (item) { return item.exams && !item.exams.length; });
        if (later.length || stray.length || unplaced.length) tabs.push({ key: 'later', label: 'Later', groups: later, basket: stray, unplaced: unplaced, later: true });
        return tabs;
    }

    function datedExams(rows) {
        return rows.filter(function (r) { return r.date && CALENDAR_STATUSES[r.status] && r.format !== 'none'; })
            .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    }

    function longDay(iso, withMonth) {
        var p = iso.split('-');
        return String(+p[2]) + (withMonth ? ' ' + MONTH_LONG[+p[1] - 1] : '');
    }

    // "3 exams, 7 to 19 December" and the one thing worth knowing about them.
    function renderSummary(state, tab, rows, body) {
        var dated = datedExams(rows);
        var n = dated.length;
        var text = n ? n + (n === 1 ? ' exam' : ' exams') : (rows.length ? 'No dated exams' : 'No planned courses');
        if (n && !tab.later) {
            var first = dated[0].date;
            var last = dated.reduce(function (max, r) { var e = r.endDate || r.date; return e > max ? e : max; }, first);
            text += ', ' + (first === last ? longDay(first, true)
                : longDay(first, first.slice(0, 7) !== last.slice(0, 7)) + ' to ' + longDay(last, true));
        }
        body.appendChild(el('div', 'dtu-es-sum', text));

        var byId = {};
        dated.forEach(function (r) { byId[r.id] = r; });
        var gaps = getCore().computeExamGaps(dated.map(function (r) { return { code: r.id, date: r.date, endDate: r.endDate }; }));
        var close = gaps.filter(function (g) { return g.mark; });
        var parts = [];
        function nameOf(id) { var r = byId[id]; return state.names[r.code] || r.code; }
        if (close.length === 1) {
            parts.push(nameOf(close[0].fromCode) + ' and ' + nameOf(close[0].toCode)
                + (close[0].mark === 'same-day' ? ' are on the same day.' : ' are on consecutive days.'));
        } else if (close.length > 1) {
            parts.push(close.length + ' pairs of exams are on the same day or on consecutive days.');
        } else if (gaps.length && !tab.later) {
            var least = gaps.reduce(function (min, g) { return Math.min(min, g.days); }, Infinity);
            parts.push(gaps.length === 1 ? least + ' days between them.' : 'The two closest are ' + least + ' days apart.');
        }
        var undated = rows.length - n;
        if (undated && n) parts.push(undated + (undated === 1 ? ' course has' : ' courses have') + ' no exam date here.');
        if (parts.length) body.appendChild(el('div', 'dtu-es-sumnote' + (close.length ? ' near' : ''), parts.join(' ')));
    }

    function addDays(iso, n) {
        var p = iso.split('-');
        return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)).toISOString().slice(0, 10);
    }

    // The days around the period's exams, at least 17 of them, so the spacing
    // shows. Weekends look like any other day: DTU holds exams on them too. Left out when the dates span more than 45 days.
    function renderStrip(tab, rows, body) {
        var plan = {};
        var bask = {};
        datedExams(rows).forEach(function (r) {
            for (var d = r.date, i = 0; d <= (r.endDate || r.date) && i < 45; d = addDays(d, 1), i++) plan[d] = true;
        });
        tab.basket.forEach(function (x) { if (x.exam.row.date) bask[x.exam.row.date] = true; });
        var days = Object.keys(plan).concat(Object.keys(bask)).sort();
        if (!days.length || tab.later) return;
        var start = addDays(days[0], -2);
        var end = addDays(days[days.length - 1], 2);
        var length = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
        if (length > 45) return;
        for (var pad = 0; length < 17; pad++, length++) { if (pad % 2) start = addDays(start, -1); else end = addDays(end, 1); }
        var strip = el('div', 'dtu-es-strip');
        strip.setAttribute('aria-hidden', 'true');
        for (var day = start; day <= end; day = addDays(day, 1)) {
            var marked = plan[day] || bask[day];
            var cell = el('div', 'dtu-es-sday' + (plan[day] ? ' plan' : '') + (bask[day] ? ' bask' : ''));
            cell.appendChild(el('i'));
            if (marked || day === start || day === end) cell.appendChild(document.createTextNode(String(+day.slice(8))));
            strip.appendChild(cell);
        }
        body.appendChild(strip);
    }

    function pickFirstTab(tabs) {
        var today = todayIso();
        var upcoming = tabs.filter(function (t) {
            return t.groups.some(function (g) { return datedExams(g.rows).some(function (r) { return (r.endDate || r.date) >= today; }); });
        })[0];
        return (upcoming || tabs[0]).key;
    }

    // Saves the planned exams that have a grading deadline, so CampusNet Grades can say
    // which grades are not out after DTU's deadline. Written only when the list changes.
    function saveGradingWatch(state, groups) {
        var core = getCore();
        var current = [];
        groups.forEach(function (g) {
            g.rows.forEach(function (row) {
                if (isCustom(row.code)) return;
                var info = core.gradingForRow(row, state.sections);
                if (!info) return;
                current.push({ code: row.code, name: state.names[row.code] || '', exam: info.day || row.date, grading: info.grading });
            });
        });
        var get = dep('storageLocalGet');
        var set = dep('storageLocalSet');
        if (!get || !set) return;
        var defaults = {};
        defaults[GRADING_WATCH_KEY] = [];
        get(defaults, function (result) {
            var merged = core.mergeGradingWatch(result && result[GRADING_WATCH_KEY], current, todayIso());
            var text = JSON.stringify(merged);
            if (text === _lastGradingWatch || text === JSON.stringify((result && result[GRADING_WATCH_KEY]) || [])) { _lastGradingWatch = text; return; }
            _lastGradingWatch = text;
            var items = {};
            items[GRADING_WATCH_KEY] = merged;
            set(items);
        });
    }

    function renderRows(state) {
        var groups = currentGroups(state);
        if (state.sections) saveGradingWatch(state, groups);
        var tabs = scheduleTabs(state, groups);
        var body = state.body;
        while (body.firstChild) body.removeChild(body.firstChild);
        while (state.tabs.firstChild) state.tabs.removeChild(state.tabs.firstChild);
        state.loadCells = {};
        state.shownKeys = [];
        if (!tabs.length) {
            body.appendChild(el('div', 'dtu-es-empty', 'No courses are planned in these periods yet.'));
            renderExportPicker(state);
            return;
        }
        if (!tabs.some(function (t) { return t.key === state.activeKey; })) state.activeKey = pickFirstTab(tabs);
        var tab = tabs.filter(function (t) { return t.key === state.activeKey; })[0];
        tabs.forEach(function (t) {
            var b = makeButton(t.label, function () {
                state.activeKey = t.key;
                state.open = null;
                state.editing = null;
                renderRows(state);
                var now = state.tabs.querySelector('[aria-selected="true"]');
                if (now) try { now.focus({ preventScroll: true }); } catch (e0) { }
            });
            b.className = 'dtu-es-ptab';
            b.setAttribute('role', 'tab');
            b.setAttribute('aria-selected', t === tab ? 'true' : 'false');
            state.tabs.appendChild(b);
        });

        var rows = [];
        tab.groups.forEach(function (g) {
            state.shownKeys.push(g.key);
            rows = rows.concat(g.rows);
        });
        renderSummary(state, tab, rows, body);
        renderStrip(tab, rows, body);
        if (rows.some(function (r) { return !isCustom(r.code); }) || tab.basket.length) {
            var cols = el('div', 'dtu-es-cols');
            var label = el('span', null, 'Workload rated by students, 1 to 5');
            label.title = 'From each course\'s latest evaluation: students compared the time they spent with what the ECTS points call for. 1 is much less, 3 the same, 5 much more.';
            cols.appendChild(label);
            body.appendChild(cols);
        }
        tab.groups.forEach(function (g) {
            if (tab.later) body.appendChild(el('div', 'dtu-es-sec', g.label));
            g.rows.forEach(function (row) { body.appendChild(renderRow(state, row)); });
        });
        if (tab.basket.length || (tab.unplaced && tab.unplaced.length)) {
            body.appendChild(el('div', 'dtu-es-sec', 'From your course basket'));
            var planned = plannedExamRows(state);
            tab.basket.forEach(function (entry) { body.appendChild(renderBasketRow(state, entry, planned, !!tab.later)); });
            (tab.unplaced || []).forEach(function (item) {
                body.appendChild(el('div', 'dtu-es-empty', item.code + ' ' + item.name + ': the planner does not say which periods this course can be taken in.'));
            });
        }
        if ((state.basket || []).some(function (item) { return !item.exams; })) {
            body.appendChild(el('div', 'dtu-es-empty', 'Reading the course pages for your basket...'));
        }
        renderExportPicker(state);
        if (state.skeleton) {
            state.skeleton = false;
            skeleton().reveal(body, markExt);
        }
    }

    // Basket dates arrive one course at a time. An open editor is left alone;
    // saving or cancelling it draws the rows again.
    function refreshRows(state) {
        if (state.ready && !state.editing) renderRows(state);
    }

    function examPageLink(text) {
        var a = el('a', null, text);
        a.href = EXAM_TABLE_URL;
        a.target = '_blank';
        a.rel = 'noopener';
        return a;
    }

    function renderShell(state) {
        var pop = state.pop;
        var head = el('div', 'dtu-es-head');
        var title = el('div', 'dtu-es-title', 'Exam schedule');
        title.id = 'dtu-es-title';
        head.appendChild(title);
        var close = el('button', 'dtu-es-close', '×');
        close.type = 'button';
        close.setAttribute('aria-label', 'Close');
        close.addEventListener('click', closePanel);
        head.appendChild(close);
        pop.appendChild(head);

        state.tabs = el('div', 'dtu-es-tabs');
        state.tabs.setAttribute('role', 'tablist');
        state.tabs.setAttribute('aria-label', 'Exam periods');
        pop.appendChild(state.tabs);
        state.body = el('div', 'dtu-es-body');
        pop.appendChild(state.body);

        // The notice is always in sight at the foot; "Why" opens its full wording.
        var foot = el('div', 'dtu-es-foot');
        foot.setAttribute('role', 'note');
        state.noticeText = el('p', 'dtu-es-notice-text', 'Loading DTU\'s exam table...');
        state.noticeText.id = 'dtu-es-notice-text';
        state.noticeText.hidden = true;
        foot.appendChild(state.noticeText);
        // The calendar export: one tick box per period, opened by the button in the foot line.
        state.exportBox = el('div', 'dtu-es-export');
        state.exportBox.id = 'dtu-es-export';
        state.exportBox.hidden = true;
        state.exportBox.appendChild(el('p', 'dtu-es-read', 'Pick the periods to add. Each dated exam becomes an all-day event. Basket courses are left out.'));
        state.exportList = el('div', 'dtu-es-picks');
        state.exportBox.appendChild(state.exportList);
        state.exportGo = makeButton('Add to calendar (.ics)', function () { downloadCalendar(state); });
        state.exportGo.classList.add('dtu-es-primary');
        state.exportBox.appendChild(state.exportGo);
        foot.appendChild(state.exportBox);
        var line = el('div', 'dtu-es-footline');
        var notice = el('span', null, 'Always check your exam dates with DTU. ');
        var why = makeButton('Why', function () {
            state.noticeText.hidden = !state.noticeText.hidden;
            why.setAttribute('aria-expanded', state.noticeText.hidden ? 'false' : 'true');
        });
        why.className = 'dtu-es-why';
        why.setAttribute('aria-expanded', 'false');
        why.setAttribute('aria-controls', 'dtu-es-notice-text');
        notice.appendChild(why);
        notice.appendChild(document.createTextNode(', '));
        notice.appendChild(examPageLink('DTU\'s exam dates page'));
        line.appendChild(notice);
        state.exportBtn = makeButton('Add to calendar', function () { toggleExportPicker(state); });
        state.exportBtn.classList.add('dtu-es-primary');
        state.exportBtn.setAttribute('aria-controls', 'dtu-es-export');
        state.exportBtn.setAttribute('aria-expanded', 'false');
        state.exportBtn.disabled = true;
        line.appendChild(state.exportBtn);
        foot.appendChild(line);
        pop.appendChild(foot);
    }

    function renderDisclaimer(state, fetchedAt) {
        var note = state.noticeText;
        while (note.firstChild) note.removeChild(note.firstChild);
        note.appendChild(document.createTextNode("These exam dates are read from DTU's exam table on " + formatReadDate(fetchedAt, { month: 'long', invalid: 'an unknown date' })
            + ", DTU's own exam dates page, and from each course page. They are not your official schedule: DTU can move an exam "
            + "or change its format, and DTU After Dark can read a page wrong. Do not rely on this list alone. "
            + "Check every date on DTU's exam page and with your teacher. DTU After Dark is not made by DTU. "));
        note.appendChild(examPageLink('Open DTU\'s exam dates page'));
    }

    function plannedExamRows(state) {
        var all = [];
        currentGroups(state).forEach(function (g) { all = all.concat(g.rows.filter(function (r) { return r.date; })); });
        return all;
    }

    function nearText(near) {
        return near.map(function (n) { return (n.days === 0 ? 'Same day as ' : '1 day from ') + n.code; }).join(', ');
    }

    // Each basket course, in the next period of each season it can be placed
    // in, read from its course page like a planned course.
    function loadBasket(state, table) {
        var core = getCore();
        state.basket = basketCourses();
        if (!state.basket || !state.basket.length) return Promise.resolve();
        var shown = state.groups.map(function (g) { return g.period; });
        var labels = {};
        state.groups.forEach(function (g) { labels[g.key] = g.label; });
        return Promise.all(state.basket.map(function (item) {
            var periods = core.basketPeriods(item.seasons, shown, todayIso());
            return Promise.all(periods.map(function (period) {
                return loadCourseFields(item.code, core.academicYearOf(period)).then(function (fields) {
                    var threeWeek = period.season === 'J' || period.season === 'S';
                    var r = threeWeek
                        ? core.resolveThreeWeekExam(item.code, fields, table.sections, period, period.season === 'J' ? 1 : null)
                        : core.resolveCourseExam(item.code, fields, core.findExamSection(table.sections, period), period);
                    var row = { code: item.code, status: r.status, format: r.format, date: r.date, endDate: null, range: r.range, pageDays: !!r.pageDays, evidence: r.evidence, reason: r.reason };
                    return { key: period.key, label: labels[period.key] || core.periodLabel(period), row: row };
                });
            })).then(function (exams) {
                item.exams = exams;
                if (_state === state) refreshRows(state);
            });
        }));
    }

    function loadPanel(state) {
        var core = getCore();
        Promise.all([loadExamTable(true), readStore()]).then(function (loaded) {
            if (_state !== state) return;
            var table = loaded[0];
            state.store = loaded[1];
            state.sections = table.sections;
            renderDisclaimer(state, table.fetchedAt);
            var tables = plannerPeriodTables();
            var periods = tables.map(function (t) { return t.period; });
            var covered = core.selectSchedulePeriods(periods, table.sections, todayIso());
            var later = core.laterPlannerPeriods(periods, covered, todayIso());
            state.groups = covered.concat(later).map(function (key) {
                var info = tables.filter(function (t) { return t.period.key === key; })[0];
                var courses = plannedCourses(info.table);
                courses.forEach(function (c) {
                    state.names[c.code] = c.name;
                    if (c.custom) state.ects[c.code] = c.ects;
                });
                return { key: key, label: info.label, period: info.period, courses: courses, later: later.indexOf(key) >= 0 };
            });
            // Course pages are read only for the periods DTU's table covers.
            var count = state.groups.reduce(function (n, g) {
                return n + (g.later ? 0 : g.courses.filter(function (c) { return !c.custom; }).length);
            }, 0);
            loadBasket(state, table);
            state.groups.forEach(function (g) {
                state.resolved[g.key] = {};
                g.courses.forEach(function (c) {
                    if (c.custom) state.resolved[g.key][c.code] = { status: 'custom', format: null, date: null, range: false, evidence: null, reason: null };
                    else if (g.later) state.resolved[g.key][c.code] = { status: 'unconfirmed', format: null, date: null, range: false, evidence: null, reason: 'DTU has not published exam dates for this period yet' };
                });
            });
            if (!count) { state.ready = true; renderRows(state); return; }
            showSkeleton(state, 'Reading ' + count + ' course page' + (count === 1 ? '' : 's'), count);
            return Promise.all(state.groups.filter(function (g) { return !g.later; }).map(function (g) {
                var section = core.findExamSection(table.sections, g.period);
                var threeWeek = g.period.season === 'J' || g.period.season === 'S';
                return Promise.all(g.courses.filter(function (c) { return !c.custom; }).map(function (c) {
                    return loadCourseFields(c.code, core.academicYearOf(g.period)).then(function (fields) {
                        state.resolved[g.key][c.code] = threeWeek
                            ? core.resolveThreeWeekExam(c.code, fields, table.sections, g.period, g.period.season === 'J' ? 1 : c.month)
                            : core.resolveCourseExam(c.code, fields, section, g.period);
                    });
                }));
            })).then(function () {
                if (_state !== state) return;
                state.ready = true;
                renderRows(state);
            });
        }).catch(function (err) {
            try { console.warn('[DTU After Dark] exam schedule:', err); } catch (eLog) { }
            if (_state !== state) return;
            state.noticeText.textContent = 'DTU\'s exam table could not be read, so no dates are suggested. Find your exam dates on DTU\'s own exam dates page.';
            state.noticeText.hidden = false;
            state.ready = false;
            showMessage(state, 'Check your exam dates on DTU\'s exam page.', true);
        });
    }

    function openPanel(button) {
        closePanel();
        ensureStyles(STYLE_ID, scheduleStyles.CSS);
        var backdrop = el('div', 'dtu-es-backdrop');
        backdrop.addEventListener('mousedown', function (e) { e.preventDefault(); closePanel(); });
        document.body.appendChild(backdrop);
        var pop = el('div', 'dtu-es-pop');
        pop.setAttribute('role', 'dialog');
        pop.setAttribute('aria-modal', 'true');
        pop.setAttribute('aria-labelledby', 'dtu-es-title');
        pop.tabIndex = -1;
        scheduleStyles.applyTheme(pop, dep('isDarkModeEnabled'));
        document.body.appendChild(pop);
        button.setAttribute('aria-expanded', 'true');
        var state = { button: button, pop: pop, backdrop: backdrop, groups: [], names: {}, resolved: {}, store: {}, editing: null, open: null, activeKey: null, ready: false, ects: {}, exportKeys: {}, exportOpen: false, shownKeys: [], basket: null, workload: {}, loadCells: {} };
        renderShell(state);
        state.onKey = function (e) { if (e.key === 'Escape') { e.stopPropagation(); closePanel(); } };
        document.addEventListener('keydown', state.onKey, true);
        _state = state;
        try { pop.focus({ preventScroll: true }); } catch (e0) { }
        showSkeleton(state, 'Loading DTU\'s exam table', 3);
        loadPanel(state);
    }

    // ===== Buttons =====

    function calendarIcon() {
        var ns = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('aria-hidden', 'true');
        ['M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z', 'M16 3v4', 'M8 3v4', 'M4 11h16'].forEach(function (d) {
            var path = document.createElementNS(ns, 'path');
            path.setAttribute('d', d);
            svg.appendChild(path);
        });
        return svg;
    }

    function makeScheduleButton() {
        var button = el('button', 'dtu-es-btn');
        button.type = 'button';
        button.appendChild(calendarIcon());
        button.appendChild(el('span', null, 'Exam schedule'));
        button.setAttribute('data-dtu-exam-schedule', 'plan');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-haspopup', 'dialog');
        scheduleStyles.applyTheme(button, dep('isDarkModeEnabled'));
        // The planner's own button rules outrank a class rule; inline wins.
        button.style.setProperty('color', 'var(--dtu-es-on-accent)', 'important');
        button.style.setProperty('background', 'var(--dtu-es-accent)', 'important');
        // A period header row also starts a drag on the planner; keep clicks ours.
        button.addEventListener('mousedown', function (e) { e.stopPropagation(); });
        button.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (_state && _state.button === button) { closePanel(); return; }
            openPanel(button);
        });
        return button;
    }

    // First in the planner's tab row (Course search, Studyplanner);
    // inline in the first period header when that row is not found.
    function scheduleButtonPlace(tables) {
        var tabs = document.querySelector('.mofoclass ul.nav-tabs');
        if (tabs) return { host: tabs, before: tabs.firstElementChild, tabs: true };
        globalThis.DTUAfterDarkWarnMissingAnchor && globalThis.DTUAfterDarkWarnMissingAnchor('Exam schedule', '.mofoclass ul.nav-tabs', function () { return !document.querySelector('.mofoclass ul.nav-tabs'); });
        return tables.length ? { host: tables[0].th, before: null, tabs: false } : null;
    }

    function removeStudyplanExamSchedule() {
        closePanel();
        Array.prototype.forEach.call(document.querySelectorAll('[data-dtu-exam-schedule]'), function (n) { n.remove(); });
        Array.prototype.forEach.call(document.querySelectorAll('[data-dtu-exam-schedule-tab]'), function (n) { n.remove(); });
    }

    var _inserting = false;
    var _oldKeysCleared = false;

    // The exam cluster this replaced kept its choices in site localStorage.
    function clearOldExamClusterKeys() {
        if (_oldKeysCleared) return;
        _oldKeysCleared = true;
        try {
            localStorage.removeItem('dtuAfterDarkStudyplanExamChoicesV1');
            localStorage.removeItem('dtuAfterDarkStudyplanExamTimelineOverridesV1');
        } catch (e0) { }
    }

    function insertStudyplanExamScheduleButtons() {
        clearOldExamClusterKeys();
        var deps = getDeps();
        var isTop = dep('isTopWindow');
        var isEnabled = dep('isFeatureFlagEnabled');
        if (!deps || !getCore() || !isTop || !isTop() || !document.body) return;
        if (!isEnabled || !isEnabled(deps.featureStudyplanExamScheduleKey)) {
            removeStudyplanExamSchedule();
            return;
        }
        var tables = plannerPeriodTables();
        if (!tables.length || _inserting) return;
        if (document.querySelector('[data-dtu-exam-schedule]')) return;
        _inserting = true;
        function addButton() {
            var place = scheduleButtonPlace(plannerPeriodTables());
            if (!place || document.querySelector('[data-dtu-exam-schedule]')) return;
            ensureStyles(STYLE_ID, scheduleStyles.CSS);
            var button = makeScheduleButton();
            var node = button;
            if (place.tabs) {
                node = el('li', 'dtu-es-tab');
                node.setAttribute('role', 'presentation');
                node.setAttribute('data-dtu-exam-schedule-tab', '');
                button.classList.add('dtu-es-btn-tab');
                button.style.removeProperty('color');
                button.style.removeProperty('background');
                node.appendChild(button);
            }
            place.host.insertBefore(node, place.before);
        }
        loadExamTable(false).then(function (table) {
            var keys = getCore().selectSchedulePeriods(tables.map(function (t) { return t.period; }), table.sections, todayIso());
            if (keys.length) addButton();
        }, function () {
            // Unreadable table: which periods DTU has published is unknown, so
            // the button stays and the panel says why it has no dates, instead
            // of the feature quietly disappearing.
            addButton();
        }).then(null, function (err) {
            // A failed insert must not block the next try for the rest of the page.
            try { console.warn('[DTU After Dark] exam schedule button:', err); } catch (eLog) { }
        }).then(function () { _inserting = false; });
    }

    var EDITOR_HELPERS = {
        courseTitle: courseTitle,
        isCustom: isCustom,
        FORMAT_LABELS: FORMAT_LABELS,
        EDIT_FORMATS: EDIT_FORMATS,
        MONTH_LONG: MONTH_LONG,
        periodEntries: periodEntries,
        saveEntry: saveEntry,
        basisOf: basisOf,
        renderRows: renderRows
    };

    try {
        globalThis.DTUAfterDarkExamSchedule = {
            insertStudyplanExamScheduleButtons: insertStudyplanExamScheduleButtons,
            removeStudyplanExamSchedule: removeStudyplanExamSchedule,
            loadExamTable: loadExamTable
        };
    } catch (eExamSchedule) { }
})();
