/** Progressive enhancement for result grids with a grid/list switch. */
function initResultsDisplay(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-results-display-wrapper]').forEach((wrapper) => {
    if (wrapper.dataset.resultsDisplayReady) return;
    const cards = wrapper.querySelector<HTMLElement>('[data-results-cards]');
    const controls = wrapper.querySelector<HTMLElement>('[data-results-display-controls]');
    if (!cards || !controls) return;
    wrapper.dataset.resultsDisplayReady = 'true';
    controls.hidden = false;
    controls.querySelectorAll<HTMLButtonElement>('[data-results-display]').forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.dataset.resultsDisplay === 'list' ? 'list' : 'grid';
        cards.classList.toggle('results-cards--grid', mode === 'grid');
        cards.classList.toggle('results-cards--list', mode === 'list');
        controls.querySelectorAll<HTMLButtonElement>('[data-results-display]').forEach((option) => {
          const active = option.dataset.resultsDisplay === mode;
          option.classList.toggle('pager__link--is-active', active);
          option.setAttribute('aria-pressed', String(active));
        });
      });
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initResultsDisplay(document));
} else {
  initResultsDisplay(document);
}
