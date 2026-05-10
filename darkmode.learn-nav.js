(function () {
    'use strict';

    function getDeps() {
        try { return globalThis.DTUAfterDarkLearnNavDeps || null; } catch (e0) { return null; }
    }

    function isTopWindow() {
        var deps = getDeps();
        return !!(deps && typeof deps.isTopWindow === 'function' && deps.isTopWindow());
    }

    function isFeatureFlagEnabled(key) {
        var deps = getDeps();
        return !!(deps && typeof deps.isFeatureFlagEnabled === 'function' && deps.isFeatureFlagEnabled(key));
    }

    function isDarkModeEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDarkModeEnabled === 'function' && deps.isDarkModeEnabled());
    }

    function normalizeWhitespace(text) {
        var deps = getDeps();
        if (deps && typeof deps.normalizeWhitespace === 'function') return deps.normalizeWhitespace(text);
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function markExt(el) {
        var deps = getDeps();
        if (el && deps && typeof deps.markExt === 'function') deps.markExt(el);
        return el;
    }

    function deepQueryAll(selector, root) {
        var deps = getDeps();
        if (deps && typeof deps.deepQueryAll === 'function') {
            return deps.deepQueryAll(selector, root);
        }
        if (!selector) return [];
        try {
            return Array.prototype.slice.call((root || document).querySelectorAll(selector));
        } catch (e0) {
            return [];
        }
    }

    function queryFirstDeep(selector, root) {
        var hits = deepQueryAll(selector, root);
        return hits && hits.length ? hits[0] : null;
    }

    function findLearnMainNavWrappers() {
        var wrappers = [];
        var seen = new WeakSet();

        function addWrapper(wrapper) {
            if (!wrapper || seen.has(wrapper)) return;
            seen.add(wrapper);
            wrappers.push(wrapper);
        }

        try {
            deepQueryAll('d2l-labs-navigation-main-footer', document).forEach(function (footer) {
                if (!footer) return;
                try {
                    if (footer.shadowRoot) {
                        footer.shadowRoot.querySelectorAll('.d2l-navigation-s-main-wrapper').forEach(addWrapper);
                    }
                } catch (e0) { }
            });
        } catch (e1) { }

        try {
            deepQueryAll('.d2l-navigation-s-main-wrapper', document).forEach(addWrapper);
        } catch (e2) { }

        wrappers.sort(function (a, b) {
            function score(wrapper) {
                var text = normalizeWhitespace(wrapper ? wrapper.textContent : '').toLowerCase();
                var value = 0;
                if (text.indexOf('atomic search') >= 0) value += 4;
                if (text.indexOf('student resources') >= 0) value += 2;
                if (text.indexOf('more') >= 0) value += 1;
                return value;
            }
            return score(b) - score(a);
        });
        return wrappers;
    }

    function getMainNavWrapper() {
        var wrappers = findLearnMainNavWrappers();
        return wrappers.length ? wrappers[0] : null;
    }

    function showSettingsModal() {
        var deps = getDeps();
        if (deps && typeof deps.showSettingsModal === 'function') deps.showSettingsModal();
    }

    function hideSettingsModal() {
        var deps = getDeps();
        if (deps && typeof deps.hideSettingsModal === 'function') deps.hideSettingsModal();
    }

    function saveDarkModePreference(enabled) {
        var deps = getDeps();
        if (deps && typeof deps.saveDarkModePreference === 'function') deps.saveDarkModePreference(enabled);
    }

    function getLearnNavLinksFeatureKey() {
        var deps = getDeps();
        return deps && deps.featureLearnNavResourceLinksKey;
    }

    function getLibraryUiApi() {
        try { return globalThis.DTUAfterDarkLibraryUi || null; } catch (e0) { return null; }
    }

    function isLibraryEnabled() {
        var deps = getDeps();
        if (!deps || typeof deps.isLibraryEnabled !== 'function') return true;
        return !!deps.isLibraryEnabled();
    }

    function createStableNavChevron() {
        var chevron = document.createElement('span');
        chevron.className = 'dtu-afterdark-nav-chevron';
        chevron.setAttribute('aria-hidden', 'true');
        chevron.style.cssText = [
            'display:inline-block',
            'width:7px',
            'height:7px',
            'box-sizing:border-box',
            'border-right:2px solid currentColor',
            'border-bottom:2px solid currentColor',
            'transform:rotate(45deg) translateY(-2px)',
            'transform-origin:center',
            'margin-left:2px',
            'opacity:.88',
            'flex:0 0 auto',
            'pointer-events:none'
        ].join(';') + ';';
        markExt(chevron);
        return chevron;
    }

    function insertDTULearnNavResourceLinks() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!isFeatureFlagEnabled(getLearnNavLinksFeatureKey())) return;

        function textOf(el) {
            return normalizeWhitespace(el ? el.textContent : '');
        }

        function getNavDropdownTargets(titleRegex) {
            var targets = [];
            var dropdowns = deepQueryAll('.d2l-navigation-s-item d2l-dropdown', document);
            for (var i = 0; i < dropdowns.length; i++) {
                var dd = dropdowns[i];
                var titleEl = dd.querySelector('.d2l-navigation-s-group-text');
                var title = textOf(titleEl) || textOf(dd.querySelector('button'));
                if (!title || !titleRegex.test(title)) continue;

                var menu = dd.querySelector('d2l-dropdown-menu d2l-menu') || dd.querySelector('d2l-menu');
                targets.push({ dropdown: dd, menu: menu });

                if (!menu) {
                    var opener = dd.querySelector('button.d2l-dropdown-opener, button[aria-haspopup="true"]');
                    if (opener && opener.getAttribute('data-dtu-afterdark-menu-hook') !== '1') {
                        opener.setAttribute('data-dtu-afterdark-menu-hook', '1');
                        opener.addEventListener('click', function () {
                            setTimeout(function () { try { insertDTULearnNavResourceLinks(); } catch (e) { } }, 50);
                        });
                    }
                }
            }
            return targets;
        }

        function ensureExternalMenuItem(menu, spec) {
            if (!menu) return false;
            if (menu.querySelector('[data-dtu-afterdark-nav-link="' + spec.id + '"]')) return false;

            var item = document.createElement('d2l-menu-item');
            item.setAttribute('text', spec.text);
            item.setAttribute('role', 'menuitem');
            item.setAttribute('tabindex', '-1');
            item.setAttribute('aria-label', spec.text);
            item.setAttribute('data-dtu-afterdark-nav-link', spec.id);
            markExt(item);

            function openLink() {
                try { window.open(spec.url, '_blank', 'noopener,noreferrer'); } catch (e) { }
            }
            item.addEventListener('click', openLink);
            item.addEventListener('keydown', function (e) {
                if (!e) return;
                if (e.key === 'Enter' || e.key === ' ') openLink();
            });

            var insertBefore = menu.querySelector('d2l-menu-item[last], d2l-menu-item-link[last]') || null;
            if (insertBefore && insertBefore.parentNode === menu) {
                menu.insertBefore(item, insertBefore);
            } else {
                menu.appendChild(item);
            }
            return true;
        }

        function reorderStudentResourcesMenu(menu) {
            if (!menu) return;

            var label = '';
            try { label = String(menu.getAttribute('label') || '').trim(); } catch (e) { }
            if (label && !/^Student Resources$/i.test(label)) return;

            var items = Array.prototype.slice.call(menu.querySelectorAll('d2l-menu-item, d2l-menu-item-link'));
            if (!items.length) return;

            function norm(s) {
                return normalizeWhitespace(String(s || '')).toLowerCase();
            }

            function itemText(it) {
                return norm(it.getAttribute && it.getAttribute('text')) || norm(it.textContent);
            }

            var preferred = [
                'campusnet',
                'final grades',
                'panopto',
                'student email',
                'course evaluation'
            ];

            var chosen = [];
            var used = new Set();

            for (var p = 0; p < preferred.length; p++) {
                var want = preferred[p];
                for (var i = 0; i < items.length; i++) {
                    var it = items[i];
                    if (!it || used.has(it)) continue;
                    if (itemText(it) === want) {
                        chosen.push(it);
                        used.add(it);
                        break;
                    }
                }
            }

            var rest = [];
            for (var j = 0; j < items.length; j++) {
                var it2 = items[j];
                if (!it2 || used.has(it2)) continue;
                rest.push(it2);
            }

            if (!chosen.length) return;

            var seps = Array.prototype.slice.call(menu.querySelectorAll('d2l-menu-item-separator'));
            seps.forEach(function (s) { try { s.remove(); } catch (e) { } });
            items.forEach(function (it3) { try { it3.remove(); } catch (e) { } });

            var rebuilt = chosen.concat(rest);
            rebuilt.forEach(function (it4) { try { menu.appendChild(it4); } catch (e) { } });
            seps.forEach(function (s2) { try { menu.appendChild(s2); } catch (e) { } });

            try {
                rebuilt.forEach(function (it5) { it5.removeAttribute('first'); it5.removeAttribute('last'); });
                if (rebuilt[0]) rebuilt[0].setAttribute('first', 'true');
                if (rebuilt[rebuilt.length - 1]) rebuilt[rebuilt.length - 1].setAttribute('last', 'true');
            } catch (e2) { }
        }

        var panopto = { id: 'panopto', text: 'Panopto', url: 'https://panopto.dtu.dk/Panopto/Pages/Home.aspx' };
        var campusnet = { id: 'campusnet', text: 'CampusNet', url: 'https://campusnet.dtu.dk/cnnet/' };

        getNavDropdownTargets(/^Student Resources$/i).forEach(function (t) { ensureExternalMenuItem(t.menu, panopto); });
        getNavDropdownTargets(/^Student Resources$/i).forEach(function (t) { ensureExternalMenuItem(t.menu, campusnet); });
        getNavDropdownTargets(/^Student Resources$/i).forEach(function (t) { reorderStudentResourcesMenu(t.menu); });
    }

    function removeDTULearnNavResourceLinks() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        deepQueryAll('[data-dtu-afterdark-nav-link]', document).forEach(function (el) {
            try { el.remove(); } catch (e) { }
        });
    }

    function removeDTULearnHelpDropdown() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!/^\/d2l\/home\/?$/.test(window.location.pathname)) return;

        var mainWrapper = queryFirstDeep('.d2l-navigation-s-main-wrapper', document);
        if (!mainWrapper) return;

        var items = [];
        try { items = Array.from(mainWrapper.querySelectorAll('.d2l-navigation-s-item')); } catch (e0) { items = []; }
        items.forEach(function (item) {
            if (!item || !item.querySelector) return;
            if (item.classList && (item.classList.contains('dtu-library-nav-item') || item.classList.contains('dtu-settings-nav-item'))) return;

            var text = '';
            try {
                var textEl = item.querySelector('.d2l-navigation-s-group-text')
                    || item.querySelector('a.d2l-navigation-s-link')
                    || item.querySelector('button.d2l-dropdown-opener');
                text = normalizeWhitespace(textEl ? textEl.textContent : '').toLowerCase();
            } catch (e1) { text = ''; }

            if (text !== 'help') return;
            try { item.remove(); } catch (e2) { }
        });
    }

    function isNavItemHidden(item) {
        if (!item) return true;
        try {
            if (item.getAttribute('data-hidden') === '1') return true;
            if (item.classList && item.classList.contains('d2l-hidden')) return true;
            if (item.style && item.style.display === 'none') return true;
        } catch (e0) { }
        return false;
    }

    function applyAfterDarkNavItemVisibility(navItem) {
        if (!navItem || !navItem.style) return;
        try { navItem.removeAttribute('data-hidden'); } catch (e0) { }
        try {
            if (navItem.classList) navItem.classList.remove('d2l-hidden');
        } catch (e1) { }
        navItem.style.setProperty('display', 'block', 'important');
        navItem.style.setProperty('visibility', 'visible', 'important');
        navItem.style.setProperty('opacity', '1', 'important');
        navItem.style.setProperty('flex', '0 0 auto', 'important');
        navItem.style.setProperty('white-space', 'nowrap', 'important');

        try {
            navItem.querySelectorAll('a, button, span').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('visibility', 'visible', 'important');
                el.style.setProperty('opacity', '1', 'important');
                if (el.matches && el.matches('a, button')) {
                    el.style.setProperty('white-space', 'nowrap', 'important');
                }
            });
        } catch (e2) { }
    }

    function openSettingsModalFromNav(openerBtn, event) {
        try { if (event) event.preventDefault(); } catch (e0) { }
        try { if (event) event.stopPropagation(); } catch (e1) { }
        try { if (event && typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation(); } catch (e2) { }

        var existing = null;
        try { existing = document.querySelector('.dtu-settings-modal-overlay'); } catch (e3) { existing = null; }
        if (existing) {
            try { hideSettingsModal(); } catch (e4) { }
            try { if (openerBtn) openerBtn.setAttribute('aria-expanded', 'false'); } catch (e5) { }
            return false;
        }

        var didOpen = false;
        function tryOpen() {
            if (didOpen) return;
            try {
                var ui = globalThis.DTUAfterDarkSettingsUi || null;
                if (ui && typeof ui.showSettingsModal === 'function') {
                    ui.showSettingsModal();
                    didOpen = true;
                } else {
                    showSettingsModal();
                }
            } catch (e6) {
                try { console.warn('[DTU After Dark] Settings modal open failed', e6); } catch (e7) { }
            }

            try {
                if (document.querySelector('.dtu-settings-modal-overlay')) {
                    didOpen = true;
                    if (openerBtn) openerBtn.setAttribute('aria-expanded', 'true');
                }
            } catch (e8) { }
        }

        tryOpen();
        [60, 180, 420].forEach(function (delay) {
            setTimeout(tryOpen, delay);
        });
        return false;
    }

    function openLibraryPanelFromNav(openerBtn, event) {
        try { if (event) event.preventDefault(); } catch (e0) { }
        try { if (event) event.stopPropagation(); } catch (e1) { }
        try { if (event && typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation(); } catch (e2) { }

        var didToggle = false;
        function tryToggle() {
            if (didToggle) return;
            try {
                var ui = getLibraryUiApi();
                if (!ui || typeof ui.showLibraryPanel !== 'function') return;

                if (document.querySelector('.dtu-library-panel')) {
                    if (typeof ui.hideLibraryPanel === 'function') ui.hideLibraryPanel();
                    if (openerBtn) openerBtn.setAttribute('aria-expanded', 'false');
                } else {
                    ui.showLibraryPanel(openerBtn);
                    if (!document.querySelector('.dtu-library-panel')) return;
                    if (openerBtn) openerBtn.setAttribute('aria-expanded', 'true');
                }
                didToggle = true;
            } catch (e3) {
                try { console.warn('[DTU After Dark] Library panel open failed', e3); } catch (e4) { }
            }
        }

        tryToggle();
        [60, 180, 420].forEach(function (delay) {
            setTimeout(tryToggle, delay);
        });
        return false;
    }

    function configureAfterDarkLibraryNavItem(navItem) {
        if (!navItem) return;
        navItem.className = 'd2l-navigation-s-item dtu-library-nav-item';
        navItem.setAttribute('role', 'listitem');
        markExt(navItem);

        while (navItem.firstChild) {
            try { navItem.removeChild(navItem.firstChild); } catch (e0) { break; }
        }

        var dropdown = document.createElement('d2l-dropdown');
        markExt(dropdown);

        var openerBtn = document.createElement('button');
        openerBtn.className = 'd2l-navigation-s-group d2l-dropdown-opener';
        openerBtn.setAttribute('aria-expanded', 'false');
        openerBtn.setAttribute('aria-haspopup', 'true');
        markExt(openerBtn);

        var wrapper = document.createElement('span');
        wrapper.className = 'd2l-navigation-s-group-wrapper';
        var textSpan = document.createElement('span');
        textSpan.className = 'd2l-navigation-s-group-text';
        textSpan.textContent = 'Library';
        var chevron = createStableNavChevron();

        wrapper.appendChild(textSpan);
        wrapper.appendChild(chevron);
        openerBtn.appendChild(wrapper);
        dropdown.appendChild(openerBtn);
        navItem.appendChild(dropdown);

        function blockD2LDropdown(event) {
            try { event.stopPropagation(); } catch (e1) { }
            try { if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation(); } catch (e2) { }
        }

        openerBtn.addEventListener('pointerdown', blockD2LDropdown, true);
        openerBtn.addEventListener('mousedown', blockD2LDropdown, true);
        openerBtn.addEventListener('click', function (event) {
            return openLibraryPanelFromNav(openerBtn, event);
        }, true);
        openerBtn.addEventListener('keydown', function (event) {
            if (!event) return;
            if (event.key === 'Enter' || event.key === ' ') {
                return openLibraryPanelFromNav(openerBtn, event);
            }
        }, true);

        applyAfterDarkNavItemVisibility(navItem);
    }

    function insertLibraryNavItem() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;

        if (!isLibraryEnabled()) {
            deepQueryAll('.dtu-library-nav-item', document).forEach(function (item) {
                try { item.remove(); } catch (e0) { }
            });
            return;
        }

        var mainWrapper = getMainNavWrapper();
        if (!mainWrapper) return;

        var existing = null;
        try { existing = mainWrapper.querySelector('.dtu-library-nav-item'); } catch (e1) { existing = null; }
        if (!existing) {
            try { existing = queryFirstDeep('.dtu-library-nav-item', document); } catch (e2) { existing = null; }
        }

        if (existing) {
            configureAfterDarkLibraryNavItem(existing);
            placeLibraryNavItem(mainWrapper, existing);
            return;
        }

        var navItem = document.createElement('div');
        navItem.className = 'd2l-navigation-s-item dtu-library-nav-item';
        navItem.setAttribute('role', 'listitem');
        markExt(navItem);

        configureAfterDarkLibraryNavItem(navItem);
        placeLibraryNavItem(mainWrapper, navItem);
    }

    function configureAfterDarkSettingsNavItem(navItem, mainWrapper) {
        if (!navItem) return;
        navItem.className = 'd2l-navigation-s-item dtu-settings-nav-item';
        navItem.setAttribute('role', 'listitem');
        markExt(navItem);

        while (navItem.firstChild) {
            try { navItem.removeChild(navItem.firstChild); } catch (e0) { break; }
        }

        var dropdown = document.createElement('d2l-dropdown');
        markExt(dropdown);

        var openerBtn = document.createElement('button');
        openerBtn.className = 'd2l-navigation-s-group d2l-dropdown-opener';
        openerBtn.setAttribute('aria-expanded', 'false');
        openerBtn.setAttribute('aria-haspopup', 'true');
        markExt(openerBtn);

        var wrapper = document.createElement('span');
        wrapper.className = 'd2l-navigation-s-group-wrapper';
        var textSpan = document.createElement('span');
        textSpan.className = 'd2l-navigation-s-group-text';
        textSpan.textContent = 'Settings';
        var chevron = createStableNavChevron();

        wrapper.appendChild(textSpan);
        wrapper.appendChild(chevron);
        openerBtn.appendChild(wrapper);
        dropdown.appendChild(openerBtn);
        navItem.appendChild(dropdown);

        function blockD2LDropdown(event) {
            try { event.stopPropagation(); } catch (e1) { }
            try { if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation(); } catch (e2) { }
        }

        openerBtn.addEventListener('pointerdown', blockD2LDropdown, true);
        openerBtn.addEventListener('mousedown', blockD2LDropdown, true);
        openerBtn.addEventListener('click', function (event) {
            return openSettingsModalFromNav(openerBtn, event);
        }, true);
        openerBtn.addEventListener('keydown', function (event) {
            if (!event) return;
            if (event.key === 'Enter' || event.key === ' ') {
                return openSettingsModalFromNav(openerBtn, event);
            }
        }, true);

        applyAfterDarkNavItemVisibility(navItem);
    }

    function insertSettingsNavItem() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;

        var mainWrapper = getMainNavWrapper();
        if (!mainWrapper) return;

        var existing = null;
        try { existing = mainWrapper.querySelector('.dtu-settings-nav-item'); } catch (e0) { existing = null; }
        if (!existing) {
            try { existing = queryFirstDeep('.dtu-settings-nav-item', document); } catch (e1) { existing = null; }
        }
        if (existing) {
            configureAfterDarkSettingsNavItem(existing, mainWrapper);
            placeAfterDarkNavItem(mainWrapper, existing);
            return;
        }

        var navItem = document.createElement('div');
        navItem.className = 'd2l-navigation-s-item dtu-settings-nav-item';
        navItem.setAttribute('role', 'listitem');
        markExt(navItem);

        configureAfterDarkSettingsNavItem(navItem, mainWrapper);
        placeAfterDarkNavItem(mainWrapper, navItem);
    }

    function getAtomicSearchNavItem(mainWrapper) {
        if (!mainWrapper || !mainWrapper.querySelectorAll) return null;
        var items = [];
        try {
            items = Array.from(mainWrapper.children || []).filter(function (child) {
                return child && child.classList && child.classList.contains('d2l-navigation-s-item');
            });
        } catch (e0) { items = []; }
        if (!items.length) {
            try { items = Array.from(mainWrapper.querySelectorAll('.d2l-navigation-s-item')); } catch (e1) { items = []; }
        }
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var text = normalizeWhitespace(item ? item.textContent : '').toLowerCase();
            if (text === 'atomic search') return item;
            try {
                if (item.querySelector('a[href*="framedName=Atomic+Search"], a[href*="Atomic+Search"]')) return item;
            } catch (e1) { }
        }
        return null;
    }

    function getHelpNavItem(mainWrapper) {
        if (!mainWrapper || !mainWrapper.querySelectorAll) return null;
        var items = [];
        try {
            items = Array.from(mainWrapper.children || []).filter(function (child) {
                return child && child.classList && child.classList.contains('d2l-navigation-s-item');
            });
        } catch (e0) { items = []; }
        if (!items.length) {
            try { items = Array.from(mainWrapper.querySelectorAll('.d2l-navigation-s-item')); } catch (e1) { items = []; }
        }
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (isNavItemHidden(item)) continue;
            var text = normalizeWhitespace(item ? item.textContent : '').toLowerCase();
            if (text === 'help') return item;
        }
        return null;
    }

    function getSettingsNavItem(mainWrapper) {
        if (!mainWrapper || !mainWrapper.querySelectorAll) return null;
        var items = [];
        try {
            items = Array.from(mainWrapper.children || []).filter(function (child) {
                return child && child.classList && child.classList.contains('d2l-navigation-s-item');
            });
        } catch (e0) { items = []; }
        if (!items.length) {
            try { items = Array.from(mainWrapper.querySelectorAll('.d2l-navigation-s-item')); } catch (e1) { items = []; }
        }
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (isNavItemHidden(item)) continue;
            if (item.classList && item.classList.contains('dtu-settings-nav-item')) return item;
            var text = normalizeWhitespace(item ? item.textContent : '').toLowerCase();
            if (text === 'settings') return item;
        }
        return null;
    }

    function placeLibraryNavItem(mainWrapper, navItem) {
        if (!mainWrapper || !navItem) return;
        applyAfterDarkNavItemVisibility(navItem);

        var settingsItem = getSettingsNavItem(mainWrapper);
        if (settingsItem && settingsItem.parentNode === mainWrapper && !isNavItemHidden(settingsItem)) {
            if (settingsItem.nextSibling !== navItem) {
                mainWrapper.insertBefore(navItem, settingsItem.nextSibling);
            }
            return;
        }

        placeAfterDarkNavItem(mainWrapper, navItem);
    }

    function placeAfterDarkNavItem(mainWrapper, navItem) {
        if (!mainWrapper || !navItem) return;
        applyAfterDarkNavItemVisibility(navItem);
        var atomicItem = getAtomicSearchNavItem(mainWrapper);
        if (atomicItem && atomicItem.parentNode === mainWrapper && !isNavItemHidden(atomicItem)) {
            if (atomicItem.nextSibling !== navItem) {
                mainWrapper.insertBefore(navItem, atomicItem.nextSibling);
            }
            return;
        }

        var helpItem = getHelpNavItem(mainWrapper);
        if (helpItem && helpItem.parentNode === mainWrapper) {
            if (helpItem.nextSibling !== navItem) {
                mainWrapper.insertBefore(navItem, helpItem.nextSibling);
            }
            return;
        }

        if (atomicItem && atomicItem.parentNode === mainWrapper) {
            if (atomicItem.nextSibling !== navItem) {
                mainWrapper.insertBefore(navItem, atomicItem.nextSibling);
            }
            return;
        }

        var moreItem = mainWrapper.querySelector('.d2l-navigation-s-more') || queryFirstDeep('.d2l-navigation-s-more', mainWrapper);
        if (moreItem && moreItem.parentNode === mainWrapper) {
            mainWrapper.insertBefore(navItem, moreItem);
        } else {
            mainWrapper.appendChild(navItem);
        }
    }

    var _learnNavBootstrapTimer = null;
    var _learnNavBootstrapAttempts = 0;
    var QUICK_ACCESS_ID = 'dtu-after-dark-quick-access';
    var QUICK_ACCESS_STYLE_ID = 'dtu-after-dark-quick-access-style';

    function ensureQuickAccessStyles() {
        if (document.getElementById(QUICK_ACCESS_STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = QUICK_ACCESS_STYLE_ID;
        style.textContent = ''
            + '#' + QUICK_ACCESS_ID + '{position:fixed;top:88px;right:16px;z-index:2147483645;display:flex;gap:8px;align-items:center;flex-wrap:wrap;'
            + 'padding:10px 12px;border-radius:14px;background:rgba(24,24,24,0.94);border:1px solid rgba(255,255,255,0.12);'
            + 'box-shadow:0 12px 30px rgba(0,0,0,0.28);backdrop-filter:blur(8px);}'
            + '#' + QUICK_ACCESS_ID + ' button{appearance:none;border:1px solid rgba(255,255,255,0.14);background:#2a2a2a;color:#f3f3f3;'
            + 'padding:8px 12px;border-radius:999px;font:600 13px/1.1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;}'
            + '#' + QUICK_ACCESS_ID + ' button:hover{border-color:var(--dtu-ad-accent,#990000);color:#ffffff;background:#333333;}'
            + '#' + QUICK_ACCESS_ID + ' .dtu-after-dark-primary{background:var(--dtu-ad-accent-deep,#7d0000);border-color:var(--dtu-ad-accent-deep,#7d0000);color:#ffffff;}'
            + '#' + QUICK_ACCESS_ID + ' .dtu-after-dark-primary:hover{background:var(--dtu-ad-accent,#990000);border-color:var(--dtu-ad-accent,#990000);}'
            + '@media (max-width: 900px){#' + QUICK_ACCESS_ID + '{top:auto;bottom:16px;right:16px;left:16px;justify-content:flex-end;}}';
        (document.head || document.documentElement).appendChild(style);
    }

    function removeLearnQuickAccessFallback() {
        var existing = document.getElementById(QUICK_ACCESS_ID);
        if (existing) {
            try { existing.remove(); } catch (e0) { }
        }
    }

    function ensureLearnQuickAccessFallback() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (queryFirstDeep('.dtu-settings-nav-item', document)) {
            removeLearnQuickAccessFallback();
            return;
        }

        ensureQuickAccessStyles();
        var existing = document.getElementById(QUICK_ACCESS_ID);
        if (existing) {
            var darkBtnExisting = existing.querySelector('[data-role="dark-toggle"]');
            if (darkBtnExisting) {
                darkBtnExisting.textContent = isDarkModeEnabled() ? 'Dark: On' : 'Dark: Off';
            }
            return;
        }

        var wrap = document.createElement('div');
        wrap.id = QUICK_ACCESS_ID;
        markExt(wrap);

        var settingsBtn = document.createElement('button');
        settingsBtn.type = 'button';
        settingsBtn.className = 'dtu-after-dark-primary';
        settingsBtn.textContent = 'After Dark Settings';
        settingsBtn.addEventListener('click', function () {
            try { showSettingsModal(); } catch (e0) { }
        });

        var darkBtn = document.createElement('button');
        darkBtn.type = 'button';
        darkBtn.setAttribute('data-role', 'dark-toggle');
        darkBtn.textContent = isDarkModeEnabled() ? 'Dark: On' : 'Dark: Off';
        darkBtn.addEventListener('click', function () {
            var next = !isDarkModeEnabled();
            try { saveDarkModePreference(next); } catch (e0) { }
            darkBtn.textContent = next ? 'Dark: On' : 'Dark: Off';
            try { window.location.reload(); } catch (e1) { }
        });

        var libraryBtn = document.createElement('button');
        libraryBtn.type = 'button';
        libraryBtn.textContent = 'Library';
        libraryBtn.addEventListener('click', function () {
            var api = getLibraryUiApi();
            if (api && typeof api.showLibraryPanel === 'function') {
                try { api.showLibraryPanel(libraryBtn); } catch (e0) { }
            }
        });

        wrap.appendChild(settingsBtn);
        wrap.appendChild(darkBtn);
        wrap.appendChild(libraryBtn);
        (document.body || document.documentElement).appendChild(wrap);
    }

    function runLearnNavBootstrapPass() {
        if (!isTopWindow()) return false;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return false;

        try { removeDTULearnHelpDropdown(); } catch (e0) { }
        try { insertSettingsNavItem(); } catch (e1) { }
        try { insertLibraryNavItem(); } catch (e2) { }
        try { insertDTULearnNavResourceLinks(); } catch (e3) { }
        try { ensureLearnQuickAccessFallback(); } catch (e4) { }

        var mainWrapper = getMainNavWrapper();
        var hasSettings = !!(mainWrapper && mainWrapper.querySelector && mainWrapper.querySelector('.dtu-settings-nav-item'));
        var hasLibrary = !isLibraryEnabled() || !!(mainWrapper && mainWrapper.querySelector && mainWrapper.querySelector('.dtu-library-nav-item'));
        var hasStudentResources = !!mainWrapper;
        return hasSettings && hasLibrary && hasStudentResources;
    }

    function scheduleLearnNavBootstrap() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (_learnNavBootstrapTimer) return;

        _learnNavBootstrapAttempts = 0;
        _learnNavBootstrapTimer = setInterval(function () {
            _learnNavBootstrapAttempts++;
            var done = false;
            try { done = runLearnNavBootstrapPass(); } catch (e0) { done = false; }
            if ((done && _learnNavBootstrapAttempts >= 10) || _learnNavBootstrapAttempts >= 60) {
                clearInterval(_learnNavBootstrapTimer);
                _learnNavBootstrapTimer = null;
            }
        }, 400);
    }

    try {
        globalThis.DTUAfterDarkLearnNavUi = {
            insertDTULearnNavResourceLinks: insertDTULearnNavResourceLinks,
            removeDTULearnNavResourceLinks: removeDTULearnNavResourceLinks,
            removeDTULearnHelpDropdown: removeDTULearnHelpDropdown,
            insertSettingsNavItem: insertSettingsNavItem,
            insertLibraryNavItem: insertLibraryNavItem
        };
    } catch (eExpose) { }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleLearnNavBootstrap, { once: true });
    } else {
        scheduleLearnNavBootstrap();
    }
    window.addEventListener('load', scheduleLearnNavBootstrap);
    window.addEventListener('pageshow', function () {
        setTimeout(function () { try { runLearnNavBootstrapPass(); } catch (e0) { } }, 60);
    });
    window.addEventListener('focus', function () {
        setTimeout(function () { try { runLearnNavBootstrapPass(); } catch (e0) { } }, 80);
    });
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) return;
        setTimeout(function () { try { runLearnNavBootstrapPass(); } catch (e0) { } }, 100);
    });
})();
