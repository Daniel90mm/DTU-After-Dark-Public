// Dark mode script to inject styles into Shadow DOM elements
(function () {
    'use strict';
    var markExt = globalThis.DTUAfterDarkDom.markExt;
    var normalizeWhitespace = globalThis.DTUAfterDarkDom.normalizeWhitespace;

    const __urlPause = globalThis.DTUAfterDarkUrlPause;
    if (!__urlPause) throw new Error('darkmode.js loaded before darkmode.url-pause.js');
    const __featureFlags = globalThis.DTUAfterDarkFeatureFlags;
    if (!__featureFlags) throw new Error('darkmode.js loaded before darkmode.feature-flags.js');
    const __accentTheme = globalThis.DTUAfterDarkAccentTheme;
    if (!__accentTheme) throw new Error('darkmode.js loaded before darkmode.accent-theme.js');
    const __participantIntelBridge = globalThis.DTUAfterDarkParticipantIntelBridge;
    if (!__participantIntelBridge) throw new Error('darkmode.js loaded before darkmode.participant-intel-bridge.js');

    // ===== DARK MODE TOGGLE =====
    const DARK_MODE_KEY = 'dtuDarkModeEnabled';
    const DARK_MODE_FOLLOW_KEY = 'dtuDarkModeFollowDevice';
    const IS_TOP_WINDOW = __urlPause.isTopWindow;
    const getCurrentUrlWithoutHash = __urlPause.getCurrentUrlWithoutHash;
    const normalizeUrlPausePattern = __urlPause.normalizeUrlPausePattern;
    const isPauseProtectedPattern = __urlPause.isPauseProtectedPattern;
    const getUrlPausePatterns = __urlPause.getUrlPausePatterns;
    const saveUrlPausePatterns = __urlPause.saveUrlPausePatterns;
    const getMatchingUrlPausePatterns = __urlPause.getMatchingUrlPausePatterns;
    const buildSuggestedPausePatternsForCurrentUrl = __urlPause.buildSuggestedPausePatternsForCurrentUrl;
    const FEATURE_KURSER_GRADE_STATS_KEY = __featureFlags.FEATURE_KURSER_GRADE_STATS_KEY;
    const FEATURE_TEXTBOOK_LINKS_KEY = __featureFlags.FEATURE_TEXTBOOK_LINKS_KEY;
    const FEATURE_CONTENT_SHORTCUT_KEY = __featureFlags.FEATURE_CONTENT_SHORTCUT_KEY;
    const FEATURE_CAMPUSNET_GPA_TOOLS_KEY = __featureFlags.FEATURE_CAMPUSNET_GPA_TOOLS_KEY;
    const FEATURE_KURSER_COURSE_EVAL_KEY = __featureFlags.FEATURE_KURSER_COURSE_EVAL_KEY;
    const FEATURE_KURSER_COURSE_MAP_KEY = __featureFlags.FEATURE_KURSER_COURSE_MAP_KEY;
    const FEATURE_STUDYPLAN_EXAM_SCHEDULE_KEY = __featureFlags.FEATURE_STUDYPLAN_EXAM_SCHEDULE_KEY;
    const FEATURE_SMART_ROOM_LINKER_KEY = __featureFlags.FEATURE_SMART_ROOM_LINKER_KEY;
    const FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY = __featureFlags.FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY;
    const FEATURE_PARTICIPANT_INTEL_KEY = __featureFlags.FEATURE_PARTICIPANT_INTEL_KEY;
    const FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY = __featureFlags.FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY;
    const FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY = __featureFlags.FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY;
    const FEATURE_PARTICIPANT_INTEL_RETENTION_KEY = __featureFlags.FEATURE_PARTICIPANT_INTEL_RETENTION_KEY;
    const FEATURE_LIBRARY_DROPDOWN_KEY = __featureFlags.FEATURE_LIBRARY_DROPDOWN_KEY;
    const FEATURE_LEARN_LESSONS_BULK_DOWNLOAD_KEY = __featureFlags.FEATURE_LEARN_LESSONS_BULK_DOWNLOAD_KEY;
    const loadFeatureFlags = __featureFlags.loadFeatureFlags;
    const isFeatureFlagEnabled = __featureFlags.isFeatureFlagEnabled;
    const setFeatureFlagEnabled = __featureFlags.setFeatureFlagEnabled;
    const subscribeFeatureFlagStorageChanges = __featureFlags.subscribeFeatureFlagStorageChanges;
    const ACCENT_THEMES = __accentTheme.ACCENT_THEMES;
    const ACCENT_THEME_ORDER = __accentTheme.ACCENT_THEME_ORDER;
    const ACCENT_CUSTOM_DEFAULT = __accentTheme.ACCENT_CUSTOM_DEFAULT;
    const getContrastTextForHex = __accentTheme.getContrastTextForHex;
    const rgbaFromHex = __accentTheme.rgbaFromHex;
    const getResolvedAccent = __accentTheme.getResolvedAccent;
    const getResolvedAccentDeep = __accentTheme.getResolvedAccentDeep;
    const getAccentThemeById = __accentTheme.getAccentThemeById;
    const getAccentThemeId = __accentTheme.getAccentThemeId;
    const getAccentCustomHex = __accentTheme.getAccentCustomHex;
    const applyAfterDarkAdminMenuThemeVars = __accentTheme.applyAfterDarkAdminMenuThemeVars;
    const setAccentCustomHex = __accentTheme.setAccentCustomHex;
    const setAccentThemeId = __accentTheme.setAccentThemeId;
    const replaceLogoImage = __accentTheme.replaceLogoImage;
    const insertParticipantIntelligence = __participantIntelBridge.insertParticipantIntelligence;
    // Dev-only feature: hard-disabled in repository/release code.
    // Keep false unless explicitly enabling in a private local dev build.
    const ENABLE_CONTEXT_CAPTURE_DEV_TOOL = false;

    function clearLegacyDarkModeCookie() {
        try {
            if (!IS_TOP_WINDOW || !location.hostname.endsWith('.dtu.dk')) return;
            var expiry = 'dtuDarkMode=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure';
            document.cookie = expiry;
            document.cookie = expiry + '; domain=.dtu.dk';
        } catch (e) { /* cookie access blocked */ }
    }

    clearLegacyDarkModeCookie();

    // Check dark mode preference: localStorage -> default true
    function deviceThemeQuery() {
        try { return window.matchMedia('(prefers-color-scheme: dark)'); } catch (e) { return null; }
    }

    function isFollowingDeviceTheme() {
        return localStorage.getItem(DARK_MODE_FOLLOW_KEY) === 'true';
    }

    // Effective theme: the device's setting while Auto is on, otherwise the manual choice.
    function isDarkModeEnabled() {
        if (isFollowingDeviceTheme()) {
            var query = deviceThemeQuery();
            if (query) return query.matches;
        }
        const stored = localStorage.getItem(DARK_MODE_KEY);
        if (stored !== null) return stored === 'true';
        return true;
    }

    function getExtensionStorageArea() {
        try {
            if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
                return { api: 'browser', area: browser.storage.local };
            }
        } catch (e) { }
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                return { api: 'chrome', area: chrome.storage.local };
            }
        } catch (e) { }
        return null;
    }

    // Save preference to all available stores (localStorage + extension storage).
    // Resolves once extension storage has the value, so callers can reload without
    // losing the write (a lost write makes the next load flip the toggle back).
    // A manual choice ends Auto (device theme).
    function saveDarkModePreference(enabled) {
        localStorage.setItem(DARK_MODE_KEY, String(enabled));
        localStorage.removeItem(DARK_MODE_FOLLOW_KEY);
        var storage = getExtensionStorageArea();
        if (!storage) return Promise.resolve();
        var values = { [DARK_MODE_KEY]: enabled, [DARK_MODE_FOLLOW_KEY]: false };
        return new Promise(function (resolve) {
            try {
                if (storage.api === 'browser') {
                    storage.area.set(values).then(resolve, resolve);
                } else {
                    storage.area.set(values, function () { resolve(); });
                }
            } catch (e) {
                resolve();
            }
        });
    }

    // "Match device theme": while on, the device's light/dark setting decides, not the manual toggle.
    function saveDarkModeFollowDevice(enabled) {
        localStorage.setItem(DARK_MODE_FOLLOW_KEY, String(enabled));
        var storage = getExtensionStorageArea();
        if (!storage) return Promise.resolve();
        return new Promise(function (resolve) {
            try {
                if (storage.api === 'browser') {
                    storage.area.set({ [DARK_MODE_FOLLOW_KEY]: enabled }).then(resolve, resolve);
                } else {
                    storage.area.set({ [DARK_MODE_FOLLOW_KEY]: enabled }, function () { resolve(); });
                }
            } catch (e) {
                resolve();
            }
        });
    }

    function getExtensionUrl(path) {
        try {
            if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) {
                return browser.runtime.getURL(path);
            }
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                return chrome.runtime.getURL(path);
            }
        } catch (e) {
            // Fall back to raw path below.
        }
        return path;
    }


    // Inject the dark mode CSS stylesheet via <link> element
    function injectDarkCSS() {
        var mount = document.head || document.documentElement;
        if (!mount) return;
        var link = document.getElementById('dtu-dark-mode-css');
        if (link && link.isConnected) {
            if (link.parentNode !== mount && document.head) {
                document.head.appendChild(link);
            }
            return;
        }
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = getExtensionUrl('darkmode.css');
        link.id = 'dtu-dark-mode-css';
        mount.appendChild(link);
    }

    // Inject accent overrides for specific UI elements regardless of dark mode state
    function injectAccentOverrides() {
        if (document.getElementById('dtu-accent-overrides-css')) return;
        const style = document.createElement('style');
        style.id = 'dtu-accent-overrides-css';
        style.textContent = `
            /* Structural accent overrides for CampusNet/DTU sites (Light & Dark modes) */
            .boxHeader,
            .box.mainContentPageTemplate .boxHeader,
            .box.widget .boxHeader,
            #afrapporteringWidget .boxHeader {
                background-color: var(--dtu-ad-accent-deep) !important;
                background: var(--dtu-ad-accent-deep) !important;
                border-bottom-color: var(--dtu-ad-accent-deep-hover) !important;
                color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
            }

            .boxHeader h2,
            .box.mainContentPageTemplate .boxHeader h2,
            .box.widget .boxHeader h2,
            #afrapporteringWidget .boxHeader h2 {
                color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
                background-color: transparent !important;
            }

            /* Category titles in sidebar */
            h4.category__title,
            h4.category__title a {
                background-color: var(--dtu-ad-accent-deep) !important;
                background: var(--dtu-ad-accent-deep) !important;
                color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
            }

            h4.category__title:hover,
            h4.category__title:focus-within {
                background-color: var(--dtu-ad-accent-deep-hover) !important;
                background: var(--dtu-ad-accent-deep-hover) !important;
            }

            h4.category__title i,
            h4.category__title .toggle-category,
            h4.category__title .arc-menu-burger-expander {
                color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
            }

            /* Icon base (circle background) */
            .item__icon .icon__base,
            .service-icon .icon__base {
                color: var(--dtu-ad-accent) !important;
            }

            /* Group menu items (Courses, Groups, etc.) */
            .group-menu__item,
            .group-menu__item-burger {
                border-color: var(--dtu-ad-accent-deep) !important;
                background-color: var(--dtu-ad-campusnet-menu-body, var(--dtu-ad-accent-deep)) !important;
            }

            .group-menu__item header,
            .group-menu__item-burger header {
                background-color: var(--dtu-ad-accent-deep) !important;
                background: var(--dtu-ad-accent-deep) !important;
            }

            .group-menu__item .item__title,
            .group-menu__item-burger .item__title,
            .group-menu__item header h2,
            .group-menu__item-burger header h2 {
                color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
            }

            .group-menu__item-burger-expander {
                color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
            }

            /* Links (Generic content links) */
            a:not(.d2l-navigation-s-link),
            .groupLinksTable a:not(.arc-button) {
                color: var(--dtu-ad-accent-text, var(--dtu-ad-accent)) !important;
                text-decoration: none;
            }

            a:hover {
                color: var(--dtu-ad-accent-text-hover, var(--dtu-ad-accent-hover)) !important;
            }

            /* Exclude top navigation and header links (keep them white) */
            .nav__item a,
            .header__top a,
            .top-menu a,
            .header__logo-area a,
            section.header a {
                color: #ffffff !important;
            }

            /* Keep black-bar top menu ("DTU INSIDE") white */
            .top-menu a,
            .top-menu a * {
                color: #ffffff !important;
            }

            /* Prevent red background on hover for menu items (Light mode fix) */
            .menu__item:hover {
                background-color: white !important;
                transition: none !important;
            }
            /* Focus rings the host page and our reset styles removed (both modes). */
            table.gradesList a:focus-visible,
            .gpa-sim-add-btn:focus-visible,
            .gpa-actual-toggle-btn:focus-visible {
                outline: 2px solid currentColor !important;
                outline-offset: 2px !important;
            }
            /* Reduce motion (OS setting): our own fades, slides and pulses finish at once. */
            @media (prefers-reduced-motion: reduce) {
                [data-dtu-ext], [data-dtu-ext] *, [data-dtu-ext]::before, [data-dtu-ext]::after,
                [class^="dtu-"], [class*=" dtu-"] {
                    transition-duration: 0.01ms !important;
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    scroll-behavior: auto !important;
                }
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    // Always inject accent overrides (even in light mode)
    var _matchingUrlPausePatterns = __urlPause.init();
    if (_matchingUrlPausePatterns.length) {
        return;
    }

    injectAccentOverrides();

    // Synchronous check â€” inject CSS immediately if enabled (runs at document_start)
    const darkModeEnabled = isDarkModeEnabled();
    if (darkModeEnabled) {
        injectDarkCSS();
        document.addEventListener('DOMContentLoaded', injectDarkCSS, { once: true });
    }

    function applyStoredDarkModeValue(storedEnabled, storedFollow) {
        // Unset follow means off. Cache it before the effective value is recomputed.
        if (typeof storedFollow === 'boolean') localStorage.setItem(DARK_MODE_FOLLOW_KEY, String(storedFollow));
        else if (storedFollow === undefined) localStorage.removeItem(DARK_MODE_FOLLOW_KEY);
        // Extension storage is the one copy every DTU site shares; each site's localStorage
        // is only a fast-start cache of it. Unset there means the default (on): a site that
        // cached "false" long ago (localStorage outlives an extension reinstall) otherwise
        // stayed light while the Learn toggle showed on.
        if (storedEnabled === undefined) storedEnabled = true;
        // Only booleans are ever written; anything else would reload on every load.
        if (typeof storedEnabled !== 'boolean') return;
        localStorage.setItem(DARK_MODE_KEY, String(storedEnabled));
        if (isDarkModeEnabled() !== darkModeEnabled && window === window.top) {
            location.reload();
        }
    }

    // Async cross-origin check via extension storage (covers s.brightspace.com etc.)
    var extensionStorage = getExtensionStorageArea();
    if (extensionStorage) {
        if (extensionStorage.api === 'browser') {
            extensionStorage.area.get([DARK_MODE_KEY, DARK_MODE_FOLLOW_KEY]).then(function (result) {
                applyStoredDarkModeValue(result[DARK_MODE_KEY], result[DARK_MODE_FOLLOW_KEY]);
            }).catch(function () { });
        } else {
            extensionStorage.area.get([DARK_MODE_KEY, DARK_MODE_FOLLOW_KEY], function (result) {
                if (chrome && chrome.runtime && chrome.runtime.lastError) return;
                applyStoredDarkModeValue(result ? result[DARK_MODE_KEY] : undefined, result ? result[DARK_MODE_FOLLOW_KEY] : undefined);
            });
        }
    }

    function subscribeDarkModeStorageChanges() {
        var onChanged = function (changes, areaName) {
            if (!IS_TOP_WINDOW) return;
            if (areaName && areaName !== 'local') return;
            if (!changes || (!changes[DARK_MODE_KEY] && !changes[DARK_MODE_FOLLOW_KEY])) return;
            if (changes[DARK_MODE_FOLLOW_KEY]) {
                var follow = changes[DARK_MODE_FOLLOW_KEY].newValue;
                if (follow === true) localStorage.setItem(DARK_MODE_FOLLOW_KEY, 'true');
                else localStorage.removeItem(DARK_MODE_FOLLOW_KEY);
            }
            if (changes[DARK_MODE_KEY]) {
                var next = changes[DARK_MODE_KEY].newValue;
                if (typeof next !== 'boolean') return;
                localStorage.setItem(DARK_MODE_KEY, String(next));
            }
            if (isDarkModeEnabled() !== darkModeEnabled) {
                location.reload();
            }
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
        } catch (e) { }
    }
    subscribeDarkModeStorageChanges();

    // Device switched light/dark while following it: reload into the new theme.
    (function followDeviceThemeChanges() {
        var query = deviceThemeQuery();
        if (!query || !IS_TOP_WINDOW) return;
        var onDeviceThemeChange = function () {
            if (isFollowingDeviceTheme() && isDarkModeEnabled() !== darkModeEnabled) location.reload();
        };
        if (query.addEventListener) query.addEventListener('change', onDeviceThemeChange);
        else if (query.addListener) query.addListener(onDeviceThemeChange);
    })();

    // Dark mode toggle for light mode (re-enable): inserted via runFeatureChecks below

    // ===== FEATURE FLAGS (extension-wide) =====
    // These toggles live in extension storage so they apply across all DTU domains.

    function storageLocalGet(defaults, cb) {
        var storage = getExtensionStorageArea();
        if (!storage) {
            if (cb) cb(Object.assign({}, defaults));
            return;
        }
        try {
            if (storage.api === 'browser') {
                storage.area.get(defaults).then(function (result) {
                    cb(result || Object.assign({}, defaults));
                }).catch(function () {
                    cb(Object.assign({}, defaults));
                });
            } else {
                storage.area.get(defaults, function (result) {
                    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
                        cb(Object.assign({}, defaults));
                        return;
                    }
                    cb(result || Object.assign({}, defaults));
                });
            }
        } catch (e) {
            cb(Object.assign({}, defaults));
        }
    }

    function storageLocalSet(items) {
        var storage = getExtensionStorageArea();
        if (!storage) return;
        try {
            if (storage.api === 'browser') {
                storage.area.set(items).catch(function () { });
            } else {
                storage.area.set(items, function () { });
            }
        } catch (e) {
            // ignore
        }
    }

    // A feature whose DTU page element is gone (DTU changed the page) says so once in the
    // console instead of vanishing without a trace. DTU pages draw parts after load, so
    // it checks again 5 s later and warns only if stillMissing() is still true.
    var _warnedMissingAnchors = {};
    globalThis.DTUAfterDarkWarnMissingAnchor = function (feature, selector, stillMissing) {
        var key = feature + '|' + selector;
        if (_warnedMissingAnchors[key]) return;
        _warnedMissingAnchors[key] = true;
        setTimeout(function () {
            try { if (!stillMissing()) return; } catch (e) { }
            console.warn('[DTU After Dark] ' + feature + ': page element not found (' + selector + '); DTU may have changed the page.');
        }, 5000);
    };

    globalThis.DTUAfterDarkAccentThemeRuntime = {
        isDarkModeEnabled: function () { return !!darkModeEnabled; },
        storageLocalGet: storageLocalGet,
        storageLocalSet: storageLocalSet,
        getExtensionUrl: getExtensionUrl
    };
    __accentTheme.init();

    globalThis.DTUAfterDarkFeatureFlagsRuntime = {
        getExtensionStorageArea: getExtensionStorageArea,
        storageLocalGet: storageLocalGet,
        storageLocalSet: storageLocalSet,
        isTopWindow: IS_TOP_WINDOW,
        runTopWindowFeatureChecks: runTopWindowFeatureChecks,
        runFrameFeatureChecks: runFrameFeatureChecks
    };

    // Load feature flags early so cross-domain toggles work without a full refresh cycle.
    // Note: some pages (Brightspace Content) render inside same-origin iframes; we still
    // want lightweight features (e.g. Smart Room Links) there.
    loadFeatureFlags(function () {
        if (IS_TOP_WINDOW) {
            try { syncAfterDarkFeatureToggleStates(); } catch (e1) { }
            try { runTopWindowFeatureChecks(null, false); } catch (e2) { }
        } else {
            try { runFrameFeatureChecks(null); } catch (e3) { }
        }
    });
    subscribeFeatureFlagStorageChanges();

    // Light-mode accent top-nav badge styles.
    const lightAccentBadgeStyles = `
        .d2l-w2d-count,
        .d2l-w2d-heading-3-count {
            background-color: var(--dtu-ad-accent) !important;
            background: var(--dtu-ad-accent) !important;
            color: var(--dtu-ad-accent-on) !important;
            border-color: var(--dtu-ad-accent) !important;
        }
        .d2l-count-badge-number {
            background-color: var(--dtu-ad-accent-deep) !important;
            background: var(--dtu-ad-accent-deep) !important;
            color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
        }
        .d2l-count-badge-number > div {
            background: transparent !important;
            background-color: transparent !important;
            color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
        }
    `;


    function forceDtuRedBackgroundDark2(el) {
        if (!el || !el.style) return;
        var color = 'var(--dtu-ad-accent-deep, ' + getResolvedAccentDeep() + ')';
        var styleAttr = (el.getAttribute && el.getAttribute('style')) || '';
        var currentBg = (styleAttr.match(/background-color\s*:\s*([^;!]+)/i) || [])[1];
        if (currentBg && currentBg.trim() === color) return;

        el.style.setProperty('background', color, 'important');
        el.style.setProperty('background-color', color, 'important');
        el.style.setProperty('background-image', 'none', 'important');
        el.style.setProperty('border-color', color, 'important');
        if (el.tagName === 'A') {
            el.style.setProperty('color', 'var(--dtu-ad-accent-deep-on, #ffffff)', 'important');
        }
    }

    function enforceDtuRedBackgroundZoneDark2() {
        var targets = document.querySelectorAll(
            '.dturedbackground, '
            + '.dturedbackground .container, '
            + '.dturedbackground .row, '
            + '.dturedbackground [class*="col-"], '
            + '.dturedbackground .pull-right, '
            + '.dturedbackground .pull-right span, '
            + '.dturedbackground .pull-right span a, '
            + '.dturedbackground .dropdown, '
            + '.dturedbackground .dropdown-toggle.red, '
            + '.dturedbackground .dropdown-menu.red, '
            + '.dturedbackground .dropdown-menu.red li, '
            + '.dturedbackground .dropdown-menu.red li a'
        );
        targets.forEach(forceDtuRedBackgroundDark2);
    }

    function getDarkEngineApi() {
        try { return globalThis.DTUAfterDarkDarkEngine || null; } catch (e0) { return null; }
    }

    function getDarkText() {
        var api = getDarkEngineApi();
        if (!api || typeof api.getDarkText !== 'function') return '#e0e0e0';
        return api.getDarkText();
    }

    function getDarkBorder() {
        var api = getDarkEngineApi();
        if (!api || typeof api.getDarkBorder !== 'function') return '#404040';
        return api.getDarkBorder();
    }

    function getDarkSelectors() {
        var api = getDarkEngineApi();
        if (!api || typeof api.getDarkSelectors !== 'function') return '';
        return api.getDarkSelectors();
    }

    function getLighterDarkSelectors() {
        var api = getDarkEngineApi();
        if (!api || typeof api.getLighterDarkSelectors !== 'function') return '';
        return api.getLighterDarkSelectors();
    }

    function seedSmartRoomLinkerShadowRoot(shadowRoot) {
        var api = getSmartRoomLinkerApi();
        if (api && typeof api.seedSmartRoomLinkerShadowRoot === 'function') {
            api.seedSmartRoomLinkerShadowRoot(shadowRoot);
        }
    }

    function isDTULearnQuizSubmissionsPage() {
        return window.location.hostname === 'learn.inside.dtu.dk'
            && /\/d2l\/lms\/quizzing\/user\/quiz_submissions\.d2l$/i.test(window.location.pathname || '');
    }

    function styleQuizSubmissionHistogram(rootNode) {
        var api = getBusApi();
        if (api && typeof api.styleQuizSubmissionHistogram === 'function') {
            return api.styleQuizSubmissionHistogram(rootNode);
        }
    }

    globalThis.DTUAfterDarkDarkEngineDeps = {
        // Bumped whenever a mutation flush begins, so per-element caches in the
        // dark engine can be dropped wholesale when the DOM has moved on.
        domGeneration: function () { return _deepRootsGeneration; },
        isDarkModeEnabled: function () { return !!darkModeEnabled; },
        isLegacyHeavyPage: isDTULearnLegacyHeavyCourseToolPage,
        forceDTULearnAccentInRoot: forceDTULearnAccentInRoot,
        seedSmartRoomLinkerShadowRoot: seedSmartRoomLinkerShadowRoot,
        scheduleSmartRoomLinkerScan: scheduleSmartRoomLinkerScan,
        insertContentButtons: insertContentButtons,
        isDTULearnQuizSubmissionsPage: isDTULearnQuizSubmissionsPage,
        getResolvedAccent: getResolvedAccent,
        getResolvedAccentDeep: getResolvedAccentDeep,
        getContrastTextForHex: getContrastTextForHex,
        preserveTypeboxColors: preserveTypeboxColors,
        replaceLogoImage: replaceLogoImage,
        styleQuizSubmissionHistogram: styleQuizSubmissionHistogram,
        forceDtuRedBackgroundDark2: forceDtuRedBackgroundDark2
    };

    function shouldUseBrightspaceShadowDomProcessing() {
        var api = getDarkEngineApi();
        if (!api || typeof api.shouldUseBrightspaceShadowDomProcessing !== 'function') return false;
        return api.shouldUseBrightspaceShadowDomProcessing();
    }

    function forceLessonsTocDark1(root) {
        var api = getDarkEngineApi();
        if (!api || typeof api.forceLessonsTocDark1 !== 'function') return;
        return api.forceLessonsTocDark1(root);
    }

    function forceD2LActionButtonsDark1(root) {
        var api = getDarkEngineApi();
        if (!api || typeof api.forceD2LActionButtonsDark1 !== 'function') return;
        return api.forceD2LActionButtonsDark1(root);
    }

    function applyDarkStyle(el) {
        var api = getDarkEngineApi();
        if (!api || typeof api.applyDarkStyle !== 'function') return;
        return api.applyDarkStyle(el);
    }

    function applyLighterDarkStyle(el) {
        var api = getDarkEngineApi();
        if (!api || typeof api.applyLighterDarkStyle !== 'function') return;
        return api.applyLighterDarkStyle(el);
    }

    function runDarkModeChecks(rootNode) {
        var api = getDarkEngineApi();
        if (!api || typeof api.runDarkModeChecks !== 'function') return;
        return api.runDarkModeChecks(rootNode);
    }

    function sweepForLateShadowRoots(root) {
        var api = getDarkEngineApi();
        if (!api || typeof api.sweepForLateShadowRoots !== 'function') return;
        return api.sweepForLateShadowRoots(root);
    }

    function waitForCustomElements() {
        var api = getDarkEngineApi();
        if (!api || typeof api.waitForCustomElements !== 'function') return Promise.resolve();
        return api.waitForCustomElements();
    }

    function clearStudyplanModalInlineDarkBackgrounds(rootNode) {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'studieplan.dtu.dk') return;
        var scope = (rootNode && rootNode.querySelectorAll) ? rootNode : document;
        var selectors = [
            '#searchCourseCatalogDialog',
            '#searchCourseCatalogDialog .modal-dialog',
            '#searchCourseCatalogDialog .modal-content',
            '#searchCourseCatalogDialog .modal-header',
            '#searchCourseCatalogDialog .modal-body',
            '#searchCourseCatalogDialog .modal-footer',
            '#createActivity',
            '#createActivity .modal-dialog',
            '#createActivity .modal-content',
            '#createActivity .modal-header',
            '#createActivity .modal-body',
            '#createActivity .modal-footer'
        ];

        selectors.forEach(function (selector) {
            var nodes = [];
            try { nodes = Array.from(scope.querySelectorAll(selector)); } catch (e1) { nodes = []; }
            nodes.forEach(function (el) {
                if (!el || !el.style) return;
                el.style.removeProperty('background');
                el.style.removeProperty('background-color');
                el.style.removeProperty('background-image');
            });
        });
    }

    function isMojanglesEnabled() {
        var stored = localStorage.getItem('mojanglesTextEnabled');
        return stored === null ? true : stored === 'true';
    }

    function getLearnNavUiApi() {
        try { return globalThis.DTUAfterDarkLearnNavUi || null; } catch (e0) { return null; }
    }

    try {
        globalThis.DTUAfterDarkLearnNavDeps = {
            isTopWindow: function () { return IS_TOP_WINDOW; },
            placeAfterDarkNavItemAt: placeAfterDarkNavItemAt,
            placeAfterDarkNavItemBefore: placeAfterDarkNavItemBefore,
            isFeatureFlagEnabled: isFeatureFlagEnabled,
            isDarkModeEnabled: function () { return !!darkModeEnabled; },
            normalizeWhitespace: normalizeWhitespace,
            deepQueryAll: deepQueryAll,
            markExt: markExt,
            saveDarkModePreference: saveDarkModePreference,
            isFollowingDeviceTheme: isFollowingDeviceTheme,
            saveDarkModeFollowDevice: saveDarkModeFollowDevice,
            showSettingsModal: showSettingsModal,
            hideSettingsModal: hideSettingsModal,
            isLibraryEnabled: function () { return isFeatureFlagEnabled(FEATURE_LIBRARY_DROPDOWN_KEY); },
            featureLearnNavResourceLinksKey: FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY
        };
    } catch (eLearnNavDeps) { }

    function insertDTULearnNavResourceLinks() {
        var api = getLearnNavUiApi();
        if (api && typeof api.insertDTULearnNavResourceLinks === 'function') api.insertDTULearnNavResourceLinks();
    }

    function removeDTULearnNavResourceLinks() {
        var api = getLearnNavUiApi();
        if (api && typeof api.removeDTULearnNavResourceLinks === 'function') api.removeDTULearnNavResourceLinks();
    }

    function removeDTULearnHelpDropdown() {
        var api = getLearnNavUiApi();
        if (api && typeof api.removeDTULearnHelpDropdown === 'function') api.removeDTULearnHelpDropdown();
    }

    function insertSettingsNavItem() {
        var api = getLearnNavUiApi();
        if (api && typeof api.insertSettingsNavItem === 'function') api.insertSettingsNavItem();
    }

    function getAfterDarkAdminToolsList() {
        return null;
    }

    function getDeadlinesUiApi() {
        try { return globalThis.DTUAfterDarkDeadlinesUi || null; } catch (e0) { return null; }
    }

    try {
        globalThis.DTUAfterDarkDeadlinesDeps = {
            isTopWindow: function () { return IS_TOP_WINDOW; },
            isDarkMode: function () { return !!darkModeEnabled; },
            isDeadlinesEnabled: isDeadlinesEnabled,
            isSearchWidgetEnabled: isSearchWidgetEnabled,
            isDTULearnHomepage: isDTULearnHomepage,
            deepQueryAll: deepQueryAll,
            markExt: markExt,
            normalizeWhitespace: normalizeWhitespace,
            sendRuntimeMessage: sendRuntimeMessage,
            getAdminToolsPlaceholder: getAdminToolsPlaceholder,
            getAfterDarkAdminToolsList: getAfterDarkAdminToolsList
        };
    } catch (eDeadlinesDeps) { }

    function insertDeadlinesHomepageWidget() {
        var api = getDeadlinesUiApi();
        if (api && typeof api.insertDeadlinesHomepageWidget === 'function') api.insertDeadlinesHomepageWidget();
    }

    function getLibraryUiApi() {
        try { return globalThis.DTUAfterDarkLibraryUi || null; } catch (e0) { return null; }
    }

    try {
        globalThis.DTUAfterDarkLibraryDeps = {
            isTopWindow: function () { return IS_TOP_WINDOW; },
            placeAfterDarkNavItemAt: placeAfterDarkNavItemAt,
            placeAfterDarkNavItemBefore: placeAfterDarkNavItemBefore,
            isLibraryEnabled: function () { return isFeatureFlagEnabled(FEATURE_LIBRARY_DROPDOWN_KEY); },
            isDTULearnHomepage: isDTULearnHomepage,
            deepQueryAll: deepQueryAll,
            ensureLibraryRuntimeStyles: (typeof ensureLibraryRuntimeStyles === 'function') ? ensureLibraryRuntimeStyles : null,
            requestLibraryEvents: (typeof requestLibraryEvents === 'function') ? requestLibraryEvents : null,
            requestLibraryNews: (typeof requestLibraryNews === 'function') ? requestLibraryNews : null,
            requestLibraryCrowding: (typeof requestLibraryCrowding === 'function') ? requestLibraryCrowding : null,
            createLibraryTrendSection: (typeof createLibraryTrendSection === 'function') ? createLibraryTrendSection : null,
            renderLibraryTrendSection: (typeof renderLibraryTrendSection === 'function') ? renderLibraryTrendSection : null,
            extractLibraryCurrentSnapshot: (typeof extractLibraryCurrentSnapshot === 'function') ? extractLibraryCurrentSnapshot : null,
            formatLibraryOccupancyCount: (typeof formatLibraryOccupancyCount === 'function') ? formatLibraryOccupancyCount : null,
            markExt: markExt,
            getLibraryUiState: function () {
                return {
                    eventsCache: (typeof _libraryEventsCache !== 'undefined') ? _libraryEventsCache : null,
                    newsCache: (typeof _libraryNewsCache !== 'undefined') ? _libraryNewsCache : null,
                    crowdingCache: (typeof _libraryCrowdingCache !== 'undefined') ? _libraryCrowdingCache : null,
                    escHandler: (typeof _libraryEscHandler !== 'undefined') ? _libraryEscHandler : null,
                    occupancyAutoTimer: (typeof _libraryOccupancyAutoTimer !== 'undefined') ? _libraryOccupancyAutoTimer : null
                };
            },
            setLibraryUiState: function (next) {
                if (!next || typeof next !== 'object') return;
                if (typeof _libraryEscHandler !== 'undefined' && Object.prototype.hasOwnProperty.call(next, 'escHandler')) _libraryEscHandler = next.escHandler || null;
                if (typeof _libraryOccupancyAutoTimer !== 'undefined' && Object.prototype.hasOwnProperty.call(next, 'occupancyAutoTimer')) _libraryOccupancyAutoTimer = next.occupancyAutoTimer || null;
            }
        };
    } catch (eLibDeps) { }

    function insertLibraryNavDropdown() {
        var learnNavApi = getLearnNavUiApi();
        if (learnNavApi && typeof learnNavApi.insertLibraryNavItem === 'function') {
            learnNavApi.insertLibraryNavItem();
        }
    }

    function removeLibraryNavDropdown() {
        try {
            deepQueryAll('.dtu-library-nav-item', document).forEach(function (item) {
                try { item.remove(); } catch (e0) { }
            });
        } catch (e1) { }
        var api = getLibraryUiApi();
        if (api && typeof api.removeLibraryNavDropdown === 'function') api.removeLibraryNavDropdown();
    }

    function getSettingsUiApi() {
        try { return globalThis.DTUAfterDarkSettingsUi || null; } catch (e0) { return null; }
    }

    try {
        globalThis.DTUAfterDarkSettingsDeps = {
            isTopWindow: function () { return IS_TOP_WINDOW; },
            isDarkModeEnabled: function () { return !!darkModeEnabled; },
            getCurrentUrlWithoutHash: getCurrentUrlWithoutHash,
            buildSuggestedPausePatternsForCurrentUrl: buildSuggestedPausePatternsForCurrentUrl,
            normalizeUrlPausePattern: normalizeUrlPausePattern,
            isPauseProtectedPattern: isPauseProtectedPattern,
            getUrlPausePatterns: getUrlPausePatterns,
            saveUrlPausePatterns: saveUrlPausePatterns,
            getMatchingUrlPausePatterns: getMatchingUrlPausePatterns,
            markExt: markExt,
            applyAfterDarkAdminMenuThemeVars: applyAfterDarkAdminMenuThemeVars,
            getFeatureKeys: function () {
                return {
                    campusnetGpaTools: FEATURE_CAMPUSNET_GPA_TOOLS_KEY,
                    kurserGradeStats: FEATURE_KURSER_GRADE_STATS_KEY,
                    textbookLinks: FEATURE_TEXTBOOK_LINKS_KEY,
                    kurserCourseEval: FEATURE_KURSER_COURSE_EVAL_KEY,
                    kurserCourseMap: FEATURE_KURSER_COURSE_MAP_KEY,
                    studyplanExamSchedule: FEATURE_STUDYPLAN_EXAM_SCHEDULE_KEY,
                    smartRoomLinker: FEATURE_SMART_ROOM_LINKER_KEY,
                    contentShortcut: FEATURE_CONTENT_SHORTCUT_KEY,
                    learnNavResourceLinks: FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY,
                    participantIntel: FEATURE_PARTICIPANT_INTEL_KEY,
                    libraryDropdown: FEATURE_LIBRARY_DROPDOWN_KEY,
                    learnLessonsBulkDownload: FEATURE_LEARN_LESSONS_BULK_DOWNLOAD_KEY,
                    participantIntelDemographics: FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY,
                    participantIntelSharedHistory: FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY,
                    participantIntelRetention: FEATURE_PARTICIPANT_INTEL_RETENTION_KEY
                };
            },
            getSettingKeys: function () {
                return {
                    busEnabled: 'dtuDarkModeBusEnabled',
                    deadlinesEnabled: 'dtuDarkModeDeadlinesEnabled',
                    searchWidgetEnabled: 'dtuDarkModeSearchWidgetEnabled'
                };
            },
            saveDarkModePreference: saveDarkModePreference,
            isFollowingDeviceTheme: isFollowingDeviceTheme,
            saveDarkModeFollowDevice: saveDarkModeFollowDevice,
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
            updateBusDepartures: updateBusDepartures,
            forceBusImmediateRefresh: function () { try { _lastBusFetch = 0; } catch (e1) { } updateBusDepartures(); },
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
            insertKurserExamDate: insertKurserExamDate,
            insertStudyplanExamSchedule: insertStudyplanExamSchedule,
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
            getAccentThemeId: function () { return getAccentThemeId(); },
            getAccentCustomHex: function () { return getAccentCustomHex(); },
            setAccentThemeId: setAccentThemeId,
            setAccentCustomHex: setAccentCustomHex,
            accentThemeOrder: ACCENT_THEME_ORDER,
            accentThemes: ACCENT_THEMES,
            accentCustomDefault: ACCENT_CUSTOM_DEFAULT
        };
    } catch (eSettingsDeps) { }

    function hideSettingsModal() {
        var api = getSettingsUiApi();
        if (api && typeof api.hideSettingsModal === 'function') {
            api.hideSettingsModal();
            return;
        }
        var overlay = document.querySelector('.dtu-settings-modal-overlay');
        if (overlay) overlay.remove();
        try {
            var settingsBtn = document.querySelector('.dtu-settings-nav-item button');
            if (settingsBtn) settingsBtn.setAttribute('aria-expanded', 'false');
        } catch (e0) { }
    }

    function showSettingsModal() {
        var api = getSettingsUiApi();
        if (api && typeof api.showSettingsModal === 'function') {
            api.showSettingsModal();
            return;
        }
        setTimeout(function () {
            var lateApi = getSettingsUiApi();
            if (lateApi && typeof lateApi.showSettingsModal === 'function') lateApi.showSettingsModal();
        }, 80);
    }

    // Load and visibility handlers are managed by unified scheduling section below

    // Run logo replacement
    replaceLogoImage();

    function getLearnShellApi() {
        try { return globalThis.DTUAfterDarkLearnShellUi || null; } catch (e0) { return null; }
    }

    globalThis.DTUAfterDarkLearnShellDeps = {
        isTopWindow: function () { return IS_TOP_WINDOW; },
        isDarkModeEnabled: function () { return darkModeEnabled; },
        getExtensionUrl: getExtensionUrl,
        markExt: markExt,
        getAdminToolsPlaceholder: getAdminToolsPlaceholder,
        normalizeWhitespace: normalizeWhitespace,
        saveDarkModePreference: saveDarkModePreference,
        showSettingsModal: showSettingsModal,
        isDTULearnHomepage: isDTULearnHomepage,
        isContextCaptureDevToolEnabled: function () { return ENABLE_CONTEXT_CAPTURE_DEV_TOOL; },
        deepQueryAll: deepQueryAll
    };

    function insertMojanglesText() {
        var api = getLearnShellApi();
        if (api && typeof api.insertMojanglesText === 'function') api.insertMojanglesText();
    }

    // Run Mojangles text insertion (unified observer handles updates)
    insertMojanglesText();

    var _adminToolsPlaceholderCache = null;

    // Like Element.closest(), but crosses shadow-root boundaries (via ShadowRoot.host).
    function closestComposed(el, selector) {
        var cur = el;
        while (cur) {
            try { if (cur.matches && cur.matches(selector)) return cur; } catch (e0) { }
            try {
                if (cur.parentElement) { cur = cur.parentElement; continue; }
            } catch (e1) { }
            try {
                var root = cur.getRootNode ? cur.getRootNode() : null;
                if (root && root.host) { cur = root.host; continue; }
            } catch (e2) { }
            cur = null;
        }
        return null;
    }
    function getAdminToolsPlaceholder() {
        try {
            if (_adminToolsPlaceholderCache && _adminToolsPlaceholderCache.isConnected) {
                return _adminToolsPlaceholderCache;
            }
        } catch (e0) { _adminToolsPlaceholderCache = null; }

        var candidates = [];
        try {
            var direct = document.querySelector('#AdminToolsPlaceholderId');
            if (direct) candidates.push(direct);
        } catch (e1) { }
        try {
            var hits = deepQueryAll('#AdminToolsPlaceholderId', document);
            if (hits && hits.length) {
                for (var i = 0; i < hits.length; i++) candidates.push(hits[i]);
            }
        } catch (e2) { }

        // Dedupe candidates.
        var uniq = [];
        for (var u = 0; u < candidates.length; u++) {
            var c = candidates[u];
            if (!c || !c.isConnected) continue;
            var seen = false;
            for (var k = 0; k < uniq.length; k++) {
                if (uniq[k] === c) { seen = true; break; }
            }
            if (!seen) uniq.push(c);
        }

        var chosen = null;
        for (var j = 0; j < uniq.length; j++) {
            var cand = uniq[j];
            if (!chosen) {
                chosen = cand;
                continue;
            }
            try {
                var currentDropdown = closestComposed(chosen, 'd2l-dropdown-content');
                var candidateDropdown = closestComposed(cand, 'd2l-dropdown-content');
                var currentOpen = !!(currentDropdown && currentDropdown.hasAttribute && (currentDropdown.hasAttribute('opened') || currentDropdown.hasAttribute('_opened')));
                var candidateOpen = !!(candidateDropdown && candidateDropdown.hasAttribute && (candidateDropdown.hasAttribute('opened') || candidateDropdown.hasAttribute('_opened')));
                if (!currentOpen && candidateOpen) chosen = cand;
            } catch (e3) { }
        }

        if (chosen) _adminToolsPlaceholderCache = chosen;
        return chosen;
    }

    // ===== CONTEXT CAPTURE HELPER =====
    // Dev-only helper. Must stay disabled in release builds.
    function setupContextCaptureHotkey() {
        var api = getLearnShellApi();
        if (api && typeof api.setupContextCaptureHotkey === 'function') api.setupContextCaptureHotkey();
    }

    function insertContextCaptureHelper() {
        var api = getLearnShellApi();
        if (api && typeof api.insertContextCaptureHelper === 'function') api.insertContextCaptureHelper();
    }

    // ===== FIRST-TIME ONBOARDING HINT =====
    // Show a one-time hint pointing to the Settings/Admin entry point on first Learn homepage visit.
    function scheduleOnboardingHint() {
        var api = getLearnShellApi();
        if (api && typeof api.scheduleOnboardingHint === 'function') api.scheduleOnboardingHint();
    }

    // scheduleOnboardingHint is called from primary bootstrap below

    // ===== TYPEBOX PRESERVATION (kurser.dtu.dk, studieplan.dtu.dk, etc.) =====
    // Preserve custom colors on .typebox elements by reapplying inline styles with !important
    function preserveSingleTypeboxColor(typebox) {
        var api = getStudyplannerShellApi();
        if (!api || typeof api.preserveSingleTypeboxColor !== 'function') return;
        return api.preserveSingleTypeboxColor(typebox);
    }

    function preserveTypeboxColors(root) {
        var api = getStudyplannerShellApi();
        if (!api || typeof api.preserveTypeboxColors !== 'function') return;
        return api.preserveTypeboxColors(root);
    }

    // Run typebox preservation (dark mode only)
    if (darkModeEnabled) preserveTypeboxColors();

    function getCampusnetGpaApi() {
        try { return globalThis.DTUAfterDarkCampusnetGpa || null; } catch (e0) { return null; }
    }

    try {
        globalThis.DTUAfterDarkCampusnetGpaDeps = {
            isTopWindow: function () { return IS_TOP_WINDOW; },
            isFeatureEnabled: function () { return isFeatureFlagEnabled(FEATURE_CAMPUSNET_GPA_TOOLS_KEY); },
            isDarkMode: function () { return !!darkModeEnabled; },
            setSuppressHeavyWork: function (value) { _suppressHeavyWork = !!value; }
        };
    } catch (eGpaDeps) { }

    function syncCampusnetActualGradeExclusionControls() {
        var api = getCampusnetGpaApi();
        if (api && typeof api.syncCampusnetActualGradeExclusionControls === 'function') {
            api.syncCampusnetActualGradeExclusionControls();
        }
    }

    function insertGPARow() {
        var api = getCampusnetGpaApi();
        if (api && typeof api.insertGPARow === 'function') {
            api.insertGPARow();
        }
    }

    function insertGPASimulator() {
        var api = getCampusnetGpaApi();
        if (api && typeof api.insertGPASimulator === 'function') {
            api.insertGPASimulator();
        }
    }

    globalThis.DTUAfterDarkParticipantIntelBridgeRuntime = {
        normalizeWhitespace: normalizeWhitespace,
        markExt: markExt,
        storageLocalGet: storageLocalGet,
        storageLocalSet: storageLocalSet,
        isDarkMode: function () { return !!darkModeEnabled; },
        isTopWindow: IS_TOP_WINDOW
    };
    __participantIntelBridge.init();

    // ===== CONTENT SHORTCUT BUTTON =====
    // Adds a small "Content" button to each course card on the homepage
    // that links directly to /d2l/le/lessons/{courseId}

    // Enumerating shadow roots means walking every element under every root, so it
    // dominates deepQueryAll: on the Learn homepage four modules asked for nav
    // elements several times per mutation batch and each call repeated the whole
    // walk. The root list is memoized instead; the matching itself still runs
    // fresh on every call, so newly added elements inside known roots are never
    // missed. The cache is dropped whenever a mutation batch adds nodes, and in
    // any case after DEEP_ROOTS_TTL_MS, because attaching a shadow root to an
    // element already in the DOM produces no mutation record of its own.
    const DEEP_ROOTS_TTL_MS = 400;
    let _deepRootsCache = new WeakMap();
    let _deepRootsGeneration = 0;

    // Matches are memoized too. Feature checks ask the same few questions
    // repeatedly -- the course-search poller alone runs every 400 ms and queries
    // the nav twice per tick -- and re-running querySelectorAll across every
    // shadow root each time is the remaining cost.
    //
    // Only non-empty results are cached, deliberately. A stale non-empty answer
    // is harmless: the element is verified to still be connected before reuse.
    // A stale *empty* answer is not, because "is my UI already there?" is exactly
    // how the insert paths guard themselves, and answering no twice would insert
    // twice. A miss for something that does not exist yet is cheap anyway.
    const DEEP_RESULTS_TTL_MS = 400;
    const DEEP_RESULTS_MAX_CACHED = 64;
    let _deepResultsCache = new WeakMap();

    function invalidateDeepRoots() {
        _deepRootsGeneration++;
    }

    function collectDeepRoots(startRoot) {
        const cached = _deepRootsCache.get(startRoot);
        const now = Date.now();
        if (cached && cached.generation === _deepRootsGeneration &&
            (now - cached.at) < DEEP_ROOTS_TTL_MS) {
            return cached.roots;
        }

        const roots = [];
        const pending = [startRoot];
        while (pending.length > 0) {
            const searchRoot = pending.pop();
            if (!searchRoot || !searchRoot.querySelectorAll) continue;
            roots.push(searchRoot);

            const walker = document.createTreeWalker(searchRoot, NodeFilter.SHOW_ELEMENT, null);
            let el = walker.nextNode();
            while (el) {
                if (el.shadowRoot) pending.push(el.shadowRoot);
                el = walker.nextNode();
            }
        }

        try {
            _deepRootsCache.set(startRoot, {
                roots: roots,
                generation: _deepRootsGeneration,
                at: now
            });
        } catch (eCache) { }
        return roots;
    }

    function cachedDeepResults(root, selector) {
        const perRoot = _deepResultsCache.get(root);
        if (!perRoot) return null;
        const entry = perRoot.get(selector);
        if (!entry) return null;
        if (entry.generation !== _deepRootsGeneration) return null;
        if ((Date.now() - entry.at) >= DEEP_RESULTS_TTL_MS) return null;
        // A cached node that has since left the document would be handed back as
        // a live match, so verify before reuse rather than trusting the clock.
        for (let i = 0; i < entry.results.length; i++) {
            const el = entry.results[i];
            if (!el || el.isConnected === false) return null;
        }
        return entry.results;
    }

    function storeDeepResults(root, selector, results) {
        if (!results.length) return;
        if (results.length > DEEP_RESULTS_MAX_CACHED) return;
        let perRoot = _deepResultsCache.get(root);
        if (!perRoot) {
            perRoot = new Map();
            try { _deepResultsCache.set(root, perRoot); } catch (eStore) { return; }
        }
        perRoot.set(selector, {
            // Callers get their own array and some mutate it, so keep a private copy.
            results: results.slice(),
            generation: _deepRootsGeneration,
            at: Date.now()
        });
    }

    // Recursively find all elements matching a selector, traversing shadow roots
    function deepQueryAll(selector, root) {
        if (!root) return [];

        const cacheRoot = root.shadowRoot || root;
        const cached = cachedDeepResults(cacheRoot, selector);
        if (cached) return cached.slice();

        const results = [];
        if (root.matches && root.matches(selector)) {
            results.push(root);
        }

        const roots = collectDeepRoots(cacheRoot);
        for (const searchRoot of roots) {
            if (!searchRoot.querySelectorAll) continue;
            searchRoot.querySelectorAll(selector).forEach(match => results.push(match));
        }

        storeDeepResults(cacheRoot, selector, results);
        return results;
    }

    function getContentShortcutApi() {
        try { return globalThis.DTUAfterDarkContentShortcutUi || null; } catch (e0) { return null; }
    }

    try {
        globalThis.DTUAfterDarkContentShortcutDeps = {
            normalizeWhitespace: normalizeWhitespace,
            storageLocalGet: storageLocalGet,
            storageLocalSet: storageLocalSet,
            isTopWindow: function () { return IS_TOP_WINDOW; },
            isDTULearnHomepage: isDTULearnHomepage,
            isContentShortcutEnabled: function () { return isFeatureFlagEnabled(FEATURE_CONTENT_SHORTCUT_KEY); },
            isDarkModeEnabled: isDarkModeEnabled,
            markExt: markExt,
            deepQueryAll: deepQueryAll
        };
    } catch (eContentShortcutDeps) { }

    function insertContentButtons(rootNode) {
        var api = getContentShortcutApi();
        if (api && typeof api.insertContentButtons === 'function') {
            api.insertContentButtons(rootNode);
        }
    }

    function startContentButtonBootstrap() {
        var api = getContentShortcutApi();
        if (api && typeof api.startContentButtonBootstrap === 'function') {
            api.startContentButtonBootstrap();
        }
    }

    function removeContentButtons(rootNode) {
        var api = getContentShortcutApi();
        if (api && typeof api.removeContentButtons === 'function') {
            api.removeContentButtons(rootNode);
        }
    }

    function showContentShortcutOverridesModal() {
        var api = getContentShortcutApi();
        if (api && typeof api.showContentShortcutOverridesModal === 'function') {
            api.showContentShortcutOverridesModal();
        }
    }

    // ===== LESSONS BULK DOWNLOAD (DTU Learn) =====
    // Small utility under the lessons search bar:
    // - Lets users select TOC sections (e.g. "Lecture slides", "Exercises and assignments")
    // - Scans descendant lesson pages for downloadable file links
    // - Triggers bulk downloads

    function getLessonsBulkApi() {
        try { return globalThis.DTUAfterDarkLessonsBulkUi || null; } catch (e0) { return null; }
    }

    try {
        globalThis.DTUAfterDarkLessonsBulkDeps = {
            isTopWindow: function () { return IS_TOP_WINDOW; },
            isFeatureFlagEnabled: isFeatureFlagEnabled,
            isDarkModeEnabled: function () { return !!darkModeEnabled; },
            deepQueryAll: deepQueryAll,
            normalizeWhitespace: normalizeWhitespace,
            markExt: markExt
        };
    } catch (eLessonsBulkDeps) { }

    function insertLessonsBulkDownloadControl() {
        var api = getLessonsBulkApi();
        if (api && typeof api.insertLessonsBulkDownloadControl === 'function') {
            api.insertLessonsBulkDownloadControl();
        }
    }

    function runLessonsBulkDownloadChecks() {
        var api = getLessonsBulkApi();
        if (api && typeof api.runLessonsBulkDownloadChecks === 'function') {
            api.runLessonsBulkDownloadChecks();
        }
    }
    // ===== BUS DEPARTURE TIMES (Rejseplanen 2.0 API) =====
    // Live bus departure information for DTU-area stops, shown on the DTU Learn homepage.
    // Runtime/config/polling now lives in darkmode.bus.js so future fixes stay localized.

    // These answer questions about the URL alone, but the styling passes ask them
    // once per element, hundreds of thousands of times on a busy course page --
    // enough that the regexes alone cost tens of milliseconds. Memoize per URL.
    var _pagePredicateHref = '';
    var _pagePredicateValues = {};

    function pagePredicate(key, compute) {
        var href = window.location.href;
        if (_pagePredicateHref !== href) {
            _pagePredicateHref = href;
            _pagePredicateValues = {};
        }
        if (!(key in _pagePredicateValues)) {
            _pagePredicateValues[key] = compute();
        }
        return _pagePredicateValues[key];
    }

    function isDTULearnHomepage() {
        return pagePredicate('learnHome', function () {
            return window.location.hostname === 'learn.inside.dtu.dk'
                && (
                    /^\/d2l\/home\/?$/.test(window.location.pathname)
                    || /^\/d2l\/lp\/ouHome\/defaultHome\.d2l\/?$/i.test(window.location.pathname)
                );
        });
    }

    function isDTULearnLegacyHeavyCourseToolPage() {
        return pagePredicate('legacyHeavy', function () {
            return window.location.hostname === 'learn.inside.dtu.dk'
                && /^\/d2l\/lms\/(dropbox|classlist|group|news)\//i.test(window.location.pathname);
        });
    }

    function getBusApi() {
        try { return globalThis.DTUAfterDarkBusUi || null; } catch (e0) { return null; }
    }

    try {
        globalThis.DTUAfterDarkBusDeps = {
            markExt: markExt,
            normalizeWhitespace: normalizeWhitespace,
            rgbaFromHex: rgbaFromHex,
            isTopWindow: function () { return IS_TOP_WINDOW; },
            isDTULearnHomepage: isDTULearnHomepage,
            isDarkModeEnabled: isDarkModeEnabled,
            getAdminToolsPlaceholder: getAdminToolsPlaceholder,
            sendRuntimeMessage: sendRuntimeMessage,
            isFeatureFlagEnabled: isFeatureFlagEnabled,
            getResolvedAccent: getResolvedAccent,
            featureLibraryDropdownKey: FEATURE_LIBRARY_DROPDOWN_KEY
        };
    } catch (eBusDeps) { }

    function isBusEnabled() {
        var api = getBusApi();
        return !!(api && typeof api.isBusEnabled === 'function' && api.isBusEnabled());
    }

    function getBusConfig() {
        var api = getBusApi();
        if (api && typeof api.getBusConfig === 'function') return api.getBusConfig();
        return null;
    }

    function isApiQuotaExhausted() {
        var api = getBusApi();
        return !!(api && typeof api.isApiQuotaExhausted === 'function' && api.isApiQuotaExhausted());
    }

    function showQuotaExhaustedMessage(scope) {
        var api = getBusApi();
        if (api && typeof api.showQuotaExhaustedMessage === 'function') api.showQuotaExhaustedMessage(scope);
    }

    function stopBusPolling() {
        var api = getBusApi();
        if (api && typeof api.stopBusPolling === 'function') api.stopBusPolling();
    }

    function abortInFlightBusRequests() {
        var api = getBusApi();
        if (api && typeof api.abortInFlightBusRequests === 'function') api.abortInFlightBusRequests();
    }

    function insertBusDisplay() {
        var api = getBusApi();
        if (api && typeof api.insertBusDisplay === 'function') api.insertBusDisplay();
    }

    function updateBusDepartures() {
        var api = getBusApi();
        if (api && typeof api.updateBusDepartures === 'function') return api.updateBusDepartures();
    }

    function showBusSetupPrompt() {
        var api = getBusApi();
        if (api && typeof api.showBusSetupPrompt === 'function') api.showBusSetupPrompt();
    }

    function showBusConfigModal() {
        var api = getBusApi();
        if (api && typeof api.showBusConfigModal === 'function') api.showBusConfigModal();
    }

    const DEADLINES_ENABLED_KEY = 'dtuDarkModeDeadlinesEnabled';

    function isDeadlinesEnabled() {
        const stored = localStorage.getItem(DEADLINES_ENABLED_KEY);
        return stored === null ? true : stored === 'true';
    }

    const SEARCH_WIDGET_ENABLED_KEY = 'dtuDarkModeSearchWidgetEnabled';

    // Off until the student turns it on.
    function isSearchWidgetEnabled() {
        return localStorage.getItem(SEARCH_WIDGET_ENABLED_KEY) === 'true';
    }


    // The primary settings entry on DTU Learn is the injected DTU After Dark
    // dropdown in the main navigation row.

    // ===== BOOK FINDER LINKS (DTU Learn course pages) =====
    // Detect ISBN numbers and book titles on course pages and inject
    // links to find/buy them at DTU Findit, Polyteknisk, DBA.dk, Facebook Marketplace.

    function isDTULearnCoursePage() {
        return window.location.hostname === 'learn.inside.dtu.dk'
            && /^\/d2l\/(home|le)\/\d+/.test(window.location.pathname);
    }

    function normalizeISBN(raw) {
        return raw.replace(/[\s-]/g, '').replace(/x$/i, 'X');
    }

    function isValidISBN13(digits) {
        if (digits.length !== 13 || !/^\d{13}$/.test(digits)) return false;
        var sum = 0;
        for (var i = 0; i < 12; i++) {
            sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
        }
        return (10 - (sum % 10)) % 10 === parseInt(digits[12]);
    }

    function isValidISBN10(digits) {
        if (digits.length !== 10) return false;
        var sum = 0;
        for (var i = 0; i < 9; i++) {
            if (!/\d/.test(digits[i])) return false;
            sum += parseInt(digits[i]) * (10 - i);
        }
        var last = digits[9] === 'X' ? 10 : parseInt(digits[9]);
        if (isNaN(last)) return false;
        return (sum + last) % 11 === 0;
    }

    function insertBookFinderLinks() {
        var api = getTextbooksApi();
        if (api && typeof api.insertBookFinderLinks === 'function') {
            api.insertBookFinderLinks();
        }
    }

    // Book Finder runs from runTopWindowFeatureChecks(...) to respect feature toggles.

    function isNotesOnlyLiterature(text) {
        if (!text) return true;
        var normalized = text.replace(/\s+/g, ' ').trim();
        if (!normalized) return true;
        if (/^(none|n\/a|-)\s*$/i.test(normalized)) return true;
        if (/^notes?\s+provided\.?$/i.test(normalized)) return true;
        if (/^lecture\s+notes?\s+provided\.?$/i.test(normalized)) return true;
        if (/^notes?\s+will\s+be\s+provided\.?$/i.test(normalized)) return true;
        return false;
    }

    // ===== TEXTBOOK LINKS (kurser.dtu.dk Course literature + Learn Book Finder) =====
    function getTextbooksApi() {
        try { return globalThis.DTUAfterDarkTextbooksUi || null; } catch (e0) { return null; }
    }

    try {
        globalThis.DTUAfterDarkTextbooksDeps = {
            sendRuntimeMessage: sendRuntimeMessage,
            markExt: markExt,
            isTopWindow: function () { return IS_TOP_WINDOW; },
            isFeatureFlagEnabled: isFeatureFlagEnabled,
            isKurserCoursePage: isKurserCoursePage,
            isDTULearnCoursePage: isDTULearnCoursePage,
            isDarkModeEnabled: isDarkModeEnabled,
            normalizeISBN: normalizeISBN,
            isValidISBN13: isValidISBN13,
            isValidISBN10: isValidISBN10,
            isNotesOnlyLiterature: isNotesOnlyLiterature,
            featureTextbookLinksKey: FEATURE_TEXTBOOK_LINKS_KEY
        };
    } catch (eTextbooksDeps) { }

    function insertKurserTextbookLinks() {
        var api = getTextbooksApi();
        if (api && typeof api.insertKurserTextbookLinks === 'function') {
            api.insertKurserTextbookLinks();
        }
    }

    function scheduleKurserTextbookLinker(delayMs) {
        var api = getTextbooksApi();
        if (api && typeof api.scheduleKurserTextbookLinker === 'function') {
            api.scheduleKurserTextbookLinker(delayMs);
        }
    }

    // ===== COURSE GRADE STATISTICS (kurser.dtu.dk) =====
    function isKurserCoursePage() {
        return window.location.hostname === 'kurser.dtu.dk'
            && /\/course\/(?:\d{4}-\d{4}\/)?[A-Za-z0-9]+/i.test(window.location.pathname);
    }

    function getKurserCourseCode() {
        var match = window.location.pathname.match(/\/course\/(?:\d{4}-\d{4}\/)?([A-Za-z0-9]+)/i);
        if (!match || !match[1]) return null;
        return match[1].toUpperCase();
    }

    function findKurserCourseTitleElement(courseCode) {
        var headings = Array.prototype.slice.call(document.querySelectorAll('h1, h2'));
        if (!headings.length) return null;
        var normalizedCode = (courseCode || '').toUpperCase();

        for (var i = 0; i < headings.length; i++) {
            var txt = (headings[i].textContent || '').trim().toUpperCase();
            if (normalizedCode && txt.indexOf(normalizedCode) === 0) return headings[i];
        }

        // DTU course pages commonly use an h2 title.
        var styledH2 = document.querySelector('h2[style*="font-family:verdana"]');
        if (styledH2) return styledH2;

        return document.querySelector('h1') || document.querySelector('h2');
    }

    function findKurserGradeStatsInsertAnchor(titleEl) {
        if (!titleEl) return null;
        var titleCol = titleEl.closest('.col-sm-9, .col-md-9, .col-lg-9, [class*="col-"]');
        if (titleCol && titleCol.parentElement) {
            var row = titleCol.parentElement;
            var cls = row.className || '';
            if (/\brow\b/.test(cls)) return row;
        }
        return titleEl;
    }

    function sendRuntimeMessage(msg, cb) {
        try {
            if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.sendMessage) {
                var p = browser.runtime.sendMessage(msg);
                if (p && typeof p.then === 'function') {
                    p.then(cb).catch(function () { cb(null); });
                    return;
                }
                cb(p);
                return;
            }
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage(msg, cb);
                return;
            }
        } catch (e) {
            // ignore
        }
        if (cb) cb(null);
    }


    // The extension's own DTU Learn nav items, in the order they must appear
    // after the anchor item. Each module used to assert its own rule -- Settings
    // wanted to sit right after Atomic Search, Library wanted to sit right after
    // Settings -- so on a page where the anchor appears late, every feature pass
    // moved one of them and the two visibly traded places until the passes
    // stopped. Ranking them here makes the resting order the only stable one.
    const AFTER_DARK_NAV_ORDER = ['dtu-settings-nav-item', 'dtu-library-nav-item'];

    function afterDarkNavRank(el) {
        if (!el || !el.classList) return -1;
        for (var i = 0; i < AFTER_DARK_NAV_ORDER.length; i++) {
            if (el.classList.contains(AFTER_DARK_NAV_ORDER[i])) return i;
        }
        return -1;
    }

    // Returns the node navItem should be inserted before to sit directly after
    // anchorItem, behind any of our items that outrank it.
    function afterDarkNavInsertRef(mainWrapper, anchorItem, navItem) {
        var rank = afterDarkNavRank(navItem);
        var ref = anchorItem ? anchorItem.nextSibling : (mainWrapper ? mainWrapper.firstChild : null);
        while (ref) {
            if (ref === navItem) {
                ref = ref.nextSibling;
                continue;
            }
            var otherRank = afterDarkNavRank(ref);
            if (otherRank >= 0 && otherRank < rank) {
                ref = ref.nextSibling;
                continue;
            }
            break;
        }
        return ref;
    }

    function placeAfterDarkNavItemAt(mainWrapper, anchorItem, navItem) {
        if (!mainWrapper || !navItem) return;
        var ref = afterDarkNavInsertRef(mainWrapper, anchorItem, navItem);
        // Re-inserting a node that is already in place still counts as a mutation,
        // which would wake the observer and schedule the next pass. Leave it alone.
        if (navItem.parentNode === mainWrapper && navItem.nextSibling === ref) return;
        try { mainWrapper.insertBefore(navItem, ref); } catch (ePlace) { }
    }

    // Same ordering, for the no-anchor case: our items form a block ending just
    // before beforeItem (D2L's overflow "more" entry), or at the end of the nav.
    // The old fallback inserted straight before that item every pass, so whichever
    // of our two ran last ended up in front -- the visible swapping on course and
    // lessons pages, where no Atomic Search anchor exists.
    function placeAfterDarkNavItemBefore(mainWrapper, beforeItem, navItem) {
        if (!mainWrapper || !navItem) return;
        var rank = afterDarkNavRank(navItem);
        var ref = (beforeItem && beforeItem.parentNode === mainWrapper) ? beforeItem : null;
        var probe = ref ? ref.previousSibling : mainWrapper.lastChild;
        while (probe) {
            if (probe === navItem) {
                probe = probe.previousSibling;
                continue;
            }
            if (afterDarkNavRank(probe) > rank) {
                ref = probe;
                probe = probe.previousSibling;
                continue;
            }
            break;
        }
        if (navItem.parentNode === mainWrapper && navItem.nextSibling === ref) return;
        try { mainWrapper.insertBefore(navItem, ref); } catch (ePlaceBefore) { }
    }

    function getKurserWidgetsApi() {
        try { return globalThis.DTUAfterDarkKurserWidgetsUi || null; } catch (e0) { return null; }
    }

    try {
        globalThis.DTUAfterDarkKurserWidgetsDeps = {
            sendRuntimeMessage: sendRuntimeMessage,
            markExt: markExt,
            isTopWindow: function () { return IS_TOP_WINDOW; },
            isDarkModeEnabled: isDarkModeEnabled,
            isFeatureFlagEnabled: isFeatureFlagEnabled,
            isKurserCoursePage: isKurserCoursePage,
            getKurserCourseCode: getKurserCourseCode,
            findKurserCourseTitleElement: findKurserCourseTitleElement,
            findKurserGradeStatsInsertAnchor: findKurserGradeStatsInsertAnchor,
            getKurserInsightTheme: getKurserInsightTheme,
            getKurserInsightContainerStyle: getKurserInsightContainerStyle,
            getKurserInsightSurfaceStyle: getKurserInsightSurfaceStyle,
            featureKurserGradeStatsKey: FEATURE_KURSER_GRADE_STATS_KEY
        };
    } catch (eKurserWidgetsDeps) { }

    function getKurserInsightTheme() {
        var isDark = !!darkModeEnabled;
        return {
            containerBg: isDark ? 'rgba(255,255,255,0.026)' : 'rgba(248,250,252,0.96)',
            containerBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(148,163,184,0.24)',
            text: isDark ? '#e6e9ee' : '#1f2937',
            mutedText: isDark ? '#aeb6c2' : '#667385',
            subtleText: isDark ? '#cdd3db' : '#334155',
            surfaceBg: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
            surfaceInset: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)',
            divider: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)',
            quietTrack: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
            linkColor: isDark ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep-text, ' + getResolvedAccentDeep() + ')',
            accentText: isDark ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep-text, ' + getResolvedAccentDeep() + ')'
        };
    }

    function getKurserInsightContainerStyle(theme) {
        return 'margin: 7px 0 9px 0; padding: 9px 11px 10px; border-radius: 7px; width: 100%; max-width: none; '
            + 'box-sizing: border-box; background:' + theme.containerBg + '; border: 1px solid ' + theme.containerBorder + '; '
            + 'color: ' + theme.text + '; font-family: inherit; font-size: 11px;';
    }

    function getKurserInsightSurfaceStyle(theme, extra) {
        return 'padding: 7px 9px; border-radius: 6px; background: ' + theme.surfaceBg + '; '
            + 'box-shadow: inset 0 0 0 1px ' + theme.surfaceInset + ';'
            + (extra || '');
    }

    function insertKurserGradeStats() {
        var api = getKurserWidgetsApi();
        if (api && typeof api.insertKurserGradeStats === 'function') {
            api.insertKurserGradeStats();
        }
    }

    // ===== COURSE EVALUATION (kurser.dtu.dk, from evaluering.dtu.dk) =====
    function getKurserCourseEvalApi() {
        try { return globalThis.DTUAfterDarkKurserCourseEvalUi || null; } catch (e0) { return null; }
    }

    try {
        globalThis.DTUAfterDarkKurserCourseEvalDeps = {
            sendRuntimeMessage: sendRuntimeMessage,
            markExt: markExt,
            isTopWindow: function () { return IS_TOP_WINDOW; },
            isFeatureFlagEnabled: isFeatureFlagEnabled,
            isKurserCoursePage: isKurserCoursePage,
            getKurserCourseCode: getKurserCourseCode,
            getKurserInsightTheme: getKurserInsightTheme,
            getKurserInsightContainerStyle: getKurserInsightContainerStyle,
            getKurserInsightSurfaceStyle: getKurserInsightSurfaceStyle,
            findKurserCourseTitleElement: findKurserCourseTitleElement,
            findKurserGradeStatsInsertAnchor: findKurserGradeStatsInsertAnchor,
            isDarkModeEnabled: isDarkModeEnabled,
            featureKurserCourseEvalKey: FEATURE_KURSER_COURSE_EVAL_KEY
        };
    } catch (eKurserCourseEvalDeps) { }

    function insertKurserCourseEvaluation() {
        var api = getKurserCourseEvalApi();
        if (api && typeof api.insertKurserCourseEvaluation === 'function') {
            api.insertKurserCourseEvaluation();
        }
    }

    // ===== COURSE MAP (kurser.dtu.dk prerequisite map) =====
    try {
        globalThis.DTUAfterDarkCourseMapDeps = {
            markExt: markExt,
            isTopWindow: function () { return IS_TOP_WINDOW; },
            isFeatureFlagEnabled: isFeatureFlagEnabled,
            isKurserCoursePage: isKurserCoursePage,
            getKurserCourseCode: getKurserCourseCode,
            getExtensionUrl: getExtensionUrl,
            featureKurserCourseMapKey: FEATURE_KURSER_COURSE_MAP_KEY
        };
    } catch (eCourseMapDeps) { }

    function insertKurserCourseMap() {
        var api = null;
        try { api = globalThis.DTUAfterDarkCourseMap || null; } catch (e0) { }
        if (api && typeof api.insertKurserCourseMap === 'function') api.insertKurserCourseMap();
    }

    // ===== EXAM SCHEDULE (studieplan.dtu.dk period button and panel) =====
    try {
        globalThis.DTUAfterDarkExamScheduleDeps = {
            markExt: markExt,
            isTopWindow: function () { return IS_TOP_WINDOW; },
            isFeatureFlagEnabled: isFeatureFlagEnabled,
            isDarkModeEnabled: isDarkModeEnabled,
            sendRuntimeMessage: sendRuntimeMessage,
            storageLocalGet: storageLocalGet,
            storageLocalSet: storageLocalSet,
            isKurserCoursePage: isKurserCoursePage,
            getKurserCourseCode: getKurserCourseCode,
            featureStudyplanExamScheduleKey: FEATURE_STUDYPLAN_EXAM_SCHEDULE_KEY
        };
    } catch (eExamScheduleDeps) { }

    function insertStudyplanExamSchedule() {
        var api = null;
        try { api = globalThis.DTUAfterDarkExamSchedule || null; } catch (e0) { }
        if (api && typeof api.insertStudyplanExamScheduleButtons === 'function') api.insertStudyplanExamScheduleButtons();
    }

    function insertKurserExamDate() {
        var api = null;
        try { api = globalThis.DTUAfterDarkKurserExamDate || null; } catch (e0) { }
        if (api && typeof api.insertKurserExamDate === 'function') api.insertKurserExamDate();
    }

    /* ===================================================================
     *  Smart Room Linker (MazeMap)
     *  Detects building/room mentions site-wide and turns them into MazeMap
     *  links. IDs are resolved lazily on click via background fetch.
     * =================================================================== */

    function getSmartRoomLinkerApi() {
        try { return globalThis.DTUAfterDarkSmartRoomLinkerUi || null; } catch (e0) { return null; }
    }

    try {
        globalThis.DTUAfterDarkSmartRoomLinkerDeps = {
            sendRuntimeMessage: sendRuntimeMessage,
            markExt: markExt,
            isTopWindow: function () { return IS_TOP_WINDOW; },
            isFeatureFlagEnabled: isFeatureFlagEnabled,
            isDarkModeEnabled: isDarkModeEnabled,
            isDTULearnLegacyHeavyCourseToolPage: isDTULearnLegacyHeavyCourseToolPage,
            featureSmartRoomLinkerKey: FEATURE_SMART_ROOM_LINKER_KEY
        };
    } catch (eSmartRoomDeps) { }

    function scheduleSmartRoomLinkerScan(rootNode, delayMs) {
        var api = getSmartRoomLinkerApi();
        if (api && typeof api.scheduleSmartRoomLinkerScan === 'function') {
            api.scheduleSmartRoomLinkerScan(rootNode, delayMs);
        }
    }

    function scheduleSmartRoomLinkerShadowSweep(delayMs) {
        var api = getSmartRoomLinkerApi();
        if (api && typeof api.scheduleSmartRoomLinkerShadowSweep === 'function') {
            api.scheduleSmartRoomLinkerShadowSweep(delayMs);
        }
    }

    function scheduleSmartRoomLinkerHtmlBlockProbe(delayMs) {
        var api = getSmartRoomLinkerApi();
        if (api && typeof api.scheduleSmartRoomLinkerHtmlBlockProbe === 'function') {
            api.scheduleSmartRoomLinkerHtmlBlockProbe(delayMs);
        }
    }

    function removeSmartRoomLinks() {
        var api = getSmartRoomLinkerApi();
        if (api && typeof api.removeSmartRoomLinks === 'function') {
            api.removeSmartRoomLinks();
        }
    }

    function runFrameFeatureChecks(rootNode) {
        // Lightweight features that should run inside same-origin iframes too (e.g. DTU Learn Content).
        if (IS_TOP_WINDOW) return;

        // Site-wide: turn room mentions into MazeMap links (lazy-resolve on click).
        if (isFeatureFlagEnabled(FEATURE_SMART_ROOM_LINKER_KEY)) {
            scheduleSmartRoomLinkerScan(rootNode, 520);
            scheduleSmartRoomLinkerHtmlBlockProbe(700);
            scheduleSmartRoomLinkerShadowSweep(820);
        } else {
            removeSmartRoomLinks();
        }
    }


    function getHostShellApi() {
        try { return globalThis.DTUAfterDarkHostShell || null; } catch (e0) { return null; }
    }

    globalThis.DTUAfterDarkHostShellDeps = {
        isTopWindow: function () { return IS_TOP_WINDOW; },
        isDarkModeEnabled: function () { return !!darkModeEnabled; },
        getResolvedAccentDeep: getResolvedAccentDeep,
        getAccentThemeById: getAccentThemeById,
        getAccentThemeId: function () { return getAccentThemeId(); }
    };

    function fixEvalueringResultCharts() {
        var api = getHostShellApi();
        if (!api || typeof api.fixEvalueringResultCharts !== 'function') return;
        return api.fixEvalueringResultCharts();
    }

    function fixCampusnetHeaderStyling() {
        var api = getHostShellApi();
        if (!api || typeof api.fixCampusnetHeaderStyling !== 'function') return;
        return api.fixCampusnetHeaderStyling();
    }

    function fixStudentPortalStyling(rootNode) {
        var api = getHostShellApi();
        if (!api || typeof api.fixStudentPortalStyling !== 'function') return;
        return api.fixStudentPortalStyling(rootNode);
    }

    // ===== KURSER.DTU.DK ACCENT ELEMENTS (light mode) =====
    function applyKurserAccentElements() {
        var api = getStudyplannerShellApi();
        if (!api || typeof api.applyKurserAccentElements !== 'function') return;
        return api.applyKurserAccentElements();
    }

    function getStudyplannerShellApi() {
        return globalThis.DTUAfterDarkStudyplannerShell || null;
    }

    globalThis.DTUAfterDarkStudyplannerShellDeps = {
        isTopWindow: function () { return IS_TOP_WINDOW; },
        getResolvedAccentDeep: getResolvedAccentDeep,
        normalizeWhitespace: normalizeWhitespace,
        isDarkModeEnabled: function () { return darkModeEnabled; }
    };

    function styleStudyPlannerTabs() {
        var api = getStudyplannerShellApi();
        if (!api || typeof api.styleStudyPlannerTabs !== 'function') return;
        return api.styleStudyPlannerTabs();
    }

    function getLearnAccentShellApi() {
        try { return globalThis.DTUAfterDarkLearnAccentShell || null; } catch (e0) { return null; }
    }

    globalThis.DTUAfterDarkLearnAccentShellDeps = {
        isDarkModeEnabled: function () { return !!darkModeEnabled; },
        getResolvedAccent: getResolvedAccent,
        getContrastTextForHex: getContrastTextForHex,
        getLightAccentBadgeStyles: function () { return lightAccentBadgeStyles; },
        isLegacyHeavyPage: isDTULearnLegacyHeavyCourseToolPage,
        getDarkText: getDarkText,
        getDarkBorder: getDarkBorder,
        deepQueryAll: deepQueryAll
    };

    function forceDTULearnAccentInRoot(root) {
        var api = getLearnAccentShellApi();
        if (!api || typeof api.forceDTULearnAccentInRoot !== 'function') return;
        return api.forceDTULearnAccentInRoot(root);
    }

    function forceDTULearnAccentElements(root) {
        var api = getLearnAccentShellApi();
        if (!api || typeof api.forceDTULearnAccentElements !== 'function') return;
        return api.forceDTULearnAccentElements(root);
    }

    // ===== UNIFIED SCHEDULING =====
    // Replaces 8 separate setIntervals and 6 MutationObservers with
    // ONE master interval + ONE unified MutationObserver for much lower CPU usage.


    let _bookFinderTimer = null;

    function scheduleBookFinderScan(delayMs) {
        if (!IS_TOP_WINDOW || !isDTULearnCoursePage()) return;
        if (!isFeatureFlagEnabled(FEATURE_TEXTBOOK_LINKS_KEY)) {
            if (_bookFinderTimer) clearTimeout(_bookFinderTimer);
            _bookFinderTimer = null;
            insertBookFinderLinks();
            return;
        }
        if (_bookFinderTimer) return;
        _bookFinderTimer = setTimeout(function () {
            _bookFinderTimer = null;
            insertBookFinderLinks();
        }, delayMs || 800);
    }

    function removeDTULearnMSTeamsCourseConnector(rootNode) {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!isDTULearnCoursePage()) return;

        var scope = (rootNode && rootNode.querySelectorAll) ? rootNode : document;
        var widgets = [];
        try {
            widgets = scope.querySelectorAll('.d2l-widget, .d2l-tile');
        } catch (e0) {
            widgets = [];
        }

        widgets.forEach(function (widget) {
            if (!widget || !widget.querySelector) return;
            var heading = widget.querySelector('.d2l-widget-header h2, h2.d2l-heading');
            var title = '';
            try { title = (heading ? heading.textContent : '').replace(/\s+/g, ' ').trim(); } catch (e1) { title = ''; }
            if (!/ms teams course connector/i.test(title)) return;
            if (widget.remove) widget.remove();
        });
    }

    function fixDTULearnLegacyLmsToolStyling(rootNode) {
        var api = getLearnAccentShellApi();
        if (!api || typeof api.fixDTULearnLegacyLmsToolStyling !== 'function') return;
        return api.fixDTULearnLegacyLmsToolStyling(rootNode);
    }

    function runTopWindowFeatureChecks(rootNode, refreshBus) {
        if (!IS_TOP_WINDOW) return;

        var host = window.location.hostname;
        if (host === 'learn.inside.dtu.dk' || host === 'campusnet.dtu.dk' || host === 'studieplan.dtu.dk' || host === 'kurser.dtu.dk' || host === 'sites.dtu.dk') {
            try { replaceLogoImage(rootNode || document); } catch (eLogoTop) { }
        }
        if (ENABLE_CONTEXT_CAPTURE_DEV_TOOL) {
            setupContextCaptureHotkey();
            insertContextCaptureHelper();
        }
        styleStudyPlannerTabs();
        clearStudyplanModalInlineDarkBackgrounds(rootNode || document);
        fixEvalueringResultCharts();
        fixCampusnetHeaderStyling();
        fixStudentPortalStyling(rootNode || document);
        applyKurserAccentElements();
        if (host === 'studieplan.dtu.dk' || host === 'campusnet.dtu.dk' || host === 'kurser.dtu.dk') {
            enforceDtuRedBackgroundZoneDark2();
        }

        if (host === 'learn.inside.dtu.dk') {
            fixDTULearnLegacyLmsToolStyling(rootNode || document);
            removeDTULearnHelpDropdown();
            insertMojanglesText();
            if (isFeatureFlagEnabled(FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY)) {
                insertDTULearnNavResourceLinks();
            } else {
                removeDTULearnNavResourceLinks();
            }
            // Re-apply accent on key DTU Learn UI elements; global darkening can otherwise flatten these.
            try { forceDTULearnAccentElements(rootNode || document); } catch (eAcc) { }
            insertLessonsBulkDownloadControl();
            insertLibraryNavDropdown();
            insertSettingsNavItem();
            removeDTULearnMSTeamsCourseConnector(rootNode || document);
            if (isFeatureFlagEnabled(FEATURE_CONTENT_SHORTCUT_KEY)) {
                insertContentButtons(rootNode);
                startContentButtonBootstrap();
            } else {
                removeContentButtons();
            }
            // Settings are accessible through the injected Learn nav Settings button.
            insertDeadlinesHomepageWidget();
            if (refreshBus && isDTULearnHomepage()) {
                updateBusDepartures();
            }
            scheduleBookFinderScan(refreshBus ? 300 : 900);
        }
        if (host === 'campusnet.dtu.dk') {
            insertGPARow();
            insertGPASimulator();
            syncCampusnetActualGradeExclusionControls();
            insertParticipantIntelligence();
        }
        if (host === 'studieplan.dtu.dk') {
            insertStudyplanExamSchedule();
        }
        if (host === 'kurser.dtu.dk') {
            insertKurserGradeStats();
            insertKurserCourseEvaluation();
            insertKurserCourseMap();
            insertKurserExamDate();
            scheduleKurserTextbookLinker(refreshBus ? 240 : 620);
        }

        // Site-wide: turn room mentions into MazeMap links (lazy-resolve on click).
        if (isFeatureFlagEnabled(FEATURE_SMART_ROOM_LINKER_KEY)) {
            scheduleSmartRoomLinkerScan(rootNode, refreshBus ? 260 : 720);
            scheduleSmartRoomLinkerHtmlBlockProbe(refreshBus ? 420 : 900);
            scheduleSmartRoomLinkerShadowSweep(refreshBus ? 420 : 1100);
        } else {
            removeSmartRoomLinks();
        }
    }

    function shouldUseUnifiedObserver() {
        // Chrome can spend excessive time in mutation processing on these
        // highly dynamic pages; run feature checks from load/visibility hooks instead.
        var host = window.location.hostname;
        if (isDTULearnLegacyHeavyCourseToolPage()) return false;
        if (host === 'studieplan.dtu.dk' || host === 'kurser.dtu.dk') return false;
        return true;
    }

    var _hostFeatureBootstrapTimer = null;
    var _campusnetLogoFastTimer = null;

    function startCampusnetLogoFastBootstrap() {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'campusnet.dtu.dk') return;
        if (_campusnetLogoFastTimer) return;

        var attempts = 0;
        _campusnetLogoFastTimer = setInterval(function () {
            attempts++;
            try { replaceLogoImage(); } catch (eLogoFast) { }

            var done = false;
            try {
                done = !!document.querySelector('img.header__logo[data-dark-mode-replaced="true"], img[src*="DTULogo_Corp_Red_RGB.png"][data-dark-mode-replaced="true"]');
            } catch (eDone) { done = false; }

            if (done || attempts >= 45) {
                clearInterval(_campusnetLogoFastTimer);
                _campusnetLogoFastTimer = null;
            }
        }, 60);
    }

    function startHostFeatureBootstrap() {
        if (!IS_TOP_WINDOW) return;
        if (_hostFeatureBootstrapTimer) return;
        var host = window.location.hostname;
        if (host === 'campusnet.dtu.dk') {
            startCampusnetLogoFastBootstrap();
            return;
        }
        if (host !== 'studieplan.dtu.dk' && host !== 'kurser.dtu.dk') return;

        var attempts = 0;
        _hostFeatureBootstrapTimer = setInterval(function () {
            attempts++;
            runTopWindowFeatureChecks(null, false);

            var done = false;
            if (host === 'studieplan.dtu.dk') {
                done = !!document.querySelector('[data-dtu-exam-schedule]');
            } else if (host === 'kurser.dtu.dk') {
                done = !!document.querySelector('[data-dtu-grade-stats]')
                    || !!document.querySelector('[data-dtu-course-eval]')
                    || !!document.querySelector('[data-dtu-textbook-linker]')
                    || !!document.querySelector('[data-dtu-textbook-linker-bar-host]');
            }

            if (done || attempts >= 35) {
                clearInterval(_hostFeatureBootstrapTimer);
                _hostFeatureBootstrapTimer = null;
            }
        }, 500);
    }

    var _hostLightObserver = null;
    var _hostLightRefreshTimer = null;

    function isExternalNode(node) {
        if (!node) return false;
        var el = node.nodeType === 1 ? node : node.parentElement;
        if (!el) return false;
        if (el.hasAttribute && el.hasAttribute('data-dtu-ext')) return true;
        return !!(el.closest && el.closest('[data-dtu-ext]'));
    }

    function scheduleHostLightRefresh(delayMs) {
        if (_hostLightRefreshTimer) return;
        _hostLightRefreshTimer = setTimeout(function () {
            _hostLightRefreshTimer = null;
            var host = window.location.hostname;
            if (host === 'studieplan.dtu.dk') {
                insertStudyplanExamSchedule();
                // Studieplan can re-render its header/logo after initial load; re-apply logo override.
                try { replaceLogoImage(); } catch (eLogo1) { }
                return;
            }
            if (host === 'kurser.dtu.dk') {
                insertKurserGradeStats();
                insertKurserCourseEvaluation();
                insertKurserCourseMap();
                insertKurserExamDate();
                scheduleKurserTextbookLinker(110);
                // Kurser can also swap logos late; keep it stable in dark mode.
                try { replaceLogoImage(); } catch (eLogo2) { }
            }
        }, delayMs || 180);
    }

    function startHostLightObserver() {
        if (!IS_TOP_WINDOW) return;
        var host = window.location.hostname;
        if (host !== 'studieplan.dtu.dk' && host !== 'kurser.dtu.dk') return;
        if (_hostLightObserver) return;
        if (!document.documentElement) return;

        _hostLightObserver = new MutationObserver(function (mutations) {
            var shouldRefresh = false;

            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];
                if (mutation.type !== 'childList') continue;
                if ((mutation.addedNodes && mutation.addedNodes.length) || (mutation.removedNodes && mutation.removedNodes.length)) {
                    var relevant = false;
                    for (var a = 0; mutation.addedNodes && a < mutation.addedNodes.length; a++) {
                        var addedNode = mutation.addedNodes[a];
                        if (!isExternalNode(addedNode)) {
                            relevant = true;
                            break;
                        }
                    }
                    if (!relevant) {
                        for (var r = 0; mutation.removedNodes && r < mutation.removedNodes.length; r++) {
                            var removedNode = mutation.removedNodes[r];
                            if (!isExternalNode(removedNode)) {
                                relevant = true;
                                break;
                            }
                        }
                    }
                    if (relevant) {
                        shouldRefresh = true;
                        break;
                    }
                }
            }

            if (shouldRefresh) {
                scheduleHostLightRefresh(host === 'studieplan.dtu.dk' ? 140 : 180);
            }
        });

        _hostLightObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    startHostFeatureBootstrap();
    startHostLightObserver();

    // Unified MutationObserver â€” handles style re-overrides immediately,
    // and debounces heavier processing (shadow roots, logos, etc.)
    let _heavyWorkTimer = null;
    let _pendingMutationRoots = [];
    let _pendingMutationRootSet = new Set();
    let _mutationQueueOverflow = false;
    const MAX_PENDING_MUTATION_ROOTS = 220;
    const MAX_ROOTS_PER_FLUSH = 48;
    var _suppressHeavyWork = false; // Set true during our own DOM changes to avoid UI freezes

    function enqueueMutationRoot(node) {
        if (!node || node.nodeType !== 1 || !node.isConnected) return;
        // Our own writes (marked nodes, Book Finder bars) are not page changes.
        if (node.hasAttribute && (node.hasAttribute('data-dtu-ext') || node.hasAttribute('data-book-finder-bar'))) return;
        if (node.closest && node.closest('[data-dtu-ext], [data-book-finder-bar]')) return;
        if (_mutationQueueOverflow) return;
        if (_pendingMutationRootSet.has(node)) return;
        _pendingMutationRootSet.add(node);
        _pendingMutationRoots.push(node);
        if (_pendingMutationRoots.length > MAX_PENDING_MUTATION_ROOTS) {
            _mutationQueueOverflow = true;
        }
    }

    function dedupeMutationRoots(roots) {
        var unique = [];
        roots.forEach(function (root) {
            if (!root || root.nodeType !== 1 || !root.isConnected) return;
            var skip = false;
            for (var i = 0; i < unique.length; i++) {
                var existing = unique[i];
                if (existing === root || existing.contains(root)) {
                    skip = true;
                    break;
                }
                if (root.contains(existing)) {
                    unique.splice(i, 1);
                    i--;
                }
            }
            if (!skip) unique.push(root);
        });
        return unique;
    }

    function handleMutations(mutations) {
        if (_suppressHeavyWork) return;
        let needsHeavyWork = false;

        for (const mutation of mutations) {
            if (darkModeEnabled) {
                // Style / class attribute changes â€” apply dark overrides immediately
                if (mutation.type === 'attributes') {
                    const el = mutation.target;
                    if (el && el.hasAttribute && el.hasAttribute('data-dtu-ext')) continue;
                    if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
                        try {
                            if (el && el.closest && el.closest('.navigation-container .navigation-tree')) {
                                forceLessonsTocDark1(el);
                            }
                        } catch (eTocAttr2) { }
                        try {
                            forceD2LActionButtonsDark1(el);
                        } catch (eActionAttr2) { }
                        if (el.matches) {
                            var lighterDarkSelectors = getLighterDarkSelectors();
                            var darkSelectors = getDarkSelectors();
                            if (lighterDarkSelectors && el.matches(lighterDarkSelectors)) {
                                applyLighterDarkStyle(el);
                            } else if (darkSelectors && el.matches(darkSelectors)) {
                                applyDarkStyle(el);
                            }
                        }
                        if (el.matches && el.matches('.dturedbackground')) {
                            forceDtuRedBackgroundDark2(el);
                        }
                        if (el.classList && el.classList.contains('typebox')) {
                            preserveSingleTypeboxColor(el);
                        }
                    }
                    if (mutation.attributeName === 'src' && el.matches
                        && el.matches(
                            'd2l-labs-navigation-link-image.d2l-navigation-s-logo, '
                            + 'd2l-labs-navigation-link-image[text="My Home"], '
                            + 'img.logo-img, '
                            + 'img.header__logo, '
                            + 'img[src*="dtulogo_colour.png"], '
                            + 'img[src*="dtulogo2_colour.png"], '
                            + 'img[src*="DTULogo_Corp_Red_RGB.png"]'
                        )) {
                        replaceLogoImage(el);
                    }
                }
            }

            // New nodes added â€” schedule feature checks (and dark styles if enabled)
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.hasAttribute && node.hasAttribute('data-dtu-ext')) return;
                        if (node.closest && node.closest('[data-dtu-ext]')) return;
                        try {
                            if (node.closest && node.closest('.navigation-container .navigation-tree')) {
                                forceLessonsTocDark1(node);
                            }
                        } catch (eTocNode2) { }
                        try {
                            forceD2LActionButtonsDark1(node);
                        } catch (eActionNode2) { }
                        enqueueMutationRoot(node);
                        if (darkModeEnabled) {
                            var darkSelectors = getDarkSelectors();
                            var lighterDarkSelectors = getLighterDarkSelectors();
                            if (darkSelectors && node.matches && node.matches(darkSelectors)) applyDarkStyle(node);
                            if (lighterDarkSelectors && node.matches && node.matches(lighterDarkSelectors)) applyLighterDarkStyle(node);
                            forceLessonsTocDark1(node);
                            forceD2LActionButtonsDark1(node);
                            if (node.matches && node.matches('.dturedbackground')) {
                                forceDtuRedBackgroundDark2(node);
                            }
                            if (node.querySelectorAll) {
                                // Avoid full descendant scans on every mutation in Chrome;
                                // runDarkModeChecks(root) handles deeper processing in a debounced batch.
                                if (node.querySelector('.dturedbackground')) {
                                    node.querySelectorAll('.dturedbackground').forEach(forceDtuRedBackgroundDark2);
                                }
                            }
                        }
                        needsHeavyWork = true;
                    }
                });
            }
        }

        // Debounce heavy operations (features always, dark-mode styling conditionally)
        if (needsHeavyWork && !_heavyWorkTimer) {
            _heavyWorkTimer = setTimeout(() => {
                _heavyWorkTimer = null;
                // The DOM has changed since the last flush, so every feature check
                // below must see a freshly enumerated shadow-root list. They then
                // share that one walk instead of repeating it per caller.
                invalidateDeepRoots();

                var queueOverflow = _mutationQueueOverflow;
                _mutationQueueOverflow = false;
                var roots = _pendingMutationRoots.filter(function (root) {
                    return root && root.nodeType === 1 && root.isConnected;
                });
                _pendingMutationRoots = [];
                _pendingMutationRootSet.clear();
                if (queueOverflow) {
                    runDarkModeChecks();
                    runTopWindowFeatureChecks(null, false);
                    try { runLessonsBulkDownloadChecks(); } catch (eLbdQ) { }
                    return;
                }
                if (roots.length === 0) return;
                roots = dedupeMutationRoots(roots);
                if (roots.length > MAX_ROOTS_PER_FLUSH) {
                    // Too many distinct roots to process individually. A full
                    // sweep is cheaper than 48 subtree walks and, unlike
                    // dropping roots, cannot silently strand a subtree whose
                    // later rendering happens inside a shadow root.
                    runDarkModeChecks();
                    runTopWindowFeatureChecks(null, false);
                    try { runLessonsBulkDownloadChecks(); } catch (eLbdF) { }
                    return;
                }

                if (darkModeEnabled) {
                    roots.forEach(root => {
                        // One root failing must not strand the remaining roots.
                        try { runDarkModeChecks(root); } catch (eRootCheck) { }
                    });
                    // Some hosts (CampusNet / Studyplanner) render logos late; apply per-mutation-root
                    // so we catch late-added header DOM without relying on `src` changes.
                    try {
                        roots.forEach(function (r) { replaceLogoImage(r); });
                    } catch (eLogoM) { }
                }
                // The feature pass gets the last root; room links need every changed root
                // (the scheduler queues them all in one timer).
                if (isFeatureFlagEnabled(FEATURE_SMART_ROOM_LINKER_KEY)) {
                    roots.slice(0, -1).forEach(function (r) { scheduleSmartRoomLinkerScan(r, 720); });
                }
                runTopWindowFeatureChecks(roots[roots.length - 1] || null, false);
                try { runLessonsBulkDownloadChecks(); } catch (eLbd1) { }
            }, 200);
        }
    }

    function startUnifiedObserver() {
        const observer = new MutationObserver(handleMutations);
        const observeOptions = {
            childList: true,
            subtree: true
        };
        if (darkModeEnabled) {
            observeOptions.attributes = true;
            // Also watch `src` so host pages that swap logo/image sources after load
            // get immediately re-overridden (e.g. Studyplanner / CampusNet logos).
            observeOptions.attributeFilter = ['style', 'class', 'src'];
        }
        observer.observe(document.documentElement, observeOptions);
    }

    // Start observer immediately on documentElement (exists at document_start)
    // Handles both dark-mode styling (when enabled) and feature insertion (always)
    if (shouldUseUnifiedObserver()) {
        if (document.documentElement) {
            startUnifiedObserver();
        } else {
            document.addEventListener('DOMContentLoaded', startUnifiedObserver);
        }
    }

    var _didRunPrimaryBootstrap = false;
    function runPrimaryBootstrap() {
        if (_didRunPrimaryBootstrap) return;
        _didRunPrimaryBootstrap = true;
        waitForCustomElements().then(function () {
            if (darkModeEnabled) injectDarkCSS();
            runDarkModeChecks();
            runTopWindowFeatureChecks(null, true);
            try { runLessonsBulkDownloadChecks(); } catch (eLbdBoot) { }
            // Logos often appear after initial HTML parsing (or get swapped by site JS).
            // Re-apply after primary bootstrap + a couple delayed passes.
            try { replaceLogoImage(); } catch (eLogo0) { }
            startHostFeatureBootstrap();
            startHostLightObserver();
            startContentButtonBootstrap();
            setTimeout(function () { runDarkModeChecks(); runTopWindowFeatureChecks(null, true); try { runLessonsBulkDownloadChecks(); } catch (eLbdA) { } }, 500);
            setTimeout(function () { runDarkModeChecks(); runTopWindowFeatureChecks(null, true); try { runLessonsBulkDownloadChecks(); } catch (eLbdB) { } }, 1500);
            setTimeout(function () { try { replaceLogoImage(); } catch (eLogoA) { } }, 650);
            setTimeout(function () { try { replaceLogoImage(); } catch (eLogoB) { } }, 1850);
            scheduleOnboardingHint();
            setTimeout(showBusSetupPrompt, 2500);
        });
    }

    // Page load: run all checks a few times to catch late-loading elements
    window.addEventListener('load', function () {
        runPrimaryBootstrap();
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(runPrimaryBootstrap, 0);
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(runPrimaryBootstrap, 0);
        });
    }

    window.addEventListener('pageshow', function () {
        setTimeout(function () {
            runTopWindowFeatureChecks(null, true);
            try { runLessonsBulkDownloadChecks(); } catch (eLbdPg) { }
            startHostFeatureBootstrap();
            startHostLightObserver();
        }, 30);
    });

    window.addEventListener('focus', function () {
        setTimeout(function () {
            runTopWindowFeatureChecks(null, true);
            try { runLessonsBulkDownloadChecks(); } catch (eLbdFc) { }
            startHostFeatureBootstrap();
            startHostLightObserver();
        }, 40);
    });

    // Re-process when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            setTimeout(function () {
                runDarkModeChecks();
                runTopWindowFeatureChecks(null, true);
                try { runLessonsBulkDownloadChecks(); } catch (eLbdVis) { }
                startHostFeatureBootstrap();
                startHostLightObserver();
                startContentButtonBootstrap();
            }, 100);
        }
    });

    // Lightweight safety-net for late-created Brightspace shadow roots.
    // Runs in iframes as well: Lessons/Content SPAs render in same-origin
    // frames whose shadow trees the top-window sweep cannot reach.
    // NOTE: the engine loads after this script, so the shadow-processing gate
    // must be evaluated inside the tick, not at registration time.
    if (darkModeEnabled) {
        setInterval(function () {
            if (document.hidden) return;
            if (!shouldUseBrightspaceShadowDomProcessing()) return;
            sweepForLateShadowRoots();
        }, 15000);
    }
})();
