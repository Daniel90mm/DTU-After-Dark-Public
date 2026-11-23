(() => {
    const deps = globalThis.DTUAfterDarkDarkEngineDeps || {};
    const pageCases = globalThis.DTUAfterDarkDarkEnginePageCases;
    if (!pageCases) throw new Error('darkmode.dark-engine.js loaded before darkmode.dark-engine.page-cases.js');

    function isDarkModeEnabled() {
        return !!(deps.isDarkModeEnabled && deps.isDarkModeEnabled());
    }

    function isLegacyHeavyPage() {
        return !!(deps.isLegacyHeavyPage && deps.isLegacyHeavyPage());
    }

    function getResolvedAccent() {
        return (deps.getResolvedAccent && deps.getResolvedAccent()) || '#990000';
    }

    function getResolvedAccentDeep() {
        return (deps.getResolvedAccentDeep && deps.getResolvedAccentDeep()) || '#7d0000';
    }

    function getContrastTextForHex(hex, light, dark) {
        if (deps.getContrastTextForHex) return deps.getContrastTextForHex(hex, light, dark);
        return light || '#ffffff';
    }

    function preserveTypeboxColors(root) {
        if (deps.preserveTypeboxColors) return deps.preserveTypeboxColors(root);
    }

    function replaceLogoImage(root) {
        if (deps.replaceLogoImage) return deps.replaceLogoImage(root);
    }

    function styleQuizSubmissionHistogram(root) {
        if (deps.styleQuizSubmissionHistogram) return deps.styleQuizSubmissionHistogram(root);
    }

    function seedSmartRoomLinkerShadowRoot(root) {
        if (deps.seedSmartRoomLinkerShadowRoot) return deps.seedSmartRoomLinkerShadowRoot(root);
    }

    function scheduleSmartRoomLinkerScan(root, delayMs) {
        if (deps.scheduleSmartRoomLinkerScan) return deps.scheduleSmartRoomLinkerScan(root, delayMs);
    }

    function invalidateDeepRoots() {
        if (typeof deps.invalidateDeepRoots !== 'function') {
            throw new Error('darkmode.dark-engine.js needs deps.invalidateDeepRoots');
        }
        deps.invalidateDeepRoots();
    }

    function insertContentButtons(root) {
        if (deps.insertContentButtons) return deps.insertContentButtons(root);
    }

    function forceDTULearnAccentInRoot(root) {
        if (deps.forceDTULearnAccentInRoot) return deps.forceDTULearnAccentInRoot(root);
    }

    function isDTULearnQuizSubmissionsPage() {
        return !!(deps.isDTULearnQuizSubmissionsPage && deps.isDTULearnQuizSubmissionsPage());
    }

    function forceDtuRedBackgroundDark2(el) {
        if (deps.forceDtuRedBackgroundDark2) return deps.forceDtuRedBackgroundDark2(el);
        if (!el || !el.style) return;
        var color = 'var(--dtu-ad-accent-deep, ' + getResolvedAccentDeep() + ')';
        el.style.setProperty('background', color, 'important');
        el.style.setProperty('background-color', color, 'important');
        el.style.setProperty('background-image', 'none', 'important');
        el.style.setProperty('border-color', color, 'important');
    }

    const styles = globalThis.DTUAfterDarkDarkEngineStyles;
    if (!styles) throw new Error('darkmode.dark-engine.js loaded before darkmode.dark-engine.styles.js');
    const requiredStyleNames = [
        'DARK_BG',
        'DARK_TEXT',
        'DARK_BORDER',
        'shadowDOMStyles',
        'buttonIconShadowStyles',
        'iframeStyles',
        'iconShadowStyles',
        'enrollmentCardShadowStyles',
        'myCoursesEnrollmentCardShadowStyles',
        'cardShadowStyles',
        'breadcrumbShadowStyles',
        'expandCollapseStyles',
        'lessonsTocExpandCollapseStyles',
        'htmlEditorShadowStyles',
        'menuStyles',
        'buttonSubtleStyles',
        'listItemNavStyles',
        'w2dListStyles',
        'htmlBlockStyles',
    ];
    const missingStyleName = requiredStyleNames.find(function (name) {
        return typeof styles[name] !== 'string';
    });
    if (missingStyleName) throw new Error('darkmode.dark-engine.styles.js is missing ' + missingStyleName);
    const {
        DARK_BG,
        DARK_TEXT,
        DARK_BORDER,
        shadowDOMStyles,
        buttonIconShadowStyles,
        iframeStyles,
        iconShadowStyles,
        enrollmentCardShadowStyles,
        myCoursesEnrollmentCardShadowStyles,
        cardShadowStyles,
        breadcrumbShadowStyles,
        expandCollapseStyles,
        lessonsTocExpandCollapseStyles,
        htmlEditorShadowStyles,
        menuStyles,
        buttonSubtleStyles,
        listItemNavStyles,
        w2dListStyles,
        htmlBlockStyles,
    } = styles;

    function markAuthoredLightTableCells(root, cellSelector) {
        if (!root || !root.querySelectorAll) return;
        var ownerDocument = root.ownerDocument || (root.nodeType === 9 ? root : null);
        var view = ownerDocument && ownerDocument.defaultView;
        if (!view || typeof view.getComputedStyle !== 'function') return;
        var cells;
        try {
            var selector = cellSelector || '.d2l-html-block-rendered td, .d2l-html-block-rendered th';
            cells = Array.from(root.querySelectorAll(selector));
            if (root.matches && root.matches(selector)) cells.unshift(root);
        } catch (e0) {
            return;
        }
        // All style reads first, then all attribute writes: a write between reads
        // would make the browser recompute styles for every cell.
        var decisions = cells.map(function (cell) {
            var match;
            try {
                match = view.getComputedStyle(cell).backgroundColor.match(/^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)(?:\D+([\d.]+))?/i);
            } catch (e1) {
                return;
            }
            if (!match) return null;
            var alpha = match[4] == null ? 1 : Number(match[4]);
            var channels = [Number(match[1]), Number(match[2]), Number(match[3])].map(function (value) {
                var channel = value / 255;
                return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
            });
            var luminance = (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
            return alpha >= 0.5 && luminance > 0.18;
        });
        cells.forEach(function (cell, i) {
            var shouldUseDarkText = decisions[i];
            if (shouldUseDarkText == null) return;
            if (shouldUseDarkText && !cell.hasAttribute('data-dtu-authored-light-bg')) {
                cell.setAttribute('data-dtu-authored-light-bg', '');
            } else if (!shouldUseDarkText && cell.hasAttribute('data-dtu-authored-light-bg')) {
                cell.removeAttribute('data-dtu-authored-light-bg');
            }
        });
    }

    const EXCLUDED_ELEMENTS = [
        'd2l-image-banner-overlay',
        'd2l-image-banner',
        'team-widget',
        'd2l-organization-image',
        'd2l-course-image',
        'd2l-pdf-viewer',
        'd2l-pdf-viewer-toolbar',
        'd2l-pdf-viewer-progress-bar',
        'd2l-labs-media-player',
        'd2l-labs-slider-bar'
    ];

    // tagName is already upper case, so matching against an upper-case Set skips
    // both the per-call toLowerCase allocation and a linear scan of the list.
    // This runs on every element of every pass.
    const EXCLUDED_ELEMENT_TAGS = new Set(EXCLUDED_ELEMENTS.map(function (tag) {
        return tag.toUpperCase();
    }));

    // Memoizing this per element was tried and measured slower: the styling passes
    // ask about mostly distinct elements, so the WeakMap was pure overhead. The
    // ancestor walk above is the opposite case and does cache.
    function shouldExcludeElement(element) {
        if (!element || !element.tagName) return false;
        if (EXCLUDED_ELEMENT_TAGS.has(element.tagName)) return true;
        if (element.classList) {
            if (element.classList.contains('team-widget-container')
                || element.classList.contains('d2l-image-banner-overlay')
                || element.classList.contains('bg-white')
                || element.classList.contains('pdfViewer')
                || element.classList.contains('page')
                || element.classList.contains('canvasWrapper')
                || element.classList.contains('textLayer')
                || element.classList.contains('annotationLayer')
                || element.classList.contains('annotationEditorLayer')) {
                return true;
            }
        }
        if (element.id) {
            if (element.id.includes('banner')
                || element.id.includes('team')
                || element.id.includes('overlayContent')
                || element.id === 'viewer'
                || element.id.includes('pdfViewer')
                || element.id === 'player'
                || element.id.includes('d2l-labs-media-player')) {
                return true;
            }
        }
        if (element.hasAttribute && element.hasAttribute('data-page-number')) return true;
        return false;
    }

    function injectStylesIntoShadowRoot(shadowRoot, element) {
        if (!shadowRoot) return;
        if (shouldExcludeElement(element)) return;

        let styleId = 'dark-mode-shadow-styles';
        let styleText = shadowDOMStyles;

        if (element && element.tagName) {
            const tagName = element.tagName.toLowerCase();
            if (tagName === 'd2l-icon') {
                styleId = 'dark-mode-shadow-styles-icon';
                styleText = iconShadowStyles;
            } else if (tagName === 'd2l-my-courses-enrollment-card') {
                styleId = 'dark-mode-shadow-styles-my-courses-enrollment-card';
                styleText = myCoursesEnrollmentCardShadowStyles;
            } else if (tagName === 'd2l-enrollment-card') {
                styleId = 'dark-mode-shadow-styles-enrollment-card';
                styleText = enrollmentCardShadowStyles;
            } else if (tagName === 'd2l-card') {
                styleId = 'dark-mode-shadow-styles-card';
                styleText = cardShadowStyles;
            } else if (tagName === 'd2l-breadcrumb' || tagName === 'd2l-breadcrumbs'
                || tagName === 'd2l-breadcrumb-current-page') {
                styleId = 'dark-mode-shadow-styles-breadcrumb';
                styleText = breadcrumbShadowStyles;
            } else if (tagName === 'd2l-expand-collapse-content' && pageCases.isInsideLessonsTocItem(element)) {
                styleId = 'dark-mode-shadow-styles-expand-collapse-toc';
                styleText = lessonsTocExpandCollapseStyles;
            } else if (tagName === 'd2l-expand-collapse-content' || tagName === 'd2l-lti-launch') {
                styleId = 'dark-mode-shadow-styles-expand-collapse';
                styleText = expandCollapseStyles;
            } else if (tagName === 'd2l-htmleditor') {
                // The editor shell and its TinyMCE iframe live inside this open
                // shadow root, where the page stylesheet cannot reach them.
                styleId = 'dark-mode-shadow-styles-html-editor';
                styleText = htmlEditorShadowStyles;
            } else if (tagName === 'd2l-button-subtle') {
                styleId = 'dark-mode-shadow-styles-button-subtle';
                styleText = buttonSubtleStyles;
            } else if (tagName === 'd2l-floating-buttons') {
                // The visible wrappers live inside this component's open shadow
                // root, beyond the reach of the page stylesheet.
                styleId = 'dark-mode-shadow-styles-floating-buttons';
                styleText = `
                    :host,
                    .d2l-floating-buttons-container,
                    .d2l-floating-buttons-inner-container {
                        background: #1a1a1a !important;
                        background-color: #1a1a1a !important;
                        background-image: none !important;
                        color: ${DARK_TEXT} !important;
                        border-color: ${DARK_BORDER} !important;
                    }
                `;
            } else if (tagName === 'd2l-menu' || tagName === 'd2l-menu-item' || tagName === 'd2l-menu-item-link') {
                styleId = 'dark-mode-shadow-styles-menu';
                styleText = menuStyles;
            } else if (tagName === 'd2l-html-block') {
                var isSurveyAttemptHtmlBlock = window.location.pathname.indexOf('/d2l/lms/survey/user/attempt/') !== -1;
                var isSurveyAlertHtmlBlock = isSurveyAttemptHtmlBlock
                    && element.closest
                    && element.closest('d2l-alert[type="default"]');
                var isGradesFeedbackHtmlBlock = window.location.pathname.indexOf('/d2l/lms/grades/my_grades/main.d2l') !== -1
                    && element.closest
                    && element.closest('.d2l-grades-individualcommentlabelcontainer');
                styleId = isGradesFeedbackHtmlBlock
                    ? 'dark-mode-shadow-styles-grades-feedback-html-block'
                    : (isSurveyAlertHtmlBlock
                    ? 'dark-mode-shadow-styles-survey-alert-html-block'
                    : (isSurveyAttemptHtmlBlock
                        ? 'dark-mode-shadow-styles-survey-attempt-html-block'
                        : 'dark-mode-shadow-styles-html-block'));
                styleText = htmlBlockStyles + ((isSurveyAttemptHtmlBlock || isGradesFeedbackHtmlBlock) ? `
                    :host,
                    .d2l-html-block-rendered {
                        background: ${isSurveyAlertHtmlBlock ? DARK_BG : '#1a1a1a'} !important;
                        background-color: ${isSurveyAlertHtmlBlock ? DARK_BG : '#1a1a1a'} !important;
                        background-image: none !important;
                    }
                    ${isGradesFeedbackHtmlBlock ? `
                        .d2l-html-block-rendered table,
                        .d2l-html-block-rendered tbody,
                        .d2l-html-block-rendered tr,
                        .d2l-html-block-rendered th,
                        .d2l-html-block-rendered td {
                            background: #1a1a1a !important;
                            background-color: #1a1a1a !important;
                            background-image: none !important;
                        }
                    ` : ''}
                ` : '');
            } else if (tagName === 'd2l-alert') {
                // d2l-alert owns its visible default panel inside shadow DOM.
                // Keep semantic alert variants intact; this handles the neutral
                // default notice used before anonymous survey attempts.
                styleId = 'dark-mode-shadow-styles-alert';
                styleText = `
                    :host([type="default"]) {
                        background: ${DARK_BG} !important;
                        background-color: ${DARK_BG} !important;
                        background-image: none !important;
                        color: ${DARK_TEXT} !important;
                        border-color: ${DARK_BORDER} !important;
                    }
                    :host([type="default"]) *,
                    :host([type="default"]) ::slotted(*) {
                        background-color: transparent !important;
                        color: ${DARK_TEXT} !important;
                        border-color: ${DARK_BORDER} !important;
                    }
                `;
            } else if (tagName === 'd2l-w2d-list' || tagName.startsWith('d2l-w2d-')) {
                styleId = 'dark-mode-shadow-styles-w2d-list';
                styleText = w2dListStyles;
            } else if (tagName === 'd2l-list-item-nav' || tagName === 'd2l-list-item-content'
                || tagName === 'd2l-list' || tagName === 'd2l-list-item'
                || tagName.startsWith('d2l-lessons-') || tagName.startsWith('d2l-toc-')) {
                styleId = 'dark-mode-shadow-styles-list-item-nav';
                styleText = listItemNavStyles;
            } else if (tagName === 'd2l-input-search') {
                styleId = 'dark-mode-shadow-styles-input-search';
                styleText = `
                    :host { color: ${DARK_TEXT} !important; }
                    input {
                        color: ${DARK_TEXT} !important;
                        background-color: transparent !important;
                    }
                `;
            } else if (tagName === 'd2l-button-icon') {
                // Layer Lessons-specific hover corrections over the shared
                // button/icon baseline so unrelated glyphs retain their style.
                var quizListActionHost = null;
                try { quizListActionHost = element.getRootNode && element.getRootNode().host; } catch (eBtnHost) { }
                var isStructuralListActionButton = (window.location.pathname.indexOf('/d2l/lms/quizzing/user/quizzes_list.d2l') !== -1
                    || window.location.pathname.indexOf('/d2l/lms/survey/user/surveys_list.d2l') !== -1)
                    && quizListActionHost
                    && quizListActionHost.matches
                    && quizListActionHost.matches('d2l-dropdown-context-menu')
                    && quizListActionHost.closest
                    && quizListActionHost.closest('#z_b.d2l-table > tbody > tr:not(.d_gh)');
                if (isStructuralListActionButton) {
                    styleId = 'dark-mode-shadow-styles-structural-list-button-icon';
                    styleText = buttonIconShadowStyles + `
                        button,
                        button:hover,
                        button:focus,
                        button:focus-visible {
                            background: #1a1a1a !important;
                            background-color: #1a1a1a !important;
                            background-image: none !important;
                        }
                    `;
                } else {
                    styleId = 'dark-mode-shadow-styles-lessons-button-icon';
                    styleText = buttonIconShadowStyles;
                }
            } else if (tagName === 'd2l-calendar') {
                // Mini-month date grid renders as <button class="d2l-calendar-date">
                // inside this shadow root, so the page stylesheet can't reach it
                // (cells stayed white). Darken the cells here.
                styleId = 'dark-mode-shadow-styles-calendar';
                styleText = `
                    :host { color: ${DARK_TEXT} !important; }
                    table, thead, tbody, tr, th, td {
                        background-color: transparent !important;
                        color: ${DARK_TEXT} !important;
                        border-color: ${DARK_BORDER} !important;
                    }
                    th, .d2l-calendar-title { color: ${DARK_TEXT} !important; }
                    button.d2l-calendar-date,
                    .d2l-calendar-date {
                        background-color: ${DARK_BG} !important;
                        background-image: none !important;
                        color: ${DARK_TEXT} !important;
                        border-color: ${DARK_BORDER} !important;
                    }
                    .d2l-calendar-date:hover,
                    .d2l-calendar-date:focus {
                        background-color: #3d3d3d !important;
                    }
                    .d2l-calendar-date-today {
                        outline: 2px solid var(--dtu-ad-accent, #cc1f3b) !important;
                        outline-offset: -2px;
                    }
                    .d2l-calendar-date-selected,
                    .d2l-calendar-date[aria-selected="true"] {
                        background-color: var(--dtu-ad-accent, #cc1f3b) !important;
                        color: #ffffff !important;
                    }
                `;
            } else if (tagName === 'd2l-table-col-sort-button') {
                // Sortable column headers ("Title", "Start Date"): the inner
                // <button> gets a light hover/focus background from D2L's adopted
                // stylesheet, giving white-on-white text. Force it dark.
                styleId = 'dark-mode-shadow-styles-col-sort';
                styleText = `
                    :host { color: ${DARK_TEXT} !important; }
                    button {
                        background-color: transparent !important;
                        color: ${DARK_TEXT} !important;
                    }
                    button:hover,
                    button:focus,
                    button:active {
                        background-color: #3d3d3d !important;
                        color: ${DARK_TEXT} !important;
                    }
                `;
            }
        }

        let style = shadowRoot.getElementById(styleId);
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            style.textContent = styleText;
            shadowRoot.appendChild(style);
        } else if (style.textContent !== styleText) {
            style.textContent = styleText;
        }

        if (element && element.tagName && element.tagName.toLowerCase() === 'd2l-html-block') {
            markAuthoredLightTableCells(shadowRoot);
        }

        try { forceDTULearnAccentInRoot(shadowRoot); } catch (e0) { }
        observeInjectedShadowRoot(shadowRoot);
        processNestedShadowRoots(shadowRoot);
        try { seedSmartRoomLinkerShadowRoot(shadowRoot); } catch (e1) { }
    }

    const _watchedUndefinedTags = new Set();
    let _definitionSweepTimer = null;

    // Custom-element upgrades attach shadow roots without any observable
    // mutation. darkmode.shadow-hook.page.js reports each one as it happens
    // (handleShadowAttachedEvent). This debounced sweep, run when a d2l-* tag
    // we saw gets defined, is the fallback for pages where that hook did not
    // load. It replaced a per-element 350 ms retry (20 tries), which styled no
    // root first once the hook existed (measured 2026-11-14, Chromium and Firefox).
    function scheduleDefinitionSweep() {
        if (_definitionSweepTimer) return;
        _definitionSweepTimer = setTimeout(function () {
            _definitionSweepTimer = null;
            if (!isDarkModeEnabled()) return;
            if (!shouldUseBrightspaceShadowDomProcessing()) return;
            sweepForLateShadowRoots();
        }, 120);
    }

    function watchTagDefinition(tagName) {
        if (!tagName || _watchedUndefinedTags.has(tagName)) return;
        if (!window.customElements || typeof customElements.whenDefined !== 'function') return;
        try {
            if (customElements.get(tagName)) return;
            _watchedUndefinedTags.add(tagName);
            customElements.whenDefined(tagName).then(scheduleDefinitionSweep).catch(function () { });
        } catch (eDefWatch) { }
    }
    const _observedShadowRoots = new WeakSet();

    function isShadowHostCandidate(element) {
        if (!element || !element.tagName) return false;
        return element.tagName.toLowerCase().startsWith('d2l-');
    }

    // A d2l-* element: style its root now, or, before it has one, watch for its
    // tag being defined (the hook reports the root itself when it is attached).
    function handleShadowHostCandidate(element) {
        if (!isShadowHostCandidate(element)) return;
        if (element.shadowRoot) {
            injectStylesIntoShadowRoot(element.shadowRoot, element);
            return;
        }
        watchTagDefinition(element.tagName.toLowerCase());
    }

    const _shadowAttachedHosts = new Set();
    let _shadowAttachedListenerRegistered = false;

    function flushShadowAttachedHosts() {
        if (!_shadowAttachedHosts.size) return;
        const hosts = Array.from(_shadowAttachedHosts);
        _shadowAttachedHosts.clear();
        if (!isDarkModeEnabled()) return;
        if (!shouldUseBrightspaceShadowDomProcessing()) return;

        let injected = false;
        for (let i = 0; i < hosts.length; i++) {
            const host = hosts[i];
            if (!host || !host.isConnected || !host.shadowRoot) continue;
            if (!isShadowHostCandidate(host)) continue;
            if (shouldExcludeElement(host) || isInsideExcludedHostChain(host)) continue;
            injectStylesIntoShadowRoot(host.shadowRoot, host);
            injected = true;
        }

        if (injected) invalidateDeepRoots();
    }

    // The hook reports hosts deep inside other shadow roots, which the tree walks
    // never reach once they stop at an excluded container (the course banner).
    // isInsideExcludedContainer follows parentElement only, so also climb through
    // each enclosing shadow host.
    function isInsideExcludedHostChain(host) {
        let node = host;
        while (node) {
            if (isInsideExcludedContainer(node)) return true;
            const root = node.getRootNode ? node.getRootNode() : null;
            node = root && root.host ? root.host : null;
            if (node && shouldExcludeElement(node)) return true;
        }
        return false;
    }

    function handleShadowAttachedEvent(event) {
        const host = event.composedPath()[0];
        _shadowAttachedHosts.add(host);
        if (_shadowAttachedHosts.size === 1) queueMicrotask(flushShadowAttachedHosts);
    }

    function registerShadowAttachedListener() {
        if (_shadowAttachedListenerRegistered) return;
        if (!usesBrightspaceShadowDom()) return;
        _shadowAttachedListenerRegistered = true;
        document.addEventListener('dtu-after-dark-shadow-attached', handleShadowAttachedEvent, true);
    }

    function processShadowMutationNode(node) {
        if (!node || node.nodeType !== 1) return;
        if (shouldExcludeElement(node) || isInsideExcludedContainer(node)) return;
        if (node.shadowRoot) {
            injectStylesIntoShadowRoot(node.shadowRoot, node);
        } else {
            handleShadowHostCandidate(node);
        }
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, null);
        let child = walker.nextNode();
        while (child) {
            if (!shouldExcludeElement(child) && !isInsideExcludedContainer(child)) {
                if (child.shadowRoot) injectStylesIntoShadowRoot(child.shadowRoot, child);
                else handleShadowHostCandidate(child);
            }
            child = walker.nextNode();
        }
        processHtmlBlocks(node);
        insertContentButtons(node);
        try {
            if (node.matches && node.matches('.d2l-html-block-rendered')) {
                scheduleSmartRoomLinkerScan(node, 120);
                return;
            }
            if (node.querySelectorAll) {
                var rendered = node.querySelectorAll('.d2l-html-block-rendered');
                if (rendered && rendered.length) {
                    for (var i = 0; i < rendered.length && i < 12; i++) {
                        scheduleSmartRoomLinkerScan(rendered[i], 120);
                    }
                    return;
                }
            }
            scheduleSmartRoomLinkerScan(node, 140);
        } catch (e2) { }
    }

    function observeInjectedShadowRoot(shadowRoot) {
        if (!shadowRoot || _observedShadowRoots.has(shadowRoot)) return;
        const observer = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];
                if (mutation.type !== 'childList') continue;
                for (var j = 0; j < mutation.addedNodes.length; j++) {
                    var added = mutation.addedNodes[j];
                    if (added.nodeType === 1) processShadowMutationNode(added);
                }
            }
            if (shadowRoot.host && shadowRoot.host.tagName
                && shadowRoot.host.tagName.toLowerCase() === 'd2l-html-block') {
                markAuthoredLightTableCells(shadowRoot);
            }
            try { forceDTULearnAccentInRoot(shadowRoot); } catch (e3) { }
        });
        observer.observe(shadowRoot, { childList: true, subtree: true });
        _observedShadowRoots.add(shadowRoot);
    }

    function processNestedShadowRoots(shadowRoot) {
        if (!shadowRoot) return;
        const walker = document.createTreeWalker(shadowRoot, NodeFilter.SHOW_ELEMENT, null);
        let element = walker.nextNode();
        while (element) {
            if (element.shadowRoot) injectStylesIntoShadowRoot(element.shadowRoot, element);
            else handleShadowHostCandidate(element);
            element = walker.nextNode();
        }
    }

    const _styledHtmlBlocks = new WeakSet();

    // A block without its shadow root yet needs no retry: the page-world shadow hook
    // reports the root when it is attached (measured 2026-11-15: the old 400 ms retry
    // styled 0 roots first on 10 pages in Chromium and Firefox).
    function ensureHtmlBlockStyled(block) {
        if (!block || _styledHtmlBlocks.has(block) || !block.shadowRoot) return;
        injectStylesIntoShadowRoot(block.shadowRoot, block);
        _styledHtmlBlocks.add(block);
    }

    function processHtmlBlocks(root) {
        if (!root || !root.querySelectorAll) return;
        if (root.matches && root.matches('d2l-html-block')) ensureHtmlBlockStyled(root);
        root.querySelectorAll('d2l-html-block').forEach(ensureHtmlBlockStyled);
    }

    function pollForHtmlBlocks() {
        document.querySelectorAll('d2l-html-block').forEach(ensureHtmlBlockStyled);
    }

    const DARK_SELECTORS = `
        .grid_3.minHeight,
        .grid_3.minHeight *,
        .linkset8,
        .empty-state-container,
        .d2l-page-collapsepane-content,
        .d2l-page-collapsepane-content-inner,
        .d2l-page-collapsepane-content-padding,
        .d2l-user-profile-card,
        .d2l-user-profile-card *,
        .d2l-empty-state-description,
        .panel-section.side-panel,
        .panel-section.side-panel *,
        .content-div,
        .topic-display,
        .activity-viewer,
        .content-container,
        .content-loaded-wrapper,
        .vui-fileviewer,
        .vui-fileviewer-generic,
        .vui-fileviewer-generic-container,
        .vui-fileviewer-generic-main,
        .generic-header-icon-container,
        .generic-headers,
        .vui-fileviewer-generic-header,
        .vui-fileviewer-generic-subheader,
        .vui-fileviewer-icon,
        .generic-download-area,
        .vui-fileviewer-generic-size,
        .vui-fileviewer-generic-download,
        .tsMasterContent header.header,
        div.main.row,
        form[action*="/Answer/Exclude/"],
        form[action*="/Answer/SaveAnswers/"],
        .tsMasterContent .header__title,
        .tsMasterContent .header__actions,
        nav.navigation,
        .navigation__items,
        .navigation__item,
        main.main__content,
        .tsMasterContent,
        .page__title,
        .AnswerSurvey,
        .question__list,
        .question,
        .question__header,
        .question__title,
        .question__content,
        .question__item,
        .item__list,
        .item__scale,
        .scale__radios,
        .scale__label,
        .scale__options,
        .matrix,
        .matrix__header,
        .matrix__item,
        .matrix__option,
        .dropdown,
        .dropdown__list,
        .dropdown__list-item,
        .modal:not(#nagModal),
        .modal__dialog,
        .modal__content,
        .modal__header,
        .modal__footer,
        .confirm__dialog,
        .confirm__content,
        .confirm__body,
        .confirm__footer,
        footer.footer,
        .excludeForm,
        #AnswerZone,
        #QuestionZone,
        .arc-confirm,
        .d2l-course-banner-container,
        #CourseImageBannerPlaceholderId,
        .d2l-column-flip-side,
        .d2l-column-side-padding,
        .page-articlehtml,
        .container_12,
        .leftcolumn,
        .rightcolumn,
        .contentModulesContainer,
        .contentFooter,
        .contentFooter-print,
        #outercontent,
        #outercontent_0_LeftColumn,
        #outercontent_0_RightColumn,
        #outercontent_0_ContentColumn,
        #karsumForm,
        .subservicemenuHeader,
        .subservicemenu,
        .subservicemenuFooter,
        .servicemenu,
        .servicemenu *,
        .servicemenuitems,
        .servicemenuitems *,
        .grid_6.minHeight,
        .grid_6.minHeight *,
        .item.itemmenu,
        .item.separator,
        .servicemenu nav,
        .servicemenu nav *,
        .servicemenu__link-text,
        .breadcrumb.linkset6,
        .breadcrumb.linkset6 *,
        #d_content_r_c1,
        #d_content_r_c2,
        #d_content_r,
        #d_content_r_p,
        form#d2l_form,
        d2l-dropdown-context-menu,
        d2l-dropdown-menu,
        d2l-dropdown-menu-contextmenu,
        d2l-menu,
        d2l-menu-item,
        button[aria-haspopup="true"][aria-label^="Actions for"],
        d2l-dropdown-context-menu button[aria-label^="Actions for"],
        div[role="list"]:not(.d2l-navigation-s-main-wrapper),
        d2l-breadcrumb,
        d2l-breadcrumbs,
        d2l-breadcrumb-current-page,
        d2l-breadcrumbs a,
        d2l-breadcrumbs span,
        d2l-breadcrumbs d2l-icon,
        table.d_FG,
        table.d_FG *,
        .d_fgh,
        .fct_w,
        .fl_n,
        .fl_top,
        d2l-floating-buttons,
        .d2l-floating-buttons-container,
        .d2l-floating-buttons-inner-container
    `;

    const LIGHTER_DARK_SELECTORS = `
        #d_content.d2l-dialog-width,
        #d_content.d2l-dialog-width #d_content_inner,
        #d_content.d2l-dialog-width #d_page_header,
        #d_content.d2l-dialog-width #d_content_r_c1,
        #d_content.d2l-dialog-width #d_content_r_c2,
        #d_content.d2l-dialog-width #d_content_r,
        #d_content.d2l-dialog-width #d_content_r_p,
        #d_content.d2l-dialog-width form#d2l_form,
        .d2l-navigation-s-main-wrapper,
        .d2l-navigation-s-main-wrapper *,
        .d2l-navigation-s-item,
        .d2l-navigation-s-group,
        .d2l-navigation-s-link,
        .d2l-navigation-s-link:link,
        .d2l-navigation-s-link:visited,
        .d2l-navigation-s-link:hover,
        .d2l-navigation-s-link:active,
        .d2l-navigation-s-main-wrapper a,
        .d2l-navigation-s-main-wrapper a:link,
        .d2l-navigation-s-main-wrapper a:visited,
        .d2l-navigation-s-main-wrapper a:hover,
        .d2l-navigation-s-main-wrapper a:active,
        .dco,
        .dco_c,
        .dco a.d2l-link,
        .dco_c a.d2l-link,
        td.d_gn a.d2l-link,
        td.d_gc a.d2l-link,
        .d2l-inline,
        .d2l-inline a,
        .d2l-inline a.d2l-link,
        td.d2l-table-cell-first,
        td.d2l-table-cell-first *,
        .d2l-datalist,
        .vui-list,
        .vui-no-separator,
        ul.d2l-datalist,
        .d2l-widget-header,
        .d2l-widget-header d2l-dropdown-context-menu,
        .d2l-widget-header a,
        .d2l-widget-header a.d2l-link,
        .d2l-widget-content-padding .d2l-placeholder,
        .d2l-widget .d2l-placeholder,
        .d2l-datalist-container,
        .d2l-personal-tools-list,
        .d2l-personal-tools-list li,
        .d2l-personal-tools-category-item,
        .d2l-personal-tools-separated-item,
        .d2l-personal-tools-list a.d2l-link,
        li.d2l-datalist-item,
        .d2l-datalist-item-actionable,
        .d2l-navigation-area-activity-message-content,
        .d2l-navigation-area-activity-message-wrapper,
        .d2l-navigation-area-activity-message-details,
        li.d2l-datalist-item.d2l-datalist-item-actionable,
        .d2l-datalist-item-actioncontrol,
        a.d2l-datalist-item-actioncontrol,
        .d2l-messagebucket-button-container,
        .d2l-messagebucket-button-container *,
        .d2l-messagebucket-button-container-left,
        .d2l-messagebucket-button-container-right,
        d2l-icon,
        .d2l-iterator-button,
        a.d2l-iterator-button,
        #TitlePlaceholderId,
        .d2l-link-main,
        .pageheader,
        .pageheader *,
        .pagefooter,
        .pagefooter *,
        .topmenuitems,
        .topmenuitems *,
        .dturedbackground,
        .dturedbackground *,
        .nav__dropdown,
        article.nav__dropdown
    `;

    function applyDarkStyle(el) {
        if (!el || !el.style) return;
        if (pageCases.isStudyplanModalBackgroundExemptElement(el)) return;
        if (window.location.hostname === 'learn.inside.dtu.dk' && el.matches) {
            try {
                var isQuizAttemptStructure = window.location.pathname.indexOf('/d2l/lms/quizzing/user/attempt/quiz_attempt_page') !== -1
                    && (el.matches('.d2l-quiz-question-autosave-container, .d2l-quiz-answer-container, .d2l-quiz-attempt-buttons')
                        || (el.closest && el.closest('.d2l-quiz-question-autosave-container, .d2l-quiz-answer-container, .d2l-quiz-attempt-buttons')));
                var isQuizListRowStructure = window.location.pathname.indexOf('/d2l/lms/quizzing/user/quizzes_list.d2l') !== -1
                    && el.closest
                    && el.closest('#z_b.d2l-table > tbody > tr:not(.d_gh)');
                var isSurveyListRowStructure = window.location.pathname.indexOf('/d2l/lms/survey/user/surveys_list.d2l') !== -1
                    && el.closest
                    && el.closest('#z_b.d2l-table > tbody > tr:not(.d_gh)');
                var isGradesMainStructuralCell = window.location.pathname.indexOf('/d2l/lms/grades/my_grades/main.d2l') !== -1
                    && el.closest
                    && el.closest('table#z_a.d2l-table')
                    && !el.closest('.d2l-grades-individualcommentlabelcontainer')
                    && el.closest('th[scope="row"], td.d_gn');
                var isGradesFeedbackStructure = window.location.pathname.indexOf('/d2l/lms/grades/my_grades/main.d2l') !== -1
                    && el.closest
                    && el.closest('.d2l-grades-individualcommentlabelcontainer');
                var surveyAnswerRow = el.closest && el.closest('tr.d2l-rowshadeonhover');
                var isSurveyAttemptAnswerRowStructure = window.location.pathname.indexOf('/d2l/lms/survey/user/attempt/') !== -1
                    && surveyAnswerRow
                    && surveyAnswerRow.querySelector('.d2l-qc-controls-container input.d2l-radio');
                if (isSurveyAttemptAnswerRowStructure) pageCases.forceSurveyAttemptAnswerRowDark1(surveyAnswerRow);
                var surveyRadioWrapper = el.closest && el.closest('.dco_c');
                var isSurveyAttemptRadioStructure = window.location.pathname.indexOf('/d2l/lms/survey/user/attempt/') !== -1
                    && (el.matches('.d2l-radio')
                        || (surveyRadioWrapper && surveyRadioWrapper.querySelector('.d2l-radio')));
                var isQuizSubmissionScoreStructure = window.location.pathname.indexOf('/d2l/lms/quizzing/user/quiz_submissions.d2l') !== -1
                    && el.closest
                    && el.closest('.d2l-grades-score');
                var isQuizSubmissionAttemptStructure = window.location.pathname.indexOf('/d2l/lms/quizzing/user/quiz_submissions.d2l') !== -1
                    && el.closest
                    && el.closest('tr')
                    && el.closest('tr').querySelector('a[href*="/d2l/lms/quizzing/user/quiz_submissions_attempt.d2l"]');
                var isQuizSubmissionScoreRowStructure = window.location.pathname.indexOf('/d2l/lms/quizzing/user/quiz_submissions.d2l') !== -1
                    && el.closest
                    && el.closest('tr')
                    && el.closest('tr').querySelector('.d2l-grades-score');
                if (isQuizAttemptStructure || isQuizListRowStructure || isSurveyListRowStructure || isGradesMainStructuralCell || isGradesFeedbackStructure || isSurveyAttemptAnswerRowStructure || isSurveyAttemptRadioStructure || isQuizSubmissionScoreStructure || isQuizSubmissionAttemptStructure || isQuizSubmissionScoreRowStructure) {
                    if (pageCases.inlineStyleHasDarkFill(el, '#1a1a1a', 'rgb(26,26,26)')
                        && pageCases.inlineStyleHasTextColor(el, '#e0e0e0', 'rgb(224,224,224)')) return;
                    el.style.setProperty('background', '#1a1a1a', 'important');
                    el.style.setProperty('background-color', '#1a1a1a', 'important');
                    el.style.setProperty('background-image', 'none', 'important');
                    el.style.setProperty('color', '#e0e0e0', 'important');
                    return;
                }
                if (el.matches('.d2l-labs-navigation-notification-icon-indicator')) {
                    el.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
                    el.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
                    el.style.setProperty('background-image', 'none', 'important');
                    return;
                }
                if (el.matches('d2l-icon[icon="tier3:notification-bell"], d2l-icon[icon="tier3:notification-bell"] *')) {
                    el.style.setProperty('background', 'transparent', 'important');
                    el.style.setProperty('background-color', 'transparent', 'important');
                    el.style.setProperty('background-image', 'none', 'important');
                    return;
                }
                if (pageCases.isWithinNotificationIconComponent(el)) {
                    el.style.setProperty('background', 'transparent', 'important');
                    el.style.setProperty('background-color', 'transparent', 'important');
                    el.style.setProperty('background-image', 'none', 'important');
                    return;
                }
            } catch (e14) { }
        }
        if (window.location.hostname === 'campusnet.dtu.dk' && el.matches) {
            var isNavIconLayer = false;
            try {
                isNavIconLayer = el.matches('.nav__icon, .nav__icon *') || (el.closest && !!el.closest('.nav__icon'));
            } catch (e15) { isNavIconLayer = false; }
            if (isNavIconLayer) {
                el.style.setProperty('background', 'transparent', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                if (el.classList && el.classList.contains('fa-circle')) {
                    el.style.setProperty('color', 'var(--dtu-ad-accent)', 'important');
                } else if ((el.classList && el.classList.contains('fa-stack-1x'))
                    || (el.classList && el.classList.contains('fa-heart'))
                    || (el.classList && el.classList.contains('fa-user'))) {
                    el.style.setProperty('color', 'var(--dtu-ad-accent-on, #ffffff)', 'important');
                }
                return;
            }
        }
        if (el.hasAttribute && el.hasAttribute('data-dtu-ext')) return;
        if (el.closest && el.closest('[data-dtu-ext]')) return;
        // The DTU web header's search button draws its magnifier as a
        // background image; darkmode.css restyles it, so leave it alone here.
        if (el.matches && el.matches('input.inputsubmit[id*="SearchBox_searchbutton"]')) return;
        if (window.location.hostname === 'evaluering.dtu.dk' && el.matches) {
            if (el.matches('.question__content, .question__content > div[style*="font-size:0"]')) return;
        }
        if (isDTULearnQuizSubmissionsPage() && el.matches) {
            if (el.matches('img.d2l-histogram-barblue, td.d2l-histogram-disback1, td.d2l-histogram-disyimg2, td.d2l-histogram-xside2')) return;
        }
        if (el.closest && el.closest('.d2l-navigation-s-main-wrapper, .d2l-navigation-main-ib')) return;
        if (el.closest && el.closest('.pagefooter')) return;
        if (el.closest && el.closest('.topmenuitems')) return;
        if (el.closest && el.closest('.pageheader') && !el.closest('.breadcrumb.linkset6')) return;
        if (el.tagName === 'A') {
            if (pageCases.inlineStyleHasDarkFill(el, '#1a1a1a', 'rgb(26,26,26)')) return;
        } else if (pageCases.inlineStyleHasDarkFill(el, '#1a1a1a', 'rgb(26,26,26)')
            && pageCases.inlineStyleHasTextColor(el, '#e0e0e0', 'rgb(224,224,224)')) {
            return;
        }
        el.style.setProperty('background', '#1a1a1a', 'important');
        el.style.setProperty('background-color', '#1a1a1a', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        if (el.tagName !== 'A') el.style.setProperty('color', '#e0e0e0', 'important');
    }

    function applyLighterDarkStyle(el) {
        if (!el || !el.style) return;
        if (pageCases.isStudyplanModalBackgroundExemptElement(el)) return;
        // The red header has one painter. Painting it grey here too made every style
        // change re-trigger the observer (grey, then red, then grey), which froze the tab.
        if (el.matches && el.matches('.dturedbackground')) {
            forceDtuRedBackgroundDark2(el);
            return;
        }
        if (window.location.hostname === 'learn.inside.dtu.dk' && el.matches) {
            try {
                var isQuizAttemptStructure = window.location.pathname.indexOf('/d2l/lms/quizzing/user/attempt/quiz_attempt_page') !== -1
                    && (el.matches('.d2l-quiz-question-autosave-container, .d2l-quiz-answer-container, .d2l-quiz-attempt-buttons')
                        || (el.closest && el.closest('.d2l-quiz-question-autosave-container, .d2l-quiz-answer-container, .d2l-quiz-attempt-buttons')));
                var isQuizListRowStructure = window.location.pathname.indexOf('/d2l/lms/quizzing/user/quizzes_list.d2l') !== -1
                    && el.closest
                    && el.closest('#z_b.d2l-table > tbody > tr:not(.d_gh)');
                var isSurveyListRowStructure = window.location.pathname.indexOf('/d2l/lms/survey/user/surveys_list.d2l') !== -1
                    && el.closest
                    && el.closest('#z_b.d2l-table > tbody > tr:not(.d_gh)');
                var isGradesMainStructuralCell = window.location.pathname.indexOf('/d2l/lms/grades/my_grades/main.d2l') !== -1
                    && el.closest
                    && el.closest('table#z_a.d2l-table')
                    && !el.closest('.d2l-grades-individualcommentlabelcontainer')
                    && el.closest('th[scope="row"], td.d_gn');
                var isGradesFeedbackStructure = window.location.pathname.indexOf('/d2l/lms/grades/my_grades/main.d2l') !== -1
                    && el.closest
                    && el.closest('.d2l-grades-individualcommentlabelcontainer');
                var surveyAnswerRow = el.closest && el.closest('tr.d2l-rowshadeonhover');
                var isSurveyAttemptAnswerRowStructure = window.location.pathname.indexOf('/d2l/lms/survey/user/attempt/') !== -1
                    && surveyAnswerRow
                    && surveyAnswerRow.querySelector('.d2l-qc-controls-container input.d2l-radio');
                if (isSurveyAttemptAnswerRowStructure) pageCases.forceSurveyAttemptAnswerRowDark1(surveyAnswerRow);
                var surveyRadioWrapper = el.closest && el.closest('.dco_c');
                var isSurveyAttemptRadioStructure = window.location.pathname.indexOf('/d2l/lms/survey/user/attempt/') !== -1
                    && (el.matches('.d2l-radio')
                        || (surveyRadioWrapper && surveyRadioWrapper.querySelector('.d2l-radio')));
                var isQuizSubmissionScoreStructure = window.location.pathname.indexOf('/d2l/lms/quizzing/user/quiz_submissions.d2l') !== -1
                    && el.closest
                    && el.closest('.d2l-grades-score');
                var isQuizSubmissionAttemptStructure = window.location.pathname.indexOf('/d2l/lms/quizzing/user/quiz_submissions.d2l') !== -1
                    && el.closest
                    && el.closest('tr')
                    && el.closest('tr').querySelector('a[href*="/d2l/lms/quizzing/user/quiz_submissions_attempt.d2l"]');
                var isQuizSubmissionScoreRowStructure = window.location.pathname.indexOf('/d2l/lms/quizzing/user/quiz_submissions.d2l') !== -1
                    && el.closest
                    && el.closest('tr')
                    && el.closest('tr').querySelector('.d2l-grades-score');
                if (isQuizAttemptStructure || isQuizListRowStructure || isSurveyListRowStructure || isGradesMainStructuralCell || isGradesFeedbackStructure || isSurveyAttemptAnswerRowStructure || isSurveyAttemptRadioStructure || isQuizSubmissionScoreStructure || isQuizSubmissionAttemptStructure || isQuizSubmissionScoreRowStructure) {
                    if (pageCases.inlineStyleHasDarkFill(el, '#1a1a1a', 'rgb(26,26,26)')
                        && pageCases.inlineStyleHasTextColor(el, '#e0e0e0', 'rgb(224,224,224)')) return;
                    el.style.setProperty('background', '#1a1a1a', 'important');
                    el.style.setProperty('background-color', '#1a1a1a', 'important');
                    el.style.setProperty('background-image', 'none', 'important');
                    el.style.setProperty('color', '#e0e0e0', 'important');
                    return;
                }
                if (el.matches('.d2l-labs-navigation-notification-icon-indicator')) {
                    el.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
                    el.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
                    el.style.setProperty('background-image', 'none', 'important');
                    return;
                }
                if (el.matches('d2l-icon[icon="tier3:notification-bell"], d2l-icon[icon="tier3:notification-bell"] *')) {
                    el.style.setProperty('background', 'transparent', 'important');
                    el.style.setProperty('background-color', 'transparent', 'important');
                    el.style.setProperty('background-image', 'none', 'important');
                    return;
                }
                if (pageCases.isWithinNotificationIconComponent(el)) {
                    el.style.setProperty('background', 'transparent', 'important');
                    el.style.setProperty('background-color', 'transparent', 'important');
                    el.style.setProperty('background-image', 'none', 'important');
                    return;
                }
            } catch (e16) { }
        }
        if (window.location.hostname === 'campusnet.dtu.dk' && el.matches) {
            var isNavIconLayer = false;
            try {
                isNavIconLayer = el.matches('.nav__icon, .nav__icon *') || (el.closest && !!el.closest('.nav__icon'));
            } catch (e17) { isNavIconLayer = false; }
            if (isNavIconLayer) {
                el.style.setProperty('background', 'transparent', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                if (el.classList && el.classList.contains('fa-circle')) {
                    el.style.setProperty('color', 'var(--dtu-ad-accent)', 'important');
                } else if ((el.classList && el.classList.contains('fa-stack-1x'))
                    || (el.classList && el.classList.contains('fa-heart'))
                    || (el.classList && el.classList.contains('fa-user'))) {
                    el.style.setProperty('color', 'var(--dtu-ad-accent-on, #ffffff)', 'important');
                }
                return;
            }
        }
        if (el.hasAttribute && el.hasAttribute('data-dtu-ext')) return;
        if (el.closest && el.closest('[data-dtu-ext]')) return;
        if (el.closest && el.closest('.dtu-bus-departures')) return;
        if (el.matches && el.matches('.dtu-bus-departures')) return;
        // The calendar's title/iterator header bar (and its child controls like
        // the prev/next arrows) should match the page base (#1a1a1a), not the
        // lighter panel grey. Exclude the "All Calendars" dropdown popup so it
        // keeps its panel styling. Guard against re-setting (which would
        // retrigger the mutation observer and loop), mirroring the general guard.
        if (el.id === 'TitlePlaceholderId'
            || (el.closest && el.closest('#TitlePlaceholderId') && !el.closest('d2l-dropdown-content'))) {
            if (pageCases.inlineStyleHasDarkFill(el, '#1a1a1a', 'rgb(26,26,26)')
                && (el.tagName === 'A' || pageCases.inlineStyleHasTextColor(el, '#e0e0e0', 'rgb(224,224,224)'))) return;
            el.style.setProperty('background', '#1a1a1a', 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('background-image', 'none', 'important');
            if (el.tagName !== 'A') el.style.setProperty('color', '#e0e0e0', 'important');
            return;
        }
        if (isDTULearnQuizSubmissionsPage() && el.matches) {
            if (el.matches('img.d2l-histogram-barblue, td.d2l-histogram-disback1, td.d2l-histogram-disyimg2, td.d2l-histogram-xside2')) return;
        }
        if (isDTULearnQuizSubmissionsPage()) {
            var graphRow = el.closest && el.closest('tr');
            if (graphRow && graphRow.querySelector && graphRow.querySelector('img[src*="Framework.GraphBar"]')) return;
        }
        if (el.closest && el.closest('table.d_FG')) return;
        if (el.matches && el.matches('.breadcrumb.linkset6')) return;
        if (el.closest && el.closest('.breadcrumb.linkset6')) return;
        if (window.location.hostname === 'learn.inside.dtu.dk'
            && el.closest
            && el.closest('.navigation-container .navigation-tree')
            && el.matches
            && el.matches('.co-content, .title-container, .title, .title > div, .title-text, .title-text span, .overflow-detector, .overflow-detector span, .text-wrapper, .date-container, .due-date-container')) {
            pageCases.forceLessonsTocDark1Element(el);
            return;
        }
        if (window.location.hostname === 'learn.inside.dtu.dk'
            && el.matches
            && el.matches('.d2l-action-buttons, .d2l-action-buttons-list, ul.d2l-action-buttons-list, .d2l-action-buttons-item')) {
            pageCases.forceLessonsTocDark1Element(el);
            return;
        }
        var tagName = ((el.tagName || '') + '').toLowerCase();
        var iconName = (el.getAttribute && el.getAttribute('icon')) || '';
        if (tagName === 'd2l-icon' && iconName === 'tier2:file-document') {
            // Transparent so the glyph sits on whatever its row shows (resting,
            // hovered or current pill) instead of drawing its own square.
            // Guarded: rewriting unchanged inline styles loops the observer.
            var iconFill = pageCases.normalizeInlineStyleValue(el.style.getPropertyValue('background-color'));
            if ((iconFill === 'transparent' || iconFill === 'rgba(0,0,0,0)')
                && el.style.getPropertyPriority('background-color') === 'important'
                && pageCases.inlineStyleHasTextColor(el, '#e0e0e0', 'rgb(224,224,224)')) return;
            el.style.setProperty('background', 'transparent', 'important');
            el.style.setProperty('background-color', 'transparent', 'important');
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('color', '#e0e0e0', 'important');
            return;
        }
        if (el.matches && (
            el.matches('d2l-icon.module-triangle')
            || el.matches('.module-triangle')
            || el.matches('.navigation-container .drag-handle d2l-icon')
            || el.matches('.navigation-container .upload-icon-container d2l-icon')
            || (tagName === 'd2l-icon' && (
                iconName === 'tier1:arrow-collapse-small'
                || iconName === 'tier1:arrow-expand-small'
                || iconName === 'tier1:dragger'
                || iconName === 'tier2:upload'
            ))
            || (tagName === 'd2l-icon' && el.closest && el.closest('.navigation-container .navigation-tree .title-container'))
        )) {
            el.style.setProperty('background', '#1a1a1a', 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('color', '#e0e0e0', 'important');
            return;
        }
        if (el.tagName === 'A') {
            if (pageCases.inlineStyleHasDarkFill(el, '#2d2d2d', 'rgb(45,45,45)')) return;
        } else if (pageCases.inlineStyleHasDarkFill(el, '#2d2d2d', 'rgb(45,45,45)')
            && pageCases.inlineStyleHasTextColor(el, '#e0e0e0', 'rgb(224,224,224)')) {
            return;
        }
        el.style.setProperty('background', '#2d2d2d', 'important');
        el.style.setProperty('background-color', '#2d2d2d', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        if (el.tagName !== 'A') el.style.setProperty('color', '#e0e0e0', 'important');
    }

    function overrideDynamicStyles(root) {
        root.querySelectorAll(DARK_SELECTORS).forEach(applyDarkStyle);
        root.querySelectorAll(LIGHTER_DARK_SELECTORS).forEach(applyLighterDarkStyle);
        try {
            pageCases.forceLessonsTocDark1(document);
            if (root !== document) pageCases.forceLessonsTocDark1(root);
        } catch (e18) { }
        try {
            pageCases.forceD2LActionButtonsDark1(document);
            if (root !== document) pageCases.forceD2LActionButtonsDark1(root);
        } catch (e19) { }
        try {
            pageCases.disableLegacyLessonsSidebarGradient(document);
            if (root !== document) pageCases.disableLegacyLessonsSidebarGradient(root);
        } catch (e20) { }
        root.querySelectorAll('.nav__dropdown, article.nav__dropdown').forEach(function (dropdown) {
            dropdown.querySelectorAll('a, span, h2, li, div, header').forEach(function (el) {
                el.style.setProperty('color', '#ffffff', 'important');
            });
        });
        root.querySelectorAll('.dturedbackground').forEach(forceDtuRedBackgroundDark2);
        try {
            var badgeBg = isDarkModeEnabled() ? 'var(--dtu-ad-accent)' : 'var(--dtu-ad-accent-deep)';
            var badgeText = isDarkModeEnabled() ? 'var(--dtu-ad-accent-on, #ffffff)' : 'var(--dtu-ad-accent-deep-on, #ffffff)';
            var w2dBadgeBg = getResolvedAccent();
            var w2dBadgeText = getContrastTextForHex(w2dBadgeBg, '#ffffff', '#000000');
            root.querySelectorAll('.d2l-w2d-count, .d2l-w2d-heading-3-count').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', w2dBadgeBg, 'important');
                el.style.setProperty('background-color', w2dBadgeBg, 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('color', w2dBadgeText, 'important');
                el.style.setProperty('border-color', w2dBadgeBg, 'important');
            });
            root.querySelectorAll('.d2l-count-badge-number').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', badgeBg, 'important');
                el.style.setProperty('background-color', badgeBg, 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('color', badgeText, 'important');
                el.style.setProperty('border', '0', 'important');
                el.style.setProperty('outline', '0', 'important');
                el.style.setProperty('box-shadow', 'none', 'important');
            });
            root.querySelectorAll('.d2l-count-badge-number > div').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', 'transparent', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('color', badgeText, 'important');
            });
            root.querySelectorAll('.uw-text').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('color', 'var(--dtu-ad-accent-text, var(--dtu-ad-accent))', 'important');
            });
        } catch (e21) { }
    }

    function setupStyleObserver(root) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const el = mutation.target;
                    try {
                        if (el && el.closest && el.closest('.navigation-container .navigation-tree')) pageCases.forceLessonsTocDark1(el);
                    } catch (e22) { }
                    try { pageCases.forceD2LActionButtonsDark1(el); } catch (e23) { }
                    try { pageCases.disableLegacyLessonsSidebarGradient(el); } catch (e24) { }
                    if (el.matches && el.matches(LIGHTER_DARK_SELECTORS)) {
                        applyLighterDarkStyle(el);
                    } else if (el.matches && el.matches(DARK_SELECTORS)) {
                        applyDarkStyle(el);
                    }
                }
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType !== 1) return;
                        try {
                            if (node.closest && node.closest('.navigation-container .navigation-tree')) pageCases.forceLessonsTocDark1(node);
                        } catch (e25) { }
                        try { pageCases.forceD2LActionButtonsDark1(node); } catch (e26) { }
                        try { pageCases.disableLegacyLessonsSidebarGradient(node); } catch (e27) { }
                        if (node.matches && node.matches(DARK_SELECTORS)) applyDarkStyle(node);
                        if (node.matches && node.matches(LIGHTER_DARK_SELECTORS)) applyLighterDarkStyle(node);
                        if (node.querySelectorAll) {
                            node.querySelectorAll(DARK_SELECTORS).forEach(applyDarkStyle);
                            node.querySelectorAll(LIGHTER_DARK_SELECTORS).forEach(applyLighterDarkStyle);
                            pageCases.forceLessonsTocDark1(node);
                        }
                    });
                }
            });
        });
        observer.observe(root, {
            attributes: true,
            // Only style changes are handled above; class changes would wake the observer for nothing.
            attributeFilter: ['style'],
            childList: true,
            subtree: true
        });
        return observer;
    }

    function pollOverrideDynamicStyles() {
        overrideDynamicStyles(document);
        document.querySelectorAll('iframe').forEach(function (iframe) {
            try {
                const doc = iframe.contentDocument;
                if (doc && doc.body) {
                    if (doc.querySelector('.navigation-container') || doc.querySelector('d2l-lessons-toc')) return;
                    overrideDynamicStyles(doc);
                    if (!iframe._darkModeObserver) iframe._darkModeObserver = setupStyleObserver(doc.documentElement);
                }
            } catch (e28) { }
        });
    }

    function isExcludedContainerItself(node) {
        if (node.id === 'viewer'
            || (node.classList && (node.classList.contains('pdfViewer') || node.classList.contains('pdf-viewer')))) {
            return true;
        }
        if (node.tagName === 'D2L-LABS-MEDIA-PLAYER') return true;
        if (node.id === 'player' || (node.id && node.id.includes('d2l-labs-media-player'))) return true;
        return false;
    }

    // Walking to the root for every element made this quadratic on deep pages:
    // it was the single most expensive function on a lessons unit page. Every
    // ancestor visited is cached on the way, so a subtree costs one walk rather
    // than one per element. The cache is generation-scoped, so a DOM change
    // invalidates it wholesale.
    let _excludedAncestorCache = new WeakMap();
    let _excludedAncestorGeneration = -1;

    function isInsideExcludedContainer(element) {
        if (!element) return false;

        if (typeof deps.domGeneration !== 'function') {
            // No generation signal to invalidate against, so never cache: a stale
            // answer here would leave a subtree wrongly styled or wrongly skipped.
            let node = element;
            while (node) {
                if (isExcludedContainerItself(node)) return true;
                node = node.parentElement;
            }
            return false;
        }

        const generation = deps.domGeneration();
        if (generation !== _excludedAncestorGeneration) {
            _excludedAncestorGeneration = generation;
            _excludedAncestorCache = new WeakMap();
        }

        const chain = [];
        let parent = element;
        let result = false;
        while (parent) {
            const cached = _excludedAncestorCache.get(parent);
            if (cached !== undefined) {
                result = cached;
                break;
            }
            if (isExcludedContainerItself(parent)) {
                result = true;
                break;
            }
            chain.push(parent);
            parent = parent.parentElement;
        }

        for (let i = 0; i < chain.length; i++) {
            _excludedAncestorCache.set(chain[i], result);
        }
        return result;
    }

    function usesBrightspaceShadowDom() {
        var host = window.location.hostname;
        return host === 'learn.inside.dtu.dk' || host === 's.brightspace.com';
    }

    function shouldUseBrightspaceShadowDomProcessing() {
        if (!usesBrightspaceShadowDom()) return false;
        if (isLegacyHeavyPage()) return false;
        return true;
    }

    // Shared by the late-shadow and iframe walks below. Only their tree walkers differ.
    function processShadowCandidate(node) {
        if (!node || node.nodeType !== 1 || !node.tagName) return;
        if (!node.tagName.toLowerCase().startsWith('d2l-')) return;
        if (shouldExcludeElement(node) || isInsideExcludedContainer(node)) return;
        if (node.shadowRoot) injectStylesIntoShadowRoot(node.shadowRoot, node);
        else handleShadowHostCandidate(node);
    }

    function processElement(element) {
        if (!element || element.nodeType !== 1) return;
        if (!shouldUseBrightspaceShadowDomProcessing()) return;
        if (isInsideExcludedContainer(element)) return;
        function processNode(node) {
            if (!node || node.nodeType !== 1) return;
            if (shouldExcludeElement(node) || isInsideExcludedContainer(node)) return;
            if (node.shadowRoot) injectStylesIntoShadowRoot(node.shadowRoot, node);
            else handleShadowHostCandidate(node);
        }
        processNode(element);
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, null);
        let child = walker.nextNode();
        while (child) {
            processNode(child);
            child = walker.nextNode();
        }
        processHtmlBlocks(element);
        processIframes(element);
    }

    function sweepForLateShadowRoots(root) {
        if (!isDarkModeEnabled()) return;
        if (!shouldUseBrightspaceShadowDomProcessing()) return;
        var baseRoot = root && root.nodeType === 1 ? root : (document.body || document.documentElement);
        if (!baseRoot) return;
        processShadowCandidate(baseRoot);
        var walker = document.createTreeWalker(baseRoot, NodeFilter.SHOW_ELEMENT, null);
        var node = walker.nextNode();
        while (node) {
            processShadowCandidate(node);
            node = walker.nextNode();
        }
    }

    function processIframeShadowTree(doc, rootNode) {
        if (!doc || !rootNode || !shouldUseBrightspaceShadowDomProcessing()) return;

        processShadowCandidate(rootNode);
        var view = doc.defaultView;
        var showElement = view && view.NodeFilter ? view.NodeFilter.SHOW_ELEMENT : 1;
        var walker;
        try {
            walker = doc.createTreeWalker(rootNode, showElement, null);
        } catch (e0) {
            return;
        }
        var node = walker.nextNode();
        while (node) {
            processShadowCandidate(node);
            node = walker.nextNode();
        }
    }

    function observeIframeShadowRoots(doc) {
        if (!doc || !doc.documentElement || doc._dtuDarkModeShadowObserver) return;
        var view = doc.defaultView;
        if (!view || !view.MutationObserver) return;
        try {
            var observer = new view.MutationObserver(function (mutations) {
                var authoredTableChanged = false;
                for (var i = 0; i < mutations.length; i++) {
                    var mutation = mutations[i];
                    if (mutation.type !== 'childList') continue;
                    for (var j = 0; j < mutation.addedNodes.length; j++) {
                        var added = mutation.addedNodes[j];
                        if (added && added.nodeType === 1) {
                            processIframeShadowTree(doc, added);
                            if ((added.matches && added.matches('td, th')) || (added.querySelector && added.querySelector('td, th'))) authoredTableChanged = true;
                        }
                    }
                }
                if (authoredTableChanged) markAuthoredLightTableCells(doc, 'td, th');
            });
            observer.observe(doc.documentElement, { childList: true, subtree: true });
            doc._dtuDarkModeShadowObserver = observer;
        } catch (e0) { }
    }

    function processIframes(root) {
        const iframes = [];
        if (root.matches && root.matches('iframe')) iframes.push(root);
        root.querySelectorAll('iframe').forEach(function (iframe) { iframes.push(iframe); });
        iframes.forEach(function (iframe) {
            try {
                if (!iframe._dtuDarkModeLoadHandler) {
                    iframe._dtuDarkModeLoadHandler = function () {
                        if (isDarkModeEnabled()) processIframes(iframe);
                    };
                    iframe.addEventListener('load', iframe._dtuDarkModeLoadHandler);
                }
                const src = iframe.src || '';
                if (src.includes('pdf') || src.includes('viewer') || src.includes('.pdf')) return;
                const doc = iframe.contentDocument;
                if (!doc || !doc.documentElement) return;
                if (doc.getElementById('viewer')
                    || doc.querySelector('.pdfViewer')
                    || doc.querySelector('.pdf-viewer')
                    || doc.querySelector('[data-page-number]')) {
                    return;
                }
                let style = doc.getElementById('dark-mode-iframe-styles');
                if (!style) {
                    style = doc.createElement('style');
                    style.id = 'dark-mode-iframe-styles';
                    style.textContent = iframeStyles;
                    doc.head.appendChild(style);
                } else if (style.textContent !== iframeStyles) {
                    style.textContent = iframeStyles;
                }
                markAuthoredLightTableCells(doc, 'td, th');
                processIframeShadowTree(doc, doc.documentElement);
                observeIframeShadowRoots(doc);
            } catch (error) { }
        });
    }

    async function waitForCustomElements() {
        const elementsToWait = ['d2l-enrollment-card', 'd2l-card', 'd2l-html-block', 'd2l-icon'];
        const promises = elementsToWait.map(function (tagName) {
            // customElements can be null in sandboxed frames; never throw here.
            try {
                if (!window.customElements || typeof customElements.whenDefined !== 'function') return Promise.resolve();
                if (customElements.get(tagName)) return Promise.resolve();
                return customElements.whenDefined(tagName).catch(function () { return Promise.resolve(); });
            } catch (eCeNull) { return Promise.resolve(); }
        });
        return Promise.race([
            Promise.all(promises),
            new Promise(function (resolve) { setTimeout(resolve, 3000); })
        ]);
    }

    // A legacy page (two-panel layout) shown inside the Lessons viewer sits on its #2d2d2d
    // panel; its own #1a1a1a page base would draw a dark frame around the content.
    function isLegacyPageInLessonsViewer() {
        try {
            if (window === window.top || !document.querySelector('.d2l-twopanelselector-main')) return false;
            return /\/d2l\/ui\/apps\/smart-curriculum\//.test(window.parent.location.pathname);
        } catch (eCross) { return false; }
    }

    function enforcePageBackground() {
        var inLessons = isLegacyPageInLessonsViewer();
        var bg = inLessons ? '#2d2d2d' : '#1a1a1a';
        document.documentElement.classList.toggle('dtu-in-lessons-viewer', inLessons);
        document.documentElement.style.setProperty('background-color', bg, 'important');
        document.documentElement.style.setProperty('background', bg, 'important');
        if (document.body) {
            document.body.style.setProperty('background-color', bg, 'important');
            document.body.style.setProperty('background', bg, 'important');
        }
    }

    function runDarkModeChecks(rootNode) {
        if (!isDarkModeEnabled()) return;
        var useBrightspaceShadowDom = shouldUseBrightspaceShadowDomProcessing();
        if (rootNode && rootNode.nodeType === 1) {
            markAuthoredLightTableCells(rootNode, 'td, th');
            if (useBrightspaceShadowDom) {
                // processElement visits every element the shadow sweep would: one walk is enough.
                processElement(rootNode);
                try { replaceLogoImage(rootNode); } catch (eLogoRc) { }
                try { styleQuizSubmissionHistogram(rootNode); } catch (eQuizRc) { }
            } else {
                preserveTypeboxColors(rootNode);
            }
            return;
        }
        enforcePageBackground();
        markAuthoredLightTableCells(document, 'td, th');
        if (useBrightspaceShadowDom) {
            pollForHtmlBlocks();
            pollOverrideDynamicStyles();
            if (document.body) processElement(document.body);
            else sweepForLateShadowRoots();
            try { replaceLogoImage(); } catch (eLogoRf) { }
            try { styleQuizSubmissionHistogram(); } catch (eQuizRf) { }
        }
        preserveTypeboxColors();
    }

    globalThis.DTUAfterDarkDarkEngine = {
        getDarkText: function () { return DARK_TEXT; },
        getDarkBorder: function () { return DARK_BORDER; },
        getDarkSelectors: function () { return DARK_SELECTORS; },
        getLighterDarkSelectors: function () { return LIGHTER_DARK_SELECTORS; },
        usesBrightspaceShadowDom: usesBrightspaceShadowDom,
        shouldUseBrightspaceShadowDomProcessing: shouldUseBrightspaceShadowDomProcessing,
        shouldExcludeElement: shouldExcludeElement,
        injectStylesIntoShadowRoot: injectStylesIntoShadowRoot,
        observeInjectedShadowRoot: observeInjectedShadowRoot,
        processHtmlBlocks: processHtmlBlocks,
        pollForHtmlBlocks: pollForHtmlBlocks,
        forceLessonsTocDark1: pageCases.forceLessonsTocDark1,
        forceD2LActionButtonsDark1: pageCases.forceD2LActionButtonsDark1,
        disableLegacyLessonsSidebarGradient: pageCases.disableLegacyLessonsSidebarGradient,
        applyDarkStyle: applyDarkStyle,
        applyLighterDarkStyle: applyLighterDarkStyle,
        setupStyleObserver: setupStyleObserver,
        pollOverrideDynamicStyles: pollOverrideDynamicStyles,
        processElement: processElement,
        processIframes: processIframes,
        waitForCustomElements: waitForCustomElements,
        runDarkModeChecks: runDarkModeChecks
    };

    if (isDarkModeEnabled()) {
        registerShadowAttachedListener();
        enforcePageBackground();
        pollOverrideDynamicStyles();
        function initialize() {
            // Immediate pass: styles whatever is already upgraded and registers
            // whenDefined watchers/retries for everything that is not.
            if (shouldUseBrightspaceShadowDomProcessing() && document.body) {
                processElement(document.body);
            }
            markAuthoredLightTableCells(document, 'td, th');
            waitForCustomElements().then(function () {
                if (shouldUseBrightspaceShadowDomProcessing() && document.body) {
                    processElement(document.body);
                }
            });
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            initialize();
        }
    }
})();
