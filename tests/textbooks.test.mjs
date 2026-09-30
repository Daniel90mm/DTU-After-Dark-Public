import assert from 'node:assert/strict';
import test from 'node:test';
import { extractFunctions, loadModuleInternals, plain } from './_harness.mjs';

// The ISBN checks live in darkmode.js and reach the textbooks module as deps.
const isbn = extractFunctions('darkmode.js', [
    'normalizeISBN',
    'isValidISBN13',
    'isValidISBN10',
    'isNotesOnlyLiterature'
]).api;

const { api } = loadModuleInternals('darkmode.textbooks.js', [
    'extractISBNFromCitationLine',
    'splitKurserLiteratureText',
    'parseKurserCitationLine',
    'buildKurserFinditUrl',
    'buildKurserGoogleBooksUrl',
    'isKurserLiteratureLabel',
    'isLikelyBookFinderTitleCandidate',
    'isTitleCase',
    'getKurserBarSectionData',
    'extractLiteratureLineTargets'
], { DTUAfterDarkTextbooksDeps: isbn });

test('ISBN-13 and ISBN-10 checksums', () => {
    assert.equal(isbn.isValidISBN13('9780262035613'), true);
    assert.equal(isbn.isValidISBN13('9780262035614'), false);
    assert.equal(isbn.isValidISBN13('978026203561'), false);
    assert.equal(isbn.isValidISBN10('0262033844'), true);
    assert.equal(isbn.isValidISBN10('080442957X'), true);
    assert.equal(isbn.isValidISBN10('0262033845'), false);
    assert.equal(isbn.isValidISBN10('X262033844'), false);
});

test('ISBN normalisation strips separators and uppercases the check digit', () => {
    assert.equal(isbn.normalizeISBN('978-0-262 03561-3'), '9780262035613');
    assert.equal(isbn.normalizeISBN('0-8044-2957-x'), '080442957X');
});

test('notes-only literature is recognised', () => {
    for (const text of ['', 'None', 'n/a', '-', 'Notes provided.', 'Lecture notes provided', 'Notes will be provided']) {
        assert.equal(isbn.isNotesOnlyLiterature(text), true, text);
    }
    assert.equal(isbn.isNotesOnlyLiterature('Bishop, Pattern Recognition'), false);
});

test('ISBNs are pulled from citation lines only when the checksum holds', () => {
    assert.equal(api.extractISBNFromCitationLine('Goodfellow, Deep Learning, ISBN: 978-0-262-03561-3'), '9780262035613');
    assert.equal(api.extractISBNFromCitationLine('Deep Learning 9780262035613 MIT Press'), '9780262035613');
    assert.equal(api.extractISBNFromCitationLine('ISBN 0-262-03384-4'), '0262033844');
    assert.equal(api.extractISBNFromCitationLine('ISBN 978-0-262-03561-4'), null);
    assert.equal(api.extractISBNFromCitationLine('No book here'), null);
});

test('literature text splits on lines, bracket numbers, numbering and semicolons', () => {
    assert.deepEqual(plain(api.splitKurserLiteratureText('[1] A, Book one [2] B, Book two')), ['[1] A, Book one', '[2] B, Book two']);
    assert.deepEqual(plain(api.splitKurserLiteratureText('1. Alpha, First 2. Beta, Second')), ['1. Alpha, First', '2. Beta, Second']);
    assert.deepEqual(plain(api.splitKurserLiteratureText('Alpha, First; Beta, Second')), ['Alpha, First', 'Beta, Second']);
    assert.deepEqual(plain(api.splitKurserLiteratureText('Only one book')), ['Only one book']);
    assert.deepEqual(plain(api.splitKurserLiteratureText('   ')), []);
});

test('a full citation parses into author, title and ISBN', () => {
    const c = plain(api.parseKurserCitationLine('[1] Bishop, Pattern Recognition and Machine Learning. Springer, 2006. ISBN 978-0-387-31073-2'));
    assert.equal(c.author, 'Bishop');
    assert.equal(c.title, 'Pattern Recognition and Machine Learning');
    assert.equal(c.isbn, '9780387310732');
});

test('noise lines, URLs and notes are not treated as books', () => {
    assert.equal(api.parseKurserCitationLine('Lecture notes provided'), null);
    assert.equal(api.parseKurserCitationLine('See https://example.com/notes for material'), null);
    assert.equal(api.parseKurserCitationLine('Research articles will be made accessible'), null);
    assert.equal(api.parseKurserCitationLine(''), null);
});

test('FindIt and Google Books links prefer ISBN, else strip page ranges', () => {
    assert.equal(api.buildKurserFinditUrl({ isbn: '9780387310732' }),
        'https://findit.dtu.dk/en/catalog?utf8=%E2%9C%93&type=book&q=isbn%3A9780387310732');
    assert.equal(api.buildKurserGoogleBooksUrl({ queryText: 'Bishop, Pattern Recognition, pp. 12-40' }),
        'https://books.google.com/books?q=' + encodeURIComponent('Bishop, Pattern Recognition'));
    assert.equal(api.buildKurserFinditUrl({ title: 'Title', author: 'Author' }),
        'https://findit.dtu.dk/en/catalog?utf8=%E2%9C%93&type=book&q=' + encodeURIComponent('Title - Author'));
    assert.equal(api.buildKurserFinditUrl({}), null);
    assert.equal(api.buildKurserFinditUrl(null), null);
});

