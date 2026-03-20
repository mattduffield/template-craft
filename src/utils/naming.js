/**
 * Convert snake_case or dot.notation string to Proper Case
 * e.g., "first_name" → "First Name", "address.street" → "Address Street"
 */
export function getProper(input) {
  if (!input) return '';
  input = input.replace(/_/g, ' ').replace(/\./g, ' ');
  return input
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Extract the last segment of a dot-delimited string
 * e.g., "address.street" → "street", "name" → "name"
 */
export function getSuffix(input) {
  if (!input) return '';
  const parts = input.split('.');
  return parts[parts.length - 1];
}

/**
 * Get proper case of just the suffix portion
 */
export function getProperSuffix(input) {
  return getProper(getSuffix(input));
}

/**
 * Convert a model/entity name to a slug (lowercase, underscored)
 * e.g., "Article" → "article", "Bill Plan" → "bill_plan"
 */
export function toSlug(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

/**
 * Quote an array of strings for code output
 * e.g., ["tags", "items"] → ['"tags"', '"items"']
 */
export function quoteStrings(items) {
  return items.map(item => `"${item}"`);
}
