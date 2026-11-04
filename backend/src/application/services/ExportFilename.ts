/**
 * Slugs a title for a download name without dropping non-Latin scripts: an ASCII-only
 * character class would collapse a Vietnamese title into a run of underscores.
 */
export function toFilenameSlug(title: string): string {
  const slug = title
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return slug || 'Proposal';
}
