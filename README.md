# DTU After Dark

The unofficial browser extension for making DTU's student-facing sites easier to use.

DTU After Dark adds a consistent dark theme plus workflow tools across DTU Learn, CampusNet, Study Planner, the course catalog, grades, course evaluations, and related DTU pages. PDF viewers and video players are intentionally left untouched.

## Install

Firefox Add-ons: https://addons.mozilla.org/en-US/firefox/addon/dtu-dark-mode/

Chrome Web Store: https://chromewebstore.google.com/detail/dtu-after-dark/hemonfanogjedclfjhmkhjbkknackiel?authuser=0&hl=da

## Feature Overview

### Theme and controls

- Two-tone dark theme across supported DTU sites using `rgb(26,26,26)` and `rgb(45,45,45)`.
- Accent-color system with preset themes plus custom colors, applied across extension UI and key DTU navigation surfaces.
- Central settings modal for feature toggles, accent selection, and per-feature edit flows.
- `Paused URLs...` control for temporarily disabling the extension on specific pages without turning it off everywhere. Its dialog supports Tab, Shift+Tab, Enter to save, and Escape to return to Settings.

### DTU Learn

- Homepage widgets for live bus departures, upcoming DTU course/exam deadlines, and quick course search. The deadline widget shares Student Information's full-width homepage region above the course columns. It shows six months from the start of the current one, with one row per teaching or exam period (for example Fall 2026, Winter exam 2026, January 2027, Spring 2027). Each row shades when that period runs, as DTU's pages state it, and places its registration, supplementary registration and withdrawal dates on a shared month scale, labelled in place. Every mark is drawn in the selected accent colour, adjusted to at least 4.5:1 against the widget so pale accents stay visible. Supplementary windows are outlined, the open window is slightly thicker with a bold label, and a Today rule runs through every row. The right column says what happens next ("Closes tomorrow", "Opens in 15 days"). Hovering or focusing a mark shows its deadline name, explanation, academic period and exact dates. Narrow layouts list each period's dates as text.
- Bus departures with multi-campus support (`DTU Lyngby`, `DTU Ballerup`, `DTU Risø`), per-line direction filters, caching, and automatic refresh.
- Library panel with live occupancy, crowding trends, upcoming events, news, and quick-access links.
- Course-card `Content` shortcut with optional custom destinations managed in a simple inline editor.
- Course content download tools for Lessons pages, including section picking and optional single-ZIP bundling. Cancel also stops section preparation; switching the feature off or leaving the page prevents pending preparation from starting more requests.
- Textbook Links that detect textbook references on Learn pages and link out to relevant sources (shared with the kurser.dtu.dk literature linker).
- Smart Room Links that turn room mentions into click-to-resolve MazeMap links.

### CampusNet

- GPA toolkit on the Grades page: weighted GPA, projected GPA simulation, and ignore/restore controls for official grade rows.
- Participant intelligence features (opt-in): course composition, shared course history, and a visible Retention Radar summary on CampusNet participant pages.
- Dark mode and accent cleanup across Grades, courses, groups, participant pages, and other student-facing CampusNet views. My courses and groups uses dark menu bodies with accent headings, matching Toolbox.

### Study Planner

- Accent-aware cleanup for the top bar, planning tables, and navigation elements.

### kurser.dtu.dk and course info

- Grades and student evaluation side by side on kurser.dtu.dk course pages. Grades open on the course's main exam, not a small re-exam sitting; buttons switch between the last four exams, and an info note explains small sittings and exams that mix grades with pass/fail. New courses show a single "nothing yet" line.
- Student evaluation next to the grades: overall score, response rate, the five satisfaction questions, workload, and a link to the full evaluation. Failed requests show unavailable and wait 10 minutes before retrying; switching the feature off cancels retries.
- Textbook Links that parse course literature sections and add direct library and book-source links (same module and toggle as the Learn book finder). A title and its following ISBN share one set of links, with searches using the ISBN.
- Smart room linking for recognizable building/room mentions on supported pages.

### Integrations and data sources

