import { MessageResponse, MessageResponses } from "./constants/message-responses";
import { Messages } from "./constants/messages";
import { StorageHelper } from "./storage-helper";
import { Utils } from "./utils";




// Functions

export class Background {
    /**
     * A window is closing. Check to see if it's a workspace, and if so, push an update to the sync storage.
     * @param windowId 
     * @returns 
     */
    public static async windowRemoved(windowId: number) {
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
     * Additionally, if the tab is being closed normally, but it is the only tab in the window,
     * we treat it as if the window is closing.
     * @param tabId 
     * @param removeInfo 
     * @returns 
     */
    public static async tabRemoved(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) {
        if (removeInfo.isWindowClosing || removeInfo.windowId == null || removeInfo.windowId == undefined) {
            // Window is closing, not saving tabs; they've already been saved.
            return;
        }
        console.debug(`Tab ${ tabId } removed`);

        // Tab is being closed normally, update the workspace that the tab has closed.
        let workspace = await StorageHelper.getWorkspace(removeInfo.windowId);
        workspace.removeTab(tabId);
        await StorageHelper.setWorkspace(workspace);

    }

    public static async tabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) {
        // Then's first callback is the success callback, second is the error callback.
        // We don't need the error callback, so we ignore it.
        StorageHelper.getWorkspace(tab.windowId).then(async (workspace) => {
            console.log(`Tab ${ tab.id } updated in workspace ${ tab.windowId }`);
            console.debug(tab);

            workspace.addTab(undefined, tab);
            await StorageHelper.setWorkspace(workspace);
        },
            (error) => { 
                // console.error(error);
            }
        );
    }
}

/**
 * Class representing the message handlers for background operations.
 * 
 * @VisibleForTesting
 */
export class BackgroundMessageHandlers {
    /**
     * We're being informed that a workspace is being opened in a new window.\
     * We need to update the workspace with the new window ID.\
     * Then we need to send a message back to the content script with the updated workspace.
     * @param request {Object{data: { uuid: string, windowId: number}}}
     */
    public static async processOpenWorkspace(request: any): Promise<MessageResponse> {
        if (!request?.payload?.data?.uuid || !request?.payload?.data?.windowId) {
            return MessageResponses.ERROR;
        }
        
        let workspace = await StorageHelper.getWorkspace(request.payload.data.uuid);
        workspace.windowId = request.payload.data.windowId;
        // Serialize the workspace before we make any other changes
        let data = workspace.serialize();

        // The workspace is just about to get a bunch of tabs opened.
        // The tabs are going to have unique IDs again, so we need to clear the tabs map
        // so that we don't have duplicate tabs.
        workspace.clearTabs();
        await StorageHelper.setWorkspace(workspace);

        return { "data": data };
    }

    /**
     * Processes a new workspace request.
     * @param request - The request object containing the workspace name and window ID.
     * @returns A promise that resolves to a MessageResponse indicating the success or failure of the operation.
     */
    public static async processNewWorkspace(request: any): Promise<MessageResponse> {
        let result = await StorageHelper.addWorkspace(request.payload.workspaceName, request.payload.windowId);
        if (!result) {
            return MessageResponses.FAILURE;
        }
        return MessageResponses.SUCCESS;
    }

    /**
     * Processes the request to get the workspaces.
     * @param request - The request object.
     * @returns A promise that resolves to a MessageResponse containing the serialized workspaces data.
     */
    public static async processGetWorkspaces(request: any): Promise<MessageResponse> {
        let workspaces = await StorageHelper.getWorkspaces();
        return { "data": workspaces.serialize() };
    }

    /**
     * Handles incoming messages from the content script.
     * @param request - The message request object.
     * @param sender - The sender of the message.
     * @param sendResponse - The function to send a response back to the content script.
     * @returns A boolean indicating whether the message was successfully handled.
     */
    public static messageListener(request: any, sender: any, sendResponse: any): boolean {
        switch (request.type) {
            case Messages.MSG_GET_WORKSPACES:
                this.processGetWorkspaces(request).then(sendResponse);
                return true;

            case Messages.MSG_NEW_WORKSPACE:
                this.processNewWorkspace(request).then(sendResponse);
                return true;
        }

        console.log(MessageResponses.UNKNOWN_MSG.message, request);
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
    // chrome.tabs.onReplaced.addListener(Background.tabUpdated);
}
setupListeners();