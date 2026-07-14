// Dark mode script to inject styles into Shadow DOM elements
(function () {
    'use strict';

    // ===== DARK MODE TOGGLE =====
    const DARK_MODE_KEY = 'dtuDarkModeEnabled';
    const URL_PAUSE_PATTERNS_KEY = 'dtuAfterDarkUrlPausePatterns';
    const IS_TOP_WINDOW = (() => {
        try {
            return window === window.top;
        } catch (e) {
            return false;
        }
    })();
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
    function isDarkModeEnabled() {
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

    // Save preference to all available stores (localStorage + extension storage)
    function saveDarkModePreference(enabled) {
        localStorage.setItem(DARK_MODE_KEY, String(enabled));
        var storage = getExtensionStorageArea();
        if (storage) {
            if (storage.api === 'browser') {
                storage.area.set({ [DARK_MODE_KEY]: enabled });
            } else {
                storage.area.set({ [DARK_MODE_KEY]: enabled }, function () { });
            }
        }
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

    function getCurrentUrlWithoutHash() {
        try {
            var u = new URL(window.location.href);
            u.hash = '';
            return u.toString();
        } catch (e) {
            return String(window.location.href || '').split('#')[0];
        }
    }

    function normalizeWhitespace(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function normalizeUrlPausePattern(pattern) {
        var value = String(pattern || '').trim();
        if (!value) return '';
        value = value.replace(/\s+/g, '');
        if (value.charAt(0) === '/') value = window.location.origin + value;
        value = value.split('#')[0];
        return value;
    }

    function isPauseProtectedUrl(url) {
        try {
            var parsed = new URL(String(url || getCurrentUrlWithoutHash()), window.location.origin);
            if (parsed.hostname !== 'learn.inside.dtu.dk') return false;
            return /^\/d2l\/home\/?$/i.test(parsed.pathname || '');
        } catch (e) {
            var value = String(url || '');
            return /learn\.inside\.dtu\.dk\/d2l\/home\/?$/i.test(value);
        }
    }

    function isPauseProtectedPattern(pattern) {
        var normalized = normalizeUrlPausePattern(pattern);
        if (!normalized) return false;
        if (!/learn\.inside\.dtu\.dk/i.test(normalized)) return false;
        return /learn\.inside\.dtu\.dk\/d2l\/home(?:\/)?(?:\?.*)?$/i.test(normalized);
    }

    function getUrlPausePatterns() {
        try {
            var raw = localStorage.getItem(URL_PAUSE_PATTERNS_KEY);
            if (!raw) return [];
            var parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            var out = [];
            var seen = Object.create(null);
            parsed.forEach(function (entry) {
                var normalized = normalizeUrlPausePattern(entry);
                if (!normalized || seen[normalized]) return;
                seen[normalized] = true;
                out.push(normalized);
            });
            return out;
        } catch (e) {
            return [];
        }
    }

    function saveUrlPausePatterns(patterns) {
        try {
            localStorage.setItem(URL_PAUSE_PATTERNS_KEY, JSON.stringify(patterns || []));
        } catch (e) { }
    }

    function wildcardPatternToRegExp(pattern) {
        var escaped = String(pattern || '').replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
        escaped = escaped.replace(/\*/g, '.*');
        return new RegExp('^' + escaped + '$', 'i');
    }

    function getMatchingUrlPausePatterns(url) {
        var currentUrl = String(url || getCurrentUrlWithoutHash());
        if (isPauseProtectedUrl(currentUrl)) return [];
        var patterns = getUrlPausePatterns();
        return patterns.filter(function (pattern) {
            try {
                return wildcardPatternToRegExp(pattern).test(currentUrl);
            } catch (e) {
                return false;
            }
        });
    }

    function buildSuggestedPausePatternsForCurrentUrl() {
        var suggestions = [];
        var seen = Object.create(null);
        function add(value) {
            var normalized = normalizeUrlPausePattern(value);
            if (!normalized || seen[normalized] || isPauseProtectedPattern(normalized)) return;
            seen[normalized] = true;
            suggestions.push(normalized);
        }

        var origin = window.location.origin;
        var pathname = window.location.pathname || '/';
        var search = window.location.search || '';
        add(origin + pathname + search);

        if (/^\/d2l\/home\/\d+\/?$/i.test(pathname)) {
            add(origin + pathname.replace(/\/?$/, '*'));
        }

        if (/^\/d2l\/lms\/[^/]+\//i.test(pathname)) {
            var parts = pathname.split('/').filter(Boolean);
            if (parts.length >= 4) {
                add(origin + '/' + parts.slice(0, 3).join('/') + '/*');
            }
        }

        var ou = '';
        try { ou = new URL(window.location.href).searchParams.get('ou') || ''; } catch (e) { ou = ''; }
        if (ou) {
            add(origin + '/d2l/*?ou=' + ou + '*');
            add(origin + pathname + '?ou=' + ou + '*');
            add(origin + '/d2l/home/' + ou + '*');
        }

        if (!suggestions.length) add(origin + pathname + '*');
        return suggestions;
    }

    function showUrlPausedBanner(matchingPatterns) {
        if (!IS_TOP_WINDOW) return;
        if (document.getElementById('dtu-after-dark-paused-banner')) return;

        var mount = document.documentElement || document.body;
        if (!mount) return;

        var wrap = document.createElement('div');
        wrap.id = 'dtu-after-dark-paused-banner';
        wrap.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;display:flex;align-items:center;gap:8px;'
            + 'padding:10px 12px;border-radius:10px;background:rgba(26,26,26,0.96);border:1px solid rgba(255,255,255,0.18);'
            + 'color:#f0f0f0;font:12px/1.35 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;box-shadow:0 10px 24px rgba(0,0,0,0.35);';

        var text = document.createElement('span');
        text.textContent = 'DTU After Dark is paused on this URL.';
        text.title = (matchingPatterns || []).join('\n');

        var resumeBtn = document.createElement('button');
        resumeBtn.type = 'button';
        resumeBtn.textContent = 'Resume';
        resumeBtn.style.cssText = 'appearance:none;border:1px solid rgba(255,255,255,0.18);background:#2d2d2d;color:#ffffff;'
            + 'padding:4px 10px;border-radius:999px;font:inherit;font-weight:700;cursor:pointer;';
        resumeBtn.addEventListener('click', function () {
            var allPatterns = getUrlPausePatterns();
            var remaining = allPatterns.filter(function (pattern) {
                return (matchingPatterns || []).indexOf(pattern) === -1;
            });
            saveUrlPausePatterns(remaining);
            window.location.reload();
        });

        wrap.appendChild(text);
        wrap.appendChild(resumeBtn);
        mount.appendChild(wrap);
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
                color: #ffffff !important;
            }

            .boxHeader h2,
            .box.mainContentPageTemplate .boxHeader h2,
            .box.widget .boxHeader h2,
            #afrapporteringWidget .boxHeader h2 {
                color: #ffffff !important;
                background-color: transparent !important;
            }

            /* Category titles in sidebar */
            h4.category__title,
            h4.category__title a {
                background-color: var(--dtu-ad-accent-deep) !important;
                background: var(--dtu-ad-accent-deep) !important;
                color: #ffffff !important;
            }

            h4.category__title:hover,
            h4.category__title:focus-within {
                background-color: var(--dtu-ad-accent-deep-hover) !important;
                background: var(--dtu-ad-accent-deep-hover) !important;
            }

            h4.category__title i,
            h4.category__title .toggle-category,
            h4.category__title .arc-menu-burger-expander {
                color: #ffffff !important;
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
                background-color: var(--dtu-ad-accent-deep) !important;
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
                color: #ffffff !important;
            }

            .group-menu__item-burger-expander {
                color: #ffffff !important;
            }

            /* Links (Generic content links) */
            a:not(.d2l-navigation-s-link),
            .groupLinksTable a:not(.arc-button) {
                color: var(--dtu-ad-accent) !important;
                text-decoration: none;
            }

            a:hover {
                color: var(--dtu-ad-accent-hover) !important;
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
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    // Always inject accent overrides (even in light mode)
    var _matchingUrlPausePatterns = getMatchingUrlPausePatterns();
    if (_matchingUrlPausePatterns.length) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                showUrlPausedBanner(_matchingUrlPausePatterns);
            }, { once: true });
        } else {
            showUrlPausedBanner(_matchingUrlPausePatterns);
        }
        return;
    }

    injectAccentOverrides();

    // Synchronous check â€” inject CSS immediately if enabled (runs at document_start)
    const darkModeEnabled = isDarkModeEnabled();
    if (darkModeEnabled) {
        injectDarkCSS();
        document.addEventListener('DOMContentLoaded', injectDarkCSS, { once: true });
    }

    function applyStoredDarkModeValue(storedEnabled) {
        if (storedEnabled === undefined) return;
        localStorage.setItem(DARK_MODE_KEY, String(storedEnabled));
        if (storedEnabled !== darkModeEnabled && window === window.top) {
            location.reload();
        }
    }

    // Async cross-origin check via extension storage (covers s.brightspace.com etc.)
    var extensionStorage = getExtensionStorageArea();
    if (extensionStorage) {
        if (extensionStorage.api === 'browser') {
            extensionStorage.area.get(DARK_MODE_KEY).then(function (result) {
                applyStoredDarkModeValue(result[DARK_MODE_KEY]);
            }).catch(function () { });
        } else {
            extensionStorage.area.get([DARK_MODE_KEY], function (result) {
                if (chrome && chrome.runtime && chrome.runtime.lastError) return;
                applyStoredDarkModeValue(result ? result[DARK_MODE_KEY] : undefined);
            });
        }
    }

    function subscribeDarkModeStorageChanges() {
        var onChanged = function (changes, areaName) {
            if (!IS_TOP_WINDOW) return;
            if (areaName && areaName !== 'local') return;
            if (!changes || !changes[DARK_MODE_KEY]) return;
            var next = changes[DARK_MODE_KEY].newValue;
            if (typeof next !== 'boolean') return;
            if (next !== darkModeEnabled) {
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

    // Dark mode toggle for light mode (re-enable): inserted via runFeatureChecks below

    // ===== FEATURE FLAGS (extension-wide) =====
    // These toggles live in extension storage so they apply across all DTU domains.
    const FEATURE_KURSER_GRADE_STATS_KEY = 'dtuAfterDarkFeatureKurserGradeStats';
    const FEATURE_TEXTBOOK_LINKS_KEY = 'dtuAfterDarkFeatureKurserTextbookLinker';
    const FEATURE_CONTENT_SHORTCUT_KEY = 'dtuAfterDarkFeatureContentShortcut';
    const FEATURE_CAMPUSNET_GPA_TOOLS_KEY = 'dtuAfterDarkFeatureCampusnetGpaTools';
    const FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY = 'dtuAfterDarkFeatureStudyplanExamCluster';
    const FEATURE_KURSER_COURSE_EVAL_KEY = 'dtuAfterDarkFeatureKurserCourseEval';
    const FEATURE_KURSER_ROOM_FINDER_KEY = 'dtuAfterDarkFeatureKurserRoomFinder';
    const FEATURE_KURSER_SCHEDULE_ANNOTATION_KEY = 'dtuAfterDarkFeatureKurserScheduleAnnotation';
    const FEATURE_KURSER_MYLINE_BADGES_KEY = 'dtuAfterDarkFeatureKurserMyLineBadges';
    const FEATURE_SMART_ROOM_LINKER_KEY = 'dtuAfterDarkFeatureSmartRoomLinker';
    const FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY = 'dtuAfterDarkFeatureLearnNavResourceLinks';
    const FEATURE_PARTICIPANT_INTEL_KEY = 'dtuAfterDarkFeatureParticipantIntel';
    const FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY = 'dtuAfterDarkFeatureParticipantIntelDemographics';
    const FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY = 'dtuAfterDarkFeatureParticipantIntelSharedHistory';
    const FEATURE_PARTICIPANT_INTEL_RETENTION_KEY = 'dtuAfterDarkFeatureParticipantIntelRetention';
    const FEATURE_LIBRARY_DROPDOWN_KEY = 'dtuAfterDarkFeatureLibraryDropdown';
    const FEATURE_LEARN_LESSONS_BULK_DOWNLOAD_KEY = 'dtuAfterDarkFeatureLearnLessonsBulkDownload';
    const FEATURE_LEARN_LESSONS_BULK_SINGLE_ZIP_KEY = 'dtuAfterDarkFeatureLearnLessonsBulkSingleZip';
    const PARTICIPANT_INTEL_STORAGE_KEY = 'dtuParticipantIntel';
    const PARTICIPANT_INTEL_MAX_STUDENTS = 5000;
    const PARTICIPANT_INTEL_MAX_RETENTION = 20;

    const FEATURE_FLAG_DEFAULTS = {
        [FEATURE_KURSER_GRADE_STATS_KEY]: true,
        [FEATURE_TEXTBOOK_LINKS_KEY]: true,
        [FEATURE_CONTENT_SHORTCUT_KEY]: true,
        [FEATURE_CAMPUSNET_GPA_TOOLS_KEY]: true,
        [FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY]: false,
        [FEATURE_KURSER_COURSE_EVAL_KEY]: true,
        [FEATURE_KURSER_ROOM_FINDER_KEY]: true,
        [FEATURE_KURSER_SCHEDULE_ANNOTATION_KEY]: true,
        [FEATURE_KURSER_MYLINE_BADGES_KEY]: true,
        [FEATURE_SMART_ROOM_LINKER_KEY]: true,
        [FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY]: true,
        [FEATURE_PARTICIPANT_INTEL_KEY]: false,
        [FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY]: false,
        [FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY]: false,
        [FEATURE_PARTICIPANT_INTEL_RETENTION_KEY]: false,
        [FEATURE_LIBRARY_DROPDOWN_KEY]: true,
        [FEATURE_LEARN_LESSONS_BULK_DOWNLOAD_KEY]: true,
        [FEATURE_LEARN_LESSONS_BULK_SINGLE_ZIP_KEY]: true
    };

    let _featureFlags = Object.assign({}, FEATURE_FLAG_DEFAULTS);
    let _featureFlagsLoaded = false;

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

    // ===== ACCENT THEME (extension-wide) =====
    // Stored in extension storage so it applies across all DTU domains.
    const ACCENT_THEME_KEY = 'dtuAfterDarkAccentThemeV1';
    const ACCENT_CUSTOM_HEX_KEY = 'dtuAfterDarkAccentCustomHexV1';
    const ACCENT_THEME_DEFAULT = 'dtu_red';
    const ACCENT_CUSTOM_DEFAULT = '#990000';
    const ACCENT_THEMES = {
        dtu_red: {
            label: 'DTU Corporate Red',
            accent: '#990000',
            accentHover: '#b30000',
            accentDeep: '#7d0000',
            accentDeepHover: '#990000',
            accentSoft: '#ff6b6b',
            accentBorder: '#7d0000'
        },
        dtu_blue: {
            label: 'DTU Blue',
            accent: '#2f3eea',
            accentHover: '#4d5af0',
            accentDeep: '#1f2bb5',
            accentDeepHover: '#2f3eea',
            accentSoft: '#9ca5ff',
            accentBorder: '#1f2bb5'
        },
        dtu_bright_green: {
            label: 'DTU Bright Green',
            accent: '#1fd082',
            accentHover: '#3ddd97',
            accentDeep: '#138a55',
            accentDeepHover: '#1aa66a',
            accentSoft: '#8cf0c5',
            accentBorder: '#12784b'
        },
        dtu_navy_blue: {
            label: 'DTU Navy Blue',
            accent: '#030f4f',
            accentHover: '#0c1e75',
            accentDeep: '#020a37',
            accentDeepHover: '#030f4f',
            accentSoft: '#7e8bc8',
            accentBorder: '#020a37'
        },
        dtu_yellow: {
            label: 'DTU Yellow',
            accent: '#f6d04d',
            accentHover: '#ffe073',
            accentDeep: '#c89f14',
            accentDeepHover: '#d8b12a',
            accentSoft: '#ffebad',
            accentBorder: '#b88f00'
        },
        dtu_orange: {
            label: 'DTU Orange',
            accent: '#fc7634',
            accentHover: '#ff914f',
            accentDeep: '#cc5519',
            accentDeepHover: '#e16526',
            accentSoft: '#ffc3a3',
            accentBorder: '#b84a13'
        },
        dtu_pink: {
            label: 'DTU Pink',
            accent: '#f7bbb1',
            accentHover: '#ffd0c8',
            accentDeep: '#c9857b',
            accentDeepHover: '#dea198',
            accentSoft: '#ffe7e2',
            accentBorder: '#b6736a'
        },
        dtu_grey: {
            label: 'DTU Grey',
            accent: '#dadada',
            accentHover: '#ececec',
            accentDeep: '#9f9f9f',
            accentDeepHover: '#b7b7b7',
            accentSoft: '#f4f4f4',
            accentBorder: '#8f8f8f'
        },
        dtu_red_secondary: {
            label: 'DTU Red',
            accent: '#e83f48',
            accentHover: '#ef636b',
            accentDeep: '#b3202a',
            accentDeepHover: '#cf2f38',
            accentSoft: '#ff9fa4',
            accentBorder: '#9e1d25'
        },
        dtu_green: {
            label: 'DTU Green',
            accent: '#008835',
            accentHover: '#12a24a',
            accentDeep: '#006125',
            accentDeepHover: '#00752d',
            accentSoft: '#79d39a',
            accentBorder: '#00531f'
        },
        dtu_purple: {
            label: 'DTU Purple',
            accent: '#79238e',
            accentHover: '#9440a8',
            accentDeep: '#5a1a6a',
            accentDeepHover: '#6b1f80',
            accentSoft: '#c78ed6',
            accentBorder: '#4f175d'
        },
        custom: {
            label: 'Custom',
            // Values are computed dynamically from ACCENT_CUSTOM_HEX_KEY.
            accent: '#990000',
            accentHover: '#b30000',
            accentDeep: '#7d0000',
            accentDeepHover: '#990000',
            accentSoft: '#ff6b6b',
            accentBorder: '#7d0000'
        }
    };
    // Official DTU palette presets + Custom (custom does not count as a preset).
    const ACCENT_THEME_ORDER = [
        'dtu_red',
        'dtu_blue',
        'dtu_navy_blue',
        'dtu_bright_green',
        'dtu_green',
        'dtu_yellow',
        'dtu_orange',
        'dtu_pink',
        'dtu_purple',
        'dtu_grey',
        'dtu_red_secondary',
        'custom'
    ];
    const STATUS_THEME = {
        info: '#2f3eea',
        success: '#008835',
        warning: '#f6d04d',
        warningStrong: '#fc7634',
        danger: '#e83f48'
    };

    let _accentThemeId = ACCENT_THEME_DEFAULT;
    let _accentThemeLoaded = false;
    let _accentThemeStorageSubscribed = false;
    let _accentCustomHex = ACCENT_CUSTOM_DEFAULT;

    function normalizeAccentThemeId(id) {
        var v = String(id || '').trim();
        var aliasMap = {
            // Backward compatibility for older preset ids.
            ocean_blue: 'dtu_blue',
            emerald_green: 'dtu_green',
            amber_orange: 'dtu_orange',
            royal_purple: 'dtu_purple',
            teal: 'dtu_bright_green'
        };
        if (Object.prototype.hasOwnProperty.call(aliasMap, v)) v = aliasMap[v];
        if (v && Object.prototype.hasOwnProperty.call(ACCENT_THEMES, v)) return v;
        return ACCENT_THEME_DEFAULT;
    }

    function parseHexColorToRgb(hex) {
        var s = String(hex || '').trim();
        if (!s) return null;
        if (s[0] === '#') s = s.slice(1);
        if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
        if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
        var r = parseInt(s.slice(0, 2), 16);
        var g = parseInt(s.slice(2, 4), 16);
        var b = parseInt(s.slice(4, 6), 16);
        return { r: r, g: g, b: b };
    }

    function clampByte(v) {
        var n = Math.round(Number(v || 0));
        if (n < 0) return 0;
        if (n > 255) return 255;
        return n;
    }

    function rgbToHex(rgb, fallback) {
        if (!rgb) return fallback || ACCENT_CUSTOM_DEFAULT;
        var r = clampByte(rgb.r), g = clampByte(rgb.g), b = clampByte(rgb.b);
        var s = (r << 16) | (g << 8) | b;
        var hex = s.toString(16).padStart(6, '0');
        return ('#' + hex).toLowerCase();
    }

    function mixRgb(a, b, t) {
        if (!a || !b) return a || b || { r: 198, g: 40, b: 40 };
        var tt = Math.max(0, Math.min(1, Number(t || 0)));
        return {
            r: a.r + (b.r - a.r) * tt,
            g: a.g + (b.g - a.g) * tt,
            b: a.b + (b.b - a.b) * tt
        };
    }

    function lightenHex(hex, amt, fallbackHex) {
        var rgb = parseHexColorToRgb(hex);
        if (!rgb) rgb = parseHexColorToRgb(fallbackHex || ACCENT_CUSTOM_DEFAULT);
        return rgbToHex(mixRgb(rgb, { r: 255, g: 255, b: 255 }, amt), fallbackHex || ACCENT_CUSTOM_DEFAULT);
    }

    function darkenHex(hex, amt, fallbackHex) {
        var rgb = parseHexColorToRgb(hex);
        if (!rgb) rgb = parseHexColorToRgb(fallbackHex || ACCENT_CUSTOM_DEFAULT);
        return rgbToHex(mixRgb(rgb, { r: 0, g: 0, b: 0 }, amt), fallbackHex || ACCENT_CUSTOM_DEFAULT);
    }

    function normalizeHexColor(hex, fallbackHex) {
        var rgb = parseHexColorToRgb(hex);
        if (!rgb) return (fallbackHex || null);
        return rgbToHex(rgb, fallbackHex || ACCENT_CUSTOM_DEFAULT);
    }

    function relativeLuminanceFromRgb(rgb) {
        if (!rgb) return 0;
        function toLinear(v) {
            var c = clampByte(v) / 255;
            return c <= 0.04045 ? (c / 12.92) : Math.pow((c + 0.055) / 1.055, 2.4);
        }
        var r = toLinear(rgb.r);
        var g = toLinear(rgb.g);
        var b = toLinear(rgb.b);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    // Pick black/white foreground for best contrast on a given background hex.
    function getContrastTextForHex(bgHex, lightText, darkText) {
        var light = lightText || '#ffffff';
        var dark = darkText || '#000000';
        var rgb = parseHexColorToRgb(bgHex);
        if (!rgb) return light;
        var lum = relativeLuminanceFromRgb(rgb);
        var contrastWithWhite = 1.05 / (lum + 0.05);
        var contrastWithBlack = (lum + 0.05) / 0.05;
        return contrastWithBlack >= contrastWithWhite ? dark : light;
    }

    function hexToRgbTriplet(hex, fallbackTriplet) {
        var rgb = parseHexColorToRgb(hex);
        if (!rgb) return fallbackTriplet || '198,40,40';
        return rgb.r + ',' + rgb.g + ',' + rgb.b;
    }

    function rgbaFromHex(hex, alpha, fallbackHex) {
        var rgb = parseHexColorToRgb(hex);
        if (!rgb) rgb = parseHexColorToRgb(fallbackHex || '#990000');
        if (!rgb) return 'rgba(153,0,0,' + String(alpha || 0) + ')';
        return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + String(alpha || 0) + ')';
    }

    function getAccentCustomHexFromLocalStorage() {
        try {
            return localStorage.getItem(ACCENT_CUSTOM_HEX_KEY);
        } catch (e) {
            return null;
        }
    }

    function computeCustomAccentTheme(hex) {
        var base = normalizeHexColor(hex, ACCENT_CUSTOM_DEFAULT) || ACCENT_CUSTOM_DEFAULT;
        // Pragmatic palette: strong primary, deeper bar, lighter "soft" for text on dark UI.
        // Keep it deterministic so it works cross-site with our existing CSS variables.
        return {
            label: 'Custom',
            accent: base,
            accentHover: lightenHex(base, 0.12, base),
            accentDeep: darkenHex(base, 0.38, base),
            accentDeepHover: darkenHex(base, 0.24, base),
            accentSoft: lightenHex(base, 0.45, base),
            accentBorder: darkenHex(base, 0.28, base)
        };
    }

    function getAccentThemeById(id) {
        var key = normalizeAccentThemeId(id);
        if (key === 'custom') return computeCustomAccentTheme(_accentCustomHex || ACCENT_CUSTOM_DEFAULT);
        return ACCENT_THEMES[key] || ACCENT_THEMES[ACCENT_THEME_DEFAULT];
    }

    function applyAccentThemeVars(theme) {
        var root = document.documentElement;
        if (!root || !root.style || !theme) return;
        var accentOn = getContrastTextForHex(theme.accent, '#ffffff', '#000000');

        root.style.setProperty('--dtu-ad-accent', theme.accent);
        root.style.setProperty('--dtu-ad-accent-hover', theme.accentHover);
        root.style.setProperty('--dtu-ad-accent-rgb', hexToRgbTriplet(theme.accent, '153,0,0'));
        root.style.setProperty('--dtu-ad-accent-on', accentOn);

        root.style.setProperty('--dtu-ad-accent-deep', theme.accentDeep);
        root.style.setProperty('--dtu-ad-accent-deep-hover', theme.accentDeepHover || theme.accentHover);
        root.style.setProperty('--dtu-ad-accent-deep-rgb', hexToRgbTriplet(theme.accentDeep, '125,0,0'));

        root.style.setProperty('--dtu-ad-accent-soft', theme.accentSoft || theme.accent);
        root.style.setProperty('--dtu-ad-accent-border', theme.accentBorder || theme.accentDeep);

        // Semantic status colors (stable DTU palette, independent of selected accent).
        root.style.setProperty('--dtu-ad-status-info', STATUS_THEME.info);
        root.style.setProperty('--dtu-ad-status-info-rgb', hexToRgbTriplet(STATUS_THEME.info, '47,62,234'));

        root.style.setProperty('--dtu-ad-status-success', STATUS_THEME.success);
        root.style.setProperty('--dtu-ad-status-success-rgb', hexToRgbTriplet(STATUS_THEME.success, '0,136,53'));

        root.style.setProperty('--dtu-ad-status-warning', STATUS_THEME.warning);
        root.style.setProperty('--dtu-ad-status-warning-rgb', hexToRgbTriplet(STATUS_THEME.warning, '246,208,77'));
        root.style.setProperty('--dtu-ad-status-warning-strong', STATUS_THEME.warningStrong);
        root.style.setProperty('--dtu-ad-status-warning-strong-rgb', hexToRgbTriplet(STATUS_THEME.warningStrong, '252,118,52'));

        root.style.setProperty('--dtu-ad-status-danger', STATUS_THEME.danger);
        root.style.setProperty('--dtu-ad-status-danger-rgb', hexToRgbTriplet(STATUS_THEME.danger, '232,63,72'));
    }

    function getAccentThemeIdFromLocalStorage() {
        try {
            return localStorage.getItem(ACCENT_THEME_KEY);
        } catch (e) {
            return null;
        }
    }

    function applyAfterDarkAdminMenuThemeVars(rootEl) {
        if (!rootEl || !rootEl.style) return;
        var isDark = !!darkModeEnabled;
        var theme = getAccentThemeById(_accentThemeId);
        var deep = theme.accentDeep || '#990000';
        var soft = theme.accentSoft || deep;

        rootEl.style.setProperty('--dtu-am-sidebar-bg', isDark ? '#2d2d2d' : '#f3f4f6');
        rootEl.style.setProperty('--dtu-am-content-bg', isDark ? '#2d2d2d' : '#ffffff');
        rootEl.style.setProperty('--dtu-am-text', isDark ? '#e0e0e0' : '#1f2937');
        rootEl.style.setProperty('--dtu-am-muted', isDark ? '#888' : '#6b7280');
        rootEl.style.setProperty('--dtu-am-border', isDark ? '#333' : '#e5e7eb');
        rootEl.style.setProperty('--dtu-am-hover', isDark ? '#333' : '#e5e7eb');
        rootEl.style.setProperty('--dtu-am-action', isDark ? '#93c5fd' : '#1565c0');
        rootEl.style.setProperty('--dtu-am-toggle-off', isDark ? '#555' : '#ccc');
        rootEl.style.setProperty('--dtu-am-height', '600px');

        rootEl.style.setProperty('--dtu-am-accent', deep);
        rootEl.style.setProperty('--dtu-am-active-text', isDark ? soft : deep);
        rootEl.style.setProperty('--dtu-am-active-bg', isDark ? rgbaFromHex(deep, 0.13) : rgbaFromHex(deep, 0.07));
        rootEl.style.setProperty('--dtu-am-input-bg', isDark ? '#1a1a1a' : '#f9fafb');
        rootEl.style.setProperty('--dtu-am-accent-ring', isDark ? rgbaFromHex(deep, 0.28) : rgbaFromHex(deep, 0.18));
    }

    function syncAccentThemeUi() {
        try {
            document.querySelectorAll('[data-dtu-accent-theme-select]').forEach(function (sel) {
                if (!sel) return;
                try { sel.value = _accentThemeId; } catch (e0) { }
            });
        } catch (e) { }

        try {
            document.querySelectorAll('[data-dtu-accent-custom-input]').forEach(function (inp) {
                if (!inp) return;
                try { inp.value = normalizeHexColor(_accentCustomHex, ACCENT_CUSTOM_DEFAULT) || ACCENT_CUSTOM_DEFAULT; } catch (e0) { }
                try { inp.style.display = (_accentThemeId === 'custom') ? '' : 'none'; } catch (e1) { }
            });
        } catch (e1) { }

        // Keep any open settings UI in sync.
        try {
            document.querySelectorAll('.dtu-am-root').forEach(function (rootEl) {
                try { applyAfterDarkAdminMenuThemeVars(rootEl); } catch (e1) { }
            });
        } catch (e2) { }
    }

    function setAccentCustomHex(nextHex, opts) {
        var normalized = normalizeHexColor(nextHex, null);
        if (!normalized) return;
        _accentCustomHex = normalized;
        try { localStorage.setItem(ACCENT_CUSTOM_HEX_KEY, normalized); } catch (e0) { }

        if (_accentThemeId === 'custom') {
            applyAccentThemeVars(getAccentThemeById('custom'));
            syncAccentThemeUi();
            try { replaceLogoImage(); } catch (eLogoCustom) { }
        }

        if (opts && opts.noStorage) return;
        storageLocalSet({ [ACCENT_CUSTOM_HEX_KEY]: normalized });
    }

    function setAccentThemeId(nextId, opts) {
        var id = normalizeAccentThemeId(nextId);
        _accentThemeId = id;
        try { localStorage.setItem(ACCENT_THEME_KEY, id); } catch (e0) { }

        applyAccentThemeVars(getAccentThemeById(id));
        syncAccentThemeUi();
        try { replaceLogoImage(); } catch (eLogoTheme) { }

        if (opts && opts.noStorage) return;
        storageLocalSet({ [ACCENT_THEME_KEY]: id });
    }

    function loadAccentTheme(cb) {
        if (_accentThemeLoaded) {
            if (cb) cb(_accentThemeId);
            return;
        }
        storageLocalGet({
            [ACCENT_THEME_KEY]: ACCENT_THEME_DEFAULT,
            [ACCENT_CUSTOM_HEX_KEY]: ACCENT_CUSTOM_DEFAULT
        }, function (result) {
            _accentThemeLoaded = true;
            var storedTheme = result ? result[ACCENT_THEME_KEY] : null;
            var storedCustom = result ? result[ACCENT_CUSTOM_HEX_KEY] : null;

            // Load custom first so selecting "custom" immediately uses the stored color.
            if (typeof storedCustom === 'string' && storedCustom) {
                var normCustom = normalizeHexColor(storedCustom, ACCENT_CUSTOM_DEFAULT) || ACCENT_CUSTOM_DEFAULT;
                _accentCustomHex = normCustom;
                try { localStorage.setItem(ACCENT_CUSTOM_HEX_KEY, normCustom); } catch (e0) { }
            }

            if (typeof storedTheme === 'string' && storedTheme) {
                var normalized = normalizeAccentThemeId(storedTheme);
                if (normalized !== _accentThemeId) setAccentThemeId(normalized, { noStorage: true });
                else {
                    // Re-apply in case custom changed and the current theme depends on it.
                    applyAccentThemeVars(getAccentThemeById(_accentThemeId));
                    syncAccentThemeUi();
                }
            } else {
                // Theme wasn't stored; still apply custom if we're currently on "custom".
                applyAccentThemeVars(getAccentThemeById(_accentThemeId));
                syncAccentThemeUi();
            }
            if (cb) cb(_accentThemeId);
        });
    }

    function subscribeAccentThemeStorageChanges() {
        if (_accentThemeStorageSubscribed) return;
        _accentThemeStorageSubscribed = true;

        var onChanged = function (changes, areaName) {
            if (areaName && areaName !== 'local') return;
            if (!changes) return;

            if (changes[ACCENT_THEME_KEY]) {
                var next = changes[ACCENT_THEME_KEY] ? changes[ACCENT_THEME_KEY].newValue : undefined;
                if (typeof next === 'string' && next) setAccentThemeId(next, { noStorage: true });
            }

            if (changes[ACCENT_CUSTOM_HEX_KEY]) {
                var nextHex = changes[ACCENT_CUSTOM_HEX_KEY] ? changes[ACCENT_CUSTOM_HEX_KEY].newValue : undefined;
                if (typeof nextHex === 'string' && nextHex) setAccentCustomHex(nextHex, { noStorage: true });
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
        } catch (e2) { }
    }

    // Apply sync value immediately for faster first paint.
    _accentThemeId = normalizeAccentThemeId(getAccentThemeIdFromLocalStorage());
    _accentCustomHex = normalizeHexColor(getAccentCustomHexFromLocalStorage(), ACCENT_CUSTOM_DEFAULT) || ACCENT_CUSTOM_DEFAULT;
    applyAccentThemeVars(getAccentThemeById(_accentThemeId));
    // Then sync from extension storage (cross-domain).
    loadAccentTheme(function () { });
    subscribeAccentThemeStorageChanges();

    function loadFeatureFlags(cb) {
        if (_featureFlagsLoaded) {
            if (cb) cb(_featureFlags);
            return;
        }
        try {
            var _twinCleanupStorage = getExtensionStorageArea();
            if (_twinCleanupStorage) {
                _twinCleanupStorage.area.remove(['dtuAfterDarkFeatureParticipantIntelSemesterTwins', 'dtuAfterDarkSemesterTwinPrefsV1']);
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
            _featureFlags = Object.assign({}, FEATURE_FLAG_DEFAULTS, flags || {});
            _featureFlagsLoaded = true;
            if (cb) cb(_featureFlags);
        });
    }

    function isFeatureFlagEnabled(key) {
        if (!key) return true;
        if (_featureFlagsLoaded) return !!_featureFlags[key];
        if (Object.prototype.hasOwnProperty.call(FEATURE_FLAG_DEFAULTS, key)) return !!FEATURE_FLAG_DEFAULTS[key];
        return true;
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
                if (IS_TOP_WINDOW) {
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
            color: #ffffff !important;
        }
        .d2l-count-badge-number > div {
            background: transparent !important;
            background-color: transparent !important;
            color: #ffffff !important;
        }
    `;

    function getResolvedAccentDeep() {
        var theme = getAccentThemeById(_accentThemeId);
        return (theme && theme.accentDeep) || '#7d0000';
    }

    function forceDtuRedBackgroundDark2(el) {
        if (!el || !el.style) return;
        var color = getResolvedAccentDeep();
        var styleAttr = (el.getAttribute && el.getAttribute('style')) || '';
        var currentBg = (styleAttr.match(/background-color\s*:\s*([^;!]+)/i) || [])[1];
        if (currentBg && currentBg.trim() === color) return;

        el.style.setProperty('background', color, 'important');
        el.style.setProperty('background-color', color, 'important');
        el.style.setProperty('background-image', 'none', 'important');
        el.style.setProperty('border-color', color, 'important');
        if (el.tagName === 'A') {
            el.style.setProperty('color', '#ffffff', 'important');
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
            isFeatureFlagEnabled: isFeatureFlagEnabled,
            isDarkModeEnabled: function () { return !!darkModeEnabled; },
            normalizeWhitespace: normalizeWhitespace,
            deepQueryAll: deepQueryAll,
            markExt: markExt,
            saveDarkModePreference: saveDarkModePreference,
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
            getAfterDarkAdminToolsList: getAfterDarkAdminToolsList,
            formatIsoDateForDisplay: formatIsoDateForDisplay,
            startOfTodayUtcTs: startOfTodayUtcTs,
            diffDaysUtc: diffDaysUtc
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
            return;
        }
        var api = getLibraryUiApi();
        if (api && typeof api.insertLibraryNavDropdown === 'function') api.insertLibraryNavDropdown();
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
                    studyplanExamCluster: FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY,
                    kurserCourseEval: FEATURE_KURSER_COURSE_EVAL_KEY,
                    kurserRoomFinder: FEATURE_KURSER_ROOM_FINDER_KEY,
                    smartRoomLinker: FEATURE_SMART_ROOM_LINKER_KEY,
                    kurserScheduleAnnotation: FEATURE_KURSER_SCHEDULE_ANNOTATION_KEY,
                    contentShortcut: FEATURE_CONTENT_SHORTCUT_KEY,
                    learnNavResourceLinks: FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY,
                    participantIntel: FEATURE_PARTICIPANT_INTEL_KEY,
                    kurserMyLineBadges: FEATURE_KURSER_MYLINE_BADGES_KEY,
                    libraryDropdown: FEATURE_LIBRARY_DROPDOWN_KEY,
                    learnLessonsBulkDownload: FEATURE_LEARN_LESSONS_BULK_DOWNLOAD_KEY,
                    learnLessonsBulkSingleZip: FEATURE_LEARN_LESSONS_BULK_SINGLE_ZIP_KEY,
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
            insertECTSProgressBar: insertECTSProgressBar,
            insertGPASimulator: insertGPASimulator,
            syncCampusnetActualGradeExclusionControls: syncCampusnetActualGradeExclusionControls,
            insertKurserGradeStats: insertKurserGradeStats,
            insertKurserTextbookLinks: insertKurserTextbookLinks,
            scheduleStudyplanExamCluster: scheduleStudyplanExamCluster,
            insertKurserCourseEvaluation: insertKurserCourseEvaluation,
            insertKurserRoomFinder: insertKurserRoomFinder,
            scheduleSmartRoomLinkerScan: scheduleSmartRoomLinkerScan,
            removeSmartRoomLinks: removeSmartRoomLinks,
            annotateKurserSchedulePlacement: annotateKurserSchedulePlacement,
            insertContentButtons: insertContentButtons,
            startContentButtonBootstrap: startContentButtonBootstrap,
            removeContentButtons: removeContentButtons,
            insertDTULearnNavResourceLinks: insertDTULearnNavResourceLinks,
            removeDTULearnNavResourceLinks: removeDTULearnNavResourceLinks,
            insertParticipantIntelligence: insertParticipantIntelligence,
            insertKurserMyLineBadge: insertKurserMyLineBadge,
            insertLibraryNavDropdown: insertLibraryNavDropdown,
            removeLibraryNavDropdown: removeLibraryNavDropdown,
            runLessonsBulkDownloadChecks: runLessonsBulkDownloadChecks,
            showContentShortcutOverridesModal: showContentShortcutOverridesModal,
            getAccentThemeId: function () { return _accentThemeId; },
            getAccentCustomHex: function () { return _accentCustomHex; },
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

    function showPausedUrlRulesModal(opts) {
        var api = getSettingsUiApi();
        if (api && typeof api.showPausedUrlRulesModal === 'function') api.showPausedUrlRulesModal(opts);
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

    // ===== LOGO REPLACEMENT =====
    // Replace the "My Home" logo with accent-colored DTU logos.
    // Uses SVG template styling:
    // - Dark mode: accent fill
    // - Light mode: accent fill + black outline border
    var _accentLogoSvgTemplate = null;
    var _accentLogoSvgLoadPromise = null;
    var _accentLogoDataUrlCache = {};

    function getResolvedAccent() {
        var theme = getAccentThemeById(_accentThemeId);
        return (theme && theme.accent) || '#990000';
    }

    function buildAccentLogoDataUrl(svgText, accentHex, lightModeOutline) {
        if (!svgText || !/<svg[\s>]/i.test(svgText)) return '';
        var cleanSvg = String(svgText).replace(/<\?xml[^>]*>\s*/i, '');
        var styleTag = '<style>path{fill:' + accentHex + ' !important;stroke:none !important;}</style>';
        cleanSvg = cleanSvg.replace(/<\/svg>\s*$/i, styleTag + '</svg>');
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cleanSvg);
    }

    function ensureAccentLogoSvgLoaded(svgUrl) {
        if (_accentLogoSvgTemplate || _accentLogoSvgLoadPromise) return;
        _accentLogoSvgLoadPromise = Promise.resolve()
            .then(function () { return fetch(svgUrl); })
            .then(function (resp) { return (resp && resp.ok) ? resp.text() : ''; })
            .then(function (text) {
                if (text && /<svg[\s>]/i.test(text)) {
                    _accentLogoSvgTemplate = text;
                }
            })
            .catch(function () { })
            .finally(function () {
                _accentLogoSvgLoadPromise = null;
                try { replaceLogoImage(); } catch (e0) { }
            });
    }

    function getAccentLogoSrc() {
        var accentHex = normalizeHexColor(getResolvedAccent(), '#990000') || '#990000';
        var modeKey = darkModeEnabled ? 'dark' : 'light';
        var cacheKey = modeKey + '|' + accentHex;
        if (Object.prototype.hasOwnProperty.call(_accentLogoDataUrlCache, cacheKey)) {
            return _accentLogoDataUrlCache[cacheKey];
        }

        var svgUrl = getExtensionUrl('images/Corp_White_Transparent.svg');
        if (_accentLogoSvgTemplate) {
            var dataUrl = buildAccentLogoDataUrl(_accentLogoSvgTemplate, accentHex, !darkModeEnabled);
            if (dataUrl) {
                _accentLogoDataUrlCache[cacheKey] = dataUrl;
                return dataUrl;
            }
        }

        ensureAccentLogoSvgLoaded(svgUrl);
        // Fallback while SVG template is loading.
        return svgUrl;
    }

    function replaceLogoImage(rootNode) {
        // Keep student.dtu.dk native identity/logo SVG untouched.
        // The student portal header uses its own branded inline SVG sprite.
        if (window.location.hostname === 'student.dtu.dk') return;

        const newSrc = getAccentLogoSrc();

        function replaceHostLogosInRoot(root) {
            if (!root || !root.querySelectorAll) return;
            const hostLogos = root.querySelectorAll(
                'd2l-labs-navigation-link-image.d2l-navigation-s-logo, '
                + 'd2l-labs-navigation-link-image[text="My Home"], '
                + 'd2l-labs-navigation-link-image[href*="/d2l/lp/ouHome/"]'
            );
            hostLogos.forEach(host => {
                if (!host.dataset.darkModeReplaced || host.getAttribute('src') !== newSrc) {
                    host.setAttribute('src', newSrc);
                    host.src = newSrc;
                    host.dataset.darkModeReplaced = 'true';
                }
            });
        }

        // Helper function to replace logo in a given root
        function replaceInRoot(root) {
            if (!root) return;
            const logoImages = root.querySelectorAll(
                'img[src*="/d2l/lp/navbars/"][src*="/theme/viewimage/"], '
                + 'img[alt="My Home"], '
                + 'img.websitelogoright__link-image, '
                + 'img[src*="dtulogo2_colour.png"], '
                + 'img[src*="dtulogo_colour.png"], '
                + 'img.header__logo, '
                + 'img[src*="DTULogo_Corp_Red_RGB.png"]'
            );
            logoImages.forEach(img => {
                // Re-apply if the host page swaps the src back after load.
                if (!img.dataset.darkModeReplaced || img.src !== newSrc) {
                    img.src = newSrc;
                    img.dataset.darkModeReplaced = 'true';
                    // Resize the sites.dtu.dk DTU logo
                    if (img.classList.contains('websitelogoright__link-image') || img.getAttribute('src')?.includes('dtulogo2_colour') || img.classList.contains('logo-img')) {
                        img.style.setProperty('max-height', '60px', 'important');
                        img.style.setProperty('width', 'auto', 'important');
                    }
                }
            });
        }

        const baseRoot = (rootNode && rootNode.nodeType === 1) ? rootNode : document;
        replaceHostLogosInRoot(baseRoot);
        replaceInRoot(baseRoot);

        // Check all shadow roots recursively
        function checkShadowRoots(root) {
            if (!root) return;
            const elements = root.querySelectorAll('*');
            elements.forEach(el => {
                if (el.shadowRoot) {
                    replaceHostLogosInRoot(el.shadowRoot);
                    replaceInRoot(el.shadowRoot);
                    checkShadowRoots(el.shadowRoot);
                }
            });
        }

        checkShadowRoots(baseRoot);
    }

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
        isContextCaptureDevToolEnabled: function () { return ENABLE_CONTEXT_CAPTURE_DEV_TOOL; }
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
            getSuppressHeavyWork: function () { return !!_suppressHeavyWork; },
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

    function insertECTSProgressBar() {
        var api = getCampusnetGpaApi();
        if (api && typeof api.insertECTSProgressBar === 'function') {
            api.insertECTSProgressBar();
        }
    }

    function insertGPASimulator() {
        var api = getCampusnetGpaApi();
        if (api && typeof api.insertGPASimulator === 'function') {
            api.insertGPASimulator();
        }
    }

    // ===== PARTICIPANT INTELLIGENCE (campusnet.dtu.dk) =====
    // Scrapes participant lists locally to build demographics, shared-history
    // badges and retention tracking.
    // All data stays in browser.storage.local -- nothing leaves the browser.
    var _participantIntelAnnotateTimer = null;

    function getParticipantIntelHostApi() {
        try { return globalThis.DTUAfterDarkParticipantIntelHost || null; } catch (e0) { return null; }
    }

    try {
        globalThis.DTUAfterDarkParticipantIntelHostDeps = {
            normalizeWhitespace: normalizeWhitespace
        };
    } catch (eParticipantIntelHostDeps) { }

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

    globalThis.DTUAfterDarkParticipantIntelCoreDeps = {
        normalizeWhitespace: normalizeWhitespace,
        normalizeIntelCourseCode: normalizeIntelCourseCode,
        normalizeIntelCourseSemester: normalizeIntelCourseSemester,
        isCampusnetLikelyAcademicCourse: isCampusnetLikelyAcademicCourse,
        getCampusnetUsersParticipantElements: getCampusnetUsersParticipantElements,
        getCampusnetCourseCodeFromPage: getCampusnetCourseCodeFromPage,
        getCampusnetSemesterFromPage: getCampusnetSemesterFromPage,
        getCampusnetCourseNameFromPage: getCampusnetCourseNameFromPage,
        normalizeProgramLabel: normalizeProgramLabel,
        isCampusnetParticipantPage: isCampusnetParticipantPage,
        storageLocalGet: storageLocalGet,
        storageLocalSet: storageLocalSet,
        participantIntelStorageKey: PARTICIPANT_INTEL_STORAGE_KEY,
        participantIntelMaxStudents: PARTICIPANT_INTEL_MAX_STUDENTS,
        insertParticipantIntelligence: function () { insertParticipantIntelligence(); }
    };

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

    function isCampusnetFrontpageDTU() {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.isCampusnetFrontpageDTU !== 'function') return false;
        return api.isCampusnetFrontpageDTU();
    }

    function isCampusnetGroupArchivePage() {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.isCampusnetGroupArchivePage !== 'function') return false;
        return api.isCampusnetGroupArchivePage();
    }

    function getCurrentDTUSemester() {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.getCurrentDTUSemester !== 'function') return '';
        return api.getCurrentDTUSemester();
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

    function isCampusnetNonCourseTitle(text) {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.isCampusnetNonCourseTitle !== 'function') return false;
        return api.isCampusnetNonCourseTitle(text);
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

    function getCampusnetParticipantCategoryMeta(labelRegex) {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.getCampusnetParticipantCategoryMeta !== 'function') return null;
        return api.getCampusnetParticipantCategoryMeta(labelRegex);
    }

    function getCampusnetUsersCategoryMeta() {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.getCampusnetUsersCategoryMeta !== 'function') return null;
        return api.getCampusnetUsersCategoryMeta();
    }

    function getCampusnetUsersCountFromPage() {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.getCampusnetUsersCountFromPage !== 'function') return null;
        return api.getCampusnetUsersCountFromPage();
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

    function getCampusnetUsersParticipantElements() {
        var api = getParticipantIntelHostApi();
        if (!api || typeof api.getCampusnetUsersParticipantElements !== 'function') return [];
        return api.getCampusnetUsersParticipantElements();
    }

    function ensureCampusnetParticipantsPageSizeMax() {
        var api = getParticipantIntelCoreApi();
        if (!api || typeof api.ensureCampusnetParticipantsPageSizeMax !== 'function') return false;
        return api.ensureCampusnetParticipantsPageSizeMax();
    }

    // -- Participant list parser --

    function parseParticipantList() {
        var api = getParticipantIntelCoreApi();
        if (!api || typeof api.parseParticipantList !== 'function') return [];
        return api.parseParticipantList();
    }

    // -- Data collection & self-detection --

    function collectParticipantData() {
        var api = getParticipantIntelCoreApi();
        if (!api || typeof api.collectParticipantData !== 'function') return;
        return api.collectParticipantData();
    }

    function detectAndStoreSelf(intel, participants, courseCode, semester) {
        var api = getParticipantIntelCoreApi();
        if (!api || typeof api.detectAndStoreSelf !== 'function') return;
        return api.detectAndStoreSelf(intel, participants, courseCode, semester);
    }

    // ---- Feature 1: Room Intelligence (Demographics) ----

    function getParticipantIntelUiApi() {
        return globalThis.DTUAfterDarkParticipantIntelUi || null;
    }

    globalThis.DTUAfterDarkParticipantIntelUiDeps = {
        isTopWindow: IS_TOP_WINDOW,
        isFeatureFlagEnabled: isFeatureFlagEnabled,
        featureParticipantIntelKey: FEATURE_PARTICIPANT_INTEL_KEY,
        featureParticipantIntelDemographicsKey: FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY,
        featureParticipantIntelSharedHistoryKey: FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY,
        featureParticipantIntelRetentionKey: FEATURE_PARTICIPANT_INTEL_RETENTION_KEY,
        isCampusnetParticipantPage: isCampusnetParticipantPage,
        isCampusnetProfilePage: isCampusnetProfilePage,
        isDarkMode: function () { return !!darkModeEnabled; },
        markExt: markExt,
        parseParticipantList: parseParticipantList,
        getCampusnetUsersCountFromPage: getCampusnetUsersCountFromPage,
        loadParticipantIntel: loadParticipantIntel,
        normalizeProgramLabel: normalizeProgramLabel,
        getCampusnetCourseCodeFromPage: getCampusnetCourseCodeFromPage,
        getCampusnetSemesterFromPage: getCampusnetSemesterFromPage,
        getCampusnetUsersParticipantElements: getCampusnetUsersParticipantElements,
        normalizeIntelCourseCode: normalizeIntelCourseCode,
        normalizeIntelCourseSemester: normalizeIntelCourseSemester,
        detectCampusnetSelfSNumberFromHeader: detectCampusnetSelfSNumberFromHeader,
        dedupeIntelCourseList: dedupeIntelCourseList,
        collapseCourseEntriesByCode: collapseCourseEntriesByCode,
        normalizeWhitespace: normalizeWhitespace,
        isCampusnetLikelyAcademicCourse: isCampusnetLikelyAcademicCourse,
        getCampusnetUsersAnchorElement: getCampusnetUsersAnchorElement,
        getCampusnetParticipantsListRoot: getCampusnetParticipantsListRoot,
        saveParticipantIntel: saveParticipantIntel,
        participantIntelMaxRetention: PARTICIPANT_INTEL_MAX_RETENTION
    };

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

    globalThis.DTUAfterDarkParticipantIntelBackfillDeps = {
        normalizeWhitespace: normalizeWhitespace,
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
        isDarkMode: function () { return !!darkModeEnabled; },
        participantIntelMaxStudents: PARTICIPANT_INTEL_MAX_STUDENTS
    };

    function fetchAndParseArchivedElements() {
        var api = getParticipantIntelBackfillApi();
        if (!api || typeof api.fetchAndParseArchivedElements !== 'function') {
            return Promise.reject(new Error('archive_backfill_unavailable'));
        }
        return api.fetchAndParseArchivedElements();
    }

    function runCampusnetArchiveBackfill(queue, intel) {
        var api = getParticipantIntelBackfillApi();
        if (!api || typeof api.runCampusnetArchiveBackfill !== 'function') return;
        return api.runCampusnetArchiveBackfill(queue, intel);
    }

    function stopCampusnetArchiveBackfill() {
        var api = getParticipantIntelBackfillApi();
        if (!api || typeof api.stopCampusnetArchiveBackfill !== 'function') return;
        return api.stopCampusnetArchiveBackfill();
    }

    function insertCampusnetArchiveBackfillWidget() {
        var api = getParticipantIntelBackfillApi();
        if (!api || typeof api.insertCampusnetArchiveBackfillWidget !== 'function') return;
        return api.insertCampusnetArchiveBackfillWidget();
    }

    function isCampusnetArchiveBackfillRunning() {
        var api = getParticipantIntelBackfillApi();
        return !!(api && typeof api.isRunning === 'function' && api.isRunning());
    }

    function getCampusnetArchiveBackfillProgress() {
        var api = getParticipantIntelBackfillApi();
        if (!api || typeof api.getProgress !== 'function') return null;
        return api.getProgress();
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
        if (!IS_TOP_WINDOW) return;
        if (!isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_KEY)) {
            if (_participantIntelAnnotateTimer) {
                clearTimeout(_participantIntelAnnotateTimer);
                _participantIntelAnnotateTimer = null;
            }
            document.querySelectorAll(
                '[data-dtu-participant-demographics],[data-dtu-shared-history],'
                + '[data-dtu-retention-indicator],[data-dtu-profile-history],[data-dtu-archive-backfill]'
            ).forEach(function (el) { el.remove(); });
            return;
        }

        var demographicsEnabled = isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY);
        var sharedHistoryEnabled = isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY);
        var retentionEnabled = isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_RETENTION_KEY);

        if (isCampusnetParticipantPage()) {
            // Fast cleanup when sub-features are toggled off.
            if (!demographicsEnabled) {
                var oldDemo = document.querySelector('[data-dtu-participant-demographics]');
                if (oldDemo) oldDemo.remove();
            }
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

            // Prefer showing all users on one page (max page size is typically 1500).
            // This makes composition + history badges accurate without requiring manual pagination.
            if (demographicsEnabled || sharedHistoryEnabled) {
                if (ensureCampusnetParticipantsPageSizeMax()) {
                    // Retention uses the header "Users (N)" count, so it can still run immediately.
                    if (retentionEnabled) recordRetentionSnapshot();
                    return;
                }
            }

            // If we just requested a larger page size, give CampusNet a moment to refresh the list
            // before we scrape (avoids storing/visualizing an incomplete first page).
            var pageSizeAdjustTs = 0;
            try {
                var coreApi = getParticipantIntelCoreApi();
                if (coreApi && typeof coreApi.getParticipantIntelPageSizeAdjustTs === 'function') {
                    pageSizeAdjustTs = Number(coreApi.getParticipantIntelPageSizeAdjustTs()) || 0;
                }
            } catch (ePageTs) { pageSizeAdjustTs = 0; }
            if ((demographicsEnabled || sharedHistoryEnabled)
                && pageSizeAdjustTs && (Date.now() - pageSizeAdjustTs) < 5500) {
                var totalUsers = getCampusnetUsersCountFromPage();
                var loadedUsers = getCampusnetUsersParticipantElements().length;
                var likelyComplete = false;
                if (totalUsers && loadedUsers) {
                    if (loadedUsers >= totalUsers) likelyComplete = true;
                    else if (totalUsers > 1500 && loadedUsers >= 1500) likelyComplete = true;
                }
                if (!likelyComplete) {
                    if (retentionEnabled) recordRetentionSnapshot();
                    return;
                }
                try {
                    var coreApi2 = getParticipantIntelCoreApi();
                    if (coreApi2 && typeof coreApi2.resetParticipantIntelPageSizeAdjustTs === 'function') {
                        coreApi2.resetParticipantIntelPageSizeAdjustTs();
                    }
                } catch (ePageReset) { }
            }

            if (sharedHistoryEnabled) collectParticipantData();
            if (demographicsEnabled) insertParticipantDemographics();
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

    // ===== CONTENT SHORTCUT BUTTON =====
    // Adds a small "Content" button to each course card on the homepage
    // that links directly to /d2l/le/lessons/{courseId}

    // Recursively find all elements matching a selector, traversing shadow roots
    function deepQueryAll(selector, root) {
        const results = [];
        if (!root) return results;
        if (root.matches && root.matches(selector)) {
            results.push(root);
        }

        const pendingRoots = [root.shadowRoot || root];
        while (pendingRoots.length > 0) {
            const searchRoot = pendingRoots.pop();
            if (!searchRoot || !searchRoot.querySelectorAll) continue;

            searchRoot.querySelectorAll(selector).forEach(match => results.push(match));

            const walker = document.createTreeWalker(searchRoot, NodeFilter.SHOW_ELEMENT, null);
            let el = walker.nextNode();
            while (el) {
                if (el.shadowRoot) {
                    pendingRoots.push(el.shadowRoot);
                }
                el = walker.nextNode();
            }
        }

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

    function isDTULearnHomepage() {
        return window.location.hostname === 'learn.inside.dtu.dk'
            && (
                /^\/d2l\/home\/?$/.test(window.location.pathname)
                || /^\/d2l\/lp\/ouHome\/defaultHome\.d2l\/?$/i.test(window.location.pathname)
            );
    }

    function isDTULearnLegacyHeavyCourseToolPage() {
        return window.location.hostname === 'learn.inside.dtu.dk'
            && /^\/d2l\/lms\/(dropbox|classlist|group|news)\//i.test(window.location.pathname);
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

    function insertBusToggle() {
        var api = getBusApi();
        if (api && typeof api.insertBusToggle === 'function') api.insertBusToggle();
    }

    const DEADLINES_ENABLED_KEY = 'dtuDarkModeDeadlinesEnabled';

    function isDeadlinesEnabled() {
        const stored = localStorage.getItem(DEADLINES_ENABLED_KEY);
        return stored === null ? true : stored === 'true';
    }

    const SEARCH_WIDGET_ENABLED_KEY = 'dtuDarkModeSearchWidgetEnabled';

    function isSearchWidgetEnabled() {
        const stored = localStorage.getItem(SEARCH_WIDGET_ENABLED_KEY);
        return stored === null ? true : stored === 'true';
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

    // ISBN regex: matches "ISBN: 978-...", "ISBN-13: ...", "ISBN:978...", etc.
    const ISBN_REGEX = /\bISBN[-\s]?(?:1[03])?[\s:]*\s*([\dXx][\d\s-]{8,}[\dXx])\b/gi;
    // Bare ISBN-13 starting with 978/979 without "ISBN" prefix
    const BARE_ISBN13_REGEX = /\b(97[89][\d-]{10,})\b/g;
    // Keywords that signal a book reference nearby (English + Danish)
    const BOOK_KEYWORDS = /\b(textbook|text\s*book|course\s*book|required\s*reading|recommended\s*reading|suggested\s*reading|book|reading\s*list|literature|edition|ed\.|bog|l\u00e6rebog|kursus\s*bog|anbefalet\s*l\u00e6sning|litteratur|pensum)\b/i;
    // Quoted Title Case strings (supports straight and curly quotes)
    const QUOTED_TITLE_REGEX = /["\u201C\u201D]([A-Z][A-Za-z]*(?:\s+(?:[A-Z][A-Za-z]*|and|the|of|in|for|to|a|an|with|&)){2,})["\u201C\u201D]/g;

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

    function markExt(el) {
        if (el && el.setAttribute) el.setAttribute('data-dtu-ext', '1');
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
            createMazemapSmartLink: createMazemapSmartLink,
            featureKurserGradeStatsKey: FEATURE_KURSER_GRADE_STATS_KEY,
            featureKurserMylineBadgesKey: FEATURE_KURSER_MYLINE_BADGES_KEY,
            featureKurserRoomFinderKey: FEATURE_KURSER_ROOM_FINDER_KEY,
            featureKurserScheduleAnnotationKey: FEATURE_KURSER_SCHEDULE_ANNOTATION_KEY,
            featureSmartRoomLinkerKey: FEATURE_SMART_ROOM_LINKER_KEY
        };
    } catch (eKurserWidgetsDeps) { }

    function insertKurserMyLineBadge() {
        var api = getKurserWidgetsApi();
        if (api && typeof api.insertKurserMyLineBadge === 'function') {
            api.insertKurserMyLineBadge();
        }
    }

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
            linkColor: isDark ? 'var(--dtu-ad-accent-soft)' : getResolvedAccentDeep(),
            accentText: isDark ? 'var(--dtu-ad-accent-soft)' : getResolvedAccentDeep()
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

    function createMazemapSmartLink(building, room, labelText) {
        var api = getSmartRoomLinkerApi();
        if (api && typeof api.createMazemapSmartLink === 'function') {
            return api.createMazemapSmartLink(building, room, labelText);
        }
        return null;
    }

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

    /* ===================================================================
     *  Room Finder for kurser.dtu.dk
     *  Shows building / room data from bundled TimeEdit scrape.
     *  Data file: data/rooms_spring_2026.json
     *  TODO (May 2026): Re-scrape TimeEdit for fall semester & update JSON.
     * =================================================================== */

    function insertKurserRoomFinder() {
        var api = getKurserWidgetsApi();
        if (api && typeof api.insertKurserRoomFinder === 'function') {
            api.insertKurserRoomFinder();
        }
    }

    function annotateKurserSchedulePlacement() {
        var api = getKurserWidgetsApi();
        if (api && typeof api.annotateKurserSchedulePlacement === 'function') {
            api.annotateKurserSchedulePlacement();
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
        getAccentThemeId: function () { return _accentThemeId; }
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

    // ===== EXAM CLUSTER OUTLOOK (STUDYPLAN) =====
    // Study Planner exam parsing/timeline runtime now lives in darkmode.studyplan-runtime.js.

    function getStudyplanRuntimeApi() {
        try { return globalThis.DTUAfterDarkStudyplanRuntime || null; } catch (e0) { return null; }
    }

    try {
        globalThis.DTUAfterDarkStudyplanRuntimeDeps = {
            isTopWindow: function () { return IS_TOP_WINDOW; },
            isDarkMode: function () { return !!darkModeEnabled; },
            markExt: markExt,
            sendRuntimeMessage: sendRuntimeMessage,
            isFeatureFlagEnabled: isFeatureFlagEnabled,
            featureStudyplanExamClusterKey: FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY
        };
    } catch (eStudyplanRuntimeDeps) { }

    function normalizeExamClusterText(text) {
        var api = getStudyplanRuntimeApi();
        if (!api || typeof api.normalizeExamClusterText !== 'function') return (text || '').replace(/ /g, ' ').replace(/s+/g, ' ').trim();
        return api.normalizeExamClusterText(text);
    }

    function getStoredStudyplanExamChoices() {
        var api = getStudyplanRuntimeApi();
        if (!api || typeof api.getStoredStudyplanExamChoices !== 'function') return {};
        return api.getStoredStudyplanExamChoices();
    }

    function saveStoredStudyplanExamChoices(choices) {
        var api = getStudyplanRuntimeApi();
        if (api && typeof api.saveStoredStudyplanExamChoices === 'function') api.saveStoredStudyplanExamChoices(choices);
    }

    function buildStudyplanExamChoiceCourseKey(course) {
        var api = getStudyplanRuntimeApi();
        if (!api || typeof api.buildStudyplanExamChoiceCourseKey !== 'function') return '';
        return api.buildStudyplanExamChoiceCourseKey(course);
    }

    function buildStudyplanExamChoiceOptionKey(candidate) {
        var api = getStudyplanRuntimeApi();
        if (!api || typeof api.buildStudyplanExamChoiceOptionKey !== 'function') return '';
        return api.buildStudyplanExamChoiceOptionKey(candidate);
    }

    function setStoredStudyplanExamChoice(courseKey, optionKey) {
        var api = getStudyplanRuntimeApi();
        if (api && typeof api.setStoredStudyplanExamChoice === 'function') api.setStoredStudyplanExamChoice(courseKey, optionKey);
    }

    function getStoredStudyplanExamTimelineOverrides() {
        var api = getStudyplanRuntimeApi();
        if (!api || typeof api.getStoredStudyplanExamTimelineOverrides !== 'function') return { edits: {}, deleted: {}, custom: [] };
        return api.getStoredStudyplanExamTimelineOverrides();
    }

    function saveStoredStudyplanExamTimelineOverrides(overrides) {
        var api = getStudyplanRuntimeApi();
        if (api && typeof api.saveStoredStudyplanExamTimelineOverrides === 'function') api.saveStoredStudyplanExamTimelineOverrides(overrides);
    }

    function buildStudyplanExamTimelineBaseKey(item) {
        var api = getStudyplanRuntimeApi();
        if (!api || typeof api.buildStudyplanExamTimelineBaseKey !== 'function') return '';
        return api.buildStudyplanExamTimelineBaseKey(item);
    }

    function buildStudyplanExamTimelineCustomId() {
        var api = getStudyplanRuntimeApi();
        if (!api || typeof api.buildStudyplanExamTimelineCustomId !== 'function') return '';
        return api.buildStudyplanExamTimelineCustomId();
    }

    function formatIsoDateForDisplay(iso) {
        var api = getStudyplanRuntimeApi();
        if (!api || typeof api.formatIsoDateForDisplay !== 'function') return iso || '';
        return api.formatIsoDateForDisplay(iso);
    }

    function formatStudyplanExamEditDate(iso) {
        var api = getStudyplanRuntimeApi();
        if (!api || typeof api.formatStudyplanExamEditDate !== 'function') return '';
        return api.formatStudyplanExamEditDate(iso);
    }

    function parseStudyplanExamEditDate(text) {
        var api = getStudyplanRuntimeApi();
        if (!api || typeof api.parseStudyplanExamEditDate !== 'function') return '';
        return api.parseStudyplanExamEditDate(text);
    }

    function parseIsoToUtcTs(iso) {
        var api = getStudyplanRuntimeApi();
        if (!api || typeof api.parseIsoToUtcTs !== 'function') return null;
        return api.parseIsoToUtcTs(iso);
    }

    function startOfTodayUtcTs() {
        var api = getStudyplanRuntimeApi();
        if (!api || typeof api.startOfTodayUtcTs !== 'function') {
            var now = new Date();
            return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
        }
        return api.startOfTodayUtcTs();
    }

    function diffDaysUtc(fromTs, toTs) {
        var api = getStudyplanRuntimeApi();
        if (!api || typeof api.diffDaysUtc !== 'function') return Math.round((toTs - fromTs) / (24 * 60 * 60 * 1000));
        return api.diffDaysUtc(fromTs, toTs);
    }

    function buildExamClusterWarnings(mapped) {
        var api = getStudyplanRuntimeApi();
        if (!api || typeof api.buildExamClusterWarnings !== 'function') return [];
        return api.buildExamClusterWarnings(mapped);
    }

    function summarizeExamClusterWarnings(warnings) {
        var api = getStudyplanRuntimeApi();
        if (!api || typeof api.summarizeExamClusterWarnings !== 'function') return { level: null, sameDay: 0, oneDay: 0, dense: null };
        return api.summarizeExamClusterWarnings(warnings);
    }

    function clearNodeChildren(node) {
        var api = getStudyplanRuntimeApi();
        if (api && typeof api.clearNodeChildren === 'function') return api.clearNodeChildren(node);
        while (node && node.firstChild) node.removeChild(node.firstChild);
    }

    function ensureStudyplanExamClusterContainer() {
        var api = getStudyplanRuntimeApi();
        if (!api || typeof api.ensureStudyplanExamClusterContainer !== 'function') return null;
        return api.ensureStudyplanExamClusterContainer();
    }

    function renderExamClusterStatus(body, text, isWarn) {
        var api = getStudyplanRuntimeApi();
        if (api && typeof api.renderExamClusterStatus === 'function') return api.renderExamClusterStatus(body, text, isWarn);
    }

    function formatExamClusterShortDate(ts) {
        var api = getStudyplanRuntimeApi();
        if (!api || typeof api.formatExamClusterShortDate !== 'function') return '';
        return api.formatExamClusterShortDate(ts);
    }

    function getStudyplanExamsApi() {
        return globalThis.DTUAfterDarkStudyplanExamsUi || null;
    }

    globalThis.DTUAfterDarkStudyplanExamsDeps = {
        isTopWindow: IS_TOP_WINDOW,
        isDarkMode: function () { return !!darkModeEnabled; },
        markExt: markExt,
        formatExamClusterShortDate: formatExamClusterShortDate,
        buildStudyplanExamChoiceOptionKey: buildStudyplanExamChoiceOptionKey,
        setStoredStudyplanExamChoice: setStoredStudyplanExamChoice,
        getStoredStudyplanExamTimelineOverrides: getStoredStudyplanExamTimelineOverrides,
        saveStoredStudyplanExamTimelineOverrides: saveStoredStudyplanExamTimelineOverrides,
        formatStudyplanExamEditDate: formatStudyplanExamEditDate,
        parseStudyplanExamEditDate: parseStudyplanExamEditDate,
        parseIsoToUtcTs: parseIsoToUtcTs,
        buildStudyplanExamTimelineBaseKey: buildStudyplanExamTimelineBaseKey,
        buildStudyplanExamTimelineCustomId: buildStudyplanExamTimelineCustomId,
        buildExamClusterWarnings: buildExamClusterWarnings,
        summarizeExamClusterWarnings: summarizeExamClusterWarnings,
        clearNodeChildren: clearNodeChildren,
        ensureStudyplanExamClusterContainer: ensureStudyplanExamClusterContainer,
        renderExamClusterStatus: renderExamClusterStatus,
        requestRender: function () { insertStudyplanExamCluster(); },
        getState: function () {
            var api = getStudyplanRuntimeApi();
            if (!api || typeof api.getState !== 'function') return { choiceEditorOpen: false, lastRenderedSig: '' };
            return api.getState() || { choiceEditorOpen: false, lastRenderedSig: '' };
        },
        setState: function (patch) {
            var api = getStudyplanRuntimeApi();
            if (api && typeof api.setState === 'function') api.setState(patch);
        }
    };

    function removeStudyplanExamEditorModal() {
        var api = getStudyplanRuntimeApi();
        if (api && typeof api.removeStudyplanExamEditorModal === 'function') return api.removeStudyplanExamEditorModal();
        var existing = document.querySelector('.dtu-studyplan-exam-editor-modal');
        if (existing) existing.remove();
    }

    function renderStudyplanExamCluster(courses, mapped, baseMapped, response, errorText, choicePrompts, allChoicePrompts) {
        var api = getStudyplanExamsApi();
        if (!api || typeof api.renderStudyplanExamCluster !== 'function') return;
        return api.renderStudyplanExamCluster(courses, mapped, baseMapped, response, errorText, choicePrompts, allChoicePrompts);
    }

    function injectGradeCountdowns(mapped) {
        var api = getStudyplanExamsApi();
        if (!api || typeof api.injectGradeCountdowns !== 'function') return;
        return api.injectGradeCountdowns(mapped);
    }

    function insertStudyplanExamCluster() {
        var api = getStudyplanRuntimeApi();
        if (api && typeof api.insertStudyplanExamCluster === 'function') return api.insertStudyplanExamCluster();
    }

    function scheduleStudyplanExamCluster(delayMs) {
        var api = getStudyplanRuntimeApi();
        if (api && typeof api.scheduleStudyplanExamCluster === 'function') return api.scheduleStudyplanExamCluster(delayMs);
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
        getDarkBorder: getDarkBorder
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
        if (!isFeatureFlagEnabled(FEATURE_TEXTBOOK_LINKS_KEY)) return;
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
            insertECTSProgressBar();
            insertGPASimulator();
            syncCampusnetActualGradeExclusionControls();
            insertParticipantIntelligence();
        }
        if (host === 'studieplan.dtu.dk') {
            scheduleStudyplanExamCluster(refreshBus ? 260 : 760);
        }
        if (host === 'kurser.dtu.dk') {
            insertKurserGradeStats();
            insertKurserCourseEvaluation();
            insertKurserRoomFinder();
            annotateKurserSchedulePlacement();
            insertKurserMyLineBadge();
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
                done = !!document.querySelector('[data-dtu-exam-cluster]');
            } else if (host === 'kurser.dtu.dk') {
                done = !!document.querySelector('[data-dtu-grade-stats]')
                    || !!document.querySelector('[data-dtu-course-eval]')
                    || !!document.querySelector('[data-dtu-room-finder]')
                    || !!document.querySelector('[data-dtu-textbook-linker]')
                    || !!document.querySelector('[data-dtu-textbook-linker-bar-host]')
                    || !!document.querySelector('[data-dtu-myline-badge]');
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
                scheduleStudyplanExamCluster(110);
                // Studieplan can re-render its header/logo after initial load; re-apply logo override.
                try { replaceLogoImage(); } catch (eLogo1) { }
                return;
            }
            if (host === 'kurser.dtu.dk') {
                insertKurserGradeStats();
                insertKurserCourseEvaluation();
                insertKurserRoomFinder();
                annotateKurserSchedulePlacement();
                insertKurserMyLineBadge();
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
        if (node.hasAttribute && node.hasAttribute('data-dtu-ext')) return;
        if (node.closest && node.closest('[data-dtu-ext]')) return;
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
