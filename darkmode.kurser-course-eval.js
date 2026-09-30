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

    // Shared layout helpers from darkmode.kurser-widgets.js, which loads first.
    function getLayout() {
        try { return globalThis.DTUAfterDarkCourseWidgetsLayout || null; } catch (e0) { return null; }
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
            if (_courseEvalRetryTimer) clearTimeout(_courseEvalRetryTimer);
            _courseEvalRetryTimer = null;
            return;
        }
        if (!isKurserCoursePage()) return;

        var courseCode = getKurserCourseCode();
        if (!courseCode) return;

        var layout = getLayout();
        if (!layout) return;

        var container = null;
        var status = null;

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
            if (!widgetsGrid) widgetsGrid = layout.getOrCreateGrid(insertAnchor, courseCode);
            if (gradeStats && gradeStats.parentNode !== widgetsGrid) {
                widgetsGrid.insertBefore(gradeStats, widgetsGrid.firstChild || null);
            }

            container = document.createElement('div');
            container.setAttribute('data-dtu-course-eval', '1');
            container.setAttribute('data-dtu-course-eval-code', courseCode);
            markExt(container);
            widgetsGrid.appendChild(container);
            status = renderCourseEvalShell(container, 'Loading evaluation...');
        } else if (!status || !status.parentNode) {
            status = renderCourseEvalShell(container, '');
        }

        var nextTryAt = parseInt(container.getAttribute('data-dtu-course-eval-nexttry') || '0', 10) || 0;
        if (nextTryAt && Date.now() < nextTryAt) return;
        if (nextTryAt) container.removeAttribute('data-dtu-course-eval-nexttry');

        if (_courseEvalRequested && _courseEvalCourseCode === courseCode) return;
        _courseEvalRequested = true;
        _courseEvalCourseCode = courseCode;

        status.textContent = 'Loading evaluation data...';

        function isCurrentEvaluationRequest() {
            return container.isConnected && isFeatureFlagEnabled(getFeatureKurserCourseEvalKey())
                && getKurserCourseCode() === courseCode;
        }

        function scheduleCourseEvalRetry(ms, isCookieFallback) {
            if (!isCurrentEvaluationRequest()) return;
            _courseEvalRequested = false;
            // One short retry permits the existing cookie fallback after page load.
            // Repeated network failures wait ten minutes while the page is open.
            var delay = isCookieFallback ? Math.max(ms || 900, 900) : Math.max(ms || 600000, 600000);
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
            if (!isCurrentEvaluationRequest()) return;
            if (!latestEvalUrl) {
                status = renderCourseEvalEmpty(container);
                scheduleCourseEvalRetry(8000);
                return;
            }

            sendRuntimeMessage({
                type: 'dtu-course-evaluation',
                url: latestEvalUrl
            }, function (response) {
                if (!isCurrentEvaluationRequest()) return;
                if (!response || !response.ok || !response.data) {
                    var reason = (response && response.error) ? response.error : 'unknown';
                    status.textContent = 'Evaluation data unavailable. Retrying in 10 minutes.';
                    console.log('[DTU After Dark] Course eval: background fetch failed', reason, response);
                    scheduleCourseEvalRetry(12000);
                    return;
                }
                container.setAttribute('data-dtu-course-eval-loaded', '1');
                renderCourseEvaluationPanel(container, response.data, latestEvalUrl);
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
            scheduleCourseEvalRetry(900, true);
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
                if (!isCurrentEvaluationRequest()) return;
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
                    var match = String(url).match(/\/kursus\/(\d+)\//i);
                    if (!match || match[1] !== courseCode) return;
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
                    var looksSuspicious = htmlLen < 1500;

                    if (infoFetchCreds === 'omit' && looksSuspicious && !container.getAttribute('data-dtu-course-eval-cookie-tried')) {
                        container.setAttribute('data-dtu-course-eval-cookie-tried', '1');
                        container.setAttribute('data-dtu-course-eval-info-cred', 'same-origin');
                        status.textContent = 'Loading evaluation data...';
                        console.log('[DTU After Dark] Course eval: /info response looked suspicious (len:', htmlLen, ') - retrying with cookies after load for', courseCode);
                        scheduleCourseEvalRetry(document.readyState === 'complete' ? 1600 : 2600, true);
                        return;
                    }

                    status = looksSuspicious
                        ? renderCourseEvalShell(container, 'Evaluation data unavailable. Retrying in 10 minutes.')
                        : renderCourseEvalEmpty(container);
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
                if (!isCurrentEvaluationRequest()) return;
                status.textContent = 'Evaluation data unavailable. Retrying in 10 minutes.';
                console.log('[DTU After Dark] Course eval error:', err && err.message || err);
                scheduleCourseEvalRetry(8000);
            });
    }

    function pruneCourseWidgetsGrid() {
        var grid = document.querySelector('[data-dtu-course-widgets-grid]');
        if (grid && !grid.querySelector('[data-dtu-grade-stats], [data-dtu-course-eval]')) grid.remove();
        var layout = getLayout();
        if (layout) layout.refresh();
    }

    // Header plus a status line; returns the status element, which the
    // loading and retry paths above keep writing to.
    function renderCourseEvalShell(container, statusText) {
        var layout = getLayout();
        layout.prepareColumn(container);
        container.setAttribute('data-dtu-cw-state', 'loading');
        container.appendChild(layout.makeColumnHead('Student evaluation'));
        var status = layout.makeEl('div', 'dtu-cw-status', statusText);
        status.setAttribute('data-dtu-course-eval-status', '1');
        container.appendChild(status);
        layout.refresh();
        return status;
    }

    function renderCourseEvalEmpty(container) {
        var layout = getLayout();
        layout.prepareColumn(container);
        container.setAttribute('data-dtu-cw-state', 'empty');
        container.appendChild(layout.makeColumnHead('Student evaluation'));
        var empty = layout.makeEl('div', 'dtu-cw-empty');
        empty.appendChild(layout.makeEl('span', 'dtu-cw-empty-lead', 'No evaluation yet'));
        var status = layout.makeEl('span', 'dtu-cw-status', 'New courses get one after they have been taught once.');
        status.setAttribute('data-dtu-course-eval-status', '1');
        empty.appendChild(status);
        container.appendChild(empty);
        layout.refresh();
        return status;
    }

    // "E25" -> "Autumn 2025 teaching (E25)"; three-week courses arrive as
    // "Jan 26" and read "January 2026 teaching".
    function formatCourseEvalPeriod(period) {
        var p = String(period || '').trim();
        var m = /^([EF])(\d{2})$/i.exec(p);
        if (m) return (m[1].toUpperCase() === 'E' ? 'Autumn' : 'Spring') + ' 20' + m[2] + ' teaching (' + p.toUpperCase() + ')';
        var months = { jan: 'January', jun: 'June', jul: 'July', aug: 'August' };
        m = /^(jan|jun|jul|aug)\w*\s+(\d{2})$/i.exec(p);
        if (m) return months[m[1].toLowerCase()] + ' 20' + m[2] + ' teaching';
        return p;
    }

    function describeWorkload(avg) {
        if (avg <= 1.5) return 'Much less than expected';
        if (avg <= 2.5) return 'Less than expected';
        if (avg <= 3.5) return 'As expected';
        if (avg <= 4.5) return 'More than expected';
        return 'Much more than expected';
    }

    var QUESTION_SHORT_LABELS = {
        '1.1': 'Learned a lot',
        '1.2': 'Aligns with objectives',
        '1.3': 'Motivating',
        '1.4': 'Feedback opportunity',
        '1.5': 'Clear expectations'
    };

    function normalizeEvalQuestionNumber(n) {
        return String(n || '').trim().replace(/[.:]+$/, '');
    }

    function renderCourseEvaluationPanel(container, data, evalUrl) {
        var layout = getLayout();
        var el = layout.makeEl;
        layout.prepareColumn(container);
        container.setAttribute('data-dtu-cw-state', 'ready');
        container.appendChild(layout.makeColumnHead('Student evaluation', formatCourseEvalPeriod(data.period)));

        // The five satisfaction questions, in order; anything else is extra.
        var byKey = {};
        (data.questions || []).forEach(function (q) {
            if (q) byKey[normalizeEvalQuestionNumber(q.number)] = q;
        });
        var questions = Object.keys(QUESTION_SHORT_LABELS).filter(function (k) { return byKey[k]; }).map(function (k) { return byKey[k]; });
        if (!questions.length) questions = data.questions || [];

        var answered = questions.filter(function (q) { return Number(q.average) > 0; });
        var overall = answered.length
            ? answered.reduce(function (sum, q) { return sum + Number(q.average); }, 0) / answered.length
            : 0;

        var hero = el('div', 'dtu-cw-hero');
        if (overall > 0) {
            hero.appendChild(el('span', 'dtu-cw-big', overall.toFixed(2)));
            hero.appendChild(el('span', 'dtu-cw-unit', 'of 5 overall'));
        }
        var side = el('span', 'dtu-cw-side');
        side.appendChild(el('b', '', Math.round(Number(data.responseRate) || 0) + '%'));
        side.appendChild(document.createTextNode(' answered (' + (Number(data.respondents) || 0) + ' of ' + (Number(data.eligible) || 0) + ')'));
        hero.appendChild(side);
        container.appendChild(hero);

        if (questions.length) {
            var rows = el('div', 'dtu-cw-rows');
            questions.forEach(function (q) {
                var avg = Number(q.average) || 0;
                var row = el('div', 'dtu-cw-row');
                var label = el('span', 'dtu-cw-row-label', QUESTION_SHORT_LABELS[normalizeEvalQuestionNumber(q.number)] || normalizeEvalQuestionNumber(q.number));
                if (q.text) label.title = q.text;
                row.appendChild(label);
                var track = el('div', 'dtu-cw-track');
                track.setAttribute('role', 'img');
                track.setAttribute('aria-label', avg.toFixed(2) + ' of 5');
                var fill = el('div', 'dtu-cw-fill');
                fill.style.width = Math.max(0, Math.min(100, (avg - 1) / 4 * 100)).toFixed(1) + '%';
                track.appendChild(fill);
                track.appendChild(el('span', 'dtu-cw-mid'));
                row.appendChild(track);
                row.appendChild(el('span', 'dtu-cw-val', avg.toFixed(2)));
                rows.appendChild(row);
            });
            var axis = el('div', 'dtu-cw-axis');
            axis.setAttribute('aria-hidden', 'true');
            axis.appendChild(el('span'));
            var scale = el('span', 'dtu-cw-axis-scale');
            scale.appendChild(el('span', '', '1 disagree'));
            scale.appendChild(el('span', '', '3'));
            scale.appendChild(el('span', '', '5 agree'));
            axis.appendChild(scale);
            axis.appendChild(el('span'));
            rows.appendChild(axis);
            container.appendChild(rows);
        }

        var foot = el('div', 'dtu-cw-foot');
        var workloadAvg = data.workload && Number(data.workload.average) > 0 ? Number(data.workload.average) : 0;
        var footMain = el('span', 'dtu-cw-foot-main');
        if (workloadAvg) {
            var wl = el('span');
            wl.appendChild(document.createTextNode('Workload '));
            wl.appendChild(el('b', '', describeWorkload(workloadAvg)));
            wl.appendChild(document.createTextNode(' (' + workloadAvg.toFixed(2) + ' of 5)'));
            footMain.appendChild(wl);
        }
        foot.appendChild(footMain);
        var link = el('a', 'dtu-cw-link', 'Full evaluation');
        link.href = evalUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        foot.appendChild(link);
        container.appendChild(foot);
        layout.refresh();
    }

    try {
        globalThis.DTUAfterDarkKurserCourseEvalUi = {
            insertKurserCourseEvaluation: insertKurserCourseEvaluation
        };
    } catch (eKurserCourseEvalUi) { }
})();
