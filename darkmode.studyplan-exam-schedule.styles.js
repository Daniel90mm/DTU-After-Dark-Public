// Study Planner exam schedule: the dialog's stylesheet text and theme tokens.
// Loaded by darkmode.studyplan-exam-schedule.js before it draws the panel.
(function () {
    'use strict';

    // The dialog's own rules lead with div.dtu-es-pop[data-dtu-ext]: darkmode.css paints every
    // "body > div:not(.typebox)" solid, and a plain class selector loses to it.
    var POP = 'div.dtu-es-pop[data-dtu-ext]';
    var CSS = [
        // A filled accent button, so the one entry point to the panel is easy to spot.
        '.dtu-es-btn{appearance:none;-webkit-appearance:none;display:inline-flex;align-items:center;gap:5px;margin:0 0 0 8px;padding:5px 11px 5px 9px;border:0!important;border-radius:999px;background:var(--dtu-es-accent)!important;color:var(--dtu-es-on-accent)!important;font:inherit;font-size:13px;font-weight:600;line-height:18px!important;cursor:pointer;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:filter .15s ease,transform .15s ease,box-shadow .15s ease}',
        // The button overhangs its line by 3px above and below, so the name stays level with
        // "120 ECTS planned" in the next column; 8px under the row keeps it off the plan box.
        // In the planner's tab row, left of "Course search": the same shape, size and font
        // as the two native tabs, told apart by the icon, bold text, the brighter accent and a gap.
        '.mofoclass ul.nav-tabs > li.dtu-es-tab{float:left;margin:0 8px 0 0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;list-style:none}',
        '.dtu-es-btn.dtu-es-btn-tab{gap:7px;margin:0;padding:10px 15px;border-radius:4px 4px 0 0;font:inherit;font-weight:700;line-height:16px!important;background:var(--dtu-ad-accent-hover,#b30000)!important;color:var(--dtu-ad-accent-on,#ffffff)!important;box-shadow:none}',
        '.dtu-es-btn.dtu-es-btn-tab:hover,.dtu-es-btn.dtu-es-btn-tab[aria-expanded="true"]{transform:none;box-shadow:none;filter:brightness(1.12)}',
        '.dtu-es-btn svg{width:14px;height:14px;flex:none;fill:none!important;stroke:currentColor!important}',
        '.dtu-es-btn:hover,.dtu-es-btn[aria-expanded="true"]{filter:brightness(1.08);transform:translateY(-1px);box-shadow:0 3px 8px rgba(0,0,0,.3)}',
        '.dtu-es-btn:active{transform:none;box-shadow:0 1px 2px rgba(0,0,0,.25)}',
        '@media (prefers-reduced-motion:reduce){.dtu-es-btn{transition:none}.dtu-es-btn:hover,.dtu-es-btn[aria-expanded="true"]{transform:none}}',
        '.dtu-es-btn:focus-visible,.dtu-es-pop :focus-visible{outline:2px solid var(--dtu-es-accent)!important;outline-offset:2px}',
        // Same blurred, see-through backdrop as Settings, Library and the course map.
        'div.dtu-es-backdrop[data-dtu-ext]{position:fixed;inset:0;z-index:2147482999;background:transparent!important;background-color:transparent!important;backdrop-filter:blur(4px)!important;-webkit-backdrop-filter:blur(4px)!important}',
        POP + '{position:fixed;inset:0;margin:auto;z-index:2147483000;box-sizing:border-box;display:flex;flex-direction:column;width:min(760px,calc(100vw - 32px));height:min(660px,calc(100vh - 48px));padding:0;border:1px solid var(--dtu-es-faint)!important;border-radius:12px;background:var(--dtu-es-bg)!important;color:var(--dtu-es-ink)!important;font:13px/1.45 Arial,Helvetica,sans-serif;box-shadow:0 24px 64px rgba(0,0,0,.45);text-align:left;overflow:hidden}',
        POP + ' *{box-sizing:border-box}',
        POP + ' div{background:transparent!important;border-color:var(--dtu-es-line)!important}',
        '.dtu-es-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 16px 0 24px}',
        '.dtu-es-title{font-size:17px;font-weight:700;line-height:1.25;color:var(--dtu-es-ink)!important}',
        POP + ' button{appearance:none;-webkit-appearance:none;margin:0;padding:3px 10px;border:1px solid var(--dtu-es-faint)!important;border-radius:6px;background:transparent!important;color:var(--dtu-es-ink)!important;font:inherit;font-size:12px;line-height:18px;cursor:pointer;white-space:nowrap}',
        POP + ' button:hover{border-color:var(--dtu-es-accent)!important}',
        POP + ' button.dtu-es-close{width:30px;height:30px;padding:0;border-color:transparent!important;border-radius:8px;font-size:20px;line-height:28px;color:var(--dtu-es-muted)!important}',
        POP + ' button.dtu-es-close:hover{background:var(--dtu-es-tint)!important;color:var(--dtu-es-ink)!important}',
        POP + ' a{color:var(--dtu-es-ink)!important;text-decoration:underline;text-underline-offset:2px}',
        // One tab per exam period; the open one is a filled pill.
        '.dtu-es-tabs{display:flex;flex-wrap:wrap;gap:4px;padding:12px 20px 0}',
        POP + ' button.dtu-es-ptab{padding:6px 12px;border-color:transparent!important;border-radius:16px;font-size:13px;color:var(--dtu-es-muted)!important}',
        POP + ' button.dtu-es-ptab:hover{color:var(--dtu-es-ink)!important}',
        POP + ' button.dtu-es-ptab[aria-selected="true"]{background:var(--dtu-es-cell)!important;color:var(--dtu-es-ink)!important;font-weight:700}',
        '.dtu-es-body{flex:1 1 auto;min-height:0;overflow:auto;padding:22px 24px 10px;scrollbar-width:thin}',
        '.dtu-es-sum{font-size:20px;line-height:26px;font-weight:700;color:var(--dtu-es-ink)!important;overflow-wrap:anywhere}',
        '.dtu-es-sumnote{margin-top:4px;font-size:13.5px;line-height:19px;color:var(--dtu-es-muted)!important}',
        '.dtu-es-sumnote.near{color:var(--dtu-es-accent)!important}',
        // One cell per day: filled for a planned exam, dashed for a basket course.
        '.dtu-es-strip{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:3px;margin:20px 0 4px}',
        POP + ' div.dtu-es-sday{display:grid;justify-items:center;align-content:start;gap:5px;height:34px;min-width:0;font-size:10.5px;color:var(--dtu-es-muted)!important}',
        '.dtu-es-sday i{display:block;width:100%;height:14px;border-radius:3px;background:var(--dtu-es-cell)!important}',
        '.dtu-es-sday.plan i{background:var(--dtu-es-accent)!important;opacity:1}',
        '.dtu-es-sday.bask i{background:transparent!important;border:1.5px dashed var(--dtu-es-accent)!important;opacity:1}',
        '.dtu-es-sday.plan.bask i{background:var(--dtu-es-accent)!important;border:0!important;outline:1.5px dashed var(--dtu-es-accent);outline-offset:2px}',
        POP + ' div.dtu-es-sday.plan,' + POP + ' div.dtu-es-sday.bask{color:var(--dtu-es-ink)!important;font-weight:700}',
        '.dtu-es-cols{display:grid;grid-template-columns:104px minmax(0,1fr) 80px 150px;column-gap:16px;margin-top:14px;padding-bottom:6px;font-size:11px;color:var(--dtu-es-muted)!important}',
        '.dtu-es-cols span{grid-column:3/-1;cursor:help}',
        '.dtu-es-sec{margin:22px 0 8px;font-size:12px;font-weight:700;color:var(--dtu-es-muted)!important}',
        // One line per exam, split by hairlines; a click opens where the date comes from and the editor.
        POP + ' div.dtu-es-row{display:grid;grid-template-columns:104px minmax(0,1fr) 80px 150px;column-gap:16px;align-items:baseline;margin:0 -10px;padding:12px 10px;border-top:1px solid var(--dtu-es-line)!important;font-size:14px;line-height:19px;cursor:pointer}',
        POP + ' div.dtu-es-row:not(.open):hover{background:var(--dtu-es-tint)!important}',
        '.dtu-es-when{font-weight:700;white-space:nowrap;color:var(--dtu-es-ink)!important}',
        '.dtu-es-course{min-width:0;overflow-wrap:anywhere;color:var(--dtu-es-ink)!important}',
        '.dtu-es-code{margin-left:7px;font-size:12px;color:var(--dtu-es-muted)!important}',
        '.dtu-es-row.quiet .dtu-es-when,.dtu-es-row.basket .dtu-es-when{font-weight:400;color:var(--dtu-es-muted)!important}',
        '.dtu-es-row.basket .dtu-es-course{color:var(--dtu-es-muted)!important}',
        '.dtu-es-load{display:flex;align-items:center;gap:7px;min-height:19px;font-size:12px;color:var(--dtu-es-muted)!important;white-space:nowrap}',
        '.dtu-es-load[title]{cursor:help}',
        '.dtu-es-load i{display:flex;gap:2px}',
        '.dtu-es-load u{display:block;width:7px;height:9px;border-radius:1.5px;background:var(--dtu-es-cell)!important;text-decoration:none}',
        '.dtu-es-load u.on{background:var(--dtu-es-muted)!important}',
        '.dtu-es-kind{font-size:13px;text-align:right;color:var(--dtu-es-muted)!important}',
        '.dtu-es-kind.near{font-weight:700;color:var(--dtu-es-accent)!important}',
        POP + ' div.dtu-es-detail{grid-column:2/-1;margin-top:8px;padding:10px 12px;border-radius:8px;background:var(--dtu-es-tint)!important;font-size:12.5px;line-height:18px;color:var(--dtu-es-muted)!important;cursor:default}',
        '.dtu-es-row.changed .dtu-es-detail{color:var(--dtu-es-ink)!important}',
        '.dtu-es-detail-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-top:8px}',
        POP + ' button.dtu-es-change{padding:4px 12px;border-color:var(--dtu-es-accent)!important;color:var(--dtu-es-accent)!important;font-weight:700}',
        '.dtu-es-note{grid-column:2/-1;font-size:12px;color:var(--dtu-es-muted)!important}',
        // The editor: a label column and a field column, so the last day's
        // lists sit exactly under the first day's.
        POP + ' div.dtu-es-edit{grid-column:2/-1;display:grid;grid-template-columns:max-content minmax(0,1fr);gap:10px 12px;align-items:center;margin-top:12px;padding-top:14px;border-top:1px solid var(--dtu-es-line)!important;cursor:default}',
        '.dtu-es-flabel{grid-column:1;font-size:12px;color:var(--dtu-es-muted)!important}',
        '.dtu-es-field{grid-column:2;justify-self:start}',
        POP + ' select.dtu-es-format{width:278px}',
        '.dtu-es-edit [hidden]{display:none!important}',
        POP + ' .dtu-es-edit select{height:30px;padding:0 6px;border:1px solid var(--dtu-es-faint)!important;border-radius:7px;background:var(--dtu-es-bg)!important;color:var(--dtu-es-ink)!important;font:inherit;font-size:13px;color-scheme:var(--dtu-es-scheme);cursor:pointer}',
        POP + ' .dtu-es-edit select:hover{border-color:var(--dtu-es-muted)!important}',
        '.dtu-es-datefield{display:inline-flex;gap:6px}',
        POP + ' .dtu-es-datefield select.dtu-es-d{width:64px}',
        POP + ' .dtu-es-datefield select.dtu-es-m{width:124px}',
        POP + ' .dtu-es-datefield select.dtu-es-y{width:78px}',
        POP + ' label.dtu-es-several{grid-column:2;justify-self:start;display:inline-flex;align-items:center;gap:7px;margin:-2px 0 0;font-size:13px;font-weight:400!important;white-space:nowrap;color:var(--dtu-es-ink)!important;cursor:pointer;user-select:none}',
        '.dtu-es-several input{width:15px;height:15px;margin:0;accent-color:var(--dtu-es-accent);cursor:pointer}',
        '.dtu-es-edit-buttons{grid-column:2/-1;display:flex;align-items:center;gap:8px;margin-top:2px}',
        POP + ' .dtu-es-edit-buttons button{height:30px;padding:0 14px;border-radius:7px;font-size:13px}',
        POP + ' .dtu-es-edit-buttons button.dtu-es-save{border-color:var(--dtu-es-accent)!important;background:var(--dtu-es-accent)!important;color:var(--dtu-es-on-accent)!important;font-weight:700}',
        POP + ' .dtu-es-edit-buttons button.dtu-es-save:hover{filter:brightness(1.08)}',
        POP + ' .dtu-es-edit-buttons button.dtu-es-reset{margin-left:auto}',
        '.dtu-es-err{grid-column:2/-1;font-size:12px;color:var(--dtu-es-accent)!important}',
        '.dtu-es-empty{padding:12px 0;color:var(--dtu-es-muted)!important}',
        // The notice stays in sight at the foot; "Why" opens its full wording above the line.
        '.dtu-es-foot{padding:14px 24px 16px;border-top:1px solid var(--dtu-es-line)!important}',
        '.dtu-es-notice-text{margin:0 0 12px;font-size:12px;line-height:1.5;color:var(--dtu-es-ink)!important;opacity:.86}',
        '.dtu-es-notice-text[hidden]{display:none}',
        '.dtu-es-export{margin:0 0 14px}',
        '.dtu-es-export[hidden]{display:none}',
        '.dtu-es-read{margin:0 0 6px;font-size:12px;color:var(--dtu-es-muted)!important}',
        '.dtu-es-picks{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:2px 16px;margin-bottom:10px}',
        POP + ' label.dtu-es-pick{display:flex;align-items:center;gap:8px;margin:0 -6px;padding:6px;border-radius:7px;font-size:13px;font-weight:400!important;color:var(--dtu-es-ink)!important;cursor:pointer;user-select:none}',
        POP + ' label.dtu-es-pick:hover{background:var(--dtu-es-tint)!important}',
        '.dtu-es-pick input{width:15px;height:15px;margin:0;flex:none;accent-color:var(--dtu-es-accent);cursor:pointer}',
        '.dtu-es-pick span{flex:1 1 auto;min-width:0}',
        '.dtu-es-pick i{font-style:normal;font-size:12px;color:var(--dtu-es-muted)!important;white-space:nowrap}',
        '.dtu-es-footline{display:flex;justify-content:space-between;align-items:center;gap:12px 16px;flex-wrap:wrap;font-size:12px;color:var(--dtu-es-muted)!important}',
        POP + ' button.dtu-es-why{padding:0;border:0!important;border-radius:2px;font-size:12px;text-decoration:underline;text-underline-offset:2px}',
        POP + ' button.dtu-es-primary{padding:7px 14px;border-color:var(--dtu-es-accent)!important;border-radius:7px;background:var(--dtu-es-accent)!important;color:var(--dtu-es-on-accent)!important;font-size:13px;font-weight:700}',
        POP + ' button.dtu-es-primary:hover{filter:brightness(1.08)}',
        POP + ' button.dtu-es-primary:disabled{filter:none;cursor:default;border-color:var(--dtu-es-faint)!important;background:transparent!important;color:var(--dtu-es-muted)!important;font-weight:400}',
        '@media (max-width:560px){.dtu-es-cols{display:none}'
            + POP + ' div.dtu-es-row{grid-template-columns:minmax(0,1fr) auto;row-gap:2px}'
            + '.dtu-es-when,.dtu-es-kind{grid-column:1/-1;text-align:left}'
            + POP + ' div.dtu-es-detail,' + POP + ' div.dtu-es-edit{grid-column:1/-1}'
            + '.dtu-es-body{padding:18px 16px 8px}.dtu-es-foot{padding:12px 16px 14px}.dtu-es-tabs{padding:12px 12px 0}.dtu-es-head{padding:14px 10px 0 16px}}'
    ].join('\n');

    function applyTheme(node, isDark) {
        var dark = !isDark || isDark();
        var tokens = dark ? {
            ink: '#f0eee8', muted: 'rgba(240,238,232,.62)', faint: 'rgba(240,238,232,.22)', bg: '#202020', line: 'rgba(240,238,232,.12)', tint: 'rgba(240,238,232,.06)', tile: '#2a2a2a', cell: '#303030', 'skel': 'rgba(240,238,232,.16)', 'on-accent': '#1a1a1a', scheme: 'dark'
        } : {
            ink: '#1a1a1a', muted: 'rgba(26,26,26,.62)', faint: 'rgba(26,26,26,.20)', bg: '#ffffff', line: 'rgba(26,26,26,.10)', tint: 'rgba(26,26,26,.04)', tile: '#f7f7f5', cell: '#e8e8e4', 'skel': 'rgba(26,26,26,.12)', 'on-accent': '#ffffff', scheme: 'light'
        };
        Object.keys(tokens).forEach(function (k) { node.style.setProperty('--dtu-es-' + k, tokens[k]); });
        node.style.setProperty('--dtu-skel-fill', tokens.skel);
        node.style.setProperty('--dtu-es-accent', dark ? 'var(--dtu-ad-accent-soft, #ff6b6b)' : 'var(--dtu-ad-accent-deep, #990000)');
    }

    globalThis.DTUAfterDarkExamScheduleStyles = {
        CSS: CSS,
        applyTheme: applyTheme
    };
})();
