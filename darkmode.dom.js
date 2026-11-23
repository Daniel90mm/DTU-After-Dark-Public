// Shared DOM helpers for every content script. Loaded right after config.js in
// every content-script group, so each module reads them once at its top
// (var markExt = globalThis.DTUAfterDarkDom.markExt) instead of keeping a copy.
(function () {
    'use strict';

    // Marks a node as the extension's own, so the dark-mode engine and the page
    // observer leave it alone.
    function markExt(el) {
        if (el && el.setAttribute) el.setAttribute('data-dtu-ext', '1');
        return el;
    }

    var IS_TOP = (function () {
        try { return window === window.top; } catch (e) { return false; }
    })();

    function isTopWindow() {
        return IS_TOP;
    }

    // null and undefined read as empty; 0 reads as "0".
    function normalizeWhitespace(value) {
        return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    }

    function el(tag, className, text) {
        var node = markExt(document.createElement(tag));
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function ensureStyles(id, css) {
        if (!id) throw new Error('DTUAfterDarkDom.ensureStyles needs a style element id');
        if (document.getElementById(id)) return;
        var style = markExt(document.createElement('style'));
        style.id = id;
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    }

    function makeButton(text, onClick) {
        var button = el('button', null, text);
        button.type = 'button';
        button.addEventListener('click', onClick);
        return button;
    }

    // A read-on date for a footnote. options.month is the Intl month style and
    // options.invalid is shown when value is not a date.
    function formatReadDate(value, options) {
        if (!options || !options.month || typeof options.invalid !== 'string') {
            throw new Error('DTUAfterDarkDom.formatReadDate needs { month, invalid }');
        }
        var date = new Date(value);
        if (isNaN(date.getTime())) return options.invalid;
        try {
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: options.month, year: 'numeric' });
        } catch (e) {
            return typeof value === 'string' ? value.slice(0, 10) : date.toISOString().slice(0, 10);
        }
    }

    function dep(deps, name) {
        return deps && typeof deps[name] === 'function' ? deps[name] : null;
    }

    // Enumerating shadow roots means walking every element under every root, so it
    // dominates deepQueryAll: on the Learn homepage four modules asked for nav
    // elements several times per mutation batch and each call repeated the whole
    // walk. The root list is memoized instead; the matching itself still runs
    // fresh on every call, so newly added elements inside known roots are never
    // missed. The cache is dropped whenever a mutation batch adds nodes, and in
    // any case after DEEP_ROOTS_TTL_MS, because attaching a shadow root to an
    // element already in the DOM produces no mutation record of its own.
    const DEEP_ROOTS_TTL_MS = 400;
    let _deepRootsCache = new WeakMap();
    let _deepRootsGeneration = 0;

    // Matches are memoized too. Feature checks ask the same few questions
    // repeatedly -- the course-search poller alone runs every 400 ms and queries
    // the nav twice per tick -- and re-running querySelectorAll across every
    // shadow root each time is the remaining cost.
    //
    // Only non-empty results are cached, deliberately. A stale non-empty answer
    // is harmless: the element is verified to still be connected before reuse.
    // A stale *empty* answer is not, because "is my UI already there?" is exactly
    // how the insert paths guard themselves, and answering no twice would insert
    // twice. A miss for something that does not exist yet is cheap anyway.
    const DEEP_RESULTS_TTL_MS = 400;
    const DEEP_RESULTS_MAX_CACHED = 64;
    let _deepResultsCache = new WeakMap();

    function invalidateDeepRoots() {
        _deepRootsGeneration++;
    }

    function collectDeepRoots(startRoot) {
        const cached = _deepRootsCache.get(startRoot);
        const now = Date.now();
        if (cached && cached.generation === _deepRootsGeneration &&
            (now - cached.at) < DEEP_ROOTS_TTL_MS) {
            return cached.roots;
        }

        const roots = [];
        const pending = [startRoot];
        while (pending.length > 0) {
            const searchRoot = pending.pop();
            if (!searchRoot || !searchRoot.querySelectorAll) continue;
            roots.push(searchRoot);

            const walker = document.createTreeWalker(searchRoot, NodeFilter.SHOW_ELEMENT, null);
            let el = walker.nextNode();
            while (el) {
                if (el.shadowRoot) pending.push(el.shadowRoot);
                el = walker.nextNode();
            }
        }

        try {
            _deepRootsCache.set(startRoot, {
                roots: roots,
                generation: _deepRootsGeneration,
                at: now
            });
        } catch (eCache) { }
        return roots;
    }

    function cachedDeepResults(root, selector) {
        const perRoot = _deepResultsCache.get(root);
        if (!perRoot) return null;
        const entry = perRoot.get(selector);
        if (!entry) return null;
        if (entry.generation !== _deepRootsGeneration) return null;
        if ((Date.now() - entry.at) >= DEEP_RESULTS_TTL_MS) return null;
        // A cached node that has since left the document would be handed back as
        // a live match, so verify before reuse rather than trusting the clock.
        for (let i = 0; i < entry.results.length; i++) {
            const el = entry.results[i];
            if (!el || el.isConnected === false) return null;
        }
        return entry.results;
    }

    function storeDeepResults(root, selector, results) {
        if (!results.length) return;
        if (results.length > DEEP_RESULTS_MAX_CACHED) return;
        let perRoot = _deepResultsCache.get(root);
        if (!perRoot) {
            perRoot = new Map();
            try { _deepResultsCache.set(root, perRoot); } catch (eStore) { return; }
        }
        perRoot.set(selector, {
            // Callers get their own array and some mutate it, so keep a private copy.
            results: results.slice(),
            generation: _deepRootsGeneration,
            at: Date.now()
        });
    }

    // Recursively find all elements matching a selector, traversing shadow roots
    function deepQueryAll(selector, root) {
        if (!root) return [];

        const cacheRoot = root.shadowRoot || root;
        const cached = cachedDeepResults(cacheRoot, selector);
        if (cached) return cached.slice();

        const results = [];
        if (root.matches && root.matches(selector)) {
            results.push(root);
        }

        const roots = collectDeepRoots(cacheRoot);
        for (const searchRoot of roots) {
            if (!searchRoot.querySelectorAll) continue;
            searchRoot.querySelectorAll(selector).forEach(match => results.push(match));
        }

        storeDeepResults(cacheRoot, selector, results);
        return results;
    }

    // Runs a feature's placement pass when the page changes instead of on a fixed
    // interval. Mutations and composed shadow-root events are coalesced so a burst
    // of changes still costs at most one pass per frame (or microtask when frames
    // are unavailable). The pass returns true once the feature is placed or the
    // page cannot host it; the cap is the hard stop for everything else.
    function schedulePlacement(options) {
        if (!options || typeof options.run !== 'function') {
            throw new Error('DTUAfterDarkDom.schedulePlacement needs a run function');
        }
        if (typeof options.capMs !== 'number' || !isFinite(options.capMs) || options.capMs <= 0) {
            throw new Error('DTUAfterDarkDom.schedulePlacement needs a positive capMs');
        }
        if (typeof MutationObserver !== 'function') {
            throw new Error('DTUAfterDarkDom.schedulePlacement needs MutationObserver');
        }
        if (!document || typeof document.addEventListener !== 'function') {
            throw new Error('DTUAfterDarkDom.schedulePlacement needs a document');
        }
        var target = document.documentElement || document.body || document;

        var stopped = false;
        var scheduled = false;
        var frameId = 0;
        var stopTimer = null;
        var observer = null;
        var startedAt = Date.now();

        function cancelFrame(id) {
            if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
        }

        function scheduleFrame(callback) {
            if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(callback);
            if (typeof queueMicrotask === 'function') {
                queueMicrotask(callback);
                return 0;
            }
            Promise.resolve().then(callback);
            return 0;
        }

        function stop() {
            if (stopped) return;
            stopped = true;
            scheduled = false;
            if (frameId) {
                cancelFrame(frameId);
                frameId = 0;
            }
            if (stopTimer !== null) {
                clearTimeout(stopTimer);
                stopTimer = null;
            }
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            document.removeEventListener('dtu-after-dark-shadow-attached', trigger, true);
            document.removeEventListener('visibilitychange', onVisible);
        }

        // The cap counts only while the tab is visible: frames do not run in a
        // background tab, so a page opened there would otherwise use up its cap
        // before any pass ran.
        function armCap() {
            startedAt = Date.now();
            stopTimer = setTimeout(onCap, options.capMs);
        }

        function onCap() {
            stopTimer = null;
            if (document.hidden) {
                document.addEventListener('visibilitychange', onVisible);
                return;
            }
            stop();
        }

        function onVisible() {
            if (stopped || document.hidden) return;
            document.removeEventListener('visibilitychange', onVisible);
            armCap();
            trigger();
        }

        function attempt() {
            scheduled = false;
            frameId = 0;
            if (stopped) return;
            if ((Date.now() - startedAt) >= options.capMs) {
                stop();
                return;
            }
            if (options.run() === true) stop();
        }

        function trigger() {
            if (stopped || scheduled) return;
            scheduled = true;
            frameId = scheduleFrame(attempt);
        }

        observer = new MutationObserver(trigger);
        observer.observe(target, { childList: true, subtree: true });
        document.addEventListener('dtu-after-dark-shadow-attached', trigger, true);
        armCap();
        trigger();

        return {
            trigger: trigger,
            stop: stop,
            active: function () { return !stopped; }
        };
    }

    // DTU's dates and times are Danish, and the browser's own time zone can be
    // another one (a student abroad): its local fields are then hours or a day
    // off. These read and build Danish wall-clock time instead.
    var _copenhagenFormat = null;

    // The wall clock in Denmark at ts (default now): year, month (1 to 12), day,
    // hour, minute, second, and weekday (0 is Sunday).
    function copenhagenParts(ts) {
        if (!_copenhagenFormat) {
            _copenhagenFormat = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Europe/Copenhagen', hourCycle: 'h23', year: 'numeric', month: '2-digit',
                day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        }
        var p = {};
        _copenhagenFormat.formatToParts(new Date(ts == null ? Date.now() : ts)).forEach(function (part) {
            if (part.type !== 'literal') p[part.type] = +part.value;
        });
        p.weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
        return p;
    }

    // A date in Denmark as YYYY-MM-DD (default: today).
    function copenhagenDateIso(ts) {
        var p = copenhagenParts(ts);
        return p.year + '-' + (p.month < 10 ? '0' : '') + p.month + '-' + (p.day < 10 ? '0' : '') + p.day;
    }

    // The instant a Danish wall-clock time names (month 1 to 12; a day past the
    // month's end rolls over). A time in the hour skipped in spring counts as UTC+1.
    function copenhagenTs(year, month, day, hour, minute) {
        var wall = Date.UTC(year, month - 1, day, hour || 0, minute || 0);
        var offsets = [7200000, 3600000];
        for (var i = 0; i < offsets.length; i++) {
            var p = copenhagenParts(wall - offsets[i]);
            if (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) === wall) return wall - offsets[i];
        }
        return wall - 3600000;
    }

    globalThis.DTUAfterDarkDom = {
        markExt: markExt,
        copenhagenParts: copenhagenParts,
        copenhagenDateIso: copenhagenDateIso,
        copenhagenTs: copenhagenTs,
        isTopWindow: isTopWindow,
        normalizeWhitespace: normalizeWhitespace,
        el: el,
        ensureStyles: ensureStyles,
        makeButton: makeButton,
        formatReadDate: formatReadDate,
        dep: dep,
        invalidateDeepRoots: invalidateDeepRoots,
        deepRootsGeneration: function () { return _deepRootsGeneration; },
        collectDeepRoots: collectDeepRoots,
        cachedDeepResults: cachedDeepResults,
        storeDeepResults: storeDeepResults,
        deepQueryAll: deepQueryAll,
        schedulePlacement: schedulePlacement
    };
})();
