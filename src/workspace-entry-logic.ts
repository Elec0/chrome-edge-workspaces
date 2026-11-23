import { Workspace } from "./obj/workspace";
import { PopupActions } from "./popup-actions";
import { Prompt } from "./utils/prompt";
import DELETE_WORKSPACE_DIALOG_TEMPLATE from "./templates/deleteWorkspaceDialogTemplate.html";
import WORKSPACE_TEMPLATE from "./templates/workspaceElemTemplate.html";
import { Utils } from "./utils";
import { WorkspaceStorage } from "./workspace-storage";

/**
 * Logic for the workspace entry in the popup.
 */
export class WorkspaceEntryLogic {

    public static listWorkspaces(workspaces: WorkspaceStorage, allWindowIds: (number | undefined)[]) {
        console.debug("listWorkspaces", workspaces)

        const workspaceDiv = document.getElementById("workspaces-list");
        if (!workspaceDiv) {
            console.error("Could not find workspace div");
            return;
        }
        workspaceDiv.innerHTML = "";
        
        // Add each workspace to the list, and add event listeners to the buttons.
        for (const workspace of Array.from(workspaces.values())) {
            const workspaceElement = this.addWorkspace(workspaceDiv, workspace);
            const openWorkspace = workspaceElement.querySelector('.workspace-item-interior');
            // const settingsWorkspace = workspaceElement.querySelector('#settings-button');
            const editWorkspace = workspaceElement.querySelector('#edit-button');
            const deleteWorkspace = workspaceElement.querySelector('#delete-button');

            // Add a class to the workspace if it is open in a window.
            if (allWindowIds.includes(workspace.windowId)) {
                workspaceElement.classList.add('workspace-open');
            }
            openWorkspace?.addEventListener('click', () => {
                this.workspaceClicked(workspace);
            });

            editWorkspace?.addEventListener('click', (event) => {
                event.stopPropagation();
                this.workspaceEditClicked(workspace);
            });

            deleteWorkspace?.addEventListener('click', (event) => {
                event.stopPropagation();
                this.workspaceDeleteClicked(workspace);
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
            tabsCount: workspace.getTabs().length
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
     * @param workspaceId -
     */
    public static workspaceClicked(workspace: Workspace) {
        PopupActions.openWorkspace(workspace);
    }

    /**
     * Called when a workspace's settings button is clicked.
     * @param workspaceId -
     */
    public static workspaceSettingsClicked(workspace: Workspace) {
        console.debug("workspaceSettingsClicked", workspace);
        // Actions.openWorkspaceSettings(workspace.uuid);
    }

    /**
     * Called when a workspace's edit button is clicked.
     * 
     * Start the process of renaming the workspace:
     * 1. Prompt the user for a new name.
     * 2. Send a message to the background script to rename the workspace.
     * 3. Update the workspace list.
     * @param workspaceId -
     */
    public static async workspaceEditClicked(workspace: Workspace) {
        console.debug("workspaceEditClicked", workspace);
        const newName = await Prompt.createPrompt("Enter a new name for the workspace");
        if (newName === null || newName === "" || newName === workspace.name) {
            console.info("User canceled or entered the same name");
            return;
        }
        PopupActions.renameWorkspace(workspace, newName);
    }

    /**
     * Called when a workspace's delete button is clicked.
     * @param workspace - The workspace to delete if the user confirms.
     */
    public static workspaceDeleteClicked(workspace: Workspace) {
        const template = document.createElement("template");
        template.innerHTML = DELETE_WORKSPACE_DIALOG_TEMPLATE;
        const dialog = template.content.querySelector("dialog")!;
        dialog.querySelector("#delete-workspace-message")!.textContent =
            `Are you sure you want to delete the workspace "${ workspace.name }"?`;

        dialog.addEventListener("close", () => {
            dialog.remove();
            if (dialog.returnValue === "delete") {
                PopupActions.deleteWorkspace(workspace);
            }
        }, { once: true });

        document.body.appendChild(dialog);
        dialog.showModal();
    }
}
