(function () {
    'use strict';

    var participantIntelLastCollectSig = null;
    var participantIntelLastCollectTs = 0;
    var participantIntelPageSizeAdjustTs = 0;
    var participantIntelPageSizeAdjustTimer = null;

    function getDeps() {
        return globalThis.DTUAfterDarkParticipantIntelCoreDeps || null;
    }

    function dedupeIntelCourseList(courses) {
        var deps = getDeps();
        if (!deps) return { list: [], changed: true };
        if (!Array.isArray(courses)) return { list: [], changed: !!courses };

        var changed = false;
        var list = [];
        var byKey = Object.create(null);

        for (var i = 0; i < courses.length; i++) {
            var c = courses[i];
            var code = deps.normalizeIntelCourseCode(c && c.code);
            if (!code) {
                changed = true;
                continue;
            }
            var semester = deps.normalizeIntelCourseSemester(c && c.semester);
            if (!semester) {
                changed = true;
                continue;
            }

            var key = code + '|' + semester;
            if (byKey[key] === undefined) {
                var entry = { code: code, semester: semester };
                if (c && c.source) entry.source = String(c.source);
                if (c && c.archived) entry.archived = true;
                byKey[key] = list.length;
                list.push(entry);

                if (!c || c.code !== code || c.semester !== semester) changed = true;
                continue;
            }

            changed = true;
            var idx = byKey[key];
            var existing = list[idx];
            if (existing.archived && !(c && c.archived)) delete existing.archived;

            if (!existing.source && c && c.source) {
                existing.source = String(c.source);
            } else if (
                existing.source === 'frontpage'
                && c && c.source
                && String(c.source) !== 'frontpage'
            ) {
                existing.source = String(c.source);
            }
        }

        return { list: list, changed: changed };
    }

    function dedupeParticipantIntelData(data) {
        var deps = getDeps();
        if (!deps || !data || typeof data !== 'object') return false;
        var changed = false;

        if (!data.students || typeof data.students !== 'object') {
            data.students = {};
            changed = true;
        }

        var keys = Object.keys(data.students);
        for (var i = 0; i < keys.length; i++) {
            var s = data.students[keys[i]];
            if (!s || typeof s !== 'object') {
                data.students[keys[i]] = { name: '', program: '', courses: [], lastSeen: Date.now() };
                changed = true;
                continue;
            }
            var deduped = dedupeIntelCourseList(s.courses || []);
            var filteredCourses = deduped.list.filter(function (c) {
                var code = deps.normalizeIntelCourseCode(c && c.code);
                var nm = '';
                try { nm = data.courseNames ? (data.courseNames[code] || '') : ''; } catch (eN0) { nm = ''; }
                return deps.isCampusnetLikelyAcademicCourse(code, nm, { title: nm });
            });
            if (filteredCourses.length !== deduped.list.length) changed = true;
            if (deduped.changed || !Array.isArray(s.courses) || filteredCourses.length !== deduped.list.length) {
                s.courses = filteredCourses;
                changed = true;
            }
        }

        if (data.self && typeof data.self === 'object') {
            var selfDeduped = dedupeIntelCourseList(data.self.courses || []);
            var filteredSelfCourses = selfDeduped.list.filter(function (c) {
                var code = deps.normalizeIntelCourseCode(c && c.code);
                var nm = '';
                try { nm = data.courseNames ? (data.courseNames[code] || '') : ''; } catch (eN1) { nm = ''; }
                return deps.isCampusnetLikelyAcademicCourse(code, nm, { title: nm });
            });
            if (filteredSelfCourses.length !== selfDeduped.list.length) changed = true;
            if (selfDeduped.changed || !Array.isArray(data.self.courses) || filteredSelfCourses.length !== selfDeduped.list.length) {
                data.self.courses = filteredSelfCourses;
                changed = true;
            }
        }

        return changed;
    }

    function semesterSortValue(semester) {
        var deps = getDeps();
        if (!deps) return 0;
        var sem = deps.normalizeIntelCourseSemester(semester);
        var m = sem.match(/^([FE])(20\d{2})$/);
        if (!m) return 0;
        var season = m[1];
        var year = parseInt(m[2], 10);
        if (isNaN(year)) return 0;
        return (year * 10) + (season === 'E' ? 2 : 1);
    }

    function collapseCourseEntriesByCode(courses) {
        var deps = getDeps();
        if (!deps) return [];
        var normalized = dedupeIntelCourseList(courses || []).list;
        if (!normalized.length) return [];

        var out = [];
        var byCode = Object.create(null);
        for (var i = 0; i < normalized.length; i++) {
            var c = normalized[i];
            var code = deps.normalizeIntelCourseCode(c && c.code);
            if (!code) continue;

            if (byCode[code] === undefined) {
                byCode[code] = out.length;
                out.push(c);
                continue;
            }

            var idx = byCode[code];
            var current = out[idx];
            var curScore = semesterSortValue(current.semester);
            var nextScore = semesterSortValue(c.semester);
            var shouldReplace = false;
            if (nextScore > curScore) shouldReplace = true;
            else if (nextScore === curScore && current.archived && !c.archived) shouldReplace = true;

            if (shouldReplace) out[idx] = c;
        }

        return out;
    }

    function saveParticipantIntel(data) {
        var deps = getDeps();
        if (!deps) return;
        deps.storageLocalSet({ [deps.participantIntelStorageKey]: data });
    }

    function loadParticipantIntel(cb) {
        var deps = getDeps();
        if (!deps) {
            if (cb) cb({ self: null, students: {}, retention: {}, courseNames: {}, backfill: { scanned: {}, autoWeekly: false, lastRunTs: 0 } });
            return;
        }
        deps.storageLocalGet({ [deps.participantIntelStorageKey]: null }, function (result) {
            var data = result[deps.participantIntelStorageKey];
            if (!data || typeof data !== 'object') {
                data = { self: null, students: {}, retention: {}, courseNames: {}, backfill: { scanned: {}, autoWeekly: false, lastRunTs: 0 } };
            }
            if (!data.students) data.students = {};
            if (!data.retention) data.retention = {};
            if (!data.courseNames) data.courseNames = {};
            if (!data.backfill || typeof data.backfill !== 'object') data.backfill = { scanned: {}, autoWeekly: false, lastRunTs: 0 };
            if (!data.backfill.scanned || typeof data.backfill.scanned !== 'object') data.backfill.scanned = {};
            if (typeof data.backfill.autoWeekly !== 'boolean') data.backfill.autoWeekly = false;
            if (typeof data.backfill.lastRunTs !== 'number') data.backfill.lastRunTs = 0;
            if (dedupeParticipantIntelData(data)) saveParticipantIntel(data);
            cb(data);
        });
    }

    (function clearCorruptedIntel() {
        var deps = getDeps();
        if (!deps) return;
        deps.storageLocalGet({ _intelSemFixApplied3: false }, function (r) {
            if (r._intelSemFixApplied3) return;
            deps.storageLocalSet({ [deps.participantIntelStorageKey]: null, _intelSemFixApplied3: true });
            console.log('[DTU After Dark] Cleared participant intel (archived-flag fix). Re-scan to rebuild.');
        });
    })();

    (function resetParticipantIntelForRescan() {
        var deps = getDeps();
        if (!deps) return;
        deps.storageLocalGet({ _intelRescanResetApplied1: false }, function (r) {
            if (r._intelRescanResetApplied1) return;
            deps.storageLocalSet({ [deps.participantIntelStorageKey]: null, _intelRescanResetApplied1: true });
            console.log('[DTU After Dark] Reset participant intel for clean rescan.');
        });
    })();

    function loadSemesterTwinPrefs(cb) {
        var deps = getDeps();
        if (!deps) {
            if (cb) cb({ hideOwnProgram: false, rowLimit: 5, scope: 'semester' });
            return;
        }
        deps.storageLocalGet({ [deps.semesterTwinPrefsKey]: null }, function (result) {
            var raw = result[deps.semesterTwinPrefsKey];
            if (!raw || typeof raw !== 'object') raw = {};
            var limit = parseInt(raw.rowLimit, 10);
            if (limit !== 5 && limit !== 10) limit = 5;
            var scope = (raw.scope === 'all') ? 'all' : 'semester';
            cb({
                hideOwnProgram: raw.hideOwnProgram === true,
                rowLimit: limit,
                scope: scope
            });
        });
    }

    function saveSemesterTwinPrefs(prefs) {
        var deps = getDeps();
        if (!deps) return;
        deps.storageLocalSet({ [deps.semesterTwinPrefsKey]: prefs || {} });
    }

    function updateSemesterTwinPrefs(patch, cb) {
        loadSemesterTwinPrefs(function (prev) {
            var next = Object.assign({}, prev || {}, patch || {});
            next.hideOwnProgram = next.hideOwnProgram === true;
            var limit = parseInt(next.rowLimit, 10);
            if (limit !== 5 && limit !== 10) limit = 5;
            next.rowLimit = limit;
            next.scope = (next.scope === 'all') ? 'all' : 'semester';
            saveSemesterTwinPrefs(next);
            if (cb) cb(next);
        });
    }

    function ensureCampusnetParticipantsPageSizeMax() {
        var deps = getDeps();
        if (!deps || !deps.isCampusnetParticipantPage()) return false;
        var ss = null;
        try { ss = sessionStorage; } catch (e) { ss = null; }
        if (!ss) return false;

        var key = 'dtuAfterDarkParticipantsPageSizeMaxAttempt:' + window.location.pathname;
        var now = Date.now();
        var lastAttempt = parseInt(ss.getItem(key) || '0', 10);
        if (lastAttempt && (now - lastAttempt) < 8000) return false;

        var selects = document.querySelectorAll('select');
        for (var i = 0; i < selects.length; i++) {
            var sel = selects[i];
            if (!sel || !sel.options || sel.options.length < 4) continue;

            var nums = [];
            for (var o = 0; o < sel.options.length; o++) {
                var raw = sel.options[o].value || sel.options[o].textContent;
                var n = parseInt(raw, 10);
                if (!isNaN(n)) nums.push(n);
            }
            if (!nums.length) continue;

            var max = Math.max.apply(Math, nums);
            if (max < 500) continue;
            if (nums.indexOf(1500) === -1) continue;

            var curRaw = sel.value || (sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : '');
            var cur = parseInt(curRaw, 10);
            if (!isNaN(cur) && cur >= max) return false;

            try { ss.setItem(key, String(now)); } catch (e4) { }
            participantIntelPageSizeAdjustTs = now;

            for (var oo = 0; oo < sel.options.length; oo++) {
                var opt = sel.options[oo];
                var optNum = parseInt(opt.value || opt.textContent, 10);
                if (optNum === max) {
                    sel.value = opt.value;
                    opt.selected = true;
                    break;
                }
            }

            try {
                sel.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (e) {
                try {
                    var evt = document.createEvent('HTMLEvents');
                    evt.initEvent('change', true, false);
                    sel.dispatchEvent(evt);
                } catch (e2) { }
            }

            if (!participantIntelPageSizeAdjustTimer) {
                participantIntelPageSizeAdjustTimer = setTimeout(function () {
                    participantIntelPageSizeAdjustTimer = null;
                    try { deps.insertParticipantIntelligence(); } catch (e3) { }
                }, 1600);
            }

            return true;
        }

        return false;
    }

    function parseParticipantList() {
        var deps = getDeps();
        var participants = [];
        if (!deps) return participants;
        var items = deps.getCampusnetUsersParticipantElements();
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var entry = {};

            var nameEl = item.querySelector('.ui-participant-fullname a');
            if (nameEl) {
                entry.name = deps.normalizeWhitespace(nameEl.textContent);
                var href = nameEl.getAttribute('href') || '';
                var idMatch = href.match(/id=(\d+)/i);
                if (idMatch) entry.userId = idMatch[1];
            }

            var infoEl = item.querySelector('.ui-participant-additional.user-information');
            if (infoEl) {
                var sMatch = infoEl.textContent.match(/\b(s\d{6})\b/i);
                if (sMatch) entry.sNumber = sMatch[1].toLowerCase();
            }

            var idx = null;
            var arrow = item.querySelector('.ui-participants-arrow');
            if (arrow) {
                var arrowId = arrow.getAttribute('id') || '';
                var idMatch2 = arrowId.match(/participantarrow(\d+)/i);
                if (idMatch2) idx = parseInt(idMatch2[1], 10);
                if (idx === null || isNaN(idx)) {
                    var onclick = arrow.getAttribute('onclick') || '';
                    var onMatch = onclick.match(/\((\d+)\)/);
                    if (onMatch) idx = parseInt(onMatch[1], 10);
                }
            }
            if (idx === null || isNaN(idx)) idx = i;

            var infoBox = document.getElementById('participantinformation' + idx);
            if (!infoBox) infoBox = item.nextElementSibling;
            if (!infoBox) {
                var sib = item.nextElementSibling;
                while (sib && !sib.classList.contains('ui-participant')) {
                    if (sib.classList.contains('ui-participant-informationbox')) { infoBox = sib; break; }
                    sib = sib.nextElementSibling;
                }
            }
            if (infoBox) {
                var headers = infoBox.querySelectorAll('.info-header span');
                for (var h = 0; h < headers.length; h++) {
                    if (/education|uddannelse/i.test(headers[h].textContent)) {
                        var infoDiv = headers[h].closest('.ui-participant-infobox');
                        if (infoDiv) {
                            var lists = infoDiv.querySelectorAll('.ui-participants-infolist p');
                            if (lists.length) {
                                entry.program = deps.normalizeProgramLabel(lists[0].textContent);
                            } else {
                                var children = infoDiv.children;
                                for (var c = 0; c < children.length; c++) {
                                    if (!children[c].classList.contains('info-header')) {
                                        var txt = deps.normalizeProgramLabel(children[c].textContent);
                                        if (txt) { entry.program = txt; break; }
                                    }
                                }
                            }
                        }
                        break;
                    }
                }
            }

            if (entry.sNumber) participants.push(entry);
        }
        return participants;
    }

    function detectAndStoreSelf(intel, participants, courseCode, semester) {
        function normName(s) {
            return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
        }

        if (intel.self && intel.self.sNumber) {
            for (var u = 0; u < participants.length; u++) {
                if (participants[u].sNumber === intel.self.sNumber) {
                    if (participants[u].name) intel.self.name = participants[u].name;
                    if (participants[u].program) intel.self.program = participants[u].program;
                    break;
                }
            }

            if (courseCode) {
                if (!intel.self.courses) intel.self.courses = [];
                var existing = null;
                for (var ex = 0; ex < intel.self.courses.length; ex++) {
                    var ec = intel.self.courses[ex];
                    if (ec && ec.code === courseCode && ec.semester === semester) {
                        existing = ec;
                        break;
                    }
                }
                if (!existing) {
                    intel.self.courses.push({ code: courseCode, semester: semester, source: 'participant' });
                } else {
                    existing.source = 'participant';
                    if (existing.archived) delete existing.archived;
                }
            }
            return;
        }

        var myUserId = null;
        try {
            var profileLinks = document.querySelectorAll('a[href*="showperson.aspx"]');
            for (var p = 0; p < profileLinks.length; p++) {
                var a = profileLinks[p];
                if (!a || !a.getAttribute) continue;
                if (a.closest && (a.closest('.ui-participant') || a.closest('.ui-participant-informationbox') || a.closest('[data-dtu-ext]'))) continue;
                var href = a.getAttribute('href') || '';
                var idMatch = href.match(/id=(\d+)/i);
                if (idMatch) { myUserId = idMatch[1]; break; }
            }
        } catch (e0) { }

        if (!myUserId) {
            try {
                var imgs = document.querySelectorAll('img[src*="/cnnet/userpicture/"]');
                for (var im = 0; im < imgs.length; im++) {
                    var img = imgs[im];
                    if (!img || !img.getAttribute) continue;
                    if (img.closest && (img.closest('.ui-participant') || img.closest('.ui-participant-informationbox') || img.closest('[data-dtu-ext]'))) continue;
                    var src = img.getAttribute('src') || '';
                    var mImg = src.match(/\/cnnet\/userpicture\/(\d+)/i);
                    if (mImg) { myUserId = mImg[1]; break; }
                }
            } catch (e0b) { }
        }

        if (myUserId) {
            for (var i0 = 0; i0 < participants.length; i0++) {
                if (participants[i0].userId === myUserId && participants[i0].sNumber) {
                    var courses0 = [];
                    if (courseCode) courses0.push({ code: courseCode, semester: semester, source: 'participant' });
                    intel.self = {
                        sNumber: participants[i0].sNumber,
                        name: participants[i0].name || '',
                        program: participants[i0].program || '',
                        courses: courses0
                    };
                    return;
                }
            }
        }

        var deps = getDeps();
        var headerSNumber = null;
        try {
            var headerCandidates = [];
            var c1 = document.querySelector('.user-name, .header__user-name, [data-user-name], .masthead .profile-name');
            if (c1) headerCandidates.push(c1);
            var c2 = document.querySelector('header');
            if (c2) headerCandidates.push(c2);
            var c3 = document.querySelector('.header, #header, .masthead');
            if (c3) headerCandidates.push(c3);
            for (var hc = 0; hc < headerCandidates.length; hc++) {
                var el = headerCandidates[hc];
                if (!el) continue;
                if (el.closest && (el.closest('.ui-participants-list') || el.closest('.ui-participant') || el.closest('.ui-participant-informationbox'))) continue;
                var mS = (el.textContent || '').match(/\b(s\d{6})\b/i);
                if (mS) { headerSNumber = mS[1].toLowerCase(); break; }
            }
        } catch (eHdr) { }

        if (headerSNumber) {
            for (var hs = 0; hs < participants.length; hs++) {
                if (participants[hs].sNumber === headerSNumber) {
                    var coursesH = [];
                    if (courseCode) coursesH.push({ code: courseCode, semester: semester, source: 'participant' });
                    intel.self = {
                        sNumber: headerSNumber,
                        name: participants[hs].name || '',
                        program: participants[hs].program || '',
                        courses: coursesH
                    };
                    return;
                }
            }
            var coursesH2 = [];
            if (courseCode) coursesH2.push({ code: courseCode, semester: semester, source: 'participant' });
            intel.self = { sNumber: headerSNumber, name: '', program: '', courses: coursesH2 };
            return;
        }

        var headerNameEl = document.querySelector('.user-name, .header__user-name, [data-user-name], .masthead .profile-name');
        if (!headerNameEl) {
            var profileLink = null;
            try {
                var links = document.querySelectorAll('a[href*="showperson.aspx"]');
                for (var l = 0; l < links.length; l++) {
                    if (links[l].closest && (links[l].closest('.ui-participant') || links[l].closest('.ui-participant-informationbox'))) continue;
                    profileLink = links[l];
                    break;
                }
            } catch (e1) { }
            if (profileLink) {
                var closest = profileLink.closest('.nav__dropdown--group, .header, header');
                if (closest) headerNameEl = profileLink;
            }
        }
        if (!headerNameEl) return;
        var headerName = normName(headerNameEl.textContent);
        if (!headerName) return;

        for (var i = 0; i < participants.length; i++) {
            if (participants[i].name && normName(participants[i].name) === headerName && participants[i].sNumber) {
                var courses = [];
                if (courseCode) courses.push({ code: courseCode, semester: semester, source: 'participant' });
                intel.self = {
                    sNumber: participants[i].sNumber,
                    name: participants[i].name,
                    program: participants[i].program || '',
                    courses: courses
                };
                return;
            }
        }
    }

    function collectParticipantData() {
        var deps = getDeps();
        if (!deps || !deps.isCampusnetParticipantPage()) return;
        var courseCode = deps.normalizeIntelCourseCode(deps.getCampusnetCourseCodeFromPage());
        var semester = deps.normalizeIntelCourseSemester(deps.getCampusnetSemesterFromPage());
        var courseName = deps.getCampusnetCourseNameFromPage(courseCode);
        var pageTitle = '';
        try { pageTitle = document.title || ''; } catch (e0) { pageTitle = ''; }
        if (!deps.isCampusnetLikelyAcademicCourse(courseCode, courseName, { title: pageTitle })) return;

        var participants = parseParticipantList();
        if (!participants.length) return;

        var now = Date.now();
        var sig = (courseCode || 'unknown') + '|' + semester + '|' + participants.length
            + '|' + (participants[0] ? participants[0].sNumber : '')
            + '|' + (participants[participants.length - 1] ? participants[participants.length - 1].sNumber : '');
        if (participantIntelLastCollectSig === sig && (now - participantIntelLastCollectTs) < 30000) return;
        participantIntelLastCollectSig = sig;
        participantIntelLastCollectTs = now;

        loadParticipantIntel(function (intel) {
            if (courseCode && courseName) {
                var existingName = intel.courseNames ? intel.courseNames[courseCode] : null;
                if (!existingName || existingName.length < courseName.length) {
                    intel.courseNames[courseCode] = courseName;
                }
            }

            for (var i = 0; i < participants.length; i++) {
                var p = participants[i];
                if (!p.sNumber) continue;

                if (!intel.students[p.sNumber]) {
                    intel.students[p.sNumber] = { name: p.name || '', program: p.program || '', courses: [], lastSeen: now };
                }
                var student = intel.students[p.sNumber];
                student.name = p.name || student.name;
                if (p.program) student.program = p.program;
                student.lastSeen = now;
                if (!student.courses) student.courses = [];

                if (courseCode) {
                    var alreadyHas = student.courses.some(function (c) { return c.code === courseCode && c.semester === semester; });
                    if (!alreadyHas) student.courses.push({ code: courseCode, semester: semester });
                }
            }

            var sNumbers = Object.keys(intel.students);
            if (sNumbers.length > deps.participantIntelMaxStudents) {
                sNumbers.sort(function (a, b) { return intel.students[a].lastSeen - intel.students[b].lastSeen; });
                var toRemove = sNumbers.length - deps.participantIntelMaxStudents;
                for (var r = 0; r < toRemove; r++) delete intel.students[sNumbers[r]];
            }

            detectAndStoreSelf(intel, participants, courseCode, semester);
            saveParticipantIntel(intel);
        });
    }

    function getParticipantIntelPageSizeAdjustTs() {
        return participantIntelPageSizeAdjustTs;
    }

    function resetParticipantIntelPageSizeAdjustTs() {
        participantIntelPageSizeAdjustTs = 0;
    }

    globalThis.DTUAfterDarkParticipantIntelCore = {
        dedupeIntelCourseList: dedupeIntelCourseList,
        collapseCourseEntriesByCode: collapseCourseEntriesByCode,
        loadParticipantIntel: loadParticipantIntel,
        saveParticipantIntel: saveParticipantIntel,
        loadSemesterTwinPrefs: loadSemesterTwinPrefs,
        saveSemesterTwinPrefs: saveSemesterTwinPrefs,
        updateSemesterTwinPrefs: updateSemesterTwinPrefs,
        ensureCampusnetParticipantsPageSizeMax: ensureCampusnetParticipantsPageSizeMax,
        parseParticipantList: parseParticipantList,
        collectParticipantData: collectParticipantData,
        detectAndStoreSelf: detectAndStoreSelf,
        getParticipantIntelPageSizeAdjustTs: getParticipantIntelPageSizeAdjustTs,
        resetParticipantIntelPageSizeAdjustTs: resetParticipantIntelPageSizeAdjustTs
    };
})();
