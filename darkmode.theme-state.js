(function () {
    'use strict';

    const __urlPause = globalThis.DTUAfterDarkUrlPause;
    if (!__urlPause) throw new Error('darkmode.theme-state.js loaded before darkmode.url-pause.js');
    const __storage = globalThis.DTUAfterDarkStorage;
    if (!__storage) throw new Error('darkmode.theme-state.js loaded before darkmode.storage.js');

    // ===== DARK MODE TOGGLE =====
    const DARK_MODE_KEY = 'dtuDarkModeEnabled';
    const DARK_MODE_FOLLOW_KEY = 'dtuDarkModeFollowDevice';
    const IS_TOP_WINDOW = __urlPause.isTopWindow;

    function clearLegacyDarkModeCookie() {
        try {
            if (!IS_TOP_WINDOW || !location.hostname.endsWith('.dtu.dk')) return;
            var expiry = 'dtuDarkMode=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure';
            document.cookie = expiry;
            document.cookie = expiry + '; domain=.dtu.dk';
        } catch (e) { /* cookie access blocked */ }
    }

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

    // Save preference to all available stores (localStorage + extension storage).
    // Resolves once extension storage has the value, so callers can reload without
    // losing the write (a lost write makes the next load flip the toggle back).
    // A manual choice ends Auto (device theme).
    function saveDarkModePreference(enabled) {
        localStorage.setItem(DARK_MODE_KEY, String(enabled));
        localStorage.removeItem(DARK_MODE_FOLLOW_KEY);
        var storage = __storage.getExtensionStorageArea();
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
        var storage = __storage.getExtensionStorageArea();
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

    function applyStoredDarkModeValue(storedEnabled, storedFollow, currentEnabled) {
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
        if (isDarkModeEnabled() !== currentEnabled && IS_TOP_WINDOW) {
            location.reload();
        }
    }

    function subscribeDarkModeStorageChanges(currentEnabled) {
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
            if (isDarkModeEnabled() !== currentEnabled) {
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

    // Device switched light/dark while following it: reload into the new theme.
    function startFollowingDeviceThemeChanges(currentEnabled) {
        var query = deviceThemeQuery();
        if (!query || !IS_TOP_WINDOW) return;
        var onDeviceThemeChange = function () {
            if (isFollowingDeviceTheme() && isDarkModeEnabled() !== currentEnabled) location.reload();
        };
        if (query.addEventListener) query.addEventListener('change', onDeviceThemeChange);
        else if (query.addListener) query.addListener(onDeviceThemeChange);
    }

    globalThis.DTUAfterDarkThemeState = {
        DARK_MODE_KEY: DARK_MODE_KEY,
        DARK_MODE_FOLLOW_KEY: DARK_MODE_FOLLOW_KEY,
        clearLegacyDarkModeCookie: clearLegacyDarkModeCookie,
        isFollowingDeviceTheme: isFollowingDeviceTheme,
        isDarkModeEnabled: isDarkModeEnabled,
        saveDarkModePreference: saveDarkModePreference,
        saveDarkModeFollowDevice: saveDarkModeFollowDevice,
        applyStoredDarkModeValue: applyStoredDarkModeValue,
        subscribeDarkModeStorageChanges: subscribeDarkModeStorageChanges,
        startFollowingDeviceThemeChanges: startFollowingDeviceThemeChanges
    };
})();
