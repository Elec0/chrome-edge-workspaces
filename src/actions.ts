import { LogHelper } from "./log-helper";
import { PopupMessageHelper } from "./message-helper";
import { Workspace } from './obj/workspace';

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
     * @param workspace 
     */
    public static openWorkspace(workspace: Workspace): void {

        chrome.windows.create({}).then(async newWindow => {
            if (!workspace || !newWindow?.id) {
                return;
            }
            // Send a message to the background script that we are opening a workspace.uuid in the new windowId
            let response = await PopupMessageHelper.sendOpenWorkspace(workspace.uuid, newWindow.id);

            if (!response) {
                console.error("Response was undefined!", "response:", response);
                LogHelper.errorAlert("Error opening workspace. Check the console for more details.");
            }

            // Background script will update the workspace with the new windowId
            // Then it will respond with the most up-to-date version of the workspace
            let updatedWorkspace = Workspace.deserialize(response.data);

            // Then we will open the tabs in the new window
            updatedWorkspace.getTabs().forEach(tab => {
                chrome.tabs.create({ windowId: newWindow.id, url: tab.url, active: tab.active, pinned: tab.pinned, index: tab.index });
            });
        });
    }
}
