(function () {
    'use strict';

    function getDeps() {
        try { return globalThis.DTUAfterDarkParticipantIntelHostDeps || null; } catch (e0) { return null; }
    }

    function normalizeWhitespace(text) {
        var deps = getDeps();
        if (deps && typeof deps.normalizeWhitespace === 'function') {
            return deps.normalizeWhitespace(text);
        }
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function normalizeIntelCourseCode(code) {
        var rawText = String(code || '');
        var m = rawText.match(/\b(\d{5}|KU\d{3})\b/i);
        if (m) return String(m[1]).toUpperCase();

        var raw = rawText.toUpperCase();
        raw = raw.replace(/[\u200B-\u200D\uFEFF]/g, '');
        raw = raw.replace(/\u00A0/g, ' ');
        raw = raw.replace(/[^A-Z0-9]/g, '');
        return raw;
    }

    function normalizeIntelCourseSemester(semester) {
        var raw = String(semester || '').toUpperCase();
        raw = raw.replace(/[\u200B-\u200D\uFEFF]/g, '');
        raw = raw.replace(/\u00A0/g, ' ');
        var embedded = raw.match(/([FE])\s*[-_/]?\s*(\d{2}|\d{4})/);
        if (embedded) {
            var embSeason = embedded[1];
            var embYear = parseInt(embedded[2], 10);
            if (!isNaN(embYear)) {
                if (embYear < 100) embYear += 2000;
                return embSeason + embYear;
            }
        }
        raw = raw.replace(/\s+/g, '');
        raw = raw.replace(/[^A-Z0-9]/g, '');
        if (!raw) return '';
        var shortMatch = raw.match(/^([FE])(\d{2})$/);
        if (shortMatch) return shortMatch[1] + '20' + shortMatch[2];
        var longMatch = raw.match(/^([FE])(\d{4})$/);
        if (longMatch) return longMatch[1] + longMatch[2];
        return raw;
    }

    function detectCampusnetSelfSNumberFromHeader() {
        if (window.location.hostname !== 'campusnet.dtu.dk') return '';
        try {
            var root = document.querySelector('header, .header, #header, .masthead') || document.body;
            if (!root) return '';
            var txt = normalizeWhitespace(root.textContent || '');
            var m = txt.match(/\b(s\d{6})\b/i);
            return m ? String(m[1]).toLowerCase() : '';
        } catch (e0) {
            return '';
        }
    }

    function isCampusnetParticipantPage() {
        return window.location.hostname === 'campusnet.dtu.dk'
            && /\/cnnet\/element\/\d+\/participants/i.test(window.location.pathname);
    }

    function isCampusnetProfilePage() {
        return window.location.hostname === 'campusnet.dtu.dk'
            && /\/cnnet\/participants\/showperson\.aspx/i.test(window.location.pathname);
    }

    function isCampusnetFrontpageDTU() {
        return window.location.hostname === 'campusnet.dtu.dk'
            && /^\/cnnet\/frontpage\/dtu\/?$/i.test(window.location.pathname);
    }

    function isCampusnetGroupArchivePage() {
        return window.location.hostname === 'campusnet.dtu.dk'
            && /^\/cnnet\/grouparchive\/default\/?$/i.test(window.location.pathname);
    }

    function getCurrentDTUSemester() {
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth();
        if (month >= 1 && month <= 6) return 'F' + year;
        if (month >= 7) return 'E' + year;
        return 'E' + (year - 1);
    }

    function parseDTUSemesterFromText(text) {
        var t = normalizeWhitespace(text);
        if (!t) return null;

        var m = t.match(/\b([FE])\s*(\d{2}|\d{4})\b/i);
        if (m) {
            var season = (m[1] || '').toUpperCase();
            var year = parseInt(m[2], 10);
            if (isNaN(year)) return null;
            if (year < 100) year += 2000;
            if (year < 2000 || year > 2100) return null;
            return season + year;
        }

        var m2 = t.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s*(\d{2}|\d{4})\b/i);
        if (m2) {
            var mon = (m2[1] || '').toLowerCase().slice(0, 3);
            var year2 = parseInt(m2[2], 10);
            if (isNaN(year2)) return null;
            if (year2 < 100) year2 += 2000;
            if (year2 < 2000 || year2 > 2100) return null;
            var monthIndex = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }[mon];
            if (typeof monthIndex !== 'number') return null;
            return (monthIndex <= 6 ? 'F' : 'E') + year2;
        }

        return null;
    }

    function getCampusnetExplicitSemesterFromPage(rootDoc) {
        var doc = rootDoc || document;
        var candidates = [];
        try {
            var breadcrumb = doc.querySelector('#breadcrumb, .breadcrumb, nav[aria-label="breadcrumb"]');
            if (breadcrumb) candidates.push(normalizeWhitespace(breadcrumb.textContent));
        } catch (e1) { }
        try {
            doc.querySelectorAll('h1, h2, .course-title, .element-title').forEach(function (h) {
                var txt = normalizeWhitespace(h.textContent);
                if (txt) candidates.push(txt);
            });
        } catch (e2) { }
        try {
            if (doc.title) candidates.push(normalizeWhitespace(doc.title));
        } catch (e3) { }
        for (var i = 0; i < candidates.length; i++) {
            var sem = parseDTUSemesterFromText(candidates[i]);
            if (sem) return sem;
        }
        return null;
    }

    function getCampusnetSemesterFromPage(rootDoc) {
        return getCampusnetExplicitSemesterFromPage(rootDoc) || getCurrentDTUSemester();
    }

    function getCampusnetCourseCodeFromPage(rootDoc) {
        var doc = rootDoc || document;
        var codeRe = /\b(\d{5}|KU\d{3})\b/i;
        var breadcrumb = doc.querySelector('#breadcrumb, .breadcrumb, nav[aria-label="breadcrumb"]');
        if (breadcrumb) {
            var links = breadcrumb.querySelectorAll('a');
            for (var i = 0; i < links.length; i++) {
                var m = (links[i].textContent || '').match(codeRe);
                if (m) return m[1];
            }
        }
        var headings = doc.querySelectorAll('h1, h2, .course-title, .element-title');
        for (var j = 0; j < headings.length; j++) {
            var m2 = (headings[j].textContent || '').match(codeRe);
            if (m2) return m2[1];
        }
        var titleText = '';
        try { titleText = doc.title || ''; } catch (e0) { titleText = ''; }
        var titleMatch = titleText.match(codeRe);
        if (titleMatch) return titleMatch[1];
        return null;
    }

    function isCampusnetNonCourseTitle(text) {
        var t = normalizeWhitespace(text || '').toLowerCase();
        if (!t) return false;
        t = t.replace(/\b(?:\d{5}|ku\d{3})\b/gi, ' ');
        t = t.replace(/\b[fe]\s*[-_/]?\s*(?:20)?\d{2}\b/gi, ' ');
        t = t.replace(/\(archived\)/gi, ' ');
        t = normalizeWhitespace(t);
        if (!t) return false;
        var tf = t;
        try {
            tf = tf.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        } catch (eNorm) { }
        if (/\b(?:group|groups|gruppe|grupper|team|teams|hold)\b/i.test(tf)) return true;
        if (/\b(?:pcb|frilab|fri\s*lab|free\s*lab)\b/i.test(tf)) return true;
        if (/\bquiz(?:zes)?\b/i.test(tf)) return true;
        if (/\b(?:lab|labs|laboratory|laboratorie|ovelse|eksperiment(?:er)?|experiment(?:s)?)\b/i.test(tf)) return true;
        if (/\b(?:experiment|eksperiment)\s*x\b/i.test(tf)) return true;
        return false;
    }

    function isCampusnetLikelyAcademicCourse(courseCode, courseName, opts) {
        var code = normalizeIntelCourseCode(courseCode);
        if (!/^(?:\d{5}|KU\d{3})$/.test(code)) return false;
        var texts = [];
        if (courseName) texts.push(String(courseName));
        if (opts && opts.title) texts.push(String(opts.title));
        if (opts && opts.linkText) texts.push(String(opts.linkText));
        for (var i = 0; i < texts.length; i++) {
            if (isCampusnetNonCourseTitle(texts[i])) return false;
        }
        return true;
    }

    function getCampusnetCourseNameFromPage(courseCode, rootDoc) {
        var doc = rootDoc || document;
        var code = courseCode || getCampusnetCourseCodeFromPage(doc);
        if (!code) return null;

        function escapeRegExp(s) {
            return (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        function cleanCandidate(s) {
            var t = normalizeWhitespace(s);
            if (!t) return '';
            t = t.replace(/\b(participants?|deltagere|participant\s*list|deltagerliste)\b/ig, '').trim();
            t = t.replace(/\s*[\|\-:]\s*$/g, '').trim();
            return t;
        }

        var candidates = [];
        var breadcrumb = doc.querySelector('#breadcrumb, .breadcrumb, nav[aria-label="breadcrumb"]');
        if (breadcrumb) {
            breadcrumb.querySelectorAll('a, span').forEach(function (n) {
                var txt = cleanCandidate(n.textContent);
                if (txt) candidates.push(txt);
            });
        }
        doc.querySelectorAll('h1, h2, .course-title, .element-title').forEach(function (h) {
            var txt = cleanCandidate(h.textContent);
            if (txt) candidates.push(txt);
        });
        try {
            if (doc.title) candidates.push(cleanCandidate(doc.title));
        } catch (e0) { }

        var codeEsc = escapeRegExp(code);
        var codeRe = new RegExp('\\b' + codeEsc + '\\b');
        for (var i = 0; i < candidates.length; i++) {
            var cand = candidates[i];
            if (!cand || !codeRe.test(cand)) continue;
            var m1 = cand.match(new RegExp('\\b' + codeEsc + '\\b\\s*(?:[-:|\\u2013\\u2014])?\\s*(.+)$'));
            if (m1 && m1[1]) {
                var name1 = cleanCandidate(m1[1]);
                if (name1 && name1.length >= 4 && !/^\d+$/.test(name1)) return name1;
            }
            var m2 = cand.match(new RegExp('^(.+?)\\s*\\(\\s*' + codeEsc + '\\s*\\)\\s*$'));
            if (m2 && m2[1]) {
                var name2 = cleanCandidate(m2[1]);
                if (name2 && name2.length >= 4 && !/^\d+$/.test(name2)) return name2;
            }
        }
        return null;
    }

    function normalizeProgramLabel(raw) {
        var p = normalizeWhitespace(raw);
        if (!p) return '';
        if (/^g(?:æ|ae)st\s*udl\.?$/i.test(p)) return 'Exchange student';
        return p;
    }

    function getCampusnetParticipantCategoryMeta(labelRegex) {
        if (!labelRegex) return null;
        var headings = document.querySelectorAll('.ui-participant-categorybar h3');
        for (var i = 0; i < headings.length; i++) {
            var txt = normalizeWhitespace(headings[i].textContent);
            if (!labelRegex.test(txt)) continue;
            var m = txt.match(/\((\d+)\)/);
            var count = m ? parseInt(m[1], 10) : null;
            return {
                headingEl: headings[i],
                barEl: headings[i].closest('.ui-participant-categorybar'),
                containerEl: headings[i].closest('.ui-participants-list-category'),
                count: isNaN(count) ? null : count
            };
        }
        return null;
    }

    function getCampusnetUsersCategoryMeta() {
        return getCampusnetParticipantCategoryMeta(/^(Users|Brugere)\b/i);
    }

    function getCampusnetUsersCountFromPage() {
        var meta = getCampusnetUsersCategoryMeta();
        return meta ? meta.count : null;
    }

    function getCampusnetUsersAnchorElement() {
        var meta = getCampusnetUsersCategoryMeta();
        if (!meta) return document.querySelector('.ui-participants-list-category');
        return meta.containerEl || meta.barEl || meta.headingEl;
    }

    function getCampusnetParticipantsListRoot() {
        var root = document.querySelector('.ui-participants-list');
        if (root) return root;
        var firstCategory = document.querySelector('.ui-participants-list-category');
        if (firstCategory && firstCategory.parentNode) return firstCategory.parentNode;
        var firstBar = document.querySelector('.ui-participant-categorybar');
        if (firstBar && firstBar.parentNode) return firstBar.parentNode;
        return null;
    }

    function getCampusnetUsersParticipantElements() {
        var meta = getCampusnetUsersCategoryMeta();
        if (meta && meta.containerEl) {
            var within = Array.from(meta.containerEl.querySelectorAll('.ui-participant'));
            if (within.length) return within;
        }

        var bar = meta ? meta.barEl : null;
        if (bar) {
            var items = [];
            var seen = new Set();
            var node = bar.nextElementSibling;
            var guard = 0;
            while (node && guard < 6000) {
                guard++;
                if (node.classList && node.classList.contains('ui-participant-categorybar')) break;
                if (node.classList && node.classList.contains('ui-participant')) {
                    if (!seen.has(node)) { seen.add(node); items.push(node); }
                } else if (node.querySelectorAll) {
                    node.querySelectorAll('.ui-participant').forEach(function (p) {
                        if (!seen.has(p)) { seen.add(p); items.push(p); }
                    });
                }
                node = node.nextElementSibling;
            }
            if (items.length) return items;
        }

        return Array.from(document.querySelectorAll('.ui-participant'));
    }

    function getCampusnetParticipantSNumber(item) {
        if (!item || !item.querySelector) return '';

        var candidates = [];
        var legacyInfo = item.querySelector('.ui-participant-additional.user-information');
        if (legacyInfo) candidates.push(legacyInfo.textContent || '');

        var email = item.querySelector('.ui-participant-email');
        if (email) candidates.push(email.textContent || '');

        var mailLink = item.querySelector('a[href^="mailto:"]');
        if (mailLink) candidates.push(mailLink.getAttribute('href') || '');

        for (var i = 0; i < candidates.length; i++) {
            var match = String(candidates[i] || '').match(/\b(s\d{6})\b/i);
            if (match) return String(match[1]).toLowerCase();
        }
        return '';
    }

    try {
        globalThis.DTUAfterDarkParticipantIntelHost = {
            normalizeIntelCourseCode: normalizeIntelCourseCode,
            normalizeIntelCourseSemester: normalizeIntelCourseSemester,
            detectCampusnetSelfSNumberFromHeader: detectCampusnetSelfSNumberFromHeader,
            isCampusnetParticipantPage: isCampusnetParticipantPage,
            isCampusnetProfilePage: isCampusnetProfilePage,
            isCampusnetFrontpageDTU: isCampusnetFrontpageDTU,
            isCampusnetGroupArchivePage: isCampusnetGroupArchivePage,
            getCurrentDTUSemester: getCurrentDTUSemester,
            parseDTUSemesterFromText: parseDTUSemesterFromText,
            getCampusnetExplicitSemesterFromPage: getCampusnetExplicitSemesterFromPage,
            getCampusnetSemesterFromPage: getCampusnetSemesterFromPage,
            getCampusnetCourseCodeFromPage: getCampusnetCourseCodeFromPage,
            isCampusnetNonCourseTitle: isCampusnetNonCourseTitle,
            isCampusnetLikelyAcademicCourse: isCampusnetLikelyAcademicCourse,
            getCampusnetCourseNameFromPage: getCampusnetCourseNameFromPage,
            normalizeProgramLabel: normalizeProgramLabel,
            getCampusnetParticipantCategoryMeta: getCampusnetParticipantCategoryMeta,
            getCampusnetUsersCategoryMeta: getCampusnetUsersCategoryMeta,
            getCampusnetUsersCountFromPage: getCampusnetUsersCountFromPage,
            getCampusnetUsersAnchorElement: getCampusnetUsersAnchorElement,
            getCampusnetParticipantsListRoot: getCampusnetParticipantsListRoot,
            getCampusnetUsersParticipantElements: getCampusnetUsersParticipantElements,
            getCampusnetParticipantSNumber: getCampusnetParticipantSNumber
        };
    } catch (eExpose) { }
})();
