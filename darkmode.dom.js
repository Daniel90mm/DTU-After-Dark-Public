// Shared DOM helpers for every content script. Loaded right after config.js in
// every content-script group, so each module reads them once at its top
// (var markExt = globalThis.DTUAfterDarkDom.markExt) instead of keeping a copy.
(function () {
    'use strict';

    // Marks a node as the extension's own, so the dark-mode engine and the page
    // observer leave it alone.
    function markExt(el) {
        if (el && el.setAttribute) el.setAttribute('data-dtu-ext', '1');
        return el;
    }

    var IS_TOP = (function () {
        try { return window === window.top; } catch (e) { return false; }
    })();

    function isTopWindow() {
        return IS_TOP;
    }

    // null and undefined read as empty; 0 reads as "0".
    function normalizeWhitespace(value) {
        return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    }

    globalThis.DTUAfterDarkDom = {
        markExt: markExt,
        isTopWindow: isTopWindow,
        normalizeWhitespace: normalizeWhitespace
    };
})();
