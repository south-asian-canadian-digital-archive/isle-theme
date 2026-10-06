// @ts-nocheck

/**
 * Loading overlay for the OpenSeadragon viewer block.
 *
 * Until Cantaloupe answers info.json and the first tile paints, the viewer is
 * just the module's black box. This puts a spinner over it and clears it on
 * the first `tile-drawn`, or swaps in an error message on `open-failed`.
 *
 * The contrib module (openseadragon_viewer.js) keeps its OpenSeadragon.Viewer
 * in a local variable, so there's no instance to call addHandler() on. Instead
 * Viewer.prototype.raiseEvent is wrapped: every viewer on the page routes its
 * events through it, including ones constructed before this patch ran.
 *
 * sacda.libraries.yml declares no dependencies, so OpenSeadragon and core/once
 * may not be loaded yet when this file evaluates — patch from attach(), which
 * runs after every script on the page.
 */

((Drupal) => {
    const LOADER_CLASS = "osd-loader";

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

    function patchViewer() {
        const Viewer = window.OpenSeadragon && window.OpenSeadragon.Viewer;
        if (!Viewer || Viewer.prototype.__sacdaLoaderPatched) return !!Viewer;

        const raise = Viewer.prototype.raiseEvent;
        Viewer.prototype.raiseEvent = function (name, args) {
            if (name === "tile-drawn") {
                setState(this.element, "done");
            } else if (name === "open-failed") {
                setState(this.element, "error");
            }
            return raise.apply(this, arguments);
        };
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
