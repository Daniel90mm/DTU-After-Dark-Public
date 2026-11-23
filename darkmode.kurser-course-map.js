// Course map on kurser.dtu.dk course pages: a "Course map" button by Academic
// prerequisites opens a left-to-right map of earlier courses, this course and
// later courses. Prerequisites come from course-map-data.json (built once per
// semester by scripts/build-course-map-data.mjs); the open page's own
// prerequisites are read live so a mid-semester edit still shows.
(function () {
    'use strict';
    var DOM = globalThis.DTUAfterDarkDom;
    var markExt = DOM.markExt;
    var el = DOM.el;
    var ensureStyles = DOM.ensureStyles;
    var makeButton = DOM.makeButton;
    var formatReadDate = DOM.formatReadDate;

    var CODE_SOURCE = '[0-9]{2}[0-9A-Z]{3}';
    var MAX_PER_COLUMN = 10;
    var MAX_CLAUSES = 12;
    var DEPTH_LIMITS = { back: [1, 4], forward: [1, 3] };
    var DEFAULT_DEPTH = { back: 3, forward: 2 };
    var DEPTH_STORAGE_KEY = 'dtuAfterDarkCourseMapDepth';
    var HIDE_MISSING_STORAGE_KEY = 'dtuAfterDarkCourseMapHideMissing';
    var MOVE_MS = 320;
    var DATA_FILE = 'course-map-data.json';
    var STYLE_ID = 'dtu-course-map-style';
    // Older catalogue years say "Recommended (academic) prerequisites" / "Anbefalede faglige forudsætninger".
    var PREREQ_LABEL_RE = /^(?:(?:recommended )?academic prerequisites|recommended prerequisites|(?:anbefalede )?faglige forudsætninger)$/i;
    var MANDATORY_LABEL_RE = /^(mandatory prerequisites|obligatoriske forudsætninger)$/i;
    var POINTS_LABEL_RE = /^point\s*\(\s*ects\s*\)$/i;

    function getDeps() {
        try { return globalThis.DTUAfterDarkCourseMapDeps || null; } catch (e0) { return null; }
    }

    function dep(name) {
        return DOM.dep(getDeps(), name);
    }


    // ===== Parsing =====

    // Reads the course expression at the start of a prerequisite field, such as
    // "(02002/02003).(01017/01019) , An introductory course ...". Stops at the
    // first word that is not a course number. In plain prose, "and"/"og" read as
    // "." and "or"/"eller" as "/"; a comma takes the meaning of the next such word
    // in its brackets ("A, B or C" is one of three), or "." when none follows.
    function tokenizePrerequisiteExpression(text) {
        var s = String(text || '').toUpperCase().replace(/­/g, '');
        var codeRe = new RegExp('^' + CODE_SOURCE + '(?![0-9A-Z])');
        var wordRe = /^(AND|OG|OR|ELLER)(?=[\s(]|$)/;
        var tokens = [];
        var i = 0;
        while (i < s.length) {
            var ch = s.charAt(i);
            if (/\s/.test(ch)) { i++; continue; }
            // DTU writes its formal expression, then " , " and prose that may
            // repeat the codes: a comma after a formal operator ends it.
            if (ch === ',' && tokens.some(function (t) { return t === '/' || t === '.' || t === '('; })) break;
            if (ch === '(' || ch === ')' || ch === '/' || ch === '.' || ch === ',') {
                tokens.push(ch);
                i++;
                continue;
            }
            var m = s.slice(i).match(codeRe) || s.slice(i).match(wordRe);
            if (!m) break;
            // A range ("01001-01004") is not part of the formal grammar: leave the
            // whole field to proseGroups, which reads it as one group.
            if (!m[1] && new RegExp('^\\s*[-\u2013\u2014]\\s*' + CODE_SOURCE).test(s.slice(i + m[0].length))) { tokens = []; break; }
            tokens.push(m[1] ? (m[1] === 'AND' || m[1] === 'OG' ? 'AND' : 'OR') : m[0]);
            i += m[0].length;
        }
        tokens = tokens.map(function (t, k) {
            if (t === 'AND') return '.';
            if (t === 'OR') return '/';
            if (t !== ',') return t;
            for (var j = k + 1, depth = 0; j < tokens.length; j++) {
                if (tokens[j] === '(') depth++;
                else if (tokens[j] === ')' && depth-- === 0) break;
                else if (depth === 0 && (tokens[j] === 'AND' || tokens[j] === 'OR')) return tokens[j] === 'AND' ? '.' : '/';
            }
            return '.';
        });
        while (tokens.length && /^[/.(]$/.test(tokens[tokens.length - 1])) tokens.pop();
        return tokens;
    }

    // Grammar: expr = term ('.' term)*, term = factor ('/' factor)*,
    // factor = CODE | '(' expr ')'. Returns null on anything else.
    function parseExpressionTokens(tokens) {
        var pos = 0;
        function expr() {
            var parts = [term()];
            while (tokens[pos] === '.') { pos++; parts.push(term()); }
            return parts.length === 1 ? parts[0] : { and: parts };
        }
        function term() {
            var parts = [factor()];
            while (tokens[pos] === '/') { pos++; parts.push(factor()); }
            return parts.length === 1 ? parts[0] : { or: parts };
        }
        function factor() {
            var t = tokens[pos];
            if (t === '(') {
                pos++;
                var inner = expr();
                if (tokens[pos] !== ')') throw new Error('unclosed');
                pos++;
                return inner;
            }
            if (t && new RegExp('^' + CODE_SOURCE + '$').test(t)) { pos++; return { code: t }; }
            throw new Error('unexpected ' + t);
        }
        try {
            var tree = expr();
            return pos === tokens.length ? tree : null;
        } catch (e0) {
            return null;
        }
    }

    function uniqueSorted(list) {
        var seen = {};
        return list.filter(function (x) { return seen[x] ? false : (seen[x] = true); }).sort();
    }

    // Converts the tree to "all of these groups, one course from each group".
    // Null when a part is too large to rewrite.
    function toClauses(node) {
        if (node.code) return [[node.code]];
        if (node.and) {
            var all = [];
            for (var j = 0; j < node.and.length; j++) {
                var part = toClauses(node.and[j]);
                if (!part) return null;
                all = all.concat(part);
            }
            return all;
        }
        var acc = toClauses(node.or[0]);
        for (var i = 1; i < node.or.length && acc; i++) {
            var next = toClauses(node.or[i]);
            if (!next) return null;
            var merged = [];
            acc.forEach(function (a) { next.forEach(function (b) { merged.push(uniqueSorted(a.concat(b))); }); });
            if (merged.length > MAX_CLAUSES) return null;
            acc = merged;
        }
        return acc;
    }

    function collectCodes(node, out) {
        if (node.code) out.push(node.code);
        (node.and || node.or || []).forEach(function (c) { collectCodes(c, out); });
        return out;
    }

    // "at least 3 courses from the list" / "mindst 3 af": a single group then
    // needs that many of its courses, not any one.
    var AT_LEAST_RE = /\b(?:at least|mindst)\s+(\d+|two|three|four|five|six|to|tre|fire|fem|seks)\s+(?:of\b|af\b|courses?\b|kurser\b)/i;
    var NUMBER_WORDS = { two: 2, three: 3, four: 4, five: 5, six: 6, to: 2, tre: 3, fire: 4, fem: 5, seks: 6 };

    function atLeastCount(text) {
        var m = AT_LEAST_RE.exec(String(text || ''));
        if (!m) return null;
        var n = /^\d+$/.test(m[1]) ? +m[1] : NUMBER_WORDS[m[1].toLowerCase()];
        return n >= 2 ? n : null;
    }

    // text: the field's visible text; links: course numbers linked in it;
    // isKnown: optional filter for numbers found only in the prose.
    // Returns { groups: [[code, ...], ...], mentioned: [code, ...], atLeast }:
    // every group is needed, any one course of a group satisfies it, unless
    // atLeast says a single group needs that many. An expression too large to
    // rewrite gives no group; its courses count as mentioned.
    function parseCoursePrerequisites(text, links, isKnown) {
        var groups = [];
        var unrewritten = [];
        var tree = parseExpressionTokens(tokenizePrerequisiteExpression(text));
        if (tree) {
            var clauses = toClauses(tree);
            if (!clauses) { clauses = []; unrewritten = collectCodes(tree, []); }
            var seen = {};
            clauses.forEach(function (c) {
                var key = c.join(',');
                if (!seen[key]) { seen[key] = true; groups.push(c); }
            });
        }
        var inGroups = {};
        groups.forEach(function (g) { g.forEach(function (c) { inGroups[c] = true; }); });
        var proseCodes = (String(text || '').toUpperCase().match(new RegExp('\\b' + CODE_SOURCE + '\\b', 'g')) || [])
            .filter(function (c) { return typeof isKnown !== 'function' || isKnown(c); });
        var mentioned = uniqueSorted((links || []).map(function (c) { return String(c).toUpperCase(); }).concat(proseCodes, unrewritten))
            .filter(function (c) { return !inGroups[c]; });
        var atLeast = groups.length === 1 ? atLeastCount(text) : null;
        return { groups: groups, mentioned: mentioned, atLeast: atLeast };
    }

    // A range "01001-01004": both ends and the known courses between them.
    // Null when the ends do not form a short range of one study line.
    function rangeCodes(from, to, known) {
        if (!/^\d{5}$/.test(from) || !/^\d{5}$/.test(to) || from.slice(0, 2) !== to.slice(0, 2)) return null;
        var span = +to - +from;
        if (span < 1 || span > 20) return null;
        var out = [from];
        for (var n = +from + 1; n < +to; n++) {
            var code = ('0000' + n).slice(-5);
            if (known(code)) out.push(code);
        }
        return out.concat(to);
    }

    // Course numbers in a field's prose as one-of groups: numbers joined only
    // by "or", "eller" or "/", with commas or brackets around them ("A, B or C",
    // "(A / B )/ C"), form one group, and so does a range. Any other number is
    // its own group.
    // "One of the following: A, B, C" / "at least 3 of: A, B, C, D": the commas
    // in the list that follows mean "or".
    var ONE_OF_LEAD_RE = /(?:\b(?:ONE|ANY|EN|ET|ÉT)\s+(?:OF|AF)\b|\bEITHER\b|\b(?:AT LEAST|MINDST)\s+\S+\s+(?:OF|AF|COURSES?|KURSER)\b)[^.;]*$/;

    function proseGroups(text, known) {
        var s = String(text || '').toUpperCase().replace(/\u00AD/g, '');
        var re = new RegExp('\\b(' + CODE_SOURCE + ')\\b(?:\\s*[-\\u2013\\u2014]\\s*(' + CODE_SOURCE + ')\\b)?', 'g');
        var chains = [];
        var chain = null;
        var last = 0;
        var m;
        while ((m = re.exec(s))) {
            var gap = s.slice(last, m.index);
            last = re.lastIndex;
            var range = m[2] ? rangeCodes(m[1], m[2], known) : null;
            var orLink = /^[\s(),]*(?:OR|ELLER|\/)[\s()]*$/.test(gap);
            if (chain && (orLink || /^\s*,\s*$/.test(gap))) {
                chain.or = chain.or || orLink;
            } else {
                chain = { parts: [], or: ONE_OF_LEAD_RE.test(gap) };
                chains.push(chain);
            }
            chain.parts.push(range || [m[1]]);
            if (m[2] && !range) { chain = { parts: [[m[2]]], or: false }; chains.push(chain); }
        }
        var groups = [];
        chains.forEach(function (c) {
            if (c.or) groups.push([].concat.apply([], c.parts));
            else c.parts.forEach(function (p) { groups.push(p); });
        });
        return groups.map(function (g) { return uniqueSorted(g.filter(known)); });
    }

    // One course's map entry from its two prerequisite fields, each
    // { text, links } or null: g recommended groups, r mandatory groups, ga/ra
    // "at least N" of a single group. Courses named outside the expression in
    // either field are recommended groups (see proseGroups): listed, so drawn,
    // but never claimed as required. Empty parts are left out. Used by the
    // live page and by scripts/build-course-map-data.mjs.
    function entryFromFields(academic, mandatory, isKnown) {
        var entry = {};
        var a = academic ? parseCoursePrerequisites(academic.text, academic.links, isKnown) : null;
        var r = mandatory ? parseCoursePrerequisites(mandatory.text, mandatory.links, isKnown) : null;
        if (a && a.groups.length) entry.g = a.groups;
        if (a && a.atLeast) entry.ga = a.atLeast;
        if (r && r.groups.length) entry.r = r.groups;
        if (r && r.atLeast) entry.ra = r.atLeast;
        // "must have completed at least 3 courses from the list" in the
        // mandatory field refers to the academic field's single list.
        var listCount = r && !r.groups.length ? atLeastCount(mandatory.text) : null;
        if (listCount && entry.g && entry.g.length === 1 && !entry.r) {
            entry.r = entry.g;
            entry.ra = listCount;
            delete entry.g;
            delete entry.ga;
        }
        var grouped = {};
        (entry.g || []).concat(entry.r || []).forEach(function (g) { g.forEach(function (c) { grouped[c] = true; }); });
        var named = uniqueSorted((a ? a.mentioned : []).concat(r ? r.mentioned : []))
            .filter(function (c) { return !grouped[c]; });
        if (!named.length) return entry;
        var isNamed = {};
        named.forEach(function (c) { isNamed[c] = true; });
        var known = function (c) { return isNamed[c] || typeof isKnown !== 'function' || isKnown(c); };
        var extra = [];
        var seen = {};
        [academic, mandatory].forEach(function (f) {
            if (!f) return;
            proseGroups(f.text, known).forEach(function (g) {
                g = g.filter(function (c) { return !grouped[c]; });
                if (!g.some(function (c) { return isNamed[c]; }) || seen[g.join(',')]) return;
                seen[g.join(',')] = true;
                // The same alternatives written twice ("41046/41015/41659 ...
                // like 41046/41015/41650") are one group.
                var overlap = g.length > 1 && extra.filter(function (e) {
                    return e.length > 1 && e.some(function (c) { return g.indexOf(c) >= 0; });
                })[0];
                if (overlap) extra[extra.indexOf(overlap)] = g = uniqueSorted(overlap.concat(g));
                else extra.push(g);
                g.forEach(function (c) { if (g.length > 1) delete isNamed[c]; });
            });
        });
        // A number in one of those groups is not also its own group; a linked
        // number missing from the text still is.
        extra = extra.filter(function (g) { return g.length > 1 || isNamed[g[0]]; });
        named.forEach(function (c) {
            if (isNamed[c] && !extra.some(function (g) { return g.length === 1 && g[0] === c; })) extra.push([c]);
        });
        extra.sort(function (x, y) { return x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0; });
        // "at least 3 of the following: A, B, C, D" written as prose: one list, counted.
        var proseCount = !entry.g && extra.length === 1 && extra[0].length > 1 && academic ? atLeastCount(academic.text) : null;
        entry.g = (entry.g || []).concat(extra);
        delete entry.ga;
        if (proseCount) entry.ga = proseCount;
        return entry;
    }

    // ===== Graph =====

    // A course's prerequisites as display groups: required (mandatory) groups,
    // then recommended groups. ra/ga: "at least N" of a single group.
    function prerequisiteGroupsOf(entry) {
        if (!entry) return [];
        var out = [];
        [['r', 'ra', true], ['g', 'ga', false]].forEach(function (kind) {
            var list = entry[kind[0]] || [];
            list.forEach(function (g) {
                var block = { codes: g, required: kind[2] };
                if (list.length === 1 && entry[kind[1]] >= 2) block.atLeast = entry[kind[1]];
                out.push(block);
            });
        });
        return out;
    }

    // In this year's catalogue: listed and not an older course (`y`, the last
    // catalogue year that listed it).
    function inCatalogue(courses, code) {
        var entry = (courses || {})[code];
        return !!entry && !entry.y;
    }

    // Followers are only courses in this year's catalogue: an older course can
    // no longer be taken after this one.
    function buildFollowerIndex(courses) {
        var index = {};
        Object.keys(courses || {}).forEach(function (code) {
            if (!inCatalogue(courses, code)) return;
            prerequisiteGroupsOf(courses[code]).forEach(function (g) {
                g.codes.forEach(function (pre) {
                    if (pre === code) return;
                    (index[pre] = index[pre] || []);
                    if (index[pre].indexOf(code) < 0) index[pre].push(code);
                });
            });
        });
        Object.keys(index).forEach(function (k) { index[k].sort(); });
        return index;
    }

    // Returns { center, back: [column, ...], forward: [column, ...] } where
    // back[0] is the column right before the center. A back column holds
    // blocks { owner, codes, required }; a forward column holds nodes
    // { code, parents }. Both carry `more`, the count left out by the cap.
    // options.hideMissing leaves out courses not in the catalogue (`courses`);
    // `hidden` counts the distinct courses left out that way. options.expand
    // { back: [level, ...], forward: [step, ...] } lifts the column cap there.
    function buildCourseMap(courses, followers, center, depth, centerOverride, options) {
        var entryOf = function (code) {
            return code === center && centerOverride ? centerOverride : (courses || {})[code];
        };
        var hideMissing = !!(options && options.hideMissing);
        var hiddenCodes = {};
        var listed = function (c) {
            if (!hideMissing || inCatalogue(courses, c)) return true;
            hiddenCodes[c] = true;
            return false;
        };
        var expand = (options && options.expand) || {};
        var capOf = function (side, i) {
            return (expand[side] || []).indexOf(i) >= 0 ? Infinity : MAX_PER_COLUMN;
        };
        var visited = {};
        visited[center] = true;
        var back = [];
        var owners = [center];
        for (var level = 0; level < depth.back && owners.length; level++) {
            var column = { blocks: [], more: 0 };
            var shown = 0;
            var cap = capOf('back', level);
            var nextOwners = [];
            owners.forEach(function (owner) {
                var ownerShown = {};
                var ownerRequired = {};
                prerequisiteGroupsOf(entryOf(owner)).forEach(function (g) {
                    // The centre listed again further back is a cycle, and a
                    // course naming itself is not a prerequisite; drop both. A
                    // required course is not drawn again as recommended.
                    var all = g.codes.filter(function (c) {
                        return c !== center && c !== owner && listed(c) && (g.required || !ownerRequired[c]);
                    });
                    if (g.required) all.forEach(function (c) { ownerRequired[c] = true; });
                    // A group already drawn for this owner (say both required and
                    // recommended) is drawn once.
                    if (all.every(function (c) { return ownerShown[c]; })) return;
                    if (!all.length) return;
                    all.forEach(function (c) { ownerShown[c] = true; });
                    if (shown >= cap) { column.more += all.length; return; }
                    var codes = all.slice(0, Math.max(1, cap - shown));
                    column.more += all.length - codes.length;
                    shown += codes.length;
                    var block = { owner: owner, codes: codes, required: g.required };
                    if (g.atLeast) block.atLeast = g.atLeast;
                    column.blocks.push(block);
                    codes.forEach(function (c) {
                        if (!visited[c]) { visited[c] = true; nextOwners.push(c); }
                    });
                });
            });
            if (!column.blocks.length) break;
            back.push(column);
            owners = nextOwners;
        }

        var forward = [];
        var seenForward = {};
        seenForward[center] = true;
        var sources = [center];
        for (var step = 0; step < depth.forward && sources.length; step++) {
            var byCode = {};
            var order = [];
            sources.forEach(function (src) {
                (followers[src] || []).forEach(function (f) {
                    if (seenForward[f]) return;
                    if (!byCode[f]) { byCode[f] = { code: f, parents: [] }; order.push(f); }
                    byCode[f].parents.push(src);
                });
            });
            if (!order.length) break;
            order.sort();
            var nodes = order.slice(0, capOf('forward', step)).map(function (c) { return byCode[c]; });
            order.forEach(function (c) { seenForward[c] = true; });
            forward.push({ nodes: nodes, more: order.length - nodes.length });
            sources = nodes.map(function (n) { return n.code; });
        }
        return { center: center, back: back, forward: forward, hidden: Object.keys(hiddenCodes).length };
    }

    // True when the map would show anything: a prerequisite (in the catalogue
    // or not) or a course that lists `code`. `centerOverride` is the live
    // reading of the open page.
    function courseMapHasContent(courses, followers, code, centerOverride) {
        var map = buildCourseMap(courses, followers, code, { back: 1, forward: 1 }, centerOverride);
        return map.back.length > 0 || map.forward.length > 0;
    }

    // How many courses `code` lists as prerequisites (catalogue or not) and
    // how many list it: the first column on each side, before the cap.
    function courseMapCounts(courses, followers, code, centerOverride) {
        var map = buildCourseMap(courses, followers, code, { back: 1, forward: 1 }, centerOverride);
        var before = {};
        var back = map.back[0];
        if (back) back.blocks.forEach(function (b) { b.codes.forEach(function (c) { before[c] = true; }); });
        var forward = map.forward[0];
        return {
            before: Object.keys(before).length + (back ? back.more : 0),
            after: forward ? forward.nodes.length + forward.more : 0
        };
    }

    // The line under "Open course map" on the preview.
    function courseMapCaption(code, counts) {
        var before = counts.before
            ? counts.before + (counts.before === 1 ? ' course' : ' courses') + ' before ' + code
            : 'No prerequisites listed';
        var after = counts.after
            ? counts.after + (counts.after === 1 ? ' course builds' : ' courses build') + ' on it'
            : 'no course builds on it';
        return before + ', ' + after;
    }

    // ===== Page reading =====

    function labelText(label) {
        return String(label.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function findInfoRow(re) {
        var labels = document.querySelectorAll('td > label');
        for (var i = 0; i < labels.length; i++) {
            if (!re.test(labelText(labels[i]))) continue;
            var td = labels[i].parentElement;
            var value = td && td.nextElementSibling;
            if (value) return { row: td.parentElement, value: value };
        }
        return null;
    }

    function cellText(cell) {
        var clone = cell.cloneNode(true);
        Array.prototype.forEach.call(clone.querySelectorAll('[data-dtu-ext]'), function (n) { n.remove(); });
        return String(clone.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function cellLinks(cell) {
        var out = [];
        Array.prototype.forEach.call(cell.querySelectorAll('a[href*="/course/"]'), function (a) {
            var m = (a.getAttribute('href') || '').match(new RegExp('/course/(?:\\d{4}-\\d{4}/)?(' + CODE_SOURCE + ')\\b', 'i'));
            if (m) out.push(m[1].toUpperCase());
        });
        return out;
    }

    function readLiveCenterEntry(isKnown) {
        var field = function (row) { return row ? { text: cellText(row.value), links: cellLinks(row.value) } : null; };
        return entryFromFields(field(findInfoRow(PREREQ_LABEL_RE)), field(findInfoRow(MANDATORY_LABEL_RE)), isKnown);
    }

    // ===== Data =====

    var _dataPromise = null;

    function loadCourseMapData() {
        if (_dataPromise) return _dataPromise;
        var getUrl = dep('getExtensionUrl');
        if (!getUrl) return Promise.reject(new Error('no extension url'));
        _dataPromise = fetch(getUrl(DATA_FILE))
            .then(function (res) {
                if (!res.ok) throw new Error('http ' + res.status);
                return res.json();
            })
            .then(function (data) {
                if (!data || !data.courses) throw new Error('bad data');
                data.followers = buildFollowerIndex(data.courses);
                return data;
            })
            .catch(function (err) {
                _dataPromise = null;
                throw err;
            });
        return _dataPromise;
    }

    function readDepth() {
        var depth = { back: DEFAULT_DEPTH.back, forward: DEFAULT_DEPTH.forward };
        try {
            var saved = JSON.parse(localStorage.getItem(DEPTH_STORAGE_KEY) || 'null');
            if (saved) {
                ['back', 'forward'].forEach(function (k) {
                    var n = Number(saved[k]);
                    if (n >= DEPTH_LIMITS[k][0] && n <= DEPTH_LIMITS[k][1]) depth[k] = n;
                });
            }
        } catch (e0) { }
        return depth;
    }

    function saveDepth(depth) {
        try { localStorage.setItem(DEPTH_STORAGE_KEY, JSON.stringify(depth)); } catch (e0) { }
    }

    // Hidden unless the student has chosen to show them.
    function readHideMissing() {
        try { return localStorage.getItem(HIDE_MISSING_STORAGE_KEY) !== '0'; } catch (e0) { return true; }
    }

    function saveHideMissing(hide) {
        try { localStorage.setItem(HIDE_MISSING_STORAGE_KEY, hide ? '1' : '0'); } catch (e0) { }
    }

    // ===== Rendering =====

    var CSS = [
        '.dtu-cm-btn-note{color:var(--dtu-cm-muted)}',
        // The row: a small, still picture of the map with "Open course map" over its foot. A click
        // anywhere on the card presses that button. kurser's cells pad 12px on top only; the bottom margin
        // matches it, so the card sits in the middle of its row.
        '.dtu-cm-card{position:relative;display:block;margin:0 auto 12px;cursor:pointer;box-sizing:border-box;width:340px;height:120px;overflow:hidden;border:1px solid var(--dtu-cm-faint)!important;border-radius:6px;background:var(--dtu-cw-tip-bg)!important}',
        '.dtu-cm-card:hover,.dtu-cm-card:focus-within,.dtu-cm-card.open{border-color:var(--dtu-cm-accent)!important}',
        '.dtu-cm-thumb{position:absolute;inset:0;overflow:hidden;pointer-events:none;opacity:.55;font:13px/1.4 Arial,Helvetica,sans-serif;text-align:left;transition:opacity .15s}',
        '.dtu-cm-card:hover .dtu-cm-thumb,.dtu-cm-card:focus-within .dtu-cm-thumb{opacity:.85}',
        '.dtu-cm-thumb .dtu-cm-grid{position:absolute;left:0;top:0;margin:0;transform-origin:0 0}',
        '.dtu-cm-thumb .dtu-skel-block{padding:14px}',
        '.dtu-cm-card button.dtu-cm-open{appearance:none;-webkit-appearance:none;position:absolute;left:0;right:0;bottom:0;z-index:1;display:flex;flex-direction:column;align-items:flex-start;gap:1px;margin:0;padding:18px 10px 7px;border:0!important;border-radius:0;background:linear-gradient(to top,var(--dtu-cw-tip-bg) 40%,transparent)!important;color:var(--dtu-cm-ink)!important;font:inherit;font-size:12px;line-height:1.35;text-align:left;cursor:pointer;outline:none}',
        '.dtu-cm-card button.dtu-cm-open:focus-visible{text-decoration:underline}',
        '.dtu-cm-open b{font-weight:700}',
        '.dtu-cm-open span{color:var(--dtu-cm-muted)!important}',
        '.dtu-cm-btn{appearance:none;-webkit-appearance:none;display:inline-block;margin:0;padding:1px 8px;border:1px solid var(--dtu-cm-faint)!important;border-radius:4px;background:transparent!important;color:var(--dtu-cm-ink)!important;font:inherit;font-size:12px;line-height:18px;cursor:pointer;vertical-align:baseline}',
        '.dtu-cm-btn:hover,.dtu-cm-btn[aria-expanded="true"]{border-color:var(--dtu-cm-accent)!important}',
        // Same blurred, see-through backdrop as Settings and Library. The extra [data-dtu-ext] outranks
        // darkmode.css "body > div:not(.typebox)", which otherwise paints it solid #1a1a1a in dark mode.
        'div.dtu-cm-backdrop[data-dtu-ext]{position:fixed;inset:0;z-index:2147482999;background:transparent!important;background-color:transparent!important;backdrop-filter:blur(4px)!important;-webkit-backdrop-filter:blur(4px)!important}',
        '.dtu-cm-pop{position:fixed;inset:0;margin:auto;z-index:2147483000;box-sizing:border-box;display:flex;flex-direction:column;width:min(1180px,calc(100vw - 32px));height:min(720px,calc(100vh - 48px));padding:12px 14px 10px;border:1px solid var(--dtu-cw-faint)!important;border-radius:6px;background:var(--dtu-cw-tip-bg)!important;color:var(--dtu-cw-ink)!important;font:13px/1.4 Arial,Helvetica,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);text-align:left}',
        '.dtu-cm-head{display:flex;align-items:center;flex-wrap:wrap;gap:6px 14px;margin-bottom:10px}',
        '.dtu-cm-title{font-weight:700;color:var(--dtu-cw-ink)!important;margin-right:auto}',
        '.dtu-cm-title span{font-weight:400;color:var(--dtu-cw-muted)!important}',
        '.dtu-cm-head a{color:var(--dtu-cw-accent)!important;text-decoration:none}',
        '.dtu-cm-head a:hover{text-decoration:underline}',
        '.dtu-cm-depth{display:inline-flex;align-items:center;gap:4px;color:var(--dtu-cw-muted)!important;font-size:12px}',
        '.dtu-cm-depth b{min-width:10px;text-align:center;color:var(--dtu-cw-ink)!important}',
        '.dtu-cm-pop button.dtu-cm-step,.dtu-cm-pop button.dtu-cm-close,.dtu-cm-pop button.dtu-cm-reset{appearance:none;-webkit-appearance:none;margin:0;padding:0 6px;min-width:22px;height:22px;border:1px solid var(--dtu-cw-faint)!important;border-radius:4px;background:transparent!important;color:var(--dtu-cw-ink)!important;font:inherit;font-size:12px;cursor:pointer}',
        '.dtu-cm-pop button:disabled{opacity:.35;cursor:default}',
        '.dtu-cm-pop button.dtu-cm-close{border-color:transparent!important;font-size:16px}',
        '.dtu-cm-scroll{flex:1 1 auto;min-height:0;display:flex;overflow:auto;overscroll-behavior:contain;border:1px solid var(--dtu-cw-faint)!important;border-radius:4px;cursor:grab;-webkit-user-select:none;user-select:none}',
        '.dtu-cm-scroll.dragging{cursor:grabbing}',
        '.dtu-cm-grid{position:relative;flex:none;display:flex;align-items:center;gap:44px;width:max-content;margin:auto;padding:24px}',
        '.dtu-cm-lines{position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:0}',
        '.dtu-cm-lines path{fill:none;stroke:var(--dtu-cw-faint);stroke-width:1.2}',
        '.dtu-cm-lines path.on{stroke:var(--dtu-cw-accent);stroke-width:2}',
        '.dtu-cm-col{position:relative;z-index:1;display:flex;flex-direction:column;align-items:stretch;gap:8px}',
        '.dtu-cm-group{display:flex;flex-direction:column;gap:5px;padding:5px;border:1px dashed var(--dtu-cw-faint)!important;border-radius:6px}',
        '.dtu-cm-cap{font-size:11px;color:var(--dtu-cw-muted)!important}',
        ':is(.dtu-cm-pop,.dtu-cm-thumb) button.dtu-cm-node{appearance:none;-webkit-appearance:none;display:flex;align-items:baseline;gap:6px;margin:0;max-width:220px;padding:3px 8px;border:1px solid var(--dtu-cw-faint)!important;border-radius:4px;background:var(--dtu-cw-tip-bg)!important;color:var(--dtu-cw-ink)!important;font:inherit;font-size:12px;line-height:1.35;text-align:left;cursor:pointer;white-space:normal}',
        '.dtu-cm-node b{flex:none;font-weight:700;white-space:nowrap}',
        '.dtu-cm-node span{min-width:0;overflow-wrap:anywhere;color:var(--dtu-cw-muted)!important}',
        '.dtu-cm-node small.dtu-cm-gone{display:block;font-size:11px}',
        '.dtu-cm-btn:disabled{opacity:.45;cursor:default;border-color:var(--dtu-cm-faint)!important}',
        '.dtu-cm-missing{display:inline-flex;align-items:center;gap:5px;margin:0;font-weight:400!important;color:var(--dtu-cw-muted)!important;font-size:12px;cursor:pointer}',
        '.dtu-cm-missing input{margin:0;accent-color:var(--dtu-cw-accent)}',
        '.dtu-cm-pop button.dtu-cm-node:hover,.dtu-cm-pop button.dtu-cm-node.on{border-color:var(--dtu-cw-accent)!important}',
        ':is(.dtu-cm-pop,.dtu-cm-thumb) button.dtu-cm-node.me{max-width:320px;border-color:var(--dtu-cw-accent)!important;cursor:default}',
        ':is(.dtu-cm-pop,.dtu-cm-thumb) button.dtu-cm-node.me span{color:var(--dtu-cw-ink)!important}',
        ':is(.dtu-cm-pop,.dtu-cm-thumb) button.dtu-cm-more{appearance:none;-webkit-appearance:none;align-self:flex-start;margin:0;padding:2px 8px;border:1px dashed var(--dtu-cw-faint)!important;border-radius:4px;background:transparent!important;color:var(--dtu-cw-accent)!important;font:inherit;font-size:12px;cursor:pointer}',
        '.dtu-cm-pop button.dtu-cm-more:hover{border-color:var(--dtu-cw-accent)!important}',
        '.dtu-cm-empty,.dtu-cm-foot{color:var(--dtu-cw-muted)!important;font-size:12px}',
        '.dtu-cm-scroll .dtu-cm-empty{margin:auto;padding:24px;text-align:center}',
        '.dtu-cm-foot{margin-top:8px}'
    ].join('\n');

    function applyTheme(node) {
        var layout = null;
        try { layout = globalThis.DTUAfterDarkCourseWidgetsLayout || null; } catch (e0) { }
        if (layout && typeof layout.applyTheme === 'function') layout.applyTheme(node);
        node.style.setProperty('--dtu-cm-ink', 'var(--dtu-cw-ink)');
        node.style.setProperty('--dtu-cm-muted', 'var(--dtu-cw-muted)');
        node.style.setProperty('--dtu-cm-faint', 'var(--dtu-cw-faint)');
        node.style.setProperty('--dtu-cm-accent', 'var(--dtu-cw-accent)');
    }

    function courseName(data, code) {
        var entry = data.courses[code];
        return entry && entry.n ? entry.n : '';
    }

    // Why a course is not in this year's catalogue, or '' when it is.
    function catalogueStatus(data, code) {
        var entry = data.courses[code];
        if (entry && entry.y) return 'last listed ' + entry.y;
        if (entry) return '';
        return data.olderFrom ? 'not in any catalogue since ' + data.olderFrom : 'not in the current catalogue';
    }

    function makeNode(data, code, isCenter) {
        var node = el('button', 'dtu-cm-node' + (isCenter ? ' me' : ''));
        node.type = 'button';
        node.setAttribute('data-code', code);
        var name = courseName(data, code);
        var status = catalogueStatus(data, code);
        node.title = code + (name ? ' ' + name : '')
            + (status ? '\n' + status.charAt(0).toUpperCase() + status.slice(1) : '')
            + (isCenter ? '' : '\nClick to centre the map on this course');
        node.appendChild(el('b', null, code));
        var text = el('span', null, name || null);
        if (status && !isCenter) text.appendChild(el('small', 'dtu-cm-gone', status));
        node.appendChild(text);
        return node;
    }

    function makeMoreButton(count, side, level) {
        var more = el('button', 'dtu-cm-more', 'Show ' + count + ' more');
        more.type = 'button';
        more.setAttribute('data-side', side);
        more.setAttribute('data-level', String(level));
        return more;
    }

    function renderColumns(state) {
        var data = state.data;
        var map = state.map;
        var grid = el('div', 'dtu-cm-grid');
        var edges = [];

        var backCols = map.back.slice().reverse();
        backCols.forEach(function (column, i) {
            var col = el('div', 'dtu-cm-col');
            column.blocks.forEach(function (block) {
                var target;
                if (block.codes.length > 1 || block.required) {
                    target = el('div', 'dtu-cm-group');
                    var cap = block.atLeast ? 'at least ' + block.atLeast + ' of'
                        : block.codes.length > 1 ? 'one of' : '';
                    if (block.required) cap = cap ? 'required, ' + cap : 'required';
                    target.appendChild(el('span', 'dtu-cm-cap', cap));
                    block.codes.forEach(function (c) { target.appendChild(makeNode(data, c, false)); });
                } else {
                    target = makeNode(data, block.codes[0], false);
                }
                col.appendChild(target);
                edges.push({ from: target, toCode: block.owner, left: block.codes, right: block.owner });
            });
            if (column.more) col.appendChild(makeMoreButton(column.more, 'back', map.back.length - 1 - i));
            grid.appendChild(col);
        });

        var centerCol = el('div', 'dtu-cm-col');
        centerCol.appendChild(makeNode(data, map.center, true));
        grid.appendChild(centerCol);

        map.forward.forEach(function (column, step) {
            var col = el('div', 'dtu-cm-col');
            column.nodes.forEach(function (n) {
                var node = makeNode(data, n.code, false);
                col.appendChild(node);
                n.parents.forEach(function (p) { edges.push({ fromCode: p, to: node, left: [p], right: n.code }); });
            });
            if (column.more) col.appendChild(makeMoreButton(column.more, 'forward', step));
            grid.appendChild(col);
        });

        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'dtu-cm-lines');
        markExt(svg);
        grid.insertBefore(svg, grid.firstChild);
        return { grid: grid, edges: edges, svg: svg };
    }

    // Finds a node for `code` in the column next to `fromEl` in the given direction.
    function findNeighbourNode(grid, fromEl, code, direction) {
        var col = fromEl.closest('.dtu-cm-col');
        var next = direction > 0 ? col && col.nextElementSibling : col && col.previousElementSibling;
        return next ? next.querySelector('.dtu-cm-node[data-code="' + code + '"]') : null;
    }

    function drawLines(view) {
        var grid = view.grid;
        var svg = view.svg;
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        var box = grid.getBoundingClientRect();
        svg.setAttribute('width', String(Math.ceil(box.width)));
        svg.setAttribute('height', String(Math.ceil(box.height)));
        view.edges.forEach(function (edge) {
            var left = edge.from || findNeighbourNode(grid, edge.to, edge.fromCode, -1);
            var right = edge.to || findNeighbourNode(grid, edge.from, edge.toCode, 1);
            if (!left || !right) return;
            var a = left.getBoundingClientRect();
            var b = right.getBoundingClientRect();
            var x1 = a.right - box.left;
            var y1 = a.top + a.height / 2 - box.top;
            var x2 = b.left - box.left;
            var y2 = b.top + b.height / 2 - box.top;
            var mx = (x1 + x2) / 2;
            var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2);
            path.setAttribute('data-left', ' ' + edge.left.join(' ') + ' ');
            path.setAttribute('data-right', edge.right);
            svg.appendChild(path);
        });
    }

    // Lights the lines touching `code` and the courses at their other end.
    function highlight(view, code) {
        var linked = {};
        if (code) linked[code] = true;
        Array.prototype.forEach.call(view.svg.querySelectorAll('path'), function (p) {
            var left = p.getAttribute('data-left') || '';
            var right = p.getAttribute('data-right') || '';
            var fromLeft = !!code && left.indexOf(' ' + code + ' ') >= 0;
            var fromRight = !!code && right === code;
            p.classList.toggle('on', fromLeft || fromRight);
            if (fromLeft) linked[right] = true;
            if (fromRight) left.trim().split(' ').forEach(function (c) { linked[c] = true; });
        });
        Array.prototype.forEach.call(view.grid.querySelectorAll('.dtu-cm-node'), function (n) {
            n.classList.toggle('on', !!linked[n.getAttribute('data-code')]);
        });
    }

    var _state = null;

    function closeCourseMap() {
        if (!_state) return;
        if (_state.pop && _state.pop.parentNode) _state.pop.parentNode.removeChild(_state.pop);
        if (_state.backdrop && _state.backdrop.parentNode) _state.backdrop.parentNode.removeChild(_state.backdrop);
        document.removeEventListener('keydown', _state.onKey, true);
        document.removeEventListener('mousedown', _state.onDown, true);
        window.removeEventListener('resize', _state.onResize);
        if (_state.button) _state.button.setAttribute('aria-expanded', 'false');
        _state = null;
    }

    // Where the centre course sits inside the canvas, so a redraw of the same
    // map (more steps, a column expanded) keeps it in place.
    function centerOffset(state) {
        if (!state.view || state.drawnCenter !== state.center) return null;
        var me = state.view.grid.querySelector('.dtu-cm-node.me');
        if (!me) return null;
        var s = state.scroll.getBoundingClientRect();
        var n = me.getBoundingClientRect();
        return { x: n.left + n.width / 2 - s.left, y: n.top + n.height / 2 - s.top };
    }

    // Scrolls the canvas so the centre course is at `at`, or in the middle.
    function placeCenter(state, at) {
        var me = state.view.grid.querySelector('.dtu-cm-node.me');
        var scroll = state.scroll;
        var s = scroll.getBoundingClientRect();
        var n = me.getBoundingClientRect();
        var x = at ? at.x : s.width / 2;
        var y = at ? at.y : s.height / 2;
        scroll.scrollLeft += n.left + n.width / 2 - s.left - x;
        scroll.scrollTop += n.top + n.height / 2 - s.top - y;
    }

    // Dragging the canvas pans it; a drag that ends on a course does not open it.
    function enablePanning(scroll) {
        scroll.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            if (e.target === scroll && (e.offsetX >= scroll.clientWidth || e.offsetY >= scroll.clientHeight)) return;
            var x0 = e.clientX;
            var y0 = e.clientY;
            var left0 = scroll.scrollLeft;
            var top0 = scroll.scrollTop;
            var moved = false;
            var onMove = function (m) {
                var dx = m.clientX - x0;
                var dy = m.clientY - y0;
                if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;
                if (!moved) scroll.classList.add('dragging');
                moved = true;
                scroll.scrollLeft = left0 - dx;
                scroll.scrollTop = top0 - dy;
                m.preventDefault();
            };
            var onUp = function () {
                document.removeEventListener('mousemove', onMove, true);
                document.removeEventListener('mouseup', onUp, true);
                scroll.classList.remove('dragging');
                if (!moved) return;
                var swallow = function (c) { c.stopPropagation(); c.preventDefault(); };
                scroll.addEventListener('click', swallow, true);
                setTimeout(function () { scroll.removeEventListener('click', swallow, true); }, 0);
            };
            document.addEventListener('mousemove', onMove, true);
            document.addEventListener('mouseup', onUp, true);
        });
    }

    // The control that had focus in the map, to find again after a redraw.
    function focusKey(pop) {
        var a = document.activeElement;
        if (!a || a === pop || !pop.contains(a)) return null;
        return { code: a.getAttribute('data-code'), cls: a.className, label: a.getAttribute('aria-label') || a.textContent };
    }

    // Focuses that control in the redrawn map: a course by its code (the
    // course just centred is the new centre), anything else by its class and
    // label. When it is gone (Back to, Show more), the centre course, so a
    // keyboard user is never dropped back onto the page.
    function restoreFocus(pop, key) {
        if (!key) return;
        var match = Array.prototype.filter.call(pop.querySelectorAll('button, input'), function (b) {
            if (b.disabled) return false;
            if (key.code) return b.getAttribute('data-code') === key.code;
            return b.className === key.cls && (b.getAttribute('aria-label') || b.textContent) === key.label;
        })[0] || pop.querySelector('.dtu-cm-node.me') || pop;
        match.focus({ preventScroll: true });
    }

    function renderPopover(state) {
        var pop = state.pop;
        var keep = centerOffset(state);
        var focus = focusKey(pop);
        while (pop.firstChild) pop.removeChild(pop.firstChild);
        var data = state.data;
        var center = state.center;
        if (state.drawnCenter !== center) state.expand = { back: [], forward: [] };

        var head = el('div', 'dtu-cm-head');
        var title = el('div', 'dtu-cm-title', center + ' ');
        var centerStatus = catalogueStatus(data, center);
        title.appendChild(el('span', null, courseName(data, center) + (centerStatus ? ' (' + centerStatus + ')' : '')));
        head.appendChild(title);
        if (center !== state.pageCode) {
            var open = el('a', null, 'Open ' + center + ' course page');
            open.href = '/course/' + center;
            head.appendChild(open);
            var reset = el('button', 'dtu-cm-reset', 'Back to ' + state.pageCode);
            reset.type = 'button';
            reset.addEventListener('click', function () { state.center = state.pageCode; rerender(state); });
            head.appendChild(reset);
        }
        [['back', 'Earlier'], ['forward', 'Later']].forEach(function (pair) {
            var key = pair[0];
            var wrap = el('span', 'dtu-cm-depth', pair[1] + ' ');
            var minus = el('button', 'dtu-cm-step', '-');
            var plus = el('button', 'dtu-cm-step', '+');
            minus.type = plus.type = 'button';
            minus.setAttribute('aria-label', 'Fewer ' + pair[1].toLowerCase() + ' steps');
            plus.setAttribute('aria-label', 'More ' + pair[1].toLowerCase() + ' steps');
            minus.disabled = state.depth[key] <= DEPTH_LIMITS[key][0];
            plus.disabled = state.depth[key] >= DEPTH_LIMITS[key][1];
            minus.addEventListener('click', function () { state.depth[key]--; saveDepth(state.depth); rerender(state); });
            plus.addEventListener('click', function () { state.depth[key]++; saveDepth(state.depth); rerender(state); });
            wrap.appendChild(minus);
            wrap.appendChild(el('b', null, String(state.depth[key])));
            wrap.appendChild(plus);
            head.appendChild(wrap);
        });
        var override = center === state.pageCode ? state.liveEntry : null;
        var hiddenMap = buildCourseMap(data.courses, data.followers, center, state.depth, override, { hideMissing: true, expand: state.expand });
        var missing = hiddenMap.hidden;
        state.map = missing && !state.hideMissing
            ? buildCourseMap(data.courses, data.followers, center, state.depth, override, { expand: state.expand })
            : hiddenMap;
        if (missing) {
            var toggle = el('label', 'dtu-cm-missing');
            var box = el('input');
            box.type = 'checkbox';
            box.checked = !!state.hideMissing;
            box.addEventListener('change', function () {
                state.hideMissing = box.checked;
                saveHideMissing(state.hideMissing);
                rerender(state);
            });
            toggle.appendChild(box);
            toggle.appendChild(document.createTextNode('Hide courses not in the current catalogue'));
            head.appendChild(toggle);
        }
        var close = el('button', 'dtu-cm-close', '×');
        close.type = 'button';
        close.setAttribute('aria-label', 'Close course map');
        close.addEventListener('click', closeCourseMap);
        head.appendChild(close);
        pop.appendChild(head);

        var scroll = el('div', 'dtu-cm-scroll');
        state.scroll = scroll;
        enablePanning(scroll);
        if (!state.map.back.length && !state.map.forward.length) {
            scroll.appendChild(el('div', 'dtu-cm-empty', (missing && state.hideMissing
                ? 'No prerequisites in the current catalogue'
                : 'No prerequisites listed') + ', and no course lists ' + center + ' as a prerequisite.'));
            pop.appendChild(scroll);
            state.view = null;
        } else {
            var view = renderColumns(state);
            scroll.appendChild(view.grid);
            pop.appendChild(scroll);
            state.view = view;
            view.grid.addEventListener('mouseover', function (e) {
                var node = e.target.closest && e.target.closest('.dtu-cm-node');
                highlight(view, node ? node.getAttribute('data-code') : null);
            });
            view.grid.addEventListener('mouseleave', function () { highlight(view, null); });
            view.grid.addEventListener('click', function (e) {
                var more = e.target.closest && e.target.closest('.dtu-cm-more');
                if (more) {
                    state.expand[more.getAttribute('data-side')].push(Number(more.getAttribute('data-level')));
                    rerender(state);
                    return;
                }
                var node = e.target.closest && e.target.closest('.dtu-cm-node');
                if (!node || node.classList.contains('me')) return;
                state.center = node.getAttribute('data-code');
                rerender(state);
            });
        }

        var read = formatReadDate(data.generatedAt, { month: 'short', invalid: '' });
        var foot = 'Lines join a course to the courses it lists as prerequisites.';
        if (read) foot += ' Other courses as listed on kurser.dtu.dk on ' + read + '.';
        if (missing && state.hideMissing) {
            foot += ' ' + missing + (missing === 1 ? ' listed course is' : ' listed courses are') + ' not in the current catalogue and hidden.';
        }
        pop.appendChild(el('div', 'dtu-cm-foot', foot));

        if (state.view) {
            drawLines(state.view);
            placeCenter(state, keep);
        }
        state.drawnCenter = center;
        restoreFocus(pop, focus);
    }

    // ===== Moving between maps =====

    function reducedMotion() {
        try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e0) { return false; }
    }

    // Screen positions of the drawn courses, per code in drawing order (a
    // course can be drawn more than once further back).
    function nodePositions(state) {
        var out = {};
        if (!state.view) return out;
        Array.prototype.forEach.call(state.view.grid.querySelectorAll('.dtu-cm-node'), function (n) {
            var code = n.getAttribute('data-code');
            (out[code] = out[code] || []).push(n.getBoundingClientRect());
        });
        return out;
    }

    // Redraws the map, then slides each course that stays from where it was
    // to where it is now; new courses, captions and lines fade in.
    function rerender(state) {
        var before = reducedMotion() ? null : nodePositions(state);
        renderPopover(state);
        if (!before || !state.view || typeof Element.prototype.animate !== 'function') return;
        var used = {};
        var ease = 'cubic-bezier(.2,.7,.2,1)';
        Array.prototype.forEach.call(state.view.grid.querySelectorAll('.dtu-cm-node'), function (n) {
            var code = n.getAttribute('data-code');
            var i = used[code] = (used[code] || 0) + 1;
            var old = before[code] && before[code][i - 1];
            if (!old) {
                n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MOVE_MS, delay: MOVE_MS / 2, easing: 'ease-out', fill: 'backwards' });
                return;
            }
            var now = n.getBoundingClientRect();
            var dx = old.left - now.left;
            var dy = old.top - now.top;
            if (!dx && !dy) return;
            n.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: MOVE_MS, easing: ease });
        });
        Array.prototype.forEach.call(state.view.grid.querySelectorAll('.dtu-cm-cap,.dtu-cm-more'), function (n) {
            n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MOVE_MS, delay: MOVE_MS / 2, fill: 'backwards' });
        });
        state.view.svg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MOVE_MS / 2, delay: MOVE_MS, fill: 'backwards' });
    }

    function skeletonApi() {
        var skel = globalThis.DTUAfterDarkSkeleton;
        if (!skel) throw new Error('DTUAfterDarkSkeleton missing: load darkmode.skeleton.js before darkmode.kurser-course-map.js');
        return skel;
    }

    // The map's outline while its data loads, in the popover's own layout
    // classes: the header line, columns of course boxes leading to the course
    // itself, and the foot note.
    function courseMapSkeleton() {
        var skel = skeletonApi();
        var box = skel.block('Loading course map', [], markExt);
        box.style.cssText = 'flex:1 1 auto;min-height:0;gap:0';
        function bar(w, h) { return skel.bar(w, h, null, markExt); }
        function hidden(tag, cls) { var n = el(tag, cls); n.setAttribute('aria-hidden', 'true'); return n; }
        var head = hidden('div', 'dtu-cm-head');
        var title = bar('220px', '16px');
        title.style.marginRight = 'auto';
        head.appendChild(title);
        [['130px', '18px'], ['90px', '22px'], ['86px', '22px'], ['78px', '22px']].forEach(function (s) { head.appendChild(bar(s[0], s[1])); });
        box.appendChild(head);
        var scroll = hidden('div', 'dtu-cm-scroll');
        var grid = hidden('div', 'dtu-cm-grid');
        [5, 4, 1].forEach(function (count, i) {
            var col = hidden('div', 'dtu-cm-col');
            for (var n = 0; n < count; n++) col.appendChild(bar(i === 2 ? '200px' : '220px', i === 2 ? '24px' : '38px'));
            grid.appendChild(col);
        });
        scroll.appendChild(grid);
        box.appendChild(scroll);
        var foot = hidden('div', 'dtu-cm-foot');
        foot.appendChild(bar('62%', '12px'));
        box.appendChild(foot);
        return box;
    }

    function openCourseMap(button, pageCode) {
        closeCourseMap();
        ensureStyles(STYLE_ID, CSS);
        var pop = el('div', 'dtu-cm-pop');
        pop.setAttribute('role', 'dialog');
        pop.setAttribute('aria-label', 'Course map for ' + pageCode);
        pop.setAttribute('aria-modal', 'true');
        pop.tabIndex = -1;
        applyTheme(pop);
        pop.appendChild(courseMapSkeleton());
        var backdrop = el('div', 'dtu-cm-backdrop');
        document.body.appendChild(backdrop);
        document.body.appendChild(pop);
        button.setAttribute('aria-expanded', 'true');

        var state = {
            button: button,
            pop: pop,
            backdrop: backdrop,
            pageCode: pageCode,
            center: pageCode,
            depth: readDepth(),
            hideMissing: readHideMissing(),
            data: null
        };
        state.onKey = function (e) { if (e.key === 'Escape') closeCourseMap(); };
        state.onDown = function (e) {
            if (pop.contains(e.target) || button.contains(e.target)) return;
            closeCourseMap();
        };
        state.onResize = function () {
            if (state.view) drawLines(state.view);
        };
        document.addEventListener('keydown', state.onKey, true);
        document.addEventListener('mousedown', state.onDown, true);
        window.addEventListener('resize', state.onResize);
        _state = state;

        loadCourseMapData().then(function (data) {
            if (_state !== state) return;
            state.data = data;
            state.liveEntry = readLiveCenterEntry(function (c) { return !!data.courses[c]; });
            renderPopover(state);
            var scroll = pop.querySelector('.dtu-cm-scroll');
            if (scroll) skeletonApi().reveal(scroll, markExt);
        }, function () {
            if (_state !== state) return;
            while (pop.firstChild) pop.removeChild(pop.firstChild);
            pop.appendChild(el('div', 'dtu-cm-empty', 'The course map data could not be loaded.'));
        });
    }

    // ===== Button =====

    function removeKurserCourseMap() {
        closeCourseMap();
        Array.prototype.forEach.call(document.querySelectorAll('[data-dtu-course-map]'), function (n) {
            var row = n.getAttribute('data-dtu-course-map') === 'row' ? n : null;
            (row || n).remove();
        });
    }

    function insertKurserCourseMap() {
        var isTop = dep('isTopWindow');
        var isCoursePage = dep('isKurserCoursePage');
        var isEnabled = dep('isFeatureFlagEnabled');
        var getCode = dep('getKurserCourseCode');
        var deps = getDeps();
        if (!deps || !isTop || !isTop() || !isCoursePage || !isCoursePage() || !getCode) return;
        if (!isEnabled || !isEnabled(deps.featureKurserCourseMapKey)) {
            removeKurserCourseMap();
            return;
        }
        var pageCode = getCode();
        if (!pageCode || document.querySelector('[data-dtu-course-map]')) return;
        ensureStyles(STYLE_ID, CSS);
        // A row of its own under Academic prerequisites (or under the ECTS
        // row when a course lists none), so the prerequisite text stays whole.
        var anchor = findInfoRow(PREREQ_LABEL_RE) || findInfoRow(POINTS_LABEL_RE);
        if (!anchor || !anchor.row || !anchor.row.parentNode) {
            globalThis.DTUAfterDarkWarnMissingAnchor && globalThis.DTUAfterDarkWarnMissingAnchor('Course map', 'prerequisites or ECTS row', function () {
                return !document.querySelector('[data-dtu-course-map]') && !findInfoRow(PREREQ_LABEL_RE) && !findInfoRow(POINTS_LABEL_RE);
            });
            return;
        }
        var button = el('button', 'dtu-cm-open');
        button.type = 'button';
        button.setAttribute('data-dtu-course-map', '1');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-haspopup', 'dialog');
        button.appendChild(el('b', null, 'Open course map'));
        var caption = button.appendChild(el('span', null, 'Courses before ' + pageCode + ' and the courses that build on it'));
        button.addEventListener('click', function () {
            if (_state && _state.button === button) closeCourseMap();
            else openCourseMap(button, pageCode);
        });
        var card = el('div', 'dtu-cm-card');
        var thumb = el('div', 'dtu-cm-thumb');
        thumb.setAttribute('aria-hidden', 'true');
        thumb.setAttribute('inert', '');
        thumb.appendChild(skeletonApi().block('Loading course map', [0, 1, 2].map(function () { return [['26%', '14px'], ['20%', '14px'], ['26%', '14px']]; }), markExt));
        card.appendChild(thumb);
        card.appendChild(button);
        card.addEventListener('click', function (e) { if (!button.contains(e.target)) button.click(); });
        var row = markExt(document.createElement('tr'));
        row.setAttribute('data-dtu-course-map', 'row');
        applyTheme(row);
        var labelCell = markExt(document.createElement('td'));
        labelCell.appendChild(markExt(document.createElement('label'))).textContent = 'Course map';
        var valueCell = markExt(document.createElement('td'));
        valueCell.appendChild(card);
        row.appendChild(labelCell);
        row.appendChild(valueCell);
        anchor.row.parentNode.insertBefore(row, anchor.row.nextSibling);
        loadCourseMapData().then(function (data) {
            if (!card.isConnected) return;
            var live = readLiveCenterEntry(function (c) { return !!data.courses[c]; });
            var counts = courseMapCounts(data.courses, data.followers, pageCode, live);
            // Nothing to draw: no card, just say why.
            if (!counts.before && !counts.after) {
                valueCell.replaceChild(el('span', 'dtu-cm-btn-note', 'No prerequisites listed, and no course lists ' + pageCode + ' as a prerequisite'), card);
                return;
            }
            caption.textContent = courseMapCaption(pageCode, counts);
            drawPreview(thumb, data, pageCode, live);
        }, function () {
            if (card.isConnected) valueCell.replaceChild(el('span', 'dtu-cm-btn-note', 'The course map data could not be loaded.'), card);
        });
    }

    // Draws the map as the popover first shows it (the student's saved depth
    // and hide setting) into `thumb`, scaled down to fill it, the course
    // itself in the middle of the space above the caption.
    function drawPreview(thumb, data, pageCode, live) {
        var depth = readDepth();
        var full = buildCourseMap(data.courses, data.followers, pageCode, depth, live, { hideMissing: true });
        var map = full.hidden && !readHideMissing() ? buildCourseMap(data.courses, data.followers, pageCode, depth, live) : full;
        while (thumb.firstChild) thumb.removeChild(thumb.firstChild);
        if (!map.back.length && !map.forward.length) return;
        var view = renderColumns({ data: data, map: map });
        thumb.appendChild(view.grid);
        drawLines(view);
        var w = thumb.clientWidth;
        var h = thumb.clientHeight - 34;
        var gw = view.grid.offsetWidth;
        var gh = view.grid.offsetHeight;
        var me = view.grid.querySelector('.dtu-cm-node.me');
        if (!w || !gw || !gh || !me) return;
        var scale = Math.min(0.5, Math.max(w / gw, h / gh));
        var g = view.grid.getBoundingClientRect();
        var m = me.getBoundingClientRect();
        var place = function (size, gridSize, centre) {
            var s = gridSize * scale;
            if (s <= size) return (size - s) / 2;
            return Math.min(0, Math.max(size - s, size / 2 - centre * scale));
        };
        var x = place(w, gw, m.left + m.width / 2 - g.left);
        var y = place(h, gh, m.top + m.height / 2 - g.top);
        view.grid.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
        skeletonApi().reveal(thumb, markExt);
    }

    try {
        globalThis.DTUAfterDarkCourseMap = {
            tokenizePrerequisiteExpression: tokenizePrerequisiteExpression,
            parseCoursePrerequisites: parseCoursePrerequisites,
            entryFromFields: entryFromFields,
            buildFollowerIndex: buildFollowerIndex,
            buildCourseMap: buildCourseMap,
            courseMapHasContent: courseMapHasContent,
            courseMapCounts: courseMapCounts,
            courseMapCaption: courseMapCaption,
            readHideMissing: readHideMissing,
            saveHideMissing: saveHideMissing,
            insertKurserCourseMap: insertKurserCourseMap,
            removeKurserCourseMap: removeKurserCourseMap
        };
    } catch (eCourseMap) { }
})();
