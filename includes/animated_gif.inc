<?php

/**
 * @file
 * Animated GIFs in the `open_seadragon` media view mode.
 *
 * OpenSeadragon shows the node's JPEG Service File, so a GIF original renders
 * as a still first frame. When the parent node's Original File is a GIF, the
 * template shows that file as a plain image instead, which keeps it animated.
 */

use Drupal\media\MediaInterface;

/**
 * Adds the original GIF's URL for a media in the `open_seadragon` view mode.
 */
function _sacda_animated_gif_variables(array &$variables): void {
  $media = $variables['media'] ?? NULL;
  if (!$media instanceof MediaInterface || !$media->hasField('field_media_of')) {
    return;
  }
  $node = $media->get('field_media_of')->entity;
  if (!$node) {
    return;
  }

  $original = \Drupal::service('islandora.utils')->getMediaWithTerm(
    $node,
    \Drupal::service('islandora.utils')->getTermForUri('http://pcdm.org/use#OriginalFile'),
  );
  if (!$original || !$original->hasField('field_media_image')) {
    return;
  }

  $file = $original->get('field_media_image')->entity;
  if ($file && $file->getMimeType() === 'image/gif') {
    $variables['animated_gif_url'] = \Drupal::service('file_url_generator')->generateString($file->getFileUri());
    $variables['animated_gif_alt'] = $original->get('field_media_image')->alt ?: $node->label();
  }
}
