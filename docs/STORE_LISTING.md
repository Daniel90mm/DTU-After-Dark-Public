# Browser Store Listing

Use this copy for both Firefox Add-ons and the Chrome Web Store so the public listing stays aligned with the shipped extension.

## Name

DTU After Dark

## Short description

Dark mode and practical student tools for DTU Learn, CampusNet, Study Planner, and related DTU services.

## Full description

DTU After Dark is an unofficial browser extension that gives DTU's student-facing services a consistent two-tone dark theme and adds optional workflow tools.

Highlights:

- Customizable dark mode with DTU-inspired accent presets and custom colors.
- DTU Learn dashboard tools for deadlines, live bus departures, Library occupancy/events/news, course search, and course Content shortcuts.
- Course-content download tools for supported DTU Learn Lessons pages.
- CampusNet GPA tools with weighted GPA, projected-grade simulation, and grade-row controls.
- Optional CampusNet Participant Intelligence for course composition, shared course history, and Retention Radar.
- Course Catalog insights for grade statistics, course evaluations, and textbook links.
- Smart Room Links that turn room mentions already shown on supported DTU pages into MazeMap links.
- Per-feature settings and paused-URL controls.

Supported services include DTU Learn, CampusNet, Study Planner, kurser.dtu.dk, grades, course evaluations, and selected related DTU pages.

Privacy:

- Preferences, caches, and feature state are stored locally in the browser.
- Participant Intelligence is disabled by default and stores its dataset locally only when enabled.
- DTU After Dark does not include advertising, analytics, heartbeat telemetry, or remote code.
- Live features contact the DTU and third-party services documented in the public privacy policy.

DTU After Dark is unofficial and is not affiliated with or endorsed by DTU or any service provider. Information shown by the extension may be delayed, incomplete, or inaccurate; always verify critical information through official DTU channels.

## Version 8.1.0 release notes

- Redesigned the grade and evaluation widgets on kurser.dtu.dk. Grade statistics now default to the main exam instead of a small re-exam sitting, pass/fail courses are read correctly, and you can switch between the last four exams.
- Course content downloads handle large courses: scanning takes seconds instead of minutes, downloads always produce a ZIP, and courses over 2 GB are split into parts.
- Darkened the Lessons table of contents, the public course evaluation results on evaluering.dtu.dk, and made links in course text visible again.
- Room links now recognise codes like "R0.15.A" and show in the link colour.
- Settings and the Library panel work fully by keyboard, with visible focus and better contrast in both modes.
- Redesigned Retention Radar and Course Composition on CampusNet participant lists. The extension no longer changes the participant page size, so big courses load faster and do not wait on hundreds of profile pictures.

## Version 8.0.3 release notes

- Made lesson bulk downloads much faster to start. The scan no longer downloads every file once just to look inside it, and it checks several pages at a time.
- Added a Cancel button while a bulk download runs. Cancelling, or leaving the lessons view, stops the run, discards what it had collected, and starts no download afterwards.

## Version 8.0.2 release notes

- Made DTU Learn noticeably faster. Repeated searches of the page structure are now cached and shared between features, so course, lessons, and homepage views spend far less time waiting on the extension.
- Stopped the lesson download control from scanning pages that can never use it.
- Fixed the Library and Settings menu entries swapping places while a course or lessons page loaded; they now appear once and stay put.
- Darkened the "Are You Still There?" session-expiry message so an idle page no longer flashes a white box.

## Version 8.0.1 release notes

- Prevented Library occupancy refreshes from exhausting the shared service's daily database allowance, without changing the current count, daily graph, historical comparison, or manual refresh controls.

## Version 8.0.0 release notes

- Redesigned the DTU Learn Deadlines widget as a compact academic roadmap with clearer periods, deadline states, accessible details, and informative hover/focus explanations.
- Made the folded Deadlines header shorter and stable so its title and chevron stay aligned without jumping or clipping.
- Fixed bus-line settings so removing every saved route keeps the list empty, and unified the modal's structural backgrounds.
- Matched the Library modal backdrop to Settings with a transparent page blur instead of an extra dark wash.
- Reduced unnecessary deadline network requests while preserving manual refreshes, partial-cache recovery, and clear stale-data notices.
- Expanded and refined dark-mode coverage across DTU Learn, CampusNet, Study Planner, course pages, and evaluation pages.
- Hardened the public source and release boundary to exclude credentials, private data, development tooling, logs, and build artifacts.
