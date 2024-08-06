
/**
 * Represents a base dialog.
 */
export abstract class BaseDialog {

    public abstract open(): void;

    /**
     * Closes the dialog and optionally resolves a value.
     * @param dialogElement - The HTML dialog element.
     * @param resolve - Optional. A callback function to resolve a value.
     */
    protected static cancelCloseDialog(dialogElement: HTMLDialogElement, resolve?: (value: string | null) => void) {
        if (resolve) {
            resolve(null);
        }
        dialogElement.close();
        dialogElement.remove();
    }
}