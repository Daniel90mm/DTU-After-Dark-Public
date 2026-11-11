(function () {
    'use strict';

    // Glue for the split: the bus runtime holds the shared helpers, and this file
    // owns the library data state and exposes the functions the trend file and
    // darkmode.library.js call. No function below is rewritten.
    var busRuntime = globalThis.DTUAfterDarkBusRuntime;
    if (!busRuntime) throw new Error('DTU After Dark: darkmode.bus.js must load before darkmode.library-data.js');
    var sendRuntimeMessage = busRuntime.sendRuntimeMessage;
    var getRuntimeConfig = busRuntime.getRuntimeConfig;
    var markExt = busRuntime.markExt;
    var isTopWindow = busRuntime.isTopWindow;
    var isFeatureFlagEnabled = busRuntime.isFeatureFlagEnabled;
    var isDTULearnHomepage = busRuntime.isDTULearnHomepage;

    function getDeps() {
        try { return globalThis.DTUAfterDarkBusDeps || null; } catch (e0) { return null; }
    }

    function getLibraryDropdownFeatureKey() {
        var deps = getDeps();
        return (deps && deps.featureLibraryDropdownKey) || 'dtuAfterDarkFeatureLibraryDropdown';
    }

    // ===== LIBRARY NAV DROPDOWN =====
    // Placed in the bottom nav bar (d2l-navigation-s-main-wrapper), after "Find Courses" and before "Study Rules".
    function isLibraryEnabled() {
        return isFeatureFlagEnabled(getLibraryDropdownFeatureKey());
    }

    var _libraryEventsCache = null;
    var _libraryNewsCache = null;
    var _libraryCrowdingCache = null;
    var _libraryEscHandler = null;
    var _libraryOccupancyAutoTimer = null;

    function requestLibraryEvents(cb, forceRefresh) {
        sendRuntimeMessage({ type: 'dtu-library-events', forceRefresh: !!forceRefresh }, function (resp) {
            if (!forceRefresh && resp && resp.ok && Array.isArray(resp.events) && !resp.events.length) {
                requestLibraryEvents(cb, true);
                return;
            }
            if (resp && resp.ok) _libraryEventsCache = resp;
            if (cb) cb(resp);
        });
    }

    function requestLibraryNews(cb, forceRefresh) {
        sendRuntimeMessage({ type: 'dtu-library-news', forceRefresh: !!forceRefresh }, function (resp) {
            if (!forceRefresh && resp && resp.ok && Array.isArray(resp.news) && !resp.news.length) {
                requestLibraryNews(cb, true);
                return;
            }
            if (resp && resp.ok) _libraryNewsCache = resp;
            if (cb) cb(resp);
        });
    }

    function requestLibraryCrowding(cb, forceRefresh) {
        var apiUrl = getLibrarySharedTrendApiUrl();
        if (!apiUrl) {
            if (cb) cb({ ok: false, error: 'not_configured', message: 'Shared library occupancy is not configured in this build.' });
            return;
        }
        sendRuntimeMessage({
            type: 'dtu-library-live-stats',
            forceRefresh: !!forceRefresh,
            apiUrl: apiUrl,
            lookbackDays: getLibrarySharedTrendLookbackDays()
        }, function (resp) {
            if (resp && resp.ok) {
                _libraryCrowdingCache = resp;
            }
            if (cb) cb(resp);
        });
    }

    function getLibrarySharedTrendApiUrl() {
        try {
            var config = getRuntimeConfig();
            var url = String(config.LIVE_LIBRARY_TRENDS_URL || '').trim();
            if (!url) return '';
            if (!/^https:\/\//i.test(url)) return '';
            return url;
        } catch (e0) {
            return '';
        }
    }

    function getLibrarySharedTrendLookbackDays() {
        try {
            var config = getRuntimeConfig();
            var n = parseInt(String(config.LIVE_LIBRARY_LOOKBACK_DAYS || '28').replace(/[^\d]/g, ''), 10);
            if (!isFinite(n)) return 28;
            return Math.max(3, Math.min(365, n));
        } catch (e0) {
            return 28;
        }
    }

    function formatHourWindow(hour) {
        var h = (hour % 24 + 24) % 24;
        var n = (h + 1) % 24;
        var hs = (h < 10 ? '0' : '') + h + ':00';
        var ns = (n < 10 ? '0' : '') + n + ':00';
        return hs + '-' + ns;
    }

    function parseLibraryIntLoose(value, fallback) {
        var digits = String(value == null ? '' : value).match(/-?\d+/);
        if (!digits) return (typeof fallback === 'number' ? fallback : null);
        var num = parseInt(digits[0], 10);
        return isFinite(num) ? num : (typeof fallback === 'number' ? fallback : null);
    }

    function parseLibraryNumLoose(value, fallback) {
        var n = Number(value);
        return isFinite(n) ? n : (typeof fallback === 'number' ? fallback : null);
    }

    function toLibraryDateKey(ts) {
        var d = new Date(ts);
        if (!(d instanceof Date) || isNaN(d.getTime())) return '';
        var y = d.getFullYear();
        var m = d.getMonth() + 1;
        var day = d.getDate();
        return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
    }

    function parseLibraryMinuteOfDay(raw) {
        if (typeof raw === 'number' && isFinite(raw)) {
            if (raw >= 0 && raw < 24 * 60) return Math.round(raw);
            if (raw > 24 * 60) {
                var d0 = new Date(raw);
                if (!isNaN(d0.getTime())) return d0.getHours() * 60 + d0.getMinutes();
            }
        }
        var s = String(raw || '').trim();
        if (!s) return null;
        var hhmm = s.match(/^(\d{1,2}):(\d{2})$/);
        if (hhmm) {
            var hh = parseInt(hhmm[1], 10);
            var mm = parseInt(hhmm[2], 10);
            if (isFinite(hh) && isFinite(mm) && hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
                return hh * 60 + mm;
            }
        }
        var d = new Date(s);
        if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
        return null;
    }

    function getLibraryWeekdayName(dayIndex) {
        var names = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return names[(dayIndex % 7 + 7) % 7];
    }

    function normalizeLibraryWeekdayKey(raw) {
        var key = String(raw || '').toLowerCase().trim();
        if (!key) return '';
        if (/^(0|sun|sunday)$/.test(key)) return 'sunday';
        if (/^(1|mon|monday)$/.test(key)) return 'monday';
        if (/^(2|tue|tuesday)$/.test(key)) return 'tuesday';
        if (/^(3|wed|wednesday)$/.test(key)) return 'wednesday';
        if (/^(4|thu|thursday)$/.test(key)) return 'thursday';
        if (/^(5|fri|friday)$/.test(key)) return 'friday';
        if (/^(6|sat|saturday)$/.test(key)) return 'saturday';
        if (key === 'generic') return 'generic';
        return '';
    }

    function normalizeLibraryHourRows(rows) {
        if (!Array.isArray(rows)) return [];
        var map = {};
        rows.forEach(function (row) {
            var hour = parseLibraryIntLoose(row && (row.hour != null ? row.hour : row.hour_local), null);
            var avg = parseLibraryNumLoose(
                row && (row.avg_visitors != null ? row.avg_visitors
                    : row.avgNow != null ? row.avgNow
                        : row.avg_now),
                null
            );
            var minV = parseLibraryNumLoose(
                row && (row.min_visitors != null ? row.min_visitors
                    : row.minNow != null ? row.minNow
                        : row.min_now),
                null
            );
            var maxV = parseLibraryNumLoose(
                row && (row.max_visitors != null ? row.max_visitors
                    : row.maxNow != null ? row.maxNow
                        : row.max_now),
                null
            );
            var samples = parseLibraryIntLoose(row && row.samples, 0);
            if (hour == null || hour < 0 || hour > 23 || avg == null || !isFinite(avg)) return;

            if (minV == null && maxV == null) {
                var spread = Math.max(8, Math.abs(avg) * 0.08);
                minV = Math.max(0, avg - spread);
                maxV = avg + spread;
            } else {
                if (minV == null) minV = Math.max(0, avg - Math.max(5, Math.abs(avg - maxV)));
                if (maxV == null) maxV = Math.max(avg, avg + Math.max(5, Math.abs(avg - minV)));
            }
            if (maxV < minV) {
                var tmp = minV;
                minV = maxV;
                maxV = tmp;
            }
            map[hour] = {
                hour: hour,
                avg: avg,
                min: minV,
                max: maxV,
                samples: Math.max(0, samples || 0),
                window: formatHourWindow(hour)
            };
        });
        var out = Object.keys(map).map(function (k) { return map[k]; });
        out.sort(function (a, b) { return a.hour - b.hour; });
        return out;
    }

    function normalizeLibraryWeekdayAverages(rawMap) {
        var out = {};
        if (!rawMap || typeof rawMap !== 'object') return out;
        Object.keys(rawMap).forEach(function (key) {
            var normKey = normalizeLibraryWeekdayKey(key);
            if (!normKey) return;
            var rows = normalizeLibraryHourRows(rawMap[key]);
            if (rows.length) out[normKey] = rows;
        });
        return out;
    }

    function formatLibraryWeekdayObservations(weekdayName, count) {
        var labels = {
            sunday: 'Sunday',
            monday: 'Monday',
            tuesday: 'Tuesday',
            wednesday: 'Wednesday',
            thursday: 'Thursday',
            friday: 'Friday',
            saturday: 'Saturday'
        };
        var base = labels[normalizeLibraryWeekdayKey(weekdayName)] || 'day';
        return count === 1 ? base : (base + 's');
    }

    var LIBRARY_SNAPSHOT_MAX_AGE_MS = 2 * 60 * 60 * 1000;

    function extractLibraryCurrentSnapshot(crowdingResp, fallbackOccupancyResp) {
        var snap = {
            visitors: null,
            today: null,
            freeSeats: null,
            capacity: null,
            fetchedAt: null,
            source: '',
            hasCurrent: false
        };

        var c = crowdingResp && crowdingResp.current ? crowdingResp.current : null;
        var latest = crowdingResp && crowdingResp.latest ? crowdingResp.latest : null;

        if (c || latest) {
            snap.visitors = parseLibraryIntLoose(c && c.visitors != null ? c.visitors : latest && latest.now, null);
            snap.today = parseLibraryIntLoose(c && c.total_visits != null ? c.total_visits : latest && latest.today, null);
            snap.capacity = parseLibraryIntLoose(c && c.capacity != null ? c.capacity : latest && latest.capacity, null);
            snap.freeSeats = parseLibraryIntLoose(c && c.free_seats != null ? c.free_seats : latest && latest.freeSeats, null);
            if (snap.freeSeats == null && snap.capacity != null && snap.visitors != null) {
                snap.freeSeats = Math.max(0, snap.capacity - snap.visitors);
            }
            var tsRaw = c && c.timestamp ? c.timestamp : (latest && (latest.fetchedAtIso || latest.fetchedAt));
            var tsParsed = typeof tsRaw === 'number' ? tsRaw : Date.parse(tsRaw || '');
            if (isFinite(tsParsed)) snap.fetchedAt = tsParsed;
            snap.source = String((crowdingResp && crowdingResp.sourceUrl) || (latest && latest.source) || '').trim();
            snap.hasCurrent = snap.visitors != null || snap.freeSeats != null;
        }

        if (!snap.hasCurrent && fallbackOccupancyResp && fallbackOccupancyResp.occupancy) {
            var occ = fallbackOccupancyResp.occupancy;
            snap.visitors = parseLibraryIntLoose(occ.now, null);
            snap.today = parseLibraryIntLoose(occ.today, null);
            snap.capacity = parseLibraryIntLoose(occ.capacity, null);
            snap.freeSeats = parseLibraryIntLoose(occ.freeSeats, null);
            if (snap.freeSeats == null && snap.capacity != null && snap.visitors != null) {
                snap.freeSeats = Math.max(0, snap.capacity - snap.visitors);
            }
            var ts = parseLibraryIntLoose(occ.fetchedAt, null);
            if (ts != null) snap.fetchedAt = ts;
            snap.source = String(occ.source || '').trim();
            snap.hasCurrent = snap.visitors != null || snap.freeSeats != null;
        }

        // A reading older than this means the worker stopped collecting: show
        // the unavailable state, not an old count labelled "Now".
        if (snap.fetchedAt != null && Date.now() - snap.fetchedAt > LIBRARY_SNAPSHOT_MAX_AGE_MS) {
            snap.visitors = null;
            snap.today = null;
            snap.freeSeats = null;
            snap.fetchedAt = null;
            snap.hasCurrent = false;
        }

        return snap;
    }

    function buildLibraryTodaySamplesFromPayload(crowdingResp, referenceTs) {
        var today = crowdingResp && crowdingResp.today ? crowdingResp.today : null;
        if (!today || !Array.isArray(today.samples)) return [];
        var refDateKey = toLibraryDateKey(referenceTs || Date.now());
        var byMinute = {};

        today.samples.forEach(function (sample) {
            if (!sample || typeof sample !== 'object') return;
            var visitors = parseLibraryNumLoose(
                sample.visitors != null ? sample.visitors
                    : sample.now != null ? sample.now
                        : sample.value,
                null
            );
            if (visitors == null) return;

            var minute = parseLibraryMinuteOfDay(
                sample.time != null ? sample.time
                    : sample.minute != null ? sample.minute
                        : sample.timestamp != null ? sample.timestamp
                            : sample.ts != null ? sample.ts
                                : sample.at
            );
            if (minute == null || minute < 0 || minute >= 24 * 60) return;

            var sampleTs = sample.timestamp != null ? Date.parse(sample.timestamp) : NaN;
            if (!isFinite(sampleTs) && sample.ts != null) sampleTs = parseLibraryIntLoose(sample.ts, NaN);
            if (isFinite(sampleTs)) {
                var sampleDateKey = toLibraryDateKey(sampleTs);
                if (sampleDateKey && refDateKey && sampleDateKey !== refDateKey) return;
            }
            byMinute[minute] = visitors;
        });

        return Object.keys(byMinute).map(function (k) {
            return { minute: parseInt(k, 10), visitors: byMinute[k] };
        }).sort(function (a, b) { return a.minute - b.minute; });
    }

    function mergeLibraryTodaySamples(primary, fallback, currentMinute, currentVisitors) {
        var byMinute = {};
        (fallback || []).forEach(function (p) {
            if (p && isFinite(p.minute) && isFinite(p.visitors)) byMinute[p.minute] = p.visitors;
        });
        (primary || []).forEach(function (p) {
            if (p && isFinite(p.minute) && isFinite(p.visitors)) byMinute[p.minute] = p.visitors;
        });
        if (isFinite(currentMinute) && isFinite(currentVisitors)) {
            byMinute[currentMinute] = currentVisitors;
        }
        return Object.keys(byMinute).map(function (k) {
            return { minute: parseInt(k, 10), visitors: byMinute[k] };
        }).sort(function (a, b) { return a.minute - b.minute; });
    }

    function buildLibraryCrowdingModel(crowdingResp, fallbackOccupancyResp) {
        var nowTs = Date.now();
        var snapshot = extractLibraryCurrentSnapshot(crowdingResp, fallbackOccupancyResp);
        var nowDate = new Date(snapshot.fetchedAt || nowTs);
        var nowMinute = nowDate.getHours() * 60 + nowDate.getMinutes();
        var weekdayName = getLibraryWeekdayName(nowDate.getDay());

        var historical = crowdingResp && crowdingResp.historical ? crowdingResp.historical : null;
        var weekdayMap = normalizeLibraryWeekdayAverages(historical && historical.weekday_averages);
        var operatingStartHour = 8;
        var operatingEndHour = 22;
        var isWithinDisplayHours = isLibraryMinuteWithinDisplayHours(nowMinute, operatingStartHour, operatingEndHour);

        if (!Object.keys(weekdayMap).length && crowdingResp && crowdingResp.trends && Array.isArray(crowdingResp.trends.hourly)) {
            weekdayMap.generic = normalizeLibraryHourRows(crowdingResp.trends.hourly);
        }

        var weekdayRows = Array.isArray(weekdayMap[weekdayName]) ? weekdayMap[weekdayName] : [];
        var hasWeekdaySpecificHistory = weekdayRows.length > 0;
        var typicalRows = hasWeekdaySpecificHistory ? weekdayRows : (weekdayMap.generic || []);
        var currentHour = Math.floor(nowMinute / 60);
        var typicalNowRow = typicalRows.find(function (r) { return r.hour === currentHour; }) || null;
        var typicalNow = typicalNowRow ? typicalNowRow.avg : null;

        var todaySamplesPayload = buildLibraryTodaySamplesFromPayload(crowdingResp, snapshot.fetchedAt || nowTs);
        var todaySamples = mergeLibraryTodaySamples(
            todaySamplesPayload,
            [],
            nowMinute,
            snapshot.visitors
        );

        var daysCollected = parseLibraryIntLoose(historical && historical.days_collected, null);

        // Distinct dates behind this weekday's average, counted by the worker.
        var weekdayDays = historical && historical.weekday_days ? historical.weekday_days : null;
        var weekdayObservationCount = (hasWeekdaySpecificHistory && weekdayDays)
            ? parseLibraryIntLoose(weekdayDays[weekdayName], null)
            : null;

        var occupancyRatio = null;
        if (snapshot.capacity != null && snapshot.capacity > 0 && snapshot.visitors != null) {
            occupancyRatio = Math.max(0, Math.min(1, snapshot.visitors / snapshot.capacity));
        }


        return {
            snapshot: snapshot,
            nowTs: snapshot.fetchedAt || nowTs,
            nowMinute: nowMinute,
            weekdayName: weekdayName,
            startHour: operatingStartHour,
            endHour: operatingEndHour,
            isWithinDisplayHours: isWithinDisplayHours,
            todaySamples: todaySamples,
            typicalRows: typicalRows,
            weekdayMap: weekdayMap,
            typicalNow: typicalNow,
            daysCollected: daysCollected,
            weekdayObservationCount: weekdayObservationCount,
            hasWeekdaySpecificHistory: hasWeekdaySpecificHistory,
            occupancyRatio: occupancyRatio,
            weekdayDays: weekdayDays || {},
            teachingWeeksOnly: !!(historical && historical.usual_basis === 'teaching_weeks')
        };
    }

    function getLibraryCrowdingTier(occupancyRatio) {
        // isFinite(null) === true in JS (null coerces to 0), so check for null explicitly
        if (occupancyRatio == null || !isFinite(occupancyRatio)) {
            return { key: 'unknown', label: 'Unknown', color: '#888' };
        }
        if (occupancyRatio <= 0.60) {
            return { key: 'low', label: 'Plenty of seats', color: '#2e7d32' };
        }
        if (occupancyRatio <= 0.85) {
            // Fixed amber — not accent — so the green→amber→red traffic-light
            // system stays consistent regardless of the user's accent colour pick.
            return { key: 'medium', label: 'Moderate', color: '#d97706' };
        }
        return { key: 'high', label: 'Busy', color: '#c62828' };
    }

    function formatLibraryHourMinute(minute) {
        var m = Math.max(0, Math.min(1439, parseLibraryIntLoose(minute, 0)));
        var hh = Math.floor(m / 60);
        var mm = m % 60;
        return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
    }

    function formatLibraryMinuteRange(startMinute, endMinute) {
        return formatLibraryHourMinute(startMinute) + '-' + formatLibraryHourMinute(endMinute);
    }

    function isLibraryMinuteWithinDisplayHours(minute, startHour, endHour) {
        if (!isFinite(minute)) return false;
        var startMinute = parseLibraryIntLoose(startHour, 0) * 60;
        var endMinute = parseLibraryIntLoose(endHour, 24) * 60;
        return minute >= startMinute && minute <= endMinute;
    }

    function parseLibraryTimeRangeFromText(text) {
        var raw = String(text || '');
        var m = raw.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
        if (!m) return null;
        var h1 = parseInt(m[1], 10);
        var mm1 = parseInt(m[2], 10);
        var h2 = parseInt(m[3], 10);
        var mm2 = parseInt(m[4], 10);
        if (![h1, mm1, h2, mm2].every(function (n) { return isFinite(n); })) return null;
        if (h1 < 0 || h1 > 23 || h2 < 0 || h2 > 23 || mm1 < 0 || mm1 > 59 || mm2 < 0 || mm2 > 59) return null;
        return { startMinute: h1 * 60 + mm1, endMinute: h2 * 60 + mm2 };
    }

    function isLibraryEventAtDtuLibrary(ev) {
        var where = String((ev && ev.location) || '').toLowerCase();
        return /dtu\s*library/.test(where);
    }

    function buildLibraryEventIntervals(eventsResp, model) {
        if (!eventsResp || eventsResp.ok === false || !Array.isArray(eventsResp.events) || !model) return [];
        var dayStart = new Date(model.nowTs || Date.now());
        dayStart.setHours(0, 0, 0, 0);
        var dayStartTs = dayStart.getTime();
        var dayEndTs = dayStartTs + 24 * 60 * 60 * 1000;
        var graphStart = model.startHour * 60;
        var graphEnd = model.endHour * 60;
        var out = [];

        eventsResp.events.forEach(function (ev) {
            if (!ev || !isLibraryEventAtDtuLibrary(ev)) return;

            var startTs = Date.parse(ev.startIso || '');
            var endTs = Date.parse(ev.endIso || '');

            if (!isFinite(startTs)) {
                return;
            }

            if (!isFinite(endTs) || endTs <= startTs) {
                var parsed = parseLibraryTimeRangeFromText(ev.formattedDate || ev.excerpt || '');
                if (parsed) {
                    var base = new Date(startTs);
                    startTs = new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.floor(parsed.startMinute / 60), parsed.startMinute % 60).getTime();
                    endTs = new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.floor(parsed.endMinute / 60), parsed.endMinute % 60).getTime();
                    if (endTs <= startTs) endTs += 24 * 60 * 60 * 1000;
                } else {
                    endTs = startTs + 60 * 60 * 1000;
                }
            }

            if (endTs <= dayStartTs || startTs >= dayEndTs) return;

            var clippedStart = Math.max(startTs, dayStartTs);
            var clippedEnd = Math.min(endTs, dayEndTs);
            var sDate = new Date(clippedStart);
            var eDate = new Date(clippedEnd);
            var startMinute = sDate.getHours() * 60 + sDate.getMinutes();
            var endMinute = eDate.getHours() * 60 + eDate.getMinutes();

            if (clippedEnd === dayEndTs) endMinute = 24 * 60;
            startMinute = Math.max(graphStart, startMinute);
            endMinute = Math.min(graphEnd, endMinute);
            if (endMinute <= startMinute) return;

            out.push({
                startMinute: startMinute,
                endMinute: endMinute,
                title: String(ev.title || 'Library event'),
                location: String(ev.location || '')
            });
        });

        out.sort(function (a, b) { return a.startMinute - b.startMinute; });
        return out;
    }

    // One slot per opening hour: the usual average for that hour, and today's
    // average so far (the live count for the current hour).
    function buildLibraryHourBars(model) {
        if (!model) return [];
        var usualByHour = {};
        (model.typicalRows || []).forEach(function (r) {
            if (r && isFinite(r.hour) && r.avg != null && isFinite(r.avg)) usualByHour[r.hour] = r.avg;
        });
        var todaySum = {};
        var todayCount = {};
        (model.todaySamples || []).forEach(function (p) {
            if (!p || !isFinite(p.minute) || p.visitors == null || !isFinite(p.visitors)) return;
            var h = Math.floor(p.minute / 60);
            todaySum[h] = (todaySum[h] || 0) + p.visitors;
            todayCount[h] = (todayCount[h] || 0) + 1;
        });
        var showToday = model.isWithinDisplayHours && !model.isOtherDay;
        var nowHour = (showToday && isFinite(model.nowMinute)) ? Math.floor(model.nowMinute / 60) : null;
        var liveNow = model.snapshot && model.snapshot.visitors != null && isFinite(model.snapshot.visitors)
            ? model.snapshot.visitors : null;
        var bars = [];
        for (var hour = model.startHour; hour < model.endHour; hour++) {
            var today = todayCount[hour] ? todaySum[hour] / todayCount[hour] : null;
            if (hour === nowHour && liveNow != null) today = liveNow;
            if (nowHour != null && hour > nowHour) today = null;
            if (!showToday) today = null;
            bars.push({
                hour: hour,
                usual: usualByHour[hour] != null ? Math.round(usualByHour[hour]) : null,
                today: today != null ? Math.round(today) : null,
                isNow: hour === nowHour
            });
        }
        return bars;
    }

    var LIBRARY_WEEK_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    // The chart for another weekday: that day's usual bars, nothing from today.
    function selectLibraryWeekdayView(model, dayName) {
        if (!model || !dayName || dayName === model.weekdayName) return model;
        var rows = model.weekdayMap && Array.isArray(model.weekdayMap[dayName]) ? model.weekdayMap[dayName] : [];
        return Object.assign({}, model, {
            weekdayName: dayName,
            typicalRows: rows,
            hasWeekdaySpecificHistory: rows.length > 0,
            weekdayObservationCount: parseLibraryIntLoose(model.weekdayDays && model.weekdayDays[dayName], null),
            todaySamples: [],
            isOtherDay: true
        });
    }

    function buildLibraryWeekdaySummaryLine(view) {
        var busiest = null;
        buildLibraryHourBars(view).forEach(function (b) {
            if (b.usual != null && (!busiest || b.usual > busiest.usual)) busiest = b;
        });
        if (!busiest) return '';
        return 'Usual ' + formatLibraryWeekdayObservations(view.weekdayName, 2) + ': busiest '
            + (busiest.hour < 10 ? '0' : '') + busiest.hour + ':00, about ' + busiest.usual + ' people.';
    }

    function buildLibraryCrowdingInsightLine(model) {
        if (!model || !model.snapshot || !model.snapshot.hasCurrent) {
            return 'Library data unavailable right now.';
        }

        // After hours the hero already says when live numbers return.
        if (!model.isWithinDisplayHours) return '';

        // The all-days average is far off on weekends, so only this weekday's
        // own average is a fair comparison.
        var current = model.snapshot.visitors;
        var typicalNow = model.hasWeekdaySpecificHistory ? model.typicalNow : null;
        if (current != null && isFinite(current) && typicalNow != null && isFinite(typicalNow)) {
            var delta = current - typicalNow;
            var threshold = Math.max(20, typicalNow * 0.12);
            if (delta <= -threshold) return 'Quieter than usual for this hour.';
            if (delta >= threshold) return 'Busier than usual for this hour.';
            return 'About usual for this hour.';
        }

        // The hero already says how full it is; no second line for that.
        return '';
    }

    function buildLibraryCrowdingConfidenceLine(model) {
        if (!model) return '';
        var sampleCount = (model.todaySamples || []).length;
        var dayCount = parseLibraryIntLoose(model.daysCollected, null);
        var weekdayCount = parseLibraryIntLoose(model.weekdayObservationCount, null);
        if (model.hasWeekdaySpecificHistory && weekdayCount != null && weekdayCount > 0) {
            var days = weekdayCount + ' ' + formatLibraryWeekdayObservations(model.weekdayName, weekdayCount);
            return model.teachingWeeksOnly
                ? 'Usual: average of ' + days + ' in DTU teaching weeks, holidays and exams left out.'
                : 'Usual: average of the last ' + days + '.';
        }
        if (dayCount != null && dayCount > 0) {
            return 'Usual: all days averaged, ' + dayCount + ' day' + (dayCount === 1 ? '' : 's') + ' of data.';
        }
        if (model.typicalRows && model.typicalRows.length) return 'Usual: all days averaged.';
        if (sampleCount > 0) {
            return 'Today\'s shared trend is still building.';
        }
        return 'Building historical averages...';
    }

    function formatLibraryOccupancyCount(value) {
        if (typeof value !== 'number' || !isFinite(value)) return '--';
        try { return value.toLocaleString('en-GB'); } catch (e0) { return String(value); }
    }

    try {
        globalThis.DTUAfterDarkLibraryData = {
            LIBRARY_WEEK_ORDER: LIBRARY_WEEK_ORDER,
            buildLibraryCrowdingModel: buildLibraryCrowdingModel,
            buildLibraryEventIntervals: buildLibraryEventIntervals,
            getLibraryCrowdingTier: getLibraryCrowdingTier,
            buildLibraryCrowdingInsightLine: buildLibraryCrowdingInsightLine,
            buildLibraryCrowdingConfidenceLine: buildLibraryCrowdingConfidenceLine,
            formatLibraryOccupancyCount: formatLibraryOccupancyCount,
            selectLibraryWeekdayView: selectLibraryWeekdayView,
            buildLibraryWeekdaySummaryLine: buildLibraryWeekdaySummaryLine,
            buildLibraryHourBars: buildLibraryHourBars,
            formatLibraryWeekdayObservations: formatLibraryWeekdayObservations,
            formatLibraryMinuteRange: formatLibraryMinuteRange
        };
    } catch (eExposeLibraryData) { }

    try {
        var existingLibraryDeps = globalThis.DTUAfterDarkLibraryDeps || {};
        globalThis.DTUAfterDarkLibraryDeps = Object.assign({}, existingLibraryDeps, {
            isTopWindow: existingLibraryDeps.isTopWindow || function () { return isTopWindow(); },
            isLibraryEnabled: isLibraryEnabled,
            isDTULearnHomepage: existingLibraryDeps.isDTULearnHomepage || function () { return isDTULearnHomepage(); },
            deepQueryAll: existingLibraryDeps.deepQueryAll || null,
            requestLibraryEvents: requestLibraryEvents,
            requestLibraryNews: requestLibraryNews,
            requestLibraryCrowding: requestLibraryCrowding,
            extractLibraryCurrentSnapshot: extractLibraryCurrentSnapshot,
            formatLibraryOccupancyCount: formatLibraryOccupancyCount,
            markExt: existingLibraryDeps.markExt || function (el) { return markExt(el); },
            getLibraryUiState: function () {
                return {
                    eventsCache: _libraryEventsCache,
                    newsCache: _libraryNewsCache,
                    crowdingCache: _libraryCrowdingCache,
                    escHandler: _libraryEscHandler,
                    occupancyAutoTimer: _libraryOccupancyAutoTimer
                };
            },
            setLibraryUiState: function (next) {
                if (!next || typeof next !== 'object') return;
                if (Object.prototype.hasOwnProperty.call(next, 'eventsCache')) _libraryEventsCache = next.eventsCache || null;
                if (Object.prototype.hasOwnProperty.call(next, 'newsCache')) _libraryNewsCache = next.newsCache || null;
                if (Object.prototype.hasOwnProperty.call(next, 'crowdingCache')) _libraryCrowdingCache = next.crowdingCache || null;
                if (Object.prototype.hasOwnProperty.call(next, 'escHandler')) _libraryEscHandler = next.escHandler || null;
                if (Object.prototype.hasOwnProperty.call(next, 'occupancyAutoTimer')) _libraryOccupancyAutoTimer = next.occupancyAutoTimer || null;
            }
        });
    } catch (eLibDeps) { }
})();
