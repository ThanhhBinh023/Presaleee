export class TextSplitterService {
  /**
   * Splits a long text into sliding windows of words with configurable overlap.
   */
  static splitIntoChunks(text: string, chunkSize: number = 400, overlap: number = 50): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const words = trimmed.split(/\s+/);
    const chunks: string[] = [];

    let i = 0;
    while (i < words.length) {
      const chunkWords = words.slice(i, i + chunkSize);
      chunks.push(chunkWords.join(' '));
      if (i + chunkSize >= words.length) break;
      i += chunkSize - overlap;
    }

    return chunks;
  }
}

