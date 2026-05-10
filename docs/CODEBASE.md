# Codebase Guide

This repo is still centered around a large content script, but the runtime boundaries are stable enough that new work can be done predictably if you start from the right file.

## Runtime Topology

- `manifest.json` / `manifest_chrome.json`
  - Browser entrypoints, host matches, permissions, and content-script injection order.
- `config.js`
  - Safe tracked defaults only.
  - Local-only overrides belong in untracked `config.local.js`.
- `background.js`
  - Cross-origin fetch broker, caching, and runtime message handlers.
  - Any network-backed feature usually has a message type here first.
- `darkmode.js`
  - Main content script bootstrap, shared bridges, and unified observer.
  - Still owns the library data model, chart rendering, and shared helper/runtime hooks.
- `darkmode.dark-engine.js`
  - Extracted shared dark-mode runtime.
  - Owns shadow-root style injection, dynamic inline overrides, iframe/html-block processing, and `runDarkModeChecks`.
- `darkmode.library.js`
  - Extracted DTU Learn library nav/panel shell.
  - Owns the Library nav item, modal open/close flow, quick links, and events/news list UI.
- `darkmode.book-finder.js`
  - Extracted DTU Learn book-finder shell.
  - Owns ISBN/title detection on course pages and link-bar rendering for library/bookshop/marketplace searches.
- `darkmode.learn-nav.js`
  - Extracted DTU Learn nav shell.
  - Owns `Student Resources` quick-link injection/reordering, `Help` removal, and the `Settings` nav item insertion.
- `darkmode.learn-accent-shell.js`
  - Extracted DTU Learn accent shell.
  - Owns accent-band forcing, Learn badge/counter accent treatment, mobile-nav shell styling, and legacy LMS cleanup.
- `darkmode.learn-shell.js`
  - Extracted DTU Learn shell extras.
  - Owns Mojangles header branding, the first-run settings onboarding hint, and the dev-only context-capture helper.
- `darkmode.settings.js`
  - Extracted standalone DTU Learn settings shell.
  - Owns the settings modal, paused-URL manager modal, disclaimer/footer actions, and immediate settings application UI.
- `darkmode.smart-room-linker.js`
  - Extracted shared MazeMap smart-room linker shell and engine.
  - Owns site-wide room-text detection, MazeMap link injection, tooltip/loading state, and shadow/html-block rescans.
- `darkmode.host-shells.js`
  - Extracted shared non-Learn host shell styling module.
  - Owns CampusNet shell restyling, evaluering chart-shell fixes, and the student-portal shell styling boundary.
- `darkmode.studyplanner-shell.js`
  - Extracted shared `studieplan.dtu.dk` / `kurser.dtu.dk` shell-accent module.
  - Owns accent-bar/tab styling, study-planner top-link polish, basket action repositioning, typebox color preservation, and kurser light-mode accent links.
- `darkmode.bus.js`
  - DTU Learn bus runtime/module.
  - Owns bus config, quota handling, fetch/polling, widget UI, and config modal.
  - Owns the top-nav departure widget, first-run setup prompt, bus config modal, and admin-tools bus toggle.
- `darkmode.content-shortcut.js`
  - Extracted DTU Learn course-card content shortcut shell.
  - Owns course-card button insertion, per-course override storage sync, and the shortcut-link editor modal.
- `darkmode.deadlines.js`
  - Extracted DTU Learn deadlines widget shell.
  - Owns homepage widget rendering, deduping, refresh/collapse UX, and admin toggles for deadlines/search.
- `darkmode.kurser-widgets.js`
  - Extracted `kurser.dtu.dk` course-widget shell.
  - Owns MyLine badges, grade stats, room finder, and schedule annotation.
- `darkmode.kurser-course-eval.js`
  - Extracted `kurser.dtu.dk` course-evaluation shell.
  - Owns evaluation discovery, retry logic, fetch/render flow, and the evaluation panel UI.
