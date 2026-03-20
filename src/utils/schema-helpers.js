/**
 * Find a property by name in a FullPropertySchema array.
 * Supports dot-notation paths (e.g., "address.street").
 */
export function findProperty(properties, fieldName) {
  if (!properties || !fieldName) return null;
  const segments = fieldName.split('.');
  return findPropertyByPath(properties, segments);
}

function findPropertyByPath(properties, pathSegments) {
  if (!pathSegments.length) return null;
  const [current, ...rest] = pathSegments;

  for (const prop of properties) {
    if (prop.name === current) {
      if (rest.length === 0) return prop;
      if (prop.items && prop.items.length > 0) {
        return findPropertyByPath(prop.items, rest);
      }
      return null;
    }
  }
  return null;
}

/**
 * Find all array-type fields in the schema properties.
 * Returns { primitiveArrays, nonPrimitiveArrays }
 * primitiveArrays: arrays of strings/numbers (e.g., tags)
 * nonPrimitiveArrays: arrays of objects (e.g., household_members)
 */
export function findArrayTypes(properties, prefix = '') {
  const primitiveArrays = [];
  const nonPrimitiveArrays = [];

  function findNested(props, pfx) {
    for (const prop of props) {
      const fullName = pfx ? `${pfx}.${prop.name}` : prop.name;

      if (prop.type === 'array') {
        if (prop.items && prop.items.length > 0) {
          // Array of objects
          nonPrimitiveArrays.push(fullName);
          // Check for nested arrays within
          findNested(prop.items, fullName + '.*');
        } else {
          // Primitive array (array of strings, numbers, etc.)
          primitiveArrays.push(fullName);
        }
      } else if (prop.type === 'object' && prop.items && prop.items.length > 0) {
        // Recurse into nested objects
        findNested(prop.items, fullName);
      }
    }
  }

  findNested(properties, prefix);
  return { primitiveArrays, nonPrimitiveArrays };
}

/**
 * Get the merged list of all array fields (primitive + non-primitive)
 */
export function getAllArrayFields(properties) {
  const { primitiveArrays, nonPrimitiveArrays } = findArrayTypes(properties);
  return [...primitiveArrays, ...nonPrimitiveArrays];
}

// --- Standard JSON Schema helpers (inference-based generation) ---

/**
 * Resolve a $ref string to its definition from $defs.
 * e.g., "#/$defs/Address" → defs.Address
 *
 * @param {string} ref - JSON Schema $ref string
 * @param {Object} defs - Schema $defs object
 * @returns {Object|null} Resolved definition
 */
export function resolveRef(ref, defs) {
  if (!ref || !defs) return null;
  const name = ref.replace('#/$defs/', '');
  return defs[name] || null;
}

/**
 * Normalize a JSON Schema's properties object into an iterable array.
 * Each entry has the property name and required flag merged in.
 *
 * Input:  { properties: { first_name: { type: "string" } }, required: ["first_name"] }
 * Output: [{ name: "first_name", type: "string", required: true }]
 *
 * @param {Object} schema - JSON Schema (or sub-schema with properties)
 * @returns {Array} Normalized properties array
 */
export function normalizeProperties(schema) {
  if (!schema || !schema.properties) return [];
  const required = new Set(schema.required || []);
  return Object.entries(schema.properties).map(([name, propSchema]) => ({
    name,
    ...propSchema,
    required: required.has(name),
  }));
}

/**
 * Find all array-type fields from a standard JSON Schema properties object.
 * Works with standard JSON Schema format (items as schema object, $ref).
 *
 * @param {Object} propertiesObj - JSON Schema properties object { name: schema }
 * @param {Object} defs - $defs for resolving $ref
 * @param {string} prefix - Path prefix for nested fields
 * @returns {{ primitiveArrays: string[], nonPrimitiveArrays: string[] }}
 */
export function findArrayTypesFromSchema(propertiesObj, defs = {}, prefix = '') {
  const primitiveArrays = [];
  const nonPrimitiveArrays = [];

  function walk(props, pfx) {
    for (const [name, schema] of Object.entries(props)) {
      const fullName = pfx ? `${pfx}.${name}` : name;

      if (schema.type === 'array') {
        if (schema.items && (schema.items.$ref || schema.items.properties)) {
          // Array of objects
          nonPrimitiveArrays.push(fullName);
          // Resolve and recurse into sub-properties
          let subProps = null;
          if (schema.items.$ref) {
            const def = resolveRef(schema.items.$ref, defs);
            if (def && def.properties) subProps = def.properties;
          } else if (schema.items.properties) {
            subProps = schema.items.properties;
          }
          if (subProps) {
            walk(subProps, fullName + '.*');
          }
        } else {
          // Primitive array (string, number, etc.)
          primitiveArrays.push(fullName);
        }
      } else if (schema.type === 'object') {
        // Resolve and recurse into nested object
        let subProps = null;
        if (schema.$ref) {
          const def = resolveRef(schema.$ref, defs);
          if (def && def.properties) subProps = def.properties;
        } else if (schema.properties) {
          subProps = schema.properties;
        }
        if (subProps) {
          walk(subProps, fullName);
        }
      }
    }
  }

  walk(propertiesObj, prefix);
  return { primitiveArrays, nonPrimitiveArrays };
}
