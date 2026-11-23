(function () {
    'use strict';

    var _textbooksCore = globalThis.DTUAfterDarkTextbooksCore;
    if (!_textbooksCore) throw new Error('darkmode.textbooks.kurser.js loaded before darkmode.textbooks.core.js');

    var markExt = _textbooksCore.markExt;
    var isTopWindow = _textbooksCore.isTopWindow;
    var isFeatureFlagEnabled = _textbooksCore.isFeatureFlagEnabled;
    var isKurserCoursePage = _textbooksCore.isKurserCoursePage;
    var isDarkModeEnabled = _textbooksCore.isDarkModeEnabled;
    var isNotesOnlyLiterature = _textbooksCore.isNotesOnlyLiterature;
    var getTextbookLinksFeatureKey = _textbooksCore.getTextbookLinksFeatureKey;
    var mergeKurserCitationTargets = _textbooksCore.mergeKurserCitationTargets;
    var splitKurserLiteratureText = _textbooksCore.splitKurserLiteratureText;
    var extractISBNFromCitationLine = _textbooksCore.extractISBNFromCitationLine;
    var parseKurserCitationLine = _textbooksCore.parseKurserCitationLine;
    var cleanKurserCitationQuery = _textbooksCore.cleanKurserCitationQuery;
    var buildKurserFinditUrl = _textbooksCore.buildKurserFinditUrl;
    var buildKurserGoogleBooksUrl = _textbooksCore.buildKurserGoogleBooksUrl;
    var findKnownLiterature = _textbooksCore.findKnownLiterature;

    // Books checked once per semester (scripts/build-literature-data.mjs). A course whose literature text
    // still has the key in the file shows those books; any other course is parsed on the page.
    var LITERATURE_DATA_FILE = 'literature-data.json';
    var _literatureData; // undefined: not asked yet; null: loading; object: loaded (empty after a failure)

    function loadLiteratureData(done) {
        _literatureData = null;
        var deps = _textbooksCore.getDeps();
        if (!deps || typeof deps.getExtensionUrl !== 'function') throw new Error('DTUAfterDarkTextbooksDeps.getExtensionUrl is missing');
        fetch(deps.getExtensionUrl(LITERATURE_DATA_FILE))
            .then(function (res) {
                if (!res.ok) throw new Error('http ' + res.status);
                return res.json();
            })
            .then(function (data) {
                if (!data || !data.courses) throw new Error('bad data');
                _literatureData = data;
            })
            .catch(function (err) {
                console.warn('[DTU After Dark] ' + LITERATURE_DATA_FILE + ' not loaded, parsing literature on the page:', err);
                _literatureData = { courses: {} };
            })
            .then(done);
    }

    function currentCourseCode() {
        var deps = _textbooksCore.getDeps();
        if (!deps || typeof deps.getKurserCourseCode !== 'function') throw new Error('DTUAfterDarkTextbooksDeps.getKurserCourseCode is missing');
        return deps.getKurserCourseCode();
    }

    var _kurserTextbookLinkerTimer = null;

    // Glue for the FindIt availability call that stays with the Learn book finder.
    function checkFinditOnlineAccess(url, cb) {
        var ui = globalThis.DTUAfterDarkTextbooksUi;
        if (!ui || typeof ui.checkFinditOnlineAccess !== 'function') {
            throw new Error('darkmode.textbooks.kurser.js loaded before darkmode.textbooks.js');
        }
        return ui.checkFinditOnlineAccess(url, cb);
    }

    function isKurserLiteratureLabel(text) {
        if (!text) return false;
        var normalized = text.replace(/\s+/g, ' ').trim();
        if (!normalized) return false;
        if (normalized.length > 130) return false;

        var lower = normalized.toLowerCase();
        // Danish course pages head the section "Litteraturhenvisninger" (one compound word).
        if (/^(course\s+literature|literature|kursuslitteratur|litteratur|litteraturhenvisning(?:er)?)\s*:?\s*$/.test(lower)) return true;

        if (/\b(literature|litteratur|kursuslitteratur|litteraturhenvisning(?:er)?)\b/.test(lower)) {
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
            if (!/\b(course\s+literature|literature|kursuslitteratur|litteratur|litteraturhenvisning(?:er)?)\b\s*:/i.test(txt)) return;
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
            if (node.nodeType === 1 && node.hasAttribute && node.hasAttribute('data-dtu-textbook-linker-bar-host')) {
                node = node.nextSibling;
                continue;
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
            lines: mergeKurserCitationTargets(lines.map(function (text) { return { text: text }; })).map(function (item) { return item.text; }),
            insertBeforeNode: insertBeforeNode
        };
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
        return mergeKurserCitationTargets(items).filter(function (item) {
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

    // Returns how many literature bars the page has; the page-wide fallback scan runs only when it has none.
    function processKurserLiteratureBarSections() {
        var bars = document.querySelectorAll('.bar');
        var literatureBars = 0;

        bars.forEach(function (bar) {
            var label = (bar.textContent || '').replace(/\s+/g, ' ').trim();
            if (!isKurserLiteratureLabel(label)) return;
            literatureBars++;
            if (bar.getAttribute('data-dtu-textbook-linker-scanned') === '1') return;

            var attempts = parseInt(bar.getAttribute('data-dtu-textbook-linker-attempts') || '0', 10);
            if (attempts >= 5) return;
            bar.setAttribute('data-dtu-textbook-linker-attempts', String(attempts + 1));

            var section = getKurserBarSectionData(bar);
            if (!section || !section.lines.length) return;
            var known = findKnownLiterature(_literatureData, currentCourseCode(), section.text);
            if (known && !known.length) {
                bar.setAttribute('data-dtu-textbook-linker-scanned', '1');
                return;
            }
            if (!known && isNotesOnlyLiterature((section.text || '').replace(/\s+/g, ' ').trim())) {
                bar.setAttribute('data-dtu-textbook-linker-scanned', '1');
                return;
            }

            // Compared, not put in a selector: a label with a quote would make the selector throw.
            var existingHost = bar.parentElement
                ? Array.prototype.find.call(bar.parentElement.querySelectorAll('[data-dtu-textbook-linker-bar-host-for]'), function (h) {
                    return h.getAttribute('data-dtu-textbook-linker-bar-host-for') === label.toLowerCase();
                }) || null
                : null;
            if (existingHost && existingHost.querySelector('[data-dtu-textbook-linker]')) {
                bar.setAttribute('data-dtu-textbook-linker-scanned', '1');
                return;
            }

            var citations = known;
            if (!citations) {
                var seenLines = Object.create(null);
                citations = [];
                section.lines.forEach(function (line) {
                    var key = line.toLowerCase().replace(/\s+/g, ' ').trim();
                    if (seenLines[key]) return;
                    seenLines[key] = true;
                    var parsed = parseKurserCitationLine(line);
                    if (parsed) citations.push(parsed);
                });
            }
            // Nothing to link: leave DTU's literature text as it is, never hide it under an empty bar.
            citations = citations.filter(function (c) { return buildKurserFinditUrl(c) || buildKurserGoogleBooksUrl(c); });
            if (!citations.length) {
                if (attempts >= 4) bar.setAttribute('data-dtu-textbook-linker-scanned', '1');
                return;
            }

            // DTU's literature text stays as it is; the links go after it, at the end of the section.
            var isDark = isDarkModeEnabled();
            var accentColor = isDark ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep-text, var(--dtu-ad-accent-deep))';
            var textColor = isDark ? '#e0e0e0' : '#333';
            var mutedColor = isDark ? '#888' : '#777';
            var dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

            var host = document.createElement('div');
            markExt(host);
            host.setAttribute('data-dtu-textbook-linker-bar-host', '1');
            host.setAttribute('data-dtu-textbook-linker-bar-host-for', label.toLowerCase());
            host.style.cssText = 'margin: 8px 0 12px; padding: 6px 8px 0; border-top: 1px solid ' + dividerColor + ';';
            if (section.insertBeforeNode) section.insertBeforeNode.parentNode.insertBefore(host, section.insertBeforeNode);
            else if (bar.parentNode) bar.parentNode.appendChild(host);

            var injectedCount = 0;
            var seenKeys = Object.create(null);

            citations.forEach(function (parsed) {
                var lineText = parsed.raw;
                var libraryUrl = buildKurserFinditUrl(parsed);
                var googleBooksUrl = buildKurserGoogleBooksUrl(parsed);
                if (!libraryUrl && !googleBooksUrl) return;

                var key = (parsed.isbn || cleanKurserCitationQuery(parsed.queryText || parsed.title || '')).toLowerCase();
                if (!key) key = libraryUrl || googleBooksUrl;
                // The dataset lists each work once; two volumes may share a search.
                if (!known && seenKeys[key]) return;
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
                citationEl.textContent = parsed.display || lineText;
                citationEl.title = lineText;
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
        return literatureBars;
    }

    function clearKurserTextbookUi() {
        document.querySelectorAll('[data-dtu-textbook-linker], [data-dtu-textbook-linker-bar-host], [data-dtu-textbook-linker-fallback]').forEach(function (el) {
            el.remove();
        });
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
        if (_literatureData === undefined) {
            loadLiteratureData(insertKurserTextbookLinks);
            return;
        }
        if (_literatureData === null) return;

        // The bar owns its section; scanning the rest of the page only found junk such as "Last updated".
        if (processKurserLiteratureBarSections()) return;

        var containers = findKurserLiteratureContainers();
        if (!containers.length) return;

        containers.forEach(function (container) {
            if (!container || container.getAttribute('data-dtu-textbook-linker-scanned') === '1') return;
            // The bar pass already listed these books; its hidden copy of the text must not be scanned again.
            if (container.closest('[data-dtu-textbook-linker-bar-host]')) return;
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

    try {
        globalThis.DTUAfterDarkTextbooksKurser = {
            insertKurserTextbookLinks: insertKurserTextbookLinks,
            scheduleKurserTextbookLinker: scheduleKurserTextbookLinker
        };
    } catch (eExpose) { }
})();
