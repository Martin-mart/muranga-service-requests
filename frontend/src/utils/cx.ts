/** Joins truthy class names; keeps JSX free of string-concatenation noise. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
