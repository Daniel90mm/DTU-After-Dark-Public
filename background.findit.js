// FindIt availability service for the DTU After Dark background worker.
(function() {
    'use strict';

    const fetchWithTimeLimit = DTUAfterDarkShared.fetchWithTimeLimit;
    function isAllowedFinditUrl(rawUrl) {
        if (!rawUrl || typeof rawUrl !== 'string') return false;
        try {
            const parsed = new URL(rawUrl);
            if (parsed.protocol !== 'https:') return false;
            if (parsed.hostname !== 'findit.dtu.dk') return false;
            if (!/^\/(?:en\/)?catalog\/?$/i.test(parsed.pathname)) return false;
            return true;
        } catch (e) {
            return false;
        }
    }

    async function fetchFinditAvailability(rawUrl) {
        if (!isAllowedFinditUrl(rawUrl)) {
            return { ok: false, error: 'invalid_url', onlineAccess: false };
        }
        try {
            const res = await fetchWithTimeLimit(rawUrl, { cache: 'no-store', credentials: 'omit' });
            if (!res || !res.ok) {
                return { ok: false, error: 'fetch_failed', onlineAccess: false };
            }
            const html = await res.text();
            // FindIt answers some requests with an "I am not a robot" page
            // (seen 2026-11-10). That says nothing about the book: report it
            // as unknown so it is not cached as "no online access".
            if (/\/verify\b/.test(String(res.url || '')) || /<title>\s*Verification\b/i.test(html)) {
                return { ok: false, error: 'verification_required', onlineAccess: false };
            }
            // "No online access" and "Ingen online adgang" must not count.
            const text = html.replace(/\b(?:no|not|ingen|ikke)\s+(?:available\s+)?online\s+(?:access|adgang)\b/gi, ' ')
                .replace(/\bnot\s+available\s+online\b/gi, ' ');
            const onlineAccess =
                /online\s+access/i.test(text) ||
                /online\s+adgang/i.test(text) ||
                /full\s*text\s*online/i.test(text);
            return { ok: true, onlineAccess };
        } catch (e) {
            return { ok: false, error: 'fetch_failed', onlineAccess: false };
        }
    }
    globalThis.DTUAfterDarkFindit = {
        isAllowedFinditUrl,
        fetchFinditAvailability
    };
})();
