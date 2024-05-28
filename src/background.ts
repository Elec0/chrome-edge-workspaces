import { MessageResponse, MessageResponses } from "./constants/message-responses";
import { Messages } from "./constants/messages";
import { IRequest, IRequestWithUuid, IRequestNewWorkspace, IRequestOpenWorkspace, IRequestRenameWorkspace } from "./interfaces/messages";
import { LogHelper } from "./log-helper";
import { StorageHelper } from "./storage-helper";
import { Utils } from "./utils";

// Functions

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
        // await BookmarkStorageHelper.addTabToWorkspace(workspace.uuid, tab);
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

/**
 * Class representing the message handlers for background operations.
 * 
 * @remarks This class is public for testing purposes.
 */
export class BackgroundMessageHandlers {
    /**
     * We're being informed that a workspace is being opened in a new window.
     * @param request - The request object containing the workspace data.
     */
    public static async processOpenWorkspace(request: IRequestOpenWorkspace): Promise<MessageResponse> {
        if (!request?.payload?.uuid || !request?.payload?.windowId) {
            return MessageResponses.ERROR;
        }

        return await Background.openWorkspace(request.payload.uuid, request.payload.windowId);
    }

    /**
     * Processes a new workspace request.
     * @param request - The request object containing the workspace name and window ID.
     * @returns A promise that resolves to a MessageResponse indicating the success or failure of the operation.
     */
    public static async processNewWorkspace(request: IRequestNewWorkspace): Promise<MessageResponse> {
        const result = await StorageHelper.addWorkspace(request.payload.workspaceName, request.payload.windowId);
        if (!result) {
            return MessageResponses.ERROR;
        }
        return MessageResponses.SUCCESS;
    }

    /**
     * Processes a request to delete a workspace.
     * @param request - The request object containing the workspace UUID to delete.
     */
    public static async processDeleteWorkspace(request: IRequestWithUuid): Promise<MessageResponse> {
        const result = await StorageHelper.removeWorkspace(request.payload.uuid);
        if (!result) {
            return MessageResponses.ERROR;
        }
        return MessageResponses.SUCCESS;
    }

    /**
     * Processes a request to rename a workspace.
     * @param request - The request object containing the workspace UUID and the new name.
     */
    public static async processRenameWorkspace(request: IRequestRenameWorkspace): Promise<MessageResponse> {
        const result = await StorageHelper.renameWorkspace(request.payload.uuid, request.payload.newName);
        if (!result) {
            return MessageResponses.ERROR;
        }
        return MessageResponses.SUCCESS;
    }

    /**
     * Processes the request to get the workspaces.
     * @param request - The request object, unused.
     * @returns A promise that resolves to a MessageResponse containing the serialized workspaces data.
     */
    public static async processGetWorkspaces(_request: unknown): Promise<MessageResponse> {
        const workspaces = await StorageHelper.getWorkspaces();
        return { "data": workspaces.serialize() };
    }

    /**
     * Processes the request to get a workspace.
     * @param request - The request object.
     * @returns A promise that resolves to a MessageResponse containing the serialized workspace data.
     */
    public static async processGetWorkspace(request: IRequestWithUuid): Promise<MessageResponse> {
        if (!request?.payload?.uuid) {
            return MessageResponses.ERROR;
        }
        const workspace = await StorageHelper.getWorkspace(request.payload.uuid);
        return { "data": workspace.serialize() };
    }

    public static async processClearWorkspaces(_request: unknown): Promise<MessageResponse> {
        await StorageHelper.clearWorkspaces();
        return MessageResponses.SUCCESS;
    }

    /**
     * Handles incoming messages from the content script.  
     * Messages are sent from {@link PopupMessageHelper}.
     * @param request - The message request object.
     * @param sender - The sender of the message.
     * @param sendResponse - The function to send a response back to the content script.
     * @returns A boolean indicating whether the message was successfully handled.
     */
    public static messageListener(request: IRequest, _sender: unknown, sendResponse: (response: MessageResponse) => void): boolean {
        switch (request.type) {
            case Messages.MSG_GET_WORKSPACES:
                BackgroundMessageHandlers.processGetWorkspaces(request).then(sendResponse);
                return true;

            case Messages.MSG_GET_WORKSPACE:
                BackgroundMessageHandlers.processGetWorkspace(request as IRequestWithUuid).then(sendResponse);
                return true;

            case Messages.MSG_NEW_WORKSPACE:
                BackgroundMessageHandlers.processNewWorkspace(request as IRequestNewWorkspace).then(sendResponse);
                return true;

            case Messages.MSG_OPEN_WORKSPACE:
                BackgroundMessageHandlers.processOpenWorkspace(request as IRequestOpenWorkspace).then(sendResponse);
                return true;

            case Messages.MSG_DELETE_WORKSPACE:
                BackgroundMessageHandlers.processDeleteWorkspace(request as IRequestWithUuid).then(sendResponse);
                return true;

            case Messages.MSG_RENAME_WORKSPACE:
                BackgroundMessageHandlers.processRenameWorkspace(request as IRequestRenameWorkspace).then(sendResponse);
                return true;

            case Messages.MSG_CLEAR_WORKSPACES:
                BackgroundMessageHandlers.processClearWorkspaces(request).then(sendResponse);
                return true;
        }

        console.log(MessageResponses.UNKNOWN_MSG.message, "for request:", request);
        sendResponse(MessageResponses.UNKNOWN_MSG);
        return false;
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