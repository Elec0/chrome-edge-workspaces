'use strict';
import { StorageHelper } from "./storage-helper";

// With background scripts you can communicate with popup
// and contentScript files.
// For more information on background script,
// See https://developer.chrome.com/extensions/background_pages

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GREETINGS') {
    const message = `Hi ${
      sender.tab ? 'Con' : 'Pop'
    }, my name is Bac. I am from Background. It's great to hear from you.`;

    // Log message coming from the `request` parameter
    console.log(request.payload.message);
    // Send a response message
    sendResponse({
      message,
    });
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if(details.reason !== "install" && details.reason !== "update") return;
  // chrome.contextMenus.create({
  //   "id": "sampleContextMenu",
  //   "title": "Sample Context Menu",
  //   "contexts": ["selection"]
  // });
});

chrome.windows.onCreated.addListener(async (window) => {
  console.log("onCreated, from the background");
  console.log(window);
  let isWorkspace = await StorageHelper.isWindowWorkspace(window.id);
  console.log(`${window.id} isWorkspace=${isWorkspace}`);
});

chrome.windows.onRemoved.addListener((window) => {
  console.log("onRemoved, from the background");
  console.log(window);
});