#!/usr/bin/env node
// Reads every course page listed in the kurser.dtu.dk sitemap once and saves its
// name and prerequisite fields. Run about once per semester; it is deliberately
// slow (one page every 1.5 s by default, roughly 45 minutes for the catalogue).
//
//   node scripts/crawl-course-prerequisites.mjs --out course-crawl.json [--delay 1500] [--limit N] [--codes 02110,02105]
//
// The output is resumable: rerunning with the same --out skips courses already
// saved. Feed it to scripts/build-course-map-data.mjs to produce the bundled file.
//
// After the sitemap pass, an older-years pass looks up every course number a
// saved course lists that is not in this year's catalogue, newest catalogue
// year first (kurser.dtu.dk/course/2025-2026/CODE and back to 2016-2017, the
// oldest year with today's page layout), and repeats for the numbers those
// older courses list, up to OLDER_ROUNDS times. Results go to `older` (with the
// year found) and `olderMissing`. --skip-older leaves this pass out.
//
// Last, for each number still in `olderMissing`, the year-list page
// kurser.dtu.dk/course/CODE names the (pre-2016) years the number was listed;
// the newest of those pages gives its name (the old layout has no prerequisite
// rows). Found ones move to `older`, and `olderFrom` becomes the earliest year
// any list showed, so "not in any catalogue since" stays true.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const OLDEST_START_YEAR = 2016;
const OLDER_ROUNDS = 3;
let DELAY_MS = 1500;

const BASE = 'https://kurser.dtu.dk';
const USER_AGENT = 'Mozilla/5.0 (compatible; DTU-After-Dark-course-map/1.0; +https://github.com/Daniel90mm/DTU-After-Dark-Public)';
const cookies = new Map([['{DTUCoursesPublicLanguage}', 'en-GB']]);

