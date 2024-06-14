import SETTINGS_TEMPLATE from "../templates/settingsModalTemplate.html";
import { Utils } from "../utils";

export class PageSettings {
    public static openSettings() {
        const dialog = Utils.interpolateTemplate(SETTINGS_TEMPLATE, {});

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = dialog;
        const dialogElement = tempDiv.firstElementChild as HTMLElement;

        // const formElement = dialogElement.querySelector(formSelector);
        // const inputElement = dialogElement.querySelector(inputSelector) as HTMLInputElement;
        // const cancelButton = dialogElement.querySelector(cancelSelector);
    }
}