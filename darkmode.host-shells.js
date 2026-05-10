(function () {
    'use strict';

    function getDeps() {
        try { return globalThis.DTUAfterDarkHostShellDeps || null; } catch (e0) { return null; }
    }

    function isTopWindow() {
        var deps = getDeps();
        return !!(deps && typeof deps.isTopWindow === 'function' && deps.isTopWindow());
    }

    function isDarkModeEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDarkModeEnabled === 'function' && deps.isDarkModeEnabled());
    }

    function getResolvedAccentDeep() {
        var deps = getDeps();
        if (deps && typeof deps.getResolvedAccentDeep === 'function') {
            return deps.getResolvedAccentDeep();
        }
        return '#990000';
    }

    function getAccentThemeById(id) {
        var deps = getDeps();
        if (deps && typeof deps.getAccentThemeById === 'function') {
            return deps.getAccentThemeById(id);
        }
        return null;
    }

    function getAccentThemeId() {
        var deps = getDeps();
        if (deps && typeof deps.getAccentThemeId === 'function') {
            return deps.getAccentThemeId();
        }
        return '';
    }

    function fixEvalueringResultCharts() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'evaluering.dtu.dk') return;

        document.querySelectorAll('.mx-s.hide-on-print, .mx-s.hide-on-print .flex.flex--content-between').forEach(function (row) {
            row.style.setProperty('background', 'transparent', 'important');
            row.style.setProperty('background-color', 'transparent', 'important');
            row.style.setProperty('height', 'auto', 'important');
            row.style.setProperty('min-height', '0', 'important');
        });

        document.querySelectorAll('.comparison__legend > .legend__header').forEach(function (header) {
            var bg = '';
            try {
                bg = window.getComputedStyle(header).backgroundColor || '';
            } catch (e0) { }
            if (bg === 'rgb(0, 0, 0)') {
                header.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                header.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                header.style.setProperty('color', '#ffffff', 'important');
            }
        });

        document.querySelectorAll('canvas[id^="CanvasQuestion_"]').forEach(function (canvas) {
            canvas.style.setProperty('background', 'transparent', 'important');
            canvas.style.setProperty('background-color', 'transparent', 'important');

            var wrap = canvas.parentElement;
            if (wrap && wrap.style) {
                wrap.style.setProperty('background', 'transparent', 'important');
                wrap.style.setProperty('background-color', 'transparent', 'important');
            }

            var content = canvas.closest('.question__content');
            if (content && content.style) {
                content.style.setProperty('background', 'transparent', 'important');
                content.style.setProperty('background-color', 'transparent', 'important');
            }
        });
    }

    function fixCampusnetHeaderStyling() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'campusnet.dtu.dk') return;

        function clearInlineForSelector(selector, props) {
            document.querySelectorAll(selector).forEach(function (el) {
                if (!el || !el.style) return;
                props.forEach(function (prop) { el.style.removeProperty(prop); });
            });
        }

        function applyCampusnetAccentElements() {
            var accentThemeId = getAccentThemeId();
            var accentDeepHex = getResolvedAccentDeep();
            var theme = getAccentThemeById(accentThemeId) || {};
            var accentDeepHoverHex = theme.accentDeepHover || '#990000';
            var accentHex = theme.accent || '#990000';
            var accentHoverHex = theme.accentHover || '#b30000';
            var accentSoftHex = theme.accentSoft || accentHex;
            var linkColor = isDarkModeEnabled() ? accentSoftHex : accentDeepHex;
            var linkHoverColor = isDarkModeEnabled() ? accentHex : accentHoverHex;

            document.querySelectorAll('.widget__header').forEach(function (header) {
                if (!header || !header.style) return;
                header.style.setProperty('background', accentDeepHex, 'important');
                header.style.setProperty('background-color', accentDeepHex, 'important');
                header.style.setProperty('border-bottom-color', accentDeepHoverHex, 'important');
                header.style.setProperty('color', '#ffffff', 'important');
            });

            document.querySelectorAll('.widget__header .widget__title, h2.widget__title').forEach(function (title) {
                if (!title || !title.style) return;
                title.style.setProperty('color', '#ffffff', 'important');
                title.style.setProperty('background', 'transparent', 'important');
                title.style.setProperty('background-color', 'transparent', 'important');
            });

            document.querySelectorAll('.widget__header .widget__icon, .widget__header .widget__icon .service-icon').forEach(function (wrap) {
                if (!wrap || !wrap.style) return;
                wrap.style.setProperty('background', 'transparent', 'important');
                wrap.style.setProperty('background-color', 'transparent', 'important');
                wrap.style.setProperty('border', '0', 'important');
                wrap.style.setProperty('border-radius', '999px', 'important');
                wrap.style.setProperty('box-shadow', 'none', 'important');
                wrap.style.setProperty('overflow', 'hidden', 'important');
            });
            document.querySelectorAll('.widget__header .widget__icon .icon__base').forEach(function (base) {
                if (!base || !base.style) return;
                base.style.setProperty('background', 'transparent', 'important');
                base.style.setProperty('background-color', 'transparent', 'important');
                base.style.setProperty('background-image', 'none', 'important');
                base.style.setProperty('border', '0', 'important');
                base.style.setProperty('opacity', '0', 'important');
            });
            document.querySelectorAll('.widget__header .widget__icon .icon__content').forEach(function (icon) {
                if (!icon || !icon.style) return;
                icon.style.setProperty('background', accentHex, 'important');
                icon.style.setProperty('background-color', accentHex, 'important');
                icon.style.setProperty('border-color', accentHex, 'important');
                icon.style.setProperty('border-radius', '999px', 'important');
                icon.style.setProperty('color', '#ffffff', 'important');
                icon.style.setProperty('fill', '#ffffff', 'important');
                icon.style.setProperty('stroke', '#ffffff', 'important');
            });
            document.querySelectorAll('.widget__header .widget__icon .icon__identifier').forEach(function (icon) {
                if (!icon || !icon.style) return;
                icon.style.setProperty('background', 'transparent', 'important');
                icon.style.setProperty('background-color', 'transparent', 'important');
                icon.style.setProperty('color', '#ffffff', 'important');
                icon.style.setProperty('fill', '#ffffff', 'important');
                icon.style.setProperty('stroke', '#ffffff', 'important');
            });

            document.querySelectorAll('.nav__icon .fa-circle').forEach(function (icon) {
                if (!icon || !icon.style) return;
                icon.style.setProperty('color', accentHex, 'important');
            });
            document.querySelectorAll('.nav__icon .fa-stack-1x, .nav__icon .fa-heart, .nav__icon .fa-user').forEach(function (icon) {
                if (!icon || !icon.style) return;
                icon.style.setProperty('color', '#ffffff', 'important');
            });
            document.querySelectorAll('.nav__icon, .nav__icon .fa-stack, .nav__icon i').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', 'transparent', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('border', '0', 'important');
                el.style.setProperty('box-shadow', 'none', 'important');
            });

            document.querySelectorAll('.group-menu__item, .group-menu__item-burger').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', accentDeepHex, 'important');
                el.style.setProperty('background-color', accentDeepHex, 'important');
                el.style.setProperty('border-color', accentDeepHex, 'important');
            });
            document.querySelectorAll('.group-menu__item header, .group-menu__item-burger header').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', accentDeepHex, 'important');
                el.style.setProperty('background-color', accentDeepHex, 'important');
                el.style.setProperty('border-color', isDarkModeEnabled() ? '#404040' : accentDeepHex, 'important');
            });

            if (!isDarkModeEnabled()) {
                document.querySelectorAll(
                    '.header__top a[href*="/cnnet/frontpage"] td span > b, '
                    + '.header__top a[href*="/cnnet/frontpage"] td span'
                ).forEach(function (el) {
                    if (!el || !el.style) return;
                    el.style.setProperty('color', '#000000', 'important');
                });
                document.querySelectorAll('.header__top a[href*="/cnnet/frontpage"]').forEach(function (a) {
                    if (!a || !a.style) return;
                    a.querySelectorAll('span, b').forEach(function (el) {
                        if (!el || !el.style) return;
                        var txt = '';
                        try { txt = (el.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(); } catch (eTxt0) { txt = ''; }
                        if (!txt) return;
                        if (/^cn inside$/i.test(txt)) {
                            el.style.setProperty('color', '#000000', 'important');
                        }
                    });
                });
                document.querySelectorAll('section.header .header__top .ml-s, section.header .header__top .ml-s span').forEach(function (el) {
                    if (!el || !el.style) return;
                    el.style.setProperty('color', '#000000', 'important');
                });
                var headerTop = document.querySelector('section.header .header__top, .header__top');
                if (headerTop) {
                    headerTop.querySelectorAll('a, span').forEach(function (el) {
                        if (!el || !el.style) return;
                        if (el.closest('.nav__icon, .fa-stack, .service-icon, .icon__content, .icon__identifier')) return;
                        var txt = '';
                        try { txt = (el.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(); } catch (eTxt) { txt = ''; }
                        if (!txt) return;
                        if (/^dansk$/i.test(txt) || /\(s\d{6,}\)/i.test(txt)) {
                            el.style.setProperty('color', '#000000', 'important');
                        }
                    });
                }

                document.querySelectorAll('.groupLinksTable a.item__link, .groupLinksTable a.item__link .item__title, a.item__link[href*="/participants"] .item__title, a.item__link[href*="/calendar/default.aspx"] .item__title, a.item__link[href*="/mcq"] .item__title').forEach(function (el) {
                    if (!el || !el.style) return;
                    el.style.setProperty('color', '#000000', 'important');
                });
                document.querySelectorAll('nav#breadcrumb.actualbreadcrumb a[href="/cnnet/"]').forEach(function (el) {
                    if (!el || !el.style) return;
                    el.style.setProperty('color', '#000000', 'important');
                });
            }

            document.querySelectorAll('.widget a[href], .widget__body a[href], .widget__content a[href]').forEach(function (a) {
                if (!a || !a.style) return;
                if (a.closest('nav, #breadcrumb, .nav__dropdown, .group-menu__item, .group-menu__item-burger')) return;
                if (!isDarkModeEnabled() && (a.matches('.groupLinksTable a.item__link') || a.closest('.groupLinksTable'))) return;
                var cls = (a.className || '').toString();
                if (/\barc-button\b/.test(cls)) return;
                a.style.setProperty('color', linkColor, 'important');
                if (!a.hasAttribute('data-dtu-accent-link')) {
                    a.setAttribute('data-dtu-accent-link', '1');
                    a.addEventListener('mouseenter', function () {
                        try { a.style.setProperty('color', linkHoverColor, 'important'); } catch (e1) { }
                    }, true);
                    a.addEventListener('mouseleave', function () {
                        try { a.style.setProperty('color', linkColor, 'important'); } catch (e2) { }
                    }, true);
                }
            });

            var gradesTable = document.querySelector('table.gradesList');
            if (gradesTable) {
                gradesTable.querySelectorAll('tr.gradesListHeader td a').forEach(function (a) {
                    if (!a || !a.style) return;
                    a.style.setProperty('color', linkColor, 'important');
                    if (!a.hasAttribute('data-dtu-accent-link')) {
                        a.setAttribute('data-dtu-accent-link', '1');
                        a.addEventListener('mouseenter', function () {
                            try { a.style.setProperty('color', linkHoverColor, 'important'); } catch (e3) { }
                        }, true);
                        a.addEventListener('mouseleave', function () {
                            try { a.style.setProperty('color', linkColor, 'important'); } catch (e4) { }
                        }, true);
                    }
                });
                gradesTable.querySelectorAll('tr.context_direct, tr.context_alternating').forEach(function (row) {
                    if (!row) return;
                    var firstTd = row.querySelector('td:first-child');
                    if (!firstTd) return;
                    var link = firstTd.querySelector('a');
                    if (link) {
                        link.style.setProperty('color', linkColor, 'important');
                        if (!link.hasAttribute('data-dtu-accent-link')) {
                            link.setAttribute('data-dtu-accent-link', '1');
                            link.addEventListener('mouseenter', function () {
                                try { link.style.setProperty('color', linkHoverColor, 'important'); } catch (e5) { }
                            }, true);
                            link.addEventListener('mouseleave', function () {
                                try { link.style.setProperty('color', linkColor, 'important'); } catch (e6) { }
                            }, true);
                        }
                    } else {
                        firstTd.style.setProperty('color', linkColor, 'important');
                    }
                });
            }

            function forceAccentBorder(el) {
                if (!el || !el.style) return;
                el.style.setProperty('border-color', accentDeepHex, 'important');
                el.style.setProperty('border-top-color', accentDeepHex, 'important');
                el.style.setProperty('border-right-color', accentDeepHex, 'important');
                el.style.setProperty('border-bottom-color', accentDeepHex, 'important');
                el.style.setProperty('border-left-color', accentDeepHex, 'important');
            }

            document.querySelectorAll(
                '.nav__dropdown, article.nav__dropdown, '
                + '.nav__dropdown--group, article.nav__dropdown--group, '
                + '.flex--last, .nav__dropdown .flex--last'
            ).forEach(forceAccentBorder);
            if (isDarkModeEnabled()) {
                document.querySelectorAll(
                    '.nav__dropdown, article.nav__dropdown, '
                    + '.nav__dropdown--group, article.nav__dropdown--group, '
                    + '.flex--last, .nav__dropdown .flex--last'
                ).forEach(function (el) {
                    if (!el || !el.style) return;
                    el.style.setProperty('background', '#2d2d2d', 'important');
                    el.style.setProperty('background-color', '#2d2d2d', 'important');
                    el.style.setProperty('border-color', '#404040', 'important');
                });
                document.querySelectorAll('.group-multi-column').forEach(function (el) {
                    if (!el || !el.style) return;
                    el.style.setProperty('background', '#2d2d2d', 'important');
                    el.style.setProperty('background-color', '#2d2d2d', 'important');
                });
            }

            document.querySelectorAll('.group-menu__item-burger').forEach(function (section) {
                forceAccentBorder(section);
                var header = section.querySelector(':scope > header');
                if (header && header.style) {
                    header.style.setProperty('background-color', accentDeepHex, 'important');
                    header.style.setProperty('background', accentDeepHex, 'important');
                }
                var title = section.querySelector('h2.item__title');
                if (title && title.style) {
                    title.style.setProperty('background', 'transparent', 'important');
                    title.style.setProperty('background-color', 'transparent', 'important');
                    title.style.setProperty('background-image', 'none', 'important');
                    title.style.setProperty('color', '#ffffff', 'important');
                }
                var icon = section.querySelector('.group-menu__item-burger-expander');
                if (icon && icon.style) {
                    icon.style.setProperty('background', 'transparent', 'important');
                    icon.style.setProperty('background-color', 'transparent', 'important');
                    icon.style.setProperty('background-image', 'none', 'important');
                    icon.style.setProperty('color', '#ffffff', 'important');
                }
            });
        }

        if (!isDarkModeEnabled()) {
            clearInlineForSelector(
                '.nav__dropdown--group a, '
                + 'article.nav__dropdown--group a, '
                + '.group-menu__item a, '
                + '.group-menu__item-burger a, '
                + 'nav#breadcrumb.actualbreadcrumb, '
                + 'nav#breadcrumb.actualbreadcrumb a, '
                + 'nav#breadcrumb.actualbreadcrumb a.last, '
                + 'article.header__search #searchTextfield, '
                + '.header__search #searchTextfield, '
                + 'main.main.arc-row, '
                + 'main.main.arc-row > section.main__content#koContainer, '
                + 'main.main.arc-row > section.main__content#koContainer > #ctl00_ContentBox.main__content--box, '
                + '#ctl00_ContentBox.main__content--box, '
                + '#ctl00_ContentBox.main__content--box > .gradesPage, '
                + '#ctl00_ContentBox.main__content--box > .gradesPage > form#aspnetForm, '
                + '#ctl00_ContentBox.main__content--box > .gradesPage > form#aspnetForm > div, '
                + '.gradesPoints > h2, '
                + '.gradesPublicationTitle, '
                + '.gradesPdfTitle, '
                + '.gradesDtuPaperTitle, '
                + '.gradesPublishedResultsTitle, '
                + '.gradesPoints > table:not(.gradesList), '
                + '.gradesPoints > table:not(.gradesList) tr, '
                + '.gradesPoints > table:not(.gradesList) td, '
                + '.messageText, '
                + '.messageText .postTeaser, '
                + '.messageText .messageTruncatebar, '
                + '.messageTruncatebar, '
                + '.arc-toolbar.mb-l, '
                + '.arc-toolbar.mb-l .flex, '
                + '.arc-toolbar.mb-l .filter-participants, '
                + '.arc-toolbar.mb-l .arc-buttongroup--multi, '
                + '.arc-toolbar.mb-l .arc-dropdown, '
                + '.arc-toolbar.mb-l .arc-dropdown__text, '
                + '.arc-toolbar.mb-l #query, '
                + '.arc-toolbar.mb-l input[type="text"], '
                + '.arc-toolbar.mb-l .arc-button, '
                + '.arc-toolbar.mb-l .arc-button--hollow-default, '
                + '.arc-toolbar.mb-l .arc-button--medium, '
                + '.arc-toolbar.mb-l .arc-dropdown__list, '
                + '.arc-toolbar.mb-l .arc-dropdown__list-item, '
                + '.ui-participant-informationbox, '
                + '.ui-participant-informationbox.participant-active, '
                + '.ui-participant-placeholder, '
                + '.ui-participants-infolist, '
                + '.ui-participant-infobox, '
                + '.ui-participant-infobox .info-header',
                [
                    'background',
                    'background-color',
                    'background-image',
                    'color',
                    'border-color',
                    'border-top-color',
                    'filter',
                    'mix-blend-mode'
                ]
            );
            applyCampusnetAccentElements();
            return;
        }

        document.querySelectorAll('.nav__dropdown--group a, article.nav__dropdown--group a, .group-menu__item a, .group-menu__item-burger a').forEach(function (link) {
            if (!link || !link.style) return;
            link.style.setProperty('color', '#e0e0e0', 'important');
        });

        try {
            document.querySelectorAll('h4.category__title').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                el.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                el.style.setProperty('color', '#ffffff', 'important');
            });
            document.querySelectorAll('h4.category__title a, h4.category__title .arc-menu-burger-expander, h4.category__title .toggle-category').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('color', '#ffffff', 'important');
            });
        } catch (e7) { }

        try {
            var iconKinds = '.icon--messages, .icon--events, .icon--filesharing, .icon--mcq, .icon--mcq-small, .icon--participants, .icon--participants-small, .icon--calendar, .icon--calendar-small';
            document.querySelectorAll('span.service-icon, span.item__icon').forEach(function (wrap) {
                if (!wrap || !wrap.querySelector) return;
                var hasKind = false;
                try { hasKind = !!wrap.querySelector('.icon__content' + iconKinds + ', .icon__identifier' + iconKinds); } catch (e8) { hasKind = false; }
                if (!hasKind) return;

                if (wrap.style) {
                    wrap.style.setProperty('background', 'transparent', 'important');
                    wrap.style.setProperty('background-color', 'transparent', 'important');
                    wrap.style.setProperty('border', '0', 'important');
                    wrap.style.setProperty('border-color', 'transparent', 'important');
                    wrap.style.setProperty('border-radius', '999px', 'important');
                    wrap.style.setProperty('box-shadow', 'none', 'important');
                    wrap.style.setProperty('overflow', 'hidden', 'important');
                }

                var base = null;
                try { base = wrap.querySelector('.icon__base'); } catch (e9) { base = null; }
                if (base && base.style) {
                    base.style.setProperty('background', 'transparent', 'important');
                    base.style.setProperty('background-color', 'transparent', 'important');
                    base.style.setProperty('border-color', 'transparent', 'important');
                    base.style.setProperty('background-image', 'none', 'important');
                    base.style.setProperty('border', '0', 'important');
                    base.style.setProperty('box-shadow', 'none', 'important');
                    base.style.setProperty('opacity', '0', 'important');
                }

                wrap.querySelectorAll('.icon__content').forEach(function (icon) {
                    if (!icon || !icon.style) return;
                    icon.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
                    icon.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
                    icon.style.setProperty('border-color', 'var(--dtu-ad-accent)', 'important');
                    icon.style.setProperty('border-radius', '999px', 'important');
                    icon.style.setProperty('color', '#ffffff', 'important');
                    icon.style.setProperty('fill', '#ffffff', 'important');
                    icon.style.setProperty('stroke', '#ffffff', 'important');
                    icon.style.removeProperty('filter');
                    icon.style.removeProperty('mix-blend-mode');
                });
                wrap.querySelectorAll('.icon__identifier').forEach(function (icon) {
                    if (!icon || !icon.style) return;
                    icon.style.setProperty('background', 'transparent', 'important');
                    icon.style.setProperty('background-color', 'transparent', 'important');
                    icon.style.setProperty('color', '#ffffff', 'important');
                    icon.style.setProperty('fill', '#ffffff', 'important');
                    icon.style.setProperty('stroke', '#ffffff', 'important');
                    icon.style.removeProperty('filter');
                    icon.style.removeProperty('mix-blend-mode');
                });
            });
        } catch (e10) { }

        try {
            document.querySelectorAll('.box.mainContentPageTemplate .boxHeader').forEach(function (h) {
                if (!h || !h.style) return;
                h.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                h.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                h.style.setProperty('border-bottom', '2px solid var(--dtu-ad-accent-deep-hover)', 'important');
            });
            document.querySelectorAll('.box.mainContentPageTemplate .boxHeader h2').forEach(function (h2) {
                if (!h2 || !h2.style) return;
                h2.style.setProperty('background-color', 'transparent', 'important');
                h2.style.setProperty('background', 'transparent', 'important');
                h2.style.setProperty('color', '#ffffff', 'important');
            });
            document.querySelectorAll('#afrapporteringWidget .boxHeader').forEach(function (h) {
                if (!h || !h.style) return;
                h.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                h.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                h.style.setProperty('border-bottom', '2px solid var(--dtu-ad-accent-deep-hover)', 'important');
            });
            document.querySelectorAll('#afrapporteringWidget .boxHeader h2').forEach(function (h2) {
                if (!h2 || !h2.style) return;
                h2.style.setProperty('color', '#ffffff', 'important');
            });
            document.querySelectorAll('#afrapporteringWidget .lessonplan__progressbar .progressbar__percentage').forEach(function (p) {
                if (!p || !p.style) return;
                p.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
                p.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
            });
            document.querySelectorAll('.box.widget .boxHeader').forEach(function (h) {
                if (!h || !h.style) return;
                h.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                h.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                h.style.setProperty('border-bottom', '2px solid var(--dtu-ad-accent-deep-hover)', 'important');
            });
            document.querySelectorAll('.box.widget .boxHeader h2').forEach(function (h2) {
                if (!h2 || !h2.style) return;
                h2.style.setProperty('color', '#ffffff', 'important');
            });
        } catch (e11) { }

        var breadcrumb = document.querySelector('nav#breadcrumb.actualbreadcrumb');
        if (breadcrumb && breadcrumb.style) {
            breadcrumb.style.setProperty('background', '#2d2d2d', 'important');
            breadcrumb.style.setProperty('background-color', '#2d2d2d', 'important');
            breadcrumb.style.setProperty('color', '#e0e0e0', 'important');
        }

        document.querySelectorAll('nav#breadcrumb.actualbreadcrumb a, nav#breadcrumb.actualbreadcrumb a.last').forEach(function (link) {
            if (!link || !link.style) return;
            link.style.setProperty('background', '#2d2d2d', 'important');
            link.style.setProperty('background-color', '#2d2d2d', 'important');
            link.style.setProperty('color', '#e0e0e0', 'important');
        });

        var searchInput = document.querySelector('article.header__search #searchTextfield, .header__search #searchTextfield');
        if (searchInput && searchInput.style) {
            searchInput.style.setProperty('background', '#1a1a1a', 'important');
            searchInput.style.setProperty('background-color', '#1a1a1a', 'important');
            searchInput.style.setProperty('color', '#e0e0e0', 'important');
            searchInput.style.setProperty('border-color', '#505050', 'important');
        }

        try {
            document.querySelectorAll(
                '.arc-toolbar.mb-l, '
                + 'article.arc-toolbar.mb-l, '
                + '.arc-toolbar.mb-l .flex, '
                + '.arc-toolbar.mb-l .filter-participants, '
                + '.arc-toolbar.mb-l .arc-buttongroup--multi, '
                + '.arc-toolbar.mb-l .arc-dropdown, '
                + '.arc-toolbar.mb-l .arc-dropdown__text'
            ).forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', '#1a1a1a', 'important');
                el.style.setProperty('background-color', '#1a1a1a', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('color', '#e0e0e0', 'important');
            });
            document.querySelectorAll(
                '.arc-toolbar.mb-l #query, '
                + '.arc-toolbar.mb-l input[type="text"], '
                + '.arc-toolbar.mb-l .arc-button, '
                + '.arc-toolbar.mb-l .arc-button--hollow-default, '
                + '.arc-toolbar.mb-l .arc-button--medium'
            ).forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', '#1a1a1a', 'important');
                el.style.setProperty('background-color', '#1a1a1a', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('color', '#e0e0e0', 'important');
                el.style.setProperty('border-color', '#404040', 'important');
            });
            document.querySelectorAll('.arc-toolbar.mb-l .arc-dropdown__list').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', '#1a1a1a', 'important');
                el.style.setProperty('background-color', '#1a1a1a', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('color', '#e0e0e0', 'important');
                el.style.setProperty('border-color', '#404040', 'important');
            });
            document.querySelectorAll('.arc-toolbar.mb-l .arc-dropdown__list-item').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('color', '#e0e0e0', 'important');
                el.style.setProperty('border-color', '#404040', 'important');
            });
        } catch (e12) { }

        try {
            document.querySelectorAll(
                '.ui-participant-informationbox, '
                + '.ui-participant-informationbox.participant-active, '
                + '.ui-participant-placeholder, '
                + '.ui-participants-infolist, '
                + '.ui-participant-infobox, '
                + '.ui-participant-infobox .info-header'
            ).forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', '#2d2d2d', 'important');
                el.style.setProperty('background-color', '#2d2d2d', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('color', '#e0e0e0', 'important');
                el.style.setProperty('border-color', '#404040', 'important');
            });
        } catch (e13) { }

        var path = (window.location.pathname || '').toLowerCase();
        var onGradesPage = path.indexOf('/cnnet/grades/grades.aspx') !== -1
            || !!document.querySelector('#ctl00_ContentBox.main__content--box > .gradesPage');
        if (onGradesPage) {
            document.querySelectorAll(
                'main.main.arc-row, '
                + 'main.main.arc-row > section.main__content#koContainer, '
                + 'main.main.arc-row > section.main__content#koContainer > #ctl00_ContentBox.main__content--box'
            ).forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', '#1a1a1a', 'important');
                el.style.setProperty('background-color', '#1a1a1a', 'important');
                el.style.setProperty('background-image', 'none', 'important');
            });

            document.querySelectorAll(
                '#ctl00_ContentBox.main__content--box, '
                + '#ctl00_ContentBox.main__content--box > .gradesPage, '
                + '#ctl00_ContentBox.main__content--box > .gradesPage > form#aspnetForm, '
                + '#ctl00_ContentBox.main__content--box > .gradesPage > form#aspnetForm > div'
            ).forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', '#1a1a1a', 'important');
                el.style.setProperty('background-color', '#1a1a1a', 'important');
            });

            document.querySelectorAll(
                '.gradesPoints > h2, '
                + '.gradesPublicationTitle, '
                + '.gradesPdfTitle, '
                + '.gradesDtuPaperTitle, '
                + '.gradesPublishedResultsTitle'
            ).forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', '#1a1a1a', 'important');
                el.style.setProperty('background-color', '#1a1a1a', 'important');
                el.style.setProperty('color', '#e0e0e0', 'important');
                el.style.setProperty('background-image', 'none', 'important');
            });

            document.querySelectorAll(
                '.gradesPoints > table:not(.gradesList), '
                + '.gradesPoints > table:not(.gradesList) tr, '
                + '.gradesPoints > table:not(.gradesList) td'
            ).forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', '#1a1a1a', 'important');
                el.style.setProperty('background-color', '#1a1a1a', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('border-color', '#404040', 'important');
                var inlineStyle = (el.getAttribute && el.getAttribute('style')) || '';
                if (!/color\s*:/i.test(inlineStyle)) {
                    el.style.setProperty('color', '#e0e0e0', 'important');
                }
            });
        }

        document.querySelectorAll('.messageText').forEach(function (el) {
            if (!el || !el.style) return;
            el.style.setProperty('background', '#1a1a1a', 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('background-image', 'none', 'important');
        });

        document.querySelectorAll('.messageText .postTeaser').forEach(function (el) {
            if (!el || !el.style) return;
            el.style.setProperty('background', '#1a1a1a', 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('color', '#e0e0e0', 'important');
        });

        document.querySelectorAll('.messageText .messageTruncatebar, .messageTruncatebar').forEach(function (el) {
            if (!el || !el.style) return;
            var darkFade = 'linear-gradient(to bottom, rgba(26,26,26,0), rgba(26,26,26,0.95) 65%, #1a1a1a 100%)';
            el.style.setProperty('background', darkFade, 'important');
            el.style.setProperty('background-image', darkFade, 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('color', '#e0e0e0', 'important');
            el.style.setProperty('border-top-color', '#404040', 'important');
            el.style.setProperty('filter', 'none', 'important');
            el.style.setProperty('mix-blend-mode', 'normal', 'important');
        });

        applyCampusnetAccentElements();
    }

    function fixStudentPortalStyling(rootNode) {
        if (!isTopWindow()) return;
        if (!isDarkModeEnabled()) return;
        if (window.location.hostname !== 'student.dtu.dk') return;

        var scope = (rootNode && rootNode.querySelectorAll) ? rootNode : document;
        var scopes = (scope === document) ? [document] : [document, scope];
        var dark1 = '#1a1a1a';
        var dark2 = '#2d2d2d';

        function setStyles(selector, fn) {
            scopes.forEach(function (s) {
                try {
                    s.querySelectorAll(selector).forEach(function (el) {
                        if (!el || !el.style) return;
                        fn(el);
                    });
                } catch (e0) { }
            });
        }

        setStyles('.h-header, .h-header__inner, .h-header__item, .h-header__navigation, .o-primary-nav, .o-primary-nav__list, .o-utility-nav, .o-utility-nav__list', function (el) {
            el.style.setProperty('background', dark2, 'important');
            el.style.setProperty('background-color', dark2, 'important');
            el.style.setProperty('background-image', 'none', 'important');
        });

        setStyles('.js-main-wrapper.h-page__wrapper.h-page__wrapper--fullwidth', function (el) {
            el.style.setProperty('background', dark1, 'important');
            el.style.setProperty('background-color', dark1, 'important');
            el.style.setProperty('background-image', 'none', 'important');
        });

        setStyles('.h-header', function (el) {
            el.style.setProperty('border-top', '5px solid var(--dtu-ad-accent)', 'important');
        });

        setStyles('.o-factbox, .o-factbox__articles, .o-factbox__articles article', function (el) {
            el.style.setProperty('background', dark1, 'important');
            el.style.setProperty('background-color', dark1, 'important');
            el.style.setProperty('background-image', 'none', 'important');
        });

        setStyles('.o-sdb div.subject-Bachelor_Technological, .o-sdb div.subject-Cand_Technological, .u-theme-purple', function (el) {
            el.style.setProperty('--color-theme-base', 'var(--dtu-ad-accent-deep)', 'important');
            el.style.setProperty('--color-theme-dark', 'var(--dtu-ad-accent-deep)', 'important');
            el.style.setProperty('--color-purple', 'var(--dtu-ad-accent-deep)', 'important');
        });

        setStyles('.m-badge, .r-badge', function (el) {
            el.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
            el.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
            el.style.setProperty('background-image', 'none', 'important');
        });

        setStyles('.h-footer__social', function (el) {
            el.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
            el.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('--color-theme-dark', 'var(--dtu-ad-accent-deep)', 'important');
        });

        setStyles('.h-header__item--identity .h-header__logo-asset, .h-header__item--identity .a-icon__asset, .h-header__item--identity svg, .h-header__item--identity use', function (el) {
            el.style.setProperty('background', 'transparent', 'important');
            el.style.setProperty('background-color', 'transparent', 'important');
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('color', 'var(--dtu-ad-accent-deep)', 'important');
            el.style.setProperty('fill', 'currentColor', 'important');
        });
    }

    globalThis.DTUAfterDarkHostShell = {
        fixEvalueringResultCharts: fixEvalueringResultCharts,
        fixCampusnetHeaderStyling: fixCampusnetHeaderStyling,
        fixStudentPortalStyling: fixStudentPortalStyling
    };
})();
