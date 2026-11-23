# DTU After Dark

The unofficial browser extension for making DTU's student-facing sites easier to use.

DTU After Dark adds a consistent dark theme plus workflow tools across DTU Learn, CampusNet, Study Planner, the course catalog, grades, course evaluations, and related DTU pages. PDF viewers and video players are intentionally left untouched.

## Install

Firefox Add-ons: https://addons.mozilla.org/en-US/firefox/addon/dtu-after-dark/

Chrome Web Store: https://chromewebstore.google.com/detail/dtu-after-dark/hemonfanogjedclfjhmkhjbkknackiel?authuser=0&hl=da

## Feature Overview

### Theme and controls

- Two-tone dark theme across supported DTU sites using `rgb(26,26,26)` and `rgb(45,45,45)`.
- Accent-color system with preset themes plus custom colors, applied across extension UI and key DTU navigation surfaces.
- Central settings modal for feature toggles, accent selection, and per-feature edit flows.
- `Paused URLs...` control for temporarily disabling the extension on specific pages without turning it off everywhere. Its dialog supports Tab, Shift+Tab, Enter to save, and Escape to return to Settings.

### DTU Learn

- Homepage widgets for live bus departures, upcoming DTU course/exam deadlines, and quick course search. The deadline widget shares Student Information's full-width homepage region above the course columns. It shows one row per teaching or exam period (for example Winter exam 2026, January 2027, Spring 2027) whose next deadline is within 60 days; the soonest period always shows. Under each period's name it says what happens next ("Withdrawal closes in 4 days", "Registration opens in 24 days"). The month scale starts at the current month and stops ten days after the last mark shown (at least three months, at most six). Registration, supplementary registration and withdrawal are drawn on that scale, each labelled in place with its name and dates; a mark whose label would collide drops to a second line. The period itself, as DTU's pages state it, is a thin grey bar under the marks with its dates. Every mark is drawn in the selected accent colour, adjusted to at least 4.5:1 against the widget so pale accents stay visible. Supplementary windows are outlined, a single date is a diamond, the open window is slightly thicker with its name in the accent, and a Today rule with the date runs through every row. Hovering or focusing a mark shows its deadline name, explanation, academic period and exact dates. Narrow layouts list each period's dates as text. "Add to calendar" in the widget footer downloads the course and exam deadlines of the next 12 months as an .ics file (a window becomes an opens day and a closes day; downloading again updates the same events). Optional in Settings (Exchange Deadline, a sub-setting under Deadlines Widget, off by default): an "Exchange" row with DTU's exchange application deadline from Beyond Borders; switching it on asks for access to beyondborders.dtu.dk. Beyond Borders lists one deadline at a time; when it is outside the timeline (after it has passed, say), a line under the timeline gives the next one Beyond Borders lists, or says it lists none.
- Bus and Letbane departures with multi-campus support (`DTU Lyngby`, `DTU Ballerup`, `DTU Risø`), per-line direction filters, caching, and automatic refresh.
- Library panel with live occupancy, crowding trends, upcoming events, news, and quick-access links.
- Course-card `Content` shortcut with optional custom destinations managed in a simple inline editor.
- Course download on Lessons pages: pick content sections, and also save announcements, assignments (instructions, your own or your group's submissions, feedback and score, and the teacher's pen notes written into a copy of your PDF), quizzes (finished attempts as DTU Learn's review page shows them; for a quiz not taken, its dates, limits and instructions) discussions (as DTU Learn shows them, with the posters' names and the files attached to posts) and grades (your grade items with points, grade and comments), all in one ZIP. Assignments also get the rubric the teacher marked them with: your level and the feedback for each criterion, with points only where the teacher shows them. A grey line under each of these five says what it saves. Each section shows its videos and their total size; videos are saved as separate downloads. A course with an empty content page still gets the panel for its course activity. Cancel also stops section preparation; switching the feature off or leaving the page prevents pending preparation from starting more requests.
- Textbook Links that detect textbook references on Learn pages and link out to relevant sources (shared with the kurser.dtu.dk literature linker).
- Smart Room Links that turn room mentions into click-to-resolve MazeMap links.

### CampusNet

- GPA toolkit on the Grades page: weighted GPA, projected GPA simulation, and ignore/restore controls for official grade rows. A grade that was not there on your last visit gets a small "New" mark on that visit only. Under the table, "Grade not on this page yet" lists each exam from your Study Planner exam schedule whose DTU grading deadline has passed without a grade for that term ("exam Thu, 10 Dec 2026, DTU's grading deadline Mon, 18 Jan 2027 (9 days ago)"); open the exam schedule once a semester so it knows your exams.
- Participant intelligence features (course composition and Retention on in a new install; shared course history opt-in): course composition (hover a study line to see who it counts, click it to filter the list), shared course history, and a visible Retention summary on CampusNet participant pages.
- Dark mode and accent cleanup across Grades, courses, groups, participant pages, and other student-facing CampusNet views. My courses and groups uses dark menu bodies with accent headings, matching Toolbox.

