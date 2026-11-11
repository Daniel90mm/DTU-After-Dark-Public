(function () {
    'use strict';

    const URL_PAUSE_PATTERNS_KEY = 'dtuAfterDarkUrlPausePatterns';
    const IS_TOP_WINDOW = (() => {
        try {
            return window === window.top;
        } catch (e) {
            return false;
        }
    })();

    function getCurrentUrlWithoutHash() {
        try {
            var u = new URL(window.location.href);
            u.hash = '';
            return u.toString();
        } catch (e) {
            return String(window.location.href || '').split('#')[0];
        }
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

    // "*" matches any run of characters, case-insensitive. Classic two-pointer glob
    // match: at most pattern x URL steps, so a stored "*a*a*a*b" cannot freeze a page
    // the way the same pattern as a regular expression can.
    function wildcardMatches(pattern, text) {
        var p = String(pattern || '').toLowerCase();
        var t = String(text || '').toLowerCase();
        var pi = 0, ti = 0, star = -1, mark = 0;
        while (ti < t.length) {
            if (pi < p.length && p.charAt(pi) !== '*' && p.charAt(pi) === t.charAt(ti)) { pi++; ti++; }
            else if (pi < p.length && p.charAt(pi) === '*') { star = pi++; mark = ti; }
            else if (star >= 0) { pi = star + 1; ti = ++mark; }
            else return false;
        }
        while (pi < p.length && p.charAt(pi) === '*') pi++;
        return pi === p.length;
    }

    function getMatchingUrlPausePatterns(url) {
        var currentUrl = String(url || getCurrentUrlWithoutHash());
        if (isPauseProtectedUrl(currentUrl)) return [];
        var patterns = getUrlPausePatterns();
        return patterns.filter(function (pattern) {
            try {
                return wildcardMatches(pattern, currentUrl);
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


    function initUrlPause() {
        var _matchingUrlPausePatterns = getMatchingUrlPausePatterns();
        if (_matchingUrlPausePatterns.length) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function () {
                    showUrlPausedBanner(_matchingUrlPausePatterns);
                }, { once: true });
            } else {
                showUrlPausedBanner(_matchingUrlPausePatterns);
            }
            return _matchingUrlPausePatterns;
        }
        return [];
    }

    globalThis.DTUAfterDarkUrlPause = {
        URL_PAUSE_PATTERNS_KEY: URL_PAUSE_PATTERNS_KEY,
        isTopWindow: IS_TOP_WINDOW,
        init: initUrlPause,
        getCurrentUrlWithoutHash: getCurrentUrlWithoutHash,
        normalizeUrlPausePattern: normalizeUrlPausePattern,
        isPauseProtectedUrl: isPauseProtectedUrl,
        isPauseProtectedPattern: isPauseProtectedPattern,
        getUrlPausePatterns: getUrlPausePatterns,
        saveUrlPausePatterns: saveUrlPausePatterns,
        wildcardPatternToRegExp: wildcardPatternToRegExp,
        wildcardMatches: wildcardMatches,
        getMatchingUrlPausePatterns: getMatchingUrlPausePatterns,
        buildSuggestedPausePatternsForCurrentUrl: buildSuggestedPausePatternsForCurrentUrl,
        showUrlPausedBanner: showUrlPausedBanner
    };
})();
