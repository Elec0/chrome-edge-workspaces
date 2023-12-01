/*
Removed from manifest  
*/
import './popup.css';
import { StorageHelper } from "./storage-helper";
import { Constants } from "./constants";

(async function () {

   /**
    * This function is called when the popup is opened.
    * Setup the listeners for the buttons
    */
   async function documentLoaded() {
      document.getElementById('addBtn').addEventListener('click', addWorkspaceButtonClicked);
   
      // TODO: For some reason we're getting workspaces={0: {key: 0, value: {id: undefined, name: undefined, tabs: []}}}
      let workspaces = await StorageHelper.getWorkspaces(); 
      listWorkspaces(workspaces);

   }
   
   /**
    * Create a span element for each workspace in the list, inside the div with id="workspaces"
    * @param {*} workspaces 
    */
   async function listWorkspaces(workspaces) {
      console.log("listWorkspaces: ", workspaces);
      let workspaceDiv = document.getElementById("workspaces");
      workspaceDiv.innerHTML = "";
      for (let workspace of workspaces) {
         let workspaceSpan = document.createElement("span");
         workspaceSpan.innerHTML = workspace.name;
         workspaceDiv.appendChild(workspaceSpan);
      }

   }
   async function addWorkspaceButtonClicked() {
      // Present popup asking for workspace name
      const workspaceName = prompt('What is the name of your workspace?');

      await chrome.windows.create({
      }).then((window) => {
         console.log(`window created, adding to workspace ${workspaceName}`);

         chrome.runtime.sendMessage({
            type: Constants.MSG_NEW_WORKSPACE,
            payload: {
               workspaceName,
               windowId: window.id,
            },
         }, response => {
            console.log("background response: ", response);
         });

         console.log(window);
         
      });
      // Create new window, passing in the workspaceName as a custom property
      // chrome.windows.create({
      //    url: 'https://www.google.com',
      //    type: 'popup',
      //    width: 800,
      //    height: 600,
      //    focused: true,
      //    state: 'normal',
      //    incognito: false,
      //    tabId: 1,
      //    workspaceName,
      // });
   }

   function updateCounter({ type }) {
      counterStorage.get(count => {
         let newCount;

         if (type === 'INCREMENT') {
            newCount = count + 1;
         } else if (type === 'DECREMENT') {
            newCount = count - 1;
         } else {
            newCount = count;
         }

         counterStorage.set(newCount, () => {
            document.getElementById('counter').innerHTML = newCount;

            // Communicate with content script of
            // active tab by sending a message
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
               const tab = tabs[0];

               chrome.tabs.sendMessage(
                  tab.id,
                  {
                     type: 'COUNT',
                     payload: {
                        count: newCount,
                     },
                  },
                  response => {
                     console.log('Current count value passed to contentScript file');
                  }
               );
            });
         });
      });
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

   // testSetup();

   document.addEventListener('DOMContentLoaded', documentLoaded);

   // StorageHelper.setValue("test", "testValue");

   // console.log(StorageHelper.getValue("test"));

   // Communicate with background file by sending a message
   // chrome.runtime.sendMessage(
   //   {
   //     type: 'GREETINGS',
   //     payload: {
   //       message: 'Hello, my name is Pop. I am from Popup.',
   //     },
   //   },
   //   response => {
   //     console.log(response.message);
   //   }
   // );
})();
