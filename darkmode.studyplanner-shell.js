(function () {
    'use strict';

    function getDeps() {
        try { return globalThis.DTUAfterDarkStudyplannerShellDeps || null; } catch (e0) { return null; }
    }

    function isTopWindow() {
        var deps = getDeps();
        return !!(deps && typeof deps.isTopWindow === 'function' && deps.isTopWindow());
    }

    function getResolvedAccentDeep() {
        var deps = getDeps();
        if (deps && typeof deps.getResolvedAccentDeep === 'function') {
            return deps.getResolvedAccentDeep();
        }
        return 'var(--dtu-ad-accent-deep)';
    }

    function normalizeWhitespace(value) {
        var deps = getDeps();
        if (deps && typeof deps.normalizeWhitespace === 'function') {
            return deps.normalizeWhitespace(value);
        }
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function isDarkModeEnabled() {
        var deps = getDeps();
        return !!(deps && typeof deps.isDarkModeEnabled === 'function' && deps.isDarkModeEnabled());
    }

    function preserveSingleTypeboxColor(typebox) {
        if (!typebox || !typebox.getAttribute || !typebox.style) return;
        var inlineStyle = typebox.getAttribute('style');
        if (!inlineStyle) return;
        var match = inlineStyle.match(/background-color:\s*([^;]+)/i);
        if (!match || !match[1]) return;
        var bgColor = match[1].trim();
        typebox.style.setProperty('background-color', bgColor, 'important');
    }

    function preserveTypeboxColors(root) {
        var scope = (root && root.nodeType === 1) ? root : document;
        if (!scope || !scope.querySelectorAll) return;
        if (scope.matches && scope.matches('.typebox')) {
            preserveSingleTypeboxColor(scope);
        }
        scope.querySelectorAll('.typebox').forEach(function (typebox) {
            preserveSingleTypeboxColor(typebox);
        });
    }

    function styleStudyPlannerTabLink(anchor) {
        if (!anchor || !anchor.style) return;
        var color = getResolvedAccentDeep();
        anchor.style.setProperty('background', color, 'important');
        anchor.style.setProperty('background-color', color, 'important');
        anchor.style.setProperty('color', '#ffffff', 'important');
        anchor.style.setProperty('border-color', color, 'important');
    }

    function repositionStudyPlannerBasketActions() {
        if (!isTopWindow()) return;
        if (window.location.hostname !== 'studieplan.dtu.dk') return;

        var basketTitle = document.querySelector('.box.droppable.drag-item-container.dropZone h2');
        if (!basketTitle) return;
        var titleText = normalizeWhitespace(basketTitle.textContent || '').toLowerCase();
        if (titleText.indexOf('basket') === -1) return;

        var slot = basketTitle.querySelector('.dtu-basket-actions-slot');
        if (!slot) {
            slot = document.createElement('span');
            slot.className = 'dtu-basket-actions-slot';
            slot.style.cssText = 'float:right;display:inline-flex;align-items:center;gap:8px;'
                + 'margin-right:8px;font-size:13px;font-weight:400;line-height:1;';
            basketTitle.appendChild(slot);
        }

        var candidates = Array.from(document.querySelectorAll('div')).filter(function (el) {
            if (!el || !el.children || !el.children.length) return false;
            var children = Array.from(el.children);
            var hasCreate = children.some(function (child) {
                return child.matches && child.matches('button[data-target="#createActivity"]');
            });
            var hasFind = children.some(function (child) {
                return child.matches && child.matches('button[data-target="#searchCourseCatalogDialog"]');
            });
            var hasPdf = children.some(function (child) {
                return child.matches && child.matches('a[href*="/pdf/download"]');
            });
            return hasCreate || hasFind || hasPdf;
        });
        if (!candidates.length) return;

        var preferred = null;
        for (var i = candidates.length - 1; i >= 0; i--) {
            if (!candidates[i].closest('.dtu-basket-actions-slot')) {
                preferred = candidates[i];
                break;
            }
        }
        if (!preferred) preferred = candidates[candidates.length - 1];
        if (!preferred) return;

        if (preferred.parentElement !== slot) {
            slot.appendChild(preferred);
        }

        preferred.setAttribute('data-dtu-basket-actions', '1');
        preferred.style.setProperty('float', 'none', 'important');
        preferred.style.setProperty('margin-top', '0', 'important');
        preferred.style.setProperty('display', 'inline-flex', 'important');
        preferred.style.setProperty('align-items', 'center', 'important');
        preferred.style.setProperty('gap', '8px', 'important');
        preferred.style.setProperty('white-space', 'nowrap', 'important');

        Array.from(preferred.children).forEach(function (btn) {
            if (!btn.matches || !btn.matches('button.btn')) return;
            if (!btn || !btn.style) return;
            btn.style.setProperty('margin', '0', 'important');
            btn.style.setProperty('padding', '4px 10px', 'important');
            btn.style.setProperty('font-size', '12px', 'important');
            btn.style.setProperty('line-height', '1.2', 'important');
        });

        Array.from(preferred.children).forEach(function (a) {
            if (!a.matches || !a.matches('a[href*="/pdf/download"]')) return;
            if (!a || !a.style) return;
            a.style.setProperty('display', 'inline-flex', 'important');
            a.style.setProperty('align-items', 'center', 'important');
            a.style.setProperty('margin', '0', 'important');
            a.style.setProperty('font-size', '12px', 'important');
            a.style.setProperty('line-height', '1.2', 'important');
        });

        candidates.forEach(function (el) {
            if (!el || el === preferred) return;
            if (el.parentElement === slot) {
                try { el.remove(); } catch (e0) { }
            }
        });
    }

    function styleStudyPlannerTabs() {
        if (!isTopWindow()) return;
        var host = window.location.hostname;
        if (host !== 'studieplan.dtu.dk' && host !== 'kurser.dtu.dk') return;

        document.querySelectorAll('.mofoclass li[role="presentation"] > a').forEach(function (a) {
            styleStudyPlannerTabLink(a);
        });

        if (host === 'kurser.dtu.dk') {
            document.querySelectorAll('li[role="presentation"] > a[href="/search"], li[role="presentation"] > a[href$="/search"]').forEach(function (a) {
                styleStudyPlannerTabLink(a);
            });

            document.querySelectorAll('li[role="presentation"] > a[href="/course/gotoStudyplanner"], li[role="presentation"] > a[href$="/course/gotoStudyplanner"]').forEach(function (a) {
                styleStudyPlannerTabLink(a);
            });
        }

        document.querySelectorAll('li[role="presentation"] > a[href="#"]').forEach(function (a) {
            var txt = (a.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            if (txt === 'studieplanlæggeren' || txt === 'study planner' || txt === 'course search') {
                styleStudyPlannerTabLink(a);
            }
        });

        if (host === 'studieplan.dtu.dk') {
            try {
                var pillBg = isDarkModeEnabled() ? 'var(--dtu-ad-accent)' : 'var(--dtu-ad-accent-deep)';
                var pillBgHover = isDarkModeEnabled() ? 'var(--dtu-ad-accent-hover)' : 'var(--dtu-ad-accent-deep-hover)';

                var topLinks = document.querySelectorAll(
                    'a[href*="studieplanlaeggeren"], a[href^="javascript:setLanguage("], a[href^="javascript:setLanguage\\("]'
                );
                topLinks.forEach(function (a) {
                    if (!a || !a.style) return;
                    a.style.setProperty('color', '#ffffff', 'important');
                    a.style.setProperty('padding', '2px 4px', 'important');
                    a.style.setProperty('border-radius', '4px', 'important');
                    a.style.setProperty('text-decoration', 'none', 'important');
                    a.style.setProperty('background-color', 'transparent', 'important');
                    a.style.setProperty('background', 'transparent', 'important');

                    var pr = a.closest ? a.closest('.pull-right') : null;
                    if (pr && pr.style) {
                        pr.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                        pr.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                        pr.style.setProperty('background-image', 'none', 'important');
                    }
                    var span = a.parentElement && a.parentElement.tagName === 'SPAN' ? a.parentElement : null;
                    if (span && span.style) {
                        span.style.setProperty('background-color', pillBg, 'important');
                        span.style.setProperty('background', pillBg, 'important');
                        span.style.setProperty('background-image', 'none', 'important');
                        span.style.setProperty('border-color', pillBg, 'important');
                    }

                    if (!a.hasAttribute('data-dtu-accent-pill')) {
                        a.setAttribute('data-dtu-accent-pill', '1');
                        a.addEventListener('mouseenter', function () {
                            try {
                                var sp = a.parentElement && a.parentElement.tagName === 'SPAN' ? a.parentElement : null;
                                if (sp && sp.style) {
                                    sp.style.setProperty('background-color', pillBgHover, 'important');
                                    sp.style.setProperty('background', pillBgHover, 'important');
                                    sp.style.setProperty('border-color', pillBgHover, 'important');
                                }
                            } catch (e0) { }
                        }, true);
                        a.addEventListener('mouseleave', function () {
                            try {
                                var sp = a.parentElement && a.parentElement.tagName === 'SPAN' ? a.parentElement : null;
                                if (sp && sp.style) {
                                    sp.style.setProperty('background-color', pillBg, 'important');
                                    sp.style.setProperty('background', pillBg, 'important');
                                    sp.style.setProperty('border-color', pillBg, 'important');
                                }
                            } catch (e1) { }
                        }, true);
                    }
                });

                document.querySelectorAll('.pull-right .seperator').forEach(function (sep) {
                    if (!sep || !sep.style) return;
                    sep.style.setProperty('color', 'rgba(255,255,255,0.6)', 'important');
                    sep.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                    sep.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                });
                document.querySelectorAll('.pull-right .caret').forEach(function (caret) {
                    if (!caret || !caret.style) return;
                    caret.style.setProperty('border-top-color', '#ffffff', 'important');
                    caret.style.setProperty('background-color', 'transparent', 'important');
                    caret.style.setProperty('background', 'transparent', 'important');
                    caret.style.setProperty('background-image', 'none', 'important');
                });
            } catch (eSp) { }
        }

        document.querySelectorAll('.dturedbackground').forEach(function (el) {
            el.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
            el.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
            el.style.setProperty('color', '#ffffff', 'important');
            el.style.setProperty('border-color', 'var(--dtu-ad-accent-deep)', 'important');
            el.querySelectorAll('.container, .row, .col-md-12, .pull-right, .pull-right > span:not(.caret)').forEach(function (child) {
                child.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                child.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                child.style.setProperty('background-image', 'none', 'important');
                child.style.setProperty('border-color', 'var(--dtu-ad-accent-deep)', 'important');
            });
            el.querySelectorAll('.dropdown-toggle.red').forEach(function (btn) {
                btn.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                btn.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                btn.style.setProperty('color', '#ffffff', 'important');
            });
            el.querySelectorAll('.dropdown-menu.red').forEach(function (menu) {
                menu.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                menu.style.setProperty('border-color', 'var(--dtu-ad-accent-deep-hover)', 'important');
            });
            el.querySelectorAll('a').forEach(function (a) {
                a.style.setProperty('color', '#ffffff', 'important');
            });
            el.querySelectorAll('.seperator').forEach(function (sep) {
                sep.style.setProperty('color', 'rgba(255,255,255,0.6)', 'important');
                sep.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                sep.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
            });
            el.querySelectorAll('.caret').forEach(function (caret) {
                caret.style.setProperty('border-top-color', '#ffffff', 'important');
                caret.style.setProperty('background-color', 'transparent', 'important');
                caret.style.setProperty('background', 'transparent', 'important');
                caret.style.setProperty('background-image', 'none', 'important');
            });
        });

        document.querySelectorAll('h3[data-bind*="SemesterNumber"]').forEach(function (h3) {
            h3.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
            h3.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
            h3.style.setProperty('color', '#ffffff', 'important');
            h3.style.setProperty('border-left', '1px solid var(--dtu-ad-accent-deep)', 'important');
            h3.style.setProperty('border-right', '1px solid var(--dtu-ad-accent-deep)', 'important');
            h3.style.setProperty('border-bottom-width', '2px', 'important');
            h3.style.setProperty('border-bottom-style', 'solid', 'important');
            h3.style.setProperty('border-bottom-color', 'var(--dtu-ad-accent-deep)', 'important');
        });

        document.querySelectorAll('a.coursecode').forEach(function (a) {
            a.style.setProperty('color', 'var(--dtu-ad-accent)', 'important');
        });

        try {
            var plannedCourseLinks = document.querySelectorAll('.inverse .overlayArea a.coursecode');
            plannedCourseLinks.forEach(function (a) {
                if (!a || !a.style) return;
                a.style.setProperty('color', isDarkModeEnabled() ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)', 'important');
            });
        } catch (ePlan) { }

        try {
            document.querySelectorAll('a.coursecode[data-bind*="basketCourseGroup"]').forEach(function (a) {
                if (!a || !a.style) return;
                a.style.setProperty('color', isDarkModeEnabled() ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)', 'important');
            });
        } catch (eBasket) { }

        try {
            document.querySelectorAll('.inverse table.table-bordered').forEach(function (tbl) {
                if (!tbl || !tbl.querySelectorAll) return;
                var isExamTable = false;
                try {
                    if (tbl.querySelector('td.result')) isExamTable = true;
                    if (!isExamTable) {
                        var th = tbl.querySelector('thead th');
                        var t = th ? (th.textContent || '').toLowerCase() : '';
                        if (t.indexOf('exam') >= 0) isExamTable = true;
                    }
                } catch (e0) { }
                if (!isExamTable) return;

                var cc = tbl.querySelectorAll('a.coursecode');
                cc.forEach(function (a) {
                    if (!a || !a.style) return;
                    a.style.setProperty('color', isDarkModeEnabled() ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)', 'important');
                });
            });
        } catch (eExam) { }

        document.querySelectorAll('.btn-dtured').forEach(function (btn) {
            btn.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
            btn.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
            btn.style.setProperty('color', '#ffffff', 'important');
            btn.style.setProperty('border-color', 'var(--dtu-ad-accent-deep)', 'important');
        });

        if (host === 'studieplan.dtu.dk') {
            repositionStudyPlannerBasketActions();
        }
    }

    function applyKurserAccentElements() {
        if (window.location.hostname !== 'kurser.dtu.dk') return;
        if (isDarkModeEnabled()) return;

        var linkColor = 'var(--dtu-ad-accent-deep)';
        var linkHoverColor = 'var(--dtu-ad-accent-hover)';

        function accentLink(a) {
            if (!a || !a.style) return;
            if (a.closest && a.closest('.mofoclass')) return;
            a.style.setProperty('color', linkColor, 'important');
            a.style.setProperty('text-decoration', 'underline', 'important');
            if (!a.hasAttribute('data-dtu-accent-link')) {
                a.setAttribute('data-dtu-accent-link', '1');
                a.addEventListener('mouseenter', function () {
                    try { a.style.setProperty('color', linkHoverColor, 'important'); } catch (e0) { }
                }, true);
                a.addEventListener('mouseleave', function () {
                    try { a.style.setProperty('color', linkColor, 'important'); } catch (e1) { }
                }, true);
            }
        }

        var infoBox = document.querySelector('.box.information');
        if (infoBox) {
            infoBox.querySelectorAll('a.CourseLink, a.menulink, a[href^="mailto:"], a[href*="kurser.dtu.dk/schedule"], a[href*="student.dtu.dk/eksamen"], a[href*="kurser.dtu.dk/course"]').forEach(accentLink);
        }

        document.querySelectorAll('#studiebox .expander').forEach(function (span) {
            if (!span || !span.style) return;
            span.style.setProperty('color', linkColor, 'important');
            span.style.setProperty('cursor', 'pointer', 'important');
        });

        document.querySelectorAll('.box a[href*="evaluering.dtu.dk"], .box a[href*="karakterer.dtu.dk"]').forEach(accentLink);

        if (infoBox) {
            infoBox.querySelectorAll('a[href]:not(.CourseLink):not(.menulink):not([href^="mailto:"]):not([data-dtu-accent-link])').forEach(function (a) {
                if (!a || !a.style) return;
                var href = a.getAttribute('href') || '';
                if (/^(javascript:|#)/.test(href)) return;
                if (a.hasAttribute('data-dtu-mazemap-link')) return;
                accentLink(a);
            });
        }

        document.querySelectorAll('a[href="/search"]').forEach(accentLink);
    }

    globalThis.DTUAfterDarkStudyplannerShell = {
        preserveSingleTypeboxColor: preserveSingleTypeboxColor,
        preserveTypeboxColors: preserveTypeboxColors,
        styleStudyPlannerTabs: styleStudyPlannerTabs,
        applyKurserAccentElements: applyKurserAccentElements
    };
})();
