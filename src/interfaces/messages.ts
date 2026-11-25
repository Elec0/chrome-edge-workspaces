import type { WorkspacePlacement } from "../workspace-storage";

export interface IRequest {
    type: string;
    payload: unknown;
}
/** 
 * The request object interface for the {@link Messages.MSG_OPEN_WORKSPACE} message.
 */
export interface IRequestOpenWorkspace extends IRequest {
    payload: {
        uuid: string;
        windowId: number;
        /** Serialized workspace carrying the tab and group IDs assigned during restore. */
        workspaceData?: string;
    };
}

export interface IRequestWithNameId extends IRequest {
    payload: {
        workspaceName: string;
        windowId: number;
    };
}

export interface IRequestWithUuid extends IRequest {
    payload: {
        uuid: string;
    };
}

export interface IRequestRenameWorkspace extends IRequest {
    payload: {
        uuid: string;
        newName: string;
    };
}

/** Move a workspace relative to another UUID so the background can resolve the current positions. */
export interface IRequestMoveWorkspace extends IRequest {
    payload: {
        uuid: string;
        targetUuid: string;
        placement: WorkspacePlacement;
    };
}

/** Replace local workspace data with the serialized workspace list from an export. */
export interface IRequestImportWorkspaces extends IRequest {
    payload: { data: string };
}
