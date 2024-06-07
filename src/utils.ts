import { TabStub } from "./obj/tab-stub";
import { Workspace } from "./obj/workspace";
import { StorageHelper } from "./storage-helper";

/**
 * Utility class containing various helper methods.
 */
export class Utils {
    /**
     * Sets the extension badge text for all tabs in a window.
     * 
     * There are only two options for badge text: per tab and globally. We can't set the badge text for a window, 
     * so we have to set it for each tab in the window.
     * 
     * This is called every time the tabs are saved to workspace storage, which is common enough that it will
     * always be up to date.
     */
    public static async setBadgeForWindow(windowId: number, text: string, color?: string | chrome.action.ColorArray): Promise<void> {
        const tabs = await this.getTabsFromWindow(windowId);
        for (const tab of tabs) {
            chrome.action.setBadgeText({ text: text, tabId: tab.id });
            if (color !== undefined) {
                chrome.action.setBadgeBackgroundColor({ color: color, tabId: tab.id });
            }
        }
    }

    /**
     * Retrieve all the tabs from an open workspace window.
     * @param windowId - The ID of the window to retrieve tabs from.
     */
    public static async getTabsFromWindow(windowId: number): Promise<chrome.tabs.Tab[]> {
        return chrome.tabs.query({ windowId: windowId });
    }

    /**
     * Sets the tabs of a workspace and saves it to storage.
     * @param workspace - The workspace to update.
     * @param tabs - The tabs to set for the workspace.
     * @returns - A promise that resolves when the workspace is updated and saved.
     */
    public static async setWorkspaceTabs(workspace: Workspace, tabs: chrome.tabs.Tab[]): Promise<void> {
        workspace.setTabs(TabStub.fromTabs(tabs));
        await StorageHelper.setWorkspace(workspace);
    }

    /**
     * Checks if the code is running in a Jest test environment.
     * @returns A boolean indicating whether the code is running in a Jest test environment.
     */
    public static areWeTestingWithJest(): boolean {
        if (typeof process === 'undefined')
            return false;

        return process.env.JEST_WORKER_ID !== undefined;
    }

    /**
     * Interpolates variables into a template string.
     * @param template - The template string containing placeholders.
     * @param variables - An object containing the variables to be interpolated.
     * @returns The interpolated string.
     */
    public static interpolateTemplate(template: string, variables: Record<string, string | number>): string {
        return template.replace(/\$\{(\w+)\}/g, (_, variable) => String(variables[variable]));
    }

    /**
     * Determine if the given tab URL is one we don't want to keep track of, or if it's special and we should track it.
     * @param url - The URL of the tab. If undefined, the URL is considered trackable.
     */
    public static isUrlUntrackable(url: string | undefined): boolean {
        if (url === undefined || url.length == 0)
            return true;
        return url.startsWith("chrome://") || url.startsWith("about:") || url.startsWith("chrome-extension://");
    }
}
