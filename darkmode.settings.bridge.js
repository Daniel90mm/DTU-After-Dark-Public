(function () {
    'use strict';
    var markExt = globalThis.DTUAfterDarkDom.markExt;
    var isTopWindow = globalThis.DTUAfterDarkDom.isTopWindow;

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

    function isFollowingDeviceTheme() {
        return !!callDep('isFollowingDeviceTheme', [], false);
    }

    function saveDarkModeFollowDevice(enabled) {
        return callDep('saveDarkModeFollowDevice', [enabled], null);
    }

    function saveDarkModePreference(enabled) {
        return callDep('saveDarkModePreference', [enabled], null);
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

    function insertKurserCourseEvaluation() {
        callDep('insertKurserCourseEvaluation', [], null);
    }

    function insertKurserCourseMap() {
        callDep('insertKurserCourseMap', [], null);
    }

    function insertStudyplanExamSchedule() {
        callDep('insertStudyplanExamSchedule', [], null);
    }

    function insertKurserExamDate() {
        callDep('insertKurserExamDate', [], null);
    }

    function scheduleSmartRoomLinkerScan(root, delayMs) {
        callDep('scheduleSmartRoomLinkerScan', [root, delayMs], null);
    }

    function removeSmartRoomLinks() {
        callDep('removeSmartRoomLinks', [], null);
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
        return callDep('getAccentThemeId', [], 'dtu_red');
    }

    function getAccentCustomHex() {
        return callDep('getAccentCustomHex', [], '');
    }

    function setAccentThemeId(nextId, opts) {
        callDep('setAccentThemeId', [nextId, opts], null);
    }

    function setAccentCustomHex(nextHex, opts) {
        callDep('setAccentCustomHex', [nextHex, opts], null);
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

    try {
        globalThis.DTUAfterDarkSettingsBridge = {
            getDeps: getDeps,
            callDep: callDep,
            getDepValue: getDepValue,
            isTopWindow: isTopWindow,
            isDarkModeEnabled: isDarkModeEnabled,
            getCurrentUrlWithoutHash: getCurrentUrlWithoutHash,
            buildSuggestedPausePatternsForCurrentUrl: buildSuggestedPausePatternsForCurrentUrl,
            normalizeUrlPausePattern: normalizeUrlPausePattern,
            isPauseProtectedPattern: isPauseProtectedPattern,
            getUrlPausePatterns: getUrlPausePatterns,
            saveUrlPausePatterns: saveUrlPausePatterns,
            getMatchingUrlPausePatterns: getMatchingUrlPausePatterns,
            markExt: markExt,
            applyAfterDarkAdminMenuThemeVars: applyAfterDarkAdminMenuThemeVars,
            getFeatureKeys: getFeatureKeys,
            getSettingKeys: getSettingKeys,
            isFollowingDeviceTheme: isFollowingDeviceTheme,
            saveDarkModeFollowDevice: saveDarkModeFollowDevice,
            saveDarkModePreference: saveDarkModePreference,
            isMojanglesEnabled: isMojanglesEnabled,
            insertMojanglesText: insertMojanglesText,
            isBusEnabled: isBusEnabled,
            isApiQuotaExhausted: isApiQuotaExhausted,
            showQuotaExhaustedMessage: showQuotaExhaustedMessage,
            getBusConfig: getBusConfig,
            showBusConfigModal: showBusConfigModal,
            stopBusPolling: stopBusPolling,
            abortInFlightBusRequests: abortInFlightBusRequests,
            insertBusDisplay: insertBusDisplay,
            forceBusImmediateRefresh: forceBusImmediateRefresh,
            isDeadlinesEnabled: isDeadlinesEnabled,
            insertDeadlinesHomepageWidget: insertDeadlinesHomepageWidget,
            isSearchWidgetEnabled: isSearchWidgetEnabled,
            isFeatureFlagEnabled: isFeatureFlagEnabled,
            setFeatureFlagEnabled: setFeatureFlagEnabled,
            insertBookFinderLinks: insertBookFinderLinks,
            insertGPARow: insertGPARow,
            insertGPASimulator: insertGPASimulator,
            syncCampusnetActualGradeExclusionControls: syncCampusnetActualGradeExclusionControls,
            insertKurserGradeStats: insertKurserGradeStats,
            insertKurserTextbookLinks: insertKurserTextbookLinks,
            insertKurserCourseEvaluation: insertKurserCourseEvaluation,
            insertKurserCourseMap: insertKurserCourseMap,
            insertStudyplanExamSchedule: insertStudyplanExamSchedule,
            insertKurserExamDate: insertKurserExamDate,
            scheduleSmartRoomLinkerScan: scheduleSmartRoomLinkerScan,
            removeSmartRoomLinks: removeSmartRoomLinks,
            insertContentButtons: insertContentButtons,
            startContentButtonBootstrap: startContentButtonBootstrap,
            removeContentButtons: removeContentButtons,
            insertDTULearnNavResourceLinks: insertDTULearnNavResourceLinks,
            removeDTULearnNavResourceLinks: removeDTULearnNavResourceLinks,
            insertParticipantIntelligence: insertParticipantIntelligence,
            insertLibraryNavDropdown: insertLibraryNavDropdown,
            removeLibraryNavDropdown: removeLibraryNavDropdown,
            runLessonsBulkDownloadChecks: runLessonsBulkDownloadChecks,
            showContentShortcutOverridesModal: showContentShortcutOverridesModal,
            getAccentThemeId: getAccentThemeId,
            getAccentCustomHex: getAccentCustomHex,
            setAccentThemeId: setAccentThemeId,
            setAccentCustomHex: setAccentCustomHex,
            getAccentThemeOrder: getAccentThemeOrder,
            getAccentThemes: getAccentThemes,
            getAccentCustomDefault: getAccentCustomDefault
        };
    } catch (eSettingsBridge) { }
})();
