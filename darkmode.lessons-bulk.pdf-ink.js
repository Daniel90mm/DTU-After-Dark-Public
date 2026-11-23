// Writes DTU Learn inline feedback into a copy of the student's PDF (Daniel, 2026-11-19).
// DTU Learn keeps a teacher's pen strokes as data beside the submitted PDF and draws them in its
// viewer, whose own "Download Annotations" button gives the student the merged file. This does the
// same for the course ZIP: the strokes become standard ink annotations with an appearance, added
// as an incremental update, so the original bytes stay untouched and any PDF reader shows them.
// lean: ink strokes on unrotated pages only; other kinds and rotated pages are counted as skipped.
(function () {
    'use strict';

    function toLatin1(bytes) {
        var out = '';
        for (var i = 0; i < bytes.length; i += 32768) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
        return out;
    }

    function fromLatin1(s) {
        var b = new Uint8Array(s.length);
        for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255;
        return b;
    }

    function isWs(c) { return c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '\f' || c === '\0'; }
    function isDelim(c) { return '()<>[]{}/%'.indexOf(c) !== -1; }

    // Values: number, true/false/null, array, {name}, {ref: [num, gen]}, {str} (raw text),
    // {dict, spans} (spans: key -> [start, end] of the value in the source), {op} (keyword).
    function Parser(s, pos) { this.s = s; this.p = pos || 0; }
    Parser.prototype.skip = function () {
        var s = this.s;
        while (this.p < s.length) {
            var c = s[this.p];
            if (c === '%') { while (this.p < s.length && s[this.p] !== '\n' && s[this.p] !== '\r') this.p++; }
            else if (isWs(c)) this.p++;
            else return;
        }
    };
    Parser.prototype.token = function () {
        this.skip();
        var st = this.p;
        while (this.p < this.s.length && !isWs(this.s[this.p]) && !isDelim(this.s[this.p])) this.p++;
        return this.s.slice(st, this.p);
    };
    Parser.prototype.value = function () {
        this.skip();
        var s = this.s;
        var c = s[this.p];
        if (c === '<' && s[this.p + 1] === '<') return this.dict();
        if (c === '<') {
            var end = s.indexOf('>', this.p);
            var hex = { str: s.slice(this.p, end + 1) };
            this.p = end + 1;
            return hex;
        }
        if (c === '(') return this.literal();
        if (c === '[') {
            this.p++;
            var arr = [];
            for (;;) {
                this.skip();
                if (s[this.p] === ']') { this.p++; return arr; }
                if (this.p >= s.length) throw new Error('PDF: unterminated array');
                arr.push(this.value());
            }
        }
        if (c === '/') {
            this.p++;
            var st = this.p;
            while (this.p < s.length && !isWs(s[this.p]) && !isDelim(s[this.p])) this.p++;
            return { name: s.slice(st, this.p) };
        }
        var t = this.token();
        if (t === '') throw new Error('PDF: unexpected character at ' + this.p);
        if (t === 'true') return true;
        if (t === 'false') return false;
        if (t === 'null') return null;
        if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) {
            if (/^\d+$/.test(t)) {
                var save = this.p;
                var g = this.token();
                if (/^\d+$/.test(g) && this.token() === 'R') return { ref: [Number(t), Number(g)] };
                this.p = save;
            }
            return Number(t);
        }
        return { op: t };
    };
    Parser.prototype.literal = function () {
        var s = this.s;
        var st = this.p;
        var depth = 0;
        for (; this.p < s.length; this.p++) {
            var c = s[this.p];
            if (c === '\\') { this.p++; continue; }
            if (c === '(') depth++;
            else if (c === ')' && --depth === 0) { this.p++; return { str: s.slice(st, this.p) }; }
        }
        throw new Error('PDF: unterminated string');
    };
    Parser.prototype.dict = function () {
        this.p += 2;
        var map = {};
        var spans = {};
        for (;;) {
            this.skip();
            if (this.s[this.p] === '>' && this.s[this.p + 1] === '>') { this.p += 2; return { dict: map, spans: spans }; }
            if (this.s[this.p] !== '/') throw new Error('PDF: bad dictionary at ' + this.p);
            var key = this.value().name;
            this.skip();
            var vs = this.p;
            map[key] = this.value();
            spans[key] = [vs, this.p];
        }
    };

    async function inflate(data) {
        var stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    function unpredict(data, parms) {
        var pred = (parms && parms.Predictor) || 1;
        if (pred === 1) return data;
        if (pred < 10) throw new Error('PDF: predictor ' + pred + ' not supported');
        var colors = parms.Colors || 1;
        var bpc = parms.BitsPerComponent || 8;
        var bpp = Math.max(1, Math.ceil(colors * bpc / 8));
        var rowLen = Math.ceil(colors * bpc * (parms.Columns || 1) / 8);
        var rows = Math.floor(data.length / (rowLen + 1));
        var out = new Uint8Array(rows * rowLen);
        var prev = new Uint8Array(rowLen);
        for (var r = 0; r < rows; r++) {
            var type = data[r * (rowLen + 1)];
            var src = r * (rowLen + 1) + 1;
            var row = out.subarray(r * rowLen, (r + 1) * rowLen);
            for (var i = 0; i < rowLen; i++) {
                var x = data[src + i];
                var a = i >= bpp ? row[i - bpp] : 0;
                var b = prev[i];
                var c = i >= bpp ? prev[i - bpp] : 0;
                var v;
                if (type === 0) v = x;
                else if (type === 1) v = x + a;
                else if (type === 2) v = x + b;
                else if (type === 3) v = x + ((a + b) >> 1);
                else if (type === 4) {
                    var p = a + b - c;
                    var pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                    v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
                } else throw new Error('PDF: PNG filter ' + type);
                row[i] = v & 255;
            }
            prev = row;
        }
        return out;
    }

    function Pdf(bytes) {
        this.bytes = bytes;
        this.s = toLatin1(bytes);
        this.xref = {};
        this.trailer = null;
        this.usesXrefStream = false;
        this.objStms = {};
    }

    Pdf.prototype.resolve = async function (v) {
        return v && v.ref ? (await this.getObject(v.ref[0])).value : v;
    };

    Pdf.prototype.decode = async function (dict, data) {
        var filters = await this.resolve(dict.Filter);
        filters = filters == null ? [] : Array.isArray(filters) ? filters : [filters];
        var parms = await this.resolve(dict.DecodeParms);
        parms = Array.isArray(parms) ? parms : [parms];
        for (var i = 0; i < filters.length; i++) {
            if (filters[i].name !== 'FlateDecode') throw new Error('PDF: filter ' + filters[i].name + ' not supported');
            data = unpredict(await inflate(data), parms[i] && parms[i].dict);
        }
        return data;
    };

    Pdf.prototype.parseAt = async function (off) {
        var p = new Parser(this.s, off);
        var num = Number(p.token());
        var gen = Number(p.token());
        if (p.token() !== 'obj') throw new Error('PDF: no object at ' + off);
        p.skip();
        var start = p.p;
        var value = p.value();
        var end = p.p;
        var data = null;
        p.skip();
        if (this.s.startsWith('stream', p.p)) {
            var at = p.p + 6;
            if (this.s[at] === '\r') at++;
            if (this.s[at] === '\n') at++;
            var len = await this.resolve(value.dict.Length);
            data = this.bytes.subarray(at, at + len);
        }
        return { num: num, gen: gen, value: value, src: this.s, start: start, end: end, data: data };
    };

    Pdf.prototype.getObject = async function (num) {
        var e = this.xref[num];
        if (!e || e.free) throw new Error('PDF: object ' + num + ' missing');
        if (e.off != null) {
            var o = await this.parseAt(e.off);
            if (o.num !== num) throw new Error('PDF: cross-reference points at the wrong object');
            return o;
        }
        var stm = await this.objStm(e.stm);
        var p = new Parser(stm.text, stm.first + stm.offsets[e.idx]);
        p.skip();
        var start = p.p;
        var value = p.value();
        return { num: num, gen: 0, value: value, src: stm.text, start: start, end: p.p, data: null };
    };

    Pdf.prototype.objStm = async function (num) {
        if (this.objStms[num]) return this.objStms[num];
        var o = await this.getObject(num);
        var text = toLatin1(await this.decode(o.value.dict, o.data));
        var p = new Parser(text, 0);
        var offsets = [];
        for (var i = 0; i < o.value.dict.N; i++) { p.token(); offsets.push(Number(p.token())); }
        this.objStms[num] = { text: text, first: o.value.dict.First, offsets: offsets };
        return this.objStms[num];
    };

    Pdf.prototype.readSection = async function (off) {
        var p = new Parser(this.s, off);
        p.skip();
        if (this.s.startsWith('xref', p.p)) {
            p.p += 4;
            for (;;) {
                p.skip();
                if (this.s.startsWith('trailer', p.p)) { p.p += 7; return p.value(); }
                var first = Number(p.token());
                var count = Number(p.token());
                if (!isFinite(first) || !isFinite(count) || p.p >= this.s.length) throw new Error('PDF: bad cross-reference table');
                p.skip();
                for (var i = 0; i < count; i++) {
                    var m = /^(\d{10}) (\d{5}) ([nf])/.exec(this.s.substr(p.p, 18));
                    if (!m) throw new Error('PDF: bad cross-reference entry');
                    if (!((first + i) in this.xref)) this.xref[first + i] = m[3] === 'n' ? { off: Number(m[1]), gen: Number(m[2]) } : { free: true };
                    p.p += 18;
                    p.skip();
                }
            }
        }
        var o = await this.parseAt(p.p);
        var d = o.value.dict;
        if (!d || !d.Type || d.Type.name !== 'XRef') throw new Error('PDF: no cross-reference at ' + off);
        this.usesXrefStream = true;
        var data = await this.decode(d, o.data);
        var W = d.W;
        var index = d.Index || [0, d.Size];
        var pos = 0;
        for (var k = 0; k < index.length; k += 2) {
            for (var n = 0; n < index[k + 1]; n++) {
                var f = [W[0] ? 0 : 1, 0, 0];
                for (var j = 0; j < 3; j++) {
                    if (!W[j]) continue;
                    var v = 0;
                    for (var b = 0; b < W[j]; b++) v = v * 256 + data[pos++];
                    f[j] = v;
                }
                var num = index[k] + n;
                if (num in this.xref) continue;
                if (f[0] === 0) this.xref[num] = { free: true };
                else if (f[0] === 1) this.xref[num] = { off: f[1], gen: f[2] };
                else if (f[0] === 2) this.xref[num] = { stm: f[1], idx: f[2] };
            }
        }
        return o.value;
    };

    Pdf.prototype.load = async function () {
        var at = this.s.lastIndexOf('startxref');
        if (at < 0) throw new Error('PDF: no startxref');
        var off = parseInt(this.s.slice(at + 9, at + 40).trim(), 10);
        this.startxref = off;
        var seen = new Set();
        while (typeof off === 'number' && !seen.has(off)) {
            seen.add(off);
            var t = await this.readSection(off);
            if (!this.trailer) this.trailer = t;
            if (typeof t.dict.XRefStm === 'number') await this.readSection(t.dict.XRefStm);
            off = t.dict.Prev;
        }
        if (this.trailer.dict.Encrypt) throw new Error('PDF is encrypted');
    };

    Pdf.prototype.pages = async function () {
        var self = this;
        var out = [];
        async function box(v) {
            v = await self.resolve(v);
            if (!Array.isArray(v)) return null;
            var n = [];
            for (var i = 0; i < 4; i++) n.push(Number(await self.resolve(v[i])));
            return [Math.min(n[0], n[2]), Math.min(n[1], n[3]), Math.max(n[0], n[2]), Math.max(n[1], n[3])];
        }
        async function walk(ref, inherited, depth) {
            if (depth > 64 || !ref || !ref.ref) throw new Error('PDF: bad page tree');
            var o = await self.getObject(ref.ref[0]);
            var d = o.value.dict;
            var here = {
                media: d.MediaBox ? await box(d.MediaBox) : inherited.media,
                crop: d.CropBox ? await box(d.CropBox) : inherited.crop,
                rotate: d.Rotate != null ? Number(await self.resolve(d.Rotate)) : inherited.rotate
            };
            if (d.Kids) {
                var kids = await self.resolve(d.Kids);
                for (var i = 0; i < kids.length; i++) await walk(kids[i], here, depth + 1);
            } else {
                out.push({ ref: ref.ref, obj: o, box: here.crop || here.media, rotate: ((here.rotate || 0) % 360 + 360) % 360 });
            }
        }
        var root = await this.resolve(this.trailer.dict.Root);
        await walk(root.dict.Pages, { media: null, crop: null, rotate: 0 }, 0);
        return out;
    };

    function num(n) {
        var r = Math.round(n * 100) / 100;
        return String(Object.is(r, -0) ? 0 : r);
    }

    function rgb(color) {
        var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(color || ''));
        if (!m) return '0 0 0';
        return [m[1], m[2], m[3]].map(function (h) { return num(parseInt(h, 16) / 255); }).join(' ');
    }

    // annotations: DTU Learn's annotation list (pspdfkit Instant JSON, points from the page's
    // top left). Returns { bytes, drawn, skipped }.
    // A PDF text string in UTF-16 with byte order mark, written as hex so the file stays ASCII.
    function pdfText(s) {
        var hex = 'FEFF';
        for (var i = 0; i < s.length; i++) hex += ('000' + s.charCodeAt(i).toString(16).toUpperCase()).slice(-4);
        return '<' + hex + '>';
    }

    // The text of a pspdfkit note: a string, or {format, value} with xhtml.
    function noteText(a) {
        var t = typeof a.text === 'string' ? a.text : (a.text && a.text.value) || '';
        if (a.text && a.text.format === 'xhtml') t = t.replace(/<br\s*\/?>|<\/p>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        return t.trim();
    }

    // Pen strokes (pspdfkit/ink) become Ink annotations with their drawing; sticky notes
    // (pspdfkit/note) become Text annotations the PDF viewer shows as a note icon.
    async function addFeedbackAnnotations(bytes, annotations) {
        var pdf = new Pdf(bytes);
        await pdf.load();
        var pages = await pdf.pages();
        var next = Math.max(Number(pdf.trailer.dict.Size) || 0, Math.max.apply(null, Object.keys(pdf.xref).map(Number).concat([0])) + 1);
        var tail = /[\r\n]$/.test(pdf.s.slice(-1)) ? '' : '\n';
        var entries = [];
        function add(n, gen, body) {
            entries.push({ num: n, gen: gen, off: bytes.length + tail.length });
            tail += n + ' ' + gen + ' obj\n' + body + '\nendobj\n';
        }
        var byPage = {};
        var skipped = 0;
        var drawn = 0;
        var notes = [];
        (annotations || []).forEach(function (a) {
            var page = a && pages[a.pageIndex];
            var isNote = a && a.type === 'pspdfkit/note' && noteText(a);
            if (!a || (a.type !== 'pspdfkit/ink' && !isNote) || !page || !page.box || page.rotate !== 0) { skipped++; return; }
            (byPage[a.pageIndex] = byPage[a.pageIndex] || []).push(a);
        });
        for (var key in byPage) {
            var page = pages[key];
            var bx = page.box;
            var refs = [];
            byPage[key].forEach(function (a) {
                if (a.type === 'pspdfkit/note') {
                    var b = (a.bbox || []).map(Number);
                    var x0 = bx[0] + (b[0] || 0);
                    var top = bx[3] - (b[1] || 0);
                    var noteRect = [x0, top - Math.max(b[3] || 0, 16), x0 + Math.max(b[2] || 0, 16), top].map(num).join(' ');
                    var text = noteText(a);
                    var nref = next++;
                    add(nref, 0, '<< /Type /Annot /Subtype /Text /Rect [' + noteRect + '] /Contents ' + pdfText(text) + ' /Name /Comment /C [' + rgb(a.color)
                        + '] /F 4 /P ' + page.ref[0] + ' ' + page.ref[1] + ' R >>');
                    refs.push(nref + ' 0 R');
                    notes.push({ page: Number(key) + 1, text: text });
                    drawn++;
                    return;
                }
                var lw = Number(a.lineWidth) > 0 ? Number(a.lineWidth) : 1;
                var opacity = a.opacity != null && a.opacity < 1 ? Math.max(0, Number(a.opacity)) : 1;
                var ink = [];
                var path = [];
                var lo = [Infinity, Infinity];
                var hi = [-Infinity, -Infinity];
                ((a.lines && a.lines.points) || []).forEach(function (line) {
                    var pts = [];
                    (line || []).forEach(function (pt, i) {
                        var x = bx[0] + Number(pt[0]);
                        var y = bx[3] - Number(pt[1]);
                        if (!isFinite(x) || !isFinite(y)) return;
                        lo = [Math.min(lo[0], x), Math.min(lo[1], y)];
                        hi = [Math.max(hi[0], x), Math.max(hi[1], y)];
                        pts.push(num(x), num(y));
                        path.push(num(x) + ' ' + num(y) + (pts.length === 2 ? ' m' : ' l'));
                    });
                    if (pts.length === 2) path.push(pts[0] + ' ' + pts[1] + ' l');
                    if (pts.length) ink.push('[' + pts.join(' ') + ']');
                });
                if (!ink.length) { skipped++; return; }
                var rect = [lo[0] - lw, lo[1] - lw, hi[0] + lw, hi[1] + lw].map(num).join(' ');
                var content = 'q ' + (opacity < 1 ? '/G0 gs ' : '') + rgb(a.strokeColor) + ' RG ' + num(lw) + ' w 1 J 1 j ' + path.join(' ') + ' S Q';
                var ap = next++;
                var annot = next++;
                add(ap, 0, '<< /Type /XObject /Subtype /Form /BBox [' + rect + ']'
                    + (opacity < 1 ? ' /Resources << /ExtGState << /G0 << /CA ' + num(opacity) + ' >> >> >>' : '')
                    + ' /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream');
                add(annot, 0, '<< /Type /Annot /Subtype /Ink /Rect [' + rect + '] /InkList [' + ink.join(' ') + '] /C [' + rgb(a.strokeColor)
                    + '] /BS << /W ' + num(lw) + ' >> /CA ' + num(opacity) + ' /F 4 /P ' + page.ref[0] + ' ' + page.ref[1] + ' R /AP << /N ' + ap + ' 0 R >> >>');
                refs.push(annot + ' 0 R');
                drawn++;
            });
            if (!refs.length) continue;
            var o = page.obj;
            var raw = o.src.slice(o.start, o.end);
            var span = o.value.spans.Annots;
            var dictText;
            if (!span) dictText = raw.replace(/>>\s*$/, ' /Annots [' + refs.join(' ') + '] >>');
            else {
                var arrText;
                var existing = o.value.dict.Annots;
                if (existing && existing.ref) {
                    var ao = await pdf.getObject(existing.ref[0]);
                    arrText = ao.src.slice(ao.start, ao.end);
                } else arrText = o.src.slice(span[0], span[1]);
                if (!/\]\s*$/.test(arrText)) throw new Error('PDF: page annotations are not an array');
                arrText = arrText.replace(/\]\s*$/, ' ' + refs.join(' ') + ']');
                dictText = raw.slice(0, span[0] - o.start) + arrText + raw.slice(span[1] - o.start);
            }
            add(page.ref[0], page.ref[1], dictText);
        }
        if (!drawn) return { bytes: bytes, drawn: 0, skipped: skipped, notes: [] };

        var t = pdf.trailer;
        var keep = ['Root', 'Info', 'ID'].filter(function (k) { return t.spans[k]; }).map(function (k) {
            return '/' + k + ' ' + pdf.s.slice(t.spans[k][0], t.spans[k][1]);
        }).join(' ');
        var xrefAt = bytes.length + tail.length;
        if (pdf.usesXrefStream) {
            var self = next++;
            entries.push({ num: self, gen: 0, off: xrefAt });
            entries.sort(function (a, b) { return a.num - b.num; });
            var data = '';
            var index = [];
            entries.forEach(function (e) {
                index.push(e.num + ' 1');
                data += String.fromCharCode(1, (e.off >>> 24) & 255, (e.off >>> 16) & 255, (e.off >>> 8) & 255, e.off & 255, (e.gen >> 8) & 255, e.gen & 255);
            });
            tail += self + ' 0 obj\n<< /Type /XRef /Size ' + next + ' /W [1 4 2] /Index [' + index.join(' ') + '] /Prev ' + pdf.startxref + ' ' + keep
                + ' /Length ' + data.length + ' >>\nstream\n' + data + '\nendstream\nendobj\n';
        } else {
            entries.sort(function (a, b) { return a.num - b.num; });
            tail += 'xref\n';
            entries.forEach(function (e) {
                tail += e.num + ' 1\n' + String(e.off).padStart(10, '0') + ' ' + String(e.gen).padStart(5, '0') + ' n\r\n';
            });
            tail += 'trailer\n<< /Size ' + next + ' /Prev ' + pdf.startxref + ' ' + keep + ' >>\n';
        }
        tail += 'startxref\n' + xrefAt + '\n%%EOF\n';
        var out = new Uint8Array(bytes.length + tail.length);
        out.set(bytes, 0);
        out.set(fromLatin1(tail), bytes.length);
        return { bytes: out, drawn: drawn, skipped: skipped, notes: notes };
    }

    try {
        globalThis.DTUAfterDarkPdfInk = { addFeedbackAnnotations: addFeedbackAnnotations, unpredict: unpredict };
    } catch (ePdfInk) { }
})();
