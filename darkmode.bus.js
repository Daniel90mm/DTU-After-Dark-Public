(function () {
    'use strict';
    var busApi = globalThis.DTUAfterDarkBusApi;
    if (!busApi
        || typeof busApi.isApiQuotaExhausted !== 'function'
        || typeof busApi.consumeBusApiRequestBudget !== 'function'
        || typeof busApi.setApiQuotaExhausted !== 'function'
        || typeof busApi.showQuotaExhaustedMessage !== 'function') {
        throw new Error('DTU After Dark: darkmode.bus.api.js must load before darkmode.bus.js');
    }

    var busPresets = globalThis.DTUAfterDarkBusPresets;
    if (!busPresets
        || typeof busPresets.sanitizeBusStopIds !== 'function'
        || typeof busPresets.sanitizeBusCampusIds !== 'function'
        || typeof busPresets.getCampusStopIds !== 'function'
        || typeof busPresets.getCampusLineCodes !== 'function'
        || typeof busPresets.getCampusLineDefinitions !== 'function'
        || typeof busPresets.inferBusCampusesFromStopIds !== 'function'
        || typeof busPresets.getBusLineColors !== 'function'
        || typeof busPresets.getBusCampusOrder !== 'function'
        || typeof busPresets.getBusCampusPresets !== 'function'
        || typeof busPresets.getDefaultCampuses !== 'function'
        || !busPresets.BUS_TYPE_COLORS
        || !busPresets.DTU_BUS_DIRECTION_TOKENS
        || !Array.isArray(busPresets.DTU_DEFAULT_CAMPUSES)
        || !Array.isArray(busPresets.DTU_AREA_STOP_IDS)) {
        throw new Error('DTU After Dark: darkmode.bus.presets.js must load before darkmode.bus.js');
    }
    var busSetup = globalThis.DTUAfterDarkBusSetup;
    if (!busSetup
        || typeof busSetup.showBusSetupPrompt !== 'function'
        || typeof busSetup.showBusConfigModal !== 'function') {
        throw new Error('DTU After Dark: darkmode.bus.setup.js must load before darkmode.bus.js');
    }
    var BUS_TYPE_COLORS = busPresets.BUS_TYPE_COLORS;
    var DTU_BUS_DIRECTION_TOKENS = busPresets.DTU_BUS_DIRECTION_TOKENS;
    var DTU_DEFAULT_CAMPUSES = busPresets.DTU_DEFAULT_CAMPUSES;
    var DTU_AREA_STOP_IDS = busPresets.DTU_AREA_STOP_IDS;
    var sanitizeBusStopIds = busPresets.sanitizeBusStopIds;
    var sanitizeBusCampusIds = busPresets.sanitizeBusCampusIds;
    var getCampusStopIds = busPresets.getCampusStopIds;
    var getCampusLineCodes = busPresets.getCampusLineCodes;
    var getCampusLineDefinitions = busPresets.getCampusLineDefinitions;
    var inferBusCampusesFromStopIds = busPresets.inferBusCampusesFromStopIds;
    var getBusLineColors = busPresets.getBusLineColors;
    var getBusCampusOrder = busPresets.getBusCampusOrder;
    var getBusCampusPresets = busPresets.getBusCampusPresets;
    var getDefaultCampuses = busPresets.getDefaultCampuses;
    var markExt = globalThis.DTUAfterDarkDom.markExt;
    var isTopWindow = globalThis.DTUAfterDarkDom.isTopWindow;
    var normalizeWhitespace = globalThis.DTUAfterDarkDom.normalizeWhitespace;

    function getDeps() {
        try { return globalThis.DTUAfterDarkBusDeps || null; } catch (e0) { return null; }
    }

    function getRuntimeConfig() {
        try {
            if (typeof CONFIG !== 'undefined' && CONFIG) return CONFIG;
        } catch (e0) {
        }
        try {
            if (globalThis.CONFIG && typeof globalThis.CONFIG === 'object') return globalThis.CONFIG;
        } catch (e1) {
        }
        return {};
    }

    function rgbaFromHex(hex, alpha, fallbackHex) {
        var deps = getDeps();
        if (deps && typeof deps.rgbaFromHex === 'function') {
            return deps.rgbaFromHex(hex, alpha, fallbackHex);
        }
        return fallbackHex || hex || 'rgba(0,0,0,' + alpha + ')';
    }

    function isDarkModeEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDarkModeEnabled === 'function' && deps.isDarkModeEnabled());
    }

    function sendRuntimeMessage(msg, cb) {
        var deps = getDeps();
        if (deps && typeof deps.sendRuntimeMessage === 'function') {
            return deps.sendRuntimeMessage(msg, cb);
        }
        try {
            if (typeof browser !== 'undefined' && browser.runtime && typeof browser.runtime.sendMessage === 'function') {
                browser.runtime.sendMessage(msg)
                    .then(function (resp) { if (cb) cb(resp); })
                    .catch(function () { if (cb) cb(null); });
                return;
            }
            if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
                chrome.runtime.sendMessage(msg, function (resp) {
                    if (cb) cb(resp);
                });
                return;
            }
            if (cb) cb(null);
        } catch (e0) {
            if (cb) cb(null);
        }
    }

    function isFeatureFlagEnabled(key) {
        var deps = getDeps();
        if (!key) return true;
        if (deps && typeof deps.isFeatureFlagEnabled === 'function') return !!deps.isFeatureFlagEnabled(key);
        return true;
    }

    function getAdminToolsPlaceholder() {
        var deps = getDeps();
        if (deps && typeof deps.getAdminToolsPlaceholder === 'function') return deps.getAdminToolsPlaceholder();
        return null;
    }

    // Glue for the library split: the moved library files read the bus helpers
    // through this namespace, so they can load before darkmode.library.js.
    try {
        globalThis.DTUAfterDarkBusRuntime = {
            getRuntimeConfig: getRuntimeConfig,
            markExt: markExt,
            normalizeWhitespace: normalizeWhitespace,
            rgbaFromHex: rgbaFromHex,
            isTopWindow: isTopWindow,
            isDarkModeEnabled: isDarkModeEnabled,
            sendRuntimeMessage: sendRuntimeMessage,
            isFeatureFlagEnabled: isFeatureFlagEnabled,
            getAdminToolsPlaceholder: getAdminToolsPlaceholder,
            isDTULearnHomepage: isDTULearnHomepage
        };
    } catch (eBusRuntime) { }

    function splitBusLine(line) {
        var text = String(line || '').trim();
        var match = text.match(/^(\d+)([A-Z])$/);
        return match ? { number: match[1], type: match[2] } : { number: text, type: '' };
    }

    // Widget badges are styled by the widget stylesheet. opts.inline styles the badge
    // inline for the setup window, where page CSS would otherwise repaint it.
    function createBusLineBadge(line, opts) {
        var o = opts || {};
        var parts = splitBusLine(line);
        var badge = document.createElement('span');
        markExt(badge);
        badge.className = 'dtu-bus-badge';
        badge.setAttribute('data-dtu-bus-line-badge', parts.number + parts.type);
        var num = document.createElement('span');
        markExt(num);
        num.className = 'dtu-bus-badge-num';
        num.textContent = parts.number;
        badge.appendChild(num);
        var type = null;
        if (parts.type) {
            type = document.createElement('span');
            markExt(type);
            type.className = 'dtu-bus-badge-type';
            type.textContent = parts.type;
            type.style.setProperty('--bus-type-color', BUS_TYPE_COLORS[parts.type] || '#4b5563');
            badge.appendChild(type);
        }
        if (o.inline) {
            var dark = !!o.dark;
            var fontSize = o.fontSize || 13;
            var padY = Math.round(fontSize * 0.28);
            var set = function (el, name, value) { el.style.setProperty(name, value, 'important'); };
            [['display', 'inline-flex'], ['align-items', 'stretch'], ['overflow', 'hidden'],
                ['border-radius', Math.max(3, Math.round(fontSize * 0.22)) + 'px'],
                ['background', dark ? '#3a3a3a' : '#f1f1f1'], ['border', '0'],
                ['box-shadow', 'inset 0 0 0 1px ' + (dark ? '#505050' : '#d0d0d0')],
                ['font-size', fontSize + 'px'], ['font-weight', '700'], ['line-height', '1.2'],
                ['vertical-align', 'middle'], ['flex-shrink', '0'], ['opacity', '1']
            ].forEach(function (pair) { set(badge, pair[0], pair[1]); });
            if (o.minWidth) set(badge, 'min-width', o.minWidth);
            set(num, 'flex', '1 1 auto');
            set(num, 'text-align', 'center');
            set(num, 'padding', padY + 'px ' + Math.round(fontSize * 0.4) + 'px');
            set(num, 'background', 'transparent');
            set(num, 'color', dark ? '#e0e0e0' : '#1f2937');
            if (type) {
                set(type, 'padding', padY + 'px ' + Math.round(fontSize * 0.32) + 'px');
                set(type, 'background', BUS_TYPE_COLORS[parts.type] || '#4b5563');
                set(type, 'color', '#ffffff');
            }
        }
        return badge;
    }

    /* Hallmark: component: nav-bar departures widget + setup prompt, genre: utilitarian,
     * theme: DTU After Dark tokens (dark #2d2d2d/#e0e0e0, light #fff/#1f2937, --dtu-ad-accent).
     * states: default, hover, focus-visible, active (buttons); stale, empty, late (widget). */
    var BUS_STYLE_ID = 'dtu-bus-styles';
    var BUS_STYLE_CSS = ''
        // Scoped under the nav wrapper: darkmode.css paints '.d2l-navigation-s-main-wrapper *'
        // with !important, and at equal specificity load order decided, so Firefox lost
        // the badge colours in dark mode.
        + '.d2l-navigation-s-main-wrapper .dtu-bus-departures{--bus-bg:#2d2d2d;--bus-text:#e0e0e0;--bus-muted:#a3a3a3;--bus-rule:#404040;--bus-late:#fdba74;--bus-chip:#3a3a3a;--bus-chip-line:#505050;'
        + 'display:grid;grid-template-columns:auto minmax(0,11em) auto auto;column-gap:8px;row-gap:2px;align-items:center;align-self:center;'
        + 'margin-left:auto;margin-right:12px;padding:3px 12px;max-width:min(360px,40vw);min-width:92px;flex:0 1 auto;overflow:hidden;box-sizing:border-box;'
        + 'border-left:2px solid var(--dtu-ad-accent);border-radius:0 6px 6px 0;background:var(--bus-bg) !important;color:var(--bus-text) !important;font-size:12px;line-height:15px;'
        + 'font-variant-numeric:tabular-nums;white-space:nowrap}'
        + '.d2l-navigation-s-main-wrapper .dtu-bus-departures[data-theme="light"]{--bus-bg:#ffffff;--bus-text:#1f2937;--bus-muted:#5f6673;--bus-rule:#e5e7eb;--bus-late:#b45309;--bus-chip:#f1f1f1;--bus-chip-line:#d0d0d0}'
        + '.d2l-navigation-s-main-wrapper .dtu-bus-departures[data-stale="1"]{opacity:.6}'
        + '.d2l-navigation-s-main-wrapper .dtu-bus-departures .dtu-bus-row{display:contents}'
        // Loading placeholders (darkmode.skeleton.js): the nav rule above would paint them away.
        + '.d2l-navigation-s-main-wrapper .dtu-bus-departures .dtu-skel{background:var(--bus-chip-line) !important}'
        // Split tag: stretched to the column so every badge is the same width, the number
        // takes the spare room and the type letter sits flush right in Movia's colour.
        + '.d2l-navigation-s-main-wrapper .dtu-bus-departures .dtu-bus-badge{justify-self:stretch;display:inline-flex;align-items:stretch;overflow:hidden;border-radius:3px;'
        + 'font-weight:700;font-size:11px;line-height:15px;background:var(--bus-chip) !important;box-shadow:inset 0 0 0 1px var(--bus-chip-line);color:var(--bus-text) !important}'
        + '.d2l-navigation-s-main-wrapper .dtu-bus-departures .dtu-bus-badge-num{flex:1 1 auto;text-align:center;padding:0 4px;background:transparent !important;color:var(--bus-text) !important}'
        + '.d2l-navigation-s-main-wrapper .dtu-bus-departures .dtu-bus-badge-type{padding:0 3px;background:var(--bus-type-color) !important;color:#ffffff !important}'
        + '.d2l-navigation-s-main-wrapper .dtu-bus-departures .dtu-bus-badge[data-repeat="1"]{visibility:hidden}'
        + '.d2l-navigation-s-main-wrapper .dtu-bus-departures .dtu-bus-dir{color:var(--bus-muted) !important;background:transparent !important;overflow:hidden;text-overflow:ellipsis;min-width:0}'
        + '.d2l-navigation-s-main-wrapper .dtu-bus-departures .dtu-bus-min{font-weight:700;color:var(--bus-text) !important;background:transparent !important;justify-self:end}'
        + '.d2l-navigation-s-main-wrapper .dtu-bus-departures .dtu-bus-late{color:var(--bus-late) !important;background:transparent !important;font-weight:600;font-size:11px}'
        + '.d2l-navigation-s-main-wrapper .dtu-bus-departures .dtu-bus-none{color:var(--bus-muted) !important;background:transparent !important;grid-column:2 / -1}'
        + '.d2l-navigation-s-main-wrapper .dtu-bus-departures .dtu-bus-status{color:var(--bus-muted) !important;background:transparent !important;grid-column:1 / -1;overflow:hidden;text-overflow:ellipsis;min-width:0}'
        + '@media (max-width:1180px){' + '.d2l-navigation-s-main-wrapper .dtu-bus-departures{grid-template-columns:auto auto;padding:3px 8px;column-gap:6px}'
        + '.d2l-navigation-s-main-wrapper .dtu-bus-departures .dtu-bus-dir,' + '.d2l-navigation-s-main-wrapper .dtu-bus-departures .dtu-bus-late{display:none}'
        + '.d2l-navigation-s-main-wrapper .dtu-bus-departures .dtu-bus-min{justify-self:start}' + '.d2l-navigation-s-main-wrapper .dtu-bus-departures .dtu-bus-none{font-size:0}'
        + '.d2l-navigation-s-main-wrapper .dtu-bus-departures .dtu-bus-none::after{content:attr(data-short);font-size:12px}}'
        + '.dtu-bus-setup-prompt{--bp-bg:#2d2d2d;--bp-text:#e0e0e0;--bp-muted:#b3b3b3;--bp-rule:#404040;--bp-shadow:rgba(0,0,0,.45);'
        + 'position:fixed;bottom:24px;right:24px;z-index:999999;box-sizing:border-box;width:min(340px,calc(100vw - 32px));'
        + 'padding:16px 18px;border:1px solid var(--bp-rule);border-radius:10px;'
        + 'background:var(--bp-bg) !important;color:var(--bp-text) !important;box-shadow:0 6px 24px var(--bp-shadow);font:inherit;'
        + 'opacity:0;transform:translateY(8px);transition:opacity .22s cubic-bezier(.2,.8,.2,1),transform .22s cubic-bezier(.2,.8,.2,1)}'
        + '.dtu-bus-setup-prompt[data-theme="light"]{--bp-bg:#ffffff;--bp-text:#1f2937;--bp-muted:#4b5563;--bp-rule:#e5e7eb;--bp-shadow:rgba(15,23,42,.14)}'
        + '.dtu-bus-setup-prompt[data-open="1"]{opacity:1;transform:none}'
        + '.dtu-bus-setup-prompt h2{margin:0 0 6px;font-size:15px;line-height:1.3;font-weight:700;font-style:normal;color:var(--bp-text) !important;background:transparent !important}'
        + '.dtu-bus-setup-prompt p{margin:0 0 14px;font-size:13px;line-height:1.5;color:var(--bp-muted) !important;background:transparent !important}'
        + '.dtu-bus-setup-actions{display:flex;gap:8px}'
        + '.dtu-bus-setup-prompt button{font:inherit;font-size:13px;font-weight:600;line-height:1.2;padding:8px 14px;border-radius:6px;cursor:pointer;'
        + 'transition:background-color .15s cubic-bezier(.2,.8,.2,1),border-color .15s cubic-bezier(.2,.8,.2,1)}'
        + '.dtu-bus-setup-primary{flex:1 1 auto;border:1px solid var(--dtu-ad-accent-border, var(--dtu-ad-accent)) !important;'
        + 'background:var(--dtu-ad-accent) !important;color:var(--dtu-ad-accent-on, #ffffff) !important}'
        + '.dtu-bus-setup-primary:hover{background:var(--dtu-ad-accent-hover) !important}'
        + '.dtu-bus-setup-secondary{border:1px solid var(--bp-rule) !important;background:transparent !important;color:var(--bp-text) !important}'
        + '.dtu-bus-setup-secondary:hover{border-color:var(--bp-muted) !important}'
        + '.dtu-bus-setup-prompt button:focus-visible{outline:2px solid var(--dtu-ad-accent);outline-offset:2px}'
        + '.dtu-bus-setup-prompt button:active{transform:translateY(1px)}'
        + '@media (prefers-reduced-motion: reduce){.dtu-bus-setup-prompt,.dtu-bus-setup-prompt button{transition:none}}';

    function ensureBusStyles() {
        var style = document.getElementById(BUS_STYLE_ID);
        if (!style) {
            style = document.createElement('style');
            style.id = BUS_STYLE_ID;
            markExt(style);
            (document.head || document.documentElement).appendChild(style);
        }
        if (style.textContent !== BUS_STYLE_CSS) style.textContent = BUS_STYLE_CSS;
    }

    // Minutes are recomputed from the departure time on every render, so the
    // widget counts down between fetches and drops buses that have left.
    function busMinutesNow(dep, nowTs) {
        if (dep && typeof dep.at === 'number') return Math.floor((dep.at - nowTs) / 60000);
        return (dep && typeof dep.minutes === 'number') ? dep.minutes : null;
    }

    // Copenhagen clock time, like the departure boards, whatever zone the computer uses.
    function formatBusClock(ts) {
        return new Date(ts).toLocaleTimeString('en-GB', {
            timeZone: 'Europe/Copenhagen', hourCycle: 'h23', hour: '2-digit', minute: '2-digit'
        });
    }

    // One row per line (its next bus) so three lines fit the nav bar; with a
    // single line its next three buses fill the rows. Each row's title lists the
    // line's next three departures with their directions.
    function buildBusWidgetModel(departures, config, nowTs) {
        var groups = {};
        var seen = {};
        (departures || []).forEach(function (dep) {
            if (!dep || !dep.line) return;
            var mins = busMinutesNow(dep, nowTs);
            if (mins !== null && mins < 0) return;
            // The same bus can come back from two stops or two pages: one row each.
            var key = dep.line + '|' + dep.direction + '|' + (typeof dep.at === 'number' ? dep.at : dep.time);
            if (seen[key]) return;
            seen[key] = true;
            (groups[dep.line] = groups[dep.line] || []).push({ dep: dep, mins: mins });
        });
        var order = [];
        var configured = (config && Array.isArray(config.lines)) ? config.lines.map(function (l) { return l && l.line; }).filter(Boolean) : [];
        configured.forEach(function (line) { if (order.indexOf(line) === -1) order.push(line); });
        // Only the chosen lines are shown; other lines appear only when none are chosen.
        if (!order.length) order = Object.keys(groups).sort();
        order = order.slice(0, 3);

        function describe(line, r) {
            var delay = typeof r.dep.delay === 'number' ? r.dep.delay : 0;
            var when = r.mins === null ? String(r.dep.time || '') : (r.mins <= 0 ? 'Now' : (r.mins < 60 ? r.mins + ' min' : (typeof r.dep.at === 'number' ? formatBusClock(r.dep.at) : String(r.dep.time || ''))));
            // Rejseplanen names Letbane stops "Ishøj St. (Letbane)"; the L badge already says it.
            var direction = String(r.dep.direction || '').replace(/ \(Letbane\)$/, '');
            return {
                direction: direction,
                when: when,
                delay: delay,
                text: line + ' to ' + direction + ': ' + when + (delay > 0 ? ', delayed ' + delay + ' min' : '')
            };
        }

        var rows = [];
        order.forEach(function (line) {
            var next = (groups[line] || []).sort(function (a, b) {
                return (a.mins === null ? 999 : a.mins) - (b.mins === null ? 999 : b.mins);
            }).slice(0, 3).map(function (r) { return describe(line, r); });
            var title = next.length ? next.map(function (d) { return d.text; }).join('\n') : line + ': no departures in the next hour';
            if (!next.length) {
                rows.push({ line: line, repeat: false, none: true, title: title });
                return;
            }
            var shown = order.length === 1 ? next : next.slice(0, 1);
            shown.forEach(function (d, i) {
                rows.push({ line: line, repeat: i > 0, none: false, direction: d.direction, when: d.when, delay: d.delay, title: title });
            });
        });
        return rows;
    }

    var _busRenderTimer = null;

    function insertBusDisplay() {
        if (!isDTULearnHomepage() || !isBusEnabled()) {
            var existing = document.querySelector('.dtu-bus-departures');
            if (existing) existing.remove();
            if (_busRenderTimer) { clearInterval(_busRenderTimer); _busRenderTimer = null; }
            return;
        }

        var mainWrapper = document.querySelector('.d2l-navigation-s-main-wrapper');
        if (!mainWrapper) return;
        ensureBusStyles();

        var container = document.querySelector('.dtu-bus-departures');
        if (!container) {
            container = document.createElement('div');
            container.className = 'dtu-bus-departures';
            container.setAttribute('role', 'listitem');
            container.setAttribute('aria-label', 'Bus departures');
            markExt(container);
            mainWrapper.appendChild(container);
        } else if (container.parentElement !== mainWrapper) {
            try { mainWrapper.appendChild(container); } catch (e) { }
        }

        var theme = isDarkModeEnabled() ? 'dark' : 'light';
        if (container.getAttribute('data-theme') !== theme) container.setAttribute('data-theme', theme);

        var state = readUiState();
        var now = Date.now();
        var departures = Array.isArray(state.cachedDepartures) ? state.cachedDepartures : [];
        var model = buildBusWidgetModel(departures, getBusConfig(), now);
        if (_busConfigUnreadable) model = [];
        var hasRows = model.some(function (r) { return !r.none; });
        var stale = !!(state.lastBusFetch && (now - state.lastBusFetch) > 5 * 60 * 1000);
        // "Loading" only until the first fetch finishes, so a refetch never flips an empty
        // widget back and forth; a failed fetch says so instead of claiming no buses.
        var status = hasRows ? '' : _busConfigUnreadable ? 'Bus settings could not be read'
            : (busApi.isApiQuotaExhausted() ? 'Bus times paused until next month'
            : (!state.busHasResult ? 'Loading bus times'
                : (state.busLastFetchFailed ? 'Bus times unavailable, retrying' : 'No upcoming buses')));
        var sig = JSON.stringify([model, status, stale]);

        if (!_busRenderTimer) {
            _busRenderTimer = setInterval(function () {
                if (document.hidden) return;
                if (!document.querySelector('.dtu-bus-departures')) {
                    clearInterval(_busRenderTimer);
                    _busRenderTimer = null;
                    return;
                }
                // Re-render the countdown; this also refetches early once every
                // cached bus has left (the poll interval drops to 15 s then).
                updateBusDepartures();
            }, 30000);
        }
        if (container.getAttribute('data-sig') === sig) return;
        container.setAttribute('data-sig', sig);
        if (stale) {
            container.setAttribute('data-stale', '1');
            container.title = 'Last updated ' + formatBusClock(state.lastBusFetch);
        } else {
            container.removeAttribute('data-stale');
            container.removeAttribute('title');
        }

        var wasLoading = !!container.querySelector('[data-dtu-skel-block]');
        while (container.firstChild) container.removeChild(container.firstChild);

        if (!hasRows && !state.busHasResult && !_busConfigUnreadable && !busApi.isApiQuotaExhausted()) {
            // Two departure rows' worth of bars until the first fetch answers.
            var departure = [['34px', '13px'], ['', '9px', 'dtu-skel-grow'], ['30px', '11px']];
            var placeholder = skeletonApi().block('Loading bus times', [departure, departure], markExt);
            placeholder.style.cssText = 'grid-column:1 / -1;gap:7px;min-width:150px;padding:2px 0';
            container.appendChild(placeholder);
            return;
        }

        if (!hasRows) {
            var empty = document.createElement('span');
            markExt(empty);
            empty.className = 'dtu-bus-status';
            empty.textContent = status;
            container.appendChild(empty);
            return;
        }

        model.forEach(function (r) {
            var row = document.createElement('div');
            markExt(row);
            row.className = 'dtu-bus-row';
            row.setAttribute('role', 'group');
            row.setAttribute('aria-label', r.title.replace(/\n/g, '; '));

            var badge = createBusLineBadge(r.line);
            badge.title = r.title;
            if (r.repeat) badge.setAttribute('data-repeat', '1');
            row.appendChild(badge);

            if (r.none) {
                var none = document.createElement('span');
                markExt(none);
                none.className = 'dtu-bus-none';
                none.textContent = 'none soon';
                none.setAttribute('data-short', 'none');
                none.title = r.title;
                row.appendChild(none);
            } else {
                var dir = document.createElement('span');
                markExt(dir);
                dir.className = 'dtu-bus-dir';
                dir.textContent = r.direction;
                dir.title = r.title;

                var mins = document.createElement('span');
                markExt(mins);
                mins.className = 'dtu-bus-min';
                mins.textContent = r.when;

                var late = document.createElement('span');
                markExt(late);
                late.className = 'dtu-bus-late';
                late.textContent = r.delay > 0 ? 'delayed ' + r.delay + ' min' : '';

                // Reads "150S  Nørreport St.  7 min"; below 1180px the direction
                // and late tag are hidden so the minutes always fit.
                row.appendChild(dir);
                row.appendChild(mins);
                row.appendChild(late);
            }
            container.appendChild(row);
        });
        if (wasLoading) skeletonApi().reveal(container, markExt);
    }

    function skeletonApi() {
        var skel = globalThis.DTUAfterDarkSkeleton;
        if (!skel) throw new Error('DTUAfterDarkSkeleton missing: load darkmode.skeleton.js before darkmode.bus.js');
        return skel;
    }

