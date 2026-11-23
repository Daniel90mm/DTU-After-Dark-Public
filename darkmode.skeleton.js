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
        '.dtu-skel-block{display:flex;flex-direction:column;gap:12px;min-width:0}',
        '.dtu-skel-line{display:flex;align-items:center;gap:10px;min-width:0}',
        '.dtu-skel-line.dtu-skel-end{align-items:flex-end}',
        '.dtu-skel-line.dtu-skel-stack{flex-direction:column;align-items:flex-start;gap:6px}',
        '.dtu-skel-grow{flex:1 1 0;min-width:0}',
        '.dtu-skel-sr{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important}',
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

    // A whole loading placeholder: a polite status that names what is loading
    // for screen readers, and lines of bars shaped like the content for the eye.
    // Each line is an array of bars [width, height, className] laid out in a row,
    // or { className, bars } where className is dtu-skel-end (bars stand on the
    // baseline, for charts), dtu-skel-stack (bars stacked) or the widget's own.
    // A width of '' with className dtu-skel-grow fills the rest of the line. A
    // bar that is itself a list of bars becomes a stacked column filling the
    // rest of the line (title and meta text beside a date badge, say).
    function block(label, lines, mark, className) {
        ensureStyles(mark);
        var box = document.createElement('div');
        if (mark) mark(box);
        box.className = 'dtu-skel-block' + (className ? ' ' + className : '');
        box.setAttribute('role', 'status');
        box.setAttribute('data-dtu-skel-block', '1');
        var words = document.createElement('span');
        if (mark) mark(words);
        words.className = 'dtu-skel-sr';
        words.textContent = label;
        box.appendChild(words);
        lines.forEach(function (line) {
            var bars = Array.isArray(line) ? line : line.bars;
            var row = document.createElement('div');
            if (mark) mark(row);
            row.className = 'dtu-skel-line' + (!Array.isArray(line) && line.className ? ' ' + line.className : '');
            row.setAttribute('aria-hidden', 'true');
            bars.forEach(function (b) {
                if (!Array.isArray(b[0])) { row.appendChild(bar(b[0], b[1], b[2], mark)); return; }
                var column = document.createElement('div');
                if (mark) mark(column);
                column.className = 'dtu-skel-line dtu-skel-stack dtu-skel-grow';
                b.forEach(function (c) { column.appendChild(bar(c[0], c[1], c[2], mark)); });
                row.appendChild(column);
            });
            box.appendChild(row);
        });
        return box;
    }

    globalThis.DTUAfterDarkSkeleton = { ensureStyles: ensureStyles, bar: bar, reveal: reveal, block: block };
})();
