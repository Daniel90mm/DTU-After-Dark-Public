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

## Version 8.0.0 release notes

- Redesigned the DTU Learn Deadlines widget as a compact academic roadmap with clearer periods, deadline states, accessible details, and informative hover/focus explanations.
- Made the folded Deadlines header shorter and stable so its title and chevron stay aligned without jumping or clipping.
- Fixed bus-line settings so removing every saved route keeps the list empty, and unified the modal's structural backgrounds.
- Matched the Library modal backdrop to Settings with a transparent page blur instead of an extra dark wash.
- Reduced unnecessary deadline network requests while preserving manual refreshes, partial-cache recovery, and clear stale-data notices.
- Expanded and refined dark-mode coverage across DTU Learn, CampusNet, Study Planner, course pages, and evaluation pages.
- Hardened the public source and release boundary to exclude credentials, private data, development tooling, logs, and build artifacts.
