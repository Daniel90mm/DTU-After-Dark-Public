(function () {
    var deps = globalThis.DTUAfterDarkSemesterTwinsDeps;
    if (!deps) return;

    function getState() {
        return deps.getState ? (deps.getState() || {}) : {};
    }

    function setState(patch) {
        if (deps.setState) deps.setState(patch || {});
    }

    function getIsDark() {
        return !!(deps.isDarkMode && deps.isDarkMode());
    }

    function resetTwinTimestamps() {
        setState({
            participantIntelSemesterTwinLastTs: 0,
            participantIntelSemesterTwinCampusnetLastTs: 0
        });
    }

    function removeDTULearnSemesterTwinWidget() {
        document.querySelectorAll('[data-dtu-semester-twin]').forEach(function (el) { el.remove(); });
    }

    function insertSemesterTwinWidget() {
        if (!deps.isTopWindow) return;
        if (!deps.isDTULearnHomepage()) {
            var old = document.querySelector('[data-dtu-semester-twin]');
            if (old) old.remove();
            return;
        }
        var existing = document.querySelector('[data-dtu-semester-twin]');
        if (!deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey)
            || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelSemesterTwinsKey)) {
            if (existing) existing.remove();
            return;
        }

        var state = getState();
        var now = Date.now();
        if ((now - (state.participantIntelSemesterTwinLastTs || 0)) < 5000) {
            if (existing) applySemesterTwinTheme(existing, getIsDark());
            return;
        }
        setState({ participantIntelSemesterTwinLastTs: now });

        deps.loadParticipantIntel(function (intel) {
            deps.loadSemesterTwinPrefs(function (prefs) {
                var computed = deps.computeSemesterTwinData(intel, prefs);
                renderSemesterTwinWidget(computed.twins, computed.myTotal, computed.meta);
            });
        });
    }

    function buildSyncRingSVG(pct, size, isDark) {
        var radius = (size - 6) / 2;
        var circ = 2 * Math.PI * radius;
        var dashOffset = circ * (1 - pct / 100);
        var ringColor = pct >= 50 ? 'var(--dtu-ad-accent)' : (isDark ? '#666' : '#aaa');
        var trackColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

        var ns = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('width', String(size));
        svg.setAttribute('height', String(size));
        svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
        svg.style.cssText = 'flex-shrink:0;';

        var track = document.createElementNS(ns, 'circle');
        track.setAttribute('cx', String(size / 2));
        track.setAttribute('cy', String(size / 2));
        track.setAttribute('r', String(radius));
        track.setAttribute('fill', 'none');
        track.setAttribute('stroke', trackColor);
        track.setAttribute('stroke-width', '3');
        svg.appendChild(track);

        var arc = document.createElementNS(ns, 'circle');
        arc.setAttribute('cx', String(size / 2));
        arc.setAttribute('cy', String(size / 2));
        arc.setAttribute('r', String(radius));
        arc.setAttribute('fill', 'none');
        arc.setAttribute('stroke', ringColor);
        arc.setAttribute('stroke-width', '3');
        arc.setAttribute('stroke-linecap', 'round');
        arc.setAttribute('stroke-dasharray', String(circ));
        arc.setAttribute('stroke-dashoffset', String(dashOffset));
        arc.setAttribute('transform', 'rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')');
        svg.appendChild(arc);

        var txt = document.createElementNS(ns, 'text');
        txt.setAttribute('x', '50%');
        txt.setAttribute('y', '50%');
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('dominant-baseline', 'central');
        txt.setAttribute('fill', isDark ? '#e0e0e0' : '#333');
        txt.setAttribute('font-size', String(Math.round(size * 0.26)));
        txt.setAttribute('font-weight', '700');
        txt.textContent = pct + '%';
        svg.appendChild(txt);

        return svg;
    }

    function sanitizeCourseLabel(code, rawName) {
        if (!rawName) return code;
        var name = rawName
            .replace(/\s*\(archived\)/gi, '')
            .replace(/\s*\(Polytechnical foundation\)/gi, '')
            .replace(/\s*\(Polyteknisk grundlag\)/gi, '')
            .replace(/\s+[EF]\d{2}\b/g, '')
            .replace(/\s+[EF]20\d{2}\b/g, '')
            .replace(/\s*-\s*$/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        return name ? (code + ' ' + name) : code;
    }

    function buildTwinMatchCard(t, myTotal, courseNames, isDark, idx) {
        var pct = Math.round(t.syncScore * 100);
        var isTwin = pct === 100;

        var card = document.createElement('div');
        card.setAttribute('data-dtu-semester-twin-row', '1');
        deps.markExt(card);
        var cardBg = isDark ? '#1f1f1f' : '#f7f9fc';
        var cardBgHover = isDark ? '#242424' : '#f1f5f9';
        var cardShadow = isDark
            ? 'inset 0 0 0 1px rgba(255,255,255,0.05)'
            : 'inset 0 0 0 1px rgba(148,163,184,0.18)';
        card.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;'
            + 'margin-bottom:6px;position:relative;cursor:default;transition:transform 0.18s ease, background-color 0.18s ease;';
        card.style.setProperty('background', cardBg, 'important');
        card.style.setProperty('background-color', cardBg, 'important');
        card.style.setProperty('border', '0', 'important');
        card.style.setProperty('box-shadow', cardShadow, 'important');
        card.style.setProperty('border-left', (isTwin || idx === 0) ? '4px solid var(--dtu-ad-accent)' : '4px solid transparent', 'important');
        card.style.setProperty('color', isDark ? '#e0e0e0' : '#1f2937', 'important');

        var left = document.createElement('div');
        deps.markExt(left);
        left.style.cssText = 'min-width:0;flex:1;display:flex;flex-direction:column;gap:3px;';

        var titleRow = document.createElement('div');
        deps.markExt(titleRow);
        titleRow.style.cssText = 'display:flex;align-items:baseline;gap:8px;min-width:0;flex-wrap:wrap;';

        var nameEl = document.createElement('div');
        deps.markExt(nameEl);
        nameEl.setAttribute('data-dtu-campusnet-semester-twin-name', '1');
        nameEl.textContent = t.name;
        nameEl.style.cssText = 'font-weight:800;font-size:13px;line-height:1.2;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1 1 auto;';
        nameEl.style.setProperty('color', isDark ? '#f0f0f0' : '#1a1a1a', 'important');
        nameEl.style.setProperty('background', 'transparent', 'important');
        nameEl.style.setProperty('background-color', 'transparent', 'important');
        titleRow.appendChild(nameEl);

        if (isTwin) {
            var badge = document.createElement('span');
            deps.markExt(badge);
            badge.textContent = 'Twin';
            badge.style.cssText = 'display:inline-block;font-size:9px;font-weight:800;'
                + 'text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;';
            badge.style.setProperty('background', 'transparent', 'important');
            badge.style.setProperty('background-color', 'transparent', 'important');
            badge.style.setProperty('color', 'var(--dtu-ad-accent)', 'important');
            titleRow.appendChild(badge);
        }

        left.appendChild(titleRow);

        if (t.program) {
            var progEl = document.createElement('div');
            deps.markExt(progEl);
            progEl.setAttribute('data-dtu-campusnet-semester-twin-program', '1');
            progEl.textContent = t.program;
            progEl.style.cssText = 'font-size:10px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            progEl.style.setProperty('color', isDark ? '#a8adb5' : '#64748b', 'important');
            progEl.style.setProperty('background', 'transparent', 'important');
            progEl.style.setProperty('background-color', 'transparent', 'important');
            left.appendChild(progEl);
        }

        var metaRow = document.createElement('div');
        deps.markExt(metaRow);
        metaRow.style.cssText = 'display:flex;align-items:center;gap:7px;flex-wrap:wrap;min-width:0;';

        var sharedCount = document.createElement('div');
        deps.markExt(sharedCount);
        sharedCount.textContent = t.shared.length + ' Shared Course' + (t.shared.length === 1 ? '' : 's');
        sharedCount.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:-0.01em;';
        sharedCount.style.setProperty('color', pct >= 50 ? 'var(--dtu-ad-accent)' : (isDark ? '#bbb' : '#555'), 'important');
        metaRow.appendChild(sharedCount);

        if (myTotal > 0) {
            var overlapMeta = document.createElement('div');
            deps.markExt(overlapMeta);
            overlapMeta.textContent = t.shared.length + '/' + myTotal + ' overlap';
            overlapMeta.style.cssText = 'font-size:10px;font-weight:600;';
            overlapMeta.style.setProperty('color', isDark ? '#8b949e' : '#64748b', 'important');
            metaRow.appendChild(overlapMeta);
        }

        left.appendChild(metaRow);

        card.appendChild(left);

        var right = document.createElement('div');
        deps.markExt(right);
        right.style.cssText = 'flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:2px;min-width:44px;';
        var ring = buildSyncRingSVG(pct, 34, isDark);
        deps.markExt(ring);
        right.appendChild(ring);

        var expandHint = null;
        if (t.shared && t.shared.length) {
            expandHint = document.createElement('div');
            deps.markExt(expandHint);
            expandHint.textContent = 'Shared';
            expandHint.style.cssText = 'font-size:8px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;';
            expandHint.style.setProperty('color', isDark ? '#9ca3af' : '#64748b', 'important');
            right.appendChild(expandHint);
        }
        card.appendChild(right);

        if (t.shared && t.shared.length) {
            card.style.setProperty('cursor', 'pointer', 'important');
            card.style.setProperty('flex-wrap', 'wrap', 'important');
            card.setAttribute('role', 'button');
            card.tabIndex = 0;
            card.setAttribute('aria-expanded', 'false');

            var drawer = document.createElement('div');
            deps.markExt(drawer);
            drawer.style.cssText = 'width:100%;overflow:hidden;transition:max-height 0.25s ease, opacity 0.18s ease;';
            drawer.style.setProperty('max-height', '0px', 'important');
            drawer.style.setProperty('opacity', '0', 'important');

            var drawerInner = document.createElement('div');
            deps.markExt(drawerInner);
            var drawerBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.70)';
            drawerInner.style.cssText = 'padding:8px 10px 10px;margin-top:6px;border-radius:8px;';
            drawerInner.style.setProperty('background', drawerBg, 'important');
            drawerInner.style.setProperty('background-color', drawerBg, 'important');
            drawerInner.style.setProperty('box-shadow', isDark
                ? 'inset 0 0 0 1px rgba(255,255,255,0.04)'
                : 'inset 0 0 0 1px rgba(148,163,184,0.14)', 'important');

            var drawerHead = document.createElement('div');
            deps.markExt(drawerHead);
            drawerHead.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:7px;flex-wrap:wrap;margin-bottom:7px;';

            var drawerTitle = document.createElement('div');
            deps.markExt(drawerTitle);
            drawerTitle.textContent = 'Shared overlap';
            drawerTitle.style.cssText = 'font-size:9px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;';
            drawerTitle.style.setProperty('color', isDark ? '#d1d5db' : '#334155', 'important');
            drawerHead.appendChild(drawerTitle);

            var drawerMeta = document.createElement('div');
            deps.markExt(drawerMeta);
            drawerMeta.textContent = t.shared.length + ' course' + (t.shared.length === 1 ? '' : 's');
            drawerMeta.style.cssText = 'font-size:9px;font-weight:700;';
            drawerMeta.style.setProperty('color', 'var(--dtu-ad-accent)', 'important');
            drawerHead.appendChild(drawerMeta);
            drawerInner.appendChild(drawerHead);

            var chipsWrap = document.createElement('div');
            deps.markExt(chipsWrap);
            chipsWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px 7px;';

            t.shared.forEach(function (code) {
                var rawName = deps.normalizeWhitespace(courseNames[code] || '');
                var label = sanitizeCourseLabel(code, rawName);

                var chip = document.createElement('span');
                deps.markExt(chip);
                chip.textContent = label;
                chip.style.cssText = 'display:inline-flex;align-items:center;padding:4px 8px 4px 9px;border-radius:6px;font-size:9px;'
                    + 'font-weight:600;white-space:normal;line-height:1.35;max-width:100%;';
                chip.style.setProperty('background', isDark ? 'rgba(255,255,255,0.06)' : 'rgba(241,245,249,0.95)', 'important');
                chip.style.setProperty('background-color', isDark ? 'rgba(255,255,255,0.06)' : 'rgba(241,245,249,0.95)', 'important');
                chip.style.setProperty('border-left', '2px solid ' + (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(148,163,184,0.42)'), 'important');
                chip.style.setProperty('color', isDark ? '#e5e7eb' : '#334155', 'important');
                chipsWrap.appendChild(chip);
            });

            drawerInner.appendChild(chipsWrap);
            drawer.appendChild(drawerInner);
            card.appendChild(drawer);

            var isExpanded = false;
            function toggleDrawer() {
                isExpanded = !isExpanded;
                card.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
                if (isExpanded) {
                    drawer.style.setProperty('max-height', drawerInner.scrollHeight + 40 + 'px', 'important');
                    drawer.style.setProperty('opacity', '1', 'important');
                    if (expandHint) expandHint.textContent = 'Hide shared';
                } else {
                    drawer.style.setProperty('max-height', '0px', 'important');
                    drawer.style.setProperty('opacity', '0', 'important');
                    if (expandHint) expandHint.textContent = 'Show shared';
                }
            }
            card.addEventListener('click', function (e) {
                e.stopPropagation();
                toggleDrawer();
            });
            card.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleDrawer();
                }
            });
        }

        card.addEventListener('mouseenter', function () {
            card.style.setProperty('transform', 'translateY(-1px)', 'important');
            card.style.setProperty('background', cardBgHover, 'important');
            card.style.setProperty('background-color', cardBgHover, 'important');
        });
        card.addEventListener('mouseleave', function () {
            card.style.setProperty('transform', 'translateY(0)', 'important');
            card.style.setProperty('background', cardBg, 'important');
            card.style.setProperty('background-color', cardBg, 'important');
        });

        return card;
    }

    function applySemesterTwinTheme(widget, isDark) {
        if (!widget) return;
        var header = widget.querySelector('[data-dtu-semester-twin-header]');
        var title = widget.querySelector('[data-dtu-semester-twin-title]');
        var body = widget.querySelector('[data-dtu-semester-twin-body]');
        var surfaceBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(148,163,184,0.20)';

        widget.style.setProperty('background', isDark ? '#2d2d2d' : '#ffffff', 'important');
        widget.style.setProperty('background-color', isDark ? '#2d2d2d' : '#ffffff', 'important');
        widget.style.setProperty('border', '1px solid ' + surfaceBorder, 'important');
        widget.style.setProperty('border-radius', '12px', 'important');
        widget.style.setProperty('box-shadow', isDark
            ? 'inset 0 0 0 1px rgba(255,255,255,0.02)'
            : 'inset 0 0 0 1px rgba(255,255,255,0.6)', 'important');
        widget.style.setProperty('overflow', 'visible', 'important');

        if (header) {
            header.style.setProperty('background', 'transparent', 'important');
            header.style.setProperty('background-color', 'transparent', 'important');
            header.style.setProperty('color', isDark ? '#e0e0e0' : '#333', 'important');
            header.style.setProperty('border-bottom', '1px solid ' + surfaceBorder, 'important');
        }
        if (title) {
            title.style.setProperty('color', isDark ? '#e0e0e0' : '#333', 'important');
            title.style.setProperty('font-size', '16px', 'important');
            title.style.setProperty('font-weight', '800', 'important');
            title.style.setProperty('letter-spacing', '-0.01em', 'important');
        }
        if (body) {
            body.style.setProperty('background', 'transparent', 'important');
            body.style.setProperty('background-color', 'transparent', 'important');
            body.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
        }
        var filterBtn = widget.querySelector('[data-dtu-semester-twin-filterbtn]');
        if (filterBtn) {
            filterBtn.style.setProperty('background', isDark ? 'rgba(255,255,255,0.07)' : 'rgba(241,245,249,0.95)', 'important');
            filterBtn.style.setProperty('background-color', isDark ? 'rgba(255,255,255,0.07)' : 'rgba(241,245,249,0.95)', 'important');
            filterBtn.style.setProperty('color', isDark ? '#e5e7eb' : '#334155', 'important');
        }
        var filterDrop = widget.querySelector('[data-dtu-semester-twin-filterdrop]');
        if (filterDrop) {
            filterDrop.style.setProperty('background', isDark ? '#2d2d2d' : '#ffffff', 'important');
            filterDrop.style.setProperty('background-color', isDark ? '#2d2d2d' : '#ffffff', 'important');
            filterDrop.style.setProperty('border', '1px solid ' + surfaceBorder, 'important');
            filterDrop.style.setProperty('box-shadow', isDark ? '0 16px 38px rgba(0,0,0,0.34)' : '0 16px 38px rgba(15,23,42,0.16)', 'important');
            filterDrop.style.setProperty('color', isDark ? '#e0e0e0' : '#333', 'important');
        }
        widget.querySelectorAll('[data-dtu-campusnet-semester-twin-scope-select],[data-dtu-campusnet-semester-twin-limit-select]').forEach(function (sel) {
            sel.style.setProperty('background', isDark ? '#1a1a1a' : '#f8fafc', 'important');
            sel.style.setProperty('background-color', isDark ? '#1a1a1a' : '#f8fafc', 'important');
            sel.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
            sel.style.setProperty('border', '1px solid ' + (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(148,163,184,0.28)'), 'important');
        });
        var scanBtn = widget.querySelector('[data-dtu-twin-scan-btn]');
        if (scanBtn) {
            scanBtn.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
            scanBtn.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
            scanBtn.style.setProperty('color', '#ffffff', 'important');
        }
        var scanStopBtn = widget.querySelector('[data-dtu-twin-scan-stop]');
        if (scanStopBtn) {
            scanStopBtn.style.setProperty('background', isDark ? 'rgba(255,255,255,0.06)' : 'rgba(241,245,249,0.95)', 'important');
            scanStopBtn.style.setProperty('background-color', isDark ? 'rgba(255,255,255,0.06)' : 'rgba(241,245,249,0.95)', 'important');
            scanStopBtn.style.setProperty('border', '1px solid ' + surfaceBorder, 'important');
            scanStopBtn.style.setProperty('color', isDark ? '#e5e7eb' : '#334155', 'important');
        }
        widget.querySelectorAll('[data-dtu-semester-twin-row]').forEach(function (row) {
            row.style.setProperty('background', isDark ? '#1f1f1f' : '#f7f9fc', 'important');
            row.style.setProperty('background-color', isDark ? '#1f1f1f' : '#f7f9fc', 'important');
            row.style.setProperty('border', '0', 'important');
            row.style.setProperty('box-shadow', isDark
                ? 'inset 0 0 0 1px rgba(255,255,255,0.05)'
                : 'inset 0 0 0 1px rgba(148,163,184,0.18)', 'important');
            row.style.setProperty('color', isDark ? '#e0e0e0' : '#1f2937', 'important');
        });
    }

    function placeSemesterTwinWidget(widget, col3) {
        if (!widget || !col3) return;
        var deadlines = col3.querySelector('.dtu-deadlines-home-widget');

        if (deadlines && deadlines.parentNode === col3) {
            var after = deadlines.nextSibling;
            if (widget.parentNode !== col3 || widget.previousElementSibling !== deadlines) {
                if (after) col3.insertBefore(widget, after);
                else col3.appendChild(widget);
            }
            return;
        }

        if (widget.parentNode !== col3 || col3.firstChild !== widget) {
            if (col3.firstChild) col3.insertBefore(widget, col3.firstChild);
            else col3.appendChild(widget);
        }
    }

    function renderSemesterTwinWidget(twins, myTotal, meta) {
        var col3 = null;
        var deadlinesAnywhere = document.querySelector('.dtu-deadlines-home-widget');
        if (deadlinesAnywhere && deadlinesAnywhere.closest) {
            col3 = deadlinesAnywhere.closest('.homepage-col-3');
            if (!col3) col3 = deadlinesAnywhere.parentElement;
        }
        if (!col3) col3 = document.querySelector('.homepage-col-3') || document.querySelector('.d2l-page-main');
        if (!col3) return;

        var isDark = getIsDark();
        var showingClosest = !!(meta && meta.showingClosest);
        var emptyMessage = (meta && meta.emptyMessage) ? meta.emptyMessage : '';
        var hideOwnProgram = !!(meta && meta.hideOwnProgram);
        var selfProgram = (meta && meta.selfProgram) ? meta.selfProgram : '';
        var courseNames = (meta && meta.courseNames) ? meta.courseNames : {};
        var myTotalBeforeLineSpecific = (meta && typeof meta.myTotalBeforeLineSpecific === 'number') ? meta.myTotalBeforeLineSpecific : myTotal;
        var myTotalAfterLineSpecific = (meta && typeof meta.myTotalAfterLineSpecific === 'number') ? meta.myTotalAfterLineSpecific : myTotal;
        var lineSpecificCourseCount = (meta && typeof meta.lineSpecificCourseCount === 'number') ? meta.lineSpecificCourseCount : 0;
        var lineSpecificCourses = (meta && meta.lineSpecificCourses && meta.lineSpecificCourses.length) ? meta.lineSpecificCourses : [];
        var lineSpecificSuppressed = (meta && typeof meta.lineSpecificSuppressed === 'number') ? meta.lineSpecificSuppressed : 0;
        var lineSpecificNote = (meta && meta.lineSpecificNote) ? meta.lineSpecificNote : '';
        var sig = (isDark ? 'd' : 'l') + '|' + myTotal + '|' + (showingClosest ? 'closest' : 'twins')
            + '|' + (hideOwnProgram ? 'hideOwn1' : 'hideOwn0')
            + '|' + (selfProgram || '') + '|' + emptyMessage + '|'
            + myTotalBeforeLineSpecific + '|' + myTotalAfterLineSpecific + '|'
            + lineSpecificCourseCount + '|' + lineSpecificSuppressed + '|'
            + (lineSpecificNote || '') + '|' + (lineSpecificCourses || []).join(',') + '|'
            + twins.map(function (t) {
                var pct = Math.round(t.syncScore * 100);
                var sharedSig = '';
                if (t.shared && t.shared.length) {
                    sharedSig = t.shared.map(function (code) {
                        var nm = deps.normalizeWhitespace(courseNames[code] || '');
                        return code + '=' + nm;
                    }).join(',');
                }
                return (t.sNumber || '') + ':' + pct + ':' + sharedSig + ':' + (t.program || '') + ':' + (t.name || '');
            }).join('|');

        var widget = document.querySelector('[data-dtu-semester-twin]');
        if (!widget) {
            widget = document.createElement('div');
            widget.className = 'd2l-widget d2l-tile d2l-widget-padding-full dtu-semester-twins-widget';
            widget.setAttribute('role', 'region');
            widget.setAttribute('data-dtu-semester-twin', '1');
            deps.markExt(widget);
            widget.style.cssText = 'border-radius:12px;overflow:visible;';

            var header = document.createElement('div');
            header.className = 'd2l-widget-header';
            header.setAttribute('data-dtu-semester-twin-header', '1');
            deps.markExt(header);
            header.style.cssText = 'padding:10px 12px 7px !important;';

            var headerWrap = document.createElement('div');
            headerWrap.className = 'd2l-homepage-header-wrapper';
            deps.markExt(headerWrap);
            headerWrap.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:10px;';

            var h2 = document.createElement('h2');
            h2.className = 'd2l-heading vui-heading-4';
            h2.setAttribute('data-dtu-semester-twin-title', '1');
            deps.markExt(h2);
            h2.textContent = 'Semester Twins';
            h2.style.cssText = 'margin:0;flex:1 1 auto;min-width:140px;white-space:normal;font-size:16px;font-weight:800;letter-spacing:-0.01em;';

            headerWrap.appendChild(h2);

            var filterPanel = deps.buildTwinFilterDropdown(isDark,
                { hideOwnProgram: hideOwnProgram }, selfProgram, lineSpecificCourseCount, { campusnet: false });
            headerWrap.appendChild(filterPanel);

            header.appendChild(headerWrap);
            widget.appendChild(header);

            var clear = document.createElement('div');
            clear.className = 'd2l-clear';
            widget.appendChild(clear);

            var content = document.createElement('div');
            content.className = 'd2l-widget-content';
            deps.markExt(content);

            var padding = document.createElement('div');
            padding.className = 'd2l-widget-content-padding';
            padding.setAttribute('data-dtu-semester-twin-body', '1');
            deps.markExt(padding);
            padding.style.cssText = 'padding:6px 12px 12px !important;';

            content.appendChild(padding);
            widget.appendChild(content);
        }

        var filterInputEl = widget.querySelector('[data-dtu-semester-twin-filter-input]');
        if (filterInputEl) {
            filterInputEl.checked = hideOwnProgram;
            filterInputEl.disabled = !selfProgram;
            filterInputEl.title = selfProgram
                ? ('When enabled, Semester Twins will only show students from other study lines.'
                    + (lineSpecificCourseCount ? (' It also hides students who share your study-line-specific courses (' + lineSpecificCourseCount + ' detected).') : ''))
                : 'Your study line is unknown yet. Visit a CampusNet participant page (Users list) to learn it.';
            if (filterInputEl.getAttribute('data-dtu-semester-twin-filter-bound') !== '1') {
                filterInputEl.setAttribute('data-dtu-semester-twin-filter-bound', '1');
                filterInputEl.addEventListener('change', function () {
                    deps.updateSemesterTwinPrefs({ hideOwnProgram: !!filterInputEl.checked });
                    resetTwinTimestamps();
                    try { deps.requestCampusnetRender(); } catch (e2) { }
                });
            }
        }

        placeSemesterTwinWidget(widget, col3);
        applySemesterTwinTheme(widget, isDark);

        if (widget.getAttribute('data-dtu-semester-twin-sig') === sig) return;
        widget.setAttribute('data-dtu-semester-twin-sig', sig);

        var body = widget.querySelector('[data-dtu-semester-twin-body]');
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        if (emptyMessage && (!twins || twins.length === 0)) {
            var msg = document.createElement('div');
            deps.markExt(msg);
            msg.textContent = emptyMessage;
            msg.style.cssText = 'font-size:11px;opacity:0.82;line-height:1.4;margin:3px 0 6px;max-width:760px;';
            body.appendChild(msg);
        }

        for (var i = 0; i < twins.length; i++) {
            body.appendChild(buildTwinMatchCard(twins[i], myTotal, courseNames, isDark, i));
        }

        var note = document.createElement('div');
        deps.markExt(note);
        var baseNote = (!emptyMessage && showingClosest)
            ? 'No 50%+ twins yet. Showing closest matches from your course history.'
            : 'Based on participant lists you have visited.';
        var lsExtra = '';
        if (hideOwnProgram && selfProgram && lineSpecificCourseCount) {
            var excluded = Math.max(0, (myTotalBeforeLineSpecific || 0) - (myTotalAfterLineSpecific || 0));
            if (excluded > 0) {
                lsExtra += ' Ignoring ' + excluded + ' study-line-specific course' + (excluded === 1 ? '' : 's') + ' for matching.';
            }
            if (lineSpecificSuppressed > 0) {
                lsExtra += ' Hiding ' + lineSpecificSuppressed + ' student' + (lineSpecificSuppressed === 1 ? '' : 's') + ' with study-line-specific overlap.';
            }
            if (lineSpecificNote) {
                lsExtra += ' ' + lineSpecificNote;
            }
        }
        note.textContent = baseNote + lsExtra;
        if (hideOwnProgram && selfProgram && lineSpecificCourseCount && lineSpecificCourses && lineSpecificCourses.length) {
            note.title = 'Study-line-specific courses detected: ' + lineSpecificCourses.join(', ');
        }
        note.style.cssText = 'font-size:10px;line-height:1.4;opacity:0.58;margin-top:10px;max-width:760px;';
        body.appendChild(note);
    }

    function findCampusnetFrontpageAnchorWidget() {
        var widgets = document.querySelectorAll('.widget');
        for (var i = 0; i < widgets.length; i++) {
            var w = widgets[i];
            var titleEl = w.querySelector('.widget__title');
            var title = deps.normalizeWhitespace(titleEl ? titleEl.textContent : '');
            if (title && /mobile phone number/i.test(title)) return w;
            if (title && /phone number/i.test(title) && /up to date|update/i.test(title)) return w;
        }
        for (var j = 0; j < widgets.length; j++) {
            var w2 = widgets[j];
            if (w2.querySelector('.icon--messages, .icon__content.icon--messages')) return w2;
        }
        return null;
    }

    function placeCampusnetSemesterTwinWidget(widget) {
        if (!widget) return false;
        var anchor = findCampusnetFrontpageAnchorWidget();
        if (anchor && anchor.parentNode) {
            if (widget.parentNode !== anchor.parentNode || widget.previousElementSibling !== anchor) {
                anchor.parentNode.insertBefore(widget, anchor.nextSibling);
            }
            return true;
        }

        var anyNativeWidget = document.querySelector('.widget:not([data-dtu-campusnet-semester-twin])');
        var container = (anyNativeWidget && anyNativeWidget.parentElement)
            || document.querySelector('.widgets, .widget-area, .widget-container, .frontpage')
            || null;
        if (!container) return false;
        if (widget.parentNode !== container) container.appendChild(widget);
        return true;
    }

    function canPlaceCampusnetSemesterTwinWidget() {
        var anchor = findCampusnetFrontpageAnchorWidget();
        if (anchor && anchor.parentNode) return true;
        var anyNativeWidget = document.querySelector('.widget:not([data-dtu-campusnet-semester-twin])');
        if (anyNativeWidget && anyNativeWidget.parentElement) return true;
        if (document.querySelector('.widgets, .widget-area, .widget-container, .frontpage')) return true;
        return false;
    }

    function scheduleCampusnetSemesterTwinEnsure(delayMs) {
        if (!deps.isTopWindow) return;
        var state = getState();
        if (state.campusnetSemesterTwinRetryTimer) return;
        var timer = setTimeout(function () {
            setState({ campusnetSemesterTwinRetryTimer: null });

            if (!deps.isCampusnetFrontpageDTU()) {
                setState({ campusnetSemesterTwinRetryAttempts: 0 });
                return;
            }
            if (!deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey)
                || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelSemesterTwinsKey)) {
                setState({ campusnetSemesterTwinRetryAttempts: 0 });
                var old = document.querySelector('[data-dtu-campusnet-semester-twin]');
                if (old) old.remove();
                return;
            }
            if (document.hidden) {
                scheduleCampusnetSemesterTwinEnsure(900);
                return;
            }

            var attempts = (getState().campusnetSemesterTwinRetryAttempts || 0) + 1;
            setState({ campusnetSemesterTwinRetryAttempts: attempts });

            var widget = document.querySelector('[data-dtu-campusnet-semester-twin]');
            if (widget) {
                placeCampusnetSemesterTwinWidget(widget);
                applyCampusnetSemesterTwinTheme(widget, getIsDark());
            } else {
                setState({ participantIntelSemesterTwinCampusnetLastTs: 0 });
                try { deps.requestCampusnetRender(); } catch (e1) { }
                widget = document.querySelector('[data-dtu-campusnet-semester-twin]');
            }

            var anchor = findCampusnetFrontpageAnchorWidget();
            var anchoredOk = !!(anchor && widget && widget.parentNode === anchor.parentNode && widget.previousElementSibling === anchor);

            if (!widget || !anchoredOk) {
                if (attempts < 40) scheduleCampusnetSemesterTwinEnsure(450);
                else setState({ campusnetSemesterTwinRetryAttempts: 0 });
            } else {
                setState({ campusnetSemesterTwinRetryAttempts: 0 });
            }
        }, delayMs || 220);
        setState({ campusnetSemesterTwinRetryTimer: timer });
    }

    function applyCampusnetSemesterTwinTheme(widget, isDark) {
        if (!widget) return;
        var surfaceBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(148,163,184,0.20)';
        widget.style.setProperty('background', isDark ? '#2d2d2d' : '#ffffff', 'important');
        widget.style.setProperty('background-color', isDark ? '#2d2d2d' : '#ffffff', 'important');
        widget.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
        widget.style.setProperty('border', '1px solid ' + surfaceBorder, 'important');
        widget.style.setProperty('border-radius', '14px', 'important');
        widget.style.setProperty('box-shadow', isDark
            ? 'inset 0 0 0 1px rgba(255,255,255,0.02)'
            : 'inset 0 0 0 1px rgba(255,255,255,0.6)', 'important');

        var header = widget.querySelector('[data-dtu-campusnet-semester-twin-header]');
        var body = widget.querySelector('[data-dtu-campusnet-semester-twin-body]');
        var title = widget.querySelector('.widget__title');
        if (header) {
            header.style.setProperty('background', 'transparent', 'important');
            header.style.setProperty('background-color', 'transparent', 'important');
            header.style.setProperty('border-bottom', '1px solid ' + surfaceBorder, 'important');
            header.style.setProperty('color', isDark ? '#f3f4f6' : '#1f2937', 'important');
        }
        if (title) {
            title.style.setProperty('color', isDark ? '#f3f4f6' : '#1f2937', 'important');
            title.style.setProperty('background', 'transparent', 'important');
            title.style.setProperty('background-color', 'transparent', 'important');
            title.style.setProperty('font-size', '18px', 'important');
            title.style.setProperty('font-weight', '800', 'important');
            title.style.setProperty('letter-spacing', '-0.01em', 'important');
        }
        if (body) {
            body.style.setProperty('background', 'transparent', 'important');
            body.style.setProperty('background-color', 'transparent', 'important');
            body.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
        }
        var filterBtn = widget.querySelector('[data-dtu-semester-twin-filterbtn]');
        if (filterBtn) {
            filterBtn.style.setProperty('background', isDark ? 'rgba(255,255,255,0.07)' : 'rgba(241,245,249,0.95)', 'important');
            filterBtn.style.setProperty('background-color', isDark ? 'rgba(255,255,255,0.07)' : 'rgba(241,245,249,0.95)', 'important');
            filterBtn.style.setProperty('color', isDark ? '#f3f4f6' : '#334155', 'important');
        }
        var filterDrop = widget.querySelector('[data-dtu-semester-twin-filterdrop]');
        if (filterDrop) {
            filterDrop.style.setProperty('background', isDark ? '#2d2d2d' : '#ffffff', 'important');
            filterDrop.style.setProperty('background-color', isDark ? '#2d2d2d' : '#ffffff', 'important');
            filterDrop.style.setProperty('border', '1px solid ' + surfaceBorder, 'important');
            filterDrop.style.setProperty('box-shadow', isDark ? '0 16px 38px rgba(0,0,0,0.34)' : '0 16px 38px rgba(15,23,42,0.16)', 'important');
            filterDrop.style.setProperty('color', isDark ? '#e0e0e0' : '#333', 'important');
        }
        widget.querySelectorAll('[data-dtu-campusnet-semester-twin-scope-select],[data-dtu-campusnet-semester-twin-limit-select]').forEach(function (sel) {
            sel.style.setProperty('background', isDark ? '#1a1a1a' : '#f8fafc', 'important');
            sel.style.setProperty('background-color', isDark ? '#1a1a1a' : '#f8fafc', 'important');
            sel.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
            sel.style.setProperty('border', '1px solid ' + (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(148,163,184,0.28)'), 'important');
        });
        var scanBtn = widget.querySelector('[data-dtu-twin-scan-btn]');
        if (scanBtn) {
            scanBtn.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
            scanBtn.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
            scanBtn.style.setProperty('color', '#ffffff', 'important');
        }
        var scanStopBtn = widget.querySelector('[data-dtu-twin-scan-stop]');
        if (scanStopBtn) {
            scanStopBtn.style.setProperty('background', isDark ? 'rgba(255,255,255,0.06)' : 'rgba(241,245,249,0.95)', 'important');
            scanStopBtn.style.setProperty('background-color', isDark ? 'rgba(255,255,255,0.06)' : 'rgba(241,245,249,0.95)', 'important');
            scanStopBtn.style.setProperty('border', '1px solid ' + surfaceBorder, 'important');
            scanStopBtn.style.setProperty('color', isDark ? '#f3f4f6' : '#334155', 'important');
        }
        widget.querySelectorAll('[data-dtu-campusnet-semester-twin-row],[data-dtu-semester-twin-row]').forEach(function (row) {
            row.style.setProperty('background', isDark ? '#1f1f1f' : '#f7f9fc', 'important');
            row.style.setProperty('background-color', isDark ? '#1f1f1f' : '#f7f9fc', 'important');
            row.style.setProperty('border', '0', 'important');
            row.style.setProperty('box-shadow', isDark
                ? 'inset 0 0 0 1px rgba(255,255,255,0.05)'
                : 'inset 0 0 0 1px rgba(148,163,184,0.18)', 'important');
            row.style.setProperty('color', isDark ? '#e0e0e0' : '#1f2937', 'important');
        });
        widget.querySelectorAll('[data-dtu-campusnet-semester-twin-name],[data-dtu-campusnet-semester-twin-program]').forEach(function (el) {
            el.style.setProperty('background', 'transparent', 'important');
            el.style.setProperty('background-color', 'transparent', 'important');
            el.style.setProperty('color', isDark ? '#e5e7eb' : '#1f2937', 'important');
        });
    }

    function renderCampusnetSemesterTwinWidget(twins, myTotal, meta) {
        if (!deps.isCampusnetFrontpageDTU()) return;

        var isDark = getIsDark();
        var showingClosest = !!(meta && meta.showingClosest);
        var emptyMessage = (meta && meta.emptyMessage) ? meta.emptyMessage : '';
        var hideOwnProgram = !!(meta && meta.hideOwnProgram);
        var selfProgram = (meta && meta.selfProgram) ? meta.selfProgram : '';
        var courseNames = (meta && meta.courseNames) ? meta.courseNames : {};
        var rowLimit = (meta && meta.rowLimit === 10) ? 10 : 5;
        var scope = (meta && meta.scope === 'all') ? 'all' : 'semester';
        var historyTotal = (meta && typeof meta.historyTotal === 'number') ? meta.historyTotal : 0;
        var currentTotal = (meta && typeof meta.currentTotal === 'number') ? meta.currentTotal : 0;
        var currentVerifiedTotal = (meta && typeof meta.currentVerifiedTotal === 'number') ? meta.currentVerifiedTotal : currentTotal;
        var currentSeededTotal = (meta && typeof meta.currentSeededTotal === 'number') ? meta.currentSeededTotal : Math.max(0, currentTotal - currentVerifiedTotal);
        var myTotalBeforeLineSpecific = (meta && typeof meta.myTotalBeforeLineSpecific === 'number') ? meta.myTotalBeforeLineSpecific : myTotal;
        var myTotalAfterLineSpecific = (meta && typeof meta.myTotalAfterLineSpecific === 'number') ? meta.myTotalAfterLineSpecific : myTotal;
        var lineSpecificCourseCount = (meta && typeof meta.lineSpecificCourseCount === 'number') ? meta.lineSpecificCourseCount : 0;
        var lineSpecificCourses = (meta && meta.lineSpecificCourses && meta.lineSpecificCourses.length) ? meta.lineSpecificCourses : [];
        var lineSpecificSuppressed = (meta && typeof meta.lineSpecificSuppressed === 'number') ? meta.lineSpecificSuppressed : 0;
        var lineSpecificNote = (meta && meta.lineSpecificNote) ? meta.lineSpecificNote : '';

        var sig = (isDark ? 'd' : 'l') + '|'
            + (hideOwnProgram ? 'hideOwn1' : 'hideOwn0') + '|'
            + (selfProgram || '') + '|'
            + rowLimit + '|'
            + scope + '|'
            + myTotal + '|'
            + currentTotal + '|' + currentVerifiedTotal + '|' + currentSeededTotal + '|'
            + myTotalBeforeLineSpecific + '|' + myTotalAfterLineSpecific + '|'
            + lineSpecificCourseCount + '|' + lineSpecificSuppressed + '|'
            + (lineSpecificNote || '') + '|' + (lineSpecificCourses || []).join(',') + '|'
            + (showingClosest ? 'closest' : 'twins') + '|'
            + emptyMessage + '|'
            + (twins || []).map(function (t) {
                var pct = Math.round(t.syncScore * 100);
                var sharedSig = '';
                if (t.shared && t.shared.length) {
                    sharedSig = t.shared.map(function (code) {
                        var nm = deps.normalizeWhitespace(courseNames[code] || '');
                        return code + '=' + nm;
                    }).join(',');
                }
                return (t.sNumber || '') + ':' + pct + ':' + sharedSig + ':' + (t.program || '') + ':' + (t.name || '');
            }).join('|');

        var widget = document.querySelector('[data-dtu-campusnet-semester-twin]');
        if (!widget) {
            widget = document.createElement('div');
            widget.className = 'widget';
            widget.setAttribute('data-dtu-campusnet-semester-twin', '1');
            deps.markExt(widget);
            widget.style.cssText = 'border-radius:14px;overflow:visible;';

            var header = document.createElement('div');
            header.className = 'widget__header';
            header.setAttribute('data-dtu-campusnet-semester-twin-header', '1');
            deps.markExt(header);
            header.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:16px 18px 10px;';

            var h2 = document.createElement('h2');
            h2.className = 'widget__title';
            deps.markExt(h2);
            h2.textContent = 'Semester Twins';
            h2.style.cssText = 'margin:0;min-width:0;flex:1 1 auto;font-size:18px;font-weight:800;letter-spacing:-0.01em;';

            header.appendChild(h2);

            var filterPanel = deps.buildTwinFilterDropdown(isDark,
                { hideOwnProgram: hideOwnProgram, scope: scope, rowLimit: rowLimit },
                selfProgram, lineSpecificCourseCount, { campusnet: true });
            header.appendChild(filterPanel);

            widget.appendChild(header);

            var content = document.createElement('div');
            content.className = 'widget__content';
            content.setAttribute('data-dtu-campusnet-semester-twin-body', '1');
            deps.markExt(content);
            content.style.cssText = 'padding:8px 18px 16px;';
            widget.appendChild(content);
        }

        var scopeSelectEl = widget.querySelector('[data-dtu-campusnet-semester-twin-scope-select]');
        if (scopeSelectEl) {
            scopeSelectEl.value = scope;
            if (scopeSelectEl.getAttribute('data-dtu-campusnet-semester-twin-scope-bound') !== '1') {
                scopeSelectEl.setAttribute('data-dtu-campusnet-semester-twin-scope-bound', '1');
                scopeSelectEl.addEventListener('change', function () {
                    deps.updateSemesterTwinPrefs({ scope: String(scopeSelectEl.value || 'semester') });
                    resetTwinTimestamps();
                    try { deps.requestCampusnetRender(); } catch (e1) { }
                });
            }
        }

        var limitSelectEl = widget.querySelector('[data-dtu-campusnet-semester-twin-limit-select]');
        if (limitSelectEl) {
            limitSelectEl.value = String(rowLimit);
            if (limitSelectEl.getAttribute('data-dtu-campusnet-semester-twin-limit-bound') !== '1') {
                limitSelectEl.setAttribute('data-dtu-campusnet-semester-twin-limit-bound', '1');
                limitSelectEl.addEventListener('change', function () {
                    deps.updateSemesterTwinPrefs({ rowLimit: parseInt(limitSelectEl.value, 10) });
                    resetTwinTimestamps();
                    try { deps.requestCampusnetRender(); } catch (e1) { }
                });
            }
        }

        var filterInputEl = widget.querySelector('[data-dtu-campusnet-semester-twin-filter-input]');
        if (filterInputEl) {
            filterInputEl.checked = hideOwnProgram;
            filterInputEl.disabled = !selfProgram;
            filterInputEl.title = selfProgram
                ? ('When enabled, Semester Twins will only show students from other study lines.'
                    + (lineSpecificCourseCount ? (' It also hides students who share your study-line-specific courses (' + lineSpecificCourseCount + ' detected).') : ''))
                : 'Your study line is unknown yet. Visit a CampusNet participant page (Users list) to learn it.';
            if (filterInputEl.getAttribute('data-dtu-campusnet-semester-twin-filter-bound') !== '1') {
                filterInputEl.setAttribute('data-dtu-campusnet-semester-twin-filter-bound', '1');
                filterInputEl.addEventListener('change', function () {
                    deps.updateSemesterTwinPrefs({ hideOwnProgram: !!filterInputEl.checked });
                    resetTwinTimestamps();
                    try { deps.requestCampusnetRender(); } catch (e1) { }
                });
            }
        }

        placeCampusnetSemesterTwinWidget(widget);
        applyCampusnetSemesterTwinTheme(widget, isDark);

        if (widget.getAttribute('data-dtu-campusnet-semester-twin-sig') === sig) return;
        widget.setAttribute('data-dtu-campusnet-semester-twin-sig', sig);

        var body = widget.querySelector('[data-dtu-campusnet-semester-twin-body]');
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        if (emptyMessage && (!twins || twins.length === 0)) {
            var msg = document.createElement('div');
            deps.markExt(msg);
            msg.textContent = emptyMessage;
            msg.style.cssText = 'font-size:13px;opacity:0.82;line-height:1.45;margin:4px 0 10px;max-width:860px;';
            body.appendChild(msg);
        }

        var list = (twins || []).slice(0, rowLimit);
        for (var i = 0; i < list.length; i++) {
            body.appendChild(buildTwinMatchCard(list[i], myTotal, courseNames, isDark, i));
        }

        var note = document.createElement('div');
        deps.markExt(note);
        var baseNote = '';
        if (!emptyMessage && showingClosest) {
            baseNote = (scope === 'all')
                ? 'No 50%+ twins yet. Showing closest matches based on participant lists you have visited.'
                : 'No 50%+ twins yet. Showing closest matches based on participant lists you have visited this semester.';
        } else {
            baseNote = (scope === 'all')
                ? 'Based on participant lists you have visited.'
                : 'Based on participant lists you have visited this semester.';
        }
        var fillNote = '';
        if (!emptyMessage) {
            if (meta && meta.includingClosest) {
                fillNote = ' Including closest matches to fill your "Show" limit.';
            } else if (showingClosest && meta && meta.includesLowOverlap) {
                fillNote = ' Including small overlaps to fill the list.';
            } else if (showingClosest && meta && meta.includesZeroOverlap) {
                fillNote = ' Including 0-overlap students to fill the list.';
            }
        }
        var extra = (twins && twins.length > list.length) ? (' Showing ' + list.length + ' of ' + twins.length + '.') : '';
        var scopeNote = (scope === 'all')
            ? (' Matching across all ' + historyTotal + ' courses in your history.')
            : (' Showing classmates in your ' + currentTotal + ' current course' + (currentTotal === 1 ? '' : 's') + ', ranked by weighted current-semester overlap (verified courses first) with history as tie-breaker (' + historyTotal + ' courses).');
        if (scope === 'semester' && currentSeededTotal > 0 && currentVerifiedTotal > 0) {
            scopeNote += ' Using ' + currentVerifiedTotal + ' verified current course' + (currentVerifiedTotal === 1 ? '' : 's') + '; frontpage-only detections are down-weighted.';
        }
        var lsExtra = '';
        if (hideOwnProgram && selfProgram && lineSpecificCourseCount) {
            var excluded = Math.max(0, (myTotalBeforeLineSpecific || 0) - (myTotalAfterLineSpecific || 0));
            if (excluded > 0) {
                lsExtra += ' Ignoring ' + excluded + ' study-line-specific course' + (excluded === 1 ? '' : 's') + ' for matching.';
            }
            if (lineSpecificSuppressed > 0) {
                lsExtra += ' Hiding ' + lineSpecificSuppressed + ' student' + (lineSpecificSuppressed === 1 ? '' : 's') + ' with study-line-specific overlap.';
            }
            if (lineSpecificNote) {
                lsExtra += ' ' + lineSpecificNote;
            }
        }
        note.textContent = baseNote + fillNote + extra + scopeNote + lsExtra;
        if (hideOwnProgram && selfProgram && lineSpecificCourseCount && lineSpecificCourses && lineSpecificCourses.length) {
            note.title = 'Study-line-specific courses detected: ' + lineSpecificCourses.join(', ');
        }
        note.style.cssText = 'font-size:11px;line-height:1.45;opacity:0.60;margin-top:12px;max-width:1100px;';
        body.appendChild(note);
    }

    function insertCampusnetSemesterTwinWidget() {
        if (!deps.isTopWindow) return;

        var existing = document.querySelector('[data-dtu-campusnet-semester-twin]');
        if (!deps.isCampusnetFrontpageDTU()) {
            if (existing) existing.remove();
            return;
        }

        if (!deps.isFeatureFlagEnabled(deps.featureParticipantIntelKey)
            || !deps.isFeatureFlagEnabled(deps.featureParticipantIntelSemesterTwinsKey)) {
            if (existing) existing.remove();
            return;
        }

        if (!canPlaceCampusnetSemesterTwinWidget()) {
            scheduleCampusnetSemesterTwinEnsure(350);
            return;
        }

        var state = getState();
        var now = Date.now();
        if ((now - (state.participantIntelSemesterTwinCampusnetLastTs || 0)) < 5000) {
            if (existing) {
                placeCampusnetSemesterTwinWidget(existing);
                applyCampusnetSemesterTwinTheme(existing, getIsDark());
            }
            return;
        }
        setState({ participantIntelSemesterTwinCampusnetLastTs: now });

        deps.loadParticipantIntel(function (intel) {
            deps.seedActiveFrontpageCourses(intel);

            deps.loadSemesterTwinPrefs(function (prefs) {
                var computed = deps.computeSemesterTwinData(intel, prefs);
                renderCampusnetSemesterTwinWidget(computed.twins, computed.myTotal, computed.meta);
                scheduleCampusnetSemesterTwinEnsure(600);
            });
        });
    }

    globalThis.DTUAfterDarkSemesterTwinsUi = {
        removeDTULearnSemesterTwinWidget: removeDTULearnSemesterTwinWidget,
        insertSemesterTwinWidget: insertSemesterTwinWidget,
        insertCampusnetSemesterTwinWidget: insertCampusnetSemesterTwinWidget
    };
})();
