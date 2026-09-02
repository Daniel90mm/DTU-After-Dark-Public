import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readManifest(name) {
  return JSON.parse(readFileSync(path.join(projectRoot, name), 'utf8'));
}

test('Firefox and Chrome release manifests ship together as version 8.0.0', () => {
  const firefox = readManifest('manifest.json');
  const chrome = readManifest('manifest_chrome.json');

  assert.equal(firefox.version, '8.0.0');
  assert.equal(chrome.version, '8.0.0');
  assert.equal(chrome.version, firefox.version);
  assert.deepEqual(
    firefox.browser_specific_settings?.gecko?.data_collection_permissions?.required,
    ['none']
  );
  assert.equal(
    firefox.browser_specific_settings?.gecko_android?.strict_min_version,
    '142.0'
  );
});
