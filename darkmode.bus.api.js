(function () {
    'use strict';

    var markExt = globalThis.DTUAfterDarkDom && globalThis.DTUAfterDarkDom.markExt;
    if (typeof markExt !== 'function') {
        throw new Error('DTU After Dark: darkmode.dom.js must load before darkmode.bus.api.js');
    }

    // ===== API RATE LIMITING =====
    // Per-user daily limit for transit API usage (resets each day)
    var DAILY_API_LIMIT = 500; // max API calls per user per day
    var API_CALLS_KEY = 'dtuDarkModeBusApiCalls';
    var API_QUOTA_KEY = 'dtuDarkModeBusQuotaExhausted';
    // The month the quota ran out in, kept here too for when site storage cannot hold it.
    // Compared with the current month, so another tab's reset or a new month ends it.
    var _apiQuotaMonth = null;
    var DOM = globalThis.DTUAfterDarkDom;

    // Limits reset on Danish days and months, whatever the browser's time zone.
    function danishDateIso() {
        return DOM.copenhagenDateIso();
    }

    function danishMonthKey(ts) {
        return DOM.copenhagenDateIso(ts).slice(0, 7);
    }

    // The daily limit resets at Danish midnight, so the countdown runs to it.
    function msUntilDanishMidnight(now) {
        var p = DOM.copenhagenParts(now);
        return DOM.copenhagenTs(p.year, p.month, p.day + 1, 0, 0) - now;
    }

    function getDailyApiCount() {
        try {
            var data = JSON.parse(localStorage.getItem(API_CALLS_KEY) || '{}');
            var today = danishDateIso();
            if (data.date !== today) return { date: today, count: 0 };
            return data;
        } catch (e) {
            return { date: danishDateIso(), count: 0 };
        }
    }

    function incrementApiCount() {
        var data = getDailyApiCount();
        data.count++;
        localStorage.setItem(API_CALLS_KEY, JSON.stringify(data));
        return data.count;
    }

    function isDailyLimitReached() {
        return getDailyApiCount().count >= DAILY_API_LIMIT;
    }

    function consumeBusApiRequestBudget() {
        if (isDailyLimitReached()) {
            showQuotaExhaustedMessage('daily');
            return false;
        }
        incrementApiCount();
        return true;
    }

    // Server-side quota exhaustion (HTTP 429 only, see fetchBusWidgetDepartures): persists until next month
    function isApiQuotaExhausted() {
        var stored = null;
        try { stored = localStorage.getItem(API_QUOTA_KEY); } catch (e0) { }
        var storedTs = stored ? Date.parse(stored) : NaN;
        var spentMonth = stored ? (isFinite(storedTs) ? danishMonthKey(storedTs) : '') : _apiQuotaMonth;
        if (spentMonth === null) return false;
        if (spentMonth !== danishMonthKey()) {
            if (stored) { try { localStorage.removeItem(API_QUOTA_KEY); } catch (e1) { } }
            _apiQuotaMonth = null;
            return false;
        }
        return true;
    }

    // Pauses fetching until the month changes. The user's Bus setting is left
    // alone: it used to be switched off and stayed off after the reset.
    function setApiQuotaExhausted() {
        _apiQuotaMonth = danishMonthKey();
        localStorage.setItem(API_QUOTA_KEY, new Date().toISOString());
    }

    // Show a notification when API limits are hit
    function showQuotaExhaustedMessage(type) {
        if (document.querySelector('.dtu-quota-exhausted')) return;

        var isDaily = type === 'daily';
        var notice = document.createElement('div');
        markExt(notice);
        notice.className = 'dtu-quota-exhausted';
        notice.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 999999; '
            + 'background: linear-gradient(135deg, var(--dtu-ad-accent) 0%, var(--dtu-ad-accent-deep) 100%); '
            + 'color: #fff; padding: 16px 20px; border-radius: 12px; '
            + 'font-family: "Helvetica Neue",Helvetica,Arial,sans-serif; font-size: 13px; line-height: 1.5; '
            + 'max-width: 320px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); '
            + 'animation: dtuSlideIn 0.3s ease-out;';

        var title = document.createElement('div');
        markExt(title);
        title.style.cssText = 'font-weight: 700; font-size: 14px; margin-bottom: 6px;';
        title.textContent = 'Bus Departures Paused';

        var msg = document.createElement('div');
        markExt(msg);
        msg.style.opacity = '0.95';
        var countdownEl = null;
        var countdownInterval = null;

        if (isDaily) {
            msg.textContent = 'You\u2019ve used ' + getDailyApiCount().count + '/' + DAILY_API_LIMIT
                + ' bus lookups today.';

            // Countdown to Danish midnight, when the daily count resets
            countdownEl = document.createElement('div');
            markExt(countdownEl);
            countdownEl.style.cssText = 'margin-top: 8px; font-size: 13px; font-weight: 600; '
                + 'font-variant-numeric: tabular-nums; letter-spacing: 0.5px;';

            function updateCountdown() {
                var diff = msUntilDanishMidnight(Date.now());
                if (diff <= 0) {
                    countdownEl.textContent = 'Bus times are available now! Reload the page.';
                    if (countdownInterval) clearInterval(countdownInterval);
                    return;
                }
                var h = Math.floor(diff / 3600000);
                var m = Math.floor((diff % 3600000) / 60000);
                var s = Math.floor((diff % 60000) / 1000);
                countdownEl.textContent = 'Bus times available in '
                    + String(h).padStart(2, '0') + ':'
                    + String(m).padStart(2, '0') + ':'
                    + String(s).padStart(2, '0');
            }
            updateCountdown();
            countdownInterval = setInterval(updateCountdown, 1000);
        } else {
            // This used to switch Bus off, so it never came back on its own.
            msg.textContent = 'The monthly request limit for Rejseplanen has been reached. '
                + 'Bus times are paused and resume automatically next month.';
        }

        var dismiss = document.createElement('button');
        markExt(dismiss);
        dismiss.style.cssText = 'margin-top: 10px; background: rgba(255,255,255,0.15); color: #fff; '
            + 'border: 1px solid rgba(255,255,255,0.3); padding: 6px 16px; border-radius: 6px; '
            + 'cursor: pointer; font-size: 12px; font-weight: 600;';
        dismiss.textContent = 'Got it';
        dismiss.addEventListener('click', function () {
            if (countdownInterval) clearInterval(countdownInterval);
            notice.style.transition = 'opacity 0.3s';
            notice.style.opacity = '0';
            setTimeout(function () { notice.remove(); }, 300);
        });

        notice.appendChild(title);
        notice.appendChild(msg);
        if (countdownEl) notice.appendChild(countdownEl);
        notice.appendChild(dismiss);
        document.body.appendChild(notice);
    }

    try {
        globalThis.DTUAfterDarkBusApi = {
            danishDateIso: danishDateIso,
            getDailyApiCount: getDailyApiCount,
            incrementApiCount: incrementApiCount,
            isDailyLimitReached: isDailyLimitReached,
            consumeBusApiRequestBudget: consumeBusApiRequestBudget,
            isApiQuotaExhausted: isApiQuotaExhausted,
            setApiQuotaExhausted: setApiQuotaExhausted,
            showQuotaExhaustedMessage: showQuotaExhaustedMessage
        };
    } catch (eExport) { }
})();
