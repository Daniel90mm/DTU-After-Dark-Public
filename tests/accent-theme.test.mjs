import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { extractFunctions, makeLocalStorage, plain, readSource, ROOT } from './_harness.mjs';

const SRC = readSource('darkmode.js');

function sliceConst(name) {
    const start = SRC.indexOf(`const ${name} = `);
    if (start < 0) throw new Error(`const ${name} not found`);
    const opener = SRC[start + `const ${name} = `.length];
    const close = opener === '{' ? '\n    };' : opener === '[' ? '\n    ];' : ';';
    const end = SRC.indexOf(close, start) + close.length;
    return 'var ' + SRC.slice(start + 'const '.length, end);
}

const PRELUDE = [
    'ACCENT_THEME_KEY', 'ACCENT_CUSTOM_HEX_KEY', 'ACCENT_THEME_DEFAULT', 'ACCENT_CUSTOM_DEFAULT',
    'ACCENT_THEMES', 'ACCENT_THEME_ORDER', 'STATUS_THEME'
].map(sliceConst).join('\n') + `
    var _accentThemeId = ACCENT_THEME_DEFAULT;
    var _accentCustomHex = ACCENT_CUSTOM_DEFAULT;
    var darkModeEnabled = true;
    var __writes = [];
    function storageLocalSet(items) { __writes.push(items); }
    function replaceLogoImage() {}
    function syncAccentThemeUi() {}
    function __state() { return { id: _accentThemeId, hex: _accentCustomHex, writes: __writes }; }
`;

function load() {
    const props = new Map();
    const documentElement = { style: { setProperty: (k, v) => props.set(k, v) } };
    const localStorage = makeLocalStorage();
    const { api, context } = extractFunctions('darkmode.js', [
        'normalizeAccentThemeId', 'parseHexColorToRgb', 'clampByte', 'rgbToHex', 'mixRgb',
        'lightenHex', 'darkenHex', 'normalizeHexColor', 'relativeLuminanceFromRgb',
        'getContrastTextForHex', 'getAccentBarTextForHex', 'getReadableAccentTextHex', 'getAccentForSurfaceHex', 'hexToRgbTriplet', 'computeCustomAccentTheme',
        'getAccentThemeById', 'applyAccentThemeVars', 'setAccentCustomHex', 'setAccentThemeId'
    ], { prelude: PRELUDE, globals: { document: { documentElement }, localStorage } });
    api.__state = () => context.__state();
    return { api, props, localStorage };
}

