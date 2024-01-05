export class Messages {
    public static MSG_NEW_WORKSPACE = "NEW_WORKSPACE";
    /**
     * 
     * Send a message to the background script requesting all workspace data.
     * @returns A Promise that resolves to a MessageResponse object, containing a 
     * @see BackgroundMessageHandlers.processGetWorkspaces
     * @see PopupMessageHelper.sendGetWorkspaces
     */
    public static MSG_GET_WORKSPACES = "GET_WORKSPACES";
    public static MSG_OPEN_WORKSPACE = "OPEN_WORKSPACE";
}