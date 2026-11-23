(function () {
    'use strict';

    // Movia's type colours (S blue, E green, A red). The badge is a split tag: the number
    // on a neutral chip and the type letter in its colour; numbered lines have no letter.
    var BUS_TYPE_COLORS = { S: '#1d62b3', E: '#1e7a3c', A: '#c21f32' };

    // Bus lines that serve DTU campuses.
    const DTU_BUS_LINES = [
        { line: '150S', name: 'Bus 150S' },
        { line: 'L', name: 'Letbane L' },
        { line: '40E', name: 'Bus 40E' },
        { line: '15E', name: 'Bus 15E' },
        { line: '193', name: 'Bus 193' },
        { line: '350S', name: 'Bus 350S' },
        { line: '55E', name: 'Bus 55E' },
        { line: '216', name: 'Bus 216' },
        { line: '600S', name: 'Bus 600S' }
    ];
    const DTU_BUS_LINES_BY_CODE = DTU_BUS_LINES.reduce(function (acc, lineDef) {
        if (!lineDef || !lineDef.line) return acc;
        acc[lineDef.line] = lineDef;
        return acc;
    }, {});

    // Static direction tokens for bus-line filtering in the config modal.
    // These are used to avoid extra API calls while editing bus settings.
    const DTU_BUS_DIRECTION_TOKENS = {
        '150S': ['Nørreport St.', 'Kokkedal St.', 'Gl. Holte Øverødvej', 'Søhuset, Forskerparken'],
        'L': ['Lundtofte St. (Letbane)', 'Ishøj St. (Letbane)'],
        '40E': ['Høje Taastrup St.', 'Skodsborg St.', 'DTU, Rævehøjvej'],
        '15E': ['Nørreport St.'],
        '193': ['Lyngby St.', 'Vedbæk St.'],
        '350S': ['Nørreport St.', 'Ballerup St.'],
        '55E': ['Allerød St.', 'Rødovre Nord St.'],
        '216': ['Roskilde St.', 'Ballerup St.', 'Søagerskolen', 'Østrup'],
        '600S': ['Hillerød St.', 'Ishøj St.', 'Roskilde St.', 'Greve St.', 'Roskilde St. Sygehuset', 'Jyllingecentret', 'Slangerup Rutebilstation', 'Tune Center']
    };

    // Badge colors per bus line
    // Movia colour-codes line numbers by bus type since December 2024: S-buses white on
    // blue, E-buses white on green, A-buses white on red. Numbered lines have no type
    // colour and use a neutral grey. Only the type letter of a badge carries this colour.
    const LINE_COLORS = {
        '150S': '#1d62b3',
        '350S': '#1d62b3',
        '600S': '#1d62b3',
        '40E': '#1e7a3c',
        '15E': '#1e7a3c',
        '55E': '#1e7a3c',
        '193': '#4b5563',
        'L': '#4b5563',
        '216': '#4b5563'
    };

    // Campus presets: stop IDs + commonly used lines. Checked against Rejseplanen's stop
    // pages on 2026-11-07: the Letbane replaced 300S, which no longer serves any DTU stop.
    const DTU_CAMPUS_PRESETS = {
        lyngby: {
            id: 'lyngby',
            label: 'DTU Lyngby',
            stopIds: ['6015', '6026', '474', '496', '497', '473', '472', '53591', '53614', '53615'],
            lines: ['150S', 'L', '40E', '15E', '193']
        },
        ballerup: {
            id: 'ballerup',
            label: 'DTU Ballerup',
            stopIds: ['2175', '2134', '2177', '2132'],
            lines: ['350S', '40E', '55E']
        },
        riso: {
            id: 'riso',
            label: 'DTU Risø',
            stopIds: ['9183', '4369'],
            lines: ['216', '600S']
        }
    };
    const DTU_CAMPUS_ORDER = ['lyngby', 'ballerup', 'riso'];
    const DTU_DEFAULT_CAMPUSES = ['lyngby'];
    const DTU_AREA_STOP_IDS = (DTU_CAMPUS_PRESETS.lyngby.stopIds || []).slice();

    function sanitizeBusStopIds(stopIds) {
        if (!Array.isArray(stopIds)) return [];
        var seen = {};
        var out = [];
        stopIds.forEach(function (sid) {
            var id = String(sid || '').trim();
            if (!id) return;
            if (!/^\d+$/.test(id)) return;
            if (seen[id]) return;
            seen[id] = true;
            out.push(id);
        });
        return out;
    }

    function sanitizeBusCampusIds(campusIds) {
        if (!Array.isArray(campusIds)) return [];
        var seen = {};
        var out = [];
        campusIds.forEach(function (cid) {
            var id = String(cid || '').trim().toLowerCase();
            if (!id || !DTU_CAMPUS_PRESETS[id]) return;
            if (seen[id]) return;
            seen[id] = true;
            out.push(id);
        });
        return out;
    }

    function collectCampusValues(campusIds, field) {
        var ids = sanitizeBusCampusIds(campusIds);
        if (!ids.length) ids = DTU_DEFAULT_CAMPUSES.slice();
        var seen = {};
        var out = [];
        ids.forEach(function (cid) {
            var preset = DTU_CAMPUS_PRESETS[cid];
            if (!preset || !Array.isArray(preset[field])) return;
            preset[field].forEach(function (value) {
                var item = String(value || '').trim();
                if (!item || seen[item]) return;
                seen[item] = true;
                out.push(item);
            });
        });
        return out;
    }

    function getCampusStopIds(campusIds) {
        return collectCampusValues(campusIds, 'stopIds');
    }

    function getCampusLineCodes(campusIds) {
        return collectCampusValues(campusIds, 'lines');
    }

    function getCampusLineDefinitions(campusIds) {
        var codes = getCampusLineCodes(campusIds);
        return codes.map(function (code) {
            return DTU_BUS_LINES_BY_CODE[code] || { line: code, name: 'Bus ' + code };
        });
    }

    function inferBusCampusesFromStopIds(stopIds) {
        var stops = sanitizeBusStopIds(stopIds);
        if (!stops.length) return DTU_DEFAULT_CAMPUSES.slice();

        var selected = [];
        DTU_CAMPUS_ORDER.forEach(function (cid) {
            var preset = DTU_CAMPUS_PRESETS[cid];
            if (!preset || !Array.isArray(preset.stopIds)) return;
            var hasAny = preset.stopIds.some(function (sid) { return stops.indexOf(String(sid)) !== -1; });
            if (hasAny) selected.push(cid);
        });
        if (!selected.length) selected = DTU_DEFAULT_CAMPUSES.slice();
        return selected;
    }

    function getBusLineColors() {
        return LINE_COLORS;
    }

    function getBusCampusOrder() {
        return DTU_CAMPUS_ORDER.slice();
    }

    function getBusCampusPresets() {
        return DTU_CAMPUS_PRESETS;
    }

    function getDefaultCampuses() {
        return DTU_DEFAULT_CAMPUSES.slice();
    }

    globalThis.DTUAfterDarkBusPresets = {
        BUS_TYPE_COLORS: BUS_TYPE_COLORS,
        DTU_BUS_DIRECTION_TOKENS: DTU_BUS_DIRECTION_TOKENS,
        DTU_DEFAULT_CAMPUSES: DTU_DEFAULT_CAMPUSES,
        DTU_AREA_STOP_IDS: DTU_AREA_STOP_IDS,
        sanitizeBusStopIds: sanitizeBusStopIds,
        sanitizeBusCampusIds: sanitizeBusCampusIds,
        getCampusStopIds: getCampusStopIds,
        getCampusLineCodes: getCampusLineCodes,
        getCampusLineDefinitions: getCampusLineDefinitions,
        inferBusCampusesFromStopIds: inferBusCampusesFromStopIds,
        getBusLineColors: getBusLineColors,
        getBusCampusOrder: getBusCampusOrder,
        getBusCampusPresets: getBusCampusPresets,
        getDefaultCampuses: getDefaultCampuses
    };
})();
