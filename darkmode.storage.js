(function () {
    'use strict';

    function getExtensionStorageArea() {
        try {
            if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
                return { api: 'browser', area: browser.storage.local };
            }
        } catch (e) { }
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                return { api: 'chrome', area: chrome.storage.local };
            }
        } catch (e) { }
        return null;
    }

    function storageLocalGet(defaults, cb) {
        var storage = getExtensionStorageArea();
        if (!storage) {
            if (cb) cb(Object.assign({}, defaults));
            return;
        }
        try {
            if (storage.api === 'browser') {
                storage.area.get(defaults).then(function (result) {
                    cb(result || Object.assign({}, defaults));
                }).catch(function () {
                    cb(Object.assign({}, defaults));
                });
            } else {
                storage.area.get(defaults, function (result) {
                    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
                        cb(Object.assign({}, defaults));
                        return;
                    }
                    cb(result || Object.assign({}, defaults));
                });
            }
        } catch (e) {
            cb(Object.assign({}, defaults));
        }
    }

    // Resolves once the write is done (or failed), so a caller can reload
    // without losing it.
    function storageLocalSet(items) {
        var storage = getExtensionStorageArea();
        if (!storage) return Promise.resolve();
        return new Promise(function (resolve) {
            try {
                if (storage.api === 'browser') {
                    storage.area.set(items).then(resolve, function (e) {
                        console.warn('DTU After Dark: storage write failed', e);
                        resolve();
                    });
                } else {
                    storage.area.set(items, function () { resolve(); });
                }
            } catch (e) {
                console.warn('DTU After Dark: storage write failed', e);
                resolve();
            }
        });
    }

    globalThis.DTUAfterDarkStorage = {
        getExtensionStorageArea: getExtensionStorageArea,
        storageLocalGet: storageLocalGet,
        storageLocalSet: storageLocalSet
    };
})();
