import { Constants } from "../constants/constants";
import { Workspace } from "../obj/workspace";
import { StorageHelper } from "../storage-helper";

export class BookmarkStorageHelper {
    /**
     * Retrieves the extension bookmark folder. If the folder does not exist, it creates one.
     *
     * @returns A promise that resolves to the bookmark folder node, or undefined if it cannot be found or created.
     */
    public static async getExtensionBookmarkFolder(): Promise<chrome.bookmarks.BookmarkTreeNode | undefined> {
        if (!await this.isBookmarkSaveEnabled()) {
            return undefined;
        }

        const otherBookmarksFolder = await this.getOtherBookmarksFolder();
        const bookmarkFolder = otherBookmarksFolder?.children?.find((node) => node.title === Constants.BOOKMARKS_FOLDER_NAME);
        if (bookmarkFolder === undefined) {
            return await this.createExtensionBookmarkFolder(otherBookmarksFolder);
        }
        return bookmarkFolder;
    }

    private static async createExtensionBookmarkFolder(otherBookmarksFolder: chrome.bookmarks.BookmarkTreeNode | undefined): Promise<chrome.bookmarks.BookmarkTreeNode> {
        if (otherBookmarksFolder === undefined) {
            console.error("Could not find the 'Other bookmarks' folder.");
            return Promise.reject("Could not find the 'Other bookmarks' folder.");
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
        // We can't find the "Other bookmarks" folder by name, since it's localized, so we'll just grab the second child
        return bookmarks[0].children?.at(1);
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
    public static async saveWorkspace(workspace: Workspace, bookmarkFolder?: chrome.bookmarks.BookmarkTreeNode | undefined): Promise<void> {
        if (!await this.isBookmarkSaveEnabled()) {
            console.debug("Bookmark saving is disabled, skipping.");
            return;
        }
        console.debug(`Saving workspace ${ workspace.name } to bookmarks...`);
        
        // Resolve the bookmark folder using the provided one or our default
        let resolvedBookmarkFolder;
        if (bookmarkFolder === undefined) {
            resolvedBookmarkFolder = await this.getExtensionBookmarkFolder();
        }
        else {
            resolvedBookmarkFolder = await bookmarkFolder;
        }

        if (resolvedBookmarkFolder === undefined) {
            console.error("Could not find the bookmark folder, cannot save workspace to bookmarks.");
            return Promise.reject("Could not find the bookmark folder.");
        }
        const workspaceFolders = resolvedBookmarkFolder.children?.filter((node) => node.title === workspace.name);
        // Delete the workspace folder and all children so we can recreate it with the new tabs
        if (workspaceFolders !== undefined) {
            if (workspaceFolders.length > 1) {
                console.warn(`Found multiple workspace folders with the name '${ workspace.name }'. All will be removed!`);
            }
            workspaceFolders.forEach(async (workspaceFolder) => {
                await chrome.bookmarks.removeTree(workspaceFolder.id);
            });
        }

        // Create the workspace folder
        const newWorkspaceFolder = await chrome.bookmarks.create({ parentId: resolvedBookmarkFolder.id, title: workspace.name });

        // Add all the tabs to the workspace folder
        for (const tab of workspace.getTabs()) {
            await chrome.bookmarks.create({ parentId: newWorkspaceFolder.id, title: tab.title, url: tab.url });
        }
    }

    /**
     * Remove the workspace from bookmarks.
     * @param workspace - The workspace to remove.
     */
    public static async removeWorkspace(workspace: Workspace, bookmarkFolder = this.getExtensionBookmarkFolder()): Promise<void> {
        if (!await this.isBookmarkSaveEnabled()) {
            console.debug("Bookmark saving is disabled, skipping.");
            return;
        }

        const resolvedBookmarkFolder = await bookmarkFolder;
        if (resolvedBookmarkFolder === undefined) {
            console.error("Could not find the bookmark folder, cannot save workspace to bookmarks.");
            return Promise.reject("Could not find the bookmark folder.");
        }
        const workspaceFolder = resolvedBookmarkFolder.children?.find((node) => node.title === workspace.name);

        if (workspaceFolder !== undefined) {
            await chrome.bookmarks.removeTree(workspaceFolder.id);
        }
    }

    /**
     * Check if the user has enabled saving bookmarks.
     */
    public static async isBookmarkSaveEnabled(): Promise<boolean> {
        const value = await StorageHelper.getValue(Constants.STORAGE_KEYS.settings.saveBookmarks, "true");
        return value === "true";
    }

    /**
     * Set the user's preference for saving bookmarks.
     * @param value - The new value for the setting.
     */
    public static async setBookmarkSaveEnabled(value: boolean): Promise<void> {
        await StorageHelper.setValue(Constants.STORAGE_KEYS.settings.saveBookmarks, value.toString());
    }
}