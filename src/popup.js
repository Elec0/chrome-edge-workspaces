"use strict";

import { PopupMessageHelper } from "./messages/popup-message-helper";
import { PageAddWorkspace } from "./pages/page-add-workspace";
import { PageSettings } from "./pages/page-settings";
import "./popup.css";
import { StorageHelper } from "./storage-helper";
import { WorkspaceEntryLogic } from "./workspace-entry-logic";
import { WorkspaceStorage } from "./workspace-storage";

/**
 * This function is called when the popup is opened.
 * Setup the listeners for the buttons
 */
async function documentLoaded() {
   chrome.tabs.onRemoved.addListener(WorkspaceEntryLogic.tabRemoved);
   chrome.tabs.onUpdated.addListener(WorkspaceEntryLogic.tabUpdated);
   chrome.windows.onRemoved.addListener(windowRemoved);
   const workspaceStorage = await getWorkspaceStorage();
   const curWindow = await chrome.windows.getCurrent();

   // Check if the popup is opened from a workspace or not
   const isWorkspace = isWindowWorkspace(curWindow.id, workspaceStorage);
   console.debug("Window is workspace:", isWorkspace, curWindow);
   
   if (isWorkspace) {
      loadWorkspacePopup(workspaceStorage, curWindow.id);
   }
   else {
      loadNonWorkspacePopup(workspaceStorage);
   }
}

/**
 * Load the popup page for a non0workspace window.
 */
async function loadNonWorkspacePopup(workspaceStorage) {
   document.getElementById("addWorkspace").addEventListener("click", addWorkspaceButtonClicked);
   document.getElementById("settings-button").addEventListener("click", settingsButtonClicked);

   WorkspaceEntryLogic.listWorkspaces(workspaceStorage);
}

/**
 * Load the popup page for a workspace window.
 * Highlight the current workspace name, and do nothing if the workspace is clicked.
 * @param {WorkspaceStorage} workspaceStorage
 * @param {number} curWindowId
 */
async function loadWorkspacePopup(workspaceStorage, curWindowId) {
   console.log("Loading workspace popup")
   document.getElementById("addWorkspace").style.display = "none";
   document.getElementById("settings-button").style.display = "none";

   WorkspaceEntryLogic.listWorkspaces(workspaceStorage, workspaceStorage.get(curWindowId));
}

/**
 * Present a popup asking for the workspace name, then create a new window and add it to the workspaces.
 * @returns {Promise<void>}
 */
async function addWorkspaceButtonClicked() {
   const pageAddWorkspace = new PageAddWorkspace();
   pageAddWorkspace.open();
}

/**
 * Check if the window is a workspace window.
 * @param {number} windowId
 * @param {WorkspaceStorage} workspaceStorage
 * @returns {boolean}
 */
function isWindowWorkspace(windowId, workspaceStorage) {
   return workspaceStorage.get(windowId) !== undefined;
}

/**
 * Present a popup asking for confirmation, then clear all workspace data.
 */
async function settingsButtonClicked() {
   const pageSettings = new PageSettings();
   pageSettings.open();
   
   // Open basic javascript ok cancel prompt
   // if (confirm("Clear all workspace data?")) {
   //    PopupActions.clearWorkspaceData();
   // }
}

/**
 * 
 * @param {chrome.windows.window} window 
 */
async function windowRemoved(window) {
   console.debug("Popup: windowRemoved", window);
   WorkspaceEntryLogic.listWorkspaces(await getWorkspaceStorage());
}

/**
 * Get the full workspace storage object from the background script
 * @returns {Promise<WorkspaceStorage>}
 */
export async function getWorkspaceStorage() {
   return StorageHelper.workspacesFromJson(await PopupMessageHelper.sendGetWorkspaces());
}

/**
 * This is the entry point for the popup.
 * When the DOM is loaded, call the documentLoaded function, to keep things clean.
 */
(async function () { document.addEventListener("DOMContentLoaded", documentLoaded); })();