- `darkmode.kurser-textbooks.js`
  - Extracted `kurser.dtu.dk` textbook-linker shell.
  - Owns literature detection, citation parsing, FindIt/Google Books link injection, and rollback/rehydration of literature sections.
- `darkmode.lessons-bulk.js`
  - Extracted DTU Learn Lessons bulk-download runtime module.
  - Owns the control lifecycle, section-tree parsing, legacy/API fallback resolution, file discovery, and bundled/native download flow.
- `darkmode.studyplan-exams.js`
  - Extracted Study Planner exam-cluster UI shell.
  - Owns timeline rendering, exam-choice editor modal, and grade countdown badges.
- `darkmode.studyplan-runtime.js`
  - Study Planner exam parsing/timeline runtime module.
  - Owns course extraction, exam-calendar matching, timeline overrides, and render scheduling/state.
- `darkmode.semester-twins.js`
  - Extracted Semester Twins UI shell for DTU Learn and CampusNet.
  - Owns widget placement, rendering, theming, and CampusNet frontpage retry logic.
- `darkmode.participant-intel-ui.js`
  - Extracted CampusNet participant-intelligence UI shell.
  - Owns demographics, shared-history badges, profile history, and Retention Radar rendering.
- `darkmode.participant-intel-backfill.js`
  - Extracted CampusNet archive backfill/history-scanner shell and engine.
  - Owns archive-page parsing, participant-page fetch/backfill flow, progress state, and archive widget rendering.
- `darkmode.participant-intel-core.js`
  - Extracted shared participant-intelligence storage and parsing core.
  - Owns browser-storage persistence, course-history deduping, Semester Twins prefs, participant-page collection, and self-detection.
- `darkmode.participant-intel-host.js`
  - Extracted CampusNet participant-intel host/runtime helper module.
  - Owns CampusNet page detection, semester/course parsing, course-title filtering, and participant-list DOM helpers.
- `darkmode.participant-intel-scoring.js`
  - Extracted Semester Twins scoring/runtime analytics module.
  - Owns overlap scoring, study-line-specific course detection, and match ranking for DTU Learn and CampusNet twins.
- `darkmode.campusnet-gpa.js`
  - Extracted CampusNet GPA/ECTS/simulator feature shell and table logic.
  - Owns grade-table parsing, weighted GPA row, ECTS bar, and hypothetical-grade simulator UI.
- `darkmode.css`
  - Static dark-mode stylesheet loaded by the content script.
- `scripts/build-firefox.ps1` / `scripts/build-chrome.ps1`
  - Package the public extension builds.
  - Keep their explicit root-file copy lists in sync with the manifests when adding a new public runtime file.

## Current Ownership By Area

- Theme/bootstrap/storage:
  - `darkmode.js`
  - Early helpers near the top of the file: dark mode state, accent handling, feature flags, storage wrappers.
- Global darkening engine and shadow DOM support:
  - `darkmode.dark-engine.js`
  - Shadow-root style injection, dynamic inline overrides, iframe/html-block rescans, and dark-mode runtime checks.
  - `darkmode.js`
  - Unified mutation scheduling and bridge wrappers into the dark engine.
- DTU Learn library panel shell:
  - `darkmode.library.js`
  - Nav insertion, modal lifecycle, quick links, events/news panels.
- DTU Learn book finder:
  - `darkmode.book-finder.js`
  - Course-page ISBN/title detection and injected search-link bars.
- DTU Learn nav shell:
  - `darkmode.learn-nav.js`
  - Student Resources quick-link injection/reordering, Help-menu removal, and Settings-nav insertion.
- DTU Learn accent shell:
  - `darkmode.learn-accent-shell.js`
  - Accent-band forcing, Learn badge/counter accent treatment, mobile-nav shell styling, and legacy LMS cleanup.
- DTU Learn shell extras:
  - `darkmode.learn-shell.js`
  - Mojangles header branding, first-run settings onboarding hint, and the dev-only context-capture helper.
