import assert from 'node:assert/strict';
import test from 'node:test';
import { extractFunctions, loadModuleInternals, makeLocalStorage } from './_harness.mjs';

function fixture({ homepage = true } = {}) {
    let enabled = false;
    let present = true;
    const element = (initial = {}) => {
        const attrs = new Map(Object.entries(initial));
        const e = { writes: 0, textContent: 'Atomic Search',
            getAttribute: k => attrs.get(k) ?? null,
            setAttribute(k, v) { e.writes++; attrs.set(k, String(v)); },
            removeAttribute(k) { e.writes++; attrs.delete(k); },
            style: { setProperty(k, v, priority) { e.writes++; attrs.set('style', `${k}: ${v}${priority ? ' !' + priority : ''};`); } }
        };
        return e;
    };
    const widget = element({ style: 'padding: 3px;' });
    const nav = element({ style: 'order: 2;' });
    const link = element({ href: '/d2l/lms/lti/launch.d2l?rcode=dtu-644730' });
    link.closest = () => nav;
    const atomic = { closest: () => widget };
    const { api } = loadModuleInternals('darkmode.deadlines.js', ['enforceCourseSearchVisibility'], {
        window: { location: { hostname: 'test.invalid' }, addEventListener() {} },
        document: { addEventListener() {}, querySelector: () => present ? atomic : null },
        DTUAfterDarkDeadlinesDeps: {
            isSearchWidgetEnabled: () => enabled,
            isDTULearnHomepage: () => homepage,
            deepQueryAll: selector => selector.includes('navigation') ? [link] : []
        }
    });
    return { api, widget, nav, enable(v) { enabled = v; }, present(v) { present = v; } };
}

test('Course Search defaults off and accepts only a stored true', () => {
    const storage = makeLocalStorage();
    const { api } = extractFunctions('darkmode.bus.js', ['isSearchWidgetEnabled'], {
        globals: { localStorage: storage, SEARCH_WIDGET_ENABLED_KEY: 'search' }
    });
    assert.equal(api.isSearchWidgetEnabled(), false);
    for (const v of ['false', 'yes', '1', '{}']) {
        storage.setItem('search', v);
        assert.equal(api.isSearchWidgetEnabled(), false);
    }
    storage.setItem('search', 'true');
    assert.equal(api.isSearchWidgetEnabled(), true);
});
test('off hides native navigation and widget, on restores their exact inline styles', () => {
    const f = fixture();
    f.api.enforceCourseSearchVisibility();
    assert.equal(f.widget.getAttribute('style'), 'display: none !important;');
    assert.equal(f.nav.getAttribute('aria-hidden'), 'true');
    f.enable(true);
    f.api.enforceCourseSearchVisibility();
    assert.equal(f.widget.getAttribute('style'), 'padding: 3px;');
    assert.equal(f.nav.getAttribute('style'), 'order: 2;');
    assert.equal(f.nav.getAttribute('aria-hidden'), null);
});
test('idle passes write nothing whether Course Search is off or on', () => {
    const f = fixture();
    for (const enabled of [false, true]) {
        f.enable(enabled); f.api.enforceCourseSearchVisibility();
        f.widget.writes = f.nav.writes = 0;
        for (let i = 0; i < 10; i++) f.api.enforceCourseSearchVisibility();
        assert.equal(f.widget.writes + f.nav.writes, 0);
    }
});
test('course pages hide navigation without changing homepage widget styling', () => {
    const f = fixture({ homepage: false });
    f.api.enforceCourseSearchVisibility();
    assert.equal(f.nav.getAttribute('aria-hidden'), 'true');
    assert.equal(f.widget.getAttribute('style'), 'padding: 3px;');
});
test('a late-mounted search widget is hidden on the next pass', () => {
    const f = fixture();
    f.present(false); f.api.enforceCourseSearchVisibility();
    assert.equal(f.widget.writes, 0);
    f.present(true); f.api.enforceCourseSearchVisibility();
    assert.equal(f.widget.getAttribute('style'), 'display: none !important;');
});
