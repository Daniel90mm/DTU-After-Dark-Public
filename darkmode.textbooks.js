(function () {
    'use strict';

    var _textbooksCore = globalThis.DTUAfterDarkTextbooksCore;
    var _textbooksKurser = globalThis.DTUAfterDarkTextbooksKurser;
    if (!_textbooksCore) throw new Error('darkmode.textbooks.js loaded before darkmode.textbooks.core.js');
    if (!_textbooksKurser) throw new Error('darkmode.textbooks.js loaded before darkmode.textbooks.kurser.js');

    var sendRuntimeMessage = _textbooksCore.sendRuntimeMessage;
    var isTopWindow = _textbooksCore.isTopWindow;
    var isDTULearnCoursePage = _textbooksCore.isDTULearnCoursePage;
    var isFeatureFlagEnabled = _textbooksCore.isFeatureFlagEnabled;
    var isDarkModeEnabled = _textbooksCore.isDarkModeEnabled;
    var normalizeISBN = _textbooksCore.normalizeISBN;
    var isValidISBN13 = _textbooksCore.isValidISBN13;
    var isValidISBN10 = _textbooksCore.isValidISBN10;
    var isNotesOnlyLiterature = _textbooksCore.isNotesOnlyLiterature;
    var getTextbookLinksFeatureKey = _textbooksCore.getTextbookLinksFeatureKey;
    var insertKurserTextbookLinks = _textbooksKurser.insertKurserTextbookLinks;
    var scheduleKurserTextbookLinker = _textbooksKurser.scheduleKurserTextbookLinker;

    var _finditAvailabilityCache = Object.create(null);

    function checkFinditOnlineAccess(url, cb) {
        if (!url) {
            cb(false);
            return;
        }
        if (_finditAvailabilityCache[url] && _finditAvailabilityCache[url].done) {
            cb(!!_finditAvailabilityCache[url].onlineAccess);
            return;
        }
        if (_finditAvailabilityCache[url] && _finditAvailabilityCache[url].pending) {
            _finditAvailabilityCache[url].callbacks.push(cb);
            return;
        }

        _finditAvailabilityCache[url] = { pending: true, callbacks: [cb] };
        sendRuntimeMessage({ type: 'dtu-findit-availability', url: url }, function (response) {
            var onlineAccess = !!(response && response.ok && response.onlineAccess);
            var pending = _finditAvailabilityCache[url];
            _finditAvailabilityCache[url] = { done: true, onlineAccess: onlineAccess };
            if (pending && Array.isArray(pending.callbacks)) {
                pending.callbacks.forEach(function (fn) {
                    try { fn(onlineAccess); } catch (e) { }
                });
            }
        });
    }


    // ===== BOOK FINDER (learn.inside.dtu.dk course pages) =====
    // Scans Learn course content for ISBNs and likely textbook titles and
    // inserts the same style of source-link bars as the kurser literature linker.

    var ISBN_REGEX = /\bISBN[-\s]?(?:1[03])?[\s:]*\s*([\dXx][\d\s-]{8,}[\dXx])\b/gi;
    var BARE_ISBN13_REGEX = /\b(97[89][\d-]{10,})\b/g;
    var BOOK_KEYWORDS = /\b(textbook|text\s*book|course\s*book|required\s*reading|recommended\s*reading|suggested\s*reading|book|reading\s*list|literature|edition|ed\.|bog|l\u00e6rebog|kursus\s*bog|anbefalet\s*l\u00e6sning|litteratur|pensum)\b/i;
    var QUOTED_TITLE_REGEX = /["\u201C\u201D]([A-Z][A-Za-z]*(?:\s+(?:[A-Z][A-Za-z]*|and|the|of|in|for|to|a|an|with|&)){2,})["\u201C\u201D]/g;

    function isTitleCase(str) {
        var words = str.trim().split(/\s+/);
        if (words.length < 3) return false;
        if (!/^[A-Z]/.test(words[0])) return false;
        var minor = /^(a|an|the|and|but|or|for|nor|of|in|to|with|on|at|by|&)$/i;
        var capitalizedCount = 0;
        for (var w = 0; w < words.length; w++) {
            if (/^[A-Z]/.test(words[w])) capitalizedCount++;
            else if (!minor.test(words[w])) return false;
        }
        return capitalizedCount >= Math.ceil(words.length / 2);
    }

    function isLikelyBookFinderTitleCandidate(rawTitle) {
        if (!rawTitle) return false;
        var title = rawTitle.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        if (title.length < 10) return false;
        if (isNotesOnlyLiterature(title)) return false;
        if (/https?:\/\//i.test(title)) return false;

        var genericResourceNoise = /\b(relevant|additional|supplementary|other|various|selected|assorted)\s+(articles?|papers?|tools?|materials?|resources?)\b|\barticles?\s*,\s*tools?\b|\bmaterials?\s+from\s+the\s+internet\b|\bfrom\s+the\s+internet\b|\bonline\s+materials?\b|\bweb\s+resources?\b|\binternet\s+resources?\b/i;
        var genericCourseNoise = /\b(research\s+articles?|lecture\s+notes?|course\s+compendium|supplements?\s+will\s+be\s+provided|will\s+be\s+made\s+accessible|can\s+be\s+used\s+as\s+well|freely\s+available)\b/i;
        if (genericResourceNoise.test(title) || genericCourseNoise.test(title)) return false;

        return true;
    }

    function createBookFinderBar(isbn, title) {
        var bar = document.createElement('div');
        bar.setAttribute('data-book-finder-bar', 'true');
        bar.style.cssText = isDarkModeEnabled()
            ? 'display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; margin: 4px 0; '
            + 'background-color: #2d2d2d !important; border: 1px solid #404040; border-radius: 4px; '
            + 'font-size: 12px; line-height: 1.4; color: #e0e0e0;'
            : 'display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; margin: 4px 0; '
            + 'background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; '
            + 'font-size: 12px; line-height: 1.4; color: #333;';

        var label = document.createElement('span');
        label.textContent = '\uD83D\uDCD6 ';
        label.style.cssText = 'font-weight: bold; white-space: nowrap;';
        bar.appendChild(label);

        var linkColor = isDarkModeEnabled() ? '#66b3ff' : '#1a73e8';
        var sepColor = isDarkModeEnabled() ? '#555' : '#ccc';
        var searchQuery = title ? encodeURIComponent(title) : '';
        var links = [];

        if (isbn) {
            links.push({ text: 'DTU Library', url: 'https://findit.dtu.dk/en/catalog?q=isbn:' + isbn });
        } else if (title) {
            links.push({ text: 'DTU Library', url: 'https://findit.dtu.dk/en/catalog?q=' + searchQuery });
        }

        if (isbn) {
            links.push({ text: 'Polyteknisk', url: 'https://www.polyteknisk.dk/home/Detaljer/' + isbn });
        }

        if (title) {
            links.push({ text: 'DBA', url: 'https://www.dba.dk/soeg/?soeg=' + searchQuery });
        } else if (isbn) {
            links.push({ text: 'DBA', url: 'https://www.dba.dk/soeg/?soeg=' + isbn });
        }

        if (title) {
            links.push({ text: 'Marketplace', url: 'https://www.facebook.com/marketplace/search/?query=' + searchQuery });
        } else if (isbn) {
            links.push({ text: 'Marketplace', url: 'https://www.facebook.com/marketplace/search/?query=' + isbn });
        }

        for (var i = 0; i < links.length; i++) {
            if (i > 0) {
                var sep = document.createElement('span');
                sep.textContent = '|';
                sep.style.cssText = 'color: ' + sepColor + ';';
                bar.appendChild(sep);
            }
            var a = document.createElement('a');
            a.href = links[i].url;
            a.textContent = links[i].text;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.style.cssText = 'color: ' + linkColor + ' !important; text-decoration: none; white-space: nowrap; '
                + 'padding: 2px 6px; border-radius: 3px;';
            bar.appendChild(a);
        }

        return bar;
    }

    // Text nodes already read that held no ISBN: skipped on later passes.
    var bookFinderSeenTextNodes = new WeakSet();

    function insertBookFinderLinks() {
        if (!isTopWindow()) return;
        if (!isDTULearnCoursePage()) return;
        if (!isFeatureFlagEnabled(getTextbookLinksFeatureKey())) {
            document.querySelectorAll('[data-book-finder-bar]').forEach(function (el) { el.remove(); });
            document.querySelectorAll('[data-book-finder-injected]').forEach(function (el) {
                el.removeAttribute('data-book-finder-injected');
            });
            return;
        }

        var contentArea = document.querySelector('.d2l-page-main')
            || document.querySelector('#ContentView')
            || document.querySelector('.d2l-le-content')
            || document.body;
        if (!contentArea) return;

        var walker = document.createTreeWalker(contentArea, NodeFilter.SHOW_TEXT, null);
        var isbnHits = [];
        var textNode;
        while ((textNode = walker.nextNode())) {
            if (textNode.parentElement && textNode.parentElement.closest('[data-book-finder-injected]')) continue;
            if (textNode.parentElement && /^(SCRIPT|STYLE|NOSCRIPT|INPUT|TEXTAREA)$/i.test(textNode.parentElement.tagName)) continue;
            if (bookFinderSeenTextNodes.has(textNode)) continue;

            var text = textNode.textContent;
            var hitsBefore = isbnHits.length;
            var match;

            ISBN_REGEX.lastIndex = 0;
            while ((match = ISBN_REGEX.exec(text)) !== null) {
                var raw = normalizeISBN(match[1]);
                if (isValidISBN13(raw) || isValidISBN10(raw)) {
                    isbnHits.push({ node: textNode, isbn: raw, title: null });
                }
            }

            BARE_ISBN13_REGEX.lastIndex = 0;
            while ((match = BARE_ISBN13_REGEX.exec(text)) !== null) {
                var rawBare = normalizeISBN(match[1]);
                if (isValidISBN13(rawBare) && !isbnHits.some(function (h) { return h.isbn === rawBare; })) {
                    isbnHits.push({ node: textNode, isbn: rawBare, title: null });
                }
            }
            if (isbnHits.length === hitsBefore) bookFinderSeenTextNodes.add(textNode);
        }

        var titleHits = [];
        var containers = contentArea.querySelectorAll('p, li, div, td, span, dd, section');
        for (var c = 0; c < containers.length; c++) {
            var container = containers[c];
            if (container.closest('[data-book-finder-injected]')) continue;
            if (container.querySelector('[data-book-finder-bar]')) continue;
            if (container.children.length > 20) continue;

            var cText = container.textContent;
            if (!BOOK_KEYWORDS.test(cText)) continue;

            var keyColonMatch = cText.match(/\b(textbook|text\s*book|course\s*book|required\s*reading|recommended\s*reading|suggested\s*reading|bog|l\u00e6rebog|kursus\s*bog|anbefalet\s*l\u00e6sning|pensum|litteratur)s?\s*:\s*(.+)/i);
            if (keyColonMatch) {
                var bookInfo = keyColonMatch[2]
                    .replace(/\.\s*See\s+(more|also)\b.*/i, '')
                    .replace(/\.\s*Se\s+(mere|ogs\u00e5)\b.*/i, '')
                    .replace(/\s*\((?:Kapitel|Chapter|kap\.).*/i, '')
                    .trim();
                bookInfo = bookInfo.replace(/\.\s*$/, '').trim();
                if (isLikelyBookFinderTitleCandidate(bookInfo) && !titleHits.some(function (h) { return h.title === bookInfo; })) {
                    titleHits.push({ element: container, title: bookInfo, isbn: null });
                }
            }

            if (!keyColonMatch) {
                QUOTED_TITLE_REGEX.lastIndex = 0;
                var qMatch;
                while ((qMatch = QUOTED_TITLE_REGEX.exec(cText)) !== null) {
                    var candidateTitle = qMatch[1].trim();
                    if (isTitleCase(candidateTitle) && isLikelyBookFinderTitleCandidate(candidateTitle) && !titleHits.some(function (h) { return h.title === candidateTitle; })) {
                        titleHits.push({ element: container, title: candidateTitle, isbn: null });
                    }
                }

                var emEls = container.querySelectorAll('em, i');
                for (var e = 0; e < emEls.length; e++) {
                    var emText = emEls[e].textContent.trim();
                    if (isTitleCase(emText) && emText.split(/\s+/).length >= 3
                        && isLikelyBookFinderTitleCandidate(emText)
                        && !titleHits.some(function (h) { return h.title === emText; })) {
                        titleHits.push({ element: container, title: emText, isbn: null });
                    }
                }
            }
        }

        for (var ib = 0; ib < isbnHits.length; ib++) {
            var hit = isbnHits[ib];
            var blockParent = hit.node.parentElement
                ? hit.node.parentElement.closest('p, div, li, td, blockquote, dd, section')
                : null;
            if (!blockParent) blockParent = hit.node.parentElement;
            if (!blockParent || blockParent.getAttribute('data-book-finder-injected')) continue;

            var nearbyTitle = null;
            var parentText = blockParent.textContent;
            QUOTED_TITLE_REGEX.lastIndex = 0;
            var nearby = QUOTED_TITLE_REGEX.exec(parentText);
            if (nearby && isTitleCase(nearby[1].trim())) nearbyTitle = nearby[1].trim();

            blockParent.setAttribute('data-book-finder-injected', 'true');
            var bar = createBookFinderBar(hit.isbn, nearbyTitle);
            blockParent.parentNode.insertBefore(bar, blockParent.nextSibling);
        }

        for (var ti = 0; ti < titleHits.length; ti++) {
            var tHit = titleHits[ti];
            var tBlock = tHit.element.closest('p, div, li, td, blockquote, dd, section') || tHit.element;
            if (tBlock.getAttribute('data-book-finder-injected')) continue;
            if (tBlock.querySelector('[data-book-finder-bar]')) continue;

            tBlock.setAttribute('data-book-finder-injected', 'true');
            var tBar = createBookFinderBar(null, tHit.title);
            tBlock.parentNode.insertBefore(tBar, tBlock.nextSibling);
        }
    }

    try {
        globalThis.DTUAfterDarkTextbooksUi = {
            insertKurserTextbookLinks: insertKurserTextbookLinks,
            scheduleKurserTextbookLinker: scheduleKurserTextbookLinker,
            insertBookFinderLinks: insertBookFinderLinks,
            checkFinditOnlineAccess: checkFinditOnlineAccess
        };
    } catch (eExpose) { }
})();