function contrast(a, b, api) {
    const la = api.relativeLuminanceFromRgb(api.parseHexColorToRgb(a));
    const lb = api.relativeLuminanceFromRgb(api.parseHexColorToRgb(b));
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

test('every preset in the menu order exists, and every theme is in the order', () => {
    const { api } = load();
    const themes = new Function(`${sliceConst('ACCENT_THEMES')}; return ACCENT_THEMES;`)();
    const order = new Function(`${sliceConst('ACCENT_THEME_ORDER')}; return ACCENT_THEME_ORDER;`)();
    assert.deepEqual([...order].sort(), Object.keys(themes).sort());
    for (const [id, t] of Object.entries(themes)) {
        for (const k of ['accent', 'accentHover', 'accentDeep', 'accentDeepHover', 'accentSoft', 'accentBorder']) {
            assert.ok(api.parseHexColorToRgb(t[k]), `${id}.${k} is not a hex colour: ${t[k]}`);
        }
        assert.ok(t.label, `${id} has a label`);
    }
});

test('theme ids: aliases map to DTU presets, unknown ids fall back to DTU red', () => {
    const { api } = load();
    assert.equal(api.normalizeAccentThemeId('ocean_blue'), 'dtu_blue');
    assert.equal(api.normalizeAccentThemeId('teal'), 'dtu_bright_green');
    assert.equal(api.normalizeAccentThemeId(' dtu_pink '), 'dtu_pink');
    assert.equal(api.normalizeAccentThemeId('custom'), 'custom');
    assert.equal(api.normalizeAccentThemeId('corporate-red'), 'dtu_red');
    assert.equal(api.normalizeAccentThemeId(''), 'dtu_red');
    assert.equal(api.normalizeAccentThemeId('__proto__'), 'dtu_red');
});

test('hex colours normalise to lower-case #rrggbb and reject junk', () => {
    const { api } = load();
    assert.equal(api.normalizeHexColor('#ABC', null), '#aabbcc');
    assert.equal(api.normalizeHexColor('1FD082', null), '#1fd082');
    assert.equal(api.normalizeHexColor('red', null), null);
    assert.equal(api.normalizeHexColor('#12345', '#990000'), '#990000');
    assert.equal(api.normalizeHexColor('url(x)', null), null);
});

test('custom themes derive every shade from the picked colour, and bad input falls back', () => {
    const { api } = load();
    const t = plain(api.computeCustomAccentTheme('#1FD082'));
    assert.equal(t.accent, '#1fd082');
    assert.ok(contrast(t.accentDeep, '#000000', api) < contrast(t.accent, '#000000', api), 'deep is darker');
    assert.ok(contrast(t.accentSoft, '#000000', api) > contrast(t.accent, '#000000', api), 'soft is lighter');
    assert.equal(plain(api.computeCustomAccentTheme('nope')).accent, '#990000');
});

test('contrast text picks black on light colours and white on dark ones', () => {
    const { api } = load();
    assert.equal(api.getContrastTextForHex('#f6d04d'), '#000000');
    assert.equal(api.getContrastTextForHex('#990000'), '#ffffff');
    assert.equal(api.getContrastTextForHex('garbage'), '#ffffff');
});

test('choosing a preset sets the CSS variables and saves to both stores', () => {
    const { api, props, localStorage } = load();
    api.setAccentThemeId('dtu_blue');
    assert.equal(props.get('--dtu-ad-accent'), '#2f3eea');
    assert.equal(props.get('--dtu-ad-accent-rgb'), '47,62,234');
    assert.equal(props.get('--dtu-ad-accent-on'), '#ffffff');
    assert.equal(localStorage.getItem('dtuAfterDarkAccentThemeV1'), 'dtu_blue');
    assert.deepEqual(plain(api.__state().writes), [{ dtuAfterDarkAccentThemeV1: 'dtu_blue' }]);
});

test('noStorage applies and remembers locally without an extension-storage write', () => {
    const { api, props, localStorage } = load();
    api.setAccentThemeId('custom', { noStorage: true });
    api.setAccentCustomHex('#00FF00', { noStorage: true });
    assert.equal(props.get('--dtu-ad-accent'), '#00ff00');
    assert.equal(localStorage.getItem('dtuAfterDarkAccentCustomHexV1'), '#00ff00');
    assert.deepEqual(plain(api.__state().writes), []);
});

test('an invalid custom colour is ignored entirely', () => {
    const { api } = load();
    api.setAccentCustomHex('javascript:alert(1)');
    assert.equal(api.__state().hex, '#990000');
    assert.deepEqual(plain(api.__state().writes), []);
});

test('the Settings colour picker previews on input and saves only on change', () => {
    const s = readSource('darkmode.settings.js');
    assert.match(s, /color\.addEventListener\('input', function \(\) \{ onPickCustomColor\(false\); \}\);/);
    assert.match(s, /color\.addEventListener\('change', function \(\) \{ onPickCustomColor\(true\); \}\);/);
    assert.match(s, /var opts = persist \? undefined : \{ noStorage: true \};/);
    assert.match(s, /callDep\('setAccentThemeId', \[nextId, opts\], null\)/);
    assert.match(s, /callDep\('setAccentCustomHex', \[nextHex, opts\], null\)/);
    assert.doesNotMatch(s, /'corporate-red'/);
});

test('text on accent bars stays white unless it would fall below 4:1', () => {
    const { api } = load();
    const themes = new Function(`${sliceConst('ACCENT_THEMES')}; return ACCENT_THEMES;`)();
    const expectBlack = new Set(['dtu_yellow', 'dtu_grey', 'dtu_pink']);
    for (const [id, t] of Object.entries(themes)) {
        const on = api.getAccentBarTextForHex(t.accentDeep);
        assert.equal(on, expectBlack.has(id) ? '#000000' : '#ffffff', `${id} on ${t.accentDeep}`);
        assert.ok(contrast(on, t.accentDeep, api) >= 4, `${id}: ${on} on ${t.accentDeep}`);
        // Hover reuses the resting colour; it must still clear 3:1 (bold/large text).
        assert.ok(contrast(on, t.accentDeepHover, api) >= 3, `${id} hover: ${on} on ${t.accentDeepHover}`);
    }
    assert.equal(api.getAccentBarTextForHex('#ffff00'), '#000000', 'a light custom colour gets black text');
    assert.equal(api.getAccentBarTextForHex('bogus'), '#ffffff');
});

test('applying a theme publishes the on-colours for the deep shades', () => {
    const { api, props } = load();
    api.setAccentThemeId('dtu_yellow');
    assert.equal(props.get('--dtu-ad-accent-deep-on'), '#000000');
    assert.equal(props.get('--dtu-ad-accent-deep-hover-on'), '#000000');
    api.setAccentThemeId('dtu_orange');
    assert.equal(props.get('--dtu-ad-accent-deep-on'), '#ffffff');
});

test('no rule puts hard-coded white text on an accent background', () => {
    const files = fs.readdirSync(ROOT).filter((f) => /^darkmode.*\.(js|css)$/.test(f));
    const BG = /background(?:-color)?\s*:\s*var\(--dtu-ad-accent(?:-deep)?(?:-hover)?\)/;
    const WHITE = /(?<![-\w])color\s*:\s*(#ffffff|#fff\b|white)/i;
    const offenders = [];
    for (const f of files) {
        const src = readSource(f);
        for (const m of src.matchAll(/\{([^{}]*)\}/g)) {
            if (BG.test(m[1]) && WHITE.test(m[1])) offenders.push(`${f}:${src.slice(0, m.index).split('\n').length}`);
        }
        for (const m of src.matchAll(/'[^'\n]*background[^'\n]*var\(--dtu-ad-accent[^'\n]*'/g)) {
            if (WHITE.test(m[0])) offenders.push(`${f}:${src.slice(0, m.index).split('\n').length}`);
        }
    }
    assert.deepEqual(offenders, [], 'use var(--dtu-ad-accent-on) / var(--dtu-ad-accent-deep-on) instead');
});

test('the Grey contrast warning is gone now that text adapts', () => {
    assert.doesNotMatch(readSource('darkmode.settings.js'), /contrast-warning|Contrast warning/);
    assert.doesNotMatch(readSource('darkmode.js'), /data-dtu-accent-contrast-warning/);
});

test('accent text (links, codes) reaches 4.5:1 on both page backgrounds, and passing colours are untouched', () => {
    const { api } = load();
    const themes = new Function(`${sliceConst('ACCENT_THEMES')}; return ACCENT_THEMES;`)();
    for (const [id, t] of Object.entries(themes)) {
        for (const bg of ['#ffffff', '#2d2d2d']) {
            for (const c of [t.accent, t.accentHover]) {
                const out = api.getReadableAccentTextHex(c, bg);
                assert.ok(contrast(out, bg, api) >= 4.5, `${id} ${c} on ${bg} gave ${out}`);
                if (contrast(c, bg, api) >= 4.5) assert.equal(out, c, `${id} ${c} already passes on ${bg}`);
            }
        }
    }
    assert.equal(api.getReadableAccentTextHex('#990000', '#ffffff'), '#990000');
    assert.notEqual(api.getReadableAccentTextHex('#f6d04d', '#ffffff'), '#f6d04d');
});

test('the text token follows dark mode', () => {
    const { api, props } = load();
    api.setAccentThemeId('dtu_red');
    // The test prelude runs in dark mode: red is lightened for the dark panels.
    assert.notEqual(props.get('--dtu-ad-accent-text'), '#990000');
    assert.ok(contrast(props.get('--dtu-ad-accent-text'), '#2d2d2d', api) >= 4.5);
});

test('accent is only used raw as a text colour on shapes, never on words', () => {
    const allowed = [/icon__base/, /fa-circle/, /icon\.style\.setProperty\('color', accentHex/];
    const offenders = [];
    for (const f of fs.readdirSync(ROOT).filter((n) => /^darkmode.*\.(js|css)$/.test(n))) {
        const lines = readSource(f).split('\n');
        lines.forEach((line, i) => {
            if (!/(?<![-\w])color\s*:\s*var\(--dtu-ad-accent(-hover)?\)|setProperty\('color', ?'var\(--dtu-ad-accent(-hover)?\)'/.test(line)) return;
            const ctx = lines.slice(Math.max(0, i - 6), i + 1).join('\n');
            if (!allowed.some((re) => re.test(ctx))) offenders.push(`${f}:${i + 1}`);
        });
    }
    assert.deepEqual(offenders, [], 'use var(--dtu-ad-accent-text) for text');
});

test('light-mode deep-shade links keep DTU Red as is and make Yellow readable', () => {
    const { api, props } = load();
    api.setAccentThemeId('dtu_red');
    assert.equal(props.get('--dtu-ad-accent-deep-text'), '#7d0000');
    api.setAccentThemeId('dtu_yellow');
    assert.ok(contrast(props.get('--dtu-ad-accent-deep-text'), '#ffffff', api) >= 4.5);
});

test('light-mode branches of text colours never use a raw accent shade', () => {
    const offenders = [];
    for (const f of fs.readdirSync(ROOT).filter((n) => /^darkmode.*\.js$/.test(n))) {
        readSource(f).split('\n').forEach((line, i) => {
            if (/'var\(--dtu-ad-accent-soft\)'\s*:\s*'var\(--dtu-ad-accent(-deep)?\)'/.test(line)) offenders.push(`${f}:${i + 1}`);
        });
    }
    assert.deepEqual(offenders, []);
});

test('surface mark accents keep each preset hue and reach 4.5:1 on both widget surfaces', () => {
    const { api, props } = load();
    const expected = {
        dtu_red: ['#ff6b6b', '#990000'],
        dtu_blue: ['#9ca5ff', '#2f3eea'],
        dtu_navy_blue: [null, '#030f4f'],
        dtu_bright_green: ['#1fd082', null],
        dtu_grey: ['#dadada', null]
    };
    for (const id of Object.keys(expected)) {
        api.setAccentThemeId(id);
        const dark = props.get('--dtu-ad-accent-mark-dark');
        const light = props.get('--dtu-ad-accent-mark-light');
        assert.ok(contrast(dark, '#2d2d2d', api) >= 4.5, `${id} dark ${dark}`);
        assert.ok(contrast(light, '#ffffff', api) >= 4.5, `${id} light ${light}`);
        if (expected[id][0]) assert.equal(dark, expected[id][0], `${id} dark`);
        if (expected[id][1]) assert.equal(light, expected[id][1], `${id} light`);
    }
    api.setAccentThemeId('dtu_navy_blue');
    const navy = api.parseHexColorToRgb(props.get('--dtu-ad-accent-mark-dark'));
    assert.ok(navy.b - navy.r > 50, 'navy stays blue on dark instead of draining to grey: ' + props.get('--dtu-ad-accent-mark-dark'));
});
