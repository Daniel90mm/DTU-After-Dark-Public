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


    // A course-literature line as a book: main title plus first author's surname.
    // Course pages mix citations into prose ("we will use part of <Title>, by <Author>"),
    // so the title is a run of capitalised words in a segment that is neither a list of
    // names nor publisher/edition noise. Queries stay short so FindIt sees a plain book lookup.
    var CITATION_LABEL = /^(?:main\s+course\s+book|course\s+book|text\s*book|basic\s+theory|course\s+literature|literature|recommended(?:\s+literature)?|required(?:\s+literature)?|supplementary(?:\s+(?:literature|readings?))?|mandatory|obligatory|title|authors?|publisher|books?)\s*:\s*/i;
    var TITLE_CONNECTOR = /^(?:of|and|for|the|in|on|to|a|an|with|from|at|into|&|og|i|til|af|med|und|der|die|das|-)$/i;
    var NOISE_SEGMENT = /\b(?:edition|ed\.?|eds\.?|udgave|press|publish\w*|forlag|springer|wiley|pearson|elsevier|prentice|mcgraw|crc|woodhead|routledge|cengage|academic|bookboon|sider|pages|pp|electronic|e-?book|available|latest|recent|equivalent|DTU|CampusNet|Learn|FindIt|Polyteknisk|Boghandel|notes?|slides|handouts?|articles?|papers?|website|chapters?)\b|^\s*(?:\d|©)/i;
    // A publisher, however capitalised: "Cambridge University Press", "Kogan Page Publishers", "Garland Science 2019".
    var PUBLISHER_SEGMENT = /^(?:[\p{Lu}&][\p{L}&'.-]*\s+){0,4}(?:University\s+Press|Press|Publishing|Publishers?|Forlag|Verlag|Education(?:\s+(?:Inc|Ltd|Limited))?|Inc|Ltd|Limited|Corporation|Scientific|Sons)\.?(?:\s+(?:19|20)\d\d)?$|^(?:Wiley|Springer|Elsevier(?:\s+Science)?|Pearson|Routledge|Garland\s+Science|Cengage(?:\s+Learning)?|Harvard\s+Business\s+(?:School|Press)|Taylor\s+(?:and|&)\s+Francis(?:\s+Group)?|Oxford|Cambridge|McGraw-Hill)\.?(?:\s+(?:19|20)\d\d)?$/u;
    var PLATFORM_WORD = /\b(?:DTU|CampusNet|Learn|FindIt|Polyteknisk|Boghandel)\b/;
    // Edition, year and availability details are never part of a title, however capitalised.
    var HARD_NOISE = /\b(?:edition|udgave|version|sider|pages|latest|recent|equivalent|available|literature|examples?|guidelines|teacher|book)\b|^\s*(?:\d|©)/i;
    var NAME_PART = /^(?:(?:\p{Lu}\.\s*)+|\p{Lu}{2,3}|van|von|de|der|den|da|di|du|la|le|\p{Lu}[\p{Ll}'’]*(?:[-'’]?\p{Lu}?\p{Ll}+)*\.?|Jr\.?)$/u;

    var PROSE_WORD = /\b(?:we|will|is|are|be|been|used|use|using|consists?|course|students?|you|our|which|this|these|also|other|see|according|background|knowledge|read|reading|parts?|selected)\b/i;
    // Volume(issue) as "32(6)" or "37 (2-4)"; not "2001 (online at DTU Library)".
    var ARTICLE_LINE = /\b\d+\s*\(\s*\d[\w\s-]*\)\s*[,.:]?\s*(?:\d+\s*[-–]\s*\d+)?|\bdoi\.org\b|\bdoi:|\bJournal\s+of\b/i;

    function decodeEntities(text) {
        return String(text || '').replace(/&amp;/g, '&');
    }

    function cleanCitationText(text) {
        return decodeEntities(text)
            .replace(/[\u{200b}-\u{200d}\u{2060}\u{feff}\u{ad}]/gu, '')
            .replace(/(\p{Ll})-\s*(ing|tion|sion|ment|ness|ity)\b/gu, '$1$2')
            .replace(/\(?\s*https?:\/\/\S+\s*\)?/gi, ' ')
            .replace(/\bdoi:\s*\S+/gi, ' ')
            .replace(/\bISBN[-\s]?(?:1[03])?[\s:]*[\dXx][\d\s-]{8,}[\dXx]\b/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^(?:[-•*]|\[\s*\d+\s*\]|\d{1,2}\s*[.)])\s*/, '')
            .replace(CITATION_LABEL, '')
            .trim();
    }

    // Words that end titles, not names: "Computer Vision", "Continuum Mechanics", "Product Customization".
    var INITIALS = /^(?:\p{Lu}\.?){1,3}$/u;
    // A dotted or one-letter initial; not "PSA" or "LLC".
    var NEAR_INITIAL = /^(?:\p{Lu}\.)+$|^\p{Lu}$/u;
    var TITLE_WORD = /(?:tion|sion|sis|ity|ics|ing|ment|ness|ogy|ies|ure|ance|ence|ism|ships?|ware|works|book|guide|theory|systems?|methods?|design|engineering|science|physics|chemistry|mechanics|analysis|principles|introduction|handbook|manual|fundamentals|structures?|materials?|economics|management|optics|acoustics|plasticity)$/i;

    function nameWords(p) {
        return p.replace(/\.(?=\p{Lu})/gu, '. ').split(/\s+/).filter(Boolean);
    }

    // 'sure': initials, "et al." or several people; 'maybe': two or three capitalised words
    // ("Computer Vision" and "Richard Szeliski" look alike); '' otherwise.
    function nameKind(seg) {
        var hasEtAl = /\bet\.?\s*al/i.test(seg);
        var s = seg.replace(/\bet\.?\s*al\.?/gi, '').replace(/\(\s*\d{4}\s*\)/g, '').trim();
        if (!s) return hasEtAl ? 'sure' : '';
        var people = s.split(/\s*(?:&|\||\band\b|\bog\b)\s*/i).filter(Boolean);
        if (!people.length) return '';
        // "Matthies M." ends like "Economies", but a word next to an initial is a name.
        var allWords = nameWords(s);
        if (allWords.some(function (w, i) {
            // "Jure Leskovec": a short first word is a given name, whatever it ends in.
            return TITLE_WORD.test(w.replace(/[.,]$/, '')) && (i > 0 || w.length > 6)
                && !NEAR_INITIAL.test(allWords[i + 1] || '') && !NEAR_INITIAL.test(allWords[i - 1] || '');
        })) return '';
        var initials = false;
        var ok = people.every(function (p) {
            var words = nameWords(p);
            if (!words.length || words.length > 5) return false;
            if (words.some(function (w) { return /^(?:\p{Lu}\.)+$|^\p{Lu}{1,3}$/u.test(w); })) initials = true;
            // "Perumal A": a capital A or I after a name is an initial, not the word "a" or "i".
            return words.every(function (w, i) { return NAME_PART.test(w) && !isConnectorInName(w, i, words.length); });
        });
        if (!ok) return '';
        if (initials || hasEtAl || people.length > 1) return 'sure';
        var count = nameWords(people[0]).length;
        return count >= 2 && count <= 3 ? 'maybe' : '';
    }

    // "of", "and", "The" break a name; "Das" (B.M. Das) and a closing initial A or I ("Perumal A") do not.
    function isConnectorInName(w, i, count) {
        if (!TITLE_CONNECTOR.test(w)) return false;
        if (/^\p{Lu}\.?$/u.test(w)) return !(i > 0 && i === count - 1);
        return !/^\p{Lu}\p{Ll}/u.test(w) || /^(?:The|And|Of|For|In|On|To|With|From|At|Into|An|Og|Til|Af|Med)$/.test(w);
    }

    function isNameSegment(seg) {
        return !!nameKind(seg);
    }

    function surnameOf(seg) {
        var s = seg.replace(/\bet\.?\s*al\.?/gi, '').replace(/\(\s*\d{4}\s*\)/g, '').trim();
        var first = s.split(/\s*(?:;|&|\||\band\b|\bog\b)\s*/i)[0] || '';
        var inverted = first.match(/^(\p{Lu}[\p{L}'’-]+),\s*(?:\p{Lu}\p{Ll}+\s+)?(?:\p{Lu}\.?\s*)+$/u);
        if (inverted) return inverted[1];
        first = first.split(',')[0];
        var words = nameWords(first).filter(function (w) {
            return !/^(?:Jr|Junior)\.?$/.test(w) && !INITIALS.test(w);
        });
        return (words[words.length - 1] || '').replace(/[.,:]$/, '');
    }

    // Longest run of capitalised words (lowercase connectors allowed inside) in one segment.
    // Only words starting with a capital letter count, so "Oxford 2008" is one word.
    function titleRun(seg) {
        var words = seg.split(/\s+/).filter(Boolean);
        var best = null;
        var start = -1;
        function close(end) {
            if (start < 0) return;
            var run = words.slice(start, end);
            while (run.length && TITLE_CONNECTOR.test(run[run.length - 1])) run.pop();
            var caps = run.filter(function (w) { return /^\p{Lu}/u.test(w); }).length;
            if (run.length && (!best || caps > best.caps)) best = { text: run.join(' '), caps: caps };
            start = -1;
        }
        for (var i = 0; i < words.length; i++) {
            var w = words[i];
            if (/^[\p{Lu}\d]/u.test(w)) { if (start < 0) start = i; }
            else if (!(start >= 0 && TITLE_CONNECTOR.test(w))) close(i);
        }
        close(words.length);
        return best;
    }

    function isNoiseSegment(seg) {
        if (HARD_NOISE.test(seg) || PUBLISHER_SEGMENT.test(seg)) return true;
        if (!NOISE_SEGMENT.test(seg)) return false;
        var run = titleRun(seg);
        return !(run && run.caps >= 3 && !PLATFORM_WORD.test(seg));
    }

    function splitCitationSegments(text) {
        return text
            .split(/[,;:()\[\]“”"«»]|\s[-–]\s|(?<!\b(?:\p{Lu}|al|et|Jr|ed|eds|vol|no|pp|St))\.\s+/u)
            .map(function (s) { return s.replace(/\b(?:written\s+|edited\s+)?by:?\s.*$/i, '').replace(/\.$/, '').trim(); })
            .filter(Boolean);
    }

    // "Stanbury, Whitaker and Hall", "Wright & Ma": people split by commas, "and" or "&", each a name or a lone surname.
    function isAuthorList(text) {
        var people = text.split(/\s*(?:,|;|&|\||\band\b|\bog\b)\s*/).filter(Boolean);
        if (people.length < 2) return false;
        if (people.every(function (p) { return nameKind(p); })) return true;
        return text.indexOf(',') >= 0 && people.every(function (p) { return nameKind(p) || (/^\p{Lu}[\p{Ll}'’-]+$/u.test(p) && !isNoiseSegment(p)); });
    }

    function quotedTitle(text) {
        // Single quotes only at a word edge ("'Modern X-ray Physics' by"), so "Moran's" is no quote.
        var m = text.match(/[“"«]([^”"»]{4,200})[”"»]/) || text.match(/(?:^|\s)['‘]([^'’]{4,200})['’](?=[\s,.;:)]|$)/);
        if (!m) return '';
        var inner = m[1].replace(/\(\s*\d*\s*e\s*\)|\(\s*\d+(?:st|nd|rd|th)?\s*ed\.?\s*\)/gi, '').replace(/[,.;:\s]+$/, '').trim();
        if (inner.split(/\s+/).length < 2 || !/^\p{Lu}/u.test(inner)) return '';
        // "Stanbury, Whitaker and Hall: Principles of Fermentation Technology": authors and a colon inside the quotes.
        var namedColon = inner.match(/^([^:]{2,90}?)\s*:\s+(\p{Lu}.+)$/u);
        if (namedColon && isAuthorList(namedColon[1])) inner = namedColon[2];
        // "Jens Sparsø, Introduction to Asynchronous Circuit Design": authors inside the quotes.
        var parts = inner.split(/\s*,\s*/);
        if (parts.length > 1 && nameKind(parts[0])) parts = parts.slice(1);
        // "Moran's Principles of Engineering Thermodynamics, SI Version, 9th Edition": stop at the edition.
        var kept = [];
        parts.some(function (p) { if (kept.length && isNoiseSegment(p)) return true; kept.push(p); return false; });
        inner = kept.join(', ');
        return inner.split(/\s*:\s*/)[0];
    }

    function extractKurserBook(rawLine) {
        var text = cleanCitationText(rawLine);
        if (!text || ARTICLE_LINE.test(text)) return null;
        // "Selected chapters from Hall, S.H.", "and some excerpts from Stefan Maier: ...": the citation starts after "from".
        // No i flag: with it, \p{Lu} also matches lowercase ("chapters from other books").
        var leadIn = text.match(/\b(?:[Cc]hapters|[Ee]xcerpts|[Pp]arts|[Ss]ections|[Tt]opics)\s+(?:will\s+be\s+(?:provided|used)\s+)?from\s+(?=[\p{Lu}'"“‘])/u);
        if (leadIn) text = text.slice(leadIn.index + leadIn[0].length);
        // ".C. K. Alexander", "Fundamentals of Geophysics 3rd edition": stray lead punctuation and a glued-on edition.
        text = text.replace(/^[.,;:\s]+/, '').replace(/[,\s]+\d+(?:st|nd|rd|th)\.?\s+(?:edition|ed\b\.?)/gi, ', ').replace(/,\s*,/g, ',');
        // "Trapp, S. & Matthies, M., Chemodynamics": keep each surname with its initials, so the comma split
        // below does not cut "S. & Matthies" off as a title.
        text = text.replace(/(\p{Lu}[\p{L}'’-]+),\s+(?=\p{Lu}\.)((?:\p{Lu}\.?\s?){1,3})(?=\s*(?:[,&;:(]|(?:and|og)\b|$))/gu, '$1 $2');
        var author = '';
        // "by Annemiek van Boeijen, Jaap Daalhuizen": name particles stay inside the author run.
        var byMatch = text.match(/\bby:?\s+((?:(?:\p{Lu}[\p{L}'’.-]*|(?:van|von|der|den|de|da|du)(?=\s))\s*,?\s*){1,4})/u);
        // "by G.F.Knoll. Selected articles": the run ends with the sentence.
        var byRun = byMatch ? byMatch[1].replace(/,\s*$/, '').replace(/^(.*?\p{Ll}{2,}\.)\s(?!\p{Lu}\.).*$/u, '$1').trim() : '';
        // "Edited by Alessandro Rubino Alessandro Sapio": names with no separator, the first person's surname is word two.
        var byWords = byRun.split(/\s+/);
        if (byWords.length >= 4 && byWords.every(function (w) { return /^\p{Lu}\p{Ll}+$/u.test(w); })) author = byWords[1];
        else if (byRun) author = surnameOf(byRun);
        // "Singh, R.P & D.R. Heldman: ...", "Cachon G, Terwiesch C: ...": a leading surname before its initials.
        var invertedLead = text.match(/^(\p{Lu}[\p{L}'’-]+),?\s+(?:\p{Lu}\.?\s*){1,3}(?=[,&:;(]|(?:and|og|et)\b)/u);
        if (!author && invertedLead) author = invertedLead[1];
        var etAl = text.match(/(\p{Lu}[\p{L}'’-]+)\s+et\.?\s*al/u);
        if (!author && etAl) author = etAl[1];
        // "Holtz, Kovacs, and Sheahan (2010), “An Introduction ...”": author-year style names the authors first.
        var lead = text.match(/^((?:[^()“"]|\((?:Eds?|ed)\.?\))\s*){2,90}?\s*\(\s*(?:19|20)\d\d[a-z]?\s*\)/);
        // "Globalisation and the International Economy (2018).", "Harvard Business School. (2023a)": not authors.
        var leadNames = lead ? lead[0].replace(/\(\s*(?:19|20)\d\d[a-z]?\s*\)$/, '').replace(/[\s.]+$/, '') : '';
        if (lead && !(/^\p{Lu}[\p{L}'’-]+(?:,\s|$)/u.test(leadNames) || /\bet\.?\s*al\.?$/.test(leadNames) || nameKind(leadNames)) || isNoiseSegment(leadNames)) lead = null;
        if (!author && lead) author = surnameOf(lead[0].replace(/\(.*$/, '').split(/\s*(?:,|&|\band\b)\s*/)[0]);
        // "Berman, K. (2008). Financial intelligence for entrepreneurs: What ...": the title follows the year.
        var leadTitle = lead ? text.slice(lead[0].length).replace(/^[\s).,:]+/, '').split(/:\s|[?!]|,\s|\s\(|\s[-–]\s|(?<!\b\p{Lu})\.(?=[\s,]|$)/u)[0].replace(/[.,;:\s]+$/, '').trim() : '';
        if (leadTitle && !(/^\p{Lu}/u.test(leadTitle) && leadTitle.split(/\s+/).length <= 14 && !isNoiseSegment(leadTitle) && !nameKind(leadTitle))) leadTitle = '';
        if (leadTitle && !quotedTitle(text)) return { title: leadTitle, author: author };
        // "Newland, David Edward. An introduction to ...", "Brincker, Rune, and Carlos Ventura. Introduction to ...":
        // surname, given names, then the title as the next sentence.
        var mla = text.match(/^(\p{Lu}[\p{L}'’-]+),\s+((?:\p{Lu}\p{Ll}+)(?:\s+\p{Lu}[\p{Ll}]*\.?){0,2})((?:,?\s+(?:and|&)\s+[^.]{3,60})?)\.\s+(\p{Lu}[^.]{3,160})\./u);
        if (mla && !author && mla[2].split(/\s+/).every(function (w) { return !TITLE_WORD.test(w) && !TITLE_CONNECTOR.test(w); }) && (!mla[3] || nameKind(mla[3].replace(/^,?\s+(?:and|&)\s+/, '')))) {
            var mlaTitle = mla[4].split(/,|:\s/)[0].trim();
            if (mlaTitle.split(/\s+/).length > 1 && !isNoiseSegment(mlaTitle) && !nameKind(mlaTitle)) return { title: mlaTitle, author: mla[1] };
        }

        // "R. C. Hibbeler: Dynamics", "Stephen R. Poland: Founder’s Pocket Guide: Cap Tables":
        // authors before the first colon, the title is what follows up to the first comma or sentence.
        var colon = text.match(/^([^:]{2,90}?)\s*:\s+(.+)$/);
        if (colon && nameKind(colon[1]) && !quotedTitle(text)) {
            var rest = colon[2].split(/,|;|\s[-–]\s|(?<!\b\p{Lu})\.\s|\(/u)[0].replace(/\.$/, '').trim();
            if (rest && /^[\p{Lu}\d]/u.test(rest) && !isNoiseSegment(rest) && rest.split(/\s+/).length <= 14) {
                var colonAuthor = author || surnameOf(colon[1]);
                return { title: rest, author: rest.indexOf(colonAuthor) >= 0 ? '' : colonAuthor };
            }
        }

        var segments = splitCitationSegments(text);
        var title = quotedTitle(text);
        var sureAuthor = '';
        var sureIndex = -1;
        var maybeNames = [];
        var maybeTitle = '';
        segments.forEach(function (seg, i) {
            if (isNoiseSegment(seg)) return;
            // "J.J Jensen 2001": a name with its year.
            var kind = nameKind(seg.replace(/\s+(?:19|20)\d\d[a-z]?$/, ''));
            if (kind === 'sure') seg = seg.replace(/\s+(?:19|20)\d\d[a-z]?$/, '');
            if (kind === 'sure') {
                // "Larsen, Torben E.": the lone word before a given name and initials is the surname.
                var prev = segments[i - 1];
                if (!sureAuthor) sureIndex = i;
                // "Stanbury, Whitaker and Hall": a lone surname before a list of surnames.
                var isLoneSurname = function (s) { return !!s && s !== title && /^\p{Lu}[\p{Ll}'’-]+$/u.test(s) && !isNoiseSegment(s); };
                if (!sureAuthor && isLoneSurname(prev)
                    && (/^(?:\p{Lu}\p{Ll}+\s+)?(?:\p{Lu}\.?\s*)+$/u.test(seg) || /^\p{Lu}[\p{Ll}'’-]+\s+(?:and|&|og)\s/u.test(seg))) {
                    // "Gelman, Carlin, Stern and Rubin": start from the first of the lone surnames.
                    var from = i - 1;
                    while (from > 0 && isLoneSurname(segments[from - 1])) from--;
                    sureAuthor = segments.slice(from, i).join(', ') + ', ' + seg;
                }
                if (!sureAuthor) sureAuthor = seg;
                return;
            }
            if (kind === 'maybe') {
                // Two or three capitalised words: the title after a sure author list ("Kurose & Ross:
                // Computer Networking"), else held back, since "Erik Bruun: CMOS Analog IC Design" puts the author first.
                if (!title && !maybeTitle && sureAuthor) title = seg;
                else if (!title && !maybeTitle) maybeTitle = seg;
                else maybeNames.push(seg);
                return;
            }
            var run = titleRun(seg);
            if (!title && run && run.caps >= 2) {
                // "Fire-safety Engineering and performance-based codes": keep the lowercase tail of a title.
                var words = seg.split(/\s+/);
                title = (seg.indexOf(run.text) === 0 && words.length <= 12 && !PROSE_WORD.test(seg) && !NOISE_SEGMENT.test(seg)) ? seg : run.text;
                if (maybeTitle) { maybeNames.unshift(maybeTitle); maybeTitle = ''; }
            }
        });
        if (!title || title === maybeTitle) {
            // "Differential geometry for generative modeling. Søren Hauberg."
            var sentenceTitle = '';
            segments.some(function (seg) {
                if (seg === maybeTitle) return true;
                if (nameKind(seg) || isNoiseSegment(seg) || PROSE_WORD.test(seg) || !/^\p{Lu}/u.test(seg)) return false;
                var n = seg.split(/\s+/).length;
                if (n >= 2 && n <= 12) { sentenceTitle = seg; return true; }
                return false;
            });
            if (sentenceTitle) { if (maybeTitle) maybeNames.unshift(maybeTitle); maybeTitle = ''; title = sentenceTitle; }
        }
        if (!title && maybeTitle) title = maybeTitle;
        // "Chemistry, 4. edition, C. E. Housecroft and E. C. Constable": a one-word title before the authors
        // (not "Holah, J.", a surname before its initials).
        if (!title && sureAuthor && segments.length > 1 && segments[0] !== sureAuthor
            && /^\p{Lu}\p{Ll}{4,}$/u.test(segments[0]) && !isNoiseSegment(segments[0])
            && !/^(?:\p{Lu}\.?\s*)+$/u.test(segments[1])) title = segments[0];
        // "E. Hecht, Optics, 5th edition", "G. A. Reider, Photonics - An Introduction": a one-word title right after the authors.
        var afterAuthor = sureIndex >= 0 ? segments[sureIndex + 1] : '';
        if (afterAuthor && /^\p{Lu}\p{Ll}{3,}$/u.test(afterAuthor) && !isNoiseSegment(afterAuthor) && !nameKind(afterAuthor)
            && (!title || (/^(?:An?|The)\s/.test(title) && segments[sureIndex + 2] === title))) title = afterAuthor;
        if (!title) return null;
        if (!author && sureAuthor) author = surnameOf(sureAuthor);
        if (!author && maybeNames.length) author = surnameOf(maybeNames[0]);
        if (!author) {
            var other = segments.filter(function (s) { return s !== title && nameKind(s); })[0];
            if (other) author = surnameOf(other);
        }
        // "Bishop, Pattern Recognition and Machine Learning": a lone surname before the title.
        if (!author && segments.length > 1 && segments[0] !== title && /^\p{Lu}[\p{Ll}'’-]+$/u.test(segments[0])
            && !isNoiseSegment(segments[0]) && text.indexOf(segments[0] + ',') === 0) author = segments[0];
        if (author && title.indexOf(author) >= 0) author = '';
        return { title: title, author: author };
    }

    // Reference lists in author-year style ("Barney, J. (1991). Firm resources and sustained competitive
    // advantage. Journal of Management") wrap across line breaks on kurser.dtu.dk, so every wrapped line
    // looked like its own book ("C. A", "Harvard Business Review"). Join each reference first, then skip
    // the ones that are journal articles: the bar searches for books.
    var REF_YEAR = /\(\s*(?:19|20)\d\d[a-z]?\s*\)|(?:^|[\s,.])(?:19|20)\d\d[a-z]?\.\s/;
    var REF_START = /^(?:\p{Lu}['’]?[\p{L}'’-]+(?:\s+\p{Lu}[\p{L}'’-]+)?\s*,\s*(?:\p{Lu}\.\s*-?){1,3}|\p{Lu}[\p{L}'’-]+\s*\(\s*(?:19|20)\d\d|\p{Lu}[\p{L}'’-]+(?:\s\p{Lu}){1,3},|(?:\p{Lu}[\p{L}.'’-]*(?:\s*,\s*(?:and\s+|&\s*)?|\s+(?:and|&|of|the|for)\s+(?:the\s+)?|\s+)){0,8}\p{Lu}[\p{L}.'’-]*\s*\(\s*(?:19|20)\d\d)/u;
    var BOOK_HINT = /\b(?:press|publish\w*|wiley|springer|routledge|elsevier|sage|pearson|mcgraw|cengage|books?|forlag|edition|ed\.|isbn)\b/i;
    var VENUE_HINT = /\b(?:journal|review|letters|proceedings|transactions|quarterly|science|management|economics|policy|development|research|environment|nature|bmj|rev)\b|\bvol\.?\s*\d|\bpp\.?\s*\d/i;
    var VOLUME_ISSUE = /\b\d{1,4}\s*(?:\(\s*\d+\s*\))?\s*[,:]\s*[a-z]?\d+/i;

    function isJournalArticle(text) {
        var t = decodeEntities(String(text || '')).replace(/[\u{200b}-\u{200d}\u{2060}\u{feff}]/gu, '');
        t = t.replace(/https?:\/\/\S+/gi, function (url) { return /doi\.org/i.test(url) ? url : ''; });
        t = t.replace(/\(\s*\)/g, '');
        if (ARTICLE_LINE.test(t)) return true;
        var year = t.match(REF_YEAR);
        if (!year) return false;
        var after = t.slice(year.index + year[0].length);
        if (BOOK_HINT.test(after)) return false;
        var venue = after.split(/[.?!’”'"]\s+/).slice(1).join(' ');
        return (!!venue && VENUE_HINT.test(venue)) || VOLUME_ISSUE.test(after);
    }

    function joinWrappedReferences(items) {
        var years = items.filter(function (it) { return REF_YEAR.test(it.text || ''); }).length;
        var starts = items.filter(function (it) { return REF_START.test(it.text || ''); }).length;
        if (years < 3 || starts < 2) return items;
        var out = [];
        var current = null;
        items.forEach(function (item) {
            var text = String(item.text || '').trim();
            // A new reference starts at "Surname, X." once the one being built has its year.
            if (REF_START.test(text) && (!current || REF_YEAR.test(current.text))) {
                current = { text: text, anchor: item.anchor };
                out.push(current);
            } else if (current) {
                current.text = (current.text + ' ' + text).replace(/\s+/g, ' ');
            } else {
                out.push({ text: text, anchor: item.anchor });
            }
        });
        return out;
    }

    function mergeKurserCitationTargets(items) {
        items = joinWrappedReferences(items);
        var merged = [];
        var pending = null;
        function quoteCount(text) { return (text.match(/["“”]/g) || []).length; }
        items.forEach(function (item) {
            var text = String(item.text || '').trim();
            var isIsbnOnly = /^(?:ISBN[-\s]?(?:1[03])?[\s:]*)?[\dXx][\d\s-]*[\dXx][.,;]?$/i.test(text)
                && !!extractISBNFromCitationLine(text) || (!cleanCitationText(text) && !!extractISBNFromCitationLine(text));
            var ownBook = isIsbnOnly ? null : extractKurserBook(text);
            if (pending) {
                var held = pending;
                pending = null;
                if (ownBook && !ownBook.author) {
                    merged.push({ text: held.text.replace(/[.\s]*$/, '') + '. ' + text, anchor: held.anchor });
                    return;
                }
                merged.push(held);
            }
            var previous = merged[merged.length - 1];
            var previousCitation = previous && isIsbnOnly ? parseKurserCitationLine(previous.text) : null;
            // "Product Customization" / "Lars Hvam, ..." / "Springer 2008, 277 sider": lines holding
            // only names or publisher details belong to the book above.
            var segs = cleanCitationText(text).split(/[,;]/).map(function (s) { return s.trim(); }).filter(function (s) { return /\p{L}/u.test(s); });
            var previousBook = previous && !isIsbnOnly ? extractKurserBook(previous.text) : null;
            var previousRun = previous && !previousBook && !isIsbnOnly ? titleRun(cleanCitationText(previous.text)) : null;
            if (previousRun && previousRun.caps >= 2) previousBook = { author: '' };
            var detailSegs = segs.length > 0 && segs.every(function (s) { return isNameSegment(s) || isNoiseSegment(s); });
            // "Oxford University Press ISBN: ...", "Jure Leskovec, Anand Rajaraman": with no title of its own, the line
            // belongs to the book above even when that book already names its author.
            var detailLine = !isIsbnOnly && !ownBook && detailSegs;
            // A name-only line ("Feliciano Giustino" may also read as a title) leads the next line.
            var namesOnly = !isIsbnOnly && segs.length > 0 && segs.every(isNameSegment)
                && (!ownBook || (!ownBook.author && !!nameKind(ownBook.title)));
            if (previous && !isIsbnOnly && quoteCount(previous.text) % 2 === 1 && quoteCount(text) % 2 === 1) {
                // '"High-Dimensional Data Analysis with Low-Dimensional Models:' / 'Principles, ...," Cambridge ...'.
                previous.text += ' ' + text;
            } else if (previousBook && ((!previousBook.author && detailSegs) || detailLine)) {
                previous.text = previous.text.replace(/[.\s]*$/, '') + '. ' + text;
            } else if (namesOnly && !previousBook) {
                pending = { text: text, anchor: item.anchor };
            } else if (previousCitation && previousCitation.title && !previousCitation.isbn) {
                previous.text += ' ' + text;
            } else {
                merged.push({ text: text, anchor: item.anchor });
            }
        });
        if (pending) merged.push(pending);
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
        var txt = decodeEntities(raw).replace(/\u00a0/g, ' ').trim();
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
        // "Edited by: Lelieveld, H.L.M.; Holah, J." is one book; split only when every part is one.
        if (splitBySemicolon.length > 1 && splitBySemicolon.every(function (s) { return !!extractKurserBook(s); })) return splitBySemicolon;

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
        if (isJournalArticle(line)) return null;
        var book = extractKurserBook(rawLine);
        if (/https?:\/\//i.test(line) && !book) return null;

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

        if (confidence < 2 && !book) return null;

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

        if (!book && !isbn) return null;
        if (book) {
            title = book.title;
            author = book.author;
            queryText = (book.title + (book.author ? ' ' + book.author : '')).trim();
        }

        return {
            raw: rawLine,
            author: author,
            title: title,
            isbn: isbn,
            queryText: queryText,
            display: book ? book.title + (book.author ? ', ' + book.author : '') : line
        };
    }

    // Key of one literature section's text: its letters and digits, lowercased, then the length and an
    // FNV-1a hash. scripts/build-literature-data.mjs keys the shipped dataset with this same function.
    function literatureTextKey(text) {
        var s = String(text || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
        var h = 0x811c9dc5;
        for (var i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 0x01000193) >>> 0;
        }
        return s.length.toString(36) + '-' + h.toString(36);
    }

    // The books the semester dataset (literature-data.json) lists for this course, as parseKurserCitationLine
    // returns them, or null when the course is not in it or its literature text has changed since.
    // An empty list means the section names no book.
    function findKnownLiterature(data, code, sectionText) {
        var entry = data && data.courses && code ? data.courses[code] : null;
        if (!entry || entry.k !== literatureTextKey(sectionText)) return null;
        return (entry.b || []).map(function (b) {
            var title = b[0], author = b[1] || '', isbn = b[2] || '';
            var display = title + (author ? ', ' + author : '');
            return { raw: display, title: title, author: author, isbn: isbn, queryText: b[3] || (title + (author ? ' ' + author : '')), display: display };
        });
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
            extractKurserBook: extractKurserBook,
            shouldMergeWrappedLiteratureLine: shouldMergeWrappedLiteratureLine,
            splitKurserLiteratureText: splitKurserLiteratureText,
            extractISBNFromCitationLine: extractISBNFromCitationLine,
            countCapitalizedWords: countCapitalizedWords,
            countInitials: countInitials,
            isLikelyBibliographicNameTitlePattern: isLikelyBibliographicNameTitlePattern,
            parseKurserCitationLine: parseKurserCitationLine,
            literatureTextKey: literatureTextKey,
            findKnownLiterature: findKnownLiterature,
            cleanKurserCitationQuery: cleanKurserCitationQuery,
            buildKurserFinditUrl: buildKurserFinditUrl,
            buildKurserGoogleBooksUrl: buildKurserGoogleBooksUrl
        };
    } catch (eExpose) { }
})();
