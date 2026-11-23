(function () {
    'use strict';

    // ===== FEATURE FLAGS (extension-wide) =====
    // These toggles live in extension storage so they apply across all DTU domains.
    const FEATURE_KURSER_GRADE_STATS_KEY = 'dtuAfterDarkFeatureKurserGradeStats';
    const FEATURE_TEXTBOOK_LINKS_KEY = 'dtuAfterDarkFeatureKurserTextbookLinker';
    const FEATURE_CONTENT_SHORTCUT_KEY = 'dtuAfterDarkFeatureContentShortcut';
    const FEATURE_CAMPUSNET_GPA_TOOLS_KEY = 'dtuAfterDarkFeatureCampusnetGpaTools';
    const FEATURE_KURSER_COURSE_EVAL_KEY = 'dtuAfterDarkFeatureKurserCourseEval';
    const FEATURE_KURSER_COURSE_MAP_KEY = 'dtuAfterDarkFeatureKurserCourseMap';
    const FEATURE_STUDYPLAN_EXAM_SCHEDULE_KEY = 'dtuAfterDarkFeatureStudyplanExamSchedule';
    const FEATURE_SMART_ROOM_LINKER_KEY = 'dtuAfterDarkFeatureSmartRoomLinker';
    const FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY = 'dtuAfterDarkFeatureLearnNavResourceLinks';
    const FEATURE_PARTICIPANT_INTEL_KEY = 'dtuAfterDarkFeatureParticipantIntel';
    const FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY = 'dtuAfterDarkFeatureParticipantIntelDemographics';
    const FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY = 'dtuAfterDarkFeatureParticipantIntelSharedHistory';
    const FEATURE_PARTICIPANT_INTEL_RETENTION_KEY = 'dtuAfterDarkFeatureParticipantIntelRetention';
    const FEATURE_LIBRARY_DROPDOWN_KEY = 'dtuAfterDarkFeatureLibraryDropdown';
    const FEATURE_LEARN_LESSONS_BULK_DOWNLOAD_KEY = 'dtuAfterDarkFeatureLearnLessonsBulkDownload';

    const FEATURE_FLAG_DEFAULTS = {
        [FEATURE_KURSER_GRADE_STATS_KEY]: true,
        [FEATURE_TEXTBOOK_LINKS_KEY]: true,
        [FEATURE_CONTENT_SHORTCUT_KEY]: true,
        [FEATURE_CAMPUSNET_GPA_TOOLS_KEY]: true,
        [FEATURE_KURSER_COURSE_EVAL_KEY]: true,
        [FEATURE_KURSER_COURSE_MAP_KEY]: true,
        [FEATURE_STUDYPLAN_EXAM_SCHEDULE_KEY]: true,
        [FEATURE_SMART_ROOM_LINKER_KEY]: true,
        [FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY]: true,
        [FEATURE_PARTICIPANT_INTEL_KEY]: false,
        [FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY]: false,
        [FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY]: false,
        [FEATURE_PARTICIPANT_INTEL_RETENTION_KEY]: false,
        [FEATURE_LIBRARY_DROPDOWN_KEY]: true,
        [FEATURE_LEARN_LESSONS_BULK_DOWNLOAD_KEY]: true
    };

    let _featureFlags = Object.assign({}, FEATURE_FLAG_DEFAULTS);
    let _featureFlagsLoaded = false;

    function getFeatureFlagsRuntime() {
        var runtime = globalThis.DTUAfterDarkFeatureFlagsRuntime;
        if (!runtime) throw new Error('darkmode.feature-flags.js loaded before darkmode.js');
        return runtime;
    }
    function getExtensionStorageArea() {
        return getFeatureFlagsRuntime().getExtensionStorageArea();
    }
    function storageLocalGet(defaults, cb) {
        return getFeatureFlagsRuntime().storageLocalGet(defaults, cb);
    }
    function storageLocalSet(items) {
        return getFeatureFlagsRuntime().storageLocalSet(items);
    }
    function runTopWindowFeatureChecks(rootNode, refreshBus) {
        return getFeatureFlagsRuntime().runTopWindowFeatureChecks(rootNode, refreshBus);
    }
    function runFrameFeatureChecks(rootNode) {
        return getFeatureFlagsRuntime().runFrameFeatureChecks(rootNode);
    }

    function loadFeatureFlags(cb) {
        if (_featureFlagsLoaded) {
            if (cb) cb(_featureFlags);
            return;
        }
        try {
            var _twinCleanupStorage = getExtensionStorageArea();
            if (_twinCleanupStorage) {
                _twinCleanupStorage.area.remove([
                    'dtuAfterDarkFeatureParticipantIntelSemesterTwins',
                    'dtuAfterDarkSemesterTwinPrefsV1',
                    'dtuAfterDarkFeatureKurserRoomFinder',
                    'dtuAfterDarkFeatureKurserScheduleAnnotation',
                    'dtuAfterDarkFeatureKurserMyLineBadges',
                    'cache_myline_me'
                ]);
            }
        } catch (eTwinCleanup) { }
        storageLocalGet({ dtuAfterDarkFeatureBookFinder: null }, function (legacyBf) {
            if (legacyBf && legacyBf.dtuAfterDarkFeatureBookFinder === false) {
                setFeatureFlagEnabled(FEATURE_TEXTBOOK_LINKS_KEY, false);
            }
            try {
                var _bfCleanupStorage = getExtensionStorageArea();
                if (_bfCleanupStorage) _bfCleanupStorage.area.remove('dtuAfterDarkFeatureBookFinder');
            } catch (eBfCleanup) { }
        });
        storageLocalGet(FEATURE_FLAG_DEFAULTS, function (flags) {
            _featureFlags = Object.assign({}, FEATURE_FLAG_DEFAULTS);
            Object.keys(FEATURE_FLAG_DEFAULTS).forEach(function (key) {
                if (flags && typeof flags[key] === 'boolean') _featureFlags[key] = flags[key];
            });
            _featureFlagsLoaded = true;
            if (cb) cb(_featureFlags);
        });
    }

    // A key that is not a flag reads as off, with an error: reading it as on
    // left a renamed flag's feature running with its switch dead.
    function isFeatureFlagEnabled(key) {
        if (!key) return true;
        if (!Object.prototype.hasOwnProperty.call(FEATURE_FLAG_DEFAULTS, key)) {
            console.error('DTU After Dark: unknown feature flag ' + key);
            return false;
        }
        if (_featureFlagsLoaded) return !!_featureFlags[key];
        return !!FEATURE_FLAG_DEFAULTS[key];
    }

    function setFeatureFlagEnabled(key, enabled) {
        if (!key) return;
        _featureFlags[key] = !!enabled;
        storageLocalSet({ [key]: !!enabled });
    }

    var _featureFlagStorageSubscribed = false;
    var _featureFlagStorageChangeTimer = null;
    function subscribeFeatureFlagStorageChanges() {
        if (_featureFlagStorageSubscribed) return;
        _featureFlagStorageSubscribed = true;

        var onChanged = function (changes, areaName) {
            if (areaName && areaName !== 'local') return;
            if (!changes) return;

            var touched = false;
            Object.keys(changes).forEach(function (key) {
                if (!Object.prototype.hasOwnProperty.call(FEATURE_FLAG_DEFAULTS, key)) return;
                var next = changes[key] ? changes[key].newValue : undefined;
                if (typeof next !== 'boolean') return;
                _featureFlags[key] = next;
                touched = true;
            });

            if (!touched) return;
            if (_featureFlagStorageChangeTimer) return;
            _featureFlagStorageChangeTimer = setTimeout(function () {
                _featureFlagStorageChangeTimer = null;
                if (getFeatureFlagsRuntime().isTopWindow) {
                    try { syncAfterDarkFeatureToggleStates(); } catch (e1) { }
                    try { runTopWindowFeatureChecks(null, false); } catch (e2) { }
                } else {
                    try { runFrameFeatureChecks(null); } catch (e3) { }
                }
            }, 120);
        };

        try {
            if (typeof browser !== 'undefined' && browser.storage && browser.storage.onChanged) {
                browser.storage.onChanged.addListener(onChanged);
                return;
            }
        } catch (e) { }
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
                chrome.storage.onChanged.addListener(onChanged);
            }
        } catch (e2) { }
    }

    globalThis.DTUAfterDarkFeatureFlags = {
        FEATURE_KURSER_GRADE_STATS_KEY: FEATURE_KURSER_GRADE_STATS_KEY,
        FEATURE_TEXTBOOK_LINKS_KEY: FEATURE_TEXTBOOK_LINKS_KEY,
        FEATURE_CONTENT_SHORTCUT_KEY: FEATURE_CONTENT_SHORTCUT_KEY,
        FEATURE_CAMPUSNET_GPA_TOOLS_KEY: FEATURE_CAMPUSNET_GPA_TOOLS_KEY,
        FEATURE_KURSER_COURSE_EVAL_KEY: FEATURE_KURSER_COURSE_EVAL_KEY,
        FEATURE_KURSER_COURSE_MAP_KEY: FEATURE_KURSER_COURSE_MAP_KEY,
        FEATURE_STUDYPLAN_EXAM_SCHEDULE_KEY: FEATURE_STUDYPLAN_EXAM_SCHEDULE_KEY,
        FEATURE_SMART_ROOM_LINKER_KEY: FEATURE_SMART_ROOM_LINKER_KEY,
        FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY: FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY,
        FEATURE_PARTICIPANT_INTEL_KEY: FEATURE_PARTICIPANT_INTEL_KEY,
        FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY: FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY,
        FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY: FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY,
        FEATURE_PARTICIPANT_INTEL_RETENTION_KEY: FEATURE_PARTICIPANT_INTEL_RETENTION_KEY,
        FEATURE_LIBRARY_DROPDOWN_KEY: FEATURE_LIBRARY_DROPDOWN_KEY,
        FEATURE_LEARN_LESSONS_BULK_DOWNLOAD_KEY: FEATURE_LEARN_LESSONS_BULK_DOWNLOAD_KEY,
        FEATURE_FLAG_DEFAULTS: FEATURE_FLAG_DEFAULTS,
        loadFeatureFlags: loadFeatureFlags,
        isFeatureFlagEnabled: isFeatureFlagEnabled,
        setFeatureFlagEnabled: setFeatureFlagEnabled,
        subscribeFeatureFlagStorageChanges: subscribeFeatureFlagStorageChanges
    };
})();
