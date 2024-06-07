import { BackgroundMessageHandlers } from "./messages/background-message-handlers";
import { MessageResponse, MessageResponses } from "./constants/message-responses";
import { LogHelper } from "./log-helper";
import { StorageHelper } from "./storage-helper";
import { Utils } from "./utils";
import { Workspace } from "./obj/workspace";

export class Background {
    /**
     * A window is closing. Check to see if it's a workspace, and if so, push an update to the sync storage.
     * 
     * @param windowId - The ID of the window that is closing.
     * @returns 
     */
    public static async windowRemoved(windowId: number): Promise<void> {
        if (!await StorageHelper.isWindowWorkspace(windowId)) return;

        console.debug(`Window ${ windowId } is a workspace, saving tabs...`);

        console.log("Will save tabs to sync storage here.")
        // TODO: Update the sync storage with the new workspace.
    }

    /**
     * A tab is closing. Check to see if it's a workspace, and if so, push an update to storage.
     * If the window is closing, we don't need to save the tabs, since they've already been saved,
     * but if the tab is being closed normally, we need to update the workspace.
     * 
     * The process of closing the last tab goes like this:
     * 1. User closes the tab
     * 2. Popup.windowRemoved is called
     *     - This causes a load of the workspace from storage, which returns the workspace with the single last tab
     * 3. Background.tabRemoved is called
     *      - Utils.getTabsFromWindow is called
     *          - There are no tabs in the window, so `[]` is returned
     *      - Workspace storage is updated with the empty tab list
     * 4. Background.windowRemoved is called
     * 
     * This means popup's entry for the workspace will properly show '1 tab', but only until it is reloaded,
     * at which point it will show '0 tabs'.
     * 
     * This, in turn, means we do need to have a special case for the last tab closing in this method.
     * 
     * @param tabId - The ID of the tab that is closing.
     * @param removeInfo - Information about the tab removal.
     */
    public static async tabRemoved(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo): Promise<void> {
        if (removeInfo.isWindowClosing || removeInfo.windowId == null || removeInfo.windowId == undefined) {
            return; // Window is closing, not saving tabs; they've already been saved.
        }
        // Can't check if the URL is untrackable here, as there's no way to get the tab URL from the removeInfo.
        if (!await StorageHelper.isWindowWorkspace(removeInfo.windowId)) return;

        console.debug(`Tab ${ tabId } removed`);
        const workspace = await StorageHelper.getWorkspace(removeInfo.windowId);
        // If the tab is the last tab in the window, we don't want to save the tabs.
        if (workspace.getTabs().length > 1) {
            // Tab is being closed normally, update the workspace that the tab has closed.
            // The tab is not part of the window anymore, so querying the window will not return the tab.
            Background.saveWindowTabsToWorkspace(removeInfo.windowId);
        }
    }

