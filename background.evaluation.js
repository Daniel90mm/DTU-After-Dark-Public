// Course evaluation service for the DTU After Dark background worker.
(function() {
    'use strict';

    const normalizeSpace = DTUAfterDarkShared.normalizeSpace;
    const stripHtmlTags = DTUAfterDarkShared.stripHtmlTags;

    // --- Course evaluation parsing (evaluering.dtu.dk) ---

    const EVAL_LIKERT_OPTIONS = ['Helt uenig', 'Uenig', 'Hverken eller', 'Enig', 'Helt enig'];
    const EVAL_WORKLOAD_OPTIONS = ['Meget mindre', 'Noget mindre', 'Det samme', 'Noget mere', 'Meget mere'];
    const EVAL_LIKERT_WEIGHTS = { 'Helt uenig': 1, 'Uenig': 2, 'Hverken eller': 3, 'Enig': 4, 'Helt enig': 5 };
    const EVAL_WORKLOAD_WEIGHTS = { 'Meget mindre': 1, 'Noget mindre': 2, 'Det samme': 3, 'Noget mere': 4, 'Meget mere': 5 };

    function parseEvaluationHtml(html) {
        if (!html || html.length < 200) return null;

        const result = {
            eligible: 0,
            respondents: 0,
            excluded: 0,
            responseRate: 0,
            title: '',
            period: '',
            questions: [],
            workload: null
        };

        // --- Extract title and period from h2 ---
        const titleMatch = html.match(/<h2[^>]*>\s*Resultater\s*:\s*([\s\S]*?)<\/h2>/i);
        if (titleMatch) {
            result.title = normalizeSpace(stripHtmlTags(titleMatch[1]));
            // Extract period token like "F25" from the end of the title
            const periodMatch = result.title.match(/\b([FE]\d{2})\s*$/);
            // Three-week courses end in a month instead: "... Jan 26".
            const monthMatch = result.title.match(/\b(Jan|Jun|Jul|Aug)\s+(\d{2})\s*$/i);
            if (periodMatch) result.period = periodMatch[1];
            else if (monthMatch) result.period = monthMatch[1] + ' ' + monthMatch[2];
        }

        // --- Extract statistics ---
        const statsContainerMatch = html.match(/<div[^>]*id="CourseResultsPublicContainer"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
        if (statsContainerMatch) {
            const statsHtml = statsContainerMatch[1];
            // Extract eligible count (first td number)
            const statsRows = [];
            const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
            let trMatch;
            while ((trMatch = trRegex.exec(statsHtml)) !== null) {
                const cells = [];
                const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
                let tdMatch;
                while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
                    cells.push(normalizeSpace(stripHtmlTags(tdMatch[1])));
                }
                if (cells.length >= 2) statsRows.push(cells);
            }
            if (statsRows.length >= 2) {
                result.eligible = parseInt(statsRows[0][0], 10) || 0;
                result.respondents = parseInt(statsRows[1][0], 10) || 0;
                if (statsRows.length >= 3) {
                    result.excluded = parseInt(statsRows[2][0], 10) || 0;
                }
            }

        }

        // Extract response rate percentage (search full HTML -- the PercentageResult div
        // may sit outside the minimal container match above)
        const rateMatch = html.match(/<div[^>]*id="PercentageResult"[^>]*>[\s\S]*?<span>([\d,.]+)\s*%<\/span>/i);
        if (rateMatch) {
            result.responseRate = parseFloat(rateMatch[1].replace(',', '.')) || 0;
        }
        // Fallback: compute from eligible/respondents if page didn't have the element
        if (!result.responseRate && result.eligible > 0 && result.respondents > 0) {
            result.responseRate = (result.respondents / result.eligible) * 100;
        }

        // --- Extract question blocks ---
        const wrapperRegex = /<div\s+class="ResultCourseModelWrapper[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
        // More robust: split by ResultCourseModelWrapper
        const wrapperParts = html.split(/(?=<div\s+class="ResultCourseModelWrapper)/i);

        for (let i = 0; i < wrapperParts.length; i++) {
            const block = wrapperParts[i];
            if (!block || !/ResultCourseModelWrapper/i.test(block)) continue;

            // Extract question number
            const qNumMatch = block.match(/QuestionPositionColumn[^>]*>([\s\S]*?)<\/div>/i);
            if (!qNumMatch) continue;
            const qNum = normalizeSpace(stripHtmlTags(qNumMatch[1]));
            if (!qNum) continue;

            // Extract question text
            const qTextMatch = block.match(/FinalEvaluation_QuestionText[^>]*>([\s\S]*?)<\/div>/i);
            const qText = qTextMatch ? normalizeSpace(stripHtmlTags(qTextMatch[1])) : '';

            // Extract option labels and counts
            const options = [];
            const rowParts = block.split(/(?=<div\s+class="RowWrapper)/i);
            for (let r = 0; r < rowParts.length; r++) {
                const row = rowParts[r];
                if (!row || !/RowWrapper/i.test(row)) continue;

                const optionMatch = row.match(/FinalEvaluation_Result_OptionColumn[^>]*>([\s\S]*?)<\/div>/i);
                const countMatch = row.match(/Answer_Result_Background[^>]*>\s*<span>([\s\S]*?)<\/span>/i);
                if (optionMatch && countMatch) {
                    const label = normalizeSpace(stripHtmlTags(optionMatch[1]));
                    const count = parseInt(normalizeSpace(stripHtmlTags(countMatch[1])), 10) || 0;
                    options.push({ label, count });
                }
            }

            if (!options.length) continue;

            // Extract total responses from footer
            const footerMatch = block.match(/CourseSchemaResultFooter[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/i);
            const totalResponses = footerMatch ? (parseInt(normalizeSpace(stripHtmlTags(footerMatch[1])), 10) || 0) : 0;

            // Determine if this is a Likert (1.x) or workload (2.x) question
            const isWorkload = /^2\./.test(qNum);
            const isQualitative = /^3\./.test(qNum);
            if (isQualitative) continue; // Skip qualitative

            const weights = isWorkload ? EVAL_WORKLOAD_WEIGHTS : EVAL_LIKERT_WEIGHTS;
            let weightedSum = 0;
            let totalCount = 0;
            options.forEach(function(opt) {
                const w = weights[opt.label];
                if (w != null) {
                    weightedSum += w * opt.count;
                    totalCount += opt.count;
                }
            });
            const average = totalCount > 0 ? (weightedSum / totalCount) : 0;

            const questionData = {
                number: qNum,
                text: qText,
                options: options,
                totalResponses: totalResponses,
                average: average
            };

            // The workload question is 2.1; a later 2.x block must not replace it.
            if (isWorkload) {
                if (!result.workload) result.workload = questionData;
            } else {
                result.questions.push(questionData);
            }
        }

        if (!result.questions.length && !result.workload) return null;
        return result;
    }

    async function fetchCourseEvaluation(evalUrl) {
        if (!evalUrl || typeof evalUrl !== 'string') {
            return { ok: false, error: 'invalid_url' };
        }
        try {
            const parsed = new URL(evalUrl);
            if (parsed.protocol !== 'https:' || parsed.hostname !== 'evaluering.dtu.dk') {
                return { ok: false, error: 'invalid_host' };
            }
        } catch (e) {
            return { ok: false, error: 'invalid_url' };
        }

        try {
            const res = await fetch(evalUrl, { cache: 'no-store', credentials: 'omit' });
            if (!res || !res.ok) {
                return { ok: false, error: 'http', status: res ? res.status : 0 };
            }
            const html = await res.text();
            const data = parseEvaluationHtml(html);
            if (!data) {
                return { ok: false, error: 'parse_empty' };
            }
            data.sourceUrl = evalUrl;
            data.fetchedAt = Date.now();
            return { ok: true, data };
        } catch (e) {
            return { ok: false, error: 'fetch_error', message: String(e && e.message || e) };
        }
    }
    // The newest evaluation linked from a course's info page: the highest
    // evaluation id among the links to evaluering.dtu.dk/kursus/<code>/<id>.
    function latestEvaluationUrl(infoHtml, code) {
        const re = /evaluering\.dtu\.dk\/kursus\/([0-9A-Za-z]{5})\/(\d+)/g;
        let best = 0;
        let match;
        while ((match = re.exec(String(infoHtml || ''))) !== null) {
            if (match[1].toUpperCase() !== String(code).toUpperCase()) continue;
            best = Math.max(best, parseInt(match[2], 10) || 0);
        }
        return best ? 'https://evaluering.dtu.dk/kursus/' + code + '/' + best : null;
    }

    // The workload question of a course's latest evaluation, for the Study
    // Planner exam schedule. fetchInfoPage reads kurser.dtu.dk/course/<code>/info.
    // A course with no evaluation, or none with a workload answer, is { ok: true, none: true }.
    async function fetchCourseWorkload(code, fetchInfoPage) {
        const info = await fetchInfoPage(code + '/info');
        if (!info || !info.ok) return { ok: false, error: 'info_failed' };
        const url = latestEvaluationUrl(info.html, code);
        if (!url) return { ok: true, none: true };
        const evaluation = await fetchCourseEvaluation(url);
        if (!evaluation.ok) return evaluation.error === 'parse_empty' ? { ok: true, none: true } : { ok: false, error: evaluation.error };
        const workload = evaluation.data.workload;
        const average = workload ? Number(workload.average) : NaN;
        if (!workload || !(workload.totalResponses > 0) || !(average > 0)) return { ok: true, none: true };
        return { ok: true, average, responses: workload.totalResponses, url };
    }

    globalThis.DTUAfterDarkEvaluation = {
        parseEvaluationHtml,
        fetchCourseEvaluation,
        latestEvaluationUrl,
        fetchCourseWorkload
    };
})();
