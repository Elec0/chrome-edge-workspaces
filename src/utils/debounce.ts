import { Utils } from "../utils";

export class DebounceUtil {
    private static debounceTimeout: NodeJS.Timeout | undefined;
    
    /**
     * Debounce the saving of the workspace.
     * @param windowId - The ID of the window to save the workspace for.
     * @param delay - The delay in ms to debounce the save.
     */
    public static debounce(callback: () => void, delay: number): void {
        if (DebounceUtil.debounceTimeout) {
            clearTimeout(DebounceUtil.debounceTimeout);
        }
        // If we're testing with Jest, don't debounce, since we probably test the function immediately.
        if (Utils.areWeTestingWithJest()) {
            callback();
            return;
        }

        DebounceUtil.debounceTimeout = setTimeout(callback, delay);
    }
}