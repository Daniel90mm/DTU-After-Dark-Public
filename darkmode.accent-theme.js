(function () {
    'use strict';

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

    // Text on accent bars/headers/badges: DTU's look is white text, so keep white
    // unless it drops below 4:1, then use black if that reads better. Keeps Orange
    // and Bright Green white (4.3/4.4) and flips Yellow, Grey and Pink (2.5 to 3.0).
    function getAccentBarTextForHex(bgHex) {
        var rgb = parseHexColorToRgb(bgHex);
        if (!rgb) return '#ffffff';
        var lum = relativeLuminanceFromRgb(rgb);
        var contrastWithWhite = 1.05 / (lum + 0.05);
        var contrastWithBlack = (lum + 0.05) / 0.05;
        if (contrastWithWhite >= 4 || contrastWithWhite >= contrastWithBlack) return '#ffffff';
        return '#000000';
    }

    // Accent used as text (links, course codes, counters): nudge it toward black
    // on light pages or toward white on dark ones until it reaches 4.5:1, so light
    // presets like Yellow stay readable. Colours that already pass are unchanged.
    function getReadableAccentTextHex(hex, pageBgHex) {
        var rgb = parseHexColorToRgb(hex);
        var bg = parseHexColorToRgb(pageBgHex);
        if (!rgb || !bg) return normalizeHexColor(hex, ACCENT_CUSTOM_DEFAULT) || ACCENT_CUSTOM_DEFAULT;
        var bgLum = relativeLuminanceFromRgb(bg);
        var toward = bgLum > 0.18 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
        function ratio(c) {
            var l = relativeLuminanceFromRgb(c);
            return (Math.max(l, bgLum) + 0.05) / (Math.min(l, bgLum) + 0.05);
        }
        for (var step = 0; step <= 20; step++) {
            var candidate = mixRgb(rgb, toward, step * 0.05);
            candidate = { r: clampByte(candidate.r), g: clampByte(candidate.g), b: clampByte(candidate.b) };
            if (ratio(candidate) >= 4.5) return rgbToHex(candidate);
        }
        return rgbToHex(toward);
    }

    // Accent for marks and labels drawn on a fixed surface, whichever mode is active. The
    // accent itself when it already reads (4.5:1); otherwise the preset's own shade for that
    // surface (soft on dark, deep on light), nudged to 4.5:1. Nudging a dark accent like
    // Navy straight toward white would drain it to grey instead.
    function getAccentForSurfaceHex(theme, surfaceHex) {
        var rgb = parseHexColorToRgb(theme && theme.accent);
        var bg = parseHexColorToRgb(surfaceHex);
        if (rgb && bg) {
            var l1 = relativeLuminanceFromRgb(rgb);
            var l2 = relativeLuminanceFromRgb(bg);
            if ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) >= 4.5) return normalizeHexColor(theme.accent, theme.accent);
        }
        var darkSurface = bg ? relativeLuminanceFromRgb(bg) <= 0.18 : true;
        var shade = darkSurface ? (theme && theme.accentSoft) : (theme && theme.accentDeep);
        return getReadableAccentTextHex(shade || (theme && theme.accent), surfaceHex);
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

    // The soft shade is text on the dark panels (#2d2d2d): lighten past 45% until it reads at 4.5:1.
    function readableSoftHex(base) {
        var panel = relativeLuminanceFromRgb(parseHexColorToRgb('#2d2d2d'));
        for (var amt = 0.45; amt < 1; amt += 0.05) {
            var soft = lightenHex(base, amt, base);
            if ((relativeLuminanceFromRgb(parseHexColorToRgb(soft)) + 0.05) / (panel + 0.05) >= 4.5) return soft;
        }
        return lightenHex(base, 1, base);
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
            accentSoft: readableSoftHex(base),
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
        root.style.setProperty('--dtu-ad-accent-deep-on', getAccentBarTextForHex(theme.accentDeep));
        var textPageBg = isDarkModeEnabled() ? '#2d2d2d' : '#ffffff';
        root.style.setProperty('--dtu-ad-accent-text', getReadableAccentTextHex(theme.accent, textPageBg));
        root.style.setProperty('--dtu-ad-accent-text-hover', getReadableAccentTextHex(theme.accentHover || theme.accent, textPageBg));
        // Light-mode links on CampusNet/kurser use the deep shade; keep it, made readable on white.
        root.style.setProperty('--dtu-ad-accent-deep-text', getReadableAccentTextHex(theme.accentDeep, '#ffffff'));
        // Hover keeps the resting text colour so text never flips under the mouse.
        root.style.setProperty('--dtu-ad-accent-deep-hover-on', getAccentBarTextForHex(theme.accentDeep));

        root.style.setProperty('--dtu-ad-accent-soft', theme.accentSoft || theme.accent);
        // Independent of the current mode, so a widget can pick by its own data-theme.
        root.style.setProperty('--dtu-ad-accent-mark-dark', getAccentForSurfaceHex(theme, '#2d2d2d'));
        root.style.setProperty('--dtu-ad-accent-mark-light', getAccentForSurfaceHex(theme, '#ffffff'));
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
        var isDark = !!isDarkModeEnabled();
        var theme = getAccentThemeById(_accentThemeId);
        var deep = theme.accentDeep || '#990000';
        var soft = theme.accentSoft || deep;

        rootEl.style.setProperty('--dtu-am-sidebar-bg', isDark ? '#2d2d2d' : '#f3f4f6');
        rootEl.style.setProperty('--dtu-am-content-bg', isDark ? '#2d2d2d' : '#ffffff');
        rootEl.style.setProperty('--dtu-am-text', isDark ? '#e0e0e0' : '#1f2937');
        rootEl.style.setProperty('--dtu-am-muted', isDark ? '#a3a3a3' : '#5f6673');
        rootEl.style.setProperty('--dtu-am-border', isDark ? '#333' : '#e5e7eb');
        rootEl.style.setProperty('--dtu-am-hover', isDark ? '#333' : '#e5e7eb');
        rootEl.style.setProperty('--dtu-am-action', isDark ? '#93c5fd' : '#1565c0');
        rootEl.style.setProperty('--dtu-am-toggle-off', isDark ? '#555' : '#ccc');
        rootEl.style.setProperty('--dtu-am-height', '600px');

        rootEl.style.setProperty('--dtu-am-accent', deep);
        rootEl.style.setProperty('--dtu-am-active-text', isDark ? soft : getReadableAccentTextHex(deep, '#f3f4f6'));
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

    function getResolvedAccentDeep() {
        var theme = getAccentThemeById(_accentThemeId);
        return (theme && theme.accentDeep) || '#7d0000';
    }

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
        var modeKey = isDarkModeEnabled() ? 'dark' : 'light';
        var cacheKey = modeKey + '|' + accentHex;
        if (Object.prototype.hasOwnProperty.call(_accentLogoDataUrlCache, cacheKey)) {
            return _accentLogoDataUrlCache[cacheKey];
        }

        var svgUrl = getExtensionUrl('images/Corp_White_Transparent.svg');
        if (_accentLogoSvgTemplate) {
            var dataUrl = buildAccentLogoDataUrl(_accentLogoSvgTemplate, accentHex, !isDarkModeEnabled());
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
                + 'img[src*="DTULogo_Corp_Red_RGB.png"], '
                // Once replaced, the src no longer matches the rules above;
                // keep updating it when the accent or mode changes.
                + 'img[data-dark-mode-replaced]'
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

    function getAccentThemeRuntime() {
        var runtime = globalThis.DTUAfterDarkAccentThemeRuntime;
        if (!runtime) throw new Error('darkmode.accent-theme.js loaded before darkmode.js');
        return runtime;
    }
    function isDarkModeEnabled() {
        return getAccentThemeRuntime().isDarkModeEnabled();
    }
    function storageLocalGet(defaults, cb) {
        return getAccentThemeRuntime().storageLocalGet(defaults, cb);
    }
    function storageLocalSet(items) {
        return getAccentThemeRuntime().storageLocalSet(items);
    }
    function getExtensionUrl(path) {
        return getAccentThemeRuntime().getExtensionUrl(path);
    }

    function initAccentTheme() {
    // Apply sync value immediately for faster first paint.
    _accentThemeId = normalizeAccentThemeId(getAccentThemeIdFromLocalStorage());
    _accentCustomHex = normalizeHexColor(getAccentCustomHexFromLocalStorage(), ACCENT_CUSTOM_DEFAULT) || ACCENT_CUSTOM_DEFAULT;
    applyAccentThemeVars(getAccentThemeById(_accentThemeId));
    // Then sync from extension storage (cross-domain).
    loadAccentTheme(function () { });
    subscribeAccentThemeStorageChanges();
    }

    globalThis.DTUAfterDarkAccentTheme = {
        ACCENT_THEME_KEY: ACCENT_THEME_KEY,
        ACCENT_CUSTOM_HEX_KEY: ACCENT_CUSTOM_HEX_KEY,
        ACCENT_THEME_DEFAULT: ACCENT_THEME_DEFAULT,
        ACCENT_CUSTOM_DEFAULT: ACCENT_CUSTOM_DEFAULT,
        ACCENT_THEMES: ACCENT_THEMES,
        ACCENT_THEME_ORDER: ACCENT_THEME_ORDER,
        STATUS_THEME: STATUS_THEME,
        init: initAccentTheme,
        getAccentThemeId: function () { return _accentThemeId; },
        getAccentCustomHex: function () { return _accentCustomHex; },
        getContrastTextForHex: getContrastTextForHex,
        rgbaFromHex: rgbaFromHex,
        getResolvedAccent: getResolvedAccent,
        getResolvedAccentDeep: getResolvedAccentDeep,
        getAccentThemeById: getAccentThemeById,
        applyAfterDarkAdminMenuThemeVars: applyAfterDarkAdminMenuThemeVars,
        setAccentCustomHex: setAccentCustomHex,
        setAccentThemeId: setAccentThemeId,
        replaceLogoImage: replaceLogoImage
    };
})();
