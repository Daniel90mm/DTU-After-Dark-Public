// Asks for the optional beyondborders.dtu.dk permission. It must run on an extension
// page after a click: content scripts (the Settings dialog) cannot request permissions.
(function () {
    'use strict';
    var api = (typeof browser !== 'undefined') ? browser : chrome;
    var ORIGINS = { origins: ['https://beyondborders.dtu.dk/*'] };
    var button = document.getElementById('allow');
    var status = document.getElementById('status');

    function show(text, state) {
        status.textContent = text;
        if (state) status.setAttribute('data-state', state); else status.removeAttribute('data-state');
    }

    function granted() {
        button.disabled = true;
        show('Access granted. Reload DTU Learn to see the exchange deadline.');
    }

    Promise.resolve(api.permissions.contains(ORIGINS)).then(function (has) { if (has) granted(); });

    button.addEventListener('click', function () {
        Promise.resolve(api.permissions.request(ORIGINS)).then(function (ok) {
            if (ok) granted();
            else show('Access was not granted. The Deadlines widget keeps working without the exchange deadline.', 'error');
        }, function (err) {
            show('The browser refused the request: ' + (err && err.message || err), 'error');
        });
    });
})();