    /**
     * A tab has been updated. We need to save the tabs to the workspace.
     * 
     * @param tabId - The ID of the tab that was updated.
     * @param changeInfo - Information about the tab change.
     * @param tab - The tab that was updated.
     */
    public static async tabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): Promise<void> {
        if (!await StorageHelper.isWindowWorkspace(tab.windowId)) return;

        // We need to ignore any tabs that are not normal website tabs.
        if (Utils.isUrlUntrackable(tab.url)) {
            return;
        }
        Background.saveWindowTabsToWorkspace(tab.windowId);
    }

    /**
     * A tab has been attached to a window. This should be treated as if the tab is being opened.
     * 
     * @param tabId - The ID of the tab that was attached.
     * @param attachInfo - Information about the tab attachment.
     */
    public static async tabAttached(tabId: number, attachInfo: chrome.tabs.TabAttachInfo): Promise<void> {
        console.debug(`Tab ${ tabId } attached to window ${ attachInfo.newWindowId }`);
        if (!await StorageHelper.isWindowWorkspace(attachInfo.newWindowId)) return;
        
        Background.saveWindowTabsToWorkspace(attachInfo.newWindowId);
    }

    /**
     * A tab has been detached from a window. This should be treated as if the tab is being closed.
     * 
     * Note that this event is not fired when a tab is just closing. Nor is tabRemoved fired when a tab is moved to another window.
     * @param tabId - The ID of the tab that was detached.
     * @param detachInfo - Information about the tab detachment.
     */
    public static async tabDetatched(tabId: number, detachInfo: chrome.tabs.TabDetachInfo): Promise<void> {
        console.debug(`Tab ${ tabId } detached from window ${ detachInfo.oldWindowId }`);
        Background.tabRemoved(tabId, { isWindowClosing: false, windowId: detachInfo.oldWindowId });
    }


    /**
     * A tab is being replaced.
     * Check if the added tab is a workspace, and if so, update the workspace with the new tab. 
     */
    public static async tabReplaced(addedTabId: number, removedTabId: number): Promise<void> {
        console.debug(`Tab ${ removedTabId } replaced with tab ${ addedTabId }`);
        const addedTab = await chrome.tabs.get(addedTabId);
        if (!await StorageHelper.isWindowWorkspace(addedTab.windowId)) return;

        Background.saveWindowTabsToWorkspace(addedTab.windowId);
    }

    /**
     * A tab has been activated. Update the workspace with the focused tab.
     * 
     * @param activeInfo - Information about the activated tab.
     */
    public static async tabActivated(activeInfo: chrome.tabs.TabActiveInfo): Promise<void> {
        if (!await StorageHelper.isWindowWorkspace(activeInfo.windowId)) return;

        const workspace = await StorageHelper.getWorkspace(activeInfo.windowId);
        if (workspace.getTabs().length > 1) {
            Background.saveWindowTabsToWorkspace(activeInfo.windowId);
        }
    }

    /**
     * Save all the tabs from a window to a workspace, just to be thorough and simple.
     * @param windowId - The ID of the window to save tabs from.
     */
    private static async saveWindowTabsToWorkspace(windowId: number): Promise<void> {
        const workspace = await StorageHelper.getWorkspace(windowId);
        const tabs = await Utils.getTabsFromWindow(windowId);
        await Utils.setWorkspaceTabs(workspace, tabs);

        // Update the badge text
        Utils.setBadgeForWindow(windowId, Background.getBadgeTextForWorkspace(workspace));

        // await BookmarkStorageHelper.addTabToWorkspace(workspace.uuid, tab);
    }

    /**
     * Get the badge text for a workspace.
     * FUTURE: Make this a user-settable option.
     */
    private static getBadgeTextForWorkspace(workspace: Workspace): string {
        return workspace.name.substring(0, 3);
    }

    /**
     * We need to update the workspace with the new window ID.
     * 
     * Then we need to send a message back to the content script with the updated workspace.
     * @param uuid - The UUID of the workspace to open.
     * @param windowId - The ID of the window that the workspace is being opened in.
     * @returns 
     */
    public static async openWorkspace(uuid: string, windowId: number): Promise<MessageResponse> {
        try {
            const workspace = await StorageHelper.getWorkspace(uuid);
            workspace.windowId = windowId;
            // Serialize the workspace before we make any other changes
            const data = workspace.serialize();

            // The workspace is just about to get a bunch of tabs opened.
            // The tabs are going to have unique IDs again, so we need to clear the tabs map
            // to avoid duplicate tabs.
            workspace.clearTabs();
            await StorageHelper.setWorkspace(workspace);

            return { "data": data };
        }
        catch (error) {
            LogHelper.errorAlert(error as string);
            return MessageResponses.ERROR;
        }
    }
}

function setupListeners() {
    if (Utils.areWeTestingWithJest()) return;

    chrome.runtime.onMessage.addListener(BackgroundMessageHandlers.messageListener);
    chrome.windows.onRemoved.addListener(Background.windowRemoved);
    chrome.tabs.onRemoved.addListener(Background.tabRemoved);
    chrome.tabs.onUpdated.addListener(Background.tabUpdated);
    chrome.tabs.onReplaced.addListener(Background.tabReplaced);
    chrome.tabs.onDetached.addListener(Background.tabDetatched);
    chrome.tabs.onAttached.addListener(Background.tabAttached);
    chrome.tabs.onActivated.addListener(Background.tabActivated);
}
setupListeners();