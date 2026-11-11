(function () {
    'use strict';

    var _settingsBridge = globalThis.DTUAfterDarkSettingsBridge;
    if (!_settingsBridge) throw new Error('darkmode.settings.js loaded before darkmode.settings.bridge.js');
    var _settingsPause = globalThis.DTUAfterDarkSettingsPause;
    if (!_settingsPause || typeof _settingsPause.showPausedUrlRulesModal !== 'function') {
        throw new Error('darkmode.settings.js loaded before darkmode.settings.pause.js');
    }
    var _settingsFooter = globalThis.DTUAfterDarkSettingsFooter;
    if (!_settingsFooter || typeof _settingsFooter.createAfterDarkDisclaimerFooter !== 'function') {
        throw new Error('darkmode.settings.js loaded before darkmode.settings.footer.js');
    }

    var isTopWindow = _settingsBridge.isTopWindow;
    var isDarkModeEnabled = _settingsBridge.isDarkModeEnabled;
    var getFeatureKeys = _settingsBridge.getFeatureKeys;
    var getSettingKeys = _settingsBridge.getSettingKeys;
    var isFollowingDeviceTheme = _settingsBridge.isFollowingDeviceTheme;
    var saveDarkModeFollowDevice = _settingsBridge.saveDarkModeFollowDevice;
    var saveDarkModePreference = _settingsBridge.saveDarkModePreference;
    var isMojanglesEnabled = _settingsBridge.isMojanglesEnabled;
    var insertMojanglesText = _settingsBridge.insertMojanglesText;
    var isBusEnabled = _settingsBridge.isBusEnabled;
    var isApiQuotaExhausted = _settingsBridge.isApiQuotaExhausted;
    var showQuotaExhaustedMessage = _settingsBridge.showQuotaExhaustedMessage;
    var getBusConfig = _settingsBridge.getBusConfig;
    var showBusConfigModal = _settingsBridge.showBusConfigModal;
    var stopBusPolling = _settingsBridge.stopBusPolling;
    var abortInFlightBusRequests = _settingsBridge.abortInFlightBusRequests;
    var insertBusDisplay = _settingsBridge.insertBusDisplay;
    var forceBusImmediateRefresh = _settingsBridge.forceBusImmediateRefresh;
    var isDeadlinesEnabled = _settingsBridge.isDeadlinesEnabled;
    var insertDeadlinesHomepageWidget = _settingsBridge.insertDeadlinesHomepageWidget;
    var isSearchWidgetEnabled = _settingsBridge.isSearchWidgetEnabled;
    var isFeatureFlagEnabled = _settingsBridge.isFeatureFlagEnabled;
    var setFeatureFlagEnabled = _settingsBridge.setFeatureFlagEnabled;
    var insertBookFinderLinks = _settingsBridge.insertBookFinderLinks;
    var insertGPARow = _settingsBridge.insertGPARow;
    var insertGPASimulator = _settingsBridge.insertGPASimulator;
    var syncCampusnetActualGradeExclusionControls = _settingsBridge.syncCampusnetActualGradeExclusionControls;
    var insertKurserGradeStats = _settingsBridge.insertKurserGradeStats;
    var insertKurserTextbookLinks = _settingsBridge.insertKurserTextbookLinks;
    var insertKurserCourseEvaluation = _settingsBridge.insertKurserCourseEvaluation;
    var insertKurserCourseMap = _settingsBridge.insertKurserCourseMap;
    var insertStudyplanExamSchedule = _settingsBridge.insertStudyplanExamSchedule;
    var insertKurserExamDate = _settingsBridge.insertKurserExamDate;
    var scheduleSmartRoomLinkerScan = _settingsBridge.scheduleSmartRoomLinkerScan;
    var removeSmartRoomLinks = _settingsBridge.removeSmartRoomLinks;
    var insertContentButtons = _settingsBridge.insertContentButtons;
    var startContentButtonBootstrap = _settingsBridge.startContentButtonBootstrap;
    var removeContentButtons = _settingsBridge.removeContentButtons;
    var insertDTULearnNavResourceLinks = _settingsBridge.insertDTULearnNavResourceLinks;
    var removeDTULearnNavResourceLinks = _settingsBridge.removeDTULearnNavResourceLinks;
    var insertParticipantIntelligence = _settingsBridge.insertParticipantIntelligence;
    var insertLibraryNavDropdown = _settingsBridge.insertLibraryNavDropdown;
    var removeLibraryNavDropdown = _settingsBridge.removeLibraryNavDropdown;
    var runLessonsBulkDownloadChecks = _settingsBridge.runLessonsBulkDownloadChecks;
    var showContentShortcutOverridesModal = _settingsBridge.showContentShortcutOverridesModal;
    var getAccentThemeId = _settingsBridge.getAccentThemeId;
    var getAccentCustomHex = _settingsBridge.getAccentCustomHex;
    var setAccentThemeId = _settingsBridge.setAccentThemeId;
    var setAccentCustomHex = _settingsBridge.setAccentCustomHex;
    var getAccentThemeOrder = _settingsBridge.getAccentThemeOrder;
    var getAccentThemes = _settingsBridge.getAccentThemes;
    var getAccentCustomDefault = _settingsBridge.getAccentCustomDefault;
    var applyAfterDarkAdminMenuThemeVars = _settingsBridge.applyAfterDarkAdminMenuThemeVars;
    var markExt = _settingsBridge.markExt;
    var showPausedUrlRulesModal = _settingsPause.showPausedUrlRulesModal;
    var createAfterDarkDisclaimerFooter = _settingsFooter.createAfterDarkDisclaimerFooter;

    function applyFeatureToggleImmediately(featureKey, enabled) {
        var featureKeys = getFeatureKeys();
        if (featureKey === featureKeys.textbookLinks) {
            if (window.location.hostname === 'learn.inside.dtu.dk') {
                if (enabled) {
                    insertBookFinderLinks();
                } else {
                    document.querySelectorAll('[data-book-finder-bar]').forEach(function (el) { el.remove(); });
                    document.querySelectorAll('[data-book-finder-injected]').forEach(function (el) {
                        el.removeAttribute('data-book-finder-injected');
                    });
                }
            }
            if (window.location.hostname === 'kurser.dtu.dk') {
                insertKurserTextbookLinks();
            }
        }
        if (featureKey === featureKeys.campusnetGpaTools && window.location.hostname === 'campusnet.dtu.dk') {
            insertGPARow();
            insertGPASimulator();
            syncCampusnetActualGradeExclusionControls();
        }
        if (featureKey === featureKeys.kurserGradeStats && window.location.hostname === 'kurser.dtu.dk') {
            insertKurserGradeStats();
        }
        if (featureKey === featureKeys.kurserCourseEval && window.location.hostname === 'kurser.dtu.dk') {
            insertKurserCourseEvaluation();
        }
        if (featureKey === featureKeys.kurserCourseMap && window.location.hostname === 'kurser.dtu.dk') {
            insertKurserCourseMap();
        }
        if (featureKey === featureKeys.studyplanExamSchedule && window.location.hostname === 'studieplan.dtu.dk') {
            insertStudyplanExamSchedule();
        }
        if (featureKey === featureKeys.studyplanExamSchedule && window.location.hostname === 'kurser.dtu.dk') {
            insertKurserExamDate();
        }
        if (featureKey === featureKeys.smartRoomLinker) {
            if (enabled) {
                scheduleSmartRoomLinkerScan(null, 140);
            } else {
                removeSmartRoomLinks();
            }
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
        if (featureKey === featureKeys.libraryDropdown && window.location.hostname === 'learn.inside.dtu.dk') {
            if (enabled) {
                insertLibraryNavDropdown();
            } else {
                removeLibraryNavDropdown();
            }
        }
        if (featureKey === featureKeys.learnLessonsBulkDownload && window.location.hostname === 'learn.inside.dtu.dk') {
            try { runLessonsBulkDownloadChecks(); } catch (eLbd0) { }
        }
    }

    // Keyboard handler and scroll state of the open modal, released on close.
    var _settingsModalKeyHandler = null;
    var _settingsModalScrollLock = null;

    function hideSettingsModal() {
        var overlay = document.querySelector('.dtu-settings-modal-overlay');
        if (overlay) overlay.remove();
        if (_settingsModalKeyHandler) {
            try { document.removeEventListener('keydown', _settingsModalKeyHandler, true); } catch (eKey) { }
            _settingsModalKeyHandler = null;
        }
        if (_settingsModalScrollLock) {
            try {
                document.documentElement.style.overflow = _settingsModalScrollLock.html;
                document.body.style.overflow = _settingsModalScrollLock.body;
            } catch (eScroll) { }
            _settingsModalScrollLock = null;
        }
        try {
            var settingsBtn = document.querySelector('.dtu-settings-nav-item button');
            if (settingsBtn) settingsBtn.setAttribute('aria-expanded', 'false');
        } catch (e0) { }
    }

    function showSettingsModal() {
        if (!isTopWindow()) return;
        hideSettingsModal();

        var isDark = isDarkModeEnabled();
        var featureKeys = getFeatureKeys();
        var settingKeys = getSettingKeys();

        var toggleHandlers = {
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
            { id: 'feature-lessons-bulk-download-toggle', key: featureKeys.learnLessonsBulkDownload },
            { id: 'feature-campusnet-gpa-tools-toggle', key: featureKeys.campusnetGpaTools },
            { id: 'feature-studyplan-exam-schedule-toggle', key: featureKeys.studyplanExamSchedule },
            { id: 'feature-participant-intel-toggle', key: featureKeys.participantIntel },
            { id: 'feature-participant-intel-demographics-toggle', key: featureKeys.participantIntelDemographics },
            { id: 'feature-participant-intel-shared-history-toggle', key: featureKeys.participantIntelSharedHistory },
            { id: 'feature-participant-intel-retention-toggle', key: featureKeys.participantIntelRetention },
            { id: 'feature-kurser-grade-stats-toggle', key: featureKeys.kurserGradeStats },
            { id: 'feature-textbook-links-toggle', key: featureKeys.textbookLinks },
            { id: 'feature-kurser-course-eval-toggle', key: featureKeys.kurserCourseEval },
            { id: 'feature-kurser-course-map-toggle', key: featureKeys.kurserCourseMap },
            { id: 'feature-smart-room-linker-toggle', key: featureKeys.smartRoomLinker }
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
                    { kind: 'theme-mode', title: 'Dark Mode' },
                    { kind: 'accent-theme', title: 'Accent Color', desc: 'Official DTU color presets plus custom (default: DTU Corporate Red)' },
                    { tid: 'mojangles-toggle', title: 'Mojangles Splash', desc: 'Tilted Minecraft-style "DTU After Dark" text beside the DTU Learn logo' }
                ]
            },
            {
                id: 'interface', label: 'Shortcuts & Navigation', desc: 'Quick links, nav entries, and shortcut actions', items: [
                    { tid: 'feature-learn-nav-resource-links-toggle', title: 'Navigation Quick Links', desc: 'Adds Panopto and CampusNet to Student Resources, listed first with Final Grades, Student Email and Course Evaluation' },
                    { tid: 'feature-content-shortcut-toggle', title: 'Content Shortcut', desc: 'Adds a direct Content button to each course card' },
                    { tid: 'library-dropdown-toggle', title: 'Library', desc: 'Quick links and live events/news from DTU Library' },
                    { tid: 'feature-smart-room-linker-toggle', title: 'Room links', desc: 'Turn room mentions into MazeMap links (click-to-resolve)' }
                ]
            },
            {
                id: 'dashboard', label: 'Dashboard Widgets', desc: 'DTU Learn homepage widgets and dashboard cards', items: [
                    { tid: 'bus-departures-toggle', title: 'Bus Departures', desc: 'Show live bus departure times around campus' },
                    { tid: 'deadlines-toggle', title: 'Deadlines Widget', desc: 'Timeline of DTU course and exam registration deadlines' },
                    { tid: 'search-widget-toggle', title: 'Course Search', desc: 'Native course search on the dashboard' },
                    { tid: 'feature-lessons-bulk-download-toggle', title: 'Course Content Download', desc: 'Download selected Lessons sections as a ZIP file' }
                ]
            },
            {
                id: 'study-tools', label: 'Study Tools', desc: 'Academic planning features', items: [
                    { tid: 'feature-campusnet-gpa-tools-toggle', title: 'GPA Calculator', desc: 'Weighted grade average on CampusNet' },
                    { tid: 'feature-studyplan-exam-schedule-toggle', title: 'Exam Schedule', desc: 'A button in the Study Planner tab row that lists your exam dates and the days between them, and an Exam date row on kurser.dtu.dk course pages' },
                ]
            },
            {
                id: 'social', label: 'Social', desc: 'Participant intelligence tools', items: [
                    { tid: 'feature-participant-intel-toggle', title: 'Participant Intelligence', desc: 'Optional local-only insights from CampusNet participant lists' },
                    { tid: 'feature-participant-intel-demographics-toggle', title: 'Course Composition', desc: 'Program breakdown on CampusNet participant pages', subToggleOf: 'feature-participant-intel-toggle' },
                    { tid: 'feature-participant-intel-shared-history-toggle', title: 'Shared Course History', desc: 'Shows courses you have previously shared with each student', subToggleOf: 'feature-participant-intel-toggle' },
                    { tid: 'feature-participant-intel-retention-toggle', title: 'Retention', desc: 'Tracks course enrollment changes across visits', subToggleOf: 'feature-participant-intel-toggle' }
                ]
            },
            {
                id: 'course-catalog', label: 'Course Catalog', desc: 'Enhancements for kurser.dtu.dk and course resource pages', items: [
                    { tid: 'feature-kurser-grade-stats-toggle', title: 'Grade Statistics', desc: 'Show pass rates and grade histograms' },
                    { tid: 'feature-textbook-links-toggle', title: 'Textbook Links', desc: 'Textbook source links on DTU Learn and kurser.dtu.dk' },
                    { tid: 'feature-kurser-course-eval-toggle', title: 'Course Evaluation', desc: 'Show evaluation scores on course pages' },
                    { tid: 'feature-kurser-course-map-toggle', title: 'Course Map', desc: 'A row under Academic prerequisites that maps earlier and later courses' }
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
            + '.dtu-am-sidebar{width:200px;min-width:200px;overflow-x:hidden;overflow-y:auto;'
            + 'padding:14px 0;display:flex;flex-direction:column;gap:1px;'
            + 'background:var(--dtu-am-sidebar-bg) !important;border-right:1px solid var(--dtu-am-border) !important}'
            + '.dtu-am-content{flex:1;min-width:0;min-height:0;height:100%;display:flex;flex-direction:column;'
            + 'overflow-x:hidden;overflow-y:auto;padding:20px 34px 20px 24px;'
            + 'background:var(--dtu-am-content-bg) !important}'
            + '.dtu-am-content::-webkit-scrollbar,.dtu-am-sidebar::-webkit-scrollbar{width:0;height:0}'
            + '.dtu-am-content,.dtu-am-sidebar{-ms-overflow-style:none;scrollbar-width:none}'
            + '.dtu-am-sidebar-hd{padding:0 14px 10px;border-bottom:1px solid var(--dtu-am-border) !important;margin-bottom:6px}'
            + '.dtu-am-brand{font-size:14px;font-weight:700;color:var(--dtu-am-text) !important}'
            + '.dtu-am-sub{font-size:11px;font-weight:600;letter-spacing:0;'
            + 'color:var(--dtu-am-muted) !important;margin-top:2px}'
            + '.dtu-am-panel{display:none !important}'
            + '.dtu-am-panel.dtu-active{display:block !important}'
            + '.dtu-am-panel-title{font-size:18px;font-weight:600;color:var(--dtu-am-text) !important;margin:0 0 2px}'
            + '.dtu-am-panel-desc{font-size:12px;color:var(--dtu-am-muted) !important;margin-bottom:16px}'
            + '.dtu-nav-i{padding:8px 14px;cursor:pointer;border-radius:6px;margin:2px 6px;transition:background .15s;user-select:none;-webkit-user-select:none;'
            + 'font-size:13px;color:var(--dtu-am-text) !important;white-space:nowrap}'
            + '.dtu-nav-i:hover{background:var(--dtu-am-hover) !important}'
            + '.dtu-nav-i.dtu-active{background:var(--dtu-am-active-bg) !important;'
            + 'color:var(--dtu-am-active-text) !important;font-weight:600}'
            + '.dtu-set-row{display:flex;align-items:center;justify-content:space-between;gap:16px;'
            + 'padding:12px 0;border-bottom:1px solid var(--dtu-am-border) !important}'
            + '.dtu-set-row:last-child{border-bottom:none}'
            + '.dtu-set-row.dtu-set-row-sub{margin-left:18px;padding-left:12px;padding-top:9px;padding-bottom:9px;'
            + 'border-bottom:1px dashed var(--dtu-am-border) !important;}'
            + '.dtu-set-row.dtu-set-row-sub .dtu-am-title{font-size:12px;font-weight:600;}'
            + '.dtu-set-row.dtu-set-row-sub .dtu-am-desc{font-size:10.5px;}'
            + '.dtu-am-info{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}'
            + '.dtu-am-title{font-size:13px;font-weight:600;color:var(--dtu-am-text) !important;'
            + 'white-space:normal;overflow-wrap:anywhere;word-break:break-word;max-width:100%}'
            + '.dtu-am-desc{font-size:11px;color:var(--dtu-am-muted) !important;line-height:1.25;'
            + 'white-space:normal;overflow-wrap:anywhere;word-break:break-word;max-width:100%}'
            + '.dtu-am-root a.dtu-am-link{font-size:11px;line-height:1.25;color:var(--dtu-am-action) !important;'
            + 'text-decoration:none !important;margin-top:1px}'
            + '.dtu-am-root a.dtu-am-link:hover{text-decoration:underline !important;color:var(--dtu-am-action) !important}'
            + '.dtu-am-root a:focus-visible,.dtu-am-root button:focus-visible,.dtu-am-root select:focus-visible,.dtu-nav-i:focus-visible{outline:2px solid var(--dtu-am-text) !important;outline-offset:2px !important}'
            + '.dtu-tog input:focus-visible+.dtu-tog-sl{outline:2px solid var(--dtu-am-text) !important;outline-offset:2px !important}'
            + '[role="dialog"]:focus{outline:none !important}'
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
            + '.dtu-seg{display:inline-flex;gap:2px;padding:3px;border-radius:10px;'
            + 'background:var(--dtu-am-input-bg) !important;border:1px solid var(--dtu-am-border) !important}'
            + '.dtu-seg label{position:relative;display:block}'
            + '.dtu-seg input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}'
            + '.dtu-seg span{display:block;padding:5px 12px;border-radius:7px;font-size:12px;font-weight:700;'
            + 'color:var(--dtu-am-muted) !important}'
            + '.dtu-seg input:checked+span{background:var(--dtu-am-accent) !important;color:#fff !important}'
            + '.dtu-seg input:focus-visible+span{outline:2px solid var(--dtu-am-text);outline-offset:1px}'
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

        // Every user-initiated close returns focus to the Settings button.
        function closeFromUser() {
            hideSettingsModal();
            var opener = document.querySelector('.dtu-settings-nav-item button');
            if (opener) {
                try { opener.focus({ preventScroll: true }); } catch (eFocus) { }
            }
        }

        overlay.addEventListener('mousedown', function (e) {
            if (e.target === overlay) closeFromUser();
        });

        var modal = document.createElement('div');
        markExt(modal);
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'dtu-am-dialog-title');
        modal.tabIndex = -1;

        // Escape closes; Tab and Shift+Tab stay inside the dialog.
        _settingsModalKeyHandler = function (e) {
            if (!e) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                closeFromUser();
                return;
            }
            if (e.key !== 'Tab') return;
            var focusables = Array.prototype.filter.call(
                modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'),
                function (el) { return el.getClientRects().length > 0 || el === document.activeElement; }
            );
            if (!focusables.length) { e.preventDefault(); modal.focus(); return; }
            var first = focusables[0];
            var last = focusables[focusables.length - 1];
            var active = document.activeElement;
            if (!modal.contains(active)) {
                e.preventDefault();
                (e.shiftKey ? last : first).focus();
            } else if (e.shiftKey && (active === first || active === modal)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', _settingsModalKeyHandler, true);
        _settingsModalScrollLock = { html: document.documentElement.style.overflow, body: document.body.style.overflow };
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
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
        sidebarBrand.id = 'dtu-am-dialog-title';
        sidebarBrand.setAttribute('role', 'heading');
        sidebarBrand.setAttribute('aria-level', '2');
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
            navItem.setAttribute('role', 'button');
            navItem.tabIndex = 0;
            if (cat.id === firstCat) navItem.setAttribute('aria-current', 'true');
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
                if (item && item.kind === 'theme-mode') {
                    // One setting, three values: Light, Dark, or Auto (follow the device).
                    var rowT = document.createElement('div');
                    markExt(rowT);
                    rowT.className = 'dtu-set-row';
                    var infoT = document.createElement('div');
                    markExt(infoT);
                    infoT.className = 'dtu-am-info';
                    var titleT = document.createElement('div');
                    markExt(titleT);
                    titleT.textContent = item.title;
                    titleT.className = 'dtu-am-title';
                    var descT = document.createElement('div');
                    markExt(descT);
                    descT.className = 'dtu-am-desc';
                    var deviceDark = false;
                    try { deviceDark = window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (eMq) { }
                    var modeNow = isFollowingDeviceTheme() ? 'auto' : (isDarkModeEnabled() ? 'dark' : 'light');
                    var modeDesc = {
                        dark: 'Always dark on all DTU sites',
                        light: 'Always light on all DTU sites',
                        auto: 'Following your device, currently ' + (deviceDark ? 'dark' : 'light')
                    };
                    descT.textContent = modeDesc[modeNow];
                    infoT.appendChild(titleT);
                    infoT.appendChild(descT);
                    var actionsT = document.createElement('div');
                    markExt(actionsT);
                    actionsT.className = 'dtu-am-actions';
                    var segT = document.createElement('div');
                    markExt(segT);
                    segT.className = 'dtu-seg';
                    segT.setAttribute('role', 'radiogroup');
                    segT.setAttribute('aria-label', 'Dark Mode');
                    [['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']].forEach(function (opt) {
                        var lab = document.createElement('label');
                        markExt(lab);
                        var radio = document.createElement('input');
                        radio.type = 'radio';
                        radio.name = 'dtu-dark-mode-mode';
                        radio.id = 'dark-mode-mode-' + opt[0];
                        radio.value = opt[0];
                        radio.checked = opt[0] === modeNow;
                        var face = document.createElement('span');
                        markExt(face);
                        face.textContent = opt[1];
                        radio.addEventListener('change', function () {
                            if (!radio.checked || opt[0] === modeNow) return;
                            var saved = opt[0] === 'auto' ? saveDarkModeFollowDevice(true) : saveDarkModePreference(opt[0] === 'dark');
                            Promise.resolve(saved).then(function () { location.reload(); });
                        });
                        lab.appendChild(radio);
                        lab.appendChild(face);
                        segT.appendChild(lab);
                    });
                    actionsT.appendChild(segT);
                    rowT.appendChild(infoT);
                    rowT.appendChild(actionsT);
                    panel.appendChild(rowT);
                    return;
                }
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
                    sel.setAttribute('aria-label', item.title);
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
                    color.setAttribute('aria-label', 'Custom accent colour');
                    color.setAttribute('data-dtu-accent-custom-input', '1');
                    try { color.value = getAccentCustomHex() || getAccentCustomDefault(); } catch (eC0) { }
                    color.style.display = (getAccentThemeId() === 'custom') ? '' : 'none';
                    // Dragging fires 'input' many times a second: preview it on this page
                    // only, and save (which re-themes every open DTU tab) on 'change'.
                    function onPickCustomColor(persist) {
                        var picked = '';
                        try { picked = color.value; } catch (eV0) { picked = ''; }
                        var opts = persist ? undefined : { noStorage: true };
                        if (picked) setAccentCustomHex(picked, opts);
                        setAccentThemeId('custom', opts);
                        try { sel.value = 'custom'; } catch (eS1) { }
                    }
                    color.addEventListener('input', function () { onPickCustomColor(false); });
                    color.addEventListener('change', function () { onPickCustomColor(true); });

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
                input.setAttribute('aria-label', item.title);
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
            navItems.forEach(function (n) {
                var on = n.getAttribute('data-cat') === catId;
                n.classList.toggle('dtu-active', on);
                if (on) n.setAttribute('aria-current', 'true');
                else n.removeAttribute('aria-current');
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
            navItem.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') activate(e);
            });
        });

        contentArea.appendChild(createAfterDarkDisclaimerFooter());
        container.appendChild(sidebar);
        container.appendChild(contentArea);
        modal.appendChild(container);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        try { modal.focus({ preventScroll: true }); } catch (eFocusIn) { }
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
