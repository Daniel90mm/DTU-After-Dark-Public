import assert from 'node:assert/strict';
import test from 'node:test';
import { loadDom } from './_harness.mjs';

function makePlacementEnv() {
    let now = 0;
    let nextFrame = 0;
    let nextTimer = 0;
    const frames = new Map();
    const timers = new Map();
    const listeners = new Map();
    const observers = [];

    class FakeMutationObserver {
        constructor(callback) {
            this.callback = callback;
            this.disconnected = false;
            observers.push(this);
        }

        observe() {}
        disconnect() { this.disconnected = true; }
    }

    const document = {
        hidden: false,
        documentElement: {},
        addEventListener(type, listener) {
            const list = listeners.get(type) || [];
            list.push(listener);
            listeners.set(type, list);
        },
        removeEventListener(type, listener) {
            const list = listeners.get(type) || [];
            listeners.set(type, list.filter((entry) => entry !== listener));
        }
    };

    const sandbox = {
        document,
        MutationObserver: FakeMutationObserver,
        Date: class extends Date {
            static now() { return now; }
        },
        setTimeout(callback, delay) {
            const id = ++nextTimer;
            timers.set(id, { callback, at: now + delay });
            return id;
        },
        clearTimeout(id) { timers.delete(id); },
        requestAnimationFrame(callback) {
            const id = ++nextFrame;
            frames.set(id, callback);
            return id;
        },
        cancelAnimationFrame(id) { frames.delete(id); }
    };
    loadDom(sandbox);

    return {
        Dom: sandbox.DTUAfterDarkDom,
        observers,
        setNow(value) { now = value; },
        setHidden(value) { document.hidden = value; },
        flushFrames() {
            const pending = [...frames.values()];
            frames.clear();
            pending.forEach((callback) => callback());
            return pending.length;
        },
        pendingFrames() { return frames.size; },
        runTimers() {
            const pending = [...timers.entries()].filter(([, timer]) => timer.at <= now);
            pending.forEach(([id, timer]) => {
                timers.delete(id);
                timer.callback();
            });
            return pending.length;
        },
        dispatch(type) {
            (listeners.get(type) || []).slice().forEach((listener) => listener({ type }));
        },
        listenerCount(type) { return (listeners.get(type) || []).length; }
    };
}

test('placement stops after the run reports done', () => {
    const env = makePlacementEnv();
    let runs = 0;
    const watch = env.Dom.schedulePlacement({
        capMs: 30000,
        run() {
            runs++;
            return runs >= 2;
        }
    });

    assert.equal(env.pendingFrames(), 1);
    env.flushFrames();
    assert.equal(runs, 1);
    assert.equal(watch.active(), true);

    watch.trigger();
    env.flushFrames();
    assert.equal(runs, 2);
    assert.equal(watch.active(), false);
    assert.equal(env.observers[0].disconnected, true);
    assert.equal(env.listenerCount('dtu-after-dark-shadow-attached'), 0);

    watch.trigger();
    assert.equal(env.pendingFrames(), 0);
    env.flushFrames();
    assert.equal(runs, 2);
});

test('placement stops at the time cap even when the run is not done', () => {
    const env = makePlacementEnv();
    let runs = 0;
    const watch = env.Dom.schedulePlacement({
        capMs: 100,
        run() {
            runs++;
            return false;
        }
    });

    env.flushFrames();
    assert.equal(runs, 1);

    env.setNow(100);
    assert.equal(env.runTimers(), 1);
    assert.equal(watch.active(), false);

    watch.trigger();
    assert.equal(env.pendingFrames(), 0);
    env.flushFrames();
    assert.equal(runs, 1);
});

test('placement coalesces a burst of changes into one run', () => {
    const env = makePlacementEnv();
    let runs = 0;
    const watch = env.Dom.schedulePlacement({
        capMs: 30000,
        run() {
            runs++;
            return false;
        }
    });

    watch.trigger();
    watch.trigger();
    env.dispatch('dtu-after-dark-shadow-attached');
    env.dispatch('dtu-after-dark-shadow-attached');
    assert.equal(env.pendingFrames(), 1);
    env.flushFrames();
    assert.equal(runs, 1);

    env.observers[0].callback();
    watch.trigger();
    assert.equal(env.pendingFrames(), 1);
    env.flushFrames();
    assert.equal(runs, 2);
});

test('placement needs a run function and a positive cap', () => {
    const env = makePlacementEnv();
    assert.throws(() => env.Dom.schedulePlacement({ capMs: 30000 }), /needs a run function/);
    assert.throws(() => env.Dom.schedulePlacement({ run() { return true; } }), /needs a positive capMs/);
});

test('placement in a hidden tab keeps waiting past the cap and gets a fresh cap when shown', () => {
    const env = makePlacementEnv();
    let runs = 0;
    const watch = env.Dom.schedulePlacement({ capMs: 100, run() { runs++; return false; } });
    env.setHidden(true);
    env.setNow(100);
    env.runTimers();
    assert.equal(watch.active(), true, 'a background tab does not use up the cap');

    env.setHidden(false);
    env.setNow(5000);
    env.dispatch('visibilitychange');
    env.flushFrames();
    assert.ok(runs >= 1, 'showing the tab runs a pass');
    assert.equal(watch.active(), true);

    env.setNow(5100);
    env.runTimers();
    assert.equal(watch.active(), false, 'the fresh cap still stops it');
    assert.equal(env.listenerCount('visibilitychange'), 0);
});