test('literature section labels in English and Danish', () => {
    for (const label of ['Course literature', 'Litteratur:', 'Kursuslitteratur', 'Recommended course literature', 'Litteraturhenvisninger', 'Litteraturhenvisning:']) {
        assert.equal(api.isKurserLiteratureLabel(label), true, label);
    }
    for (const label of ['', 'Schedule', 'Body text: ' + 'this course covers literature reviews in depth across many fields '.repeat(3)]) {
        assert.equal(api.isKurserLiteratureLabel(label), false, label);
    }
});

test('Book Finder title candidates skip generic resource phrases', () => {
    assert.equal(api.isLikelyBookFinderTitleCandidate('Introduction to Algorithms'), true);
    assert.equal(api.isLikelyBookFinderTitleCandidate('Relevant articles and tools'), false);
    assert.equal(api.isLikelyBookFinderTitleCandidate('Materials from the internet'), false);
    assert.equal(api.isLikelyBookFinderTitleCandidate('Short'), false);
    assert.equal(api.isTitleCase('The Art of Computer Programming'), true);
    assert.equal(api.isTitleCase('the art of programming'), false);
});

test('disabling textbook links cancels queued Learn scans and removes existing bars',async()=>{
 const {extractFunctions}=await import('./_harness.mjs');let removed=0,cleared=0;
 const {api:ui}=loadModuleInternals('darkmode.textbooks.js',['insertBookFinderLinks'],{globals:{},document:{querySelectorAll:s=>s==='[data-book-finder-bar]'?[{remove:()=>removed++}]:s==='[data-book-finder-injected]'?[{removeAttribute:()=>cleared++}]:[]},DTUAfterDarkTextbooksDeps:{isTopWindow:()=>true,isDTULearnCoursePage:()=>true,isFeatureFlagEnabled:()=>false,featureTextbookLinksKey:'books'}});
 let cancelled=0;const {api:schedule}=extractFunctions('darkmode.js',['scheduleBookFinderScan'],{prelude:'let _bookFinderTimer=123;const IS_TOP_WINDOW=true,FEATURE_TEXTBOOK_LINKS_KEY="books";',globals:{isDTULearnCoursePage:()=>true,isFeatureFlagEnabled:()=>false,clearTimeout:()=>cancelled++,insertBookFinderLinks:ui.insertBookFinderLinks}});
 schedule.scheduleBookFinderScan();assert.equal(cancelled,1);assert.equal(removed,1);assert.equal(cleared,1);
});

const foxTitle = 'Mark Fox, Optical Properties of Solids, 2nd Edition (Oxford University Press, 2010)';
const foxIsbn = 'ISBN: 978-0-19-957337-0';
function barLines(lines) {
    const nodes = lines.map(text => ({ nodeType: 1, tagName: 'P', textContent: text, classList: { contains: () => false } }));
    nodes.push({ nodeType: 1, tagName: 'DIV', classList: { contains: c => c === 'bar' } });
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].nextSibling = nodes[i + 1];
    return plain(api.getKurserBarSectionData({ nextSibling: nodes[0] })).lines;
}

test('catalog title and following standalone ISBN form one book entry', () => {
    const lines = barLines([foxTitle, foxIsbn]);
    assert.deepEqual(lines, [foxTitle + ' ' + foxIsbn]);
    const parsed = api.parseKurserCitationLine(lines[0]);
    assert.equal(parsed.isbn, '9780199573370');
    assert.match(api.buildKurserFinditUrl(parsed), /isbn%3A9780199573370/);
    assert.match(api.buildKurserGoogleBooksUrl(parsed), /isbn%3A9780199573370/);
});

test('paragraph-based catalog literature also pairs its title and ISBN', () => {
    const title = { textContent: foxTitle }; const isbnLine = { textContent: foxIsbn };
    const items = api.extractLiteratureLineTargets({ querySelectorAll: () => [title, isbnLine] });
    assert.equal(items.length, 1); assert.equal(items[0].anchor, title);
    assert.equal(items[0].text, foxTitle + ' ' + foxIsbn);
});

test('distinct books and independent ISBN entries are preserved', () => {
    const second = 'Bishop, Pattern Recognition and Machine Learning. Springer, 2006.';
    const secondIsbn = 'ISBN 978-0-387-31073-2';
    assert.deepEqual(barLines([foxTitle, foxIsbn, second, secondIsbn]), [foxTitle + ' ' + foxIsbn, second + ' ' + secondIsbn]);
    assert.deepEqual(barLines([foxIsbn]), [foxIsbn]);
    assert.deepEqual(barLines([foxTitle + ' ' + foxIsbn, secondIsbn]), [foxTitle + ' ' + foxIsbn, secondIsbn]);
    assert.deepEqual(barLines([foxTitle, 'ISBN: 978-0-19-957337-1']), [foxTitle, 'ISBN: 978-0-19-957337-1']);
});
