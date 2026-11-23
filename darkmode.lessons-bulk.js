(function () {
    'use strict';

    var schedulePlacement = globalThis.DTUAfterDarkDom.schedulePlacement;
    if (typeof schedulePlacement !== 'function') {
        throw new Error('darkmode.lessons-bulk.js requires DTUAfterDarkDom.schedulePlacement');
    }

    var _lessonsBulkCore = globalThis.DTUAfterDarkLessonsBulkCore;
    var isTopWindow = _lessonsBulkCore.isTopWindow;
    var isFeatureFlagEnabled = _lessonsBulkCore.isFeatureFlagEnabled;
    var isDarkModeEnabled = _lessonsBulkCore.isDarkModeEnabled;
    var deepQueryAll = _lessonsBulkCore.deepQueryAll;
    var getDocHref = _lessonsBulkCore.getDocHref;
    var markExt = _lessonsBulkCore.markExt;
    var logLessonsBulkDebug = _lessonsBulkCore.logLessonsBulkDebug;

    var _lessonsBulkState = globalThis.DTUAfterDarkLessonsBulkState;
    var _lessonsBulkUiState = _lessonsBulkState.uiState;
    var _lessonsBulkUrlNameHints = _lessonsBulkState.urlNameHints;
    var _lessonsLegacyApiSectionsCache = _lessonsBulkState.legacyApiSectionsCache;
    var _lessonsLegacyModuleStructureCache = _lessonsBulkState.legacyModuleStructureCache;

    var downloadSingleBundledZipFromUrls = globalThis.DTUAfterDarkLessonsBulkZip.downloadSingleBundledZipFromUrls;
    var getFilenameFromUrl = globalThis.DTUAfterDarkLessonsBulkZip.getFilenameFromUrl;

    var _lessonsBulkTree = globalThis.DTUAfterDarkLessonsBulkTree;
    var getLessonsCandidateDocuments = _lessonsBulkTree.getLessonsCandidateDocuments;
    var getLessonsWorkingDocument = _lessonsBulkTree.getLessonsWorkingDocument;
    var getLessonsRuntimeDocument = _lessonsBulkTree.getLessonsRuntimeDocument;
    var getLessonsTocHost = _lessonsBulkTree.getLessonsTocHost;
    var hasModernLessonsTocStructure = _lessonsBulkTree.hasModernLessonsTocStructure;
    var getCurrentLessonsOrgUnitId = _lessonsBulkTree.getCurrentLessonsOrgUnitId;
    var isLegacyLessonsTreeDocument = _lessonsBulkTree.isLegacyLessonsTreeDocument;
    var parseLegacySectionObjectId = _lessonsBulkTree.parseLegacySectionObjectId;
    var legacySectionHasOnlyUnitUrls = _lessonsBulkTree.legacySectionHasOnlyUnitUrls;
    var applyResolvedUrlsToLegacySections = _lessonsBulkTree.applyResolvedUrlsToLegacySections;
    var resolveLegacySectionUnitUrlsViaHiddenFrame = _lessonsBulkTree.resolveLegacySectionUnitUrlsViaHiddenFrame;
    var sanitizeLessonsSectionUnitUrls = _lessonsBulkTree.sanitizeLessonsSectionUnitUrls;
    var normalizeLessonsBulkSections = _lessonsBulkTree.normalizeLessonsBulkSections;
    var isLegacyQualityBetter = _lessonsBulkTree.isLegacyQualityBetter;
    var buildLegacySectionsViaHiddenFrame = _lessonsBulkTree.buildLegacySectionsViaHiddenFrame;
    var maybeStartLegacyApiSectionsHydration = _lessonsBulkTree.maybeStartLegacyApiSectionsHydration;
    var buildLessonsTreeSections = _lessonsBulkTree.buildLessonsTreeSections;

    var _lessonsBulkFetch = globalThis.DTUAfterDarkLessonsBulkFetch;
    var toAbsoluteSamePageUrl = _lessonsBulkFetch.toAbsoluteSamePageUrl;
    var isStrictFileDownloadUrl = _lessonsBulkFetch.isStrictFileDownloadUrl;
    var getApiObjectTitle = _lessonsBulkFetch.getApiObjectTitle;
    var getDirectModuleChildrenFromStructure = _lessonsBulkFetch.getDirectModuleChildrenFromStructure;
    var getDirectTopicIdsFromStructure = _lessonsBulkFetch.getDirectTopicIdsFromStructure;
    var fetchLegacyModuleStructureApi = _lessonsBulkFetch.fetchLegacyModuleStructureApi;
    var collectTopicIdsFromJsonValue = _lessonsBulkFetch.collectTopicIdsFromJsonValue;
    var collectModuleIdsFromJsonValue = _lessonsBulkFetch.collectModuleIdsFromJsonValue;
    var loadLessonsTocIndex = _lessonsBulkFetch.loadLessonsTocIndex;
    var fetchLessonsUnitDownloadResult = _lessonsBulkFetch.fetchLessonsUnitDownloadResult;
    var parseLessonsTopicIds = _lessonsBulkFetch.parseLessonsTopicIds;
    var getTopicLabelHintFromTopicUrl = _lessonsBulkFetch.getTopicLabelHintFromTopicUrl;
    var collectTopicFileUrlsInCurrentPage = _lessonsBulkFetch.collectTopicFileUrlsInCurrentPage;
    var lessonsBulkFetch = _lessonsBulkFetch.lessonsBulkFetch;
    var lessonsBulkDelay = _lessonsBulkFetch.lessonsBulkDelay;
    var _lessonsBulkActivity = globalThis.DTUAfterDarkLessonsBulkActivity;
    if (!_lessonsBulkActivity) throw new Error('darkmode.lessons-bulk.js requires darkmode.lessons-bulk.activity.js');
    var _lessonsBulkVideo = globalThis.DTUAfterDarkLessonsBulkVideo;
    if (!_lessonsBulkVideo) throw new Error('darkmode.lessons-bulk.js requires darkmode.lessons-bulk.video.js');
    var parseLessonsUnitIds = _lessonsBulkFetch.parseLessonsUnitIds;
    // Section key to its video summary ({count, bytes, unknown}) for the course on screen.
    var _lessonsVideoSummaries = new Map();

    const LESSONS_BULK_ROOT_ID = 'dtu-lessons-bulk-download-root';
    const LESSONS_BULK_STYLE_ID = 'dtu-lessons-bulk-download-style';

    // True once this module has actually put a root or style element in the page.
    // While it is false there is nothing to remove, so the removal paths can skip
    // their full shadow-DOM walks -- which is every mutation batch on pages that
    // have no lessons UI at all, such as /d2l/home.
    let _lessonsBulkUiInserted = false;
    var _lessonsBulkBootstrapWatch = null;

    var LESSONS_BULK_SCAN_CONCURRENCY = 4;

    function isLessonsBulkDownloadEnabled() {
        return isFeatureFlagEnabled(globalThis.DTUAfterDarkFeatureFlags.FEATURE_LEARN_LESSONS_BULK_DOWNLOAD_KEY);
    }

    function isDTULearnLessonsPage() {
        if (window.location.hostname !== 'learn.inside.dtu.dk') return false;
        var path = window.location.pathname || '';
        if (/^\/d2l\/le\/lessons\/\d+(?:\/.*)?$/i.test(path)) return true;
        if (/^\/d2l\/le\/content\/\d+(?:\/.*)?$/i.test(path)) return true;
        // The deep walk below is the expensive fallback for other course-content
        // routes. Outside /d2l/le/ a lessons TOC cannot exist, so don't pay for it
        // on the homepage and friends -- that walk ran on every mutation batch.
        if (!/^\/d2l\/le\//i.test(path)) return false;
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
            _lessonsBulkUiInserted = true;
        }

        var panelBg = isDarkModeEnabled() ? '#2d2d2d' : '#ffffff';
        var panelBorder = isDarkModeEnabled() ? '#404040' : '#d9d9d9';
        var textColor = isDarkModeEnabled() ? '#e0e0e0' : '#222222';
        var mutedColor = isDarkModeEnabled() ? '#b5b5b5' : '#666666';
        var btnBg = isDarkModeEnabled() ? '#242424' : '#f7f7f7';
        var toggleBg = isDarkModeEnabled() ? '#2d2d2d' : '#ffffff';

        style.textContent = ''
            + '#' + LESSONS_BULK_ROOT_ID + '{color-scheme:' + (isDarkModeEnabled() ? 'dark' : 'light') + ';margin-top:24px;padding-top:6px;position:relative;z-index:2;width:100%;max-width:100%;display:flex;flex-direction:column;align-items:stretch;gap:6px;clear:both;}'
            // A full-width row in the week list's column, like the search box
            // above it. !important beats the global dark `button` repaint.
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-toggle{'
            + 'all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;'
            + 'position:relative;inset:auto;transform:none;'
            + 'width:100%;min-height:36px;margin:0;padding:8px 12px;border-radius:8px;cursor:pointer;'
            + 'font-size:13px;line-height:1.25;font-weight:600;'
            + 'background:' + toggleBg + ' !important;color:' + textColor + ' !important;border:1px solid ' + panelBorder + ' !important;'
            + 'transition:border-color .12s cubic-bezier(0.2,0,0,1);'
            + '}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-toggle:hover,'
            + '#' + LESSONS_BULK_ROOT_ID + '.dtu-open .dtu-lbd-toggle{border-color:var(--dtu-ad-accent) !important;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-toggle:active{background:' + panelBg + ' !important;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-toggle svg,#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-toggle svg path{flex:0 0 auto;width:16px;height:16px;fill:none !important;stroke:currentColor !important;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-toggle .dtu-lbd-icon{color:var(--dtu-ad-accent-text, var(--dtu-ad-accent));}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-toggle-label{flex:1 1 auto;min-width:0;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-chevron{color:' + mutedColor + ';transition:transform .15s cubic-bezier(0.2,0,0,1);}'
            + '#' + LESSONS_BULK_ROOT_ID + '.dtu-open .dtu-lbd-chevron{transform:rotate(180deg);}'
            + '@media (prefers-reduced-motion: reduce){#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-chevron,#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-toggle{transition:none;}}'
            // D2L draws its own 1.2rem checkboxes (appearance:none), which the
            // dark input repaint turns into empty squares; use the native box.
            + '#app #root-wrapper #' + LESSONS_BULK_ROOT_ID + ' input[type="checkbox"],#' + LESSONS_BULK_ROOT_ID + ' input[type="checkbox"]'
            + '{appearance:auto !important;-webkit-appearance:checkbox !important;width:14px !important;height:14px !important;margin:2px 0 0 !important;flex:0 0 auto;}'
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
            // The lessons app ships `#app #root-wrapper :focus{outline:none}`; the
            // #app #root-wrapper prefix out-ranks it where the control lives there.
            + '#' + LESSONS_BULK_ROOT_ID + ' input:focus-visible,#' + LESSONS_BULK_ROOT_ID + ' button:focus-visible,'
            + '#app #root-wrapper #' + LESSONS_BULK_ROOT_ID + ' input:focus-visible,#app #root-wrapper #' + LESSONS_BULK_ROOT_ID + ' button:focus-visible'
            + '{outline:2px solid currentColor !important;outline-offset:2px !important;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-hint{hyphens:manual !important;-webkit-hyphens:manual !important;}'
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
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-mini:hover{border-color:var(--dtu-ad-accent);color:var(--dtu-ad-accent-text, var(--dtu-ad-accent));}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-run{background:var(--dtu-ad-accent-deep);border-color:var(--dtu-ad-accent-deep);color:var(--dtu-ad-accent-deep-on, #ffffff);font-weight:700;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-run:hover{background:var(--dtu-ad-accent-deep-hover);border-color:var(--dtu-ad-accent-deep-hover);}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-run:disabled,'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-mini:disabled{opacity:0.55;cursor:not-allowed;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-cancel{display:none;}'
            + '#' + LESSONS_BULK_ROOT_ID + '.dtu-lbd-running .dtu-lbd-cancel{display:inline-block;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-status{display:block;width:100%;max-width:100%;margin-top:8px;min-height:14px;font-size:11px;line-height:1.3;color:' + mutedColor + ';white-space:normal !important;overflow-wrap:anywhere !important;word-break:break-word !important;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-activity{margin-top:8px;padding-top:8px;border-top:1px solid ' + panelBorder + ';}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-activity-head{margin:0 0 4px;font-weight:600;}'
            + '#' + LESSONS_BULK_ROOT_ID + ' .dtu-lbd-empty{font-size:11px;color:' + mutedColor + ';padding:4px 2px 6px;white-space:normal;}';
    }

    function describeLessonsBulkEmptyResult(scanResults) {
        var results = scanResults || [];
        var unread = results.filter(function (r) { return r && r.unread; }).length;
        if (!unread) return 'No downloadable files found in selected sections.';
        return 'Could not read ' + unread + ' of ' + results.length + ' lesson page'
            + (results.length === 1 ? '' : 's') + '. Try again.';
    }

    function rememberLessonsBulkUrlNameHint(url, hint) {
        if (!url || !hint) return;
        if (!_lessonsBulkUrlNameHints.has(url)) _lessonsBulkUrlNameHints.set(url, hint);
        try {
            var u = new URL(url, window.location.href);
            var canonical = u.origin + u.pathname;
            if (!_lessonsBulkUrlNameHints.has(canonical)) _lessonsBulkUrlNameHints.set(canonical, hint);
        } catch (e0) { }
    }

    function isLessonsBulkRunAborted() {
        return !!(_lessonsBulkState.runAbort && _lessonsBulkState.runAbort.signal.aborted);
    }

    function throwIfLessonsBulkAborted() {
        if (isLessonsBulkRunAborted()) {
            var err = new Error('Bulk download cancelled');
            err.name = 'AbortError';
            throw err;
        }
    }

    function cancelLessonsBulkRun() {
        if (_lessonsBulkState.runAbort && !_lessonsBulkState.runAbort.signal.aborted) {
            try { _lessonsBulkState.runAbort.abort(); } catch (e0) { }
        }
    }

    function setLessonsBulkStatus(rootEl, text, tone) {
        if (!rootEl) return;
        var status = rootEl.querySelector('.dtu-lbd-status');
        if (!status) return;
        status.textContent = text || '';
        var color = '';
        if (tone === 'error') color = isDarkModeEnabled() ? '#ff9fa4' : '#a8202a';
        else if (tone === 'ok') color = isDarkModeEnabled() ? '#79d39a' : '#0c7a39';
        else if (tone === 'work') color = isDarkModeEnabled() ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep-text, var(--dtu-ad-accent-deep))';
        status.style.color = color || '';
    }

    function updateLessonsBulkRunButton(rootEl) {
        if (!rootEl) return;
        var runBtn = rootEl.querySelector('.dtu-lbd-run');
        if (!runBtn) return;
        var selectedCount = 0;
        rootEl.querySelectorAll('.dtu-lbd-list input[type="checkbox"][data-section-key], .dtu-lbd-activity input[type="checkbox"]').forEach(function (cb) {
            if (cb.checked) selectedCount++;
        });
        runBtn.textContent = selectedCount > 0
            ? ('Download selected (' + selectedCount + ')')
            : 'Download selected';
    }

    function setLessonsBulkControlsDisabled(rootEl, disabled) {
        if (!rootEl) return;
        rootEl.querySelectorAll('.dtu-lbd-mini:not(.dtu-lbd-cancel), .dtu-lbd-run, .dtu-lbd-list input[type="checkbox"], .dtu-lbd-activity input[type="checkbox"]').forEach(function (el) {
            el.disabled = !!disabled;
        });
        rootEl.classList.toggle('dtu-lbd-running', !!disabled);
    }

    // Status after a bundle: what was saved, then every file that was not, by
    // name, so a missing file is never a surprise when the student unzips.
    function describeLessonsBundleResult(bundle) {
        var fail = bundle.failByReason || {};
        var names = Array.isArray(bundle.failedNames) ? bundle.failedNames : [];
        var skippedLarge = fail['too-large'] || 0;
        var text = bundle.parts > 1
            ? 'Started ' + bundle.parts + ' ZIP downloads (' + bundle.fileCount + ' files, split into parts of up to 2 GB).'
            : 'Started 1 bundled ZIP download (' + bundle.fileCount + ' file' + (bundle.fileCount === 1 ? '' : 's') + ').';
        if (skippedLarge) text += ' Skipped ' + skippedLarge + ' file' + (skippedLarge === 1 ? '' : 's') + ' over 4 GB.';
        if (names.length) {
            var shown = names.slice(0, 5).join(', ');
            if (names.length > 5) shown += ' and ' + (names.length - 5) + ' more';
            text += ' ' + names.length + ' file' + (names.length === 1 ? '' : 's') + ' could not be downloaded: ' + shown + '.';
        }
        return text;
    }

    async function runLessonsBulkDownload(rootEl) {
        if (!rootEl || _lessonsBulkUiState.running || _lessonsBulkState.runAbort) return;
        if (!isLessonsBulkDownloadEnabled()) return;
        if (!isDTULearnLessonsPage()) return;
        _lessonsBulkUiState.running = true;
        _lessonsBulkState.runAbort = new AbortController();
        _lessonsBulkState.zipPartsSaved = 0;
        setLessonsBulkControlsDisabled(rootEl, true);

        function ensureCurrentRun() {
            if (!isLessonsBulkDownloadEnabled() || !isDTULearnLessonsPage() || rootEl.isConnected === false) {
                cancelLessonsBulkRun();
            }
            throwIfLessonsBulkAborted();
        }

        try {
            ensureCurrentRun();
            _lessonsBulkUiState.activeDoc = (rootEl && rootEl.ownerDocument) ? rootEl.ownerDocument : getLessonsWorkingDocument(document);
            _lessonsBulkUrlNameHints.clear();
            if (isLegacyLessonsTreeDocument(_lessonsBulkUiState.activeDoc)) {
                maybeStartLegacyApiSectionsHydration(_lessonsBulkUiState.activeDoc, rootEl);
                var legacyOrgUnitId = getCurrentLessonsOrgUnitId(_lessonsBulkUiState.activeDoc);
                if (legacyOrgUnitId && _lessonsLegacyApiSectionsCache.orgUnitId === legacyOrgUnitId && _lessonsLegacyApiSectionsCache.promise) {
                    setLessonsBulkStatus(rootEl, 'Scanning full content tree for section folders...', 'work');
                    try {
                        await _lessonsLegacyApiSectionsCache.promise;
                    } catch (eLbdHyd0) { }
                    ensureCurrentRun();
                    refreshLessonsBulkDownloadUi(rootEl, true);
                }
            }

            var selectedKeys = [];
            rootEl.querySelectorAll('.dtu-lbd-list input[type="checkbox"][data-section-key]').forEach(function (cb) {
                if (cb.checked) selectedKeys.push(cb.getAttribute('data-section-key'));
            });

            var activityKinds = [];
            rootEl.querySelectorAll('.dtu-lbd-activity input[type="checkbox"][data-activity-key]').forEach(function (cb) {
                if (cb.checked) activityKinds.push(cb.getAttribute('data-activity-key'));
            });

            if (!selectedKeys.length && !activityKinds.length) {
                setLessonsBulkStatus(rootEl, 'Select at least one section or activity first.', 'error');
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
                    ensureCurrentRun();
                    var resolvedOnlyUnits = legacySectionHasOnlyUnitUrls({ unitUrls: Array.isArray(resolvedUrls) ? resolvedUrls : [] });
                    if ((!resolvedUrls || !resolvedUrls.length || resolvedOnlyUnits) && looksCollapsedOnly) {
                        if (!hiddenSectionsFallback) {
                            hiddenSectionsFallback = await buildLegacySectionsViaHiddenFrame(_lessonsBulkUiState.activeDoc);
                            ensureCurrentRun();
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
            if (!unitUrls.length && !activityKinds.length) {
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

            ensureCurrentRun();
            setLessonsBulkStatus(rootEl, 'Reading course contents...', 'work');

            var tocOrgUnitId = getCurrentLessonsOrgUnitId(_lessonsBulkUiState.activeDoc);
            if (!tocOrgUnitId) {
                var firstIds = parseLessonsTopicIds(unitUrls[0]);
                if (firstIds) tocOrgUnitId = firstIds.orgUnitId;
            }
            await loadLessonsTocIndex(tocOrgUnitId);
            throwIfLessonsBulkAborted();
            setLessonsBulkStatus(rootEl, 'Scanning lesson pages for downloadable files...', 'work');

            var downloadUrlSet = new Set();
            var nativeFallbackTopics = [];
            var scanResults = new Array(unitUrls.length);
            var scanNext = 0;
            var scanDone = 0;
            async function scanWorker() {
                while (scanNext < unitUrls.length && !isLessonsBulkRunAborted()) {
                    var idx = scanNext++;
                    try {
                        scanResults[idx] = await fetchLessonsUnitDownloadResult(unitUrls[idx]);
                    } catch (eScan) {
                        scanResults[idx] = { links: [], unread: true };
                    }
                    scanDone++;
                    setLessonsBulkStatus(rootEl, 'Scanning page ' + scanDone + ' / ' + unitUrls.length + '...', 'work');
                }
            }
            var scanWorkers = [];
            for (var w = 0; w < Math.min(LESSONS_BULK_SCAN_CONCURRENCY, unitUrls.length); w++) scanWorkers.push(scanWorker());
            await Promise.all(scanWorkers);
            throwIfLessonsBulkAborted();

            var videoItems = [];
            var videoTopicIds = new Set();
            for (var i = 0; i < unitUrls.length; i++) {
                var result = scanResults[i] || { links: [] };
                (result.links || []).forEach(function (url) { downloadUrlSet.add(url); });
                (result.videos || []).forEach(function (v) {
                    if (videoTopicIds.has(v.topicId)) return;
                    videoTopicIds.add(v.topicId);
                    videoItems.push({ orgUnitId: v.orgUnitId, topicId: v.topicId, name: v.title || ('video-' + v.topicId) });
                });
                if (/\/topics\//i.test(unitUrls[i]) && result && result.links && result.links.length) {
                    var topicHint = getTopicLabelHintFromTopicUrl(unitUrls[i]);
                    if (topicHint) {
                        result.links.forEach(function (u0) {
                            rememberLessonsBulkUrlNameHint(u0, topicHint);
                        });
                    }
                }
                if ((!result.links || !result.links.length) && !result.notFile && /\/topics\//i.test(unitUrls[i])) {
                    nativeFallbackTopics.push(unitUrls[i]);
                }
                logLessonsBulkDebug('run_scan_result', {
                    page: i + 1,
                    totalPages: unitUrls.length,
                    unitUrl: unitUrls[i],
                    foundForPage: (result.links || []).length,
                    cumulativeUnique: downloadUrlSet.size
                });
            }

            var downloadUrls = Array.from(downloadUrlSet).filter(function (u) { return isStrictFileDownloadUrl(u); });
            logLessonsBulkDebug('run_after_filter', {
                rawUnique: downloadUrlSet.size,
                strictUnique: downloadUrls.length,
                urls: downloadUrls
            });
            var bundledUrlSet = new Set(downloadUrls);
            if (nativeFallbackTopics.length) {
                setLessonsBulkStatus(rootEl, 'Resolving topic files for one ZIP bundle...', 'work');
                for (var rf = 0; rf < nativeFallbackTopics.length; rf++) {
                    throwIfLessonsBulkAborted();
                    setLessonsBulkStatus(rootEl, 'Resolving topic ' + (rf + 1) + ' / ' + nativeFallbackTopics.length + '...', 'work');
                    var recovered = await collectTopicFileUrlsInCurrentPage(nativeFallbackTopics[rf]);
                    var topicHintRf = getTopicLabelHintFromTopicUrl(nativeFallbackTopics[rf]);
                    (recovered || []).forEach(function (u) {
                        if (isStrictFileDownloadUrl(u)) {
                            bundledUrlSet.add(u);
                            rememberLessonsBulkUrlNameHint(u, topicHintRf);
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
            var activity = { entries: [], notes: [], failed: [] };
            if (activityKinds.length) {
                setLessonsBulkStatus(rootEl, 'Saving course activity...', 'work');
                activity = await _lessonsBulkActivity.collectCourseActivity(tocOrgUnitId, activityKinds, function (text) {
                    setLessonsBulkStatus(rootEl, text, 'work');
                });
                throwIfLessonsBulkAborted();
            }
            var activityNote = activity.notes.join(' ');
            if (!bundledUrls.length && !videoItems.length && !activity.entries.length) {
                setLessonsBulkStatus(rootEl, unitUrls.length ? describeLessonsBulkEmptyResult(scanResults) : ('Nothing to save in the selected course activity. ' + activityNote).trim(), 'error');
                logLessonsBulkDebug('run_no_downloadable_files', {
                    selectedKeys: selectedKeys,
                    unitUrls: unitUrls,
                    nativeAttempted: nativeFallbackTopics.length
                });
                return;
            }

            // Videos are saved as their own downloads, never in the in-memory ZIP (see the video module).
            bundledUrls.forEach(function (u) {
                if (_lessonsBulkVideo.isVideoUrl(u)) videoItems.push({ url: u, name: getFilenameFromUrl(u) });
            });
            bundledUrls = bundledUrls.filter(function (u) { return !_lessonsBulkVideo.isVideoUrl(u); });
            var resultText = '';
            var failed = false;
            var savedAny = false;
            if (bundledUrls.length || activity.entries.length) {
                setLessonsBulkStatus(rootEl, 'Building one ZIP bundle (' + (bundledUrls.length + activity.entries.length) + ' file(s))...', 'work');
                var bundle = await downloadSingleBundledZipFromUrls(rootEl, bundledUrls, activity.entries);
                if (bundle && bundle.ok) {
                    bundle.failedNames = (bundle.failedNames || []).concat(activity.failed);
                    resultText = describeLessonsBundleResult(bundle);
                    savedAny = true;
                    failed = bundle.failedNames.length > 0;
                    logLessonsBulkDebug('run_single_zip_ok', bundle);
                } else {
                    var bundleFail = (bundle && bundle.failByReason) ? bundle.failByReason : {};
                    var bundleParts = Object.keys(bundleFail).map(function (k) { return k + ':' + bundleFail[k]; });
                    resultText = 'Could not create bundled ZIP from selected topics.' + (bundleParts.length ? (' (' + bundleParts.join(', ') + ')') : '');
                    failed = true;
                    logLessonsBulkDebug('run_single_zip_fail', bundle || null);
                }
            }
            if (videoItems.length) {
                var videoFailed = [];
                for (var vi = 0; vi < videoItems.length; vi++) {
                    throwIfLessonsBulkAborted();
                    setLessonsBulkStatus(rootEl, 'Starting video download ' + (vi + 1) + ' / ' + videoItems.length + '...', 'work');
                    var saved = await _lessonsBulkVideo.saveVideo(videoItems[vi]);
                    if (!saved.ok) videoFailed.push(videoItems[vi].name);
                    if (vi < videoItems.length - 1) await new Promise(function (resolve) { setTimeout(resolve, 1500); });
                }
                var started = videoItems.length - videoFailed.length;
                if (started) savedAny = true;
                if (started) resultText += ' Started ' + started + ' video' + (started === 1 ? '' : 's') + ' as separate downloads; your browser shows the progress.';
                if (videoFailed.length) {
                    resultText += ' Could not save: ' + videoFailed.join(', ') + '.';
                    failed = true;
                }
            }
            // Course files and videos carry no footer of their own, so the run's last line repeats the rule.
            if (savedAny) resultText += ' ' + _lessonsBulkActivity.FORWARD_NOTE;
            setLessonsBulkStatus(rootEl, (resultText.trim() + ' ' + activityNote).trim(), (failed || activityNote) ? 'error' : 'ok');
        } catch (eRun) {
            if (!isLessonsBulkRunAborted()) throw eRun;
            setLessonsBulkStatus(rootEl, _lessonsBulkState.zipPartsSaved
                ? 'Cancelled. ' + _lessonsBulkState.zipPartsSaved + ' ZIP part' + (_lessonsBulkState.zipPartsSaved === 1 ? ' was' : 's were') + ' already saved; nothing more will be.'
                : 'Cancelled. Nothing was saved.', 'error');
            logLessonsBulkDebug('run_cancelled', {});
        } finally {
            _lessonsBulkState.runAbort = null;
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
        var sizeOu = getCurrentLessonsOrgUnitId(rootDoc);

        list.textContent = '';

        var validKeySet = new Set((sections || []).map(function (s) { return s.key; }));
        _lessonsBulkUiState.selectedKeys = new Set(
            Array.from(_lessonsBulkUiState.selectedKeys || []).filter(function (k) { return validKeySet.has(k); })
        );

        if (!sections || !sections.length) {
            var empty = document.createElement('div');
            markExt(empty);
            empty.className = 'dtu-lbd-empty';
            empty.textContent = 'No content folders found.';
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
                meta.setAttribute('data-section-meta', section.key);
                meta.textContent = lessonsSectionMetaText(section, sizeOu);
                txt.appendChild(meta);
            }

            row.appendChild(cb);
            row.appendChild(txt);
            frag.appendChild(row);
        });
        list.appendChild(frag);

        updateLessonsBulkRunButton(rootEl);
        if (showTopicCounts) fillLessonsBulkVideoSizes(rootEl, sections, sizeOu);
    }

    // "12 topic pages, 3 videos, 410 MB": the video part appears once its sizes are read.
    function lessonsSectionMetaText(section, ou) {
        var count = Number(section && section.unitCount || 0);
        if (!isFinite(count) || count < 0) count = 0;
        var text = String(count) + ' topic page' + (count === 1 ? '' : 's');
        var videos = _lessonsBulkVideo.describe(_lessonsVideoSummaries.get(ou + '|' + section.key));
        return videos ? text + ', ' + videos : text;
    }

    // The topics a section downloads, from the course TOC: its topic URLs, and every topic below
    // its unit URLs.
    function lessonsSectionTopicItems(section, index) {
        var items = [];
        var seen = new Set();
        function add(topicId, entry) {
            if (!entry || seen.has(topicId)) return;
            seen.add(topicId);
            items.push({ topicId: topicId, entry: entry });
        }
        (Array.isArray(section.unitUrls) ? section.unitUrls : []).forEach(function (u) {
            var topic = parseLessonsTopicIds(u);
            if (topic) { add(topic.topicId, index.get(topic.topicId)); return; }
            var unit = parseLessonsUnitIds(u);
            if (!unit) return;
            index.forEach(function (entry, topicId) {
                if (entry.modules && entry.modules.indexOf(String(unit.unitId)) >= 0) add(topicId, entry);
            });
        });
        return items;
    }

    // Reads video sizes for the sections once the panel is open (one request per video, cached).
    async function fillLessonsBulkVideoSizes(rootEl, sections, ou) {
        if (!ou || _lessonsBulkUiState.videoSizesBusy || !rootEl.classList.contains('dtu-open')) return;
        var todo = (sections || []).filter(function (s) { return !_lessonsVideoSummaries.has(ou + '|' + s.key); });
        if (!todo.length) return;
        _lessonsBulkUiState.videoSizesBusy = true;
        try {
            var index = await loadLessonsTocIndex(ou);
            if (!index) return;
            for (var i = 0; i < todo.length; i++) {
                var section = todo[i];
                _lessonsVideoSummaries.set(ou + '|' + section.key, await _lessonsBulkVideo.summarize(ou, lessonsSectionTopicItems(section, index)));
                rootEl.querySelectorAll('[data-section-meta]').forEach(function (el) {
                    if (el.getAttribute('data-section-meta') === section.key) el.textContent = lessonsSectionMetaText(section, ou);
                });
            }
        } catch (eVid) {
            logLessonsBulkDebug('video_sizes_failed', { error: String(eVid && eVid.message || eVid) });
        } finally {
            _lessonsBulkUiState.videoSizesBusy = false;
        }
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
            docUrl: getDocHref(scopeDoc),
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
                setLessonsBulkStatus(rootEl, 'Tick course activity, then click "Download selected".', '');
            }
        } else if (!_lessonsBulkUiState.selectedKeys.size) {
            setLessonsBulkStatus(rootEl, 'Select folders and click "Download selected".', '');
        }

        // Topic-count prefetch is intentionally disabled for legacy fallback paths.
    }

    function getLessonsBulkStateRefs() {
        return { uiState: _lessonsBulkUiState };
    }

    function resetLessonsBulkState() {
        cancelLessonsBulkRun();
        _lessonsBulkUiState.sections = [];
        _lessonsBulkUiState.selectedKeys = new Set();
        _lessonsBulkUiState.sig = '';
        _lessonsBulkUiState.running = false;
        _lessonsBulkUiState.lastRefreshAt = 0;
        _lessonsBulkUiState.activeDoc = null;
        _lessonsBulkUrlNameHints.clear();
        _lessonsLegacyApiSectionsCache.orgUnitId = '';
        _lessonsLegacyApiSectionsCache.sections = [];
        _lessonsLegacyApiSectionsCache.loading = false;
        _lessonsLegacyApiSectionsCache.promise = null;
        _lessonsLegacyApiSectionsCache.ts = 0;
        _lessonsLegacyApiSectionsCache.lastAttemptTs = 0;
        _lessonsLegacyApiSectionsCache.source = '';
        _lessonsLegacyModuleStructureCache.clear();
    }

    function removeLessonsBulkElements(doc) {
        if (!doc) return;
        var roots = [];
        try { roots = deepQueryAll('#' + LESSONS_BULK_ROOT_ID, doc); } catch (e0) { roots = []; }
        roots.forEach(function (root) {
            try { if (root && root.remove) root.remove(); } catch (e1) { }
        });
        var styles = [];
        try { styles = deepQueryAll('#' + LESSONS_BULK_STYLE_ID, doc); } catch (e2) { styles = []; }
        styles.forEach(function (styleEl) {
            try { if (styleEl && styleEl.remove) styleEl.remove(); } catch (e3) { }
        });
    }

    function removeLessonsBulkDownloadControl() {
        if (!_lessonsBulkUiInserted) {
            resetLessonsBulkState();
            return;
        }
        getLessonsCandidateDocuments(document).forEach(removeLessonsBulkElements);
        _lessonsBulkUiInserted = false;
        resetLessonsBulkState();
    }

    function cleanupLessonsBulkOutsideScope(scopeDoc) {
        if (!_lessonsBulkUiInserted) return;
        var targetDoc = scopeDoc || getLessonsRuntimeDocument(document);
        var docs = getLessonsCandidateDocuments(targetDoc);
        docs.forEach(function (doc) {
            if (!doc || doc === targetDoc) return;
            removeLessonsBulkElements(doc);
        });
    }

    function makeLessonsBulkIcon(doc, className, pathData) {
        var ns = 'http://www.w3.org/2000/svg';
        var svg = doc.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 16 16');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('class', className);
        var path = doc.createElementNS(ns, 'path');
        path.setAttribute('d', pathData);
        svg.appendChild(path);
        return svg;
    }

    function setAllLessonsBulkSelected(root, checked) {
        var uiState = getLessonsBulkStateRefs().uiState;
        root.querySelectorAll('.dtu-lbd-list input[type="checkbox"][data-section-key]').forEach(function (cb) {
            cb.checked = checked;
            if (!uiState || !uiState.selectedKeys) return;
            var key = cb.getAttribute('data-section-key');
            if (checked) uiState.selectedKeys.add(key);
            else uiState.selectedKeys.delete(key);
        });
        if (!checked && uiState && uiState.selectedKeys) uiState.selectedKeys.clear();
        updateLessonsBulkRunButton(root);
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

        // A course with an empty content page still gets the panel, for its course activity.
        if (!hasModernLessonsTocStructure(scopeDoc) && !getLessonsTocHost(scopeDoc)) {
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
            _lessonsBulkUiInserted = true;
            root.className = 'dtu-lbd-root';

            var toggle = scopeDoc.createElement('button');
            markExt(toggle);
            toggle.type = 'button';
            toggle.className = 'dtu-lbd-toggle';
            toggle.setAttribute('aria-expanded', 'false');
            toggle.appendChild(makeLessonsBulkIcon(scopeDoc, 'dtu-lbd-icon', 'M8 2.5v7.5M4.75 6.75 8 10l3.25-3.25M3 13.5h10'));
            var toggleLabel = scopeDoc.createElement('span');
            toggleLabel.className = 'dtu-lbd-toggle-label';
            toggleLabel.textContent = 'Download course';
            toggle.appendChild(toggleLabel);
            toggle.appendChild(makeLessonsBulkIcon(scopeDoc, 'dtu-lbd-chevron', 'M4 6l4 4 4-4'));

            var panel = scopeDoc.createElement('div');
            markExt(panel);
            panel.className = 'dtu-lbd-panel';

            var hint = scopeDoc.createElement('div');
            markExt(hint);
            hint.className = 'dtu-lbd-hint';
            hint.textContent = 'Pick content sections and course activity to save in one ZIP.';

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
                setAllLessonsBulkSelected(root, true);
            });

            var noneBtn = scopeDoc.createElement('button');
            markExt(noneBtn);
            noneBtn.type = 'button';
            noneBtn.className = 'dtu-lbd-mini';
            noneBtn.textContent = 'None';
            noneBtn.addEventListener('click', function () {
                setAllLessonsBulkSelected(root, false);
            });

            var runBtn = scopeDoc.createElement('button');
            markExt(runBtn);
            runBtn.type = 'button';
            runBtn.className = 'dtu-lbd-run';
            runBtn.textContent = 'Download selected';
            runBtn.addEventListener('click', function () {
                runLessonsBulkDownload(root);
            });

            var cancelBtn = scopeDoc.createElement('button');
            markExt(cancelBtn);
            cancelBtn.type = 'button';
            cancelBtn.className = 'dtu-lbd-mini dtu-lbd-cancel';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', function () {
                cancelLessonsBulkRun();
                setLessonsBulkStatus(root, 'Cancelling...', 'work');
            });

            var status = scopeDoc.createElement('div');
            markExt(status);
            status.className = 'dtu-lbd-status';

            actions.appendChild(allBtn);
            actions.appendChild(noneBtn);
            actions.appendChild(runBtn);
            actions.appendChild(cancelBtn);
            var activityBox = scopeDoc.createElement('div');
            markExt(activityBox);
            activityBox.className = 'dtu-lbd-activity';
            var activityHead = scopeDoc.createElement('div');
            markExt(activityHead);
            activityHead.className = 'dtu-lbd-hint dtu-lbd-activity-head';
            activityHead.textContent = 'Also save';
            activityBox.appendChild(activityHead);
            _lessonsBulkActivity.KINDS.forEach(function (kind) {
                var row = scopeDoc.createElement('label');
                markExt(row);
                row.className = 'dtu-lbd-row';
                var cb = scopeDoc.createElement('input');
                markExt(cb);
                cb.type = 'checkbox';
                cb.checked = false;
                cb.setAttribute('data-activity-key', kind.key);
                cb.addEventListener('change', function () { updateLessonsBulkRunButton(root); });
                var txt = scopeDoc.createElement('span');
                markExt(txt);
                txt.className = 'dtu-lbd-label';
                var name = scopeDoc.createElement('span');
                markExt(name);
                name.className = 'dtu-lbd-name';
                name.textContent = kind.label;
                txt.appendChild(name);
                var summary = scopeDoc.createElement('span');
                markExt(summary);
                summary.className = 'dtu-lbd-meta';
                summary.textContent = kind.summary;
                txt.appendChild(summary);
                row.appendChild(cb);
                row.appendChild(txt);
                activityBox.appendChild(row);
            });

            panel.appendChild(hint);
            panel.appendChild(list);
            panel.appendChild(activityBox);
            panel.appendChild(actions);
            panel.appendChild(status);

            toggle.addEventListener('click', function () {
                var isOpen = root.classList.contains('dtu-open');
                if (isOpen) root.classList.remove('dtu-open');
                else root.classList.add('dtu-open');
                toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
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

    function scheduleLessonsBulkBootstrap() {
        if (_lessonsBulkUiInserted) return;
        if (_lessonsBulkBootstrapWatch && _lessonsBulkBootstrapWatch.active()) {
            _lessonsBulkBootstrapWatch.trigger();
            return;
        }
        _lessonsBulkBootstrapWatch = schedulePlacement({
            capMs: 30000,
            run: function () {
                if (!isLessonsBulkDownloadEnabled() || !isDTULearnLessonsPage()) return true;
                insertLessonsBulkDownloadControl();
                return _lessonsBulkUiInserted;
            }
        });
    }

    function runLessonsBulkDownloadChecks() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!isLessonsBulkDownloadEnabled()) {
            removeLessonsBulkDownloadControl();
            return;
        }
        if (isDTULearnLessonsPage()) {
            insertLessonsBulkDownloadControl();
            scheduleLessonsBulkBootstrap();
        } else removeLessonsBulkDownloadControl();
    }

    try {
        globalThis.DTUAfterDarkLessonsBulkZipDeps = {
            isStrictFileDownloadUrl: isStrictFileDownloadUrl,
            lessonsBulkFetch: lessonsBulkFetch,
            setLessonsBulkStatus: setLessonsBulkStatus,
            isLessonsBulkRunAborted: isLessonsBulkRunAborted,
            throwIfLessonsBulkAborted: throwIfLessonsBulkAborted
        };
        globalThis.DTUAfterDarkLessonsBulkTreeDeps = {
            toAbsoluteSamePageUrl: toAbsoluteSamePageUrl,
            lessonsBulkDelay: lessonsBulkDelay,
            fetchLegacyModuleStructureApi: fetchLegacyModuleStructureApi,
            getApiObjectTitle: getApiObjectTitle,
            getDirectTopicIdsFromStructure: getDirectTopicIdsFromStructure,
            getDirectModuleChildrenFromStructure: getDirectModuleChildrenFromStructure,
            collectTopicIdsFromJsonValue: collectTopicIdsFromJsonValue,
            collectModuleIdsFromJsonValue: collectModuleIdsFromJsonValue,
            refreshLessonsBulkDownloadUi: refreshLessonsBulkDownloadUi
        };
        globalThis.DTUAfterDarkLessonsBulkFetchDeps = {
            isLessonsBulkRunAborted: isLessonsBulkRunAborted,
            throwIfLessonsBulkAborted: throwIfLessonsBulkAborted
        };
    } catch (eDeps) { }

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
