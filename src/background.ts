import { Constants } from "./constants/constants";
import { MessageResponse, MessageResponses } from "./constants/message-responses";
import { LogHelper } from "./log-helper";
import { BackgroundMessageHandlers } from "./messages/background-message-handlers";
import { Workspace } from "./obj/workspace";
import { StorageHelper } from "./storage-helper";
import { BookmarkStorageHelper } from "./storage/bookmark-storage-helper";
import { SyncWorkspaceStorage } from "./storage/sync-workspace-storage";
import { Utils } from "./utils";
import { DebounceUtil } from "./utils/debounce";
import { FeatureDetect } from "./utils/feature-detect";

export class Background {
    private static saveDisabledUntil: number = 0;
    private static savesSkipped: number = 0;

    /**
     * Disable saving for a certain number of seconds.
     * Performs a scheduled save after the time has elapsed.
     */
    private static disableSavingFor(seconds: number, windowId: number): void {
        Background.saveDisabledUntil = Date.now() + seconds * 1000;
        console.debug(`Saving disabled for ${ seconds } seconds.`);

        // Queue up a save for when saving is re-enabled
        if (Utils.areWeTestingWithJest()) return;

        setTimeout(() => {
            this.isSavingDisabled(); // Reset the flag
            Background.saveWindowTabsToWorkspace(windowId);
        }, seconds * 1000);
    }

    private static isSavingDisabled(): boolean {
        const skip = Date.now() < Background.saveDisabledUntil;
        if (skip) {
            this.savesSkipped++;
        }
        else if (this.savesSkipped > 0) {
            console.debug(`Saves skipped: ${ this.savesSkipped }`);
            this.savesSkipped = 0;
        }
        return skip;
    }

    /** Wrapper for debouncing the save with our util. */
    private static debounceSave(windowId: number): void {
        DebounceUtil.debounce(Constants.DEBOUNCE_IDS.saveWorkspace, () => {
            Background.saveWindowTabsToWorkspace(windowId);
        }, Constants.WORKSPACE_SAVE_DEBOUNCE_TIME);
    }

    /**
     * A window is closing. Check to see if it's a workspace, and if so, push an update to the sync storage.
     * 
     * @param windowId - The ID of the window that is closing.
     * @returns 
     */
    public static async windowRemoved(windowId: number): Promise<void> {
        if (!await StorageHelper.isWindowWorkspace(windowId)) return;

        console.debug(`Window ${ windowId } is a workspace, saving tabs...`);

        // Attempt to cancel a sync workspace debounce if it's in progress.
        if(DebounceUtil.clearDebounce(Constants.DEBOUNCE_IDS.saveWorkspaceToSync)) {
            console.debug(`Debounced save for window ${ windowId } was canceled, immediately triggering sync save.`);
            const workspace = await StorageHelper.getWorkspaceFromWindow(windowId);
            if(workspace) {
                await SyncWorkspaceStorage.immediatelySaveWorkspaceToSync(workspace);
            }
        }

        // await StorageHelper.setWorkspacesSync(await StorageHelper.getWorkspaces());
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
        if (Background.isSavingDisabled()) return;
        if (removeInfo.isWindowClosing || removeInfo.windowId == null || removeInfo.windowId == undefined) {
            return; // Window is closing, not saving tabs; they've already been saved.
        }
        // Can't check if the URL is untrackable here, as there's no way to get the tab URL from removeInfo.
        if (!await StorageHelper.isWindowWorkspace(removeInfo.windowId)) return;

        console.debug(`Tab ${ tabId } removed`);
        const workspace = await StorageHelper.getWorkspace(removeInfo.windowId);
        // If the tab is the last tab in the window, we don't want to save the tabs.
        if (workspace.getTabs().length > 1) {
            // Tab is being closed normally, update the workspace that the tab has closed.
            // The tab is not part of the window anymore, so querying the window will not return the tab.
            Background.debounceSave(removeInfo.windowId);
        }
    }

