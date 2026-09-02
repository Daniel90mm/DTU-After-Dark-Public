(function () {
    'use strict';

    var MAZEMAP_CAMPUS_ID = 89; // DTU Lyngby
    var MAZEMAP_RESOLVE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

    var smartRoomLinkerTimer = null;
    var smartRoomLinkerPendingRoot = null;
    var smartRoomLinkerLastScanTs = 0;
    var smartRoomLinkerDidFullScan = false;
    var smartRoomLinkerTooltipEl = null;
    var smartRoomLinkerScannedShadowRoots = new WeakSet();
    var smartRoomLinkerHtmlBlockProbeTimer = null;
    var smartRoomLinkerShadowSweepTimer = null;
    var smartRoomLinkerGlobalClickBound = false;
    var mazemapResolveCache = {};

    function getDeps() {
        try { return globalThis.DTUAfterDarkSmartRoomLinkerDeps || null; } catch (e0) { return null; }
    }

    function callDep(name, args, fallback) {
        var deps = getDeps();
        if (deps && typeof deps[name] === 'function') {
            return deps[name].apply(null, args || []);
        }
        return fallback;
    }

    function getDepValue(name, fallback) {
        var deps = getDeps();
        if (deps && Object.prototype.hasOwnProperty.call(deps, name)) return deps[name];
        return fallback;
    }

    function sendRuntimeMessage(msg, cb) {
        return callDep('sendRuntimeMessage', [msg, cb], null);
    }

    function markExt(el) {
        callDep('markExt', [el], null);
        return el;
    }

    function isTopWindow() {
        return !!callDep('isTopWindow', [], false);
    }

    function isFeatureFlagEnabled(key) {
        return !!callDep('isFeatureFlagEnabled', [key], false);
    }

    function isDarkModeEnabled() {
        return !!callDep('isDarkModeEnabled', [], false);
    }

    function isDTULearnLegacyHeavyCourseToolPage() {
        return !!callDep('isDTULearnLegacyHeavyCourseToolPage', [], false);
    }

    function getFeatureSmartRoomLinkerKey() {
        return getDepValue('featureSmartRoomLinkerKey', 'dtuAfterDarkFeatureSmartRoomLinker');
    }

    function shouldRunSmartRoomLinkerInThisWindow() {
        if (!isFeatureFlagEnabled(getFeatureSmartRoomLinkerKey())) return false;
        if (!isSmartRoomLinkerAllowedOnHost()) return false;
        if (isDTULearnLegacyHeavyCourseToolPage()) return false;
        if (isTopWindow()) return true;
        return window.location.hostname === 'learn.inside.dtu.dk';
    }

    function normalizeMazemapBuilding(building) {
        return String(building || '').trim().toUpperCase();
    }

    function normalizeMazemapRoom(room) {
        return String(room || '').trim().toUpperCase();
    }

    function buildMazemapSharePoiUrl(poiId) {
        return 'https://use.mazemap.com/#v=1&campusid=' + MAZEMAP_CAMPUS_ID
            + '&sharepoitype=poi&sharepoi=' + encodeURIComponent(String(poiId));
    }

    function buildMazemapSearchUrl(query) {
        return 'https://use.mazemap.com/#v=1&campusid=' + MAZEMAP_CAMPUS_ID
            + '&search=' + encodeURIComponent(String(query || '').trim());
    }

    function getMazemapInlineLinkStyleString() {
        var isDark = isDarkModeEnabled();
        var color = isDark ? '#5cafff' : '#1565c0';
        var border = isDark ? 'rgba(92,175,255,0.75)' : 'rgba(21,101,192,0.55)';
        return ''
            + 'color:' + color + ' !important;'
            + 'text-decoration:none !important;'
            + 'border-bottom:1px dotted ' + border + ' !important;'
            + 'padding:0 2px;'
            + 'border-radius:4px;'
            + 'cursor:pointer;';
    }

    function parseBuildingRoomFromTextOrQuery(value) {
        var text = String(value || '');
        if (!text) return null;

        var match = text.match(/\bB?\s*([0-9]{3}[A-Za-z]?)\s*[.\-]\s*([A-Za-z]?\s*[0-9]{1,4}\s*[A-Za-z]?)\b/i);
        if (match) {
            var tail = text.slice((match.index || 0) + match[0].length);
            var room0 = String((match[2] || '').replace(/\s+/g, ''));
            if (/^\s*(?:KB|MB|GB|TB)\b/i.test(tail)) return null;
            if (match[0].indexOf('.') !== -1 && /^[0-9]+$/.test(room0) && room0.length <= 2) return null;
            return {
                building: normalizeMazemapBuilding(match[1]),
                room: normalizeMazemapRoom(room0)
            };
        }

        match = text.match(/\bB\s*[.\s]*([0-9]{3}[A-Za-z]?)\s*\/\s*(?:aud(?:itorium)?\.?\s*)?([0-9]{1,4}[A-Za-z]?)\b/i);
        if (match) {
            return {
                building: normalizeMazemapBuilding(match[1]),
                room: normalizeMazemapRoom((match[2] || '').replace(/\s+/g, ''))
            };
        }

        match = text.match(/\b(?:Building|Bygning)\s*([0-9]{3}[A-Za-z]?)\b/i);
        if (match) {
            var building = normalizeMazemapBuilding(match[1]);
            var rest = text.slice((match.index || 0) + match[0].length);
            var roomMatch = rest.match(/\b(?:Room|Lokale|Lok\.?|Rum|R|Auditorium|Aud\.?|AUD|SA)\s*([A-Za-z]?\s*[0-9]{1,4}\s*[A-Za-z]?)\b/i);
            return {
                building: building,
                room: roomMatch ? normalizeMazemapRoom((roomMatch[1] || '').replace(/\s+/g, '')) : ''
            };
        }

        return null;
    }

    function ensureMazemapGlobalClickHandler() {
        if (smartRoomLinkerGlobalClickBound) return;
        smartRoomLinkerGlobalClickBound = true;

        document.addEventListener('click', function (ev) {
            try {
                if (!isFeatureFlagEnabled(getFeatureSmartRoomLinkerKey())) return;
                var anchor = null;
                var target = ev && ev.target ? ev.target : null;
                if (target && target.nodeType === 3) target = target.parentElement;
                if (target && target.closest) anchor = target.closest('[data-dtu-mazemap-link]');

                if (!anchor && ev && typeof ev.composedPath === 'function') {
                    var path = ev.composedPath() || [];
                    for (var i = 0; i < path.length; i++) {
                        var el = path[i];
                        if (!el || el.nodeType !== 1 || !el.getAttribute) continue;
                        if (el.getAttribute('data-dtu-mazemap-link') === '1') {
                            anchor = el;
                            break;
                        }
                    }
                }
                if (!anchor) return;
                if (anchor.getAttribute('data-dtu-mazemap-bound') === '1') return;

                ev.preventDefault();

                var building = anchor.getAttribute('data-dtu-mazemap-building') || '';
                var room = anchor.getAttribute('data-dtu-mazemap-room') || '';

                if (!building) {
                    var href = anchor.getAttribute('href') || '';
                    var parsed = null;
                    try {
                        var url = new URL(href, window.location.origin);
                        var query = url.searchParams.get('search') || '';
                        parsed = parseBuildingRoomFromTextOrQuery(query);
                    } catch (e1) { }
                    if (!parsed) parsed = parseBuildingRoomFromTextOrQuery(anchor.textContent || '');
                    if (parsed) {
                        building = parsed.building;
                        room = parsed.room || '';
                    }
                }

                building = normalizeMazemapBuilding(building);
                room = normalizeMazemapRoom(room);
                if (!building) return;

                var queryText = room ? (building + '-' + room) : ('Bygning ' + building);
                showMazemapTooltip(anchor, 'Locating ' + queryText + '...', 'info');

                resolveMazemapRoom(building, room, function (res) {
                    if (res && res.ok && typeof res.poiId === 'number') {
                        var exactUrl = buildMazemapSharePoiUrl(res.poiId);
                        removeMazemapTooltip();
                        showMazemapTooltip(anchor, 'Opening MazeMap...', 'info');
                        setTimeout(removeMazemapTooltip, 900);
                        try { window.open(exactUrl, '_blank', 'noopener,noreferrer'); } catch (e2) { }
                        return;
                    }

                    var fallbackUrl = buildMazemapSearchUrl(queryText);
                    removeMazemapTooltip();
                    showMazemapTooltip(anchor, (room ? 'Room not found. Opening search...' : 'Building not found. Opening search...'), 'error');
                    setTimeout(removeMazemapTooltip, 1400);
                    try { window.open(fallbackUrl, '_blank', 'noopener,noreferrer'); } catch (e3) { }
                });
            } catch (e0) {
            }
        }, true);
    }

    function ensureMazemapSmartRoomStyles() {
        var id = 'dtu-mazemap-smart-room-style';
        if (document.getElementById(id)) return;
        var color = isDarkModeEnabled() ? '#5cafff' : '#1565c0';
        var glow = isDarkModeEnabled() ? 'rgba(92,175,255,0.22)' : 'rgba(21,101,192,0.18)';
        var border = isDarkModeEnabled() ? 'rgba(92,175,255,0.75)' : 'rgba(21,101,192,0.55)';
        var styleEl = document.createElement('style');
        styleEl.id = id;
        markExt(styleEl);
        styleEl.textContent = ''
            + '[data-dtu-mazemap-link]{'
            + 'color:' + color + ' !important;'
            + 'text-decoration:none !important;'
            + 'border-bottom:1px dotted ' + border + ' !important;'
            + 'padding:0 2px;'
            + 'border-radius:4px;'
            + 'cursor:pointer;'
            + 'display:inline-flex;'
            + 'align-items:center;'
            + 'gap:4px;'
            + 'line-height:1.2;'
            + '}'
            + '[data-dtu-mazemap-link]:hover{'
            + 'text-decoration:underline !important;'
            + 'box-shadow:0 0 0 2px ' + glow + ' !important;'
            + '}'
            + '[data-dtu-mazemap-link][data-dtu-mazemap-loading="1"]{'
            + 'opacity:0.85;'
            + 'border-bottom-style:solid !important;'
            + '}'
            + '[data-dtu-mazemap-icon]{display:inline-flex;flex:0 0 auto;}'
            + '@keyframes dtuMazemapSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'
            + '[data-dtu-mazemap-spinner]{'
            + 'width:12px;height:12px;'
            + 'border:2px solid currentColor;'
            + 'border-top-color:transparent;'
            + 'border-radius:50%;'
            + 'box-sizing:border-box;'
            + 'animation:dtuMazemapSpin .85s linear infinite;'
            + 'display:block;'
            + '}';
        (document.head || document.documentElement).appendChild(styleEl);
    }

    function getMazemapPinGlyph() {
        return '📍';
    }

    function removeMazemapTooltip() {
        if (smartRoomLinkerTooltipEl && smartRoomLinkerTooltipEl.parentNode) {
            smartRoomLinkerTooltipEl.parentNode.removeChild(smartRoomLinkerTooltipEl);
        }
        smartRoomLinkerTooltipEl = null;
    }

    function showMazemapTooltip(anchorEl, text, tone) {
        removeMazemapTooltip();
        if (!anchorEl || !anchorEl.getBoundingClientRect) return null;
        var rect = anchorEl.getBoundingClientRect();
        var tip = document.createElement('div');
        markExt(tip);
        tip.setAttribute('data-dtu-mazemap-tooltip', '1');
        tip.textContent = String(text || '');
        var isDark = isDarkModeEnabled();
        var bg = isDark ? '#1a1a1a' : '#ffffff';
        var border = isDark ? '#404040' : '#d1d5db';
        var fg = isDark ? '#e0e0e0' : '#111827';
        var accent = (tone === 'error') ? 'var(--dtu-ad-status-danger)' : 'var(--dtu-ad-status-info)';
        tip.style.cssText = 'position:fixed;z-index:999999;max-width:280px;'
            + 'padding:6px 10px;border-radius:8px;font-size:12px;'
            + 'box-shadow:' + (isDark ? '0 10px 28px rgba(0,0,0,0.45)' : '0 10px 28px rgba(15,23,42,0.16)') + ';'
            + 'pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        tip.style.setProperty('background', bg, 'important');
        tip.style.setProperty('background-color', bg, 'important');
        tip.style.setProperty('border', '1px solid ' + border, 'important');
        tip.style.setProperty('color', fg, 'important');
        tip.style.setProperty('border-left', '3px solid ' + accent, 'important');
        tip.style.top = Math.round(Math.max(8, rect.top - 34)) + 'px';
        tip.style.left = Math.round(Math.min(Math.max(8, rect.left), window.innerWidth - 300)) + 'px';
        (document.body || document.documentElement).appendChild(tip);
        smartRoomLinkerTooltipEl = tip;
        return tip;
    }

    function setMazemapLinkLoading(linkEl, loading) {
        if (!linkEl) return;
        if (loading) linkEl.setAttribute('data-dtu-mazemap-loading', '1');
        else linkEl.removeAttribute('data-dtu-mazemap-loading');
        var icon = linkEl.querySelector('[data-dtu-mazemap-icon]');
        if (!icon) return;
        icon.textContent = loading ? '...' : getMazemapPinGlyph();
    }

    function applyMazemapSmartLinkInlineStyle(anchor) {
        if (!anchor || !anchor.style) return;
        var isDark = isDarkModeEnabled();
        var color = isDark ? '#5cafff' : '#1565c0';
        var border = isDark ? 'rgba(92,175,255,0.75)' : 'rgba(21,101,192,0.55)';
        anchor.style.setProperty('color', color, 'important');
        anchor.style.setProperty('text-decoration', 'none', 'important');
        anchor.style.setProperty('border-bottom', '1px dotted ' + border, 'important');
        anchor.style.setProperty('padding', '0 2px', 'important');
        anchor.style.setProperty('border-radius', '4px', 'important');
        anchor.style.setProperty('cursor', 'pointer', 'important');
        anchor.style.setProperty('display', 'inline-flex', 'important');
        anchor.style.setProperty('align-items', 'center', 'important');
        anchor.style.setProperty('gap', '4px', 'important');
        anchor.style.setProperty('line-height', '1.2', 'important');
    }

    function applyMazemapSmartIconInlineStyle(icon) {
        if (!icon || !icon.style) return;
        icon.style.setProperty('display', 'inline-flex', 'important');
        icon.style.setProperty('align-items', 'center', 'important');
        icon.style.setProperty('justify-content', 'center', 'important');
        icon.style.setProperty('flex', '0 0 auto', 'important');
        icon.style.setProperty('font-size', '12px', 'important');
        icon.style.setProperty('line-height', '1', 'important');
    }

    function resolveMazemapRoom(building, room, cb) {
        var normalizedBuilding = normalizeMazemapBuilding(building);
        var normalizedRoom = normalizeMazemapRoom(room);
        if (!normalizedBuilding) {
            if (cb) cb(null);
            return;
        }
        var key = normalizedBuilding + '-' + (normalizedRoom || '');
        var now = Date.now();
        var cached = mazemapResolveCache[key];
        if (cached && cached.ts && (now - cached.ts) < MAZEMAP_RESOLVE_CACHE_TTL_MS) {
            if (cb) cb(cached);
            return;
        }

        sendRuntimeMessage({ type: 'dtu-mazemap-resolve', building: normalizedBuilding, room: normalizedRoom }, function (resp) {
            var out = null;
            if (resp && resp.ok && typeof resp.poiId === 'number') {
                out = {
                    ok: true,
                    poiId: resp.poiId,
                    identifier: resp.identifier || '',
                    kind: resp.kind || 'room',
                    queryUsed: resp.queryUsed || '',
                    ts: Date.now()
                };
            } else {
                out = { ok: false, error: (resp && resp.error) ? resp.error : 'not_found', ts: Date.now() };
            }
            mazemapResolveCache[key] = out;
            if (cb) cb(out);
        });
    }

    function createMazemapSmartLink(building, room, labelText) {
        ensureMazemapSmartRoomStyles();
        ensureMazemapGlobalClickHandler();
        var normalizedBuilding = normalizeMazemapBuilding(building);
        var normalizedRoom = normalizeMazemapRoom(room);
        var query = normalizedRoom ? (normalizedBuilding + '-' + normalizedRoom) : ('Bygning ' + normalizedBuilding);

        var anchor = document.createElement('a');
        markExt(anchor);
        anchor.setAttribute('data-dtu-mazemap-link', '1');
        anchor.setAttribute('data-dtu-mazemap-bound', '1');
        anchor.setAttribute('data-dtu-mazemap-building', normalizedBuilding);
        if (normalizedRoom) anchor.setAttribute('data-dtu-mazemap-room', normalizedRoom);
        anchor.setAttribute('data-dtu-mazemap-text', String(labelText || query));
        anchor.href = buildMazemapSearchUrl(query);
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.title = normalizedRoom ? 'Open in MazeMap (click to resolve exact location)' : 'Open building in MazeMap';
        anchor.textContent = String(labelText || query);
        applyMazemapSmartLinkInlineStyle(anchor);

        var icon = document.createElement('span');
        markExt(icon);
        icon.setAttribute('data-dtu-mazemap-icon', '1');
        icon.textContent = getMazemapPinGlyph();
        applyMazemapSmartIconInlineStyle(icon);
        anchor.appendChild(icon);

        anchor.addEventListener('click', function (ev) {
            try { ev.preventDefault(); } catch (e1) { }
            if (anchor.getAttribute('data-dtu-mazemap-loading') === '1') return;

            setMazemapLinkLoading(anchor, true);
            showMazemapTooltip(anchor, 'Locating ' + query + '...', 'info');

            resolveMazemapRoom(normalizedBuilding, normalizedRoom, function (res) {
                setMazemapLinkLoading(anchor, false);
                if (res && res.ok && typeof res.poiId === 'number') {
                    var exactUrl = buildMazemapSharePoiUrl(res.poiId);
                    removeMazemapTooltip();
                    showMazemapTooltip(anchor, 'Opening MazeMap...', 'info');
                    setTimeout(removeMazemapTooltip, 900);
                    try {
                        window.open(exactUrl, '_blank', 'noopener,noreferrer');
                    } catch (e2) {
                        anchor.href = exactUrl;
                        anchor.click();
                    }
                    return;
                }

                var fallbackUrl = buildMazemapSearchUrl(query);
                removeMazemapTooltip();
                showMazemapTooltip(anchor, (normalizedRoom ? 'Room not found. Opening search...' : 'Building not found. Opening search...'), 'error');
                setTimeout(removeMazemapTooltip, 1400);
                try {
                    window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
                } catch (e3) {
                    anchor.href = fallbackUrl;
                    anchor.click();
                }
            });
        });

        return anchor;
    }

    function isSmartRoomLinkerAllowedOnHost() {
        var host = window.location.hostname || '';
        if (host === 's.brightspace.com') return false;
        return true;
    }

    function getSmartRoomMatches(text) {
        var value = String(text || '');
        if (!value) return [];
        if (!/\d{3}/.test(value)) return [];
        if (!/(bygning|building|auditorium|\baud\b|\bB\s*[.\s]*\d{3}|\b\d{3}\s*[.\-]\s*\d)/i.test(value)) return [];

        var matches = [];
        var match;

        var reA = /\b(?:Building|Bygning|B)\s*([0-9]{3}[A-Za-z]?)\s*(?:,|\s)\s*(?:Room|Lokale|Lok\.?|Rum|R|Auditorium|Aud\.?|Seminar(?:\s*Room)?|Group(?:\s*Room)?|Exercise(?:\s*Room)?|AUD|SA)\s*([0-9]{1,4}[A-Za-z]?)\b/gi;
        while ((match = reA.exec(value)) !== null) {
            matches.push({ start: match.index, end: match.index + match[0].length, building: match[1], room: match[2], text: match[0] });
        }

        var reD2 = /\bB\s*[.\s]*([0-9]{3}[A-Za-z]?)\s*\/\s*aud(?:itorium)?\.?\s*([0-9]{1,4}[A-Za-z]?)\b/gi;
        while ((match = reD2.exec(value)) !== null) {
            matches.push({ start: match.index, end: match.index + match[0].length, building: match[1], room: match[2], text: match[0] });
        }

        var reD = /\bB\s*[.\s]*([0-9]{3}[A-Za-z]?)\s*\/\s*(?:aud(?:itorium)?\.?\s*)?([0-9]{1,4}[A-Za-z]?)\b/gi;
        while ((match = reD.exec(value)) !== null) {
            var full = match[0] || '';
            var token = match[2] || '';
            var fullUpper = full.toUpperCase();
            var tokenUpper = String(token).toUpperCase();
            var offset = fullUpper.lastIndexOf(tokenUpper);
            if (offset < 0) offset = full.length - token.length;
            var absStart = match.index + offset;
            matches.push({ start: absStart, end: absStart + token.length, building: match[1], room: token, text: token });
        }

        var reE = /\bB\s*[.\s]*([0-9]{3}[A-Za-z]?)\s*\/\s*([0-9]{1,4}[A-Za-z]?(?:\s*,\s*[0-9]{1,4}[A-Za-z]?)+)\b/gi;
        while ((match = reE.exec(value)) !== null) {
            var building = match[1];
            var list = match[2] || '';
            if (!list) continue;
            var full2 = match[0] || '';
            var baseOffset = full2.toUpperCase().indexOf(list.toUpperCase());
            if (baseOffset < 0) baseOffset = full2.length - list.length;
            var baseAbs = match.index + baseOffset;

            var tokRe = /[0-9]{1,4}[A-Za-z]?/g;
            var tokMatch;
            while ((tokMatch = tokRe.exec(list)) !== null) {
                var token2 = tokMatch[0];
                if (!token2) continue;
                matches.push({
                    start: baseAbs + tokMatch.index,
                    end: baseAbs + tokMatch.index + token2.length,
                    building: building,
                    room: token2,
                    text: token2
                });
            }
        }

        var reB = /\bB?\s*([0-9]{3}[A-Za-z]?)\s*[.\-]\s*([A-Za-z]?\s*[0-9]{1,4}\s*[A-Za-z]?)\b/g;
        while ((match = reB.exec(value)) !== null) {
            var roomRaw = (match[2] || '').replace(/\s+/g, '');
            var tail = value.slice(match.index + match[0].length, match.index + match[0].length + 12);
            if (/^\s*(?:KB|MB|GB|TB)\b/i.test(tail)) continue;
            if (match[0].indexOf('.') !== -1) {
                var digits = roomRaw.replace(/[^0-9]/g, '');
                if (digits.length > 0 && digits.length <= 2) continue;
                if (/[KMGT]$/i.test(roomRaw) && /^\s*B\b/i.test(tail)) continue;
            }
            matches.push({
                start: match.index,
                end: match.index + match[0].length,
                building: match[1],
                room: roomRaw,
                text: match[0]
            });
        }

        var reC = /\b(?:Building|Bygning)\s*([0-9]{3}[A-Za-z]?)\b/gi;
        while ((match = reC.exec(value)) !== null) {
            matches.push({
                start: match.index,
                end: match.index + match[0].length,
                building: match[1],
                room: '',
                text: match[0]
            });
        }

        if (!matches.length) return [];
        matches.sort(function (a, b) {
            if (a.start !== b.start) return a.start - b.start;
            return b.end - a.end;
        });

        var out = [];
        var lastEnd = -1;
        for (var i = 0; i < matches.length; i++) {
            var current = matches[i];
            if (!current || current.start < lastEnd) continue;
            lastEnd = current.end;
            out.push(current);
        }
        return out;
    }

    function isSmartRoomLinkerSkippableElement(el) {
        if (!el || el.nodeType !== 1) return true;
        if (el.closest && el.closest('[data-dtu-mazemap-link],[data-dtu-ext]')) return true;
        var tag = (el.tagName || '').toUpperCase();
        if (!tag) return true;
        if (tag === 'A' || tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'OPTION') return true;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return true;
        if (tag === 'CODE' || tag === 'PRE') return true;
        if (el.isContentEditable) return true;
        return false;
    }

    function wrapSmartRoomsInTextNode(textNode) {
        if (!textNode || textNode.nodeType !== 3) return 0;
        var parent = textNode.parentElement;
        if (!parent || isSmartRoomLinkerSkippableElement(parent)) return 0;

        var text = textNode.nodeValue || '';
        var matches = getSmartRoomMatches(text);
        if (!matches.length) return 0;

        var frag = document.createDocumentFragment();
        var last = 0;
        for (var i = 0; i < matches.length; i++) {
            var match = matches[i];
            if (!match) continue;
            if (match.start > last) frag.appendChild(document.createTextNode(text.slice(last, match.start)));
            frag.appendChild(createMazemapSmartLink(match.building, match.room || '', match.text));
            last = match.end;
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        parent.replaceChild(frag, textNode);
        return matches.length;
    }

    function createMazemapSmartLinkHtmlElement(doc, building, room, labelText) {
        if (!doc || !doc.createElement) return null;
        var normalizedBuilding = normalizeMazemapBuilding(building);
        var normalizedRoom = normalizeMazemapRoom(room);
        if (!normalizedBuilding) return null;

        var query = normalizedRoom ? (normalizedBuilding + '-' + normalizedRoom) : ('Bygning ' + normalizedBuilding);
        var href = buildMazemapSearchUrl(query);

        var anchor = doc.createElement('a');
        anchor.setAttribute('data-dtu-mazemap-link', '1');
        anchor.setAttribute('data-dtu-mazemap-building', normalizedBuilding);
        if (normalizedRoom) anchor.setAttribute('data-dtu-mazemap-room', normalizedRoom);
        anchor.setAttribute('data-dtu-mazemap-text', String(labelText || query));
        anchor.setAttribute('href', href);
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
        anchor.setAttribute('title', normalizedRoom ? 'Open in MazeMap (click to resolve exact location)' : 'Open building in MazeMap');
        anchor.setAttribute('style', getMazemapInlineLinkStyleString() + 'padding:0 !important;display:inline;line-height:inherit;');

        var txt = doc.createElement('span');
        txt.textContent = String(labelText || query);
        anchor.appendChild(txt);

        var icon = doc.createElement('span');
        icon.setAttribute('data-dtu-mazemap-icon', '1');
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = getMazemapPinGlyph();
        icon.setAttribute('style', 'display:inline;margin-left:4px;font-size:0.95em;opacity:0.9;text-decoration:none;');
        anchor.appendChild(icon);

        return anchor;
    }

    function linkifyD2lHtmlBlockAttribute(block) {
        if (!block || !block.getAttribute || !block.setAttribute) return false;
        var raw = String(block.getAttribute('html') || '');
        if (!raw) return false;
        if (raw.indexOf('data-dtu-mazemap-link') !== -1) return false;
        if (!/(bygning|building|auditorium|\baud\b|\bB\s*[.\s]*\d{3}|\b\d{3}\s*[.\-]\s*\d)/i.test(raw)) return false;

        var doc;
        try {
            doc = new DOMParser().parseFromString(raw, 'text/html');
        } catch (eParse) {
            return false;
        }
        if (!doc || !doc.body) return false;

        var did = false;
        var replaced = 0;
        var maxReplacements = 40;
        var nodes = [];

        try {
            var walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
            var node;
            while ((node = walker.nextNode())) nodes.push(node);
        } catch (eWalk) {
            return false;
        }

        for (var i = 0; i < nodes.length; i++) {
            if (replaced >= maxReplacements) break;
            var textNode = nodes[i];
            if (!textNode || textNode.nodeType !== 3) continue;
            var parent = textNode.parentNode;
            if (!parent) continue;
            var tag = (parent.nodeName || '').toUpperCase();
            if (tag === 'A' || tag === 'SCRIPT' || tag === 'STYLE') continue;

            var text = textNode.nodeValue || '';
            var matches = getSmartRoomMatches(text);
            if (!matches.length) continue;

            var frag = doc.createDocumentFragment();
            var last = 0;
            for (var j = 0; j < matches.length; j++) {
                if (replaced >= maxReplacements) break;
                var match = matches[j];
                if (!match) continue;
                if (match.start > last) frag.appendChild(doc.createTextNode(text.slice(last, match.start)));
                var anchor = createMazemapSmartLinkHtmlElement(doc, match.building, match.room || '', match.text);
                if (anchor) {
                    frag.appendChild(anchor);
                    replaced++;
                    did = true;
                } else {
                    frag.appendChild(doc.createTextNode(text.slice(match.start, match.end)));
                }
                last = match.end;
            }
            if (last < text.length) frag.appendChild(doc.createTextNode(text.slice(last)));
            try { parent.replaceChild(frag, textNode); } catch (eReplace) { }
        }

        if (!did) return false;
        var out = '';
        try { out = doc.body.innerHTML; } catch (eSer) { out = ''; }
        if (!out || out === raw) return false;

        try {
            block.setAttribute('html', out);
            try { block.html = out; } catch (eProp) { }
            return true;
        } catch (eSet) {
            return false;
        }
    }

    function linkifyD2lHtmlBlocksInRoot(root) {
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!root || !root.querySelectorAll) return;
        var blocks = root.querySelectorAll('d2l-html-block[html]');
        if (!blocks || !blocks.length) return;
        ensureMazemapGlobalClickHandler();
        for (var i = 0; i < blocks.length && i < 80; i++) {
            linkifyD2lHtmlBlockAttribute(blocks[i]);
        }
    }

    function runSmartRoomLinkerScan(rootNode) {
        if (!shouldRunSmartRoomLinkerInThisWindow()) return;

        var root = (rootNode && (rootNode.nodeType === 1 || rootNode.nodeType === 11))
            ? rootNode
            : (document.body || document.documentElement);
        if (!root) return;

        var now = Date.now();
        if (!rootNode) {
            if (smartRoomLinkerDidFullScan && (now - smartRoomLinkerLastScanTs) < 8000) return;
            smartRoomLinkerDidFullScan = true;
        }
        smartRoomLinkerLastScanTs = now;

        ensureMazemapSmartRoomStyles();
        ensureMazemapGlobalClickHandler();

        var isShadow = root && root.nodeType === 11;
        try {
            if (window.location.hostname === 'learn.inside.dtu.dk' && !isShadow) {
                linkifyD2lHtmlBlocksInRoot(root);
            }
        } catch (ePatch) { }

        var isHtmlBlockRendered = (!isShadow && root.nodeType === 1 && root.classList && root.classList.contains('d2l-html-block-rendered'));
        var maxTextNodes = (isShadow || isHtmlBlockRendered) ? 1600 : 420;
        var maxMs = (isShadow || isHtmlBlockRendered) ? 85 : 28;
        var start = Date.now();
        var processed = 0;

        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                try {
                    if (!node || node.nodeType !== 3) return NodeFilter.FILTER_REJECT;
                    var p = node.parentElement;
                    if (!p || isSmartRoomLinkerSkippableElement(p)) return NodeFilter.FILTER_REJECT;
                    var v = node.nodeValue || '';
                    if (!v || v.length < 6) return NodeFilter.FILTER_REJECT;
                    if (!/\d{3}/.test(v)) return NodeFilter.FILTER_REJECT;
                    if (!/(bygning|building|auditorium|\baud\b|\bB\s*[.\s]*\d{3}|\b\d{3}\s*[.\-]\s*\d)/i.test(v)) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                } catch (e0) {
                    return NodeFilter.FILTER_REJECT;
                }
            }
        }, false);

        var current;
        while ((current = walker.nextNode())) {
            processed++;
            wrapSmartRoomsInTextNode(current);
            if (processed >= maxTextNodes) break;
            if ((Date.now() - start) > maxMs) break;
        }
    }

    function scheduleSmartRoomLinkerScan(rootNode, delayMs) {
        if (!shouldRunSmartRoomLinkerInThisWindow()) return;
        if (smartRoomLinkerTimer) {
            if (smartRoomLinkerPendingRoot == null && rootNode) smartRoomLinkerPendingRoot = rootNode;
            return;
        }
        smartRoomLinkerPendingRoot = rootNode || null;
        smartRoomLinkerTimer = setTimeout(function () {
            smartRoomLinkerTimer = null;
            var pending = smartRoomLinkerPendingRoot;
            smartRoomLinkerPendingRoot = null;
            try { runSmartRoomLinkerScan(pending); } catch (e0) { }
        }, delayMs || 420);
    }

    function seedSmartRoomLinkerShadowRoot(shadowRoot) {
        if (!shadowRoot || shadowRoot.nodeType !== 11) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!isFeatureFlagEnabled(getFeatureSmartRoomLinkerKey())) return;
        if (smartRoomLinkerScannedShadowRoots.has(shadowRoot)) return;
        smartRoomLinkerScannedShadowRoots.add(shadowRoot);

        try {
            var targets = [];
            if (shadowRoot.querySelectorAll) {
                shadowRoot.querySelectorAll('.d2l-html-block-rendered').forEach(function (el) { targets.push(el); });
                shadowRoot.querySelectorAll('.d2l-datalist, .vui-list, .d2l-datalist-no-padding').forEach(function (el) { targets.push(el); });
            }
            if (targets.length) {
                for (var i = 0; i < targets.length && i < 12; i++) {
                    scheduleSmartRoomLinkerScan(targets[i], 520);
                }
                scheduleSmartRoomLinkerScan(shadowRoot, 820);
                try { seedSmartRoomLinkerNestedShadowRoots(shadowRoot); } catch (eNest0) { }
                return;
            }
        } catch (e1) { }

        scheduleSmartRoomLinkerScan(shadowRoot, 650);
        try { seedSmartRoomLinkerNestedShadowRoots(shadowRoot); } catch (eNest1) { }
    }

    function seedSmartRoomLinkerNestedShadowRoots(shadowRoot) {
        if (!shadowRoot || shadowRoot.nodeType !== 11 || !shadowRoot.querySelectorAll) return;
        var walker = document.createTreeWalker(shadowRoot, NodeFilter.SHOW_ELEMENT, null);
        var node = walker.nextNode();
        var scanned = 0;
        var start = Date.now();
        while (node) {
            scanned++;
            if (node.shadowRoot) seedSmartRoomLinkerShadowRoot(node.shadowRoot);
            if (scanned > 800) break;
            if ((Date.now() - start) > 35) break;
            node = walker.nextNode();
        }
    }

    function scheduleSmartRoomLinkerShadowSweep(delayMs) {
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!shouldRunSmartRoomLinkerInThisWindow()) return;
        if (smartRoomLinkerShadowSweepTimer) return;
        smartRoomLinkerShadowSweepTimer = setTimeout(function () {
            smartRoomLinkerShadowSweepTimer = null;
            try {
                var base = document.body || document.documentElement;
                if (!base) return;

                var walker = document.createTreeWalker(base, NodeFilter.SHOW_ELEMENT, null);
                var node = walker.nextNode();
                var scanned = 0;
                var start = Date.now();
                while (node) {
                    scanned++;
                    var tag = (node.tagName || '').toLowerCase();
                    if (tag && tag.indexOf('d2l-') === 0 && node.shadowRoot) {
                        seedSmartRoomLinkerShadowRoot(node.shadowRoot);
                    }
                    if (scanned > 1800) break;
                    if ((Date.now() - start) > 55) break;
                    node = walker.nextNode();
                }
            } catch (e0) { }
        }, delayMs || 900);
    }

    function scheduleSmartRoomLinkerHtmlBlockProbe(delayMs) {
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!shouldRunSmartRoomLinkerInThisWindow()) return;
        if (smartRoomLinkerHtmlBlockProbeTimer) return;
        smartRoomLinkerHtmlBlockProbeTimer = setTimeout(function () {
            smartRoomLinkerHtmlBlockProbeTimer = null;
            try {
                var blocks = document.querySelectorAll('d2l-html-block');
                for (var i = 0; i < blocks.length && i < 80; i++) {
                    var block = blocks[i];
                    try { linkifyD2lHtmlBlockAttribute(block); } catch (eLinkify) { }
                    if (block && block.shadowRoot) seedSmartRoomLinkerShadowRoot(block.shadowRoot);
                }
            } catch (e0) { }
        }, delayMs || 650);
    }

    function removeSmartRoomLinks() {
        removeMazemapTooltip();
        document.querySelectorAll('[data-dtu-mazemap-link]').forEach(function (anchor) {
            try {
                var text = anchor.getAttribute('data-dtu-mazemap-text') || (anchor.textContent || '');
                anchor.replaceWith(document.createTextNode(text));
            } catch (e0) { }
        });
    }

    try {
        globalThis.DTUAfterDarkSmartRoomLinkerUi = {
            createMazemapSmartLink: createMazemapSmartLink,
            seedSmartRoomLinkerShadowRoot: seedSmartRoomLinkerShadowRoot,
            scheduleSmartRoomLinkerHtmlBlockProbe: scheduleSmartRoomLinkerHtmlBlockProbe,
            scheduleSmartRoomLinkerScan: scheduleSmartRoomLinkerScan,
            scheduleSmartRoomLinkerShadowSweep: scheduleSmartRoomLinkerShadowSweep,
            removeSmartRoomLinks: removeSmartRoomLinks
        };
    } catch (eUi) { }
})();