- DTU Learn settings shell:
  - `darkmode.settings.js`
  - Standalone settings modal, paused-URL rules UI, disclaimer/footer actions, and feature-toggle shell.
- Shared smart room linker:
  - `darkmode.smart-room-linker.js`
  - Site-wide room detection, MazeMap link generation, tooltip/loading state, and shadow/html-block rescans.
- Host shell styling:
  - `darkmode.host-shells.js`
  - CampusNet shell restyling, evaluering chart-shell fixes, and student-portal shell styling.
- Study Planner / kurser shell accents:
  - `darkmode.studyplanner-shell.js`
  - Shared tab/top-bar styling, study-planner basket action placement, typebox color preservation, and kurser light-mode accent links.
- DTU Learn bus runtime/module:
  - `darkmode.bus.js`
  - Top-nav departure display, setup prompt, config modal, and admin-tools toggle.
- DTU Learn content shortcut shell:
  - `darkmode.content-shortcut.js`
  - Course-card button injection, Org Unit override storage sync, and the override manager modal.
- DTU Learn deadlines widget:
  - `darkmode.deadlines.js`
  - Homepage widget placement, deadline row rendering, admin toggles, cache/refresh state.
- Kurser course-widget shell:
  - `darkmode.kurser-widgets.js`
  - MyLine badges, grade stats, room finder, and schedule annotation.
- Kurser course-evaluation shell:
  - `darkmode.kurser-course-eval.js`
  - Evaluation link discovery, retry/backoff flow, and evaluation panel rendering.
- Kurser textbook-linker shell:
  - `darkmode.kurser-textbooks.js`
  - Literature section detection, citation parsing, FindIt/Google Books action rendering, and section restructuring/rollback.
- DTU Learn Lessons bulk-download runtime:
  - `darkmode.lessons-bulk.js`
  - Lessons-page mount logic, section discovery, legacy/API fallback resolution, and bundled/native download flow.
- Study Planner exam-cluster UI shell:
  - `darkmode.studyplan-exams.js`
  - Timeline rendering, choice modal/editor, and grade-countdown decoration.
- Semester Twins UI shell:
  - `darkmode.semester-twins.js`
  - DTU Learn homepage widget, CampusNet frontpage widget shell, shared card rendering, filter-menu integration, and retry placement logic.
- Participant-intelligence UI shell:
  - `darkmode.participant-intel-ui.js`
  - CampusNet participant-page demographics, shared-history badges, profile history cards, and Retention Radar rendering.
- Participant-intelligence archive backfill:
  - `darkmode.participant-intel-backfill.js`
  - CampusNet archive-page parsing, remote participant-list fetches, backfill progress state, and Course History Scanner widget.
- Participant-intelligence shared core:
  - `darkmode.participant-intel-core.js`
  - Storage, participant-course deduping, Semester Twins preferences, participant-page collection, and self-detection.
- Participant-intelligence host helpers:
  - `darkmode.participant-intel-host.js`
  - CampusNet page detection, semester/course parsing, course-title filtering, and participant-list DOM helpers.
- Participant-intelligence scoring:
  - `darkmode.participant-intel-scoring.js`
  - Semester Twins overlap scoring, study-line-specific course detection, and ranking logic.
- DTU Learn library data/model/charting:
  - `darkmode.js`
  - Shared occupancy fetch wiring, chart/heatmap rendering, trend math.
- CampusNet GPA tools:
  - `darkmode.campusnet-gpa.js`
  - Grades-table parsing, ignored-grade toggles, weighted GPA summary, ECTS progress, hypothetical GPA simulator.
- DTU Learn widgets and nav features:
  - `darkmode.js`
  - Remaining quick links and other unsplit Learn-specific hooks.
- Kurser shared helpers:
  - `darkmode.js`
  - Shared ISBN helpers, course-page detection, insight theme helpers, and other remaining kurser utilities.
- CampusNet tools:
  - `darkmode.js`
  - Semester Twins data/scoring and shared CampusNet helpers.
- Study Planner:
  - `darkmode.js`
  - Exam data parsing, season-aware mapping, and request orchestration.
