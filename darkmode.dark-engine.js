(() => {
    const deps = globalThis.DTUAfterDarkDarkEngineDeps || {};

    function isDarkModeEnabled() {
        return !!(deps.isDarkModeEnabled && deps.isDarkModeEnabled());
    }

    function isLegacyHeavyPage() {
        return !!(deps.isLegacyHeavyPage && deps.isLegacyHeavyPage());
    }

    function getResolvedAccent() {
        return (deps.getResolvedAccent && deps.getResolvedAccent()) || '#990000';
    }

    function getResolvedAccentDeep() {
        return (deps.getResolvedAccentDeep && deps.getResolvedAccentDeep()) || '#7d0000';
    }

    function getContrastTextForHex(hex, light, dark) {
        if (deps.getContrastTextForHex) return deps.getContrastTextForHex(hex, light, dark);
        return light || '#ffffff';
    }

    function preserveTypeboxColors(root) {
        if (deps.preserveTypeboxColors) return deps.preserveTypeboxColors(root);
    }

    function replaceLogoImage(root) {
        if (deps.replaceLogoImage) return deps.replaceLogoImage(root);
    }

    function styleQuizSubmissionHistogram(root) {
        if (deps.styleQuizSubmissionHistogram) return deps.styleQuizSubmissionHistogram(root);
    }

    function seedSmartRoomLinkerShadowRoot(root) {
        if (deps.seedSmartRoomLinkerShadowRoot) return deps.seedSmartRoomLinkerShadowRoot(root);
    }

    function scheduleSmartRoomLinkerScan(root, delayMs) {
        if (deps.scheduleSmartRoomLinkerScan) return deps.scheduleSmartRoomLinkerScan(root, delayMs);
    }

    function insertContentButtons(root) {
        if (deps.insertContentButtons) return deps.insertContentButtons(root);
    }

    function forceDTULearnAccentInRoot(root) {
        if (deps.forceDTULearnAccentInRoot) return deps.forceDTULearnAccentInRoot(root);
    }

    function isDTULearnQuizSubmissionsPage() {
        return !!(deps.isDTULearnQuizSubmissionsPage && deps.isDTULearnQuizSubmissionsPage());
    }

    function forceDtuRedBackgroundDark2(el) {
        if (deps.forceDtuRedBackgroundDark2) return deps.forceDtuRedBackgroundDark2(el);
        if (!el || !el.style) return;
        var color = getResolvedAccentDeep();
        el.style.setProperty('background', color, 'important');
        el.style.setProperty('background-color', color, 'important');
        el.style.setProperty('background-image', 'none', 'important');
        el.style.setProperty('border-color', color, 'important');
    }

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
            color: #ffffff !important;
            border-color: #ffffff !important;
        }
        .d2l-count-badge-number > div {
            background: transparent !important;
            background-color: transparent !important;
            color: #ffffff !important;
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
            color: #ffffff !important;
        }
        .d2l-count-badge-number > div {
            background: transparent !important;
            background-color: transparent !important;
            color: #ffffff !important;
        }
        .uw-text {
            color: var(--dtu-ad-accent-soft) !important;
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
            color: #ffffff !important;
            border: 0 !important;
            outline: 0 !important;
            box-shadow: none !important;
        }
        .d2l-count-badge-number > div {
            background: transparent !important;
            background-color: transparent !important;
            color: #ffffff !important;
        }
        .uw-text {
            color: var(--dtu-ad-accent) !important;
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
        d2l-icon[icon="tier2:upload"],
        d2l-icon[icon="tier2:file-document"] {
            background-color: #1a1a1a !important;
            background: #1a1a1a !important;
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
        :host([current]),
        :host([current]) [slot="outside-control-container"] {
            background-color: ${DARK_BG} !important;
            background: ${DARK_BG} !important;
            background-image: none !important;
        }
        [slot="outside-control-container"]:hover,
        ::slotted([slot="outside-control-container"]):hover,
        :host([current]):hover,
        :host([current]) [slot="outside-control-container"]:hover {
            background-color: #3d3d3d !important;
            background: #3d3d3d !important;
            background-image: none !important;
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
            color: #ffffff !important;
            border: 0 !important;
            outline: 0 !important;
            box-shadow: none !important;
        }
        .d2l-count-badge-number > div {
            background: transparent !important;
            background-color: transparent !important;
            color: #ffffff !important;
        }
        .uw-text {
            color: var(--dtu-ad-accent) !important;
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
            color: #ffffff !important;
            border-color: #ffffff !important;
        }
        .d2l-count-badge-number > div {
            background: transparent !important;
            background-color: transparent !important;
            color: #ffffff !important;
        }
    `;

    const htmlBlockStyles = `
        :host {
            color: #e0e0e0 !important;
        }
        *:not(a):not([style^="color"]):not([style*="; color"]):not([style*=";color"]),
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
        div.d2l-html-block-rendered *:not(a):not([style^="color"]):not([style*="; color"]):not([style*=";color"]),
        .d2l-html-block-rendered,
        .d2l-html-block-rendered *:not(a):not([style^="color"]):not([style*="; color"]):not([style*=";color"]) {
            color: #e0e0e0 !important;
        }
        span, p, div, strong, em, b, i {
            background-color: transparent !important;
            background: transparent !important;
        }
        a {
            color: #66b3ff !important;
        }
        a:hover, a:hover * {
            color: #99ccff !important;
        }
        .uw-text {
            color: var(--dtu-ad-accent-soft) !important;
        }
    `;

    const EXCLUDED_ELEMENTS = [
        'd2l-image-banner-overlay',
        'd2l-image-banner',
        'team-widget',
        'd2l-organization-image',
        'd2l-course-image',
        'd2l-pdf-viewer',
        'd2l-pdf-viewer-toolbar',
        'd2l-pdf-viewer-progress-bar',
        'd2l-labs-media-player',
        'd2l-labs-slider-bar'
    ];

    function shouldExcludeElement(element) {
        if (!element || !element.tagName) return false;
        const tagName = element.tagName.toLowerCase();
        if (EXCLUDED_ELEMENTS.includes(tagName)) return true;
        if (element.classList) {
            if (element.classList.contains('team-widget-container')
                || element.classList.contains('d2l-image-banner-overlay')
                || element.classList.contains('bg-white')
                || element.classList.contains('pdfViewer')
                || element.classList.contains('page')
                || element.classList.contains('canvasWrapper')
                || element.classList.contains('textLayer')
                || element.classList.contains('annotationLayer')
                || element.classList.contains('annotationEditorLayer')) {
                return true;
            }
        }
        if (element.id) {
            if (element.id.includes('banner')
                || element.id.includes('team')
                || element.id.includes('overlayContent')
                || element.id === 'viewer'
                || element.id.includes('pdfViewer')
                || element.id === 'player'
                || element.id.includes('d2l-labs-media-player')) {
                return true;
            }
        }
        if (element.hasAttribute && element.hasAttribute('data-page-number')) return true;
        return false;
    }

    function injectStylesIntoShadowRoot(shadowRoot, element) {
        if (!shadowRoot) return;
        if (shouldExcludeElement(element)) return;

        let styleId = 'dark-mode-shadow-styles';
        let styleText = shadowDOMStyles;

        if (element && element.tagName) {
            const tagName = element.tagName.toLowerCase();
            if (tagName === 'd2l-icon') {
                styleId = 'dark-mode-shadow-styles-icon';
                styleText = iconShadowStyles;
            } else if (tagName === 'd2l-my-courses-enrollment-card') {
                styleId = 'dark-mode-shadow-styles-my-courses-enrollment-card';
                styleText = myCoursesEnrollmentCardShadowStyles;
            } else if (tagName === 'd2l-enrollment-card') {
                styleId = 'dark-mode-shadow-styles-enrollment-card';
                styleText = enrollmentCardShadowStyles;
            } else if (tagName === 'd2l-card') {
                styleId = 'dark-mode-shadow-styles-card';
                styleText = cardShadowStyles;
            } else if (tagName === 'd2l-expand-collapse-content' || tagName === 'd2l-lti-launch') {
                styleId = 'dark-mode-shadow-styles-expand-collapse';
                styleText = expandCollapseStyles;
            } else if (tagName === 'd2l-list-item-nav') {
                // Redesigned Lessons TOC (smart-curriculum app). The current /
                // hovered item paints a near-white fill on the slotted
                // outside-control-container div; force the dark-2 panel color
                // and keep idle rows transparent.
                styleId = 'dark-mode-shadow-styles-list-item-nav';
                styleText = `
                    [slot="outside-control-container"] {
                        background-color: transparent !important;
                        border-color: #404040 !important;
                    }
                    :host([current]) [slot="outside-control-container"],
                    :host([_child-current]) [slot="outside-control-container"],
                    :host(:hover) [slot="outside-control-container"],
                    :host([_focusing]) [slot="outside-control-container"] {
                        background-color: #2d2d2d !important;
                    }
                `;
            } else if (tagName === 'd2l-button-subtle') {
                styleId = 'dark-mode-shadow-styles-button-subtle';
                styleText = buttonSubtleStyles;
            } else if (tagName === 'd2l-menu' || tagName === 'd2l-menu-item' || tagName === 'd2l-menu-item-link') {
                styleId = 'dark-mode-shadow-styles-menu';
                styleText = menuStyles;
            } else if (tagName === 'd2l-html-block') {
                styleId = 'dark-mode-shadow-styles-html-block';
                styleText = htmlBlockStyles;
            } else if (tagName === 'd2l-w2d-list' || tagName.startsWith('d2l-w2d-')) {
                styleId = 'dark-mode-shadow-styles-w2d-list';
                styleText = w2dListStyles;
            } else if (tagName === 'd2l-list-item-nav' || tagName === 'd2l-list-item-content'
                || tagName === 'd2l-list' || tagName === 'd2l-list-item'
                || tagName.startsWith('d2l-lessons-') || tagName.startsWith('d2l-toc-')) {
                styleId = 'dark-mode-shadow-styles-list-item-nav';
                styleText = listItemNavStyles;
            } else if (tagName === 'd2l-input-search') {
                styleId = 'dark-mode-shadow-styles-input-search';
                styleText = `
                    :host { color: ${DARK_TEXT} !important; }
                    input {
                        color: ${DARK_TEXT} !important;
                        background-color: transparent !important;
                    }
                `;
            } else if (tagName === 'd2l-calendar') {
                // Mini-month date grid renders as <button class="d2l-calendar-date">
                // inside this shadow root, so the page stylesheet can't reach it
                // (cells stayed white). Darken the cells here.
                styleId = 'dark-mode-shadow-styles-calendar';
                styleText = `
                    :host { color: ${DARK_TEXT} !important; }
                    table, thead, tbody, tr, th, td {
                        background-color: transparent !important;
                        color: ${DARK_TEXT} !important;
                        border-color: ${DARK_BORDER} !important;
                    }
                    th, .d2l-calendar-title { color: ${DARK_TEXT} !important; }
                    button.d2l-calendar-date,
                    .d2l-calendar-date {
                        background-color: ${DARK_BG} !important;
                        background-image: none !important;
                        color: ${DARK_TEXT} !important;
                        border-color: ${DARK_BORDER} !important;
                    }
                    .d2l-calendar-date:hover,
                    .d2l-calendar-date:focus {
                        background-color: #3d3d3d !important;
                    }
                    .d2l-calendar-date-today {
                        outline: 2px solid var(--dtu-ad-accent, #cc1f3b) !important;
                        outline-offset: -2px;
                    }
                    .d2l-calendar-date-selected,
                    .d2l-calendar-date[aria-selected="true"] {
                        background-color: var(--dtu-ad-accent, #cc1f3b) !important;
                        color: #ffffff !important;
                    }
                `;
            } else if (tagName === 'd2l-table-col-sort-button') {
                // Sortable column headers ("Title", "Start Date"): the inner
                // <button> gets a light hover/focus background from D2L's adopted
                // stylesheet, giving white-on-white text. Force it dark.
                styleId = 'dark-mode-shadow-styles-col-sort';
                styleText = `
                    :host { color: ${DARK_TEXT} !important; }
                    button {
                        background-color: transparent !important;
                        color: ${DARK_TEXT} !important;
                    }
                    button:hover,
                    button:focus,
                    button:active {
                        background-color: #3d3d3d !important;
                        color: ${DARK_TEXT} !important;
                    }
                `;
            }
        }

        let style = shadowRoot.getElementById(styleId);
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            style.textContent = styleText;
            shadowRoot.appendChild(style);
        } else if (style.textContent !== styleText) {
            style.textContent = styleText;
        }

        try { forceDTULearnAccentInRoot(shadowRoot); } catch (e0) { }
        observeInjectedShadowRoot(shadowRoot);
        processNestedShadowRoots(shadowRoot);
        try { seedSmartRoomLinkerShadowRoot(shadowRoot); } catch (e1) { }
    }

    const _pendingShadowHostRetry = new WeakMap();
    const _shadowHostRetryCount = new WeakMap();
    const _watchedUndefinedTags = new Set();
    let _definitionSweepTimer = null;

    // Custom-element upgrades attach shadow roots without any observable
    // mutation. whenDefined() is the only reliable signal, so re-sweep
    // (debounced) whenever a d2l-* tag we saw in the DOM gets defined.
    function scheduleDefinitionSweep() {
        if (_definitionSweepTimer) return;
        _definitionSweepTimer = setTimeout(function () {
            _definitionSweepTimer = null;
            if (!isDarkModeEnabled()) return;
            if (!shouldUseBrightspaceShadowDomProcessing()) return;
            sweepForLateShadowRoots();
        }, 120);
    }

    function watchTagDefinition(tagName) {
        if (!tagName || _watchedUndefinedTags.has(tagName)) return;
        if (!window.customElements || typeof customElements.whenDefined !== 'function') return;
        try {
            if (customElements.get(tagName)) return;
            _watchedUndefinedTags.add(tagName);
            customElements.whenDefined(tagName).then(scheduleDefinitionSweep).catch(function () { });
        } catch (eDefWatch) { }
    }
    const _observedShadowRoots = new WeakSet();
    const SHADOW_HOST_RETRY_DELAY_MS = 350;
    const SHADOW_HOST_MAX_RETRIES = 20;

    function isShadowHostCandidate(element) {
        if (!element || !element.tagName) return false;
        return element.tagName.toLowerCase().startsWith('d2l-');
    }

    function scheduleShadowHostRetry(element) {
        if (!isShadowHostCandidate(element)) return;
        if (element.shadowRoot) {
            var existingTimer = _pendingShadowHostRetry.get(element);
            if (existingTimer) {
                clearTimeout(existingTimer);
                _pendingShadowHostRetry.delete(element);
            }
            injectStylesIntoShadowRoot(element.shadowRoot, element);
            return;
        }
        watchTagDefinition(element.tagName.toLowerCase());
        if (_pendingShadowHostRetry.has(element)) return;
        var retryCount = _shadowHostRetryCount.get(element) || 0;
        if (retryCount >= SHADOW_HOST_MAX_RETRIES) return;
        _shadowHostRetryCount.set(element, retryCount + 1);
        var retryTimer = setTimeout(function () {
            _pendingShadowHostRetry.delete(element);
            if (!element.isConnected) return;
            scheduleShadowHostRetry(element);
        }, SHADOW_HOST_RETRY_DELAY_MS);
        _pendingShadowHostRetry.set(element, retryTimer);
    }

    function processShadowMutationNode(node) {
        if (!node || node.nodeType !== 1) return;
        if (shouldExcludeElement(node) || isInsideExcludedContainer(node)) return;
        if (node.shadowRoot) {
            injectStylesIntoShadowRoot(node.shadowRoot, node);
        } else {
            scheduleShadowHostRetry(node);
        }
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, null);
        let child = walker.nextNode();
        while (child) {
            if (!shouldExcludeElement(child) && !isInsideExcludedContainer(child)) {
                if (child.shadowRoot) injectStylesIntoShadowRoot(child.shadowRoot, child);
                else scheduleShadowHostRetry(child);
            }
            child = walker.nextNode();
        }
        processHtmlBlocks(node);
        insertContentButtons(node);
        try {
            if (node.matches && node.matches('.d2l-html-block-rendered')) {
                scheduleSmartRoomLinkerScan(node, 120);
                return;
            }
            if (node.querySelectorAll) {
                var rendered = node.querySelectorAll('.d2l-html-block-rendered');
                if (rendered && rendered.length) {
                    for (var i = 0; i < rendered.length && i < 12; i++) {
                        scheduleSmartRoomLinkerScan(rendered[i], 120);
                    }
                    return;
                }
            }
            scheduleSmartRoomLinkerScan(node, 140);
        } catch (e2) { }
    }

    function observeInjectedShadowRoot(shadowRoot) {
        if (!shadowRoot || _observedShadowRoots.has(shadowRoot)) return;
        const observer = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];
                if (mutation.type !== 'childList') continue;
                for (var j = 0; j < mutation.addedNodes.length; j++) {
                    var added = mutation.addedNodes[j];
                    if (added.nodeType === 1) processShadowMutationNode(added);
                }
            }
            try { forceDTULearnAccentInRoot(shadowRoot); } catch (e3) { }
        });
        observer.observe(shadowRoot, { childList: true, subtree: true });
        _observedShadowRoots.add(shadowRoot);
    }

    function processNestedShadowRoots(shadowRoot) {
        if (!shadowRoot) return;
        const walker = document.createTreeWalker(shadowRoot, NodeFilter.SHOW_ELEMENT, null);
        let element = walker.nextNode();
        while (element) {
            if (element.shadowRoot) injectStylesIntoShadowRoot(element.shadowRoot, element);
            else scheduleShadowHostRetry(element);
            element = walker.nextNode();
        }
    }

    const _styledHtmlBlocks = new WeakSet();
    const _pendingHtmlBlockRetry = new WeakMap();
    const _htmlBlockRetryCount = new WeakMap();
    const HTML_BLOCK_MAX_RETRIES = 8;

    function ensureHtmlBlockStyled(block) {
        if (!block || _styledHtmlBlocks.has(block)) return;
        if (block.shadowRoot) {
            var pendingTimer = _pendingHtmlBlockRetry.get(block);
            if (pendingTimer) {
                clearTimeout(pendingTimer);
                _pendingHtmlBlockRetry.delete(block);
            }
            injectStylesIntoShadowRoot(block.shadowRoot, block);
            _styledHtmlBlocks.add(block);
            return;
        }
        if (_pendingHtmlBlockRetry.has(block)) return;
        var retryCount = _htmlBlockRetryCount.get(block) || 0;
        if (retryCount >= HTML_BLOCK_MAX_RETRIES) return;
        _htmlBlockRetryCount.set(block, retryCount + 1);
        const retryTimer = setTimeout(function () {
            _pendingHtmlBlockRetry.delete(block);
            ensureHtmlBlockStyled(block);
        }, 400);
        _pendingHtmlBlockRetry.set(block, retryTimer);
    }

    function processHtmlBlocks(root) {
        if (!root || !root.querySelectorAll) return;
        if (root.matches && root.matches('d2l-html-block')) ensureHtmlBlockStyled(root);
        root.querySelectorAll('d2l-html-block').forEach(ensureHtmlBlockStyled);
    }

    function pollForHtmlBlocks() {
        document.querySelectorAll('d2l-html-block').forEach(ensureHtmlBlockStyled);
    }

    function styleMultiselectElements(root) {
        root.querySelectorAll('.d2l-multiselect, ul.d2l-multiselect').forEach(function (el) {
            el.style.setProperty('background-color', '#3d3d3d', 'important');
            el.style.setProperty('border-color', '#505050', 'important');
        });
        root.querySelectorAll('.d2l-multiselect-choice').forEach(function (el) {
            el.style.setProperty('background-color', '#4a4a4a', 'important');
            el.style.setProperty('color', '#e0e0e0', 'important');
            el.style.setProperty('border-color', '#606060', 'important');
        });
        root.querySelectorAll('.d2l-multiselect-choice span').forEach(function (el) {
            el.style.setProperty('color', '#e0e0e0', 'important');
        });
        root.querySelectorAll('.d2l-multiselect-clearicon, .d2l-multiselect-choice a').forEach(function (el) {
            el.style.setProperty('color', '#e0e0e0', 'important');
        });
        root.querySelectorAll('.d2l-multiselect input, input.d2l-edit, .d2l-multiselect-input input').forEach(function (el) {
            el.style.setProperty('background-color', '#3d3d3d', 'important');
            el.style.setProperty('color', '#e0e0e0', 'important');
            el.style.setProperty('border-color', '#505050', 'important');
        });
        root.querySelectorAll('.d2l-popup-title, .d2l-popup-title h1').forEach(function (el) {
            el.style.setProperty('background-color', '#2d2d2d', 'important');
            el.style.setProperty('color', '#ffffff', 'important');
        });
    }

    function pollForMultiselects() {
        styleMultiselectElements(document);
        document.querySelectorAll('iframe').forEach(function (iframe) {
            try {
                const doc = iframe.contentDocument;
                if (doc && doc.body) styleMultiselectElements(doc);
            } catch (e4) { }
        });
    }

    const DARK_SELECTORS = `
        .grid_3.minHeight,
        .grid_3.minHeight *,
        .linkset8,
        .empty-state-container,
        .d2l-page-collapsepane-content,
        .d2l-page-collapsepane-content-inner,
        .d2l-page-collapsepane-content-padding,
        .d2l-user-profile-card,
        .d2l-user-profile-card *,
        .d2l-empty-state-description,
        .panel-section.side-panel,
        .panel-section.side-panel *,
        .content-div,
        .topic-display,
        .activity-viewer,
        .content-container,
        .content-loaded-wrapper,
        .vui-fileviewer,
        .vui-fileviewer-generic,
        .vui-fileviewer-generic-container,
        .vui-fileviewer-generic-main,
        .generic-header-icon-container,
        .generic-headers,
        .vui-fileviewer-generic-header,
        .vui-fileviewer-generic-subheader,
        .vui-fileviewer-icon,
        .generic-download-area,
        .vui-fileviewer-generic-size,
        .vui-fileviewer-generic-download,
        .tsMasterContent header.header,
        div.main.row,
        form[action*="/Answer/Exclude/"],
        form[action*="/Answer/SaveAnswers/"],
        .tsMasterContent .header__title,
        .tsMasterContent .header__actions,
        nav.navigation,
        .navigation__items,
        .navigation__item,
        main.main__content,
        .tsMasterContent,
        .page__title,
        .AnswerSurvey,
        .question__list,
        .question,
        .question__header,
        .question__title,
        .question__content,
        .question__item,
        .item__list,
        .item__scale,
        .scale__radios,
        .scale__label,
        .scale__options,
        .matrix,
        .matrix__header,
        .matrix__item,
        .matrix__option,
        .dropdown,
        .dropdown__list,
        .dropdown__list-item,
        .modal:not(#nagModal),
        .modal__dialog,
        .modal__content,
        .modal__header,
        .modal__footer,
        .confirm__dialog,
        .confirm__content,
        .confirm__body,
        .confirm__footer,
        footer.footer,
        .excludeForm,
        #AnswerZone,
        #QuestionZone,
        .arc-confirm,
        .d2l-course-banner-container,
        #CourseImageBannerPlaceholderId,
        .d2l-column-flip-side,
        .d2l-column-side-padding,
        .page-articlehtml,
        .container_12,
        .leftcolumn,
        .rightcolumn,
        .contentModulesContainer,
        .contentFooter,
        .contentFooter-print,
        #outercontent,
        #outercontent_0_LeftColumn,
        #outercontent_0_RightColumn,
        #outercontent_0_ContentColumn,
        #karsumForm,
        .subservicemenuHeader,
        .subservicemenu,
        .subservicemenuFooter,
        .servicemenu,
        .servicemenu *,
        .servicemenuitems,
        .servicemenuitems *,
        .grid_6.minHeight,
        .grid_6.minHeight *,
        .item.itemmenu,
        .item.separator,
        .servicemenu nav,
        .servicemenu nav *,
        .servicemenu__link-text,
        .breadcrumb.linkset6,
        .breadcrumb.linkset6 *,
        #d_content_r_c1,
        #d_content_r_c2,
        #d_content_r,
        #d_content_r_p,
        form#d2l_form,
        d2l-dropdown-context-menu,
        d2l-dropdown-menu,
        d2l-dropdown-menu-contextmenu,
        d2l-menu,
        d2l-menu-item,
        button[aria-haspopup="true"][aria-label^="Actions for"],
        d2l-dropdown-context-menu button[aria-label^="Actions for"],
        d2l-floating-buttons,
        .d2l-floating-buttons-container,
        .d2l-floating-buttons,
        .d2l-floating-buttons-inner-container,
        div[role="list"]:not(.d2l-navigation-s-main-wrapper),
        d2l-breadcrumb,
        d2l-breadcrumbs,
        d2l-breadcrumb-current-page,
        d2l-breadcrumbs a,
        d2l-breadcrumbs span,
        d2l-breadcrumbs d2l-icon,
        table.d_FG,
        table.d_FG *,
        .d_fgh,
        .fct_w,
        .fl_n,
        .fl_top
    `;

    const LIGHTER_DARK_SELECTORS = `
        .d2l-navigation-s-main-wrapper,
        .d2l-navigation-s-main-wrapper *,
        .d2l-navigation-s-item,
        .d2l-navigation-s-group,
        .d2l-navigation-s-link,
        .d2l-navigation-s-link:link,
        .d2l-navigation-s-link:visited,
        .d2l-navigation-s-link:hover,
        .d2l-navigation-s-link:active,
        .d2l-navigation-s-main-wrapper a,
        .d2l-navigation-s-main-wrapper a:link,
        .d2l-navigation-s-main-wrapper a:visited,
        .d2l-navigation-s-main-wrapper a:hover,
        .d2l-navigation-s-main-wrapper a:active,
        .dco,
        .dco_c,
        .dco a.d2l-link,
        .dco_c a.d2l-link,
        td.d_gn a.d2l-link,
        td.d_gc a.d2l-link,
        .d2l-inline,
        .d2l-inline a,
        .d2l-inline a.d2l-link,
        td.d2l-table-cell-first,
        td.d2l-table-cell-first *,
        .d2l-datalist,
        .vui-list,
        .vui-no-separator,
        ul.d2l-datalist,
        .d2l-widget-header,
        .d2l-widget-header a,
        .d2l-widget-header a.d2l-link,
        .d2l-widget-content-padding .d2l-placeholder,
        .d2l-widget .d2l-placeholder,
        .d2l-datalist-container,
        .d2l-personal-tools-list,
        .d2l-personal-tools-list li,
        .d2l-personal-tools-category-item,
        .d2l-personal-tools-separated-item,
        .d2l-personal-tools-list a.d2l-link,
        li.d2l-datalist-item,
        .d2l-datalist-item-actionable,
        .d2l-navigation-area-activity-message-content,
        .d2l-navigation-area-activity-message-wrapper,
        .d2l-navigation-area-activity-message-details,
        li.d2l-datalist-item.d2l-datalist-item-actionable,
        .d2l-datalist-item-actioncontrol,
        a.d2l-datalist-item-actioncontrol,
        .d2l-messagebucket-button-container,
        .d2l-messagebucket-button-container *,
        .d2l-messagebucket-button-container-left,
        .d2l-messagebucket-button-container-right,
        d2l-icon,
        .d2l-iterator-button,
        a.d2l-iterator-button,
        #TitlePlaceholderId,
        .d2l-link-main,
        .pageheader,
        .pageheader *,
        .pagefooter,
        .pagefooter *,
        .topmenuitems,
        .topmenuitems *,
        .dturedbackground,
        .dturedbackground *,
        .nav__dropdown,
        article.nav__dropdown
    `;

    const LESSONS_TOC_DARK1_SELECTORS = `
        .navigation-container .navigation-tree .co-content,
        .navigation-container .navigation-tree .title-container,
        .navigation-container .navigation-tree .title,
        .navigation-container .navigation-tree .title > div,
        .navigation-container .navigation-tree .title-text,
        .navigation-container .navigation-tree .title-text span,
        .navigation-container .navigation-tree .overflow-detector,
        .navigation-container .navigation-tree .overflow-detector span,
        .navigation-container .navigation-tree .text-wrapper,
        .navigation-container .navigation-tree .date-container,
        .navigation-container .navigation-tree .due-date-container
    `;

    function normalizeInlineStyleValue(value) {
        return String(value || '').replace(/\s+/g, '').toLowerCase();
    }

    function inlineStyleHasDarkFill(el, hexValue, rgbValue) {
        if (!el || !el.style) return false;
        var bgColor = normalizeInlineStyleValue(el.style.getPropertyValue('background-color'));
        var bg = normalizeInlineStyleValue(el.style.getPropertyValue('background'));
        var bgImage = normalizeInlineStyleValue(el.style.getPropertyValue('background-image'));
        var hasPriority = el.style.getPropertyPriority('background-color') === 'important'
            || el.style.getPropertyPriority('background') === 'important';
        var hasFill = bgColor === hexValue || bgColor === rgbValue || bg === hexValue || bg === rgbValue;
        var hasNoImage = (bgImage === '' || bgImage === 'none');
        return hasFill && hasNoImage && hasPriority;
    }

    function inlineStyleHasTextColor(el, hexValue, rgbValue) {
        if (!el || !el.style) return false;
        var color = normalizeInlineStyleValue(el.style.getPropertyValue('color'));
        var hasPriority = el.style.getPropertyPriority('color') === 'important';
        return hasPriority && (color === hexValue || color === rgbValue);
    }

    function forceLessonsTocDark1Element(el) {
        if (!el || !el.style) return;
        el.style.setProperty('background', '#1a1a1a', 'important');
        el.style.setProperty('background-color', '#1a1a1a', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        if (el.tagName !== 'A') el.style.setProperty('color', '#e0e0e0', 'important');
    }

    function forceLessonsTocDark1(root) {
        if (!isDarkModeEnabled()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!root) return;
        var scope = root;
        if (scope.nodeType !== 1 && scope.nodeType !== 9 && scope.nodeType !== 11) return;
        try {
            if (scope.matches && scope.matches(LESSONS_TOC_DARK1_SELECTORS)) forceLessonsTocDark1Element(scope);
        } catch (e5) { }
        if (!scope.querySelectorAll) return;
        try {
            scope.querySelectorAll(LESSONS_TOC_DARK1_SELECTORS).forEach(forceLessonsTocDark1Element);
        } catch (e6) { }
    }

    function forceD2LActionButtonsDark1(root) {
        if (!isDarkModeEnabled()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!root) return;
        var scope = root;
        if (scope.nodeType !== 1 && scope.nodeType !== 9 && scope.nodeType !== 11) return;
        try {
            if (scope.matches && scope.matches('.d2l-action-buttons, .d2l-action-buttons-list, ul.d2l-action-buttons-list, .d2l-action-buttons-item')) {
                forceLessonsTocDark1Element(scope);
            }
        } catch (e7) { }
        if (!scope.querySelectorAll) return;
        try {
            scope.querySelectorAll('.d2l-action-buttons, .d2l-action-buttons-list, ul.d2l-action-buttons-list, .d2l-action-buttons-item').forEach(forceLessonsTocDark1Element);
            scope.querySelectorAll('.d2l-action-buttons .d2l-button, .d2l-action-buttons-item .d2l-button').forEach(function (btn) {
                if (!btn || !btn.style) return;
                btn.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
                btn.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
                btn.style.setProperty('background-image', 'none', 'important');
                btn.style.setProperty('color', '#ffffff', 'important');
                btn.style.setProperty('border-color', 'var(--dtu-ad-accent-border)', 'important');
            });
        } catch (e8) { }
    }

    function disableLegacyLessonsSidebarGradient(root) {
        if (!isDarkModeEnabled()) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!root) return;
        var scope = root;
        if (scope.nodeType !== 1 && scope.nodeType !== 9 && scope.nodeType !== 11) return;
        var separatorSelector = '.d2l-box.d2l-box-h.d2l-twopanelselector-side.d2l-twopanelselector-side-sep, '
            + '.d2l-twopanelselector-side.d2l-twopanelselector-side-sep, '
            + '.d2l-twopanelselector-side-bg.d2l-twopanelselector-side-sep, '
            + '#D2L_LE_Content_Dashboard_Collapsed_Separator';
        var selectedAnchorSelector = '#ContentModuleTree #D2L_LE_Content_TreeBrowser .d2l-le-TreeAccordionItem.d2l-le-TreeAccordionItem-Selected > a.d2l-le-TreeAccordionItem-anchor, '
            + '#ContentModuleTree #ContentPluginTree .d2l-le-TreeAccordionItem.d2l-le-TreeAccordionItem-Selected > a.d2l-le-TreeAccordionItem-anchor';
        function neutralizeSeparator(el) {
            if (!el || !el.style) return;
            el.style.setProperty('border-right', 'none', 'important');
            el.style.setProperty('background', '#1a1a1a', 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('box-shadow', 'none', 'important');
            el.style.setProperty('--d2l-color-regolith', '#1a1a1a', 'important');
            el.style.setProperty('--d2l-color-gypsum', '#1a1a1a', 'important');
        }
        function neutralizeSelectedAnchor(el) {
            if (!el || !el.style) return;
            el.style.setProperty('position', 'relative', 'important');
            el.style.setProperty('overflow', 'hidden', 'important');
            el.style.setProperty('background', '#2d2d2d', 'important');
            el.style.setProperty('background-color', '#2d2d2d', 'important');
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('box-shadow', 'none', 'important');
        }
        try {
            if (scope.matches && scope.matches(separatorSelector)) neutralizeSeparator(scope);
            if (scope.matches && scope.matches(selectedAnchorSelector)) neutralizeSelectedAnchor(scope);
        } catch (e9) { }
        if (!scope.querySelectorAll) return;
        try {
            scope.querySelectorAll(separatorSelector).forEach(neutralizeSeparator);
            scope.querySelectorAll(selectedAnchorSelector).forEach(neutralizeSelectedAnchor);
        } catch (e10) { }
    }

    function isWithinNotificationIconComponent(el) {
        if (!el) return false;
        var probe = el;
        var hops = 0;
        while (probe && hops < 8) {
            try {
                if (probe.matches && probe.matches('d2l-labs-navigation-notification-icon')) return true;
                if (probe.closest && probe.closest('d2l-labs-navigation-notification-icon')) return true;
            } catch (e11) { }
            var root = null;
            try { root = probe.getRootNode ? probe.getRootNode() : null; } catch (e12) { root = null; }
            if (!root || !root.host) break;
            probe = root.host;
            hops++;
        }
        return false;
    }

    function isStudyplanModalBackgroundExemptElement(el) {
        if (!el) return false;
        if (window.location.hostname !== 'studieplan.dtu.dk') return false;
        try {
            if (el.id === 'searchCourseCatalogDialog' || el.id === 'createActivity') return true;
            if (el.closest && el.closest('#searchCourseCatalogDialog, #createActivity')) return true;
        } catch (e13) { }
        return false;
    }

    function applyDarkStyle(el) {
        if (!el || !el.style) return;
        if (isStudyplanModalBackgroundExemptElement(el)) return;
        if (window.location.hostname === 'learn.inside.dtu.dk' && el.matches) {
            try {
                if (el.matches('.d2l-labs-navigation-notification-icon-indicator')) {
                    el.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
                    el.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
                    el.style.setProperty('background-image', 'none', 'important');
                    return;
                }
                if (el.matches('d2l-icon[icon="tier3:notification-bell"], d2l-icon[icon="tier3:notification-bell"] *')) {
                    el.style.setProperty('background', 'transparent', 'important');
                    el.style.setProperty('background-color', 'transparent', 'important');
                    el.style.setProperty('background-image', 'none', 'important');
                    return;
                }
                if (isWithinNotificationIconComponent(el)) {
                    el.style.setProperty('background', 'transparent', 'important');
                    el.style.setProperty('background-color', 'transparent', 'important');
                    el.style.setProperty('background-image', 'none', 'important');
                    return;
                }
            } catch (e14) { }
        }
        if (window.location.hostname === 'campusnet.dtu.dk' && el.matches) {
            var isNavIconLayer = false;
            try {
                isNavIconLayer = el.matches('.nav__icon, .nav__icon *') || (el.closest && !!el.closest('.nav__icon'));
            } catch (e15) { isNavIconLayer = false; }
            if (isNavIconLayer) {
                el.style.setProperty('background', 'transparent', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                if (el.classList && el.classList.contains('fa-circle')) {
                    el.style.setProperty('color', 'var(--dtu-ad-accent)', 'important');
                } else if ((el.classList && el.classList.contains('fa-stack-1x'))
                    || (el.classList && el.classList.contains('fa-heart'))
                    || (el.classList && el.classList.contains('fa-user'))) {
                    el.style.setProperty('color', '#ffffff', 'important');
                }
                return;
            }
        }
        if (el.hasAttribute && el.hasAttribute('data-dtu-ext')) return;
        if (el.closest && el.closest('[data-dtu-ext]')) return;
        if (window.location.hostname === 'evaluering.dtu.dk' && el.matches) {
            if (el.matches('.question__content, .question__content > div[style*="font-size:0"]')) return;
        }
        if (isDTULearnQuizSubmissionsPage() && el.matches) {
            if (el.matches('img.d2l-histogram-barblue, td.d2l-histogram-disback1, td.d2l-histogram-disyimg2, td.d2l-histogram-xside2')) return;
        }
        if (el.closest && el.closest('.d2l-navigation-s-main-wrapper')) return;
        if (el.closest && el.closest('.pagefooter')) return;
        if (el.closest && el.closest('.topmenuitems')) return;
        if (el.closest && el.closest('.pageheader') && !el.closest('.breadcrumb.linkset6')) return;
        if (el.tagName === 'A') {
            if (inlineStyleHasDarkFill(el, '#1a1a1a', 'rgb(26,26,26)')) return;
        } else if (inlineStyleHasDarkFill(el, '#1a1a1a', 'rgb(26,26,26)')
            && inlineStyleHasTextColor(el, '#e0e0e0', 'rgb(224,224,224)')) {
            return;
        }
        el.style.setProperty('background', '#1a1a1a', 'important');
        el.style.setProperty('background-color', '#1a1a1a', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        if (el.tagName !== 'A') el.style.setProperty('color', '#e0e0e0', 'important');
    }

    function applyLighterDarkStyle(el) {
        if (!el || !el.style) return;
        if (isStudyplanModalBackgroundExemptElement(el)) return;
        if (window.location.hostname === 'learn.inside.dtu.dk' && el.matches) {
            try {
                if (el.matches('.d2l-labs-navigation-notification-icon-indicator')) {
                    el.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
                    el.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
                    el.style.setProperty('background-image', 'none', 'important');
                    return;
                }
                if (el.matches('d2l-icon[icon="tier3:notification-bell"], d2l-icon[icon="tier3:notification-bell"] *')) {
                    el.style.setProperty('background', 'transparent', 'important');
                    el.style.setProperty('background-color', 'transparent', 'important');
                    el.style.setProperty('background-image', 'none', 'important');
                    return;
                }
                if (isWithinNotificationIconComponent(el)) {
                    el.style.setProperty('background', 'transparent', 'important');
                    el.style.setProperty('background-color', 'transparent', 'important');
                    el.style.setProperty('background-image', 'none', 'important');
                    return;
                }
            } catch (e16) { }
        }
        if (window.location.hostname === 'campusnet.dtu.dk' && el.matches) {
            var isNavIconLayer = false;
            try {
                isNavIconLayer = el.matches('.nav__icon, .nav__icon *') || (el.closest && !!el.closest('.nav__icon'));
            } catch (e17) { isNavIconLayer = false; }
            if (isNavIconLayer) {
                el.style.setProperty('background', 'transparent', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                if (el.classList && el.classList.contains('fa-circle')) {
                    el.style.setProperty('color', 'var(--dtu-ad-accent)', 'important');
                } else if ((el.classList && el.classList.contains('fa-stack-1x'))
                    || (el.classList && el.classList.contains('fa-heart'))
                    || (el.classList && el.classList.contains('fa-user'))) {
                    el.style.setProperty('color', '#ffffff', 'important');
                }
                return;
            }
        }
        if (el.hasAttribute && el.hasAttribute('data-dtu-ext')) return;
        if (el.closest && el.closest('[data-dtu-ext]')) return;
        if (el.closest && el.closest('.dtu-bus-departures')) return;
        if (el.matches && el.matches('.dtu-bus-departures')) return;
        // The calendar's title/iterator header bar (and its child controls like
        // the prev/next arrows) should match the page base (#1a1a1a), not the
        // lighter panel grey. Exclude the "All Calendars" dropdown popup so it
        // keeps its panel styling. Guard against re-setting (which would
        // retrigger the mutation observer and loop), mirroring the general guard.
        if (el.id === 'TitlePlaceholderId'
            || (el.closest && el.closest('#TitlePlaceholderId') && !el.closest('d2l-dropdown-content'))) {
            if (inlineStyleHasDarkFill(el, '#1a1a1a', 'rgb(26,26,26)')
                && (el.tagName === 'A' || inlineStyleHasTextColor(el, '#e0e0e0', 'rgb(224,224,224)'))) return;
            el.style.setProperty('background', '#1a1a1a', 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('background-image', 'none', 'important');
            if (el.tagName !== 'A') el.style.setProperty('color', '#e0e0e0', 'important');
            return;
        }
        if (isDTULearnQuizSubmissionsPage() && el.matches) {
            if (el.matches('img.d2l-histogram-barblue, td.d2l-histogram-disback1, td.d2l-histogram-disyimg2, td.d2l-histogram-xside2')) return;
        }
        if (isDTULearnQuizSubmissionsPage()) {
            var graphRow = el.closest && el.closest('tr');
            if (graphRow && graphRow.querySelector && graphRow.querySelector('img[src*="Framework.GraphBar"]')) return;
        }
        if (el.closest && el.closest('table.d_FG')) return;
        if (el.matches && el.matches('.breadcrumb.linkset6')) return;
        if (el.closest && el.closest('.breadcrumb.linkset6')) return;
        if (window.location.hostname === 'learn.inside.dtu.dk'
            && el.closest
            && el.closest('.navigation-container .navigation-tree')
            && el.matches
            && el.matches('.co-content, .title-container, .title, .title > div, .title-text, .title-text span, .overflow-detector, .overflow-detector span, .text-wrapper, .date-container, .due-date-container')) {
            forceLessonsTocDark1Element(el);
            return;
        }
        if (window.location.hostname === 'learn.inside.dtu.dk'
            && el.matches
            && el.matches('.d2l-action-buttons, .d2l-action-buttons-list, ul.d2l-action-buttons-list, .d2l-action-buttons-item')) {
            forceLessonsTocDark1Element(el);
            return;
        }
        var tagName = ((el.tagName || '') + '').toLowerCase();
        var iconName = (el.getAttribute && el.getAttribute('icon')) || '';
        if (el.matches && (
            el.matches('d2l-icon.module-triangle')
            || el.matches('.module-triangle')
            || el.matches('.navigation-container .drag-handle d2l-icon')
            || el.matches('.navigation-container .upload-icon-container d2l-icon')
            || (tagName === 'd2l-icon' && (
                iconName === 'tier1:arrow-collapse-small'
                || iconName === 'tier1:arrow-expand-small'
                || iconName === 'tier1:dragger'
                || iconName === 'tier2:upload'
                || iconName === 'tier2:file-document'
            ))
            || (tagName === 'd2l-icon' && el.closest && el.closest('.navigation-container .navigation-tree .title-container'))
        )) {
            el.style.setProperty('background', '#1a1a1a', 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('color', '#e0e0e0', 'important');
            return;
        }
        if (el.tagName === 'A') {
            if (inlineStyleHasDarkFill(el, '#2d2d2d', 'rgb(45,45,45)')) return;
        } else if (inlineStyleHasDarkFill(el, '#2d2d2d', 'rgb(45,45,45)')
            && inlineStyleHasTextColor(el, '#e0e0e0', 'rgb(224,224,224)')) {
            return;
        }
        el.style.setProperty('background', '#2d2d2d', 'important');
        el.style.setProperty('background-color', '#2d2d2d', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        if (el.tagName !== 'A') el.style.setProperty('color', '#e0e0e0', 'important');
    }

    function overrideDynamicStyles(root) {
        root.querySelectorAll(DARK_SELECTORS).forEach(applyDarkStyle);
        root.querySelectorAll(LIGHTER_DARK_SELECTORS).forEach(applyLighterDarkStyle);
        try {
            forceLessonsTocDark1(document);
            if (root !== document) forceLessonsTocDark1(root);
        } catch (e18) { }
        try {
            forceD2LActionButtonsDark1(document);
            if (root !== document) forceD2LActionButtonsDark1(root);
        } catch (e19) { }
        try {
            disableLegacyLessonsSidebarGradient(document);
            if (root !== document) disableLegacyLessonsSidebarGradient(root);
        } catch (e20) { }
        root.querySelectorAll('.nav__dropdown, article.nav__dropdown').forEach(function (dropdown) {
            dropdown.querySelectorAll('a, span, h2, li, div, header').forEach(function (el) {
                el.style.setProperty('color', '#ffffff', 'important');
            });
        });
        root.querySelectorAll('.dturedbackground').forEach(forceDtuRedBackgroundDark2);
        try {
            var badgeBg = isDarkModeEnabled() ? 'var(--dtu-ad-accent)' : 'var(--dtu-ad-accent-deep)';
            var w2dBadgeBg = getResolvedAccent();
            var w2dBadgeText = getContrastTextForHex(w2dBadgeBg, '#ffffff', '#000000');
            root.querySelectorAll('.d2l-w2d-count, .d2l-w2d-heading-3-count').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', w2dBadgeBg, 'important');
                el.style.setProperty('background-color', w2dBadgeBg, 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('color', w2dBadgeText, 'important');
                el.style.setProperty('border-color', w2dBadgeBg, 'important');
            });
            root.querySelectorAll('.d2l-count-badge-number').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', badgeBg, 'important');
                el.style.setProperty('background-color', badgeBg, 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('color', '#ffffff', 'important');
                el.style.setProperty('border', '0', 'important');
                el.style.setProperty('outline', '0', 'important');
                el.style.setProperty('box-shadow', 'none', 'important');
            });
            root.querySelectorAll('.d2l-count-badge-number > div').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', 'transparent', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('color', '#ffffff', 'important');
            });
            root.querySelectorAll('.uw-text').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('color', 'var(--dtu-ad-accent)', 'important');
            });
        } catch (e21) { }
    }

    function setupStyleObserver(root) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const el = mutation.target;
                    try {
                        if (el && el.closest && el.closest('.navigation-container .navigation-tree')) forceLessonsTocDark1(el);
                    } catch (e22) { }
                    try { forceD2LActionButtonsDark1(el); } catch (e23) { }
                    try { disableLegacyLessonsSidebarGradient(el); } catch (e24) { }
                    if (el.matches && el.matches(LIGHTER_DARK_SELECTORS)) {
                        applyLighterDarkStyle(el);
                    } else if (el.matches && el.matches(DARK_SELECTORS)) {
                        applyDarkStyle(el);
                    }
                }
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType !== 1) return;
                        try {
                            if (node.closest && node.closest('.navigation-container .navigation-tree')) forceLessonsTocDark1(node);
                        } catch (e25) { }
                        try { forceD2LActionButtonsDark1(node); } catch (e26) { }
                        try { disableLegacyLessonsSidebarGradient(node); } catch (e27) { }
                        if (node.matches && node.matches(DARK_SELECTORS)) applyDarkStyle(node);
                        if (node.matches && node.matches(LIGHTER_DARK_SELECTORS)) applyLighterDarkStyle(node);
                        if (node.querySelectorAll) {
                            node.querySelectorAll(DARK_SELECTORS).forEach(applyDarkStyle);
                            node.querySelectorAll(LIGHTER_DARK_SELECTORS).forEach(applyLighterDarkStyle);
                            forceLessonsTocDark1(node);
                            forceD2LActionButtonsDark1(node);
                            disableLegacyLessonsSidebarGradient(node);
                        }
                    });
                }
            });
        });
        observer.observe(root, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            childList: true,
            subtree: true
        });
        return observer;
    }

    function pollOverrideDynamicStyles() {
        overrideDynamicStyles(document);
        document.querySelectorAll('iframe').forEach(function (iframe) {
            try {
                const doc = iframe.contentDocument;
                if (doc && doc.body) {
                    if (doc.querySelector('.navigation-container') || doc.querySelector('d2l-lessons-toc')) return;
                    overrideDynamicStyles(doc);
                    if (!iframe._darkModeObserver) iframe._darkModeObserver = setupStyleObserver(doc.documentElement);
                }
            } catch (e28) { }
        });
    }

    function isInsideExcludedContainer(element) {
        let parent = element;
        while (parent) {
            if (parent.id === 'viewer'
                || (parent.classList && (parent.classList.contains('pdfViewer') || parent.classList.contains('pdf-viewer')))) {
                return true;
            }
            if (parent.tagName && parent.tagName.toLowerCase() === 'd2l-labs-media-player') return true;
            if (parent.id === 'player' || (parent.id && parent.id.includes('d2l-labs-media-player'))) return true;
            parent = parent.parentElement;
        }
        return false;
    }

    function usesBrightspaceShadowDom() {
        var host = window.location.hostname;
        return host === 'learn.inside.dtu.dk' || host === 's.brightspace.com';
    }

    function shouldUseBrightspaceShadowDomProcessing() {
        if (!usesBrightspaceShadowDom()) return false;
        if (isLegacyHeavyPage()) return false;
        return true;
    }

    function processElement(element) {
        if (!element || element.nodeType !== 1) return;
        if (!shouldUseBrightspaceShadowDomProcessing()) return;
        if (isInsideExcludedContainer(element)) return;
        function processNode(node) {
            if (!node || node.nodeType !== 1) return;
            if (shouldExcludeElement(node) || isInsideExcludedContainer(node)) return;
            if (node.shadowRoot) injectStylesIntoShadowRoot(node.shadowRoot, node);
            else scheduleShadowHostRetry(node);
        }
        processNode(element);
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, null);
        let child = walker.nextNode();
        while (child) {
            processNode(child);
            child = walker.nextNode();
        }
        processHtmlBlocks(element);
        processIframes(element);
    }

    function sweepForLateShadowRoots(root) {
        if (!isDarkModeEnabled()) return;
        if (!shouldUseBrightspaceShadowDomProcessing()) return;
        var baseRoot = root && root.nodeType === 1 ? root : (document.body || document.documentElement);
        if (!baseRoot) return;
        function processCandidate(node) {
            if (!node || node.nodeType !== 1 || !node.tagName) return;
            if (!node.tagName.toLowerCase().startsWith('d2l-')) return;
            if (shouldExcludeElement(node) || isInsideExcludedContainer(node)) return;
            if (node.shadowRoot) injectStylesIntoShadowRoot(node.shadowRoot, node);
            else scheduleShadowHostRetry(node);
        }
        processCandidate(baseRoot);
        var walker = document.createTreeWalker(baseRoot, NodeFilter.SHOW_ELEMENT, null);
        var node = walker.nextNode();
        while (node) {
            processCandidate(node);
            node = walker.nextNode();
        }
    }

    function processIframeShadowTree(doc, rootNode) {
        if (!doc || !rootNode || !shouldUseBrightspaceShadowDomProcessing()) return;

        function processCandidate(node) {
            if (!node || node.nodeType !== 1 || !node.tagName) return;
            if (!node.tagName.toLowerCase().startsWith('d2l-')) return;
            if (shouldExcludeElement(node) || isInsideExcludedContainer(node)) return;
            if (node.shadowRoot) injectStylesIntoShadowRoot(node.shadowRoot, node);
            else scheduleShadowHostRetry(node);
        }

        processCandidate(rootNode);
        var view = doc.defaultView;
        var showElement = view && view.NodeFilter ? view.NodeFilter.SHOW_ELEMENT : 1;
        var walker;
        try {
            walker = doc.createTreeWalker(rootNode, showElement, null);
        } catch (e0) {
            return;
        }
        var node = walker.nextNode();
        while (node) {
            processCandidate(node);
            node = walker.nextNode();
        }
    }

    function observeIframeShadowRoots(doc) {
        if (!doc || !doc.documentElement || doc._dtuDarkModeShadowObserver) return;
        var view = doc.defaultView;
        if (!view || !view.MutationObserver) return;
        try {
            var observer = new view.MutationObserver(function (mutations) {
                for (var i = 0; i < mutations.length; i++) {
                    var mutation = mutations[i];
                    if (mutation.type !== 'childList') continue;
                    for (var j = 0; j < mutation.addedNodes.length; j++) {
                        var added = mutation.addedNodes[j];
                        if (added && added.nodeType === 1) processIframeShadowTree(doc, added);
                    }
                }
            });
            observer.observe(doc.documentElement, { childList: true, subtree: true });
            doc._dtuDarkModeShadowObserver = observer;
        } catch (e0) { }
    }

    function processIframes(root) {
        const iframes = [];
        if (root.matches && root.matches('iframe')) iframes.push(root);
        root.querySelectorAll('iframe').forEach(function (iframe) { iframes.push(iframe); });
        iframes.forEach(function (iframe) {
            try {
                const src = iframe.src || '';
                if (src.includes('pdf') || src.includes('viewer') || src.includes('.pdf')) return;
                const doc = iframe.contentDocument;
                if (!doc || !doc.documentElement) return;
                if (doc.getElementById('viewer')
                    || doc.querySelector('.pdfViewer')
                    || doc.querySelector('.pdf-viewer')
                    || doc.querySelector('[data-page-number]')) {
                    return;
                }
                let style = doc.getElementById('dark-mode-iframe-styles');
                if (!style) {
                    style = doc.createElement('style');
                    style.id = 'dark-mode-iframe-styles';
                    style.textContent = iframeStyles;
                    doc.head.appendChild(style);
                } else if (style.textContent !== iframeStyles) {
                    style.textContent = iframeStyles;
                }
                processIframeShadowTree(doc, doc.documentElement);
                observeIframeShadowRoots(doc);
            } catch (error) { }
        });
    }

    async function waitForCustomElements() {
        const elementsToWait = ['d2l-enrollment-card', 'd2l-card', 'd2l-html-block', 'd2l-icon'];
        const promises = elementsToWait.map(function (tagName) {
            // customElements can be null in sandboxed frames; never throw here.
            try {
                if (!window.customElements || typeof customElements.whenDefined !== 'function') return Promise.resolve();
                if (customElements.get(tagName)) return Promise.resolve();
                return customElements.whenDefined(tagName).catch(function () { return Promise.resolve(); });
            } catch (eCeNull) { return Promise.resolve(); }
        });
        return Promise.race([
            Promise.all(promises),
            new Promise(function (resolve) { setTimeout(resolve, 3000); })
        ]);
    }

    function enforcePageBackground() {
        document.documentElement.style.setProperty('background-color', '#1a1a1a', 'important');
        document.documentElement.style.setProperty('background', '#1a1a1a', 'important');
        if (document.body) {
            document.body.style.setProperty('background-color', '#1a1a1a', 'important');
            document.body.style.setProperty('background', '#1a1a1a', 'important');
        }
    }

    function runDarkModeChecks(rootNode) {
        if (!isDarkModeEnabled()) return;
        var useBrightspaceShadowDom = shouldUseBrightspaceShadowDomProcessing();
        if (rootNode && rootNode.nodeType === 1) {
            if (useBrightspaceShadowDom) {
                processElement(rootNode);
                sweepForLateShadowRoots(rootNode);
                try { replaceLogoImage(rootNode); } catch (eLogoRc) { }
                try { styleQuizSubmissionHistogram(rootNode); } catch (eQuizRc) { }
            } else {
                preserveTypeboxColors(rootNode);
            }
            return;
        }
        enforcePageBackground();
        if (useBrightspaceShadowDom) {
            pollForHtmlBlocks();
            pollForMultiselects();
            pollOverrideDynamicStyles();
            if (document.body) processElement(document.body);
            sweepForLateShadowRoots();
            try { replaceLogoImage(); } catch (eLogoRf) { }
            try { styleQuizSubmissionHistogram(); } catch (eQuizRf) { }
        }
        preserveTypeboxColors();
    }

    globalThis.DTUAfterDarkDarkEngine = {
        getDarkText: function () { return DARK_TEXT; },
        getDarkBorder: function () { return DARK_BORDER; },
        getDarkSelectors: function () { return DARK_SELECTORS; },
        getLighterDarkSelectors: function () { return LIGHTER_DARK_SELECTORS; },
        usesBrightspaceShadowDom: usesBrightspaceShadowDom,
        shouldUseBrightspaceShadowDomProcessing: shouldUseBrightspaceShadowDomProcessing,
        shouldExcludeElement: shouldExcludeElement,
        injectStylesIntoShadowRoot: injectStylesIntoShadowRoot,
        observeInjectedShadowRoot: observeInjectedShadowRoot,
        processHtmlBlocks: processHtmlBlocks,
        pollForHtmlBlocks: pollForHtmlBlocks,
        pollForMultiselects: pollForMultiselects,
        forceLessonsTocDark1: forceLessonsTocDark1,
        forceD2LActionButtonsDark1: forceD2LActionButtonsDark1,
        disableLegacyLessonsSidebarGradient: disableLegacyLessonsSidebarGradient,
        applyDarkStyle: applyDarkStyle,
        applyLighterDarkStyle: applyLighterDarkStyle,
        setupStyleObserver: setupStyleObserver,
        pollOverrideDynamicStyles: pollOverrideDynamicStyles,
        processElement: processElement,
        sweepForLateShadowRoots: sweepForLateShadowRoots,
        processIframes: processIframes,
        waitForCustomElements: waitForCustomElements,
        runDarkModeChecks: runDarkModeChecks
    };

    if (isDarkModeEnabled()) {
        enforcePageBackground();
        pollOverrideDynamicStyles();
        function initialize() {
            // Immediate pass: styles whatever is already upgraded and registers
            // whenDefined watchers/retries for everything that is not.
            if (shouldUseBrightspaceShadowDomProcessing() && document.body) {
                processElement(document.body);
            }
            waitForCustomElements().then(function () {
                if (shouldUseBrightspaceShadowDomProcessing() && document.body) {
                    processElement(document.body);
                }
            });
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            initialize();
        }
    }
})();
