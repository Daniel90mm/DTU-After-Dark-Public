// Grade statistics service for the DTU After Dark background worker.
(function() {
    'use strict';

    const decodeBasicHtmlEntities = DTUAfterDarkShared.decodeBasicHtmlEntities;

    const GRADES = ['12', '10', '7', '4', '02', '00', '-3'];
    const GRADE_VALUES = { '12': 12, '10': 10, '7': 7, '4': 4, '02': 2, '00': 0, '-3': -3 };

    function getCourseCodeVariants(courseCode) {
        const raw = String(courseCode || '').trim();
        const variants = [];
        const seen = Object.create(null);
        function add(v) {
            if (!v || seen[v]) return;
            seen[v] = true;
            variants.push(v);
        }

        add(raw);

        // Handle both ".../34721/..." and ".../34721-1/..." patterns.
        const suffixMatch = raw.match(/^(.+)-(\d+)$/);
        if (suffixMatch) {
            add(suffixMatch[1]);
        } else {
            add(raw + '-1');
        }
        return variants;
    }

    function buildDefaultSemesters() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-11
        const startYear = (month <= 5) ? (year - 1) : year;
        const semesters = [];
        for (let y = startYear; y >= startYear - 6; y--) {
            semesters.push(`Winter-${y}`);
            semesters.push(`Summer-${y}`);
        }
        return semesters;
    }

    // Returned for a page that exists but holds no result rows, no registered count and
    // none of DTU's "no data" markers: the layout changed, which is not the same as a
    // course without results.
    const GRADE_PAGE_UNREADABLE = Object.freeze({ unreadable: true });

    function parseGradeDistribution(html) {
        if (!html) return null;
        if (/No\s+data|Ingen\s+karakter|ingen\s+karakter/i.test(html)) return null;
        if (/Fordelingen\s+vises\s+ikke/i.test(html)) return null;

        function normalizeCellText(text) {
            return String(text || '')
                .replace(/\u00a0/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function normalizeGradeToken(text) {
            return normalizeCellText(text)
                .replace(/[\u2212\u2013\u2014]/g, '-')
                .replace(/\s+/g, '');
        }

        function extractCountFromCells(cells, startIdx) {
            for (let i = startIdx; i < cells.length; i++) {
                const txt = normalizeCellText(cells[i]);
                if (!txt) continue;
                const exactInt = txt.match(/^-?\d+$/);
                if (exactInt) {
                    const n = parseInt(exactInt[0], 10);
                    if (!isNaN(n)) return n;
                }
                const firstInt = txt.match(/-?\d+/);
                if (firstInt) {
                    const n = parseInt(firstInt[0], 10);
                    if (!isNaN(n)) return n;
                }
            }
            return null;
        }

        // Whole-cell matches only: the summary table above the results has rows
        // like "Antal best\u00e5et" (number passed) that must not read as a result row.
        function isFailLabel(text) {
            return /^(ikke\s+best[\u00e5a]et|not\s+passed|failed?)$/i.test(text || '');
        }

        function isNoShowLabel(text) {
            return /^(ej\s*m[\u00f8o]dt|no[\s-]?show|absent)$/i.test(text || '');
        }

        function isPassLabel(text) {
            return /^(best[\u00e5a]et|pass(?:ed)?|godkendt)$/i.test(text || '');
        }

        function isRegisteredLabel(text) {
            return /^(antal\s+tilmeldte|registered(\s+students)?|number\s+of\s+registered(\s+students)?)$/i.test(text || '');
        }

        function parseRows(rowsCells) {
            const counts = {};
            GRADES.forEach(g => { counts[g] = 0; });
            const passFailCounts = { passed: 0, failed: 0, noShow: 0 };
            let gradeRowsFound = 0;
            let passFailRowsFound = 0;
            let registered = null;

            rowsCells.forEach(cells => {
                if (!Array.isArray(cells) || cells.length < 2) return;
                const firstCell = normalizeCellText(cells[0]);
                const firstToken = normalizeGradeToken(firstCell);

                if (registered === null && isRegisteredLabel(firstCell)) {
                    registered = extractCountFromCells(cells, 1);
                    return;
                }

                if (GRADES.indexOf(firstToken) !== -1) {
                    const n = extractCountFromCells(cells, 1);
                    if (n !== null) {
                        counts[firstToken] = n;
                        gradeRowsFound++;
                    }
                    return;
                }

                if (isFailLabel(firstCell)) {
                    const n = extractCountFromCells(cells, 1);
                    if (n !== null) {
                        passFailCounts.failed = n;
                        passFailRowsFound++;
                    }
                    return;
                }

                if (isNoShowLabel(firstCell)) {
                    const n = extractCountFromCells(cells, 1);
                    if (n !== null) {
                        passFailCounts.noShow = n;
                        passFailRowsFound++;
                    }
                    return;
                }

                if (isPassLabel(firstCell)) {
                    const n = extractCountFromCells(cells, 1);
                    if (n !== null) {
                        passFailCounts.passed = n;
                        passFailRowsFound++;
                    }
                }
            });

            return { counts, passFailCounts, gradeRowsFound, passFailRowsFound, registered };
        }

        let parsed = null;

        // Try DOMParser first if available (MV2 background has DOM)
        if (typeof DOMParser !== 'undefined') {
            try {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const rows = Array.from(doc.querySelectorAll('tr'));
                const rowsCells = rows.map(row => {
                    return Array.from(row.querySelectorAll('th, td')).map(c => normalizeCellText(c.textContent || ''));
                });
                parsed = parseRows(rowsCells);
            } catch (e) {
                // Fall back to regex parsing below.
            }
        }

        // Regex fallback if DOM parsing found nothing usable
        if (!parsed || (!parsed.gradeRowsFound && !parsed.passFailRowsFound)) {
            const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
            let match;
            const rowsCells = [];
            while ((match = rowRegex.exec(html)) !== null) {
                const rowHtml = match[1];
                const cellMatches = rowHtml.matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi);
                const cells = [];
                for (const cell of cellMatches) {
                    // Decode entities too: the pages spell "Bestået" and "Ej mødt"
                    // as "Best&#229;et" and "Ej m&#248;dt", and the Chrome service
                    // worker has no DOMParser, so this path is the only one there.
                    const text = normalizeCellText(decodeBasicHtmlEntities(
                        String(cell[1] || '').replace(/<[^>]+>/g, ' ')
                    ));
                    cells.push(text);
                }
                if (cells.length >= 2) rowsCells.push(cells);
            }
            parsed = parseRows(rowsCells);
        }

        if (!parsed || (!parsed.gradeRowsFound && !parsed.passFailRowsFound && parsed.registered === null)) {
            return GRADE_PAGE_UNREADABLE;
        }

        const counts = parsed.counts || {};
        const pf = parsed.passFailCounts || { passed: 0, failed: 0, noShow: 0 };
        // Many exams mix both scales: a pass/fail course with a few graded
        // students, or a graded exam listing some students only as "Ikke
        // bestået". Count every student who sat the exam in the pass rate, and
        // let whichever scale most of them got decide the mode.
        let gradedTotal = 0;
        let gradedPassed = 0;
        let weighted = 0;
        GRADES.forEach(g => {
            const c = counts[g] || 0;
            gradedTotal += c;
            weighted += GRADE_VALUES[g] * c;
            if (GRADE_VALUES[g] > 0) gradedPassed += c;
        });
        const passFailTotal = (pf.passed || 0) + (pf.failed || 0);
        const total = gradedTotal + passFailTotal;
        // DTU does not show usable grade distribution for very small cohorts.
        if (total <= 3) return null;
        const passedTotal = gradedPassed + (pf.passed || 0);
        const mode = gradedTotal >= passFailTotal ? 'graded' : 'pass_fail';
        return {
            mode,
            counts,
            total,
            gradedTotal,
            passedTotal,
            failedTotal: total - passedTotal,
            average: (mode === 'graded' && gradedTotal > 0) ? weighted / gradedTotal : null,
            passRate: (passedTotal / total) * 100,
            passFailCounts: pf,
            registered: (typeof parsed.registered === 'number' && parsed.registered > 0) ? parsed.registered : null
        };
    }

    function gradePeriodSortKey(semester) {
        const m = /^(Winter|Summer)-(\d{4})$/i.exec(String(semester || ''));
        if (!m) return -1;
        // The winter exam (December) comes after the summer exam of the same year.
        return parseInt(m[2], 10) * 2 + (/^winter$/i.test(m[1]) ? 1 : 0);
    }

    // Every karakterer page links the course's other exam periods ("Andre
    // versioner"), so one page is enough to know which periods exist.
    function parseGradePeriodLinks(html, codeVariant) {
        const out = [];
        const code = String(codeVariant || '').toLowerCase();
        const regex = /Histogram\/1\/([^\/"'\s]+)\/((?:Winter|Summer)-\d{4})/gi;
        let m;
        while ((m = regex.exec(html || '')) !== null) {
            let linkCode;
            try { linkCode = decodeURIComponent(m[1]).toLowerCase(); } catch (e) { continue; }
            if (linkCode !== code) continue;
            const semester = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
            if (out.indexOf(semester) === -1) out.push(semester);
        }
        return out;
    }

    async function fetchGradePage(codeVariant, semester) {
        const url = `https://karakterer.dtu.dk/Histogram/1/${encodeURIComponent(codeVariant)}/${semester}`;
        const res = await fetch(url, { cache: 'no-store', credentials: 'omit' });
        if (res && res.status === 404) return null;
        if (!res || !res.ok) throw new Error('grade_http_' + (res ? res.status : 'unknown'));
        return await res.text();
    }

    // A small sitting next to a much bigger one is usually a re-exam: a few
    // students who failed the main exam. Showing it as "the" result makes a
    // course look far harder or easier than it is, so the default is the
    // newest exam at least a third the size of the biggest one in the list.
    function pickMainGradeIteration(iterations) {
        const size = (it) => (it.data && (it.data.registered || it.data.total)) || 0;
        const biggest = iterations.reduce((m, it) => Math.max(m, size(it)), 0);
        iterations.forEach(it => { it.small = size(it) < biggest / 3; });
        const mainIndex = iterations.findIndex(it => !it.small);
        return mainIndex === -1 ? 0 : mainIndex;
    }

    async function fetchLatestIterations(courseCode, semesterCandidates, maxIterations) {
        // Only Winter-YYYY / Summer-YYYY may reach the request path.
        const candidates = Array.isArray(semesterCandidates)
            ? semesterCandidates.filter(s => /^(?:Winter|Summer)-\d{4}$/.test(String(s)))
            : [];
        const semesters = (candidates.length ? candidates : buildDefaultSemesters()).sort((a, b) => gradePeriodSortKey(b) - gradePeriodSortKey(a));
        const wanted = (typeof maxIterations === 'number' && maxIterations > 0) ? maxIterations : 4;
        const codeVariants = getCourseCodeVariants(courseCode);
        let sawUnreadable = false;
        const usable = (data) => {
            if (data === GRADE_PAGE_UNREADABLE) { sawUnreadable = true; return false; }
            return !!data;
        };

        for (let v = 0; v < codeVariants.length; v++) {
            const codeVariant = codeVariants[v];

            // Find the newest page that exists; a missing period is a 404.
            let first = null;
            for (let i = 0; i < semesters.length && !first; i++) {
                const html = await fetchGradePage(codeVariant, semesters[i]);
                if (html) first = { semester: semesters[i], index: i, html };
            }
            if (!first) continue;

            const links = parseGradePeriodLinks(first.html, codeVariant);
            // A page always links itself, so no links at all means the layout
            // changed: fall back to walking the older candidates. Links but no
            // older period means this is the course's first exam.
            const older = links.length
                ? links.filter(sem => gradePeriodSortKey(sem) < gradePeriodSortKey(first.semester))
                : semesters.slice(first.index + 1);
            older.sort((a, b) => gradePeriodSortKey(b) - gradePeriodSortKey(a));

            const iterations = [];
            const firstData = parseGradeDistribution(first.html);
            if (usable(firstData)) iterations.push({ semester: first.semester, data: firstData, courseId: codeVariant });

            // Periods DTU hides (three or fewer students) parse to null, so
            // fetch in small batches until enough usable ones are found.
            for (let i = 0; i < older.length && iterations.length < wanted; i += 4) {
                const batch = older.slice(i, i + 4);
                const pages = await Promise.all(batch.map(sem => fetchGradePage(codeVariant, sem)));
                pages.forEach((html, k) => {
                    if (iterations.length >= wanted) return;
                    const data = parseGradeDistribution(html);
                    if (usable(data)) iterations.push({ semester: batch[k], data, courseId: codeVariant });
                });
            }

            if (!iterations.length) continue;
            const mainIndex = pickMainGradeIteration(iterations);
            return {
                ok: true,
                iterations,
                mainIndex,
                // Backward-compatible fields for consumers expecting one result.
                semester: iterations[mainIndex].semester,
                data: iterations[mainIndex].data
            };
        }

        return { ok: false, error: sawUnreadable ? 'parse_failed' : 'no_data' };
    }
    globalThis.DTUAfterDarkGrades = {
        fetchLatestIterations
    };
})();
