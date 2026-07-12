#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const distDir = path.join(repoRoot, 'dist');

const sourceFiles = [
    'background.js',
    'config.js',
    'darkmode.js',
    'darkmode.dark-engine.js',
    'darkmode.learn-accent-shell.js',
    'darkmode.smart-room-linker.js',
    'darkmode.textbooks.js',
    'darkmode.learn-nav.js',
    'darkmode.learn-shell.js',
    'darkmode.settings.js',
    'darkmode.bus.js',
    'darkmode.campusnet-gpa.js',
    'darkmode.content-shortcut.js',
    'darkmode.deadlines.js',
    'darkmode.host-shells.js',
    'darkmode.kurser-course-eval.js',
    'darkmode.kurser-widgets.js',
    'darkmode.library.js',
    'darkmode.lessons-bulk.js',
    'darkmode.participant-intel-backfill.js',
    'darkmode.participant-intel-core.js',
    'darkmode.participant-intel-host.js',
    'darkmode.participant-intel-ui.js',
    'darkmode.studyplanner-shell.js',
    'darkmode.studyplan-runtime.js',
    'darkmode.studyplan-exams.js',
    'darkmode.css'
];

const targets = {
    firefox: {
        manifest: 'manifest.json',
        permissionKey: 'permissions',
        unpacked: 'firefox-unpacked',
        zip: 'dtu-dark-mode-firefox.zip'
    },
    chrome: {
        manifest: 'manifest_chrome.json',
        permissionKey: 'host_permissions',
        unpacked: 'chrome-unpacked',
        zip: 'dtu-dark-mode-chrome.zip'
    }
};

const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let value = n;
        for (let bit = 0; bit < 8; bit++) {
            value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
        }
        table[n] = value >>> 0;
    }
    return table;
})();

function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
    const year = Math.max(1980, date.getFullYear());
    return {
        time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
        date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
}

async function listFiles(rootDir, currentDir = rootDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    const files = [];
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) files.push(...await listFiles(rootDir, fullPath));
        if (entry.isFile()) files.push({
            fullPath,
            entryName: path.relative(rootDir, fullPath).split(path.sep).join('/')
        });
    }
    return files;
}

async function writeZip(sourceDir, zipPath) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const file of await listFiles(sourceDir)) {
        const [data, stat] = await Promise.all([fs.readFile(file.fullPath), fs.stat(file.fullPath)]);
        const compressed = deflateRawSync(data, { level: 9 });
        const name = Buffer.from(file.entryName, 'utf8');
        const checksum = crc32(data);
        const stamp = dosDateTime(stat.mtime);

        const localHeader = Buffer.alloc(30);
        localHeader.writeUInt32LE(0x04034b50, 0);
        localHeader.writeUInt16LE(20, 4);
        localHeader.writeUInt16LE(0x0800, 6);
        localHeader.writeUInt16LE(8, 8);
        localHeader.writeUInt16LE(stamp.time, 10);
        localHeader.writeUInt16LE(stamp.date, 12);
        localHeader.writeUInt32LE(checksum, 14);
        localHeader.writeUInt32LE(compressed.length, 18);
        localHeader.writeUInt32LE(data.length, 22);
        localHeader.writeUInt16LE(name.length, 26);
        localParts.push(localHeader, name, compressed);

        const centralHeader = Buffer.alloc(46);
        centralHeader.writeUInt32LE(0x02014b50, 0);
        centralHeader.writeUInt16LE(20, 4);
        centralHeader.writeUInt16LE(20, 6);
        centralHeader.writeUInt16LE(0x0800, 8);
        centralHeader.writeUInt16LE(8, 10);
        centralHeader.writeUInt16LE(stamp.time, 12);
        centralHeader.writeUInt16LE(stamp.date, 14);
        centralHeader.writeUInt32LE(checksum, 16);
        centralHeader.writeUInt32LE(compressed.length, 20);
        centralHeader.writeUInt32LE(data.length, 24);
        centralHeader.writeUInt16LE(name.length, 28);
        centralHeader.writeUInt32LE(offset, 42);
        centralParts.push(centralHeader, name);

        offset += localHeader.length + name.length + compressed.length;
    }

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const entryCount = centralParts.length / 2;
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entryCount, 8);
    end.writeUInt16LE(entryCount, 10);
    end.writeUInt32LE(centralSize, 12);
    end.writeUInt32LE(offset, 16);

    await fs.writeFile(zipPath, Buffer.concat([...localParts, ...centralParts, end]));
}

