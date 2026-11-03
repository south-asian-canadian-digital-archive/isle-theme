// @ts-nocheck
import { attachRecognizedTextSearch } from '../../viewers/recognized-text-search.js';
// Reuse PDF.js's embedded text layer. No separate OCR copy or PDF renderer.
((Drupal) => {
  Drupal.behaviors.sacdaPdfText = {
    attach(context) {
      const root = context instanceof Element ? context : document;
      root.querySelectorAll('[data-pdf-preview]').forEach(preview => {
        if (preview.dataset.textBound) return;
        preview.dataset.textBound = 'true';
        const observer = new MutationObserver(() => {
          const frame = preview.querySelector('iframe');
          if (!frame) return;
          observer.disconnect();
          let attempts = 0;
          const timer = setInterval(async () => {
            if (!frame.isConnected || ++attempts > 240) { clearInterval(timer); return; }
            let app;
            try { app = frame.contentWindow.PDFViewerApplication; } catch { clearInterval(timer); return; }
            if (!app?.pdfDocument || !app.pdfViewer) return;
            clearInterval(timer);
            const viewer = preview.querySelector('[data-pdf-preview-viewer]');
            viewer.classList.add('sacda-pdf-reader');
            const aside = document.createElement('aside');
            aside.className = 'sacda-image-transcript'; aside.hidden = true;
            const details = document.createElement('details'); details.open = true; details.className = 'sacda-text-panel';
            const summary = document.createElement('summary'); summary.textContent = Drupal.t('Recognized text');
            const body = document.createElement('div'); body.className = 'sacda-text-panel__body'; body.dir = 'auto';
            const searchSlot = document.createElement('div'); searchSlot.className = 'sacda-text-panel__body sacda-text-search-slot';
            details.append(summary, searchSlot, body); aside.append(details); viewer.append(aside);
            attachRecognizedTextSearch(searchSlot, body, details, 'Search text on this page');
            const style = frame.contentDocument.createElement('style');
            style.textContent = '.sacda-pdf-highlight{position:absolute;background:#ffce3466;outline:1px solid #414042;pointer-events:none;z-index:5}';
            frame.contentDocument.head.append(style);
            const clear = () => frame.contentDocument.querySelectorAll('.sacda-pdf-highlight').forEach(box => box.remove());
            let version = 0;
            const render = async (event = {}) => {
              const request = ++version;
              const pageNumber = event.pageNumber || app.pdfViewer.currentPageNumber || 1;
              const page = await app.pdfDocument.getPage(pageNumber);
              const content = await page.getTextContent();
              if (request !== version || !frame.isConnected) return;
              clear(); body.replaceChildren();
              const lines = []; let line = [];
              for (const item of content.items) {
                if (!item.str) continue;
                if (line.length && Math.abs(item.transform[5] - line[0].transform[5]) > 2) { lines.push(line); line = []; }
                line.push(item);
                if (item.hasEOL) { lines.push(line); line = []; }
              }
              if (line.length) lines.push(line);
              aside.hidden = lines.length === 0;
              const note = document.createElement('p'); note.className = 'sacda-transcript-note';
              note.textContent = Drupal.t('Text layer · Page @page', { '@page': pageNumber }); body.append(note);
              for (const items of lines) {
                const button = document.createElement('button'); button.type = 'button'; button.dataset.ocrLine = '';
                button.textContent = items.map(item => item.str).join(' ');
                const highlight = (scroll = false) => {
                  clear(); const view = app.pdfViewer.getPageView(pageNumber - 1);
                  if (!view?.div || !view.viewport) return;
                  const v = view.viewport.transform;
                  for (const item of items) {
                    const t = item.transform;
                    const x = v[0]*t[4] + v[2]*t[5] + v[4];
                    const y = v[1]*t[4] + v[3]*t[5] + v[5];
                    const height = Math.hypot(t[2], t[3]) * view.viewport.scale;
                    const box = document.createElement('div'); box.className = 'sacda-pdf-highlight';
                    Object.assign(box.style, { left: `${x}px`, top: `${y-height}px`, width: `${item.width*view.viewport.scale}px`, height: `${height*1.2}px` });
                    view.div.append(box);
                    if (scroll) {
                      const scroller = frame.contentDocument.getElementById('viewerContainer');
                      if (scroller) scroller.scrollTop += box.getBoundingClientRect().top - scroller.getBoundingClientRect().top - scroller.clientHeight / 2;
                      scroll = false;
                    }
                  }
                };
                button.addEventListener('mouseenter', () => highlight()); button.addEventListener('mouseleave', clear);
                button.addEventListener('focus', () => highlight()); button.addEventListener('blur', clear);
                button.addEventListener('click', () => highlight(true)); body.append(button);
              }
            };
            app.eventBus.on('pagechanging', render); app.eventBus.on('scalechanging', clear); app.eventBus.on('rotationchanging', clear);
            render().catch(() => { aside.hidden = true; });
          }, 250);
        });
        observer.observe(preview, { childList: true, subtree: true });
      });
    },
  };
})(Drupal);
