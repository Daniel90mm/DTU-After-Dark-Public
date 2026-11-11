// Library events, news and live statistics service for the DTU After Dark background worker.
(function() {
    'use strict';

    const decodeHtmlBasic = DTUAfterDarkShared.decodeHtmlBasic;

    // --- Library events & news (bibliotek.dtu.dk) ---
    // The API expects the inner Request fields directly (not wrapped in {Request:{...}}).
    // It returns JSON: { Results: [ { Id, Title, Url, Date, ToDate, FormatedDate, Text, Location, ... } ] }

    // bibliotek.dtu.dk API: same endpoints used by the public website's own JS.
    // Note: Pagination.Size does NOT accept "Three" (it returns HTTP 500). Use "Ten" and
    // slice client-side (we only render a few items in the UI anyway).
    // Cache for 6h to minimise load.
    async function fetchLibraryEvents() {
        const body = {
            Pagination: { Number: 1, Size: 'Ten' },
            ListItemId: '539fc99a-6da8-4cc3-825d-34bfa6e34193',
            Language: 'en',
            Database: 'web',
            Subjects: [],
            DateRange: null,
            SearchText: '',
            ShowHistoricalEvents: false
        };
        try {
            // Note: Do NOT set a `Referer` header here. It's a forbidden header name in fetch and can
            // cause the request to fail entirely in some extension contexts.
            const resp = await fetch('https://www.bibliotek.dtu.dk/api/v1/calendar/calendareventlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'omit',
                body: JSON.stringify(body)
            });
            if (!resp.ok) return { ok: false, error: 'http', status: resp.status };
            const json = await resp.json();
            const results = (json && (json.Results || json.results)) ? (json.Results || json.results) : [];
            const events = results.map(r => {
                const d = r.Date ? new Date(r.Date) : null;
                const toDate = r.ToDate ? new Date(r.ToDate) : null;
                const location = decodeHtmlBasic(r.Location || '');
                const formattedDate = decodeHtmlBasic(r.FormatedDate || '');
                return {
                    url: r.Url || '',
                    title: decodeHtmlBasic(r.Title || ''),
                    excerpt: r.FormatedDate
                        ? formattedDate + (r.Location ? ' | ' + location : '')
                        : decodeHtmlBasic(r.Text || '').slice(0, 120),
                    day: d ? String(d.getDate()) : '',
                    month: d ? d.toLocaleString('en', { month: 'short' }) : '',
                    location: location,
                    formattedDate: formattedDate,
                    startIso: (d && !isNaN(d.getTime())) ? d.toISOString() : '',
                    endIso: (toDate && !isNaN(toDate.getTime())) ? toDate.toISOString() : ''
                };
            });
            return { ok: true, events };
        } catch (e) {
            return { ok: false, error: 'fetch_error', message: String(e && e.message || e) };
        }
    }

    async function fetchLibraryNews() {
        const body = {
            Pagination: { Number: 1, Size: 'Ten' },
            ListItemId: '72d6b860-3c16-4256-9b49-35b2840dadf8',
            Language: 'en',
            Database: 'web',
            Subjects: [],
            DateRange: null,
            SearchText: ''
        };
        try {
            // Note: Do NOT set a `Referer` header here. It's a forbidden header name in fetch and can
            // cause the request to fail entirely in some extension contexts.
            const resp = await fetch('https://www.bibliotek.dtu.dk/api/v1/news/newslist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'omit',
                body: JSON.stringify(body)
            });
            if (!resp.ok) return { ok: false, error: 'http', status: resp.status };
            const json = await resp.json();
            const results = (json && (json.Results || json.results)) ? (json.Results || json.results) : [];
            const news = results.map(r => {
                const d = r.Date ? new Date(r.Date) : null;
                return {
                    url: r.Url || '',
                    title: decodeHtmlBasic(r.Title || ''),
                    excerpt: decodeHtmlBasic(r.Summary || '').slice(0, 120),
                    badge: r.Badge && r.Badge.Title ? decodeHtmlBasic(r.Badge.Title) : '',
                    date: d ? d.toLocaleDateString('en', { day: '2-digit', month: 'long', year: 'numeric' }) : ''
                };
            });
            return { ok: true, news };
        } catch (e) {
            return { ok: false, error: 'fetch_error', message: String(e && e.message || e) };
        }
    }

    function parseIntLoose(text) {
        const digits = String(text || '').replace(/[^\d]/g, '');
        if (!digits) return null;
        const n = parseInt(digits, 10);
        return Number.isFinite(n) ? n : null;
    }

    function sanitizeLibraryTrendApiUrl(rawUrl) {
        const value = String(rawUrl || '').trim();
        if (!value) return '';
        try {
            const url = new URL(value);
            if (url.protocol !== 'https:') return '';
            return url.toString();
        } catch (e) {
            return '';
        }
    }

    async function fetchLibrarySharedTrends(apiUrl, lookbackDays) {
        const sanitizedUrl = sanitizeLibraryTrendApiUrl(apiUrl);
        if (!sanitizedUrl) return { ok: false, error: 'not_configured' };

        let finalUrl = sanitizedUrl;
        try {
            const u = new URL(sanitizedUrl);
            const lookback = parseIntLoose(lookbackDays);
            if (lookback && !u.searchParams.has('lookbackDays')) {
                u.searchParams.set('lookbackDays', String(Math.max(3, Math.min(365, lookback))));
            }
            finalUrl = u.toString();
        } catch (e0) {
            return { ok: false, error: 'invalid_url' };
        }

        try {
            const resp = await fetch(finalUrl, {
                method: 'GET',
                headers: { Accept: 'application/json, text/plain, */*' },
                credentials: 'omit',
                redirect: 'follow'
            });
            if (!resp.ok) return { ok: false, error: 'http', status: resp.status };
            const json = await resp.json();
            if (!json || json.ok === false) {
                return {
                    ok: false,
                    error: (json && json.error) ? json.error : 'invalid_payload'
                };
            }
            const out = Object.assign({}, json);
            out.ok = true;
            out.sourceUrl = finalUrl;
            return out;
        } catch (e1) {
            return { ok: false, error: 'fetch_error', message: String(e1 && e1.message || e1) };
        }
    }

    async function fetchLibraryCrowding(apiUrl, lookbackDays) {
        const shared = await fetchLibrarySharedTrends(apiUrl, lookbackDays);
        if (!shared || shared.ok === false) return shared || { ok: false, error: 'fetch_error' };
        return normalizeLibraryCrowdingPayload(shared);
    }

    // Shapes the shared trends payload into what the Library panel reads.
    function normalizeLibraryCrowdingPayload(shared) {
        const out = Object.assign({}, shared);

        if (!out.current && out.latest) {
            out.current = {
                visitors: parseIntLoose(out.latest.now, null),
                capacity: parseIntLoose(out.latest.capacity, null),
                free_seats: parseIntLoose(out.latest.freeSeats, null),
                timestamp: out.latest.fetchedAtIso || (out.latest.fetchedAt ? new Date(out.latest.fetchedAt).toISOString() : null)
            };
        }

        if (!out.today) {
            out.today = {
                total_visits: (out.latest && parseIntLoose(out.latest.today, null) != null) ? parseIntLoose(out.latest.today, null) : null,
                samples: []
            };
        }

        if (!out.historical) {
            out.historical = {
                weekday_averages: {},
                days_collected: null
            };
        }

        // The worker's hour rows use avgNow/minNow/maxNow; the panel reads avg_visitors etc.
        function toHistoricalRows(list) {
            if (!Array.isArray(list)) return [];
            return list.map(function (h) {
                return {
                    hour: parseIntLoose(h && h.hour, null),
                    avg_visitors: (h && typeof h.avgNow === 'number') ? h.avgNow : parseIntLoose(h && h.avgNow, null),
                    min_visitors: parseIntLoose(h && h.minNow, null),
                    max_visitors: parseIntLoose(h && h.maxNow, null),
                    samples: parseIntLoose(h && h.samples, null)
                };
            }).filter(function (h) {
                return h && h.hour != null && h.avg_visitors != null;
            });
        }

        try {
            if (!out.historical.weekday_averages || !Object.keys(out.historical.weekday_averages).length) {
                const averages = {};
                const byWeekday = out.trends && out.trends.weekdayHourly;
                if (byWeekday && typeof byWeekday === 'object') {
                    Object.keys(byWeekday).forEach(function (name) {
                        const rows = toHistoricalRows(byWeekday[name]);
                        if (rows.length) averages[name] = rows;
                    });
                }
                // Older worker versions send only the all-days average.
                const allDays = toHistoricalRows(out.trends && out.trends.hourly);
                if (allDays.length) averages.generic = allDays;
                if (Object.keys(averages).length) out.historical.weekday_averages = averages;
            }
            if (out.trends && out.trends.usualBasis) out.historical.usual_basis = String(out.trends.usualBasis);
            const weekdayDays = out.trends && out.trends.weekdayDays;
            if (!out.historical.weekday_days && weekdayDays && typeof weekdayDays === 'object') {
                const days = {};
                let total = 0;
                Object.keys(weekdayDays).forEach(function (name) {
                    const n = parseIntLoose(weekdayDays[name], null);
                    if (n != null && n >= 0) { days[name] = n; total += n; }
                });
                out.historical.weekday_days = days;
                if (out.historical.days_collected == null && total > 0) out.historical.days_collected = total;
            }
        } catch (e0) { }

        return out;
    }
    globalThis.DTUAfterDarkLibrary = {
        fetchLibraryEvents,
        fetchLibraryNews,
        parseIntLoose,
        sanitizeLibraryTrendApiUrl,
        fetchLibraryCrowding,
        normalizeLibraryCrowdingPayload
    };
})();
