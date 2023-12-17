import { StorageHelper } from "./storage-helper";
import { Constants } from "./constants/constants";
import { MessageResponses } from "./constants/message-responses";
import { TabStub } from "./obj/tab-stub";
// With background scripts you can communicate with popup
// and contentScript files.
// For more information on background script,
// See https://developer.chrome.com/extensions/background_pages

async function processNewWorkspace(request) {
    let result = await StorageHelper.addWorkspace(request.payload.workspaceName, request.payload.windowId);
    if (!result) {
        return MessageResponses.FAILURE;
    }
    return MessageResponses.SUCCESS;
}

// Listeners
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === Constants.MSG_NEW_WORKSPACE) {
        processNewWorkspace(request).then(sendResponse);

        return true;
    }

    console.log(MessageResponses.UNKNOWN_MSG.message, request);
    sendResponse(MessageResponses.UNKNOWN_MSG);
    return false;
});

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason !== "install" && details.reason !== "update") return;
    // chrome.contextMenus.create({
    //   "id": "sampleContextMenu",
    //   "title": "Sample Context Menu",
    //   "contexts": ["selection"]
    // });
});

// chrome.windows.onCreated.addListener(async (window) => {
//     let isWorkspace = await StorageHelper.isWindowWorkspace(window.id);
// });

/**
 * When a window is removed, if it's a workspace, get the workspace, update it, and save it to storage.
 */
chrome.windows.onRemoved.addListener(async (window) => {
    if (!StorageHelper.isWindowWorkspace(window)) return;

    let workspace = StorageHelper.getWorkspace(window);
    workspace.tabs = [];

    // TODO: This looks like it doesn't work, not sure.
    // Loop through the tabs in the window, and add them to the workspace
    let tabs = await chrome.tabs.query({ windowId: window });

    let tabStubs = TabStub.fromTabs(tabs);
    workspace.tabs = tabStubs;

    await StorageHelper.setWorkspace(workspace);
});



// This does work
// chrome.tabs.onCreated.addListener(async (tab) => {
//     console.log(`Tab ${tab.id} created`);
//     console.debug(tab);
//     let isWorkspace = await StorageHelper.isWindowWorkspace(tab.windowId);
//     if (isWorkspace) {
//         console.log(`In workspace ${tab.windowId}`);

//         let workspace = await StorageHelper.getWorkspace(tab.windowId);
//         workspace.tabs.push(tab);
//         await StorageHelper.setWorkspace(workspace);
//     }
//     else {
//         console.log(`Not in a workspace`);
//     }
// });
