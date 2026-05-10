(function () {
    'use strict';

    function getDeps() {
        try { return globalThis.DTUAfterDarkParticipantIntelScoringDeps || null; } catch (e0) { return null; }
    }

    function normalizeProgramLabel(raw) {
        var deps = getDeps();
        return deps && typeof deps.normalizeProgramLabel === 'function'
            ? deps.normalizeProgramLabel(raw)
            : String(raw || '').replace(/\s+/g, ' ').trim();
    }

    function normalizeIntelCourseCode(code) {
        var deps = getDeps();
        return deps && typeof deps.normalizeIntelCourseCode === 'function'
            ? deps.normalizeIntelCourseCode(code)
            : String(code || '').toUpperCase();
    }

    function isCampusnetLikelyAcademicCourse(courseCode, courseName, opts) {
        var deps = getDeps();
        return !!(deps && typeof deps.isCampusnetLikelyAcademicCourse === 'function' && deps.isCampusnetLikelyAcademicCourse(courseCode, courseName, opts));
    }

    function getCurrentDTUSemester() {
        var deps = getDeps();
        if (deps && typeof deps.getCurrentDTUSemester === 'function') {
            return deps.getCurrentDTUSemester();
        }
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth();
        if (month >= 1 && month <= 6) return 'F' + year;
        if (month >= 7) return 'E' + year;
        return 'E' + (year - 1);
    }
    function computeCourseProgramStatsForCodes(intel, courseCodes, scope, currentSem) {
        // Build per-course program distribution from collected participant intel.
        // Used to detect "study line specific" courses that heavily correlate with your program.
        var onlyCurrent = (scope === 'semester' && !!currentSem);
        var wanted = {};
        for (var i = 0; i < courseCodes.length; i++) {
            var cc = courseCodes[i];
            if (cc) wanted[cc] = 1;
        }

        var stats = {};
        var students = (intel && intel.students) ? intel.students : {};
        var sNumbers = Object.keys(students || {});
        for (var s = 0; s < sNumbers.length; s++) {
            var student = students[sNumbers[s]];
            if (!student || !student.courses || !student.courses.length) continue;

            var program = normalizeProgramLabel(student.program || '');
            if (!program) continue;

            var seen = {};
            for (var c = 0; c < student.courses.length; c++) {
                var sc = student.courses[c];
                if (!sc || !sc.code) continue;
                if (onlyCurrent && sc.semester !== currentSem) continue;
                var code = normalizeIntelCourseCode(sc.code);
                var cName = '';
                try { cName = intel.courseNames ? (intel.courseNames[code] || '') : ''; } catch (eCN0) { cName = ''; }
                if (!isCampusnetLikelyAcademicCourse(code, cName, { title: cName })) continue;
                if (!wanted[code]) continue;
                if (seen[code]) continue;
                seen[code] = 1;

                if (!stats[code]) stats[code] = { total: 0, byProgram: {} };
                stats[code].total++;
                stats[code].byProgram[program] = (stats[code].byProgram[program] || 0) + 1;
            }
        }

        // Include self (best-effort) so newly collected course sets still get a stable denominator.
        try {
            if (intel && intel.self && intel.self.program && intel.self.courses && intel.self.courses.length) {
                var selfProg = normalizeProgramLabel(intel.self.program || '');
                if (selfProg) {
                    var seenSelf = {};
                    for (var i2 = 0; i2 < intel.self.courses.length; i2++) {
                        var mc = intel.self.courses[i2];
                        if (!mc || !mc.code) continue;
                        if (onlyCurrent && mc.semester !== currentSem) continue;
                        var code2 = normalizeIntelCourseCode(mc.code);
                        var cName2 = '';
                        try { cName2 = intel.courseNames ? (intel.courseNames[code2] || '') : ''; } catch (eCN1) { cName2 = ''; }
                        if (!isCampusnetLikelyAcademicCourse(code2, cName2, { title: cName2 })) continue;
                        if (!wanted[code2]) continue;
                        if (seenSelf[code2]) continue;
                        seenSelf[code2] = 1;

                        if (!stats[code2]) stats[code2] = { total: 0, byProgram: {} };
                        stats[code2].total++;
                        stats[code2].byProgram[selfProg] = (stats[code2].byProgram[selfProg] || 0) + 1;
                    }
                }
            }
        } catch (eSelf) { }

        return stats;
    }

    function detectStudyLineSpecificCourses(intel, selfProgram, myCourseCodes, scope, currentSem) {
        // Heuristic: a course is considered "study line specific" if your program is the top
        // program bucket and makes up a large share of known-program participants for that course.
        // This helps avoid showing previous study-line mates who switched programs.
        var MIN_TOTAL = 25;
        var MIN_SHARE = 0.60;

        var stats = computeCourseProgramStatsForCodes(intel, myCourseCodes, scope, currentSem);
        var set = {};
        var details = {};
        for (var i = 0; i < myCourseCodes.length; i++) {
            var code = myCourseCodes[i];
            if (!code) continue;
            var st = stats[code];
            if (!st || !st.total || st.total < MIN_TOTAL) continue;

            var selfCount = (st.byProgram && st.byProgram[selfProgram]) ? st.byProgram[selfProgram] : 0;
            if (!selfCount) continue;
            var share = selfCount / st.total;
            if (share < MIN_SHARE) continue;

            var max = 0;
            var keys = Object.keys(st.byProgram || {});
            for (var k = 0; k < keys.length; k++) {
                var v = st.byProgram[keys[k]] || 0;
                if (v > max) max = v;
            }
            if (selfCount < max) continue;

            set[code] = 1;
            details[code] = { total: st.total, selfCount: selfCount, share: share };
        }
        return { set: set, details: details, minTotal: MIN_TOTAL, minShare: MIN_SHARE };
    }

    function computeSemesterTwinData(intel, prefs) {
        var rowLimit = (prefs && prefs.rowLimit === 10) ? 10 : 5;
        var scope = (prefs && prefs.scope === 'all') ? 'all' : 'semester';
        var data = {
            twins: [],
            myTotal: 0,
            meta: {
                showingClosest: false,
                includingClosest: false,
                includesLowOverlap: false,
                includesZeroOverlap: false,
                twinCount: 0,
                emptyMessage: '',
                hideOwnProgram: false,
                selfProgram: '',
                courseNames: (intel && intel.courseNames) ? intel.courseNames : {},
                rowLimit: rowLimit,
                scope: scope,
                historyTotal: 0,
                currentTotal: 0,
                currentVerifiedTotal: 0,
                currentSeededTotal: 0,
                myTotalBeforeLineSpecific: 0,
                myTotalAfterLineSpecific: 0,
                lineSpecificCourseCount: 0,
                lineSpecificCourses: [],
                lineSpecificSuppressed: 0,
                lineSpecificNote: ''
            }
        };

        if (!intel || !intel.self || !intel.self.courses || !intel.self.courses.length) {
            data.meta.emptyMessage = 'Semester Twins: could not detect you yet. Open a CampusNet course participant page (Users list) while logged in, then reload this page.';
            return data;
        }

        var selfProgram = normalizeProgramLabel(intel.self.program || '');
        data.meta.selfProgram = selfProgram || '';
        data.meta.hideOwnProgram = !!(prefs && prefs.hideOwnProgram && selfProgram);

        var currentSem = getCurrentDTUSemester();
        var myAllSet = {};
        var myCurrentSet = {};
        var myCurrentWeightByCode = {};
        var myCurrentVerifiedSet = {};
        for (var i = 0; i < intel.self.courses.length; i++) {
            var myc = intel.self.courses[i];
            if (!myc || !myc.code) continue;
            var myCode = normalizeIntelCourseCode(myc.code);
            var myName = '';
            try { myName = intel.courseNames ? (intel.courseNames[myCode] || '') : ''; } catch (eMyNm) { myName = ''; }
            if (!isCampusnetLikelyAcademicCourse(myCode, myName, { title: myName })) continue;

            myAllSet[myCode] = 1;
            if (myc.semester === currentSem && !myc.archived) {
                myCurrentSet[myCode] = 1;
                var src = String(myc.source || '').toLowerCase();
                var hasKnownName = !!(intel.courseNames && intel.courseNames[myCode]);
                // Frontpage seed is useful fallback, but lower-confidence than participant-page evidence.
                // Legacy entries without explicit source are treated as verified only when we know
                // the course from collected participant/course-name data.
                var weight = 1.0;
                var isVerifiedCurrent = false;
                if (src === 'frontpage') {
                    weight = 0.35;
                    isVerifiedCurrent = false;
                } else if (src === 'participant') {
                    weight = 1.0;
                    isVerifiedCurrent = true;
                } else if (!src) {
                    weight = hasKnownName ? 1.0 : 0.55;
                    isVerifiedCurrent = !!hasKnownName;
                } else {
                    weight = 0.85;
                    isVerifiedCurrent = true;
                }
                if (!myCurrentWeightByCode[myCode] || weight > myCurrentWeightByCode[myCode]) {
                    myCurrentWeightByCode[myCode] = weight;
                }
                if (isVerifiedCurrent) {
                    myCurrentVerifiedSet[myCode] = 1;
                }
            }
        }

        // Always keep full-history overlap available, but in "This semester"
        // we rank primarily by current-semester overlap (verified first) and
        // use history as tie-breaker.
        var myCourses = Object.keys(myAllSet);
        myCourses.sort();
        var myCurrentCodes = Object.keys(myCurrentSet);
        myCurrentCodes.sort();
        var myCurrentVerifiedCodes = Object.keys(myCurrentVerifiedSet);
        myCurrentVerifiedCodes.sort();
        var myCurrentWeightTotal = 0;
        for (var mw = 0; mw < myCurrentCodes.length; mw++) {
            myCurrentWeightTotal += (myCurrentWeightByCode[myCurrentCodes[mw]] || 1.0);
        }
        var hasVerifiedCurrent = myCurrentVerifiedCodes.length > 0;
        data.meta.historyTotal = myCourses.length;
        data.meta.currentTotal = myCurrentCodes.length;
        data.meta.currentVerifiedTotal = myCurrentVerifiedCodes.length;
        data.meta.currentSeededTotal = Math.max(0, myCurrentCodes.length - myCurrentVerifiedCodes.length);
        data.meta.myTotalBeforeLineSpecific = myCourses.length;
        data.meta.myTotalAfterLineSpecific = myCourses.length;

        if (!myCourses.length) {
            data.meta.emptyMessage = 'No course history found yet. Visit CampusNet course participant pages (Users list) or scan your course history, then reload this page.';
            return data;
        }
        if (myCourses.length < 2) {
            data.meta.emptyMessage = 'Add at least 2 courses to your history (visit participant pages or scan your course history) to unlock Semester Twins.';
            return data;
        }
        if (scope === 'semester' && !myCurrentCodes.length) {
            data.meta.emptyMessage = 'No current-semester courses found yet. Visit a CampusNet participant page (Users list) for a course you are taking this semester.';
            return data;
        }

        var hideOwnProgram = !!data.meta.hideOwnProgram;
        var myCoursesUsed = myCourses;
        var myTotalUsed = myCoursesUsed.length;
        var lineSpecificSet = null;
        var lineSpecificCodes = [];
        var suppressedByLineSpecific = 0;

        if (hideOwnProgram && selfProgram) {
            // Always detect on full history for consistent filtering.
            var detected = detectStudyLineSpecificCourses(intel, selfProgram, myCourses, 'all', currentSem);
            lineSpecificSet = (detected && detected.set) ? detected.set : null;
            lineSpecificCodes = lineSpecificSet ? Object.keys(lineSpecificSet) : [];
            lineSpecificCodes.sort();
            if (lineSpecificCodes.length) {
                data.meta.lineSpecificCourseCount = lineSpecificCodes.length;
                data.meta.lineSpecificCourses = lineSpecificCodes.slice(0);

                var filtered = myCourses.filter(function (code) { return !lineSpecificSet[code]; });
                if (filtered.length >= 2) {
                    myCoursesUsed = filtered;
                    myTotalUsed = myCoursesUsed.length;
                    data.meta.myTotalAfterLineSpecific = myTotalUsed;
                } else {
                    data.meta.lineSpecificNote = 'Too few courses left after excluding study-line-specific courses.';
                }
            }
        }

        data.myTotal = myTotalUsed;
        var candidates = [];
        var sNumbers = Object.keys(intel.students || {});
        for (var s = 0; s < sNumbers.length; s++) {
            var sNumber = sNumbers[s];
            if (intel.self.sNumber === sNumber) continue;
            var student = intel.students[sNumber];
            if (!student || !student.courses || !student.courses.length) continue;

            // Always build the full course set for each student (for scoring).
            var theirCourseSet = {};
            for (var c = 0; c < student.courses.length; c++) {
                var tc = student.courses[c];
                if (!tc || !tc.code) continue;
                var theirCode = normalizeIntelCourseCode(tc.code);
                var theirName = '';
                try { theirName = intel.courseNames ? (intel.courseNames[theirCode] || '') : ''; } catch (eThNm) { theirName = ''; }
                if (!isCampusnetLikelyAcademicCourse(theirCode, theirName, { title: theirName })) continue;
                theirCourseSet[theirCode] = 1;
            }

            // In "Hide my study line" mode, suppress candidates that share study-line-specific courses.
            if (hideOwnProgram && selfProgram && lineSpecificCodes && lineSpecificCodes.length) {
                var hasLineSpecific = false;
                for (var ls = 0; ls < lineSpecificCodes.length; ls++) {
                    if (theirCourseSet[lineSpecificCodes[ls]]) { hasLineSpecific = true; break; }
                }
                if (hasLineSpecific) {
                    suppressedByLineSpecific++;
                    continue;
                }
            }

            // Compute overlap on the full used course set (history).
            var overlap = [];
            for (var o = 0; o < myCoursesUsed.length; o++) {
                if (theirCourseSet[myCoursesUsed[o]]) overlap.push(myCoursesUsed[o]);
            }

            var program = normalizeProgramLabel(student.program || '');
            if (hideOwnProgram && selfProgram && program && program === selfProgram) continue;

            // For "This semester" scope: require at least 1 shared current-semester course.
            var currentSemOverlap = 0;
            var currentSemWeightedOverlap = 0;
            var currentSemVerifiedOverlap = 0;
            if (scope === 'semester') {
                for (var cs = 0; cs < myCurrentCodes.length; cs++) {
                    var cc = myCurrentCodes[cs];
                    if (theirCourseSet[cc]) {
                        currentSemOverlap++;
                        currentSemWeightedOverlap += (myCurrentWeightByCode[cc] || 1.0);
                        if (myCurrentVerifiedSet[cc]) currentSemVerifiedOverlap++;
                    }
                }
                // If we have verified current courses, require overlap on at least one of those.
                // Otherwise, fall back to any current overlap.
                if (hasVerifiedCurrent) {
                    if (currentSemVerifiedOverlap === 0) continue;
                } else if (currentSemOverlap === 0) {
                    continue;
                }
            }

            var syncScore = overlap.length / myTotalUsed;
            var semesterBlendScore = syncScore;
            if (scope === 'semester') {
                // Strongly prioritize current-semester overlap while still considering history.
                var currentRatio = (myCurrentWeightTotal > 0) ? (currentSemWeightedOverlap / myCurrentWeightTotal) : 0;
                semesterBlendScore = (currentRatio * 0.85) + (syncScore * 0.15);
            }
            candidates.push({
                sNumber: sNumber,
                name: student.name || sNumber,
                program: program,
                syncScore: syncScore,
                semesterBlendScore: semesterBlendScore,
                shared: overlap,
                currentSemOverlap: currentSemOverlap,
                currentSemWeightedOverlap: currentSemWeightedOverlap,
                currentSemVerifiedOverlap: currentSemVerifiedOverlap,
                lastSeen: student.lastSeen || 0
            });
        }

        data.meta.lineSpecificSuppressed = suppressedByLineSpecific;

        if (!candidates.length) {
            if (hideOwnProgram && selfProgram && lineSpecificCodes && lineSpecificCodes.length && suppressedByLineSpecific > 0) {
                data.meta.emptyMessage = 'No matches outside your study line after filtering out study-line-specific overlaps.';
            } else if (scope === 'semester') {
                data.meta.emptyMessage = 'No classmates found in your current-semester courses yet. Visit more participant pages for this semester\'s courses.';
            } else {
                data.meta.emptyMessage = hideOwnProgram
                    ? 'No overlaps outside your study line yet. Visit more CampusNet participant pages to build your course set.'
                    : 'No overlaps yet. Visit more CampusNet participant pages to build your course set.';
            }
            return data;
        }

        candidates.sort(function (a, b) {
            // In "This semester" mode, heavily prioritize current-semester overlap
            // (verified current courses first), then use total history as tie-breaker.
            if (scope === 'semester') {
                var cvA = a.currentSemVerifiedOverlap || 0;
                var cvB = b.currentSemVerifiedOverlap || 0;
                if (cvB !== cvA) return cvB - cvA;

                var cwA = a.currentSemWeightedOverlap || 0;
                var cwB = b.currentSemWeightedOverlap || 0;
                if (cwB !== cwA) return cwB - cwA;

                var csA = a.currentSemOverlap || 0;
                var csB = b.currentSemOverlap || 0;
                if (csB !== csA) return csB - csA;

                if ((b.semesterBlendScore || 0) !== (a.semesterBlendScore || 0)) {
                    return (b.semesterBlendScore || 0) - (a.semesterBlendScore || 0);
                }
            }
            if (b.shared.length !== a.shared.length) return b.shared.length - a.shared.length;
            if (b.syncScore !== a.syncScore) return b.syncScore - a.syncScore;
            if ((b.lastSeen || 0) !== (a.lastSeen || 0)) return (b.lastSeen || 0) - (a.lastSeen || 0);
            return (a.name || '').localeCompare(b.name || '');
        });

        // "Twin" is a high overlap score; for large histories this can be rare, so we always
        // fill the requested list with the closest matches (and finally 0-overlap) instead
        // of only showing the 50%+ set.
        var twins = candidates.filter(function (m) { return m.syncScore >= 0.50 && m.shared && m.shared.length; });
        data.meta.twinCount = twins.length;

        var preferredMinOverlap = (scope === 'all') ? 1 : ((myTotalUsed >= 3) ? 2 : 1);
        var preferred = candidates.filter(function (m) { return (m.shared && m.shared.length >= preferredMinOverlap); });
        var lowOverlap = candidates.filter(function (m) { return (m.shared && m.shared.length > 0 && m.shared.length < preferredMinOverlap); });
        var zeroOverlap = candidates.filter(function (m) { return !(m.shared && m.shared.length); });

        var seen = {};
        var display = [];
        function pushFrom(list) {
            for (var i = 0; i < list.length && display.length < 10; i++) {
                var item = list[i];
                if (!item || !item.sNumber) continue;
                if (seen[item.sNumber]) continue;
                seen[item.sNumber] = 1;
                display.push(item);
            }
        }

        pushFrom(twins);
        pushFrom(preferred);
        pushFrom(lowOverlap);
        pushFrom(zeroOverlap);

        data.meta.includingClosest = twins.length > 0 && display.some(function (m) { return m.syncScore < 0.50; });
        data.meta.includesLowOverlap = display.some(function (m) { return m.shared && m.shared.length > 0 && m.shared.length < preferredMinOverlap; });
        data.meta.includesZeroOverlap = display.some(function (m) { return !(m.shared && m.shared.length); });

        var showingClosest = twins.length === 0;
        data.meta.showingClosest = showingClosest;
        data.twins = display.slice(0, 10);
        return data;
    }

    try {
        globalThis.DTUAfterDarkParticipantIntelScoring = {
            computeSemesterTwinData: computeSemesterTwinData,
            computeCourseProgramStatsForCodes: computeCourseProgramStatsForCodes,
            detectStudyLineSpecificCourses: detectStudyLineSpecificCourses
        };
    } catch (eExpose) { }
})();
