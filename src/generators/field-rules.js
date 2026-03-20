/**
 * Generate field rules JSON from schema conditional rules (allOf / @if).
 * This deterministically converts LiteSpec @if conditionals into
 * the field rules engine format used by Go Kart.
 *
 * @param {Object} schema - JSONSchema (raw, not FullJSONSchema) with allOf
 * @returns {Object} Field rules JSON object
 */
export function generateFieldRules(schema) {
  const rules = {};

  if (!schema || !schema.allOf) return rules;

  for (const conditional of schema.allOf) {
    if (!conditional.if || !conditional.then) continue;

    const ifProps = conditional.if.properties || {};
    const thenRequired = conditional.then.required || [];
    const thenProps = conditional.then.properties || {};

    // Extract the condition field and its constraint
    for (const [condField, condSchema] of Object.entries(ifProps)) {
      const condition = extractCondition(condField, condSchema);
      if (!condition) continue;

      // Required fields become visible + required rules
      for (const reqField of thenRequired) {
        if (!rules[reqField]) rules[reqField] = {};
        rules[reqField].visible = condition;
        rules[reqField].required = condition;
        rules[reqField].clearWhenHidden = true;
      }

      // MinItems constraints on arrays
      for (const [thenField, thenSchema] of Object.entries(thenProps)) {
        if (thenSchema.minItems != null) {
          // This maps to a visible rule on the array container
          const containerClass = `.${thenField.replace(/\./g, '_')}_container`;
          if (!rules[containerClass]) rules[containerClass] = {};
          rules[containerClass].visible = condition;
        }
      }
    }
  }

  // Always add the standard modified_date rule if not already present
  if (!rules['modified_date']) {
    rules['modified_date'] = {
      visible: { when: 'modified_by', notEquals: '' },
      required: { when: 'modified_by', notEquals: '' }
    };
  }

  return rules;
}

/**
 * Extract a field rules condition from a JSON Schema if-clause property.
 */
function extractCondition(fieldName, schemaConstraint) {
  if (!schemaConstraint) return null;

  // @const(value) → equals
  if (schemaConstraint.const != null) {
    return { when: fieldName, equals: String(schemaConstraint.const) };
  }

  // @enum(val1,val2) → in
  if (schemaConstraint.enum && schemaConstraint.enum.length > 0) {
    if (schemaConstraint.enum.length === 1) {
      return { when: fieldName, equals: schemaConstraint.enum[0] };
    }
    return { when: fieldName, in: schemaConstraint.enum };
  }

  // @minimum(n) → greaterThanOrEqual
  if (schemaConstraint.minimum != null) {
    return { when: fieldName, greaterThanOrEqual: schemaConstraint.minimum };
  }

  // @minLength(n) → field is not empty (simplified)
  if (schemaConstraint.minLength != null && schemaConstraint.minLength > 0) {
    return { when: fieldName, notEquals: '' };
  }

  return null;
}

/**
 * Generate field rules as a formatted JSON string.
 */
export function generateFieldRulesString(schema) {
  const rules = generateFieldRules(schema);
  if (Object.keys(rules).length === 0) return '';
  return JSON.stringify(rules, null, 2);
}
