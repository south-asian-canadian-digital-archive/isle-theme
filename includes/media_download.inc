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

/**
 * Adds an access-aware file list to the item sidebar.
 *
 * Public downloads include originals, Service Files and extracted text.
 * Technical metadata is available to media administrators.
 */
function sacda_preprocess_node__islandora_object(array &$variables): void {
  if (($variables['view_mode'] ?? '') !== 'full') {
    return;
  }
  $node = $variables['node'];
  $cache = \Drupal\Core\Cache\CacheableMetadata::createFromRenderArray($variables);
  $cache->addCacheTags(['media_list', 'file_list']);
  $cache->addCacheContexts(['user.permissions']);
  $admin = \Drupal::currentUser()->hasPermission('administer media');
  $uses = [
    'http://pcdm.org/use#OriginalFile' => t('Original'),
    'http://pcdm.org/use#ServiceFile' => t('Service file'),
    'http://pcdm.org/use#ExtractedText' => t('Extracted text'),
  ];
  if ($admin) {
    $uses += [
      'https://projects.iq.harvard.edu/fits' => t('Technical metadata'),
    ];
  }
  $storage = \Drupal::entityTypeManager()->getStorage('media');
  $ids = $storage->getQuery()->accessCheck(TRUE)->condition('field_media_of', $node->id())
    ->condition('status', 1)->sort('mid')->execute();
  $variables['item_downloads'] = [];
  $seen = [];
  foreach ($storage->loadMultiple($ids) as $media) {
    $access = $media->access('view', NULL, TRUE);
    $cache->addCacheableDependency($media)->addCacheableDependency($access);
    if (!$access->isAllowed()) {
      continue;
    }
    $label = NULL;
    foreach ($media->field_media_use->referencedEntities() as $term) {
      $cache->addCacheableDependency($term);
      $uri = $term->field_external_uri->uri;
      if (isset($uses[$uri])) {
        $label = $uses[$uri];
        break;
      }
    }
    if (!$label) {
      continue;
    }
    $field = $media->getSource()->getConfiguration()['source_field'] ?? NULL;
    if (!$field || !$media->hasField($field)) {
      continue;
    }
    $access = $media->get($field)->access('view', NULL, TRUE);
    $cache->addCacheableDependency($access);
    $file = $media->get($field)->entity;
    if (!$access->isAllowed() || !$file instanceof FileInterface || isset($seen[$file->id()])) {
      continue;
    }
    $access = $file->access('view', NULL, TRUE);
    $cache->addCacheableDependency($file)->addCacheableDependency($access);
    if (!$access->isAllowed()) {
      continue;
    }
    $seen[$file->id()] = TRUE;
    $variables['item_downloads'][] = [
      'label' => $label,
      'url' => \Drupal::service('file_url_generator')->generateString($file->getFileUri()),
      'name' => $file->getFilename(),
      'format' => strtoupper(pathinfo($file->getFilename(), PATHINFO_EXTENSION)),
      'size' => ByteSizeMarkup::create((int) $file->getSize()),
    ];
  }
  $cache->applyTo($variables);
}
