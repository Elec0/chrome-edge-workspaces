import { Constants } from "../constants/constants";
import { Workspace } from "../obj/workspace";
import { StorageHelper } from "../storage-helper";
import { WorkspaceStorage } from "../workspace-storage";

export class BookmarkStorageHelper {
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

        // const workspaces = await this.getWorkspaces();
        // const newWorkspace = new Workspace(windowId, workspaceName, []);

        // // additionally, create a bookmark folder for the workspace inside the Constants.BOOKMARKS_FOLDER_NAME
        // const bookmarkFolder = await this.getExtensionBookmarkFolder();
        // console.debug("bookmarkFolder", bookmarkFolder);
        // if (bookmarkFolder === undefined) {
        //     return Promise.reject("Could not find the Tab Manager bookmark folder.");
        // }
        // await chrome.bookmarks.create({ parentId: bookmarkFolder.id, title: newWorkspace.name });


        // workspaces.set(newWorkspace.uuid, newWorkspace);
        // await StorageHelper.setWorkspaces(workspaces);

        return Promise.resolve(true);
    }


    /**
     * Retrieves the extension bookmark folder. If the folder does not exist, it creates one.
     *
     * @returns A promise that resolves to the bookmark folder node, or undefined if it cannot be found or created.
     */
    public static async getExtensionBookmarkFolder(): Promise<chrome.bookmarks.BookmarkTreeNode | undefined> {
        const otherBookmarksFolder = await this.getOtherBookmarksFolder();
        const bookmarkFolder = otherBookmarksFolder?.children?.find((node) => node.title === Constants.BOOKMARKS_FOLDER_NAME);
        if (bookmarkFolder === undefined) {
            return await this.createExtensionBookmarkFolder(otherBookmarksFolder);
        }
        return bookmarkFolder;
    }

    private static async createExtensionBookmarkFolder(otherBookmarksFolder: chrome.bookmarks.BookmarkTreeNode | undefined): Promise<chrome.bookmarks.BookmarkTreeNode> {
        if (otherBookmarksFolder === undefined) {
            console.error(`Could not find the '${ Constants.BOOKMARKS_OTHER_NAME }' folder.`);
            return Promise.reject(`Could not find the '${ Constants.BOOKMARKS_OTHER_NAME }' folder.`);
        }
        return await chrome.bookmarks.create({ parentId: otherBookmarksFolder.id, title: Constants.BOOKMARKS_FOLDER_NAME });
    }

    /**
     * Retrieves the "Other Bookmarks" folder from the Chrome bookmarks tree.
     *
     * @returns A promise that resolves to the "Other Bookmarks" folder node if found, otherwise undefined.
     */
    private static async getOtherBookmarksFolder(): Promise<chrome.bookmarks.BookmarkTreeNode | undefined> {
        const bookmarks = await chrome.bookmarks.getTree();
        if (bookmarks.length === 0) {
            return undefined;
        }
        return bookmarks[0].children?.find((node) => node.title === Constants.BOOKMARKS_OTHER_NAME);
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

    /**
     * Save the workspace to bookmarks.
     * 
     * Ensures the associated workspace folder is fully replaced with the new workspace tabs.
     * 
     * We are going to go with the constraint that names should be unique, and if they aren't 
     * one of them will be overwritten.
     * Unique names aren't enforced by the extension, but hopefully people don't name things the same since it's confusing.
     */
    public static async saveWorkspace(workspace: Workspace, bookmarkFolder = this.getExtensionBookmarkFolder()): Promise<void> {
        const resolvedBookmarkFolder = await bookmarkFolder;
        if (resolvedBookmarkFolder === undefined) {
            console.error("Could not find the bookmark folder, cannot save workspace to bookmarks.");
            return Promise.reject("Could not find the bookmark folder.");
        }
        console.debug("saveWorkspaceBookmarks: ", workspace, resolvedBookmarkFolder);
        const workspaceFolder = resolvedBookmarkFolder.children?.find((node) => node.title === workspace.name);

        // Delete the workspace folder and all children so we can recreate it with the new tabs
        if (workspaceFolder !== undefined) {
            await chrome.bookmarks.removeTree(workspaceFolder.id);
        }

        // Create the workspace folder
        const newWorkspaceFolder = await chrome.bookmarks.create({ parentId: resolvedBookmarkFolder.id, title: workspace.name });

        // Add all the tabs to the workspace folder
        for (const tab of workspace.getTabs()) {
            await chrome.bookmarks.create({ parentId: newWorkspaceFolder.id, title: tab.title, url: tab.url });
        }
    }
}