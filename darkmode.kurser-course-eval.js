(function () {
    'use strict';

    function getDeps() {
        try { return globalThis.DTUAfterDarkKurserCourseEvalDeps || null; } catch (e0) { return null; }
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

    function getKurserInsightTheme() {
        var deps = getDeps();
        if (deps && typeof deps.getKurserInsightTheme === 'function') return deps.getKurserInsightTheme();
        return null;
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
        return '';
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

    function isDarkModeEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDarkModeEnabled === 'function' && deps.isDarkModeEnabled());
    }

    function getFeatureKurserCourseEvalKey() {
        var deps = getDeps();
        return deps && deps.featureKurserCourseEvalKey;
    }

    var _courseEvalRequested = false;
    var _courseEvalCourseCode = null;
    var _courseEvalRetryTimer = null;

    function insertKurserCourseEvaluation() {
        if (!isTopWindow()) return;
        if (!isFeatureFlagEnabled(getFeatureKurserCourseEvalKey())) {
            var existingEval = document.querySelector('[data-dtu-course-eval]');
            if (existingEval) existingEval.remove();
            pruneCourseWidgetsGrid();
            _courseEvalRequested = false;
            _courseEvalCourseCode = null;
            return;
        }
        if (!isKurserCoursePage()) return;

        var courseCode = getKurserCourseCode();
        if (!courseCode) return;

        var container = null;
        var status = null;
        var panelTheme = getKurserInsightTheme();

        var existingEval = document.querySelector('[data-dtu-course-eval]');
        if (existingEval) {
            var existingCourse = String(existingEval.getAttribute('data-dtu-course-eval-code') || '').toUpperCase();
            if (existingCourse === courseCode) {
                container = existingEval;
                if (container.getAttribute('data-dtu-course-eval-loaded') === '1') return;
                status = container.querySelector('[data-dtu-course-eval-status]');
                if (!status) {
                    var divs = container.querySelectorAll('div');
                    if (divs && divs.length) status = divs[divs.length - 1];
                }
            } else {
                existingEval.remove();
                _courseEvalRequested = false;
                _courseEvalCourseCode = null;
            }
        }

        var baseStyle = getKurserInsightContainerStyle(panelTheme);

        if (!container) {
            var gradeStats = document.querySelector('[data-dtu-grade-stats]');
            var insertAnchor = gradeStats;
            var widgetsGrid = null;
            if (gradeStats && gradeStats.parentNode && gradeStats.parentNode.getAttribute && gradeStats.parentNode.getAttribute('data-dtu-course-widgets-grid') === '1') {
                widgetsGrid = gradeStats.parentNode;
            }
            if (!insertAnchor || !widgetsGrid) {
                var titleEl = findKurserCourseTitleElement(courseCode);
                insertAnchor = insertAnchor || (titleEl ? findKurserGradeStatsInsertAnchor(titleEl) : null);
            }
            if (!insertAnchor || !insertAnchor.parentNode) return;
            if (!widgetsGrid) widgetsGrid = getOrCreateCourseWidgetsGrid(insertAnchor, courseCode);
            if (gradeStats && gradeStats.parentNode !== widgetsGrid) {
                widgetsGrid.insertBefore(gradeStats, widgetsGrid.firstChild || null);
            }

            container = document.createElement('div');
            container.setAttribute('data-dtu-course-eval', '1');
            container.setAttribute('data-dtu-course-eval-code', courseCode);
            markExt(container);
            container.style.cssText = baseStyle;

            var title = document.createElement('div');
            markExt(title);
            title.textContent = 'Course Evaluation';
            title.style.cssText = 'font-weight: 800; font-size: 14px; line-height: 1.15; margin-bottom: 4px;';
            container.appendChild(title);

            status = document.createElement('div');
            markExt(status);
            status.setAttribute('data-dtu-course-eval-status', '1');
            status.textContent = 'Loading evaluation data...';
            status.style.cssText = 'font-size: 11px; color: ' + panelTheme.mutedText + ';';
            container.appendChild(status);

            if (gradeStats && gradeStats.parentNode === widgetsGrid) {
                gradeStats.insertAdjacentElement('afterend', container);
            } else {
                widgetsGrid.appendChild(container);
            }
        } else {
            container.style.cssText = baseStyle;
            if (!status || !status.parentNode) {
                status = document.createElement('div');
                container.appendChild(status);
            }
            markExt(status);
            status.setAttribute('data-dtu-course-eval-status', '1');
        }

        var nextTryAt = parseInt(container.getAttribute('data-dtu-course-eval-nexttry') || '0', 10) || 0;
        if (nextTryAt && Date.now() < nextTryAt) return;
        if (nextTryAt) container.removeAttribute('data-dtu-course-eval-nexttry');

        if (_courseEvalRequested && _courseEvalCourseCode === courseCode) return;
        _courseEvalRequested = true;
        _courseEvalCourseCode = courseCode;

        status.textContent = 'Loading evaluation data...';

        function scheduleCourseEvalRetry(ms) {
            _courseEvalRequested = false;
            var delay = ms || 5000;
            try { container.setAttribute('data-dtu-course-eval-nexttry', String(Date.now() + delay)); } catch (e) { }

            try {
                if (_courseEvalRetryTimer) clearTimeout(_courseEvalRetryTimer);
                _courseEvalRetryTimer = setTimeout(function () {
                    _courseEvalRetryTimer = null;
                    try { insertKurserCourseEvaluation(); } catch (e) { }
                }, delay + 30);
            } catch (e) {
            }
        }

        function fetchAndRenderEvaluation(latestEvalUrl, latestEvalLabel) {
            if (!latestEvalUrl) {
                status.textContent = 'No evaluations available';
                scheduleCourseEvalRetry(8000);
                return;
            }

            sendRuntimeMessage({
                type: 'dtu-course-evaluation',
                url: latestEvalUrl
            }, function (response) {
                if (!response || !response.ok || !response.data) {
                    var reason = (response && response.error) ? response.error : 'unknown';
                    status.textContent = 'No evaluation data available';
                    console.log('[DTU After Dark] Course eval: background fetch failed', reason, response);
                    scheduleCourseEvalRetry(12000);
                    return;
                }
                container.setAttribute('data-dtu-course-eval-loaded', '1');
                renderCourseEvaluationPanel(container, response.data, latestEvalUrl, latestEvalLabel);
            });
        }

        try {
            var domLinks = [];
            var sel = 'a[href*="evaluering.dtu.dk/kursus/"], a[href^="//evaluering.dtu.dk/kursus/"], a[href^="evaluering.dtu.dk/kursus/"]';
            var anchors = document.querySelectorAll(sel);
            for (var i = 0; i < anchors.length; i++) {
                var a = anchors[i];
                if (!a || !a.getAttribute) continue;
                var href = String(a.getAttribute('href') || '').trim();
                if (!href) continue;
                if (/^\/\//.test(href)) href = 'https:' + href;
                if (/^evaluering\.dtu\.dk\//i.test(href)) href = 'https://' + href;
                if (!/\/kursus\//i.test(href)) continue;
                if (href.toUpperCase().indexOf('/KURSUS/' + courseCode + '/') === -1) continue;
                var m = href.match(/\/kursus\/\d+\/(\d+)(?:[/?#]|$)/i);
                var id = m ? (parseInt(m[1], 10) || 0) : 0;
                domLinks.push({
                    url: href,
                    text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
                    id: id
                });
            }

            if (domLinks.length) {
                domLinks.sort(function (a, b) { return (b.id || 0) - (a.id || 0); });
                var bestDom = domLinks[0];
                console.log('[DTU After Dark] Course eval: found eval URL in DOM', bestDom.url);
                fetchAndRenderEvaluation(bestDom.url, bestDom.text || 'Evaluation results');
                return;
            }
        } catch (e) {
        }

        var courseBasePath = null;
        try {
            var baseMatch = window.location.pathname.match(/\/course\/(?:\d{4}-\d{4}\/)?[A-Za-z0-9]+/i);
            courseBasePath = (baseMatch && baseMatch[0]) ? baseMatch[0] : null;
        } catch (e) {
            courseBasePath = null;
        }
        if (!courseBasePath) {
            courseBasePath = '/course/' + encodeURIComponent(courseCode);
        }
        var infoUrl = window.location.origin + courseBasePath + '/info';

        var infoFetchCreds = 'omit';
        try {
            infoFetchCreds = String(container.getAttribute('data-dtu-course-eval-info-cred') || 'omit');
        } catch (e) {
            infoFetchCreds = 'omit';
        }

        if (infoFetchCreds !== 'omit' && document.readyState !== 'complete') {
            status.textContent = 'Waiting for page to finish loading...';
            scheduleCourseEvalRetry(900);
            return;
        }

        var infoFetchOpts = { credentials: infoFetchCreds, cache: 'no-store' };
        try { infoFetchOpts.headers = { 'Accept': 'text/html' }; } catch (e) { }

        fetch(infoUrl, infoFetchOpts)
            .then(function (res) {
                if (!res.ok) throw new Error('info_http_' + res.status);
                return res.text();
            })
            .then(function (infoHtml) {
                function normalizeEvalHref(href) {
                    href = String(href || '').trim();
                    if (!href) return null;
                    href = href.replace(/&amp;/gi, '&');
                    if (/^\/\//.test(href)) href = 'https:' + href;
                    if (/^https?:\/\//i.test(href)) {
                        if (!/\/\/evaluering\.dtu\.dk(\/|$)/i.test(href)) return null;
                        return href;
                    }
                    if (/^evaluering\.dtu\.dk(\/|$)/i.test(href)) return 'https://' + href;
                    if (/^\/kursus\/\d+/i.test(href)) return 'https://evaluering.dtu.dk' + href;
                    return null;
                }

                var evalLinks = [];

                function pushEvalLink(url, text) {
                    if (!url) return;
                    var cleanText = String(text || '').replace(/\s+/g, ' ').trim();
                    if (!cleanText) cleanText = 'Evaluation results';
                    evalLinks.push({ url: url, text: cleanText });
                }

                try {
                    if (typeof DOMParser !== 'undefined') {
                        var doc = new DOMParser().parseFromString(infoHtml, 'text/html');
                        var anchors = (doc && doc.querySelectorAll) ? doc.querySelectorAll('a[href]') : [];
                        for (var i = 0; i < anchors.length; i++) {
                            var a = anchors[i];
                            if (!a || !a.getAttribute) continue;
                            var url = normalizeEvalHref(a.getAttribute('href'));
                            if (!url) continue;
                            pushEvalLink(url, a.textContent || '');
                        }
                    }
                } catch (e) {
                }

                if (!evalLinks.length) {
                    var evalLinkRegex = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
                    var linkMatch;
                    while ((linkMatch = evalLinkRegex.exec(infoHtml)) !== null) {
                        var url = normalizeEvalHref(linkMatch[1]);
                        if (!url) continue;
                        var text = String(linkMatch[2] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                        pushEvalLink(url, text);
                    }
                }

                if (!evalLinks.length) {
                    var urlRegex = /(https?:\/\/evaluering\.dtu\.dk\/[^\s"'<>]+|\/\/evaluering\.dtu\.dk\/[^\s"'<>]+)/gi;
                    var urlMatch;
                    while ((urlMatch = urlRegex.exec(infoHtml)) !== null) {
                        var url = normalizeEvalHref(urlMatch[1]);
                        if (!url) continue;
                        pushEvalLink(url, '');
                    }
                }

                if (evalLinks.length > 1) {
                    var seen = {};
                    var uniq = [];
                    for (var j = 0; j < evalLinks.length; j++) {
                        var u = evalLinks[j] && evalLinks[j].url;
                        if (!u || seen[u]) continue;
                        seen[u] = 1;
                        uniq.push(evalLinks[j]);
                    }
                    evalLinks = uniq;
                }

                var bestEval = null;
                var bestId = -1;
                for (var k = 0; k < evalLinks.length; k++) {
                    var match = String(evalLinks[k].url || '').match(/\/kursus\/\d+\/(\d+)(?:[/?#]|$)/i);
                    var id = match ? (parseInt(match[1], 10) || 0) : 0;
                    if (!bestEval || id > bestId) {
                        bestEval = evalLinks[k];
                        bestId = id;
                    }
                }

                if (!bestEval) {
                    var htmlLen = infoHtml ? infoHtml.length : 0;
                    var looksSuspicious = htmlLen > 0 && htmlLen < 1500;

                    if (infoFetchCreds === 'omit' && looksSuspicious && !container.getAttribute('data-dtu-course-eval-cookie-tried')) {
                        container.setAttribute('data-dtu-course-eval-cookie-tried', '1');
                        container.setAttribute('data-dtu-course-eval-info-cred', 'same-origin');
                        status.textContent = 'Loading evaluation data...';
                        console.log('[DTU After Dark] Course eval: /info response looked suspicious (len:', htmlLen, ') - retrying with cookies after load for', courseCode);
                        scheduleCourseEvalRetry(document.readyState === 'complete' ? 1600 : 2600);
                        return;
                    }

                    status.textContent = 'No evaluations available';
                    console.log('[DTU After Dark] Course eval: no eval links found in /info page for', courseCode, '(html length:', htmlLen, ', creds:', infoFetchCreds, ')');
                    if (looksSuspicious) scheduleCourseEvalRetry(8000);
                    return;
                }

                var latestEvalUrl = bestEval.url;
                var latestEvalLabel = bestEval.text;
                console.log('[DTU After Dark] Course eval: found eval URL', latestEvalUrl);
                try { container.removeAttribute('data-dtu-course-eval-info-cred'); } catch (e) { }
                fetchAndRenderEvaluation(latestEvalUrl, latestEvalLabel);
            })
            .catch(function (err) {
                status.textContent = 'Could not load evaluation data';
                console.log('[DTU After Dark] Course eval error:', err && err.message || err);
                scheduleCourseEvalRetry(8000);
            });
    }

    function getCourseEvalRailTheme() {
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

    function applyCourseEvalRailContainerStyle(container, rail) {
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

    function makeCourseEvalRailLabel(text, rail) {
        var el = document.createElement('div');
        markExt(el);
        el.textContent = text;
        el.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.78px;color:' + rail.muted + ';line-height:1.2;';
        clearCourseEvalRailBackground(el);
        return el;
    }

    function clearCourseEvalRailBackground(el) {
        if (!el || !el.style) return el;
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('background-color', 'transparent', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        return el;
    }

    function formatCourseEvalTerm(term) {
        return String(term || '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
    }

    function renderCourseEvalRail(container, data, evalUrl, satisfactionQuestions) {
        var rail = getCourseEvalRailTheme();
        applyCourseEvalRailContainerStyle(container, rail);
        container.innerHTML = '';
        markExt(container);

        var header = document.createElement('div');
        markExt(header);
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:14px;white-space:nowrap;margin:0 0 16px;min-width:0;';
        clearCourseEvalRailBackground(header);
        header.appendChild(makeCourseEvalRailLabel('Course Evaluation', rail));
        var period = document.createElement('div');
        markExt(period);
        period.textContent = formatCourseEvalTerm(data.period || '');
        period.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:.3px;color:' + rail.muted + ';text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;';
        clearCourseEvalRailBackground(period);
        header.appendChild(period);
        container.appendChild(header);

        var workloadAvg = data.workload && data.workload.average ? Number(data.workload.average) : 0;
        if (workloadAvg > 0) {
            var workload = document.createElement('div');
            markExt(workload);
            workload.style.cssText = 'padding:0 0 20px;border-bottom:1px solid ' + rail.hair + ';';
            clearCourseEvalRailBackground(workload);
            workload.appendChild(makeCourseEvalRailLabel('Workload', rail));

            var ruler = document.createElement('div');
            markExt(ruler);
            ruler.style.cssText = 'position:relative;height:22px;margin-top:11px;';
            clearCourseEvalRailBackground(ruler);
            var line = document.createElement('div');
            markExt(line);
            line.style.cssText = 'position:absolute;left:2px;right:2px;top:11px;height:1px;background:' + rail.track + ';';
            ruler.appendChild(line);
            [0, 25, 50, 75, 100].forEach(function (x) {
                var tick = document.createElement('span');
                markExt(tick);
                tick.style.cssText = 'position:absolute;left:' + x + '%;top:7px;width:1px;height:9px;background:' + rail.faint + ';transform:translateX(-.5px);';
                ruler.appendChild(tick);
            });
            var pos = Math.max(0, Math.min(100, ((workloadAvg - 1) / 4) * 100));
            var marker = document.createElement('span');
            markExt(marker);
            marker.style.cssText = 'position:absolute;left:' + pos.toFixed(1) + '%;top:4px;width:14px;height:14px;border-radius:50%;border:2px solid ' + rail.pageBg + ';box-sizing:border-box;transform:translateX(-50%);';
            marker.style.setProperty('background', rail.accent, 'important');
            marker.style.setProperty('background-color', rail.accent, 'important');
            ruler.appendChild(marker);
            workload.appendChild(ruler);

            var scale = document.createElement('div');
            markExt(scale);
            scale.style.cssText = 'display:flex;justify-content:space-between;gap:10px;margin-top:4px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;font-weight:700;color:' + rail.muted + ';';
            clearCourseEvalRailBackground(scale);
            ['Much less', 'As expected', 'Much more'].forEach(function (txt, idx) {
                var sp = document.createElement('span');
                markExt(sp);
                sp.textContent = txt;
                sp.style.cssText = 'min-width:0;' + (idx === 1 ? 'text-align:center;' : idx === 2 ? 'text-align:right;' : '');
                scale.appendChild(sp);
            });
            workload.appendChild(scale);

            var wlLabel = workloadAvg <= 1.5 ? 'Much less' : workloadAvg <= 2.5 ? 'Less' : workloadAvg <= 3.5 ? 'As expected' : workloadAvg <= 4.5 ? 'More' : 'Much more';
            var numeric = document.createElement('div');
            markExt(numeric);
            numeric.innerHTML = '<b></b> · <span></span>';
            numeric.querySelector('b').textContent = wlLabel;
            numeric.querySelector('span').textContent = workloadAvg.toFixed(2) + ' / 5';
            numeric.style.cssText = 'margin-top:9px;font-size:12px;color:' + rail.muted + ';font-variant-numeric:tabular-nums;';
            clearCourseEvalRailBackground(numeric);
            numeric.querySelector('b').style.color = rail.ink;
            workload.appendChild(numeric);
            container.appendChild(workload);
        }

        var overallQuestions = satisfactionQuestions.length ? satisfactionQuestions : (data.questions || []);
        var overallSum = 0;
        var overallCount = 0;
        overallQuestions.forEach(function (q) {
            if (q && q.average > 0) {
                overallSum += q.average;
                overallCount++;
            }
        });
        var overallAvg = overallCount ? overallSum / overallCount : 0;

        var middle = document.createElement('div');
        markExt(middle);
        middle.style.cssText = 'display:flex;gap:24px;align-items:flex-end;padding:18px 0;border-bottom:1px solid ' + rail.hair + ';flex-wrap:wrap;';
        clearCourseEvalRailBackground(middle);
        container.appendChild(middle);

        if (overallAvg > 0) {
            var overall = document.createElement('div');
            markExt(overall);
            overall.style.cssText = 'display:flex;flex-direction:column;gap:5px;min-width:120px;';
            clearCourseEvalRailBackground(overall);
            overall.appendChild(makeCourseEvalRailLabel('Overall', rail));
            var ov = document.createElement('div');
            markExt(ov);
            ov.innerHTML = '<span></span><small> / 5</small>';
            ov.querySelector('span').textContent = overallAvg.toFixed(2);
            ov.style.cssText = 'font-size:28px;font-weight:500;letter-spacing:0;line-height:1;color:' + rail.accent + ';font-variant-numeric:tabular-nums;';
            clearCourseEvalRailBackground(ov);
            ov.style.setProperty('color', rail.accent, 'important');
            ov.querySelector('span').style.setProperty('color', rail.accent, 'important');
            ov.querySelector('small').style.cssText = 'font-size:14px;color:' + rail.muted + ';font-weight:500;letter-spacing:0;';
            overall.appendChild(ov);
            middle.appendChild(overall);
        }

        var rr = document.createElement('div');
        markExt(rr);
        rr.style.cssText = 'display:flex;flex-direction:column;gap:5px;min-width:150px;';
        clearCourseEvalRailBackground(rr);
        rr.appendChild(makeCourseEvalRailLabel('Response rate', rail));
        var rrVal = document.createElement('div');
        markExt(rrVal);
        rrVal.innerHTML = '<span></span><small></small>';
        rrVal.querySelector('span').textContent = (Number(data.responseRate) || 0).toFixed(1) + '%';
        rrVal.querySelector('small').textContent = ' · ' + (Number(data.respondents) || 0) + '/' + (Number(data.eligible) || 0);
        rrVal.style.cssText = 'font-size:16px;font-weight:500;color:' + rail.ink + ';font-variant-numeric:tabular-nums;';
        clearCourseEvalRailBackground(rrVal);
        rrVal.querySelector('small').style.cssText = 'font-size:12px;color:' + rail.muted + ';font-weight:500;';
        rr.appendChild(rrVal);
        middle.appendChild(rr);

        var QUESTION_SHORT_LABELS = {
            '1.1': 'Learned a lot',
            '1.2': 'Aligns with objectives',
            '1.3': 'Motivating',
            '1.4': 'Feedback opportunity',
            '1.5': 'Clear expectations'
        };
        var questionsForUi = satisfactionQuestions.length ? satisfactionQuestions : (data.questions || []);
        if (questionsForUi && questionsForUi.length) {
            var sat = document.createElement('div');
            markExt(sat);
            sat.style.cssText = 'margin-top:18px;';
            clearCourseEvalRailBackground(sat);
            sat.appendChild(makeCourseEvalRailLabel('Student Satisfaction', rail));

            questionsForUi.forEach(function (q, idx) {
                var row = document.createElement('div');
                markExt(row);
                row.style.cssText = 'display:grid;grid-template-columns:minmax(120px,160px) minmax(90px,1fr) 36px;gap:12px;align-items:center;padding:9px 1px 9px 0;'
                    + (idx > 0 ? 'border-top:1px solid ' + rail.hair + ';' : '');
                clearCourseEvalRailBackground(row);
                var qNum = String(q.number || '').trim().replace(/[.:]+$/, '');
                var label = document.createElement('div');
                markExt(label);
                label.textContent = QUESTION_SHORT_LABELS[qNum] || qNum;
                label.title = q.text || '';
                label.style.cssText = 'font-size:13px;font-weight:500;color:' + rail.ink + ';min-width:0;';
                clearCourseEvalRailBackground(label);
                row.appendChild(label);

                var railEl = document.createElement('div');
                markExt(railEl);
                railEl.style.cssText = 'position:relative;height:14px;';
                clearCourseEvalRailBackground(railEl);
                var base = document.createElement('span');
                markExt(base);
                base.style.cssText = 'position:absolute;left:0;right:0;top:6.5px;height:1px;background:' + rail.track + ';';
                railEl.appendChild(base);
                [0, 25, 50, 75, 100].forEach(function (x) {
                    var tick = document.createElement('span');
                    markExt(tick);
                    tick.style.cssText = 'position:absolute;left:' + x + '%;top:4.5px;width:1px;height:5px;background:' + rail.faint + ';';
                    railEl.appendChild(tick);
                });
                var scorePos = Math.max(0, Math.min(100, (((Number(q.average) || 0) - 1) / 4) * 100));
                var dot = document.createElement('span');
                markExt(dot);
                dot.style.cssText = 'position:absolute;left:' + scorePos.toFixed(1) + '%;top:3px;width:8px;height:8px;border-radius:50%;transform:translateX(-50%);';
                dot.style.setProperty('background', rail.accent, 'important');
                dot.style.setProperty('background-color', rail.accent, 'important');
                railEl.appendChild(dot);
                row.appendChild(railEl);

                var score = document.createElement('div');
                markExt(score);
                score.textContent = (Number(q.average) || 0).toFixed(2);
                score.style.cssText = 'font-size:12px;font-weight:600;text-align:right;color:' + rail.ink + ';font-variant-numeric:tabular-nums;';
                clearCourseEvalRailBackground(score);
                row.appendChild(score);
                sat.appendChild(row);
            });
            container.appendChild(sat);
        }

        var footer = document.createElement('div');
        markExt(footer);
        footer.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px;padding-top:12px;margin-top:10px;border-top:1px solid ' + rail.hair + ';font-size:11px;color:' + rail.muted + ';font-variant-numeric:tabular-nums;';
        clearCourseEvalRailBackground(footer);
        var sourceLink = document.createElement('a');
        markExt(sourceLink);
        sourceLink.href = evalUrl;
        sourceLink.target = '_blank';
        sourceLink.rel = 'noopener noreferrer';
        sourceLink.textContent = 'View full evaluation';
        sourceLink.style.cssText = 'color:' + rail.accent + ';text-decoration:none;font-weight:700;';
        sourceLink.style.setProperty('color', rail.accent, 'important');
        footer.appendChild(sourceLink);
        var responses = document.createElement('span');
        markExt(responses);
        responses.textContent = (Number(data.respondents) || 0) + ' responses';
        footer.appendChild(responses);
        container.appendChild(footer);
    }

    function renderCourseEvaluationPanel(container, data, evalUrl, evalLabel) {
        container.innerHTML = '';
        markExt(container);

        var panelTheme = getKurserInsightTheme();
        var mutedText = panelTheme.mutedText;
        var subtleText = panelTheme.subtleText;
        var divider = panelTheme.divider;
        var quietTrack = panelTheme.quietTrack;
        var accentColor = panelTheme.accentText;
        container.style.cssText = getKurserInsightContainerStyle(panelTheme);

        function normalizeEvalQuestionNumber(n) {
            return String(n || '').trim().replace(/[.:]+$/, '');
        }

        var EVAL_SATISFACTION_KEYS = ['1.1', '1.2', '1.3', '1.4', '1.5'];
        var satisfactionQuestions = [];
        if (data && Array.isArray(data.questions) && data.questions.length) {
            var byKey = {};
            data.questions.forEach(function (q) {
                if (!q) return;
                var key = normalizeEvalQuestionNumber(q.number);
                if (EVAL_SATISFACTION_KEYS.indexOf(key) === -1) return;
                byKey[key] = {
                    number: key,
                    text: q.text || '',
                    options: q.options || [],
                    totalResponses: q.totalResponses || 0,
                    average: Number(q.average) || 0
                };
            });
            EVAL_SATISFACTION_KEYS.forEach(function (key) {
                if (byKey[key]) satisfactionQuestions.push(byKey[key]);
            });
        }

        renderCourseEvalRail(container, data, evalUrl, satisfactionQuestions);
        return;

        var headerRow = document.createElement('div');
        markExt(headerRow);
        headerRow.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; margin-bottom: 5px;';

        var titleEl = document.createElement('div');
        markExt(titleEl);
        titleEl.textContent = 'Course Evaluation';
        titleEl.style.cssText = 'font-weight: 800; font-size: 14px; line-height: 1.15; color: ' + panelTheme.text + ';';
        headerRow.appendChild(titleEl);

        var periodChip = document.createElement('span');
        markExt(periodChip);
        periodChip.textContent = data.period || '';
        periodChip.style.cssText = 'font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ' + accentColor + ';';
        headerRow.appendChild(periodChip);

        container.appendChild(headerRow);

        var summaryCard = document.createElement('div');
        markExt(summaryCard);
        summaryCard.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(78px, 1fr)); gap: 6px; margin-bottom: 8px; ' + getKurserInsightSurfaceStyle(panelTheme);

        var rrWrap = document.createElement('div');
        markExt(rrWrap);
        var rrLabel = document.createElement('div');
        markExt(rrLabel);
        rrLabel.textContent = 'Response Rate';
        rrLabel.style.cssText = 'font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ' + mutedText + ';';
        rrWrap.appendChild(rrLabel);
        var rrValue = document.createElement('div');
        markExt(rrValue);
        rrValue.textContent = data.responseRate.toFixed(1) + '%';
        rrValue.style.cssText = 'margin-top: 3px; font-size: 21px; line-height: 0.95; font-weight: 800;';
        var rrColor = data.responseRate > 50 ? '#4caf50' : (data.responseRate > 30 ? '#ffb300' : '#ef5350');
        rrValue.style.setProperty('color', rrColor, 'important');
        rrWrap.appendChild(rrValue);
        summaryCard.appendChild(rrWrap);

        var respWrap = document.createElement('div');
        markExt(respWrap);
        var respLabel = document.createElement('div');
        markExt(respLabel);
        respLabel.textContent = 'Respondents';
        respLabel.style.cssText = 'font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ' + mutedText + ';';
        respWrap.appendChild(respLabel);
        var respValue = document.createElement('div');
        markExt(respValue);
        respValue.textContent = data.respondents + ' / ' + data.eligible;
        respValue.style.cssText = 'margin-top: 3px; font-size: 15px; line-height: 1; font-weight: 760; color: ' + subtleText + ';';
        respWrap.appendChild(respValue);
        summaryCard.appendChild(respWrap);

        var overallQuestions = satisfactionQuestions.length ? satisfactionQuestions : (data.questions || []);
        if (overallQuestions && overallQuestions.length) {
            var overallSum = 0;
            var overallCount = 0;
            overallQuestions.forEach(function (q) {
                if (q.average > 0) {
                    overallSum += q.average;
                    overallCount++;
                }
            });
            if (overallCount > 0) {
                var overallAvg = overallSum / overallCount;
                var avgWrap = document.createElement('div');
                markExt(avgWrap);
                var avgLabel = document.createElement('div');
                markExt(avgLabel);
                avgLabel.textContent = 'Overall';
                avgLabel.style.cssText = 'font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ' + mutedText + ';';
                avgWrap.appendChild(avgLabel);
                var avgValue = document.createElement('div');
                markExt(avgValue);
                avgValue.textContent = overallAvg.toFixed(2) + ' / 5';
                avgValue.style.cssText = 'margin-top: 3px; font-size: 20px; line-height: 0.95; font-weight: 800;';
                var avgColor = overallAvg >= 4 ? '#4caf50' : (overallAvg >= 3 ? '#ffb300' : '#ef5350');
                avgValue.style.setProperty('color', avgColor, 'important');
                avgWrap.appendChild(avgValue);
                summaryCard.appendChild(avgWrap);
            }
        }

        container.appendChild(summaryCard);

        var QUESTION_SHORT_LABELS = {
            '1.1': 'Learned a lot',
            '1.2': 'Aligns with objectives',
            '1.3': 'Motivating',
            '1.4': 'Feedback opportunity',
            '1.5': 'Clear expectations'
        };

        var questionsForUi = satisfactionQuestions.length ? satisfactionQuestions : (data.questions || []);
        if (questionsForUi && questionsForUi.length) {
            var questionsCard = document.createElement('div');
            markExt(questionsCard);
            questionsCard.style.cssText = getKurserInsightSurfaceStyle(panelTheme, 'margin-bottom: 8px;');

            var qTitle = document.createElement('div');
            markExt(qTitle);
            qTitle.textContent = 'Student Satisfaction';
            qTitle.style.cssText = 'font-size: 11px; font-weight: 750; color: ' + panelTheme.text + '; margin-bottom: 2px;';
            questionsCard.appendChild(qTitle);

            questionsForUi.forEach(function (q, idx) {
                var row = document.createElement('div');
                markExt(row);
                row.style.cssText = 'display: grid; grid-template-columns: minmax(135px, 0.8fr) 1.15fr auto; gap: 6px; align-items: center; padding: 5px 0;'
                    + (idx > 0 ? (' border-top: 1px solid ' + divider + ';') : '');

                var label = document.createElement('div');
                markExt(label);
                var qNum = normalizeEvalQuestionNumber(q.number);
                label.textContent = QUESTION_SHORT_LABELS[qNum] || qNum;
                label.style.cssText = 'font-size: 10.5px; font-weight: 600; color: ' + subtleText + ';';
                label.title = q.text;
                row.appendChild(label);

                var barWrap = document.createElement('div');
                markExt(barWrap);
                barWrap.style.cssText = 'height: 5px; border-radius: 999px; overflow: hidden; background: ' + quietTrack + ';';
                var bar = document.createElement('div');
                markExt(bar);
                var pct = q.average > 0 ? ((q.average / 5) * 100) : 0;
                var barColor = q.average >= 4 ? '#4caf50' : (q.average >= 3 ? '#ffb300' : '#ef5350');
                bar.style.cssText = 'height: 100%; border-radius: 999px; width: ' + pct.toFixed(1) + '%;';
                bar.style.setProperty('background', barColor, 'important');
                barWrap.appendChild(bar);
                row.appendChild(barWrap);

                var score = document.createElement('div');
                markExt(score);
                score.textContent = q.average.toFixed(2);
                score.style.cssText = 'font-size: 10.5px; font-weight: 780; min-width: 32px; text-align: right;';
                score.style.setProperty('color', barColor, 'important');
                row.appendChild(score);

                questionsCard.appendChild(row);
            });

            container.appendChild(questionsCard);
        }

        if (data.workload && data.workload.options && data.workload.options.length) {
            var workloadCard = document.createElement('div');
            markExt(workloadCard);
            workloadCard.style.cssText = getKurserInsightSurfaceStyle(panelTheme, 'margin-bottom: 5px;');

            var wTitle = document.createElement('div');
            markExt(wTitle);
            wTitle.textContent = 'Workload';
            wTitle.style.cssText = 'font-size: 11px; font-weight: 750; color: ' + panelTheme.text + '; margin-bottom: 4px;';
            workloadCard.appendChild(wTitle);

            var wAvg = data.workload.average || 3;
            var gaugePos = ((wAvg - 1) / 4) * 100;
            var gaugeLabel = wAvg <= 1.5 ? 'Much less' : wAvg <= 2.5 ? 'Less' : wAvg <= 3.5 ? 'As expected' : wAvg <= 4.5 ? 'More' : 'Much more';
            var gaugeColor = wAvg <= 2.5 ? '#66bb6a' : wAvg <= 3.5 ? '#90a4ae' : wAvg <= 4.25 ? '#ffb74d' : '#ef5350';

            var scaleLabels = document.createElement('div');
            markExt(scaleLabels);
            scaleLabels.style.cssText = 'display: flex; justify-content: space-between; font-size: 9px; color: ' + mutedText + '; margin-bottom: 4px;';
            ['Much less', 'Less', 'As expected', 'More', 'Much more'].forEach(function (lbl) {
                var sp = document.createElement('span');
                sp.textContent = lbl;
                scaleLabels.appendChild(sp);
            });
            workloadCard.appendChild(scaleLabels);

            var track = document.createElement('div');
            markExt(track);
            track.style.cssText = 'position: relative; height: 6px; border-radius: 999px; overflow: visible; background: linear-gradient(to right, #66bb6a, #a5d6a7 25%, #90a4ae 50%, #ffb74d 75%, #ef5350);';

            var marker = document.createElement('div');
            markExt(marker);
            marker.style.cssText = 'position: absolute; top: -3px; width: 12px; height: 12px; border-radius: 50%; border: 2px solid ' + (isDarkModeEnabled() ? '#e0e0e0' : '#333') + '; transform: translateX(-50%); box-shadow: 0 1px 3px rgba(0,0,0,0.3);';
            marker.style.left = gaugePos.toFixed(1) + '%';
            marker.style.setProperty('background', gaugeColor, 'important');
            track.appendChild(marker);
            workloadCard.appendChild(track);

            var valLabel = document.createElement('div');
            markExt(valLabel);
            valLabel.style.cssText = 'text-align: center; margin-top: 6px; font-size: 10.5px; font-weight: 750;';
            valLabel.style.setProperty('color', gaugeColor, 'important');
            valLabel.textContent = gaugeLabel + ' (' + wAvg.toFixed(2) + ' / 5)';
            workloadCard.appendChild(valLabel);

            container.appendChild(workloadCard);
        }

        var footer = document.createElement('div');
        markExt(footer);
        footer.style.cssText = 'font-size: 10.5px; color: ' + mutedText + '; display: flex; justify-content: space-between; align-items: center; gap: 6px; padding-top: 8px; border-top: 1px solid ' + divider + ';';
        var sourceLink = document.createElement('a');
        sourceLink.href = evalUrl;
        sourceLink.target = '_blank';
        sourceLink.rel = 'noopener noreferrer';
        sourceLink.textContent = 'View full evaluation';
        sourceLink.style.cssText = 'color: ' + panelTheme.linkColor + '; text-decoration: none; font-weight: 700;';
        footer.appendChild(sourceLink);
        var respNote = document.createElement('span');
        respNote.textContent = data.respondents + ' responses';
        footer.appendChild(respNote);
        container.appendChild(footer);
    }

    try {
        globalThis.DTUAfterDarkKurserCourseEvalUi = {
            insertKurserCourseEvaluation: insertKurserCourseEvaluation
        };
    } catch (eKurserCourseEvalUi) { }
})();
