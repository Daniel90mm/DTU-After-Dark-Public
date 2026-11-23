#!/usr/bin/env node
// Reads DTU's public exam statistics (karakterer.dtu.dk) for every course in the
// current catalogue and writes exam-stats-data.json. Run about once per semester,
// after the course map crawl (it reads the course numbers from course-map-data.json).
// Deliberately slow: each worker reads one page every 1.5 s (at most 4 workers,
// about 2.7 pages a second, roughly 2.5 hours for the catalogue), and it backs off on errors.
//
//   node scripts/crawl-exam-stats.mjs [--out exam-stats-data.json] [--since 2021] [--delay 1500] [--workers 4] [--codes 02110,01017] [--limit N]
//
// Per course: it tries the newest terms until one page answers, reads the page's
// "Andre versioner" list of terms that have data, and fetches those from --since on.
// Courses with no exam in the newest DISCOVERY_TERMS terms are listed in `missing`.
// The output is resumable: rerunning with the same --out skips courses already saved.
//
// Output: { v, source, generatedAt, since, courses: { CODE: { "W25": [signedUp, attended, passed, average] } }, missing }
// passed and average are null when DTU does not publish them (3 or fewer sat the
// exam; average is also null for pass/fail courses).
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = 'https://karakterer.dtu.dk';
const USER_AGENT = 'Mozilla/5.0 (compatible; DTU-After-Dark-exam-stats/1.0; +https://github.com/Daniel90mm/DTU-After-Dark-Public)';
const DISCOVERY_TERMS = 4;
const BACKOFF_MS = [30000, 60000, 120000];
const MAX_FAILED_IN_ROW = 5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function pageText(html) {
    return String(html)
        .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/\s+/g, ' ')
        .trim();
}

// Returns [signedUp, attended, passed, average] or null when the page has no exam data.
export function readExamPage(html, code) {
    const text = pageText(html);
    const head = new RegExp(code + ' .+?, (?:Vinter|Sommer|Winter|Summer) \\d{4} Antal tilmeldte (\\d+) Fremmødte (\\d+)').exec(text);
    if (!head) return null;
    const passed = /Antal bestået (\d+)/.exec(text);
    const average = /Eksamensgennemsnit (\d+(?:,\d+)?)/.exec(text);
    return [
        Number(head[1]),
        Number(head[2]),
        passed ? Number(passed[1]) : null,
        average ? Number(average[1].replace(',', '.')) : null
    ];
}

// Terms the page lists under "Andre versioner", as "Winter-2025" style keys.
export function listedTerms(html, code) {
    const re = new RegExp('Histogram/1/' + code + '/((?:Winter|Summer)-\\d{4})', 'g');
    return [...new Set([...String(html).matchAll(re)].map((m) => m[1]))];
}

export function shortTerm(term) {
    return term.charAt(0) + term.slice(-2);
}

// Newest first. A year's winter exam is in December, after its summer exam (May
// to August), so the order is Winter-Y, Summer-Y, Winter-(Y-1), ... down to Summer-since.
// Terms not yet held this year are left out.
export function termsSince(since, now = new Date()) {
    const terms = [];
    const year = now.getFullYear();
    for (let y = year; y >= since; y--) {
        if (y < year || now.getMonth() >= 11) terms.push('Winter-' + y);
        if (y < year || now.getMonth() >= 4) terms.push('Summer-' + y);
    }
    return terms;
}

function parseArgs(argv) {
    const args = { out: 'exam-stats-data.json', since: 2021, delay: 1500, workers: 1, codes: null, limit: Infinity };
    for (let i = 0; i < argv.length; i++) {
        const k = argv[i];
        const v = argv[i + 1];
        if (k === '--out') { args.out = v; i++; }
        else if (k === '--since') { args.since = Number(v); i++; }
        else if (k === '--delay') { args.delay = Number(v); i++; }
        else if (k === '--workers') { args.workers = Math.max(1, Math.min(4, Number(v))); i++; }
        else if (k === '--codes') { args.codes = v.split(','); i++; }
        else if (k === '--limit') { args.limit = Number(v); i++; }
        else throw new Error('Unknown argument ' + k);
    }
    return args;
}

let failedInRow = 0;

// Returns the page HTML, or null for a page that does not exist. Throws after
// MAX_FAILED_IN_ROW failed requests in a row, so a blocked or down site stops the run.
async function get(url, delay) {
    for (let attempt = 0; ; attempt++) {
        await sleep(delay);
        try {
            const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
            if (res.status === 404) { failedInRow = 0; return null; }
            if (res.ok) {
                failedInRow = 0;
                return await res.text();
            }
            throw new Error('HTTP ' + res.status);
        } catch (err) {
            failedInRow++;
            if (failedInRow >= MAX_FAILED_IN_ROW) throw new Error('Stopping: ' + failedInRow + ' failed requests in a row, last ' + url + ': ' + err.message);
            if (attempt >= BACKOFF_MS.length) {
                console.error('giving up on ' + url + ': ' + err.message);
                return null;
            }
            console.error('retry in ' + BACKOFF_MS[attempt] / 1000 + ' s: ' + url + ': ' + err.message);
            await sleep(BACKOFF_MS[attempt]);
        }
    }
}

async function crawlCourse(code, since, delay) {
    const wanted = termsSince(since);
    const terms = {};
    let listed = null;
    for (const term of wanted.slice(0, DISCOVERY_TERMS)) {
        const html = await get(`${BASE}/Histogram/1/${code}/${term}`, delay);
        const row = html && readExamPage(html, code);
        if (!row) continue;
        terms[shortTerm(term)] = row;
        listed = listedTerms(html, code);
        break;
    }
    if (!listed) return null;
    for (const term of wanted) {
        if (terms[shortTerm(term)] || !listed.includes(term)) continue;
        const html = await get(`${BASE}/Histogram/1/${code}/${term}`, delay);
        const row = html && readExamPage(html, code);
        if (row) terms[shortTerm(term)] = row;
    }
    return terms;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const codes = args.codes || Object.entries(JSON.parse(fs.readFileSync('course-map-data.json', 'utf8')).courses)
        .filter(([, c]) => !c.y)
        .map(([code]) => code)
        .sort();
    const out = fs.existsSync(args.out)
        ? JSON.parse(fs.readFileSync(args.out, 'utf8'))
        : { v: 1, source: BASE, generatedAt: null, since: args.since, courses: {}, missing: [] };
    if (out.since !== args.since) throw new Error(args.out + ' was crawled with --since ' + out.since + '; use another --out');
    const todo = codes.filter((c) => !out.courses[c] && !out.missing.includes(c)).slice(0, args.limit);
    console.error(todo.length + ' courses to read, ' + (codes.length - todo.length) + ' already saved');
    // Each worker takes the next course from the shared queue and waits --delay
    // between its own requests, so the site sees about workers / delay requests a second.
    let n = 0;
    const queue = todo.slice();
    async function worker() {
        while (queue.length) {
            const code = queue.shift();
            const terms = await crawlCourse(code, args.since, args.delay);
            if (terms) out.courses[code] = terms;
            else out.missing.push(code);
            out.generatedAt = new Date().toISOString();
            fs.writeFileSync(args.out + '.tmp', JSON.stringify(out));
            fs.renameSync(args.out + '.tmp', args.out);
            n++;
            if (n % 25 === 0 || n === todo.length) console.error(n + '/' + todo.length + ' ' + code + ' ' + (terms ? Object.keys(terms).length + ' terms' : 'no exam'));
        }
    }
    await Promise.all(Array.from({ length: args.workers }, worker));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
