<?php

/**
 * @file
 * Template suggestions for SACDA theme.
 */

/**
 * Implements hook_theme_suggestions_HOOK_alter() for page templates.
 */
function sacda_theme_suggestions_page_alter(array &$suggestions, array $variables): void {
  if (\Drupal::service('path.matcher')->isFrontPage()) {
    $suggestions[] = 'page__landing';
  }

  // Path-alias-based suggestions: /about -> page__about, /about/team ->
  // page__about + page__about__team. Lets info pages (About, Contact, Team,
  // Media, Newsletter, Exhibits) get dedicated page templates keyed on alias.
  // Contact forms live at /contact/{form}, so core's path-based suggestions
  // hand them page__contact — the hand-built /contact info page — and the
  // real form renders underneath its card. Fall back to the plain page.
  if (\Drupal::routeMatch()->getRouteName() === 'entity.contact_form.canonical') {
    $suggestions = array_values(array_filter(
      $suggestions,
      static fn (string $s): bool => !str_starts_with($s, 'page__contact'),
    ));
    return;
  }
  $path = \Drupal::service('path.current')->getPath();
  $alias = \Drupal::service('path_alias.manager')->getAliasByPath($path);
  $parts = array_values(array_filter(explode('/', $alias)));
  if ($parts && preg_match('/^[a-z0-9_-]+$/', $parts[0])) {
    $suggestion = 'page';
    foreach ($parts as $part) {
      if (!preg_match('/^[a-z0-9_-]+$/', $part)) {
        break;
      }
      $suggestion .= '__' . str_replace('-', '_', $part);
      $suggestions[] = $suggestion;
    }
  }
}

/**
 * Implements hook_theme_suggestions_HOOK_alter() for block templates.
 */
function sacda_theme_suggestions_block_alter(array &$suggestions, array $variables): void {
  if (isset($variables['elements']['#plugin_id'])) {
    $plugin_id = $variables['elements']['#plugin_id'];
    
    if (strpos($plugin_id, 'system_menu_block:') === 0) {
      $menu_name = str_replace('system_menu_block:', '', $plugin_id);
      $suggestions[] = 'block__system_menu_block__' . $menu_name;
    }
  }
  
  if (isset($variables['elements']['#configuration']['region'])) {
    $region = $variables['elements']['#configuration']['region'];
    $suggestions[] = 'block__region__' . $region;

    if (isset($variables['elements']['#plugin_id'])) {
      $plugin_id = str_replace(':', '_', $variables['elements']['#plugin_id']);
      $suggestions[] = 'block__region__' . $region . '__' . $plugin_id;
    }
  }
}

/**
 * Implements hook_theme_suggestions_HOOK_alter() for menu templates.
 */
function sacda_theme_suggestions_menu_alter(array &$suggestions, array $variables): void {
  if (isset($variables['menu_name'])) {
    $suggestions[] = 'menu__' . $variables['menu_name'];
  }
}

/**
 * Implements hook_theme_suggestions_HOOK_alter() for node templates.
 */
function sacda_theme_suggestions_node_alter(array &$suggestions, array $variables): void {
  if (isset($variables['view']) && $variables['view'] instanceof \Drupal\views\ViewExecutable) {
    $suggestions[] = 'node__view__' . $variables['view']->id();
    $suggestions[] = 'node__view__' . $variables['view']->id() . '__' . $variables['view']->current_display;
  }
}
