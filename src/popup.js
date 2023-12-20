/*
Removed from manifest  
*/
import "./popup.css";
import { StorageHelper } from "./storage-helper";
import { Constants } from "./constants/constants";
import { Workspace } from "./obj/workspace";
import { MessageResponses } from "./constants/message-responses";
import workspaceTemplate from "./templates/workspaceElemTemplate.html";
import { Utils } from "./utils";

/**
 * Renders a list of workspaces on the webpage.
 * @param {Map<Number, Workspace>} workspaces - A Map object containing the workspaces.
 * @throws {Error} If the workspaces parameter is not a Map object.
 */
function listWorkspaces(workspaces) {
   if (!(workspaces instanceof Map)) {
      throw new Error("workspaces parameter must be a Map object");
   }
   console.debug("listWorkspaces", workspaces)

   let workspaceDiv = document.getElementById("workspaces");
   workspaceDiv.innerHTML = "";

   // Create an unordered list and put it in the workspaceDiv
   let workspaceContainer = document.createElement("ul");
   workspaceDiv.appendChild(workspaceContainer);

   /**
    * Adds a workspace to the parent node.
    * @param {HTMLElement} parentNode - The parent node to which the workspace will be added.
    * @param {Object} workspace - The workspace object.
    * @param {string} workspace.name - The name of the workspace.
    */
   let _addWorkspace = (parentNode, workspace) => {
      const res = Utils.interpolateTemplate(workspaceTemplate, { workspaceName: workspace.name, workspaceId: workspace.id });
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = res;
      const workspaceElement = tempDiv.firstChild;
      if (parentNode instanceof Node) {
         parentNode.appendChild(workspaceElement);
      } else {
         throw new Error("parentNode must be a valid DOM node");
      }
   }

   for (let workspace of workspaces.values()) {
      console.debug(workspace);
      _addWorkspace(workspaceContainer, workspace);
   }

}

/**
 * This function is called when the popup is opened.
 * Setup the listeners for the buttons
 */
async function documentLoaded() {
   document.getElementById("addBtn").addEventListener("click", addWorkspaceButtonClicked);
   document.getElementById("clearStorage").addEventListener("click", clearStorageButtonClicked);

   listWorkspaces(await StorageHelper.getWorkspaces());
}

async function clearStorageButtonClicked() {
   await StorageHelper.clearAllData();
   listWorkspaces(await StorageHelper.getWorkspaces());
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
      type: Constants.MSG_NEW_WORKSPACE,
      payload: { workspaceName, windowId: window.id }
   });
   if (response === undefined) {
      console.error("Response was undefined");
      return;
   }
   
   if (response.message === MessageResponses.SUCCESS.message) {
      console.debug("Workspace added successfully, refreshing list");
      listWorkspaces(await StorageHelper.getWorkspaces());
   }
   else {
      console.error("Workspace could not be added");
      console.error(response.message);
   }
}

/**
 * This is the entry point for the popup.
 * When the DOM is loaded, call the documentLoaded function, to keep things clean.
 */
(async function () { document.addEventListener("DOMContentLoaded", documentLoaded); })();
