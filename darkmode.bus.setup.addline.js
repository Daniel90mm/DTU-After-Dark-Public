(function () {
    'use strict';

    function getLineCampusLabels(ctx, lineCode, campuses) {
        var ids = ctx.sanitizeBusCampusIds(campuses);
        if (!ids.length) ids = ctx.getDefaultCampuses();
        var out = [];
        ids.forEach(function (cid) {
            var preset = ctx.getBusCampusPresets()[cid];
            if (!preset || !Array.isArray(preset.lines)) return;
            if (preset.lines.indexOf(lineCode) === -1) return;
            out.push(preset.label || cid);
        });
        return out;
    }

    function createAvailableLineCard(ctx, bus, config) {
        var modalTheme = ctx.modalTheme;
        var isDarkTheme = ctx.isDarkTheme;
        var color = ctx.getBusLineColors()[bus.line] || '#1565c0';
        var baseSurface = isDarkTheme ? 'rgba(255,255,255,0.015)' : 'rgba(15,23,42,0.018)';
        var hoverSurface = isDarkTheme ? ctx.rgbaFromHex(color, 0.055, color) : ctx.rgbaFromHex(color, 0.038, color);
        // No coloured stripe on the card's edge: a bottom hairline,
        // and a faint tint of the line's type colour on hover.
        var baseRing = 'inset 0 -1px 0 ' + (isDarkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)');
        var hoverRing = 'inset 0 -1px 0 ' + ctx.rgbaFromHex(color, isDarkTheme ? 0.32 : 0.18, color);
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

        var badge = ctx.createBusLineBadge(bus.line, { inline: true, dark: isDarkTheme, fontSize: 19, minWidth: '84px' });
        badge.style.setProperty('align-self', 'flex-start', 'important');

        var textCol = document.createElement('div');
        textCol.style.cssText = 'display:flex;flex-direction:column;justify-content:center;gap:8px;min-width:0;flex:1;';

        var label = document.createElement('span');
        label.style.cssText = 'font-size:17px;font-weight:700;line-height:1.2;color:' + modalTheme.text + ';';
        label.textContent = bus.name;

        var campusTags = getLineCampusLabels(ctx, bus.line, config.campuses);
        var campusMetaText = document.createElement('span');
        campusMetaText.style.cssText = 'font-size:13px;line-height:1.45;color:' + modalTheme.subtle + ';';
        campusMetaText.textContent = campusTags.length ? campusTags.join(', ') : 'Available for your selected campuses';

        var actionHint = document.createElement('span');
        actionHint.style.cssText = 'font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:'
            + (isDarkTheme ? ctx.rgbaFromHex(color, 0.95, color) : ctx.rgbaFromHex(color, 0.88, color)) + ';';
        actionHint.textContent = 'Choose directions';

        textCol.appendChild(label);
        textCol.appendChild(campusMetaText);
        textCol.appendChild(actionHint);

        card.appendChild(badge);
        card.appendChild(textCol);

        card.addEventListener('click', function () { renderDirectionView(ctx, bus.line); });
        return card;
    }

    function renderAddLineView(ctx) {
        var modal = ctx.modal;
        var modalTheme = ctx.modalTheme;
        var isDarkTheme = ctx.isDarkTheme;
        while (modal.firstChild) modal.removeChild(modal.firstChild);
        ctx.setModalLayout('760px');
        var config = ctx.getModalBusConfig();
        if (config.lines.length >= ctx.MAX_LINES) { ctx.renderManageView(); return; }
        var configuredLineNames = config.lines.map(function (l) { return l.line; });

        ctx.appendTitle('Add Bus Line',
            'margin: 0 0 8px 0; font-size: 30px; font-weight: 800; color: ' + modalTheme.heading + '; letter-spacing: -0.5px;');

        var selectedCampusLabels = ctx.getCampusLabels(config.campuses);
        ctx.appendSubtitle('Select a bus line to add'
            + (selectedCampusLabels.length ? ' for ' + selectedCampusLabels.join(' + ') : '')
            + ':', 'margin: 0 0 10px 0; font-size: 15px; color: ' + modalTheme.subtle + '; line-height: 1.5; max-width: 680px;');

        var contextMeta = document.createElement('div');
        ctx.markExt(contextMeta);
        contextMeta.style.cssText = 'display:flex;flex-wrap:wrap;gap:18px;align-items:center;'
            + 'margin:0 0 24px 0;padding:0 0 14px 0;border-bottom:1px solid '
            + (isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)') + ';';

        var availableCount = document.createElement('span');
        availableCount.style.cssText = 'font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:' + modalTheme.muted + ';';

        var campusSummary = document.createElement('span');
        campusSummary.style.cssText = 'font-size:13px;color:' + modalTheme.subtle + ';';

        var grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;align-items:stretch;';

        var campusLines = ctx.getCampusLineDefinitions(config.campuses);
        var availableLines = campusLines.filter(function (bus) { return configuredLineNames.indexOf(bus.line) === -1; });
        availableCount.textContent = availableLines.length + ' available lines';
        campusSummary.textContent = selectedCampusLabels.length ? 'Campuses: ' + selectedCampusLabels.join(', ') : 'Campus scope follows your current bus setup.';
        contextMeta.appendChild(availableCount);
        contextMeta.appendChild(campusSummary);
        modal.appendChild(contextMeta);

        availableLines.forEach(function (bus) {
            grid.appendChild(createAvailableLineCard(ctx, bus, config));
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
        backBtn.textContent = config.lines.length > 0 ? 'Back' : 'Back to campuses';
        backBtn.addEventListener('mouseenter', function () {
            backBtn.style.background = isDarkTheme ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)';
            backBtn.style.color = modalTheme.text;
        });
        backBtn.addEventListener('mouseleave', function () {
            backBtn.style.background = isDarkTheme ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.05)';
            backBtn.style.color = modalTheme.subtle;
        });
        backBtn.addEventListener('click', function () {
            var c = ctx.getBusConfig();
            if (c && c.lines && c.lines.length > 0) { ctx.renderManageView(); }
            else { ctx.renderCampusSelectionView(false); }
        });
        btnRow.appendChild(backBtn);
        modal.appendChild(btnRow);
    }

    function createDirectionRow(ctx, selectedLine, direction) {
        var modalTheme = ctx.modalTheme;
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
        arrow.textContent = 'to';

        var dirText = document.createElement('span');
        dirText.style.cssText = 'font-size: 14px; color: ' + modalTheme.text + ';';
        dirText.textContent = direction;

        row.appendChild(cb);
        row.appendChild(arrow);
        row.appendChild(dirText);
        return { row: row, cb: cb };
    }

    function saveAddedLine(ctx, selectedLine, selectedDirs, errorEl) {
        var config = ctx.getModalBusConfig();
        config.lines = Array.isArray(config.lines) ? config.lines.filter(function (entry) {
            return entry && entry.line !== selectedLine;
        }) : [];
        if (config.lines.length >= ctx.MAX_LINES) {
            errorEl.textContent = 'Maximum of ' + ctx.MAX_LINES + ' bus lines reached. Remove one to add another.';
            errorEl.style.display = 'block';
            return;
        }
        config.lines.push({ line: selectedLine, directions: selectedDirs });
        if (!config.stopIds || config.stopIds.length === 0) {
            config.stopIds = ctx.getCampusStopIds(config.campuses);
        }
        ctx.saveBusConfig(config);
        localStorage.setItem(ctx.getBusEnabledKey(), 'true');
        localStorage.setItem(ctx.getBusSetupDoneKey(), 'configured');
        ctx.writeUiState({ lastBusFetch: 0, cachedDepartures: [] });
        ctx.updateBusDepartures();
        ctx.renderManageView();
    }

    function renderDirectionView(ctx, selectedLine) {
        var modal = ctx.modal;
        var modalTheme = ctx.modalTheme;
        var isDarkTheme = ctx.isDarkTheme;
        while (modal.firstChild) modal.removeChild(modal.firstChild);
        ctx.setModalLayout('520px');

        ctx.appendTitle('Pick Directions',
            'margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: ' + modalTheme.heading + '; letter-spacing: -0.3px;');

        var subtitle = document.createElement('p');
        subtitle.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; color: ' + modalTheme.subtle + '; line-height: 1.4;';

        var lineTag = ctx.createBusLineBadge(selectedLine, { inline: true, dark: isDarkTheme, fontSize: 13 });
        subtitle.appendChild(document.createTextNode('Select directions for '));
        subtitle.appendChild(lineTag);
        subtitle.appendChild(document.createTextNode(':'));
        modal.appendChild(subtitle);

        var configForDirection = ctx.getModalBusConfig();
        var directions = ctx.getLocalBusDirectionOptions(selectedLine, configForDirection);
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
            var item = createDirectionRow(ctx, selectedLine, direction);
            modal.appendChild(item.row);
            dirCheckboxes.push({ direction: direction, cb: item.cb });
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
        backBtn.addEventListener('click', function () { renderAddLineView(ctx); });

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
            saveAddedLine(ctx, selectedLine, selectedDirs, errorEl);
        });

        btnRow.appendChild(backBtn);
        btnRow.appendChild(saveBtn);
        modal.appendChild(btnRow);
    }

    globalThis.DTUAfterDarkBusSetupAddLine = {
        renderAddLineView: renderAddLineView,
        renderDirectionView: renderDirectionView
    };
})();
