import { Constants } from "../constants/constants";
import { StorageHelper } from "../storage-helper";

export class DebugStorageHelper {
    /**
     * Check if the user has enabled debug mode.
     * 
     * Defaults to false.
     */
    public static async isDebugEnabled(): Promise<boolean> {
        const value = await StorageHelper.getValue(Constants.STORAGE_KEYS.settings.debug, "false");
        return value === "true";
    }

    /**
     * Set the user's preference for debug mode.
     * @param value - The new value for the setting.
     */
    public static async setDebugEnabled(value: boolean): Promise<void> {
        await StorageHelper.setValue(Constants.STORAGE_KEYS.settings.debug, value.toString());
    }
}