(function () {
    'use strict';

    var _settingsBridge = globalThis.DTUAfterDarkSettingsBridge;
    if (!_settingsBridge) throw new Error('darkmode.settings.footer.js loaded before darkmode.settings.bridge.js');
    var _settingsPause = globalThis.DTUAfterDarkSettingsPause;
    if (!_settingsPause || typeof _settingsPause.showPausedUrlRulesModal !== 'function') {
        throw new Error('darkmode.settings.footer.js loaded before darkmode.settings.pause.js');
    }

    var markExt = _settingsBridge.markExt;
    var showPausedUrlRulesModal = _settingsPause.showPausedUrlRulesModal;

    function getAfterDarkDisclaimerText() {
        return 'DTU After Dark is unofficial and not affiliated with DTU, Arcanic, or any service provider. '
            + 'Information shown (exam dates, deadlines, grades, bus times) may be inaccurate or outdated. '
            + 'Always verify critical information through official DTU channels. '
            + 'The developer(s) accept no responsibility for any consequences arising from the use of this extension.';
    }

    function getAfterDarkDebugIdeasMailtoHref() {
        var subject = 'DTU After Dark - Debug/Ideas';
        var body = 'Hi Daniel,\n\nPage URL:\n\nIdea or issue:\n';
        return 'mailto:daniel-yttesen@hotmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    }

    function createAfterDarkDisclaimerFooter() {
        var disclaimerFooter = document.createElement('div');
        markExt(disclaimerFooter);
        disclaimerFooter.style.cssText = 'padding:12px 18px 14px;font-size:10.5px;line-height:1.45;color:var(--dtu-am-muted);border-top:1px solid var(--dtu-am-border);margin-top:auto;';

        var textNode = document.createElement('span');
        markExt(textNode);
        textNode.textContent = getAfterDarkDisclaimerText();
        disclaimerFooter.appendChild(textNode);

        var actionRow = document.createElement('div');
        markExt(actionRow);
        actionRow.style.cssText = 'display:flex;align-items:center;gap:18px;flex-wrap:nowrap;overflow-x:auto;margin-top:10px;padding-bottom:2px;';

        function applyFooterActionTextStyle(btn) {
            btn.style.cssText = 'display:inline-flex;align-items:center;justify-content:flex-start;'
                + 'appearance:none;-webkit-appearance:none;margin:0;padding:0;border:0;background:transparent;'
                + 'color:var(--dtu-am-active-text);font-size:11px;font-weight:700;line-height:1.45;cursor:pointer;'
                + 'white-space:nowrap;text-decoration:none;';
            try {
                btn.style.setProperty('background', 'transparent', 'important');
                btn.style.setProperty('background-color', 'transparent', 'important');
                btn.style.setProperty('background-image', 'none', 'important');
                btn.style.setProperty('border', '0', 'important');
                btn.style.setProperty('box-shadow', 'none', 'important');
            } catch (e00) { }
            btn.addEventListener('mouseenter', function () {
                try {
                    btn.style.textDecoration = 'underline';
                    btn.style.setProperty('background', 'transparent', 'important');
                    btn.style.setProperty('background-color', 'transparent', 'important');
                    btn.style.setProperty('box-shadow', 'none', 'important');
                } catch (e0) { }
            });
            btn.addEventListener('mouseleave', function () {
                try {
                    btn.style.textDecoration = 'none';
                    btn.style.setProperty('background', 'transparent', 'important');
                    btn.style.setProperty('background-color', 'transparent', 'important');
                    btn.style.setProperty('box-shadow', 'none', 'important');
                } catch (e1) { }
            });
            btn.addEventListener('mousedown', function () {
                try {
                    btn.style.setProperty('background', 'transparent', 'important');
                    btn.style.setProperty('background-color', 'transparent', 'important');
                    btn.style.setProperty('box-shadow', 'none', 'important');
                } catch (e2) { }
            });
            btn.addEventListener('mouseup', function () {
                try {
                    btn.style.setProperty('background', 'transparent', 'important');
                    btn.style.setProperty('background-color', 'transparent', 'important');
                    btn.style.setProperty('box-shadow', 'none', 'important');
                } catch (e3) { }
            });
            btn.addEventListener('focus', function () {
                try {
                    btn.style.setProperty('background', 'transparent', 'important');
                    btn.style.setProperty('background-color', 'transparent', 'important');
                    btn.style.setProperty('box-shadow', 'none', 'important');
                } catch (e4) { }
            });
        }

        var debugIdeasBtn = document.createElement('button');
        markExt(debugIdeasBtn);
        debugIdeasBtn.type = 'button';
        debugIdeasBtn.textContent = 'Send feedback or bug report';
        debugIdeasBtn.setAttribute('aria-label', 'Send feedback or bug report by email');
        applyFooterActionTextStyle(debugIdeasBtn);
        debugIdeasBtn.addEventListener('click', function (e) {
            try { if (e) e.preventDefault(); } catch (e0) { }
            try { if (e) e.stopPropagation(); } catch (e1) { }
            try { window.location.href = getAfterDarkDebugIdeasMailtoHref(); } catch (e2) { }
        });
        actionRow.appendChild(debugIdeasBtn);

        var pausedUrlsBtn = document.createElement('button');
        markExt(pausedUrlsBtn);
        pausedUrlsBtn.type = 'button';
        pausedUrlsBtn.textContent = 'Paused URLs...';
        pausedUrlsBtn.setAttribute('aria-label', 'Manage paused URL rules');
        applyFooterActionTextStyle(pausedUrlsBtn);
        pausedUrlsBtn.addEventListener('click', function (e) {
            try { if (e) e.preventDefault(); } catch (e0) { }
            try { if (e) e.stopPropagation(); } catch (e1) { }
            showPausedUrlRulesModal({ reopenSettingsOnClose: true, initialFocus: 'add' });
        });
        actionRow.appendChild(pausedUrlsBtn);

        disclaimerFooter.appendChild(actionRow);
        return disclaimerFooter;
    }

    try {
        globalThis.DTUAfterDarkSettingsFooter = {
            getAfterDarkDisclaimerText: getAfterDarkDisclaimerText,
            getAfterDarkDebugIdeasMailtoHref: getAfterDarkDebugIdeasMailtoHref,
            createAfterDarkDisclaimerFooter: createAfterDarkDisclaimerFooter
        };
    } catch (eSettingsFooter) { }
})();
