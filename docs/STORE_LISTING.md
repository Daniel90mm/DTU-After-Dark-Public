# Browser Store Listing

Use this copy for both Firefox Add-ons and the Chrome Web Store so the public listing stays aligned with the shipped extension.

## Name

DTU After Dark

## Short description

Dark mode and practical student tools for DTU Learn, CampusNet, Study Planner, and related DTU services.

## Summary (Firefox Add-ons, 250 characters at most)

Dark mode and student tools for DTU Learn, CampusNet, Study Planner and kurser.dtu.dk: deadlines, bus times, library occupancy, exam schedule, grade statistics, course evaluations, a course map and GPA tools.

## Full description

DTU After Dark is an unofficial browser extension that gives DTU's student sites one consistent dark theme and adds tools students use every week.

What it adds:

- Dark mode on DTU Learn, CampusNet, Study Planner, kurser.dtu.dk, grades and course evaluations. Choose Light, Dark or Auto (follows your device), with DTU colour accents or your own colour.
- DTU Learn homepage: a deadlines timeline for course and exam registration and withdrawal (add them to your calendar), live bus and Letbane departures from Rejseplanen, and a Library panel with live occupancy, today's visitors against a usual day, events and news.
- Study Planner: an exam schedule for each exam period from DTU's exam table, with the student workload rating of each course and "Add to calendar".
- kurser.dtu.dk course pages: grade statistics for the last four exams, the latest course evaluation, the exam date, a map of the courses before and after a course, and textbook links to DTU FindIt.
- CampusNet: weighted GPA with planned grades, and course composition and Retention on participant lists.
- DTU Learn Lessons: download a course as a ZIP: its content and videos, and if you choose, announcements, assignments with feedback, quizzes and discussions.
- Room links: room names on DTU pages open the room in MazeMap.
- Every feature can be switched off in Settings, and any page can be paused.

Privacy:

- Preferences, caches, and feature state are stored locally in the browser.
- Course composition and Retention are on in a new install; they store no names, only each course's participant count. Shared course history, which stores participant names locally, is off until you turn it on.
- DTU After Dark does not include advertising, analytics, heartbeat telemetry, or remote code.
- Live features contact the DTU and third-party services documented in the public privacy policy.

Write to daniel-yttesen@hotmail.com with bugs, ideas or questions.

DTU After Dark is unofficial and is not affiliated with or endorsed by DTU or any service provider. Information shown by the extension may be delayed, incomplete, or inaccurate; always verify critical information through official DTU channels.

## Screenshots

1280x800, dark mode, taken with `.dtu-dev/shot-store.mjs` (local-only; it hides the signed-in name). Chrome takes the first five.

1. Deadlines timeline and live bus departures on the DTU Learn homepage.
2. Exam schedule in the Study Planner, with workload ratings from course evaluations.
3. Grade statistics and the latest course evaluation on a kurser.dtu.dk course page.
4. Course map: the courses that lead to a course and the courses it leads to.
5. Library panel: live occupancy, today against a usual day, and events.
6. Settings: Light, Dark or Auto, accent colours, and one switch per feature.

## Version 9.2.0 release notes

