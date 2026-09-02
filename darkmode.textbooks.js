(function () {
    'use strict';

    function getDeps() {
        try { return globalThis.DTUAfterDarkTextbooksDeps || null; } catch (e0) { return null; }
    }

    function markExt(el) {
        var deps = getDeps();
        if (el && deps && typeof deps.markExt === 'function') deps.markExt(el);
        return el;
    }

    function sendRuntimeMessage(msg, cb) {
        var deps = getDeps();
        if (deps && typeof deps.sendRuntimeMessage === 'function') {
            deps.sendRuntimeMessage(msg, cb);
            return;
        }
        if (cb) cb(null);
    }

    function isTopWindow() {
        var deps = getDeps();
        return !!(deps && typeof deps.isTopWindow === 'function' && deps.isTopWindow());
    }

    function isFeatureFlagEnabled(key) {
        var deps = getDeps();
        return !!(deps && typeof deps.isFeatureFlagEnabled === 'function' && deps.isFeatureFlagEnabled(key));
    }

    function isKurserCoursePage() {
        var deps = getDeps();
        return !!(deps && typeof deps.isKurserCoursePage === 'function' && deps.isKurserCoursePage());
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

    function getTextbookLinksFeatureKey() {
        var deps = getDeps();
        return deps && deps.featureTextbookLinksKey;
    }

    var _kurserTextbookLinkerTimer = null;
    var _finditAvailabilityCache = Object.create(null);

    function isKurserLiteratureLabel(text) {
        if (!text) return false;
        var normalized = text.replace(/\s+/g, ' ').trim();
        if (!normalized) return false;
        if (normalized.length > 130) return false;

        var lower = normalized.toLowerCase();
        if (/^(course\s+literature|literature|kursuslitteratur|litteratur)\s*:?\s*$/.test(lower)) return true;

        if (/\b(literature|litteratur|kursuslitteratur)\b/.test(lower)) {
            if (/\b(course|kursus|reading|pensum|material|materials|materiale)\b/.test(lower)) return true;
            if (lower.split(' ').length <= 4) return true;
        }
        return false;
    }

    function findKurserLiteratureContainers() {
        var found = [];
        var seen = new Set();
        function addCandidate(el) {
            if (!el || el.nodeType !== 1) return;
            if (seen.has(el)) return;
            var txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
            if (!txt) return;
            if (txt.length > 7000) return;
            seen.add(el);
            found.push(el);
        }

        document.querySelectorAll('tr').forEach(function (tr) {
            var cells = tr.querySelectorAll('th, td');
            if (cells.length < 2) return;
            var label = (cells[0].textContent || '').replace(/\s+/g, ' ').trim();
            if (!isKurserLiteratureLabel(label)) return;
            addCandidate(cells[cells.length - 1]);
        });

        document.querySelectorAll('dt').forEach(function (dt) {
            if (!isKurserLiteratureLabel((dt.textContent || '').trim())) return;
            var dd = dt.nextElementSibling;
            while (dd && dd.tagName && dd.tagName.toLowerCase() !== 'dd') dd = dd.nextElementSibling;
            addCandidate(dd);
        });

        document.querySelectorAll('h1, h2, h3, h4, strong, b, label, div, span, p').forEach(function (el) {
            var label = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (!isKurserLiteratureLabel(label)) return;
            if (label.length > 50) return;

            var candidate = null;
            if (el.nextElementSibling) {
                candidate = el.nextElementSibling;
            } else if (el.parentElement) {
                var siblings = Array.prototype.filter.call(el.parentElement.children, function (ch) {
                    return ch !== el && ((ch.innerText || ch.textContent || '').replace(/\s+/g, ' ').trim().length > 0);
                });
                if (siblings.length === 1) {
                    candidate = siblings[0];
                } else if (siblings.length > 1) {
                    candidate = siblings.reduce(function (best, cur) {
                        var bestLen = (best.innerText || best.textContent || '').length;
                        var curLen = (cur.innerText || cur.textContent || '').length;
                        return curLen > bestLen ? cur : best;
                    });
                }
            }
            addCandidate(candidate);
        });

        document.querySelectorAll('p, div, td, dd, span, li').forEach(function (el) {
            var txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
            if (!txt || txt.length < 20 || txt.length > 3000) return;
            if (!/\b(course\s+literature|literature|kursuslitteratur|litteratur)\b\s*:/i.test(txt)) return;
            addCandidate(el);
        });

        return found;
    }

    function getKurserBarSectionData(barEl) {
        if (!barEl) return { text: '', lines: [], insertBeforeNode: null };
        var raw = '';
        var collected = [];
        var current = '';
        var node = barEl.nextSibling;
        var insertBeforeNode = null;

        function normalizeFragment(text) {
            return (text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        }
        function appendFragment(text) {
            var t = normalizeFragment(text);
            if (!t) return;
            current = current ? (current + ' ' + t) : t;
        }
        function flushCurrent() {
            var t = normalizeFragment(current);
            if (t) collected.push(t);
            current = '';
        }

        while (node) {
            if (node.nodeType === 1 && node.classList && node.classList.contains('bar')) {
                insertBeforeNode = node;
                break;
            }
            if (node.nodeType === 3) {
                var txtNodeText = node.textContent || '';
                raw += txtNodeText;
                appendFragment(txtNodeText);
            } else if (node.nodeType === 1) {
                if (node.tagName && node.tagName.toUpperCase() === 'BR') {
                    raw += '\n';
                    flushCurrent();
                } else if (node.tagName && /^(UL|OL)$/i.test(node.tagName)) {
                    flushCurrent();
                    var listItems = node.querySelectorAll('li');
                    listItems.forEach(function (li) {
                        var liTxt = normalizeFragment(li.innerText || li.textContent || '');
                        if (liTxt) collected.push(liTxt);
                    });
                } else {
                    var elementText = node.innerText || node.textContent || '';
                    raw += '\n' + elementText + '\n';
                    if (node.tagName && /^(P|DIV|SECTION|TABLE|TR)$/i.test(node.tagName)) {
                        flushCurrent();
                        appendFragment(elementText);
                        flushCurrent();
                    } else {
                        appendFragment(elementText);
                    }
                }
            }
            node = node.nextSibling;
        }
        flushCurrent();

        var lines = [];
        collected.forEach(function (line) {
            splitKurserLiteratureText(line).forEach(function (part) {
                var txt = (part || '').trim();
                if (!txt) return;
                if (/^recommended\s*:?\s*$/i.test(txt)) return;
                if (/^required\s*:?\s*$/i.test(txt)) return;
                lines.push(txt);
            });
        });

        return {
            text: raw,
            lines: lines,
            insertBeforeNode: insertBeforeNode
        };
    }

    function shouldMergeWrappedLiteratureLine(prev, next) {
        if (!prev || !next) return false;
        if (/^\s*(?:\[\s*\d+\s*\]|\d+\s*[.)])/.test(next)) return false;
        if (/^\s*(recommended|required|remarks|last\s+updated)\b/i.test(next)) return false;
        if (/^\s*[A-Z][A-Za-z'.\-]{1,30},\s*[A-Z]/.test(next) && /[.!?]\s*$/.test(prev)) return false;
        if (/\b(?:and|or|of|for|to|in|on|the|a|an|isbn:?|edition|ed\.)\s*$/i.test(prev)) return true;
        if (/[,:\-]\s*$/.test(prev)) return true;
        if (!/[.!?;]\s*$/.test(prev)) return true;
        if (next.length <= 35) return true;
        return false;
    }

    function splitKurserLiteratureText(raw) {
        var txt = (raw || '').replace(/\u00a0/g, ' ').trim();
        if (!txt) return [];

        txt = txt.replace(/[ \t]{2,}/g, ' ');
        var lines = txt.split(/\r?\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (lines.length > 1) {
            var merged = [];
            lines.forEach(function (line) {
                if (!merged.length) {
                    merged.push(line);
                    return;
                }
                var prev = merged[merged.length - 1];
                if (shouldMergeWrappedLiteratureLine(prev, line)) {
                    merged[merged.length - 1] = (prev + ' ' + line).replace(/\s+/g, ' ').trim();
                } else {
                    merged.push(line);
                }
            });

            var expanded = [];
            merged.forEach(function (line) {
                var bracketParts = line.split(/(?=\[\s*\d+\s*\])/g).map(function (s) { return s.trim(); }).filter(Boolean);
                if (bracketParts.length > 1) {
                    bracketParts.forEach(function (p) { expanded.push(p); });
                    return;
                }
                expanded.push(line);
            });
            return expanded;
        }

        var one = txt.replace(/\s+/g, ' ').trim();
        var splitByBracket = one.split(/(?=\[\s*\d+\s*\])/g).map(function (s) { return s.trim(); }).filter(Boolean);
        if (splitByBracket.length > 1) return splitByBracket;

        var splitByNumber = one.split(/(?=\b\d+\s*[.)]\s*[A-Z])/g).map(function (s) { return s.trim(); }).filter(Boolean);
        if (splitByNumber.length > 1) return splitByNumber;

        var splitBySemicolon = one.split(/\s*;\s*/g).map(function (s) { return s.trim(); }).filter(Boolean);
        if (splitBySemicolon.length > 1) return splitBySemicolon;

        return [one];
    }

    function extractISBNFromCitationLine(line) {
        if (!line) return null;
        var m = line.match(/\bISBN[-\s]?(?:1[03])?[\s:]*\s*([\dXx][\d\s-]{8,}[\dXx])\b/i);
        if (m && m[1]) {
            var isbn = normalizeISBN(m[1]);
            if (isValidISBN13(isbn) || isValidISBN10(isbn)) return isbn;
        }

        var b = line.match(/\b(97[89][\d-]{10,})\b/);
        if (b && b[1]) {
            var isbn13 = normalizeISBN(b[1]);
            if (isValidISBN13(isbn13)) return isbn13;
        }
        return null;
    }

    function countCapitalizedWords(line) {
        if (!line) return 0;
        return (line.match(/\b[A-Z][A-Za-z'`\-]{1,}\b/g) || []).length;
    }

    function countInitials(line) {
        if (!line) return 0;
        return (line.match(/\b[A-Z]\./g) || []).length;
    }

    function isLikelyBibliographicNameTitlePattern(line) {
        if (!line) return false;
        var txt = line.replace(/\s+/g, ' ').trim();
        if (!txt) return false;
        if (txt.split(/\s+/).length < 4 || txt.split(/\s+/).length > 65) return false;

        var lower = txt.toLowerCase();
        if (/^(the|this|that|in|it|course|other|recommended|required|notes?)\b/.test(lower)) return false;

        var capitals = countCapitalizedWords(txt);
        var initials = countInitials(txt);
        var connectorCount = (txt.match(/\s(?:and|&)\s|,/gi) || []).length;
        var punctuationCount = (txt.match(/[,.]/g) || []).length;

        if ((capitals + initials) < 5) return false;
        if (connectorCount === 0 && punctuationCount < 2) return false;
        return true;
    }

    function parseKurserCitationLine(rawLine) {
        if (!rawLine) return null;
        var line = rawLine.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        if (!line) return null;
        if (isNotesOnlyLiterature(line)) return null;
        if (/https?:\/\//i.test(line)) return null;

        var isbn = extractISBNFromCitationLine(line);
        var leadingCitationPattern = /^\s*(?:\[\s*\d+\s*\]|\d+\s*[.)])\s*/;
        var hasLeadingCitation = leadingCitationPattern.test(line);

        line = line.replace(leadingCitationPattern, '');
        line = line.replace(/\bISBN[-\s]?(?:1[03])?[\s:]*\s*[\dXx][\d\s-]{8,}[\dXx]\b/ig, '').trim();
        line = line
            .replace(/\(\s*all\s+editions?\s+are\s+ok\s*\)/ig, '')
            .replace(/\ball\s+editions?\s+are\s+ok\b/ig, '')
            .replace(/\s{2,}/g, ' ')
            .trim();

        var author = '';
        var title = '';

        var citationMatch = line.match(/^([^,]{2,140}),\s*([^.;][^.;]{2,220})/);
        var hasAuthorTitle = !!citationMatch;
        var publisherHint = /\b(press|wiley|springer|pearson|elsevier|cambridge|oxford|mcgraw|macmillan|routledge|cengage|crc)\b/i;
        var editionHint = /\b(edition|ed\.|e-book|ebook)\b/i;
        var genericNoise = /\b(in\s+addition|supplements?\s+will\s+be\s+provided|it\s+is\s+not\s+required|other\s+books?\s+on\s+the\s+same\s+topic|course\s+compendium|research\s+articles?|will\s+be\s+made\s+accessible|can\s+be\s+used\s+as\s+well|follow\s+the\s+course|notations?\s+in\s+the\s+course\s+material|freely\s+available)\b/i;
        var hasNameTitlePattern = isLikelyBibliographicNameTitlePattern(line);

        var hasStandaloneTitle = !hasAuthorTitle
            && /^[A-Z0-9][A-Za-z0-9&'()\-:,.\s]{8,}$/.test(line)
            && line.split(/\s+/).length >= 3
            && (publisherHint.test(line) || editionHint.test(line) || hasNameTitlePattern);

        var confidence = 0;
        if (isbn) confidence += 4;
        if (hasLeadingCitation) confidence += 2;
        if (hasAuthorTitle) confidence += 2;
        if (hasStandaloneTitle) confidence += 2;
        if (hasNameTitlePattern) confidence += 2;
        if (publisherHint.test(line)) confidence += 1;
        if (editionHint.test(line)) confidence += 1;
        if (genericNoise.test(line) && !publisherHint.test(line)) confidence -= 3;
        if (/https?:\/\//i.test(line)) confidence -= 3;
        if (line.length < 12) confidence -= 1;

        if (confidence < 2) return null;

        if (citationMatch) {
            author = citationMatch[1].trim();
            title = citationMatch[2].trim();
        } else {
            title = line;
        }

        title = title
            .replace(/\s*\((?:eds?|ed\.|chapter|kapitel)[^)]+\)\s*/ig, ' ')
            .replace(/[;,.:\-]\s*$/, '')
            .replace(/\s{2,}/g, ' ')
            .trim();

        if (!title && !isbn) return null;
        if (title && title.length < 3 && !isbn) return null;

        var queryText = line
            .replace(/\bpp?\.?\s*\d+\s*(?:[-–]\s*\d+)?\b/ig, '')
            .replace(/\bpages?\s*\d+\s*(?:[-–]\s*\d+)?\b/ig, '')
            .replace(/\b,?\s*pp?\s*[-:]?\s*\d+\s*(?:[-–]\s*\d+)?\b/ig, '')
            .replace(/[;,.]\s*$/, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        if (!isbn && (!queryText || queryText.length < 4)) return null;

        return {
            raw: rawLine,
            author: author,
            title: title,
            isbn: isbn,
            queryText: queryText
        };
    }

    function cleanKurserCitationQuery(query) {
        return (query || '')
            .replace(/\bpp?\.?\s*\d+\s*(?:[-–]\s*\d+)?\b/ig, '')
            .replace(/\bpages?\s*\d+\s*(?:[-–]\s*\d+)?\b/ig, '')
            .replace(/\b,?\s*pp?\s*[-:]?\s*\d+\s*(?:[-–]\s*\d+)?\b/ig, '')
            .replace(/\s{2,}/g, ' ')
            .replace(/[;,.]\s*$/, '')
            .trim();
    }

    function buildKurserFinditUrl(citation) {
        if (!citation) return null;
        var query = '';
        if (citation.isbn) {
            query = 'isbn:' + citation.isbn;
        } else if (citation.queryText) {
            query = cleanKurserCitationQuery(citation.queryText);
        } else {
            var parts = [];
            if (citation.title) parts.push(citation.title);
            if (citation.author) parts.push(citation.author);
            query = parts.join(' - ');
        }
        if (!query) return null;
        return 'https://findit.dtu.dk/en/catalog?utf8=%E2%9C%93&type=book&q=' + encodeURIComponent(query);
    }

    function buildKurserGoogleBooksUrl(citation) {
        if (!citation) return null;
        var query = '';
        if (citation.isbn) {
            query = 'isbn:' + citation.isbn;
        } else if (citation.queryText) {
            query = cleanKurserCitationQuery(citation.queryText);
        } else {
            var parts = [];
            if (citation.title) parts.push(citation.title);
            if (citation.author) parts.push(citation.author);
            query = parts.join(' - ');
        }
        if (!query) return null;
        return 'https://books.google.com/books?q=' + encodeURIComponent(query);
    }

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

    function styleLibraryBadgeAsOnline(badge) {
        if (!badge || !badge.style) return;
        badge.textContent = 'Free PDF ✅';
        badge.style.setProperty('background-color', '#2e7d32', 'important');
        badge.style.setProperty('border-color', '#43a047', 'important');
        badge.style.setProperty('color', '#ffffff', 'important');
    }

    function createKurserLibraryBadge(url) {
        var badge = document.createElement('a');
        markExt(badge);
        badge.setAttribute('data-dtu-textbook-linker', '1');
        badge.setAttribute('data-dtu-textbook-linker-kind', 'library');
        badge.href = url;
        badge.target = '_blank';
        badge.rel = 'noopener noreferrer';
        badge.textContent = 'Check Library';
        badge.style.cssText = isDarkModeEnabled()
            ? 'display: inline-block; margin-left: 8px; padding: 2px 7px; border-radius: 10px; '
            + 'font-size: 11px; line-height: 1.3; font-weight: 600; text-decoration: none; '
            + 'background: rgba(102,179,255,0.14); color: #7cc0ff; border: 1px solid rgba(102,179,255,0.55);'
            : 'display: inline-block; margin-left: 8px; padding: 2px 7px; border-radius: 10px; '
            + 'font-size: 11px; line-height: 1.3; font-weight: 600; text-decoration: none; '
            + 'background: #eef6ff; color: #1a73e8; border: 1px solid #9dc7ff;';
        return badge;
    }

    function createKurserGoogleBooksBadge(url) {
        var badge = document.createElement('a');
        markExt(badge);
        badge.setAttribute('data-dtu-textbook-linker', '1');
        badge.setAttribute('data-dtu-textbook-linker-kind', 'google-books');
        badge.href = url;
        badge.target = '_blank';
        badge.rel = 'noopener noreferrer';
        badge.textContent = 'Google Books';
        badge.style.cssText = isDarkModeEnabled()
            ? 'display: inline-block; margin-left: 8px; padding: 2px 7px; border-radius: 10px; '
            + 'font-size: 11px; line-height: 1.3; font-weight: 600; text-decoration: none; '
            + 'background: rgba(255,183,77,0.14); color: #ffcc80; border: 1px solid rgba(255,183,77,0.55);'
            : 'display: inline-block; margin-left: 8px; padding: 2px 7px; border-radius: 10px; '
            + 'font-size: 11px; line-height: 1.3; font-weight: 600; text-decoration: none; '
            + 'background: #fff6e8; color: #8a4b00; border: 1px solid #f0c07a;';
        return badge;
    }

    function extractLiteratureLineTargets(container) {
        var items = [];
        var blockCandidates = container.querySelectorAll('li, p');

        if (blockCandidates.length) {
            blockCandidates.forEach(function (node) {
                var raw = (node.innerText || node.textContent || '');
                splitKurserLiteratureText(raw).forEach(function (txt) {
                    if (!txt) return;
                    items.push({ text: txt, anchor: node });
                });
            });
        } else {
            var raw = (container.innerText || container.textContent || '');
            splitKurserLiteratureText(raw).forEach(function (txt) {
                items.push({ text: txt, anchor: container });
            });
        }

        var seen = Object.create(null);
        return items.filter(function (item) {
            if (!item.text || seen[item.text]) return false;
            seen[item.text] = true;
            return true;
        });
    }

    function injectKurserTextbookBadges(container, lines) {
        var fallback = null;
        var injected = 0;
        var seenKeys = Object.create(null);

        lines.forEach(function (item) {
            var parsed = parseKurserCitationLine(item.text);
            if (!parsed) return;
            var libraryUrl = buildKurserFinditUrl(parsed);
            var googleBooksUrl = buildKurserGoogleBooksUrl(parsed);
            if (!libraryUrl && !googleBooksUrl) return;

            var key = (parsed.isbn || cleanKurserCitationQuery(parsed.queryText || parsed.title || '')).toLowerCase();
            if (!key) key = libraryUrl || googleBooksUrl;
            if (seenKeys[key]) return;
            seenKeys[key] = true;

            var libraryBadge = null;
            var googleBadge = null;
            if (libraryUrl) {
                libraryBadge = createKurserLibraryBadge(libraryUrl);
                checkFinditOnlineAccess(libraryUrl, function (hasOnlineAccess) {
                    if (hasOnlineAccess) styleLibraryBadgeAsOnline(libraryBadge);
                });
            }
            if (googleBooksUrl) {
                googleBadge = createKurserGoogleBooksBadge(googleBooksUrl);
            }

            var badgeGroup = null;
            if (libraryBadge || googleBadge) {
                badgeGroup = document.createElement('span');
                markExt(badgeGroup);
                badgeGroup.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; flex-wrap: nowrap; white-space: nowrap;';
                if (libraryBadge) badgeGroup.appendChild(libraryBadge);
                if (googleBadge) badgeGroup.appendChild(googleBadge);
            }

            if (item.anchor !== container) {
                if (item.anchor.querySelector('[data-dtu-textbook-linker]')) return;
                if (badgeGroup) {
                    item.anchor.appendChild(document.createTextNode(' '));
                    item.anchor.appendChild(badgeGroup);
                }
                injected++;
                return;
            }

            if (!fallback) {
                fallback = document.createElement('div');
                markExt(fallback);
                fallback.setAttribute('data-dtu-textbook-linker-fallback', '1');
                fallback.style.cssText = 'margin-top: 8px; display: flex; flex-direction: column; gap: 4px;';
                container.appendChild(fallback);
            }
            var row = document.createElement('div');
            markExt(row);
            row.style.cssText = 'display: flex; align-items: center; flex-wrap: wrap; gap: 6px;';
            var excerpt = document.createElement('span');
            markExt(excerpt);
            excerpt.style.cssText = 'font-size: 12px; opacity: 0.85;';
            var clean = item.text.replace(/\s+/g, ' ').trim();
            excerpt.textContent = clean.length > 90 ? (clean.slice(0, 87) + '...') : clean;
            row.appendChild(excerpt);
            if (badgeGroup) row.appendChild(badgeGroup);
            fallback.appendChild(row);
            injected++;
        });

        return injected;
    }

    function processKurserLiteratureBarSections() {
        var bars = document.querySelectorAll('.bar');
        if (!bars.length) return;

        bars.forEach(function (bar) {
            var label = (bar.textContent || '').replace(/\s+/g, ' ').trim();
            if (!isKurserLiteratureLabel(label)) return;
            if (bar.getAttribute('data-dtu-textbook-linker-scanned') === '1') return;

            var attempts = parseInt(bar.getAttribute('data-dtu-textbook-linker-attempts') || '0', 10);
            if (attempts >= 5) return;
            bar.setAttribute('data-dtu-textbook-linker-attempts', String(attempts + 1));

            var section = getKurserBarSectionData(bar);
            if (!section || !section.lines.length) return;
            if (isNotesOnlyLiterature((section.text || '').replace(/\s+/g, ' ').trim())) {
                bar.setAttribute('data-dtu-textbook-linker-scanned', '1');
                return;
            }

            var existingHost = bar.parentElement
                ? bar.parentElement.querySelector('[data-dtu-textbook-linker-bar-host-for="' + label.toLowerCase() + '"]')
                : null;
            if (existingHost && existingHost.querySelector('[data-dtu-textbook-linker]')) {
                bar.setAttribute('data-dtu-textbook-linker-scanned', '1');
                return;
            }

            var seenLines = Object.create(null);
            var uniqueLines = [];
            section.lines.forEach(function (line) {
                var key = line.toLowerCase().replace(/\s+/g, ' ').trim();
                if (seenLines[key]) return;
                seenLines[key] = true;
                uniqueLines.push(line);
            });

            var node = bar.nextSibling;
            var toHide = [];
            while (node) {
                if (node.nodeType === 1 && node.classList && node.classList.contains('bar')) break;
                if (node.nodeType === 1 && node.hasAttribute('data-dtu-textbook-linker-bar-host')) { node = node.nextSibling; continue; }
                if (node.nodeType === 1 && node.hasAttribute('data-dtu-textbook-original')) { node = node.nextSibling; continue; }
                toHide.push(node);
                node = node.nextSibling;
            }
            if (toHide.length) {
                var originalWrap = document.createElement('div');
                originalWrap.style.display = 'none';
                originalWrap.setAttribute('data-dtu-textbook-original', '1');
                markExt(originalWrap);
                bar.insertAdjacentElement('afterend', originalWrap);
                toHide.forEach(function (n) { originalWrap.appendChild(n); });
            }

            var host = document.createElement('div');
            markExt(host);
            host.setAttribute('data-dtu-textbook-linker-bar-host', '1');
            host.setAttribute('data-dtu-textbook-linker-bar-host-for', label.toLowerCase());
            host.style.cssText = 'margin: 8px 0 12px; padding: 0 8px;';

            var insertRef = bar.nextSibling;
            while (insertRef && insertRef.nodeType === 1 && insertRef.hasAttribute('data-dtu-textbook-original')) {
                insertRef = insertRef.nextSibling;
            }
            if (insertRef) {
                bar.parentNode.insertBefore(host, insertRef);
            } else if (bar.parentNode) {
                bar.parentNode.appendChild(host);
            }

            var isDark = isDarkModeEnabled();
            var accentColor = isDark ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)';
            var textColor = isDark ? '#e0e0e0' : '#333';
            var mutedColor = isDark ? '#888' : '#777';
            var dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

            var injectedCount = 0;
            var seenKeys = Object.create(null);

            uniqueLines.forEach(function (lineText) {
                var parsed = parseKurserCitationLine(lineText);
                if (!parsed) return;
                var libraryUrl = buildKurserFinditUrl(parsed);
                var googleBooksUrl = buildKurserGoogleBooksUrl(parsed);
                if (!libraryUrl && !googleBooksUrl) return;

                var key = (parsed.isbn || cleanKurserCitationQuery(parsed.queryText || parsed.title || '')).toLowerCase();
                if (!key) key = libraryUrl || googleBooksUrl;
                if (seenKeys[key]) return;
                seenKeys[key] = true;

                if (injectedCount > 0) {
                    var divider = document.createElement('div');
                    markExt(divider);
                    divider.style.cssText = 'border-top: 1px solid ' + dividerColor + '; margin: 6px 0;';
                    host.appendChild(divider);
                }

                var row = document.createElement('div');
                markExt(row);
                row.setAttribute('data-dtu-textbook-linker', '1');
                row.style.cssText = 'display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 6px 0; flex-wrap: wrap;';

                var citationEl = document.createElement('span');
                markExt(citationEl);
                citationEl.style.cssText = 'font-size: 13px; color: ' + textColor + '; flex: 1 1 auto; min-width: 200px; line-height: 1.5;';
                citationEl.textContent = lineText;
                row.appendChild(citationEl);

                var actions = document.createElement('span');
                markExt(actions);
                actions.style.cssText = 'display: inline-flex; align-items: center; gap: 12px; flex-shrink: 0; white-space: nowrap;';

                if (libraryUrl) {
                    var finditLink = document.createElement('a');
                    markExt(finditLink);
                    finditLink.setAttribute('data-dtu-textbook-linker', '1');
                    finditLink.setAttribute('data-dtu-textbook-linker-kind', 'library');
                    finditLink.href = libraryUrl;
                    finditLink.target = '_blank';
                    finditLink.rel = 'noopener noreferrer';
                    finditLink.textContent = 'DTU FindIt';
                    finditLink.style.cssText = 'font-size: 12px; font-weight: 600; text-decoration: none; '
                        + 'color: ' + accentColor + '; padding: 2px 8px; border-radius: 3px; '
                        + 'border: 1px solid ' + (isDark ? 'rgba(var(--dtu-ad-accent-deep-rgb),0.35)' : 'rgba(var(--dtu-ad-accent-deep-rgb),0.2)') + '; '
                        + 'background: ' + (isDark ? 'rgba(var(--dtu-ad-accent-deep-rgb),0.18)' : 'rgba(var(--dtu-ad-accent-deep-rgb),0.05)') + ';';
                    actions.appendChild(finditLink);

                    checkFinditOnlineAccess(libraryUrl, function (hasOnlineAccess) {
                        if (hasOnlineAccess) {
                            finditLink.textContent = 'Free PDF';
                            finditLink.style.setProperty('color', isDark ? '#81c784' : '#2e7d32', 'important');
                            finditLink.style.setProperty('border-color', isDark ? 'rgba(129,199,132,0.5)' : '#43a047', 'important');
                            finditLink.style.setProperty('background', isDark ? 'rgba(46,125,50,0.15)' : 'rgba(46,125,50,0.06)', 'important');
                        }
                    });
                }

                if (googleBooksUrl) {
                    var googleLink = document.createElement('a');
                    markExt(googleLink);
                    googleLink.setAttribute('data-dtu-textbook-linker', '1');
                    googleLink.setAttribute('data-dtu-textbook-linker-kind', 'google-books');
                    googleLink.href = googleBooksUrl;
                    googleLink.target = '_blank';
                    googleLink.rel = 'noopener noreferrer';
                    googleLink.textContent = 'Google Books';
                    googleLink.style.cssText = 'font-size: 12px; text-decoration: none; color: ' + mutedColor + ';';
                    actions.appendChild(googleLink);
                }

                row.appendChild(actions);
                host.appendChild(row);
                injectedCount++;
            });

            if (injectedCount > 0 || attempts >= 4) {
                bar.setAttribute('data-dtu-textbook-linker-scanned', '1');
            }
        });
    }

    function restoreKurserLiteratureOriginals() {
        document.querySelectorAll('[data-dtu-textbook-original]').forEach(function (wrapper) {
            var parent = wrapper.parentNode;
            if (!parent) { wrapper.remove(); return; }
            while (wrapper.firstChild) {
                parent.insertBefore(wrapper.firstChild, wrapper);
            }
            wrapper.remove();
        });
    }

    function clearKurserTextbookUi() {
        document.querySelectorAll('[data-dtu-textbook-linker], [data-dtu-textbook-linker-bar-host], [data-dtu-textbook-linker-fallback]').forEach(function (el) {
            el.remove();
        });
        restoreKurserLiteratureOriginals();
        document.querySelectorAll('[data-dtu-textbook-linker-scanned], [data-dtu-textbook-linker-attempts]').forEach(function (el) {
            el.removeAttribute('data-dtu-textbook-linker-scanned');
            el.removeAttribute('data-dtu-textbook-linker-attempts');
        });
    }

    function insertKurserTextbookLinks() {
        if (!isTopWindow()) return;
        if (!isFeatureFlagEnabled(getTextbookLinksFeatureKey())) {
            clearKurserTextbookUi();
            return;
        }
        if (!isKurserCoursePage()) return;

        processKurserLiteratureBarSections();

        var containers = findKurserLiteratureContainers();
        if (!containers.length) return;

        containers.forEach(function (container) {
            if (!container || container.getAttribute('data-dtu-textbook-linker-scanned') === '1') return;
            var attempts = parseInt(container.getAttribute('data-dtu-textbook-linker-attempts') || '0', 10);
            if (attempts >= 5) return;
            container.setAttribute('data-dtu-textbook-linker-attempts', String(attempts + 1));

            if (container.querySelector('[data-dtu-textbook-linker]')) {
                container.setAttribute('data-dtu-textbook-linker-scanned', '1');
                return;
            }

            var fullText = (container.innerText || container.textContent || '').replace(/\s+/g, ' ').trim();
            if (isNotesOnlyLiterature(fullText)) {
                container.setAttribute('data-dtu-textbook-linker-scanned', '1');
                return;
            }

            var lines = extractLiteratureLineTargets(container);
            if (!lines.length) return;

            var injected = injectKurserTextbookBadges(container, lines);
            if (injected > 0) {
                container.setAttribute('data-dtu-textbook-linker-scanned', '1');
            }
        });
    }

    function scheduleKurserTextbookLinker(delayMs) {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'kurser.dtu.dk') return;
        if (!isFeatureFlagEnabled(getTextbookLinksFeatureKey())) {
            clearKurserTextbookUi();
            return;
        }
        if (_kurserTextbookLinkerTimer) return;
        _kurserTextbookLinkerTimer = setTimeout(function () {
            _kurserTextbookLinkerTimer = null;
            insertKurserTextbookLinks();
        }, delayMs || 550);
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
        globalThis.DTUAfterDarkTextbooksUi = {
            insertKurserTextbookLinks: insertKurserTextbookLinks,
            scheduleKurserTextbookLinker: scheduleKurserTextbookLinker,
            insertBookFinderLinks: insertBookFinderLinks
        };
    } catch (eExpose) { }
})();
