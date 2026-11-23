// Videos in course content: size text, Brightspace-hosted videos read like DTU Learn's player.
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readSource } from './_harness.mjs';

function loadVideo(routes) {
    const calls = [];
    const fetch = async (url, opts = {}) => {
        calls.push({ url, opts });
        for (const [re, make] of routes) if (re.test(url)) return make(url, opts);
        return new Response('nope', { status: 404 });
    };
    const sb = { fetch, Response, URL, Map, Promise, Date, Number, String, Uint8Array, Math, Error, encodeURIComponent,
        location: { origin: 'https://learn.inside.dtu.dk' }, localStorage: { getItem: () => 'csrf' } };
    sb.globalThis = sb;
    vm.runInNewContext(readSource('darkmode.lessons-bulk.video.js'), sb);
    return { video: sb.DTUAfterDarkLessonsBulkVideo, calls, sb };
}

const json = (body) => () => new Response(JSON.stringify(body), { status: 200 });
const hosted = { type: 'ContentService', url: 'd2l:brightspace:content:eu-west-1:t:video:c/latest', title: 'Lecture 1' };
const routes = (props, rev) => [
    [/oauth2\/token$/, json({ access_token: 'tok', expires_at: Date.now() / 1000 + 3600 })],
    [/\/d2l\/api\/hm\/content\/9\/files\/5$/, json({ properties: props })],
    [/revisions\/latest\/resources/, json({ 'transcodes:signed-urls': [{ value: 'https://content.eu-west-1.content-service.brightspace.com/x/source.mp4?Signature=s' }] })],
    [/revisions\/latest\?/, json(rev)],
    [/source\.mp4/, () => new Response(new Uint8Array([1, 2, 3]), { status: 200 })],
    [/\/content\/enforced\/.*\.mp4$/, () => new Response(new Uint8Array([0]), { status: 206, headers: { 'content-range': 'bytes 0-0/137139650' } })]
];
const okProps = { allowDownload: true, contentServiceEndpoint: 'https://api.eu-west-1.content-service.brightspace.com', tenantId: 't', contentServiceContentId: 'c' };
const okRev = { extension: '.mp4', metadata: { revisionSize: 52291127 } };

test('section summary: file and hosted videos counted with sizes, other topics ignored', async () => {
    const { video } = loadVideo(routes(okProps, okRev));
    const s = await video.summarize('9', [
        { topicId: '5', entry: hosted },
        { topicId: '6', entry: { type: 'File', url: '/content/enforced/9-x/L01 - 46 min.mp4' } },
        { topicId: '7', entry: { type: 'File', url: '/content/enforced/9-x/slides.pdf' } },
        { topicId: '8', entry: { type: 'Link', url: 'https://youtu.be/x' } }
    ]);
    assert.deepEqual({ ...s }, { count: 2, bytes: 52291127 + 137139650, unknown: 0 });
    assert.equal(video.describe(s), '2 videos, 189 MB');
    assert.equal(video.describe({ count: 1, bytes: 2.4e9, unknown: 1 }), '1 video, over 2.4 GB');
    assert.equal(video.describe({ count: 0, bytes: 0, unknown: 0 }), '');
});

function withDocument(sb) {
    const clicks = [];
    sb.document = { body: { appendChild() {} }, createElement: () => { const a = { style: {}, remove() {}, click() { clicks.push({ href: a.href, download: a.download }); } }; return a; } };
    return clicks;
}

test('videos are saved as separate downloads: hosted ones through their signed link, files with their name', async () => {
    const { video, calls, sb } = loadVideo(routes(okProps, okRev));
    const clicks = withDocument(sb);
    assert.equal((await video.saveVideo({ orgUnitId: '9', topicId: '5', name: 'Lecture 1' })).ok, true);
    assert.ok(calls.some((c) => /revisions\/latest\?contextType=topic&contextId=5%3A9$/.test(c.url)), 'the player\'s context id');
    assert.ok(!calls.some((c) => /source\.mp4/.test(c.url)), 'the video itself is not fetched into memory');
    assert.equal((await video.saveVideo({ url: '/content/enforced/9-x/L01.mp4', name: 'L01.mp4' })).ok, true);
    assert.deepEqual(clicks.map((c) => ({ ...c })), [
        { href: 'https://content.eu-west-1.content-service.brightspace.com/x/source.mp4?Signature=s', download: 'Lecture 1' },
        { href: 'https://learn.inside.dtu.dk/content/enforced/9-x/L01.mp4', download: 'L01.mp4' }
    ]);
    assert.equal(video.isVideoUrl('https://learn.inside.dtu.dk/content/enforced/9/a%20b.mp4'), true);
    assert.equal(video.isVideoUrl('https://learn.inside.dtu.dk/content/enforced/9/a.pdf'), false);
});

test('hosted video: not saved when the teacher blocks downloads, or the endpoint is not Brightspace', async () => {
    const blocked = loadVideo(routes({ ...okProps, allowDownload: false }, okRev));
    const clicks = withDocument(blocked.sb);
    assert.equal((await blocked.video.saveVideo({ orgUnitId: '9', topicId: '5', name: 'L' })).reason, 'download-not-allowed');
    assert.equal(await blocked.video.videoSize('9', '5', hosted), 0, 'a blocked video adds no size');
    assert.equal(clicks.length, 0);
    const evil = loadVideo(routes({ ...okProps, contentServiceEndpoint: 'https://evil.example' }, okRev));
    withDocument(evil.sb);
    assert.equal((await evil.video.saveVideo({ orgUnitId: '9', topicId: '5', name: 'L' })).ok, false);
    assert.ok(!evil.calls.some((c) => /evil/.test(c.url)), 'the token went to a non-Brightspace host');
});
