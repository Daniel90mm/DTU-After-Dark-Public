(function () {
    'use strict';

    var _settingsBridge = globalThis.DTUAfterDarkSettingsBridge;
    if (!_settingsBridge) throw new Error('darkmode.settings.pause.js loaded before darkmode.settings.bridge.js');

    var isTopWindow = _settingsBridge.isTopWindow;
    var isDarkModeEnabled = _settingsBridge.isDarkModeEnabled;
    var getCurrentUrlWithoutHash = _settingsBridge.getCurrentUrlWithoutHash;
    var buildSuggestedPausePatternsForCurrentUrl = _settingsBridge.buildSuggestedPausePatternsForCurrentUrl;
    var normalizeUrlPausePattern = _settingsBridge.normalizeUrlPausePattern;
    var isPauseProtectedPattern = _settingsBridge.isPauseProtectedPattern;
    var getUrlPausePatterns = _settingsBridge.getUrlPausePatterns;
    var saveUrlPausePatterns = _settingsBridge.saveUrlPausePatterns;
    var getMatchingUrlPausePatterns = _settingsBridge.getMatchingUrlPausePatterns;
    var markExt = _settingsBridge.markExt;

    function getSettingsUi() {
        var ui = globalThis.DTUAfterDarkSettingsUi;
        if (!ui || typeof ui.hideSettingsModal !== 'function' || typeof ui.showSettingsModal !== 'function') {
            throw new Error('darkmode.settings.pause.js loaded before darkmode.settings.js');
        }
        return ui;
    }

    function removePausedUrlRulesModal() {
        var existing = document.querySelector('.dtu-paused-url-rules-modal');
        if (existing) {
            if (typeof existing._dtuPausedCleanup === 'function') existing._dtuPausedCleanup();
            existing.remove();
        }
    }

    function showPausedUrlRulesModal(opts) {
        if (!isTopWindow()) return;
        opts = opts || {};

        var reopenSettingsOnClose = !!opts.reopenSettingsOnClose;
        var initialFocus = opts.initialFocus === 'list' ? 'list' : 'add';
        var isDark = isDarkModeEnabled();
        var currentUrl = getCurrentUrlWithoutHash();
        var theme = isDark
            ? {
                background: 'rgba(30,30,30,0.94)',
                text: '#e0e0e0',
                heading: '#f5f5f5',
                muted: '#a3a3a3',
                border: '#404040',
                softBorder: '#4b5563',
                shadow: '0 18px 52px rgba(0,0,0,0.45)'
            }
            : {
                background: 'rgba(255,255,255,0.96)',
                text: '#1f2937',
                heading: '#111827',
                muted: '#6b7280',
                border: '#d1d5db',
                softBorder: '#cbd5e1',
                shadow: '0 18px 52px rgba(15,23,42,0.22)'
            };

        removePausedUrlRulesModal();
        var previousFocus = document.activeElement;
        // Resolve the Settings entry point outside the try: a missing one must throw.
        var settingsUi = getSettingsUi();
        try { settingsUi.hideSettingsModal(); } catch (e0) { }

        var overlay = document.createElement('div');
        markExt(overlay);
        overlay.className = 'dtu-paused-url-rules-modal';
        overlay.tabIndex = -1;
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483001;display:flex;align-items:center;justify-content:center;'
            + 'padding:18px;background:transparent !important;background-color:transparent !important;'
            + 'backdrop-filter:blur(4px) !important;-webkit-backdrop-filter:blur(4px) !important;'
            + 'opacity:0;transition:opacity .2s ease;font-family:sans-serif;';

        var modal = document.createElement('div');
        markExt(modal);
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'dtu-paused-urls-title');
        modal.tabIndex = -1;
        modal.style.cssText = 'width:min(720px,94vw);max-height:82vh;overflow:auto;border-radius:8px;padding:18px 18px 14px;'
            + 'background:' + theme.background + ';color:' + theme.text + ';border:1px solid ' + theme.border + ';'
            + 'box-shadow:' + theme.shadow + ';';

        function applyTextActionStyle(btn, colorValue) {
            btn.style.cssText = 'display:inline-flex;align-items:center;justify-content:flex-start;appearance:none;-webkit-appearance:none;'
                + 'margin:0;padding:0;border:0;background:transparent;white-space:nowrap;text-decoration:none;'
                + 'font-size:12px;font-weight:700;line-height:1.45;cursor:pointer;';
            try {
                btn.style.setProperty('color', colorValue || theme.text, 'important');
                btn.style.setProperty('background', 'transparent', 'important');
                btn.style.setProperty('background-color', 'transparent', 'important');
                btn.style.setProperty('background-image', 'none', 'important');
                btn.style.setProperty('border', '0', 'important');
                btn.style.setProperty('box-shadow', 'none', 'important');
                btn.style.setProperty('border-radius', '0', 'important');
            } catch (e1) { }
            btn.addEventListener('mouseenter', function () {
                try { btn.style.textDecoration = 'underline'; } catch (e2) { }
            });
            btn.addEventListener('mouseleave', function () {
                try { btn.style.textDecoration = 'none'; } catch (e3) { }
            });
        }

        function closePausedUrlRulesModal(shouldReopenSettings) {
            removePausedUrlRulesModal();
            if (shouldReopenSettings) {
                setTimeout(function () {
                    var reopenUi = getSettingsUi();
                    try { reopenUi.showSettingsModal(); } catch (e4) { }
                }, 0);
            }
        }

        var header = document.createElement('div');
        markExt(header);
        header.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:12px;';

        var headerCopy = document.createElement('div');
        markExt(headerCopy);
        headerCopy.style.cssText = 'min-width:0;flex:1;';

        var title = document.createElement('div');
        markExt(title);
        title.id = 'dtu-paused-urls-title';
        title.textContent = 'Paused URLs';
        title.style.cssText = 'font-size:18px;font-weight:700;color:' + theme.heading + ';margin-bottom:4px;';
        headerCopy.appendChild(title);

        var subtitle = document.createElement('div');
        markExt(subtitle);
        subtitle.textContent = 'Add or remove URL rules that temporarily pause DTU After Dark on matching pages. Use * as a wildcard.';
        subtitle.style.cssText = 'font-size:12px;line-height:1.5;color:' + theme.muted + ';';
        headerCopy.appendChild(subtitle);
        header.appendChild(headerCopy);

        var closeBtn = document.createElement('button');
        markExt(closeBtn);
        closeBtn.type = 'button';
        closeBtn.textContent = 'Close';
        applyTextActionStyle(closeBtn, isDark ? '#f3f4f6' : '#334155');
        closeBtn.addEventListener('click', function () {
            closePausedUrlRulesModal(reopenSettingsOnClose);
        });
        header.appendChild(closeBtn);
        modal.appendChild(header);

        var body = document.createElement('div');
        markExt(body);
        body.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

        var addSection = document.createElement('div');
        markExt(addSection);
        addSection.style.cssText = 'padding:2px 0 10px;border:0;background:transparent;';

        var addTitle = document.createElement('div');
        markExt(addTitle);
        addTitle.textContent = 'Add paused URL rule';
        addTitle.style.cssText = 'font-size:13px;font-weight:700;color:' + theme.heading + ';margin-bottom:4px;';
        addSection.appendChild(addTitle);

        var addHint = document.createElement('div');
        markExt(addHint);
        addHint.textContent = 'Examples: an exact lesson URL, a course homepage like https://learn.inside.dtu.dk/d2l/home/296283, or a legacy tool page with ?ou=296283.';
        addHint.style.cssText = 'font-size:11px;line-height:1.45;color:' + theme.muted + ';margin-bottom:8px;';
        addSection.appendChild(addHint);

        var inputRow = document.createElement('div');
        markExt(inputRow);
        inputRow.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:nowrap;margin:0 0 8px;';
        addSection.appendChild(inputRow);

        var ruleInput = document.createElement('input');
        markExt(ruleInput);
        ruleInput.type = 'text';
        ruleInput.setAttribute('aria-label', 'URL rule to pause');
        ruleInput.value = buildSuggestedPausePatternsForCurrentUrl()[0] || normalizeUrlPausePattern(window.location.origin + window.location.pathname + '*');
        ruleInput.placeholder = 'https://learn.inside.dtu.dk/d2l/home/296283';
        ruleInput.style.cssText = 'min-width:0;flex:1;box-sizing:border-box;padding:9px 10px;border:1px solid ' + theme.softBorder + ';'
            + 'background:' + (isDark ? 'rgba(17,17,17,0.92)' : '#ffffff') + ';color:' + theme.text + ';font-size:12px;'
            + 'line-height:1.4;margin:0;';
        inputRow.appendChild(ruleInput);

        var saveRuleBtn = document.createElement('button');
        markExt(saveRuleBtn);
        saveRuleBtn.type = 'button';
        saveRuleBtn.textContent = 'Save rule';
        applyTextActionStyle(saveRuleBtn, 'var(--dtu-ad-accent)');
        inputRow.appendChild(saveRuleBtn);

        var suggestionWrap = document.createElement('div');
        markExt(suggestionWrap);
        suggestionWrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-bottom:8px;';
        buildSuggestedPausePatternsForCurrentUrl().slice(0, 4).forEach(function (pattern) {
            var suggestionRow = document.createElement('div');
            markExt(suggestionRow);
            suggestionRow.style.cssText = 'display:block;padding:6px 0;border-top:1px solid ' + theme.softBorder + ';';

            var suggestionText = document.createElement('code');
            markExt(suggestionText);
            suggestionText.textContent = pattern;
            suggestionText.style.cssText = 'display:block;font-family:Consolas,Monaco,monospace;font-size:11px;line-height:1.5;color:' + theme.text + ';word-break:break-all;cursor:text;';
            suggestionRow.appendChild(suggestionText);
            suggestionRow.addEventListener('click', function () {
                ruleInput.value = pattern;
                try { ruleInput.focus(); } catch (e5) { }
            });
            suggestionWrap.appendChild(suggestionRow);
        });
        addSection.appendChild(suggestionWrap);

        var statusText = document.createElement('div');
        markExt(statusText);
        statusText.setAttribute('role', 'status');
        statusText.style.cssText = 'font-size:11px;line-height:1.45;color:' + theme.muted + ';min-height:16px;';
        addSection.appendChild(statusText);

        function setStatus(message, tone) {
            statusText.textContent = message || '';
            statusText.style.color = tone || theme.muted;
        }

        body.appendChild(addSection);

        var savedSection = document.createElement('div');
        markExt(savedSection);
        savedSection.style.cssText = 'padding:4px 0 0;border:0;background:transparent;';

        var savedHead = document.createElement('div');
        markExt(savedHead);
        savedHead.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;';

        var savedTitle = document.createElement('div');
        markExt(savedTitle);
        savedTitle.textContent = 'Saved paused URL rules';
        savedTitle.style.cssText = 'font-size:13px;font-weight:700;color:' + theme.heading + ';';
        savedHead.appendChild(savedTitle);

        var savedMeta = document.createElement('div');
        markExt(savedMeta);
        savedMeta.style.cssText = 'font-size:11px;line-height:1.4;color:' + theme.muted + ';';
        savedHead.appendChild(savedMeta);
        savedSection.appendChild(savedHead);

        var ruleList = document.createElement('div');
        markExt(ruleList);
        ruleList.style.cssText = 'display:flex;flex-direction:column;';
        savedSection.appendChild(ruleList);
        body.appendChild(savedSection);

        function removeRule(pattern) {
            var existingPatterns = getUrlPausePatterns();
            var wasMatchingCurrentPage = getMatchingUrlPausePatterns(currentUrl).indexOf(pattern) !== -1;
            var remaining = existingPatterns.filter(function (entry) {
                return entry !== pattern;
            });
            if (remaining.length === existingPatterns.length) {
                setStatus('That paused URL rule was already removed.', theme.muted);
                refreshRuleList();
                return;
            }
            var saved = saveUrlPausePatterns(remaining);
            if (wasMatchingCurrentPage) {
                closePausedUrlRulesModal(false);
                saved.then(function () { window.location.reload(); });
                return;
            }
            setStatus('Removed paused URL rule.', theme.muted);
            refreshRuleList();
        }

        function refreshRuleList() {
            var patterns = getUrlPausePatterns();
            var currentMatches = getMatchingUrlPausePatterns(currentUrl);
            ruleList.innerHTML = '';
            savedMeta.textContent = patterns.length ? String(patterns.length) + ' saved' : 'No saved rules';

            if (!patterns.length) {
                var empty = document.createElement('div');
                markExt(empty);
                empty.textContent = 'No paused URL rules saved right now.';
                empty.style.cssText = 'font-size:11px;line-height:1.5;color:' + theme.muted + ';padding:4px 0 2px;';
                ruleList.appendChild(empty);
                return;
            }

            patterns.forEach(function (pattern, index) {
                var row = document.createElement('div');
                markExt(row);
                row.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:12px;'
                    + 'padding:' + (index === 0 ? '0 0 8px' : '8px 0') + ';border-top:' + (index === 0 ? '0' : '1px solid ' + theme.softBorder) + ';';

                var copy = document.createElement('div');
                markExt(copy);
                copy.style.cssText = 'min-width:0;flex:1;';

                var patternText = document.createElement('code');
                markExt(patternText);
                patternText.textContent = pattern;
                patternText.style.cssText = 'display:block;font-family:Consolas,Monaco,monospace;font-size:11px;line-height:1.5;color:' + theme.text + ';word-break:break-all;';
                copy.appendChild(patternText);

                if (currentMatches.indexOf(pattern) !== -1) {
                    var matchText = document.createElement('div');
                    markExt(matchText);
                    matchText.textContent = 'Matches this page';
                    matchText.style.cssText = 'margin-top:3px;font-size:10px;line-height:1.4;color:var(--dtu-ad-accent-text, var(--dtu-ad-accent));';
                    copy.appendChild(matchText);
                }

                row.appendChild(copy);

                var removeBtn = document.createElement('button');
                markExt(removeBtn);
                removeBtn.type = 'button';
                removeBtn.textContent = 'Remove';
                removeBtn.setAttribute('aria-label', 'Remove paused rule ' + pattern);
                applyTextActionStyle(removeBtn, '#d14343');
                removeBtn.addEventListener('click', function () {
                    removeRule(pattern);
                });
                row.appendChild(removeBtn);
                ruleList.appendChild(row);
            });
        }

        function saveRule() {
            var normalized = normalizeUrlPausePattern(ruleInput.value);
            if (!normalized) {
                setStatus('Enter a URL rule to pause first.', '#d14343');
                return;
            }
            if (isPauseProtectedPattern(normalized)) {
                setStatus('The main DTU Learn home entry stays active so the Settings menu cannot be paused away.', '#d14343');
                return;
            }
            var patterns = getUrlPausePatterns();
            if (patterns.indexOf(normalized) !== -1) {
                setStatus('That URL rule is already paused.', theme.muted);
                refreshRuleList();
                return;
            }
            patterns.push(normalized);
            var saved = saveUrlPausePatterns(patterns);
            if (getMatchingUrlPausePatterns(currentUrl).indexOf(normalized) !== -1) {
                closePausedUrlRulesModal(false);
                saved.then(function () { window.location.reload(); });
                return;
            }
            setStatus('Saved paused URL rule.', 'var(--dtu-ad-accent)');
            refreshRuleList();
        }

        saveRuleBtn.addEventListener('click', saveRule);
        ruleInput.addEventListener('keydown', function (e6) {
            if (e6.key === 'Enter' && !e6.isComposing && e6.keyCode !== 229) {
                e6.preventDefault();
                saveRule();
            }
        });

        modal.appendChild(body);
        overlay.appendChild(modal);

        // mousedown, as in Settings: a text drag that ends on the backdrop must not close it.
        overlay.addEventListener('mousedown', function (e7) {
            if (e7.target === overlay) closePausedUrlRulesModal(reopenSettingsOnClose);
        });
        var pausedKeyHandler = function (e8) {
            if (e8.key === 'Escape') {
                e8.preventDefault();
                e8.stopPropagation();
                closePausedUrlRulesModal(reopenSettingsOnClose);
                return;
            }
            if (e8.key !== 'Tab') return;
            var controls = Array.prototype.filter.call(
                modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'),
                function (el) { return el.getClientRects().length > 0 || el === document.activeElement; }
            );
            if (!controls.length) { e8.preventDefault(); modal.focus(); return; }
            var first = controls[0];
            var last = controls[controls.length - 1];
            var active = document.activeElement;
            if (!modal.contains(active) || (e8.shiftKey && (active === first || active === modal)) || (!e8.shiftKey && active === last)) {
                e8.preventDefault();
                (e8.shiftKey ? last : first).focus();
            }
        };
        var previousOverflow = { html: document.documentElement.style.overflow, body: document.body.style.overflow };
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', pausedKeyHandler, true);
        overlay._dtuPausedCleanup = function () {
            document.removeEventListener('keydown', pausedKeyHandler, true);
            document.documentElement.style.overflow = previousOverflow.html;
            document.body.style.overflow = previousOverflow.body;
            var focusTarget = previousFocus && previousFocus.isConnected ? previousFocus : document.querySelector('.dtu-settings-nav-item button');
            if (focusTarget) { try { focusTarget.focus({ preventScroll: true }); } catch (eFocus) { } }
        };

        document.body.appendChild(overlay);
        refreshRuleList();

        requestAnimationFrame(function () {
            overlay.style.opacity = '1';
            try { overlay.focus(); } catch (e9) { }
            try {
                if (initialFocus === 'list') {
                    var firstRemove = ruleList.querySelector('button');
                    if (firstRemove) firstRemove.focus();
                    else ruleInput.focus();
                } else {
                    ruleInput.focus();
                    ruleInput.select();
                }
            } catch (e10) { }
        });
    }

    try {
        globalThis.DTUAfterDarkSettingsPause = {
            removePausedUrlRulesModal: removePausedUrlRulesModal,
            showPausedUrlRulesModal: showPausedUrlRulesModal
        };
    } catch (eSettingsPause) { }
})();
