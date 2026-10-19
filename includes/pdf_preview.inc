<?php

/**
 * @file
 * Poster-card data for the `pdfjs` media view mode.
 *
 * The pdfjs block sits in the `media_content` region, which renders above the
 * node's own content. Loading pdf.js eagerly at full height therefore cost a
 * whole screen before any metadata, made the record page start with a
 * scroll-trapping iframe, and fetched the PDF for every visitor whether or not
 * they wanted to read it.
 *
 * So the view mode now renders a poster card and only swaps in the real viewer
 * on request (see src/js/pdf-preview.ts). The template needs a handful of
 * things the media entity doesn't hand over directly — the pdf.js viewer URL,
 * a first-page image, a human-readable size — which is what this file resolves.
 *
 * Deliberately not done in config: `pdf_default` has no "first page only" or
 * lazy-load setting (its `page` key is just an initial #page=N anchor), and its
 * height: 100% is still correct once the viewer IS expanded.
 */

use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\StringTranslation\ByteSizeMarkup;
use Drupal\media\MediaInterface;

/**
 * Implements hook_preprocess_HOOK() for media.
 */
function sacda_preprocess_media(array &$variables): void {
  if (($variables['elements']['#view_mode'] ?? NULL) === 'source') {
    _sacda_media_download_variables($variables);
    return;
  }
  if (($variables['elements']['#view_mode'] ?? NULL) === 'video') {
    _sacda_animated_gif_variables($variables);
    return;
  }
  if (($variables['elements']['#view_mode'] ?? NULL) !== 'pdfjs') {
    return;
  }

  $media = $variables['media'] ?? NULL;
  if (!$media instanceof MediaInterface) {
    return;
  }

  // media.document uses field_media_document, media.file uses field_media_file.
  // The old template hardcoded the former, so a file-bundle PDF rendered as an
  // empty full-viewport black box.
  $field_name = NULL;
  foreach (['field_media_document', 'field_media_file'] as $candidate) {
    if ($media->hasField($candidate) && !$media->get($candidate)->isEmpty()) {
      $field_name = $candidate;
      break;
    }
  }
  if (!$field_name) {
    return;
  }

  $file = $media->get($field_name)->entity;
  if (!$file) {
    return;
  }

  $url_generator = \Drupal::service('file_url_generator');
  $file_url = $url_generator->generateAbsoluteString($file->getFileUri());

  // Build the viewer URL the same way PdfDefault::viewElements() does, so a
  // site that sets pdf.settings:custom_viewer keeps working.
  $custom_viewer = \Drupal::config('pdf.settings')->get('custom_viewer');
  $viewer_path = $custom_viewer ?: base_path() . 'libraries/pdf.js/web/viewer.html';

  $variables['pdf_field_name'] = $field_name;
  $variables['pdf_file_url'] = $file_url;
  $variables['pdf_viewer_url'] = $url_generator->generateAbsoluteString($viewer_path)
    . '?file=' . rawurlencode($file_url);

  $variables['pdf_filename'] = _sacda_pdf_field_value($media, 'field_original_name')
    ?? $file->getFilename();

  $size = _sacda_pdf_field_value($media, 'field_file_size') ?? $file->getSize();
  $variables['pdf_filesize'] = $size ? ByteSizeMarkup::create((int) $size) : NULL;

  $variables['pdf_poster_url'] = _sacda_pdf_poster_url($media);
}

/**
 * Returns a scalar field value, or NULL when the field is absent or empty.
 */
function _sacda_pdf_field_value(MediaInterface $media, string $field): ?string {
  if (!$media->hasField($field) || $media->get($field)->isEmpty()) {
    return NULL;
  }
  $value = $media->get($field)->value;
  return ($value === NULL || $value === '') ? NULL : (string) $value;
}

/**
 * Resolves a first-page image for the poster.
 *
 * A document media's own base `thumbnail` is a generic file-type icon, not a
 * page render, so the real first page has to come from the sibling
 * ThumbnailImage media that the derivative pipeline generates on the parent
 * node. Nodes outside the 2026-07-23 backfill (notably the orphaned originals,
 * which have no parent and so can never get derivatives) legitimately have
 * none — the template falls back to a glyph.
 */
function _sacda_pdf_poster_url(MediaInterface $media): ?string {
  $utils = \Drupal::service('islandora.utils');
  $url_generator = \Drupal::service('file_url_generator');

  $node = $utils->getParentNode($media);
  if ($node) {
    $term = $utils->getTermForUri('http://pcdm.org/use#ThumbnailImage');
    $thumbnail_media = $term ? $utils->getMediaWithTerm($node, $term) : NULL;
    if ($thumbnail_media instanceof EntityInterface) {
      $url = _sacda_pdf_media_image_url($thumbnail_media, $url_generator);
      if ($url) {
        return $url;
      }
    }
  }

  // Fall back to the media's own thumbnail, but only when it is a real derived
  // image rather than the generic icon core ships for documents.
  if ($media->hasField('thumbnail') && !$media->get('thumbnail')->isEmpty()) {
    $file = $media->get('thumbnail')->entity;
    if ($file && !str_contains($file->getFileUri(), '/icons/')) {
      return $url_generator->generateString($file->getFileUri());
    }
  }

  return NULL;
}

/**
 * Extracts the image file URL from an image media entity.
 */
function _sacda_pdf_media_image_url(EntityInterface $media, $url_generator): ?string {
  foreach (['field_media_image', 'field_media_file', 'thumbnail'] as $field) {
    if ($media->hasField($field) && !$media->get($field)->isEmpty()) {
      $file = $media->get($field)->entity;
      if ($file) {
        return $url_generator->generateString($file->getFileUri());
      }
    }
  }
  return NULL;
}
