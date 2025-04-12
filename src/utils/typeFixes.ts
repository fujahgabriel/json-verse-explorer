
/**
 * Type fixes for various TypeScript issues in the codebase
 */

/**
 * Helper function to convert unknown type to number safely
 * This helps fix TypeScript type errors when working with unknown types
 */
export const safeNumberConversion = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
};
