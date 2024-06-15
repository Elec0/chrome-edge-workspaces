
export class BaseDialog {

    protected static cancelCloseDialog(dialogElement: HTMLDialogElement, resolve?: (value: string | null) => void) {
        if (resolve) {
            resolve(null);
        }
        dialogElement.close();
        dialogElement.remove();
    }
}