const LIVE_TRANSIT_API_BASE = getRuntimeConfig().LIVE_TRANSIT_API_BASE || '';
    const REJSEPLANEN_API = 'https://www.rejseplanen.dk/api';
    const REJSEPLANEN_KEY = getRuntimeConfig().REJSEPLANEN_API_KEY || '';

    const BUS_ENABLED_KEY = 'dtuDarkModeBusEnabled';
    const BUS_CONFIG_KEY = 'dtuDarkModeBusConfig';
    const BUS_SETUP_DONE_KEY = 'dtuDarkModeBusSetupDone';
    const BUS_SHARED_CACHE_KEY = 'dtuDarkModeBusSharedCacheV1';
    const BUS_FETCH_LEASE_KEY = 'dtuDarkModeBusFetchLeaseV1';
    const BUS_FETCH_LEASE_MS = 25000;
    const BUS_LEASE_WAIT_RETRY_MS = 2500;
    const BUS_SHARED_CACHE_MAX_AGE_MS = 1000 * 60 * 3;
    const BUS_ERROR_BACKOFF_BASE_MS = 30000;
    const BUS_ERROR_BACKOFF_MAX_MS = 1000 * 60 * 5;
    const BUS_MAX_CONFIGURED_LINES = 3;
    const BUS_TAB_ID = 'tab-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);

    let _lastBusFetch = 0;
    let _cachedDepartures = [];
    let _busFetchInProgress = false;
    // A fetch has finished at least once (so the widget can stop saying "Loading"), and
    // whether the last one failed (so a failure is not reported as "No upcoming buses").
    let _busHasResult = false;
    let _busLastFetchFailed = false;
    let _busConsecutiveErrors = 0;
    let _busBackoffUntil = 0;
    let _busConfigModalOpen = false;
    const _busActiveControllers = new Set();

    function isBusEnabled() {
        return localStorage.getItem(BUS_ENABLED_KEY) === 'true';
    }

    function normalizeBusDirections(directions) {
        if (!Array.isArray(directions)) return [];
        var seen = {};
        var out = [];
        directions.forEach(function (d0) {
            var d = normalizeWhitespace(String(d0 || ''));
            if (!d) return;
            if (d === 'ANY' || d === '*' || /^all directions$/i.test(d)) d = '*';
            if (seen[d]) return;
            seen[d] = true;
            out.push(d);
        });
        return out;
    }

    function normalizeBusLines(lines, allowedLineSet) {
        if (!Array.isArray(lines)) return [];
        var seen = {};
        var out = [];
        lines.forEach(function (entry) {
            if (out.length >= BUS_MAX_CONFIGURED_LINES) return;
            var line = String(entry && entry.line || '').trim();
            if (!line) return;
            if (allowedLineSet && !allowedLineSet[line]) return;
            if (seen[line]) return;
            seen[line] = true;
            var dirs = normalizeBusDirections(entry && entry.directions);
            out.push({ line: line, directions: dirs });
        });
        return out;
    }

    function normalizeBusConfig(rawConfig, opts) {
        if (!rawConfig || typeof rawConfig !== 'object') {
            return null;
        }

        var campuses = sanitizeBusCampusIds(rawConfig.campuses);
        var stopIds = sanitizeBusStopIds(rawConfig.stopIds);

        if (!campuses.length) campuses = inferBusCampusesFromStopIds(stopIds);
        if (!campuses.length) campuses = DTU_DEFAULT_CAMPUSES.slice();

        var campusStops = getCampusStopIds(campuses);
        if (!stopIds.length) stopIds = campusStops.slice();
        if (!stopIds.length) stopIds = DTU_AREA_STOP_IDS.slice();

        var allowedLines = {};
        getCampusLineCodes(campuses).forEach(function (line) { allowedLines[line] = true; });
        var lines = normalizeBusLines(rawConfig.lines, allowedLines);

        if (opts && opts.keepUnknownLines) {
            lines = normalizeBusLines(rawConfig.lines, null);
        }
        // An old or damaged config with no usable lines list gets the campus defaults
        // instead of a widget that quietly shows nothing.
        if (!lines.length && !(Array.isArray(rawConfig.lines) && !rawConfig.lines.length)) {
            lines = buildDefaultBusConfig(campuses).lines;
        }

        return {
            campuses: campuses,
            stopIds: stopIds,
            lines: lines
        };
    }

    function buildDefaultBusConfig(campuses) {
        var selectedCampuses = sanitizeBusCampusIds(campuses);
        if (!selectedCampuses.length) selectedCampuses = DTU_DEFAULT_CAMPUSES.slice();
        return {
            campuses: selectedCampuses,
            stopIds: getCampusStopIds(selectedCampuses),
            lines: getCampusLineCodes(selectedCampuses).slice(0, BUS_MAX_CONFIGURED_LINES).map(function (line) {
                return { line: line, directions: ['*'] };
            })
        };
    }

    // True when bus settings are saved but cannot be read. Callers still get the default
    // config to work with, but the widget says so and fetches nothing, instead of quietly
    // showing departures for stops the student never chose. Saving settings clears it.
    var _busConfigUnreadable = false;

    function getBusConfig() {
        _busConfigUnreadable = false;
        try {
            var raw = localStorage.getItem(BUS_CONFIG_KEY);
            if (!raw) return buildDefaultBusConfig();
            var normalized = normalizeBusConfig(JSON.parse(raw));
            if (normalized) return normalized;
        } catch (e) {
            // reported through _busConfigUnreadable
        }
        _busConfigUnreadable = true;
        return buildDefaultBusConfig();
    }

    // A bus leaving now has 0 minutes and sorts first; only a missing time sorts last.
    function busMinutesForSort(dep) {
        return (dep && typeof dep.minutes === 'number' && isFinite(dep.minutes)) ? dep.minutes : 999;
    }

    function saveBusConfig(config) {
        var normalized = normalizeBusConfig(config, { keepUnknownLines: true }) || buildDefaultBusConfig();
        localStorage.setItem(BUS_CONFIG_KEY, JSON.stringify(normalized));
        try { localStorage.removeItem(BUS_SHARED_CACHE_KEY); } catch (e0) { }
        try { localStorage.removeItem(BUS_FETCH_LEASE_KEY); } catch (e1) { }
    }

    function getLocalBusDirectionOptions(lineCode, config) {
        var line = String(lineCode || '').trim();
        if (!line) return [];
        var seen = {};
        var out = [];

        function shouldKeepBusDirectionOption(lineCode0, rawDir) {
            var lineNorm = String(lineCode0 || '').trim().toUpperCase();
            var dirNorm = normalizeWhitespace(String(rawDir || '')).toLowerCase();
            if (!dirNorm) return false;
            if (lineNorm !== '40E' && /rævehøjvej|raevehøjvej|raevehojvej|r[æa]veh[øo]jvej/.test(dirNorm)) {
                return false;
            }
            if (lineNorm === '600S' && /\bris[øo](?![a-zæøå0-9])/.test(dirNorm)) {
                return false;
            }
            return true;
        }

        function pushDir(rawDir) {
            var dir = normalizeWhitespace(String(rawDir || ''));
            if (!dir || dir === '*') return;
            if (!shouldKeepBusDirectionOption(line, dir)) return;
            var key = dir.toLowerCase();
            if (seen[key]) return;
            seen[key] = true;
            out.push(dir);
        }

        var lineCfgs = (config && Array.isArray(config.lines)) ? config.lines : [];
        lineCfgs.forEach(function (entry) {
            if (!entry || entry.line !== line) return;
            normalizeBusDirections(entry.directions).forEach(pushDir);
        });

        var presets = DTU_BUS_DIRECTION_TOKENS[line];
        if (Array.isArray(presets)) presets.forEach(pushDir);

        if (Array.isArray(_cachedDepartures)) {
            _cachedDepartures.forEach(function (dep) {
                if (!dep || dep.line !== line) return;
                pushDir(dep.direction);
            });
        }

        var shared = getBusSharedCache();
        if (shared && Array.isArray(shared.departures)) {
            shared.departures.forEach(function (dep) {
                if (!dep || dep.line !== line) return;
                pushDir(dep.direction);
            });
        }

        return out;
    }

    function registerBusFetchController(controller) {
        if (!controller) return;
        _busActiveControllers.add(controller);
    }

    function unregisterBusFetchController(controller) {
        if (!controller) return;
        _busActiveControllers.delete(controller);
    }

    function abortInFlightBusRequests() {
        _busActiveControllers.forEach(function (controller) {
            try { controller.abort(); } catch (e) { }
        });
        _busActiveControllers.clear();
    }

    function getBusBackoffRemainingMs(nowTs) {
        var now = typeof nowTs === 'number' ? nowTs : Date.now();
        if (_busBackoffUntil <= now) return 0;
        return _busBackoffUntil - now;
    }

    function noteBusFetchOutcome(meta) {
        if (!meta || typeof meta !== 'object') return;
        var requestCount = typeof meta.requestCount === 'number' ? meta.requestCount : 0;
        var successCount = typeof meta.successCount === 'number' ? meta.successCount : 0;
        var errorCount = typeof meta.errorCount === 'number' ? meta.errorCount : 0;
        if (requestCount <= 0) return;
        if (successCount > 0) {
            _busConsecutiveErrors = 0;
            _busBackoffUntil = 0;
            return;
        }
        if (errorCount <= 0) return;
        _busConsecutiveErrors++;
        var delay = BUS_ERROR_BACKOFF_BASE_MS * Math.pow(2, Math.max(0, _busConsecutiveErrors - 1));
        delay = Math.min(delay, BUS_ERROR_BACKOFF_MAX_MS);
        _busBackoffUntil = Date.now() + delay;
    }

    function getBusSharedCache() {
        try {
            var raw = localStorage.getItem(BUS_SHARED_CACHE_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed.ts !== 'number' || !Array.isArray(parsed.departures)) return null;
            return parsed;
        } catch (e) {
            return null;
        }
    }

    function getBusConfigSignature(config) {
        if (!config || typeof config !== 'object') return '';
        var campuses = Array.isArray(config.campuses) ? config.campuses.map(function (id) {
            return String(id || '').trim().toLowerCase();
        }).filter(Boolean) : [];
        campuses.sort();

        var stopIds = Array.isArray(config.stopIds) ? config.stopIds.map(function (id) {
            return String(id || '').trim();
        }).filter(Boolean) : [];
        stopIds.sort();

        var lines = Array.isArray(config.lines) ? config.lines.map(function (lineCfg) {
            var dirs = Array.isArray(lineCfg && lineCfg.directions) ? lineCfg.directions.map(function (d) {
                return String(d || '').trim();
            }).filter(Boolean) : [];
            dirs.sort();
            return {
                line: String(lineCfg && lineCfg.line || '').trim(),
                directions: dirs
            };
        }).filter(function (lineCfg) {
            return !!lineCfg.line;
        }) : [];
        lines.sort(function (a, b) { return a.line.localeCompare(b.line); });

        return JSON.stringify({ campuses: campuses, stopIds: stopIds, lines: lines });
    }

    function consumeBusSharedCache(maxAgeMs, expectedConfigSig) {
        var payload = getBusSharedCache();
        if (!payload) return false;
        var now = Date.now();
        var ttl = (typeof maxAgeMs === 'number' && maxAgeMs > 0) ? maxAgeMs : BUS_SHARED_CACHE_MAX_AGE_MS;
        if (now - payload.ts > ttl) return false;
        if (expectedConfigSig && payload.configSig !== expectedConfigSig) return false;
        if (payload.ts <= _lastBusFetch && _cachedDepartures.length > 0) return false;
        // A cache whose buses have all left is no better than none: fetch instead.
        var upcoming = payload.departures.some(function (dep) {
            return !dep || typeof dep.at !== 'number' || dep.at >= now - 60000;
        });
        if (payload.departures.length && !upcoming) return false;
        _cachedDepartures = payload.departures;
        _lastBusFetch = payload.ts;
        _busHasResult = true;
        _busLastFetchFailed = false;
        _busConsecutiveErrors = 0;
        _busBackoffUntil = 0;
        return true;
    }

    function saveBusSharedCache(departures, configSig) {
        try {
            localStorage.setItem(BUS_SHARED_CACHE_KEY, JSON.stringify({
                ts: Date.now(),
                departures: Array.isArray(departures) ? departures : [],
                configSig: String(configSig || '')
            }));
        } catch (e) {
            // ignore
        }
    }

    function readBusFetchLease() {
        try {
            var raw = localStorage.getItem(BUS_FETCH_LEASE_KEY);
            if (!raw) return null;
            var lease = JSON.parse(raw);
            if (!lease || typeof lease.owner !== 'string' || typeof lease.expiresAt !== 'number') return null;
            return lease;
        } catch (e) {
            return null;
        }
    }

    function tryAcquireBusFetchLease() {
        var now = Date.now();
        function heldByOther(lease) {
            return !!lease && lease.expiresAt > now && lease.owner !== BUS_TAB_ID;
        }
        if (heldByOther(readBusFetchLease())) return false;
        // localStorage has no compare-and-set. Reading again right before the write, then
        // confirming after it, leaves only a tiny window for two tabs to both win (the
        // cost then is one extra request, never wrong data).
        if (heldByOther(readBusFetchLease())) return false;
        try {
            localStorage.setItem(BUS_FETCH_LEASE_KEY, JSON.stringify({
                owner: BUS_TAB_ID,
                expiresAt: now + BUS_FETCH_LEASE_MS
            }));
        } catch (e) {
            // If storage write fails, fail open so one tab can still fetch.
            return true;
        }
        var confirm = readBusFetchLease();
        return !confirm || confirm.owner === BUS_TAB_ID;
    }

    function releaseBusFetchLease() {
        var lease = readBusFetchLease();
        if (!lease || lease.owner !== BUS_TAB_ID) return;
        try {
            localStorage.removeItem(BUS_FETCH_LEASE_KEY);
        } catch (e) {
            // ignore
        }
    }

    function isDTULearnHomepage() {
        return window.location.hostname === 'learn.inside.dtu.dk'
            && (
                /^\/d2l\/home\/?$/.test(window.location.pathname)
                || /^\/d2l\/lp\/ouHome\/defaultHome\.d2l\/?$/i.test(window.location.pathname)
            );
    }

    function isDTULearnQuizSubmissionsPage() {
        return window.location.hostname === 'learn.inside.dtu.dk'
            && /\/d2l\/lms\/quizzing\/user\/quiz_submissions\.d2l$/i.test(window.location.pathname);
    }

    function styleQuizSubmissionHistogram(rootNode) {
        if (!isDTULearnQuizSubmissionsPage()) return;

        var root = (rootNode && rootNode.querySelectorAll) ? rootNode : document;
        function forceDark1(el) {
            if (!el || !el.style) return;
            var alreadyDark1 = String(el.style.getPropertyValue('background-color') || '').replace(/\s+/g, '').toLowerCase() === '#1a1a1a'
                && el.style.getPropertyPriority('background-color') === 'important'
                && String(el.style.getPropertyValue('color') || '').replace(/\s+/g, '').toLowerCase() === '#e0e0e0'
                && el.style.getPropertyPriority('color') === 'important';
            if (alreadyDark1) return;
            el.style.setProperty('background', '#1a1a1a', 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('color', '#e0e0e0', 'important');
            el.style.setProperty('border-color', '#404040', 'important');
        }

        // The attempt/overall grade is structural metadata, not a raised badge.
        // Its nested legacy .dco wrappers otherwise inherit the dark-2 baseline.
        root.querySelectorAll('.d2l-grades-score, .d2l-grades-score .dco, .d2l-grades-score .dco_c').forEach(forceDark1);

        // Grade rows with blue/white graph bars should keep a dark-1 row background.
        root.querySelectorAll('tr').forEach(function (row) {
            if (!row.querySelector('img[src*="Framework.GraphBar"]')) return;

            row.querySelectorAll('td.d_tl.d_tm.d_tn, td.d_tr.d_tm.d_tn').forEach(function (td) { forceDark1(td); });
            row.querySelectorAll('.d2l-grades-score, .dco, .dco_c').forEach(forceDark1);
            row.querySelectorAll('label').forEach(function (label) {
                if (!label || !label.style) return;
                label.style.setProperty('color', '#e0e0e0', 'important');
                label.style.setProperty('background-color', '#1a1a1a', 'important');
                label.style.setProperty('background-image', 'none', 'important');
            });
        });
    }

    var BUS_FETCH_TIMEOUT_MS = 8000;

    function startBusFetchGuard() {
        var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var timeoutId = null;
        var timedOut = false;
        if (controller) {
            registerBusFetchController(controller);
            timeoutId = setTimeout(function () {
                // A slow proxy is a failed fetch, not the tab leaving: it must back off
                // instead of being retried at once as an abort is.
                timedOut = true;
                controller.abort();
            }, BUS_FETCH_TIMEOUT_MS);
        }
        return {
            controller: controller,
            timedOut: function () { return timedOut; },
            stop: function () {
                if (timeoutId) clearTimeout(timeoutId);
                if (controller) unregisterBusFetchController(controller);
            }
        };
    }

    // Get departures for a specific stop
    async function getDepartures(stopId, options) {
        if (busApi.isApiQuotaExhausted()) return { departures: [], ok: false, reason: 'quota' };
        var consumeBudget = !options || options.consumeBudget !== false;
        if (consumeBudget && !busApi.consumeBusApiRequestBudget()) {
            return { departures: [], ok: false, reason: 'daily' };
        }
        var maxJourneys = parseInt(options && options.maxJourneys, 10);
        if (!Number.isFinite(maxJourneys) || maxJourneys <= 0) maxJourneys = 30;
        var url = '';
        var useProxy = !!LIVE_TRANSIT_API_BASE;
        if (useProxy) {
            url = LIVE_TRANSIT_API_BASE + '/v1/transit/departures?stopId=' + encodeURIComponent(stopId)
                + '&maxJourneys=' + encodeURIComponent(String(maxJourneys));
        } else if (REJSEPLANEN_KEY) {
            url = REJSEPLANEN_API + '/departureBoard?accessId=' + encodeURIComponent(REJSEPLANEN_KEY)
                + '&format=json&id=' + encodeURIComponent(stopId)
                + '&maxJourneys=' + encodeURIComponent(String(maxJourneys));
        } else {
            return { departures: [], ok: false, reason: 'not_configured' };
        }

        var fetchGuard = startBusFetchGuard();

        try {
            const fetchOptions = fetchGuard.controller ? { signal: fetchGuard.controller.signal } : undefined;
            const resp = await fetch(url, fetchOptions);
            if (!resp.ok) {
                // Only 429 means the quota is spent; a 403 can be a proxy or WAF
                // hiccup and gets the normal error backoff instead of a month off.
                if (resp.status === 429) {
                    busApi.setApiQuotaExhausted();
                    busApi.showQuotaExhaustedMessage('monthly');
                    return { departures: [], ok: false, reason: 'quota' };
                }
                return { departures: [], ok: false, reason: 'http' };
            }
            const rawData = await resp.json();
            const data = useProxy ? (rawData && rawData.ok ? rawData.data : null) : rawData;
            if (useProxy && (!rawData || !rawData.ok || !data)) {
                if (rawData && rawData.error === 'upstream_quota') {
                    busApi.setApiQuotaExhausted();
                    busApi.showQuotaExhaustedMessage('monthly');
                    return { departures: [], ok: false, reason: 'quota' };
                }
                return { departures: [], ok: false, reason: 'http' };
            }
            const deps = data.DepartureBoard ? data.DepartureBoard.Departure : (data.Departure || []);
            const arr = !Array.isArray(deps) ? (deps ? [deps] : []) : deps;
            arr.forEach(d => {
                if (!d.line) {
                    if (d.ProductAtStop && d.ProductAtStop.line) d.line = d.ProductAtStop.line;
                    else if (d.Product && d.Product[0] && d.Product[0].line) d.line = d.Product[0].line;
                }
            });
            return { departures: arr, ok: true, reason: 'ok' };
        } catch (e) {
            if (e && e.name === 'AbortError' && !fetchGuard.timedOut()) {
                return { departures: [], ok: false, reason: 'aborted' };
            }
            return { departures: [], ok: false, reason: fetchGuard.timedOut() ? 'timeout' : 'network' };
        } finally {
            fetchGuard.stop();
        }
    }

    // Rejseplanen gives Copenhagen wall-clock times; read them in that zone whatever zone
    // the computer is set to. On the autumn night 02:00 to 02:59 happens twice: the first
    // one not more than 5 minutes gone is meant. A time skipped in spring reads as CEST.
    function copenhagenTimestamp(dateStr, timeStr) {
        var date = String(dateStr || '');
        var dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
        var dotted = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(date);
        var tm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(timeStr || ''));
        if (!tm || (!dm && !dotted)) return null;
        var y = dm ? +dm[1] : +(dotted[3].length === 2 ? '20' + dotted[3] : dotted[3]);
        var mo = dm ? +dm[2] : +dotted[2];
        var d = dm ? +dm[3] : +dotted[1];
        var wall = Date.UTC(y, mo - 1, d, +tm[1], +tm[2], +(tm[3] || 0));
        if (isNaN(wall)) return null;
        function wallOf(ts) {
            var p = globalThis.DTUAfterDarkDom.copenhagenParts(ts);
            return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
        }
        var fits = [wall - 7200000, wall - 3600000].filter(function (ts) { return wallOf(ts) === wall; });
        if (!fits.length) return wall - 7200000;
        var now = Date.now();
        for (var i = 0; i < fits.length; i++) {
            if (fits[i] >= now - 5 * 60000) return fits[i];
        }
        return fits[fits.length - 1];
    }

    // Calculate minutes until a departure
    function minutesUntilDeparture(dep) {
        var ts = copenhagenTimestamp(dep.rtDate || dep.date, dep.rtTime || dep.time);
        if (ts === null) return null;
        return Math.round((ts - Date.now()) / 60000);
    }

    function getDelayMinutes(dep) {
        if (!dep.rtTime || !dep.time || dep.rtTime === dep.time) return 0;
        var scheduled = dep.time.split(':');
        var realtime = dep.rtTime.split(':');
        if (scheduled.length < 2 || realtime.length < 2) return 0;
        var sMins = parseInt(scheduled[0], 10) * 60 + parseInt(scheduled[1], 10);
        var rMins = parseInt(realtime[0], 10) * 60 + parseInt(realtime[1], 10);
        var diff = rMins - sMins;
        // Handle midnight wrap (e.g. scheduled 23:58, realtime 00:01)
        if (diff < -720) diff += 1440;
        return diff > 0 ? diff : 0;
    }

    // Format the time display, showing delay as (+N)
    function formatDepartureTime(dep) {
        const mins = minutesUntilDeparture(dep);
        if (mins === null) return dep.rtTime || dep.time;
        if (mins <= 0) return 'Now';
        if (mins < 60) return mins + ' min';
        return (dep.rtTime || dep.time).substring(0, 5);
    }

    function departureTimestamp(dep) {
        return copenhagenTimestamp(dep.rtDate || dep.date, dep.rtTime || dep.time);
    }

    function mapBusDepartureForDisplay(dep) {
        return {
            at: departureTimestamp(dep),
            delay: getDelayMinutes(dep),
            line: dep.line,
            direction: dep.direction,
            time: formatDepartureTime(dep),
            minutes: minutesUntilDeparture(dep)
        };
    }

    // Fetch departures sequentially, stopping early once we have 3 per configured line
    var DEPS_PER_LINE = 3;

    function hasRestrictiveBusDirectionFilters(config) {
        var lines = (config && Array.isArray(config.lines)) ? config.lines : [];
        return lines.some(function (lineCfg) {
            var dirs = Array.isArray(lineCfg && lineCfg.directions) ? lineCfg.directions : [];
            return dirs.length > 0 && dirs.indexOf('*') === -1;
        });
    }

    function buildAllDirectionsBusConfig(config) {
        if (!config || !Array.isArray(config.lines)) return config;
        return {
            campuses: Array.isArray(config.campuses) ? config.campuses.slice() : [],
            stopIds: Array.isArray(config.stopIds) ? config.stopIds.slice() : [],
            lines: config.lines.map(function (lineCfg) {
                return {
                    line: String(lineCfg && lineCfg.line || ''),
                    directions: ['*']
                };
            }).filter(function (lineCfg) {
                return !!lineCfg.line;
            })
        };
    }

    // A departure is shown only for a chosen line (exact code: 40 is not 40E) heading a
    // chosen direction (no directions or '*' means any; a direction matches by substring).
    function busDepartureMatchesConfig(dep, config) {
        var lines = (config && Array.isArray(config.lines)) ? config.lines : [];
        var configLine = lines.find(function (l) { return l && l.line === (dep && dep.line); });
        if (!configLine) return false;
        var dirs = Array.isArray(configLine.directions) ? configLine.directions : [];
        if (!dirs.length || dirs.indexOf('*') !== -1) return true;
        var depDir = normalizeWhitespace(String(dep.direction || '')).toLowerCase();
        return dirs.some(function (d) {
            var token = normalizeWhitespace(String(d || '')).toLowerCase();
            return !!token && !!depDir && depDir.indexOf(token) !== -1;
        });
    }

    async function fetchBusWidgetDepartures(config, opts) {
        if (busApi.isApiQuotaExhausted()) return { departures: [], ok: false, reason: 'quota' };
        if (!LIVE_TRANSIT_API_BASE) return { departures: [], ok: false, reason: 'not_configured' };
        if (!config || !Array.isArray(config.stopIds) || !config.stopIds.length) {
            return { departures: [], ok: true, reason: 'ok' };
        }
        if (!Array.isArray(config.lines) || !config.lines.length) {
            return { departures: [], ok: true, reason: 'ok' };
        }
        if (!(opts && opts.consumeBudget === false) && !busApi.consumeBusApiRequestBudget()) {
            return { departures: [], ok: false, reason: 'daily' };
        }

        var fetchGuard = startBusFetchGuard();

        try {
            const resp = await fetch(LIVE_TRANSIT_API_BASE + '/v1/transit/widget', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stopIds: config.stopIds,
                    lines: config.lines,
                    maxJourneys: 30,
                    departuresPerLine: DEPS_PER_LINE
                }),
                signal: fetchGuard.controller ? fetchGuard.controller.signal : undefined
            });
            if (!resp.ok) {
                // Only 429 means the quota is spent; a 403 can be a proxy or WAF
                // hiccup and gets the normal error backoff instead of a month off.
                if (resp.status === 429) {
                    busApi.setApiQuotaExhausted();
                    busApi.showQuotaExhaustedMessage('monthly');
                    return { departures: [], ok: false, reason: 'quota' };
                }
                return { departures: [], ok: false, reason: 'http' };
            }
            const wrapper = await resp.json();
            if (!wrapper || !wrapper.ok) {
                if (wrapper && wrapper.error === 'upstream_quota') {
                    busApi.setApiQuotaExhausted();
                    busApi.showQuotaExhaustedMessage('monthly');
                    return { departures: [], ok: false, reason: 'quota' };
                }
                return { departures: [], ok: false, reason: 'http' };
            }
            var raw = wrapper.data && Array.isArray(wrapper.data.departures) ? wrapper.data.departures : [];
            var departures = raw.map(mapBusDepartureForDisplay);
            departures.sort(function (a, b) { return busMinutesForSort(a) - busMinutesForSort(b); });
            return { departures: departures, ok: true, reason: 'ok' };
        } catch (e) {
            if (e && e.name === 'AbortError' && !fetchGuard.timedOut()) {
                return { departures: [], ok: false, reason: 'aborted' };
            }
            return { departures: [], ok: false, reason: fetchGuard.timedOut() ? 'timeout' : 'network' };
        } finally {
            fetchGuard.stop();
        }
    }

    async function fetchBusDeparturesLegacy(configOverride) {
        if (busApi.isApiQuotaExhausted()) return [];
        const config = configOverride || getBusConfig();
        if (!config || !config.stopIds || config.stopIds.length === 0) return [];

        _busFetchInProgress = true;
        const allDeps = [];
        const seen = new Set();
        var requestCount = 0;
        var successCount = 0;
        var errorCount = 0;
        var aborted = false;
        // Track how many departures we have per line
        const lineCounts = {};
        config.lines.forEach(function (l) { lineCounts[l.line] = 0; });

        function hasEnough() {
            return config.lines.every(function (l) { return lineCounts[l.line] >= DEPS_PER_LINE; });
        }

        try {
            // Fetch stops one by one, stop early when we have enough
            for (var i = 0; i < config.stopIds.length; i++) {
                if (hasEnough()) break;
                // Each stop is its own upstream call, so each one counts toward the daily cap.
                var depResult = await getDepartures(config.stopIds[i], {});
                if (depResult && depResult.reason === 'daily') break;
                requestCount++;
                if (depResult && depResult.ok) successCount++;
                else if (depResult && (depResult.reason === 'http' || depResult.reason === 'network' || depResult.reason === 'timeout')) errorCount++;
                if (depResult && depResult.reason === 'aborted') { aborted = true; break; }
                var deps = depResult && Array.isArray(depResult.departures) ? depResult.departures : [];
                deps.forEach(function (dep) {
                    if (!busDepartureMatchesConfig(dep, config)) return;
                    if (lineCounts[dep.line] >= DEPS_PER_LINE) return;

                    var key = dep.line + '|' + dep.direction + '|' + dep.time + '|' + dep.date;
                    if (seen.has(key)) return;
                    seen.add(key);

                    lineCounts[dep.line]++;
                    allDeps.push(mapBusDepartureForDisplay(dep));
                });
            }
        } catch (e) {
            // Silently fail
        } finally {
            _busFetchInProgress = false;
        }
        noteBusFetchOutcome({ requestCount: requestCount, successCount: successCount, errorCount: errorCount });
        if (aborted) return null;
        _busLastFetchFailed = successCount === 0 && errorCount > 0;
        allDeps.sort(function (a, b) { return busMinutesForSort(a) - busMinutesForSort(b); });
        return allDeps;
    }

    async function fetchBusDepartures() {
        _busLastFetchFailed = false;
        if (busApi.isApiQuotaExhausted()) return [];
        const config = getBusConfig();
        if (!config || !config.stopIds || config.stopIds.length === 0) return [];

        if (LIVE_TRANSIT_API_BASE) {
            function chosen(result) {
                var deps = (result && result.ok && Array.isArray(result.departures)) ? result.departures : [];
                return deps.filter(function (dep) { return busDepartureMatchesConfig(dep, config); });
            }
            var widgetResult = await fetchBusWidgetDepartures(config);
            var widgetDeps = chosen(widgetResult);
            if (widgetDeps.length) return widgetDeps;
            // The proxy matches directions more strictly than the setup names them; ask for
            // every direction and keep the chosen ones by the same substring match.
            if (widgetResult && widgetResult.ok && hasRestrictiveBusDirectionFilters(config)) {
                var relaxedConfig = buildAllDirectionsBusConfig(config);
                return chosen(await fetchBusWidgetDepartures(relaxedConfig, { consumeBudget: false }));
            }
            if (widgetResult && widgetResult.ok) return [];
            // Aborted means the tab was hidden or left mid-fetch.
            if (widgetResult && widgetResult.reason === 'aborted') return null;
            if (widgetResult && (widgetResult.reason === 'http' || widgetResult.reason === 'network' || widgetResult.reason === 'timeout')) {
                noteBusFetchOutcome({ requestCount: 1, successCount: 0, errorCount: 1 });
                _busLastFetchFailed = true;
            }
            // A spent daily or monthly limit is no answer either: keep the buses shown,
            // never cache it as "no buses" for the other tabs.
            if (widgetResult && (widgetResult.reason === 'daily' || widgetResult.reason === 'quota')) _busLastFetchFailed = true;
            // A failed widget request backs off; it never retries once per stop.
            return [];
        }
        if (!REJSEPLANEN_KEY) return [];
        return fetchBusDeparturesLegacy(config);
    }

    function readUiState() {
        return {
            lastBusFetch: _lastBusFetch,
            cachedDepartures: _cachedDepartures,
            busFetchInProgress: _busFetchInProgress,
            busHasResult: _busHasResult,
            busLastFetchFailed: _busLastFetchFailed,
            busConfigModalOpen: _busConfigModalOpen
        };
    }

    function writeUiState(patch) {
        if (!patch || typeof patch !== 'object') return;
        if (Object.prototype.hasOwnProperty.call(patch, 'lastBusFetch')) _lastBusFetch = patch.lastBusFetch;
        if (Object.prototype.hasOwnProperty.call(patch, 'cachedDepartures')) _cachedDepartures = patch.cachedDepartures;
        if (Object.prototype.hasOwnProperty.call(patch, 'busFetchInProgress')) _busFetchInProgress = patch.busFetchInProgress;
        if (Object.prototype.hasOwnProperty.call(patch, 'busConfigModalOpen')) _busConfigModalOpen = patch.busConfigModalOpen;
    }

    function getBusEnabledKey() {
        return BUS_ENABLED_KEY;
    }

    function getBusSetupDoneKey() {
        return BUS_SETUP_DONE_KEY;
    }

