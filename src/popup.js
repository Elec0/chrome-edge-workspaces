/*
Removed from manifest
  "background": {
    "service_worker": "background.js"
  },

*/
import './popup.css';
import { testSetup } from './storage-example.js';
import { StorageHelper } from "./storage-helper";

(async function () {

   chrome.windows.onCreated.addListener(function (window) {
      console.log("window created");
      console.log(window);
   });

   chrome.windows.onRemoved.addListener(function (windowId) {
      console.log("window removed");
      console.log(windowId);
   });


   // We will make use of Storage API to get and store `count` value
   // More information on Storage API can we found at
   // https://developer.chrome.com/extensions/storage

   // To get storage access, we have to mention it in `permissions` property of manifest.json file
   // More information on Permissions can we found at
   // https://developer.chrome.com/extensions/declare_permissions
   const counterStorage = {
      get: cb => {
         chrome.storage.sync.get(['count'], result => {
            cb(result.count);
         });
      },
      set: (value, cb) => {
         chrome.storage.sync.set(
            {
               count: value,
            },
            () => {
               cb();
            }
         );
      },
   };

   /**
    * This function is called when the popup is opened.
    * Setup the listeners for the buttons
    */
   async function documentLoaded() {
      document.getElementById('addBtn').addEventListener('click', async () => {
         // Present popup asking for workspace name
         const workspaceName = prompt('What is the name of your workspace?');

         await chrome.windows.create({
         }).then((window) => {
            console.log(`window created, adding to workspace ${workspaceName}`);
            console.log(window);
            StorageHelper.addWindowToWorkspace(window.id, workspaceName);
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

      });
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
