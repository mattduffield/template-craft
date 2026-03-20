import { getProper } from '../utils/naming.js';
import { render } from '../template-engine.js';
import { isSystemField } from './infer-control.js';

/**
 * System fields that should appear in list but as invisible columns.
 */
const INVISIBLE_FIELDS = new Set([
  '_id', 'created_by', 'created_date', 'modified_by', 'modified_date',
]);

/**
 * Fields that are date-time audit fields (invisible by default in lists).
 */
const AUDIT_DATE_FIELDS = new Set([
  'created_date', 'modified_date',
]);

/**
 * Infer the best list column configuration for a schema property.
 *
 * @param {Object} prop - Normalized property
 * @param {string} prefix - Dot-delimited path prefix
 * @param {boolean} isFirstVisible - Whether this is the first visible column (gets link formatter)
 * @returns {{ templateName: string, context: Object, visible: boolean } | null}
 */
export function inferListCol(prop, prefix = '', isFirstVisible = false) {
  const name = prop.name;
  const type = prop.type;
  const format = prop.format;
  const properName = getProper(name);
  const fieldName = prefix ? `${prefix}.${name}` : name;

  // Objects and arrays — skip in list views
  if (type === 'object' || type === 'array') {
    return null;
  }

  // Hidden fields (UUID, ObjectId) — skip entirely
  if (format === 'uuid' || prop.pattern === '^$|^[a-fA-F0-9]{24}$') {
    return null;
  }

  // Boolean columns
  if (type === 'boolean') {
    const isInvisible = INVISIBLE_FIELDS.has(name);
    return {
      templateName: isInvisible ? 'list-cols/boolean-invisible.njk' : 'list-cols/boolean.njk',
      context: { fieldName, properName },
      visible: !isInvisible,
    };
  }

  // System/audit fields — invisible string columns
  if (INVISIBLE_FIELDS.has(name)) {
    return {
      templateName: 'list-cols/string-invisible.njk',
      context: { fieldName, properName },
      visible: false,
    };
  }

  // Date-time fields that aren't audit fields — visible but could be toggled
  if (format === 'date-time' || format === 'date') {
    // Audit dates already handled above
    return {
      templateName: 'list-cols/string.njk',
      context: { fieldName, properName },
      visible: true,
    };
  }

  // String columns — first visible gets link formatter
  if (isFirstVisible) {
    return {
      templateName: 'list-cols/string.njk',
      context: { fieldName, properName },
      visible: true,
    };
  }

  // Subsequent string/number/integer columns
  return {
    templateName: 'list-cols/string.njk',
    context: { fieldName, properName },
    visible: true,
  };
}

/**
 * Generate all list column HTML from a normalized properties array.
 *
 * @param {Array} properties - Normalized properties
 * @returns {string} Combined column HTML
 */
export function generateListColumns(properties) {
  let html = '';
  let isFirstVisible = true;

  for (const prop of properties) {
    const col = inferListCol(prop, '', isFirstVisible);
    if (col) {
      html += render(col.templateName, col.context);
      if (col.visible && isFirstVisible) {
        isFirstVisible = false;
      }
    }
  }

  return html;
}
