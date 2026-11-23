// Videos in course content: the size text in the Download course panel, and saving videos as
// separate downloads. Brightspace-hosted videos (ContentService topics) have no file URL on DTU
// Learn; they are read the way DTU Learn's own player reads them: a session token, the file's
// content-service record (size, allowDownload), then a signed link valid for an hour.
(function () {
    'use strict';

    var VIDEO_EXT_RE = /\.(?:mp4|m4v|mov|webm|avi|mkv)(?:$|[?#])/i;
    // Bearer tokens and signed links are only used on Brightspace's own hosts.
    var BRIGHTSPACE_RE = /^https:\/\/[a-z0-9.-]+\.brightspace\.com(?:\/|$)/i;
    var token = null;
    var sizes = new Map();

    function isHostedVideo(entry) {
        return !!entry && /^contentservice$/i.test(entry.type) && /:video:/i.test(entry.url);
    }

    function isFileVideo(entry) {
        return !!entry && /^file$/i.test(entry.type) && VIDEO_EXT_RE.test(entry.url);
    }

    function origin() { return globalThis.location.origin; }

    // Firefox makes a content script's fetch as the extension, and Brightspace's video hosts refuse
    // that (NetworkError); content.fetch is the page's own fetch there. Chrome has no content.fetch.
    function pageFetch(url, opts) {
        var page = globalThis.content;
        if (page && typeof page.fetch === 'function' && typeof globalThis.cloneInto === 'function') {
            return page.fetch(url, globalThis.cloneInto(opts || {}, page));
        }
        return globalThis.fetch(url, opts);
    }

    async function bearer() {
        if (token && token.until > Date.now()) return token.value;
        var resp = await pageFetch(origin() + '/d2l/lp/auth/oauth2/token', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Csrf-Token': globalThis.localStorage.getItem('XSRF.Token') || '' },
            body: 'scope=*:*:*'
        });
        if (!resp.ok) throw new Error('DTU Learn gave no video token (' + resp.status + ')');
        var body = await resp.json();
        token = { value: body.access_token, until: Number(body.expires_at) * 1000 - 60000 };
        return token.value;
    }

    async function getJson(url, auth) {
        var resp = await pageFetch(url, { headers: { Authorization: 'Bearer ' + auth, Accept: 'application/json' } });
        if (!resp.ok) throw new Error('video record ' + resp.status);
        return resp.json();
    }

    // The content-service record of a hosted video: where its revision lives, its size, whether
    // the teacher allows downloading it.
    async function hostedRecord(ou, topicId) {
        var auth = await bearer();
        var file = await getJson(origin() + '/d2l/api/hm/content/' + ou + '/files/' + topicId, auth);
        var p = (file && file.properties) || {};
        var endpoint = String(p.contentServiceEndpoint || '');
        if (!BRIGHTSPACE_RE.test(endpoint) || !p.tenantId || !p.contentServiceContentId) throw new Error('not a hosted video');
        var base = endpoint.replace(/\/$/, '') + '/api/' + encodeURIComponent(p.tenantId) + '/content/' + encodeURIComponent(p.contentServiceContentId) + '/revisions/latest';
        var query = '?contextType=topic&contextId=' + encodeURIComponent(topicId + ':' + ou);
        var rev = await getJson(base + query, auth);
        var bytes = Number(rev && rev.metadata && rev.metadata.revisionSize);
        return { auth: auth, base: base, query: query, allowed: p.allowDownload !== false, bytes: bytes > 0 ? bytes : null, ext: String((rev && rev.extension) || '.mp4') };
    }

    // Bytes of one video topic, or null when unknown; 0 for a hosted video the teacher does not let
    // students download (it is not saved, so it adds nothing).
    function videoSize(ou, topicId, entry) {
        var key = ou + ':' + topicId;
        if (!sizes.has(key)) {
            sizes.set(key, (async function () {
                if (isHostedVideo(entry)) {
                    var rec = await hostedRecord(ou, topicId);
                    return rec.allowed ? rec.bytes : 0;
                }
                var resp = await pageFetch(new URL(entry.url, origin()).href, { credentials: 'include', headers: { Range: 'bytes=0-0' } });
                try { if (resp.body) resp.body.cancel(); } catch (e0) { }
                var total = /\/(\d+)\s*$/.exec(resp.headers.get('content-range') || '');
                if (total) return Number(total[1]);
                var len = Number(resp.headers.get('content-length'));
                return resp.status === 200 && len > 1 ? len : null;
            })().catch(function (e) {
                console.warn('[DTU After Dark] video size not read for topic ' + topicId + ': ' + (e && e.message || e));
                return null;
            }));
        }
        return sizes.get(key);
    }

    // Count and total size of the videos among topic entries ({topicId, entry}), one request at a
    // time. unknown: videos whose size could not be read.
    async function summarize(ou, items) {
        var out = { count: 0, bytes: 0, unknown: 0 };
        for (var i = 0; i < items.length; i++) {
            var entry = items[i].entry;
            if (!isHostedVideo(entry) && !isFileVideo(entry)) continue;
            var size = await videoSize(ou, items[i].topicId, entry);
            if (size === 0) continue;
            out.count++;
            if (size == null) out.unknown++;
            else out.bytes += size;
        }
        return out;
    }

    function formatSize(bytes) {
        if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
        if (bytes >= 1e6) return Math.round(bytes / 1e6) + ' MB';
        return Math.max(1, Math.round(bytes / 1e3)) + ' KB';
    }

    // "3 videos, 410 MB" for a section's meta line, '' without videos.
    function describe(summary) {
        if (!summary || !summary.count) return '';
        var text = summary.count + ' video' + (summary.count === 1 ? '' : 's');
        if (summary.bytes) return text + ', ' + (summary.unknown ? 'over ' : '') + formatSize(summary.bytes);
        return text + ', size unknown';
    }

    // Videos are not put in the ZIP: the ZIP is built in memory, and a few lectures of 1 GB or more
    // would crash the tab. Each video becomes its own browser download instead, which the browser
    // streams to disk. A plain file uses its DTU Learn URL with a download name; a hosted video uses
    // its signed link, which Brightspace serves as an attachment.
    function clickDownload(url, name) {
        var a = globalThis.document.createElement('a');
        a.href = url;
        if (name) a.download = name;
        a.rel = 'noopener';
        a.style.display = 'none';
        globalThis.document.body.appendChild(a);
        a.click();
        a.remove();
    }

    async function hostedVideoLink(ou, topicId) {
        var rec = await hostedRecord(ou, topicId);
        if (!rec.allowed) return { ok: false, reason: 'download-not-allowed' };
        var res = await getJson(rec.base + '/resources' + rec.query + '&resourceTypes=transcodes:signed-urls&disposition=attachment', rec.auth);
        var signed = res && res['transcodes:signed-urls'] && res['transcodes:signed-urls'][0];
        var url = signed && String(signed.value || '');
        if (!url || !BRIGHTSPACE_RE.test(url)) return { ok: false, reason: 'no-video-link' };
        return { ok: true, url: url };
    }

    // video: {url, name} for a file video or {orgUnitId, topicId, name} for a hosted one.
    async function saveVideo(video) {
        try {
            if (video.url) {
                clickDownload(new URL(video.url, origin()).href, video.name);
                return { ok: true };
            }
            var link = await hostedVideoLink(video.orgUnitId, video.topicId);
            if (link.ok) clickDownload(link.url, video.name);
            return link;
        } catch (e) {
            return { ok: false, reason: 'video', error: String(e && e.message || e) };
        }
    }

    globalThis.DTUAfterDarkLessonsBulkVideo = {
        isHostedVideo: isHostedVideo,
        isFileVideo: isFileVideo,
        videoSize: videoSize,
        summarize: summarize,
        formatSize: formatSize,
        describe: describe,
        isVideoUrl: function (url) { return VIDEO_EXT_RE.test(String(url || '')); },
        saveVideo: saveVideo
    };
})();
