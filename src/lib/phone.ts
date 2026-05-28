/**
 * Phone number normalization for Israeli phone numbers
 * Converts various formats to standard 10-digit format (e.g., "0541234567")
 */

export function normalizePhone(input: string): string {
  // Strip all non-digit characters
  let digits = input.replace(/\D/g, '');

  // Handle +972 format (strip the + before digit extraction)
  if (input.includes('+972')) {
    digits = input.replace(/\D/g, '');
  }

  // If starts with "972" and length is 12 → strip "972", prepend "0"
  if (digits.startsWith('972') && digits.length === 12) {
    digits = '0' + digits.slice(3);
  }

  // If 9 digits and no leading 0 → prepend 0
  if (digits.length === 9 && !digits.startsWith('0')) {
    digits = '0' + digits;
  }

  return digits;
}

/**
 * Compare two phone numbers after normalizing both
 */
export function phonesMatch(a: string, b: string): boolean {
  return normalizePhone(a) === normalizePhone(b);
}

/**
 * Validate that a normalized phone looks like a valid Israeli mobile number
 */
export function isValidIsraeliPhone(normalized: string): boolean {
  // Should be 10 digits starting with 05
  return /^05\d{8}$/.test(normalized);
}
