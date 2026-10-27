<?php

/**
 * @file
 * Theme settings form for SACDA theme.
 */

use Drupal\Core\Form\FormStateInterface;

/**
 * Builds the theme settings form.
 *
 * @param array $form
 *   The form array.
 * @param \Drupal\Core\Form\FormStateInterface $form_state
 *   The form state.
 */
function _sacda_build_theme_settings_form(array &$form, FormStateInterface $form_state): void {
  // Footer settings
  _sacda_build_footer_settings($form, $form_state);
  
  // Color settings
  _sacda_build_color_settings($form);
  
  // Carousel settings
  _sacda_build_carousel_settings($form);

  _sacda_build_front_themes_settings($form);
  
  // Add submit handler
  $form['#submit'][] = 'sacda_theme_settings_submit';
}

/**
 * Selects the subject terms displayed in the front-page theme grid.
 */
function _sacda_build_front_themes_settings(array &$form): void {
  $form['front_themes'] = [
    '#type' => 'details',
    '#title' => t('Front page themes'),
    '#description' => t('Choose up to four Subject terms. Each card links to the term page and uses an image from a matching published repository item.'),
  ];
  $storage = \Drupal::entityTypeManager()->getStorage('taxonomy_term');
  for ($i = 1; $i <= 4; $i++) {
    $key = 'front_theme_' . $i;
    $tid = theme_get_setting($key);
    $form['front_themes'][$key] = [
      '#type' => 'entity_autocomplete',
      '#title' => t('Theme @number', ['@number' => $i]),
      '#target_type' => 'taxonomy_term',
      '#selection_settings' => ['target_bundles' => ['subject']],
      '#default_value' => $tid ? $storage->load($tid) : NULL,
    ];
  }
}

/**
 * Builds footer partner and social link settings.
 */
