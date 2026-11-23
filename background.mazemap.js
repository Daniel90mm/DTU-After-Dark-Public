// MazeMap resolver service for the DTU After Dark background worker.
(function() {
    'use strict';

    const fetchWithTimeLimit = DTUAfterDarkShared.fetchWithTimeLimit;
    // =========================
    // MazeMap resolver (DTU)
    // =========================

    const MAZEMAP_CAMPUS_ID = 89; // DTU Lyngby

    function stripHtml(s) {
        return String(s || '').replace(/<[^>]*>/g, '');
    }

    function normToken(s) {
        return String(s || '').trim().toUpperCase();
    }

    function roomCompareToken(room) {
        const r = normToken(room);
        if (/^\d+$/.test(r)) {
            const n = parseInt(r, 10);
            if (Number.isFinite(n)) return String(n);
        }
        return r;
    }

    function bldMatchesItem(item, building) {
        if (!item || !building) return false;
        const b = normToken(building);
        const list = Array.isArray(item.dispBldNames) ? item.dispBldNames : [];
        for (let i = 0; i < list.length; i++) {
            if (normToken(list[i]) === b) return true;
        }
        // Identifiers read "Bygning 305-11105": only the part before the hyphen
        // is the building; the rest is an internal id.
        const ident = stripHtml(item.identifier || '').match(/^\s*(?:bygning|building)\s+([^\s-]+)/i);
        if (ident && normToken(ident[1]) === b) return true;
        return false;
    }

    function roomMatchesItem(item, room) {
        if (!item || !room) return false;
        const want = normToken(room);
        const wantCmp = roomCompareToken(want);

        const candidates = [];
        if (Array.isArray(item.poiNames)) candidates.push(...item.poiNames);
        if (Array.isArray(item.dispPoiNames)) candidates.push(...item.dispPoiNames);
        if (item.title) candidates.push(item.title);
        if (item.dispTitle) candidates.push(item.dispTitle);

        for (let i = 0; i < candidates.length; i++) {
            const raw = stripHtml(candidates[i] || '');
            const cand = normToken(raw);
            if (!cand) continue;
            if (cand === want) return true;
            if (roomCompareToken(cand) === wantCmp) return true;
        }
        return false;
    }

    function pickBestRoomResult(results, building, room) {
        if (!Array.isArray(results) || !results.length) return null;
        let best = null;
        for (let i = 0; i < results.length; i++) {
            const item = results[i];
            if (!item || typeof item.poiId !== 'number') continue;
            if (!bldMatchesItem(item, building)) continue;
            if (!roomMatchesItem(item, room)) continue;
            if (!best) { best = item; continue; }
            const a = typeof item.score === 'number' ? item.score : 0;
            const b = typeof best.score === 'number' ? best.score : 0;
            if (a > b) best = item;
        }
        return best;
    }

    // DTU writes auditoriums as "A081", "A83" or "auditorium 081"; MazeMap names
    // the POI "AUDITORIUM 81/020" (name, then its room number).
    function auditoriumNumberFromRoom(room) {
        const m = /^A?0*(\d{1,3})$/i.exec(String(room || '').trim());
        return m ? m[1] : '';
    }

    function pickAuditoriumResult(results, building, number) {
        if (!Array.isArray(results) || !number) return null;
        const re = new RegExp('^AUDITORIUM\\s*0*' + number + '(?:\\b|/)', 'i');
        for (let i = 0; i < results.length; i++) {
            const item = results[i];
            if (!item || typeof item.poiId !== 'number') continue;
            if (!bldMatchesItem(item, building)) continue;
            const names = [].concat(item.poiNames || [], item.dispPoiNames || [], item.title || [], item.dispTitle || []);
            if (names.some((n) => re.test(stripHtml(n).trim()))) return item;
        }
        return null;
    }

    function pickBestBuildingResult(results, building) {
        if (!Array.isArray(results) || !results.length) return null;
        let best = null;
        for (let i = 0; i < results.length; i++) {
            const item = results[i];
            if (!item || typeof item.poiId !== 'number') continue;
            if (!bldMatchesItem(item, building)) continue;
            if (!best) { best = item; continue; }
            const a = typeof item.score === 'number' ? item.score : 0;
            const b = typeof best.score === 'number' ? best.score : 0;
            if (a > b) best = item;
        }
        return best;
    }

    async function fetchMazemapEquery(q) {
        if (!q || typeof q !== 'string') {
            return { ok: false, error: 'invalid_query' };
        }
        const url = `https://api.mazemap.com/search/equery/?q=${encodeURIComponent(q)}&campusid=${MAZEMAP_CAMPUS_ID}`;
        try {
            const res = await fetchWithTimeLimit(url, { cache: 'no-store', credentials: 'omit' });
            if (!res || !res.ok) {
                return { ok: false, error: 'http', status: res ? res.status : 0 };
            }
            const json = await res.json();
            const results = (json && Array.isArray(json.result)) ? json.result : [];
            return { ok: true, results };
        } catch (e) {
            return { ok: false, error: 'fetch_error', message: String(e && e.message || e) };
        }
    }

    function zeroPadRoom(room, width) {
        const r = String(room || '').trim();
        if (!/^\d+$/.test(r)) return r;
        const w = Math.max(1, parseInt(width || 3, 10) || 3);
        if (r.length >= w) return r;
        return r.padStart(w, '0');
    }

    async function resolveMazemapPoi(building, room) {
        const bld = normToken(building);
        const rm = String(room || '').trim();
        if (!/^\d{3}[A-Za-z]?$/.test(bld)) {
            return { ok: false, error: 'invalid_building' };
        }
        // Allow building-only resolution (room omitted).
        if (!rm) {
            const buildingQueries = [`Bygning ${bld}`, `Building ${bld}`];
            for (const qb of buildingQueries) {
                const respB = await fetchMazemapEquery(qb);
                if (!respB || !respB.ok) continue;
                const bestB = pickBestBuildingResult(respB.results, bld);
                if (bestB) {
                    return {
                        ok: true,
                        kind: 'building',
                        poiId: bestB.poiId,
                        identifier: bestB.identifier || '',
                        queryUsed: qb
                    };
                }
            }
            return { ok: false, error: 'not_found' };
        }
        if (rm.length > 12) {
            return { ok: false, error: 'invalid_room' };
        }

        const roomVariants = [];
        roomVariants.push(rm);
        const padded = zeroPadRoom(rm, 3);
        if (padded && padded !== rm) roomVariants.push(padded);
        // Dotted DTU room codes are written "R0.15.A"; MazeMap names the room "0.15.A".
        if (/^R\d+\./i.test(rm)) roomVariants.push(rm.slice(1));

        const queryVariants = [];
        for (const rv of roomVariants) {
            queryVariants.push(`${bld}-${rv}`);
            queryVariants.push(`${bld}.${rv}`);
        }

        for (const q of queryVariants) {
            const resp = await fetchMazemapEquery(q);
            if (!resp || !resp.ok) continue;
            let best = null;
            for (const rv of roomVariants) {
                best = pickBestRoomResult(resp.results, bld, rv);
                if (best) break;
            }
            if (best) {
                return {
                    ok: true,
                    kind: 'room',
                    poiId: best.poiId,
                    identifier: best.identifier || '',
                    queryUsed: q
                };
            }
        }

        // Auditorium notation, tried after exact room names so a real room "081"
        // still wins over "Auditorium 81".
        const audNo = auditoriumNumberFromRoom(rm);
        if (audNo) {
            const qa = `${bld}-${audNo}`;
            const respA = await fetchMazemapEquery(qa);
            const bestA = respA && respA.ok ? pickAuditoriumResult(respA.results, bld, audNo) : null;
            if (bestA) {
                return {
                    ok: true,
                    kind: 'room',
                    poiId: bestA.poiId,
                    identifier: bestA.identifier || '',
                    queryUsed: qa
                };
            }
        }

        // Fallback: building-level navigation (still helpful when room lookup fails).
        const buildingQueries = [`Bygning ${bld}`, `Building ${bld}`];
        for (const qb of buildingQueries) {
            const respB = await fetchMazemapEquery(qb);
            if (!respB || !respB.ok) continue;
            const bestB = pickBestBuildingResult(respB.results, bld);
            if (bestB) {
                return {
                    ok: true,
                    kind: 'building',
                    poiId: bestB.poiId,
                    identifier: bestB.identifier || '',
                    queryUsed: qb
                };
            }
        }

        return { ok: false, error: 'not_found' };
    }
    globalThis.DTUAfterDarkMazemap = {
        resolveMazemapPoi
    };
})();
