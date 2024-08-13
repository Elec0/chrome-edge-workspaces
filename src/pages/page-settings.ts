import { Constants } from "../constants/constants";
import { BaseDialog } from "../dialogs/base-dialog";
import { VERSION } from "../globals";
import { StorageHelper } from "../storage-helper";
import SETTINGS_TEMPLATE from "../templates/dialogSettingsTemplate.html";
import { Utils } from "../utils";

/**
 * Represents the PageSettings class which extends the BaseDialog class.
 * This class provides functionality for opening the settings dialog and handling its events.
 */
export class PageSettings extends BaseDialog {

    public open(): void {
        PageSettings.openSettings();
    }

    /**
     * Opens the settings dialog.
     * This method creates the dialog element, attaches event listeners, and shows the dialog.
     */
    public static openSettings() {
        const dialog = Utils.interpolateTemplate(SETTINGS_TEMPLATE, {"version": VERSION});

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = dialog;

        const dialogElement = tempDiv.firstElementChild as HTMLDialogElement;

        dialogElement.querySelector("#modal-settings-export")?.addEventListener("click", () => {
            PageSettings.exportSettings();
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
     * Exports the settings to a JSON file.
     */
    public static async exportSettings() {
        const data = await StorageHelper.getRawWorkspaces();

        const toExport = {
            "version": VERSION,
            data
        };

        console.info("Exporting settings");

        const settingsBlob = new Blob([JSON.stringify(toExport)], {type: "application/json"});
        const settingsURL = URL.createObjectURL(settingsBlob);

        const a = document.createElement("a");
        a.href = settingsURL;
        a.download = Constants.DOWNLOAD_FILENAME;
        a.click();
    }
}