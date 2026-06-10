import { describe, expect, it } from 'vitest';
import { sanitizeBasename, uniqueMarkdownPath } from './sanitize.js';

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

describe('sanitizeBasename', () => {
  it('replaces forbidden filename characters', () => {
    expect(sanitizeBasename('A/B\\C:D*E?F"G<H>I|J#K^L[M]N')).toBe('A-B-C-D-E-F-G-H-I-J-K-L-M-N');
  });

  it('replaces control characters without relying on a control-character regex', () => {
    expect(sanitizeBasename('A\u0000B\u001fC')).toBe('A-B-C');
  });

  it('normalizes whitespace and trims trailing dots and spaces', () => {
    expect(sanitizeBasename('  Draft   Title   .  ')).toBe('Draft Title');
  });

  it('falls back to Untitled when the sanitized title is empty', () => {
    expect(sanitizeBasename('  ...  ')).toBe('Untitled');
  });

  it('avoids Windows reserved device names', () => {
    expect(sanitizeBasename('CON')).toBe('CON-note');
    expect(sanitizeBasename('lpt1')).toBe('lpt1-note');
  });

  it('truncates names to the Obsidian-friendly byte limit', () => {
    const basename = sanitizeBasename('a'.repeat(181));

    expect(basename).toHaveLength(180);
    expect(utf8ByteLength(basename)).toBeLessThanOrEqual(180);
  });
});

describe('uniqueMarkdownPath', () => {
  it('adds case-insensitive numeric suffixes for duplicate markdown paths', () => {
    const existingPaths = new Set(['instaformat/report.md']);

    expect(uniqueMarkdownPath('Report', 'Instaformat', existingPaths)).toBe(
      'Instaformat/Report (2).md',
    );
    expect(uniqueMarkdownPath('Report', 'Instaformat', existingPaths)).toBe(
      'Instaformat/Report (3).md',
    );
  });

  it('supports root-level paths', () => {
    expect(uniqueMarkdownPath('Daily note', '', new Set())).toBe('Daily note.md');
  });
});
