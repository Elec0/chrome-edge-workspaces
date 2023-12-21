import { StorageHelper } from "./storage-helper";
import { Constants } from "./constants/constants";
import { MessageResponse, MessageResponses } from "./constants/message-responses";
import { TabStub } from "./obj/tab-stub";
import { Messages } from "./constants/messages";




// Functions

export class Background {
    public static async processNewWorkspace(request: any): Promise<MessageResponse> {
        let result = await StorageHelper.addWorkspace(request.payload.workspaceName, request.payload.windowId);
        if (!result) {
            return MessageResponses.FAILURE;
        }
        return MessageResponses.SUCCESS;
    }

    public static async processGetWorkspaces(request: any): Promise<MessageResponse> {
        let workspaces = await StorageHelper.getWorkspaces();
        return { "data": JSON.stringify(Array.from(workspaces.entries())) };
    }

    public static messageListener(request: any, sender: any, sendResponse: any): boolean {
        switch (request.type) {
            case Messages.MSG_GET_WORKSPACES:
                Background.processGetWorkspaces(request).then(sendResponse);
                return true;

            case Messages.MSG_NEW_WORKSPACE:
                Background.processNewWorkspace(request).then(sendResponse);
                return true;    
        }

        console.log(MessageResponses.UNKNOWN_MSG.message, request);
        sendResponse(MessageResponses.UNKNOWN_MSG);
        return false;
    }

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

    public static async tabRemoved(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) {
        if (removeInfo.isWindowClosing) {
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

            workspace.tabs.push(TabStub.fromTab(tab));
            await StorageHelper.setWorkspace(workspace);
        },
            (error) => { });
    }
}


// Listeners
chrome.runtime.onMessage.addListener(Background.messageListener);
chrome.windows.onRemoved.addListener(Background.windowRemoved);
chrome.tabs.onRemoved.addListener(Background.tabRemoved);
chrome.tabs.onUpdated.addListener(Background.tabUpdated);
// chrome.tabs.onReplaced.addListener(Background.tabUpdated);