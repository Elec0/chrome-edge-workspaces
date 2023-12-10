import { StorageHelper } from "./storage-helper";
import { Constants, MessageResponses } from "./constants";
// With background scripts you can communicate with popup
// and contentScript files.
// For more information on background script,
// See https://developer.chrome.com/extensions/background_pages


// Listeners
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === Constants.MSG_NEW_WORKSPACE) {

        if (!await StorageHelper.addWorkspace(request.payload.workspaceName, request.payload.windowId)) {
            sendResponse({
                "message": MessageResponses.ERROR
            });
        }
        // const message = `Hi ${
        //   sender.tab ? "Con" : "Pop"
        // }, my name is Bac. I am from Background. It's great to hear from you.`;

        // Log message coming from the `request` parameter
        // console.log(request.payload.message);
        // Send a response message
        sendResponse({
            "message": MessageResponses.SUCCESS
        });
    }
});

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason !== "install" && details.reason !== "update") return;
    // chrome.contextMenus.create({
    //   "id": "sampleContextMenu",
    //   "title": "Sample Context Menu",
    //   "contexts": ["selection"]
    // });
});

chrome.windows.onCreated.addListener(async (window) => {
    let isWorkspace = await StorageHelper.isWindowWorkspace(window.id);
});

chrome.windows.onRemoved.addListener((window) => {
});