function readTargetNames() {
    const requested = process.argv.slice(2);
    if (!requested.length || requested.includes('all')) return Object.keys(targets);
    const invalid = requested.filter((name) => !targets[name]);
    if (invalid.length) {
        throw new Error(`Unknown build target: ${invalid.join(', ')}. Use firefox, chrome, or all.`);
    }
    return [...new Set(requested)];
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

function configValue(configText, key) {
    const match = configText.match(new RegExp(`\\b${key}\\s*:\\s*["']([^"']+)["']`, 'm'));
    return match ? match[1].trim() : '';
}

async function prepareConfig(tempDir, manifest, permissionKey, targetName) {
    const baseConfig = await fs.readFile(path.join(repoRoot, 'config.js'), 'utf8');
    const localPath = path.join(repoRoot, 'config.local.js');
    let outputConfig = baseConfig;

    if (await fileExists(localPath)) {
        const localConfig = await fs.readFile(localPath, 'utf8');
        outputConfig = /\b(?:const|let|var)\s+CONFIG\b/.test(localConfig)
            ? localConfig
            : `${baseConfig.replace(/\s*$/, '')}\n\n${localConfig}`;

        const permissions = Array.isArray(manifest[permissionKey]) ? manifest[permissionKey] : [];
        const urls = localConfig.match(/https:\/\/[^"'\s]+/g) || [];
        for (const rawUrl of urls) {
            try {
                const url = new URL(rawUrl);
                const permission = `${url.protocol}//${url.host}/*`;
                if (!permissions.includes(permission)) permissions.push(permission);
            } catch {
                // Ignore malformed URLs in local overrides, matching the PowerShell builders.
            }
        }
        manifest[permissionKey] = permissions;
    }

    await fs.writeFile(path.join(tempDir, 'config.js'), outputConfig);

    const libraryUrl = configValue(outputConfig, 'LIVE_LIBRARY_TRENDS_URL');
    if (libraryUrl) {
        let endpoint = 'configured endpoint';
        try { endpoint = new URL(libraryUrl).host; } catch { }
        console.log(`Library occupancy endpoint included for ${targetName}: ${endpoint}`);
    } else {
        const warning = `LIVE_LIBRARY_TRENDS_URL is empty; Library occupancy graph/counts will be unavailable in this ${targetName} build.`;
        if (process.env.DTU_AFTER_DARK_REQUIRE_LIBRARY_TRENDS === '1') throw new Error(warning);
        console.warn(`Warning: ${warning}`);
    }
}

async function buildTarget(targetName) {
    const target = targets[targetName];
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `dtu-${targetName}-build-`));
    const unpackedDir = path.join(distDir, target.unpacked);
    const zipPath = path.join(distDir, target.zip);

    try {
        const manifest = JSON.parse(await fs.readFile(path.join(repoRoot, target.manifest), 'utf8'));

        for (const file of sourceFiles) {
            if (file === 'config.js') continue;
            await fs.copyFile(path.join(repoRoot, file), path.join(tempDir, file));
        }
        await fs.cp(path.join(repoRoot, 'images'), path.join(tempDir, 'images'), { recursive: true });
        await prepareConfig(tempDir, manifest, target.permissionKey, targetName);
        await fs.writeFile(path.join(tempDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

        await fs.mkdir(distDir, { recursive: true });
        await fs.rm(unpackedDir, { recursive: true, force: true });
        await fs.rm(zipPath, { force: true });
        await fs.cp(tempDir, unpackedDir, { recursive: true });

        await writeZip(tempDir, zipPath);

        console.log(`${targetName} ZIP built successfully: ${zipPath}`);
        console.log(`${targetName} unpacked build written to: ${unpackedDir}`);
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}

for (const targetName of readTargetNames()) {
    await buildTarget(targetName);
}
