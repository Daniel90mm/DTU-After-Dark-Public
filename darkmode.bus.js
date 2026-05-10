(function () {
    'use strict';

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

    function readUiState() {
        var deps = getDeps();
        if (!deps || typeof deps.getUiState !== 'function') return {};
        return deps.getUiState() || {};
    }

    function writeUiState(patch) {
        var deps = getDeps();
        if (!deps || typeof deps.setUiState !== 'function') return;
        deps.setUiState(patch || {});
    }

    function markExt(el) {
        var deps = getDeps();
        if (el && deps && typeof deps.markExt === 'function') deps.markExt(el);
        return el;
    }

    function normalizeWhitespace(text) {
        var deps = getDeps();
        if (deps && typeof deps.normalizeWhitespace === 'function') {
            return deps.normalizeWhitespace(text);
        }
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function rgbaFromHex(hex, alpha, fallbackHex) {
        var deps = getDeps();
        if (deps && typeof deps.rgbaFromHex === 'function') {
            return deps.rgbaFromHex(hex, alpha, fallbackHex);
        }
        return fallbackHex || hex || 'rgba(0,0,0,' + alpha + ')';
    }

    function isTopWindow() {
        var deps = getDeps();
        return !!(deps && typeof deps.isTopWindow === 'function' && deps.isTopWindow());
    }

    function isDTULearnHomepage() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDTULearnHomepage === 'function' && deps.isDTULearnHomepage());
    }

    function isBusEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isBusEnabled === 'function' && deps.isBusEnabled());
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

    function getResolvedAccent() {
        var deps = getDeps();
        if (deps && typeof deps.getResolvedAccent === 'function') return deps.getResolvedAccent();
        try {
            return (getComputedStyle(document.documentElement).getPropertyValue('--dtu-ad-accent') || '#1f7ae0').trim() || '#1f7ae0';
        } catch (e0) {
            return '#1f7ae0';
        }
    }

    function getBusConfig() {
        var deps = getDeps();
        if (deps && typeof deps.getBusConfig === 'function') return deps.getBusConfig();
        return null;
    }

    function buildDefaultBusConfig(campuses) {
        var deps = getDeps();
        if (deps && typeof deps.buildDefaultBusConfig === 'function') return deps.buildDefaultBusConfig(campuses);
        return { campuses: [], stopIds: [], lines: [] };
    }

    function sanitizeBusCampusIds(campuses) {
        var deps = getDeps();
        if (deps && typeof deps.sanitizeBusCampusIds === 'function') return deps.sanitizeBusCampusIds(campuses);
        return [];
    }

    function getCampusStopIds(campuses) {
        var deps = getDeps();
        if (deps && typeof deps.getCampusStopIds === 'function') return deps.getCampusStopIds(campuses);
        return [];
    }

    function getCampusLineCodes(campuses) {
        var deps = getDeps();
        if (deps && typeof deps.getCampusLineCodes === 'function') return deps.getCampusLineCodes(campuses);
        return [];
    }

    function getCampusLineDefinitions(campuses) {
        var deps = getDeps();
        if (deps && typeof deps.getCampusLineDefinitions === 'function') return deps.getCampusLineDefinitions(campuses);
        return [];
    }

    function normalizeBusLines(lines, allowedLineSet) {
        var deps = getDeps();
        if (deps && typeof deps.normalizeBusLines === 'function') return deps.normalizeBusLines(lines, allowedLineSet);
        return [];
    }

    function saveBusConfig(config) {
        var deps = getDeps();
        if (deps && typeof deps.saveBusConfig === 'function') deps.saveBusConfig(config);
    }

    function getLocalBusDirectionOptions(lineCode, config) {
        var deps = getDeps();
        if (deps && typeof deps.getLocalBusDirectionOptions === 'function') {
            return deps.getLocalBusDirectionOptions(lineCode, config);
        }
        return [];
    }

    function stopBusPolling() {
        var deps = getDeps();
        if (deps && typeof deps.stopBusPolling === 'function') deps.stopBusPolling();
    }

    function abortInFlightBusRequests() {
        var deps = getDeps();
        if (deps && typeof deps.abortInFlightBusRequests === 'function') deps.abortInFlightBusRequests();
    }

    function updateBusDepartures() {
        var deps = getDeps();
        if (deps && typeof deps.updateBusDepartures === 'function') deps.updateBusDepartures();
    }

    function getAdminToolsPlaceholder() {
        var deps = getDeps();
        if (deps && typeof deps.getAdminToolsPlaceholder === 'function') return deps.getAdminToolsPlaceholder();
        return null;
    }

    function isApiQuotaExhausted() {
        var deps = getDeps();
        return !!(deps && typeof deps.isApiQuotaExhausted === 'function' && deps.isApiQuotaExhausted());
    }

    function showQuotaExhaustedMessage(scope) {
        var deps = getDeps();
        if (deps && typeof deps.showQuotaExhaustedMessage === 'function') deps.showQuotaExhaustedMessage(scope);
    }

    function getBusLineColors() {
        var deps = getDeps();
        return (deps && deps.lineColors) || {};
    }

    function getBusCampusOrder() {
        var deps = getDeps();
        return (deps && Array.isArray(deps.campusOrder)) ? deps.campusOrder : [];
    }

    function getBusCampusPresets() {
        var deps = getDeps();
        return (deps && deps.campusPresets) || {};
    }

    function getDefaultCampuses() {
        var deps = getDeps();
        return (deps && Array.isArray(deps.defaultCampuses)) ? deps.defaultCampuses.slice() : [];
    }

    function getBusEnabledKey() {
        var deps = getDeps();
        return (deps && deps.busEnabledKey) || 'dtuDarkModeBusEnabled';
    }

    function getBusSetupDoneKey() {
        var deps = getDeps();
        return (deps && deps.busSetupDoneKey) || 'dtuDarkModeBusSetupDone';
    }

    function getLibraryDropdownFeatureKey() {
        var deps = getDeps();
        return (deps && deps.featureLibraryDropdownKey) || 'dtuAfterDarkFeatureLibraryDropdown';
    }

    function insertBusDisplay() {
        if (!isDTULearnHomepage() || !isBusEnabled()) {
            var existing = document.querySelector('.dtu-bus-departures');
            if (existing) existing.remove();
            return;
        }

        var mainWrapper = document.querySelector('.d2l-navigation-s-main-wrapper');
        if (!mainWrapper) return;

        var container = document.querySelector('.dtu-bus-departures');
        if (!container) {
            container = document.createElement('div');
            container.className = 'dtu-bus-departures';
            container.setAttribute('role', 'listitem');
            mainWrapper.appendChild(container);
        } else if (container.parentElement !== mainWrapper) {
            try {
                mainWrapper.appendChild(container);
            } catch (e) {
            }
        }

        var isDark = isDarkModeEnabled();
        container.style.cssText = 'display: flex; gap: 12px; padding: 2px 14px; '
            + 'font-size: 12px; margin-left: auto; margin-right: 12px; '
            + 'border-left: 2px solid var(--dtu-ad-accent); align-self: center; border-radius: 0 6px 6px 0; '
            + (isDark
                ? 'background: #2d2d2d !important; color: #e0e0e0 !important;'
                : 'background: #ffffff !important; color: #333 !important;');

        while (container.firstChild) container.removeChild(container.firstChild);

        var state = readUiState();
        var departures = Array.isArray(state.cachedDepartures) ? state.cachedDepartures : [];
        var fetchInProgress = !!state.busFetchInProgress;
        if (departures.length === 0) {
            var empty = document.createElement('span');
            empty.style.cssText = 'color: ' + (isDark ? '#888' : '#999') + ' !important; font-style: italic; font-size: 11px;';
            empty.textContent = fetchInProgress ? 'Loading bus times...' : 'No upcoming buses';
            container.appendChild(empty);
            return;
        }

        var lineGroups = {};
        departures.forEach(function (dep) {
            if (!lineGroups[dep.line]) lineGroups[dep.line] = [];
            lineGroups[dep.line].push(dep);
        });

        var lineOrder = Object.keys(lineGroups).sort();
        lineOrder.forEach(function (line) {
            lineGroups[line].sort(function (a, b) { return (a.minutes != null ? a.minutes : 999) - (b.minutes != null ? b.minutes : 999); });
        });

        var colors = getBusLineColors();
        lineOrder.forEach(function (line, li) {
            var col = document.createElement('div');
            col.style.cssText = 'display: flex; flex-direction: column; gap: 1px; min-width: 0;'
                + (li < lineOrder.length - 1 ? ' padding-right: 12px; border-right: 1px solid ' + (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)') + ';' : '');

            var color = colors[line] || '#1565c0';
            var badge = document.createElement('span');
            badge.style.cssText = 'display: inline-block; background-color: ' + color + ' !important; color: #fff !important; '
                + 'padding: 1px 7px; border-radius: 4px; font-weight: 700; font-size: 11px; margin-bottom: 1px; '
                + 'letter-spacing: 0.3px; text-align: center; align-self: flex-start;';
            badge.textContent = line;
            col.appendChild(badge);

            lineGroups[line].forEach(function (dep) {
                var row = document.createElement('div');
                row.style.cssText = 'display: flex; align-items: center; gap: 6px; white-space: nowrap;';

                var dir = document.createElement('span');
                dir.style.cssText = 'color: ' + (isDark ? '#b0b0b0' : '#666') + ' !important; overflow: hidden; text-overflow: ellipsis; flex: 1; font-size: 11px;';
                dir.textContent = dep.direction;

                var time = document.createElement('span');
                var timeColor = dep.delayed
                    ? (isDark ? '#ffa726' : '#e65100')
                    : (isDark ? '#66bb6a' : '#2e7d32');
                time.style.cssText = 'font-weight: bold; font-size: 11px; color: ' + timeColor + ' !important;';
                time.textContent = dep.time;

                row.appendChild(dir);
                row.appendChild(time);

                if (dep.delayTag) {
                    var delay = document.createElement('span');
                    delay.style.cssText = 'font-size: 10px; color: ' + (isDark ? '#ffa726' : '#e65100') + ' !important; font-weight: 600;';
                    delay.textContent = dep.delayTag;
                    row.appendChild(delay);
                }
                col.appendChild(row);
            });

            container.appendChild(col);
        });
    }

    function showBusSetupPrompt() {
        if (!isTopWindow()) return;
        if (!isDTULearnHomepage()) return;
        if (localStorage.getItem(getBusSetupDoneKey())) return;
        if (document.querySelector('.dtu-bus-setup-prompt')) return;

        var prompt = document.createElement('div');
        prompt.className = 'dtu-bus-setup-prompt';
        prompt.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 999999; '
            + 'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); '
            + 'border: 1px solid #1565c0; border-radius: 12px; padding: 20px 24px; '
            + 'box-shadow: 0 8px 32px rgba(21,101,192,0.3), 0 0 0 1px rgba(21,101,192,0.1); '
            + 'max-width: 360px; font-family: sans-serif; '
            + 'transform: translateX(120%); transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);';

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                prompt.style.transform = 'translateX(0)';
            });
        });

        var header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px;';

        var busIcon = document.createElement('span');
        busIcon.style.cssText = 'font-size: 28px; line-height: 1;';
        busIcon.textContent = '\uD83D\uDE8C';

        var title = document.createElement('div');
        title.style.cssText = 'color: #fff; font-size: 16px; font-weight: bold;';
        title.textContent = 'Never miss your bus!';

        header.appendChild(busIcon);
        header.appendChild(title);

        var desc = document.createElement('div');
        desc.style.cssText = 'color: #b0b0b0; font-size: 13px; margin-bottom: 16px; line-height: 1.5;';
        desc.textContent = 'Get live departure times for buses near DTU right here on your homepage.';

        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display: flex; gap: 10px;';

        var setupBtn = document.createElement('button');
        setupBtn.style.cssText = 'background: #1565c0; color: #fff; border: none; padding: 8px 20px; '
            + 'border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; flex: 1; '
            + 'transition: background 0.2s;';
        setupBtn.textContent = 'Set it up';
        setupBtn.addEventListener('mouseenter', function () { setupBtn.style.background = '#1976d2'; });
        setupBtn.addEventListener('mouseleave', function () { setupBtn.style.background = '#1565c0'; });
        setupBtn.addEventListener('click', function () {
            prompt.style.transform = 'translateX(120%)';
            setTimeout(function () { prompt.remove(); showBusConfigModal(); }, 300);
        });

        var dismissBtn = document.createElement('button');
        dismissBtn.style.cssText = 'background: transparent; color: #666; border: 1px solid #444; '
            + 'padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; '
            + 'transition: border-color 0.2s, color 0.2s;';
        dismissBtn.textContent = 'Not now';
        dismissBtn.addEventListener('mouseenter', function () { dismissBtn.style.borderColor = '#666'; dismissBtn.style.color = '#999'; });
        dismissBtn.addEventListener('mouseleave', function () { dismissBtn.style.borderColor = '#444'; dismissBtn.style.color = '#666'; });
        dismissBtn.addEventListener('click', function () {
            localStorage.setItem(getBusSetupDoneKey(), 'dismissed');
            prompt.style.transform = 'translateX(120%)';
            setTimeout(function () { prompt.remove(); }, 300);
        });

        btnRow.appendChild(setupBtn);
        btnRow.appendChild(dismissBtn);
        prompt.appendChild(header);
        prompt.appendChild(desc);
        prompt.appendChild(btnRow);
        document.body.appendChild(prompt);
    }

    function showBusConfigModal() {
        if (!isTopWindow()) return;
        var existing = document.querySelector('.dtu-bus-config-modal');
        if (existing) {
            writeUiState({ busConfigModalOpen: false });
            existing.remove();
        }

        writeUiState({ busConfigModalOpen: true });
        stopBusPolling();
        abortInFlightBusRequests();

        var MAX_LINES = BUS_MAX_CONFIGURED_LINES;
        var isDarkTheme = isDarkModeEnabled();
        var modalTheme = isDarkTheme
            ? {
                background: 'rgba(30,30,30,0.92)',
                text: '#e0e0e0',
                heading: '#fff',
                subtle: '#999',
                muted: '#888',
                border: '#404040',
                softBorder: '#555',
                overlayShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
                overlayBorder: '1px solid rgba(255,255,255,0.08)',
                hoverRow: '#383838',
                hoverAddCard: 'rgba(255,255,255,0.03)'
            }
            : {
                background: 'rgba(255,255,255,0.96)',
                text: '#1f2937',
                heading: '#111827',
                subtle: '#4b5563',
                muted: '#6b7280',
                border: '#d1d5db',
                softBorder: '#9ca3af',
                overlayShadow: '0 12px 48px rgba(15,23,42,0.22), 0 0 0 1px rgba(15,23,42,0.08)',
                overlayBorder: '1px solid rgba(15,23,42,0.12)',
                hoverRow: '#f3f4f6',
                hoverAddCard: 'rgba(17,24,39,0.04)'
            };

        var overlay = document.createElement('div');
        markExt(overlay);
        overlay.className = 'dtu-bus-config-modal';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000000; '
            + 'background: transparent !important; background-color: transparent !important; '
            + 'backdrop-filter: blur(4px) !important; -webkit-backdrop-filter: blur(4px) !important; '
            + 'display: flex; align-items: center; justify-content: center; '
            + 'font-family: sans-serif; opacity: 0; transition: opacity 0.3s;';
        requestAnimationFrame(function () { overlay.style.opacity = '1'; });

        var modal = document.createElement('div');
        markExt(modal);
        modal.style.cssText = 'background: ' + modalTheme.background + '; border-radius: 14px; padding: 28px; max-width: 480px; '
            + 'width: 90%; max-height: 80vh; overflow-y: auto; color: ' + modalTheme.text + '; '
            + 'box-shadow: ' + modalTheme.overlayShadow + '; '
            + 'border: ' + modalTheme.overlayBorder + ';';

        function setModalLayout(maxWidth) {
            modal.style.maxWidth = maxWidth || '480px';
            modal.style.width = '92%';
        }

        function getModalBusConfig() {
            return getBusConfig() || buildDefaultBusConfig();
        }

        function getCampusLabels(campuses) {
            return sanitizeBusCampusIds(campuses).map(function (cid) {
                var preset = getBusCampusPresets()[cid];
                return preset ? preset.label : cid;
            });
        }

        function getLineCampusLabels(lineCode, campuses) {
            var ids = sanitizeBusCampusIds(campuses);
            if (!ids.length) ids = getDefaultCampuses();
            var out = [];
            ids.forEach(function (cid) {
                var preset = getBusCampusPresets()[cid];
                if (!preset || !Array.isArray(preset.lines)) return;
                if (preset.lines.indexOf(lineCode) === -1) return;
                out.push(preset.label || cid);
            });
            return out;
        }

        function getAllowedLineSet(campuses) {
            var set = {};
            getCampusLineCodes(campuses).forEach(function (line) { set[line] = true; });
            return set;
        }

        function enforceBusLineBadgeStyle(badgeEl, lineColor) {
            if (!badgeEl || !badgeEl.style) return;
            var color = String(lineColor || '').trim() || '#1565c0';
            badgeEl.style.setProperty('background-color', color, 'important');
            badgeEl.style.setProperty('background', color, 'important');
            badgeEl.style.setProperty('color', '#ffffff', 'important');
            badgeEl.style.setProperty('border', 'none', 'important');
            badgeEl.style.setProperty('opacity', '1', 'important');
        }

        function persistCampusSelection(campuses) {
            var selected = sanitizeBusCampusIds(campuses);
            if (!selected.length) selected = getDefaultCampuses();

            var config = getModalBusConfig();
            var allowedLineSet = getAllowedLineSet(selected);
            config.campuses = selected.slice();
            config.stopIds = getCampusStopIds(selected);
            config.lines = normalizeBusLines(config.lines, allowedLineSet);
            saveBusConfig(config);
            return config;
        }

        var isClosing = false;

        function dismissModal() {
            if (isClosing) return;
            isClosing = true;

            var config = getBusConfig();
            if (!config || !config.lines || config.lines.length === 0) {
                localStorage.setItem(getBusEnabledKey(), 'false');
                var toggle = document.querySelector('#bus-departures-toggle');
                if (toggle) {
                    toggle.checked = false;
                    try { toggle.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { }
                }
            }
            writeUiState({ busConfigModalOpen: false });
            overlay.style.opacity = '0';
            setTimeout(function () {
                overlay.remove();
                updateBusDepartures();
            }, 200);
        }

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) dismissModal();
        });

        function renderCampusSelectionView(firstTime) {
            while (modal.firstChild) modal.removeChild(modal.firstChild);
            setModalLayout('520px');
            var config = getModalBusConfig();
            var selected = {};
            sanitizeBusCampusIds(config.campuses).forEach(function (cid) { selected[cid] = true; });
            if (!Object.keys(selected).length) {
                getDefaultCampuses().forEach(function (cid0) { selected[cid0] = true; });
            }

            var titleEl = document.createElement('h2');
            titleEl.style.cssText = 'margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: ' + modalTheme.heading + '; letter-spacing: -0.3px;';
            titleEl.textContent = 'Choose Campus Stops';
            modal.appendChild(titleEl);

            var subtitle = document.createElement('p');
            subtitle.style.cssText = 'margin: 0 0 16px 0; font-size: 14px; color: ' + modalTheme.subtle + '; line-height: 1.45;';
            subtitle.textContent = 'Select one or more campuses. The bus widget will use the combined stop list.';
            modal.appendChild(subtitle);

            var listWrap = document.createElement('div');
            listWrap.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

            getBusCampusOrder().forEach(function (cid) {
                var preset = getBusCampusPresets()[cid];
                if (!preset) return;

                var row = document.createElement('label');
                row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:10px 12px;'
                    + 'border:1px solid ' + modalTheme.border + ';border-radius:8px;cursor:pointer;';

                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = !!selected[cid];
                cb.style.cssText = 'margin-top:2px;width:16px;height:16px;accent-color:var(--dtu-ad-accent);cursor:pointer;';
                cb.addEventListener('change', function () {
                    selected[cid] = !!cb.checked;
                });

                var text = document.createElement('div');
                text.style.cssText = 'flex:1;min-width:0;';

                var name = document.createElement('div');
                name.style.cssText = 'font-size:14px;font-weight:700;color:' + modalTheme.text + ';';
                name.textContent = preset.label;

                var meta = document.createElement('div');
                meta.style.cssText = 'font-size:12px;color:' + modalTheme.muted + ';line-height:1.35;margin-top:2px;';
                meta.textContent = String((preset.stopIds || []).length) + ' stops | '
                    + (preset.lines || []).join(', ');

                text.appendChild(name);
                text.appendChild(meta);
                row.appendChild(cb);
                row.appendChild(text);
                listWrap.appendChild(row);
            });

            modal.appendChild(listWrap);

            var errorEl = document.createElement('div');
            errorEl.style.cssText = 'font-size:12px;color:#ef5350;margin-top:10px;display:none;';
            modal.appendChild(errorEl);

            var btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:18px;';

            var backBtn = document.createElement('button');
            backBtn.style.cssText = 'background: transparent; color: ' + modalTheme.muted + '; border: 1px solid ' + modalTheme.softBorder + '; '
                + 'padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 13px;';
            backBtn.textContent = firstTime ? 'Cancel' : 'Back';
            backBtn.addEventListener('click', function () {
                if (firstTime) dismissModal();
                else renderManageView();
            });

            var saveBtn = document.createElement('button');
            saveBtn.style.cssText = 'background: #1565c0; color: #fff; border: none; padding: 8px 20px; '
                + 'border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;';
            saveBtn.textContent = firstTime ? 'Continue' : 'Apply';
            saveBtn.addEventListener('click', function () {
                var campusIds = getBusCampusOrder().filter(function (cid) { return !!selected[cid]; });
                if (!campusIds.length) {
                    errorEl.textContent = 'Select at least one campus.';
                    errorEl.style.display = 'block';
                    return;
                }
                var updated = persistCampusSelection(campusIds);
                if (firstTime && (!updated.lines || !updated.lines.length)) renderAddLineView();
                else renderManageView();
            });

            btnRow.appendChild(backBtn);
            btnRow.appendChild(saveBtn);
            modal.appendChild(btnRow);
        }

        function renderManageView() {
            while (modal.firstChild) modal.removeChild(modal.firstChild);
            setModalLayout('520px');
            var config = getModalBusConfig();

            var titleEl = document.createElement('h2');
            titleEl.style.cssText = 'margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: ' + modalTheme.heading + '; letter-spacing: -0.3px;';
            titleEl.textContent = 'Bus Lines';
            modal.appendChild(titleEl);

            var subtitle = document.createElement('p');
            subtitle.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; color: ' + modalTheme.subtle + '; line-height: 1.4;';
            var campusLabels = getCampusLabels(config.campuses);
            subtitle.textContent = 'Manage your configured bus lines (max ' + MAX_LINES + ').'
                + (campusLabels.length ? ' Campuses: ' + campusLabels.join(' + ') + '.' : '');
            modal.appendChild(subtitle);

            var campusBtnRow = document.createElement('div');
            campusBtnRow.style.cssText = 'display: flex; justify-content: flex-end; margin: -8px 0 12px;';
            var campusBtn = document.createElement('button');
            campusBtn.style.cssText = 'background: transparent; border: 1px solid ' + modalTheme.softBorder + '; color: ' + modalTheme.subtle + '; '
                + 'padding: 6px 10px; border-radius: 7px; cursor: pointer; font-size: 12px; font-weight: 600;';
            campusBtn.textContent = 'Campuses';
            campusBtn.addEventListener('click', function () {
                renderCampusSelectionView(false);
            });
            campusBtnRow.appendChild(campusBtn);
            modal.appendChild(campusBtnRow);

            var lineCount = (config && config.lines) ? config.lines.length : 0;
            var colors = getBusLineColors();
            if (config && config.lines) {
                config.lines.forEach(function (lineCfg, idx) {
                    var color = colors[lineCfg.line] || '#1565c0';
                    var card = document.createElement('div');
                    card.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 0;'
                        + (idx > 0 ? ('border-top:1px solid ' + (isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)') + ';') : '');

                    var badge = document.createElement('span');
                    badge.style.cssText = 'background-color:' + color + ';color:#fff;padding:7px 0;'
                        + 'border-radius:2px;font-weight:800;font-size:16px;min-width:56px;text-align:center;';
                    badge.textContent = lineCfg.line;
                    badge.setAttribute('data-dtu-bus-line-badge', lineCfg.line);
                    enforceBusLineBadgeStyle(badge, color);

                    var info = document.createElement('div');
                    info.style.cssText = 'flex: 1; font-size: 13px; color: ' + modalTheme.subtle + '; overflow: hidden; text-overflow: ellipsis;';
                    var dirs = Array.isArray(lineCfg.directions) ? lineCfg.directions : [];
                    info.textContent = (dirs.length === 0 || dirs.indexOf('*') !== -1) ? 'All directions' : dirs.join(', ');

                    var delBtn = document.createElement('button');
                    delBtn.style.cssText = 'background: transparent; border: 1px solid ' + modalTheme.softBorder + '; color: ' + modalTheme.muted + '; '
                        + 'width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 14px; '
                        + 'display: flex; align-items: center; justify-content: center; transition: all 0.15s;';
                    delBtn.textContent = '\u00D7';
                    delBtn.addEventListener('mouseenter', function () { delBtn.style.borderColor = 'var(--dtu-ad-accent)'; delBtn.style.color = '#ef5350'; });
                    delBtn.addEventListener('mouseleave', function () { delBtn.style.borderColor = modalTheme.softBorder; delBtn.style.color = modalTheme.muted; });
                    (function (capturedIdx) {
                        delBtn.addEventListener('click', function () {
                            config.lines.splice(capturedIdx, 1);
                            saveBusConfig(config);
                            writeUiState({ lastBusFetch: 0, cachedDepartures: [] });
                            updateBusDepartures();
                            renderManageView();
                        });
                    })(idx);

                    card.appendChild(badge);
                    card.appendChild(info);
                    card.appendChild(delBtn);
                    modal.appendChild(card);
                });
            }

            if (lineCount < MAX_LINES) {
                var addBtn = document.createElement('button');
                addBtn.style.cssText = 'background: transparent; color: #66b3ff; border: 1px dashed ' + modalTheme.softBorder + '; '
                    + 'padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px; width: 100%; '
                    + 'margin-top: 4px; transition: border-color 0.15s, color 0.15s;';
                addBtn.textContent = '+ Add Bus Line';
                addBtn.addEventListener('mouseenter', function () { addBtn.style.borderColor = '#66b3ff'; });
                addBtn.addEventListener('mouseleave', function () { addBtn.style.borderColor = modalTheme.softBorder; });
                addBtn.addEventListener('click', function () { renderAddLineView(); });
                modal.appendChild(addBtn);
            } else {
                var capNote = document.createElement('div');
                capNote.style.cssText = 'font-size: 12px; color: ' + modalTheme.muted + '; font-style: italic; margin-top: 8px; text-align: center;';
                capNote.textContent = 'Maximum of ' + MAX_LINES + ' bus lines reached. Remove one to add another.';
                modal.appendChild(capNote);
            }

            var btnRow = document.createElement('div');
            btnRow.style.cssText = 'display: flex; justify-content: flex-end; margin-top: 20px;';
            var doneBtn = document.createElement('button');
            doneBtn.style.cssText = 'background: #1565c0; color: #fff; border: none; padding: 8px 24px; '
                + 'border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;';
            doneBtn.textContent = 'Done';
            doneBtn.addEventListener('click', function () { dismissModal(); });
            btnRow.appendChild(doneBtn);
            modal.appendChild(btnRow);
        }

        function renderAddLineView() {
            while (modal.firstChild) modal.removeChild(modal.firstChild);
            setModalLayout('760px');
            var config = getModalBusConfig();
            if (config.lines.length >= MAX_LINES) { renderManageView(); return; }
            var configuredLineNames = config.lines.map(function (l) { return l.line; });

            var titleEl = document.createElement('h2');
            titleEl.style.cssText = 'margin: 0 0 8px 0; font-size: 30px; font-weight: 800; color: ' + modalTheme.heading + '; letter-spacing: -0.5px;';
            titleEl.textContent = 'Add Bus Line';
            modal.appendChild(titleEl);

            var subtitle = document.createElement('p');
            subtitle.style.cssText = 'margin: 0 0 10px 0; font-size: 15px; color: ' + modalTheme.subtle + '; line-height: 1.5; max-width: 680px;';
            var selectedCampusLabels = getCampusLabels(config.campuses);
            subtitle.textContent = 'Select a bus line to add'
                + (selectedCampusLabels.length ? ' for ' + selectedCampusLabels.join(' + ') : '')
                + ':';
            modal.appendChild(subtitle);

            var contextMeta = document.createElement('div');
            contextMeta.style.cssText = 'display:flex;flex-wrap:wrap;gap:18px;align-items:center;'
                + 'margin:0 0 24px 0;padding:0 0 14px 0;border-bottom:1px solid '
                + (isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)') + ';';

            var availableCount = document.createElement('span');
            availableCount.style.cssText = 'font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:' + modalTheme.muted + ';';

            var campusSummary = document.createElement('span');
            campusSummary.style.cssText = 'font-size:13px;color:' + modalTheme.subtle + ';';

            var grid = document.createElement('div');
            grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;align-items:stretch;';

            var campusLines = getCampusLineDefinitions(config.campuses);
            var availableLines = campusLines.filter(function (bus) { return configuredLineNames.indexOf(bus.line) === -1; });
            availableCount.textContent = availableLines.length + ' available lines';
            campusSummary.textContent = selectedCampusLabels.length ? 'Campuses: ' + selectedCampusLabels.join(' · ') : 'Campus scope follows your current bus setup.';
            contextMeta.appendChild(availableCount);
            contextMeta.appendChild(campusSummary);
            modal.appendChild(contextMeta);

            var colors = getBusLineColors();
            availableLines.forEach(function (bus) {
                var color = colors[bus.line] || '#1565c0';
                var baseSurface = isDarkTheme ? 'rgba(255,255,255,0.015)' : 'rgba(15,23,42,0.018)';
                var hoverSurface = isDarkTheme ? rgbaFromHex(color, 0.055, color) : rgbaFromHex(color, 0.038, color);
                var baseRing = 'inset 4px 0 0 ' + rgbaFromHex(color, isDarkTheme ? 0.85 : 0.70, color)
                    + ', inset 0 -1px 0 ' + (isDarkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)');
                var hoverRing = 'inset 4px 0 0 ' + rgbaFromHex(color, 1, color)
                    + ', inset 0 -1px 0 ' + rgbaFromHex(color, isDarkTheme ? 0.32 : 0.18, color);
                var card = document.createElement('button');
                card.style.cssText = 'display:flex;align-items:flex-start;gap:16px;padding:18px 18px 18px 20px;min-height:104px;'
                    + 'cursor:pointer;border:none;border-radius:0;background:' + baseSurface + ';'
                    + 'box-shadow:' + baseRing + ';transition:background 0.16s ease, box-shadow 0.16s ease;'
                    + 'text-align:left;';
                card.addEventListener('mouseenter', function () {
                    card.style.backgroundColor = hoverSurface;
                    card.style.boxShadow = hoverRing;
                });
                card.addEventListener('mouseleave', function () {
                    card.style.backgroundColor = baseSurface;
                    card.style.boxShadow = baseRing;
                });

                var badge = document.createElement('span');
                badge.style.cssText = 'background-color:' + color + ';color:#fff;padding:10px 0;border-radius:2px;'
                    + 'font-weight:800;font-size:19px;min-width:84px;text-align:center;letter-spacing:0.5px;'
                    + 'line-height:1;flex-shrink:0;align-self:flex-start;';
                badge.textContent = bus.line;
                badge.setAttribute('data-dtu-bus-line-badge', bus.line);
                enforceBusLineBadgeStyle(badge, color);

                var textCol = document.createElement('div');
                textCol.style.cssText = 'display:flex;flex-direction:column;justify-content:center;gap:8px;min-width:0;flex:1;';

                var label = document.createElement('span');
                label.style.cssText = 'font-size:17px;font-weight:700;line-height:1.2;color:' + modalTheme.text + ';';
                label.textContent = bus.name;

                var campusTags = getLineCampusLabels(bus.line, config.campuses);
                var campusMetaText = document.createElement('span');
                campusMetaText.style.cssText = 'font-size:13px;line-height:1.45;color:' + modalTheme.subtle + ';';
                campusMetaText.textContent = campusTags.length ? campusTags.join(' · ') : 'Available for your selected campuses';

                var actionHint = document.createElement('span');
                actionHint.style.cssText = 'font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:'
                    + (isDarkTheme ? rgbaFromHex(color, 0.95, color) : rgbaFromHex(color, 0.88, color)) + ';';
                actionHint.textContent = 'Choose directions';

                textCol.appendChild(label);
                textCol.appendChild(campusMetaText);
                textCol.appendChild(actionHint);

                card.appendChild(badge);
                card.appendChild(textCol);
                grid.appendChild(card);

                card.addEventListener('click', function () { renderDirectionView(bus.line); });
            });

            if (availableLines.length) {
                modal.appendChild(grid);
            } else {
                var noLines = document.createElement('div');
                noLines.style.cssText = 'font-size: 13px; color: ' + modalTheme.muted + '; font-style: italic; padding: 8px 0;';
                noLines.textContent = 'No more lines available for the selected campuses.';
                modal.appendChild(noLines);
            }

            var btnRow = document.createElement('div');
            btnRow.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;';
            var backBtn = document.createElement('button');
            backBtn.style.cssText = 'background:' + (isDarkTheme ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.05)') + ';'
                + 'color:' + modalTheme.subtle + ';border:none;padding:10px 16px;border-radius:4px;cursor:pointer;'
                + 'font-size:13px;font-weight:600;transition:background 0.16s ease,color 0.16s ease;';
            backBtn.textContent = '\u2190 ' + (config.lines.length > 0 ? 'Back' : 'Campuses');
            backBtn.addEventListener('mouseenter', function () {
                backBtn.style.background = isDarkTheme ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)';
                backBtn.style.color = modalTheme.text;
            });
            backBtn.addEventListener('mouseleave', function () {
                backBtn.style.background = isDarkTheme ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.05)';
                backBtn.style.color = modalTheme.subtle;
            });
            backBtn.addEventListener('click', function () {
                var c = getBusConfig();
                if (c && c.lines && c.lines.length > 0) { renderManageView(); }
                else { renderCampusSelectionView(false); }
            });
            btnRow.appendChild(backBtn);
            modal.appendChild(btnRow);
        }

        function renderDirectionView(selectedLine) {
            while (modal.firstChild) modal.removeChild(modal.firstChild);
            setModalLayout('520px');

            var color = getBusLineColors()[selectedLine] || '#1565c0';

            var titleEl = document.createElement('h2');
            titleEl.style.cssText = 'margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: ' + modalTheme.heading + '; letter-spacing: -0.3px;';
            titleEl.textContent = 'Pick Directions';
            modal.appendChild(titleEl);

            var subtitle = document.createElement('p');
            subtitle.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; color: ' + modalTheme.subtle + '; line-height: 1.4;';

            var lineTag = document.createElement('span');
            lineTag.style.cssText = 'background-color: ' + color + '; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 13px;';
            lineTag.textContent = selectedLine;
            lineTag.setAttribute('data-dtu-bus-line-badge', selectedLine);
            enforceBusLineBadgeStyle(lineTag, color);
            subtitle.appendChild(document.createTextNode('Select directions for '));
            subtitle.appendChild(lineTag);
            subtitle.appendChild(document.createTextNode(':'));
            modal.appendChild(subtitle);

            var configForDirection = getModalBusConfig();
            var directions = getLocalBusDirectionOptions(selectedLine, configForDirection);
            directions.sort(function (a, b) {
                var ax = String(a || '').toLowerCase();
                var bx = String(b || '').toLowerCase();
                if (ax < bx) return -1;
                if (ax > bx) return 1;
                return 0;
            });

            if (directions.length === 0) {
                var noDir = document.createElement('div');
                noDir.style.cssText = 'font-size: 13px; color: ' + modalTheme.muted + '; font-style: italic; padding: 8px 0;';
                noDir.textContent = 'No saved direction options found for ' + selectedLine + '. You can still save with "All directions".';
                modal.appendChild(noDir);
            }

            var anyRow = document.createElement('label');
            anyRow.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px 12px; '
                + 'cursor: pointer; border-radius: 6px; margin-bottom: 2px; transition: background 0.15s;';
            anyRow.addEventListener('mouseenter', function () { anyRow.style.backgroundColor = modalTheme.hoverRow; });
            anyRow.addEventListener('mouseleave', function () { anyRow.style.backgroundColor = 'transparent'; });

            var anyCb = document.createElement('input');
            anyCb.type = 'checkbox';
            anyCb.checked = directions.length === 0;
            anyCb.style.cssText = 'width: 16px; height: 16px; accent-color: var(--dtu-ad-accent); cursor: pointer;';

            var anyText = document.createElement('span');
            anyText.style.cssText = 'font-size: 13px; color: ' + modalTheme.text + '; font-weight: 700;';
            anyText.textContent = directions.length === 0 ? 'All directions (recommended)' : 'All directions';

            anyRow.appendChild(anyCb);
            anyRow.appendChild(anyText);
            modal.appendChild(anyRow);

            var dirCheckboxes = [];
            directions.forEach(function (direction) {
                var row = document.createElement('label');
                row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px 12px; '
                    + 'cursor: pointer; border-radius: 6px; margin-bottom: 2px; transition: background 0.15s;';
                row.addEventListener('mouseenter', function () { row.style.backgroundColor = modalTheme.hoverRow; });
                row.addEventListener('mouseleave', function () { row.style.backgroundColor = 'transparent'; });

                var cb = document.createElement('input');
                cb.type = 'checkbox';
                var isCampusInbound = (/\bdtu\b/i.test(direction) && selectedLine !== '40E')
                    || /\bris[øo]\b/i.test(direction);
                cb.checked = !isCampusInbound;
                cb.style.cssText = 'width: 16px; height: 16px; accent-color: var(--dtu-ad-accent); cursor: pointer;';

                var arrow = document.createElement('span');
                arrow.style.cssText = 'color: #66bb6a; font-size: 13px;';
                arrow.textContent = '\u2192';

                var dirText = document.createElement('span');
                dirText.style.cssText = 'font-size: 14px; color: ' + modalTheme.text + ';';
                dirText.textContent = direction;

                row.appendChild(cb);
                row.appendChild(arrow);
                row.appendChild(dirText);
                modal.appendChild(row);
                dirCheckboxes.push({ direction: direction, cb: cb });
            });

            var errorEl = document.createElement('div');
            errorEl.style.cssText = 'font-size: 13px; color: #ef5350; margin-top: 8px; display: none;';
            modal.appendChild(errorEl);

            var btnRow = document.createElement('div');
            btnRow.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;';

            var backBtn = document.createElement('button');
            backBtn.style.cssText = 'background: transparent; color: ' + modalTheme.muted + '; border: 1px solid ' + modalTheme.softBorder + '; '
                + 'padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 13px;';
            backBtn.textContent = 'Back';
            backBtn.addEventListener('click', function () { renderAddLineView(); });

            var saveBtn = document.createElement('button');
            saveBtn.style.cssText = 'background: #1565c0; color: #fff; border: none; padding: 8px 20px; '
                + 'border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;';
            saveBtn.textContent = 'Add Line';

            saveBtn.addEventListener('click', function () {
                var selectedDirs = [];
                if (anyCb.checked) {
                    selectedDirs = ['*'];
                } else {
                    selectedDirs = dirCheckboxes.filter(function (dc) { return dc.cb.checked; }).map(function (dc) { return dc.direction; });
                }
                if (selectedDirs.length === 0) {
                    errorEl.textContent = 'Please select at least one direction.';
                    errorEl.style.display = 'block';
                    return;
                }

                var config = getModalBusConfig();
                config.lines = Array.isArray(config.lines) ? config.lines.filter(function (entry) {
                    return entry && entry.line !== selectedLine;
                }) : [];
                if (config.lines.length >= MAX_LINES) {
                    errorEl.textContent = 'Maximum of ' + MAX_LINES + ' bus lines reached. Remove one to add another.';
                    errorEl.style.display = 'block';
                    return;
                }
                config.lines.push({ line: selectedLine, directions: selectedDirs });
                if (!config.stopIds || config.stopIds.length === 0) {
                    config.stopIds = getCampusStopIds(config.campuses);
                }
                saveBusConfig(config);
                localStorage.setItem(getBusEnabledKey(), 'true');
                localStorage.setItem(getBusSetupDoneKey(), 'configured');
                writeUiState({ lastBusFetch: 0, cachedDepartures: [] });
                updateBusDepartures();
                renderManageView();
            });

            btnRow.appendChild(backBtn);
            btnRow.appendChild(saveBtn);
            modal.appendChild(btnRow);
        }

        var config = getBusConfig();
        if (!config) {
            renderCampusSelectionView(true);
        } else if (config && config.lines && config.lines.length > 0) {
            renderManageView();
        } else {
            renderAddLineView();
        }

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    function insertBusToggle() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        var placeholder = getAdminToolsPlaceholder();
        if (!placeholder) return;
        if (placeholder.querySelector && placeholder.querySelector('#bus-departures-toggle')) return;

        var columns = placeholder.querySelectorAll('.d2l-admin-tools-column');
        var targetList = null;
        columns.forEach(function (col) {
            var h2 = col.querySelector('h2');
            if (h2 && normalizeWhitespace(h2.textContent) === 'DTU After Dark') {
                targetList = col.querySelector('ul.d2l-list');
            }
        });

        if (!targetList) return;

        var isDark = isDarkModeEnabled();
        var li = document.createElement('li');
        li.style.cssText = isDark
            ? 'display: flex; align-items: center; gap: 8px; padding: 4px 0; background-color: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; padding: 4px 0;';

        var label = document.createElement('label');
        label.style.cssText = isDark
            ? 'display: flex; align-items: center; gap: 8px; cursor: pointer; color: #e0e0e0; '
            + 'font-size: 14px; background-color: #2d2d2d !important; background: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;';

        var toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.id = 'bus-departures-toggle';
        toggle.checked = isBusEnabled();
        toggle.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: var(--dtu-ad-accent);';

        toggle.addEventListener('change', function () {
            if (toggle.checked && isApiQuotaExhausted()) {
                toggle.checked = false;
                showQuotaExhaustedMessage('monthly');
                return;
            }
            localStorage.setItem(getBusEnabledKey(), toggle.checked.toString());
            if (toggle.checked) {
                var config = getBusConfig();
                if (!config || !config.lines || config.lines.length === 0) {
                    showBusConfigModal();
                } else {
                    writeUiState({ lastBusFetch: 0 });
                    updateBusDepartures();
                }
            } else {
                stopBusPolling();
                abortInFlightBusRequests();
                insertBusDisplay();
            }
        });

        label.appendChild(toggle);
        label.appendChild(document.createTextNode('Bus Departures'));
        li.appendChild(label);

        var config = getBusConfig();
        if (config && config.lines && config.lines.length > 0) {
            var editBtn = document.createElement('button');
            editBtn.style.cssText = isDark
                ? 'background: transparent; color: #66b3ff; border: none; cursor: pointer; font-size: 12px; padding: 0; margin-left: 4px; text-decoration: underline;'
                : 'background: transparent; border: none; cursor: pointer; font-size: 12px; padding: 0; margin-left: 4px; text-decoration: underline;';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', function (e) {
                e.preventDefault();
                showBusConfigModal();
            });
            li.appendChild(editBtn);
        }

        targetList.appendChild(li);
    }

    
