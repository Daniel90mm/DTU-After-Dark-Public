// Shared text and HTML helpers for the DTU After Dark background worker.
(function() {
    'use strict';

    function normalizeSpace(text) {
        return String(text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function decodeBasicHtmlEntities(text) {
        if (!text) return '';
        let decoded = String(text);
        for (let pass = 0; pass < 3; pass++) {
            const next = decoded
                .replace(/&amp;/gi, '&')
                .replace(/&nbsp;/gi, ' ')
                .replace(/&ndash;/gi, '–')
                .replace(/&mdash;/gi, '—')
                .replace(/&quot;/gi, '"')
                .replace(/&#39;|&apos;/gi, "'")
                .replace(/&lt;/gi, '<')
                .replace(/&gt;/gi, '>')
                .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10) || 0))
                .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16) || 0));
            if (next === decoded) break;
            decoded = next;
        }
        return decoded;
    }

    function decodeHtmlBasic(text) {
        return normalizeSpace(decodeBasicHtmlEntities(text));
    }

    function stripHtmlTags(html) {
        if (!html) return '';
        return normalizeSpace(
            decodeBasicHtmlEntities(
                String(html)
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<[^>]+>/g, ' ')
            )
        );
    }
    // Every background request has a time limit: a DTU server that never answers must
    // end in an error reply, not leave a widget on its loading bars forever. The signal
    // also covers reading the body.
    const FETCH_TIME_LIMIT_MS = 20000;
    function fetchWithTimeLimit(url, init, ms) {
        return fetch(url, Object.assign({}, init, { signal: AbortSignal.timeout(ms || FETCH_TIME_LIMIT_MS) }));
    }

    globalThis.DTUAfterDarkShared = {
        fetchWithTimeLimit,
        normalizeSpace,
        decodeBasicHtmlEntities,
        decodeHtmlBasic,
        stripHtmlTags
    };
})();
