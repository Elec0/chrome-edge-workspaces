import { MessageResponse, MessageResponses } from "../constants/message-responses";
import { Messages } from "../constants/messages";
import { IRequestWithUuid, IRequestWithNameId, IRequestOpenWorkspace, IRequest } from "../interfaces/messages";
import { LogHelper } from "../log-helper";

export class PopupMessageHelper {
    public static async sendAddNewWorkspaceFromWindow(workspaceName: string, windowId: number): Promise<MessageResponse> {
        const message: IRequestWithNameId = {
            type: Messages.MSG_NEW_WORKSPACE_FROM_WINDOW,
            payload: { workspaceName, windowId: windowId }
        };

        return PopupMessageHelper.doSendMessage(message);
    }

    public static async sendAddNewWorkspace(workspaceName: string, windowId: number): Promise<MessageResponse> {
        const message: IRequestWithNameId = {
            type: Messages.MSG_NEW_WORKSPACE,
            payload: { workspaceName, windowId: windowId }
        };

        return PopupMessageHelper.doSendMessage(message);
    }

    public static async sendOpenWorkspace(workspaceUuid: string, windowId: number): Promise<MessageResponse> {
        const message: IRequestOpenWorkspace = {
            type: Messages.MSG_OPEN_WORKSPACE,
            payload: { uuid: workspaceUuid, windowId: windowId }
        };
        
        return PopupMessageHelper.doSendMessage(message);
    }

    /**
     * Sends a message to get workspaces and returns the response.
     * @returns A Promise that resolves to a MessageResponse object that should contain the workspaces.
     */
    public static async sendGetWorkspaces(): Promise<MessageResponse> {
        const response = await chrome.runtime.sendMessage({
            type: Messages.MSG_GET_WORKSPACES,
            payload: {}
        });

        if (response === undefined) {
            LogHelper.errorAlert("Error getting workspaces. Check the console for more details.");
            console.error("Response was undefined");
            return MessageResponses.ERROR;
        }
        if (response.data == null || response.data === undefined) {
            LogHelper.errorAlert("Error getting workspaces. Check the console for more details.");
            console.error("Response data was undefined");
            return MessageResponses.ERROR;
        }
        console.debug("getWorkspaces response", response);
        return response;
    }

    public static async sendGetWorkspace(workspaceUuid: string): Promise<MessageResponse> {
        const message = {
            type: Messages.MSG_GET_WORKSPACE,
            payload: { uuid: workspaceUuid }
        };

        return PopupMessageHelper.doSendMessage(message);
    }

    /**
     * Sends a message to clear workspaces.
     * @returns A promise that resolves to a MessageResponse.
     */
    public static async sendClearWorkspaces(): Promise<MessageResponse> {
        const message = {
            type: Messages.MSG_CLEAR_WORKSPACES,
            payload: {}
        };

        return PopupMessageHelper.doSendMessage(message);
    }

    /**
     * Sends a message to delete a workspace.
     * @param workspaceUuid - The UUID of the workspace to delete.
     * @returns A promise that resolves to a MessageResponse.
     */
    public static async sendDeleteWorkspace(workspaceUuid: string): Promise<MessageResponse> {
        const message: IRequestWithUuid = {
            type: Messages.MSG_DELETE_WORKSPACE,
            payload: { uuid: workspaceUuid }
        };
        
        return PopupMessageHelper.doSendMessage(message);
    }

    public static async sendRenameWorkspace(workspaceUuid: string, newName: string): Promise<MessageResponse> {
        const message = {
            type: Messages.MSG_RENAME_WORKSPACE,
            payload: { uuid: workspaceUuid, newName: newName }
        };

        return PopupMessageHelper.doSendMessage(message);
    }

    /**
     * Sends a message to the background script using the Chrome runtime API.
     * @param message - The message to send.
     * @returns A promise that resolves to the response from the background script.
     */
    private static async doSendMessage(message: IRequest): Promise<MessageResponse> {
        const response = await chrome.runtime.sendMessage(message);

        if (response === undefined) {
            console.error("Response was undefined");
            return MessageResponses.ERROR;
        }

        return response;
    }
}