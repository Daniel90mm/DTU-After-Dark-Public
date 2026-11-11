(function () {
    'use strict';

    // Shared loading placeholders. A widget draws grey bars shaped like its
    // content while data loads, then calls reveal() on the real content so it
    // fades in instead of popping. Widgets set --dtu-skel-fill on their own host
    // so the bars match their palette. Only opacity animates; reduced motion
    // keeps the bars still and the content appears at once.

    var STYLE_ID = 'dtu-skeleton-style';

    var CSS = [
        '.dtu-skel{display:block;border-radius:3px;background:var(--dtu-skel-fill,rgba(128,128,128,.2))!important;animation:dtu-skel-pulse 1.4s ease-in-out infinite}',
        '@keyframes dtu-skel-pulse{0%,100%{opacity:1}50%{opacity:.4}}',
        '.dtu-skel-reveal{animation:dtu-skel-reveal .2s ease-out}',
        '@keyframes dtu-skel-reveal{from{opacity:0}to{opacity:1}}',
        '@media (prefers-reduced-motion:reduce){.dtu-skel,.dtu-skel-reveal{animation:none}}'
    ].join('\n');

    function ensureStyles(mark) {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        if (mark) mark(style);
        style.textContent = CSS;
        (document.head || document.documentElement).appendChild(style);
    }

    // One placeholder bar. width and height are CSS lengths.
    function bar(width, height, className, mark) {
        ensureStyles(mark);
        var el = document.createElement('span');
        if (mark) mark(el);
        el.className = 'dtu-skel' + (className ? ' ' + className : '');
        el.setAttribute('aria-hidden', 'true');
        el.style.width = width;
        el.style.height = height;
        return el;
    }

    // Fades el in once. Restarts the animation if el was revealed before.
    function reveal(el, mark) {
        ensureStyles(mark);
        el.classList.remove('dtu-skel-reveal');
        void el.offsetWidth;
        el.classList.add('dtu-skel-reveal');
    }

    globalThis.DTUAfterDarkSkeleton = { ensureStyles: ensureStyles, bar: bar, reveal: reveal };
})();
