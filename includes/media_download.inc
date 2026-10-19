<?php

/**
 * @file
 * Download-card data for the `source` media view mode.
 *
 * Models with no viewer (Binary) get the media_display_blocks "source" block
 * in the media_content region, the sacda equivalent of the starter site's
 * default_media_display context. The media's own source display is a bare
 * file link, so the template renders a card instead and needs the file URL,
 * name and a human-readable size resolved here.
 */

use Drupal\Core\StringTranslation\ByteSizeMarkup;
use Drupal\file\FileInterface;
use Drupal\media\MediaInterface;

/**
 * Adds download variables for a media entity in the `source` view mode.
 */
function _sacda_media_download_variables(array &$variables): void {
  $media = $variables['media'] ?? NULL;
  if (!$media instanceof MediaInterface) {
    return;
  }

  $source_field = $media->getSource()->getConfiguration()['source_field'] ?? NULL;
  $file = $source_field && $media->hasField($source_field) ? $media->get($source_field)->entity : NULL;
  if (!$file instanceof FileInterface) {
    return;
  }

  $variables['download_url'] = \Drupal::service('file_url_generator')->generateString($file->getFileUri());
  $variables['download_filename'] = $file->getFilename();
  $variables['download_mime'] = $file->getMimeType();
  $variables['download_size'] = $file->getSize() ? ByteSizeMarkup::create((int) $file->getSize()) : NULL;
}
