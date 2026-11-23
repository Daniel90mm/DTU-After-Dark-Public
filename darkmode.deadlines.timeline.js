// Deadline timeline drawing: axis months, Today pill, lanes, bars, diamonds and label placement.
// Loaded after darkmode.deadlines.data.js and before darkmode.deadlines.js.
(function () {
    'use strict';
    var markExt = globalThis.DTUAfterDarkDom && globalThis.DTUAfterDarkDom.markExt;
    if (typeof markExt !== 'function') {
        throw new Error('darkmode.deadlines.timeline.js requires darkmode.dom.js loaded first');
    }
    var deadlineData = globalThis.DTUAfterDarkDeadlinesData;
    var requiredData = [
        'getDeadlineRowStartTs',
        'getDeadlineRowEndTs',
        'buildDeadlinePeriodGroups',
        'selectDeadlinePeriodGroups'
    ];
    if (!deadlineData || !Array.isArray(deadlineData.MONTH_NAMES)
        || requiredData.some(function (name) { return typeof deadlineData[name] !== 'function'; })) {
        throw new Error('darkmode.deadlines.timeline.js requires darkmode.deadlines.data.js loaded first');
    }
    var DEADLINE_MONTH_NAMES = deadlineData.MONTH_NAMES;
    var DEADLINES_TIMELINE_STYLE_ID = 'dtu-after-dark-deadlines-timeline-style';

    // Wording taken from DTU's own course-registration deadlines page, so the widget
    // explains a period the same way the source does.
    var DEADLINE_ACTION_EXPLAINERS = {
        'Supplementary registration': 'It will be possible to register for courses with vacant seats.'
    };

    var DEADLINE_AXIS_TAIL_DAYS = 10;

    function diffDaysUtc(fromTs, toTs) {
        return Math.round((toTs - fromTs) / 86400000);
    }

    function getDeadlineWindow(item, todayTs) {
        if (!item || typeof item.startTs !== 'number') return null;
        var start = item.startTs;
        var end = typeof item.endTs === 'number' ? item.endTs : null;
        if (end == null) {
            return { state: todayTs <= start ? 'upcoming' : 'past', nextTs: start };
        }
        if (todayTs < start) return { state: 'upcoming', nextTs: start };
        if (todayTs <= end) return { state: 'active', nextTs: end };
        return { state: 'past', nextTs: end };
    }

    function getDeadlineNextTs(item, todayTs) {
        var info = getDeadlineWindow(item, todayTs);
        return info ? info.nextTs : null;
    }

    function formatDeadlineRange(item) {
        if (!item) return '';
        var start = item.startIso ? String(item.startIso) : '';
        if (item.endIso) return start + ' - ' + String(item.endIso);
        return start;
    }

    function formatDeadlineIsoDate(iso) {
        var match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;
        return {
            day: parseInt(match[3], 10),
            month: DEADLINE_MONTH_NAMES[parseInt(match[2], 10) - 1] || match[2],
            year: match[1]
        };
    }

    function formatDeadlineRangeCompact(item) {
        if (!item) return '';
        var start = formatDeadlineIsoDate(item.startIso);
        if (!start) return formatDeadlineRange(item);
        var end = formatDeadlineIsoDate(item.endIso);
        if (!end) return start.day + ' ' + start.month + ' ' + start.year;
        if (start.year === end.year) {
            return start.day + ' ' + start.month + ' - ' + end.day + ' ' + end.month + ' ' + end.year;
        }
        return start.day + ' ' + start.month + ' ' + start.year + ' - '
            + end.day + ' ' + end.month + ' ' + end.year;
    }

    function deadlineActionName(label) {
        var lower = String(label || '').toLowerCase();
        if (/(withdrawal|withdraw|deregister|de-?register)/.test(lower)) return 'Withdrawal';
        if (/supplementary/.test(lower)) return 'Supplementary registration';
        if (/registration/.test(lower)) return 'Registration';
        if (/grading/.test(lower)) return 'Grading';
        return 'Action';
    }

    // Six calendar months from the start of the current one. That reaches the next
    // registration round for the following teaching period while keeping each month
    // wide enough for its marks to carry readable labels.
    // Given lastTs (the last mark to draw), the axis stops shortly after it instead, never

    function buildDeadlineTimelineAxis(todayTs, lastTs) {
        var todayDate = new Date(todayTs);
        var year = todayDate.getUTCFullYear();
        var month = todayDate.getUTCMonth();
        var startTs = Date.UTC(year, month, 1);
        var endTs = Date.UTC(year, month + 6, 1);
        if (typeof lastTs === 'number' && isFinite(lastTs)) {
            endTs = Math.min(endTs, Math.max(Date.UTC(year, month + 3, 1), lastTs + DEADLINE_AXIS_TAIL_DAYS * 86400000));
        }
        var spanTs = endTs - startTs;

        function percentFor(ts) {
            return Math.max(0, Math.min(100, ((Number(ts) - startTs) / spanTs) * 100));
        }

        var ticks = [];
        for (var i = 0; i < 6; i++) {
            var tickTs = Date.UTC(year, month + i, 1);
            if (tickTs >= endTs) break;
            var tickDate = new Date(tickTs);
            var label = DEADLINE_MONTH_NAMES[tickDate.getUTCMonth()];
            // The year only where it turns, so the axis never reads as the wrong January.
            if (tickDate.getUTCMonth() === 0) label += ' ' + tickDate.getUTCFullYear();
            ticks.push({ ts: tickTs, label: label, percent: percentFor(tickTs) });
        }

        var normalizedTodayTs = Date.UTC(year, month, todayDate.getUTCDate());
        return {
            startTs: startTs,
            endTs: endTs,
            todayTs: normalizedTodayTs,
            todayPercent: percentFor(normalizedTodayTs),
            ticks: ticks,
            percentFor: percentFor
        };
    }

    function selectDeadlineTimelineRows(rows, todayTs) {
        var axis = buildDeadlineTimelineAxis(todayTs);
        return (Array.isArray(rows) ? rows : []).filter(function (row) {
            if (!row) return false;
            var rowStartTs = deadlineData.getDeadlineRowStartTs(row);
            var rowEndTs = deadlineData.getDeadlineRowEndTs(row);
            return isFinite(rowStartTs) && isFinite(rowEndTs)
                && rowEndTs >= axis.startTs
                && rowStartTs <= axis.endTs;
        });
    }

    function formatDeadlineDayMonth(ts, todayTs, forceYear) {
        var date = new Date(ts);
        var text = date.getUTCDate() + ' ' + DEADLINE_MONTH_NAMES[date.getUTCMonth()];
        if (forceYear || (todayTs != null && new Date(todayTs).getUTCFullYear() !== date.getUTCFullYear())) {
            text += ' ' + date.getUTCFullYear();
        }
        return text;
    }

    function formatDeadlineSpan(startTs, endTs) {
        var start = new Date(startTs);
        var end = new Date(endTs);
        var sameMonth = start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth();
        return (sameMonth ? String(start.getUTCDate()) : formatDeadlineDayMonth(startTs))
            + ' to ' + formatDeadlineDayMonth(endTs);
    }

    function describeDeadlinePeriod(group) {
        if (!group || group.startTs == null || group.endTs == null) return '';
        return (group.kind === 'exam' ? 'Exam period ' : 'Teaching ') + formatDeadlineSpan(group.startTs, group.endTs);
    }

    function deadlineMarkName(row) {
        var action = deadlineActionName(row && row.label);
        if (action === 'Supplementary registration') return 'Supplementary';
        if (action === 'Action') return String(row && row.label || '').trim();
        return action;
    }

    // Each mark carries its name and dates as a label: above the bar on the upper lane,
    // below it on the lower lane. A mark takes the upper lane unless its bar or label would
    // collide there. Label width is estimated from the character count and the track width.
    // A label that fits on neither lane is left off; its mark still names it in the tooltip.
    var DEADLINE_LABEL_PX_PER_CHAR = 6.2;
    // Period name column plus the gap to the track, as set in the grid rule below.
    var DEADLINE_LABEL_COLUMN_PX = 222;
    var DEADLINE_DEFAULT_TRACK_PX = 620;

    function deadlineSpansClash(spans, from, to, gap) {
        return spans.some(function (span) { return from < span[1] + gap && to > span[0] - gap; });
    }

    function layoutDeadlinePeriodMarks(group, axis, trackPx) {
        var charPercent = (DEADLINE_LABEL_PX_PER_CHAR / (trackPx > 0 ? trackPx : DEADLINE_DEFAULT_TRACK_PX)) * 100;
        var marks = group.rows.map(function (row) {
            var startTs = deadlineData.getDeadlineRowStartTs(row);
            var endTs = deadlineData.getDeadlineRowEndTs(row);
            var isRange = endTs > startTs;
            var name = deadlineMarkName(row);
            var startPercent = axis.percentFor(startTs);
            var continuesBefore = isRange && startTs < axis.startTs;
            var continuesAfter = isRange && endTs > axis.endTs;
            var dateText = formatDeadlineDayMonth(startTs);
            if (isRange) {
                dateText = continuesBefore
                    ? (continuesAfter ? '' : 'until ' + formatDeadlineDayMonth(endTs))
                    : (continuesAfter ? 'from ' + formatDeadlineDayMonth(startTs) : formatDeadlineSpan(startTs, endTs));
            }
            return {
                row: row,
                type: isRange ? 'range' : 'date',
                startPercent: startPercent,
                endPercent: isRange ? Math.min(100, Math.max(startPercent + 0.8, axis.percentFor(endTs))) : startPercent,
                continuesBefore: continuesBefore,
                continuesAfter: continuesAfter,
                soft: deadlineActionName(row.label) === 'Supplementary registration',
                name: name,
                dateText: dateText,
                label: isRange ? name : (name + ' ' + dateText),
                lane: 1
            };
        });

        var bars = [[], []];
        var labels = [[], []];
        marks.slice().sort(function (a, b) {
            return a.startPercent - b.startPercent || a.endPercent - b.endPercent;
        }).forEach(function (mark) {
            var width = (mark.name.length + 1 + mark.dateText.length) * charPercent;
            var from = mark.startPercent;
            mark.labelAlignEnd = from + width > 100;
            if (mark.labelAlignEnd) from = mark.endPercent - width;
            var to = from + width;
            var labelFits = from >= 0 && !!mark.label;
            var lane = -1;
            var barLane = -1;
            for (var i = 0; i < 2; i++) {
                if (deadlineSpansClash(bars[i], mark.startPercent, mark.endPercent, 0.6)) continue;
                if (barLane < 0) barLane = i;
                if (lane < 0 && labelFits && !deadlineSpansClash(labels[i], from, to, 1)) lane = i;
            }
            mark.showLabel = lane >= 0;
            mark.lane = lane >= 0 ? lane : (barLane >= 0 ? barLane : 1);
            mark.labelPercent = mark.labelAlignEnd ? mark.endPercent : mark.startPercent;
            bars[mark.lane].push([mark.startPercent, mark.endPercent]);
            if (mark.showLabel) labels[mark.lane].push([from, to]);
        });
        return marks;
    }

    function formatDeadlinePeriodStatus(row, todayTs, withName) {
        var nextTs = getDeadlineNextTs(row, todayTs);
        if (nextTs == null) return { text: '', date: '', urgent: false };
        var days = diffDaysUtc(todayTs, nextTs);
        var active = !!(row && row.state === 'active');
        var isRange = row.endTs != null && row.endTs > row.startTs;
        var verb = active ? 'Closes' : ((isRange && todayTs < row.startTs) ? 'Opens' : 'Due');
        var when = days <= 0 ? 'today' : (days === 1 ? 'tomorrow' : ('in ' + days + ' days'));
        var text = verb + ' ' + when;
        if (withName) {
            var name = deadlineMarkName(row);
            if (name) text = name + ' ' + text.charAt(0).toLowerCase() + text.slice(1);
        }
        return {
            text: text,
            date: formatDeadlineDayMonth(nextTs, todayTs),
            urgent: active || days <= 7
        };
    }

    function deadlineTimelineTooltipContent(row) {
        var periods = deadlineData.getDeadlinePeriodLabels(row).map(function (period) {
            return String(period || '')
                .split(':')[0]
                .replace(/\b(\d+)-weeks\b/gi, '$1-week')
                .trim();
        }).filter(Boolean);
        var action = deadlineActionName(row && row.label);
        return {
            title: String(row && row.label || '').trim(),
            description: DEADLINE_ACTION_EXPLAINERS[action] || '',
            period: periods.join(' / '),
            date: formatDeadlineRangeCompact(row)
        };
    }

    function joinDeadlineTooltipParts(parts) {
        var normalized = (Array.isArray(parts) ? parts : []).map(function (part) {
            return String(part || '').trim().replace(/[.\s]+$/g, '');
        }).filter(Boolean);
        return normalized.length ? (normalized.join('. ') + '.') : '';
    }

    function deadlineTimelineAccessibleLabel(row) {
        var content = deadlineTimelineTooltipContent(row);
        return joinDeadlineTooltipParts([content.title, content.description, content.period, content.date]);
    }

    function ensureDeadlinesTimelineStyles() {
        if (!document || !document.head || document.getElementById(DEADLINES_TIMELINE_STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = DEADLINES_TIMELINE_STYLE_ID;
        style.textContent = [
            '/* Hallmark - pre-emit critique: P5 H5 E4 S5 R5 V5 */',
            '/* Hallmark - component: deadline timeline by period - theme: DTU After Dark',
            ' * One row per teaching or exam period, marks labelled in place with their dates, the period as a thin neutral bar,',
            ' * accent only for what is open or due within 7 days.',
            ' * states: passive visualization; marks are focusable and show their tooltip on hover and focus',
            ' */',
            '.dtu-deadline-timeline{--deadline-accent:var(--dtu-ad-accent-mark-light,var(--dtu-ad-accent-deep-text,#990000));--deadline-grid:rgba(31,41,55,.14);--deadline-rule:rgba(26,26,26,.06);--deadline-band:rgba(26,26,26,.24);--deadline-text:#1a1a1a;--deadline-muted:#686868;--deadline-surface:#fff;display:block;min-width:0;padding:2px 0 0;container-type:inline-size;font-variant-numeric:tabular-nums;}',
            '.dtu-deadline-timeline[data-theme="dark"]{--deadline-accent:var(--dtu-ad-accent-mark-dark,var(--dtu-ad-accent-soft,#ff6b6b));--deadline-grid:rgba(255,255,255,.11);--deadline-rule:rgba(255,255,255,.07);--deadline-band:rgba(255,255,255,.2);--deadline-text:#f0eee8;--deadline-muted:#aaa9a5;--deadline-surface:#2d2d2d;}',
            '.dtu-deadline-timeline-axis,.dtu-deadline-period{display:grid;grid-template-columns:200px minmax(0,1fr);column-gap:22px;min-width:0;}',
            '.dtu-deadline-timeline-axis{align-items:end;}',
            '.dtu-deadline-timeline-track{position:relative;min-width:0;}',
            '.dtu-deadline-timeline-axis .dtu-deadline-timeline-track{height:44px;}',
            '.dtu-deadline-timeline-tick-label{position:absolute;bottom:5px;padding-left:5px;font-size:11px;line-height:14px;color:var(--deadline-muted);white-space:nowrap;}',
            '.dtu-deadline-timeline-today-label{position:absolute;top:0;transform:translateX(-50%);padding:2px 8px;border-radius:9px;background:var(--deadline-accent);font-size:11px;font-weight:700;line-height:14px;color:var(--deadline-surface);white-space:nowrap;}',
            '.dtu-deadline-timeline-today-label.align-start{transform:none;}',
            '.dtu-deadline-timeline-today-label.align-end{transform:translateX(-100%);}',
            '.dtu-deadline-period{align-items:center;border-top:1px solid var(--deadline-grid);}',
            '.dtu-deadline-period-label{min-width:0;padding:12px 0;}',
            '.dtu-deadline-period-name{font-size:14px;line-height:18px;color:var(--deadline-text);overflow-wrap:anywhere;}',
            '.dtu-deadline-period-sub,.dtu-deadline-period-status{margin-top:3px;font-size:12px;line-height:15px;color:var(--deadline-muted);}',
            '.dtu-deadline-period-status.is-accent{font-weight:700;color:var(--deadline-accent);}',
            '.dtu-deadline-period .dtu-deadline-timeline-track{align-self:stretch;height:110px;}',
            '.dtu-deadline-period.is-single-lane .dtu-deadline-timeline-track{height:80px;}',
            '.dtu-deadline-period.is-compact .dtu-deadline-period-label{padding:6px 0;}',
            '.dtu-deadline-period.is-compact .dtu-deadline-timeline-track{height:46px;}',
            '.dtu-deadline-timeline-tick{position:absolute;top:0;bottom:0;width:1px;background:var(--deadline-rule);pointer-events:none;}',
            '.dtu-deadline-period-band{position:absolute;top:82px;height:4px;border-radius:2px;background:var(--deadline-band);pointer-events:none;}',
            '.dtu-deadline-period-band.is-clipped-start{border-top-left-radius:0;border-bottom-left-radius:0;}',
            '.dtu-deadline-period-band.is-clipped-end{border-top-right-radius:0;border-bottom-right-radius:0;}',
            '.dtu-deadline-period-band-label{position:absolute;top:89px;font-size:11px;line-height:14px;color:var(--deadline-muted);white-space:nowrap;pointer-events:none;}',
            '.dtu-deadline-period-band-label.align-end{transform:translateX(-100%);}',
            '.dtu-deadline-period.is-single-lane .dtu-deadline-period-band{top:52px;}',
            '.dtu-deadline-period.is-single-lane .dtu-deadline-period-band-label{top:59px;}',
            // Keep the timeline's z-indexes (4 to 40) inside the widget: DTU's evaluation reminder (#nagModal,
            // dtu.imsbroker.dk nagwidget) is position:fixed at z-index 1, and the Today line and labels drew over it.
            '.dtu-deadlines-home-widget{isolation:isolate;}',
            '.dtu-deadline-timeline-today{position:absolute;top:0;bottom:-1px;z-index:4;width:2px;margin-left:-1px;background:var(--deadline-accent);pointer-events:none;}',
            // Every mark is drawn in the accent at full strength. --dtu-ad-accent-mark-* is the accent,
            // or the preset's own shade for this surface, at 4.5:1 or better (see darkmode.js), so
            // pale presets like DTU Grey and dark ones like Navy both stay visible and keep their hue.
            // Supplementary windows are told apart by an outline rather than by fading the colour.
            '.dtu-deadline-timeline-bar{position:absolute;height:8px;min-width:4px;border-radius:4px;background:var(--deadline-accent);cursor:help;}',
            '.dtu-deadline-timeline-bar.is-lane-0{top:28px;}',
            '.dtu-deadline-timeline-bar.is-lane-1{top:46px;}',
            '.dtu-deadline-timeline-bar.is-active{height:10px;margin-top:-1px;border-radius:5px;}',
            // A window that runs past the axis ends square at that edge.
            '.dtu-deadline-timeline-bar.is-clipped-start{border-top-left-radius:0;border-bottom-left-radius:0;}',
            '.dtu-deadline-timeline-bar.is-clipped-end{border-top-right-radius:0;border-bottom-right-radius:0;}',
            '.dtu-deadline-timeline-bar.is-soft{background:transparent;box-shadow:inset 0 0 0 1.5px var(--deadline-accent);}',
            '.dtu-deadline-timeline-bar.is-soft.is-clipped-start{box-shadow:inset 0 1.5px 0 var(--deadline-accent),inset 0 -1.5px 0 var(--deadline-accent),inset -1.5px 0 0 var(--deadline-accent);}',
            '.dtu-deadline-timeline-bar.is-soft.is-clipped-end{box-shadow:inset 0 1.5px 0 var(--deadline-accent),inset 0 -1.5px 0 var(--deadline-accent),inset 1.5px 0 0 var(--deadline-accent);}',
            '.dtu-deadline-timeline-bar.is-soft.is-clipped-start.is-clipped-end{box-shadow:inset 0 1.5px 0 var(--deadline-accent),inset 0 -1.5px 0 var(--deadline-accent);}',
            // The diamond is drawn on ::before so the tooltip inside the mark is not rotated with it.
            '.dtu-deadline-timeline-date-mark{position:absolute;width:10px;height:10px;margin-left:-5px;cursor:help;}',
            '.dtu-deadline-timeline-date-mark::before{content:"";position:absolute;inset:0;border-radius:2px;background:var(--deadline-accent);transform:rotate(45deg);}',
            '.dtu-deadline-timeline-date-mark.is-lane-0{top:27px;}',
            '.dtu-deadline-timeline-date-mark.is-lane-1{top:45px;}',
            '.dtu-deadline-timeline-bar::after,.dtu-deadline-timeline-date-mark::after{content:"";position:absolute;background:transparent;}',
            '.dtu-deadline-timeline-bar::after{inset:-9px -6px;}',
            '.dtu-deadline-timeline-date-mark::after{inset:-6px;}',
            // The label sits over the Today line on its own patch of surface, so the line never strikes through text.
            '.dtu-deadline-mark-label{position:absolute;z-index:5;margin-left:-3px;padding:0 3px;background:var(--deadline-surface);font-size:11px;line-height:14px;color:var(--deadline-muted);white-space:nowrap;pointer-events:none;}',
            '.dtu-deadline-mark-name{margin-right:5px;font-weight:700;color:var(--deadline-text);}',
            '.dtu-deadline-mark-label.is-above{top:9px;}',
            '.dtu-deadline-mark-label.is-below{top:60px;}',
            '.dtu-deadline-mark-label.align-end{margin-left:3px;transform:translateX(-100%);}',
            '.dtu-deadline-mark-label.is-accent .dtu-deadline-mark-name{color:var(--deadline-accent);}',
            '.dtu-deadline-timeline-bar:focus-visible,.dtu-deadline-timeline-date-mark:focus-visible{outline:2px solid var(--deadline-text);outline-offset:3px;}',
            '.dtu-deadline-timeline-bar:hover,.dtu-deadline-timeline-bar:focus,.dtu-deadline-timeline-date-mark:hover,.dtu-deadline-timeline-date-mark:focus{z-index:30;}',
            '.dtu-deadline-mark-tooltip{display:none;position:absolute;left:50%;bottom:calc(100% + 7px);z-index:40;width:max-content;max-width:min(280px,50vw);padding:8px 10px;border:1px solid var(--deadline-grid);border-radius:3px;background:var(--deadline-surface);color:var(--deadline-text);box-shadow:0 4px 14px rgba(0,0,0,.22);font-size:11px;font-weight:400;line-height:15px;text-align:left;white-space:normal;pointer-events:auto;transform:translateX(-50%);}',
            '.dtu-deadline-mark-tooltip-title{display:block;font-size:12px;font-weight:700;line-height:16px;color:var(--deadline-text);}',
            '.dtu-deadline-mark-tooltip-description{display:block;margin-top:3px;color:var(--deadline-text);}',
            '.dtu-deadline-mark-tooltip-item{display:block;margin-top:6px;padding-top:5px;border-top:1px solid var(--deadline-grid);}',
            '.dtu-deadline-mark-tooltip-item-title{display:block;font-weight:700;color:var(--deadline-text);}',
            '.dtu-deadline-mark-tooltip-period{display:block;margin-top:3px;color:var(--deadline-muted);}',
            '.dtu-deadline-mark-tooltip-date{display:block;margin-top:1px;color:var(--deadline-text);}',
            '.dtu-deadline-timeline-bar:hover>.dtu-deadline-mark-tooltip,.dtu-deadline-timeline-bar:focus>.dtu-deadline-mark-tooltip,.dtu-deadline-timeline-date-mark:hover>.dtu-deadline-mark-tooltip,.dtu-deadline-timeline-date-mark:focus>.dtu-deadline-mark-tooltip{display:block;}',
            '.tooltip-align-start>.dtu-deadline-mark-tooltip{left:0;transform:none;}',
            '.tooltip-align-end>.dtu-deadline-mark-tooltip{right:0;left:auto;transform:none;}',
            '.dtu-deadline-timeline-status{padding:12px 0;text-align:right;min-width:0;}',
            '.dtu-deadline-timeline-status-text{font-size:13px;line-height:17px;color:var(--deadline-text);white-space:nowrap;}',
            '.dtu-deadline-timeline-status-text.is-accent{font-weight:700;color:var(--deadline-accent);}',
            '.dtu-deadline-timeline-date{margin-top:2px;font-size:12px;line-height:15px;color:var(--deadline-muted);}',
            '.dtu-deadline-mobile-list{display:none;}',
            '.dtu-deadline-period-mobile{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:12px;padding:10px 0;border-top:1px solid var(--deadline-grid);}',
            '.dtu-deadline-period-mobile .dtu-deadline-timeline-status{padding:0;}',
            '.dtu-deadline-period-detail{margin-top:4px;font-size:12px;line-height:16px;color:var(--deadline-text);}',
            '.dtu-deadline-a11y-list{display:block;position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0;}',
            '@container(max-width:760px){.dtu-deadline-timeline-desktop{display:none;}.dtu-deadline-mobile-list{display:block;}}',
            '@media(max-width:780px){.dtu-deadline-timeline-desktop{display:none;}.dtu-deadline-mobile-list{display:block;}}',
            '.dtu-deadlines-home-widget [data-dtu-ext] a:focus-visible,.dtu-deadlines-home-widget button[data-dtu-ext]:focus-visible,.dtu-deadlines-home-widget a[data-dtu-ext]:focus-visible{outline:2px solid currentColor !important;outline-offset:2px !important;}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function createTimelinePositionedElement(className, percent) {
        var element = document.createElement('div');
        markExt(element);
        element.className = className;
        element.style.left = Math.max(0, Math.min(100, Number(percent || 0))) + '%';
        return element;
    }

    function attachDeadlineMarkTooltip(mark, detail, percent) {
        var normalizedPercent = Number(percent || 0);
        var accessibleDetail = typeof detail === 'string'
            ? detail
            : (detail.items
                ? joinDeadlineTooltipParts([detail.title].concat(detail.items.map(function (item) {
                    return joinDeadlineTooltipParts([item.title, item.description, item.period, item.date]);
                })))
                : joinDeadlineTooltipParts([detail.title, detail.description, detail.period, detail.date]));
        if (normalizedPercent < 18) mark.className += ' tooltip-align-start';
        if (normalizedPercent > 82) mark.className += ' tooltip-align-end';
        mark.setAttribute('role', 'img');
        mark.setAttribute('tabindex', '0');
        mark.setAttribute('aria-label', accessibleDetail);
        var tooltip = document.createElement('span');
        markExt(tooltip);
        tooltip.className = 'dtu-deadline-mark-tooltip';
        tooltip.setAttribute('role', 'tooltip');
        if (typeof detail === 'string') {
            tooltip.textContent = detail;
        } else {
            function appendTooltipLine(parent, className, text) {
                if (!text) return;
                var line = document.createElement('span');
                markExt(line);
                line.className = className;
                line.textContent = text;
                parent.appendChild(line);
            }
            appendTooltipLine(tooltip, 'dtu-deadline-mark-tooltip-title', detail.title);
            (detail.items || [detail]).forEach(function (item) {
                var parent = tooltip;
                if (detail.items) {
                    parent = document.createElement('span');
                    markExt(parent);
                    parent.className = 'dtu-deadline-mark-tooltip-item';
                    tooltip.appendChild(parent);
                    appendTooltipLine(parent, 'dtu-deadline-mark-tooltip-item-title', item.title);
                }
                [
                    ['dtu-deadline-mark-tooltip-description', item.description],
                    ['dtu-deadline-mark-tooltip-period', item.period],
                    ['dtu-deadline-mark-tooltip-date', item.date]
                ].forEach(function (definition) {
                    if (!definition[1]) return;
                    appendTooltipLine(parent, definition[0], definition[1]);
                });
            });
        }
        mark.appendChild(tooltip);
    }

    function createDeadlineTimelineElement(tagName, className, text) {
        var element = document.createElement(tagName);
        markExt(element);
        if (className) element.className = className;
        if (text != null) element.textContent = text;
        return element;
    }

    function createDeadlineStatusElement(group, todayTs) {
        var info = formatDeadlinePeriodStatus(group.nextRow, todayTs);
        var status = createDeadlineTimelineElement('div', 'dtu-deadline-timeline-status');
        status.appendChild(createDeadlineTimelineElement('div',
            'dtu-deadline-timeline-status-text' + (info.urgent ? ' is-accent' : ''), info.text));
        status.appendChild(createDeadlineTimelineElement('div', 'dtu-deadline-timeline-date', info.date));
        return status;
    }

    function createDeadlinePeriodLabel(group, next, periodText) {
        var label = createDeadlineTimelineElement('div', 'dtu-deadline-period-label');
        label.appendChild(createDeadlineTimelineElement('div', 'dtu-deadline-period-name', group.name));
        if (next && next.text) {
            label.appendChild(createDeadlineTimelineElement('div',
                'dtu-deadline-period-status' + (next.urgent ? ' is-accent' : ''), next.text));
        }
        if (periodText) label.appendChild(createDeadlineTimelineElement('div', 'dtu-deadline-period-sub', periodText));
        return label;
    }

    function createDeadlinePeriodRow(group, axis, todayTs, trackPx) {
        var row = createDeadlineTimelineElement('div', 'dtu-deadline-period');
        var track = createDeadlineTimelineElement('div', 'dtu-deadline-timeline-track');
        track.setAttribute('aria-label', group.name + ', ' + group.rows.length
            + (group.rows.length === 1 ? ' deadline' : ' deadlines'));

        axis.ticks.slice(1).forEach(function (tick) {
            track.appendChild(createTimelinePositionedElement('dtu-deadline-timeline-tick', tick.percent));
        });

        var marks = layoutDeadlinePeriodMarks(group, axis, trackPx);
        if (!marks.some(function (mark) { return mark.lane === 1; })) row.className += ' is-single-lane';
        // The exchange row holds one dated mark and no period, so it gets a slim row.
        if (group.kind === 'exchange') row.className += ' is-compact';

        // The teaching or exam period itself: a thin neutral bar under the marks, named in place.
        var periodText = describeDeadlinePeriod(group);
        var bandDrawn = !!periodText && group.endTs >= axis.startTs && group.startTs < axis.endTs;
        if (bandDrawn) {
            var bandStart = axis.percentFor(group.startTs);
            var band = createTimelinePositionedElement('dtu-deadline-period-band', bandStart);
            // The period's last day is inclusive, so the band runs to the end of that day.
            band.style.width = Math.max(0.8, axis.percentFor(group.endTs + 86400000) - bandStart) + '%';
            if (group.startTs < axis.startTs) band.className += ' is-clipped-start';
            if (group.endTs > axis.endTs) band.className += ' is-clipped-end';
            track.appendChild(band);
            var bandLabelEnd = bandStart + periodText.length * (DEADLINE_LABEL_PX_PER_CHAR / (trackPx > 0 ? trackPx : DEADLINE_DEFAULT_TRACK_PX)) * 100 > 100;
            var bandLabel = createTimelinePositionedElement('dtu-deadline-period-band-label', bandLabelEnd ? 100 : bandStart);
            if (bandLabelEnd) bandLabel.className += ' align-end';
            bandLabel.textContent = periodText;
            track.appendChild(bandLabel);
        }

        marks.forEach(function (mark) {
            var status = formatDeadlinePeriodStatus(mark.row, todayTs);
            var element;
            if (mark.type === 'range') {
                element = createTimelinePositionedElement('dtu-deadline-timeline-bar is-lane-' + mark.lane, mark.startPercent);
                element.style.width = Math.max(0.8, mark.endPercent - mark.startPercent) + '%';
                if (mark.row.state === 'active') element.className += ' is-active';
                else if (mark.soft) element.className += ' is-soft';
                if (mark.continuesBefore) element.className += ' is-clipped-start';
                if (mark.continuesAfter) element.className += ' is-clipped-end';
                if (mark.continuesBefore || mark.continuesAfter) {
                    element.style.webkitMaskImage = 'none';
                    element.style.maskImage = 'none';
                }
            } else {
                element = createTimelinePositionedElement('dtu-deadline-timeline-date-mark is-lane-' + mark.lane, mark.startPercent);
                if (status.urgent) element.className += ' is-soon';
            }
            attachDeadlineMarkTooltip(element, deadlineTimelineTooltipContent(mark.row), mark.startPercent);
            track.appendChild(element);

            if (!mark.showLabel) return;
            var text = createTimelinePositionedElement('dtu-deadline-mark-label ' + (mark.lane === 0 ? 'is-above' : 'is-below'), mark.labelPercent);
            if (mark.labelAlignEnd) text.className += ' align-end';
            if (mark.row.state === 'active' || (mark.type === 'date' && status.urgent)) text.className += ' is-accent';
            text.setAttribute('aria-hidden', 'true');
            text.appendChild(createDeadlineTimelineElement('span', 'dtu-deadline-mark-name', mark.name));
            if (mark.dateText) text.appendChild(createDeadlineTimelineElement('span', 'dtu-deadline-mark-dates', mark.dateText));
            track.appendChild(text);
        });

        track.appendChild(createTimelinePositionedElement('dtu-deadline-timeline-today', axis.todayPercent));

        var next = formatDeadlinePeriodStatus(group.nextRow, todayTs, true);
        // A period that starts after the axis ends has no bar to name it, so it is named here.
        var label = createDeadlinePeriodLabel(group, next, (periodText && !bandDrawn) ? periodText : '');
        row.appendChild(label);
        row.appendChild(track);
        return row;
    }

    // Narrow widths drop the chart and list each period's dates as text.
    function createDeadlinePeriodMobileRow(group, todayTs) {
        var row = createDeadlineTimelineElement('div', 'dtu-deadline-period-mobile');
        var label = createDeadlinePeriodLabel(group, null, describeDeadlinePeriod(group));
        label.className = '';
        label.style.minWidth = '0';
        var detail = group.rows.map(function (entry) {
            var startTs = deadlineData.getDeadlineRowStartTs(entry);
            var endTs = deadlineData.getDeadlineRowEndTs(entry);
            return deadlineMarkName(entry) + ' ' + (endTs > startTs ? formatDeadlineSpan(startTs, endTs) : formatDeadlineDayMonth(startTs));
        }).join(', ');
        label.appendChild(createDeadlineTimelineElement('div', 'dtu-deadline-period-detail', detail));
        row.appendChild(label);
        row.appendChild(createDeadlineStatusElement(group, todayTs));
        return row;
    }

    // widthPx is the widget's width when known; it only sharpens the label collision estimate.
    function createDeadlinesTimeline(rows, todayTs, dark, widthPx) {
        if (typeof dark !== 'boolean') {
            throw new Error('DTUAfterDarkDeadlinesTimeline.createDeadlinesTimeline requires a boolean dark argument');
        }
        var horizon = buildDeadlineTimelineAxis(todayTs);
        var groups = deadlineData.selectDeadlinePeriodGroups(
            deadlineData.buildDeadlinePeriodGroups(selectDeadlineTimelineRows(rows, todayTs)), todayTs);
        var visibleRows = [];
        var lastTs = todayTs;
        groups.forEach(function (group) {
            group.rows.forEach(function (row) {
                if (visibleRows.indexOf(row) === -1) visibleRows.push(row);
                lastTs = Math.max(lastTs, Math.min(horizon.endTs, deadlineData.getDeadlineRowEndTs(row)));
            });
        });
        var axis = buildDeadlineTimelineAxis(todayTs, lastTs);
        var trackPx = widthPx > 0 ? Math.max(420, widthPx - DEADLINE_LABEL_COLUMN_PX) : 0;
        visibleRows.sort(function (a, b) { return a.nextTs - b.nextTs; });
        var root = createDeadlineTimelineElement('div', 'dtu-deadline-timeline');
        root.setAttribute('data-theme', dark ? 'dark' : 'light');
        root.setAttribute('role', 'group');
        root.setAttribute('aria-label', 'Course and exam deadlines by period, '
            + axis.ticks[0].label + ' to ' + axis.ticks[axis.ticks.length - 1].label);

        var desktop = createDeadlineTimelineElement('div', 'dtu-deadline-timeline-desktop');
        var axisRow = createDeadlineTimelineElement('div', 'dtu-deadline-timeline-axis');
        axisRow.appendChild(createDeadlineTimelineElement('div'));
        var axisTrack = createDeadlineTimelineElement('div', 'dtu-deadline-timeline-track');
        axisTrack.setAttribute('aria-hidden', 'true');
        axis.ticks.forEach(function (tick) {
            var tickLabel = createTimelinePositionedElement('dtu-deadline-timeline-tick-label', tick.percent);
            tickLabel.textContent = tick.label;
            axisTrack.appendChild(tickLabel);
        });
        var todayLabel = createTimelinePositionedElement('dtu-deadline-timeline-today-label', axis.todayPercent);
        if (axis.todayPercent < 6) todayLabel.className += ' align-start';
        if (axis.todayPercent > 94) todayLabel.className += ' align-end';
        todayLabel.textContent = 'Today ' + formatDeadlineDayMonth(axis.todayTs);
        axisTrack.appendChild(todayLabel);
        axisRow.appendChild(axisTrack);
        desktop.appendChild(axisRow);

        var mobile = createDeadlineTimelineElement('div', 'dtu-deadline-mobile-list');
        groups.forEach(function (group) {
            desktop.appendChild(createDeadlinePeriodRow(group, axis, todayTs, trackPx));
            mobile.appendChild(createDeadlinePeriodMobileRow(group, todayTs));
        });

        var accessibleList = createDeadlineTimelineElement('ul', 'dtu-deadline-a11y-list');
        accessibleList.setAttribute('aria-label', 'All upcoming course and exam deadlines');
        visibleRows.forEach(function (row) {
            accessibleList.appendChild(createDeadlineTimelineElement('li', null, deadlineTimelineAccessibleLabel(row)));
        });
        root.appendChild(desktop);
        root.appendChild(mobile);
        root.appendChild(accessibleList);
        return root;
    }


    globalThis.DTUAfterDarkDeadlinesTimeline = {
        getDeadlineWindow: getDeadlineWindow,
        buildDeadlineTimelineAxis: buildDeadlineTimelineAxis,
        selectDeadlineTimelineRows: selectDeadlineTimelineRows,
        formatDeadlineDayMonth: formatDeadlineDayMonth,
        ensureDeadlinesTimelineStyles: ensureDeadlinesTimelineStyles,
        createDeadlinesTimeline: createDeadlinesTimeline
    };
})();
