import { Constants } from "../constants/constants";
import { MessageResponse } from "../constants/message-responses";
import { BaseDialog } from "../dialogs/base-dialog";
import { VERSION } from "../globals";
import { LogHelper } from "../log-helper";
import { StorageHelper } from "../storage-helper";
import { BookmarkStorageHelper } from "../storage/bookmark-storage-helper";
import { SyncWorkspaceStorage } from "../storage/sync-workspace-storage";
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
    public static async openSettings() {
        const saveBookmarks = await BookmarkStorageHelper.isBookmarkSaveEnabled();
        const syncWorkspaces = await SyncWorkspaceStorage.isSyncSavingEnabled();
        const dialog = Utils.interpolateTemplate(SETTINGS_TEMPLATE, 
            {
                "version": VERSION,
                "bookmarkSaveChecked": saveBookmarks ? "checked" : "",
                "syncSaveChecked": syncWorkspaces ? "checked" : ""
            }
        );

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = dialog;

        const dialogElement = tempDiv.firstElementChild as HTMLDialogElement;

        dialogElement.querySelector("#modal-settings-export")?.addEventListener("click", () => {
            PageSettings.exportSettings();
        });
        dialogElement.querySelector("#modal-settings-import")?.addEventListener("click", () => {
            PageSettings.importSettings();
        });
        dialogElement.querySelector("#modal-settings-bookmark-save")?.addEventListener("click", async (event) => {
            const target = event.target as HTMLInputElement;
            await BookmarkStorageHelper.setBookmarkSaveEnabled(target.checked);
        });
        dialogElement.querySelector("#modal-settings-sync-save")?.addEventListener("click", async (event) => {
            const target = event.target as HTMLInputElement;
            await SyncWorkspaceStorage.setSyncSavingEnabled(target.checked);
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
     * Just a raw dump of the storage json data.
     */
    private static async exportSettings(): Promise<void> {
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

    /**
     * Prompt the user to import settings from a JSON file.
     * This method opens a file input dialog and reads the file contents.
     */
    private static async importSettings(): Promise<void> {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.style.display = "none";
        input.addEventListener("change", async () => {
            if (!input.files || input.files.length === 0) {
                return;
            }

            const file = input.files[0];
            const reader = new FileReader();
            console.debug("Importing file", file);
            reader.onload = async () => {
                try {
                    const data = JSON.parse(reader.result as string);
                    // if (data.version !== VERSION) {
                    //     throw new Error("Version mismatch");
                    // }

                    // Prompt the user to confirm if they are sure they want to import data, as it will overwrite all existing data.
                    const forSure = confirm("Importing settings will overwrite all existing settings. Are you sure you want to continue?");
                    if (!forSure) {
                        LogHelper.successAlert("Import cancelled");
                        return;
                    }

                    const parsed = await StorageHelper.workspacesFromJson(data as MessageResponse);
                    await StorageHelper.setWorkspaces(parsed);

                    LogHelper.successAlert("Settings imported successfully, reloading...");
                    window.location.reload();
                } catch (e) {
                    LogHelper.errorAlert("Error importing settings", e);
                }
            };
            reader.readAsText(file);
        });

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }
}