- Remote data fetches:
  - `background.js`
  - Rejseplanen, DTU sources, course evaluation, grade stats, library events/news/shared crowding.

## High-Signal Search Anchors

When editing `darkmode.js`, start with `rg` on the feature entrypoint instead of reading from the top.

- Library:
  - `darkmode.library.js`
  - `insertLibraryNavDropdown`
  - `showLibraryPanel`
  - `renderLibraryFeedItems`
- Library chart/data:
  - `darkmode.js`
  - `requestLibraryCrowding`
  - `renderLibraryTrendSection`
- DTU Learn deadlines:
  - `darkmode.deadlines.js`
  - `insertDeadlinesHomepageWidget`
  - `buildTopDeadlines`
- Bus:
  - `darkmode.bus.js`
  - `insertBusDisplay`
  - `showBusSetupPrompt`
  - `showBusConfigModal`
  - `insertBusToggle`
- DTU Learn content shortcut:
  - `darkmode.content-shortcut.js`
  - `insertContentButtons`
  - `showContentShortcutOverridesModal`
  - `startContentButtonBootstrap`
- DTU Learn nav shell:
  - `darkmode.learn-nav.js`
  - `insertDTULearnNavResourceLinks`
  - `removeDTULearnNavResourceLinks`
  - `removeDTULearnHelpDropdown`
  - `insertSettingsNavItem`
- DTU Learn shell extras:
  - `darkmode.learn-shell.js`
  - `insertMojanglesText`
  - `scheduleOnboardingHint`
- DTU Learn accent shell:
  - `darkmode.learn-accent-shell.js`
  - `forceDTULearnAccentInRoot`
  - `forceDTULearnAccentElements`
  - `fixDTULearnLegacyLmsToolStyling`
- Settings shell:
  - `darkmode.settings.js`
  - `showSettingsModal`
  - `showPausedUrlRulesModal`
- Host shells:
  - `darkmode.host-shells.js`
  - `fixCampusnetHeaderStyling`
  - `fixEvalueringResultCharts`
- Smart room linker:
  - `darkmode.smart-room-linker.js`
  - `scheduleSmartRoomLinkerScan`
  - `scheduleSmartRoomLinkerShadowSweep`
  - `createMazemapSmartLink`
- Kurser course widgets:
  - `darkmode.kurser-widgets.js`
  - `insertKurserMyLineBadge`
  - `insertKurserGradeStats`
  - `insertKurserRoomFinder`
  - `annotateKurserSchedulePlacement`
- Kurser course evaluation:
  - `darkmode.kurser-course-eval.js`
  - `insertKurserCourseEvaluation`
- Kurser textbook linker:
  - `darkmode.kurser-textbooks.js`
  - `insertKurserTextbookLinks`
  - `scheduleKurserTextbookLinker`
- Bus:
  - `updateBusDepartures`
  - `showBusSetupPrompt`
- Lessons bulk download:
  - `darkmode.lessons-bulk.js`
  - `runLessonsBulkDownloadChecks`
  - `insertLessonsBulkDownloadControl`
- CampusNet GPA:
  - `darkmode.campusnet-gpa.js`
  - `insertGPARow`
  - `insertECTSProgressBar`
  - `insertGPASimulator`
- Participant intelligence:
  - `darkmode.participant-intel-backfill.js`
  - `darkmode.participant-intel-core.js`
  - `darkmode.participant-intel-host.js`
  - `darkmode.participant-intel-scoring.js`
  - `darkmode.participant-intel-ui.js`
  - `insertParticipantIntelligence`
  - `insertParticipantDemographics`
  - `annotateParticipantHistory`
  - `annotateProfileHistory`
  - `recordRetentionSnapshot`
  - `insertCampusnetArchiveBackfillWidget`
  - `collectParticipantData`
  - `loadParticipantIntel`
  - `updateSemesterTwinPrefs`
  - `darkmode.semester-twins.js`
  - `insertSemesterTwinWidget`
  - `insertCampusnetSemesterTwinWidget`
