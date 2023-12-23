import { Workspace } from "./obj/workspace";
import { Utils } from "./utils";
import { WorkspaceStorage } from "./workspace-storage";
import WORKSPACE_TEMPLATE from "./templates/workspaceElemTemplate.html";
import { Actions } from "./actions";

export class Popup {

    public static listWorkspaces(workspaces: WorkspaceStorage) {
        console.debug("listWorkspaces", workspaces)

        let workspaceDiv = document.getElementById("workspaces");
        if (!workspaceDiv) {
            console.error("Could not find workspace div");
            return;
        }
        workspaceDiv.innerHTML = "";

        // Create an unordered list and put it in the workspaceDiv
        let workspaceContainer = document.createElement("ul");
        workspaceDiv.appendChild(workspaceContainer);

        for (let workspace of Array.from(workspaces.values())) {
            const workspaceElement = this.addWorkspace(workspaceContainer, workspace);
            const openWorkspace = workspaceElement.querySelector('.workspace-button');
            const settingsWorkspace = workspaceElement.querySelector('.settings-button');

            openWorkspace?.addEventListener('click', () => {
                this.workspaceClicked(workspace);
            });

            settingsWorkspace?.addEventListener('click', () => {
                this.workspaceSettingsClicked(workspace);
            });
        }
    }

    /**
    * Adds a workspace list item to the parent node.
    * @param parentNode - The parent node to which the workspace will be added.
    * @param workspace - The workspace object.
    */
    private static addWorkspace(parentNode: HTMLElement, workspace: Workspace): HTMLElement {
        const res = Utils.interpolateTemplate(WORKSPACE_TEMPLATE, {
            workspaceName: workspace.name, workspaceId: workspace.windowId,
            tabsCount: workspace.tabs.length
        });
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = res;
        const workspaceElement = tempDiv.firstElementChild as HTMLElement;

        if (parentNode instanceof Node && workspaceElement != null) {
            parentNode.appendChild(workspaceElement);
            return workspaceElement;
        }
        else {
            throw new Error("parentNode must be a valid DOM node");
        }
    }

    /**
     * Called when a workspace is clicked.
     * @param workspaceId 
     */
    public static workspaceClicked(workspace: Workspace) {
        Actions.openWorkspace(workspace);
    }

    /**
     * Called when a workspace's settings button is clicked.
     * @param workspaceId 
     */
    public static workspaceSettingsClicked(workspace: Workspace) {
        // Actions.openWorkspaceSettings(workspace.uuid);
    }

    public static async tabRemoved(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) {
    }

    public static async tabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) {
    }
}