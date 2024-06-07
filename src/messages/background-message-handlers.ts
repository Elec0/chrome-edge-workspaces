import { Messages } from "../constants/messages";
import { IRequest, IRequestWithUuid, IRequestNewWorkspace, IRequestOpenWorkspace, IRequestRenameWorkspace } from "../interfaces/messages";
import { StorageHelper } from "../storage-helper";
import { Background } from "../background";
import { MessageResponse, MessageResponses } from "../constants/message-responses";

/**
 * Class representing the message handlers for background operations.
 *
 * @remarks This class is public for testing purposes.
 */

export class BackgroundMessageHandlers {
    /**
     * We're being informed that a workspace is being opened in a new window.
     * @param request - The request object containing the workspace data.
     */
    public static async processOpenWorkspace(request: IRequestOpenWorkspace): Promise<MessageResponse> {
        if (!request?.payload?.uuid || !request?.payload?.windowId) {
            return MessageResponses.ERROR;
        }

        return await Background.openWorkspace(request.payload.uuid, request.payload.windowId);
    }

    /**
     * Processes a new workspace request.
     * @param request - The request object containing the workspace name and window ID.
     * @returns A promise that resolves to a MessageResponse indicating the success or failure of the operation.
     */
    public static async processNewWorkspace(request: IRequestNewWorkspace): Promise<MessageResponse> {
        const result = await StorageHelper.addWorkspace(request.payload.workspaceName, request.payload.windowId);
        if (!result) {
            return MessageResponses.ERROR;
        }
        return MessageResponses.SUCCESS;
    }

    /**
     * Processes a request to delete a workspace.
     * @param request - The request object containing the workspace UUID to delete.
     */
    public static async processDeleteWorkspace(request: IRequestWithUuid): Promise<MessageResponse> {
        const result = await StorageHelper.removeWorkspace(request.payload.uuid);
        if (!result) {
            return MessageResponses.ERROR;
        }
        return MessageResponses.SUCCESS;
    }

    /**
     * Processes a request to rename a workspace.
     * @param request - The request object containing the workspace UUID and the new name.
     */
    public static async processRenameWorkspace(request: IRequestRenameWorkspace): Promise<MessageResponse> {
        const result = await StorageHelper.renameWorkspace(request.payload.uuid, request.payload.newName);
        if (!result) {
            return MessageResponses.ERROR;
        }
        return MessageResponses.SUCCESS;
    }

    /**
     * Processes the request to get the workspaces.
     * @param request - The request object, unused.
     * @returns A promise that resolves to a MessageResponse containing the serialized workspaces data.
     */
    public static async processGetWorkspaces(_request: unknown): Promise<MessageResponse> {
        const workspaces = await StorageHelper.getWorkspaces();
        return { "data": workspaces.serialize() };
    }

    /**
     * Processes the request to get a workspace.
     * @param request - The request object.
     * @returns A promise that resolves to a MessageResponse containing the serialized workspace data.
     */
    public static async processGetWorkspace(request: IRequestWithUuid): Promise<MessageResponse> {
        if (!request?.payload?.uuid) {
            return MessageResponses.ERROR;
        }
        const workspace = await StorageHelper.getWorkspace(request.payload.uuid);
        return { "data": workspace.serialize() };
    }

    public static async processClearWorkspaces(_request: unknown): Promise<MessageResponse> {
        await StorageHelper.clearWorkspaces();
        return MessageResponses.SUCCESS;
    }

    /**
     * Handles incoming messages from the content script.
     * Messages are sent from {@link PopupMessageHelper}.
     * @param request - The message request object.
     * @param sender - The sender of the message.
     * @param sendResponse - The function to send a response back to the content script.
     * @returns A boolean indicating whether the message was successfully handled.
     */
    public static messageListener(request: IRequest, _sender: unknown, sendResponse: (response: MessageResponse) => void): boolean {
        switch (request.type) {
            case Messages.MSG_GET_WORKSPACES:
                BackgroundMessageHandlers.processGetWorkspaces(request).then(sendResponse);
                return true;

            case Messages.MSG_GET_WORKSPACE:
                BackgroundMessageHandlers.processGetWorkspace(request as IRequestWithUuid).then(sendResponse);
                return true;

            case Messages.MSG_NEW_WORKSPACE:
                BackgroundMessageHandlers.processNewWorkspace(request as IRequestNewWorkspace).then(sendResponse);
                return true;

            case Messages.MSG_OPEN_WORKSPACE:
                BackgroundMessageHandlers.processOpenWorkspace(request as IRequestOpenWorkspace).then(sendResponse);
                return true;

            case Messages.MSG_DELETE_WORKSPACE:
                BackgroundMessageHandlers.processDeleteWorkspace(request as IRequestWithUuid).then(sendResponse);
                return true;

            case Messages.MSG_RENAME_WORKSPACE:
                BackgroundMessageHandlers.processRenameWorkspace(request as IRequestRenameWorkspace).then(sendResponse);
                return true;

            case Messages.MSG_CLEAR_WORKSPACES:
                BackgroundMessageHandlers.processClearWorkspaces(request).then(sendResponse);
                return true;
        }

        console.log(MessageResponses.UNKNOWN_MSG.message, "for request:", request);
        sendResponse(MessageResponses.UNKNOWN_MSG);
        return false;
    }
}