- Study Planner exams:
  - `darkmode.studyplan-runtime.js`
  - Course parsing, exam-date matching, timeline state, and refresh scheduling.
  - `darkmode.studyplan-exams.js`
  - `renderStudyplanExamCluster`
- Study Planner shell:
  - `darkmode.studyplanner-shell.js`
  - `styleStudyPlannerTabs`

## Library Data Boundary

The library crowding panel is now shared-endpoint-only.

- `background.js` serves `dtu-library-live-stats`.
- `darkmode.js` reads `CONFIG.LIVE_LIBRARY_TRENDS_URL`.
- If that URL is missing, the library panel still renders links, events, and news, but live occupancy/crowding is unavailable.
- Do not reintroduce direct client/background scraping of DTU FindIt occupancy into the public content-script path.

## Safe Change Workflow

For most feature work:

1. Find the UI entrypoint in `darkmode.js`.
2. Find the paired runtime message in `background.js` if the feature fetches remote data.
3. Check `README.md` and `changes.md` before finishing.
4. Run a focused syntax/build verification:
   - `node --check darkmode.js`
   - `node --check darkmode.book-finder.js` when touching the DTU Learn book-finder shell
   - `node --check darkmode.learn-nav.js` when touching the DTU Learn nav shell
   - `node --check darkmode.learn-accent-shell.js` when touching DTU Learn accent-band or legacy LMS shell styling
   - `node --check darkmode.learn-shell.js` when touching the DTU Learn shell extras
   - `node --check darkmode.settings.js` when touching the DTU Learn settings shell
   - `node --check darkmode.host-shells.js` when touching CampusNet/evaluering host-shell styling
   - `node --check darkmode.smart-room-linker.js` when touching shared MazeMap room linking
   - `node --check darkmode.studyplanner-shell.js` when touching shared Study Planner / kurser shell styling
  - `node --check darkmode.bus.js` when touching the DTU Learn bus module
   - `node --check darkmode.content-shortcut.js` when touching the DTU Learn content shortcut shell
   - `node --check darkmode.library.js` when touching the library shell
   - `node --check darkmode.deadlines.js` when touching the deadlines widget shell
   - `node --check darkmode.kurser-course-eval.js` when touching the kurser course-evaluation shell
   - `node --check darkmode.kurser-textbooks.js` when touching the kurser textbook-linker shell
   - `node --check darkmode.kurser-widgets.js` when touching the kurser course-widget shell
   - `node --check darkmode.studyplan-runtime.js` when touching Study Planner exam parsing/timeline runtime
   - `node --check darkmode.lessons-bulk.js` when touching the Lessons bulk-download runtime
   - `node --check darkmode.participant-intel-backfill.js` when touching archive backfill/history-scanner code
   - `node --check darkmode.participant-intel-core.js` when touching participant-intelligence storage/parser code
   - `node --check darkmode.participant-intel-host.js` when touching CampusNet participant-intel page parsing/detection helpers
   - `node --check darkmode.participant-intel-scoring.js` when touching Semester Twins scoring/ranking logic
   - `node --check darkmode.participant-intel-ui.js` when touching participant-intelligence UI
   - `node --check darkmode.studyplan-exams.js` when touching the Study Planner exam UI shell
   - `node --check darkmode.semester-twins.js` when touching the Semester Twins UI shell
   - `node --check background.js`
   - browser build script if manifests/content-script lists changed

## Maintainer Handoff

- Public maintainer/AI orientation should live in this file so the tracked repo is self-explanatory.
- Local-only handoff files such as `AGENTS.md` or `CLAUDE.md` can still exist privately, but public cleanup work should not depend on them being present.

## Suggested Refactor Order

If continuing the cleanup, split by feature area rather than by utility type:

1. Participant intelligence data/scoring refinement
2. Remaining global darkening edge cases last

That order gives smaller reviewable diffs and avoids destabilizing the shared observer/theme core too early.
