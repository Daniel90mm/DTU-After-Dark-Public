(() => {
    'use strict';

    const INSTALLED_FLAG = '__dtuAfterDarkShadowHookInstalled';
    if (Element.prototype[INSTALLED_FLAG]) return;

    const originalAttachShadow = Element.prototype.attachShadow;
    if (typeof originalAttachShadow !== 'function') {
        throw new Error('Element.prototype.attachShadow is missing');
    }

    Object.defineProperty(Element.prototype, INSTALLED_FLAG, {
        value: true,
        enumerable: false,
        configurable: false,
        writable: false
    });

    Element.prototype.attachShadow = function attachShadow(init) {
        const root = originalAttachShadow.apply(this, arguments);
        try {
            this.dispatchEvent(new CustomEvent('dtu-after-dark-shadow-attached', {
                bubbles: true,
                composed: true
            }));
        } catch (e) { }
        return root;
    };
})();
