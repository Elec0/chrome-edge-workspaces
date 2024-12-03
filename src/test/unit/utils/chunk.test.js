const { ChunkUtil } = require("../../../utils/chunk");

describe("Chunk util", () => {
    test("chunkArray chunks an array into smaller arrays based on byte size", () => {
        const array = ["item1", "item2", "item3"];
        const maxBytes = 10; // Small size for testing
        const chunks = ChunkUtil.chunkArray(array, maxBytes);

        expect(chunks.length).toBeGreaterThan(1);
    });

    test("unChunkArray unchunks an array of arrays into a single array", () => {
        const array = ["item1", "item2", "item3"];
        const maxBytes = 10; // Small size for testing
        const chunks = ChunkUtil.chunkArray(array, maxBytes);

        const unchunked = ChunkUtil.unChunkArray(chunks);

        expect(unchunked.length).toBe(array.length);
    });
});