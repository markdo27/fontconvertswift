export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1))} ${units[i]}`;
}

/** e.g. "-64%" when the output is a third smaller than the input. */
export function formatDelta(from: number, to: number): string {
  if (!from || !to) return '';
  const delta = Math.round(((to - from) / from) * 100);
  return delta === 0 ? '±0%' : `${delta > 0 ? '+' : ''}${delta}%`;
}

export function replaceExtension(fileName: string, ext: string): string {
  return `${fileName.replace(/\.[^.]+$/, '')}.${ext}`;
}

export function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}

/** Appends " (2)", " (3)"… until the name is free. */
export function uniqueFileName(name: string, taken: Set<string>): string {
  if (!taken.has(name.toLowerCase())) return name;

  const base = baseName(name);
  const ext = name.slice(base.length);
  let counter = 2;
  let candidate = `${base} (${counter})${ext}`;

  while (taken.has(candidate.toLowerCase())) {
    counter += 1;
    candidate = `${base} (${counter})${ext}`;
  }

  return candidate;
}