- Deadline and exam-calendar parsing from `student.dtu.dk` and DTU exam pages.
- Library occupancy, events, and news from DTU Library and FindIt.
- MazeMap room/building resolution for smart room links.
- Rejseplanen live departure data for the bus widget.
- Local caching throughout the extension to avoid refetching on every page load.

## Supported Sites

Directly enhanced in the browser:

- `learn.inside.dtu.dk`
- `campusnet.dtu.dk`
- `studieplan.dtu.dk`
- `kurser.dtu.dk`
- `karakterer.dtu.dk`
- `evaluering.dtu.dk`
- `eksamensplan.dtu.dk`
- `sts.ait.dtu.dk`
- `sites.dtu.dk`

Used as data sources and integrations:

- `student.dtu.dk`
- `findit.dtu.dk`
- `www.bibliotek.dtu.dk`
- `api.mazemap.com`
- `www.rejseplanen.dk`
- `www.dtu.dk`

## Privacy and storage

- Preferences, caches, and feature state are stored locally in extension storage.
- If Participant Intelligence is enabled, participant metadata used by those features is stored locally on the device.
- Public releases do not send heartbeat or usage telemetry.
- Live features fetch data from DTU services and selected transport/map providers. See `docs/PRIVACY.md` for details.

## Disclaimer

DTU After Dark is unofficial and is not affiliated with, endorsed by, or supported by DTU, D2L/Brightspace, Rejseplanen, MazeMap, or any other provider.

Information shown by the extension, including exam dates, deadlines, grades, library data, and bus departures, may be inaccurate, incomplete, or outdated. Always verify critical information through official DTU channels.

## Build

Run the focused GPA regression suite with `node --test tests/campusnet-gpa.test.mjs`.
Run the focused deadlines regression suite with `node --test tests/deadlines.test.mjs`.

Build both browser packages with `node scripts/build.mjs`.

To build only one target, run `node scripts/build.mjs firefox` or `node scripts/build.mjs chrome`.
The existing PowerShell builders remain available on Windows:

1. Firefox: `powershell -ExecutionPolicy Bypass -File .\scripts\build-firefox.ps1`
2. Chrome: `powershell -ExecutionPolicy Bypass -File .\scripts\build-chrome.ps1`

Build artifacts are written to `dist/`.
Public source builds work as-is with the tracked safe `config.js`.
For local-only overrides, create an untracked `config.local.js`; the build scripts will overlay it into the packaged `config.js` and add the extra local host permission only to those private build artifacts.
The public branch now uses a whitelist `.gitignore`, so local-only files such as `data/`, `dist/`, `infra/`, assistant notes, private changelogs, and scratch artifacts stay out of GitHub by default.
Before committing or publishing, run `node scripts/audit-public-boundary.mjs`; it fails if a known local-only path is already tracked, which `.gitignore` cannot prevent by itself.
Optional local datasets can still be kept beside the repo for private experiments, but they are intentionally not part of the public source/build surface.
Shared library occupancy/crowding now requires a configured `LIVE_LIBRARY_TRENDS_URL`. Without that local/private override, the library panel still shows links, news, and events, but not live crowding.
For release builds that must include live library crowding, set `DTU_AFTER_DARK_REQUIRE_LIBRARY_TRENDS=1` before running the build scripts. The build will then fail if the packaged `config.js` does not contain `LIVE_LIBRARY_TRENDS_URL`; otherwise it prints the included endpoint host.
A local release override can append values to the safe defaults, for example `globalThis.CONFIG = Object.assign(globalThis.CONFIG || {}, { LIVE_LIBRARY_TRENDS_URL: 'https://your-worker.example/v1/library/trends', LIVE_TRANSIT_API_BASE: 'https://your-worker.example' });`.

## Notes

Future ideas are tracked in `docs/IDEAS.md`.
Codebase/runtime orientation for maintainers and AI agents lives in `docs/CODEBASE.md`.
Current Firefox and Chrome store copy lives in `docs/STORE_LISTING.md`.
If you keep private repo-local handoff notes for local agent workflows, keep them untracked and make sure `docs/CODEBASE.md` stays sufficient for the public repo on its own.

## License

MIT
