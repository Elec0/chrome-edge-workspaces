import { Constants } from "../constants/constants";
import { Workspace } from "../obj/workspace";
import { StorageHelper } from "../storage-helper";
import { WorkspaceStorage } from "../workspace-storage";

export class BookmarkStorageHelper {
    /**
     * Get the workspaces from storage.
     * @returns A promise that resolves to a map of workspaces, or an empty object if no workspaces exist.
     */
    public static async getWorkspaces(): Promise<WorkspaceStorage> {
        const result = await StorageHelper.getValue(Constants.KEY_STORAGE_WORKSPACES, "{}")

        return StorageHelper.workspacesFromJson({ "data": result });
    }

    /**
     * Add a new workspace to storage.
     * We assume the window has no tabs, since it was just created.
     * 
     * @param workspaceName - User provided name for the workspace.
     * @param window - Chrome window object.
     * @returns A promise that resolves to true if the workspace was added successfully, or rejects if the workspace could not be added.
     */
    public static async addWorkspace(workspaceName: string, windowId: number): Promise<boolean> {
        // similar to StorageHelper.addWorkspace
        console.debug("addWorkspace: ", workspaceName, windowId);
        if (windowId == null || windowId == undefined) {
            return Promise.resolve(false) // reject("Window id is null or undefined");
        }

        const workspaces = await this.getWorkspaces();
        const newWorkspace = new Workspace(windowId, workspaceName, []);

        // additionally, create a bookmark folder for the workspace inside the Constants.BOOKMARKS_FOLDER_NAME
        const bookmarkFolder = await this.getExtensionBookmarkFolder();
        console.debug("bookmarkFolder", bookmarkFolder);
        if (bookmarkFolder === undefined) {
            return Promise.reject("Could not find the Tab Manager bookmark folder.");
        }
        await chrome.bookmarks.create({ parentId: bookmarkFolder.id, title: newWorkspace.name });


        workspaces.set(newWorkspace.uuid, newWorkspace);
        await StorageHelper.setWorkspaces(workspaces);

        return Promise.resolve(true);
    }

    private static async getExtensionBookmarkFolder(): Promise<chrome.bookmarks.BookmarkTreeNode | undefined> {
        const otherBookmarksFolder = await this.getOtherBookmarksFolder();
        const bookmarkFolder = otherBookmarksFolder?.children?.find((node) => node.title === Constants.BOOKMARKS_FOLDER_NAME);
        if (bookmarkFolder === undefined) {
            return await this.createExtensionBookmarkFolder();
        }
        return bookmarkFolder; 
    }

    private static async createExtensionBookmarkFolder(): Promise<chrome.bookmarks.BookmarkTreeNode> {
        const otherBookmarksFolder = await this.getOtherBookmarksFolder();
        if (otherBookmarksFolder === undefined) {
            console.error("Could not find the 'Other bookmarks' folder.");
            return Promise.reject("Could not find the 'Other bookmarks' folder.");
        }
        return await chrome.bookmarks.create({ parentId: otherBookmarksFolder.id, title: Constants.BOOKMARKS_FOLDER_NAME });
    }

    private static async getOtherBookmarksFolder(): Promise<chrome.bookmarks.BookmarkTreeNode | undefined> {
        const bookmarks = await chrome.bookmarks.getTree();
        if (bookmarks.length === 0) {
            return undefined;
        }
        return bookmarks[0].children?.find((node) => node.title === "Other bookmarks");
    }

    public static async addTabToWorkspace(workspaceId: string, tab: chrome.tabs.Tab): Promise<void> {
        console.debug("addTabToWorkspace: ", workspaceId, tab);
        // get the workspace
        const workspace = await StorageHelper.getWorkspace(workspaceId);
        const bookmarkFolder = await this.getExtensionBookmarkFolder();
        console.debug("bookmarkFolder", bookmarkFolder);
        if (bookmarkFolder === undefined) {
            return Promise.reject("Could not find the Tab Manager bookmark folder.");
        }
        const workspaceFolder = bookmarkFolder.children?.find((node) => node.title === workspace.name);
        console.debug("workspaceFolder", workspaceFolder);
        // Create a bookmark in the workspace's folder
        await chrome.bookmarks.create({ parentId: workspaceFolder?.id, title: tab.title, url: tab.url });
    }
}