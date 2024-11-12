
export class Constants {
    public static KEY_STORAGE_WORKSPACES = "workspaces";

    public static BOOKMARKS_FOLDER_NAME = "Edge Workspaces (read-only)";

    public static DOWNLOAD_FILENAME = "workspaces-export.json";

    /** Time in seconds to delay saving a workspace after it has been opened. */
    public static WORKSPACE_OPEN_SAVE_DELAY = 5;

    /** Time in ms to debounce the saving of the workspace on updates. */
    public static WORKSPACE_SAVE_DEBOUNCE_TIME = 300;

    /** When a workspace is missing a last updated time, use this one instead of a default. */
    public static FAR_IN_PAST_DATE = new Date(1970, 0, 1).getTime();

    public static DEBOUNCE_IDS = {
        saveWorkspace: "saveWorkspace",
        saveWorkspaceToSync: "saveWorkspaceToSync",
    }

    public static STORAGE_KEYS = {
        settings: {
            saveBookmarks: "settings.saveBookmarks",
            saveSync: "settings.saveSync",
        }
    }
}
