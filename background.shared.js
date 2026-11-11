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
    globalThis.DTUAfterDarkShared = {
        normalizeSpace,
        decodeBasicHtmlEntities,
        decodeHtmlBasic,
        stripHtmlTags
    };
})();
