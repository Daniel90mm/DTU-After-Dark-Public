// Constant stylesheet text for darkmode.dark-engine.js. The engine reads this
// namespace once at load and injects the strings unchanged.
(() => {
    const DARK_BG = '#2d2d2d';
    const DARK_TEXT = '#e0e0e0';
    const DARK_BORDER = '#404040';

    const shadowDOMStyles = `
        :host {
            --d2l-popover-default-background-color: ${DARK_BG} !important;
            --d2l-popover-background-color: ${DARK_BG} !important;
            --d2l-popover-default-foreground-color: ${DARK_TEXT} !important;
            --d2l-popover-foreground-color: ${DARK_TEXT} !important;
            --d2l-popover-default-border-color: ${DARK_BORDER} !important;
            --d2l-popover-border-color: ${DARK_BORDER} !important;
        }
        * { color: ${DARK_TEXT} !important; }
        .dropdown-header,
        .dropdown-header.dropdown-no-header {
            background: ${DARK_BG} !important;
            background-color: ${DARK_BG} !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }
        .d2l-labs-navigation-notification-icon-indicator {
            background-color: var(--dtu-ad-accent) !important;
            background: var(--dtu-ad-accent) !important;
            background-image: none !important;
        }
        .d2l-w2d-count,
        .d2l-w2d-heading-3-count {
            background-color: var(--dtu-ad-accent) !important;
            background: var(--dtu-ad-accent) !important;
            color: var(--dtu-ad-accent-on) !important;
            border-color: var(--dtu-ad-accent) !important;
        }
        .d2l-count-badge-number {
            background-color: var(--dtu-ad-accent-deep) !important;
            background: var(--dtu-ad-accent-deep) !important;
            color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
            border-color: #ffffff !important;
        }
        .d2l-count-badge-number > div {
            background: transparent !important;
            background-color: transparent !important;
            color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
        }
        .uw-text {
            color: var(--dtu-ad-accent-soft) !important;
        }
        .d2l-navigation-s-main-wrapper,
        .d2l-navigation-s-main-wrapper *,
        .d2l-navigation-s-main-wrapper a,
        .d2l-navigation-s-main-wrapper a:link,
        .d2l-navigation-s-main-wrapper a:visited,
        .d2l-navigation-s-main-wrapper a:hover,
        .d2l-navigation-s-main-wrapper a:active,
        .d2l-navigation-s-link,
        .d2l-navigation-s-link:link,
        .d2l-navigation-s-link:visited,
        .d2l-navigation-s-link:hover,
        .d2l-navigation-s-link:active,
        .d2l-navigation-s-mobile-menu,
        .d2l-navigation-s-mobile-menu * {
            background: #1a1a1a !important;
            background-color: #1a1a1a !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }
        .d2l-widget,
        .d2l-widget-content,
        .d2l-widget-content-padding,
        .d2l-box,
        .d2l-box-layout,
        .d2l-tile,
        .d2l-typography,
        .d2l-page-main,
        .d2l-page-main *:not(img):not(svg):not(canvas):not(video),
        .d2l-page-collapsepane-content,
        .d2l-page-collapsepane-content-inner,
        .d2l-page-collapsepane-content-padding,
        .d2l-personal-tools-list,
        .d2l-datalist,
        .d2l-datalist-container,
        li.d2l-datalist-item,
        .d2l-widget-header,
        .d2l-widget-header *,
        .d2l-collapsepane-header,
        .d2l-collapsepane-content {
            background: ${DARK_BG} !important;
            background-color: ${DARK_BG} !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }
        .d2l-collapsible-panel-header,
        .d2l-collapsible-panel.scrolled .d2l-collapsible-panel-header,
        .d2l-collapsible-panel-before,
        .d2l-collapsible-panel-header-primary,
        .d2l-collapsible-panel-header-secondary {
            background-color: #2d2d2d !important;
            background: #2d2d2d !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }
        .d2l-collapsible-panel-title,
        .d2l-collapsible-panel-opener,
        .d2l-collapsible-panel-opener:hover,
        .d2l-collapsible-panel-opener:focus,
        .d2l-collapsible-panel-opener:focus-visible,
        .d2l-collapsible-panel-header d2l-icon-custom,
        .d2l-collapsible-panel-header svg,
        .d2l-collapsible-panel-header path {
            background-color: transparent !important;
            background: transparent !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
        }
        button[aria-haspopup="true"][aria-label^="Actions for"],
        button[aria-haspopup="true"][aria-label^="Actions for"]:hover,
        button[aria-haspopup="true"][aria-label^="Actions for"]:focus,
        button[aria-haspopup="true"][aria-label^="Actions for"]:focus-visible,
        button[aria-label^="Actions for"],
        button[aria-label^="Actions for"]:hover,
        button[aria-label^="Actions for"]:focus,
        button[aria-label^="Actions for"]:focus-visible,
        .d2l-tabs-scroll-next-container,
        .d2l-tabs-scroll-previous-container,
        .d2l-tabs-scroll-button,
        .d2l-tabs-scroll-button:hover,
        .d2l-tabs-scroll-button:focus,
        .d2l-tabs-scroll-button:focus-visible {
            background: ${DARK_BG} !important;
            background-color: ${DARK_BG} !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
            box-shadow: none !important;
        }
        button[aria-haspopup="true"][aria-label^="Actions for"] d2l-icon,
        button[aria-haspopup="true"][aria-label^="Actions for"] d2l-icon *,
        button[aria-label^="Actions for"] d2l-icon,
        button[aria-label^="Actions for"] d2l-icon *,
        .property-icon,
        .property-icon *,
        .d2l-tabs-scroll-button d2l-icon,
        .d2l-tabs-scroll-button d2l-icon * {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
            fill: currentColor !important;
            stroke: currentColor !important;
        }
    `;

    // Keep the shared button/icon baseline for every d2l-button-icon. The
    // targeted Lessons overrides below must not replace it for unrelated
    // controls such as Content Browser's Actions chevron.
    const buttonIconShadowStyles = shadowDOMStyles + `
        button {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
            border-color: transparent !important;
            box-shadow: none !important;
        }
        button:hover:not([disabled]),
        button:focus:not([disabled]),
        button:focus-visible:not([disabled]),
        button:active:not([disabled]),
        :host([active]) button:not([disabled]) {
            background: #3d3d3d !important;
            background-color: #3d3d3d !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
        }
        button:focus-visible:not([disabled]) {
            outline: 2px solid var(--dtu-ad-accent-soft, #99ccff) !important;
            outline-offset: 2px !important;
        }
        button:disabled,
        button[aria-disabled="true"] {
            background: transparent !important;
            background-color: transparent !important;
            opacity: 0.55 !important;
        }
        :host([slot="pressed"]) button {
            background: var(--dtu-ad-accent) !important;
            background-color: var(--dtu-ad-accent) !important;
            background-image: none !important;
            color: var(--dtu-ad-accent-on) !important;
        }
        :host([slot="pressed"]) button:hover:not([disabled]),
        :host([slot="pressed"]) button:focus:not([disabled]),
        :host([slot="pressed"]) button:focus-visible:not([disabled]),
        :host([slot="pressed"]) button:active:not([disabled]),
        :host([slot="pressed"][active]) button:not([disabled]) {
            background: var(--dtu-ad-accent-hover) !important;
            background-color: var(--dtu-ad-accent-hover) !important;
            background-image: none !important;
            color: var(--dtu-ad-accent-on) !important;
        }
        :host([slot="pressed"]) d2l-icon,
        :host([slot="pressed"]) slot[name="icon"]::slotted(d2l-icon-custom) {
            color: var(--dtu-ad-accent-on) !important;
            fill: currentColor !important;
            stroke: currentColor !important;
        }
        :host([icon="tier1:search"]),
        :host([icon="tier1:arrow-collapse-small"]),
        :host([icon="tier1:arrow-expand-small"]) {
            color: ${DARK_TEXT} !important;
        }
        :host([icon="tier1:search"]) button,
        :host([icon="tier1:arrow-collapse-small"]) button,
        :host([icon="tier1:arrow-expand-small"]) button {
            background-color: transparent !important;
            color: ${DARK_TEXT} !important;
        }
        :host([icon="tier1:search"]) button:hover,
        :host([icon="tier1:search"]) button:focus,
        :host([icon="tier1:search"]) button:focus-visible,
        :host([icon="tier1:search"]) button:active,
        :host([icon="tier1:arrow-collapse-small"]) button:hover,
        :host([icon="tier1:arrow-collapse-small"]) button:focus,
        :host([icon="tier1:arrow-collapse-small"]) button:focus-visible,
        :host([icon="tier1:arrow-collapse-small"]) button:active,
        :host([icon="tier1:arrow-expand-small"]) button:hover,
        :host([icon="tier1:arrow-expand-small"]) button:focus,
        :host([icon="tier1:arrow-expand-small"]) button:focus-visible,
        :host([icon="tier1:arrow-expand-small"]) button:active {
            background-color: #3d3d3d !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
        }
    `;

    const iframeStyles = `
        body,
        html,
        #app,
        #app > *,
        .d2l-typography,
        .d2l-typography > * {
            background-color: #1a1a1a !important;
            color: ${DARK_TEXT} !important;
        }
        .box-section.bg-white.rounded,
        .panel-section .box-section {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }
        .navigation-container,
        .navigation-menu,
        .navigation-search,
        .navigation-tree,
        .navigation-tree > div,
        .navigation-item,
        .navigation-item > div,
        .navigation-item div,
        .unit,
        .unit-box,
        [role="treeitem"],
        d2l-lessons-toc {
            background-color: #1a1a1a !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }
        /* darkmode.css paints these wrappers dark 2, and which of the two style
           elements lands later in the Lessons frame varies per load. Out-rank
           it so the TOC panel is dark 1 every time. */
        html body .navigation-container,
        html body .navigation-menu,
        html body .navigation-search {
            background-color: #1a1a1a !important;
        }
        d2l-list,
        d2l-list-item,
        d2l-list-item-nav {
            background-color: #2d2d2d !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }
        d2l-list-item-nav[current] {
            background-color: #2d2d2d !important;
        }
        ::-webkit-scrollbar-track,
        ::-webkit-scrollbar {
            background: #1a1a1a !important;
        }
        .co-content,
        .title-container,
        .title,
        .title-text,
        .text-wrapper,
        .date-container,
        .due-date-container {
            background-color: transparent !important;
            color: ${DARK_TEXT} !important;
        }
        .unit-box .fadeout,
        .fadeout {
            background: transparent !important;
            display: none !important;
        }
        a {
            color: #66b3ff !important;
        }
        h1, h2, h3, h4, h5, h6,
        .d2l-heading-1,
        .d2l-heading-2,
        .d2l-heading-3,
        .module-header,
        h1.module-header,
        h1.d2l-heading-1 {
            color: #ffffff !important;
        }
        p, div, b, i {
            color: ${DARK_TEXT} !important;
        }
        span:not([style^="color"]):not([style*="; color"]):not([style*=";color"]),
        em:not([style^="color"]):not([style*="; color"]):not([style*=";color"]),
        strong:not([style^="color"]):not([style*="; color"]):not([style*=";color"]) {
            color: ${DARK_TEXT} !important;
        }
        [style*="color: #202122"], [style*="color:#202122"],
        [style*="color: rgb(32, 33, 34"] {
            color: ${DARK_TEXT} !important;
        }
        .d2l-multiselect,
        ul.d2l-multiselect,
        ul[id*="$control"],
        [id*="Addresses$control"] {
            background-color: #3d3d3d !important;
            border-color: #505050 !important;
        }
        .d2l-multiselect-choice,
        li.d2l-multiselect-choice,
        ul[id*="$control"] li.d2l-multiselect-choice,
        li[class*="d2l-multiselect-choice"] {
            background-color: #4a4a4a !important;
            color: ${DARK_TEXT} !important;
            border-color: #606060 !important;
        }
        .d2l-multiselect-choice span,
        li.d2l-multiselect-choice span,
        ul[id*="$control"] li span,
        li[class*="d2l-multiselect-choice"] span {
            color: ${DARK_TEXT} !important;
        }
        .d2l-multiselect-choice a,
        .d2l-multiselect-clearicon,
        .d2l-imagelink,
        ul[id*="$control"] li a {
            color: ${DARK_TEXT} !important;
        }
        .d2l-multiselect-input,
        .d2l-multiselect-input input,
        .d2l-multiselect input.d2l-edit,
        ul[id*="$control"] input,
        input.d2l-edit {
            background-color: #3d3d3d !important;
            color: ${DARK_TEXT} !important;
            border-color: #505050 !important;
        }
        .d2l-autocomplete-dynamic,
        [id*="AutoComplete"],
        .d2l-autocomplete-message {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
            border-color: #505050 !important;
        }
        .d2l-popup-title,
        .d2l-popup-title h1 {
            background-color: ${DARK_BG} !important;
            color: #ffffff !important;
        }
        .d2l-w2d-count,
        .d2l-w2d-heading-3-count {
            background-color: var(--dtu-ad-accent) !important;
            background: var(--dtu-ad-accent) !important;
            color: var(--dtu-ad-accent-on) !important;
            border-color: var(--dtu-ad-accent) !important;
        }
        .d2l-count-badge-number {
            background-color: var(--dtu-ad-accent-deep) !important;
            background: var(--dtu-ad-accent-deep) !important;
            color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
        }
        .d2l-count-badge-number > div {
            background: transparent !important;
            background-color: transparent !important;
            color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
        }
        .uw-text {
            color: var(--dtu-ad-accent-soft) !important;
        }
        [data-dtu-authored-light-bg] {
            color: #202122 !important;
        }
        [data-dtu-authored-light-bg] *:not(a),
        [data-dtu-authored-light-bg] *::before,
        [data-dtu-authored-light-bg] *::after {
            color: #202122 !important;
        }
    `;

    const iconShadowStyles = `
        :host { color: ${DARK_TEXT} !important; }
        svg, path, * {
            fill: ${DARK_TEXT} !important;
            color: ${DARK_TEXT} !important;
        }
    `;

    const enrollmentCardShadowStyles = `
        :host {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
        }
        .d2l-enrollment-card-container,
        .d2l-enrollment-card-content,
        .d2l-enrollment-card-content-flex {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
        }
        .d2l-enrollment-card-status-indicator {
            background-color: ${DARK_BG} !important;
            box-shadow: 0 0 0 2px ${DARK_BG} !important;
        }
        .d2l-enrollment-card-icon-container {
            background-color: ${DARK_BG} !important;
        }
        .d2l-enrollment-card-image-container {
            background-color: transparent !important;
        }
        .d2l-enrollment-card-overlay {
            background-color: rgba(0, 0, 0, 0.7) !important;
        }
        img,
        svg,
        d2l-organization-image,
        d2l-course-image {
            background-color: transparent !important;
            filter: none !important;
        }
    `;

    const myCoursesEnrollmentCardShadowStyles = enrollmentCardShadowStyles + `
        d2l-card,
        d2l-card * {
            visibility: visible !important;
        }

        d2l-card [slot="header"],
        d2l-card [slot="header"] *,
        .d2l-enrollment-card-image-container,
        .d2l-organization-image,
        .d2l-organization-image *,
        .d2l-organization-image-main,
        img {
            background: transparent !important;
            background-color: transparent !important;
            background-image: initial !important;
            filter: none !important;
            opacity: 1 !important;
        }

        d2l-card [slot="content"],
        .d2l-enrollment-card-content-flex,
        .d2l-organization-name,
        d2l-card-content-meta,
        d2l-card-content-meta *,
        .d2l-body-small,
        .d2l-organization-code,
        .d2l-organization-date {
            background: ${DARK_BG} !important;
            background-color: ${DARK_BG} !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
            opacity: 1 !important;
        }

        d2l-card-footer-link,
        d2l-dropdown-more,
        d2l-button-icon,
        d2l-status-indicator {
            opacity: 1 !important;
        }
    `;

    const cardShadowStyles = `
        :host {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }
        .d2l-card-container,
        .d2l-card-link-container,
        .d2l-card-content {
            background: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }
        .d2l-card-container a,
        .d2l-card-container a:link,
        .d2l-card-container a:visited {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }
        .d2l-card-footer {
            background: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }
        .d2l-card-header,
        .d2l-card-actions,
        .d2l-card-badge,
        img,
        svg,
        d2l-organization-image,
        d2l-course-image,
        [slot="header"] {
            background-color: transparent !important;
            filter: none !important;
        }
        .d2l-card-title,
        .d2l-card-subtitle,
        .d2l-card-link-text,
        .d2l-card-text {
            color: ${DARK_TEXT} !important;
            background-color: transparent !important;
        }
        .d2l-card-divider,
        .d2l-card-separator {
            border-color: ${DARK_BORDER} !important;
        }
    `;

    const breadcrumbShadowStyles = `
        :host,
        nav[aria-label="Breadcrumb"],
        nav[aria-label="Breadcrumb"] div[role="list"],
        nav[aria-label="Breadcrumb"] [role="list"],
        nav[aria-label="Breadcrumb"] a,
        nav[aria-label="Breadcrumb"] d2l-icon {
            background: #1a1a1a !important;
            background-color: #1a1a1a !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }
    `;

    const expandCollapseStyles = `
        :host,
        .d2l-expand-collapse-content-container,
        .d2l-expand-collapse-content-inner,
        .d2l-widget-content,
        .d2l-widget-content-padding {
            background-color: ${DARK_BG} !important;
        }
        iframe {
            background-color: transparent !important;
        }
    `;

    // Nested topics in the Lessons TOC sit in an expand-collapse region. Filled,
    // it drew a square dark-2 block around the rows; the rows' own rounded pills
    // carry all the state, so the region stays see-through.
    const lessonsTocExpandCollapseStyles = `
        :host,
        .d2l-expand-collapse-content-container,
        .d2l-expand-collapse-content-inner {
            background-color: transparent !important;
        }
    `;

    const htmlEditorShadowStyles = `
        :host {
            color: ${DARK_TEXT} !important;
        }
        .d2l-htmleditor-container,
        .d2l-htmleditor-flex-container,
        .d2l-htmleditor-toolbar-container,
        d2l-htmleditor-toolbar,
        .tox-tinymce,
        .tox-editor-container,
        .tox-editor-header,
        .tox-toolbar-overlord,
        .tox-toolbar__primary,
        .tox-statusbar {
            background: ${DARK_BG} !important;
            background-color: ${DARK_BG} !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }
        .tox-edit-area,
        .tox-edit-area iframe {
            background: #1a1a1a !important;
            background-color: #1a1a1a !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }
        .tox-statusbar,
        .tox-statusbar__path,
        .tox-statusbar__wordcount,
        .tox-statusbar__resize-handle {
            color: ${DARK_TEXT} !important;
        }
    `;

    const menuStyles = `
        :host,
        .d2l-menu,
        .d2l-menu-mvc,
        .d2l-contextmenu,
        .d2l-menu-item,
        .d2l-menu-item-text {
            background-color: #1a1a1a !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }
        .d2l-menu-item:hover,
        .d2l-menu-item:focus {
            background-color: #2d2d2d !important;
            color: ${DARK_TEXT} !important;
        }
        a {
            color: ${DARK_TEXT} !important;
            background-color: transparent !important;
        }
        button,
        button[aria-haspopup="true"][aria-label^="Actions for"],
        button:hover,
        button:focus,
        button:focus-visible,
        button[aria-haspopup="true"][aria-label^="Actions for"]:hover,
        button[aria-haspopup="true"][aria-label^="Actions for"]:focus,
        button[aria-haspopup="true"][aria-label^="Actions for"]:focus-visible {
            color: ${DARK_TEXT} !important;
            background-color: #2d2d2d !important;
            background: #2d2d2d !important;
            background-image: none !important;
            border-color: ${DARK_BORDER} !important;
            box-shadow: none !important;
        }
        div[role="list"],
        nav[aria-label="Breadcrumb"],
        nav[aria-label="Breadcrumb"] div[role="list"],
        nav[aria-label="Breadcrumb"] [role="list"] {
            background: #1a1a1a !important;
            background-color: #1a1a1a !important;
            background-image: none !important;
        }
        .d2l-w2d-count,
        .d2l-w2d-heading-3-count {
            background-color: var(--dtu-ad-accent) !important;
            background: var(--dtu-ad-accent) !important;
            background-image: none !important;
            color: var(--dtu-ad-accent-on) !important;
            border-color: var(--dtu-ad-accent) !important;
        }
        .d2l-count-badge-number {
            background-color: var(--dtu-ad-accent-deep) !important;
            background: var(--dtu-ad-accent-deep) !important;
            background-image: none !important;
            color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
            border: 0 !important;
            outline: 0 !important;
            box-shadow: none !important;
        }
        .d2l-count-badge-number > div {
            background: transparent !important;
            background-color: transparent !important;
            color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
        }
        .uw-text {
            color: var(--dtu-ad-accent-text, var(--dtu-ad-accent)) !important;
        }
    `;

    const buttonSubtleStyles = `
        :host {
            color: ${DARK_TEXT} !important;
        }
        button {
            background: ${DARK_BG} !important;
            background-color: ${DARK_BG} !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
            box-shadow: none !important;
        }
        .d2l-button-subtle-content-wrapper,
        .d2l-button-subtle-content {
            background: transparent !important;
            background-color: transparent !important;
            color: ${DARK_TEXT} !important;
        }
        button:hover,
        button:focus,
        button:focus-visible,
        button:active {
            background: #3d3d3d !important;
            background-color: #3d3d3d !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
        }
        button:disabled,
        button[disabled],
        button[aria-disabled="true"],
        button:disabled .d2l-button-subtle-content-wrapper,
        button:disabled .d2l-button-subtle-content,
        button[disabled] .d2l-button-subtle-content-wrapper,
        button[disabled] .d2l-button-subtle-content,
        button[aria-disabled="true"] .d2l-button-subtle-content-wrapper,
        button[aria-disabled="true"] .d2l-button-subtle-content {
            background: ${DARK_BG} !important;
            background-color: ${DARK_BG} !important;
            background-image: none !important;
            color: #b0b0b0 !important;
            border-color: ${DARK_BORDER} !important;
            opacity: 0.65 !important;
        }
        ::slotted(*) {
            color: ${DARK_TEXT} !important;
            background: transparent !important;
            background-color: transparent !important;
        }
    `;

    const listItemNavStyles = `
        :host {
            background-color: transparent !important;
            color: ${DARK_TEXT} !important;
        }
        * {
            color: ${DARK_TEXT} !important;
        }
        .co-content,
        .title-container,
        .title,
        .title > div,
        .title-text,
        .title-text span,
        .text-wrapper,
        .overflow-detector,
        .overflow-detector span,
        .date-container,
        .due-date-container,
        .title::before,
        .title::after,
        d2l-icon.module-triangle,
        d2l-icon[icon="tier1:arrow-collapse-small"],
        d2l-icon[icon="tier1:arrow-expand-small"],
        d2l-icon[icon="tier1:dragger"],
        d2l-icon[icon="tier2:upload"] {
            background-color: #1a1a1a !important;
            background: #1a1a1a !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
        }
        /* No fill of its own: a filled glyph box showed as a square on rows
           whose rounded pill is unfilled. */
        d2l-icon[icon="tier2:file-document"] {
            background-color: transparent !important;
            background: transparent !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
        }
        a {
            color: #66b3ff !important;
        }
        /* Iframe-aware nested shadow processing now reaches the restricted-text
           label inside these controls, so the old light-pill contrast workaround
           is no longer needed. Keep contained/current items on dark 2 and use the
           shared raised hover while leaving D2L's semantic selection borders. */
        [slot="outside-control-container"],
        ::slotted([slot="outside-control-container"]),
        :host([current]) [slot="outside-control-container"] {
            background-color: ${DARK_BG} !important;
            background: ${DARK_BG} !important;
            background-image: none !important;
        }
        [slot="outside-control-container"]:hover,
        ::slotted([slot="outside-control-container"]):hover,
        :host([current]) [slot="outside-control-container"]:hover {
            background-color: #3d3d3d !important;
            background: #3d3d3d !important;
            background-image: none !important;
        }
        /* Lessons TOC rows: D2L paints only the rounded outside-control-container
           pill; the host and the list stay transparent. Keep that shape on the
           dark-1 panel -- resting pills unfilled, hovered/focused and current
           pills raised to dark 2. Hover arrives as host attributes: the pill
           itself sits under the action layer and never matches :hover. */
        :host(d2l-list-item-nav) [slot="outside-control-container"] {
            background-color: transparent !important;
            background: transparent !important;
        }
        /* Row separators are border-top: var(--d2l-color-mica) pseudo-elements
           (near-white on dark). Recolour the token, not the borders, so D2L's
           own rules that hide them on hover/focus/current keep working. */
        :host(d2l-list-item-nav) {
            --d2l-color-mica: ${DARK_BORDER} !important;
        }
        :host(d2l-list-item-nav[_hovering-primary-action]) [slot="outside-control-container"],
        :host(d2l-list-item-nav[_hovering-control]) [slot="outside-control-container"],
        :host(d2l-list-item-nav[_hovering-selection]) [slot="outside-control-container"],
        :host(d2l-list-item-nav[_focusing-primary-action]) [slot="outside-control-container"],
        :host(d2l-list-item-nav[current]) [slot="outside-control-container"] {
            background-color: ${DARK_BG} !important;
            background: ${DARK_BG} !important;
            background-image: none !important;
        }
        :host(d2l-list-item-nav:not([current])[_hovering-primary-action]) [slot="outside-control-container"],
        :host(d2l-list-item-nav:not([current])[_hovering-control]) [slot="outside-control-container"],
        :host(d2l-list-item-nav:not([current])[_hovering-selection]) [slot="outside-control-container"],
        :host(d2l-list-item-nav:not([current])[_focusing-primary-action]) [slot="outside-control-container"] {
            border-color: ${DARK_BORDER} !important;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.35) !important;
        }
        [slot="supporting-info"],
        [slot="content"],
        div, span, p, h1, h2, h3, h4, h5, h6 {
            color: ${DARK_TEXT} !important;
        }
        .d2l-w2d-count,
        .d2l-w2d-heading-3-count {
            background-color: var(--dtu-ad-accent) !important;
            background: var(--dtu-ad-accent) !important;
            background-image: none !important;
            color: var(--dtu-ad-accent-on) !important;
            border-color: var(--dtu-ad-accent) !important;
        }
        .d2l-count-badge-number {
            background-color: var(--dtu-ad-accent-deep) !important;
            background: var(--dtu-ad-accent-deep) !important;
            background-image: none !important;
            color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
            border: 0 !important;
            outline: 0 !important;
            box-shadow: none !important;
        }
        .d2l-count-badge-number > div {
            background: transparent !important;
            background-color: transparent !important;
            color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
        }
        .uw-text {
            color: var(--dtu-ad-accent-text, var(--dtu-ad-accent)) !important;
        }
    `;

    const w2dListStyles = `
        :host,
        .d2l-list-item,
        .d2l-list-item-content,
        d2l-list-item,
        d2l-list-item-content {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
        }
        * {
            color: ${DARK_TEXT} !important;
        }
        p, span, div, h1, h2, h3, h4, h5, h6,
        strong, em, b, i, ul, ol, li,
        .d2l-body-compact, .d2l-body-standard, .d2l-label-text {
            color: ${DARK_TEXT} !important;
        }
        a {
            color: #66b3ff !important;
        }
        .d2l-w2d-count,
        .d2l-w2d-heading-3-count {
            background-color: var(--dtu-ad-accent) !important;
            background: var(--dtu-ad-accent) !important;
            color: var(--dtu-ad-accent-on) !important;
            border-color: var(--dtu-ad-accent) !important;
        }
        .d2l-count-badge-number {
            background-color: var(--dtu-ad-accent-deep) !important;
            background: var(--dtu-ad-accent-deep) !important;
            color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
            border-color: #ffffff !important;
        }
        .d2l-count-badge-number > div {
            background: transparent !important;
            background-color: transparent !important;
            color: var(--dtu-ad-accent-deep-on, #ffffff) !important;
        }
    `;

    const htmlBlockStyles = `
        :host {
            color: #e0e0e0 !important;
        }
        *:not(a):not(a *):not([style^="color"]):not([style*="; color"]):not([style*=";color"]),
        *::before, *::after {
            color: #e0e0e0 !important;
        }
        [style*="color: #000"], [style*="color:#000"],
        [style*="color: black"], [style*="color:black"],
        [style*="color: rgb(0, 0, 0"], [style*="color:rgb(0,0,0"],
        [style*="color: rgb(0,0,0"],
        [style*="color: #202122"], [style*="color:#202122"],
        [style*="color: rgb(32, 33, 34"] {
            color: #e0e0e0 !important;
        }
        div.d2l-html-block-rendered,
        div.d2l-html-block-rendered *:not(a):not(a *):not([style^="color"]):not([style*="; color"]):not([style*=";color"]),
        .d2l-html-block-rendered,
        .d2l-html-block-rendered *:not(a):not(a *):not([style^="color"]):not([style*="; color"]):not([style*=";color"]) {
            color: #e0e0e0 !important;
        }
        span, p, div, strong, em, b, i {
            background-color: transparent !important;
            background: transparent !important;
        }
        a {
            color: #66b3ff !important;
        }
        /* Text pasted from Word wraps link text in styled spans; let it take
           the link colour instead of the body text or its authored colour. */
        .d2l-html-block-rendered a * {
            color: inherit !important;
        }
        /* Underline links in course text so they read as links without relying
           on colour. MazeMap links keep their own dotted underline and pin. */
        .d2l-html-block-rendered a[href]:not([data-dtu-mazemap-link]) {
            text-decoration: underline !important;
            text-decoration-color: rgba(102, 179, 255, 0.5) !important;
            text-underline-offset: 2px !important;
        }
        .d2l-html-block-rendered a[href]:not([data-dtu-mazemap-link]):hover {
            text-decoration-color: currentColor !important;
        }
        a:hover, a:hover * {
            color: #99ccff !important;
        }
        .uw-text {
            color: var(--dtu-ad-accent-soft) !important;
        }
        /* Repeats the light-text rule's :not() list so it outranks it on the
           cell itself; a plain [marker] selector lost and left grey on white. */
        div.d2l-html-block-rendered [data-dtu-authored-light-bg]:not(a):not(a *):not([style^="color"]):not([style*="; color"]):not([style*=";color"]),
        .d2l-html-block-rendered [data-dtu-authored-light-bg] {
            color: #202122 !important;
        }
        .d2l-html-block-rendered [data-dtu-authored-light-bg] *:not(a):not([style^="color"]):not([style*="; color"]):not([style*=";color"]),
        .d2l-html-block-rendered [data-dtu-authored-light-bg] *::before,
        .d2l-html-block-rendered [data-dtu-authored-light-bg] *::after {
            color: #202122 !important;
        }
        .d2l-html-block-rendered [data-dtu-authored-light-bg] [style*="color: #000"],
        .d2l-html-block-rendered [data-dtu-authored-light-bg] [style*="color:#000"],
        .d2l-html-block-rendered [data-dtu-authored-light-bg] [style*="color: black"],
        .d2l-html-block-rendered [data-dtu-authored-light-bg] [style*="color:black"],
        .d2l-html-block-rendered [data-dtu-authored-light-bg] [style*="color: rgb(0, 0, 0"],
        .d2l-html-block-rendered [data-dtu-authored-light-bg] [style*="color:rgb(0,0,0"],
        .d2l-html-block-rendered [data-dtu-authored-light-bg] [style*="color: rgb(0,0,0"] {
            color: #202122 !important;
        }
    `;

    globalThis.DTUAfterDarkDarkEngineStyles = {
        DARK_BG: DARK_BG,
        DARK_TEXT: DARK_TEXT,
        DARK_BORDER: DARK_BORDER,
        shadowDOMStyles: shadowDOMStyles,
        buttonIconShadowStyles: buttonIconShadowStyles,
        iframeStyles: iframeStyles,
        iconShadowStyles: iconShadowStyles,
        enrollmentCardShadowStyles: enrollmentCardShadowStyles,
        myCoursesEnrollmentCardShadowStyles: myCoursesEnrollmentCardShadowStyles,
        cardShadowStyles: cardShadowStyles,
        breadcrumbShadowStyles: breadcrumbShadowStyles,
        expandCollapseStyles: expandCollapseStyles,
        lessonsTocExpandCollapseStyles: lessonsTocExpandCollapseStyles,
        htmlEditorShadowStyles: htmlEditorShadowStyles,
        menuStyles: menuStyles,
        buttonSubtleStyles: buttonSubtleStyles,
        listItemNavStyles: listItemNavStyles,
        w2dListStyles: w2dListStyles,
        htmlBlockStyles: htmlBlockStyles,
    };
})();
