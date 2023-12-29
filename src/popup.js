"use strict";

import "./popup.css";
import { StorageHelper } from "./storage-helper";
import { MessageResponses } from "./constants/message-responses";
import { Messages } from "./constants/messages";
import { WorkspaceStorage } from "./workspace-storage";
import { Popup } from "./popup-logic";

/**
 * This function is called when the popup is opened.
 * Setup the listeners for the buttons
 */
async function documentLoaded() {
   chrome.tabs.onRemoved.addListener(Popup.tabRemoved);
   chrome.tabs.onUpdated.addListener(Popup.tabUpdated);
   chrome.windows.onRemoved.addListener(windowRemoved);

   document.getElementById("addBtn").addEventListener("click", addWorkspaceButtonClicked);
   document.getElementById("clearStorage").addEventListener("click", clearStorageButtonClicked);

   Popup.listWorkspaces(await StorageHelper.getWorkspaces());
}

async function clearStorageButtonClicked() {
   await StorageHelper.clearAllData();
   Popup.listWorkspaces(await StorageHelper.getWorkspaces());
}

/**
 * Present a popup asking for the workspace name, then create a new window and add it to the workspaces.
 * @returns {Promise<void>}
 */
async function addWorkspaceButtonClicked() {
   // Present popup asking for workspace name
   const workspaceName = prompt("What is the name of your workspace?");

   let window = await chrome.windows.create({});

   console.log(`window created, adding to workspace ${workspaceName}`);

   let response = await chrome.runtime.sendMessage({
      type: Messages.MSG_NEW_WORKSPACE,
      payload: { workspaceName, windowId: window.id }
   });
   if (response === undefined) {
      console.error("Response was undefined");
      return;
   }

   if (response.message === MessageResponses.SUCCESS.message) {
      console.debug("Workspace added successfully, refreshing list");
      Popup.listWorkspaces(await getWorkspaces());
   }
   else {
      console.error("Workspace could not be added");
      console.error(response.message);
   }
}

/**
 * 
 * @param {chrome.windows.window} window 
 */
async function windowRemoved(window) {
   console.debug("windowRemoved", window);
   Popup.listWorkspaces(await getWorkspaces());
}

/**
 * 
 * @returns {Promise<WorkspaceStorage>}
 */
async function getWorkspaces() {
   let response = await chrome.runtime.sendMessage({ type: Messages.MSG_GET_WORKSPACES });
   if (response === undefined) {
      console.error("Response was undefined");
      return;
   }
   if (response.data == null || response.data === undefined) {
      console.error("Response data was undefined");
      return;
   }
   console.debug("getWorkspaces response", response);
   return StorageHelper.workspacesFromJson(response.data);
}

/**
 * This is the entry point for the popup.
 * When the DOM is loaded, call the documentLoaded function, to keep things clean.
 */
(async function () { document.addEventListener("DOMContentLoaded", documentLoaded); })();
