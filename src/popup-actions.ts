import { LogHelper } from "./log-helper";
import { PopupMessageHelper } from "./messages/popup-message-helper";
import { Workspace } from './obj/workspace';
import { MessageResponse, MessageResponses } from "./constants/message-responses";
import { WorkspaceEntryLogic } from "./workspace-entry-logic";
import { StorageHelper } from "./storage-helper";
import { TabUtils } from "./utils/tab-utils";
import { getWorkspaceStorage } from "./popup";
import { Utils } from "./utils";
import { FeatureDetect } from "./utils/feature-detect";

/**
 * Actions that can be performed by the popup.
 */
export class PopupActions {

    public static async addNewWorkspaceFromWindow(workspaceName: string, windowId: number): Promise<void> {
        console.log("New workspace from window");
        const response = await PopupMessageHelper.sendAddNewWorkspaceFromWindow(workspaceName, windowId);
        this.handleNewWorkspaceResponse(response, windowId);
    }

    public static async addNewWorkspace(workspaceName: string, windowId: number): Promise<void> {
        const response = await PopupMessageHelper.sendAddNewWorkspace(workspaceName, windowId);
        this.handleNewWorkspaceResponse(response, windowId);
    }

    private static async handleNewWorkspaceResponse(response: MessageResponse, windowId: number): Promise<void> {
        if (response.message === MessageResponses.SUCCESS.message) {
            console.debug("Workspace added successfully, refreshing list");
            WorkspaceEntryLogic.listWorkspaces(await getWorkspaceStorage());
        }
        else {
            LogHelper.errorAlert("Workspace could not be added\n" + response.message);
            // Close the window
            chrome.windows.remove(windowId);
        }
    }

    /**
     * Open the provided workspace in a new window.
     * 
     * <ol>
     * <li>Send a message to the background script requesting the workspace data</li>
     * <li>Create a new window with workspace's tabs in the correct order</li>
     * <li>Tell the background script to update the workspace with the new windowId</li>
     * </ol>
     * @param workspaceToOpen -
     */
    public static async openWorkspace(workspaceToOpen: Workspace): Promise<void> {
        if (!workspaceToOpen) {
            console.error("Workspace is invalid!", "workspace:", workspaceToOpen);
            LogHelper.errorAlert("Error opening workspace. Check the console for more details.");
            return;
        }

        // Creating the window before we add tabs to it seems like it is messing up the active tab.
        // But we don't have to create the window first, as I originally thought.
        // So we will create the window after we have the tabs ready to go.
        const response = await PopupMessageHelper.sendGetWorkspace(workspaceToOpen.uuid);
        if (!response || response.message === MessageResponses.UNKNOWN_MSG.message) {
            console.error("Response returned invalid!", "response:", response);
            LogHelper.errorAlert("Error opening workspace. Check the console for more details.");
            return;
        }

        const workspace = Workspace.deserialize(response.data);

        // -------------
        // Check if workspace.windowId is an existing window
        const existingWindow = await Utils.getWindowById(workspace.windowId);

        if (existingWindow && existingWindow.id) {
            console.debug(`Workspace '${ workspace.name }' is already open in window ${ existingWindow.id }. Focusing...`);

            await Utils.focusWindow(existingWindow.id);
            return;
        }
        // -------------

        // Then we will open the tabs in the new window
        chrome.windows.create({
            focused: true,
            url: workspace.getTabs().map(tab => tab.url)
        }).then(async newWindow => {
            if (!newWindow?.id) {
                console.error("New window id is invalid!", "newWindow:", newWindow);
                LogHelper.errorAlert("Error opening workspace window. Check the console for more details.");
                return;
            }

            // The window should be created with the tabs in the correct order,
            // but now we need to update the newly created tabs to match the workspace tabs extra
            // data (active, pinned, etc).
            workspace.windowId = newWindow.id;
            await TabUtils.updateTabStubIdsFromTabs(workspace.getTabs(), newWindow.tabs as chrome.tabs.Tab[]);
            await TabUtils.updateNewWindowTabsFromTabStubs(workspace.getTabs());
            if (FeatureDetect.supportsTabGroups()) {
                await this.groupTabs(workspace);
            }

            // Update the workspace with the new windowId in storage
            const response = await PopupMessageHelper.sendOpenWorkspace(workspace.uuid, newWindow.id);

            if (!response || response.message === MessageResponses.UNKNOWN_MSG.message) {
                console.error("Response returned invalid!", "response:", response);
                LogHelper.errorAlert("Your changes might not be saved. Check the console for more details.");
                return;
            }
            // We don't need to do anything with the response, since all the data should now be in sync

        });
    }

    /**
     * Group the tabs in the workspace.
     * 
     * At this point the window is created with tabs in the correct order. 
     * We need to create the tab groups with the correct names and colors, and ensure tabs are in their associated groups.
     * But there is not a `tabGroups.create` method, so we need to create the tab groups with `chrome.tabs.group` initially, 
     * then update the tab groups with the correct names and colors.
     * 
     * The Tab objects have a groupId property that is used to associate them with a group from `Workspace.tabGroups`.
     * The groupId is the auto-generated ID from the last time the window was open, so we need to update the Tab objects with the new group IDs
     *  once the new groups are created.
     * 
     * Following that, we need to update the tab groups with the new group IDs. We can probably just clear the tab groups and re-save them.
     * 
     * @param workspace - 
     */
    public static async groupTabs(workspace: Workspace): Promise<void> {
        const tabGroups = workspace.getTabGroups();

        for (const tabGroupStub of tabGroups) {
            const tabIds = workspace.getTabs().filter(tab => tab.groupId === tabGroupStub.id).map(tab => tab.id);

            if (tabIds.length > 0) {
                const groupId = await chrome.tabs.group({
                    tabIds: tabIds,
                    createProperties: {
                        windowId: workspace.windowId
                    }
                });
                console.debug(`Grouped tabs ${ tabIds } into group ${ groupId }`);

                await chrome.tabGroups.update(groupId, {
                    title: tabGroupStub.title,
                    color: tabGroupStub.color as chrome.tabGroups.ColorEnum,
                    collapsed: tabGroupStub.collapsed
                });
                // Update the groupId for all tabs in this group
                workspace.getTabs().forEach(tab => {
                    if (tab.groupId === tabGroupStub.id) {
                        tab.groupId = groupId;
                    }
                });
                // Update the TabGroupStub with the new groupId
                tabGroupStub.id = groupId;
            }
        }
        // Clear the existing tab groups and re-save them with the new group IDs
        workspace.setTabGroups(tabGroups);
        await StorageHelper.setWorkspace(workspace);
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
