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

        deps.getFullParticipantList(function (participants, listInfo) {
            renderParticipantDemographics(participants, listInfo || {});
        });
    }

    function renderParticipantDemographics(participants, listInfo) {
        var deps = getDeps();
        if (!deps || !participants.length) return;
        if (!deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey)
            || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelDemographicsKey)) return;

        var totalUsers = listInfo.total || deps.getCampusnetUsersCountFromPage() || 0;
        if (totalUsers < participants.length) totalUsers = participants.length;

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
            if (!deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey)
                || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelDemographicsKey)) return;
            var selfProgram = intel.self ? deps.normalizeProgramLabel(intel.self.program) : null;
            var retentionSummary = null;
            if (deps.isFeatureFlagEnabled(deps.featureParticipantIntelRetentionKey)) {
                retentionSummary = buildRetentionRadarSummary(getCurrentCourseRetentionSnapshots(intel), totalUsers);
            }
            // Users (N) also counts staff without an s-number, whom the parser skips,
            // so "loaded" is measured in the same unit as the total.
            var loadedUsers = listInfo.complete ? totalUsers : deps.getCampusnetUsersParticipantElements().length;
            renderDemographicsCard(sorted, totalWithProgram, totalUsers, loadedUsers, selfProgram, retentionSummary);
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
        var key = deps.getCampusnetRetentionKey();
        if (!key) return [];
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
            baselineTs: baseline.ts,
            latestTs: latest.ts,
            snapshots: safe
        };
    }

    // Participant-page widget: Retention Radar and Course Composition as two
    // open columns split by a hairline, no box, in the same visual language as
    // the kurser.dtu.dk course widgets. Colours come from custom properties set
    // on the host, so dark mode, light mode and the user's accent flow through
    // one stylesheet. Bars stay neutral; the accent marks only the viewer's own
    // program and the disclosure button.

    var PARTICIPANT_INTEL_STYLE_ID = 'dtu-participant-intel-style';

    var PARTICIPANT_INTEL_CSS = [
        '.dtu-pi-host{display:block;margin:4px 0 20px!important;padding:0 0 20px!important;background:transparent!important;border:0!important;border-bottom:1px solid var(--dtu-pi-divider)!important;border-radius:0!important;box-shadow:none!important;color:var(--dtu-pi-ink)!important;font-size:14px;font-weight:400;line-height:1.4;font-variant-numeric:tabular-nums;text-align:left;container-type:inline-size}',
        '.dtu-pi-host *{box-sizing:border-box}',
        '.dtu-pi-grid{display:grid;grid-template-columns:minmax(200px,240px) minmax(0,1fr);align-items:start}',
        '.dtu-pi-grid[data-single]{grid-template-columns:minmax(0,1fr)}',
        '.dtu-pi-col{min-width:0;display:flex;flex-direction:column;gap:12px}',
        '.dtu-pi-grid:not([data-single]) > .dtu-pi-col:first-child{padding-right:32px}',
        '.dtu-pi-grid:not([data-single]) > .dtu-pi-col + .dtu-pi-col{padding-left:32px;border-left:1px solid var(--dtu-pi-divider)}',
        '@container (max-width:600px){.dtu-pi-grid{grid-template-columns:minmax(0,1fr)}.dtu-pi-grid:not([data-single]) > .dtu-pi-col:first-child{padding-right:0}.dtu-pi-grid:not([data-single]) > .dtu-pi-col + .dtu-pi-col{padding-left:0;border-left:0;border-top:1px solid var(--dtu-pi-divider);margin-top:20px;padding-top:20px}}',
        '.dtu-pi-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;min-width:0}',
        '.dtu-pi-title{font-size:15px;font-weight:700;color:var(--dtu-pi-ink)!important}',
        '.dtu-pi-meta{font-size:13px;color:var(--dtu-pi-muted)!important;text-align:right;min-width:0}',
        '.dtu-pi-hero{display:flex;align-items:baseline;gap:8px}',
        '.dtu-pi-big{font-size:42px;font-weight:600;line-height:1;color:var(--dtu-pi-ink)!important}',
        '.dtu-pi-unit{font-size:14px;color:var(--dtu-pi-muted)!important}',
        '.dtu-pi-change{font-size:14px;color:var(--dtu-pi-ink)!important}',
        '.dtu-pi-change b{font-weight:700}',
        '.dtu-pi-note{font-size:13px;line-height:1.45;color:var(--dtu-pi-muted)!important}',
        '.dtu-pi-spark{display:block;width:100%;height:48px;overflow:visible}',
        '.dtu-pi-spark polyline{fill:none!important;stroke:var(--dtu-pi-bar)!important;stroke-width:1.5;stroke-linejoin:round}',
        '.dtu-pi-spark line{stroke:var(--dtu-pi-hair)!important;stroke-width:1}',
        '.dtu-pi-spark circle{fill:var(--dtu-pi-ink)!important;stroke:none!important}',
        '.dtu-pi-foot{padding-top:10px;border-top:1px solid var(--dtu-pi-hair);font-size:13px;color:var(--dtu-pi-muted)!important}',
        '.dtu-pi-foot b{font-weight:400;color:var(--dtu-pi-ink)!important}',
        '.dtu-pi-rows{display:flex;flex-direction:column;gap:10px;margin:0;padding:0;list-style:none}',
        '.dtu-pi-row{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:12px;row-gap:4px;align-items:baseline;margin:0;padding:0}',
        '.dtu-pi-row[hidden]{display:none}',
        '.dtu-pi-label{font-size:13px;line-height:1.3;color:var(--dtu-pi-ink)!important;min-width:0;overflow-wrap:anywhere}',
        '.dtu-pi-mine{margin-left:6px;font-size:12px;color:var(--dtu-pi-accent)!important;white-space:nowrap}',
        '.dtu-pi-num{font-size:13px;color:var(--dtu-pi-muted)!important;white-space:nowrap;text-align:right}',
        '.dtu-pi-num b{margin-right:8px;font-weight:700;color:var(--dtu-pi-ink)!important}',
        '.dtu-pi-track{grid-column:1 / -1;height:6px;border-radius:3px;background:var(--dtu-pi-track)!important;overflow:hidden}',
        '.dtu-pi-fill{display:block;height:100%;border-radius:3px;background:var(--dtu-pi-bar)!important}',
        '.dtu-pi-row[data-mine] .dtu-pi-fill{background:var(--dtu-pi-accent)!important}',
        'button.dtu-pi-more{appearance:none;-webkit-appearance:none;align-self:flex-start;margin:0;padding:4px 0;min-height:24px;border:0!important;border-radius:2px;background:transparent!important;box-shadow:none!important;color:var(--dtu-pi-accent)!important;font:inherit;font-size:13px;font-weight:700;text-transform:none;letter-spacing:0;cursor:pointer}',
        'button.dtu-pi-more:hover{text-decoration:underline}',
        'button.dtu-pi-more:active{opacity:.8}',
        '.dtu-pi-host button:focus-visible{outline:2px solid var(--dtu-pi-ink)!important;outline-offset:2px}'
    ].join('\n');

    function ensureParticipantIntelStyles() {
        if (document.getElementById(PARTICIPANT_INTEL_STYLE_ID)) return;
        var deps = getDeps();
        var style = document.createElement('style');
        style.id = PARTICIPANT_INTEL_STYLE_ID;
        if (deps) deps.markExt(style);
        style.textContent = PARTICIPANT_INTEL_CSS;
        (document.head || document.documentElement).appendChild(style);
    }

    function readParticipantIntelAccent(isDark) {
        var accent = isDark ? '#60a5fa' : '#1f7ae0';
        try {
            var styles = getComputedStyle(document.documentElement);
            // The base accent is too dark to read as text on the dark surface,
            // and the soft one too light on white.
            var primary = isDark ? '--dtu-ad-accent-soft' : '--dtu-ad-accent-deep';
            accent = (styles.getPropertyValue(primary) || styles.getPropertyValue('--dtu-ad-accent') || accent).trim() || accent;
        } catch (e0) { }
        return accent;
    }

    function prepareParticipantIntelHost(host, isDark) {
        ensureParticipantIntelStyles();
        host.className = 'dtu-pi-host';
        host.style.cssText = '';
        var tokens = isDark ? {
            ink: '#f0eee8',
            muted: 'rgba(240,238,232,.64)',
            hair: 'rgba(240,238,232,.13)',
            divider: 'rgba(240,238,232,.16)',
            track: 'rgba(240,238,232,.10)',
            bar: '#cfcdc8'
        } : {
            ink: '#1a1a1a',
            muted: 'rgba(26,26,26,.66)',
            hair: 'rgba(26,26,26,.10)',
            divider: 'rgba(26,26,26,.14)',
            track: 'rgba(26,26,26,.08)',
            bar: '#8c8a85'
        };
        tokens.accent = readParticipantIntelAccent(isDark);
        Object.keys(tokens).forEach(function (k) {
            host.style.setProperty('--dtu-pi-' + k, tokens[k]);
        });
        while (host.firstChild) host.removeChild(host.firstChild);
        var grid = makePiEl('div', 'dtu-pi-grid');
        host.appendChild(grid);
        return grid;
    }

    function makePiEl(tag, className, text) {
        var el = document.createElement(tag);
        var deps = getDeps();
        if (deps) deps.markExt(el);
        if (className) el.className = className;
        if (text != null) el.textContent = text;
        return el;
    }

    function makePiHead(title, meta) {
        var head = makePiEl('div', 'dtu-pi-head');
        head.appendChild(makePiEl('span', 'dtu-pi-title', title));
        if (meta) head.appendChild(makePiEl('span', 'dtu-pi-meta', meta));
        return head;
    }

    var PI_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    function formatPiDate(ts) {
        var d = new Date(ts);
        if (isNaN(d.getTime())) return '';
        return d.getDate() + ' ' + PI_MONTHS[d.getMonth()];
    }

    function formatPiSigned(n) {
        return (n > 0 ? '+' : n < 0 ? '\u2212' : '') + Math.abs(n);
    }

    // Step line of every stored count, placed by time so a long gap between
    // visits reads as one.
    function buildRetentionSparkline(snapshots) {
        var ns = 'http://www.w3.org/2000/svg';
        var w = 240, h = 48, pad = 4;
        var svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('class', 'dtu-pi-spark');
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('aria-hidden', 'true');
        var t0 = snapshots[0].ts;
        var t1 = snapshots[snapshots.length - 1].ts;
        var lo = Infinity, hi = -Infinity;
        snapshots.forEach(function (s) { lo = Math.min(lo, s.count); hi = Math.max(hi, s.count); });
        var span = hi - lo || 1;
        function x(ts) { return t1 > t0 ? pad + (ts - t0) / (t1 - t0) * (w - 2 * pad) : w / 2; }
        function y(c) { return hi === lo ? h / 2 : pad + (hi - c) / span * (h - 2 * pad); }
        var base = document.createElementNS(ns, 'line');
        base.setAttribute('x1', '0'); base.setAttribute('x2', String(w));
        base.setAttribute('y1', String(h - 0.5)); base.setAttribute('y2', String(h - 0.5));
        base.setAttribute('vector-effect', 'non-scaling-stroke');
        svg.appendChild(base);
        var pts = [];
        snapshots.forEach(function (s, i) {
            if (i > 0) pts.push(x(s.ts).toFixed(1) + ',' + y(snapshots[i - 1].count).toFixed(1));
            pts.push(x(s.ts).toFixed(1) + ',' + y(s.count).toFixed(1));
        });
        var line = document.createElementNS(ns, 'polyline');
        line.setAttribute('points', pts.join(' '));
        line.setAttribute('vector-effect', 'non-scaling-stroke');
        svg.appendChild(line);
        var last = snapshots[snapshots.length - 1];
        var dot = document.createElementNS(ns, 'circle');
        dot.setAttribute('cx', x(last.ts).toFixed(1));
        dot.setAttribute('cy', y(last.count).toFixed(1));
        dot.setAttribute('r', '2.5');
        svg.appendChild(dot);
        return svg;
    }

    function buildRetentionColumn(summary) {
        var col = makePiEl('section', 'dtu-pi-col');
        col.setAttribute('data-dtu-intel-section', 'retention');
        col.setAttribute('aria-label', 'Retention Radar');
        var tracked = summary.snapshotCount > 1;
        col.appendChild(makePiHead('Retention Radar', tracked ? 'Since ' + formatPiDate(summary.baselineTs) : null));

        var hero = makePiEl('div', 'dtu-pi-hero');
        hero.appendChild(makePiEl('span', 'dtu-pi-big', String(summary.latestCount)));
        hero.appendChild(makePiEl('span', 'dtu-pi-unit', summary.latestCount === 1 ? 'user' : 'users'));
        col.appendChild(hero);

        if (!tracked) {
            col.appendChild(makePiEl('div', 'dtu-pi-note',
                'First count saved ' + formatPiDate(summary.latestTs) + '. Changes show when you open this page again at least 6 hours later.'));
            return col;
        }

        var change = makePiEl('div', 'dtu-pi-change');
        var delta = summary.windowDeltaCount;
        if (delta === 0) {
            change.textContent = 'No change since ' + formatPiDate(summary.baselineTs);
        } else {
            var b = makePiEl('b', null, formatPiSigned(delta) + ' ' + (Math.abs(delta) === 1 ? 'user' : 'users'));
            change.appendChild(b);
            var pct = formatRetentionPercent(summary.windowDeltaPct);
            if (pct) pct = pct.replace('-', '\u2212');
            change.appendChild(document.createTextNode((pct ? ' (' + pct + ')' : '') + ' since ' + formatPiDate(summary.baselineTs)));
        }
        col.appendChild(change);
        col.appendChild(buildRetentionSparkline(summary.snapshots));

        var foot = makePiEl('div', 'dtu-pi-foot');
        foot.appendChild(document.createTextNode('Peak '));
        foot.appendChild(makePiEl('b', null, String(summary.peakCount)));
        foot.appendChild(document.createTextNode(', low '));
        foot.appendChild(makePiEl('b', null, String(summary.lowCount)));
        foot.appendChild(document.createTextNode(', ' + summary.snapshotCount + ' counts'));
        col.appendChild(foot);
        return col;
    }

    var PI_VISIBLE_PROGRAMS = 6;
    var piShowAllPrograms = false;

    function buildCompositionColumn(sorted, totalWithProgram, totalUsers, loadedUsers, selfProgram) {
        var col = makePiEl('section', 'dtu-pi-col');
        col.setAttribute('data-dtu-intel-section', 'composition');
        col.setAttribute('aria-label', 'Course composition');
        var meta = loadedUsers < totalUsers
            ? 'First ' + loadedUsers + ' of ' + totalUsers + ' users, ' + totalWithProgram + ' with a program listed'
            : totalWithProgram + ' of ' + totalUsers + ' ' + (totalUsers === 1 ? 'user has' : 'users have') + ' a program listed';
        col.appendChild(makePiHead('Course composition', meta));

        if (!sorted.length) {
            col.appendChild(makePiEl('div', 'dtu-pi-note', 'No study programs are listed for the users on this page.'));
            return col;
        }

        var maxCount = sorted[0].count || 1;
        var list = makePiEl('ul', 'dtu-pi-rows');
        var hiddenRows = [];
        var hiddenUsers = 0;
        sorted.forEach(function (entry, i) {
            var row = makePiEl('li', 'dtu-pi-row');
            var isSelf = !!(selfProgram && entry.program === selfProgram);
            if (isSelf) row.setAttribute('data-mine', '1');
            var label = makePiEl('span', 'dtu-pi-label', entry.program);
            if (isSelf) label.appendChild(makePiEl('span', 'dtu-pi-mine', 'Your program'));
            row.appendChild(label);
            var pct = totalWithProgram > 0 ? Math.round(entry.count / totalWithProgram * 100) : 0;
            var num = makePiEl('span', 'dtu-pi-num');
            num.appendChild(makePiEl('b', null, String(entry.count)));
            num.appendChild(document.createTextNode(pct + '%'));
            row.appendChild(num);
            var track = makePiEl('span', 'dtu-pi-track');
            track.setAttribute('aria-hidden', 'true');
            var fill = makePiEl('span', 'dtu-pi-fill');
            fill.style.width = Math.max(2, Math.round(entry.count / maxCount * 100)) + '%';
            track.appendChild(fill);
            row.appendChild(track);
            if (i >= PI_VISIBLE_PROGRAMS && sorted.length > PI_VISIBLE_PROGRAMS + 1) {
                hiddenRows.push(row);
                hiddenUsers += entry.count;
                row.hidden = !piShowAllPrograms;
            }
            list.appendChild(row);
        });
        if (hiddenRows.length) list.id = 'dtu-pi-program-list';
        col.appendChild(list);

        if (hiddenRows.length) {
            var more = makePiEl('button', 'dtu-pi-more');
            more.type = 'button';
            more.setAttribute('aria-controls', 'dtu-pi-program-list');
            var collapsedText = 'Show ' + hiddenRows.length + ' more programs (' + hiddenUsers + ' ' + (hiddenUsers === 1 ? 'user' : 'users') + ')';
            function sync() {
                more.setAttribute('aria-expanded', piShowAllPrograms ? 'true' : 'false');
                more.textContent = piShowAllPrograms ? 'Show fewer programs' : collapsedText;
                hiddenRows.forEach(function (r) { r.hidden = !piShowAllPrograms; });
            }
            more.addEventListener('click', function () {
                piShowAllPrograms = !piShowAllPrograms;
                sync();
            });
            sync();
            col.appendChild(more);
        }
        return col;
    }

    function renderDemographicsCard(sorted, totalWithProgram, totalUsers, loadedUsers, selfProgram, retentionSummary) {
        var deps = getDeps();
        if (!deps) return;
        var anchor = deps.getCampusnetUsersAnchorElement();
        var listRoot = deps.getCampusnetParticipantsListRoot() || (anchor ? anchor.parentNode : null);
        if (!listRoot) return;
        var isDark = getIsDark();
        var sig = (isDark ? 'd' : 'l') + '|'
            + (selfProgram || '') + '|'
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
        placeParticipantIntelHost(card, listRoot);

        if (card.getAttribute('data-dtu-demographics-sig') === sig) return;
        card.setAttribute('data-dtu-demographics-sig', sig);

        var grid = prepareParticipantIntelHost(card, isDark);
        if (retentionSummary) grid.appendChild(buildRetentionColumn(retentionSummary));
        else grid.setAttribute('data-single', '1');
        grid.appendChild(buildCompositionColumn(sorted, totalWithProgram, totalUsers, loadedUsers, selfProgram));
    }

    function placeParticipantIntelHost(card, listRoot) {
        var insertionAnchor = listRoot.querySelector('.ui-participants-list-category') || listRoot.querySelector('.ui-participant-categorybar');
        if (insertionAnchor && insertionAnchor !== card) {
            if (card.parentNode !== listRoot || card.nextSibling !== insertionAnchor) {
                listRoot.insertBefore(card, insertionAnchor);
            }
        } else if (card.parentNode !== listRoot || listRoot.firstChild !== card) {
            listRoot.insertBefore(card, listRoot.firstChild);
        }
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
            if (!deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey)
                || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelSharedHistoryKey)) return;
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
                var sNumber = deps.getCampusnetParticipantSNumber(item);
                if (!sNumber) {
                    if (existingBadge) existingBadge.remove();
                    continue;
                }
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
                badge.style.setProperty('color', isDark ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep-text, var(--dtu-ad-accent-deep))', 'important');
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
            if (!deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey)
                || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelSharedHistoryKey)) return;
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

            card.style.cssText = 'margin:12px 0;padding:12px 16px;border-radius:8px;font-family:inherit;';
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

        // Groups inside a course get their own series, see getCampusnetRetentionKey.
        var rKey = deps.getCampusnetRetentionKey();
        if (!rKey) return;

        var count = deps.getCampusnetUsersCountFromPage();
        if (!count) count = deps.getCampusnetUsersParticipantElements().length;
        if (!count) return;

        retentionSnapshotInFlight = true;
        deps.loadParticipantIntel(function (intel) {
            retentionSnapshotInFlight = false;
            if (!deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey)
                || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelRetentionKey)) return;
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
        if (!deps || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey)
            || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelRetentionKey)) return;
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
        placeParticipantIntelHost(card, listRoot);

        var sig = (getIsDark() ? 'd' : 'l') + '|' + summary.latestCount + '|'
            + summary.snapshotCount + '|' + summary.baselineTs + '|' + summary.latestTs + '|'
            + summary.previousDeltaCount + '|' + summary.windowDeltaCount;
        if (card.getAttribute('data-dtu-retention-sig') === sig) return;
        card.setAttribute('data-dtu-retention-sig', sig);

        var grid = prepareParticipantIntelHost(card, getIsDark());
        grid.setAttribute('data-single', '1');
        grid.appendChild(buildRetentionColumn(summary));
    }

    globalThis.DTUAfterDarkParticipantIntelUi = {
        insertParticipantDemographics: insertParticipantDemographics,
        annotateParticipantHistory: annotateParticipantHistory,
        annotateProfileHistory: annotateProfileHistory,
        recordRetentionSnapshot: recordRetentionSnapshot
    };
})();
