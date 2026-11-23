// Study Planner exam schedule: pure parsing and resolution, no DOM.
// Reads DTU's exam table (student.dtu.dk/en/exam/exam-dates), a kurser.dtu.dk
// course page and a planner period header, all as HTML or text strings, so the
// same code runs in the planner content script and in node tests.
(function () {
    'use strict';

    var ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", aelig: 'æ', oslash: 'ø', aring: 'å', AElig: 'Æ', Oslash: 'Ø', Aring: 'Å' };

    function decodeEntities(text) {
        return String(text || '').replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, function (all, name) {
            if (name[0] === '#') {
                var n = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
                return isFinite(n) ? String.fromCharCode(n) : all;
            }
            return Object.prototype.hasOwnProperty.call(ENTITIES, name) ? ENTITIES[name] : all;
        });
    }

    // Text of an HTML fragment; a <br> becomes "; " so a cell's lines stay apart.
    function htmlText(html) {
        var withBreaks = String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ');
        return decodeEntities(withBreaks).split('\n')
            .map(function (line) { return line.replace(/\s+/g, ' ').trim(); })
            .filter(Boolean)
            .join('; ');
    }

    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    // "10/12 2026" to "2026-12-10".
    function parseDayMonthYear(text) {
        var m = /(\d{1,2})\/(\d{1,2})\s*(\d{4})/.exec(String(text || ''));
        if (!m) return null;
        var day = +m[1], month = +m[2];
        // 29/2 in a non-leap year or 31/4 is a typo, not a date.
        if (new Date(Date.UTC(+m[3], month - 1, day)).getUTCMonth() !== month - 1 || day < 1) return null;
        return m[3] + '-' + pad2(month) + '-' + pad2(day);
    }

    function classifySection(title) {
        var winter = /winter exam\s+december\s+(\d{4})/i.exec(title);
        if (winter) return { kind: 'winter', year: +winter[1] };
        var summer = /summer exam\b[\s\S]*?(\d{4})/i.exec(title);
        if (summer) return { kind: 'summer', year: +summer[1] };
        var august = /\baugust\s+(\d{4})/i.exec(title);
        if (august) return { kind: 'august', year: +august[1] };
        var any = /(\d{4})/.exec(title);
        return { kind: 'other', year: any ? +any[1] : null };
    }

    function tableRows(tableHtml) {
        var rows = [];
        var rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        var m;
        while ((m = rowRe.exec(tableHtml))) {
            var cells = [];
            var cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
            var c;
            while ((c = cellRe.exec(m[1]))) cells.push(htmlText(c[1]));
            rows.push(cells);
        }
        return rows;
    }

    function isExamTableHeader(cells) {
        return cells.length >= 3
            && /^date$/i.test(cells[0])
            && /date of exam/i.test(cells[1])
            && /grading deadline/i.test(cells[2]);
    }

    // Every section of DTU's exam table: its heading and the table under it.
    // Throws when no section has the expected columns, so a changed page shows
    // as an error instead of as "no exams".
    function parseExamTable(html) {
        var source = String(html || '');
        var headingRe = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
        var headings = [];
        var m;
        while ((m = headingRe.exec(source))) headings.push({ title: htmlText(m[1]), end: headingRe.lastIndex, start: m.index });
        var sections = [];
        headings.forEach(function (h, i) {
            var limit = i + 1 < headings.length ? headings[i + 1].start : source.length;
            var t0 = source.indexOf('<table', h.end);
            if (t0 < 0 || t0 > limit) return;
            var t1 = source.indexOf('</table>', t0);
            if (t1 < 0) return;
            var rows = tableRows(source.slice(t0, t1));
            if (!rows.length || !isExamTableHeader(rows[0])) return;
            var kind = classifySection(h.title);
            sections.push({
                title: h.title,
                kind: kind.kind,
                year: kind.year,
                rows: rows.slice(1).map(function (cells) {
                    var date = parseDayMonthYear(cells[0]);
                    return date ? { date: date, text: cells[1] || '', grading: parseDayMonthYear(cells[2]) } : null;
                }).filter(Boolean)
            });
        });
        if (!sections.length) throw new Error('exam_table_unreadable');
        return { sections: sections };
    }

    var FIELD_LABELS = {
        examText: /^(date of examination|eksamensplacering)$/i,
        assessmentText: /^(type of assessment|evalueringsform)$/i,
        durationText: /^(exam duration|eksamensvarighed)$/i,
        scheduleText: /^(schedule|skemaplacering)$/i
    };

    // The exam fields of a kurser.dtu.dk course page, English or Danish. Null when
    // the page has no exam field (for example the login-reload stub).
    function parseCourseExamFields(html) {
        var source = String(html || '');
        var out = { examText: null, assessmentText: '', durationText: '', scheduleText: '', name: '', volume: null };
        var rowRe = /<label>([\s\S]*?)<\/label>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
        var m;
        while ((m = rowRe.exec(source))) {
            var label = htmlText(m[1]);
            Object.keys(FIELD_LABELS).forEach(function (key) {
                if (FIELD_LABELS[key].test(label)) out[key] = htmlText(m[2]);
            });
        }
        if (out.examText === null) return null;
        var title = /<h2[^>]*>\s*([0-9]{2}[0-9A-Z]{3})\s+([\s\S]*?)<\/h2>/i.exec(source);
        if (title) out.name = htmlText(title[2]);
        out.volume = pageVolume(source);
        return out;
    }

    // The catalogue year a course page describes, as "2026-2027": DTU writes it
    // as data-volume="2026/2027" on the basket icon and in a heading.
    function pageVolume(source) {
        var m = /data-volume="(\d{4})\/(\d{4})"/i.exec(source) || /<h2[^>]*>\s*(\d{4})\/(\d{4})\s*<\/h2>/i.exec(source);
        return m && +m[2] === +m[1] + 1 ? m[1] + '-' + m[2] : null;
    }

    // The catalogue year a period belongs to: autumn 2026, January 2027, spring
    // 2027 and June/July/August 2027 are all "2026-2027".
    function academicYearOf(period) {
        var start = period.season === 'E' ? period.year : period.year - 1;
        return start + '-' + (start + 1);
    }

    function yearLabel(volume) {
        return volume.replace('-', '/');
    }

    // A planner period header to its key and season: "13 weeks spring 2027"
    // (Danish "13 uger forår 2027") is season F, autumn E, "January 2027" J and
    // "June/July/August 2027" S. Null for anything not recognised.
    function parsePlannerPeriod(headerText) {
        var text = String(headerText || '').replace(/\s+/g, ' ').trim();
        var m = /\b13\b.*?(autumn|efterår|spring|forår)(?:\s|$)\D*?(\d{4})/i.exec(text);
        if (m) {
            var autumn = /^(autumn|efterår)$/i.test(m[1]);
            var year = +m[2];
            return { key: year + '-' + (autumn ? 'autumn' : 'spring'), season: autumn ? 'E' : 'F', year: year };
        }
        var jan = /^(january|januar)\s+(\d{4})$/i.exec(text);
        if (jan) return { key: jan[2] + '-january', season: 'J', year: +jan[2] };
        // One way to split each separator ("June / July", "June July"): no backtracking blow-up.
        var summer = /^(?:(?:june|juni|july|juli|august)(?:\s*\/\s*|\s+))+(\d{4})$/i.exec(text);
        if (summer) return { key: summer[1] + '-summer', season: 'S', year: +summer[1] };
        return null;
    }

    // "January", "Juni" and so on from a course's Placement cell, as 1, 6, 7 or 8.
    function threeWeekMonth(text) {
        var t = String(text || '').trim().toLowerCase();
        return { january: 1, januar: 1, june: 6, juni: 6, july: 7, juli: 7, august: 8 }[t] || null;
    }

    function sectionOf(sections, kind, year) {
        var found = (sections || []).filter(function (s) { return s.kind === kind && s.year === year; });
        return found.length === 1 ? found[0] : null;
    }

    // Autumn YYYY is examined in "Winter exam December YYYY", spring YYYY in the
    // summer exam of YYYY. 3-week courses: January YYYY at the end of the
    // winter exam of YYYY-1, June in the summer exam, August in the August exam;
    // DTU's table has no July exam day. Null when there is no such section, or
    // more than one.
    function findExamSection(sections, period, month) {
        if (!period) return null;
        if (period.season === 'E') return sectionOf(sections, 'winter', period.year);
        if (period.season === 'F') return sectionOf(sections, 'summer', period.year);
        if (period.season === 'J') return sectionOf(sections, 'winter', period.year - 1);
        if (period.season === 'S' && month === 6) return sectionOf(sections, 'summer', period.year);
        if (period.season === 'S' && month === 8) return sectionOf(sections, 'august', period.year);
        return null;
    }

    // Months since year 0 to the period's start, for ordering.
    function periodOrder(period) {
        return period.year * 12 + { J: 0, F: 1, S: 5, E: 8 }[period.season];
    }

    // The exam sections a period's exams fall in: June/July/August spans two.
    function periodSections(sections, period) {
        if (period.season !== 'S') return [findExamSection(sections, period)].filter(Boolean);
        return [findExamSection(sections, period, 6), findExamSection(sections, period, 8)].filter(Boolean);
    }

    // Keys of the planner periods the exam schedule covers, in time order: the
    // first two 13-week periods whose exam section DTU has published and not
    // yet finished, and the January or June/July/August periods up to the one
    // right after the second. Later sections exist years ahead, but course pages
    // show this year's catalogue, so their slot codes may not hold that far out.
    function selectSchedulePeriods(periods, sections, todayIso) {
        var seen = {};
        var open = (periods || []).filter(function (p) {
            if (!p || seen[p.key]) return false;
            seen[p.key] = true;
            return periodSections(sections, p).some(function (section) {
                return section.rows.length && section.rows[section.rows.length - 1].date >= todayIso;
            });
        }).sort(function (a, b) { return periodOrder(a) - periodOrder(b); });
        var thirteen = open.filter(function (p) { return p.season === 'E' || p.season === 'F'; }).slice(0, 2);
        // A 13-week period's 3-week period follows four months after it starts.
        var last = thirteen.length ? periodOrder(thirteen[thirteen.length - 1]) + 4
            : open.length ? periodOrder(open[0]) + 4 : 0;
        return open.filter(function (p) {
            if (p.season === 'E' || p.season === 'F') return thirteen.indexOf(p) >= 0;
            return periodOrder(p) <= last;
        }).map(function (p) { return p.key; });
    }

    // Keys of the planner periods after the covered ones, in time order: DTU has
    // not published their exam dates, so only the student's own dates show. With
    // nothing covered, the periods that have not started yet.
    function laterPlannerPeriods(periods, coveredKeys, todayIso) {
        var seen = {};
        var covered = (periods || []).filter(function (p) { return p && (coveredKeys || []).indexOf(p.key) >= 0; });
        var after = covered.length ? Math.max.apply(null, covered.map(periodOrder)) : null;
        return (periods || []).filter(function (p) {
            if (!p || seen[p.key]) return false;
            seen[p.key] = true;
            return after === null ? periodStartIso(p) > todayIso : periodOrder(p) > after;
        }).sort(function (a, b) { return periodOrder(a) - periodOrder(b); }).map(function (p) { return p.key; });
    }

    // Slot codes in a text, normalised: "E1-A", "E1A" and "E1 A" are all "E1A".
    function slotCodes(text) {
        var out = [];
        var re = /\b([EF])([1-7])(?:\s*-?\s*([AB]))?\b/g;
        var m;
        while ((m = re.exec(String(text || '')))) {
            var code = m[1] + m[2] + (m[3] || '');
            if (out.indexOf(code) < 0) out.push(code);
        }
        return out;
    }

    function slotLabel(code) {
        return code.length === 3 ? code.slice(0, 2) + '-' + code[2] : code;
    }

    var RE_EXAM_RE = /re-?exam|reeksamen|omprøve/i;

    // True when the row names the course without a re-exam annotation.
    function rowNamesCourse(text, code) {
        var re = new RegExp('(^|[^0-9A-Z])' + code + '(?![0-9A-Z])\\s*(\\([^)]*\\))?', 'g');
        var m;
        while ((m = re.exec(text))) {
            if (!m[2] || !RE_EXAM_RE.test(m[2])) return true;
        }
        return false;
    }

    // True when a line of the row that names the course also says re-exam:
    // "02323, 02402 (reeksamen)" covers both courses, not only 02402.
    function lineSaysReExam(text, code) {
        var re = new RegExp('(^|[^0-9A-Z])' + code + '(?![0-9A-Z])');
        return text.split('; ').some(function (line) { return re.test(line) && RE_EXAM_RE.test(line); });
    }

    var TEACHER_RE = /special course|bachelor project|bachelorprojekt|specialkursus|thesis|speciale\b/i;
    var EXAM_WORD_RE = /written|\boral\b|\bexam|eksamen|skriftlig|mundtlig|\bprøve|\btest/i;
    var COURSEWORK_RE = /assignment|report|exercise|project|opgave|rapport|projekt|evaluation|bedømmelse/i;

    function examFormat(fields) {
        var text = fields.durationText + ' ' + fields.assessmentText;
        // The official type ("Written examination and exercises") and Exam duration decide
        // first; the prose after it ("an oral group presentation") only when they say nothing.
        var official = fields.durationText + ' ' + String(fields.assessmentText || '').split(';')[0];
        if (/\boral\b|mundtlig/i.test(official)) return 'oral';
        if (/written|skriftlig/i.test(official)) return 'written';
        if (/\boral\b|mundtlig/i.test(text)) return 'oral';
        if (/written|skriftlig/i.test(text)) return 'written';
        // "Evaluation of exercises/reports" with a day in the exam period (a
        // mandatory presentation, a hand-in deadline): assessed on coursework.
        if (COURSEWORK_RE.test(text)) return 'hand-in';
        return 'unknown';
    }

    function outcome(status, format, date, evidence, reason) {
        return { status: status, format: format, date: date, range: !!date && format === 'oral', evidence: evidence, reason: reason };
    }

    // A date read from a row of DTU's exam table, with that row's grading deadline. A
    // coursework course has no exam to grade on that day, so it gets no grading deadline.
    // pageDays: not an oral exam, but the course page says the exam may take more than one
    // day (62117 "Several days of exam can be occur", 62276 "cannot be completed on the
    // stipulated examination day"). 461 of 463 written exams in the 2026-2027 catalogue say nothing.
    function fromRow(format, row, evidence, fields) {
        var result = outcome('suggested', format, row.date, evidence, null);
        if (format !== 'hand-in' && row.grading) result.grading = row.grading;
        if (!result.range && fields && SEVERAL_DAYS_RE.test([fields.examText, fields.durationText, fields.assessmentText].join(' '))) result.pageDays = true;
        return result;
    }
    var SEVERAL_DAYS_RE = /several days|more than one day|cannot be completed on the stipulated|flere (eksamens)?dage/i;

    // The one sentence about an exam that may take more than one day, or ''.
    function severalDaysNote(result) {
        if (!result) return '';
        if (result.range) return 'Oral exams may run over several days.';
        if (result.pageDays) return 'The course page says the exam may be held on more than one day.';
        return '';
    }

    function countWord(n) { return n === 2 ? 'two' : String(n); }

    // One outcome per course for one period. A date is suggested only when DTU's
    // table names the course, or holds exactly one of the course page's slot codes
    // for the period's season in exactly one row. Everything else is unconfirmed.
    function resolveCourseExam(code, fields, section, period) {
        if (!fields) return outcome('unconfirmed', null, null, null, period ? 'course page for ' + yearLabel(academicYearOf(period)) + ' could not be read' : 'course page could not be read');
        var format = examFormat(fields);
        if (TEACHER_RE.test(fields.name)) return outcome('teacher', format, null, null, null);
        if (!section || !period) return outcome('unconfirmed', format, null, null, 'DTU has not published exam dates for this period yet');

        var named = section.rows.filter(function (row) { return rowNamesCourse(row.text, code); });
        if (named.length === 1) return fromRow(format, named[0], 'named: ' + code, fields);
        if (named.length > 1) {
            var ordinary = named.filter(function (row) { return !lineSaysReExam(row.text, code); });
            if (ordinary.length === 1) return fromRow(format, ordinary[0], 'named: ' + code, fields);
            return outcome('unconfirmed', format, null, null, 'listed on ' + countWord(named.length) + ' dates');
        }

        // Slot codes and the exam form change between catalogue years, so they
        // are only read from the page for the period's own year.
        var wanted = academicYearOf(period);
        if (!fields.volume) return outcome('unconfirmed', format, null, null, 'the course page does not say which year it describes');
        if (fields.volume !== wanted) return outcome('unconfirmed', format, null, null, 'the course page describes ' + yearLabel(fields.volume) + ', not ' + yearLabel(wanted));

        var assessment = fields.durationText + ' ' + fields.assessmentText;
        if (!EXAM_WORD_RE.test(assessment) && COURSEWORK_RE.test(assessment)) return outcome('no-exam', 'none', null, null, null);

        if (saysNoExam(fields)) return outcome('no-exam', 'none', null, null, null);

        var codes = slotCodes(fields.examText).filter(function (c) { return c[0] === period.season; });
        if (!codes.length && WITH_TEACHER_RE.test(fields.examText || '')) return outcome('teacher', format, null, null, 'the course page says to agree the exam date with the teacher');
        if (!codes.length) {
            // 10406: taught in spring, but the page gives only the autumn slot E5A. Say so.
            var other = slotCodes(fields.examText);
            if (other.length) return outcome('unconfirmed', format, null, null, OTHER_SEASON_REASON + other.map(slotLabel).join(', ') + ', ' + (other[0][0] === 'E' ? 'an autumn' : 'a spring') + ' slot');
            return outcome('unconfirmed', format, null, null, NO_SLOT_REASON);
        }
        if (codes.length > 1) return outcome('unconfirmed', format, null, null, 'several exam slots on the course page');
        var rows = section.rows.filter(function (row) { return slotCodes(row.text).indexOf(codes[0]) >= 0; });
        if (rows.length === 1) return fromRow(format, rows[0], slotLabel(codes[0]), fields);
        if (!rows.length) return outcome('unconfirmed', format, null, null, 'exam slot ' + slotLabel(codes[0]) + ' is not in DTU\'s table');
        return outcome('unconfirmed', format, null, null, 'exam slot ' + slotLabel(codes[0]) + ' is on ' + countWord(rows.length) + ' dates');
    }

    var MONTH_NAMES = { 1: 'January', 6: 'June', 7: 'July', 8: 'August' };
    var LAST_DAY_RE = /last day|sidste (undervisnings)?dag/i;
    var WITH_TEACHER_RE = /decide[sd]? with|agree[sd]? with|aftales med|aftal(es)? med/i;
    var NO_EXAM_TEXT_RE = /^\s*(no exam|ingen eksamen)\b/i;
    // "No exam" under Date of examination, unless the official type names one (28316: "No exam"
    // but "Oral examination and reports"): a page that contradicts itself stays unconfirmed.
    function saysNoExam(fields) {
        return NO_EXAM_TEXT_RE.test(fields.examText || '') && !EXAM_WORD_RE.test(String(fields.assessmentText || '').split(';')[0]);
    }
    var NO_SLOT_REASON = 'no exam slot for this season on the course page';
    var OTHER_SEASON_REASON = 'the course page gives only exam slot ';

    // The table row of the general exam day for 3-week courses of a month:
    // "3-weeks course from January", not its re-exam or replacement exam.
    function threeWeekExamRows(section, month) {
        var name = MONTH_NAMES[month];
        var re = new RegExp('3-?\\s*weeks?\\s+courses?\\s+from\\s+' + name, 'i');
        return section.rows.filter(function (row) {
            return row.text.split('; ').some(function (line) {
                return re.test(line) && !/re-?exam|reeksamen|replacement|sygeeksamen/i.test(line);
            });
        });
    }

    // One outcome for a course in a January or June/July/August period. month is
    // the course's own month from the planner (1, 6, 7 or 8). A date is
    // suggested when DTU's table names the course, or when the course page puts
    // the exam on the last day of the 3 weeks and DTU's table has exactly one
    // exam day for that month's 3-week courses.
    function resolveThreeWeekExam(code, fields, sections, period, month) {
        if (!fields) return outcome('unconfirmed', null, null, null, period ? 'course page for ' + yearLabel(academicYearOf(period)) + ' could not be read' : 'course page could not be read');
        var format = examFormat(fields);
        if (TEACHER_RE.test(fields.name)) return outcome('teacher', format, null, null, null);
        if (!period || !month) return outcome('unconfirmed', format, null, null, 'the planner does not say which 3-week period');
        var section = findExamSection(sections, period, month);
        if (section) {
            var named = section.rows.filter(function (row) { return rowNamesCourse(row.text, code) && !lineSaysReExam(row.text, code); });
            if (named.length === 1) return fromRow(format, named[0], 'named: ' + code, fields);
        }

        var wanted = academicYearOf(period);
        if (!fields.volume) return outcome('unconfirmed', format, null, null, 'the course page does not say which year it describes');
        if (fields.volume !== wanted) return outcome('unconfirmed', format, null, null, 'the course page describes ' + yearLabel(fields.volume) + ', not ' + yearLabel(wanted));

        var assessment = fields.durationText + ' ' + fields.assessmentText;
        if (!EXAM_WORD_RE.test(assessment) && COURSEWORK_RE.test(assessment)) return outcome('no-exam', 'none', null, null, null);
        if (saysNoExam(fields)) return outcome('no-exam', 'none', null, null, null);
        if (WITH_TEACHER_RE.test(fields.examText)) return outcome('teacher', format, null, null, 'the course page says to agree the exam date with the teacher');
        if (!LAST_DAY_RE.test(fields.examText)) return outcome('unconfirmed', format, null, null, 'the course page does not give the exam day');
        if (month === 7) return outcome('unconfirmed', format, null, null, 'DTU\'s table has no exam day for July courses');
        if (!section) return outcome('unconfirmed', format, null, null, 'DTU has not published exam dates for this period yet');
        var rows = threeWeekExamRows(section, month);
        if (rows.length === 1) return fromRow(format, rows[0], 'last day of the ' + MONTH_NAMES[month] + ' 3 weeks', fields);
        return outcome('unconfirmed', format, null, null, rows.length
            ? MONTH_NAMES[month] + ' 3-week courses are on ' + countWord(rows.length) + ' dates'
            : 'DTU\'s table has no exam day for ' + MONTH_NAMES[month] + ' 3-week courses');
    }

    var PLACEMENT_LINE_RE = /^\s*(autumn|spring|efterår|forår|january|januar|june|juni|july|juli|august)\b/i;
    var SEASON_WORDS = { E: /autumn|efterår/i, F: /spring|forår/i };
    var MONTH_WORDS = { 1: /january|januar/i, 6: /june|juni/i, 7: /july|juli/i, 8: /august/i };

    function sectionOver(section, todayIso) {
        return !!section && section.rows.length > 0 && section.rows[section.rows.length - 1].date < todayIso;
    }

    // The exams of a kurser.dtu.dk course page, one per period of the page's own
    // catalogue year: autumn and spring from slot codes or season words, 3-week
    // months from the Schedule field's first line, its placement. Later lines are
    // prose ("In the August version (course 01037) ...") and place nothing. A period whose exam section is over, or
    // that has started with no section in DTU's table, is left out. Empty when
    // the page does not say its year.
    function coursePageExams(code, fields, sections, todayIso) {
        if (!fields || !fields.volume) return [];
        var start = +fields.volume.slice(0, 4);
        // The first line, and each later line that starts with a period ("Autumn E3A; Spring F4A").
        var placement = String(fields.scheduleText || '').split('; ').filter(function (line, i) {
            return i === 0 || PLACEMENT_LINE_RE.test(line);
        }).join('; ');
        // When Schedule names a semester it alone places the course: an exam slot from the
        // other semester is the re-exam ("E4A, F4A, Oral re-exam", 22111). Off the normal
        // schedule, the exam slots place it.
        var codes = slotCodes(placement);
        if (!codes.length && !SEASON_WORDS.E.test(placement) && !SEASON_WORDS.F.test(placement)) codes = slotCodes(fields.examText);
        var out = [];
        var placedAny = false;
        function keep(label, period, section, result) {
            if (sectionOver(section, todayIso) || (!section && periodStartIso(period) <= todayIso)) return;
            out.push({ label: label, result: result });
        }
        [{ season: 'E', year: start }, { season: 'F', year: start + 1 }].forEach(function (period) {
            var placed = codes.some(function (c) { return c[0] === period.season; }) || SEASON_WORDS[period.season].test(placement);
            if (!placed) return;
            placedAny = true;
            var section = findExamSection(sections, period);
            keep((period.season === 'E' ? 'Autumn ' : 'Spring ') + period.year, period, section, resolveCourseExam(code, fields, section, period));
        });
        [1, 6, 7, 8].forEach(function (month) {
            if (!MONTH_WORDS[month].test(placement)) return;
            placedAny = true;
            var period = { season: month === 1 ? 'J' : 'S', year: start + 1 };
            keep(MONTH_NAMES[month] + ' ' + period.year, period, findExamSection(sections, period, month),
                resolveThreeWeekExam(code, fields, sections, period, month));
        });
        // Off DTU's normal schedule (mostly PhD courses): say what the page says, under the catalogue year.
        if (!placedAny) out.push({ label: yearLabel(fields.volume), result: unplacedExam(fields) });
        // Taught over two periods with one exam (10033: Autumn and Spring, exam F2A): the
        // period without a slot is teaching only, so it gets no line of its own.
        var noSlot = function (e) {
            return e.result.status === 'unconfirmed' && (e.result.reason === NO_SLOT_REASON || e.result.reason.indexOf(OTHER_SEASON_REASON) === 0);
        };
        if (out.some(function (e) { return !noSlot(e); })) out = out.filter(function (e) { return !noSlot(e); });
        return out;
    }

    function unplacedExam(fields) {
        var format = examFormat(fields);
        if (TEACHER_RE.test(fields.name)) return outcome('teacher', format, null, null, null);
        if (WITH_TEACHER_RE.test(fields.examText || '')) return outcome('teacher', format, null, null, 'the course page says to agree the exam date with the teacher');
        return outcome('unconfirmed', format, null, null, 'the course page places it in no exam period');
    }

    // Where DTU's date comes from: the course's slot, the course named in the
    // table, or a rule such as the last day of the January 3 weeks.
    function evidenceText(evidence) {
        if (!evidence) return 'from DTU\'s exam table';
        if (/^named: /.test(evidence)) return 'named in DTU\'s exam table';
        if (/^[EF]\d/.test(evidence)) return 'slot ' + evidence + ' in DTU\'s exam table';
        return 'DTU\'s exam table: ' + evidence;
    }

    // DTU's grading deadline for an exam day, as a fact: the date, and once it has
    // passed, how many days ago. Whether grades are out is not known here.
    // forDayIso names the exam day the deadline belongs to, for an exam whose day is not
    // one fixed date (an oral exam that runs over several days).
    function gradingText(gradingIso, todayIso, format, forDayIso) {
        if (!gradingIso) return '';
        var text = 'DTU\'s grading deadline' + (forDayIso ? ' for an exam on ' + format(forDayIso) : '') + ': ' + format(gradingIso);
        var days = dayNumber(todayIso) - dayNumber(gradingIso);
        if (days > 0) text += ', ' + days + (days === 1 ? ' day' : ' days') + ' ago';
        return text;
    }

    // DTU's exam table gives a grading deadline per exam day, about five weeks after it.
    // A planner row's deadline is the one for its own day: DTU's suggested day, or the
    // day the student set (the last day of a range). Coursework and undated rows get none.
    function gradingForRow(row, sections) {
        if (!row || !row.date || row.format === 'hand-in' || row.format === 'none') return null;
        if (row.status === 'suggested' && !row.range) return row.grading ? { grading: row.grading, day: null } : null;
        var day = row.endDate || row.date;
        var grading = null;
        (sections || []).forEach(function (section) {
            (section.rows || []).forEach(function (r) { if (r.date === day && r.grading) grading = r.grading; });
        });
        return grading ? { grading: grading, day: day } : null;
    }

    // The exams CampusNet Grades watches for a missing grade, kept in extension storage.
    // The planner's rows are the truth for what it shows now; an exam already held stays
    // after the planner moves on to the next period, until 200 days past its deadline.
    function mergeGradingWatch(stored, current, todayIso) {
        var byCode = Object.create(null);
        (current || []).forEach(function (e) { byCode[e.code] = e; });
        var kept = (Array.isArray(stored) ? stored : []).filter(function (e) {
            return e && e.code && !byCode[e.code] && e.exam < todayIso
                && dayNumber(todayIso) - dayNumber(e.grading) <= 200;
        });
        return kept.concat(current || []).sort(function (a, b) {
            return a.exam < b.exam ? -1 : a.exam > b.exam ? 1 : (a.code < b.code ? -1 : 1);
        });
    }

    // Where a resolved exam outcome comes from, or why it has no date.
    function outcomeText(result) {
        if (result.status === 'suggested') {
            var note = severalDaysNote(result);
            return evidenceText(result.evidence) + (note ? '. ' + note : '');
        }
        if (result.status === 'unconfirmed') return 'Not confirmed: ' + result.reason;
        if (result.status === 'no-exam') return 'Assessed on coursework, per the course page';
        if (result.status === 'teacher') return result.reason ? 'Per the course page, agree the date with the teacher' : 'Special course, project or thesis';
        return '';
    }

    function byDateThenCode(a, b) {
        if (a.date && b.date && a.date !== b.date) return a.date < b.date ? -1 : 1;
        if (!!a.date !== !!b.date) return a.date ? -1 : 1;
        return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
    }

    // Rows for the panel: today's outcome per course, overlaid with what the
    // student saved. A saved entry whose basis no longer matches DTU's table is
    // "changed", never silently kept. Saved codes no longer planned are left out
    // (and left in storage). Sorted by date, undated last.
    function mergeStudentEntries(resolved, stored) {
        var saved = stored || {};
        return Object.keys(resolved || {}).map(function (code) {
            var r = resolved[code];
            var entry = Object.prototype.hasOwnProperty.call(saved, code) ? saved[code] : null;
            var dtuDate = r.status === 'suggested' ? r.date : null;
            if (!entry) {
                return { code: code, status: r.status, format: r.format, date: r.date, endDate: null, range: r.range, pageDays: !!r.pageDays, evidence: r.evidence, reason: r.reason, dtuDate: dtuDate, grading: r.grading || null };
            }
            // A saved entry that says exactly what DTU's table says is not the
            // student's own date (older versions saved suggestions in bulk).
            if (dtuDate && entry.date === dtuDate && !entry.endDate && entry.format === r.format) {
                return { code: code, status: r.status, format: r.format, date: r.date, endDate: null, range: r.range, pageDays: !!r.pageDays, evidence: r.evidence, reason: r.reason, dtuDate: dtuDate, grading: r.grading || null };
            }
            var basisDate = entry.basis && entry.basis.date ? entry.basis.date : null;
            // An unconfirmed outcome means today's check could not be made, not
            // that DTU moved the exam, so the saved entry stands.
            var changed = r.status !== 'unconfirmed' && basisDate !== dtuDate;
            return {
                code: code,
                status: changed ? 'changed' : 'yours',
                format: entry.format,
                date: entry.date || null,
                endDate: entry.endDate || null,
                range: !!entry.endDate,
                evidence: r.evidence,
                reason: r.reason,
                dtuDate: dtuDate
            };
        }).sort(byDateThenCode);
    }

    function dayNumber(iso) {
        var p = iso.split('-');
        return Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000;
    }

    // Days from the latest last exam day so far to each later exam's first day.
    // A dated range (endDate) ends on its last day; a start inside it counts as
    // the same day.
    function computeExamGaps(rows) {
        var dated = (rows || []).filter(function (r) { return r && r.date; }).slice().sort(byDateThenCode);
        var gaps = [];
        var prev = null;
        var prevEnd = 0;
        dated.forEach(function (row) {
            var start = dayNumber(row.date);
            var end = row.endDate ? Math.max(start, dayNumber(row.endDate)) : start;
            if (prev) {
                var days = Math.max(0, start - prevEnd);
                gaps.push({ fromCode: prev.code, toCode: row.code, days: days, mark: days === 0 ? 'same-day' : days === 1 ? 'one-day' : null });
            }
            if (!prev || end > prevEnd) { prev = row; prevEnd = end; }
        });
        return gaps;
    }

    // First day of a planner period, roughly: the 13-week periods start late
    // August and early February, the 3-week ones in January and June.
    function periodStartIso(period) {
        return period.year + { E: '-08-25', F: '-02-01', J: '-01-02', S: '-06-01' }[period.season];
    }

    var SEASON_NAMES = { E: 'autumn', F: 'spring', J: 'january', S: 'summer' };

    function periodLabel(period) {
        if (period.season === 'E') return '13 weeks autumn ' + period.year;
        if (period.season === 'F') return '13 weeks spring ' + period.year;
        if (period.season === 'J') return 'January ' + period.year;
        return 'June/July/August ' + period.year;
    }

    // The periods a basket course would be taken in: per season it can be
    // placed in (E, F, J, S), the first one that has not started yet. A shown
    // planner period is used when it qualifies, so its label matches.
    function basketPeriods(seasons, shownPeriods, todayIso) {
        var out = [];
        var seen = {};
        (seasons || []).forEach(function (season) {
            if (!SEASON_NAMES[season] || seen[season]) return;
            seen[season] = true;
            var shown = (shownPeriods || []).filter(function (p) {
                return p && p.season === season && periodStartIso(p) > todayIso;
            }).sort(function (a, b) { return periodOrder(a) - periodOrder(b); })[0];
            var period = shown;
            if (!period) {
                var year = +todayIso.slice(0, 4);
                period = { season: season, year: year };
                if (periodStartIso(period) <= todayIso) period.year = year + 1;
                period.key = period.year + '-' + SEASON_NAMES[season];
            }
            out.push({ key: period.key, season: period.season, year: period.year });
        });
        return out.sort(function (a, b) { return periodOrder(a) - periodOrder(b); });
    }

    // Planned exams within one day of an exam: days 0 when they share a day
    // (ranges count every day), 1 when a day apart. Sorted by days, then code.
    function nearbyExams(exam, planned) {
        if (!exam || !exam.date) return [];
        var start = dayNumber(exam.date);
        var end = exam.endDate ? Math.max(start, dayNumber(exam.endDate)) : start;
        var out = [];
        (planned || []).forEach(function (p) {
            if (!p || !p.date || p.code === exam.code) return;
            var ps = dayNumber(p.date);
            var pe = p.endDate ? Math.max(ps, dayNumber(p.endDate)) : ps;
            var days = pe < start ? start - pe : ps > end ? ps - end : 0;
            if (days <= 1) out.push({ code: p.code, days: days });
        });
        return out.sort(function (a, b) { return a.days - b.days || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0); });
    }

    // The exam export as iCalendar text; the format lives in darkmode.ics.js, shared with the
    // DTU Learn deadlines export.
    function buildExamCalendar(events, stamp) {
        var ics = globalThis.DTUAfterDarkIcs;
        if (!ics) throw new Error('darkmode.studyplan-exam-schedule-core.js needs darkmode.ics.js loaded first');
        return ics.buildCalendar(events, stamp, 'DTU exams');
    }

    try {
        globalThis.DTUAfterDarkExamScheduleCore = {
            parseExamTable: parseExamTable,
            parseCourseExamFields: parseCourseExamFields,
            parsePlannerPeriod: parsePlannerPeriod,
            threeWeekMonth: threeWeekMonth,
            resolveThreeWeekExam: resolveThreeWeekExam,
            academicYearOf: academicYearOf,
            findExamSection: findExamSection,
            selectSchedulePeriods: selectSchedulePeriods,
            laterPlannerPeriods: laterPlannerPeriods,
            resolveCourseExam: resolveCourseExam,
            coursePageExams: coursePageExams,
            outcomeText: outcomeText,
            evidenceText: evidenceText,
            severalDaysNote: severalDaysNote,
            slotCodes: slotCodes,
            gradingText: gradingText,
            gradingForRow: gradingForRow,
            mergeGradingWatch: mergeGradingWatch,
            mergeStudentEntries: mergeStudentEntries,
            computeExamGaps: computeExamGaps,
            buildExamCalendar: buildExamCalendar,
            basketPeriods: basketPeriods,
            periodLabel: periodLabel,
            nearbyExams: nearbyExams
        };
    } catch (eCore) { }
})();
