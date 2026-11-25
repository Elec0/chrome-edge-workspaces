"use strict";

import { PopupMessageHelper } from "./messages/popup-message-helper";
import { Constants } from "./constants/constants";
import { PageAddWorkspace } from "./pages/page-add-workspace";
import { PageSettings } from "./pages/page-settings";
import "./popup.css";
import { StorageHelper } from "./storage-helper";
import { DebugStorageHelper } from "./storage/debug-storage-helpet";
import { Utils } from "./utils";
import { WorkspaceEntryLogic } from "./workspace-entry-logic";
import { WorkspaceStorage } from "./workspace-storage";

/**
 * Initialize the workspace list and bind the popup controls.
 */
async function documentLoaded() {
   chrome.windows.onRemoved.addListener(windowRemoved);
   const updateDebugVisibility = async () => {
      document.body.toggleAttribute("data-debug-tools", await DebugStorageHelper.isDebugEnabled());
   };
   // Reflect changes from Settings while the popup or sidebar stays open.
   chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && Constants.STORAGE_KEYS.settings.debug in changes) {
         void updateDebugVisibility();
      }
   });
   void updateDebugVisibility();
   const workspaceStorage = await getWorkspaceStorage();
   
   document.getElementById("addWorkspace").addEventListener("click", addWorkspaceButtonClicked);
   document.getElementById("settings-button").addEventListener("click", settingsButtonClicked);
   document.getElementById("workspace-reorder-toggle").addEventListener("click", () => WorkspaceEntryLogic.toggleReorder());
   document.addEventListener("keydown", activateIconFromKeyboard);

   WorkspaceEntryLogic.listWorkspaces(workspaceStorage, await Utils.getAllWindowIds());
}

/** Use the click handlers for keyboard activation so row actions retain their propagation behavior. */
function activateIconFromKeyboard(event) {
   const icon = event.target;
   if (!(icon instanceof HTMLElement) || !icon.matches('.material-icons.icon-button[role="button"]')) return;
   if (event.key !== "Enter" && event.key !== " ") return;

   event.preventDefault();
   if (!event.repeat) icon.click();
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
 * Present a popup asking for confirmation, then clear all workspace data.
 */
async function settingsButtonClicked() {
   const pageSettings = new PageSettings();
   pageSettings.open();
}

/**
 * Refresh the list and its open-state indicators when a window closes.
 * @param {number} window The closed window's ID.
 */
async function windowRemoved(window) {
   console.debug("Popup: windowRemoved", window);
   WorkspaceEntryLogic.listWorkspaces(await getWorkspaceStorage(), await Utils.getAllWindowIds());
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
