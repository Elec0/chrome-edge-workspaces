import DIALOG_TEMPLATE from "./templates/dialogPopupTemplate.html";
import { Utils } from "./utils";

export class Prompt {
    /**
     * A utility function that creates a dialog prompt and returns a Promise. 
     * The Promise resolves with the input value when the form is submitted, 
     * and resolves with null when the cancel button is clicked.
     * 
     * @param dialogTemplate - The template for the dialog.
     * @param formSelector - The selector for the form element.
     * @param inputSelector - The selector for the input element.
     * @param cancelSelector - The selector for the cancel button.
     * @returns A Promise that resolves with the user's input value or null if canceled.
     */
    public static createPrompt(
        promptTitle: string,
        formSelector: string = "#modal-form",
        inputSelector: string = "#modal-input-name",
        cancelSelector: string = "#modal-cancel",
        dialogTemplate: string = DIALOG_TEMPLATE
    ): Promise<string | null> {
        return new Promise((resolve, reject) => {
            const dialog = Utils.interpolateTemplate(dialogTemplate, {prompt: promptTitle});

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = dialog;
            const dialogElement = tempDiv.firstElementChild as HTMLElement;

            const formElement = dialogElement.querySelector(formSelector);
            const inputElement = dialogElement.querySelector(inputSelector) as HTMLInputElement;
            const cancelButton = dialogElement.querySelector(cancelSelector);

            if (!formElement || !inputElement || !cancelButton) {
                reject('Missing required elements');
                return;
            }

            formElement.addEventListener("submit", (e) => {
                e.preventDefault();
                const inputValue = inputElement.value;
                document.querySelector("dialog")?.close();
                resolve(inputValue);
                // Remove the dialog from the DOM or it will persist after closing
                dialogElement.remove();
            });

            cancelButton.addEventListener("click", () => {
                document.querySelector("dialog")?.close();
                resolve(null);
                dialogElement.remove();
            });

            document.body.appendChild(dialogElement);
            document.querySelector("dialog")?.showModal();
        });
    }
}