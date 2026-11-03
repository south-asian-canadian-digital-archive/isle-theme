import React from 'react';
import { createRoot } from 'react-dom/client';
import { IIIFPlayer, MediaPlayer, Transcript } from '@samvera/ramp';
const roots = new WeakMap();
Drupal.behaviors.sacdaAV = {
  attach(context) {
    once('sacda-av', '[data-sacda-av]', context).forEach(async mount => {
      const root = createRoot(mount);
      roots.set(mount, root);
      let hasTranscript = false;
      try {
        const response = await fetch(mount.dataset.sacdaAv);
        if (!response.ok) throw new Error('Manifest request failed');
        const manifest = await response.json();
        hasTranscript = manifest.items?.some(canvas => canvas.annotations?.some(page =>
          page.items?.some(annotation => annotation.motivation === 'supplementing')));
      } catch {
        mount.textContent = Drupal.t('The media could not be loaded. Please try again.');
        return;
      }
      if (!mount.isConnected) return;
      root.render(<IIIFPlayer manifestUrl={mount.dataset.sacdaAv}>
        <div className={hasTranscript ? "sacda-av-layout" : "sacda-av-media"}><MediaPlayer enableFileDownload={false} />
          {hasTranscript && <Transcript playerID={mount.id} manifestUrl={mount.dataset.sacdaAv} />}</div>
      </IIIFPlayer>);
    });
  },
  detach(context, settings, trigger) {
    if (trigger === 'unload') once.remove('sacda-av', '[data-sacda-av]', context)
      .forEach(mount => { roots.get(mount)?.unmount(); roots.delete(mount); });
  },
};
