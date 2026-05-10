(function () {
    'use strict';

    function getDeps() {
        try { return globalThis.DTUAfterDarkKurserWidgetsDeps || null; } catch (e0) { return null; }
    }

    function markExt(el) {
        var deps = getDeps();
        if (el && deps && typeof deps.markExt === 'function') deps.markExt(el);
        return el;
    }

    function sendRuntimeMessage(msg, cb) {
        var deps = getDeps();
        if (deps && typeof deps.sendRuntimeMessage === 'function') {
            deps.sendRuntimeMessage(msg, cb);
            return;
        }
        if (cb) cb(null);
    }

    function isTopWindow() {
        var deps = getDeps();
        return !!(deps && typeof deps.isTopWindow === 'function' && deps.isTopWindow());
    }

    function isDarkModeEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDarkModeEnabled === 'function' && deps.isDarkModeEnabled());
    }

    function isFeatureFlagEnabled(key) {
        var deps = getDeps();
        return !!(deps && typeof deps.isFeatureFlagEnabled === 'function' && deps.isFeatureFlagEnabled(key));
    }

    function isKurserCoursePage() {
        var deps = getDeps();
        return !!(deps && typeof deps.isKurserCoursePage === 'function' && deps.isKurserCoursePage());
    }

    function getKurserCourseCode() {
        var deps = getDeps();
        if (deps && typeof deps.getKurserCourseCode === 'function') return deps.getKurserCourseCode();
        return null;
    }

    function findKurserCourseTitleElement(courseCode) {
        var deps = getDeps();
        if (deps && typeof deps.findKurserCourseTitleElement === 'function') {
            return deps.findKurserCourseTitleElement(courseCode);
        }
        return null;
    }

    function findKurserGradeStatsInsertAnchor(titleEl) {
        var deps = getDeps();
        if (deps && typeof deps.findKurserGradeStatsInsertAnchor === 'function') {
            return deps.findKurserGradeStatsInsertAnchor(titleEl);
        }
        return null;
    }

    function getKurserInsightTheme() {
        var deps = getDeps();
        if (deps && typeof deps.getKurserInsightTheme === 'function') return deps.getKurserInsightTheme();
        return {
            containerBg: '#fff',
            containerBorder: 'rgba(0,0,0,0.1)',
            text: '#222',
            mutedText: '#666',
            subtleText: '#444',
            surfaceBg: '#fff',
            surfaceInset: 'rgba(0,0,0,0.06)',
            divider: 'rgba(0,0,0,0.10)',
            quietTrack: 'rgba(0,0,0,0.08)',
            linkColor: '#1565c0',
            accentText: '#1565c0'
        };
    }

    function getKurserInsightContainerStyle(theme) {
        var deps = getDeps();
        if (deps && typeof deps.getKurserInsightContainerStyle === 'function') {
            return deps.getKurserInsightContainerStyle(theme);
        }
        return '';
    }

    function getKurserInsightSurfaceStyle(theme, extra) {
        var deps = getDeps();
        if (deps && typeof deps.getKurserInsightSurfaceStyle === 'function') {
            return deps.getKurserInsightSurfaceStyle(theme, extra);
        }
        return extra || '';
    }

    function createMazemapSmartLink(building, room, labelText) {
        var deps = getDeps();
        if (deps && typeof deps.createMazemapSmartLink === 'function') {
            return deps.createMazemapSmartLink(building, room, labelText);
        }
        return document.createTextNode(String(labelText || room || building || ''));
    }

    function getGradeStatsFeatureKey() {
        var deps = getDeps();
        return deps && deps.featureKurserGradeStatsKey;
    }

    function getMyLineFeatureKey() {
        var deps = getDeps();
        return deps && deps.featureKurserMylineBadgesKey;
    }

    function getRoomFinderFeatureKey() {
        var deps = getDeps();
        return deps && deps.featureKurserRoomFinderKey;
    }

    function getScheduleAnnotationFeatureKey() {
        var deps = getDeps();
        return deps && deps.featureKurserScheduleAnnotationKey;
    }

    function getSmartRoomLinkerFeatureKey() {
        var deps = getDeps();
        return deps && deps.featureSmartRoomLinkerKey;
    }

    var _mylineCache = null;
    var _mylineCacheTs = 0;
    var _mylineInFlight = false;
    var MYLINE_CLIENT_TTL_MS = 1000 * 60 * 10;

    var _gradeStatsRequested = false;
    var _gradeStatsCourseCode = null;

    var _roomFinderDataCache = null;
    var _roomFinderDataLoading = false;
    var _roomFinderDataCallbacks = [];

    var SCHEDULE_SLOT_MAP = {
        '1A': 'Monday 08:00-12:00',
        '1B': 'Thursday 13:00-17:00',
        '2A': 'Monday 13:00-17:00',
        '2B': 'Thursday 08:00-12:00',
        '3A': 'Tuesday 08:00-12:00',
        '3B': 'Friday 13:00-17:00',
        '4A': 'Tuesday 13:00-17:00',
        '4B': 'Friday 08:00-12:00',
        '5A': 'Wednesday 08:00-12:00',
        '5B': 'Wednesday 13:00-17:00'
    };

    function buildGradeStatsSemesters() {
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth();
        var startYear = (month <= 5) ? (year - 1) : year;
        var semesters = [];
        for (var y = startYear; y >= startYear - 6; y--) {
            semesters.push('Winter-' + y);
            semesters.push('Summer-' + y);
        }
        return semesters;
    }

    function getCourseRailTheme() {
        var isDark = isDarkModeEnabled();
        var accent = '#1f7ae0';
        try {
            var styles = getComputedStyle(document.documentElement);
            accent = (styles.getPropertyValue('--dtu-ad-accent') || styles.getPropertyValue('--dtu-ad-accent-deep') || accent).trim() || accent;
        } catch (e0) { }
        return {
            ink: isDark ? '#f0eee8' : '#1a1a1a',
            muted: isDark ? 'rgba(240,238,232,.62)' : 'rgba(26,26,26,.55)',
            faint: isDark ? 'rgba(240,238,232,.18)' : 'rgba(26,26,26,.12)',
            hair: isDark ? 'rgba(240,238,232,.13)' : 'rgba(26,26,26,.08)',
            track: isDark ? 'rgba(240,238,232,.10)' : 'rgba(26,26,26,.06)',
            pageBg: isDark ? '#202020' : '#fff',
            accent: accent
        };
    }

    function applyCourseWidgetsGridStyle(grid) {
        grid.style.cssText = [
            'display:grid',
            'grid-template-columns:repeat(2,minmax(0,1fr))',
            'gap:18px',
            'align-items:start',
            'width:100%',
            'max-width:1160px',
            'margin:12px 0 18px',
            'box-sizing:border-box',
            'background:transparent',
            'border:0',
            'box-shadow:none',
            'overflow:visible'
        ].join(';') + ';';
        grid.style.setProperty('background', 'transparent', 'important');
        grid.style.setProperty('border', '0', 'important');
        grid.style.setProperty('box-shadow', 'none', 'important');
    }

    function getOrCreateCourseWidgetsGrid(insertAnchor, courseCode) {
        var grid = document.querySelector('[data-dtu-course-widgets-grid]');
        if (grid && String(grid.getAttribute('data-dtu-course-widgets-grid-course') || '').toUpperCase() !== String(courseCode || '').toUpperCase()) {
            grid.remove();
            grid = null;
        }
        if (!grid) {
            grid = document.createElement('div');
            grid.setAttribute('data-dtu-course-widgets-grid', '1');
            grid.setAttribute('data-dtu-course-widgets-grid-course', courseCode);
            markExt(grid);
            insertAnchor.insertAdjacentElement('afterend', grid);
        }
        applyCourseWidgetsGridStyle(grid);
        return grid;
    }

    function pruneCourseWidgetsGrid() {
        var grid = document.querySelector('[data-dtu-course-widgets-grid]');
        if (grid && !grid.querySelector('[data-dtu-grade-stats], [data-dtu-course-eval]')) grid.remove();
    }

    function applyCourseRailContainerStyle(container, rail) {
        container.style.cssText = [
            'display:block',
            'margin:0',
            'padding:12px 14px 14px',
            'width:100%',
            'max-width:none',
            'box-sizing:border-box',
            'background:transparent',
            'border:0',
            'border-radius:0',
            'box-shadow:none',
            'overflow:visible',
            'color:' + rail.ink,
            'font-family:Lato,"Lucida Sans Unicode","Lucida Grande",sans-serif',
            'font-size:13px',
            'line-height:1.35'
        ].join(';') + ';';
        container.style.setProperty('background', 'transparent', 'important');
        container.style.setProperty('border', '0', 'important');
        container.style.setProperty('box-shadow', 'none', 'important');
    }

    function makeCourseRailLabel(text, rail) {
        var el = document.createElement('div');
        markExt(el);
        el.textContent = text;
        el.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.78px;color:' + rail.muted + ';line-height:1.2;';
        clearCourseRailBackground(el);
        return el;
    }

    function clearCourseRailBackground(el) {
        if (!el || !el.style) return el;
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('background-color', 'transparent', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        return el;
    }

    function formatCourseRailTerm(term) {
        return String(term || '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
    }

    function renderGradeStatsRailPanel(container, data, iterations, semester) {
        var rail = getCourseRailTheme();
        applyCourseRailContainerStyle(container, rail);
        container.innerHTML = '';
        markExt(container);

        var grades = ['12', '10', '7', '4', '02', '00', '-3'];
        var isPassFail = data && data.mode === 'pass_fail';
        var passPct = Number(data && data.passRate) || 0;
        var total = Number(data && data.total) || 0;

        var header = document.createElement('div');
        markExt(header);
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:14px;white-space:nowrap;margin:0 0 16px;min-width:0;';
        clearCourseRailBackground(header);
        header.appendChild(makeCourseRailLabel('Grade Statistics', rail));
        var term = document.createElement('div');
        markExt(term);
        term.textContent = formatCourseRailTerm(semester || '');
        term.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:.3px;color:' + rail.muted + ';text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;';
        clearCourseRailBackground(term);
        header.appendChild(term);
        container.appendChild(header);

        var hero = document.createElement('div');
        markExt(hero);
        hero.style.cssText = 'display:flex;gap:22px;align-items:flex-end;padding:0 0 18px;border-bottom:1px solid ' + rail.hair + ';flex-wrap:wrap;';
        clearCourseRailBackground(hero);
        container.appendChild(hero);

        function addMetric(labelText, valueText, valueSize) {
            var col = document.createElement('div');
            markExt(col);
            col.style.cssText = 'display:flex;flex-direction:column;gap:4px;min-width:78px;';
            clearCourseRailBackground(col);
            col.appendChild(makeCourseRailLabel(labelText, rail));
            var value = document.createElement('div');
            markExt(value);
            value.textContent = valueText;
            value.style.cssText = 'font-size:' + (valueSize || 34) + 'px;font-weight:500;letter-spacing:0;line-height:.95;color:' + rail.ink + ';font-variant-numeric:tabular-nums;';
            clearCourseRailBackground(value);
            col.appendChild(value);
            hero.appendChild(col);
        }

        addMetric('Pass rate', passPct.toFixed(1) + '%', 34);
        if (!isPassFail) {
            var avgValue = (typeof data.average === 'number' && isFinite(data.average)) ? data.average.toFixed(2) : 'n/a';
            addMetric('Average', avgValue, 34);
        }

        var chartCol = document.createElement('div');
        markExt(chartCol);
        chartCol.style.cssText = 'flex:1 1 245px;min-width:235px;max-width:100%;';
        clearCourseRailBackground(chartCol);
        hero.appendChild(chartCol);

        var series = [];
        if (isPassFail) {
            var pf = data.passFailCounts || {};
            series = [
                { label: 'Pass', count: pf.passed || 0, fail: false },
                { label: 'Fail', count: pf.failed || 0, fail: true },
                { label: 'No-show', count: pf.noShow || 0, fail: true }
            ];
        } else {
            series = grades.map(function (g) {
                return { label: g, count: data.counts && data.counts[g] ? data.counts[g] : 0, fail: g === '00' || g === '-3' };
            });
        }
        var maxCount = series.reduce(function (m, s) { return Math.max(m, Number(s.count) || 0); }, 0);

        var bars = document.createElement('div');
        markExt(bars);
        bars.style.cssText = 'display:flex;gap:4px;height:68px;align-items:flex-end;border-bottom:1px solid ' + rail.faint + ';';
        clearCourseRailBackground(bars);
        series.forEach(function (s) {
            var wrap = document.createElement('div');
            markExt(wrap);
            wrap.style.cssText = 'display:flex;flex:1 1 0;min-width:18px;height:68px;align-items:flex-end;justify-content:center;position:relative;';
            clearCourseRailBackground(wrap);
            var count = document.createElement('div');
            markExt(count);
            count.textContent = String(s.count || 0);
            count.style.cssText = 'position:absolute;bottom:' + (Math.max(0, maxCount ? ((s.count || 0) / maxCount) * 62 : 0) + 5) + 'px;font-size:10px;color:' + rail.muted + ';font-variant-numeric:tabular-nums;line-height:1;';
            clearCourseRailBackground(count);
            var bar = document.createElement('div');
            markExt(bar);
            var height = maxCount ? Math.round(((s.count || 0) / maxCount) * 62) : 0;
            var barColor = s.fail ? rail.faint : rail.accent;
            bar.style.cssText = 'width:100%;height:' + height + 'px;';
            bar.style.setProperty('background', barColor, 'important');
            bar.style.setProperty('background-color', barColor, 'important');
            wrap.appendChild(count);
            wrap.appendChild(bar);
            bars.appendChild(wrap);
        });
        chartCol.appendChild(bars);

        var labels = document.createElement('div');
        markExt(labels);
        labels.style.cssText = 'display:flex;gap:4px;margin-top:6px;';
        clearCourseRailBackground(labels);
        series.forEach(function (s) {
            var lbl = document.createElement('div');
            markExt(lbl);
            lbl.textContent = s.label;
            lbl.style.cssText = 'flex:1 1 0;text-align:center;font-size:10px;letter-spacing:.3px;color:' + rail.muted + ';';
            clearCourseRailBackground(lbl);
            labels.appendChild(lbl);
        });
        chartCol.appendChild(labels);

        var caption = document.createElement('div');
        markExt(caption);
        caption.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:7px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:' + rail.muted + ';font-weight:700;font-variant-numeric:tabular-nums;';
        clearCourseRailBackground(caption);
        caption.appendChild(document.createTextNode(total + ' students'));
        caption.appendChild(document.createTextNode(isPassFail ? 'Pass/Fail' : '12-step'));
        chartCol.appendChild(caption);

        if (iterations && iterations.length > 1) {
            var railWrap = document.createElement('div');
            markExt(railWrap);
            railWrap.style.cssText = 'margin-top:20px;';
            clearCourseRailBackground(railWrap);
            railWrap.appendChild(makeCourseRailLabel('Last 3 offerings', rail));

            var rows = document.createElement('div');
            markExt(rows);
            rows.style.cssText = 'position:relative;padding-left:14px;margin-top:8px;';
            clearCourseRailBackground(rows);
            var line = document.createElement('div');
            markExt(line);
            line.style.cssText = 'position:absolute;left:3.5px;top:6px;bottom:6px;width:1px;background:' + rail.faint + ';';
            rows.appendChild(line);

            iterations.slice(0, 3).forEach(function (iter) {
                if (!iter || !iter.data) return;
                var row = document.createElement('div');
                markExt(row);
                row.style.cssText = 'position:relative;display:grid;grid-template-columns:minmax(0,1fr) max-content;gap:12px;align-items:baseline;padding:6px 1px 6px 0;';
                clearCourseRailBackground(row);
                var dot = document.createElement('span');
                markExt(dot);
                dot.style.cssText = 'position:absolute;left:-14px;top:10px;width:7px;height:7px;border-radius:50%;border:1.5px solid ' + rail.accent + ';box-sizing:border-box;';
                dot.style.setProperty('background', rail.pageBg, 'important');
                dot.style.setProperty('background-color', rail.pageBg, 'important');
                row.appendChild(dot);
                var sem = document.createElement('div');
                markExt(sem);
                sem.textContent = formatCourseRailTerm(iter.semester || '');
                sem.style.cssText = 'font-size:13px;font-weight:700;color:' + rail.ink + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                clearCourseRailBackground(sem);
                row.appendChild(sem);
                var meta = document.createElement('div');
                markExt(meta);
                var p = Number(iter.data.passRate) || 0;
                if (iter.data.mode === 'pass_fail') {
                    meta.textContent = p.toFixed(1) + '% · Pass/Fail';
                } else {
                    var av = (typeof iter.data.average === 'number' && isFinite(iter.data.average)) ? iter.data.average.toFixed(2) : 'n/a';
                    meta.textContent = p.toFixed(1) + '% · avg ' + av;
                }
                meta.style.cssText = 'font-size:12px;color:' + rail.muted + ';font-variant-numeric:tabular-nums;white-space:nowrap;';
                clearCourseRailBackground(meta);
                row.appendChild(meta);
                rows.appendChild(row);
            });

            railWrap.appendChild(rows);
            container.appendChild(railWrap);
        }
    }

    function getMyLineCurriculum(cb, forceRefresh) {
        var now = Date.now();
        if (!forceRefresh && _mylineCache && (now - _mylineCacheTs) < MYLINE_CLIENT_TTL_MS) {
            if (cb) cb(_mylineCache);
            return;
        }
        if (_mylineInFlight) {
            setTimeout(function () { getMyLineCurriculum(cb, forceRefresh); }, 120);
            return;
        }
        _mylineInFlight = true;
        sendRuntimeMessage({ type: 'dtu-sdb-myline', forceRefresh: !!forceRefresh }, function (resp) {
            _mylineInFlight = false;
            _mylineCache = resp || null;
            _mylineCacheTs = Date.now();
            if (cb) cb(_mylineCache);
        });
    }

    function getMyLineKindLabel(kind) {
        if (kind === 'mandatory') return 'Mandatory (my line)';
        if (kind === 'core') return 'Core (my line)';
        if (kind === 'elective_pool') return 'Elective pool (my line)';
        if (kind === 'project') return 'Project track (my line)';
        if (kind === 'approved_elective') return 'Approved elective (my line)';
        return '';
    }

    function buildMyLinePill(kind, isDark) {
        var pill = document.createElement('span');
        markExt(pill);
        pill.setAttribute('data-dtu-myline-pill', kind || '');
        pill.textContent = getMyLineKindLabel(kind) || 'My line';
        pill.style.cssText = 'display:inline-flex;align-items:center;gap:6px;'
            + 'padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;line-height:1.35;'
            + 'white-space:nowrap;';

        var fg = isDark ? '#e0e0e0' : '#222';
        var bg = isDark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.18)';
        var border = isDark ? 'rgba(148,163,184,0.28)' : 'rgba(100,116,139,0.30)';

        if (kind === 'mandatory') {
            fg = '#c62828';
            bg = isDark ? 'rgba(198,40,40,0.18)' : 'rgba(198,40,40,0.12)';
            border = isDark ? 'rgba(198,40,40,0.35)' : 'rgba(198,40,40,0.28)';
        } else if (kind === 'core') {
            fg = isDark ? '#ff6b6b' : '#990000';
            bg = isDark ? 'rgba(198,40,40,0.14)' : 'rgba(198,40,40,0.10)';
            border = isDark ? 'rgba(198,40,40,0.28)' : 'rgba(198,40,40,0.22)';
        } else if (kind === 'elective_pool') {
            fg = isDark ? '#93c5fd' : '#1d4ed8';
            bg = isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.10)';
            border = isDark ? 'rgba(59,130,246,0.30)' : 'rgba(29,78,216,0.22)';
        } else if (kind === 'project') {
            fg = isDark ? '#fbbf24' : '#b45309';
            bg = isDark ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.10)';
            border = isDark ? 'rgba(245,158,11,0.30)' : 'rgba(180,83,9,0.22)';
        } else if (kind === 'approved_elective') {
            fg = isDark ? '#86efac' : '#166534';
            bg = isDark ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.10)';
            border = isDark ? 'rgba(34,197,94,0.30)' : 'rgba(22,101,52,0.22)';
        }

        pill.style.setProperty('color', fg, 'important');
        pill.style.setProperty('background', bg, 'important');
        pill.style.setProperty('background-color', bg, 'important');
        pill.style.setProperty('border', '1px solid ' + border, 'important');
        return pill;
    }

    function insertKurserMyLineBadge() {
        if (!isTopWindow()) return;
        if (!isKurserCoursePage()) return;

        var courseCode = getKurserCourseCode();
        if (!courseCode) return;

        var titleEl = findKurserCourseTitleElement(courseCode);
        if (!titleEl) return;

        var existing = document.querySelector('[data-dtu-myline-badge]');
        if (!isFeatureFlagEnabled(getMyLineFeatureKey())) {
            if (existing) existing.remove();
            return;
        }
        if (existing) {
            var exCourse = String(existing.getAttribute('data-dtu-myline-course') || '').toUpperCase();
            if (exCourse === courseCode) return;
            existing.remove();
        }

        var host = document.createElement('div');
        host.setAttribute('data-dtu-myline-badge', '1');
        host.setAttribute('data-dtu-myline-course', courseCode);
        markExt(host);
        host.style.cssText = 'margin-top:6px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;';

        var status = document.createElement('span');
        markExt(status);
        status.textContent = 'Checking your study line plan...';
        status.style.cssText = 'font-size:12px;opacity:0.65;';
        host.appendChild(status);

        titleEl.insertAdjacentElement('afterend', host);

        getMyLineCurriculum(function (plan) {
            if (!host.isConnected) return;
            while (host.firstChild) host.removeChild(host.firstChild);

            var isDark = isDarkModeEnabled();

            if (!plan || !plan.ok) {
                var hint = document.createElement('span');
                markExt(hint);
                hint.style.cssText = 'font-size:12px;opacity:0.7;';

                if (plan && plan.error === 'not_logged_in') {
                    hint.textContent = 'My line badges: open sdb.dtu.dk/myline while logged in, then reload.';
                } else {
                    var reason = (plan && plan.error) ? String(plan.error) : 'unknown';
                    var extra = '';
                    if (plan && plan.error === 'http' && typeof plan.status === 'number') extra = ' (HTTP ' + plan.status + ')';
                    hint.textContent = 'My line badges unavailable (could not read sdb.dtu.dk/myline).';
                    hint.title = 'Reason: ' + reason + extra + '. If this is your first time, open sdb.dtu.dk/myline once while logged in, then reload the course page.';
                }
                host.appendChild(hint);
                return;
            }

            var kinds = plan.kinds || {};
            var info = kinds[courseCode] || null;
            if (!info || !info.kind) {
                host.remove();
                return;
            }

            var pill = buildMyLinePill(info.kind, isDark);
            var titleParts = [];
            if (plan.programTitle) titleParts.push(plan.programTitle);
            if (plan.updatedLabel) titleParts.push('Study plan updated: ' + plan.updatedLabel);
            titleParts.push('Source: sdb.dtu.dk/myline');
            pill.title = titleParts.join('\n');
            host.appendChild(pill);

            if (plan.programTitle) {
                var prog = document.createElement('span');
                markExt(prog);
                prog.textContent = plan.programTitle;
                prog.style.cssText = 'font-size:12px;opacity:0.7;white-space:nowrap;';
                prog.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
                host.appendChild(prog);
            }
        }, false);
    }

    function insertKurserGradeStats() {
        if (!isTopWindow()) return;
        if (!isFeatureFlagEnabled(getGradeStatsFeatureKey())) {
            var existingStats = document.querySelector('[data-dtu-grade-stats]');
            if (existingStats) existingStats.remove();
            pruneCourseWidgetsGrid();
            _gradeStatsRequested = false;
            _gradeStatsCourseCode = null;
            return;
        }
        if (!isKurserCoursePage()) return;

        var courseCode = getKurserCourseCode();
        if (!courseCode) return;

        var existingStats = document.querySelector('[data-dtu-grade-stats]');
        if (existingStats) {
            var existingCourse = String(existingStats.getAttribute('data-dtu-grade-stats-course') || '').toUpperCase();
            if (existingCourse === courseCode) return;
            existingStats.remove();
            _gradeStatsRequested = false;
        }
        var titleEl = findKurserCourseTitleElement(courseCode);
        if (!titleEl) return;
        var insertAnchor = findKurserGradeStatsInsertAnchor(titleEl);
        if (!insertAnchor || !insertAnchor.parentNode) return;

        var panelTheme = getKurserInsightTheme();

        var container = document.createElement('div');
        container.setAttribute('data-dtu-grade-stats', '1');
        container.setAttribute('data-dtu-grade-stats-course', courseCode);
        markExt(container);
        container.style.cssText = getKurserInsightContainerStyle(panelTheme);

        var title = document.createElement('div');
        markExt(title);
        title.textContent = 'Grade Statistics';
        title.style.cssText = 'font-weight: 800; font-size: 14px; line-height: 1.15; margin-bottom: 4px;';
        container.appendChild(title);

        var status = document.createElement('div');
        markExt(status);
        status.textContent = 'Loading grade stats...';
        status.style.cssText = 'font-size: 11px; color: ' + panelTheme.mutedText + ';';
        container.appendChild(status);

        var widgetsGrid = getOrCreateCourseWidgetsGrid(insertAnchor, courseCode);
        widgetsGrid.appendChild(container);

        if (_gradeStatsRequested && _gradeStatsCourseCode === courseCode) return;
        _gradeStatsRequested = true;
        _gradeStatsCourseCode = courseCode;

        sendRuntimeMessage({
            type: 'dtu-grade-stats',
            courseCode: courseCode,
            semesters: buildGradeStatsSemesters()
        }, function (response) {
            var iterations = [];
            if (response && response.ok && Array.isArray(response.iterations) && response.iterations.length) {
                iterations = response.iterations;
            } else if (response && response.ok && response.data) {
                iterations = [{ semester: response.semester || '', data: response.data }];
            }
            if (!iterations.length) {
                status.textContent = 'No Data Available';
                return;
            }

            var latest = iterations[0];
            var data = latest.data || {};
            var semester = latest.semester || '';
            renderGradeStatsRailPanel(container, data, iterations, semester);
            return;
            var grades = ['12', '10', '7', '4', '02', '00', '-3'];
            var total = data.total || 0;
            var isPassFail = data.mode === 'pass_fail';

            status.textContent = '';

            var passPct = (data.passRate || 0);
            var passColor = passPct > 85 ? '#4caf50' : (passPct > 70 ? '#ffb300' : '#ef5350');
            var theme = getKurserInsightTheme();
            var mutedText = theme.mutedText;
            var subtleText = theme.subtleText;
            var divider = theme.divider;

            container.style.cssText = getKurserInsightContainerStyle(theme);

            var layout = document.createElement('div');
            markExt(layout);
            layout.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 6px; margin-top: 6px; align-items: stretch;';
            container.appendChild(layout);

            var infoCol = document.createElement('div');
            markExt(infoCol);
            infoCol.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
            layout.appendChild(infoCol);

            var summary = document.createElement('div');
            markExt(summary);
            summary.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(84px, 1fr)); gap: 6px; ' + getKurserInsightSurfaceStyle(theme);
            infoCol.appendChild(summary);

            var passWrap = document.createElement('div');
            markExt(passWrap);
            var passLabel = document.createElement('div');
            markExt(passLabel);
            passLabel.textContent = 'Pass Rate';
            passLabel.style.cssText = 'font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ' + mutedText + ';';
            passWrap.appendChild(passLabel);
            var passRate = document.createElement('div');
            markExt(passRate);
            passRate.textContent = passPct.toFixed(1) + '%';
            passRate.style.cssText = 'margin-top: 3px; font-size: 21px; line-height: 0.95; font-weight: 800;';
            passRate.style.setProperty('color', passColor, 'important');
            passWrap.appendChild(passRate);
            summary.appendChild(passWrap);

            var avgWrap = document.createElement('div');
            markExt(avgWrap);
            var avgLabel = document.createElement('div');
            markExt(avgLabel);
            avgLabel.textContent = isPassFail ? 'Assessment' : 'Average Grade';
            avgLabel.style.cssText = 'font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ' + mutedText + ';';
            avgWrap.appendChild(avgLabel);
            var avg = document.createElement('div');
            markExt(avg);
            avg.textContent = isPassFail ? 'Pass/Fail' : ((typeof data.average === 'number' && isFinite(data.average)) ? data.average.toFixed(2) : 'n/a');
            avg.style.cssText = 'margin-top: 3px; font-size: ' + (isPassFail ? '14px' : '19px') + '; line-height: 1; font-weight: ' + (isPassFail ? '720' : '780') + '; color: ' + subtleText + ';';
            avgWrap.appendChild(avg);
            summary.appendChild(avgWrap);

            if (semester) {
                var semWrap = document.createElement('div');
                markExt(semWrap);
                var semLabel = document.createElement('div');
                markExt(semLabel);
                semLabel.textContent = 'Latest Offering';
                semLabel.style.cssText = 'font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ' + mutedText + ';';
                semWrap.appendChild(semLabel);

                var sem = document.createElement('div');
                markExt(sem);
                sem.textContent = semester;
                sem.style.cssText = 'margin-top: 3px; font-size: 16px; line-height: 1; font-weight: 760; color: ' + subtleText + ';';
                semWrap.appendChild(sem);
                summary.appendChild(semWrap);
            }

            if (iterations.length > 1) {
                var historyCard = document.createElement('div');
                markExt(historyCard);
                historyCard.style.cssText = getKurserInsightSurfaceStyle(theme);
                infoCol.appendChild(historyCard);

                var historyTitle = document.createElement('div');
                markExt(historyTitle);
                historyTitle.textContent = 'Last 3 offerings';
                historyTitle.style.cssText = 'font-size: 11px; font-weight: 750; color: ' + theme.text + '; margin-bottom: 0;';
                historyCard.appendChild(historyTitle);

                iterations.slice(0, 3).forEach(function (iter, idx) {
                    if (!iter || !iter.data) return;
                    var iterRow = document.createElement('div');
                    markExt(iterRow);
                    iterRow.style.cssText = 'display: grid; grid-template-columns: minmax(80px, 1fr) auto auto; gap: 6px; align-items: baseline; padding: 5px 0;'
                        + (idx > 0 ? (' border-top: 1px solid ' + divider + ';') : '');

                    var iterSem = document.createElement('span');
                    markExt(iterSem);
                    iterSem.textContent = iter.semester || '';
                    iterSem.style.cssText = 'font-size: 10.5px; font-weight: 700; color: ' + subtleText + ';';
                    iterRow.appendChild(iterSem);

                    var iterPassPct = (iter.data.passRate || 0);
                    var iterPass = document.createElement('span');
                    markExt(iterPass);
                    var iterPassColor = iterPassPct > 85 ? '#4caf50' : (iterPassPct > 70 ? '#ffb300' : '#ef5350');
                    iterPass.textContent = 'Pass: ' + iterPassPct.toFixed(1) + '%';
                    iterPass.style.cssText = 'font-size: 10.5px; font-weight: 780;';
                    iterPass.style.setProperty('color', iterPassColor, 'important');
                    iterRow.appendChild(iterPass);

                    var iterAvg = document.createElement('span');
                    markExt(iterAvg);
                    if (iter.data && iter.data.mode === 'pass_fail') {
                        iterAvg.textContent = 'Scale: Pass/Fail';
                    } else {
                        var iterAverage = (iter.data && typeof iter.data.average === 'number' && isFinite(iter.data.average))
                            ? iter.data.average.toFixed(2)
                            : 'n/a';
                        iterAvg.textContent = 'Avg: ' + iterAverage;
                    }
                    iterAvg.style.cssText = 'font-size: 10.5px; color: ' + mutedText + ';';
                    iterRow.appendChild(iterAvg);

                    historyCard.appendChild(iterRow);
                });
            }

            var chartCard = document.createElement('div');
            markExt(chartCard);
            chartCard.style.cssText = 'display: flex; flex-direction: column; ' + getKurserInsightSurfaceStyle(theme);
            layout.appendChild(chartCard);

            var chartHeader = document.createElement('div');
            markExt(chartHeader);
            chartHeader.style.cssText = 'display: flex; justify-content: space-between; gap: 6px; align-items: flex-start;';
            chartCard.appendChild(chartHeader);

            var chartTitle = document.createElement('div');
            markExt(chartTitle);
            chartTitle.textContent = isPassFail ? 'Result Distribution' : 'Grade Distribution';
            chartTitle.style.cssText = 'font-size: 11px; font-weight: 750; color: ' + theme.text + ';';
            chartHeader.appendChild(chartTitle);

            var chartMetaWrap = document.createElement('div');
            markExt(chartMetaWrap);
            chartMetaWrap.style.cssText = 'display: flex; flex-direction: column; align-items: flex-end; text-align: right;';
            chartMetaWrap.title = 'This count is for the latest offering only, not summed across multiple offerings.';

            var chartMeta = document.createElement('div');
            markExt(chartMeta);
            chartMeta.textContent = total + ' students';
            chartMeta.style.cssText = 'font-size: 10px; font-weight: 700; color: ' + subtleText + ';';
            chartMetaWrap.appendChild(chartMeta);

            var chartMetaScope = document.createElement('div');
            markExt(chartMetaScope);
            chartMetaScope.textContent = semester ? (semester + ' only (not summed)') : 'Latest offering only (not summed)';
            chartMetaScope.style.cssText = 'margin-top: 1px; font-size: 9px; color: ' + mutedText + ';';
            chartMetaWrap.appendChild(chartMetaScope);

            chartHeader.appendChild(chartMetaWrap);

            var chart = document.createElement('div');
            markExt(chart);
            chart.style.cssText = 'display: flex; align-items: flex-end; gap: 6px; height: 78px; margin-top: 6px;';

            var series = [];
            if (isPassFail) {
                var pf = data.passFailCounts || {};
                series = [
                    { key: 'pass', label: 'Pass', count: pf.passed || 0, color: '#66bb6a' },
                    { key: 'fail', label: 'Fail', count: pf.failed || 0, color: '#ef5350' },
                    { key: 'noshow', label: 'No-show', count: pf.noShow || 0, color: isDarkModeEnabled() ? '#90a4ae' : '#607d8b' }
                ];
            } else {
                series = grades.map(function (g) {
                    var isPass = (g === '02' || g === '4' || g === '7' || g === '10' || g === '12');
                    return {
                        key: g,
                        label: g,
                        count: data.counts && data.counts[g] ? data.counts[g] : 0,
                        color: isPass ? '#66b3ff' : '#ef5350'
                    };
                });
            }

            var maxCount = 0;
            series.forEach(function (s) {
                var c = s.count || 0;
                if (c > maxCount) maxCount = c;
            });

            series.forEach(function (s) {
                var count = s.count || 0;
                var height = maxCount ? Math.round((count / maxCount) * 50) : 0;
                if (count > 0 && height < 4) height = 4;

                var wrap = document.createElement('div');
                markExt(wrap);
                wrap.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1 1 0; min-width: 22px;';

                var countLabel = document.createElement('div');
                markExt(countLabel);
                countLabel.textContent = String(count);
                countLabel.style.cssText = 'font-size: 10px; font-weight: 700; color: ' + subtleText + '; min-height: 12px;';
                wrap.appendChild(countLabel);

                var barTrack = document.createElement('div');
                markExt(barTrack);
                barTrack.style.cssText = 'height: 49px; width: 100%; display: flex; align-items: flex-end;';

                var bar = document.createElement('div');
                markExt(bar);
                var barColor = s.color;
                bar.style.cssText = 'width: 100%; height: ' + height + 'px; border-radius: 5px 5px 3px 3px;';
                bar.style.setProperty('background', barColor, 'important');
                bar.style.setProperty('background-color', barColor, 'important');
                if (height === 0) {
                    bar.style.setProperty('background', 'transparent', 'important');
                    bar.style.setProperty('background-color', 'transparent', 'important');
                    bar.style.border = '1px solid ' + divider;
                }
                bar.title = s.label + ': ' + count + ' students';

                barTrack.appendChild(bar);
                wrap.appendChild(barTrack);

                var label = document.createElement('div');
                markExt(label);
                label.textContent = s.label;
                label.style.cssText = 'font-size: 9.5px; font-weight: 700; color: ' + mutedText + ';';

                wrap.appendChild(label);
                chart.appendChild(wrap);
            });

            chartCard.appendChild(chart);
        });
    }

    function loadRoomFinderData(cb) {
        if (_roomFinderDataCache) { cb(_roomFinderDataCache); return; }
        _roomFinderDataCallbacks.push(cb);
        if (_roomFinderDataLoading) return;
        _roomFinderDataLoading = true;

        var jsonUrl = '';
        try {
            if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) {
                jsonUrl = browser.runtime.getURL('data/rooms_spring_2026.json');
            } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                jsonUrl = chrome.runtime.getURL('data/rooms_spring_2026.json');
            }
        } catch (e) { }

        if (!jsonUrl) {
            _roomFinderDataLoading = false;
            _roomFinderDataCallbacks.forEach(function (fn) { fn(null); });
            _roomFinderDataCallbacks = [];
            return;
        }

        fetch(jsonUrl)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                _roomFinderDataCache = data;
                _roomFinderDataLoading = false;
                _roomFinderDataCallbacks.forEach(function (fn) { fn(data); });
                _roomFinderDataCallbacks = [];
            })
            .catch(function () {
                _roomFinderDataLoading = false;
                _roomFinderDataCallbacks.forEach(function (fn) { fn(null); });
                _roomFinderDataCallbacks = [];
            });
    }

    function insertKurserRoomFinder() {
        if (!isTopWindow()) return;
        if (!isFeatureFlagEnabled(getRoomFinderFeatureKey())) {
            var ex = document.querySelector('[data-dtu-room-finder]');
            if (ex) ex.remove();
            return;
        }
        if (!isKurserCoursePage()) return;

        var courseCode = getKurserCourseCode();
        if (!courseCode) return;

        var existing = document.querySelector('[data-dtu-room-finder]');
        if (existing) {
            var existingCode = existing.getAttribute('data-dtu-room-finder-code') || '';
            if (existingCode.toUpperCase() === courseCode) return;
            existing.remove();
        }

        var locationRow = null;
        var infoBox = document.querySelector('.box.information');
        if (infoBox) {
            var labels = infoBox.querySelectorAll('td > label');
            for (var i = 0; i < labels.length; i++) {
                if ((labels[i].textContent || '').trim() === 'Location') {
                    locationRow = labels[i].closest('tr');
                    break;
                }
            }
        }
        if (!locationRow || !locationRow.parentNode) return;

        var tr = document.createElement('tr');
        tr.setAttribute('data-dtu-room-finder', '1');
        tr.setAttribute('data-dtu-room-finder-code', courseCode);
        markExt(tr);

        var tdLabel = document.createElement('td');
        markExt(tdLabel);
        var lbl = document.createElement('label');
        lbl.textContent = 'Rooms';
        lbl.style.cssText = 'color: ' + (isDarkModeEnabled() ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)') + ';';
        tdLabel.appendChild(lbl);
        tr.appendChild(tdLabel);

        var tdValue = document.createElement('td');
        markExt(tdValue);
        tdValue.textContent = 'Loading...';
        tr.appendChild(tdValue);

        locationRow.insertAdjacentElement('afterend', tr);

        loadRoomFinderData(function (allRooms) {
            if (!allRooms) {
                tdValue.textContent = 'Room data unavailable.';
                return;
            }

            var rooms = allRooms[courseCode] || allRooms[courseCode.replace(/^0+/, '')];
            if (!rooms || !rooms.length) {
                tr.remove();
                return;
            }

            var physicalRooms = rooms.filter(function (r) { return r.type !== 'ON'; });
            if (!physicalRooms.length) physicalRooms = rooms;

            var lectureRooms = [];
            var exerciseRooms = [];
            physicalRooms.forEach(function (r) {
                if (r.type === 'AUD' || r.type === 'SA') {
                    lectureRooms.push(r);
                } else {
                    exerciseRooms.push(r);
                }
            });

            var sortByBldRoom = function (a, b) {
                var bldCmp = parseInt(a.building, 10) - parseInt(b.building, 10);
                if (bldCmp !== 0) return bldCmp;
                return a.room.localeCompare(b.room);
            };
            lectureRooms.sort(sortByBldRoom);
            exerciseRooms.sort(sortByBldRoom);

            tdValue.innerHTML = '';
            markExt(tdValue);

            var accentColor = isDarkModeEnabled() ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)';
            var textColor = isDarkModeEnabled() ? '#e0e0e0' : '#333';
            var mutedColor = isDarkModeEnabled() ? '#999' : '#666';
            var smartRoomEnabled = isFeatureFlagEnabled(getSmartRoomLinkerFeatureKey());

            lectureRooms.forEach(function (r) {
                var line = document.createElement('div');
                markExt(line);
                line.style.cssText = 'font-size: 13px; line-height: 1.6; color: ' + textColor + ';';
                var typeLabel = r.type === 'SA' ? 'Seminar Room' : 'Auditorium';
                line.appendChild(document.createTextNode('Building ' + r.building + ', ' + typeLabel + ' '));
                if (smartRoomEnabled) {
                    line.appendChild(createMazemapSmartLink(r.building, r.room, r.room));
                } else {
                    line.appendChild(document.createTextNode(r.room));
                }
                tdValue.appendChild(line);
            });

            if (exerciseRooms.length) {
                var byBuilding = {};
                exerciseRooms.forEach(function (r) {
                    if (!byBuilding[r.building]) byBuilding[r.building] = [];
                    byBuilding[r.building].push(r.room);
                });
                var buildings = Object.keys(byBuilding).sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
                buildings.forEach(function (bld) {
                    var roomNums = byBuilding[bld];
                    var line = document.createElement('div');
                    markExt(line);
                    line.style.cssText = 'font-size: 8.5px; line-height: 1.6; color: ' + mutedColor + ';';
                    var label = roomNums.length === 1 ? 'Room' : 'Rooms';
                    line.appendChild(document.createTextNode('Exercises: ' + label + ' '));
                    for (var ri = 0; ri < roomNums.length; ri++) {
                        if (ri > 0) line.appendChild(document.createTextNode(', '));
                        if (smartRoomEnabled) {
                            line.appendChild(createMazemapSmartLink(bld, roomNums[ri], roomNums[ri]));
                        } else {
                            line.appendChild(document.createTextNode(roomNums[ri]));
                        }
                    }
                    line.appendChild(document.createTextNode(' (Building ' + bld + ')'));
                    tdValue.appendChild(line);
                });
            }

            var src = document.createElement('div');
            markExt(src);
            src.style.cssText = 'font-size: 8.5px; margin-top: 2px; color: ' + accentColor + ';';
            src.textContent = 'Data: TimeEdit location service';
            tdValue.appendChild(src);
        });
    }

    function annotateKurserSchedulePlacement() {
        if (!isTopWindow()) return;
        if (!isFeatureFlagEnabled(getScheduleAnnotationFeatureKey())) {
            document.querySelectorAll('[data-dtu-schedule-annotated]').forEach(function (cell) {
                var original = cell.getAttribute('data-dtu-schedule-original');
                if (original !== null) cell.textContent = original;
                cell.removeAttribute('data-dtu-schedule-annotated');
                cell.removeAttribute('data-dtu-schedule-original');
            });
            return;
        }
        if (!isKurserCoursePage()) return;

        var infoBox = document.querySelector('.box.information');
        if (!infoBox) return;

        var rows = infoBox.querySelectorAll('tr');
        for (var i = 0; i < rows.length; i++) {
            var cells = rows[i].querySelectorAll('td');
            if (cells.length < 2) continue;

            var labelCell = cells[0];
            var valueCell = cells[1];
            var labelText = (labelCell.textContent || '').trim().toLowerCase();

            if (labelText.indexOf('schedule') === -1
                && labelText.indexOf('skema') === -1
                && labelText.indexOf('date of exam') === -1
                && labelText.indexOf('eksamen') === -1) continue;

            if (valueCell.getAttribute('data-dtu-schedule-annotated')) continue;

            var text = valueCell.textContent || '';
            var annotated = text.replace(/\b([FE]?)([1-5])([AB])\b(?!\s*\()/gi, function (match, season, num, slot) {
                var key = num + slot.toUpperCase();
                var dayTime = SCHEDULE_SLOT_MAP[key];
                if (!dayTime) return match;
                return match + ' (' + dayTime + ')';
            });

            annotated = annotated.replace(/\b([FE])([1-5])\b(?![AB0-9\s]*\()/gi, function (match, season, num) {
                var keyA = num + 'A';
                var keyB = num + 'B';
                var dayA = SCHEDULE_SLOT_MAP[keyA];
                var dayB = SCHEDULE_SLOT_MAP[keyB];
                if (!dayA || !dayB) return match;
                return match + ' (' + dayA + ' & ' + dayB + ')';
            });

            if (annotated !== text) {
                valueCell.setAttribute('data-dtu-schedule-original', text);
                valueCell.textContent = annotated;
                valueCell.setAttribute('data-dtu-schedule-annotated', '1');
            }
        }
    }

    try {
        globalThis.DTUAfterDarkKurserWidgetsUi = {
            insertKurserMyLineBadge: insertKurserMyLineBadge,
            insertKurserGradeStats: insertKurserGradeStats,
            insertKurserRoomFinder: insertKurserRoomFinder,
            annotateKurserSchedulePlacement: annotateKurserSchedulePlacement
        };
    } catch (eKurserWidgetsUi) { }
})();
