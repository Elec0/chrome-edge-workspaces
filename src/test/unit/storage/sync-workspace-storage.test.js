import { TabGroupStub } from "../../../obj/tab-group-stub";
import { TabStub } from "../../../obj/tab-stub";
import { Workspace } from "../../../obj/workspace";
import { SyncWorkspaceStorage } from "../../../storage/sync-workspace-storage";
import { DebounceUtil } from "../../../utils/debounce";

describe("SyncWorkspaceStorage", () => {
    let workspace;

    beforeEach(() => {
        workspace = new Workspace(1, "Test Workspace", undefined, undefined, "workspace-uuid");
        workspace.setTabs([
            new TabStub({id: 1, url: "https://example.com", windowId: 1, active: true, pinned: false, mutedInfo: { muted: false }, groupId: 0}),
            new TabStub({id: 2, url: "https://example.org", windowId: 1, active: false, pinned: false, mutedInfo: { muted: false }, groupId: 0})
        ]);
        workspace.setTabGroups([
            new TabGroupStub({id: 1, name: "Group 1", color: "blue", collapsed: false}),
            new TabGroupStub({id: 2, name: "Group 2", color: "red", collapsed: true})
        ]);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("convertWorkspaceToSyncData converts a Workspace object to SyncData", () => {
        const syncData = SyncWorkspaceStorage.convertWorkspaceToSyncData(workspace);

        const expectedMetadata = {
            uuid: "workspace-uuid",
            name: "Test Workspace",
            windowId: 1
        };

        expect(syncData.metadata).toEqual(expectedMetadata);
        expect(syncData.tabs.length).toBe(2);
        expect(syncData.tabGroups.length).toBe(2);
    });

    test("saveWorkspaceToSync saves a Workspace object to chrome.storage.sync", async () => {
        await SyncWorkspaceStorage.saveWorkspaceToSync(workspace);

        const syncData = SyncWorkspaceStorage.convertWorkspaceToSyncData(workspace);
        const expectedMetadata = {
            [`workspace_metadata_${workspace.uuid}`]: syncData.metadata
        };

        expect(chrome.storage.sync.set).toHaveBeenCalledWith(expectedMetadata);

        // This data is not long enough to be chunked into multiple arrays
        const expectedTabChunks = [
            {[`workspace_tabs_${workspace.uuid}_0`]: syncData.tabs}
        ];

        for (const chunk of expectedTabChunks) {
            expect(chrome.storage.sync.set).toHaveBeenCalledWith(chunk);
        }

        const expectedTabGroups = {
            [`workspace_tab_groups_${workspace.uuid}`]: syncData.tabGroups
        };

        expect(chrome.storage.sync.set).toHaveBeenCalledWith(expectedTabGroups);
    });

    test("chunkArray chunks an array into smaller arrays based on byte size", () => {
        const array = ["item1", "item2", "item3"];
        const maxBytes = 10; // Small size for testing
        const chunks = SyncWorkspaceStorage.chunkArray(array, maxBytes);

        expect(chunks.length).toBeGreaterThan(1);
    });

    // This test probably isn't that helpful
    test("debounceSaveWorkspaceToSync debounces saving a Workspace object to chrome.storage.sync", () => {
        jest.useFakeTimers();
        const debounceSpy = jest.spyOn(DebounceUtil, 'debounce');

        SyncWorkspaceStorage.debounceSaveWorkspaceToSync(workspace);

        expect(debounceSpy).toHaveBeenCalledWith(expect.any(Function), 60000);

        jest.runAllTimers();
        expect(chrome.storage.sync.set).toHaveBeenCalled();
    });
});