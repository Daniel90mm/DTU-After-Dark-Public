# Privacy Policy - DTU After Dark

**Last updated:** July 16, 2026

## Security and Privacy Audit (March 26, 2026)

A static audit of `manifest.json`, `manifest_chrome.json`, `background.js`, `darkmode.js`, and the public build scripts was completed on March 26, 2026.

### Summary

- No analytics, heartbeat telemetry, ad SDKs, or tracker integrations were found in the public release.
- No remote code loading, `eval`, or `new Function` execution was found.
- Background cross-origin fetches are behind runtime message handlers with sender allowlisting and per-feature input checks.
- Participant Intelligence data is stored locally only (not sent to third-party services).
- Public source builds now ship with a tracked safe `config.js`; optional private overrides stay local-only.

### Findings

1. **Medium - Transit integration depends on provider-side rate controls**
   - The current client-side transit integration can be affected by shared provider rate limits in peak usage periods.
   - Impact: temporary degradation/pauses of live bus updates for users.
   - Recommendation: continue hardening architecture (for example stronger server-side mediation and provider-side restrictions).

2. **Low - Participant Intelligence retention is open-ended**
   - Participant metadata can persist until browser/extension data is cleared.
   - Impact: higher privacy risk on shared devices/profiles.
   - Recommendation: add a visible "clear participant data" action and optional retention window.

3. **Low - Optional private live-data overrides are local-only**
   - Public builds include safe defaults, while any private live-data endpoints must be added locally through an untracked override file.
   - Impact: public source builds may show reduced live bus/library enrichment until a private local override is supplied.
   - Recommendation: keep private overrides untracked and document the split clearly for local maintainers.

## Data Collection

DTU After Dark does **not** sell personal data and does **not** send personal data to advertising, analytics, or telemetry vendors.

The public extension operates locally in your browser and stores settings/caches needed for features. It does not send heartbeat or usage telemetry. A new install starts with Participant Intelligence, Course Composition and Retention on: Course Composition reads the participant page you open without storing names, and Retention stores only each course's participant count. Shared Course History, the part that stores participant names, s-numbers and shared courses, is off by default; if you enable it in Settings, that metadata is stored locally for overlap and history features. Nothing is collected while it is off. Updating the extension does not change settings you already have. Pending reads re-check the setting before collecting participant metadata or drawing panels. Switching Participant Intelligence or Shared Course History off stops archive scans; an already requested response is discarded. Pending archive-widget reads and scanner controls re-check both settings before writing course history.

## What Is Stored Locally

### Extension storage (`browser.storage.local` / `chrome.storage.local`)

- Theme and feature preferences (dark mode mirror, accent theme, toggle states).
- Study Planner exam schedule entries you save (course code, format, dates, and the DTU date they were based on), under `dtuAfterDarkExamScheduleV1`. They stay until you reset them.
- Feature caches (expired entries are deleted when the browser starts; if storage is full, all caches are cleared):
  - Grade stats cache (24h)
  - Course evaluation cache (24h)
  - Course workload rating cache for the Study Planner exam schedule (7 days): the average and number of answers to the workload question of a course's latest public evaluation
  - FindIt availability cache (7d)
  - Library events/news cache (6h)
  - Shared library crowding cache (1m) when a shared library trends endpoint is configured
- Participant Intelligence dataset (if enabled), including:
  - Participant names, s-numbers, program labels
  - Course overlap/history metadata
  - Enrollment snapshots for retention charts
  - Size caps in code: max 5000 student records and max 20 retention snapshots per course

### Site `localStorage` (origin-scoped)

- Dark mode preference (`localStorage`) plus extension storage. Older `.dtu.dk` dark-mode cookies are cleared best-effort by current builds.
- Bus widget preferences and quota counters.
- Course map depth (how many steps back and forward) on `kurser.dtu.dk`.
- Deadlines widget cache/state.
- GPA simulator entries and some UI state flags.
- Lessons Download course: announcements, assignments (with their rubric assessment), quizzes, discussions (with the files attached to posts) and your grades are read with your DTU Learn session only when you press Download, and go straight into the ZIP on your device; nothing is kept in storage or sent anywhere. Discussions are saved as DTU Learn shows them to you, with the names of the people who posted. To mark staff posts it reads the course class list (roles only); to find your group's submissions it reads the course's group list. Both stay in memory for that run. Videos: when you open the panel it reads each video's size (one small request per video; for videos hosted by Brightspace it asks DTU Learn for a session token, as DTU Learn's own player does, and asks Brightspace's content service, api.eu-west-1.content-service.brightspace.com). Pressing Download starts each video as its own browser download, not inside the ZIP; a video the teacher has not allowed to be downloaded is skipped. Nothing is stored.
- Study Planner exam schedule: your planned exams with DTU's grading deadline (course code, name, exam day, deadline) in extension storage, so CampusNet Grades can say which grades are not out after the deadline. Kept until 200 days after the deadline; never sent anywhere.
- CampusNet Grades: the grade rows seen on your last visit (course code, grade, ECTS), so a new grade gets a "New" mark once. Kept in your browser only.

