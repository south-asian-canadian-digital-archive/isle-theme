// @ts-nocheck
import { setupPdfScrolling } from "../../viewers/pdf-scroll.js";

/**
 * Expands the PDF poster card (templates/field/media--pdfjs.html.twig) into the
 * real pdf.js viewer.
 *
 * The iframe lives in a <template> so the browser doesn't fetch the PDF on page
 * load — a merely hidden iframe still loads. Cloning it here is what actually
 * makes the poster lazy, so don't "simplify" this into a class toggle.
 *
 * sacda.libraries.yml is generated from dist/ and declares no dependencies, so
 * core/once isn't guaranteed to be present; guard for it the same way
 * team-show-more.ts does.
 */

((Drupal) => {
    const cleanup = new WeakMap();
    function pick(selector, context) {
        if (window.once) {
            return window.once("sacdaPdfPreview", selector, context);
        }
        return Array.from(context.querySelectorAll(selector)).filter((el) => {
            if (el.dataset.sacdaPdfPreviewBound) return false;
            el.dataset.sacdaPdfPreviewBound = "1";
            return true;
        });
    }

    Drupal.behaviors.sacdaPdfPreview = {
        attach: (context) => {
            const root = context instanceof Element ? context : document;

            pick("[data-pdf-preview]", root).forEach((el) => {
                const trigger = el.querySelector("[data-pdf-preview-open]");
                const poster = el.querySelector("[data-pdf-preview-poster]");
                const viewer = el.querySelector("[data-pdf-preview-viewer]");
                const tpl = el.querySelector("[data-pdf-preview-template]");

                if (!trigger || !poster || !viewer || !tpl) return;

                trigger.addEventListener("click", () => {
                    const stage = document.createElement("div");
                    stage.className = "sacda-pdf-document";
                    stage.appendChild(tpl.content.cloneNode(true));
                    const frame = stage.querySelector("iframe");
                    if (frame) cleanup.set(el, setupPdfScrolling(frame));
                    viewer.appendChild(stage);
                    viewer.hidden = false;
                    poster.hidden = true;
                    el.classList.add("is-expanded");

                    // The card was short; the viewer is a screenful. Scroll it
                    // into view, but stop clear of the sticky header —
                    // scrollIntoView({block:'start'}) puts pdf.js's toolbar
                    // underneath it.
                    const header =
                        parseInt(
                            getComputedStyle(document.documentElement).getPropertyValue(
                                "--header-height",
                            ),
                            10,
                        ) || 80;
                    const top = window.scrollY + el.getBoundingClientRect().top - header;
                    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
                });
            });
        },
        detach: (context, settings, trigger) => {
            if (trigger !== 'unload') return;
            context.querySelectorAll?.('[data-pdf-preview]').forEach(el => cleanup.get(el)?.());
        },
    };
})(Drupal);
