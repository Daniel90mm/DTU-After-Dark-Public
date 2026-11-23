(() => {
    // Same as the engine: darkmode.js stops before it sets these deps on a paused URL,
    // where the extension is off by choice, so a missing object means light, not an error.
    const deps = globalThis.DTUAfterDarkDarkEngineDeps || {};

    function isDarkModeEnabled() {
        return !!(deps.isDarkModeEnabled && deps.isDarkModeEnabled());
    }

    function isInsideLessonsTocItem(element) {
        try {
            const root = element.getRootNode && element.getRootNode();
            return !!(root && root.host && root.host.tagName === 'D2L-LIST-ITEM-NAV');
        } catch (e) {
            return false;
        }
    }

    const LESSONS_TOC_DARK1_SELECTORS = `
        .navigation-container .navigation-tree .co-content,
        .navigation-container .navigation-tree .title-container,
        .navigation-container .navigation-tree .title,
        .navigation-container .navigation-tree .title > div,
        .navigation-container .navigation-tree .title-text,
        .navigation-container .navigation-tree .title-text span,
        .navigation-container .navigation-tree .overflow-detector,
        .navigation-container .navigation-tree .overflow-detector span,
        .navigation-container .navigation-tree .text-wrapper,
        .navigation-container .navigation-tree .date-container,
        .navigation-container .navigation-tree .due-date-container
    `;

    function normalizeInlineStyleValue(value) {
        return String(value || '').replace(/\s+/g, '').toLowerCase();
    }

    function inlineStyleHasDarkFill(el, hexValue, rgbValue) {
        if (!el || !el.style) return false;
        var bgColor = normalizeInlineStyleValue(el.style.getPropertyValue('background-color'));
        var bg = normalizeInlineStyleValue(el.style.getPropertyValue('background'));
        var bgImage = normalizeInlineStyleValue(el.style.getPropertyValue('background-image'));
        var hasPriority = el.style.getPropertyPriority('background-color') === 'important'
            || el.style.getPropertyPriority('background') === 'important';
        var hasFill = bgColor === hexValue || bgColor === rgbValue || bg === hexValue || bg === rgbValue;
        var hasNoImage = (bgImage === '' || bgImage === 'none');
        return hasFill && hasNoImage && hasPriority;
    }

    function inlineStyleHasTextColor(el, hexValue, rgbValue) {
        if (!el || !el.style) return false;
        var color = normalizeInlineStyleValue(el.style.getPropertyValue('color'));
        var hasPriority = el.style.getPropertyPriority('color') === 'important';
        return hasPriority && (color === hexValue || color === rgbValue);
    }

    function forceLessonsTocDark1Element(el) {
        if (!el || !el.style) return;
        el.style.setProperty('background', '#1a1a1a', 'important');
        el.style.setProperty('background-color', '#1a1a1a', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        if (el.tagName !== 'A') el.style.setProperty('color', '#e0e0e0', 'important');
    }

    function forceLessonsTocDark1(root) {
        if (!isDarkModeEnabled()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!root) return;
        var scope = root;
        if (scope.nodeType !== 1 && scope.nodeType !== 9 && scope.nodeType !== 11) return;
        try {
            if (scope.matches && scope.matches(LESSONS_TOC_DARK1_SELECTORS)) forceLessonsTocDark1Element(scope);
        } catch (e5) { }
        if (!scope.querySelectorAll) return;
        try {
            scope.querySelectorAll(LESSONS_TOC_DARK1_SELECTORS).forEach(forceLessonsTocDark1Element);
        } catch (e6) { }
    }

    function forceD2LActionButtonsDark1(root) {
        if (!isDarkModeEnabled()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!root) return;
        var scope = root;
        if (scope.nodeType !== 1 && scope.nodeType !== 9 && scope.nodeType !== 11) return;
        try {
            if (scope.matches && scope.matches('.d2l-action-buttons, .d2l-action-buttons-list, ul.d2l-action-buttons-list, .d2l-action-buttons-item')) {
                forceLessonsTocDark1Element(scope);
            }
        } catch (e7) { }
        if (!scope.querySelectorAll) return;
        try {
            scope.querySelectorAll('.d2l-action-buttons, .d2l-action-buttons-list, ul.d2l-action-buttons-list, .d2l-action-buttons-item').forEach(forceLessonsTocDark1Element);
            scope.querySelectorAll('.d2l-action-buttons .d2l-button, .d2l-action-buttons-item .d2l-button').forEach(function (btn) {
                if (!btn || !btn.style) return;
                btn.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
                btn.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
                btn.style.setProperty('background-image', 'none', 'important');
                btn.style.setProperty('color', 'var(--dtu-ad-accent-on, #ffffff)', 'important');
                btn.style.setProperty('border-color', 'var(--dtu-ad-accent-border)', 'important');
            });
        } catch (e8) { }
    }

    function disableLegacyLessonsSidebarGradient(root) {
        if (!isDarkModeEnabled()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!root) return;
        var scope = root;
        if (scope.nodeType !== 1 && scope.nodeType !== 9 && scope.nodeType !== 11) return;
        var separatorSelector = '.d2l-box.d2l-box-h.d2l-twopanelselector-side.d2l-twopanelselector-side-sep, '
            + '.d2l-twopanelselector-side.d2l-twopanelselector-side-sep, '
            + '.d2l-twopanelselector-side-bg.d2l-twopanelselector-side-sep, '
            + '#D2L_LE_Content_Dashboard_Collapsed_Separator';
        var selectedAnchorSelector = '#ContentModuleTree #D2L_LE_Content_TreeBrowser .d2l-le-TreeAccordionItem.d2l-le-TreeAccordionItem-Selected > a.d2l-le-TreeAccordionItem-anchor, '
            + '#ContentModuleTree #ContentPluginTree .d2l-le-TreeAccordionItem.d2l-le-TreeAccordionItem-Selected > a.d2l-le-TreeAccordionItem-anchor';
        function neutralizeSeparator(el) {
            if (!el || !el.style) return;
            el.style.setProperty('border-right', 'none', 'important');
            el.style.setProperty('background', '#1a1a1a', 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('box-shadow', 'none', 'important');
            el.style.setProperty('--d2l-color-regolith', '#1a1a1a', 'important');
            el.style.setProperty('--d2l-color-gypsum', '#1a1a1a', 'important');
        }
        function neutralizeSelectedAnchor(el) {
            if (!el || !el.style) return;
            el.style.setProperty('position', 'relative', 'important');
            el.style.setProperty('overflow', 'hidden', 'important');
            el.style.setProperty('background', '#2d2d2d', 'important');
            el.style.setProperty('background-color', '#2d2d2d', 'important');
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('box-shadow', 'none', 'important');
        }
        try {
            if (scope.matches && scope.matches(separatorSelector)) neutralizeSeparator(scope);
            if (scope.matches && scope.matches(selectedAnchorSelector)) neutralizeSelectedAnchor(scope);
        } catch (e9) { }
        if (!scope.querySelectorAll) return;
        try {
            scope.querySelectorAll(separatorSelector).forEach(neutralizeSeparator);
            scope.querySelectorAll(selectedAnchorSelector).forEach(neutralizeSelectedAnchor);
        } catch (e10) { }
    }

    function isWithinNotificationIconComponent(el) {
        if (!el) return false;
        var probe = el;
        var hops = 0;
        while (probe && hops < 8) {
            try {
                if (probe.matches && probe.matches('d2l-labs-navigation-notification-icon')) return true;
                if (probe.closest && probe.closest('d2l-labs-navigation-notification-icon')) return true;
            } catch (e11) { }
            var root = null;
            try { root = probe.getRootNode ? probe.getRootNode() : null; } catch (e12) { root = null; }
            if (!root || !root.host) break;
            probe = root.host;
            hops++;
        }
        return false;
    }

    function isStudyplanModalBackgroundExemptElement(el) {
        if (!el) return false;
        if (window.location.hostname !== 'studieplan.dtu.dk') return false;
        try {
            if (el.id === 'searchCourseCatalogDialog' || el.id === 'createActivity') return true;
            if (el.closest && el.closest('#searchCourseCatalogDialog, #createActivity')) return true;
        } catch (e13) { }
        return false;
    }

    // Survey answer rows use legacy hover/focus styling that can repaint an
    // entire table cell white. Their controls and text are layout, not cards,
    // so keep the complete row on the dark-1 canvas with guarded inline styles.
    function forceSurveyAttemptAnswerRowDark1(row) {
        if (!row || !row.style) return;
        var nodes = [row];
        try {
            row.querySelectorAll('td').forEach(function (cell) { nodes.push(cell); });
        } catch (e0) { }
        nodes.forEach(function (node) {
            if (!node || !node.style) return;
            if (inlineStyleHasDarkFill(node, '#1a1a1a', 'rgb(26,26,26)')
                && inlineStyleHasTextColor(node, '#e0e0e0', 'rgb(224,224,224)')) return;
            node.style.setProperty('background', '#1a1a1a', 'important');
            node.style.setProperty('background-color', '#1a1a1a', 'important');
            node.style.setProperty('background-image', 'none', 'important');
            node.style.setProperty('color', '#e0e0e0', 'important');
            node.style.setProperty('border-color', '#404040', 'important');
            node.style.setProperty('outline-color', '#404040', 'important');
        });
    }

    globalThis.DTUAfterDarkDarkEnginePageCases = {
        isInsideLessonsTocItem: isInsideLessonsTocItem,
        normalizeInlineStyleValue: normalizeInlineStyleValue,
        inlineStyleHasDarkFill: inlineStyleHasDarkFill,
        inlineStyleHasTextColor: inlineStyleHasTextColor,
        forceLessonsTocDark1Element: forceLessonsTocDark1Element,
        forceLessonsTocDark1: forceLessonsTocDark1,
        forceD2LActionButtonsDark1: forceD2LActionButtonsDark1,
        disableLegacyLessonsSidebarGradient: disableLegacyLessonsSidebarGradient,
        isWithinNotificationIconComponent: isWithinNotificationIconComponent,
        isStudyplanModalBackgroundExemptElement: isStudyplanModalBackgroundExemptElement,
        forceSurveyAttemptAnswerRowDark1: forceSurveyAttemptAnswerRowDark1
    };
})();
