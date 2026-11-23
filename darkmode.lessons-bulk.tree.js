(function () {
    'use strict';

    var _lessonsBulkCore = globalThis.DTUAfterDarkLessonsBulkCore;
    var normalizeWhitespace = _lessonsBulkCore.normalizeWhitespace;
    var deepQueryAll = _lessonsBulkCore.deepQueryAll;
    var getDocHref = _lessonsBulkCore.getDocHref;
    var markExt = _lessonsBulkCore.markExt;
    var logLessonsBulkDebug = _lessonsBulkCore.logLessonsBulkDebug;
    var _lessonsBulkState = globalThis.DTUAfterDarkLessonsBulkState;
    var _lessonsBulkUiState = _lessonsBulkState.uiState;
    var _lessonsLegacyApiSectionsCache = _lessonsBulkState.legacyApiSectionsCache;

    // Glue for fetch, core and control functions that live in other files.
    function getLessonsBulkTreeDeps() {
        var d = globalThis.DTUAfterDarkLessonsBulkTreeDeps;
        if (!d) throw new Error('DTU After Dark: darkmode.lessons-bulk.js has not set DTUAfterDarkLessonsBulkTreeDeps');
        return d;
    }
    function toAbsoluteSamePageUrl(rawUrl, baseUrl) {
        return getLessonsBulkTreeDeps().toAbsoluteSamePageUrl(rawUrl, baseUrl);
    }
    function lessonsBulkDelay(ms) {
        return getLessonsBulkTreeDeps().lessonsBulkDelay(ms);
    }
    function fetchLegacyModuleStructureApi(orgUnitId, moduleId) {
        return getLessonsBulkTreeDeps().fetchLegacyModuleStructureApi(orgUnitId, moduleId);
    }
    function getApiObjectTitle(obj, fallback) {
        return getLessonsBulkTreeDeps().getApiObjectTitle(obj, fallback);
    }
    function getDirectTopicIdsFromStructure(structureObj) {
        return getLessonsBulkTreeDeps().getDirectTopicIdsFromStructure(structureObj);
    }
    function getDirectModuleChildrenFromStructure(structureObj, currentModuleId) {
        return getLessonsBulkTreeDeps().getDirectModuleChildrenFromStructure(structureObj, currentModuleId);
    }
    function collectTopicIdsFromJsonValue(value, outSet, seenObj, keyHint) {
        getLessonsBulkTreeDeps().collectTopicIdsFromJsonValue(value, outSet, seenObj, keyHint);
    }
    function collectModuleIdsFromJsonValue(value, currentModuleId, outSet, seenObj, keyHint) {
        getLessonsBulkTreeDeps().collectModuleIdsFromJsonValue(value, currentModuleId, outSet, seenObj, keyHint);
    }
    function refreshLessonsBulkDownloadUi(rootEl, force) {
        getLessonsBulkTreeDeps().refreshLessonsBulkDownloadUi(rootEl, force);
    }

    function getLessonsTreeLabel(itemEl) {
        if (!itemEl) return '';
        var lbl = '';
        try { lbl = normalizeWhitespace(itemEl.getAttribute('label') || ''); } catch (e0) { lbl = ''; }
        if (lbl) return lbl;

        try {
            var sr = itemEl.shadowRoot;
            if (sr) {
                var txtEl = sr.querySelector('#text, .d2l-skelitize, d2l-lessons-restricted-text');
                if (txtEl) lbl = normalizeWhitespace(txtEl.textContent || '');
            }
        } catch (e1) { }
        return lbl || 'Untitled';
    }

    function getLessonsSameOriginIframeDocuments() {
        var out = [];
        var iframes = [];
        try { iframes = Array.from(document.querySelectorAll('iframe')); } catch (e0) { iframes = []; }
        for (var i = 0; i < iframes.length; i++) {
            var d = null;
            try { d = iframes[i].contentDocument || (iframes[i].contentWindow && iframes[i].contentWindow.document); } catch (e1) { d = null; }
            if (!d) continue;
            try {
                if (d.location && d.location.hostname === window.location.hostname) out.push(d);
            } catch (e2) { }
        }
        return out;
    }

    function getLessonsCandidateDocuments(preferredDoc) {
        var out = [];
        if (preferredDoc && out.indexOf(preferredDoc) === -1) out.push(preferredDoc);
        if (document && out.indexOf(document) === -1) out.push(document);
        var iframeDocs = getLessonsSameOriginIframeDocuments();
        iframeDocs.forEach(function (d) {
            if (d && out.indexOf(d) === -1) out.push(d);
        });
        return out;
    }

    function scoreLessonsDocument(doc) {
        if (!doc || !doc.querySelector) return -1;
        var score = 0;
        try { if (doc.querySelector('.navigation-menu > .navigation-search')) score += 120; } catch (e0) { }
        try { if (doc.querySelector('.navigation-search')) score += 70; } catch (e1) { }
        try { if (doc.querySelector('d2l-lessons-toc')) score += 90; } catch (e2) { }
        try { if (doc.querySelector('.navigation-tree .navigation-item[data-objectid]')) score += 110; } catch (e3) { }
        try { if (doc.querySelector('.navigation-menu')) score += 25; } catch (e4) { }
        try {
            var href = getDocHref(doc);
            if (/\/d2l\/ui\/apps\/smart-curriculum\//i.test(href)) score += 40;
            if (/\/d2l\/le\/(?:lessons|content)\//i.test(href)) score += 25;
        } catch (e5) { }
        return score;
    }

    function getLessonsWorkingDocument(preferredDoc) {
        var docs = getLessonsCandidateDocuments(preferredDoc);
        var best = null;
        var bestScore = -1;
        docs.forEach(function (d) {
            var s = scoreLessonsDocument(d);
            if (s > bestScore) {
                bestScore = s;
                best = d;
            }
        });
        return best || document;
    }

    function getLessonsRuntimeDocument(fallbackDoc) {
        if (_lessonsBulkUiState && _lessonsBulkUiState.activeDoc) return _lessonsBulkUiState.activeDoc;
        return getLessonsWorkingDocument(fallbackDoc || document);
    }

    function getLessonsTocHost(scopeDoc) {
        var doc = scopeDoc || getLessonsRuntimeDocument(document);
        var hosts = [];
        try {
            hosts = deepQueryAll('d2l-lessons-toc.can-search-content, d2l-lessons-toc', doc);
        } catch (e0) {
            hosts = [];
        }
        for (var i = 0; i < hosts.length; i++) {
            var host = hosts[i];
            if (!host || !host.shadowRoot) continue;
            try {
                if (deepQueryAll('d2l-list-item-nav', host.shadowRoot).length > 0) return host;
            } catch (e1) { }
        }
        return hosts.length ? hosts[0] : null;
    }

    function hasModernLessonsTocStructure(scopeDoc) {
        var host = getLessonsTocHost(scopeDoc);
        if (!host || !host.shadowRoot) return false;
        try {
            return deepQueryAll('d2l-list-item-nav', host.shadowRoot).length > 0;
        } catch (e0) {
            return false;
        }
    }

    function getCurrentLessonsOrgUnitId(scopeDoc) {
        var doc = scopeDoc || getLessonsRuntimeDocument(document);
        var hrefs = [];
        var docHref = getDocHref(doc);
        if (docHref) hrefs.push(docHref);
        var windowHref = getDocHref(window);
        if (windowHref) hrefs.push(windowHref);
        for (var i = 0; i < hrefs.length; i++) {
            try {
                var u = new URL(hrefs[i], window.location.href);
                var m = (u.pathname || '').match(/\/d2l\/le\/lessons\/(\d+)(?:\/|$)/i);
                if (m && m[1]) return m[1];
                var c = (u.pathname || '').match(/\/d2l\/le\/content\/(\d+)(?:\/|$)/i);
                if (c && c[1]) return c[1];
            } catch (e2) { }
        }
        return '';
    }

    function getLegacyLessonsTreeLabel(itemEl) {
        if (!itemEl) return 'Untitled';
        var lbl = '';
        try {
            var span = itemEl.querySelector('.title-text span');
            if (span) lbl = normalizeWhitespace(span.textContent || '');
        } catch (e0) { lbl = ''; }
        if (!lbl) {
            try {
                var box = itemEl.querySelector('[role="treeitem"]');
                if (box) lbl = normalizeWhitespace(box.getAttribute('aria-label') || '');
            } catch (e1) { lbl = ''; }
        }
        if (lbl) lbl = lbl.replace(/^selected\s+unit\.?\s*/i, '').trim();
        return lbl || 'Untitled';
    }

    function isLegacyLessonsTreeDocument(scopeDoc) {
        var doc = scopeDoc || getLessonsRuntimeDocument(document);
        try {
            return !!(doc && doc.querySelector && doc.querySelector('.navigation-tree .navigation-item[data-objectid]'));
        } catch (e0) {
            return false;
        }
    }

    async function expandLegacyLessonsTreeAll(scopeDoc) {
        var doc = scopeDoc || getLessonsRuntimeDocument(document);
        if (!doc || !doc.querySelector) return;
        var tree = null;
        try { tree = doc.querySelector('.navigation-tree'); } catch (e0) { tree = null; }
        if (!tree) return;

        for (var round = 0; round < 14; round++) {
            var collapsed = [];
            try {
                collapsed = Array.from(tree.querySelectorAll(
                    '.navigation-item .unit-box[aria-expanded="false"],'
                    + '.navigation-item .lesson-box[aria-expanded="false"],'
                    + '.navigation-item [role="treeitem"][aria-expanded="false"]'
                ));
            } catch (e1) { collapsed = []; }
            if (!collapsed.length) break;

            for (var i = 0; i < collapsed.length; i++) {
                var box = collapsed[i];
                try {
                    var triangle = box.querySelector('.module-triangle');
                    if (triangle && triangle.dispatchEvent) {
                        triangle.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: box.ownerDocument.defaultView || window }));
                    } else if (box.dispatchEvent) {
                        box.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: box.ownerDocument.defaultView || window }));
                    }
                } catch (e2) { }
            }
            await lessonsBulkDelay(180);
        }
    }

    function getLegacyTopSectionSeeds(scopeDoc) {
        var doc = scopeDoc || getLessonsRuntimeDocument(document);
        var treeRoot = null;
        try { treeRoot = doc.querySelector('.navigation-tree'); } catch (e0) { treeRoot = null; }
        if (!treeRoot) return [];

        var direct = [];
        try {
            Array.from(treeRoot.children || []).forEach(function (ch) {
                if (ch && ch.classList && ch.classList.contains('navigation-item') && ch.hasAttribute('data-objectid')) {
                    direct.push(ch);
                }
            });
        } catch (e1) { direct = []; }
        if (!direct.length) {
            try { direct = Array.from(treeRoot.querySelectorAll(':scope > .navigation-item[data-objectid]')); } catch (e2) { direct = []; }
        }

        var seeds = [];
        direct.forEach(function (itemEl) {
            var objectId = '';
            try { objectId = String(itemEl.getAttribute('data-objectid') || '').trim(); } catch (e3) { objectId = ''; }
            if (!objectId || !/^\d+$/.test(objectId)) return;
            if (!isLegacyUnitItem(itemEl)) return;
            seeds.push({
                id: objectId,
                label: getLegacyLessonsTreeLabel(itemEl),
                depth: 0
            });
        });
        return seeds;
    }

    function parseLegacySectionObjectId(section) {
        if (!section) return '';
        var direct = String(section.objectId || '').trim();
        if (/^\d+$/.test(direct)) return direct;
        var key = String(section.key || '').trim();
        var m = key.match(/^legacy\|(\d+)\|/i);
        if (m && m[1]) return m[1];
        return '';
    }

    function legacySectionHasOnlyUnitUrls(section) {
        if (!section || !Array.isArray(section.unitUrls) || !section.unitUrls.length) return false;
        var hasTopic = section.unitUrls.some(function (u) { return /\/topics\//i.test(String(u || '')); });
        if (hasTopic) return false;
        return section.unitUrls.every(function (u) { return /\/units\//i.test(String(u || '')); });
    }

    function getLegacyItemObjectId(itemEl) {
        if (!itemEl || !itemEl.getAttribute) return '';
        var id = String(itemEl.getAttribute('data-objectid') || '').trim();
        return /^\d+$/.test(id) ? id : '';
    }

    function isLegacyUnitItem(itemEl) {
        return !!getLegacyItemTreeBox(itemEl);
    }

    function getLegacyItemTreeBox(itemEl) {
        if (!itemEl || !itemEl.querySelector) return null;
        try {
            return itemEl.querySelector('.unit-box[aria-expanded], .lesson-box[aria-expanded], [role="treeitem"][aria-expanded]');
        } catch (e0) {
            return null;
        }
    }

    function getLegacyDirectChildItems(itemEl) {
        if (!itemEl || !itemEl.querySelectorAll) return [];
        var out = [];
        try {
            var all = Array.from(itemEl.querySelectorAll('.navigation-item[data-objectid]'));
            all.forEach(function (child) {
                if (!child || child === itemEl) return;
                var p = child.parentElement;
                var nearestItem = null;
                while (p) {
                    if (p.classList && p.classList.contains('navigation-item') && p.hasAttribute('data-objectid')) {
                        nearestItem = p;
                        break;
                    }
                    p = p.parentElement;
                }
                if (nearestItem === itemEl) out.push(child);
            });
        } catch (e0) { out = []; }
        return out;
    }

    function clickLegacyExpandBox(box) {
        if (!box) return false;
        try {
            var triangle = box.querySelector('.module-triangle');
            var target = triangle;
            if (!target || !target.dispatchEvent) return false;
            target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: box.ownerDocument.defaultView || window }));
            return true;
        } catch (e0) {
            return false;
        }
    }

    async function resolveLegacySectionUnitUrlsViaDomExpansion(section, scopeDoc) {
        var doc = scopeDoc || getLessonsRuntimeDocument(document);
        if (!doc || !doc.querySelector) return [];
        var orgUnitId = getCurrentLessonsOrgUnitId(doc);
        if (!orgUnitId) return [];
        var sectionObjectId = parseLegacySectionObjectId(section);
        if (!sectionObjectId) return [];

        var rootItem = null;
        try { rootItem = doc.querySelector('.navigation-tree .navigation-item[data-objectid="' + sectionObjectId + '"]'); } catch (e0) { rootItem = null; }
        if (!rootItem) {
            var sampleIds = [];
            try {
                sampleIds = Array.from(doc.querySelectorAll('.navigation-tree .navigation-item[data-objectid]'))
                    .slice(0, 10)
                    .map(function (el) { return String(el.getAttribute('data-objectid') || '').trim(); })
                    .filter(Boolean);
            } catch (eMiss0) { sampleIds = []; }
            logLessonsBulkDebug('legacy_dom_expand_root_missing', {
                sectionKey: section && section.key ? section.key : '',
                sectionObjectId: sectionObjectId,
                docUrl: getDocHref(doc),
                sampleObjectIds: sampleIds
            });
            return [];
        }

        var focusBefore = null;
        try { focusBefore = doc.activeElement || null; } catch (eFocus0) { focusBefore = null; }
        var scrollTargets = [];
        try {
            var se = doc.scrollingElement || doc.documentElement || doc.body;
            if (se) scrollTargets.push(se);
        } catch (eScr0) { }
        try {
            ['.navigation-container', '.navigation-menu', '.navigation-tree'].forEach(function (sel) {
                var el = doc.querySelector(sel);
                if (el) scrollTargets.push(el);
            });
        } catch (eScr1) { }
        var seenScrollTargets = new Set();
        scrollTargets = scrollTargets.filter(function (el) {
            if (!el || seenScrollTargets.has(el)) return false;
            seenScrollTargets.add(el);
            return true;
        });
        var scrollSnapshot = new Map();
        scrollTargets.forEach(function (el) {
            try {
                scrollSnapshot.set(el, {
                    top: Number(el.scrollTop || 0),
                    left: Number(el.scrollLeft || 0)
                });
            } catch (eScr2) { }
        });
        function restoreScrollSnapshot() {
            scrollSnapshot.forEach(function (pos, el) {
                try {
                    if (el && el.isConnected) {
                        el.scrollTop = pos.top;
                        el.scrollLeft = pos.left;
                    }
                } catch (eScr3) { }
            });
        }

        var queue = [rootItem];
        var seenUnits = new Set();
        var topicUrls = new Set();
        var unitUrls = new Set();

        for (var qi = 0; qi < queue.length; qi++) {
            var item = queue[qi];
            if (!item) continue;
            var itemId = getLegacyItemObjectId(item);
            if (!itemId) continue;
            if (isLegacyUnitItem(item)) {
                if (seenUnits.has(itemId)) continue;
                seenUnits.add(itemId);
                var unitUrl = toAbsoluteSamePageUrl('/d2l/le/lessons/' + orgUnitId + '/units/' + itemId, window.location.origin);
                if (unitUrl) unitUrls.add(unitUrl);

                var box = getLegacyItemTreeBox(item);
                if (box) {
                    var expanded = String(box.getAttribute('aria-expanded') || '').toLowerCase() === 'true';
                    if (!expanded) {
                        var childBefore = getLegacyDirectChildItems(item).length;
                        var clicked = clickLegacyExpandBox(box);
                        if (clicked) {
                            for (var w = 0; w < 12; w++) {
                                await lessonsBulkDelay(120);
                                var nowExpanded = String(box.getAttribute('aria-expanded') || '').toLowerCase() === 'true';
                                var childNow = getLegacyDirectChildItems(item).length;
                                if (nowExpanded || childNow > childBefore) break;
                            }
                            restoreScrollSnapshot();
                        }
                    }
                }

                var children = getLegacyDirectChildItems(item);
                for (var ci = 0; ci < children.length; ci++) {
                    var child = children[ci];
                    var childId = getLegacyItemObjectId(child);
                    if (!childId) continue;
                    if (isLegacyUnitItem(child)) {
                        queue.push(child);
                    } else {
                        var topicUrl = toAbsoluteSamePageUrl('/d2l/le/lessons/' + orgUnitId + '/topics/' + childId, window.location.origin);
                        if (topicUrl) topicUrls.add(topicUrl);
                    }
                }
            } else {
                var topUrl = toAbsoluteSamePageUrl('/d2l/le/lessons/' + orgUnitId + '/topics/' + itemId, window.location.origin);
                if (topUrl) topicUrls.add(topUrl);
            }
            if (qi % 6 === 5) await lessonsBulkDelay(40);
        }
        restoreScrollSnapshot();
        try {
            if (focusBefore && focusBefore.isConnected && focusBefore.focus) {
                focusBefore.focus({ preventScroll: true });
            }
        } catch (eFocus1) { }

        var resolved = topicUrls.size ? Array.from(topicUrls) : Array.from(unitUrls);
        logLessonsBulkDebug('legacy_dom_expand_resolve', {
            sectionKey: section.key,
            sectionObjectId: sectionObjectId,
            resolvedTopics: topicUrls.size,
            resolvedUnits: unitUrls.size,
            resolvedCount: resolved.length
        });
        return resolved;
    }

    function applyResolvedUrlsToLegacySections(sectionKey, resolvedUrls) {
        if (!sectionKey || !Array.isArray(resolvedUrls) || !resolvedUrls.length) return false;
        var sanitized = sanitizeLessonsSectionUnitUrls(resolvedUrls);
        if (!sanitized.length) return false;
        var changed = false;
        function apply(list) {
            if (!Array.isArray(list) || !list.length) return false;
            var localChanged = false;
            for (var i = 0; i < list.length; i++) {
                var s = list[i];
                if (!s || s.key !== sectionKey) continue;
                var prevCount = Number(s.unitCount || 0);
                s.unitUrls = sanitized.slice();
                s.unitCount = sanitized.length;
                if (prevCount !== s.unitCount) localChanged = true;
            }
            return localChanged;
        }
        changed = apply(_lessonsBulkUiState.sections) || changed;
        changed = apply(_lessonsLegacyApiSectionsCache.sections) || changed;
        if (changed) _lessonsLegacyApiSectionsCache.ts = Date.now();
        return changed;
    }

    function findLegacyTreeDocFromRoot(rootDoc, depth, visited) {
        if (!rootDoc || !rootDoc.querySelector) return null;
        var marker = null;
        try { marker = rootDoc.querySelector('.navigation-tree .navigation-item[data-objectid]'); } catch (eMk0) { marker = null; }
        if (marker) return rootDoc;
        if ((depth || 0) <= 0) return null;
        var frames = [];
        try { frames = Array.from(rootDoc.querySelectorAll('iframe')); } catch (eFr0) { frames = []; }
        for (var i = 0; i < frames.length; i++) {
            var fd = null;
            try { fd = frames[i].contentDocument || (frames[i].contentWindow && frames[i].contentWindow.document) || null; } catch (eFr1) { fd = null; }
            if (!fd) continue;
            try {
                if (visited.has(fd)) continue;
                visited.add(fd);
            } catch (eVs0) { }
            var nested = findLegacyTreeDocFromRoot(fd, (depth || 0) - 1, visited);
            if (nested) return nested;
        }
        return null;
    }

    // Loads each scanner URL in turn in an off-screen iframe until the legacy Lessons
    // tree shows up (up to 3 frames deep), then hands that document to readTree, which
    // returns a list. An empty list, an error or no tree after 9 s moves on to the next
    // URL; the whole scan gives up after timeoutMs. Resolves the list (or []), never rejects.
    function scanLegacyTreeInHiddenFrame(hostDoc, scannerUrls, timeoutMs, readTree, onDone) {
        return new Promise(function (resolve) {
            var done = false;
            var iframe = hostDoc.createElement('iframe');
            var scannerIdx = -1;
            var activeScannerUrl = '';
            var pollToken = 0;
            var scanStartedAt = 0;
            markExt(iframe);
            iframe.setAttribute('aria-hidden', 'true');
            iframe.setAttribute('tabindex', '-1');
            iframe.style.cssText = 'position:fixed !important;left:-20000px !important;top:0 !important;'
                + 'width:1600px !important;height:2400px !important;opacity:0 !important;pointer-events:none !important;'
                + 'z-index:-2147483647 !important;border:0 !important;';

            function loadNextScanner() {
                scannerIdx += 1;
                if (scannerIdx >= scannerUrls.length) return false;
                activeScannerUrl = scannerUrls[scannerIdx];
                pollToken += 1;
                scanStartedAt = Date.now();
                try {
                    iframe.src = activeScannerUrl;
                    return true;
                } catch (eNav0) {
                    return loadNextScanner();
                }
            }

            function finish(list) {
                if (done) return;
                done = true;
                clearTimeout(timeoutId);
                try { iframe.remove(); } catch (eRm0) { }
                var arr = Array.isArray(list) ? list : [];
                try { if (onDone) onDone(arr, activeScannerUrl, scannerIdx + 1); } catch (eLog0) { }
                resolve(arr);
            }

            // Next scanner URL, or give up when there is none.
            function tryNextOrFinish() {
                if (!loadNextScanner()) finish([]);
            }
            var hasNext = function () { return (scannerIdx + 1) < scannerUrls.length; };

            var timeoutId = setTimeout(function () {
                finish([]);
            }, timeoutMs);

            iframe.onload = function () {
                var thisPollToken = pollToken;
                (async function pollReady() {
                    if (done) return;
                    if (thisPollToken !== pollToken) return;
                    var scanDoc = null;
                    try { scanDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document) || null; } catch (eDoc0) { scanDoc = null; }
                    var treeDoc = null;
                    try {
                        treeDoc = findLegacyTreeDocFromRoot(scanDoc, 3, new Set());
                    } catch (eReady0) { treeDoc = null; }
                    if (!treeDoc) {
                        if ((Date.now() - scanStartedAt) > 9000 && hasNext()) {
                            tryNextOrFinish();
                            return;
                        }
                        await lessonsBulkDelay(120);
                        if (!done) pollReady();
                        return;
                    }
                    try {
                        var list = await readTree(treeDoc, activeScannerUrl);
                        if ((!list || !list.length) && hasNext()) {
                            tryNextOrFinish();
                            return;
                        }
                        finish(list || []);
                    } catch (eRun0) {
                        if (hasNext()) {
                            tryNextOrFinish();
                            return;
                        }
                        finish([]);
                    }
                })();
            };

            try {
                hostDoc.body.appendChild(iframe);
                tryNextOrFinish();
            } catch (eApp0) {
                finish([]);
            }
        });
    }

    async function resolveLegacySectionUnitUrlsViaHiddenFrame(section, scopeDoc) {
        var hostDoc = scopeDoc || getLessonsRuntimeDocument(document);
        if (!hostDoc || !hostDoc.createElement || !hostDoc.body) return [];
        var orgUnitId = getCurrentLessonsOrgUnitId(hostDoc);
        var sectionObjectId = parseLegacySectionObjectId(section);
        if (!orgUnitId || !sectionObjectId) return [];
        var startUrl = toAbsoluteSamePageUrl('/d2l/le/lessons/' + orgUnitId + '/units/' + sectionObjectId, window.location.origin);
        if (!startUrl) return [];
        var scannerUrls = [startUrl];
        var fallbackScannerUrl = toAbsoluteSamePageUrl('/d2l/le/lessons/' + orgUnitId + '/', window.location.origin);
        if (fallbackScannerUrl && scannerUrls.indexOf(fallbackScannerUrl) === -1) scannerUrls.push(fallbackScannerUrl);
        var sectionKey = section && section.key ? section.key : '';

        return scanLegacyTreeInHiddenFrame(hostDoc, scannerUrls, 20000, async function (treeDoc, scannerUrl) {
            var urls = await resolveLegacySectionUnitUrlsViaDomExpansion(section, treeDoc);
            logLessonsBulkDebug('legacy_hidden_tree_doc', {
                sectionKey: sectionKey,
                treeDocUrl: getDocHref(treeDoc),
                scannerUrl: scannerUrl,
                sectionObjectId: sectionObjectId
            });
            return urls;
        }, function (urls, scannerUrl, attempts) {
            logLessonsBulkDebug('legacy_hidden_resolve_done', {
                sectionKey: sectionKey,
                sectionObjectId: sectionObjectId,
                scannerUrl: scannerUrl,
                scannerAttempts: attempts,
                resolvedCount: urls.length
            });
        });
    }

    function getNumericIdString(value) {
        if (value == null) return '';
        var t = typeof value;
        if (t === 'number') {
            if (!isFinite(value)) return '';
            var n = Math.floor(value);
            return n > 0 ? String(n) : '';
        }
        var s = String(value).trim();
        return /^\d+$/.test(s) ? s : '';
    }

    function isValidLessonsContentId(idText) {
        var id = getNumericIdString(idText);
        if (!id) return false;
        var n = Number(id);
        return isFinite(n) && n >= 1000;
    }

    function getValidLessonsContentId(value) {
        var id = getNumericIdString(value);
        if (!id) return '';
        return isValidLessonsContentId(id) ? id : '';
    }

    function parseLessonsTopicIdFromUrl(url) {
        try {
            var u = new URL(String(url || ''), window.location.href);
            var m = (u.pathname || '').match(/\/d2l\/le\/lessons\/\d+\/topics\/(\d+)/i);
            return (m && m[1]) ? String(m[1]) : '';
        } catch (e0) {
            return '';
        }
    }

    function parseLessonsUnitIdFromUrl(url) {
        try {
            var u = new URL(String(url || ''), window.location.href);
            var m = (u.pathname || '').match(/\/d2l\/le\/lessons\/\d+\/units\/(\d+)/i);
            return (m && m[1]) ? String(m[1]) : '';
        } catch (e0) {
            return '';
        }
    }

    function sanitizeLessonsSectionUnitUrls(urls) {
        var out = new Set();
        var dropped = 0;
        (Array.isArray(urls) ? urls : []).forEach(function (raw) {
            var abs = toAbsoluteSamePageUrl(raw, window.location.origin);
            if (!abs) return;
            var topicId = parseLessonsTopicIdFromUrl(abs);
            if (topicId) {
                if (isValidLessonsContentId(topicId)) out.add(abs);
                else dropped++;
                return;
            }
            var unitId = parseLessonsUnitIdFromUrl(abs);
            if (unitId) {
                if (isValidLessonsContentId(unitId)) out.add(abs);
                else dropped++;
                return;
            }
        });
        if (dropped) {
            logLessonsBulkDebug('sanitize_section_urls_drop', {
                inputCount: Array.isArray(urls) ? urls.length : 0,
                outputCount: out.size,
                dropped: dropped
            });
        }
        return Array.from(out);
    }

    async function buildLegacyModuleTreeViaApi(orgUnitId, moduleId, titleHint, depth, visited) {
        var id = String(moduleId || '').trim();
        if (!id || !/^\d+$/.test(id)) return null;
        if (visited.has(id)) return null;
        visited.add(id);

        var structure = await fetchLegacyModuleStructureApi(orgUnitId, id);
        var nodeTitle = getApiObjectTitle(structure || {}, titleHint || ('Section ' + id));
        var topicIds = getDirectTopicIdsFromStructure(structure || {});
        if (!topicIds.size) {
            collectTopicIdsFromJsonValue(structure || {}, topicIds, new WeakSet());
        }
        var childDefs = getDirectModuleChildrenFromStructure(structure || {}, id);
        if (!childDefs.length) {
            var fallbackChildIds = new Set();
            collectModuleIdsFromJsonValue(structure || {}, id, fallbackChildIds, new WeakSet());
            childDefs = Array.from(fallbackChildIds).map(function (cid) {
                return { id: String(cid), title: 'Section ' + String(cid) };
            });
        }
        var children = [];
        for (var i = 0; i < childDefs.length; i++) {
            var childNode = await buildLegacyModuleTreeViaApi(orgUnitId, childDefs[i].id, childDefs[i].title, depth + 1, visited);
            if (childNode) children.push(childNode);
        }
        return {
            id: id,
            title: nodeTitle || ('Section ' + id),
            depth: depth || 0,
            topicIds: topicIds,
            children: children
        };
    }

    function flattenLegacyModuleTreeToSections(node, orgUnitId, outSections) {
        if (!node) return new Set();
        var totalTopicIds = new Set(Array.from(node.topicIds || []));
        (node.children || []).forEach(function (child) {
            var childTopics = flattenLegacyModuleTreeToSections(child, orgUnitId, outSections);
            childTopics.forEach(function (tid) { totalTopicIds.add(tid); });
        });

        var unitUrls = Array.from(totalTopicIds).map(function (tid) {
            return toAbsoluteSamePageUrl('/d2l/le/lessons/' + orgUnitId + '/topics/' + tid, window.location.origin);
        }).filter(Boolean);
        if (!unitUrls.length) {
            var ownUnit = toAbsoluteSamePageUrl('/d2l/le/lessons/' + orgUnitId + '/units/' + node.id, window.location.origin);
            if (ownUnit) unitUrls = [ownUnit];
        }
        unitUrls = sanitizeLessonsSectionUnitUrls(unitUrls);

        if (unitUrls.length) {
            outSections.push({
                key: 'legacy|' + node.id + '|' + (node.title || ('Section ' + node.id)),
                label: node.title || ('Section ' + node.id),
                depth: node.depth || 0,
                objectId: String(node.id || ''),
                unitUrls: unitUrls,
                unitCount: unitUrls.length
            });
        }
        return totalTopicIds;
    }

    async function buildLegacyApiSectionsDeep(scopeDoc) {
        var doc = scopeDoc || getLessonsRuntimeDocument(document);
        var orgUnitId = getCurrentLessonsOrgUnitId(doc);
        if (!orgUnitId) return [];

        var seeds = getLegacyTopSectionSeeds(doc);
        if (!seeds.length) return [];

        var visited = new Set();
        var sections = [];
        for (var i = 0; i < seeds.length; i++) {
            var tree = await buildLegacyModuleTreeViaApi(orgUnitId, seeds[i].id, seeds[i].label, 0, visited);
            if (!tree) continue;
            flattenLegacyModuleTreeToSections(tree, orgUnitId, sections);
        }
        sections = normalizeLessonsBulkSections(sections);
        logLessonsBulkDebug('legacy_api_sections_built', {
            orgUnitId: orgUnitId,
            count: sections.length,
            sample: sections.slice(0, 20).map(function (s) { return { label: s.label, depth: s.depth, unitCount: s.unitCount }; })
        });
        return sections;
    }

    function getLegacySectionsQuality(sections) {
        var list = Array.isArray(sections) ? sections : [];
        var q = { count: list.length, topicUrls: 0, unitUrls: 0, maxDepth: 0 };
        for (var i = 0; i < list.length; i++) {
            var s = list[i];
            if (!s) continue;
            var d = Number(s.depth || 0);
            if (d > q.maxDepth) q.maxDepth = d;
            var urls = Array.isArray(s.unitUrls) ? s.unitUrls : [];
            for (var j = 0; j < urls.length; j++) {
                var u = String(urls[j] || '');
                if (/\/topics\//i.test(u)) q.topicUrls++;
                else if (/\/units\//i.test(u)) q.unitUrls++;
            }
        }
        return q;
    }

    function normalizeLessonsBulkSections(sections) {
        var out = [];
        var seen = new Set();
        (Array.isArray(sections) ? sections : []).forEach(function (s, idx) {
            if (!s) return;
            var key = String(s.key || '').trim() || ('section-' + idx);
            if (seen.has(key)) return;
            var unitUrls = sanitizeLessonsSectionUnitUrls(Array.isArray(s.unitUrls) ? s.unitUrls : []);
            if (!unitUrls.length) return;
            out.push({
                key: key,
                label: normalizeWhitespace(String(s.label || 'Untitled')) || 'Untitled',
                depth: Number(s.depth || 0) || 0,
                objectId: String(s.objectId || '').trim(),
                unitUrls: unitUrls,
                unitCount: unitUrls.length
            });
            seen.add(key);
        });
        return out;
    }

    function shouldAttemptLegacyHiddenSectionBuild(sections) {
        var q = getLegacySectionsQuality(sections);
        if (!q.count) return true;
        if (!q.topicUrls) return true;
        if (q.maxDepth <= 0) return true;
        return false;
    }

    function isLegacyQualityBetter(candidate, baseline) {
        var c = getLegacySectionsQuality(candidate);
        var b = getLegacySectionsQuality(baseline);
        if (c.topicUrls !== b.topicUrls) return c.topicUrls > b.topicUrls;
        if (c.maxDepth !== b.maxDepth) return c.maxDepth > b.maxDepth;
        if (c.count !== b.count) return c.count > b.count;
        return false;
    }

    async function buildLegacySectionsViaHiddenFrame(scopeDoc) {
        var hostDoc = scopeDoc || getLessonsRuntimeDocument(document);
        if (!hostDoc || !hostDoc.createElement || !hostDoc.body) return [];
        var orgUnitId = getCurrentLessonsOrgUnitId(hostDoc);
        if (!orgUnitId) return [];

        var hostHref = getDocHref(hostDoc);
        var scannerUrls = [];
        if (hostHref && /\/d2l\/ui\/apps\/smart-curriculum\//i.test(hostHref)) scannerUrls.push(hostHref);
        var lessonsRootUrl = toAbsoluteSamePageUrl('/d2l/le/lessons/' + orgUnitId + '/', window.location.origin);
        if (lessonsRootUrl && scannerUrls.indexOf(lessonsRootUrl) === -1) scannerUrls.push(lessonsRootUrl);
        if (!scannerUrls.length) return [];

        return scanLegacyTreeInHiddenFrame(hostDoc, scannerUrls, 26000, async function (treeDoc) {
            await expandLegacyLessonsTreeAll(treeDoc);
            await lessonsBulkDelay(180);
            return normalizeLessonsBulkSections(buildLessonsTreeSectionsLegacy(treeDoc));
        }, function (list, scannerUrl, attempts) {
            logLessonsBulkDebug('legacy_hidden_sections_built', {
                orgUnitId: orgUnitId,
                scannerUrl: scannerUrl,
                scannerAttempts: attempts,
                count: list.length,
                sample: list.slice(0, 16).map(function (s) { return { key: s.key, label: s.label, depth: s.depth, unitCount: s.unitCount }; })
            });
        });
    }

    function maybeStartLegacyApiSectionsHydration(scopeDoc, rootEl) {
        var doc = scopeDoc || getLessonsRuntimeDocument(document);
        if (!isLegacyLessonsTreeDocument(doc)) return;
        var orgUnitId = getCurrentLessonsOrgUnitId(doc);
        if (!orgUnitId) return;

        var now = Date.now();
        if (_lessonsLegacyApiSectionsCache.orgUnitId !== orgUnitId) {
            _lessonsLegacyApiSectionsCache.orgUnitId = orgUnitId;
            _lessonsLegacyApiSectionsCache.sections = [];
            _lessonsLegacyApiSectionsCache.loading = false;
            _lessonsLegacyApiSectionsCache.promise = null;
            _lessonsLegacyApiSectionsCache.ts = 0;
            _lessonsLegacyApiSectionsCache.lastAttemptTs = 0;
            _lessonsLegacyApiSectionsCache.source = '';
        }

        var allowHiddenBuild = !!(rootEl && rootEl.classList && rootEl.classList.contains('dtu-open'));
        if (_lessonsLegacyApiSectionsCache.orgUnitId === orgUnitId) {
            if (_lessonsLegacyApiSectionsCache.loading) return;
            var cached = normalizeLessonsBulkSections(_lessonsLegacyApiSectionsCache.sections || []);
            var cacheFresh = cached.length && (now - (_lessonsLegacyApiSectionsCache.ts || 0)) < 1000 * 60 * 20;
            var needsHiddenUpgrade = allowHiddenBuild
                && cached.length
                && shouldAttemptLegacyHiddenSectionBuild(cached)
                && String(_lessonsLegacyApiSectionsCache.source || '') !== 'hidden';
            if (cacheFresh && !needsHiddenUpgrade) return;
            if ((now - (_lessonsLegacyApiSectionsCache.lastAttemptTs || 0)) < 1000 * 12 && !needsHiddenUpgrade) return;
        }

        _lessonsLegacyApiSectionsCache.lastAttemptTs = now;
        _lessonsLegacyApiSectionsCache.loading = true;
        // A course change or reset starts a new load; an older one still running must
        // then neither write its course's sections nor end the new load's "loading".
        var runId = (_lessonsLegacyApiSectionsCache.runId || 0) + 1;
        _lessonsLegacyApiSectionsCache.runId = runId;
        function isCurrentLoad() {
            return _lessonsLegacyApiSectionsCache.runId === runId && _lessonsLegacyApiSectionsCache.orgUnitId === orgUnitId;
        }
        _lessonsLegacyApiSectionsCache.promise = (async function () {
            try {
                var sections = [];
                var resolvedSource = '';
                if (allowHiddenBuild) {
                    sections = await buildLegacySectionsViaHiddenFrame(doc);
                    if (sections && sections.length) resolvedSource = 'hidden';
                }
                if (!sections || !sections.length) {
                    sections = await buildLegacyApiSectionsDeep(doc);
                    if (sections && sections.length) resolvedSource = 'api';
                    if (allowHiddenBuild && shouldAttemptLegacyHiddenSectionBuild(sections)) {
                        var hiddenSections = await buildLegacySectionsViaHiddenFrame(doc);
                        if (isLegacyQualityBetter(hiddenSections, sections)) {
                            sections = hiddenSections;
                            resolvedSource = 'hidden';
                        }
                    }
                }
                sections = normalizeLessonsBulkSections(sections);
                if (isCurrentLoad() && Array.isArray(sections) && sections.length) {
                    _lessonsLegacyApiSectionsCache.sections = sections;
                    _lessonsLegacyApiSectionsCache.ts = Date.now();
                    _lessonsLegacyApiSectionsCache.source = resolvedSource || _lessonsLegacyApiSectionsCache.source || 'api';
                }
            } catch (e0) {
                logLessonsBulkDebug('legacy_api_sections_error', { error: String(e0 && e0.message ? e0.message : e0) });
            } finally {
                if (!isCurrentLoad()) return;
                _lessonsLegacyApiSectionsCache.loading = false;
                _lessonsLegacyApiSectionsCache.promise = null;
                if (!_lessonsLegacyApiSectionsCache.ts) _lessonsLegacyApiSectionsCache.ts = Date.now();
                if (rootEl && rootEl.isConnected && _lessonsBulkUiState.activeDoc === doc) {
                    try { refreshLessonsBulkDownloadUi(rootEl, true); } catch (e1) { }
                }
            }
        })();
    }

    function buildLessonsTreeSectionsLegacy(scopeDoc) {
        var doc = scopeDoc || getLessonsRuntimeDocument(document);
        var orgUnitId = getCurrentLessonsOrgUnitId(doc);
        if (!orgUnitId) return [];

        var treeRoot = null;
        try { treeRoot = doc.querySelector('.navigation-tree'); } catch (e0) { treeRoot = null; }
        if (!treeRoot) return [];

        var itemEls = [];
        try { itemEls = Array.from(treeRoot.querySelectorAll('.navigation-item[data-objectid]')); } catch (e1) { itemEls = []; }
        if (!itemEls.length) return [];

        var nodeByEl = new Map();
        var nodes = itemEls.map(function (itemEl, idx) {
            var objectId = '';
            try { objectId = String(itemEl.getAttribute('data-objectid') || '').trim(); } catch (e2) { objectId = ''; }
            var label = getLegacyLessonsTreeLabel(itemEl);
            var isUnit = isLegacyUnitItem(itemEl);
            if (!isUnit) {
                try { isUnit = !!itemEl.querySelector('.module-triangle'); } catch (e4) { isUnit = false; }
            }

            var href = '';
            try {
                href = (itemEl.getAttribute('action-href') || itemEl.getAttribute('href') || '').trim();
            } catch (e5) { href = ''; }
            if (!href && objectId) {
                href = '/d2l/le/lessons/' + orgUnitId + '/' + (isUnit ? 'units' : 'topics') + '/' + objectId;
            }
            var node = {
                idx: idx,
                key: objectId || ('legacy-node-' + idx),
                objectId: objectId,
                label: label,
                href: href,
                isUnit: !!isUnit,
                parent: null,
                children: [],
                depth: 0,
                el: itemEl
            };
            nodeByEl.set(itemEl, node);
            return node;
        });
        if (!nodes.length) return [];

        nodes.forEach(function (node) {
            var cur = node.el ? node.el.parentElement : null;
            while (cur) {
                if (cur.classList && cur.classList.contains('navigation-item') && cur.hasAttribute('data-objectid')) {
                    var parentNode = nodeByEl.get(cur);
                    if (parentNode && parentNode !== node) {
                        node.parent = parentNode;
                        parentNode.children.push(node);
                        node.depth = parentNode.depth + 1;
                    }
                    break;
                }
                cur = cur.parentElement;
            }
        });

        function isLegacySectionNode(n) {
            return !!(n && n.isUnit);
        }
        var candidateSections = nodes.filter(isLegacySectionNode);
        if (!candidateSections.length) return [];
        candidateSections.sort(function (a, b) { return (a.idx || 0) - (b.idx || 0); });

        var seen = new Set();
        var sections = [];
        candidateSections.forEach(function (sectionNode) {
            var lessonUrls = new Set();
            var topicUrls = new Set();
            var pending = [sectionNode];
            while (pending.length) {
                var cur = pending.pop();
                if (!cur) continue;
                var abs = toAbsoluteSamePageUrl(cur.href, window.location.href);
                if (abs && /\/d2l\/le\/lessons\//i.test(abs)) {
                    lessonUrls.add(abs);
                    if (/\/topics\//i.test(abs)) topicUrls.add(abs);
                }
                if (cur.children && cur.children.length) {
                    cur.children.forEach(function (child) { pending.push(child); });
                }
            }
            var unitUrls = topicUrls.size ? Array.from(topicUrls) : Array.from(lessonUrls);
            unitUrls = sanitizeLessonsSectionUnitUrls(unitUrls);
            if (!unitUrls.length) return;

            var key = 'legacy|' + sectionNode.key + '|' + sectionNode.label;
            if (seen.has(key)) return;
            seen.add(key);
            sections.push({
                key: key,
                label: sectionNode.label || 'Untitled',
                depth: sectionNode.depth || 0,
                objectId: sectionNode.objectId || '',
                unitUrls: unitUrls,
                unitCount: unitUrls.length
            });
        });
        return sections;
    }

    function buildLessonsTreeSections(scopeDoc) {
        var doc = scopeDoc || getLessonsRuntimeDocument(document);
        var tocHost = getLessonsTocHost(doc);
        if (!tocHost || !tocHost.shadowRoot) return buildLessonsTreeSectionsLegacy(doc);

        var itemEls = [];
        try { itemEls = deepQueryAll('d2l-list-item-nav', tocHost.shadowRoot); } catch (e0) { itemEls = []; }
        if (!itemEls.length) return buildLessonsTreeSectionsLegacy(doc);

        var nodes = [];
        var nodeByElement = new Map();
        itemEls.forEach(function (itemEl, idx) {
            var key = '';
            try { key = (itemEl.getAttribute('key') || itemEl.getAttribute('data-key') || '').trim(); } catch (e1) { key = ''; }
            var href = '';
            try { href = (itemEl.getAttribute('action-href') || itemEl.getAttribute('href') || '').trim(); } catch (e2) { href = ''; }
            var indent = NaN;
            try { indent = parseInt(itemEl.getAttribute('indentation'), 10); } catch (e3) { indent = NaN; }
            if (isNaN(indent)) {
                try { indent = parseInt(itemEl.getAttribute('aria-level'), 10); } catch (e4) { indent = NaN; }
            }
            if (isNaN(indent)) indent = 0;
            nodes.push({
                idx: idx,
                key: key || ('node-' + idx),
                label: getLessonsTreeLabel(itemEl),
                href: href,
                indent: indent,
                parent: null,
                children: [],
                depth: 0,
                el: itemEl
            });
        });
        if (!nodes.length) return [];
        nodes.forEach(function (n) { nodeByElement.set(n.el, n); });

        // Prefer true DOM nesting (more reliable than indentation in some DTU Learn trees).
        var nestedLinked = false;
        nodes.forEach(function (node) {
            var pEl = null;
            var cur = node.el ? node.el.parentElement : null;
            while (cur) {
                var tag = '';
                try { tag = (cur.tagName || '').toLowerCase(); } catch (eTag) { tag = ''; }
                if (tag === 'd2l-list-item-nav') {
                    pEl = cur;
                    break;
                }
                cur = cur.parentElement;
            }
            var parentNode = pEl ? nodeByElement.get(pEl) : null;
            if (parentNode && parentNode !== node) {
                node.parent = parentNode;
                parentNode.children.push(node);
                node.depth = parentNode.depth + 1;
                nestedLinked = true;
            }
        });

        // Fallback to indentation heuristics if no nesting links were detected.
        if (!nestedLinked) {
            var stack = [];
            nodes.forEach(function (node) {
                while (stack.length && stack[stack.length - 1].indent >= node.indent) {
                    stack.pop();
                }
                if (stack.length) {
                    node.parent = stack[stack.length - 1];
                    node.parent.children.push(node);
                    node.depth = node.parent.depth + 1;
                }
                stack.push(node);
            });
        }

        var oldExamNode = null;
        nodes.forEach(function (node) {
            if (!oldExamNode && /old\s*exam\s*sets?/i.test(node.label || '')) oldExamNode = node;
        });

        var candidateSections = [];
        function isUnitNode(n) { return !!(n && /\/units\//i.test(n.href || '')); }
        candidateSections = nodes.filter(function (n) { return isUnitNode(n); });
        if (!candidateSections.length) {
            // Fallback for layouts where href is delayed/missing.
            candidateSections = nodes.filter(function (n) {
                try {
                    return !!(n && n.el && n.el.getAttribute && n.el.getAttribute('expandable') !== null);
                } catch (e0) {
                    return false;
                }
            });
        }
        if (!candidateSections.length) {
            candidateSections = nodes.filter(function (n) { return !!(n && n.children && n.children.length); });
        }
        if (!candidateSections.length) {
            candidateSections = nodes.slice(0, Math.min(12, nodes.length));
        }

        var seen = new Set();
        var sections = [];

        function collectTopicUrlsForSection(sectionNode) {
            var topicUrls = new Set();
            var lessonUrls = new Set();
            var pending = [sectionNode];
            while (pending.length) {
                var cur = pending.pop();
                if (!cur) continue;
                var abs = toAbsoluteSamePageUrl(cur.href, window.location.href);
                if (abs && /\/d2l\/le\/lessons\//i.test(abs)) {
                    lessonUrls.add(abs);
                    if (/\/topics\//i.test(abs)) topicUrls.add(abs);
                }
                if (cur.children && cur.children.length) {
                    cur.children.forEach(function (child) { pending.push(child); });
                }
            }
            return topicUrls.size ? Array.from(topicUrls) : Array.from(lessonUrls);
        }

        candidateSections.forEach(function (sectionNode) {
            if (!sectionNode) return;
            var unitUrls = collectTopicUrlsForSection(sectionNode).filter(function (u) {
                return /\/d2l\/le\/lessons\//i.test(u);
            });
            unitUrls = sanitizeLessonsSectionUnitUrls(unitUrls);
            if (!unitUrls.length) return;
            var key = sectionNode.key + '|' + sectionNode.depth + '|' + sectionNode.label;
            if (seen.has(key)) return;
            seen.add(key);
            var label = sectionNode.label || 'Untitled';
            sections.push({
                key: key,
                label: label,
                depth: sectionNode.depth || 0,
                unitUrls: unitUrls,
                unitCount: unitUrls.length
            });
        });

        if (sections && sections.length) return sections;
        return buildLessonsTreeSectionsLegacy(doc);
    }

    try {
        globalThis.DTUAfterDarkLessonsBulkTree = {
            getLessonsTreeLabel: getLessonsTreeLabel,
            getLessonsSameOriginIframeDocuments: getLessonsSameOriginIframeDocuments,
            getLessonsCandidateDocuments: getLessonsCandidateDocuments,
            scoreLessonsDocument: scoreLessonsDocument,
            getLessonsWorkingDocument: getLessonsWorkingDocument,
            getLessonsRuntimeDocument: getLessonsRuntimeDocument,
            getLessonsTocHost: getLessonsTocHost,
            hasModernLessonsTocStructure: hasModernLessonsTocStructure,
            getCurrentLessonsOrgUnitId: getCurrentLessonsOrgUnitId,
            getLegacyLessonsTreeLabel: getLegacyLessonsTreeLabel,
            isLegacyLessonsTreeDocument: isLegacyLessonsTreeDocument,
            expandLegacyLessonsTreeAll: expandLegacyLessonsTreeAll,
            getLegacyTopSectionSeeds: getLegacyTopSectionSeeds,
            parseLegacySectionObjectId: parseLegacySectionObjectId,
            legacySectionHasOnlyUnitUrls: legacySectionHasOnlyUnitUrls,
            getLegacyItemObjectId: getLegacyItemObjectId,
            isLegacyUnitItem: isLegacyUnitItem,
            getLegacyItemTreeBox: getLegacyItemTreeBox,
            getLegacyDirectChildItems: getLegacyDirectChildItems,
            clickLegacyExpandBox: clickLegacyExpandBox,
            resolveLegacySectionUnitUrlsViaDomExpansion: resolveLegacySectionUnitUrlsViaDomExpansion,
            applyResolvedUrlsToLegacySections: applyResolvedUrlsToLegacySections,
            resolveLegacySectionUnitUrlsViaHiddenFrame: resolveLegacySectionUnitUrlsViaHiddenFrame,
            getNumericIdString: getNumericIdString,
            isValidLessonsContentId: isValidLessonsContentId,
            getValidLessonsContentId: getValidLessonsContentId,
            parseLessonsTopicIdFromUrl: parseLessonsTopicIdFromUrl,
            parseLessonsUnitIdFromUrl: parseLessonsUnitIdFromUrl,
            sanitizeLessonsSectionUnitUrls: sanitizeLessonsSectionUnitUrls,
            buildLegacyModuleTreeViaApi: buildLegacyModuleTreeViaApi,
            flattenLegacyModuleTreeToSections: flattenLegacyModuleTreeToSections,
            buildLegacyApiSectionsDeep: buildLegacyApiSectionsDeep,
            getLegacySectionsQuality: getLegacySectionsQuality,
            normalizeLessonsBulkSections: normalizeLessonsBulkSections,
            shouldAttemptLegacyHiddenSectionBuild: shouldAttemptLegacyHiddenSectionBuild,
            isLegacyQualityBetter: isLegacyQualityBetter,
            buildLegacySectionsViaHiddenFrame: buildLegacySectionsViaHiddenFrame,
            maybeStartLegacyApiSectionsHydration: maybeStartLegacyApiSectionsHydration,
            buildLessonsTreeSectionsLegacy: buildLessonsTreeSectionsLegacy,
            buildLessonsTreeSections: buildLessonsTreeSections
        };
    } catch (eExpose) { }
})();
