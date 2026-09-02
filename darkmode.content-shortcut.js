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
        showContentShortcutOverridesModal({
            courseId: courseId,
            defaultHref: defaultHref
        });
    }

    function showContentShortcutOverridesModal(options) {
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
                panel: '#1f1f1f',
                field: '#262626',
                error: '#fca5a5'
            }
            : {
                bg: 'rgba(255,255,255,0.96)',
                text: '#1f2937',
                heading: '#111827',
                muted: '#6b7280',
                border: '#d1d5db',
                panel: '#f9fafb',
                field: '#ffffff',
                error: '#b91c1c'
            };

        var initialCourseId = normalizeContentShortcutCourseId(options && options.courseId);
        var initialDefaultHref = normalizeContentShortcutTarget(options && options.defaultHref) || '';
        var editorState = initialCourseId ? {
            mode: 'edit',
            courseId: initialCourseId,
            courseInput: initialCourseId,
            targetInput: getContentShortcutOverride(initialCourseId) || initialDefaultHref,
            defaultHref: initialDefaultHref || ('/d2l/le/lessons/' + initialCourseId),
            error: ''
        } : null;
        var noticeText = '';

        var overlay = document.createElement('div');
        markExt(overlay);
        overlay.className = 'dtu-content-shortcut-overrides-modal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Content shortcuts');
        overlay.tabIndex = -1;
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000001;display:flex;align-items:center;justify-content:center;'
            + 'background:transparent !important;background-color:transparent !important;'
            + 'backdrop-filter:blur(4px) !important;-webkit-backdrop-filter:blur(4px) !important;'
            + 'opacity:0;transition:opacity .2s ease;';

        var modal = document.createElement('div');
        markExt(modal);
        modal.style.cssText = 'width:min(680px,92vw);max-height:82vh;overflow:auto;box-sizing:border-box;'
            + 'border-radius:14px;padding:20px;background:' + palette.bg + ';'
            + 'color:' + palette.text + ';border:1px solid ' + palette.border + ';'
            + 'box-shadow:0 18px 52px rgba(0,0,0,0.45);font-family:sans-serif;';

        function closeModal() {
            overlay.style.opacity = '0';
            setTimeout(function () { try { overlay.remove(); } catch (e) { } }, 150);
        }

        function buttonStyle(kind) {
            if (kind === 'danger') {
                return 'border:1px solid transparent;background:transparent;color:' + palette.error + ';';
            }
            if (kind === 'primary') {
                return 'border:1px solid var(--dtu-ad-accent-border);background:var(--dtu-ad-accent);color:#fff;';
            }
            return 'border:1px solid ' + palette.border + ';background:' + palette.field + ';color:' + palette.text + ';';
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

        function makeInput(value, placeholder) {
            var input = document.createElement('input');
            markExt(input);
            input.type = 'text';
            input.value = value || '';
            input.placeholder = placeholder || '';
            input.autocomplete = 'off';
            input.spellcheck = false;
            input.style.cssText = 'width:100%;box-sizing:border-box;padding:10px 11px;border-radius:8px;'
                + 'border:1px solid ' + palette.border + ';background:' + palette.field + ';color:' + palette.text + ';'
                + 'font:13px/1.35 sans-serif;outline:none;';
            input.addEventListener('focus', function () {
                input.style.borderColor = 'var(--dtu-ad-accent-border)';
                input.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--dtu-ad-accent) 28%, transparent)';
            });
            input.addEventListener('blur', function () {
                input.style.borderColor = palette.border;
                input.style.boxShadow = 'none';
            });
            return input;
        }

        function startEditor(courseId, targetHref, defaultHref) {
            var key = normalizeContentShortcutCourseId(courseId);
            editorState = {
                mode: key ? 'edit' : 'add',
                courseId: key || '',
                courseInput: key || '',
                targetInput: targetHref || '',
                defaultHref: defaultHref || (key ? '/d2l/le/lessons/' + key : ''),
                error: ''
            };
            noticeText = '';
            render();
        }

        function saveEditor(courseInput, targetInput) {
            var rawCourse = String(courseInput || '').trim();
            var courseId = editorState && editorState.courseId
                ? editorState.courseId
                : normalizeContentShortcutCourseId(rawCourse);
            var rawTarget = String(targetInput || '').trim();
            var target = normalizeContentShortcutTarget(rawTarget);

            editorState.courseInput = rawCourse;
            editorState.targetInput = rawTarget;
            editorState.error = '';

            if (!courseId) {
                editorState.error = 'Paste the course page URL from DTU Learn so the course can be detected.';
                render();
                return;
            }
            if (!editorState.courseId && isLikelyDtuCourseCodeInput(rawCourse, courseId)) {
                editorState.error = 'That looks like a DTU course code. Paste the course page URL from DTU Learn instead.';
                render();
                return;
            }
            if (!rawTarget || !target) {
                editorState.error = 'Paste a valid DTU Learn destination URL.';
                render();
                return;
            }

            var defaultHref = normalizeContentShortcutTarget(editorState.defaultHref)
                || ('/d2l/le/lessons/' + courseId);
            if (target === defaultHref) {
                setContentShortcutOverride(courseId, '', null);
                noticeText = 'Course ' + courseId + ' now uses its normal Content page.';
            } else {
                setContentShortcutOverride(courseId, target, null);
                noticeText = 'Custom link saved for course ' + courseId + '.';
            }
            editorState = null;
            insertContentButtons();
            render();
        }

        function render() {
            while (modal.firstChild) modal.removeChild(modal.firstChild);

            var header = document.createElement('div');
            markExt(header);
            header.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px;';

            var headingWrap = document.createElement('div');
            markExt(headingWrap);
            headingWrap.style.cssText = 'min-width:0;';

            var title = document.createElement('h2');
            markExt(title);
            title.textContent = 'Content shortcuts';
            title.style.cssText = 'margin:0 0 5px;font-size:21px;font-weight:700;color:' + palette.heading + ';';
            headingWrap.appendChild(title);

            var intro = document.createElement('p');
            markExt(intro);
            intro.style.cssText = 'margin:0;font-size:13px;line-height:1.45;color:' + palette.muted + ';';
            intro.textContent = 'Each course button opens its normal Content page. Add a custom link only when a course should open somewhere else.';
            headingWrap.appendChild(intro);

            var topCloseBtn = makeBtn('Close', 'secondary');
            topCloseBtn.setAttribute('aria-label', 'Close Content shortcuts');
            topCloseBtn.addEventListener('click', closeModal);

            header.appendChild(headingWrap);
            header.appendChild(topCloseBtn);
            modal.appendChild(header);

            if (noticeText) {
                var notice = document.createElement('div');
                markExt(notice);
                notice.style.cssText = 'margin:0 0 12px;padding:9px 11px;border-radius:8px;'
                    + 'background:color-mix(in srgb, var(--dtu-ad-accent) 16%, transparent);'
                    + 'color:' + palette.text + ';font-size:12px;line-height:1.4;';
                notice.textContent = noticeText;
                modal.appendChild(notice);
            }

            if (editorState) {
                var editor = document.createElement('div');
                markExt(editor);
                editor.style.cssText = 'margin-bottom:14px;padding:14px;border:1px solid ' + palette.border + ';'
                    + 'border-radius:10px;background:' + palette.panel + ';';

                var editorTitle = document.createElement('h3');
                markExt(editorTitle);
                editorTitle.style.cssText = 'margin:0 0 12px;font-size:15px;font-weight:700;color:' + palette.heading + ';';
                editorTitle.textContent = editorState.mode === 'edit'
                    ? 'Change course ' + editorState.courseId
                    : 'Add a custom link';
                editor.appendChild(editorTitle);

                var courseInput = null;
                if (editorState.mode === 'add') {
                    var courseLabel = document.createElement('label');
                    markExt(courseLabel);
                    courseLabel.style.cssText = 'display:block;margin-bottom:10px;font-size:12px;font-weight:700;color:' + palette.text + ';';
                    courseLabel.textContent = 'Course page';
                    courseInput = makeInput(editorState.courseInput, 'Paste a DTU Learn course URL');
                    courseInput.style.marginTop = '5px';
                    courseLabel.appendChild(courseInput);

                    var courseHelp = document.createElement('span');
                    markExt(courseHelp);
                    courseHelp.style.cssText = 'display:block;margin-top:5px;font-size:11px;font-weight:400;color:' + palette.muted + ';';
                    courseHelp.textContent = 'The course is detected automatically from the URL.';
                    courseLabel.appendChild(courseHelp);
                    editor.appendChild(courseLabel);
                }

                var targetLabel = document.createElement('label');
                markExt(targetLabel);
                targetLabel.style.cssText = 'display:block;font-size:12px;font-weight:700;color:' + palette.text + ';';
                targetLabel.textContent = 'Open this page instead';
                var targetInput = makeInput(editorState.targetInput, 'Paste the destination URL from DTU Learn');
                targetInput.style.marginTop = '5px';
                targetLabel.appendChild(targetInput);
                editor.appendChild(targetLabel);

                if (editorState.error) {
                    var error = document.createElement('div');
                    markExt(error);
                    error.setAttribute('role', 'alert');
                    error.style.cssText = 'margin-top:9px;font-size:12px;line-height:1.4;color:' + palette.error + ';';
                    error.textContent = editorState.error;
                    editor.appendChild(error);
                }

                var editorActions = document.createElement('div');
                markExt(editorActions);
                editorActions.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:12px;';
                var saveBtn = makeBtn('Save link', 'primary');
                saveBtn.addEventListener('click', function () {
                    saveEditor(courseInput ? courseInput.value : editorState.courseId, targetInput.value);
                });
                var cancelBtn = makeBtn('Cancel', 'secondary');
                cancelBtn.addEventListener('click', function () {
                    editorState = null;
                    render();
                });
                editorActions.appendChild(saveBtn);
                editorActions.appendChild(cancelBtn);
                editor.appendChild(editorActions);
                modal.appendChild(editor);

                setTimeout(function () {
                    try {
                        var firstInput = courseInput || targetInput;
                        firstInput.focus();
                        firstInput.select();
                    } catch (e0) { }
                }, 0);
            }

            var listWrap = document.createElement('div');
            markExt(listWrap);
            listWrap.style.cssText = 'border:1px solid ' + palette.border + ';border-radius:10px;overflow:hidden;';

            var rows = getContentShortcutOverridesMap();
            var keys = Object.keys(rows).sort(function (a, b) { return Number(a) - Number(b); });

            if (!keys.length) {
                var empty = document.createElement('div');
                markExt(empty);
                empty.style.cssText = 'padding:18px 14px;font-size:13px;line-height:1.45;color:' + palette.muted + ';background:' + palette.panel + ';';
                empty.textContent = 'All courses currently use their normal Content page.';
                listWrap.appendChild(empty);
            } else {
                keys.forEach(function (courseId) {
                    var row = document.createElement('div');
                    markExt(row);
                    row.style.cssText = 'display:flex;gap:10px;align-items:center;justify-content:space-between;'
                        + 'padding:11px 12px;background:' + palette.panel + ';'
                        + (courseId !== keys[keys.length - 1] ? 'border-bottom:1px solid ' + palette.border + ';' : '');

                    var left = document.createElement('div');
                    markExt(left);
                    left.style.cssText = 'min-width:0;flex:1;';

                    var idEl = document.createElement('div');
                    markExt(idEl);
                    idEl.style.cssText = 'font-size:12px;font-weight:700;color:' + palette.heading + ';';
                    idEl.textContent = 'Course ' + courseId;

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

                    var editBtn = makeBtn('Change', 'secondary');
                    editBtn.addEventListener('click', function () {
                        startEditor(courseId, rows[courseId], '/d2l/le/lessons/' + courseId);
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

            if (!editorState) modal.appendChild(listWrap);

            if (!editorState) {
                var footer = document.createElement('div');
                markExt(footer);
                footer.style.cssText = 'display:flex;justify-content:flex-start;gap:8px;margin-top:12px;flex-wrap:wrap;';

                var addBtn = makeBtn('Add custom link', 'primary');
                addBtn.addEventListener('click', function () {
                    startEditor('', '', '');
                });
                footer.appendChild(addBtn);

                if (keys.length > 1) {
                    var clearBtn = makeBtn('Remove all', 'danger');
                    clearBtn.addEventListener('click', function () {
                        if (!confirm('Remove all custom content links?')) return;
                        clearAllContentShortcutOverrides(null);
                        editorState = null;
                        noticeText = 'All courses now use their normal Content page.';
                        insertContentButtons();
                        render();
                    });
                    footer.appendChild(clearBtn);
                }
                modal.appendChild(footer);
            }
        }

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal();
        });
        overlay.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (editorState) {
                    editorState = null;
                    render();
                } else {
                    closeModal();
                }
            }
        });

        render();
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        requestAnimationFrame(function () {
            overlay.style.opacity = '1';
            try { overlay.focus(); } catch (e0) { }
        });
    }

    var contentBtnShadowCSS = `
        a.dtu-dark-content-btn,
        a.dtu-dark-content-btn:link,
        a.dtu-dark-content-btn:visited {
            position: absolute !important;
            bottom: 6px !important;
            right: 6px !important;
            transform: translate(175px, 60px) !important;
            min-width: 42px !important;
            min-height: 42px !important;
            width: 42px !important;
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