const LIVE_TRANSIT_API_BASE = getRuntimeConfig().LIVE_TRANSIT_API_BASE || '';
    const REJSEPLANEN_API = 'https://www.rejseplanen.dk/api';
    const REJSEPLANEN_KEY = getRuntimeConfig().REJSEPLANEN_API_KEY || '';

    // Bus lines that serve DTU campuses.
    const DTU_BUS_LINES = [
        { line: '150S', name: 'Bus 150S' },
        { line: '300S', name: 'Bus 300S' },
        { line: '40E', name: 'Bus 40E' },
        { line: '15E', name: 'Bus 15E' },
        { line: '193', name: 'Bus 193' },
        { line: '350S', name: 'Bus 350S' },
        { line: '55E', name: 'Bus 55E' },
        { line: '216', name: 'Bus 216' },
        { line: '600S', name: 'Bus 600S' }
    ];
    const DTU_BUS_LINES_BY_CODE = DTU_BUS_LINES.reduce(function (acc, lineDef) {
        if (!lineDef || !lineDef.line) return acc;
        acc[lineDef.line] = lineDef;
        return acc;
    }, {});

    // Static direction tokens for bus-line filtering in the config modal.
    // These are used to avoid extra API calls while editing bus settings.
    const DTU_BUS_DIRECTION_TOKENS = {
        '150S': ['Nørreport St.', 'Kokkedal St.', 'Gl. Holte Øverødvej', 'Søhuset, Forskerparken'],
        '300S': ['Rødovre Nord St.', 'Lundtofte, Lundtofteparken', 'DTU', 'Gladsaxe Trafikplads', 'Lyngby St.'],
        '40E': ['Høje Taastrup St.', 'Skodsborg St.', 'DTU, Rævehøjvej'],
        '15E': ['Nørreport St.'],
        '193': ['Lyngby St.', 'Vedbæk St.'],
        '350S': ['Nørreport St.', 'Ballerup St.'],
        '55E': ['Allerød St.', 'Rødovre Nord St.'],
        '216': ['Roskilde St.', 'Ballerup St.', 'Søagerskolen', 'Østrup'],
        '600S': ['Hillerød St.', 'Ishøj St.', 'Roskilde St.', 'Greve St.', 'Roskilde St. Sygehuset', 'Jyllingecentret', 'Slangerup Rutebilstation', 'Tune Center']
    };

    // Badge colors per bus line
    const LINE_COLORS = {
        '150S': '#1565c0',
        '300S': '#2e7d32',
        '40E': '#6a1b9a',
        '15E': '#c62828',
        '193': '#e65100',
        '350S': '#00838f',
        '55E': '#ad1457',
        '216': '#5d4037',
        '600S': '#283593'
    };

    // Campus presets: stop IDs + commonly used lines.
    const DTU_CAMPUS_PRESETS = {
        lyngby: {
            id: 'lyngby',
            label: 'DTU Lyngby',
            stopIds: ['6015', '6026', '474', '496', '497', '473', '472', '53591', '53614', '53615'],
            lines: ['150S', '300S', '40E', '15E', '193']
        },
        ballerup: {
            id: 'ballerup',
            label: 'DTU Ballerup',
            stopIds: ['2175', '2134', '2177', '2132'],
            lines: ['350S', '40E', '55E']
        },
        riso: {
            id: 'riso',
            label: 'DTU Risø',
            stopIds: ['9183', '4369'],
            lines: ['216', '600S']
        }
    };
    const DTU_CAMPUS_ORDER = ['lyngby', 'ballerup', 'riso'];
    const DTU_DEFAULT_CAMPUSES = ['lyngby'];
    const DTU_AREA_STOP_IDS = (DTU_CAMPUS_PRESETS.lyngby.stopIds || []).slice();

    const BUS_ENABLED_KEY = 'dtuDarkModeBusEnabled';
    const BUS_CONFIG_KEY = 'dtuDarkModeBusConfig';
    const BUS_SETUP_DONE_KEY = 'dtuDarkModeBusSetupDone';
    const DEADLINES_ENABLED_KEY = 'dtuDarkModeDeadlinesEnabled';
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
    let _busConsecutiveErrors = 0;
    let _busBackoffUntil = 0;
    let _busConfigModalOpen = false;
    const _busActiveControllers = new Set();

    function isBusEnabled() {
        return localStorage.getItem(BUS_ENABLED_KEY) === 'true';
    }

    function isDeadlinesEnabled() {
        const stored = localStorage.getItem(DEADLINES_ENABLED_KEY);
        return stored === null ? true : stored === 'true';
    }

    const SEARCH_WIDGET_ENABLED_KEY = 'dtuDarkModeSearchWidgetEnabled';

    function isSearchWidgetEnabled() {
        const stored = localStorage.getItem(SEARCH_WIDGET_ENABLED_KEY);
        return stored === 'true';
    }

    function sanitizeBusStopIds(stopIds) {
        if (!Array.isArray(stopIds)) return [];
        var seen = {};
        var out = [];
        stopIds.forEach(function (sid) {
            var id = String(sid || '').trim();
            if (!id) return;
            if (!/^\d+$/.test(id)) return;
            if (seen[id]) return;
            seen[id] = true;
            out.push(id);
        });
        return out;
    }

    function sanitizeBusCampusIds(campusIds) {
        if (!Array.isArray(campusIds)) return [];
        var seen = {};
        var out = [];
        campusIds.forEach(function (cid) {
            var id = String(cid || '').trim().toLowerCase();
            if (!id || !DTU_CAMPUS_PRESETS[id]) return;
            if (seen[id]) return;
            seen[id] = true;
            out.push(id);
        });
        return out;
    }

    function getCampusStopIds(campusIds) {
        var ids = sanitizeBusCampusIds(campusIds);
        if (!ids.length) ids = DTU_DEFAULT_CAMPUSES.slice();
        var seen = {};
        var out = [];
        ids.forEach(function (cid) {
            var preset = DTU_CAMPUS_PRESETS[cid];
            if (!preset || !Array.isArray(preset.stopIds)) return;
            preset.stopIds.forEach(function (sid) {
                var id = String(sid || '').trim();
                if (!id || seen[id]) return;
                seen[id] = true;
                out.push(id);
            });
        });
        return out;
    }

    function getCampusLineCodes(campusIds) {
        var ids = sanitizeBusCampusIds(campusIds);
        if (!ids.length) ids = DTU_DEFAULT_CAMPUSES.slice();
        var seen = {};
        var out = [];
        ids.forEach(function (cid) {
            var preset = DTU_CAMPUS_PRESETS[cid];
            if (!preset || !Array.isArray(preset.lines)) return;
            preset.lines.forEach(function (line) {
                var code = String(line || '').trim();
                if (!code || seen[code]) return;
                seen[code] = true;
                out.push(code);
            });
        });
        return out;
    }

    function getCampusLineDefinitions(campusIds) {
        var codes = getCampusLineCodes(campusIds);
        return codes.map(function (code) {
            return DTU_BUS_LINES_BY_CODE[code] || { line: code, name: 'Bus ' + code };
        });
    }

    function inferBusCampusesFromStopIds(stopIds) {
        var stops = sanitizeBusStopIds(stopIds);
        if (!stops.length) return DTU_DEFAULT_CAMPUSES.slice();

        var selected = [];
        DTU_CAMPUS_ORDER.forEach(function (cid) {
            var preset = DTU_CAMPUS_PRESETS[cid];
            if (!preset || !Array.isArray(preset.stopIds)) return;
            var hasAny = preset.stopIds.some(function (sid) { return stops.indexOf(String(sid)) !== -1; });
            if (hasAny) selected.push(cid);
        });
        if (!selected.length) selected = DTU_DEFAULT_CAMPUSES.slice();
        return selected;
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

    function ensureBusConfigHasFetchableLines(config) {
        var normalized = normalizeBusConfig(config) || buildDefaultBusConfig();
        if (!Array.isArray(normalized.lines) || !normalized.lines.length) {
            normalized.lines = getCampusLineCodes(normalized.campuses).slice(0, BUS_MAX_CONFIGURED_LINES).map(function (line) {
                return { line: line, directions: ['*'] };
            });
        } else if (normalized.lines.length > BUS_MAX_CONFIGURED_LINES) {
            normalized.lines = normalized.lines.slice(0, BUS_MAX_CONFIGURED_LINES);
        }
        if (!Array.isArray(normalized.stopIds) || !normalized.stopIds.length) {
            normalized.stopIds = getCampusStopIds(normalized.campuses);
        }
        return normalized;
    }

    function getBusConfig() {
        try {
            var raw = localStorage.getItem(BUS_CONFIG_KEY);
            if (!raw) return buildDefaultBusConfig();
            var parsed = JSON.parse(raw);
            return ensureBusConfigHasFetchableLines(parsed);
        } catch (e) {
            return buildDefaultBusConfig();
        }
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
            if (lineNorm === '600S' && /\bris[øo]\b/.test(dirNorm)) {
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
        _cachedDepartures = payload.departures;
        _lastBusFetch = payload.ts;
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
        var lease = readBusFetchLease();
        if (lease && lease.expiresAt > now && lease.owner !== BUS_TAB_ID) return false;
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

    function isDTULearnLegacyHeavyCourseToolPage() {
        return window.location.hostname === 'learn.inside.dtu.dk'
            && /^\/d2l\/lms\/(dropbox|classlist|group|news)\//i.test(window.location.pathname);
    }

    // Inject helpful external links into existing DTU Learn nav dropdowns.
    // This runs best-effort and degrades gracefully if Brightspace changes markup.
    function getLearnNavUiApi() {
        try { return globalThis.DTUAfterDarkLearnNavUi || null; } catch (e0) { return null; }
    }

    try {
        if (!globalThis.DTUAfterDarkLearnNavDeps) {
            globalThis.DTUAfterDarkLearnNavDeps = {
                isTopWindow: function () { return isTopWindow(); },
                isFeatureFlagEnabled: isFeatureFlagEnabled,
                normalizeWhitespace: normalizeWhitespace,
                markExt: markExt,
                showSettingsModal: showSettingsModal,
                hideSettingsModal: hideSettingsModal,
                featureLearnNavResourceLinksKey: FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY
            };
        }
    } catch (eLearnNavDeps) { }

    function insertDTULearnNavResourceLinks() {
        var api = getLearnNavUiApi();
        if (api && typeof api.insertDTULearnNavResourceLinks === 'function') {
            api.insertDTULearnNavResourceLinks();
        }
    }

    function removeDTULearnNavResourceLinks() {
        var api = getLearnNavUiApi();
        if (api && typeof api.removeDTULearnNavResourceLinks === 'function') {
            api.removeDTULearnNavResourceLinks();
        }
    }

    function getDeadlinesUiApi() {
        try { return globalThis.DTUAfterDarkDeadlinesUi || null; } catch (e0) { return null; }
    }

    try {
        if (!globalThis.DTUAfterDarkDeadlinesDeps) {
            globalThis.DTUAfterDarkDeadlinesDeps = {
                isTopWindow: function () { return isTopWindow(); },
                isDarkMode: function () { return !!isDarkModeEnabled(); },
                isDeadlinesEnabled: isDeadlinesEnabled,
                isSearchWidgetEnabled: isSearchWidgetEnabled,
                isDTULearnHomepage: isDTULearnHomepage,
                markExt: markExt,
                normalizeWhitespace: normalizeWhitespace,
                sendRuntimeMessage: sendRuntimeMessage,
                getAdminToolsPlaceholder: getAdminToolsPlaceholder,
                getAfterDarkAdminToolsList: getAfterDarkAdminToolsList,
                formatIsoDateForDisplay: formatIsoDateForDisplay,
                startOfTodayUtcTs: startOfTodayUtcTs,
                diffDaysUtc: diffDaysUtc
            };
        }
    } catch (eDeadlinesDeps) { }

    function insertDeadlinesHomepageWidget() {
        var api = getDeadlinesUiApi();
        if (api && typeof api.insertDeadlinesHomepageWidget === 'function') {
            api.insertDeadlinesHomepageWidget();
        }
    }

    function insertDeadlinesToggle() {
        var api = getDeadlinesUiApi();
        if (api && typeof api.insertDeadlinesToggle === 'function') {
            api.insertDeadlinesToggle();
        }
    }

    function insertSearchWidgetToggle() {
        var api = getDeadlinesUiApi();
        if (api && typeof api.insertSearchWidgetToggle === 'function') {
            api.insertSearchWidgetToggle();
        }
    }

    // ===== LIBRARY NAV DROPDOWN =====
    // Placed in the bottom nav bar (d2l-navigation-s-main-wrapper), after "Find Courses" and before "Study Rules".
    function isLibraryEnabled() {
        return isFeatureFlagEnabled(getLibraryDropdownFeatureKey());
    }

    var _libraryEventsCache = null;
    var _libraryNewsCache = null;
    var _libraryCrowdingCache = null;
    var LIBRARY_RUNTIME_STYLE_ID = 'dtu-library-runtime-style';
    var _libraryEscHandler = null;
    var _libraryOccupancyAutoTimer = null;
    var LIBRARY_CROWD_HEATMAP_EXPANDED_KEY = 'dtuAfterDarkLibraryCrowdHeatmapExpanded';

    function ensureLibraryRuntimeStyles() {
        if (!isTopWindow()) return;
        var host = document.head || document.documentElement;
        if (!host) return;

        var style = document.getElementById(LIBRARY_RUNTIME_STYLE_ID);
        if (!style) {
            style = document.createElement('style');
            style.id = LIBRARY_RUNTIME_STYLE_ID;
            markExt(style);
            host.appendChild(style);
        }

        var panelBg = isDarkModeEnabled() ? 'rgba(24,24,24,0.97)' : 'rgba(255,255,255,0.98)';
        var panelBorder = isDarkModeEnabled() ? '#404040' : '#d6dce7';
        var panelText = isDarkModeEnabled() ? '#e8e8e8' : '#1f2937';
        var muted = isDarkModeEnabled() ? '#9aa0aa' : '#6b7280';
        var sectionBg = isDarkModeEnabled() ? '#2d2d2d' : '#ffffff';
        var rowBg = isDarkModeEnabled() ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)';
        var rowBgHover = isDarkModeEnabled() ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
        var linkBg = isDarkModeEnabled() ? 'rgba(255,255,255,0.018)' : 'rgba(15,23,42,0.018)';
        var linkBgHover = isDarkModeEnabled() ? 'rgba(255,255,255,0.045)' : 'rgba(15,23,42,0.045)';
        var sectionTitle = isDarkModeEnabled() ? '#a3acb8' : '#667084';
        var linkDivider = isDarkModeEnabled() ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
        var feedDivider = isDarkModeEnabled() ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.09)';
        var stateBg = isDarkModeEnabled() ? 'rgba(255,255,255,0.02)' : '#f8fafc';
        var actionBorder = isDarkModeEnabled() ? '#4a4a4a' : '#d4dbe6';
        var actionBg = isDarkModeEnabled() ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)';
        var actionBgHover = isDarkModeEnabled() ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
        var dateBg = isDarkModeEnabled() ? '#212121' : '#f3f6fb';
        var panelShadow = isDarkModeEnabled() ? '0.7' : '0.25';
        var crowdBg = isDarkModeEnabled() ? '#1a1a1a' : '#ffffff';
        var crowdInset = isDarkModeEnabled() ? '#121212' : '#f5f5f5';
        var crowdInsetSoft = isDarkModeEnabled() ? '#181818' : '#f8fafc';
        var crowdBorder = isDarkModeEnabled() ? '#363636' : '#d8dde6';
        var crowdText = isDarkModeEnabled() ? '#e0e0e0' : '#1a1a1a';
        var crowdMuted = isDarkModeEnabled() ? '#888' : '#666';
        var crowdTrack = isDarkModeEnabled() ? '#2a2a2a' : '#e8e8e8';
        var crowdGood = '#2e7d32';
        var crowdWarn = '#d97706'; // Fixed amber — keeps traffic-light semantics independent of accent colour
        var crowdBad = '#c62828';

        var css = [
            '.dtu-library-modal-overlay{position:fixed !important;inset:0 !important;z-index:1000000 !important;display:flex !important;align-items:center !important;justify-content:center !important;padding:20px !important;background:transparent !important;background-color:transparent !important;backdrop-filter:blur(4px) !important;-webkit-backdrop-filter:blur(4px) !important;}',
            '.dtu-library-backdrop{position:fixed !important;inset:0 !important;z-index:999998 !important;background:transparent !important;background-color:transparent !important;}',
            '.dtu-library-panel{display:flex !important;flex-direction:column !important;overflow:hidden !important;width:min(980px,calc(100vw - 40px)) !important;max-height:calc(100vh - 80px) !important;box-sizing:border-box !important;border-radius:14px !important;background:' + panelBg + ' !important;border:1px solid ' + panelBorder + ' !important;color:' + panelText + ' !important;box-shadow:0 20px 60px rgba(0,0,0,' + panelShadow + ') !important;}',
            '.dtu-library-panel,.dtu-library-panel *{box-sizing:border-box !important;font-family:inherit !important;}',
            '.dtu-library-header{display:flex !important;align-items:center !important;justify-content:space-between !important;gap:10px !important;padding:14px 18px 12px !important;border-bottom:1px solid ' + panelBorder + ' !important;background:rgba(255,255,255,0.02) !important;flex-shrink:0 !important;}',
            '.dtu-library-header-main{display:flex !important;align-items:center !important;gap:14px !important;min-width:0 !important;flex:1 1 auto !important;}',
            '.dtu-library-title{margin:0 !important;font-size:21px !important;font-weight:760 !important;line-height:1.1 !important;letter-spacing:-0.3px !important;color:' + panelText + ' !important;white-space:nowrap !important;}',
            '.dtu-library-header-occupancy{display:flex !important;align-items:flex-end !important;justify-content:flex-start !important;gap:12px !important;flex-wrap:wrap !important;min-width:0 !important;flex:1 1 auto !important;}',
            '.dtu-library-header-occ-item{display:flex !important;flex-direction:column !important;align-items:flex-start !important;justify-content:center !important;gap:2px !important;padding:0 !important;background:transparent !important;border:0 !important;min-width:54px !important;}',
            '.dtu-library-header-occ-label{margin:0 !important;font-size:9px !important;font-weight:700 !important;line-height:1.1 !important;letter-spacing:0.55px !important;text-transform:uppercase !important;color:' + sectionTitle + ' !important;}',
            '.dtu-library-header-occ-value{margin:0 !important;font-size:22px !important;font-weight:800 !important;line-height:0.95 !important;color:' + panelText + ' !important;}',
            '.dtu-library-header-actions{display:flex !important;align-items:center !important;justify-content:flex-end !important;gap:8px !important;min-width:0 !important;flex:0 0 auto !important;}',
            '.dtu-library-header-updated{margin:0 !important;font-size:10px !important;font-weight:600 !important;line-height:1.2 !important;letter-spacing:0.2px !important;color:' + muted + ' !important;white-space:nowrap !important;}',
            '.dtu-library-header-occ-refresh{appearance:none !important;border:1px solid ' + actionBorder + ' !important;background:' + actionBg + ' !important;color:' + panelText + ' !important;border-radius:999px !important;cursor:pointer !important;padding:3px 8px !important;font-size:10px !important;font-weight:700 !important;line-height:1.1 !important;white-space:nowrap !important;min-height:24px !important;}',
            '.dtu-library-header-occ-refresh:hover{background:' + actionBgHover + ' !important;border-color:var(--dtu-ad-accent) !important;color:var(--dtu-ad-accent-soft) !important;}',
            'button.dtu-library-close{appearance:none !important;border:1px solid ' + actionBorder + ' !important;background:' + actionBg + ' !important;color:' + muted + ' !important;border-radius:7px !important;cursor:pointer !important;padding:2px 9px !important;line-height:1 !important;font-size:26px !important;min-width:34px !important;min-height:30px !important;}',
            'button.dtu-library-close:hover{background:' + actionBgHover + ' !important;color:' + panelText + ' !important;border-color:var(--dtu-ad-accent) !important;}',
            '.dtu-library-content{display:flex !important;flex-direction:column !important;gap:14px !important;padding:18px 22px 20px !important;overflow:auto !important;background:transparent !important;flex:1 1 auto !important;}',
            '.dtu-library-layout{display:flex !important;flex-direction:column !important;gap:14px !important;}',
            '.dtu-library-feed-grid{display:grid !important;grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:14px !important;}',
            '.dtu-library-section{margin:0 !important;padding:12px !important;background:' + sectionBg + ' !important;border:1px solid ' + panelBorder + ' !important;border-radius:10px !important;}',
            '.dtu-library-trend-section{padding:0 !important;background:transparent !important;border:0 !important;border-radius:0 !important;box-shadow:none !important;}',
            '.dtu-library-trend-section .dtu-library-section-header{display:none !important;}',
            '.dtu-library-trend-section .dtu-library-crowd{padding:0 !important;gap:10px !important;background:transparent !important;}',
            '.dtu-library-trend-section .dtu-library-crowd-hero{padding:0 0 12px !important;background:transparent !important;box-shadow:inset 0 -1px 0 ' + crowdBorder + ' !important;}',
            '.dtu-library-trend-section .dtu-library-crowd-chart-wrap{padding:0 !important;background:transparent !important;border:0 !important;border-radius:0 !important;box-shadow:none !important;}',
            '.dtu-library-trend-section .dtu-library-crowd-chart{background:transparent !important;border-radius:0 !important;}',
            '.dtu-library-trend-section .dtu-library-crowd-events,.dtu-library-trend-section .dtu-library-crowd-confidence{padding:0 !important;}',
            '.dtu-library-section-header{display:flex !important;align-items:center !important;justify-content:space-between !important;gap:8px !important;margin:0 0 8px !important;padding:0 !important;background:transparent !important;}',
            '.dtu-library-section-title{margin:0 !important;font-size:12px !important;font-weight:700 !important;letter-spacing:0.7px !important;text-transform:uppercase !important;color:' + sectionTitle + ' !important;background:transparent !important;}',
            '.dtu-library-actions{display:flex !important;align-items:center !important;gap:8px !important;background:transparent !important;}',
            'button.dtu-library-action-btn{appearance:none !important;border:1px solid ' + actionBorder + ' !important;background:' + actionBg + ' !important;color:' + panelText + ' !important;border-radius:7px !important;cursor:pointer !important;padding:4px 10px !important;font-size:11px !important;font-weight:650 !important;line-height:1.2 !important;white-space:nowrap !important;min-height:26px !important;}',
            'button.dtu-library-action-btn:hover{background:' + actionBgHover + ' !important;border-color:var(--dtu-ad-accent) !important;color:var(--dtu-ad-accent-soft) !important;}',
            '.dtu-library-links-section{padding:2px 0 0 !important;background:transparent !important;border:0 !important;}',
            '.dtu-library-links-header{margin:0 0 12px !important;padding:0 4px !important;}',
            '.dtu-library-links-title-wrap{display:flex !important;flex-direction:column !important;gap:3px !important;min-width:0 !important;background:transparent !important;}',
            '.dtu-library-links-subtitle{margin:0 !important;font-size:11px !important;font-weight:520 !important;line-height:1.35 !important;color:' + muted + ' !important;background:transparent !important;}',
            '.dtu-library-link-grid{display:grid !important;grid-template-columns:repeat(3,minmax(0,1fr)) !important;gap:8px 20px !important;background:transparent !important;}',
            'a.dtu-library-link-item{display:grid !important;grid-template-columns:18px minmax(0,1fr) 14px !important;align-items:center !important;gap:12px !important;min-height:58px !important;padding:10px 4px 10px 2px !important;border-radius:0 !important;background:transparent !important;border:0 !important;box-shadow:inset 0 -1px 0 ' + linkDivider + ' !important;color:' + panelText + ' !important;text-decoration:none !important;text-align:left !important;white-space:normal !important;overflow-wrap:anywhere !important;transition:all 0.2s ease-in-out !important;}',
            'a.dtu-library-link-item:hover{background:' + linkBgHover + ' !important;border-radius:12px !important;box-shadow:inset 0 -1px 0 transparent !important;color:' + panelText + ' !important;transform:translateY(-2px) !important;}',
            '.dtu-library-link-icon{display:inline-flex !important;align-items:center !important;justify-content:center !important;align-self:start !important;flex-shrink:0 !important;width:18px !important;min-width:18px !important;height:18px !important;color:var(--dtu-ad-accent) !important;}',
            '.dtu-library-link-icon svg{display:block !important;width:18px !important;height:18px !important;stroke:currentColor !important;fill:none !important;stroke-width:1.9 !important;stroke-linecap:round !important;stroke-linejoin:round !important;}',
            '.dtu-library-link-content{display:flex !important;flex-direction:column !important;gap:2px !important;min-width:0 !important;}',
            '.dtu-library-link-label{display:block !important;min-width:0 !important;overflow-wrap:anywhere !important;font-size:13px !important;font-weight:700 !important;line-height:1.2 !important;color:' + panelText + ' !important;}',
            '.dtu-library-link-meta{display:block !important;min-width:0 !important;overflow-wrap:anywhere !important;font-size:10.5px !important;font-weight:540 !important;line-height:1.3 !important;color:' + muted + ' !important;}',
            '.dtu-library-link-arrow{display:inline-flex !important;align-items:center !important;justify-content:flex-end !important;align-self:center !important;width:14px !important;height:14px !important;color:' + sectionTitle + ' !important;transition:transform 0.2s ease-in-out,color 0.2s ease-in-out !important;}',
            '.dtu-library-link-arrow svg{display:block !important;width:14px !important;height:14px !important;stroke:currentColor !important;fill:none !important;stroke-width:1.9 !important;stroke-linecap:round !important;stroke-linejoin:round !important;}',
            'a.dtu-library-link-item:hover .dtu-library-link-icon,a.dtu-library-link-item:hover .dtu-library-link-arrow{color:var(--dtu-ad-accent) !important;}',
            'a.dtu-library-link-item:hover .dtu-library-link-arrow{transform:translateX(2px) !important;}',
            '.dtu-library-crowd{display:flex !important;flex-direction:column !important;gap:12px !important;padding:2px 2px 0 !important;color:' + crowdText + ' !important;}',
            '.dtu-library-crowd-card{background:transparent !important;border:0 !important;border-radius:0 !important;padding:0 !important;box-shadow:none !important;}',
            '.dtu-library-crowd-hero{display:flex !important;flex-direction:column !important;gap:8px !important;padding:4px 6px 12px !important;background:transparent !important;box-shadow:inset 0 -1px 0 ' + crowdBorder + ' !important;}',
            '.dtu-library-crowd-hero-top{display:flex !important;align-items:flex-end !important;justify-content:space-between !important;gap:14px !important;flex-wrap:wrap !important;}',
            '.dtu-library-crowd-hero-main{display:flex !important;align-items:flex-end !important;gap:10px !important;flex-wrap:wrap !important;}',
            '.dtu-library-crowd-hero-stats{display:flex !important;align-items:flex-end !important;gap:18px !important;flex-wrap:wrap !important;}',
            '.dtu-library-crowd-hero-stat{display:flex !important;flex-direction:column !important;align-items:flex-start !important;gap:1px !important;min-width:74px !important;}',
            '.dtu-library-crowd-hero-stat-label{margin:0 !important;font-size:9px !important;font-weight:700 !important;line-height:1.1 !important;letter-spacing:0.45px !important;text-transform:uppercase !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-hero-stat-value{margin:0 !important;font-size:16px !important;font-weight:760 !important;line-height:1 !important;color:' + crowdText + ' !important;}',
            '.dtu-library-crowd-hero-stat-hint{margin:0 !important;font-size:9px !important;font-weight:520 !important;line-height:1.1 !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-label{margin:0 !important;font-size:9px !important;font-weight:700 !important;line-height:1.1 !important;letter-spacing:0.45px !important;text-transform:uppercase !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-free-wrap{display:flex !important;align-items:flex-end !important;gap:6px !important;}',
            '.dtu-library-crowd-free{margin:0 !important;font-size:30px !important;font-weight:800 !important;line-height:0.98 !important;letter-spacing:-0.35px !important;color:' + crowdText + ' !important;}',
            '.dtu-library-crowd-free-unit{margin:0 0 3px !important;font-size:10px !important;font-weight:620 !important;line-height:1 !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-status{margin:0 0 3px !important;font-size:12px !important;font-weight:700 !important;line-height:1.1 !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-progress{position:relative !important;width:100% !important;height:12px !important;margin-top:2px !important;border-radius:999px !important;background:' + crowdTrack + ' !important;border:1px solid ' + crowdBorder + ' !important;overflow:hidden !important;}',
            '.dtu-library-crowd-progress-fill{position:absolute !important;left:0 !important;top:0 !important;bottom:0 !important;width:0 !important;border-radius:999px !important;background:' + crowdGood + ' !important;transition:width 0.25s ease !important;}',
            '.dtu-library-crowd-progress[aria-valuetext*=\"Moderate\"] .dtu-library-crowd-progress-fill{background:' + crowdWarn + ' !important;}',
            '.dtu-library-crowd-progress[aria-valuetext*=\"Busy\"] .dtu-library-crowd-progress-fill{background:' + crowdBad + ' !important;}',
            '.dtu-library-crowd-chart-wrap{background:transparent !important;border:0 !important;border-radius:0 !important;padding:2px 0 0 !important;box-shadow:none !important;}',
            '.dtu-library-crowd-chart{display:block !important;width:100% !important;height:172px !important;border-radius:0 !important;background:transparent !important;}',
            '.dtu-library-crowd-chart-note{margin:10px 0 0 !important;font-size:10px !important;line-height:1.35 !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-events{display:flex !important;flex-direction:column !important;gap:4px !important;margin-top:8px !important;}',
            '.dtu-library-crowd-event{display:flex !important;align-items:flex-start !important;gap:6px !important;font-size:10px !important;line-height:1.3 !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-event-dot{display:inline-block !important;width:8px !important;min-width:8px !important;height:8px !important;border-radius:2px !important;margin-top:2px !important;background:rgba(var(--dtu-ad-accent-rgb),0.45) !important;border:1px solid rgba(var(--dtu-ad-accent-rgb),0.75) !important;}',
            '.dtu-library-crowd-event-text{display:inline !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-confidence{margin:0 !important;font-size:10px !important;line-height:1.35 !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-heatmap-toggle{appearance:none !important;border:1px solid ' + actionBorder + ' !important;background:' + actionBg + ' !important;color:' + crowdText + ' !important;border-radius:7px !important;cursor:pointer !important;padding:5px 9px !important;font-size:11px !important;font-weight:650 !important;line-height:1.2 !important;white-space:nowrap !important;}',
            '.dtu-library-crowd-heatmap-toggle:hover{background:' + actionBgHover + ' !important;border-color:var(--dtu-ad-accent) !important;color:var(--dtu-ad-accent-soft) !important;}',
            '.dtu-library-crowd-heatmap{display:none !important;background:' + crowdInset + ' !important;border:1px solid ' + crowdBorder + ' !important;border-radius:10px !important;padding:8px !important;}',
            '.dtu-library-crowd-heatmap.is-open{display:block !important;}',
            '.dtu-library-crowd-heatmap-head,.dtu-library-crowd-heatmap-row{display:grid !important;grid-template-columns:50px repeat(5,minmax(0,1fr)) !important;gap:4px !important;align-items:center !important;}',
            '.dtu-library-crowd-heatmap-head{margin:0 0 4px !important;}',
            '.dtu-library-crowd-heatmap-day{font-size:10px !important;font-weight:700 !important;line-height:1.1 !important;text-align:center !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-heatmap-hour{font-size:10px !important;font-weight:650 !important;line-height:1.1 !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-heatmap-cell{appearance:none !important;border:1px solid ' + crowdBorder + ' !important;border-radius:4px !important;min-height:16px !important;padding:0 !important;cursor:default !important;background:rgba(var(--dtu-ad-accent-rgb),0.08) !important;}',
            '.dtu-library-crowd-heatmap-cell:focus-visible{outline:2px solid var(--dtu-ad-accent) !important;outline-offset:1px !important;}',
            '.dtu-library-crowd-state{margin:0 !important;padding:10px !important;border-radius:8px !important;border:1px dashed ' + crowdBorder + ' !important;background:' + crowdInset + ' !important;font-size:11px !important;line-height:1.35 !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-feed-section{padding:4px 0 0 !important;background:transparent !important;border:0 !important;}',
            '.dtu-library-feed-header{margin:0 0 10px !important;padding:0 4px !important;}',
            '.dtu-library-feed-list{display:flex !important;flex-direction:column !important;gap:0 !important;background:transparent !important;}',
            'a.dtu-library-feed-item{display:flex !important;align-items:flex-start !important;gap:16px !important;padding:14px 4px 14px 0 !important;border-radius:0 !important;background:transparent !important;border:0 !important;box-shadow:inset 0 -1px 0 ' + feedDivider + ' !important;text-decoration:none !important;color:' + panelText + ' !important;transition:all 0.2s ease-in-out !important;}',
            'a.dtu-library-feed-item:hover{background:' + rowBgHover + ' !important;border-radius:14px !important;box-shadow:inset 0 -1px 0 transparent !important;transform:translateY(-2px) !important;}',
            '.dtu-library-date-badge{position:relative !important;display:flex !important;flex-direction:column !important;align-items:flex-start !important;justify-content:center !important;flex-shrink:0 !important;min-width:64px !important;height:auto !important;padding:2px 0 2px 14px !important;border-radius:0 !important;overflow:visible !important;background:transparent !important;border:0 !important;}',
            '.dtu-library-date-badge::before{content:\"\" !important;position:absolute !important;top:6px !important;bottom:6px !important;left:0 !important;width:3px !important;border-radius:999px !important;background:var(--dtu-ad-accent) !important;}',
            '.dtu-library-date-day{margin:0 !important;font-size:24px !important;font-weight:790 !important;line-height:0.95 !important;color:' + panelText + ' !important;}',
            '.dtu-library-date-month{margin:2px 0 0 !important;font-size:10px !important;font-weight:760 !important;line-height:1 !important;letter-spacing:0.7px !important;text-transform:uppercase !important;color:var(--dtu-ad-accent) !important;}',
            '.dtu-library-item-content{display:flex !important;flex-direction:column !important;gap:4px !important;min-width:0 !important;flex:1 1 auto !important;background:transparent !important;padding-top:1px !important;}',
            '.dtu-library-news-badge{position:relative !important;display:inline-flex !important;align-items:center !important;padding:0 0 0 14px !important;margin:0 0 2px !important;border-radius:0 !important;background:transparent !important;border:0 !important;color:var(--dtu-ad-accent) !important;font-size:10px !important;font-weight:760 !important;line-height:1.25 !important;letter-spacing:0.8px !important;text-transform:uppercase !important;}',
            '.dtu-library-news-badge::before{content:\"\" !important;position:absolute !important;left:0 !important;top:50% !important;width:8px !important;height:1.5px !important;transform:translateY(-50%) !important;background:currentColor !important;border-radius:999px !important;}',
            '.dtu-library-item-title{margin:0 !important;font-size:14px !important;font-weight:720 !important;line-height:1.35 !important;color:' + panelText + ' !important;display:-webkit-box !important;-webkit-line-clamp:2 !important;line-clamp:2 !important;-webkit-box-orient:vertical !important;overflow:hidden !important;}',
            '.dtu-library-item-meta{margin:0 !important;font-size:11px !important;line-height:1.45 !important;color:' + muted + ' !important;white-space:normal !important;overflow-wrap:anywhere !important;}',
            '.dtu-library-state-msg{margin:0 !important;padding:16px 12px !important;border-radius:9px !important;border:1px dashed ' + panelBorder + ' !important;background:' + stateBg + ' !important;text-align:center !important;color:' + muted + ' !important;font-size:12px !important;font-style:italic !important;}',
            '@media (max-width: 900px){.dtu-library-feed-grid{grid-template-columns:1fr !important;}.dtu-library-link-grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important;}.dtu-library-header{align-items:flex-start !important;}.dtu-library-header-main{flex-wrap:wrap !important;align-items:flex-start !important;gap:10px !important;}.dtu-library-header-occupancy{width:100% !important;gap:10px !important;}.dtu-library-header-actions{width:100% !important;justify-content:flex-start !important;}}',
            '@media (max-width: 520px){.dtu-library-modal-overlay{padding:8px !important;}.dtu-library-panel{width:calc(100vw - 16px) !important;max-height:calc(100vh - 16px) !important;border-radius:12px !important;}.dtu-library-header{padding:12px 14px 10px !important;}.dtu-library-content{padding:12px 14px 14px !important;}.dtu-library-link-grid{grid-template-columns:1fr !important;}.dtu-library-header-occupancy{gap:8px !important;}.dtu-library-header-occ-value{font-size:19px !important;}.dtu-library-header-updated{display:none !important;}}'
        ].join('');

        if (style.textContent !== css) style.textContent = css;
    }

    function requestLibraryEvents(cb, forceRefresh) {
        sendRuntimeMessage({ type: 'dtu-library-events', forceRefresh: !!forceRefresh }, function (resp) {
            if (!forceRefresh && resp && resp.ok && Array.isArray(resp.events) && !resp.events.length) {
                requestLibraryEvents(cb, true);
                return;
            }
            if (resp && resp.ok) _libraryEventsCache = resp;
            if (cb) cb(resp);
        });
    }

    function requestLibraryNews(cb, forceRefresh) {
        sendRuntimeMessage({ type: 'dtu-library-news', forceRefresh: !!forceRefresh }, function (resp) {
            if (!forceRefresh && resp && resp.ok && Array.isArray(resp.news) && !resp.news.length) {
                requestLibraryNews(cb, true);
                return;
            }
            if (resp && resp.ok) _libraryNewsCache = resp;
            if (cb) cb(resp);
        });
    }

    function requestLibraryCrowding(cb, forceRefresh) {
        var apiUrl = getLibrarySharedTrendApiUrl();
        if (!apiUrl) {
            if (cb) cb({ ok: false, error: 'not_configured', message: 'Shared library occupancy is not configured in this build.' });
            return;
        }
        sendRuntimeMessage({
            type: 'dtu-library-live-stats',
            forceRefresh: !!forceRefresh,
            apiUrl: apiUrl,
            lookbackDays: getLibrarySharedTrendLookbackDays()
        }, function (resp) {
            if (resp && resp.ok) {
                _libraryCrowdingCache = resp;
            }
            if (cb) cb(resp);
        });
    }

    function getLibrarySharedTrendApiUrl() {
        try {
            var config = getRuntimeConfig();
            var url = String(config.LIVE_LIBRARY_TRENDS_URL || '').trim();
            if (!url) return '';
            if (!/^https:\/\//i.test(url)) return '';
            return url;
        } catch (e0) {
            return '';
        }
    }

    function getLibrarySharedTrendLookbackDays() {
        try {
            var config = getRuntimeConfig();
            var n = parseInt(String(config.LIVE_LIBRARY_LOOKBACK_DAYS || '28').replace(/[^\d]/g, ''), 10);
            if (!isFinite(n)) return 28;
            return Math.max(3, Math.min(365, n));
        } catch (e0) {
            return 28;
        }
    }

    function formatHourWindow(hour) {
        var h = (hour % 24 + 24) % 24;
        var n = (h + 1) % 24;
        var hs = (h < 10 ? '0' : '') + h + ':00';
        var ns = (n < 10 ? '0' : '') + n + ':00';
        return hs + '-' + ns;
    }

    function parseLibraryIntLoose(value, fallback) {
        var digits = String(value == null ? '' : value).match(/-?\d+/);
        if (!digits) return (typeof fallback === 'number' ? fallback : null);
        var num = parseInt(digits[0], 10);
        return isFinite(num) ? num : (typeof fallback === 'number' ? fallback : null);
    }

    function parseLibraryNumLoose(value, fallback) {
        var n = Number(value);
        return isFinite(n) ? n : (typeof fallback === 'number' ? fallback : null);
    }

    function toLibraryDateKey(ts) {
        var d = new Date(ts);
        if (!(d instanceof Date) || isNaN(d.getTime())) return '';
        var y = d.getFullYear();
        var m = d.getMonth() + 1;
        var day = d.getDate();
        return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
    }

    function parseLibraryMinuteOfDay(raw) {
        if (typeof raw === 'number' && isFinite(raw)) {
            if (raw >= 0 && raw < 24 * 60) return Math.round(raw);
            if (raw > 24 * 60) {
                var d0 = new Date(raw);
                if (!isNaN(d0.getTime())) return d0.getHours() * 60 + d0.getMinutes();
            }
        }
        var s = String(raw || '').trim();
        if (!s) return null;
        var hhmm = s.match(/^(\d{1,2}):(\d{2})$/);
        if (hhmm) {
            var hh = parseInt(hhmm[1], 10);
            var mm = parseInt(hhmm[2], 10);
            if (isFinite(hh) && isFinite(mm) && hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
                return hh * 60 + mm;
            }
        }
        var d = new Date(s);
        if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
        return null;
    }

    function getLibraryWeekdayName(dayIndex) {
        var names = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return names[(dayIndex % 7 + 7) % 7];
    }

    function normalizeLibraryWeekdayKey(raw) {
        var key = String(raw || '').toLowerCase().trim();
        if (!key) return '';
        if (/^(0|sun|sunday)$/.test(key)) return 'sunday';
        if (/^(1|mon|monday)$/.test(key)) return 'monday';
        if (/^(2|tue|tuesday)$/.test(key)) return 'tuesday';
        if (/^(3|wed|wednesday)$/.test(key)) return 'wednesday';
        if (/^(4|thu|thursday)$/.test(key)) return 'thursday';
        if (/^(5|fri|friday)$/.test(key)) return 'friday';
        if (/^(6|sat|saturday)$/.test(key)) return 'saturday';
        if (key === 'generic') return 'generic';
        return '';
    }

    function normalizeLibraryHourRows(rows) {
        if (!Array.isArray(rows)) return [];
        var map = {};
        rows.forEach(function (row) {
            var hour = parseLibraryIntLoose(row && (row.hour != null ? row.hour : row.hour_local), null);
            var avg = parseLibraryNumLoose(
                row && (row.avg_visitors != null ? row.avg_visitors
                    : row.avgNow != null ? row.avgNow
                        : row.avg_now),
                null
            );
            var minV = parseLibraryNumLoose(
                row && (row.min_visitors != null ? row.min_visitors
                    : row.minNow != null ? row.minNow
                        : row.min_now),
                null
            );
            var maxV = parseLibraryNumLoose(
                row && (row.max_visitors != null ? row.max_visitors
                    : row.maxNow != null ? row.maxNow
                        : row.max_now),
                null
            );
            var samples = parseLibraryIntLoose(row && row.samples, 0);
            if (hour == null || hour < 0 || hour > 23 || avg == null || !isFinite(avg)) return;

            if (minV == null && maxV == null) {
                var spread = Math.max(8, Math.abs(avg) * 0.08);
                minV = Math.max(0, avg - spread);
                maxV = avg + spread;
            } else {
                if (minV == null) minV = Math.max(0, avg - Math.max(5, Math.abs(avg - maxV)));
                if (maxV == null) maxV = Math.max(avg, avg + Math.max(5, Math.abs(avg - minV)));
            }
            if (maxV < minV) {
                var tmp = minV;
                minV = maxV;
                maxV = tmp;
            }
            map[hour] = {
                hour: hour,
                avg: avg,
                min: minV,
                max: maxV,
                samples: Math.max(0, samples || 0),
                window: formatHourWindow(hour)
            };
        });
        var out = Object.keys(map).map(function (k) { return map[k]; });
        out.sort(function (a, b) { return a.hour - b.hour; });
        return out;
    }

    function normalizeLibraryWeekdayAverages(rawMap) {
        var out = {};
        if (!rawMap || typeof rawMap !== 'object') return out;
        Object.keys(rawMap).forEach(function (key) {
            var normKey = normalizeLibraryWeekdayKey(key);
            if (!normKey) return;
            var rows = normalizeLibraryHourRows(rawMap[key]);
            if (rows.length) out[normKey] = rows;
        });
        return out;
    }

    function estimateLibraryWeekdayOccurrences(rows) {
        if (!Array.isArray(rows) || !rows.length) return null;
        var estimates = [];
        rows.forEach(function (row) {
            var samples = parseLibraryNumLoose(row && row.samples, null);
            if (!isFinite(samples) || samples <= 0) return;
            estimates.push(samples / 60);
        });
        if (!estimates.length) return null;
        estimates.sort(function (a, b) { return a - b; });
        var mid = Math.floor(estimates.length / 2);
        var median = (estimates.length % 2)
            ? estimates[mid]
            : ((estimates[mid - 1] + estimates[mid]) / 2);
        if (!isFinite(median) || median <= 0) return null;
        return Math.max(1, Math.round(median));
    }

    function formatLibraryWeekdayObservations(weekdayName, count) {
        var labels = {
            sunday: 'Sunday',
            monday: 'Monday',
            tuesday: 'Tuesday',
            wednesday: 'Wednesday',
            thursday: 'Thursday',
            friday: 'Friday',
            saturday: 'Saturday'
        };
        var base = labels[normalizeLibraryWeekdayKey(weekdayName)] || 'day';
        return count === 1 ? base : (base + 's');
    }

    function extractLibraryCurrentSnapshot(crowdingResp, fallbackOccupancyResp) {
        var snap = {
            visitors: null,
            today: null,
            freeSeats: null,
            capacity: null,
            fetchedAt: null,
            source: '',
            hasCurrent: false
        };

        var c = crowdingResp && crowdingResp.current ? crowdingResp.current : null;
        var latest = crowdingResp && crowdingResp.latest ? crowdingResp.latest : null;

        if (c || latest) {
            snap.visitors = parseLibraryIntLoose(c && c.visitors != null ? c.visitors : latest && latest.now, null);
            snap.today = parseLibraryIntLoose(c && c.total_visits != null ? c.total_visits : latest && latest.today, null);
            snap.capacity = parseLibraryIntLoose(c && c.capacity != null ? c.capacity : latest && latest.capacity, null);
            snap.freeSeats = parseLibraryIntLoose(c && c.free_seats != null ? c.free_seats : latest && latest.freeSeats, null);
            if (snap.freeSeats == null && snap.capacity != null && snap.visitors != null) {
                snap.freeSeats = Math.max(0, snap.capacity - snap.visitors);
            }
            var tsRaw = c && c.timestamp ? c.timestamp : (latest && (latest.fetchedAtIso || latest.fetchedAt));
            var tsParsed = typeof tsRaw === 'number' ? tsRaw : Date.parse(tsRaw || '');
            if (isFinite(tsParsed)) snap.fetchedAt = tsParsed;
            snap.source = String((crowdingResp && crowdingResp.sourceUrl) || (latest && latest.source) || '').trim();
            snap.hasCurrent = snap.visitors != null || snap.freeSeats != null;
        }

        if (!snap.hasCurrent && fallbackOccupancyResp && fallbackOccupancyResp.occupancy) {
            var occ = fallbackOccupancyResp.occupancy;
            snap.visitors = parseLibraryIntLoose(occ.now, null);
            snap.today = parseLibraryIntLoose(occ.today, null);
            snap.capacity = parseLibraryIntLoose(occ.capacity, null);
            snap.freeSeats = parseLibraryIntLoose(occ.freeSeats, null);
            if (snap.freeSeats == null && snap.capacity != null && snap.visitors != null) {
                snap.freeSeats = Math.max(0, snap.capacity - snap.visitors);
            }
            var ts = parseLibraryIntLoose(occ.fetchedAt, null);
            if (ts != null) snap.fetchedAt = ts;
            snap.source = String(occ.source || '').trim();
            snap.hasCurrent = snap.visitors != null || snap.freeSeats != null;
        }

        return snap;
    }

    function buildLibraryTodaySamplesFromPayload(crowdingResp, referenceTs) {
        var today = crowdingResp && crowdingResp.today ? crowdingResp.today : null;
        if (!today || !Array.isArray(today.samples)) return [];
        var refDateKey = toLibraryDateKey(referenceTs || Date.now());
        var byMinute = {};

        today.samples.forEach(function (sample) {
            if (!sample || typeof sample !== 'object') return;
            var visitors = parseLibraryNumLoose(
                sample.visitors != null ? sample.visitors
                    : sample.now != null ? sample.now
                        : sample.value,
                null
            );
            if (visitors == null) return;

            var minute = parseLibraryMinuteOfDay(
                sample.time != null ? sample.time
                    : sample.minute != null ? sample.minute
                        : sample.timestamp != null ? sample.timestamp
                            : sample.ts != null ? sample.ts
                                : sample.at
            );
            if (minute == null || minute < 0 || minute >= 24 * 60) return;

            var sampleTs = sample.timestamp != null ? Date.parse(sample.timestamp) : NaN;
            if (!isFinite(sampleTs) && sample.ts != null) sampleTs = parseLibraryIntLoose(sample.ts, NaN);
            if (isFinite(sampleTs)) {
                var sampleDateKey = toLibraryDateKey(sampleTs);
                if (sampleDateKey && refDateKey && sampleDateKey !== refDateKey) return;
            }
            byMinute[minute] = visitors;
        });

        return Object.keys(byMinute).map(function (k) {
            return { minute: parseInt(k, 10), visitors: byMinute[k] };
        }).sort(function (a, b) { return a.minute - b.minute; });
    }

    function mergeLibraryTodaySamples(primary, fallback, currentMinute, currentVisitors) {
        var byMinute = {};
        (fallback || []).forEach(function (p) {
            if (p && isFinite(p.minute) && isFinite(p.visitors)) byMinute[p.minute] = p.visitors;
        });
        (primary || []).forEach(function (p) {
            if (p && isFinite(p.minute) && isFinite(p.visitors)) byMinute[p.minute] = p.visitors;
        });
        if (isFinite(currentMinute) && isFinite(currentVisitors)) {
            byMinute[currentMinute] = currentVisitors;
        }
        return Object.keys(byMinute).map(function (k) {
            return { minute: parseInt(k, 10), visitors: byMinute[k] };
        }).sort(function (a, b) { return a.minute - b.minute; });
    }

    function buildLibraryCrowdingModel(crowdingResp, fallbackOccupancyResp) {
        var nowTs = Date.now();
        var snapshot = extractLibraryCurrentSnapshot(crowdingResp, fallbackOccupancyResp);
        var nowDate = new Date(snapshot.fetchedAt || nowTs);
        var nowMinute = nowDate.getHours() * 60 + nowDate.getMinutes();
        var weekdayName = getLibraryWeekdayName(nowDate.getDay());

        var historical = crowdingResp && crowdingResp.historical ? crowdingResp.historical : null;
        var weekdayMap = normalizeLibraryWeekdayAverages(historical && historical.weekday_averages);
        var operatingStartHour = 8;
        var operatingEndHour = 22;
        var isWithinDisplayHours = isLibraryMinuteWithinDisplayHours(nowMinute, operatingStartHour, operatingEndHour);

        if (!Object.keys(weekdayMap).length && crowdingResp && crowdingResp.trends && Array.isArray(crowdingResp.trends.hourly)) {
            weekdayMap.generic = normalizeLibraryHourRows(crowdingResp.trends.hourly);
        }

        var weekdayRows = Array.isArray(weekdayMap[weekdayName]) ? weekdayMap[weekdayName] : [];
        var hasWeekdaySpecificHistory = weekdayRows.length > 0;
        var typicalRows = hasWeekdaySpecificHistory ? weekdayRows : (weekdayMap.generic || []);
        var currentHour = Math.floor(nowMinute / 60);
        var typicalNowRow = typicalRows.find(function (r) { return r.hour === currentHour; }) || null;
        var typicalNow = typicalNowRow ? typicalNowRow.avg : null;
        var typicalBandEndMinute = null;
        if (typicalRows.length) {
            typicalBandEndMinute = Math.min(operatingEndHour * 60, (typicalRows[typicalRows.length - 1].hour + 1) * 60);
        }

        var todaySamplesPayload = buildLibraryTodaySamplesFromPayload(crowdingResp, snapshot.fetchedAt || nowTs);
        var todaySamples = mergeLibraryTodaySamples(
            todaySamplesPayload,
            [],
            nowMinute,
            snapshot.visitors
        );

        var daysCollected = parseLibraryIntLoose(historical && historical.days_collected, null);
        if (daysCollected == null && crowdingResp && crowdingResp.trends) {
            var totalSamples = parseLibraryIntLoose(crowdingResp.trends.totalSamples, null);
            if (totalSamples != null) daysCollected = Math.max(1, Math.round(totalSamples / (60 * 8)));
        }

        var weekdayObservationCount = hasWeekdaySpecificHistory ? estimateLibraryWeekdayOccurrences(weekdayRows) : null;
        var weekdayObservationEstimated = false;
        if (weekdayObservationCount == null && daysCollected != null && daysCollected >= 7) {
            weekdayObservationCount = Math.max(1, Math.round(daysCollected / 7));
            weekdayObservationEstimated = true;
        }

        var occupancyRatio = null;
        if (snapshot.capacity != null && snapshot.capacity > 0 && snapshot.visitors != null) {
            occupancyRatio = Math.max(0, Math.min(1, snapshot.visitors / snapshot.capacity));
        }

        var heatmapDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        var heatmapAvailable = daysCollected != null && daysCollected >= 7
            && heatmapDays.some(function (day) { return Array.isArray(weekdayMap[day]) && weekdayMap[day].length; });

        return {
            snapshot: snapshot,
            nowTs: snapshot.fetchedAt || nowTs,
            nowMinute: nowMinute,
            weekdayName: weekdayName,
            startHour: operatingStartHour,
            endHour: operatingEndHour,
            isWithinDisplayHours: isWithinDisplayHours,
            todaySamples: todaySamples,
            typicalRows: typicalRows,
            weekdayMap: weekdayMap,
            typicalNow: typicalNow,
            typicalBandEndMinute: typicalBandEndMinute,
            daysCollected: daysCollected,
            weekdayObservationCount: weekdayObservationCount,
            weekdayObservationEstimated: weekdayObservationEstimated,
            hasWeekdaySpecificHistory: hasWeekdaySpecificHistory,
            occupancyRatio: occupancyRatio,
            heatmapAvailable: heatmapAvailable
        };
    }

    function getLibraryCrowdingTier(occupancyRatio) {
        // isFinite(null) === true in JS (null coerces to 0), so check for null explicitly
        if (occupancyRatio == null || !isFinite(occupancyRatio)) {
            return { key: 'unknown', label: 'Unknown', color: '#888' };
        }
        if (occupancyRatio <= 0.60) {
            return { key: 'low', label: 'Plenty of seats', color: '#2e7d32' };
        }
        if (occupancyRatio <= 0.85) {
            // Fixed amber — not accent — so the green→amber→red traffic-light
            // system stays consistent regardless of the user's accent colour pick.
            return { key: 'medium', label: 'Moderate', color: '#d97706' };
        }
        return { key: 'high', label: 'Busy', color: '#c62828' };
    }

    function formatLibraryHourMinute(minute) {
        var m = Math.max(0, Math.min(1439, parseLibraryIntLoose(minute, 0)));
        var hh = Math.floor(m / 60);
        var mm = m % 60;
        return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
    }

    function formatLibraryMinuteRange(startMinute, endMinute) {
        return formatLibraryHourMinute(startMinute) + '-' + formatLibraryHourMinute(endMinute);
    }

    function isLibraryMinuteWithinDisplayHours(minute, startHour, endHour) {
        if (!isFinite(minute)) return false;
        var startMinute = parseLibraryIntLoose(startHour, 0) * 60;
        var endMinute = parseLibraryIntLoose(endHour, 24) * 60;
        return minute >= startMinute && minute <= endMinute;
    }

    function parseLibraryTimeRangeFromText(text) {
        var raw = String(text || '');
        var m = raw.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
        if (!m) return null;
        var h1 = parseInt(m[1], 10);
        var mm1 = parseInt(m[2], 10);
        var h2 = parseInt(m[3], 10);
        var mm2 = parseInt(m[4], 10);
        if (![h1, mm1, h2, mm2].every(function (n) { return isFinite(n); })) return null;
        if (h1 < 0 || h1 > 23 || h2 < 0 || h2 > 23 || mm1 < 0 || mm1 > 59 || mm2 < 0 || mm2 > 59) return null;
        return { startMinute: h1 * 60 + mm1, endMinute: h2 * 60 + mm2 };
    }

    function isLibraryEventAtDtuLibrary(ev) {
        var where = String((ev && ev.location) || '').toLowerCase();
        return /dtu\s*library/.test(where);
    }

    function buildLibraryEventIntervals(eventsResp, model) {
        if (!eventsResp || eventsResp.ok === false || !Array.isArray(eventsResp.events) || !model) return [];
        var dayStart = new Date(model.nowTs || Date.now());
        dayStart.setHours(0, 0, 0, 0);
        var dayStartTs = dayStart.getTime();
        var dayEndTs = dayStartTs + 24 * 60 * 60 * 1000;
        var graphStart = model.startHour * 60;
        var graphEnd = model.endHour * 60;
        var out = [];

        eventsResp.events.forEach(function (ev) {
            if (!ev || !isLibraryEventAtDtuLibrary(ev)) return;

            var startTs = Date.parse(ev.startIso || '');
            var endTs = Date.parse(ev.endIso || '');

            if (!isFinite(startTs)) {
                return;
            }

            if (!isFinite(endTs) || endTs <= startTs) {
                var parsed = parseLibraryTimeRangeFromText(ev.formattedDate || ev.excerpt || '');
                if (parsed) {
                    var base = new Date(startTs);
                    startTs = new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.floor(parsed.startMinute / 60), parsed.startMinute % 60).getTime();
                    endTs = new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.floor(parsed.endMinute / 60), parsed.endMinute % 60).getTime();
                    if (endTs <= startTs) endTs += 24 * 60 * 60 * 1000;
                } else {
                    endTs = startTs + 60 * 60 * 1000;
                }
            }

            if (endTs <= dayStartTs || startTs >= dayEndTs) return;

            var clippedStart = Math.max(startTs, dayStartTs);
            var clippedEnd = Math.min(endTs, dayEndTs);
            var sDate = new Date(clippedStart);
            var eDate = new Date(clippedEnd);
            var startMinute = sDate.getHours() * 60 + sDate.getMinutes();
            var endMinute = eDate.getHours() * 60 + eDate.getMinutes();

            if (clippedEnd === dayEndTs) endMinute = 24 * 60;
            startMinute = Math.max(graphStart, startMinute);
            endMinute = Math.min(graphEnd, endMinute);
            if (endMinute <= startMinute) return;

            out.push({
                startMinute: startMinute,
                endMinute: endMinute,
                title: String(ev.title || 'Library event'),
                location: String(ev.location || '')
            });
        });

        out.sort(function (a, b) { return a.startMinute - b.startMinute; });
        return out;
    }

    function drawLibraryCrowdingChart(canvas, model, eventIntervals) {
        if (!canvas || !model) return;
        var dpr = Math.max(1, window.devicePixelRatio || 1);
        var cssW = Math.max(320, Math.round(canvas.clientWidth || 640));
        var cssH = Math.max(150, Math.round(canvas.clientHeight || 186));
        var targetW = Math.round(cssW * dpr);
        var targetH = Math.round(cssH * dpr);
        if (canvas.width !== targetW) canvas.width = targetW;
        if (canvas.height !== targetH) canvas.height = targetH;

        var ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(dpr, dpr);

        var rootStyles = getComputedStyle(document.documentElement);
        var accent = (rootStyles.getPropertyValue('--dtu-ad-accent') || '#1f7ae0').trim();
        var accentRgb = (rootStyles.getPropertyValue('--dtu-ad-accent-rgb') || '31,122,224').trim();
        var gridColor = isDarkModeEnabled() ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.14)';
        var textColor = isDarkModeEnabled() ? '#9aa0aa' : '#667084';
        // Helper: apply opacity to the dynamic accent color safely
        function accentWithOpacity(opacity) { return 'rgba(' + accentRgb + ',' + opacity + ')'; }
        var bandFill = accentWithOpacity(isDarkModeEnabled() ? 0.045 : 0.07);
        var bandStroke = accentWithOpacity(isDarkModeEnabled() ? 0.42 : 0.48);
        var markerColor = isDarkModeEnabled() ? '#f5f5f5' : '#1a1a1a';

        // Hide the min-max band if there are fewer than 3 weekday observations
        // (a range is meaningless with only 1–2 data points)
        var _weekdayObs = (model.weekdayObservationCount != null) ? model.weekdayObservationCount : null;
        var _daysObs = (model.daysCollected != null) ? model.daysCollected : null;
        // Fall back to daysCollected / 7 when no weekday-specific count is available
        var _impliedWeekdayObs = (_weekdayObs != null) ? _weekdayObs : (_daysObs != null ? Math.round(_daysObs / 7) : 0);
        var showHistoricalBand = _impliedWeekdayObs >= 3;

        var startMinute = model.startHour * 60;
        var endMinute = model.endHour * 60;
        var pad = { left: 38, right: 16, top: 14, bottom: 24 };
        var w = cssW;
        var h = cssH;
        var innerW = Math.max(10, w - pad.left - pad.right);
        var innerH = Math.max(10, h - pad.top - pad.bottom);

        var today = (model.todaySamples || []).filter(function (p) {
            return isFinite(p.minute) && isFinite(p.visitors) && p.minute >= startMinute && p.minute <= endMinute;
        });
        var typical = (model.typicalRows || []).filter(function (r) {
            return isFinite(r.hour) && isFinite(r.avg) && r.hour >= model.startHour && r.hour <= model.endHour;
        });
        if (showHistoricalBand && typical.length >= 2) {
            var spanCount = 0;
            var spanTotal = 0;
            typical.forEach(function (r) {
                if (isFinite(r.min) && isFinite(r.max) && r.max >= r.min) {
                    spanTotal += (r.max - r.min);
                    spanCount += 1;
                }
            });
            var avgHistoricalSpan = spanCount ? spanTotal / spanCount : 0;
            var capacityForBand = parseLibraryNumLoose(model.snapshot && model.snapshot.capacity, null);
            var maxUsefulSpan = isFinite(capacityForBand) && capacityForBand > 0 ? Math.max(160, capacityForBand * 0.45) : 260;
            if (!spanCount || avgHistoricalSpan > maxUsefulSpan) showHistoricalBand = false;
        }

        var maxY = 0;
        var capacityForScale = parseLibraryNumLoose(model.snapshot && model.snapshot.capacity, null);
        if (isFinite(capacityForScale) && capacityForScale > 0) maxY = Math.max(maxY, capacityForScale);
        today.forEach(function (p) { maxY = Math.max(maxY, p.visitors); });
        typical.forEach(function (r) { maxY = Math.max(maxY, r.max, r.avg); });
        if (!isFinite(maxY) || maxY <= 0) maxY = 100;
        maxY = Math.ceil(maxY / 10) * 10;
        // Always leave ~12.5% headroom above capacity so the max line floats
        // visibly as a ceiling rather than sitting on the top edge (800 → 900)
        if (isFinite(capacityForScale) && capacityForScale > 0) {
            maxY = Math.max(maxY, Math.ceil(capacityForScale * 1.125 / 10) * 10);
        }

        function xForMinute(minute) {
            var clamped = Math.max(startMinute, Math.min(endMinute, minute));
            var t = (clamped - startMinute) / Math.max(1, endMinute - startMinute);
            return pad.left + t * innerW;
        }

        function yForVisitors(value) {
            var v = Math.max(0, Number(value || 0));
            var t = v / Math.max(1, maxY);
            return pad.top + (1 - t) * innerH;
        }

        var intervals = Array.isArray(eventIntervals) ? eventIntervals : [];
        if (intervals.length) {
            ctx.fillStyle = 'rgba(' + accentRgb + ',' + (isDarkModeEnabled() ? '0.12' : '0.10') + ')';
            ctx.strokeStyle = 'rgba(' + accentRgb + ',' + (isDarkModeEnabled() ? '0.30' : '0.24') + ')';
            ctx.lineWidth = 1;
            intervals.forEach(function (itv) {
                var x0 = xForMinute(itv.startMinute);
                var x1 = xForMinute(itv.endMinute);
                var wBand = Math.max(2, x1 - x0);
                ctx.fillRect(x0, pad.top, wBand, innerH);
                ctx.strokeRect(x0, pad.top, wBand, innerH);
            });
        }

        ctx.lineWidth = 1;
        ctx.strokeStyle = gridColor;
        ctx.fillStyle = textColor;
        ctx.font = '10px sans-serif';

        // Compute a clean round step size targeting ~5 ticks (e.g. 200, 250, 500…)
        var _roughStep = maxY / 5;
        var _mag = Math.pow(10, Math.floor(Math.log10(Math.max(1, _roughStep))));
        var _norm = _roughStep / _mag;
        var niceStepY = _norm <= 1.5 ? _mag : _norm <= 3 ? 2 * _mag : _norm <= 7 ? 5 * _mag : 10 * _mag;
        for (var yValue = 0; yValue <= maxY + niceStepY * 0.01; yValue += niceStepY) {
            var yPos = yForVisitors(yValue);
            ctx.beginPath();
            ctx.moveTo(pad.left, yPos);
            ctx.lineTo(w - pad.right, yPos);
            ctx.stroke();
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(Math.round(yValue)), pad.left - 6, yPos);
        }

        var capacityValue = parseLibraryNumLoose(model.snapshot && model.snapshot.capacity, null);
        if (isFinite(capacityValue) && capacityValue > 0) {
            var capacityY = yForVisitors(capacityValue);
            if (capacityY >= pad.top - 1 && capacityY <= (h - pad.bottom + 1)) {
                ctx.beginPath();
                ctx.moveTo(pad.left, capacityY);
                ctx.lineTo(w - pad.right, capacityY);
                ctx.strokeStyle = isDarkModeEnabled() ? 'rgba(255,255,255,0.70)' : 'rgba(15,23,42,0.60)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 4]);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.fillStyle = isDarkModeEnabled() ? 'rgba(255,255,255,0.70)' : 'rgba(15,23,42,0.60)';
                ctx.font = '10px sans-serif';
                ctx.fillText('max ' + Math.round(capacityValue), w - pad.right - 2, capacityY - 2);
            }
        }

        for (var hour = model.startHour; hour <= model.endHour; hour += 2) {
            var xPos = xForMinute(hour * 60);
            ctx.beginPath();
            ctx.moveTo(xPos, pad.top);
            ctx.lineTo(xPos, h - pad.bottom);
            ctx.stroke();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText((hour < 10 ? '0' : '') + hour + ':00', xPos, h - pad.bottom + 4);
        }

        if (typical.length >= 2) {
            var firstTypical = typical[0];
            var lastTypical = typical[typical.length - 1];
            var typicalStartMinute = Math.max(startMinute, firstTypical.hour * 60);
            var typicalEndMinute = Math.min(endMinute, (lastTypical.hour + 1) * 60);

            // Only draw the shaded min-max band if we have enough historical observations
            if (showHistoricalBand) {
                ctx.beginPath();
                ctx.moveTo(xForMinute(typicalStartMinute), yForVisitors(firstTypical.max));
                typical.forEach(function (r) {
                    ctx.lineTo(xForMinute(r.hour * 60 + 30), yForVisitors(r.max));
                });
                ctx.lineTo(xForMinute(typicalEndMinute), yForVisitors(lastTypical.max));
                ctx.lineTo(xForMinute(typicalEndMinute), yForVisitors(lastTypical.min));
                for (var i = typical.length - 1; i >= 0; i--) {
                    var rr = typical[i];
                    ctx.lineTo(xForMinute(rr.hour * 60 + 30), yForVisitors(rr.min));
                }
                ctx.lineTo(xForMinute(typicalStartMinute), yForVisitors(firstTypical.min));
                ctx.closePath();
                ctx.fillStyle = bandFill;
                ctx.fill();
            }

            // Dashed "typical" average line — always shown when data exists
            ctx.beginPath();
            ctx.moveTo(xForMinute(typicalStartMinute), yForVisitors(firstTypical.avg));
            typical.forEach(function (r) {
                ctx.lineTo(xForMinute(r.hour * 60 + 30), yForVisitors(r.avg));
            });
            ctx.lineTo(xForMinute(typicalEndMinute), yForVisitors(lastTypical.avg));
            ctx.strokeStyle = bandStroke;
            ctx.lineWidth = 1.2;
            ctx.setLineDash([4, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (today.length >= 2) {
            ctx.beginPath();
            today.forEach(function (p, idx) {
                var x = xForMinute(p.minute);
                var y = yForVisitors(p.visitors);
                if (idx === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.strokeStyle = accent;        // Current line: 100% opacity
            ctx.lineWidth = 2.4;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            // Slight drop shadow for contrast on light accent colours
            ctx.shadowColor = isDarkModeEnabled() ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.22)';
            ctx.shadowBlur = 4;
            ctx.stroke();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        } else if (today.length === 1) {
            ctx.beginPath();
            ctx.arc(xForMinute(today[0].minute), yForVisitors(today[0].visitors), 3.2, 0, Math.PI * 2);
            ctx.fillStyle = accent;
            ctx.shadowColor = isDarkModeEnabled() ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.22)';
            ctx.shadowBlur = 4;
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }

        if (model.isWithinDisplayHours && isFinite(model.nowMinute)) {
            var markerX = xForMinute(model.nowMinute);
            ctx.beginPath();
            ctx.moveTo(markerX, pad.top);
            ctx.lineTo(markerX, h - pad.bottom);
            ctx.strokeStyle = markerColor;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 3]);
            ctx.stroke();
            ctx.setLineDash([]);

            if (model.snapshot && model.snapshot.visitors != null && isFinite(model.snapshot.visitors)) {
                ctx.beginPath();
                ctx.arc(markerX, yForVisitors(model.snapshot.visitors), 3, 0, Math.PI * 2);
                ctx.fillStyle = markerColor;
                ctx.fill();
            }
        }

        // Return band-visibility flags so the caller can update the HTML legend
        return { showHistoricalBand: showHistoricalBand, hasTypical: typical.length >= 2 };
    }

    function buildLibraryCrowdingInsightLine(model) {
        if (!model || !model.snapshot || !model.snapshot.hasCurrent) {
            return 'Library data unavailable right now.';
        }

        if (!model.isWithinDisplayHours) {
            return 'Live occupancy is hidden outside the ' + formatLibraryMinuteRange(model.startHour * 60, model.endHour * 60) + ' library graph window.';
        }

        var current = model.snapshot.visitors;
        var typicalNow = model.typicalNow;
        if (isFinite(current) && isFinite(typicalNow)) {
            var delta = current - typicalNow;
            var threshold = Math.max(20, typicalNow * 0.12);
            if (delta <= -threshold) return 'Quieter than typical for this hour.';
            if (delta >= threshold) return 'Busier than typical for this hour.';
            return 'Around typical for this hour.';
        }

        if (model.occupancyRatio != null && isFinite(model.occupancyRatio)) {
            if (model.occupancyRatio >= 0.85) return 'Almost full right now.';
            if (model.occupancyRatio <= 0.60) return 'Plenty of free seats right now.';
            return 'Moderately busy right now.';
        }

        return 'Building historical averages.';
    }

    function buildLibraryCrowdingConfidenceLine(model) {
        if (!model) return '';
        var sampleCount = (model.todaySamples || []).length;
        var dayCount = parseLibraryIntLoose(model.daysCollected, null);
        var weekdayCount = parseLibraryIntLoose(model.weekdayObservationCount, null);
        if (dayCount != null && dayCount >= 7 && weekdayCount != null && weekdayCount > 0) {
            var prefix = model.weekdayObservationEstimated ? 'Based on about ' : 'Based on ';
            return prefix + weekdayCount + ' ' + formatLibraryWeekdayObservations(model.weekdayName, weekdayCount) + '.';
        }
        if (dayCount != null && dayCount > 0) {
            return 'Based on about ' + dayCount + ' day' + (dayCount === 1 ? '' : 's') + ' of collected data.';
        }
        if (sampleCount > 0) {
            return 'Today\'s shared trend is still building.';
        }
        return 'Building historical averages...';
    }

    function isLibraryHeatmapExpanded() {
        try { return localStorage.getItem(LIBRARY_CROWD_HEATMAP_EXPANDED_KEY) === 'true'; } catch (e0) { return false; }
    }

    function setLibraryHeatmapExpanded(expanded) {
        try { localStorage.setItem(LIBRARY_CROWD_HEATMAP_EXPANDED_KEY, expanded ? 'true' : 'false'); } catch (e0) { }
    }

    function removeDTULearnHelpDropdown() {
        var api = getLearnNavUiApi();
        if (api && typeof api.removeDTULearnHelpDropdown === 'function') {
            api.removeDTULearnHelpDropdown();
        }
    }

    function getLibraryUiApi() {
        try { return globalThis.DTUAfterDarkLibraryUi || null; } catch (e0) { return null; }
    }

    try {
        var existingLibraryDeps = globalThis.DTUAfterDarkLibraryDeps || {};
        globalThis.DTUAfterDarkLibraryDeps = Object.assign({}, existingLibraryDeps, {
            isTopWindow: existingLibraryDeps.isTopWindow || function () { return isTopWindow(); },
            isLibraryEnabled: isLibraryEnabled,
            isDTULearnHomepage: existingLibraryDeps.isDTULearnHomepage || isDTULearnHomepage,
            deepQueryAll: existingLibraryDeps.deepQueryAll || deepQueryAll,
            ensureLibraryRuntimeStyles: ensureLibraryRuntimeStyles,
            requestLibraryEvents: requestLibraryEvents,
            requestLibraryNews: requestLibraryNews,
            requestLibraryCrowding: requestLibraryCrowding,
            createLibraryTrendSection: createLibraryTrendSection,
            renderLibraryTrendSection: renderLibraryTrendSection,
            extractLibraryCurrentSnapshot: extractLibraryCurrentSnapshot,
            formatLibraryOccupancyCount: formatLibraryOccupancyCount,
            markExt: existingLibraryDeps.markExt || markExt,
            getLibraryUiState: function () {
                return {
                    eventsCache: _libraryEventsCache,
                    newsCache: _libraryNewsCache,
                    crowdingCache: _libraryCrowdingCache,
                    escHandler: _libraryEscHandler,
                    occupancyAutoTimer: _libraryOccupancyAutoTimer
                };
            },
            setLibraryUiState: function (next) {
                if (!next || typeof next !== 'object') return;
                if (Object.prototype.hasOwnProperty.call(next, 'eventsCache')) _libraryEventsCache = next.eventsCache || null;
                if (Object.prototype.hasOwnProperty.call(next, 'newsCache')) _libraryNewsCache = next.newsCache || null;
                if (Object.prototype.hasOwnProperty.call(next, 'crowdingCache')) _libraryCrowdingCache = next.crowdingCache || null;
                if (Object.prototype.hasOwnProperty.call(next, 'escHandler')) _libraryEscHandler = next.escHandler || null;
                if (Object.prototype.hasOwnProperty.call(next, 'occupancyAutoTimer')) _libraryOccupancyAutoTimer = next.occupancyAutoTimer || null;
            }
        });
    } catch (eLibDeps) { }

    function removeLibraryNavDropdown() {
        var api = getLibraryUiApi();
        if (api && typeof api.removeLibraryNavDropdown === 'function') {
            api.removeLibraryNavDropdown();
        }
    }

    function hideLibraryPanel() {
        var api = getLibraryUiApi();
        if (api && typeof api.hideLibraryPanel === 'function') {
            api.hideLibraryPanel();
        }
    }

    function insertLibraryNavDropdown() {
        var api = getLibraryUiApi();
        if (api && typeof api.insertLibraryNavDropdown === 'function') {
            api.insertLibraryNavDropdown();
        }
    }

    function showLibraryPanel(anchorBtn) {
        var api = getLibraryUiApi();
        if (api && typeof api.showLibraryPanel === 'function') {
            api.showLibraryPanel(anchorBtn);
        }
    }

    function formatLibraryOccupancyCount(value) {
        if (typeof value !== 'number' || !isFinite(value)) return '--';
        try { return value.toLocaleString('en-GB'); } catch (e0) { return String(value); }
    }

    function setLibraryHeatmapOpenState(section, expanded) {
        if (!section || !section.heatmap || !section.heatmapToggle) return;
        if (expanded) section.heatmap.classList.add('is-open');
        else section.heatmap.classList.remove('is-open');
        section.heatmapToggle.textContent = expanded ? 'Hide weekly pattern' : 'Show weekly pattern';
        setLibraryHeatmapExpanded(expanded);
    }

    function renderLibraryHeatmap(section, model) {
        if (!section || !section.heatmapGrid) return;
        while (section.heatmapGrid.firstChild) section.heatmapGrid.removeChild(section.heatmapGrid.firstChild);

        if (!model || !model.heatmapAvailable) {
            if (section.heatmapToggle) section.heatmapToggle.style.display = 'none';
            if (section.heatmap) section.heatmap.classList.remove('is-open');
            return;
        }

        var days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        var dayShort = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri' };
        var hourStart = 8;
        var hourEnd = 21;

        if (section.heatmapToggle) section.heatmapToggle.style.display = '';
        setLibraryHeatmapOpenState(section, isLibraryHeatmapExpanded());

        var allValues = [];
        days.forEach(function (day) {
            var rows = model.weekdayMap[day] || [];
            rows.forEach(function (r) {
                if (r.hour >= hourStart && r.hour <= hourEnd && isFinite(r.avg)) allValues.push(r.avg);
            });
        });
        var minV = allValues.length ? Math.min.apply(null, allValues) : 0;
        var maxV = allValues.length ? Math.max.apply(null, allValues) : 1;
        if (!isFinite(minV)) minV = 0;
        if (!isFinite(maxV) || maxV <= minV) maxV = minV + 1;

        var head = document.createElement('div');
        head.className = 'dtu-library-crowd-heatmap-head';
        var blank = document.createElement('div');
        blank.className = 'dtu-library-crowd-heatmap-hour';
        head.appendChild(blank);
        days.forEach(function (day) {
            var cellHead = document.createElement('div');
            cellHead.className = 'dtu-library-crowd-heatmap-day';
            cellHead.textContent = dayShort[day];
            head.appendChild(cellHead);
        });
        section.heatmapGrid.appendChild(head);

        for (var hour = hourStart; hour <= hourEnd; hour++) {
            var row = document.createElement('div');
            row.className = 'dtu-library-crowd-heatmap-row';

            var hourCell = document.createElement('div');
            hourCell.className = 'dtu-library-crowd-heatmap-hour';
            hourCell.textContent = ((hour - hourStart) % 2 === 0) ? ((hour < 10 ? '0' : '') + hour + ':00') : '';
            row.appendChild(hourCell);

            days.forEach(function (day) {
                var rowData = (model.weekdayMap[day] || []).find(function (r) { return r.hour === hour; }) || null;
                var avg = rowData && isFinite(rowData.avg) ? rowData.avg : null;
                var frac = avg == null ? 0 : Math.max(0, Math.min(1, (avg - minV) / (maxV - minV)));
                var alpha = avg == null ? 0.04 : (0.10 + 0.78 * frac);
                var cell = document.createElement('button');
                cell.type = 'button';
                cell.className = 'dtu-library-crowd-heatmap-cell';
                cell.style.setProperty('background', 'rgba(var(--dtu-ad-accent-rgb),' + alpha.toFixed(3) + ')', 'important');
                cell.setAttribute('aria-label', (dayShort[day] + ' ' + (hour < 10 ? '0' : '') + hour + ':00')
                    + (avg == null ? ' - no data' : (' - avg ' + Math.round(avg) + ' visitors')));
                if (avg == null) {
                    cell.title = dayShort[day] + ' ' + (hour < 10 ? '0' : '') + hour + ':00 - no data';
                } else {
                    var pct = (model.snapshot && model.snapshot.capacity) ? Math.round((avg / Math.max(1, model.snapshot.capacity)) * 100) : null;
                    cell.title = dayShort[day] + ' ' + (hour < 10 ? '0' : '') + hour + ':00 - avg ' + Math.round(avg)
                        + ' visitors' + (pct != null ? (' (' + pct + '% full)') : '');
                }
                row.appendChild(cell);
            });

            section.heatmapGrid.appendChild(row);
        }
    }

    function createLibraryTrendSection() {
        var container = document.createElement('div');
        container.className = 'dtu-library-section dtu-library-trend-section';
        container.setAttribute('data-dtu-library-feed-type', 'occupancy-trend');
        markExt(container);

        var header = document.createElement('div');
        header.className = 'dtu-library-section-header';
        markExt(header);

        var h3 = document.createElement('div');
        h3.className = 'dtu-library-section-title';
        h3.textContent = '';
        h3.style.display = 'none';
        markExt(h3);

        var actions = document.createElement('div');
        actions.className = 'dtu-library-actions';
        markExt(actions);

        var retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.className = 'dtu-library-action-btn';
        retryBtn.textContent = 'Retry';
        retryBtn.style.display = 'none';
        markExt(retryBtn);
        actions.appendChild(retryBtn);

        header.appendChild(h3);
        header.appendChild(actions);
        container.appendChild(header);

        var body = document.createElement('div');
        body.className = 'dtu-library-crowd';
        markExt(body);

        var hero = document.createElement('div');
        hero.className = 'dtu-library-crowd-card dtu-library-crowd-hero';
        markExt(hero);

        var freeValue = document.createElement('div');
        freeValue.className = 'dtu-library-crowd-free';
        freeValue.textContent = '--%';
        var freeUnit = document.createElement('div');
        freeUnit.className = 'dtu-library-crowd-free-unit';
        freeUnit.textContent = 'filled';
        markExt(freeUnit);
        var freeWrap = document.createElement('div');
        freeWrap.className = 'dtu-library-crowd-free-wrap';
        markExt(freeWrap);
        freeWrap.appendChild(freeValue);
        freeWrap.appendChild(freeUnit);
        var status = document.createElement('div');
        status.className = 'dtu-library-crowd-status';
        status.textContent = 'Waiting for data...';
        var heroTop = document.createElement('div');
        heroTop.className = 'dtu-library-crowd-hero-top';
        markExt(heroTop);
        var heroMain = document.createElement('div');
        heroMain.className = 'dtu-library-crowd-hero-main';
        markExt(heroMain);
        heroMain.appendChild(freeWrap);
        heroMain.appendChild(status);

        var heroStats = document.createElement('div');
        heroStats.className = 'dtu-library-crowd-hero-stats';
        markExt(heroStats);
        function createHeroStat(label, hint) {
            var stat = document.createElement('div');
            stat.className = 'dtu-library-crowd-hero-stat';
            markExt(stat);
            var statLabel = document.createElement('div');
            statLabel.className = 'dtu-library-crowd-hero-stat-label';
            statLabel.textContent = label;
            markExt(statLabel);
            var statValue = document.createElement('div');
            statValue.className = 'dtu-library-crowd-hero-stat-value';
            statValue.textContent = '--';
            markExt(statValue);
            var statHint = document.createElement('div');
            statHint.className = 'dtu-library-crowd-hero-stat-hint';
            statHint.textContent = hint || '';
            markExt(statHint);
            stat.appendChild(statLabel);
            stat.appendChild(statValue);
            stat.appendChild(statHint);
            heroStats.appendChild(stat);
            return statValue;
        }
        var nowStatValue = createHeroStat('Now', 'in library');
        var todayStatValue = createHeroStat('Today', 'visits today');
        var freeStatValue = createHeroStat('Free', 'seats available');

        var progress = document.createElement('div');
        progress.className = 'dtu-library-crowd-progress';
        progress.setAttribute('role', 'progressbar');
        progress.setAttribute('aria-valuemin', '0');
        progress.setAttribute('aria-valuemax', '100');
        progress.setAttribute('aria-valuenow', '0');
        progress.setAttribute('aria-valuetext', 'Unknown');
        var progressFill = document.createElement('div');
        progressFill.className = 'dtu-library-crowd-progress-fill';
        progress.appendChild(progressFill);

        heroTop.appendChild(heroMain);
        heroTop.appendChild(heroStats);
        hero.appendChild(heroTop);
        hero.appendChild(progress);

        var chartWrap = document.createElement('div');
        chartWrap.className = 'dtu-library-crowd-chart-wrap';
        chartWrap.style.setProperty('position', 'relative', 'important');
        markExt(chartWrap);
        var chartCanvas = document.createElement('canvas');
        chartCanvas.className = 'dtu-library-crowd-chart';
        chartCanvas.setAttribute('role', 'img');
        chartCanvas.setAttribute('aria-label', 'Library occupancy chart');
        markExt(chartCanvas);
        var chartNote = document.createElement('div');
        chartNote.className = 'dtu-library-crowd-chart-note';
        chartNote.textContent = 'Building historical averages...';
        markExt(chartNote);
        var eventLegend = document.createElement('div');
        eventLegend.className = 'dtu-library-crowd-events';
        eventLegend.style.display = 'none';
        markExt(eventLegend);
        var chartTooltip = document.createElement('div');
        chartTooltip.className = 'dtu-library-crowd-chart-tooltip';
        chartTooltip.style.cssText = 'display:none;position:absolute;pointer-events:none;z-index:10;background:rgba(20,20,20,0.88);color:#f0f0f0;font-size:11px;line-height:1.4;padding:5px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.35);';
        markExt(chartTooltip);
        chartWrap.appendChild(chartCanvas);
        chartWrap.appendChild(chartTooltip);

        var chartLegend = document.createElement('div');
        chartLegend.className = 'dtu-library-crowd-chart-legend';
        chartLegend.style.cssText = 'display:flex !important;gap:12px !important;justify-content:flex-end !important;margin:4px 2px 2px !important;flex-wrap:wrap !important;';
        markExt(chartLegend);
        chartWrap.appendChild(chartLegend);

        chartWrap.appendChild(chartNote);
        chartWrap.appendChild(eventLegend);

        var confidence = document.createElement('div');
        confidence.className = 'dtu-library-crowd-confidence';
        confidence.textContent = '';
        markExt(confidence);

        var heatmapToggle = document.createElement('button');
        heatmapToggle.type = 'button';
        heatmapToggle.className = 'dtu-library-crowd-heatmap-toggle';
        heatmapToggle.textContent = 'Show weekly pattern';
        heatmapToggle.style.display = 'none';
        markExt(heatmapToggle);

        var heatmap = document.createElement('div');
        heatmap.className = 'dtu-library-crowd-heatmap';
        markExt(heatmap);
        var heatmapGrid = document.createElement('div');
        markExt(heatmapGrid);
        heatmap.appendChild(heatmapGrid);

        var state = document.createElement('div');
        state.className = 'dtu-library-crowd-state';
        state.style.display = 'none';
        state.textContent = 'Library data unavailable.';
        markExt(state);

        body.appendChild(hero);
        body.appendChild(chartWrap);
        body.appendChild(confidence);
        body.appendChild(heatmapToggle);
        body.appendChild(heatmap);
        body.appendChild(state);
        container.appendChild(body);

        var sectionRef = {
            container: container,
            titleEl: h3,
            retryBtn: retryBtn,
            freeValue: freeValue,
            status: status,
            nowStatValue: nowStatValue,
            todayStatValue: todayStatValue,
            freeStatValue: freeStatValue,
            progress: progress,
            progressFill: progressFill,
            chartCanvas: chartCanvas,
            chartTooltip: chartTooltip,
            chartLegend: chartLegend,
            chartNote: chartNote,
            eventLegend: eventLegend,
            confidence: confidence,
            heatmapToggle: heatmapToggle,
            heatmap: heatmap,
            heatmapGrid: heatmapGrid,
            state: state,
            onRetry: null
        };

        retryBtn.addEventListener('click', function () {
            if (typeof sectionRef.onRetry === 'function') sectionRef.onRetry();
        });
        heatmapToggle.addEventListener('click', function () {
            var next = !sectionRef.heatmap.classList.contains('is-open');
            setLibraryHeatmapOpenState(sectionRef, next);
        });

        return sectionRef;
    }

    function renderLibraryTrendSection(section, crowdingResp, fallbackOccupancyResp, eventsResp) {
        if (!section) return;
        var model = buildLibraryCrowdingModel(crowdingResp, fallbackOccupancyResp);
        var eventIntervals = buildLibraryEventIntervals(eventsResp, model);
        var snap = model.snapshot || {};
        var tier = getLibraryCrowdingTier(model.occupancyRatio);
        var insightLine = buildLibraryCrowdingInsightLine(model);
        var showLiveOccupancy = !!model.isWithinDisplayHours;
        var statusLabel = showLiveOccupancy ? tier.label : 'After hours';
        var statusColor = showLiveOccupancy ? tier.color : (isDarkModeEnabled() ? '#b6bcc8' : '#667084');
        var shownVisitors = showLiveOccupancy ? snap.visitors : null;
        var shownToday = showLiveOccupancy ? snap.today : null;
        var shownFreeSeats = showLiveOccupancy ? snap.freeSeats : null;

        if (section.titleEl) section.titleEl.textContent = '';
        // isFinite(null) === true in JS — must check for null explicitly
        var pct = (showLiveOccupancy && model.occupancyRatio != null && isFinite(model.occupancyRatio) ? Math.round(model.occupancyRatio * 100) : null);
        if (section.freeValue) section.freeValue.textContent = (pct == null ? '--%' : (pct + '%'));
        if (section.status) {
            section.status.textContent = statusLabel;
            section.status.style.setProperty('color', statusColor, 'important');
        }
        if (section.nowStatValue) section.nowStatValue.textContent = formatLibraryOccupancyCount(shownVisitors);
        if (section.todayStatValue) section.todayStatValue.textContent = formatLibraryOccupancyCount(shownToday);
        if (section.freeStatValue) section.freeStatValue.textContent = formatLibraryOccupancyCount(shownFreeSeats);

        if (section.progress) {
            section.progress.setAttribute('aria-valuenow', String(pct == null ? 0 : pct));
            section.progress.setAttribute('aria-valuetext', statusLabel);
            if (showLiveOccupancy && tier.key === 'medium') section.progress.setAttribute('aria-valuetext', 'Moderate');
            if (showLiveOccupancy && tier.key === 'high') section.progress.setAttribute('aria-valuetext', 'Busy');
            if (section.progressFill) {
                section.progressFill.style.setProperty('width', String(Math.max(0, Math.min(100, pct || 0))) + '%', 'important');
                section.progressFill.style.setProperty('background', statusColor, 'important');
            }
        }
        var chartFlags = drawLibraryCrowdingChart(section.chartCanvas, model, eventIntervals) || {};
        if (section.chartNote) {
            section.chartNote.textContent = insightLine;
        }

        // Update the HTML legend below the canvas
        if (section.chartLegend) {
            var accentRgbForLeg = (getComputedStyle(document.documentElement).getPropertyValue('--dtu-ad-accent-rgb') || '31,122,224').trim();
            var accentForLeg = (getComputedStyle(document.documentElement).getPropertyValue('--dtu-ad-accent') || '#1f7ae0').trim();
            var legMuted = isDarkModeEnabled() ? '#888' : '#667084';
            while (section.chartLegend.firstChild) section.chartLegend.removeChild(section.chartLegend.firstChild);
            function makeLegItem(label, svgHtml) {
                var item = document.createElement('span');
                item.style.cssText = 'display:inline-flex !important;align-items:center !important;gap:5px !important;font-size:9px !important;color:' + legMuted + ' !important;white-space:nowrap !important;';
                markExt(item);
                var icon = document.createElement('span');
                icon.innerHTML = svgHtml;
                markExt(icon);
                var lbl = document.createElement('span');
                lbl.textContent = label;
                markExt(lbl);
                item.appendChild(icon);
                item.appendChild(lbl);
                return item;
            }
            // Solid line swatch — Current
            section.chartLegend.appendChild(makeLegItem('Current',
                '<svg width="18" height="8" viewBox="0 0 18 8" style="display:block"><line x1="0" y1="4" x2="18" y2="4" stroke="' + accentForLeg + '" stroke-width="2.2" stroke-linecap="round"/></svg>'
            ));
            // Dashed line swatch — Typical (only if typical data exists)
            if (chartFlags.hasTypical) {
                section.chartLegend.appendChild(makeLegItem('Typical',
                    '<svg width="18" height="8" viewBox="0 0 18 8" style="display:block"><line x1="0" y1="4" x2="18" y2="4" stroke="rgba(' + accentRgbForLeg + ',0.60)" stroke-width="1.4" stroke-dasharray="4 3" stroke-linecap="round"/></svg>'
                ));
            }
            // Shaded band swatch — only when enough historical data
            if (chartFlags.showHistoricalBand && chartFlags.hasTypical) {
                section.chartLegend.appendChild(makeLegItem('Hist. range',
                    '<svg width="18" height="8" viewBox="0 0 18 8" style="display:block"><rect x="0" y="1" width="18" height="6" fill="rgba(' + accentRgbForLeg + ',0.07)" stroke="rgba(' + accentRgbForLeg + ',0.28)" stroke-width="0.8" rx="1"/></svg>'
                ));
            }
        }

        if (section.chartCanvas) {
            if (showLiveOccupancy) {
                section.chartCanvas.setAttribute(
                    'aria-label',
                    'Library occupancy chart. Currently '
                    + formatLibraryOccupancyCount(snap.visitors)
                    + ' visitors, '
                    + formatLibraryOccupancyCount(snap.freeSeats)
                    + ' free seats.'
                );
            } else {
                section.chartCanvas.setAttribute(
                    'aria-label',
                    'Library occupancy chart. After hours; live occupancy is hidden outside the '
                    + formatLibraryMinuteRange(model.startHour * 60, model.endHour * 60)
                    + ' graph window.'
                );
            }

            // Store live model reference for the tooltip handler
            section.chartCanvas._dtuModel = model;

            // Set up hover tooltip (once per canvas element)
            if (!section.chartCanvas._dtuTooltipBound && section.chartTooltip) {
                section.chartCanvas._dtuTooltipBound = true;
                var _tip = section.chartTooltip;
                var _cnv = section.chartCanvas;

                _cnv.addEventListener('mousemove', function (e) {
                    var m = _cnv._dtuModel;
                    if (!m) { _tip.style.display = 'none'; return; }
                    var dpr = Math.max(1, window.devicePixelRatio || 1);
                    var cssW = Math.max(320, Math.round(_cnv.clientWidth || 640));
                    var pad = { left: 38, right: 16, top: 14, bottom: 24 };
                    var innerW = Math.max(10, cssW - pad.left - pad.right);
                    var rect = _cnv.getBoundingClientRect();
                    var mouseX = e.clientX - rect.left;
                    // Convert canvas x to minute
                    var startMinute = m.startHour * 60;
                    var endMinute = m.endHour * 60;
                    var t = (mouseX - pad.left) / Math.max(1, innerW);
                    var hoverMinute = Math.round(startMinute + t * (endMinute - startMinute));
                    hoverMinute = Math.max(startMinute, Math.min(endMinute, hoverMinute));
                    var hoverHour = Math.floor(hoverMinute / 60);
                    var hoverMin = hoverMinute % 60;
                    var timeLabel = (hoverHour < 10 ? '0' : '') + hoverHour + ':' + (hoverMin < 10 ? '0' : '') + hoverMin;

                    // Find closest today sample
                    var todaySamples = (m.todaySamples || []).filter(function (p) { return isFinite(p.minute) && isFinite(p.visitors); });
                    var closestToday = null, bestDist = Infinity;
                    todaySamples.forEach(function (p) {
                        var d = Math.abs(p.minute - hoverMinute);
                        if (d < bestDist) { bestDist = d; closestToday = p; }
                    });

                    // Find typical row for this hour
                    var typicalRows = (m.typicalRows || []);
                    var typicalRow = typicalRows.find(function (r) { return r.hour === hoverHour; }) || null;

                    var parts = [timeLabel];
                    if (closestToday && bestDist <= 30) parts.push('Current: ' + Math.round(closestToday.visitors));
                    if (typicalRow && isFinite(typicalRow.avg)) parts.push('Typical: ' + Math.round(typicalRow.avg));

                    if (parts.length <= 1) { _tip.style.display = 'none'; return; }
                    _tip.textContent = parts.join('  |  ');

                    // Position tooltip: above cursor, clamped inside chartWrap
                    var wrapRect = _cnv.parentNode.getBoundingClientRect();
                    var tipLeft = e.clientX - wrapRect.left + 10;
                    var tipTop = e.clientY - wrapRect.top - 32;
                    _tip.style.display = 'block';
                    _tip.style.left = tipLeft + 'px';
                    _tip.style.top = Math.max(2, tipTop) + 'px';
                });

                _cnv.addEventListener('mouseleave', function () {
                    _tip.style.display = 'none';
                });
            }
        }

        if (section.eventLegend) {
            while (section.eventLegend.firstChild) section.eventLegend.removeChild(section.eventLegend.firstChild);
            if (eventIntervals.length) {
                section.eventLegend.style.display = '';
                var maxLegendItems = 4;
                eventIntervals.slice(0, maxLegendItems).forEach(function (itv) {
                    var row = document.createElement('div');
                    row.className = 'dtu-library-crowd-event';
                    markExt(row);
                    var dot = document.createElement('span');
                    dot.className = 'dtu-library-crowd-event-dot';
                    markExt(dot);
                    var txt = document.createElement('span');
                    txt.className = 'dtu-library-crowd-event-text';
                    txt.textContent = formatLibraryMinuteRange(itv.startMinute, itv.endMinute) + ' \u00b7 ' + (itv.title || 'DTU Library event');
                    markExt(txt);
                    row.appendChild(dot);
                    row.appendChild(txt);
                    section.eventLegend.appendChild(row);
                });
                if (eventIntervals.length > maxLegendItems) {
                    var more = document.createElement('div');
                    more.className = 'dtu-library-crowd-event';
                    more.textContent = '+' + (eventIntervals.length - maxLegendItems) + ' more DTU Library event overlay' + (eventIntervals.length - maxLegendItems === 1 ? '' : 's');
                    markExt(more);
                    section.eventLegend.appendChild(more);
                }
            } else {
                section.eventLegend.style.display = 'none';
            }
        }

        if (section.confidence) section.confidence.textContent = buildLibraryCrowdingConfidenceLine(model);

        renderLibraryHeatmap(section, model);

        var unavailable = !snap.hasCurrent;
        if (section.state) {
            if (unavailable) {
                section.state.style.display = '';
                section.state.textContent = crowdingResp && crowdingResp.error === 'not_configured'
                    ? 'Shared library occupancy is not configured in this build.'
                    : 'Library data unavailable. Try refreshing.';
            } else {
                section.state.style.display = 'none';
            }
        }
        if (section.retryBtn) section.retryBtn.style.display = unavailable ? '' : 'none';
    }

    function getAfterDarkAdminToolsList() {
        const placeholder = getAdminToolsPlaceholder();
        if (!placeholder) return null;
        const columns = placeholder.querySelectorAll('.d2l-admin-tools-column');
        let targetList = null;
        columns.forEach(col => {
            const h2 = col.querySelector('h2');
            if (h2 && normalizeWhitespace(h2.textContent) === 'DTU After Dark') {
                targetList = col.querySelector('ul.d2l-list');
            }
        });
        return targetList;
    }

    function syncAfterDarkFeatureToggleStates() {
        if (!isTopWindow()) return;
        const mapping = [
            { id: 'feature-book-finder-toggle', key: FEATURE_BOOK_FINDER_KEY },
            { id: 'feature-content-shortcut-toggle', key: FEATURE_CONTENT_SHORTCUT_KEY },
            { id: 'feature-learn-nav-resource-links-toggle', key: FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY },
            { id: 'feature-kurser-grade-stats-toggle', key: FEATURE_KURSER_GRADE_STATS_KEY },
            { id: 'feature-kurser-course-eval-toggle', key: FEATURE_KURSER_COURSE_EVAL_KEY },
            { id: 'feature-kurser-room-finder-toggle', key: FEATURE_KURSER_ROOM_FINDER_KEY },

            { id: 'feature-smart-room-linker-toggle', key: FEATURE_SMART_ROOM_LINKER_KEY },
            { id: 'feature-kurser-textbook-linker-toggle', key: FEATURE_KURSER_TEXTBOOK_LINKER_KEY },
            { id: 'feature-kurser-schedule-annotation-toggle', key: FEATURE_KURSER_SCHEDULE_ANNOTATION_KEY },
            { id: 'feature-kurser-myline-badges-toggle', key: FEATURE_KURSER_MYLINE_BADGES_KEY },
            { id: 'feature-campusnet-gpa-tools-toggle', key: FEATURE_CAMPUSNET_GPA_TOOLS_KEY },
            { id: 'feature-participant-intel-toggle', key: FEATURE_PARTICIPANT_INTEL_KEY },
            { id: 'feature-participant-intel-demographics-toggle', key: FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY },
            { id: 'feature-participant-intel-shared-history-toggle', key: FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY },
            { id: 'feature-participant-intel-semester-twins-toggle', key: FEATURE_PARTICIPANT_INTEL_SEMESTER_TWINS_KEY },
            { id: 'feature-participant-intel-retention-toggle', key: FEATURE_PARTICIPANT_INTEL_RETENTION_KEY },
            { id: 'feature-studyplan-exam-cluster-toggle', key: FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY },
            { id: 'library-dropdown-toggle', key: getLibraryDropdownFeatureKey() },
            { id: 'feature-lessons-bulk-download-toggle', key: FEATURE_LEARN_LESSONS_BULK_DOWNLOAD_KEY },
            { id: 'feature-lessons-bulk-single-zip-toggle', key: FEATURE_LEARN_LESSONS_BULK_SINGLE_ZIP_KEY }
        ];
        mapping.forEach(function (m) {
            const el = document.querySelector('#' + m.id);
            if (el) el.checked = isFeatureFlagEnabled(m.key);
        });
    }

    // ===== STANDALONE SETTINGS MODAL =====
    // Lives in darkmode.settings.js. darkmode.js keeps the runtime bridge only.

    function getSettingsUiApi() {
        try { return globalThis.DTUAfterDarkSettingsUi || null; } catch (e0) { return null; }
    }

    try {
        if (!globalThis.DTUAfterDarkSettingsDeps) {
            globalThis.DTUAfterDarkSettingsDeps = {
                isTopWindow: function () { return isTopWindow(); },
                isDarkModeEnabled: function () { return !!isDarkModeEnabled(); },
                getCurrentUrlWithoutHash: getCurrentUrlWithoutHash,
                buildSuggestedPausePatternsForCurrentUrl: buildSuggestedPausePatternsForCurrentUrl,
                normalizeUrlPausePattern: normalizeUrlPausePattern,
                isPauseProtectedPattern: isPauseProtectedPattern,
                getUrlPausePatterns: getUrlPausePatterns,
                saveUrlPausePatterns: saveUrlPausePatterns,
                getMatchingUrlPausePatterns: getMatchingUrlPausePatterns,
                markExt: markExt,
                applyAfterDarkAdminMenuThemeVars: applyAfterDarkAdminMenuThemeVars,
                getFeatureKeys: function () {
                    return {
                        bookFinder: FEATURE_BOOK_FINDER_KEY,
                        campusnetGpaTools: FEATURE_CAMPUSNET_GPA_TOOLS_KEY,
                        kurserGradeStats: FEATURE_KURSER_GRADE_STATS_KEY,
                        kurserTextbookLinker: FEATURE_KURSER_TEXTBOOK_LINKER_KEY,
                        studyplanExamCluster: FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY,
                        kurserCourseEval: FEATURE_KURSER_COURSE_EVAL_KEY,
                        kurserRoomFinder: FEATURE_KURSER_ROOM_FINDER_KEY,
                        smartRoomLinker: FEATURE_SMART_ROOM_LINKER_KEY,
                        kurserScheduleAnnotation: FEATURE_KURSER_SCHEDULE_ANNOTATION_KEY,
                        contentShortcut: FEATURE_CONTENT_SHORTCUT_KEY,
                        learnNavResourceLinks: FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY,
                        participantIntel: FEATURE_PARTICIPANT_INTEL_KEY,
                        participantIntelSemesterTwins: FEATURE_PARTICIPANT_INTEL_SEMESTER_TWINS_KEY,
                        kurserMyLineBadges: FEATURE_KURSER_MYLINE_BADGES_KEY,
                        libraryDropdown: getLibraryDropdownFeatureKey(),
                        learnLessonsBulkDownload: FEATURE_LEARN_LESSONS_BULK_DOWNLOAD_KEY,
                        learnLessonsBulkSingleZip: FEATURE_LEARN_LESSONS_BULK_SINGLE_ZIP_KEY,
                        participantIntelDemographics: FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY,
                        participantIntelSharedHistory: FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY,
                        participantIntelRetention: FEATURE_PARTICIPANT_INTEL_RETENTION_KEY
                    };
                },
                getSettingKeys: function () {
                    return {
                        busEnabled: BUS_ENABLED_KEY,
                        deadlinesEnabled: DEADLINES_ENABLED_KEY,
                        searchWidgetEnabled: SEARCH_WIDGET_ENABLED_KEY
                    };
                },
                saveDarkModePreference: saveDarkModePreference,
                isMojanglesEnabled: isMojanglesEnabled,
                insertMojanglesText: insertMojanglesText,
                isBusEnabled: isBusEnabled,
                isApiQuotaExhausted: isApiQuotaExhausted,
                showQuotaExhaustedMessage: showQuotaExhaustedMessage,
                getBusConfig: getBusConfig,
                showBusConfigModal: showBusConfigModal,
                stopBusPolling: stopBusPolling,
                abortInFlightBusRequests: abortInFlightBusRequests,
                insertBusDisplay: insertBusDisplay,
                updateBusDepartures: updateBusDepartures,
                forceBusImmediateRefresh: function () { _lastBusFetch = 0; updateBusDepartures(); },
                isDeadlinesEnabled: isDeadlinesEnabled,
                insertDeadlinesHomepageWidget: insertDeadlinesHomepageWidget,
                isSearchWidgetEnabled: isSearchWidgetEnabled,
                isFeatureFlagEnabled: isFeatureFlagEnabled,
                setFeatureFlagEnabled: setFeatureFlagEnabled,
                insertBookFinderLinks: insertBookFinderLinks,
                insertGPARow: insertGPARow,
                insertECTSProgressBar: insertECTSProgressBar,
                insertGPASimulator: insertGPASimulator,
                syncCampusnetActualGradeExclusionControls: syncCampusnetActualGradeExclusionControls,
                insertKurserGradeStats: insertKurserGradeStats,
                insertKurserTextbookLinks: insertKurserTextbookLinks,
                scheduleStudyplanExamCluster: scheduleStudyplanExamCluster,
                insertKurserCourseEvaluation: insertKurserCourseEvaluation,
                insertKurserRoomFinder: insertKurserRoomFinder,
                scheduleSmartRoomLinkerScan: scheduleSmartRoomLinkerScan,
                removeSmartRoomLinks: removeSmartRoomLinks,
                annotateKurserSchedulePlacement: annotateKurserSchedulePlacement,
                insertContentButtons: insertContentButtons,
                startContentButtonBootstrap: startContentButtonBootstrap,
                removeContentButtons: removeContentButtons,
                insertDTULearnNavResourceLinks: insertDTULearnNavResourceLinks,
                removeDTULearnNavResourceLinks: removeDTULearnNavResourceLinks,
                insertParticipantIntelligence: insertParticipantIntelligence,
                insertCampusnetSemesterTwinWidget: insertCampusnetSemesterTwinWidget,
                removeDTULearnSemesterTwinWidget: removeDTULearnSemesterTwinWidget,
                insertKurserMyLineBadge: insertKurserMyLineBadge,
                insertLibraryNavDropdown: insertLibraryNavDropdown,
                removeLibraryNavDropdown: removeLibraryNavDropdown,
                runLessonsBulkDownloadChecks: runLessonsBulkDownloadChecks,
                showContentShortcutOverridesModal: showContentShortcutOverridesModal,
                getAccentThemeId: function () { return _accentThemeId; },
                getAccentCustomHex: function () { return _accentCustomHex; },
                setAccentThemeId: setAccentThemeId,
                setAccentCustomHex: setAccentCustomHex,
                accentThemeOrder: ACCENT_THEME_ORDER,
                accentThemes: ACCENT_THEMES,
                accentCustomDefault: ACCENT_CUSTOM_DEFAULT
            };
        }
    } catch (eSettingsDeps) { }

    function applyFeatureToggleImmediately(featureKey, enabled) {
        var api = getSettingsUiApi();
        if (api && typeof api.applyFeatureToggleImmediately === 'function') {
            api.applyFeatureToggleImmediately(featureKey, enabled);
        }
    }

    function hideSettingsModal() {
        var api = getSettingsUiApi();
        if (api && typeof api.hideSettingsModal === 'function') {
            api.hideSettingsModal();
            return;
        }
        var overlay = document.querySelector('.dtu-settings-modal-overlay');
        if (overlay) overlay.remove();
        try {
            var settingsBtn = document.querySelector('.dtu-settings-nav-item button');
            if (settingsBtn) settingsBtn.setAttribute('aria-expanded', 'false');
        } catch (e0) { }
    }

    function showPausedUrlRulesModal(opts) {
        var api = getSettingsUiApi();
        if (api && typeof api.showPausedUrlRulesModal === 'function') {
            api.showPausedUrlRulesModal(opts);
        }
    }

    function showSettingsModal() {
        var api = getSettingsUiApi();
        if (api && typeof api.showSettingsModal === 'function') {
            api.showSettingsModal();
        }
    }

    // Settings nav item in the bottom nav bar (same pattern as Library dropdown)
    function insertSettingsNavItem() {
        var api = getLearnNavUiApi();
        if (api && typeof api.insertSettingsNavItem === 'function') {
            api.insertSettingsNavItem();
        }
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
            el.style.setProperty('background', '#1a1a1a', 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('color', '#e0e0e0', 'important');
            el.style.setProperty('border-color', '#404040', 'important');
        }

        // Grade rows with blue/white graph bars should keep a dark-1 row background.
        root.querySelectorAll('tr').forEach(function (row) {
            if (!row.querySelector('img[src*="Framework.GraphBar"]')) return;

            row.querySelectorAll('td.d_tl.d_tm.d_tn, td.d_tr.d_tm.d_tn').forEach(function (td) { forceDark1(td); });
            row.querySelectorAll('.d2l-grades-score, .dco, .dco_c').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background-color', '#1a1a1a', 'important');
                el.style.setProperty('background', '#1a1a1a', 'important');
                el.style.setProperty('color', '#e0e0e0', 'important');
                el.style.setProperty('background-image', 'none', 'important');
            });
            row.querySelectorAll('label').forEach(function (label) {
                if (!label || !label.style) return;
                label.style.setProperty('color', '#e0e0e0', 'important');
                label.style.setProperty('background-color', '#1a1a1a', 'important');
                label.style.setProperty('background-image', 'none', 'important');
            });
        });
    }

    // ===== API RATE LIMITING =====
    // Per-user daily limit for transit API usage (resets each day)
    var DAILY_API_LIMIT = 500; // max API calls per user per day
    var API_CALLS_KEY = 'dtuDarkModeBusApiCalls';
    var API_QUOTA_KEY = 'dtuDarkModeBusQuotaExhausted';
    var BUS_FETCH_TIMEOUT_MS = 8000;
    var _apiQuotaExhausted = false;

    function getLocalDateString() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function getDailyApiCount() {
        try {
            var data = JSON.parse(localStorage.getItem(API_CALLS_KEY) || '{}');
            var today = getLocalDateString();
            if (data.date !== today) return { date: today, count: 0 };
            return data;
        } catch (e) {
            return { date: getLocalDateString(), count: 0 };
        }
    }

    function incrementApiCount() {
        var data = getDailyApiCount();
        data.count++;
        localStorage.setItem(API_CALLS_KEY, JSON.stringify(data));
        return data.count;
    }

    function isDailyLimitReached() {
        return getDailyApiCount().count >= DAILY_API_LIMIT;
    }

    function consumeBusApiRequestBudget() {
        if (isDailyLimitReached()) {
            showQuotaExhaustedMessage('daily');
            return false;
        }
        incrementApiCount();
        return true;
    }

    // Server-side quota exhaustion (HTTP 429/403) â€” persists until next month
    function isApiQuotaExhausted() {
        if (_apiQuotaExhausted) return true;
        var stored = localStorage.getItem(API_QUOTA_KEY);
        if (!stored) return false;
        var exhaustedDate = new Date(stored);
        var now = new Date();
        if (now.getMonth() !== exhaustedDate.getMonth() || now.getFullYear() !== exhaustedDate.getFullYear()) {
            localStorage.removeItem(API_QUOTA_KEY);
            _apiQuotaExhausted = false;
            return false;
        }
        _apiQuotaExhausted = true;
        return true;
    }

    function setApiQuotaExhausted() {
        _apiQuotaExhausted = true;
        localStorage.setItem(API_QUOTA_KEY, new Date().toISOString());
        localStorage.setItem(BUS_ENABLED_KEY, 'false');
        var toggle = document.querySelector('#bus-departures-toggle');
        if (toggle) {
            toggle.checked = false;
            // Keep any settings UI in sync (e.g. Bus "Edit" button visibility).
            try { toggle.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { }
        }
    }

    // Get departures for a specific stop
    async function getDepartures(stopId, options) {
        if (isApiQuotaExhausted()) return { departures: [], ok: false, reason: 'quota' };
        var consumeBudget = !options || options.consumeBudget !== false;
        if (consumeBudget && !consumeBusApiRequestBudget()) {
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

        var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var timeoutId = null;
        if (controller) registerBusFetchController(controller);
        if (controller) {
            timeoutId = setTimeout(function () {
                controller.abort();
            }, BUS_FETCH_TIMEOUT_MS);
        }

        try {
            const fetchOptions = controller ? { signal: controller.signal } : undefined;
            const resp = await fetch(url, fetchOptions);
            if (!resp.ok) {
                if (resp.status === 429 || resp.status === 403) {
                    setApiQuotaExhausted();
                    showQuotaExhaustedMessage('monthly');
                    return { departures: [], ok: false, reason: 'quota' };
                }
                return { departures: [], ok: false, reason: 'http' };
            }
            const rawData = await resp.json();
            const data = useProxy ? (rawData && rawData.ok ? rawData.data : null) : rawData;
            if (useProxy && (!rawData || !rawData.ok || !data)) {
                if (rawData && rawData.error === 'upstream_quota') {
                    setApiQuotaExhausted();
                    showQuotaExhaustedMessage('monthly');
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
            if (e && e.name === 'AbortError') {
                return { departures: [], ok: false, reason: 'aborted' };
            }
            return { departures: [], ok: false, reason: 'network' };
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
            if (controller) unregisterBusFetchController(controller);
        }
    }

    // Show a notification when API limits are hit
    function showQuotaExhaustedMessage(type) {
        if (document.querySelector('.dtu-quota-exhausted')) return;

        var isDaily = type === 'daily';
        var notice = document.createElement('div');
        markExt(notice);
        notice.className = 'dtu-quota-exhausted';
        notice.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 999999; '
            + 'background: linear-gradient(135deg, var(--dtu-ad-accent) 0%, var(--dtu-ad-accent-deep) 100%); '
            + 'color: #fff; padding: 16px 20px; border-radius: 12px; '
            + 'font-family: "Helvetica Neue",Helvetica,Arial,sans-serif; font-size: 13px; line-height: 1.5; '
            + 'max-width: 320px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); '
            + 'animation: dtuSlideIn 0.3s ease-out;';

        var title = document.createElement('div');
        markExt(title);
        title.style.cssText = 'font-weight: 700; font-size: 14px; margin-bottom: 6px;';
        title.textContent = 'Bus Departures Paused';

        var msg = document.createElement('div');
        markExt(msg);
        msg.style.opacity = '0.95';
        var countdownEl = null;
        var countdownInterval = null;

        if (isDaily) {
            msg.textContent = 'You\u2019ve used ' + getDailyApiCount().count + '/' + DAILY_API_LIMIT
                + ' bus lookups today.';

            // Countdown to local midnight
            countdownEl = document.createElement('div');
            markExt(countdownEl);
            countdownEl.style.cssText = 'margin-top: 8px; font-size: 13px; font-weight: 600; '
                + 'font-variant-numeric: tabular-nums; letter-spacing: 0.5px;';

            function updateCountdown() {
                var now = new Date();
                var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
                var diff = midnight.getTime() - now.getTime();
                if (diff <= 0) {
                    countdownEl.textContent = 'Bus times are available now! Reload the page.';
                    if (countdownInterval) clearInterval(countdownInterval);
                    return;
                }
                var h = Math.floor(diff / 3600000);
                var m = Math.floor((diff % 3600000) / 60000);
                var s = Math.floor((diff % 60000) / 1000);
                countdownEl.textContent = 'Bus times available in '
                    + String(h).padStart(2, '0') + ':'
                    + String(m).padStart(2, '0') + ':'
                    + String(s).padStart(2, '0');
            }
            updateCountdown();
            countdownInterval = setInterval(updateCountdown, 1000);
        } else {
            msg.textContent = 'The monthly API request limit for Rejseplanen has been reached. '
                + 'Bus departures have been turned off and will automatically resume next month.';
            localStorage.setItem(BUS_ENABLED_KEY, 'false');
            var toggle = document.querySelector('#bus-departures-toggle');
            if (toggle) {
                toggle.checked = false;
                try { toggle.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { }
            }
        }

        var dismiss = document.createElement('button');
        markExt(dismiss);
        dismiss.style.cssText = 'margin-top: 10px; background: rgba(255,255,255,0.15); color: #fff; '
            + 'border: 1px solid rgba(255,255,255,0.3); padding: 6px 16px; border-radius: 6px; '
            + 'cursor: pointer; font-size: 12px; font-weight: 600;';
        dismiss.textContent = 'Got it';
        dismiss.addEventListener('click', function () {
            if (countdownInterval) clearInterval(countdownInterval);
            notice.style.transition = 'opacity 0.3s';
            notice.style.opacity = '0';
            setTimeout(function () { notice.remove(); }, 300);
        });

        notice.appendChild(title);
        notice.appendChild(msg);
        if (countdownEl) notice.appendChild(countdownEl);
        notice.appendChild(dismiss);
        document.body.appendChild(notice);
    }

    // Calculate minutes until a departure
    function minutesUntilDeparture(dep) {
        const timeStr = dep.rtTime || dep.time;
        const dateStr = dep.rtDate || dep.date;
        if (!timeStr || !dateStr) return null;
        let depDate;
        if (dateStr.includes('.')) {
            const parts = dateStr.split('.');
            const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
            depDate = new Date(year + '-' + parts[1] + '-' + parts[0] + 'T' + timeStr);
        } else {
            depDate = new Date(dateStr + 'T' + timeStr);
        }
        if (isNaN(depDate.getTime())) return null;
        return Math.round((depDate.getTime() - Date.now()) / 60000);
    }

    // Check if a departure is delayed and by how many minutes
    function isDelayed(dep) {
        if (!dep.rtTime || !dep.time) return false;
        return dep.rtTime !== dep.time;
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

    function formatDelayTag(dep) {
        var delay = getDelayMinutes(dep);
        if (delay <= 0) return '';
        return ' (+' + delay + ')';
    }

    function mapBusDepartureForDisplay(dep) {
        return {
            line: dep.line,
            direction: dep.direction,
            time: formatDepartureTime(dep),
            delayTag: formatDelayTag(dep),
            minutes: minutesUntilDeparture(dep),
            stop: dep.stop || '',
            delayed: isDelayed(dep),
            type: dep.type
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

    async function fetchBusWidgetDepartures(config, opts) {
        if (isApiQuotaExhausted()) return { departures: [], ok: false, reason: 'quota' };
        if (!LIVE_TRANSIT_API_BASE) return { departures: [], ok: false, reason: 'not_configured' };
        if (!config || !Array.isArray(config.stopIds) || !config.stopIds.length) {
            return { departures: [], ok: true, reason: 'ok' };
        }
        if (!Array.isArray(config.lines) || !config.lines.length) {
            return { departures: [], ok: true, reason: 'ok' };
        }
        if (!(opts && opts.consumeBudget === false) && !consumeBusApiRequestBudget()) {
            return { departures: [], ok: false, reason: 'daily' };
        }

        var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var timeoutId = null;
        if (controller) registerBusFetchController(controller);
        if (controller) {
            timeoutId = setTimeout(function () {
                controller.abort();
            }, BUS_FETCH_TIMEOUT_MS);
        }

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
                signal: controller ? controller.signal : undefined
            });
            if (!resp.ok) {
                if (resp.status === 429 || resp.status === 403) {
                    setApiQuotaExhausted();
                    showQuotaExhaustedMessage('monthly');
                    return { departures: [], ok: false, reason: 'quota' };
                }
                return { departures: [], ok: false, reason: 'http' };
            }
            const wrapper = await resp.json();
            if (!wrapper || !wrapper.ok) {
                if (wrapper && wrapper.error === 'upstream_quota') {
                    setApiQuotaExhausted();
                    showQuotaExhaustedMessage('monthly');
                    return { departures: [], ok: false, reason: 'quota' };
                }
                return { departures: [], ok: false, reason: 'http' };
            }
            var raw = wrapper.data && Array.isArray(wrapper.data.departures) ? wrapper.data.departures : [];
            var departures = raw.map(mapBusDepartureForDisplay);
            departures.sort(function (a, b) { return (a.minutes || 999) - (b.minutes || 999); });
            return { departures: departures, ok: true, reason: 'ok' };
        } catch (e) {
            if (e && e.name === 'AbortError') {
                return { departures: [], ok: false, reason: 'aborted' };
            }
            return { departures: [], ok: false, reason: 'network' };
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
            if (controller) unregisterBusFetchController(controller);
        }
    }

    async function fetchBusDeparturesLegacy(configOverride) {
        if (isApiQuotaExhausted()) return [];
        const config = configOverride || getBusConfig();
        if (!config || !config.stopIds || config.stopIds.length === 0) return [];

        _busFetchInProgress = true;
        const allDeps = [];
        const seen = new Set();
        var requestCount = 0;
        var successCount = 0;
        var errorCount = 0;
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
                var depResult = await getDepartures(config.stopIds[i], { consumeBudget: false });
                requestCount++;
                if (depResult && depResult.ok) successCount++;
                else if (depResult && (depResult.reason === 'http' || depResult.reason === 'network')) errorCount++;
                var deps = depResult && Array.isArray(depResult.departures) ? depResult.departures : [];
                deps.forEach(function (dep) {
                    var configLine = config.lines.find(function (l) { return l.line === dep.line; });
                    if (!configLine) return;
                    if (lineCounts[dep.line] >= DEPS_PER_LINE) return;
                    var dirs = Array.isArray(configLine.directions) ? configLine.directions : [];
                    var matchAnyDirection = !dirs.length || dirs.indexOf('*') !== -1;
                    var matchesDir = matchAnyDirection || dirs.some(function (d) {
                        var token = normalizeWhitespace(String(d || '')).toLowerCase();
                        var depDir = normalizeWhitespace(String(dep.direction || '')).toLowerCase();
                        if (!token || !depDir) return false;
                        return depDir.indexOf(token) !== -1;
                    });
                    if (!matchesDir) return;

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
        allDeps.sort(function (a, b) { return (a.minutes || 999) - (b.minutes || 999); });
        return allDeps;
    }

    async function fetchBusDepartures() {
        if (isApiQuotaExhausted()) return [];
        const config = getBusConfig();
        if (!config || !config.stopIds || config.stopIds.length === 0) return [];

        if (LIVE_TRANSIT_API_BASE) {
            var widgetResult = await fetchBusWidgetDepartures(config);
            if (widgetResult && widgetResult.ok && Array.isArray(widgetResult.departures) && widgetResult.departures.length) {
                return widgetResult.departures;
            }
            if (widgetResult && widgetResult.ok && hasRestrictiveBusDirectionFilters(config)) {
                var relaxedConfig = buildAllDirectionsBusConfig(config);
                var relaxedResult = await fetchBusWidgetDepartures(relaxedConfig, { consumeBudget: false });
                if (relaxedResult && relaxedResult.ok && Array.isArray(relaxedResult.departures) && relaxedResult.departures.length) {
                    return relaxedResult.departures;
                }
            }
            if (widgetResult && widgetResult.ok) return widgetResult.departures || [];
            if (widgetResult && (widgetResult.reason === 'quota' || widgetResult.reason === 'daily')) return [];
            if (!LIVE_TRANSIT_API_BASE && !REJSEPLANEN_KEY) return [];
        }
        if (!LIVE_TRANSIT_API_BASE && !REJSEPLANEN_KEY) return [];
        if (!consumeBusApiRequestBudget()) return [];
        return fetchBusDeparturesLegacy(config);
    }

function getBusUiState() {
        return {
            lastBusFetch: _lastBusFetch,
            cachedDepartures: _cachedDepartures,
            busFetchInProgress: _busFetchInProgress,
            busConfigModalOpen: _busConfigModalOpen
        };
    }

function setBusUiState(patch) {
        if (!patch || typeof patch !== 'object') return;
        if (Object.prototype.hasOwnProperty.call(patch, 'lastBusFetch')) _lastBusFetch = patch.lastBusFetch;
        if (Object.prototype.hasOwnProperty.call(patch, 'cachedDepartures')) _cachedDepartures = patch.cachedDepartures;
        if (Object.prototype.hasOwnProperty.call(patch, 'busFetchInProgress')) _busFetchInProgress = patch.busFetchInProgress;
        if (Object.prototype.hasOwnProperty.call(patch, 'busConfigModalOpen')) _busConfigModalOpen = patch.busConfigModalOpen;
    }

    function readUiState() {
        return getBusUiState();
    }

    function writeUiState(patch) {
        setBusUiState(patch);
    }

    function getBusLineColors() {
        return LINE_COLORS;
    }

    function getBusCampusOrder() {
        return DTU_CAMPUS_ORDER.slice();
    }

    function getBusCampusPresets() {
        return DTU_CAMPUS_PRESETS;
    }

    function getDefaultCampuses() {
        return DTU_DEFAULT_CAMPUSES.slice();
    }

    function getBusEnabledKey() {
        return BUS_ENABLED_KEY;
    }

    function getBusSetupDoneKey() {
        return BUS_SETUP_DONE_KEY;
    }

    function forceImmediateBusRefresh() {
        _lastBusFetch = 0;
        updateBusDepartures();
    }

function getSmartPollInterval() {
        if (_cachedDepartures.length === 0) return 60000; // 60s default
        var soonest = Infinity;
        _cachedDepartures.forEach(function (dep) {
            if (dep.minutes != null && dep.minutes < soonest) soonest = dep.minutes;
        });
        if (soonest <= 15) return 60000;  // â‰¤15 min away: poll every 60s (minimum)
        return 120000;                     // >15 min: every 2 min
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
        if (!config) {
            stopBusPolling();
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
                    _lastBusFetch = now;
                    _cachedDepartures = await fetchBusDepartures();
                    saveBusSharedCache(_cachedDepartures, configSig);
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

    try {
        globalThis.DTUAfterDarkBusUi = {
            insertBusDisplay: insertBusDisplay,
            showBusSetupPrompt: showBusSetupPrompt,
            showBusConfigModal: showBusConfigModal,
            insertBusToggle: insertBusToggle,
            updateBusDepartures: updateBusDepartures,
            stopBusPolling: stopBusPolling,
            abortInFlightBusRequests: abortInFlightBusRequests,
            isBusEnabled: isBusEnabled,
            getBusConfig: getBusConfig,
            isApiQuotaExhausted: isApiQuotaExhausted,
            showQuotaExhaustedMessage: showQuotaExhaustedMessage,
            styleQuizSubmissionHistogram: styleQuizSubmissionHistogram,
            forceImmediateRefresh: forceImmediateBusRefresh
        };
    } catch (eExport) { }
})();
