#!/usr/bin/env node
// Turns the course literature texts and the works a model listed for them into literature-data.json,
// the file the kurser.dtu.dk book bar reads before it parses a page itself.
//
//   node scripts/build-literature-data.mjs CORPUS.json WORKS.json [OUT.json]
//
// CORPUS.json: [{code, sections: [{label, text}]}], the literature sections as the page shows them
//   (.dtu-dev/crawl-literature-corpus.mjs parse writes it from saved course pages).
// WORKS.json: [{code, key, works: [{title, surname, isbn}]}], one entry per course text a model read
//   (.dtu-dev/extract-literature-works.mjs). key is literatureTextKey of the text it read.
//
// Model output is never shipped as it is: a title must appear in the course's own text (at least 60% of
// its words), a surname and an ISBN must appear there too, or they are dropped. A course whose text has
// no works entry with the same key is left out, so the extension parses that page itself.
import fs from 'node:fs';
import vm from 'node:vm';

const [corpusPath, worksPath, output = new URL('../literature-data.json', import.meta.url).pathname] = process.argv.slice(2);
if (!corpusPath || !worksPath) {
    console.error('usage: build-literature-data.mjs CORPUS.json WORKS.json [OUT.json]');
    process.exit(2);
}

const sandbox = { globalThis: null };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const file of ['darkmode.dom.js', 'darkmode.textbooks.core.js']) {
    vm.runInContext(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'), sandbox);
}
const { literatureTextKey } = sandbox.DTUAfterDarkTextbooksCore;

const words = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const squash = (s) => words(s).join('');

const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));
const works = new Map(JSON.parse(fs.readFileSync(worksPath, 'utf8')).map((w) => [w.code + ' ' + w.key, w]));
const courses = {};
const missing = [];
const dropped = [];
let books = 0;
for (const c of corpus) {
    if (!/^[0-9]{2}[0-9A-Z]{3}$/.test(c.code)) throw new Error('corpus has a malformed course code: ' + c.code);
    const sections = c.sections || [];
    if (!sections.length) continue;
    // The bar keys each section on its own; one entry per course holds only one.
    if (sections.length > 1) { missing.push(c.code + ' (' + sections.length + ' sections)'); continue; }
    const text = sections[0].text;
    const key = literatureTextKey(text);
    const entry = works.get(c.code + ' ' + key);
    if (!entry) { missing.push(c.code); continue; }
    const textWords = new Set(words(text));
    const textSquash = squash(text);
    const seen = new Set();
    const b = [];
    for (const w of entry.works || []) {
        const title = String(w.title || '').replace(/\s+/g, ' ').trim();
        const long = words(title).filter((x) => x.length > 2);
        const cover = long.length ? long.filter((x) => textWords.has(x)).length / long.length : 0;
        if (!title || (!textSquash.includes(squash(title)) && cover < 0.6)) { dropped.push(c.code + ' title: ' + title); continue; }
        if (seen.has(title.toLowerCase())) continue;
        seen.add(title.toLowerCase());
        let surname = String(w.surname || '').trim();
        if (surname && !textSquash.includes(squash(surname))) { dropped.push(c.code + ' surname: ' + surname); surname = ''; }
        let isbn = String(w.isbn || '').replace(/[^0-9Xx]/g, '').toUpperCase();
        if (isbn && !(isbn.length === 10 || isbn.length === 13) || isbn && !textSquash.includes(isbn.toLowerCase())) { if (isbn) dropped.push(c.code + ' isbn: ' + isbn); isbn = ''; }
        // FindIt finds a book by its main title better than with the subtitle.
        // Two volumes with one main title keep their subtitles, so each finds its own book.
        b.push({ title, surname, isbn, main: title.split(/:\s|\s[-\u{2013}]\s/u)[0] });
    }
    const mains = b.map((w) => w.main.toLowerCase());
    const rows = b.map((w, i) => {
        const full = (w.title + (w.surname ? ' ' + w.surname : '')).trim();
        const query = mains.indexOf(mains[i]) === mains.lastIndexOf(mains[i]) ? (w.main + (w.surname ? ' ' + w.surname : '')).trim() : full;
        return query === full ? [w.title, w.surname, w.isbn] : [w.title, w.surname, w.isbn, query];
    });
    courses[c.code] = { k: key, b: rows };
    books += rows.length;
}

const sorted = Object.fromEntries(Object.entries(courses).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(output, JSON.stringify({ built: new Date().toISOString().slice(0, 10), courses: sorted }) + '\n');
console.log('courses ' + Object.keys(sorted).length + ', books ' + books + ', left to the page parser ' + missing.length + ', dropped ' + dropped.length);
if (missing.length) console.log('no works entry for this text (run extract-literature-works.mjs): ' + missing.join(' '));
dropped.forEach((d) => console.log('dropped ' + d));
