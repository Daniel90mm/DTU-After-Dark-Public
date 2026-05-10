(function () {
    var deps = globalThis.DTUAfterDarkStudyplanExamsDeps;
    if (!deps) return;

    function getState() {
        return deps.getState ? (deps.getState() || {}) : {};
    }

    function setState(patch) {
        if (deps.setState) deps.setState(patch || {});
    }

    function resetRenderedSig() {
        setState({ lastRenderedSig: '' });
    }

    function requestRender() {
        if (deps.requestRender) deps.requestRender();
    }

    function renderStudyplanExamChoicePrompts(body, choicePrompts, isDark, opts) {
        if (!body || !Array.isArray(choicePrompts) || !choicePrompts.length) return;
        opts = opts || {};

        var panel = document.createElement('div');
        deps.markExt(panel);
        panel.style.cssText = 'margin-bottom:12px;padding:12px 14px 10px;border-radius:8px;';
        panel.style.setProperty('border', '0', 'important');
        panel.style.setProperty('background', isDark ? 'rgba(255,214,102,0.06)' : 'rgba(255,214,102,0.10)', 'important');
        panel.style.setProperty('background-color', isDark ? 'rgba(255,214,102,0.06)' : 'rgba(255,214,102,0.10)', 'important');
        panel.style.setProperty('max-height', '280px', 'important');
        panel.style.setProperty('overflow-y', 'auto', 'important');
        panel.style.setProperty('padding-right', '8px', 'important');

        var title = document.createElement('div');
        deps.markExt(title);
        title.textContent = opts.titleText || 'Choose exam date';
        title.style.cssText = 'font-size:12px;font-weight:800;letter-spacing:0.01em;margin-bottom:3px;';
        panel.appendChild(title);

        var subtitle = document.createElement('div');
        deps.markExt(subtitle);
        var pendingCount = choicePrompts.filter(function (choice) { return choice && choice.required; }).length;
        subtitle.textContent = opts.subtitleText || (pendingCount
            ? pendingCount + ' course' + (pendingCount !== 1 ? 's need' : ' needs') + ' your exam-date selection before they can be placed in the timeline.'
            : 'Courses with multiple possible exam dates can be adjusted here.');
        subtitle.style.cssText = 'font-size:11px;opacity:0.82;margin-bottom:8px;';
        panel.appendChild(subtitle);

        choicePrompts.forEach(function (choice) {
            if (!choice || !Array.isArray(choice.options) || !choice.options.length) return;

            var row = document.createElement('div');
            deps.markExt(row);
            row.style.cssText = 'padding:10px 0 8px;';
            row.style.setProperty('border-top', panel.childNodes.length > 2 ? '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)') : 'none', 'important');

            var head = document.createElement('div');
            deps.markExt(head);
            head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px;';

            var courseLabel = document.createElement('div');
            deps.markExt(courseLabel);
            courseLabel.style.cssText = 'display:flex;flex-direction:column;gap:1px;min-width:0;';

            var courseCode = document.createElement('div');
            deps.markExt(courseCode);
            courseCode.textContent = choice.code;
            courseCode.style.cssText = 'font-size:12px;font-weight:700;';
            courseLabel.appendChild(courseCode);

            if (choice.name) {
                var courseName = document.createElement('div');
                deps.markExt(courseName);
                courseName.textContent = choice.name;
                courseName.style.cssText = 'font-size:11px;opacity:0.82;';
                courseLabel.appendChild(courseName);
            }
            head.appendChild(courseLabel);

            var status = document.createElement('span');
            deps.markExt(status);
            status.textContent = choice.required ? 'Selection needed' : 'Selected';
            var statusColor = choice.required ? 'var(--dtu-ad-status-warning)' : 'var(--dtu-ad-status-success)';
            status.style.cssText = 'padding-left:8px;font-size:10px;font-weight:700;letter-spacing:0.02em;';
            status.style.setProperty('color', statusColor, 'important');
            status.style.setProperty('border-left', '3px solid ' + statusColor, 'important');
            status.style.setProperty('background', 'transparent', 'important');
            status.style.setProperty('background-color', 'transparent', 'important');
            head.appendChild(status);
            row.appendChild(head);

            var optionsWrap = document.createElement('div');
            deps.markExt(optionsWrap);
            optionsWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px 10px;';

            choice.options.forEach(function (option) {
                if (!option || !option.entry) return;
                var btn = document.createElement('button');
                deps.markExt(btn);
                btn.type = 'button';
                var choiceKey = option.choiceKey || deps.buildStudyplanExamChoiceOptionKey(option);
                var selected = choice.selectedChoiceKey && choice.selectedChoiceKey === choiceKey;
                btn.textContent = deps.formatExamClusterShortDate(option.entry.dateTs) + ' · ' + (option.entry.text || option.entry.dateLabel || '');
                btn.style.cssText = 'padding:0 0 2px 0;border-radius:0;font-size:10px;font-weight:700;cursor:pointer;'
                    + 'max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                btn.style.setProperty('border', '0', 'important');
                btn.style.setProperty('border-bottom', '1px solid ' + (selected ? 'var(--dtu-ad-accent)' : (isDark ? '#6a624f' : '#c8b787')), 'important');
                btn.style.setProperty('background', 'transparent', 'important');
                btn.style.setProperty('background-color', 'transparent', 'important');
                btn.style.setProperty('box-shadow', 'none', 'important');
                btn.style.setProperty('appearance', 'none', 'important');
                btn.style.setProperty('-webkit-appearance', 'none', 'important');
                btn.style.setProperty('color', selected
                    ? (isDark ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)')
                    : (isDark ? '#f2f2f2' : '#2f2f2f'), 'important');
                btn.title = option.entry.text || option.entry.dateLabel || '';
                btn.addEventListener('click', function () {
                    deps.setStoredStudyplanExamChoice(choice.courseKey, choiceKey);
                    resetRenderedSig();
                    requestRender();
                });
                optionsWrap.appendChild(btn);
            });

            if (choice.selectedChoiceKey) {
                var clearBtn = document.createElement('button');
                deps.markExt(clearBtn);
                clearBtn.type = 'button';
                clearBtn.textContent = 'Clear';
                clearBtn.style.cssText = 'padding:0 0 2px 0;border-radius:0;font-size:10px;font-weight:700;cursor:pointer;';
                clearBtn.style.setProperty('border', '0', 'important');
                clearBtn.style.setProperty('border-bottom', '1px solid ' + (isDark ? '#666' : '#c7c7c7'), 'important');
                clearBtn.style.setProperty('background', 'transparent', 'important');
                clearBtn.style.setProperty('background-color', 'transparent', 'important');
                clearBtn.style.setProperty('box-shadow', 'none', 'important');
                clearBtn.style.setProperty('appearance', 'none', 'important');
                clearBtn.style.setProperty('-webkit-appearance', 'none', 'important');
                clearBtn.style.setProperty('color', isDark ? '#d9d9d9' : '#4b5563', 'important');
                clearBtn.addEventListener('click', function () {
                    deps.setStoredStudyplanExamChoice(choice.courseKey, '');
                    resetRenderedSig();
                    requestRender();
                });
                optionsWrap.appendChild(clearBtn);
            }

            row.appendChild(optionsWrap);
            panel.appendChild(row);
        });

        body.appendChild(panel);
    }

    function renderStudyplanExamEditorEmptyState(body, isDark) {
        if (!body) return;
        var panel = document.createElement('div');
        deps.markExt(panel);
        panel.style.cssText = 'margin-bottom:10px;padding:16px 18px 14px;border-radius:10px;';
        panel.style.setProperty('border', '1px solid ' + (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(148,163,184,0.20)'), 'important');
        panel.style.setProperty('background', isDark ? 'rgba(255,255,255,0.025)' : 'rgba(248,250,252,0.92)', 'important');
        panel.style.setProperty('background-color', isDark ? 'rgba(255,255,255,0.025)' : 'rgba(248,250,252,0.92)', 'important');

        var title = document.createElement('div');
        deps.markExt(title);
        title.textContent = 'Edit exam choices';
        title.style.cssText = 'font-size:12px;font-weight:700;margin-bottom:3px;';
        panel.appendChild(title);

        var text = document.createElement('div');
        deps.markExt(text);
        text.textContent = 'There are no ambiguous exam-date choices on this page right now.';
        text.style.cssText = 'font-size:11px;opacity:0.82;';
        panel.appendChild(text);

        body.appendChild(panel);
    }

    function removeStudyplanExamEditorModal() {
        var existing = document.querySelector('.dtu-studyplan-exam-editor-modal');
        if (!existing) return;
        existing.remove();
    }

    function closeStudyplanExamEditorModal() {
        setState({ choiceEditorOpen: false });
        removeStudyplanExamEditorModal();
        resetRenderedSig();
        requestRender();
    }

    function showStudyplanExamEditorModal(baseMapped, allChoicePrompts, isDark) {
        if (!deps.isTopWindow) return;

        removeStudyplanExamEditorModal();

        var overlay = document.createElement('div');
        deps.markExt(overlay);
        overlay.className = 'dtu-studyplan-exam-editor-modal';
        overlay.tabIndex = -1;
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000001;display:flex;align-items:center;justify-content:center;'
            + 'background:transparent !important;background-color:transparent !important;'
            + 'backdrop-filter:blur(6px) !important;-webkit-backdrop-filter:blur(6px) !important;'
            + 'opacity:0;transition:opacity .2s ease;';

        var modal = document.createElement('div');
        deps.markExt(modal);
        modal.style.cssText = 'width:min(1080px,94vw);max-height:86vh;overflow:auto;border-radius:14px;padding:22px 24px 20px;'
            + 'background:' + (isDark ? 'rgba(34,34,34,0.95)' : 'rgba(255,255,255,0.97)') + ';'
            + 'color:' + (isDark ? '#e0e0e0' : '#1f2937') + ';'
            + 'border:1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(148,163,184,0.22)') + ';'
            + 'box-shadow:' + (isDark
                ? '0 18px 52px rgba(0,0,0,0.45)'
                : '0 18px 52px rgba(15,23,42,0.22)') + ';'
            + 'font-family:sans-serif;';

        var header = document.createElement('div');
        deps.markExt(header);
        header.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:12px;';

        var headerCopy = document.createElement('div');
        deps.markExt(headerCopy);
        headerCopy.style.cssText = 'min-width:0;flex:1;';

        var title = document.createElement('div');
        deps.markExt(title);
        title.textContent = 'Edit timeline entries';
        title.style.cssText = 'font-size:20px;font-weight:800;letter-spacing:-0.01em;margin-bottom:4px;';
        headerCopy.appendChild(title);

        var subtitle = document.createElement('div');
        deps.markExt(subtitle);
        subtitle.textContent = 'Adjust exam-date choices and manual timeline entries without replacing the main timeline view.';
        subtitle.style.cssText = 'font-size:13px;line-height:1.5;opacity:0.8;max-width:780px;';
        headerCopy.appendChild(subtitle);

        header.appendChild(headerCopy);

        var closeBtn = document.createElement('button');
        deps.markExt(closeBtn);
        closeBtn.type = 'button';
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = 'padding:0;border:0;border-radius:0;background:transparent;font-size:13px;font-weight:700;cursor:pointer;';
        closeBtn.style.setProperty('background', 'transparent', 'important');
        closeBtn.style.setProperty('background-color', 'transparent', 'important');
        closeBtn.style.setProperty('background-image', 'none', 'important');
        closeBtn.style.setProperty('box-shadow', 'none', 'important');
        closeBtn.style.setProperty('appearance', 'none', 'important');
        closeBtn.style.setProperty('-webkit-appearance', 'none', 'important');
        closeBtn.style.setProperty('color', isDark ? '#e5e7eb' : '#334155', 'important');
        closeBtn.addEventListener('click', closeStudyplanExamEditorModal);
        header.appendChild(closeBtn);

        modal.appendChild(header);

        var modalBody = document.createElement('div');
        deps.markExt(modalBody);
        modalBody.style.cssText = 'display:flex;flex-direction:column;gap:14px;';

        if (Array.isArray(allChoicePrompts) && allChoicePrompts.length) {
            renderStudyplanExamChoicePrompts(modalBody, allChoicePrompts, isDark, {
                titleText: 'Exam-date choices',
                subtitleText: 'Resolve ambiguous courses or switch between valid exam dates here.'
            });
        }

        if (Array.isArray(baseMapped) && baseMapped.length) {
            renderStudyplanExamTimelineEditor(modalBody, baseMapped, isDark, { hideHeading: true });
        } else {
            renderStudyplanExamEditorEmptyState(modalBody, isDark);
        }

        modal.appendChild(modalBody);
        overlay.appendChild(modal);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeStudyplanExamEditorModal();
        });
        overlay.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeStudyplanExamEditorModal();
            }
        });

        document.body.appendChild(overlay);
        requestAnimationFrame(function () {
            overlay.style.opacity = '1';
            try { overlay.focus(); } catch (eFocus) { }
        });
    }

    function renderStudyplanExamTimelineEditor(body, baseMapped, isDark, opts) {
        if (!body) return;
        opts = opts || {};
        var overrides = deps.getStoredStudyplanExamTimelineOverrides();
        var panel = document.createElement('div');
        deps.markExt(panel);
        panel.style.cssText = 'margin-bottom:10px;padding:16px 18px 14px;border-radius:10px;';
        panel.style.setProperty('border', '1px solid ' + (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(148,163,184,0.20)'), 'important');
        panel.style.setProperty('background', isDark ? 'rgba(255,255,255,0.025)' : 'rgba(248,250,252,0.92)', 'important');
        panel.style.setProperty('background-color', isDark ? 'rgba(255,255,255,0.025)' : 'rgba(248,250,252,0.92)', 'important');

        var head = document.createElement('div');
        deps.markExt(head);
        head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px;';
        if (!opts.hideHeading) {
            var title = document.createElement('div');
            deps.markExt(title);
            title.textContent = 'Edit timeline entries';
            title.style.cssText = 'font-size:13px;font-weight:800;letter-spacing:0.01em;';
            head.appendChild(title);
        } else {
            head.style.justifyContent = 'flex-end';
        }
        var resetBtn = document.createElement('button');
        deps.markExt(resetBtn);
        resetBtn.type = 'button';
        resetBtn.textContent = 'Reset edits';
        resetBtn.style.cssText = 'padding:0;border-radius:0;font-size:11px;font-weight:700;cursor:pointer;';
        resetBtn.style.setProperty('border', '0', 'important');
        resetBtn.style.setProperty('background', 'transparent', 'important');
        resetBtn.style.setProperty('background-color', 'transparent', 'important');
        resetBtn.style.setProperty('background-image', 'none', 'important');
        resetBtn.style.setProperty('box-shadow', 'none', 'important');
        resetBtn.style.setProperty('appearance', 'none', 'important');
        resetBtn.style.setProperty('-webkit-appearance', 'none', 'important');
        resetBtn.style.setProperty('color', isDark ? '#e5e7eb' : '#334155', 'important');
        resetBtn.addEventListener('click', function () {
            deps.saveStoredStudyplanExamTimelineOverrides({ edits: {}, deleted: {}, custom: [] });
            resetRenderedSig();
            requestRender();
        });
        head.appendChild(resetBtn);
        panel.appendChild(head);

        if (!opts.hideHeading) {
            var subtitle = document.createElement('div');
            deps.markExt(subtitle);
            subtitle.textContent = 'Adjust code, name, or date for existing entries, delete them from the timeline, or add your own custom exam dates.';
            subtitle.style.cssText = 'font-size:12px;line-height:1.45;opacity:0.78;margin-bottom:12px;max-width:760px;';
            panel.appendChild(subtitle);
        }

        var list = document.createElement('div');
        deps.markExt(list);
        list.style.cssText = 'display:flex;flex-direction:column;gap:12px;max-height:420px;overflow-y:auto;padding-right:6px;';
        panel.appendChild(list);

        function rerender() {
            resetRenderedSig();
            requestRender();
        }

        function buildField(labelText, value, type, placeholder) {
            var wrap = document.createElement('label');
            deps.markExt(wrap);
            wrap.style.cssText = 'display:flex;flex-direction:column;gap:5px;min-width:0;flex:1 1 180px;';
            var label = document.createElement('span');
            deps.markExt(label);
            label.textContent = labelText;
            label.style.cssText = 'font-size:11px;font-weight:700;opacity:0.74;letter-spacing:0.01em;';
            wrap.appendChild(label);
            var controlWrap = document.createElement('div');
            deps.markExt(controlWrap);
            controlWrap.style.cssText = 'position:relative;display:flex;align-items:center;min-width:0;';
            var input = document.createElement('input');
            deps.markExt(input);
            input.type = (type === 'date') ? 'text' : (type || 'text');
            input.value = (type === 'date') ? deps.formatStudyplanExamEditDate(value || '') : (value || '');
            if (placeholder) input.placeholder = placeholder;
            input.style.cssText = 'height:40px;padding:7px 12px;border-radius:8px;font-size:12px;font-weight:600;width:100%;min-width:0;';
            if (type === 'date') {
                input.style.paddingRight = '34px';
                input.inputMode = 'numeric';
                input.autocomplete = 'off';
            }
            input.style.setProperty('border', '1px solid ' + (isDark ? '#56606f' : '#c9d4e2'), 'important');
            input.style.setProperty('background', isDark ? '#1a1a1a' : '#ffffff', 'important');
            input.style.setProperty('background-color', isDark ? '#1a1a1a' : '#ffffff', 'important');
            input.style.setProperty('color', isDark ? '#f3f4f6' : '#111827', 'important');
            controlWrap.appendChild(input);

            if (type === 'date') {
                var pickerShell = document.createElement('div');
                deps.markExt(pickerShell);
                pickerShell.style.cssText = 'position:absolute;right:6px;top:50%;transform:translateY(-50%);width:18px;height:18px;display:flex;align-items:center;justify-content:center;color:' + (isDark ? '#cbd5e1' : '#64748b') + ';';

                var pickerIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                pickerIcon.setAttribute('viewBox', '0 0 24 24');
                pickerIcon.setAttribute('width', '15');
                pickerIcon.setAttribute('height', '15');
                pickerIcon.setAttribute('fill', 'none');
                var pickerPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                pickerPath.setAttribute('d', 'M7 2v2M17 2v2M3.5 9.5h17M6 5.5h12a2.5 2.5 0 0 1 2.5 2.5v10A2.5 2.5 0 0 1 18 20.5H6A2.5 2.5 0 0 1 3.5 18V8A2.5 2.5 0 0 1 6 5.5Z');
                pickerPath.setAttribute('stroke', 'currentColor');
                pickerPath.setAttribute('stroke-width', '1.8');
                pickerPath.setAttribute('stroke-linecap', 'round');
                pickerPath.setAttribute('stroke-linejoin', 'round');
                pickerIcon.appendChild(pickerPath);
                pickerShell.appendChild(pickerIcon);

                var pickerInput = document.createElement('input');
                deps.markExt(pickerInput);
                pickerInput.type = 'date';
                pickerInput.value = value || '';
                pickerInput.setAttribute('aria-label', labelText + ' picker');
                pickerInput.style.cssText = 'position:absolute;inset:0;opacity:0;cursor:pointer;margin:0;padding:0;border:0;';
                pickerInput.style.setProperty('background', 'transparent', 'important');
                pickerInput.style.setProperty('background-color', 'transparent', 'important');
                pickerInput.addEventListener('input', function () {
                    input.value = deps.formatStudyplanExamEditDate(pickerInput.value || '');
                });
                pickerInput.addEventListener('change', function () {
                    input.value = deps.formatStudyplanExamEditDate(pickerInput.value || '');
                });
                input.addEventListener('change', function () {
                    var parsedIso = deps.parseStudyplanExamEditDate(input.value || '');
                    if (parsedIso) pickerInput.value = parsedIso;
                });
                input.addEventListener('blur', function () {
                    var parsedIso = deps.parseStudyplanExamEditDate(input.value || '');
                    if (parsedIso) {
                        pickerInput.value = parsedIso;
                        input.value = deps.formatStudyplanExamEditDate(parsedIso);
                    }
                });
                pickerShell.appendChild(pickerInput);
                controlWrap.appendChild(pickerShell);
                wrap.appendChild(controlWrap);
                return { wrap: wrap, input: input, pickerInput: pickerInput };
            }

            wrap.appendChild(controlWrap);
            return { wrap: wrap, input: input };
        }

        function buildActionButton(text, kind) {
            var btn = document.createElement('button');
            deps.markExt(btn);
            btn.type = 'button';
            btn.textContent = text;
            btn.style.cssText = 'padding:0;border-radius:0;font-size:11px;font-weight:700;cursor:pointer;';
            var color = kind === 'danger'
                ? 'var(--dtu-ad-status-danger)'
                : (kind === 'positive'
                    ? 'var(--dtu-ad-status-success)'
                    : (isDark ? '#94a3b8' : '#475569'));
            btn.style.setProperty('border', '0', 'important');
            btn.style.setProperty('background', 'transparent', 'important');
            btn.style.setProperty('background-color', 'transparent', 'important');
            btn.style.setProperty('background-image', 'none', 'important');
            btn.style.setProperty('box-shadow', 'none', 'important');
            btn.style.setProperty('appearance', 'none', 'important');
            btn.style.setProperty('-webkit-appearance', 'none', 'important');
            btn.style.setProperty('color', color, 'important');
            btn.addEventListener('mouseenter', function () {
                try { btn.style.setProperty('text-decoration', 'underline', 'important'); } catch (eBtn1) { }
            });
            btn.addEventListener('mouseleave', function () {
                try { btn.style.setProperty('text-decoration', 'none', 'important'); } catch (eBtn2) { }
            });
            return btn;
        }

        function appendExistingRow(editorItem) {
            if (!editorItem || !editorItem.item) return;
            var item = editorItem.item;
            var baseKey = editorItem.baseKey || item.baseKey || deps.buildStudyplanExamTimelineBaseKey(item);
            var deleted = !!editorItem.deleted;
            var effectiveIso = editorItem.dateIso || item.dateIso;
            var effectiveTs = editorItem.dateTs || item.dateTs;

            var card = document.createElement('div');
            deps.markExt(card);
            card.style.cssText = 'padding:14px 0 16px 14px;border-radius:0;';
            card.style.setProperty('border', '0', 'important');
            card.style.setProperty('border-left', '4px solid ' + (deleted ? 'var(--dtu-ad-status-danger)' : 'var(--dtu-ad-accent)'), 'important');
            card.style.setProperty('border-bottom', '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(148,163,184,0.20)'), 'important');
            card.style.setProperty('background', 'transparent', 'important');
            card.style.setProperty('background-color', 'transparent', 'important');

            var meta = document.createElement('div');
            deps.markExt(meta);
            meta.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;';
            var metaLabel = document.createElement('div');
            deps.markExt(metaLabel);
            metaLabel.textContent = (editorItem.code || item.code || 'Course') + ' · ' + deps.formatExamClusterShortDate(effectiveTs);
            metaLabel.style.cssText = 'font-size:13px;font-weight:800;letter-spacing:-0.01em;';
            meta.appendChild(metaLabel);
            var metaState = document.createElement('span');
            deps.markExt(metaState);
            metaState.textContent = deleted ? 'Deleted' : 'Official';
            metaState.style.cssText = 'font-size:11px;font-weight:700;';
            metaState.style.setProperty('color', deleted ? 'var(--dtu-ad-status-danger)' : (isDark ? '#94a3b8' : '#64748b'), 'important');
            meta.appendChild(metaState);
            card.appendChild(meta);

            var fields = document.createElement('div');
            deps.markExt(fields);
            fields.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;';
            var codeField = buildField('Course code', editorItem.code || item.code, 'text');
            var nameField = buildField('Course name', editorItem.name || item.name, 'text');
            var dateField = buildField('Exam date', effectiveIso, 'date', 'DD/MM/YYYY');
            fields.appendChild(codeField.wrap);
            fields.appendChild(nameField.wrap);
            fields.appendChild(dateField.wrap);
            card.appendChild(fields);

            var actions = document.createElement('div');
            deps.markExt(actions);
            actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px;';
            if (deleted) {
                var restoreBtn = buildActionButton('Restore', 'positive');
                restoreBtn.addEventListener('click', function () {
                    var next = deps.getStoredStudyplanExamTimelineOverrides();
                    if (next.deleted) delete next.deleted[baseKey];
                    deps.saveStoredStudyplanExamTimelineOverrides(next);
                    rerender();
                });
                actions.appendChild(restoreBtn);
            } else {
                var saveBtn = buildActionButton('Save', 'positive');
                saveBtn.addEventListener('click', function () {
                    var next = deps.getStoredStudyplanExamTimelineOverrides();
                    var code = String(codeField.input.value || '').trim().toUpperCase();
                    var name = String(nameField.input.value || '').trim();
                    var dateIso = deps.parseStudyplanExamEditDate(dateField.input.value || '');
                    if (!dateIso) return;
                    var patch = {};
                    if (code !== String(item.code || '').trim().toUpperCase()) patch.code = code;
                    if (name !== String(item.name || '').trim()) patch.name = name;
                    if (dateIso !== String(item.dateIso || '').trim()) patch.dateIso = dateIso;
                    if (!next.edits || typeof next.edits !== 'object') next.edits = {};
                    if (Object.keys(patch).length) next.edits[baseKey] = patch;
                    else delete next.edits[baseKey];
                    if (next.deleted) delete next.deleted[baseKey];
                    deps.saveStoredStudyplanExamTimelineOverrides(next);
                    rerender();
                });
                actions.appendChild(saveBtn);

                var deleteBtn = buildActionButton('Delete', 'danger');
                deleteBtn.addEventListener('click', function () {
                    var next = deps.getStoredStudyplanExamTimelineOverrides();
                    if (!next.deleted || typeof next.deleted !== 'object') next.deleted = {};
                    next.deleted[baseKey] = true;
                    deps.saveStoredStudyplanExamTimelineOverrides(next);
                    rerender();
                });
                actions.appendChild(deleteBtn);
            }
            card.appendChild(actions);
            list.appendChild(card);
        }

        function appendCustomRow(entry) {
            var effectiveIso = entry && entry.dateIso ? entry.dateIso : '';
            var effectiveTs = effectiveIso ? deps.parseIsoToUtcTs(effectiveIso) : null;

            var card = document.createElement('div');
            deps.markExt(card);
            card.style.cssText = 'padding:14px 0 16px 14px;border-radius:0;';
            card.style.setProperty('border', '0', 'important');
            card.style.setProperty('border-left', '4px solid var(--dtu-ad-accent)', 'important');
            card.style.setProperty('border-bottom', '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(148,163,184,0.20)'), 'important');
            card.style.setProperty('background', 'transparent', 'important');
            card.style.setProperty('background-color', 'transparent', 'important');

            var meta = document.createElement('div');
            deps.markExt(meta);
            meta.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;';
            var label = document.createElement('div');
            deps.markExt(label);
            label.textContent = effectiveTs ? 'Custom · ' + deps.formatExamClusterShortDate(effectiveTs) : 'Add custom entry';
            label.style.cssText = 'font-size:13px;font-weight:800;letter-spacing:-0.01em;';
            meta.appendChild(label);
            var state = document.createElement('span');
            deps.markExt(state);
            state.textContent = entry && entry.id ? 'Custom' : 'New';
            state.style.cssText = 'font-size:11px;font-weight:700;';
            state.style.setProperty('color', isDark ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)', 'important');
            meta.appendChild(state);
            card.appendChild(meta);

            var fields = document.createElement('div');
            deps.markExt(fields);
            fields.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;';
            var codeField = buildField('Course code', entry && entry.code ? entry.code : '', 'text');
            var nameField = buildField('Course name', entry && entry.name ? entry.name : '', 'text');
            var dateField = buildField('Exam date', effectiveIso, 'date', 'DD/MM/YYYY');
            fields.appendChild(codeField.wrap);
            fields.appendChild(nameField.wrap);
            fields.appendChild(dateField.wrap);
            card.appendChild(fields);

            var actions = document.createElement('div');
            deps.markExt(actions);
            actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px;';
            var saveBtn = buildActionButton(entry && entry.id ? 'Save' : 'Add', 'positive');
            saveBtn.addEventListener('click', function () {
                var dateIso = deps.parseStudyplanExamEditDate(dateField.input.value || '');
                if (!dateIso) return;
                var next = deps.getStoredStudyplanExamTimelineOverrides();
                if (!Array.isArray(next.custom)) next.custom = [];
                var payload = {
                    id: entry && entry.id ? entry.id : deps.buildStudyplanExamTimelineCustomId(),
                    code: String(codeField.input.value || '').trim().toUpperCase(),
                    name: String(nameField.input.value || '').trim(),
                    dateIso: dateIso
                };
                var replaced = false;
                next.custom = next.custom.map(function (item) {
                    if (item && item.id === payload.id) {
                        replaced = true;
                        return payload;
                    }
                    return item;
                });
                if (!replaced) next.custom.push(payload);
                deps.saveStoredStudyplanExamTimelineOverrides(next);
                rerender();
            });
            actions.appendChild(saveBtn);

            if (entry && entry.id) {
                var deleteBtn = buildActionButton('Delete', 'danger');
                deleteBtn.addEventListener('click', function () {
                    var next = deps.getStoredStudyplanExamTimelineOverrides();
                    next.custom = Array.isArray(next.custom) ? next.custom.filter(function (item) {
                        return !item || item.id !== entry.id;
                    }) : [];
                    deps.saveStoredStudyplanExamTimelineOverrides(next);
                    rerender();
                });
                actions.appendChild(deleteBtn);
            }
            card.appendChild(actions);
            list.appendChild(card);
        }

        var editorItems = [];
        (baseMapped || []).forEach(function (item) {
            if (!item) return;
            var baseKey = item.baseKey || deps.buildStudyplanExamTimelineBaseKey(item);
            var edit = overrides.edits && overrides.edits[baseKey] ? overrides.edits[baseKey] : {};
            var effectiveIso = edit && edit.dateIso ? edit.dateIso : item.dateIso;
            var effectiveTs = deps.parseIsoToUtcTs(effectiveIso);
            editorItems.push({
                kind: 'official',
                item: item,
                baseKey: baseKey,
                deleted: !!(overrides.deleted && overrides.deleted[baseKey]),
                code: edit && edit.code !== undefined ? String(edit.code).trim().toUpperCase() : item.code,
                name: edit && edit.name !== undefined ? String(edit.name).trim() : item.name,
                dateIso: effectiveIso,
                dateTs: effectiveTs === null ? item.dateTs : effectiveTs
            });
        });
        (overrides.custom || []).forEach(function (entry) {
            if (!entry) return;
            editorItems.push({
                kind: 'custom',
                entry: entry,
                dateTs: deps.parseIsoToUtcTs(entry.dateIso || '') || Number.MAX_SAFE_INTEGER
            });
        });
        editorItems.sort(function (a, b) {
            if (a.dateTs !== b.dateTs) return a.dateTs - b.dateTs;
            var aCode = a.kind === 'official' ? String(a.code || '') : String(a.entry && a.entry.code || '');
            var bCode = b.kind === 'official' ? String(b.code || '') : String(b.entry && b.entry.code || '');
            return aCode.localeCompare(bCode);
        });

        if (!editorItems.length) {
            var empty = document.createElement('div');
            deps.markExt(empty);
            empty.textContent = 'No current timeline entries yet. Add a custom exam below.';
            empty.style.cssText = 'font-size:12px;opacity:0.76;padding:8px 0;';
            list.appendChild(empty);
        }

        editorItems.forEach(function (editorItem) {
            if (editorItem.kind === 'official') appendExistingRow(editorItem);
            else appendCustomRow(editorItem.entry);
        });
        appendCustomRow(null);

        body.appendChild(panel);
    }

    function renderStudyplanExamClusterControls(container, allChoicePrompts, isDark) {
        if (!container) return;
        var titleRow = container.querySelector('[data-dtu-exam-cluster-title]');
        if (!titleRow) return;
        var titleMeta = titleRow.querySelector('[data-dtu-exam-cluster-title-meta]') || titleRow;

        var control = titleMeta.querySelector('[data-dtu-exam-cluster-edit]');
        if (!control) {
            control = document.createElement('button');
            deps.markExt(control);
            control.type = 'button';
            control.setAttribute('data-dtu-exam-cluster-edit', '1');
            control.setAttribute('aria-label', 'Edit exam choices');
            control.style.cssText = 'width:34px;height:34px;padding:0;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;';
            var gearSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            gearSvg.setAttribute('viewBox', '0 0 24 24');
            gearSvg.setAttribute('width', '16');
            gearSvg.setAttribute('height', '16');
            gearSvg.setAttribute('fill', 'none');
            var gearPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            gearPath.setAttribute('d', 'M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.9 7.9 0 0 0-1.69-.98L14.5 2.42A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.5.42l-.37 2.65c-.61.24-1.18.57-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.13.22.39.31.61.22l2.49-1c.51.41 1.08.74 1.69.98l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.61-.24 1.18-.57 1.69-.98l2.49 1c.22.09.48 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z');
            gearPath.setAttribute('data-dtu-gear-shell', '1');
            gearPath.setAttribute('fill-rule', 'evenodd');
            gearPath.setAttribute('clip-rule', 'evenodd');
            gearPath.setAttribute('fill', 'currentColor');
            gearSvg.appendChild(gearPath);
            control.appendChild(gearSvg);
            control.addEventListener('click', function () {
                var state = getState();
                setState({ choiceEditorOpen: !state.choiceEditorOpen });
                if (state.choiceEditorOpen) removeStudyplanExamEditorModal();
                resetRenderedSig();
                requestRender();
            });
            titleMeta.appendChild(control);
        }
        control.style.display = 'inline-flex';
        control.style.setProperty('order', '2', 'important');

        var choiceEditorOpen = !!getState().choiceEditorOpen;
        control.style.setProperty('border', '1px solid ' + (choiceEditorOpen
            ? 'var(--dtu-ad-accent)'
            : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(148,163,184,0.28)')), 'important');
        control.style.setProperty('background', choiceEditorOpen
            ? (isDark ? 'rgba(var(--dtu-ad-accent-rgb),0.12)' : 'rgba(var(--dtu-ad-accent-rgb),0.10)')
            : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(248,250,252,0.92)'), 'important');
        control.style.setProperty('background-color', choiceEditorOpen
            ? (isDark ? 'rgba(var(--dtu-ad-accent-rgb),0.12)' : 'rgba(var(--dtu-ad-accent-rgb),0.10)')
            : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(248,250,252,0.92)'), 'important');
        var gearColor = isDark ? '#ffffff' : '#1f2937';
        control.style.setProperty('color', gearColor, 'important');
        try {
            var gearShellEl = control.querySelector('[data-dtu-gear-shell]');
            if (gearShellEl) {
                gearShellEl.setAttribute('fill', gearColor);
                gearShellEl.style.setProperty('fill', gearColor, 'important');
            }
        } catch (eGear) { }
        control.title = choiceEditorOpen
            ? 'Close exam choice editor'
            : 'Open exam choice editor';
    }

    function renderStudyplanExamCluster(courses, mapped, baseMapped, response, errorText, choicePrompts, allChoicePrompts) {
        var container = deps.ensureStudyplanExamClusterContainer();
        var body = container.querySelector('[data-dtu-exam-cluster-body]');
        if (!body) return;
        body.style.removeProperty('max-height');
        body.style.removeProperty('overflow-y');
        body.style.removeProperty('padding-right');

        if (errorText) {
            removeStudyplanExamEditorModal();
            setState({ choiceEditorOpen: false });
            deps.renderExamClusterStatus(body, errorText, true);
            return;
        }
        if (!courses.length) {
            removeStudyplanExamEditorModal();
            setState({ choiceEditorOpen: false });
            deps.renderExamClusterStatus(body, 'No upcoming courses with exam placement found in Study Planner.', false);
            return;
        }

        deps.clearNodeChildren(body);
        var isDark = !!deps.isDarkMode();
        var muted = isDark ? '#bfc5ce' : '#5f6b79';
        var softBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(148,163,184,0.18)';
        var softBg = isDark ? '#1a1a1a' : '#f7f9fc';
        var railBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
        var safeClr = 'var(--dtu-ad-status-success)';
        var cautionClr = isDark ? 'var(--dtu-ad-status-warning)' : 'var(--dtu-ad-status-warning-strong)';
        var dangerClr = 'var(--dtu-ad-status-danger)';
        var infoClr = 'var(--dtu-ad-status-info)';

        renderStudyplanExamClusterControls(container, allChoicePrompts, isDark);

        if (getState().choiceEditorOpen) {
            showStudyplanExamEditorModal(baseMapped || [], allChoicePrompts || [], isDark);
        } else {
            removeStudyplanExamEditorModal();
        }

        if (!getState().choiceEditorOpen) {
            renderStudyplanExamChoicePrompts(body, choicePrompts, isDark);
        }

        if (!mapped.length) {
            var emptyState = document.createElement('div');
            deps.markExt(emptyState);
            emptyState.textContent = choicePrompts && choicePrompts.some(function (choice) { return choice && choice.required; })
                ? 'Choose the applicable exam date above to place those courses in the timeline.'
                : 'No matching exam dates found for current planned courses.';
            emptyState.style.cssText = 'font-size: 12px; color: '
                + (isDark ? 'var(--dtu-ad-status-warning)' : 'var(--dtu-ad-status-warning-strong)') + ';';
            body.appendChild(emptyState);
            body.setAttribute('data-dtu-exam-cluster-state', 'warn');
            return;
        }

        var upcoming = mapped.filter(function (m) { return m.daysUntil >= 0; });
        var nextItem = upcoming.length ? upcoming[0] : mapped[0];
        var timelineWindowDays = mapped.length > 1
            ? Math.max(0, Math.round((mapped[mapped.length - 1].dateTs - mapped[0].dateTs) / 86400000))
            : 0;
        var tightestGap = null;
        mapped.forEach(function (m) {
            if (typeof m.gapFromPrev !== 'number') return;
            if (tightestGap === null || m.gapFromPrev < tightestGap) tightestGap = m.gapFromPrev;
        });

        function classifyGap(days) {
            if (typeof days !== 'number') return { level: 'none', color: muted };
            if (days < 3) return { level: 'danger', color: dangerClr };
            if (days <= 7) return { level: 'caution', color: cautionClr };
            return { level: 'safe', color: safeClr };
        }

        function computeGapHeight(days) {
            if (typeof days !== 'number') return 20;
            var d = Math.max(0, days);
            var h = 14 + (d * 3.6);
            if (h < 24) h = 24;
            if (h > 96) h = 96;
            return Math.round(h);
        }

        var summaryBar = document.createElement('div');
        deps.markExt(summaryBar);
        summaryBar.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;padding:12px 14px;border-radius:8px;';
        summaryBar.style.setProperty('background', isDark ? 'rgba(255,255,255,0.03)' : 'rgba(247,249,252,0.95)', 'important');
        summaryBar.style.setProperty('background-color', isDark ? 'rgba(255,255,255,0.03)' : 'rgba(247,249,252,0.95)', 'important');

        function appendSummaryMetric(labelText, valueText, valueColor) {
            var metric = document.createElement('div');
            deps.markExt(metric);
            metric.style.cssText = 'display:flex;flex-direction:column;gap:2px;min-width:0;';

            var metricLabel = document.createElement('div');
            deps.markExt(metricLabel);
            metricLabel.textContent = labelText;
            metricLabel.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:' + muted + ';';
            metric.appendChild(metricLabel);

            var metricValue = document.createElement('div');
            deps.markExt(metricValue);
            metricValue.textContent = valueText;
            metricValue.style.cssText = 'font-size:16px;font-weight:800;letter-spacing:-0.02em;';
            if (valueColor) metricValue.style.setProperty('color', valueColor, 'important');
            metric.appendChild(metricValue);

            summaryBar.appendChild(metric);
        }

        appendSummaryMetric('Mapped exams', String(mapped.length), isDark ? '#f3f4f6' : '#111827');
        appendSummaryMetric('Next exam', nextItem.daysUntil === 0 ? 'Today' : (nextItem.daysUntil + 'd'), 'var(--dtu-ad-accent)');
        appendSummaryMetric('Timeline window', timelineWindowDays ? (timelineWindowDays + 'd') : 'Single exam', isDark ? '#f3f4f6' : '#111827');
        body.appendChild(summaryBar);

        var warnings = deps.buildExamClusterWarnings(mapped);
        if (warnings.length) {
            var riskSummary = deps.summarizeExamClusterWarnings(warnings);
            var riskBox = document.createElement('div');
            deps.markExt(riskBox);
            var riskBorder = riskSummary.level === 'critical'
                ? dangerClr
                : (riskSummary.level === 'high' ? cautionClr : infoClr);
            var riskBg = riskSummary.level === 'critical'
                ? (isDark ? 'rgba(var(--dtu-ad-status-danger-rgb),0.14)' : 'rgba(var(--dtu-ad-status-danger-rgb),0.10)')
                : (riskSummary.level === 'high'
                    ? (isDark ? 'rgba(var(--dtu-ad-status-warning-rgb),0.14)' : 'rgba(var(--dtu-ad-status-warning-strong-rgb),0.10)')
                    : (isDark ? 'rgba(var(--dtu-ad-status-info-rgb),0.12)' : 'rgba(var(--dtu-ad-status-info-rgb),0.08)'));
            riskBox.style.cssText = 'margin-bottom:4px; padding:10px 12px 10px 14px; border-radius:8px; border:0; background:' + riskBg + ';';
            riskBox.style.setProperty('border-left', '4px solid ' + riskBorder, 'important');

            var riskTitle = document.createElement('div');
            deps.markExt(riskTitle);
            riskTitle.style.cssText = 'font-size:11px; font-weight:700; margin-bottom:3px; '
                + 'color:' + (isDark ? '#f2f2f2' : '#1f2937') + ';';
            riskTitle.textContent = riskSummary.level === 'critical' ? 'Risk summary: High'
                : (riskSummary.level === 'high' ? 'Risk summary: Elevated' : 'Risk summary');
            riskBox.appendChild(riskTitle);

            var details = [];
            if (riskSummary.sameDay > 0) details.push(riskSummary.sameDay + ' same-day clash' + (riskSummary.sameDay > 1 ? 'es' : ''));
            if (riskSummary.oneDay > 0) details.push(riskSummary.oneDay + ' one-day gap');
            if (riskSummary.dense) {
                var denseText = String(riskSummary.dense).replace(/^.*?:\s*/, '');
                details.push(denseText);
            }
            if (!details.length) details.push('Tight exam clustering detected');

            var riskText = document.createElement('div');
            deps.markExt(riskText);
            riskText.style.cssText = 'font-size:11px; color:' + (isDark ? '#d9d9d9' : '#374151') + ';';
            riskText.textContent = details.join(' · ');
            riskBox.appendChild(riskText);

            body.appendChild(riskBox);
        }

        var timeline = document.createElement('div');
        deps.markExt(timeline);
        timeline.setAttribute('data-dtu-exam-timeline', '1');
        timeline.style.cssText = 'position:relative;display:flex;flex-direction:column;gap:4px;';
        try {
            var maxH = Math.max(280, Math.min(470, Math.floor(window.innerHeight * 0.47)));
            timeline.style.setProperty('max-height', maxH + 'px', 'important');
        } catch (eH) {
            timeline.style.setProperty('max-height', '400px', 'important');
        }
        timeline.style.setProperty('overflow-y', 'auto', 'important');
        timeline.style.setProperty('padding-right', '6px', 'important');

        if (tightestGap !== null) {
            var titleRow = container.querySelector('[data-dtu-exam-cluster-title]');
            if (titleRow) {
                var titleMeta = titleRow.querySelector('[data-dtu-exam-cluster-title-meta]') || titleRow;
                var oldSummary = titleMeta.querySelector('[data-dtu-exam-tightest]');
                if (oldSummary) oldSummary.remove();

                var tgMeta = classifyGap(tightestGap);
                var tgSummary = document.createElement('span');
                deps.markExt(tgSummary);
                tgSummary.setAttribute('data-dtu-exam-tightest', '1');
                tgSummary.textContent = 'Tightest gap ' + tightestGap + 'd';
                tgSummary.style.cssText = 'display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;flex-shrink:0;';
                tgSummary.style.setProperty('order', '1', 'important');
                tgSummary.style.setProperty('padding-left', '10px', 'important');
                tgSummary.style.setProperty('margin-right', '4px', 'important');
                tgSummary.style.setProperty('color', tgMeta.color, 'important');
                tgSummary.style.setProperty('border-left', '3px solid ' + tgMeta.color, 'important');
                titleMeta.appendChild(tgSummary);
            }
        }

        body.appendChild(timeline);

        function buildGapBlock(gapDays) {
            var meta = classifyGap(gapDays);
            var h = computeGapHeight(gapDays);

            var row = document.createElement('div');
            deps.markExt(row);
            row.style.cssText = 'position:relative;z-index:2;display:flex;align-items:center;'
                + 'height:' + h + 'px;min-height:' + h + 'px;padding:2px 0;margin:0;';

            var railCol = document.createElement('div');
            deps.markExt(railCol);
            railCol.style.cssText = 'width:22px;flex:0 0 22px;position:relative;display:flex;justify-content:center;align-self:stretch;';
            var seg = document.createElement('div');
            deps.markExt(seg);
            seg.setAttribute('aria-hidden', 'true');
            seg.style.cssText = 'position:absolute;left:9px;top:0;bottom:0;width:4px;border-radius:999px;';
            seg.style.setProperty('background', meta.color, 'important');
            seg.style.setProperty('background-color', meta.color, 'important');
            railCol.appendChild(seg);
            row.appendChild(railCol);

            var label = document.createElement('div');
            deps.markExt(label);
            var txt = (gapDays === 0) ? 'Same day' : (gapDays + 'd gap');
            label.textContent = txt;
            label.style.cssText = 'margin-left:4px;padding-left:10px;font-size:11px;font-weight:700;'
                + 'white-space:nowrap;line-height:1.4;z-index:3;';
            label.style.setProperty('color', meta.color, 'important');
            row.appendChild(label);

            return row;
        }

        function buildExamCard(item, idx, accentColor, gapRisk) {
            var isHero = (idx === 0);
            var borderAccent = isHero ? 'var(--dtu-ad-accent)' : accentColor;
            var riskLevel = gapRisk ? gapRisk.level : 'none';

            var row = document.createElement('div');
            deps.markExt(row);
            row.style.cssText = 'position:relative;z-index:1;display:flex;gap:14px;align-items:stretch;';

            var rail = document.createElement('div');
            deps.markExt(rail);
            rail.style.cssText = 'width:22px;flex:0 0 22px;position:relative;display:flex;justify-content:center;';

            var connector = document.createElement('div');
            deps.markExt(connector);
            connector.setAttribute('aria-hidden', 'true');
            connector.style.cssText = 'position:absolute;left:9px;top:0;bottom:0;width:4px;border-radius:999px;z-index:0;';
            connector.style.setProperty('background', railBg, 'important');
            connector.style.setProperty('background-color', railBg, 'important');
            rail.appendChild(connector);

            var nodeWrap = document.createElement('div');
            deps.markExt(nodeWrap);
            nodeWrap.style.cssText = 'position:relative;z-index:1;margin-top:12px;';

            var node = document.createElement('div');
            deps.markExt(node);
            node.setAttribute('aria-hidden', 'true');
            var nodeSize = isHero ? 14 : 10;
            node.style.cssText = 'width:' + nodeSize + 'px;height:' + nodeSize + 'px;border-radius:999px;box-sizing:border-box;';
            node.style.setProperty('background', isDark ? '#1a1a1a' : '#ffffff', 'important');
            node.style.setProperty('background-color', isDark ? '#1a1a1a' : '#ffffff', 'important');
            node.style.setProperty('border', (isHero ? '3px' : '2.5px') + ' solid ' + borderAccent, 'important');
            node.style.setProperty('box-shadow', isDark ? '0 0 0 2px #2d2d2d' : '0 0 0 2px #ffffff', 'important');

            nodeWrap.appendChild(node);
            rail.appendChild(nodeWrap);

            var card = document.createElement('div');
            deps.markExt(card);
            card.style.cssText = 'flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:12px;'
                + 'padding:' + (isHero ? '14px 16px' : '10px 12px') + ';border-radius:' + (isHero ? '10px' : '8px') + ';';

            var cardBg = softBg;
            var cardBorder = softBorder;
            if (riskLevel === 'danger') {
                cardBg = isDark ? 'rgba(var(--dtu-ad-status-danger-rgb),0.10)' : 'rgba(var(--dtu-ad-status-danger-rgb),0.06)';
                cardBorder = isDark ? 'rgba(var(--dtu-ad-status-danger-rgb),0.35)' : 'rgba(var(--dtu-ad-status-danger-rgb),0.25)';
            } else if (riskLevel === 'caution' && !isHero) {
                cardBg = isDark ? 'rgba(var(--dtu-ad-status-warning-rgb),0.08)' : 'rgba(var(--dtu-ad-status-warning-strong-rgb),0.05)';
                cardBorder = isDark ? 'rgba(var(--dtu-ad-status-warning-rgb),0.24)' : 'rgba(var(--dtu-ad-status-warning-strong-rgb),0.20)';
            }
            card.style.setProperty('background', cardBg, 'important');
            card.style.setProperty('background-color', cardBg, 'important');
            card.style.setProperty('border', '1px solid ' + cardBorder, 'important');
            card.style.setProperty('border-left', (isHero ? '5px' : '4px') + ' solid ' + borderAccent, 'important');
            card.style.setProperty('color', isDark ? '#e0e0e0' : '#1f2937', 'important');

            var left = document.createElement('div');
            deps.markExt(left);
            left.style.cssText = 'min-width:0;flex:1;display:flex;flex-direction:column;gap:3px;';

            if (isHero) {
                var heroBadge = document.createElement('span');
                deps.markExt(heroBadge);
                heroBadge.textContent = 'Next exam';
                heroBadge.style.cssText = 'display:inline-block;font-size:10px;font-weight:800;'
                    + 'text-transform:uppercase;letter-spacing:0.08em;margin-bottom:1px;width:fit-content;';
                heroBadge.style.setProperty('background', 'transparent', 'important');
                heroBadge.style.setProperty('background-color', 'transparent', 'important');
                heroBadge.style.setProperty('color', 'var(--dtu-ad-accent)', 'important');
                left.appendChild(heroBadge);
            }

            var code = document.createElement('div');
            deps.markExt(code);
            code.textContent = item.code;
            code.style.cssText = 'font-weight:800;font-size:' + (isHero ? '16px' : '13px') + ';letter-spacing:-0.01em;';
            left.appendChild(code);

            var name = document.createElement('div');
            deps.markExt(name);
            name.textContent = item.name || '';
            name.style.cssText = 'font-size:' + (isHero ? '13px' : '12px') + ';line-height:1.35;opacity:0.88;white-space:normal;overflow:hidden;text-overflow:ellipsis;';
            name.style.setProperty('background-color', 'transparent', 'important');
            name.style.setProperty('background', 'transparent', 'important');
            left.appendChild(name);

            if (item.examChoiceCount > 1 && item.examText) {
                var slotMeta = document.createElement('div');
                deps.markExt(slotMeta);
                slotMeta.textContent = item.examText;
                slotMeta.style.cssText = 'font-size:10px;opacity:0.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;';
                slotMeta.style.setProperty('background-color', 'transparent', 'important');
                slotMeta.style.setProperty('background', 'transparent', 'important');
                left.appendChild(slotMeta);
            }

            var right = document.createElement('div');
            deps.markExt(right);
            right.style.cssText = 'text-align:right;flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;gap:2px;min-width:' + (isHero ? '92px' : '74px') + ';';

            if (isHero && nextItem) {
                var countdown = document.createElement('div');
                deps.markExt(countdown);
                var cdText = nextItem.daysUntil === 0 ? 'Today' : (nextItem.daysUntil + 'd');
                countdown.textContent = cdText;
                countdown.style.cssText = 'font-weight:800;font-size:22px;line-height:1;';
                countdown.style.setProperty('color', 'var(--dtu-ad-accent)', 'important');
                right.appendChild(countdown);

                var countdownLabel = document.createElement('div');
                deps.markExt(countdownLabel);
                countdownLabel.textContent = 'until exam';
                countdownLabel.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:' + muted + ';';
                right.appendChild(countdownLabel);
            }

            var date = document.createElement('div');
            deps.markExt(date);
            date.textContent = deps.formatExamClusterShortDate(item.dateTs);
            date.style.cssText = 'font-weight:700;font-size:' + (isHero ? '12px' : '11px') + ';color:' + muted + ';';
            right.appendChild(date);

            card.appendChild(left);
            card.appendChild(right);

            row.appendChild(rail);
            row.appendChild(card);
            return row;
        }

        var maxItems = 8;
        var timelineItems = mapped.slice(0, maxItems);
        timelineItems.forEach(function (item, idx) {
            var gapRisk = null;
            if (idx > 0 && typeof item.gapFromPrev === 'number') {
                timeline.appendChild(buildGapBlock(item.gapFromPrev));
                gapRisk = classifyGap(item.gapFromPrev);
            }

            var accent = muted;
            if (gapRisk) accent = gapRisk.color;
            timeline.appendChild(buildExamCard(item, idx, accent, gapRisk));
        });

        if (mapped.length > maxItems) {
            var more = document.createElement('div');
            deps.markExt(more);
            more.textContent = 'Showing next ' + maxItems + ' of ' + mapped.length + ' exams';
            more.style.cssText = 'margin-top:2px;font-size:10px;text-align:right;color:' + (isDark ? '#9aa1aa' : '#6b7280') + ';';
            body.appendChild(more);
        }

        var disclaimer = document.createElement('div');
        deps.markExt(disclaimer);
        disclaimer.style.cssText = 'margin-top:8px; text-align:right; font-size:10px; '
            + 'color:' + (isDark ? '#9aa1aa' : '#6b7280') + ';';
        disclaimer.textContent = 'Please double-check dates in the official DTU exam schedule.';
        body.appendChild(disclaimer);
    }

    var GRADE_COUNTDOWN_ATTR = 'data-dtu-grade-countdown';

    function addWorkdays(startTs, numDays) {
        var d = new Date(startTs);
        var added = 0;
        while (added < numDays) {
            d.setDate(d.getDate() + 1);
            var dow = d.getDay();
            if (dow !== 0 && dow !== 6) added++;
        }
        return d.getTime();
    }

    function formatGradeDate(ts) {
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var d = new Date(ts);
        return d.getDate() + ' ' + months[d.getMonth()];
    }

    function injectGradeCountdowns(mapped) {
        document.querySelectorAll('[' + GRADE_COUNTDOWN_ATTR + ']').forEach(function (el) { el.remove(); });

        if (!mapped || !mapped.length) return;

        var now = Date.now();
        var isDark = !!deps.isDarkMode();

        var codeLinks = document.querySelectorAll('a.coursecode');
        var codeLinkMap = {};
        codeLinks.forEach(function (a) {
            var code = (a.textContent || '').trim();
            if (code) codeLinkMap[code] = a;
        });

        mapped.forEach(function (m) {
            if (!m.dateTs || !m.code) return;

            var examEndTs = m.dateTs + (17 * 60 * 60 * 1000);
            if (now < examEndTs) return;

            var gradeByTs = addWorkdays(m.dateTs, 20);
            var gradeDate = formatGradeDate(gradeByTs);
            var daysLeft = Math.ceil((gradeByTs - now) / (1000 * 60 * 60 * 24));

            var link = codeLinkMap[m.code];
            if (!link) return;

            var nameSpan = link.nextElementSibling;
            if (!nameSpan) nameSpan = link.parentElement;
            if (!nameSpan || !nameSpan.parentElement) return;

            var badge = document.createElement('span');
            deps.markExt(badge);
            badge.setAttribute(GRADE_COUNTDOWN_ATTR, '1');

            var isOverdue = daysLeft < 0;
            var isSoon = daysLeft >= 0 && daysLeft <= 3;
            var badgeColor, badgeBg;

            if (isOverdue) {
                var overdueDays = Math.abs(daysLeft);
                badgeColor = isDark ? '#ff8a80' : '#c62828';
                badgeBg = isDark ? 'rgba(255,138,128,0.12)' : 'rgba(198,40,40,0.08)';
                badge.textContent = 'Grade ' + overdueDays + 'd overdue';
                badge.title = 'Grade was due by ' + gradeDate + ' per DTU rules (20 workdays after exam). Now ' + overdueDays + ' day' + (overdueDays !== 1 ? 's' : '') + ' past the deadline.';
            } else if (isSoon) {
                badgeColor = isDark ? '#ffd380' : '#e65100';
                badgeBg = isDark ? 'rgba(255,211,128,0.12)' : 'rgba(230,81,0,0.08)';
                badge.textContent = 'Grade ~' + daysLeft + 'd';
                badge.title = 'Grade expected by ' + gradeDate + ' (' + daysLeft + ' workday' + (daysLeft !== 1 ? 's' : '') + ' left)';
            } else {
                badgeColor = isDark ? '#81c784' : '#2e7d32';
                badgeBg = isDark ? 'rgba(129,199,132,0.12)' : 'rgba(46,125,50,0.08)';
                badge.textContent = 'Grade by ' + gradeDate;
                badge.title = 'Grade expected within 20 workdays after exam (' + daysLeft + ' days left)';
            }

            badge.style.cssText = 'display: inline-block; margin-left: 6px; padding: 1px 6px; '
                + 'border-radius: 4px; font-size: 10px; font-weight: 600; white-space: nowrap; '
                + 'vertical-align: middle; '
                + 'color: ' + badgeColor + '; background: ' + badgeBg + ';';

            nameSpan.parentElement.insertBefore(badge, nameSpan.nextSibling);
        });
    }

    globalThis.DTUAfterDarkStudyplanExamsUi = {
        removeStudyplanExamEditorModal: removeStudyplanExamEditorModal,
        renderStudyplanExamCluster: renderStudyplanExamCluster,
        injectGradeCountdowns: injectGradeCountdowns
    };
})();
