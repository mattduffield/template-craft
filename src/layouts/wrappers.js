/**
 * Layout wrappers for edit templates.
 * Port of Go's GenerateCardPrefix/Suffix and GenerateTabControlPrefix/Suffix.
 */

import { render } from '../template-engine.js';

export function cardPrefix() {
  return render('layouts/card-prefix.njk');
}

export function cardSuffix() {
  return render('layouts/card-suffix.njk');
}

export function tabControlPrefix() {
  return render('layouts/tab-control-prefix.njk');
}

export function tabControlSuffix() {
  return render('layouts/tab-control-suffix.njk');
}

/**
 * Get wrapper prefix/suffix based on template type.
 */
export function getWrapper(templateType) {
  switch (templateType) {
    case 'tab-control':
      return { prefix: tabControlPrefix(), suffix: tabControlSuffix() };
    case 'card':
      return { prefix: cardPrefix(), suffix: cardSuffix() };
    default:
      return { prefix: cardPrefix(), suffix: cardSuffix() };
  }
}
