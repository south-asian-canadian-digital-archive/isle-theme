// @ts-nocheck

/**
 * Sidebar button for the Mirador viewer.
 *
 * Mirador's window top bar is hidden (css/_mirador.css), and its sidebar
 * toggle lived there. This puts a small button over the top-left of the image
 * that dispatches the same action, so page info and OCR search stay reachable.
 *
 * The Mirador instance is created by the module's own behavior, which may run
 * after this one, so it is looked up on click rather than at attach time.
 */

((Drupal) => {
    const BUTTON_CLASS = "mirador-sidebar-toggle";

    function toggleSidebar(mount, button) {
        const instance = Drupal.IslandoraMirador?.instances?.[`#${mount.id}`];
        if (!instance || !window.Mirador) return;
        const windowId = Object.keys(instance.store.getState().windows)[0];
        if (!windowId) return;
        instance.store.dispatch(window.Mirador.actions.toggleWindowSideBar(windowId));
        // Open, the sidebar's icon rail covers the top-left corner, so the
        // button moves to the bottom of the rail.
        const open = !!instance.store.getState().windows[windowId].sideBarOpen;
        button.classList.toggle(`${BUTTON_CLASS}--open`, open);
        button.setAttribute("aria-expanded", String(open));
    }

    Drupal.behaviors.sacdaMiradorSidebar = {
        attach: (context) => {
            const root = context instanceof Element ? context : document;
            if (!window.once) return;

            window.once("sacdaMiradorSidebar", ".block-mirador [id^='mirador-']", root).forEach((mount) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = BUTTON_CLASS;
                button.setAttribute("aria-label", Drupal.t("Toggle sidebar"));
                button.title = Drupal.t("Pages, info and search");
                button.innerHTML =
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>';
                button.setAttribute("aria-expanded", "false");
                button.addEventListener("click", () => toggleSidebar(mount, button));
                // Mirador renders into the mount and replaces its children.
                mount.parentElement.appendChild(button);
            });
        },
    };
})(Drupal);
