import { MessageResponse, MessageResponses } from "./constants/message-responses";
import { Messages } from "./constants/messages";
import { IRequestWithUuid, IRequestNewWorkspace, IRequestOpenWorkspace } from "./interfaces/messages";
import { LogHelper } from "./log-helper";

export class PopupMessageHelper {

    public static async sendAddNewWorkspace(workspaceName: string, windowId: number): Promise<MessageResponse> {
        const message: IRequestNewWorkspace = {
            type: Messages.MSG_NEW_WORKSPACE,
            payload: { workspaceName, windowId: windowId }
        };
        const response = await chrome.runtime.sendMessage(message);

        if (response === undefined) {
            console.error("Response was undefined");
            return MessageResponses.ERROR;
        }

        return response;
    }

    public static async sendOpenWorkspace(workspaceUuid: string, windowId: number): Promise<MessageResponse> {
        const message: IRequestOpenWorkspace = {
            type: Messages.MSG_OPEN_WORKSPACE,
            payload: { uuid: workspaceUuid, windowId: windowId }
        };
        const response = await chrome.runtime.sendMessage(message);

        if (response === undefined) {
            console.error("Response was undefined");
            return MessageResponses.ERROR;
        }

        return response;
    }

    /**
     * Sends a message to get the current window id and returns the response.
     * @returns A Promise that resolves to a MessageResponse object that should contain the window
     * id of the current window.
     * @see BackgroundMessageHandlers.processGetWindowId
     */
    public static async sendGetWindowId(): Promise<MessageResponse> {
        const response = await chrome.runtime.sendMessage({
            type: Messages.MSG_GET_WINDOW_ID,
            payload: {}
        });

        if (response === undefined) {
            console.error("Response was undefined");
            return MessageResponses.ERROR;
        }

        return response;
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
        const response = await chrome.runtime.sendMessage(message);

        if (response === undefined) {
            console.error("Response was undefined");
            return MessageResponses.ERROR;
        }

        return response;
    }

    /**
     * Sends a message to clear workspaces.
     * @returns A promise that resolves to a MessageResponse.
     */
    public static async sendClearWorkspaces(): Promise<MessageResponse> {
        const response = await chrome.runtime.sendMessage({
            type: Messages.MSG_CLEAR_WORKSPACES,
            payload: {}
        });

        if (response === undefined) {
            console.error("Response was undefined");
            return MessageResponses.ERROR;
        }

        return response;
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
        const response = await chrome.runtime.sendMessage(message);

        if (response === undefined) {
            console.error("Response was undefined");
            return MessageResponses.ERROR;
        }

        return response;
    }

    public static async sendRenameWorkspace(workspaceUuid: string, newName: string): Promise<MessageResponse> {
        const message = {
            type: Messages.MSG_RENAME_WORKSPACE,
            payload: { uuid: workspaceUuid, newName: newName }
        };
        const response = await chrome.runtime.sendMessage(message);

        if (response === undefined) {
            console.error("Response was undefined");
            return MessageResponses.ERROR;
        }

        return response;
    }
}