// Uses real departure times: fetch-time minutes go stale, and once every
    // cached bus has left the widget would sit empty until the next slow poll.
    function getSmartPollInterval() {
        if (_cachedDepartures.length === 0) return 60000;
        var now = Date.now();
        var soonest = Infinity;
        _cachedDepartures.forEach(function (dep) {
            var mins = (dep && typeof dep.at === 'number') ? (dep.at - now) / 60000 : (dep ? dep.minutes : null);
            if (mins != null && mins >= 0 && mins < soonest) soonest = mins;
        });
        if (soonest === Infinity) return 15000; // everything cached has left
        if (soonest <= 15) return 60000;
        return 120000;
    }

    function getNextBusPollInterval(nowTs) {
        var now = typeof nowTs === 'number' ? nowTs : Date.now();
        return Math.max(getSmartPollInterval(), getBusBackoffRemainingMs(now));
    }

    var _busPollingTimer = null;

    function startBusPolling() {
        stopBusPolling();
        if (!isDTULearnHomepage() || !isBusEnabled() || document.hidden) return;
        var interval = getNextBusPollInterval();
        _busPollingTimer = setTimeout(function () {
            if (document.hidden || !isDTULearnHomepage() || !isBusEnabled()) return;
            updateBusDepartures();
        }, interval);
    }

    function stopBusPolling() {
        if (_busPollingTimer) {
            clearTimeout(_busPollingTimer);
            _busPollingTimer = null;
        }
    }

    function scheduleBusLeaseRetry(delayMs) {
        var delay = (typeof delayMs === 'number' && delayMs > 0) ? delayMs : BUS_LEASE_WAIT_RETRY_MS;
        stopBusPolling();
        _busPollingTimer = setTimeout(function () {
            if (document.hidden || !isDTULearnHomepage() || !isBusEnabled()) return;
            updateBusDepartures();
        }, delay);
    }

    // Visibility API: pause when tab is hidden, resume when visible
    document.addEventListener('visibilitychange', function () {
        if (!isTopWindow()) return;
        if (document.hidden) {
            stopBusPolling();
            abortInFlightBusRequests();
        } else {
            // Tab became visible â€” do an immediate refresh then resume polling
            updateBusDepartures();
        }
    });

    // A tab that leaves mid-fetch would otherwise hold the fetch lease for up to
    // 25 s, and the next Learn homepage would show "Loading" until it expired.
    window.addEventListener('pagehide', function () {
        abortInFlightBusRequests();
        releaseBusFetchLease();
    });

    window.addEventListener('storage', function (event) {
        if (!isTopWindow()) return;
        if (!event || event.key !== BUS_SHARED_CACHE_KEY) return;
        if (!isDTULearnHomepage() || !isBusEnabled() || document.hidden) return;
        var cfg = getBusConfig();
        var sig = getBusConfigSignature(cfg);
        if (consumeBusSharedCache(BUS_SHARED_CACHE_MAX_AGE_MS, sig)) {
            insertBusDisplay();
            startBusPolling();
        }
    });

    // Orchestrate: fetch + update display + start smart polling
    async function updateBusDepartures() {
        if (!isTopWindow()) return;
        if (_busConfigModalOpen) {
            stopBusPolling();
            abortInFlightBusRequests();
            return;
        }
        if (!isDTULearnHomepage() || !isBusEnabled()) {
            stopBusPolling();
            abortInFlightBusRequests();
            insertBusDisplay();
            return;
        }
        if (document.hidden) {
            stopBusPolling();
            abortInFlightBusRequests();
            return;
        }
        const config = getBusConfig();
        if (!config || _busConfigUnreadable) {
            stopBusPolling();
            insertBusDisplay();
            return;
        }
        var configSig = getBusConfigSignature(config);

        const now = Date.now();
        var consumedShared = consumeBusSharedCache(BUS_SHARED_CACHE_MAX_AGE_MS, configSig);
        var interval = getSmartPollInterval();
        var backoffRemaining = getBusBackoffRemainingMs(now);
        if (!consumedShared && backoffRemaining <= 0 && now - _lastBusFetch >= interval && !_busFetchInProgress) {
            if (tryAcquireBusFetchLease()) {
                try {
                    var previousFetch = _lastBusFetch;
                    _lastBusFetch = now;
                    _busFetchInProgress = true;
                    var fetched;
                    try {
                        fetched = await fetchBusDepartures();
                    } finally {
                        _busFetchInProgress = false;
                    }
                    // null = aborted (tab hidden or left): keep what we had and do not
                    // overwrite the cache other tabs read with an empty list.
                    if (fetched === null) {
                        _lastBusFetch = 0;
                    } else if (_busLastFetchFailed && !fetched.length) {
                        // A failed fetch keeps the buses already shown (their minutes keep
                        // counting down) and is never shared as "no buses".
                        _busHasResult = true;
                        // Freshness stays at the last good fetch, so an old list shows as
                        // stale; the error backoff stops a refetch on every tick.
                        _lastBusFetch = previousFetch;
                    } else {
                        _cachedDepartures = fetched;
                        _busHasResult = true;
                        _busLastFetchFailed = false;
                        saveBusSharedCache(_cachedDepartures, configSig);
                    }
                } finally {
                    releaseBusFetchLease();
                }
            } else {
                var sharedApplied = consumeBusSharedCache(BUS_SHARED_CACHE_MAX_AGE_MS, configSig);
                if (!sharedApplied) {
                    insertBusDisplay();
                    scheduleBusLeaseRetry(BUS_LEASE_WAIT_RETRY_MS);
                    return;
                }
            }
        }
        insertBusDisplay();
        startBusPolling();
    }

    globalThis.DTUAfterDarkBusCore = {
        BUS_MAX_CONFIGURED_LINES: BUS_MAX_CONFIGURED_LINES,
        getBusConfig: getBusConfig,
        saveBusConfig: saveBusConfig,
        buildDefaultBusConfig: buildDefaultBusConfig,
        normalizeBusLines: normalizeBusLines,
        createBusLineBadge: createBusLineBadge,
        rgbaFromHex: rgbaFromHex,
        ensureBusStyles: ensureBusStyles,
        isDarkModeEnabled: isDarkModeEnabled,
        isDTULearnHomepage: isDTULearnHomepage,
        getBusEnabledKey: getBusEnabledKey,
        getBusSetupDoneKey: getBusSetupDoneKey,
        getLocalBusDirectionOptions: getLocalBusDirectionOptions,
        stopBusPolling: stopBusPolling,
        abortInFlightBusRequests: abortInFlightBusRequests,
        writeUiState: writeUiState,
        updateBusDepartures: updateBusDepartures
    };

    try {
        globalThis.DTUAfterDarkBusUi = {
            insertBusDisplay: insertBusDisplay,
            showBusSetupPrompt: busSetup.showBusSetupPrompt,
            showBusConfigModal: busSetup.showBusConfigModal,
            updateBusDepartures: updateBusDepartures,
            stopBusPolling: stopBusPolling,
            abortInFlightBusRequests: abortInFlightBusRequests,
            isBusEnabled: isBusEnabled,
            getBusConfig: getBusConfig,
            isApiQuotaExhausted: busApi.isApiQuotaExhausted,
            showQuotaExhaustedMessage: busApi.showQuotaExhaustedMessage,
            styleQuizSubmissionHistogram: styleQuizSubmissionHistogram
        };
    } catch (eExport) { }
})();
