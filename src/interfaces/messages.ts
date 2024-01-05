
export interface IRequest {
    type: string;
    payload: unknown;
}
/** 
 * The request object interface for the {@link Messages.MSG_OPEN_WORKSPACE} message.
 */
export interface IRequestOpenWorkspace extends IRequest {
    payload: {
        data: {
            uuid: string;
            windowId: number;
        };
    };
}

export interface IRequestNewWorkspace extends IRequest {
    payload: {
        workspaceName: string;
        windowId: number;
    };
}