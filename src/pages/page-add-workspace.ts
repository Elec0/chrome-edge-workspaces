import { BaseDialog } from "../dialogs/base-dialog";
import { Utils } from "../utils";
import ADD_WORKSPACE_TEMPLATE from "../templates/dialogAddWorkspaceTemplate.html";
import { Prompt } from "../utils/prompt";
import { LogHelper } from "../log-helper";
import { PopupActions } from "../popup-actions";


export class PageAddWorkspace extends BaseDialog {
    /**
     * Open the add new workspace dialog.
     */
    public async open(): Promise<void> {

        const dialog = Utils.interpolateTemplate(ADD_WORKSPACE_TEMPLATE, { "": "" });

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = dialog;

        const dialogElement = tempDiv.firstElementChild as HTMLDialogElement;
        const newWorkspaceButton = dialogElement.querySelector("#modal-new-workspace") as HTMLButtonElement;
        const newWorkspaceFromWindowButton = dialogElement.querySelector("#modal-new-workspace-from-window") as HTMLButtonElement;

        newWorkspaceButton?.addEventListener("click", (e) => {
            this.clickNewWorkspaceButton(e, dialogElement);
        });

        newWorkspaceFromWindowButton?.addEventListener("click", (e) => {
            this.clickNewWorkspaceFromWindowButton(e, dialogElement);
        });

        // Close the dialog when the close button is clicked, or when the dialog is cancelled (esc).
        dialogElement.querySelector("#modal-settings-close")?.addEventListener("click", () => {
            BaseDialog.cancelCloseDialog(dialogElement);
        });
        dialogElement.addEventListener("cancel", () => {
            BaseDialog.cancelCloseDialog(dialogElement);
        });

        document.body.appendChild(dialogElement);
        document.querySelector("dialog")?.showModal();
    }

    /**
     * Create a new workspace in a new window.
     * Get the name of the new workspace from the user, then create a new window and add it to the workspace.
     */
    private async clickNewWorkspaceButton(e: MouseEvent, dialogElement: HTMLDialogElement): Promise<void> {
        e.preventDefault();

        const workspaceData = await this.promptForWorkspaceName();
        if (!workspaceData) {
            return;
        }

        const window = await chrome.windows.create({});
        if (window.id === undefined) {
            console.error("New window ID is undefined");
            LogHelper.errorAlert("Error creating new workspace. Check the console for more details.");
            return;
        }

        console.log(`window created, adding to workspace ${ workspaceData[0] }`);

        PopupActions.addNewWorkspace(workspaceData[0], window.id);
        BaseDialog.cancelCloseDialog(dialogElement);
    }

     /**
     * Create a new workspace with the tabs from the current window.
     */
     private async clickNewWorkspaceFromWindowButton(e: MouseEvent, dialogElement: HTMLDialogElement): Promise<void> {
        e.preventDefault();
        const workspaceData = await this.promptForWorkspaceName();
        if (!workspaceData) {
            return;
        }
        PopupActions.addNewWorkspaceFromWindow(workspaceData[0], workspaceData[1]);
        BaseDialog.cancelCloseDialog(dialogElement);
    }
    
    /**
     * Prompts the user to enter a name for a new workspace.
     * 
     * @returns A promise that resolves to an array containing the workspace name and the current window ID,
     *          or undefined if the prompt was cancelled or an error occurred.
     */
    private async promptForWorkspaceName(): Promise<[string, number] | undefined> {
        // Present popup asking for workspace name
        const workspaceName = await Prompt.createPrompt("Enter a name for the new workspace");

        if (workspaceName === null) {
            console.debug("New workspace prompt cancelled");
            return;
        }
        if (workspaceName === "") {
            LogHelper.errorAlert("Workspace name cannot be empty");
            return;
        }
        // Get the current window ID
        const currentWindow = await chrome.windows.getCurrent();
        if (currentWindow === undefined || currentWindow.id === undefined) {
            console.error("Current window or id is undefined");
            LogHelper.errorAlert("Error creating new workspace. Check the console for more details.");
            return;
        }
        return [workspaceName, currentWindow.id];
    }
}