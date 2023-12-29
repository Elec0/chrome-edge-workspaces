import { MessageResponse, MessageResponses } from "./constants/message-responses";
import { Messages } from "./constants/messages";

export class MessageHelper {

    public static async sendAddNewWorkspace(workspaceName: string, windowId: number): Promise<MessageResponse> {
        let response = await chrome.runtime.sendMessage({
            type: Messages.MSG_NEW_WORKSPACE,
            payload: { workspaceName, windowId: windowId }
        });

        if (response === undefined) {
            console.error("Response was undefined");
            return MessageResponses.ERROR;
        }

        return response;
    }
}