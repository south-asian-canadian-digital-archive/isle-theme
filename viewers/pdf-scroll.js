/**
 * Scrolling over PDF.js scrolls the document; once it reaches its top or
 * bottom edge, further scrolling moves the repository page instead of
 * getting stuck inside the frame.
 */
export function setupPdfScrolling(frame) {
  let previousTouchY = null; let removeListeners = () => {};
  const bind = () => {
    removeListeners();
    let doc;
    try { doc = frame.contentDocument; if (!doc) return; } catch { return; }
    const scroller = () => doc.getElementById('viewerContainer');
    // True when the PDF can still scroll in the direction of deltaY.
    const canScroll = deltaY => {
      const el = scroller();
      if (!el || deltaY === 0) return false;
      return deltaY < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    };
    const wheel = event => {
      // Modified wheels keep PDF.js's own zoom behavior.
      if (event.ctrlKey || event.metaKey) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
      if (canScroll(event.deltaY)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      window.scrollBy({ top: event.deltaY * unit, behavior: 'instant' });
    };
    const touchStart = event => { previousTouchY = event.touches.length === 1 ? event.touches[0].clientY : null; };
    const touchMove = event => {
      // Two-finger gestures stay with PDF.js (pinch zoom).
      if (event.touches.length !== 1 || previousTouchY === null) return;
      const y = event.touches[0].clientY; const delta = previousTouchY - y; previousTouchY = y;
      if (canScroll(delta)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      window.scrollBy({ top: delta, behavior: 'instant' });
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
