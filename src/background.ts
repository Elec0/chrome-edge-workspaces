import { MessageResponse, MessageResponses } from "./constants/message-responses";
import { Messages } from "./constants/messages";
import { IRequestOpenWorkspace, IRequestNewWorkspace, IRequest } from "./interfaces/messages";
import { StorageHelper } from "./storage-helper";
import { Utils } from "./utils";




// Functions

export class Background {
    /**
     * A window is closing. Check to see if it's a workspace, and if so, push an update to the sync storage.
     * @param windowId - The ID of the window that is closing.
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
     * @param tabId - The ID of the tab that is closing.
     * @param removeInfo - Information about the tab removal.
     * @returns 
     */
    public static async tabRemoved(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) {
        if (removeInfo.isWindowClosing || removeInfo.windowId == null || removeInfo.windowId == undefined) {
            // Window is closing, not saving tabs; they've already been saved.
            return;
        }
        console.debug(`Tab ${ tabId } removed`);

        // Tab is being closed normally, update the workspace that the tab has closed.
        const workspace = await StorageHelper.getWorkspace(removeInfo.windowId);
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

    /**
     * We need to update the workspace with the new window ID.
     * 
     * Then we need to send a message back to the content script with the updated workspace.
     * @param uuid - The UUID of the workspace to open.
     * @param windowId - The ID of the window that the workspace is being opened in.
     * @returns 
     */
    public static async openWorkspace(uuid: string, windowId: number): Promise<MessageResponse> {
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
        if (!request?.payload?.data?.uuid || !request?.payload?.data?.windowId) {
            return MessageResponses.ERROR;
        }
        
        return await Background.openWorkspace(request.payload.data.uuid, request.payload.data.windowId);
    }

    /**
     * Processes a new workspace request.
     * @param request - The request object containing the workspace name and window ID.
     * @returns A promise that resolves to a MessageResponse indicating the success or failure of the operation.
     */
    public static async processNewWorkspace(request: IRequestNewWorkspace): Promise<MessageResponse> {
        const result = await StorageHelper.addWorkspace(request.payload.workspaceName, request.payload.windowId);
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
    public static async processGetWorkspaces(_request: unknown): Promise<MessageResponse> {
        const workspaces = await StorageHelper.getWorkspaces();
        return { "data": workspaces.serialize() };
    }

    /**
     * Handles incoming messages from the content script.
     * @param request - The message request object.
     * @param sender - The sender of the message.
     * @param sendResponse - The function to send a response back to the content script.
     * @returns A boolean indicating whether the message was successfully handled.
     */
    public static messageListener(request: IRequest, _sender: unknown, sendResponse: (response: unknown) => void): boolean {
        switch (request.type) {
            case Messages.MSG_GET_WORKSPACES:
                BackgroundMessageHandlers.processGetWorkspaces(request).then(sendResponse);
                return true;

            case Messages.MSG_NEW_WORKSPACE:
                BackgroundMessageHandlers.processNewWorkspace(request as IRequestNewWorkspace).then(sendResponse);
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