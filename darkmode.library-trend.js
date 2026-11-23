(function () {
    'use strict';

    // Glue for the split: the trend renderer reads the data functions and the
    // week order from darkmode.library-data.js, and the shared helpers from the
    // bus runtime. No function below is rewritten.
    var busRuntime = globalThis.DTUAfterDarkBusRuntime;
    if (!busRuntime) throw new Error('DTU After Dark: darkmode.bus.js must load before darkmode.library-trend.js');
    var markExt = busRuntime.markExt;
    var isTopWindow = busRuntime.isTopWindow;
    var isDarkModeEnabled = busRuntime.isDarkModeEnabled;

    var libraryData = globalThis.DTUAfterDarkLibraryData;
    if (!libraryData) throw new Error('DTU After Dark: darkmode.library-data.js must load before darkmode.library-trend.js');
    var LIBRARY_WEEK_ORDER = libraryData.LIBRARY_WEEK_ORDER || [];
    var buildLibraryCrowdingModel = libraryData.buildLibraryCrowdingModel;
    var buildLibraryEventIntervals = libraryData.buildLibraryEventIntervals;
    var getLibraryCrowdingTier = libraryData.getLibraryCrowdingTier;
    var buildLibraryCrowdingInsightLine = libraryData.buildLibraryCrowdingInsightLine;
    var buildLibraryCrowdingConfidenceLine = libraryData.buildLibraryCrowdingConfidenceLine;
    var formatLibraryOccupancyCount = libraryData.formatLibraryOccupancyCount;
    var selectLibraryWeekdayView = libraryData.selectLibraryWeekdayView;
    var buildLibraryWeekdaySummaryLine = libraryData.buildLibraryWeekdaySummaryLine;
    var buildLibraryHourBars = libraryData.buildLibraryHourBars;
    var formatLibraryWeekdayObservations = libraryData.formatLibraryWeekdayObservations;
    var formatLibraryMinuteRange = libraryData.formatLibraryMinuteRange;

    var LIBRARY_RUNTIME_STYLE_ID = 'dtu-library-runtime-style';

    // Dark mode draws the typical line and historical band in a light neutral:
    // the accent (DTU red by default) at low opacity is invisible on the dark
    // panel, and keeping red for "Current" alone makes the three series distinct.

    function ensureLibraryRuntimeStyles() {
        if (!isTopWindow()) return;
        var host = document.head || document.documentElement;
        if (!host) return;

        var style = document.getElementById(LIBRARY_RUNTIME_STYLE_ID);
        if (!style) {
            style = document.createElement('style');
            style.id = LIBRARY_RUNTIME_STYLE_ID;
            markExt(style);
            host.appendChild(style);
        }

        // Opaque: Firefox does not blur the page under a translucent panel, so DTU Learn showed through it.
        var panelBg = isDarkModeEnabled() ? '#181818' : '#ffffff';
        var panelBorder = isDarkModeEnabled() ? '#404040' : '#d6dce7';
        var panelText = isDarkModeEnabled() ? '#e8e8e8' : '#1f2937';
        var muted = isDarkModeEnabled() ? '#9aa0aa' : '#6b7280';
        var sectionBg = isDarkModeEnabled() ? '#2d2d2d' : '#ffffff';
        var rowBg = isDarkModeEnabled() ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)';
        var rowBgHover = isDarkModeEnabled() ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
        var linkBg = isDarkModeEnabled() ? 'rgba(255,255,255,0.018)' : 'rgba(15,23,42,0.018)';
        var linkBgHover = isDarkModeEnabled() ? 'rgba(255,255,255,0.045)' : 'rgba(15,23,42,0.045)';
        var sectionTitle = isDarkModeEnabled() ? '#a3acb8' : '#667084';
        var linkDivider = isDarkModeEnabled() ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
        var feedDivider = isDarkModeEnabled() ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.09)';
        var stateBg = isDarkModeEnabled() ? 'rgba(255,255,255,0.02)' : '#f8fafc';
        var actionBorder = isDarkModeEnabled() ? '#4a4a4a' : '#d4dbe6';
        var actionBg = isDarkModeEnabled() ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)';
        var actionBgHover = isDarkModeEnabled() ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
        var dateBg = isDarkModeEnabled() ? '#212121' : '#f3f6fb';
        var panelShadow = isDarkModeEnabled() ? '0.7' : '0.25';
        var crowdBg = isDarkModeEnabled() ? '#1a1a1a' : '#ffffff';
        var crowdInset = isDarkModeEnabled() ? '#121212' : '#f5f5f5';
        var crowdInsetSoft = isDarkModeEnabled() ? '#181818' : '#f8fafc';
        var crowdBorder = isDarkModeEnabled() ? '#363636' : '#d8dde6';
        var crowdText = isDarkModeEnabled() ? '#e0e0e0' : '#1a1a1a';
        var crowdMuted = isDarkModeEnabled() ? '#888' : '#666';
        var crowdTrack = isDarkModeEnabled() ? '#2a2a2a' : '#e8e8e8';
        var crowdGood = '#2e7d32';
        var crowdWarn = '#d97706'; // Fixed amber — keeps traffic-light semantics independent of accent colour
        var crowdBad = '#c62828';
        // Text-sized accents follow the extension's convention: the soft accent
        // on dark surfaces (the base accent is too dark to read there).
        var accentText = isDarkModeEnabled() ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-text, var(--dtu-ad-accent))';

        var css = [
            '.dtu-library-modal-overlay{position:fixed !important;inset:0 !important;z-index:1000000 !important;display:flex !important;align-items:center !important;justify-content:center !important;padding:20px !important;background:transparent !important;background-color:transparent !important;backdrop-filter:blur(4px) !important;-webkit-backdrop-filter:blur(4px) !important;}',
            '.dtu-library-backdrop{position:fixed !important;inset:0 !important;z-index:999998 !important;background:transparent !important;background-color:transparent !important;}',
            '.dtu-library-panel{display:flex !important;flex-direction:column !important;overflow:hidden !important;width:min(980px,calc(100vw - 40px)) !important;max-height:calc(100vh - 80px) !important;box-sizing:border-box !important;border-radius:14px !important;background:' + panelBg + ' !important;border:1px solid ' + panelBorder + ' !important;color:' + panelText + ' !important;box-shadow:0 20px 60px rgba(0,0,0,' + panelShadow + ') !important;}',
            '.dtu-library-panel,.dtu-library-panel *{box-sizing:border-box !important;font-family:inherit !important;}',
            '.dtu-library-header{display:flex !important;align-items:center !important;justify-content:space-between !important;gap:10px !important;padding:14px 18px 12px !important;border-bottom:1px solid ' + panelBorder + ' !important;background:rgba(255,255,255,0.02) !important;flex-shrink:0 !important;}',
            '.dtu-library-header-main{display:flex !important;align-items:center !important;gap:14px !important;min-width:0 !important;flex:1 1 auto !important;}',
            '.dtu-library-title{margin:0 !important;font-size:21px !important;font-weight:760 !important;line-height:1.1 !important;letter-spacing:-0.3px !important;color:' + panelText + ' !important;white-space:nowrap !important;}',
            '.dtu-library-header-occupancy{display:flex !important;align-items:flex-end !important;justify-content:flex-start !important;gap:12px !important;flex-wrap:wrap !important;min-width:0 !important;flex:1 1 auto !important;}',
            '.dtu-library-header-occ-item{display:flex !important;flex-direction:column !important;align-items:flex-start !important;justify-content:center !important;gap:2px !important;padding:0 !important;background:transparent !important;border:0 !important;min-width:54px !important;}',
            '.dtu-library-header-occ-label{margin:0 !important;font-size:13px !important;font-weight:700 !important;line-height:1.1 !important;letter-spacing:0.55px !important;text-transform:uppercase !important;color:' + sectionTitle + ' !important;}',
            '.dtu-library-header-occ-value{margin:0 !important;font-size:22px !important;font-weight:800 !important;line-height:0.95 !important;color:' + panelText + ' !important;}',
            '.dtu-library-header-actions{display:flex !important;align-items:center !important;justify-content:flex-end !important;gap:8px !important;min-width:0 !important;flex:0 0 auto !important;}',
            '.dtu-library-header-updated{margin:0 !important;font-size:13px !important;font-weight:600 !important;line-height:1.2 !important;letter-spacing:0.2px !important;color:' + muted + ' !important;white-space:nowrap !important;}',
            '.dtu-library-header-occ-refresh{appearance:none !important;border:1px solid ' + actionBorder + ' !important;background:' + actionBg + ' !important;color:' + panelText + ' !important;border-radius:999px !important;cursor:pointer !important;padding:3px 8px !important;font-size:13px !important;font-weight:700 !important;line-height:1.1 !important;white-space:nowrap !important;min-height:24px !important;}',
            '.dtu-library-header-occ-refresh:hover{background:' + actionBgHover + ' !important;border-color:var(--dtu-ad-accent) !important;color:var(--dtu-ad-accent-soft) !important;}',
            'button.dtu-library-close{appearance:none !important;border:1px solid ' + actionBorder + ' !important;background:' + actionBg + ' !important;color:' + muted + ' !important;border-radius:7px !important;cursor:pointer !important;padding:2px 9px !important;line-height:1 !important;font-size:26px !important;min-width:34px !important;min-height:30px !important;}',
            'button.dtu-library-close:hover{background:' + actionBgHover + ' !important;color:' + panelText + ' !important;border-color:var(--dtu-ad-accent) !important;}',
            '.dtu-library-content{display:flex !important;flex-direction:column !important;gap:14px !important;padding:18px 22px 20px !important;overflow:auto !important;background:transparent !important;flex:1 1 auto !important;}',
            '.dtu-library-layout{display:flex !important;flex-direction:column !important;gap:14px !important;}',
            '.dtu-library-feed-grid{display:grid !important;grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:14px !important;}',
            '.dtu-library-section{margin:0 !important;padding:12px !important;background:' + sectionBg + ' !important;border:1px solid ' + panelBorder + ' !important;border-radius:10px !important;}',
            '.dtu-library-trend-section{padding:0 !important;background:transparent !important;border:0 !important;border-radius:0 !important;box-shadow:none !important;}',
            '.dtu-library-trend-section .dtu-library-section-header{display:none !important;}',
            '.dtu-library-trend-section .dtu-library-crowd{padding:0 !important;gap:10px !important;background:transparent !important;}',
            '.dtu-library-trend-section .dtu-library-crowd-hero{padding:0 0 12px !important;background:transparent !important;box-shadow:inset 0 -1px 0 ' + crowdBorder + ' !important;}',
            '.dtu-library-trend-section .dtu-library-crowd-chart-wrap{padding:0 !important;background:transparent !important;border:0 !important;border-radius:0 !important;box-shadow:none !important;}',
            '.dtu-library-trend-section .dtu-library-crowd-chart{background:transparent !important;border-radius:0 !important;}',
            '.dtu-library-trend-section .dtu-library-crowd-events,.dtu-library-trend-section .dtu-library-crowd-confidence{padding:0 !important;}',
            '.dtu-library-section-header{display:flex !important;align-items:center !important;justify-content:space-between !important;gap:8px !important;margin:0 0 8px !important;padding:0 !important;background:transparent !important;}',
            '.dtu-library-section-title{margin:0 !important;font-size:14px !important;font-weight:700 !important;letter-spacing:0 !important;text-transform:none !important;color:' + panelText + ' !important;background:transparent !important;}',
            '.dtu-library-actions{display:flex !important;align-items:center !important;gap:8px !important;background:transparent !important;}',
            'button.dtu-library-action-btn{appearance:none !important;border:1px solid ' + actionBorder + ' !important;background:' + actionBg + ' !important;color:' + panelText + ' !important;border-radius:7px !important;cursor:pointer !important;padding:4px 10px !important;font-size:13px !important;font-weight:650 !important;line-height:1.2 !important;white-space:nowrap !important;min-height:26px !important;}',
            'button.dtu-library-action-btn:hover{background:' + actionBgHover + ' !important;border-color:var(--dtu-ad-accent) !important;color:var(--dtu-ad-accent-soft) !important;}',
            '.dtu-library-links-section{padding:2px 0 0 !important;background:transparent !important;border:0 !important;}',
            '.dtu-library-links-header{margin:0 0 6px !important;padding:0 4px !important;}',
            '.dtu-library-links-title-wrap{display:flex !important;flex-direction:column !important;gap:3px !important;min-width:0 !important;background:transparent !important;}',
            '.dtu-library-links-subtitle{margin:0 !important;font-size:13px !important;font-weight:520 !important;line-height:1.35 !important;color:' + muted + ' !important;background:transparent !important;}',
            '.dtu-library-link-grid{display:grid !important;grid-template-columns:repeat(3,minmax(0,1fr)) !important;gap:8px 20px !important;background:transparent !important;}',
            'a.dtu-library-link-item{display:grid !important;grid-template-columns:18px minmax(0,1fr) 14px !important;align-items:center !important;gap:12px !important;min-height:48px !important;padding:7px 4px 7px 2px !important;border-radius:0 !important;background:transparent !important;border:0 !important;box-shadow:inset 0 -1px 0 ' + linkDivider + ' !important;color:' + panelText + ' !important;text-decoration:none !important;text-align:left !important;white-space:normal !important;overflow-wrap:anywhere !important;transition:background-color 0.2s ease-in-out,transform 0.2s ease-in-out !important;}',
            'a.dtu-library-link-item:hover{background:' + linkBgHover + ' !important;border-radius:12px !important;box-shadow:inset 0 -1px 0 transparent !important;color:' + panelText + ' !important;transform:translateY(-2px) !important;}',
            '.dtu-library-link-icon{display:inline-flex !important;align-items:center !important;justify-content:center !important;align-self:start !important;flex-shrink:0 !important;width:18px !important;min-width:18px !important;height:18px !important;color:' + accentText + ' !important;}',
            '.dtu-library-link-icon svg{display:block !important;color:inherit !important;width:18px !important;height:18px !important;stroke:currentColor !important;fill:none !important;stroke-width:1.9 !important;stroke-linecap:round !important;stroke-linejoin:round !important;}',
            '.dtu-library-link-content{display:flex !important;flex-direction:column !important;gap:2px !important;min-width:0 !important;}',
            '.dtu-library-link-label{display:block !important;min-width:0 !important;overflow-wrap:anywhere !important;font-size:13px !important;font-weight:700 !important;line-height:1.2 !important;color:' + panelText + ' !important;}',
            '.dtu-library-link-meta{display:block !important;min-width:0 !important;overflow-wrap:anywhere !important;font-size:13px !important;font-weight:540 !important;line-height:1.3 !important;color:' + muted + ' !important;}',
            '.dtu-library-link-arrow{display:inline-flex !important;align-items:center !important;justify-content:flex-end !important;align-self:center !important;width:14px !important;height:14px !important;color:' + sectionTitle + ' !important;transition:transform 0.2s ease-in-out,color 0.2s ease-in-out !important;}',
            '.dtu-library-link-arrow svg{display:block !important;color:inherit !important;width:14px !important;height:14px !important;stroke:currentColor !important;fill:none !important;stroke-width:1.9 !important;stroke-linecap:round !important;stroke-linejoin:round !important;}',
            'a.dtu-library-link-item:hover .dtu-library-link-icon,a.dtu-library-link-item:hover .dtu-library-link-arrow{color:' + accentText + ' !important;}',
            '.dtu-library-panel a:focus-visible,.dtu-library-panel button:focus-visible{outline:2px solid ' + panelText + ' !important;outline-offset:2px !important;}',
            '.dtu-library-panel:focus{outline:none !important;}',
            'a.dtu-library-link-item:hover .dtu-library-link-arrow{transform:translateX(2px) !important;}',
            '.dtu-library-crowd{display:flex !important;flex-direction:column !important;gap:12px !important;padding:2px 2px 0 !important;color:' + crowdText + ' !important;}',
            '.dtu-library-crowd-card{background:transparent !important;border:0 !important;border-radius:0 !important;padding:0 !important;box-shadow:none !important;}',
            '.dtu-library-crowd-hero{display:flex !important;flex-direction:column !important;gap:8px !important;padding:4px 6px 12px !important;background:transparent !important;box-shadow:inset 0 -1px 0 ' + crowdBorder + ' !important;}',
            '.dtu-library-crowd-hero-top{display:flex !important;align-items:flex-end !important;justify-content:space-between !important;gap:14px !important;flex-wrap:wrap !important;}',
            '.dtu-library-crowd-hero-main{display:flex !important;align-items:flex-end !important;gap:10px !important;flex-wrap:wrap !important;}',
            '.dtu-library-crowd-hero-stats{display:flex !important;align-items:flex-end !important;gap:18px !important;flex-wrap:wrap !important;}',
            '.dtu-library-crowd-hero-stat{display:flex !important;flex-direction:column !important;align-items:flex-start !important;gap:1px !important;min-width:74px !important;}',
            '.dtu-library-crowd-hero-stat-label{margin:0 !important;font-size:13px !important;font-weight:700 !important;line-height:1.1 !important;letter-spacing:0.45px !important;text-transform:uppercase !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-hero-stat-value{margin:0 !important;font-size:16px !important;font-weight:760 !important;line-height:1 !important;color:' + crowdText + ' !important;}',
            '.dtu-library-crowd-hero-stat-hint{margin:0 !important;font-size:13px !important;font-weight:520 !important;line-height:1.1 !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-label{margin:0 !important;font-size:13px !important;font-weight:700 !important;line-height:1.1 !important;letter-spacing:0.45px !important;text-transform:uppercase !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-free-wrap{display:flex !important;align-items:flex-end !important;gap:6px !important;}',
            '.dtu-library-crowd-free{margin:0 !important;font-size:30px !important;font-weight:800 !important;line-height:0.98 !important;letter-spacing:-0.35px !important;color:' + crowdText + ' !important;}',
            '.dtu-library-crowd-free-unit{margin:0 0 3px !important;font-size:13px !important;font-weight:620 !important;line-height:1 !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-hero.is-after-hours .dtu-library-crowd-hero-stats,.dtu-library-crowd-hero.is-after-hours .dtu-library-crowd-progress,.dtu-library-crowd-hero.is-after-hours .dtu-library-crowd-free-unit{display:none !important;}',
            '.dtu-library-crowd-hero.is-after-hours .dtu-library-crowd-free{font-size:20px !important;letter-spacing:0 !important;}',
            '.dtu-library-crowd-status{margin:0 0 3px !important;font-size:13px !important;font-weight:700 !important;line-height:1.1 !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-progress{position:relative !important;width:100% !important;height:12px !important;margin-top:2px !important;border-radius:999px !important;background:' + crowdTrack + ' !important;border:1px solid ' + crowdBorder + ' !important;overflow:hidden !important;}',
            '.dtu-library-crowd-progress-fill{position:absolute !important;left:0 !important;top:0 !important;bottom:0 !important;width:0 !important;border-radius:999px !important;background:' + crowdGood + ' !important;transition:width 0.25s ease !important;}',
            '.dtu-library-crowd-progress[aria-valuetext*=\"Moderate\"] .dtu-library-crowd-progress-fill{background:' + crowdWarn + ' !important;}',
            '.dtu-library-crowd-progress[aria-valuetext*=\"Busy\"] .dtu-library-crowd-progress-fill{background:' + crowdBad + ' !important;}',
            '.dtu-library-crowd-chart-wrap{background:transparent !important;border:0 !important;border-radius:0 !important;padding:2px 0 0 !important;box-shadow:none !important;}',
            '.dtu-library-crowd-chart{display:block !important;width:100% !important;height:136px !important;border-radius:0 !important;background:transparent !important;}',
            // The "i" at the end of the legend; its tip says how today compares and what "usual" means.
            '.dtu-library-usual-info{position:relative !important;display:inline-flex !important;align-items:center !important;}',
            '.dtu-library-usual-btn{display:inline-flex !important;align-items:center !important;justify-content:center !important;width:18px !important;height:18px !important;margin:0 !important;padding:0 !important;border:0 !important;background:transparent !important;color:' + crowdMuted + ' !important;cursor:help !important;}',
            '.dtu-library-usual-btn:hover,.dtu-library-usual-btn:focus-visible,.dtu-library-usual-btn:active,.dtu-library-usual-info:hover .dtu-library-usual-btn{color:' + crowdText + ' !important;background:transparent !important;box-shadow:none !important;}',
            '.dtu-library-usual-btn:focus-visible{outline:2px solid var(--dtu-ad-accent) !important;outline-offset:1px !important;border-radius:50% !important;}',
            '.dtu-library-usual-info-mark{display:inline-block !important;box-sizing:border-box !important;width:15px !important;height:15px !important;border:1.5px solid currentColor !important;border-radius:50% !important;font:700 10px/12px system-ui,sans-serif !important;text-align:center !important;color:inherit !important;background:transparent !important;}',
            '.dtu-library-usual-info .dtu-library-usual-tip{display:none !important;position:absolute !important;right:-4px !important;bottom:calc(100% + 8px) !important;z-index:20 !important;width:max-content !important;max-width:280px !important;padding:8px 10px !important;border:0 !important;border-radius:8px !important;background:rgba(20,20,20,0.94) !important;box-shadow:0 4px 14px rgba(0,0,0,0.35) !important;text-align:left !important;white-space:normal !important;cursor:default !important;}',
            // A see-through strip under the tip, down over the legend row, keeps it open while the pointer moves up to the link.
            '.dtu-library-usual-tip::after{content:\"\" !important;position:absolute !important;left:0 !important;right:0 !important;top:100% !important;height:34px !important;}',
            '.dtu-library-usual-info:hover .dtu-library-usual-tip,.dtu-library-usual-info:focus-within .dtu-library-usual-tip{display:block !important;}',
            '.dtu-library-usual-source{margin:6px 0 0 !important;font-size:13px !important;line-height:1.4 !important;color:#c8c8c8 !important;}',
            '.dtu-library-usual-source a{color:#f0f0f0 !important;text-decoration:underline !important;text-underline-offset:2px !important;}',
            '.dtu-library-usual-source a:hover{color:#ffffff !important;}',
            '.dtu-library-usual-tip .dtu-library-crowd-chart-note,.dtu-library-usual-tip .dtu-library-crowd-confidence{margin:0 !important;font-size:13px !important;line-height:1.4 !important;font-weight:400 !important;text-align:left !important;color:#f0f0f0 !important;}',
            '.dtu-library-usual-tip .dtu-library-crowd-chart-note{font-weight:600 !important;margin-bottom:4px !important;}',
            '.dtu-library-usual-tip .dtu-library-crowd-confidence{color:#c8c8c8 !important;}',
            '.dtu-library-crowd-chart-note{margin:0 !important;font-size:13px !important;line-height:1.4 !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-events{display:flex !important;flex-direction:column !important;gap:4px !important;margin-top:8px !important;}',
            '.dtu-library-crowd-event{display:flex !important;align-items:flex-start !important;gap:6px !important;font-size:13px !important;line-height:1.3 !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-event-dot{display:inline-block !important;width:8px !important;min-width:8px !important;height:8px !important;border-radius:2px !important;margin-top:2px !important;background:transparent !important;border:1.5px solid currentColor !important;opacity:0.7 !important;}',
            '.dtu-library-crowd-event-text{display:inline !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-confidence{margin:0 0 0 auto !important;font-size:13px !important;line-height:1.4 !important;text-align:right !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-crowd-days{display:flex !important;flex-wrap:wrap !important;gap:4px !important;margin:2px 0 8px !important;}',
            '.dtu-library-crowd-day{appearance:none !important;border:1px solid ' + actionBorder + ' !important;background:' + actionBg + ' !important;color:' + crowdText + ' !important;border-radius:7px !important;cursor:pointer !important;padding:4px 9px !important;font-size:13px !important;font-weight:600 !important;line-height:1.2 !important;white-space:nowrap !important;}',
            '.dtu-library-crowd-day:hover{background:' + actionBgHover + ' !important;border-color:var(--dtu-ad-accent) !important;}',
            '.dtu-library-crowd-day:focus-visible{outline:2px solid var(--dtu-ad-accent) !important;outline-offset:1px !important;}',
            '.dtu-library-crowd-day[aria-pressed="true"]{border-color:var(--dtu-ad-accent) !important;background:rgba(var(--dtu-ad-accent-rgb),0.18) !important;}',
            '.dtu-library-crowd-day:disabled{opacity:.4 !important;cursor:default !important;}',
            '.dtu-library-crowd-state{margin:0 !important;padding:10px !important;border-radius:8px !important;border:1px dashed ' + crowdBorder + ' !important;background:' + crowdInset + ' !important;font-size:13px !important;line-height:1.35 !important;color:' + crowdMuted + ' !important;}',
            '.dtu-library-feed-section{padding:4px 0 0 !important;background:transparent !important;border:0 !important;}',
            '.dtu-library-feed-header{margin:0 0 10px !important;padding:0 4px !important;}',
            '.dtu-library-feed-list{display:flex !important;flex-direction:column !important;gap:0 !important;background:transparent !important;}',
            'a.dtu-library-feed-item{display:flex !important;align-items:flex-start !important;gap:16px !important;padding:14px 4px 14px 0 !important;border-radius:0 !important;background:transparent !important;border:0 !important;box-shadow:inset 0 -1px 0 ' + feedDivider + ' !important;text-decoration:none !important;color:' + panelText + ' !important;transition:background-color 0.2s ease-in-out,transform 0.2s ease-in-out !important;}',
            'a.dtu-library-feed-item:hover{background:' + rowBgHover + ' !important;border-radius:14px !important;box-shadow:inset 0 -1px 0 transparent !important;transform:translateY(-2px) !important;}',
            '.dtu-library-date-badge{position:relative !important;display:flex !important;flex-direction:column !important;align-items:flex-start !important;justify-content:center !important;flex-shrink:0 !important;min-width:64px !important;height:auto !important;padding:2px 0 !important;border-radius:0 !important;overflow:visible !important;background:transparent !important;border:0 !important;}',
            '.dtu-library-date-day{margin:0 !important;font-size:24px !important;font-weight:790 !important;line-height:0.95 !important;color:' + panelText + ' !important;}',
            '.dtu-library-date-month{margin:2px 0 0 !important;font-size:13px !important;font-weight:760 !important;line-height:1 !important;letter-spacing:0.7px !important;text-transform:uppercase !important;color:' + accentText + ' !important;}',
            '.dtu-library-item-content{display:flex !important;flex-direction:column !important;gap:4px !important;min-width:0 !important;flex:1 1 auto !important;background:transparent !important;padding-top:1px !important;}',
            '.dtu-library-news-badge{position:relative !important;display:inline-flex !important;align-items:center !important;padding:0 !important;margin:0 0 2px !important;border-radius:0 !important;background:transparent !important;border:0 !important;color:' + accentText + ' !important;font-size:13px !important;font-weight:760 !important;line-height:1.25 !important;letter-spacing:0.8px !important;text-transform:uppercase !important;}',
            '.dtu-library-item-title{margin:0 !important;font-size:14px !important;font-weight:720 !important;line-height:1.35 !important;color:' + panelText + ' !important;display:-webkit-box !important;-webkit-line-clamp:2 !important;line-clamp:2 !important;-webkit-box-orient:vertical !important;overflow:hidden !important;}',
            '.dtu-library-item-meta{margin:0 !important;font-size:13px !important;line-height:1.45 !important;color:' + muted + ' !important;white-space:normal !important;overflow-wrap:anywhere !important;}',
            '.dtu-library-state-msg{margin:0 !important;padding:16px 12px !important;border-radius:9px !important;border:1px dashed ' + panelBorder + ' !important;background:' + stateBg + ' !important;text-align:center !important;color:' + muted + ' !important;font-size:13px !important;font-style:italic !important;}',
            '@media (max-width: 900px){.dtu-library-header{flex-wrap:wrap !important;}.dtu-library-feed-grid{grid-template-columns:1fr !important;}.dtu-library-link-grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important;}.dtu-library-header{align-items:flex-start !important;}.dtu-library-header-main{flex-wrap:wrap !important;align-items:flex-start !important;gap:10px !important;}.dtu-library-header-occupancy{width:100% !important;gap:10px !important;}.dtu-library-header-actions{width:100% !important;justify-content:flex-start !important;}}',
            '@media (max-width: 520px){.dtu-library-modal-overlay{padding:8px !important;}.dtu-library-panel{width:calc(100vw - 16px) !important;max-height:calc(100vh - 16px) !important;border-radius:12px !important;}.dtu-library-header{padding:12px 14px 10px !important;}.dtu-library-content{padding:12px 14px 14px !important;}.dtu-library-link-grid{grid-template-columns:1fr !important;}.dtu-library-header-occupancy{gap:8px !important;}.dtu-library-header-occ-value{font-size:19px !important;}.dtu-library-header-updated{display:none !important;}}'
        ].join('');

        if (style.textContent !== css) style.textContent = css;
    }

    // Only "now" wears the accent. Events are neutral, so a red mark always means now.
    function getLibraryHourBarColors() {
        var rootStyles = getComputedStyle(document.documentElement);
        var dark = isDarkModeEnabled();
        var accent = (rootStyles.getPropertyValue('--dtu-ad-accent') || '#990000').trim();
        var accentSoft = (rootStyles.getPropertyValue('--dtu-ad-accent-soft') || '').trim();
        var ink = dark ? '230,232,236' : '26,31,41';
        return {
            now: dark ? (accentSoft || accent) : accent,
            surface: dark ? '#181818' : '#ffffff',
            today: dark ? '#e6e8ec' : '#1a1f29',
            fillTop: 'rgba(' + ink + ',' + (dark ? '0.30' : '0.16') + ')',
            fillBottom: 'rgba(' + ink + ',0.02)',
            usual: 'rgba(' + ink + ',0.50)',
            event: 'rgba(' + ink + ',0.60)',
            eventGuide: 'rgba(' + ink + ',0.30)',
            eventBand: 'rgba(' + ink + ',0.035)',
            eventText: dark ? '#c9ced8' : '#3b4250',
            grid: dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)',
            axis: dark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.22)',
            text: dark ? '#9aa0aa' : '#667084',
            strong: dark ? '#e6e8ec' : '#1a1f29'
        };
    }

    // One scale for every weekday, so a quiet Saturday looks quiet next to a busy Tuesday.
    function getLibraryChartMaxValue(model, bars) {
        var maxValue = 0;
        (bars || []).forEach(function (b) {
            if (b.usual != null) maxValue = Math.max(maxValue, b.usual);
            if (b.today != null) maxValue = Math.max(maxValue, b.today);
        });
        var map = (model && model.weekdayMap) || {};
        LIBRARY_WEEK_ORDER.forEach(function (day) {
            (map[day] || []).forEach(function (r) {
                if (r && r.hour >= model.startHour && r.hour < model.endHour && r.avg != null && isFinite(r.avg)) {
                    maxValue = Math.max(maxValue, r.avg);
                }
            });
        });
        return maxValue;
    }

    var LIBRARY_CHART_PAD = { left: 40, right: 16, top: 14, bottom: 24 };
    var LIBRARY_CHART_PLOT_H = 110;
    var LIBRARY_EVENT_ROW_H = 24;
    var LIBRARY_EVENT_MAX_ROWS = 3;

    // Events that do not overlap share a row; an overlapping event goes to the next free row.
    // Events past maxLanes rows are counted in hiddenCount and left to the list under the chart.
    function layoutLibraryEventLanes(intervals, maxLanes) {
        var sorted = (Array.isArray(intervals) ? intervals : []).slice().sort(function (a, b) {
            return (a.startMinute - b.startMinute) || (b.endMinute - a.endMinute);
        });
        var laneEnds = [];
        var placed = [];
        var hiddenCount = 0;
        sorted.forEach(function (itv) {
            var lane = -1;
            for (var i = 0; i < laneEnds.length; i++) {
                if (laneEnds[i] <= itv.startMinute) { lane = i; break; }
            }
            if (lane < 0 && laneEnds.length < maxLanes) lane = laneEnds.length;
            if (lane < 0) { hiddenCount++; return; }
            laneEnds[lane] = itv.endMinute;
            placed.push({ interval: itv, lane: lane });
        });
        return { placed: placed, laneCount: laneEnds.length, hiddenCount: hiddenCount };
    }

    // Hour averages sit mid-hour; the live count sits at the current minute. A missing hour splits the line.
    function buildLibraryChartSeries(bars, nowMinute) {
        function series(key) {
            var segments = [];
            var current = null;
            (bars || []).forEach(function (b) {
                var value = b[key];
                if (value == null) { current = null; return; }
                var minute = b.hour * 60 + 30;
                var isNow = key === 'today' && !!b.isNow;
                if (isNow && isFinite(nowMinute)) minute = Math.max(b.hour * 60, Math.min(b.hour * 60 + 59, nowMinute));
                if (!current) { current = []; segments.push(current); }
                current.push({ minute: minute, value: value, isNow: isNow });
            });
            return segments;
        }
        return { today: series('today'), usual: series('usual') };
    }

    // Monotone cubic (Fritsch-Carlson): a smooth line that never bulges past the data.
    function traceLibraryMonotonePath(ctx, pts) {
        var n = pts.length;
        if (!n) return;
        ctx.moveTo(pts[0][0], pts[0][1]);
        if (n === 1) return;
        var dx = [], m = [], t = [];
        for (var i = 0; i < n - 1; i++) {
            dx[i] = pts[i + 1][0] - pts[i][0];
            m[i] = dx[i] ? (pts[i + 1][1] - pts[i][1]) / dx[i] : 0;
        }
        t[0] = m[0];
        t[n - 1] = m[n - 2];
        for (i = 1; i < n - 1; i++) t[i] = (m[i - 1] * m[i] <= 0) ? 0 : (m[i - 1] + m[i]) / 2;
        for (i = 0; i < n - 1; i++) {
            if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
            var a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
            if (s > 9) { var k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
        }
        for (i = 0; i < n - 1; i++) {
            var h = dx[i] / 3;
            ctx.bezierCurveTo(pts[i][0] + h, pts[i][1] + t[i] * h, pts[i + 1][0] - h, pts[i + 1][1] - t[i + 1] * h, pts[i + 1][0], pts[i + 1][1]);
        }
    }

    // Title and time range when both fit; else the title alone (the guides and the list carry the
    // times), cut with an ellipsis if needed; empty when not even a short cut fits.
    function fitLibraryEventLabel(ctx, title, range, avail) {
        if (ctx.measureText(title + '  ' + range).width <= avail) return { title: title, range: range };
        if (ctx.measureText(title).width <= avail) return { title: title, range: '' };
        var cut = title;
        while (cut.length > 3 && ctx.measureText(cut + '\u2026').width > avail) cut = cut.slice(0, -1);
        if (cut.length <= 3) return { title: '', range: '' };
        return { title: cut.replace(/\s+$/, '') + '\u2026', range: '' };
    }

    // Today is a line with a soft fill and a dot at now; the usual day is a dashed line.
    // Another weekday shows its usual day as the filled line. Events are bracketed above
    // the plot, one row each when they overlap, with guides down to their start and end.
    function drawLibraryCrowdingChart(canvas, model, eventIntervals) {
        if (!canvas || !model) return;
        var pad = LIBRARY_CHART_PAD;
        var lanes = layoutLibraryEventLanes(eventIntervals, LIBRARY_EVENT_MAX_ROWS);
        var laneSpace = lanes.laneCount * LIBRARY_EVENT_ROW_H;
        var cssH = pad.top + laneSpace + LIBRARY_CHART_PLOT_H + pad.bottom;
        canvas.style.setProperty('height', cssH + 'px', 'important');

        var dpr = Math.max(1, window.devicePixelRatio || 1);
        var cssW = Math.max(320, Math.round(canvas.clientWidth || 640));
        var targetW = Math.round(cssW * dpr);
        var targetH = Math.round(cssH * dpr);
        if (canvas.width !== targetW) canvas.width = targetW;
        if (canvas.height !== targetH) canvas.height = targetH;

        var ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(dpr, dpr);

        var colors = getLibraryHourBarColors();
        var bars = buildLibraryHourBars(model);
        var series = buildLibraryChartSeries(bars, model.nowMinute);
        var plotTop = pad.top + laneSpace;
        var bottomY = cssH - pad.bottom;
        var innerH = bottomY - plotTop;
        var plotRight = cssW - pad.right;
        var plotW = plotRight - pad.left;
        var startMin = model.startHour * 60;
        var spanMin = Math.max(60, (model.endHour - model.startHour) * 60);
        canvas._dtuChartLayout = { left: pad.left, plotW: plotW, startMin: startMin, spanMin: spanMin };

        var maxValue = getLibraryChartMaxValue(model, bars);
        var rough = Math.max(10, maxValue * 1.08) / 4;
        var mag = Math.pow(10, Math.floor(Math.log10(rough)));
        var norm = rough / mag;
        // Fine steps keep the top gridline close to the busiest hour (453 gets 600, not 800).
        var step = 10 * mag;
        [1, 1.5, 2, 2.5, 3, 4, 5, 7.5].some(function (k) { if (norm <= k) { step = k * mag; return true; } return false; });
        var maxY = step * 4;
        function yFor(value) {
            return bottomY - (Math.max(0, Math.min(maxY, value)) / maxY) * innerH;
        }
        function xFor(minute) {
            return pad.left + ((minute - startMin) / spanMin) * plotW;
        }
        function toPts(segment) {
            return segment.map(function (p) { return [xFor(p.minute), yFor(p.value)]; });
        }
        var events = lanes.placed.map(function (p) {
            return {
                interval: p.interval,
                lane: p.lane,
                x0: Math.max(pad.left, xFor(p.interval.startMinute)),
                x1: Math.min(plotRight, xFor(p.interval.endMinute))
            };
        }).filter(function (ev) { return ev.x1 > ev.x0; });

        // One shade over the union of event times, so overlapping events do not stack darker.
        var bands = [];
        events.slice().sort(function (a, b) { return a.x0 - b.x0; }).forEach(function (ev) {
            var last = bands[bands.length - 1];
            if (last && ev.x0 <= last[1]) last[1] = Math.max(last[1], ev.x1);
            else bands.push([ev.x0, ev.x1]);
        });
        ctx.fillStyle = colors.eventBand;
        bands.forEach(function (b) { ctx.fillRect(b[0], plotTop, b[1] - b[0], innerH); });

        ctx.lineWidth = 1;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (var v = 0; v <= maxY + step * 0.01; v += step) {
            var yLine = Math.round(yFor(v)) + 0.5;
            ctx.strokeStyle = v === 0 ? colors.axis : colors.grid;
            ctx.beginPath();
            ctx.moveTo(pad.left, yLine);
            ctx.lineTo(plotRight, yLine);
            ctx.stroke();
            ctx.fillStyle = colors.text;
            ctx.fillText(String(Math.round(v)), pad.left - 8, yLine);
        }

        // Hour labels sit on the hour itself, so 11 is exactly where an 11:00 event starts.
        var hourCount = model.endHour - model.startHour;
        var hourStep = plotW / hourCount >= 30 ? 1 : 2;
        var nowHour = null;
        bars.forEach(function (b) { if (b.isNow) nowHour = b.hour; });
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (var hr = model.startHour; hr <= model.endHour; hr += hourStep) {
            var xTick = Math.round(xFor(hr * 60)) + 0.5;
            ctx.strokeStyle = colors.axis;
            ctx.beginPath();
            ctx.moveTo(xTick, bottomY);
            ctx.lineTo(xTick, bottomY + 4);
            ctx.stroke();
            ctx.font = (hr === nowHour ? '600 ' : '') + '12px sans-serif';
            ctx.fillStyle = hr === nowHour ? colors.strong : colors.text;
            ctx.fillText((hr < 10 ? '0' : '') + hr, xTick, bottomY + 6);
        }

        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = colors.eventGuide;
        events.forEach(function (ev) {
            var yB = plotTop - 6 - ev.lane * LIBRARY_EVENT_ROW_H;
            [ev.x0, ev.x1].forEach(function (x) {
                var xr = Math.round(x) + 0.5;
                ctx.beginPath();
                ctx.moveTo(xr, yB);
                ctx.lineTo(xr, bottomY);
                ctx.stroke();
            });
        });
        ctx.setLineDash([]);

        var hasTypical = series.usual.length > 0;
        var hasToday = series.today.length > 0;
        var filled = hasToday ? series.today : series.usual;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        if (hasToday && hasTypical) {
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = colors.usual;
            ctx.lineWidth = 1.75;
            series.usual.forEach(function (seg) {
                ctx.beginPath();
                traceLibraryMonotonePath(ctx, toPts(seg));
                ctx.stroke();
            });
            ctx.setLineDash([]);
        }
        var peak = Infinity;
        filled.forEach(function (seg) { seg.forEach(function (p) { peak = Math.min(peak, yFor(p.value)); }); });
        var grad = ctx.createLinearGradient(0, isFinite(peak) ? peak : plotTop, 0, bottomY);
        grad.addColorStop(0, colors.fillTop);
        grad.addColorStop(1, colors.fillBottom);
        filled.forEach(function (seg) {
            var pts = toPts(seg);
            ctx.beginPath();
            traceLibraryMonotonePath(ctx, pts);
            ctx.lineTo(pts[pts.length - 1][0], bottomY);
            ctx.lineTo(pts[0][0], bottomY);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.beginPath();
            traceLibraryMonotonePath(ctx, pts);
            ctx.strokeStyle = colors.today;
            ctx.lineWidth = 2.5;
            ctx.stroke();
        });
        ctx.lineWidth = 1;

        // Brackets and labels, each label on a surface backing so guides from higher rows pass behind it.
        ctx.font = '12px sans-serif';
        ctx.textBaseline = 'bottom';
        var laneLabelEnd = {};
        events.forEach(function (ev, idx) {
            var yB = Math.round(plotTop - 6 - ev.lane * LIBRARY_EVENT_ROW_H) + 0.5;
            ctx.strokeStyle = colors.event;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(ev.x0, yB + 5);
            ctx.lineTo(ev.x0, yB);
            ctx.lineTo(ev.x1, yB);
            ctx.lineTo(ev.x1, yB + 5);
            ctx.stroke();
            ctx.lineWidth = 1;

            var next = null;
            for (var j = idx + 1; j < events.length; j++) { if (events[j].lane === ev.lane) { next = events[j]; break; } }
            var limit = next ? next.x0 - 8 : plotRight;
            var title = ev.interval.title || 'DTU Library event';
            var range = formatLibraryMinuteRange(ev.interval.startMinute, ev.interval.endMinute);
            var needed = ctx.measureText(title + '  ' + range).width;
            var labelX = ev.x0;
            var prevEnd = laneLabelEnd[ev.lane] != null ? laneLabelEnd[ev.lane] + 8 : pad.left;
            if (!next && labelX + needed > limit) labelX = Math.max(prevEnd, limit - needed);
            var fit = fitLibraryEventLabel(ctx, title, range, limit - labelX);
            if (!fit.title) return;
            var titleW = ctx.measureText(fit.title + (fit.range ? '  ' : '')).width;
            var rangeW = fit.range ? ctx.measureText(fit.range).width : 0;
            ctx.fillStyle = colors.surface;
            ctx.fillRect(labelX - 2, yB - 18, titleW + rangeW + 4, 15);
            ctx.textAlign = 'left';
            ctx.fillStyle = colors.eventText;
            ctx.fillText(fit.title, labelX, yB - 3);
            if (fit.range) {
                ctx.fillStyle = colors.text;
                ctx.fillText(fit.range, labelX + titleW, yB - 3);
            }
            laneLabelEnd[ev.lane] = labelX + titleW + rangeW;
        });

        var nowPoint = null;
        series.today.forEach(function (seg) { seg.forEach(function (p) { if (p.isNow) nowPoint = p; }); });
        if (nowPoint) {
            var nx = xFor(nowPoint.minute);
            var ny = yFor(nowPoint.value);
            ctx.strokeStyle = colors.now;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.moveTo(Math.round(nx) + 0.5, ny);
            ctx.lineTo(Math.round(nx) + 0.5, bottomY);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(nx, ny, 7, 0, Math.PI * 2);
            ctx.fillStyle = colors.surface;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(nx, ny, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = colors.now;
            ctx.fill();
            var nowText = formatLibraryOccupancyCount(nowPoint.value) + ' now';
            ctx.font = '600 12px sans-serif';
            var nowW = ctx.measureText(nowText).width;
            if (ny - 26 >= plotTop) {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(nowText, Math.max(pad.left + nowW / 2, Math.min(plotRight - nowW / 2, nx)), ny - 10);
            } else {
                ctx.textBaseline = 'middle';
                var right = nx + 12 + nowW <= plotRight;
                ctx.textAlign = right ? 'left' : 'right';
                ctx.fillText(nowText, right ? nx + 12 : nx - 12, ny);
            }
        }

        return { hasTypical: hasTypical, hasToday: hasToday, usualAsLine: hasToday && hasTypical, hiddenEvents: lanes.hiddenCount };
    }

    function createLibraryTrendSection() {
        var container = document.createElement('div');
        container.className = 'dtu-library-section dtu-library-trend-section';
        container.setAttribute('data-dtu-library-feed-type', 'occupancy-trend');
        markExt(container);

        var header = document.createElement('div');
        header.className = 'dtu-library-section-header';
        markExt(header);

        var h3 = document.createElement('div');
        h3.className = 'dtu-library-section-title';
        h3.textContent = '';
        h3.style.display = 'none';
        markExt(h3);

        var actions = document.createElement('div');
        actions.className = 'dtu-library-actions';
        markExt(actions);

        var retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.className = 'dtu-library-action-btn';
        retryBtn.textContent = 'Retry';
        retryBtn.style.display = 'none';
        markExt(retryBtn);
        actions.appendChild(retryBtn);

        header.appendChild(h3);
        header.appendChild(actions);
        container.appendChild(header);

        var body = document.createElement('div');
        body.className = 'dtu-library-crowd';
        markExt(body);

        var hero = document.createElement('div');
        hero.className = 'dtu-library-crowd-card dtu-library-crowd-hero';
        markExt(hero);

        var freeValue = document.createElement('div');
        freeValue.className = 'dtu-library-crowd-free';
        freeValue.textContent = '--%';
        markExt(freeValue);
        var freeUnit = document.createElement('div');
        freeUnit.className = 'dtu-library-crowd-free-unit';
        freeUnit.textContent = 'filled';
        markExt(freeUnit);
        var freeWrap = document.createElement('div');
        freeWrap.className = 'dtu-library-crowd-free-wrap';
        markExt(freeWrap);
        freeWrap.appendChild(freeValue);
        freeWrap.appendChild(freeUnit);
        var status = document.createElement('div');
        status.className = 'dtu-library-crowd-status';
        status.textContent = 'Waiting for data...';
        markExt(status);
        var heroTop = document.createElement('div');
        heroTop.className = 'dtu-library-crowd-hero-top';
        markExt(heroTop);
        var heroMain = document.createElement('div');
        heroMain.className = 'dtu-library-crowd-hero-main';
        markExt(heroMain);
        heroMain.appendChild(freeWrap);
        heroMain.appendChild(status);

        var heroStats = document.createElement('div');
        heroStats.className = 'dtu-library-crowd-hero-stats';
        markExt(heroStats);
        function createHeroStat(label, hint) {
            var stat = document.createElement('div');
            stat.className = 'dtu-library-crowd-hero-stat';
            markExt(stat);
            var statLabel = document.createElement('div');
            statLabel.className = 'dtu-library-crowd-hero-stat-label';
            statLabel.textContent = label;
            markExt(statLabel);
            var statValue = document.createElement('div');
            statValue.className = 'dtu-library-crowd-hero-stat-value';
            statValue.textContent = '--';
            markExt(statValue);
            var statHint = document.createElement('div');
            statHint.className = 'dtu-library-crowd-hero-stat-hint';
            statHint.textContent = hint || '';
            markExt(statHint);
            stat.appendChild(statLabel);
            stat.appendChild(statValue);
            stat.appendChild(statHint);
            heroStats.appendChild(stat);
            return statValue;
        }
        var nowStatValue = createHeroStat('Now', 'in library');
        var todayStatValue = createHeroStat('Today', 'visits today');
        var freeStatValue = createHeroStat('Free', 'seats available');

        var progress = document.createElement('div');
        progress.className = 'dtu-library-crowd-progress';
        progress.setAttribute('role', 'progressbar');
        progress.setAttribute('aria-valuemin', '0');
        progress.setAttribute('aria-valuemax', '100');
        progress.setAttribute('aria-valuenow', '0');
        progress.setAttribute('aria-valuetext', 'Unknown');
        markExt(progress);
        var progressFill = document.createElement('div');
        progressFill.className = 'dtu-library-crowd-progress-fill';
        markExt(progressFill);
        progress.appendChild(progressFill);

        heroTop.appendChild(heroMain);
        heroTop.appendChild(heroStats);
        hero.appendChild(heroTop);
        hero.appendChild(progress);

        var chartWrap = document.createElement('div');
        chartWrap.className = 'dtu-library-crowd-chart-wrap';
        chartWrap.style.setProperty('position', 'relative', 'important');
        markExt(chartWrap);
        var chartCanvas = document.createElement('canvas');
        chartCanvas.className = 'dtu-library-crowd-chart';
        chartCanvas.setAttribute('role', 'img');
        chartCanvas.setAttribute('aria-label', 'Library occupancy chart');
        markExt(chartCanvas);
        var chartNote = document.createElement('div');
        chartNote.className = 'dtu-library-crowd-chart-note';
        chartNote.textContent = 'Building historical averages...';
        markExt(chartNote);
        var eventLegend = document.createElement('div');
        eventLegend.className = 'dtu-library-crowd-events';
        eventLegend.style.display = 'none';
        markExt(eventLegend);
        var chartTooltip = document.createElement('div');
        chartTooltip.className = 'dtu-library-crowd-chart-tooltip';
        chartTooltip.style.cssText = 'display:none;position:absolute;pointer-events:none;z-index:10;background:rgba(20,20,20,0.88);color:#f0f0f0;font-size:13px;line-height:1.4;padding:5px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.35);';
        markExt(chartTooltip);
        chartWrap.appendChild(chartCanvas);
        chartWrap.appendChild(chartTooltip);

        var chartLegend = document.createElement('div');
        chartLegend.className = 'dtu-library-crowd-chart-legend';
        chartLegend.style.cssText = 'display:flex !important;gap:12px !important;justify-content:flex-end !important;margin:4px 2px 2px !important;flex-wrap:wrap !important;';
        markExt(chartLegend);
        chartWrap.appendChild(chartLegend);

        chartWrap.appendChild(eventLegend);

        var confidence = document.createElement('div');
        confidence.className = 'dtu-library-crowd-confidence';
        confidence.textContent = '';
        markExt(confidence);

        var dayRow = document.createElement('div');
        dayRow.className = 'dtu-library-crowd-days';
        dayRow.setAttribute('role', 'group');
        dayRow.setAttribute('aria-label', 'Show the usual day');
        dayRow.style.display = 'none';
        markExt(dayRow);
        var dayButtons = {};
        LIBRARY_WEEK_ORDER.forEach(function (day) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'dtu-library-crowd-day';
            btn.textContent = day.charAt(0).toUpperCase() + day.slice(1, 3);
            btn.setAttribute('aria-pressed', 'false');
            markExt(btn);
            dayRow.appendChild(btn);
            dayButtons[day] = btn;
        });

        var state = document.createElement('div');
        state.className = 'dtu-library-crowd-state';
        state.style.display = 'none';
        state.textContent = 'Library data unavailable.';
        markExt(state);

        body.appendChild(hero);
        // How today compares and what "usual" means, behind an "i" at the end of the legend.
        var usualInfo = document.createElement('span');
        usualInfo.className = 'dtu-library-usual-info';
        markExt(usualInfo);
        var usualBtn = document.createElement('button');
        usualBtn.type = 'button';
        usualBtn.className = 'dtu-library-usual-btn';
        usualBtn.setAttribute('aria-label', 'About these numbers');
        usualBtn.setAttribute('aria-describedby', 'dtu-library-usual-tip');
        markExt(usualBtn);
        var usualMark = document.createElement('span');
        usualMark.className = 'dtu-library-usual-info-mark';
        usualMark.setAttribute('aria-hidden', 'true');
        usualMark.textContent = 'i';
        markExt(usualMark);
        usualBtn.appendChild(usualMark);
        var usualTip = document.createElement('span');
        usualTip.className = 'dtu-library-usual-tip';
        usualTip.id = 'dtu-library-usual-tip';
        markExt(usualTip);
        usualTip.appendChild(chartNote);
        usualTip.appendChild(confidence);
        var usualSource = document.createElement('div');
        usualSource.className = 'dtu-library-usual-source';
        usualSource.appendChild(document.createTextNode('Visitor count from '));
        var usualSourceLink = document.createElement('a');
        usualSourceLink.href = 'https://findit.dtu.dk/screen?zone=main';
        usualSourceLink.target = '_blank';
        usualSourceLink.rel = 'noopener noreferrer';
        usualSourceLink.textContent = 'Visitors at DTU Library';
        markExt(usualSourceLink);
        usualSource.appendChild(usualSourceLink);
        markExt(usualSource);
        usualTip.appendChild(usualSource);
        usualInfo.appendChild(usualBtn);
        usualInfo.appendChild(usualTip);

        body.appendChild(dayRow);
        body.appendChild(chartWrap);
        body.appendChild(state);
        container.appendChild(body);

        var sectionRef = {
            container: container,
            retryBtn: retryBtn,
            hero: hero,
            freeValue: freeValue,
            status: status,
            nowStatValue: nowStatValue,
            todayStatValue: todayStatValue,
            freeStatValue: freeStatValue,
            progress: progress,
            progressFill: progressFill,
            chartCanvas: chartCanvas,
            chartTooltip: chartTooltip,
            chartLegend: chartLegend,
            chartNote: chartNote,
            eventLegend: eventLegend,
            confidence: confidence,
            usualInfo: usualInfo,
            dayRow: dayRow,
            dayButtons: dayButtons,
            selectedWeekday: null,
            state: state,
            onRetry: null
        };

        retryBtn.addEventListener('click', function () {
            if (typeof sectionRef.onRetry === 'function') sectionRef.onRetry();
        });
        LIBRARY_WEEK_ORDER.forEach(function (day) {
            dayButtons[day].addEventListener('click', function () {
                sectionRef.selectedWeekday = day;
                renderLibraryTrendChart(sectionRef);
            });
        });

        return sectionRef;
    }

    function renderLibraryTrendSection(section, crowdingResp, fallbackOccupancyResp, eventsResp) {
        if (!section) return;
        var model = buildLibraryCrowdingModel(crowdingResp, fallbackOccupancyResp);
        var eventIntervals = buildLibraryEventIntervals(eventsResp, model);
        var snap = model.snapshot || {};
        var tier = getLibraryCrowdingTier(model.occupancyRatio);
        var insightLine = buildLibraryCrowdingInsightLine(model);
        var showLiveOccupancy = !!model.isWithinDisplayHours;
        var statusLabel = showLiveOccupancy ? tier.label : 'After hours';
        var statusColor = showLiveOccupancy ? tier.color : (isDarkModeEnabled() ? '#b6bcc8' : '#667084');
        var shownVisitors = showLiveOccupancy ? snap.visitors : null;
        var shownToday = showLiveOccupancy ? snap.today : null;
        var shownFreeSeats = showLiveOccupancy ? snap.freeSeats : null;

        // isFinite(null) === true in JS — must check for null explicitly
        var pct = (showLiveOccupancy && model.occupancyRatio != null && isFinite(model.occupancyRatio) ? Math.round(model.occupancyRatio * 100) : null);
        // After hours the live numbers are hidden, so say that once instead of
        // showing an empty percentage and three empty stats.
        if (section.hero) section.hero.classList.toggle('is-after-hours', !showLiveOccupancy);
        if (section.freeValue) section.freeValue.textContent = !showLiveOccupancy ? 'After hours' : (pct == null ? '--%' : (pct + '%'));
        if (section.status) {
            section.status.textContent = showLiveOccupancy ? statusLabel
                : 'Live numbers return at ' + (model.startHour < 10 ? '0' : '') + model.startHour + ':00';
            section.status.style.setProperty('color', statusColor, 'important');
        }
        if (section.nowStatValue) section.nowStatValue.textContent = formatLibraryOccupancyCount(shownVisitors);
        if (section.todayStatValue) section.todayStatValue.textContent = formatLibraryOccupancyCount(shownToday);
        if (section.freeStatValue) section.freeStatValue.textContent = formatLibraryOccupancyCount(shownFreeSeats);

        if (section.progress) {
            section.progress.setAttribute('aria-valuenow', String(pct == null ? 0 : pct));
            section.progress.setAttribute('aria-valuetext', statusLabel);
            if (showLiveOccupancy && tier.key === 'medium') section.progress.setAttribute('aria-valuetext', 'Moderate');
            if (showLiveOccupancy && tier.key === 'high') section.progress.setAttribute('aria-valuetext', 'Busy');
            if (section.progressFill) {
                section.progressFill.style.setProperty('width', String(Math.max(0, Math.min(100, pct || 0))) + '%', 'important');
                section.progressFill.style.setProperty('background', statusColor, 'important');
            }
        }
        section._dtuTrend = { model: model, eventIntervals: eventIntervals, insightLine: insightLine, showLiveOccupancy: showLiveOccupancy };
        renderLibraryTrendChart(section);

        var unavailable = !snap.hasCurrent;
        if (section.state) {
            if (unavailable) {
                section.state.style.display = '';
                section.state.textContent = crowdingResp && crowdingResp.error === 'not_configured'
                    ? 'Shared library occupancy is not configured in this build.'
                    : 'Library data unavailable. Try refreshing.';
            } else {
                section.state.style.display = 'none';
            }
        }
        if (section.retryBtn) section.retryBtn.style.display = unavailable ? '' : 'none';
    }


    // The chart, legend and source lines for the chosen weekday (today by default).
    function renderLibraryTrendChart(section) {
        var state = section && section._dtuTrend;
        if (!state) return;
        var baseModel = state.model;
        var snap = baseModel.snapshot || {};
        var showLiveOccupancy = state.showLiveOccupancy;
        var eventIntervals = state.eventIntervals;
        var weekdayKeys = LIBRARY_WEEK_ORDER.filter(function (day) {
            return Array.isArray(baseModel.weekdayMap && baseModel.weekdayMap[day]) && baseModel.weekdayMap[day].length;
        });
        var selected = weekdayKeys.indexOf(section.selectedWeekday) >= 0 ? section.selectedWeekday : baseModel.weekdayName;
        var model = selectLibraryWeekdayView(baseModel, selected);
        var insightLine = model.isOtherDay ? buildLibraryWeekdaySummaryLine(model) : state.insightLine;
        // Library events are today's; they do not belong on another day's bars.
        if (model.isOtherDay) eventIntervals = [];

        if (section.dayRow) {
            section.dayRow.style.display = weekdayKeys.length ? '' : 'none';
            LIBRARY_WEEK_ORDER.forEach(function (day) {
                var btn = section.dayButtons && section.dayButtons[day];
                if (!btn) return;
                btn.disabled = weekdayKeys.indexOf(day) < 0;
                btn.setAttribute('aria-pressed', day === model.weekdayName ? 'true' : 'false');
                btn.title = day === baseModel.weekdayName ? 'Today' : '';
            });
        }

        var chartFlags = drawLibraryCrowdingChart(section.chartCanvas, model, eventIntervals) || {};
        if (section.chartNote) {
            section.chartNote.textContent = insightLine;
            section.chartNote.style.setProperty('display', insightLine ? '' : 'none', 'important');
        }

        if (section.chartLegend) {
            var legColors = getLibraryHourBarColors();
            var legMuted = legColors.text;
            while (section.chartLegend.firstChild) section.chartLegend.removeChild(section.chartLegend.firstChild);
            function makeLegItem(label, swatchColor, dashed) {
                var item = document.createElement('span');
                item.style.cssText = 'display:inline-flex !important;align-items:center !important;gap:5px !important;font-size:13px !important;color:' + legMuted + ' !important;white-space:nowrap !important;';
                markExt(item);
                var icon = document.createElement('span');
                icon.style.cssText = 'display:inline-block !important;width:16px !important;height:0 !important;border:0 !important;border-top:2px ' + (dashed ? 'dashed' : 'solid') + ' ' + swatchColor + ' !important;';
                markExt(icon);
                var lbl = document.createElement('span');
                lbl.textContent = label;
                markExt(lbl);
                item.appendChild(icon);
                item.appendChild(lbl);
                return item;
            }
            if (chartFlags.hasTypical) {
                var usualLabel = model.hasWeekdaySpecificHistory
                    ? 'Usual ' + formatLibraryWeekdayObservations(model.weekdayName, 2)
                    : 'Usual (all days)';
                section.chartLegend.appendChild(makeLegItem(usualLabel, chartFlags.usualAsLine ? legColors.usual : legColors.today, chartFlags.usualAsLine));
            }
            if (chartFlags.hasToday) section.chartLegend.appendChild(makeLegItem('Today', legColors.today, false));
            if (section.usualInfo) section.chartLegend.appendChild(section.usualInfo);
        }

        if (section.chartCanvas) {
            if (showLiveOccupancy) {
                section.chartCanvas.setAttribute(
                    'aria-label',
                    'Library occupancy chart. Currently '
                    + formatLibraryOccupancyCount(snap.visitors)
                    + ' visitors, '
                    + formatLibraryOccupancyCount(snap.freeSeats)
                    + ' free seats.'
                );
            } else {
                section.chartCanvas.setAttribute(
                    'aria-label',
                    'Library occupancy chart. After hours; live occupancy is hidden outside the '
                    + formatLibraryMinuteRange(model.startHour * 60, model.endHour * 60)
                    + ' graph window.'
                );
            }

            // Store live model reference for the tooltip handler
            section.chartCanvas._dtuModel = model;
            section.chartCanvas._dtuEvents = eventIntervals;

            // Set up hover tooltip (once per canvas element)
            if (!section.chartCanvas._dtuTooltipBound && section.chartTooltip) {
                section.chartCanvas._dtuTooltipBound = true;
                var _tip = section.chartTooltip;
                var _cnv = section.chartCanvas;

                _cnv.addEventListener('mousemove', function (e) {
                    var m = _cnv._dtuModel;
                    if (!m) { _tip.style.display = 'none'; return; }
                    var layout = _cnv._dtuChartLayout;
                    if (!layout) { _tip.style.display = 'none'; return; }
                    var bars = buildLibraryHourBars(m);
                    var rect = _cnv.getBoundingClientRect();
                    var minute = layout.startMin + ((e.clientX - rect.left - layout.left) / layout.plotW) * layout.spanMin;
                    var idx = Math.floor((minute - layout.startMin) / 60);
                    var bar = (idx >= 0 && idx < bars.length) ? bars[idx] : null;
                    if (!bar) { _tip.style.display = 'none'; return; }
                    var parts = [formatLibraryMinuteRange(bar.hour * 60, (bar.hour + 1) * 60)];
                    if (bar.today != null) parts.push((bar.isNow ? 'Now: ' : 'Today: ') + bar.today);
                    if (bar.usual != null) parts.push('Usual: ' + bar.usual);
                    (_cnv._dtuEvents || []).forEach(function (itv) {
                        if (itv.startMinute <= minute && minute < itv.endMinute) parts.push(itv.title || 'DTU Library event');
                    });

                    if (parts.length <= 1) { _tip.style.display = 'none'; return; }
                    _tip.textContent = parts.join('  |  ');

                    // Position tooltip: above cursor, clamped inside chartWrap
                    var wrapRect = _cnv.parentNode.getBoundingClientRect();
                    var tipLeft = e.clientX - wrapRect.left + 10;
                    var tipTop = e.clientY - wrapRect.top - 32;
                    _tip.style.display = 'block';
                    _tip.style.left = tipLeft + 'px';
                    _tip.style.top = Math.max(2, tipTop) + 'px';
                });

                _cnv.addEventListener('mouseleave', function () {
                    _tip.style.display = 'none';
                });
            }
        }

        if (section.eventLegend) {
            while (section.eventLegend.firstChild) section.eventLegend.removeChild(section.eventLegend.firstChild);
            if (eventIntervals.length) {
                section.eventLegend.style.display = '';
                var maxLegendItems = 4;
                eventIntervals.slice(0, maxLegendItems).forEach(function (itv) {
                    var row = document.createElement('div');
                    row.className = 'dtu-library-crowd-event';
                    markExt(row);
                    var dot = document.createElement('span');
                    dot.className = 'dtu-library-crowd-event-dot';
                    markExt(dot);
                    var txt = document.createElement('span');
                    txt.className = 'dtu-library-crowd-event-text';
                    txt.textContent = formatLibraryMinuteRange(itv.startMinute, itv.endMinute) + ': ' + (itv.title || 'DTU Library event');
                    markExt(txt);
                    row.appendChild(dot);
                    row.appendChild(txt);
                    section.eventLegend.appendChild(row);
                });
                if (eventIntervals.length > maxLegendItems) {
                    var more = document.createElement('div');
                    more.className = 'dtu-library-crowd-event';
                    more.textContent = '+' + (eventIntervals.length - maxLegendItems) + ' more event' + (eventIntervals.length - maxLegendItems === 1 ? '' : 's');
                    markExt(more);
                    section.eventLegend.appendChild(more);
                }
            } else {
                section.eventLegend.style.display = 'none';
            }
        }

        if (section.confidence) section.confidence.textContent = buildLibraryCrowdingConfidenceLine(model);
        syncLibraryUsualInfo(section);
    }

    // The "i" shows only when its tip has something to say.
    function syncLibraryUsualInfo(section) {
        if (!section || !section.usualInfo) return;
        var noteText = section.chartNote && section.chartNote.style.getPropertyValue('display') !== 'none' ? section.chartNote.textContent : '';
        var hasText = !!(noteText || (section.confidence && section.confidence.textContent));
        section.usualInfo.style.setProperty('display', hasText ? '' : 'none', 'important');
    }

    try {
        var existingLibraryDeps = globalThis.DTUAfterDarkLibraryDeps || {};
        globalThis.DTUAfterDarkLibraryDeps = Object.assign({}, existingLibraryDeps, {
            ensureLibraryRuntimeStyles: ensureLibraryRuntimeStyles,
            createLibraryTrendSection: createLibraryTrendSection,
            renderLibraryTrendSection: renderLibraryTrendSection
        });
    } catch (eLibDeps) { }
})();
