(function () {
    'use strict';

    function getDeps() {
        try { return globalThis.DTUAfterDarkLearnShellDeps || null; } catch (e0) { return null; }
    }

    function isTopWindow() {
        var deps = getDeps();
        return !!(deps && typeof deps.isTopWindow === 'function' && deps.isTopWindow());
    }

    function isDarkModeEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDarkModeEnabled === 'function' && deps.isDarkModeEnabled());
    }

    function getExtensionUrl(path) {
        var deps = getDeps();
        if (deps && typeof deps.getExtensionUrl === 'function') return deps.getExtensionUrl(path);
        return path;
    }

    function markExt(el) {
        var deps = getDeps();
        if (el && deps && typeof deps.markExt === 'function') deps.markExt(el);
        return el;
    }

    function getAdminToolsPlaceholder() {
        var deps = getDeps();
        if (deps && typeof deps.getAdminToolsPlaceholder === 'function') return deps.getAdminToolsPlaceholder();
        return null;
    }

    function normalizeWhitespace(text) {
        var deps = getDeps();
        if (deps && typeof deps.normalizeWhitespace === 'function') return deps.normalizeWhitespace(text);
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function saveDarkModePreference(enabled) {
        var deps = getDeps();
        if (deps && typeof deps.saveDarkModePreference === 'function') deps.saveDarkModePreference(enabled);
    }

    function showSettingsModal() {
        var deps = getDeps();
        if (deps && typeof deps.showSettingsModal === 'function') deps.showSettingsModal();
    }

    function isDTULearnHomepage() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDTULearnHomepage === 'function' && deps.isDTULearnHomepage());
    }

    function isContextCaptureDevToolEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isContextCaptureDevToolEnabled === 'function' && deps.isContextCaptureDevToolEnabled());
    }

    function isMojanglesEnabled() {
        var stored = localStorage.getItem('mojanglesTextEnabled');
        return stored === null ? true : stored === 'true';
    }

    function isMojanglesTargetPage() {
        if (window.location.hostname !== 'learn.inside.dtu.dk') return false;
        var path = window.location.pathname || '';
        if (/^\/d2l\/home(?:\/\d+)?\/?$/i.test(path)) return true;
        if (/^\/d2l\/le\/lessons\/\d+(?:\/.*)?$/i.test(path)) return true;
        return false;
    }

    function findAllMojanglesImages(root) {
        var images = [];
        if (!root) return images;
        root.querySelectorAll('.mojangles-text-img').forEach(function (img) { images.push(img); });
        root.querySelectorAll('*').forEach(function (el) {
            if (el.shadowRoot) {
                findAllMojanglesImages(el.shadowRoot).forEach(function (img) { images.push(img); });
            }
        });
        return images;
    }

    function insertMojanglesText() {
        if (!isTopWindow()) return;
        if (!isMojanglesTargetPage()) {
            findAllMojanglesImages(document).forEach(function (img) {
                if (img && img._dtuMojanglesPulseAnim && typeof img._dtuMojanglesPulseAnim.cancel === 'function') {
                    img._dtuMojanglesPulseAnim.cancel();
                    img._dtuMojanglesPulseAnim = null;
                }
                img.remove();
            });
            return;
        }

        if (!isMojanglesEnabled()) {
            findAllMojanglesImages(document).forEach(function (img) {
                if (img && img._dtuMojanglesPulseAnim && typeof img._dtuMojanglesPulseAnim.cancel === 'function') {
                    img._dtuMojanglesPulseAnim.cancel();
                    img._dtuMojanglesPulseAnim = null;
                }
                img.style.display = 'none';
            });
            return;
        }

        findAllMojanglesImages(document).forEach(function (img) {
            img.style.display = '';
        });

        if (!document.getElementById('dtu-mojangles-pulse-style')) {
            var pulseStyle = document.createElement('style');
            pulseStyle.id = 'dtu-mojangles-pulse-style';
            pulseStyle.textContent = '@keyframes dtuMojanglesPulse { 0%, 100% { transform: translateY(-50%) rotate(-20deg) scale(1); } 50% { transform: translateY(-50%) rotate(-20deg) scale(1.05); } }';
            (document.head || document.documentElement).appendChild(pulseStyle);
        }

        var mojanglesImgSrc = getExtensionUrl(isDarkModeEnabled() ? 'images/mojangles_text.png' : 'images/mojangles_text_darkmode_off.png');
        var isRootHomePage = /^\/d2l\/home\/?$/.test(window.location.pathname);
        var homePulseMs = 1800;

        function setMojanglesPulse(img, shouldPulse) {
            if (!img) return;
            if (img._dtuMojanglesPulseAnim && typeof img._dtuMojanglesPulseAnim.cancel === 'function') {
                if (!shouldPulse) {
                    img._dtuMojanglesPulseAnim.cancel();
                    img._dtuMojanglesPulseAnim = null;
                } else {
                    return;
                }
            }
            if (shouldPulse) {
                try {
                    if (typeof img.animate === 'function') {
                        img._dtuMojanglesPulseAnim = img.animate(
                            [
                                { transform: 'translateY(-50%) rotate(-20deg) scale(1)' },
                                { transform: 'translateY(-50%) rotate(-20deg) scale(1.05)' },
                                { transform: 'translateY(-50%) rotate(-20deg) scale(1)' }
                            ],
                            { duration: homePulseMs, iterations: Infinity, easing: 'ease-in-out' }
                        );
                        img.style.animation = 'none';
                        return;
                    }
                } catch (e) {
                }
                img.style.animation = 'dtuMojanglesPulse 1.8s ease-in-out infinite';
            } else {
                img.style.animation = 'none';
            }
        }

        function resolveMojanglesLogoElement(container) {
            if (!container) return null;
            var strongSelector = [
                'd2l-navigation-link-image.d2l-navigation-s-logo',
                'd2l-navigation-link-image[text="My Home"]',
                'a.d2l-navigation-s-link[href*="/d2l/home"]',
                'a[href^="/d2l/home"]',
                'a[href*="/d2l/home"] d2l-navigation-link-image'
            ].join(', ');

            var slot = container.querySelector('slot[name="left"]');
            if (slot && typeof slot.assignedElements === 'function') {
                var assigned = slot.assignedElements({ flatten: true }) || [];
                for (var i = 0; i < assigned.length; i++) {
                    var el = assigned[i];
                    if (!el) continue;
                    if (el.matches && el.matches(strongSelector)) return el;
                    if (el.querySelector) {
                        var nested = el.querySelector(strongSelector);
                        if (nested) return nested;
                    }
                }
            }

            var direct = container.querySelector(strongSelector);
            if (direct) return direct;
            return null;
        }

        function insertInRoot(root) {
            if (!root) return;

            var headerContainers = root.querySelectorAll('.d2l-labs-navigation-header-container');
            headerContainers.forEach(function (container) {
                var img = container.querySelector('.mojangles-text-img');
                if (!img) {
                    img = document.createElement('img');
                    markExt(img);
                    img.className = 'mojangles-text-img';
                    img.alt = 'Mojangles';
                    container.appendChild(img);
                }
                img.src = mojanglesImgSrc;
                img.style.display = 'block';
                img.style.opacity = '1';
                img.style.visibility = 'visible';

                container.style.position = 'relative';
                container.style.overflow = 'visible';

                var logo = resolveMojanglesLogoElement(container);
                var heightPx = isRootHomePage ? 16 : 12;
                var fallbackLeftPx = isRootHomePage ? 36 : 16;
                var fallbackTop = isRootHomePage ? 'calc(58% + 3px)' : 'calc(60% + 19px)';
                var styleBase = 'height:' + heightPx + 'px; position:absolute; transform:translateY(-50%) rotate(-20deg); '
                    + 'z-index:20; pointer-events:none; display:block; opacity:1; visibility:visible;';

                if (!logo || !logo.getBoundingClientRect) {
                    img.style.cssText = styleBase + ' left:' + fallbackLeftPx + 'px; top:' + fallbackTop + ';';
                    setMojanglesPulse(img, isRootHomePage);
                    return;
                }

                var containerRect = container.getBoundingClientRect();
                var logoRect = logo.getBoundingClientRect();
                if (!containerRect || !logoRect || logoRect.width <= 0 || containerRect.width <= 0) {
                    img.style.cssText = styleBase + ' left:' + fallbackLeftPx + 'px; top:' + fallbackTop + ';';
                    setMojanglesPulse(img, isRootHomePage);
                    return;
                }

                var leftPx = Math.max(4, Math.round(logoRect.right - containerRect.left + (isRootHomePage ? -26 : -32)));
                if (leftPx > (containerRect.width * 0.5)) {
                    leftPx = fallbackLeftPx;
                }
                var topPx = Math.round((logoRect.top - containerRect.top) + (logoRect.height * (isRootHomePage ? 0.58 : 0.62))) + (isRootHomePage ? 3 : 19);
                img.style.cssText = styleBase + ' left:' + leftPx + 'px; top:' + topPx + 'px;';
                setMojanglesPulse(img, isRootHomePage);
            });
        }

        insertInRoot(document);

        function checkShadowRoots(root) {
            if (!root) return;
            var elements = root.querySelectorAll('*');
            elements.forEach(function (el) {
                if (el.shadowRoot) {
                    insertInRoot(el.shadowRoot);
                    checkShadowRoots(el.shadowRoot);
                }
            });
        }

        checkShadowRoots(document);
    }

    function insertMojanglesToggle() {
        if (!isTopWindow()) return;
        var placeholder = getAdminToolsPlaceholder();
        if (!placeholder) return;
        if (placeholder.querySelector && placeholder.querySelector('#mojangles-toggle')) return;

        var targetList = ensureAfterDarkAdminToolsList();
        if (!targetList) return;

        var li = document.createElement('li');
        li.style.cssText = isDarkModeEnabled()
            ? 'display: flex; align-items: center; gap: 8px; padding: 4px 0; background-color: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; padding: 4px 0;';

        var label = document.createElement('label');
        label.style.cssText = isDarkModeEnabled()
            ? 'display: flex; align-items: center; gap: 8px; cursor: pointer; color: #e0e0e0; font-size: 14px; background-color: #2d2d2d !important; background: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;';

        var toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.id = 'mojangles-toggle';
        toggle.checked = isMojanglesEnabled();
        toggle.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: var(--dtu-ad-accent);';
        toggle.addEventListener('change', function () {
            localStorage.setItem('mojanglesTextEnabled', toggle.checked.toString());
            insertMojanglesText();
        });

        label.appendChild(toggle);
        label.appendChild(document.createTextNode('Mojangles Text'));
        li.appendChild(label);
        targetList.appendChild(li);
    }

    function ensureAfterDarkAdminToolsList() {
        var placeholder = getAdminToolsPlaceholder();
        if (!placeholder) return null;

        var targetList = null;
        var columns = placeholder.querySelectorAll('.d2l-admin-tools-column');
        columns.forEach(function (col) {
            var h2 = col.querySelector('h2');
            if (h2 && normalizeWhitespace(h2.textContent) === 'DTU After Dark') {
                targetList = col.querySelector('ul.d2l-list');
            }
        });
        if (targetList) return targetList;

        var column = document.createElement('div');
        column.className = 'd2l-admin-tools-column';
        if (isDarkModeEnabled()) column.style.cssText = 'background-color: #2d2d2d !important; color: #e0e0e0 !important;';

        var heading = document.createElement('h2');
        heading.className = 'd2l-heading vui-heading-4 d2l-heading-none';
        heading.textContent = 'DTU After Dark';
        if (isDarkModeEnabled()) heading.style.cssText = 'background-color: #2d2d2d !important; color: #e0e0e0 !important;';

        targetList = document.createElement('ul');
        targetList.className = 'd2l-list';
        if (isDarkModeEnabled()) targetList.style.cssText = 'background-color: #2d2d2d !important;';

        column.appendChild(heading);
        column.appendChild(targetList);
        placeholder.appendChild(column);
        return targetList;
    }

    function insertSettingsAdminEntry() {
        if (!isTopWindow()) return;
        var targetList = ensureAfterDarkAdminToolsList();
        if (!targetList) return;
        if (targetList.querySelector && targetList.querySelector('#dtu-after-dark-admin-settings')) return;

        var li = document.createElement('li');
        li.style.cssText = isDarkModeEnabled()
            ? 'display: flex; align-items: center; gap: 8px; padding: 4px 0; background-color: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; padding: 4px 0;';

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'dtu-after-dark-admin-settings';
        btn.textContent = 'Settings';
        btn.style.cssText = 'appearance:none;-webkit-appearance:none;border:0;background:transparent;padding:0;'
            + 'font:inherit;font-size:14px;line-height:1.4;cursor:pointer;text-align:left;'
            + 'color:' + (isDarkModeEnabled() ? '#66b3ff' : 'var(--dtu-ad-accent-deep)') + ';';
        btn.addEventListener('click', function (event) {
            try { event.preventDefault(); } catch (e0) { }
            try { event.stopPropagation(); } catch (e1) { }
            showSettingsModal();
        });

        li.appendChild(btn);
        if (targetList.firstChild) targetList.insertBefore(li, targetList.firstChild);
        else targetList.appendChild(li);
    }

    function insertDarkModeToggle() {
        if (!isTopWindow()) return;
        var placeholder = getAdminToolsPlaceholder();
        if (!placeholder) return;
        if (placeholder.querySelector && placeholder.querySelector('#dark-mode-toggle')) return;

        var targetList = ensureAfterDarkAdminToolsList();

        if (!targetList) return;

        var li = document.createElement('li');
        li.style.cssText = isDarkModeEnabled()
            ? 'display: flex; align-items: center; gap: 8px; padding: 4px 0; background-color: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; padding: 4px 0;';

        var label = document.createElement('label');
        label.style.cssText = isDarkModeEnabled()
            ? 'display: flex; align-items: center; gap: 8px; cursor: pointer; color: #e0e0e0; font-size: 14px; background-color: #2d2d2d !important; background: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;';

        var toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.id = 'dark-mode-toggle';
        toggle.checked = isDarkModeEnabled();
        toggle.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: var(--dtu-ad-accent);';
        toggle.addEventListener('change', function () {
            saveDarkModePreference(!isDarkModeEnabled());
            location.reload();
        });

        label.appendChild(toggle);
        label.appendChild(document.createTextNode('Dark Mode'));
        li.appendChild(label);

        var settingsItem = targetList.querySelector && targetList.querySelector('#dtu-after-dark-admin-settings');
        if (settingsItem && settingsItem.parentElement && settingsItem.parentElement.nextSibling) {
            targetList.insertBefore(li, settingsItem.parentElement.nextSibling);
        } else if (settingsItem && settingsItem.parentElement) {
            targetList.appendChild(li);
        } else if (targetList.firstChild) {
            targetList.insertBefore(li, targetList.firstChild);
        } else {
            targetList.appendChild(li);
        }
    }

    var _contextCaptureActive = false;
    var _contextCaptureCleanup = null;
    var _contextCaptureHotkeyBound = false;
    var _contextCaptureToastTimer = null;
    var CONTEXT_CAPTURE_HTML_MAX = 60000;

    function getContextCaptureTheme() {
        if (isDarkModeEnabled()) {
            return {
                bg: '#1f2937',
                fg: '#e0e0e0',
                border: '#3f4b5e',
                errorBg: '#5b1c1c',
                errorBorder: '#8c2d2d'
            };
        }
        return {
            bg: '#ffffff',
            fg: '#1f2937',
            border: '#cbd5e1',
            errorBg: '#fee2e2',
            errorBorder: '#fca5a5'
        };
    }

    function showContextCaptureToast(message, isError) {
        if (!document.body) return;

        var theme = getContextCaptureTheme();
        var toast = document.querySelector('#dtu-context-capture-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'dtu-context-capture-toast';
            toast.setAttribute('data-dtu-ext', '1');
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.cssText =
            'position: fixed; right: 14px; bottom: 14px; z-index: 2147483647; '
            + 'max-width: 420px; padding: 10px 12px; border-radius: 8px; '
            + 'font-size: 12px; line-height: 1.4; white-space: normal; '
            + 'box-shadow: 0 6px 18px rgba(0,0,0,0.35); '
            + 'background: ' + (isError ? theme.errorBg : theme.bg) + '; '
            + 'color: ' + theme.fg + '; '
            + 'border: 1px solid ' + (isError ? theme.errorBorder : theme.border) + ';';

        if (_contextCaptureToastTimer) clearTimeout(_contextCaptureToastTimer);
        _contextCaptureToastTimer = setTimeout(function () {
            if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
        }, 3600);
    }

    async function copyTextToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (e) {
        }

        try {
            var area = document.createElement('textarea');
            area.value = text;
            area.setAttribute('readonly', 'readonly');
            area.style.position = 'fixed';
            area.style.opacity = '0';
            area.style.left = '-9999px';
            document.body.appendChild(area);
            area.focus();
            area.select();
            var copied = document.execCommand('copy');
            document.body.removeChild(area);
            return !!copied;
        } catch (e) {
            return false;
        }
    }

    function getCaptureElementFromEvent(event) {
        var path = event.composedPath ? event.composedPath() : [];
        var candidate = (path && path.length > 0) ? path[0] : event.target;
        if (!candidate) return null;

        if (candidate.nodeType !== 1) {
            candidate = candidate.parentElement;
        }
        if (!candidate || candidate.nodeType !== 1) return null;
        return candidate;
    }

    function getCaptureParentElement(element) {
        if (!element) return null;
        if (element.parentElement) return element.parentElement;
        try {
            var root = element.getRootNode ? element.getRootNode() : null;
            if (root && root.host && root.host.nodeType === 1) return root.host;
        } catch (e) { }
        return null;
    }

    function trimCapturedHtml(html, maxLen) {
        if (!html) return '(not available)';
        if (html.length <= maxLen) return html;
        return html.slice(0, maxLen)
            + '\n<!-- truncated by DTU After Dark context helper (' + html.length + ' chars total) -->';
    }

    function buildContextCapturePayload(element) {
        var parent = getCaptureParentElement(element);
        var elementHtml = trimCapturedHtml(element.outerHTML || '', CONTEXT_CAPTURE_HTML_MAX);
        var parentHtml = trimCapturedHtml(parent ? parent.outerHTML : '', CONTEXT_CAPTURE_HTML_MAX);

        return [
            'DTU After Dark Context Capture',
            'URL: ' + window.location.href,
            'TITLE: ' + document.title,
            'TIMESTAMP: ' + new Date().toISOString(),
            '',
            'ELEMENT_OUTER_HTML:',
            elementHtml,
            '',
            'PARENT_OUTER_HTML:',
            parentHtml
        ].join('\n');
    }

    function stopContextCaptureMode() {
        _contextCaptureActive = false;
        if (_contextCaptureCleanup) {
            _contextCaptureCleanup();
            _contextCaptureCleanup = null;
        }
    }

    function startContextCaptureMode() {
        if (!isContextCaptureDevToolEnabled()) return;
        if (!isTopWindow()) return;
        if (_contextCaptureActive) {
            showContextCaptureToast('Context capture is already active. Click an element or press Esc.', false);
            return;
        }

        _contextCaptureActive = true;
        showContextCaptureToast('Context capture active: click one element. Press Esc to cancel.', false);

        var clickHandler = async function (event) {
            if (!_contextCaptureActive) return;
            if (event.button !== 0) return;

            var targetEl = getCaptureElementFromEvent(event);
            if (!targetEl) return;

            if (targetEl.closest && targetEl.closest('[data-dtu-ext], #dtu-context-capture-toast')) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }

            stopContextCaptureMode();
            var payload = buildContextCapturePayload(targetEl);
            var copied = await copyTextToClipboard(payload);
            if (copied) {
                showContextCaptureToast('Context copied to clipboard. Paste it here.', false);
            } else {
                showContextCaptureToast('Could not copy context automatically. Clipboard permission blocked.', true);
            }
        };

        var keydownHandler = function (event) {
            if (!_contextCaptureActive) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                stopContextCaptureMode();
                showContextCaptureToast('Context capture cancelled.', false);
            }
        };

        document.addEventListener('click', clickHandler, true);
        document.addEventListener('keydown', keydownHandler, true);

        _contextCaptureCleanup = function () {
            document.removeEventListener('click', clickHandler, true);
            document.removeEventListener('keydown', keydownHandler, true);
        };
    }

    function setupContextCaptureHotkey() {
        if (!isContextCaptureDevToolEnabled()) return;
        if (!isTopWindow() || _contextCaptureHotkeyBound) return;

        document.addEventListener('keydown', function (event) {
            if (event.defaultPrevented) return;
            if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return;

            var key = event.key ? event.key.toLowerCase() : '';
            if (key !== 'c') return;

            event.preventDefault();
            startContextCaptureMode();
        }, true);

        _contextCaptureHotkeyBound = true;
    }

    function triggerContextCaptureFromButton(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }
        }
        setTimeout(startContextCaptureMode, 0);
    }

    function insertContextCaptureFloatingHelper() {
        if (!isContextCaptureDevToolEnabled()) return;
        if (!isTopWindow()) return;
        if (!document.body) return;
        if (document.querySelector('#dtu-context-capture-floating-btn')) return;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'dtu-context-capture-floating-btn';
        btn.setAttribute('data-dtu-ext', '1');
        btn.title = 'Capture Context (Alt+Shift+C)';
        btn.textContent = 'Capture';
        btn.style.cssText = isDarkModeEnabled()
            ? 'position: fixed; right: 14px; bottom: 54px; z-index: 2147483646; '
            + 'background: #2d2d2d; color: #66b3ff; border: 1px solid #4f5f74; border-radius: 6px; '
            + 'cursor: pointer; font-size: 12px; padding: 6px 10px;'
            : 'position: fixed; right: 14px; bottom: 54px; z-index: 2147483646; '
            + 'background: #ffffff; color: #0b67c2; border: 1px solid #c8d0db; border-radius: 6px; '
            + 'cursor: pointer; font-size: 12px; padding: 6px 10px;';
        btn.style.setProperty('position', 'fixed', 'important');
        btn.style.setProperty('right', '14px', 'important');
        btn.style.setProperty('bottom', '54px', 'important');
        btn.style.setProperty('left', 'auto', 'important');
        btn.style.setProperty('top', 'auto', 'important');
        btn.style.setProperty('display', 'inline-flex', 'important');
        btn.style.setProperty('align-items', 'center', 'important');
        btn.style.setProperty('justify-content', 'center', 'important');
        btn.style.setProperty('width', 'auto', 'important');
        btn.style.setProperty('max-width', '160px', 'important');
        btn.style.setProperty('min-width', '0', 'important');
        btn.style.setProperty('margin', '0', 'important');
        btn.style.setProperty('float', 'none', 'important');
        btn.style.setProperty('white-space', 'nowrap', 'important');
        btn.style.setProperty('pointer-events', 'auto', 'important');
        btn.style.setProperty('user-select', 'none', 'important');
        btn.addEventListener('pointerdown', triggerContextCaptureFromButton, true);
        btn.addEventListener('click', triggerContextCaptureFromButton, true);

        document.body.appendChild(btn);
    }

    function insertContextCaptureHelper() {
        if (!isContextCaptureDevToolEnabled()) return;
        if (!isTopWindow()) return;
        if (document.querySelector('#dtu-context-capture-btn')
            || document.querySelector('#dtu-context-capture-floating-btn')) return;

        if (!isDTULearnHomepage()) {
            insertContextCaptureFloatingHelper();
            return;
        }

        var placeholder = getAdminToolsPlaceholder();
        if (!placeholder) {
            insertContextCaptureFloatingHelper();
            return;
        }

        var columns = placeholder.querySelectorAll('.d2l-admin-tools-column');
        var targetList = null;
        columns.forEach(function (col) {
            var h2 = col.querySelector('h2');
            if (h2 && normalizeWhitespace(h2.textContent) === 'DTU After Dark') {
                targetList = col.querySelector('ul.d2l-list');
            }
        });

        if (!targetList) {
            insertContextCaptureFloatingHelper();
            return;
        }

        var li = document.createElement('li');
        li.setAttribute('data-dtu-ext', '1');
        li.style.cssText = isDarkModeEnabled()
            ? 'display: flex; align-items: center; gap: 8px; padding: 4px 0; background-color: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; padding: 4px 0;';

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'dtu-context-capture-btn';
        btn.setAttribute('data-dtu-ext', '1');
        btn.style.cssText = isDarkModeEnabled()
            ? 'background: #2d2d2d; color: #66b3ff; border: 1px solid #4f5f74; border-radius: 4px; '
            + 'cursor: pointer; font-size: 12px; padding: 3px 8px;'
            : 'background: #ffffff; color: #0b67c2; border: 1px solid #c8d0db; border-radius: 4px; '
            + 'cursor: pointer; font-size: 12px; padding: 3px 8px;';
        btn.textContent = 'Capture Context';
        btn.addEventListener('pointerdown', triggerContextCaptureFromButton, true);
        btn.addEventListener('click', triggerContextCaptureFromButton, true);

        var hotkeyHint = document.createElement('span');
        hotkeyHint.setAttribute('data-dtu-ext', '1');
        hotkeyHint.style.cssText = isDarkModeEnabled()
            ? 'font-size: 11px; color: #9aa7b8;'
            : 'font-size: 11px; color: #6b7280;';
        hotkeyHint.textContent = 'Alt+Shift+C';

        li.appendChild(btn);
        li.appendChild(hotkeyHint);
        targetList.appendChild(li);
    }

    function showOnboardingHint() {
        if (!isTopWindow()) return;
        if (!isDTULearnHomepage()) return;
        if (document.querySelector('#dtu-dark-hint')) return;

        var HINT_SEEN_KEY = 'dtuDarkModeOnboardingHintSeenV2';
        if (localStorage.getItem(HINT_SEEN_KEY) === '1') return;

        var targetBtn = document.querySelector('.dtu-settings-nav-item button');
        if (!targetBtn) return;

        var targetRect = targetBtn.getBoundingClientRect();
        if (targetRect.width === 0 || targetRect.height === 0) return;

        var bubbleWidth = 260;
        var targetCenterX = targetRect.left + targetRect.width / 2;
        var bubbleLeft = targetCenterX - bubbleWidth / 2;
        if (bubbleLeft < 8) bubbleLeft = 8;
        if (bubbleLeft + bubbleWidth > window.innerWidth - 8) bubbleLeft = window.innerWidth - bubbleWidth - 8;
        var arrowLeft = targetCenterX - bubbleLeft;

        var bubble = document.createElement('div');
        bubble.id = 'dtu-dark-hint';
        var outer = document.createElement('div');
        outer.id = 'dtu-dark-hint-inner';
        Object.assign(outer.style, {
            position: 'fixed',
            top: (targetRect.bottom + 12) + 'px',
            left: bubbleLeft + 'px',
            zIndex: '999999',
            pointerEvents: 'auto'
        });

        var card = document.createElement('div');
        Object.assign(card.style, {
            position: 'relative',
            background: 'linear-gradient(135deg, var(--dtu-ad-accent), var(--dtu-ad-accent-deep))',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '10px',
            fontFamily: "'Segoe UI', sans-serif",
            fontSize: '13px',
            lineHeight: '1.4',
            width: bubbleWidth + 'px',
            boxSizing: 'border-box',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            cursor: 'pointer',
            animation: 'dtuHintBounce 2s ease-in-out infinite'
        });

        var arrow = document.createElement('div');
        Object.assign(arrow.style, {
            position: 'absolute',
            top: '-8px',
            left: (arrowLeft - 8) + 'px',
            width: '0',
            height: '0',
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid var(--dtu-ad-accent)'
        });

        var title = document.createElement('span');
        Object.assign(title.style, { fontWeight: 'bold', fontSize: '14px' });
        title.textContent = 'DTU After Dark';

        var desc = document.createElement('span');
        desc.style.opacity = '0.9';
        desc.textContent = 'Open Settings here to access feature toggles and customize DTU After Dark.';

        var visitNote = document.createElement('div');
        Object.assign(visitNote.style, { marginTop: '6px', fontSize: '11px', opacity: '0.7', textAlign: 'right' });
        visitNote.textContent = 'click to dismiss';

        card.appendChild(arrow);
        card.appendChild(title);
        card.appendChild(document.createElement('br'));
        card.appendChild(desc);
        card.appendChild(visitNote);
        outer.appendChild(card);
        bubble.appendChild(outer);

        if (!document.querySelector('#dtu-hint-bounce-style')) {
            var style = document.createElement('style');
            style.id = 'dtu-hint-bounce-style';
            style.textContent = '@keyframes dtuHintBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }';
            document.head.appendChild(style);
        }
        document.body.appendChild(bubble);

        function dismissBubble(markSeen) {
            if (markSeen) {
                try { localStorage.setItem(HINT_SEEN_KEY, '1'); } catch (eSeen) { }
            }
            bubble.style.transition = 'opacity 0.3s';
            bubble.style.opacity = '0';
            setTimeout(function () { bubble.remove(); }, 300);
        }
        bubble.addEventListener('click', function () {
            dismissBubble(true);
        });

        setTimeout(function () {
            if (document.querySelector('#dtu-dark-hint')) dismissBubble(true);
        }, 15000);
    }

    function scheduleOnboardingHint() {
        if (!isTopWindow()) return;
        if (!isDTULearnHomepage()) return;
        var attempts = 0;
        function tryShow() {
            attempts++;
            showOnboardingHint();
            if (document.querySelector('#dtu-dark-hint')) return;
            try {
                if (localStorage.getItem('dtuDarkModeOnboardingHintSeenV2') === '1') return;
            } catch (e0) { }
            if (attempts >= 8) return;
            setTimeout(tryShow, attempts < 3 ? 600 : 1200);
        }
        setTimeout(tryShow, 1200);
    }

    try {
        globalThis.DTUAfterDarkLearnShellUi = {
            insertMojanglesText: insertMojanglesText,
            insertSettingsAdminEntry: insertSettingsAdminEntry,
            insertMojanglesToggle: insertMojanglesToggle,
            insertDarkModeToggle: insertDarkModeToggle,
            setupContextCaptureHotkey: setupContextCaptureHotkey,
            insertContextCaptureHelper: insertContextCaptureHelper,
            scheduleOnboardingHint: scheduleOnboardingHint
        };
    } catch (e1) {
    }
})();
