import { LogHelper } from "./log-helper";
import { PopupMessageHelper } from "./popup-message-helper";
import { Workspace } from './obj/workspace';
import { MessageResponses } from "./constants/message-responses";

/**
 * Actions that can be performed by the popup.
 */
export class PopupActions {

    /**
     * Open the provided workspace in a new window.
     * 
     * <ol>
     * <li>Create a new window</li>
     * <li>Send a message to the background script that we are opening a workspace.uuid in the new windowId</li>
     * <li>Background script will update the workspace with the new windowId</li>
     * <li>Then it will respond with the most up-to-date version of the workspace</li>
     * <li>Then we will open the tabs in the new window</li>
     * </ol>
     * @param workspace -
     */
    public static openWorkspace(workspace: Workspace): void {

        chrome.windows.create({}).then(async newWindow => {
            if (!workspace || !newWindow?.id) {
                return;
            }
            // Send a message to the background script that we are opening a workspace.uuid in the new windowId
            const response = await PopupMessageHelper.sendOpenWorkspace(workspace.uuid, newWindow.id);

            if (!response || response.message === MessageResponses.UNKNOWN_MSG.message) {
                console.error("Response returned invalid!", "response:", response);
                LogHelper.errorAlert("Error opening workspace. Check the console for more details.");
                return;
            }

            // Background script will update the workspace with the new windowId
            // Then it will respond with the most up-to-date version of the workspace
            const updatedWorkspace = Workspace.deserialize(response.data);

            // Then we will open the tabs in the new window
            updatedWorkspace.getTabs().forEach(tab => {
                chrome.tabs.create({ 
                    windowId: newWindow.id, 
                    url: tab.url, 
                    active: tab.active as boolean | undefined, 
                    pinned: tab.pinned as boolean | undefined, 
                    index: tab.index as number | undefined 
                });
            });

            // The window is created with a single new tab, so we need to remove it.
            chrome.tabs.remove(newWindow.tabs?.[0].id as number);
        });
    }    
}
