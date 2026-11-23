// Teacher's pen notes written into a copy of the student's PDF: old-style and compressed PDFs,
// original bytes kept, notes on rotated pages or of other kinds skipped, output readable again.
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readSource } from './_harness.mjs';

function loadInk() {
    const sb = { Blob, Response, DecompressionStream, Uint8Array, Math, Number, String, Object, Array, Set, Infinity, isFinite, parseInt, JSON };
    sb.globalThis = sb;
    vm.runInNewContext(readSource('darkmode.lessons-bulk.pdf-ink.js'), sb);
    return sb.DTUAfterDarkPdfInk;
}

function pageObjects(rotateSecond) {
    const objs = { 1: '<< /Type /Catalog /Pages 2 0 R >>', 2: '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 /MediaBox [0 0 600 800] >>',
        3: '<< /Type /Page /Parent 2 0 R /Annots [] >>', 4: '<< /Type /Page /Parent 2 0 R' + (rotateSecond ? ' /Rotate 90' : '') + ' >>' };
    return objs;
}

function classicPdf(objs) {
    let s = '%PDF-1.4\n';
    const off = {};
    const nums = Object.keys(objs).map(Number);
    for (const n of nums) { off[n] = s.length; s += n + ' 0 obj\n' + objs[n] + '\nendobj\n'; }
    const x = s.length;
    s += 'xref\n0 ' + (nums.length + 1) + '\n0000000000 65535 f\r\n';
    for (const n of nums) s += String(off[n]).padStart(10, '0') + ' 00000 n\r\n';
    return Buffer.from(s + 'trailer\n<< /Size ' + (nums.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF\n', 'latin1');
}

async function deflate(buf) {
    const stream = new Blob([buf]).stream().pipeThrough(new CompressionStream('deflate'));
    return Buffer.from(await new Response(stream).arrayBuffer());
}

// Pages in a compressed object stream, cross-reference stream with the PNG Up predictor.
async function compressedPdf(objs) {
    const nums = Object.keys(objs).map(Number);
    let header = '', body = '';
    nums.forEach((n) => { header += n + ' ' + body.length + ' '; body += objs[n] + '\n'; });
    const stm = await deflate(Buffer.from(header + body, 'latin1'));
    const stmNum = nums.length + 1, xrefNum = nums.length + 2;
    let out = Buffer.from('%PDF-1.5\n', 'latin1');
    const stmOff = out.length;
    out = Buffer.concat([out, Buffer.from(stmNum + ' 0 obj\n<< /Type /ObjStm /N ' + nums.length + ' /First ' + header.length + ' /Filter /FlateDecode /Length ' + stm.length + ' >>\nstream\n', 'latin1'), stm, Buffer.from('\nendstream\nendobj\n', 'latin1')]);
    const xrefOff = out.length;
    const rows = [[0, 0, 0]];
    nums.forEach((n, i) => rows.push([2, stmNum, i]));
    rows.push([1, stmOff, 0], [1, xrefOff, 0]);
    const raw = rows.map(([t, a, b]) => [t, (a >> 8) & 255, a & 255, b]);
    const enc = [];
    raw.forEach((r, i) => { enc.push(2); r.forEach((v, j) => enc.push((v - (i ? raw[i - 1][j] : 0)) & 255)); });
    const data = await deflate(Buffer.from(enc));
    out = Buffer.concat([out, Buffer.from(xrefNum + ' 0 obj\n<< /Type /XRef /Size ' + rows.length + ' /W [1 2 1] /Root 1 0 R /Filter /FlateDecode /DecodeParms << /Predictor 12 /Columns 4 >> /Length ' + data.length + ' >>\nstream\n', 'latin1'), data, Buffer.from('\nendstream\nendobj\nstartxref\n' + xrefOff + '\n%%EOF\n', 'latin1')]);
    return out;
}

const strokes = [
    { type: 'pspdfkit/ink', pageIndex: 0, lineWidth: 2, strokeColor: '#ff0000', lines: { points: [[[100, 100], [200, 150]]] } },
    { type: 'pspdfkit/ink', pageIndex: 1, lineWidth: 2, strokeColor: '#0000ff', lines: { points: [[[10, 10], [20, 20]]] } },
    { type: 'pspdfkit/text', pageIndex: 0 }
];

for (const [label, make] of [['old-style', async (o) => classicPdf(o)], ['compressed', compressedPdf]]) {
    test(label + ' PDF: ink goes onto the page, original bytes kept, output reads again', async () => {
        const ink = loadInk();
        const original = await make(pageObjects(true));
        const r = await ink.addFeedbackAnnotations(new Uint8Array(original), strokes);
        assert.equal(r.drawn, 1, 'only the unrotated page gets its stroke');
        assert.equal(r.skipped, 2, 'the rotated page stroke and the text note are skipped');
        const out = Buffer.from(r.bytes);
        assert.ok(out.subarray(0, original.length).equals(original), 'original bytes changed');
        const added = out.subarray(original.length).toString('latin1');
        assert.match(added, /\/Subtype \/Ink/);
        assert.match(added, /\/InkList \[\[100 700 200 650\]\]/, 'top-left points become PDF points from the bottom left');
        assert.match(added, /3 0 obj\n<< \/Type \/Page \/Parent 2 0 R \/Annots \[ \d+ 0 R\] >>/);
        assert.match(added, label === 'compressed' ? /\/Type \/XRef/ : /\ntrailer\n/);

        const again = await ink.addFeedbackAnnotations(r.bytes, [strokes[0]]);
        assert.equal(again.drawn, 1);
        const second = Buffer.from(again.bytes).subarray(r.bytes.length).toString('latin1');
        assert.match(second, /3 0 obj\n<< \/Type \/Page \/Parent 2 0 R \/Annots \[ \d+ 0 R \d+ 0 R\] >>/, 'second pass keeps the first note');
    });
}

test('nothing to draw returns the PDF unchanged; an encrypted PDF is refused', async () => {
    const ink = loadInk();
    const pdf = new Uint8Array(classicPdf(pageObjects(false)));
    const r = await ink.addFeedbackAnnotations(pdf, [{ type: 'pspdfkit/text', pageIndex: 0 }]);
    assert.equal(r.drawn, 0);
    assert.equal(r.bytes, pdf);
    const enc = Buffer.from(classicPdf(pageObjects(false)).toString('latin1').replace('/Root 1 0 R', '/Root 1 0 R /Encrypt 9 0 R'), 'latin1');
    await assert.rejects(ink.addFeedbackAnnotations(new Uint8Array(enc), strokes), /encrypted/);
});

test('a sticky note becomes a Text annotation with its text, and is listed', async () => {
    const ink = loadInk();
    const pdf = new Uint8Array(classicPdf(pageObjects(false)));
    const r = await ink.addFeedbackAnnotations(pdf, [{ type: 'pspdfkit/note', pageIndex: 0, bbox: [100, 92, 32, 32], color: '#FFD000', text: { format: 'plain', value: 'Godt, men Ø mangler' } }]);
    assert.equal(r.drawn, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(r.notes)), [{ page: 1, text: 'Godt, men Ø mangler' }]);
    const added = Buffer.from(r.bytes).subarray(pdf.length).toString('latin1');
    assert.match(added, /\/Subtype \/Text \/Rect \[100 676 132 708\] \/Contents <FEFF0047006F00640074002C0020006D0065006E002000D8002000/);
});
