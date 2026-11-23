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

const textbookFiles = ['darkmode.textbooks.core.js', 'darkmode.textbooks.kurser.js', 'darkmode.textbooks.js'];

const { api } = loadModuleInternals(textbookFiles, [
    'extractISBNFromCitationLine',
    'splitKurserLiteratureText',
    'parseKurserCitationLine',
    'buildKurserFinditUrl',
    'buildKurserGoogleBooksUrl',
    'isKurserLiteratureLabel',
    'isLikelyBookFinderTitleCandidate',
    'isTitleCase',
    'getKurserBarSectionData',
    'extractLiteratureLineTargets',
    'literatureTextKey',
    'findKnownLiterature'
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
    assert.deepEqual(plain(api.splitKurserLiteratureText('Bishop, Pattern Recognition and Machine Learning; Murphy, Probabilistic Machine Learning')),
        ['Bishop, Pattern Recognition and Machine Learning', 'Murphy, Probabilistic Machine Learning']);
    // Semicolons between editors are not book boundaries.
    assert.deepEqual(plain(api.splitKurserLiteratureText('Hygiene in Food Processing. Edited by: Lelieveld, H.L.M.; Holah, J.; Napper, D.')).length, 1);
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
 const {api:ui}=loadModuleInternals(textbookFiles,['insertBookFinderLinks'],{globals:{},document:{querySelectorAll:s=>s==='[data-book-finder-bar]'?[{remove:()=>removed++}]:s==='[data-book-finder-injected]'?[{removeAttribute:()=>cleared++}]:[]},DTUAfterDarkTextbooksDeps:{isTopWindow:()=>true,isDTULearnCoursePage:()=>true,isFeatureFlagEnabled:()=>false,featureTextbookLinksKey:'books'}});
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

// Real kurser.dtu.dk literature lines (corpus audit 2026-11-19). The search must be a plain book
// lookup: main title plus the first author's surname, never the sentence around it.
const realLines = [
    ['For waveguide components, we will use part of Principles of Photonic Integrated Circuits : Materials, Device Physics, Guided Wave Design, by Richard Osgood Jr. and Xiang Meng (2021) (available electronically from the DTU library). Scientific papers will be used to illustrate state of the art for the different integration platforms.', 'Principles of Photonic Integrated Circuits Osgood'],
    ['Theoretical Microfluidics by Henrik Bruus, Oxford University Press (Oxford 2008) and lecture notes', 'Theoretical Microfluidics Bruus'],
    ['Erik Bruun: CMOS Analog IC Design: Fundamentals. Available for free at https://bookboon.com/dk/cmos', 'CMOS Analog IC Design: Fundamentals Bruun'],
    ['James F. Kurose &amp; Keith W. Ross: Computer Networking, A Top-Down Approach Featuring the Internet', 'Computer Networking Kurose'],
    ['Basic Theory: Computer Vision, Richard Szeliski, 2nd Edition, 2022', 'Computer Vision Szeliski'],
    ['Text book: MP Nielsen &amp; LC Hoang, Limit Analysis and Concrete Plasticity, 3rd Ed. CRC-Press, 2011. List of litterature will be placed on the CampusNet.', 'Limit Analysis and Concrete Plasticity Nielsen'],
    ['Strategic Investment and Finance, Ove Hedegaard og Michael Hedegaard, Djøf Forlag, latest edition (or equivalent)', 'Strategic Investment and Finance Hedegaard'],
    ['The teaching will largely follow "R for Data Science (2e)" by Hadley Wickham, Mine Çetinkaya-Rundel, and Garrett Grolemund', 'R for Data Science Wickham'],
    ['- R. C. Hibbeler: Dynamics, SI Edition.', 'Dynamics Hibbeler'],
    ['Differential geometry for generative modeling. Søren Hauberg.', 'Differential geometry for generative modeling Hauberg'],
    ['K. Rottwitt, P Tidemand-Lichtenberg, ”Nonlinear Optics. Principles and Applications, CRC Press', 'Nonlinear Optics Rottwitt'],
    // "Surname, Initials" and "Surname Initials": the surname, never a lone initial (full check 2026-11-19).
    ['Singh, R.P & D.R. Heldman: Introduction to Food Engineering,', 'Introduction to Food Engineering Singh'],
    ['Bishop, C.M., 2006. Pattern recognition and machine learning. Springer.', 'Pattern recognition and machine learning Bishop'],
    ['Johnsson, J.E: Indføring i Procesteknik (Polyteknisk Boghandel)', 'Indføring i Procesteknik Johnsson'],
    ['Schnoor, J.L., Environmental Modeling, Fate and Transport of Pollutants in Air, Water and Soil, 1996. John Wiley & Sons.', 'Environmental Modeling Schnoor'],
    ['Tchobanoglous, G., H. D. Stensel, R. Tsuchihashi and F. L. Burton,. 2014. Wastewater Engineering: Treatment and Resource Recovery', 'Wastewater Engineering Tchobanoglous'],
    ['Cachon G, Terwiesch C: Matching Supply with Demand, McGraw-Hill.', 'Matching Supply with Demand Cachon'],
    ['Buchmann K et al. (2009). Fish Diseases - An Introduction. 1st edition, Biofolia, Frederiksberg.', 'Fish Diseases Buchmann'],
    ['Book2: Larsen, Torben E.; "Elementær kredsløbsteknik", Ingeniøren-bøger, 2002.', 'Elementær kredsløbsteknik Larsen'],
    ['1. Trapp, S. & Matthies, M., Chemodynamics and Environmental Modeling. Springer-Verlag, 1998. The book is handed out during the course for free.', 'Chemodynamics and Environmental Modeling Trapp'],
    ['Handbook of Energy Economics and Policy - Fundamentals and Applications for Engineers and Energy Planners (2021). Edited by Alessandro Rubino Alessandro Sapio Massimo La Scala. Academic Press, Elsevier.', 'Handbook of Energy Economics and Policy Rubino'],
    ['P. Dalmaris, KiCad Like A Pro - Fundamentals and Projects, Elektor.', 'KiCad Like A Pro Dalmaris'],
    ["Selected chapters from 'Modern X-ray Physics' by Des McMorrow and J. A. Nielsen.", 'Modern X-ray Physics McMorrow'],
    ['Wilson, S.A., Perumal, A., 2009. Waging War on Complexity Costs, 1st ed. McGraw-Hill, Europe.', 'Waging War on Complexity Costs Wilson'],
    // Publisher, name or edition words must not win over a lowercase title (full check 2026-11-19, problem 2).
    ["B.M. Das, Principles of foundation engineering, 7th Edition, Cengage Learning", "Principles of foundation engineering Das"],
    ["Michael Crawley. (2015) Statistics An introduction using R. 2nd edition, Wiley, The book is supplementary.", "Statistics An introduction using R Crawley"],
    ["Peter Atkins | Julio de Paula | James Keeler: Atkins' Physical Chemistry, 12th ed., Oxford.", "Atkins' Physical Chemistry"],
    ["Parts of \"Stanbury, Whitaker and Hall: Principles of Fermentation Technology, Elsevier, 2017\" and additional material provided by the teachers", "Principles of Fermentation Technology Stanbury"],
    ["plus selected topics from G. A. Reider, Photonics - An Introduction (Springer, 2016).", "Photonics Reider"],
    ["E. Hecht, Optics, 5th edition (Global Edition), (Pearson, 2017).", "Optics Hecht"],
    ["Own lecture notes, distributed during the course, and some excerpts from Stefan Maier: Plasmonics - fundamentals and applications, available through DTU library", "Plasmonics Maier"],
    ["William Lowrie, Fundamentals of Geophysics 3rd edition, Cambridge University Press.", "Fundamentals of Geophysics Lowrie"],
    ["J.J Jensen 2001, Load and Global Response of Ships, Elsevier Science.", "Load and Global Response of Ships Jensen"],
    ["Newland, David Edward. An introduction to random vibrations, spectral & wavelet analysis. Courier Corporation, 2012.", "An introduction to random vibrations Newland"],
    ["Brincker, Rune, and Carlos Ventura. Introduction to operational modal analysis. John Wiley & Sons, 2015.", "Introduction to operational modal analysis Brincker"],
    ["2. .C. K. Alexander and M. N. O. Sadiku, Fundamnetals of Electric Circuits,", "Fundamnetals of Electric Circuits Alexander"],
    ["Sadler, P. (Ed.). (2001). Management consultancy: A handbook for best practice. Kogan Page Publishers.", "Management consultancy Sadler"],
    ["Berman, K., Knight, J., & Case, J. (2008). Financial intelligence for entrepreneurs: What you really need to know about the numbers. Harvard Business Press.", "Financial intelligence for entrepreneurs Berman"],
    ['"Delft Design Guide" by Annemiek van Boeijen, Jaap Daalhuizen, Jelle Zijlstra, Roos van der Schoor. BIS Publishers', 'Delft Design Guide Boeijen'],
];

test('real literature lines search as title plus first author surname', () => {
    for (const [line, query] of realLines) {
        const parsed = api.parseKurserCitationLine(line);
        assert.ok(parsed, line);
        assert.equal(parsed.queryText, query, line);
        assert.match(api.buildKurserFinditUrl(parsed), new RegExp('q=' + encodeURIComponent(query).replace(/[()]/g, '\\$&') + '$'));
    }
});

test('generic material and editor fragments are not listed as books', () => {
    for (const line of ['Compendia, scientific papers and hand-outs', 'Holah, J.', '1. Open source book:', 'Basic literature in sustainability']) {
        assert.equal(api.parseKurserCitationLine(line), null, line);
    }
});

test('author lines join the title line above them', () => {
    const lines = barLines(['Product Customization', 'Lars Hvam, Niels Henrik Mortensen, Jesper Riis.', 'Springer 2008, 277 sider']);
    assert.equal(lines[0], 'Product Customization. Lars Hvam, Niels Henrik Mortensen, Jesper Riis. Springer 2008, 277 sider');
    const parsed = api.parseKurserCitationLine(lines[0]);
    assert.equal(parsed.queryText, 'Product Customization Hvam');
    assert.equal(parsed.display, 'Product Customization, Hvam');
    assert.equal(api.parseKurserCitationLine('Springer 2008, 277 sider'), null);
});

test('wrapped journal-article lists are joined per reference and skipped', () => {
    const lines = [
        'Research articles in innovation studies. The below are not an',
        'exhaustive list.',
        'Sharma (1999). Central Dilemmas of Managing Innovation in Large',
        'Firms. California Management Review',
        'Collis, D. J., &amp; Montgomery, C. A. (2008). Competing on',
        'resources. Harvard Business Review',
        'Barney, J. (1991). Firm resources and sustained competitive',
        'advantage. Journal of Management',
        'Stern, D. I. (2004). ‘The rise and fall of the environmental',
        'Kuznets curve’ World Development, Vol. 32, pp. 1419-1439',
    ];
    const merged = barLines(lines);
    assert.equal(merged.length, 6);
    assert.ok(merged.every((line) => api.parseKurserCitationLine(line) === null), JSON.stringify(merged));
});

test('author-year book references keep their books and authors', () => {
    const lines = [
        'Holtz, Kovacs, and Sheahan (2010), “An Introduction to Geotechnical',
        'Engineering,” 2nd Edition, Prentice Hall, USA.',
        'Lakes (1998), “Viscoelastic Solids,” CRC Press, Boca Raton,',
        'Florida.',
        'Poulos and Davis (1973), “Elastic Solutions for Soil and Rock',
        'Mechanics,”',
    ];
    const queries = barLines(lines).map((line) => api.parseKurserCitationLine(line)).map((p) => p && p.queryText);
    assert.deepEqual(queries, ['An Introduction to Geotechnical Engineering Holtz', 'Viscoelastic Solids Lakes', 'Elastic Solutions for Soil and Rock Mechanics Poulos']);
});

test('publisher and author lines join the book they belong to', () => {
    const cases = [
        [['Mining of Massive Datasets;', 'Jure Leskovec, Anand Rajaraman, Jeffrey David Ullman;', 'Cambridge University Press, 2020; 3rd. edt.; isbn: 9781108476348.'], 'Mining of Massive Datasets, Leskovec'],
        [["Atkins' Physical Chemistry (latest edition). Peter Atkins & Julio de Paula", 'Oxford University Press'], "Atkins' Physical Chemistry"],
        [['Feliciano Giustino', '“Materials Modelling using Density Functional Theory”', 'Oxford University Press ISBN: 978-0-19-966244-9'], 'Materials Modelling using Density Functional Theory, Giustino'],
        [['Network Security Essentials, Applications and standards. William Stallings.', 'Pearson Education Inc.'], 'Network Security Essentials, Stallings'],
        [['Wright & Ma, "High-Dimensional Data Analysis with Low-Dimensional Models:', 'Principles, Computation, and Applications," Cambridge University Press, 2022. ISBN: 9781108489737.'], 'High-Dimensional Data Analysis with Low-Dimensional Models, Wright'],
        [['Supplementary litterature:Vagn Lundsgaard Hansen: “Fundamental Concepts in Modern Analysis”,', '2. Edition, World Scientific 2019. Available from Polyteknisk Boghandel'], 'Fundamental Concepts in Modern Analysis, Hansen'],
    ];
    for (const [lines, display] of cases) {
        const shown = barLines(lines).map((line) => api.parseKurserCitationLine(line)).filter(Boolean).map((p) => p.display);
        assert.deepEqual(shown, [display], lines.join(' / '));
    }
    for (const line of ['Oxford University Press', 'Cambridge University Press, 2020', 'Pearson Education Inc.', 'Springer International Publishing, 2020. (Selected chapters).', 'Garland Science', 'Courier Corporation, 2012']) {
        assert.equal(api.parseKurserCitationLine(line), null, line);
    }
});

test('semester literature dataset: a course with unchanged text uses its books, any other is parsed', () => {
    const text = 'Bishop, C. M. Pattern Recognition and Machine Learning. Springer, 2006.\nLecture notes.';
    // Spaces, line breaks, case and punctuation do not change the key; a changed word does.
    assert.equal(api.literatureTextKey(text), api.literatureTextKey('  bishop C M - pattern recognition and machine learning springer 2006 lecture notes '));
    assert.notEqual(api.literatureTextKey(text), api.literatureTextKey(text.replace('2006', '2007')));
    const data = { courses: {
        '02450': { k: api.literatureTextKey(text), b: [['Pattern Recognition and Machine Learning', 'Bishop', ''],
            ['Probabilistic Machine Learning: An Introduction', 'Murphy', '9780262046824', 'Probabilistic Machine Learning: An Introduction Murphy']] },
        '01005': { k: api.literatureTextKey('Course notes on DTU Learn.'), b: [] }
    } };
    assert.deepEqual(plain(api.findKnownLiterature(data, '02450', text)), [
        { raw: 'Pattern Recognition and Machine Learning, Bishop', title: 'Pattern Recognition and Machine Learning', author: 'Bishop', isbn: '',
            queryText: 'Pattern Recognition and Machine Learning Bishop', display: 'Pattern Recognition and Machine Learning, Bishop' },
        { raw: 'Probabilistic Machine Learning: An Introduction, Murphy', title: 'Probabilistic Machine Learning: An Introduction', author: 'Murphy', isbn: '9780262046824',
            queryText: 'Probabilistic Machine Learning: An Introduction Murphy', display: 'Probabilistic Machine Learning: An Introduction, Murphy' }
    ]);
    assert.deepEqual(plain(api.findKnownLiterature(data, '01005', 'Course notes on DTU Learn.')), []);
    assert.equal(api.findKnownLiterature(data, '02450', text + ' New edition 2027.'), null);
    assert.equal(api.findKnownLiterature(data, '99999', text), null);
    assert.equal(api.findKnownLiterature(null, '02450', text), null);
});
