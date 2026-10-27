<?php

/**
 * @file
 * Suppresses node body output on the theme-templated info pages.
 *
 * /about, /contact and /newsletter are `page` nodes whose layout lives entirely
 * in templates/page/page--*.html.twig. The node itself exists only so the route,
 * path alias, menu link and contextual edit links work — its body is a
 * placeholder ("content provided by theme template") that would otherwise print
 * in the middle of the designed layout.
 *
 * The node is still rendered (so admins keep the contextual pencil and the
 * content region isn't empty); only the body field is dropped.
 *
 * Done here rather than in the entity view display because hiding `body` in
 * config would hide it for EVERY basic page, including ordinary editorial ones
 * that have no bespoke template.
 */

/**
 * Info-page aliases whose node body is layout-managed by a page template.
 *
 * Add a path here when a new `page` node gets its own page--*.html.twig.
 */
const SACDA_TEMPLATED_INFO_PATHS = [
  '/about',
  '/contact',
  '/newsletter',
];

/**
 * Adds cached public Mailchimp campaign data to the newsletter page.
 *
 * The old site queried Mailchimp's authenticated campaigns API. The public RSS
 * feed contains the fields this design needs and avoids storing a credential in
 * the theme. A local logo remains available when a campaign has no usable image.
 */
function _sacda_preprocess_newsletter(array &$variables, string $theme_path): void {
  $variables['newsletter_issues'] = [];
  $variables['newsletter_archive_url'] = 'https://us4.campaign-archive.com/home/?u=3c616907ab5cf63924a62f942&id=383fd0ae1e';

  $path = \Drupal::service('path.current')->getPath();
  $alias = \Drupal::service('path_alias.manager')->getAliasByPath($path);
  if ($alias !== '/newsletter') {
    return;
  }

  // Ensure Drupal's rendered-page caches expire when the feed cache does.
  $variables['page']['#cache']['max-age'] = 3600;
  $cache = \Drupal::cache();
  $cache_id = 'sacda:newsletter_issues:v2';
  if ($cached = $cache->get($cache_id)) {
    $variables['newsletter_issues'] = $cached->data;
    return;
  }

  $feed_url = 'https://us4.campaign-archive.com/feed?u=3c616907ab5cf63924a62f942&id=383fd0ae1e';
  $fallback_image = $theme_path . '/static/graphics/contribute/SACDA_Hive.png';

  try {
    $response = \Drupal::httpClient()->get($feed_url, [
      'connect_timeout' => 3,
      'timeout' => 8,
      'headers' => ['Accept' => 'application/rss+xml, application/xml;q=0.9'],
    ]);
    $xml = @simplexml_load_string((string) $response->getBody(), 'SimpleXMLElement', LIBXML_NOCDATA | LIBXML_NONET);
    if (!$xml || empty($xml->channel->item)) {
      return;
    }

    $issues = [];
    $seen_titles = [];
    foreach ($xml->channel->item as $item) {
      $title = trim((string) $item->title);
      $url = trim((string) $item->link);
      if ($title === '' || !filter_var($url, FILTER_VALIDATE_URL)) {
        continue;
      }

      // Mailchimp can expose multiple sends of the same campaign in its feed.
      // It is ordered newest-first, so retain the newest URL for each title.
      $normalized_title = mb_strtolower(preg_replace('/\s+/u', ' ', $title), 'UTF-8');
      if (isset($seen_titles[$normalized_title])) {
        continue;
      }
      $seen_titles[$normalized_title] = TRUE;

      $html = (string) $item->description;
      $content = $item->children('http://purl.org/rss/1.0/modules/content/');
      if (isset($content->encoded)) {
        $html .= ' ' . (string) $content->encoded;
      }

      $preview = '';
      if (preg_match('/class=["\'][^"\']*mcnPreviewText[^"\']*["\'][^>]*>(.*?)<\/span>/is', $html, $match)) {
        $preview = trim(html_entity_decode(strip_tags($match[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
      }

      $image = $fallback_image;
      if (preg_match('/<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)/i', $html, $match) ||
          preg_match('/<img[^>]+src=["\'](https:\/\/mcusercontent\.com\/[^"\']+)/i', $html, $match)) {
        $candidate = html_entity_decode($match[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        if (filter_var($candidate, FILTER_VALIDATE_URL)) {
          $image = $candidate;
        }
      }

      $issues[] = [
        'title' => $title,
        'url' => $url,
        'preview' => $preview,
        'image' => $image,
      ];
    }

    if ($issues) {
      $variables['newsletter_issues'] = $issues;
      $cache->set($cache_id, $issues, \Drupal::time()->getRequestTime() + 3600);
    }
  }
  catch (\Throwable $exception) {
    \Drupal::logger('sacda')->warning('Unable to refresh the newsletter feed: @message', [
      '@message' => $exception->getMessage(),
    ]);
  }
}

/**
 * Implements hook_preprocess_HOOK() for node.
 */
function sacda_preprocess_node(array &$variables): void {
  _sacda_preprocess_taxonomy_card($variables);
  $node = $variables['node'] ?? NULL;
  if (!$node || $node->bundle() !== 'page' || empty($variables['content']['body'])) {
    return;
  }

  // Match on the node's own alias rather than the current path, so the body
  // stays hidden however the node is routed to.
  $alias = \Drupal::service('path_alias.manager')
    ->getAliasByPath('/node/' . $node->id());

  if (in_array($alias, SACDA_TEMPLATED_INFO_PATHS, TRUE)) {
    unset($variables['content']['body']);
  }
}
