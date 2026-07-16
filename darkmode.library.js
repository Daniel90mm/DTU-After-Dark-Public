(function () {
    'use strict';

    function getDeps() {
        try { return globalThis.DTUAfterDarkLibraryDeps || null; } catch (e0) { return null; }
    }

    function readState() {
        var deps = getDeps();
        if (!deps || typeof deps.getLibraryUiState !== 'function') return {};
        return deps.getLibraryUiState() || {};
    }

    function writeState(patch) {
        var deps = getDeps();
        if (!deps || typeof deps.setLibraryUiState !== 'function') return;
        deps.setLibraryUiState(patch || {});
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

    function normalizeWhitespace(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
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

    function isNavItemHidden(item) {
        if (!item) return true;
        try {
            if (item.getAttribute('data-hidden') === '1') return true;
            if (item.classList && item.classList.contains('d2l-hidden')) return true;
            if (item.style && item.style.display === 'none') return true;
        } catch (e0) { }
        return false;
    }

    function applyLibraryNavItemVisibility(navItem) {
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

    function createStableLibraryNavChevron() {
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

    function getNavItemByText(mainWrapper, label) {
        if (!mainWrapper || !mainWrapper.querySelectorAll) return null;
        var wanted = normalizeWhitespace(label).toLowerCase();
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
            if (text === wanted) return item;
        }
        return null;
    }

    function getAtomicSearchNavItem(mainWrapper) {
        if (!mainWrapper || !mainWrapper.querySelectorAll) return null;
        var atomic = getNavItemByText(mainWrapper, 'Atomic Search');
        if (atomic) return atomic;
        try {
            var links = mainWrapper.querySelectorAll('a[href*="framedName=Atomic+Search"], a[href*="Atomic+Search"]');
            if (links && links[0]) return links[0].closest('.d2l-navigation-s-item');
        } catch (e0) { }
        return null;
    }

    function placeLibraryNavItem(mainWrapper, navItem) {
        if (!mainWrapper || !navItem) return;
        applyLibraryNavItemVisibility(navItem);

        var settingsItem = getNavItemByText(mainWrapper, 'Settings');
        if (settingsItem && settingsItem.parentNode === mainWrapper && !isNavItemHidden(settingsItem)) {
            if (settingsItem.nextSibling !== navItem) {
                mainWrapper.insertBefore(navItem, settingsItem.nextSibling);
            }
            return;
        }

        var atomicItem = getAtomicSearchNavItem(mainWrapper);
        if (atomicItem && atomicItem.parentNode === mainWrapper && !isNavItemHidden(atomicItem)) {
            if (atomicItem.nextSibling !== navItem) {
                mainWrapper.insertBefore(navItem, atomicItem.nextSibling);
            }
            return;
        }

        var helpItem = getNavItemByText(mainWrapper, 'Help');
        if (helpItem && helpItem.parentNode === mainWrapper) {
            if (helpItem.nextSibling !== navItem) {
                mainWrapper.insertBefore(navItem, helpItem.nextSibling);
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

    function formatLibraryOccupancyCount(value) {
        var deps = getDeps();
        if (deps && typeof deps.formatLibraryOccupancyCount === 'function') {
            return deps.formatLibraryOccupancyCount(value);
        }
        if (typeof value !== 'number' || !isFinite(value)) return '--';
        try { return value.toLocaleString('en-GB'); } catch (e0) { return String(value); }
    }

    function ensureLibraryFallbackStyles() {
        if (document.getElementById('dtu-library-fallback-style')) return;
        var host = document.head || document.documentElement;
        if (!host) return;
        var style = document.createElement('style');
        style.id = 'dtu-library-fallback-style';
        markExt(style);
        style.textContent = ''
            + '.dtu-library-modal-overlay{position:fixed!important;inset:0!important;z-index:1000000!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:20px!important;background:rgba(0,0,0,.18)!important;backdrop-filter:blur(4px)!important;-webkit-backdrop-filter:blur(4px)!important;}'
            + '.dtu-library-panel{display:flex!important;flex-direction:column!important;overflow:hidden!important;width:min(980px,calc(100vw - 40px))!important;max-height:calc(100vh - 80px)!important;border-radius:14px!important;background:#181818!important;border:1px solid #404040!important;color:#e8e8e8!important;box-shadow:0 20px 60px rgba(0,0,0,.7)!important;}'
            + '.dtu-library-header{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;padding:14px 18px 12px!important;border-bottom:1px solid #404040!important;}'
            + '.dtu-library-title{font-size:21px!important;font-weight:760!important;color:#e8e8e8!important;}'
            + '.dtu-library-header-actions{display:flex!important;align-items:center!important;gap:8px!important;}'
            + '.dtu-library-close,.dtu-library-header-occ-refresh{border:1px solid #4a4a4a!important;background:#242424!important;color:#e8e8e8!important;border-radius:7px!important;cursor:pointer!important;}'
            + '.dtu-library-close{font-size:26px!important;line-height:1!important;min-width:34px!important;min-height:30px!important;}'
            + '.dtu-library-content{padding:18px 22px 20px!important;overflow:auto!important;}'
            + '.dtu-library-layout{display:flex!important;flex-direction:column!important;gap:14px!important;}'
            + '.dtu-library-section{padding:12px!important;background:#2d2d2d!important;border:1px solid #404040!important;border-radius:10px!important;}'
            + '.dtu-library-section-title{font-size:12px!important;font-weight:700!important;text-transform:uppercase!important;color:#a3acb8!important;}'
            + '.dtu-library-link-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px 20px!important;}'
            + '.dtu-library-link-item{display:grid!important;grid-template-columns:18px minmax(0,1fr) 14px!important;align-items:center!important;gap:12px!important;min-height:58px!important;padding:10px 4px!important;color:#e8e8e8!important;text-decoration:none!important;}'
            + '.dtu-library-link-icon svg,.dtu-library-link-arrow svg{width:18px!important;height:18px!important;stroke:currentColor!important;fill:none!important;}'
            + '.dtu-library-link-label{font-size:13px!important;font-weight:700!important;color:#e8e8e8!important;}'
            + '.dtu-library-link-meta,.dtu-library-item-meta,.dtu-library-state-msg{font-size:11px!important;color:#9aa0aa!important;}'
            + '.dtu-library-feed-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important;}'
            + '.dtu-library-feed-body{display:flex!important;flex-direction:column!important;gap:8px!important;}'
            + '.dtu-library-feed-item{display:flex!important;gap:10px!important;color:#e8e8e8!important;text-decoration:none!important;}'
            + '.dtu-library-item-title{font-size:13px!important;font-weight:700!important;color:#e8e8e8!important;}'
            + '@media(max-width:900px){.dtu-library-link-grid,.dtu-library-feed-grid{grid-template-columns:1fr!important;}}';
        host.appendChild(style);
    }

    function extractLibraryCurrentSnapshot(crowdingResp, fallbackOccupancyResp) {
        var deps = getDeps();
        if (!deps || typeof deps.extractLibraryCurrentSnapshot !== 'function') return null;
        return deps.extractLibraryCurrentSnapshot(crowdingResp, fallbackOccupancyResp);
    }

    function removeLibraryNavDropdown() {
        var item = queryFirstDeep('.dtu-library-nav-item', document);
        if (item) item.remove();
        hideLibraryPanel();
    }

    function hideLibraryPanel() {
        var overlay = document.querySelector('.dtu-library-modal-overlay');
        if (overlay) overlay.remove();
        var panel = document.querySelector('.dtu-library-panel');
        if (panel) panel.remove();
        var backdrop = document.querySelector('.dtu-library-backdrop');
        if (backdrop) backdrop.remove();

        var state = readState();
        if (state.escHandler) {
            try { document.removeEventListener('keydown', state.escHandler); } catch (eEsc) { }
        }
        if (state.occupancyAutoTimer) {
            clearInterval(state.occupancyAutoTimer);
        }
        writeState({ escHandler: null, occupancyAutoTimer: null });

        deepQueryAll('.dtu-library-nav-item .d2l-dropdown-opener[aria-expanded="true"]', document).forEach(function (btn) {
            btn.setAttribute('aria-expanded', 'false');
        });
    }

    function insertLibraryNavDropdown() {
        var deps = getDeps();
        if (!deps || typeof deps.isTopWindow !== 'function' || !deps.isTopWindow()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (typeof deps.isLibraryEnabled !== 'function' || !deps.isLibraryEnabled()) {
            removeLibraryNavDropdown();
            return;
        }

        var mainWrapper = getMainNavWrapper();
        if (!mainWrapper) return;

        var navItem = null;
        try { navItem = mainWrapper.querySelector('.dtu-library-nav-item'); } catch (e0) { navItem = null; }
        if (!navItem) {
            try { navItem = queryFirstDeep('.dtu-library-nav-item', document); } catch (e1) { navItem = null; }
        }
        if (!navItem) {
            navItem = document.createElement('div');
        }

        navItem.className = 'd2l-navigation-s-item dtu-library-nav-item';
        navItem.setAttribute('role', 'listitem');
        markExt(navItem);

        while (navItem.firstChild) {
            try { navItem.removeChild(navItem.firstChild); } catch (e2) { break; }
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
        var chevron = createStableLibraryNavChevron();

        wrapper.appendChild(textSpan);
        wrapper.appendChild(chevron);
        openerBtn.appendChild(wrapper);
        dropdown.appendChild(openerBtn);
        navItem.appendChild(dropdown);

        placeLibraryNavItem(mainWrapper, navItem);

        function blockD2LDropdown(event) {
            try { event.stopPropagation(); } catch (e3) { }
            try { if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation(); } catch (e4) { }
        }

        function openLibraryFromNav(e) {
            try { e.preventDefault(); } catch (e5) { }
            try { e.stopPropagation(); } catch (e6) { }
            try { if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation(); } catch (e7) { }
            if (document.querySelector('.dtu-library-panel')) {
                hideLibraryPanel();
                openerBtn.setAttribute('aria-expanded', 'false');
            } else {
                showLibraryPanel(openerBtn);
                openerBtn.setAttribute('aria-expanded', 'true');
            }
            return false;
        }

        openerBtn.addEventListener('pointerdown', blockD2LDropdown, true);
        openerBtn.addEventListener('mousedown', blockD2LDropdown, true);
        openerBtn.addEventListener('click', openLibraryFromNav, true);
        openerBtn.addEventListener('keydown', function (event) {
            if (!event) return;
            if (event.key === 'Enter' || event.key === ' ') {
                return openLibraryFromNav(event);
            }
        }, true);

        applyLibraryNavItemVisibility(navItem);
    }

    var _libraryNavBootstrapTimer = null;
    var _libraryNavBootstrapAttempts = 0;

    function runLibraryNavBootstrapPass() {
        var deps = getDeps();
        if (!deps || typeof deps.isTopWindow !== 'function' || !deps.isTopWindow()) return false;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return false;

        try { insertLibraryNavDropdown(); } catch (e0) { }
        return !!queryFirstDeep('.dtu-library-nav-item', document);
    }

    function scheduleLibraryNavBootstrap() {
        var deps = getDeps();
        if (!deps || typeof deps.isTopWindow !== 'function' || !deps.isTopWindow()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (_libraryNavBootstrapTimer) return;

        _libraryNavBootstrapAttempts = 0;
        _libraryNavBootstrapTimer = setInterval(function () {
            _libraryNavBootstrapAttempts++;
            var done = false;
            try { done = runLibraryNavBootstrapPass(); } catch (e0) { done = false; }
            if ((done && _libraryNavBootstrapAttempts >= 10) || _libraryNavBootstrapAttempts >= 60) {
                clearInterval(_libraryNavBootstrapTimer);
                _libraryNavBootstrapTimer = null;
            }
        }, 400);
    }

    function getLibraryQuickLinkIconSvg(iconName) {
        switch (String(iconName || '')) {
            case 'room':
                return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V20"/><path d="M7.5 20v-5.5h9V20"/><path d="M8 10h.01"/><path d="M16 10h.01"/></svg>';
            case 'bookings':
                return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6h13"/><path d="M7 12h13"/><path d="M7 18h13"/><path d="M3.5 6h.01"/><path d="M3.5 12h.01"/><path d="M3.5 18h.01"/></svg>';
            case 'search':
                return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>';
            case 'print':
                return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V4h10v4"/><path d="M7 17H5.5A1.5 1.5 0 0 1 4 15.5v-4A1.5 1.5 0 0 1 5.5 10h13a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H17"/><path d="M7 14h10v6H7z"/></svg>';
            case 'events':
                return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v3"/><path d="M17 4v3"/><path d="M4 9h16"/><path d="M5.5 6.5h13A1.5 1.5 0 0 1 20 8v10.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5V8a1.5 1.5 0 0 1 1.5-1.5Z"/><path d="M9 13h2"/><path d="M13 13h2"/><path d="M9 16h6"/></svg>';
            case 'news':
                return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5.5h9.5A1.5 1.5 0 0 1 17 7v10.5A1.5 1.5 0 0 1 15.5 19h-9A1.5 1.5 0 0 1 5 17.5V6.5A1 1 0 0 1 6 5.5Z"/><path d="M17 8.5h1.5A1.5 1.5 0 0 1 20 10v7.5a1.5 1.5 0 0 1-1.5 1.5H17"/><path d="M8 9h6"/><path d="M8 12h6"/><path d="M8 15h4"/></svg>';
            default:
                return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></svg>';
        }
    }

    function appendLibraryQuickLinkIcon(target, iconName) {
        if (!target || typeof DOMParser !== 'function') return;
        try {
            var doc = new DOMParser().parseFromString(getLibraryQuickLinkIconSvg(iconName), 'image/svg+xml');
            var svg = doc && doc.documentElement;
            if (!svg || String(svg.nodeName || '').toLowerCase() !== 'svg') return;
            target.appendChild(document.importNode(svg, true));
        } catch (e0) { }
    }

    function showLibraryPanel(anchorBtn) {
        var deps = getDeps() || {};

        hideLibraryPanel();
        ensureLibraryFallbackStyles();
        if (typeof deps.ensureLibraryRuntimeStyles === 'function') {
            try { deps.ensureLibraryRuntimeStyles(); } catch (eStyle) { }
        }

        var overlay = document.createElement('div');
        overlay.className = 'dtu-library-modal-overlay';
        markExt(overlay);
        overlay.addEventListener('mousedown', function (e) {
            if (e.target !== overlay) return;
            hideLibraryPanel();
            if (anchorBtn) anchorBtn.setAttribute('aria-expanded', 'false');
        });

        var escHandler = function (e) {
            if (!e || e.key !== 'Escape') return;
            hideLibraryPanel();
            if (anchorBtn) anchorBtn.setAttribute('aria-expanded', 'false');
        };
        document.addEventListener('keydown', escHandler);
        writeState({ escHandler: escHandler });

        var panel = document.createElement('div');
        panel.className = 'dtu-library-panel';
        markExt(panel);

        var header = document.createElement('div');
        header.className = 'dtu-library-header';

        var headerMain = document.createElement('div');
        headerMain.className = 'dtu-library-header-main';

        var headerTitle = document.createElement('div');
        headerTitle.className = 'dtu-library-title';
        headerTitle.textContent = 'DTU Library';

        var headerOccupancy = createLibraryHeaderOccupancy();
        var headerActions = document.createElement('div');
        headerActions.className = 'dtu-library-header-actions';

        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'dtu-library-close';
        closeBtn.textContent = '×';
        closeBtn.title = 'Close';
        closeBtn.addEventListener('click', function () {
            hideLibraryPanel();
            if (anchorBtn) anchorBtn.setAttribute('aria-expanded', 'false');
        });

        headerMain.appendChild(headerTitle);
        headerActions.appendChild(headerOccupancy.updatedEl);
        headerActions.appendChild(headerOccupancy.refreshBtn);
        headerActions.appendChild(closeBtn);
        header.appendChild(headerMain);
        header.appendChild(headerActions);
        panel.appendChild(header);

        var content = document.createElement('div');
        content.className = 'dtu-library-content';
        var layout = document.createElement('div');
        layout.className = 'dtu-library-layout';

        var trendSection = null;
        if (typeof deps.createLibraryTrendSection === 'function') {
            try { trendSection = deps.createLibraryTrendSection(); } catch (eTrendCreate) { trendSection = null; }
        }
        if (!trendSection || !trendSection.container) {
            trendSection = createLibraryFallbackTrendSection('Library occupancy is unavailable right now.');
        }
        layout.appendChild(trendSection.container);

        var linksSection = document.createElement('div');
        linksSection.className = 'dtu-library-section dtu-library-links-section';

        var linksHeader = document.createElement('div');
        linksHeader.className = 'dtu-library-section-header dtu-library-links-header';

        var linksTitleWrap = document.createElement('div');
        linksTitleWrap.className = 'dtu-library-links-title-wrap';

        var linksTitle = document.createElement('div');
        linksTitle.className = 'dtu-library-section-title';
        linksTitle.textContent = 'Library Menu';

        var linksSubtitle = document.createElement('div');
        linksSubtitle.className = 'dtu-library-links-subtitle';
        linksSubtitle.textContent = 'Bookings, search, printing, events, and updates.';

        linksTitleWrap.appendChild(linksTitle);
        linksTitleWrap.appendChild(linksSubtitle);
        linksHeader.appendChild(linksTitleWrap);
        linksSection.appendChild(linksHeader);

        var links = [
            { text: 'Book Study Room', meta: 'Reserve a study space in Lyngby.', url: 'https://www.supersaas.com/schedule/DTU_Library/Study_Areas_-_Lyngby', icon: 'room' },
            { text: 'All Library Bookings', meta: 'Open the full bookings overview.', url: 'https://www.supersaas.com/schedule/DTU_Library/', icon: 'bookings' },
            { text: 'DTU FindIt', meta: 'Search books, journals, and databases.', url: 'https://findit.dtu.dk/', icon: 'search' },
            { text: 'Printing', meta: 'Manage printing and print balance.', url: 'https://databar.dtu.dk/print', icon: 'print' },
            { text: 'Events Calendar', meta: 'See workshops, talks, and sessions.', url: 'https://www.bibliotek.dtu.dk/en/use-the-library/events/calendar', icon: 'events' },
            { text: 'Library News', meta: 'Read the latest library updates.', url: 'https://www.bibliotek.dtu.dk/en/news', icon: 'news' }
        ];

        var linksGrid = document.createElement('div');
        linksGrid.className = 'dtu-library-link-grid';

        links.forEach(function (lnk) {
            var a = document.createElement('a');
            a.className = 'dtu-library-link-item';
            a.href = lnk.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.setAttribute('aria-label', lnk.meta ? (lnk.text + '. ' + lnk.meta) : lnk.text);

            var icon = document.createElement('span');
            icon.className = 'dtu-library-link-icon';
            appendLibraryQuickLinkIcon(icon, lnk.icon);

            var contentWrap = document.createElement('span');
            contentWrap.className = 'dtu-library-link-content';

            var label = document.createElement('span');
            label.className = 'dtu-library-link-label';
            label.textContent = lnk.text;

            var meta = document.createElement('span');
            meta.className = 'dtu-library-link-meta';
            meta.textContent = lnk.meta || '';

            var arrow = document.createElement('span');
            arrow.className = 'dtu-library-link-arrow';
            appendLibraryQuickLinkIcon(arrow, 'arrow');

            contentWrap.appendChild(label);
            contentWrap.appendChild(meta);
            a.appendChild(icon);
            a.appendChild(contentWrap);
            a.appendChild(arrow);
            linksGrid.appendChild(a);
        });

        linksSection.appendChild(linksGrid);
        layout.appendChild(linksSection);

        var eventsSection = createLibraryFeedSection('Upcoming Events', 'events');
        var feedGrid = document.createElement('div');
        feedGrid.className = 'dtu-library-feed-grid';
        feedGrid.appendChild(eventsSection.container);

        var newsSection = createLibraryFeedSection('Library News', 'news');
        feedGrid.appendChild(newsSection.container);
        layout.appendChild(feedGrid);
        content.appendChild(layout);

        panel.appendChild(content);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        var state = readState();
        var latestCrowdingResp = state.crowdingCache || null;
        var latestEventsResp = state.eventsCache || null;

        function renderLibraryCrowdingViews() {
            renderLibraryHeaderOccupancy(headerOccupancy, latestCrowdingResp);
            if (typeof deps.renderLibraryTrendSection === 'function' && !trendSection.isFallback) {
                try {
                    deps.renderLibraryTrendSection(trendSection, latestCrowdingResp, null, latestEventsResp);
                } catch (eRenderTrend) {
                    var fallback = createLibraryFallbackTrendSection('Library occupancy is unavailable right now.');
                    try {
                        if (trendSection.container && trendSection.container.parentNode) {
                            trendSection.container.parentNode.replaceChild(fallback.container, trendSection.container);
                        }
                    } catch (eReplace) { }
                    trendSection = fallback;
                }
            }
        }

        function fetchLibraryCrowdingAndRender(forceRefresh) {
            if (typeof deps.requestLibraryCrowding !== 'function') return;
            try {
                deps.requestLibraryCrowding(function (crowdResp) {
                    latestCrowdingResp = crowdResp || null;
                    renderLibraryCrowdingViews();
                }, forceRefresh);
            } catch (eCrowd) {
                latestCrowdingResp = { ok: false, error: 'fetch_error', message: String(eCrowd && eCrowd.message || eCrowd) };
                renderLibraryCrowdingViews();
            }
        }

        trendSection.onRetry = function () { fetchLibraryCrowdingAndRender(true); };
        headerOccupancy.onRefresh = function () { fetchLibraryCrowdingAndRender(true); };

        if (typeof deps.requestLibraryEvents === 'function') {
            try {
                deps.requestLibraryEvents(function (resp) {
                    latestEventsResp = resp || null;
                    renderLibraryFeedItems(eventsSection, resp, 'events');
                    renderLibraryCrowdingViews();
                });
            } catch (eEvents) {
                renderLibraryFeedItems(eventsSection, { ok: false, error: 'fetch_error', message: String(eEvents && eEvents.message || eEvents) }, 'events');
            }
        } else {
            renderLibraryFeedItems(eventsSection, null, 'events');
        }
        if (typeof deps.requestLibraryNews === 'function') {
            try {
                deps.requestLibraryNews(function (resp) {
                    renderLibraryFeedItems(newsSection, resp, 'news');
                });
            } catch (eNews) {
                renderLibraryFeedItems(newsSection, { ok: false, error: 'fetch_error', message: String(eNews && eNews.message || eNews) }, 'news');
            }
        } else {
            renderLibraryFeedItems(newsSection, null, 'news');
        }
        fetchLibraryCrowdingAndRender(false);

        state = readState();
        if (state.occupancyAutoTimer) {
            clearInterval(state.occupancyAutoTimer);
        }
        var occupancyAutoTimer = setInterval(function () {
            if (!document.querySelector('.dtu-library-panel')) {
                clearInterval(occupancyAutoTimer);
                writeState({ occupancyAutoTimer: null });
                return;
            }
            fetchLibraryCrowdingAndRender(false);
        }, 60000);
        writeState({ occupancyAutoTimer: occupancyAutoTimer });
    }

    function createLibraryFallbackTrendSection(message) {
        var container = document.createElement('div');
        container.className = 'dtu-library-section dtu-library-trend-section';
        markExt(container);

        var state = document.createElement('div');
        state.className = 'dtu-library-state-msg';
        state.textContent = message || 'Library data unavailable.';
        markExt(state);
        container.appendChild(state);

        return {
            container: container,
            isFallback: true,
            onRetry: null
        };
    }

    function createLibraryHeaderOccupancy() {
        var container = document.createElement('div');
        container.className = 'dtu-library-header-occupancy';

        var nowItem = document.createElement('span');
        nowItem.className = 'dtu-library-header-occ-item';
        var nowLabel = document.createElement('span');
        nowLabel.className = 'dtu-library-header-occ-label';
        nowLabel.textContent = 'Now';
        var nowValue = document.createElement('span');
        nowValue.className = 'dtu-library-header-occ-value';
        nowValue.textContent = '--';
        nowItem.appendChild(nowLabel);
        nowItem.appendChild(nowValue);

        var todayItem = document.createElement('span');
        todayItem.className = 'dtu-library-header-occ-item';
        var todayLabel = document.createElement('span');
        todayLabel.className = 'dtu-library-header-occ-label';
        todayLabel.textContent = 'Today';
        var todayValue = document.createElement('span');
        todayValue.className = 'dtu-library-header-occ-value';
        todayValue.textContent = '--';
        todayItem.appendChild(todayLabel);
        todayItem.appendChild(todayValue);

        var freeItem = document.createElement('span');
        freeItem.className = 'dtu-library-header-occ-item';
        var freeLabel = document.createElement('span');
        freeLabel.className = 'dtu-library-header-occ-label';
        freeLabel.textContent = 'Free';
        var freeValue = document.createElement('span');
        freeValue.className = 'dtu-library-header-occ-value';
        freeValue.textContent = '--';
        freeItem.appendChild(freeLabel);
        freeItem.appendChild(freeValue);

        container.appendChild(nowItem);
        container.appendChild(todayItem);
        container.appendChild(freeItem);

        var updatedEl = document.createElement('span');
        updatedEl.className = 'dtu-library-header-updated';
        updatedEl.textContent = 'Updating...';

        var refreshBtn = document.createElement('button');
        refreshBtn.type = 'button';
        refreshBtn.className = 'dtu-library-header-occ-refresh';
        refreshBtn.textContent = 'Refresh';
        refreshBtn.setAttribute('aria-label', 'Refresh library occupancy');

        return {
            container: container,
            refreshBtn: refreshBtn,
            updatedEl: updatedEl,
            nowValue: nowValue,
            todayValue: todayValue,
            freeValue: freeValue,
            onRefresh: null
        };
    }

    function renderLibraryHeaderOccupancy(slot, resp) {
        var deps = getDeps();
        if (!slot || !slot.container || !deps) return;

        if (!slot._dtuRefreshHooked && slot.refreshBtn) {
            slot._dtuRefreshHooked = true;
            slot.refreshBtn.addEventListener('click', function (e) {
                try { e.preventDefault(); } catch (e0) { }
                if (slot.updatedEl) slot.updatedEl.textContent = 'Refreshing...';
                if (typeof slot.onRefresh === 'function') {
                    slot.onRefresh();
                } else if (typeof deps.requestLibraryCrowding === 'function') {
                    deps.requestLibraryCrowding(function (r) { renderLibraryHeaderOccupancy(slot, r); }, true);
                }
            });
        }

        var snap = extractLibraryCurrentSnapshot(
            (resp && resp.current) || (resp && resp.latest) || (resp && resp.historical) ? resp : null,
            (resp && resp.occupancy) ? resp : null
        );

        if (!snap || !snap.hasCurrent) {
            if (slot.nowValue) slot.nowValue.textContent = '--';
            if (slot.todayValue) slot.todayValue.textContent = '--';
            if (slot.freeValue) slot.freeValue.textContent = '--';
            if (slot.updatedEl) {
                slot.updatedEl.textContent = resp && resp.error === 'not_configured'
                    ? 'Shared occupancy unavailable'
                    : 'Occupancy unavailable';
            }
            return;
        }

        if (slot.nowValue) slot.nowValue.textContent = formatLibraryOccupancyCount(snap.visitors);
        if (slot.todayValue) slot.todayValue.textContent = formatLibraryOccupancyCount(snap.today);
        if (slot.freeValue) slot.freeValue.textContent = formatLibraryOccupancyCount(snap.freeSeats);

        var updated = '';
        if (snap.fetchedAt) {
            try { updated = new Date(snap.fetchedAt).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e1) { updated = ''; }
        }
        if (slot.updatedEl) slot.updatedEl.textContent = updated ? ('Updated ' + updated) : 'Updated just now';

        if (snap.source) {
            slot.container.title = 'Source: ' + snap.source;
            if (slot.updatedEl) slot.updatedEl.title = 'Source: ' + snap.source;
        }
    }

    function createLibraryFeedSection(title, type) {
        var container = document.createElement('div');
        container.className = 'dtu-library-section dtu-library-feed-section';
        container.setAttribute('data-dtu-library-feed-type', type);

        var header = document.createElement('div');
        header.className = 'dtu-library-section-header dtu-library-feed-header';

        var h3 = document.createElement('div');
        h3.className = 'dtu-library-section-title';
        h3.textContent = title;

        var actions = document.createElement('div');
        actions.className = 'dtu-library-actions';

        var refreshBtn = document.createElement('button');
        refreshBtn.type = 'button';
        refreshBtn.className = 'dtu-library-action-btn';
        refreshBtn.textContent = 'Refresh';
        refreshBtn.setAttribute('aria-label', 'Refresh ' + title.toLowerCase());

        actions.appendChild(refreshBtn);

        header.appendChild(h3);
        header.appendChild(actions);
        container.appendChild(header);

        var body = document.createElement('div');
        body.className = 'dtu-library-feed-list';

        var loading = document.createElement('div');
        loading.className = 'dtu-library-state-msg';
        loading.textContent = 'Loading...';
        body.appendChild(loading);

        container.appendChild(body);

        return { container: container, body: body, refreshBtn: refreshBtn, itemEls: [] };
    }

    function renderLibraryFeedItems(section, resp, type) {
        var deps = getDeps() || {};
        if (!section || !section.body) return;

        var body = section.body;
        while (body.firstChild) body.removeChild(body.firstChild);
        section.itemEls = [];

        if (!section._dtuRefreshHooked && section.refreshBtn) {
            section._dtuRefreshHooked = true;
            section.refreshBtn.addEventListener('click', function (e) {
                try { e.preventDefault(); } catch (e0) { }
                while (body.firstChild) body.removeChild(body.firstChild);
                var loading = document.createElement('div');
                loading.className = 'dtu-library-state-msg';
                loading.textContent = 'Loading...';
                body.appendChild(loading);

                if (type === 'events' && typeof deps.requestLibraryEvents === 'function') {
                    deps.requestLibraryEvents(function (r) {
                        renderLibraryFeedItems(section, r, type);
                    }, true);
                } else if (type !== 'events' && typeof deps.requestLibraryNews === 'function') {
                    deps.requestLibraryNews(function (r) {
                        renderLibraryFeedItems(section, r, type);
                    }, true);
                }
            });
        }

        var items = null;
        if (resp && resp.ok) {
            items = type === 'events' ? resp.events : resp.news;
        }

        if (resp && resp.ok === false) {
            var err = document.createElement('div');
            err.className = 'dtu-library-state-msg';

            var suffix = '';
            if (resp.error === 'http' && resp.status) suffix = ' (HTTP ' + resp.status + ')';
            else if (resp.error) suffix = ' (' + String(resp.error) + ')';
            err.textContent = 'Failed to load ' + (type === 'events' ? 'events' : 'news') + suffix + '.';
            body.appendChild(err);

            if (resp.message) {
                var msg = document.createElement('div');
                msg.textContent = String(resp.message);
                msg.style.cssText = 'font-size: 10px; margin-top: 4px; opacity: 0.7;';
                err.appendChild(msg);
            }
            return;
        }

        if (!items || items.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'dtu-library-state-msg';
            empty.textContent = type === 'events' ? 'No upcoming events' : 'No news available';
            body.appendChild(empty);
            return;
        }

        var itemEls = [];
        items.forEach(function (item) {
            var row = document.createElement('a');
            row.className = 'dtu-library-feed-item';
            row.href = item.url;
            row.target = '_blank';
            row.rel = 'noopener noreferrer';

            if (type === 'events') {
                var badge = document.createElement('div');
                badge.className = 'dtu-library-date-badge';

                var dayText = String((item && item.day) || '').trim();
                var monthText = String((item && item.month) || '').trim();
                if ((!dayText || !monthText) && item && item.excerpt) {
                    var parsed = String(item.excerpt).match(/(\d{1,2})[.\-/\s]+([a-zA-Z]{3,9})/);
                    if (parsed) {
                        if (!dayText) dayText = parsed[1];
                        if (!monthText) monthText = parsed[2];
                    }
                }
                if (!dayText) dayText = '--';
                if (!monthText) monthText = 'TBA';

                var dayEl = document.createElement('div');
                dayEl.className = 'dtu-library-date-day';
                dayEl.textContent = dayText;

                var monthEl = document.createElement('div');
                monthEl.className = 'dtu-library-date-month';
                monthEl.textContent = monthText;

                badge.appendChild(dayEl);
                badge.appendChild(monthEl);
                row.appendChild(badge);
            }

            var content = document.createElement('div');
            content.className = 'dtu-library-item-content';

            if (type === 'news' && item.badge) {
                var tag = document.createElement('div');
                tag.className = 'dtu-library-news-badge';
                tag.textContent = item.badge;
                content.appendChild(tag);
            }

            var titleEl = document.createElement('div');
            titleEl.className = 'dtu-library-item-title';
            titleEl.textContent = item.title;

            var subEl = document.createElement('div');
            subEl.className = 'dtu-library-item-meta';
            subEl.textContent = type === 'events' ? item.excerpt : (item.date || item.excerpt);

            content.appendChild(titleEl);
            content.appendChild(subEl);
            row.appendChild(content);

            body.appendChild(row);
            itemEls.push(row);
        });
        section.itemEls = itemEls;
    }

    try {
        globalThis.DTUAfterDarkLibraryUi = {
            insertLibraryNavDropdown: insertLibraryNavDropdown,
            removeLibraryNavDropdown: removeLibraryNavDropdown,
            hideLibraryPanel: hideLibraryPanel,
            showLibraryPanel: showLibraryPanel
        };
    } catch (eExpose) { }

    function findLibraryNavButtonFromEvent(event) {
        var path = [];
        try { path = event && typeof event.composedPath === 'function' ? event.composedPath() : []; } catch (e0) { path = []; }
        for (var i = 0; i < path.length; i++) {
            var node = path[i];
            if (!node || !node.classList) continue;
            if (node.classList.contains('dtu-library-nav-item')) {
                return node.querySelector && node.querySelector('button.d2l-dropdown-opener, button');
            }
            if (node.matches && node.matches('.dtu-library-nav-item button, .dtu-library-nav-item .d2l-dropdown-opener')) {
                return node;
            }
        }

        var target = event && event.target;
        if (target && target.closest) {
            var item = target.closest('.dtu-library-nav-item');
            if (item) return item.querySelector('button.d2l-dropdown-opener, button') || target;
        }
        return null;
    }

    document.addEventListener('click', function (event) {
        var button = findLibraryNavButtonFromEvent(event);
        if (!button) return;
        try { event.preventDefault(); } catch (e0) { }
        try { event.stopPropagation(); } catch (e1) { }
        try { if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation(); } catch (e2) { }

        if (document.querySelector('.dtu-library-panel')) {
            hideLibraryPanel();
            try { button.setAttribute('aria-expanded', 'false'); } catch (e3) { }
        } else {
            showLibraryPanel(button);
            try {
                if (document.querySelector('.dtu-library-panel')) button.setAttribute('aria-expanded', 'true');
            } catch (e4) { }
        }
    }, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleLibraryNavBootstrap, { once: true });
    } else {
        scheduleLibraryNavBootstrap();
    }
    window.addEventListener('load', scheduleLibraryNavBootstrap);
    window.addEventListener('pageshow', function () {
        setTimeout(function () { try { runLibraryNavBootstrapPass(); } catch (e0) { } }, 60);
    });
    window.addEventListener('focus', function () {
        setTimeout(function () { try { runLibraryNavBootstrapPass(); } catch (e0) { } }, 80);
    });
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) return;
        setTimeout(function () { try { runLibraryNavBootstrapPass(); } catch (e0) { } }, 100);
    });
})();
