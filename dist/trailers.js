import { interpolateVariables } from "./interpolate.js";
/**
 * Formats trailers into git trailer format.
 * Each trailer is formatted as "key: value" preserving the original key casing.
 * @param trailers - Record of trailer key-value pairs
 * @returns Formatted trailers joined by newlines
 */
export function formatTrailers(trailers) {
    const entries = [];
    for (const [key, value] of Object.entries(trailers)) {
        entries.push(`${key}: ${value}`);
    }
    return entries.join("\n");
}
/**
 * Builds trailers by interpolating variables into trailer templates.
 * Filters out empty values and uninterpolated variable placeholders.
 * @param config - Record of trailer templates with variable placeholders
 * @param variables - Record of variable values for interpolation
 * @returns Record of trailers with interpolated values
 */
export function buildTrailers(config, variables) {
    const result = {};
    for (const [key, template] of Object.entries(config)) {
        const value = interpolateVariables(template, variables);
        const trimmedValue = value.trim();
        if (trimmedValue && !trimmedValue.match(/^\{\{.*\}\}$/)) {
            result[key] = value;
        }
    }
    return result;
}
