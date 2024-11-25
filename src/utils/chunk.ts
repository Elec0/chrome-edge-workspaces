
export class ChunkUtil {
    /**
     * Chunks an array into smaller arrays, each with a maximum byte size.
     * @param array - The array to chunk.
     * @param maxBytes - The maximum byte size for each chunk.
     */
    public static chunkArray<T>(array: T[], maxBytes: number): T[][] {
        const chunks: T[][] = [];
        let currentChunk: T[] = [];
        let currentChunkSize = 0;

        for (const item of array) {
            const itemSize = new Blob([JSON.stringify(item)]).size;
            if (currentChunkSize + itemSize >= maxBytes) {
                chunks.push(currentChunk);
                currentChunk = [];
                currentChunkSize = 0;
            }
            currentChunk.push(item);
            currentChunkSize += itemSize;
        }

        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }

        return chunks;
    }

    /**
     * Combines smaller arrays back into a single array.
     * 
     * Note: This method assumes that the chunks are in the correct order, and 
     * that none of the array elements are null or undefined.
     * @param chunks - The array of chunks to combine.
     * @returns The combined array.
     */
    public static unChunkArray<T>(chunks: T[][]): T[] {
        const combinedArray: T[] = [];
        for (const chunk of chunks) {
            combinedArray.push(...chunk);
        }
        return combinedArray;
    }
}