### Study Planner

- Accent-aware cleanup for the top bar, planning tables, and navigation elements.
- Exam schedule: an "Exam schedule" button in the planner's tab row opens a dialog that shows one exam period at a time, opening on the next one with exams: the current and next 13-week periods, the January and June/July/August 3-week periods with them, and a Later tab for planner periods DTU has not published dates for. Each period says how many exams it holds and between which days, names exams on the same day or on consecutive days, and draws a strip with one cell per day (filled for a planned exam, dashed for a basket course). Under it is one line per course: date, name, the workload rating from the course's latest evaluation (students compared the time they spent with what the ECTS points call for, 1 much less to 5 much more), and the format. Click a course to see where its date comes from (with DTU's grading deadline for that exam day) and to change its format and date (day, month and year lists; tick "Several days" for an exam that runs over more than one day). A date is suggested only when DTU's published exam table names the course or its exam slot matches exactly one row; a 3-week course is suggested the last day of its 3 weeks when its course page says so and DTU's table has a row for that month (July has none); oral exams note they may run over several days, special courses, bachelor projects and theses say the date is agreed with the teacher, and anything else is shown as not confirmed. Dates you set are stored in the extension; when DTU's table later changes a date you set from a suggestion, the row says so and asks which to keep. Courses in the planner's basket are listed under the period they can be taken in, with a note when their exam is on the same day as, or one day from, a planned exam. Courses you made in the planner (a thesis, an exchange semester) show by name for you to date. A line at the foot says to always check exam dates with DTU; "Why" opens the full notice (the dates come from DTU's exam dates page and course pages, are not the official schedule, and must be checked on DTU's exam page). "Add to calendar" opens one tick box per period (the period shown is ticked) and downloads the dated exams of the ticked periods as all-day events, made in the browser. Toggle: Settings, Study Tools, Exam Schedule.

### kurser.dtu.dk and course info

- Grades and student evaluation side by side on kurser.dtu.dk course pages. Grades open on the course's main exam, not a small re-exam sitting; buttons switch between the last four exams, the line under the chart says how many registered students sat the exam and how many did not show up, and an info note explains small sittings and exams that mix grades with pass/fail. New courses show a single "nothing yet" line.
- Student evaluation next to the grades: overall score, response rate, the five satisfaction questions, workload, and a link to the full evaluation. Failed requests show unavailable and wait 10 minutes before retrying; switching the feature off cancels retries.
- Textbook Links that parse course literature sections and add direct library and book-source links after DTU's own text, which stays as it is (same module and toggle as the Learn book finder). A title and its following ISBN share one set of links, with searches using the ISBN. The books of each course are checked once per course catalogue and shipped with the extension (`literature-data.json`); a new or changed course is read on the page.
- Exam date: an "Exam date" row under DTU's "Date of examination" gives the exam day for each period the page's catalogue year places the course in, read from DTU's exam table with the same rules as the Study Planner exam schedule (a date only when the table names the course or its exam slot matches exactly one day; otherwise it says why not). Each line shows the date and the period; an info button next to it shows, on hover or focus, where the date comes from and DTU's grading deadline for that exam day (from the same table, with how many days ago it passed once it has; coursework and special courses get none). Periods whose exams are over are left out. A line under it says to always double-check exam dates with DTU and links DTU's exam dates page. Toggle: Settings, Study Tools, Exam Schedule.
- Course map: a "Course map" row under Academic prerequisites shows a small, faded picture of the map with "Open course map" and how many courses the course lists and how many build on it; clicking it opens a map of the courses before and after the course, keeping DTU's "one of" groups. Earlier courses go up to 3 steps back and later courses 2 steps forward by default (both adjustable); the map opens in a fixed window in the middle of the screen, where you drag to move around, hovering a course highlights its links, clicking it slides the map to centre on it, and "Show N more" opens a long column in full. A listed course no longer in the catalogue shows its name and the last catalogue year that listed it (looked up back to 2002/2003; prerequisites only from 2016/2017 on). Such courses are hidden until you untick "Hide courses not in the current catalogue". When there is nothing to map, the row says so instead. The prerequisites of every other course come from a file shipped with the extension, read from kurser.dtu.dk once per semester; the open page's own prerequisites are read live.
- Smart room linking for recognizable building/room mentions on supported pages.

### Integrations and data sources

- Deadline parsing from `student.dtu.dk`, and DTU's exam table (`student.dtu.dk/en/exam/exam-dates`) plus kurser.dtu.dk course pages, course info pages and each course's latest evaluation on evaluering.dtu.dk (workload rating) for the Study Planner exam schedule.
- Exchange application deadline from DTU Beyond Borders (`beyondborders.dtu.dk`), only when Exchange Deadline is switched on in Settings; the browser asks for access to that site first.
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
