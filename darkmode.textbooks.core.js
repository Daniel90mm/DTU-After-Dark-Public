(function () {
    'use strict';
    var markExt = globalThis.DTUAfterDarkDom.markExt;
    var isTopWindow = globalThis.DTUAfterDarkDom.isTopWindow;

    function getDeps() {
        try { return globalThis.DTUAfterDarkTextbooksDeps || null; } catch (e0) { return null; }
    }


    function sendRuntimeMessage(msg, cb) {
        var deps = getDeps();
        if (deps && typeof deps.sendRuntimeMessage === 'function') {
            deps.sendRuntimeMessage(msg, cb);
            return;
        }
        if (cb) cb(null);
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

    function mergeKurserCitationTargets(items) {
        var merged = [];
        items.forEach(function (item) {
            var text = String(item.text || '').trim();
            var previous = merged[merged.length - 1];
            var isIsbnOnly = /^(?:ISBN[-\s]?(?:1[03])?[\s:]*)?[\dXx][\d\s-]*[\dXx][.,;]?$/i.test(text)
                && !!extractISBNFromCitationLine(text);
            var previousCitation = previous && isIsbnOnly ? parseKurserCitationLine(previous.text) : null;
            if (previousCitation && previousCitation.title && !previousCitation.isbn) {
                previous.text += ' ' + text;
            } else {
                merged.push({ text: text, anchor: item.anchor });
            }
        });
        return merged;
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

        var splitByNumber = one.split(/(?=\b\d{1,3}\s*[.)]\s*[A-Z])/g).map(function (s) { return s.trim(); }).filter(Boolean);
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

    try {
        globalThis.DTUAfterDarkTextbooksCore = {
            getDeps: getDeps,
            markExt: markExt,
            sendRuntimeMessage: sendRuntimeMessage,
            isTopWindow: isTopWindow,
            isFeatureFlagEnabled: isFeatureFlagEnabled,
            isKurserCoursePage: isKurserCoursePage,
            isDTULearnCoursePage: isDTULearnCoursePage,
            isDarkModeEnabled: isDarkModeEnabled,
            normalizeISBN: normalizeISBN,
            isValidISBN13: isValidISBN13,
            isValidISBN10: isValidISBN10,
            isNotesOnlyLiterature: isNotesOnlyLiterature,
            getTextbookLinksFeatureKey: getTextbookLinksFeatureKey,
            mergeKurserCitationTargets: mergeKurserCitationTargets,
            shouldMergeWrappedLiteratureLine: shouldMergeWrappedLiteratureLine,
            splitKurserLiteratureText: splitKurserLiteratureText,
            extractISBNFromCitationLine: extractISBNFromCitationLine,
            countCapitalizedWords: countCapitalizedWords,
            countInitials: countInitials,
            isLikelyBibliographicNameTitlePattern: isLikelyBibliographicNameTitlePattern,
            parseKurserCitationLine: parseKurserCitationLine,
            cleanKurserCitationQuery: cleanKurserCitationQuery,
            buildKurserFinditUrl: buildKurserFinditUrl,
            buildKurserGoogleBooksUrl: buildKurserGoogleBooksUrl
        };
    } catch (eExpose) { }
})();
