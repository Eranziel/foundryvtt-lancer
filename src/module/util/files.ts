/**
 *
 * @param file
 * @return Lowercased extension without the leading dot, or "" for a file that has none
 */
export function extensionOf(file: File): string {
  const dot = file.name.lastIndexOf(".");
  return dot === -1 ? "" : file.name.slice(dot + 1).toLowerCase();
}

/**
 * Groups an array of `File`s by string filter into `supported` and `unsupported` keys. `supported` is nested by another
 * layer given by the `extensions` parameter (e.g. `groupFilesByExtension(files, SUPPORTED_EXTENSIONS).supported.lcp`)
 * @param files - An array of `File` types
 * @param extensions - An array of string delimited file extensions (without the `.`)
 * @remarks Union'ed, `as const` annotated, or inlined strings should be used as declarations in `extensions` to preserve declared types. Basically don't use (`const keys = ['a', 'b', 'c']`)
 */
export function groupFilesByExtension<K extends string>(
  files: File[],
  extensions: readonly K[]
): { supported: Record<K, File[]>; unsupported: File[] } {
  const supported = Object.fromEntries(extensions.map(ext => [ext, [] as File[]])) as Record<K, File[]>;
  const unsupported: File[] = [];
  for (const file of files) {
    const ext = extensionOf(file) as K;
    if (extensions.includes(ext)) supported[ext].push(file);
    else unsupported.push(file);
  }
  return { supported, unsupported };
}
