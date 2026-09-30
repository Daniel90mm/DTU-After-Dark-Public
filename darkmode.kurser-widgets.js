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

    function getGradeStatsFeatureKey() {
        var deps = getDeps();
        return deps && deps.featureKurserGradeStatsKey;
    }

    var _gradeStatsRequested = false;
    var _gradeStatsCourseCode = null;

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


    // --- Course widgets layout (shared with darkmode.kurser-course-eval.js) ---
    //
    // Grades and the student evaluation sit side by side as two open columns
    // split by a hairline, with no boxes. All colours come from custom
    // properties set on the grid, so dark mode, light mode and the user's
    // accent flow through one stylesheet. The accent is reserved for the
    // selected exam and links; grade bars stay neutral because the accent may
    // be red, which would read as "failed".

    var COURSE_WIDGETS_STYLE_ID = 'dtu-course-widgets-style';

    var COURSE_WIDGETS_CSS = [
        '[data-dtu-course-widgets-grid]{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;align-items:stretch!important;width:100%;max-width:1160px;margin:16px 0 22px;padding:0!important;box-sizing:border-box;background:transparent!important;border:0!important;box-shadow:none!important;color:var(--dtu-cw-ink);font-family:Lato,"Lucida Sans Unicode","Lucida Grande",sans-serif;font-size:14px;font-weight:400!important;line-height:1.4;font-variant-numeric:tabular-nums;text-align:left}',
        '[data-dtu-course-widgets-grid][data-dtu-cw-single],[data-dtu-course-widgets-grid][data-dtu-cw-both-empty]{grid-template-columns:minmax(0,1fr)!important}',
        '.dtu-cw-col{min-width:0;display:flex;flex-direction:column;gap:16px;margin:0!important;padding:4px 0!important;box-sizing:border-box;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;color:var(--dtu-cw-ink);container-type:inline-size}',
        '[data-dtu-course-widgets-grid]:not([data-dtu-cw-single]) > .dtu-cw-col:first-child{padding-right:40px!important}',
        '[data-dtu-course-widgets-grid]:not([data-dtu-cw-single]) > .dtu-cw-col + .dtu-cw-col{padding-left:40px!important;border-left:1px solid var(--dtu-cw-divider)!important}',
        '[data-dtu-course-widgets-grid][data-dtu-cw-both-empty] > [data-dtu-course-eval]{display:none!important}',
        '[data-dtu-course-widgets-grid][data-dtu-cw-both-empty] > .dtu-cw-col:first-child{padding-right:0!important}',
        '.dtu-cw-both{display:none}',
        '[data-dtu-cw-both-empty] .dtu-cw-both{display:inline}',
        '[data-dtu-cw-both-empty] .dtu-cw-only{display:none}',
        '@media (max-width:991px){[data-dtu-course-widgets-grid]{grid-template-columns:minmax(0,1fr)!important}[data-dtu-course-widgets-grid]:not([data-dtu-cw-single]) > .dtu-cw-col:first-child{padding-right:0!important}[data-dtu-course-widgets-grid]:not([data-dtu-cw-single]) > .dtu-cw-col + .dtu-cw-col{padding-left:0!important;border-left:0!important;border-top:1px solid var(--dtu-cw-divider)!important;margin-top:24px!important;padding-top:24px!important}}',
        '.dtu-cw-col *{box-sizing:border-box}',
        // DTU's own CSS bolds whatever sits second in #pagecontents, which is this grid.
        '.dtu-cw-col{font-weight:400!important}',
        '.dtu-cw-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;min-width:0}',
        '.dtu-cw-title{font-size:15px;font-weight:700;color:var(--dtu-cw-ink)!important}',
        '.dtu-cw-meta{font-size:13px;color:var(--dtu-cw-muted)!important;text-align:right;min-width:0}',
        '.dtu-cw-status{font-size:13px;color:var(--dtu-cw-muted)!important;line-height:1.45}',
        '.dtu-cw-empty{display:flex;flex-direction:column;gap:4px;max-width:420px}',
        '.dtu-cw-empty-lead{font-size:14px;color:var(--dtu-cw-ink)!important}',
        '.dtu-cw-chips{display:flex;flex-wrap:wrap;gap:8px}',
        '@container (max-width:470px){.dtu-cw-chips{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}}',
        'button.dtu-cw-chip{appearance:none;-webkit-appearance:none;margin:0;min-height:48px;padding:6px 10px;border:1px solid var(--dtu-cw-hair)!important;border-radius:6px;background:transparent!important;color:var(--dtu-cw-ink)!important;font:inherit;text-align:left;cursor:pointer;display:flex;flex-direction:column;justify-content:center;gap:1px;box-shadow:none!important;text-transform:none;letter-spacing:0}',
        'button.dtu-cw-chip[data-small]{border-style:dashed!important;border-color:var(--dtu-cw-faint)!important}',
        'button.dtu-cw-chip:hover{background:var(--dtu-cw-hover)!important}',
        'button.dtu-cw-chip[aria-pressed="true"]{border:1.5px solid var(--dtu-cw-accent)!important}',
        'button.dtu-cw-chip[aria-pressed="true"] .dtu-cw-chip-period{color:var(--dtu-cw-accent)!important}',
        '.dtu-cw-chip-period{font-size:13px;font-weight:700;color:var(--dtu-cw-ink)!important;white-space:nowrap}',
        '.dtu-cw-chip-sub{font-size:12px;color:var(--dtu-cw-muted)!important;white-space:nowrap}',
        '.dtu-cw-col button:focus-visible,.dtu-cw-col a:focus-visible{outline:2px solid var(--dtu-cw-ink)!important;outline-offset:2px}',
        '.dtu-cw-hero{display:flex;flex-wrap:wrap;align-items:baseline;column-gap:10px;row-gap:4px}',
        '.dtu-cw-big{font-size:42px;font-weight:600;line-height:1;color:var(--dtu-cw-ink)!important;letter-spacing:0}',
        '.dtu-cw-unit{color:var(--dtu-cw-muted)!important}',
        '.dtu-cw-side{margin-left:auto;font-size:14px;color:var(--dtu-cw-muted)!important}',
        '.dtu-cw-side b{font-size:20px;font-weight:600;color:var(--dtu-cw-ink)!important}',
        '.dtu-cw-chart{display:flex;flex-direction:column;gap:6px;height:176px;justify-content:flex-end}',
        '.dtu-cw-bars,.dtu-cw-labels,.dtu-cw-brackets{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px}',
        '.dtu-cw-bars{align-items:end;border-bottom:1px solid var(--dtu-cw-faint)}',
        '.dtu-cw-bar-wrap{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;height:130px}',
        '.dtu-cw-count{font-size:12px;color:var(--dtu-cw-muted)!important}',
        '.dtu-cw-bar{width:100%;border-radius:2px 2px 0 0;background:var(--dtu-cw-bar)!important}',
        '.dtu-cw-bar[data-fail]{background:repeating-linear-gradient(135deg,var(--dtu-cw-stripe) 0 2px,var(--dtu-cw-stripe-bg) 2px 6px)!important}',
        '.dtu-cw-labels{font-size:13px;text-align:center;color:var(--dtu-cw-ink)!important}',
        '.dtu-cw-brackets{font-size:12px;text-align:center}',
        '.dtu-cw-brackets span{padding-top:3px;border-top:1px solid var(--dtu-cw-muted);color:var(--dtu-cw-muted)!important}',
        '.dtu-cw-brackets span + span{border-top-color:var(--dtu-cw-ink);color:var(--dtu-cw-ink)!important}',
        '.dtu-cw-pf{display:flex;flex-direction:column;gap:10px;height:176px;justify-content:center}',
        '.dtu-cw-pf-bar{display:flex;height:28px;gap:2px}',
        '.dtu-cw-pf-bar > span{border-radius:2px;background:var(--dtu-cw-bar)!important}',
        '.dtu-cw-pf-bar > span[data-fail]{min-width:3px;background:repeating-linear-gradient(135deg,var(--dtu-cw-stripe) 0 2px,var(--dtu-cw-stripe-bg) 2px 6px)!important}',
        '.dtu-cw-pf-legend{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:var(--dtu-cw-muted)!important}',
        '.dtu-cw-pf-legend b{color:var(--dtu-cw-ink)!important;font-weight:700}',
        '.dtu-cw-foot{margin-top:auto;padding-top:12px;border-top:1px solid var(--dtu-cw-hair);font-size:13px;display:flex;align-items:center;justify-content:space-between;gap:8px 12px;flex-wrap:wrap;min-height:37px;color:var(--dtu-cw-muted)!important}',
        '.dtu-cw-foot-main{display:flex;align-items:center;gap:8px;min-width:0}',
        '.dtu-cw-foot b{font-weight:400;color:var(--dtu-cw-ink)!important}',
        '.dtu-cw-tip{position:relative;display:inline-flex}',
        'button.dtu-cw-info{appearance:none;-webkit-appearance:none;margin:0;padding:0;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;border:0!important;border-radius:50%;background:transparent!important;color:var(--dtu-cw-ink)!important;cursor:help;box-shadow:none!important}',
        'button.dtu-cw-info svg{display:block}',
        'button.dtu-cw-info svg,button.dtu-cw-info svg *{fill:none!important;stroke:currentColor!important}',
        '.dtu-cw-tipbox{display:none;position:absolute;left:-12px;bottom:32px;z-index:5;width:320px;max-width:min(320px,80vw);padding:10px 12px;border:1px solid var(--dtu-cw-faint)!important;border-radius:6px;background:var(--dtu-cw-tip-bg)!important;color:var(--dtu-cw-ink)!important;font-size:13px;line-height:1.45;box-shadow:0 6px 20px rgba(0,0,0,.25)}',
        '.dtu-cw-tipbox::after{content:"";position:absolute;left:0;right:0;bottom:-10px;height:10px}',
        '.dtu-cw-tip:hover .dtu-cw-tipbox,.dtu-cw-tip:focus-within .dtu-cw-tipbox{display:block}',
        '.dtu-cw-tip[data-dismissed] .dtu-cw-tipbox{display:none}',
        '.dtu-cw-rows{display:flex;flex-direction:column;flex-grow:1;justify-content:space-between;gap:8px;padding:6px 0 10px}',
        '.dtu-cw-row,.dtu-cw-axis{display:grid;grid-template-columns:160px minmax(0,1fr) 40px;gap:12px;align-items:center}',
        '@container (max-width:420px){.dtu-cw-row,.dtu-cw-axis{grid-template-columns:128px minmax(0,1fr) 36px}}',
        '.dtu-cw-row{min-height:26px}',
        '.dtu-cw-row-label{font-size:13px;color:var(--dtu-cw-ink)!important;min-width:0}',
        '.dtu-cw-track{position:relative;height:8px;border-radius:4px;background:var(--dtu-cw-track)!important}',
        '.dtu-cw-fill{height:8px;border-radius:4px;background:var(--dtu-cw-bar)!important}',
        '.dtu-cw-mid{position:absolute;left:50%;top:-3px;width:1px;height:14px;background:var(--dtu-cw-muted)!important}',
        '.dtu-cw-val{text-align:right;font-weight:700;color:var(--dtu-cw-ink)!important}',
        '.dtu-cw-axis{font-size:12px;color:var(--dtu-cw-muted)!important}',
        '.dtu-cw-axis-scale{display:flex;justify-content:space-between}',
        '.dtu-cw-col a.dtu-cw-link{color:var(--dtu-cw-accent)!important;font-weight:700;text-decoration:none}',
        '.dtu-cw-col a.dtu-cw-link:hover{text-decoration:underline}'
    ].join('\n');

    function ensureCourseWidgetsStyles() {
        if (document.getElementById(COURSE_WIDGETS_STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = COURSE_WIDGETS_STYLE_ID;
        markExt(style);
        style.textContent = COURSE_WIDGETS_CSS;
        (document.head || document.documentElement).appendChild(style);
    }

    function readAccent(isDark) {
        var accent = '#1f7ae0';
        try {
            var styles = getComputedStyle(document.documentElement);
            // The base accent is too dark to read as text on the dark surface,
            // and the soft one too light on white.
            var primary = isDark ? '--dtu-ad-accent-soft' : '--dtu-ad-accent-deep';
            accent = (styles.getPropertyValue(primary) || styles.getPropertyValue('--dtu-ad-accent') || accent).trim() || accent;
        } catch (e0) { }
        return accent;
    }

    function applyCourseWidgetsTheme(grid) {
        var isDark = isDarkModeEnabled();
        var tokens = isDark ? {
            ink: '#f0eee8',
            muted: 'rgba(240,238,232,.64)',
            faint: 'rgba(240,238,232,.30)',
            hair: 'rgba(240,238,232,.13)',
            divider: 'rgba(240,238,232,.16)',
            track: 'rgba(240,238,232,.10)',
            hover: 'rgba(240,238,232,.05)',
            bar: '#cfcdc8',
            stripe: '#9a9893',
            'stripe-bg': '#2e2e2e',
            'tip-bg': '#2e2e2e'
        } : {
            ink: '#1a1a1a',
            muted: 'rgba(26,26,26,.66)',
            faint: 'rgba(26,26,26,.28)',
            hair: 'rgba(26,26,26,.10)',
            divider: 'rgba(26,26,26,.14)',
            track: 'rgba(26,26,26,.08)',
            hover: 'rgba(26,26,26,.04)',
            bar: '#8c8a85',
            stripe: '#6d6b67',
            'stripe-bg': '#ffffff',
            'tip-bg': '#ffffff'
        };
        tokens.accent = readAccent(isDark);
        Object.keys(tokens).forEach(function (k) {
            grid.style.setProperty('--dtu-cw-' + k, tokens[k]);
        });
    }

    // Collapses the grid to one column when only one widget is enabled, and
    // to a single "nothing yet" line when a new course has neither grades
    // nor an evaluation.
    function refreshCourseWidgetsLayout() {
        var grid = document.querySelector('[data-dtu-course-widgets-grid]');
        if (!grid) return;
        var grades = grid.querySelector(':scope > [data-dtu-grade-stats]');
        var evaluation = grid.querySelector(':scope > [data-dtu-course-eval]');
        var single = !(grades && evaluation);
        var bothEmpty = !!(grades && evaluation
            && grades.getAttribute('data-dtu-cw-state') === 'empty'
            && evaluation.getAttribute('data-dtu-cw-state') === 'empty');
        if (single) grid.setAttribute('data-dtu-cw-single', '1'); else grid.removeAttribute('data-dtu-cw-single');
        if (bothEmpty) grid.setAttribute('data-dtu-cw-both-empty', '1'); else grid.removeAttribute('data-dtu-cw-both-empty');
    }

    function makeEl(tag, className, text) {
        var el = document.createElement(tag);
        markExt(el);
        if (className) el.className = className;
        if (text != null) el.textContent = text;
        return el;
    }

    function makeColumnHead(title, meta) {
        var head = makeEl('div', 'dtu-cw-head');
        var t = makeEl('span', 'dtu-cw-title');
        if (typeof title === 'string') t.textContent = title; else t.appendChild(title);
        head.appendChild(t);
        if (meta) head.appendChild(makeEl('span', 'dtu-cw-meta', meta));
        return head;
    }

    var _tipSeq = 0;

    // An info button whose note shows on hover and on keyboard focus, stays
    // open while the pointer moves onto it, and closes with Escape.
    function makeInfoTip(text, label) {
        var wrap = makeEl('span', 'dtu-cw-tip');
        var id = 'dtu-cw-tip-' + (++_tipSeq);
        var btn = makeEl('button', 'dtu-cw-info');
        btn.type = 'button';
        btn.setAttribute('aria-label', label);
        btn.setAttribute('aria-describedby', id);
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.75"></circle><path d="M8 7.25v4"></path><path d="M8 4.75v.01"></path></svg>';
        var box = makeEl('span', 'dtu-cw-tipbox', text);
        box.id = id;
        box.setAttribute('role', 'tooltip');
        btn.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') wrap.setAttribute('data-dismissed', '1');
        });
        function reset() { wrap.removeAttribute('data-dismissed'); }
        wrap.addEventListener('mouseleave', reset);
        btn.addEventListener('blur', reset);
        wrap.appendChild(btn);
        wrap.appendChild(box);
        return wrap;
    }

    function prepareCourseWidgetColumn(container) {
        ensureCourseWidgetsStyles();
        container.className = 'dtu-cw-col';
        container.style.cssText = '';
        container.innerHTML = '';
        var grid = container.parentNode;
        if (grid && grid.getAttribute && grid.getAttribute('data-dtu-course-widgets-grid') === '1') applyCourseWidgetsTheme(grid);
    }

    // --- Grade statistics column ---

    var GRADE_SCALE = ['12', '10', '7', '4', '02', '00', '-3'];
    var GRADE_VALUE = { '12': 12, '10': 10, '7': 7, '4': 4, '02': 2, '00': 0, '-3': -3 };

    function formatGradePeriod(semester) {
        var m = /^(Winter|Summer)-(\d{4})$/i.exec(String(semester || ''));
        if (!m) return String(semester || '').replace(/[-_]+/g, ' ');
        return m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() + ' ' + m[2];
    }

    function plural(n, one, many) {
        return n + ' ' + (n === 1 ? one : many);
    }

    // Notes that explain why an exam's numbers need care; shown behind the
    // info button so they do not crowd the footer.
    function buildGradeNotes(iter, main) {
        var data = iter.data || {};
        var notes = [];
        if (iter.small && main && main !== iter) {
            var mainSize = (main.data && (main.data.registered || main.data.total)) || 0;
            var size = data.registered || data.total || 0;
            notes.push('Only ' + size + ' students signed up for this exam, against ' + mainSize + ' in ' + formatGradePeriod(main.semester) + '. It is probably a re-exam.');
        }
        var pf = data.passFailCounts || {};
        var pfCount = (pf.passed || 0) + (pf.failed || 0);
        if (data.mode === 'graded' && pfCount > 0) {
            var parts = [];
            if (pf.passed) parts.push(pf.passed + ' passed');
            if (pf.failed) parts.push(pf.failed + ' failed');
            notes.push(plural(pfCount, 'student', 'students') + ' got pass/fail instead of a grade (' + parts.join(', ') + '). ' + (pfCount === 1 ? 'It counts' : 'They count') + ' in the pass rate, not in the chart or the average.');
        }
        var graded = typeof data.gradedTotal === 'number' ? data.gradedTotal : 0;
        if (data.mode === 'pass_fail' && graded > 0) {
            notes.push(plural(graded, 'student', 'students') + ' got a 7-step grade instead of pass/fail. ' + (graded === 1 ? 'It counts' : 'They count') + ' as passed or failed here.');
        }
        return notes.join(' ');
    }

    function renderGradedChart(body, data) {
        var counts = data.counts || {};
        var top = 0;
        GRADE_SCALE.forEach(function (g) { top = Math.max(top, counts[g] || 0); });
        var chart = makeEl('div', 'dtu-cw-chart');
        var bars = makeEl('div', 'dtu-cw-bars');
        var labels = makeEl('div', 'dtu-cw-labels');
        GRADE_SCALE.forEach(function (g) {
            var n = counts[g] || 0;
            var wrap = makeEl('div', 'dtu-cw-bar-wrap');
            wrap.appendChild(makeEl('span', 'dtu-cw-count', String(n)));
            var bar = makeEl('div', 'dtu-cw-bar');
            bar.style.height = (n ? Math.max(5, Math.round(n / (top || 1) * 104)) : 0) + 'px';
            if (GRADE_VALUE[g] <= 0) bar.setAttribute('data-fail', '1');
            bar.title = (g === '-3' ? '−3' : g) + ': ' + plural(n, 'student', 'students');
            wrap.appendChild(bar);
            bars.appendChild(wrap);
            labels.appendChild(makeEl('span', '', g === '-3' ? '−3' : g));
        });
        var brackets = makeEl('div', 'dtu-cw-brackets');
        var passed = makeEl('span', '', 'Passed');
        passed.style.gridColumn = '1 / 6';
        var failed = makeEl('span', '', 'Failed');
        failed.style.gridColumn = '6 / 8';
        brackets.appendChild(passed);
        brackets.appendChild(failed);
        chart.appendChild(bars);
        chart.appendChild(labels);
        chart.appendChild(brackets);
        body.appendChild(chart);
    }

    function renderPassFailChart(body, data) {
        var pf = data.passFailCounts || {};
        var passedN = typeof data.passedTotal === 'number' ? data.passedTotal : (pf.passed || 0);
        var failedN = typeof data.failedTotal === 'number' ? data.failedTotal : (pf.failed || 0);
        var total = passedN + failedN;
        var wrap = makeEl('div', 'dtu-cw-pf');
        var bar = makeEl('div', 'dtu-cw-pf-bar');
        bar.setAttribute('role', 'img');
        bar.setAttribute('aria-label', passedN + ' passed, ' + failedN + ' failed');
        var p = makeEl('span');
        p.style.width = (total ? passedN / total * 100 : 0) + '%';
        bar.appendChild(p);
        if (failedN > 0) {
            var f = makeEl('span');
            f.setAttribute('data-fail', '1');
            f.style.width = (failedN / total * 100) + '%';
            bar.appendChild(f);
        }
        var legend = makeEl('div', 'dtu-cw-pf-legend');
        var lp = makeEl('span');
        lp.appendChild(makeEl('b', '', String(passedN)));
        lp.appendChild(document.createTextNode(' passed'));
        var lf = makeEl('span');
        lf.appendChild(makeEl('b', '', String(failedN)));
        lf.appendChild(document.createTextNode(' failed'));
        legend.appendChild(lp);
        legend.appendChild(lf);
        wrap.appendChild(bar);
        wrap.appendChild(legend);
        body.appendChild(wrap);
    }

    function renderGradeBody(body, meta, iterations, index, mainIndex) {
        var iter = iterations[index];
        var data = iter.data || {};
        body.innerHTML = '';
        meta.textContent = formatGradePeriod(iter.semester) + ' exam';

        var hero = makeEl('div', 'dtu-cw-hero');
        hero.appendChild(makeEl('span', 'dtu-cw-big', (Number(data.passRate) || 0).toFixed(1) + '%'));
        hero.appendChild(makeEl('span', 'dtu-cw-unit', 'passed'));
        var side = makeEl('span', 'dtu-cw-side');
        if (data.mode === 'pass_fail' || typeof data.average !== 'number' || !isFinite(data.average)) {
            side.textContent = 'Pass/fail, no average';
        } else {
            side.appendChild(document.createTextNode('Average '));
            side.appendChild(makeEl('b', '', data.average.toFixed(2)));
            side.appendChild(document.createTextNode(' of 12'));
        }
        hero.appendChild(side);
        body.appendChild(hero);

        if (data.mode === 'pass_fail') renderPassFailChart(body, data);
        else renderGradedChart(body, data);

        var foot = makeEl('div', 'dtu-cw-foot');
        var footMain = makeEl('span', 'dtu-cw-foot-main');
        var total = Number(data.total) || 0;
        footMain.appendChild(makeEl('span', '', data.registered
            ? total + ' of ' + data.registered + ' registered students sat the exam.'
            : plural(total, 'student', 'students') + ' sat the exam.'));
        var note = buildGradeNotes(iter, iterations[mainIndex]);
        if (note) footMain.appendChild(makeInfoTip(note, 'About this exam'));
        foot.appendChild(footMain);
        body.appendChild(foot);
    }

    function renderGradeStatsColumn(container, iterations, mainIndex) {
        prepareCourseWidgetColumn(container);
        container.setAttribute('data-dtu-cw-state', 'ready');
        var head = makeColumnHead('Grades', ' ');
        var meta = head.querySelector('.dtu-cw-meta');
        container.appendChild(head);

        var shown = iterations.slice(0, 4);
        var selected = mainIndex < shown.length ? mainIndex : 0;
        var body = makeEl('div');
        body.style.cssText = 'display:contents';

        if (shown.length > 1) {
            var chips = makeEl('div', 'dtu-cw-chips');
            chips.setAttribute('role', 'group');
            chips.setAttribute('aria-label', 'Exam period');
            var buttons = shown.map(function (iter, i) {
                var d = iter.data || {};
                var btn = makeEl('button', 'dtu-cw-chip');
                btn.type = 'button';
                if (iter.small) btn.setAttribute('data-small', '1');
                btn.appendChild(makeEl('span', 'dtu-cw-chip-period', formatGradePeriod(iter.semester)));
                btn.appendChild(makeEl('span', 'dtu-cw-chip-sub', (d.registered || d.total || 0) + ' students' + (iter.small ? ', small' : '')));
                btn.addEventListener('click', function () {
                    selected = i;
                    buttons.forEach(function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
                    renderGradeBody(body, meta, shown, i, mainIndex);
                });
                chips.appendChild(btn);
                return btn;
            });
            buttons.forEach(function (b, j) { b.setAttribute('aria-pressed', j === selected ? 'true' : 'false'); });
            container.appendChild(chips);
        } else {
            container.appendChild(makeEl('div', 'dtu-cw-status', 'First exam for this course. There are no earlier results to compare with yet.'));
        }

        container.appendChild(body);
        renderGradeBody(body, meta, shown, selected, mainIndex);
        refreshCourseWidgetsLayout();
    }

    function renderGradeStatsEmpty(container) {
        prepareCourseWidgetColumn(container);
        container.setAttribute('data-dtu-cw-state', 'empty');
        var title = makeEl('span');
        title.appendChild(makeEl('span', 'dtu-cw-only', 'Grades'));
        title.appendChild(makeEl('span', 'dtu-cw-both', 'Grades and student evaluation'));
        container.appendChild(makeColumnHead(title));
        var empty = makeEl('div', 'dtu-cw-empty');
        var lead = makeEl('span', 'dtu-cw-empty-lead');
        lead.appendChild(makeEl('span', 'dtu-cw-only', 'No exam results yet'));
        lead.appendChild(makeEl('span', 'dtu-cw-both', 'No exam results or student evaluation yet'));
        empty.appendChild(lead);
        var sub = makeEl('span', 'dtu-cw-status');
        // DTU also hides exams with three or fewer students.
        sub.appendChild(makeEl('span', 'dtu-cw-only', 'New courses get results after their first exam.'));
        sub.appendChild(makeEl('span', 'dtu-cw-both', 'This looks like a new course. Both appear once it has been taught and examined.'));
        empty.appendChild(sub);
        container.appendChild(empty);
        refreshCourseWidgetsLayout();
    }

    // --- Shared grid ---

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
        ensureCourseWidgetsStyles();
        grid.style.cssText = '';
        applyCourseWidgetsTheme(grid);
        return grid;
    }

    function pruneCourseWidgetsGrid() {
        var grid = document.querySelector('[data-dtu-course-widgets-grid]');
        if (grid && !grid.querySelector('[data-dtu-grade-stats], [data-dtu-course-eval]')) grid.remove();
        refreshCourseWidgetsLayout();
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

        var container = document.createElement('div');
        container.setAttribute('data-dtu-grade-stats', '1');
        container.setAttribute('data-dtu-grade-stats-course', courseCode);
        markExt(container);

        var widgetsGrid = getOrCreateCourseWidgetsGrid(insertAnchor, courseCode);
        widgetsGrid.insertBefore(container, widgetsGrid.firstChild);

        prepareCourseWidgetColumn(container);
        container.setAttribute('data-dtu-cw-state', 'loading');
        container.appendChild(makeColumnHead('Grades'));
        container.appendChild(makeEl('div', 'dtu-cw-status', 'Loading exam results...'));
        refreshCourseWidgetsLayout();

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
                iterations = response.iterations.filter(function (it) { return it && it.data; });
            } else if (response && response.ok && response.data) {
                iterations = [{ semester: response.semester || '', data: response.data }];
            }
            if (!iterations.length) {
                // New courses have no exam yet, and DTU hides exams with three
                // or fewer students, so this is a normal state, not an error.
                renderGradeStatsEmpty(container);
                return;
            }
            var mainIndex = (response && typeof response.mainIndex === 'number' && iterations[response.mainIndex]) ? response.mainIndex : 0;
            renderGradeStatsColumn(container, iterations, mainIndex);
        });
    }

    try {
        globalThis.DTUAfterDarkKurserWidgetsUi = {
            insertKurserGradeStats: insertKurserGradeStats
        };
        globalThis.DTUAfterDarkCourseWidgetsLayout = {
            prepareColumn: prepareCourseWidgetColumn,
            getOrCreateGrid: getOrCreateCourseWidgetsGrid,
            refresh: refreshCourseWidgetsLayout,
            makeEl: makeEl,
            makeColumnHead: makeColumnHead,
            makeInfoTip: makeInfoTip
        };
    } catch (eKurserWidgetsUi) { }
})();
