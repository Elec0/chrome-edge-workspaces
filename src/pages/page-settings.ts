import { BaseDialog } from "../dialogs/base-dialog";
import { VERSION } from "../globals";
import { LogHelper } from "../log-helper";
import { PopupActions } from "../popup-actions";
import SETTINGS_TEMPLATE from "../templates/settingsModalTemplate.html";
import { Utils } from "../utils";
import { Prompt } from "../utils/prompt";

/**
 * Represents the PageSettings class which extends the BaseDialog class.
 * This class provides functionality for opening the settings dialog and handling its events.
 */
export class PageSettings extends BaseDialog {
    /**
     * Opens the settings dialog.
     * This method creates the dialog element, attaches event listeners, and shows the dialog.
     */
    public static openSettings() {
        const dialog = Utils.interpolateTemplate(SETTINGS_TEMPLATE, {"version": VERSION});

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = dialog;

        const dialogElement = tempDiv.firstElementChild as HTMLDialogElement;
        const newWorkspaceFromWindowButton = dialogElement.querySelector("#modal-settings-new-workspace-from-window") as HTMLButtonElement;

        newWorkspaceFromWindowButton?.addEventListener("click", (e) => {
            PageSettings.clickNewWorkspaceFromWindowButton(e, dialogElement);
        });

        dialogElement.querySelector("#modal-settings-close")?.addEventListener("click", () => {
            PageSettings.cancelCloseDialog(dialogElement);
        });
        dialogElement.addEventListener("cancel", () => {
            PageSettings.cancelCloseDialog(dialogElement);
        });

        document.body.appendChild(dialogElement);
        document.querySelector("dialog")?.showModal();
    }

    /**
     * Create a new workspace with the tabs from the current window.
     * 
     * Note: This logic is duplicated from popup.js. It should be refactored into a shared function.
     */
    private static async clickNewWorkspaceFromWindowButton(e: MouseEvent, dialogElement: HTMLDialogElement): Promise<void> {
        e.preventDefault();
        // Present popup asking for workspace name
        const workspaceName = await Prompt.createPrompt("Enter a name for the new workspace");

        if (workspaceName === null) {
            console.debug("New workspace prompt cancelled");
            return;
        }
        // Get the current window ID
        const currentWindow = await chrome.windows.getCurrent();
        if (currentWindow === undefined || currentWindow.id === undefined) {
            console.error("Current window or id is undefined");
            LogHelper.errorAlert("Error creating new workspace. Check the console for more details.");
            return;
        }
        PopupActions.addNewWorkspaceFromWindow(workspaceName, currentWindow.id);
        PageSettings.cancelCloseDialog(dialogElement);
    }
}