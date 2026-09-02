(function () {
    'use strict';

    function getDeps() {
        try { return globalThis.DTUAfterDarkLearnAccentShellDeps || null; } catch (e0) { return null; }
    }

    function isDarkModeEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDarkModeEnabled === 'function' && deps.isDarkModeEnabled());
    }

    function getResolvedAccent() {
        var deps = getDeps();
        if (deps && typeof deps.getResolvedAccent === 'function') {
            return deps.getResolvedAccent();
        }
        return '#990000';
    }

    function getContrastTextForHex(bg, light, dark) {
        var deps = getDeps();
        if (deps && typeof deps.getContrastTextForHex === 'function') {
            return deps.getContrastTextForHex(bg, light, dark);
        }
        return light || '#ffffff';
    }

    function getLightAccentBadgeStyles() {
        var deps = getDeps();
        return deps && typeof deps.getLightAccentBadgeStyles === 'function'
            ? String(deps.getLightAccentBadgeStyles() || '')
            : '';
    }

    function isLegacyHeavyPage() {
        var deps = getDeps();
        return !!(deps && typeof deps.isLegacyHeavyPage === 'function' && deps.isLegacyHeavyPage());
    }

    function getDarkText() {
        var deps = getDeps();
        return deps && typeof deps.getDarkText === 'function' ? String(deps.getDarkText() || '#e0e0e0') : '#e0e0e0';
    }

    function getDarkBorder() {
        var deps = getDeps();
        return deps && typeof deps.getDarkBorder === 'function' ? String(deps.getDarkBorder() || '#404040') : '#404040';
    }

    function applyDTULearnNavigationBandAccent(el) {
        if (!el || !el.style) return;
        el.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
        el.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        el.style.setProperty('color', '#ffffff', 'important');
    }

    function forceDTULearnNavigationBandAccentElements(root) {
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;

        function visit(scope, visited, depth) {
            if (!scope || depth > 6) return;
            if (!visited) visited = new WeakSet();

            try {
                if (scope.nodeType === 11 && scope.host && scope.host.matches && scope.host.matches('d2l-labs-navigation-band')) {
                    applyDTULearnNavigationBandAccent(scope.host);
                }
            } catch (eHost) { }

            try {
                if (scope.querySelectorAll) {
                    scope.querySelectorAll('d2l-labs-navigation-band').forEach(function (el) {
                        applyDTULearnNavigationBandAccent(el);
                        try {
                            if (el.shadowRoot && !visited.has(el.shadowRoot)) {
                                visited.add(el.shadowRoot);
                                visit(el.shadowRoot, visited, depth + 1);
                            }
                        } catch (eBandShadow) { }
                    });
                }
            } catch (eBand) { }

            try {
                if (scope.querySelectorAll) {
                    scope.querySelectorAll('d2l-labs-navigation').forEach(function (el) {
                        try {
                            if (el.shadowRoot && !visited.has(el.shadowRoot)) {
                                visited.add(el.shadowRoot);
                                visit(el.shadowRoot, visited, depth + 1);
                            }
                        } catch (eNavShadow) { }
                    });
                }
            } catch (eNav) { }
        }

        try {
            var visited = new WeakSet();
            visit(document, visited, 0);
            if (root && root !== document) visit(root, visited, 0);
        } catch (e0) { }
    }

    function forceDTULearnAccentInRoot(root) {
        if (!root || !root.querySelectorAll) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;

        var darkModeEnabled = isDarkModeEnabled();
        var badgeBg = darkModeEnabled ? 'var(--dtu-ad-accent)' : 'var(--dtu-ad-accent-deep)';
        var w2dBadgeBg = getResolvedAccent();
        var w2dBadgeText = getContrastTextForHex(w2dBadgeBg, '#ffffff', '#000000');
        var dark1 = '#1a1a1a';
        var dark2 = '#2d2d2d';
        var DARK_TEXT = getDarkText();
        var DARK_BORDER = getDarkBorder();

        function hasAccessibilityWasLink(container) {
            if (!container || !container.querySelector) return false;
            try {
                var anchors = container.querySelectorAll('a[href]');
                for (var i = 0; i < anchors.length; i++) {
                    var href = anchors[i].getAttribute('href') || '';
                    if (!href) continue;
                    try {
                        var u = new URL(href, window.location.origin);
                        var p = (u.pathname || '').toLowerCase().replace(/\/+$/, '');
                        if (p === '/was' || p.endsWith('/was')) return true;
                    } catch (eHref) {
                        var h = href.toLowerCase();
                        if (h.indexOf('learn.inside.dtu.dk/was') >= 0) return true;
                        if (/(^|\/)was(\?|#|$)/.test(h)) return true;
                    }
                }
            } catch (eA0) { }
            try {
                if (container.querySelector('d2l-html-block[html*="learn.inside.dtu.dk/was"], d2l-html-block[html*="&gt;Accessibility&lt;"]')) return true;
            } catch (eA1) { }
            return false;
        }

        try {
            if (root.nodeType === 11 && root.host && root.host.matches && root.host.matches('d2l-labs-navigation-band')) {
                applyDTULearnNavigationBandAccent(root.host);
            }
            root.querySelectorAll('d2l-labs-navigation-band').forEach(function (el) {
                applyDTULearnNavigationBandAccent(el);
            });
        } catch (e0) { }

        try {
            root.querySelectorAll('.d2l-navigation-s-mobile-menu, .d2l-navigation-s-mobile-menu-mask, .d2l-navigation-s-mobile-menu-content, .d2l-navigation-s-mobile-menu-nav, .d2l-navigation-s-mobile-menu-course-menu').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', dark1, 'important');
                el.style.setProperty('background-color', dark1, 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('color', DARK_TEXT, 'important');
            });
            root.querySelectorAll('.d2l-navigation-s-mobile-menu-mask-close, .d2l-navigation-s-mobile-menu-color-strip, .d2l-navigation-s-mobile-menu-header, .d2l-navigation-s-mobile-menu-header > div, .d2l-navigation-s-mobile-menu-branded-header, .d2l-navigation-s-mobile-menu-branded-header > div, .d2l-navigation-s-mobile-menu-course-selector, .d2l-navigation-s-mobile-menu-header-course-menu, .d2l-navigation-s-gutter, .d2l-navigation-s-header-logo-area, .d2l-navigation-s-header-no-home-icon, .d2l-navigation-s-logo-divider, .d2l-navigation-s-mobile-menu d2l-button-icon, .d2l-navigation-s-mobile-menu d2l-labs-navigation-button-icon, .d2l-navigation-s-mobile-menu d2l-labs-navigation-separator, .d2l-navigation-s-mobile-menu d2l-menu-item-separator').forEach(function (el) {
                if (!el || !el.style) return;
                if (!darkModeEnabled) {
                    if (el.matches && el.matches('.d2l-navigation-s-header-logo-area, .d2l-navigation-s-header-no-home-icon, .d2l-navigation-s-logo-divider')) {
                        el.style.setProperty('background', 'transparent', 'important');
                        el.style.setProperty('background-color', 'transparent', 'important');
                        el.style.setProperty('background-image', 'none', 'important');
                        el.style.removeProperty('color');
                        el.style.removeProperty('border-color');
                    }
                    return;
                }
                el.style.setProperty('background', dark2, 'important');
                el.style.setProperty('background-color', dark2, 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('border-color', DARK_BORDER, 'important');
                el.style.setProperty('color', DARK_TEXT, 'important');
            });
        } catch (e0m) { }

        try {
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
                el.style.setProperty('color', '#ffffff', 'important');
                el.style.setProperty('border-color', '#ffffff', 'important');
                el.style.setProperty('border', '0', 'important');
                el.style.setProperty('outline', '0', 'important');
                el.style.setProperty('box-shadow', 'none', 'important');
            });
            root.querySelectorAll('.d2l-count-badge-number > div').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', 'transparent', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('color', '#ffffff', 'important');
            });
            root.querySelectorAll('.d2l-labs-navigation-notification-icon-indicator').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
                el.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
                el.style.setProperty('background-image', 'none', 'important');
            });
            root.querySelectorAll('d2l-icon[icon="tier3:notification-bell"], d2l-icon[icon="tier3:notification-bell"] *').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', 'transparent', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('background-image', 'none', 'important');
            });
        } catch (e1) { }

        try {
            root.querySelectorAll('.uw-text').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('color', darkModeEnabled ? 'var(--dtu-ad-accent-soft)' : '#000000', 'important');
            });
        } catch (e2) { }

        try {
            if (!darkModeEnabled) {
                root.querySelectorAll(
                    'a.d2l-homepage-heading-link, '
                    + 'a.d2l-homepage-heading-link h2, '
                    + '.d2l-navigation-s-item a.d2l-navigation-s-link, '
                    + '.d2l-navigation-s-item a.d2l-navigation-s-link *, '
                    + '.d2l-navigation-s-item .d2l-navigation-s-group, '
                    + '.d2l-navigation-s-item .d2l-navigation-s-group *, '
                    + '.d2l-navigation-s-item .d2l-navigation-s-group-text, '
                    + '.uw-text'
                ).forEach(function (el) {
                    if (!el || !el.style) return;
                    el.style.setProperty('color', '#000000', 'important');
                });
            }
        } catch (e2b) { }

        try {
            if (darkModeEnabled) {
                root.querySelectorAll('.d2l-widget-content-padding').forEach(function (el) {
                    if (!el || !el.style) return;
                    if (!hasAccessibilityWasLink(el)) return;
                    el.style.setProperty('background', dark1, 'important');
                    el.style.setProperty('background-color', dark1, 'important');
                    el.style.setProperty('background-image', 'none', 'important');
                    var content = el.closest ? el.closest('.d2l-widget-content') : null;
                    if (content && content.style) {
                        content.style.setProperty('background', dark1, 'important');
                        content.style.setProperty('background-color', dark1, 'important');
                        content.style.setProperty('background-image', 'none', 'important');
                    }
                });
            }
        } catch (e3) { }
    }

    function injectLightAccentBadgeStyles(shadowRoot) {
        if (!shadowRoot) return;
        var id = 'dtu-ad-light-accent-badges';
        if (shadowRoot.getElementById && shadowRoot.getElementById(id)) return;
        try { if (shadowRoot.querySelector('#' + id)) return; } catch (e0) { }
        var style = document.createElement('style');
        style.id = id;
        style.textContent = getLightAccentBadgeStyles();
        shadowRoot.appendChild(style);
    }

    function walkShadowRootsForAccent(rootEl, visited, depth) {
        if (!rootEl || depth > 12) return;
        if (!visited) visited = new WeakSet();
        var scope = rootEl;
        if (scope.nodeType !== 1 && scope.nodeType !== 9 && scope.nodeType !== 11) return;

        if (scope.nodeType === 11) {
            try { forceDTULearnAccentInRoot(scope); } catch (e0) { }
            if (!isDarkModeEnabled()) {
                try { injectLightAccentBadgeStyles(scope); } catch (e1) { }
            }
        }

        try {
            var tw = document.createTreeWalker(scope, NodeFilter.SHOW_ELEMENT, null);
            var n = tw.nextNode();
            var steps = 0;
            while (n && steps < 8000) {
                steps++;
                if (n.shadowRoot && !visited.has(n.shadowRoot)) {
                    visited.add(n.shadowRoot);
                    walkShadowRootsForAccent(n.shadowRoot, visited, depth + 1);
                }
                n = tw.nextNode();
            }
        } catch (eWalk) { }
    }

    function forceDTULearnAccentElements(root) {
        if (!root) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;

        try { forceDTULearnNavigationBandAccentElements(root || document); } catch (eBand) { }
        if (isLegacyHeavyPage()) return;

        try { forceDTULearnAccentInRoot(document); } catch (eDoc) { }
        try { forceDTULearnAccentInRoot(root); } catch (e0) { }

        try {
            var visited = new WeakSet();
            walkShadowRootsForAccent(document, visited, 0);
            if (root !== document && root.nodeType === 11) {
                walkShadowRootsForAccent(root, visited, 0);
            }
        } catch (eWalk) { }
    }

    function getDTULearnLegacyLmsToolDarkSelectors() {
        return [
            '.dco.d2l-foldername',
            '.dco.d2l-foldername > .dco_c',
            '.dco.d2l-foldername-medium-font',
            '.dco.d2l-foldername-medium-font > .dco_c',
            '.dco.d2l-folderdates-wrapper',
            '.dco.d2l-folderdates-wrapper > .dco_c',
            '.dco.d2l-folderdates-wrapper .dco_c',
            '.dco.d2l-dates-text',
            '.dco.d2l-dates-text > .dco_c',
            '.dco.d2l-dates-text .dco_c',
            '.dco.d2l-dates-text label',
            '.dco.d2l-dates-text strong',
            'td.d_gt',
            'td.d_gt > a.d2l-link.d2l-link-inline',
            'a.d2l-link.d2l-link-inline[href*="/d2l/lms/dropbox/user/folder_submit_files.d2l"]',
            'a.d2l-link.d2l-link-inline[href*="/d2l/lms/dropbox/user/folders_history.d2l"]',
            'a.d2l-link.d2l-link-inline[onclick*="EmailUser("]',
            'a.d2l-link.d2l-link-inline[onclick*="ToggleSearch("]',
            'a.d2l-link.d2l-link-inline#z_eh',
            'table.d2l-table',
            'table.d2l-table thead',
            'table.d2l-table tbody',
            'table.d2l-table tr',
            'table.d2l-table th',
            'table.d2l-table td',
            'th.d_hch',
            'td.d_gd'
        ];
    }

    function clearDTULearnLegacyLmsToolInlineDarkBackgrounds(rootNode) {
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!isLegacyHeavyPage()) return;

        var scope = (rootNode && rootNode.querySelectorAll) ? rootNode : document;
        var selectors = getDTULearnLegacyLmsToolDarkSelectors();

        selectors.forEach(function (selector) {
            var nodes = [];
            try {
                nodes = scope.querySelectorAll(selector);
            } catch (e0) {
                nodes = [];
            }
            nodes.forEach(function (el) {
                if (!el || !el.style) return;
                var bg = String(el.style.getPropertyValue('background-color') || '').toLowerCase();
                var bgShorthand = String(el.style.getPropertyValue('background') || '').toLowerCase();
                var ownsDarkBg = /#2d2d2d|rgb\(\s*45\s*,\s*45\s*,\s*45\s*\)/i.test(bg)
                    || /#2d2d2d|rgb\(\s*45\s*,\s*45\s*,\s*45\s*\)/i.test(bgShorthand);
                if (!ownsDarkBg) return;
                el.style.removeProperty('background');
                el.style.removeProperty('background-color');
                el.style.removeProperty('background-image');
            });
        });
    }

    function styleLegacyFloatingButtons(scope, darkModeEnabled) {
        var root = (scope && scope.querySelectorAll) ? scope : document;
        var hosts = [];
        try {
            if (root.matches && root.matches('d2l-floating-buttons')) hosts.push(root);
            root.querySelectorAll('d2l-floating-buttons').forEach(function (host) { hosts.push(host); });
        } catch (e0) { return; }

        hosts.forEach(function (host) {
            if (!host) return;
            var shadowStyle = host.shadowRoot && host.shadowRoot.getElementById('dtu-dark-floating-buttons');

            if (!darkModeEnabled) {
                if (shadowStyle) shadowStyle.remove();
                if (!host.style) return;
                var bg = String(host.style.getPropertyValue('background') || '').toLowerCase();
                var bgColor = String(host.style.getPropertyValue('background-color') || '').toLowerCase();
                var color = String(host.style.getPropertyValue('color') || '').toLowerCase();
                var borderColor = String(host.style.getPropertyValue('border-color') || '').toLowerCase();
                if (host.style.getPropertyPriority('background') === 'important'
                    && /#1a1a1a|rgb\(\s*26\s*,\s*26\s*,\s*26\s*\)/i.test(bg)) {
                    host.style.removeProperty('background');
                }
                if (host.style.getPropertyPriority('background-color') === 'important'
                    && /#1a1a1a|rgb\(\s*26\s*,\s*26\s*,\s*26\s*\)/i.test(bgColor)) {
                    host.style.removeProperty('background-color');
                    host.style.removeProperty('background-image');
                }
                if (host.style.getPropertyPriority('color') === 'important'
                    && /#e0e0e0|rgb\(\s*224\s*,\s*224\s*,\s*224\s*\)/i.test(color)) {
                    host.style.removeProperty('color');
                }
                if (host.style.getPropertyPriority('border-color') === 'important'
                    && /#404040|rgb\(\s*64\s*,\s*64\s*,\s*64\s*\)/i.test(borderColor)) {
                    host.style.removeProperty('border-color');
                }
                return;
            }

            if (host.style) {
                var currentBg = String(host.style.getPropertyValue('background-color') || '').toLowerCase();
                var alreadyDark1 = host.style.getPropertyPriority('background-color') === 'important'
                    && /#1a1a1a|rgb\(\s*26\s*,\s*26\s*,\s*26\s*\)/i.test(currentBg);
                if (!alreadyDark1) {
                    host.style.setProperty('background', '#1a1a1a', 'important');
                    host.style.setProperty('background-color', '#1a1a1a', 'important');
                    host.style.setProperty('background-image', 'none', 'important');
                    host.style.setProperty('color', '#e0e0e0', 'important');
                    host.style.setProperty('border-color', '#404040', 'important');
                }
            }

            if (host.shadowRoot && !shadowStyle) {
                shadowStyle = document.createElement('style');
                shadowStyle.id = 'dtu-dark-floating-buttons';
                shadowStyle.textContent =
                    ':host,.d2l-floating-buttons-container,.d2l-floating-buttons-inner-container'
                    + '{background:#1a1a1a !important;background-color:#1a1a1a !important;'
                    + 'background-image:none !important;color:#e0e0e0 !important;border-color:#404040 !important;}';
                host.shadowRoot.appendChild(shadowStyle);
            }
        });
    }

    function fixDTULearnLegacyLmsToolStyling(rootNode) {
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!isLegacyHeavyPage()) return;

        if (!isDarkModeEnabled()) {
            clearDTULearnLegacyLmsToolInlineDarkBackgrounds(rootNode);
            styleLegacyFloatingButtons(rootNode, false);
            return;
        }

        var scope = (rootNode && rootNode.querySelectorAll) ? rootNode : document;
        // Transparent so these legacy layout cells/links (search header, folder
        // names/dates, "Show Search Options") inherit the page base (dark 1)
        // instead of a solid grey box.
        var legacyBg = 'transparent';
        var selectors = getDTULearnLegacyLmsToolDarkSelectors();

        selectors.forEach(function (selector) {
            var nodes = [];
            try {
                nodes = scope.querySelectorAll(selector);
            } catch (e0) {
                nodes = [];
            }
            nodes.forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background-color', legacyBg, 'important');
                el.style.setProperty('background', legacyBg, 'important');
                el.style.setProperty('background-image', 'none', 'important');
            });
        });
        styleLegacyFloatingButtons(scope, true);
        styleLegacySortButtonShadows(scope);
    }

    // On legacy heavy pages the dark engine skips Brightspace shadow-DOM
    // processing, so sortable column headers (<d2l-table-col-sort-button>) keep
    // their light hover/focus background (white-on-white text). Inject a small
    // dark-hover style straight into each one's shadow root.
    function styleLegacySortButtonShadows(scope) {
        var root = (scope && scope.querySelectorAll) ? scope : document;
        var hosts;
        try { hosts = root.querySelectorAll('d2l-table-col-sort-button'); } catch (e) { return; }
        hosts.forEach(function (host) {
            var sr = host && host.shadowRoot;
            if (!sr || sr.getElementById('dtu-dark-sortbtn')) return;
            var style = document.createElement('style');
            style.id = 'dtu-dark-sortbtn';
            style.textContent =
                'button{background-color:transparent !important;color:#e0e0e0 !important;}'
                + 'button:hover,button:focus,button:active{background-color:#3d3d3d !important;color:#e0e0e0 !important;}';
            sr.appendChild(style);
        });
    }

    globalThis.DTUAfterDarkLearnAccentShell = {
        forceDTULearnAccentInRoot: forceDTULearnAccentInRoot,
        forceDTULearnAccentElements: forceDTULearnAccentElements,
        fixDTULearnLegacyLmsToolStyling: fixDTULearnLegacyLmsToolStyling
    };
})();
