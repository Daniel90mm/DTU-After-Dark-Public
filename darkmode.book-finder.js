(function () {
    'use strict';

    function getDeps() {
        try { return globalThis.DTUAfterDarkBookFinderDeps || null; } catch (e0) { return null; }
    }

    function isTopWindow() {
        var deps = getDeps();
        return !!(deps && typeof deps.isTopWindow === 'function' && deps.isTopWindow());
    }

    function isFeatureFlagEnabled(key) {
        var deps = getDeps();
        return !!(deps && typeof deps.isFeatureFlagEnabled === 'function' && deps.isFeatureFlagEnabled(key));
    }

    function isDTULearnCoursePage() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDTULearnCoursePage === 'function' && deps.isDTULearnCoursePage());
    }

    function isDarkModeEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDarkModeEnabled === 'function' && deps.isDarkModeEnabled());
    }

    function normalizeISBN(raw) {
        var deps = getDeps();
        if (deps && typeof deps.normalizeISBN === 'function') return deps.normalizeISBN(raw);
        return String(raw || '').replace(/[\s-]/g, '').replace(/x$/i, 'X');
    }

    function isValidISBN13(digits) {
        var deps = getDeps();
        if (deps && typeof deps.isValidISBN13 === 'function') return deps.isValidISBN13(digits);
        return false;
    }

    function isValidISBN10(digits) {
        var deps = getDeps();
        if (deps && typeof deps.isValidISBN10 === 'function') return deps.isValidISBN10(digits);
        return false;
    }

    function isNotesOnlyLiterature(text) {
        var deps = getDeps();
        return !!(deps && typeof deps.isNotesOnlyLiterature === 'function' && deps.isNotesOnlyLiterature(text));
    }

    function getBookFinderFeatureKey() {
        var deps = getDeps();
        return deps && deps.featureBookFinderKey;
    }

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

    function insertBookFinderLinks() {
        if (!isTopWindow()) return;
        if (!isDTULearnCoursePage()) return;
        if (!isFeatureFlagEnabled(getBookFinderFeatureKey())) {
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

            var text = textNode.textContent;
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
        globalThis.DTUAfterDarkBookFinderUi = {
            insertBookFinderLinks: insertBookFinderLinks
        };
    } catch (eExpose) { }
})();
