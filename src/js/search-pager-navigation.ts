/**
 * The search View uses AJAX for filters, but its pager can leave the Views
 * progress indicator running. Follow pager URLs as ordinary navigation while
 * keeping AJAX enabled for the rest of the View.
 */
document.addEventListener('click', (event: MouseEvent) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  const link = target.closest<HTMLAnchorElement>('.view-solr-search-content .pager a[href]');
  if (!link || link.target && link.target !== '_self' || link.hasAttribute('download')) {
    return;
  }

  // Drupal Views attaches its AJAX pager listener below document. Stopping
  // propagation leaves the browser's normal link navigation intact.
  event.stopPropagation();
}, true);