    /**
     * A tab has been updated. This is called many times as the tab is loading, so we need to be careful.
     * 
     * This is also called when a tab is in a group and the window is closed. The tab is updated to remove it from the group.
     * 
     * @param tabId - The ID of the tab that was updated.
     * @param changeInfo - Information about the tab change.
     * @param tab - The tab that was updated.
     */
    public static async tabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): Promise<void> {
        if (Background.isSavingDisabled()) return;
        if (!await StorageHelper.isWindowWorkspace(tab.windowId)) return;

        // We need to ignore any tabs that are not normal website tabs.
        if (Utils.isUrlUntrackable(tab.url)) {
            return;
        }
        // console.debug(`Tab ${ tabId } updated. Change info:`, changeInfo);

        Background.debounceSave(tab.windowId);
    }

    /**
     * A tab has been attached to a window. This should be treated as if the tab is being opened.
     * 
     * @param tabId - The ID of the tab that was attached.
     * @param attachInfo - Information about the tab attachment.
     */
    public static async tabAttached(tabId: number, attachInfo: chrome.tabs.TabAttachInfo): Promise<void> {
        console.debug(`Tab ${ tabId } attached to window ${ attachInfo.newWindowId }`);
        if (Background.isSavingDisabled()) return;
        if (!await StorageHelper.isWindowWorkspace(attachInfo.newWindowId)) return;

        Background.debounceSave(attachInfo.newWindowId);
    }

    /**
     * A tab has been detached from a window. This should be treated as if the tab is being closed.
     * If the window the tab is being detached from is a workspace, and the new window is not a workspace,
     * we need to ensure the tab is updated and badge text is removed.  
     * Adding the tab to the new workspace is handled in tabAttached, which will handle updating the badge text if needed.
     * 
     * Note that this event is not fired when a tab is just closing. Nor is tabRemoved fired when a tab is moved to another window.
     * @param tabId - The ID of the tab that was detached.
     * @param detachInfo - Information about the tab detachment.
     */
    public static async tabDetached(tabId: number, detachInfo: chrome.tabs.TabDetachInfo): Promise<void> {
        console.debug(`Tab ${ tabId } detached from window ${ detachInfo.oldWindowId }`);
        // Removing the tab from the workspace is handled in tabRemoved.
        Background.tabRemoved(tabId, { isWindowClosing: false, windowId: detachInfo.oldWindowId });

        // No matter what window the tab is being moved to, we need to update the badge text of this tab.
        Utils.setBadgeForTab("", tabId);
    }


    /**
     * A tab is being replaced.
     * Check if the added tab is a workspace, and if so, update the workspace with the new tab. 
     */
    public static async tabReplaced(addedTabId: number, removedTabId: number): Promise<void> {
        console.debug(`Tab ${ removedTabId } replaced with tab ${ addedTabId }`);

        if (Background.isSavingDisabled()) return;
        const addedTab = await chrome.tabs.get(addedTabId);
        if (!await StorageHelper.isWindowWorkspace(addedTab.windowId)) return;

        Background.debounceSave(addedTab.windowId);
    }

    /**
     * A tab has been activated. Update the workspace with the focused tab.
     * 
     * @param activeInfo - Information about the activated tab.
     */
    public static async tabActivated(activeInfo: chrome.tabs.TabActiveInfo): Promise<void> {
        if (Background.isSavingDisabled()) return;
        if (!await StorageHelper.isWindowWorkspace(activeInfo.windowId)) return;

        const workspace = await StorageHelper.getWorkspace(activeInfo.windowId);
        if (workspace.getTabs().length > 1) {
            Background.debounceSave(activeInfo.windowId);
        }
    }

    /**
     * A tab group event is fired. Update the workspace with the new tab group.
     * 
     * @param group - Information about the updated tab group.
     */
    public static async tabGroupEvent(group: chrome.tabGroups.TabGroup): Promise<void> {
        console.debug(`Tab group ${ group.id } changed in window ${ group.windowId }`);
        if (Background.isSavingDisabled()) return;
        if (!await StorageHelper.isWindowWorkspace(group.windowId)) return;

        Background.debounceSave(group.windowId);
    }

    /**
     * Save all the tabs from a window to a workspace, just to be thorough and simple.  
     * Also updates the badge text for the workspace.
     * 
     * This is called when a tab is removed, attached, or detached, and when a tab is updated.
     * @param windowId - The ID of the window to save tabs from.
     */
    public static async saveWindowTabsToWorkspace(windowId: number): Promise<void> {
        const workspace = await StorageHelper.getWorkspace(windowId);
        const tabs = await Utils.getTabsFromWindow(windowId);
        let tabGroups;
        if (FeatureDetect.supportsTabGroups()) {
            tabGroups = await Utils.getTabGroupsFromWindow(windowId);
        }

        // If we're getting an update at a point where there are no tabs considered attached to the window,
        // we should just ignore it, since it's likely the window is closing. 
        // Also, I can't think of a reason we would want to save an empty workspace.
        if (tabs.length === 0) {
            console.warn(`Window ${ windowId } has no tabs. Ignoring update.`);
            return;
        }
        await Utils.setWorkspaceTabsAndGroups(workspace, tabs, tabGroups);

        // Update the badge text
        Utils.setBadgeForWindow(windowId, Background.getBadgeTextForWorkspace(workspace));

        // Ensure the workspace is saved to bookmarks
        await BookmarkStorageHelper.saveWorkspace(workspace)

        // Save the workspace to sync storage
        // await StorageHelper.setWorkspace(workspace);
    }

    /**
     * Get the badge text for a workspace.
     * FUTURE: Make this a user-settable option.
     */
    private static getBadgeTextForWorkspace(workspace: Workspace): string {
        return workspace.name.substring(0, 1).toLocaleUpperCase();
    }

    /**
     * This method is called after the client has opened a new window with the workspace's tabs.
     * 
     * We need to update the workspace with the new window ID.
     * Also clear the workspace's tabs, since more are about to be opened in a new window.
     * 
     * 
     * @param uuid - The UUID of the workspace to open.
     * @param windowId - The ID of the window that the workspace is being opened in.
     * @returns 
     */
    public static async updateWorkspaceWindowId(uuid: string, windowId: number): Promise<MessageResponse> {
        // Disable saving for 5 seconds
        Background.disableSavingFor(Constants.WORKSPACE_OPEN_SAVE_DELAY, windowId);

        try {
            const workspace = await StorageHelper.getWorkspace(uuid);
            workspace.windowId = windowId;
            await StorageHelper.setWorkspace(workspace);
            return MessageResponses.SUCCESS;

        }
        catch (error) {
            LogHelper.errorAlert(error as string);
            return MessageResponses.ERROR;
        }
    }
}

// #region Message Listeners
// These must be at the top level for Firefox compatibility, otherwise they won't fire
// when the extension is unloaded.
if (!Utils.areWeTestingWithJest()) {
    console.info("Adding message listeners in background script.");

    chrome.runtime.onMessage.addListener(BackgroundMessageHandlers.messageListener);
    chrome.windows.onRemoved.addListener(Background.windowRemoved);
    chrome.tabs.onRemoved.addListener(Background.tabRemoved);
    chrome.tabs.onUpdated.addListener(Background.tabUpdated);
    chrome.tabs.onReplaced.addListener(Background.tabReplaced);
    chrome.tabs.onDetached.addListener(Background.tabDetached);
    chrome.tabs.onAttached.addListener(Background.tabAttached);
    chrome.tabs.onActivated.addListener(Background.tabActivated);
    if (FeatureDetect.supportsTabGroups()) {
        chrome.tabGroups.onCreated.addListener(Background.tabGroupEvent);
        chrome.tabGroups.onUpdated.addListener(Background.tabGroupEvent);
        chrome.tabGroups.onRemoved.addListener(Background.tabGroupEvent);
    }
}
// #endregion