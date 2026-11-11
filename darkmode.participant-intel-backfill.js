(function () {
    'use strict';

    var campusnetArchiveBackfillRunning = false;
    var campusnetArchiveBackfillAbort = false;
    var campusnetArchiveBackfillProgress = null;
    var archiveBackfillInsertPending = false;

    function getDeps() {
        return globalThis.DTUAfterDarkParticipantIntelBackfillDeps || null;
    }

    function getIsDark() {
        var deps = getDeps();
        if (!deps || typeof deps.isDarkMode !== 'function') return false;
        return !!deps.isDarkMode();
    }

    // Fetched archive pages go through the same parser as the live page, so a
    // "Users (1 234)" count and students listed only by e-mail are read here too.
    function parseParticipantListFromDoc(doc) {
        var deps = getDeps();
        return (deps && doc) ? deps.parseParticipantList(doc) : [];
    }

    function parseCampusnetArchivedElementsFromDoc(doc) {
        var deps = getDeps();
        var out = [];
        if (!deps || !doc || !doc.querySelectorAll) return out;
        doc.querySelectorAll('article.archived-element[data-id]').forEach(function (article) {
            if (!article) return;
            var id = (article.getAttribute('data-id') || '').trim();
            var link = article.querySelector('.archived-element__title a[href*="/cnnet/element/"]');
            if (!link) return;

            var href = link.getAttribute('href') || '';
            var m = href.match(/\/cnnet\/element\/(\d+)\//i);
            if (m) id = m[1];
            if (!id) return;

            var title = deps.normalizeWhitespace(link.textContent);
            var codeHint = null;
            var codeMatch = title.match(/\b(\d{5}|KU\d{3})\b/i);
            if (codeMatch) codeHint = (codeMatch[1] || '').toUpperCase();
            var semesterHint = deps.parseDTUSemesterFromText(title);
            if (codeHint && !deps.isCampusnetLikelyAcademicCourse(codeHint, title, { title: title })) return;

            out.push({
                elementId: id,
                title: title,
                href: href,
                codeHint: codeHint,
                semesterHint: semesterHint
            });
        });
        return out;
    }

    function parseCampusnetArchivedElements() {
        var deps = getDeps();
        if (!deps || !deps.isCampusnetGroupArchivePage()) return [];
        return parseCampusnetArchivedElementsFromDoc(document);
    }

    function fetchCampusnetDoc(url) {
        var absUrl = url;
        try {
            absUrl = new URL(url, window.location.origin).toString();
        } catch (e0) {
            try {
                absUrl = 'https://campusnet.dtu.dk' + String(url || '');
            } catch (e1) {
                absUrl = String(url || '');
            }
        }

        return fetch(absUrl, { credentials: 'include', cache: 'no-store' }).then(function (res) {
            if (!res || !res.ok) throw new Error('http_' + (res ? res.status : '0'));
            return res.text();
        }).then(function (html) {
            var doc = null;
            try {
                doc = new DOMParser().parseFromString(html, 'text/html');
            } catch (e) {
                doc = null;
            }
            if (!doc || !doc.querySelectorAll) throw new Error('parse_empty');
            return doc;
        });
    }

    function fetchAndParseArchivedElements() {
        return fetchCampusnetDoc('/cnnet/grouparchive/default').then(function (doc) {
            return parseCampusnetArchivedElementsFromDoc(doc);
        });
    }

    function formatShortDateTime(ts) {
        if (!ts || typeof ts !== 'number') return 'never';
        try {
            var d = new Date(ts);
            var yyyy = d.getFullYear();
            var mm = String(d.getMonth() + 1).padStart(2, '0');
            var dd = String(d.getDate()).padStart(2, '0');
            var hh = String(d.getHours()).padStart(2, '0');
            var mi = String(d.getMinutes()).padStart(2, '0');
            return yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi;
        } catch (e) { }
        return 'never';
    }

    function fetchBestCampusnetParticipantsDoc(elementId) {
        var base = '/cnnet/element/' + elementId + '/participants'
            + '?groupType=Rights&query=&sortField=LastName&page=0&showClosed=True&displayType=list';
        var candidates = [
            base + '&itemsPerPage=1500',
            base + '&itemsperpage=1500',
            base + '&itemsPerPage=1000',
            base + '&itemsPerPage=500',
            base
        ];

        var best = null;
        var lastErr = '';
        var chain = Promise.resolve();
        candidates.forEach(function (url) {
            chain = chain.then(function () {
                if (campusnetArchiveBackfillAbort) return null;
                if (best && best.usersCount && best.loaded >= best.usersCount) return null;
                return fetchCampusnetDoc(url).then(function (doc) {
                    var loaded = getDeps().getCampusnetUsersParticipantElements(doc).length;
                    var usersCount = getDeps().getCampusnetUsersCountFromPage(doc);
                    var rec = { url: url, doc: doc, loaded: loaded, usersCount: usersCount };

                    if (!best) best = rec;
                    else if (rec.loaded > best.loaded) best = rec;
                    else if (rec.loaded === best.loaded && rec.usersCount && best.usersCount
                        && rec.usersCount === rec.loaded && best.usersCount !== best.loaded) {
                        best = rec;
                    }
                    return null;
                }).catch(function (e) {
                    try { lastErr = (e && e.message) ? String(e.message) : 'fetch_error'; } catch (e2) { lastErr = 'fetch_error'; }
                    return null;
                });
            });
        });

        return chain.then(function () {
            if (best) return best;
            return { url: candidates[0] || '', doc: null, loaded: 0, usersCount: null, err: lastErr || 'fetch_failed' };
        });
    }

    function upsertParticipantsIntoIntel(intel, participants, courseCode, semester, courseName, opts) {
        var deps = getDeps();
        if (!deps) return;
        courseCode = deps.normalizeIntelCourseCode(courseCode);
        semester = deps.normalizeIntelCourseSemester(semester);
        var sourceTitle = (opts && opts.title) ? String(opts.title) : '';
        if (!deps.isCampusnetLikelyAcademicCourse(courseCode, courseName, { title: sourceTitle })) return;
        var isArchived = !!(opts && opts.archived);
        var now = Date.now();
        if (courseCode && courseName) {
            var existingName = intel.courseNames ? intel.courseNames[courseCode] : null;
            if (!existingName || existingName.length < courseName.length) {
                intel.courseNames[courseCode] = courseName;
            }
        }

        for (var i = 0; i < participants.length; i++) {
            var p = participants[i];
            if (!p || !p.sNumber) continue;

            if (!intel.students[p.sNumber]) {
                intel.students[p.sNumber] = { name: p.name || '', program: p.program || '', courses: [], lastSeen: now };
            }
            var student = intel.students[p.sNumber];
            student.name = p.name || student.name;
            if (p.program) student.program = p.program;
            student.lastSeen = now;
            if (!student.courses) student.courses = [];

            if (courseCode && semester) {
                var alreadyHas = student.courses.some(function (c) { return c.code === courseCode && c.semester === semester; });
                if (!alreadyHas) {
                    var entry = { code: courseCode, semester: semester };
                    if (isArchived) entry.archived = true;
                    student.courses.push(entry);
                }
            }

            if (intel.self && intel.self.sNumber && p.sNumber === intel.self.sNumber) {
                if (p.name) intel.self.name = p.name;
                if (p.program) intel.self.program = p.program;
                if (!intel.self.courses) intel.self.courses = [];
                if (courseCode && semester) {
                    var selfHas = intel.self.courses.some(function (c) { return c.code === courseCode && c.semester === semester; });
                    if (!selfHas) {
                        var selfEntry = { code: courseCode, semester: semester };
                        if (isArchived) selfEntry.archived = true;
                        intel.self.courses.push(selfEntry);
                    }
                }
            }
        }

        var sNumbers = Object.keys(intel.students);
        if (sNumbers.length > deps.participantIntelMaxStudents) {
            sNumbers.sort(function (a, b) { return intel.students[a].lastSeen - intel.students[b].lastSeen; });
            var toRemove = sNumbers.length - deps.participantIntelMaxStudents;
            for (var r = 0; r < toRemove; r++) delete intel.students[sNumbers[r]];
        }
    }

    function updateCampusnetArchiveBackfillWidgetStatus(text) {
        var widget = document.querySelector('[data-dtu-archive-backfill]');
        if (!widget) return;
        var statusEl = widget.querySelector('[data-dtu-archive-backfill-status]');
        if (!statusEl) return;
        if (statusEl.textContent === text) return;
        statusEl.textContent = text;
    }

    function stopCampusnetArchiveBackfill() {
        campusnetArchiveBackfillAbort = true;
        updateCampusnetArchiveBackfillWidgetStatus('Stopping...');
    }

    function runCampusnetArchiveBackfill(queue, intel) {
        var deps = getDeps();
        if (!deps || campusnetArchiveBackfillRunning
            || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey)
            || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelSharedHistoryKey)) return;
        if (!queue || !queue.length) {
            updateCampusnetArchiveBackfillWidgetStatus('Nothing new to scan.');
            return;
        }

        campusnetArchiveBackfillRunning = true;
        campusnetArchiveBackfillAbort = false;
        campusnetArchiveBackfillProgress = { total: queue.length, done: 0, ok: 0, failed: 0, lastTitle: '', lastError: '' };

        try {
            if (intel && intel.self && intel.self.sNumber) {
                if (!intel.self.courses) intel.self.courses = [];
                var seedList = queue.slice(0);
                for (var si = 0; si < seedList.length; si++) {
                    var it = seedList[si];
                    if (!it || !it.codeHint) continue;
                    if (!deps.isCampusnetLikelyAcademicCourse(it.codeHint, it.title, { title: it.title })) continue;
                    var sem = it.semesterHint;
                    if (!sem) continue;
                    var has = intel.self.courses.some(function (c) { return c && c.code === it.codeHint && c.semester === sem; });
                    if (!has) intel.self.courses.push({ code: it.codeHint, semester: sem, archived: true });
                }
                try { deps.saveParticipantIntel(intel); } catch (eSeedSave) { }
            }
        } catch (eSeed) { }

        function afterOne() {
            campusnetArchiveBackfillProgress.done++;
            setTimeout(step, 280);
        }

        function step() {
            if (window.location.hostname !== 'campusnet.dtu.dk'
                || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey)
                || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelSharedHistoryKey)) {
                campusnetArchiveBackfillAbort = true;
            }

            if (campusnetArchiveBackfillAbort) {
                campusnetArchiveBackfillRunning = false;
                campusnetArchiveBackfillAbort = false;
                try { deps.saveParticipantIntel(intel); } catch (e0) { }
                updateCampusnetArchiveBackfillWidgetStatus('Scan stopped. (' + campusnetArchiveBackfillProgress.done + '/' + campusnetArchiveBackfillProgress.total + ')');
                campusnetArchiveBackfillProgress = null;
                return;
            }

            var item = queue.shift();
            if (!item) {
                campusnetArchiveBackfillRunning = false;
                intel.backfill.lastRunTs = Date.now();
                try { deps.saveParticipantIntel(intel); } catch (e1) { }
                var lastErr = campusnetArchiveBackfillProgress.lastError ? (' Last error: ' + campusnetArchiveBackfillProgress.lastError) : '';
                updateCampusnetArchiveBackfillWidgetStatus('Scan finished. OK: ' + campusnetArchiveBackfillProgress.ok + ', failed: ' + campusnetArchiveBackfillProgress.failed + '.' + lastErr);
                campusnetArchiveBackfillProgress = null;
                return;
            }

            campusnetArchiveBackfillProgress.lastTitle = item.title || ('element ' + item.elementId);
            updateCampusnetArchiveBackfillWidgetStatus(
                'Scanning: ' + campusnetArchiveBackfillProgress.done + '/' + campusnetArchiveBackfillProgress.total
                + ' (OK ' + campusnetArchiveBackfillProgress.ok + ', failed ' + campusnetArchiveBackfillProgress.failed + ')'
                + ' | Now: ' + campusnetArchiveBackfillProgress.lastTitle
            );

            fetchBestCampusnetParticipantsDoc(item.elementId).then(function (best) {
                if (campusnetArchiveBackfillAbort || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey)
                    || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelSharedHistoryKey)) {
                    campusnetArchiveBackfillAbort = true;
                    afterOne();
                    return;
                }
                if (!best || !best.doc) throw new Error((best && best.err) ? best.err : 'fetch_failed');

                var doc = best.doc;
                var courseCode = deps.getCampusnetCourseCodeFromPage(doc) || item.codeHint || null;
                var semester = deps.getCampusnetExplicitSemesterFromPage(doc) || item.semesterHint || null;
                var courseName = deps.getCampusnetCourseNameFromPage(courseCode, doc);

                var participants = parseParticipantListFromDoc(doc);
                if (!participants.length) throw new Error('no_participants');

                upsertParticipantsIntoIntel(intel, participants, courseCode, semester, courseName, { archived: true, title: (item && item.title) ? item.title : '' });
                intel.backfill.scanned[item.elementId] = Date.now();
                campusnetArchiveBackfillProgress.ok++;

                try { deps.saveParticipantIntel(intel); } catch (e2) { }
                afterOne();
            }).catch(function (e) {
                campusnetArchiveBackfillProgress.failed++;
                try { campusnetArchiveBackfillProgress.lastError = (e && e.message) ? String(e.message) : 'scan_failed'; } catch (e2) { campusnetArchiveBackfillProgress.lastError = 'scan_failed'; }
                afterOne();
            });
        }

        step();
    }

    function insertCampusnetArchiveBackfillWidget() {
        var deps = getDeps();
        var existing = document.querySelector('[data-dtu-archive-backfill]');
        if (!deps || !deps.isCampusnetGroupArchivePage()) {
            if (existing) existing.remove();
            return;
        }

        var sharedHistoryEnabled = deps.isFeatureFlagEnabled(deps.featureParticipantIntelSharedHistoryKey);
        if (!deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey) || !sharedHistoryEnabled) {
            if (existing) existing.remove();
            return;
        }

        if (!existing && archiveBackfillInsertPending) return;

        var anchor = document.querySelector('.archived-elements__content') || document.querySelector('main') || document.body;
        if (!anchor) return;

        var isDark = getIsDark();
        var items = parseCampusnetArchivedElements();
        var courseItems = items.filter(function (it) {
            return !!it.codeHint && deps.isCampusnetLikelyAcademicCourse(it.codeHint, it.title, { title: it.title });
        });

        function isArchiveHistoryEnabled() {
            return deps.isCampusnetGroupArchivePage()
                && deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey)
                && deps.isFeatureFlagEnabled(deps.featureParticipantIntelSharedHistoryKey);
        }

        if (!existing) archiveBackfillInsertPending = true;
        deps.loadParticipantIntel(function (intel) {
            archiveBackfillInsertPending = false;
            if (!isArchiveHistoryEnabled()) return;
            existing = document.querySelector('[data-dtu-archive-backfill]');
            var scanned = intel.backfill && intel.backfill.scanned ? intel.backfill.scanned : {};
            var scannedCount = 0;
            courseItems.forEach(function (it) { if (scanned && scanned[it.elementId]) scannedCount++; });

            var seeded = 0;
            try {
                if (intel && intel.self && intel.self.sNumber) {
                    if (!intel.self.courses) intel.self.courses = [];
                    for (var si = 0; si < courseItems.length; si++) {
                        var it0 = courseItems[si];
                        if (!it0 || !it0.codeHint) continue;
                        if (!deps.isCampusnetLikelyAcademicCourse(it0.codeHint, it0.title, { title: it0.title })) continue;
                        var sem0 = it0.semesterHint;
                        if (!sem0) continue;
                        var has0 = intel.self.courses.some(function (c) { return c && c.code === it0.codeHint && c.semester === sem0; });
                        if (!has0) {
                            intel.self.courses.push({ code: it0.codeHint, semester: sem0, archived: true });
                            seeded++;
                        }
                    }
                    if (seeded) deps.saveParticipantIntel(intel);
                }
            } catch (eSeed2) { }

            var lastRun = intel.backfill ? intel.backfill.lastRunTs : 0;
            var autoWeekly = !!(intel.backfill && intel.backfill.autoWeekly);
            var due = autoWeekly && (!lastRun || (Date.now() - lastRun) > 7 * 86400000);

            var status = '';
            if (campusnetArchiveBackfillRunning && campusnetArchiveBackfillProgress) {
                var nowTitle = campusnetArchiveBackfillProgress.lastTitle ? (' Now: ' + campusnetArchiveBackfillProgress.lastTitle) : '';
                var lastErr = campusnetArchiveBackfillProgress.lastError ? (' Last error: ' + campusnetArchiveBackfillProgress.lastError) : '';
                status = 'Scanning: ' + campusnetArchiveBackfillProgress.done + '/' + campusnetArchiveBackfillProgress.total
                    + ' (OK ' + campusnetArchiveBackfillProgress.ok + ', failed ' + campusnetArchiveBackfillProgress.failed + ').' + nowTitle + lastErr;
            } else {
                status = 'Past courses: ' + courseItems.length + ' detected. Scanned: ' + scannedCount + '. Last scan: ' + formatShortDateTime(lastRun) + '.';
                if (seeded) status += ' Added ' + seeded + ' courses to your history.';
                if (due) status += ' Auto weekly scan is due.';
            }

            var sig = (isDark ? 'd' : 'l') + '|' + items.length + '|' + courseItems.length + '|' + scannedCount + '|'
                + (autoWeekly ? 'aw1' : 'aw0') + '|' + lastRun + '|' + (campusnetArchiveBackfillRunning ? 'run1' : 'run0') + '|'
                + status;

            var widget = existing;
            if (!widget) {
                widget = document.createElement('div');
                widget.setAttribute('data-dtu-archive-backfill', '1');
                deps.markExt(widget);
                widget.style.cssText = 'margin:12px 0 18px;padding:14px 16px;border-radius:12px;font-family:inherit;';

                var title = document.createElement('div');
                title.setAttribute('data-dtu-archive-backfill-title', '1');
                deps.markExt(title);
                title.textContent = 'Course History Scanner';
                title.style.cssText = 'font-weight:800;font-size:14px;margin-bottom:6px;';
                widget.appendChild(title);

                var statusEl = document.createElement('div');
                statusEl.setAttribute('data-dtu-archive-backfill-status', '1');
                deps.markExt(statusEl);
                statusEl.style.cssText = 'font-size:12px;opacity:0.85;line-height:1.35;';
                widget.appendChild(statusEl);

                var row = document.createElement('div');
                deps.markExt(row);
                row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;flex-wrap:wrap;';

                var left = document.createElement('div');
                deps.markExt(left);
                left.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;';

                var startBtn = document.createElement('button');
                startBtn.type = 'button';
                startBtn.setAttribute('data-dtu-archive-backfill-start', '1');
                deps.markExt(startBtn);
                startBtn.textContent = 'Scan course history';
                startBtn.style.cssText = 'padding:8px 12px;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;border:1px solid transparent;';
                startBtn.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
                startBtn.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
                startBtn.style.setProperty('color', 'var(--dtu-ad-accent-on, #ffffff)', 'important');

                var stopBtn = document.createElement('button');
                stopBtn.type = 'button';
                stopBtn.setAttribute('data-dtu-archive-backfill-stop', '1');
                deps.markExt(stopBtn);
                stopBtn.textContent = 'Stop';
                stopBtn.style.cssText = 'padding:8px 12px;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;border:1px solid transparent;';

                left.appendChild(startBtn);
                left.appendChild(stopBtn);
                row.appendChild(left);

                var autoLabel = document.createElement('label');
                autoLabel.setAttribute('data-dtu-archive-backfill-auto', '1');
                deps.markExt(autoLabel);
                autoLabel.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;user-select:none;';

                var autoInput = document.createElement('input');
                autoInput.type = 'checkbox';
                autoInput.setAttribute('data-dtu-archive-backfill-auto-input', '1');
                deps.markExt(autoInput);
                autoInput.style.cssText = 'width:14px;height:14px;cursor:pointer;accent-color:var(--dtu-ad-accent);';

                var autoText = document.createElement('span');
                deps.markExt(autoText);
                autoText.textContent = 'Auto scan weekly';

                autoLabel.appendChild(autoInput);
                autoLabel.appendChild(autoText);
                row.appendChild(autoLabel);

                widget.appendChild(row);

                var note = document.createElement('div');
                deps.markExt(note);
                note.textContent = 'Scans your past courses to build your local shared-course history. Data is stored locally on your device.';
                note.style.cssText = 'font-size:11px;opacity:0.6;margin-top:10px;line-height:1.35;';
                widget.appendChild(note);

                startBtn.addEventListener('click', function () {
                    if (campusnetArchiveBackfillRunning) return;
                    deps.loadParticipantIntel(function (intel2) {
                        if (!isArchiveHistoryEnabled() || !widget.isConnected) return;
                        var list = parseCampusnetArchivedElements();
                        var scanned2 = (intel2.backfill && intel2.backfill.scanned) ? intel2.backfill.scanned : {};
                        var queue = list.filter(function (it) {
                            return !!it.codeHint
                                && deps.isCampusnetLikelyAcademicCourse(it.codeHint, it.title, { title: it.title })
                                && !scanned2[it.elementId];
                        });
                        if (!queue.length) {
                            updateCampusnetArchiveBackfillWidgetStatus('Nothing new to scan. (All archived courses were already scanned.)');
                            intel2.backfill.lastRunTs = Date.now();
                            deps.saveParticipantIntel(intel2);
                            return;
                        }
                        runCampusnetArchiveBackfill(queue, intel2);
                    });
                });

                stopBtn.addEventListener('click', function () {
                    if (!campusnetArchiveBackfillRunning) return;
                    stopCampusnetArchiveBackfill();
                });

                autoInput.addEventListener('change', function () {
                    deps.loadParticipantIntel(function (intel3) {
                        if (!isArchiveHistoryEnabled() || !widget.isConnected) return;
                        intel3.backfill.autoWeekly = !!autoInput.checked;
                        deps.saveParticipantIntel(intel3);
                    });
                });

                existing = widget;
            }

            widget.style.setProperty('background', isDark ? '#2d2d2d' : '#ffffff', 'important');
            widget.style.setProperty('background-color', isDark ? '#2d2d2d' : '#ffffff', 'important');
            widget.style.setProperty('border', isDark ? '1px solid #404040' : '1px solid #e0e0e0', 'important');
            widget.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');

            var titleEl = widget.querySelector('[data-dtu-archive-backfill-title]');
            if (titleEl) titleEl.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');

            var statusEl2 = widget.querySelector('[data-dtu-archive-backfill-status]');
            if (statusEl2) statusEl2.textContent = status;

            var autoInputEl = widget.querySelector('[data-dtu-archive-backfill-auto-input]');
            if (autoInputEl) autoInputEl.checked = autoWeekly;

            var stopBtnEl = widget.querySelector('[data-dtu-archive-backfill-stop]');
            if (stopBtnEl) {
                stopBtnEl.style.setProperty('background', isDark ? '#1a1a1a' : '#f5f5f5', 'important');
                stopBtnEl.style.setProperty('background-color', isDark ? '#1a1a1a' : '#f5f5f5', 'important');
                stopBtnEl.style.setProperty('color', isDark ? '#e0e0e0' : '#333', 'important');
            }

            var startBtnEl = widget.querySelector('[data-dtu-archive-backfill-start]');
            if (startBtnEl) startBtnEl.disabled = campusnetArchiveBackfillRunning;
            if (stopBtnEl) stopBtnEl.disabled = !campusnetArchiveBackfillRunning;

            if (widget.getAttribute('data-dtu-archive-backfill-sig') === sig) return;
            widget.setAttribute('data-dtu-archive-backfill-sig', sig);

            if (widget.parentNode !== anchor) {
                if (anchor.firstChild) anchor.insertBefore(widget, anchor.firstChild);
                else anchor.appendChild(widget);
            } else if (anchor.firstChild !== widget) {
                anchor.insertBefore(widget, anchor.firstChild);
            }

            if (due && !campusnetArchiveBackfillRunning && !document.hidden) {
                var queue2 = courseItems.filter(function (it) { return !scanned[it.elementId]; });
                if (queue2.length) {
                    runCampusnetArchiveBackfill(queue2, intel);
                } else {
                    intel.backfill.lastRunTs = Date.now();
                    deps.saveParticipantIntel(intel);
                }
            }
        });
    }

    globalThis.DTUAfterDarkParticipantIntelBackfill = {
        fetchAndParseArchivedElements: fetchAndParseArchivedElements,
        runCampusnetArchiveBackfill: runCampusnetArchiveBackfill,
        stopCampusnetArchiveBackfill: stopCampusnetArchiveBackfill,
        insertCampusnetArchiveBackfillWidget: insertCampusnetArchiveBackfillWidget
    };
})();
