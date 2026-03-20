/**
 * Nunjucks template engine configured with custom delimiters.
 *
 * Custom delimiters avoid conflicts with Pongo2 output syntax:
 *   [% %]  — Nunjucks block tags (if, for, block, etc.)
 *   [= =]  — Nunjucks variable interpolation
 *   [# #]  — Nunjucks comments
 *
 * Pongo2 syntax passes through as literal text:
 *   {% %}  — Pongo2 block tags
 *   {{ }}  — Pongo2 variable tags
 */

import nunjucks from 'nunjucks';
import { getProper } from './utils/naming.js';

// Template registry — populated by importing .njk files as raw strings
const templates = {};

const env = new nunjucks.Environment(
  new NjkLoader(),
  {
    tags: {
      blockStart: '[%',
      blockEnd: '%]',
      variableStart: '[=',
      variableEnd: '=]',
      commentStart: '[#',
      commentEnd: '#]',
    },
    autoescape: false,
    trimBlocks: false,
    lstripBlocks: false,
  }
);

// Custom filters
env.addFilter('proper', (str) => getProper(str));

/**
 * Custom loader that serves templates from the in-memory registry.
 */
function NjkLoader() {}

NjkLoader.prototype.getSource = function (name) {
  if (!templates[name]) {
    throw new Error(`Template not found: ${name}`);
  }
  return {
    src: templates[name],
    path: name,
    noCache: false,
  };
};

/**
 * Register a template string under a name.
 * Called during module initialization to load all .njk files.
 *
 * @param {string} name - Template name (e.g., "controls/wc-input.njk")
 * @param {string} src - Raw template string
 */
export function registerTemplate(name, src) {
  templates[name] = src;
}

/**
 * Render a named template with the given context.
 *
 * @param {string} name - Template name (e.g., "controls/wc-input-email.njk")
 * @param {Object} ctx - Template context variables
 * @returns {string} Rendered output
 */
export function render(name, ctx = {}) {
  return env.render(name, ctx);
}
