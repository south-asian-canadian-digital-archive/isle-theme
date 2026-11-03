/** Ordinary gestures scroll the repository page, without an interaction mode. */
export function setupPdfScrolling(frame) {
  let previousTouchY = null; let removeListeners = () => {};
  const bind = () => {
    removeListeners();
    let doc;
    try { doc = frame.contentDocument; if (!doc) return; } catch { return; }
    const wheel = event => {
      // Modified wheels retain PDF.js's own zoom behavior.
      if (event.ctrlKey || event.metaKey) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
      window.scrollBy({ top: event.deltaY * unit, left: event.deltaX * unit, behavior: 'instant' });
    };
    const touchStart = event => { previousTouchY = event.touches.length === 1 ? event.touches[0].clientY : null; };
    const touchMove = event => {
      // One finger moves the page; two-finger gestures remain with PDF.js.
      if (event.touches.length !== 1 || previousTouchY === null) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const y = event.touches[0].clientY;
      window.scrollBy({ top: previousTouchY - y, behavior: 'instant' }); previousTouchY = y;
    };
    doc.addEventListener('wheel', wheel, { capture: true, passive: false });
    doc.addEventListener('touchstart', touchStart, { capture: true, passive: true });
    doc.addEventListener('touchmove', touchMove, { capture: true, passive: false });
    removeListeners = () => {
      doc.removeEventListener('wheel', wheel, true); doc.removeEventListener('touchstart', touchStart, true);
      doc.removeEventListener('touchmove', touchMove, true);
    };
  };
  frame.addEventListener('load', bind);
  return () => { removeListeners(); frame.removeEventListener('load', bind); };
}