function rememberCookies(res) {
    for (const line of res.headers.getSetCookie?.() || []) {
        const [pair] = line.split(';');
        const eq = pair.indexOf('=');
        if (eq > 0) cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
}

async function get(url) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': USER_AGENT,
            Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ')
        },
        redirect: 'follow'
    });
    rememberCookies(res);
    return { status: res.status, text: await res.text() };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decode(s) {
    return s
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/­/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Returns { label: { text, links } } for every two-column info row on a course page.
function readInfoRows(html) {
    const rows = {};
    const re = /<label>([\s\S]*?)<\/label>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
    let m;
    while ((m = re.exec(html))) {
        const label = decode(m[1]).toLowerCase();
        const links = [...m[2].matchAll(/\/course\/([0-9]{2}[0-9A-Z]{3})\b/gi)].map((x) => x[1].toUpperCase());
        rows[label] = { text: decode(m[2]), links };
    }
    return rows;
}

export function readCourse(code, html) {
    const h2 = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    if (!h2) return null;
    const heading = decode(h2[1]);
    // "103701 ..." is another course than 10370.
    if (!heading.startsWith(code) || /[0-9A-Za-z]/.test(heading.charAt(code.length))) return null;
    const rows = readInfoRows(html);
    const pick = (re) => Object.entries(rows).find(([label]) => re.test(label))?.[1] || null;
    return {
        name: heading.slice(code.length).trim(),
        nameDa: pick(/^danish title/)?.text || '',
        // "Academic prerequisites" since 2025; "Recommended (Academic)
        // prerequisites" in earlier catalogue years.
        academic: pick(/^(?:(?:academic|recommended(?: academic)?) prerequisites|(?:anbefalede )?faglige forudsætninger)/),
        mandatory: pick(/^(?:mandatory prerequisites|obligatoriske forudsætninger)/)
    };
}

// First year of the catalogue in force on `iso`: DTU's year starts in autumn.
export function catalogueStartYear(iso) {
    const d = new Date(iso);
    return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}

// Catalogue years before the one starting in `currentStart`, newest first.
export function olderVolumes(currentStart) {
    const out = [];
    for (let y = currentStart - 1; y >= OLDEST_START_YEAR; y--) out.push(`${y}-${y + 1}`);
    return out;
}

// Course numbers that the given courses list (as links or in the text) and
// that are neither among them nor in `skip`.
export function unknownReferencedCodes(courses, skip = []) {
    const seen = new Set(skip);
    const found = new Set();
    for (const c of Object.values(courses)) {
        for (const field of [c.academic, c.mandatory]) {
            if (!field) continue;
            const codes = [...field.links, ...(field.text.match(/\b[0-9]{2}[0-9A-Z]{3}\b/gi) || [])];
            for (const code of codes.map((x) => x.toUpperCase())) {
                if (!courses[code] && !seen.has(code)) found.add(code);
            }
        }
    }
    return [...found].sort();
}

// Catalogue years ("2006-2007") that a course's year-list page links for
// `code`, newest first.
export function listedVolumes(html, code) {
    const re = new RegExp(`/course/([0-9]{4}-[0-9]{4})/${code}\\b`, 'gi');
    return [...new Set([...html.matchAll(re)].map((m) => m[1]))].sort().reverse();
}

async function fetchCourse(code, volume) {
    for (let attempt = 0; attempt < 3; attempt++) {
        const { status, text } = await get(`${BASE}/course/${volume ? volume + '/' : ''}${code}`);
        if (status === 200 && text.length > 2000) return text;
        await sleep(DELAY_MS * (attempt + 1));
    }
    return null;
}

async function crawlSitemap(out, LIMIT, only) {
    const sitemap = await get(`${BASE}/sitemap.xml`);
    const codes = [...new Set([...sitemap.text.matchAll(/\/course\/([0-9]{2}[0-9A-Z]{3})</gi)].map((m) => m[1].toUpperCase()))];
    if (codes.length < 500) throw new Error(`sitemap lists only ${codes.length} courses; refusing to continue`);
    const todo = (only || codes).filter((c) => !out.courses[c] && !out.missing.includes(c)).slice(0, LIMIT);
    console.log(`${codes.length} courses in sitemap, ${todo.length} to fetch, ${DELAY_MS} ms apart`);
    let done = 0;
    for (const code of todo) {
        const html = await fetchCourse(code);
        const course = html ? readCourse(code, html) : null;
        if (course) out.courses[code] = course;
        else out.missing.push(code);
        done++;
        if (done % 50 === 0 || done === todo.length) {
            out.updatedAt = new Date().toISOString();
            save(out);
            console.log(`${done}/${todo.length} (${Object.keys(out.courses).length} saved, ${out.missing.length} missing)`);
        }
        await sleep(DELAY_MS);
    }
    out.finishedAt = new Date().toISOString();
    out.sitemapCount = codes.length;
    save(out);
    console.log(`done: ${Object.keys(out.courses).length} courses, ${out.missing.length} missing`);
}

async function crawlOlderYears(out) {
    out.older = out.older || {};
    out.olderMissing = out.olderMissing || [];
    const volumes = olderVolumes(catalogueStartYear(out.startedAt));
    for (let round = 0; round < OLDER_ROUNDS; round++) {
        const todo = unknownReferencedCodes({ ...out.courses, ...out.older }, out.olderMissing);
        if (!todo.length) break;
        console.log(`older years, round ${round + 1}: ${todo.length} course numbers, trying ${volumes[0]} back to ${volumes[volumes.length - 1]}`);
        let done = 0;
        for (const code of todo) {
            let course = null;
            for (const volume of volumes) {
                const html = await fetchCourse(code, volume);
                course = html ? readCourse(code, html) : null;
                await sleep(DELAY_MS);
                if (course) { out.older[code] = { ...course, volume }; break; }
            }
            if (!course) out.olderMissing.push(code);
            done++;
            if (done % 25 === 0 || done === todo.length) {
                save(out);
                console.log(`${done}/${todo.length} (${Object.keys(out.older).length} found, ${out.olderMissing.length} not found)`);
            }
        }
    }
    out.olderFinishedAt = new Date().toISOString();
    out.olderFrom = `${OLDEST_START_YEAR}-${OLDEST_START_YEAR + 1}`;
    save(out);
}

async function crawlYearLists(out) {
    const todo = [...out.olderMissing];
    console.log(`year lists: ${todo.length} course numbers not found since ${out.olderFrom}`);
    let earliest = out.olderFrom;
    for (const code of todo) {
        const list = await fetchCourse(code);
        await sleep(DELAY_MS);
        const volumes = list ? listedVolumes(list, code) : [];
        if (volumes.length && volumes[volumes.length - 1] < earliest) earliest = volumes[volumes.length - 1];
        if (!volumes.length) continue;
        const html = await fetchCourse(code, volumes[0]);
        await sleep(DELAY_MS);
        const course = html ? readCourse(code, html) : null;
        if (!course) continue;
        out.older[code] = { ...course, volume: volumes[0] };
        out.olderMissing = out.olderMissing.filter((c) => c !== code);
    }
    out.olderFrom = earliest;
    out.yearListsFinishedAt = new Date().toISOString();
    save(out);
    console.log(`year lists done: ${Object.keys(out.older).length} older courses, ${out.olderMissing.length} not found since ${out.olderFrom}`);
}

let OUT_PATH = null;
function save(out) { fs.writeFileSync(OUT_PATH, JSON.stringify(out)); }

async function main() {
    const args = Object.fromEntries(process.argv.slice(2).reduce((acc, arg, i, all) => {
        if (arg.startsWith('--')) acc.push([arg.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
        return acc;
    }, []));
    OUT_PATH = args.out;
    DELAY_MS = Number(args.delay || 1500);
    if (!OUT_PATH) {
        console.error('usage: crawl-course-prerequisites.mjs --out FILE [--delay MS] [--limit N] [--codes A,B] [--skip-older]');
        process.exit(2);
    }
    const saved = fs.existsSync(OUT_PATH) ? JSON.parse(fs.readFileSync(OUT_PATH, 'utf8')) : null;
    const out = saved || { source: `${BASE}/sitemap.xml`, startedAt: new Date().toISOString(), courses: {}, missing: [] };
    const only = typeof args.codes === 'string' ? args.codes.toUpperCase().split(',') : null;
    if (!out.finishedAt || only) await crawlSitemap(out, args.limit ? Number(args.limit) : Infinity, only);
    if (!args['skip-older'] && !out.olderFinishedAt) await crawlOlderYears(out);
    if (!args['skip-older'] && !out.yearListsFinishedAt) await crawlYearLists(out);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
