// Exam date on kurser.dtu.dk course pages: an "Exam date" row under DTU's
// "Date of examination" row, one line per period the page's catalogue year
// places the course in. Dates come from DTU's exam table through the same
// rules as the Study Planner exam schedule (exam schedule core).
(function () {
    'use strict';
    var markExt = globalThis.DTUAfterDarkDom.markExt;

    var EXAM_TABLE_URL = 'https://student.dtu.dk/en/exam/exam-dates';
    var EXAM_LABEL_RE = /^(date of examination|eksamensplacering)$/i;
    var ROW_ATTR = 'data-dtu-kurser-exam-date';

    function getDeps() {
        try { return globalThis.DTUAfterDarkExamScheduleDeps || null; } catch (e0) { return null; }
    }

    function dep(name) {
        var deps = getDeps();
        return deps && typeof deps[name] === 'function' ? deps[name] : null;
    }

    function el(tag, text) {
        var node = markExt(document.createElement(tag));
        if (text != null) node.textContent = text;
        return node;
    }

    function examTableHtml() {
        return new Promise(function (resolve) {
            var send = dep('sendRuntimeMessage');
            if (!send) { resolve(null); return; }
            try { send({ type: 'dtu-exam-table' }, function (res) { resolve(res && res.ok ? res.html : null); }); } catch (e0) { resolve(null); }
        });
    }

    function todayIso() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function formatDate(iso) {
        var p = iso.split('-');
        var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
        try { return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); } catch (e0) { return iso; }
    }

    function findExamRow() {
        var labels = document.querySelectorAll('td > label');
        for (var i = 0; i < labels.length; i++) {
            if (EXAM_LABEL_RE.test(String(labels[i].textContent || '').replace(/\s+/g, ' ').trim())) return labels[i].parentElement.parentElement;
        }
        return null;
    }

    function removeKurserExamDate() {
        Array.prototype.forEach.call(document.querySelectorAll('[' + ROW_ATTR + ']'), function (n) { n.remove(); });
    }

    function line(text, muted) {
        var div = el('div', text);
        if (muted) div.style.color = 'var(--dtu-cw-muted)';
        return div;
    }

    function fillValue(cell, exams, failed) {
        if (failed) {
            cell.appendChild(line('DTU\'s exam table could not be read'));
        } else if (!exams.length) {
            cell.appendChild(line('No exam period of this catalogue year is in DTU\'s exam table'));
        } else {
            var core = globalThis.DTUAfterDarkExamScheduleCore;
            // The date leads in bold; the period and where the date comes from follow, muted.
            exams.forEach(function (exam) {
                var r = exam.result;
                var div = line(r.date ? null : exam.label + ': ' + core.outcomeText(r));
                if (r.date) {
                    var date = div.appendChild(el('span', formatDate(r.date)));
                    date.style.fontWeight = '700';
                    date.style.marginRight = '0.3em';
                    div.appendChild(document.createTextNode(' '));
                    div.appendChild(el('span', exam.label + ', ' + core.outcomeText(r))).style.color = 'var(--dtu-cw-muted)';
                }
                cell.appendChild(div);
            });
        }
        var foot = line('', true);
        foot.appendChild(document.createTextNode('Not the official schedule. Check '));
        var link = el('a', 'DTU\'s exam dates');
        link.href = EXAM_TABLE_URL;
        link.target = '_blank';
        link.rel = 'noopener';
        foot.appendChild(link);
        cell.appendChild(foot);
    }

    function insertKurserExamDate() {
        var isTop = dep('isTopWindow');
        var isCoursePage = dep('isKurserCoursePage');
        var isEnabled = dep('isFeatureFlagEnabled');
        var getCode = dep('getKurserCourseCode');
        var deps = getDeps();
        var core = globalThis.DTUAfterDarkExamScheduleCore;
        if (!deps || !core || !isTop || !isTop() || !isCoursePage || !isCoursePage() || !getCode) return;
        if (!isEnabled || !isEnabled(deps.featureStudyplanExamScheduleKey)) {
            removeKurserExamDate();
            return;
        }
        var code = getCode();
        if (!code || document.querySelector('[' + ROW_ATTR + ']')) return;
        var anchor = findExamRow();
        if (!anchor || !anchor.parentNode) {
            globalThis.DTUAfterDarkWarnMissingAnchor && globalThis.DTUAfterDarkWarnMissingAnchor('Exam date', 'Date of examination row', function () {
                return !document.querySelector('[' + ROW_ATTR + ']') && !findExamRow();
            });
            return;
        }
        var row = el('tr');
        row.setAttribute(ROW_ATTR, '');
        var layout = globalThis.DTUAfterDarkCourseWidgetsLayout;
        if (layout && typeof layout.applyTheme === 'function') layout.applyTheme(row);
        var labelCell = row.appendChild(el('td'));
        labelCell.appendChild(el('label', 'Exam date'));
        var valueCell = row.appendChild(el('td'));
        var waiting = valueCell.appendChild(line('Reading DTU\'s exam table', true));
        anchor.parentNode.insertBefore(row, anchor.nextSibling);
        // The page itself holds the exam fields; only DTU's table is fetched (12 h cache).
        var fields = core.parseCourseExamFields(document.body.innerHTML);
        examTableHtml().then(function (html) {
            if (!row.isConnected) return;
            var sections = null;
            try { sections = html ? core.parseExamTable(html).sections : null; } catch (e1) { }
            waiting.remove();
            fillValue(valueCell, sections ? core.coursePageExams(code, fields, sections, todayIso()) : [], !sections);
        });
    }

    try {
        globalThis.DTUAfterDarkKurserExamDate = {
            insertKurserExamDate: insertKurserExamDate,
            removeKurserExamDate: removeKurserExamDate
        };
    } catch (eExamDate) { }
})();