function _sacda_build_footer_settings(array &$form, FormStateInterface $form_state): void {
  $form['footer_settings'] = [
    '#type' => 'details',
    '#title' => t('Footer Settings'),
    '#open' => TRUE,
  ];

  // Partners section
  $form['footer_settings']['partners_wrapper'] = [
    '#type' => 'details',
    '#title' => t('Footer Partners'),
    '#open' => TRUE,
    '#prefix' => '<div id="partners-wrapper">',
    '#suffix' => '</div>',
  ];

  $partners = theme_get_setting('footer_partners') ?: [];
  $num_partners = $form_state->get('num_partners') ?? max(count($partners), 1);
  $form_state->set('num_partners', $num_partners);

  $form['footer_settings']['partners_wrapper']['footer_partners'] = [
    '#type' => 'container',
    '#tree' => TRUE,
    '#parents' => ['footer_partners'],
  ];

  for ($i = 0; $i < $num_partners; $i++) {
    $partner = $partners[$i] ?? [];

    $form['footer_settings']['partners_wrapper']['footer_partners'][$i] = [
      '#type' => 'details',
      '#title' => t('Partner @num', ['@num' => $i + 1]),
      '#open' => TRUE,
      '#attributes' => ['class' => ['partner-item']],
    ];

    $form['footer_settings']['partners_wrapper']['footer_partners'][$i]['name'] = [
      '#type' => 'textfield',
      '#title' => t('Partner name'),
      '#default_value' => $partner['name'] ?? '',
      '#description' => t('Used for alt text.'),
    ];

    $form['footer_settings']['partners_wrapper']['footer_partners'][$i]['image_fid'] = [
      '#type' => 'managed_file',
      '#title' => t('Partner logo'),
      '#upload_location' => 'public://theme/partners/',
      '#upload_validators' => [
        'file_validate_extensions' => ['png jpg jpeg gif svg webp'],
        'file_validate_size' => [2 * 1024 * 1024],
      ],
      '#default_value' => !empty($partner['image_fid']) ? [$partner['image_fid']] : NULL,
    ];

    $form['footer_settings']['partners_wrapper']['footer_partners'][$i]['link'] = [
      '#type' => 'url',
      '#title' => t('Partner website URL'),
      '#default_value' => $partner['link'] ?? '',
    ];

    $form['footer_settings']['partners_wrapper']['footer_partners'][$i]['weight'] = [
      '#type' => 'weight',
      '#title' => t('Weight'),
      '#default_value' => $partner['weight'] ?? $i,
      '#description' => t('Lower weight items appear first.'),
    ];
  }

  $form['footer_settings']['partners_wrapper']['add_partner'] = [
    '#type' => 'submit',
    '#value' => t('Add Partner'),
    '#submit' => ['sacda_add_partner_callback'],
    '#ajax' => [
      'callback' => 'sacda_partners_ajax_callback',
      'wrapper' => 'partners-wrapper',
    ],
    '#limit_validation_errors' => [],
  ];

  if ($num_partners > 1) {
    $form['footer_settings']['partners_wrapper']['remove_partner'] = [
      '#type' => 'submit',
      '#value' => t('Remove Last Partner'),
      '#submit' => ['sacda_remove_partner_callback'],
      '#ajax' => [
        'callback' => 'sacda_partners_ajax_callback',
        'wrapper' => 'partners-wrapper',
      ],
      '#limit_validation_errors' => [],
    ];
  }

  // Social links section
  $form['footer_settings']['social_wrapper'] = [
    '#type' => 'details',
    '#title' => t('Footer Social Links'),
    '#open' => TRUE,
    '#prefix' => '<div id="social-wrapper">',
    '#suffix' => '</div>',
  ];

  $social_links = theme_get_setting('footer_social_links') ?: [];
  $num_social = $form_state->get('num_social') ?? max(count($social_links), 1);
  $form_state->set('num_social', $num_social);

  $icon_options = [
    'facebook' => t('Facebook'),
    'twitter' => t('Twitter / X'),
    'instagram' => t('Instagram'),
    'linkedin' => t('LinkedIn'),
    'youtube' => t('YouTube'),
    'flickr' => t('Flickr'),
    'tiktok' => t('TikTok'),
    'email' => t('Email'),
    'website' => t('Website'),
  ];

  $form['footer_settings']['social_wrapper']['footer_social_links'] = [
    '#type' => 'table',
    '#header' => [t('Title'), t('Icon'), t('Link URL'), t('Weight')],
    '#empty' => t('No social links added yet.'),
    '#tree' => TRUE,
    '#parents' => ['footer_social_links'],
    '#tabledrag' => [
      [
        'action' => 'order',
        'relationship' => 'sibling',
        'group' => 'social-weight',
      ],
    ],
  ];

  for ($i = 0; $i < $num_social; $i++) {
    $social = $social_links[$i] ?? [];

    $form['footer_settings']['social_wrapper']['footer_social_links'][$i]['#attributes']['class'][] = 'draggable';
    $form['footer_settings']['social_wrapper']['footer_social_links'][$i]['#weight'] = $social['weight'] ?? $i;

    $form['footer_settings']['social_wrapper']['footer_social_links'][$i]['title'] = [
      '#type' => 'textfield',
      '#title' => t('Title'),
      '#title_display' => 'invisible',
      '#default_value' => $social['title'] ?? '',
      '#size' => 20,
    ];

    $form['footer_settings']['social_wrapper']['footer_social_links'][$i]['icon'] = [
      '#type' => 'select',
      '#title' => t('Icon'),
      '#title_display' => 'invisible',
      '#options' => $icon_options,
      '#default_value' => $social['icon'] ?? 'facebook',
    ];

    $form['footer_settings']['social_wrapper']['footer_social_links'][$i]['link'] = [
      '#type' => 'url',
      '#title' => t('Link URL'),
      '#title_display' => 'invisible',
      '#default_value' => $social['link'] ?? '',
      '#size' => 40,
    ];

    $form['footer_settings']['social_wrapper']['footer_social_links'][$i]['weight'] = [
      '#type' => 'weight',
      '#title' => t('Weight'),
      '#title_display' => 'invisible',
      '#default_value' => $social['weight'] ?? $i,
      '#attributes' => ['class' => ['social-weight']],
    ];
  }

  $form['footer_settings']['social_wrapper']['add_social'] = [
    '#type' => 'submit',
    '#value' => t('Add Social Link'),
    '#submit' => ['sacda_add_social_callback'],
    '#ajax' => [
      'callback' => 'sacda_social_ajax_callback',
      'wrapper' => 'social-wrapper',
    ],
    '#limit_validation_errors' => [],
  ];

  if ($num_social > 1) {
    $form['footer_settings']['social_wrapper']['remove_social'] = [
      '#type' => 'submit',
      '#value' => t('Remove Last Social Link'),
      '#submit' => ['sacda_remove_social_callback'],
      '#ajax' => [
        'callback' => 'sacda_social_ajax_callback',
        'wrapper' => 'social-wrapper',
      ],
      '#limit_validation_errors' => [],
    ];
  }
}