- Download course: the Lessons download now saves a whole course. Under the content sections, "Also save" adds Announcements (with attachments), Assignments (your submissions and the teacher's feedback, including pen marks written into your PDFs and the rubric), finished Quizzes, Discussions (with attached files) and Grades, each as a page that opens without DTU Learn; an "i" next to each says what it saves. Each section shows its videos and their size, and videos are saved as separate downloads.
- Deadlines: "Add to calendar" downloads the next 12 months of course and exam deadlines as calendar events. An optional Exchange Deadline row (Settings, off by default) shows the exchange application deadline from DTU Beyond Borders, and once it has passed, says when the next one is or that none is listed yet. When a DTU page fails, the widget keeps the last good copy and says how old it is.
- CampusNet Grades: "Grade not on this page yet" lists each planned exam whose grading deadline has passed with no grade showing, and a new grade is marked "New".
- kurser.dtu.dk: the Exam date row shows the date and period, with the exam table slot and DTU's grading deadline behind a small info button. Courses agreed with the teacher say so. The Grades widget now says how many registered students sat the exam, and the book bar uses a shipped list of each course's books for cleaner titles and authors.
- Study Planner: the exam schedule gives each exam DTU's grading deadline. The Register/Withdraw dialog no longer covers the page in grey, and DTU's loading spinner is visible in dark mode.
- Slow widgets show grey placeholder bars shaped like their content while they load.
- Paused pages: a pause rule saved on one DTU site now works on every DTU site.
- Dark mode reaches DTU Learn components as soon as they appear, without retries, and the older DTU Learn tools (Announcements, Classlist, Assignments) get dark dropdowns and tooltips.
- Dates follow Danish time on every widget, so a computer set to another time zone no longer sees deadlines a day off around midnight.
- A DTU server that does not answer now ends in an error message after 20 seconds (60 for library news and events) instead of loading forever.
- Fixes: the Library panel is fully opaque in Firefox, DTU's evaluation reminder is no longer drawn under the deadlines timeline, course codes with letters count on CampusNet, old cached pages are cleared so storage cannot fill up, a red DTU header can no longer freeze the tab, and clicking a study line in Course composition shows every student in it.

## Version 9.1.0 release notes

- New exam schedule in the Study Planner: an "Exam schedule" tab shows one exam period at a time with a day strip and one line per course: date, format and the workload rating from the course's latest evaluation. Dates come from DTU's published exam table; you can change a date or format, and courses in your basket show under the period they fit. "Add to calendar" downloads the exams as calendar events.
- Course pages on kurser.dtu.dk get an "Exam date" row with the exam day from DTU's exam table for each period the course runs in.
- New Course map on kurser.dtu.dk: a "Show map" button under Academic prerequisites opens a map of the courses that lead to a course and the courses it leads to, including older courses no longer in the catalogue.
- Redesigned Deadlines widget: each period's dates are printed on its marks, the next step sits under the period name, and only periods with a deadline in the next 60 days show.
- Dark Mode is one choice in Settings: Light, Dark or Auto. Auto follows your device's light or dark setting on every DTU site.
- The Library panel's visitor chart shows today as a filled line against a usual day, with the live count marked "now" and DTU Library events labelled above the hours they run. A reading older than two hours shows as unavailable instead of as the current count.
- On CampusNet participant lists, hover a study line in Course composition to see who it counts, and click it to show only those students. Course composition and Retention are on in a new install; Shared course history stays off until you turn it on.
- The Bus widget includes the Letbane (line L), no longer lists the discontinued 300S, and shows Copenhagen times across the clock change.
- Accent colours repaint the Study Planner, CampusNet and kurser.dtu.dk at once.
- Settings switches have names for screen readers, the bus setup is a proper dialog, and the device's reduce-motion setting stops the extension's animations.
- Safer links: deadline, library feed and Content shortcut links only open the DTU or https addresses they should.
- Course content download never saves a sign-in page as a file and names files that failed.
- When saved settings or a DTU page cannot be read (GPA, planned grades, bus settings, grade statistics), the widget says so instead of showing a wrong result.
- Search Courses on the DTU Learn homepage is off until you turn it on in Settings.

## Version 9.0.0 release notes

- Redesigned the Deadlines widget on the DTU Learn homepage. It now shows one row per semester and exam period, with registration and withdrawal dates labelled on the chart, drawn in your accent colour, and "Closes tomorrow" or "Opens in 15 days" beside each row. DTU's deadline pages are checked once a day, so the refresh button is gone.
- Redesigned the Bus Departures widget: one row per line with its next bus, minutes that count down, "delayed 3 min" for late buses, and a layout that fits narrow windows. Reaching Rejseplanen's monthly limit no longer switches the widget off, and a slow connection no longer makes it flip between "Loading" and "No upcoming buses". Line badges now use Movia's own colours: blue for S-buses and green for E-buses.
- Room links now work in DTU Learn announcements and open the exact auditorium in MazeMap.
- Closing the Library panel no longer leaves the page unable to scroll.
- Fixed a DTU site occasionally staying light while Dark Mode was on.
- Textbook links now also appear on Danish course pages.
- Accent colours stay readable on every preset, including light ones like DTU Yellow and DTU Grey. The custom colour picker previews live and saves once.
- On CampusNet participant lists, students with both a bachelor and a master count under the master, groups inside a course keep their own Retention Radar count, and the full list loads in Firefox.
- Every setting was audited: switching a feature off now takes effect cleanly even while it is loading, and many features stopped rewriting the page while idle, so keyboard focus stays put. Textbook links show one set of links per book, and Course Evaluation and Grade Statistics retry after a failed load instead of reporting no data.
- The CampusNet "My courses and groups" menu matches Toolbox in dark mode.
- On CampusNet Grades in dark mode, the table sits on the page background instead of a grey block, and course numbers are shown as links to their grade distribution again.
- The grade table's columns stay put when you hide a grade or add a planned one, and "Add planned grade" is now a small button beside "Only show passed courses".

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
