const FORBIDDEN_CHARS = /[\/\\:*?"<>|#^[\]\u0000-\u001f]/g;
const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

function truncateUtf8(input: string, maxBytes: number): string {
  let output = input;
  while (utf8ByteLength(output) > maxBytes && output.length > 0) {
    output = output.slice(0, -1);
  }
  return output || 'Untitled';
}

function utf8ByteLength(input: string): number {
  let bytes = 0;
  for (const char of input) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

export function sanitizeBasename(title: string): string {
  const normalized = title
    .normalize('NFC')
    .replace(FORBIDDEN_CHARS, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');
  const candidate = normalized || 'Untitled';
  const safe = RESERVED_WINDOWS_NAMES.test(candidate) ? `${candidate}-note` : candidate;
  return truncateUtf8(safe, 180);
}

export function uniqueMarkdownPath(title: string, folderPath: string, existingPaths: Set<string>): string {
  const base = sanitizeBasename(title);
  let suffix = 0;
  while (true) {
    const name = suffix === 0 ? `${base}.md` : `${base} (${suffix + 1}).md`;
    const path = folderPath ? `${folderPath}/${name}` : name;
    const key = path.toLocaleLowerCase();
    if (!existingPaths.has(key)) {
      existingPaths.add(key);
      return path;
    }
    suffix += 1;
  }
}
