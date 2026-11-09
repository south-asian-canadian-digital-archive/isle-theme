/**
 * Per-facet "Filter…" box for the server-rendered (Twig) checkbox facets,
 * e.g. collection member listings. Mirrors fast search's CheckboxFacet.svelte
 * so both look and behave the same:
 *  - shown only on facets that have a soft-limit "Show more" link;
 *  - matches value labels case-insensitively, keeping a parent when any
 *    descendant matches;
 *  - while filtering, the soft limit is ignored and the "Show more" link hidden;
 *    clearing the box restores whatever soft-limit.js had shown or hidden.
 *
 * The Twig widget already has every value in the DOM (soft-limit.js only hides
 * them), so no request is needed. Facet blocks are replaced on AJAX refresh,
 * hence a Drupal behavior with once().
 */

export {};

const ITEM = ":scope > li.facet-item";

function setup(widget: HTMLElement) {
	const list = widget.querySelector<HTMLUListElement>(":scope > ul.js-facets-widget, :scope > ul");
	const more = widget.querySelector<HTMLElement>(":scope > .facets-soft-limit-link");
	// Fast search's Svelte widget renders its own box with the same classes.
	if (!list || !more || widget.querySelector(":scope > .facets-filter")) return;

	const input = document.createElement("input");
	input.type = "search";
	input.className = "facets-filter form-text mb-2 w-full";
	input.placeholder = "Filter…";
	input.setAttribute("aria-label", "Filter values");
	widget.insertBefore(input, list);

	const empty = document.createElement("p");
	empty.className = "facets-filter-empty text-sm";
	empty.textContent = "No matches.";
	empty.hidden = true;
	list.after(empty);

	// Inline display as soft-limit.js left it, restored when the box clears.
	const saved = new Map<HTMLElement, string>();
	const allItems = () => Array.from(list.querySelectorAll<HTMLElement>("li.facet-item"));

	// Returns whether `li` or any descendant matches; hides non-matches.
	const apply = (li: HTMLElement, needle: string): boolean => {
		const label = li.querySelector(":scope > label .facet-item__value, :scope > a .facet-item__value")?.textContent ?? "";
		const self = label.toLowerCase().includes(needle);
		let child = false;
		for (const sub of li.querySelectorAll<HTMLElement>(":scope > div > ul > li.facet-item, :scope > ul > li.facet-item")) {
			// A matching parent shows all its children, as in the Svelte version.
			if (self) sub.style.display = "";
			else child = apply(sub, needle) || child;
		}
		if (self) for (const d of li.querySelectorAll<HTMLElement>("li.facet-item")) d.style.display = "";
		const hit = self || child;
		li.style.display = hit ? "" : "none";
		return hit;
	};

	input.addEventListener("input", () => {
		const needle = input.value.trim().toLowerCase();
		if (needle) {
			if (!saved.size) for (const li of allItems()) saved.set(li, li.style.display);
			let any = false;
			for (const li of list.querySelectorAll<HTMLElement>(ITEM)) any = apply(li, needle) || any;
			more.style.display = "none";
			empty.hidden = any;
		} else {
			for (const [li, display] of saved) li.style.display = display;
			saved.clear();
			more.style.display = "";
			empty.hidden = true;
		}
	});
}

const w = window as unknown as {
	Drupal?: { behaviors: Record<string, { attach: (c: Document | HTMLElement) => void }> };
	once?: (id: string, selector: string, context?: Document | HTMLElement) => Element[];
};

if (w.Drupal && w.once) {
	w.Drupal.behaviors.sacdaFacetFilter = {
		attach(context) {
			// soft-limit.js adds its link in its own behavior; defer so it exists.
			requestAnimationFrame(() => {
				for (const el of w.once!("sacda-facet-filter", ".facets-widget-checkbox", context)) {
					setup(el as HTMLElement);
				}
			});
		},
	};
}
