import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Mirador, { getVisibleCanvases, miradorSlice } from 'mirador';
import textOverlay from 'mirador-textoverlay';

function Transcript({ viewer, canvases, texts, windowId }) {
  const overlay = useRef(null);
  const panel = document.querySelector(`[data-transcript-for="${windowId}"]`)
    || document.querySelector('.sacda-reader [data-image-transcript]');
  const clear = () => {
    if (overlay.current && viewer) viewer.removeOverlay(overlay.current);
    overlay.current = null;
  };
  useEffect(() => clear, [viewer, canvases.map(c => c.id).join('|')]);
  const pages = canvases.map((canvas, index) => ({ canvas, index, text: texts?.[canvas.id]?.text }))
    .filter(page => page.text?.lines?.length);
  useEffect(() => {
    if (panel) panel.hidden = pages.length === 0;
  }, [panel, pages.length]);
  if (!panel) return null;
  const highlight = (line, page, seek = false) => {
    clear();
    const image = viewer?.world.getItemAt(page.index);
    if (!image || !Number.isFinite(line.x) || !Number.isFinite(line.width)) return;
    const scale = image.getContentSize().x / page.text.width;
    const rect = image.imageToViewportRectangle(line.x * scale, line.y * scale,
      line.width * scale, line.height * scale);
    const box = document.createElement('div');
    box.className = 'sacda-ocr-highlight';
    viewer.addOverlay({ element: box, location: rect });
    overlay.current = box;
    if (seek) viewer.viewport.fitBounds(rect, false);
  };
  return createPortal(<details className="sacda-text-panel">
    <summary>Recognized text</summary>
    <div className="sacda-text-panel__body">
      <p className="sacda-transcript-note">Automatically recognized text may contain errors.</p>
      {pages.map(page => <div key={page.canvas.id} dir="auto">
        {page.text.lines.map((line, index) => <button key={index} type="button"
          onMouseEnter={() => highlight(line, page)} onMouseLeave={clear}
          onFocus={() => highlight(line, page)} onBlur={clear}
          onClick={() => highlight(line, page, true)}>{line.text || line.spans?.map(s => s.text).join('')}</button>)}
      </div>)}
    </div>
  </details>, panel);
}
const transcriptPlugin = {
  target: 'OpenSeadragonViewer', mode: 'add', component: Transcript,
  mapStateToProps: (state, { windowId }) => ({
    windowId, canvases: getVisibleCanvases(state, { windowId }), texts: miradorSlice(state).texts,
  }),
};

Drupal.behaviors.sacdaImageViewer = {
  attach(context, settings) {
    Object.entries(settings.mirador?.viewers || {}).forEach(([selector, config]) => {
      once('sacda-image-viewer', selector, context).forEach(mount => {
        const wrapper = document.createElement('div');
        wrapper.className = 'sacda-reader';
        mount.before(wrapper);
        wrapper.append(mount);
        const panel = document.createElement('aside');
        panel.dataset.imageTranscript = '';
        panel.className = 'sacda-image-transcript';
        panel.setAttribute('aria-label', Drupal.t('Recognized text'));
        panel.hidden = true;
        wrapper.append(panel);
        const sidebar = wrapper.parentElement.querySelector(':scope > .mirador-sidebar-toggle');
        if (sidebar) wrapper.append(sidebar);
        const instance = Mirador.viewer(config, [...textOverlay, transcriptPlugin]);
        Drupal.IslandoraMirador ||= { instances: {} };
        Drupal.IslandoraMirador.instances[selector] = instance;
        window.Mirador = Mirador;
      });
    });
  },
  detach(context, settings, trigger) {
    if (trigger !== 'unload') return;
    Object.keys(settings.mirador?.viewers || {}).forEach(selector => {
      once.remove('sacda-image-viewer', selector, context).forEach(() => {
        Drupal.IslandoraMirador.instances[selector]?.unmount();
        delete Drupal.IslandoraMirador.instances[selector];
      });
    });
  },
};
