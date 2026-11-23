// Exam totals per course (signed up, attended, passed, average) from exam-stats-data.json,
// built once a year by scripts/crawl-exam-stats.mjs from DTU's public karakterer.dtu.dk pages.
// The Grades widget (darkmode.kurser-widgets.js) uses them to ask karakterer only for terms
// the course had an exam in (gradeStatsSemesters).
(function () {
    'use strict';
    var DOM = globalThis.DTUAfterDarkDom;

    var DATA_FILE = 'exam-stats-data.json';

    function getDeps() {
        try { return globalThis.DTUAfterDarkExamStatsDeps || null; } catch (e0) { return null; }
    }

    function dep(name) {
        return DOM.dep(getDeps(), name);
    }

    // ===== Data =====

    // "W25" is the winter 2025 exam (December), "S26" the summer 2026 exam.
    function termOrder(term) {
        return (2000 + Number(term.slice(1))) * 2 + (term.charAt(0) === 'W' ? 1 : 0);
    }

    function termName(term) {
        return (term.charAt(0) === 'W' ? 'Winter-' : 'Summer-') + (2000 + Number(term.slice(1)));
    }

    // The karakterer terms the grade widget should ask for, newest first: terms published
    // after the data was built, then the course's own terms. A course with no results
    // since the data's first year gets only the newer terms (at least the data's newest,
    // so it still makes one request). Null when the data does not know the course: the
    // widget then walks every semester. Before, an unknown page cost 28 requests.
    function gradeStatsSemesters(data, code, now) {
        if (!data || !data.courses) return null;
        var own = data.courses[code];
        var isMissing = Array.isArray(data.missing) && data.missing.indexOf(code) !== -1;
        if (!own && !isMissing) return null;
        var newestBuilt = Object.keys(data.courses).reduce(function (best, c) {
            return Object.keys(data.courses[c]).reduce(function (b, t) { return termOrder(t) > termOrder(b) ? t : b; }, best);
        }, 'S00');
        // The newest term whose exam can be over: winter (December) from January, summer from July.
        var year = now.getFullYear() % 100;
        var latest = now.getMonth() >= 6 ? 'S' + year : 'W' + (year - 1);
        var newer = [];
        for (var o = termOrder(latest); o > termOrder(newestBuilt); o--) newer.push((o % 2 ? 'W' : 'S') + String(Math.floor(o / 2) - 2000).padStart(2, '0'));
        var terms = newer.concat(Object.keys(own || {}).sort(function (a, b) { return termOrder(b) - termOrder(a); }));
        if (!terms.length) terms = [newestBuilt];
        return terms.map(termName);
    }

    var _dataPromise = null;

    function loadExamStatsData() {
        if (_dataPromise) return _dataPromise;
        var getUrl = dep('getExtensionUrl');
        if (!getUrl) return Promise.reject(new Error('no extension url'));
        _dataPromise = fetch(getUrl(DATA_FILE))
            .then(function (res) {
                if (!res.ok) throw new Error('http ' + res.status);
                return res.json();
            })
            .then(function (data) {
                if (!data || !data.courses) throw new Error('bad data');
                return data;
            });
        _dataPromise.catch(function () { _dataPromise = null; });
        return _dataPromise;
    }

    try {
        globalThis.DTUAfterDarkKurserExamStats = {
            loadExamStatsData: loadExamStatsData,
            gradeStatsSemesters: gradeStatsSemesters
        };
    } catch (eExamStats) { }
})();
