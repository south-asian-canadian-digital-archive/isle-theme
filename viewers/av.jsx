import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { IIIFPlayer, MediaPlayer, Transcript } from '@samvera/ramp';
const roots = new WeakMap();
function Player({ mount, hasTranscript, ratio }) {
  const [tab, setTab] = useState('media');
  const [open, setOpen] = useState(true);
  const [timestamps, setTimestamps] = useState(true);
  const ref = useRef();
  useEffect(() => {
    const enhance = () => {
      [['input[data-testid="transcript-search-input"]', 'Search transcript'],
       ['select[data-testid="transcript-select-option"]', 'Transcript language']].forEach(([selector, title], index) => {
        const control = mount.querySelector(selector);
        if (!control || control.dataset.labelled) return;
        control.dataset.labelled = 'true';
        control.id = `${mount.id}-control-${index}`;
        const label = document.createElement('label'); label.className = 'sacda-control-label';
        label.htmlFor = control.id; label.textContent = title; control.before(label);
      });
      ref.current?.querySelectorAll('.ramp--transcript_text').forEach(text => {
      text.tabIndex = timestamps ? -1 : 0;
      text.setAttribute('role', 'button');
      });
    };
    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(mount, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [timestamps]);
  return <IIIFPlayer manifestUrl={mount.dataset.sacdaAv}>
    <div ref={ref} className={`sacda-av ${timestamps ? '' : 'sacda-av--plain'}`}>
      {hasTranscript && <div className="sacda-viewer-toolbar">
        <div role="tablist" aria-label="Media views" onKeyDown={event => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const next = event.key === 'Home' ? 'media' : event.key === 'End' ? 'text' : tab === 'media' ? 'text' : 'media';
            setTab(next); ref.current.querySelector(`#${mount.id}-${next}-tab`).focus();
          }
        }}>
          {[['media', 'Media'], ['text', 'Transcript']].map(([id, label]) => <button type="button" role="tab"
            id={`${mount.id}-${id}-tab`} aria-selected={tab === id} aria-controls={`${mount.id}-view`}
            tabIndex={tab === id ? 0 : -1} key={id} onClick={() => setTab(id)}>{label}</button>)}
        </div>
        {tab === 'media' && <button type="button" className="sacda-panel-toggle" aria-expanded={open}
          aria-controls={`${mount.id}-text`} onClick={() => setOpen(!open)}>{open ? 'Hide transcript' : 'Show transcript'}</button>}
      </div>}
      <div id={`${mount.id}-view`} role={hasTranscript ? 'tabpanel' : undefined}
        aria-labelledby={hasTranscript ? `${mount.id}-${tab}-tab` : undefined}
        className={`sacda-av-layout ${tab === 'text' ? 'sacda-av-layout--text' : !open || !hasTranscript ? 'sacda-av-layout--media' : ''}`}>
        <div className="sacda-av-stage" hidden={tab === 'text'} style={{ '--media-ratio': ratio }}><MediaPlayer enableFileDownload={false} /></div>
        {hasTranscript && <section onClickCapture={event => {
          if (!timestamps && event.target.closest('.ramp--transcript_text')) {
            event.preventDefault(); event.stopPropagation();
            event.target.closest('.ramp--transcript_item')?.querySelector('.ramp--transcript_time')?.click();
          }
        }} onKeyDownCapture={event => {
          if (!timestamps && ['Enter', ' '].includes(event.key) && event.target.matches('.ramp--transcript_text')) {
            event.preventDefault(); event.stopPropagation();
            event.target.closest('.ramp--transcript_item')?.querySelector('.ramp--transcript_time')?.click();
          }
        }} className="sacda-av-transcript" id={`${mount.id}-text`} hidden={tab === 'media' && !open}>
          <div className="sacda-transcript-options"><label><input type="checkbox" checked={timestamps}
            onChange={event => setTimestamps(event.target.checked)} /> Show timestamps</label></div>
          <Transcript playerID={mount.id} manifestUrl={mount.dataset.sacdaAv} />
        </section>}
      </div>
    </div>
  </IIIFPlayer>;
}
Drupal.behaviors.sacdaAV = {
  attach(context) {
    once('sacda-av', '[data-sacda-av]', context).forEach(async mount => {
      try {
        const response = await fetch(mount.dataset.sacdaAv);
        if (!response.ok) throw new Error('Manifest request failed');
        const manifest = await response.json();
        const hasTranscript = manifest.items?.some(canvas => canvas.annotations?.some(page =>
          page.items?.some(annotation => annotation.motivation === 'supplementing')));
        const canvas = manifest.items?.[0];
        const ratio = canvas?.width && canvas?.height ? `${canvas.width} / ${canvas.height}` : '16 / 9';
        if (!mount.isConnected) return;
        const root = createRoot(mount); roots.set(mount, root);
        root.render(<Player mount={mount} hasTranscript={hasTranscript} ratio={ratio} />);
      } catch { mount.textContent = Drupal.t('The media could not be loaded. Please try again.'); }
    });
  },
  detach(context, settings, trigger) {
    if (trigger === 'unload') once.remove('sacda-av', '[data-sacda-av]', context)
      .forEach(mount => { roots.get(mount)?.unmount(); roots.delete(mount); });
  },
};
