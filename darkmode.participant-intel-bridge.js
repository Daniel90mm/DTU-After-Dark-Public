(function () {
    'use strict';
    var markExt = globalThis.DTUAfterDarkDom.markExt;
    var normalizeWhitespace = globalThis.DTUAfterDarkDom.normalizeWhitespace;

    const _featureFlags = globalThis.DTUAfterDarkFeatureFlags;
    if (!_featureFlags) throw new Error('darkmode.participant-intel-bridge.js loaded before darkmode.feature-flags.js');

    const PARTICIPANT_INTEL_STORAGE_KEY = 'dtuParticipantIntel';
    const PARTICIPANT_INTEL_MAX_STUDENTS = 5000;
    const PARTICIPANT_INTEL_MAX_RETENTION = 20;
    const FEATURE_PARTICIPANT_INTEL_KEY = _featureFlags.FEATURE_PARTICIPANT_INTEL_KEY;
    const FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY = _featureFlags.FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY;
    const FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY = _featureFlags.FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY;
    const FEATURE_PARTICIPANT_INTEL_RETENTION_KEY = _featureFlags.FEATURE_PARTICIPANT_INTEL_RETENTION_KEY;

    function isFeatureFlagEnabled(key) {
        return _featureFlags.isFeatureFlagEnabled(key);
    }

    function getParticipantIntelBridgeRuntime() {
        var runtime = globalThis.DTUAfterDarkParticipantIntelBridgeRuntime;
        if (!runtime) throw new Error('darkmode.participant-intel-bridge.js loaded before darkmode.js');
        return runtime;
    }

    function storageLocalGet(defaults, cb) {
        return getParticipantIntelBridgeRuntime().storageLocalGet(defaults, cb);
    }
    function storageLocalSet(items) {
        return getParticipantIntelBridgeRuntime().storageLocalSet(items);
    }
    function isDarkMode() {
        return !!getParticipantIntelBridgeRuntime().isDarkMode();
    }

    // ===== PARTICIPANT INTELLIGENCE (campusnet.dtu.dk) =====
    // Scrapes participant lists locally to build demographics, shared-history
    // badges and retention tracking.
    // All data stays in browser.storage.local -- nothing leaves the browser.
    var _participantIntelAnnotateTimer = null;
    function getParticipantIntelHostApi() {
        try { return globalThis.DTUAfterDarkParticipantIntelHost || null; } catch (e0) { return null; }
    }

    function normalizeIntelCourseCode(code) {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.normalizeIntelCourseCode !== 'function') return '';
        return api.normalizeIntelCourseCode(code);
    }

    function normalizeIntelCourseSemester(semester) {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.normalizeIntelCourseSemester !== 'function') return '';
        return api.normalizeIntelCourseSemester(semester);
    }

    function detectCampusnetSelfSNumberFromHeader() {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.detectCampusnetSelfSNumberFromHeader !== 'function') return '';
        return api.detectCampusnetSelfSNumberFromHeader();
    }

    function getParticipantIntelCoreApi() {
        return globalThis.DTUAfterDarkParticipantIntelCore || null;
    }

    function dedupeIntelCourseList(courses) {
        var api = getParticipantIntelCoreApi();
        if (!api || typeof api.dedupeIntelCourseList !== 'function') return { list: [], changed: true };
        return api.dedupeIntelCourseList(courses);
    }

    function collapseCourseEntriesByCode(courses) {
        var api = getParticipantIntelCoreApi();
        if (!api || typeof api.collapseCourseEntriesByCode !== 'function') return [];
        return api.collapseCourseEntriesByCode(courses);
    }

    function loadParticipantIntel(cb) {
        var api = getParticipantIntelCoreApi();
        if (!api || typeof api.loadParticipantIntel !== 'function') {
            if (cb) cb({ self: null, students: {}, retention: {}, courseNames: {}, backfill: { scanned: {}, autoWeekly: false, lastRunTs: 0 } });
            return;
        }
        return api.loadParticipantIntel(cb);
    }

    function saveParticipantIntel(data) {
        var api = getParticipantIntelCoreApi();
        if (!api || typeof api.saveParticipantIntel !== 'function') return;
        return api.saveParticipantIntel(data);
    }

    // -- Page detection helpers --

    function isCampusnetParticipantPage() {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.isCampusnetParticipantPage !== 'function') return false;
        return api.isCampusnetParticipantPage();
    }

    function isCampusnetProfilePage() {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.isCampusnetProfilePage !== 'function') return false;
        return api.isCampusnetProfilePage();
    }

    function isCampusnetGroupArchivePage() {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.isCampusnetGroupArchivePage !== 'function') return false;
        return api.isCampusnetGroupArchivePage();
    }

    function parseDTUSemesterFromText(text) {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.parseDTUSemesterFromText !== 'function') return null;
        return api.parseDTUSemesterFromText(text);
    }

    function getCampusnetExplicitSemesterFromPage(rootDoc) {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.getCampusnetExplicitSemesterFromPage !== 'function') return null;
        return api.getCampusnetExplicitSemesterFromPage(rootDoc);
    }

    function getCampusnetSemesterFromPage(rootDoc) {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.getCampusnetSemesterFromPage !== 'function') return '';
        return api.getCampusnetSemesterFromPage(rootDoc);
    }

    function getCampusnetCourseCodeFromPage(rootDoc) {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.getCampusnetCourseCodeFromPage !== 'function') return null;
        return api.getCampusnetCourseCodeFromPage(rootDoc);
    }

    function isCampusnetLikelyAcademicCourse(courseCode, courseName, opts) {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.isCampusnetLikelyAcademicCourse !== 'function') return false;
        return api.isCampusnetLikelyAcademicCourse(courseCode, courseName, opts);
    }

    function getCampusnetCourseNameFromPage(courseCode, rootDoc) {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.getCampusnetCourseNameFromPage !== 'function') return null;
        return api.getCampusnetCourseNameFromPage(courseCode, rootDoc);
    }

    function normalizeProgramLabel(raw) {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.normalizeProgramLabel !== 'function') return '';
        return api.normalizeProgramLabel(raw);
    }

    function readParticipantProgram(infoDiv) {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.readParticipantProgram !== 'function') return '';
        return api.readParticipantProgram(infoDiv);
    }

    function readExportProgram(text) {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.readExportProgram !== 'function') return '';
        return api.readExportProgram(text);
    }

    function getCampusnetRetentionKey() {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.getCampusnetRetentionKey !== 'function') return '';
        return api.getCampusnetRetentionKey();
    }

    function getCampusnetUsersCountFromPage(rootDoc) {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.getCampusnetUsersCountFromPage !== 'function') return null;
        return api.getCampusnetUsersCountFromPage(rootDoc);
    }

    function getCampusnetUsersHeadingElement() {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.getCampusnetUsersHeadingElement !== 'function') return null;
        return api.getCampusnetUsersHeadingElement();
    }

    function getCampusnetUsersAnchorElement() {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.getCampusnetUsersAnchorElement !== 'function') return null;
        return api.getCampusnetUsersAnchorElement();
    }

    function getCampusnetParticipantsListRoot() {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.getCampusnetParticipantsListRoot !== 'function') return null;
        return api.getCampusnetParticipantsListRoot();
    }

    function getCampusnetUsersParticipantElements(rootDoc) {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.getCampusnetUsersParticipantElements !== 'function') return [];
        return api.getCampusnetUsersParticipantElements(rootDoc);
    }

    function getFullListUsersElements() {
        var api = getParticipantIntelCoreApi();
        if (!api || typeof api.getFullListUsersElements !== 'function') return [];
        return api.getFullListUsersElements();
    }

    function loadFullListDoc(cb) {
        var api = getParticipantIntelCoreApi();
        if (!api || typeof api.loadFullListDoc !== 'function') { setTimeout(function () { cb(false); }, 0); return; }
        api.loadFullListDoc(cb);
    }

    function getCampusnetParticipantSNumber(item) {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.getCampusnetParticipantSNumber !== 'function') return '';
        return api.getCampusnetParticipantSNumber(item);
    }

    // -- Participant list parser --

    function parseParticipantList(rootDoc) {
        var api = getParticipantIntelCoreApi();
        if (!api || typeof api.parseParticipantList !== 'function') return [];
        return api.parseParticipantList(rootDoc);
    }

    function getFullParticipantList(cb) {
        var api = getParticipantIntelCoreApi();
        if (!api || typeof api.getFullParticipantList !== 'function') {
            cb(parseParticipantList(), { complete: false, total: 0 });
            return;
        }
        return api.getFullParticipantList(cb);
    }

    // -- Data collection & self-detection --

    function collectParticipantData() {
        var api = getParticipantIntelCoreApi();
        if (!api || typeof api.collectParticipantData !== 'function') return;
        return api.collectParticipantData();
    }

    // ---- Feature 1: Room Intelligence (Demographics) ----

    function getParticipantIntelUiApi() {
        return globalThis.DTUAfterDarkParticipantIntelUi || null;
    }

    function insertParticipantDemographics() {
        var api = getParticipantIntelUiApi();
        if (!api || typeof api.insertParticipantDemographics !== 'function') return;
        return api.insertParticipantDemographics();
    }

    // ---- Feature 3: Contextual Memory ("Where do I know you from?") ----

    function annotateParticipantHistory() {
        var api = getParticipantIntelUiApi();
        if (!api || typeof api.annotateParticipantHistory !== 'function') return;
        return api.annotateParticipantHistory();
    }

    function annotateProfileHistory() {
        var api = getParticipantIntelUiApi();
        if (!api || typeof api.annotateProfileHistory !== 'function') return;
        return api.annotateProfileHistory();
    }

    // ---- Feature 4: Retention Radar ----

    function recordRetentionSnapshot() {
        var api = getParticipantIntelUiApi();
        if (!api || typeof api.recordRetentionSnapshot !== 'function') return;
        return api.recordRetentionSnapshot();
    }

    function getParticipantIntelBackfillApi() {
        return globalThis.DTUAfterDarkParticipantIntelBackfill || null;
    }

    function insertCampusnetArchiveBackfillWidget() {
        var api = getParticipantIntelBackfillApi();
        if (!api || typeof api.insertCampusnetArchiveBackfillWidget !== 'function') return;
        return api.insertCampusnetArchiveBackfillWidget();
    }

    // ---- Optional: Archive backfill (CampusNet group archive) ----
    // Lets you populate Participant Intelligence by scanning archived course participant pages.
    // Runs locally and stores derived data in browser.storage.local.
    // ---- Master bootstrap function ----

    function scheduleAnnotateParticipantHistory(delayMs) {
        if (!isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_KEY) || !isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY)) return;
        if (_participantIntelAnnotateTimer) return;
        _participantIntelAnnotateTimer = setTimeout(function () {
            _participantIntelAnnotateTimer = null;
            annotateParticipantHistory();
        }, delayMs || 260);
    }

    function insertParticipantIntelligence() {
        if (!getParticipantIntelBridgeRuntime().isTopWindow) return;
        if (!isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_KEY)) {
            if (_participantIntelAnnotateTimer) {
                clearTimeout(_participantIntelAnnotateTimer);
                _participantIntelAnnotateTimer = null;
            }
            document.querySelectorAll(
                '[data-dtu-participant-demographics],[data-dtu-shared-history],'
                + '[data-dtu-retention-indicator],[data-dtu-profile-history],[data-dtu-archive-backfill]'
            ).forEach(function (el) { el.remove(); });
            // Also puts back a Users list the study line filter had changed.
            insertParticipantDemographics();
            return;
        }

        var demographicsEnabled = isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY);
        var sharedHistoryEnabled = isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY);
        var retentionEnabled = isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_RETENTION_KEY);

        if (isCampusnetParticipantPage()) {
            // Fast cleanup when sub-features are toggled off.
            if (!sharedHistoryEnabled) {
                if (_participantIntelAnnotateTimer) {
                    clearTimeout(_participantIntelAnnotateTimer);
                    _participantIntelAnnotateTimer = null;
                }
                document.querySelectorAll('[data-dtu-shared-history]').forEach(function (el) { el.remove(); });
            }
            if (!retentionEnabled) {
                var oldRet = document.querySelector('[data-dtu-retention-indicator]');
                if (oldRet) oldRet.remove();
            }

            if (sharedHistoryEnabled) collectParticipantData();
            // When switched off, this removes the card and undoes its list filter.
            insertParticipantDemographics();
            if (sharedHistoryEnabled) {
                // Delay slightly so the storage write from collectParticipantData has time to settle.
                scheduleAnnotateParticipantHistory(320);
            }
            if (retentionEnabled) recordRetentionSnapshot();
        }

        if (isCampusnetProfilePage()) {
            annotateProfileHistory();
        }

        if (isCampusnetGroupArchivePage()) {
            insertCampusnetArchiveBackfillWidget();
        } else {
            var oldBackfill = document.querySelector('[data-dtu-archive-backfill]');
            if (oldBackfill) oldBackfill.remove();
        }
    }


    function initParticipantIntelligenceBridge() {
    try {
        globalThis.DTUAfterDarkParticipantIntelHostDeps = {
            normalizeWhitespace: normalizeWhitespace
        };
    } catch (eParticipantIntelHostDeps) { }
    globalThis.DTUAfterDarkParticipantIntelCoreDeps = {
        isFeatureFlagEnabled: isFeatureFlagEnabled,
        featureParticipantIntelKey: FEATURE_PARTICIPANT_INTEL_KEY,
        normalizeWhitespace: normalizeWhitespace,
        normalizeIntelCourseCode: normalizeIntelCourseCode,
        normalizeIntelCourseSemester: normalizeIntelCourseSemester,
        isCampusnetLikelyAcademicCourse: isCampusnetLikelyAcademicCourse,
        getCampusnetUsersParticipantElements: getCampusnetUsersParticipantElements,
        getCampusnetUsersCountFromPage: getCampusnetUsersCountFromPage,
        getCampusnetParticipantSNumber: getCampusnetParticipantSNumber,
        getCampusnetCourseCodeFromPage: getCampusnetCourseCodeFromPage,
        getCampusnetSemesterFromPage: getCampusnetSemesterFromPage,
        getCampusnetCourseNameFromPage: getCampusnetCourseNameFromPage,
        normalizeProgramLabel: normalizeProgramLabel,
        readParticipantProgram: readParticipantProgram,
        readExportProgram: readExportProgram,
        isCampusnetParticipantPage: isCampusnetParticipantPage,
        storageLocalGet: storageLocalGet,
        storageLocalSet: storageLocalSet,
        participantIntelStorageKey: PARTICIPANT_INTEL_STORAGE_KEY,
        participantIntelMaxStudents: PARTICIPANT_INTEL_MAX_STUDENTS
    };
    globalThis.DTUAfterDarkParticipantIntelUiDeps = {
        isTopWindow: getParticipantIntelBridgeRuntime().isTopWindow,
        isFeatureFlagEnabled: isFeatureFlagEnabled,
        featureParticipantIntelKey: FEATURE_PARTICIPANT_INTEL_KEY,
        featureParticipantIntelDemographicsKey: FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY,
        featureParticipantIntelSharedHistoryKey: FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY,
        featureParticipantIntelRetentionKey: FEATURE_PARTICIPANT_INTEL_RETENTION_KEY,
        isCampusnetParticipantPage: isCampusnetParticipantPage,
        isCampusnetProfilePage: isCampusnetProfilePage,
        isDarkMode: isDarkMode,
        markExt: markExt,
        parseParticipantList: parseParticipantList,
        getFullParticipantList: getFullParticipantList,
        getCampusnetUsersCountFromPage: getCampusnetUsersCountFromPage,
        loadParticipantIntel: loadParticipantIntel,
        normalizeProgramLabel: normalizeProgramLabel,
        getCampusnetCourseCodeFromPage: getCampusnetCourseCodeFromPage,
        getCampusnetSemesterFromPage: getCampusnetSemesterFromPage,
        getCampusnetRetentionKey: getCampusnetRetentionKey,
        getCampusnetUsersParticipantElements: getCampusnetUsersParticipantElements,
        getCampusnetParticipantSNumber: getCampusnetParticipantSNumber,
        getFullListUsersElements: getFullListUsersElements,
        loadFullListDoc: loadFullListDoc,
        normalizeIntelCourseCode: normalizeIntelCourseCode,
        normalizeIntelCourseSemester: normalizeIntelCourseSemester,
        detectCampusnetSelfSNumberFromHeader: detectCampusnetSelfSNumberFromHeader,
        dedupeIntelCourseList: dedupeIntelCourseList,
        collapseCourseEntriesByCode: collapseCourseEntriesByCode,
        normalizeWhitespace: normalizeWhitespace,
        isCampusnetLikelyAcademicCourse: isCampusnetLikelyAcademicCourse,
        getCampusnetUsersAnchorElement: getCampusnetUsersAnchorElement,
        getCampusnetUsersHeadingElement: getCampusnetUsersHeadingElement,
        getCampusnetParticipantsListRoot: getCampusnetParticipantsListRoot,
        saveParticipantIntel: saveParticipantIntel,
        participantIntelMaxRetention: PARTICIPANT_INTEL_MAX_RETENTION
    };
    globalThis.DTUAfterDarkParticipantIntelBackfillDeps = {
        normalizeWhitespace: normalizeWhitespace,
        // One parser for the live page and fetched archive pages (host and core own it).
        parseParticipantList: parseParticipantList,
        getCampusnetUsersParticipantElements: getCampusnetUsersParticipantElements,
        getCampusnetUsersCountFromPage: getCampusnetUsersCountFromPage,
        parseDTUSemesterFromText: parseDTUSemesterFromText,
        isCampusnetLikelyAcademicCourse: isCampusnetLikelyAcademicCourse,
        normalizeIntelCourseCode: normalizeIntelCourseCode,
        normalizeIntelCourseSemester: normalizeIntelCourseSemester,
        getCampusnetCourseCodeFromPage: getCampusnetCourseCodeFromPage,
        getCampusnetExplicitSemesterFromPage: getCampusnetExplicitSemesterFromPage,
        getCampusnetCourseNameFromPage: getCampusnetCourseNameFromPage,
        normalizeProgramLabel: normalizeProgramLabel,
        saveParticipantIntel: saveParticipantIntel,
        loadParticipantIntel: loadParticipantIntel,
        isCampusnetGroupArchivePage: isCampusnetGroupArchivePage,
        isFeatureFlagEnabled: isFeatureFlagEnabled,
        featureParticipantIntelKey: FEATURE_PARTICIPANT_INTEL_KEY,
        featureParticipantIntelSharedHistoryKey: FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY,
        markExt: markExt,
        isDarkMode: isDarkMode,
        participantIntelMaxStudents: PARTICIPANT_INTEL_MAX_STUDENTS
    };
    }

    globalThis.DTUAfterDarkParticipantIntelBridge = {
        init: initParticipantIntelligenceBridge,
        getParticipantIntelHostApi: getParticipantIntelHostApi,
        normalizeIntelCourseCode: normalizeIntelCourseCode,
        normalizeIntelCourseSemester: normalizeIntelCourseSemester,
        detectCampusnetSelfSNumberFromHeader: detectCampusnetSelfSNumberFromHeader,
        getParticipantIntelCoreApi: getParticipantIntelCoreApi,
        dedupeIntelCourseList: dedupeIntelCourseList,
        collapseCourseEntriesByCode: collapseCourseEntriesByCode,
        loadParticipantIntel: loadParticipantIntel,
        saveParticipantIntel: saveParticipantIntel,
        isCampusnetParticipantPage: isCampusnetParticipantPage,
        isCampusnetProfilePage: isCampusnetProfilePage,
        isCampusnetGroupArchivePage: isCampusnetGroupArchivePage,
        parseDTUSemesterFromText: parseDTUSemesterFromText,
        getCampusnetExplicitSemesterFromPage: getCampusnetExplicitSemesterFromPage,
        getCampusnetSemesterFromPage: getCampusnetSemesterFromPage,
        getCampusnetCourseCodeFromPage: getCampusnetCourseCodeFromPage,
        isCampusnetLikelyAcademicCourse: isCampusnetLikelyAcademicCourse,
        getCampusnetCourseNameFromPage: getCampusnetCourseNameFromPage,
        normalizeProgramLabel: normalizeProgramLabel,
        readParticipantProgram: readParticipantProgram,
        getCampusnetRetentionKey: getCampusnetRetentionKey,
        getCampusnetUsersCountFromPage: getCampusnetUsersCountFromPage,
        getCampusnetUsersAnchorElement: getCampusnetUsersAnchorElement,
        getCampusnetParticipantsListRoot: getCampusnetParticipantsListRoot,
        getCampusnetUsersParticipantElements: getCampusnetUsersParticipantElements,
        getCampusnetParticipantSNumber: getCampusnetParticipantSNumber,
        parseParticipantList: parseParticipantList,
        getFullParticipantList: getFullParticipantList,
        collectParticipantData: collectParticipantData,
        getParticipantIntelUiApi: getParticipantIntelUiApi,
        insertParticipantDemographics: insertParticipantDemographics,
        annotateParticipantHistory: annotateParticipantHistory,
        annotateProfileHistory: annotateProfileHistory,
        recordRetentionSnapshot: recordRetentionSnapshot,
        getParticipantIntelBackfillApi: getParticipantIntelBackfillApi,
        insertCampusnetArchiveBackfillWidget: insertCampusnetArchiveBackfillWidget,
        scheduleAnnotateParticipantHistory: scheduleAnnotateParticipantHistory,
        insertParticipantIntelligence: insertParticipantIntelligence
    };
})();
