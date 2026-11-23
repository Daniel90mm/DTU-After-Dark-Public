(function () {
    'use strict';

    // iCalendar (RFC 5545) files made in the browser: the Study Planner exam export and the
    // DTU Learn deadlines export. events: [{ uid, date, endDate, summary, description }] with
    // ISO dates, one all-day event each; stamp: a UTC "YYYYMMDDTHHMMSSZ". Lines end in CRLF
    // and fold at 75 octets.
    function icsEscape(text) {
        return String(text || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    }

    function icsFold(line) {
        var out = '';
        var octets = 0;
        for (var i = 0; i < line.length; i++) {
            var c = line.charCodeAt(i);
            var n = c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xd800 && c < 0xdc00) ? 4 : (c >= 0xdc00 && c < 0xe000) ? 0 : 3;
            if (octets + n > 75) { out += '\r\n '; octets = 1; }
            out += line[i];
            octets += n;
        }
        return out;
    }

    function icsDate(iso) { return iso.replace(/-/g, ''); }

    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    function nextIsoDay(iso) {
        var p = iso.split('-').map(Number);
        var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + 1));
        return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
    }

    function buildCalendar(events, stamp, calendarName) {
        var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DTU After Dark//Calendar export//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsEscape(calendarName || 'DTU')];
        (events || []).forEach(function (e) {
            if (!e || !e.date) return;
            var last = e.endDate && e.endDate > e.date ? e.endDate : e.date;
            lines.push('BEGIN:VEVENT', 'UID:' + icsEscape(e.uid), 'DTSTAMP:' + stamp,
                'DTSTART;VALUE=DATE:' + icsDate(e.date), 'DTEND;VALUE=DATE:' + icsDate(nextIsoDay(last)),
                'SUMMARY:' + icsEscape(e.summary), 'DESCRIPTION:' + icsEscape(e.description), 'END:VEVENT');
        });
        lines.push('END:VCALENDAR');
        return lines.map(icsFold).join('\r\n') + '\r\n';
    }

    function stampNow() {
        return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    }

    // Saves the calendar text as a file through a hidden link; nothing leaves the browser.
    function downloadCalendar(text, fileName) {
        var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.setAttribute('data-dtu-ext', '1');
        a.href = url;
        a.download = fileName;
        a.hidden = true;
        document.body.appendChild(a);
        a.click();
        a.parentNode.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    }

    try {
        globalThis.DTUAfterDarkIcs = {
            buildCalendar: buildCalendar,
            stampNow: stampNow,
            downloadCalendar: downloadCalendar
        };
    } catch (eIcs) { }
})();
