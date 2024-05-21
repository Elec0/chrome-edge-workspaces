import { TabStub } from "../obj/tab-stub";

export class TabUtils {

    /**
     * Update the TabStub objects with the new tab ids.
     * 
     * Associating the TabStub objects with the new tab ids has some complexities.
     * See `Workspace.ensureTabIndexesAreOrdered()` for more details.
     * 
     * For this method we assume that the tabs are in the correct order in the new window and that the
     * indexes are correct.
     * 
     * @param workspaceTabs - The tabs from the workspace.
     * @param newWindowTabs - The tabs from the newly created window.
     */
    public static updateTabStubIdsFromTabs(workspaceTabs: TabStub[], newWindowTabs: chrome.tabs.Tab[]) {
        console.debug("Updating tab stub ids", workspaceTabs, newWindowTabs);
        for (let i = 0; i < workspaceTabs.length; i++) {
            const workspaceTab = workspaceTabs[i];
            const newWindowTab = newWindowTabs[i];
            // const newWindowTab = newWindowTabs.find(tab => tab.index === i && tab.url === workspaceTab.url);
            if (newWindowTab && newWindowTab.id !== undefined) {
                workspaceTab.id = newWindowTab.id;
            }
            else {
                console.warn(`Could not find a matching tab for workspace tab ${workspaceTab}`);
            }
        }
    }

    /**
     * Update the newly created chrome.tabs to match the workspace tabs extra data (active, pinned, etc).
     * The window should be created with the tabs in the correct order, so loop through the tabs
     * and use chrome.tabs.update to update the tabs.
     * 
     * TODO: Looks the pinned update isn't working properly. Investigate.
     * 
     * @param workspaceTabs - The tabs from the workspace.
     * @returns A promise that resolves when all the tabs have been updated.
     */
    public static async updateNewWindowTabsFromTabStubs(workspaceTabs: TabStub[]): Promise<void> {
        console.debug("Updating new window tabs", workspaceTabs);
        for (let i = 0; i < workspaceTabs.length; i++) {
            const tab = workspaceTabs[i];
            await chrome.tabs.update(tab.id, {
                active: tab.active,
                pinned: tab.pinned,
                muted: tab.mutedInfo?.muted
            });
        }
    }
}