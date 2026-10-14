import type { Variables } from "./types.js";
/**
 * Formats trailers into git trailer format.
 * Each trailer is formatted as "key: value" preserving the original key casing.
 * @param trailers - Record of trailer key-value pairs
 * @returns Formatted trailers joined by newlines
 */
export declare function formatTrailers(trailers: Record<string, string>): string;
/**
 * Builds trailers by interpolating variables into trailer templates.
 * Filters out empty values and uninterpolated variable placeholders.
 * @param config - Record of trailer templates with variable placeholders
 * @param variables - Record of variable values for interpolation
 * @returns Record of trailers with interpolated values
 */
export declare function buildTrailers(config: Record<string, string>, variables: Variables): Record<string, string>;
