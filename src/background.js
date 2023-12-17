import { StorageHelper } from "./storage-helper";
import { Constants } from "./constants/constants";
import { MessageResponses } from "./constants/message-responses";
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

chrome.windows.onRemoved.addListener((window) => {
});

