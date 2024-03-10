import { LogHelper } from "./log-helper";
import { PopupMessageHelper } from "./popup-message-helper";
import { Workspace } from './obj/workspace';
import { MessageResponses } from "./constants/message-responses";
import { WorkspaceEntryLogic } from "./workspace-entry-logic";
import { StorageHelper } from "./storage-helper";

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

    /**
     * Called when the clear workspace button is clicked.
     * 
     * Send a message to the background script to clear the workspace data.
     * Then update the workspace list.
     */
    public static clearWorkspaceData(): void {
        PopupMessageHelper.sendClearWorkspaces().then(async response => {
            if (response.message === MessageResponses.SUCCESS.message) {
                LogHelper.successAlert("Workspace data cleared.");
                WorkspaceEntryLogic.listWorkspaces(await StorageHelper.getWorkspaces());
            }
            else {
                LogHelper.errorAlert("Error clearing workspace data. Check the console for more details.");
            }
        });
    }

    /**
     * Called when the delete workspace button is clicked.
     * 
     * Send a message to the background script to delete the workspace.
     * Then update the workspace list.
     * @param workspace -
     */
    public static deleteWorkspace(workspace: Workspace): void {
        PopupMessageHelper.sendDeleteWorkspace(workspace.uuid).then(async response => {
            if (response.message === MessageResponses.SUCCESS.message) {
                console.log("Workspace deleted", workspace);
                WorkspaceEntryLogic.listWorkspaces(await StorageHelper.getWorkspaces());
            }
            else {
                LogHelper.errorAlert("Error deleting workspace. Check the console for more details.");
            }
        });
    }

    /**
     * Send a message to the background script to rename the workspace. The user has already entered the new name.
     * 
     * 2. Send a message to the background script to rename the workspace.
     * 3. Update the workspace list.
     * @param workspace -
     */
    public static renameWorkspace(workspace: Workspace, newName: string): void {
        PopupMessageHelper.sendRenameWorkspace(workspace.uuid, newName).then(async response => {
            if (response.message === MessageResponses.SUCCESS.message) {
                console.log("Workspace renamed", workspace);
                WorkspaceEntryLogic.listWorkspaces(await StorageHelper.getWorkspaces());
            }
            else {
                LogHelper.errorAlert("Error renaming workspace. Check the console for more details.");
            }
        });
    }
}
