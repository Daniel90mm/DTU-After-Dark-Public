#!/usr/bin/env node
// Turns the output of crawl-course-prerequisites.mjs into course-map-data.json,
// the small file the Course map reads. Parsing uses the same code as the
// extension (darkmode.kurser-course-map.js), so both read prerequisites alike.
//
//   node scripts/build-course-map-data.mjs course-crawl.json [course-map-data.json]
import fs from 'node:fs';
import vm from 'node:vm';

const [input, output = new URL('../course-map-data.json', import.meta.url).pathname] = process.argv.slice(2);
if (!input) {
    console.error('usage: build-course-map-data.mjs CRAWL.json [OUT.json]');
    process.exit(2);
}

const sandbox = { globalThis: null };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const file of ['darkmode.dom.js', 'darkmode.kurser-course-map.js']) {
    vm.runInContext(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'), sandbox);
}
const { entryFromFields } = sandbox.DTUAfterDarkCourseMap;

const crawl = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!crawl.finishedAt) throw new Error('crawl did not finish; rerun crawl-course-prerequisites.mjs to complete it');
const older = crawl.older || {};
// A partial crawl entry would write a course with no name or silently no
// prerequisites; a lowercase code could never be looked up. Refuse both.
for (const [code, c] of [...Object.entries(crawl.courses), ...Object.entries(older)]) {
    if (!/^[0-9]{2}[0-9A-Z]{3}$/.test(code)) throw new Error(`crawl has a malformed course code: ${code}`);
    if (!c || typeof c.name !== 'string' || !c.name.trim() || !('academic' in c) || !('mandatory' in c)) {
        throw new Error(`crawl entry ${code} lacks name, academic or mandatory; rerun the crawl`);
    }
}
const known = new Set(Object.keys(crawl.courses));
const isKnown = (code) => known.has(code) || Boolean(older[code]);

const courses = {};
const stats = { courses: 0, withGroups: 0 };
for (const code of [...known].sort()) {
    const c = crawl.courses[code];
    const entry = { n: c.name, ...entryFromFields(c.academic, c.mandatory, isKnown) };
    // Keep prerequisite numbers that are not in this year's catalogue: they
    // still tell the student which course to look for.
    stats.courses++;
    if (entry.g || entry.r) stats.withGroups++;
    courses[code] = entry;
}
// Courses a current course lists that are no longer in the catalogue, read
// from the newest older catalogue year that has them. `y` marks them, so the
// map never draws them as courses that build on a current one.
for (const code of Object.keys(older).sort()) {
    if (courses[code]) continue;
    const c = older[code];
    courses[code] = { n: c.name, y: c.volume.replace('-', '/'), ...entryFromFields(c.academic, c.mandatory, isKnown) };
    stats.older = (stats.older || 0) + 1;
}

const data = {
    v: 1,
    source: 'https://kurser.dtu.dk/sitemap.xml',
    generatedAt: crawl.finishedAt,
    ...(crawl.olderFrom ? { olderFrom: crawl.olderFrom.replace('-', '/') } : {}),
    courses
};
fs.writeFileSync(output, `${JSON.stringify(data)}\n`);
console.log(JSON.stringify(stats), `${(fs.statSync(output).size / 1024).toFixed(0)} KB`, output);
