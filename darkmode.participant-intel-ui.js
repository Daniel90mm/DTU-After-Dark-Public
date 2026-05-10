(function () {
    'use strict';

    function getDeps() {
        return globalThis.DTUAfterDarkParticipantIntelUiDeps || null;
    }

    function getIsDark() {
        var deps = getDeps();
        if (!deps || typeof deps.isDarkMode !== 'function') return false;
        return !!deps.isDarkMode();
    }

    function insertParticipantDemographics() {
        var deps = getDeps();
        if (!deps || !deps.isTopWindow) return;
        if (!deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey)
            || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelDemographicsKey)) {
            var old = document.querySelector('[data-dtu-participant-demographics]');
            if (old) old.remove();
            return;
        }
        if (!deps.isCampusnetParticipantPage()) return;
        var oldRetentionFallback = document.querySelector('[data-dtu-retention-indicator]');
        if (oldRetentionFallback) oldRetentionFallback.remove();

        var participants = deps.parseParticipantList();
        if (!participants.length) return;

        var totalUsers = deps.getCampusnetUsersCountFromPage();
        if (totalUsers && totalUsers < participants.length) totalUsers = participants.length;
        if (!totalUsers) totalUsers = participants.length;

        var programCounts = {};
        var totalWithProgram = 0;
        for (var i = 0; i < participants.length; i++) {
            if (participants[i].program) {
                var key = participants[i].program;
                programCounts[key] = (programCounts[key] || 0) + 1;
                totalWithProgram++;
            }
        }

        var sorted = Object.keys(programCounts).map(function (k) {
            return { program: k, count: programCounts[k] };
        }).sort(function (a, b) { return b.count - a.count; });

        deps.loadParticipantIntel(function (intel) {
            var selfProgram = intel.self ? deps.normalizeProgramLabel(intel.self.program) : null;
            var isOutlier = false;
            var retentionSummary = null;
            if (selfProgram && totalWithProgram > 0) {
                var selfCount = programCounts[selfProgram] || 0;
                isOutlier = (selfCount / totalWithProgram) < 0.10;
            }
            if (deps.isFeatureFlagEnabled(deps.featureParticipantIntelRetentionKey)) {
                retentionSummary = buildRetentionRadarSummary(getCurrentCourseRetentionSnapshots(intel), totalUsers);
            }
            renderDemographicsCard(sorted, totalWithProgram, totalUsers, participants.length, isOutlier, selfProgram, retentionSummary);
        });
    }

    function formatRetentionSinceLabel(diffMs) {
        var ms = Math.max(0, Number(diffMs) || 0);
        var days = Math.floor(ms / 86400000);
        var hours = Math.floor(ms / 3600000);
        if (days >= 2) return 'since ' + days + ' days ago';
        if (days === 1) return 'since 1 day ago';
        if (hours >= 1) return 'since ' + hours + 'h ago';
        return 'since earlier today';
    }

    function formatRetentionWindowLabel(diffMs) {
        var ms = Math.max(0, Number(diffMs) || 0);
        var days = Math.floor(ms / 86400000);
        var hours = Math.floor(ms / 3600000);
        if (days >= 2) return 'over ' + days + ' days';
        if (days === 1) return 'over 1 day';
        if (hours >= 1) return 'over ' + hours + 'h';
        return 'over today';
    }

    function formatRetentionPercent(pct) {
        if (typeof pct !== 'number' || !isFinite(pct)) return null;
        var rounded = Math.round(pct * 10) / 10;
        var abs = Math.abs(rounded);
        var text = abs >= 10 ? String(Math.round(rounded)) : rounded.toFixed(1);
        if (rounded > 0) text = '+' + text;
        return text + '%';
    }

    function getCurrentCourseRetentionSnapshots(intel) {
        var deps = getDeps();
        if (!deps) return [];
        var courseCode = deps.getCampusnetCourseCodeFromPage();
        var semester = deps.getCampusnetSemesterFromPage();
        if (!courseCode) return [];
        var key = courseCode + '_' + semester;
        var retention = intel && intel.retention ? intel.retention : null;
        var snapshots = retention && Array.isArray(retention[key]) ? retention[key].slice() : [];
        return snapshots.filter(function (s) {
            return s && typeof s.count === 'number' && isFinite(s.count) && typeof s.ts === 'number' && isFinite(s.ts);
        }).sort(function (a, b) { return a.ts - b.ts; });
    }

    function buildRetentionRadarSummary(snapshots, fallbackCount) {
        var safe = Array.isArray(snapshots) ? snapshots.slice() : [];
        safe = safe.filter(function (s) {
            return s && typeof s.count === 'number' && isFinite(s.count) && typeof s.ts === 'number' && isFinite(s.ts);
        }).sort(function (a, b) { return a.ts - b.ts; });
        if (!safe.length && typeof fallbackCount === 'number' && isFinite(fallbackCount) && fallbackCount > 0) {
            safe.push({ count: fallbackCount, ts: Date.now() });
        }
        if (!safe.length) return null;

        var latest = safe[safe.length - 1];
        var previous = safe.length >= 2 ? safe[safe.length - 2] : null;
        var baseline = safe[0];
        var peak = latest.count;
        var low = latest.count;
        for (var i = 0; i < safe.length; i++) {
            if (safe[i].count > peak) peak = safe[i].count;
            if (safe[i].count < low) low = safe[i].count;
        }

        var previousDeltaCount = previous ? (latest.count - previous.count) : null;
        var previousDeltaPct = (previous && previous.count > 0) ? ((previousDeltaCount / previous.count) * 100) : null;
        var windowDeltaCount = (safe.length >= 2) ? (latest.count - baseline.count) : null;
        var windowDeltaPct = (safe.length >= 2 && baseline.count > 0) ? ((windowDeltaCount / baseline.count) * 100) : null;

        return {
            latestCount: latest.count,
            previousCount: previous ? previous.count : null,
            previousDeltaCount: previousDeltaCount,
            previousDeltaPct: previousDeltaPct,
            previousLabel: previous ? formatRetentionSinceLabel(latest.ts - previous.ts) : '',
            baselineCount: baseline.count,
            windowDeltaCount: windowDeltaCount,
            windowDeltaPct: windowDeltaPct,
            windowLabel: (safe.length >= 2) ? formatRetentionWindowLabel(latest.ts - baseline.ts) : '',
            peakCount: peak,
            lowCount: low,
            snapshotCount: safe.length,
            latestTs: latest.ts
        };
    }

    function appendRetentionRadarSection(host, summary, isDark) {
        var deps = getDeps();
        if (!deps || !host || !summary) return;
        var text = isDark ? '#f1f3f6' : '#1f2937';
        var subtle = isDark ? '#c9d1db' : '#334155';
        var muted = isDark ? '#9ba6b2' : '#64748b';
        var surface = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(248,250,252,0.92)';
        var surfaceRing = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)';
        var divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)';
        var trendColor = '#90a4ae';
        var trendValueText = 'Tracking';
        var trendMetaText = 'Need another snapshot before showing change.';

        if (summary.windowDeltaCount !== null) {
            if (summary.windowDeltaCount > 0) trendColor = '#4caf50';
            else if (summary.windowDeltaCount < 0) trendColor = '#ef5350';
            var trendPctText = formatRetentionPercent(summary.windowDeltaPct);
            var sign = summary.windowDeltaCount > 0 ? '+' : '';
            trendValueText = trendPctText || (sign + String(summary.windowDeltaCount));
            trendMetaText = sign + summary.windowDeltaCount + ' users ' + summary.windowLabel;
        }

        var latestMoveText = 'No previous snapshot yet.';
        var latestMoveColor = muted;
        if (summary.previousDeltaCount !== null) {
            if (summary.previousDeltaCount > 0) latestMoveColor = '#4caf50';
            else if (summary.previousDeltaCount < 0) latestMoveColor = '#ef5350';
            else latestMoveColor = muted;
            var sign2 = summary.previousDeltaCount > 0 ? '+' : '';
            var pct2 = formatRetentionPercent(summary.previousDeltaPct);
            latestMoveText = 'Latest move: ' + sign2 + summary.previousDeltaCount + ' users'
                + (pct2 ? ' (' + pct2 + ')' : '')
                + ' ' + summary.previousLabel + '.';
        }

        var section = document.createElement('div');
        deps.markExt(section);
        section.style.cssText = 'margin:0 0 14px;padding:14px 16px;border-radius:10px;background:' + surface + ';'
            + 'box-shadow:inset 0 0 0 1px ' + surfaceRing + ';';

        var header = document.createElement('div');
        deps.markExt(header);
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px;';

        var titleWrap = document.createElement('div');
        deps.markExt(titleWrap);

        var title = document.createElement('div');
        deps.markExt(title);
        title.textContent = 'Retention Radar';
        title.style.cssText = 'font-size:14px;font-weight:760;line-height:1.15;color:' + text + ';';
        titleWrap.appendChild(title);

        var subtitle = document.createElement('div');
        deps.markExt(subtitle);
        subtitle.textContent = summary.snapshotCount > 1
            ? 'Enrollment trend based on ' + summary.snapshotCount + ' stored snapshots.'
            : 'Enrollment monitoring started for this course.';
        subtitle.style.cssText = 'margin-top:3px;font-size:12px;line-height:1.35;color:' + muted + ';';
        titleWrap.appendChild(subtitle);

        var meta = document.createElement('div');
        deps.markExt(meta);
        try {
            meta.textContent = 'Updated ' + new Date(summary.latestTs).toLocaleDateString();
        } catch (e) {
            meta.textContent = 'Latest snapshot';
        }
        meta.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:' + muted + ';text-align:right;';

        header.appendChild(titleWrap);
        header.appendChild(meta);
        section.appendChild(header);

        var metrics = document.createElement('div');
        deps.markExt(metrics);
        metrics.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:16px;';

        function buildMetric(labelText, valueText, metaText, valueColor) {
            var box = document.createElement('div');
            deps.markExt(box);

            var label = document.createElement('div');
            deps.markExt(label);
            label.textContent = labelText;
            label.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:' + muted + ';';
            box.appendChild(label);

            var value = document.createElement('div');
            deps.markExt(value);
            value.textContent = valueText;
            value.style.cssText = 'margin-top:6px;font-size:30px;line-height:0.95;font-weight:800;color:' + (valueColor || text) + ';';
            box.appendChild(value);

            if (metaText) {
                var metaLine = document.createElement('div');
                deps.markExt(metaLine);
                metaLine.textContent = metaText;
                metaLine.style.cssText = 'margin-top:5px;font-size:12px;line-height:1.35;color:' + subtle + ';';
                box.appendChild(metaLine);
            }
            return box;
        }

        metrics.appendChild(buildMetric('Current users', String(summary.latestCount), 'Current Users total on this course page.', text));
        metrics.appendChild(buildMetric('Net change', trendValueText, trendMetaText, trendColor));
        metrics.appendChild(buildMetric('Peak seen', String(summary.peakCount), 'Range ' + summary.lowCount + '-' + summary.peakCount + ' users.', text));
        section.appendChild(metrics);

        var note = document.createElement('div');
        deps.markExt(note);
        note.textContent = latestMoveText;
        note.style.cssText = 'margin-top:12px;padding-top:12px;border-top:1px solid ' + divider + ';font-size:12px;line-height:1.4;color:' + latestMoveColor + ';';
        section.appendChild(note);

        host.appendChild(section);
    }

    function renderDemographicsCard(sorted, totalWithProgram, totalUsers, loadedUsers, isOutlier, selfProgram, retentionSummary) {
        var deps = getDeps();
        if (!deps) return;
        var anchor = deps.getCampusnetUsersAnchorElement();
        var listRoot = deps.getCampusnetParticipantsListRoot() || (anchor ? anchor.parentNode : null);
        if (!listRoot) return;
        var isDark = getIsDark();
        var sig = (isDark ? 'd' : 'l') + '|'
            + (selfProgram || '') + '|'
            + (isOutlier ? '1' : '0') + '|'
            + totalWithProgram + '|' + totalUsers + '|' + loadedUsers + '|'
            + (retentionSummary
                ? ('ret:' + retentionSummary.latestCount + ':' + retentionSummary.snapshotCount + ':'
                    + String(retentionSummary.windowDeltaCount) + ':' + String(retentionSummary.previousDeltaCount))
                : 'ret:none') + '|'
            + sorted.map(function (r) { return r.program + ':' + r.count; }).join('|');

        var card = document.querySelector('[data-dtu-participant-demographics]');
        if (!card) {
            card = document.createElement('div');
            card.setAttribute('data-dtu-participant-demographics', '1');
            deps.markExt(card);
        }

        var insertionAnchor = listRoot.querySelector('.ui-participants-list-category') || listRoot.querySelector('.ui-participant-categorybar');
        if (insertionAnchor && insertionAnchor !== card) {
            if (card.parentNode !== listRoot || card.nextSibling !== insertionAnchor) {
                listRoot.insertBefore(card, insertionAnchor);
            }
        } else {
            if (card.parentNode !== listRoot) {
                listRoot.insertBefore(card, listRoot.firstChild);
            } else if (listRoot.firstChild !== card) {
                listRoot.insertBefore(card, listRoot.firstChild);
            }
        }

        if (card.getAttribute('data-dtu-demographics-sig') === sig) return;
        card.setAttribute('data-dtu-demographics-sig', sig);

        card.style.cssText = 'margin:0 0 16px;padding:14px 16px;border-radius:8px;'
            + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
        card.style.setProperty('background', isDark ? '#2d2d2d' : '#ffffff', 'important');
        card.style.setProperty('background-color', isDark ? '#2d2d2d' : '#ffffff', 'important');
        card.style.setProperty('border', isDark ? '1px solid #404040' : '1px solid #e0e0e0', 'important');
        card.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');

        while (card.firstChild) card.removeChild(card.firstChild);

        var title = document.createElement('div');
        deps.markExt(title);
        title.textContent = 'Course Composition';
        title.style.cssText = 'font-weight:700;font-size:15px;margin-bottom:10px;';
        title.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
        card.appendChild(title);

        if (retentionSummary) {
            appendRetentionRadarSection(card, retentionSummary, isDark);
        }

        if (isOutlier && selfProgram) {
            var badge = document.createElement('div');
            deps.markExt(badge);
            badge.textContent = 'Outlier Alert -- your program (' + selfProgram + ') is under 10% of this class';
            badge.style.cssText = 'display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;margin-bottom:10px;';
            badge.style.setProperty('background', 'rgba(198,40,40,0.15)', 'important');
            badge.style.setProperty('background-color', 'rgba(198,40,40,0.15)', 'important');
            badge.style.setProperty('color', '#c62828', 'important');
            card.appendChild(badge);
        }

        var palette = isDark
            ? ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#22d3ee', '#fb7185', '#a3e635']
            : ['#2563eb', '#059669', '#d97706', '#7c3aed', '#0891b2', '#e11d48', '#65a30d'];
        var paletteIdx = 0;

        var maxBars = 6;
        var otherCount = 0;
        var otherPrograms = [];
        for (var i = 0; i < sorted.length; i++) {
            if (i >= maxBars) { otherCount += sorted[i].count; otherPrograms.push(sorted[i]); continue; }
            var pct = totalWithProgram > 0 ? Math.round(sorted[i].count / totalWithProgram * 100) : 0;
            var isSelf = selfProgram && sorted[i].program === selfProgram;
            var fill = isSelf ? (isDark ? '#ef5350' : '#c62828') : palette[paletteIdx++ % palette.length];
            card.appendChild(buildDemoBar(sorted[i].program, sorted[i].count, pct, isSelf, isDark, fill, null));
        }
        if (otherCount > 0) {
            var otherPct = totalWithProgram > 0 ? Math.round(otherCount / totalWithProgram * 100) : 0;
            var otherLabel = 'Other' + (otherPrograms.length ? ' (' + otherPrograms.length + ' programs)' : '');
            var stripe = isDark
                ? 'repeating-linear-gradient(135deg, rgba(148,163,184,0.75) 0, rgba(148,163,184,0.75) 6px, rgba(148,163,184,0.30) 6px, rgba(148,163,184,0.30) 12px)'
                : 'repeating-linear-gradient(135deg, rgba(100,116,139,0.55) 0, rgba(100,116,139,0.55) 6px, rgba(100,116,139,0.20) 6px, rgba(100,116,139,0.20) 12px)';
            card.appendChild(buildDemoBar(otherLabel, otherCount, otherPct, false, isDark, stripe, { isOther: true }));

            if (otherPrograms.length) {
                var details = document.createElement('details');
                deps.markExt(details);
                details.style.cssText = 'margin-top:8px;padding-top:8px;';
                details.style.setProperty('border-top', '1px solid ' + (isDark ? '#404040' : '#eee'), 'important');

                var summary = document.createElement('summary');
                deps.markExt(summary);
                var showN = Math.min(10, otherPrograms.length);
                summary.textContent = 'Other breakdown (top ' + showN + ' of ' + otherPrograms.length + ')';
                summary.style.cssText = 'cursor:pointer;font-size:12px;opacity:0.85;user-select:none;';
                summary.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
                details.appendChild(summary);

                var list = document.createElement('div');
                deps.markExt(list);
                list.style.cssText = 'margin-top:8px;display:flex;flex-direction:column;gap:6px;';

                for (var k = 0; k < showN; k++) {
                    var it = otherPrograms[k];
                    var lpct = totalWithProgram > 0 ? Math.round(it.count / totalWithProgram * 100) : 0;

                    var line = document.createElement('div');
                    deps.markExt(line);
                    line.style.cssText = 'display:flex;justify-content:space-between;gap:12px;font-size:12px;line-height:1.25;';

                    var left = document.createElement('span');
                    deps.markExt(left);
                    left.textContent = it.program;
                    left.style.cssText = 'flex:1;min-width:0;white-space:normal;word-break:break-word;opacity:0.9;';

                    var right = document.createElement('span');
                    deps.markExt(right);
                    right.textContent = it.count + ' (' + lpct + '%)';
                    right.style.cssText = 'flex:0 0 auto;white-space:nowrap;opacity:0.75;';

                    line.appendChild(left);
                    line.appendChild(right);
                    list.appendChild(line);
                }

                if (otherPrograms.length > showN) {
                    var more = document.createElement('div');
                    deps.markExt(more);
                    more.textContent = '... and ' + (otherPrograms.length - showN) + ' more';
                    more.style.cssText = 'font-size:11px;opacity:0.6;margin-top:2px;';
                    list.appendChild(more);
                }

                details.appendChild(list);
                card.appendChild(details);
            }
        }

        var footer = document.createElement('div');
        deps.markExt(footer);
        var footerText = totalUsers + ' users';
        if (loadedUsers && loadedUsers !== totalUsers) footerText += ' (showing ' + loadedUsers + ')';
        if (totalWithProgram < loadedUsers) footerText += ' (' + totalWithProgram + ' with program info)';
        footer.textContent = footerText;
        footer.style.cssText = 'font-size:11px;opacity:0.6;margin-top:8px;';
        card.appendChild(footer);
    }

    function buildDemoBar(label, count, pct, isSelf, isDark, fillStyle, meta) {
        var deps = getDeps();
        if (!deps) return document.createElement('div');
        var row = document.createElement('div');
        deps.markExt(row);
        row.style.cssText = 'display:grid;grid-template-columns:clamp(220px,38%,440px) 1fr 74px;'
            + 'column-gap:10px;align-items:center;margin:6px 0;';
        if (meta && meta.isOther) {
            row.style.setProperty('opacity', isDark ? '0.92' : '0.95', 'important');
        }

        var lbl = document.createElement('span');
        deps.markExt(lbl);
        lbl.textContent = label;
        lbl.title = label;
        lbl.style.cssText = 'font-size:12px;line-height:1.25;white-space:normal;overflow:visible;word-break:break-word;';
        lbl.style.setProperty('color', isDark ? '#e0e0e0' : '#333', 'important');

        var barBg = document.createElement('div');
        deps.markExt(barBg);
        barBg.style.cssText = 'height:14px;border-radius:3px;overflow:hidden;align-self:center;';
        barBg.style.setProperty('background', isDark ? '#1a1a1a' : '#f0f0f0', 'important');
        barBg.style.setProperty('background-color', isDark ? '#1a1a1a' : '#f0f0f0', 'important');

        var barFill = document.createElement('div');
        deps.markExt(barFill);
        barFill.style.cssText = 'height:100%;border-radius:3px;transition:width .3s;width:' + pct + '%;';
        var bg = fillStyle || (isSelf ? (isDark ? '#ef5350' : '#c62828') : (isDark ? '#666' : '#999'));
        barFill.style.setProperty('background', bg, 'important');
        if (!/gradient/i.test(bg)) {
            barFill.style.setProperty('background-color', bg, 'important');
        }
        if (meta && meta.isOther) {
            barFill.style.setProperty('opacity', isDark ? '0.7' : '0.75', 'important');
        }
        barBg.appendChild(barFill);

        var countLbl = document.createElement('span');
        deps.markExt(countLbl);
        countLbl.textContent = count + ' (' + pct + '%)';
        countLbl.style.cssText = 'text-align:right;font-size:11px;opacity:0.8;white-space:nowrap;';

        row.appendChild(lbl);
        row.appendChild(barBg);
        row.appendChild(countLbl);
        return row;
    }

    function annotateParticipantHistory() {
        var deps = getDeps();
        if (!deps || !deps.isCampusnetParticipantPage()) return;
        if (!deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey)
            || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelSharedHistoryKey)) {
            document.querySelectorAll('[data-dtu-shared-history]').forEach(function (el) { el.remove(); });
            return;
        }

        var courseCode = deps.getCampusnetCourseCodeFromPage();
        var semester = deps.getCampusnetSemesterFromPage();
        var currentCourseCode = deps.normalizeIntelCourseCode(courseCode);
        var currentSemester = deps.normalizeIntelCourseSemester(semester);
        var userItems = deps.getCampusnetUsersParticipantElements();
        if (!userItems.length) return;

        var userSet = new Set(userItems);
        document.querySelectorAll('[data-dtu-shared-history]').forEach(function (badge) {
            var p = badge.closest && badge.closest('.ui-participant');
            if (!p || !userSet.has(p)) badge.remove();
        });

        deps.loadParticipantIntel(function (intel) {
            var items = userItems;
            var isDark = getIsDark();
            var selfSNumber = '';
            try {
                selfSNumber = (intel && intel.self && intel.self.sNumber) ? String(intel.self.sNumber).toLowerCase() : '';
            } catch (eSelf0) { selfSNumber = ''; }
            if (!selfSNumber) selfSNumber = deps.detectCampusnetSelfSNumberFromHeader();
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var nameEl = item.querySelector('.ui-participant-fullname');
                if (!nameEl) continue;

                var existingBadge = nameEl.querySelector('[data-dtu-shared-history]');
                var infoEl = item.querySelector('.ui-participant-additional.user-information');
                if (!infoEl) {
                    if (existingBadge) existingBadge.remove();
                    continue;
                }
                var sMatch = infoEl.textContent.match(/\b(s\d{6})\b/i);
                if (!sMatch) {
                    if (existingBadge) existingBadge.remove();
                    continue;
                }
                var sNumber = sMatch[1].toLowerCase();
                if (selfSNumber && sNumber === selfSNumber) {
                    if (existingBadge) existingBadge.remove();
                    continue;
                }

                var student = intel.students[sNumber];
                if (!student || !student.courses || !student.courses.length) {
                    if (existingBadge) existingBadge.remove();
                    continue;
                }
                var dedupedStudentCourses = deps.dedupeIntelCourseList(student.courses);
                var studentCourses = dedupedStudentCourses.list;

                var shared = [];
                for (var c = 0; c < studentCourses.length; c++) {
                    var sc = studentCourses[c];
                    if (currentCourseCode && currentSemester && sc.code === currentCourseCode && sc.semester === currentSemester) continue;
                    var scName = '';
                    try { scName = intel.courseNames ? (intel.courseNames[sc.code] || '') : ''; } catch (eScNm) { scName = ''; }
                    if (!deps.isCampusnetLikelyAcademicCourse(sc.code, scName, { title: scName })) continue;
                    shared.push(sc);
                }
                shared = deps.collapseCourseEntriesByCode(shared);
                if (!shared.length) {
                    if (existingBadge) existingBadge.remove();
                    continue;
                }

                var badge = existingBadge;
                if (!badge) {
                    badge = document.createElement('span');
                    badge.setAttribute('data-dtu-shared-history', '1');
                    deps.markExt(badge);
                    nameEl.appendChild(badge);
                }

                var sharedTitle = shared.map(function (s) {
                    var nm = '';
                    try { nm = intel.courseNames ? (intel.courseNames[s.code] || '') : ''; } catch (eName) { nm = ''; }
                    nm = deps.normalizeWhitespace(nm);
                    return s.code + ' (' + s.semester + ')' + (nm ? ' - ' + nm : '');
                }).join('\n');
                if (shared.length === 1) {
                    badge.textContent = 'Shared ' + shared[0].code + ' (' + shared[0].semester + ')';
                } else {
                    badge.textContent = shared.length + ' shared courses';
                }
                badge.title = sharedTitle;

                badge.style.cssText = 'display:inline-block;margin-left:8px;padding:1px 6px;border-radius:3px;'
                    + 'font-size:10px;font-weight:600;vertical-align:middle;cursor:help;';
                badge.style.setProperty('background', isDark ? 'rgba(var(--dtu-ad-accent-rgb),0.2)' : 'rgba(var(--dtu-ad-accent-rgb),0.1)', 'important');
                badge.style.setProperty('background-color', isDark ? 'rgba(var(--dtu-ad-accent-rgb),0.2)' : 'rgba(var(--dtu-ad-accent-rgb),0.1)', 'important');
                badge.style.setProperty('color', isDark ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)', 'important');
            }
        });
    }

    function annotateProfileHistory() {
        var deps = getDeps();
        if (!deps || !deps.isCampusnetProfilePage()) return;
        if (!deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey)
            || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelSharedHistoryKey)) {
            var existing0 = document.querySelector('[data-dtu-profile-history]');
            if (existing0) existing0.remove();
            return;
        }

        var sNumber = null;
        var tds = document.querySelectorAll('td');
        for (var i = 0; i < tds.length; i++) {
            var m = tds[i].textContent.match(/\b(s\d{6})\b/i);
            if (m) { sNumber = m[1].toLowerCase(); break; }
        }
        if (!sNumber) {
            var existing = document.querySelector('[data-dtu-profile-history]');
            if (existing) existing.remove();
            return;
        }

        deps.loadParticipantIntel(function (intel) {
            var existing = document.querySelector('[data-dtu-profile-history]');
            var student = intel.students[sNumber];
            if (!student || !student.courses || !student.courses.length) {
                if (existing) existing.remove();
                return;
            }
            var dedupedStudentCourses = deps.dedupeIntelCourseList(student.courses);
            var studentCourses = dedupedStudentCourses.list;

            var isDark = getIsDark();
            var courseSig = studentCourses.map(function (c) { return (c.code || '') + '_' + (c.semester || ''); }).join('|');
            var sig = (isDark ? 'd' : 'l') + '|' + sNumber + '|' + courseSig;

            var showPerson = document.querySelector('.show-person');
            if (!showPerson) return;

            var card = existing;
            if (!card) {
                card = document.createElement('div');
                card.setAttribute('data-dtu-profile-history', '1');
                deps.markExt(card);
                showPerson.appendChild(card);
            } else if (card.parentNode !== showPerson) {
                showPerson.appendChild(card);
            }

            if (card.getAttribute('data-dtu-profile-history-sig') === sig) return;
            card.setAttribute('data-dtu-profile-history-sig', sig);

            card.style.cssText = 'margin:12px 0;padding:12px 16px;border-radius:8px;'
                + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
            card.style.setProperty('background', isDark ? '#2d2d2d' : '#ffffff', 'important');
            card.style.setProperty('background-color', isDark ? '#2d2d2d' : '#ffffff', 'important');
            card.style.setProperty('border', isDark ? '1px solid #404040' : '1px solid #e0e0e0', 'important');
            card.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');

            while (card.firstChild) card.removeChild(card.firstChild);

            var title = document.createElement('div');
            deps.markExt(title);
            title.textContent = 'Shared Course History';
            title.style.cssText = 'font-weight:700;font-size:14px;margin-bottom:8px;';
            title.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
            card.appendChild(title);

            for (var c = 0; c < studentCourses.length; c++) {
                var courseTag = document.createElement('span');
                deps.markExt(courseTag);
                var cc = studentCourses[c].code;
                var ss = studentCourses[c].semester;
                var nm2 = '';
                try { nm2 = intel.courseNames ? (intel.courseNames[cc] || '') : ''; } catch (eName2) { nm2 = ''; }
                nm2 = deps.normalizeWhitespace(nm2);
                if (!deps.isCampusnetLikelyAcademicCourse(cc, nm2, { title: nm2 })) continue;
                courseTag.textContent = cc + ' (' + ss + ')';
                if (nm2) courseTag.title = nm2;
                courseTag.style.cssText = 'display:inline-block;margin:2px 4px 2px 0;padding:2px 8px;border-radius:4px;font-size:12px;';
                courseTag.style.setProperty('background', isDark ? '#1a1a1a' : '#f0f0f0', 'important');
                courseTag.style.setProperty('background-color', isDark ? '#1a1a1a' : '#f0f0f0', 'important');
                courseTag.style.setProperty('color', isDark ? '#e0e0e0' : '#333', 'important');
                card.appendChild(courseTag);
            }
        });
    }

    var retentionSnapshotInFlight = false;
    function recordRetentionSnapshot() {
        var deps = getDeps();
        if (!deps || retentionSnapshotInFlight) return;
        if (!deps.isCampusnetParticipantPage()) return;
        if (!deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey)
            || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelRetentionKey)) {
            var old = document.querySelector('[data-dtu-retention-indicator]');
            if (old) old.remove();
            return;
        }

        var courseCode = deps.getCampusnetCourseCodeFromPage();
        var semester = deps.getCampusnetSemesterFromPage();
        if (!courseCode) return;

        var count = deps.getCampusnetUsersCountFromPage();
        if (!count) count = deps.getCampusnetUsersParticipantElements().length;
        if (!count) return;

        var rKey = courseCode + '_' + semester;

        retentionSnapshotInFlight = true;
        deps.loadParticipantIntel(function (intel) {
            retentionSnapshotInFlight = false;
            if (!intel.retention[rKey]) intel.retention[rKey] = [];
            var snapshots = intel.retention[rKey];
            var now = Date.now();

            if (snapshots.length > 0) {
                var last = snapshots[snapshots.length - 1];
                if ((now - last.ts) < 6 * 3600000) {
                    renderRetentionIndicator(snapshots);
                    if (deps.isFeatureFlagEnabled(deps.featureParticipantIntelDemographicsKey)) insertParticipantDemographics();
                    return;
                }
            }

            snapshots.push({ count: count, ts: now });
            if (snapshots.length > deps.participantIntelMaxRetention) {
                intel.retention[rKey] = snapshots.slice(-deps.participantIntelMaxRetention);
                snapshots = intel.retention[rKey];
            }

            deps.saveParticipantIntel(intel);
            renderRetentionIndicator(snapshots);
            if (deps.isFeatureFlagEnabled(deps.featureParticipantIntelDemographicsKey)) insertParticipantDemographics();
        });
    }

    function renderRetentionIndicator(snapshots) {
        var deps = getDeps();
        if (!deps) return;
        var summary = buildRetentionRadarSummary(snapshots, deps.getCampusnetUsersCountFromPage() || deps.getCampusnetUsersParticipantElements().length);
        var existing = document.querySelector('[data-dtu-retention-indicator]');
        if (!summary) {
            if (existing) existing.remove();
            return;
        }

        if (deps.isFeatureFlagEnabled(deps.featureParticipantIntelDemographicsKey)
            && document.querySelector('[data-dtu-participant-demographics]')) {
            if (existing) existing.remove();
            return;
        }

        var anchor = deps.getCampusnetUsersAnchorElement();
        var listRoot = deps.getCampusnetParticipantsListRoot() || (anchor ? anchor.parentNode : null);
        if (!listRoot) return;

        var card = existing;
        if (!card) {
            card = document.createElement('div');
            card.setAttribute('data-dtu-retention-indicator', '1');
            deps.markExt(card);
        }

        var insertionAnchor = listRoot.querySelector('.ui-participants-list-category') || listRoot.querySelector('.ui-participant-categorybar');
        if (insertionAnchor && insertionAnchor !== card) {
            if (card.parentNode !== listRoot || card.nextSibling !== insertionAnchor) {
                listRoot.insertBefore(card, insertionAnchor);
            }
        } else if (card.parentNode !== listRoot) {
            listRoot.insertBefore(card, listRoot.firstChild);
        }

        var isDark = getIsDark();
        card.style.cssText = 'margin:0 0 16px;padding:14px 16px;border-radius:8px;'
            + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
        card.style.setProperty('background', isDark ? '#2d2d2d' : '#ffffff', 'important');
        card.style.setProperty('background-color', isDark ? '#2d2d2d' : '#ffffff', 'important');
        card.style.setProperty('border', isDark ? '1px solid #404040' : '1px solid #e0e0e0', 'important');
        card.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');

        while (card.firstChild) card.removeChild(card.firstChild);
        appendRetentionRadarSection(card, summary, isDark);
    }

    globalThis.DTUAfterDarkParticipantIntelUi = {
        insertParticipantDemographics: insertParticipantDemographics,
        annotateParticipantHistory: annotateParticipantHistory,
        annotateProfileHistory: annotateProfileHistory,
        recordRetentionSnapshot: recordRetentionSnapshot
    };
})();
