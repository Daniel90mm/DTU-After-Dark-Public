// Course activity for the Lessons download (Daniel, 2026-11-19): announcements, assignments
// (instructions, the student's own submissions and feedback), finished quiz attempts as D2L's
// review page shows them, and discussions with other students' names replaced. It reads only
// what the student can already open, only when they press Download, and the result stays in
// their ZIP (DTU_IT_RULES.md: Lessons bulk download, lines 3 and 4).
(function () {
    'use strict';

    // summary: the grey line under each option in the panel; keep it true to the collectors below.
    var KINDS = [
        { key: 'announcements', label: 'Announcements', summary: 'All posts, with pictures and attached files' },
        { key: 'assignments', label: 'Assignments', summary: 'Instructions, your hand-ins, feedback and rubric' },
        { key: 'quizzes', label: 'Quizzes', summary: 'Your finished attempts; for the rest, dates and rules' },
        { key: 'discussions', label: 'Discussions', summary: 'Every post and reply, with attached files' },
        { key: 'grades', label: 'Grades', summary: 'Points, grade and comments on one page' }
    ];
    var MAX_INLINE_IMAGE_BYTES = 5e6;
    // A request with no answer must not hang the run (Firefox stalled on the first API call, 2026-11-19).
    var REQUEST_TIMEOUT_MS = 30000;

    // DTU's copyright rule for students (DTU_IT_RULES.md K), on every saved page and after every run.
    var FORWARD_NOTE = 'For your own study: DTU does not allow forwarding files you only have access to as a DTU student.';
    var PAGE_CSS = 'body{font:15px/1.55 system-ui,sans-serif;max-width:820px;margin:32px auto;padding:0 20px;color:#1a1a1a;background:#fff}'
        + 'h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:0 0 4px}.course,.meta,footer{color:#666;font-size:13px}'
        + '.item{border:1px solid #d0d0d0;border-radius:8px;padding:12px 16px;margin:16px 0}'
        + 'img{max-width:100%;height:auto}table{border-collapse:collapse;max-width:100%}td,th{padding:4px 6px;vertical-align:top}'
        + '.mark{font-weight:600}footer{margin:32px 0;border-top:1px solid #d0d0d0;padding-top:12px}'
        + 'table.grid{width:100%}table.grid th{text-align:left}table.grid td{border-top:1px solid #d0d0d0}table.grid td>p:first-child{margin-top:0}'
        + '@media (prefers-color-scheme:dark){body{color:#e6e4df;background:#1e1e1e}.course,.meta,footer{color:#aaa}'
        + '.item,footer,table.grid td{border-color:#444}a{color:#8ab4f8}}';

    function deps() {
        var f = globalThis.DTUAfterDarkLessonsBulkFetch;
        var z = globalThis.DTUAfterDarkLessonsBulkZip;
        if (!f || !z) throw new Error('darkmode.lessons-bulk.activity.js needs the lessons-bulk zip and fetch files loaded first');
        return { fetch: f.lessonsBulkFetch, sanitize: z.sanitizeZipEntryName, tooLarge: z.isTooLargeForZipEntry, courseTitle: z.getLessonsBulkZipBaseTitle };
    }

    function throwIfAborted() {
        var state = globalThis.DTUAfterDarkLessonsBulkState;
        if (state && state.runAbort && state.runAbort.signal.aborted) {
            var err = new Error('Bulk download cancelled');
            err.name = 'AbortError';
            throw err;
        }
    }

    function isAbort(err) {
        return !!err && err.name === 'AbortError';
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function when(iso) {
        if (!iso) return '';
        var d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function byDate(key, newestFirst) {
        return function (a, b) {
            var x = String(a[key] || '');
            var y = String(b[key] || '');
            return newestFirst ? (x < y ? 1 : x > y ? -1 : 0) : (x < y ? -1 : x > y ? 1 : 0);
        };
    }

    function htmlPage(title, course, body, savedIso) {
        return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
            + '<title>' + esc(title) + '</title><style>' + PAGE_CSS + '</style></head><body>'
            + '<header><p class="course">' + esc(course) + '</p><h1>' + esc(title) + '</h1></header>'
            + body
            + '<footer>Saved from DTU Learn by DTU After Dark on ' + esc(when(savedIso)) + '. ' + FORWARD_NOTE + '</footer></body></html>';
    }

    // Relative link from a page to a file in the same ZIP, one encoded segment at a time.
    function relLink(fromDir, path) {
        var from = fromDir.split('/');
        var to = path.split('/');
        while (from.length && to.length > 1 && from[0] === to[0]) { from.shift(); to.shift(); }
        return from.map(function () { return '..'; }).concat(to.map(encodeURIComponent)).join('/');
    }

    // One ZIP path per file, numbered on a repeat the way the ZIP builder does it, so a
    // page's link matches the name the file gets.
    function makeNamer(sanitize) {
        var used = new Set();
        return function (segments) {
            var parts = segments.map(function (s) { return sanitize(s, 'untitled'); });
            var last = parts.pop();
            var dir = parts.length ? parts.join('/') + '/' : '';
            var dot = last.lastIndexOf('.');
            var name = last;
            for (var n = 1; used.has((dir + name).toLowerCase()); n++) {
                name = dot > 0 ? last.slice(0, dot) + ' (' + n + ')' + last.slice(dot) : last + ' (' + n + ')';
            }
            used.add((dir + name).toLowerCase());
            return dir + name;
        };
    }

    // Posts of one topic, threaded by ParentPostId, oldest first. Authors keep their names; the
    // student gets "(you)", staff their class list role (Daniel, 2026-11-19: the student sees these
    // names on DTU Learn, so the copy keeps them).
    function discussionEntries(posts, roles, myId) {
        var live = (posts || []).filter(function (p) { return p && !p.IsDeleted; });
        var byId = {};
        live.forEach(function (p) { byId[p.PostId] = p; });
        var kids = {};
        var roots = [];
        live.forEach(function (p) {
            if (p.ParentPostId != null && byId[p.ParentPostId] && p.ParentPostId !== p.PostId) {
                (kids[p.ParentPostId] = kids[p.ParentPostId] || []).push(p);
            } else roots.push(p);
        });
        function author(p) {
            if (p.IsAnonymous) return 'Anonymous';
            var id = String(p.PostingUserId);
            var name = p.PostingUserDisplayName || 'Unknown';
            if (myId && id === String(myId)) return name + ' (you)';
            var role = roles && roles[id];
            return role && !/^student/i.test(role) ? name + ' (' + role + ')' : name;
        }
        var out = [];
        var seen = new Set();
        function walk(p, depth) {
            if (seen.has(p.PostId)) return;
            seen.add(p.PostId);
            out.push({
                id: p.PostId,
                depth: depth,
                author: author(p),
                date: p.DatePosted || '',
                subject: depth === 0 ? (p.Subject || '') : '',
                html: (p.Message && (p.Message.Html || esc(p.Message.Text || ''))) || '',
                attachments: (p.Attachments || []).length,
                files: (p.Attachments || []).map(function (a) { return { id: a.FileId, name: a.FileName || 'attachment' }; })
            });
            (kids[p.PostId] || []).sort(byDate('DatePosted')).forEach(function (c) { walk(c, depth + 1); });
        }
        roots.sort(byDate('DatePosted')).forEach(function (p) { walk(p, 0); });
        return out;
    }

    // Unique attempt review links, in page order, from D2L's quiz submissions page. D2L lists
    // only finished attempts the teacher lets the student review.
    function quizAttemptLinks(html) {
        var seen = new Set();
        var out = [];
        (String(html || '').match(/quiz_submissions_attempt\.d2l\?[^"'<>\s]*/g) || []).forEach(function (raw) {
            var link = raw.replace(/&amp;/g, '&');
            var ai = (/[?&]ai=(\d+)/.exec(link) || [])[1];
            if (!ai || seen.has(ai)) return;
            seen.add(ai);
            out.push(link);
        });
        return out;
    }

    // Submission files on DTU Learn's folder history page, for folders whose submissions API refuses a student.
    function historyFileLinks(html) {
        var seen = new Set();
        var out = [];
        (String(html || '').match(/\/d2l\/common\/viewFile\.d2lfile\/[^"'<>\s]+/g) || []).forEach(function (raw) {
            var link = raw.replace(/&amp;/g, '&');
            if (seen.has(link)) return;
            seen.add(link);
            out.push(link);
        });
        return out;
    }

    function absUrl(u) {
        if (!u || u.charAt(0) === '#' || /^(data|mailto):/i.test(u)) return u;
        try { return new URL(u, location.origin + '/').href; } catch (e0) { return u; }
    }

    // Saved pages open from disk later: no scripts, no event handlers, links made absolute.
    function scrub(root) {
        var doc = root.ownerDocument;
        root.querySelectorAll('script,noscript,link,meta,base,object,embed,style').forEach(function (n) { n.remove(); });
        root.querySelectorAll('iframe').forEach(function (frame) {
            var a = doc.createElement('a');
            a.href = absUrl(frame.getAttribute('src') || '');
            a.textContent = 'Embedded content: ' + a.getAttribute('href');
            frame.replaceWith(a);
        });
        // The saved page is opened later from disk: no handler, no srcdoc and no
        // javascript: URL in any attribute (formaction, xlink:href, SVG values too).
        root.querySelectorAll('*').forEach(function (node) {
            Array.prototype.slice.call(node.attributes).forEach(function (attr) {
                var name = attr.name.toLowerCase();
                if (name.indexOf('on') === 0 || name === 'srcdoc' || /j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/i.test(attr.value)) {
                    node.removeAttribute(attr.name);
                } else if (name === 'href' || name === 'src') {
                    node.setAttribute(attr.name, absUrl(attr.value));
                }
            });
        });
    }

    function blobToDataUrl(blob) {
        return new Promise(function (resolve, reject) {
            var r = new FileReader();
            r.onload = function () { resolve(r.result); };
            r.onerror = function () { reject(r.error); };
            r.readAsDataURL(blob);
        });
    }

    // DTU Learn images need the student's session, so the saved page carries them.
    async function inlineImages(root) {
        var imgs = Array.prototype.slice.call(root.querySelectorAll('img[src]'));
        for (var i = 0; i < imgs.length; i++) {
            var src = imgs[i].getAttribute('src');
            if (src.indexOf(location.origin + '/') !== 0) continue;
            try {
                var resp = await timedFetch(src, { credentials: 'include' });
                if (!resp.ok) continue;
                var blob = await resp.blob();
                if (blob.size > MAX_INLINE_IMAGE_BYTES || !/^image\//.test(blob.type)) continue;
                imgs[i].setAttribute('src', await blobToDataUrl(blob));
            } catch (e0) {
                if (isAbort(e0)) throw e0;
            }
        }
    }

    async function richHtml(html) {
        if (!html) return '';
        var doc = new DOMParser().parseFromString(String(html), 'text/html');
        scrub(doc.body);
        await inlineImages(doc.body);
        return doc.body.innerHTML;
    }

    // The quiz review page keeps each question's text in a d2l-html-block html attribute
    // (drawn by D2L's scripts) and marks answers with icons whose alt text says Selected,
    // Correct Answer and so on: write both out as plain HTML.
    async function quizAttemptBody(html) {
        var doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
        var root = doc.querySelector('.d2l-page-main') || doc.querySelector('form') || doc.body;
        root.querySelectorAll('d2l-html-block').forEach(function (block) {
            var div = doc.createElement('div');
            var parsed = new DOMParser().parseFromString(String(block.getAttribute('html') || ''), 'text/html');
            div.append.apply(div, Array.prototype.slice.call(parsed.body.childNodes));
            block.replaceWith(div);
        });
        root.querySelectorAll('img').forEach(function (img) {
            if (!/^\/d2l\/img\//.test(img.getAttribute('src') || '')) return;
            var alt = (img.getAttribute('alt') || '').trim();
            if (!alt) { img.remove(); return; }
            var mark = doc.createElement('span');
            mark.className = 'mark';
            mark.textContent = '[' + alt + '] ';
            img.replaceWith(mark);
        });
        root.querySelectorAll('d2l-labs-navigation-band,d2l-button-icon,d2l-icon,button,input[type="hidden"]').forEach(function (n) { n.remove(); });
        scrub(root);
        await inlineImages(root);
        return root.innerHTML;
    }

    // Absolute same-origin URL, and a rejection naming the path when DTU Learn does not answer in time.
    function timedFetch(url, opts) {
        var abs = absUrl(url);
        var timer;
        var timeout = new Promise(function (resolve, reject) {
            timer = setTimeout(function () { reject(new Error('no answer in 30 s from ' + String(url).split('?')[0])); }, REQUEST_TIMEOUT_MS);
        });
        return Promise.race([deps().fetch(abs, opts), timeout]).finally(function () { clearTimeout(timer); });
    }

    async function getJson(url) {
        var resp = await timedFetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });
        if (!resp.ok) return { status: resp.status, body: null };
        try { return { status: resp.status, body: await resp.json() }; } catch (e0) { return { status: 'not-json', body: null }; }
    }

    async function getText(url) {
        var resp = await timedFetch(url, { credentials: 'include' });
        return resp.ok ? resp.text() : null;
    }

    async function getBytes(url) {
        var d = deps();
        var resp = await timedFetch(url, { credentials: 'include' });
        if (!resp.ok) return null;
        var declared = Number(resp.headers && resp.headers.get ? resp.headers.get('content-length') : NaN);
        if (d.tooLarge(declared)) {
            try { if (resp.body) resp.body.cancel(); } catch (e0) { }
            return null;
        }
        var bytes = new Uint8Array(await resp.arrayBuffer());
        return d.tooLarge(bytes.length) ? null : bytes;
    }

    async function apiVersions() {
        var r = await getJson('/d2l/api/versions/');
        var pick = function (code, fallback) {
            var p = Array.isArray(r.body) ? r.body.find(function (x) { return x && x.ProductCode === code; }) : null;
            return p && p.LatestVersion ? p.LatestVersion : fallback;
        };
        return { le: pick('le', '1.75'), lp: pick('lp', '1.43') };
    }

    function addFile(ctx, segments, data) {
        var path = ctx.name(segments);
        ctx.out.entries.push({ path: path, bytes: typeof data === 'string' ? new TextEncoder().encode(data) : data });
        return path;
    }

    // Downloads each file into dir; returns links (or "not saved" notes) for the page in pageDir.
    async function saveFiles(ctx, files, dir, pageDir) {
        var items = [];
        for (var i = 0; i < files.length; i++) {
            throwIfAborted();
            var f = files[i];
            var bytes = await getBytes(f.url);
            if (bytes) {
                var path = addFile(ctx, dir.concat([f.name]), bytes);
                items.push('<li><a href="' + esc(relLink(pageDir, path)) + '">' + esc(f.name) + '</a></li>');
            } else {
                ctx.out.failed.push(f.name);
                items.push('<li>' + esc(f.name) + ' (could not be downloaded)</li>');
            }
        }
        return items.length ? '<ul>' + items.join('') + '</ul>' : '';
    }

    async function collectAnnouncements(ctx) {
        var r = await getJson(ctx.api + '/news/');
        if (!Array.isArray(r.body)) { ctx.out.notes.push('Announcements could not be read (' + r.status + ').'); return; }
        var items = r.body.filter(function (n) { return n && !n.IsHidden; }).sort(byDate('StartDate', true));
        if (!items.length) return;
        var parts = [];
        for (var i = 0; i < items.length; i++) {
            throwIfAborted();
            var n = items[i];
            ctx.status('Saving announcement ' + (i + 1) + ' / ' + items.length + '...');
            var files = (n.Attachments || []).map(function (a) {
                return { name: a.FileName || 'attachment', url: ctx.api + '/news/' + n.Id + '/attachments/' + a.FileId };
            });
            parts.push('<article class="item"><h2>' + esc(n.Title || 'Untitled') + '</h2><p class="meta">' + esc(when(n.StartDate)) + '</p>'
                + await richHtml(n.Body && (n.Body.Html || esc(n.Body.Text || '')))
                + (files.length ? '<p class="meta">Attachments</p>' + await saveFiles(ctx, files, ['Announcements', 'Attachments'], 'Announcements') : '')
                + '</article>');
        }
        addFile(ctx, ['Announcements', 'Announcements.html'], htmlPage('Announcements', ctx.course, parts.join(''), ctx.savedIso));
        ctx.out.counts.announcements = items.length;
    }

    function feedbackHtml(fb, denominator) {
        if (!fb) return null;
        var score = fb.Score != null ? 'Score: ' + fb.Score + (denominator ? ' / ' + denominator : '') : '';
        var symbol = fb.GradedSymbol ? 'Grade: ' + fb.GradedSymbol : '';
        var text = fb.Feedback && (fb.Feedback.Html || esc(fb.Feedback.Text || ''));
        if (!score && !symbol && !text && !(fb.Files || []).length) return null;
        return { meta: [score, symbol].filter(Boolean).join(', '), text: text || '' };
    }

    // The student's own group in a group category; DTU Learn lists every group with its members.
    async function myGroupId(ctx, categoryId) {
        if (!(categoryId in ctx.groups)) {
            var r = await getJson('/d2l/api/lp/' + ctx.lp + '/' + ctx.ou + '/groupcategories/' + categoryId + '/groups/');
            var mine = (Array.isArray(r.body) ? r.body : []).find(function (g) {
                return (g.Enrollments || []).map(String).indexOf(String(ctx.me)) !== -1;
            });
            ctx.groups[categoryId] = mine ? String(mine.GroupId) : '';
        }
        return ctx.groups[categoryId];
    }

    // "Open inline feedback" links on a history page: /folderInlineFeedback/ou/folder/entity/submission/file.
    function inlineFeedbackTargets(html) {
        var out = [];
        var re = /\/d2l\/dropbox\/user\/folderInlineFeedback\/\d+\/\d+\/(\d+)\/(\d+)\/(\d+)/g;
        var m;
        while ((m = re.exec(String(html || '')))) out.push({ entity: m[1], submission: m[2], file: m[3] });
        return out;
    }

    // Teacher's pen notes on a submitted PDF: saved as a copy of the PDF with the notes in it.
    async function saveInlineFeedback(ctx, folder, targets, dir, pageDir) {
        var ink = globalThis.DTUAfterDarkPdfInk;
        var seen = new Set();
        var items = [];
        for (var i = 0; i < targets.length; i++) {
            var t = targets[i];
            if (seen.has(String(t.file))) continue;
            seen.add(String(t.file));
            throwIfAborted();
            var r = await getJson(ctx.api + '/dropbox/folders/' + folder.Id + '/entities/' + t.entity + '/submissions/' + t.submission + '/files/' + t.file + '/annotatedpdf');
            if (!r.body) continue;
            var list = [];
            try { list = (JSON.parse(r.body.AnnotationData || '{}').annotations) || []; } catch (e0) { list = []; }
            if (!list.length) continue;
            var name = String(r.body.FileName || 'submission.pdf').replace(/\.pdf$/i, '') + ' - with feedback.pdf';
            var pdf = r.body.FileUri ? await getBytes(r.body.FileUri) : null;
            var merged = null;
            var why = pdf ? '' : 'the PDF could not be downloaded';
            if (pdf && ink) {
                try { merged = await ink.addFeedbackAnnotations(pdf, list); } catch (err) { why = err && err.message ? err.message : 'unreadable PDF'; }
            }
            if (!merged || !merged.drawn) {
                ctx.out.notes.push('"' + (folder.Name || 'Assignment') + '": the teacher\'s notes on ' + (r.body.FileName || 'your PDF') + ' could not be saved (' + (why || 'only note kinds this download cannot copy') + '); open it on DTU Learn.');
                continue;
            }
            var path = addFile(ctx, dir.concat(['Feedback', name]), merged.bytes);
            items.push('<li><a href="' + esc(relLink(pageDir, path)) + '">' + esc(name) + '</a>'
                + (merged.skipped ? ' (' + merged.skipped + ' note' + (merged.skipped === 1 ? '' : 's') + ' of another kind not included; open it on DTU Learn)' : '')
                + (merged.notes && merged.notes.length ? '<ul>' + merged.notes.map(function (n) {
                    return '<li>Page ' + n.page + ': ' + esc(n.text).replace(/\n/g, '<br>') + '</li>';
                }).join('') + '</ul>' : '') + '</li>');
        }
        return items.length ? '<ul>' + items.join('') + '</ul>' : '';
    }

    async function collectAssignments(ctx) {
        var r = await getJson(ctx.api + '/dropbox/folders/');
        if (!Array.isArray(r.body)) { ctx.out.notes.push('Assignments could not be read (' + r.status + ').'); return; }
        var folders = r.body.filter(function (f) { return f && !f.IsHidden; });
        for (var i = 0; i < folders.length; i++) {
            throwIfAborted();
            var f = folders[i];
            ctx.status('Saving assignment ' + (i + 1) + ' / ' + folders.length + '...');
            var dir = ['Assignments', f.Name || 'Assignment'];
            var pageDir = dir.map(function (s) { return deps().sanitize(s, 'untitled'); }).join('/');
            var base = ctx.api + '/dropbox/folders/' + f.Id;
            var body = '<p class="meta">' + (f.DueDate ? 'Due ' + esc(when(f.DueDate)) : 'No due date') + (f.GroupTypeId ? ', group assignment' : '') + '</p>';
            var instructions = f.CustomInstructions && (f.CustomInstructions.Html || esc(f.CustomInstructions.Text || ''));
            if (instructions) body += '<h2>Instructions</h2>' + await richHtml(instructions);
            var given = (f.Attachments || []).map(function (a) { return { name: a.FileName || 'attachment', url: base + '/attachments/' + a.FileId }; });
            if (given.length) body += '<h2>Files from the teacher</h2>' + await saveFiles(ctx, given, dir.concat(['From the teacher']), pageDir);
            var links = (f.LinkAttachments || []).filter(function (l) { return l && l.Href; });
            if (links.length) body += '<ul>' + links.map(function (l) { return '<li><a href="' + esc(absUrl(l.Href)) + '">' + esc(l.LinkName || l.Href) + '</a></li>'; }).join('') + '</ul>';

            var mine = await getJson(base + '/submissions/mysubmissions/');
            var submitted = '';
            var feedback = null;
            var feedbackFiles = [];
            var inline = [];
            if (Array.isArray(mine.body)) {
                for (var e = 0; e < mine.body.length; e++) {
                    var entity = mine.body[e] || {};
                    var entityId = entity.Entity && entity.Entity.EntityId;
                    var subs = (entity.Submissions || []).slice().sort(byDate('SubmissionDate'));
                    for (var s = 0; s < subs.length; s++) {
                        var sub = subs[s];
                        var prefix = subs.length > 1 ? 'Submission ' + (s + 1) + ' - ' : '';
                        var files = (sub.Files || []).map(function (file) {
                            if (/\.pdf$/i.test(file.FileName || '')) inline.push({ entity: entityId, submission: sub.Id, file: file.FileId });
                            return { name: prefix + (file.FileName || 'file'), url: base + '/submissions/' + sub.Id + '/files/' + file.FileId };
                        });
                        submitted += '<div class="item"><p class="meta">Submitted ' + esc(when(sub.SubmissionDate)) + '</p>'
                            + (sub.Comment && (sub.Comment.Html || sub.Comment.Text) ? await richHtml(sub.Comment.Html || esc(sub.Comment.Text)) : '')
                            + await saveFiles(ctx, files, dir.concat(['Your submission']), pageDir) + '</div>';
                    }
                    if (entity.Feedback && entity.Entity) {
                        feedback = entity.Feedback;
                        var et = String(entity.Entity.EntityType || 'user').toLowerCase();
                        feedbackFiles = (feedback.Files || []).map(function (file) {
                            return { name: file.FileName || 'feedback file', url: base + '/feedback/' + et + '/' + entity.Entity.EntityId + '/attachments/' + file.FileId };
                        });
                    }
                }
            } else {
                // The submissions API refuses a student on group folders and some individual ones; the
                // folder's history page (with the student's group id) lists the same files and the
                // inline feedback links, and the feedback API answers for the user or the group.
                var group = f.GroupTypeId ? await myGroupId(ctx, f.GroupTypeId) : '';
                if (f.GroupTypeId && !group) {
                    ctx.out.notes.push('"' + (f.Name || 'Assignment') + '": you are not in a group for this assignment.');
                } else if (ctx.me || group) {
                    var history = await getText('/d2l/lms/dropbox/user/folders_history.d2l?db=' + f.Id + (group ? '&grpid=' + group : '') + '&isprv=0&bp=0&ou=' + ctx.ou);
                    var found = historyFileLinks(history).map(function (u) {
                        return { name: decodeURIComponent((u.split('?')[0].split('/').pop() || 'file')), url: u };
                    });
                    if (found.length) submitted = '<div class="item">' + await saveFiles(ctx, found, dir.concat(['Your submission']), pageDir) + '</div>';
                    inline = inline.concat(inlineFeedbackTargets(history));
                    var who = group ? 'group/' + group : 'user/' + ctx.me;
                    var fbr = await getJson(base + '/feedback/' + who);
                    if (fbr.body) {
                        feedback = fbr.body;
                        feedbackFiles = (feedback.Files || []).map(function (file) {
                            return { name: file.FileName || 'feedback file', url: base + '/feedback/' + who + '/attachments/' + file.FileId };
                        });
                    }
                }
            }
            var marked = await saveInlineFeedback(ctx, f, inline, dir, pageDir);
            var rubrics = '';
            var rubricList = (f.Assessment && f.Assessment.Rubrics) || [];
            for (var ri = 0; ri < rubricList.length; ri++) rubrics += await rubricHtml(ctx, f, rubricList[ri]);
            body += '<h2>Your submission</h2>' + (submitted || '<p class="meta">Nothing submitted, or DTU Learn does not show it.</p>');
            var fb = feedbackHtml(feedback, f.Assessment && f.Assessment.ScoreDenominator);
            if (fb || feedbackFiles.length || marked) {
                body += '<h2>Feedback</h2>' + (fb && fb.meta ? '<p class="meta">' + esc(fb.meta) + '</p>' : '') + (fb ? await richHtml(fb.text) : '')
                    + await saveFiles(ctx, feedbackFiles, dir.concat(['Feedback']), pageDir)
                    + (marked ? '<p class="meta">The teacher\'s notes written on your PDF</p>' + marked : '');
            }
            if (rubrics) body += '<h2>Rubric</h2>' + rubrics;
            addFile(ctx, dir.concat(['Assignment.html']), htmlPage(f.Name || 'Assignment', ctx.course, body, ctx.savedIso));
        }
        ctx.out.counts.assignments = folders.length;
    }

    // Rich text D2L gives as {Text, Html}: the HTML cleaned, else the plain text.
    async function richOrText(x) {
        if (!x) return '';
        return x.Html ? await richHtml(x.Html) : (x.Text ? '<p>' + esc(x.Text).replace(/\n/g, '<br>') + '</p>' : '');
    }

    // The rubric the teacher marked the assignment with: your level per criterion, the
    // level's description and the feedback. Points only where the teacher shows them.
    async function rubricHtml(ctx, folder, rubric) {
        if (!rubric || rubric.Visibility === 2) return '';
        var r = await getJson(ctx.api + '/assessment?assessmentType=Rubric&objectType=Dropbox&objectId=' + folder.Id
            + '&rubricId=' + rubric.RubricId + '&userId=' + ctx.me);
        var a = r.body;
        if (!a || !(a.CriteriaOutcome || []).length) return '';
        var showPoints = rubric.IsScoreVisibleToAssessedUsers !== false;
        function points(n) { return showPoints && typeof n === 'number' ? ' (' + n + ' point' + (n === 1 ? '' : 's') + ')' : ''; }
        var rows = [];
        for (var i = 0; i < a.CriteriaOutcome.length; i++) {
            var o = a.CriteriaOutcome[i];
            var crit = null;
            var group = null;
            (rubric.CriteriaGroups || []).forEach(function (g) {
                (g.Criteria || []).forEach(function (c) { if (c.Id === o.CriterionId) { crit = c; group = g; } });
            });
            if (!crit) continue;
            var level = (group.Levels || []).find(function (l) { return l.Id === o.LevelId; });
            var cell = (crit.Cells || []).find(function (c) { return c.LevelId === o.LevelId; });
            var feedback = await richOrText(o.Feedback);
            if (!feedback && cell) feedback = await richOrText(cell.Feedback);
            rows.push('<tr><td>' + esc(crit.Name || '') + '</td><td class="mark">' + esc(level ? level.Name : 'Not assessed') + points(o.Score) + '</td>'
                + '<td>' + (cell ? await richOrText(cell.Description) : '') + '</td><td>' + feedback + '</td></tr>');
        }
        var overall = a.OverallOutcome || {};
        var overallLevel = (rubric.OverallLevels || []).find(function (l) { return l.Id === overall.LevelId; });
        return '<h3>' + esc(rubric.Name || 'Rubric') + '</h3>'
            + (overallLevel ? '<p class="meta">Overall: ' + esc(overallLevel.Name) + points(overall.Score) + '</p>' : '')
            + await richOrText(overall.Feedback)
            + '<table class="grid"><tr><th>Criterion</th><th>Your level</th><th>What the level means</th><th>Feedback</th></tr>' + rows.join('') + '</table>';
    }

    async function collectGrades(ctx) {
        var r = await getJson(ctx.api + '/grades/values/myGradeValues/');
        if (!Array.isArray(r.body)) { ctx.out.notes.push('Grades could not be read (' + r.status + ').'); return; }
        if (!r.body.length) return;
        var rows = [];
        for (var i = 0; i < r.body.length; i++) {
            var g = r.body[i] || {};
            var pts = typeof g.PointsNumerator === 'number' ? g.PointsNumerator + (typeof g.PointsDenominator === 'number' ? ' / ' + g.PointsDenominator : '') : '';
            var name = esc(g.GradeObjectName || 'Grade item');
            rows.push('<tr><td>' + (g.GradeObjectTypeName === 'Category' ? '<b>' + name + '</b>' : name) + '</td><td>' + esc(pts) + '</td><td>' + esc(g.DisplayedGrade || '')
                + '</td><td>' + await richOrText(g.Comments) + '</td></tr>');
        }
        addFile(ctx, ['Grades', 'Grades.html'], htmlPage('Grades', ctx.course,
            '<table class="grid"><tr><th>Grade item</th><th>Points</th><th>Grade</th><th>Comments</th></tr>' + rows.join('') + '</table>', ctx.savedIso));
        ctx.out.counts.grades = r.body.length;
    }

    function richField(x) {
        if (!x || x.IsDisplayed === false || !x.Text) return '';
        return x.Text.Html || esc(x.Text.Text || '');
    }

    async function quizInfoBody(q) {
        var facts = [];
        if (q.StartDate) facts.push('Opens ' + when(q.StartDate));
        if (q.DueDate) facts.push('Due ' + when(q.DueDate));
        if (q.EndDate) facts.push('Closes ' + when(q.EndDate));
        var limit = q.SubmissionTimeLimit;
        if (limit && limit.IsEnforced && limit.TimeLimitValue) facts.push('Time limit ' + limit.TimeLimitValue + ' minutes');
        var tries = q.AttemptsAllowed;
        if (tries) facts.push(tries.IsUnlimited ? 'Unlimited attempts' : (tries.NumberOfAttemptsAllowed ? tries.NumberOfAttemptsAllowed + ' attempt' + (tries.NumberOfAttemptsAllowed === 1 ? '' : 's') + ' allowed' : ''));
        var text = [richField(q.Description), richField(q.Instructions)].filter(Boolean);
        var body = '<p class="meta">Not taken. DTU Learn shows the questions only after you start the quiz.</p>'
            + (facts.filter(Boolean).length ? '<ul>' + facts.filter(Boolean).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '');
        for (var i = 0; i < text.length; i++) body += await richHtml(text[i]);
        return body;
    }

    async function collectQuizzes(ctx) {
        var quizzes = [];
        var next = ctx.api + '/quizzes/';
        for (var guard = 0; next && guard < 50; guard++) {
            var r = await getJson(next);
            if (!r.body) { ctx.out.notes.push('Quizzes could not be read (' + r.status + ').'); return; }
            quizzes = quizzes.concat(r.body.Objects || []);
            next = r.body.Next || null;
        }
        var saved = 0;
        for (var i = 0; i < quizzes.length; i++) {
            throwIfAborted();
            var q = quizzes[i];
            ctx.status('Saving quiz ' + (i + 1) + ' / ' + quizzes.length + '...');
            if (q.IsActive === false) continue;
            var list = await getText('/d2l/lms/quizzing/user/quiz_submissions.d2l?qi=' + q.QuizId + '&ou=' + ctx.ou);
            var links = quizAttemptLinks(list);
            if (!links.length) {
                // Not taken: DTU Learn shows the questions only after Start, which uses an attempt and may
                // start the clock, so save what the quiz page shows before that.
                addFile(ctx, ['Quizzes', (q.Name || 'Quiz') + '.html'], htmlPage(q.Name || 'Quiz', ctx.course, await quizInfoBody(q), ctx.savedIso));
                saved++;
                continue;
            }
            for (var a = 0; a < links.length; a++) {
                throwIfAborted();
                var html = await getText('/d2l/lms/quizzing/user/' + links[a]);
                if (!html) { ctx.out.failed.push((q.Name || 'Quiz') + ' attempt ' + (a + 1)); continue; }
                var title = (q.Name || 'Quiz') + (links.length > 1 ? ' - attempt ' + (a + 1) : '');
                addFile(ctx, ['Quizzes', title + '.html'], htmlPage(title, ctx.course, await quizAttemptBody(html), ctx.savedIso));
                saved++;
            }
        }
        ctx.out.counts.quizzes = saved;
    }

    async function collectDiscussions(ctx) {
        var r = await getJson(ctx.api + '/discussions/forums/');
        if (!Array.isArray(r.body)) { ctx.out.notes.push('Discussions could not be read (' + r.status + ').'); return; }
        var forums = r.body.filter(function (x) { return x && !x.IsHidden; });
        if (!forums.length) return;
        var roles = {};
        var cl = await getJson(ctx.api + '/classlist/');
        (Array.isArray(cl.body) ? cl.body : []).forEach(function (u) {
            if (u && u.Identifier != null) roles[String(u.Identifier)] = u.ClasslistRoleDisplayName || '';
        });
        var saved = 0;
        for (var i = 0; i < forums.length; i++) {
            var forum = forums[i];
            var tr = await getJson(ctx.api + '/discussions/forums/' + forum.ForumId + '/topics/');
            var topics = (Array.isArray(tr.body) ? tr.body : []).filter(function (t) { return t && !t.IsHidden; });
            for (var t = 0; t < topics.length; t++) {
                throwIfAborted();
                var topic = topics[t];
                ctx.status('Saving discussion ' + (forum.Name || '') + ': ' + (topic.Name || '') + '...');
                var pr = await getJson(ctx.api + '/discussions/forums/' + forum.ForumId + '/topics/' + topic.TopicId + '/posts/');
                var posts = Array.isArray(pr.body) ? pr.body : [];
                var entries = discussionEntries(posts, roles, ctx.me);
                if (!entries.length) continue;
                var parts = [];
                for (var p = 0; p < entries.length; p++) {
                    var en = entries[p];
                    parts.push('<article class="item" style="margin-left:' + Math.min(en.depth, 4) * 24 + 'px">'
                        + (en.subject ? '<h2>' + esc(en.subject) + '</h2>' : '')
                        + '<p class="meta">' + esc(en.author) + ', ' + esc(when(en.date)) + '</p>'
                        + await richHtml(en.html)
                        + (en.files.length ? '<p class="meta">Attachments</p>' + await saveFiles(ctx, en.files.map(function (a) {
                            return { name: a.name, url: ctx.api + '/discussions/forums/' + forum.ForumId + '/topics/' + topic.TopicId + '/posts/' + en.id + '/attachments/' + a.id };
                        }), ['Discussions', 'Attachments'], 'Discussions') : '')
                        + '</article>');
                }
                var title = (forum.Name || 'Forum') + ' - ' + (topic.Name || 'Topic');
                addFile(ctx, ['Discussions', title + '.html'], htmlPage(title, ctx.course, parts.join(''), ctx.savedIso));
                saved++;
            }
        }
        ctx.out.counts.discussions = saved;
    }

    var COLLECTORS = { announcements: collectAnnouncements, assignments: collectAssignments, quizzes: collectQuizzes, discussions: collectDiscussions, grades: collectGrades };

    // Returns { entries: [{path, bytes}], notes, failed, counts }. Entries carry ZIP paths
    // with folders, already unique.
    async function collectCourseActivity(orgUnitId, kinds, onStatus) {
        var d = deps();
        var out = { entries: [], notes: [], failed: [], counts: {} };
        if (!orgUnitId) { out.notes.push('Course activity was not saved: the course id could not be read from this page.'); return out; }
        var v = { le: '1.75', lp: '1.43' };
        var who = { body: null };
        try {
            v = await apiVersions();
            who = await getJson('/d2l/api/lp/' + v.lp + '/users/whoami');
        } catch (err) {
            if (isAbort(err)) throw err;
            out.notes.push('Course activity was not saved: ' + (err && err.message ? err.message : 'DTU Learn did not answer') + '.');
            return out;
        }
        var ctx = {
            ou: orgUnitId,
            api: '/d2l/api/le/' + v.le + '/' + orgUnitId,
            lp: v.lp,
            groups: {},
            me: who.body && who.body.Identifier != null ? String(who.body.Identifier) : '',
            course: (d.courseTitle && d.courseTitle()) || 'DTU Learn course',
            savedIso: new Date().toISOString(),
            name: makeNamer(d.sanitize),
            status: typeof onStatus === 'function' ? onStatus : function () { },
            out: out
        };
        for (var i = 0; i < KINDS.length; i++) {
            if (kinds.indexOf(KINDS[i].key) === -1) continue;
            throwIfAborted();
            try {
                await COLLECTORS[KINDS[i].key](ctx);
            } catch (err) {
                if (isAbort(err)) throw err;
                out.notes.push(KINDS[i].label + ' could not be saved (' + (err && err.message ? err.message : 'error') + ').');
            }
        }
        return out;
    }

    try {
        globalThis.DTUAfterDarkLessonsBulkActivity = {
            KINDS: KINDS,
            FORWARD_NOTE: FORWARD_NOTE,
            collectCourseActivity: collectCourseActivity,
            discussionEntries: discussionEntries,
            quizAttemptLinks: quizAttemptLinks,
            historyFileLinks: historyFileLinks,
            relLink: relLink,
            makeNamer: makeNamer,
            htmlPage: htmlPage
        };
    } catch (eActivity) { }
})();
