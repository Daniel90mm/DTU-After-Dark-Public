(function () {
    'use strict';

    var dom = globalThis.DTUAfterDarkDom;
    if (!dom || typeof dom.markExt !== 'function' || typeof dom.isTopWindow !== 'function') {
        throw new Error('DTU After Dark: darkmode.dom.js must load before darkmode.bus.setup.js');
    }
    var markExt = dom.markExt;
    var isTopWindow = dom.isTopWindow;

    function getCore() {
        var core = globalThis.DTUAfterDarkBusCore;
        if (!core
            || typeof core.getBusConfig !== 'function'
            || typeof core.saveBusConfig !== 'function'
            || typeof core.buildDefaultBusConfig !== 'function'
            || typeof core.normalizeBusLines !== 'function'
            || typeof core.createBusLineBadge !== 'function'
            || typeof core.rgbaFromHex !== 'function'
            || typeof core.ensureBusStyles !== 'function'
            || typeof core.isDarkModeEnabled !== 'function'
            || typeof core.isDTULearnHomepage !== 'function'
            || typeof core.getBusEnabledKey !== 'function'
            || typeof core.getBusSetupDoneKey !== 'function'
            || typeof core.getLocalBusDirectionOptions !== 'function'
            || typeof core.stopBusPolling !== 'function'
            || typeof core.abortInFlightBusRequests !== 'function'
            || typeof core.writeUiState !== 'function'
            || typeof core.updateBusDepartures !== 'function'
            || typeof core.BUS_MAX_CONFIGURED_LINES !== 'number') {
            throw new Error('DTU After Dark: darkmode.bus.js must load before the bus setup dialog is used');
        }
        return core;
    }

    function getPresets() {
        var presets = globalThis.DTUAfterDarkBusPresets;
        if (!presets
            || typeof presets.sanitizeBusCampusIds !== 'function'
            || typeof presets.getCampusStopIds !== 'function'
            || typeof presets.getCampusLineCodes !== 'function'
            || typeof presets.getCampusLineDefinitions !== 'function'
            || typeof presets.getBusCampusPresets !== 'function'
            || typeof presets.getBusCampusOrder !== 'function'
            || typeof presets.getBusLineColors !== 'function'
            || typeof presets.getDefaultCampuses !== 'function') {
            throw new Error('DTU After Dark: darkmode.bus.presets.js must load before the bus setup dialog is used');
        }
        return presets;
    }

    function getAddLine() {
        var addLine = globalThis.DTUAfterDarkBusSetupAddLine;
        if (!addLine
            || typeof addLine.renderAddLineView !== 'function'
            || typeof addLine.renderDirectionView !== 'function') {
            throw new Error('DTU After Dark: darkmode.bus.setup.addline.js must load before darkmode.bus.setup.js');
        }
        return addLine;
    }

    function showBusSetupPrompt() {
        var core = getCore();
        var ensureBusStyles = core.ensureBusStyles;
        var isDarkModeEnabled = core.isDarkModeEnabled;
        var isDTULearnHomepage = core.isDTULearnHomepage;
        var getBusSetupDoneKey = core.getBusSetupDoneKey;
        if (!isTopWindow()) return;
        if (!isDTULearnHomepage()) return;
        if (localStorage.getItem(getBusSetupDoneKey())) return;
        if (document.querySelector('.dtu-bus-setup-prompt')) return;
        ensureBusStyles();

        var prompt = document.createElement('div');
        markExt(prompt);
        prompt.className = 'dtu-bus-setup-prompt';
        prompt.setAttribute('role', 'dialog');
        prompt.setAttribute('aria-modal', 'false');
        prompt.setAttribute('aria-labelledby', 'dtu-bus-setup-title');
        prompt.setAttribute('data-theme', isDarkModeEnabled() ? 'dark' : 'light');

        var title = document.createElement('h2');
        markExt(title);
        title.id = 'dtu-bus-setup-title';
        title.textContent = 'Bus times in the menu bar';

        var desc = document.createElement('p');
        markExt(desc);
        desc.textContent = 'Pick up to three bus lines near your campus and see their next departures next to Library. You can change this later in Settings.';

        var actions = document.createElement('div');
        markExt(actions);
        actions.className = 'dtu-bus-setup-actions';

        function closePrompt(after) {
            document.removeEventListener('keydown', onKey, true);
            prompt.removeAttribute('data-open');
            setTimeout(function () {
                prompt.remove();
                if (after) after();
            }, 220);
        }
        function onKey(e) {
            if (e.key === 'Escape' && prompt.isConnected) closePrompt(null);
        }

        var setupBtn = document.createElement('button');
        markExt(setupBtn);
        setupBtn.type = 'button';
        setupBtn.className = 'dtu-bus-setup-primary';
        setupBtn.textContent = 'Choose lines';
        setupBtn.addEventListener('click', function () { closePrompt(showBusConfigModal); });

        var dismissBtn = document.createElement('button');
        markExt(dismissBtn);
        dismissBtn.type = 'button';
        dismissBtn.className = 'dtu-bus-setup-secondary';
        dismissBtn.textContent = 'Not now';
        dismissBtn.addEventListener('click', function () {
            localStorage.setItem(getBusSetupDoneKey(), 'dismissed');
            closePrompt(null);
        });

        actions.appendChild(setupBtn);
        actions.appendChild(dismissBtn);
        prompt.appendChild(title);
        prompt.appendChild(desc);
        prompt.appendChild(actions);
        document.body.appendChild(prompt);
        document.addEventListener('keydown', onKey, true);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { prompt.setAttribute('data-open', '1'); });
        });
    }

    function showBusConfigModal() {
        var core = getCore();
        var presets = getPresets();
        var addLine = getAddLine();
        var abortInFlightBusRequests = core.abortInFlightBusRequests;
        var isDarkModeEnabled = core.isDarkModeEnabled;
        var writeUiState = core.writeUiState;
        var stopBusPolling = core.stopBusPolling;
        var BUS_MAX_CONFIGURED_LINES = core.BUS_MAX_CONFIGURED_LINES;
        var getBusConfig = core.getBusConfig;
        var buildDefaultBusConfig = core.buildDefaultBusConfig;
        var sanitizeBusCampusIds = presets.sanitizeBusCampusIds;
        var getBusCampusPresets = presets.getBusCampusPresets;
        var getDefaultCampuses = presets.getDefaultCampuses;
        var getCampusLineCodes = presets.getCampusLineCodes;
        var getCampusStopIds = presets.getCampusStopIds;
        var normalizeBusLines = core.normalizeBusLines;
        var saveBusConfig = core.saveBusConfig;
        var getBusCampusOrder = presets.getBusCampusOrder;
        var createBusLineBadge = core.createBusLineBadge;
        var getCampusLineDefinitions = presets.getCampusLineDefinitions;
        var getBusLineColors = presets.getBusLineColors;
        var rgbaFromHex = core.rgbaFromHex;
        var getLocalBusDirectionOptions = core.getLocalBusDirectionOptions;
        var getBusEnabledKey = core.getBusEnabledKey;
        var getBusSetupDoneKey = core.getBusSetupDoneKey;
        var updateBusDepartures = core.updateBusDepartures;
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
                hoverRow: '#383838'
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
                hoverRow: '#f3f4f6'
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
        // A real dialog: named by the heading each view draws, Escape closes, Tab stays inside.
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'dtu-bus-config-title');
        modal.tabIndex = -1;
        var returnFocusTo = document.activeElement;
        modal.style.cssText = 'background: ' + modalTheme.background + '; border-radius: 14px; padding: 28px; max-width: 480px; '
            + 'width: 90%; max-height: 80vh; overflow-y: auto; color: ' + modalTheme.text + '; '
            + 'box-shadow: ' + modalTheme.overlayShadow + '; '
            + 'border: ' + modalTheme.overlayBorder + ';';

        function setModalLayout(maxWidth) {
            modal.style.maxWidth = maxWidth || '480px';
            modal.style.width = '92%';
        }

        function appendTitle(text, cssText) {
            var titleEl = document.createElement('h2');
            titleEl.id = 'dtu-bus-config-title';
            titleEl.style.cssText = cssText;
            titleEl.textContent = text;
            modal.appendChild(titleEl);
            return titleEl;
        }

        function appendSubtitle(text, cssText) {
            var subtitle = document.createElement('p');
            subtitle.style.cssText = cssText;
            subtitle.textContent = text;
            modal.appendChild(subtitle);
            return subtitle;
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

        function getAllowedLineSet(campuses) {
            var set = {};
            getCampusLineCodes(campuses).forEach(function (line) { set[line] = true; });
            return set;
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
            // Departures fetched for the old campus must not show for the new one.
            writeUiState({ lastBusFetch: 0, cachedDepartures: [] });
            return config;
        }

        var isClosing = false;

        function onModalKey(e) {
            // Reopening the setup removes this box without dismissModal: drop the stale handler.
            if (overlay.isConnected === false) { document.removeEventListener('keydown', onModalKey, true); return; }
            if (!e) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                dismissModal();
                return;
            }
            if (e.key !== 'Tab') return;
            var focusables = Array.prototype.filter.call(
                modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'),
                function (el) { return el.offsetParent !== null; }
            );
            if (!focusables.length) { e.preventDefault(); modal.focus(); return; }
            var first = focusables[0];
            var last = focusables[focusables.length - 1];
            var active = document.activeElement;
            if (!modal.contains(active)) {
                e.preventDefault();
                (e.shiftKey ? last : first).focus();
            } else if (e.shiftKey && (active === first || active === modal)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        }

        function dismissModal() {
            if (isClosing) return;
            isClosing = true;
            document.removeEventListener('keydown', onModalKey, true);
            try { if (returnFocusTo && returnFocusTo.isConnected && returnFocusTo.focus) returnFocusTo.focus(); } catch (eFocus) { }

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

        // mousedown, as in Settings: a text drag that ends on the backdrop must not close it.
        overlay.addEventListener('mousedown', function (e) {
            if (e.target === overlay) dismissModal();
        });

        function createCampusOptionRow(cid, preset, selected) {
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
            return row;
        }

        function createCampusActions(firstTime, selected, errorEl) {
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
                if (firstTime && (!updated.lines || !updated.lines.length)) addLine.renderAddLineView(addLineContext);
                else renderManageView();
            });

            btnRow.appendChild(backBtn);
            btnRow.appendChild(saveBtn);
            return btnRow;
        }

        function renderCampusSelectionView(firstTime) {
            while (modal.firstChild) modal.removeChild(modal.firstChild);
            setModalLayout('520px');
            var config = getModalBusConfig();
            var selected = {};
            sanitizeBusCampusIds(config.campuses).forEach(function (cid) { selected[cid] = true; });
            if (!Object.keys(selected).length) {
                getDefaultCampuses().forEach(function (cid0) { selected[cid0] = true; });
            }

            appendTitle('Choose Campus Stops',
                'margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: ' + modalTheme.heading + '; letter-spacing: -0.3px;');
            appendSubtitle('Select one or more campuses. The bus widget will use the combined stop list.',
                'margin: 0 0 16px 0; font-size: 14px; color: ' + modalTheme.subtle + '; line-height: 1.45;');

            var listWrap = document.createElement('div');
            listWrap.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

            getBusCampusOrder().forEach(function (cid) {
                var preset = getBusCampusPresets()[cid];
                if (!preset) return;
                listWrap.appendChild(createCampusOptionRow(cid, preset, selected));
            });

            modal.appendChild(listWrap);

            var errorEl = document.createElement('div');
            errorEl.style.cssText = 'font-size:12px;color:#ef5350;margin-top:10px;display:none;';
            modal.appendChild(errorEl);
            modal.appendChild(createCampusActions(firstTime, selected, errorEl));
        }

        function createConfiguredLineRow(config, lineCfg, idx) {
            var card = document.createElement('div');
            markExt(card);
            card.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 0;'
                + (idx > 0 ? ('border-top:1px solid ' + (isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)') + ';') : '');

            var badge = createBusLineBadge(lineCfg.line, { inline: true, dark: isDarkTheme, fontSize: 16, minWidth: '64px' });

            var info = document.createElement('div');
            info.style.cssText = 'flex: 1; font-size: 13px; color: ' + modalTheme.subtle + '; overflow: hidden; text-overflow: ellipsis;';
            var dirs = Array.isArray(lineCfg.directions) ? lineCfg.directions : [];
            info.textContent = (dirs.length === 0 || dirs.indexOf('*') !== -1) ? 'All directions' : dirs.join(', ');

            var delBtn = document.createElement('button');
            delBtn.style.cssText = 'background: transparent; border: 1px solid ' + modalTheme.softBorder + '; color: ' + modalTheme.muted + '; '
                + 'width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 14px; '
                + 'display: flex; align-items: center; justify-content: center; transition: all 0.15s;';
            delBtn.textContent = '\u00D7';
            delBtn.setAttribute('aria-label', 'Remove line ' + lineCfg.line);
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
            return card;
        }

        function renderManageView() {
            while (modal.firstChild) modal.removeChild(modal.firstChild);
            setModalLayout('520px');
            var config = getModalBusConfig();

            appendTitle('Bus Lines',
                'margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: ' + modalTheme.heading + '; letter-spacing: -0.3px;');

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
            if (config && config.lines) {
                config.lines.forEach(function (lineCfg, idx) {
                    modal.appendChild(createConfiguredLineRow(config, lineCfg, idx));
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
                addBtn.addEventListener('click', function () { addLine.renderAddLineView(addLineContext); });
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

        var addLineContext = {
            modal: modal,
            markExt: markExt,
            setModalLayout: setModalLayout,
            appendTitle: appendTitle,
            appendSubtitle: appendSubtitle,
            modalTheme: modalTheme,
            isDarkTheme: isDarkTheme,
            MAX_LINES: MAX_LINES,
            getModalBusConfig: getModalBusConfig,
            getCampusLabels: getCampusLabels,
            getBusCampusPresets: getBusCampusPresets,
            sanitizeBusCampusIds: sanitizeBusCampusIds,
            getDefaultCampuses: getDefaultCampuses,
            getCampusLineDefinitions: getCampusLineDefinitions,
            getBusLineColors: getBusLineColors,
            rgbaFromHex: rgbaFromHex,
            createBusLineBadge: createBusLineBadge,
            getLocalBusDirectionOptions: getLocalBusDirectionOptions,
            getCampusStopIds: getCampusStopIds,
            saveBusConfig: saveBusConfig,
            getBusEnabledKey: getBusEnabledKey,
            getBusSetupDoneKey: getBusSetupDoneKey,
            writeUiState: writeUiState,
            updateBusDepartures: updateBusDepartures,
            getBusConfig: getBusConfig,
            renderManageView: renderManageView,
            renderCampusSelectionView: renderCampusSelectionView
        };

        var config = getBusConfig();
        if (!config) {
            renderCampusSelectionView(true);
        } else if (config && config.lines && config.lines.length > 0) {
            renderManageView();
        } else {
            addLine.renderAddLineView(addLineContext);
        }

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        document.addEventListener('keydown', onModalKey, true);
        try { modal.focus(); } catch (eFocus) { }
    }

    globalThis.DTUAfterDarkBusSetup = {
        showBusSetupPrompt: showBusSetupPrompt,
        showBusConfigModal: showBusConfigModal
    };
})();
