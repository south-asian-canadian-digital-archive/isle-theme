<?php

/**
 * @file
 * Animated GIFs in the `video` media view mode.
 *
 * A GIF original gets an MP4 Service File (context gif_original_file) rather
 * than a JPEG one, so the video viewer block renders it. Played with controls
 * it reads as a video; this flags it so the template plays it like the GIF it
 * came from: autoplaying, looped and muted.
 */

use Drupal\media\MediaInterface;

/**
 * Flags a video media whose parent node's Original File is a GIF.
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

  $utils = \Drupal::service('islandora.utils');
  $original = $utils->getMediaWithTerm($node, $utils->getTermForUri('http://pcdm.org/use#OriginalFile'));
  $file = $original && $original->hasField('field_media_image') ? $original->get('field_media_image')->entity : NULL;
  if (!$file || $file->getMimeType() !== 'image/gif') {
    return;
  }

  $video = $media->hasField('field_media_video_file') ? $media->get('field_media_video_file')->entity : NULL;
  if ($video) {
    $variables['animated_gif_url'] = \Drupal::service('file_url_generator')->generateString($video->getFileUri());
    $variables['animated_gif_label'] = $original->get('field_media_image')->alt ?: $node->label();
  }
}
