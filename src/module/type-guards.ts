/**
 * A minimal type guard to check whether a given object is a stored object.
 */
export function isStored<T extends { id?: string | null | undefined } | null | undefined>(
  arg: T
): arg is T & { id: string } {
  return !!arg?.id;
}
