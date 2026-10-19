// @ts-nocheck

/**
 * Loading overlay for the OpenSeadragon viewer block.
 *
 * Until Cantaloupe answers info.json and the first tile paints, the viewer is
 * just the module's black box. This puts a spinner over it and clears it on
 * the first `tile-drawn` or `tile-loaded`, or swaps in an error message on
 * `open-failed`. OpenSeadragon 5+ defaults to the WebGL drawer, which never
 * raises `tile-drawn` (only the legacy canvas drawer does), so `tile-loaded`
 * is what actually clears it there; the fade covers the gap until it paints.
 *
 * The contrib module (openseadragon_viewer.js) keeps its OpenSeadragon.Viewer
 * in a local variable, so there's no instance to call addHandler() on. Instead
 * Viewer.prototype.raiseEvent is wrapped: every viewer on the page routes its
 * events through it, including ones constructed before this patch ran.
 * OpenSeadragon 6 added raiseEventAwaiting, which is wrapped the same way.
 * The same wrapper lets wheel events through to the page when scrollToZoom
 * is off, and zooms on Ctrl/Cmd+wheel instead (see canvas-scroll below).
 *
 * sacda.libraries.yml declares no dependencies, so OpenSeadragon and core/once
 * may not be loaded yet when this file evaluates — patch from attach(), which
 * runs after every script on the page.
 */

((Drupal) => {
    const LOADER_CLASS = "osd-loader";
    // Zoom per 100px of wheel delta (one mouse-wheel notch) for Ctrl/Cmd+wheel.
    const ZOOM_PER_WHEEL_STEP = 1.2;
    const HINT_CLASS = "osd-zoom-hint";

    function pick(selector, context) {
        if (window.once) {
            return window.once("sacdaOsdLoader", selector, context);
        }
        return Array.from(context.querySelectorAll(selector)).filter((el) => {
            if (el.dataset.sacdaOsdLoaderBound) return false;
            el.dataset.sacdaOsdLoaderBound = "1";
            return true;
        });
    }

    function setState(el, state) {
        if (!el) return;
        const loader = el.querySelector(`:scope > .${LOADER_CLASS}`);
        if (!loader) return;

        if (state === "done") {
            loader.classList.add(`${LOADER_CLASS}--done`);
            // Remove after the fade so the overlay can't intercept anything.
            loader.addEventListener("transitionend", () => loader.remove(), { once: true });
            return;
        }

        if (state === "error") {
            loader.classList.add(`${LOADER_CLASS}--error`);
            loader.querySelector(`.${LOADER_CLASS}__label`).textContent =
                Drupal.t("This image could not be loaded.");
        }
    }

    const IS_MAC = /mac|iphone|ipad/i.test(
        (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "",
    );

    const HINT_HIDE_AFTER = 1500;
    const hints = new WeakMap();

    // Plain wheel over the viewer scrolls the page, so say how to zoom instead.
    // Wheel events fire dozens of times a second: after the pill is shown they
    // only push its hide deadline back, and the DOM is touched once to show it
    // and once to hide it.
    function showZoomHint(el) {
        if (!el) return;
        let hint = hints.get(el);
        if (!hint) {
            const node = document.createElement("div");
            node.className = HINT_CLASS;
            node.setAttribute("aria-hidden", "true");
            node.textContent = IS_MAC
                ? Drupal.t("Hold ⌘ and scroll to zoom")
                : Drupal.t("Hold Ctrl and scroll to zoom");
            el.appendChild(node);
            hint = { node, hideAt: 0, timer: 0 };
            hints.set(el, hint);
        }

        hint.hideAt = Date.now() + HINT_HIDE_AFTER;
        if (hint.timer) return;

        hint.node.classList.add(`${HINT_CLASS}--visible`);
        const check = () => {
            const left = hint.hideAt - Date.now();
            if (left > 0) {
                hint.timer = setTimeout(check, left);
                return;
            }
            hint.timer = 0;
            hint.node.classList.remove(`${HINT_CLASS}--visible`);
        };
        hint.timer = setTimeout(check, HINT_HIDE_AFTER);
    }

    function patchViewer() {
        const Viewer = window.OpenSeadragon && window.OpenSeadragon.Viewer;
        if (!Viewer || Viewer.prototype.__sacdaLoaderPatched) return !!Viewer;

        // OpenSeadragon 6 raises some events (tile-loaded among them) through
        // raiseEventAwaiting rather than raiseEvent, so wrap both.
        ["raiseEvent", "raiseEventAwaiting"].forEach((method) => {
            const raise = Viewer.prototype[method];
            if (typeof raise !== "function") return;
            Viewer.prototype[method] = function (name) {
                if (name === "tile-drawn" || name === "tile-loaded") {
                    setState(this.element, "done");
                } else if (name === "open-failed") {
                    setState(this.element, "error");
                } else if (name === "canvas-scroll" && arguments[1]) {
                    // OpenSeadragon 4+ swallows the wheel event even with
                    // scrollToZoom off, so the page can't scroll past the
                    // viewer. Hand it back to the browser in that case.
                    const gestures = this.gestureSettingsMouse || {};
                    if (!gestures.scrollToZoom) {
                        const args = arguments[1];
                        const wheel = args.originalEvent;
                        // Ctrl (or Cmd on a Mac) + wheel zooms instead. A
                        // trackpad pinch also arrives as a ctrlKey wheel event.
                        if (wheel && (wheel.ctrlKey || wheel.metaKey) && this.viewport) {
                            const factor = Math.pow(ZOOM_PER_WHEEL_STEP, -wheel.deltaY / 100);
                            this.viewport.zoomBy(factor, this.viewport.pointFromPixel(args.position, true));
                            this.viewport.applyConstraints();
                        } else {
                            args.preventDefault = false;
                            showZoomHint(this.element);
                        }
                    }
                }
                return raise.apply(this, arguments);
            };
        });
        Viewer.prototype.__sacdaLoaderPatched = true;
        return true;
    }

    Drupal.behaviors.sacdaOpenSeadragonLoader = {
        attach: (context) => {
            const root = context instanceof Element ? context : document;
            const viewers = pick(".openseadragon-viewer", root);
            if (!viewers.length) return;

            const ok = patchViewer();

            viewers.forEach((el) => {
                const loader = document.createElement("div");
                loader.className = LOADER_CLASS;
                loader.setAttribute("role", "status");
                loader.innerHTML =
                    `<span class="${LOADER_CLASS}__spinner" aria-hidden="true"></span>` +
                    `<span class="${LOADER_CLASS}__label"></span>`;
                loader.querySelector(`.${LOADER_CLASS}__label`).textContent =
                    Drupal.t("Loading image…");
                el.appendChild(loader);

                // The CDN script never arrived, so nothing will ever draw.
                if (!ok) setState(el, "error");
            });
        },
    };
})(Drupal);
