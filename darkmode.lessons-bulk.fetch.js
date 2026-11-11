(function () {
    'use strict';

    var _lessonsBulkCore = globalThis.DTUAfterDarkLessonsBulkCore;
    var normalizeWhitespace = _lessonsBulkCore.normalizeWhitespace;
    var deepQueryAll = _lessonsBulkCore.deepQueryAll;
    var markExt = _lessonsBulkCore.markExt;
    var logLessonsBulkDebug = _lessonsBulkCore.logLessonsBulkDebug;
    var _lessonsBulkState = globalThis.DTUAfterDarkLessonsBulkState;
    var _lessonsLegacyModuleStructureCache = _lessonsBulkState.legacyModuleStructureCache;

    var _lessonsBulkTree = globalThis.DTUAfterDarkLessonsBulkTree;
    var getLessonsRuntimeDocument = _lessonsBulkTree.getLessonsRuntimeDocument;
    var getLessonsTocHost = _lessonsBulkTree.getLessonsTocHost;
    var getLessonsTreeLabel = _lessonsBulkTree.getLessonsTreeLabel;
    var getLegacyLessonsTreeLabel = _lessonsBulkTree.getLegacyLessonsTreeLabel;
    var isValidLessonsContentId = _lessonsBulkTree.isValidLessonsContentId;
    var getValidLessonsContentId = _lessonsBulkTree.getValidLessonsContentId;

    // Glue for the run loop's abort state.
    function getLessonsBulkFetchDeps() {
        var d = globalThis.DTUAfterDarkLessonsBulkFetchDeps;
        if (!d) throw new Error('DTU After Dark: darkmode.lessons-bulk.js has not set DTUAfterDarkLessonsBulkFetchDeps');
        return d;
    }
    function isLessonsBulkRunAborted() {
        return getLessonsBulkFetchDeps().isLessonsBulkRunAborted();
    }
    function throwIfLessonsBulkAborted() {
        getLessonsBulkFetchDeps().throwIfLessonsBulkAborted();
    }

    var _lessonsTocIndex = _lessonsBulkState.lessonsTocIndex;

    function toAbsoluteSamePageUrl(rawUrl, baseUrl) {
        if (!rawUrl) return '';
        var v = String(rawUrl).trim();
        if (!v || /^javascript:/i.test(v) || /^mailto:/i.test(v)) return '';
        try {
            return new URL(v, baseUrl || window.location.href).toString();
        } catch (e0) {
            return '';
        }
    }

    function decodeEscapedUrlText(rawUrl) {
        if (!rawUrl) return '';
        return String(rawUrl)
            .replace(/&amp;/gi, '&')
            .replace(/&quot;|&#34;|&#x22;/gi, '"')
            .replace(/&apos;|&#39;|&#x27;/gi, "'")
            .replace(/&lt;|&#60;|&#x3c;/gi, '<')
            .replace(/&gt;|&#62;|&#x3e;/gi, '>')
            .replace(/\\u002f/gi, '/')
            .replace(/\\u003a/gi, ':')
            .replace(/\\u003f/gi, '?')
            .replace(/\\u003d/gi, '=')
            .replace(/\\u0026/gi, '&')
            .replace(/\\\//g, '/')
            .replace(/[\u0000-\u001f]/g, '')
            .replace(/^["']+|["')\],;]+$/g, '')
            .trim();
    }

    function isLikelyDownloadUrl(absUrl) {
        if (!absUrl || !/^https?:/i.test(absUrl)) return false;
        try {
            var parsed = new URL(absUrl, window.location.href);
            var host = (parsed.hostname || '').toLowerCase();
            var path = (parsed.pathname || '').toLowerCase();
            var sameHost = host === String(window.location.hostname || '').toLowerCase();

            // Keep downloader scoped to DTU Learn content and avoid Brightspace UI assets.
            if (!sameHost) return false;
            if (/\/d2l\/le\/lessons\//i.test(path)) return false;
            if (/\/d2l\/error\//i.test(path)) return false;
            if (/\/lib\/bsi\//i.test(path)) return false;
            if (/\.(?:svg|css|js|woff2?|ttf|eot)(?:$|[?#])/i.test(path)) return false;

            // Primary DTU Learn file storage path.
            if (/\/content\/enforced\//i.test(path)) return true;

            // Secondary: explicit file URLs only (avoid generic "/download" endpoints that often redirect to 404).
            if (/\.(?:pdf|doc|docx|ppt|pptx|xls|xlsx|zip|rar|7z|txt|csv|md|m|mlx|ipynb|py|java|c|cpp|h|json|xml|jpg|jpeg|png|gif|mp4|mov|webm|avi)(?:$|[?#])/i.test(path)) return true;
        } catch (e0) {
            return false;
        }
        return false;
    }

    function isStrictFileDownloadUrl(absUrl) {
        if (!isLikelyDownloadUrl(absUrl)) return false;
        try {
            var u = new URL(absUrl, window.location.href);
            var p = (u.pathname || '').toLowerCase();
            if (/\/d2l\/error\//i.test(p)) return false;
            if (/\/content\/enforced\//i.test(p)) return true;
            if (/\.(?:pdf|doc|docx|ppt|pptx|xls|xlsx|zip|rar|7z|txt|csv|md|m|mlx|ipynb|py|java|c|cpp|h|json|xml|jpg|jpeg|png|gif|mp4|mov|webm|avi)(?:$|[?#])/i.test(p)) return true;
        } catch (e0) {
            return false;
        }
        return false;
    }

    function getApiObjectId(obj) {
        if (!obj || typeof obj !== 'object') return '';
        var candidates = [
            obj.Id, obj.id, obj.ID,
            obj.ModuleId, obj.moduleId, obj.ModuleID, obj.moduleID, obj.Module_id, obj.module_id,
            obj.UnitId, obj.unitId, obj.UnitID, obj.unitID,
            obj.LessonId, obj.lessonId, obj.LessonID, obj.lessonID,
            obj.FolderId, obj.folderId, obj.FolderID, obj.folderID,
            obj.ObjectId, obj.objectId, obj.ObjectID, obj.objectID,
            obj.ContentObjectId, obj.contentObjectId, obj.ContentObjectID, obj.contentObjectID,
            obj.Identifier, obj.identifier,
            obj.ItemId, obj.itemId, obj.ItemID, obj.itemID
        ];
        for (var i = 0; i < candidates.length; i++) {
            var id = getValidLessonsContentId(candidates[i]);
            if (id) return id;
        }
        return '';
    }

    function getApiTopicId(obj) {
        if (!obj || typeof obj !== 'object') return '';
        var topicCandidates = [
            obj.TopicId, obj.topicId, obj.TopicID, obj.topicID, obj.topic_id,
            obj.TopicIdentifier, obj.topicIdentifier, obj.topic_identifier
        ];
        for (var i = 0; i < topicCandidates.length; i++) {
            var tid = getValidLessonsContentId(topicCandidates[i]);
            if (tid) return tid;
        }

        var typeVal = String(obj.Type || obj.type || obj.ContentObjectType || obj.contentObjectType || obj.ObjectType || '').toLowerCase();
        var id = getApiObjectId(obj);
        if (id && /(topic|file|activity|document)/.test(typeVal) && !/(module|lesson|unit|folder)/.test(typeVal)) return id;
        return '';
    }

    function getApiObjectTitle(obj, fallback) {
        if (!obj || typeof obj !== 'object') return fallback || '';
        var title = obj.Title;
        if (title == null) title = obj.title;
        if (title == null) title = obj.Name;
        if (title == null) title = obj.name;
        if (title == null) title = obj.ShortTitle;
        if (title == null) title = obj.shortTitle;
        if (title == null) title = obj.Label;
        if (title == null) title = obj.label;
        var txt = normalizeWhitespace(String(title == null ? '' : title));
        return txt || (fallback || '');
    }

    function getApiObjectArraysByKeyRegex(obj, re) {
        var out = [];
        if (!obj || typeof obj !== 'object') return out;
        Object.keys(obj).forEach(function (k) {
            var v = obj[k];
            if (!Array.isArray(v)) return;
            if (!re.test(String(k || ''))) return;
            v.forEach(function (item) {
                if (item && typeof item === 'object') {
                    out.push(item);
                    return;
                }
                var id = getValidLessonsContentId(item);
                if (id) {
                    out.push({
                        Id: id,
                        Type: String(k || ''),
                        __fromPrimitiveId: true
                    });
                }
            });
        });
        return out;
    }

    function getDirectModuleChildrenFromStructure(structureObj, currentModuleId) {
        var out = [];
        var seen = new Set();
        var candidates = getApiObjectArraysByKeyRegex(structureObj, /(modules?|lessons?|units?|folders?)/i);
        candidates.forEach(function (obj) {
            var id = getApiObjectId(obj);
            if (!id) return;
            if (currentModuleId && id === String(currentModuleId)) return;
            if (seen.has(id)) return;
            var topicId = getApiTopicId(obj);
            if (topicId && topicId === id) return;
            seen.add(id);
            out.push({ id: id, title: getApiObjectTitle(obj, 'Section ' + id) });
        });
        return out;
    }

    function getDirectTopicIdsFromStructure(structureObj) {
        var out = new Set();
        var candidates = getApiObjectArraysByKeyRegex(structureObj, /(topics?|activities?|objects?)/i);
        candidates.forEach(function (obj) {
            var tid = getApiTopicId(obj);
            if (tid) out.add(tid);
        });
        return out;
    }

    async function fetchLegacyModuleStructureApi(orgUnitId, moduleId) {
        var key = String(orgUnitId) + ':' + String(moduleId);
        var existing = _lessonsLegacyModuleStructureCache.get(key);
        if (existing && existing.json && (Date.now() - existing.ts) < 1000 * 60 * 20) return existing.json;
        if (existing && existing.promise) return existing.promise;

        var entry = existing || { json: null, ts: 0, promise: null };
        entry.promise = (async function () {
            var versions = ['1.75', '1.74', '1.73', '1.72', '1.71', '1.70', '1.69', '1.68', '1.67'];
            for (var i = 0; i < versions.length; i++) {
                var endpoint = '/d2l/api/le/' + versions[i] + '/' + orgUnitId + '/content/modules/' + moduleId + '/structure/';
                try {
                    var abs = toAbsoluteSamePageUrl(endpoint, window.location.origin);
                    if (!abs) continue;
                    var resp = await fetch(abs, { credentials: 'include', cache: 'no-store', headers: { 'Accept': 'application/json' } });
                    if (!resp || !resp.ok) continue;
                    var json = null;
                    try { json = await resp.json(); } catch (e0) { json = null; }
                    if (!json) continue;
                    entry.json = json;
                    entry.ts = Date.now();
                    _lessonsLegacyModuleStructureCache.set(key, entry);
                    return json;
                } catch (e1) { }
            }
            return null;
        })();
        _lessonsLegacyModuleStructureCache.set(key, entry);
        var result = await entry.promise;
        entry.promise = null;
        _lessonsLegacyModuleStructureCache.set(key, entry);
        return result;
    }

    function collectTopicIdsFromJsonValue(value, outSet, seenObj, keyHint) {
        if (!outSet || value == null) return;
        var t = typeof value;
        if (t === 'number') {
            if (isTopicKeyHint(keyHint)) {
                var numId = getValidLessonsContentId(value);
                if (numId) outSet.add(numId);
            }
            return;
        }
        if (t === 'string') {
            var s = String(value || '');
            if (isTopicKeyHint(keyHint)) {
                var direct = getValidLessonsContentId(s);
                if (direct) outSet.add(direct);
            }
            var m = s.match(/\/d2l\/le\/lessons\/\d+\/topics\/(\d+)/i) || s.match(/\/topics\/(\d+)/i);
            if (m && isValidLessonsContentId(m[1])) outSet.add(String(m[1]));
            return;
        }
        if (t !== 'object') return;
        try {
            if (seenObj && seenObj.has(value)) return;
            if (seenObj) seenObj.add(value);
        } catch (e0) { }
        if (Array.isArray(value)) {
            for (var i = 0; i < value.length; i++) {
                collectTopicIdsFromJsonValue(value[i], outSet, seenObj, keyHint);
            }
            return;
        }
        var topicIdDirect = value.TopicId || value.topicId || value.topicID || value.topic_id;
        if (topicIdDirect != null && isValidLessonsContentId(topicIdDirect)) {
            outSet.add(String(topicIdDirect));
        }
        var typeVal = String(value.Type || value.type || '').toLowerCase();
        var idVal = value.Id || value.id;
        if (idVal != null && isValidLessonsContentId(idVal) && /\btopic\b/.test(typeVal)) {
            outSet.add(String(idVal));
        }
        var keys = Object.keys(value);
        for (var k = 0; k < keys.length; k++) {
            collectTopicIdsFromJsonValue(value[keys[k]], outSet, seenObj, keys[k]);
        }
    }

    function collectModuleIdsFromJsonValue(value, currentModuleId, outSet, seenObj, keyHint) {
        if (!outSet || value == null) return;
        var t = typeof value;
        if (t === 'number') {
            if (isModuleKeyHint(keyHint)) {
                var numId = getValidLessonsContentId(value);
                if (numId && numId !== String(currentModuleId || '')) outSet.add(numId);
            }
            return;
        }
        if (t === 'string') {
            var s = String(value || '');
            if (isModuleKeyHint(keyHint)) {
                var direct = getValidLessonsContentId(s);
                if (direct && direct !== String(currentModuleId || '')) outSet.add(direct);
            }
            var re = /\/content\/modules\/(\d+)/gi;
            var m;
            while ((m = re.exec(s)) !== null) {
                var mid = String(m[1] || '').trim();
                if (isValidLessonsContentId(mid) && mid !== String(currentModuleId || '')) outSet.add(mid);
            }
            return;
        }
        if (t !== 'object') return;
        try {
            if (seenObj && seenObj.has(value)) return;
            if (seenObj) seenObj.add(value);
        } catch (e0) { }

        if (Array.isArray(value)) {
            for (var i = 0; i < value.length; i++) {
                collectModuleIdsFromJsonValue(value[i], currentModuleId, outSet, seenObj, keyHint);
            }
            return;
        }

        var id = getApiObjectId(value);
        var topicId = getApiTopicId(value);
        var typeVal = String(value.Type || value.type || value.ContentObjectType || value.contentObjectType || value.ObjectType || '').toLowerCase();
        var looksModule = false;
        if (/(module|lesson|unit|folder)/.test(typeVal) && !/(topic|file|activity|document)/.test(typeVal)) {
            looksModule = true;
        } else if (id && !topicId) {
            var childCount = value.ChildCount || value.childCount || value.ChildrenCount || value.childrenCount || 0;
            if (childCount > 0 || value.Children || value.children || value.Modules || value.modules || value.SubModules || value.subModules || value.Items || value.items) {
                looksModule = true;
            }
        }
        if (looksModule && id && id !== String(currentModuleId || '')) outSet.add(id);

        var keys = Object.keys(value);
        for (var k = 0; k < keys.length; k++) {
            collectModuleIdsFromJsonValue(value[keys[k]], currentModuleId, outSet, seenObj, keys[k]);
        }
    }

    async function fetchUnitTopicUrlsViaApi(unitUrl) {
        var ids = parseLessonsUnitIds(unitUrl);
        if (!ids) {
            logLessonsBulkDebug('unit_api_skip_no_ids', { unitUrl: unitUrl });
            return [];
        }
        var outTopicIds = new Set();
        var visitedModules = new Set();

        async function walkModule(moduleId, depth) {
            var id = String(moduleId || '').trim();
            if (!id || !/^\d+$/.test(id)) return;
            if (visitedModules.has(id)) return;
            if ((depth || 0) > 20) return;
            visitedModules.add(id);

            var structure = await fetchLegacyModuleStructureApi(ids.orgUnitId, id);
            if (!structure) return;

            var beforeCount = outTopicIds.size;
            var directTopics = getDirectTopicIdsFromStructure(structure || {});
            directTopics.forEach(function (tid) {
                var t = String(tid || '').trim();
                if (/^\d+$/.test(t)) outTopicIds.add(t);
            });
            if (outTopicIds.size === beforeCount) {
                collectTopicIdsFromJsonValue(structure, outTopicIds, new WeakSet());
            }

            var childDefs = getDirectModuleChildrenFromStructure(structure || {}, id);
            var childIds = childDefs.map(function (d) { return String(d && d.id ? d.id : '').trim(); })
                .filter(function (cid) { return /^\d+$/.test(cid) && cid !== id; });
            if (!childIds.length) {
                var fallbackChildIds = new Set();
                collectModuleIdsFromJsonValue(structure, id, fallbackChildIds, new WeakSet());
                childIds = Array.from(fallbackChildIds).filter(function (cid) {
                    return /^\d+$/.test(String(cid || '').trim()) && String(cid) !== id;
                });
            }

            for (var i = 0; i < childIds.length; i++) {
                await walkModule(childIds[i], (depth || 0) + 1);
                if (i % 6 === 5) await lessonsBulkDelay(18);
            }
        }

        try {
            await walkModule(ids.unitId, 0);
            logLessonsBulkDebug('unit_api_scan', {
                unitUrl: unitUrl,
                apiUrl: 'recursive-module-structure',
                status: 'ok',
                finalUrl: '',
                topicCount: outTopicIds.size,
                moduleCount: visitedModules.size
            });
        } catch (eRec0) {
            logLessonsBulkDebug('unit_api_recursive_error', {
                unitUrl: unitUrl,
                error: String(eRec0 && eRec0.message ? eRec0.message : eRec0)
            });
        }

        // Fallback for unexpected API payloads.
        if (!outTopicIds.size) {
            var versions = ['1.75', '1.74', '1.73', '1.72', '1.71', '1.70', '1.69', '1.68', '1.67'];
            for (var v = 0; v < versions.length; v++) {
                var base = '/d2l/api/le/' + versions[v] + '/' + ids.orgUnitId + '/content/modules/' + ids.unitId;
                var endpoints = [
                    base + '/structure/',
                    base
                ];
                var hadOkInVersion = false;
                for (var j = 0; j < endpoints.length; j++) {
                    try {
                        var abs = toAbsoluteSamePageUrl(endpoints[j], window.location.origin);
                        if (!abs) continue;
                        var resp = await lessonsBulkFetch(abs, {
                            credentials: 'include',
                            cache: 'no-store',
                            headers: { 'Accept': 'application/json' }
                        });
                        if (!resp || !resp.ok) {
                            logLessonsBulkDebug('unit_api_http_fail', {
                                unitUrl: unitUrl,
                                apiUrl: abs,
                                status: resp ? resp.status : 'no_response',
                                finalUrl: resp && resp.url ? resp.url : ''
                            });
                            continue;
                        }
                        hadOkInVersion = true;
                        var json = null;
                        try { json = await resp.json(); } catch (e1) { json = null; }
                        if (!json) continue;
                        collectTopicIdsFromJsonValue(json, outTopicIds, new WeakSet());
                        logLessonsBulkDebug('unit_api_scan', {
                            unitUrl: unitUrl,
                            apiUrl: abs,
                            status: resp.status,
                            finalUrl: resp.url || abs,
                            topicCount: outTopicIds.size,
                            moduleCount: visitedModules.size
                        });
                        if (outTopicIds.size) break;
                    } catch (e2) {
                        logLessonsBulkDebug('unit_api_error', {
                            unitUrl: unitUrl,
                            apiUrl: endpoints[j],
                            error: String(e2 && e2.message ? e2.message : e2)
                        });
                    }
                }
                if (outTopicIds.size) break;
                if (hadOkInVersion) {
                    logLessonsBulkDebug('unit_api_stop_after_success_no_topics', {
                        unitUrl: unitUrl,
                        version: versions[v],
                        moduleCount: visitedModules.size
                    });
                    break;
                }
            }
        }

        var topicUrls = Array.from(outTopicIds).map(function (tid) {
            return '/d2l/le/lessons/' + ids.orgUnitId + '/topics/' + tid;
        }).map(function (u) { return toAbsoluteSamePageUrl(u, window.location.origin); }).filter(Boolean);
        logLessonsBulkDebug('unit_api_done', {
            unitUrl: unitUrl,
            topicCount: topicUrls.length,
            moduleCount: visitedModules.size,
            topicUrls: topicUrls.slice(0, 10)
        });
        return topicUrls;
    }

    async function fetchUnitTopicUrlsFromUnitPage(unitUrl) {
        var out = new Set();
        try {
            var resp = await lessonsBulkFetch(unitUrl, { credentials: 'include', cache: 'no-store' });
            if (!resp || !resp.ok) {
                logLessonsBulkDebug('unit_page_topics_http_fail', {
                    unitUrl: unitUrl,
                    status: resp ? resp.status : 'no_response',
                    finalUrl: resp && resp.url ? resp.url : ''
                });
                return [];
            }
            var html = await resp.text();
            var text = String(html || '');
            if (!text) return [];
            var re = /\/d2l\/le\/lessons\/\d+\/topics\/\d+/gi;
            var m;
            while ((m = re.exec(text)) !== null) {
                var abs = toAbsoluteSamePageUrl(m[0], window.location.origin);
                if (abs) out.add(abs);
            }
            logLessonsBulkDebug('unit_page_topics_done', {
                unitUrl: unitUrl,
                status: resp.status,
                finalUrl: resp.url || unitUrl,
                topicCount: out.size,
                topicUrls: Array.from(out).slice(0, 10)
            });
        } catch (e0) {
            logLessonsBulkDebug('unit_page_topics_error', {
                unitUrl: unitUrl,
                error: String(e0 && e0.message ? e0.message : e0)
            });
        }
        return Array.from(out);
    }

    function collectDownloadUrlsFromJsonValue(value, baseUrl, outSet, seenObj) {
        if (!outSet) return;
        if (value == null) return;
        var t = typeof value;
        if (t === 'string') {
            var abs = toAbsoluteSamePageUrl(decodeEscapedUrlText(value), baseUrl || window.location.href);
            if (abs && isStrictFileDownloadUrl(abs)) outSet.add(abs);
            return;
        }
        if (t !== 'object') return;
        try {
            if (seenObj && seenObj.has(value)) return;
            if (seenObj) seenObj.add(value);
        } catch (e0) { }
        if (Array.isArray(value)) {
            for (var i = 0; i < value.length; i++) {
                collectDownloadUrlsFromJsonValue(value[i], baseUrl, outSet, seenObj);
            }
            return;
        }
        var keys = Object.keys(value);
        for (var k = 0; k < keys.length; k++) {
            collectDownloadUrlsFromJsonValue(value[keys[k]], baseUrl, outSet, seenObj);
        }
    }

    function isHtmlLikeResponse(resp) {
        var ct = '';
        try { ct = String(resp.headers.get('content-type') || '').toLowerCase(); } catch (e0) { ct = ''; }
        if (!ct) return true;
        return /(text\/html|application\/xhtml|text\/plain|json|xml)/.test(ct);
    }

    async function fetchTopicApiDownloadUrls(topicUrl) {
        var ids = parseLessonsTopicIds(topicUrl);
        if (!ids) {
            logLessonsBulkDebug('topic_api_skip_no_ids', { topicUrl: topicUrl });
            return [];
        }

        var out = new Set();
        var versions = ['1.75', '1.74', '1.73', '1.72', '1.71', '1.70', '1.69', '1.68', '1.67'];
        if (_lessonsBulkState.lessonsTopicApiVersion) versions = [_lessonsBulkState.lessonsTopicApiVersion];
        for (var i = 0; i < versions.length; i++) {
            var apiUrl = '/d2l/api/le/' + versions[i] + '/' + ids.orgUnitId + '/content/topics/' + ids.topicId;
            try {
                var abs = toAbsoluteSamePageUrl(apiUrl, window.location.origin);
                if (!abs) continue;
                var resp = await lessonsBulkFetch(abs, {
                    credentials: 'include',
                    cache: 'no-store',
                    headers: { 'Accept': 'application/json' }
                });
                if (!resp || !resp.ok) {
                    logLessonsBulkDebug('topic_api_http_fail', {
                        topicUrl: topicUrl,
                        apiUrl: abs,
                        status: resp ? resp.status : 'no_response',
                        finalUrl: resp && resp.url ? resp.url : ''
                    });
                    continue;
                }
                var json = null;
                try { json = await resp.json(); } catch (e1) { json = null; }
                if (!json) continue;
                _lessonsBulkState.lessonsTopicApiVersion = versions[i];
                collectDownloadUrlsFromJsonValue(json, topicUrl, out, new WeakSet());
                logLessonsBulkDebug('topic_api_scan', {
                    topicUrl: topicUrl,
                    apiUrl: abs,
                    status: resp.status,
                    finalUrl: resp.url || abs,
                    runningFound: out.size
                });
                // A version that answered has told us everything this topic has.
                break;
            } catch (e2) {
                logLessonsBulkDebug('topic_api_error', {
                    topicUrl: topicUrl,
                    apiUrl: apiUrl,
                    error: String(e2 && e2.message ? e2.message : e2)
                });
            }
        }
        logLessonsBulkDebug('topic_api_done', { topicUrl: topicUrl, found: out.size });
        return Array.from(out);
    }

    function buildLessonsTocIndex(toc) {
        var index = new Map();
        function walk(modules) {
            if (!Array.isArray(modules)) return;
            modules.forEach(function (mod) {
                if (!mod || typeof mod !== 'object') return;
                (Array.isArray(mod.Topics) ? mod.Topics : []).forEach(function (topic) {
                    if (!topic || topic.TopicId == null) return;
                    index.set(String(topic.TopicId), {
                        type: String(topic.TypeIdentifier || ''),
                        url: String(topic.Url || ''),
                        title: String(topic.Title || '')
                    });
                });
                walk(mod.Modules);
            });
        }
        walk(toc && toc.Modules);
        return index;
    }

    function classifyTopicFromTocIndex(index, topicUrl) {
        if (!index || !index.size) return null;
        var ids = parseLessonsTopicIds(topicUrl);
        if (!ids) return null;
        var entry = index.get(ids.topicId);
        if (!entry) return null;
        if (/^link$/i.test(entry.type)) return { links: [], notFile: true };
        if (/^file$/i.test(entry.type)) {
            var abs = toAbsoluteSamePageUrl(entry.url, window.location.origin);
            if (abs && isStrictFileDownloadUrl(abs)) return { links: [abs], notFile: false };
        }
        return null;
    }

    async function loadLessonsTocIndex(orgUnitId) {
        if (!orgUnitId) return null;
        if (_lessonsTocIndex.orgUnitId === orgUnitId && _lessonsTocIndex.index) return _lessonsTocIndex.index;
        var versions = ['1.75', '1.74', '1.73', '1.72', '1.71', '1.70', '1.69', '1.68', '1.67'];
        if (_lessonsBulkState.lessonsTopicApiVersion) versions = [_lessonsBulkState.lessonsTopicApiVersion].concat(versions.filter(function (v) { return v !== _lessonsBulkState.lessonsTopicApiVersion; }));
        for (var i = 0; i < versions.length; i++) {
            throwIfLessonsBulkAborted();
            try {
                var resp = await lessonsBulkFetch(window.location.origin + '/d2l/api/le/' + versions[i] + '/' + orgUnitId + '/content/toc', {
                    credentials: 'include',
                    cache: 'no-store',
                    headers: { 'Accept': 'application/json' }
                });
                if (!resp || !resp.ok) continue;
                var index = buildLessonsTocIndex(await resp.json());
                _lessonsBulkState.lessonsTopicApiVersion = versions[i];
                _lessonsTocIndex.orgUnitId = orgUnitId;
                _lessonsTocIndex.index = index;
                logLessonsBulkDebug('toc_index_loaded', { orgUnitId: orgUnitId, version: versions[i], topics: index.size });
                return index;
            } catch (e0) {
                if (e0 && e0.name === 'AbortError') throw e0;
            }
        }
        logLessonsBulkDebug('toc_index_unavailable', { orgUnitId: orgUnitId });
        return null;
    }

    async function fetchTopicViewContentDownloadUrls(topicUrl) {
        var ids = parseLessonsTopicIds(topicUrl);
        if (!ids) {
            logLessonsBulkDebug('viewcontent_skip_no_ids', { topicUrl: topicUrl });
            return [];
        }
        var out = new Set();
        var candidates = [
            '/d2l/le/content/' + ids.orgUnitId + '/viewContent/' + ids.topicId + '/View',
            '/d2l/le/content/' + ids.orgUnitId + '/topics/files/download/' + ids.topicId
        ];

        for (var i = 0; i < candidates.length; i++) {
            try {
                var abs = toAbsoluteSamePageUrl(candidates[i], window.location.origin);
                if (!abs) continue;
                var resp = await lessonsBulkFetch(abs, { credentials: 'include', cache: 'no-store' });
                if (resp && resp.ok && !isHtmlLikeResponse(resp)) {
                    // The download endpoint streams the file itself; reading it as text only burns bandwidth.
                    try { if (resp.body) resp.body.cancel(); } catch (eCancel) { }
                    logLessonsBulkDebug('viewcontent_skip_non_html', {
                        topicUrl: topicUrl,
                        candidateUrl: abs,
                        contentType: resp.headers.get('content-type') || ''
                    });
                    continue;
                }
                if (!resp || !resp.ok) {
                    logLessonsBulkDebug('viewcontent_http_fail', {
                        topicUrl: topicUrl,
                        candidateUrl: abs,
                        status: resp ? resp.status : 'no_response',
                        finalUrl: resp && resp.url ? resp.url : ''
                    });
                    continue;
                }
                var body = await resp.text();
                if (!body) continue;
                extractDownloadUrlsFromLessonsHtml(body, abs).forEach(function (u) {
                    if (isStrictFileDownloadUrl(u)) out.add(u);
                });
                logLessonsBulkDebug('viewcontent_scan', {
                    topicUrl: topicUrl,
                    candidateUrl: abs,
                    status: resp.status,
                    finalUrl: resp.url || abs,
                    runningFound: out.size
                });
                if (out.size) break;
            } catch (e1) { }
        }
        logLessonsBulkDebug('viewcontent_done', { topicUrl: topicUrl, found: out.size });
        return Array.from(out);
    }

    async function probeTopicDownloadViaIframe(topicUrl) {
        return new Promise(function (resolve) {
            var done = false;
            var iframe = document.createElement('iframe');
            markExt(iframe);
            // Keep iframe rendered off-screen (not display:none) so Brightspace lazy loaders can hydrate content.
            iframe.style.cssText = 'position:fixed !important;left:-10000px !important;top:0 !important;'
                + 'width:1280px !important;height:900px !important;opacity:0.01 !important;pointer-events:none !important;'
                + 'z-index:-2147483647 !important;border:0 !important;';

            function finish(result) {
                if (done) return;
                done = true;
                logLessonsBulkDebug('iframe_probe_done', {
                    topicUrl: topicUrl,
                    found: result && result.urls ? result.urls.length : 0
                });
                try { iframe.remove(); } catch (e0) { }
                resolve(result || { urls: [], clicked: false });
            }

            function harvest(doc) {
                var out = new Set();
                if (!doc || !doc.querySelectorAll) return out;
                doc.querySelectorAll('d2l-pdf-viewer[src], a[href], iframe[src], embed[src], source[src], object[data]').forEach(function (el) {
                    var raw = el.getAttribute('href') || el.getAttribute('src') || el.getAttribute('data') || '';
                    var abs = toAbsoluteSamePageUrl(raw, topicUrl);
                    if (abs && isStrictFileDownloadUrl(abs)) out.add(abs);
                });
                try {
                    var html = doc.documentElement ? doc.documentElement.outerHTML : '';
                    extractDownloadUrlsFromLessonsHtml(html, topicUrl).forEach(function (u) { out.add(u); });
                } catch (e1) { }
                return out;
            }

            var timeoutId = setTimeout(function () {
                var docT = null;
                try { docT = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document); } catch (e2) { docT = null; }
                var urlsT = Array.from(harvest(docT));
                if (urlsT.length) return finish({ urls: urlsT, clicked: false });
                finish({ urls: [], clicked: false });
            }, 11000);

            iframe.onload = function () {
                var tries = 0;
                (function poll() {
                    tries++;
                    var doc = null;
                    try { doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document); } catch (e4) { doc = null; }
                    var urls = Array.from(harvest(doc));
                    if (urls.length) {
                        clearTimeout(timeoutId);
                        finish({ urls: urls, clicked: false });
                        return;
                    }
                    if (tries >= 56) {
                        clearTimeout(timeoutId);
                        finish({ urls: [], clicked: false });
                        return;
                    }
                    setTimeout(poll, 140);
                })();
            };

            try {
                iframe.src = topicUrl;
                document.body.appendChild(iframe);
            } catch (e6) {
                logLessonsBulkDebug('iframe_probe_error', { topicUrl: topicUrl, error: String(e6 && e6.message ? e6.message : e6) });
                clearTimeout(timeoutId);
                finish({ urls: [], clicked: false });
            }
        });
    }

    async function fetchLessonsUnitDownloadResult(unitUrl, depth) {
        depth = Number(depth || 0);
        if (depth < 0) depth = 0;
        if (depth > 3) return { links: [] };

        var fromToc = classifyTopicFromTocIndex(_lessonsTocIndex.index, unitUrl);
        if (fromToc) {
            logLessonsBulkDebug('unit_result_toc', { unitUrl: unitUrl, found: fromToc.links.length, notFile: fromToc.notFile });
            return fromToc;
        }

        if (/\/units\//i.test(unitUrl)) {
            try {
                var topicUrls = await fetchUnitTopicUrlsFromUnitPage(unitUrl);
                if (!topicUrls || !topicUrls.length) {
                    topicUrls = await fetchUnitTopicUrlsViaApi(unitUrl);
                }
                if (topicUrls && topicUrls.length) {
                    var fromTopics = new Set();
                    for (var ut = 0; ut < topicUrls.length; ut++) {
                        if (isLessonsBulkRunAborted()) break;
                        var tRes = await fetchLessonsUnitDownloadResult(topicUrls[ut], depth + 1);
                        (tRes && tRes.links ? tRes.links : []).forEach(function (u) { fromTopics.add(u); });
                        if (ut % 4 === 3) await lessonsBulkDelay(45);
                    }
                    logLessonsBulkDebug('unit_result_step_unit_api_topics', {
                        unitUrl: unitUrl,
                        topicCount: topicUrls.length,
                        found: fromTopics.size
                    });
                    if (fromTopics.size) return { links: Array.from(fromTopics) };
                }
            } catch (eU0) {
                logLessonsBulkDebug('unit_result_unit_api_topics_error', {
                    unitUrl: unitUrl,
                    error: String(eU0 && eU0.message ? eU0.message : eU0)
                });
            }
        }

        var links = await fetchLessonsUnitDownloadUrls(unitUrl);
        var pageUnread = links === null;
        logLessonsBulkDebug('unit_result_step_main', { unitUrl: unitUrl, found: (links || []).length });
        if ((!links || !links.length) && /\/topics\//i.test(unitUrl)) {
            try {
                var viaContent = await fetchTopicViewContentDownloadUrls(unitUrl);
                if (viaContent && viaContent.length) links = viaContent;
            } catch (eC0) { }
            logLessonsBulkDebug('unit_result_step_viewcontent', { unitUrl: unitUrl, found: (links || []).length });
        }
        if ((!links || !links.length) && /\/topics\//i.test(unitUrl)) {
            try {
                var viaApi = await fetchTopicApiDownloadUrls(unitUrl);
                if (viaApi && viaApi.length) links = viaApi;
            } catch (eA0) { }
            logLessonsBulkDebug('unit_result_step_topic_api', { unitUrl: unitUrl, found: (links || []).length });
        }
        if ((!links || !links.length) && /\/topics\//i.test(unitUrl) && isLessonsBulkHeavyFallbackEnabled()) {
            try {
                var probed = await probeTopicDownloadViaIframe(unitUrl);
                if (probed && Array.isArray(probed.urls) && probed.urls.length) links = probed.urls;
            } catch (e0) { }
            logLessonsBulkDebug('unit_result_step_iframe', { unitUrl: unitUrl, found: (links || []).length });
        } else if ((!links || !links.length) && /\/topics\//i.test(unitUrl)) {
            logLessonsBulkDebug('unit_result_step_iframe_skipped', { unitUrl: unitUrl, reason: 'heavy_fallback_disabled' });
        }
        logLessonsBulkDebug('unit_result_done', { unitUrl: unitUrl, found: (links || []).length, links: (links || []).slice(0, 5) });
        // unread: the page itself failed and no fallback found files, so "no files" is unknown.
        return { links: links || [], unread: pageUnread && !(links && links.length) };
    }

    function extractDownloadUrlsFromLessonsHtml(html, baseUrl) {
        var out = new Set();
        if (!html) return [];

        var text = String(html || '');
        var doc = null;
        try { doc = new DOMParser().parseFromString(text, 'text/html'); } catch (e0) { doc = null; }

        function maybeAdd(rawUrl, sourceText) {
            var decoded = decodeEscapedUrlText(rawUrl);
            if (!decoded) return;
            if (/[<>"']/.test(decoded)) return;
            if (/&(?:quot|apos|lt|gt|#\d+|#x[a-f0-9]+);/i.test(decoded)) return;
            var abs = toAbsoluteSamePageUrl(decoded, baseUrl || window.location.href);
            if (!abs) return;
            if (isStrictFileDownloadUrl(abs)) {
                out.add(abs);
            }
        }

        if (doc && doc.querySelectorAll) {
            doc.querySelectorAll('a[href], iframe[src], embed[src], source[src], object[data]').forEach(function (el) {
                var raw = el.getAttribute('href') || el.getAttribute('src') || el.getAttribute('data') || '';
                maybeAdd(raw, normalizeWhitespace(el.textContent || ''));
            });
        }

        var regexes = [
            /\/d2l\/le\/content\/[^"'\\\s<>)]+/gi,
            /\/content\/enforced\/[^"'\\\s<>)]+/gi,
            /https?:\/\/[^"'\\\s<>)]+/gi
        ];
        regexes.forEach(function (re) {
            var m;
            while ((m = re.exec(text)) !== null) {
                maybeAdd(m[0], '');
            }
        });

        return Array.from(out);
    }

    async function fetchLessonsUnitDownloadUrls(unitUrl) {
        try {
            var resp = await lessonsBulkFetch(unitUrl, { credentials: 'include', cache: 'no-store' });
            if (!resp || !resp.ok) {
                logLessonsBulkDebug('fetch_unit_http_fail', {
                    unitUrl: unitUrl,
                    status: resp ? resp.status : 'no_response',
                    finalUrl: resp && resp.url ? resp.url : ''
                });
                return null;
            }
            var html = await resp.text();
            var urls = extractDownloadUrlsFromLessonsHtml(html, unitUrl);
            logLessonsBulkDebug('fetch_unit_scan', {
                unitUrl: unitUrl,
                status: resp.status,
                finalUrl: resp.url || unitUrl,
                found: (urls || []).length
            });
            return (urls && urls.length) ? urls : [];
        } catch (e0) {
            logLessonsBulkDebug('fetch_unit_error', { unitUrl: unitUrl, error: String(e0 && e0.message ? e0.message : e0) });
        }
        return null;
    }

    function parseLessonsTopicIds(topicUrl) {
        try {
            var u = new URL(topicUrl, window.location.href);
            var m = (u.pathname || '').match(/\/d2l\/le\/lessons\/(\d+)\/topics\/(\d+)/i);
            if (!m) return null;
            if (!isValidLessonsContentId(m[2])) return null;
            return { orgUnitId: m[1], topicId: m[2] };
        } catch (e0) {
            return null;
        }
    }

    function getTopicLabelHintFromTopicUrl(topicUrl) {
        var ids = parseLessonsTopicIds(topicUrl);
        if (!ids) return '';
        var doc = getLessonsRuntimeDocument(document);

        // Legacy tree (navigation-item with data-objectid=topicId)
        try {
            var legacyItem = doc.querySelector('.navigation-tree .navigation-item[data-objectid="' + ids.topicId + '"]');
            if (legacyItem) {
                var legacyLabel = getLegacyLessonsTreeLabel(legacyItem);
                if (legacyLabel) return legacyLabel;
            }
        } catch (e0) { }

        // Modern lessons toc
        try {
            var navItem = findTopicNavItem(topicUrl);
            if (navItem) {
                var label = getLessonsTreeLabel(navItem);
                if (label) return label;
            }
        } catch (e1) { }

        return 'topic-' + ids.topicId;
    }

    function parseLessonsUnitIds(unitUrl) {
        try {
            var u = new URL(unitUrl, window.location.href);
            var m = (u.pathname || '').match(/\/d2l\/le\/lessons\/(\d+)\/units\/(\d+)/i);
            if (!m) return null;
            if (!isValidLessonsContentId(m[2])) return null;
            return { orgUnitId: m[1], unitId: m[2] };
        } catch (e0) {
            return null;
        }
    }

    function isTopicKeyHint(keyHint) {
        var k = String(keyHint || '').toLowerCase();
        return /(topic|topics|activity|activities|file|files|document|documents|contentobject|content_object)/.test(k);
    }

    function isModuleKeyHint(keyHint) {
        var k = String(keyHint || '').toLowerCase();
        if (!k) return false;
        if (/topic/.test(k)) return false;
        return /(module|modules|lesson|lessons|unit|units|folder|folders|child|children|item|items|submodule|submodules)/.test(k);
    }

    function isLessonsBulkHeavyFallbackEnabled() {
        try {
            return localStorage.getItem('dtu_after_dark_bulk_heavy_fallback') === '1';
        } catch (e0) {
            return false;
        }
    }

    function normalizeTopicCompareUrl(urlStr) {
        try {
            var u = new URL(urlStr, window.location.href);
            return (u.origin + u.pathname).toLowerCase();
        } catch (e0) {
            return String(urlStr || '').toLowerCase();
        }
    }

    function findTopicNavItem(topicUrl) {
        var runtimeDoc = getLessonsRuntimeDocument(document);
        var tocHost = getLessonsTocHost(runtimeDoc);
        if (!tocHost || !tocHost.shadowRoot) return null;
        var target = normalizeTopicCompareUrl(topicUrl);
        var items = [];
        try { items = deepQueryAll('d2l-list-item-nav[action-href]', tocHost.shadowRoot); } catch (e0) { items = []; }
        for (var i = 0; i < items.length; i++) {
            var href = '';
            try { href = items[i].getAttribute('action-href') || ''; } catch (e1) { href = ''; }
            if (!href) continue;
            var abs = toAbsoluteSamePageUrl(href, window.location.href);
            if (!abs) continue;
            if (normalizeTopicCompareUrl(abs) === target) return items[i];
        }
        return null;
    }

    async function collectTopicFileUrlsInCurrentPage(topicUrl) {
        var ids = parseLessonsTopicIds(topicUrl);
        if (!ids) return [];
        var runtimeDoc = getLessonsRuntimeDocument(document);
        var panelId = 'd2l_content_' + ids.orgUnitId + '_' + ids.topicId;

        var panel = runtimeDoc.getElementById(panelId);
        if (!panel) {
            var nav = findTopicNavItem(topicUrl);
            if (nav) {
                try { nav.click(); } catch (e0) { }
                for (var i = 0; i < 70; i++) {
                    await lessonsBulkDelay(220);
                    panel = runtimeDoc.getElementById(panelId);
                    if (panel) break;
                }
            }
        }
        if (!panel) {
            logLessonsBulkDebug('collect_topic_panel_missing', { topicUrl: topicUrl, panelId: panelId });
            return [];
        }

        var out = new Set();
        panel.querySelectorAll('d2l-pdf-viewer[src], iframe[src], embed[src], source[src], object[data], a[href]').forEach(function (el) {
            var raw = el.getAttribute('src') || el.getAttribute('href') || el.getAttribute('data') || '';
            var abs = toAbsoluteSamePageUrl(raw, window.location.href);
            if (abs && isStrictFileDownloadUrl(abs)) out.add(abs);
        });
        try {
            extractDownloadUrlsFromLessonsHtml(panel.outerHTML || '', window.location.href).forEach(function (u) {
                if (isStrictFileDownloadUrl(u)) out.add(u);
            });
        } catch (e1) { }

        logLessonsBulkDebug('collect_topic_urls_done', {
            topicUrl: topicUrl,
            panelId: panelId,
            found: out.size,
            urls: Array.from(out).slice(0, 8)
        });
        if (out.size) return Array.from(out);
        // Panel-based extraction can fail if the topic panel doesn't hydrate quickly.
        try {
            var viaApi = await fetchTopicApiDownloadUrls(topicUrl);
            (viaApi || []).forEach(function (u) { if (isStrictFileDownloadUrl(u)) out.add(u); });
        } catch (e2) { }
        logLessonsBulkDebug('collect_topic_urls_after_api', {
            topicUrl: topicUrl,
            found: out.size,
            urls: Array.from(out).slice(0, 8)
        });
        return Array.from(out);
    }

    function lessonsBulkFetch(url, opts) {
        var o = Object.assign({}, opts || {});
        if (_lessonsBulkState.runAbort) o.signal = _lessonsBulkState.runAbort.signal;
        return fetch(url, o);
    }

    function lessonsBulkDelay(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms || 0); });
    }

    try {
        globalThis.DTUAfterDarkLessonsBulkFetch = {
            toAbsoluteSamePageUrl: toAbsoluteSamePageUrl,
            decodeEscapedUrlText: decodeEscapedUrlText,
            isLikelyDownloadUrl: isLikelyDownloadUrl,
            isStrictFileDownloadUrl: isStrictFileDownloadUrl,
            getApiObjectId: getApiObjectId,
            getApiTopicId: getApiTopicId,
            getApiObjectTitle: getApiObjectTitle,
            getApiObjectArraysByKeyRegex: getApiObjectArraysByKeyRegex,
            getDirectModuleChildrenFromStructure: getDirectModuleChildrenFromStructure,
            getDirectTopicIdsFromStructure: getDirectTopicIdsFromStructure,
            fetchLegacyModuleStructureApi: fetchLegacyModuleStructureApi,
            collectTopicIdsFromJsonValue: collectTopicIdsFromJsonValue,
            collectModuleIdsFromJsonValue: collectModuleIdsFromJsonValue,
            fetchUnitTopicUrlsViaApi: fetchUnitTopicUrlsViaApi,
            fetchUnitTopicUrlsFromUnitPage: fetchUnitTopicUrlsFromUnitPage,
            collectDownloadUrlsFromJsonValue: collectDownloadUrlsFromJsonValue,
            isHtmlLikeResponse: isHtmlLikeResponse,
            fetchTopicApiDownloadUrls: fetchTopicApiDownloadUrls,
            buildLessonsTocIndex: buildLessonsTocIndex,
            classifyTopicFromTocIndex: classifyTopicFromTocIndex,
            loadLessonsTocIndex: loadLessonsTocIndex,
            fetchTopicViewContentDownloadUrls: fetchTopicViewContentDownloadUrls,
            probeTopicDownloadViaIframe: probeTopicDownloadViaIframe,
            fetchLessonsUnitDownloadResult: fetchLessonsUnitDownloadResult,
            extractDownloadUrlsFromLessonsHtml: extractDownloadUrlsFromLessonsHtml,
            fetchLessonsUnitDownloadUrls: fetchLessonsUnitDownloadUrls,
            parseLessonsTopicIds: parseLessonsTopicIds,
            getTopicLabelHintFromTopicUrl: getTopicLabelHintFromTopicUrl,
            parseLessonsUnitIds: parseLessonsUnitIds,
            isTopicKeyHint: isTopicKeyHint,
            isModuleKeyHint: isModuleKeyHint,
            isLessonsBulkHeavyFallbackEnabled: isLessonsBulkHeavyFallbackEnabled,
            normalizeTopicCompareUrl: normalizeTopicCompareUrl,
            findTopicNavItem: findTopicNavItem,
            collectTopicFileUrlsInCurrentPage: collectTopicFileUrlsInCurrentPage,
            lessonsBulkFetch: lessonsBulkFetch,
            lessonsBulkDelay: lessonsBulkDelay
        };
    } catch (eExpose) { }
})();
