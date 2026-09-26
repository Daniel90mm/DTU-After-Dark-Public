// Shared loaders for the plain-JS extension modules.
//
// The modules are IIFEs with no exports, so tests reach their internals two ways:
//   loadModuleInternals  - run the whole file in a sandbox and expose named
//                          functions just before the closing `})();`.
//   extractFunctions     - lift single function declarations out of a file whose
//                          top level is too heavy to boot (darkmode.js).
import fs from 'node:fs';
import vm from 'node:vm';

export const ROOT = new URL('../', import.meta.url);

export function readSource(file) {
    return fs.readFileSync(new URL(file, ROOT), 'utf8');
}

export function makeLocation(href) {
    const url = new URL(href);
    return {
        href: url.href,
        origin: url.origin,
        protocol: url.protocol,
        host: url.host,
        hostname: url.hostname,
        pathname: url.pathname,
        search: url.search,
        hash: url.hash
    };
}

export function makeLocalStorage(initial = {}) {
    const store = new Map(Object.entries(initial));
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => { store.set(key, String(value)); },
        removeItem: (key) => { store.delete(key); },
        clear: () => store.clear()
    };
}

function makeSandbox(globals) {
    const sandbox = {
        URL,
        URLSearchParams,
        TextEncoder,
        TextDecoder,
        Uint8Array,
        Uint32Array,
        ArrayBuffer,
        Blob,
        Map,
        Set,
        Promise,
        JSON,
        Math,
        Date,
        console,
        setTimeout: () => 0,
        clearTimeout: () => {},
        setInterval: () => 0,
        clearInterval: () => {},
        ...globals
    };
    sandbox.globalThis = sandbox;
    if (!sandbox.window) sandbox.window = sandbox;
    return vm.createContext(sandbox);
}

// Runs `file` with `globals` in scope and returns the named inner functions.
export function loadModuleInternals(file, names, globals = {}) {
    const source = readSource(file);
    const tail = /\}\)\(\);\s*$/;
    if (!tail.test(source)) throw new Error(`${file} does not end with an IIFE close`);
    const exposed = names
        .map((name) => `${JSON.stringify(name)}: typeof ${name} === 'function' ? ${name} : undefined`)
        .join(',\n');
    const patched = source.replace(tail, `globalThis.__testApi = {\n${exposed}\n};\n})();`);
    const context = makeSandbox(globals);
    vm.runInContext(patched, context, { filename: file });
    const api = context.__testApi;
    for (const name of names) {
        if (typeof api[name] !== 'function') throw new Error(`${file}: ${name} not found`);
    }
    return { api, context };
}

// Returns the source text of `function name(...) { ... }` in `source`.
// Skips strings, template literals, comments and regex literals while matching
// braces, which is enough for the declarations these tests lift.
export function sliceFunctionSource(source, name) {
    const header = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
    const found = header.exec(source);
    if (!found) throw new Error(`function ${name} not found`);
    let i = source.indexOf('{', found.index + found[0].length);
    // Parameter lists here never contain braces, so the first `{` opens the body.
    let depth = 0;
    let lastSignificant = '{';
    for (; i < source.length; i++) {
        const ch = source[i];
        const next = source[i + 1];
        if (ch === '/' && next === '/') {
            i = source.indexOf('\n', i);
            if (i < 0) break;
            continue;
        }
        if (ch === '/' && next === '*') {
            i = source.indexOf('*/', i + 2) + 1;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') {
            i++;
            while (i < source.length && source[i] !== ch) {
                if (source[i] === '\\') i++;
                i++;
            }
            lastSignificant = ch;
            continue;
        }
        if (ch === '/' && /[(,=:[!&|?{};+\-*%<>~^]|^$/.test(lastSignificant)) {
            i++;
            let inClass = false;
            while (i < source.length) {
                const c = source[i];
                if (c === '\\') { i += 2; continue; }
                if (c === '[') inClass = true;
                else if (c === ']') inClass = false;
                else if (c === '/' && !inClass) break;
                i++;
            }
            lastSignificant = '/';
            continue;
        }
        if (ch === '{') depth++;
        if (ch === '}') {
            depth--;
            if (depth === 0) return source.slice(found.index, i + 1);
        }
        if (!/\s/.test(ch)) {
            // `return /re/` and friends: treat a keyword end as an operator position.
            lastSignificant = ch;
            if (/[a-z]/.test(ch)) {
                const word = source.slice(Math.max(0, i - 6), i + 1);
                if (/(?:^|[^A-Za-z0-9_$])(?:return|typeof|case)$/.test(word)) lastSignificant = '(';
            }
        }
    }
    throw new Error(`function ${name}: unbalanced braces`);
}

// Evaluates the named declarations (plus `prelude`) together in one sandbox.
export function extractFunctions(file, names, { globals = {}, prelude = '' } = {}) {
    const source = readSource(file);
    const body = names.map((name) => sliceFunctionSource(source, name)).join('\n\n');
    const exposed = names.map((name) => `${JSON.stringify(name)}: ${name}`).join(',\n');
    const context = makeSandbox(globals);
    vm.runInContext(`${prelude}\n${body}\nglobalThis.__testApi = {\n${exposed}\n};`, context, { filename: file });
    return { api: context.__testApi, context };
}

// Converts sandbox-realm values to plain host values so deepStrictEqual works.
export function plain(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
