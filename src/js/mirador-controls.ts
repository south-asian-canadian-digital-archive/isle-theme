// @ts-nocheck

/**
 * Sidebar and image-tools buttons for the Mirador viewer.
 *
 * Mirador's window top bar is hidden (css/_mirador.css), and both toggles
 * lived there: the sidebar button, and the plugin menu that reopens the image
 * tools once they are closed. These buttons sit over the top-left of the image
 * and dispatch the same store actions.
 *
 * The Mirador instance is created by the module's own behavior, which may run
 * after this one, so it is looked up on click rather than at attach time.
 */

((Drupal) => {
    const CONTROLS_CLASS = "mirador-controls";

    const ICONS = {
        sidebar: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
        tools: '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M2 14h4"/><path d="M10 8h4"/><path d="M18 16h4"/>',
    };

    function getWindow(mount) {
        const instance = Drupal.IslandoraMirador?.instances?.[`#${mount.id}`];
        if (!instance || !window.Mirador) return null;
        const id = Object.keys(instance.store.getState().windows)[0];
        return id ? { store: instance.store, id, state: () => instance.store.getState().windows[id] } : null;
    }

    function button(label, title, icon, onClick) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = `${CONTROLS_CLASS}__button`;
        el.setAttribute("aria-label", label);
        el.title = title;
        el.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            `${icon}</svg>`;
        el.addEventListener("click", onClick);
        return el;
    }

    Drupal.behaviors.sacdaMiradorControls = {
        attach: (context) => {
            const root = context instanceof Element ? context : document;
            if (!window.once) return;

            window.once("sacdaMiradorControls", ".block-mirador [id^='mirador-']", root).forEach((mount) => {
                const controls = document.createElement("div");
                controls.className = CONTROLS_CLASS;

                const sidebar = button(Drupal.t("Toggle sidebar"), Drupal.t("Pages, info and search"), ICONS.sidebar, () => {
                    const win = getWindow(mount);
                    if (!win) return;
                    win.store.dispatch(window.Mirador.actions.toggleWindowSideBar(win.id));
                    // Open, the sidebar's icon rail covers the top-left corner,
                    // so the buttons move to the bottom of the rail.
                    const open = !!win.state().sideBarOpen;
                    controls.classList.toggle(`${CONTROLS_CLASS}--sidebar-open`, open);
                    sidebar.setAttribute("aria-expanded", String(open));
                });
                sidebar.setAttribute("aria-expanded", "false");

                const tools = button(Drupal.t("Toggle image tools"), Drupal.t("Rotate, flip and adjust"), ICONS.tools, () => {
                    const win = getWindow(mount);
                    if (!win) return;
                    // Unset until first toggled; the plugin then uses the config
                    // default (open).
                    const current = win.state().imageToolsOpen ?? win.store.getState().config.window?.imageToolsOpen;
                    const open = !current;
                    win.store.dispatch(window.Mirador.actions.updateWindow(win.id, { imageToolsOpen: open }));
                    tools.setAttribute("aria-pressed", String(open));
                });

                tools.setAttribute("aria-pressed", "true");

                controls.append(sidebar, tools);
                // Mirador renders into the mount and replaces its children.
                mount.parentElement.appendChild(controls);
            });
        },
    };
})(Drupal);
