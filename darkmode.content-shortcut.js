(function () {
    'use strict';

    var CONTENT_SHORTCUT_OVERRIDES_KEY = 'dtuAfterDarkContentShortcutOverridesV1';
    var contentShortcutOverrides = readContentShortcutOverridesFromLocalStorage();
    var contentShortcutOverridesStorageSubscribed = false;
    var contentShortcutsLastEnabled = null;
    var contentButtonBootstrapTimer = null;

    function getDeps() {
        try { return globalThis.DTUAfterDarkContentShortcutDeps || null; } catch (e0) { return null; }
    }

    function normalizeWhitespace(value) {
        var deps = getDeps();
        if (deps && typeof deps.normalizeWhitespace === 'function') {
            return deps.normalizeWhitespace(value);
        }
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function storageLocalGet(defaults, cb) {
        var deps = getDeps();
        if (deps && typeof deps.storageLocalGet === 'function') {
            deps.storageLocalGet(defaults, cb);
            return;
        }
        if (cb) cb(defaults || {});
    }

    function storageLocalSet(values) {
        var deps = getDeps();
        if (deps && typeof deps.storageLocalSet === 'function') {
            deps.storageLocalSet(values);
        }
    }

    function isTopWindow() {
        var deps = getDeps();
        return !!(deps && typeof deps.isTopWindow === 'function' && deps.isTopWindow());
    }

    function isDTULearnHomepage() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDTULearnHomepage === 'function' && deps.isDTULearnHomepage());
    }

    function isContentShortcutEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isContentShortcutEnabled === 'function' && deps.isContentShortcutEnabled());
    }

    function isDarkModeEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDarkModeEnabled === 'function' && deps.isDarkModeEnabled());
    }

    function markExt(el) {
        var deps = getDeps();
        if (el && deps && typeof deps.markExt === 'function') deps.markExt(el);
        return el;
    }

    function deepQueryAll(selector, root) {
        var deps = getDeps();
        if (deps && typeof deps.deepQueryAll === 'function') {
            return deps.deepQueryAll(selector, root);
        }
        return [];
    }

    function normalizeContentShortcutCourseId(raw) {
        var value = normalizeWhitespace(String(raw || ''));
        if (!value) return '';

        if (/^\d+$/.test(value)) return value;

        var parsed = parseCourseIdFromString(value);
        if (parsed) return String(parsed);

        try {
            var decoded = decodeURIComponent(value);
            if (decoded && decoded !== value) {
                parsed = parseCourseIdFromString(decoded);
                if (parsed) return String(parsed);
            }
        } catch (e0) { }

        return '';
    }

    function isLikelyDtuCourseCodeInput(rawInput, parsedId) {
        var raw = String(rawInput || '').trim();
        var id = String(parsedId || '').trim();
        if (!raw || !id) return false;
        return /^\d{5}$/.test(raw) && raw === id;
    }

    function normalizeContentShortcutTarget(raw) {
        var value = normalizeWhitespace(String(raw || ''));
        if (!value) return '';

        if (/^\/\//.test(value)) return null;
        if (/^\/.+/.test(value)) return value;
        if (/^[^/].*/.test(value) && /^d2l\//i.test(value)) return '/' + value;

        try {
            var parsed = new URL(value, location.origin);
            if (parsed.origin !== location.origin) return null;
            return (parsed.pathname || '/') + (parsed.search || '') + (parsed.hash || '');
        } catch (e) {
            return null;
        }
    }

    function sanitizeContentShortcutOverridesMap(input) {
        var out = {};
        if (!input || typeof input !== 'object') return out;
        Object.keys(input).forEach(function (key) {
            var courseId = normalizeContentShortcutCourseId(key);
            if (!courseId) return;
            var href = normalizeContentShortcutTarget(input[key]);
            if (!href) return;
            out[courseId] = href;
        });
        return out;
    }

    function readContentShortcutOverridesFromLocalStorage() {
        try {
            var raw = localStorage.getItem(CONTENT_SHORTCUT_OVERRIDES_KEY);
            if (!raw) return {};
            return sanitizeContentShortcutOverridesMap(JSON.parse(raw));
        } catch (e) {
            return {};
        }
    }

    function persistContentShortcutOverrides(opts) {
        var clean = sanitizeContentShortcutOverridesMap(contentShortcutOverrides);
        contentShortcutOverrides = clean;
        try {
            localStorage.setItem(CONTENT_SHORTCUT_OVERRIDES_KEY, JSON.stringify(clean));
        } catch (e0) { }
        if (opts && opts.noStorage) return;
        storageLocalSet({ [CONTENT_SHORTCUT_OVERRIDES_KEY]: clean });
    }

    function getContentShortcutOverridesMap() {
        return Object.assign({}, contentShortcutOverrides || {});
    }

    function getContentShortcutOverride(courseId) {
        var key = normalizeContentShortcutCourseId(courseId);
        if (!key) return '';
        return (contentShortcutOverrides && contentShortcutOverrides[key]) || '';
    }

    function setContentShortcutOverride(courseId, href, opts) {
        var key = normalizeContentShortcutCourseId(courseId);
        if (!key) return false;

        var next = normalizeContentShortcutTarget(href);
        if (href && !next) return false;

        var map = getContentShortcutOverridesMap();
        if (next) map[key] = next;
        else delete map[key];

        contentShortcutOverrides = map;
        persistContentShortcutOverrides(opts);
        return true;
    }

    function clearAllContentShortcutOverrides(opts) {
        contentShortcutOverrides = {};
        persistContentShortcutOverrides(opts);
    }

    function loadContentShortcutOverrides(cb) {
        storageLocalGet({ [CONTENT_SHORTCUT_OVERRIDES_KEY]: contentShortcutOverrides }, function (result) {
            var raw = result ? result[CONTENT_SHORTCUT_OVERRIDES_KEY] : null;
            contentShortcutOverrides = sanitizeContentShortcutOverridesMap(raw);
            persistContentShortcutOverrides({ noStorage: true });
            if (cb) cb(getContentShortcutOverridesMap());
        });
    }

    function subscribeContentShortcutOverrideStorageChanges() {
        if (contentShortcutOverridesStorageSubscribed) return;
        contentShortcutOverridesStorageSubscribed = true;

        var onChanged = function (changes, areaName) {
            if (areaName && areaName !== 'local') return;
            if (!changes || !changes[CONTENT_SHORTCUT_OVERRIDES_KEY]) return;

            var nextRaw = changes[CONTENT_SHORTCUT_OVERRIDES_KEY]
                ? changes[CONTENT_SHORTCUT_OVERRIDES_KEY].newValue
                : null;
            contentShortcutOverrides = sanitizeContentShortcutOverridesMap(nextRaw);
            persistContentShortcutOverrides({ noStorage: true });

            if (!isTopWindow()) return;
            if (!isDTULearnHomepage()) return;
            if (!isContentShortcutEnabled()) return;
            insertContentButtons();
        };

        try {
            if (typeof browser !== 'undefined' && browser.storage && browser.storage.onChanged) {
                browser.storage.onChanged.addListener(onChanged);
                return;
            }
        } catch (e0) { }
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
                chrome.storage.onChanged.addListener(onChanged);
            }
        } catch (e1) { }
    }

    function isContentShortcutEditGesture(e) {
        return !!(e && (e.ctrlKey || e.metaKey) && e.shiftKey);
    }

    function applyContentShortcutTargetToButton(btn, courseId, defaultHref) {
        if (!btn) return false;
        var courseKey = normalizeContentShortcutCourseId(courseId);
        var fallback = normalizeContentShortcutTarget(defaultHref) || '';
        if (!fallback) return false;

        var custom = courseKey ? getContentShortcutOverride(courseKey) : '';
        var finalHref = custom || fallback;

        btn.href = finalHref;
        btn.setAttribute('data-dtu-course-id', courseKey || '');
        btn.setAttribute('data-dtu-default-href', fallback);
        btn.setAttribute('data-dtu-current-href', finalHref);
        btn.setAttribute('data-dtu-custom-href', custom || '');

        var title = custom ? 'Go to Content (custom link)' : 'Go to Content';
        title += ' | Ctrl/Cmd+Shift+Click to edit';
        btn.title = title;
        btn.setAttribute('aria-label', title);
        return true;
    }

    function promptEditContentShortcutFromButton(btn) {
        if (!btn) return;
        var courseId = normalizeContentShortcutCourseId(btn.getAttribute('data-dtu-course-id'));
        var defaultHref = normalizeContentShortcutTarget(btn.getAttribute('data-dtu-default-href')) || '';
        if (!courseId || !defaultHref) {
            alert('Could not detect the course ID for this card, so no custom link can be saved yet.');
            return;
        }

        var currentCustom = getContentShortcutOverride(courseId);
        var currentTarget = currentCustom || defaultHref;
        var msg = 'Set custom "Go to Content" link for this course (ID ' + courseId + ').\n'
            + 'Use a relative path (example: /d2l/home/' + courseId + ') or full learn.inside.dtu.dk URL.\n'
            + 'Leave empty to reset to default.\n\n'
            + 'Default: ' + defaultHref + '\n'
            + 'Current: ' + currentTarget;

        var input = prompt(msg, currentCustom || currentTarget);
        if (input === null) return;

        var trimmed = String(input || '').trim();
        if (!trimmed) {
            setContentShortcutOverride(courseId, '', null);
            insertContentButtons();
            return;
        }

        var normalized = normalizeContentShortcutTarget(trimmed);
        if (!normalized) {
            alert('Invalid link. Use a relative path (starting with /) or a full learn.inside.dtu.dk URL.');
            return;
        }

        if (normalized === defaultHref) {
            setContentShortcutOverride(courseId, '', null);
        } else {
            setContentShortcutOverride(courseId, normalized, null);
        }

        insertContentButtons();
    }

    function promptForCourseId(defaultValue) {
        var input = prompt(
            'Brightspace Org Unit ID or course URL:\n'
            + '- Paste URL, e.g. https://learn.inside.dtu.dk/d2l/home/242098\n'
            + '- or paste just the Org Unit ID, e.g. 242098\n\n'
            + 'Do NOT use DTU course code (e.g. 22050).',
            defaultValue || ''
        );
        if (input === null) return null;
        var id = normalizeContentShortcutCourseId(input);
        if (!id) return '';
        if (isLikelyDtuCourseCodeInput(input, id)) {
            var proceed = confirm(
                '"' + id + '" looks like a DTU course code, not a Brightspace Org Unit ID.\n'
                + 'If unsure, cancel and paste the course URL from Learn to auto-detect the correct ID.\n\n'
                + 'Use "' + id + '" anyway?'
            );
            if (!proceed) return null;
        }
        return id;
    }

    function promptForContentShortcutTarget(defaultValue) {
        var input = prompt(
            'Custom link for this course:\n'
            + '- Relative path, e.g. /d2l/home/123456\n'
            + '- or full learn.inside.dtu.dk URL\n'
            + '(Leave empty to cancel)',
            defaultValue || ''
        );
        if (input === null) return null;
        var trimmed = String(input || '').trim();
        if (!trimmed) return '';
        var normalized = normalizeContentShortcutTarget(trimmed);
        if (!normalized) {
            alert('Invalid link. Use a relative path (starting with /) or a full learn.inside.dtu.dk URL.');
            return null;
        }
        return normalized || null;
    }

    function showContentShortcutOverridesModal() {
        if (!isTopWindow()) return;

        var existing = document.querySelector('.dtu-content-shortcut-overrides-modal');
        if (existing) existing.remove();

        var palette = isDarkModeEnabled()
            ? {
                bg: 'rgba(30,30,30,0.94)',
                text: '#e0e0e0',
                heading: '#ffffff',
                muted: '#9aa0a6',
                border: '#404040',
                panel: '#1f1f1f'
            }
            : {
                bg: 'rgba(255,255,255,0.96)',
                text: '#1f2937',
                heading: '#111827',
                muted: '#6b7280',
                border: '#d1d5db',
                panel: '#f9fafb'
            };

        var overlay = document.createElement('div');
        markExt(overlay);
        overlay.className = 'dtu-content-shortcut-overrides-modal';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000001;display:flex;align-items:center;justify-content:center;'
            + 'background:transparent !important;background-color:transparent !important;'
            + 'backdrop-filter:blur(4px) !important;-webkit-backdrop-filter:blur(4px) !important;'
            + 'opacity:0;transition:opacity .2s ease;';

        var modal = document.createElement('div');
        markExt(modal);
        modal.style.cssText = 'width:min(760px,92vw);max-height:82vh;overflow:auto;'
            + 'border-radius:14px;padding:22px 22px 16px;background:' + palette.bg + ';'
            + 'color:' + palette.text + ';border:1px solid ' + palette.border + ';'
            + 'box-shadow:0 18px 52px rgba(0,0,0,0.45);font-family:sans-serif;';

        function closeModal() {
            overlay.style.opacity = '0';
            setTimeout(function () { try { overlay.remove(); } catch (e) { } }, 150);
        }

        function buttonStyle(kind) {
            if (kind === 'danger') {
                return 'border:1px solid #7f1d1d;background:rgba(127,29,29,0.12);color:#ef9a9a;';
            }
            if (kind === 'primary') {
                return 'border:1px solid var(--dtu-ad-accent-border);background:var(--dtu-ad-accent);color:#fff;';
            }
            return 'border:1px solid ' + palette.border + ';background:transparent;color:' + palette.text + ';';
        }

        function makeBtn(label, kind) {
            var btn = document.createElement('button');
            markExt(btn);
            btn.type = 'button';
            btn.textContent = label;
            btn.style.cssText = 'padding:7px 11px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;'
                + buttonStyle(kind);
            return btn;
        }

        function render() {
            while (modal.firstChild) modal.removeChild(modal.firstChild);

            var title = document.createElement('h2');
            markExt(title);
            title.textContent = 'Content Shortcut Links';
            title.style.cssText = 'margin:0 0 6px;font-size:22px;font-weight:700;color:' + palette.heading + ';';
            modal.appendChild(title);

            var intro = document.createElement('p');
            markExt(intro);
            intro.style.cssText = 'margin:0 0 14px;font-size:13px;line-height:1.45;color:' + palette.muted + ';';
            intro.textContent = 'Quick edit on dashboard: hold Ctrl/Cmd+Shift and click a course Content button. '
                + 'Use this manager to review, add, or remove per-course overrides. '
                + 'Tip: Add Override accepts a Learn course URL and auto-detects the Brightspace Org Unit ID (do not use DTU course code like 22050).';
            modal.appendChild(intro);

            var listWrap = document.createElement('div');
            markExt(listWrap);
            listWrap.style.cssText = 'border:1px solid ' + palette.border + ';border-radius:10px;overflow:hidden;';

            var rows = getContentShortcutOverridesMap();
            var keys = Object.keys(rows).sort(function (a, b) { return Number(a) - Number(b); });

            if (!keys.length) {
                var empty = document.createElement('div');
                markExt(empty);
                empty.style.cssText = 'padding:14px;font-size:13px;color:' + palette.muted + ';background:' + palette.panel + ';';
                empty.textContent = 'No custom links saved yet.';
                listWrap.appendChild(empty);
            } else {
                keys.forEach(function (courseId, idx) {
                    var row = document.createElement('div');
                    markExt(row);
                    row.style.cssText = 'display:flex;gap:10px;align-items:center;justify-content:space-between;'
                        + 'padding:10px 12px;background:' + (idx % 2 ? palette.panel : 'transparent') + ';'
                        + (idx < keys.length - 1 ? 'border-bottom:1px solid ' + palette.border + ';' : '');

                    var left = document.createElement('div');
                    markExt(left);
                    left.style.cssText = 'min-width:0;flex:1;';

                    var idEl = document.createElement('div');
                    markExt(idEl);
                    idEl.style.cssText = 'font-size:12px;font-weight:700;color:' + palette.heading + ';';
                    idEl.textContent = 'Org Unit ' + courseId;

                    var hrefEl = document.createElement('div');
                    markExt(hrefEl);
                    hrefEl.style.cssText = 'font-size:12px;line-height:1.3;color:' + palette.muted
                        + ';overflow-wrap:anywhere;word-break:break-word;';
                    hrefEl.textContent = rows[courseId];

                    left.appendChild(idEl);
                    left.appendChild(hrefEl);

                    var actions = document.createElement('div');
                    markExt(actions);
                    actions.style.cssText = 'display:flex;gap:8px;flex-shrink:0;';

                    var editBtn = makeBtn('Edit', 'secondary');
                    editBtn.addEventListener('click', function () {
                        var nextHref = promptForContentShortcutTarget(rows[courseId]);
                        if (nextHref === null) return;
                        if (nextHref === '') {
                            setContentShortcutOverride(courseId, '', null);
                        } else {
                            setContentShortcutOverride(courseId, nextHref, null);
                        }
                        insertContentButtons();
                        render();
                    });

                    var removeBtn = makeBtn('Remove', 'danger');
                    removeBtn.addEventListener('click', function () {
                        setContentShortcutOverride(courseId, '', null);
                        insertContentButtons();
                        render();
                    });

                    actions.appendChild(editBtn);
                    actions.appendChild(removeBtn);
                    row.appendChild(left);
                    row.appendChild(actions);
                    listWrap.appendChild(row);
                });
            }

            modal.appendChild(listWrap);

            var footer = document.createElement('div');
            markExt(footer);
            footer.style.cssText = 'display:flex;justify-content:space-between;gap:10px;margin-top:14px;flex-wrap:wrap;';

            var leftBtns = document.createElement('div');
            markExt(leftBtns);
            leftBtns.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

            var addBtn = makeBtn('Add Override', 'primary');
            addBtn.addEventListener('click', function () {
                var courseId = promptForCourseId('');
                if (courseId === null) return;
                if (!courseId) {
                    alert('Invalid input. Paste a Learn course URL or Brightspace Org Unit ID (numbers only).');
                    return;
                }
                var href = promptForContentShortcutTarget('/d2l/home/' + courseId);
                if (href === null) return;
                if (!href) return;
                setContentShortcutOverride(courseId, href, null);
                insertContentButtons();
                render();
            });

            var clearBtn = makeBtn('Clear All', 'danger');
            clearBtn.addEventListener('click', function () {
                var hasAny = Object.keys(getContentShortcutOverridesMap()).length > 0;
                if (!hasAny) return;
                if (!confirm('Clear all custom content shortcut links?')) return;
                clearAllContentShortcutOverrides(null);
                insertContentButtons();
                render();
            });

            leftBtns.appendChild(addBtn);
            leftBtns.appendChild(clearBtn);

            var closeBtn = makeBtn('Close', 'secondary');
            closeBtn.addEventListener('click', closeModal);

            footer.appendChild(leftBtns);
            footer.appendChild(closeBtn);
            modal.appendChild(footer);
        }

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal();
        });

        render();
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        requestAnimationFrame(function () { overlay.style.opacity = '1'; });
    }

    var contentBtnShadowCSS = `
        a.dtu-dark-content-btn,
        a.dtu-dark-content-btn:link,
        a.dtu-dark-content-btn:visited {
            position: absolute !important;
            bottom: 6px !important;
            right: 6px !important;
            transform: translate(179px, 60px) !important;
            min-width: 52px !important;
            min-height: 42px !important;
            width: 52px !important;
            height: 42px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 6px !important;
            background-color: #2d2d2d !important;
            color: #ffffff !important;
            font-size: 18px !important;
            font-family: sans-serif !important;
            text-decoration: none !important;
            cursor: pointer !important;
            z-index: 5 !important;
            border: none !important;
            box-sizing: border-box !important;
            line-height: 1 !important;
            transition: opacity 0.2s, background-color 0.2s !important;
            padding: 0 !important;
            margin: 0 !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        :host(:hover) a.dtu-dark-content-btn,
        .d2l-card-container:hover a.dtu-dark-content-btn,
        .d2l-card-header:hover a.dtu-dark-content-btn {
            opacity: 1 !important;
            pointer-events: auto !important;
        }
        a.dtu-dark-content-btn:hover {
            background-color: rgba(0, 0, 0, 0.85) !important;
        }
        a.dtu-dark-content-btn .dtu-content-shortcut-icon {
            width: 20px !important;
            height: 20px !important;
            display: block !important;
            color: currentColor !important;
            fill: none !important;
            stroke: currentColor !important;
            stroke-width: 1.8 !important;
            stroke-linecap: round !important;
            stroke-linejoin: round !important;
            pointer-events: none !important;
        }
    `;

    function parseCourseIdFromString(str) {
        if (!str) return null;
        var patterns = [
            /\/d2l\/home\/(\d+)/i,
            /\/d2l\/le\/lessons\/(\d+)/i,
            /\/d2l\/lp\/navbars\/(\d+)/i,
            /[?&](?:ou|orgUnitId|courseOfferingId|offeringId)=(\d+)/i,
            /\/org(?:units?|Units?)\/(\d+)/i,
            /(?:orgUnitId|courseOfferingId|offeringId)[=:"\s]+(\d+)/i
        ];
        for (var i = 0; i < patterns.length; i++) {
            var match = str.match(patterns[i]);
            if (match && match[1]) return match[1];
        }
        return null;
    }

    function normalizeD2LPath(urlStr) {
        if (!urlStr) return null;
        try {
            var parsed = new URL(urlStr, location.origin);
            if (parsed.pathname && parsed.pathname.startsWith('/d2l/')) {
                return parsed.pathname + parsed.search + parsed.hash;
            }
        } catch (e) { }
        if (/^\/d2l\//.test(urlStr)) return urlStr;
        return null;
    }

    function extractCourseId(ec, card, roots) {
        var candidates = [];
        if (ec) {
            candidates.push(ec.getAttribute('href') || '');
            if (ec.attributes) {
                for (var i = 0; i < ec.attributes.length; i++) {
                    var attr = ec.attributes[i];
                    if (/(ou|org|course|offering)/i.test(attr.name)) {
                        candidates.push(attr.value || '');
                    }
                }
            }
        }
        if (card) {
            candidates.push(card.getAttribute('href') || '');
            if (card.attributes) {
                for (var j = 0; j < card.attributes.length; j++) {
                    var cardAttr = card.attributes[j];
                    if (/(ou|org|course|offering)/i.test(cardAttr.name)) {
                        candidates.push(cardAttr.value || '');
                    }
                }
            }
        }
        roots.forEach(function (root) {
            if (!root || !root.querySelectorAll) return;
            root.querySelectorAll('[href]').forEach(function (linkEl) {
                candidates.push(linkEl.getAttribute('href') || '');
            });
        });
        for (var k = 0; k < candidates.length; k++) {
            var id = parseCourseIdFromString(candidates[k]);
            if (id) return id;
        }
        return null;
    }

    function extractFallbackHref(ec, card, roots) {
        var candidates = [];
        if (card) candidates.push(card.getAttribute('href') || '');
        if (ec) candidates.push(ec.getAttribute('href') || '');
        roots.forEach(function (root) {
            if (!root || !root.querySelectorAll) return;
            root.querySelectorAll('[href]').forEach(function (linkEl) {
                candidates.push(linkEl.getAttribute('href') || '');
            });
        });
        for (var i = 0; i < candidates.length; i++) {
            var normalized = normalizeD2LPath(candidates[i]);
            if (normalized) return normalized;
        }
        return null;
    }

    function setContentShortcutButtonIcon(btn) {
        if (!btn) return;
        if (btn.querySelector && btn.querySelector('.dtu-content-shortcut-icon')) return;
        while (btn.firstChild) btn.removeChild(btn.firstChild);

        var svgNs = 'http://www.w3.org/2000/svg';
        var icon = document.createElementNS(svgNs, 'svg');
        icon.setAttribute('class', 'dtu-content-shortcut-icon');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('aria-hidden', 'true');
        icon.setAttribute('focusable', 'false');

        var pages = document.createElementNS(svgNs, 'path');
        pages.setAttribute('d', 'M3.5 4.5h5.7c1.45 0 2.8.7 3.8 1.9 1-1.2 2.35-1.9 3.8-1.9h5.7v14h-5.7c-1.45 0-2.8.7-3.8 1.9-1-1.2-2.35-1.9-3.8-1.9H3.5z');
        var spine = document.createElementNS(svgNs, 'path');
        spine.setAttribute('d', 'M12.5 6.4v14');

        icon.appendChild(pages);
        icon.appendChild(spine);
        btn.appendChild(icon);
    }

    function insertContentButtons(rootNode) {
        if (!isTopWindow()) return;
        if (!isDTULearnHomepage()) return;
        if (!isContentShortcutEnabled()) {
            if (contentShortcutsLastEnabled !== false) {
                contentShortcutsLastEnabled = false;
                removeContentButtons();
            }
            return;
        }
        contentShortcutsLastEnabled = true;

        var scanRoot = rootNode && rootNode.nodeType === 1 ? rootNode : document.body;
        if (!scanRoot) return;

        var enrollmentCards = deepQueryAll('d2l-enrollment-card, d2l-my-courses-enrollment-card', scanRoot);
        enrollmentCards.forEach(function (ec) {
            var ecShadow = ec.shadowRoot;
            if (!ecShadow) return;

            var card = ecShadow.querySelector('d2l-card[href*="/d2l/home/"], d2l-card[href], d2l-card');
            var cardShadow = card && card.shadowRoot ? card.shadowRoot : null;
            var styleRoot = cardShadow || ecShadow;

            if (!styleRoot.querySelector('#dtu-content-btn-styles')) {
                var btnStyle = document.createElement('style');
                btnStyle.id = 'dtu-content-btn-styles';
                btnStyle.textContent = contentBtnShadowCSS;
                styleRoot.appendChild(btnStyle);
            }

            var header = styleRoot.querySelector('.d2l-card-header, .d2l-enrollment-card-image-container, [slot="header"]');
            var container = header || styleRoot.querySelector('.d2l-card-container, .d2l-enrollment-card-content, .d2l-enrollment-card-content-flex, .d2l-enrollment-card-container');
            if (!container) return;
            container.style.setProperty('position', 'relative', 'important');

            var roots = [styleRoot, ecShadow];
            var courseId = extractCourseId(ec, card, roots);
            var fallbackHref = extractFallbackHref(ec, card, roots);
            if (!courseId && !fallbackHref) return;
            var defaultHref = courseId ? ('/d2l/le/lessons/' + courseId) : fallbackHref;

            var existingBtn = container.querySelector('.dtu-dark-content-btn');
            if (existingBtn) {
                setContentShortcutButtonIcon(existingBtn);
                if (!applyContentShortcutTargetToButton(existingBtn, courseId, defaultHref)) {
                    try { existingBtn.remove(); } catch (eRm0) { }
                }
                return;
            }

            var btn = document.createElement('a');
            btn.className = 'dtu-dark-content-btn';
            setContentShortcutButtonIcon(btn);
            if (!applyContentShortcutTargetToButton(btn, courseId, defaultHref)) return;
            btn.addEventListener('click', function (e) {
                if (isContentShortcutEditGesture(e)) {
                    try { e.preventDefault(); } catch (e0) { }
                    try { e.stopPropagation(); } catch (e1) { }
                    promptEditContentShortcutFromButton(btn);
                    return;
                }
                try { e.stopPropagation(); } catch (e2) { }
            });

            container.appendChild(btn);
        });
    }

    function startContentButtonBootstrap() {
        if (!isTopWindow() || !isDTULearnHomepage()) return;
        if (contentButtonBootstrapTimer) return;

        var attempts = 0;
        contentButtonBootstrapTimer = setInterval(function () {
            if (!isDTULearnHomepage()) {
                clearInterval(contentButtonBootstrapTimer);
                contentButtonBootstrapTimer = null;
                return;
            }
            if (!isContentShortcutEnabled()) {
                removeContentButtons();
                clearInterval(contentButtonBootstrapTimer);
                contentButtonBootstrapTimer = null;
                return;
            }
            insertContentButtons();
            attempts++;
            if (deepQueryAll('.dtu-dark-content-btn', document).length || attempts >= 60) {
                clearInterval(contentButtonBootstrapTimer);
                contentButtonBootstrapTimer = null;
            }
        }, 500);
    }

    function removeContentButtons(rootNode) {
        if (!isTopWindow()) return;
        var scanRoot = rootNode && rootNode.nodeType === 1 ? rootNode : document.body;
        if (!scanRoot) return;

        deepQueryAll('.dtu-dark-content-btn', scanRoot).forEach(function (btn) {
            try { btn.remove(); } catch (e) { }
        });
        deepQueryAll('#dtu-content-btn-styles', scanRoot).forEach(function (styleEl) {
            try { styleEl.remove(); } catch (e) { }
        });
    }

    try {
        globalThis.DTUAfterDarkContentShortcutUi = {
            insertContentButtons: insertContentButtons,
            startContentButtonBootstrap: startContentButtonBootstrap,
            removeContentButtons: removeContentButtons,
            showContentShortcutOverridesModal: showContentShortcutOverridesModal
        };
    } catch (eExport) { }

    if (isContentShortcutEnabled()) {
        insertContentButtons();
        startContentButtonBootstrap();
    } else {
        removeContentButtons();
    }

    loadContentShortcutOverrides(function () {
        if (!isTopWindow()) return;
        if (!isDTULearnHomepage()) return;
        if (!isContentShortcutEnabled()) return;
        insertContentButtons();
    });
    subscribeContentShortcutOverrideStorageChanges();
})();
