/*
Removed from manifest  
*/
import "./popup.css";
import { StorageHelper } from "./storage-helper";
import { Constants } from "./constants/constants";
import { Workspace } from "./obj/workspace";

(async function () {

   /**
    * This function is called when the popup is opened.
    * Setup the listeners for the buttons
    */
   async function documentLoaded() {
      document.getElementById("addBtn").addEventListener("click", addWorkspaceButtonClicked);
      document.getElementById("clearStorage").addEventListener("click", clearStorageButtonClicked);

      listWorkspaces(await StorageHelper.getWorkspaces());

   }

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
         let workspaceSpan = document.createElement("li");
         workspaceSpan.innerHTML = workspace.name;
         parentNode.appendChild(workspaceSpan)
      }

      for (let workspace of workspaces.values()) {
         console.debug(workspace);
         _addWorkspace(workspaceContainer, workspace);
      }

   }

   async function clearStorageButtonClicked() {
      await StorageHelper.clearAllData();
      listWorkspaces(await StorageHelper.getWorkspaces());
   }

   function addWorkspaceButtonClicked() {
      // Present popup asking for workspace name
      const workspaceName = prompt("What is the name of your workspace?");

      chrome.windows.create({})
         .then(async (window) => {
            console.log(`window created, adding to workspace ${workspaceName}`);

            let response = await chrome.runtime.sendMessage({
               type: Constants.MSG_NEW_WORKSPACE,
               payload: {
                  workspaceName,
                  windowId: window.id,
               }
            })
               // .then(async response => {

               //    console.log("background response: ", response);
               //    listWorkspaces(await StorageHelper.getWorkspaces());
               
               // });
            console.log("background response: ", response);
         });
      // Create new window, passing in the workspaceName as a custom property
      // chrome.windows.create({
      //    url: "https://www.google.com",
      //    type: "popup",
      //    width: 800,
      //    height: 600,
      //    focused: true,
      //    state: "normal",
      //    incognito: false,
      //    tabId: 1,
      //    workspaceName,
      // });
   }


   function restoreCounter() {
      console.log("restoreCounter");
      chrome.tabs.query({}, tabs => {
         console.log(tabs);
      });
      chrome.tabGroups.query({}, tabGroups => {
         console.log(tabGroups);
      });
      chrome.windows.getAll({}, windows => {
         console.log(windows);
      });
   }

   document.addEventListener("DOMContentLoaded", documentLoaded);

   // Communicate with background file by sending a message
   // chrome.runtime.sendMessage(
   //   {
   //     type: "GREETINGS",
   //     payload: {
   //       message: "Hello, my name is Pop. I am from Popup.",
   //     },
   //   },
   //   response => {
   //     console.log(response.message);
   //   }
   // );
})();