Note: origin-scoped `localStorage` keys can be readable by scripts running on that same site origin.

## Network Access and Third-Party Services

### Automatic requests made by extension features

- `https://www.rejseplanen.dk/*` for live bus departures.
  - Sends stop IDs and routing parameters required for departure lookups.
- `https://api.mazemap.com/*` for Smart Room Links resolution.
  - Sends building/room query text and DTU campus ID.
- DTU domain data sources for feature enrichment:
  - `https://karakterer.dtu.dk/*`
  - `https://findit.dtu.dk/*`
  - `https://evaluering.dtu.dk/*`
  - `https://student.dtu.dk/*`
  - `https://kurser.dtu.dk/*`
  - `https://www.dtu.dk/*`
  - `https://www.bibliotek.dtu.dk/*`

Grade Statistics uses anonymous public DTU requests. A failed request is not cached as an empty course; while its course page remains open, the extension waits 10 minutes before retrying. Switching the feature off cancels that retry.

The Study Planner exam schedule reads DTU's public exam table (`student.dtu.dk/en/exam/exam-dates`, no cookies, cached 12 h) and the kurser.dtu.dk page of each course in the periods being shown (with your browser's DTU cookies, cached 24 h) when you open the panel. The courses in your planner basket are read from the page itself, and their kurser.dtu.dk pages are fetched the same way. Only course codes are sent; failed reads, and an exam dates page without the exam table, are not cached. "Add to calendar (.ics)" builds the calendar file in your browser and saves it as a download; nothing is uploaded. kurser.dtu.dk course pages read the same exam table (same 12 h cache) for their Exam date row; the course's own exam fields are read from the open page, so no course page is fetched. The Grades widget reads a file shipped inside the extension (DTU's published exam totals per course) to ask karakterer.dtu.dk only for exam terms the course had.

Course Evaluation waits 10 minutes after repeated fetch failures while its course page remains open. Switching the feature off cancels pending retries and discards late responses before rendering or starting another lookup.

Public builds do not contact any usage or heartbeat endpoint. Optional private live-data overrides are not part of the tracked public release.

### User-initiated external links

Some features render optional outbound links (opened only when you click), including:

- `books.google.com`
- `polyteknisk.dk`
- `supersaas.com`
- `databarprint.dtu.dk`
- `panopto.dtu.dk`
- `use.mazemap.com`

## Permissions

### Manifest permissions

- `storage`

### Host permissions

- `https://api.mazemap.com/*`
- `https://www.rejseplanen.dk/*`
- `https://karakterer.dtu.dk/*`
- `https://findit.dtu.dk/*`
- `https://evaluering.dtu.dk/*`
- `https://student.dtu.dk/*`
- `https://eksamensplan.dtu.dk/*`
- `https://sts.ait.dtu.dk/*`
- `https://www.dtu.dk/*`
- `https://www.bibliotek.dtu.dk/*`

Optional, asked for only when you switch on Exchange Deadline in Settings:

- `https://beyondborders.dtu.dk/*`: reads DTU's public list of partner universities at most once a day to find the exchange application deadline. The request carries no cookies and nothing about you.

### Content script injection hosts

- `learn.inside.dtu.dk`
- `s.brightspace.com`
- `sts.ait.dtu.dk`
- `studieplan.dtu.dk`
- `kurser.dtu.dk`
- `evaluering.dtu.dk`
- `campusnet.dtu.dk`
- `karakterer.dtu.dk`
- `sites.dtu.dk`
- `eksamensplan.dtu.dk`

## Security Controls

- Background message handlers allowlist sender hosts before handling requests.
- Sensitive URL features validate host/path before fetching (for example FindIt and course-evaluation fetch paths).
- The extension uses local code only; no remote script execution model is implemented.

## Data Deletion

You can remove stored data by clearing extension storage and site storage in your browser profile.

- Remove extension data: browser extension settings for DTU After Dark.
- Remove site `localStorage`/cookies: clear data for relevant DTU domains.

## Disclaimer

**DTU After Dark is an unofficial, community-built extension. It is not affiliated with, endorsed by, or supported by DTU, Arcanic, D2L/Brightspace, Rejseplanen, MazeMap, or any other service provider.**

Information shown by the extension (exam dates, deadlines, grades, GPA calculations, bus times, course evaluations, and library data) can be inaccurate, incomplete, or outdated. Always verify critical information through official DTU channels.

## Contact

The Settings feedback link opens a draft in your own mail program. The draft lists the page address (without its query or fragment), the extension version, your browser and version, your theme and accent, and which features are switched off. Nothing is sent until you send the mail, and you can delete any line first.

The Deadlines widget's "Add to calendar" builds its calendar file in your browser and saves it as a download; nothing is uploaded.

For privacy/security questions, open an issue on the GitHub repository or contact: `Daniel-yttesen@hotmail.com`.
