
export class Constants {
    public static KEY_STORAGE_WORKSPACES = "workspaces";

    public static BOOKMARKS_FOLDER_NAME = "Edge Workspaces (read-only)";

    public static DOWNLOAD_FILENAME = "workspaces-export.json";

    /** Time in seconds to delay saving a workspace after it has been opened. */
    public static WORKSPACE_OPEN_SAVE_DELAY = 5;

    /** Time in ms to debounce the saving of the workspace on updates. */
    public static WORKSPACE_SAVE_DEBOUNCE_TIME = 300;

    public static DEBOUNCE_IDS = {
        saveWorkspace: "saveWorkspace",
        saveWorkspaceToSync: "saveWorkspaceToSync",
    }

    public static STORAGE_KEYS = {
        settings: {
            saveBookmarks: "settings.saveBookmarks",
        }
    }
}