/**
 * Builds color settings form elements.
 */
function _sacda_build_color_settings(array &$form): void {
  $form['color_settings'] = [
    '#type' => 'details',
    '#title' => t('Color Settings'),
    '#open' => TRUE,
  ];

  $form['color_settings']['primary_color'] = [
    '#type' => 'textfield',
    '#title' => t('Primary color (hex)'),
    '#default_value' => theme_get_setting('primary_color') ?: '#F99D2A',
    '#description' => t('Primary brand color (e.g. #F99D2A).'),
    '#size' => 10,
  ];

  $form['color_settings']['secondary_color'] = [
    '#type' => 'textfield',
    '#title' => t('Secondary color (hex)'),
    '#default_value' => theme_get_setting('secondary_color') ?: '#414042',
    '#description' => t('Secondary brand color (e.g. #414042).'),
    '#size' => 10,
  ];

  $form['color_settings']['light_color'] = [
    '#type' => 'textfield',
    '#title' => t('Light color (hex)'),
    '#default_value' => theme_get_setting('light_color') ?: '#FFEDC2',
    '#description' => t('Light accent color (e.g. #FFEDC2).'),
    '#size' => 10,
  ];
}

/**
 * Builds carousel settings form elements.
 */
function _sacda_build_carousel_settings(array &$form): void {
  $form['carousel_settings'] = [
    '#type' => 'details',
    '#title' => t('Landing Page Carousel'),
    '#open' => FALSE,
  ];

  $form['carousel_settings']['carousel_autoplay_speed'] = [
    '#type' => 'number',
    '#title' => t('Autoplay Delay (ms)'),
    '#description' => t('Time between slide transitions in milliseconds.'),
    '#default_value' => theme_get_setting('carousel_autoplay_speed') ?: 5000,
    '#min' => 1000,
    '#max' => 20000,
    '#step' => 500,
  ];

  $carousel_slides = theme_get_setting('carousel_slides') ?: [];

  $form['carousel_settings']['carousel_slides'] = [
    '#type' => 'container',
    '#tree' => TRUE,
    '#parents' => ['carousel_slides'],
  ];

  // Support up to 5 slides
  for ($i = 0; $i < 5; $i++) {
    $slide = $carousel_slides[$i] ?? [];

    $form['carousel_settings']['carousel_slides'][$i] = [
      '#type' => 'details',
      '#title' => t('Slide @num', ['@num' => $i + 1]),
      '#open' => $i === 0,
    ];

    $form['carousel_settings']['carousel_slides'][$i]['image_fid'] = [
      '#type' => 'managed_file',
      '#title' => t('Image'),
      '#description' => t('Upload an image for this slide.'),
      '#upload_location' => 'public://carousel/',
      '#upload_validators' => [
        'file_validate_extensions' => ['png jpg jpeg gif webp'],
        'file_validate_size' => [5 * 1024 * 1024],
      ],
      '#default_value' => !empty($slide['image_fid']) ? [$slide['image_fid']] : [],
    ];

    $form['carousel_settings']['carousel_slides'][$i]['title'] = [
      '#type' => 'textfield',
      '#title' => t('Title'),
      '#description' => t('Optional title overlay for this slide.'),
      '#default_value' => $slide['title'] ?? '',
      '#maxlength' => 255,
    ];

    $form['carousel_settings']['carousel_slides'][$i]['subtitle'] = [
      '#type' => 'textfield',
      '#title' => t('Subtitle'),
      '#description' => t('Optional subtitle overlay for this slide.'),
      '#default_value' => $slide['subtitle'] ?? '',
      '#maxlength' => 255,
    ];

    $form['carousel_settings']['carousel_slides'][$i]['link'] = [
      '#type' => 'url',
      '#title' => t('Link URL'),
      '#description' => t('Optional link for this slide.'),
      '#default_value' => $slide['link'] ?? '',
    ];
  }
}
