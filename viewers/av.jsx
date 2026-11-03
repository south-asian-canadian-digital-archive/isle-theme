import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { IIIFPlayer, MediaPlayer, Transcript } from '@samvera/ramp';
const roots = new WeakMap();
function Player({ mount, hasTranscript, ratio }) {
  const [tab, setTab] = useState('timeline');
  const [open, setOpen] = useState(true);
  const [plainText, setPlainText] = useState('');
  const [copied, setCopied] = useState(false);
  const ref = useRef();
  const plainRef = useRef();
  useEffect(() => {
    const enhance = () => {
      [['input[data-testid="transcript-search-input"]', 'Search transcript'],
       ['select[data-testid="transcript-select-option"]', 'Transcript language']].forEach(([selector, title], index) => {
        const control = mount.querySelector(selector);
        if (!control) return;
        if (!control.dataset.labelled) {
          control.dataset.labelled = 'true';
          control.id = `${mount.id}-control-${index}`;
          const label = document.createElement('label'); label.className = 'visually-hidden';
          label.htmlFor = control.id; label.textContent = title; control.before(label);
        }
        if (control.tagName === 'SELECT') {
          const single = control.options.length === 1;
          control.hidden = single;
          let language = control.parentElement.querySelector('.sacda-transcript-language');
          if (!language) {
            language = document.createElement('span'); language.className = 'sacda-transcript-language';
            control.before(language);
          }
          language.hidden = !single;
          const value = single ? control.options[0].text : '';
          if (language.textContent !== value) language.textContent = value;
        }
      });
      const text = [...mount.querySelectorAll('.ramp--transcript_text')]
        .map(line => line.textContent.trim()).filter(Boolean).join(' ');
      setPlainText(previous => previous === text ? previous : text);
    };
    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(mount, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [mount]);
  useEffect(() => { setCopied(false); }, [plainText]);
  useEffect(() => {
    // Ramp measures its HUD on VideoJS's resize event, not on grid changes.
    let stage; let previousWidth; let frame;
    const resize = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (width === previousWidth) return;
      previousWidth = width;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const player = mount.querySelector('.video-js')?.player;
        if (player && !player.isDisposed()) {
          player.trigger('resize'); player.trigger('playerresize');
        }
      });
    });
    const watch = () => {
      const next = mount.querySelector('.sacda-av-stage');
      if (!next || next === stage) return;
      resize.disconnect(); stage = next; resize.observe(stage);
    };
    watch();
    const observer = new MutationObserver(watch);
    observer.observe(mount, { childList: true, subtree: true });
    return () => { observer.disconnect(); resize.disconnect(); cancelAnimationFrame(frame); };
  }, [mount]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(plainText); setCopied(true); }
    catch { plainRef.current?.focus(); plainRef.current?.select(); setCopied(document.execCommand('copy')); }
  };
  return <IIIFPlayer manifestUrl={mount.dataset.sacdaAv}>
    <div ref={ref} className={`sacda-av ${tab === 'plain' ? 'sacda-av--plain' : ''}`}>
      <div className={`sacda-av-layout ${!hasTranscript ? 'sacda-av-layout--media' : !open ? 'sacda-av-layout--collapsed' : ''}`}>
        <div className="sacda-av-stage" style={{ '--media-ratio': ratio }}><MediaPlayer enableFileDownload={false} /></div>
        {hasTranscript && <details className="sacda-av-transcript sacda-text-panel" id={`${mount.id}-text`} open={open}
          onToggle={event => setOpen(event.currentTarget.open)}>
          <summary>Transcript</summary>
          <div className="sacda-av-transcript-body">
          <div className="sacda-viewer-toolbar sacda-transcript-tabs">
            <div role="tablist" aria-label="Transcript format" onKeyDown={event => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next = event.key === 'Home' ? 'timeline' : event.key === 'End' ? 'plain' : tab === 'timeline' ? 'plain' : 'timeline';
                setTab(next); ref.current.querySelector(`#${mount.id}-${next}-tab`).focus();
              }
            }}>
              {[['timeline', 'Timeline'], ['plain', 'Plain text']].map(([id, label]) => <button type="button" role="tab"
                id={`${mount.id}-${id}-tab`} aria-selected={tab === id} aria-controls={`${mount.id}-${id}-panel`}
                tabIndex={tab === id ? 0 : -1} key={id} onClick={() => setTab(id)}>{label}</button>)}
            </div>
          </div>
          <div id={`${mount.id}-timeline-panel`} role={tab === 'timeline' ? 'tabpanel' : undefined}
            aria-labelledby={tab === 'timeline' ? `${mount.id}-timeline-tab` : undefined}>
            <Transcript playerID={mount.id} manifestUrl={mount.dataset.sacdaAv} />
          </div>
          <div id={`${mount.id}-plain-panel`} role="tabpanel" aria-labelledby={`${mount.id}-plain-tab`} hidden={tab !== 'plain'} className="sacda-text-panel__body">
            <button type="button" className="btn btn-outline" disabled={!plainText} onClick={copy}>Copy text</button>
            <span className="text-sm" role="status">{copied ? 'Copied' : ''}</span>
            <textarea ref={plainRef} aria-label="Plain text transcript" className="form-textarea w-full" rows="12" readOnly value={plainText} />
          </div>
          </div>
        </details>}
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
