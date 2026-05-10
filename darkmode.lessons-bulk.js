(function () {
    'use strict';

    function getDeps() {
        try { return globalThis.DTUAfterDarkLessonsBulkDeps || null; } catch (e0) { return null; }
    }

    function isTopWindow() {
        var deps = getDeps();
        return !!(deps && typeof deps.isTopWindow === 'function' && deps.isTopWindow());
    }

    function isFeatureFlagEnabled(key) {
        var deps = getDeps();
        return !!(deps && typeof deps.isFeatureFlagEnabled === 'function' && deps.isFeatureFlagEnabled(key));
    }

    function isDarkModeEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDarkModeEnabled === 'function' && deps.isDarkModeEnabled());
    }

    function deepQueryAll(selector, root) {
        var deps = getDeps();
        if (deps && typeof deps.deepQueryAll === 'function') {
            return deps.deepQueryAll(selector, root);
        }
        return [];
    }

    function normalizeWhitespace(value) {
        var deps = getDeps();
        if (deps && typeof deps.normalizeWhitespace === 'function') {
            return deps.normalizeWhitespace(value);
        }
        return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    }

    function markExt(el) {
        var deps = getDeps();
        if (el && deps && typeof deps.markExt === 'function') deps.markExt(el);
        return el;
    }

    var FEATURE_LEARN_LESSONS_BULK_DOWNLOAD_KEY = 'dtuAfterDarkFeatureLearnLessonsBulkDownload';
    var FEATURE_LEARN_LESSONS_BULK_SINGLE_ZIP_KEY = 'dtuAfterDarkFeatureLearnLessonsBulkSingleZip';
    const LESSONS_BULK_ROOT_ID = 'dtu-lessons-bulk-download-root';
    const LESSONS_BULK_STYLE_ID = 'dtu-lessons-bulk-download-style';

    let _lessonsBulkUiState = {
        sections: [],
        selectedKeys: new Set(),
        sig: '',
        running: false,
        lastRefreshAt: 0,
        activeDoc: null,
        lastLegacyExpandAt: 0
    };
    let _lessonsBulkUrlNameHints = new Map();
    let _lessonsLegacyApiSectionsCache = {
        orgUnitId: '',
        sections: [],
        loading: false,
        promise: null,
        ts: 0,
        lastAttemptTs: 0,
        source: ''
    };
    let _lessonsLegacyModuleStructureCache = new Map();
    let _lessonsLegacyBackgroundResolveState = {
        orgUnitId: '',
        running: false,
        token: 0,
        resolvedKeys: new Set()
    };

    function isLessonsBulkDebugEnabled() {
        try {
            return localStorage.getItem('dtu_after_dark_bulk_debug') === '1';
        } catch (e0) {
            return false;
        }
    }

    function logLessonsBulkDebug(eventName, payload) {
        if (!isLessonsBulkDebugEnabled()) return;
        try {
            console.log('[DTU After Dark][LessonsBulk]', eventName, payload || {});
        } catch (e0) { }
    }

    function isLessonsBulkHeavyFallbackEnabled() {
        try {
            return localStorage.getItem('dtu_after_dark_bulk_heavy_fallback') === '1';
        } catch (e0) {
            return false;
        }
    }

    function isLessonsBulkDownloadEnabled() {
        return isFeatureFlagEnabled(FEATURE_LEARN_LESSONS_BULK_DOWNLOAD_KEY);
    }

    function isLessonsBulkSingleZipEnabled() {
        return isFeatureFlagEnabled(FEATURE_LEARN_LESSONS_BULK_SINGLE_ZIP_KEY);
    }

    function isDTULearnLessonsPage() {
        if (window.location.hostname !== 'learn.inside.dtu.dk') return false;
        var path = window.location.pathname || '';
        if (/^\/d2l\/le\/lessons\/\d+(?:\/.*)?$/i.test(path)) return true;
        if (/^\/d2l\/le\/content\/\d+(?:\/.*)?$/i.test(path)) return true;
        try {
            return deepQueryAll('d2l-lessons-toc', document).length > 0;
        } catch (e0) {
            return false;
        }
    }

    function ensureLessonsBulkDownloadStyles(styleRoot) {
        var parentRoot = styleRoot && styleRoot.appendChild ? styleRoot : (document.head || document.documentElement);
        var style = null;
        try {
            if (parentRoot && parentRoot.querySelector) {
                style = parentRoot.querySelector('#' + LESSONS_BULK_STYLE_ID);
            }
        } catch (eQ) {
            style = null;
        }
        if (!style && parentRoot === (document.head || document.documentElement)) {
            style = document.getElementById(LESSONS_BULK_STYLE_ID);
        }
        if (!style) {
            style = document.createElement('style');
            style.id = LESSONS_BULK_STYLE_ID;
            markExt(style);
            parentRoot.appendChild(style);
        }

        var panelBg = isDarkModeEnabled() ? '#2d2d2d' : '#ffffff';
        var panelBorder = isDarkModeEnabled() ? '#404040' : '#d9d9d9';
        var textColor = isDarkModeEnabled() ? '#e0e0e0' : '#222222';
        var mutedColor = isDarkModeEnabled() ? '#b5b5b5' : '#666666';
        var btnBg = isDarkModeEnabled() ? '#242424' : '#f7f7f7';

        style.textContent = ''
            + '#' + LESSONS_BULK_ROOT_ID + '{margin-top:24px;padding-top:6px;position:relative;z-index:2;width:100%;max-width:100%;display:flex;flex-direction:column;align-items:stretch;gap:6px;clear:both;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-toggle{'
            + 'all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;'
            + 'position:relative;inset:auto;transform:none;'
            + 'align-self:flex-start;margin:0;'
            + 'font-size:13px;line-height:1;padding:8px 14px;border-radius:8px;cursor:pointer;font-weight:600;'
            + 'background:' + btnBg + ';color:' + mutedColor + ';border:1px solid rgba(var(--dtu-ad-accent-rgb),0.45);'
            + 'opacity:0.74;transition:opacity .12s ease,color .12s ease,border-color .12s ease;'
            + '}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-toggle:hover{opacity:1;color:var(--dtu-ad-accent);border-color:var(--dtu-ad-accent);}'
            + '#' + LESSONS_BULK_ROOT_ID + '.dtu-open .dtu-lbd-toggle{opacity:1;color:var(--dtu-ad-accent);border-color:var(--dtu-ad-accent);}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-panel{display:none;'
            + 'min-width:0;max-width:100%;width:100%;'
            + 'padding:10px 10px 9px;border-radius:10px;'
            + 'background:' + panelBg + ';color:' + textColor + ';border:1px solid ' + panelBorder + ';'
            + 'box-sizing:border-box;'
            + 'box-shadow:0 10px 28px rgba(0,0,0,' + (isDarkModeEnabled() ? '0.38' : '0.14') + ');}'
            + '#' + LESSONS_BULK_ROOT_ID + '.dtu-open .dtu-lbd-panel{display:block;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-hint{display:block;width:100%;max-width:100%;font-size:11px;line-height:1.25;'
            + 'margin:0 0 8px;color:' + mutedColor + ';'
            + 'white-space:normal !important;overflow-wrap:anywhere !important;word-break:break-word !important;hyphens:auto;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-list{max-height:220px;overflow:auto;padding-right:4px;scrollbar-gutter:stable;contain:content;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-row{display:flex;align-items:flex-start;gap:8px;padding:4px 3px;border-radius:6px;min-width:0;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-row:hover{background:rgba(var(--dtu-ad-accent-rgb),0.08);}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-row input{margin-top:1px;accent-color:var(--dtu-ad-accent);cursor:pointer;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-label{display:flex;flex-direction:column;gap:1px;cursor:pointer;min-width:0;flex:1 1 auto;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-name{font-size:12px;line-height:1.2;white-space:normal;overflow-wrap:anywhere;word-break:break-word;max-width:100%;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-meta{font-size:11px;line-height:1.2;color:' + mutedColor + ';white-space:normal;overflow-wrap:anywhere;word-break:break-word;max-width:100%;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-actions{display:flex;align-items:center;gap:6px;margin-top:9px;flex-wrap:wrap;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-mini,'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-run{'
            + 'all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;'
            + 'position:relative;inset:auto;transform:none;'
            + 'font-size:11px;line-height:1;padding:5px 8px;border-radius:8px;cursor:pointer;'
            + 'border:1px solid ' + panelBorder + ';background:' + btnBg + ';color:' + textColor + ';'
            + '}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-mini:hover{border-color:var(--dtu-ad-accent);color:var(--dtu-ad-accent);}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-run{background:var(--dtu-ad-accent-deep);border-color:var(--dtu-ad-accent-deep);color:#fff;font-weight:700;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-run:hover{background:var(--dtu-ad-accent-deep-hover);border-color:var(--dtu-ad-accent-deep-hover);}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-run:disabled,'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-mini:disabled{opacity:0.55;cursor:not-allowed;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-status{display:block;width:100%;max-width:100%;margin-top:8px;min-height:14px;font-size:11px;line-height:1.3;color:' + mutedColor + ';white-space:normal !important;overflow-wrap:anywhere !important;word-break:break-word !important;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-empty{font-size:11px;color:' + mutedColor + ';padding:4px 2px 6px;}';
    }

    function toAbsoluteSamePageUrl(rawUrl, baseUrl) {
        if (!rawUrl) return '';
        var v = String(rawUrl).trim();
        if (!v || /^javascript:/i.test(v) || /^mailto:/i.test(v)) return '';
        try {
            return new URL(v, baseUrl || window.location.href).toString();
        } catch (e0) {
            return '';
        }
    }

    function decodeEscapedUrlText(rawUrl) {
        if (!rawUrl) return '';
        return String(rawUrl)
            .replace(/&amp;/gi, '&')
            .replace(/&quot;|&#34;|&#x22;/gi, '"')
            .replace(/&apos;|&#39;|&#x27;/gi, "'")
            .replace(/&lt;|&#60;|&#x3c;/gi, '<')
            .replace(/&gt;|&#62;|&#x3e;/gi, '>')
            .replace(/\\u002f/gi, '/')
            .replace(/\\u003a/gi, ':')
            .replace(/\\u003f/gi, '?')
            .replace(/\\u003d/gi, '=')
            .replace(/\\u0026/gi, '&')
            .replace(/\\\//g, '/')
            .replace(/[\u0000-\u001f]/g, '')
            .replace(/^["']+|["')\],;]+$/g, '')
            .trim();
    }

    function isLikelyDownloadUrl(absUrl) {
        if (!absUrl || !/^https?:/i.test(absUrl)) return false;
        try {
            var parsed = new URL(absUrl, window.location.href);
            var host = (parsed.hostname || '').toLowerCase();
            var path = (parsed.pathname || '').toLowerCase();
            var sameHost = host === String(window.location.hostname || '').toLowerCase();

            // Keep downloader scoped to DTU Learn content and avoid Brightspace UI assets.
            if (!sameHost) return false;
            if (/\/d2l\/le\/lessons\//i.test(path)) return false;
            if (/\/d2l\/error\//i.test(path)) return false;
            if (/\/lib\/bsi\//i.test(path)) return false;
            if (/\.(?:svg|css|js|woff2?|ttf|eot)(?:$|[?#])/i.test(path)) return false;

            // Primary DTU Learn file storage path.
            if (/\/content\/enforced\//i.test(path)) return true;

            // Secondary: explicit file URLs only (avoid generic "/download" endpoints that often redirect to 404).
            if (/\.(?:pdf|doc|docx|ppt|pptx|xls|xlsx|zip|rar|7z|txt|csv|md|m|mlx|ipynb|py|java|c|cpp|h|json|xml|jpg|jpeg|png|gif|mp4|mov|webm|avi)(?:$|[?#])/i.test(path)) return true;
        } catch (e0) {
            return false;
        }
        return false;
    }

    function isStrictFileDownloadUrl(absUrl) {
        if (!isLikelyDownloadUrl(absUrl)) return false;
        try {
            var u = new URL(absUrl, window.location.href);
            var p = (u.pathname || '').toLowerCase();
            if (/\/d2l\/error\//i.test(p)) return false;
            if (/\/content\/enforced\//i.test(p)) return true;
            if (/\.(?:pdf|doc|docx|ppt|pptx|xls|xlsx|zip|rar|7z|txt|csv|md|m|mlx|ipynb|py|java|c|cpp|h|json|xml|jpg|jpeg|png|gif|mp4|mov|webm|avi)(?:$|[?#])/i.test(p)) return true;
        } catch (e0) {
            return false;
        }
        return false;
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
            var href = String(doc.location && doc.location.href ? doc.location.href : '');
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
        try { if (doc && doc.location && doc.location.href) hrefs.push(String(doc.location.href)); } catch (e0) { }
        try { if (window && window.location && window.location.href) hrefs.push(String(window.location.href)); } catch (e1) { }
        for (var i = 0; i < hrefs.length; i++) {
            try {
                var u = new URL(hrefs[i], window.location.href);
                var m = (u.pathname || '').match(/\/d2l\/le\/lessons\/(\d+)\//i);
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
            var isUnit = false;
            try { isUnit = !!itemEl.querySelector('.unit-box[aria-expanded], .lesson-box[aria-expanded], [role="treeitem"][aria-expanded]'); } catch (e4) { isUnit = false; }
            if (!isUnit) return;
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
        if (!itemEl || !itemEl.querySelector) return false;
        try {
            return !!itemEl.querySelector('.unit-box[aria-expanded], .lesson-box[aria-expanded], [role="treeitem"][aria-expanded]');
        } catch (e0) {
            return false;
        }
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
                docUrl: (function () { try { return String(doc.location && doc.location.href ? doc.location.href : ''); } catch (eMiss1) { return ''; } })(),
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

        return await new Promise(function (resolve) {
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

            function finish(urls) {
                if (done) return;
                done = true;
                try { iframe.remove(); } catch (eRm0) { }
                var arr = Array.isArray(urls) ? urls : [];
                logLessonsBulkDebug('legacy_hidden_resolve_done', {
                    sectionKey: section && section.key ? section.key : '',
                    sectionObjectId: sectionObjectId,
                    scannerUrl: activeScannerUrl,
                    scannerAttempts: scannerIdx + 1,
                    resolvedCount: arr.length
                });
                resolve(arr);
            }

            var timeoutId = setTimeout(function () {
                finish([]);
            }, 20000);

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
                        if ((Date.now() - scanStartedAt) > 9000 && (scannerIdx + 1) < scannerUrls.length) {
                            if (!loadNextScanner()) {
                                clearTimeout(timeoutId);
                                finish([]);
                            }
                            return;
                        }
                        await lessonsBulkDelay(120);
                        if (!done) pollReady();
                        return;
                    }
                    try {
                        var urls = await resolveLegacySectionUnitUrlsViaDomExpansion(section, treeDoc);
                        logLessonsBulkDebug('legacy_hidden_tree_doc', {
                            sectionKey: section && section.key ? section.key : '',
                            treeDocUrl: (function () { try { return String(treeDoc.location && treeDoc.location.href ? treeDoc.location.href : ''); } catch (eTD0) { return ''; } })(),
                            scannerUrl: activeScannerUrl,
                            sectionObjectId: sectionObjectId
                        });
                        if ((!urls || !urls.length) && (scannerIdx + 1) < scannerUrls.length) {
                            if (!loadNextScanner()) {
                                clearTimeout(timeoutId);
                                finish([]);
                            }
                            return;
                        }
                        clearTimeout(timeoutId);
                        finish(urls);
                    } catch (eRun0) {
                        if ((scannerIdx + 1) < scannerUrls.length) {
                            if (!loadNextScanner()) {
                                clearTimeout(timeoutId);
                                finish([]);
                            }
                            return;
                        }
                        clearTimeout(timeoutId);
                        finish([]);
                    }
                })();
            };

            try {
                hostDoc.body.appendChild(iframe);
                if (!loadNextScanner()) {
                    clearTimeout(timeoutId);
                    finish([]);
                }
            } catch (eApp0) {
                clearTimeout(timeoutId);
                finish([]);
            }
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

    function getApiObjectId(obj) {
        if (!obj || typeof obj !== 'object') return '';
        var candidates = [
            obj.Id, obj.id, obj.ID,
            obj.ModuleId, obj.moduleId, obj.ModuleID, obj.moduleID, obj.Module_id, obj.module_id,
            obj.UnitId, obj.unitId, obj.UnitID, obj.unitID,
            obj.LessonId, obj.lessonId, obj.LessonID, obj.lessonID,
            obj.FolderId, obj.folderId, obj.FolderID, obj.folderID,
            obj.ObjectId, obj.objectId, obj.ObjectID, obj.objectID,
            obj.ContentObjectId, obj.contentObjectId, obj.ContentObjectID, obj.contentObjectID,
            obj.Identifier, obj.identifier,
            obj.ItemId, obj.itemId, obj.ItemID, obj.itemID
        ];
        for (var i = 0; i < candidates.length; i++) {
            var id = getValidLessonsContentId(candidates[i]);
            if (id) return id;
        }
        return '';
    }

    function getApiTopicId(obj) {
        if (!obj || typeof obj !== 'object') return '';
        var topicCandidates = [
            obj.TopicId, obj.topicId, obj.TopicID, obj.topicID, obj.topic_id,
            obj.TopicIdentifier, obj.topicIdentifier, obj.topic_identifier
        ];
        for (var i = 0; i < topicCandidates.length; i++) {
            var tid = getValidLessonsContentId(topicCandidates[i]);
            if (tid) return tid;
        }

        var typeVal = String(obj.Type || obj.type || obj.ContentObjectType || obj.contentObjectType || obj.ObjectType || '').toLowerCase();
        var id = getApiObjectId(obj);
        if (id && /(topic|file|activity|document)/.test(typeVal) && !/(module|lesson|unit|folder)/.test(typeVal)) return id;
        return '';
    }

    function getApiObjectTitle(obj, fallback) {
        if (!obj || typeof obj !== 'object') return fallback || '';
        var title = obj.Title;
        if (title == null) title = obj.title;
        if (title == null) title = obj.Name;
        if (title == null) title = obj.name;
        if (title == null) title = obj.ShortTitle;
        if (title == null) title = obj.shortTitle;
        if (title == null) title = obj.Label;
        if (title == null) title = obj.label;
        var txt = normalizeWhitespace(String(title == null ? '' : title));
        return txt || (fallback || '');
    }

    function getApiObjectArraysByKeyRegex(obj, re) {
        var out = [];
        if (!obj || typeof obj !== 'object') return out;
        Object.keys(obj).forEach(function (k) {
            var v = obj[k];
            if (!Array.isArray(v)) return;
            if (!re.test(String(k || ''))) return;
            v.forEach(function (item) {
                if (item && typeof item === 'object') {
                    out.push(item);
                    return;
                }
                var id = getValidLessonsContentId(item);
                if (id) {
                    out.push({
                        Id: id,
                        Type: String(k || ''),
                        __fromPrimitiveId: true
                    });
                }
            });
        });
        return out;
    }

    function getDirectModuleChildrenFromStructure(structureObj, currentModuleId) {
        var out = [];
        var seen = new Set();
        var candidates = getApiObjectArraysByKeyRegex(structureObj, /(modules?|lessons?|units?|folders?)/i);
        candidates.forEach(function (obj) {
            var id = getApiObjectId(obj);
            if (!id) return;
            if (currentModuleId && id === String(currentModuleId)) return;
            if (seen.has(id)) return;
            var topicId = getApiTopicId(obj);
            if (topicId && topicId === id) return;
            seen.add(id);
            out.push({ id: id, title: getApiObjectTitle(obj, 'Section ' + id) });
        });
        return out;
    }

    function getDirectTopicIdsFromStructure(structureObj) {
        var out = new Set();
        var candidates = getApiObjectArraysByKeyRegex(structureObj, /(topics?|activities?|objects?)/i);
        candidates.forEach(function (obj) {
            var tid = getApiTopicId(obj);
            if (tid) out.add(tid);
        });
        return out;
    }

    async function fetchLegacyModuleStructureApi(orgUnitId, moduleId) {
        var key = String(orgUnitId) + ':' + String(moduleId);
        var existing = _lessonsLegacyModuleStructureCache.get(key);
        if (existing && existing.json && (Date.now() - existing.ts) < 1000 * 60 * 20) return existing.json;
        if (existing && existing.promise) return existing.promise;

        var entry = existing || { json: null, ts: 0, promise: null };
        entry.promise = (async function () {
            var versions = ['1.75', '1.74', '1.73', '1.72', '1.71', '1.70', '1.69', '1.68', '1.67'];
            for (var i = 0; i < versions.length; i++) {
                var endpoint = '/d2l/api/le/' + versions[i] + '/' + orgUnitId + '/content/modules/' + moduleId + '/structure/';
                try {
                    var abs = toAbsoluteSamePageUrl(endpoint, window.location.origin);
                    if (!abs) continue;
                    var resp = await fetch(abs, { credentials: 'include', cache: 'no-store', headers: { 'Accept': 'application/json' } });
                    if (!resp || !resp.ok) continue;
                    var json = null;
                    try { json = await resp.json(); } catch (e0) { json = null; }
                    if (!json) continue;
                    entry.json = json;
                    entry.ts = Date.now();
                    _lessonsLegacyModuleStructureCache.set(key, entry);
                    return json;
                } catch (e1) { }
            }
            return null;
        })();
        _lessonsLegacyModuleStructureCache.set(key, entry);
        var result = await entry.promise;
        entry.promise = null;
        _lessonsLegacyModuleStructureCache.set(key, entry);
        return result;
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

        var hostHref = '';
        try { hostHref = String(hostDoc.location && hostDoc.location.href ? hostDoc.location.href : ''); } catch (eH0) { hostHref = ''; }
        var scannerUrls = [];
        if (hostHref && /\/d2l\/ui\/apps\/smart-curriculum\//i.test(hostHref)) scannerUrls.push(hostHref);
        var lessonsRootUrl = toAbsoluteSamePageUrl('/d2l/le/lessons/' + orgUnitId + '/', window.location.origin);
        if (lessonsRootUrl && scannerUrls.indexOf(lessonsRootUrl) === -1) scannerUrls.push(lessonsRootUrl);
        if (!scannerUrls.length) return [];

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

        return await new Promise(function (resolve) {
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

            function finish(sections) {
                if (done) return;
                done = true;
                try { iframe.remove(); } catch (eRm0) { }
                var list = Array.isArray(sections) ? sections : [];
                logLessonsBulkDebug('legacy_hidden_sections_built', {
                    orgUnitId: orgUnitId,
                    scannerUrl: activeScannerUrl,
                    scannerAttempts: scannerIdx + 1,
                    count: list.length,
                    sample: list.slice(0, 16).map(function (s) { return { key: s.key, label: s.label, depth: s.depth, unitCount: s.unitCount }; })
                });
                resolve(list);
            }

            var timeoutId = setTimeout(function () {
                finish([]);
            }, 26000);

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
                        if ((Date.now() - scanStartedAt) > 9000 && (scannerIdx + 1) < scannerUrls.length) {
                            if (!loadNextScanner()) {
                                clearTimeout(timeoutId);
                                finish([]);
                            }
                            return;
                        }
                        await lessonsBulkDelay(120);
                        if (!done) pollReady();
                        return;
                    }
                    try {
                        await expandLegacyLessonsTreeAll(treeDoc);
                        await lessonsBulkDelay(180);
                        var sections = normalizeLessonsBulkSections(buildLessonsTreeSectionsLegacy(treeDoc));
                        if ((!sections || !sections.length) && (scannerIdx + 1) < scannerUrls.length) {
                            if (!loadNextScanner()) {
                                clearTimeout(timeoutId);
                                finish([]);
                            }
                            return;
                        }
                        clearTimeout(timeoutId);
                        finish(sections || []);
                    } catch (eRun0) {
                        if ((scannerIdx + 1) < scannerUrls.length) {
                            if (!loadNextScanner()) {
                                clearTimeout(timeoutId);
                                finish([]);
                            }
                            return;
                        }
                        clearTimeout(timeoutId);
                        finish([]);
                    }
                })();
            };

            try {
                hostDoc.body.appendChild(iframe);
                if (!loadNextScanner()) {
                    clearTimeout(timeoutId);
                    finish([]);
                }
            } catch (eApp0) {
                clearTimeout(timeoutId);
                finish([]);
            }
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
            _lessonsLegacyBackgroundResolveState.orgUnitId = orgUnitId;
            _lessonsLegacyBackgroundResolveState.running = false;
            _lessonsLegacyBackgroundResolveState.token = 0;
            _lessonsLegacyBackgroundResolveState.resolvedKeys = new Set();
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
                if (Array.isArray(sections) && sections.length) {
                    _lessonsLegacyApiSectionsCache.sections = sections;
                    _lessonsLegacyApiSectionsCache.ts = Date.now();
                    _lessonsLegacyApiSectionsCache.source = resolvedSource || _lessonsLegacyApiSectionsCache.source || 'api';
                }
            } catch (e0) {
                logLessonsBulkDebug('legacy_api_sections_error', { error: String(e0 && e0.message ? e0.message : e0) });
            } finally {
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
            var isUnit = false;
            try { isUnit = !!itemEl.querySelector('.unit-box[aria-expanded], .lesson-box[aria-expanded], [role="treeitem"][aria-expanded]'); } catch (e3) { isUnit = false; }
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
            if (!n || !n.isUnit) return false;
            if (/\/units\//i.test(String(n.href || ''))) return true;
            // Fallback for cases where href is not populated yet.
            return true;
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

    function extractDownloadUrlsFromLessonsHtml(html, baseUrl) {
        var out = new Set();
        if (!html) return [];

        var text = String(html || '');
        var doc = null;
        try { doc = new DOMParser().parseFromString(text, 'text/html'); } catch (e0) { doc = null; }

        function maybeAdd(rawUrl, sourceText) {
            var decoded = decodeEscapedUrlText(rawUrl);
            if (!decoded) return;
            if (/[<>"']/.test(decoded)) return;
            if (/&(?:quot|apos|lt|gt|#\d+|#x[a-f0-9]+);/i.test(decoded)) return;
            var abs = toAbsoluteSamePageUrl(decoded, baseUrl || window.location.href);
            if (!abs) return;
            if (isStrictFileDownloadUrl(abs)) {
                out.add(abs);
            }
        }

        if (doc && doc.querySelectorAll) {
            doc.querySelectorAll('a[href], iframe[src], embed[src], source[src], object[data]').forEach(function (el) {
                var raw = el.getAttribute('href') || el.getAttribute('src') || el.getAttribute('data') || '';
                maybeAdd(raw, normalizeWhitespace(el.textContent || ''));
            });
        }

        var regexes = [
            /\/d2l\/le\/content\/[^"'\\\s<>)]+/gi,
            /\/content\/enforced\/[^"'\\\s<>)]+/gi,
            /https?:\/\/[^"'\\\s<>)]+/gi
        ];
        regexes.forEach(function (re) {
            var m;
            while ((m = re.exec(text)) !== null) {
                maybeAdd(m[0], '');
            }
        });

        return Array.from(out);
    }

    async function fetchLessonsUnitDownloadUrls(unitUrl) {
        try {
            var resp = await fetch(unitUrl, { credentials: 'include', cache: 'no-store' });
            if (!resp || !resp.ok) {
                logLessonsBulkDebug('fetch_unit_http_fail', {
                    unitUrl: unitUrl,
                    status: resp ? resp.status : 'no_response',
                    finalUrl: resp && resp.url ? resp.url : ''
                });
                return [];
            }
            var html = await resp.text();
            var urls = extractDownloadUrlsFromLessonsHtml(html, unitUrl);
            logLessonsBulkDebug('fetch_unit_scan', {
                unitUrl: unitUrl,
                status: resp.status,
                finalUrl: resp.url || unitUrl,
                found: (urls || []).length
            });
            if (urls && urls.length) return urls;
        } catch (e0) {
            logLessonsBulkDebug('fetch_unit_error', { unitUrl: unitUrl, error: String(e0 && e0.message ? e0.message : e0) });
        }
        return [];
    }

    function parseLessonsTopicIds(topicUrl) {
        try {
            var u = new URL(topicUrl, window.location.href);
            var m = (u.pathname || '').match(/\/d2l\/le\/lessons\/(\d+)\/topics\/(\d+)/i);
            if (!m) return null;
            if (!isValidLessonsContentId(m[2])) return null;
            return { orgUnitId: m[1], topicId: m[2] };
        } catch (e0) {
            return null;
        }
    }

    function getTopicLabelHintFromTopicUrl(topicUrl) {
        var ids = parseLessonsTopicIds(topicUrl);
        if (!ids) return '';
        var doc = getLessonsRuntimeDocument(document);

        // Legacy tree (navigation-item with data-objectid=topicId)
        try {
            var legacyItem = doc.querySelector('.navigation-tree .navigation-item[data-objectid="' + ids.topicId + '"]');
            if (legacyItem) {
                var legacyLabel = getLegacyLessonsTreeLabel(legacyItem);
                if (legacyLabel) return legacyLabel;
            }
        } catch (e0) { }

        // Modern lessons toc
        try {
            var navItem = findTopicNavItem(topicUrl);
            if (navItem) {
                var label = getLessonsTreeLabel(navItem);
                if (label) return label;
            }
        } catch (e1) { }

        return 'topic-' + ids.topicId;
    }

    function parseLessonsUnitIds(unitUrl) {
        try {
            var u = new URL(unitUrl, window.location.href);
            var m = (u.pathname || '').match(/\/d2l\/le\/lessons\/(\d+)\/units\/(\d+)/i);
            if (!m) return null;
            if (!isValidLessonsContentId(m[2])) return null;
            return { orgUnitId: m[1], unitId: m[2] };
        } catch (e0) {
            return null;
        }
    }

    function isTopicKeyHint(keyHint) {
        var k = String(keyHint || '').toLowerCase();
        return /(topic|topics|activity|activities|file|files|document|documents|contentobject|content_object)/.test(k);
    }

    function isModuleKeyHint(keyHint) {
        var k = String(keyHint || '').toLowerCase();
        if (!k) return false;
        if (/topic/.test(k)) return false;
        return /(module|modules|lesson|lessons|unit|units|folder|folders|child|children|item|items|submodule|submodules)/.test(k);
    }

    function collectTopicIdsFromJsonValue(value, outSet, seenObj, keyHint) {
        if (!outSet || value == null) return;
        var t = typeof value;
        if (t === 'number') {
            if (isTopicKeyHint(keyHint)) {
                var numId = getValidLessonsContentId(value);
                if (numId) outSet.add(numId);
            }
            return;
        }
        if (t === 'string') {
            var s = String(value || '');
            if (isTopicKeyHint(keyHint)) {
                var direct = getValidLessonsContentId(s);
                if (direct) outSet.add(direct);
            }
            var m = s.match(/\/d2l\/le\/lessons\/\d+\/topics\/(\d+)/i) || s.match(/\/topics\/(\d+)/i);
            if (m && isValidLessonsContentId(m[1])) outSet.add(String(m[1]));
            return;
        }
        if (t !== 'object') return;
        try {
            if (seenObj && seenObj.has(value)) return;
            if (seenObj) seenObj.add(value);
        } catch (e0) { }
        if (Array.isArray(value)) {
            for (var i = 0; i < value.length; i++) {
                collectTopicIdsFromJsonValue(value[i], outSet, seenObj, keyHint);
            }
            return;
        }
        var topicIdDirect = value.TopicId || value.topicId || value.topicID || value.topic_id;
        if (topicIdDirect != null && isValidLessonsContentId(topicIdDirect)) {
            outSet.add(String(topicIdDirect));
        }
        var typeVal = String(value.Type || value.type || '').toLowerCase();
        var idVal = value.Id || value.id;
        if (idVal != null && isValidLessonsContentId(idVal) && /\btopic\b/.test(typeVal)) {
            outSet.add(String(idVal));
        }
        var keys = Object.keys(value);
        for (var k = 0; k < keys.length; k++) {
            collectTopicIdsFromJsonValue(value[keys[k]], outSet, seenObj, keys[k]);
        }
    }

    function collectModuleIdsFromJsonValue(value, currentModuleId, outSet, seenObj, keyHint) {
        if (!outSet || value == null) return;
        var t = typeof value;
        if (t === 'number') {
            if (isModuleKeyHint(keyHint)) {
                var numId = getValidLessonsContentId(value);
                if (numId && numId !== String(currentModuleId || '')) outSet.add(numId);
            }
            return;
        }
        if (t === 'string') {
            var s = String(value || '');
            if (isModuleKeyHint(keyHint)) {
                var direct = getValidLessonsContentId(s);
                if (direct && direct !== String(currentModuleId || '')) outSet.add(direct);
            }
            var re = /\/content\/modules\/(\d+)/gi;
            var m;
            while ((m = re.exec(s)) !== null) {
                var mid = String(m[1] || '').trim();
                if (isValidLessonsContentId(mid) && mid !== String(currentModuleId || '')) outSet.add(mid);
            }
            return;
        }
        if (t !== 'object') return;
        try {
            if (seenObj && seenObj.has(value)) return;
            if (seenObj) seenObj.add(value);
        } catch (e0) { }

        if (Array.isArray(value)) {
            for (var i = 0; i < value.length; i++) {
                collectModuleIdsFromJsonValue(value[i], currentModuleId, outSet, seenObj, keyHint);
            }
            return;
        }

        var id = getApiObjectId(value);
        var topicId = getApiTopicId(value);
        var typeVal = String(value.Type || value.type || value.ContentObjectType || value.contentObjectType || value.ObjectType || '').toLowerCase();
        var looksModule = false;
        if (/(module|lesson|unit|folder)/.test(typeVal) && !/(topic|file|activity|document)/.test(typeVal)) {
            looksModule = true;
        } else if (id && !topicId) {
            var childCount = value.ChildCount || value.childCount || value.ChildrenCount || value.childrenCount || 0;
            if (childCount > 0 || value.Children || value.children || value.Modules || value.modules || value.SubModules || value.subModules || value.Items || value.items) {
                looksModule = true;
            }
        }
        if (looksModule && id && id !== String(currentModuleId || '')) outSet.add(id);

        var keys = Object.keys(value);
        for (var k = 0; k < keys.length; k++) {
            collectModuleIdsFromJsonValue(value[keys[k]], currentModuleId, outSet, seenObj, keys[k]);
        }
    }

    async function fetchUnitTopicUrlsViaApi(unitUrl) {
        var ids = parseLessonsUnitIds(unitUrl);
        if (!ids) {
            logLessonsBulkDebug('unit_api_skip_no_ids', { unitUrl: unitUrl });
            return [];
        }
        var outTopicIds = new Set();
        var visitedModules = new Set();

        async function walkModule(moduleId, depth) {
            var id = String(moduleId || '').trim();
            if (!id || !/^\d+$/.test(id)) return;
            if (visitedModules.has(id)) return;
            if ((depth || 0) > 20) return;
            visitedModules.add(id);

            var structure = await fetchLegacyModuleStructureApi(ids.orgUnitId, id);
            if (!structure) return;

            var beforeCount = outTopicIds.size;
            var directTopics = getDirectTopicIdsFromStructure(structure || {});
            directTopics.forEach(function (tid) {
                var t = String(tid || '').trim();
                if (/^\d+$/.test(t)) outTopicIds.add(t);
            });
            if (outTopicIds.size === beforeCount) {
                collectTopicIdsFromJsonValue(structure, outTopicIds, new WeakSet());
            }

            var childDefs = getDirectModuleChildrenFromStructure(structure || {}, id);
            var childIds = childDefs.map(function (d) { return String(d && d.id ? d.id : '').trim(); })
                .filter(function (cid) { return /^\d+$/.test(cid) && cid !== id; });
            if (!childIds.length) {
                var fallbackChildIds = new Set();
                collectModuleIdsFromJsonValue(structure, id, fallbackChildIds, new WeakSet());
                childIds = Array.from(fallbackChildIds).filter(function (cid) {
                    return /^\d+$/.test(String(cid || '').trim()) && String(cid) !== id;
                });
            }

            for (var i = 0; i < childIds.length; i++) {
                await walkModule(childIds[i], (depth || 0) + 1);
                if (i % 6 === 5) await lessonsBulkDelay(18);
            }
        }

        try {
            await walkModule(ids.unitId, 0);
            logLessonsBulkDebug('unit_api_scan', {
                unitUrl: unitUrl,
                apiUrl: 'recursive-module-structure',
                status: 'ok',
                finalUrl: '',
                topicCount: outTopicIds.size,
                moduleCount: visitedModules.size
            });
        } catch (eRec0) {
            logLessonsBulkDebug('unit_api_recursive_error', {
                unitUrl: unitUrl,
                error: String(eRec0 && eRec0.message ? eRec0.message : eRec0)
            });
        }

        // Fallback for unexpected API payloads.
        if (!outTopicIds.size) {
            var versions = ['1.75', '1.74', '1.73', '1.72', '1.71', '1.70', '1.69', '1.68', '1.67'];
            for (var v = 0; v < versions.length; v++) {
                var base = '/d2l/api/le/' + versions[v] + '/' + ids.orgUnitId + '/content/modules/' + ids.unitId;
                var endpoints = [
                    base + '/structure/',
                    base
                ];
                var hadOkInVersion = false;
                for (var j = 0; j < endpoints.length; j++) {
                    try {
                        var abs = toAbsoluteSamePageUrl(endpoints[j], window.location.origin);
                        if (!abs) continue;
                        var resp = await fetch(abs, {
                            credentials: 'include',
                            cache: 'no-store',
                            headers: { 'Accept': 'application/json' }
                        });
                        if (!resp || !resp.ok) {
                            logLessonsBulkDebug('unit_api_http_fail', {
                                unitUrl: unitUrl,
                                apiUrl: abs,
                                status: resp ? resp.status : 'no_response',
                                finalUrl: resp && resp.url ? resp.url : ''
                            });
                            continue;
                        }
                        hadOkInVersion = true;
                        var json = null;
                        try { json = await resp.json(); } catch (e1) { json = null; }
                        if (!json) continue;
                        collectTopicIdsFromJsonValue(json, outTopicIds, new WeakSet());
                        logLessonsBulkDebug('unit_api_scan', {
                            unitUrl: unitUrl,
                            apiUrl: abs,
                            status: resp.status,
                            finalUrl: resp.url || abs,
                            topicCount: outTopicIds.size,
                            moduleCount: visitedModules.size
                        });
                        if (outTopicIds.size) break;
                    } catch (e2) {
                        logLessonsBulkDebug('unit_api_error', {
                            unitUrl: unitUrl,
                            apiUrl: endpoints[j],
                            error: String(e2 && e2.message ? e2.message : e2)
                        });
                    }
                }
                if (outTopicIds.size) break;
                if (hadOkInVersion) {
                    logLessonsBulkDebug('unit_api_stop_after_success_no_topics', {
                        unitUrl: unitUrl,
                        version: versions[v],
                        moduleCount: visitedModules.size
                    });
                    break;
                }
            }
        }

        var topicUrls = Array.from(outTopicIds).map(function (tid) {
            return '/d2l/le/lessons/' + ids.orgUnitId + '/topics/' + tid;
        }).map(function (u) { return toAbsoluteSamePageUrl(u, window.location.origin); }).filter(Boolean);
        logLessonsBulkDebug('unit_api_done', {
            unitUrl: unitUrl,
            topicCount: topicUrls.length,
            moduleCount: visitedModules.size,
            topicUrls: topicUrls.slice(0, 10)
        });
        return topicUrls;
    }

    async function fetchUnitTopicUrlsFromUnitPage(unitUrl) {
        var out = new Set();
        try {
            var resp = await fetch(unitUrl, { credentials: 'include', cache: 'no-store' });
            if (!resp || !resp.ok) {
                logLessonsBulkDebug('unit_page_topics_http_fail', {
                    unitUrl: unitUrl,
                    status: resp ? resp.status : 'no_response',
                    finalUrl: resp && resp.url ? resp.url : ''
                });
                return [];
            }
            var html = await resp.text();
            var text = String(html || '');
            if (!text) return [];
            var re = /\/d2l\/le\/lessons\/\d+\/topics\/\d+/gi;
            var m;
            while ((m = re.exec(text)) !== null) {
                var abs = toAbsoluteSamePageUrl(m[0], window.location.origin);
                if (abs) out.add(abs);
            }
            logLessonsBulkDebug('unit_page_topics_done', {
                unitUrl: unitUrl,
                status: resp.status,
                finalUrl: resp.url || unitUrl,
                topicCount: out.size,
                topicUrls: Array.from(out).slice(0, 10)
            });
        } catch (e0) {
            logLessonsBulkDebug('unit_page_topics_error', {
                unitUrl: unitUrl,
                error: String(e0 && e0.message ? e0.message : e0)
            });
        }
        return Array.from(out);
    }

    function collectDownloadUrlsFromJsonValue(value, baseUrl, outSet, seenObj) {
        if (!outSet) return;
        if (value == null) return;
        var t = typeof value;
        if (t === 'string') {
            var abs = toAbsoluteSamePageUrl(decodeEscapedUrlText(value), baseUrl || window.location.href);
            if (abs && isStrictFileDownloadUrl(abs)) outSet.add(abs);
            return;
        }
        if (t !== 'object') return;
        try {
            if (seenObj && seenObj.has(value)) return;
            if (seenObj) seenObj.add(value);
        } catch (e0) { }
        if (Array.isArray(value)) {
            for (var i = 0; i < value.length; i++) {
                collectDownloadUrlsFromJsonValue(value[i], baseUrl, outSet, seenObj);
            }
            return;
        }
        var keys = Object.keys(value);
        for (var k = 0; k < keys.length; k++) {
            collectDownloadUrlsFromJsonValue(value[keys[k]], baseUrl, outSet, seenObj);
        }
    }

    async function fetchTopicApiDownloadUrls(topicUrl) {
        var ids = parseLessonsTopicIds(topicUrl);
        if (!ids) {
            logLessonsBulkDebug('topic_api_skip_no_ids', { topicUrl: topicUrl });
            return [];
        }

        var out = new Set();
        var versions = ['1.75', '1.74', '1.73', '1.72', '1.71', '1.70', '1.69', '1.68', '1.67'];
        for (var i = 0; i < versions.length; i++) {
            var apiUrl = '/d2l/api/le/' + versions[i] + '/' + ids.orgUnitId + '/content/topics/' + ids.topicId;
            try {
                var abs = toAbsoluteSamePageUrl(apiUrl, window.location.origin);
                if (!abs) continue;
                var resp = await fetch(abs, {
                    credentials: 'include',
                    cache: 'no-store',
                    headers: { 'Accept': 'application/json' }
                });
                if (!resp || !resp.ok) {
                    logLessonsBulkDebug('topic_api_http_fail', {
                        topicUrl: topicUrl,
                        apiUrl: abs,
                        status: resp ? resp.status : 'no_response',
                        finalUrl: resp && resp.url ? resp.url : ''
                    });
                    continue;
                }
                var json = null;
                try { json = await resp.json(); } catch (e1) { json = null; }
                if (!json) continue;
                collectDownloadUrlsFromJsonValue(json, topicUrl, out, new WeakSet());
                logLessonsBulkDebug('topic_api_scan', {
                    topicUrl: topicUrl,
                    apiUrl: abs,
                    status: resp.status,
                    finalUrl: resp.url || abs,
                    runningFound: out.size
                });
                if (out.size) break;
            } catch (e2) {
                logLessonsBulkDebug('topic_api_error', {
                    topicUrl: topicUrl,
                    apiUrl: apiUrl,
                    error: String(e2 && e2.message ? e2.message : e2)
                });
            }
        }
        logLessonsBulkDebug('topic_api_done', { topicUrl: topicUrl, found: out.size });
        return Array.from(out);
    }

    async function fetchTopicViewContentDownloadUrls(topicUrl) {
        var ids = parseLessonsTopicIds(topicUrl);
        if (!ids) {
            logLessonsBulkDebug('viewcontent_skip_no_ids', { topicUrl: topicUrl });
            return [];
        }
        var out = new Set();
        var candidates = [
            '/d2l/le/content/' + ids.orgUnitId + '/viewContent/' + ids.topicId + '/View',
            '/d2l/le/content/' + ids.orgUnitId + '/topics/files/download/' + ids.topicId
        ];

        for (var i = 0; i < candidates.length; i++) {
            try {
                var abs = toAbsoluteSamePageUrl(candidates[i], window.location.origin);
                if (!abs) continue;
                var resp = await fetch(abs, { credentials: 'include', cache: 'no-store' });
                if (!resp || !resp.ok) {
                    logLessonsBulkDebug('viewcontent_http_fail', {
                        topicUrl: topicUrl,
                        candidateUrl: abs,
                        status: resp ? resp.status : 'no_response',
                        finalUrl: resp && resp.url ? resp.url : ''
                    });
                    continue;
                }
                var body = await resp.text();
                if (!body) continue;
                extractDownloadUrlsFromLessonsHtml(body, abs).forEach(function (u) {
                    if (isStrictFileDownloadUrl(u)) out.add(u);
                });
                logLessonsBulkDebug('viewcontent_scan', {
                    topicUrl: topicUrl,
                    candidateUrl: abs,
                    status: resp.status,
                    finalUrl: resp.url || abs,
                    runningFound: out.size
                });
            } catch (e1) { }
        }
        logLessonsBulkDebug('viewcontent_done', { topicUrl: topicUrl, found: out.size });
        return Array.from(out);
    }

    async function probeTopicDownloadViaIframe(topicUrl) {
        return new Promise(function (resolve) {
            var done = false;
            var iframe = document.createElement('iframe');
            markExt(iframe);
            // Keep iframe rendered off-screen (not display:none) so Brightspace lazy loaders can hydrate content.
            iframe.style.cssText = 'position:fixed !important;left:-10000px !important;top:0 !important;'
                + 'width:1280px !important;height:900px !important;opacity:0.01 !important;pointer-events:none !important;'
                + 'z-index:-2147483647 !important;border:0 !important;';

            function finish(result) {
                if (done) return;
                done = true;
                logLessonsBulkDebug('iframe_probe_done', {
                    topicUrl: topicUrl,
                    found: result && result.urls ? result.urls.length : 0
                });
                try { iframe.remove(); } catch (e0) { }
                resolve(result || { urls: [], clicked: false });
            }

            function harvest(doc) {
                var out = new Set();
                if (!doc || !doc.querySelectorAll) return out;
                doc.querySelectorAll('d2l-pdf-viewer[src], a[href], iframe[src], embed[src], source[src], object[data]').forEach(function (el) {
                    var raw = el.getAttribute('href') || el.getAttribute('src') || el.getAttribute('data') || '';
                    var abs = toAbsoluteSamePageUrl(raw, topicUrl);
                    if (abs && isStrictFileDownloadUrl(abs)) out.add(abs);
                });
                try {
                    var html = doc.documentElement ? doc.documentElement.outerHTML : '';
                    extractDownloadUrlsFromLessonsHtml(html, topicUrl).forEach(function (u) { out.add(u); });
                } catch (e1) { }
                return out;
            }

            var timeoutId = setTimeout(function () {
                var docT = null;
                try { docT = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document); } catch (e2) { docT = null; }
                var urlsT = Array.from(harvest(docT));
                if (urlsT.length) return finish({ urls: urlsT, clicked: false });
                finish({ urls: [], clicked: false });
            }, 11000);

            iframe.onload = function () {
                var tries = 0;
                (function poll() {
                    tries++;
                    var doc = null;
                    try { doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document); } catch (e4) { doc = null; }
                    var urls = Array.from(harvest(doc));
                    if (urls.length) {
                        clearTimeout(timeoutId);
                        finish({ urls: urls, clicked: false });
                        return;
                    }
                    if (tries >= 56) {
                        clearTimeout(timeoutId);
                        finish({ urls: [], clicked: false });
                        return;
                    }
                    setTimeout(poll, 140);
                })();
            };

            try {
                iframe.src = topicUrl;
                document.body.appendChild(iframe);
            } catch (e6) {
                logLessonsBulkDebug('iframe_probe_error', { topicUrl: topicUrl, error: String(e6 && e6.message ? e6.message : e6) });
                clearTimeout(timeoutId);
                finish({ urls: [], clicked: false });
            }
        });
    }

    async function fetchLessonsUnitDownloadResult(unitUrl, depth) {
        depth = Number(depth || 0);
        if (depth < 0) depth = 0;
        if (depth > 3) return { links: [] };

        if (/\/units\//i.test(unitUrl)) {
            try {
                var topicUrls = await fetchUnitTopicUrlsFromUnitPage(unitUrl);
                if (!topicUrls || !topicUrls.length) {
                    topicUrls = await fetchUnitTopicUrlsViaApi(unitUrl);
                }
                if (topicUrls && topicUrls.length) {
                    var fromTopics = new Set();
                    for (var ut = 0; ut < topicUrls.length; ut++) {
                        var tRes = await fetchLessonsUnitDownloadResult(topicUrls[ut], depth + 1);
                        (tRes && tRes.links ? tRes.links : []).forEach(function (u) { fromTopics.add(u); });
                        if (ut % 4 === 3) await lessonsBulkDelay(45);
                    }
                    logLessonsBulkDebug('unit_result_step_unit_api_topics', {
                        unitUrl: unitUrl,
                        topicCount: topicUrls.length,
                        found: fromTopics.size
                    });
                    if (fromTopics.size) return { links: Array.from(fromTopics) };
                }
            } catch (eU0) {
                logLessonsBulkDebug('unit_result_unit_api_topics_error', {
                    unitUrl: unitUrl,
                    error: String(eU0 && eU0.message ? eU0.message : eU0)
                });
            }
        }

        var links = await fetchLessonsUnitDownloadUrls(unitUrl);
        logLessonsBulkDebug('unit_result_step_main', { unitUrl: unitUrl, found: (links || []).length });
        if ((!links || !links.length) && /\/topics\//i.test(unitUrl)) {
            try {
                var viaContent = await fetchTopicViewContentDownloadUrls(unitUrl);
                if (viaContent && viaContent.length) links = viaContent;
            } catch (eC0) { }
            logLessonsBulkDebug('unit_result_step_viewcontent', { unitUrl: unitUrl, found: (links || []).length });
        }
        if ((!links || !links.length) && /\/topics\//i.test(unitUrl)) {
            try {
                var viaApi = await fetchTopicApiDownloadUrls(unitUrl);
                if (viaApi && viaApi.length) links = viaApi;
            } catch (eA0) { }
            logLessonsBulkDebug('unit_result_step_topic_api', { unitUrl: unitUrl, found: (links || []).length });
        }
        if ((!links || !links.length) && /\/topics\//i.test(unitUrl) && isLessonsBulkHeavyFallbackEnabled()) {
            try {
                var probed = await probeTopicDownloadViaIframe(unitUrl);
                if (probed && Array.isArray(probed.urls) && probed.urls.length) links = probed.urls;
            } catch (e0) { }
            logLessonsBulkDebug('unit_result_step_iframe', { unitUrl: unitUrl, found: (links || []).length });
        } else if ((!links || !links.length) && /\/topics\//i.test(unitUrl)) {
            logLessonsBulkDebug('unit_result_step_iframe_skipped', { unitUrl: unitUrl, reason: 'heavy_fallback_disabled' });
        }
        logLessonsBulkDebug('unit_result_done', { unitUrl: unitUrl, found: (links || []).length, links: (links || []).slice(0, 5) });
        return { links: links || [] };
    }

    async function triggerTopicNativeDownloadViaIframe(topicUrl) {
        return new Promise(function (resolve) {
            var done = false;
            var iframe = document.createElement('iframe');
            markExt(iframe);
            iframe.style.cssText = 'position:fixed !important;left:-10000px !important;top:0 !important;'
                + 'width:1280px !important;height:900px !important;opacity:0.01 !important;pointer-events:none !important;'
                + 'z-index:-2147483647 !important;border:0 !important;';

            function finish(ok, reason) {
                if (done) return;
                done = true;
                try { iframe.remove(); } catch (e0) { }
                logLessonsBulkDebug('native_download_done', { topicUrl: topicUrl, ok: !!ok, reason: reason || '' });
                resolve({ ok: !!ok, reason: reason || '' });
            }

            function deepQueryInDoc(root) {
                var out = [];
                var seen = new Set();
                function walk(node) {
                    if (!node || seen.has(node)) return;
                    seen.add(node);
                    try {
                        if (node.querySelectorAll) {
                            node.querySelectorAll('.download-content-button, d2l-button-icon.download-content-button').forEach(function (el) {
                                out.push(el);
                            });
                        }
                    } catch (e1) { }
                    try {
                        if (node.querySelectorAll) {
                            node.querySelectorAll('*').forEach(function (el) {
                                if (el && el.shadowRoot) walk(el.shadowRoot);
                            });
                        }
                    } catch (e2) { }
                }
                walk(root);
                return out;
            }

            var timeoutId = setTimeout(function () {
                finish(false, 'timeout');
            }, 13000);

            iframe.onload = function () {
                var tries = 0;
                (function pollForButton() {
                    tries++;
                    var doc = null;
                    try { doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document); } catch (e3) { doc = null; }
                    if (!doc) {
                        if (tries >= 70) {
                            clearTimeout(timeoutId);
                            finish(false, 'no-doc');
                            return;
                        }
                        setTimeout(pollForButton, 160);
                        return;
                    }

                    var btns = deepQueryInDoc(doc);
                    var btn = btns && btns.length ? btns[0] : null;
                    if (btn) {
                        try {
                            btn.click();
                            clearTimeout(timeoutId);
                            finish(true, 'clicked-download-button');
                            return;
                        } catch (e4) {
                            clearTimeout(timeoutId);
                            finish(false, 'click-failed');
                            return;
                        }
                    }

                    if (tries >= 70) {
                        clearTimeout(timeoutId);
                        finish(false, 'button-not-found');
                        return;
                    }
                    setTimeout(pollForButton, 160);
                })();
            };

            try {
                iframe.src = topicUrl;
                document.body.appendChild(iframe);
            } catch (e5) {
                clearTimeout(timeoutId);
                finish(false, 'iframe-error');
            }
        });
    }

    function normalizeTopicCompareUrl(urlStr) {
        try {
            var u = new URL(urlStr, window.location.href);
            return (u.origin + u.pathname).toLowerCase();
        } catch (e0) {
            return String(urlStr || '').toLowerCase();
        }
    }

    function findTopicNavItem(topicUrl) {
        var runtimeDoc = getLessonsRuntimeDocument(document);
        var tocHost = getLessonsTocHost(runtimeDoc);
        if (!tocHost || !tocHost.shadowRoot) return null;
        var target = normalizeTopicCompareUrl(topicUrl);
        var items = [];
        try { items = deepQueryAll('d2l-list-item-nav[action-href]', tocHost.shadowRoot); } catch (e0) { items = []; }
        for (var i = 0; i < items.length; i++) {
            var href = '';
            try { href = items[i].getAttribute('action-href') || ''; } catch (e1) { href = ''; }
            if (!href) continue;
            var abs = toAbsoluteSamePageUrl(href, window.location.href);
            if (!abs) continue;
            if (normalizeTopicCompareUrl(abs) === target) return items[i];
        }
        return null;
    }

    function findTopicDownloadButtonInPage(ids) {
        if (!ids) return null;
        var runtimeDoc = getLessonsRuntimeDocument(document);
        var panelId = 'd2l_content_' + ids.orgUnitId + '_' + ids.topicId;
        var panel = runtimeDoc.getElementById(panelId);
        if (panel) {
            var btn0 = panel.querySelector('.download-content-button, d2l-button-icon.download-content-button');
            if (btn0) return btn0;
        }
        var globalBtns = [];
        try { globalBtns = deepQueryAll('.download-content-button, d2l-button-icon.download-content-button', runtimeDoc); } catch (e0) { globalBtns = []; }
        for (var i = 0; i < globalBtns.length; i++) {
            var b = globalBtns[i];
            var p = null;
            try { p = b.closest ? b.closest('.content-panel') : null; } catch (e1) { p = null; }
            if (p && p.id === panelId) return b;
        }
        return globalBtns.length ? globalBtns[0] : null;
    }

    async function triggerTopicNativeDownloadInCurrentPage(topicUrl) {
        var ids = parseLessonsTopicIds(topicUrl);
        if (!ids) {
            logLessonsBulkDebug('native_page_skip_no_ids', { topicUrl: topicUrl });
            return { ok: false, reason: 'no-ids' };
        }

        var btn = findTopicDownloadButtonInPage(ids);
        if (btn) {
            try {
                btn.click();
                logLessonsBulkDebug('native_page_clicked_existing', { topicUrl: topicUrl });
                return { ok: true, reason: 'clicked-existing' };
            } catch (e0) { }
        }

        var nav = findTopicNavItem(topicUrl);
        if (!nav) {
            logLessonsBulkDebug('native_page_nav_not_found', { topicUrl: topicUrl });
            return { ok: false, reason: 'nav-not-found' };
        }
        try {
            nav.click();
            logLessonsBulkDebug('native_page_nav_clicked', { topicUrl: topicUrl });
        } catch (e1) {
            logLessonsBulkDebug('native_page_nav_click_fail', { topicUrl: topicUrl, error: String(e1 && e1.message ? e1.message : e1) });
            return { ok: false, reason: 'nav-click-fail' };
        }

        for (var t = 0; t < 70; t++) {
            await lessonsBulkDelay(260);
            var btnAfter = findTopicDownloadButtonInPage(ids);
            if (!btnAfter) continue;
            try {
                btnAfter.click();
                logLessonsBulkDebug('native_page_clicked_after_nav', { topicUrl: topicUrl, tries: t + 1 });
                return { ok: true, reason: 'clicked-after-nav' };
            } catch (e2) {
                logLessonsBulkDebug('native_page_button_click_fail', { topicUrl: topicUrl, error: String(e2 && e2.message ? e2.message : e2) });
                return { ok: false, reason: 'button-click-fail' };
            }
        }

        logLessonsBulkDebug('native_page_button_timeout', { topicUrl: topicUrl });
        return { ok: false, reason: 'button-timeout' };
    }

    async function collectTopicFileUrlsInCurrentPage(topicUrl) {
        var ids = parseLessonsTopicIds(topicUrl);
        if (!ids) return [];
        var runtimeDoc = getLessonsRuntimeDocument(document);
        var panelId = 'd2l_content_' + ids.orgUnitId + '_' + ids.topicId;

        var panel = runtimeDoc.getElementById(panelId);
        if (!panel) {
            var nav = findTopicNavItem(topicUrl);
            if (nav) {
                try { nav.click(); } catch (e0) { }
                for (var i = 0; i < 70; i++) {
                    await lessonsBulkDelay(220);
                    panel = runtimeDoc.getElementById(panelId);
                    if (panel) break;
                }
            }
        }
        if (!panel) {
            logLessonsBulkDebug('collect_topic_panel_missing', { topicUrl: topicUrl, panelId: panelId });
            return [];
        }

        var out = new Set();
        panel.querySelectorAll('d2l-pdf-viewer[src], iframe[src], embed[src], source[src], object[data], a[href]').forEach(function (el) {
            var raw = el.getAttribute('src') || el.getAttribute('href') || el.getAttribute('data') || '';
            var abs = toAbsoluteSamePageUrl(raw, window.location.href);
            if (abs && isStrictFileDownloadUrl(abs)) out.add(abs);
        });
        try {
            extractDownloadUrlsFromLessonsHtml(panel.outerHTML || '', window.location.href).forEach(function (u) {
                if (isStrictFileDownloadUrl(u)) out.add(u);
            });
        } catch (e1) { }

        logLessonsBulkDebug('collect_topic_urls_done', {
            topicUrl: topicUrl,
            panelId: panelId,
            found: out.size,
            urls: Array.from(out).slice(0, 8)
        });
        if (out.size) return Array.from(out);
        // Panel-based extraction can fail if the topic panel doesn't hydrate quickly.
        try {
            var viaApi = await fetchTopicApiDownloadUrls(topicUrl);
            (viaApi || []).forEach(function (u) { if (isStrictFileDownloadUrl(u)) out.add(u); });
        } catch (e2) { }
        logLessonsBulkDebug('collect_topic_urls_after_api', {
            topicUrl: topicUrl,
            found: out.size,
            urls: Array.from(out).slice(0, 8)
        });
        return Array.from(out);
    }

    function getFilenameFromContentDisposition(contentDisposition) {
        if (!contentDisposition) return '';
        var cd = String(contentDisposition);
        var mStar = cd.match(/filename\*\s*=\s*([^;]+)/i);
        if (mStar && mStar[1]) {
            var raw = mStar[1].trim().replace(/^UTF-8''/i, '').replace(/^"(.*)"$/, '$1');
            try { return decodeURIComponent(raw); } catch (e0) { return raw; }
        }
        var m = cd.match(/filename\s*=\s*([^;]+)/i);
        if (m && m[1]) {
            return m[1].trim().replace(/^"(.*)"$/, '$1');
        }
        return '';
    }

    function getFilenameFromUrl(url) {
        if (!url) return 'downloaded-file';
        try {
            var u = new URL(url, window.location.href);
            var path = (u.pathname || '').split('/');
            var last = path.length ? path[path.length - 1] : '';
            if (last && /\.[a-z0-9]{2,8}$/i.test(last)) return decodeURIComponent(last);
        } catch (e0) { }
        return 'downloaded-file';
    }

    function hasFilenameExtension(name) {
        return /\.[a-z0-9]{1,12}$/i.test(String(name || ''));
    }

    function isGenericDownloadFileName(name) {
        var n = String(name || '').trim().toLowerCase();
        if (!n) return true;
        n = n.replace(/\.[a-z0-9]{1,12}$/i, '');
        return n === 'downloaded-file' || n === 'download' || n === 'file' || /^file-\d+$/.test(n);
    }

    function getExtensionFromUrlPath(url) {
        if (!url) return '';
        try {
            var u = new URL(url, window.location.href);
            var last = ((u.pathname || '').split('/').pop() || '').toLowerCase();
            var m = last.match(/\.([a-z0-9]{1,12})$/i);
            if (!m || !m[1]) return '';
            return '.' + m[1].toLowerCase();
        } catch (e0) {
            return '';
        }
    }

    function getExtensionFromContentType(contentType) {
        var ct = String(contentType || '').toLowerCase().split(';')[0].trim();
        if (!ct) return '';
        var map = {
            'application/pdf': '.pdf',
            'text/plain': '.txt',
            'text/markdown': '.md',
            'text/csv': '.csv',
            'application/json': '.json',
            'application/xml': '.xml',
            'text/xml': '.xml',
            'application/zip': '.zip',
            'application/x-zip-compressed': '.zip',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
            'application/vnd.ms-powerpoint': '.ppt',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
            'application/vnd.ms-excel': '.xls',
            'image/png': '.png',
            'image/jpeg': '.jpg',
            'image/gif': '.gif',
            'video/mp4': '.mp4',
            'video/webm': '.webm',
            'text/x-c': '.c',
            'text/x-csrc': '.c',
            'application/x-csrc': '.c',
            'text/x-chdr': '.h',
            'text/x-c++src': '.cpp',
            'text/x-c++hdr': '.hpp',
            'text/x-java-source': '.java',
            'text/x-python': '.py'
        };
        if (map[ct]) return map[ct];
        if (/c\+\+/.test(ct) && /source/.test(ct)) return '.cpp';
        if (/c\+\+/.test(ct) && /header|hdr/.test(ct)) return '.hpp';
        if (/x-csrc|c-source|x-c$/i.test(ct)) return '.c';
        if (/x-chdr|c-header|header/i.test(ct)) return '.h';
        return '';
    }

    function resolveDownloadFileName(url, contentDisposition, contentType, index, altUrl) {
        var srcUrl = url || '';
        var fileName = getFilenameFromContentDisposition(contentDisposition || '');
        if (!fileName) fileName = getFilenameFromUrl(srcUrl);
        var hint = _lessonsBulkUrlNameHints.get(srcUrl) || '';
        if (!hint && altUrl) hint = _lessonsBulkUrlNameHints.get(String(altUrl)) || '';
        if (!hint) {
            try {
                var su = new URL(srcUrl, window.location.href);
                hint = _lessonsBulkUrlNameHints.get(su.origin + su.pathname) || '';
            } catch (e0) { }
        }
        if (!hint && altUrl) {
            try {
                var au = new URL(altUrl, window.location.href);
                hint = _lessonsBulkUrlNameHints.get(au.origin + au.pathname) || '';
            } catch (e1) { }
        }
        if ((!fileName || isGenericDownloadFileName(fileName)) && hint) {
            fileName = hint;
        }
        if (!fileName) fileName = 'file-' + String((index || 0) + 1);
        if (!hasFilenameExtension(fileName)) {
            var ext = getExtensionFromUrlPath(srcUrl) || getExtensionFromContentType(contentType || '');
            if (ext) fileName += ext;
        }
        return sanitizeZipEntryName(fileName, 'file-' + String((index || 0) + 1));
    }

    function sanitizeZipEntryName(name, fallback) {
        var v = normalizeWhitespace(String(name || '').trim());
        if (!v) v = fallback || 'file';
        v = v.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
        v = v.replace(/\s+/g, ' ');
        v = v.replace(/^\.+/, '').replace(/\.+$/, '');
        if (!v) v = fallback || 'file';
        return v.slice(0, 180);
    }

    function getLessonsBulkZipCrcTable() {
        if (window.__DTU_AD_ZIP_CRC_TABLE__) return window.__DTU_AD_ZIP_CRC_TABLE__;
        var table = new Uint32Array(256);
        for (var n = 0; n < 256; n++) {
            var c = n;
            for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            table[n] = c >>> 0;
        }
        window.__DTU_AD_ZIP_CRC_TABLE__ = table;
        return table;
    }

    function crc32Bytes(bytes) {
        var table = getLessonsBulkZipCrcTable();
        var c = 0xFFFFFFFF;
        for (var i = 0; i < bytes.length; i++) {
            c = table[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
        }
        return (c ^ 0xFFFFFFFF) >>> 0;
    }

    function zipDosDateTime(dateObj) {
        var d = dateObj instanceof Date ? dateObj : new Date();
        var year = Math.max(1980, Math.min(2107, d.getFullYear()));
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var hour = d.getHours();
        var minute = d.getMinutes();
        var second = Math.floor(d.getSeconds() / 2);
        var dosTime = ((hour & 0x1F) << 11) | ((minute & 0x3F) << 5) | (second & 0x1F);
        var dosDate = (((year - 1980) & 0x7F) << 9) | ((month & 0x0F) << 5) | (day & 0x1F);
        return { time: dosTime >>> 0, date: dosDate >>> 0 };
    }

    function pushU16LE(out, v) {
        out.push(v & 0xFF, (v >>> 8) & 0xFF);
    }

    function pushU32LE(out, v) {
        out.push(v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF);
    }

    function buildStoreOnlyZipBlob(entries) {
        var encoder = new TextEncoder();
        var chunks = [];
        var central = [];
        var offset = 0;

        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            var nameBytes = encoder.encode(e.name);
            var data = e.bytes instanceof Uint8Array ? e.bytes : new Uint8Array(e.bytes || []);
            var crc = crc32Bytes(data);
            var dt = zipDosDateTime(e.date);

            var local = [];
            pushU32LE(local, 0x04034b50);
            pushU16LE(local, 20);
            pushU16LE(local, 0x0800);
            pushU16LE(local, 0);
            pushU16LE(local, dt.time);
            pushU16LE(local, dt.date);
            pushU32LE(local, crc);
            pushU32LE(local, data.length);
            pushU32LE(local, data.length);
            pushU16LE(local, nameBytes.length);
            pushU16LE(local, 0);
            chunks.push(new Uint8Array(local));
            chunks.push(nameBytes);
            chunks.push(data);

            var centralHdr = [];
            pushU32LE(centralHdr, 0x02014b50);
            pushU16LE(centralHdr, 20);
            pushU16LE(centralHdr, 20);
            pushU16LE(centralHdr, 0x0800);
            pushU16LE(centralHdr, 0);
            pushU16LE(centralHdr, dt.time);
            pushU16LE(centralHdr, dt.date);
            pushU32LE(centralHdr, crc);
            pushU32LE(centralHdr, data.length);
            pushU32LE(centralHdr, data.length);
            pushU16LE(centralHdr, nameBytes.length);
            pushU16LE(centralHdr, 0);
            pushU16LE(centralHdr, 0);
            pushU16LE(centralHdr, 0);
            pushU16LE(centralHdr, 0);
            pushU32LE(centralHdr, 0);
            pushU32LE(centralHdr, offset);
            central.push(new Uint8Array(centralHdr));
            central.push(nameBytes);

            offset += local.length + nameBytes.length + data.length;
        }

        var centralSize = 0;
        for (var c = 0; c < central.length; c++) centralSize += central[c].length;
        var centralOffset = offset;

        for (var j = 0; j < central.length; j++) chunks.push(central[j]);

        var eocd = [];
        pushU32LE(eocd, 0x06054b50);
        pushU16LE(eocd, 0);
        pushU16LE(eocd, 0);
        pushU16LE(eocd, entries.length);
        pushU16LE(eocd, entries.length);
        pushU32LE(eocd, centralSize);
        pushU32LE(eocd, centralOffset);
        pushU16LE(eocd, 0);
        chunks.push(new Uint8Array(eocd));

        return new Blob(chunks, { type: 'application/zip' });
    }

    async function fetchFileForBundle(url, index) {
        try {
            if (!isStrictFileDownloadUrl(url)) return { ok: false, reason: 'invalid-url' };
            var resp = await fetch(url, { credentials: 'include', cache: 'no-store' });
            if (!resp || !resp.ok) {
                return { ok: false, reason: 'http', status: resp ? resp.status : 'no_response', finalUrl: resp && resp.url ? resp.url : '' };
            }
            var ab = await resp.arrayBuffer();
            var bytes = new Uint8Array(ab || new ArrayBuffer(0));
            if (!bytes.length) return { ok: false, reason: 'empty' };

            var finalUrl = (resp && resp.url) ? resp.url : url;
            var cd = resp && resp.headers && resp.headers.get ? resp.headers.get('content-disposition') : '';
            var ct = resp && resp.headers && resp.headers.get ? resp.headers.get('content-type') : '';
            var fileName = resolveDownloadFileName(url || finalUrl, cd, ct, index, finalUrl);
            logLessonsBulkDebug('bundle_file_name', {
                index: index,
                url: url,
                finalUrl: finalUrl,
                contentType: ct,
                fileName: fileName
            });
            return { ok: true, name: fileName, bytes: bytes, url: url };
        } catch (e0) {
            return { ok: false, reason: 'fetch', error: String(e0 && e0.message ? e0.message : e0) };
        }
    }

    function getLessonsBulkZipBaseTitle() {
        var title = '';
        try { title = normalizeWhitespace(document.title || ''); } catch (e0) { title = ''; }
        if (!title) return 'DTU Learn Course Content';

        var parts = title.split(/\s+-\s+/).map(function (p) { return normalizeWhitespace(p || ''); }).filter(Boolean);
        if (parts.length <= 1) {
            return title.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim() || 'DTU Learn Course Content';
        }

        var best = parts[0];
        var bestScore = -9999;
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i] || '';
            var score = 0;
            if (/\b\d{5}\b/.test(p)) score += 5;
            if (/\b(spring|autumn|fall|summer|winter|f\d{2}|e\d{2})\b/i.test(p)) score += 3;
            if (/\s/.test(p)) score += 1;
            if (/_/.test(p)) score -= 3;
            if (/\.(pdf|docx?|pptx?|xlsx?|zip)\b/i.test(p)) score -= 4;
            if (/^(book|old exam sets|course handbook|lecture slides|exercises and assignments)$/i.test(p)) score -= 4;
            if (score > bestScore) {
                bestScore = score;
                best = p;
            }
        }

        best = best.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
        return best || 'DTU Learn Course Content';
    }

    function getLessonsBulkZipNameBase() {
        var title = getLessonsBulkZipBaseTitle();
        var d = new Date();
        function pad(n) { return String(n).padStart(2, '0'); }
        var stamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
        return (title + ' - Course Content - ' + stamp).slice(0, 120);
    }

    async function downloadSingleBundledZipFromUrls(rootEl, urls) {
        var list = Array.from(new Set((urls || []).filter(function (u) { return isStrictFileDownloadUrl(u); })));
        if (!list.length) return { ok: false, reason: 'no-files' };

        var fileEntries = [];
        var failByReason = {};
        var usedNames = new Map();

        for (var i = 0; i < list.length; i++) {
            setLessonsBulkStatus(rootEl, 'Bundling file ' + (i + 1) + ' / ' + list.length + '...', 'work');
            var r = await fetchFileForBundle(list[i], i);
            if (!r || !r.ok) {
                var reason = (r && r.reason) ? r.reason : 'unknown';
                failByReason[reason] = (failByReason[reason] || 0) + 1;
                logLessonsBulkDebug('bundle_fetch_fail', { url: list[i], result: r || null });
                continue;
            }
            var baseName = sanitizeZipEntryName(r.name, 'file-' + String(i + 1));
            var finalName = baseName;
            var count = usedNames.get(baseName) || 0;
            if (count > 0) {
                var dot = baseName.lastIndexOf('.');
                if (dot > 0) finalName = baseName.slice(0, dot) + ' (' + count + ')' + baseName.slice(dot);
                else finalName = baseName + ' (' + count + ')';
            }
            usedNames.set(baseName, count + 1);
            fileEntries.push({ name: finalName, bytes: r.bytes, date: new Date() });
        }

        if (!fileEntries.length) return { ok: false, reason: 'fetch-failed', failByReason: failByReason };

        var zipBlob = buildStoreOnlyZipBlob(fileEntries);
        var zipName = sanitizeZipEntryName(getLessonsBulkZipNameBase(), 'DTU-Learn-Bulk-Download') + '.zip';
        var blobUrl = URL.createObjectURL(zipBlob);
        var a = document.createElement('a');
        markExt(a);
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = zipName;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            try { a.remove(); } catch (e0) { }
            try { URL.revokeObjectURL(blobUrl); } catch (e1) { }
        }, 2500);
        return { ok: true, fileCount: fileEntries.length, failByReason: failByReason, zipName: zipName };
    }

    function triggerDirectFileDownload(url, filename, index) {
        try {
            // Direct anchor download (no _blank) to avoid popup windows/tabs.
            var a = document.createElement('a');
            markExt(a);
            a.style.display = 'none';
            a.href = url;
            var fallbackName = filename || ('dtu-file-' + String((index || 0) + 1));
            if (fallbackName) a.download = fallbackName;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                try { a.remove(); } catch (e0) { }
            }, 1000);
            return true;
        } catch (e1) {
            return false;
        }
    }

    async function downloadFileUrl(url, index) {
        try {
            if (!isStrictFileDownloadUrl(url)) {
                logLessonsBulkDebug('download_skip_invalid', { url: url, index: index });
                return { ok: false, reason: 'invalid-url' };
            }
            var resp = await fetch(url, { credentials: 'include', cache: 'no-store' });
            if (!resp || !resp.ok) {
                logLessonsBulkDebug('download_http_fail', {
                    url: url,
                    index: index,
                    status: resp ? resp.status : 'no_response',
                    finalUrl: resp && resp.url ? resp.url : ''
                });
                return { ok: false, reason: 'http' };
            }
            var blob = await resp.blob();
            if (!blob || !blob.size) {
                logLessonsBulkDebug('download_empty_blob', { url: url, index: index, status: resp.status, finalUrl: resp.url || url });
                return { ok: false, reason: 'empty' };
            }

            var finalUrl = (resp && resp.url) ? resp.url : url;
            var cd = resp && resp.headers && resp.headers.get ? resp.headers.get('content-disposition') : '';
            var ct = resp && resp.headers && resp.headers.get ? resp.headers.get('content-type') : '';
            var fileName = resolveDownloadFileName(url || finalUrl, cd, ct, index, finalUrl);

            var blobUrl = URL.createObjectURL(blob);
            var a = document.createElement('a');
            markExt(a);
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                try { a.remove(); } catch (e1) { }
                try { URL.revokeObjectURL(blobUrl); } catch (e2) { }
            }, 1200);
            logLessonsBulkDebug('download_ok_blob', { url: url, index: index, finalUrl: resp.url || url, fileName: fileName, blobSize: blob.size });
            return { ok: true, mode: 'blob' };
        } catch (e3) {
            if (!isStrictFileDownloadUrl(url)) {
                logLessonsBulkDebug('download_exception_invalid', { url: url, index: index, error: String(e3 && e3.message ? e3.message : e3) });
                return { ok: false, reason: 'invalid-url' };
            }
            var fallbackName2 = getFilenameFromUrl(url);
            var triggered2 = triggerDirectFileDownload(url, fallbackName2, index);
            logLessonsBulkDebug('download_fallback', {
                url: url,
                index: index,
                fallbackName: fallbackName2,
                triggered: !!triggered2,
                error: String(e3 && e3.message ? e3.message : e3)
            });
            return triggered2 ? { ok: true, mode: 'anchor-fallback' } : { ok: false, reason: 'fetch' };
        }
    }

    function lessonsBulkDelay(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms || 0); });
    }

    function setLessonsBulkStatus(rootEl, text, tone) {
        if (!rootEl) return;
        var status = rootEl.querySelector('.dtu-lbd-status');
        if (!status) return;
        status.textContent = text || '';
        var color = '';
        if (tone === 'error') color = isDarkModeEnabled() ? '#ff9fa4' : '#a8202a';
        else if (tone === 'ok') color = isDarkModeEnabled() ? '#79d39a' : '#0c7a39';
        else if (tone === 'work') color = isDarkModeEnabled() ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)';
        status.style.color = color || '';
    }

    function updateLessonsBulkRunButton(rootEl) {
        if (!rootEl) return;
        var runBtn = rootEl.querySelector('.dtu-lbd-run');
        if (!runBtn) return;
        var selectedCount = 0;
        rootEl.querySelectorAll('.dtu-lbd-list input[type="checkbox"][data-section-key]').forEach(function (cb) {
            if (cb.checked) selectedCount++;
        });
        runBtn.textContent = selectedCount > 0
            ? ('Download selected (' + selectedCount + ')')
            : 'Download selected';
    }

    function setLessonsBulkControlsDisabled(rootEl, disabled) {
        if (!rootEl) return;
        rootEl.querySelectorAll('.dtu-lbd-mini, .dtu-lbd-run, .dtu-lbd-list input[type="checkbox"]').forEach(function (el) {
            el.disabled = !!disabled;
        });
    }

    async function runLessonsBulkDownload(rootEl) {
        if (!rootEl || _lessonsBulkUiState.running) return;
        if (!isLessonsBulkDownloadEnabled()) return;
        if (!isDTULearnLessonsPage()) return;
        _lessonsBulkUiState.activeDoc = (rootEl && rootEl.ownerDocument) ? rootEl.ownerDocument : getLessonsWorkingDocument(document);
        _lessonsBulkUrlNameHints = new Map();
        if (isLegacyLessonsTreeDocument(_lessonsBulkUiState.activeDoc)) {
            maybeStartLegacyApiSectionsHydration(_lessonsBulkUiState.activeDoc, rootEl);
            var legacyOrgUnitId = getCurrentLessonsOrgUnitId(_lessonsBulkUiState.activeDoc);
            if (legacyOrgUnitId && _lessonsLegacyApiSectionsCache.orgUnitId === legacyOrgUnitId && _lessonsLegacyApiSectionsCache.promise) {
                setLessonsBulkStatus(rootEl, 'Scanning full content tree for section folders...', 'work');
                try {
                    await _lessonsLegacyApiSectionsCache.promise;
                } catch (eLbdHyd0) { }
                refreshLessonsBulkDownloadUi(rootEl, true);
            }
        }

        var selectedKeys = [];
        rootEl.querySelectorAll('.dtu-lbd-list input[type="checkbox"][data-section-key]').forEach(function (cb) {
            if (cb.checked) selectedKeys.push(cb.getAttribute('data-section-key'));
        });

        if (!selectedKeys.length) {
            setLessonsBulkStatus(rootEl, 'Select at least one section first.', 'error');
            return;
        }

        var byKey = {};
        (_lessonsBulkUiState.sections || []).forEach(function (section) {
            byKey[section.key] = section;
        });

        if (isLegacyLessonsTreeDocument(_lessonsBulkUiState.activeDoc)) {
            var legacyResolvedAny = false;
            var hiddenSectionsFallback = null;
            for (var sk = 0; sk < selectedKeys.length; sk++) {
                var sectionToResolve = byKey[selectedKeys[sk]];
                if (!sectionToResolve) continue;
                var currentUrls = Array.isArray(sectionToResolve.unitUrls) ? sectionToResolve.unitUrls : [];
                var looksCollapsedOnly = legacySectionHasOnlyUnitUrls(sectionToResolve);
                if (!looksCollapsedOnly) continue;

                setLessonsBulkStatus(
                    rootEl,
                    'Resolving nested topics for "' + (sectionToResolve.label || 'section') + '" (' + (sk + 1) + ' / ' + selectedKeys.length + ')...',
                    'work'
                );
                var resolvedUrls = await resolveLegacySectionUnitUrlsViaHiddenFrame(sectionToResolve, _lessonsBulkUiState.activeDoc);
                var resolvedOnlyUnits = legacySectionHasOnlyUnitUrls({ unitUrls: Array.isArray(resolvedUrls) ? resolvedUrls : [] });
                if ((!resolvedUrls || !resolvedUrls.length || resolvedOnlyUnits) && looksCollapsedOnly) {
                    if (!hiddenSectionsFallback) {
                        hiddenSectionsFallback = await buildLegacySectionsViaHiddenFrame(_lessonsBulkUiState.activeDoc);
                    }
                    if (hiddenSectionsFallback && hiddenSectionsFallback.length) {
                        var wantedId = parseLegacySectionObjectId(sectionToResolve);
                        var matched = hiddenSectionsFallback.find(function (s) {
                            return parseLegacySectionObjectId(s) === wantedId;
                        });
                        if (matched && Array.isArray(matched.unitUrls) && matched.unitUrls.length) {
                            resolvedUrls = matched.unitUrls.slice();
                        }
                    }
                }
                if (resolvedUrls && resolvedUrls.length) {
                    var beforeCount = currentUrls.length;
                    applyResolvedUrlsToLegacySections(String(sectionToResolve.key || ''), resolvedUrls);
                    _lessonsLegacyBackgroundResolveState.resolvedKeys.add(String(sectionToResolve.key || ''));
                    if (resolvedUrls.length !== beforeCount || looksCollapsedOnly) legacyResolvedAny = true;
                }
            }
            if (legacyResolvedAny) {
                _lessonsBulkUiState.sig = '';
                refreshLessonsBulkDownloadUi(rootEl, true);
            }
        }

        var unitUrlSet = new Set();
        selectedKeys.forEach(function (key) {
            var section = byKey[key];
            if (!section || !Array.isArray(section.unitUrls)) return;
            sanitizeLessonsSectionUnitUrls(section.unitUrls).forEach(function (u) { unitUrlSet.add(u); });
        });

        var unitUrls = Array.from(unitUrlSet);
        logLessonsBulkDebug('run_start', {
            selectedKeys: selectedKeys,
            selectedCount: selectedKeys.length,
            unitCount: unitUrls.length,
            unitUrls: unitUrls
        });
        if (!unitUrls.length) {
            setLessonsBulkStatus(rootEl, 'No lesson pages found in selected sections.', 'error');
            return;
        }

        if (unitUrls.length > 180) {
            var proceed = window.confirm(
                'This will scan ' + unitUrls.length
                + ' lesson pages and may trigger many downloads. Continue?'
            );
            if (!proceed) return;
        }

        _lessonsBulkUiState.running = true;
        setLessonsBulkControlsDisabled(rootEl, true);
        setLessonsBulkStatus(rootEl, 'Scanning lesson pages for downloadable files...', 'work');

        try {
            var downloadUrlSet = new Set();
            var nativeFallbackTopics = [];
            for (var i = 0; i < unitUrls.length; i++) {
                setLessonsBulkStatus(rootEl, 'Scanning page ' + (i + 1) + ' / ' + unitUrls.length + '...', 'work');
                var result = await fetchLessonsUnitDownloadResult(unitUrls[i]);
                (result.links || []).forEach(function (url) { downloadUrlSet.add(url); });
                if (/\/topics\//i.test(unitUrls[i]) && result && result.links && result.links.length) {
                    var topicHint = getTopicLabelHintFromTopicUrl(unitUrls[i]);
                    if (topicHint) {
                        result.links.forEach(function (u0) {
                            if (!_lessonsBulkUrlNameHints.has(u0)) _lessonsBulkUrlNameHints.set(u0, topicHint);
                            try {
                                var uParsed = new URL(u0, window.location.href);
                                var canonical = uParsed.origin + uParsed.pathname;
                                if (!_lessonsBulkUrlNameHints.has(canonical)) _lessonsBulkUrlNameHints.set(canonical, topicHint);
                            } catch (eUH0) { }
                        });
                    }
                }
                if ((!result.links || !result.links.length) && /\/topics\//i.test(unitUrls[i])) {
                    nativeFallbackTopics.push(unitUrls[i]);
                }
                logLessonsBulkDebug('run_scan_result', {
                    page: i + 1,
                    totalPages: unitUrls.length,
                    unitUrl: unitUrls[i],
                    foundForPage: (result.links || []).length,
                    cumulativeUnique: downloadUrlSet.size
                });
                if (i % 4 === 3) await lessonsBulkDelay(60);
            }

            var downloadUrls = Array.from(downloadUrlSet).filter(function (u) { return isStrictFileDownloadUrl(u); });
            logLessonsBulkDebug('run_after_filter', {
                rawUnique: downloadUrlSet.size,
                strictUnique: downloadUrls.length,
                urls: downloadUrls
            });
            if (isLessonsBulkSingleZipEnabled()) {
                var bundledUrlSet = new Set(downloadUrls);
                if (nativeFallbackTopics.length) {
                    setLessonsBulkStatus(rootEl, 'Resolving topic files for one ZIP bundle...', 'work');
                    for (var rf = 0; rf < nativeFallbackTopics.length; rf++) {
                        setLessonsBulkStatus(rootEl, 'Resolving topic ' + (rf + 1) + ' / ' + nativeFallbackTopics.length + '...', 'work');
                        var recovered = await collectTopicFileUrlsInCurrentPage(nativeFallbackTopics[rf]);
                        var topicHintRf = getTopicLabelHintFromTopicUrl(nativeFallbackTopics[rf]);
                        (recovered || []).forEach(function (u) {
                            if (isStrictFileDownloadUrl(u)) {
                                bundledUrlSet.add(u);
                                if (topicHintRf) {
                                    if (!_lessonsBulkUrlNameHints.has(u)) _lessonsBulkUrlNameHints.set(u, topicHintRf);
                                    try {
                                        var uParsed2 = new URL(u, window.location.href);
                                        var canonical2 = uParsed2.origin + uParsed2.pathname;
                                        if (!_lessonsBulkUrlNameHints.has(canonical2)) _lessonsBulkUrlNameHints.set(canonical2, topicHintRf);
                                    } catch (eUH1) { }
                                }
                            }
                        });
                        await lessonsBulkDelay(220);
                    }
                }

                var bundledUrls = Array.from(bundledUrlSet).filter(function (u) { return isStrictFileDownloadUrl(u); });
                logLessonsBulkDebug('run_single_zip_resolved', {
                    initialFound: downloadUrls.length,
                    nativeTopics: nativeFallbackTopics.length,
                    bundledResolved: bundledUrls.length
                });
                if (!bundledUrls.length) {
                    setLessonsBulkStatus(rootEl, 'No downloadable files found in selected sections.', 'error');
                    logLessonsBulkDebug('run_no_downloadable_files', {
                        selectedKeys: selectedKeys,
                        unitUrls: unitUrls,
                        nativeAttempted: nativeFallbackTopics.length
                    });
                    return;
                }

                setLessonsBulkStatus(rootEl, 'Building one ZIP bundle (' + bundledUrls.length + ' file(s))...', 'work');
                var bundle = await downloadSingleBundledZipFromUrls(rootEl, bundledUrls);
                if (bundle && bundle.ok) {
                    setLessonsBulkStatus(rootEl, 'Started 1 bundled ZIP download (' + bundle.fileCount + ' file' + (bundle.fileCount === 1 ? '' : 's') + ').', 'ok');
                    logLessonsBulkDebug('run_single_zip_ok', bundle);
                } else {
                    var bundleFail = (bundle && bundle.failByReason) ? bundle.failByReason : {};
                    var bundleParts = Object.keys(bundleFail).map(function (k) { return k + ':' + bundleFail[k]; });
                    var bundleTxt = bundleParts.length ? (' (' + bundleParts.join(', ') + ')') : '';
                    setLessonsBulkStatus(rootEl, 'Could not create bundled ZIP from selected topics.' + bundleTxt, 'error');
                    logLessonsBulkDebug('run_single_zip_fail', bundle || null);
                }
                return;
            }

            if (!downloadUrls.length) {
                var nativeOk = 0;
                if (nativeFallbackTopics.length) {
                    setLessonsBulkStatus(rootEl, 'Trying native download buttons...', 'work');
                    for (var nf = 0; nf < nativeFallbackTopics.length; nf++) {
                        setLessonsBulkStatus(rootEl, 'Trying native download ' + (nf + 1) + ' / ' + nativeFallbackTopics.length + '...', 'work');
                        var nd = await triggerTopicNativeDownloadInCurrentPage(nativeFallbackTopics[nf]);
                        if ((!nd || !nd.ok) && isLessonsBulkHeavyFallbackEnabled()) {
                            nd = await triggerTopicNativeDownloadViaIframe(nativeFallbackTopics[nf]);
                        } else if (!nd || !nd.ok) {
                            logLessonsBulkDebug('native_iframe_fallback_skipped', {
                                topicUrl: nativeFallbackTopics[nf],
                                reason: 'heavy_fallback_disabled'
                            });
                        }
                        if (nd && nd.ok) nativeOk++;
                        await lessonsBulkDelay(650);
                    }
                }
                if (nativeOk > 0) {
                    setLessonsBulkStatus(rootEl, 'Started ' + nativeOk + ' native file download' + (nativeOk === 1 ? '' : 's') + '.', 'ok');
                    logLessonsBulkDebug('run_native_fallback_ok', { nativeOk: nativeOk, nativeAttempted: nativeFallbackTopics.length });
                    return;
                }

                setLessonsBulkStatus(rootEl, 'No downloadable files found in selected sections.', 'error');
                logLessonsBulkDebug('run_no_downloadable_files', {
                    selectedKeys: selectedKeys,
                    unitUrls: unitUrls,
                    nativeAttempted: nativeFallbackTopics.length
                });
                return;
            }

            setLessonsBulkStatus(rootEl, 'Downloading ' + downloadUrls.length + ' file(s)...', 'work');
            var okCount = 0;
            var fallbackCount = 0;
            var failByReason = {};
            for (var j = 0; j < downloadUrls.length; j++) {
                var dl = await downloadFileUrl(downloadUrls[j], j);
                if (dl && dl.ok) {
                    okCount++;
                    if (dl.mode === 'anchor-fallback') fallbackCount++;
                } else {
                    var reason = (dl && dl.reason) ? dl.reason : 'unknown';
                    failByReason[reason] = (failByReason[reason] || 0) + 1;
                }
                setLessonsBulkStatus(rootEl, 'Downloading ' + (j + 1) + ' / ' + downloadUrls.length + '...', 'work');
                await lessonsBulkDelay(180);
            }

            if (okCount > 0) {
                var msg = 'Started ' + okCount + ' file download' + (okCount === 1 ? '' : 's') + '.';
                if (fallbackCount > 0) {
                    msg += ' (' + fallbackCount + ' used fallback download mode.)';
                }
                setLessonsBulkStatus(rootEl, msg, 'ok');
                logLessonsBulkDebug('run_done_ok', { okCount: okCount, fallbackCount: fallbackCount, failByReason: failByReason });
            } else {
                var reasonParts = Object.keys(failByReason).map(function (k) { return k + ':' + failByReason[k]; });
                var reasonText = reasonParts.length ? (' (' + reasonParts.join(', ') + ')') : '';
                setLessonsBulkStatus(rootEl, 'Could not download files automatically from selected topics.' + reasonText, 'error');
                logLessonsBulkDebug('run_done_fail', { failByReason: failByReason, attempted: downloadUrls.length, urls: downloadUrls });
            }
        } finally {
            _lessonsBulkUiState.running = false;
            setLessonsBulkControlsDisabled(rootEl, false);
            updateLessonsBulkRunButton(rootEl);
        }
    }

    function renderLessonsBulkSectionList(rootEl, sections) {
        if (!rootEl) return;
        var list = rootEl.querySelector('.dtu-lbd-list');
        if (!list) return;

        var rootDoc = (rootEl && rootEl.ownerDocument) ? rootEl.ownerDocument : getLessonsRuntimeDocument(document);
        var showTopicCounts = hasModernLessonsTocStructure(rootDoc);

        list.textContent = '';

        var validKeySet = new Set((sections || []).map(function (s) { return s.key; }));
        _lessonsBulkUiState.selectedKeys = new Set(
            Array.from(_lessonsBulkUiState.selectedKeys || []).filter(function (k) { return validKeySet.has(k); })
        );

        if (!sections || !sections.length) {
            var empty = document.createElement('div');
            markExt(empty);
            empty.className = 'dtu-lbd-empty';
            empty.textContent = 'No section folders found yet. Please wait a moment and try again.';
            list.appendChild(empty);
            updateLessonsBulkRunButton(rootEl);
            return;
        }

        var minDepth = Math.min.apply(null, sections.map(function (s) { return s.depth || 0; }));

        var frag = document.createDocumentFragment();
        sections.forEach(function (section) {
            var row = document.createElement('label');
            markExt(row);
            row.className = 'dtu-lbd-row';
            var indentPx = Math.max(0, Math.min(18, ((section.depth || 0) - minDepth) * 6));
            row.style.paddingLeft = String(4 + indentPx) + 'px';

            var cb = document.createElement('input');
            markExt(cb);
            cb.type = 'checkbox';
            cb.setAttribute('data-section-key', section.key);
            cb.checked = _lessonsBulkUiState.selectedKeys.has(section.key);
            cb.addEventListener('change', function () {
                if (cb.checked) _lessonsBulkUiState.selectedKeys.add(section.key);
                else _lessonsBulkUiState.selectedKeys.delete(section.key);
                updateLessonsBulkRunButton(rootEl);
            });

            var txt = document.createElement('span');
            markExt(txt);
            txt.className = 'dtu-lbd-label';

            var name = document.createElement('span');
            markExt(name);
            name.className = 'dtu-lbd-name';
            name.textContent = section.label || 'Untitled';

            txt.appendChild(name);
            if (showTopicCounts) {
                var meta = document.createElement('span');
                markExt(meta);
                meta.className = 'dtu-lbd-meta';
                var count = Number(section && section.unitCount || 0);
                if (!isFinite(count) || count < 0) count = 0;
                meta.textContent = String(count) + ' topic page' + (count === 1 ? '' : 's');
                txt.appendChild(meta);
            }

            row.appendChild(cb);
            row.appendChild(txt);
            frag.appendChild(row);
        });
        list.appendChild(frag);

        updateLessonsBulkRunButton(rootEl);
    }

    function refreshLessonsBulkDownloadUi(rootEl, force) {
        if (!rootEl) return;
        var now = Date.now();
        var isOpen = false;
        try { isOpen = !!rootEl.classList.contains('dtu-open'); } catch (e0) { isOpen = false; }
        var minInterval = isOpen ? 450 : 2200;
        if (!force && now - (_lessonsBulkUiState.lastRefreshAt || 0) < minInterval) return;
        _lessonsBulkUiState.lastRefreshAt = now;

        var scopeDoc = (rootEl && rootEl.ownerDocument) ? rootEl.ownerDocument : getLessonsWorkingDocument(document);
        _lessonsBulkUiState.activeDoc = scopeDoc;
        var isLegacy = isLegacyLessonsTreeDocument(scopeDoc);
        var orgUnitId = isLegacy ? getCurrentLessonsOrgUnitId(scopeDoc) : '';
        if (isLegacy) maybeStartLegacyApiSectionsHydration(scopeDoc, rootEl);

        var sections = [];
        var usedLegacyApi = false;
        var cachedSections = [];
        if (isLegacy && orgUnitId && _lessonsLegacyApiSectionsCache.orgUnitId === orgUnitId) {
            cachedSections = Array.isArray(_lessonsLegacyApiSectionsCache.sections) ? _lessonsLegacyApiSectionsCache.sections : [];
            cachedSections = normalizeLessonsBulkSections(cachedSections);
        }

        var domSections = normalizeLessonsBulkSections(buildLessonsTreeSections(scopeDoc));
        if (isLegacy) {
            var cacheFresh = cachedSections.length && (now - (_lessonsLegacyApiSectionsCache.ts || 0)) < 1000 * 60 * 20;
            if (cacheFresh) {
                var useCache = isLegacyQualityBetter(cachedSections, domSections) || !domSections.length;
                sections = useCache ? cachedSections.slice() : domSections.slice();
                usedLegacyApi = useCache;
            } else {
                sections = domSections.slice();
            }
        } else {
            sections = domSections.slice();
        }
        logLessonsBulkDebug('sections_built', {
            docUrl: (function () { try { return String(scopeDoc.location && scopeDoc.location.href ? scopeDoc.location.href : ''); } catch (e0) { return ''; } })(),
            count: sections.length,
            source: usedLegacyApi ? 'legacy-api' : (isLegacy ? 'legacy-dom' : 'modern-dom'),
            sample: sections.slice(0, 12).map(function (s) { return { key: s.key, label: s.label, depth: s.depth, unitCount: s.unitCount }; })
        });
        var sig = sections.map(function (s) {
            return s.key + ':' + s.unitCount;
        }).join('|');

        if (!force && sig === _lessonsBulkUiState.sig) return;
        _lessonsBulkUiState.sig = sig;
        _lessonsBulkUiState.sections = sections;
        renderLessonsBulkSectionList(rootEl, sections);

        if (!sections.length) {
            if (isLegacy && _lessonsLegacyApiSectionsCache.loading) {
                setLessonsBulkStatus(rootEl, 'Scanning full content tree for section folders...', 'work');
            } else if (isLegacy) {
                setLessonsBulkStatus(rootEl, 'No section folders found in the content tree yet.', '');
            } else {
                setLessonsBulkStatus(rootEl, 'Open/expand the content tree to detect folders.', '');
            }
        } else if (!_lessonsBulkUiState.selectedKeys.size) {
            setLessonsBulkStatus(rootEl, 'Select folders and click "Download selected".', '');
        }

        // Topic-count prefetch is intentionally disabled for legacy fallback paths.
    }

    function getLessonsBulkApi() {
        try { return globalThis.DTUAfterDarkLessonsBulkUi || null; } catch (e0) { return null; }
    }

    function getLessonsBulkStateRefs() {
        return {
            uiState: _lessonsBulkUiState,
            urlNameHints: _lessonsBulkUrlNameHints,
            legacyApiSectionsCache: _lessonsLegacyApiSectionsCache,
            legacyModuleStructureCache: _lessonsLegacyModuleStructureCache,
            legacyBackgroundResolveState: _lessonsLegacyBackgroundResolveState
        };
    }

    function resetLessonsBulkState() {
        _lessonsBulkUiState = {
            sections: [],
            selectedKeys: new Set(),
            sig: '',
            running: false,
            lastRefreshAt: 0,
            activeDoc: null,
            lastLegacyExpandAt: 0
        };
        _lessonsBulkUrlNameHints = new Map();
        _lessonsLegacyApiSectionsCache = {
            orgUnitId: '',
            sections: [],
            loading: false,
            promise: null,
            ts: 0,
            lastAttemptTs: 0,
            source: ''
        };
        _lessonsLegacyModuleStructureCache = new Map();
        _lessonsLegacyBackgroundResolveState = {
            orgUnitId: '',
            running: false,
            token: 0,
            resolvedKeys: new Set()
        };
    }

    function removeLessonsBulkDownloadControl() {
        var docs = getLessonsCandidateDocuments(document);
        docs.forEach(function (doc) {
            var roots = [];
            try { roots = deepQueryAll('#' + LESSONS_BULK_ROOT_ID, doc); } catch (e0) { roots = []; }
            roots.forEach(function (root) {
                if (root && root.remove) root.remove();
            });
            var styles = [];
            try { styles = deepQueryAll('#' + LESSONS_BULK_STYLE_ID, doc); } catch (e1) { styles = []; }
            styles.forEach(function (styleEl) {
                if (styleEl && styleEl.remove) styleEl.remove();
            });
        });
        resetLessonsBulkState();
    }

    function cleanupLessonsBulkOutsideScope(scopeDoc) {
        var targetDoc = scopeDoc || getLessonsRuntimeDocument(document);
        var docs = getLessonsCandidateDocuments(targetDoc);
        docs.forEach(function (doc) {
            if (!doc || doc === targetDoc) return;
            var roots = [];
            try { roots = deepQueryAll('#' + LESSONS_BULK_ROOT_ID, doc); } catch (e0) { roots = []; }
            roots.forEach(function (root) {
                try { root.remove(); } catch (e1) { }
            });
            var styles = [];
            try { styles = deepQueryAll('#' + LESSONS_BULK_STYLE_ID, doc); } catch (e2) { styles = []; }
            styles.forEach(function (styleEl) {
                try { styleEl.remove(); } catch (e3) { }
            });
        });
    }

    function insertLessonsBulkDownloadControl() {
        if (!isLessonsBulkDownloadEnabled()) {
            removeLessonsBulkDownloadControl();
            return;
        }
        if (!isTopWindow()) return;
        if (!isDTULearnLessonsPage()) {
            removeLessonsBulkDownloadControl();
            return;
        }

        var scopeDoc = getLessonsWorkingDocument(document);
        var uiState = getLessonsBulkStateRefs().uiState;
        if (uiState) uiState.activeDoc = scopeDoc;

        if (!hasModernLessonsTocStructure(scopeDoc)) {
            removeLessonsBulkDownloadControl();
            return;
        }

        cleanupLessonsBulkOutsideScope(scopeDoc);
        if (scopeDoc === document) {
            var hasNativeLessonsUi = false;
            try {
                hasNativeLessonsUi = !!scopeDoc.querySelector('.navigation-search, .navigation-tree, d2l-lessons-toc');
            } catch (eTop0) { hasNativeLessonsUi = false; }
            if (!hasNativeLessonsUi) {
                var staleTopRoot = null;
                try { staleTopRoot = scopeDoc.getElementById(LESSONS_BULK_ROOT_ID); } catch (eTop1) { staleTopRoot = null; }
                if (staleTopRoot && staleTopRoot.remove) staleTopRoot.remove();
                return;
            }
        }

        function scoreSearchAnchor(el) {
            if (!el || !el.isConnected) return -1;
            var score = 0;
            var navContainer = null;
            try { navContainer = el.closest('.navigation-container'); } catch (e0) { navContainer = null; }
            if (navContainer) score += 20;
            var navMenu = null;
            try { navMenu = el.closest('.navigation-menu'); } catch (e1) { navMenu = null; }
            if (navMenu) score += 10;
            try {
                var parent = el.parentElement;
                if (parent && parent.querySelector && parent.querySelector('d2l-lessons-toc.can-search-content, d2l-lessons-toc')) {
                    score += 35;
                }
            } catch (e2) { }
            try {
                if (el.querySelector && el.querySelector('d2l-input-search')) score += 8;
            } catch (e3) { }
            return score;
        }

        var searchEl = null;
        try { searchEl = scopeDoc.querySelector('.navigation-menu > .navigation-search'); } catch (eS0) { searchEl = null; }
        if (!searchEl) {
            try { searchEl = scopeDoc.querySelector('.navigation-search'); } catch (eS1) { searchEl = null; }
        }
        try {
            var found = deepQueryAll('.navigation-search', scopeDoc);
            if ((!searchEl) && found && found.length) {
                var bestScore = -1;
                for (var fi = 0; fi < found.length; fi++) {
                    var cand = found[fi];
                    var score = scoreSearchAnchor(cand);
                    try {
                        var rect = cand.getBoundingClientRect ? cand.getBoundingClientRect() : null;
                        if (rect && rect.width > 60 && rect.height > 20) score += 30;
                    } catch (eV0) { }
                    if (score > bestScore) {
                        bestScore = score;
                        searchEl = cand;
                    }
                }
                if (!searchEl) searchEl = found[0];
            }
        } catch (eFound) { }
        if (!searchEl) searchEl = scopeDoc.querySelector('.navigation-search');

        var anchorEl = searchEl;
        if (!anchorEl) {
            var tocHost = getLessonsTocHost(scopeDoc);
            if (tocHost) anchorEl = tocHost;
        }

        var mountParent = null;
        if (anchorEl && anchorEl.parentElement) {
            mountParent = anchorEl.parentElement;
        } else {
            try { mountParent = scopeDoc.querySelector('.navigation-menu'); } catch (eMp0) { mountParent = null; }
            if (!mountParent) {
                try { mountParent = scopeDoc.querySelector('.navigation-container'); } catch (eMp1) { mountParent = null; }
            }
            if (!mountParent) {
                try { mountParent = scopeDoc.querySelector('.main-wrapper, .d2l-page-main, main'); } catch (eMp2) { mountParent = null; }
            }
        }
        if (!mountParent) return;

        var contextRoot = null;
        try { contextRoot = mountParent.getRootNode ? mountParent.getRootNode() : null; } catch (eR0) { contextRoot = null; }
        if (!contextRoot) contextRoot = scopeDoc;

        ensureLessonsBulkDownloadStyles(contextRoot && contextRoot.nodeType === 11 ? contextRoot : (scopeDoc.head || scopeDoc.documentElement || document.head || document.documentElement));

        var root = null;
        try {
            if (contextRoot && contextRoot.querySelector) root = contextRoot.querySelector('#' + LESSONS_BULK_ROOT_ID);
        } catch (eRoot) {
            root = null;
        }
        if (!root && contextRoot === scopeDoc) root = scopeDoc.getElementById(LESSONS_BULK_ROOT_ID);
        if (!root) {
            root = scopeDoc.createElement('div');
            markExt(root);
            root.id = LESSONS_BULK_ROOT_ID;
            root.className = 'dtu-lbd-root';

            var toggle = scopeDoc.createElement('button');
            markExt(toggle);
            toggle.type = 'button';
            toggle.className = 'dtu-lbd-toggle';
            toggle.textContent = 'Download content';

            var panel = scopeDoc.createElement('div');
            markExt(panel);
            panel.className = 'dtu-lbd-panel';

            var hint = scopeDoc.createElement('div');
            markExt(hint);
            hint.className = 'dtu-lbd-hint';
            hint.textContent = 'Pick section folders from the tree, then download all child files.';

            var list = scopeDoc.createElement('div');
            markExt(list);
            list.className = 'dtu-lbd-list';

            var actions = scopeDoc.createElement('div');
            markExt(actions);
            actions.className = 'dtu-lbd-actions';

            var allBtn = scopeDoc.createElement('button');
            markExt(allBtn);
            allBtn.type = 'button';
            allBtn.className = 'dtu-lbd-mini';
            allBtn.textContent = 'All';
            allBtn.addEventListener('click', function () {
                var nextUiState = getLessonsBulkStateRefs().uiState;
                root.querySelectorAll('.dtu-lbd-list input[type="checkbox"][data-section-key]').forEach(function (cb) {
                    cb.checked = true;
                    if (nextUiState && nextUiState.selectedKeys) {
                        nextUiState.selectedKeys.add(cb.getAttribute('data-section-key'));
                    }
                });
                updateLessonsBulkRunButton(root);
            });

            var noneBtn = scopeDoc.createElement('button');
            markExt(noneBtn);
            noneBtn.type = 'button';
            noneBtn.className = 'dtu-lbd-mini';
            noneBtn.textContent = 'None';
            noneBtn.addEventListener('click', function () {
                var nextUiState = getLessonsBulkStateRefs().uiState;
                root.querySelectorAll('.dtu-lbd-list input[type="checkbox"][data-section-key]').forEach(function (cb) {
                    cb.checked = false;
                });
                if (nextUiState && nextUiState.selectedKeys) {
                    nextUiState.selectedKeys.clear();
                }
                updateLessonsBulkRunButton(root);
            });

            var runBtn = scopeDoc.createElement('button');
            markExt(runBtn);
            runBtn.type = 'button';
            runBtn.className = 'dtu-lbd-run';
            runBtn.textContent = 'Download selected';
            runBtn.addEventListener('click', function () {
                runLessonsBulkDownload(root);
            });

            var status = scopeDoc.createElement('div');
            markExt(status);
            status.className = 'dtu-lbd-status';

            actions.appendChild(allBtn);
            actions.appendChild(noneBtn);
            actions.appendChild(runBtn);
            panel.appendChild(hint);
            panel.appendChild(list);
            panel.appendChild(actions);
            panel.appendChild(status);

            toggle.addEventListener('click', function () {
                var isOpen = root.classList.contains('dtu-open');
                if (isOpen) root.classList.remove('dtu-open');
                else root.classList.add('dtu-open');
                if (!isOpen) {
                    var openDoc = (root && root.ownerDocument) ? root.ownerDocument : scopeDoc;
                    if (isLegacyLessonsTreeDocument(openDoc)) maybeStartLegacyApiSectionsHydration(openDoc, root);
                    refreshLessonsBulkDownloadUi(root, true);
                }
            });

            root.appendChild(toggle);
            root.appendChild(panel);
        }

        var insertAfterEl = null;
        if (anchorEl && anchorEl.parentElement === mountParent) insertAfterEl = anchorEl;
        if (!insertAfterEl) {
            try { insertAfterEl = mountParent.querySelector('.navigation-search'); } catch (eIns0) { insertAfterEl = null; }
        }
        if (!insertAfterEl) {
            try { insertAfterEl = scopeDoc.querySelector('.navigation-menu > .navigation-search, .navigation-search'); } catch (eIns1) { insertAfterEl = null; }
        }

        if (insertAfterEl) {
            var targetParent = insertAfterEl.parentElement || mountParent;
            if (root.parentElement !== targetParent) {
                targetParent.insertBefore(root, insertAfterEl.nextSibling);
            } else if (insertAfterEl.nextSibling !== root) {
                targetParent.insertBefore(root, insertAfterEl.nextSibling);
            }
        } else if (root.parentElement !== mountParent) {
            mountParent.insertBefore(root, mountParent.firstChild);
        }

        var shouldRefresh = false;
        try { shouldRefresh = root.classList.contains('dtu-open'); } catch (eRf0) { shouldRefresh = false; }
        var latestUiState = getLessonsBulkStateRefs().uiState;
        if (!latestUiState || !latestUiState.sections || !latestUiState.sections.length) shouldRefresh = true;
        if (shouldRefresh) refreshLessonsBulkDownloadUi(root, false);
    }

    function runLessonsBulkDownloadChecks() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!isLessonsBulkDownloadEnabled()) {
            removeLessonsBulkDownloadControl();
            return;
        }
        if (isDTULearnLessonsPage()) insertLessonsBulkDownloadControl();
        else removeLessonsBulkDownloadControl();
    }

    try {
        globalThis.DTUAfterDarkLessonsBulkUi = {
            insertLessonsBulkDownloadControl: insertLessonsBulkDownloadControl,
            runLessonsBulkDownloadChecks: runLessonsBulkDownloadChecks
        };
    } catch (eExpose) { }

    if (window.location.hostname === 'learn.inside.dtu.dk') {
        try { runLessonsBulkDownloadChecks(); } catch (eInit) { }
    }
})();
