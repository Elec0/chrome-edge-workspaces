"use strict";

import { MessageResponses } from "./constants/message-responses";
import { LogHelper } from "./log-helper";
import { PopupActions } from "./popup-actions";
import { PopupLogic } from "./popup-logic";
import { PopupMessageHelper } from "./popup-message-helper";
import "./popup.css";
import { StorageHelper } from "./storage-helper";
import { WorkspaceStorage } from "./workspace-storage";

/**
 * This function is called when the popup is opened.
 * Setup the listeners for the buttons
 */
async function documentLoaded() {
   chrome.tabs.onRemoved.addListener(PopupLogic.tabRemoved);
   chrome.tabs.onUpdated.addListener(PopupLogic.tabUpdated);
   chrome.windows.onRemoved.addListener(windowRemoved);

   document.getElementById("addWorkspace").addEventListener("click", addWorkspaceButtonClicked);
   document.getElementById("clearStorage").addEventListener("click", clearStorageButtonClicked);

   PopupLogic.listWorkspaces(await getWorkspaces());
}

async function clearStorageButtonClicked() {
   PopupActions.clearWorkspaceData();
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

   let response = await PopupMessageHelper.sendAddNewWorkspace(workspaceName, window.id);

   if (response.message === MessageResponses.SUCCESS.message) {
      console.debug("Workspace added successfully, refreshing list");
      PopupLogic.listWorkspaces(await getWorkspaces());
   }
   else {
      LogHelper.errorAlert("Workspace could not be added\n" + response.message);
      // Close the window
      chrome.windows.remove(window.id);
   }
}

/**
 * 
 * @param {chrome.windows.window} window 
 */
async function windowRemoved(window) {
   console.debug("Popup: windowRemoved", window);
   PopupLogic.listWorkspaces(await getWorkspaces());
}

/**
 * 
 * @returns {Promise<WorkspaceStorage>}
 */
async function getWorkspaces() {
   return StorageHelper.workspacesFromJson(await PopupMessageHelper.sendGetWorkspaces());
}

/**
 * This is the entry point for the popup.
 * When the DOM is loaded, call the documentLoaded function, to keep things clean.
 */
(async function () { document.addEventListener("DOMContentLoaded", documentLoaded); })();
