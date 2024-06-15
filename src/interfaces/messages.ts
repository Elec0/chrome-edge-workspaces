
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