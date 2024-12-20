import { Utils } from "../utils";

export class DebounceUtil {
    private static debounceTimeouts: Map<string, NodeJS.Timeout> = new Map();
    
    /**
     * Debounce the execution of a callback.
     * @param id - A unique identifier for the callback.
     * @param callback - The callback function to debounce.
     * @param delay - The delay in ms to debounce the callback.
     */
    public static debounce(id: string, callback: () => void, delay: number): void {
        if (DebounceUtil.debounceTimeouts.has(id)) {
            clearTimeout(DebounceUtil.debounceTimeouts.get(id));
        }

        // If we're testing with Jest, don't debounce, since we probably test the function immediately.
        if (Utils.areWeTestingWithJest()) {
            callback();
            return;
        }

        const timeout = setTimeout(() => {
            callback();
            DebounceUtil.debounceTimeouts.delete(id);
        }, delay);

        DebounceUtil.debounceTimeouts.set(id, timeout);
    }

    /**
     * Clear the debounce timeout for a callback.
     * @param id - The unique identifier for the callback.
     * @returns True if the debounce was cleared, false if it was not found.
     */
    public static clearDebounce(id: string): boolean {
        if (DebounceUtil.debounceTimeouts.has(id)) {
            clearTimeout(DebounceUtil.debounceTimeouts.get(id));
            DebounceUtil.debounceTimeouts.delete(id);
            return true;
        }
        return false;
    }
}