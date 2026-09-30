import assert from 'node:assert/strict';
import test from 'node:test';
import { extractFunctions } from './_harness.mjs';

function fixture() {
    const keyHandlers = new Set();
    const document = { activeElement: null, addEventListener(k, fn) { if (k === 'keydown') keyHandlers.add(fn); }, removeEventListener(k, fn) { keyHandlers.delete(fn); } };
    function element(tag) {
        return {
            tag, children: [], attrs: {}, listeners: {}, parentNode: null,
            style: { overflow: '', setProperty() {} },
            setAttribute(k, v) { this.attrs[k] = String(v); },
            getAttribute(k) { return this.attrs[k] ?? null; },
            appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
            remove() { this.parentNode.children = this.parentNode.children.filter(c => c !== this); this.parentNode = null; },
            addEventListener(k, fn) { this.listeners[k] = fn; },
            focus() { document.activeElement = this; }, select() {}, getClientRects() { return [1]; },
            contains(e) { return e === this || this.children.some(c => c.contains(e)); },
            querySelectorAll(selector) {
                const all = this.children.flatMap(c => [c, ...c.querySelectorAll('*')]);
                if (selector === '*') return all;
                if (selector === 'button' || selector === 'input') return all.filter(c => c.tag === selector);
                return all.filter(c => c.tag === 'button' || c.tag === 'input');
            },
            querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
            get firstChild() { return this.children[0] || null; }
        };
    }
    document.body = element('body'); document.documentElement = element('html');
    document.body.style.overflow = 'auto'; document.documentElement.style.overflow = 'scroll';
    document.createElement = element;
    document.querySelector = () => document.body.children.find(c => c.className === 'dtu-paused-url-rules-modal') || null;
    const opener = element('button'); opener.isConnected = true; opener.focus();
    const mockWindow = { location: { origin: 'https://learn.inside.dtu.dk', pathname: '/d2l/home', href: 'https://learn.inside.dtu.dk/d2l/home?private=value' } };
    const { api } = extractFunctions('darkmode.settings.js', ['showPausedUrlRulesModal', 'removePausedUrlRulesModal', 'getAfterDarkDebugIdeasMailtoHref', 'createAfterDarkDisclaimerFooter'], {
        globals: {
            document, window: mockWindow, getAfterDarkDisclaimerText: () => 'Unofficial extension.',
            isTopWindow: () => true, isDarkModeEnabled: () => true, getCurrentUrlWithoutHash: () => 'https://learn.inside.dtu.dk/d2l/home',
            markExt() {}, hideSettingsModal() {}, showSettingsModal() {}, requestAnimationFrame: fn => fn(),
            getUrlPausePatterns: () => [], buildSuggestedPausePatternsForCurrentUrl: () => [], normalizeUrlPausePattern: v => v,
            getMatchingUrlPausePatterns: () => [], setTimeout: fn => fn()
        }
    });
    api.showPausedUrlRulesModal();
    const overlay = document.querySelector(); const modal = overlay.children[0];
    return { api, mockWindow, document, modal, overlay, opener, keyHandlers, key(key, shiftKey = false) {
        const e = { key, shiftKey, preventDefault() { this.prevented = true; }, stopPropagation() {} };
        for (const fn of keyHandlers) fn(e);
        if (!keyHandlers.size) overlay.listeners.keydown?.(e);
        return e;
    } };
}

test('paused URL dialog has a name, a labelled input and live status', () => {
    const f = fixture();
    assert.equal(f.modal.getAttribute('role'), 'dialog');
    assert.equal(f.modal.getAttribute('aria-modal'), 'true');
    assert.ok(f.modal.getAttribute('aria-labelledby'));
    assert.ok(f.modal.querySelector('input').getAttribute('aria-label'));
    assert.equal(f.modal.querySelectorAll('*').filter(e => e.getAttribute('role') === 'status').length, 1);
});

test('paused URL dialog wraps Tab and Shift+Tab within its controls', () => {
    const f = fixture(); const controls = f.modal.querySelectorAll('button, input');
    controls.at(-1).focus(); assert.equal(f.key('Tab').prevented, true); assert.equal(f.document.activeElement, controls[0]);
    controls[0].focus(); assert.equal(f.key('Tab', true).prevented, true); assert.equal(f.document.activeElement, controls.at(-1));
    f.opener.focus(); f.key('Tab'); assert.equal(f.document.activeElement, controls[0]);
});

test('closing paused URLs restores scroll and focus, and removes its key handler', () => {
    const f = fixture(); assert.equal(f.document.body.style.overflow, 'hidden');
    f.key('Escape');
    assert.equal(f.document.querySelector(), null); assert.equal(f.keyHandlers.size, 0);
    assert.equal(f.document.body.style.overflow, 'auto'); assert.equal(f.document.documentElement.style.overflow, 'scroll');
    assert.equal(f.document.activeElement, f.opener);
});

test('feedback prepares an email with no automatic page or stored data', () => {
    const f = fixture(); const url = new URL(f.api.getAfterDarkDebugIdeasMailtoHref());
    assert.equal(url.protocol, 'mailto:'); assert.equal(url.pathname, 'daniel-yttesen@hotmail.com');
    assert.equal(url.searchParams.get('subject'), 'DTU After Dark - Debug/Ideas');
    assert.equal(url.searchParams.get('body'), 'Hi Daniel,\n\nPage URL:\n\nIdea or issue:\n');
});

test('feedback activation opens the prepared draft without adding page context', () => {
    const f = fixture(); const footer = f.api.createAfterDarkDisclaimerFooter();
    const button = footer.querySelectorAll('button').find(e => e.getAttribute('aria-label') === 'Send feedback or bug report by email');
    assert.equal(button.type, 'button');
    button.listeners.click({ preventDefault() {}, stopPropagation() {} });
    const draft = new URL(f.mockWindow.location.href);
    assert.equal(draft.protocol, 'mailto:');
    assert.equal(draft.searchParams.get('body'), 'Hi Daniel,\n\nPage URL:\n\nIdea or issue:\n');
    assert.doesNotMatch(draft.searchParams.get('body'), /private=value|learn\.inside/);
});
