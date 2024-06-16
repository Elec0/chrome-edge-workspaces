export class Messages {
    public static MSG_NEW_WORKSPACE = "NEW_WORKSPACE";
    /** 
     * The message type for creating a new workspace from a window.
     * @see BackgroundMessageHandlers.processNewWorkspaceFromWindow
     * @see PopupMessageHelper.sendNewWorkspaceFromWindow
     * 
     * The popup script doesn't send the list of tabs to the background script,
     * rather the background script gets the tabs from the windowId.
     */
    public static MSG_NEW_WORKSPACE_FROM_WINDOW = "NEW_WORKSPACE_FROM_WINDOW";
    /**
     * 
     * Send a message to the background script requesting all workspace data.
     * @returns A Promise that resolves to a MessageResponse object, containing a 
     * @see BackgroundMessageHandlers.processGetWorkspaces
     * @see PopupMessageHelper.sendGetWorkspaces
     */
    public static MSG_GET_WORKSPACES = "GET_WORKSPACES";
    public static MSG_GET_WORKSPACE = "GET_WORKSPACE";
    public static MSG_OPEN_WORKSPACE = "OPEN_WORKSPACE";
    public static MSG_CLEAR_WORKSPACES = "CLEAR_WORKSPACES";
    public static MSG_DELETE_WORKSPACE = "DELETE_WORKSPACE";
    public static MSG_RENAME_WORKSPACE = "RENAME_WORKSPACE";
}