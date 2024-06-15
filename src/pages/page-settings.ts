import { BaseDialog } from "../dialogs/base-dialog";
import SETTINGS_TEMPLATE from "../templates/settingsModalTemplate.html";
import { Utils } from "../utils";

export class PageSettings extends BaseDialog {
    public static openSettings() {
        const dialog = Utils.interpolateTemplate(SETTINGS_TEMPLATE, {});

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = dialog;

        const dialogElement = tempDiv.firstElementChild as HTMLDialogElement;
        const newWorkspaceFromWindowButton = dialogElement.querySelector("#modal-settings-new-workspace-from-window") as HTMLButtonElement;

        newWorkspaceFromWindowButton?.addEventListener("click", (e) => {
            e.preventDefault();
            console.log("New workspace from window");
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
}