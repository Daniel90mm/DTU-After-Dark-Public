import assert from 'node:assert/strict';
import test from 'node:test';
import { readSource } from './_harness.mjs';

// Contract: every feature flag has a key name, every key name has a Settings toggle,
// and every toggle is drawn in the dialog. A new flag cannot ship without a checkbox.
test('every feature flag default has a Settings toggle that is drawn and saves the flag', () => {
    const flags = readSource('darkmode.feature-flags.js');
    const host = readSource('darkmode.js');
    const settings = readSource('darkmode.settings.js');

    const defaultsBlock = flags.match(/const FEATURE_FLAG_DEFAULTS = \{([\s\S]*?)\};/)[1];
    const defaultConsts = [...defaultsBlock.matchAll(/\[(FEATURE_\w+_KEY)\]/g)].map((m) => m[1]);
    assert.ok(defaultConsts.length >= 15, 'defaults parsed');

    const keysBlock = host.match(/getFeatureKeys: function \(\) \{\s*return \{([\s\S]*?)\};/)[1];
    const nameOf = new Map([...keysBlock.matchAll(/(\w+): (FEATURE_\w+_KEY)/g)].map((m) => [m[2], m[1]]));

    const listBlock = settings.match(/\[\s*(\{ id: 'feature-content-shortcut-toggle'[\s\S]*?)\]\.forEach\(function \(ft\)/)[1];
    const toggles = new Map([...listBlock.matchAll(/id: '([\w-]+)', key: featureKeys\.(\w+)/g)].map((m) => [m[2], m[1]]));

    for (const constant of defaultConsts) {
        const name = nameOf.get(constant);
        assert.ok(name, `${constant} has no getFeatureKeys name`);
        const id = toggles.get(name);
        assert.ok(id, `${name} has no Settings toggle`);
        const uses = settings.split(`'${id}'`).length - 1;
        assert.ok(uses >= 2, `${id} is registered but never drawn in the dialog`);
    }
    assert.match(settings, /onChange: function \(checked\) \{\s*setFeatureFlagEnabled\(ft\.key, checked\);/);
});
