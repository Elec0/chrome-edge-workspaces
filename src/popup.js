"use strict";

import { MessageResponses } from "./constants/message-responses";
import { LogHelper } from "./log-helper";
import { PopupActions } from "./popup-actions";
import { WorkspaceEntryLogic } from "./workspace-entry-logic";
import { PopupMessageHelper } from "./popup-message-helper";
import "./popup.css";
import { Prompt } from "./prompt";
import { StorageHelper } from "./storage-helper";
import { WorkspaceStorage } from "./workspace-storage";

/**
 * This function is called when the popup is opened.
 * Setup the listeners for the buttons
 */
async function documentLoaded() {
   chrome.tabs.onRemoved.addListener(WorkspaceEntryLogic.tabRemoved);
   chrome.tabs.onUpdated.addListener(WorkspaceEntryLogic.tabUpdated);
   chrome.windows.onRemoved.addListener(windowRemoved);

   document.getElementById("addWorkspace").addEventListener("click", addWorkspaceButtonClicked);
   document.getElementById("settings-button").addEventListener("click", settingsButtonClicked);
   document.getElementById("clearStorage").addEventListener("click", clearStorageButtonClicked);

   WorkspaceEntryLogic.listWorkspaces(await getWorkspaces());
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
   const workspaceName = await Prompt.createPrompt("Enter a name for the new workspace");

   let window = await chrome.windows.create({});

   console.log(`window created, adding to workspace ${workspaceName}`);

   let response = await PopupMessageHelper.sendAddNewWorkspace(workspaceName, window.id);

   if (response.message === MessageResponses.SUCCESS.message) {
      console.debug("Workspace added successfully, refreshing list");
      WorkspaceEntryLogic.listWorkspaces(await getWorkspaces());
   }
   else {
      LogHelper.errorAlert("Workspace could not be added\n" + response.message);
      // Close the window
      chrome.windows.remove(window.id);
   }
}

async function settingsButtonClicked() {
   
}

/**
 * 
 * @param {chrome.windows.window} window 
 */
async function windowRemoved(window) {
   console.debug("Popup: windowRemoved", window);
   WorkspaceEntryLogic.listWorkspaces(await getWorkspaces());
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
