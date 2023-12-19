import { StorageHelper } from "./storage-helper";
import { Constants } from "./constants/constants";
import { MessageResponse, MessageResponses } from "./constants/message-responses";
import { TabStub } from "./obj/tab-stub";

// Listeners
chrome.runtime.onMessage.addListener(messageListener);
chrome.windows.onRemoved.addListener(windowRemoved);
chrome.tabs.onRemoved.addListener(tabRemoved);
chrome.tabs.onCreated.addListener(tabCreated);

// Functions

async function processNewWorkspace(request: any): Promise<MessageResponse> {
    let result = await StorageHelper.addWorkspace(request.payload.workspaceName, request.payload.windowId);
    if (!result) {
        return MessageResponses.FAILURE;
    }
    return MessageResponses.SUCCESS;
}

function messageListener(request: any, sender: any, sendResponse: any): boolean {
    if (request.type === Constants.MSG_NEW_WORKSPACE) {
        processNewWorkspace(request).then(sendResponse);
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
async function windowRemoved(windowId: number) {
    if (!StorageHelper.isWindowWorkspace(windowId)) return;

    console.debug(`Window ${ windowId } is a workspace, saving tabs...`);

    // TODO: Update the sync storage with the new workspace.
}

async function tabRemoved(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) {
    console.debug(`Tab ${ tabId } removed`);
    if (removeInfo.isWindowClosing) {
        // Window is closing, not saving tabs; they've already been saved.
        return;
    }

    // Tab is being closed normally, update the workspace that the tab has closed.
    let workspace = await StorageHelper.getWorkspace(removeInfo.windowId);
    workspace.removeTab(tabId);
    await StorageHelper.setWorkspace(workspace);

}

async function tabCreated(tab: chrome.tabs.Tab) {
    let isWorkspace = await StorageHelper.isWindowWorkspace(tab.windowId);
    if (!isWorkspace) {
        return;
    }
    console.log(`Tab ${ tab.id } created in workspace ${ tab.windowId }`);
    console.debug(tab);

    let workspace = await StorageHelper.getWorkspace(tab.windowId);
    workspace.tabs.push(TabStub.fromTab(tab));
    await StorageHelper.setWorkspace(workspace);
}
