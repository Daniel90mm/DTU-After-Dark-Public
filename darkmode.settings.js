(function () {
    'use strict';

    function getDeps() {
        try { return globalThis.DTUAfterDarkSettingsDeps || null; } catch (e0) { return null; }
    }

    function callDep(name, args, fallback) {
        var deps = getDeps();
        if (deps && typeof deps[name] === 'function') {
            return deps[name].apply(null, args || []);
        }
        return fallback;
    }

    function getDepValue(name, fallback) {
        var deps = getDeps();
        if (deps && Object.prototype.hasOwnProperty.call(deps, name)) return deps[name];
        return fallback;
    }

    function isTopWindow() {
        return !!callDep('isTopWindow', [], false);
    }

    function isDarkModeEnabled() {
        return !!callDep('isDarkModeEnabled', [], false);
    }

    function getCurrentUrlWithoutHash() {
        return callDep('getCurrentUrlWithoutHash', [], window.location.origin + window.location.pathname + window.location.search);
    }

    function buildSuggestedPausePatternsForCurrentUrl() {
        return callDep('buildSuggestedPausePatternsForCurrentUrl', [], []) || [];
    }

    function normalizeUrlPausePattern(pattern) {
        return callDep('normalizeUrlPausePattern', [pattern], '');
    }

    function isPauseProtectedPattern(pattern) {
        return !!callDep('isPauseProtectedPattern', [pattern], false);
    }

    function getUrlPausePatterns() {
        return callDep('getUrlPausePatterns', [], []) || [];
    }

    function saveUrlPausePatterns(patterns) {
        callDep('saveUrlPausePatterns', [patterns], null);
    }

    function getMatchingUrlPausePatterns(url) {
        return callDep('getMatchingUrlPausePatterns', [url], []) || [];
    }

    function markExt(el) {
        callDep('markExt', [el], null);
        return el;
    }

    function applyAfterDarkAdminMenuThemeVars(rootEl) {
        callDep('applyAfterDarkAdminMenuThemeVars', [rootEl], null);
    }

    function getFeatureKeys() {
        return callDep('getFeatureKeys', [], {}) || {};
    }

    function getSettingKeys() {
        return callDep('getSettingKeys', [], {
            busEnabled: 'dtuDarkModeBusEnabled',
            deadlinesEnabled: 'dtuDarkModeDeadlinesEnabled',
            searchWidgetEnabled: 'dtuDarkModeSearchWidgetEnabled'
        }) || {};
    }

    function saveDarkModePreference(enabled) {
        callDep('saveDarkModePreference', [enabled], null);
    }

    function isMojanglesEnabled() {
        return !!callDep('isMojanglesEnabled', [], true);
    }

    function insertMojanglesText() {
        callDep('insertMojanglesText', [], null);
    }

    function isBusEnabled() {
        return !!callDep('isBusEnabled', [], false);
    }

    function isApiQuotaExhausted() {
        return !!callDep('isApiQuotaExhausted', [], false);
    }

    function showQuotaExhaustedMessage(scope) {
        callDep('showQuotaExhaustedMessage', [scope], null);
    }

    function getBusConfig() {
        return callDep('getBusConfig', [], null);
    }

    function showBusConfigModal() {
        callDep('showBusConfigModal', [], null);
    }

    function stopBusPolling() {
        callDep('stopBusPolling', [], null);
    }

    function abortInFlightBusRequests() {
        callDep('abortInFlightBusRequests', [], null);
    }

    function insertBusDisplay() {
        callDep('insertBusDisplay', [], null);
    }

    function updateBusDepartures() {
        callDep('updateBusDepartures', [], null);
    }

    function forceBusImmediateRefresh() {
        callDep('forceBusImmediateRefresh', [], null);
    }

    function isDeadlinesEnabled() {
        return !!callDep('isDeadlinesEnabled', [], false);
    }

    function insertDeadlinesHomepageWidget() {
        callDep('insertDeadlinesHomepageWidget', [], null);
    }

    function isSearchWidgetEnabled() {
        return !!callDep('isSearchWidgetEnabled', [], false);
    }

    function isFeatureFlagEnabled(key) {
        return !!callDep('isFeatureFlagEnabled', [key], false);
    }

    function setFeatureFlagEnabled(key, enabled) {
        callDep('setFeatureFlagEnabled', [key, enabled], null);
    }

    function insertBookFinderLinks() {
        callDep('insertBookFinderLinks', [], null);
    }

    function insertGPARow() {
        callDep('insertGPARow', [], null);
    }

    function insertECTSProgressBar() {
        callDep('insertECTSProgressBar', [], null);
    }

    function insertGPASimulator() {
        callDep('insertGPASimulator', [], null);
    }

    function syncCampusnetActualGradeExclusionControls() {
        callDep('syncCampusnetActualGradeExclusionControls', [], null);
    }

    function insertKurserGradeStats() {
        callDep('insertKurserGradeStats', [], null);
    }

    function insertKurserTextbookLinks() {
        callDep('insertKurserTextbookLinks', [], null);
    }

    function scheduleStudyplanExamCluster(delayMs) {
        callDep('scheduleStudyplanExamCluster', [delayMs], null);
    }

    function insertKurserCourseEvaluation() {
        callDep('insertKurserCourseEvaluation', [], null);
    }

    function insertKurserRoomFinder() {
        callDep('insertKurserRoomFinder', [], null);
    }

    function scheduleSmartRoomLinkerScan(root, delayMs) {
        callDep('scheduleSmartRoomLinkerScan', [root, delayMs], null);
    }

    function removeSmartRoomLinks() {
        callDep('removeSmartRoomLinks', [], null);
    }

    function annotateKurserSchedulePlacement() {
        callDep('annotateKurserSchedulePlacement', [], null);
    }

    function insertContentButtons() {
        callDep('insertContentButtons', [], null);
    }

    function startContentButtonBootstrap() {
        callDep('startContentButtonBootstrap', [], null);
    }

    function removeContentButtons() {
        callDep('removeContentButtons', [], null);
    }

    function insertDTULearnNavResourceLinks() {
        callDep('insertDTULearnNavResourceLinks', [], null);
    }

    function removeDTULearnNavResourceLinks() {
        callDep('removeDTULearnNavResourceLinks', [], null);
    }

    function insertParticipantIntelligence() {
        callDep('insertParticipantIntelligence', [], null);
    }

    function insertKurserMyLineBadge() {
        callDep('insertKurserMyLineBadge', [], null);
    }

    function insertLibraryNavDropdown() {
        callDep('insertLibraryNavDropdown', [], null);
    }

    function removeLibraryNavDropdown() {
        callDep('removeLibraryNavDropdown', [], null);
    }

    function runLessonsBulkDownloadChecks() {
        callDep('runLessonsBulkDownloadChecks', [], null);
    }

    function showContentShortcutOverridesModal() {
        callDep('showContentShortcutOverridesModal', [], null);
    }

    function getAccentThemeId() {
        return callDep('getAccentThemeId', [], 'corporate-red');
    }

    function getAccentCustomHex() {
        return callDep('getAccentCustomHex', [], '');
    }

    function setAccentThemeId(nextId) {
        callDep('setAccentThemeId', [nextId], null);
    }

    function setAccentCustomHex(nextHex) {
        callDep('setAccentCustomHex', [nextHex], null);
    }

    function getAccentThemeOrder() {
        var out = getDepValue('accentThemeOrder', []);
        return Array.isArray(out) ? out.slice() : [];
    }

    function getAccentThemes() {
        return getDepValue('accentThemes', {}) || {};
    }

    function getAccentCustomDefault() {
        return getDepValue('accentCustomDefault', '#990000');
    }

    function applyFeatureToggleImmediately(featureKey, enabled) {
        var featureKeys = getFeatureKeys();
        if (featureKey === featureKeys.bookFinder) {
            if (enabled) {
                insertBookFinderLinks();
            } else {
                document.querySelectorAll('[data-book-finder-bar]').forEach(function (el) { el.remove(); });
                document.querySelectorAll('[data-book-finder-injected]').forEach(function (el) {
                    el.removeAttribute('data-book-finder-injected');
                });
            }
        }
        if (featureKey === featureKeys.campusnetGpaTools && window.location.hostname === 'campusnet.dtu.dk') {
            insertGPARow();
            insertECTSProgressBar();
            insertGPASimulator();
            syncCampusnetActualGradeExclusionControls();
        }
        if (featureKey === featureKeys.kurserGradeStats && window.location.hostname === 'kurser.dtu.dk') {
            insertKurserGradeStats();
        }
        if (featureKey === featureKeys.kurserTextbookLinker && window.location.hostname === 'kurser.dtu.dk') {
            insertKurserTextbookLinks();
        }
        if (featureKey === featureKeys.studyplanExamCluster && window.location.hostname === 'studieplan.dtu.dk') {
            scheduleStudyplanExamCluster(80);
        }
        if (featureKey === featureKeys.kurserCourseEval && window.location.hostname === 'kurser.dtu.dk') {
            insertKurserCourseEvaluation();
        }
        if (featureKey === featureKeys.kurserRoomFinder && window.location.hostname === 'kurser.dtu.dk') {
            insertKurserRoomFinder();
        }
        if (featureKey === featureKeys.smartRoomLinker) {
            if (enabled) {
                scheduleSmartRoomLinkerScan(null, 140);
            } else {
                removeSmartRoomLinks();
            }
            if (window.location.hostname === 'kurser.dtu.dk') insertKurserRoomFinder();
        }
        if (featureKey === featureKeys.kurserScheduleAnnotation && window.location.hostname === 'kurser.dtu.dk') {
            annotateKurserSchedulePlacement();
        }
        if (featureKey === featureKeys.contentShortcut && window.location.hostname === 'learn.inside.dtu.dk') {
            if (enabled) {
                insertContentButtons();
                startContentButtonBootstrap();
            } else {
                removeContentButtons();
            }
        }
        if (featureKey === featureKeys.learnNavResourceLinks && window.location.hostname === 'learn.inside.dtu.dk') {
            if (enabled) {
                insertDTULearnNavResourceLinks();
            } else {
                removeDTULearnNavResourceLinks();
            }
        }
        if (featureKey === featureKeys.participantIntel) {
            if (window.location.hostname === 'campusnet.dtu.dk') {
                insertParticipantIntelligence();
            }
        }
        if (featureKey === featureKeys.kurserMyLineBadges && window.location.hostname === 'kurser.dtu.dk') {
            insertKurserMyLineBadge();
        }
        if (featureKey === featureKeys.libraryDropdown && window.location.hostname === 'learn.inside.dtu.dk') {
            if (enabled) {
                insertLibraryNavDropdown();
            } else {
                removeLibraryNavDropdown();
            }
        }
        if (featureKey === featureKeys.deadlinesTimelineRail && window.location.hostname === 'learn.inside.dtu.dk') {
            var existingDeadlines = document.querySelector('.dtu-deadlines-home-widget');
            if (existingDeadlines) existingDeadlines.remove();
            insertDeadlinesHomepageWidget();
        }
        if (featureKey === featureKeys.learnLessonsBulkDownload && window.location.hostname === 'learn.inside.dtu.dk') {
            try { runLessonsBulkDownloadChecks(); } catch (eLbd0) { }
        }
    }

    function hideSettingsModal() {
        var overlay = document.querySelector('.dtu-settings-modal-overlay');
        if (overlay) overlay.remove();
        try {
            var settingsBtn = document.querySelector('.dtu-settings-nav-item button');
            if (settingsBtn) settingsBtn.setAttribute('aria-expanded', 'false');
        } catch (e0) { }
    }

    function getAfterDarkDisclaimerText() {
        return 'DTU After Dark is unofficial and not affiliated with DTU, Arcanic, or any service provider. '
            + 'Information shown (exam dates, deadlines, grades, bus times) may be inaccurate or outdated. '
            + 'Always verify critical information through official DTU channels. '
            + 'The developer(s) accept no responsibility for any consequences arising from the use of this extension.';
    }

    function getAfterDarkDebugIdeasMailtoHref() {
        var subject = 'DTU After Dark - Debug/Ideas';
        var body = 'Hi Daniel,\n\nPage URL:\n\nIdea or issue:\n';
        return 'mailto:daniel-yttesen@hotmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    }

    function removePausedUrlRulesModal() {
        var existing = document.querySelector('.dtu-paused-url-rules-modal');
        if (existing) existing.remove();
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
        try { hideSettingsModal(); } catch (e0) { }

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
                btn.style.setProperty('outline', 'none', 'important');
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
                    try { showSettingsModal(); } catch (e4) { }
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
            saveUrlPausePatterns(remaining);
            if (wasMatchingCurrentPage) {
                closePausedUrlRulesModal(false);
                window.location.reload();
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
                    matchText.style.cssText = 'margin-top:3px;font-size:10px;line-height:1.4;color:var(--dtu-ad-accent);';
                    copy.appendChild(matchText);
                }

                row.appendChild(copy);

                var removeBtn = document.createElement('button');
                markExt(removeBtn);
                removeBtn.type = 'button';
                removeBtn.textContent = 'Remove';
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
            saveUrlPausePatterns(patterns);
            if (getMatchingUrlPausePatterns(currentUrl).indexOf(normalized) !== -1) {
                closePausedUrlRulesModal(false);
                window.location.reload();
                return;
            }
            setStatus('Saved paused URL rule.', 'var(--dtu-ad-accent)');
            refreshRuleList();
        }

        saveRuleBtn.addEventListener('click', saveRule);
        ruleInput.addEventListener('keydown', function (e6) {
            if (e6.key === 'Enter') {
                e6.preventDefault();
                saveRule();
            }
        });

        modal.appendChild(body);
        overlay.appendChild(modal);

        overlay.addEventListener('click', function (e7) {
            if (e7.target === overlay) closePausedUrlRulesModal(reopenSettingsOnClose);
        });
        overlay.addEventListener('keydown', function (e8) {
            if (e8.key === 'Escape') {
                e8.preventDefault();
                closePausedUrlRulesModal(reopenSettingsOnClose);
            }
        });

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

    function createAfterDarkDisclaimerFooter() {
        var disclaimerFooter = document.createElement('div');
        markExt(disclaimerFooter);
        disclaimerFooter.style.cssText = 'padding:12px 18px 14px;font-size:10.5px;line-height:1.45;color:var(--dtu-am-muted);border-top:1px solid var(--dtu-am-border);margin-top:auto;';

        var textNode = document.createElement('span');
        markExt(textNode);
        textNode.textContent = getAfterDarkDisclaimerText();
        disclaimerFooter.appendChild(textNode);

        var actionRow = document.createElement('div');
        markExt(actionRow);
        actionRow.style.cssText = 'display:flex;align-items:center;gap:18px;flex-wrap:nowrap;overflow-x:auto;margin-top:10px;padding-bottom:2px;';

        function applyFooterActionTextStyle(btn) {
            btn.style.cssText = 'display:inline-flex;align-items:center;justify-content:flex-start;'
                + 'appearance:none;-webkit-appearance:none;margin:0;padding:0;border:0;background:transparent;'
                + 'color:var(--dtu-am-active-text);font-size:11px;font-weight:700;line-height:1.45;cursor:pointer;'
                + 'white-space:nowrap;text-decoration:none;';
            try {
                btn.style.setProperty('background', 'transparent', 'important');
                btn.style.setProperty('background-color', 'transparent', 'important');
                btn.style.setProperty('background-image', 'none', 'important');
                btn.style.setProperty('border', '0', 'important');
                btn.style.setProperty('box-shadow', 'none', 'important');
                btn.style.setProperty('outline', 'none', 'important');
            } catch (e00) { }
            btn.addEventListener('mouseenter', function () {
                try {
                    btn.style.textDecoration = 'underline';
                    btn.style.setProperty('background', 'transparent', 'important');
                    btn.style.setProperty('background-color', 'transparent', 'important');
                    btn.style.setProperty('box-shadow', 'none', 'important');
                } catch (e0) { }
            });
            btn.addEventListener('mouseleave', function () {
                try {
                    btn.style.textDecoration = 'none';
                    btn.style.setProperty('background', 'transparent', 'important');
                    btn.style.setProperty('background-color', 'transparent', 'important');
                    btn.style.setProperty('box-shadow', 'none', 'important');
                } catch (e1) { }
            });
            btn.addEventListener('mousedown', function () {
                try {
                    btn.style.setProperty('background', 'transparent', 'important');
                    btn.style.setProperty('background-color', 'transparent', 'important');
                    btn.style.setProperty('box-shadow', 'none', 'important');
                } catch (e2) { }
            });
            btn.addEventListener('mouseup', function () {
                try {
                    btn.style.setProperty('background', 'transparent', 'important');
                    btn.style.setProperty('background-color', 'transparent', 'important');
                    btn.style.setProperty('box-shadow', 'none', 'important');
                } catch (e3) { }
            });
            btn.addEventListener('focus', function () {
                try {
                    btn.style.setProperty('background', 'transparent', 'important');
                    btn.style.setProperty('background-color', 'transparent', 'important');
                    btn.style.setProperty('box-shadow', 'none', 'important');
                } catch (e4) { }
            });
        }

        var debugIdeasBtn = document.createElement('button');
        markExt(debugIdeasBtn);
        debugIdeasBtn.type = 'button';
        debugIdeasBtn.textContent = 'Send feedback or bug report';
        debugIdeasBtn.setAttribute('aria-label', 'Send feedback or bug report by email');
        applyFooterActionTextStyle(debugIdeasBtn);
        debugIdeasBtn.addEventListener('click', function (e) {
            try { if (e) e.preventDefault(); } catch (e0) { }
            try { if (e) e.stopPropagation(); } catch (e1) { }
            try { window.location.href = getAfterDarkDebugIdeasMailtoHref(); } catch (e2) { }
        });
        actionRow.appendChild(debugIdeasBtn);

        var pausedUrlsBtn = document.createElement('button');
        markExt(pausedUrlsBtn);
        pausedUrlsBtn.type = 'button';
        pausedUrlsBtn.textContent = 'Paused URLs...';
        pausedUrlsBtn.setAttribute('aria-label', 'Manage paused URL rules');
        applyFooterActionTextStyle(pausedUrlsBtn);
        pausedUrlsBtn.addEventListener('click', function (e) {
            try { if (e) e.preventDefault(); } catch (e0) { }
            try { if (e) e.stopPropagation(); } catch (e1) { }
            showPausedUrlRulesModal({ reopenSettingsOnClose: true, initialFocus: 'add' });
        });
        actionRow.appendChild(pausedUrlsBtn);

        disclaimerFooter.appendChild(actionRow);
        return disclaimerFooter;
    }

    function showSettingsModal() {
        if (!isTopWindow()) return;
        hideSettingsModal();

        var isDark = isDarkModeEnabled();
        var featureKeys = getFeatureKeys();
        var settingKeys = getSettingKeys();

        var toggleHandlers = {
            'dark-mode-toggle': {
                getState: function () { return isDarkModeEnabled(); },
                onChange: function (checked) { saveDarkModePreference(checked); location.reload(); }
            },
            'mojangles-toggle': {
                getState: function () { return isMojanglesEnabled(); },
                onChange: function (checked) {
                    localStorage.setItem('mojanglesTextEnabled', checked.toString());
                    insertMojanglesText();
                }
            },
            'bus-departures-toggle': {
                getState: function () { return isBusEnabled(); },
                onChange: function (checked, input) {
                    if (checked && isApiQuotaExhausted()) {
                        input.checked = false;
                        showQuotaExhaustedMessage('monthly');
                        return;
                    }
                    localStorage.setItem(settingKeys.busEnabled, checked.toString());
                    if (checked) {
                        var config = getBusConfig();
                        if (!config || !config.lines || !config.lines.length) {
                            hideSettingsModal();
                            showBusConfigModal();
                        } else {
                            forceBusImmediateRefresh();
                        }
                    } else {
                        stopBusPolling();
                        abortInFlightBusRequests();
                        insertBusDisplay();
                    }
                },
                hasEdit: true,
                onEdit: function () {
                    hideSettingsModal();
                    showBusConfigModal();
                }
            },
            'deadlines-toggle': {
                getState: function () { return isDeadlinesEnabled(); },
                onChange: function (checked) {
                    localStorage.setItem(settingKeys.deadlinesEnabled, checked.toString());
                    insertDeadlinesHomepageWidget();
                }
            },
            'search-widget-toggle': {
                getState: function () { return isSearchWidgetEnabled(); },
                onChange: function (checked) {
                    localStorage.setItem(settingKeys.searchWidgetEnabled, checked.toString());
                    insertDeadlinesHomepageWidget();
                }
            }
        };

        [
            { id: 'feature-content-shortcut-toggle', key: featureKeys.contentShortcut },
            { id: 'feature-learn-nav-resource-links-toggle', key: featureKeys.learnNavResourceLinks },
            { id: 'library-dropdown-toggle', key: featureKeys.libraryDropdown },
            { id: 'feature-deadlines-timeline-rail-toggle', key: featureKeys.deadlinesTimelineRail },
            { id: 'feature-lessons-bulk-download-toggle', key: featureKeys.learnLessonsBulkDownload },
            { id: 'feature-lessons-bulk-single-zip-toggle', key: featureKeys.learnLessonsBulkSingleZip },
            { id: 'feature-campusnet-gpa-tools-toggle', key: featureKeys.campusnetGpaTools },
            { id: 'feature-participant-intel-toggle', key: featureKeys.participantIntel },
            { id: 'feature-participant-intel-demographics-toggle', key: featureKeys.participantIntelDemographics },
            { id: 'feature-participant-intel-shared-history-toggle', key: featureKeys.participantIntelSharedHistory },
            { id: 'feature-participant-intel-retention-toggle', key: featureKeys.participantIntelRetention },
            { id: 'feature-kurser-grade-stats-toggle', key: featureKeys.kurserGradeStats },
            { id: 'feature-book-finder-toggle', key: featureKeys.bookFinder },
            { id: 'feature-kurser-textbook-linker-toggle', key: featureKeys.kurserTextbookLinker },
            { id: 'feature-kurser-course-eval-toggle', key: featureKeys.kurserCourseEval },
            { id: 'feature-kurser-myline-badges-toggle', key: featureKeys.kurserMyLineBadges },
            { id: 'feature-kurser-room-finder-toggle', key: featureKeys.kurserRoomFinder },
            { id: 'feature-smart-room-linker-toggle', key: featureKeys.smartRoomLinker },
            { id: 'feature-kurser-schedule-annotation-toggle', key: featureKeys.kurserScheduleAnnotation }
        ].forEach(function (ft) {
            if (!ft.key) return;
            toggleHandlers[ft.id] = {
                getState: function () { return isFeatureFlagEnabled(ft.key); },
                onChange: function (checked) {
                    setFeatureFlagEnabled(ft.key, checked);
                    applyFeatureToggleImmediately(ft.key, checked);
                }
            };
        });

        if (toggleHandlers['feature-content-shortcut-toggle']) {
            toggleHandlers['feature-content-shortcut-toggle'].hasEdit = true;
            toggleHandlers['feature-content-shortcut-toggle'].onEdit = function () {
                hideSettingsModal();
                showContentShortcutOverridesModal();
            };
        }

        var categories = [
            {
                id: 'appearance', label: 'Appearance', desc: 'Theme and visual settings', items: [
                    { tid: 'dark-mode-toggle', title: 'Dark Mode', desc: 'Global dark theme for all DTU sites' },
                    { kind: 'accent-theme', title: 'Accent Color', desc: 'Official DTU color presets plus custom (default: DTU Corporate Red)' },
                    { tid: 'mojangles-toggle', title: 'Mojangles Font', desc: 'Use the Minecraft font for headers' }
                ]
            },
            {
                id: 'interface', label: 'Shortcuts & Navigation', desc: 'Quick links, nav entries, and shortcut actions', items: [
                    { tid: 'feature-learn-nav-resource-links-toggle', title: 'Navigation Quick Links', desc: 'Adds Panopto and CampusNet to the Student Resources menu' },
                    { tid: 'feature-content-shortcut-toggle', title: 'Content Shortcut', desc: 'Direct link from course cards (Ctrl/Cmd+Shift+Click a button to set a custom link)' },
                    { tid: 'library-dropdown-toggle', title: 'Library', desc: 'Quick links and live events/news from DTU Library' },
                    { tid: 'feature-smart-room-linker-toggle', title: 'Room links', desc: 'Turn room mentions into MazeMap links (click-to-resolve)' }
                ]
            },
            {
                id: 'dashboard', label: 'Dashboard Widgets', desc: 'DTU Learn homepage widgets and dashboard cards', items: [
                    { tid: 'bus-departures-toggle', title: 'Bus Departures', desc: 'Show live bus departure times around campus' },
                    { tid: 'deadlines-toggle', title: 'Deadlines Widget', desc: 'Timeline of upcoming assignments' },
                    { tid: 'feature-deadlines-timeline-rail-toggle', title: 'Deadlines Timeline', desc: 'Experimental rail redesign for the deadlines widget', subToggleOf: 'deadlines-toggle' },
                    { tid: 'search-widget-toggle', title: 'Course Search', desc: 'Native course search on the dashboard' },
                    { tid: 'feature-lessons-bulk-download-toggle', title: 'Course Content Download', desc: 'Enable course content download tools in DTU Learn Lessons pages' },
                    { tid: 'feature-lessons-bulk-single-zip-toggle', title: 'Bulk Download', desc: 'Download selected section files as one ZIP bundle', subToggleOf: 'feature-lessons-bulk-download-toggle' }
                ]
            },
            {
                id: 'study-tools', label: 'Study Tools', desc: 'Academic planning features', items: [
                    { tid: 'feature-campusnet-gpa-tools-toggle', title: 'GPA Calculator', desc: 'Weighted grade average on CampusNet' },
                ]
            },
            {
                id: 'social', label: 'Social', desc: 'Participant intelligence tools', items: [
                    { tid: 'feature-participant-intel-toggle', title: 'Participant Intelligence', desc: 'Master switch for the whole suite' },
                    { tid: 'feature-participant-intel-demographics-toggle', title: 'Course Composition', desc: 'Program breakdown on CampusNet participant pages', subToggleOf: 'feature-participant-intel-toggle' },
                    { tid: 'feature-participant-intel-shared-history-toggle', title: 'Shared Course History', desc: 'Badges on participant lists + profile history card', subToggleOf: 'feature-participant-intel-toggle' },
                    { tid: 'feature-participant-intel-retention-toggle', title: 'Retention Radar', desc: 'Tracks Users enrollment count over time', subToggleOf: 'feature-participant-intel-toggle' }
                ]
            },
            {
                id: 'course-catalog', label: 'Course Catalog', desc: 'Enhancements for kurser.dtu.dk and course resource pages', items: [
                    { tid: 'feature-kurser-grade-stats-toggle', title: 'Grade Statistics', desc: 'Show pass rates and grade histograms' },
                    { tid: 'feature-book-finder-toggle', title: 'Book Finder', desc: 'Find textbooks from DTU Learn pages' },
                    { tid: 'feature-kurser-textbook-linker-toggle', title: 'Textbook Links', desc: 'Direct links to textbooks on DTU FindIt' },
                    { tid: 'feature-kurser-course-eval-toggle', title: 'Course Evaluation', desc: 'Show evaluation scores on course pages' },
                    { tid: 'feature-kurser-myline-badges-toggle', title: 'MyLine Curriculum Badges', desc: 'Mark courses as Mandatory/Core/Elective pool based on your study line' },
                    { tid: 'feature-kurser-room-finder-toggle', title: 'Room Finder', desc: 'Clickable room numbers with locations' },
                    { tid: 'feature-kurser-schedule-annotation-toggle', title: 'Schedule Annotation', desc: 'Enhanced schedule view on course pages' }
                ]
            }
        ];

        var styleEl = document.querySelector('#dtu-settings-styles');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'dtu-settings-styles';
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = ''
            + '.dtu-am-root,.dtu-am-root *{box-sizing:border-box}'
            + '.dtu-am-root{display:flex;width:100%;max-width:100%;height:600px;max-height:calc(100vh - 140px);'
            + 'overflow:hidden;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'
            + 'background:var(--dtu-am-content-bg) !important;color:var(--dtu-am-text) !important}'
            + '.dtu-am-sidebar{width:170px;min-width:170px;overflow-x:hidden;overflow-y:auto;'
            + 'padding:14px 0;display:flex;flex-direction:column;gap:1px;'
            + 'background:var(--dtu-am-sidebar-bg) !important;border-right:1px solid var(--dtu-am-border) !important}'
            + '.dtu-am-content{flex:1;min-width:0;min-height:0;height:100%;display:flex;flex-direction:column;'
            + 'overflow-x:hidden;overflow-y:auto;padding:20px 34px 20px 24px;'
            + 'background:var(--dtu-am-content-bg) !important}'
            + '.dtu-am-content::-webkit-scrollbar,.dtu-am-sidebar::-webkit-scrollbar{width:0;height:0}'
            + '.dtu-am-content,.dtu-am-sidebar{-ms-overflow-style:none;scrollbar-width:none}'
            + '.dtu-am-sidebar-hd{padding:0 14px 10px;border-bottom:1px solid var(--dtu-am-border) !important;margin-bottom:6px}'
            + '.dtu-am-brand{font-size:14px;font-weight:700;color:var(--dtu-am-text) !important}'
            + '.dtu-am-sub{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'
            + 'color:var(--dtu-am-muted) !important;margin-top:2px}'
            + '.dtu-am-panel{display:none !important}'
            + '.dtu-am-panel.dtu-active{display:block !important}'
            + '.dtu-am-panel-title{font-size:18px;font-weight:600;color:var(--dtu-am-text) !important;margin:0 0 2px}'
            + '.dtu-am-panel-desc{font-size:12px;color:var(--dtu-am-muted) !important;margin-bottom:16px}'
            + '.dtu-nav-i{padding:8px 14px;cursor:pointer;border-radius:6px;margin:2px 6px;transition:background .15s;user-select:none;-webkit-user-select:none;'
            + 'font-size:13px;color:var(--dtu-am-text) !important;border-left:3px solid transparent}'
            + '.dtu-nav-i:hover{background:var(--dtu-am-hover) !important}'
            + '.dtu-nav-i.dtu-active{background:var(--dtu-am-active-bg) !important;border-left-color:var(--dtu-am-accent) !important;'
            + 'color:var(--dtu-am-active-text) !important;font-weight:600}'
            + '.dtu-set-row{display:flex;align-items:center;justify-content:space-between;gap:16px;'
            + 'padding:12px 0;border-bottom:1px solid var(--dtu-am-border) !important}'
            + '.dtu-set-row:last-child{border-bottom:none}'
            + '.dtu-set-row.dtu-set-row-sub{margin-left:18px;padding-left:12px;padding-top:9px;padding-bottom:9px;'
            + 'border-bottom:1px dashed var(--dtu-am-border) !important;border-left:2px solid rgba(var(--dtu-ad-accent-rgb),0.32) !important;}'
            + '.dtu-set-row.dtu-set-row-sub .dtu-am-title{font-size:12px;font-weight:600;}'
            + '.dtu-set-row.dtu-set-row-sub .dtu-am-desc{font-size:10.5px;}'
            + '.dtu-am-info{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}'
            + '.dtu-am-title{font-size:13px;font-weight:600;color:var(--dtu-am-text) !important;'
            + 'white-space:normal;overflow-wrap:anywhere;word-break:break-word;max-width:100%}'
            + '.dtu-am-desc{font-size:11px;color:var(--dtu-am-muted) !important;line-height:1.25;'
            + 'white-space:normal;overflow-wrap:anywhere;word-break:break-word;max-width:100%}'
            + '.dtu-am-link{font-size:11px;line-height:1.25;color:var(--dtu-am-action) !important;'
            + 'text-decoration:none !important;margin-top:1px}'
            + '.dtu-am-link:hover{text-decoration:underline !important;color:var(--dtu-am-accent) !important}'
            + '.dtu-am-actions{display:flex;align-items:center;gap:10px;flex-shrink:0}'
            + '.dtu-am-edit{background:transparent;border:1px solid var(--dtu-am-border) !important;'
            + 'color:var(--dtu-am-action) !important;padding:6px 10px;border-radius:8px;cursor:pointer;'
            + 'font-size:12px;font-weight:700;line-height:1;white-space:nowrap}'
            + '.dtu-am-swatch{width:14px;height:14px;border-radius:999px;flex:0 0 auto;'
            + 'background:var(--dtu-am-accent) !important;border:1px solid var(--dtu-am-border) !important}'
            + '.dtu-am-select{min-width:140px;width:200px;max-width:240px;flex:0 1 auto;padding:6px 10px;border-radius:10px;'
            + 'background:var(--dtu-am-input-bg) !important;background-color:var(--dtu-am-input-bg) !important;'
            + 'color:var(--dtu-am-text) !important;border:1px solid var(--dtu-am-border) !important;'
            + 'font-size:12px;font-weight:700;cursor:pointer}'
            + '.dtu-am-select:focus{outline:none;border-color:var(--dtu-am-accent) !important;'
            + 'box-shadow:0 0 0 3px var(--dtu-am-accent-ring) !important}'
            + '.dtu-am-color{width:36px;height:30px;padding:0;margin:0;border-radius:8px;cursor:pointer;'
            + 'appearance:none;-webkit-appearance:none;-moz-appearance:none;overflow:hidden;box-sizing:border-box;'
            + 'border:1px solid var(--dtu-am-border) !important;'
            + 'background:var(--dtu-am-input-bg) !important;background-color:var(--dtu-am-input-bg) !important}'
            + '.dtu-am-color::-webkit-color-swatch-wrapper{padding:0}'
            + '.dtu-am-color::-webkit-color-swatch{border:none;border-radius:7px}'
            + '.dtu-am-color::-moz-color-swatch{border:none;border-radius:7px}'
            + '.dtu-am-color::-moz-focus-inner{border:0;padding:0}'
            + '.dtu-tog{position:relative;display:inline-block;width:40px;height:22px;flex-shrink:0}'
            + '.dtu-tog input{opacity:0;width:0;height:0;position:absolute}'
            + '.dtu-tog-sl{position:absolute;cursor:pointer;inset:0;'
            + 'background:var(--dtu-am-toggle-off) !important;background-color:var(--dtu-am-toggle-off) !important;'
            + 'border-radius:22px;transition:background .2s}'
            + '.dtu-tog-sl::before{content:"";position:absolute;height:16px;width:16px;left:3px;bottom:3px;'
            + 'background:#fff !important;border-radius:50%;transition:transform .2s}'
            + '.dtu-tog input:checked+.dtu-tog-sl{background:var(--dtu-am-accent) !important;background-color:var(--dtu-am-accent) !important}'
            + '.dtu-tog input:checked+.dtu-tog-sl::before{transform:translateX(18px)}';

        var overlay = document.createElement('div');
        overlay.className = 'dtu-settings-modal-overlay';
        markExt(overlay);
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000000;display:flex;align-items:center;justify-content:center;'
            + 'background:transparent !important;background-color:transparent !important;'
            + 'backdrop-filter:blur(4px) !important;-webkit-backdrop-filter:blur(4px) !important;';

        overlay.addEventListener('mousedown', function (e) {
            if (e.target === overlay) hideSettingsModal();
        });

        function onEsc(e) {
            if (e.key === 'Escape') {
                hideSettingsModal();
                document.removeEventListener('keydown', onEsc);
            }
        }
        document.addEventListener('keydown', onEsc);

        var modal = document.createElement('div');
        markExt(modal);
        var modalW = Math.min(900, Math.floor(window.innerWidth - 40));
        modal.style.cssText = 'width:' + modalW + 'px;max-height:calc(100vh - 80px);border-radius:14px;overflow:hidden;'
            + 'box-shadow:0 20px 60px rgba(0,0,0,' + (isDark ? '0.7' : '0.25') + ');'
            + 'border:1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') + ';';

        var container = document.createElement('div');
        markExt(container);
        container.className = 'dtu-am-root';
        applyAfterDarkAdminMenuThemeVars(container);

        var sidebar = document.createElement('nav');
        markExt(sidebar);
        sidebar.className = 'dtu-am-sidebar';

        var sidebarHeader = document.createElement('div');
        markExt(sidebarHeader);
        sidebarHeader.className = 'dtu-am-sidebar-hd';
        var sidebarBrand = document.createElement('div');
        markExt(sidebarBrand);
        sidebarBrand.className = 'dtu-am-brand';
        sidebarBrand.textContent = 'DTU After Dark';
        var sidebarSub = document.createElement('div');
        markExt(sidebarSub);
        sidebarSub.className = 'dtu-am-sub';
        sidebarSub.textContent = 'Settings';
        sidebarHeader.appendChild(sidebarBrand);
        sidebarHeader.appendChild(sidebarSub);
        sidebar.appendChild(sidebarHeader);

        var contentArea = document.createElement('div');
        markExt(contentArea);
        contentArea.className = 'dtu-am-content';

        var panels = {};
        var navItems = [];
        var firstCat = null;
        var renderedToggleInputByTid = {};

        categories.forEach(function (cat) {
            if (!firstCat) firstCat = cat.id;

            var navItem = document.createElement('div');
            markExt(navItem);
            navItem.className = 'dtu-nav-i' + (cat.id === firstCat ? ' dtu-active' : '');
            navItem.textContent = cat.label;
            navItem.setAttribute('data-cat', cat.id);
            sidebar.appendChild(navItem);
            navItems.push(navItem);

            var panel = document.createElement('div');
            markExt(panel);
            panel.className = 'dtu-am-panel' + (cat.id === firstCat ? ' dtu-active' : '');

            var panelTitle = document.createElement('div');
            markExt(panelTitle);
            panelTitle.className = 'dtu-am-panel-title';
            panelTitle.textContent = cat.label;
            panel.appendChild(panelTitle);

            var panelDesc = document.createElement('div');
            markExt(panelDesc);
            panelDesc.className = 'dtu-am-panel-desc';
            panelDesc.textContent = cat.desc;
            panel.appendChild(panelDesc);

            cat.items.forEach(function (item) {
                if (item && item.kind === 'accent-theme') {
                    var row0 = document.createElement('div');
                    markExt(row0);
                    row0.className = 'dtu-set-row';

                    var info0 = document.createElement('div');
                    markExt(info0);
                    info0.className = 'dtu-am-info';

                    var title0 = document.createElement('div');
                    markExt(title0);
                    title0.textContent = item.title;
                    title0.className = 'dtu-am-title';

                    var desc0 = document.createElement('div');
                    markExt(desc0);
                    desc0.textContent = item.desc;
                    desc0.className = 'dtu-am-desc';

                    var source0 = document.createElement('a');
                    markExt(source0);
                    source0.className = 'dtu-am-link';
                    source0.href = 'https://designguide.dtu.dk/colours';
                    source0.target = '_blank';
                    source0.rel = 'noopener noreferrer';
                    source0.textContent = 'Source: designguide.dtu.dk/colours';

                    info0.appendChild(title0);
                    info0.appendChild(desc0);
                    info0.appendChild(source0);

                    var actions0 = document.createElement('div');
                    markExt(actions0);
                    actions0.className = 'dtu-am-actions';

                    var swatch = document.createElement('span');
                    markExt(swatch);
                    swatch.className = 'dtu-am-swatch';
                    swatch.setAttribute('aria-hidden', 'true');
                    actions0.appendChild(swatch);

                    var sel = document.createElement('select');
                    markExt(sel);
                    sel.className = 'dtu-am-select';
                    sel.setAttribute('data-dtu-accent-theme-select', '1');

                    var ordered = getAccentThemeOrder();
                    var accentThemes = getAccentThemes();
                    Object.keys(accentThemes).forEach(function (k) {
                        if (ordered.indexOf(k) === -1) ordered.push(k);
                    });
                    ordered.forEach(function (k) {
                        var t = accentThemes[k];
                        if (!t) return;
                        var opt = document.createElement('option');
                        opt.value = k;
                        opt.textContent = t.label || k;
                        sel.appendChild(opt);
                    });
                    try { sel.value = getAccentThemeId(); } catch (eSel) { }

                    sel.addEventListener('change', function () {
                        setAccentThemeId(sel.value);
                    });

                    var color = document.createElement('input');
                    markExt(color);
                    color.type = 'color';
                    color.className = 'dtu-am-color';
                    color.setAttribute('data-dtu-accent-custom-input', '1');
                    try { color.value = getAccentCustomHex() || getAccentCustomDefault(); } catch (eC0) { }
                    color.style.display = (getAccentThemeId() === 'custom') ? '' : 'none';
                    function onPickCustomColor() {
                        var picked = '';
                        try { picked = color.value; } catch (eV0) { picked = ''; }
                        if (picked) setAccentCustomHex(picked);
                        setAccentThemeId('custom');
                        try { sel.value = 'custom'; } catch (eS1) { }
                    }
                    color.addEventListener('input', onPickCustomColor);
                    color.addEventListener('change', onPickCustomColor);

                    actions0.appendChild(sel);
                    actions0.appendChild(color);
                    row0.appendChild(info0);
                    row0.appendChild(actions0);
                    panel.appendChild(row0);
                    return;
                }

                var handler = toggleHandlers[item.tid];
                if (!handler) return;

                var row = document.createElement('div');
                markExt(row);
                row.className = 'dtu-set-row';

                var info = document.createElement('div');
                markExt(info);
                info.className = 'dtu-am-info';

                var titleEl = document.createElement('div');
                markExt(titleEl);
                titleEl.textContent = item.title;
                titleEl.className = 'dtu-am-title';

                var descEl = document.createElement('div');
                markExt(descEl);
                descEl.textContent = item.desc;
                descEl.className = 'dtu-am-desc';

                info.appendChild(titleEl);
                info.appendChild(descEl);

                var actions = document.createElement('div');
                markExt(actions);
                actions.className = 'dtu-am-actions';

                var togLabel = document.createElement('label');
                markExt(togLabel);
                togLabel.className = 'dtu-tog';
                var input = document.createElement('input');
                input.type = 'checkbox';
                input.id = item.tid + '-modal';
                input.checked = handler.getState();
                renderedToggleInputByTid[item.tid] = input;
                var slider = document.createElement('span');
                markExt(slider);
                slider.className = 'dtu-tog-sl';
                togLabel.appendChild(input);
                togLabel.appendChild(slider);

                input.addEventListener('change', function () {
                    handler.onChange(input.checked, input);
                });

                if (handler.hasEdit) {
                    var editBtn = document.createElement('button');
                    markExt(editBtn);
                    editBtn.type = 'button';
                    editBtn.textContent = 'Edit';
                    editBtn.className = 'dtu-am-edit';
                    editBtn.addEventListener('click', function (e) {
                        try { e.preventDefault(); } catch (e0) { }
                        try { e.stopPropagation(); } catch (e1) { }
                        if (handler.onEdit) handler.onEdit();
                    });
                    function syncEditVis() {
                        editBtn.style.display = handler.getState() ? 'inline-flex' : 'none';
                    }
                    syncEditVis();
                    input.addEventListener('change', syncEditVis);
                    actions.appendChild(editBtn);
                }

                if (item && item.subToggleOf) {
                    row.classList.add('dtu-set-row-sub');
                    var parentInput = renderedToggleInputByTid[item.subToggleOf];
                    if (parentInput) {
                        var syncSubState = function () {
                            var parentOn = !!parentInput.checked;
                            input.disabled = !parentOn;
                            row.style.opacity = parentOn ? '1' : '0.55';
                        };
                        syncSubState();
                        parentInput.addEventListener('change', syncSubState);
                    }
                }

                actions.appendChild(togLabel);
                row.appendChild(info);
                row.appendChild(actions);
                panel.appendChild(row);
            });

            panels[cat.id] = panel;
            contentArea.appendChild(panel);
        });

        function showCat(catId) {
            if (!catId) return;
            navItems.forEach(function (n) { n.classList.remove('dtu-active'); });
            navItems.forEach(function (n) {
                if (n.getAttribute('data-cat') === catId) n.classList.add('dtu-active');
            });
            Object.keys(panels).forEach(function (id) {
                var p = panels[id];
                if (!p) return;
                try { p.style.display = ''; } catch (e0) { }
                p.classList.toggle('dtu-active', id === catId);
            });
            try { contentArea.scrollTop = 0; } catch (e1) { }
        }

        navItems.forEach(function (navItem) {
            function activate(e) {
                try { if (e) e.preventDefault(); } catch (e0) { }
                try { if (e) e.stopPropagation(); } catch (e1) { }
                showCat(navItem.getAttribute('data-cat'));
            }
            navItem.addEventListener('pointerdown', activate);
            navItem.addEventListener('mousedown', activate);
            navItem.addEventListener('click', activate);
        });

        contentArea.appendChild(createAfterDarkDisclaimerFooter());
        container.appendChild(sidebar);
        container.appendChild(contentArea);
        modal.appendChild(container);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    try {
        globalThis.DTUAfterDarkSettingsUi = {
            applyFeatureToggleImmediately: applyFeatureToggleImmediately,
            hideSettingsModal: hideSettingsModal,
            showPausedUrlRulesModal: showPausedUrlRulesModal,
            showSettingsModal: showSettingsModal
        };
    } catch (eSettingsUi) { }
})();
